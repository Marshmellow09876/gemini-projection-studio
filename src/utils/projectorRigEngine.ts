/**
 * Projector Rig & Edge Blending Engine
 * 
 * Part of Marshall Projection Studio Parity Blueprint — Phase 2 Advanced Systems.
 * Implements multi-projector canvas bounds, side-by-side / stacked geometry,
 * overlap zones (5% - 40%), mathematical edge-blend falloff curves (linear, cosine,
 * smoothstep, power gamma), black level compensation, per-projector keystone / 3x3 warp mesh,
 * and lamp hour ledger maintenance tracking.
 */

export interface WarpMeshPoint {
  row: number;
  col: number;
  x: number;
  y: number;
}

export interface KeystoneQuad {
  tl: [number, number];
  tr: [number, number];
  br: [number, number];
  bl: [number, number];
}

export interface ProjectorOutputConfig {
  id: string;
  name: string;
  displayIndex: number;
  resolution: {
    width: number;
    height: number;
  };
  position: {
    x: number;
    y: number;
  };
  orientation: 'horizontal' | 'vertical';
  enabled: boolean;
  keystone: KeystoneQuad;
  warpMesh: WarpMeshPoint[];
  gamma: number;
  blackLevelLift: number; // 0.0 - 0.20 black floor compensation
}

export type BlendRampType = 'linear' | 'cosine' | 'smoothstep' | 'power';

export interface EdgeBlendZone {
  id: string;
  projectorAId: string;
  projectorBId: string;
  orientation: 'horizontal' | 'vertical';
  overlapFraction: number; // 0.05 to 0.40 (5% to 40%)
  rampType: BlendRampType;
  gamma: number;           // 1.0 to 3.5 (default 2.2)
  blackLevelLift: number;  // 0.0 to 0.20 (default 0.04)
}

export interface LampHourEntry {
  timestamp: string;
  sessionMinutes: number;
  note: string;
}

export interface LampHourRecord {
  projectorId: string;
  initialHours: number;
  currentHours: number;
  warningThresholdHours: number;
  maxRatedHours: number;
  lastResetDate: string;
  entries: LampHourEntry[];
}

export interface ProjectorRigDocument {
  version: '1.0';
  id: string;
  name: string;
  totalCanvasWidth: number;
  totalCanvasHeight: number;
  projectors: ProjectorOutputConfig[];
  edgeBlends: EdgeBlendZone[];
  lampHours: LampHourRecord[];
}

export const STANDARD_RESOLUTIONS = [
  { label: '1080p Full HD (1920 × 1080)', width: 1920, height: 1080 },
  { label: '4K Ultra HD (3840 × 2160)', width: 3840, height: 2160 },
  { label: 'WUXGA 16:10 (1920 × 1200)', width: 1920, height: 1200 },
  { label: '720p HD (1280 × 720)', width: 1280, height: 720 },
  { label: 'WXGA (1280 × 800)', width: 1280, height: 800 },
];

/**
 * Creates a default uniform 3x3 warp mesh for a projector of given width & height
 */
export function createDefaultWarpMesh(
  rows: number = 3,
  cols: number = 3,
  width: number = 1920,
  height: number = 1080
): WarpMeshPoint[] {
  const points: WarpMeshPoint[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = cols > 1 ? Math.round((c / (cols - 1)) * width) : 0;
      const y = rows > 1 ? Math.round((r / (rows - 1)) * height) : 0;
      points.push({ row: r, col: c, x, y });
    }
  }
  return points;
}

/**
 * Mathematical edge blend falloff weight for normalized distance t in [0, 1]
 * 0 = edge of blend zone (falloff / 0% light)
 * 1 = inner edge of blend zone (full 100% light)
 */
export function computeBlendWeight(
  t: number,
  rampType: BlendRampType,
  gamma: number = 2.2
): number {
  const clampedT = Math.max(0, Math.min(1, t));

  let rawWeight = clampedT;
  switch (rampType) {
    case 'linear':
      rawWeight = clampedT;
      break;
    case 'cosine':
      rawWeight = 0.5 * (1 - Math.cos(Math.PI * clampedT));
      break;
    case 'smoothstep':
      rawWeight = clampedT * clampedT * (3 - 2 * clampedT);
      break;
    case 'power':
      rawWeight = Math.pow(clampedT, Math.max(0.1, gamma));
      break;
    default:
      rawWeight = clampedT;
  }

  // If gamma is applied to linear/cosine/smoothstep
  if (rampType !== 'power' && gamma !== 1.0 && gamma > 0) {
    rawWeight = Math.pow(rawWeight, gamma / 2.2);
  }

  return Math.max(0, Math.min(1, rawWeight));
}

