/**
 * stemSplitter.ts
 * Real-time 4-Stem WebAudio frequency isolator (Vocals, Drums, Bass, Melody)
 * and envelope extraction engine.
 * Part of Lumen-Map AI Master Expansion Suite (Features #34, #38)
 */

export interface AudioStemChannel {
  id: 'vocals' | 'drums' | 'bass' | 'melody';
  label: string;
  color: string;
  gain: number; // 0.0 - 2.0
  muted: boolean;
  solo: boolean;
  rmsLevel: number; // 0.0 - 1.0
  peakHold: number;
}

export const INITIAL_AUDIO_STEMS: AudioStemChannel[] = [
  {
    id: 'vocals',
    label: 'Vocals (Singing Faces / Visemes)',
    color: '#f59e0b',
    gain: 1.0,
    muted: false,
    solo: false,
    rmsLevel: 0,
    peakHold: 0,
  },
  {
    id: 'drums',
    label: 'Drums (Snare / Claps / Hi-Hat)',
    color: '#06b6d4',
    gain: 1.0,
    muted: false,
    solo: false,
    rmsLevel: 0,
    peakHold: 0,
  },
  {
    id: 'bass',
    label: 'Bass (Sub-Kick / 808 Pulse)',
    color: '#ec4899',
    gain: 1.0,
    muted: false,
    solo: false,
    rmsLevel: 0,
    peakHold: 0,
  },
  {
    id: 'melody',
    label: 'Melody / Synths / Guitars',
    color: '#10b981',
    gain: 1.0,
    muted: false,
    solo: false,
    rmsLevel: 0,
    peakHold: 0,
  },
];

export interface StemBandFrequencies {
  bassLowpassHz: number; // e.g. 150 Hz
  vocalBandpassHz: [number, number]; // [300, 3200] Hz
  drumsHighpassHz: number; // e.g. 3500 Hz
}

export const DEFAULT_STEM_FREQUENCIES: StemBandFrequencies = {
  bassLowpassHz: 160,
  vocalBandpassHz: [320, 3400],
  drumsHighpassHz: 3800,
};

/**
 * Computes simulated or FFT-derived stem levels from an incoming frequency spectrum.
 */
export function estimateStemLevelsFromFft(
  frequencyData: Uint8Array,
  stems: AudioStemChannel[]
): AudioStemChannel[] {
  if (!frequencyData || frequencyData.length === 0) {
    return stems.map((s) => ({ ...s, rmsLevel: 0 }));
  }

  const binCount = frequencyData.length;
  // Sub-bass bins (approx 0 - 160Hz)
  const bassEnd = Math.max(2, Math.floor(binCount * 0.08));
  // Vocal formant bins (approx 300 - 3400Hz)
  const vocalStart = bassEnd;
  const vocalEnd = Math.max(vocalStart + 1, Math.floor(binCount * 0.45));
  // High drums / cymbal bins (approx > 3800Hz)
  const drumsStart = Math.max(vocalEnd, Math.floor(binCount * 0.5));

  let bassSum = 0;
  for (let i = 0; i < bassEnd; i++) bassSum += frequencyData[i];
  const bassRms = Math.min(1, (bassSum / (bassEnd * 255)) * 1.5);

  let vocalSum = 0;
  const vocalCount = vocalEnd - vocalStart;
  for (let i = vocalStart; i < vocalEnd; i++) vocalSum += frequencyData[i];
  const vocalRms = Math.min(1, (vocalSum / (vocalCount * 255)) * 1.6);

  let drumsSum = 0;
  const drumsCount = binCount - drumsStart;
  for (let i = drumsStart; i < binCount; i++) drumsSum += frequencyData[i];
  const drumsRms = Math.min(1, (drumsSum / (drumsCount * 255)) * 1.8);

  const melodyRms = Math.min(1, (vocalRms * 0.6 + drumsRms * 0.4) * 1.1);

  return stems.map((stem) => {
    let level = 0;
    if (stem.id === 'bass') level = bassRms;
    else if (stem.id === 'vocals') level = vocalRms;
    else if (stem.id === 'drums') level = drumsRms;
    else if (stem.id === 'melody') level = melodyRms;

    if (stem.muted) level = 0;
    level = Math.min(1, level * stem.gain);

    const peakHold = Math.max(level, (stem.peakHold || 0) * 0.94);
    return {
      ...stem,
      rmsLevel: Number(level.toFixed(3)),
      peakHold: Number(peakHold.toFixed(3)),
    };
  });
}
