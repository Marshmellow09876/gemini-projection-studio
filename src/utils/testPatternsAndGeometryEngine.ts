/**
 * testPatternsAndGeometryEngine.ts
 *
 * Gemini Projection Studio — Work Package 4
 * Professional Projector Alignment Test Pattern Generators,
 * Ramer-Douglas-Peucker Polygon Decimator, and Deep Transaction Undo Manager.
 *
 * Core Capabilities:
 * 1. 10 Broadcast-grade Canvas2D Test Patterns:
 *    - Grid (1px crisp lines, mm axis ticks, 4-corner brackets, diagonal guides)
 *    - Crosshairs (sub-pixel reticle, concentric radius rings at 10%, 25%, 50%, 75%, 90%, 100%)
 *    - SMPTE Color Bars (8 standard bars + 11-step grayscale ramp + PLUGE sub-black bars)
 *    - Checkerboard (bit-exact integer alignment, configurable cell size)
 *    - Focus Star (Siemens Star with 72 wedges + concentric distortion rings + 4 corner stars)
 *    - Aspect Test (perfect circles at center & corners, 90%/80% title/action safe, resolution badge)
 *    - ANSI Contrast (4x4 checkerboard with 16 center measurement points for lux ratio testing)
 *    - Grayscale 16-Step (16 linear steps from 0-255 with 8-bit hex codes + smooth continuous ramp)
 *    - Uniform Wash (pure solid color fields for dead-pixel, stuck DLP mirror, & vignette audit)
 *    - UV Gradient (2D coordinate mapping with Red=u, Green=v, contour isolines, corner labels)
 * 2. Ramer-Douglas-Peucker Polygon Simplification:
 *    - Perpendicular distance from vertex to line segment
 *    - Open polyline & closed polygon topology preservation
 *    - Redundant coincident vertex removal (< 1e-6 distance)
 * 3. Deep Undo / Redo Transaction Manager:
 *    - Maximum depth history stack (default 100)
 *    - Instant rollback and replay
 */

// ==========================================
// 1. DATA TYPES & INTERFACES
// ==========================================

export type TestPatternType =
  | 'grid'
  | 'crosshairs'
  | 'smpte_bars'
  | 'checkerboard'
  | 'focus_star'
  | 'aspect_test'
  | 'ansi_contrast'
  | 'grayscale_16'
  | 'uniform_wash'
  | 'uv_gradient';

export interface TestPatternOptions {
  pattern: TestPatternType;
  outputWidth: number;
  outputHeight: number;
  checkerCellPx?: number; // e.g. 16, 32, 64, 128 (default: 64)
  gridSpacingPx?: number; // e.g. 25, 50, 100, 200 (default: 50)
  uniformColor?: string; // e.g. '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#000000'
  showResolutionLabel?: boolean; // default: true
  invert?: boolean; // Invert colors via composite difference
  focusStarWedges?: number; // default: 72 (36 black, 36 white)
}

export interface Point2D {
  x: number;
  y: number;
}

export interface UndoableAction {
  id: string;
  name: string;
  timestamp: number;
  undo: () => void;
  redo: () => void;
}

export interface PatternCatalogItem {
  id: TestPatternType;
  name: string;
  shortName: string;
  category: 'Alignment' | 'Optics & Focus' | 'Color & Gamma' | 'Diagnostics';
  description: string;
  idealFor: string;
}

