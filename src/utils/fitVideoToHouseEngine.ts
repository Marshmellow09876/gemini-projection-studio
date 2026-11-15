/**
 * Fit Video to House Engine, House Stencil Exporter & Loop Crossfade Studio
 * 
 * Implements Marshall Projection Studio Parity:
 * - 3x3 Projective Homography solver & inverse texture mapping (Heckbert closed form)
 * - Shared UV slice mapping without slicing video files (zero lawn/sky light spill)
 * - Multi-group assignment persistence (Roof vs Walls/Windows)
 * - High-resolution House Stencil renderer (Filled Mask, Stroked Outline, Filled + Outline, Semantic Color Map)
 * - Precise Loop Crossfade weight and timing calculations (ClipTimeMap parity)
 * - Built-in procedural holiday animation generators
 */

import { VectorLayer, VectorVertex } from '../store/useProjectionStore';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type ClipPlacementMode = 'rect' | 'corner-pin';
export type ClipEndBehavior = 'loop' | 'play-once-hold' | 'play-once-black';

export interface ClipPlacement {
  mode: ClipPlacementMode;
  /** Normalized stage coordinates [0..100]%, supports negative values and >100 for overhang */
  normX: number;
  normY: number;
  normW: number;
  normH: number;
  rotationDeg: number;
  /** 4 corners in normalized stage coordinates [0..100]%: [TL, TR, BR, BL] */
  corners: [VectorVertex, VectorVertex, VectorVertex, VectorVertex];
  playbackSpeed: number; // 0.25 to 4.0
  endBehavior: ClipEndBehavior;
  targetShapeIds: string[];
}

export type Matrix3x3 = [
  number, number, number,
  number, number, number,
  number, number, number
];

export interface FitVideoGroupAssignment {
  id: string;
  name: string;
  mediaUrl: string;
  mediaType: 'video' | 'image' | 'procedural';
  proceduralPreset?: string;
  placement: ClipPlacement;
  targetShapeIds: string[];
}

export type HouseStencilStyle = 
  | 'filled-mask' 
  | 'stroked-outline' 
  | 'filled-plus-outline' 
  | 'semantic-color-map';

export interface HouseStencilOptions {
  style: HouseStencilStyle;
  width: number;
  height: number;
  strokeWidthPx?: number;
  includeCategories?: string[];
  respectBlackoutMasks?: boolean;
}

export interface LoopCrossfadeWeights {
  primaryTimeSec: number;
  primaryWeight: number;
  wrapTimeSec: number;
  wrapWeight: number;
  inCrossfadeZone: boolean;
}

export const STORAGE_KEY_FIT_VIDEO_ASSIGNMENTS = 'mps_fit_video_assignments_v1';
export const STORAGE_KEY_SCENES_LIBRARY = 'mps_scenes_library_v1';

export const PROCEDURAL_PRESETS = [
  'Snowy Gingerbread Facade',
  'Santa Workshop Windows',
  'Northern Lights Aurora',
  'Haunted Manor Lightning',
  'Neon Cyber Grid'
] as const;

export type ProceduralPresetName = typeof PROCEDURAL_PRESETS[number];

export const SEMANTIC_COLOR_MAP: Record<string, string> = {
  'Roofline': '#E74C3C',     // Bright Red (Roof plane/line)
  'Main Walls': '#3498DB',   // Blue (Structural walls)
  'Windows': '#00FFFF',      // Cyan (Glass apertures)
  'Garage': '#9B59B6',       // Purple (Vehicle bays)
  'Pillars': '#2ECC71',      // Emerald Green (Vertical columns)
  'Blackout Masks': '#000000', // Black (Hard cutouts)
};

// ============================================================================
// 3x3 Projective Homography Math (Paul Heckbert 1989 Closed Form)
// ============================================================================

export const IDENTITY_MATRIX_3X3: Matrix3x3 = [
  1, 0, 0,
  0, 1, 0,
  0, 0, 1
];

