# LUMEN-MAP AI v3.5: Complete Technical & UI/UX Specification Document
**Target Audience:** Coding AI & Development Team  
**Scope:** Architecture, Screen Specifications, Navigation State Machine, Multi-Projector Edge Blending, and Dual-Layer Alignment Pipeline for Screens 1 through 8.

---

## 1. Global Application Architecture & Persistent System Bar

The application shell persists across all screens (Screens 1 through 8), providing hardware telemetry, project state management, and emergency overrides.

### Persistent Header Layout
* **Application Brand Logo ("LUMEN-MAP AI v3.5")**: Clickable branding element in the top-left corner; prompts to save any unsaved project state and routes the user back to **Screen 1 (Home Screen)**.
* **Active Project Title Readout**: Displays the active project name (e.g., `PROJ: Holiday Show 2026`) paired with a dynamic state badge (`[Saved]` in green during editing, or `[Live]` during show playback).
* **Projector Hardware Telemetry Badge**: Displays a green connection LED, active output format (`PROJECTOR 1: Connected (1920x1080 @ 60Hz)` or multi-projector array summary), and a live GPU utilization progress bar (`GPU: 34%`).
* **AI Engine Status Telemetry Badge**: Displays an online indicator (`AI ENGINE: ONLINE`) and real-time VRAM memory allocation (`VRAM: 8.2GB / 12GB`).
* **Global Panic Hotkey Listener ("ESC")**: Listens globally across all screens for the `Escape` key to immediately zero out physical projector outputs to solid black (`MASTER BLACKOUT`).

---

## 2. Screen 1: Home Screen (Project Hub & Hardware Dashboard)

Screen 1 serves as the central control hub for project management, hardware status monitoring, and navigation into layout editing, multi-projector configuration, or live show execution.

### Layout & Component Specification
* **Top Project File Action Bar**:
  * `SAVE`: Serializes the current project file, vector hierarchies, and alignment matrices.
  * `SAVE AS...`: Opens native OS file dialog to clone the project under a new file path.
  * `EXPORT SHOW PACKAGE`: Compiles all project metadata, vector masks, and aligned video files into a portable archive.
* **Left Primary Navigation Sidebar**:
  * `NEW HOUSE MAPPING PROJECT`: Initializes a blank project state and routes to **Screen 3 (Photo-to-Layout Screen)**.
  * `OPEN EXISTING SHOW`: Opens native OS file browser to load a saved project file.
  * `PROJECTOR SETUP & ARRAYS`: Opens the multi-projector hardware setup and edge blending manager and routes to **Screen 8**.
  * `QUICK LAUNCH PLAYLIST`: Loads the active show playlist and routes directly to **Screen 6 (Playlist & Alignment Screen)**.
  * `GLOBAL SETTINGS & CALIBRATION`: Opens preferences for audio outputs, DMX/artnet ports, and AI API keys.
* **Center Recent Projects Grid**:
  * Displays a 2x2 grid of project cards with thumbnails, titles, modification dates, and aligned video counts.
  * Card Hover Actions: `Play` (routes to **Screen 7**), `Edit Layout` (routes to **Screen 2**), `Duplicate`, and `Delete`.
* **Right Quick-Output Monitor**:
  * `Output Display Dropdown`: Binds the renderer to physical displays or multi-projector arrays.
  * `CONFIGURE MULTI-PROJECTOR ARRAY Link`: Quick link routing to **Screen 8**.
  * `PROJECTOR TEST PATTERN Toggle`: Overrides video feeds with a high-contrast calibration grid.
  * `MASTER BLACKOUT Button`: Red panic button (`ESC` shortcut) cutting video output to black.

---

## 3. Screen 2: Layout Mapping Screen (Vector Masking & Structural Drawing)

Screen 2 provides a precision 2D vector drawing workspace for tracing architectural surfaces, setting blackout masks, and exporting structural guides to the AI generator.

### Layout & Component Specification
* **Top Vector Drawing & Snap Toolbar**:
  * `Select & Transform (V)`, `Pen & Polygon (P)`, `Rectangle & Window (R)`, `Arch & Curve (A)`.
  * `SNAP VERTICES` (magnetically snaps control points), `SNAP 90°` (constrains angles), `SHOW GRID`.
