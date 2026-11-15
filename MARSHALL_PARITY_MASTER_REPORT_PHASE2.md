# Marshall Projection Studio Parity Blueprint — Phase 2 Advanced Systems

> **Source Reference (Strictly Read-Only)**: `e:\Documents\AiPrograms\MarshallProjectionStudio` (C# / .NET 8 / WPF / D3D11)
> **Target Codebase (Write Target)**: `e:\Documents\AiPrograms\GemniProjection Studio` (React 19 / TypeScript / Vite / Zustand / Canvas2D & Web Audio API)

---

## 1. Executive Summary: Phase 2 Parity Scope

Following the successful implementation of Blueprint §22 (Fit Video to House, House Stencils, Two-Tier Recalibration, Auto-Decorate, One-Button Auto-Show, Astronomical Dusk, and Evening Rehearsal), deep audit of `MarshallProjectionStudio` uncovered four additional major professional projection mapping systems:

1. **Multi-Projector Rig & Edge Blending Studio (`.mpsrig`)**
   - Multi-projector canvas bounds, side-by-side / stacked projector geometry, overlap zones ($5\%$ to $40\%$, default $15\%$).
   - Mathematical edge-blend falloff curves: Linear, Cosine, Smoothstep, and Gamma-corrected Power curves ($1.0$ to $3.5$) with black-level lift compensation.
   - Per-projector keystone / 3x3 warp mesh and lamp hour ledger with maintenance alerts.

2. **DMX Art-Net & WLED Pixel Light Synchronization Studio**
   - Broadcast & Unicast Art-Net DMX universe streaming for physical stage fixtures, moving heads, and wash floods mapped to projection shape tags.
   - WLED network controller discovery and live pixel streaming (DDP / E1.31) with real-time color sampling from house projection zones.
   - Live universe channel meters and patch sheet validation.

3. **Live Audio-Reactive Spectrum Analyzer & Web MIDI Controller Mapping**
   - Real-time microphone / loopback audio engine with 2048-point FFT, sub-bass/bass/mid/treble band isolation, and spectral flux onsets.
   - Audio-reactive parameter modulation for canvas shaders and procedural holiday effects.
   - Web MIDI API integration mapping hardware launchpads and DJ controllers to Scene Launch Pad (0–9), Master Dimmer, Audio Volume, and Strobe triggers.

4. **Projector Calibration Test Patterns, Douglas-Peucker Simplifier & Deep Undo Stack**
   - 10 professional bit-accurate projector alignment patterns: Grid, Crosshairs, SMPTE Color Bars, Checkerboard, Focus Star / Moire, Aspect Test, ANSI Contrast, Grayscale 16-Step, Uniform Color Wash, and UV Coordinate Gradient.
   - Ramer-Douglas-Peucker polygon decimation algorithm with tolerance slider to simplify dense photo-segmented contours into clean architectural corners.
   - Unified multi-level Undo/Redo stack.

---

## 2. Work Package Architecture & File Allocations

```
src/
├── utils/
│   ├── projectorRigEngine.ts           # Work Package 1 (Rig math, edge blends, lamp hours)
│   ├── dmxWledEngine.ts                # Work Package 2 (Art-Net, WLED, DDP, patch sheet)
│   ├── liveAudioMidiEngine.ts          # Work Package 3 (Web Audio FFT, reactive modulation, Web MIDI)
│   └── testPatternsAndGeometryEngine.ts # Work Package 4 (10 test patterns, Douglas-Peucker, undo)
└── components/modals/
    ├── ProjectorRigAndEdgeBlendModal.tsx
    ├── DmxAndWledPatchModal.tsx
    ├── LiveAudioAndMidiModal.tsx
    └── TestPatternsAndGeometryToolsModal.tsx
```

---

## 3. Work Package Breakdown & Mathematical Specifications

### Work Package 1: Multi-Projector Rig & Edge Blending Studio
- **File 1**: `src/utils/projectorRigEngine.ts`
  - Data models: `ProjectorRigDocument`, `ProjectorOutputConfig`, `EdgeBlendZone`, `LampHourRecord`.
  - Math: Multi-projector canvas bounds computation, side-by-side arrangement with overlap fraction $f \in [0.05, 0.40]$.
  - Blend ramp curves:
    - Linear: $w(x) = x$
    - Cosine: $w(x) = \frac{1 - \cos(\pi x)}{2}$
    - Smoothstep: $w(x) = 3x^2 - 2x^3$
    - Power Gamma: $w(x) = x^\gamma$
  - Black level compensation: $L(x) = L_{black} \cdot (1 - w(x))$.
  - Per-projector keystone & 3x3 bezier warp mesh.
  - Lamp hour tracking with warning thresholds (e.g. 2,000 / 3,000 hrs) and log ledger.
- **File 2**: `src/components/modals/ProjectorRigAndEdgeBlendModal.tsx`
  - Interactive multi-projector canvas preview showing overlapping blend bands.
  - Tab 1: Projector arrangement & overlap sliders.
  - Tab 2: Blend curve tuning with real-time luminance curve graph.
  - Tab 3: Per-projector keystone & 3x3 warp grid.
  - Tab 4: Lamp hour ledger & multi-display output launcher.

### Work Package 2: DMX Art-Net & WLED Pixel Light Synchronization
- **File 1**: `src/utils/dmxWledEngine.ts`
  - Data models: `DmxUniverseConfig`, `DmxFixturePatch`, `WledDeviceConfig`, `WledSegmentPatch`.
  - Protocol encoding:
    - Art-Net ArtDmx UDP packet structure (OpCode `0x5000`, sequence, physical, sub-net, universe, length, 512 channel bytes).
    - WLED DDP (Distributed Display Protocol) header and RGB payload generation.
  - Patch validator: checks universe bounds (0–32767), channel ranges (1–512), device availability, and target shape bindings.
  - Real-time shape color sampler: computes average or peak RGB for mapped house shapes and assigns to DMX/WLED channels.
- **File 2**: `src/components/modals/DmxAndWledPatchModal.tsx`
  - Tab 1: DMX Fixture Patch Sheet with universe channel grid (512 channels) & live level meters.
  - Tab 2: WLED Controller Manager & auto-discovery simulator with IP, segment length, and live color sync test.
  - Tab 3: Live Output Monitor showing real-time packets/sec, latency, and fixture preview dots.

### Work Package 3: Live Audio-Reactive Spectrum Analyzer & Web MIDI Mapping
- **File 1**: `src/utils/liveAudioMidiEngine.ts`
  - Web Audio API Analyzer: 2048-point FFT, logarithmic frequency binning into 5 bands: Sub-Bass (20–60Hz), Bass (60–250Hz), Low-Mid (250–500Hz), Mid (500–2kHz), High/Treble (2k–16kHz).
  - Dynamic gain, attack/release smoothing filter (Attack 10ms, Release 120ms), and spectral flux onset detector.
  - Modulation routing matrix: maps audio bands to scene parameters (e.g. Bass $\to$ C9 bulb chase speed, Treble $\to$ icicle sparkle, Energy $\to$ Master Dimmer pulse).
  - Web MIDI API (`navigator.requestMIDIAccess`): Input listener, Note-On / Note-Off decoding, Control Change (CC) normalization $[0, 127] \to [0.0, 1.0]$, and customizable MIDI learning table.
- **File 2**: `src/components/modals/LiveAudioAndMidiModal.tsx`
  - Live 60fps audio visualizer (oscilloscope waveform, frequency spectrum bars, 5-band energy dials).
  - Audio source selector (Microphone, Stereo Mix, or Simulated Test Tone / Beat Loop).
  - Modulation matrix assignment table.
  - MIDI controller status, live MIDI event log, and "Learn MIDI" wizard for buttons and knobs.

### Work Package 4: Projector Calibration Test Patterns & Douglas-Peucker Simplifier
- **File 1**: `src/utils/testPatternsAndGeometryEngine.ts`
  - 10 Canvas2D Test Pattern Generators:
    1. Grid (customizable cell size, millimeter axes)
    2. Crosshairs & concentric target circles
    3. SMPTE Color Bars + 11-step grayscale ramp
    4. Checkerboard (16px, 32px, 64px)
    5. Focus Star (Siemens star) & 1px alternating line pairs
    6. Aspect Ratio circles & active $\{W\}\times\{H\}$ resolution badge
    7. ANSI Contrast 4x4 checkerboard
    8. Grayscale 16-step calibration stairs
    9. Uniform Color Wash (Pure Red, Green, Blue, White, Black)
    10. UV Coordinate Gradient $(u, v) \in [0, 1]^2$
  - Ramer-Douglas-Peucker Polygon Decimator:
    - Perpendicular distance from point to segment formula:
      $$d = \frac{|(y_2 - y_1)x_0 - (x_2 - x_1)y_0 + x_2 y_1 - y_2 x_1|}{\sqrt{(y_2 - y_1)^2 + (x_2 - x_1)^2}}$$
    - Recursive simplification for open and closed polylines with collinear cleanup.
  - Deep Undo / Redo Transaction Manager: supports undo/redo with snapshot checkpoints and rollback.
- **File 2**: `src/components/modals/TestPatternsAndGeometryToolsModal.tsx`
  - Full-screen / canvas interactive test pattern viewer with pattern switcher, invert colors, and projection test toggle.
  - Interactive Douglas-Peucker Simplifier workbench: loads active traced shapes, shows original vs simplified polygon, displays vertex count reduction percentage, and applies in one click.

---

## 4. Integration & Coordination Protocol

1. Subagents work on strictly non-overlapping files.
2. Coordinator integrates modals into `useProjectionStore.ts`, `App.tsx`, and `SystemHeader.tsx`.
3. Verification: `tsc -b && vite build` must compile with 0 errors and production bundle generated.
