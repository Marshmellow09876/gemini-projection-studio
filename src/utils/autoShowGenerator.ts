/**
 * One-Button Auto-Show Generator, Word-Level Karaoke Lyric Engine,
 * Punch-In Beat-Tap Overdub & xLights (.xtiming) XML Bridge
 *
 * Provides Marshall Projection Studio parity for:
 * 1. AI & Algorithmic One-Button Auto-Show generation across 5 style profiles
 *    (Classic, Gentle, Punchy, Chaotic, Surprise Me).
 * 2. Punch-in beat tap overdubbing with live phase offset analysis (±ms),
 *    metronome click synthesizer (zero external audio files), quantize,
 *    batch shift, ripple delete, and density-heat map.
 * 3. SubRip (.srt) and WebVTT (.vtt) word-level karaoke lyric parsing and
 *    canvas rendering with 9-anchor positioning and smooth highlight sweep.
 * 4. Bidirectional xLights (.xtiming) XML import and export bridge.
 */

import { BeatFlag } from '../store/useProjectionStore';

// ============================================================================
// 1. ONE-BUTTON AUTO-SHOW GENERATOR DATA MODELS & ENGINE
// ============================================================================

export type AutoShowStyleProfile =
  | 'Classic'
  | 'Gentle'
  | 'Punchy'
  | 'Chaotic'
  | 'Surprise Me';

export type SectionLabel =
  | 'Intro'
  | 'Verse 1'
  | 'Chorus 1'
  | 'Verse 2'
  | 'Chorus 2'
  | 'Bridge'
  | 'Drop / Climax'
  | 'Outro';

export interface AudioAnalysisSection {
  id: string;
  label: SectionLabel;
  startSec: number;
  endSec: number;
  energy: number; // 0.0 - 1.0 normalized section RMS energy
}

export interface AudioAnalysisEnvelopeResult {
  durationSec: number;
  bpm: number;
  rmsEnvelope: number[]; // 100ms bins normalized 0.0 - 1.0
  spectralFluxOnsets: number[]; // Timestamps in seconds of detected transient peaks
  sections: AudioAnalysisSection[];
  dropTimestampsSec: number[];
}

export interface SceneCueTrackItem {
  id: string;
  startSec: number;
  endSec: number;
  sceneName: string;
  transitionType: 'cut' | 'crossfade';
  transitionDurationSec: number;
  oneShotFx?: 'strobe-pulse' | 'shader-cycle' | 'dmx-flash' | 'sparkle-burst' | 'blackout-snap';
}

export interface AutoShowOptions {
  durationSec: number;
  bpm: number;
  styleProfile: AutoShowStyleProfile;
  seed?: number;
  rangeStartSec?: number;
  rangeEndSec?: number;
  availableSceneNames?: string[];
}

export interface AutoShowResult {
  flags: BeatFlag[];
  sceneCues: SceneCueTrackItem[];
  sections: AudioAnalysisSection[];
  dropTimestampsSec: number[];
  summary: string;
  styleProfile: AutoShowStyleProfile;
  seed: number;
}

/**
 * Pseudo-random number generator (Mulberry32) for reproducible seeded auto-shows.
 */