export const TEST_PATTERN_CATALOG: PatternCatalogItem[] = [
  {
    id: 'grid',
    name: 'Precision Laser Grid',
    shortName: 'Grid',
    category: 'Alignment',
    description: 'Crisp 1px lines at configurable intervals, cyan center cross, millimeter ticks, corner brackets.',
    idealFor: 'Architectural wall alignment, keystone correction, corner-pin calibration.'
  },
  {
    id: 'crosshairs',
    name: 'Center Crosshairs & Circles',
    shortName: 'Crosshairs',
    category: 'Alignment',
    description: 'Full-viewport crosshairs with concentric circles at 10%, 25%, 50%, 75% radius & distance markings.',
    idealFor: 'Center beam aiming, lens shift centering, optical axis verification.'
  },
  {
    id: 'smpte_bars',
    name: 'SMPTE Color Bars & Ramp',
    shortName: 'SMPTE Bars',
    category: 'Color & Gamma',
    description: 'Top 75% holds 8 broadcast color bars; bottom 25% holds 11-step grayscale ramp + PLUGE bars.',
    idealFor: 'Color accuracy, projector saturation, shadow black-level crushing and clipping.'
  },
  {
    id: 'checkerboard',
    name: 'Bit-Exact Checkerboard',
    shortName: 'Checkerboard',
    category: 'Alignment',
    description: 'Mathematically exact alternating black/white integer squares (16px to 128px) with center cross.',
    idealFor: 'Pixel-to-pixel native resolution mapping, chromatic aberration testing.'
  },
  {
    id: 'focus_star',
    name: 'Siemens Focus Star',
    shortName: 'Focus Star',
    category: 'Optics & Focus',
    description: 'High-frequency radial spoke star with 72 wedges, circular rings, plus 4 corner satellite stars.',
    idealFor: 'Manual lens focus tuning, field curvature analysis, astigmatism detection.'
  },
  {
    id: 'aspect_test',
    name: 'Aspect Ratio & Circles',
    shortName: 'Aspect Test',
    category: 'Alignment',
    description: 'Perfect geometric circles at center & corners with resolution badge & broadcast safe margins.',
    idealFor: 'Anamorphic stretch detection, pixel aspect ratio check (16:9 vs 16:10 vs 4:3).'
  },
  {
    id: 'ansi_contrast',
    name: 'ANSI 4×4 Contrast Test',
    shortName: 'ANSI Contrast',
    category: 'Color & Gamma',
    description: 'Standard 16-rectangle checkerboard with crosshairs at center of each box for lux ratio meter readings.',
    idealFor: 'Measuring true ANSI contrast ratio and ambient light reflections.'
  },
  {
    id: 'grayscale_16',
    name: '16-Step Grayscale Stairs',
    shortName: 'Grayscale 16',
    category: 'Color & Gamma',
    description: '16 linear luminance steps (0 to 255) with percentage & hex labels, plus smooth continuous gradient ramp.',
    idealFor: 'Gamma calibration, quantization banding detection, D/A bit depth checks.'
  },
  {
    id: 'uniform_wash',
    name: 'Uniform Color Wash',
    shortName: 'Uniform Wash',
    category: 'Diagnostics',
    description: 'Pure 100% flat solid color fill (Red, Green, Blue, White, or Black) across whole viewport.',
    idealFor: 'Dead pixel inspection, stuck DLP micromirrors, LCD dust blobs, brightness falloff.'
  },
  {
    id: 'uv_gradient',
    name: '2D UV Coordinate Gradient',
    shortName: 'UV Gradient',
    category: 'Diagnostics',
    description: 'Normalized 2D color coordinate field (Red = u, Green = v) with 10% contour isolines & corner coordinates.',
    idealFor: 'Shader texture coordinate mapping, mesh warp debugging, UV normalization.'
  }
];

// ==========================================
// 2. RAMER-DOUGLAS-PEUCKER POLYGON DECIMATION
// ==========================================

/**
 * Computes perpendicular distance from point P to line segment AB.
 * Formula:
 * d = |(y2 - y1)*x0 - (x2 - x1)*y0 + x2*y1 - y2*x1| / sqrt((y2 - y1)^2 + (x2 - x1)^2)
 */
export function perpendicularDistanceToSegment(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;

  // If endpoints A and B coincide, return Euclidean distance from P to A
  if (lenSq < 1e-12) {
    return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
  }

  // Segment distance: clamp projection parameter t to [0, 1] so points beyond segment
  // ends measure distance to nearest endpoint rather than unbounded infinite line.
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.sqrt((p.x - projX) ** 2 + (p.y - projY) ** 2);
}

/**
 * Strips consecutive duplicate / coincident points within epsilon distance.
 */
export function removeCoincidentVertices(points: Point2D[], eps: number = 1e-6): Point2D[] {
  if (points.length <= 1) return [...points];
  const cleaned: Point2D[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = cleaned[cleaned.length - 1];
    const curr = points[i];
    const distSq = (curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2;
    if (distSq > eps * eps) {
      cleaned.push(curr);
    }
  }
  return cleaned;
}

/**
 * Recursive Ramer-Douglas-Peucker core decimation on an open polyline.
 */
function rdpOpenPolyline(points: Point2D[], tolerance: number): Point2D[] {
  if (points.length <= 2) return points;

  const first = points[0];
  const last = points[points.length - 1];
  let maxDistance = 0;
  let index = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistanceToSegment(points[i], first, last);
    if (dist > maxDistance) {
      maxDistance = dist;
      index = i;
    }
  }

  if (maxDistance > tolerance) {
    const leftSlice = rdpOpenPolyline(points.slice(0, index + 1), tolerance);
    const rightSlice = rdpOpenPolyline(points.slice(index), tolerance);
    return leftSlice.slice(0, -1).concat(rightSlice);
  } else {
    return [first, last];
  }
}

/**
 * Simplifies a 2D polyline or polygon using the classic Ramer-Douglas-Peucker algorithm.
 *
 * @param points Array of 2D points to decimate
 * @param tolerancePx Maximum allowable perpendicular deviation in pixels (e.g. 0.5 to 5.0)
 * @param isClosed Whether the polygon is a closed loop (true preserves loop topology)
 * @returns Decimated array of points
 */