/**
 * Computes black level compensation lift for single-projector non-overlap areas
 * to balance the doubled light floor in the overlapping projection zone.
 * In projection blending: L(x) = blackLevelLift * (1 - w(x))
 */
export function computeBlackLevelCompensation(
  t: number,
  blackLevelLift: number,
  rampType: string = 'smoothstep',
  gamma: number = 2.2
): number {
  const weight = computeBlendWeight(t, rampType as BlendRampType, gamma);
  const comp = blackLevelLift * (1 - weight);
  return Math.max(0, Math.min(1, comp));
}

/**
 * Computes total multi-projector canvas bounds and creates/updates adjacent edge blend zones
 */
export function computeMultiProjectorCanvas(
  projectors: ProjectorOutputConfig[],
  defaultOverlap: number = 0.15
): {
  canvasWidth: number;
  canvasHeight: number;
  blendZones: EdgeBlendZone[];
} {
  if (!projectors || projectors.length === 0) {
    return {
      canvasWidth: 1920,
      canvasHeight: 1080,
      blendZones: []
    };
  }

  const enabledProjectors = projectors.filter((p) => p.enabled);
  if (enabledProjectors.length === 0) {
    return {
      canvasWidth: 1920,
      canvasHeight: 1080,
      blendZones: []
    };
  }

  // Sort projectors by horizontal position X, then Y
  const sorted = [...enabledProjectors].sort((a, b) => {
    if (Math.abs(a.position.x - b.position.x) > 5) {
      return a.position.x - b.position.x;
    }
    return a.position.y - b.position.y;
  });

  const blendZones: EdgeBlendZone[] = [];

  // Generate or detect overlap zones between adjacent pairs
  for (let i = 0; i < sorted.length - 1; i++) {
    const pA = sorted[i];
    const pB = sorted[i + 1];

    const isHorizontal = Math.abs(pB.position.x - pA.position.x) >= Math.abs(pB.position.y - pA.position.y);

    let overlapFraction = defaultOverlap;
    if (isHorizontal) {
      const overlapPx = (pA.position.x + pA.resolution.width) - pB.position.x;
      if (overlapPx > 0 && pA.resolution.width > 0) {
        overlapFraction = Math.max(0.05, Math.min(0.40, overlapPx / pA.resolution.width));
      }
    } else {
      const overlapPx = (pA.position.y + pA.resolution.height) - pB.position.y;
      if (overlapPx > 0 && pA.resolution.height > 0) {
        overlapFraction = Math.max(0.05, Math.min(0.40, overlapPx / pA.resolution.height));
      }
    }

    blendZones.push({
      id: `blend-${pA.id}-${pB.id}`,
      projectorAId: pA.id,
      projectorBId: pB.id,
      orientation: isHorizontal ? 'horizontal' : 'vertical',
      overlapFraction: parseFloat(overlapFraction.toFixed(3)),
      rampType: 'smoothstep',
      gamma: 2.2,
      blackLevelLift: 0.04
    });
  }

  // Compute maximum bounding box extent
  let maxRight = 0;
  let maxBottom = 0;

  for (const p of enabledProjectors) {
    const right = p.position.x + p.resolution.width;
    const bottom = p.position.y + p.resolution.height;
    if (right > maxRight) maxRight = right;
    if (bottom > maxBottom) maxBottom = bottom;
  }

  return {
    canvasWidth: Math.max(1920, maxRight),
    canvasHeight: Math.max(1080, maxBottom),
    blendZones
  };
}

/**
 * Creates default 2-projector side-by-side rig (e.g. 2x 1080p with 15% overlap)
 */
