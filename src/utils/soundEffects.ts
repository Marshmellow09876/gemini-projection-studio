/**
 * LUMEN-MAP AI v3.5 — Live Showtime Web Audio Synthesizer
 * Zero-dependency procedural sound effects engine for Manual Cue Pads.
 * Synthesizes:
 * 1. 'THUNDER & FLASH': Low-pass filtered noise burst + sub-bass rumble thunderclap
 * 2. 'SNOW STORM': Band-pass modulated howling wind whoosh + cold sub-rumble
 * 3. 'GHOST SCREAM': Eerie frequency-modulated theremin/ghost wail with synthetic delay/reverb
 * 4. 'STRIKE LASER': Sci-fi proton-pack/laser pitch sweep (880Hz -> 110Hz sawtooth + resonance)
 * 5. 'FIREWORKS': Whistle launch sweep followed by aerial boom & crackle bursts
 * 6. 'MERRY CHRISTMAS': Bright sleigh-bell / chime arpeggio (C5-E5-G5-C6) + metallic jingles
 */

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioContext) {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (AudioCtxClass) {
      sharedAudioContext = new AudioCtxClass();
    }
  }
  if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

function createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const bufferSize = Math.max(256, Math.floor(sampleRate * durationSec));
  const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/**
 * Plays a synthesized live audio effect for the specified Manual Cue.
 * Master volume percentage (0 - 100) scales the overall amplitude.
 */
export function playManualCueSound(
  cueId: string,
  masterVolumePercent: number = 80
): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const clampedVol = Math.max(0, Math.min(100, masterVolumePercent)) / 100;
    if (clampedVol <= 0.001) return;

    // Master bus for this cue
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(clampedVol * 0.42, ctx.currentTime);
    masterGain.connect(ctx.destination);

    const t0 = ctx.currentTime;
    const normalizedCue = cueId.trim().toUpperCase();

    switch (normalizedCue) {
      case 'THUNDER & FLASH':
        synthesizeThunderClap(ctx, masterGain, t0);
        break;

      case 'SNOW STORM':
        synthesizeSnowStorm(ctx, masterGain, t0);
        break;

      case 'GHOST SCREAM':
        synthesizeGhostScream(ctx, masterGain, t0);
        break;

      case 'STRIKE LASER':
        synthesizeStrikeLaser(ctx, masterGain, t0);
        break;

      case 'FIREWORKS':
        synthesizeFireworks(ctx, masterGain, t0);
        break;

      case 'MERRY CHRISTMAS':
        synthesizeMerryChristmas(ctx, masterGain, t0);
        break;

      default:
        // Generic tactile trigger click
        synthesizeGenericCueBeep(ctx, masterGain, t0);
        break;
    }
  } catch (err) {
    console.warn('[soundEffects] WebAudio synthesis error:', err);
  }
}

/**
 * 1. THUNDER & FLASH
 * Low-pass filtered noise burst + sub-bass rumble thunderclap
 */
function synthesizeThunderClap(
  ctx: AudioContext,
  outNode: AudioNode,
  t0: number
): void {
  // --- Noise Burst & Crack ---
  const noiseDur = 2.4;
  const noiseBuf = createNoiseBuffer(ctx, noiseDur);
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noiseBuf;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.Q.setValueAtTime(4.2, t0);
  // Starts high for the sharp crack, quickly plunges into low rumbling frequencies
  lowpass.frequency.setValueAtTime(1450, t0);
  lowpass.frequency.exponentialRampToValueAtTime(260, t0 + 0.12);
  lowpass.frequency.exponentialRampToValueAtTime(65, t0 + 1.8);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.001, t0);
  noiseGain.gain.linearRampToValueAtTime(0.95, t0 + 0.015); // sharp attack
  noiseGain.gain.exponentialRampToValueAtTime(0.42, t0 + 0.15); // crack decay
  noiseGain.gain.linearRampToValueAtTime(0.58, t0 + 0.55); // rolling rumble swell
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t0 + noiseDur);

  noiseSrc.connect(lowpass);
  lowpass.connect(noiseGain);
  noiseGain.connect(outNode);
  noiseSrc.start(t0);
  noiseSrc.stop(t0 + noiseDur);

  // --- Sub-Bass Rumble Oscillator ---
  const subOsc = ctx.createOscillator();
  subOsc.type = 'sine';
  subOsc.frequency.setValueAtTime(90, t0);
  subOsc.frequency.exponentialRampToValueAtTime(32, t0 + 1.9);

  const subGain = ctx.createGain();
  subGain.gain.setValueAtTime(0.001, t0);
  subGain.gain.linearRampToValueAtTime(0.85, t0 + 0.05);
  subGain.gain.exponentialRampToValueAtTime(0.001, t0 + 2.0);

  subOsc.connect(subGain);
  subGain.connect(outNode);
  subOsc.start(t0);
  subOsc.stop(t0 + 2.1);
}

