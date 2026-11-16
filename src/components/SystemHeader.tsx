import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Save,
  FolderPlus,
  PackageCheck,
  Sparkles,
  AlertTriangle,
  MonitorUp,
  HelpCircle,
  Keyboard,
  X,
  Cpu,
  Calculator,
  Radio,
  Sliders,
  History,
  Image,
  GraduationCap,
  Command,
  Film,
  Wand2,
  Music,
  Calendar,
  Crosshair,
  Zap,
  Grid,
  Monitor,
  Compass,
} from 'lucide-react';
import { ScreenId, useProjectionStore } from '../store/useProjectionStore';
import { ProjectorOutputView } from './ProjectorOutputView';
import {
  fetchBackendTelemetry,
  BackendTelemetryResponse,
} from '../utils/apiClient';

export const SCREEN_DISPLAY_NUMBERS: Record<ScreenId, number> = {
  1: 1,  // Home
  8: 2,  // Projectors
  3: 3,  // Photo CV
  2: 4,  // Vectors
  4: 5,  // AI Studio
  5: 6,  // Repair
  10: 7, // Music Sync
  6: 8,  // Playlist
  7: 9,  // Showtime
  9: 10, // Smart Auto
  11: 11, // Timeline NLE
  12: 12, // 3D Depth & Relighting
  13: 13, // Singing Faces Studio
  14: 14, // Pixel & DMX Stage
  15: 15, // Shader & Physics Forge
  16: 16, // Optical Calibration
  17: 17, // Window Portals
  18: 18, // Broadcast & Health
};

const SCREEN_SUBTITLES: Record<ScreenId, string> = {
  1: 'PROJECT HUB & HARDWARE DASHBOARD',
  8: 'MULTI-PROJECTOR SETUP & EDGE BLENDING SCREEN',
  3: 'PHOTO-TO-LAYOUT SCREEN (Reference Capture & Auto-Segmentation)',
  2: 'LAYOUT MAPPING SCREEN (Vector Surfaces & Blackout Masks)',
  4: 'CREATE VIDEO FROM PHOTO SCREEN (AI Generation Studio)',
  5: 'REGENERATE VIDEO / FIX & MODIFY PROMPT TOOL (Inpainting & Drift Repair)',
  10: 'MUSIC SYNCHRONIZATION & BEAT MAPPER (Audio-Reactive Shader Modifiers)',
  6: 'PLAYLIST & ALIGNMENT SCREEN (Global Key Reference vs. Per-Clip Override)',
  7: 'LIVE SHOWTIME / RUN SHOW SCREEN',
  9: 'AUDIENCE INTERACTION & SMART IOT AUTOMATION',
  11: 'MULTI-TRACK TIMELINE & KEYFRAME COMPOSITOR (NLE & Stem Mixer)',
  12: '3D FAÇADE DEPTH, NORMAL MAP & VIRTUAL RELIGHTING STUDIO',
  13: 'AI SINGING FACES, TALKING CHARACTERS & LIP-SYNC STUDIO',
  14: 'PHYSICAL PIXEL, WLED, XLIGHTS & DMX STAGE VISUALIZER',
  15: 'PROCEDURAL SHADER & PARTICLE PHYSICS FORGE (Geometry Colliders)',
  16: 'OPTICAL AUTO-CALIBRATION & LENS THROW CALCULATOR LAB',
  17: 'INTERIOR WINDOW PORTALS, HOLLUSIONS & YARD PROP MAPPER',
  18: 'BROADCAST RDS, WEATHER SAFETY & RENDER FARM CENTER',
};

const EXPRESS_SCREEN_LABELS: { id: ScreenId; label: string }[] = [
  { id: 3, label: '1. 📸 Pick House / Wall' },
  { id: 2, label: '2. 📐 Outlines & Windows' },
  { id: 4, label: '3. 🎬 Holiday Look / Video' },
  { id: 7, label: '4. 🚀 Showtime & Play!' },
];

const SCREEN_SHORT_LABELS: { id: ScreenId; label: string }[] = [
  { id: 1, label: '1. Home' },
  { id: 8, label: '2. Projectors' },
  { id: 3, label: '3. Photo CV' },
  { id: 2, label: '4. Vectors' },
  { id: 4, label: '5. AI Studio' },
  { id: 5, label: '6. Repair' },
  { id: 10, label: '7. Music Sync' },
  { id: 6, label: '8. Playlist' },
  { id: 7, label: '9. Showtime' },
  { id: 9, label: '10. Smart Auto' },
];

const PRO_SCREEN_LABELS: { id: ScreenId; label: string }[] = [
  { id: 11, label: '11. Timeline NLE' },
  { id: 12, label: '12. 3D Relight' },
  { id: 13, label: '13. Singing Faces' },
  { id: 14, label: '14. Pixel & DMX' },
  { id: 15, label: '15. Shader Forge' },
  { id: 16, label: '16. Optical Calib' },
  { id: 17, label: '17. Window Portals' },
  { id: 18, label: '18. Broadcast & Health' },
];