export function simplifyPolygonRamerDouglasPeucker(
  points: Point2D[],
  tolerancePx: number,
  isClosed: boolean = true
): Point2D[] {
  if (!points || points.length <= 2) return points ? [...points] : [];
  const safeTolerance = Math.max(0.01, tolerancePx);

  // 1. Clean coincident vertices
  let cleaned = removeCoincidentVertices(points);
  if (cleaned.length <= 2) return cleaned;

  // 2. Open polyline simplification
  if (!isClosed) {
    return rdpOpenPolyline(cleaned, safeTolerance);
  }

  // 3. Closed polygon simplification
  // If the last point matches the first point, strip it temporarily for processing
  const lastIdx = cleaned.length - 1;
  const isLoopClosed =
    Math.hypot(cleaned[0].x - cleaned[lastIdx].x, cleaned[0].y - cleaned[lastIdx].y) < 1e-6;
  if (isLoopClosed) {
    cleaned = cleaned.slice(0, -1);
  }

  if (cleaned.length <= 3) {
    return isLoopClosed ? [...cleaned, { ...cleaned[0] }] : cleaned;
  }

  // In a closed polygon, picking an arbitrary start/end chord can collapse the loop.
  // We locate the point furthest from point 0 (the polygon's approximate diameter anchor),
  // split the loop into two open chains (0 -> k and k -> 0), simplify both, and stitch.
  let maxDist = -1;
  let splitIndex = Math.floor(cleaned.length / 2);

  for (let i = 1; i < cleaned.length; i++) {
    const d = Math.hypot(cleaned[i].x - cleaned[0].x, cleaned[i].y - cleaned[0].y);
    if (d > maxDist) {
      maxDist = d;
      splitIndex = i;
    }
  }

  const chainA = cleaned.slice(0, splitIndex + 1);
  const chainB = cleaned.slice(splitIndex).concat([cleaned[0]]);

  const simplifiedA = rdpOpenPolyline(chainA, safeTolerance);
  const simplifiedB = rdpOpenPolyline(chainB, safeTolerance);

  // Combine results (avoid duplicate vertices at splitIndex and 0)
  const merged = simplifiedA.slice(0, -1).concat(simplifiedB.slice(0, -1));

  // Closed polygons must have at least 3 vertices to maintain surface area
  if (merged.length < 3) {
    // Fall back to original triangle vertices if decimated too far
    return [cleaned[0], cleaned[splitIndex], cleaned[Math.floor(cleaned.length * 0.75)]];
  }

  return merged;
}

/**
 * Calculates the total perimeter of a polygon.
 */
export function computePolygonPerimeter(points: Point2D[], isClosed: boolean = true): number {
  if (points.length < 2) return 0;
  let perimeter = 0;
  for (let i = 0; i < points.length - 1; i++) {
    perimeter += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
  }
  if (isClosed && points.length >= 3) {
    perimeter += Math.hypot(
      points[0].x - points[points.length - 1].x,
      points[0].y - points[points.length - 1].y
    );
  }
  return perimeter;
}

/**
 * Computes polygon area using the Shoelace formula (Gauss's area formula).
 */
export function computePolygonArea(points: Point2D[]): number {
  if (points.length < 3) return 0;
  let area = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    area += (points[j].x + points[i].x) * (points[j].y - points[i].y);
  }
  return Math.abs(area / 2);
}

/**
 * Calculates vertex reduction count and percentage.
 */
export function calculateVertexReduction(
  originalCount: number,
  simplifiedCount: number
): { reducedCount: number; reductionPercent: number } {
  const diff = originalCount - simplifiedCount;
  const pct = originalCount > 0 ? (diff / originalCount) * 100 : 0;
  return {
    reducedCount: Math.max(0, diff),
    reductionPercent: Math.max(0, Math.min(100, Math.round(pct * 10) / 10))
  };
}

// ==========================================
// 3. DEEP UNDO / REDO TRANSACTION MANAGER
// ==========================================

export class DeepUndoManager {
  private undoStack: UndoableAction[] = [];
  private redoStack: UndoableAction[] = [];
  private maxDepth: number;

  constructor(maxDepth: number = 100) {
    this.maxDepth = maxDepth;
  }