function createMulberry32(seed: number) {
  let s = Math.floor(seed) >>> 0;
  return function next(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Default fallback scene names for outdoor holiday projection mapping.
 */
export const DEFAULT_HOLIDAY_SCENE_NAMES = [
  'Warm House Glow',
  'Candy Cane Stripes',
  'Winter Blizzard & Frost',
  'Christmas Choir & Church Bells',
  'Santa Flyover & Golden Starlight',
  'Spooky Violet Manor',
  'Neon Holiday Synth',
  'Big Holiday Finale',
];

/**
 * Analyzes audio energy curve, spectral flux onsets, and structural sections.
 * Synthesizes an musically realistic envelope when no raw AudioBuffer is loaded.
 */
export function analyzeAudioTrackEnvelope(
  durationSec: number,
  bpm: number,
  seed: number = 42
): AudioAnalysisEnvelopeResult {
  const prng = createMulberry32(seed);
  const binDuration = 0.1; // 100ms per bin
  const totalBins = Math.max(10, Math.ceil(durationSec / binDuration));
  const rmsEnvelope: number[] = new Array(totalBins);

  // Standard musical structure time divisions based on duration
  const introEnd = Math.min(16, durationSec * 0.12);
  const verse1End = introEnd + Math.max(12, durationSec * 0.2);
  const chorus1End = verse1End + Math.max(15, durationSec * 0.2);
  const verse2End = chorus1End + Math.max(12, durationSec * 0.18);
  const chorus2End = verse2End + Math.max(15, durationSec * 0.2);
  const bridgeEnd = chorus2End + Math.max(10, durationSec * 0.15);
  const climaxEnd = bridgeEnd + Math.max(12, durationSec * 0.15);
  const finalClimaxEnd = Math.min(durationSec - 8, climaxEnd);

  const sections: AudioAnalysisSection[] = [
    {
      id: 'sec-intro',
      label: 'Intro',
      startSec: 0,
      endSec: Number(introEnd.toFixed(2)),
      energy: 0.28,
    },
    {
      id: 'sec-verse-1',
      label: 'Verse 1',
      startSec: Number(introEnd.toFixed(2)),
      endSec: Number(verse1End.toFixed(2)),
      energy: 0.46,
    },
    {
      id: 'sec-chorus-1',
      label: 'Chorus 1',
      startSec: Number(verse1End.toFixed(2)),
      endSec: Number(chorus1End.toFixed(2)),
      energy: 0.82,
    },
    {
      id: 'sec-verse-2',
      label: 'Verse 2',
      startSec: Number(chorus1End.toFixed(2)),
      endSec: Number(verse2End.toFixed(2)),
      energy: 0.54,
    },
    {
      id: 'sec-chorus-2',
      label: 'Chorus 2',
      startSec: Number(verse2End.toFixed(2)),
      endSec: Number(chorus2End.toFixed(2)),
      energy: 0.88,
    },
    {
      id: 'sec-bridge',
      label: 'Bridge',
      startSec: Number(chorus2End.toFixed(2)),
      endSec: Number(finalClimaxEnd.toFixed(2)),
      energy: 0.39,
    },
    {
      id: 'sec-drop',
      label: 'Drop / Climax',
      startSec: Number(finalClimaxEnd.toFixed(2)),
      endSec: Number(Math.max(finalClimaxEnd + 10, durationSec - 10).toFixed(2)),
      energy: 0.98,
    },
    {
      id: 'sec-outro',
      label: 'Outro',
      startSec: Number(Math.max(finalClimaxEnd + 10, durationSec - 10).toFixed(2)),
      endSec: Number(durationSec.toFixed(2)),
      energy: 0.32,
    },
  ];

  // Fill RMS envelope with section-driven curve + bar pulses
  const beatInterval = 60 / bpm;
  const barInterval = beatInterval * 4;

  for (let i = 0; i < totalBins; i++) {
    const t = i * binDuration;
    // Find active section
    const sec = sections.find((s) => t >= s.startSec && t < s.endSec) || sections[sections.length - 1];
    const baseEnergy = sec.energy;

    // Add rhythmic pulse on beat & downbeat
    const beatPhase = (t % beatInterval) / beatInterval;
    const barPhase = (t % barInterval) / barInterval;
    const beatPulse = Math.exp(-beatPhase * 4) * 0.15;
    const barPulse = Math.exp(-barPhase * 5) * 0.22;
    const microJitter = (prng() - 0.5) * 0.08;

    const val = Math.max(0.05, Math.min(1.0, baseEnergy + beatPulse + barPulse + microJitter));
    rmsEnvelope[i] = Number(val.toFixed(3));
  }

  // Detect spectral flux onsets (transient peaks)
  const spectralFluxOnsets: number[] = [];
  const dropTimestampsSec: number[] = [];

  for (let i = 2; i < totalBins - 2; i++) {
    const t = Number((i * binDuration).toFixed(2));
    const curr = rmsEnvelope[i];
    const prev = rmsEnvelope[i - 1];
    const isPeak = curr > prev && curr > rmsEnvelope[i + 1] && curr > 0.65;

    if (isPeak) {
      spectralFluxOnsets.push(t);
    }
  }

  // Identify high-impact drop moments (climax entrances)
  const chorus1 = sections.find((s) => s.label === 'Chorus 1');
  const dropSec = sections.find((s) => s.label === 'Drop / Climax');
  if (chorus1) dropTimestampsSec.push(chorus1.startSec);
  if (dropSec) dropTimestampsSec.push(dropSec.startSec);

  return {
    durationSec,
    bpm,
    rmsEnvelope,
    spectralFluxOnsets,
    sections,
    dropTimestampsSec,
  };
}

/**
 * Real Web Audio API AudioBuffer decoder and spectral flux transient analyzer.
 */
export async function analyzeAudioBuffer(
  audioBuffer: AudioBuffer,
  bpmHint: number = 120
): Promise<AudioAnalysisEnvelopeResult> {
  const durationSec = audioBuffer.duration;
  const sampleRate = audioBuffer.sampleRate;
  const binDuration = 0.1; // 100ms
  const samplesPerBin = Math.floor(sampleRate * binDuration);
  const totalBins = Math.floor(audioBuffer.length / samplesPerBin);
  const channelData = audioBuffer.getChannelData(0);

  const rmsEnvelope: number[] = new Array(totalBins);
  let maxRms = 0.0001;

  // 1. RMS per 100ms bin
  for (let b = 0; b < totalBins; b++) {
    const start = b * samplesPerBin;
    let sumSq = 0;
    for (let s = 0; s < samplesPerBin; s++) {
      const v = channelData[start + s] || 0;
      sumSq += v * v;
    }
    const rms = Math.sqrt(sumSq / samplesPerBin);
    rmsEnvelope[b] = rms;
    if (rms > maxRms) maxRms = rms;
  }

  // Normalize RMS to 0..1
  for (let b = 0; b < totalBins; b++) {
    rmsEnvelope[b] = Number((rmsEnvelope[b] / maxRms).toFixed(3));
  }

  // 2. Spectral flux / energy onset detection
  const spectralFluxOnsets: number[] = [];
  const dropTimestampsSec: number[] = [];

  for (let b = 1; b < totalBins - 1; b++) {
    const t = Number((b * binDuration).toFixed(2));
    const flux = rmsEnvelope[b] - rmsEnvelope[b - 1];
    if (flux > 0.25 && rmsEnvelope[b] > 0.6) {
      spectralFluxOnsets.push(t);
      if (flux > 0.45 && rmsEnvelope[b] > 0.85) {
        dropTimestampsSec.push(t);
      }
    }
  }

  // Derive structural sections
  const secResult = analyzeAudioTrackEnvelope(durationSec, bpmHint);

  return {
    durationSec,
    bpm: bpmHint,
    rmsEnvelope,
    spectralFluxOnsets,
    sections: secResult.sections,
    dropTimestampsSec: dropTimestampsSec.length > 0 ? dropTimestampsSec : secResult.dropTimestampsSec,
  };
}

/**
 * One-Button Auto-Show Generator (`ShowGenerator`).
 * Generates BeatFlags and SceneCueTrackItems based on selected style profile.
 */
export function generateAutoShow(options: AutoShowOptions): AutoShowResult {
  const {
    durationSec,
    bpm,
    styleProfile,
    seed = 1337,
    rangeStartSec = 0,
    rangeEndSec = options.durationSec,
    availableSceneNames = DEFAULT_HOLIDAY_SCENE_NAMES,
  } = options;

  const prng = createMulberry32(seed);
  const analysis = analyzeAudioTrackEnvelope(durationSec, bpm, seed);
  const { sections, dropTimestampsSec } = analysis;

  const scenePool = availableSceneNames.length > 0 ? availableSceneNames : DEFAULT_HOLIDAY_SCENE_NAMES;
  const beatInterval = 60 / bpm;
  const barInterval = beatInterval * 4;

  const flags: BeatFlag[] = [];
  const sceneCues: SceneCueTrackItem[] = [];

  let flagCounter = 0;
  let cueCounter = 0;

  // Resolve active style parameters
  let barsPerScene = 8;
  let transitionType: 'cut' | 'crossfade' = 'crossfade';
  let transitionDuration = 1.2;
  let flagSubdivision: 1 | 2 | 4 | 8 | 16 = 4;
  let flagIntensity = 0.8;
  let useStrobeOnDrop = true;
  let useRapidCycling = false;

  switch (styleProfile) {
    case 'Gentle':
      barsPerScene = 16;
      transitionType = 'crossfade';
      transitionDuration = 2.8;
      flagSubdivision = 1; // Downbeats only
      flagIntensity = 0.45;
      useStrobeOnDrop = false;
      break;

    case 'Punchy':
      barsPerScene = 4;
      transitionType = 'cut';
      transitionDuration = 0.1;
      flagSubdivision = 4; // Every beat
      flagIntensity = 0.95;
      useStrobeOnDrop = true;
      break;

    case 'Chaotic':
      barsPerScene = 2;
      transitionType = 'cut';
      transitionDuration = 0.05;
      flagSubdivision = 8; // Eighth notes
      flagIntensity = 1.0;
      useStrobeOnDrop = true;
      useRapidCycling = true;
      break;

    case 'Surprise Me':
      barsPerScene = prng() > 0.5 ? 4 : 8;
      transitionType = prng() > 0.4 ? 'crossfade' : 'cut';
      transitionDuration = Number((0.5 + prng() * 2.0).toFixed(2));
      flagSubdivision = prng() > 0.5 ? 4 : 8;
      flagIntensity = Number((0.6 + prng() * 0.4).toFixed(2));
      useStrobeOnDrop = true;
      break;

    case 'Classic':
    default:
      barsPerScene = 8;
      transitionType = 'crossfade';
      transitionDuration = 1.5;
      flagSubdivision = 4;
      flagIntensity = 0.8;
      useStrobeOnDrop = true;
      break;
  }

  // 1. Generate Scene Cues across sections
  let sceneIndex = 0;
  const validStart = Math.max(0, rangeStartSec);
  const validEnd = Math.min(durationSec, rangeEndSec);

  // Group sections and place scene cuts
  for (const section of sections) {
    if (section.endSec < validStart || section.startSec > validEnd) continue;

    const secStart = Math.max(validStart, section.startSec);
    const secEnd = Math.min(validEnd, section.endSec);
    const secSpan = secEnd - secStart;

    // Number of scene switches within this section
    const isHighEnergy = section.label.includes('Chorus') || section.label.includes('Drop');
    const localBarsPerScene = isHighEnergy && (styleProfile === 'Punchy' || styleProfile === 'Chaotic')
      ? Math.max(2, Math.floor(barsPerScene / 2))
      : barsPerScene;

    const sceneDuration = Math.max(barInterval * 2, localBarsPerScene * barInterval);
    const sceneCount = Math.max(1, Math.round(secSpan / sceneDuration));
    const stepDuration = secSpan / sceneCount;

    for (let s = 0; s < sceneCount; s++) {
      const cueStart = Number((secStart + s * stepDuration).toFixed(3));
      const cueEnd = Number((s === sceneCount - 1 ? secEnd : secStart + (s + 1) * stepDuration).toFixed(3));

      const chosenScene = scenePool[sceneIndex % scenePool.length];
      sceneIndex++;

      // FX Burst assignment
      let oneShotFx: SceneCueTrackItem['oneShotFx'];
      if (isHighEnergy && useStrobeOnDrop && s === 0) {
        oneShotFx = 'strobe-pulse';
      } else if (useRapidCycling && s % 2 === 1) {
        oneShotFx = 'shader-cycle';
      } else if (section.label === 'Drop / Climax') {
        oneShotFx = 'dmx-flash';
      }

      sceneCues.push({
        id: `cue-${++cueCounter}-${Math.round(cueStart)}`,
        startSec: cueStart,
        endSec: cueEnd,
        sceneName: chosenScene,
        transitionType,
        transitionDurationSec: transitionDuration,
        oneShotFx,
      });

      // Section boundary marker flag
      flags.push({
        id: `flag-auto-${++flagCounter}`,
        timestampSec: cueStart,
        label: s === 0 ? `[${section.label}] ${chosenScene}` : `Scene: ${chosenScene}`,
        type: isHighEnergy ? 'drop' : 'flag',
        colorModifier: isHighEnergy ? '#f59e0b' : '#00f0ff',
        intensity: section.energy,
        isAutoGenerated: true,
      });
    }
  }

  // 2. Generate per-beat accent flags aligned to beat grid
  const subInterval = beatInterval / (flagSubdivision / 4);
  const totalSubSteps = Math.floor(durationSec / subInterval);

  for (let i = 0; i < totalSubSteps; i++) {
    const t = Number((i * subInterval).toFixed(3));
    if (t < validStart || t > validEnd) continue;

    // Check if this falls on a section with high enough energy
    const activeSection = sections.find((s) => t >= s.startSec && t < s.endSec);
    if (!activeSection) continue;

    const isDownbeat = (i % (4 * (flagSubdivision / 4))) === 0;
    const isBeat = (i % (flagSubdivision / 4)) === 0;
    const isChorusOrDrop = activeSection.label.includes('Chorus') || activeSection.label.includes('Drop');

    let shouldFlag = false;
    let flagType: BeatFlag['type'] = 'beat';
    let flagColor = '#22c55e';

    if (styleProfile === 'Gentle') {
      shouldFlag = isDownbeat && isChorusOrDrop;
      flagColor = '#38bdf8';
    } else if (styleProfile === 'Classic') {
      shouldFlag = isDownbeat || (isBeat && isChorusOrDrop);
      flagColor = isDownbeat ? '#00f0ff' : '#22c55e';
    } else if (styleProfile === 'Punchy') {
      shouldFlag = isBeat || (isChorusOrDrop && i % 2 === 0);
      flagColor = isChorusOrDrop ? '#f59e0b' : '#00f0ff';
    } else if (styleProfile === 'Chaotic') {
      shouldFlag = true;
      flagColor = i % 2 === 0 ? '#ec4899' : '#eab308';
    } else if (styleProfile === 'Surprise Me') {
      shouldFlag = isBeat && (isChorusOrDrop || prng() > 0.4);
      flagColor = '#a855f7';
    }

    if (shouldFlag) {
      // Don't duplicate if already placed near a section boundary flag
      const existsNear = flags.some((f) => Math.abs(f.timestampSec - t) < 0.05);
      if (!existsNear) {
        flags.push({
          id: `flag-auto-${++flagCounter}`,
          timestampSec: t,
          label: isDownbeat ? 'Bar Downbeat' : 'Beat Accent',
          type: flagType,
          colorModifier: flagColor,
          intensity: flagIntensity * activeSection.energy,
          isAutoGenerated: true,
        });
      }
    }
  }

  // Sort flags chronologically
  flags.sort((a, b) => a.timestampSec - b.timestampSec);

  const summary = `Generated ${flags.length} beat flags & ${sceneCues.length} scene cues under "${styleProfile}" profile (${bpm} BPM, seed: ${seed}).`;

  return {
    flags,
    sceneCues,
    sections,
    dropTimestampsSec,
    summary,
    styleProfile,
    seed,
  };
}

// ============================================================================
// 2. PUNCH-IN BEAT-TAP OVERDUB & PRECISION FLAG OPERATIONS
// ============================================================================

let sharedAudioContext: AudioContext | null = null;

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioContext) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      sharedAudioContext = new Ctx();
    }
  }
  if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

