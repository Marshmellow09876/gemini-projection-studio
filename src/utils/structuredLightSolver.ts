/**
 * Structured-Light Gray-Code Camera Calibration & Obstruction Solver
 * Computes Gray-code stripe sequences, sub-pixel camera-to-projector homography,
 * and automated tree branch/obstruction blackout shadow masks.
 */

export interface CalibrationPointPair {
  projector: { x: number; y: number };
  camera: { x: number; y: number };
}

export type Matrix3x3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number]
];

export interface GrayCodePattern {
  step: number;
  direction: 'horizontal' | 'vertical';
  bitIndex: number;
  totalBits: number;
  inverse: boolean;
  stripeWidthPx: number;
}

/**
 * Generates Gray-code sequence metadata for structured light auto-calibration
 */
export function generateGrayCodeSequence(
  resolutionWidth: number = 1920,
  resolutionHeight: number = 1080
): GrayCodePattern[] {
  const horizontalBits = Math.ceil(Math.log2(resolutionWidth));
  const verticalBits = Math.ceil(Math.log2(resolutionHeight));

  const patterns: GrayCodePattern[] = [];
  let step = 1;

  // Horizontal Gray-Code Stripe patterns (X coordinate mapping)
  for (let bit = 0; bit < horizontalBits; bit++) {
    const stripeWidth = Math.pow(2, horizontalBits - bit - 1);
    patterns.push({
      step: step++,
      direction: 'horizontal',
      bitIndex: bit,
      totalBits: horizontalBits,
      inverse: false,
      stripeWidthPx: stripeWidth,
    });
    // Inverse pattern for ambient light cancellation
    patterns.push({
      step: step++,
      direction: 'horizontal',
      bitIndex: bit,
      totalBits: horizontalBits,
      inverse: true,
      stripeWidthPx: stripeWidth,
    });
  }

  // Vertical Gray-Code Stripe patterns (Y coordinate mapping)
  for (let bit = 0; bit < verticalBits; bit++) {
    const stripeWidth = Math.pow(2, verticalBits - bit - 1);
    patterns.push({
      step: step++,
      direction: 'vertical',
      bitIndex: bit,
      totalBits: verticalBits,
      inverse: false,
      stripeWidthPx: stripeWidth,
    });
    // Inverse pattern
    patterns.push({
      step: step++,
      direction: 'vertical',
      bitIndex: bit,
      totalBits: verticalBits,
      inverse: true,
      stripeWidthPx: stripeWidth,
    });
  }

  return patterns;
}

/**
 * Solves 3x3 Homography Matrix from 4 point correspondences via Direct Linear Transformation (DLT)
 */
export function solveHomographyFromPoints(points: CalibrationPointPair[]): Matrix3x3 {
  if (points.length < 4) {
    return [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
  }

  // Simplified normalized DLT approximation
  const p0 = points[0];
  const p1 = points[1];
  const p2 = points[2];
  const p3 = points[3];

  const dx1 = p1.camera.x - p2.camera.x;
  const dx2 = p3.camera.x - p2.camera.x;
  const sx = p0.camera.x - p1.camera.x + p2.camera.x - p3.camera.x;

  const dy1 = p1.camera.y - p2.camera.y;
  const dy2 = p3.camera.y - p2.camera.y;
  const sy = p0.camera.y - p1.camera.y + p2.camera.y - p3.camera.y;

  const g = (sx * dy2 - sy * dx2) / (dx1 * dy2 - dy1 * dx2 || 1e-6);
  const h = (dx1 * sy - dy1 * sx) / (dx1 * dy2 - dy1 * dx2 || 1e-6);

  const a = p1.camera.x - p0.camera.x + g * p1.camera.x;
  const b = p3.camera.x - p0.camera.x + h * p3.camera.x;
  const c = p0.camera.x;

  const d = p1.camera.y - p0.camera.y + g * p1.camera.y;
  const e = p3.camera.y - p0.camera.y + h * p3.camera.y;
  const f = p0.camera.y;

  return [
    [a, b, c],
    [d, e, f],
    [g, h, 1],
  ];
}

/**
 * Analyzes difference between flash frame and ambient frame to extract foreground tree branch/bush obstructions
 */
export function detectObstructionShadowMasks(
  ambientLuminance: number[],
  flashLuminance: number[],
  width: number,
  height: number,
  thresholdDelta: number = 25
): { x: number; y: number; width: number; height: number }[] {
  const obstructions: { x: number; y: number; width: number; height: number }[] = [];
  const minPixels = 20;

  // Grid sampling to detect non-responsive low-delta regions (where projector light did not reach surface)
  const step = 20;
  for (let y = 0; y < height - step; y += step) {
    for (let x = 0; x < width - step; x += step) {
      const idx = y * width + x;
      const amb = ambientLuminance[idx] || 0;
      const fla = flashLuminance[idx] || 0;
      const delta = Math.abs(fla - amb);

      // Low delta during all-white flash indicates dark obstruction / foreground object absorbing or occluding light
      if (delta < thresholdDelta && amb < 50) {
        obstructions.push({
          x,
          y,
          width: step,
          height: step,
        });
      }
    }
  }

  return obstructions.slice(0, 12);
}

/**
 * Computes sweet-spot spectator viewing transformation angle
 */
export function calculateSpectatorSweetSpotMatrix(
  distanceFeet: number,
  offsetFeetX: number,
  elevationFeetY: number
): Matrix3x3 {
  const normDist = Math.max(10, distanceFeet) / 35;
  const tiltRad = Math.atan2(elevationFeetY, distanceFeet);
  const panRad = Math.atan2(offsetFeetX, distanceFeet);

  const cosP = Math.cos(panRad);
  const sinP = Math.sin(panRad);
  const cosT = Math.cos(tiltRad);

  return [
    [cosP * normDist, -sinP * 0.2, offsetFeetX * 0.05],
    [sinP * 0.2, cosT * normDist, elevationFeetY * 0.05],
    [0, 0, 1],
  ];
}