  /**
   * Pushes a new undoable action to the stack and clears the redo stack.
   */
  push(action: UndoableAction): void {
    this.undoStack.push(action);
    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  /**
   * Undoes the most recent action.
   */
  undo(): UndoableAction | null {
    const action = this.undoStack.pop();
    if (!action) return null;
    action.undo();
    this.redoStack.push(action);
    return action;
  }

  /**
   * Redoes the most recently undone action.
   */
  redo(): UndoableAction | null {
    const action = this.redoStack.pop();
    if (!action) return null;
    action.redo();
    this.undoStack.push(action);
    return action;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getUndoHistory(): UndoableAction[] {
    return [...this.undoStack];
  }

  getRedoHistory(): UndoableAction[] {
    return [...this.redoStack];
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}

export const globalUndoManager = new DeepUndoManager(100);

// ==========================================
// 4. TEST PATTERN RENDER FUNCTIONS
// ==========================================

export function getCommonAspectLabel(w: number, h: number): string {
  const ratio = w / h;
  if (Math.abs(ratio - 16 / 9) < 0.03) return '16:9 HD';
  if (Math.abs(ratio - 16 / 10) < 0.03) return '16:10 WUXGA';
  if (Math.abs(ratio - 4 / 3) < 0.03) return '4:3 Standard';
  if (Math.abs(ratio - 21 / 9) < 0.05) return '21:9 UltraWide';
  if (Math.abs(ratio - 2750 / 1536) < 0.03) return 'Runway Native';
  return `${ratio.toFixed(2)}:1`;
}

/**
 * Main dispatcher to render any of the 10 calibration test patterns onto an HTML Canvas.
 */
export function renderTestPatternToCanvas(
  canvas: HTMLCanvasElement,
  options: TestPatternOptions
): void {
  const { outputWidth: w, outputHeight: h } = options;
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  switch (options.pattern) {
    case 'grid':
      renderGridPattern(ctx, options);
      break;
    case 'crosshairs':
      renderCrosshairsPattern(ctx, options);
      break;
    case 'smpte_bars':
      renderSmpteBarsPattern(ctx, options);
      break;
    case 'checkerboard':
      renderCheckerboardPattern(ctx, options);
      break;
    case 'focus_star':
      renderFocusStarPattern(ctx, options);
      break;
    case 'aspect_test':
      renderAspectTestPattern(ctx, options);
      break;
    case 'ansi_contrast':
      renderAnsiContrastPattern(ctx, options);
      break;
    case 'grayscale_16':
      renderGrayscale16Pattern(ctx, options);
      break;
    case 'uniform_wash':
      renderUniformWashPattern(ctx, options);
      break;
    case 'uv_gradient':
      renderUvGradientPattern(ctx, options);
      break;
    default:
      renderGridPattern(ctx, options);
      break;
  }

  // Optional Sleek HUD Resolution & Pattern Badge
  if (options.showResolutionLabel !== false && options.pattern !== 'uniform_wash') {
    renderHudOverlay(ctx, options);
  }

  // Inversion filter if requested
  if (options.invert) {
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  ctx.restore();
}

/**
 * 1. Precision Grid Pattern
 */
function renderGridPattern(ctx: CanvasRenderingContext2D, options: TestPatternOptions): void {
  const { outputWidth: w, outputHeight: h } = options;
  const spacing = options.gridSpacingPx || 50;

  // Background
  ctx.fillStyle = '#060a12';
  ctx.fillRect(0, 0, w, h);

  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);

  // Diagonal corner guides (dashed cyan)
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.22)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.moveTo(0, 0);
  ctx.lineTo(w, h);
  ctx.moveTo(w, 0);
  ctx.lineTo(0, h);
  ctx.stroke();
  ctx.setLineDash([]);

  // Minor & Major Grid Lines
  ctx.lineWidth = 1;
  // Vertical lines radiating from center
  for (let x = cx % spacing; x < w; x += spacing) {
    const isMajor = Math.round(Math.abs(x - cx)) % (spacing * 5) === 0;
    ctx.beginPath();
    ctx.strokeStyle = isMajor ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.12)';
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
    ctx.stroke();
  }

  // Horizontal lines radiating from center
  for (let y = cy % spacing; y < h; y += spacing) {
    const isMajor = Math.round(Math.abs(y - cy)) % (spacing * 5) === 0;
    ctx.beginPath();
    ctx.strokeStyle = isMajor ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.12)';
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();
  }

  // Center axes in Cyan (#00f0ff) 2px
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#00f0ff';

  // Horizontal center axis
  ctx.beginPath();
  ctx.moveTo(0, cy + 0.5);
  ctx.lineTo(w, cy + 0.5);
  ctx.stroke();

  // Vertical center axis
  ctx.beginPath();
  ctx.moveTo(cx + 0.5, 0);
  ctx.lineTo(cx + 0.5, h);
  ctx.stroke();

  // Millimeter Ticks along center horizontal axis
  ctx.fillStyle = '#00f0ff';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  for (let x = cx % 10; x < w; x += 10) {
    const isGrid = Math.round(Math.abs(x - cx)) % spacing === 0;
    const tickLen = isGrid ? 10 : 4;
    ctx.beginPath();
    ctx.strokeStyle = isGrid ? '#00f0ff' : 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.moveTo(x + 0.5, cy - tickLen);
    ctx.lineTo(x + 0.5, cy + tickLen);
    ctx.stroke();

    if (isGrid && Math.abs(x - cx) > 10) {
      const dist = Math.round(x - cx);
      ctx.fillText(`${dist > 0 ? '+' : ''}${dist}`, x, cy + 12);
    }
  }

  // Millimeter Ticks along center vertical axis
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let y = cy % 10; y < h; y += 10) {
    const isGrid = Math.round(Math.abs(y - cy)) % spacing === 0;
    const tickLen = isGrid ? 10 : 4;
    ctx.beginPath();
    ctx.strokeStyle = isGrid ? '#00f0ff' : 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.moveTo(cx - tickLen, y + 0.5);
    ctx.lineTo(cx + tickLen, y + 0.5);
    ctx.stroke();

    if (isGrid && Math.abs(y - cy) > 10) {
      const dist = Math.round(y - cy);
      ctx.fillText(`${dist > 0 ? '+' : ''}${dist}`, cx + 12, y);
    }
  }

  // 4 Corner Alignment Brackets (Neon Emerald #10b981)
  const bracketSize = 40;
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2.5;

  // Top Left
  ctx.beginPath();
  ctx.moveTo(2, bracketSize);
  ctx.lineTo(2, 2);
  ctx.lineTo(bracketSize, 2);
  ctx.stroke();

  // Top Right
  ctx.beginPath();
  ctx.moveTo(w - bracketSize, 2);
  ctx.lineTo(w - 2, 2);
  ctx.lineTo(w - 2, bracketSize);
  ctx.stroke();

  // Bottom Left
  ctx.beginPath();
  ctx.moveTo(2, h - bracketSize);
  ctx.lineTo(2, h - 2);
  ctx.lineTo(bracketSize, h - 2);
  ctx.stroke();

  // Bottom Right
  ctx.beginPath();
  ctx.moveTo(w - bracketSize, h - 2);
  ctx.lineTo(w - 2, h - 2);
  ctx.lineTo(w - 2, h - bracketSize);
  ctx.stroke();
}

