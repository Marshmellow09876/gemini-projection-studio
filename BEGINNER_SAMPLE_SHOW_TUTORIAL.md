# 🎓 LUMEN-MAP AI v3.5: Complete Beginner’s Step-by-Step Sample Show Walkthrough

Welcome to **LUMEN-MAP AI v3.5**! If you have never done architectural projection mapping before, all the screens, vector layers, and calibration controls can look intimidating at first.

This guide walks you step-by-step through creating a complete, 60-second **“Ghostbusters Firehouse Sample Show”** from scratch—explaining **what every screen, button, and slider does** and **why it matters** along the way.

> **💡 Tip — Interactive In-App Coach Included!**
> You can also follow this entire tutorial interactively inside the software! Click the green **`🎓 Tutorial`** button in the top system bar (or the **`Start Sample Show Walkthrough →`** banner on Screen 1). Every step includes a **`⚡ Auto-Demo Step`** button that performs the setup live on screen for you.

---

## 🧭 Part 0: Understanding the Big Picture (How Projection Mapping Works)

Normally, if you point a backyard video projector at your house and play a regular movie, it looks messy:
1. **Light shines through glass windows**, blinding people inside the bedrooms.
2. **Light spills off the roof** into the trees and night sky.
3. **Animations don't match your house's shape**—things float across bricks and doors randomly.

**Projection Mapping fixes all three problems:**
```
[1. Take Photo of House] ➔ [2. Trace Walls & Blackout Windows] ➔ [3. AI Generates Video Glued to Your Bricks] ➔ [4. Sync Music & Play Live Show!]
```

Notice how the **Top Navigation Bar** in LUMEN-MAP AI is numbered **1 through 10** from left to right. That isn't random—**it is the exact step-by-step order of building a show!**

---

## 🛠️ Always-On Top System Bar: What Those Top Buttons Do

No matter which screen you are on, the **Top System Bar** stays pinned at the top of your window:

| Control / Badge | Where It Is | What It Does & Why You Need It |
| :--- | :--- | :--- |
| **LUMEN-MAP AI v3.5 Logo** | Top-Left | Click anytime to return to **Screen 1 (Home)**. Prompts you if you have unsaved changes. |
| **`PROJ: [Name] [Saved]`** | Top-Left | Shows which show file is open and whether your recent edits are `[Saved]`, `[Unsaved*]`, or `[Live]`. |
| **`SAVE` / `SAVE AS...` / `EXPORT SHOW PACKAGE`** | Top-Left | **`SAVE` (`Ctrl+S`)** saves to your studio storage. **`EXPORT SHOW PACKAGE`** downloads a portable `.lumen` file you can back up or move to your yard laptop. |
| **`LAUNCH PROJECTOR OUTPUT`** | Top-Right (Cyan/Blue Glow) | Opens a clean, borderless window (`/?projector=true`) with **no buttons or menus**. You drag this window onto your physical HDMI projector screen and press **`F11`** for fullscreen! |
| **`PROJECTOR 1: 1080p @ 60Hz` & `AI: ONLINE`** | Top-Right | Hardware health meters showing projector connection, GPU load, and AI VRAM usage. |
| **`Optics Calc` / `Stems` / `Batch Queue` / `MIDI` / `Assets` / `History`** | Top-Right Quick Bar | One-click pop-up calculators and utilities (explained in each step below). |
| **`🎓 Tutorial` & `?` Hotkeys** | Top-Right | **`🎓 Tutorial`** opens the interactive in-app coach. **`?`** opens the keyboard shortcuts cheat-sheet. |
| **`ESC` Key (Master Blackout)** | Keyboard `ESC` | **Your Emergency Panic Switch!** Pressing `ESC` on any screen immediately turns all projector outputs solid black (`0 IRE`)—perfect if a car pulls into the driveway or someone walks in front of the projector lens. |

---

## 🎬 Step 1: Creating Your Sample Show Project (`1. Home` — Screen 1)

### What This Screen Does
**Screen 1 (Home)** is your project hub. It stores all of your saved shows, lets you create a new show from a template or custom house photo, and gives you a **Quick-Output Monitor** on the right side.

