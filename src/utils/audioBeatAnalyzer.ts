/**
 * Audio-Reactive Engine & Beat/Flag Synthesizer for LUMEN-MAP AI
 * Handles real-time Web Audio API FFT analysis (bass/mids/highs),
 * offline transient onset beat detection, and manual tap-tempo calculation.
 */

import { BeatFlag } from '../store/useProjectionStore';

export interface AudioSpectrumData {
  bass: number;       // 0.0 - 1.0 (Sub-bass / Kick drum, 20-250 Hz)
  mids: number;       // 0.0 - 1.0 (Vocals / Chords, 250-2000 Hz)
  highs: number;      // 0.0 - 1.0 (Percussion / Cymbals, 2000-16000 Hz)
  energy: number;     // 0.0 - 1.0 (Overall RMS amplitude)
  beatDetected: boolean;
  frequencyBins: Uint8Array;
}

class AudioReactiveEngine {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceMap = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
  private freqData: Uint8Array = new Uint8Array(128);
  private lastBeatTime: number = 0;
  private energyHistory: number[] = [];

  public getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public connectMediaElement(element: HTMLMediaElement) {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      if (!this.analyser) {
        this.analyser = ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.82;
        this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
      }

      if (!this.sourceMap.has(element)) {
        const source = ctx.createMediaElementSource(element);
        source.connect(this.analyser);
        this.analyser.connect(ctx.destination);
        this.sourceMap.set(element, source);
      }
    } catch (e) {
      console.warn('AudioReactiveEngine: Media element connection notice (fallback simulation active):', e);
    }
  }

  public getSpectrum(): AudioSpectrumData {
    if (!this.analyser) {
      // Procedural synthetic audio fallback when no physical media element is piped
      const t = performance.now() / 1000;
      const simBass = Math.max(0, Math.sin(t * 4 * Math.PI) * 0.85 + 0.15);
      const simMids = Math.max(0, Math.sin(t * 8 * Math.PI + 1) * 0.6 + 0.2);
      const simHighs = Math.max(0, Math.cos(t * 16 * Math.PI) * 0.4 + 0.1);
      const simEnergy = (simBass * 0.5 + simMids * 0.3 + simHighs * 0.2);
      return {
        bass: simBass,
        mids: simMids,
        highs: simHighs,
        energy: simEnergy,
        beatDetected: simBass > 0.78,
        frequencyBins: new Uint8Array(128).fill(Math.round(simEnergy * 255)),
      };
    }

    this.analyser.getByteFrequencyData(this.freqData);

    // Bins: 128 total bins (approx 172Hz per bin for 44.1kHz)
    // Bass: bins 0 to 4 (approx 0 - 250 Hz)
    let bassSum = 0;
    for (let i = 0; i < 4; i++) bassSum += this.freqData[i] || 0;
    const bass = Math.min(1, bassSum / (4 * 255));

    // Mids: bins 4 to 24 (approx 250 - 2000 Hz)
    let midsSum = 0;
    for (let i = 4; i < 24; i++) midsSum += this.freqData[i] || 0;
    const mids = Math.min(1, midsSum / (20 * 255));

    // Highs: bins 24 to 80 (approx 2000 - 8000 Hz)
    let highsSum = 0;
    for (let i = 24; i < 80; i++) highsSum += this.freqData[i] || 0;
    const highs = Math.min(1, highsSum / (56 * 255));

    // Overall energy
    const energy = bass * 0.55 + mids * 0.3 + highs * 0.15;

    // Running beat detector
    this.energyHistory.push(bass);
    if (this.energyHistory.length > 30) this.energyHistory.shift();
    const avgBass =
      this.energyHistory.reduce((a, b) => a + b, 0) / (this.energyHistory.length || 1);

    const now = performance.now();
    let beatDetected = false;
    if (bass > avgBass * 1.35 && bass > 0.45 && now - this.lastBeatTime > 260) {
      beatDetected = true;
      this.lastBeatTime = now;
    }

    return {
      bass,
      mids,
      highs,
      energy,
      beatDetected,
      frequencyBins: this.freqData,
    };
  }
}

export const audioReactiveEngine = new AudioReactiveEngine();

/**
 * Offline Synthesizer & Audio Buffer Analyzer
 * Automatically detects tempo, beat drops, and transient flags across the track
 */
