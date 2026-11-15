/**
 * polygonBoolean.ts
 * 2D Polygon Boolean operations, Sutherland-Hodgman clipping,
 * and parametric architectural brick/shingle grid subdivision.
 * Part of Lumen-Map AI Master Expansion Suite (Features #9, #10)
 */

import { VectorVertex } from '../store/useProjectionStore';

/**
 * Checks if a point (px, py) is strictly inside a polygon defined by vertices.
 * Uses Jordan Curve / Ray-casting algorithm.
 */
export function isPointInsidePolygon(
  pt: VectorVertex,
  polygon: VectorVertex[]
): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > pt.y !== yj > pt.y &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 0.00000001) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Computes polygon bounding box [minX, minY, maxX, maxY, width, height]
 */
export function getPolygonBoundingBox(polygon: VectorVertex[]) {
  if (!polygon.length) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const v of polygon) {
    if (v.x < minX) minX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.x > maxX) maxX = v.x;
    if (v.y > maxY) maxY = v.y;
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

/**
 * Sutherland-Hodgman Polygon Clipping of subjectPolygon against a convex clipPolygon.
 */
export function clipPolygon(
  subjectPolygon: VectorVertex[],
  clipPolygon: VectorVertex[]
): VectorVertex[] {
  let outputList = subjectPolygon;

  for (let i = 0; i < clipPolygon.length; i++) {
    const cp1 = clipPolygon[i];
    const cp2 = clipPolygon[(i + 1) % clipPolygon.length];
    const inputList = outputList;
    outputList = [];

    if (!inputList.length) break;

    let s = inputList[inputList.length - 1];

    for (const e of inputList) {
      if (isInsideEdge(e, cp1, cp2)) {
        if (isInsideEdge(s, cp1, cp2)) {
          outputList.push(e);
        } else {
          outputList.push(computeIntersection(s, e, cp1, cp2));
          outputList.push(e);
        }
      } else if (isInsideEdge(s, cp1, cp2)) {
        outputList.push(computeIntersection(s, e, cp1, cp2));
      }
      s = e;
    }
  }

  return outputList;
}

function isInsideEdge(p: VectorVertex, cp1: VectorVertex, cp2: VectorVertex): boolean {
  return (cp2.x - cp1.x) * (p.y - cp1.y) >= (cp2.y - cp1.y) * (p.x - cp1.x);
}

function computeIntersection(
  s: VectorVertex,
  e: VectorVertex,
  cp1: VectorVertex,
  cp2: VectorVertex
): VectorVertex {
  const dc = { x: cp1.x - cp2.x, y: cp1.y - cp2.y };
  const dp = { x: s.x - e.x, y: s.y - e.y };
  const n1 = cp1.x * cp2.y - cp1.y * cp2.x;
  const n2 = s.x * e.y - s.y * e.x;
  const n3 = 1.0 / (dc.x * dp.y - dc.y * dp.x + 0.0000001);
  return {
    x: Math.round((n1 * dp.x - n2 * dc.x) * n3),
    y: Math.round((n1 * dp.y - n2 * dc.y) * n3),
  };
}

export interface BrickSubdivisionOptions {
  rows: number;
  columns: number;
  staggerHalfBrick?: boolean; // Alternates row offset like real masonry
  gapPx?: number; // Mortar line spacing in pixels
}

export interface BrickTile {
  id: string;
  row: number;
  col: number;
  vertices: VectorVertex[];
  center: VectorVertex;
  area: number;
}

/**
 * Parametric Brick / Shingle / Siding Subdivider:
 * Takes a parent facade polygon (e.g. Garage wall or Roof) and cuts it into
 * realistic individual brick, shingle, or stone tiles with staggered joints and mortar lines.
 */
export function subdividePolygonToBricks(
  polygon: VectorVertex[],
  options: BrickSubdivisionOptions
): BrickTile[] {
  if (polygon.length < 3) return [];

  const { rows, columns, staggerHalfBrick = true, gapPx = 2 } = options;
  const bbox = getPolygonBoundingBox(polygon);
  const cellW = bbox.width / Math.max(1, columns);
  const cellH = bbox.height / Math.max(1, rows);

  const tiles: BrickTile[] = [];

  for (let r = 0; r < rows; r++) {
    const isStaggeredRow = staggerHalfBrick && r % 2 === 1;
    const rowOffset = isStaggeredRow ? -cellW / 2 : 0;
    const effectiveCols = isStaggeredRow ? columns + 1 : columns;

    for (let c = 0; c < effectiveCols; c++) {
      const left = bbox.minX + rowOffset + c * cellW + gapPx / 2;
      const top = bbox.minY + r * cellH + gapPx / 2;
      const right = left + cellW - gapPx;
      const bottom = top + cellH - gapPx;

      const rawBrickPoly: VectorVertex[] = [
        { x: Math.round(left), y: Math.round(top) },
        { x: Math.round(right), y: Math.round(top) },
        { x: Math.round(right), y: Math.round(bottom) },
        { x: Math.round(left), y: Math.round(bottom) },
      ];

      // Clip individual brick rectangle against the master architectural polygon boundary
      const clipped = clipPolygon(rawBrickPoly, polygon);

      if (clipped.length >= 3) {
        // Calculate centroid and approximate area
        let sumX = 0;
        let sumY = 0;
        for (const v of clipped) {
          sumX += v.x;
          sumY += v.y;
        }
        const center = {
          x: Math.round(sumX / clipped.length),
          y: Math.round(sumY / clipped.length),
        };

        // Shoelace formula for area
        let area = 0;
        for (let i = 0; i < clipped.length; i++) {
          const j = (i + 1) % clipped.length;
          area += clipped[i].x * clipped[j].y;
          area -= clipped[j].x * clipped[i].y;
        }
        area = Math.abs(area) / 2;

        if (area > 20) {
          tiles.push({
            id: `brick-${r}-${c}`,
            row: r,
            col: c,
            vertices: clipped,
            center,
            area: Math.round(area),
          });
        }
      }
    }
  }

  return tiles;
}
