/**
 * liveAudioMidiEngine.ts
 * Live Audio-Reactive Spectrum Analyzer (2048-point FFT, logarithmic 5-band isolation,
 * attack/release smoothing filter, spectral flux onset detection) & Web MIDI Controller Studio.
 * Part of Work Package 3: MARSHALL_PARITY_MASTER_REPORT_PHASE2.md
 */

export interface AudioFrequencyBands {
  subBass: number;       // 20-60 Hz [0-1]
  bass: number;          // 60-250 Hz [0-1]
  lowMid: number;        // 250-500 Hz [0-1]
  mid: number;           // 500-2000 Hz [0-1]
  treble: number;        // 2000-16000 Hz [0-1]
  overallEnergy: number; // [0-1]
}

export interface LiveAudioAnalyzerOptions {
  sensitivity: number;           // 0.1 - 4.0 (multiplier on raw FFT band magnitudes)
  attackSeconds: number;         // Time constant for rising signals (e.g. 0.015s / 15ms)
  releaseSeconds: number;        // Time constant for falling signals (e.g. 0.120s / 120ms)
  fftSize: number;               // 256 to 4096 (default 2048)
  smoothingTimeConstant: number; // Web Audio API AnalyserNode smoothing (0.0 to 1.0)
}

export type ModulationTarget =
  | 'master_dimmer'
  | 'bulb_speed'
  | 'icicle_drip'
  | 'strobe_intensity'
  | 'particle_speed'
  | 'plasma_frequency';

export interface AudioModulationRule {
  id: string;
  band: keyof AudioFrequencyBands;
  target: ModulationTarget;
  minOutput: number;
  maxOutput: number;
  enabled: boolean;
}

export interface MidiMappingEntry {
  id: string;
  noteOrCc: number;
  isCc: boolean;
  channel: number; // 1-16 (or 0 for all channels)
  actionName: string;
  actionType:
    | 'scene_launch'
    | 'blackout'
    | 'master_dimmer'
    | 'audio_volume'
    | 'strobe'
    | 'speed_nudge';
  targetValue?: number;
}

export interface LiveAudioMidiProfile {
  options: LiveAudioAnalyzerOptions;
  modulationRules: AudioModulationRule[];
  midiMappings: MidiMappingEntry[];
}

export interface MidiDeviceInfo {
  id: string;
  name: string;
  manufacturer: string;
  state: string;
  connection: string;
}

export interface MidiRawEvent {
  id: string;
  timestamp: number;
  deviceName: string;
  channel: number;
  isCc: boolean;
  noteOrCc: number;
  value: number;
  normalized: number;
  type: string;
  matchedAction?: string;
}

export const DEFAULT_LIVE_AUDIO_ANALYZER_OPTIONS: LiveAudioAnalyzerOptions = {
  sensitivity: 1.25,
  attackSeconds: 0.015,
  releaseSeconds: 0.12,
  fftSize: 2048,
  smoothingTimeConstant: 0.8,
};

export const DEFAULT_AUDIO_MODULATION_RULES: AudioModulationRule[] = [
  {
    id: 'mod-bass-bulb',
    band: 'bass',
    target: 'bulb_speed',
    minOutput: 0.5,
    maxOutput: 3.0,
    enabled: true,
  },
  {
    id: 'mod-subbass-strobe',
    band: 'subBass',
    target: 'strobe_intensity',
    minOutput: 0.0,
    maxOutput: 1.0,
    enabled: true,
  },
  {
    id: 'mod-energy-dimmer',
    band: 'overallEnergy',
    target: 'master_dimmer',
    minOutput: 0.35,
    maxOutput: 1.0,
    enabled: true,
  },
  {
    id: 'mod-treble-icicle',
    band: 'treble',
    target: 'icicle_drip',
    minOutput: 0.0,
    maxOutput: 2.5,
    enabled: true,
  },
  {
    id: 'mod-mid-particle',
    band: 'mid',
    target: 'particle_speed',
    minOutput: 0.2,
    maxOutput: 2.0,
    enabled: false,
  },
  {
    id: 'mod-lowmid-plasma',
    band: 'lowMid',
    target: 'plasma_frequency',
    minOutput: 0.1,
    maxOutput: 1.5,
    enabled: false,
  },
];

