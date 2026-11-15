/**
 * LUMEN-MAP AI v3.5 — Core Mathematical Formulas
 * Section 11A: Dual-Layer Alignment Transformation Equation
 * Section 11B: Multi-Projector S-Curve Edge Blending Shader Formula
 */

export type Matrix3x3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number]
];

export interface TransformParams {
  x: number;
  y: number;
  scaleX: number; // percentage e.g. 100.0
  scaleY: number; // percentage e.g. 100.0
  rotation: number; // degrees
}

export const IDENTITY_MATRIX_3X3: Matrix3x3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

/**
 * Builds a 3x3 homogeneous 2D transformation matrix from translation, scale, and rotation.
 */
export function buildTransformMatrix(params: TransformParams): Matrix3x3 {
  const rad = (params.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const sx = params.scaleX / 100;
  const sy = params.scaleY / 100;

  return [
    [sx * cos, -sy * sin, params.x],
    [sx * sin, sy * cos, params.y],
    [0, 0, 1],
  ];
}

/**
 * Multiplies two 3x3 matrices: C = A * B
 */
export function multiplyMatrices3x3(a: Matrix3x3, b: Matrix3x3): Matrix3x3 {
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

/**
 * Section 11.A: Dual-Layer Alignment Transformation Equation
 * T_final = M_blackout (hadamard) (T_global * T_clip_delta)
 */
export function computeFinalAlignmentMatrix(
  globalParams: TransformParams,
  clipDeltaParams: TransformParams,
  isGlobalSynced: boolean
): Matrix3x3 {
  const tGlobal = buildTransformMatrix(globalParams);
  const tClipDelta = isGlobalSynced
    ? IDENTITY_MATRIX_3X3
    : buildTransformMatrix(clipDeltaParams);
  return multiplyMatrices3x3(tGlobal, tClipDelta);
}

/**
 * Transforms a 2D point (x, y) around a center pivot using a 3x3 matrix.
 */
export function transformPoint2D(
  x: number,
  y: number,
  matrix: Matrix3x3,
  pivotX = 0,
  pivotY = 0
): { x: number; y: number } {
  const dx = x - pivotX;
  const dy = y - pivotY;
  const tx = matrix[0][0] * dx + matrix[0][1] * dy + matrix[0][2] + pivotX;
  const ty = matrix[1][0] * dx + matrix[1][1] * dy + matrix[1][2] + pivotY;
  return { x: tx, y: ty };
}

/**
 * Section 11.B: Multi-Projector S-Curve Edge Blending Shader Formula
 * Computes normalized attenuation factor alpha(d) for d in [0, 1]
 * with steepness p = 2.0 and gamma in [0.5, 3.0] (default 2.2).
 */
export function computeSCurveBlendAlpha(
  d: number,
  gamma = 2.2,
  p = 2.0
): number {
  const clampedD = Math.max(0, Math.min(1, d));
  const safeGamma = Math.max(0.1, gamma);
  let baseValue: number;

  if (clampedD < 0.5) {
    baseValue = 0.5 * Math.pow(2 * clampedD, p);
  } else {
    baseValue = 1 - 0.5 * Math.pow(2 * (1 - clampedD), p);
  }

  return Math.pow(Math.max(0, baseValue), 1 / safeGamma);
}

/**
 * For 2x2 quad arrays, combines horizontal and vertical attenuation:
 * alpha_total(u, v) = alpha_x(d_x) * alpha_y(d_y)
 */
export function computeQuadBlendAlpha(
  dx: number,
  dy: number,
  gamma = 2.2,
  p = 2.0
): number {
  return (
    computeSCurveBlendAlpha(dx, gamma, p) *
    computeSCurveBlendAlpha(dy, gamma, p)
  );
}

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Solves a 2D planar homography mapping 4 source points to 4 destination points
 * and returns a CSS `matrix3d(...)` string (requires `transform-origin: 0 0`).
 */
export function computeCornerPinMatrix3d(
  src: [Point2D, Point2D, Point2D, Point2D],
  dst: [Point2D, Point2D, Point2D, Point2D]
): string {
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const sx = src[i].x;
    const sy = src[i].y;
    const dx = dst[i].x;
    const dy = dst[i].y;
    A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
    b.push(dx);
    A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
    b.push(dy);
  }

  // Gaussian elimination with partial pivoting
  const n = 8;
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(A[row][col]) > Math.abs(A[maxRow][col])) {
        maxRow = row;
      }
    }
    if (Math.abs(A[maxRow][col]) < 1e-10) {
      return '';
    }
    [A[col], A[maxRow]] = [A[maxRow], A[col]];
    [b[col], b[maxRow]] = [b[maxRow], b[col]];

    const pivot = A[col][col];
    for (let j = col; j < n; j++) A[col][j] /= pivot;
    b[col] /= pivot;

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = A[row][col];
      for (let j = col; j < n; j++) {
        A[row][j] -= factor * A[col][j];
      }
      b[row] -= factor * b[col];
    }
  }

  const [a, bCoeff, c, d, e, f, g, h] = b;
  return `matrix3d(${a.toFixed(6)}, ${d.toFixed(6)}, 0, ${g.toFixed(8)}, ${bCoeff.toFixed(6)}, ${e.toFixed(6)}, 0, ${h.toFixed(8)}, 0, 0, 1, 0, ${c.toFixed(3)}, ${f.toFixed(3)}, 0, 1)`;
}