export async function autoSynthesizeBeatsAndFlags(
  audioUrl: string,
  targetDurationSec: number = 60,
  bpmHint: number = 120
): Promise<{ bpm: number; flags: BeatFlag[] }> {
  try {
    const response = await fetch(audioUrl);
    if (!response.ok) throw new Error('Audio fetch failed');
    const arrayBuffer = await response.arrayBuffer();

    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const offlineCtx = new AudioCtxClass();
    const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);

    const duration = audioBuffer.duration || targetDurationSec;
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    // Window analysis: 50ms buckets
    const bucketSize = Math.floor(sampleRate * 0.05);
    const numBuckets = Math.floor(channelData.length / bucketSize);
    const energies: number[] = new Array(numBuckets);

    for (let i = 0; i < numBuckets; i++) {
      let sum = 0;
      const start = i * bucketSize;
      for (let j = 0; j < bucketSize; j++) {
        const val = channelData[start + j];
        sum += val * val;
      }
      energies[i] = Math.sqrt(sum / bucketSize);
    }

    // Dynamic threshold detection
    const flags: BeatFlag[] = [];
    const minBeatGapBuckets = Math.floor(0.3 / 0.05); // 300ms min gap
    let lastFlagBucket = -minBeatGapBuckets;

    // Calculate average energy
    const meanEnergy = energies.reduce((a, b) => a + b, 0) / (energies.length || 1);
    const threshold = meanEnergy * 1.5;

    const layerTargets = [
      'layer-roofline',
      'layer-garage',
      'layer-windows',
      'layer-pillars',
      'layer-mainwalls',
    ];
    const neonColors = ['#00f0ff', '#a855f7', '#22c55e', '#f59e0b', '#ec4899', '#38bdf8'];

    for (let i = 1; i < numBuckets - 1; i++) {
      const e = energies[i];
      const isPeak = e > energies[i - 1] && e > energies[i + 1];

      if (isPeak && e > threshold && i - lastFlagBucket >= minBeatGapBuckets) {
        const timestampSec = Number((i * 0.05).toFixed(3));
        const relativeRatio = e / (meanEnergy || 1);

        let type: BeatFlag['type'] = 'beat';
        let label = 'Kick Beat';
        let color = neonColors[flags.length % neonColors.length];

        if (relativeRatio > 3.0) {
          type = 'drop';
          label = '⚡ Massive Bass Drop';
          color = '#ef4444';
        } else if (relativeRatio > 2.2) {
          type = 'color-shift';
          label = '🎨 Synth Color Shift';
          color = '#a855f7';
        } else {
          type = 'beat';
          label = `Beat ${flags.length + 1}`;
        }

        const targetLayer =
          type === 'drop'
            ? 'all'
            : layerTargets[flags.length % layerTargets.length];

        flags.push({
          id: `flag-${Date.now()}-${flags.length}`,
          timestampSec,
          label,
          type,
          targetLayerId: targetLayer,
          colorModifier: color,
          intensity: Math.min(1.0, Number((0.5 + relativeRatio * 0.15).toFixed(2))),
          isAutoGenerated: true,
        });

        lastFlagBucket = i;
      }
    }

    // Estimate BPM from detected intervals
    let estimatedBpm = bpmHint;
    if (flags.length > 4) {
      const intervals: number[] = [];
      for (let i = 1; i < Math.min(flags.length, 30); i++) {
        intervals.push(flags[i].timestampSec - flags[i - 1].timestampSec);
      }
      const medianInterval = intervals.sort((a, b) => a - b)[Math.floor(intervals.length / 2)];
      if (medianInterval > 0.25 && medianInterval < 1.5) {
        estimatedBpm = Math.round(60 / medianInterval);
        if (estimatedBpm < 70) estimatedBpm *= 2;
        if (estimatedBpm > 180) estimatedBpm = Math.round(estimatedBpm / 2);
      }
    }

    return { bpm: estimatedBpm, flags };
  } catch (err) {
    console.warn('Offline audio decode fallback generated:', err);
    // Procedural musical beat synthesizer fallback based on tempo
    const flags: BeatFlag[] = [];
    const beatInterval = 60 / bpmHint;
    const totalBeats = Math.floor(targetDurationSec / beatInterval);

    for (let i = 0; i < totalBeats; i++) {
      const timestampSec = Number((i * beatInterval).toFixed(3));
      const isBarStart = i % 4 === 0;
      const isDrop = i === 16 || i === 32 || i === 48;

      flags.push({
        id: `auto-flag-${i}`,
        timestampSec,
        label: isDrop ? '⚡ Bass Drop' : isBarStart ? 'Bar Downbeat' : `Beat ${i + 1}`,
        type: isDrop ? 'drop' : isBarStart ? 'color-shift' : 'beat',
        targetLayerId: isDrop ? 'all' : i % 2 === 0 ? 'layer-roofline' : 'layer-garage',
        colorModifier: isDrop ? '#ef4444' : isBarStart ? '#a855f7' : '#00f0ff',
        intensity: isDrop ? 1.0 : isBarStart ? 0.85 : 0.6,
        isAutoGenerated: true,
      });
    }

    return { bpm: bpmHint, flags };
  }
}

/**
 * Tap-Tempo Calculation Helper
 */
export class TapTempoCalculator {
  private tapTimes: number[] = [];

  public tap(): number | null {
    const now = performance.now();
    // Reset if last tap was more than 2.5 seconds ago
    if (this.tapTimes.length > 0 && now - this.tapTimes[this.tapTimes.length - 1] > 2500) {
      this.tapTimes = [];
    }

    this.tapTimes.push(now);
    if (this.tapTimes.length > 8) this.tapTimes.shift();

    if (this.tapTimes.length < 3) return null;

    const intervals: number[] = [];
    for (let i = 1; i < this.tapTimes.length; i++) {
      intervals.push(this.tapTimes[i] - this.tapTimes[i - 1]);
    }

    const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const bpm = Math.round(60000 / avgMs);
    return Math.max(40, Math.min(240, bpm));
  }

  public reset() {
    this.tapTimes = [];
  }
}