/**
 * Solves 3x3 Homography taking unit square [0,1]^2 (TL=(0,0), TR=(1,0), BR=(1,1), BL=(0,1))
 * to destination quadrilateral corners [P0, P1, P2, P3].
 */
export function solveHomographyFromUnitSquare(
  destQuad: [VectorVertex, VectorVertex, VectorVertex, VectorVertex]
): Matrix3x3 {
  const x0 = destQuad[0].x, y0 = destQuad[0].y;
  const x1 = destQuad[1].x, y1 = destQuad[1].y;
  const x2 = destQuad[2].x, y2 = destQuad[2].y;
  const x3 = destQuad[3].x, y3 = destQuad[3].y;

  const sumX = x0 - x1 + x2 - x3;
  const sumY = y0 - y1 + y2 - y3;

  const scale = Math.max(
    Math.abs(x0) + Math.abs(x1), Math.abs(x2) + Math.abs(x3),
    Math.abs(y0) + Math.abs(y1), Math.abs(y2) + Math.abs(y3)
  );
  const epsilon = 1e-12 * Math.max(1.0, scale);

  // Parallelogram / Affine case
  if (Math.abs(sumX) < epsilon && Math.abs(sumY) < epsilon) {
    return [
      x1 - x0, x3 - x0, x0,
      y1 - y0, y3 - y0, y0,
      0, 0, 1
    ];
  }

  // Perspective case
  const dx1 = x1 - x2;
  const dy1 = y1 - y2;
  const dx2 = x3 - x2;
  const dy2 = y3 - y2;

  const denom = (dx1 * dy2) - (dx2 * dy1);
  if (Math.abs(denom) < 1e-12) {
    // Collinear or degenerate
    return [
      x1 - x0, x3 - x0, x0,
      y1 - y0, y3 - y0, y0,
      0, 0, 1
    ];
  }

  const g = ((sumX * dy2) - (dx2 * sumY)) / denom;
  const h = ((dx1 * sumY) - (sumX * dy1)) / denom;

  return [
    (x1 - x0) + (g * x1), (x3 - x0) + (h * x3), x0,
    (y1 - y0) + (g * y1), (y3 - y0) + (h * y3), y0,
    g, h, 1
  ];
}

/**
 * Inverts a 3x3 matrix using standard adjoint / cofactor method.
 */
export function invertMatrix3x3(m: Matrix3x3): Matrix3x3 | null {
  const [
    m11, m12, m13,
    m21, m22, m23,
    m31, m32, m33
  ] = m;

  const c11 = (m22 * m33) - (m23 * m32);
  const c12 = (m23 * m31) - (m21 * m33);
  const c13 = (m21 * m32) - (m22 * m31);

  const det = (m11 * c11) + (m12 * c12) + (m13 * c13);

  const magnitude = Math.max(
    Math.abs(m11) + Math.abs(m12) + Math.abs(m13),
    Math.abs(m21) + Math.abs(m22) + Math.abs(m23),
    Math.abs(m31) + Math.abs(m32) + Math.abs(m33)
  );
  const threshold = 1e-12 * Math.max(1.0, magnitude * magnitude * magnitude);

  if (!Number.isFinite(det) || Math.abs(det) <= threshold) {
    return null;
  }

  const invDet = 1.0 / det;

  return [
    c11 * invDet,
    ((m13 * m32) - (m12 * m33)) * invDet,
    ((m12 * m23) - (m13 * m22)) * invDet,

    c12 * invDet,
    ((m11 * m33) - (m13 * m31)) * invDet,
    ((m13 * m21) - (m11 * m23)) * invDet,

    c13 * invDet,
    ((m12 * m31) - (m11 * m32)) * invDet,
    ((m11 * m22) - (m12 * m21)) * invDet
  ];
}