export const DEFAULT_MIDI_MAPPINGS: MidiMappingEntry[] = [
  { id: 'midi-pad-0', noteOrCc: 36, isCc: false, channel: 1, actionName: 'Launch Scene Pad 0', actionType: 'scene_launch', targetValue: 0 },
  { id: 'midi-pad-1', noteOrCc: 37, isCc: false, channel: 1, actionName: 'Launch Scene Pad 1', actionType: 'scene_launch', targetValue: 1 },
  { id: 'midi-pad-2', noteOrCc: 38, isCc: false, channel: 1, actionName: 'Launch Scene Pad 2', actionType: 'scene_launch', targetValue: 2 },
  { id: 'midi-pad-3', noteOrCc: 39, isCc: false, channel: 1, actionName: 'Launch Scene Pad 3', actionType: 'scene_launch', targetValue: 3 },
  { id: 'midi-pad-4', noteOrCc: 40, isCc: false, channel: 1, actionName: 'Launch Scene Pad 4', actionType: 'scene_launch', targetValue: 4 },
  { id: 'midi-pad-5', noteOrCc: 41, isCc: false, channel: 1, actionName: 'Launch Scene Pad 5', actionType: 'scene_launch', targetValue: 5 },
  { id: 'midi-pad-6', noteOrCc: 42, isCc: false, channel: 1, actionName: 'Launch Scene Pad 6', actionType: 'scene_launch', targetValue: 6 },
  { id: 'midi-pad-7', noteOrCc: 43, isCc: false, channel: 1, actionName: 'Launch Scene Pad 7', actionType: 'scene_launch', targetValue: 7 },
  { id: 'midi-blackout', noteOrCc: 44, isCc: false, channel: 1, actionName: 'Emergency Master Blackout', actionType: 'blackout' },
  { id: 'midi-strobe', noteOrCc: 45, isCc: false, channel: 1, actionName: 'Thunder Strobe Burst', actionType: 'strobe' },
  { id: 'midi-knob-dimmer', noteOrCc: 1, isCc: true, channel: 1, actionName: 'Master Dimmer CC#1 Knob', actionType: 'master_dimmer' },
  { id: 'midi-knob-volume', noteOrCc: 7, isCc: true, channel: 1, actionName: 'Audio Master Volume CC#7 Knob', actionType: 'audio_volume' },
  { id: 'midi-speed-nudge', noteOrCc: 46, isCc: false, channel: 1, actionName: 'Speed Nudge (+25%)', actionType: 'speed_nudge', targetValue: 1.25 },
];

export const DEFAULT_LIVE_AUDIO_MIDI_PROFILE: LiveAudioMidiProfile = {
  options: DEFAULT_LIVE_AUDIO_ANALYZER_OPTIONS,
  modulationRules: DEFAULT_AUDIO_MODULATION_RULES,
  midiMappings: DEFAULT_MIDI_MAPPINGS,
};

const STORAGE_PROFILE_KEY = 'gemini_projection_live_audio_midi_profile_v2';

export function saveLiveAudioMidiProfile(profile: LiveAudioMidiProfile): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(profile));
    }
  } catch (e) {
    console.error('Failed to save Live Audio & MIDI profile to localStorage:', e);
  }
}

export function loadLiveAudioMidiProfile(): LiveAudioMidiProfile {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_PROFILE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          options: { ...DEFAULT_LIVE_AUDIO_ANALYZER_OPTIONS, ...(parsed.options || {}) },
          modulationRules: Array.isArray(parsed.modulationRules) && parsed.modulationRules.length > 0
            ? parsed.modulationRules
            : DEFAULT_AUDIO_MODULATION_RULES,
          midiMappings: Array.isArray(parsed.midiMappings) && parsed.midiMappings.length > 0
            ? parsed.midiMappings
            : DEFAULT_MIDI_MAPPINGS,
        };
      }
    }
  } catch (e) {
    console.warn('Failed to parse saved Live Audio & MIDI profile, using defaults:', e);
  }
  return DEFAULT_LIVE_AUDIO_MIDI_PROFILE;
}

export function computeModulatedValue(bandEnergy: number, rule: AudioModulationRule): number {
  const clamped = Math.max(0, Math.min(1, bandEnergy));
  return rule.minOutput + clamped * (rule.maxOutput - rule.minOutput);
}