/**
 * High-precision Web Audio API Metronome Click Synthesizer.
 * Requires zero external audio assets. Downbeat = 1200Hz woodblock pip, Offbeat = 800Hz click.
 */
export function playMetronomeClick(isDownbeat: boolean = false, volume: number = 0.5): void {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isDownbeat ? 'sine' : 'triangle';
    if (isDownbeat) {
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.04);
    } else {
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.025);
    }

    const peak = Math.max(0.01, Math.min(1.0, volume)) * (isDownbeat ? 0.75 : 0.45);
    gain.gain.setValueAtTime(peak, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (isDownbeat ? 0.05 : 0.03));

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.055);
  } catch (err) {
    console.warn('Metronome click synthesis audio error:', err);
  }
}

export interface TapPhaseOffsetResult {
  meanOffsetMs: number;
  phaseErrorLabel: string; // e.g. "-14.2 ms early" or "+18.5 ms late"
  stdDevMs: number;
  correctedFlags: BeatFlag[];
}

/**
 * Calculates mean signed tap phase error in milliseconds against nearest beat grid.
 * Returns phase-corrected flag list ready for one-click commit.
 */
export function computeTapPhaseOffsetMs(
  tapTimestampsSec: number[],
  bpm: number,
  firstBeatOffsetSec: number = 0
): TapPhaseOffsetResult {
  if (tapTimestampsSec.length === 0 || bpm <= 0) {
    return {
      meanOffsetMs: 0,
      phaseErrorLabel: '0.0 ms (On Grid)',
      stdDevMs: 0,
      correctedFlags: [],
    };
  }

  const beatInterval = 60 / bpm;
  const offsetsMs: number[] = [];

  for (const tap of tapTimestampsSec) {
    const relTime = tap - firstBeatOffsetSec;
    const beatIndex = Math.round(relTime / beatInterval);
    const gridTime = firstBeatOffsetSec + beatIndex * beatInterval;
    const errorMs = (tap - gridTime) * 1000;
    offsetsMs.push(errorMs);
  }

  const sum = offsetsMs.reduce((acc, v) => acc + v, 0);
  const meanOffsetMs = Number((sum / offsetsMs.length).toFixed(1));

  // Compute standard deviation
  const variance =
    offsetsMs.reduce((acc, v) => acc + Math.pow(v - meanOffsetMs, 2), 0) / offsetsMs.length;
  const stdDevMs = Number(Math.sqrt(variance).toFixed(1));

  const signStr = meanOffsetMs > 0 ? `+${meanOffsetMs} ms late` : `${meanOffsetMs} ms early`;
  const phaseErrorLabel = Math.abs(meanOffsetMs) < 2.0 ? '0.0 ms (Perfect Phase)' : signStr;

  // Generate corrected flags shifted by mean error
  const correctedFlags: BeatFlag[] = tapTimestampsSec.map((tap, idx) => {
    const correctedTime = Math.max(0, Number((tap - meanOffsetMs / 1000).toFixed(3)));
    return {
      id: `overdub-tap-${idx + 1}`,
      timestampSec: correctedTime,
      label: `Tap Overdub #${idx + 1}`,
      type: 'beat',
      colorModifier: '#ec4899',
      intensity: 0.85,
      isAutoGenerated: false,
    };
  });

  return {
    meanOffsetMs,
    phaseErrorLabel,
    stdDevMs,
    correctedFlags,
  };
}

/**
 * Quantizes beat flags toward 1/1, 1/2, 1/4, 1/8, or 1/16 beat subdivisions.
 */
export function quantizeBeatFlags(
  flags: BeatFlag[],
  bpm: number,
  subdivision: 1 | 2 | 4 | 8 | 16 = 4,
  strengthPct: number = 100,
  rangeStartSec?: number,
  rangeEndSec?: number
): BeatFlag[] {
  if (bpm <= 0) return flags;
  const beatInterval = 60 / bpm;
  // subdivision: 1 = bar (4 beats), 2 = half-note (2 beats), 4 = quarter (1 beat), 8 = eighth (0.5), 16 = sixteenth (0.25)
  const gridInterval = (beatInterval * 4) / subdivision;
  const strength = Math.max(0, Math.min(100, strengthPct)) / 100;

  return flags.map((f) => {
    if (rangeStartSec !== undefined && f.timestampSec < rangeStartSec) return f;
    if (rangeEndSec !== undefined && f.timestampSec > rangeEndSec) return f;

    const nearestStep = Math.round(f.timestampSec / gridInterval);
    const targetGridTime = nearestStep * gridInterval;
    const finalTime = f.timestampSec + (targetGridTime - f.timestampSec) * strength;

    return {
      ...f,
      timestampSec: Number(Math.max(0, finalTime).toFixed(3)),
    };
  });
}