export function createDefaultTwoProjectorSideBySideRig(
  width: number = 1920,
  height: number = 1080,
  overlap: number = 0.15
): ProjectorRigDocument {
  const overlapFraction = Math.max(0.05, Math.min(0.40, overlap));
  const overlapPx = Math.round(width * overlapFraction);
  const totalWidth = width * 2 - overlapPx;

  const proj1: ProjectorOutputConfig = {
    id: 'proj-1',
    name: 'Projector 1 (Left Wing)',
    displayIndex: 1,
    resolution: { width, height },
    position: { x: 0, y: 0 },
    orientation: 'horizontal',
    enabled: true,
    keystone: {
      tl: [0, 0],
      tr: [0, 0],
      br: [0, 0],
      bl: [0, 0]
    },
    warpMesh: createDefaultWarpMesh(3, 3, width, height),
    gamma: 2.2,
    blackLevelLift: 0.04
  };

  const proj2: ProjectorOutputConfig = {
    id: 'proj-2',
    name: 'Projector 2 (Right Wing)',
    displayIndex: 2,
    resolution: { width, height },
    position: { x: width - overlapPx, y: 0 },
    orientation: 'horizontal',
    enabled: true,
    keystone: {
      tl: [0, 0],
      tr: [0, 0],
      br: [0, 0],
      bl: [0, 0]
    },
    warpMesh: createDefaultWarpMesh(3, 3, width, height),
    gamma: 2.2,
    blackLevelLift: 0.04
  };

  const edgeBlends: EdgeBlendZone[] = [
    {
      id: 'blend-proj-1-proj-2',
      projectorAId: 'proj-1',
      projectorBId: 'proj-2',
      orientation: 'horizontal',
      overlapFraction,
      rampType: 'smoothstep',
      gamma: 2.2,
      blackLevelLift: 0.04
    }
  ];

  const lampHours: LampHourRecord[] = [
    {
      projectorId: 'proj-1',
      initialHours: 0,
      currentHours: 462.5,
      warningThresholdHours: 2000,
      maxRatedHours: 3000,
      lastResetDate: '2026-09-01',
      entries: [
        {
          timestamp: '2026-10-31 18:30:00',
          sessionMinutes: 240,
          note: 'Halloween Show Night Live Run'
        },
        {
          timestamp: '2026-11-05 19:15:00',
          sessionMinutes: 120,
          note: 'Optical Calibration & Geometry Alignment'
        }
      ]
    },
    {
      projectorId: 'proj-2',
      initialHours: 0,
      currentHours: 440.0,
      warningThresholdHours: 2000,
      maxRatedHours: 3000,
      lastResetDate: '2026-09-01',
      entries: [
        {
          timestamp: '2026-10-31 18:30:00',
          sessionMinutes: 240,
          note: 'Halloween Show Night Live Run'
        },
        {
          timestamp: '2026-11-05 19:15:00',
          sessionMinutes: 120,
          note: 'Optical Calibration & Geometry Alignment'
        }
      ]
    }
  ];

  return {
    version: '1.0',
    id: 'rig-two-projector-side-by-side',
    name: 'Dual Projector Panoramic House Rig (3264 × 1080)',
    totalCanvasWidth: totalWidth,
    totalCanvasHeight: height,
    projectors: [proj1, proj2],
    edgeBlends,
    lampHours
  };
}

/**
 * Creates default 3-projector panoramic rig (Left, Center, Right)
 */