* **Left Surface & Mask Hierarchy Layer Tree**:
  * Categorized layers (`Roofline`, `Main Walls`, `Pillars`, `Garage`, `Windows`, `Blackout Masks`).
  * Per-layer controls: `Visibility (Eye)`, `Lock (Padlock)`, `Solo (S)`, and Mask Role assignment (`Active Projection Surface`, `Hard Blackout Cutout`, `Structural Guide Line`).
* **Center Main Canvas Viewport**:
  * Interactive canvas displaying reference photos with vector outlines and draggable vertex handles.
  * `LIVE TRACE ON HOUSE Toggle`: Outputs cursor and vector lines through the projector onto the real house.
  * Zoom/Pan HUD (`150%`, cursor coordinates) and `Fit to Screen` button.
* **Right Surface Inspector Panel**:
  * Numeric input boxes for `Position X/Y`, `Width`, `Height`, and `Rotation`.
  * `Edge Feathering Slider` (`0-50 px`) and `Outline Glow Width Slider` (`1-20 px`).
  * `EXPORT LAYOUT TO AI STUDIO Button`: Rasterizes geometry into ControlNet maps and routes to **Screen 4**.

---

## 4. Screen 3: Photo-to-Layout Screen (Reference Capture & Auto-Segmentation)

Screen 3 ingests raw house photos, corrects perspective lens distortion, and runs computer vision edge detection to auto-generate vector masks.

### Layout & Component Specification
* **Top Capture & Auto-Detection Toolbar**:
  * `IMPORT REFERENCE PHOTO` and `LIVE CAMERA CAPTURE` (tethered DSLR/webcam).
  * `ASPECT RATIO LOCK Dropdown` (`16:9`, `16:10`, `4:3`).
  * `AUTO-DETECT HOUSE STRUCTURE Button`: Runs Canny/HED edge detection and semantic segmentation.
* **Center Dual-Square Comparison Viewport**:
  * Left Square (`SOURCE PHOTO & PERSPECTIVE CAGE`): Displays raw photo with a 4-point homography correction cage.
  * Right Square (`EXTRACTED LAYOUT PREVIEW`): Displays auto-traced neon polygons with an extracted zones counter.
  * `OVERLAY BLEND Slider`: Crossfades extracted vectors over the source photo.
* **Right Segmentation & Tracking Parameter Panel**:
  * `Edge Detection Sensitivity Slider`, `Line Simplification Slider`, and `Shadow & Contrast Boost Slider`.
  * `AUTO-MASK WINDOWS & SKY Checkbox`.
  * `CONVERT TO EDITABLE LAYOUT Button`: Converts auto-traced polygons into editable vector layers and routes to **Screen 2**.

---

## 5. Screen 4: Create Video from Photo Screen (AI Generation Studio)

Screen 4 combines aligned house photos, ControlNet wireframes, and text prompts to generate perspective-locked projection mapping videos.

### Layout & Component Specification
* **Left Structural Lock & Reference Panel**:
  * `ALIGNED HOUSE PHOTO Square` with `Use for Color/Lighting Reference` toggle.
  * `CONTROLNET WIREFRAME Square` with `ControlNet Wireframe & Depth` conditioning toggle.
  * `Structure Adherence Slider` (`0.0` to `1.0`) and `PRESERVE BLACKOUT ZONES Checkbox`.
* **Center Prompts & Theme Engine**:
  * `POSITIVE PROMPT` and `NEGATIVE PROMPT` text input boxes.
  * `QUICK THEME PRESETS Thumbnail Grid` (`Cyberpunk Neon`, `Haunted Manor`, `Ice Palace`, etc.).
  * `Clip Duration Dropdown`, `Motion Intensity Slider`, `Frame Rate Dropdown`, and `Seed Input` with a lock button.
  * `HARD CAMERA LOCK [ON] Toggle`: Locks virtual camera extrinsic matrices to zero movement.
* **Right Render Queue & Preview Panel**:
  * `MAIN VIDEO PREVIEW Square`: 16:9 playback monitor with play/pause, scrub bar, timer, and loop toggle.
  * `Ghost Wireframe Overlay Button`: Superimposes neon layout lines over the video.
  * `GENERATE VIDEO Button`: Dispatches payload to AI engine.
  * Post-process action buttons: `Make Seamless Loop`, `Upscale to 4K`, `Send to Fix/Modify` (routes to **Screen 5**), and `Approve & Save to Playlist` (routes to **Screen 6**).