export function multiplyMatrix3x3(a: Matrix3x3, b: Matrix3x3): Matrix3x3 {
  return [
    a[0]*b[0] + a[1]*b[3] + a[2]*b[6], a[0]*b[1] + a[1]*b[4] + a[2]*b[7], a[0]*b[2] + a[1]*b[5] + a[2]*b[8],
    a[3]*b[0] + a[4]*b[3] + a[5]*b[6], a[3]*b[1] + a[4]*b[4] + a[5]*b[7], a[3]*b[2] + a[4]*b[5] + a[5]*b[8],
    a[6]*b[0] + a[7]*b[3] + a[8]*b[6], a[6]*b[1] + a[7]*b[4] + a[8]*b[7], a[6]*b[2] + a[7]*b[5] + a[8]*b[8]
  ];
}

/**
 * Solves general 4-point to 4-point homography by composing through the unit square.
 */
export function solveHomography3x3(
  sourceQuad: [VectorVertex, VectorVertex, VectorVertex, VectorVertex],
  destQuad: [VectorVertex, VectorVertex, VectorVertex, VectorVertex]
): Matrix3x3 {
  const toSource = solveHomographyFromUnitSquare(sourceQuad);
  const fromSource = invertMatrix3x3(toSource);
  if (!fromSource) return IDENTITY_MATRIX_3X3;

  const toDest = solveHomographyFromUnitSquare(destQuad);
  return multiplyMatrix3x3(toDest, fromSource);
}

/**
 * Applies 3x3 homography to a 2D point with perspective divide.
 */
export function applyHomographyToPoint(m: Matrix3x3, pt: VectorVertex): VectorVertex {
  const x = pt.x;
  const y = pt.y;

  const nx = (m[0] * x) + (m[1] * y) + m[2];
  const ny = (m[3] * x) + (m[4] * y) + m[5];
  const nw = (m[6] * x) + (m[7] * y) + m[8];

  if (Math.abs(nw) < 1e-12) {
    return { x: nx, y: ny };
  }

  return { x: nx / nw, y: ny / nw };
}

/**
 * Maps a stage coordinate (0..100%) to clip-local UV coordinates [0..1]².
 */
export function mapStagePointToClipUV(
  stagePt: VectorVertex,
  placement: ClipPlacement
): { u: number; v: number } {
  if (placement.mode === 'corner-pin') {
    // destination quad is placement.corners (maps UV (0,0)..(1,1) -> stage coords)
    const toStage = solveHomographyFromUnitSquare(placement.corners);
    const toUv = invertMatrix3x3(toStage);
    if (!toUv) {
      return { u: 0, v: 0 };
    }
    const uvPoint = applyHomographyToPoint(toUv, stagePt);
    return { u: uvPoint.x, v: uvPoint.y };
  }

  // Rect mode: normalized rect with rotation
  const w = placement.normW === 0 ? 1 : placement.normW;
  const h = placement.normH === 0 ? 1 : placement.normH;

  let px = stagePt.x;
  let py = stagePt.y;

  if (placement.rotationDeg && placement.rotationDeg !== 0) {
    const cx = placement.normX + w / 2;
    const cy = placement.normY + h / 2;
    const rad = (-placement.rotationDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = px - cx;
    const dy = py - cy;
    px = cx + (dx * cos - dy * sin);
    py = cy + (dx * sin + dy * cos);
  }

  const u = (px - placement.normX) / w;
  const v = (py - placement.normY) / h;
  return { u, v };
}

/**
 * Checks if a UV coordinate falls strictly inside the video frame [0..1]².
 * Pixels outside return false (enforces the black overhang rule with zero light spill).
 */
export function isUvInsideClip(u: number, v: number): boolean {
  return u >= 0.0 && u <= 1.0 && v >= 0.0 && v <= 1.0;
}

// ============================================================================
// Bounding Box & Shape UV Helpers
// ============================================================================

export function createDefaultPlacement(targetShapeIds: string[] = []): ClipPlacement {
  return {
    mode: 'rect',
    normX: 0,
    normY: 0,
    normW: 100,
    normH: 100,
    rotationDeg: 0,
    corners: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 }
    ],
    playbackSpeed: 1.0,
    endBehavior: 'loop',
    targetShapeIds
  };
}