export function createDefaultThreeProjectorRig(): ProjectorRigDocument {
  const width = 1920;
  const height = 1080;
  const overlapFraction = 0.15;
  const overlapPx = Math.round(width * overlapFraction);

  const proj1: ProjectorOutputConfig = {
    id: 'proj-1',
    name: 'Projector 1 (Left Wing)',
    displayIndex: 1,
    resolution: { width, height },
    position: { x: 0, y: 0 },
    orientation: 'horizontal',
    enabled: true,
    keystone: { tl: [0, 0], tr: [0, 0], br: [0, 0], bl: [0, 0] },
    warpMesh: createDefaultWarpMesh(3, 3, width, height),
    gamma: 2.2,
    blackLevelLift: 0.04
  };

  const proj2: ProjectorOutputConfig = {
    id: 'proj-2',
    name: 'Projector 2 (Center Facade)',
    displayIndex: 2,
    resolution: { width, height },
    position: { x: width - overlapPx, y: 0 },
    orientation: 'horizontal',
    enabled: true,
    keystone: { tl: [0, 0], tr: [0, 0], br: [0, 0], bl: [0, 0] },
    warpMesh: createDefaultWarpMesh(3, 3, width, height),
    gamma: 2.2,
    blackLevelLift: 0.04
  };

  const proj3: ProjectorOutputConfig = {
    id: 'proj-3',
    name: 'Projector 3 (Right Wing / Garage)',
    displayIndex: 3,
    resolution: { width, height },
    position: { x: (width - overlapPx) * 2, y: 0 },
    orientation: 'horizontal',
    enabled: true,
    keystone: { tl: [0, 0], tr: [0, 0], br: [0, 0], bl: [0, 0] },
    warpMesh: createDefaultWarpMesh(3, 3, width, height),
    gamma: 2.2,
    blackLevelLift: 0.04
  };

  const edgeBlends: EdgeBlendZone[] = [
    {
      id: 'blend-proj-1-proj-2',
      projectorAId: 'proj-1',
      projectorBId: 'proj-2',
      orientation: 'horizontal',
      overlapFraction,
      rampType: 'smoothstep',
      gamma: 2.2,
      blackLevelLift: 0.04
    },
    {
      id: 'blend-proj-2-proj-3',
      projectorAId: 'proj-2',
      projectorBId: 'proj-3',
      orientation: 'horizontal',
      overlapFraction,
      rampType: 'smoothstep',
      gamma: 2.2,
      blackLevelLift: 0.04
    }
  ];

  const totalWidth = (width - overlapPx) * 2 + width;

  const lampHours: LampHourRecord[] = [
    {
      projectorId: 'proj-1',
      initialHours: 0,
      currentHours: 510.0,
      warningThresholdHours: 2000,
      maxRatedHours: 3000,
      lastResetDate: '2026-08-10',
      entries: []
    },
    {
      projectorId: 'proj-2',
      initialHours: 0,
      currentHours: 490.5,
      warningThresholdHours: 2000,
      maxRatedHours: 3000,
      lastResetDate: '2026-08-10',
      entries: []
    },
    {
      projectorId: 'proj-3',
      initialHours: 0,
      currentHours: 512.0,
      warningThresholdHours: 2000,
      maxRatedHours: 3000,
      lastResetDate: '2026-08-10',
      entries: []
    }
  ];

  return {
    version: '1.0',
    id: 'rig-three-projector-panoramic',
    name: 'Triple Projector Wide Panoramic Rig (5184 × 1080)',
    totalCanvasWidth: totalWidth,
    totalCanvasHeight: height,
    projectors: [proj1, proj2, proj3],
    edgeBlends,
    lampHours
  };
}

/**
 * Solves a warped point (x, y) on a rectangular 2D mesh given normalized coordinates u, v in [0, 1]
 * using bilinear interpolation over the corresponding grid quad cell.
 */
export function solveBilinearMeshPoint(
  mesh: WarpMeshPoint[],
  u: number,
  v: number
): [number, number] {
  if (!mesh || mesh.length === 0) {
    return [u * 1920, v * 1080];
  }

  const maxRow = Math.max(...mesh.map((m) => m.row));
  const maxCol = Math.max(...mesh.map((m) => m.col));

  if (maxRow === 0 || maxCol === 0) {
    const pt = mesh[0];
    return [pt.x, pt.y];
  }

  const uClamped = Math.max(0, Math.min(1, u));
  const vClamped = Math.max(0, Math.min(1, v));

  const colFloat = uClamped * maxCol;
  const rowFloat = vClamped * maxRow;

  const c0 = Math.min(maxCol - 1, Math.floor(colFloat));
  const r0 = Math.min(maxRow - 1, Math.floor(rowFloat));
  const c1 = c0 + 1;
  const r1 = r0 + 1;

  const s = colFloat - c0; // local X fraction within cell
  const t = rowFloat - r0; // local Y fraction within cell

  const p00 = mesh.find((p) => p.row === r0 && p.col === c0);
  const p10 = mesh.find((p) => p.row === r0 && p.col === c1);
  const p01 = mesh.find((p) => p.row === r1 && p.col === c0);
  const p11 = mesh.find((p) => p.row === r1 && p.col === c1);

  if (!p00 || !p10 || !p01 || !p11) {
    return [u * 1920, v * 1080];
  }

  // Bilinear interpolation formula:
  // P(s, t) = (1 - s)(1 - t) P00 + s(1 - t) P10 + (1 - s)t P01 + st P11
  const x =
    (1 - s) * (1 - t) * p00.x +
    s * (1 - t) * p10.x +
    (1 - s) * t * p01.x +
    s * t * p11.x;

  const y =
    (1 - s) * (1 - t) * p00.y +
    s * (1 - t) * p10.y +
    (1 - s) * t * p01.y +
    s * t * p11.y;

  return [x, y];
}

