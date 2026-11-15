/**
 * MARSHALL MAP GEOMETRY & TWO-TIER RECALIBRATION ENGINE
 *
 * Implements the full outdoor architectural mapping geometry pipeline from MarshallProjectionStudio:
 * 1. 5-Stage Transform Chain (Local -> Parent Inheritance -> Recalibration Offset -> Global Map Warp W)
 * 2. 3x3 Projective Perspective Homography (Heckbert 1989 closed-form quad-to-quad solver)
 * 3. Polygon Holes & Overlap Diagnostics (Window/Door punch-out, Misplaced hole detection)
 * 4. Geometry Auto-Classifier & Semantic Naming Preview (ShapeClassifier heuristics)
 * 5. Advanced Modeling Tools (6-Handle Parametric Ellipse, Soft Selection, Edge Slide, Align/Distribute, Symmetry Mirror M)
 * 6. Named Calibration Presets (.mpscalib) & Stamp Templates (.mpsshapes)
 */

import { VectorLayer, VectorVertex } from '../store/useProjectionStore';

// ============================================================================
// 1. DATA TYPES & INTERFACES
// ============================================================================

export type SemanticShapeTag =
  | 'RoofPlane'
  | 'Roofline'
  | 'Wall'
  | 'Window'
  | 'Door'
  | 'Garage'
  | 'Pillar'
  | 'Bush'
  | 'Fascia'
  | 'Trim'
  | 'Custom';

export interface ShapeRecalibrationOffset {
  dx: number;
  dy: number;
  dRotationDeg: number;
  dScaleX: number; // multiplier, default 1.0
  dScaleY: number; // multiplier, default 1.0
  cornerDeltas?: [VectorVertex, VectorVertex, VectorVertex, VectorVertex];
}

export interface GlobalMapWarpState {
  enabled: boolean;
  corners: [VectorVertex, VectorVertex, VectorVertex, VectorVertex]; // TL, TR, BR, BL in canvas space
}

export interface ExtendedLayerMetadata {
  layerId: string;
  parentId: string | null;
  clipChildrenToParent: boolean;
  holes: VectorVertex[][];
  isOpenPath: boolean;
  strokeWidthPx: number;
  semanticTag: SemanticShapeTag;
  baselineVertices: VectorVertex[];
  recalibrationOffset: ShapeRecalibrationOffset;
  parametricType?: 'polygon' | 'ellipse-6handle' | 'rectangle' | 'triangle';
  ellipseParams?: {
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    rotationDeg: number;
  };
  curvedEdges?: Record<number, { cp1: VectorVertex; cp2?: VectorVertex }>;
  notes?: string;
  updatedAt?: string;
}

export interface CalibrationPreset {
  id: string;
  name: string;
  notes?: string;
  createdAt: string;
  globalMapWarp: GlobalMapWarpState;
  shapeOffsets: Record<string, ShapeRecalibrationOffset>;
  metaOverrides?: Record<string, Partial<ExtendedLayerMetadata>>;
}

export interface ShapeStampTemplate {
  id: string;
  name: string;
  kindId: 'mps.shapeTemplate';
  nominalWidth: number;
  nominalHeight: number;
  shapes: Array<{
    name: string;
    tag: SemanticShapeTag;
    vertices: VectorVertex[];
    isOpenPath?: boolean;
    strokeWidthPx?: number;
    holes?: VectorVertex[][];
  }>;
}

export interface ShapeClassificationResult {
  layerId: string;
  currentName: string;
  proposedName: string;
  proposedTag: SemanticShapeTag;
  proposedGroup: string;
  confidence: 'Unsure' | 'Likely' | 'Confident';
  confidencePercent: number;
  reason: string;
  enclosedInLayerId?: string;
  willChange: boolean;
}

export interface HoleDiagnosticIssue {
  layerId: string;
  layerName: string;
  type: 'misplaced_hole' | 'shape_over_hole' | 'unparented_enclosed';
  severity: 'error' | 'warning' | 'info';
  description: string;
  suggestedAction: string;
  holeIndex?: number;
  targetLayerId?: string;
}

// Default canvas bounds for Gemini Studio (1080x600 stage)
export const DEFAULT_STAGE_WIDTH = 1080;
export const DEFAULT_STAGE_HEIGHT = 600;

export const DEFAULT_GLOBAL_WARP: GlobalMapWarpState = {
  enabled: false,
  corners: [
    { x: 0, y: 0 },
    { x: DEFAULT_STAGE_WIDTH, y: 0 },
    { x: DEFAULT_STAGE_WIDTH, y: DEFAULT_STAGE_HEIGHT },
    { x: 0, y: DEFAULT_STAGE_HEIGHT },
  ],
};

export const DEFAULT_RECALIBRATION_OFFSET: ShapeRecalibrationOffset = {
  dx: 0,
  dy: 0,
  dRotationDeg: 0,
  dScaleX: 1.0,
  dScaleY: 1.0,
};

// ============================================================================
// 2. LOCAL STORAGE PERSISTENCE HELPERS
// ============================================================================

const STORAGE_KEY_EXTENDED_META = 'mps_map_extended_meta_v1';
const STORAGE_KEY_GLOBAL_WARP = 'mps_global_map_warp_v1';
const STORAGE_KEY_CALIBRATION_PRESETS = 'mps_calibration_presets_v1';
const STORAGE_KEY_CUSTOM_TEMPLATES = 'mps_custom_stamp_templates_v1';

export function getStoredExtendedMeta(): Record<string, ExtendedLayerMetadata> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EXTENDED_META);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[marshallMapEngine] Failed reading extended metadata:', err);
    return {};
  }
}

export function saveStoredExtendedMeta(meta: Record<string, ExtendedLayerMetadata>): void {
  try {
    localStorage.setItem(STORAGE_KEY_EXTENDED_META, JSON.stringify(meta));
  } catch (err) {
    console.error('[marshallMapEngine] Failed saving extended metadata:', err);
  }
}

export function getLayerExtendedMeta(
  layer: VectorLayer,
  metaMap: Record<string, ExtendedLayerMetadata>
): ExtendedLayerMetadata {
  if (metaMap[layer.id]) {
    return metaMap[layer.id];
  }
  // Initialize default metadata derived from layer
  let semanticTag: SemanticShapeTag = 'Custom';
  if (layer.category === 'Roofline') semanticTag = 'Roofline';
  else if (layer.category === 'Main Walls') semanticTag = 'Wall';
  else if (layer.category === 'Windows') semanticTag = 'Window';
  else if (layer.category === 'Garage') semanticTag = 'Garage';
  else if (layer.category === 'Pillars') semanticTag = 'Pillar';

  const defaultMeta: ExtendedLayerMetadata = {
    layerId: layer.id,
    parentId: null,
    clipChildrenToParent: false,
    holes: [],
    isOpenPath: layer.category === 'Roofline' && layer.vertices.length > 2,
    strokeWidthPx: layer.strokeWidth || 3,
    semanticTag,
    baselineVertices: layer.vertices.map((v) => ({ ...v })),
    recalibrationOffset: { ...DEFAULT_RECALIBRATION_OFFSET },
    parametricType: 'polygon',
  };
  return defaultMeta;
}