/**
 * 2. SNOW STORM
 * Band-pass modulated howling wind whoosh + freezing sub-rumble
 */
function synthesizeSnowStorm(
  ctx: AudioContext,
  outNode: AudioNode,
  t0: number
): void {
  const dur = 2.8;
  const noiseBuf = createNoiseBuffer(ctx, dur);
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noiseBuf;

  // Resonant bandpass filter sweeps through whistling frequencies
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.Q.setValueAtTime(8.5, t0);
  bandpass.frequency.setValueAtTime(380, t0);
  bandpass.frequency.exponentialRampToValueAtTime(860, t0 + 0.45); // wind surge
  bandpass.frequency.exponentialRampToValueAtTime(410, t0 + 1.1); // dip
  bandpass.frequency.exponentialRampToValueAtTime(740, t0 + 1.8); // second gust
  bandpass.frequency.exponentialRampToValueAtTime(290, t0 + dur);

  const windGain = ctx.createGain();
  windGain.gain.setValueAtTime(0.001, t0);
  windGain.gain.linearRampToValueAtTime(0.75, t0 + 0.35);
  windGain.gain.linearRampToValueAtTime(0.6, t0 + 1.2);
  windGain.gain.linearRampToValueAtTime(0.7, t0 + 1.7);
  windGain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

  noiseSrc.connect(bandpass);
  bandpass.connect(windGain);
  windGain.connect(outNode);
  noiseSrc.start(t0);
  noiseSrc.stop(t0 + dur);

  // Sub-rumble cold bed
  const coldOsc = ctx.createOscillator();
  coldOsc.type = 'triangle';
  coldOsc.frequency.setValueAtTime(48, t0);
  coldOsc.frequency.linearRampToValueAtTime(56, t0 + 1.4);
  coldOsc.frequency.linearRampToValueAtTime(44, t0 + dur);

  const coldGain = ctx.createGain();
  coldGain.gain.setValueAtTime(0.001, t0);
  coldGain.gain.linearRampToValueAtTime(0.35, t0 + 0.4);
  coldGain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

  coldOsc.connect(coldGain);
  coldGain.connect(outNode);
  coldOsc.start(t0);
  coldOsc.stop(t0 + dur);
}

/**
 * 3. GHOST SCREAM
 * Eerie frequency-modulated theremin/ghost wail with reverb/delay
 */
function synthesizeGhostScream(
  ctx: AudioContext,
  outNode: AudioNode,
  t0: number
): void {
  const dur = 2.4;

  // Delay/reverb chamber
  const delay = ctx.createDelay(1.0);
  delay.delayTime.setValueAtTime(0.24, t0);
  const feedback = ctx.createGain();
  feedback.gain.setValueAtTime(0.48, t0);
  const delayFilter = ctx.createBiquadFilter();
  delayFilter.type = 'highpass';
  delayFilter.frequency.setValueAtTime(280, t0);

  delay.connect(feedback);
  feedback.connect(delayFilter);
  delayFilter.connect(delay);
  delay.connect(outNode);

  // Ghost primary theremin oscillator
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(390, t0);
  osc.frequency.exponentialRampToValueAtTime(840, t0 + 0.35); // ascending wail
  osc.frequency.linearRampToValueAtTime(910, t0 + 0.9); // warble apex
  osc.frequency.exponentialRampToValueAtTime(260, t0 + 1.8); // descending sigh

  // Eerie vibrato LFO
  const vibrato = ctx.createOscillator();
  vibrato.frequency.setValueAtTime(6.5, t0); // 6.5 Hz vibrato rate
  const vibratoGain = ctx.createGain();
  vibratoGain.gain.setValueAtTime(38, t0); // +/- 38 Hz depth
  vibrato.connect(osc.frequency);
  vibrato.start(t0);
  vibrato.stop(t0 + dur);

  // Harmonic whisper
  const whisperOsc = ctx.createOscillator();
  whisperOsc.type = 'triangle';
  whisperOsc.frequency.setValueAtTime(585, t0);
  whisperOsc.frequency.exponentialRampToValueAtTime(1260, t0 + 0.35);
  whisperOsc.frequency.exponentialRampToValueAtTime(390, t0 + 1.8);

  const mainGain = ctx.createGain();
  mainGain.gain.setValueAtTime(0.001, t0);
  mainGain.gain.linearRampToValueAtTime(0.68, t0 + 0.2);
  mainGain.gain.linearRampToValueAtTime(0.55, t0 + 1.1);
  mainGain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

  const whisperGain = ctx.createGain();
  whisperGain.gain.setValueAtTime(0.001, t0);
  whisperGain.gain.linearRampToValueAtTime(0.25, t0 + 0.2);
  whisperGain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

  osc.connect(mainGain);
  whisperOsc.connect(whisperGain);

  mainGain.connect(outNode);
  mainGain.connect(delay);
  whisperGain.connect(outNode);

  osc.start(t0);
  whisperOsc.start(t0);
  osc.stop(t0 + dur);
  whisperOsc.stop(t0 + dur);
}