---

## 6. Screen 5: Regenerate Video / Fix & Modify Prompt Tool (Inpainting & Drift Repair)

Screen 5 allows users to repair localized AI glitches, warped windows, or flickering textures without losing the rest of the clip.

### Layout & Component Specification
* **Top Repair Mode Tab Bar & Masking Toolbar**:
  * Tabs: `PROMPT DELTA & RE-ROLL`, `REGIONAL INPAINTING`, `STRUCTURAL RE-ANCHOR`.
  * Masking tools: `PAINT BRUSH`, `LASSO`, `SELECT FROM LAYOUT MASK`, `FEATHER Slider` (`12px`), and `INVERT SELECTION`.
* **Center Interactive Split-Screen Viewport**:
  * Before / After Wipe Canvas Square: Compares pre-repair state (with red brush mask) against the repaired preview.
  * Frame transport scrubber bar and `PIN TO ORIGINAL PHOTO Button`.
* **Right Modification & Inpaint Inspector Panel**:
  * `ORIGINAL PROMPT & SEED (READONLY)` readout box.
  * `MODIFICATION / INPAINT PROMPT Box` and `Change Strength (Denoise) Slider` (`45%`).
  * `Temporal Consistency Toggle` (enables cross-frame optical flow conditioning).
  * Action buttons: `RENDER REPAIR PREVIEW`, `OVERWRITE ORIGINAL CLIP` (routes to **Screen 6**), and `SAVE AS NEW PLAYLIST VARIANT` (routes to **Screen 6**).

---

## 7. Screen 6: Playlist & Alignment Screen (Global Key Reference vs. Per-Clip Override)

Screen 6 manages show sequencing and implements a dual-layer transformation hierarchy separating global projector alignment from per-clip AI drift corrections.

### Layout & Component Specification
* **Top Calibration Mode & Live Output Bar**:
  * Mode Buttons: `GLOBAL KEY REFERENCE MODE` vs. `INDIVIDUAL CLIP OVERRIDE MODE`.
  * Live toggles: `SEND LIVE TO PROJECTOR`, `PROJECT WIREFRAME GRID`, `SHOW CROSSHAIRS`, `APPLY BLACKOUT MASKS`.
* **Center-Left Main Calibration Viewport**:
  * Warp mode selectors: `SIMPLE SCALE/ROTATE/MOVE`, `4-CORNER PIN (KEYSTONE)`, `BEZIER MESH GRID (3x3)`.
  * Interactive warping canvas with transformation cages and `BASE HOUSE GHOSTING Slider` (`50%`).
* **Right Dual-Layer Alignment Inspector Panel**:
  * `GLOBAL KEY REFERENCE (MASTER) Box`: Master homography coordinates and `[Locked]` toggle. `SAVE GLOBAL PRESET` and `LOAD GLOBAL PRESET`.
  * `INDIVIDUAL CLIP OFFSET (CHILD DELTA) Panel`: Numeric spinners for `Delta X/Y`, `Scale X/Y`, and `Rotation`. Small nudge resolution buttons (`0.1 px`, `1.0 px`, `5.0 px`).
  * Utilities: `BYPASS OFFSET`, `RESET TO GLOBAL`, `COPY TO OTHER CLIPS`, `BAKE ALIGNMENT`, and `MASTER BLACKOUT [ESC]`.
* **Bottom Playlist Sequencer & Transport Strip**:
  * Horizontal timeline of saved video thumbnails with alignment status badges (`GLOBAL SYNCED` vs. `CUSTOM OFFSET ACTIVE`).
  * Sequencer transport controls (`Play` launches **Screen 7**), transition duration, and loop mode dropdowns.

---

## 8. Screen 7: Live Showtime / Run Show Screen (Automated Playback & Operator Console)

Screen 7 is a simplified, high-contrast dark-mode performance dashboard designed for unattended scheduled operation or live manual show control at night.

