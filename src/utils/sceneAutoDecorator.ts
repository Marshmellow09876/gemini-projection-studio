/**
 * MARSHALL PROJECTION STUDIO — SCENE AUTO-DECORATOR & HOLIDAY FX ENGINE
 * 
 * Provides:
 * - Reusable Scene & Theme Palette data models (.mpsscenes, .mpspalettes)
 * - 7 Built-In Holiday Theme Palettes (Classic Christmas, Candy Cane Lane, Winter Wonderland,
 *   Elegant Gold & Warm White, Spooky Halloween Manor, Festival of Lights Hanukkah, New Year's Eve)
 * - Deterministic Mulberry32 seeded PRNG
 * - Tag-Aware Auto-Decorate Engine with per-shape locking & semantic shape routing
 * - Hue-Shift Scene Variant Generator (+30°, +60°, +120°, +180°)
 * - 6 Built-In Procedural Generators (Solid, Gradient, Simplex Noise, Plasma, Stripes, Checkerboard)
 * - 6 Signature Holiday Procedural Effects (Border Chase C9 Bulbs, Icicle Drip, Window Silhouette,
 *   Santa Sleigh Flyover, Candle Flicker, Ornament Twinkle) + Particle Weather Overlays
 * - 11-Node Colour/FX Graph Engine with Kahn topological sort, cycle prevention, CSS filter & RGBA evaluator
 * - Canvas2D real-time 60fps renderer for house vector layers
 * - Local storage persistence & JSON import/export
 */

import { VectorLayer, VectorVertex } from '../store/useProjectionStore';

// ============================================================================
// 1. DATA MODELS & TYPES
// ============================================================================

export type SemanticShapeTag =
  | 'Roofline'
  | 'RoofPlane'
  | 'Wall'
  | 'Window'
  | 'Door'
  | 'Garage'
  | 'Pillar'
  | 'Bush'
  | 'Fascia'
  | 'Trim'
  | 'Custom';

export type GeneratorSourceType =
  | 'solid'
  | 'gradient'
  | 'simplex-noise'
  | 'plasma'
  | 'stripes'
  | 'checkerboard';

export type HolidayDecorEffectType =
  | 'none'
  | 'border-chase-bulbs'
  | 'icicle-drip'
  | 'window-silhouette'
  | 'santa-flyover'
  | 'candle-flicker'
  | 'ornament-twinkle';

export type WindowSilhouetteType =
  | 'santa-walking'
  | 'elves-workshop'
  | 'spinning-tree'
  | 'bethlehem-star'
  | 'spooky-cat'
  | 'dancing-skeleton';

export type SceneParticleOverlay =
  | 'none'
  | 'gentle-snow'
  | 'blizzard'
  | 'falling-leaves'
  | 'rising-embers'
  | 'nye-confetti'
  | 'fireflies';

export interface ThemePalette {
  id: string;
  name: string;
  category: 'Christmas' | 'Winter' | 'Halloween' | 'Hanukkah' | 'NewYear' | 'Custom';
  colors: string[]; // Array of hex strings: [primary, secondary, accent, highlight, ...]
  isPreset?: boolean;
}

export type FxNodeKind =
  | 'Source'
  | 'BrightnessContrast'
  | 'HueSaturation'
  | 'Levels'
  | 'Curves'
  | 'Tint'
  | 'Invert'
  | 'Posterize'
  | 'Mix'
  | 'Mask'
  | 'Output';

export interface FxNodeParams {
  brightness?: number; // -1.0 to 1.0 (default 0.0)
  contrast?: number; // 0.0 to 3.0 (default 1.0)
  hueShiftDeg?: number; // -180 to 180 (default 0)
  saturation?: number; // 0.0 to 3.0 (default 1.0)
  levelsBlack?: number; // 0.0 to 1.0 (default 0.0)
  levelsWhite?: number; // 0.0 to 1.0 (default 1.0)
  levelsGamma?: number; // 0.1 to 4.0 (default 1.0)
  curveKnots?: [number, number, number, number, number]; // 5 knots at x = 0, 0.25, 0.5, 0.75, 1.0
  tintColor?: string; // hex
  tintAmount?: number; // 0.0 to 1.0
  invertAmount?: number; // 0.0 to 1.0
  posterizeLevels?: number; // 2 to 32 (default 6)
  mixMode?: 'normal' | 'multiply' | 'screen' | 'add' | 'overlay';
  mixFactor?: number; // 0.0 to 1.0
}

export interface FxGraphNode {
  id: string;
  kind: FxNodeKind;
  x: number;
  y: number;
  params: FxNodeParams;
}

export interface FxGraphConnection {
  fromId: string;
  toId: string;
  toPort?: number; // 0 = primary/main, 1 = secondary/matte
}

export interface FxGraphDefinition {
  id: string;
  name: string;
  nodes: FxGraphNode[];
  connections: FxGraphConnection[];
}

export interface ShapeSceneAssignment {
  layerId: string;
  locked: boolean;
  generator: {
    type: GeneratorSourceType;
    primaryColor: string;
    secondaryColor: string;
    tertiaryColor?: string;
    speed: number;
    scale: number;
    angleDeg: number;
  };
  decorEffect: {
    type: HolidayDecorEffectType;
    bulbSpacingPx: number;
    chaseSpeed: number;
    direction: 'forward' | 'reverse' | 'bounce';
    bulbSizePx: number;
    icicleLengthPx: number;
    silhouette: WindowSilhouetteType;
    intensity: number;
    colors: string[];
  };
  opacity: number;
  blendMode: GlobalCompositeOperation;
  fxGraphId?: string;
}

export interface MpsScene {
  id: string;
  name: string;
  category: string;
  paletteId: string;
  seed: number;
  particleOverlay: SceneParticleOverlay;
  santaFlyoverActive: boolean;
  assignments: Record<string, ShapeSceneAssignment>;
  fxGraph: FxGraphDefinition;
}

// ============================================================================
// 2. 7 BUILT-IN THEME PALETTES (.mpspalettes)
// ============================================================================

export const BUILT_IN_THEME_PALETTES: ThemePalette[] = [
  {
    id: 'classic-christmas',
    name: 'Classic Christmas',
    category: 'Christmas',
    colors: ['#D91E36', '#0B6E4F', '#F4B942', '#FFF4E0'],
    isPreset: true,
  },
  {
    id: 'candy-cane-lane',
    name: 'Candy Cane Lane',
    category: 'Christmas',
    colors: ['#FF1E42', '#FFFFFF', '#6BFFB8', '#80E5FF'],
    isPreset: true,
  },
  {
    id: 'winter-wonderland',
    name: 'Winter Wonderland',
    category: 'Winter',
    colors: ['#1E90FF', '#88F4FF', '#F5FBFF', '#0A1931'],
    isPreset: true,
  },
  {
    id: 'elegant-gold-warm-white',
    name: 'Elegant Gold & Warm White',
    category: 'Christmas',
    colors: ['#F7E7CE', '#FFB800', '#FFFDF5', '#8C5828'],
    isPreset: true,
  },
  {
    id: 'spooky-halloween-manor',
    name: 'Spooky Halloween Manor',
    category: 'Halloween',
    colors: ['#FF6B00', '#8A2BE2', '#39FF14', '#9E0B22'],
    isPreset: true,
  },
  {
    id: 'festival-of-lights-hanukkah',
    name: 'Festival of Lights (Hanukkah)',
    category: 'Hanukkah',
    colors: ['#0047AB', '#E5E7EB', '#FFD700', '#38BDF8'],
    isPreset: true,
  },
  {
    id: 'nye-countdown',
    name: "New Year's Eve Countdown",
    category: 'NewYear',
    colors: ['#FFD700', '#FF007F', '#00F0FF', '#111827'],
    isPreset: true,
  },
];

// ============================================================================
// 3. COLOR & HSL UTILITIES
// ============================================================================

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 255, g: 255, b: 255 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rf:
        h = (gf - bf) / d + (gf < bf ? 6 : 0);
        break;
      case gf:
        h = (bf - rf) / d + 2;
        break;
      case bf:
        h = (rf - gf) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: h * 360, s, l };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const hue = ((h % 360) + 360) % 360;
  const hf = hue / 360;

  if (s === 0) {
    const val = Math.round(l * 255);
    return { r: val, g: val, b: val };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, hf + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, hf) * 255);
  const b = Math.round(hue2rgb(p, q, hf - 1 / 3) * 255);
  return { r, g, b };
}

export function shiftHexHue(hex: string, deltaDeg: number): string {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const newRgb = hslToRgb(hsl.h + deltaDeg, hsl.s, hsl.l);
  return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
}