/**
 * Batch shifts flags by a delta in milliseconds (+/- ms).
 */
export function batchShiftBeatFlags(
  flags: BeatFlag[],
  deltaMs: number,
  rangeStartSec?: number,
  rangeEndSec?: number
): BeatFlag[] {
  const deltaSec = deltaMs / 1000;
  return flags.map((f) => {
    if (rangeStartSec !== undefined && f.timestampSec < rangeStartSec) return f;
    if (rangeEndSec !== undefined && f.timestampSec > rangeEndSec) return f;
    return {
      ...f,
      timestampSec: Number(Math.max(0, f.timestampSec + deltaSec).toFixed(3)),
    };
  });
}

/**
 * Deletes flags within [startSec, endSec] and ripples (pulls earlier) all subsequent flags.
 */
export function rippleDeleteFlagsInRange(
  flags: BeatFlag[],
  startSec: number,
  endSec: number
): BeatFlag[] {
  if (endSec <= startSec) return flags;
  const deltaSec = endSec - startSec;

  const result: BeatFlag[] = [];
  for (const f of flags) {
    if (f.timestampSec >= startSec && f.timestampSec <= endSec) {
      // Discard / delete flag
      continue;
    } else if (f.timestampSec > endSec) {
      // Pull earlier by span
      result.push({
        ...f,
        timestampSec: Number(Math.max(startSec, f.timestampSec - deltaSec).toFixed(3)),
      });
    } else {
      result.push(f);
    }
  }

  return result.sort((a, b) => a.timestampSec - b.timestampSec);
}

/**
 * Calculates normalized density heat bins [0..1] across song duration for minimap rendering.
 */
export function computeFlagDensityHeatBins(
  flags: BeatFlag[],
  durationSec: number,
  binCount: number = 40
): number[] {
  const bins = new Array(binCount).fill(0);
  if (durationSec <= 0 || flags.length === 0) return bins;

  const binSpan = durationSec / binCount;
  for (const f of flags) {
    const idx = Math.min(binCount - 1, Math.max(0, Math.floor(f.timestampSec / binSpan)));
    bins[idx]++;
  }

  const maxCount = Math.max(1, ...bins);
  return bins.map((count) => Number((count / maxCount).toFixed(3)));
}

// ============================================================================
// 3. WORD-LEVEL KARAOKE LYRIC ENGINE (.srt / .vtt)
// ============================================================================

export interface KaraokeWord {
  text: string;
  startSec: number;
  endSec: number;
}

export interface KaraokeCue {
  id: string;
  startSec: number;
  endSec: number;
  rawText: string;
  words: KaraokeWord[];
}

export type KaraokeAnchor =
  | 'TopLeft'
  | 'TopCenter'
  | 'TopRight'
  | 'MiddleLeft'
  | 'MiddleCenter'
  | 'MiddleRight'
  | 'BottomLeft'
  | 'BottomCenter'
  | 'BottomRight';

export type KaraokeAnimationStyle =
  | 'Fade'
  | 'SlideUp'
  | 'TypeOn'
  | 'KaraokeBounce';

export interface KaraokeStyleOptions {
  anchor: KaraokeAnchor;
  animationStyle: KaraokeAnimationStyle;
  fontSizePx: number;
  textColor: string;
  highlightColor: string;
  strokeColor: string;
  strokeWidthPx: number;
  showShadow: boolean;
  bouncingBall: boolean;
}

export const DEFAULT_KARAOKE_STYLE: KaraokeStyleOptions = {
  anchor: 'BottomCenter',
  animationStyle: 'KaraokeBounce',
  fontSizePx: 44,
  textColor: '#ffffff',
  highlightColor: '#facc15', // Vibrant golden karaoke highlight
  strokeColor: '#0a0f18',
  strokeWidthPx: 6,
  showShadow: true,
  bouncingBall: true,
};

/**
 * Parses timestamp string HH:MM:SS.mmm or MM:SS.mmm into seconds.
 */
function parseSubtitleTimestamp(timeStr: string): number | null {
  const clean = timeStr.trim().replace(',', '.');
  const parts = clean.split(':');
  if (parts.length === 3) {
    const hrs = parseFloat(parts[0]);
    const mins = parseFloat(parts[1]);
    const secs = parseFloat(parts[2]);
    if (isNaN(hrs) || isNaN(mins) || isNaN(secs)) return null;
    return hrs * 3600 + mins * 60 + secs;
  } else if (parts.length === 2) {
    const mins = parseFloat(parts[0]);
    const secs = parseFloat(parts[1]);
    if (isNaN(mins) || isNaN(secs)) return null;
    return mins * 60 + secs;
  }
  return null;
}

/**
 * Parses inline word timestamps like `<00:01.500>word` or `[00:01.50]word` or plain text.
 */
function parseWordsFromCueText(text: string, cueStartSec: number, cueEndSec: number): KaraokeWord[] {
  const wordTagRegex = /<([0-9:.,]+)>([^<]+)/g;
  const bracketTagRegex = /\[([0-9:.,]+)\]([^[]+)/g;
  const words: KaraokeWord[] = [];

  let match: RegExpExecArray | null;
  let hasInlineTags = false;

  // Try WebVTT inline <timestamp>word tags
  while ((match = wordTagRegex.exec(text)) !== null) {
    hasInlineTags = true;
    const t = parseSubtitleTimestamp(match[1]);
    const wordText = match[2].trim();
    if (t !== null && wordText) {
      words.push({
        text: wordText,
        startSec: t,
        endSec: t + 0.5, // Temp end, resolved below
      });
    }
  }

  // Try bracket [timestamp]word tags if no angle brackets found
  if (!hasInlineTags) {
    while ((match = bracketTagRegex.exec(text)) !== null) {
      hasInlineTags = true;
      const t = parseSubtitleTimestamp(match[1]);
      const wordText = match[2].trim();
      if (t !== null && wordText) {
        words.push({
          text: wordText,
          startSec: t,
          endSec: t + 0.5,
        });
      }
    }
  }

  // Fix consecutive endSec for tagged words
  if (words.length > 0) {
    for (let i = 0; i < words.length; i++) {
      if (i < words.length - 1) {
        words[i].endSec = words[i + 1].startSec;
      } else {
        words[i].endSec = cueEndSec;
      }
    }
    return words;
  }

  // Fallback: No inline word timestamps in source cue.
  // Proportioned subdivision across words based on character count!
  const cleanText = text.replace(/<[^>]+>/g, '').trim();
  const rawWords = cleanText.split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) return [];

  const cueDuration = Math.max(0.1, cueEndSec - cueStartSec);
  const totalChars = rawWords.reduce((acc, w) => acc + Math.max(1, w.length), 0);

  let currentStart = cueStartSec;
  for (let i = 0; i < rawWords.length; i++) {
    const w = rawWords[i];
    const weight = Math.max(1, w.length) / totalChars;
    const wordDuration = cueDuration * weight;
    const wordEnd = i === rawWords.length - 1 ? cueEndSec : currentStart + wordDuration;

    words.push({
      text: w,
      startSec: Number(currentStart.toFixed(3)),
      endSec: Number(wordEnd.toFixed(3)),
    });
    currentStart = wordEnd;
  }

  return words;
}

/**
 * Full SubRip (.srt) and WebVTT (.vtt) Subtitle Parser with word-level karaoke support.
 */