### What Each Area Does
* **Left Sidebar (`+ NEW HOUSE MAPPING PROJECT`)**: Starts a brand-new show or opens an existing `.lumen` file.
* **Center Recent Projects Grid**: Shows your saved shows. Hovering over any card plays a preview of its video and reveals 4 quick buttons: **`Play`** (jumps straight to Live Showtime), **`Edit Layout`** (jumps to Vector Mapping), **`Duplicate`**, and **`Delete`**.
* **Right Quick-Output Monitor**:
  * **`[WIREFRAME]` vs `[LIVE VIDEO]` Toggle**: Lets you inspect either your glowing architectural outline masks alone or the live video playing inside those masks.
  * **`PROJECTOR TEST PATTERN` Toggle**: Replaces the video with professional calibration patterns (`Alignment Grid`, `SMPTE Color Bars`, `Focus Starburst`, etc.) so you can focus your physical projector lens outside.

### 👉 Do This Now for Your Sample Show:
1. Click the big blue **`+ NEW HOUSE MAPPING PROJECT`** button in the Left Sidebar.
2. In the pop-up window, type **`My First Firehouse Sample Show`** as the Project Title.
3. Click the first template card: **`Ghostbusters Firehouse & Ecto-1`**.
4. Click **`Create & Open Photo-to-Layout (Screen 3)`** (or if you want to check your projector first, click **`2. Projectors`** in the top bar).

---

## 📽️ Step 2: Checking Your Projector & Yard Distance (`2. Projectors` — Screen 8)

### What This Screen Does
Before mapping a real house, you need to know where to put your projector in the yard and whether you are using **1 projector** or **multiple projectors blended together**.

> **Note:** You do **not** need a physical projector plugged in right now to build and preview your show! You can do steps 1–9 right on your laptop monitor.

### What Each Control Does
* **Top Array Topology Bar (`1x2 Horizontal`, `2x1 Vertical`, `Luminance Stack`)**:
  * If you have **1 projector**, you just project a single image.
  * If your house is super wide and you use **2 projectors side-by-side (`1x2 Horizontal`)**, their beams overlap in the middle by ~15%.
  * If you want **double brightness**, **`Luminance Stack`** stacks two projectors directly on top of each other.
* **Center Multi-Projector Canvas & Seam Zone**: Shows Projector 1 (Blue) and Projector 2 (Cyan). The purple strip in the middle is the **Overlap Seam Zone**.
* **Right Edge-Blending Panel (`Enable Soft-Edge Blending`, `Blend Curve`, `Blend Gamma`)**: If two projectors overlap in the middle of a wall, that middle strip will look twice as bright unless we fade ("feather") the right edge of Projector 1 and the left edge of Projector 2. The **Raised Cosine / S-Curve** at **Gamma `2.20`** makes that seam invisible!
* **`Optics Calc` Button (Top System Bar)**: Not sure how far back in the yard to set your projector tripod? Click **`Optics Calc`** in the top bar, enter your projector's Throw Ratio (e.g., `0.8:1` short-throw or `1.5:1` standard) and house width (e.g., `40 ft`), and it tells you the exact distance in feet and whether your brightness (`Foot-Lamberts`) is strong enough for night shows!

### 👉 Do This Now for Your Sample Show:
1. Click **`2. Projectors`** in the top navigation bar.
2. In the Left Sidebar, click **`FLASH IDENTIFY`** on **Projector 1**—watch the canvas flash a giant `1` (on a real multi-projector rig, this tells you which physical projector is which!).
3. Make sure **`ENABLE SOFT-EDGE BLENDING`** is checked in the Right Sidebar.

---

## 📸 Step 3: Turning a House Photo into Smart Outlines (`3. Photo CV` — Screen 3)

### What This Screen Does
How does the software know where your bricks, roof peaks, pillars, and windows are?
You take a photo of your house from the **exact spot in the yard where your projector lens sits**, load it into **Screen 3 (`3. Photo CV`)**, and let the **Computer Vision (CV)** engine automatically trace the building into vector polygons!

> **🌟 The #1 Golden Rule of Projection Mapping:**
> When you map your own house, take your reference photo with your camera/phone held **right next to the projector lens** aiming at the house. That way, the camera's perspective matches the projector's beam!