const STORAGE_KEY = 'mps_projector_rig_doc_v1';

/**
 * Saves projector rig document to browser LocalStorage
 */
export function saveRigDocument(rig: ProjectorRigDocument): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rig));
  } catch (err) {
    console.error('Failed to save ProjectorRigDocument to localStorage:', err);
  }
}

/**
 * Loads projector rig document from LocalStorage, falling back to default two-projector rig
 */
export function loadRigDocument(): ProjectorRigDocument {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === '1.0' && Array.isArray(parsed.projectors)) {
        return parsed as ProjectorRigDocument;
      }
    }
  } catch (err) {
    console.warn('Error reading stored ProjectorRigDocument, loading default:', err);
  }
  return createDefaultTwoProjectorSideBySideRig();
}

/**
 * Exports projector rig configuration as formatted .mpsrig JSON string
 */
export function exportMpsRigJson(rig: ProjectorRigDocument): string {
  return JSON.stringify(rig, null, 2);
}

/**
 * Imports and validates a .mpsrig JSON string into a ProjectorRigDocument
 */
export function importMpsRigJson(jsonString: string): ProjectorRigDocument {
  const parsed = JSON.parse(jsonString);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid rig file: Root must be a JSON object');
  }

  if (!Array.isArray(parsed.projectors) || parsed.projectors.length === 0) {
    throw new Error('Invalid rig file: Missing projectors array');
  }

  const doc: ProjectorRigDocument = {
    version: '1.0',
    id: parsed.id || `rig-${Date.now()}`,
    name: parsed.name || 'Imported Projector Rig',
    totalCanvasWidth: parsed.totalCanvasWidth || 3840,
    totalCanvasHeight: parsed.totalCanvasHeight || 1080,
    projectors: parsed.projectors.map((p: any, idx: number) => ({
      id: p.id || `proj-${idx + 1}`,
      name: p.name || `Projector ${idx + 1}`,
      displayIndex: p.displayIndex ?? (idx + 1),
      resolution: {
        width: p.resolution?.width || 1920,
        height: p.resolution?.height || 1080
      },
      position: {
        x: p.position?.x || 0,
        y: p.position?.y || 0
      },
      orientation: p.orientation === 'vertical' ? 'vertical' : 'horizontal',
      enabled: p.enabled !== false,
      keystone: p.keystone || { tl: [0, 0], tr: [0, 0], br: [0, 0], bl: [0, 0] },
      warpMesh: Array.isArray(p.warpMesh) && p.warpMesh.length > 0
        ? p.warpMesh
        : createDefaultWarpMesh(3, 3, p.resolution?.width || 1920, p.resolution?.height || 1080),
      gamma: typeof p.gamma === 'number' ? p.gamma : 2.2,
      blackLevelLift: typeof p.blackLevelLift === 'number' ? p.blackLevelLift : 0.04
    })),
    edgeBlends: Array.isArray(parsed.edgeBlends) ? parsed.edgeBlends : [],
    lampHours: Array.isArray(parsed.lampHours) ? parsed.lampHours : []
  };

  return doc;
}

/**
 * Helper to trigger client-side download of a .mpsrig file
 */
export function downloadMpsRigFile(rig: ProjectorRigDocument, filename?: string): void {
  const content = exportMpsRigJson(rig);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename || `${rig.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.mpsrig`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Adds a usage session entry to a lamp hour record and updates currentHours
 */
export function recordLampSession(
  record: LampHourRecord,
  sessionMinutes: number,
  note: string = 'Show Playback Session'
): LampHourRecord {
  const addedHours = sessionMinutes / 60;
  const newHours = parseFloat((record.currentHours + addedHours).toFixed(2));
  const newEntry: LampHourEntry = {
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    sessionMinutes,
    note
  };

  return {
    ...record,
    currentHours: newHours,
    entries: [newEntry, ...record.entries]
  };
}

/**
 * Resets lamp hour counter for a projector after bulb/laser replacement
 */
export function resetProjectorLampHours(record: LampHourRecord): LampHourRecord {
  return {
    ...record,
    initialHours: 0,
    currentHours: 0,
    lastResetDate: new Date().toISOString().substring(0, 10),
    entries: [
      {
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        sessionMinutes: 0,
        note: 'Lamp / Laser Engine Replaced & Counter Reset'
      },
      ...record.entries
    ]
  };
}
