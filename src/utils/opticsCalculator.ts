/**
 * opticsCalculator.ts
 * Physical projector optics, throw distance, lens shift, and foot-lambert luminance engine
 * Part of Lumen-Map AI Master Expansion Suite (Features #2, #3, #7)
 */

export interface ProjectorModelPreset {
  id: string;
  brand: string;
  model: string;
  nativeResolution: [number, number];
  ansiLumens: number;
  throwRatioMin: number;
  throwRatioMax: number;
  lensShiftVerticalPercent: number; // e.g. ±50%
  lensShiftHorizontalPercent: number; // e.g. ±15%
  lensType: 'Standard' | 'Short-Throw' | 'Ultra-Short-Throw' | 'Telephoto';
}

export const POPULAR_PROJECTOR_PRESETS: ProjectorModelPreset[] = [
  {
    id: 'benq-tk700sti',
    brand: 'BenQ',
    model: 'TK700STi 4K HDR',
    nativeResolution: [3840, 2160],
    ansiLumens: 3000,
    throwRatioMin: 0.9,
    throwRatioMax: 1.08,
    lensShiftVerticalPercent: 0,
    lensShiftHorizontalPercent: 0,
    lensType: 'Short-Throw',
  },
  {
    id: 'optoma-gt1090hdr',
    brand: 'Optoma',
    model: 'GT1090HDR Laser',
    nativeResolution: [1920, 1080],
    ansiLumens: 4200,
    throwRatioMin: 0.5,
    throwRatioMax: 0.5,
    lensShiftVerticalPercent: 0,
    lensShiftHorizontalPercent: 0,
    lensType: 'Short-Throw',
  },
  {
    id: 'epson-pro-ex11000',
    brand: 'Epson',
    model: 'Pro EX11000 3LCD',
    nativeResolution: [1920, 1080],
    ansiLumens: 4600,
    throwRatioMin: 1.32,
    throwRatioMax: 2.14,
    lensShiftVerticalPercent: 15,
    lensShiftHorizontalPercent: 0,
    lensType: 'Standard',
  },
  {
    id: 'panasonic-pt-mz880',
    brand: 'Panasonic',
    model: 'PT-MZ880 Solid Shine',
    nativeResolution: [1920, 1200],
    ansiLumens: 8000,
    throwRatioMin: 1.61,
    throwRatioMax: 2.76,
    lensShiftVerticalPercent: 67,
    lensShiftHorizontalPercent: 35,
    lensType: 'Standard',
  },
  {
    id: 'epson-eb-pu2220b',
    brand: 'Epson',
    model: 'EB-PU2220B Large Venue',
    nativeResolution: [3840, 2160],
    ansiLumens: 20000,
    throwRatioMin: 1.57,
    throwRatioMax: 2.56,
    lensShiftVerticalPercent: 60,
    lensShiftHorizontalPercent: 18,
    lensType: 'Standard',
  },
  {
    id: 'custom-pro',
    brand: 'Generic / Custom',
    model: 'Outdoor Venue Projector',
    nativeResolution: [1920, 1080],
    ansiLumens: 5000,
    throwRatioMin: 1.15,
    throwRatioMax: 1.5,
    lensShiftVerticalPercent: 20,
    lensShiftHorizontalPercent: 10,
    lensType: 'Standard',
  },
];

export interface OpticsCalculationInput {
  throwDistanceFeet: number;
  throwRatio: number;
  aspectRatio: '16:9' | '16:10' | '4:3';
  ansiLumens: number;
  surfaceGain?: number; // e.g. 1.0 for matte paint, 0.7 for red brick, 1.2 for reflective screen
  ambientLux?: number; // e.g. 5 lux for dark suburban street, 25 lux under streetlight
}

export interface OpticsCalculationResult {
  imageWidthFeet: number;
  imageHeightFeet: number;
  imageAreaSqFt: number;
  footLamberts: number;
  luxOnSurface: number;
  contrastRatioEstimate: number;
  pixelDensityPpi: number; // Pixels per inch on house surface
  recommendationRating: 'EXCELLENT' | 'GOOD' | 'MARGINAL' | 'TOO DIM';
  recommendationNotes: string;
}

/**
 * Computes projection optical dimensions, throw math, surface brightness in Foot-Lamberts,
 * and contrast ratio estimates.
 */
export function calculateProjectorOptics(
  input: OpticsCalculationInput
): OpticsCalculationResult {
  const {
    throwDistanceFeet,
    throwRatio,
    aspectRatio,
    ansiLumens,
    surfaceGain = 0.85,
    ambientLux = 10,
  } = input;

  const aspectNum =
    aspectRatio === '16:9' ? 16 / 9 : aspectRatio === '16:10' ? 16 / 10 : 4 / 3;

  // Image Width = Distance / Throw Ratio
  const imageWidthFeet = Math.max(1, throwDistanceFeet / Math.max(0.2, throwRatio));
  const imageHeightFeet = imageWidthFeet / aspectNum;
  const imageAreaSqFt = Math.max(1, imageWidthFeet * imageHeightFeet);

  // Surface illuminance in Lumens / sq ft (Foot-Candles)
  const footCandles = ansiLumens / imageAreaSqFt;
  // Foot-Lamberts = Foot-Candles * Screen Gain
  const footLamberts = Number((footCandles * surfaceGain).toFixed(1));
  // Lux on Surface = Foot-Candles * 10.764
  const luxOnSurface = Number((footCandles * 10.764).toFixed(0));

  // Contrast Ratio against ambient light
  const contrastRatioEstimate = Number(
    (Math.max(1, (luxOnSurface * surfaceGain + ambientLux) / Math.max(0.1, ambientLux))).toFixed(0)
  );

  // PPI (assuming standard 1080p base resolution: 1920 pixels wide)
  const imageWidthInches = imageWidthFeet * 12;
  const pixelDensityPpi = Number((1920 / Math.max(1, imageWidthInches)).toFixed(2));

  // Rating & advisory notes
  let recommendationRating: OpticsCalculationResult['recommendationRating'] = 'GOOD';
  let recommendationNotes = '';

  if (footLamberts >= 45) {
    recommendationRating = 'EXCELLENT';
    recommendationNotes =
      'Super bright punch! High-contrast pop with vibrant colors even under neighborhood streetlights.';
  } else if (footLamberts >= 22) {
    recommendationRating = 'GOOD';
    recommendationNotes =
      'Standard outdoor theater brightness. Architectural video and animations will be clear and sharp.';
  } else if (footLamberts >= 12) {
    recommendationRating = 'MARGINAL';
    recommendationNotes =
      'Marginal illumination. Dark scenes may wash out if near bright floodlights or porch fixtures.';
  } else {
    recommendationRating = 'TOO DIM';
    recommendationNotes =
      'Too dim for outdoor facade projection. Consider moving projector closer or upgrading to higher ANSI lumens.';
  }

  return {
    imageWidthFeet: Number(imageWidthFeet.toFixed(1)),
    imageHeightFeet: Number(imageHeightFeet.toFixed(1)),
    imageAreaSqFt: Number(imageAreaSqFt.toFixed(1)),
    footLamberts,
    luxOnSurface,
    contrastRatioEstimate,
    pixelDensityPpi,
    recommendationRating,
    recommendationNotes,
  };
}