/**
 * 4. STRIKE LASER
 * Sci-fi proton-pack/laser pitch sweep (880Hz -> 110Hz sawtooth + resonance)
 */
function synthesizeStrikeLaser(
  ctx: AudioContext,
  outNode: AudioNode,
  t0: number
): void {
  const dur = 0.48;

  // Main Sawtooth Oscillator
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(880, t0);
  osc.frequency.exponentialRampToValueAtTime(110, t0 + 0.38);

  // Resonant lowpass filter
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.setValueAtTime(9.0, t0);
  filter.frequency.setValueAtTime(3400, t0);
  filter.frequency.exponentialRampToValueAtTime(240, t0 + 0.38);

  // Laser envelope
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, t0);
  gain.gain.linearRampToValueAtTime(0.9, t0 + 0.006); // instant attack
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

  // Secondary sub-square wave for raw proton-pack buzz
  const subBuzz = ctx.createOscillator();
  subBuzz.type = 'square';
  subBuzz.frequency.setValueAtTime(440, t0);
  subBuzz.frequency.exponentialRampToValueAtTime(55, t0 + 0.32);

  const subGain = ctx.createGain();
  subGain.gain.setValueAtTime(0.35, t0);
  subGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.22);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(outNode);

  subBuzz.connect(filter);
  subBuzz.connect(subGain);
  subGain.connect(outNode);

  osc.start(t0);
  subBuzz.start(t0);
  osc.stop(t0 + dur);
  subBuzz.stop(t0 + dur);
}

/**
 * 5. FIREWORKS
 * Whistle launch sweep followed by aerial boom & crackle bursts
 */
function synthesizeFireworks(
  ctx: AudioContext,
  outNode: AudioNode,
  t0: number
): void {
  // Part A: Rocket Whistle Launch (0.0s -> 0.42s)
  const launchDur = 0.42;
  const launchOsc = ctx.createOscillator();
  launchOsc.type = 'sine';
  launchOsc.frequency.setValueAtTime(360, t0);
  launchOsc.frequency.exponentialRampToValueAtTime(2350, t0 + launchDur);

  const launchGain = ctx.createGain();
  launchGain.gain.setValueAtTime(0.001, t0);
  launchGain.gain.linearRampToValueAtTime(0.48, t0 + 0.2);
  launchGain.gain.linearRampToValueAtTime(0.65, t0 + launchDur - 0.05);
  launchGain.gain.exponentialRampToValueAtTime(0.001, t0 + launchDur);

  launchOsc.connect(launchGain);
  launchGain.connect(outNode);
  launchOsc.start(t0);
  launchOsc.stop(t0 + launchDur);

  // Part B: Aerial Shell Burst Thud (t0 + 0.40s)
  const burstT = t0 + 0.4;
  const boomOsc = ctx.createOscillator();
  boomOsc.type = 'sine';
  boomOsc.frequency.setValueAtTime(140, burstT);
  boomOsc.frequency.exponentialRampToValueAtTime(38, burstT + 0.55);

  const boomGain = ctx.createGain();
  boomGain.gain.setValueAtTime(0.001, burstT);
  boomGain.gain.linearRampToValueAtTime(0.9, burstT + 0.02);
  boomGain.gain.exponentialRampToValueAtTime(0.001, burstT + 0.65);

  boomOsc.connect(boomGain);
  boomGain.connect(outNode);
  boomOsc.start(burstT);
  boomOsc.stop(burstT + 0.7);

  // Part C: Sparkle & Crackle Bursts (Multiple staggered pops)
  const crackleTimes = [0.46, 0.54, 0.62, 0.71, 0.82, 0.94];
  crackleTimes.forEach((dt, idx) => {
    const popT = t0 + dt;
    const popBuf = createNoiseBuffer(ctx, 0.08);
    const popSrc = ctx.createBufferSource();
    popSrc.buffer = popBuf;

    const popFilter = ctx.createBiquadFilter();
    popFilter.type = 'bandpass';
    popFilter.Q.setValueAtTime(6.0, popT);
    popFilter.frequency.setValueAtTime(1800 + idx * 220, popT);

    const popGain = ctx.createGain();
    popGain.gain.setValueAtTime(0.001, popT);
    popGain.gain.linearRampToValueAtTime(0.55 - idx * 0.06, popT + 0.004);
    popGain.gain.exponentialRampToValueAtTime(0.001, popT + 0.06);

    popSrc.connect(popFilter);
    popFilter.connect(popGain);
    popGain.connect(outNode);
    popSrc.start(popT);
    popSrc.stop(popT + 0.08);
  });
}

