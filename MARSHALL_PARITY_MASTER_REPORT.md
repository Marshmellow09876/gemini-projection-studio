# Marshall Projection Studio vs. Gemini Projection Studio (Lumen-Map AI)
## Complete Feature Parity & Subagent Implementation Blueprint

> **Source Reference (Strictly Read-Only)**: `e:\Documents\AiPrograms\MarshallProjectionStudio` (C# / .NET 8 / WPF / D3D11 — 671 implemented features across Milestones M0–M6 + Blueprint Section 22)
> **Target Codebase (Write Target)**: `e:\Documents\AiPrograms\GemniProjection Studio` (React 19 / TypeScript / Vite / Zustand / Canvas & WebGL + FastAPI Backend)

---

## 1. Executive Summary & Architectural Comparison

We inspected and executed `MarshallProjectionStudio.exe` (`src/Mps.App/bin/x64/Debug/net8.0-windows/MarshallProjectionStudio.exe`) in headless CLI (`--render-frame`, `--make-sample-pack`, `--check-map`, `--preflight`, `--rehearse-evening`, `--doctor`), GUI Editor (`--virtual`), and GUI Run Night (`--virtual --run SamplePlaylist.mpsplaylist`) modes, and audited all ~550 source files across `Mps.Core`, `Mps.Platform`, `Mps.Render`, and `Mps.App`.

While **Gemini Projection Studio (Lumen-Map AI)** has an impressive 18-screen AI-centric interface, **MarshallProjectionStudio** contains a deeply engineered outdoor architectural projection workflow with **671 completed capabilities** that solve real-world backyard/driveway projection problems.

### Core Architectural Paradigms in `MarshallProjectionStudio` Missing or Incomplete in `GemniProjection Studio`

1. **The 4-Tier Reusable Data Hierarchy (`Map → Scenes → Shows → Playlists`) & Native `.mps*` File Compatibility**
   - In `MarshallProjectionStudio`, a **Map (`.mpsmap`)** is traced once on the house and reused forever across all holidays and songs.
   - **Scenes (`.mpsscenes`)** and **Theme Palettes (`.mpspalettes`)** define reusable "looks" (e.g., *Warm Glow*, *Candy Cane Chase*, *Blizzard*, *Big Finale*) that assign clips, shaders, generators, and procedural holiday effects to map shapes.
   - **Shows (`.mpsshow`)** bind one audio track + beat/section flags + a **Scene Cue Track** + lyric cues + one-shot FX triggers against a Map and Scene Library.
   - **Playlists (`.mpsplaylist`)** schedule shows across an evening with deck-shuffle, entry weights, seam guarantees, auto-interstitials, quiet-hours schedules, and astronomical civil dusk start times.
   - Plus **`.mpsrig`** (Projector Rig), **`.mpscalib`** (Calibration Presets), **`.mpsshapes`** (Reusable Shape Templates), and **`.mpsbundle`** (Portable Zip Archive with Missing-Media Relinker & Document Doctor).

2. **Fit Video to House (`FitVideoToHouseWindow` — Blueprint §22-A..22-F) & Export House Stencil (`HouseStencilExportDialog`)**
   - **Fit Video to House**: Load one full-house AI video clip (or still image), see the traced house's shapes drawn right on top of the video in their real post-warp screen positions, drag/scale/4-corner-warp the video's placement rectangle (`ClipPlacement`: `Rect` or `CornerPin` mode) *underneath* the fixed house outlines, toggle between **Outlines** and **Live Preview Fill** (clipped to shapes with black everywhere else), configure playback speed (`0.25x–4.0x`) and loop mode (`Loop`, `PlayOnceHoldLastFrame`, `PlayOnceCutToBlack`), and click **Assign to Shapes** or **Save as Scene**. Every shape samples its exact UV slice from the single shared video decoder (`SharedClipPool`) with zero per-shape video slicing and zero overhang spill onto the lawn or sky.
   - **Export House Stencil**: Renders the traced house map as a **Filled Mask** (white inside shapes, black outside), **Stroked Outline** (1–8 px white outlines on black), or **Filled + Contrasting Outline** at preset resolutions (`1280×720`, `1920×1080`, `2750×1536`, or custom) to upload directly into AI video generators (Runway, Kling, Veo, Sora, ComfyUI ControlNet) so generated videos match the house's exact silhouette.

3. **Advanced Map Geometry: Parent/Child Hierarchy, Holes, Open Paths, Geometry Classifier & Two-Tier Recalibration**
   - **Parent Shapes & Child Shapes (`MapShape.ParentId`, `ClipChildrenToParent`)**: Window panes inside a window, panels inside a garage door, or bricks inside a wall. Moving, rotating, scaling, corner-pinning, or recalibrating the parent automatically carries all children (`TransformChain`: local → parent → corner-pin → recalibration offset → Global Map Warp → output pixels). Optional stencil clipping clips children strictly inside the parent polygon.
   - **Polygon Holes (`MapShape.Holes`) & Overlap Diagnostics**: Punch windows or doors out of a wall shape (`AddHole` / auto-detect enclosed shapes as holes) so wall fills never double-project over windows. Includes `FindMisplacedHoles` (hole outside outer ring) and `FindShapesOverHoles` (other shapes overlapping a cutout without mask ordering).
   - **Open Path / Roofline Polylines (`FinishOpenPath`)**: Unclosed polylines for eaves, gutters, ridges, and fascia where marquee bulb strings and icicle drips run along the path.
   - **6-Handle Parametric Ellipse, Quick Primitives (`R`, `T`, `E`), Quadratic/Cubic Curved Edges, Edge-Slide (`Shift+Drag`), Soft-Selection Falloff, Align & Distribute, Symmetry Axis + Mirror (`M`), and `.mpsshapes` Stamp Templates**.
   - **Geometry Auto-Classifier & Naming Preview (`ShapeClassifier`, `ShapeNamingPreviewWindow`)**: Evaluates spatial/aspect heuristics on unnamed polygons to suggest semantic roles (`Roof`, `Wall`, `Window`, `Door`, `Trim`, `Fascia`) with human-readable reasoning (*"Window 2 inside Wall 1"*) and commits them as semantic `ShapeTag`s in one click.
   - **Two-Tier Year-to-Year Recalibration**:
     - **Tier 1: Global Map Warp (`W`)**: Master 4-corner homography over the entire map. When the projector tripod is bumped or brought out next year, drag 4 master corners on the house and every shape snaps back into alignment in 30 seconds.
     - **Tier 2: Per-Shape Recalibration Offsets**: Non-destructive per-shape delta offsets layered over the original trace (`Reset to Original Trace`), **Ghost Saved Layout** diff overlay (dashed original vs current), **Named Calibration Presets (`.mpscalib`)**, and **New Season Wizard**.

4. **Scenes, Tag-Aware Auto-Decorate Engine, Holiday Procedural Effects & 11-Node Colour/FX Graph**
   - **Tag-Aware Auto-Decorate (`AutoDecorator`)**: Maps semantic shape tags (`Window`, `Door`, `Roofline`, `RoofPlane`, `Wall`, `Bush`, `Pillar`, `Fascia`, `Custom`) to holiday rules using **Theme Palettes** (*Classic Christmas*, *Candy Cane*, *Winter Wonderland*, *Elegant Gold*, *Spooky Halloween*, *Hanukkah*, *New Year's Eve*). Supports **Seeded Randomize (`Reroll`)**, **Per-Shape Lock (`LockedShapeIds`)**, and **Hue-Shift Scene Variants**.
   - **Signature Holiday Procedural Effects (`ShapeDecorEffect` & `ParticlePass`)**:
     - **Border Chase / Marquee "Bulb String"**: Animated C9/fairy light bulbs chasing along any shape outline or open roofline path (configurable bulb spacing, chase speed, direction, warm-white or multi-color pattern).
     - **Icicle Drip Effect**: Animated growing/dripping icicles hanging from downward-facing roofline edges.
     - **Window Silhouette Slots**: Pre-built silhouette animations (Santa walking past, elves workshop, spinning Christmas tree, glowing star, spooky cat, dancing skeletons) auto-fitted to any `Window`-tagged shape's bounding box.
     - **Santa Sleigh Flyover**: One-shot arc trajectory across the entire house canvas with trailing sparkles.
     - **Fireplace / Candle Flicker & Ornament Twinkle**: Organic warm simplex-noise flicker and random child-shape sparkle inside a parent shape.
   - **Built-In Procedural Generator Sources**: `Solid`, `Multi-Stop Linear/Radial Gradient`, `Simplex Noise`, `Plasma`, `Animated Barber/Candy Stripes`, and `Checkerboard`.
   - **11-Node Colour/FX Graph Editor (`FxGraphEditorWindow`)**: Directed acyclic node graph (`Source`, `BrightnessContrast`, `HueSaturation`, `Levels`, `Curves`, `Tint`, `Invert`, `Posterize`, `Mix`, `Mask`, `Output`) with topological sorting, cycle prevention, live preview, and JSON preset import/export.
   - **Seamless Loop Crossfade Editor (`LoopCrossfadeEditorWindow`)**: Visual timeline for `TrimIn`, `TrimOut`, playback speed/reverse, and tail-to-head seamless loop crossfade duration (`LoopCrossfadeSeconds`) with real-time blend weight preview.

5. **One-Button Auto-Show Generator, Punch-In Beat Overdub, Word-Level Karaoke & xLights `.xtiming` Bridge**
   - **One-Button Auto-Show Generator (`ShowGenerator`)**: Analyzes audio energy envelope, spectral flux onsets, structural sections (Intro, Verse, Chorus, Bridge, Drop, Outro), and silence gaps, then applies a style profile (`Classic`, `Gentle`, `Punchy`, `Chaotic`, `Surprise Me`) to automatically populate the timeline with beat flags, section markers, scene cues on downbeats, and one-shot FX bursts on drops. Includes **Seeded Reroll** and **Generate from Selection**.
   - **Punch-In Beat-Tap Overdub (`PunchOverdub`)**: Tap along live to music (`F` / `Space`) with a 1-bar pre-roll count-in, audible metronome click track, live tap-phase offset readout (`±ms` early/late), phase nudge, **Quantize Flags to Beat/Subdivision**, **Batch Shift Flags (`±ms`)**, **Ripple Delete/Insert**, and a **Flag Density-Heat Minimap**.
   - **Word-Level Karaoke Lyric Engine (`SubtitleParser.ParseKaraoke`)**: Imports `.srt` and `.vtt` subtitle files (including inline `<00:00:01.500>word` karaoke tags), supports 9-anchor screen positioning, `Fade` / `SlideUp` / `TypeOn` animations, auto-fit font sizing, drop shadow/outline, and a moving per-word karaoke highlight sweep.
   - **xLights `.xtiming` XML Import & Export (`XLightsTimingParser` / `XLightsTimingWriter`)**: Direct bidirectional conversion between xLights timing tracks and timeline beat/section flags so sequences from the Christmas lighting community drop right in.

6. **Run Night Kiosk Controller, Evening Rehearsal Simulator, Pre-Show Preflight, Document Doctor & Outdoor UX**
   - **Evening Rehearsal Simulator (`EveningRehearsal`)**: Fast-forwards through an entire evening's playlist schedule in milliseconds (evaluating deck-shuffle, crossfades, auto-interstitials, quiet-hours volume/brightness caps, astronomical dusk start times, and missing-media skips) and outputs a complete time-stamped run sheet and fault audit.
   - **Pre-Show Check & Document Doctor (`ShowPreflight`, `PreShowCheck`, `MediaRelinker`, `DocumentDoctor`)**: Checks map geometry errors (self-intersecting polygons, <3 vertices, zero-area, out-of-bounds, misplaced holes), missing/zero-byte media, orphaned scene cues, audio endpoints, and blackout/dimmer left engaged. Includes a **Missing-Media Relinker** (fuzzy filename search across folders) and **Support Bundle Exporter**.
   - **Run Night Resilience & Scheduling**:
     - **Scene Launch Pad (0–9)**: Big touch-friendly live override buttons for instant scene triggering during a show.
     - **Deck-Shuffle with Seam Guarantee & Entry Weights**: Shuffles shows like a deck of cards so every show plays before any repeats, prevents back-to-back seam repeats across deck boundaries, and supports weighted rotation (e.g., 2x weight for crowd favorites).
     - **Auto-Interstitial Ambient Scenes**: Automatically inserts a calm "Warm House Glow + Slow Snow" interstitial between songs.
     - **Season Planning Calendar & Astronomical Civil Dusk (`AstronomicalDusk`)**: Per-date calendar overrides (`Normal`, `Dark / Off Night`, `Custom Time Window`, `Custom Holiday Playlist`) plus offline Spencer (1971) solar declination calculation for exact local Sunset and Civil Dusk (`96°` zenith) without internet access.
     - **Bad-Media Quarantine & Watchdog Recovery**: Quarantines failing media files mid-show with automatic retry after N loops, skips smoothly to the next item, and logs frame-pacing histograms (`P50`, `P95`, `P99`, dropped frames) to the **Run History & Session Health Recorder**.
     - **Hardware Bridges**: **PJLink Class 1** projector power/shutter/lamp-hour ledger (with maintenance warning threshold), **Home Assistant MQTT State Publisher**, **USB Serial Big-Red-Button Trigger**, and **NDI / Spout Live Video Input & Output**.
   - **Outdoor Night-Time Ergonomics**:
     - **Red-Light Night-Vision Tracing Theme**: High-contrast deep crimson/amber monochrome UI mode so tracing a house in the dark driveway does not bleach the operator's night vision or cast white laptop glare onto the lawn.
     - **`Ctrl+K` Command Palette (`CommandPaletteWindow`)**: Fuzzy-searchable action launcher across every tool, screen, modal, test pattern, and diagnostic in the studio.

---

## 2. Exhaustive Categorized Feature List (671 Capabilities Mapped to 5 Work Packages)

To implement all of these capabilities cleanly and in parallel without file collisions, the work is partitioned into **5 specialized Subagent Work Packages**, followed by a final master wiring & build verification pass.

---

### Work Package 1: Fit Video to House (`§22-A..22-E`), Export House Stencil (`§22-F`) & Loop Crossfade Studio
**Target Files to Create**:
- `src/utils/fitVideoToHouseEngine.ts`
- `src/components/modals/FitVideoToHouseModal.tsx`
- `src/components/modals/ExportHouseStencilModal.tsx`
- `src/components/modals/LoopCrossfadeEditorModal.tsx`

**Detailed Capabilities to Implement**:
1. **`ClipPlacement` Math & Shared UV Mapping (`src/utils/fitVideoToHouseEngine.ts`)**:
   - Support both `Rect` mode (`NormX`, `NormY`, `NormW`, `NormH` in normalized map space, allowing negative coordinates and `>1` scale for overhang) and `CornerPin` mode (`TL`, `TR`, `BR`, `BL` homography solver).
   - Direct forward & inverse 3×3 perspective homography matrix solver (`solveHomography` / `invertHomography`) mapping screen-space post-warp polygon vertices `(x, y)` into clip-local UV `(u, v) ∈ [0, 1]²`.
   - Overhang rule: any pixel outside `[0, 1]²` in clip UV space or outside any assigned shape polygon renders strictly `#000000` (zero lawn/sky light spill).
   - Multi-video group support: assign Clip A to `Roof` shapes with Placement A, and Clip B to `Wall`/`Window` shapes with Placement B in the same scene.
2. **Fit Video to House Interactive Modal (`src/components/modals/FitVideoToHouseModal.tsx`)**:
   - **Step 1 — Media Loader**: Pick from existing project/AI clips, built-in procedural demo clips, or load a local `.mp4`/`.webm`/`.mov`/`.png`/`.jpg` file via file input / drag-and-drop.
   - **Step 2 — Interactive Placement Canvas**:
     - Renders the video/image inside its `ClipPlacement` rectangle/quad on the dark stage, with the traced house's shapes (`layers`) rendered **on top** in their real post-warp screen positions.
     - Interactive handles to drag to pan, corner-drag to scale (`Shift` for free aspect, default aspect-locked), edge-drag to stretch, and 4-corner perspective pin (`CornerPin` mode).
     - Quick-fit buttons: **Fit to All Selected Shapes Bounding Box**, **Fit to Full 16:9 Stage**, **Center on House**, **Reset Placement**.
   - **Step 3 — Target Shape Filter & Selection**:
     - Filter/toggle shapes by semantic tag (`All Shapes`, `Walls Only`, `Roofs Only`, `Windows Only`, `Doors & Trim`, or manual per-shape checkboxes).
   - **Step 4 — View Mode Toggle (`Outlines` vs. `Live Preview Fill`)**:
     - **Outlines Mode**: Full video visible at 85% opacity under bright cyan/amber house shape outlines so you can see overhang and align architectural features (rooflines, windows, doors) against the video.
     - **Preview Fill Mode**: Exact live projector preview — video is stencil-clipped strictly inside the selected house polygons (`ctx.clip()`), and everything outside the shapes is pure black.
   - **Step 5 — Playback Controls**:
     - Play/Pause, timeline scrub bar, **Playback Speed** (`0.25x` to `4.0x` slider + presets), and **End Behavior** (`Loop Seamlessly`, `Play Once & Hold Last Frame`, `Play Once & Cut to Black`).
   - **Step 6 — Commit Actions**:
     - **Assign to Selected Shapes** (updates active layout/playlist mapping immediately) and **Save as New Scene** (prompts for scene name and adds to the Scene Library).
3. **Export House Stencil Modal (`src/components/modals/ExportHouseStencilModal.tsx`)**:
   - Style selector: **Filled Mask** (pure white `#FFFFFF` inside shapes, `#000000` outside), **Stroked Outline** (pure white outlines on `#000000` with 1–8 px stroke width slider), **Filled + Contrasting Outline** (white fill with dark inner border so adjacent walls/windows remain distinct), or **Color-Coded Semantic Tag Map** (ControlNet segmentation palette: walls blue, roof red, windows cyan, doors yellow).
   - Resolution presets: `1280 × 720 (720p)`, `1920 × 1080 (1080p HD)`, `2750 × 1536 (High-Res AI Stencil)`, `3840 × 2160 (4K UHD)`, or Custom `W × H`.
   - Option to evaluate **Post-Warp** (including Global Map Warp and Per-Shape Recalibration) or **Raw Unwarped Trace**, plus shape tag filtering.
   - Live canvas preview + one-click **Download PNG Stencil** and **Send Stencil directly to AI Video Studio (Screen 4)**.
4. **Seamless Loop Crossfade Studio Modal (`src/components/modals/LoopCrossfadeEditorModal.tsx`)**:
   - Interactive dual-handle trim timeline (`TrimInSeconds`, `TrimOutSeconds`), playback rate (`0.25x–4.0x`), reverse playback toggle, and **Loop Crossfade Duration (`LoopCrossfadeSeconds`: `0.0s–5.0s`)**.
   - Real-time visual crossfade curve graph showing primary clip weight $w_1(t)$ vs. tail-to-head wrap-around weight $w_2(t)$ and live dual-frame blend preview.

---

### Work Package 2: Advanced Map Editor, Parent/Child Hierarchy, Holes, Auto-Classifier & Two-Tier Recalibration
**Target Files to Create**:
- `src/utils/marshallMapEngine.ts`
- `src/components/modals/MapRecalibrationWizardModal.tsx`

**Detailed Capabilities to Implement**:
1. **Marshall Map Geometry & Transform Chain Engine (`src/utils/marshallMapEngine.ts`)**:
   - **5-Stage Transform Chain (`TransformChain`)**:
     1. Shape local coordinates + `PivotOffset` rotation/scale/translation
     2. Parent shape inheritance (`ParentId` recursive transform composition + `ClipChildrenToParent` stencil flag)
     3. Per-shape 4-corner homography (`CornerPin` / subdivision mesh)
     4. Non-destructive Per-Shape Recalibration Offset (`RecalibrationOffset`: `dx`, `dy`, `dRot`, `dScaleX`, `dScaleY`, `cornerDeltas`)
     5. Master 4-Corner **Global Map Warp** homography (`GlobalMapWarp`: `enabled`, `corners: [TL, TR, BR, BL]`)
   - **Polygon Holes & Overlap Diagnostics**:
     - `Holes: VectorVertex[][]` per shape, `addHoleToShape`, `autoDetectHolesInWalls` (automatically punches any `Window`/`Door` polygon fully enclosed inside a `Wall` polygon out of that wall's fill), `findMisplacedHoles` (holes protruding outside outer ring), and `findShapesOverHoles` (overlap checklist with z-order/mask recommendations).
   - **Open Path / Roofline Polylines (`isOpenPath: boolean`, `strokeWidthPx: number`)**:
     - Unclosed polyline geometry for eaves, rooflines, and trim paths with arc-length parameterization for bulb-chase and icicle-drip effects.
   - **Parametric 6-Handle Ellipse, Triangle, Rectangle & Curved Edges**:
     - `createParametricEllipse(cx, cy, rx, ry, rotationDeg, segments)` with 6 interactive control handles (N, S, E, W cardinal radius handles + center move + rotation stalk).
     - Quadratic and cubic Bézier edge control points (`edgeCurves`) with `curveEdge` and `straightenEdge` helpers.
   - **Vertex Multi-Select, Edge-Slide (`slideVertexAlongEdge`), Soft-Selection Falloff (`applySoftSelectionDelta` with Gaussian/Cosine radius falloff), Align & Distribute (`Left`, `Right`, `Top`, `Bottom`, `CenterH`, `CenterV`, `DistributeCentresH`, `DistributeGapsH`), Symmetry Axis & Mirror (`mirrorShapeAcrossAxis`), and `.mpsshapes` Reusable Stamp Templates**.
   - **Geometry Auto-Classifier (`classifyMapShapes`)**:
     - Analyzes polygon aspect ratio, vertical Y position, enclosure inside larger polygons, vertex count, and apex slope to classify unnamed layers into `RoofPlane`, `Roofline`, `Wall`, `Window`, `Door`, `Garage`, `Pillar`, `Bush`, `Pathway`, `Trim` with confidence scores and human-readable reasoning (*"Window 2 enclosed inside Wall 1 (aspect 0.72)"*).
2. **Map Outliner, Classifier, Holes & Two-Tier Recalibration Modal (`src/components/modals/MapRecalibrationWizardModal.tsx`)**:
   - **Tab 1 — Tier 1 Global Map Warp (`W`) & Tier 2 Per-Shape Recalibration**:
     - Interactive 4-corner master homography cage over the full house map for 30-second tripod bump recovery.
     - Per-shape non-destructive recalibration offset nudger (`±0.1 px`, `±1 px`, `±5 px`), **Ghost Saved Layout** diff toggle (shows original baseline trace as dashed cyan vs. current recalibrated trace in solid amber), and **Reset Shape to Original Trace**.
   - **Tab 2 — Named Calibration Presets (`.mpscalib`) & New Season Wizard**:
     - Save/load/export/import named calibration snapshots (e.g., *"Halloween Tripod Spot A"*, *"Christmas Driveway Post — Dec 2026"*), plus the 4-step **New Season Wizard** (Archives last season's snapshot → Projects high-contrast alignment grid → Guides 4-corner Global Map Warp → Fine-tunes drifted shapes).
   - **Tab 3 — Parent/Child Outliner, Polygon Holes & Geometry Auto-Classifier**:
     - Tree-view outliner to assign `ParentId` (e.g., parent `Window panes` under `Window 1`, toggle `Clip Children to Parent`), punch/auto-detect `Holes` in walls, inspect the `FindMisplacedHoles` / `FindShapesOverHoles` diagnostics checklist, and run the **Geometry Auto-Classifier & Naming Preview** with one-click tag commit.
   - **Tab 4 — Symmetry Mirror, Align/Distribute & `.mpsshapes` Stamp Library**:
     - Interactive house symmetry axis line (`x = 0.50` or custom) with one-click **Mirror Selected Shapes Across Axis (`M`)** (great for symmetrical windows/pillars), Align/Distribute toolbar, and `.mpsshapes` stamp template export/insert.

---

### Work Package 3: Scenes Library, Tag-Aware Auto-Decorate, Holiday Procedural Effects, Generators & 11-Node Colour/FX Graph
**Target Files to Create**:
- `src/utils/sceneAutoDecorator.ts`
- `src/components/modals/SceneLibraryAndFxGraphModal.tsx`

**Detailed Capabilities to Implement**:
1. **Scenes, Palettes, Tag-Aware Auto-Decorate & FX Graph Engine (`src/utils/sceneAutoDecorator.ts`)**:
   - **Scene Data Model (`MpsScene`, `ShapeAssignment`)**:
     - Each scene stores per-shape source assignments (`VideoClip`, `FitVideoShared`, `ProceduralGenerator`, `ShaderPreset`, `SolidColor`), opacity, blend mode (`Normal`, `Additive`, `Multiply`, `Screen`, `Overlay`), `FxGraph` chain, and `ShapeDecorEffect` holiday overlays, plus scene-level particle overlay (`Snow`, `FallingLeaves`, `Embers`, `Confetti`, `Fireflies`, `Bats`, `None`).
   - **7 Built-In Holiday Theme Palettes (`.mpspalettes`)**:
     - *Classic Christmas*, *Candy Cane Lane*, *Winter Wonderland*, *Elegant Gold & Warm White*, *Spooky Halloween Manor*, *Festival of Lights (Hanukkah)*, and *New Year's Eve Countdown*, plus custom palette creation, `.mpspalettes` JSON import/export, and **Hue-Shift Scene Variant Generator** (`+30°`, `+60°`, `+120°`, `+180°`, Complementary).
   - **Tag-Aware Auto-Decorate Engine (`autoDecorateHouse`)**:
     - Automatically maps semantic shape tags (`Roofline`, `RoofPlane`, `Wall`, `Window`, `Door`, `Garage`, `Pillar`, `Bush`, `Trim`) to curated holiday assignments:
       - `Roofline` / `Trim` → Border Chase Marquee C9 Bulb String + Icicle Drip on downward edges
       - `Window` → Warm interior glow + animated Window Silhouette slot (Santa, Elves, Christmas Tree, Star, Spooky Cat, Skeleton)
       - `Wall` → Subtle architectural wash / Candy-Cane stripes / Haunted brick shader with hole cutouts respected
       - `Door` / `Pillar` → Accent framing + wreath/garland glow + candle flicker
       - `RoofPlane` → Shimmering snow accumulation / frost plasma
     - Supports **Deterministic Seeded Reroll (`seed`)** and **Per-Shape Lock (`lockedShapeIds`)** so locked shapes keep their assignment while unlocked shapes reroll.
   - **6 Signature Holiday Procedural Effects & 6 Built-in Generators (Real-Time Canvas2D Renderers)**:
     - **Border Chase / Marquee Bulb String**: Renders glowing C9 bulbs spaced evenly along polygon edges or open rooflines with chase speed, forward/reverse/bounce direction, bulb radius, and glow halo.
     - **Icicle Drip**: Identifies downward-facing roof/eave edges and animates glistening icicles with falling water droplets.
     - **Window Silhouette Renderer**: Renders animated silhouettes (Santa walking, Elves working, Spinning Tree, Glowing Bethlehem Star, Witch/Cat, Dancing Skeleton) auto-fitted inside `Window` shapes.
     - **Santa Sleigh Flyover**: Parabolic arc trajectory across the house sky/roof with reindeer silhouette and golden sparkle trail.
     - **Fireplace / Candle Flicker & Ornament Twinkle**: Multi-octave simplex flicker and child-shape twinkle bursts.
     - **6 Built-In Procedural Generators**: `Solid`, `Multi-Stop Gradient` (linear/radial/conic), `Simplex Noise`, `Plasma`, `Animated Stripes` (candy cane / barber pole), and `Checkerboard`.
   - **11-Node Colour/FX Graph Engine (`FxGraph`)**:
     - Node types: `Source`, `BrightnessContrast`, `HueSaturation`, `Levels`, `Curves`, `Tint`, `Invert`, `Posterize`, `Mix`, `Mask`, `Output`.
     - Includes topological sort evaluator (`evaluateFxGraph`), DAG cycle check (`wouldCreateCycle`), and ready-made FX graph presets (*Warm Vintage Film*, *High-Contrast Neon*, *Frost Cyan Tint*, *Noir Midnight*, *Psychedelic Hue Shift*).
2. **Scene Library, Auto-Decorate & FX Graph Studio Modal (`src/components/modals/SceneLibraryAndFxGraphModal.tsx`)**:
   - **Tab 1 — Scene Library & Live House Preview**: Browse, create, duplicate, rename, delete, and apply reusable Scenes (`.mpsscenes`), with live interactive house canvas preview rendering all procedural generators, bulb chases, icicles, window silhouettes, and particles in real time.
   - **Tab 2 — Tag-Aware Auto-Decorate & Theme Palettes**: Select a Holiday Theme Palette, lock/unlock specific house shapes, click **Auto-Decorate House** or **Reroll Unlocks (Seed)**, or generate **Hue-Shift Scene Variants**.
   - **Tab 3 — Signature Holiday Effects & Built-in Generators Inspector**: Configure Border Chase bulbs, Icicle Drips, Window Silhouettes, Santa Flyover, Candle Flicker, and Built-in Generators per shape.
   - **Tab 4 — 11-Node Colour/FX Graph Editor**: Interactive node canvas where users add nodes, wire connections, adjust node parameters (Levels, Curves, Hue/Sat, Tint, Posterize, Mix), preview the processed output live, and save/load `.mpsfx` graph presets.

---

### Work Package 4: One-Button Auto-Show Generator, Word-Level Karaoke Engine, Punch-In Overdub & xLights `.xtiming` Bridge
**Target Files to Create**:
- `src/utils/autoShowGenerator.ts`
- `src/components/modals/AutoShowAndKaraokeModal.tsx`

**Detailed Capabilities to Implement**:
1. **One-Button Auto-Show, Karaoke & `.xtiming` Engine (`src/utils/autoShowGenerator.ts`)**:
   - **Audio Envelope, Spectral Flux Onsets & Section Segmentation**:
     - Computes RMS energy curve, spectral flux onset peaks, BPM & downbeat grid, structural section boundaries (`Intro`, `Verse 1`, `Chorus 1`, `Verse 2`, `Chorus 2`, `Bridge / Breakdown`, `Drop / Climax`, `Outro`), and high-impact drops.
   - **One-Button Auto-Show Generator (`generateAutoShow`)**:
     - Supports 5 style profiles from `MarshallProjectionStudio`:
       - `Classic` (balanced scene changes on 4-bar/8-bar downbeats, accents on chorus beats)
       - `Gentle` (long crossfades, slow ambient scene transitions, soft snow/twinkle accents)
       - `Punchy` (tight 1-bar/2-bar cuts on high-energy sections, strobe/marquee bursts on every snare/drop)
       - `Chaotic` (rapid beat-synced scene cycling, intense FX bursts)
       - `Surprise Me` (seeded hybrid across profiles)
     - Supports **Full-Song Generation**, **Generate Within Time Selection (`[startSec, endSec]`)**, and **Seeded Reroll**.
   - **Punch-In Beat-Tap Overdub & Precision Flag Tools**:
     - Metronome click synthesizer (Web Audio API woodblock/click on downbeats and beats with configurable pre-roll bars).
     - Live tap-phase offset calculator (`computeTapPhaseOffsetMs` — reports average early/late latency in `±ms` and one-click shifts recorded flags to compensate).
     - **Quantize Flags** (`quantizeBeatFlags` to `1/1`, `1/2`, `1/4`, `1/8`, `1/16` beat subdivisions with strength `0–100%`), **Batch Shift Flags (`±ms`)**, **Ripple Delete Range**, **Paste Insert with Ripple**, and **Flag Density-Heat Minimap** bin calculator.
   - **Word-Level Karaoke `.srt` & `.vtt` Parser & Renderer (`parseKaraokeSubtitles`)**:
     - Parses standard `.srt` and WebVTT `.vtt` files, including inline word-level timestamps (`<00:00:12.340>Jingle <00:00:12.750>bells`). When a cue lacks inline word tags, automatically interpolates word timings proportional to character length across the cue duration.
     - 9-anchor screen positioning (`TopLeft`, `TopCenter`, `TopRight`, `MiddleLeft`, `MiddleCenter`, `MiddleRight`, `BottomLeft`, `BottomCenter`, `BottomRight`), animation styles (`Fade`, `SlideUp`, `TypeOn`, `KaraokeBounce`), font/outline/shadow styling, and live per-word highlight sweep progress `[0..1]`.
   - **xLights `.xtiming` XML Import & Export (`parseXLightsTimingXml`, `exportXLightsTimingXml`)**:
     - Parses `<timing name="..." SourceVersion="..."> <EffectLayer> <Effect label="..." starttime="..." endtime="..."/> </EffectLayer> </timing>` into Gemini/Marshall beat flags and section cues, and exports the current beat/lyric/section tracks back to `.xtiming` XML.
2. **Auto-Show Generator, Punch-In Overdub, Karaoke & `.xtiming` Modal (`src/components/modals/AutoShowAndKaraokeModal.tsx`)**:
   - **Tab 1 — One-Button Auto-Show Generator**: Pick style (`Classic`, `Gentle`, `Punchy`, `Chaotic`, `Surprise Me`), select target Scenes from the Scene Library, set time range (Full Song or Selection), inspect detected song sections & energy curve, and click **Generate Complete Show** or **Reroll Seed**.
   - **Tab 2 — Punch-In Beat Overdub & Precision Timeline Tools**: Pre-roll count-in selector (`1 bar`, `2 bars`), audible Web Audio metronome toggle, live Punch-In Tap button (`Space` / `F`), tap phase offset readout (`±ms` with one-click phase nudge), Quantize to subdivision (`1/1`..`1/16`), Batch Shift (`±ms`), Ripple Delete, and the **Flag Density-Heat Minimap**.
   - **Tab 3 — Word-Level Karaoke Lyric Studio (`.srt` / `.vtt`)**: Import `.srt`/`.vtt` files or load built-in holiday karaoke tracks (*Jingle Bells*, *Carol of the Bells*, *This Is Halloween*, *Auld Lang Syne*), edit word timings, choose 9-anchor placement & animation style, and preview the live word-by-word karaoke sweep over the house canvas.
   - **Tab 4 — xLights `.xtiming` XML Import / Export Bridge**: Import `.xtiming` files (single or multi-track) with track selector, or export current beat flags, section markers, and karaoke lyrics as a valid `.xtiming` XML file for xLights.

---

### Work Package 5: Run Night Kiosk, Evening Rehearsal Simulator, Pre-Show Preflight, `.mps*` Native File Bridge, Red-Light Theme & `Ctrl+K` Command Palette
**Target Files to Create**:
- `src/utils/eveningRehearsalAndPreflight.ts`
- `src/components/modals/RunNightPreflightAndRehearsalModal.tsx`
- `src/components/modals/CommandPaletteModal.tsx`

**Detailed Capabilities to Implement**:
1. **Evening Rehearsal, Pre-Show Check, Document Doctor & `.mps*` File Bridge (`src/utils/eveningRehearsalAndPreflight.ts`)**:
   - **Spencer (1971) Offline Astronomical Civil Dusk Calculator (`computeAstronomicalDusk`)**:
     - Computes exact local solar declination, equation of time, official Sunset (`90.833°` zenith), and **Civil Dusk (`96.0°` zenith)** for any calendar date, latitude, longitude, and UTC offset without requiring internet access.
   - **Season Planning Calendar & Date Override Resolver (`resolveEveningScheduleForDate`)**:
     - Evaluates per-date overrides (`Normal`, `Dark / Off Night`, `Custom Hours`, `Custom Holiday Playlist`), day-of-week schedules, astronomical dusk start trigger, and **Quiet Hours** (courtesy volume cap & master brightness cap after e.g. 9:30 PM).
   - **Deck-Shuffle Scheduler with Seam Guarantee & Entry Weights (`buildDeckShuffleOrder`)**:
     - Expands playlist entries by integer weight (`1x..5x`), shuffles each deck pass using a deterministic seed, and enforces the **Seam Guarantee** (the first show of Deck $N+1$ is guaranteed never to equal the last show of Deck $N$), plus automatic insertion of **Auto-Interstitial** ambient scenes between shows.
   - **Evening Rehearsal Simulator (`simulateEveningRehearsal`)**:
     - Simulates an entire evening window (e.g., `17:14 Civil Dusk` to `22:30 Hard Cutoff`) in <10 ms, producing a complete time-stamped run sheet of every show, crossfade, interstitial, quiet-hours transition, skipped missing-media item, total play counts per show, and fault summary (mirroring `--rehearse-evening` in `MarshallProjectionStudio`).
   - **Pre-Show Check, Map Geometry Validator & Document Doctor (`runPreShowPreflight`, `runDocumentDoctor`)**:
     - Audits map geometry (polygons with <3 vertices, zero area, self-intersecting edges, out-of-bounds `[0..1]` coordinates, misplaced holes, overlapping unmasked shapes), media availability, orphaned scene cues, audio output readiness, and master blackout/dimmer warnings.
     - **Missing-Media Relinker (`relinkMissingMedia`)**: Matches broken file paths against candidate asset filenames/hashes.
   - **Native `.mps*` File Import/Export Bridge**:
     - Full JSON serializer/deserializer for `.mpsmap`, `.mpsscenes`, `.mpspalettes`, `.mpsshow`, `.mpsplaylist`, `.mpscalib`, and `.mpsbundle` so files generated by `MarshallProjectionStudio` (including `SampleHouse.mpsmap`, `SampleScenes.mpsscenes`, etc.) can be imported directly into `GemniProjection Studio` and exported back out!
2. **Run Night Preflight, Evening Rehearsal, Season Calendar & `.mps*` Doctor Modal (`src/components/modals/RunNightPreflightAndRehearsalModal.tsx`)**:
   - **Tab 1 — Evening Rehearsal Simulator (`--rehearse-evening`)**: Pick any target date, toggle Astronomical Civil Dusk start, configure Deck-Shuffle weights & Auto-Interstitials, run the instant Evening Rehearsal simulation, and inspect the full minute-by-minute run sheet + quiet-hours transition markers.
   - **Tab 2 — Pre-Show Preflight Checklist & Missing-Media Relinker**: One-click pre-show readiness audit (Geometry, Media, Audio, Calibration, Blackout/Dimmer checks) with auto-fix actions and the Missing-Media Relinker.
   - **Tab 3 — Run Night Kiosk Launch Pad (0–9), Quarantine & Session Health Recorder**:
     - 10 touch-friendly **Scene Launch Pad (0–9)** live override buttons, **Bad-Media Quarantine** table with manual/auto retry, **Run History & Frame-Pacing Health Recorder** (`P50`, `P95`, `P99` frame times, dropped frames, uptime), **PJLink Projector Power & Lamp-Hour Maintenance Ledger**, **Home Assistant MQTT Publisher**, and **USB Serial Big-Red-Button Trigger** tester.
   - **Tab 4 — Season Planning Calendar & Native `.mps*` Import/Export/Doctor**:
     - Interactive November–January holiday calendar with per-date overrides (`Normal`, `Dark Night`, `Extended Holiday Hours`, `NYE Countdown Playlist`) and `.mpsmap` / `.mpsscenes` / `.mpsshow` / `.mpsplaylist` / `.mpsbundle` import, export, and Document Doctor migration.
3. **`Ctrl+K` Fuzzy Command Palette & Red-Light Night-Vision Theme (`src/components/modals/CommandPaletteModal.tsx`)**:
   - Global `Ctrl+K` / `Cmd+K` keyboard shortcut opening a fast fuzzy-searchable command palette with categorized actions: Navigate to any of the 18 Screens, Open any Marshall Studio tool (`Fit Video to House`, `Export House Stencil`, `Loop Crossfade Editor`, `Global Map Warp & Recalibration`, `Scene Library & Auto-Decorate`, `11-Node FX Graph`, `One-Button Auto-Show Generator`, `Karaoke Lyric Studio`, `xLights .xtiming Bridge`, `Evening Rehearsal Simulator`, `Pre-Show Preflight & .mps* Doctor`), toggle Test Patterns, trigger Master Blackout (`Space`/`B`), or toggle the **Red-Light Night-Vision Tracing Theme**.
   - **Red-Light Night-Vision Tracing Mode**: Applies a high-contrast deep-red/crimson night-vision filter and palette override across the app shell so outdoor driveway calibration preserves dark adaptation.

---

## 3. Subagent Execution Rules & Coordination Contract

1. **Strict Read-Only Protection on `e:\Documents\AiPrograms\MarshallProjectionStudio`**:
   - Subagents may **READ** reference files from `e:\Documents\AiPrograms\MarshallProjectionStudio` if needed, but **MUST NEVER write, modify, or delete** anything in `e:\Documents\AiPrograms\MarshallProjectionStudio`.
2. **Non-Overlapping File Ownership**:
   - Each subagent creates only the specific files assigned to its Work Package inside `e:\Documents\AiPrograms\GemniProjection Studio\src\utils\` and `e:\Documents\AiPrograms\GemniProjection Studio\src\components\modals\`.
   - Subagents **must NOT edit `src/store/useProjectionStore.ts`, `src/App.tsx`, or `src/components/SystemHeader.tsx`** directly during parallel execution; instead, each subagent's modal/utility must read existing `useProjectionStore` fields (`layers`, `playlistClips`, `beatFlags`, `showToast`, etc.) and manage its own rich state (persisted to `localStorage` under a clean namespace or exported via clean helper functions) so the coordinator agent can wire all 7 new modals, toolbar buttons, keyboard shortcuts (`Ctrl+K`, `W`, etc.), and store actions into `useProjectionStore.ts`, `App.tsx`, `SystemHeader.tsx`, and Screens 2, 4, 6, 7, and 10 in a single conflict-free integration pass.
3. **Production Quality**:
   - Zero placeholder stubs or fake non-functional buttons. Every canvas preview, homography solver, stencil PNG exporter, FX graph node, auto-decorate rule, karaoke word sweep, `.xtiming` XML parser/writer, Spencer (1971) astronomical dusk calculator, evening rehearsal simulator, and `.mps*` file importer/exporter must be 100% functional, mathematically accurate, and cleanly typed in TypeScript.