### Layout & Component Specification
* **Top Live Status & Schedule Header Banner**:
  * `LIVE SHOW ACTIVE` broadcast status indicator and real-time system clock.
* **Left Live Security Camera & Manual Overlay Deck**:
  * `LIVE SECURITY/FEED CAMERA Square` with `GRID OVERLAY` toggle.
  * `INTERACTIVE MANUAL CUES (LIVE OVERLAYS) Pads`: Instant triggers (`THUNDER & FLASH`, `SNOW STORM`, `GHOST SCREAM`, `STRIKE LASER`, `FIREWORKS`, `MERRY CHRISTMAS`).
  * `QUICK PATTERN / CALIBRATION OVERLAYS Box` and `GRID BRIGHTNESS Slider`.
* **Center Playlist Queue & Countdown Monitor**:
  * `PLAYLIST QUEUE Live Tracker` showing active, finished, and queued clips.
  * `TIME TO NEXT CLIP Countdown Readout` timer.
* **Bottom Hardware I/O, Scheduler & Console Log Strip**:
  * `HARDWARE TRIGGER STATUS Panel` (DMX gateway, PIR motion sensors).
  * `SYSTEM AUTOMATION & CALENDAR Panel` and auto-scrolling `CONSOLE ACTION LOG`.
* **Right Master Operator Control Column**:
  * Giant `GO Button`, `PAUSE Button`, and `SKIP NEXT Button`.
  * Dual vertical master faders (`PROJECTOR LUMENS` and `MASTER VOLUME`).
  * `MASTER PANIC / BLACKOUT [ESC] Button`: Glowing red emergency blackout button.

---

## 9. Screen 8: Multi-Projector Setup & Edge Blending Screen

Screen 8 stitches 2, 4, or more physical HDMI/DisplayPort projectors into a unified virtual canvas, applying geometric keystone corrections and gamma-corrected edge blending.

### Layout & Component Specification
* **Top Hardware Detection & Array Preset Bar**:
  * `DETECT DISPLAY OUTPUTS Button` and Array Topology Preset buttons (`1x2 Horizontal`, `2x1 Vertical`, `1x4 Panoramic`, `2x2 Quad Matrix`, `Luminance Stack`).
  * `SEND CALIBRATION GRID TO ALL PROJECTORS Toggle` and `TOTAL VIRTUAL CANVAS READOUT Badge`.
* **Left Connected HDMI / DisplayPort Hardware List**:
  * Physical output cards (`PROJ 1: HDMI-1`, etc.) with color-coded border badges.
  * `IDENTIFY ON HOUSE Button` (flashes number and colored border), enable checkbox, and `Mount Flip Dropdown` (`0°`, `180° Inverted`, `90° Portrait`).
* **Center Interactive Multi-Projector Alignment Canvas**:
  * Background house reference layer and draggable projector frustum rectangles with 4-corner keystone pins.
  * Dynamic Overlap & Edge-Blend Zone: Automatically highlights intersecting regions in an amber crosshatch pattern with pixel dimension readouts.
* **Right Edge Blending & Black-Level Compensation Inspector**:
  * Selected overlap seam selector and `ENABLE SOFT EDGE BLENDING Toggle`.
  * `Blend Roll-Off Curve Selector` (`Raised Cosine / S-Curve`), `Blend Gamma Slider` (`0.5 - 3.0`), and `Feather Inset Slider`.
  * `BLACK-LEVEL UPLIFT Sub-Panel` (compensates for double lens glow in overlap zones) and `PER-PROJECTOR COLOR & LUMEN MATCHING Sub-Panel`.
* **Bottom Calibration Pattern & Routing Bar**:
  * Calibration overlay mode buttons (`Show Overlap Feather Gradient`, `Show 1-Pixel Alignment Grid`).
  * `SAVE ARRAY PRESET`, `APPLY ARRAY & RETURN TO HOME` (routes to **Screen 1**), and `APPLY ARRAY & GO TO PHOTO-TO-LAYOUT` (routes to **Screen 3**).

---

## 10. User Workflow & Screen-to-Screen Routing State Machine

### Master Navigation Routing Table

