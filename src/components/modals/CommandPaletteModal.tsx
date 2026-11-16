import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Command,
  Monitor,
  Sparkles,
  Sliders,
  ShieldCheck,
  Zap,
  Layers,
  Wand2,
  Calendar,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Maximize2,
  Music,
  FolderOpen,
  Film,
  Camera,
  Activity,
  HardDrive,
  Moon,
  Sun,
  Flame,
  X,
  ArrowRight,
  Check,
  Clock,
  Play,
  Radio,
  Grid,
} from 'lucide-react';
import { useProjectionStore, ScreenId } from '../../store/useProjectionStore';
import { getMarshallSampleHouseAndShow } from '../../utils/eveningRehearsalAndPreflight';

// ============================================================================
// RED-LIGHT NIGHT-VISION THEME HOOK & HELPER
// ============================================================================

const RED_LIGHT_STORAGE_KEY = 'mps_red_light_night_vision';
const RED_LIGHT_STYLE_ID = 'mps-red-light-night-vision-injected-style';

const RED_LIGHT_CSS = `
html.mps-red-light-night-vision {
  filter: grayscale(100%) brightness(88%) sepia(100%) hue-rotate(-50deg) saturate(1000%) contrast(115%) !important;
  background-color: #120000 !important;
}
html.mps-red-light-night-vision body {
  background-color: #120000 !important;
}
html.mps-red-light-night-vision * {
  border-color: rgba(255, 30, 30, 0.4) !important;
  outline-color: rgba(255, 50, 50, 0.6) !important;
}
html.mps-red-light-night-vision canvas {
  filter: none !important; /* Preserves exact stage output colors */
}
`;

export function useRedLightNightVisionTheme() {
  const [isRedLightActive, setIsRedLightActive] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(RED_LIGHT_STORAGE_KEY) === 'true';
  });

  const applyTheme = (active: boolean) => {
    if (typeof document === 'undefined') return;

    if (active) {
      document.documentElement.classList.add('mps-red-light-night-vision');
      let styleTag = document.getElementById(RED_LIGHT_STYLE_ID);
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = RED_LIGHT_STYLE_ID;
        styleTag.innerHTML = RED_LIGHT_CSS;
        document.head.appendChild(styleTag);
      }
    } else {
      document.documentElement.classList.remove('mps-red-light-night-vision');
      const styleTag = document.getElementById(RED_LIGHT_STYLE_ID);
      if (styleTag) {
        styleTag.remove();
      }
    }
  };

  useEffect(() => {
    applyTheme(isRedLightActive);
  }, [isRedLightActive]);

  const toggleRedLight = () => {
    setIsRedLightActive((prev) => {
      const next = !prev;
      localStorage.setItem(RED_LIGHT_STORAGE_KEY, String(next));
      applyTheme(next);
      return next;
    });
  };

  const setRedLight = (enabled: boolean) => {
    setIsRedLightActive(enabled);
    localStorage.setItem(RED_LIGHT_STORAGE_KEY, String(enabled));
    applyTheme(enabled);
  };

  return {
    isRedLightActive,
    toggleRedLight,
    setRedLight,
  };
}

// ============================================================================
// COMMAND PALETTE MODAL COMPONENT
// ============================================================================

export interface CommandPaletteModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onOpenModal?: (modalKey: string) => void;
}