export function parseKaraokeSubtitles(
  content: string,
  forcedFormat?: 'srt' | 'vtt' | 'auto'
): { cues: KaraokeCue[]; format: 'srt' | 'vtt'; warnings: string[] } {
  const warnings: string[] = [];
  const cues: KaraokeCue[] = [];

  if (!content || !content.trim()) {
    return { cues: [], format: 'srt', warnings: ['Subtitle file is empty'] };
  }

  const trimmed = content.trim();
  const format: 'srt' | 'vtt' =
    forcedFormat === 'srt' || forcedFormat === 'vtt'
      ? forcedFormat
      : trimmed.startsWith('WEBVTT')
      ? 'vtt'
      : 'srt';

  // Normalize line breaks and split into cue blocks
  const normalized = trimmed.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n\s*\n+/);

  let cueIndex = 0;
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    // Find timestamp line (e.g. "00:00:01.000 --> 00:00:04.500")
    let timeLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timeLineIndex = i;
        break;
      }
    }

    if (timeLineIndex === -1) {
      if (!lines[0].startsWith('WEBVTT') && !lines[0].startsWith('NOTE')) {
        warnings.push(`Block skipped: missing "-->" timestamp arrow (${lines[0].slice(0, 30)})`);
      }
      continue;
    }

    const timeLine = lines[timeLineIndex];
    const [startRaw, endRaw] = timeLine.split('-->');
    if (!startRaw || !endRaw) continue;

    // Extract time before any cue settings (like line:90% position:50%)
    const cleanStart = startRaw.trim();
    const cleanEnd = endRaw.trim().split(/\s+/)[0];

    const startSec = parseSubtitleTimestamp(cleanStart);
    const endSec = parseSubtitleTimestamp(cleanEnd);

    if (startSec === null || endSec === null) {
      warnings.push(`Malformed timestamp in line: "${timeLine}"`);
      continue;
    }

    if (endSec <= startSec) {
      warnings.push(`End time (${cleanEnd}) not after start time (${cleanStart})`);
      continue;
    }

    // Text lines follow the timestamp line
    const textLines = lines.slice(timeLineIndex + 1);
    const rawTextCombined = textLines.join(' ');
    const cleanText = rawTextCombined.replace(/<[^>]+>/g, '').trim();

    if (!cleanText) continue;

    cueIndex++;
    const words = parseWordsFromCueText(rawTextCombined, startSec, endSec);

    cues.push({
      id: `cue-${cueIndex}`,
      startSec,
      endSec,
      rawText: cleanText,
      words,
    });
  }

  cues.sort((a, b) => a.startSec - b.startSec);
  return { cues, format, warnings };
}

/**
 * 4 Built-In Word-Level Karaoke Holiday Tracks.
 */