/**
 * 2. Crosshairs & Concentric Circles Pattern
 */
function renderCrosshairsPattern(ctx: CanvasRenderingContext2D, options: TestPatternOptions): void {
  const { outputWidth: w, outputHeight: h } = options;
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.min(w, h) / 2;

  // Background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);

  // Concentric circle radii percentages
  const percentages = [0.1, 0.25, 0.5, 0.75, 0.9, 1.0];
  ctx.lineWidth = 1;

  percentages.forEach((pct) => {
    const r = maxR * pct;
    ctx.beginPath();
    ctx.strokeStyle = pct === 1.0 ? '#00f0ff' : 'rgba(0, 240, 255, 0.65)';
    if (pct === 0.9) {
      ctx.setLineDash([6, 4]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Percentage Label
    ctx.fillStyle = 'rgba(0, 240, 255, 0.85)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${Math.round(pct * 100)}% (${Math.round(r)}px)`, cx + 6, cy - r + 12);
  });

  // 45-degree diagonal rays
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.setLineDash([3, 5]);
  const diagLen = Math.hypot(w, h) / 2;
  const cos45 = Math.SQRT1_2;
  ctx.moveTo(cx - diagLen * cos45, cy - diagLen * cos45);
  ctx.lineTo(cx + diagLen * cos45, cy + diagLen * cos45);
  ctx.moveTo(cx - diagLen * cos45, cy + diagLen * cos45);
  ctx.lineTo(cx + diagLen * cos45, cy - diagLen * cos45);
  ctx.stroke();
  ctx.setLineDash([]);

  // Full-width & Full-height 1px crosshair
  ctx.beginPath();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1;
  ctx.moveTo(0, cy + 0.5);
  ctx.lineTo(w, cy + 0.5);
  ctx.moveTo(cx + 0.5, 0);
  ctx.lineTo(cx + 0.5, h);
  ctx.stroke();

  // Tick marks along horizontal axis radiating from center
  ctx.strokeStyle = '#00f0ff';
  ctx.fillStyle = '#00f0ff';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';

  for (let offset = 20; offset < w / 2; offset += 20) {
    const isMajor = offset % 100 === 0;
    const tick = isMajor ? 8 : 3;

    // Right
    ctx.beginPath();
    ctx.moveTo(cx + offset + 0.5, cy - tick);
    ctx.lineTo(cx + offset + 0.5, cy + tick);
    ctx.stroke();
    if (isMajor) ctx.fillText(`${offset}`, cx + offset, cy + 18);

    // Left
    ctx.beginPath();
    ctx.moveTo(cx - offset + 0.5, cy - tick);
    ctx.lineTo(cx - offset + 0.5, cy + tick);
    ctx.stroke();
    if (isMajor) ctx.fillText(`-${offset}`, cx - offset, cy + 18);
  }

  // Tick marks along vertical axis radiating from center
  ctx.textAlign = 'left';
  for (let offset = 20; offset < h / 2; offset += 20) {
    const isMajor = offset % 100 === 0;
    const tick = isMajor ? 8 : 3;

    // Down
    ctx.beginPath();
    ctx.moveTo(cx - tick, cy + offset + 0.5);
    ctx.lineTo(cx + tick, cy + offset + 0.5);
    ctx.stroke();
    if (isMajor) ctx.fillText(`${offset}`, cx + 12, cy + offset + 3);

    // Up
    ctx.beginPath();
    ctx.moveTo(cx - tick, cy - offset + 0.5);
    ctx.lineTo(cx + tick, cy - offset + 0.5);
    ctx.stroke();
    if (isMajor) ctx.fillText(`-${offset}`, cx + 12, cy - offset + 3);
  }

  // Center Reticle with 3px amber center point
  ctx.beginPath();
  ctx.fillStyle = '#fbbf24';
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1.5;
  ctx.arc(cx, cy, 14, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * 3. SMPTE Color Bars & 11-Step Grayscale Ramp + PLUGE
 */
function renderSmpteBarsPattern(ctx: CanvasRenderingContext2D, options: TestPatternOptions): void {
  const { outputWidth: w, outputHeight: h } = options;
  const topH = Math.round(h * 0.75);
  const botH = h - topH;

  // 8 Broadcast SMPTE color bars (Top 75%)
  const smpteColors = [
    { name: 'White', color: '#FFFFFF' },
    { name: 'Yellow', color: '#FFFF00' },
    { name: 'Cyan', color: '#00FFFF' },
    { name: 'Green', color: '#00FF00' },
    { name: 'Magenta', color: '#FF00FF' },
    { name: 'Red', color: '#FF0000' },
    { name: 'Blue', color: '#0000FF' },
    { name: 'Black', color: '#000000' }
  ];

  const barW = w / 8;
  smpteColors.forEach((bar, idx) => {
    ctx.fillStyle = bar.color;
    ctx.fillRect(idx * barW, 0, barW + 1, topH);

    // Label on bar
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = ['White', 'Yellow', 'Cyan', 'Green'].includes(bar.name) ? '#000000' : '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(bar.name.toUpperCase(), idx * barW + barW / 2, 28);
  });

  // Bottom 25%: 11-step linear luminance ramp (0% to 100%)
  const steps = 11;
  const stepW = w / steps;

  for (let i = 0; i < steps; i++) {
    const lum = Math.round((i / (steps - 1)) * 255);
    const pct = Math.round((i / (steps - 1)) * 100);
    ctx.fillStyle = `rgb(${lum}, ${lum}, ${lum})`;
    ctx.fillRect(i * stepW, topH, stepW + 1, botH);

    // Label
    ctx.font = '11px monospace';
    ctx.fillStyle = lum > 128 ? '#000000' : '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(`${pct}%`, i * stepW + stepW / 2, topH + botH / 2 - 4);
    ctx.fillText(`Y:${lum}`, i * stepW + stepW / 2, topH + botH / 2 + 12);
  }

  // PLUGE (Picture Line-Up Generation Equipment) test bars on 0% black step
  // Standard -2% (crushed), 0% (reference), +2% (just above black), +4%
  const plugeW = stepW / 4;
  const plugeH = botH * 0.4;
  const plugeY = topH + botH * 0.55;

  // -2% Sub-black
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, plugeY, plugeW, plugeH);
  // Reference Black
  ctx.fillStyle = 'rgb(3, 3, 3)';
  ctx.fillRect(plugeW, plugeY, plugeW, plugeH);
  // +2% Black
  ctx.fillStyle = 'rgb(7, 7, 7)';
  ctx.fillRect(plugeW * 2, plugeY, plugeW, plugeH);
  // +4% Black
  ctx.fillStyle = 'rgb(14, 14, 14)';
  ctx.fillRect(plugeW * 3, plugeY, plugeW, plugeH);

  // Border between top & bottom sections
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, topH);
  ctx.lineTo(w, topH);
  ctx.stroke();
}

/**
 * 4. Bit-Exact Integer Checkerboard
 */
function renderCheckerboardPattern(ctx: CanvasRenderingContext2D, options: TestPatternOptions): void {
  const { outputWidth: w, outputHeight: h } = options;
  const cell = Math.max(8, options.checkerCellPx || 64);

  const cols = Math.ceil(w / cell);
  const rows = Math.ceil(h / cell);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#000000' : '#FFFFFF';
      ctx.fillRect(c * cell, r * cell, cell, cell);
    }
  }

  // High-contrast center target
  const cx = w / 2;
  const cy = h / 2;
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 30, cy);
  ctx.lineTo(cx + 30, cy);
  ctx.moveTo(cx, cy - 30);
  ctx.lineTo(cx, cy + 30);
  ctx.stroke();

  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 20, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * 5. Siemens Focus Star & Distortion Rings
 */