interface PaletteCommand {
  id: string;
  category: 'Quick Actions' | 'Marshall Studio Tools' | 'Screens (1–18)' | 'Studio Modals';
  title: string;
  description: string;
  shortcut?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
  onOpenModal,
}) => {
  const store = useProjectionStore();
  const { isRedLightActive, toggleRedLight } = useRedLightNightVisionTheme();

  // Internal open state fallback when unmanaged
  const [internalOpen, setInternalOpen] = useState<boolean>(false);
  const isOpen = propIsOpen !== undefined ? propIsOpen : internalOpen;

  const handleClose = () => {
    if (propOnClose) propOnClose();
    else setInternalOpen(false);
  };

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (propIsOpen === undefined) {
          setInternalOpen((prev) => !prev);
        } else if (propOnClose && propIsOpen) {
          propOnClose();
        }
      }
      if (isOpen && e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, propIsOpen, propOnClose]);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Command Registry
  const commands: PaletteCommand[] = useMemo(() => [
    // 1. QUICK ACTIONS
    {
      id: 'act-red-light',
      category: 'Quick Actions',
      title: isRedLightActive ? 'Disable Red-Light Night-Vision Theme' : 'Enable Red-Light Night-Vision Tracing Theme',
      description: 'Preserves dark adaptation in driveway with pure deep crimson monochrome palette (#140000)',
      shortcut: 'Ctrl+Shift+R',
      icon: Moon,
      action: () => {
        toggleRedLight();
        store.showToast?.(isRedLightActive ? 'Standard Day/Night UI restored.' : 'Red-Light Night-Vision Mode active.');
        handleClose();
      },
    },
    {
      id: 'act-blackout',
      category: 'Quick Actions',
      title: store.masterBlackout ? 'Disengage Master Blackout' : 'Engage Master Blackout',
      description: 'Instantly silences projector beam to pure black (#000000)',
      shortcut: 'B / Space',
      icon: store.masterBlackout ? Eye : EyeOff,
      action: () => {
        store.toggleMasterBlackout();
        handleClose();
      },
    },
    {
      id: 'act-test-pattern',
      category: 'Quick Actions',
      title: store.projectorTestPattern ? 'Turn Off Projector Test Pattern' : 'Turn On Projector Test Pattern',
      description: 'Toggles crosshatch alignment grid and perimeter boundary check',
      shortcut: 'P',
      icon: Activity,
      action: () => {
        store.setProjectorTestPattern(!store.projectorTestPattern);
        handleClose();
      },
    },
    {
      id: 'act-preflight-run',
      category: 'Quick Actions',
      title: 'Run Pre-Show Preflight Diagnostic',
      description: 'Audits stage geometry, missing media, and audio endpoints before showtime',
      shortcut: 'Ctrl+Shift+P',
      icon: ShieldCheck,
      action: () => {
        if (onOpenModal) onOpenModal('run-night-preflight');
        else window.dispatchEvent(new CustomEvent('open-run-night-hub', { detail: { tab: 'preflight' } }));
        handleClose();
      },
    },
    {
      id: 'act-load-marshall-sample',
      category: 'Quick Actions',
      title: 'Load Marshall Sample House & Show Pack',
      description: 'Populates gable house trace, sample clips, and 32-beat pad track in one click',
      shortcut: 'Ctrl+Alt+S',
      icon: Sparkles,
      action: () => {
        const sample = getMarshallSampleHouseAndShow();
        useProjectionStore.setState({
          layers: sample.layers,
          beatFlags: sample.beatFlags,
        });
        store.setPlaylistClips(sample.playlistClips);
        store.showToast?.('Marshall Sample House & Show loaded successfully!');
        handleClose();
      },
    },
    {
      id: 'act-master-volume-mute',
      category: 'Quick Actions',
      title: store.masterVolume === 0 ? 'Unmute Master Audio Gain' : 'Mute Master Audio Gain',
      description: 'Toggles master volume fader between 85% and 0%',
      shortcut: 'M',
      icon: store.masterVolume === 0 ? VolumeX : Volume2,
      action: () => {
        useProjectionStore.setState({
          masterVolume: store.masterVolume === 0 ? 85 : 0,
        });
        handleClose();
      },
    },
    {
      id: 'act-fullscreen',
      category: 'Quick Actions',
      title: 'Toggle Fullscreen Mode',
      description: 'Expands projection workspace to full monitor resolution',
      shortcut: 'F11',
      icon: Maximize2,
      action: () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
        handleClose();
      },
    },

    // 2. MARSHALL STUDIO WORK PACKAGE MODALS
    {
      id: 'mps-run-night-hub',
      category: 'Marshall Studio Tools',
      title: 'Evening Rehearsal Simulator & Pre-Show Preflight Hub',
      description: 'Fast-forward evening simulator, Spencer dusk calculator, 0-9 Launch Pad & .mps* bridge',
      shortcut: 'Ctrl+Shift+E',
      icon: Clock,
      action: () => {
        if (onOpenModal) onOpenModal('run-night-preflight');
        else window.dispatchEvent(new CustomEvent('open-run-night-hub', { detail: { tab: 'rehearsal' } }));
        handleClose();
      },
    },
    {
      id: 'mps-fit-video',
      category: 'Marshall Studio Tools',
      title: 'Fit Video to House (Clip Placement Studio)',
      description: 'Drag, scale, and 4-corner perspective-pin video underneath traced house outlines (UV mapping)',
      shortcut: 'Ctrl+Shift+V',
      icon: Film,
      action: () => {
        if (onOpenModal) onOpenModal('fit-video-to-house');
        else window.dispatchEvent(new CustomEvent('open-fit-video-to-house'));
        handleClose();
      },
    },
    {
      id: 'mps-export-stencil',
      category: 'Marshall Studio Tools',
      title: 'Export House Stencil (AI Video Silhouette)',
      description: 'Exports filled mask, stroked outlines, or ControlNet semantic segmentation at 1080p/4K',
      shortcut: 'Ctrl+Shift+S',
      icon: Camera,
      action: () => {
        if (onOpenModal) onOpenModal('export-house-stencil');
        else window.dispatchEvent(new CustomEvent('open-export-house-stencil'));
        handleClose();
      },
    },
    {
      id: 'mps-recalibration-wizard',
      category: 'Marshall Studio Tools',
      title: 'Two-Tier Map Recalibration & Outliner (Global Warp)',
      description: 'Master 4-corner homography (W), per-shape delta offsets, polygon holes & auto-classifier',
      shortcut: 'W',
      icon: Sliders,
      action: () => {
        if (onOpenModal) onOpenModal('map-recalibration');
        else window.dispatchEvent(new CustomEvent('open-map-recalibration'));
        handleClose();
      },
    },
    {
      id: 'mps-scene-library-fx',
      category: 'Marshall Studio Tools',
      title: 'Scene Library & 11-Node Colour/FX Graph',
      description: 'Reusable holiday scenes, bulb chases, icicle drips, Santa sleigh flyovers & node graph',
      shortcut: 'Ctrl+Shift+L',
      icon: Wand2,
      action: () => {
        if (onOpenModal) onOpenModal('scene-library-fx');
        else window.dispatchEvent(new CustomEvent('open-scene-library-fx'));
        handleClose();
      },
    },
    {
      id: 'mps-auto-show-karaoke',
      category: 'Marshall Studio Tools',
      title: 'One-Button Auto-Show & Word-Level Karaoke Studio',
      description: 'Onset detection auto-show generator, punch-in overdub, .srt/.vtt karaoke & xLights .xtiming bridge',
      shortcut: 'Ctrl+Shift+A',
      icon: Music,
      action: () => {
        if (onOpenModal) onOpenModal('auto-show-karaoke');
        else window.dispatchEvent(new CustomEvent('open-auto-show-karaoke'));
        handleClose();
      },
    },
    {
      id: 'mps-loop-crossfade',
      category: 'Marshall Studio Tools',
      title: 'Seamless Loop Crossfade Studio',
      description: 'Visual trim in/out timeline with tail-to-head crossfade blend weights for seamless video looping',
      shortcut: 'Ctrl+Shift+C',
      icon: Activity,
      action: () => {
        if (onOpenModal) onOpenModal('loop-crossfade');
        else window.dispatchEvent(new CustomEvent('open-loop-crossfade'));
        handleClose();
      },
    },
    {
      id: 'mps-projector-rig',
      category: 'Marshall Studio Tools',
      title: 'Multi-Projector Rig & Edge Blending Studio (.mpsrig)',
      description: 'Multi-projector canvas bounds, overlap fractions, edge blend falloff curves, keystone and lamp hours',
      shortcut: 'Ctrl+Shift+R',
      icon: Monitor,
      action: () => {
        store.setIsProjectorRigModalOpen(true);
        if (onOpenModal) onOpenModal('projector-rig');
        else window.dispatchEvent(new CustomEvent('open-projector-rig'));
        handleClose();
      },
    },
    {
      id: 'mps-dmx-wled',
      category: 'Marshall Studio Tools',
      title: 'DMX Art-Net & WLED Pixel Light Synchronization (.mpsdmx / .mpswled)',
      description: 'Patch moving heads, RGB floods and WLED pixel strips mapped to house shapes with live 512-ch heat map',
      shortcut: 'Ctrl+Shift+D',
      icon: Zap,
      action: () => {
        store.setIsDmxWledModalOpen(true);
        if (onOpenModal) onOpenModal('dmx-wled');
        else window.dispatchEvent(new CustomEvent('open-dmx-wled'));
        handleClose();
      },
    },
    {
      id: 'mps-live-audio-midi',
      category: 'Marshall Studio Tools',
      title: 'Live Audio-Reactive Spectrum Analyzer & Web MIDI Studio',
      description: '2048-point FFT 5-band spectrum analysis, audio modulation routing matrix, and USB MIDI launchpad pad mapping',
      shortcut: 'Ctrl+Shift+M',
      icon: Radio,
      action: () => {
        store.setIsLiveAudioMidiModalOpen(true);
        if (onOpenModal) onOpenModal('live-audio-midi');
        else window.dispatchEvent(new CustomEvent('open-live-audio-midi'));
        handleClose();
      },
    },
    {
      id: 'mps-test-patterns-geometry',
      category: 'Marshall Studio Tools',
      title: 'Projector Alignment Test Patterns & Douglas-Peucker Simplifier',
      description: '10 bit-accurate optical calibration patterns (SMPTE bars, Siemens star, grid) and RDP contour simplifier',
      shortcut: 'Ctrl+Shift+T',
      icon: Grid,
      action: () => {
        store.setIsTestPatternsModalOpen(true);
        if (onOpenModal) onOpenModal('test-patterns');
        else window.dispatchEvent(new CustomEvent('open-test-patterns'));
        handleClose();
      },
    },
    {
      id: 'beginner-starter-shows',
      category: 'Quick Actions',
      title: 'Holiday In a Box — 1-Click Starter Show Packs',
      description: 'Load Halloween, Christmas, New Year\'s Eve or Indoor EDM starter shows with pre-traced masks and music',
      icon: Sparkles,
      action: () => {
        store.setIsStarterPacksModalOpen(true);
        handleClose();
      },
    },
    {
      id: 'beginner-guided-tour',
      category: 'Quick Actions',
      title: 'Start Interactive 5-Step Beginner Spotlight Tour',
      description: 'On-screen guided walkthrough with glowing highlights and 1-click Auto-Demo steps',
      icon: Play,
      action: () => {
        store.setSpotlightTourStep(0);
        store.setIsSpotlightTourActive(true);
        handleClose();
      },
    },
    {
      id: 'beginner-express-mode',
      category: 'Quick Actions',
      title: 'Toggle Express (Beginner) 4-Step Mode',
      description: 'Simplify interface to 4 easy steps: Photo/Wall -> Outlines -> Holiday Look -> Showtime',
      icon: Zap,
      action: () => {
        store.setActiveStudioMode('express');
        handleClose();
      },
    },

    // 3. ALL 18 SCREENS
    {
      id: 'nav-screen-1',
      category: 'Screens (1–18)',
      title: 'Screen 1: Home Dashboard',
      description: 'Project selection, AI prompt launcher, quick workflow launchpads',
      shortcut: 'Alt+1',
      icon: Monitor,
      action: () => { store.setActiveScreen(1); handleClose(); },
    },
    {
      id: 'nav-screen-2',
      category: 'Screens (1–18)',
      title: 'Screen 2: Layout & Mask Tracing',
      description: 'Vector polygon tracing, architectural masks, corner-pinning and surface roles',
      shortcut: 'Alt+2',
      icon: Layers,
      action: () => { store.setActiveScreen(2); handleClose(); },
    },
    {
      id: 'nav-screen-3',
      category: 'Screens (1–18)',
      title: 'Screen 3: Photo to Stage Layout',
      description: 'Automatic vision-based facade edge detection and architectural segmentation',
      shortcut: 'Alt+3',
      icon: Camera,
      action: () => { store.setActiveScreen(3); handleClose(); },
    },
    {
      id: 'nav-screen-4',
      category: 'Screens (1–18)',
      title: 'Screen 4: AI Video Generation Studio',
      description: 'Multi-layer prompt crafting, motion intensity, holiday stencil rendering',
      shortcut: 'Alt+4',
      icon: Sparkles,
      action: () => { store.setActiveScreen(4); handleClose(); },
    },
    {
      id: 'nav-screen-5',
      category: 'Screens (1–18)',
      title: 'Screen 5: AI Repair & Inpainting',
      description: 'Seamless border blend cleanup, seam smoothing, artifact erasing',
      shortcut: 'Alt+5',
      icon: Wand2,
      action: () => { store.setActiveScreen(5); handleClose(); },
    },
    {
      id: 'nav-screen-6',
      category: 'Screens (1–18)',
      title: 'Screen 6: Playlist & Offset Alignment',
      description: 'Sequential show list, per-clip delta offsets, and deck ordering',
      shortcut: 'Alt+6',
      icon: Film,
      action: () => { store.setActiveScreen(6); handleClose(); },
    },
    {
      id: 'nav-screen-7',
      category: 'Screens (1–18)',
      title: 'Screen 7: Live Showtime & Big Deck',
      description: 'Outdoor live show operator deck, big transport controls, safety blackouts',
      shortcut: 'Alt+7',
      icon: Play,
      action: () => { store.setActiveScreen(7); handleClose(); },
    },
    {
      id: 'nav-screen-8',
      category: 'Screens (1–18)',
      title: 'Screen 8: Multi-Projector Rig Setup',
      description: 'Projector resolution, throw ratio, S-curve soft edge blending, physical ports',
      shortcut: 'Alt+8',
      icon: HardDrive,
      action: () => { store.setActiveScreen(8); handleClose(); },
    },
    {
      id: 'nav-screen-9',
      category: 'Screens (1–18)',
      title: 'Screen 9: Audience & Smart Automation',
      description: 'Interactive smartphone web portal, live voting, weather and temperature triggers',
      shortcut: 'Alt+9',
      icon: Radio,
      action: () => { store.setActiveScreen(9); handleClose(); },
    },
    {
      id: 'nav-screen-10',
      category: 'Screens (1–18)',
      title: 'Screen 10: Music Sync & Beat Detection',
      description: 'Real-time audio frequency analysis, BPM detection, beat flags',
      shortcut: 'Alt+0',
      icon: Music,
      action: () => { store.setActiveScreen(10); handleClose(); },
    },
    {
      id: 'nav-screen-11',
      category: 'Screens (1–18)',
      title: 'Screen 11: Timeline Sequencer & Cues',
      description: 'Multi-track timeline, keyframes, transitions, scene cue markers',
      icon: Activity,
      action: () => { store.setActiveScreen(11); handleClose(); },
    },
    {
      id: 'nav-screen-12',
      category: 'Screens (1–18)',
      title: 'Screen 12: 3D Depth & Relighting',
      description: 'Virtual point, spot, and window emitter lights casting real-time 3D shadows',
      icon: Sun,
      action: () => { store.setActiveScreen(12); handleClose(); },
    },
    {
      id: 'nav-screen-13',
      category: 'Screens (1–18)',
      title: 'Screen 13: Singing Faces Studio',
      description: 'Singing pumpkins, skeletons, Santa and mansion ghosts with auto visemes',
      icon: Wand2,
      action: () => { store.setActiveScreen(13); handleClose(); },
    },
    {
      id: 'nav-screen-14',
      category: 'Screens (1–18)',
      title: 'Screen 14: Pixel WLED & DMX Stage',
      description: 'Architectural pixel arches, moving heads, E1.31 sACN and ArtNet DMX',
      icon: Zap,
      action: () => { store.setActiveScreen(14); handleClose(); },
    },
    {
      id: 'nav-screen-15',
      category: 'Screens (1–18)',
      title: 'Screen 15: Shader & Particle Forge',
      description: 'GPU fragment shaders, snowstorms, blazing fire, lightning plasma',
      icon: Flame,
      action: () => { store.setActiveScreen(15); handleClose(); },
    },
    {
      id: 'nav-screen-16',
      category: 'Screens (1–18)',
      title: 'Screen 16: Optical Auto-Calibration',
      description: 'Camera feedback homography solver and dual-tier projector recalibration',
      icon: Camera,
      action: () => { store.setActiveScreen(16); handleClose(); },
    },
    {
      id: 'nav-screen-17',
      category: 'Screens (1–18)',
      title: 'Screen 17: Window Portals & Depth',
      description: 'Interior window scenes, parallax illusion, silhouette shadows',
      icon: Eye,
      action: () => { store.setActiveScreen(17); handleClose(); },
    },
    {
      id: 'nav-screen-18',
      category: 'Screens (1–18)',
      title: 'Screen 18: Broadcast & NDI Diagnostics',
      description: 'Low-latency NDI/Spout output streaming, frame pacing ledger, PJLink control',
      icon: Radio,
      action: () => { store.setActiveScreen(18); handleClose(); },
    },

    // 4. EXISTING STUDIO MODALS
    {
      id: 'modal-optics',
      category: 'Studio Modals',
      title: 'Projector Optics Calculator',
      description: 'Calculate throw distance, image width, and surface foot-lamberts',
      icon: Sliders,
      action: () => { store.setIsOpticsCalculatorOpen(true); handleClose(); },
    },
    {
      id: 'modal-stem-splitter',
      category: 'Studio Modals',
      title: 'AI Audio Stem Splitter',
      description: 'Isolate vocals, bass, drums, and harmonic instrumental pads',
      icon: Music,
      action: () => { store.setIsStemSplitterOpen(true); handleClose(); },
    },
    {
      id: 'modal-wall-neutralizer',
      category: 'Studio Modals',
      title: 'Wall Color Neutralizer & Compensation',
      description: 'Color-cast inverse matrix for brick, stone, and tan vinyl siding',
      icon: Wand2,
      action: () => { store.setIsWallNeutralizerModalOpen(true); handleClose(); },
    },
    {
      id: 'modal-batch-render',
      category: 'Studio Modals',
      title: 'Batch Render Queue & Exporter',
      description: 'Queue and render multiple video scenes in background',
      icon: Film,
      action: () => { store.setIsBatchRenderModalOpen(true); handleClose(); },
    },
    {
      id: 'modal-auto-calibration',
      category: 'Studio Modals',
      title: 'Auto Calibration Wizard',
      description: 'Step-by-step camera projector alignment wizard',
      icon: Camera,
      action: () => { store.setIsAutoCalibrationModalOpen(true); handleClose(); },
    },
    {
      id: 'modal-chroma-key',
      category: 'Studio Modals',
      title: 'Chroma Key Extractor',
      description: 'Green-screen keying, tolerance, spill suppression, and edge feathering',
      icon: Wand2,
      action: () => { store.setIsChromaKeyModalOpen(true); handleClose(); },
    },
    {
      id: 'modal-bezier-mesh',
      category: 'Studio Modals',
      title: 'Bézier Mesh Warp Tool',
      description: 'Curved architectural surface mapping with multi-point Bézier grid',
      icon: Layers,
      action: () => { store.setIsBezierMeshModalOpen(true); handleClose(); },
    },
    {
      id: 'modal-fm-radio',
      category: 'Studio Modals',
      title: 'FM Radio Sign Generator',
      description: 'Tune To FM sign overlay with frequency display and animated soundwaves',
      icon: Radio,
      action: () => { store.setIsFmRadioSignModalOpen(true); handleClose(); },
    },
    {
      id: 'modal-spectator-portal',
      category: 'Studio Modals',
      title: 'Spectator Audience Portal Config',
      description: 'QR-code guest mobile app, light show voting, song requests',
      icon: Sparkles,
      action: () => { store.setIsSpectatorPortalModalOpen(true); handleClose(); },
    },
    {
      id: 'modal-hardware-safety',
      category: 'Studio Modals',
      title: 'Weather & Thermal Safety Rules',
      description: 'Thermal thresholds, high-wind and rain auto-shutoff failsafes',
      icon: ShieldCheck,
      action: () => { store.setIsHardwareSafetyModalOpen(true); handleClose(); },
    },
    {
      id: 'modal-holiday-assets',
      category: 'Studio Modals',
      title: 'Holiday Asset Library',
      description: 'Stock holiday overlays, falling snow, ghosts, pumpkins, and wreaths',
      icon: FolderOpen,
      action: () => { store.setIsHolidayAssetModalOpen(true); handleClose(); },
    },
    {
      id: 'modal-midi-controller',
      category: 'Studio Modals',
      title: 'MIDI Controller Mapping',
      description: 'Bind hardware MIDI faders and pads to studio controls',
      icon: Sliders,
      action: () => { store.setIsMidiControllerModalOpen(true); handleClose(); },
    },
    {
      id: 'modal-time-machine',
      category: 'Studio Modals',
      title: 'Project Time Machine (Version History)',
      description: 'Auto-saved project snapshots and one-click rollback',
      icon: Clock,
      action: () => { store.setIsProjectTimeMachineModalOpen(true); handleClose(); },
    },
    {
      id: 'modal-tutorial',
      category: 'Studio Modals',
      title: 'Sample Show Walkthrough Tutorial',
      description: 'Guided tour for first-time outdoor projectionists',
      icon: Sparkles,
      action: () => { store.setIsTutorialWalkthroughOpen(true); handleClose(); },
    },
    {
      id: 'modal-appliance-export',
      category: 'Studio Modals',
      title: 'Show Appliance Export',
      description: 'Export headless show bundle for Raspberry Pi / Jetson appliance',
      icon: HardDrive,
      action: () => { store.setIsShowExportModalOpen(true); handleClose(); },
    },
  ], [isRedLightActive, store, toggleRedLight, onOpenModal]);

  // Fuzzy Filter Logic
  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) return commands;
    const q = searchQuery.toLowerCase().trim();

    return commands.filter((cmd) => {
      const matchTitle = cmd.title.toLowerCase().includes(q);
      const matchDesc = cmd.description.toLowerCase().includes(q);
      const matchCategory = cmd.category.toLowerCase().includes(q);
      const matchShortcut = cmd.shortcut?.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchCategory || matchShortcut;
    });
  }, [commands, searchQuery]);

  // Keyboard Navigation (ArrowUp, ArrowDown, Enter)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredCommands.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredCommands[selectedIndex];
      if (selected) {
        selected.action();
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-selected="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center pt-20 p-4 select-none font-sans">
      <div className="w-full max-w-2xl bg-[#0c1322] border border-[#25354e] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200 animate-scale-in">
        
        {/* Search Header */}
        <div className="px-4 py-3.5 border-b border-[#1b2638] bg-[#0e1729] flex items-center gap-3">
          <Search className="w-5 h-5 text-sky-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, tool, screen, or action... (e.g. Red-Light, Stencil, Dusk, Screen 7)"
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedIndex(0);
              }}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-[#1b2638] text-slate-400 border border-[#25354e]">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto p-2 divide-y divide-[#182338]/40"
        >
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-mono text-xs">
              No matching commands found for "{searchQuery}".
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={cmd.id}
                  data-selected={isSelected}
                  onClick={() => cmd.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-sky-500/15 text-white shadow-inner border border-sky-500/30'
                      : 'hover:bg-[#121c2e] text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-sky-500/20 text-sky-400'
                          : 'bg-[#182338] text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs truncate">{cmd.title}</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono text-slate-500 bg-[#162133] shrink-0">
                          {cmd.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {cmd.description}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {cmd.shortcut && (
                      <kbd className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#141d2e] text-slate-400 border border-[#213047]">
                        {cmd.shortcut}
                      </kbd>
                    )}
                    {isSelected && <ArrowRight className="w-4 h-4 text-sky-400" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="px-4 py-2.5 border-t border-[#1b2638] bg-[#0e1729] flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[#1b2638] text-slate-300">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-[#1b2638] text-slate-300">↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[#1b2638] text-slate-300">↵</kbd> Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[#1b2638] text-slate-300">Ctrl+K</kbd> Toggle Palette
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={isRedLightActive ? 'text-rose-400 font-bold' : 'text-slate-500'}>
              Red-Light Mode: {isRedLightActive ? 'ACTIVE' : 'OFF'}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