export function fitPlacementToFullStage(): ClipPlacement {
  return createDefaultPlacement([]);
}

/**
 * Computes bounding box enclosing the target layers and fits placement to it.
 */
export function fitPlacementToShapesBoundingBox(
  layers: VectorLayer[],
  targetShapeIds: string[]
): ClipPlacement {
  const targets = layers.filter((l) => targetShapeIds.includes(l.id));
  if (targets.length === 0) {
    return createDefaultPlacement(targetShapeIds);
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  targets.forEach((layer) => {
    (layer.vertices || []).forEach((v) => {
      minX = Math.min(minX, v.x);
      minY = Math.min(minY, v.y);
      maxX = Math.max(maxX, v.x);
      maxY = Math.max(maxY, v.y);
    });
  });

  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || minX >= maxX) {
    return createDefaultPlacement(targetShapeIds);
  }

  const w = maxX - minX;
  const h = maxY - minY;

  return {
    mode: 'rect',
    normX: minX,
    normY: minY,
    normW: w,
    normH: h,
    rotationDeg: 0,
    corners: [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY }
    ],
    playbackSpeed: 1.0,
    endBehavior: 'loop',
    targetShapeIds
  };
}

/**
 * Computes the UV coordinates for every vertex in a VectorLayer based on current placement.
 */
export function computeShapeUvPolygon(
  layer: VectorLayer,
  placement: ClipPlacement
): Array<{ stage: VectorVertex; uv: { u: number; v: number } }> {
  return (layer.vertices || []).map((vertex) => ({
    stage: { ...vertex },
    uv: mapStagePointToClipUV(vertex, placement)
  }));
}

// ============================================================================
// Multi-Group Assignment Persistence
// ============================================================================

export function loadFitVideoGroupAssignments(): FitVideoGroupAssignment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FIT_VIDEO_ASSIGNMENTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse fit video assignments from localStorage', err);
    return [];
  }
}

export function saveFitVideoGroupAssignments(assignments: FitVideoGroupAssignment[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_FIT_VIDEO_ASSIGNMENTS, JSON.stringify(assignments));
  } catch (err) {
    console.error('Failed to write fit video assignments to localStorage', err);
  }
}

export function createDefaultGroupAssignment(
  id: string,
  name: string,
  targetShapeIds: string[] = []
): FitVideoGroupAssignment {
  return {
    id,
    name,
    mediaUrl: '',
    mediaType: 'procedural',
    proceduralPreset: 'Snowy Gingerbread Facade',
    placement: createDefaultPlacement(targetShapeIds),
    targetShapeIds
  };
}

// ============================================================================
// House Stencil Rendering (ControlNet & Mask Exporter)
// ============================================================================

/**
 * Renders high-resolution house stencils to an HTML5 canvas for AI video generators.
 */