function renderFocusStarPattern(ctx: CanvasRenderingContext2D, options: TestPatternOptions): void {
  const { outputWidth: w, outputHeight: h } = options;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.44;
  const wedges = options.focusStarWedges || 72;

  // Background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);

  // Siemens Star wedges
  const angleStep = (Math.PI * 2) / wedges;
  for (let i = 0; i < wedges; i++) {
    if (i % 2 === 0) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, i * angleStep, (i + 1) * angleStep);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Concentric optical calibration rings
  const ringSteps = [0.2, 0.4, 0.6, 0.8, 1.0];
  ctx.lineWidth = 2;
  ringSteps.forEach((pct) => {
    ctx.strokeStyle = pct === 1.0 ? '#00f0ff' : 'rgba(245, 158, 11, 0.9)';
    ctx.beginPath();
    ctx.arc(cx, cy, r * pct, 0, Math.PI * 2);
    ctx.stroke();
  });

  // 4 Corner Satellite Siemens Stars (Field Curvature testing)
  const cornerR = r * 0.22;
  const corners = [
    { x: w * 0.1, y: h * 0.12 },
    { x: w * 0.9, y: h * 0.12 },
    { x: w * 0.1, y: h * 0.88 },
    { x: w * 0.9, y: h * 0.88 }
  ];

  corners.forEach((pt) => {
    // Mini Siemens star (36 wedges)
    const miniWedges = 36;
    const miniAngle = (Math.PI * 2) / miniWedges;
    for (let i = 0; i < miniWedges; i++) {
      if (i % 2 === 0) {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.arc(pt.x, pt.y, cornerR, i * miniAngle, (i + 1) * miniAngle);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, cornerR, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Center optical pinhole
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * 6. Aspect Ratio & Geometric Circles Test
 */
function renderAspectTestPattern(ctx: CanvasRenderingContext2D, options: TestPatternOptions): void {
  const { outputWidth: w, outputHeight: h } = options;
  const cx = w / 2;
  const cy = h / 2;

  // Background
  ctx.fillStyle = '#070c16';
  ctx.fillRect(0, 0, w, h);

  // Broadcast Safe Margins (90% Action Safe, 80% Title Safe)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);

  // 90% Action Safe
  ctx.strokeRect(w * 0.05, h * 0.05, w * 0.9, h * 0.9);
  // 80% Title Safe
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
  ctx.strokeRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);
  ctx.setLineDash([]);

  // Center Circle
  const centerR = Math.min(w, h) * 0.35;
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, centerR, 0, Math.PI * 2);
  ctx.stroke();

  // Inscribed square inside center circle
  const squareHalf = centerR * Math.SQRT1_2;
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx - squareHalf, cy - squareHalf, squareHalf * 2, squareHalf * 2);

  // Inner concentric circles
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.beginPath();
  ctx.arc(cx, cy, centerR * 0.66, 0, Math.PI * 2);
  ctx.arc(cx, cy, centerR * 0.33, 0, Math.PI * 2);
  ctx.stroke();

  // 4 Corner Perfect Circles
  const cornerR = Math.min(w, h) * 0.12;
  const cornerPad = cornerR + 25;
  const cornerCenters = [
    { x: cornerPad, y: cornerPad },
    { x: w - cornerPad, y: cornerPad },
    { x: cornerPad, y: h - cornerPad },
    { x: w - cornerPad, y: h - cornerPad }
  ];

  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2;
  cornerCenters.forEach((pt) => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, cornerR, 0, Math.PI * 2);
    ctx.stroke();

    // Cross in corner circle
    ctx.beginPath();
    ctx.moveTo(pt.x - 10, pt.y);
    ctx.lineTo(pt.x + 10, pt.y);
    ctx.moveTo(pt.x, pt.y - 10);
    ctx.lineTo(pt.x, pt.y + 10);
    ctx.stroke();
  });

  // Prominent Center Aspect & Resolution Badge
  const badgeW = 280;
  const badgeH = 80;
  ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;

  roundRect(ctx, cx - badgeW / 2, cy - badgeH / 2, badgeW, badgeH, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${w} × ${h}`, cx, cy - 8);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '12px monospace';
  const aspectLabel = getCommonAspectLabel(w, h);
  ctx.fillText(`ASPECT: ${(w / h).toFixed(3)}:1 (${aspectLabel})`, cx, cy + 18);
}

/**
 * 7. ANSI Standard 4x4 Contrast Test
 */
function renderAnsiContrastPattern(ctx: CanvasRenderingContext2D, options: TestPatternOptions): void {
  const { outputWidth: w, outputHeight: h } = options;
  const boxW = w / 4;
  const boxH = h / 4;

  let pointCounter = 1;

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const isWhite = (r + c) % 2 === 1;
      const x = c * boxW;
      const y = r * boxH;

      ctx.fillStyle = isWhite ? '#FFFFFF' : '#000000';
      ctx.fillRect(x, y, boxW + 1, boxH + 1);

      // Center measurement point crosshairs
      const mx = x + boxW / 2;
      const my = y + boxH / 2;
      const targetColor = isWhite ? '#000000' : '#FFFFFF';

      ctx.strokeStyle = targetColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(mx - 15, my);
      ctx.lineTo(mx + 15, my);
      ctx.moveTo(mx, my - 15);
      ctx.lineTo(mx, my + 15);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(mx, my, 8, 0, Math.PI * 2);
      ctx.stroke();

      // Measurement point index badge
      ctx.fillStyle = targetColor;
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`P${pointCounter}`, mx, my - 16);
      ctx.font = '9px monospace';
      ctx.fillText(isWhite ? 'WHITE LUX' : 'BLACK LUX', mx, my + 26);

      pointCounter++;
    }
  }

  // Clean boundary borders
  ctx.strokeStyle = 'rgba(120, 120, 120, 0.5)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(i * boxW, 0);
    ctx.lineTo(i * boxW, h);
    ctx.moveTo(0, i * boxH);
    ctx.lineTo(w, i * boxH);
    ctx.stroke();
  }
}

/**
 * 8. Grayscale 16-Step Stairs & Continuous Gradient
 */
function renderGrayscale16Pattern(ctx: CanvasRenderingContext2D, options: TestPatternOptions): void {
  const { outputWidth: w, outputHeight: h } = options;
  const steps = 16;
  const stepW = w / steps;
  const topH = Math.round(h * 0.72);
  const botH = h - topH;

  // 16 Discrete Luminance Bars
  for (let i = 0; i < steps; i++) {
    const val = Math.round((i / (steps - 1)) * 255);
    const pct = ((i / (steps - 1)) * 100).toFixed(1);
    const hex = val.toString(16).padStart(2, '0').toUpperCase();

    ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
    ctx.fillRect(i * stepW, 0, stepW + 1, topH);

    // Labels
    ctx.fillStyle = val > 128 ? '#000000' : '#FFFFFF';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`#${i + 1}`, i * stepW + stepW / 2, 25);
    ctx.font = '10px monospace';
    ctx.fillText(`${pct}%`, i * stepW + stepW / 2, topH / 2 - 8);
    ctx.fillText(`0x${hex}`, i * stepW + stepW / 2, topH / 2 + 8);
    ctx.fillText(`Y:${val}`, i * stepW + stepW / 2, topH - 16);
  }

  // Bottom Continuous Smooth Linear Gradient
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, '#000000');
  grad.addColorStop(1, '#FFFFFF');

  ctx.fillStyle = grad;
  ctx.fillRect(0, topH, w, botH);

  // Gradient label & border
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, topH);
  ctx.lineTo(w, topH);
  ctx.stroke();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(w / 2 - 140, topH + 8, 280, 24);
  ctx.fillStyle = '#00f0ff';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('CONTINUOUS LINEAR GAMMA RAMP (BANDING AUDIT)', w / 2, topH + 24);
}