export function getStoredGlobalWarp(): GlobalMapWarpState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GLOBAL_WARP);
    if (!raw) return DEFAULT_GLOBAL_WARP;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.corners) && parsed.corners.length === 4) {
      return parsed;
    }
  } catch (err) {
    console.warn('[marshallMapEngine] Failed reading global warp:', err);
  }
  return DEFAULT_GLOBAL_WARP;
}

export function saveStoredGlobalWarp(warp: GlobalMapWarpState): void {
  try {
    localStorage.setItem(STORAGE_KEY_GLOBAL_WARP, JSON.stringify(warp));
  } catch (err) {
    console.error('[marshallMapEngine] Failed saving global warp:', err);
  }
}

export function loadCalibrationPresets(): CalibrationPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CALIBRATION_PRESETS);
    if (!raw) return getBuiltInCalibrationPresets();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : getBuiltInCalibrationPresets();
  } catch (err) {
    console.warn('[marshallMapEngine] Failed loading calibration presets:', err);
    return getBuiltInCalibrationPresets();
  }
}

export function saveCalibrationPresets(presets: CalibrationPreset[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CALIBRATION_PRESETS, JSON.stringify(presets));
  } catch (err) {
    console.error('[marshallMapEngine] Failed saving calibration presets:', err);
  }
}

export function exportCalibrationPresetJson(preset: CalibrationPreset): string {
  const doc = {
    kindId: 'mps.calibrationPreset',
    schemaVersion: 1,
    id: preset.id,
    name: preset.name,
    notes: preset.notes || '',
    createdAt: preset.createdAt,
    globalMapWarp: preset.globalMapWarp,
    shapeOffsets: preset.shapeOffsets,
    metaOverrides: preset.metaOverrides || {},
  };
  return JSON.stringify(doc, null, 2);
}

export function importCalibrationPresetJson(jsonStr: string): CalibrationPreset | null {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || !parsed.name || !parsed.globalMapWarp) {
      throw new Error('Invalid .mpscalib structure');
    }
    return {
      id: parsed.id || `calib-${Date.now()}`,
      name: parsed.name,
      notes: parsed.notes || '',
      createdAt: parsed.createdAt || new Date().toISOString(),
      globalMapWarp: parsed.globalMapWarp,
      shapeOffsets: parsed.shapeOffsets || {},
      metaOverrides: parsed.metaOverrides || {},
    };
  } catch (err) {
    console.error('[marshallMapEngine] Failed importing preset:', err);
    return null;
  }
}

export function getBuiltInCalibrationPresets(): CalibrationPreset[] {
  return [
    {
      id: 'calib-default-straight',
      name: 'Default Direct Orthogonal (No Warp)',
      notes: 'Standard level tripod setup at 25ft center stage. Master warp bypassed.',
      createdAt: '2026-10-01T12:00:00Z',
      globalMapWarp: {
        enabled: false,
        corners: [
          { x: 0, y: 0 },
          { x: DEFAULT_STAGE_WIDTH, y: 0 },
          { x: DEFAULT_STAGE_WIDTH, y: DEFAULT_STAGE_HEIGHT },
          { x: 0, y: DEFAULT_STAGE_HEIGHT },
        ],
      },
      shapeOffsets: {},
    },
    {
      id: 'calib-driveway-left-pitch',
      name: 'Driveway Left-Angle (15° Pitch & Keystone)',
      notes: 'Driveway post on left side of lawn. Compensates for horizontal keystoning and roof elevation slope.',
      createdAt: '2026-10-15T18:30:00Z',
      globalMapWarp: {
        enabled: true,
        corners: [
          { x: 28, y: 18 },
          { x: 1048, y: 34 },
          { x: 1060, y: 585 },
          { x: 12, y: 592 },
        ],
      },
      shapeOffsets: {},
    },
    {
      id: 'calib-porch-steep-elevation',
      name: 'Low Lawn Mount (Upward Elevation Tilt)',
      notes: 'Low turf tripod looking upward towards roof apex. Corrects vertical perspective converging at top.',
      createdAt: '2026-11-01T20:15:00Z',
      globalMapWarp: {
        enabled: true,
        corners: [
          { x: 42, y: 22 },
          { x: 1038, y: 22 },
          { x: 1072, y: 595 },
          { x: 8, y: 595 },
        ],
      },
      shapeOffsets: {},
    },
  ];
}

// ============================================================================
// 3. 3x3 PERSPECTIVE HOMOGRAPHY SOLVER (Heckbert 1989)
// ============================================================================

export type Matrix3x3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number]
];

export const IDENTITY_HOMOGRAPHY: Matrix3x3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

export function multiplyHomography(a: Matrix3x3, b: Matrix3x3): Matrix3x3 {
  const result: Matrix3x3 = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      result[i][j] =
        a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j];
    }
  }
  return result;
}

export function invertHomography(m: Matrix3x3): Matrix3x3 | null {
  const det =
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

  if (Math.abs(det) < 1e-12) {
    return null; // Singular matrix
  }

  const invDet = 1.0 / det;
  return [
    [
      (m[1][1] * m[2][2] - m[1][2] * m[2][1]) * invDet,
      (m[0][2] * m[2][1] - m[0][1] * m[2][2]) * invDet,
      (m[0][1] * m[1][2] - m[0][2] * m[1][1]) * invDet,
    ],
    [
      (m[1][2] * m[2][0] - m[1][0] * m[2][2]) * invDet,
      (m[0][0] * m[2][2] - m[0][2] * m[2][0]) * invDet,
      (m[0][2] * m[1][0] - m[0][0] * m[1][2]) * invDet,
    ],
    [
      (m[1][0] * m[2][1] - m[1][1] * m[2][0]) * invDet,
      (m[0][1] * m[2][0] - m[0][0] * m[2][1]) * invDet,
      (m[0][0] * m[1][1] - m[0][1] * m[1][0]) * invDet,
    ],
  ];
}

/**
 * Projects a point (x, y) through a 3x3 homography matrix with perspective divide by w.
 */
export function transformPointHomography(m: Matrix3x3, pt: VectorVertex): VectorVertex {
  const x = pt.x;
  const y = pt.y;
  const w = m[2][0] * x + m[2][1] * y + m[2][2];
  if (Math.abs(w) < 1e-8) {
    return { x: pt.x, y: pt.y };
  }
  const invW = 1.0 / w;
  return {
    x: (m[0][0] * x + m[0][1] * y + m[0][2]) * invW,
    y: (m[1][0] * x + m[1][1] * y + m[1][2]) * invW,
  };
}

/**
 * Checks if 4 corners form a convex quad without self-intersections.
 */
export function isQuadConvex(q: [VectorVertex, VectorVertex, VectorVertex, VectorVertex]): boolean {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const p1 = q[i];
    const p2 = q[(i + 1) % 4];
    const p3 = q[(i + 2) % 4];
    const dx1 = p2.x - p1.x;
    const dy1 = p2.y - p1.y;
    const dx2 = p3.x - p2.x;
    const dy2 = p3.y - p2.y;
    const cross = dx1 * dy2 - dy1 * dx2;
    if (Math.abs(cross) < 1e-5) continue;
    const currentSign = cross > 0 ? 1 : -1;
    if (sign === 0) {
      sign = currentSign;
    } else if (sign !== currentSign) {
      return false; // Inverted or non-convex
    }
  }
  return true;
}

