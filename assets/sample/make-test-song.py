"""
Generate the known-BPM test song for the sample asset pack (blueprint feature 173) and
for the TestAI plan (docs/TestAI-Plan.md).

Deterministic: same bytes every run, no clock, no unseeded randomness. Pure numpy for the
synthesis; lameenc (a pip wheel that bundles LAME) for the MP3. Writes, next to itself:

    test-song-60s.mp3         60.000 s, 44.1 kHz stereo, 128 kbps CBR, 120 BPM
    test-song-60s.truth.json  every beat time, the downbeats, the section boundaries
    test-song-60s.srt         eight timed lyric lines for the Load Lyrics... path

Structure (bars of 4/4 at 120 BPM, one bar = 2.000 s):

    bars  0- 3   0- 8 s  intro      hats + pad only, no kick (quiet start)
    bars  4-11   8-24 s  verse      kick every beat, snare 2 & 4, bass, pad
    bars 12-19  24-40 s  chorus     + clap, open hat, lead melody   <- energy jump ("drop")
    bars 20-23  40-48 s  breakdown  pad + lead only, no drums       <- energy dip
    bars 24-29  48-60 s  chorus 2   full, fading out over the last two bars

Usage:  python make-test-song.py [--out-dir DIR]
Needs:  pip install numpy lameenc
"""
import argparse
import json
import math
import os
import sys

import numpy as np

SR = 44100
BPM = 120.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
DURATION = 60.0
N = int(SR * DURATION)
SEED = 20260912

SECTIONS = [
    ("intro", 0, 4),
    ("verse", 4, 12),
    ("chorus", 12, 20),
    ("breakdown", 20, 24),
    ("chorus2", 24, 30),
]

# I - vi - IV - V in C, one chord per bar, cycling.
BASS_ROOTS = [36, 33, 29, 31]                       # C2 A1 F1 G1
PAD_CHORDS = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]]
# Eighth notes, one bar of lead in C pentatonic; 0 = rest. Two bar variants alternate.
LEAD_BARS = [[76, 79, 81, 79, 76, 74, 72, 74], [72, 74, 76, 0, 79, 76, 74, 0]]


def midi(m):
    return 440.0 * 2.0 ** ((m - 69) / 12.0)


def section_of(bar):
    for name, a, b in SECTIONS:
        if a <= bar < b:
            return name
    return None


class Mix:
    def __init__(self):
        self.left = np.zeros(N, dtype=np.float64)
        self.right = np.zeros(N, dtype=np.float64)

    def add(self, t0, mono, pan=0.0, gain=1.0):
        """pan: -1 full left, +1 full right (constant power)."""
        start = int(round(t0 * SR))
        if start >= N:
            return
        seg = mono[: N - start]
        angle = (pan + 1.0) * math.pi / 4.0
        self.left[start:start + len(seg)] += seg * gain * math.cos(angle)
        self.right[start:start + len(seg)] += seg * gain * math.sin(angle)


def kick():
    t = np.arange(int(0.28 * SR)) / SR
    freq = 45.0 + (170.0 - 45.0) * np.exp(-t * 28.0)
    phase = 2 * math.pi * np.cumsum(freq) / SR
    return np.sin(phase) * np.exp(-t * 14.0) * 0.95


def snare(rng):
    t = np.arange(int(0.22 * SR)) / SR
    noise = rng.standard_normal(len(t))
    noise = np.diff(noise, prepend=0.0)              # crude high-pass
    body = np.sin(2 * math.pi * 190.0 * t) * np.exp(-t * 32.0)
    return noise * np.exp(-t * 20.0) * 0.30 + body * 0.45


def hat(rng, open_):
    length = 0.30 if open_ else 0.06
    t = np.arange(int(length * SR)) / SR
    noise = rng.standard_normal(len(t))
    noise = np.diff(noise, prepend=0.0)
    return noise * np.exp(-t * (14.0 if open_ else 70.0)) * 0.22


def clap(rng):
    t = np.arange(int(0.25 * SR)) / SR
    out = np.zeros(len(t))
    for k in range(3):
        d = int(0.011 * k * SR)
        burst = rng.standard_normal(len(t) - d)
        burst = np.diff(burst, prepend=0.0)
        out[d:] += burst * np.exp(-np.arange(len(burst)) / SR * 38.0)
    return out * 0.24