export function computeAllModulations(
  bands: AudioFrequencyBands,
  rules: AudioModulationRule[]
): Record<ModulationTarget, number> {
  const result: Record<ModulationTarget, number> = {
    master_dimmer: 1.0,
    bulb_speed: 1.0,
    icicle_drip: 1.0,
    strobe_intensity: 0.0,
    particle_speed: 1.0,
    plasma_frequency: 1.0,
  };

  for (const rule of rules) {
    if (!rule.enabled) continue;
    const bandValue = bands[rule.band] ?? 0;
    result[rule.target] = computeModulatedValue(bandValue, rule);
  }

  return result;
}

/**
 * LiveAudioAnalyzer:
 * Web Audio API AnalyserNode engine with 2048-point FFT, logarithmic 5-band isolation,
 * attack/release smoothing filter, and spectral flux transient onset detection.
 */
export class LiveAudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaSource: MediaStreamAudioSourceNode | null = null;
  
  // Synthetic test tone nodes & state
  private isSimulated: boolean = false;
  private simOscillator: OscillatorNode | null = null;
  private simGain: GainNode | null = null;
  private simIntervalId: number | null = null;
  private simBpm: number = 128;
  
  private options: LiveAudioAnalyzerOptions;
  private rawFrequencyData: Uint8Array = new Uint8Array(1024);
  private rawWaveformData: Uint8Array = new Uint8Array(1024);
  
  // Smoothing state
  private smoothedBands: AudioFrequencyBands = {
    subBass: 0,
    bass: 0,
    lowMid: 0,
    mid: 0,
    treble: 0,
    overallEnergy: 0,
  };
  private lastFrameTimestamp: number = 0;
  
  // Spectral flux onset detector state
  private previousSpectrum: Float32Array = new Float32Array(512);
  private fluxHistory: number[] = [];
  private lastOnsetTime: number = 0;
  private isCurrentlyActive: boolean = false;

  constructor(options: Partial<LiveAudioAnalyzerOptions> = {}) {
    this.options = { ...DEFAULT_LIVE_AUDIO_ANALYZER_OPTIONS, ...options };
    this.lastFrameTimestamp = typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  public getOptions(): LiveAudioAnalyzerOptions {
    return { ...this.options };
  }

  public setOptions(opts: Partial<LiveAudioAnalyzerOptions>): void {
    this.options = { ...this.options, ...opts };
    if (this.analyserNode) {
      if (opts.fftSize && opts.fftSize >= 256 && opts.fftSize <= 4096) {
        this.analyserNode.fftSize = opts.fftSize;
        this.rawFrequencyData = new Uint8Array(this.analyserNode.frequencyBinCount);
        this.rawWaveformData = new Uint8Array(this.analyserNode.frequencyBinCount);
      }
      if (opts.smoothingTimeConstant !== undefined) {
        this.analyserNode.smoothingTimeConstant = Math.min(
          1,
          Math.max(0, opts.smoothingTimeConstant)
        );
      }
    }
  }

  public isActive(): boolean {
    return this.isCurrentlyActive;
  }

  public isSimulating(): boolean {
    return this.isSimulated;
  }

  private initAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioContext) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioContext = new AudioCtxClass();
      }
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    return this.audioContext;
  }

  private initAnalyserNode(): AnalyserNode | null {
    const ctx = this.initAudioContext();
    if (!ctx) return null;
    if (!this.analyserNode) {
      this.analyserNode = ctx.createAnalyser();
      this.analyserNode.fftSize = this.options.fftSize;
      this.analyserNode.smoothingTimeConstant = this.options.smoothingTimeConstant;
      this.rawFrequencyData = new Uint8Array(this.analyserNode.frequencyBinCount);
      this.rawWaveformData = new Uint8Array(this.analyserNode.frequencyBinCount);
    }
    return this.analyserNode;
  }

  /**
   * Starts capturing live microphone audio via getUserMedia.
   */
  public async startMicrophone(): Promise<boolean> {
    this.stop();

    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('Microphone getUserMedia is not supported in this environment.');
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      const ctx = this.initAudioContext();
      const analyser = this.initAnalyserNode();
      if (!ctx || !analyser) {
        stream.getTracks().forEach((t) => t.stop());
        return false;
      }

      this.mediaStream = stream;
      this.mediaSource = ctx.createMediaStreamSource(stream);
      this.mediaSource.connect(analyser);

      this.isSimulated = false;
      this.isCurrentlyActive = true;
      this.lastFrameTimestamp = performance.now();
      return true;
    } catch (err) {
      console.warn('Microphone permission denied or unavailable, falling back to simulated signal:', err);
      this.startSimulatedSignal(this.simBpm);
      return false;
    }
  }

  /**
   * Starts a simulated EDM/Holiday kick, bass, and hi-hat beat generator (e.g. 128 BPM).
   */
  public startSimulatedSignal(bpm: number = 128): void {
    this.stop();

    this.simBpm = Math.max(60, Math.min(240, bpm));
    const ctx = this.initAudioContext();
    const analyser = this.initAnalyserNode();

    this.isSimulated = true;
    this.isCurrentlyActive = true;
    this.lastFrameTimestamp = performance.now();

    if (ctx && analyser) {
      // Connect a synthetic low-amplitude multi-oscillator beat generator
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(55, ctx.currentTime); // 55Hz Sub-Bass Kick
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);

        osc.connect(gain);
        gain.connect(analyser); // analyser only, not destination, to avoid speaker blast
        osc.start();

        this.simOscillator = osc;
        this.simGain = gain;

        // Schedule periodic kick / snare / hihat pulse envelopes into analyser
        const beatIntervalMs = (60 / this.simBpm) * 1000;
        let beatCounter = 0;

        this.simIntervalId = window.setInterval(() => {
          if (!this.simGain || !this.simOscillator || !this.audioContext) return;
          const now = this.audioContext.currentTime;
          beatCounter = (beatCounter + 1) % 4;

          // Pulse kick drum on every beat
          this.simOscillator.frequency.cancelScheduledValues(now);
          this.simOscillator.frequency.setValueAtTime(140, now);
          this.simOscillator.frequency.exponentialRampToValueAtTime(50, now + 0.12);

          this.simGain.gain.cancelScheduledValues(now);
          this.simGain.gain.setValueAtTime(0.6, now);
          this.simGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        }, beatIntervalMs);
      } catch (e) {
        console.warn('Web Audio node creation failed in simulation:', e);
      }
    }
  }

  /**
   * Stops microphone capture, simulation oscillators, and timers.
   */
  public stop(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.mediaSource) {
      try {
        this.mediaSource.disconnect();
      } catch {}
      this.mediaSource = null;
    }
    if (this.simOscillator) {
      try {
        this.simOscillator.stop();
        this.simOscillator.disconnect();
      } catch {}
      this.simOscillator = null;
    }
    if (this.simGain) {
      try {
        this.simGain.disconnect();
      } catch {}
      this.simGain = null;
    }
    if (this.simIntervalId !== null) {
      clearInterval(this.simIntervalId);
      this.simIntervalId = null;
    }

    this.isCurrentlyActive = false;
    this.isSimulated = false;
  }

  /**
   * Returns current raw FFT magnitude spectrum (0 to 255 per bin).
   */
  public getFrequencyData(): Uint8Array {
    if (this.analyserNode && this.isCurrentlyActive) {
      if (this.rawFrequencyData.length !== this.analyserNode.frequencyBinCount) {
        this.rawFrequencyData = new Uint8Array(this.analyserNode.frequencyBinCount);
      }
      this.analyserNode.getByteFrequencyData(this.rawFrequencyData);
      return this.rawFrequencyData;
    }

    // Procedural synthesis fallback if no active audio node
    if (this.isSimulated && this.isCurrentlyActive) {
      return this.generateProceduralFrequencyData();
    }

    // Silence
    this.rawFrequencyData.fill(0);
    return this.rawFrequencyData;
  }

  /**
   * Returns current time-domain oscilloscope waveform (0 to 255, 128 is center).
   */
  public getWaveformData(): Uint8Array {
    if (this.analyserNode && this.isCurrentlyActive) {
      if (this.rawWaveformData.length !== this.analyserNode.frequencyBinCount) {
        this.rawWaveformData = new Uint8Array(this.analyserNode.frequencyBinCount);
      }
      this.analyserNode.getByteTimeDomainData(this.rawWaveformData);
      return this.rawWaveformData;
    }

    // Procedural synthesis fallback
    if (this.isSimulated && this.isCurrentlyActive) {
      return this.generateProceduralWaveformData();
    }

    this.rawWaveformData.fill(128);
    return this.rawWaveformData;
  }

  /**
   * Computes logarithmically binned, attack/release smoothed frequency bands [0.0 - 1.0].
   */
  public getBands(): AudioFrequencyBands {
    const freqData = this.getFrequencyData();
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const dtSeconds = Math.max(0.001, Math.min(0.1, (now - this.lastFrameTimestamp) / 1000));
    this.lastFrameTimestamp = now;

    const sampleRate = this.audioContext?.sampleRate || 48000;
    const binCount = freqData.length || 1024;
    const binWidth = sampleRate / (binCount * 2); // Nyquist / binCount

    // Bin index calculations for 5 bands
    const getBin = (freq: number) => Math.max(0, Math.min(binCount - 1, Math.round(freq / binWidth)));

    const subBassBinStart = getBin(20);
    const subBassBinEnd = Math.max(subBassBinStart, getBin(60));

    const bassBinStart = subBassBinEnd + 1;
    const bassBinEnd = Math.max(bassBinStart, getBin(250));

    const lowMidBinStart = bassBinEnd + 1;
    const lowMidBinEnd = Math.max(lowMidBinStart, getBin(500));

    const midBinStart = lowMidBinEnd + 1;
    const midBinEnd = Math.max(midBinStart, getBin(2000));

    const trebleBinStart = midBinEnd + 1;
    const trebleBinEnd = Math.max(trebleBinStart, getBin(16000));

    const rawSubBass = this.calcBandAverage(freqData, subBassBinStart, subBassBinEnd);
    const rawBass = this.calcBandAverage(freqData, bassBinStart, bassBinEnd);
    const rawLowMid = this.calcBandAverage(freqData, lowMidBinStart, lowMidBinEnd);
    const rawMid = this.calcBandAverage(freqData, midBinStart, midBinEnd);
    const rawTreble = this.calcBandAverage(freqData, trebleBinStart, trebleBinEnd);

    // Apply attack and release smoothing filter
    this.smoothedBands.subBass = this.applyAttackRelease(rawSubBass, this.smoothedBands.subBass, dtSeconds);
    this.smoothedBands.bass = this.applyAttackRelease(rawBass, this.smoothedBands.bass, dtSeconds);
    this.smoothedBands.lowMid = this.applyAttackRelease(rawLowMid, this.smoothedBands.lowMid, dtSeconds);
    this.smoothedBands.mid = this.applyAttackRelease(rawMid, this.smoothedBands.mid, dtSeconds);
    this.smoothedBands.treble = this.applyAttackRelease(rawTreble, this.smoothedBands.treble, dtSeconds);

    // Overall energy: weighted composite with slight sub/bass emphasis
    const energy = Math.min(
      1.0,
      this.smoothedBands.subBass * 0.28 +
        this.smoothedBands.bass * 0.28 +
        this.smoothedBands.lowMid * 0.2 +
        this.smoothedBands.mid * 0.14 +
        this.smoothedBands.treble * 0.1
    );
    this.smoothedBands.overallEnergy = energy;

    return { ...this.smoothedBands };
  }

  /**
   * Spectral flux transient onset detector.
   * Returns true on the frame an onset beat begins.
   */
  public isOnset(): boolean {
    if (!this.isCurrentlyActive) return false;

    const freqData = this.getFrequencyData();
    const len = Math.min(256, freqData.length);
    let flux = 0;

    for (let i = 0; i < len; i++) {
      const current = freqData[i] / 255;
      const prev = this.previousSpectrum[i] || 0;
      const diff = current - prev;
      if (diff > 0) {
        flux += diff;
      }
      this.previousSpectrum[i] = current;
    }

    // Moving average of flux
    this.fluxHistory.push(flux);
    if (this.fluxHistory.length > 24) {
      this.fluxHistory.shift();
    }
    const avgFlux = this.fluxHistory.reduce((a, b) => a + b, 0) / this.fluxHistory.length;
    const threshold = avgFlux * 1.5 + 0.12;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const minIntervalMs = 120; // Maximum ~500 BPM trigger rate limit

    if (flux > threshold && now - this.lastOnsetTime > minIntervalMs) {
      this.lastOnsetTime = now;
      return true;
    }
    return false;
  }

  private calcBandAverage(data: Uint8Array, start: number, end: number): number {
    if (end < start || data.length === 0) return 0;
    let sum = 0;
    const count = end - start + 1;
    for (let i = start; i <= end; i++) {
      sum += data[i] || 0;
    }
    const normalized = sum / (count * 255);
    return Math.max(0, Math.min(1.0, normalized * this.options.sensitivity));
  }

  private applyAttackRelease(current: number, smoothed: number, dtSeconds: number): number {
    const isAttack = current > smoothed;
    const tau = isAttack ? this.options.attackSeconds : this.options.releaseSeconds;
    const safeTau = Math.max(0.002, tau);
    const alpha = 1 - Math.exp(-dtSeconds / safeTau);
    return smoothed + alpha * (current - smoothed);
  }

  private generateProceduralFrequencyData(): Uint8Array {
    const time = performance.now() / 1000;
    const beatSec = 60 / this.simBpm;
    const beatPhase = (time % beatSec) / beatSec; // 0 to 1
    const kickEnv = Math.max(0, 1 - beatPhase * 3.5); // Sharp kick decay

    const len = this.rawFrequencyData.length;
    for (let i = 0; i < len; i++) {
      let val = 0;
      // Sub-bass & bass peaks
      if (i < 12) {
        val = kickEnv * 240 + Math.sin(time * 8 + i) * 15;
      } else if (i < 30) {
        val = kickEnv * 180 + Math.sin(time * 12 + i) * 20;
      } else if (i < 80) {
        // Low-mids / chords
        val = 70 + Math.sin(time * 4 + i * 0.3) * 45;
      } else if (i < 200) {
        // Mids / melody
        val = 60 + Math.cos(time * 6 + i * 0.2) * 40;
      } else {
        // Treble / hi-hat tick
        const hatPhase = ((time * 2) % beatSec) / beatSec;
        const hatEnv = Math.max(0, 1 - hatPhase * 6);
        val = hatEnv * 120 + Math.sin(time * 20 + i) * 15;
      }
      this.rawFrequencyData[i] = Math.max(0, Math.min(255, Math.floor(val)));
    }
    return this.rawFrequencyData;
  }

  private generateProceduralWaveformData(): Uint8Array {
    const time = performance.now() / 1000;
    const len = this.rawWaveformData.length;
    for (let i = 0; i < len; i++) {
      const phase = (i / len) * Math.PI * 4;
      const val = 128 + Math.sin(phase + time * 10) * 60 + Math.sin(phase * 3 + time * 18) * 25;
      this.rawWaveformData[i] = Math.max(0, Math.min(255, Math.floor(val)));
    }
    return this.rawWaveformData;
  }
}