### What Each Control Does
* **Top Toolbar (`Import Photo`, `Live Camera Capture`, `Bundled Photos V1–V4`)**: Load your own house photo or pick one of the 4 bundled Ghostbusters Firehouse photos.
* **Left Square (`SOURCE PHOTO & PERSPECTIVE CAGE`)**: Shows your raw house photo with **4 green corner pins (`C1`, `C2`, `C3`, `C4`)**. If your camera was tilted upward when taking the photo, dragging these 4 pins straightens out the perspective tilt using a 3x3 Homography Matrix.
* **`AUTO-DETECT HOUSE STRUCTURE` (Top Blue Wand Button)**: Scans the photo for architectural edges (roofline, walls, arches, windows, garage doors) and turns them into polygons.
* **Right Square (`EXTRACTED LAYOUT PREVIEW`)**: Shows the glowing neon vector polygons found by the scan.
* **`OVERLAY BLEND` Slider (Below the two squares)**: Crossfades between the original photo and the neon outlines so you can check how accurately they line up.
* **Right Sidebar (`Edge Detection Sensitivity`, `Line Simplification`, `AUTO-MASK WINDOWS & SKY`)**:
  * **Edge Detection Sensitivity**: Higher = detects finer brick/trim details; Lower = only big outer walls.
  * **Line Simplification**: Smooths out jagged lines into clean straight segments.
  * **`AUTO-MASK WINDOWS & SKY`**: Automatically flags glass windows and the sky above the roof as **Blackout Zones** so projector light won't shine into bedrooms or waste light into the sky.

### 👉 Do This Now for Your Sample Show:
1. Click **`3. Photo CV`** in the top bar.
2. Make sure **`V1: Ecto-1 Garage`** is selected in the top photo bar.
3. Click the blue **`AUTO-DETECT HOUSE STRUCTURE`** button in the top bar and watch the scanner trace the firehouse.
4. Drag the **`OVERLAY BLEND`** slider left and right to see the neon lines hug the firehouse architecture.
5. Click the green **`CONVERT TO EDITABLE LAYOUT →`** button at the bottom-right to send these layers to **Screen 2 (`4. Vectors`)**.

---

## ✏️ Step 4: Refining Vector Layers & Window Blackouts (`4. Vectors` — Screen 2)

### What This Screen Does
**Screen 2 (`4. Vectors`)** is your 2D architectural drawing board. Here, every traced shape of your house is organized into categories (`Roofline`, `Garage`, `Pillars`, `Main Walls`, `Windows`, `Blackout Masks`) so you can tweak corners, soften edges, and tell the AI what each part of the house is.