/**
 * Heckbert's closed form (1989): Homography from unit square (0,0)-(1,0)-(1,1)-(0,1) to quad.
 */
export function homographyFromUnitSquare(q: [VectorVertex, VectorVertex, VectorVertex, VectorVertex]): Matrix3x3 | null {
  const x0 = q[0].x, y0 = q[0].y;
  const x1 = q[1].x, y1 = q[1].y;
  const x2 = q[2].x, y2 = q[2].y;
  const x3 = q[3].x, y3 = q[3].y;

  const sumX = x0 - x1 + x2 - x3;
  const sumY = y0 - y1 + y2 - y3;

  const scale = Math.max(
    Math.max(Math.abs(x0) + Math.abs(x1), Math.abs(x2) + Math.abs(x3)),
    Math.max(Math.abs(y0) + Math.abs(y1), Math.abs(y2) + Math.abs(y3)),
    1.0
  );
  const eps = 1e-10 * scale;

  if (Math.abs(sumX) < eps && Math.abs(sumY) < eps) {
    // Affine case
    return [
      [x1 - x0, x3 - x0, x0],
      [y1 - y0, y3 - y0, y0],
      [0, 0, 1],
    ];
  }

  const dx1 = x1 - x2;
  const dy1 = y1 - y2;
  const dx2 = x3 - x2;
  const dy2 = y3 - y2;
  const denominator = dx1 * dy2 - dx2 * dy1;

  if (Math.abs(denominator) < 1e-12) {
    return null; // Degenerate collinear points
  }

  const g = (sumX * dy2 - dx2 * sumY) / denominator;
  const h = (dx1 * sumY - sumX * dy1) / denominator;

  return [
    [x1 - x0 + g * x1, x3 - x0 + h * x3, x0],
    [y1 - y0 + g * y1, y3 - y0 + h * y3, y0],
    [g, h, 1],
  ];
}

/**
 * Heckbert 1989 general Quad-to-Quad perspective solver:
 * H = ToDestination * Invert(ToSource)
 */
export function solveQuadToQuad(
  source: [VectorVertex, VectorVertex, VectorVertex, VectorVertex],
  destination: [VectorVertex, VectorVertex, VectorVertex, VectorVertex]
): Matrix3x3 | null {
  const toSource = homographyFromUnitSquare(source);
  if (!toSource) return null;
  const fromSource = invertHomography(toSource);
  if (!fromSource) return null;

  const toDest = homographyFromUnitSquare(destination);
  if (!toDest) return null;

  return multiplyHomography(toDest, fromSource);
}

// ============================================================================
// 4. TRANSFORM CHAIN EVALUATION ENGINE
// ============================================================================

/**
 * Computes polygon centroid.
 */
export function computePolygonCentroid(vertices: VectorVertex[]): VectorVertex {
  if (vertices.length === 0) return { x: 0, y: 0 };
  let sumX = 0;
  let sumY = 0;
  for (const v of vertices) {
    sumX += v.x;
    sumY += v.y;
  }
  return { x: sumX / vertices.length, y: sumY / vertices.length };
}

/**
 * Computes polygon bounding box.
 */
export function computePolygonBounds(vertices: VectorVertex[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
} {
  if (vertices.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const v of vertices) {
    if (v.x < minX) minX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.x > maxX) maxX = v.x;
    if (v.y > maxY) maxY = v.y;
  }
  const width = Math.max(0, maxX - minX);
  const height = Math.max(0, maxY - minY);
  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
  };
}

/**
 * Evaluates the 5-Stage Transform Chain for a shape:
 * 1. Base local vertices (handling parametric 6-handle ellipse & curved edges)
 * 2. Parent transform inheritance (recursively walking up parent hierarchy)
 * 3. Per-shape recalibration offset (dx, dy, dRotation, dScale, cornerDeltas)
 * 4. Master 4-Corner Global Map Warp (W) 3x3 homography
 */
export function evaluateTransformChain(
  layer: VectorLayer,
  allLayers: VectorLayer[],
  metaMap: Record<string, ExtendedLayerMetadata>,
  globalWarp: GlobalMapWarpState
): VectorVertex[] {
  const meta = getLayerExtendedMeta(layer, metaMap);

  // Stage 1: Base vertices
  let points: VectorVertex[] = [];
  if (meta.parametricType === 'ellipse-6handle' && meta.ellipseParams) {
    points = createParametricEllipse(
      meta.ellipseParams.cx,
      meta.ellipseParams.cy,
      meta.ellipseParams.rx,
      meta.ellipseParams.ry,
      meta.ellipseParams.rotationDeg,
      36
    );
  } else if (meta.curvedEdges && Object.keys(meta.curvedEdges).length > 0) {
    points = evaluateCurvedEdges(layer.vertices, meta.curvedEdges);
  } else {
    points = layer.vertices.map((v) => ({ ...v }));
  }

  if (points.length === 0) return [];

  // Stage 2: Parent shape transform inheritance (recursive)
  if (meta.parentId) {
    const parentLayer = allLayers.find((l) => l.id === meta.parentId);
    if (parentLayer) {
      const parentMeta = getLayerExtendedMeta(parentLayer, metaMap);
      // If parent has a recalibration offset or position delta, apply it to child
      const pOffset = parentMeta.recalibrationOffset;
      if (
        pOffset.dx !== 0 ||
        pOffset.dy !== 0 ||
        pOffset.dRotationDeg !== 0 ||
        pOffset.dScaleX !== 1.0 ||
        pOffset.dScaleY !== 1.0
      ) {
        const parentCentroid = computePolygonCentroid(parentLayer.vertices);
        points = applyOffsetToPoints(points, pOffset, parentCentroid);
      }
    }
  }

  // Stage 3: Per-shape recalibration offset
  const offset = meta.recalibrationOffset;
  if (
    offset.dx !== 0 ||
    offset.dy !== 0 ||
    offset.dRotationDeg !== 0 ||
    offset.dScaleX !== 1.0 ||
    offset.dScaleY !== 1.0 ||
    offset.cornerDeltas
  ) {
    const centroid = computePolygonCentroid(points);
    points = applyOffsetToPoints(points, offset, centroid);
  }

  // Stage 4: Global Map Warp (W) homography
  if (globalWarp && globalWarp.enabled) {
    const defaultCorners: [VectorVertex, VectorVertex, VectorVertex, VectorVertex] = [
      { x: 0, y: 0 },
      { x: DEFAULT_STAGE_WIDTH, y: 0 },
      { x: DEFAULT_STAGE_WIDTH, y: DEFAULT_STAGE_HEIGHT },
      { x: 0, y: DEFAULT_STAGE_HEIGHT },
    ];
    const warpMatrix = solveQuadToQuad(defaultCorners, globalWarp.corners);
    if (warpMatrix) {
      points = points.map((p) => transformPointHomography(warpMatrix, p));
    }
  }

  return points;
}