/**
 * 6. MERRY CHRISTMAS
 * Bright sleigh-bell / chime arpeggio (C5-E5-G5-C6) + metallic jingles
 */
function synthesizeMerryChristmas(
  ctx: AudioContext,
  outNode: AudioNode,
  t0: number
): void {
  // Arpeggio notes: C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50)
  const notes = [
    { freq: 523.25, time: 0.0 },
    { freq: 659.25, time: 0.11 },
    { freq: 783.99, time: 0.22 },
    { freq: 1046.5, time: 0.33 },
  ];

  notes.forEach((note) => {
    const noteT = t0 + note.time;

    // Fundamental Bell Chime
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(note.freq, noteT);

    // Overtone Bell Tine (approx 2.76x harmonic ratio)
    const overtone = ctx.createOscillator();
    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(note.freq * 2.76, noteT);

    const chimeGain = ctx.createGain();
    chimeGain.gain.setValueAtTime(0.001, noteT);
    chimeGain.gain.linearRampToValueAtTime(0.65, noteT + 0.005);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, noteT + 1.2);

    const overtoneGain = ctx.createGain();
    overtoneGain.gain.setValueAtTime(0.001, noteT);
    overtoneGain.gain.linearRampToValueAtTime(0.25, noteT + 0.003);
    overtoneGain.gain.exponentialRampToValueAtTime(0.001, noteT + 0.6);

    osc.connect(chimeGain);
    overtone.connect(overtoneGain);
    chimeGain.connect(outNode);
    overtoneGain.connect(outNode);

    osc.start(noteT);
    overtone.start(noteT);
    osc.stop(noteT + 1.25);
    overtone.stop(noteT + 0.65);
  });

  // Sleigh-bell jingling shakes (highpass white noise bursts)
  const shakeTimes = [0.0, 0.11, 0.22, 0.33, 0.46, 0.6];
  shakeTimes.forEach((st) => {
    const shakeT = t0 + st;
    const shakeBuf = createNoiseBuffer(ctx, 0.09);
    const shakeSrc = ctx.createBufferSource();
    shakeSrc.buffer = shakeBuf;

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(5600, shakeT);

    const shakeGain = ctx.createGain();
    shakeGain.gain.setValueAtTime(0.001, shakeT);
    shakeGain.gain.linearRampToValueAtTime(0.38, shakeT + 0.008);
    shakeGain.gain.exponentialRampToValueAtTime(0.001, shakeT + 0.08);

    shakeSrc.connect(highpass);
    highpass.connect(shakeGain);
    shakeGain.connect(outNode);
    shakeSrc.start(shakeT);
    shakeSrc.stop(shakeT + 0.09);
  });
}

/**
 * Generic tactile cue pad beep fallback
 */
function synthesizeGenericCueBeep(
  ctx: AudioContext,
  outNode: AudioNode,
  t0: number
): void {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(640, t0);
  osc.frequency.exponentialRampToValueAtTime(320, t0 + 0.12);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, t0);
  gain.gain.linearRampToValueAtTime(0.5, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.15);

  osc.connect(gain);
  gain.connect(outNode);
  osc.start(t0);
  osc.stop(t0 + 0.16);
}