export function createHueShiftedPalette(palette: ThemePalette, deltaDeg: number): ThemePalette {
  return {
    ...palette,
    id: `${palette.id}-shift-${deltaDeg}`,
    name: `${palette.name} (+${deltaDeg}°)`,
    colors: palette.colors.map((c) => shiftHexHue(c, deltaDeg)),
    isPreset: false,
  };
}

export function createHueShiftedSceneVariant(
  scene: MpsScene,
  deltaDeg: number,
  newName?: string
): MpsScene {
  const updatedAssignments: Record<string, ShapeSceneAssignment> = {};

  for (const [layerId, assignment] of Object.entries(scene.assignments)) {
    updatedAssignments[layerId] = {
      ...assignment,
      generator: {
        ...assignment.generator,
        primaryColor: shiftHexHue(assignment.generator.primaryColor, deltaDeg),
        secondaryColor: shiftHexHue(assignment.generator.secondaryColor, deltaDeg),
        tertiaryColor: assignment.generator.tertiaryColor
          ? shiftHexHue(assignment.generator.tertiaryColor, deltaDeg)
          : undefined,
      },
      decorEffect: {
        ...assignment.decorEffect,
        colors: assignment.decorEffect.colors.map((c) => shiftHexHue(c, deltaDeg)),
      },
    };
  }

  return {
    ...scene,
    id: `scene-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: newName || `${scene.name} (+${deltaDeg}° Hue Shift)`,
    seed: (scene.seed + Math.round(deltaDeg)) % 100000,
    assignments: updatedAssignments,
  };
}

// ============================================================================
// 4. DETERMINISTIC MULBERRY32 PRNG
// ============================================================================

export function mulberry32(seed: number): () => number {
  let s = Math.floor(seed) >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================================================
// 5. TAG CLASSIFICATION & AUTO-DECORATE ENGINE
// ============================================================================

export function classifyLayerTag(layer: VectorLayer): SemanticShapeTag {
  if (layer.archTag) {
    const at = layer.archTag.toLowerCase();
    if (at.includes('roofline') || at.includes('eave') || at.includes('ridge')) return 'Roofline';
    if (at.includes('roofplane') || at.includes('gable')) return 'RoofPlane';
    if (at.includes('window')) return 'Window';
    if (at.includes('door') || at.includes('entry')) return 'Door';
    if (at.includes('garage')) return 'Garage';
    if (at.includes('pillar') || at.includes('column')) return 'Pillar';
    if (at.includes('bush') || at.includes('tree') || at.includes('shrub')) return 'Bush';
    if (at.includes('fascia')) return 'Fascia';
    if (at.includes('trim')) return 'Trim';
    if (at.includes('wall')) return 'Wall';
  }

  const name = (layer.name || '').toLowerCase();
  const cat = (layer.category || '').toLowerCase();

  if (cat.includes('roofline') || name.includes('roofline') || name.includes('eave')) return 'Roofline';
  if (cat.includes('window') || name.includes('window') || name.includes('pane')) return 'Window';
  if (name.includes('door') || name.includes('entryway')) return 'Door';
  if (cat.includes('garage') || name.includes('garage')) return 'Garage';
  if (cat.includes('pillar') || name.includes('pillar') || name.includes('column')) return 'Pillar';
  if (name.includes('bush') || name.includes('hedge') || name.includes('tree')) return 'Bush';
  if (name.includes('fascia')) return 'Fascia';
  if (name.includes('trim') || name.includes('soffit')) return 'Trim';
  if (cat.includes('wall') || name.includes('wall') || name.includes('brick')) return 'Wall';
  if (name.includes('roof') || name.includes('shingle')) return 'RoofPlane';

  return 'Custom';
}

export function autoDecorateScene(
  layers: VectorLayer[],
  palette: ThemePalette,
  seed: number,
  existingScene?: MpsScene
): MpsScene {
  const rng = mulberry32(seed);
  const colors = palette.colors.length >= 2 ? palette.colors : ['#D91E36', '#0B6E4F', '#F4B942', '#FFF4E0'];
  const assignments: Record<string, ShapeSceneAssignment> = {};

  const holidayCategory = palette.category;

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const prev = existingScene?.assignments[layer.id];

    // If layer was locked in the previous scene, preserve its assignment
    if (prev?.locked) {
      assignments[layer.id] = { ...prev };
      continue;
    }

    const tag = classifyLayerTag(layer);
    const c0 = colors[i % colors.length];
    const c1 = colors[(i + 1) % colors.length];
    const c2 = colors[(i + 2) % colors.length];
    const c3 = colors[(i + 3) % colors.length];

    let genType: GeneratorSourceType = 'solid';
    let speed = 1.0;
    let scale = 1.0;
    let angleDeg = 0;
    let effectType: HolidayDecorEffectType = 'none';
    let silhouette: WindowSilhouetteType = 'santa-walking';
    let chaseSpeed = 1.5;
    let bulbSpacingPx = 24;
    let bulbSizePx = 6;
    let icicleLengthPx = 28;
    let intensity = 1.0;

    switch (tag) {
      case 'Roofline':
      case 'Fascia':
      case 'Trim': {
        genType = rng() > 0.4 ? 'gradient' : 'solid';
        speed = 0.5;
        scale = 1.0;
        angleDeg = 90;
        effectType = 'border-chase-bulbs';
        chaseSpeed = 1.0 + rng() * 1.5;
        bulbSpacingPx = 20 + Math.round(rng() * 8);
        bulbSizePx = 6 + Math.round(rng() * 2);
        intensity = 1.0;
        break;
      }

      case 'RoofPlane': {
        genType = rng() > 0.5 ? 'plasma' : 'simplex-noise';
        speed = 0.3 + rng() * 0.4;
        scale = 1.5;
        angleDeg = 45;
        effectType = rng() > 0.6 ? 'ornament-twinkle' : 'none';
        intensity = 0.8;
        break;
      }

      case 'Window': {
        genType = 'gradient';
        speed = 0.2;
        scale = 1.0;
        angleDeg = 45;
        effectType = 'window-silhouette';

        if (holidayCategory === 'Halloween') {
          silhouette = rng() > 0.5 ? 'spooky-cat' : 'dancing-skeleton';
        } else if (holidayCategory === 'Hanukkah') {
          silhouette = 'bethlehem-star';
        } else {
          const silList: WindowSilhouetteType[] = [
            'santa-walking',
            'elves-workshop',
            'spinning-tree',
            'bethlehem-star',
          ];
          silhouette = silList[Math.floor(rng() * silList.length)];
        }
        intensity = 1.0;
        break;
      }

      case 'Door': {
        genType = 'gradient';
        speed = 0.3;
        scale = 1.0;
        angleDeg = 90;
        effectType = rng() > 0.5 ? 'candle-flicker' : 'border-chase-bulbs';
        chaseSpeed = 1.2;
        bulbSpacingPx = 18;
        bulbSizePx = 5;
        intensity = 1.0;
        break;
      }

      case 'Pillar': {
        genType = rng() > 0.5 ? 'stripes' : 'gradient';
        speed = 0.8;
        scale = 1.5;
        angleDeg = 45;
        effectType = rng() > 0.5 ? 'border-chase-bulbs' : 'ornament-twinkle';
        chaseSpeed = 1.2;
        bulbSpacingPx = 20;
        bulbSizePx = 5;
        break;
      }

      case 'Garage': {
        genType = rng() > 0.5 ? 'stripes' : 'plasma';
        speed = 0.6;
        scale = 2.0;
        angleDeg = 30;
        effectType = 'none';
        intensity = 0.85;
        break;
      }

      case 'Bush': {
        genType = 'solid';
        speed = 0.0;
        scale = 1.0;
        angleDeg = 0;
        effectType = 'ornament-twinkle';
        intensity = 1.0;
        break;
      }

      case 'Wall':
      default: {
        const wallGens: GeneratorSourceType[] = ['gradient', 'plasma', 'simplex-noise'];
        genType = wallGens[Math.floor(rng() * wallGens.length)];
        speed = 0.4;
        scale = 1.5;
        angleDeg = 60;
        effectType = 'none';
        intensity = 0.85;
        break;
      }
    }

    assignments[layer.id] = {
      layerId: layer.id,
      locked: false,
      generator: {
        type: genType,
        primaryColor: c0,
        secondaryColor: c1,
        tertiaryColor: c2,
        speed,
        scale,
        angleDeg,
      },
      decorEffect: {
        type: effectType,
        bulbSpacingPx,
        chaseSpeed,
        direction: 'forward',
        bulbSizePx,
        icicleLengthPx,
        silhouette,
        intensity,
        colors: [c0, c1, c2, c3],
      },
      opacity: 0.95,
      blendMode: 'source-over',
    };
  }

  // Particle weather based on holiday
  let particle: SceneParticleOverlay = 'gentle-snow';
  if (holidayCategory === 'Halloween') particle = 'rising-embers';
  else if (holidayCategory === 'NewYear') particle = 'nye-confetti';
  else if (holidayCategory === 'Winter') particle = 'blizzard';
  else if (rng() > 0.7) particle = 'fireflies';

  return {
    id: existingScene?.id || `scene-${Date.now()}`,
    name: existingScene?.name || `${palette.name} Holiday Magic`,
    category: palette.category,
    paletteId: palette.id,
    seed,
    particleOverlay: particle,
    santaFlyoverActive: holidayCategory === 'Christmas' || holidayCategory === 'Winter',
    assignments,
    fxGraph: existingScene?.fxGraph || createDefaultFxGraph(),
  };
}

// ============================================================================
// 6. 11-NODE COLOUR/FX GRAPH ENGINE
// ============================================================================

export function createDefaultFxGraph(): FxGraphDefinition {
  return {
    id: 'fx-default',
    name: 'Standard Pass-Through FX',
    nodes: [
      {
        id: 'node-source',
        kind: 'Source',
        x: 60,
        y: 160,
        params: {},
      },
      {
        id: 'node-bc',
        kind: 'BrightnessContrast',
        x: 280,
        y: 160,
        params: { brightness: 0.05, contrast: 1.1 },
      },
      {
        id: 'node-hs',
        kind: 'HueSaturation',
        x: 500,
        y: 160,
        params: { hueShiftDeg: 0, saturation: 1.1 },
      },
      {
        id: 'node-output',
        kind: 'Output',
        x: 740,
        y: 160,
        params: {},
      },
    ],
    connections: [
      { fromId: 'node-source', toId: 'node-bc', toPort: 0 },
      { fromId: 'node-bc', toId: 'node-hs', toPort: 0 },
      { fromId: 'node-hs', toId: 'node-output', toPort: 0 },
    ],
  };
}

export const BUILT_IN_FX_PRESETS: FxGraphDefinition[] = [
  {
    id: 'fx-vintage-film',
    name: 'Warm Vintage Film',
    nodes: [
      { id: 'src', kind: 'Source', x: 60, y: 160, params: {} },
      { id: 'levels', kind: 'Levels', x: 260, y: 160, params: { levelsBlack: 0.05, levelsWhite: 0.95, levelsGamma: 1.15 } },
      { id: 'tint', kind: 'Tint', x: 460, y: 160, params: { tintColor: '#FFE7B3', tintAmount: 0.35 } },
      { id: 'curves', kind: 'Curves', x: 660, y: 160, params: { curveKnots: [0.08, 0.28, 0.52, 0.78, 0.95] } },
      { id: 'out', kind: 'Output', x: 860, y: 160, params: {} },
    ],
    connections: [
      { fromId: 'src', toId: 'levels' },
      { fromId: 'levels', toId: 'tint' },
      { fromId: 'tint', toId: 'curves' },
      { fromId: 'curves', toId: 'out' },
    ],
  },
  {
    id: 'fx-neon-punch',
    name: 'High-Contrast Neon',
    nodes: [
      { id: 'src', kind: 'Source', x: 60, y: 160, params: {} },
      { id: 'bc', kind: 'BrightnessContrast', x: 260, y: 160, params: { brightness: 0.08, contrast: 1.4 } },
      { id: 'hs', kind: 'HueSaturation', x: 460, y: 160, params: { hueShiftDeg: 0, saturation: 1.6 } },
      { id: 'poster', kind: 'Posterize', x: 660, y: 160, params: { posterizeLevels: 16 } },
      { id: 'out', kind: 'Output', x: 860, y: 160, params: {} },
    ],
    connections: [
      { fromId: 'src', toId: 'bc' },
      { fromId: 'bc', toId: 'hs' },
      { fromId: 'hs', toId: 'poster' },
      { fromId: 'poster', toId: 'out' },
    ],
  },
  {
    id: 'fx-frost-cyan',
    name: 'Frost Cyan Tint',
    nodes: [
      { id: 'src', kind: 'Source', x: 60, y: 160, params: {} },
      { id: 'hs', kind: 'HueSaturation', x: 260, y: 160, params: { hueShiftDeg: -15, saturation: 1.25 } },
      { id: 'tint', kind: 'Tint', x: 460, y: 160, params: { tintColor: '#88F4FF', tintAmount: 0.45 } },
      { id: 'bc', kind: 'BrightnessContrast', x: 660, y: 160, params: { brightness: 0.12, contrast: 1.2 } },
      { id: 'out', kind: 'Output', x: 860, y: 160, params: {} },
    ],
    connections: [
      { fromId: 'src', toId: 'hs' },
      { fromId: 'hs', toId: 'tint' },
      { fromId: 'tint', toId: 'bc' },
      { fromId: 'bc', toId: 'out' },
    ],
  },
  {
    id: 'fx-noir-midnight',
    name: 'Noir Midnight',
    nodes: [
      { id: 'src', kind: 'Source', x: 60, y: 160, params: {} },
      { id: 'hs', kind: 'HueSaturation', x: 260, y: 160, params: { saturation: 0.1 } },
      { id: 'levels', kind: 'Levels', x: 460, y: 160, params: { levelsBlack: 0.15, levelsWhite: 0.9, levelsGamma: 0.85 } },
      { id: 'bc', kind: 'BrightnessContrast', x: 660, y: 160, params: { brightness: -0.05, contrast: 1.5 } },
      { id: 'out', kind: 'Output', x: 860, y: 160, params: {} },
    ],
    connections: [
      { fromId: 'src', toId: 'hs' },
      { fromId: 'hs', toId: 'levels' },
      { fromId: 'levels', toId: 'bc' },
      { fromId: 'bc', toId: 'out' },
    ],
  },
  {
    id: 'fx-psychedelic',
    name: 'Psychedelic Hue Shift',
    nodes: [
      { id: 'src', kind: 'Source', x: 60, y: 160, params: {} },
      { id: 'hs', kind: 'HueSaturation', x: 260, y: 160, params: { hueShiftDeg: 120, saturation: 1.8 } },
      { id: 'poster', kind: 'Posterize', x: 460, y: 160, params: { posterizeLevels: 8 } },
      { id: 'curves', kind: 'Curves', x: 660, y: 160, params: { curveKnots: [0.9, 0.2, 0.8, 0.1, 0.95] } },
      { id: 'out', kind: 'Output', x: 860, y: 160, params: {} },
    ],
    connections: [
      { fromId: 'src', toId: 'hs' },
      { fromId: 'hs', toId: 'poster' },
      { fromId: 'poster', toId: 'curves' },
      { fromId: 'curves', toId: 'out' },
    ],
  },
];

export function wouldCreateCycle(
  nodes: FxGraphNode[],
  connections: FxGraphConnection[],
  fromId: string,
  toId: string
): boolean {
  if (fromId === toId) return true;

  // Build adjacency list
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const c of connections) {
    const list = adj.get(c.fromId);
    if (list) list.push(c.toId);
  }

  // Check if toId can reach fromId via existing edges
  const visited = new Set<string>();
  const queue = [toId];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr === fromId) return true;
    if (visited.has(curr)) continue;
    visited.add(curr);

    const neighbors = adj.get(curr) || [];
    for (const nb of neighbors) {
      if (!visited.has(nb)) {
        queue.push(nb);
      }
    }
  }

  return false;
}

export function topologicalSortNodes(
  nodes: FxGraphNode[],
  connections: FxGraphConnection[]
): { sortedIds: string[]; hasCycle: boolean; stuckIds: string[] } {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  }

  for (const c of connections) {
    if (inDegree.has(c.toId) && adj.has(c.fromId)) {
      adj.get(c.fromId)!.push(c.toId);
      inDegree.set(c.toId, inDegree.get(c.toId)! + 1);
    }
  }

  // Ready set with deterministic tie-breaking by ID
  const ready: string[] = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) ready.push(id);
  }
  ready.sort();

  const sortedIds: string[] = [];
  while (ready.length > 0) {
    const curr = ready.shift()!;
    sortedIds.push(curr);

    const neighbors = adj.get(curr) || [];
    for (const nb of neighbors) {
      const nextDeg = inDegree.get(nb)! - 1;
      inDegree.set(nb, nextDeg);
      if (nextDeg === 0) {
        ready.push(nb);
        ready.sort();
      }
    }
  }

  const hasCycle = sortedIds.length < nodes.length;
  const stuckIds: string[] = [];
  if (hasCycle) {
    for (const [id, deg] of inDegree.entries()) {
      if (deg > 0) stuckIds.push(id);
    }
    stuckIds.sort();
  }

  return { sortedIds, hasCycle, stuckIds };
}

export function evaluateFxGraphCssFilterAndLut(graph: FxGraphDefinition): {
  cssFilter: string;
  transformRgba: (r: number, g: number, b: number, a: number) => [number, number, number, number];
} {
  const { sortedIds, hasCycle } = topologicalSortNodes(graph.nodes, graph.connections);
  const nodeMap = new Map<string, FxGraphNode>();
  for (const n of graph.nodes) nodeMap.set(n.id, n);

  let brightnessVal = 1.0;
  let contrastVal = 1.0;
  let hueRotateDeg = 0;
  let saturateVal = 1.0;
  let invertVal = 0.0;

  // Track transforms for per-pixel LUT
  const nodeOrder = hasCycle ? graph.nodes : sortedIds.map((id) => nodeMap.get(id)!).filter(Boolean);

  for (const node of nodeOrder) {
    const p = node.params;
    switch (node.kind) {
      case 'BrightnessContrast':
        if (p.brightness !== undefined) brightnessVal += p.brightness;
        if (p.contrast !== undefined) contrastVal *= p.contrast;
        break;
      case 'HueSaturation':
        if (p.hueShiftDeg !== undefined) hueRotateDeg += p.hueShiftDeg;
        if (p.saturation !== undefined) saturateVal *= p.saturation;
        break;
      case 'Invert':
        if (p.invertAmount !== undefined) invertVal = Math.max(invertVal, p.invertAmount);
        break;
    }
  }

  const filterParts: string[] = [];
  if (Math.abs(brightnessVal - 1.0) > 0.01) filterParts.push(`brightness(${brightnessVal.toFixed(3)})`);
  if (Math.abs(contrastVal - 1.0) > 0.01) filterParts.push(`contrast(${contrastVal.toFixed(3)})`);
  if (Math.abs(hueRotateDeg) > 0.1) filterParts.push(`hue-rotate(${hueRotateDeg.toFixed(1)}deg)`);
  if (Math.abs(saturateVal - 1.0) > 0.01) filterParts.push(`saturate(${saturateVal.toFixed(3)})`);
  if (invertVal > 0.01) filterParts.push(`invert(${invertVal.toFixed(2)})`);

  const cssFilter = filterParts.join(' ') || 'none';

  // Per-pixel RGBA processing function
  const transformRgba = (
    r: number,
    g: number,
    b: number,
    a: number
  ): [number, number, number, number] => {
    let rf = r / 255;
    let gf = g / 255;
    let bf = b / 255;
    let af = a / 255;

    for (const node of nodeOrder) {
      const p = node.params;
      switch (node.kind) {
        case 'BrightnessContrast': {
          const br = p.brightness || 0;
          const ct = p.contrast !== undefined ? p.contrast : 1;
          rf = Math.max(0, Math.min(1, (rf - 0.5) * ct + 0.5 + br));
          gf = Math.max(0, Math.min(1, (gf - 0.5) * ct + 0.5 + br));
          bf = Math.max(0, Math.min(1, (bf - 0.5) * ct + 0.5 + br));
          break;
        }

        case 'HueSaturation': {
          if (p.hueShiftDeg || (p.saturation !== undefined && p.saturation !== 1)) {
            const hsl = rgbToHsl(rf * 255, gf * 255, bf * 255);
            const newH = hsl.h + (p.hueShiftDeg || 0);
            const newS = Math.max(0, Math.min(1, hsl.s * (p.saturation !== undefined ? p.saturation : 1)));
            const newRgb = hslToRgb(newH, newS, hsl.l);
            rf = newRgb.r / 255;
            gf = newRgb.g / 255;
            bf = newRgb.b / 255;
          }
          break;
        }

        case 'Levels': {
          const bp = Math.max(0, Math.min(0.99, p.levelsBlack || 0));
          const wp = Math.max(bp + 0.01, Math.min(1.0, p.levelsWhite !== undefined ? p.levelsWhite : 1));
          const gm = Math.max(0.1, p.levelsGamma || 1);
          const invGamma = 1 / gm;

          const remap = (v: number) => {
            const norm = Math.max(0, Math.min(1, (v - bp) / (wp - bp)));
            return Math.pow(norm, invGamma);
          };

          rf = remap(rf);
          gf = remap(gf);
          bf = remap(bf);
          break;
        }

        case 'Curves': {
          if (p.curveKnots && p.curveKnots.length === 5) {
            const knots = p.curveKnots;
            const evalCurve = (v: number) => {
              const seg = Math.max(0, Math.min(3, Math.floor(v * 4)));
              const t = v * 4 - seg;
              const k0 = knots[seg];
              const k1 = knots[seg + 1];
              return Math.max(0, Math.min(1, k0 + (k1 - k0) * t));
            };
            rf = evalCurve(rf);
            gf = evalCurve(gf);
            bf = evalCurve(bf);
          }
          break;
        }

        case 'Tint': {
          if (p.tintColor) {
            const tc = hexToRgb(p.tintColor);
            const amount = p.tintAmount !== undefined ? p.tintAmount : 1;
            const tr = (tc.r / 255) * amount + (1 - amount);
            const tg = (tc.g / 255) * amount + (1 - amount);
            const tb = (tc.b / 255) * amount + (1 - amount);
            rf = Math.min(1, rf * tr);
            gf = Math.min(1, gf * tg);
            bf = Math.min(1, bf * tb);
          }
          break;
        }

        case 'Invert': {
          const inv = p.invertAmount !== undefined ? p.invertAmount : 1;
          rf = rf * (1 - inv) + (1 - rf) * inv;
          gf = gf * (1 - inv) + (1 - gf) * inv;
          bf = bf * (1 - inv) + (1 - bf) * inv;
          break;
        }

        case 'Posterize': {
          const steps = Math.max(2, p.posterizeLevels || 6);
          const post = (v: number) => Math.round(v * (steps - 1)) / (steps - 1);
          rf = post(rf);
          gf = post(gf);
          bf = post(bf);
          break;
        }

        case 'Mask': {
          // Matte alpha by luma (Rec. 709)
          const luma = 0.2126 * rf + 0.7152 * gf + 0.0722 * bf;
          af = Math.max(0, Math.min(1, af * luma));
          break;
        }
      }
    }

    return [
      Math.round(rf * 255),
      Math.round(gf * 255),
      Math.round(bf * 255),
      Math.round(af * 255),
    ];
  };

  return { cssFilter, transformRgba };
}

// ============================================================================
// 7. BUILT-IN PROCEDURAL GENERATORS (Canvas2D)
// ============================================================================

export function renderProceduralGenerator(
  ctx: CanvasRenderingContext2D,
  bbox: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number },
  gen: ShapeSceneAssignment['generator'],
  timeSec: number
): void {
  const { minX, minY, width, height } = bbox;
  const speed = gen.speed || 1.0;
  const scale = gen.scale || 1.0;
  const t = timeSec * speed;

  switch (gen.type) {
    case 'solid': {
      ctx.fillStyle = gen.primaryColor;
      ctx.fillRect(minX, minY, width, height);
      break;
    }

    case 'gradient': {
      const angleRad = ((gen.angleDeg || 0) * Math.PI) / 180;
      const cos = Math.cos(angleRad);
      const sin = Math.sin(angleRad);
      const cx = minX + width / 2;
      const cy = minY + height / 2;
      const len = Math.max(width, height) / 2;

      const x0 = cx - cos * len;
      const y0 = cy - sin * len;
      const x1 = cx + cos * len;
      const y1 = cy + sin * len;

      const grad = ctx.createLinearGradient(x0, y0, x1, y1);
      grad.addColorStop(0, gen.primaryColor);
      if (gen.tertiaryColor) {
        grad.addColorStop(0.5, gen.secondaryColor);
        grad.addColorStop(1, gen.tertiaryColor);
      } else {
        grad.addColorStop(1, gen.secondaryColor);
      }

      ctx.fillStyle = grad;
      ctx.fillRect(minX, minY, width, height);
      break;
    }

    case 'stripes': {
      ctx.fillStyle = gen.secondaryColor;
      ctx.fillRect(minX, minY, width, height);

      ctx.save();
      ctx.translate(minX, minY);
      const stripeWidth = Math.max(8, 28 * scale);
      const angleRad = ((gen.angleDeg || 45) * Math.PI) / 180;
      ctx.rotate(angleRad);

      const offset = (t * 40) % (stripeWidth * 2);
      ctx.fillStyle = gen.primaryColor;

      const diag = Math.sqrt(width * width + height * height) * 2;
      for (let x = -diag + offset; x < diag * 2; x += stripeWidth * 2) {
        ctx.fillRect(x, -diag, stripeWidth, diag * 3);
      }
      ctx.restore();
      break;
    }

    case 'checkerboard': {
      const cellSize = Math.max(10, 32 * scale);
      const offset = (t * 15) % (cellSize * 2);

      ctx.fillStyle = gen.secondaryColor;
      ctx.fillRect(minX, minY, width, height);

      ctx.fillStyle = gen.primaryColor;
      const startX = minX - (cellSize * 2) + offset;
      const startY = minY - (cellSize * 2) + offset;

      for (let x = startX; x < minX + width + cellSize * 2; x += cellSize) {
        for (let y = startY; y < minY + height + cellSize * 2; y += cellSize) {
          const ix = Math.floor((x - offset) / cellSize);
          const iy = Math.floor((y - offset) / cellSize);
          if ((ix + iy) % 2 === 0) {
            ctx.fillRect(x, y, cellSize, cellSize);
          }
        }
      }
      break;
    }

    case 'plasma': {
      // Trigonometric color wave
      const grad = ctx.createRadialGradient(
        minX + width * (0.5 + 0.3 * Math.sin(t * 0.8)),
        minY + height * (0.5 + 0.3 * Math.cos(t * 0.9)),
        10,
        minX + width / 2,
        minY + height / 2,
        Math.max(width, height)
      );
      grad.addColorStop(0, gen.primaryColor);
      grad.addColorStop(0.5, gen.secondaryColor);
      grad.addColorStop(1, gen.tertiaryColor || gen.primaryColor);

      ctx.fillStyle = grad;
      ctx.fillRect(minX, minY, width, height);
      break;
    }

    case 'simplex-noise':
    default: {
      // Shimmering multi-layer frost noise emulation
      ctx.fillStyle = gen.secondaryColor;
      ctx.fillRect(minX, minY, width, height);

      const grad1 = ctx.createLinearGradient(minX, minY, minX + width, minY + height);
      grad1.addColorStop(0, gen.primaryColor);
      grad1.addColorStop(1, 'transparent');
      ctx.fillStyle = grad1;
      ctx.fillRect(minX, minY, width, height);

      const pulse = 0.5 + 0.5 * Math.sin(t * 1.5);
      const grad2 = ctx.createRadialGradient(
        minX + width / 2,
        minY + height / 2,
        5,
        minX + width / 2,
        minY + height / 2,
        Math.max(width, height) * (0.5 + 0.2 * pulse)
      );
      grad2.addColorStop(0, gen.tertiaryColor || '#FFFFFF');
      grad2.addColorStop(1, 'transparent');
      ctx.fillStyle = grad2;
      ctx.fillRect(minX, minY, width, height);
      break;
    }
  }
}

// ============================================================================
// 8. SIGNATURE HOLIDAY PROCEDURAL EFFECTS (Canvas2D)
// ============================================================================

export function renderBorderChaseBulbs(
  ctx: CanvasRenderingContext2D,
  vertices: VectorVertex[],
  decor: ShapeSceneAssignment['decorEffect'],
  timeSec: number
): void {
  if (vertices.length < 2) return;

  const bulbSpacing = Math.max(12, decor.bulbSpacingPx || 24);
  const bulbSize = Math.max(4, decor.bulbSizePx || 6);
  const chaseSpeed = decor.chaseSpeed || 1.5;
  const colors = decor.colors.length > 0 ? decor.colors : ['#D91E36', '#0B6E4F', '#F4B942', '#FFF4E0'];

  // Calculate perimeter edges & lengths
  const segments: { p1: VectorVertex; p2: VectorVertex; length: number }[] = [];
  let totalLength = 0;

  for (let i = 0; i < vertices.length; i++) {
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % vertices.length];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    segments.push({ p1, p2, length: len });
    totalLength += len;
  }

  if (totalLength === 0) return;

  const totalBulbs = Math.max(4, Math.floor(totalLength / bulbSpacing));
  const chasePhase = (timeSec * chaseSpeed * 6) % colors.length;

  // Draw wire
  ctx.save();
  ctx.strokeStyle = 'rgba(10, 40, 20, 0.7)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(vertices[0].x, vertices[0].y);
  for (let i = 1; i < vertices.length; i++) {
    ctx.lineTo(vertices[i].x, vertices[i].y);
  }
  ctx.closePath();
  ctx.stroke();

  // Distribute bulbs along perimeter
  for (let b = 0; b < totalBulbs; b++) {
    const targetDist = (b * totalLength) / totalBulbs;
    let accumulated = 0;
    let bx = vertices[0].x;
    let by = vertices[0].y;

    for (const seg of segments) {
      if (accumulated + seg.length >= targetDist) {
        const t = (targetDist - accumulated) / Math.max(1, seg.length);
        bx = seg.p1.x + (seg.p2.x - seg.p1.x) * t;
        by = seg.p1.y + (seg.p2.y - seg.p1.y) * t;
        break;
      }
      accumulated += seg.length;
    }

    // Determine animated color & intensity
    const colorIdx = Math.floor((b + chasePhase) % colors.length);
    const bulbColor = colors[colorIdx];

    // Pulsing glow halo
    const glowRadius = bulbSize * 3.5;
    const glowGrad = ctx.createRadialGradient(bx, by, bulbSize * 0.5, bx, by, glowRadius);
    glowGrad.addColorStop(0, bulbColor);
    glowGrad.addColorStop(0.5, `${bulbColor}66`);
    glowGrad.addColorStop(1, 'transparent');

    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(bx, by, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Bulb glass body
    ctx.fillStyle = bulbColor;
    ctx.beginPath();
    ctx.arc(bx, by, bulbSize, 0, Math.PI * 2);
    ctx.fill();

    // Hot white filament center
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(bx, by, bulbSize * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function renderIcicleDrip(
  ctx: CanvasRenderingContext2D,
  vertices: VectorVertex[],
  decor: ShapeSceneAssignment['decorEffect'],
  timeSec: number
): void {
  if (vertices.length < 2) return;

  const maxLen = decor.icicleLengthPx || 28;
  const icicleSpacing = 16;

  ctx.save();

  // Find downward-facing edges (where standard polygon winding normal points downwards, i.e. dy/dx)
  for (let i = 0; i < vertices.length; i++) {
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % vertices.length];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    // Normal pointing down: nx = -dy/len, ny = dx/len. If ny > 0.1, it faces downward!
    if (len > 10 && dx > 0) {
      const icicleCount = Math.floor(len / icicleSpacing);

      for (let k = 1; k < icicleCount; k++) {
        const t = k / icicleCount;
        const x = p1.x + dx * t;
        const y = p1.y + dy * t;

        // Deterministic pseudo-random variation based on index
        const hash = ((k * 9301 + 49297) % 233280) / 233280;
        const thisLen = maxLen * (0.6 + 0.4 * hash);

        // Draw translucent blue-white tapering icicle
        const grad = ctx.createLinearGradient(x, y, x, y + thisLen);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        grad.addColorStop(0.6, 'rgba(180, 240, 255, 0.85)');
        grad.addColorStop(1, 'rgba(120, 210, 255, 0.3)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x - 3, y);
        ctx.lineTo(x + 3, y);
        ctx.lineTo(x, y + thisLen);
        ctx.closePath();
        ctx.fill();

        // Animated water drip
        const dripCycleDuration = 3.0 + hash * 2.0;
        const dripTime = (timeSec + hash * 5.0) % dripCycleDuration;
        const dripProgress = dripTime / dripCycleDuration;

        if (dripProgress > 0.6) {
          const fallT = (dripProgress - 0.6) / 0.4;
          const dropY = y + thisLen + Math.pow(fallT, 1.8) * 35;
          const dropAlpha = 1.0 - fallT;

          ctx.fillStyle = `rgba(220, 250, 255, ${dropAlpha.toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(x, dropY, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  ctx.restore();
}

export function renderWindowSilhouette(
  ctx: CanvasRenderingContext2D,
  bbox: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number },
  silhouetteType: WindowSilhouetteType,
  timeSec: number
): void {
  const { minX, minY, width, height } = bbox;
  const cx = minX + width / 2;
  const cy = minY + height / 2;
  const sz = Math.min(width, height);

  ctx.save();
  ctx.fillStyle = '#110D18'; // Dark theatrical silhouette against warm interior window glow

  switch (silhouetteType) {
    case 'santa-walking': {
      // Santa profile walking across window
      const walkCycle = (timeSec * 1.2) % (Math.PI * 2);
      const bob = Math.sin(walkCycle * 2) * (sz * 0.03);
      const walkX = cx + Math.sin(timeSec * 0.4) * (width * 0.15);
      const walkY = cy + bob + sz * 0.05;

      // Body (round belly)
      ctx.beginPath();
      ctx.arc(walkX, walkY, sz * 0.24, 0, Math.PI * 2);
      ctx.fill();

      // Head with beard & cap
      ctx.beginPath();
      ctx.arc(walkX + sz * 0.04, walkY - sz * 0.24, sz * 0.11, 0, Math.PI * 2);
      ctx.fill();

      // Cap tip & pom-pom
      ctx.beginPath();
      ctx.moveTo(walkX, walkY - sz * 0.28);
      ctx.lineTo(walkX - sz * 0.18, walkY - sz * 0.26);
      ctx.lineTo(walkX + sz * 0.08, walkY - sz * 0.35);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.arc(walkX - sz * 0.18, walkY - sz * 0.26, sz * 0.04, 0, Math.PI * 2);
      ctx.fill();

      // Toy sack over shoulder
      ctx.beginPath();
      ctx.arc(walkX - sz * 0.22, walkY - sz * 0.08, sz * 0.18, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'elves-workshop': {
      // Elf hammering a gift on workbench
      const hammerT = (timeSec * 4) % (Math.PI * 2);
      const armRot = Math.sin(hammerT) * 0.35;

      // Workbench
      ctx.fillRect(cx - sz * 0.4, cy + sz * 0.15, sz * 0.8, sz * 0.1);
      ctx.fillRect(cx - sz * 0.35, cy + sz * 0.25, sz * 0.08, sz * 0.25);
      ctx.fillRect(cx + sz * 0.27, cy + sz * 0.25, sz * 0.08, sz * 0.25);

      // Elf body & pointed hat
      ctx.beginPath();
      ctx.arc(cx - sz * 0.15, cy + sz * 0.05, sz * 0.13, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx - sz * 0.15, cy - sz * 0.12, sz * 0.08, 0, Math.PI * 2);
      ctx.fill();

      // Pointed cap
      ctx.beginPath();
      ctx.moveTo(cx - sz * 0.22, cy - sz * 0.16);
      ctx.lineTo(cx - sz * 0.08, cy - sz * 0.16);
      ctx.lineTo(cx - sz * 0.25, cy - sz * 0.32);
      ctx.closePath();
      ctx.fill();

      // Arm with hammer
      ctx.save();
      ctx.translate(cx - sz * 0.08, cy - sz * 0.02);
      ctx.rotate(armRot);
      ctx.fillRect(0, -sz * 0.04, sz * 0.18, sz * 0.05);
      ctx.fillRect(sz * 0.15, -sz * 0.1, sz * 0.06, sz * 0.12);
      ctx.restore();
      break;
    }

    case 'spinning-tree': {
      // Layered Christmas tree with star and rotating garland
      const spin = (timeSec * 0.8) % (Math.PI * 2);

      // Tree canopy tiers
      ctx.beginPath();
      // Top tier
      ctx.moveTo(cx, cy - sz * 0.35);
      ctx.lineTo(cx + sz * 0.2, cy - sz * 0.15);
      ctx.lineTo(cx - sz * 0.2, cy - sz * 0.15);
      // Mid tier
      ctx.moveTo(cx, cy - sz * 0.2);
      ctx.lineTo(cx + sz * 0.3, cy + sz * 0.08);
      ctx.lineTo(cx - sz * 0.3, cy + sz * 0.08);
      // Bottom tier
      ctx.moveTo(cx, cy + sz * 0.02);
      ctx.lineTo(cx + sz * 0.4, cy + sz * 0.32);
      ctx.lineTo(cx - sz * 0.4, cy + sz * 0.32);
      ctx.closePath();
      ctx.fill();

      // Trunk
      ctx.fillRect(cx - sz * 0.07, cy + sz * 0.32, sz * 0.14, sz * 0.15);

      // Star on top
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      for (let p = 0; p < 10; p++) {
        const rad = p % 2 === 0 ? sz * 0.09 : sz * 0.04;
        const angle = (p * Math.PI) / 5 - Math.PI / 2;
        const px = cx + Math.cos(angle) * rad;
        const py = cy - sz * 0.38 + Math.sin(angle) * rad;
        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      // Spinning garland beads
      ctx.fillStyle = '#FFFFFF';
      for (let g = 0; g < 6; g++) {
        const t = (spin + (g * Math.PI) / 3) % (Math.PI * 2);
        const gx = cx + Math.cos(t) * (sz * 0.22);
        const gy = cy - sz * 0.05 + Math.sin(t) * (sz * 0.08) + g * (sz * 0.05);
        ctx.beginPath();
        ctx.arc(gx, gy, sz * 0.025, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'bethlehem-star': {
      // Radiant 8-point star with pulsating rays
      const pulse = 1.0 + 0.15 * Math.sin(timeSec * 3);
      const starR = sz * 0.32 * pulse;

      // Glow rays
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, starR * 1.5);
      grad.addColorStop(0, '#FFFDF0');
      grad.addColorStop(0.3, 'rgba(255, 230, 140, 0.8)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, starR * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Star polygon
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      for (let p = 0; p < 16; p++) {
        const isLongRay = p % 4 === 0;
        const isMidRay = p % 2 === 0;
        const rad = isLongRay ? starR : isMidRay ? starR * 0.55 : starR * 0.25;
        const angle = (p * Math.PI) / 8 - Math.PI / 2;
        const px = cx + Math.cos(angle) * rad;
        const py = cy + Math.sin(angle) * rad;
        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'spooky-cat': {
      // Arched Halloween cat with tail flick
      const tailAngle = Math.sin(timeSec * 3) * 0.4;

      // Body (arched oval)
      ctx.beginPath();
      ctx.ellipse(cx, cy + sz * 0.08, sz * 0.22, sz * 0.14, -0.15, 0, Math.PI * 2);
      ctx.fill();

      // Head & ears
      ctx.beginPath();
      ctx.arc(cx - sz * 0.18, cy - sz * 0.02, sz * 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Pointed ears
      ctx.beginPath();
      ctx.moveTo(cx - sz * 0.26, cy - sz * 0.08);
      ctx.lineTo(cx - sz * 0.22, cy - sz * 0.24);
      ctx.lineTo(cx - sz * 0.15, cy - sz * 0.1);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cx - sz * 0.18, cy - sz * 0.1);
      ctx.lineTo(cx - sz * 0.12, cy - sz * 0.24);
      ctx.lineTo(cx - sz * 0.08, cy - sz * 0.08);
      ctx.closePath();
      ctx.fill();

      // Glowing slit eyes
      ctx.fillStyle = '#39FF14';
      ctx.beginPath();
      ctx.ellipse(cx - sz * 0.22, cy - sz * 0.02, sz * 0.02, sz * 0.04, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - sz * 0.14, cy - sz * 0.02, sz * 0.02, sz * 0.04, 0, 0, Math.PI * 2);
      ctx.fill();

      // Curving tail
      ctx.fillStyle = '#110D18';
      ctx.save();
      ctx.translate(cx + sz * 0.18, cy + sz * 0.08);
      ctx.rotate(tailAngle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(sz * 0.1, -sz * 0.2, sz * 0.25, -sz * 0.25, sz * 0.2, -sz * 0.4);
      ctx.lineWidth = sz * 0.06;
      ctx.strokeStyle = '#110D18';
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'dancing-skeleton': {
      // Dancing fun skeleton
      const danceT = timeSec * 4;
      const sway = Math.sin(danceT) * (sz * 0.08);
      const arm1 = Math.sin(danceT) * 0.5;
      const arm2 = Math.cos(danceT) * 0.5;

      ctx.strokeStyle = '#E2E8F0';
      ctx.fillStyle = '#E2E8F0';
      ctx.lineWidth = Math.max(2, sz * 0.04);
      ctx.lineCap = 'round';

      // Skull
      ctx.beginPath();
      ctx.arc(cx + sway, cy - sz * 0.22, sz * 0.09, 0, Math.PI * 2);
      ctx.fill();

      // Eye sockets
      ctx.fillStyle = '#110D18';
      ctx.beginPath();
      ctx.arc(cx + sway - sz * 0.03, cy - sz * 0.23, sz * 0.02, 0, Math.PI * 2);
      ctx.arc(cx + sway + sz * 0.03, cy - sz * 0.23, sz * 0.02, 0, Math.PI * 2);
      ctx.fill();

      // Spine & ribs
      ctx.strokeStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.moveTo(cx + sway, cy - sz * 0.12);
      ctx.lineTo(cx + sway * 0.5, cy + sz * 0.08);
      ctx.stroke();

      for (let r = 0; r < 3; r++) {
        const ry = cy - sz * 0.08 + r * (sz * 0.05);
        ctx.beginPath();
        ctx.moveTo(cx + sway - sz * 0.08, ry);
        ctx.lineTo(cx + sway + sz * 0.08, ry);
        ctx.stroke();
      }

      // Arms dancing
      ctx.beginPath();
      ctx.moveTo(cx + sway, cy - sz * 0.08);
      ctx.lineTo(cx + sway - sz * 0.16, cy - sz * 0.08 + arm1 * sz * 0.15);
      ctx.lineTo(cx + sway - sz * 0.22, cy - sz * 0.2 + arm1 * sz * 0.2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx + sway, cy - sz * 0.08);
      ctx.lineTo(cx + sway + sz * 0.16, cy - sz * 0.08 + arm2 * sz * 0.15);
      ctx.lineTo(cx + sway + sz * 0.22, cy - sz * 0.2 + arm2 * sz * 0.2);
      ctx.stroke();

      // Legs dancing
      ctx.beginPath();
      ctx.moveTo(cx + sway * 0.5, cy + sz * 0.08);
      ctx.lineTo(cx - sz * 0.12, cy + sz * 0.25);
      ctx.lineTo(cx - sz * 0.14, cy + sz * 0.4);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx + sway * 0.5, cy + sz * 0.08);
      ctx.lineTo(cx + sz * 0.12, cy + sz * 0.25);
      ctx.lineTo(cx + sz * 0.14, cy + sz * 0.4);
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

export function renderSantaFlyover(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number
): void {
  // 12-second repeating flyover arc across sky
  const flyoverDuration = 12.0;
  const loopT = timeSec % flyoverDuration;
  if (loopT > 8.0) return; // 4 seconds downtime between passes

  const progress = loopT / 8.0; // 0 to 1
  const startX = -120;
  const endX = width + 120;
  const currX = startX + (endX - startX) * progress;

  // Parabolic flight trajectory
  const baselineY = height * 0.22;
  const arcLift = Math.sin(progress * Math.PI) * (height * 0.12);
  const currY = baselineY - arcLift;

  ctx.save();

  // Golden stardust sparkle trail
  ctx.fillStyle = '#FFD700';
  for (let s = 0; s < 30; s++) {
    const lag = (s / 30) * 160;
    const trailX = currX - lag + (Math.sin(s * 7.1 + timeSec * 10) * 12);
    const trailY = currY + (Math.cos(s * 3.3 + timeSec * 8) * 16) + (lag * 0.15);
    const sparkAlpha = Math.max(0, 1.0 - s / 30);
    const sparkRadius = Math.max(1, 4 * (1 - s / 30));

    ctx.fillStyle = `rgba(255, 215, 0, ${sparkAlpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(trailX, trailY, sparkRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw Sleigh Silhouette
  ctx.fillStyle = '#1A0E2E';
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 1.5;

  // Sleigh body
  ctx.beginPath();
  ctx.arc(currX - 25, currY + 6, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(currX - 45, currY + 8);
  ctx.bezierCurveTo(currX - 35, currY + 18, currX - 10, currY + 18, currX - 5, currY + 8);
  ctx.lineTo(currX - 5, currY - 2);
  ctx.lineTo(currX - 45, currY + 2);
  ctx.closePath();
  ctx.fill();

  // Runners
  ctx.beginPath();
  ctx.moveTo(currX - 48, currY + 18);
  ctx.lineTo(currX - 2, currY + 18);
  ctx.arc(currX - 2, currY + 14, 4, Math.PI / 2, -Math.PI / 2, true);
  ctx.stroke();

  // Santa in sleigh
  ctx.fillStyle = '#D91E36';
  ctx.beginPath();
  ctx.arc(currX - 22, currY - 4, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFF4E0';
  ctx.beginPath();
  ctx.arc(currX - 22, currY - 11, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Reindeer in front
  const deerOffsets = [24, 52, 80];
  ctx.fillStyle = '#1A0E2E';

  for (let d = 0; d < deerOffsets.length; d++) {
    const dx = currX + deerOffsets[d];
    const trot = Math.sin(timeSec * 15 + d) * 3;
    const dy = currY + trot;

    // Deer body
    ctx.beginPath();
    ctx.ellipse(dx, dy, 9, 5, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Deer neck & head
    ctx.beginPath();
    ctx.ellipse(dx + 8, dy - 6, 4, 3, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Antlers
    ctx.strokeStyle = '#1A0E2E';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(dx + 9, dy - 8);
    ctx.lineTo(dx + 13, dy - 14);
    ctx.moveTo(dx + 11, dy - 11);
    ctx.lineTo(dx + 8, dy - 14);
    ctx.stroke();

    // Reindeer harness lead line
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
    ctx.beginPath();
    ctx.moveTo(currX - 5, currY + 4);
    ctx.lineTo(dx, dy);
    ctx.stroke();

    // Rudolph red nose on lead deer
    if (d === deerOffsets.length - 1) {
      ctx.fillStyle = '#FF0033';
      ctx.beginPath();
      ctx.arc(dx + 12, dy - 5, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

export function renderParticleOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  overlay: SceneParticleOverlay,
  timeSec: number
): void {
  if (overlay === 'none') return;

  ctx.save();

  switch (overlay) {
    case 'gentle-snow': {
      const count = 120;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      for (let i = 0; i < count; i++) {
        const hash = ((i * 12345 + 6789) % 100000) / 100000;
        const speed = 25 + hash * 35;
        const x = (hash * width + Math.sin(timeSec * 1.5 + i) * 20) % width;
        const y = (timeSec * speed + hash * height) % height;
        const r = 1.5 + hash * 2.5;

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'blizzard': {
      const count = 220;
      ctx.strokeStyle = 'rgba(240, 250, 255, 0.75)';
      ctx.lineWidth = 1.8;
      for (let i = 0; i < count; i++) {
        const hash = ((i * 54321 + 13579) % 100000) / 100000;
        const speed = 180 + hash * 160;
        const x = (timeSec * speed * 0.8 + hash * width * 1.5) % (width + 200) - 100;
        const y = (timeSec * speed * 0.6 + hash * height) % height;
        const len = 12 + hash * 16;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + len, y + len * 0.75);
        ctx.stroke();
      }
      break;
    }

    case 'rising-embers': {
      const count = 70;
      for (let i = 0; i < count; i++) {
        const hash = ((i * 98765 + 4321) % 100000) / 100000;
        const speed = 30 + hash * 50;
        const x = (hash * width + Math.sin(timeSec * 2 + i) * 30) % width;
        const y = height - ((timeSec * speed + hash * height) % height);
        const r = 1.5 + hash * 3;
        const alpha = Math.max(0.1, 1.0 - (height - y) / height);

        ctx.fillStyle = hash > 0.4 ? `rgba(255, 120, 20, ${alpha})` : `rgba(255, 220, 40, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'nye-confetti': {
      const count = 100;
      const confColors = ['#FFD700', '#FF007F', '#00F0FF', '#7FFF00', '#FFFFFF'];
      for (let i = 0; i < count; i++) {
        const hash = ((i * 31415 + 9265) % 100000) / 100000;
        const speed = 40 + hash * 60;
        const x = (hash * width + Math.sin(timeSec * 3 + i) * 25) % width;
        const y = (timeSec * speed + hash * height) % height;
        const rot = timeSec * 5 + i;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.fillStyle = confColors[i % confColors.length];
        ctx.fillRect(-4, -2, 8, 4);
        ctx.restore();
      }
      break;
    }

    case 'fireflies': {
      const count = 35;
      for (let i = 0; i < count; i++) {
        const hash = ((i * 7777 + 999) % 100000) / 100000;
        const x = (hash * width + Math.sin(timeSec * 0.8 + i * 2) * 40) % width;
        const y = (hash * height + Math.cos(timeSec * 0.6 + i * 1.5) * 30) % height;
        const glow = 0.5 + 0.5 * Math.sin(timeSec * 3.5 + hash * 10);
        const r = 2.5 + glow * 2;

        const grad = ctx.createRadialGradient(x, y, 1, x, y, r * 3);
        grad.addColorStop(0, '#E8FF59');
        grad.addColorStop(0.5, 'rgba(160, 255, 50, 0.4)');
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'falling-leaves': {
      const count = 50;
      const leafColors = ['#D97706', '#B45309', '#DC2626', '#92400E'];
      for (let i = 0; i < count; i++) {
        const hash = ((i * 24680 + 1357) % 100000) / 100000;
        const speed = 35 + hash * 40;
        const x = (hash * width + Math.sin(timeSec * 1.8 + i) * 50) % width;
        const y = (timeSec * speed + hash * height) % height;
        const rot = timeSec * 2 + hash * 10;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.fillStyle = leafColors[i % leafColors.length];
        ctx.beginPath();
        ctx.ellipse(0, 0, 7, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      break;
    }
  }

  ctx.restore();
}

// ============================================================================
// 9. REAL-TIME CANVAS2D RENDER ENGINE (renderSceneOnHouseCanvas)
// ============================================================================

export function renderSceneOnHouseCanvas(
  canvas: HTMLCanvasElement,
  layers: VectorLayer[],
  scene: MpsScene,
  timeSeconds: number,
  options?: {
    showOutlines?: boolean;
    activeLayerId?: string;
  }
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  // Clear canvas background to outdoor twilight darkness
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#070B12';
  ctx.fillRect(0, 0, w, h);

  // Evaluate FX Graph CSS Filter
  const { cssFilter } = evaluateFxGraphCssFilterAndLut(scene.fxGraph);
  ctx.filter = cssFilter !== 'none' ? cssFilter : 'none';

  // Render each vector layer with its generator & signature decor effect
  for (const layer of layers) {
    if (!layer.visible || layer.vertices.length < 3) continue;

    const assignment = scene.assignments[layer.id];
    if (!assignment) continue;

    // Calculate bounding box of polygon
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const v of layer.vertices) {
      if (v.x < minX) minX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.x > maxX) maxX = v.x;
      if (v.y > maxY) maxY = v.y;
    }

    const bbox = {
      minX,
      minY,
      maxX,
      maxY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    };

    ctx.save();
    ctx.globalAlpha = assignment.opacity ?? 0.95;
    ctx.globalCompositeOperation = assignment.blendMode || 'source-over';

    // 1. Clip inside polygon
    ctx.beginPath();
    ctx.moveTo(layer.vertices[0].x, layer.vertices[0].y);
    for (let i = 1; i < layer.vertices.length; i++) {
      ctx.lineTo(layer.vertices[i].x, layer.vertices[i].y);
    }
    ctx.closePath();
    ctx.clip();

    // 2. Render Procedural Generator (Solid, Gradient, Plasma, Stripes, etc.)
    renderProceduralGenerator(ctx, bbox, assignment.generator, timeSeconds);

    // 3. Render In-Shape Silhouette or Twinkle / Candle effects
    if (assignment.decorEffect.type === 'window-silhouette') {
      renderWindowSilhouette(ctx, bbox, assignment.decorEffect.silhouette, timeSeconds);
    } else if (assignment.decorEffect.type === 'candle-flicker') {
      const flicker = 0.5 + 0.5 * (Math.sin(timeSeconds * 5.3) * 0.6 + Math.cos(timeSeconds * 11.7) * 0.4);
      const rad = ctx.createRadialGradient(
        bbox.minX + bbox.width / 2,
        bbox.minY + bbox.height / 2,
        2,
        bbox.minX + bbox.width / 2,
        bbox.minY + bbox.height / 2,
        Math.max(bbox.width, bbox.height) * (0.6 + flicker * 0.2)
      );
      rad.addColorStop(0, '#FFF5C0');
      rad.addColorStop(0.4, 'rgba(255, 140, 20, 0.85)');
      rad.addColorStop(1, 'transparent');
      ctx.fillStyle = rad;
      ctx.fillRect(bbox.minX, bbox.minY, bbox.width, bbox.height);
    } else if (assignment.decorEffect.type === 'ornament-twinkle') {
      const count = 16;
      for (let k = 0; k < count; k++) {
        const hx = ((k * 3141 + 1414) % 1000) / 1000;
        const hy = ((k * 2718 + 5828) % 1000) / 1000;
        const px = bbox.minX + hx * bbox.width;
        const py = bbox.minY + hy * bbox.height;
        const tw = 0.5 + 0.5 * Math.sin(timeSeconds * 4.0 + k * 1.5);
        if (tw > 0.3) {
          ctx.fillStyle = `rgba(255, 255, 255, ${tw.toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(px, py, 2.5 + tw * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();

    // 4. Render Edge Effects (Border Chase Bulbs or Icicle Drip) - outside clipping mask so bulbs pop
    if (assignment.decorEffect.type === 'border-chase-bulbs') {
      renderBorderChaseBulbs(ctx, layer.vertices, assignment.decorEffect, timeSeconds);
    } else if (assignment.decorEffect.type === 'icicle-drip') {
      renderIcicleDrip(ctx, layer.vertices, assignment.decorEffect, timeSeconds);
    }

    // 5. Draw Layer Outline / Highlight
    if (options?.showOutlines || options?.activeLayerId === layer.id) {
      ctx.save();
      const isActive = options?.activeLayerId === layer.id;
      ctx.strokeStyle = isActive ? '#00F0FF' : 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = isActive ? 2.5 : 1.0;
      ctx.beginPath();
      ctx.moveTo(layer.vertices[0].x, layer.vertices[0].y);
      for (let i = 1; i < layer.vertices.length; i++) {
        ctx.lineTo(layer.vertices[i].x, layer.vertices[i].y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }

  // Reset filter for scene-wide overlays
  ctx.filter = 'none';

  // 6. Santa Flyover Arc across sky
  if (scene.santaFlyoverActive) {
    renderSantaFlyover(ctx, w, h, timeSeconds);
  }

  // 7. Particle Weather Overlay
  renderParticleOverlay(ctx, w, h, scene.particleOverlay, timeSeconds);
}

// ============================================================================
// 10. LOCAL STORAGE PERSISTENCE & IMPORT/EXPORT (.mpsscenes, .mpspalettes)
// ============================================================================

const SCENES_STORAGE_KEY = 'mps_scenes_library_v1';
const PALETTES_STORAGE_KEY = 'mps_theme_palettes_v1';

export function loadStoredPalettes(): ThemePalette[] {
  try {
    const raw = localStorage.getItem(PALETTES_STORAGE_KEY);
    if (!raw) return BUILT_IN_THEME_PALETTES;
    const parsed: ThemePalette[] = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Merge with built-in presets
      const customOnes = parsed.filter((p) => !BUILT_IN_THEME_PALETTES.some((bp) => bp.id === p.id));
      return [...BUILT_IN_THEME_PALETTES, ...customOnes];
    }
  } catch (err) {
    console.error('Failed to parse stored palettes:', err);
  }
  return BUILT_IN_THEME_PALETTES;
}

export function saveStoredPalettes(palettes: ThemePalette[]): void {
  try {
    localStorage.setItem(PALETTES_STORAGE_KEY, JSON.stringify(palettes));
  } catch (err) {
    console.error('Failed to save palettes:', err);
  }
}

export function loadStoredScenes(layersFallback?: VectorLayer[]): MpsScene[] {
  try {
    const raw = localStorage.getItem(SCENES_STORAGE_KEY);
    if (raw) {
      const parsed: MpsScene[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to parse stored scenes:', err);
  }

  // Generate initial scenes for each built-in theme palette
  const scenes: MpsScene[] = [];
  const layers = layersFallback || [];

  for (let i = 0; i < BUILT_IN_THEME_PALETTES.length; i++) {
    const pal = BUILT_IN_THEME_PALETTES[i];
    scenes.push(autoDecorateScene(layers, pal, 1000 + i * 77));
  }

  return scenes;
}

export function saveStoredScenes(scenes: MpsScene[]): void {
  try {
    localStorage.setItem(SCENES_STORAGE_KEY, JSON.stringify(scenes));
  } catch (err) {
    console.error('Failed to save scenes:', err);
  }
}

export function exportScenesToJson(scenes: MpsScene[]): string {
  return JSON.stringify(
    {
      format: 'MarshallProjectionStudio.ScenesLibrary',
      version: '3.5.0',
      exportedAt: new Date().toISOString(),
      scenes,
    },
    null,
    2
  );
}

export function importScenesFromJson(jsonStr: string): MpsScene[] {
  const parsed = JSON.parse(jsonStr);
  if (parsed.scenes && Array.isArray(parsed.scenes)) {
    return parsed.scenes;
  }
  if (Array.isArray(parsed)) {
    return parsed;
  }
  throw new Error('Invalid .mpsscenes JSON structure');
}

export function exportPalettesToJson(palettes: ThemePalette[]): string {
  return JSON.stringify(
    {
      format: 'MarshallProjectionStudio.ThemePalettes',
      version: '3.5.0',
      exportedAt: new Date().toISOString(),
      palettes,
    },
    null,
    2
  );
}

export function importPalettesFromJson(jsonStr: string): ThemePalette[] {
  const parsed = JSON.parse(jsonStr);
  if (parsed.palettes && Array.isArray(parsed.palettes)) {
    return parsed.palettes;
  }
  if (Array.isArray(parsed)) {
    return parsed;
  }
  throw new Error('Invalid .mpspalettes JSON structure');
}