/**
 * 9. Uniform Color Wash (Dead Pixel, DLP Micromirror & Vignette Inspection)
 */
function renderUniformWashPattern(ctx: CanvasRenderingContext2D, options: TestPatternOptions): void {
  const { outputWidth: w, outputHeight: h } = options;
  const color = options.uniformColor || '#FFFFFF';

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);

  // Subtle non-intrusive metadata in bottom-right corner
  ctx.save();
  ctx.fillStyle = color.toLowerCase() === '#ffffff' ? '#000000' : '#FFFFFF';
  ctx.font = '11px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`UNIFORM FIELD: ${color.toUpperCase()} | 100% PURITY`, w - 16, h - 16);
  ctx.restore();
}

/**
 * 10. UV Coordinate Gradient (u in Red, v in Green)
 */
function renderUvGradientPattern(ctx: CanvasRenderingContext2D, options: TestPatternOptions): void {
  const { outputWidth: w, outputHeight: h } = options;

  // 1. Horizontal Red Gradient: u from 0 to 1
  const redGrad = ctx.createLinearGradient(0, 0, w, 0);
  redGrad.addColorStop(0, 'rgb(0, 0, 0)');
  redGrad.addColorStop(1, 'rgb(255, 0, 0)');
  ctx.fillStyle = redGrad;
  ctx.fillRect(0, 0, w, h);

  // 2. Vertical Green Gradient: v from 0 to 1 with 'lighter' blend mode
  ctx.globalCompositeOperation = 'lighter';
  const greenGrad = ctx.createLinearGradient(0, 0, 0, h);
  greenGrad.addColorStop(0, 'rgb(0, 0, 0)');
  greenGrad.addColorStop(1, 'rgb(0, 255, 0)');
  ctx.fillStyle = greenGrad;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';

  // 3. Crisp 10% Contour Isolines
  ctx.lineWidth = 1;
  ctx.font = '10px monospace';

  // Vertical isolines (U)
  for (let u = 0.1; u < 1.0; u += 0.1) {
    const x = Math.round(u * w);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(`u=${u.toFixed(1)}`, x, 18);
  }

  // Horizontal isolines (V)
  for (let v = 0.1; v < 1.0; v += 0.1) {
    const y = Math.round(v * h);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText(`v=${v.toFixed(1)}`, 10, y - 4);
  }

  // 4 Corner UV Badges
  const uvBadges = [
    { text: 'UV(0.0, 0.0)', x: 12, y: 35, align: 'left' },
    { text: 'UV(1.0, 0.0)', x: w - 12, y: 35, align: 'right' },
    { text: 'UV(0.0, 1.0)', x: 12, y: h - 14, align: 'left' },
    { text: 'UV(1.0, 1.0)', x: w - 12, y: h - 14, align: 'right' },
    { text: 'UV(0.5, 0.5)', x: w / 2, y: h / 2 - 8, align: 'center' }
  ];

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px monospace';
  uvBadges.forEach((b) => {
    ctx.textAlign = b.align as CanvasTextAlign;
    ctx.fillText(b.text, b.x, b.y);
  });
}

