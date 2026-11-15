import test from 'node:test';
import assert from 'node:assert/strict';
import {
  IDENTITY_MATRIX_3X3,
  buildTransformMatrix,
  multiplyMatrices3x3,
  computeFinalAlignmentMatrix,
  transformPoint2D,
  computeSCurveBlendAlpha,
  computeProjectorCornerPinMatrix3d,
} from '../src/utils/projectionMath.ts';

test('buildTransformMatrix produces identity for default 100% scale, 0 offset, 0 rotation', () => {
  const m = buildTransformMatrix({ x: 0, y: 0, scaleX: 100, scaleY: 100, rotation: 0 });
  assert.deepEqual(
    m.map((row) => row.map((v) => (Object.is(v, -0) ? 0 : v))),
    IDENTITY_MATRIX_3X3
  );
});

test('transformPoint2D applies translation and scaling accurately', () => {
  const m = buildTransformMatrix({ x: 25, y: -10, scaleX: 200, scaleY: 100, rotation: 0 });
  const pt = transformPoint2D(10, 5, m);
  assert.equal(pt.x, 45);
  assert.equal(pt.y, -5);
});

test('multiplyMatrices3x3 preserves identity', () => {
  const m = buildTransformMatrix({ x: 12, y: 34, scaleX: 150, scaleY: 75, rotation: 90 });
  const prod = multiplyMatrices3x3(m, IDENTITY_MATRIX_3X3);
  assert.deepEqual(prod, m);
});

test('computeFinalAlignmentMatrix respects bypassOffset flag', () => {
  const global = { x: 10, y: 20, scaleX: 100, scaleY: 100, rotation: 0 };
  const delta = { x: 5, y: -5, scaleX: 100, scaleY: 100, rotation: 0 };
  const active = computeFinalAlignmentMatrix(global, delta, false);
  const bypassed = computeFinalAlignmentMatrix(global, delta, true);
  assert.deepEqual(transformPoint2D(0, 0, active), { x: 15, y: 15 });
  assert.deepEqual(transformPoint2D(0, 0, bypassed), { x: 10, y: 20 });
});

test('computeSCurveBlendAlpha is monotonic in [0, 1] and bounded', () => {
  const a0 = computeSCurveBlendAlpha(0, 2.2);
  const aMid = computeSCurveBlendAlpha(0.5, 2.2);
  const a1 = computeSCurveBlendAlpha(1, 2.2);
  assert.equal(a0, 0);
  assert.equal(a1, 1);
  assert.ok(aMid > 0 && aMid < 1, `Expected midpoint alpha in (0,1), got ${aMid}`);
});

test('computeProjectorCornerPinMatrix3d returns empty string for unwarped frustum', () => {
  const frustum = { x: 40, y: 110, width: 520, height: 290 };
  const pins: [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }] = [
    { x: 40, y: 110 },
    { x: 560, y: 110 },
    { x: 560, y: 400 },
    { x: 40, y: 400 },
  ];
  assert.equal(computeProjectorCornerPinMatrix3d(frustum, pins, 1920, 1080), '');
});

test('computeProjectorCornerPinMatrix3d computes matrix3d when corner pins are distorted', () => {
  const frustum = { x: 40, y: 110, width: 520, height: 290 };
  const pins: [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }] = [
    { x: 60, y: 120 },
    { x: 540, y: 115 },
    { x: 575, y: 410 },
    { x: 30, y: 395 },
  ];
  const m3d = computeProjectorCornerPinMatrix3d(frustum, pins, 1920, 1080);
  assert.ok(m3d.startsWith('matrix3d(') && m3d.endsWith(')'), `Expected matrix3d(...), got ${m3d}`);
});