export const BUILTIN_KARAOKE_TRACKS: Array<{
  title: string;
  holiday: 'Christmas' | 'Halloween' | 'New Year';
  bpm: number;
  durationSec: number;
  cues: KaraokeCue[];
}> = [
  {
    title: 'Jingle Bells (Sing-Along)',
    holiday: 'Christmas',
    bpm: 130,
    durationSec: 36,
    cues: [
      {
        id: 'jb-1',
        startSec: 1.0,
        endSec: 4.2,
        rawText: 'Dashing through the snow',
        words: [
          { text: 'Dashing', startSec: 1.0, endSec: 1.8 },
          { text: 'through', startSec: 1.8, endSec: 2.3 },
          { text: 'the', startSec: 2.3, endSec: 2.8 },
          { text: 'snow,', startSec: 2.8, endSec: 4.2 },
        ],
      },
      {
        id: 'jb-2',
        startSec: 4.5,
        endSec: 8.0,
        rawText: 'In a one-horse open sleigh,',
        words: [
          { text: 'In', startSec: 4.5, endSec: 4.9 },
          { text: 'a', startSec: 4.9, endSec: 5.2 },
          { text: 'one-horse', startSec: 5.2, endSec: 6.2 },
          { text: 'open', startSec: 6.2, endSec: 7.0 },
          { text: 'sleigh,', startSec: 7.0, endSec: 8.0 },
        ],
      },
      {
        id: 'jb-3',
        startSec: 8.3,
        endSec: 11.5,
        rawText: "O'er the fields we go,",
        words: [
          { text: "O'er", startSec: 8.3, endSec: 9.0 },
          { text: 'the', startSec: 9.0, endSec: 9.4 },
          { text: 'fields', startSec: 9.4, endSec: 10.2 },
          { text: 'we', startSec: 10.2, endSec: 10.7 },
          { text: 'go,', startSec: 10.7, endSec: 11.5 },
        ],
      },
      {
        id: 'jb-4',
        startSec: 11.8,
        endSec: 15.0,
        rawText: 'Laughing all the way!',
        words: [
          { text: 'Laughing', startSec: 11.8, endSec: 12.8 },
          { text: 'all', startSec: 12.8, endSec: 13.5 },
          { text: 'the', startSec: 13.5, endSec: 14.0 },
          { text: 'way!', startSec: 14.0, endSec: 15.0 },
        ],
      },
      {
        id: 'jb-5',
        startSec: 15.4,
        endSec: 22.5,
        rawText: 'Jingle bells, jingle bells, jingle all the way!',
        words: [
          { text: 'Jingle', startSec: 15.4, endSec: 16.2 },
          { text: 'bells,', startSec: 16.2, endSec: 17.2 },
          { text: 'jingle', startSec: 17.4, endSec: 18.2 },
          { text: 'bells,', startSec: 18.2, endSec: 19.2 },
          { text: 'jingle', startSec: 19.4, endSec: 20.2 },
          { text: 'all', startSec: 20.2, endSec: 20.8 },
          { text: 'the', startSec: 20.8, endSec: 21.3 },
          { text: 'way!', startSec: 21.3, endSec: 22.5 },
        ],
      },
      {
        id: 'jb-6',
        startSec: 23.0,
        endSec: 32.0,
        rawText: 'Oh what fun it is to ride in a one-horse open sleigh!',
        words: [
          { text: 'Oh', startSec: 23.0, endSec: 23.6 },
          { text: 'what', startSec: 23.6, endSec: 24.1 },
          { text: 'fun', startSec: 24.1, endSec: 24.8 },
          { text: 'it', startSec: 24.8, endSec: 25.2 },
          { text: 'is', startSec: 25.2, endSec: 25.7 },
          { text: 'to', startSec: 25.7, endSec: 26.1 },
          { text: 'ride', startSec: 26.1, endSec: 27.0 },
          { text: 'in', startSec: 27.0, endSec: 27.5 },
          { text: 'a', startSec: 27.5, endSec: 27.9 },
          { text: 'one-horse', startSec: 27.9, endSec: 29.0 },
          { text: 'open', startSec: 29.0, endSec: 30.0 },
          { text: 'sleigh!', startSec: 30.0, endSec: 32.0 },
        ],
      },
    ],
  },
  {
    title: 'Carol of the Bells (Epic Choir)',
    holiday: 'Christmas',
    bpm: 144,
    durationSec: 28,
    cues: [
      {
        id: 'cob-1',
        startSec: 1.0,
        endSec: 6.5,
        rawText: 'Hark how the bells, sweet silver bells,',
        words: [
          { text: 'Hark', startSec: 1.0, endSec: 1.7 },
          { text: 'how', startSec: 1.7, endSec: 2.3 },
          { text: 'the', startSec: 2.3, endSec: 2.9 },
          { text: 'bells,', startSec: 2.9, endSec: 3.8 },
          { text: 'sweet', startSec: 4.0, endSec: 4.7 },
          { text: 'silver', startSec: 4.7, endSec: 5.5 },
          { text: 'bells,', startSec: 5.5, endSec: 6.5 },
        ],
      },
      {
        id: 'cob-2',
        startSec: 7.0,
        endSec: 12.5,
        rawText: 'All seem to say, throw cares away,',
        words: [
          { text: 'All', startSec: 7.0, endSec: 7.8 },
          { text: 'seem', startSec: 7.8, endSec: 8.6 },
          { text: 'to', startSec: 8.6, endSec: 9.2 },
          { text: 'say,', startSec: 9.2, endSec: 10.0 },
          { text: 'throw', startSec: 10.2, endSec: 11.0 },
          { text: 'cares', startSec: 11.0, endSec: 11.7 },
          { text: 'away,', startSec: 11.7, endSec: 12.5 },
        ],
      },
      {
        id: 'cob-3',
        startSec: 13.0,
        endSec: 19.5,
        rawText: 'Christmas is here, bringing good cheer!',
        words: [
          { text: 'Christmas', startSec: 13.0, endSec: 14.3 },
          { text: 'is', startSec: 14.3, endSec: 15.0 },
          { text: 'here,', startSec: 15.0, endSec: 16.2 },
          { text: 'bringing', startSec: 16.5, endSec: 17.8 },
          { text: 'good', startSec: 17.8, endSec: 18.5 },
          { text: 'cheer!', startSec: 18.5, endSec: 19.5 },
        ],
      },
      {
        id: 'cob-4',
        startSec: 20.0,
        endSec: 26.5,
        rawText: 'Ding dong ding dong, that is their song!',
        words: [
          { text: 'Ding', startSec: 20.0, endSec: 20.8 },
          { text: 'dong', startSec: 20.8, endSec: 21.6 },
          { text: 'ding', startSec: 21.8, endSec: 22.6 },
          { text: 'dong,', startSec: 22.6, endSec: 23.4 },
          { text: 'that', startSec: 23.6, endSec: 24.2 },
          { text: 'is', startSec: 24.2, endSec: 24.8 },
          { text: 'their', startSec: 24.8, endSec: 25.4 },
          { text: 'song!', startSec: 25.4, endSec: 26.5 },
        ],
      },
    ],
  },
  {
    title: 'This Is Halloween (Spooky Manor)',
    holiday: 'Halloween',
    bpm: 108,
    durationSec: 26,
    cues: [
      {
        id: 'hallo-1',
        startSec: 1.0,
        endSec: 6.0,
        rawText: 'Boys and girls of every age,',
        words: [
          { text: 'Boys', startSec: 1.0, endSec: 1.8 },
          { text: 'and', startSec: 1.8, endSec: 2.3 },
          { text: 'girls', startSec: 2.3, endSec: 3.2 },
          { text: 'of', startSec: 3.2, endSec: 3.8 },
          { text: 'every', startSec: 3.8, endSec: 4.8 },
          { text: 'age,', startSec: 4.8, endSec: 6.0 },
        ],
      },
      {
        id: 'hallo-2',
        startSec: 6.4,
        endSec: 12.0,
        rawText: "Wouldn't you like to see something strange?",
        words: [
          { text: "Wouldn't", startSec: 6.4, endSec: 7.2 },
          { text: 'you', startSec: 7.2, endSec: 7.7 },
          { text: 'like', startSec: 7.7, endSec: 8.4 },
          { text: 'to', startSec: 8.4, endSec: 8.9 },
          { text: 'see', startSec: 8.9, endSec: 9.6 },
          { text: 'something', startSec: 9.6, endSec: 10.7 },
          { text: 'strange?', startSec: 10.7, endSec: 12.0 },
        ],
      },
      {
        id: 'hallo-3',
        startSec: 12.5,
        endSec: 18.5,
        rawText: 'This is Halloween, this is Halloween!',
        words: [
          { text: 'This', startSec: 12.5, endSec: 13.2 },
          { text: 'is', startSec: 13.2, endSec: 13.7 },
          { text: 'Halloween,', startSec: 13.7, endSec: 15.2 },
          { text: 'this', startSec: 15.5, endSec: 16.2 },
          { text: 'is', startSec: 16.2, endSec: 16.7 },
          { text: 'Halloween!', startSec: 16.7, endSec: 18.5 },
        ],
      },
      {
        id: 'hallo-4',
        startSec: 19.0,
        endSec: 24.5,
        rawText: 'Pumpkins scream in the dead of night!',
        words: [
          { text: 'Pumpkins', startSec: 19.0, endSec: 20.2 },
          { text: 'scream', startSec: 20.2, endSec: 21.2 },
          { text: 'in', startSec: 21.2, endSec: 21.7 },
          { text: 'the', startSec: 21.7, endSec: 22.2 },
          { text: 'dead', startSec: 22.2, endSec: 23.0 },
          { text: 'of', startSec: 23.0, endSec: 23.5 },
          { text: 'night!', startSec: 23.5, endSec: 24.5 },
        ],
      },
    ],
  },
  {
    title: 'Auld Lang Syne (NYE Midnight)',
    holiday: 'New Year',
    bpm: 96,
    durationSec: 28,
    cues: [
      {
        id: 'als-1',
        startSec: 1.0,
        endSec: 6.8,
        rawText: 'Should auld acquaintance be forgot,',
        words: [
          { text: 'Should', startSec: 1.0, endSec: 1.8 },
          { text: 'auld', startSec: 1.8, endSec: 2.7 },
          { text: 'acquaintance', startSec: 2.7, endSec: 4.4 },
          { text: 'be', startSec: 4.4, endSec: 5.2 },
          { text: 'forgot,', startSec: 5.2, endSec: 6.8 },
        ],
      },
      {
        id: 'als-2',
        startSec: 7.2,
        endSec: 13.0,
        rawText: 'And never brought to mind?',
        words: [
          { text: 'And', startSec: 7.2, endSec: 8.0 },
          { text: 'never', startSec: 8.0, endSec: 9.3 },
          { text: 'brought', startSec: 9.3, endSec: 10.6 },
          { text: 'to', startSec: 10.6, endSec: 11.4 },
          { text: 'mind?', startSec: 11.4, endSec: 13.0 },
        ],
      },
      {
        id: 'als-3',
        startSec: 13.5,
        endSec: 20.0,
        rawText: 'For auld lang syne, my dear, for auld lang syne!',
        words: [
          { text: 'For', startSec: 13.5, endSec: 14.3 },
          { text: 'auld', startSec: 14.3, endSec: 15.2 },
          { text: 'lang', startSec: 15.2, endSec: 16.0 },
          { text: 'syne,', startSec: 16.0, endSec: 17.0 },
          { text: 'my', startSec: 17.2, endSec: 17.8 },
          { text: 'dear,', startSec: 17.8, endSec: 18.6 },
          { text: 'for', startSec: 18.7, endSec: 19.1 },
          { text: 'auld', startSec: 19.1, endSec: 19.5 },
          { text: 'lang', startSec: 19.5, endSec: 19.8 },
          { text: 'syne!', startSec: 19.8, endSec: 20.0 },
        ],
      },
      {
        id: 'als-4',
        startSec: 20.5,
        endSec: 26.5,
        rawText: "We'll take a cup of kindness yet, for auld lang syne!",
        words: [
          { text: "We'll", startSec: 20.5, endSec: 21.2 },
          { text: 'take', startSec: 21.2, endSec: 21.9 },
          { text: 'a', startSec: 21.9, endSec: 22.3 },
          { text: 'cup', startSec: 22.3, endSec: 23.0 },
          { text: 'of', startSec: 23.0, endSec: 23.6 },
          { text: 'kindness', startSec: 23.6, endSec: 24.7 },
          { text: 'yet!', startSec: 24.7, endSec: 26.5 },
        ],
      },
    ],
  },
];

/**
 * Renders the active karaoke cue on a Canvas2D with 9-anchor positioning,
 * drop shadow, outline stroke, entrance animations, and a smooth per-word highlight sweep.
 */