export const SystemHeader: React.FC = () => {
  const {
    activeScreen,
    activeProjectName,
    projectStateBadge,
    gpuUtilization,
    vramUsedGb,
    vramTotalGb,
    aiEngineOnline,
    masterBlackout,
    setActiveScreen,
    navigateBack,
    saveCurrentProject,
    saveProjectAs,
    exportShowPackage,
    toggleMasterBlackout,
    aiProviderConfig,
    setAiSettingsModalOpen,
    globalSettings,
    selectedOutputDisplay,
    projectorTestPattern,
    setProjectorTestPattern,
    activeStudioMode,
    setActiveStudioMode,
    setIsOpticsCalculatorOpen,
    setIsStemSplitterOpen,
    setIsBatchRenderModalOpen,
    setIsShowExportModalOpen,
    setIsMidiControllerModalOpen,
    setIsProjectTimeMachineModalOpen,
    setIsHolidayAssetModalOpen,
    setIsTutorialWalkthroughOpen,
    setTutorialWalkthroughStep,
    setIsFitVideoModalOpen,
    setIsExportStencilModalOpen,
    setIsMapRecalibrationModalOpen,
    setIsSceneLibraryModalOpen,
    setIsAutoShowKaraokeModalOpen,
    setIsRunNightRehearsalModalOpen,
    setIsCommandPaletteOpen,
    setIsProjectorRigModalOpen,
    setIsDmxWledModalOpen,
    setIsLiveAudioMidiModalOpen,
    setIsTestPatternsModalOpen,
    setIsStarterPacksModalOpen,
    setIsSpotlightTourActive,
    setSpotlightTourStep,
    projectors,
    showToast,
  } = useProjectionStore();

  const unsavedDialogRef = useRef<HTMLDialogElement>(null);
  const saveAsDialogRef = useRef<HTMLDialogElement>(null);
  const [cloneName, setCloneName] = useState(`${activeProjectName} Copy`);
  const [showInAppProjector, setShowInAppProjector] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [backendTelemetry, setBackendTelemetry] =
    useState<BackendTelemetryResponse | null>(null);

  // Poll backend telemetry on mount and every 15 seconds
  useEffect(() => {
    let isMounted = true;
    const pollTelemetry = async () => {
      try {
        const data = await fetchBackendTelemetry();
        if (isMounted) {
          setBackendTelemetry(data);
        }
      } catch {
        // failover handled cleanly in apiClient
      }
    };

    pollTelemetry();
    const interval = setInterval(pollTelemetry, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Global ESC panic listener, Alt+1..8 instant screen navigation, and '?' hotkey guide
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      // ESC: Master Emergency Blackout Toggle (unless a native dialog is open)
      if (e.key === 'Escape') {
        const openModal = document.querySelector('dialog:modal');
        if (openModal) return;
        if (showShortcutsModal) {
          setShowShortcutsModal(false);
          return;
        }
        e.preventDefault();
        toggleMasterBlackout();
        return;
      }

      // Ctrl + S (or Cmd + S): Save Current Project Anywhere
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveCurrentProject();
        return;
      }

      // Alt + LeftArrow: Navigate Back
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateBack();
        return;
      }

      // Alt + 1..0: Instant Screen Navigation (maps 1..10 to sequential screen order)
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const key = e.key;
        const navMap: Record<string, ScreenId> = {
          '1': 1,
          '2': 8,
          '3': 3,
          '4': 2,
          '5': 4,
          '6': 5,
          '7': 10,
          '8': 6,
          '9': 7,
          '0': 9,
        };
        if (navMap[key] !== undefined) {
          e.preventDefault();
          setActiveScreen(navMap[key]);
          return;
        }
      }

      // 'G': Toggle Calibration Test Grid
      if (!isInput && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        setProjectorTestPattern(!projectorTestPattern);
        return;
      }

      // 'V': Toggle In-App Virtual Screen Overlay
      if (!isInput && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        setShowInAppProjector((prev) => !prev);
        return;
      }

      // '?' (Shift + '/'): Toggle Keyboard Shortcuts & Studio Guide modal
      if (!isInput && (e.key === '?' || (e.shiftKey && e.key === '/'))) {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleMasterBlackout, setActiveScreen, showShortcutsModal]);

  const handleLaunchProjector = (inApp = false) => {
    const isVirtual =
      Boolean(globalSettings?.virtualScreenEnabled) ||
      selectedOutputDisplay?.startsWith('Virtual Screen');
    const virtualTarget = globalSettings?.virtualScreenTarget || 'in-app';
    const virtualRes = globalSettings?.virtualScreenResolution || '1920x1080';

    if (inApp || (isVirtual && virtualTarget === 'in-app')) {
      setShowInAppProjector(true);
      if (isVirtual) {
        showToast(`Virtual Screen Active (${virtualRes} In-App Overlay)`);
      }
      return;
    }
    try {
      const [w, h] = virtualRes.split('x').map(Number);
      const winW = isVirtual ? Math.min(w || 1280, 1280) : 1280;
      const winH = isVirtual ? Math.min(h || 720, 720) : 720;
      const url = isVirtual
        ? `/?projector=true&virtual=true&res=${virtualRes}`
        : '/?projector=true';
      const popout = window.open(
        url,
        'MarshallProjectorOutput',
        `width=${winW},height=${winH},menubar=no,toolbar=no,location=no,status=no`
      );
      if (!popout || popout.closed || typeof popout.closed === 'undefined') {
        setShowInAppProjector(true);
      } else if (isVirtual) {
        showToast(`Launched Virtual Screen Window (${virtualRes})`);
      }
    } catch {
      setShowInAppProjector(true);
    }
  };

  const handleTakeOverScreens = async () => {
    const isVirtual =
      Boolean(globalSettings?.virtualScreenEnabled) ||
      selectedOutputDisplay?.startsWith('Virtual Screen');

    if (isVirtual) {
      handleLaunchProjector(globalSettings?.virtualScreenTarget !== 'popout');
      return;
    }

    const anyWin = window as any;
    let screenDetails: any = null;

    if (typeof anyWin.getScreenDetails === 'function') {
      try {
        screenDetails = await anyWin.getScreenDetails();
      } catch (err) {
        console.warn('getScreenDetails access error:', err);
      }
    }

    const availableScreens = screenDetails?.screens || [];
    const externalScreens = availableScreens.filter((s: any) => !s.isPrimary);

    // Target secondary projectors (Screens 2, 3, 4)
    const targetProjectors = ['proj-1', 'proj-2', 'proj-3'];

    targetProjectors.forEach((projId, idx) => {
      const targetScreen = externalScreens[idx] || (availableScreens.length > 1 ? availableScreens[idx + 1] : null);
      let features = 'menubar=no,toolbar=no,location=no,status=no,resizable=yes';

      if (targetScreen) {
        const left = targetScreen.availLeft ?? targetScreen.left ?? 0;
        const top = targetScreen.availTop ?? targetScreen.top ?? 0;
        const width = targetScreen.availWidth ?? targetScreen.width ?? 1920;
        const height = targetScreen.availHeight ?? targetScreen.height ?? 1080;
        features += `,left=${left},top=${top},width=${width},height=${height}`;
      } else {
        // Offset cascading coordinates in windowed simulation
        features += `,left=${150 + idx * 340},top=${100 + idx * 60},width=1280,height=720`;
      }

      const pop = window.open(`/?projector=true&proj=${projId}&fullscreen=auto`, `LumenProjector_${projId}`, features);
      if (pop && targetScreen) {
        try {
          pop.moveTo(targetScreen.availLeft ?? targetScreen.left, targetScreen.availTop ?? targetScreen.top);
        } catch {}
      }
    });

    showToast('Taking over Screens 2–4: Dispatched 3 synchronized fullscreen feeds');
  };

  const handleBrandClick = () => {
    if (activeScreen === 1) return;
    if (projectStateBadge === 'Unsaved') {
      unsavedDialogRef.current?.showModal();
    } else {
      setActiveScreen(1);
    }
  };

  const handleUnsavedDialogClose = () => {
    const dialog = unsavedDialogRef.current;
    if (!dialog) return;
    const action = dialog.returnValue;
    dialog.returnValue = '';
    if (action === 'save') {
      saveCurrentProject();
      setActiveScreen(1);
    } else if (action === 'discard') {
      setActiveScreen(1);
    }
  };

  const openSaveAsModal = () => {
    setCloneName(`${activeProjectName} (Clone)`);
    saveAsDialogRef.current?.showModal();
  };

  const handleSaveAsDialogClose = () => {
    const dialog = saveAsDialogRef.current;
    if (!dialog) return;
    const action = dialog.returnValue;
    dialog.returnValue = '';
    if (action === 'confirm' && cloneName.trim()) {
      saveProjectAs(cloneName.trim());
    }
  };

  return (
    <>
      <header className="w-full bg-[#101623] border-b border-[#202b3d] flex flex-col select-none shrink-0 z-30 shadow-lg">
        {/* ROW 1: Brand Title, Project Actions, Projector Launcher & Hardware/AI Telemetry (Auto-wrapping double-stack on narrower screens) */}
        <div className="min-h-[48px] w-full px-4 py-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[#1b2535]">
          {/* Row 1 Left: Brand Logo + Active Project Info + Actions */}
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            {/* Brand Button */}
            <button
              type="button"
              onClick={handleBrandClick}
              title="Return to Screen 1 (Home Screen)"
              className="flex items-center gap-2 group focus:outline-none rounded-md px-1.5 py-1 hover:bg-slate-800/60 transition-colors shrink-0"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/50 flex items-center justify-center shadow-[0_0_12px_rgba(37,115,240,0.35)] group-hover:border-cyan-400 transition-colors">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[17px] font-extrabold tracking-wider text-slate-100 whitespace-nowrap">
                  LUMEN-MAP
                </span>
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest -translate-y-1">
                  AI
                </span>
                <span className="text-xs font-mono text-slate-400">v3.5</span>
              </div>
            </button>

            <div className="h-5 w-[1px] bg-[#243046] shrink-0 hidden sm:block" />

            {/* Active Project Info & Save State */}
            <div className="flex items-center gap-1.5 min-w-0 shrink-0 bg-[#141c2b] px-2.5 py-1 rounded border border-[#223049]">
              <span className="text-[11px] font-bold tracking-wide text-slate-400 whitespace-nowrap">
                PROJ:
              </span>
              <span className="text-xs font-semibold text-white max-w-[180px] sm:max-w-[240px] truncate" title={activeProjectName}>
                {activeProjectName}
              </span>
              {projectStateBadge === 'Saved' && (
                <span className="text-[11px] font-mono font-semibold text-emerald-400 whitespace-nowrap">
                  [Saved]
                </span>
              )}
              {projectStateBadge === 'Unsaved' && (
                <span className="text-[11px] font-mono font-semibold text-amber-400 whitespace-nowrap">
                  [Unsaved*]
                </span>
              )}
              {projectStateBadge === 'Live' && (
                <span className="text-[11px] font-mono font-bold text-emerald-400 animate-pulse whitespace-nowrap">
                  [Live]
                </span>
              )}
            </div>

            {/* Project Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              {activeScreen !== 1 && (
                <button
                  type="button"
                  onClick={navigateBack}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#1c2637] hover:bg-[#25334a] border border-cyan-500/60 hover:border-cyan-400 text-[11px] font-extrabold tracking-wider text-cyan-300 hover:text-white uppercase transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)] cursor-pointer whitespace-nowrap"
                  title="Go back to previous screen (Alt+Left)"
                  aria-label="Back to Previous Screen"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
                  <span>BACK</span>
                </button>
              )}

              <button
                type="button"
                onClick={saveCurrentProject}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/70 hover:border-emerald-400 text-[11px] font-extrabold tracking-wider text-emerald-300 hover:text-white uppercase transition-all shadow-[0_0_10px_rgba(16,185,129,0.25)] cursor-pointer whitespace-nowrap"
                title="Save Current Project (Ctrl+S)"
                aria-label="Save Project"
              >
                <Save className="w-3.5 h-3.5 text-emerald-400" />
                <span>SAVE</span>
              </button>

              <button
                type="button"
                onClick={openSaveAsModal}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#1f283a] hover:bg-[#2a364e] border border-[#32405a] text-[11px] font-bold tracking-wider text-slate-200 hover:text-white uppercase transition-colors whitespace-nowrap"
                title="Save project under a new name"
              >
                <FolderPlus className="w-3 h-3 text-slate-300" />
                <span>SAVE AS...</span>
              </button>

              <button
                type="button"
                onClick={exportShowPackage}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#1f283a] hover:bg-[#2a364e] border border-[#32405a] text-[11px] font-bold tracking-wider text-slate-200 hover:text-white uppercase transition-colors whitespace-nowrap"
                title="Export complete standalone show package archive"
              >
                <PackageCheck className="w-3 h-3 text-cyan-400" />
                <span>EXPORT PACKAGE</span>
              </button>
            </div>
          </div>

          {/* Row 1 Right: Output Launch, Hardware/AI Telemetry & Help/Tutorial */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {masterBlackout && (
              <button
                type="button"
                onClick={() => toggleMasterBlackout(false)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-600/20 border border-red-500 text-red-400 text-[11px] font-mono font-bold animate-pulse whitespace-nowrap"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                BLACKOUT ACTIVE [ESC]
              </button>
            )}

            {/* Sleek LAUNCH PROJECTOR OUTPUT Split Button */}
            <div className="flex items-center rounded-lg bg-gradient-to-r from-blue-600 via-cyan-500 to-amber-400 p-[1px] shadow-[0_0_12px_rgba(6,182,212,0.3)] hover:shadow-[0_0_18px_rgba(6,182,212,0.5)] transition-all shrink-0">
              <button
                type="button"
                onClick={() => handleLaunchProjector(false)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-l-lg bg-[#0e1626]/95 hover:bg-[#131f36]/95 text-white text-[11px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap"
                title="Launch Secondary Screen Projector Output (Pop-out Window /?projector=true)"
              >
                <MonitorUp className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>LAUNCH PROJECTOR</span>
              </button>
              <div className="w-[1px] h-5 bg-cyan-500/40" />
              <button
                type="button"
                onClick={handleTakeOverScreens}
                className="px-2 py-1 bg-[#0e1626]/95 hover:bg-[#131f36]/95 text-amber-300 hover:text-white text-[10px] font-extrabold uppercase transition-colors cursor-pointer whitespace-nowrap"
                title="Take Over Displays: Dispatches synchronized fullscreen outputs mapped to physical Screens 2, 3, and 4"
              >
                SCREENS 2–4
              </button>
              <div className="w-[1px] h-5 bg-cyan-500/40" />
              <button
                type="button"
                onClick={() => handleLaunchProjector(true)}
                className="px-2 py-1 rounded-r-lg bg-[#0e1626]/95 hover:bg-[#131f36]/95 text-cyan-300 hover:text-white text-[10px] font-bold uppercase transition-colors cursor-pointer whitespace-nowrap"
                title="Toggle In-App Projector Preview Overlay"
              >
                PREVIEW
              </button>
            </div>

            {/* Projector Hardware Telemetry Badge */}
            <div className="bg-[#141b28] border border-[#263246] rounded-md px-2.5 py-1 flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    masterBlackout
                      ? 'bg-red-500'
                      : 'bg-emerald-400 shadow-[0_0_6px_#10b981]'
                  }`}
                />
                <span className="text-[11px] font-bold tracking-wide text-slate-200 whitespace-nowrap">
                  PROJ 1:{' '}
                  <span className="font-normal text-slate-300">
                    1080p@60Hz
                  </span>
                </span>
              </div>
              <div className="w-[1px] h-3.5 bg-[#263246]" />
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                  GPU {gpuUtilization}%
                </span>
                <div className="w-10 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${gpuUtilization}%` }}
                  />
                </div>
              </div>
            </div>

            {/* AI Engine Status Telemetry Badge with Live Tooltip */}
            <div
              className="bg-[#141b28] border border-[#263246] hover:border-cyan-500/50 rounded-md px-2.5 py-1 flex items-center gap-1.5 relative group cursor-help transition-colors shrink-0"
              title={`Backend Engine: ${
                backendTelemetry?.engine_version || 'LUMEN-MAP AI v3.5'
              }\nOpenCV: ${
                backendTelemetry?.opencv_available
                  ? `Online (v${backendTelemetry.opencv_version || '4.10.0'})`
                  : 'Client Fallback'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  aiEngineOnline
                    ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]'
                    : 'bg-amber-400'
                }`}
              />
              <span className="text-[11px] font-bold tracking-wide text-slate-200 whitespace-nowrap">
                AI:{' '}
                <span className="text-emerald-400 font-bold">
                  {aiEngineOnline ? 'ONLINE' : 'STANDBY'}
                </span>
              </span>
              <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                {vramUsedGb.toFixed(1)}/{vramTotalGb.toFixed(0)}GB
              </span>

              {/* Live Hover Tooltip Dropdown */}
              <div className="absolute top-[110%] right-0 w-64 p-2.5 rounded-lg bg-[#0e1625] border border-cyan-500/40 shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 text-[10px] font-mono space-y-1">
                <div className="text-cyan-300 font-bold text-[11px] uppercase pb-1 border-b border-slate-700/60 flex items-center justify-between">
                  <span>FastAPI + CV Backend</span>
                  <span className="text-emerald-400">
                    {backendTelemetry?.opencv_available
                      ? 'CV2 ACTIVE'
                      : 'FALLBACK'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Engine:</span>
                  <span className="text-white truncate max-w-[140px] text-right">
                    {backendTelemetry?.engine_version || 'v3.5 Native'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">OpenCV:</span>
                  <span
                    className={
                      backendTelemetry?.opencv_available
                        ? 'text-emerald-400 font-bold'
                        : 'text-amber-400 font-bold'
                    }
                  >
                    {backendTelemetry?.opencv_available
                      ? `v${backendTelemetry.opencv_version || '4.10.0'}`
                      : 'Client CPU Math'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="text-slate-200 uppercase font-semibold">
                    {backendTelemetry?.status || 'online'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Discovered Assets:</span>
                  <span className="text-cyan-300">
                    {backendTelemetry?.discovered_assets?.total_videos ?? 6} vids /{' '}
                    {backendTelemetry?.discovered_assets?.total_audio ?? 8} audio
                  </span>
                </div>
              </div>
            </div>

            {/* AI Generation Provider Settings Quick Toggle Button */}
            <button
              type="button"
              onClick={() => setAiSettingsModalOpen(true)}
              title={`Configure AI Generation Provider (Currently: ${aiProviderConfig.activeProvider.toUpperCase()})`}
              className="h-7 px-2.5 rounded-md bg-[#141b28] hover:bg-[#1d2638] border border-[#263246] hover:border-cyan-500/60 flex items-center gap-1.5 text-slate-200 hover:text-cyan-300 transition-all cursor-pointer group shadow-sm shrink-0"
            >
              <Cpu className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-45 transition-transform" />
              <div className="flex items-baseline gap-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  MODEL:
                </span>
                <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wide">
                  {aiProviderConfig.activeProvider}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              title="Fuzzy Command Palette & Red-Light Night Vision (Ctrl+K)"
              className="h-7 px-2.5 rounded-md bg-gradient-to-r from-cyan-950/80 to-blue-950/80 hover:from-cyan-900 hover:to-blue-900 border border-cyan-500/60 hover:border-cyan-400 flex items-center gap-1.5 text-cyan-200 hover:text-white transition-all cursor-pointer shadow-sm shrink-0"
            >
              <Command className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px] font-extrabold">Ctrl+K</span>
            </button>

            {/* Holiday In a Box 1-Click Starter Shows */}
            <button
              type="button"
              data-tour-id="tour-starter-shows"
              onClick={() => setIsStarterPacksModalOpen(true)}
              title="Holiday In a Box — Load complete 1-click Starter Shows (Halloween, Christmas, NYE, Indoor Party)"
              className="h-7 px-2.5 rounded-md bg-gradient-to-r from-amber-500/25 to-emerald-500/25 hover:from-amber-500/45 hover:to-emerald-500/45 border border-amber-400/70 hover:border-amber-300 flex items-center gap-1.5 text-amber-200 hover:text-white transition-all cursor-pointer shadow-sm shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-[11px] font-extrabold uppercase tracking-wide">
                Starter Shows
              </span>
            </button>

            {/* Interactive Spotlight Guided Tour */}
            <button
              type="button"
              onClick={() => {
                setSpotlightTourStep(0);
                setIsSpotlightTourActive(true);
              }}
              title="Start Interactive On-Screen 5-Step Spotlight Tour for Beginners"
              className="h-7 px-2.5 rounded-md bg-cyan-600/25 hover:bg-cyan-600/45 border border-cyan-400/70 hover:border-cyan-300 flex items-center gap-1.5 text-cyan-200 hover:text-white transition-all cursor-pointer shadow-sm shrink-0"
            >
              <Compass className="w-3.5 h-3.5 text-cyan-300" />
              <span className="text-[11px] font-extrabold uppercase tracking-wide">
                Guided Tour
              </span>
            </button>

            {/* Interactive Beginner Sample Show Walkthrough Button */}
            <button
              type="button"
              onClick={() => {
                setTutorialWalkthroughStep(0);
                setIsTutorialWalkthroughOpen(true);
              }}
              title="Launch Interactive Step-by-Step Sample Show Tutorial for New Users"
              className="h-7 px-2.5 rounded-md bg-emerald-600/25 hover:bg-emerald-600/45 border border-emerald-400/70 hover:border-emerald-300 flex items-center gap-1.5 text-emerald-200 hover:text-white transition-all cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.25)] shrink-0"
            >
              <GraduationCap className="w-3.5 h-3.5 text-emerald-300" />
              <span className="text-[11px] font-extrabold uppercase tracking-wide">
                Tutorial
              </span>
            </button>

            {/* Studio Keyboard Shortcuts & Hotkeys (?) Button */}
            <button
              type="button"
              onClick={() => setShowShortcutsModal(true)}
              title="Studio Keyboard Shortcuts & Hotkeys (?)"
              className="w-7 h-7 rounded-md bg-[#141b28] hover:bg-[#1f293a] border border-[#263246] hover:border-cyan-500/50 flex items-center justify-center text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer group shrink-0"
              aria-label="Studio Keyboard Shortcuts & Hotkeys (?)"
            >
              <HelpCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>

        {/* ROW 2: Dedicated Studio Tools & Wizards Bar (Simplified automatically in Express Mode) */}
        <div className="min-h-[38px] w-full px-4 py-1.5 bg-[#0d131f] border-b border-[#1b2535] flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 bg-[#141c2c] border border-[#23314a] px-2 py-0.5 rounded mr-1 shrink-0">
            {activeStudioMode === 'express' ? 'Quick Tools:' : 'Studio Tools:'}
          </span>

          <button
            type="button"
            data-tour-id="tour-fit-video"
            onClick={() => setIsFitVideoModalOpen(true)}
            title="Fit Video to House — Map single video across house shapes with zero overhang (§22-A..22-E)"
            className="h-7 px-2.5 rounded-md bg-[#141b28] hover:bg-[#1d2638] border border-[#263246] hover:border-sky-500/60 flex items-center gap-1.5 text-slate-200 hover:text-sky-300 transition-all cursor-pointer shadow-sm shrink-0"
          >
            <Film className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[11px] font-bold whitespace-nowrap">Fit Video</span>
          </button>

          {activeStudioMode !== 'express' && (
            <button
              type="button"
              onClick={() => setIsExportStencilModalOpen(true)}
              title="Export House Stencil — High-res filled mask & outline for AI video generators (§22-F)"
              className="h-7 px-2.5 rounded-md bg-[#141b28] hover:bg-[#1d2638] border border-[#263246] hover:border-indigo-500/60 flex items-center gap-1.5 text-slate-200 hover:text-indigo-300 transition-all cursor-pointer shadow-sm shrink-0"
            >
              <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[11px] font-bold whitespace-nowrap">Stencil</span>
            </button>
          )}

          <button
            type="button"
            data-tour-id="tour-warp-calib"
            onClick={() => setIsMapRecalibrationModalOpen(true)}
            title="Global Map Warp (W), Two-Tier Recalibration, Holes Outliner & Geometry Classifier"
            className="h-7 px-2.5 rounded-md bg-[#141b28] hover:bg-[#1d2638] border border-[#263246] hover:border-amber-500/60 flex items-center gap-1.5 text-slate-200 hover:text-amber-300 transition-all cursor-pointer shadow-sm shrink-0"
          >
            <Crosshair className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-bold whitespace-nowrap">Warp &amp; Calib</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSceneLibraryModalOpen(true)}
            title="Scene Library (.mpsscenes), Holiday Auto-Decorate, Shaders & 11-Node FX Graph"
            className="h-7 px-2.5 rounded-md bg-[#141b28] hover:bg-[#1d2638] border border-[#263246] hover:border-emerald-500/60 flex items-center gap-1.5 text-slate-200 hover:text-emerald-300 transition-all cursor-pointer shadow-sm shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-bold whitespace-nowrap">Scenes &amp; FX</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAutoShowKaraokeModalOpen(true)}
            title="One-Button Auto-Show Generator, Word-Level Karaoke (.srt/.vtt) & xLights .xtiming Bridge"
            className="h-7 px-2.5 rounded-md bg-[#141b28] hover:bg-[#1d2638] border border-[#263246] hover:border-fuchsia-500/60 flex items-center gap-1.5 text-slate-200 hover:text-fuchsia-300 transition-all cursor-pointer shadow-sm shrink-0"
          >
            <Music className="w-3.5 h-3.5 text-fuchsia-400" />
            <span className="text-[11px] font-bold whitespace-nowrap">Auto-Show</span>
          </button>

          {activeStudioMode !== 'express' && (
            <>
              <button
                type="button"
                onClick={() => setIsRunNightRehearsalModalOpen(true)}
                title="Evening Rehearsal Simulator (--rehearse-evening), Pre-Show Preflight, Launch Pad & Native .mps* Bridge"
                className="h-7 px-2.5 rounded-md bg-gradient-to-r from-amber-600/30 to-rose-600/30 hover:from-amber-600/50 hover:to-rose-600/50 border border-amber-500/60 hover:border-amber-400 flex items-center gap-1.5 text-amber-200 hover:text-white transition-all cursor-pointer shadow-sm shrink-0"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-extrabold whitespace-nowrap">Rehearsal</span>
              </button>

              <div className="h-4 w-[1px] bg-[#263246] mx-0.5 shrink-0 hidden sm:block" />

              <button
                type="button"
                onClick={() => setIsProjectorRigModalOpen(true)}
                title="Multi-Projector Rig & Edge Blending Studio (.mpsrig) — Canvas arrangement, overlap curves, 3x3 warp mesh, lamp hours"
                className="h-7 px-2.5 rounded-md bg-[#141b28] hover:bg-[#1d2638] border border-[#263246] hover:border-cyan-500/60 flex items-center gap-1.5 text-slate-200 hover:text-cyan-300 transition-all cursor-pointer shadow-sm shrink-0"
              >
                <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px] font-bold whitespace-nowrap">Rig &amp; Blend</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDmxWledModalOpen(true)}
                title="DMX Art-Net & WLED Pixel Light Synchronization — Physical moving heads, RGB floods, WLED strips & 512-ch heat map"
                className="h-7 px-2.5 rounded-md bg-[#141b28] hover:bg-[#1d2638] border border-[#263246] hover:border-amber-500/60 flex items-center gap-1.5 text-slate-200 hover:text-amber-300 transition-all cursor-pointer shadow-sm shrink-0"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-bold whitespace-nowrap">DMX / WLED</span>
              </button>

              <button
                type="button"
                onClick={() => setIsLiveAudioMidiModalOpen(true)}
                title="Live Audio-Reactive Spectrum Analyzer & Web MIDI Studio — 2048-pt FFT 5-band analysis & USB launchpad mapping"
                className="h-7 px-2.5 rounded-md bg-[#141b28] hover:bg-[#1d2638] border border-[#263246] hover:border-rose-500/60 flex items-center gap-1.5 text-slate-200 hover:text-rose-300 transition-all cursor-pointer shadow-sm shrink-0"
              >
                <Radio className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-[11px] font-bold whitespace-nowrap">Live Audio &amp; MIDI</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsTestPatternsModalOpen(true)}
            title="Projector Calibration Test Patterns & Douglas-Peucker Simplifier — 10 optical patterns & RDP contour optimizer"
            className="h-7 px-2.5 rounded-md bg-[#141b28] hover:bg-[#1d2638] border border-[#263246] hover:border-emerald-500/60 flex items-center gap-1.5 text-slate-200 hover:text-emerald-300 transition-all cursor-pointer shadow-sm shrink-0"
          >
            <Grid className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-bold whitespace-nowrap">Test Patterns</span>
          </button>

          {activeStudioMode !== 'express' && (
            <>
              <div className="h-4 w-[1px] bg-[#263246] mx-0.5 shrink-0 hidden sm:block" />

              <button
                type="button"
                onClick={() => setIsOpticsCalculatorOpen(true)}
                title="Projector Throw & Lens Optics Calculator"
                className="h-7 px-2.5 rounded-md bg-[#141b28] hover:bg-[#1d2638] border border-[#263246] hover:border-amber-500/60 flex items-center gap-1.5 text-slate-300 hover:text-amber-300 transition-all cursor-pointer shadow-sm shrink-0"
              >
                <Calculator className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-bold whitespace-nowrap">Optics Calc</span>
              </button>

              <button
                type="button"
                onClick={() => setIsStemSplitterOpen(true)}
                title="AI 4-Stem Audio Separator & EQ Mixer"
                className="h-7 px-2.5 rounded-md bg-[#141b28] hover:bg-[#1d2638] border border-[#263246] hover:border-cyan-500/60 flex items-center gap-1.5 text-slate-300 hover:text-cyan-300 transition-all cursor-pointer shadow-sm shrink-0"
              >
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px] font-bold whitespace-nowrap">Stems</span>
              </button>

              <button
                type="button"
                onClick={() => setIsBatchRenderModalOpen(true)}
                title="Overnight Batch AI Video Render Queue"
                className="h-7 px-2.5 rounded-md bg-[#141b28] hover:bg-[#1d2638] border border-[#263246] hover:border-fuchsia-500/60 flex items-center gap-1.5 text-slate-300 hover:text-fuchsia-300 transition-all cursor-pointer shadow-sm shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
                <span className="text-[11px] font-bold whitespace-nowrap">Batch Queue</span>
              </button>

              <button
                type="button"
                onClick={() => setIsMidiControllerModalOpen(true)}
                title="MIDI & Hardware Controller Mapper"
                className="h-7 px-2.5 rounded-md bg-[#141b28] hover:bg-[#1d2638] border border-[#263246] hover:border-emerald-500/60 flex items-center gap-1.5 text-slate-300 hover:text-emerald-300 transition-all cursor-pointer shadow-sm shrink-0"
              >
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-bold whitespace-nowrap">MIDI Map</span>
              </button>

              <button
                type="button"
                onClick={() => setIsHolidayAssetModalOpen(true)}
                title="Architectural Decal & Holiday Stencil Library"
                className="h-7 px-2.5 rounded-md bg-[#141b28] hover:bg-[#1d2638] border border-[#263246] hover:border-amber-500/60 flex items-center gap-1.5 text-slate-300 hover:text-amber-300 transition-all cursor-pointer shadow-sm shrink-0"
              >
                <Image className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-bold whitespace-nowrap">Assets</span>
              </button>

              <button
                type="button"
                onClick={() => setIsProjectTimeMachineModalOpen(true)}
                title="Project Time Machine & Snapshot History"
                className="h-7 px-2.5 rounded-md bg-[#141b28] hover:bg-[#1d2638] border border-[#263246] hover:border-blue-500/60 flex items-center gap-1.5 text-slate-300 hover:text-blue-300 transition-all cursor-pointer shadow-sm shrink-0"
              >
                <History className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px] font-bold whitespace-nowrap">History</span>
              </button>
            </>
          )}
        </div>

        {/* ROW 3: Dedicated Studio Workflow Screen Navigation Bar (Wraps cleanly without horizontal scrollbars) */}
        <div className="min-h-[42px] w-full px-4 py-1.5 bg-[#0a0f17] flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {/* Studio Mode Selector (Express vs Core 1-10 vs Pro 11-18) + Screen Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center bg-[#101725] p-0.5 rounded-md border border-[#212c3e] shrink-0 mr-1">
              <button
                type="button"
                onClick={() => setActiveStudioMode('express')}
                title="Beginner-friendly 4-Step Express Studio Mode"
                className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wide uppercase transition-all cursor-pointer ${
                  activeStudioMode === 'express'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Express
              </button>
              <button
                type="button"
                onClick={() => setActiveStudioMode('core')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wide uppercase transition-all cursor-pointer ${
                  activeStudioMode === 'core'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Core 1–10
              </button>
              <button
                type="button"
                onClick={() => setActiveStudioMode('pro')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wide uppercase transition-all cursor-pointer ${
                  activeStudioMode === 'pro'
                    ? 'bg-fuchsia-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pro 11–18
              </button>
            </div>

            {/* Screen Navigation Buttons (Express, Core, or Pro) */}
            <nav
              aria-label="Studio Workflow Navigation"
              className="flex flex-wrap items-center gap-1.5"
            >
              {(activeStudioMode === 'express'
                ? EXPRESS_SCREEN_LABELS
                : activeStudioMode === 'core'
                  ? SCREEN_SHORT_LABELS
                  : PRO_SCREEN_LABELS
              ).map((item) => {
                const isActive = activeScreen === item.id;
                const tourAttr =
                  item.id === 2
                    ? 'tour-screen-map'
                    : item.id === 7
                      ? 'tour-showtime'
                      : undefined;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-tour-id={tourAttr}
                    onClick={() => setActiveScreen(item.id)}
                    className={`px-3 py-1 rounded text-[11px] font-bold tracking-wide uppercase transition-all whitespace-nowrap shrink-0 flex items-center gap-1 cursor-pointer ${
                      isActive
                        ? activeStudioMode === 'pro'
                          ? 'bg-fuchsia-600 text-white shadow-[0_0_10px_rgba(217,70,239,0.6)] border border-fuchsia-400'
                          : activeStudioMode === 'express'
                            ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.6)] border border-emerald-400'
                            : 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.6)] border border-blue-400'
                        : 'bg-[#121824] text-slate-300 hover:text-white hover:bg-[#1a2334] border border-[#212c3e] hover:border-slate-500'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right: Active Screen Subtitle Context & Quick Switch Hint */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
              <span className="font-bold text-cyan-300 uppercase tracking-wide">
                SCREEN {SCREEN_DISPLAY_NUMBERS[activeScreen]}: {SCREEN_SUBTITLES[activeScreen]}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-[#121824] px-2 py-0.5 rounded border border-[#212c3e] whitespace-nowrap">
              Alt+1..0 to switch
            </span>
          </div>
        </div>
      </header>

      {/* Keyboard Shortcuts & Studio Guide Modal */}
      {showShortcutsModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowShortcutsModal(false)}
        >
          <div
            className="bg-[#131b2a] border border-[#273852] rounded-xl max-w-xl w-full p-6 shadow-2xl flex flex-col gap-4 text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#23314d]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center">
                  <Keyboard className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold uppercase tracking-wider text-white">
                    Studio Keyboard Shortcuts &amp; Hotkeys
                  </h3>
                  <p className="text-xs text-slate-400">
                    High-efficiency hotkeys across all 8 LUMEN-MAP AI screens
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="p-1.5 rounded-lg bg-[#1a2336] hover:bg-[#25324d] text-slate-400 hover:text-white transition-colors"
                title="Close shortcuts guide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {[
                {
                  keys: 'ESC',
                  desc: 'Master Emergency Blackout Toggle (0 IRE)',
                  scope: 'All Screens',
                },
                {
                  keys: 'Alt + 1..8',
                  desc: 'Instant Screen Navigation (Screens 1–8)',
                  scope: 'Global Navigation',
                },
                {
                  keys: 'V / P / R / A',
                  desc: 'Vector Tools: Select, Pen, Rectangle, Arc',
                  scope: 'Screen 2',
                },
                {
                  keys: 'Ctrl + Z / Ctrl + Y',
                  desc: 'Undo / Redo Vector Vertex Edits',
                  scope: 'Screen 2',
                },
                {
                  keys: 'Del / Backspace',
                  desc: 'Delete Selected Layer',
                  scope: 'Screen 2',
                },
                {
                  keys: 'Arrow Keys',
                  desc: '1px / 5px Sub-Pixel Alignment Nudge',
                  scope: 'Screen 6',
                },
                {
                  keys: 'F / F11',
                  desc: 'Toggle True Fullscreen Projector Output (ProjectorOutputView)',
                  scope: 'Projector',
                },
                {
                  keys: 'Mouse Wheel',
                  desc: 'Smooth Zoom In / Out up to 150% Overscan',
                  scope: 'All Canvases',
                },
                {
                  keys: '?',
                  desc: 'Toggle this Studio Hotkeys & Shortcuts Guide',
                  scope: 'Global',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#0e1522] border border-[#212d42] hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <kbd className="px-2.5 py-1 rounded bg-[#1b2537] border border-[#30415d] text-xs font-mono font-bold text-cyan-300 shadow-sm whitespace-nowrap">
                      {item.keys}
                    </kbd>
                    <span className="text-xs text-slate-200 font-medium">
                      {item.desc}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700 shrink-0">
                    {item.scope}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#23314d] text-xs text-slate-400">
              <span>
                Press <kbd className="font-mono text-cyan-300">?</kbd> anytime to
                toggle hotkey reference
              </span>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Native Modal Dialog: Unsaved State Confirmation on Brand Logo Click */}
      <dialog
        ref={unsavedDialogRef}
        onClose={handleUnsavedDialogClose}
        aria-labelledby="unsaved-dialog-title"
        className="bg-[#161e2e] text-slate-100 border border-[#2e3c56] rounded-xl p-6 shadow-2xl max-w-md w-full backdrop:bg-black/75"
      >
        <h2
          id="unsaved-dialog-title"
          className="text-base font-bold text-white flex items-center gap-2"
        >
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          Save Unsaved Project State?
        </h2>
        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
          Project <strong className="text-white">{activeProjectName}</strong> has
          unsaved changes. Would you like to serialize your vector hierarchies
          and alignment matrices before returning to Screen 1 (Home Screen)?
        </p>
        <form method="dialog" className="flex justify-end gap-2.5 mt-5">
          <button
            value="cancel"
            autoFocus
            className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-600"
          >
            Cancel
          </button>
          <button
            value="discard"
            className="px-3.5 py-1.5 rounded bg-red-950/60 hover:bg-red-900/70 text-xs font-semibold text-red-300 border border-red-800/70"
          >
            Discard
          </button>
          <button
            value="save"
            className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white"
          >
            Save &amp; Return Home
          </button>
        </form>
      </dialog>

      {/* Native Modal Dialog: Save As... Project Clone */}
      <dialog
        ref={saveAsDialogRef}
        onClose={handleSaveAsDialogClose}
        aria-labelledby="save-as-dialog-title"
        className="bg-[#161e2e] text-slate-100 border border-[#2e3c56] rounded-xl p-6 shadow-2xl max-w-md w-full"
      >
        <h2 id="save-as-dialog-title" className="text-base font-bold text-white">
          Save Project As...
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Clone the current show package, vector layers, and projector
          calibration under a new project file name.
        </p>
        <form method="dialog" className="mt-4">
          <label
            htmlFor="clone-project-name"
            className="block text-xs font-semibold text-slate-300 mb-1.5"
          >
            New Project File Name (.lumen)
          </label>
          <input
            id="clone-project-name"
            type="text"
            autoFocus
            value={cloneName}
            onChange={(e) => setCloneName(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[#0c1017] border border-[#2e3c56] text-sm text-white focus:outline-none focus:border-blue-500"
          />
          <div className="flex justify-end gap-2 mt-5">
            <button
              value="cancel"
              className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700"
            >
              Cancel
            </button>
            <button
              value="confirm"
              className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white"
            >
              Clone Project
            </button>
          </div>
        </form>
      </dialog>

      {/* In-App Projector Output Preview Overlay */}
      {showInAppProjector && (
        <ProjectorOutputView
          isPopout={false}
          onClose={() => setShowInAppProjector(false)}
        />
      )}
    </>
  );
};