def bass_note(m, length):
    t = np.arange(int(length * SR)) / SR
    f = midi(m)
    saw = 2.0 * ((t * f) % 1.0) - 1.0
    # one-pole low-pass to take the edge off
    y = np.empty_like(saw)
    acc = 0.0
    a = 0.12
    for i in range(len(saw)):
        acc += a * (saw[i] - acc)
        y[i] = acc
    attack = np.minimum(t / 0.006, 1.0)
    decay = 0.55 + 0.45 * np.exp(-t * 9.0)
    release = np.clip((length - t) / 0.05, 0.0, 1.0)
    return y * attack * decay * release * 0.42


def pad_chord(notes, length, gain):
    t = np.arange(int(length * SR)) / SR
    out = np.zeros(len(t))
    for m in notes:
        f = midi(m)
        for detune in (-0.0035, 0.0035):
            out += np.sin(2 * math.pi * f * (1 + detune) * t)
        out += 0.25 * np.sin(2 * math.pi * 2 * f * t)
    attack = np.minimum(t / 0.35, 1.0)
    release = np.clip((length - t) / 0.35, 0.0, 1.0)
    return out * attack * release * gain / len(notes)


def lead_note(m, length):
    t = np.arange(int(length * SR)) / SR
    f = midi(m) * (1 + 0.004 * np.sin(2 * math.pi * 5.5 * t))
    phase = 2 * math.pi * np.cumsum(f) / SR
    tri = (2.0 / math.pi) * np.arcsin(np.sin(phase))
    attack = np.minimum(t / 0.012, 1.0)
    decay = 0.35 + 0.65 * np.exp(-t * 6.0)
    release = np.clip((length - t) / 0.03, 0.0, 1.0)
    return tri * attack * decay * release * 0.30


