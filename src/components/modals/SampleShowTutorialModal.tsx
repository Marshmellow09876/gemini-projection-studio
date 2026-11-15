import React, { useState } from 'react';
import {
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Play,
  Maximize2,
  Minimize2,
  X,
  BookOpen,
  Lightbulb,
  Compass,
  Wand2,
  HelpCircle,
  Layers,
  Projector,
  Camera,
  Video,
  Paintbrush,
  Music,
  Sliders,
  Radio,
} from 'lucide-react';
import {
  AUSTIN_HOUSE_ASSETS,
  AUDIO_OVERLAY_TRACKS,
  ScreenId,
  useProjectionStore,
} from '../../store/useProjectionStore';
import { playManualCueSound } from '../../utils/soundEffects';

export interface TutorialStepDefinition {
  stepNumber: number;
  screenId: ScreenId;
  studioMode: 'core' | 'pro';
  navBadge: string;
  title: string;
  subtitle: string;
  plainEnglishSummary: string;
  whyThisMatters: string;
  whatEachThingDoes: Array<{
    controlName: string;
    location: string;
    explanation: string;
  }>;
  tryItSteps: string[];
  autoDemoButtonLabel: string;
  autoDemoDescription: string;
  proTip: string;
}

export const SAMPLE_SHOW_TUTORIAL_STEPS: TutorialStepDefinition[] = [
  {
    stepNumber: 1,
    screenId: 1,
    studioMode: 'core',
    navBadge: '1. Home (Screen 1)',
    title: 'Welcome! Creating Our Sample Show Project',
    subtitle: 'Understanding the Project Hub, Top System Bar & Output Monitor',
    plainEnglishSummary:
      'Projection mapping turns the front of a real house into a giant 3D animated movie screen. Instead of shining a flat rectangle onto your house (which blinds people through windows and spills into the night sky), LUMEN-MAP AI wraps custom animations around every brick, pillar, roof peak, and garage door. Screen 1 is your "Mission Control" where you start or load a show and monitor your hardware.',
    whyThisMatters:
      'Before drawing masks or generating AI animations, we initialize a project container (.lumen file) that holds your house reference photo, architectural outlines, AI video clips, and projector alignment settings together.',
    whatEachThingDoes: [
      {
        controlName: 'Top System Bar & [SAVE] Button',
        location: 'Very top bar (always visible on every screen)',
        explanation:
          'Shows your active project name, whether changes are [Saved] or [Unsaved*], GPU/VRAM health meters, and the green SAVE button (Ctrl+S).',
      },
      {
        controlName: 'LAUNCH PROJECTOR OUTPUT Button',
        location: 'Top-right of the System Bar',
        explanation:
          'Opens a clean, borderless fullscreen window (/?projector=true) that you drag onto your physical HDMI projector display. Everything you align in the studio updates live on that window!',
      },
      {
        controlName: 'MASTER BLACKOUT [ESC] Panic Button',
        location: 'Keyboard ESC key or Bottom-Right Red Button',
        explanation:
          'Emergency kill-switch! Pressing ESC on any screen immediately turns all physical projector outputs solid black (0 IRE)—handy if a neighbor walks in front of the beam or a car pulls into the driveway.',
      },
      {
        controlName: '+ NEW HOUSE MAPPING PROJECT',
        location: 'Left Primary Sidebar (Blue Button)',
        explanation:
          'Creates a fresh show from either your own house photo or one of our 4 bundled sample templates (like the Ghostbusters Firehouse).',
      },
      {
        controlName: 'Right Quick-Output Monitor',
        location: 'Right Sidebar on Screen 1',
        explanation:
          'Lets you preview your house in WIREFRAME mode (just the neon vector outlines) or LIVE VIDEO mode, plus toggle hardware calibration test patterns.',
      },
    ],
    tryItSteps: [
      'Look at the Center Recent Projects Grid—hover over "Ghostbusters Firehouse & Ecto-1" to see its live video preview.',
      'In the Right Quick-Output Monitor, toggle between [WIREFRAME] and [LIVE VIDEO] to see how structural masks sit on top of the video.',
      'Click the purple "⚡ Auto-Demo Step 1" button below (or click "+ NEW HOUSE MAPPING PROJECT" on the left) to initialize our "My First Firehouse Sample Show"!',
    ],
    autoDemoButtonLabel: '⚡ Auto-Demo Step 1: Load "My First Firehouse Sample Show"',
    autoDemoDescription:
      'Initializes a clean sample project using the Ghostbusters Firehouse facade photo and pre-loads the starter show assets.',
    proTip:
      'Press the "?" key on your keyboard anytime to pop up the Studio Keyboard Shortcuts & Hotkeys cheat-sheet!',
  },
  {
    stepNumber: 2,
    screenId: 8,
    studioMode: 'core',
    navBadge: '2. Projectors (Screen 8)',
    title: 'Hardware Setup, Throw Optics & Edge Blending',
    subtitle: 'Connecting Physical Projectors & Calculating Yard Distance',
    plainEnglishSummary:
      'Before mapping a house, you need to know how your projector(s) cover the building. A single projector ("1x1 Single") is great for most homes, while wider mansions use two or more projectors side-by-side ("1x2 Horizontal") with Soft-Edge Blending so their overlapping middle seam disappears.',
    whyThisMatters:
      'If two projectors overlap by 15% in the middle of your house without Edge Blending, that overlap strip will be twice as bright as the rest of the wall. Screen 8 mathematically feathers (fades) the overlapping edges using an S-Curve so it looks like one giant projector.',
    whatEachThingDoes: [
      {
        controlName: 'Array Topology Bar (1x2 Horizontal, 2x1 Vertical, etc.)',
        location: 'Top Toolbar of Screen 8',
        explanation:
          'Tells LUMEN-MAP AI how your physical projectors are arranged in your yard (side-by-side for wide houses, stacked vertically for tall towers, or Luminance Stack for double brightness).',
      },
      {
        controlName: 'Combined Multi-Projector Canvas & Seam Zone',
        location: 'Center Viewport',
        explanation:
          'Shows Projector 1 (Blue) and Projector 2 (Cyan) over your house. The shaded purple strip in the middle is the "Overlap Seam Zone" where both projectors blend together.',
      },
      {
        controlName: 'Soft-Edge Blending & Gamma Sliders',
        location: 'Right Inspector Panel',
        explanation:
          'Controls the S-Curve roll-off and Gamma (1.8–2.2) inside the overlap zone so the seam between projectors is completely invisible to the human eye.',
      },
      {
        controlName: 'Optics Calculator Button',
        location: 'Top System Bar ("Optics Calc" icon)',
        explanation:
          'Calculates exactly how many feet back in your yard to place your projector based on its Throw Ratio (e.g., 0.8:1 short-throw vs. 1.5:1 standard) and checks if your ANSI Lumens are bright enough.',
      },
    ],
    tryItSteps: [
      'Click on "PROJECTOR 1" or "PROJECTOR 2" in the Left Hardware Inventory to inspect its resolution, throw ratio, and corner pins.',
      'Click the "FLASH IDENTIFY" button on a projector card to see how the studio flashes a giant ID number on that physical projector.',
      'Click "⚡ Auto-Demo Step 2" below to calibrate a 15% Raised-Cosine S-Curve blend and flash-identify Projector 1!',
    ],
    autoDemoButtonLabel: '⚡ Auto-Demo Step 2: Calibrate Projector Array & Flash ID',
    autoDemoDescription:
      'Enables Soft-Edge Blending with a Raised Cosine S-Curve at 2.20 Gamma and flashes Projector 1 for identification.',
    proTip:
      'Only using 1 projector? You don\'t need to worry about Edge Blending—just plug in your HDMI cable and click "LAUNCH PROJECTOR OUTPUT" in the top bar!',
  },
  {
    stepNumber: 3,
    screenId: 3,
    studioMode: 'core',
    navBadge: '3. Photo CV (Screen 3)',
    title: 'Turning a House Photo into Smart Outlines',
    subtitle: 'Perspective Correction & Computer Vision Auto-Segmentation',
    plainEnglishSummary:
      'How does the software know where your roof, bricks, pillars, and windows are? You take a daytime photo of your house from the EXACT spot in the yard where your projector sits, load it into Screen 3, and let our Computer Vision (CV) detector automatically trace the building\'s edges into editable shapes!',
    whyThisMatters:
      'Camera lenses often tilt upward when photographing a house from the driveway, making the top of the house look narrower than the bottom ("keystone distortion"). Screen 3 fixes that perspective and automatically finds the architectural zones.',
    whatEachThingDoes: [
      {
        controlName: 'Source Photo & 4-Point Green Perspective Cage',
        location: 'Left Square Viewport',
        explanation:
          'Drag the 4 green corner pins (C1, C2, C3, C4) to line up with the outer corners of your facade. This computes a 3x3 Homography Matrix that flattens lens tilt.',
      },
      {
        controlName: 'AUTO-DETECT HOUSE STRUCTURE Button',
        location: 'Top Toolbar (Blue Magic Wand Button)',
        explanation:
          'Runs Canny/HED computer vision edge detection over your house photo to automatically locate the roofline, walls, garage bay, pillars, and windows.',
      },
      {
        controlName: 'Extracted Layout Preview (Neon Polygons)',
        location: 'Right Square Viewport',
        explanation:
          'Displays the glowing vector polygons extracted from your photo. Use the "OVERLAY BLEND" slider below it to crossfade between the raw photo and the traced neon shapes.',
      },
      {
        controlName: 'Edge Sensitivity & Auto-Mask Windows',
        location: 'Right Parameter Sidebar',
        explanation:
          'Fine-tunes how many architectural details are picked up. Checking "AUTO-MASK WINDOWS & SKY" automatically marks windows so projector light won\'t shine into bedrooms!',
      },
      {
        controlName: 'CONVERT TO EDITABLE LAYOUT Button',
        location: 'Bottom of Right Sidebar (Green Button)',
        explanation:
          'Sends all extracted polygons over to Screen 2 (Vector Layout Editor) as organized, editable layers.',
      },
    ],
    tryItSteps: [
      'Notice the 4 bundled house photos in the top bar ("V1: Ecto-1 Garage" through "V4: Slimer Breach")—or drag-and-drop your own photo.',
      'Slide the "OVERLAY BLEND" slider below the dual viewports to see how the neon polygons match the real brick firehouse.',
      'Click "⚡ Auto-Demo Step 3" below to run the Computer Vision scan on our Ghostbusters Firehouse photo!',
    ],
    autoDemoButtonLabel: '⚡ Auto-Demo Step 3: Run CV Auto-Detect on Firehouse Photo',
    autoDemoDescription:
      'Loads the Firehouse reference photo, sets optimal edge sensitivity (78%), enables Auto-Mask Windows & Sky, and extracts 14 architectural zones.',
    proTip:
      'Golden Rule of Projection Mapping: Always take your reference photo with your camera lens held right next to your projector lens so their perspectives match!',
  },
  {
    stepNumber: 4,
    screenId: 2,
    studioMode: 'core',
    navBadge: '4. Vectors (Screen 2)',
    title: 'Refining Vector Surfaces & Blackout Masks',
    subtitle: 'Understanding Active Surfaces, Hard Blackouts & Guide Lines',
    plainEnglishSummary:
      'Screen 2 is your precision 2D Vector Drawing Studio (like Illustrator or Photoshop, built specifically for houses). Here, every part of your house is organized into layers (Roofline, Main Walls, Garage, Pillars, Windows, Blackout Masks) and assigned a specific "Mask Role".',
    whyThisMatters:
      'Not every part of your house should be treated the same! You want bright animations on the brick walls, ZERO light shining into dark glass windows or the night sky, and crisp glowing highlights along the roof trim.',
    whatEachThingDoes: [
      {
        controlName: 'Vector Drawing Toolbar (Select V, Pen P, Rect R, Arch A)',
        location: 'Top Toolbar',
        explanation:
          'Lets you click and drag individual corner vertices (V), draw custom multi-point polygons (P), trace rectangular windows (R), or curve arched doorways (A).',
      },
      {
        controlName: 'Left Surface & Mask Hierarchy Layer Tree',
        location: 'Left Sidebar',
        explanation:
          'Organizes your house into folders (Roofline, Garage, Pillars, Main Walls, Windows, Blackout Masks). Click the Eye icon to hide/show a layer, or the Padlock to lock it.',
      },
      {
        controlName: 'The 3 Mask Roles (Crucial Concept!)',
        location: 'Left Sidebar Role Drawer & Right Inspector',
        explanation:
          '1) ACTIVE PROJECTION SURFACE: Normal surfaces (walls, garage) where AI video plays.\n2) HARD BLACKOUT CUTOUT: Forces solid black (0% light) over glass windows, bushes, or the sky.\n3) STRUCTURAL GUIDE LINE: Tells the AI generator where roof peaks and trim lines are so animations wrap around them.',
      },
      {
        controlName: 'LIVE TRACE ON HOUSE Toggle',
        location: 'Top-Right of Center Canvas',
        explanation:
          'Shines your mouse cursor and glowing vector lines through the real projector onto your physical house outside so you can drag points while looking at the real bricks!',
      },
      {
        controlName: 'Edge Feathering & Outline Glow Sliders',
        location: 'Right Surface Inspector',
        explanation:
          'Edge Feathering softens the border of a mask so it doesn\'t look jagged; Outline Glow adds a neon architectural laser trace along the edges.',
      },
    ],
    tryItSteps: [
      'Click on different layers in the Left Sidebar (e.g., "Upper Arch Windows" or "Main Brick Facade") to see their vertices highlight on the canvas.',
      'Look at the Right Inspector Panel—try adjusting the "Edge Feathering" or "Outline Glow Width" slider for the selected layer.',
      'Click "⚡ Auto-Demo Step 4" below to configure our Firehouse layers, enable Live Trace, and prepare the ControlNet wireframe!',
    ],
    autoDemoButtonLabel: '⚡ Auto-Demo Step 4: Polish Layers & Prep ControlNet Wireframe',
    autoDemoDescription:
      'Selects the Main Facade layer, sets crisp edge feathering (6px) and neon outline glow (4px), and prepares the layout for the AI Studio.',
    proTip:
      'Have a painted beige, brick-red, or yellow house? Click "Wall Color Neutralizer" in the Right Inspector to mathematically cancel out your wall paint tint so whites look pure white!',
  },
  {
    stepNumber: 5,
    screenId: 4,
    studioMode: 'core',
    navBadge: '5. AI Studio (Screen 4)',
    title: 'Generating Perspective-Locked AI House Videos',
    subtitle: 'How ControlNet Wireframes & Hard Camera Lock Keep Videos Glued to Your Bricks',
    plainEnglishSummary:
      'If you ask a normal AI video generator for "a haunted firehouse with Slimer," it will invent a random building and pan the camera around—which completely ruins projection mapping because the windows in the video won\'t line up with the real windows on your house! Screen 4 solves this using ControlNet Wireframe Conditioning and Hard Camera Lock.',
    whyThisMatters:
      'By feeding your exact vector layout from Screen 2 into the AI\'s ControlNet conditioning pipeline with Structure Adherence set high (0.85+), the AI is forced to grow supernatural effects, gingerbread frosting, or laser beams directly onto YOUR exact windows, pillars, and roofline without moving the camera!',
    whatEachThingDoes: [
      {
        controlName: 'Aligned House Photo & ControlNet Wireframe Squares',
        location: 'Left Structural Lock Panel',
        explanation:
          'Shows the two "anchors" sent to the AI: your real house photo (for lighting/shadow reference) and your black-and-white vector wireframe (which locks every architectural edge in place).',
      },
      {
        controlName: 'Structure Adherence Slider (0.00 to 1.00)',
        location: 'Left Panel',
        explanation:
          'Controls how strictly the AI must obey your house lines. Keep this between 0.80 and 0.95 so windows and roof peaks never drift!',
      },
      {
        controlName: 'Positive Prompt, Negative Prompt & Quick Theme Presets',
        location: 'Center Prompt & Theme Engine',
        explanation:
          'Describe the visual transformation you want (or click a 1-click preset like "Haunted Manor", "Cyberpunk Neon", "Gingerbread House", or "Ice Palace", or roll the Holiday Prompt Dice!).',
      },
      {
        controlName: 'HARD CAMERA LOCK [ON] Toggle',
        location: 'Bottom of Center Panel',
        explanation:
          'CRITICAL: Freezes the virtual AI camera matrix to zero pan/tilt/zoom so the generated video stays 100% locked to your physical projector perspective.',
      },
      {
        controlName: 'Ghost Wireframe Overlay & Approve to Playlist',
        location: 'Right Render & Preview Panel',
        explanation:
          'Superimposes your cyan house outlines on top of the generated video so you can verify every window lines up before clicking "Approve & Save to Playlist".',
      },
    ],
    tryItSteps: [
      'In the Center Panel, click one of the Quick Theme Presets (or click the "🎲 Halloween / Christmas Prompt Generator" buttons) to see how architectural prompts are structured.',
      'In the Right Panel, toggle "Ghost Wireframe Overlay" ON over the video preview to see how the neon lines hug the building.',
      'Click "⚡ Auto-Demo Step 5" below to lock the camera, load the Ghostbusters Slimer Breach prompt, and generate our sample clip!',
    ],
    autoDemoButtonLabel: '⚡ Auto-Demo Step 5: Configure ControlNet & Generate Sample Video',
    autoDemoDescription:
      'Locks Hard Camera Lock [ON], sets Structure Adherence to 0.90, loads the Ghostbusters Slimer Ectoplasm prompt, turns on the Ghost Wireframe check, and triggers a sample render.',
    proTip:
      'Want to connect cloud AI engines (Fal.ai, Replicate, RunwayML) or a local ComfyUI GPU server? Click the "AI: [PROVIDER]" button in the top bar anytime!',
  },
  {
    stepNumber: 6,
    screenId: 5,
    studioMode: 'core',
    navBadge: '6. Repair (Screen 5)',
    title: 'Fixing Local Glitches with AI Regional Inpainting',
    subtitle: 'Repairing a Single Window or Garage Door Without Losing the Rest of the Clip',
    plainEnglishSummary:
      'Sometimes an AI video looks 95% incredible, but the AI accidentally drew an extra window on your garage door or made one pillar flicker. Instead of throwing away the whole video and re-rolling from scratch, Screen 5 lets you paint a red mask over JUST the problem spot and regenerate only that region!',
    whyThisMatters:
      'Regional Inpainting and Structural Re-Anchoring save hours of rendering time and keep the rest of your clip pixel-identical.',
    whatEachThingDoes: [
      {
        controlName: '3 Repair Mode Tabs (Top Left)',
        location: 'Top Toolbar',
        explanation:
          '1) PROMPT DELTA & RE-ROLL: Tweaks the global prompt while keeping the same random seed.\n2) REGIONAL INPAINTING: Regenerates only the red painted mask area.\n3) STRUCTURAL RE-ANCHOR: Forces a drifting wall or window back onto its original house photo lines.',
      },
      {
        controlName: 'Masking Tools (Paint Brush, Lasso, Select From Layout Mask)',
        location: 'Top Masking Toolbar',
        explanation:
          'Paint directly on the video canvas with the red brush, or click "SELECT FROM LAYOUT MASK" to automatically select an entire architectural layer (like "Garage Door" or "Windows") with one click!',
      },
      {
        controlName: 'Interactive Before / After Split-Screen Wipe',
        location: 'Center Viewport',
        explanation:
          'Drag the vertical cyan divider bar left and right across the video to compare the "BEFORE (Original + Red Mask)" side against the "AFTER (Repaired Preview)" side.',
      },
      {
        controlName: 'Temporal Consistency Lock & Change Strength',
        location: 'Right Repair Inspector',
        explanation:
          'Temporal Consistency ensures the repaired patch doesn\'t flicker from frame to frame; Change Strength controls how drastically the painted area changes.',
      },
    ],
    tryItSteps: [
      'Try dragging your mouse across the "BEFORE" side of the center video canvas to paint a red inpainting mask.',
      'Drag the vertical "BEFORE / AFTER" split-screen wipe handle left and right to compare the two sides.',
      'Click "⚡ Auto-Demo Step 6" below to paint a sample repair mask over the garage zone and run a repair preview!',
    ],
    autoDemoButtonLabel: '⚡ Auto-Demo Step 6: Paint Repair Mask & Run Regional Inpaint',
    autoDemoDescription:
      'Switches to Regional Inpainting mode, paints a targeted repair mask over the center garage bay, sets a repair prompt, and renders the repaired preview.',
    proTip:
      'Always keep "Feather" around 10px–16px when inpainting so the edges of your repaired patch blend invisibly into the surrounding video!',
  },
  {
    stepNumber: 7,
    screenId: 10,
    studioMode: 'core',
    navBadge: '7. Music Sync (Screen 10)',
    title: 'Synchronizing Beats & Audio-Reactive Layers',
    subtitle: 'Making Roofs, Pillars & Windows Flash and Pulse to Your Music Track',
    plainEnglishSummary:
      'A silent light show is only half the magic! Screen 10 analyzes the music track of your show, automatically places beat markers on drum hits and bass drops, and lets you bind specific parts of your house (like the Roofline or Pillars) to pulse, flash, or color-shift in real time with the music.',
    whyThisMatters:
      'Instead of keyframing every single drum beat by hand over a 3-minute song, the Audio-Reactive Engine splits the sound into Bass, Mids, and Highs and drives your architectural layers automatically at 60 FPS.',
    whatEachThingDoes: [
      {
        controlName: 'Audio Track Selector & AUTO-DETECT BEATS Button',
        location: 'Top Toolbar of Screen 10',
        explanation:
          'Choose from bundled Halloween/Christmas show tracks (or upload your own MP3/WAV) and click "AUTO-DETECT BEATS" to automatically populate the timeline with beat flags.',
      },
      {
        controlName: 'Interactive Waveform & Beat Flag Timeline',
        location: 'Center Bottom Panel',
        explanation:
          'Shows the audio waveform with colored Beat Flags (Bass Drop, Chorus Hit, Strobe Burst). Click anywhere on the waveform to drop a custom cue flag or press "T" in Tap Tempo mode!',
      },
      {
        controlName: 'Per-Layer Audio-Reactive Matrix',
        location: 'Right Sidebar',
        explanation:
          'Select any house layer (e.g., "Roofline" or "Windows"), toggle "Audio Reactive [ON]", pick which frequency band triggers it (Bass, Mids, Highs), and choose an effect (Pulse, Flash, Color-Shift, Strobe).',
      },
      {
        controlName: 'AI 4-Stem Audio Separator ("Stems" Button)',
        location: 'Top Toolbar / Top System Bar',
        explanation:
          'Opens the AI Stem Splitter to isolate Vocals (for singing faces), Drums (for roofline strobes), Bass (for wall pulses), and Melody!',
      },
    ],
    tryItSteps: [
      'Look at the Right Sidebar ("Per-Layer Audio-Reactive Matrix")—see how each architectural layer can have its own neon tint color and frequency band (Bass, Mids, Highs).',
      'Click "AUTO-DETECT BEATS" in the top bar to watch the engine scan the music waveform and place colored beat flags.',
      'Click "⚡ Auto-Demo Step 7" below to auto-detect beat flags and make the Roofline & Pillars audio-reactive to the Bass band!',
    ],
    autoDemoButtonLabel: '⚡ Auto-Demo Step 7: Auto-Detect Beats & Arm Audio-Reactive Roof',
    autoDemoDescription:
      'Runs automatic beat detection on the show soundtrack, sets Audio-Reactive Master Gain to 90%, and binds the Roofline and Pillars to pulse with Bass hits.',
    proTip:
      'Use "Bass" triggers on large structural lines (Roofline/Pillars) and "Highs" or "Mids" on smaller detail layers (Windows/Arches) for a balanced professional light show!',
  },
  {
    stepNumber: 8,
    screenId: 6,
    studioMode: 'core',
    navBadge: '8. Playlist (Screen 6)',
    title: 'Sequencing Your Playlist & Dual-Layer Alignment',
    subtitle: 'Understanding Global Key Reference vs. Per-Clip Offset & Keystone Warping',
    plainEnglishSummary:
      'Now that we have awesome AI clips, Screen 6 is where you arrange them into a continuous show playlist (Bottom Sequencer Tray) and do your final physical alignment on the real house using our Dual-Layer Alignment system.',
    whyThisMatters:
      'Imagine you have 10 video clips in your show, and someone accidentally bumps your projector tripod in the yard by 2 inches. In other software, you would have to re-align all 10 clips one by one! In LUMEN-MAP AI, you simply adjust the "GLOBAL KEY REFERENCE" once, and every clip in your entire playlist moves together automatically!',
    whatEachThingDoes: [
      {
        controlName: 'Mode 1: GLOBAL KEY REFERENCE vs. Mode 2: INDIVIDUAL CLIP OFFSET',
        location: 'Left Calibration Panel (Top Toggle Cards)',
        explanation:
          '• GLOBAL KEY REFERENCE: Moves, scales, or rotates the ENTIRE show at once (use this when setting up your projector each night).\n• INDIVIDUAL CLIP OFFSET: Nudges ONLY the currently selected video clip without affecting any other clips in the playlist.',
      },
      {
        controlName: '3 Warp Modes (Simple 2D, 4-Corner Keystone Pin, Bezier Mesh)',
        location: 'Top Calibration Bar & Left Panel',
        explanation:
          '• Simple: X/Y Position, Scale, Rotation.\n• 4-Corner Pin: Drag the 4 corners independently to fix diagonal projector angles.\n• Bezier Mesh: Opens a multi-point curved grid for warping around turrets or uneven stonework.',
      },
      {
        controlName: 'Center Interactive Alignment Viewport & Nudge Pad',
        location: 'Center Canvas & Right Inspector',
        explanation:
          'Drag the video directly on the canvas or use the directional arrow buttons (or keyboard Arrow Keys) at 0.1px, 1px, or 5px precision to lock the image onto your physical bricks.',
      },
      {
        controlName: 'Bottom Show Playlist Sequencer Tray',
        location: 'Bottom Panel',
        explanation:
          'Order your clips (1, 2, 3...), set Transition Mode ("CROSSFADE 1.5s", "HARD CUT", "DIP TO BLACK"), and set Loop Mode ("INFINITE" for all-night holiday loops).',
      },
    ],
    tryItSteps: [
      'Look at the Bottom Sequencer Tray—click through Clips #1, #2, and #3 to see each scene in our sample show.',
      'In the Left Panel, notice the difference between "MODE 1: GLOBAL KEY REFERENCE" (Cyan) and "MODE 2: INDIVIDUAL CLIP OFFSET" (Amber).',
      'Click "⚡ Auto-Demo Step 8" below to set a smooth 1.5s Crossfade, Infinite Loop, and turn on Blackout Mask enforcement!',
    ],
    autoDemoButtonLabel: '⚡ Auto-Demo Step 8: Lock Global Alignment & Queue 3-Clip Show',
    autoDemoDescription:
      'Configures 1.5s Crossfade transitions, sets Infinite Loop mode, enables Blackout Mask enforcement, and locks the Global Key Reference.',
    proTip:
      'Use your keyboard Arrow Keys on Screen 6 while looking outside at your house to nudge the alignment 1 pixel at a time until the window frames lock in!',
  },
  {
    stepNumber: 9,
    screenId: 7,
    studioMode: 'core',
    navBadge: '9. Showtime (Screen 7)',
    title: 'Showtime! Running Your Live Projection Show',
    subtitle: 'Live Playback Deck, Instant Manual FX Cue Pads & Safety Telemetry',
    plainEnglishSummary:
      'Congratulations—your sample show is ready for an audience! Screen 7 is your dedicated "Live Showtime Performance Deck" designed for dark show nights. It features oversized, high-contrast controls, live audio mixing, hardware telemetry, and 6 instant interactive Manual Cue Pads.',
    whyThisMatters:
      'When families and kids walk up to your driveway to watch the house, you can press the Manual Cue Pads (like "THUNDER & FLASH", "GHOST SCREAM", or "FIREWORKS") to trigger instant visual and sound effects right on top of the running show!',
    whatEachThingDoes: [
      {
        controlName: 'START LIVE SHOW / STOP LIVE SHOW Master Button',
        location: 'Left Panel (Top Giant Green/Red Button)',
        explanation:
          'Engages live continuous playback across your playlist, switches the top system badge to [Live], and dispatches the synchronized feed to your projector output.',
      },
      {
        controlName: 'Live Calibration Overlay Toggles',
        location: 'Left Panel',
        explanation:
          'Lets you quickly flash the Test Grid, Alignment Crosshairs, or Reference Wireframe if you need to check alignment mid-show.',
      },
      {
        controlName: '6 Manual Overlay Cue Pads (DJ-Style FX Triggers)',
        location: 'Right Panel ("MANUAL OVERLAY CUES")',
        explanation:
          'Click any pad (THUNDER & FLASH, SNOW STORM, GHOST SCREAM, STRIKE LASER, FIREWORKS, MERRY CHRISTMAS) to fire a real-time audiovisual burst over the house!',
      },
      {
        controlName: 'Dual Audio Mixer (Video Sound + Music Overlay)',
        location: 'Right Panel',
        explanation:
          'Independently mix the volume of your video clips\' native sound effects against the background music soundtrack.',
      },
      {
        controlName: 'MASTER BLACKOUT [ESC] Emergency Button',
        location: 'Bottom Right (Giant Red Bar)',
        explanation:
          'Instantly zeroes out the projector beam to solid black if needed.',
      },
    ],
    tryItSteps: [
      'Click the big green "START LIVE SHOW" button on the Left Panel (or click "⚡ Auto-Demo Step 9" below).',
      'Click the "THUNDER & FLASH" or "FIREWORKS" Manual Cue Pad on the Right Panel—listen to the synthesized sound effect and watch the live overlay on the house!',
      'Watch the Live Telemetry & Event Log at the bottom right record every cue and frame-rate status.',
    ],
    autoDemoButtonLabel: '⚡ Auto-Demo Step 9: Start Live Show & Trigger Thunder FX!',
    autoDemoDescription:
      'Starts Live Showtime playback, unmutes the show audio mixer, and triggers a live "THUNDER & FLASH" audiovisual cue across the house!',
    proTip:
      'Ready to send your show to your real projector? Click "LAUNCH PROJECTOR OUTPUT" in the very top system bar and press F11 on that window to make it fullscreen!',
  },
  {
    stepNumber: 10,
    screenId: 9,
    studioMode: 'core',
    navBadge: '10. Smart Auto & Pro (Screens 9–18)',
    title: 'Graduation: Smart Automation & Pro Studio 11–18',
    subtitle: 'Driveway QR Voting, Dusk-to-Dawn Scheduling & The Pro Expansion Suite',
    plainEnglishSummary:
      'You\'ve mastered the complete core workflow (Screens 1 through 9)! As your shows grow, Screen 9 lets you automate your yard so the show starts itself at sunset, lowers the volume after 10 PM for your neighbors, and lets spectators on the sidewalk scan a QR code on their phones to vote on which song plays next!',
    whyThisMatters:
      'Notice the [Core 1–10 | Pro 11–18] toggle switch in the top-left of the navigation bar? Whenever you want advanced Hollywood-grade visual effects, flipping to "Pro 11–18" unlocks 8 specialized studio labs.',
    whatEachThingDoes: [
      {
        controlName: 'Audience QR Voting & Sidewalk Triggers (Screen 9 Left)',
        location: 'Screen 9 Left Column',
        explanation:
          'Generates a live smartphone web portal (QR code) so cars parked outside can vote on the next theme or tap buttons to launch digital snowballs at the house.',
      },
      {
        controlName: 'Solar Dusk-to-Dawn Scheduler & Courtesy Mode (Screen 9 Center)',
        location: 'Screen 9 Center Column',
        explanation:
          'Automatically calculates sunset/sunrise for your city to start and stop the projectors hands-free, and reduces audio volume after curfew.',
      },
      {
        controlName: 'Smart Home / MQTT & Sidewalk Motion Sensor (Screen 9 Right)',
        location: 'Screen 9 Right Column',
        explanation:
          'Turns off your physical porch lights via Home Assistant/MQTT when the show starts (so they don\'t wash out the projector!) and triggers a jump-scare when a trick-or-treater trips the driveway PIR sensor.',
      },
      {
        controlName: 'Pro Studio Mode (Screens 11–18 Switch in Top Bar)',
        location: 'Top Navigation Bar ([Core 1–10 | Pro 11–18])',
        explanation:
          '• 11. Timeline NLE: Multi-track video/audio/DMX timeline editor.\n• 12. 3D Relight: Virtual 3D spotlights casting real-time shadows across your bricks.\n• 13. Singing Faces: Lip-syncing pumpkins, ghosts & Santa driven by vocal stems.\n• 14. Pixel & DMX: Sync WLED roof strips, xLights & moving heads with your video.\n• 15. Shader Forge: Snow/rain/lava particles that bounce off your roof vectors.\n• 16. Optical Calib: Webcam structured-light auto-warping & lens calculator.\n• 17. Window Portals: Rear-projection window Hollusions & yard props.\n• 18. Broadcast & Health: FM Radio RDS sign (e.g. 89.7 FM) & weather safety.',
      },
    ],
    tryItSteps: [
      'On Screen 9, click "SIMULATE SIDEWALK MOTION" in the Right Column to see how a trick-or-treater walking up the driveway triggers an automated cue.',
      'Look at the top-left of the navigation bar and click "Pro 11–18" to peek at the 8 advanced Pro Studio screens whenever you feel ready to explore!',
      'Click "⚡ Auto-Demo Step 10" below to enable the Dusk-to-Dawn Scheduler, Audience QR Portal, and simulate a live spectator vote!',
    ],
    autoDemoButtonLabel: '⚡ Auto-Demo Step 10: Enable Smart Yard & Simulate Spectator Vote',
    autoDemoDescription:
      'Turns on the Audience QR Portal, casts a live spectator vote, enables the Dusk-to-Dawn Solar Scheduler, and saves your finished sample show!',
    proTip:
      'You can reopen this Interactive Sample Show Walkthrough anytime by clicking the "🎓 Tutorial" button in the top system bar!',
  },
];