/**
 * Applies translation, rotation, and scaling around a centroid to a list of points.
 */
export function applyOffsetToPoints(
  points: VectorVertex[],
  offset: ShapeRecalibrationOffset,
  pivot: VectorVertex
): VectorVertex[] {
  const rad = (offset.dRotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const sx = offset.dScaleX;
  const sy = offset.dScaleY;

  return points.map((p) => {
    // Relative to pivot
    const rx = (p.x - pivot.x) * sx;
    const ry = (p.y - pivot.y) * sy;

    // Rotate
    const rotX = rx * cos - ry * sin;
    const rotY = rx * sin + ry * cos;

    // Translate back and apply dx, dy
    return {
      x: rotX + pivot.x + offset.dx,
      y: rotY + pivot.y + offset.dy,
    };
  });
}

/**
 * Evaluates Bézier curves on designated polygon edges.
 */
function evaluateCurvedEdges(
  vertices: VectorVertex[],
  curves: Record<number, { cp1: VectorVertex; cp2?: VectorVertex }>
): VectorVertex[] {
  const result: VectorVertex[] = [];
  const n = vertices.length;

  for (let i = 0; i < n; i++) {
    const pStart = vertices[i];
    const pEnd = vertices[(i + 1) % n];
    result.push(pStart);

    const curve = curves[i];
    if (curve) {
      // Subdivide edge into 6 smooth points
      const steps = 6;
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        if (curve.cp2) {
          // Cubic Bézier
          const invT = 1 - t;
          const x =
            invT * invT * invT * pStart.x +
            3 * invT * invT * t * curve.cp1.x +
            3 * invT * t * t * curve.cp2.x +
            t * t * t * pEnd.x;
          const y =
            invT * invT * invT * pStart.y +
            3 * invT * invT * t * curve.cp1.y +
            3 * invT * t * t * curve.cp2.y +
            t * t * t * pEnd.y;
          result.push({ x, y });
        } else {
          // Quadratic Bézier
          const invT = 1 - t;
          const x = invT * invT * pStart.x + 2 * invT * t * curve.cp1.x + t * t * pEnd.x;
          const y = invT * invT * pStart.y + 2 * invT * t * curve.cp1.y + t * t * pEnd.y;
          result.push({ x, y });
        }
      }
    }
  }
  return result;
}

// ============================================================================
// 5. POLYGON HOLES & OVERLAP DIAGNOSTICS
// ============================================================================

/**
 * Ray casting algorithm for point in polygon.
 */
export function pointInPolygon(pt: VectorVertex, ring: VectorVertex[]): boolean {
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i].x, yi = ring[i].y;
    const xj = ring[j].x, yj = ring[j].y;
    const intersect =
      yi > pt.y !== yj > pt.y &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Checks if two line segments (p1-p2) and (p3-p4) intersect.
 */
function segmentsIntersect(
  p1: VectorVertex,
  p2: VectorVertex,
  p3: VectorVertex,
  p4: VectorVertex
): boolean {
  function ccw(a: VectorVertex, b: VectorVertex, c: VectorVertex) {
    return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
  }
  return (
    ccw(p1, p3, p4) !== ccw(p2, p3, p4) &&
    ccw(p1, p2, p3) !== ccw(p1, p2, p4)
  );
}

/**
 * Checks if polygon inner is completely enclosed inside polygon outer.
 */