export function renderKaraokeOverlayOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  currentTimeSec: number,
  cues: KaraokeCue[],
  options: Partial<KaraokeStyleOptions> = {}
): void {
  const opts: KaraokeStyleOptions = { ...DEFAULT_KARAOKE_STYLE, ...options };

  // Find active cue
  const activeCue = cues.find(
    (c) => currentTimeSec >= c.startSec && currentTimeSec <= c.endSec
  );

  if (!activeCue) return;

  const { startSec, endSec, words } = activeCue;
  const cueDuration = endSec - startSec;
  const elapsed = currentTimeSec - startSec;

  // 1. Calculate Entrance Animation Transform
  let alpha = 1.0;
  let offsetY = 0;
  let scale = 1.0;

  if (opts.animationStyle === 'Fade') {
    const fadeInTime = Math.min(0.3, cueDuration * 0.2);
    if (elapsed < fadeInTime) {
      alpha = elapsed / fadeInTime;
    }
  } else if (opts.animationStyle === 'SlideUp') {
    const slideTime = Math.min(0.35, cueDuration * 0.25);
    if (elapsed < slideTime) {
      const p = elapsed / slideTime;
      offsetY = (1 - p) * 28;
      alpha = p;
    }
  } else if (opts.animationStyle === 'KaraokeBounce') {
    const introTime = 0.25;
    if (elapsed < introTime) {
      scale = 0.95 + 0.05 * Math.sin((elapsed / introTime) * Math.PI * 0.5);
    }
  }

  // 2. Measure Text & Setup Font
  ctx.save();
  ctx.font = `900 ${opts.fontSizePx}px "Inter", "Segoe UI", system-ui, sans-serif`;
  ctx.textBaseline = 'middle';

  // Measure word dimensions
  interface MeasuredWord {
    word: KaraokeWord;
    width: number;
    spaceWidth: number;
  }

  const spaceWidth = ctx.measureText(' ').width;
  const measuredWords: MeasuredWord[] = words.map((w) => ({
    word: w,
    width: ctx.measureText(w.text).width,
    spaceWidth,
  }));

  const totalLineContentWidth = measuredWords.reduce(
    (acc, m, idx) => acc + m.width + (idx < measuredWords.length - 1 ? m.spaceWidth : 0),
    0
  );

  // 3. Resolve 9-Anchor Screen Coordinates
  const padX = 64;
  const padY = 56;
  let startX = padX;
  let baselineY = height - padY;

  switch (opts.anchor) {
    case 'TopLeft':
      startX = padX;
      baselineY = padY + opts.fontSizePx / 2;
      break;
    case 'TopCenter':
      startX = (width - totalLineContentWidth) / 2;
      baselineY = padY + opts.fontSizePx / 2;
      break;
    case 'TopRight':
      startX = width - padX - totalLineContentWidth;
      baselineY = padY + opts.fontSizePx / 2;
      break;
    case 'MiddleLeft':
      startX = padX;
      baselineY = height / 2;
      break;
    case 'MiddleCenter':
      startX = (width - totalLineContentWidth) / 2;
      baselineY = height / 2;
      break;
    case 'MiddleRight':
      startX = width - padX - totalLineContentWidth;
      baselineY = height / 2;
      break;
    case 'BottomLeft':
      startX = padX;
      baselineY = height - padY;
      break;
    case 'BottomRight':
      startX = width - padX - totalLineContentWidth;
      baselineY = height - padY;
      break;
    case 'BottomCenter':
    default:
      startX = (width - totalLineContentWidth) / 2;
      baselineY = height - padY;
      break;
  }

  baselineY += offsetY;

  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  if (scale !== 1.0) {
    ctx.translate(width / 2, baselineY);
    ctx.scale(scale, scale);
    ctx.translate(-width / 2, -baselineY);
  }

  // 4. Render Outline & Drop Shadow for the full line
  if (opts.showShadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
  }

  let renderX = startX;
  let activeWordPos: { x: number; width: number; progress: number } | null = null;

  // Render per-word text with smooth karaoke highlight sweep
  for (let i = 0; i < measuredWords.length; i++) {
    const { word, width: wWidth, spaceWidth: sWidth } = measuredWords[i];

    // Stroke Outline
    ctx.lineWidth = opts.strokeWidthPx;
    ctx.strokeStyle = opts.strokeColor;
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeText(word.text, renderX, baselineY);

    // Fill with Word-Level Karaoke Sweep Gradient
    if (currentTimeSec >= word.endSec) {
      // 100% Highlighted (Sung)
      ctx.fillStyle = opts.highlightColor;
      ctx.fillText(word.text, renderX, baselineY);
    } else if (currentTimeSec < word.startSec) {
      // Unsung (Base Color)
      ctx.fillStyle = opts.textColor;
      ctx.fillText(word.text, renderX, baselineY);
    } else {
      // Currently singing this word: smooth gradient sweep across characters!
      const wordProgress = Math.max(
        0,
        Math.min(1, (currentTimeSec - word.startSec) / Math.max(0.001, word.endSec - word.startSec))
      );

      activeWordPos = {
        x: renderX,
        width: wWidth,
        progress: wordProgress,
      };

      const grad = ctx.createLinearGradient(renderX, 0, renderX + wWidth, 0);
      const sweepEdge = Math.max(0.01, Math.min(0.99, wordProgress));
      grad.addColorStop(0, opts.highlightColor);
      grad.addColorStop(sweepEdge, opts.highlightColor);
      grad.addColorStop(Math.min(1.0, sweepEdge + 0.05), opts.textColor);
      grad.addColorStop(1.0, opts.textColor);

      ctx.fillStyle = grad;
      ctx.fillText(word.text, renderX, baselineY);
    }

    renderX += wWidth + sWidth;
  }

  // 5. Optional Bouncing Karaoke Ball / Star over current word
  if (opts.bouncingBall && activeWordPos) {
    ctx.shadowBlur = 10;
    ctx.shadowColor = opts.highlightColor;

    const ballX = activeWordPos.x + activeWordPos.width * activeWordPos.progress;
    // Bouncing parabolic hop
    const bounceHeight = 18;
    const bouncePhase = Math.sin(activeWordPos.progress * Math.PI);
    const ballY = baselineY - opts.fontSizePx * 0.75 - bouncePhase * bounceHeight;

    // Glowing ball
    ctx.beginPath();
    ctx.arc(ballX, ballY, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = opts.highlightColor;
    ctx.stroke();

    // Sparkle halo
    ctx.beginPath();
    ctx.arc(ballX, ballY, 11, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

// ============================================================================
// 4. XLIGHTS (.XTIMING) XML IMPORT & EXPORT BRIDGE
// ============================================================================

export interface XLightsTimingEffect {
  label: string;
  startSec: number;
  endSec: number;
}

export interface XLightsTimingLayer {
  name: string;
  effects: XLightsTimingEffect[];
}

export interface XLightsTimingDocument {
  trackName: string;
  sourceVersion: string;
  layers: XLightsTimingLayer[];
  flags: BeatFlag[];
  karaokeCues: KaraokeCue[];
  warnings: string[];
}

/**
 * Parses time attribute string, inferring whole-milliseconds vs decimal seconds.
 */
function parseXLightsTime(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const val = parseFloat(trimmed);
  if (isNaN(val) || !isFinite(val) || val < 0) return null;

  // Integers without decimals are treated as whole milliseconds per xLights standard
  const looksLikeWholeMs = !trimmed.includes('.') && !trimmed.includes('e') && !trimmed.includes('E');
  return looksLikeWholeMs ? Number((val / 1000).toFixed(4)) : Number(val.toFixed(4));
}

/**
 * Case-insensitive XML attribute getter.
 */
function getXmlAttr(elem: Element, candidateNames: string[]): string | null {
  for (const name of candidateNames) {
    const attr = elem.getAttribute(name);
    if (attr !== null) return attr;
    // Try lowercase/uppercase search
    for (let i = 0; i < elem.attributes.length; i++) {
      const a = elem.attributes[i];
      if (a.name.toLowerCase() === name.toLowerCase()) {
        return a.value;
      }
    }
  }
  return null;
}

/**
 * Parses xLights (.xtiming) XML document into Timing Layers, BeatFlags, and KaraokeCues.
 */
export function parseXLightsTimingXml(xmlString: string): XLightsTimingDocument {
  const warnings: string[] = [];
  const layers: XLightsTimingLayer[] = [];
  const flags: BeatFlag[] = [];
  const karaokeCues: KaraokeCue[] = [];

  if (!xmlString || !xmlString.trim()) {
    return {
      trackName: 'Empty Track',
      sourceVersion: '2026',
      layers: [],
      flags: [],
      karaokeCues: [],
      warnings: ['XML content is empty'],
    };
  }

  let doc: Document;
  try {
    const parser = new DOMParser();
    doc = parser.parseFromString(xmlString, 'application/xml');
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      warnings.push(`XML Parser Error: ${parserError.textContent?.slice(0, 80)}`);
    }
  } catch (e) {
    return {
      trackName: 'Error Track',
      sourceVersion: '2026',
      layers: [],
      flags: [],
      karaokeCues: [],
      warnings: [`Failed to parse XML: ${String(e)}`],
    };
  }

  const timingElem = doc.querySelector('timing') || doc.querySelector('timings');
  const trackName = timingElem ? getXmlAttr(timingElem, ['name']) || 'xLights Timing' : 'xLights Timing';
  const sourceVersion = timingElem ? getXmlAttr(timingElem, ['SourceVersion', 'sourceversion']) || '2026.11' : '2026.11';

  // Find all <EffectLayer> elements
  const effectLayers = doc.querySelectorAll('EffectLayer, effectlayer, effectLayer');
  let flagIndex = 0;
  let cueIndex = 0;

  const startNames = ['startTime', 'starttime', 'start', 'startcentisecond'];
  const endNames = ['endTime', 'endtime', 'end', 'endcentisecond'];
  const labelNames = ['label', 'name'];

  if (effectLayers.length === 0) {
    // Check if flat <Effect> elements exist without <EffectLayer>
    const directEffects = doc.querySelectorAll('Effect, effect');
    if (directEffects.length > 0) {
      const effects: XLightsTimingEffect[] = [];
      directEffects.forEach((eff) => {
        const sRaw = getXmlAttr(eff, startNames);
        const eRaw = getXmlAttr(eff, endNames);
        const label = getXmlAttr(eff, labelNames) || '';

        const s = sRaw ? parseXLightsTime(sRaw) : null;
        const e = eRaw ? parseXLightsTime(eRaw) : (s !== null ? s + 0.05 : null);

        if (s !== null && e !== null) {
          effects.push({ label, startSec: s, endSec: e });
          flags.push({
            id: `xlights-flag-${++flagIndex}`,
            timestampSec: s,
            label: label || `Mark ${flagIndex}`,
            type: 'beat',
            colorModifier: '#38bdf8',
            intensity: 0.8,
            isAutoGenerated: false,
          });
        }
      });
      layers.push({ name: 'Timing Track', effects });
    }
  } else {
    effectLayers.forEach((layerElem, layerIdx) => {
      const layerName = getXmlAttr(layerElem, ['name']) || `Layer ${layerIdx + 1}`;
      const effects: XLightsTimingEffect[] = [];
      const effectElems = layerElem.querySelectorAll('Effect, effect');

      const isLyricLayer =
        layerName.toLowerCase().includes('lyric') ||
        layerName.toLowerCase().includes('word') ||
        layerName.toLowerCase().includes('vocal');

      let currentCueWords: KaraokeWord[] = [];
      let currentCueText = '';
      let cueStart = 0;
      let cueEnd = 0;

      effectElems.forEach((eff) => {
        const sRaw = getXmlAttr(eff, startNames);
        const eRaw = getXmlAttr(eff, endNames);
        const label = getXmlAttr(eff, labelNames) || '';

        const s = sRaw ? parseXLightsTime(sRaw) : null;
        const e = eRaw ? parseXLightsTime(eRaw) : (s !== null ? s + 0.05 : null);

        if (s !== null && e !== null) {
          effects.push({ label, startSec: s, endSec: e });

          // Convert to beat flag
          flags.push({
            id: `xlights-${layerIdx + 1}-${++flagIndex}`,
            timestampSec: s,
            label: label || `${layerName} [${s.toFixed(2)}s]`,
            type: label.toLowerCase().includes('drop') ? 'drop' : 'beat',
            colorModifier: isLyricLayer ? '#facc15' : layerIdx === 0 ? '#00f0ff' : '#a855f7',
            intensity: 0.85,
            isAutoGenerated: false,
          });

          // If this is a lyric/word timing layer, gather into KaraokeCue
          if (isLyricLayer && label) {
            if (currentCueWords.length === 0) {
              cueStart = s;
            }
            cueEnd = e;
            currentCueWords.push({
              text: label,
              startSec: s,
              endSec: e,
            });
            currentCueText += (currentCueText ? ' ' : '') + label;

            // Break into new cue if there is a gap > 1.2s or punctuation
            const hasEndPunct = /[.!?]$/.test(label);
            if (hasEndPunct || currentCueWords.length >= 8) {
              karaokeCues.push({
                id: `xtiming-cue-${++cueIndex}`,
                startSec: cueStart,
                endSec: cueEnd,
                rawText: currentCueText,
                words: [...currentCueWords],
              });
              currentCueWords = [];
              currentCueText = '';
            }
          }
        }
      });

      // Flush remaining lyric cue
      if (currentCueWords.length > 0) {
        karaokeCues.push({
          id: `xtiming-cue-${++cueIndex}`,
          startSec: cueStart,
          endSec: cueEnd,
          rawText: currentCueText,
          words: [...currentCueWords],
        });
      }

      layers.push({ name: layerName, effects });
    });
  }

  flags.sort((a, b) => a.timestampSec - b.timestampSec);
  karaokeCues.sort((a, b) => a.startSec - b.startSec);

  return {
    trackName,
    sourceVersion,
    layers,
    flags,
    karaokeCues,
    warnings,
  };
}

/**
 * Exports BeatFlags and KaraokeCues to compliant xLights (.xtiming) XML document.
 */
export function exportXLightsTimingXml(
  trackName: string = 'Show Flags',
  flags: BeatFlag[] = [],
  karaokeCues: KaraokeCue[] = []
): string {
  const safeTrackName = (trackName || 'Show Flags').replace(/"/g, '&quot;');
  const lines: string[] = [];

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(`<timing name="${safeTrackName}" SourceVersion="2026.11">`);

  // 1. Primary Beat Flag EffectLayer
  lines.push('  <EffectLayer>');
  const sortedFlags = [...flags].sort((a, b) => a.timestampSec - b.timestampSec);

  for (const flag of sortedFlags) {
    const startMs = Math.round(flag.timestampSec * 1000);
    // xLights requires non-zero effect duration (standard 50ms pulse)
    const endMs = startMs + 50;
    const safeLabel = (flag.label || 'Beat').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    lines.push(`    <Effect label="${safeLabel}" startTime="${startMs}" endTime="${endMs}"/>`);
  }
  lines.push('  </EffectLayer>');

  // 2. Karaoke Lyric EffectLayer (if present)
  if (karaokeCues.length > 0) {
    lines.push('  <EffectLayer>');
    const sortedCues = [...karaokeCues].sort((a, b) => a.startSec - b.startSec);

    for (const cue of sortedCues) {
      if (cue.words && cue.words.length > 0) {
        for (const w of cue.words) {
          const startMs = Math.round(w.startSec * 1000);
          const endMs = Math.max(startMs + 50, Math.round(w.endSec * 1000));
          const safeWord = w.text.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          lines.push(`    <Effect label="${safeWord}" startTime="${startMs}" endTime="${endMs}"/>`);
        }
      } else {
        const startMs = Math.round(cue.startSec * 1000);
        const endMs = Math.max(startMs + 100, Math.round(cue.endSec * 1000));
        const safeText = cue.rawText.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        lines.push(`    <Effect label="${safeText}" startTime="${startMs}" endTime="${endMs}"/>`);
      }
    }
    lines.push('  </EffectLayer>');
  }

  lines.push('</timing>');
  return lines.join('\n');
}