/**
 * WebMidiManager:
 * Browser Web MIDI API integration with device enumeration, Note/CC decoding,
 * MIDI-Learn binding listener, and action dispatcher.
 */
export class WebMidiManager {
  private midiAccess: MIDIAccess | null = null;
  private mappings: MidiMappingEntry[] = [];
  private isLearningActive: boolean = false;
  private learnCallback: ((learned: { isCc: boolean; noteOrCc: number; channel: number; value: number }) => void) | null = null;
  private actionHandler: ((entry: MidiMappingEntry, rawValue: number, normalizedValue: number) => void) | null = null;
  private rawEventSubscribers: Set<(event: MidiRawEvent) => void> = new Set();
  private eventHistory: MidiRawEvent[] = [];

  constructor(initialMappings: MidiMappingEntry[] = DEFAULT_MIDI_MAPPINGS) {
    this.mappings = [...initialMappings];
  }

  public static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
  }

  public async requestAccess(): Promise<boolean> {
    if (!WebMidiManager.isSupported()) {
      console.warn('Web MIDI API is not supported in this browser.');
      return false;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      this.attachInputListeners();
      
      this.midiAccess.onstatechange = () => {
        this.attachInputListeners();
      };
      return true;
    } catch (err) {
      console.warn('Web MIDI permission denied or unavailable:', err);
      return false;
    }
  }

  public getConnectedDevices(): MidiDeviceInfo[] {
    if (!this.midiAccess) return [];
    const list: MidiDeviceInfo[] = [];
    this.midiAccess.inputs.forEach((input) => {
      list.push({
        id: input.id,
        name: input.name || 'Generic USB MIDI Device',
        manufacturer: input.manufacturer || 'Unknown',
        state: input.state,
        connection: input.connection,
      });
    });
    return list;
  }

  public setMappings(mappings: MidiMappingEntry[]): void {
    this.mappings = [...mappings];
  }

  public getMappings(): MidiMappingEntry[] {
    return [...this.mappings];
  }

  public onActionTriggered(
    handler: (entry: MidiMappingEntry, rawValue: number, normalizedValue: number) => void
  ): void {
    this.actionHandler = handler;
  }

  public subscribeRawEvents(cb: (event: MidiRawEvent) => void): () => void {
    this.rawEventSubscribers.add(cb);
    return () => {
      this.rawEventSubscribers.delete(cb);
    };
  }

  public getRecentEvents(): MidiRawEvent[] {
    return [...this.eventHistory];
  }

  public clearRecentEvents(): void {
    this.eventHistory = [];
  }

  public startLearn(
    callback: (learned: { isCc: boolean; noteOrCc: number; channel: number; value: number }) => void
  ): void {
    this.isLearningActive = true;
    this.learnCallback = callback;
  }

  public stopLearn(): void {
    this.isLearningActive = false;
    this.learnCallback = null;
  }

  public isLearning(): boolean {
    return this.isLearningActive;
  }

  /**
   * Allows simulated MIDI events to be fired from UI buttons/knobs without physical hardware.
   */
  public simulateMidiMessage(
    isCc: boolean,
    noteOrCc: number,
    channel: number = 1,
    value: number = 127
  ): void {
    const status = isCc ? 0xb0 | ((channel - 1) & 0x0f) : 0x90 | ((channel - 1) & 0x0f);
    const data = new Uint8Array([status, noteOrCc, value]);
    this.handleIncomingMidiPacket(data, 'Virtual MIDI Port');
  }

  private attachInputListeners(): void {
    if (!this.midiAccess) return;
    this.midiAccess.inputs.forEach((input) => {
      input.onmidimessage = (event: MIDIMessageEvent) => {
        if (event.data) {
          this.handleIncomingMidiPacket(event.data, input.name || 'MIDI Input');
        }
      };
    });
  }

  private handleIncomingMidiPacket(data: Uint8Array, deviceName: string): void {
    if (data.length < 2) return;
    const status = data[0];
    const command = status & 0xf0;
    const channel = (status & 0x0f) + 1; // 1-16
    const noteOrCc = data[1];
    const rawVal = data.length > 2 ? data[2] : 0;

    let isCc = false;
    let typeStr = 'Unknown';
    let isTrigger = false;

    if (command === 0x90) {
      // Note On
      isCc = false;
      if (rawVal === 0) {
        typeStr = 'Note Off';
      } else {
        typeStr = 'Note On';
        isTrigger = true;
      }
    } else if (command === 0x80) {
      // Note Off
      isCc = false;
      typeStr = 'Note Off';
    } else if (command === 0xb0) {
      // Control Change
      isCc = true;
      typeStr = 'Control Change';
      isTrigger = true;
    } else {
      return;
    }

    const normalized = isCc ? rawVal / 127 : rawVal / 127;

    // 1. If currently in MIDI Learn mode, capture and notify listener
    if (this.isLearningActive && this.learnCallback && isTrigger) {
      const cb = this.learnCallback;
      this.stopLearn();
      cb({ isCc, noteOrCc, channel, value: rawVal });
    }

    // 2. Match against active mappings
    let matchedActionName: string | undefined;
    if (isTrigger) {
      const match = this.mappings.find(
        (m) =>
          m.isCc === isCc &&
          m.noteOrCc === noteOrCc &&
          (m.channel === 0 || m.channel === channel)
      );

      if (match) {
        matchedActionName = match.actionName;
        if (this.actionHandler) {
          this.actionHandler(match, rawVal, normalized);
        }
      }
    }

    // 3. Record raw event
    const eventRecord: MidiRawEvent = {
      id: `midi-evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      deviceName,
      channel,
      isCc,
      noteOrCc,
      value: rawVal,
      normalized,
      type: typeStr,
      matchedAction: matchedActionName,
    };

    this.eventHistory.unshift(eventRecord);
    if (this.eventHistory.length > 60) {
      this.eventHistory.pop();
    }

    // Notify UI event stream subscribers
    this.rawEventSubscribers.forEach((cb) => cb(eventRecord));
  }
}

// Global Singletons
export const liveAudioAnalyzer = new LiveAudioAnalyzer();
export const webMidiManager = new WebMidiManager();