/**
 * Computes a CSS `matrix3d(...)` geometry warp for a specific projector's 4 corner pins
 * relative to its frustumRect, scaled to the output canvas pixel dimensions.
 */
export function computeProjectorCornerPinMatrix3d(
  frustumRect: { x: number; y: number; width: number; height: number },
  cornerPins: [Point2D, Point2D, Point2D, Point2D],
  canvasWidth: number,
  canvasHeight: number
): string {
  if (
    frustumRect.width <= 0 ||
    frustumRect.height <= 0 ||
    canvasWidth <= 0 ||
    canvasHeight <= 0
  ) {
    return '';
  }

  const expected: [Point2D, Point2D, Point2D, Point2D] = [
    { x: frustumRect.x, y: frustumRect.y },
    { x: frustumRect.x + frustumRect.width, y: frustumRect.y },
    { x: frustumRect.x + frustumRect.width, y: frustumRect.y + frustumRect.height },
    { x: frustumRect.x, y: frustumRect.y + frustumRect.height },
  ];

  const isUnwarped = cornerPins.every(
    (p, idx) =>
      Math.abs(p.x - expected[idx].x) < 0.5 &&
      Math.abs(p.y - expected[idx].y) < 0.5
  );
  if (isUnwarped) return '';

  const src: [Point2D, Point2D, Point2D, Point2D] = [
    { x: 0, y: 0 },
    { x: canvasWidth, y: 0 },
    { x: canvasWidth, y: canvasHeight },
    { x: 0, y: canvasHeight },
  ];

  const dst: [Point2D, Point2D, Point2D, Point2D] = [
    {
      x: ((cornerPins[0].x - frustumRect.x) / frustumRect.width) * canvasWidth,
      y: ((cornerPins[0].y - frustumRect.y) / frustumRect.height) * canvasHeight,
    },
    {
      x: ((cornerPins[1].x - frustumRect.x) / frustumRect.width) * canvasWidth,
      y: ((cornerPins[1].y - frustumRect.y) / frustumRect.height) * canvasHeight,
    },
    {
      x: ((cornerPins[2].x - frustumRect.x) / frustumRect.width) * canvasWidth,
      y: ((cornerPins[2].y - frustumRect.y) / frustumRect.height) * canvasHeight,
    },
    {
      x: ((cornerPins[3].x - frustumRect.x) / frustumRect.width) * canvasWidth,
      y: ((cornerPins[3].y - frustumRect.y) / frustumRect.height) * canvasHeight,
    },
  ];

  return computeCornerPinMatrix3d(src, dst);
}