/**
 * Renders a bottom HUD badge with pattern information and resolution.
 */
function renderHudOverlay(ctx: CanvasRenderingContext2D, options: TestPatternOptions): void {
  const { outputWidth: w, outputHeight: h, pattern } = options;
  const item = TEST_PATTERN_CATALOG.find((p) => p.id === pattern);
  const patternName = item ? item.name.toUpperCase() : pattern.toUpperCase();

  const labelText = `${patternName}  |  ${w}×${h}  |  ${getCommonAspectLabel(w, h)}  |  NATIVE 1:1`;
  ctx.font = '11px monospace';
  const textW = ctx.measureText(labelText).width;
  const pillW = textW + 36;
  const pillH = 28;
  const pillX = w - pillW - 16;
  const pillY = h - pillH - 16;

  ctx.fillStyle = 'rgba(10, 15, 26, 0.88)';
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
  ctx.lineWidth = 1;

  roundRect(ctx, pillX, pillY, pillW, pillH, 6);
  ctx.fill();
  ctx.stroke();

  // Cyan glowing indicator dot
  ctx.fillStyle = '#00f0ff';
  ctx.beginPath();
  ctx.arc(pillX + 14, pillY + pillH / 2, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#e2e8f0';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(labelText, pillX + 24, pillY + pillH / 2 + 1);
}

/**
 * Helper to draw a rounded rectangle.
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Downloads the current canvas content as a high-resolution PNG image.
 */
export function downloadCanvasAsPng(canvas: HTMLCanvasElement, filename?: string): void {
  const name = filename || `test-pattern-${canvas.width}x${canvas.height}.png`;
  const url = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = name;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