export function renderHouseStencilToCanvas(
  canvas: HTMLCanvasElement,
  layers: VectorLayer[],
  options: HouseStencilOptions
): void {
  const {
    style,
    width,
    height,
    strokeWidthPx = 3,
    includeCategories,
    respectBlackoutMasks = true
  } = options;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Solid black background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // Filter layers
  const activeLayers = layers.filter((layer) => {
    if (!layer.visible) return false;
    if (includeCategories && includeCategories.length > 0) {
      if (!includeCategories.includes(layer.category)) return false;
    }
    return true;
  });

  const normalLayers = activeLayers.filter(
    (l) => l.role !== 'Hard Blackout Cutout' && l.category !== 'Blackout Masks'
  );
  const blackoutLayers = activeLayers.filter(
    (l) => l.role === 'Hard Blackout Cutout' || l.category === 'Blackout Masks'
  );

  const scaleX = width / 100;
  const scaleY = height / 100;

  // Helper to trace a polygon path
  const tracePolygon = (vertices: VectorVertex[]) => {
    if (!vertices || vertices.length < 3) return false;
    ctx.beginPath();
    ctx.moveTo(vertices[0].x * scaleX, vertices[0].y * scaleY);
    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(vertices[i].x * scaleX, vertices[i].y * scaleY);
    }
    ctx.closePath();
    return true;
  };

  // 1. Render Normal House Shapes
  normalLayers.forEach((layer) => {
    if (!tracePolygon(layer.vertices)) return;

    switch (style) {
      case 'filled-mask':
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        break;

      case 'stroked-outline':
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = strokeWidthPx;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();
        break;

      case 'filled-plus-outline':
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = strokeWidthPx;
        ctx.lineJoin = 'round';
        ctx.stroke();
        break;

      case 'semantic-color-map':
        ctx.fillStyle = SEMANTIC_COLOR_MAP[layer.category] || '#3498DB';
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.max(1, Math.round(strokeWidthPx / 2));
        ctx.stroke();
        break;
    }
  });

  // 2. Punch Out Blackout Masks (if requested)
  if (respectBlackoutMasks && blackoutLayers.length > 0) {
    blackoutLayers.forEach((layer) => {
      if (!tracePolygon(layer.vertices)) return;
      // Punch to solid black
      ctx.fillStyle = '#000000';
      ctx.fill();
      if (style === 'stroked-outline') {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = strokeWidthPx + 2;
        ctx.stroke();
      }
    });
  }
}