export const SampleShowTutorialModal: React.FC = () => {
  const {
    isTutorialWalkthroughOpen,
    tutorialWalkthroughStep,
    setIsTutorialWalkthroughOpen,
    setTutorialWalkthroughStep,
    setActiveScreen,
    setActiveStudioMode,
    createNewHouseMappingProject,
    setEdgeBlendParams,
    flashIdentifyProjector,
    setPhotoToLayoutParams,
    runAutoDetectHouseStructure,
    updateLayer,
    layers,
    setVectorToolbar,
    setAiStudioParams,
    generateAiVideo,
    setRepairParams,
    addBrushStroke,
    renderRepairPreview,
    autoDetectBeatsAndFlags,
    setAudioReactiveMasterGain,
    updateLayerColorModifier,
    setCalibrationParams,
    updateGlobalKeyReference,
    setLiveShowParams,
    triggerManualOverlayCue,
    toggleAudiencePortal,
    castAudienceVote,
    toggleDuskToDawnScheduler,
    saveCurrentProject,
    showToast,
  } = useProjectionStore();

  // View mode: 'coach' (docked interactive panel so user can see & click the real app behind it)
  // vs 'expanded' (full centered educational guide modal)
  const [viewMode, setViewMode] = useState<'coach' | 'expanded'>('coach');
  const [minimized, setMinimized] = useState<boolean>(false);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [activeTab, setActiveTab] = useState<'walkthrough' | 'glossary'>('walkthrough');

  if (!isTutorialWalkthroughOpen) return null;

  const safeStepIndex = Math.max(
    0,
    Math.min(SAMPLE_SHOW_TUTORIAL_STEPS.length - 1, tutorialWalkthroughStep)
  );
  const currentStep = SAMPLE_SHOW_TUTORIAL_STEPS[safeStepIndex];

  const goToStep = (index: number) => {
    const clamped = Math.max(
      0,
      Math.min(SAMPLE_SHOW_TUTORIAL_STEPS.length - 1, index)
    );
    const target = SAMPLE_SHOW_TUTORIAL_STEPS[clamped];
    setTutorialWalkthroughStep(clamped);
    setActiveStudioMode(target.studioMode);
    setActiveScreen(target.screenId);
  };

  const handleRunStepAutoDemo = () => {
    const stepNum = currentStep.stepNumber;
    // Ensure we are on the target screen first
    setActiveStudioMode(currentStep.studioMode);
    setActiveScreen(currentStep.screenId);

    switch (stepNum) {
      case 1: {
        createNewHouseMappingProject(
          'My First Firehouse Sample Show',
          AUSTIN_HOUSE_ASSETS.photos.v1EctoOpenGarage,
          AUSTIN_HOUSE_ASSETS.videos.v1Show
        );
        // Stay on Screen 1 so user sees the project loaded on Home Dashboard
        setActiveScreen(1);
        showToast(
          'Step 1 Demo Complete: Initialized "My First Firehouse Sample Show"!'
        );
        break;
      }
      case 2: {
        setEdgeBlendParams({
          enableSoftEdgeBlending: true,
          blendCurve: 'Raised Cosine / S-Curve',
          blendGamma: 2.2,
          featherInsetPx: 24,
          sendCalibrationGridToAll: true,
        });
        flashIdentifyProjector('proj-1');
        showToast(
          'Step 2 Demo Complete: Calibrated S-Curve Edge Blend & Flashed Projector 1!'
        );
        break;
      }
      case 3: {
        setPhotoToLayoutParams({
          customReferencePhotoUrl: AUSTIN_HOUSE_ASSETS.photos.v1EctoOpenGarage,
          edgeSensitivity: 78,
          lineSimplification: 32,
          shadowContrastBoost: 64,
          autoMaskWindowsSky: true,
          overlayBlend: 65,
        });
        runAutoDetectHouseStructure();
        showToast(
          'Step 3 Demo Complete: Computer Vision extracted 14 architectural zones from Firehouse photo!'
        );
        break;
      }
      case 4: {
        const firstLayer = layers[0];
        if (firstLayer) {
          setVectorToolbar({
            selectedLayerId: firstLayer.id,
            liveTraceOnHouse: true,
            snapVertices: true,
          });
          updateLayer(firstLayer.id, {
            edgeFeathering: 6,
            outlineGlowWidth: 4,
          });
        }
        showToast(
          'Step 4 Demo Complete: Refined Vector Masks, enabled Live Trace on House & set 6px Edge Feathering!'
        );
        break;
      }
      case 5: {
        setAiStudioParams({
          useColorLightingRef: true,
          useControlNetWireframe: true,
          structureAdherence: 0.9,
          preserveBlackoutZones: true,
          hardCameraLock: true,
          ghostWireframeOverlay: true,
          selectedThemePreset: 'Haunted Manor',
          positivePrompt:
            'Ghostbusters brick firehouse facade with glowing green Slimer ectoplasm breach, proton stream crossfire wrapping around pillars and windows, 8k architectural projection mapping, locked camera perspective',
        });
        generateAiVideo();
        showToast(
          'Step 5 Demo Complete: ControlNet Wireframe & Hard Camera Lock engaged — Rendering Sample AI Clip!'
        );
        break;
      }
      case 6: {
        setRepairParams({
          repairTab: 'regional-inpainting',
          maskTool: 'brush',
          featherPx: 14,
          inpaintPrompt:
            'Clean architectural firehouse garage doors with crisp containment laser grid and Ecto-1 headlights',
          changeStrength: 0.75,
          temporalConsistency: true,
          wipePosition: 52,
        });
        addBrushStroke({ x: 500, y: 420, r: 48 });
        addBrushStroke({ x: 560, y: 420, r: 48 });
        renderRepairPreview();
        showToast(
          'Step 6 Demo Complete: Painted regional repair mask over garage bay & rendered glitch-free patch!'
        );
        break;
      }
      case 7: {
        autoDetectBeatsAndFlags(75);
        setAudioReactiveMasterGain(90);
        const roofLayer =
          layers.find((l) => l.category === 'Roofline') || layers[0];
        if (roofLayer) {
          updateLayerColorModifier(roofLayer.id, {
            audioReactive: true,
            audioTriggerBand: 'bass',
            reactiveEffect: 'pulse',
            reactiveIntensity: 85,
            tintColor: '#00f0ff',
          });
        }
        showToast(
          'Step 7 Demo Complete: Beat Flags detected & Roofline bound to pulse Cyan on Bass hits!'
        );
        break;
      }
      case 8: {
        setCalibrationParams({
          calibrationMode: 'global',
          warpMode: 'simple',
          applyBlackoutMasks: true,
          transitionMode: 'CROSSFADE (1.5s)',
          loopMode: 'INFINITE',
        });
        updateGlobalKeyReference({ locked: false });
        showToast(
          'Step 8 Demo Complete: Global Key Reference aligned, Blackout Masks armed & 1.5s Crossfade set!'
        );
        break;
      }
      case 9: {
        setLiveShowParams({
          isShowActive: true,
          masterVolume: 85,
          selectedAudioTrackUrl: AUDIO_OVERLAY_TRACKS[0].url,
        });
        triggerManualOverlayCue('THUNDER & FLASH');
        try {
          playManualCueSound('THUNDER & FLASH', 0.7);
        } catch {
          // audio context optional
        }
        showToast(
          'Step 9 Demo Complete: LIVE SHOW STARTED + Triggered "THUNDER & FLASH" Manual Cue!'
        );
        break;
      }
      case 10: {
        toggleAudiencePortal(true);
        castAudienceVote('poll-1');
        toggleDuskToDawnScheduler(true);
        saveCurrentProject();
        showToast(
          'Step 10 Demo Complete: Audience QR Voting & Dusk-to-Dawn Scheduler active — Sample Show Saved!'
        );
        break;
      }
    }

    setCompletedSteps((prev) => ({ ...prev, [stepNum]: true }));
  };

  // Minimized pill at bottom-right so user has 100% unobstructed view when desired
  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-gradient-to-r from-emerald-950 via-[#101c2e] to-blue-950 border-2 border-emerald-400/80 rounded-full px-4 py-2.5 shadow-[0_0_30px_rgba(16,185,129,0.45)] text-slate-100">
        <GraduationCap className="w-5 h-5 text-emerald-400 animate-bounce" />
        <div className="text-xs">
          <span className="font-extrabold text-emerald-300 uppercase tracking-wider">
            Tutorial Step {currentStep.stepNumber}/10:
          </span>{' '}
          <span className="font-semibold text-white">{currentStep.title}</span>
        </div>
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="ml-2 px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold uppercase transition-colors cursor-pointer"
        >
          Resume Guide
        </button>
        <button
          type="button"
          onClick={() => setIsTutorialWalkthroughOpen(false)}
          className="p-1 text-slate-400 hover:text-white cursor-pointer"
          title="Close Tutorial"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={
        viewMode === 'expanded'
          ? 'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150'
          : 'fixed bottom-4 right-4 z-50 w-[560px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-7rem)] flex flex-col shadow-[0_12px_50px_rgba(0,0,0,0.85)] rounded-2xl border-2 border-emerald-400/70 bg-[#0d1524]/98 backdrop-blur-md text-slate-100 overflow-hidden'
      }
    >
      <div
        className={
          viewMode === 'expanded'
            ? 'bg-[#0d1524] border-2 border-emerald-400/70 rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-[0_0_60px_rgba(16,185,129,0.3)] text-slate-100 overflow-hidden'
            : 'flex flex-col flex-1 min-h-0 overflow-hidden'
        }
      >
        {/* TOP HEADER BAR */}
        <div className="bg-gradient-to-r from-emerald-950/90 via-[#132036] to-cyan-950/90 px-4 py-2.5 border-b border-emerald-500/40 flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.35)]">
                <GraduationCap className="w-4 h-4 text-emerald-300" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 whitespace-nowrap">
                    Beginner Walkthrough
                  </span>
                  <span className="text-[11px] font-mono text-cyan-300 font-bold whitespace-nowrap">
                    Step {currentStep.stepNumber} of {SAMPLE_SHOW_TUTORIAL_STEPS.length}
                  </span>
                </div>
                <h2 className="text-xs sm:text-sm font-extrabold text-white truncate mt-0.5">
                  Build a Sample Show: &ldquo;Ghostbusters Firehouse&rdquo;
                </h2>
              </div>
            </div>

            {/* Mode Switch & Window Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center bg-[#090e18] p-0.5 rounded-lg border border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setActiveTab('walkthrough')}
                  className={`px-2 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === 'walkthrough'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Step-by-Step
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('glossary')}
                  className={`px-2 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === 'glossary'
                      ? 'bg-cyan-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Screens &amp; FAQ
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  setViewMode((prev) => (prev === 'coach' ? 'expanded' : 'coach'))
                }
                className="px-2 py-1 rounded-lg bg-[#18263e] hover:bg-[#223556] border border-slate-600/70 text-[10px] font-bold text-cyan-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                title={
                  viewMode === 'coach'
                    ? 'Expand to Full-Screen Reader Mode'
                    : 'Dock to Corner Coach Mode (Interact with Live App Behind)'
                }
              >
                {viewMode === 'coach' ? (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Full View</span>
                  </>
                ) : (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>Dock to Corner</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMinimized(true)}
                className="px-2 py-1 rounded-lg bg-[#18263e] hover:bg-[#223556] border border-slate-600/70 text-[10px] font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Minimize to small pill in corner"
              >
                Hide
              </button>

              <button
                type="button"
                onClick={() => setIsTutorialWalkthroughOpen(false)}
                className="p-1 rounded-lg bg-[#18263e] hover:bg-red-900/60 border border-slate-600/70 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Close Tutorial"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* STEP PROGRESS PILLS BAR */}
        {activeTab === 'walkthrough' && (
          <div className="bg-[#090f1a] px-3 py-2 border-b border-[#1c2a42] flex items-center gap-1 overflow-x-auto shrink-0">
            {SAMPLE_SHOW_TUTORIAL_STEPS.map((s, idx) => {
              const isCurrent = idx === safeStepIndex;
              const isDone = !!completedSteps[s.stepNumber];
              return (
                <button
                  key={s.stepNumber}
                  type="button"
                  onClick={() => goToStep(idx)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wide whitespace-nowrap flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                    isCurrent
                      ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)] border border-emerald-300'
                      : isDone
                      ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-600/50 hover:bg-emerald-900/60'
                      : 'bg-[#131d30] text-slate-400 hover:text-slate-200 border border-[#22324d]'
                  }`}
                  title={`Jump to Step ${s.stepNumber}: ${s.title}`}
                >
                  {isDone && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                  <span>
                    {s.stepNumber}. {s.navBadge.split(' (')[0].replace(/^\d+\.\s*/, '')}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* MAIN SCROLLABLE EDUCATIONAL BODY */}
        {activeTab === 'walkthrough' ? (
          <div className="p-4 overflow-y-auto space-y-4 flex-1 min-h-0">
            {/* Step Banner & Active Screen Indicator */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#132238] to-[#0e1829] border border-cyan-500/40 shadow-inner">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-cyan-300 bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-500/40">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  Active Studio Location: {currentStep.navBadge}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveStudioMode(currentStep.studioMode);
                    setActiveScreen(currentStep.screenId);
                    showToast(`Jumped to ${currentStep.navBadge}`);
                  }}
                  className="text-[11px] font-bold text-emerald-300 hover:text-emerald-200 underline cursor-pointer"
                >
                   Make sure this screen is open behind me &rarr;
                </button>
              </div>
              <h3 className="text-base font-extrabold text-white">
                Step {currentStep.stepNumber}: {currentStep.title}
              </h3>
              <p className="text-xs font-semibold text-cyan-300/90 mt-0.5">
                {currentStep.subtitle}
              </p>
            </div>

            {/* 1. Plain-English Explanation: What is happening here? */}
            <div className="p-3.5 rounded-xl bg-[#111a2b] border border-[#22324f] space-y-2">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                <BookOpen className="w-4 h-4" />
                <span>What Is This Screen &amp; How Does It Work?</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {currentStep.plainEnglishSummary}
              </p>
              <div className="pt-2 border-t border-slate-800/80 flex items-start gap-2 text-xs text-amber-200/90">
                <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-300">Why This Step Matters: </strong>
                  {currentStep.whyThisMatters}
                </div>
              </div>
            </div>

            {/* 2. What Each Control Does (Educating the User on the UI) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>What Every Control on This Screen Does</span>
                </h4>
                <span className="text-[10px] font-mono text-slate-400">
                  {currentStep.whatEachThingDoes.length} Key Areas Explained
                </span>
              </div>

              <div
                className={
                  viewMode === 'expanded'
                    ? 'grid grid-cols-1 md:grid-cols-2 gap-2.5'
                    : 'space-y-2'
                }
              >
                {currentStep.whatEachThingDoes.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-[#0f1726] border border-[#1f2f4a] hover:border-cyan-500/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-extrabold text-white">
                        {item.controlName}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/90 text-blue-300 border border-blue-700/50 shrink-0">
                        {item.location}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                      {item.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Hands-On Action & 1-Click Auto-Demo */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/60 via-[#112233] to-cyan-950/60 border border-emerald-500/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Try It Now (Hands-On Sample Show Checklist)</span>
                </span>
                {completedSteps[currentStep.stepNumber] && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-300 bg-emerald-900/50 px-2 py-0.5 rounded border border-emerald-400/40">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Step Completed!
                  </span>
                )}
              </div>

              <ol className="space-y-1.5 text-xs text-slate-200 list-decimal list-inside">
                {currentStep.tryItSteps.map((instruction, i) => (
                  <li key={i} className="leading-relaxed">
                    {instruction}
                  </li>
                ))}
              </ol>

              {/* Interactive Auto-Demo Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleRunStepAutoDemo}
                  className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:via-teal-500 hover:to-cyan-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.4)] border border-emerald-300/60 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Wand2 className="w-4 h-4" />
                  <span>{currentStep.autoDemoButtonLabel}</span>
                </button>
                <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                  {currentStep.autoDemoDescription}
                </p>
              </div>
            </div>

            {/* Pro Tip Footer Box */}
            <div className="p-2.5 rounded-lg bg-[#141d2f] border border-slate-700/70 flex items-center gap-2.5 text-xs text-slate-300">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                <strong className="text-cyan-300">Studio Pro Tip: </strong>
                {currentStep.proTip}
              </span>
            </div>
          </div>
        ) : (
          /* ALL SCREENS GLOSSARY & BEGINNER FAQ TAB */
          <div className="p-4 overflow-y-auto space-y-4 flex-1 min-h-0">
            <div className="p-3.5 rounded-xl bg-[#111a2b] border border-cyan-500/40 space-y-2">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-cyan-400" />
                <span>Beginner FAQ: How Projection Mapping Works</span>
              </h3>
              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="p-2.5 rounded bg-[#0b121e] border border-slate-800">
                  <p className="font-bold text-white">
                    Q: Why are the top navigation buttons numbered 1 through 10 in a specific order?
                  </p>
                  <p className="mt-1">
                    The top bar is arranged in the exact chronological order of building a show:
                    <strong className="text-cyan-300"> 1. Home</strong> &rarr;
                    <strong className="text-cyan-300"> 2. Projectors</strong> &rarr;
                    <strong className="text-cyan-300"> 3. Photo CV</strong> &rarr;
                    <strong className="text-cyan-300"> 4. Vectors</strong> &rarr;
                    <strong className="text-cyan-300"> 5. AI Studio</strong> &rarr;
                    <strong className="text-cyan-300"> 6. Repair</strong> &rarr;
                    <strong className="text-cyan-300"> 7. Music Sync</strong> &rarr;
                    <strong className="text-cyan-300"> 8. Playlist</strong> &rarr;
                    <strong className="text-cyan-300"> 9. Showtime</strong> &rarr;
                    <strong className="text-cyan-300"> 10. Smart Auto</strong>. Follow them left-to-right!
                  </p>
                </div>

                <div className="p-2.5 rounded bg-[#0b121e] border border-slate-800">
                  <p className="font-bold text-white">
                    Q: Do I need a real physical projector plugged in right now to learn or build a show?
                  </p>
                  <p className="mt-1">
                    No! You can design, trace, generate AI videos, sync music, and preview your entire show right on your computer monitor using our built-in <strong className="text-emerald-300">Ghostbusters Firehouse</strong> sample house. When you are ready to project onto a real building, click <strong className="text-cyan-300">LAUNCH PROJECTOR OUTPUT</strong> in the top bar.
                  </p>
                </div>

                <div className="p-2.5 rounded bg-[#0b121e] border border-slate-800">
                  <p className="font-bold text-white">
                    Q: What is the difference between &ldquo;Core 1–10&rdquo; and &ldquo;Pro 11–18&rdquo; in the top bar?
                  </p>
                  <p className="mt-1">
                    <strong className="text-blue-400">Core 1–10</strong> contains everything you need to build and run a complete projection mapping show from start to finish. <strong className="text-fuchsia-400">Pro 11–18</strong> unlocks 8 optional advanced labs (Multi-Track Timeline NLE, 3D Relighting, Singing Faces Lip-Sync, DMX/xLights Pixel Stage, Particle Physics Shaders, Webcam Auto-Calibration, Interior Window Hollusions, and FM Radio RDS Broadcast).
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Jump Directory of All 18 Screens */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                Complete 18-Screen Directory (Click Any Screen to Visit)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 1 as ScreenId, mode: 'core' as const, name: '1. Home (Screen 1)', desc: 'Project hub, templates, save/export & quick output monitor', icon: Compass },
                  { id: 8 as ScreenId, mode: 'core' as const, name: '2. Projectors (Screen 8)', desc: 'Multi-projector setup, throw optics & soft-edge blending', icon: Projector },
                  { id: 3 as ScreenId, mode: 'core' as const, name: '3. Photo CV (Screen 3)', desc: 'Import house photo, fix perspective & auto-detect edges', icon: Camera },
                  { id: 2 as ScreenId, mode: 'core' as const, name: '4. Vectors (Screen 2)', desc: 'Draw/edit surface masks, window blackouts & guide lines', icon: Layers },
                  { id: 4 as ScreenId, mode: 'core' as const, name: '5. AI Studio (Screen 4)', desc: 'Generate perspective-locked AI videos using ControlNet', icon: Video },
                  { id: 5 as ScreenId, mode: 'core' as const, name: '6. Repair (Screen 5)', desc: 'Brush-mask & inpaint local AI glitches without re-rolling', icon: Paintbrush },
                  { id: 10 as ScreenId, mode: 'core' as const, name: '7. Music Sync (Screen 10)', desc: 'Auto-detect song beats & make house layers pulse to audio', icon: Music },
                  { id: 6 as ScreenId, mode: 'core' as const, name: '8. Playlist (Screen 6)', desc: 'Queue clips & align Global Key Reference vs Per-Clip offset', icon: Sliders },
                  { id: 7 as ScreenId, mode: 'core' as const, name: '9. Showtime (Screen 7)', desc: 'Live show playback deck + 6 instant manual FX cue pads', icon: Play },
                  { id: 9 as ScreenId, mode: 'core' as const, name: '10. Smart Auto (Screen 9)', desc: 'Audience QR voting, sunset scheduler & smart home MQTT', icon: Radio },
                  { id: 11 as ScreenId, mode: 'pro' as const, name: '11. Timeline NLE', desc: 'Multi-track keyframe compositor & audio stem mixer', icon: Sliders },
                  { id: 12 as ScreenId, mode: 'pro' as const, name: '12. 3D Relight', desc: 'Synthesize 3D depth/normal maps & orbit virtual spotlights', icon: Sparkles },
                  { id: 13 as ScreenId, mode: 'pro' as const, name: '13. Singing Faces', desc: 'AI lip-syncing pumpkins, ghosts & Santa mapped to windows', icon: Music },
                  { id: 14 as ScreenId, mode: 'pro' as const, name: '14. Pixel & DMX', desc: 'Sync physical WLED strips, xLights & DMX moving heads', icon: Layers },
                  { id: 15 as ScreenId, mode: 'pro' as const, name: '15. Shader Forge', desc: 'Procedural snow, rain & lava particles colliding with roof', icon: Wand2 },
                  { id: 16 as ScreenId, mode: 'pro' as const, name: '16. Optical Calib', desc: 'Camera structured-light auto-warp & throw lens calculator', icon: Camera },
                  { id: 17 as ScreenId, mode: 'pro' as const, name: '17. Window Portals', desc: 'Rear-projection interior room depth & Hollusion scrims', icon: Projector },
                  { id: 18 as ScreenId, mode: 'pro' as const, name: '18. Broadcast & Health', desc: 'FM Radio RDS broadcaster (89.7 FM), decibel & rain safety', icon: Radio },
                ].map((scr) => {
                  const IconComponent = scr.icon;
                  return (
                    <button
                      key={scr.id}
                      type="button"
                      onClick={() => {
                        setActiveStudioMode(scr.mode);
                        setActiveScreen(scr.id);
                        showToast(`Opened ${scr.name}`);
                      }}
                      className="p-2.5 rounded-lg bg-[#0f1726] hover:bg-[#17243b] border border-[#22324d] hover:border-cyan-500/60 text-left flex items-start gap-2.5 transition-all cursor-pointer"
                    >
                      <IconComponent className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold text-white">
                          {scr.name}
                        </div>
                        <div className="text-[11px] text-slate-400 leading-snug mt-0.5">
                          {scr.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM NAVIGATION FOOTER */}
        <div className="bg-[#090f1a] px-4 py-3 border-t border-[#1e2d47] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            disabled={safeStepIndex === 0}
            onClick={() => {
              setActiveTab('walkthrough');
              goToStep(safeStepIndex - 1);
            }}
            className="px-3.5 py-1.5 rounded-lg bg-[#162238] hover:bg-[#1f304d] disabled:opacity-40 disabled:pointer-events-none border border-slate-600/80 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous Step</span>
          </button>

          <div className="text-[11px] font-mono text-slate-400 text-center hidden sm:block">
            { Object.keys(completedSteps).length } of {SAMPLE_SHOW_TUTORIAL_STEPS.length} Demo Steps Completed
          </div>

          {safeStepIndex < SAMPLE_SHOW_TUTORIAL_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => {
                setActiveTab('walkthrough');
                goToStep(safeStepIndex + 1);
              }}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>Next Step ({safeStepIndex + 2}/10)</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                saveCurrentProject();
                setIsTutorialWalkthroughOpen(false);
                showToast(
                  'Congratulations! You completed the Sample Show Walkthrough!'
                );
              }}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 text-xs font-extrabold uppercase tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.5)] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Finish &amp; Save Show!</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