def build(out_dir):
    rng = np.random.default_rng(SEED)
    mix = Mix()
    kick_s = kick()
    snare_s = snare(rng)
    hat_c = hat(rng, False)
    hat_o = hat(rng, True)
    clap_s = clap(rng)

    for bar in range(30):
        sec = section_of(bar)
        bar_t = bar * BAR
        chord_i = bar % 4
        drums = sec in ("verse", "chorus", "chorus2")
        full = sec in ("chorus", "chorus2")

        # pad on every bar; louder when it carries the section
        pad_gain = 0.20 if sec in ("intro", "breakdown") else 0.13
        mix.add(bar_t, pad_chord(PAD_CHORDS[chord_i], BAR, pad_gain), pan=-0.35)
        mix.add(bar_t, pad_chord([n + 12 for n in PAD_CHORDS[chord_i]], BAR, pad_gain * 0.35), pan=0.35)

        for beat in range(4):
            t0 = bar_t + beat * BEAT
            # hats: closed on every beat except in the breakdown, open on the off-beats in a chorus
            if sec != "breakdown":
                mix.add(t0, hat_c, pan=0.5, gain=0.9)
                if full:
                    mix.add(t0 + BEAT / 2, hat_o, pan=0.5, gain=0.6)
                else:
                    mix.add(t0 + BEAT / 2, hat_c, pan=0.5, gain=0.5)
            if drums:
                mix.add(t0, kick_s, gain=1.0)
                if beat in (1, 3):
                    mix.add(t0, snare_s, gain=0.9)
                    if full:
                        mix.add(t0, clap_s, pan=-0.2, gain=1.0)
                mix.add(t0, bass_note(BASS_ROOTS[chord_i], BEAT * 0.95), gain=1.0)
        if sec in ("chorus", "chorus2", "breakdown"):
            pattern = LEAD_BARS[bar % 2]
            for i, m in enumerate(pattern):
                if m:
                    mix.add(bar_t + i * BEAT / 2, lead_note(m, BEAT / 2 * 0.9), pan=-0.15,
                            gain=1.0 if sec != "breakdown" else 0.7)

    left, right = mix.left, mix.right
    # fade the last two bars (56-60 s) to silence
    fade_start = int(56.0 * SR)
    ramp = np.linspace(1.0, 0.0, N - fade_start)
    left[fade_start:] *= ramp
    right[fade_start:] *= ramp
    # soft clip, then peak-normalise to -1 dBFS
    k = 1.15
    left = np.tanh(left * k) / math.tanh(k)
    right = np.tanh(right * k) / math.tanh(k)
    peak = max(np.abs(left).max(), np.abs(right).max())
    target = 10 ** (-1.0 / 20.0)
    left *= target / peak
    right *= target / peak

    pcm = np.empty(2 * N, dtype=np.int16)
    pcm[0::2] = np.clip(left * 32767.0, -32768, 32767).astype(np.int16)
    pcm[1::2] = np.clip(right * 32767.0, -32768, 32767).astype(np.int16)

    import lameenc  # imported late so --help works without it
    enc = lameenc.Encoder()
    enc.set_bit_rate(128)
    enc.set_in_sample_rate(SR)
    enc.set_channels(2)
    enc.set_quality(2)
    mp3 = enc.encode(pcm.tobytes()) + enc.flush()
    mp3_path = os.path.join(out_dir, "test-song-60s.mp3")
    with open(mp3_path, "wb") as f:
        f.write(mp3)

    beats = [round(k * BEAT, 3) for k in range(int(DURATION / BEAT))]
    truth = {
        "file": "test-song-60s.mp3",
        "durationSeconds": DURATION,
        "sampleRate": SR,
        "bpm": BPM,
        "beatSeconds": beats,
        "downbeatSeconds": [b for i, b in enumerate(beats) if i % 4 == 0],
        "firstKickSeconds": 8.0,
        "dropSeconds": 24.0,
        "breakdownSeconds": [40.0, 48.0],
        "fadeOutSeconds": [56.0, 60.0],
        "sections": [
            {"name": n, "startSeconds": a * BAR, "endSeconds": b * BAR} for n, a, b in SECTIONS
        ],
        "chordsPerBar": ["C", "Am", "F", "G"],
        "generator": "make-test-song.py",
        "seed": SEED,
    }
    with open(os.path.join(out_dir, "test-song-60s.truth.json"), "w", encoding="utf-8") as f:
        json.dump(truth, f, indent=2)
        f.write("\n")

    cues = [
        (8.0, 11.5, "Marshall Projection Studio test song"),
        (12.0, 15.5, "Verse one, the lights come on"),
        (16.0, 19.5, "Garage door, windows, front door glow"),
        (24.0, 27.5, "Chorus, every shape lights up"),
        (32.0, 35.5, "Chorus, this is the drop"),
        (40.0, 43.5, "Breakdown, soft and slow"),
        (48.0, 51.5, "Final chorus, all together"),
        (56.0, 59.0, "Fade out, the show is done"),
    ]

    def stamp(s):
        ms = int(round(s * 1000))
        return "%02d:%02d:%02d,%03d" % (ms // 3600000, ms // 60000 % 60, ms // 1000 % 60, ms % 1000)

    with open(os.path.join(out_dir, "test-song-60s.srt"), "w", encoding="utf-8", newline="\n") as f:
        for i, (a, b, text) in enumerate(cues, 1):
            f.write("%d\n%s --> %s\n%s\n\n" % (i, stamp(a), stamp(b), text))

    return mp3_path


def mp3_duration_seconds(path):
    """Walk the MPEG-1 Layer III frames (CBR) and add up their samples - a decoder-free check."""
    data = open(path, "rb").read()
    i = 0
    if data[:3] == b"ID3":
        size = ((data[6] & 0x7F) << 21) | ((data[7] & 0x7F) << 14) | ((data[8] & 0x7F) << 7) | (data[9] & 0x7F)
        i = 10 + size
    bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
    rates = [44100, 48000, 32000]
    frames = 0
    while i + 4 <= len(data):
        b0, b1, b2 = data[i], data[i + 1], data[i + 2]
        if b0 == 0xFF and (b1 & 0xE0) == 0xE0 and (b1 & 0x18) == 0x18 and (b1 & 0x06) == 0x02:
            br = bitrates[b2 >> 4]
            sr = rates[(b2 >> 2) & 3]
            pad = (b2 >> 1) & 1
            if br == 0 or sr == 0:
                break
            i += 144 * br * 1000 // sr + pad
            frames += 1
        else:
            i += 1
    return frames * 1152 / 44100.0, frames


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out-dir", default=os.path.dirname(os.path.abspath(__file__)))
    args = ap.parse_args()
    path = build(args.out_dir)
    secs, frames = mp3_duration_seconds(path)
    print("wrote %s: %d bytes, %d frames, %.3f s" % (path, os.path.getsize(path), frames, secs))
    if abs(secs - DURATION) > 0.1:
        print("DURATION CHECK FAILED", file=sys.stderr)
        sys.exit(1)
