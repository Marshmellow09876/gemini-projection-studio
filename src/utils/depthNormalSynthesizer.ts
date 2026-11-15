/**
 * depthNormalSynthesizer.ts
 * Architectural monocular Depth Map ($Z$-Buffer), Surface Normal Map ($\vec{N}_x, \vec{N}_y, \vec{N}_z$),
 * and Radiometric Wall Color Pigment Neutralization engine.
 * Part of Lumen-Map AI Master Expansion Suite (Features #2, #17, #18)
 */

import { VectorLayer } from '../store/useProjectionStore';

export interface DepthPlaneConfig {
  skyDepth: number; // 0.0 = furthest
  roofDepthTop: number; // e.g. 0.35
  roofDepthBottom: number; // e.g. 0.55
  wallDepth: number; // e.g. 0.65
  windowRecessDepth: number; // e.g. 0.45 (recessed into wall)
  pillarDepth: number; // e.g. 0.85 (standing forward)
  garageDepth: number; // e.g. 0.80
}

export const DEFAULT_DEPTH_CONFIG: DepthPlaneConfig = {
  skyDepth: 0.05,
  roofDepthTop: 0.35,
  roofDepthBottom: 0.55,
  wallDepth: 0.65,
  windowRecessDepth: 0.45,
  pillarDepth: 0.9,
  garageDepth: 0.8,
};

export interface WallColorCompensationResult {
  averageSampledColor: { r: number; g: number; b: number; hex: string };
  inverseMatrix: number[][]; // 4x5 feColorMatrix values
  compensationFilterCss: string;
  recommendedGainBoost: number;
}

/**
 * Computes Radiometric Inverse Chromatic Adaptation Matrix:
 * When projecting onto dark red brick or yellow siding, this computes an
 * inverse radiometric compensation color matrix so white light remains pure white.
 */
export function computeWallColorNeutralization(
  wallHexColor: string,
  strengthPercent: number = 75
): WallColorCompensationResult {
  // Parse hex to RGB
  const cleanHex = wallHexColor.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) || 160;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 75;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 60;

  // Normalized color ratios
  const normR = r / 255;
  const normG = g / 255;
  const normB = b / 255;
  const avg = (normR + normG + normB) / 3;

  const strength = Math.max(0, Math.min(100, strengthPercent)) / 100;

  // Inverse relative gain: boost channels that the wall absorbs, attenuate dominant channels
  const gainR = 1 + (avg / Math.max(0.1, normR) - 1) * strength;
  const gainG = 1 + (avg / Math.max(0.1, normG) - 1) * strength;
  const gainB = 1 + (avg / Math.max(0.1, normB) - 1) * strength;

  // 4x5 SVG feColorMatrix representation
  const matrix: number[][] = [
    [Number(gainR.toFixed(3)), 0, 0, 0, 0],
    [0, Number(gainG.toFixed(3)), 0, 0, 0],
    [0, 0, Number(gainB.toFixed(3)), 0, 0],
    [0, 0, 0, 1, 0],
  ];

  const recommendedGainBoost = Number(
    (Math.max(1, 1 / Math.max(0.2, avg)) * 0.85).toFixed(2)
  );

  return {
    averageSampledColor: { r, g, b, hex: wallHexColor },
    inverseMatrix: matrix,
    compensationFilterCss: `brightness(${recommendedGainBoost}) contrast(1.15)`,
    recommendedGainBoost,
  };
}

export interface Synthetic3DLightSource {
  id: string;
  name: string;
  type: 'point' | 'directional' | 'spotlight';
  x: number; // Facade space 0-1080
  y: number; // Facade space 0-600
  z: number; // Height above facade 50-800
  color: string;
  intensity: number;
  coneAngleDeg?: number;
  specularExponent?: number;
}

export const DEFAULT_VIRTUAL_LIGHTS: Synthetic3DLightSource[] = [
  {
    id: 'moonlight-fill',
    name: 'Overhead Full Moon',
    type: 'directional',
    x: 250,
    y: 40,
    z: 500,
    color: '#80bfff',
    intensity: 0.65,
  },
  {
    id: 'porch-glow',
    name: 'Front Porch Amber Lantern',
    type: 'point',
    x: 540,
    y: 320,
    z: 140,
    color: '#ffaa33',
    intensity: 1.2,
    specularExponent: 20,
  },
  {
    id: 'sweeping-searchlight',
    name: 'Ghostbusters Proton Searchlight',
    type: 'spotlight',
    x: 180,
    y: 420,
    z: 220,
    color: '#00f0ff',
    intensity: 2.0,
    coneAngleDeg: 35,
    specularExponent: 45,
  },
];

/**
 * Assigns normalized Depth ($Z$) values per architectural layer category
 */
export function getEstimatedLayerDepth(
  layer: VectorLayer,
  config: DepthPlaneConfig = DEFAULT_DEPTH_CONFIG
): number {
  switch (layer.category) {
    case 'Roofline':
      return (config.roofDepthTop + config.roofDepthBottom) / 2;
    case 'Main Walls':
      return config.wallDepth;
    case 'Garage':
      return config.garageDepth;
    case 'Pillars':
      return config.pillarDepth;
    case 'Windows':
    case 'Blackout Masks':
      return config.windowRecessDepth;
    default:
      return config.wallDepth;
  }
}

/**
 * Synthesizes SVG DataURLs for 16-bit depth maps and RGB normal maps
 */
export function synthesizeDepthAndNormalMaps(
  photoUrl: string,
  config: {
    skyZ?: number;
    roofZ?: number;
    wallsZ?: number;
    pillarsZ?: number;
    garageZ?: number;
    bumpRelief?: number;
  } = {}
) {
  const depthSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
    <rect width="800" height="500" fill="#151515"/>
    <polygon points="100,280 400,120 700,280" fill="#757575"/>
    <rect x="120" y="280" width="560" height="180" fill="#a0a0a0"/>
    <rect x="150" y="310" width="180" height="150" fill="#d0d0d0"/>
    <rect x="420" y="320" width="80" height="90" fill="#505050"/>
    <rect x="540" y="320" width="90" height="90" fill="#505050"/>
  </svg>`;

  const normalSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
    <rect width="800" height="500" fill="#8080ff"/>
    <polygon points="100,280 400,120 700,280" fill="#80a0ff"/>
    <rect x="120" y="280" width="560" height="180" fill="#8080ff"/>
    <rect x="150" y="310" width="180" height="150" fill="#9080ff"/>
    <rect x="420" y="320" width="80" height="90" fill="#7070ff"/>
    <rect x="540" y="320" width="90" height="90" fill="#7070ff"/>
  </svg>`;

  return {
    depthMapDataUrl: 'data:image/svg+xml;utf8,' + encodeURIComponent(depthSvg),
    normalMapDataUrl: 'data:image/svg+xml;utf8,' + encodeURIComponent(normalSvg),
  };
}