| Source Screen | User Action / Trigger Button | Target Screen | Purpose / Workflow Context |
| :--- | :--- | :--- | :--- |
| **Screen 1** | Click `NEW HOUSE MAPPING PROJECT` | **Screen 3** | Starts a new show by ingesting and perspective-correcting a reference house photo. |
| **Screen 1** | Click `OPEN EXISTING SHOW` | File Browser | Loads saved project metadata into application memory. |
| **Screen 1** | Click `PROJECTOR SETUP & ARRAYS` | **Screen 8** | Configures multi-projector HDMI/DP arrays and edge blending seams. |
| **Screen 1** | Click `QUICK LAUNCH PLAYLIST` | **Screen 6** | Bypasses creation tools to manage show playlists and alignment. |
| **Screen 1** | Click `Edit Layout` on Project Card | **Screen 2** | Opens existing vector masks and architectural layer tree for editing. |
| **Screen 1** | Click `Play` on Project Card | **Screen 7** | Launches the live automated show control console. |
| **Screen 8** | Click `APPLY ARRAY & RETURN TO HOME` | **Screen 1** | Saves hardware array topology and returns to dashboard. |
| **Screen 8** | Click `APPLY ARRAY & GO TO PHOTO-TO-LAYOUT` | **Screen 3** | Commits multi-projector virtual canvas resolution and proceeds to capture. |
| **Screen 3** | Click `CONVERT TO EDITABLE LAYOUT` | **Screen 2** | Passes auto-segmented computer vision polygons into the vector editor. |
| **Screen 2** | Click `EXPORT LAYOUT TO AI STUDIO` | **Screen 4** | Rasters vector wireframes and blackout masks for ControlNet conditioning. |
| **Screen 4** | Click `SEND TO FIX/MODIFY` | **Screen 5** | Loads generated video into regional inpainting and drift repair suite. |
| **Screen 4** | Click `APPROVE & SAVE TO PLAYLIST` | **Screen 6** | Appends approved video clip to project playlist array. |
| **Screen 5** | Click `OVERWRITE / SAVE AS NEW VARIANT` | **Screen 6** | Saves repaired clip variant into playlist array. |
| **Screen 6** | Click Sequencer `Play` / Transport | **Screen 7** | Boots the live show performance console for unattended or manual playback. |
| **Any Screen** | Click Application Brand Logo (`LUMEN-MAP AI`) | **Screen 1** | Prompts to save dirty state and returns to Home Screen. |

---

## 11. Core Mathematical Formulas for Coding AI Implementation

### A. Dual-Layer Alignment Transformation Equation
For every video frame rendered in Screen 6 and Screen 7, the rendering engine must compute the final vertex transformation matrix $T_{\text{final}}$ combining master projector calibration with per-clip AI drift offsets:
$$T_{\text{final}} = M_{\text{blackout}} \odot \left( T_{\text{global}} \cdot T_{\text{clip\_delta}} \right)$$
* Where $T_{\text{global}}$ is the locked Master Reference homography/mesh matrix from Screen 6.
* Where $T_{\text{clip\_delta}}$ is the per-video child offset matrix (defaulting to identity matrix $I$ when marked `GLOBAL SYNCED`).
* Where $M_{\text{blackout}}$ is the binary or feathered alpha cutout mask applied to prevent spill over windows or neighbors' properties.

### B. Multi-Projector S-Curve Edge Blending Shader Formula
For any pixel $(u, v)$ located inside an overlap zone of width $W_{\text{overlap}}$ between projector $k$ and projector $k+1$, compute normalized distance $d \in [0, 1]$, and multiply RGB output by attenuation factor $\alpha(d)$:
$$\alpha(d) = \begin{cases} \left( \frac{1}{2} (2d)^p \right)^{\frac{1}{\gamma}} & \text{if } 0 \le d < 0.5 \\ \left( 1 - \frac{1}{2} (2(1-d))^p \right)^{\frac{1}{\gamma}} & \text{if } 0.5 \le d \le 1 \end{cases}$$
* Where $p = 2.0$ (quadratic S-curve steepness) and $\gamma$ is the **Blend Gamma Slider** value (`0.5` to `3.0`, default `2.2`). For 2x2 quad arrays, combine horizontal and vertical attenuation: $\alpha_{\text{total}}(u, v) = \alpha_x(d_x) \cdot \alpha_y(d_y)$.