### The 3 Mask Roles Explained (Super Important!)
Every layer in the Left Sidebar is assigned one of **3 Mask Roles**:
1. **🟢 `Active Projection Surface`**: Surfaces where you **WANT** video animations to play (e.g., *Main Brick Walls, Garage Bay, Pillars*).
2. **🔴 `Hard Blackout Cutout`**: Surfaces where you want **ZERO light (solid black)** projected (e.g., *Bedroom Windows, Sky above the roof, Neighbor's fence*). Even if an AI video has explosions everywhere, Hard Blackout Cutouts punch a clean black hole over the glass so nobody inside gets blinded!
3. **🔵 `Structural Guide Line`**: Trim lines, roof ridges, and window frames sent to the AI generator so it knows where edges are and wraps glowing effects around them.

### What the Other Controls Do
* **Top Drawing Tools (`Select V`, `Pen P`, `Rectangle R`, `Arch A`)**:
  * **`Select (V)`**: Click any layer and drag its glowing corner points (vertices) to adjust the fit.
  * **`Pen (P)` / `Rectangle (R)` / `Arch (A)`**: Draw new polygons, rectangular windows, or curved archways.
* **`LIVE TRACE ON HOUSE` (Top-Right of Canvas)**: When connected to a real projector outside at night, turning this ON shines your mouse cursor and glowing white vector lines onto the physical house so you can trace bricks directly on the real wall!
* **Right Surface Inspector (`Edge Feathering` & `Outline Glow Width`)**:
  * **`Edge Feathering (0–50 px)`**: Softens the outer border of a layer so edges blend smoothly instead of looking razor-sharp.
  * **`Outline Glow Width (1–20 px)`**: Adds a glowing neon laser border along the polygon edges.
  * **`Wall Color Neutralizer` Button**: If your real house is painted yellow, beige, or red brick, this tool calculates a counter-tint filter so projected white snow still looks pure white!

### 👉 Do This Now for Your Sample Show:
1. On **`4. Vectors` (Screen 2)**, click through the layers in the **Left Sidebar** (e.g., `Main Brick Facade`, `Upper Arch Windows`, `Open Garage Bay`) to see each part highlight on the canvas.
2. In the **Right Inspector**, set **Edge Feathering** to **`6 px`** and **Outline Glow Width** to **`4 px`**.
3. Click the big blue **`EXPORT LAYOUT TO AI STUDIO →`** button at the bottom-right to move to **Screen 4 (`5. AI Studio`)**.

---

## 🤖 Step 5: Generating AI Videos Locked to Your House (`5. AI Studio` — Screen 4)

### What This Screen Does
This is where the magic happens! If you ask a normal AI video website for *"a haunted firehouse with green ectoplasm,"* it will invent a random building and pan the camera around—which won't fit your house at all.
**Screen 4 (`5. AI Studio`)** combines your **House Photo** + your **Vector Wireframe Mask** using **ControlNet Conditioning** and **Hard Camera Lock** so the AI grows animations directly onto **YOUR** exact windows, pillars, and roof without ever moving the camera!

### What Each Panel & Control Does
* **Left Panel (`Structural Lock & Reference`)**:
  * **`ALIGNED HOUSE PHOTO` (`Use for Color/Lighting Reference`)**: Tells the AI where your natural shadows and brick textures are.
  * **`CONTROLNET WIREFRAME` (`ControlNet Wireframe & Depth`)**: Feeds your black-and-white vector outlines from Screen 2 into the AI.
  * **`Structure Adherence Slider (0.00 – 1.00)`**: Controls how strictly the AI must obey your house lines. **Keep this between `0.85` and `0.95`** so your windows and roof never warp!
  * **`PRESERVE BLACKOUT ZONES`**: Keeps your window blackout masks pure black during generation.
* **Center Panel (`Prompts & Theme Engine`)**:
  * **`POSITIVE PROMPT`**: Describe what you want your house to transform into (e.g., *"Ghostbusters red brick firehouse with glowing green Slimer ectoplasm bursting from upper arch windows, proton laser streams wrapping around pillars"*).
  * **`NEGATIVE PROMPT`**: Things you do **NOT** want the AI to do (e.g., *"camera movement, pan, zoom, crooked perspective, blurry"*).
  * **`QUICK THEME PRESETS` & `🎲 Holiday Prompt Generators`**: One-click presets (`Cyberpunk Neon`, `Haunted Manor`, `Gingerbread House`, `Molten Lava`, `Ice Palace`, `Laser Grid`) plus random Halloween/Christmas prompt dice buttons!
  * **`HARD CAMERA LOCK [ON]`**: **Always leave this ON!** It locks the virtual camera's 3D position so the video never pans or zooms away from your physical house alignment.
* **Right Panel (`Render Queue & Preview Monitor`)**:
  * **`Ghost Wireframe Overlay` Button (Layers Icon)**: Superimposes your cyan house outlines over the video preview so you can verify that every window and pillar in the video matches your house!
  * **`GENERATE VIDEO`**: Renders the AI clip.
  * **`Send to Fix/Modify (Screen 5)`** & **`Approve & Save to Playlist (Screen 6)`**: Sends your finished video to the repair tool or directly into your show playlist.

### 👉 Do This Now for Your Sample Show:
1. On **`5. AI Studio` (Screen 4)**, click **`Haunted Manor`** in the **Quick Theme Presets** (or click the **🎲 Halloween Prompt** button).
2. Make sure **`Structure Adherence`** on the left is around **`0.90`** and **`HARD CAMERA LOCK [ON]`** is green.
3. Click **`GENERATE VIDEO`** in the Right Panel and watch the progress bar complete.
4. Toggle **`Ghost Wireframe Overlay`** on the video player to see how the neon lines match the video's architecture!

---

## 🖌️ Step 6: Fixing Small Glitches Without Re-Rolling (`6. Repair` — Screen 5)

### What This Screen Does
What if 95% of your generated AI video looks incredible, but the AI put a weird artifact over the garage door or made one window flicker? Instead of throwing away the whole clip, **Screen 5 (`6. Repair`)** lets you paint a mask over **just that one spot** and regenerate only that area (**Regional Inpainting**).

### What Each Control Does
* **Top Repair Mode Tabs**:
  1. **`PROMPT DELTA & RE-ROLL`**: Keeps the exact same scene layout/seed, but tweaks a detail in the prompt.
  2. **`REGIONAL INPAINTING`**: Regenerates **only** the red area you paint with your brush.
  3. **`STRUCTURAL RE-ANCHOR`**: Forces a drifting wall or window frame to snap back to your original house photo lines.
* **Top Masking Tools (`Paint Brush`, `Lasso`, `Select From Layout Mask`, `Feather`)**:
  * Use **`Paint Brush`** to paint red strokes over any glitchy area on the video, or click **`Select From Layout Mask`** to select an entire architectural layer (like `Garage`) with one click!
  * **`Feather (12px)`**: Blurs the edge of your red mask so the repaired patch blends invisibly into the rest of the video.
* **Center Split-Screen (`Before / After Wipe Canvas`)**: Drag the vertical cyan slider bar left and right to compare **BEFORE** (original clip + red mask) vs **AFTER** (repaired preview).
* **Right Panel (`Inpaint Prompt`, `Change Strength`, `Temporal Consistency Lock`)**:
  * Describe what should appear inside the red mask, keep **`Temporal Consistency`** checked (prevents frame-to-frame flickering), and click **`RENDER REPAIR PREVIEW`**.

### 👉 Do This Now for Your Sample Show:
1. Click **`6. Repair`** in the top bar (or click **`Send to Fix/Modify`** from Screen 4).
2. Click the **`REGIONAL INPAINTING`** tab at the top-left.
3. Click and drag on the left side of the video canvas to paint a red mask over the garage door.
4. Click **`RENDER REPAIR PREVIEW`** on the right, then drag the center **Before/After Wipe bar** left and right to inspect the result!

---

## 🎵 Step 7: Making the House Pulse to Music (`7. Music Sync` — Screen 10)

### What This Screen Does
**Screen 10 (`7. Music Sync`)** turns your architectural vector layers into a giant music visualizer synchronized to your show's soundtrack!

### What Each Control Does
* **Top Audio Toolbar (`Track Selector`, `BPM`, `AUTO-DETECT BEATS`, `Tap Tempo [T]`)**:
  * Pick a bundled soundtrack (or upload your own `.mp3`/`.wav`) and click **`AUTO-DETECT BEATS`**. The audio analyzer scans the song and automatically drops colored **Beat Flags** on bass drops, drum hits, and chorus transitions.
* **Center Waveform & Beat Flag Timeline**:
  * Displays the song waveform and every beat marker. Click anywhere on the waveform to add or edit a flag.
* **Right Sidebar (`Per-Layer Audio-Reactive Matrix`)**:
  * Pick any architectural layer of your house (for example, **`Roofline`** or **`Pillars`**) and turn **`Audio Reactive [ON]`**.
  * **`Trigger Band (`Bass`, `Mids`, `Highs`, `All`)`**: Choose **`Bass`** to make the roofline pulse on kick drums, or **`Highs`** to make window frames sparkle on cymbals/synths.
  * **`Reactive Effect (`Pulse`, `Flash`, `Color-Shift`, `Strobe`, `Blackout`)`**: Controls how that part of the house reacts when the beat hits!

### 👉 Do This Now for Your Sample Show:
1. Click **`7. Music Sync`** in the top bar.
2. Click **`AUTO-DETECT BEATS`** in the top toolbar—watch the waveform populate with beat flags.
3. In the Right Sidebar, enable **`Audio Reactive`** on the **`Roofline`** layer, set Trigger Band to **`BASS`**, and set Reactive Effect to **`PULSE`**.
4. Press the **`Play`** button on the transport bar to see the roofline pulse to the beat!

---

## 🎞️ Step 8: Sequencing Your Playlist & Final House Alignment (`8. Playlist` — Screen 6)

### What This Screen Does
**Screen 6 (`8. Playlist`)** is where you arrange your video clips into a full show order (Bottom Sequencer Tray) and line up the projected image with your physical house outside using **Dual-Layer Alignment**.

### Crucial Concept: `Global Key Reference` vs. `Individual Clip Offset`
Look at the two big mode cards at the top of the **Left Sidebar**:
* **🔵 `MODE 1: GLOBAL KEY REFERENCE` (Master House Alignment)**:
  * Moves, scales, or keystones **EVERY clip in your entire show at the same time**.
  * *Why this is a lifesaver:* Suppose you have 12 clips in your Halloween show, and tomorrow night your dog bumps your projector tripod by 1 inch. Instead of re-aligning all 12 videos one by one, you select **`GLOBAL KEY REFERENCE`**, nudge the image back onto the bricks once, and **all 12 clips are instantly aligned again!**
* **🟠 `MODE 2: INDIVIDUAL CLIP OFFSET` (Per-Clip Tweak)**:
  * Nudges **ONLY** the single clip currently selected in the bottom playlist tray (in case one specific AI video drifted 3 pixels to the left).

### What the Other Controls Do
* **3 Warp Modes (`Simple 2D`, `4-Corner Pin`, `Bezier Mesh`)**:
  * **`Simple 2D`**: Adjust X/Y Position, Scale %, and Rotation.
  * **`4-Corner Pin (Keystone)`**: Drag the 4 corners of the video independently—essential if your projector is off to the left/right side of the driveway aiming diagonally at the house.
  * **`Bezier Mesh`**: Opens a multi-point curved grid for warping video onto curved surfaces or bay windows.
* **Right Sub-Pixel Nudge Pad**: Click the directional arrows (or press your **keyboard Arrow Keys**) to nudge the projection by `0.1 px`, `1.0 px`, or `5.0 px` while looking at your house.
* **Bottom Sequencer Tray (`Transition Mode` & `Loop Mode`)**:
  * Arrange your clips in order (`#01`, `#02`, `#03`...), choose **`CROSSFADE (1.5s)`** for smooth blending between clips, and set **`LOOP MODE: INFINITE`** so the show loops all evening.

### 👉 Do This Now for Your Sample Show:
1. Click **`8. Playlist`** in the top bar.
2. In the **Bottom Sequencer Tray**, verify our sample clips are queued up (`#01 Ecto-1 Garage`, `#02 Firehouse Tower`, `#03 Slimer Breach`, `#04 Singing Pumpkins`).
3. Set **`TRANSITION`** to **`CROSSFADE (1.5s)`** and **`LOOP`** to **`INFINITE`**.
4. Click the green **`GO TO LIVE SHOWTIME (SCREEN 7) →`** button!

---

## 🚀 Step 9: Running Your Live Show! (`9. Showtime` — Screen 7)

### What This Screen Does
**Screen 7 (`9. Showtime`)** is your live performance console for show night. Everything is oversized and high-contrast so you can operate it easily in the dark.

### What Each Control Does
* **`START LIVE SHOW` / `STOP LIVE SHOW` (Top-Left Giant Button)**: Starts your continuous show loop, syncs the physical projector output window, and changes the top system status badge to **`[Live]`**.
* **Left Live Calibration Overlays**: Need to double-check alignment mid-show? Toggle `Test Grid`, `Alignment Crosshairs`, or `Ref Wireframe` on the fly.
* **Center Live Output Monitor & Playlist Transport**: Shows exactly what is currently projecting on the house, with a countdown timer and a **`SKIP TO NEXT CLIP`** button.
* **Right `MANUAL OVERLAY CUES` (6 DJ-Style Interactive Pads!)**:
  * **`THUNDER & FLASH`** | **`SNOW STORM`** | **`GHOST SCREAM`** | **`STRIKE LASER`** | **`FIREWORKS`** | **`MERRY CHRISTMAS`**
  * Whenever trick-or-treaters or families walk up to your driveway, click any of these 6 pads to fire an **instant live visual + sound effect burst** right on top of the running show!
* **Right Dual Audio Mixer**: Independently control the volume of the **Video Sound FX** and the **Music Overlay Track**.
* **Bottom-Right `MASTER BLACKOUT [ESC]`**: Giant red emergency button that cuts the projector output to solid black immediately.

### 👉 Do This Now for Your Sample Show:
1. On **`9. Showtime` (Screen 7)**, click the giant green **`START LIVE SHOW`** button on the left.
2. In the Right Panel under **`MANUAL OVERLAY CUES`**, click **`THUNDER & FLASH`** and **`FIREWORKS`**—listen to the sound effects and watch the live overlay flash across the firehouse!
3. If you want to see what goes to a real projector, click **`LAUNCH PROJECTOR OUTPUT`** (or **`PREVIEW`**) in the top-right of the Top System Bar!

---

## 🌟 Step 10: Bonus Overview — Smart Yard Automation (`10. Smart Auto`) & `Pro 11–18`

Once you are comfortable with Steps 1–9, here is what the remaining screens unlock whenever you want them:

### `10. Smart Auto` (Screen 9 — Hands-Free Yard Automation)
* **Left Column — Spectator Smartphone QR Portal**: Displays a QR code you can print on a yard sign. Spectators parked outside scan it with their phones to vote on which clip plays next or tap buttons to trigger live effects!
* **Center Column — Solar Dusk-to-Dawn Scheduler & Neighbor Courtesy Mode**: Automatically calculates sunset time for your city to start the show at dusk, lowers volume after 10:00 PM (`Courtesy Mode`), and shuts down at curfew.
* **Right Column — Smart Home MQTT & Driveway Motion Sensor**: Automatically turns off your physical porch lights when the show starts (so they don't wash out your projection!) and triggers a surprise effect when someone walks past a driveway motion sensor.

### Switching to `Pro 11–18` (Top-Left of Navigation Bar)
In the top-left of the dark navigation bar, you will see a toggle for **`[Core 1–10 | Pro 11–18]`**. Clicking **`Pro 11–18`** reveals 8 advanced studio screens for power users:
* **`11. Timeline NLE`**: Multi-track timeline editor for layering video, shaders, singing characters, audio stems, and DMX keyframes down to the millisecond.
* **`12. 3D Relight`**: Generates a 3D depth & normal map from your house photo so virtual 3D spotlights can orbit your house and cast real-time moving shadows behind pillars and window sills.
* **`13. Singing Faces`**: Animates lip-syncing Jack-O-Lanterns, Ghosts, Skeletons, and Santa Claus mapped inside your windows or garage, driven automatically by vocal audio stems.
* **`14. Pixel & DMX`**: Synchronizes physical WLED roof pixel strips, xLights/FPP controllers, DMX moving-head spotlights, and fog machines with your video colors.
* **`15. Shader Forge`**: Real-time GPU physics particles (snowstorms, heavy rain, embers, lava) that physically collide with and pile up on your traced roof and window sills!
* **`16. Optical Calib`**: Uses a webcam or DSLR and projected gray-code stripes to automatically warp your projector to uneven stone or brick walls.
* **`17. Window Portals`**: Set up interior rear-projection window "Hollusion" scrims with 3D parallax room depth and virtual curtains that open and close.
* **`18. Broadcast & Health`**: Configures your **FM Radio Transmitter RDS text** (e.g., *"Tune your car radio to 89.7 FM"*), live decibel sound limits, and outdoor projector rain/temperature safety alerts.

---

## ⌨️ Handy Keyboard Shortcuts Reference

| Shortcut Key | Action | Where It Works |
| :--- | :--- | :--- |
| **`ESC`** | Toggle **Master Blackout** (Cuts projector to solid black) | All Screens |
| **`Ctrl + S`** | Save Current Project | All Screens |
| **`Alt + Left Arrow`** | Go Back to Previous Screen | All Screens |
| **`Alt + 1` … `Alt + 0`** | Jump instantly to Core Screens 1 through 10 | All Screens |
| **`V` / `P` / `R` / `A`** | Select, Pen, Rectangle, Arch Vector Tools | `4. Vectors` (Screen 2) |
| **`Arrow Keys`** | Sub-pixel alignment nudge (`0.1px` / `1px` / `5px`) | `8. Playlist` (Screen 6) |
| **`F` or `F11`** | Toggle Fullscreen on the Projector Output Window | Projector Output Window |
| **`?` (`Shift + /`)** | Open Keyboard Shortcuts & Hotkeys Guide | All Screens |