export function isPolygonInsidePolygon(
  inner: VectorVertex[],
  outer: VectorVertex[]
): boolean {
  if (inner.length < 3 || outer.length < 3) return false;

  // 1. All inner vertices must be inside outer
  for (const pt of inner) {
    if (!pointInPolygon(pt, outer)) {
      return false;
    }
  }

  // 2. Centroid must be inside outer
  const centroid = computePolygonCentroid(inner);
  if (!pointInPolygon(centroid, outer)) {
    return false;
  }

  // 3. No edge of inner can intersect any edge of outer
  const nInner = inner.length;
  const nOuter = outer.length;
  for (let i = 0; i < nInner; i++) {
    const p1 = inner[i];
    const p2 = inner[(i + 1) % nInner];
    for (let j = 0; j < nOuter; j++) {
      const q1 = outer[j];
      const q2 = outer[(j + 1) % nOuter];
      if (segmentsIntersect(p1, p2, q1, q2)) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Automatically detects Window and Door shapes enclosed in Wall shapes
 * and registers them as polygon holes in the wall's metadata.
 */
export function autoDetectHolesInWalls(
  layers: VectorLayer[],
  metaMap: Record<string, ExtendedLayerMetadata>
): {
  updatedMeta: Record<string, ExtendedLayerMetadata>;
  punchedCount: number;
} {
  const nextMeta: Record<string, ExtendedLayerMetadata> = { ...metaMap };
  let punchedCount = 0;

  // Find wall layers
  const wallLayers = layers.filter((l) => {
    const m = getLayerExtendedMeta(l, metaMap);
    return m.semanticTag === 'Wall' || l.category === 'Main Walls';
  });

  // Find window and door layers
  const openingLayers = layers.filter((l) => {
    const m = getLayerExtendedMeta(l, metaMap);
    return (
      m.semanticTag === 'Window' ||
      m.semanticTag === 'Door' ||
      l.category === 'Windows'
    );
  });

  for (const wall of wallLayers) {
    const wallMeta = { ...getLayerExtendedMeta(wall, nextMeta) };
    const wallHoles: VectorVertex[][] = [...wallMeta.holes];

    for (const opening of openingLayers) {
      if (opening.id === wall.id) continue;
      if (isPolygonInsidePolygon(opening.vertices, wall.vertices)) {
        // Check if this hole already exists
        const openingCentroid = computePolygonCentroid(opening.vertices);
        const alreadyExists = wallHoles.some((h) => {
          const hc = computePolygonCentroid(h);
          return Math.hypot(hc.x - openingCentroid.x, hc.y - openingCentroid.y) < 5;
        });

        if (!alreadyExists) {
          wallHoles.push(opening.vertices.map((v) => ({ ...v })));
          punchedCount++;
        }
      }
    }

    wallMeta.holes = wallHoles;
    nextMeta[wall.id] = wallMeta;
  }

  saveStoredExtendedMeta(nextMeta);
  return { updatedMeta: nextMeta, punchedCount };
}

/**
 * Finds misplaced holes: any hole ring that extends outside its parent shape's boundary.
 */
export function findMisplacedHoles(
  layers: VectorLayer[],
  metaMap: Record<string, ExtendedLayerMetadata>
): HoleDiagnosticIssue[] {
  const issues: HoleDiagnosticIssue[] = [];

  for (const layer of layers) {
    const meta = getLayerExtendedMeta(layer, metaMap);
    if (!meta.holes || meta.holes.length === 0) continue;

    meta.holes.forEach((hole, hIdx) => {
      // Check each vertex of the hole
      let pointsOutside = 0;
      for (const pt of hole) {
        if (!pointInPolygon(pt, layer.vertices)) {
          pointsOutside++;
        }
      }

      if (pointsOutside > 0) {
        issues.push({
          layerId: layer.id,
          layerName: layer.name,
          type: 'misplaced_hole',
          severity: 'error',
          holeIndex: hIdx,
          description: `Hole #${hIdx + 1} extends outside the boundary of shape "${layer.name}" (${pointsOutside} vertices outside).`,
          suggestedAction: 'Delete or edit the hole ring so it stays fully inside the wall.',
        });
      }
    });
  }
  return issues;
}

/**
 * Finds shapes overlapping holes or shapes enclosed inside walls without proper holes or parenting.
 */
export function findShapesOverHoles(
  layers: VectorLayer[],
  metaMap: Record<string, ExtendedLayerMetadata>
): HoleDiagnosticIssue[] {
  const issues: HoleDiagnosticIssue[] = [];

  const wallLayers = layers.filter((l) => {
    const m = getLayerExtendedMeta(l, metaMap);
    return m.semanticTag === 'Wall' || l.category === 'Main Walls';
  });

  const childCandidates = layers.filter((l) => {
    const m = getLayerExtendedMeta(l, metaMap);
    return (
      m.semanticTag === 'Window' ||
      m.semanticTag === 'Door' ||
      m.semanticTag === 'Pillar' ||
      l.category === 'Windows'
    );
  });

  for (const child of childCandidates) {
    const childMeta = getLayerExtendedMeta(child, metaMap);
    for (const wall of wallLayers) {
      if (child.id === wall.id) continue;
      if (isPolygonInsidePolygon(child.vertices, wall.vertices)) {
        // Enclosed inside wall
        const wallMeta = getLayerExtendedMeta(wall, metaMap);
        const childCentroid = computePolygonCentroid(child.vertices);
        const hasHolePunch = wallMeta.holes.some((h) => {
          const hc = computePolygonCentroid(h);
          return Math.hypot(hc.x - childCentroid.x, hc.y - childCentroid.y) < 10;
        });

        if (!hasHolePunch) {
          issues.push({
            layerId: child.id,
            layerName: child.name,
            targetLayerId: wall.id,
            type: 'unparented_enclosed',
            severity: 'warning',
            description: `Shape "${child.name}" is enclosed inside "${wall.name}" but no hole is punched out, causing double-projection wash.`,
            suggestedAction: 'Click "Auto-Punch Windows/Doors as Holes in Walls" to cut out this aperture.',
          });
        }
      }
    }
  }

  return issues;
}

// ============================================================================
// 6. ADVANCED MODELING TOOLS
// ============================================================================

/**
 * Creates a parametric ellipse as a polygon.
 */
export function createParametricEllipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotationDeg: number = 0,
  numPoints: number = 32
): VectorVertex[] {
  const points: VectorVertex[] = [];
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    const localX = rx * Math.cos(angle);
    const localY = ry * Math.sin(angle);
    const rotX = localX * cos - localY * sin;
    const rotY = localX * sin + localY * cos;
    points.push({ x: cx + rotX, y: cy + rotY });
  }
  return points;
}

/**
 * Returns the 6 cardinal manipulator handles for an ellipse:
 * 1. Center
 * 2. North (Top)
 * 3. South (Bottom)
 * 4. East (Right)
 * 5. West (Left)
 * 6. Rotation Stalk (extends beyond North handle)
 */
export function getEllipse6Handles(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotationDeg: number = 0
): {
  center: VectorVertex;
  north: VectorVertex;
  south: VectorVertex;
  east: VectorVertex;
  west: VectorVertex;
  rotationStalk: VectorVertex;
} {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const rotate = (x: number, y: number): VectorVertex => ({
    x: cx + (x * cos - y * sin),
    y: cy + (x * sin + y * cos),
  });

  return {
    center: { x: cx, y: cy },
    north: rotate(0, -ry),
    south: rotate(0, ry),
    east: rotate(rx, 0),
    west: rotate(-rx, 0),
    rotationStalk: rotate(0, -ry - 25),
  };
}

/**
 * Edge slide: slides a vertex along the line formed by an adjacent vertex,
 * preserving edge angles. tDelta is a multiplier along the edge vector.
 */
export function slideVertexAlongEdge(
  vertices: VectorVertex[],
  vertexIdx: number,
  adjacentIdx: number,
  tDelta: number
): VectorVertex[] {
  if (vertexIdx < 0 || vertexIdx >= vertices.length) return vertices;
  if (adjacentIdx < 0 || adjacentIdx >= vertices.length) return vertices;

  const v = vertices[vertexIdx];
  const adj = vertices[adjacentIdx];
  const dirX = adj.x - v.x;
  const dirY = adj.y - v.y;

  const newVertices = vertices.map((pt, i) => {
    if (i === vertexIdx) {
      return {
        x: pt.x + dirX * tDelta,
        y: pt.y + dirY * tDelta,
      };
    }
    return { ...pt };
  });

  return newVertices;
}

/**
 * Soft Selection Falloff: applies Gaussian bell falloff delta to neighbouring vertices.
 */
export function applySoftSelectionDelta(
  vertices: VectorVertex[],
  selectedIndices: number[],
  deltaX: number,
  deltaY: number,
  falloffRadius: number = 60
): VectorVertex[] {
  if (selectedIndices.length === 0) return vertices;

  return vertices.map((v, i) => {
    if (selectedIndices.includes(i)) {
      return { x: v.x + deltaX, y: v.y + deltaY };
    }

    // Compute shortest distance to any selected vertex
    let minDist = Infinity;
    for (const selIdx of selectedIndices) {
      const selV = vertices[selIdx];
      const dist = Math.hypot(v.x - selV.x, v.y - selV.y);
      if (dist < minDist) minDist = dist;
    }

    if (minDist >= falloffRadius) {
      return { ...v };
    }

    // Gaussian falloff
    const sigma = falloffRadius / 2.5;
    const weight = Math.exp(-0.5 * Math.pow(minDist / sigma, 2));

    return {
      x: v.x + deltaX * weight,
      y: v.y + deltaY * weight,
    };
  });
}

/**
 * Align and Distribute Layers: Align or evenly distribute shapes horizontally or vertically.
 */
export function alignAndDistributeLayers(
  layers: VectorLayer[],
  selectedIds: string[],
  mode:
    | 'left'
    | 'right'
    | 'top'
    | 'bottom'
    | 'center-h'
    | 'center-v'
    | 'distribute-centres-h'
    | 'distribute-gaps-h'
): VectorLayer[] {
  if (selectedIds.length <= 1) return layers;

  const targetLayers = layers.filter((l) => selectedIds.includes(l.id));
  const otherLayers = layers.filter((l) => !selectedIds.includes(l.id));

  // Compute bounding boxes
  const boxes = targetLayers.map((l) => ({
    layer: l,
    box: computePolygonBounds(l.vertices),
  }));

  // Overall bounds
  const minX = Math.min(...boxes.map((b) => b.box.minX));
  const maxX = Math.max(...boxes.map((b) => b.box.maxX));
  const minY = Math.min(...boxes.map((b) => b.box.minY));
  const maxY = Math.max(...boxes.map((b) => b.box.maxY));
  const centerH = (minX + maxX) / 2;
  const centerV = (minY + maxY) / 2;

  const updatedTargetLayers = boxes.map((item) => {
    const l = item.layer;
    const b = item.box;
    let dx = 0;
    let dy = 0;

    switch (mode) {
      case 'left':
        dx = minX - b.minX;
        break;
      case 'right':
        dx = maxX - b.maxX;
        break;
      case 'top':
        dy = minY - b.minY;
        break;
      case 'bottom':
        dy = maxY - b.maxY;
        break;
      case 'center-h':
        dx = centerH - b.centerX;
        break;
      case 'center-v':
        dy = centerV - b.centerY;
        break;
      default:
        break;
    }

    if (dx !== 0 || dy !== 0) {
      return {
        ...l,
        positionX: l.positionX + dx,
        positionY: l.positionY + dy,
        vertices: l.vertices.map((v) => ({ x: v.x + dx, y: v.y + dy })),
      };
    }
    return l;
  });

  // Handle distribute modes
  if (mode === 'distribute-centres-h' || mode === 'distribute-gaps-h') {
    // Sort boxes by centerX
    const sorted = [...boxes].sort((a, b) => a.box.centerX - b.box.centerX);
    const n = sorted.length;
    if (n > 2) {
      if (mode === 'distribute-centres-h') {
        const firstCenter = sorted[0].box.centerX;
        const lastCenter = sorted[n - 1].box.centerX;
        const step = (lastCenter - firstCenter) / (n - 1);

        const distributed = sorted.map((item, idx) => {
          const targetCenter = firstCenter + idx * step;
          const dx = targetCenter - item.box.centerX;
          return {
            ...item.layer,
            positionX: item.layer.positionX + dx,
            vertices: item.layer.vertices.map((v) => ({ x: v.x + dx, y: v.y })),
          };
        });
        return [...otherLayers, ...distributed];
      } else if (mode === 'distribute-gaps-h') {
        const totalWidth = sorted.reduce((sum, item) => sum + item.box.width, 0);
        const totalSpan = sorted[n - 1].box.maxX - sorted[0].box.minX;
        const totalGap = totalSpan - totalWidth;
        const gap = Math.max(0, totalGap / (n - 1));

        let currentX = sorted[0].box.minX;
        const distributed = sorted.map((item) => {
          const dx = currentX - item.box.minX;
          currentX += item.box.width + gap;
          return {
            ...item.layer,
            positionX: item.layer.positionX + dx,
            vertices: item.layer.vertices.map((v) => ({ x: v.x + dx, y: v.y })),
          };
        });
        return [...otherLayers, ...distributed];
      }
    }
  }

  return [...otherLayers, ...updatedTargetLayers];
}

/**
 * Symmetry Mirror (M shortcut): Flips a layer across the vertical symmetry axis (e.g. x = 540).
 * Reverses vertex order to keep consistent winding.
 */
export function mirrorLayerAcrossSymmetryAxis(
  layer: VectorLayer,
  axisX: number = DEFAULT_STAGE_WIDTH / 2
): VectorLayer {
  const mirroredVertices = layer.vertices
    .map((v) => ({
      x: 2 * axisX - v.x,
      y: v.y,
    }))
    .reverse(); // Reverse winding so counter-clockwise doesn't flip inside out

  const bounds = computePolygonBounds(mirroredVertices);

  return {
    ...layer,
    id: `layer-mirror-${Date.now()}`,
    name: `${layer.name} (Mirrored)`,
    positionX: bounds.centerX,
    positionY: bounds.centerY,
    vertices: mirroredVertices,
  };
}

// ============================================================================
// 7. BUILT-IN STAMP TEMPLATES (.mpsshapes)
// ============================================================================

export function getBuiltInShapeTemplates(): ShapeStampTemplate[] {
  return [
    {
      id: 'stamp-colonial-6pane',
      name: '6-Pane Colonial Window',
      kindId: 'mps.shapeTemplate',
      nominalWidth: 140,
      nominalHeight: 210,
      shapes: [
        {
          name: 'Colonial Outer Frame',
          tag: 'Window',
          vertices: [
            { x: 0, y: 0 },
            { x: 140, y: 0 },
            { x: 140, y: 210 },
            { x: 0, y: 210 },
          ],
        },
        // 6 interior panes (2 columns x 3 rows)
        { name: 'Pane TL', tag: 'Window', vertices: [{ x: 12, y: 12 }, { x: 62, y: 12 }, { x: 62, y: 66 }, { x: 12, y: 66 }] },
        { name: 'Pane TR', tag: 'Window', vertices: [{ x: 78, y: 12 }, { x: 128, y: 12 }, { x: 128, y: 66 }, { x: 78, y: 66 }] },
        { name: 'Pane ML', tag: 'Window', vertices: [{ x: 12, y: 78 }, { x: 62, y: 78 }, { x: 62, y: 132 }, { x: 12, y: 132 }] },
        { name: 'Pane MR', tag: 'Window', vertices: [{ x: 78, y: 78 }, { x: 128, y: 78 }, { x: 128, y: 132 }, { x: 78, y: 132 }] },
        { name: 'Pane BL', tag: 'Window', vertices: [{ x: 12, y: 144 }, { x: 62, y: 144 }, { x: 62, y: 198 }, { x: 12, y: 198 }] },
        { name: 'Pane BR', tag: 'Window', vertices: [{ x: 78, y: 144 }, { x: 128, y: 144 }, { x: 128, y: 198 }, { x: 78, y: 198 }] },
      ],
    },
    {
      id: 'stamp-palladian-arched',
      name: 'Arched Palladian Window',
      kindId: 'mps.shapeTemplate',
      nominalWidth: 160,
      nominalHeight: 250,
      shapes: [
        {
          name: 'Palladian Lower Body',
          tag: 'Window',
          vertices: [
            { x: 10, y: 90 },
            { x: 150, y: 90 },
            { x: 150, y: 240 },
            { x: 10, y: 240 },
          ],
        },
        {
          name: 'Palladian Arch Fan',
          tag: 'Window',
          vertices: [
            { x: 10, y: 90 },
            { x: 20, y: 55 },
            { x: 45, y: 28 },
            { x: 80, y: 15 },
            { x: 115, y: 28 },
            { x: 140, y: 55 },
            { x: 150, y: 90 },
          ],
        },
      ],
    },
    {
      id: 'stamp-carriage-garage-8panel',
      name: 'Carriage Garage Door 8-Panel',
      kindId: 'mps.shapeTemplate',
      nominalWidth: 280,
      nominalHeight: 180,
      shapes: [
        {
          name: 'Garage Door Outer Frame',
          tag: 'Garage',
          vertices: [
            { x: 0, y: 0 },
            { x: 280, y: 0 },
            { x: 280, y: 180 },
            { x: 0, y: 180 },
          ],
        },
        // 4 upper panels
        { name: 'Panel U1', tag: 'Garage', vertices: [{ x: 15, y: 15 }, { x: 70, y: 15 }, { x: 70, y: 80 }, { x: 15, y: 80 }] },
        { name: 'Panel U2', tag: 'Garage', vertices: [{ x: 82, y: 15 }, { x: 137, y: 15 }, { x: 137, y: 80 }, { x: 82, y: 80 }] },
        { name: 'Panel U3', tag: 'Garage', vertices: [{ x: 143, y: 15 }, { x: 198, y: 15 }, { x: 198, y: 80 }, { x: 143, y: 80 }] },
        { name: 'Panel U4', tag: 'Garage', vertices: [{ x: 210, y: 15 }, { x: 265, y: 15 }, { x: 265, y: 80 }, { x: 210, y: 80 }] },
        // 4 lower panels
        { name: 'Panel L1', tag: 'Garage', vertices: [{ x: 15, y: 95 }, { x: 70, y: 95 }, { x: 70, y: 165 }, { x: 15, y: 165 }] },
        { name: 'Panel L2', tag: 'Garage', vertices: [{ x: 82, y: 95 }, { x: 137, y: 95 }, { x: 137, y: 165 }, { x: 82, y: 165 }] },
        { name: 'Panel L3', tag: 'Garage', vertices: [{ x: 143, y: 95 }, { x: 198, y: 95 }, { x: 198, y: 165 }, { x: 143, y: 165 }] },
        { name: 'Panel L4', tag: 'Garage', vertices: [{ x: 210, y: 95 }, { x: 265, y: 95 }, { x: 265, y: 165 }, { x: 210, y: 165 }] },
      ],
    },
    {
      id: 'stamp-gable-roof-peak',
      name: 'Gable Roof Peak with Eaves',
      kindId: 'mps.shapeTemplate',
      nominalWidth: 320,
      nominalHeight: 140,
      shapes: [
        {
          name: 'Gable Peak Plane',
          tag: 'RoofPlane',
          vertices: [
            { x: 160, y: 10 },
            { x: 310, y: 130 },
            { x: 10, y: 130 },
          ],
        },
        {
          name: 'Eave Fascia Line',
          tag: 'Roofline',
          isOpenPath: true,
          strokeWidthPx: 6,
          vertices: [
            { x: 5, y: 135 },
            { x: 160, y: 8 },
            { x: 315, y: 135 },
          ],
        },
      ],
    },
    {
      id: 'stamp-fluted-porch-pillar',
      name: 'Fluted Porch Pillar',
      kindId: 'mps.shapeTemplate',
      nominalWidth: 70,
      nominalHeight: 260,
      shapes: [
        {
          name: 'Pillar Shaft',
          tag: 'Pillar',
          vertices: [
            { x: 15, y: 25 },
            { x: 55, y: 25 },
            { x: 55, y: 235 },
            { x: 15, y: 235 },
          ],
        },
        {
          name: 'Pillar Capital Cap',
          tag: 'Trim',
          vertices: [
            { x: 8, y: 10 },
            { x: 62, y: 10 },
            { x: 58, y: 25 },
            { x: 12, y: 25 },
          ],
        },
        {
          name: 'Pillar Plinth Base',
          tag: 'Trim',
          vertices: [
            { x: 8, y: 235 },
            { x: 62, y: 235 },
            { x: 65, y: 255 },
            { x: 5, y: 255 },
          ],
        },
      ],
    },
  ];
}

/**
 * Stamps a template at a specific canvas target position (targetX, targetY).
 */
export function stampTemplateAtLocation(
  template: ShapeStampTemplate,
  targetX: number,
  targetY: number,
  scale: number = 1.0
): {
  newLayers: VectorLayer[];
  newMeta: Record<string, ExtendedLayerMetadata>;
} {
  const newLayers: VectorLayer[] = [];
  const newMeta: Record<string, ExtendedLayerMetadata> = {};
  const timestamp = Date.now();

  let parentId: string | null = null;

  template.shapes.forEach((s, idx) => {
    const layerId = `layer-stamp-${timestamp}-${idx}`;
    const scaledVertices = s.vertices.map((v) => ({
      x: targetX + v.x * scale,
      y: targetY + v.y * scale,
    }));

    const bounds = computePolygonBounds(scaledVertices);

    let category: VectorLayer['category'] = 'Windows';
    if (s.tag === 'Roofline') category = 'Roofline';
    else if (s.tag === 'Wall' || s.tag === 'RoofPlane') category = 'Main Walls';
    else if (s.tag === 'Pillar' || s.tag === 'Trim') category = 'Pillars';
    else if (s.tag === 'Garage') category = 'Garage';

    let color = '#38bdf8';
    if (s.tag === 'RoofPlane' || s.tag === 'Roofline') color = '#00f0ff';
    else if (s.tag === 'Wall') color = '#d946ef';
    else if (s.tag === 'Garage') color = '#22c55e';
    else if (s.tag === 'Pillar' || s.tag === 'Trim') color = '#eab308';

    const layer: VectorLayer = {
      id: layerId,
      name: `${s.name}`,
      category,
      visible: true,
      locked: false,
      solo: false,
      role: 'Active Projection Surface',
      color,
      positionX: bounds.centerX,
      positionY: bounds.centerY,
      width: bounds.width,
      height: bounds.height,
      rotation: 0,
      edgeFeathering: 3,
      outlineGlowWidth: 2,
      vertices: scaledVertices,
    };

    // First shape is considered parent if multiple shapes
    if (idx === 0) {
      parentId = layerId;
    }

    const meta: ExtendedLayerMetadata = {
      layerId,
      parentId: idx > 0 ? parentId : null,
      clipChildrenToParent: false,
      holes: s.holes
        ? s.holes.map((h) =>
            h.map((v) => ({ x: targetX + v.x * scale, y: targetY + v.y * scale }))
          )
        : [],
      isOpenPath: !!s.isOpenPath,
      strokeWidthPx: s.strokeWidthPx || 3,
      semanticTag: s.tag,
      baselineVertices: scaledVertices.map((v) => ({ ...v })),
      recalibrationOffset: { ...DEFAULT_RECALIBRATION_OFFSET },
      parametricType: 'polygon',
    };

    newLayers.push(layer);
    newMeta[layerId] = meta;
  });

  return { newLayers, newMeta };
}

// ============================================================================
// 8. GEOMETRY AUTO-CLASSIFIER (ShapeClassifier Heuristics)
// ============================================================================

/**
 * Computes polygon area using the Shoelace formula.
 */
export function computePolygonArea(vertices: VectorVertex[]): number {
  if (vertices.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < vertices.length; i++) {
    const v1 = vertices[i];
    const v2 = vertices[(i + 1) % vertices.length];
    sum += v1.x * v2.y - v2.x * v1.y;
  }
  return Math.abs(sum) / 2;
}

/**
 * Analyzes shapes and suggests semantic tags, human-readable names, confidence, and reasoning.
 * Mirrors the architecture of Marshall's ShapeClassifier.cs.
 */
export function classifyMapShapes(
  layers: VectorLayer[],
  metaMap: Record<string, ExtendedLayerMetadata>
): {
  results: ShapeClassificationResult[];
  summary: string;
} {
  const results: ShapeClassificationResult[] = [];

  // Stage bounds
  const stageArea = DEFAULT_STAGE_WIDTH * DEFAULT_STAGE_HEIGHT;

  // Pre-calculate metrics for every shape
  const metrics = layers.map((l) => {
    const area = computePolygonArea(l.vertices);
    const bounds = computePolygonBounds(l.vertices);
    const boxArea = bounds.width * bounds.height;
    const fill = boxArea > 0 ? area / boxArea : 0;
    const longest = Math.max(bounds.width, bounds.height);
    const shortest = Math.min(bounds.width, bounds.height);
    const aspect = shortest > 0 ? longest / shortest : 0;
    const meta = getLayerExtendedMeta(l, metaMap);

    return {
      layer: l,
      meta,
      area,
      bounds,
      boxArea,
      fill,
      aspect,
    };
  });

  // Sort by area descending so we can test containment against larger shapes
  const sorted = [...metrics].sort((a, b) => b.area - a.area);

  // Keep track of counts for naming ordinals
  const counts: Record<string, number> = {
    RoofPlane: 0,
    Roofline: 0,
    Wall: 0,
    Window: 0,
    Door: 0,
    Garage: 0,
    Pillar: 0,
    Trim: 0,
    Custom: 0,
  };

  for (const m of metrics) {
    const l = m.layer;
    const b = m.bounds;
    const relY = b.centerY / DEFAULT_STAGE_HEIGHT; // 0 = top, 1 = bottom
    const relArea = m.area / stageArea;

    let tag: SemanticShapeTag = 'Custom';
    let group = 'Unsorted';
    let confidence: 'Unsure' | 'Likely' | 'Confident' = 'Unsure';
    let confidencePercent = 50;
    let reason = 'Geometry did not match a strong architectural rule.';
    let enclosedInLayerId: string | undefined;

    // Check if shape is an open path
    if (m.meta.isOpenPath) {
      tag = 'Roofline';
      group = 'Rooflines';
      confidence = 'Confident';
      confidencePercent = 95;
      reason = 'Open unclosed polyline running along eaves or ridges.';
    } else {
      // Check if enclosed in a larger shape
      const container = sorted.find(
        (cand) => cand.layer.id !== l.id && cand.area > m.area * 1.5 && isPolygonInsidePolygon(l.vertices, cand.layer.vertices)
      );

      if (container) {
        enclosedInLayerId = container.layer.id;
        // Enclosed inside container
        const reachesFoot = Math.abs(b.maxY - container.bounds.maxY) < 25;

        if (reachesFoot && b.height > b.width * 1.2) {
          tag = 'Door';
          group = 'Doors';
          confidence = 'Confident';
          confidencePercent = 90;
          reason = `Enclosed in "${container.layer.name}", reaching base foot line (aspect ${m.aspect.toFixed(2)}).`;
        } else if (m.aspect < 3.0) {
          tag = 'Window';
          group = 'Windows';
          confidence = 'Confident';
          confidencePercent = 92;
          reason = `Enclosed in "${container.layer.name}", clear of foot (aspect ${m.aspect.toFixed(2)}).`;
        } else {
          tag = 'Trim';
          group = 'Trim';
          confidence = 'Likely';
          confidencePercent = 75;
          reason = `Enclosed sliver in "${container.layer.name}" (aspect ${m.aspect.toFixed(2)}).`;
        }
      } else if (m.aspect > 4.5) {
        // High aspect ratio sliver
        if (relY < 0.45) {
          tag = 'Roofline';
          group = 'Rooflines';
          confidence = 'Likely';
          confidencePercent = 82;
          reason = `Horizontal sliver high in drawing (aspect ${m.aspect.toFixed(2)}).`;
        } else {
          tag = 'Trim';
          group = 'Trim';
          confidence = 'Likely';
          confidencePercent = 80;
          reason = `Long architectural trim sliver (aspect ${m.aspect.toFixed(2)}).`;
        }
      } else if (b.height > b.width * 2.5 && relY > 0.35 && relY < 0.85) {
        tag = 'Pillar';
        group = 'Pillars';
        confidence = 'Confident';
        confidencePercent = 88;
        reason = `Vertical column aspect (height ${b.height.toFixed(0)}px > 2.5x width).`;
      } else if (relArea > 0.08 && relY < 0.45 && m.fill < 0.75) {
        // High triangular apex roof plane
        tag = 'RoofPlane';
        group = 'Roof';
        confidence = 'Confident';
        confidencePercent = 90;
        reason = `Large plane high in elevation with angled slope (rel area ${(relArea * 100).toFixed(1)}%).`;
      } else if (relArea > 0.08 && relY >= 0.4) {
        if (b.width > 220 && b.height > 100 && relY > 0.55 && b.minX < DEFAULT_STAGE_WIDTH * 0.45) {
          tag = 'Garage';
          group = 'Garage';
          confidence = 'Likely';
          confidencePercent = 85;
          reason = `Broad rectangular zone on lower elevation (aspect ${m.aspect.toFixed(2)}).`;
        } else {
          tag = 'Wall';
          group = 'Walls';
          confidence = 'Confident';
          confidencePercent = 92;
          reason = `Large elevation facade plane (rel area ${(relArea * 100).toFixed(1)}%).`;
        }
      } else if (relArea > 0.03 && relY < 0.4) {
        tag = 'RoofPlane';
        group = 'Roof';
        confidence = 'Likely';
        confidencePercent = 78;
        reason = `Upper facade plane near roofline.`;
      } else if (relY > 0.75 && m.fill < 0.6) {
        tag = 'Bush';
        group = 'Landscaping';
        confidence = 'Likely';
        confidencePercent = 70;
        reason = `Irregular ground-level boundary.`;
      }
    }

    counts[tag] = (counts[tag] || 0) + 1;
    const ordinal = counts[tag];

    // Build proposed name (with ? for Likely, as in Marshall)
    let proposedName = `${tag} ${ordinal}`;
    if (tag === 'Window' && enclosedInLayerId) {
      proposedName = `Window ${ordinal}`;
    }
    if (confidence === 'Likely') {
      proposedName += '?';
    }

    const willChange = l.name.startsWith('Zone') || l.name.startsWith('layer-') || l.name.startsWith('Custom') || l.name.includes('Copy');

    results.push({
      layerId: l.id,
      currentName: l.name,
      proposedName,
      proposedTag: tag,
      proposedGroup: group,
      confidence,
      confidencePercent,
      reason,
      enclosedInLayerId,
      willChange,
    });
  }

  const summaryParts: string[] = [];
  if (counts.RoofPlane) summaryParts.push(`${counts.RoofPlane} Roof`);
  if (counts.Roofline) summaryParts.push(`${counts.Roofline} Roofline`);
  if (counts.Wall) summaryParts.push(`${counts.Wall} Wall`);
  if (counts.Window) summaryParts.push(`${counts.Window} Window`);
  if (counts.Door) summaryParts.push(`${counts.Door} Door`);
  if (counts.Garage) summaryParts.push(`${counts.Garage} Garage`);
  if (counts.Pillar) summaryParts.push(`${counts.Pillar} Pillar`);
  if (counts.Trim) summaryParts.push(`${counts.Trim} Trim`);
  if (counts.Custom) summaryParts.push(`${counts.Custom} Left Alone`);

  const summary = `${layers.length} shapes analyzed: ${summaryParts.join(', ')}`;

  return { results, summary };
}