export function downloadCanvasAsPng(canvas: HTMLCanvasElement, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ============================================================================
// Loop Crossfade Timing & Weight Math
// ============================================================================

/**
 * Computes primary and wrap-around source timestamps and blend weights
 * for seamless video looping (ClipTimeMap parity).
 */
export function computeLoopCrossfadeWeights(
  currentTimeSec: number,
  trimInSec: number,
  trimOutSec: number,
  crossfadeSec: number,
  speed: number = 1.0,
  reverse: boolean = false
): LoopCrossfadeWeights {
  const safeIn = Math.max(0, Number.isFinite(trimInSec) ? trimInSec : 0);
  const safeOut = Math.max(safeIn + 0.1, Number.isFinite(trimOutSec) ? trimOutSec : safeIn + 1.0);
  const span = safeOut - safeIn;

  const effectiveCrossfade = Math.min(Math.max(0, crossfadeSec), span);
  const playbackSpeed = Number.isFinite(speed) && speed !== 0 ? Math.abs(speed) : 1.0;

  // Normalized time within the span
  let relTime = (currentTimeSec - safeIn) * playbackSpeed;
  relTime = ((relTime % span) + span) % span;

  if (reverse) {
    relTime = span - relTime;
  }

  const sourceSec = safeIn + relTime;

  if (effectiveCrossfade <= 0.001) {
    return {
      primaryTimeSec: sourceSec,
      primaryWeight: 1.0,
      wrapTimeSec: safeIn,
      wrapWeight: 0.0,
      inCrossfadeZone: false
    };
  }

  // Crossfade zone sits at the tail of the loop: [safeOut - effectiveCrossfade, safeOut)
  const windowStart = safeOut - effectiveCrossfade;

  if (sourceSec >= windowStart) {
    const distIntoWindow = sourceSec - windowStart;
    const clampedDist = Math.min(distIntoWindow, effectiveCrossfade);
    const wrapWeight = clampedDist / effectiveCrossfade;
    const primaryWeight = 1.0 - wrapWeight;
    const wrapTimeSec = safeIn + clampedDist;

    return {
      primaryTimeSec: sourceSec,
      primaryWeight,
      wrapTimeSec,
      wrapWeight,
      inCrossfadeZone: true
    };
  }

  return {
    primaryTimeSec: sourceSec,
    primaryWeight: 1.0,
    wrapTimeSec: safeIn,
    wrapWeight: 0.0,
    inCrossfadeZone: false
  };
}

// ============================================================================
// Procedural Holiday Animation Generators
// ============================================================================

/**
 * Renders procedural holiday video animations on an HTML5 canvas context.
 */
export function renderProceduralAnimation(
  ctx: CanvasRenderingContext2D,
  preset: string,
  timeSec: number,
  width: number,
  height: number
): void {
  ctx.save();

  switch (preset) {
    case 'Snowy Gingerbread Facade': {
      // Warm gingerbread tone
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#3a1f11');
      grad.addColorStop(0.5, '#5c321d');
      grad.addColorStop(1, '#2c150a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Decorative icing swags
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      const waveCount = 8;
      const step = width / waveCount;
      for (let i = 0; i <= waveCount; i++) {
        const x = i * step;
        const y = 30 + Math.sin(i * 1.5 + timeSec * 2) * 12;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.quadraticCurveTo(x - step / 2, y + 25, x, y);
      }
      ctx.stroke();

      // Candy dots
      for (let i = 0; i < 15; i++) {
        const cx = (i * step * 0.6 + timeSec * 20) % width;
        const cy = 60 + Math.sin(i * 0.8) * 15;
        ctx.fillStyle = i % 2 === 0 ? '#e74c3c' : '#2ecc71';
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Falling snow particles
      ctx.fillStyle = '#ffffff';
      const flakeCount = 70;
      for (let i = 0; i < flakeCount; i++) {
        const speed = 30 + ((i * 13) % 40);
        const y = ((timeSec * speed + i * 23) % height);
        const sway = Math.sin(timeSec * 1.5 + i) * 20;
        const x = ((i * 37 + sway) % width + width) % width;
        const r = 1.5 + ((i % 4) * 0.8);
        ctx.globalAlpha = 0.4 + ((i % 5) * 0.12);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'Santa Workshop Windows': {
      // Warm cozy interior amber glow
      const grad = ctx.createRadialGradient(
        width / 2, height / 2, 20,
        width / 2, height / 2, width * 0.6
      );
      grad.addColorStop(0, '#ffe57f');
      grad.addColorStop(0.35, '#ffb300');
      grad.addColorStop(0.7, '#e65100');
      grad.addColorStop(1, '#3e1a00');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Window panes crossbars
      ctx.strokeStyle = '#1a0d00';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Silhouette movement across pane
      const santaX = ((timeSec * 45) % (width + 120)) - 60;
      ctx.fillStyle = '#110800';
      ctx.beginPath();
      ctx.arc(santaX, height * 0.65, 26, 0, Math.PI * 2); // head/cap
      ctx.ellipse(santaX + 10, height * 0.78, 32, 22, 0, 0, Math.PI * 2); // sack
      ctx.rect(santaX - 20, height * 0.72, 40, 50); // body
      ctx.fill();
      break;
    }

    case 'Northern Lights Aurora': {
      // Dark starry night base
      ctx.fillStyle = '#050a14';
      ctx.fillRect(0, 0, width, height);

      // Stars
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 40; i++) {
        const sx = (i * 47) % width;
        const sy = (i * 29) % (height * 0.7);
        const twinkle = 0.3 + 0.7 * Math.sin(timeSec * 3 + i);
        ctx.globalAlpha = Math.max(0.1, twinkle);
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Aurora curtain 1 (Emerald Green)
      ctx.globalAlpha = 0.65;
      const auroraGrad1 = ctx.createLinearGradient(0, height * 0.1, 0, height * 0.85);
      auroraGrad1.addColorStop(0, 'rgba(0, 255, 170, 0)');
      auroraGrad1.addColorStop(0.4, 'rgba(0, 255, 150, 0.7)');
      auroraGrad1.addColorStop(0.8, 'rgba(0, 200, 255, 0.5)');
      auroraGrad1.addColorStop(1, 'rgba(0, 100, 255, 0)');
      ctx.fillStyle = auroraGrad1;

      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 15) {
        const wave = Math.sin(x * 0.01 + timeSec * 1.2) * 50 + Math.sin(x * 0.02 - timeSec * 0.8) * 30;
        const y = height * 0.45 + wave;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // Aurora curtain 2 (Violet / Magenta)
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = 'rgba(180, 50, 255, 0.45)';
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 20) {
        const wave2 = Math.cos(x * 0.012 + timeSec * 0.9) * 45;
        const y2 = height * 0.35 + wave2;
        ctx.lineTo(x, y2);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'Haunted Manor Lightning': {
      // Midnight stormy indigo sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#0c071e');
      skyGrad.addColorStop(0.7, '#1b1236');
      skyGrad.addColorStop(1, '#080512');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Periodic lightning cycle (flashes every ~4 seconds)
      const cycle = timeSec % 4.2;
      let flashIntensity = 0;
      if (cycle > 3.6 && cycle < 3.7) flashIntensity = 0.95;
      else if (cycle > 3.75 && cycle < 3.82) flashIntensity = 0.7;
      else if (cycle > 3.88 && cycle < 3.92) flashIntensity = 0.4;

      if (flashIntensity > 0) {
        ctx.fillStyle = `rgba(235, 240, 255, ${flashIntensity})`;
        ctx.fillRect(0, 0, width, height);

        // Lightning bolt jagged path
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        let lx = width * 0.6;
        let ly = 0;
        ctx.moveTo(lx, ly);
        while (ly < height * 0.8) {
          lx += (Math.random() - 0.5) * 35;
          ly += 20 + Math.random() * 25;
          ctx.lineTo(lx, ly);
        }
        ctx.stroke();
      }

      // Spooky mist along bottom
      const mistGrad = ctx.createLinearGradient(0, height * 0.7, 0, height);
      mistGrad.addColorStop(0, 'rgba(80, 50, 120, 0)');
      mistGrad.addColorStop(1, 'rgba(100, 70, 150, 0.4)');
      ctx.fillStyle = mistGrad;
      ctx.fillRect(0, height * 0.7, width, height * 0.3);
      break;
    }

    case 'Neon Cyber Grid': {
      // Deep dark retro synthwave horizon
      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, '#0d0221');
      bg.addColorStop(0.5, '#240046');
      bg.addColorStop(1, '#05010d');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // Neon Sun on horizon
      const sunGrad = ctx.createLinearGradient(0, height * 0.2, 0, height * 0.55);
      sunGrad.addColorStop(0, '#ff007f');
      sunGrad.addColorStop(1, '#ffbe0b');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(width / 2, height * 0.55, 65, Math.PI, 0, false);
      ctx.fill();

      // Horizontal scanline cuts in sun
      ctx.fillStyle = '#1a0033';
      for (let y = height * 0.35; y < height * 0.55; y += 7) {
        ctx.fillRect(width / 2 - 70, y, 140, 3);
      }

      // Perspective Grid Floor
      const horizonY = height * 0.55;
      ctx.strokeStyle = '#00f5d4';
      ctx.lineWidth = 1.5;

      // Perspective lines converging to center horizon
      for (let x = -width; x <= width * 2; x += 55) {
        ctx.beginPath();
        ctx.moveTo(width / 2, horizonY);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Moving horizontal lines
      const gridSpeed = (timeSec * 70) % 35;
      for (let i = 0; i < 12; i++) {
        const p = Math.pow((i + gridSpeed / 35) / 12, 2.2);
        const gy = horizonY + p * (height - horizonY);
        ctx.strokeStyle = `rgba(255, 0, 127, ${0.2 + p * 0.8})`;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
      }
      break;
    }

    default: {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px monospace';
      ctx.fillText(`Preset: ${preset}`, 20, 40);
      break;
    }
  }

  ctx.restore();
}
