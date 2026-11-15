import React, { useEffect, useRef, useState } from 'react';
import {
  Plus,
  FolderOpen,
  PlayCircle,
  Settings,
  Play,
  SquarePen,
  Copy,
  Trash2,
  Projector,
  ExternalLink,
  X,
  Sparkles,
  Search,
  Upload,
  Download,
  Check,
  RefreshCw,
  Activity,
  Layers,
  Video,
  Save,
  Cpu,
  Clock,
  GraduationCap,
} from 'lucide-react';
import {
  AUSTIN_HOUSE_ASSETS,
  useProjectionStore,
} from '../store/useProjectionStore';
import { ArchitecturalHousePreview } from '../components/ArchitecturalHousePreview';
import { PreviewZoomControl } from '../components/PreviewZoomControl';
import {
  fetchBackendTelemetry,
  BackendTelemetryResponse,
} from '../utils/apiClient';
import {
  DraggableDivider,
  useResizableSidebar,
} from '../components/DraggableDivider';

export const STARTING_HOUSE_TEMPLATES = [
  {
    id: 'firehouse',
    title: 'Ghostbusters Firehouse & Ecto-1',
    description:
      'Classic red brick firehouse mapping with open garage bay and parked Ecto-1',
    photoUrl: AUSTIN_HOUSE_ASSETS.photos.v1EctoOpenGarage,
    videoUrl: AUSTIN_HOUSE_ASSETS.videos.v1Show,
    badge: 'Austin Primary Facade',
  },
  {
    id: 'slimer',
    title: 'Slimer Ectoplasm Breach',
    description:
      'Supernatural green ectoplasm breach with proton stream crossfire and dynamic fog',
    photoUrl: AUSTIN_HOUSE_ASSETS.photos.v4SlimerBreach,
    videoUrl: AUSTIN_HOUSE_ASSETS.videos.mainShow,
    badge: 'Action Sequence',
  },
  {
    id: 'tower',
    title: 'Ghostbusters HQ Tower',
    description:
      'Two-story architectural tower expansion with containment grid laser lines',
    photoUrl: AUSTIN_HOUSE_ASSETS.photos.v2FirehouseTower,
    videoUrl: AUSTIN_HOUSE_ASSETS.videos.v2Show,
    badge: 'Extended Architecture',
  },
  {
    id: 'pumpkins',
    title: 'Singing Pumpkins Patch',
    description:
      'Musical animated Jack-O-Lanterns mapped to porch, eaves, and bay windows',
    photoUrl: AUSTIN_HOUSE_ASSETS.photos.v3ClosedLogoGarage,
    videoUrl: AUSTIN_HOUSE_ASSETS.videos.pumpkins,
    badge: 'Musical Finale',
  },
];

export const Screen1Home: React.FC = () => {
  const {
    recentProjects,
    activeProjectId,
    selectedOutputDisplay,
    projectorTestPattern,
    testPatternType,
    purityColor,
    masterBlackout,
    globalSettings,
    activePreviewVideoUrl,
    layers,
    setActiveScreen,
    createNewHouseMappingProject,
    importShowPackage,
    openExistingProject,
    duplicateProject,
    deleteProject,
    setSelectedOutputDisplay,
    setProjectorTestPattern,
    setTestPatternType,
    setPurityColor,
    toggleMasterBlackout,
    updateGlobalSettings,
    setPhotoToLayoutParams,
    saveCurrentProject,
    exportShowPackage,
    showToast,
    aiProviderConfig,
    setAiSettingsModalOpen,
    setIsTutorialWalkthroughOpen,
    setTutorialWalkthroughStep,
    audioDelayMs,
    setAudioDelayMs,
    audioDelayTestActive,
    audioDelayTestFlash,
    setAudioDelayTestState,
  } = useProjectionStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const settingsDialogRef = useRef<HTMLDialogElement>(null);
  const newProjectDialogRef = useRef<HTMLDivElement>(null);
  const customPhotoInputRef = useRef<HTMLInputElement>(null);

  const [localSettings, setLocalSettings] = useState(globalSettings);
  const [quickMonitorZoom, setQuickMonitorZoom] = useState<number>(100);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('Austin House Mapping 2026');
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);

  // Search & Theme Filter Bar state
  const [searchQuery, setSearchQuery] = useState('');
  const [themeFilter, setThemeFilter] = useState<
    'ALL' | 'VICTORIAN' | 'LASER' | 'SPOOKY' | 'MODERN'
  >('ALL');

  // Custom House Photo Upload state
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | null>(null);
  const [customPhotoFileName, setCustomPhotoFileName] = useState('');

  // Quick-Output Monitor mode state: WIREFRAME vs LIVE VIDEO
  const [monitorMode, setMonitorMode] = useState<'WIREFRAME' | 'LIVE VIDEO'>('WIREFRAME');

  // Dynamic Draggable Left Sidebar Resizer
  const {
    width: leftSidebarWidth,
    handleDrag: handleDragLeftSidebar,
    resetWidth: resetLeftSidebarWidth,
  } = useResizableSidebar({
    defaultWidth: 190,
    minWidth: 150,
    maxWidth: 320,
    direction: 'left-to-right',
    storageKey: 'lumen_screen1_left_sidebar_w',
  });

  // Dynamic Draggable Right Sidebar Resizer
  const {
    width: rightSidebarWidth,
    handleDrag: handleDragRightSidebar,
    resetWidth: resetRightSidebarWidth,
  } = useResizableSidebar({
    defaultWidth: 300,
    minWidth: 220,
    maxWidth: 480,
    direction: 'right-to-left',
    storageKey: 'lumen_screen1_right_sidebar_w',
  });

  // Global Settings Backend Diagnostic Ping state
  const [backendPingData, setBackendPingData] = useState<BackendTelemetryResponse | null>(null);
  const [isPingingBackend, setIsPingingBackend] = useState(false);
  const [backendMode, setBackendMode] = useState<'checking' | 'online' | 'standalone'>('checking');

  useEffect(() => {
    let cancelled = false;
    fetchBackendTelemetry()
      .then((res) => {
        if (!cancelled) {
          setBackendMode(res ? 'online' : 'standalone');
          if (res) setBackendPingData(res);
        }
      })
      .catch(() => {
        if (!cancelled) setBackendMode('standalone');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Audio Delay Sync Test Loop: every 2.0s plays a 0.2s beep and flashes white for 0.2s on projectors
  useEffect(() => {
    if (!audioDelayTestActive) return;

    const playBeep = () => {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 1000;
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime + 0.01);
        gain.gain.setValueAtTime(0.28, ctx.currentTime + 0.18);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.21);
        window.setTimeout(() => {
          ctx.close().catch(() => {});
        }, 300);
      } catch {
        // Ignore audio context autoplay restrictions
      }
    };

    const childTimers: number[] = [];
    const schedulePulse = () => {
      const delay = audioDelayMs;
      const flashAt = delay < 0 ? Math.abs(delay) : 0;
      const beepAt = delay >= 0 ? delay : 0;

      childTimers.push(
        window.setTimeout(() => {
          setAudioDelayTestState(true, true);
          childTimers.push(
            window.setTimeout(() => {
              setAudioDelayTestState(true, false);
            }, 200)
          );
        }, flashAt)
      );

      childTimers.push(window.setTimeout(playBeep, beepAt));
    };

    schedulePulse();
    const intervalId = window.setInterval(schedulePulse, 2000);

    return () => {
      window.clearInterval(intervalId);
      childTimers.forEach((id) => window.clearTimeout(id));
    };
  }, [audioDelayTestActive, audioDelayMs, setAudioDelayTestState]);

  const activeVideoUrl =
    activePreviewVideoUrl || AUSTIN_HOUSE_ASSETS.videos.mainShow;

  const setReferencePhotoUrl = (url: string) => {
    setPhotoToLayoutParams({ customReferencePhotoUrl: url });
  };

  const handleOpenFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        importShowPackage(parsed);
      } catch {
        showToast(`Failed to parse show package file "${file.name}"`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCustomPhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCustomPhotoUrl(url);
    setCustomPhotoFileName(file.name);
    showToast(`Loaded custom photo "${file.name}"`);
    e.target.value = '';
  };

  const handlePingBackend = async () => {
    setIsPingingBackend(true);
    try {
      const data = await fetchBackendTelemetry();
      setBackendPingData(data);
      showToast(
        `Backend Ping: ${data.status} | OpenCV: ${
          data.opencv_available ? 'Online' : 'Fallback'
        } | ${data.discovered_assets?.total_videos ?? 0} videos`
      );
    } catch {
      showToast('Backend diagnostic ping failed (using client failover)');
    } finally {
      setIsPingingBackend(false);
    }
  };

  const openGlobalSettingsModal = () => {
    setLocalSettings(globalSettings);
    settingsDialogRef.current?.showModal();
  };

  const handleSettingsDialogClose = () => {
    const dialog = settingsDialogRef.current;
    if (!dialog) return;
    const action = dialog.returnValue;
    dialog.returnValue = '';
    if (action === 'save') {
      updateGlobalSettings(localSettings);
    }
  };

  // Filtered recent projects
  const filteredProjects = recentProjects.filter((project) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      project.title.toLowerCase().includes(q) ||
      project.themeStyle.toLowerCase().includes(q);
    const matchesTheme =
      themeFilter === 'ALL' ||
      project.themeStyle.toUpperCase() === themeFilter;
    return matchesSearch && matchesTheme;
  });

  return (
    <div className="flex-1 flex min-h-[calc(100vh-3.5rem)] bg-[#0d121b] text-slate-100 overflow-y-auto">
      {/* Hidden native OS file input for OPEN EXISTING SHOW */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".lumen,.json"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Hidden file input for CUSTOM HOUSE PHOTO UPLOAD */}
      <input
        ref={customPhotoInputRef}
        type="file"
        accept="image/*,.jfif"
        onChange={handleCustomPhotoSelected}
        className="hidden"
      />

      {/* LEFT PRIMARY NAVIGATION SIDEBAR */}
      <aside
        style={{ width: `${leftSidebarWidth}px` }}
        className="shrink-0 bg-[#101622] p-3.5 flex flex-col gap-3 select-none overflow-y-auto"
      >
        {/* 0. INTERACTIVE BEGINNER SAMPLE SHOW WALKTHROUGH */}
        <button
          type="button"
          onClick={() => {
            setTutorialWalkthroughStep(0);
            setIsTutorialWalkthroughOpen(true);
          }}
          className="w-full py-3.5 px-3 rounded-lg bg-gradient-to-r from-emerald-600/35 to-cyan-600/35 hover:from-emerald-600/55 hover:to-cyan-600/55 text-emerald-200 hover:text-white shadow-[0_0_16px_rgba(16,185,129,0.3)] border border-emerald-400/60 flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer group"
        >
          <GraduationCap className="w-7 h-7 text-emerald-300 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-extrabold tracking-wider leading-tight uppercase">
            STEP-BY-STEP
            <br />
            TUTORIAL GUIDE
          </span>
        </button>

        {/* 1. NEW HOUSE MAPPING PROJECT (Opens Template Selection Modal) */}
        <button
          type="button"
          onClick={() => setIsNewProjectModalOpen(true)}
          className="w-full py-5 px-3 rounded-lg bg-[#2573f0] hover:bg-[#1d64d8] active:bg-[#1956bc] text-white shadow-[0_4px_20px_rgba(37,115,240,0.4)] border border-blue-400/30 flex flex-col items-center justify-center text-center gap-2 transition-all group"
        >
          <Plus className="w-8 h-8 stroke-[2.5] text-white group-hover:scale-110 transition-transform" />
          <span className="text-[12px] font-extrabold tracking-wider leading-tight uppercase">
            NEW HOUSE
            <br />
            MAPPING PROJECT
          </span>
        </button>

        {/* 2. OPEN EXISTING SHOW */}
        <button
          type="button"
          onClick={handleOpenFileClick}
          className="w-full py-4 px-3 rounded-lg bg-[#1c2433] hover:bg-[#242f42] border border-[#2b364b] text-slate-200 flex flex-col items-center justify-center text-center gap-2 transition-colors"
        >
          <FolderOpen className="w-7 h-7 text-slate-300" />
          <span className="text-[11px] font-bold tracking-wider leading-tight uppercase">
            OPEN EXISTING
            <br />
            SHOW
          </span>
        </button>

        {/* 3. PROJECTOR SETUP & ARRAYS (Routes to Screen 8) */}
        <button
          type="button"
          onClick={() => setActiveScreen(8)}
          className="w-full py-4 px-3 rounded-lg bg-[#1c2433] hover:bg-[#242f42] border border-[#2b364b] text-slate-200 flex flex-col items-center justify-center text-center gap-2 transition-colors"
        >
          <Projector className="w-7 h-7 text-cyan-400" />
          <span className="text-[11px] font-bold tracking-wider leading-tight uppercase">
            PROJECTOR SETUP
            <br />
            &amp; ARRAYS
          </span>
        </button>

        {/* 4. QUICK LAUNCH PLAYLIST (Routes to Screen 6) */}
        <button
          type="button"
          onClick={() => setActiveScreen(6)}
          className="w-full py-4 px-3 rounded-lg bg-[#1c2433] hover:bg-[#242f42] border border-[#2b364b] text-slate-200 flex flex-col items-center justify-center text-center gap-2 transition-colors"
        >
          <PlayCircle className="w-7 h-7 text-slate-300" />
          <span className="text-[11px] font-bold tracking-wider leading-tight uppercase">
            QUICK LAUNCH
            <br />
            PLAYLIST
          </span>
        </button>

        {/* SAVE CURRENT PROJECT */}
        <button
          type="button"
          onClick={saveCurrentProject}
          className="w-full py-3.5 px-3 rounded-lg bg-emerald-600/25 hover:bg-emerald-600/40 border border-emerald-500/60 text-emerald-300 hover:text-white flex flex-col items-center justify-center text-center gap-1.5 transition-all shadow-[0_0_12px_rgba(16,185,129,0.2)] cursor-pointer"
          title="Save active show configuration to local storage"
        >
          <Save className="w-6 h-6 text-emerald-400" />
          <span className="text-[11px] font-extrabold tracking-wider leading-tight uppercase">
            SAVE CURRENT
            <br />
            PROJECT
          </span>
        </button>

        {/* AI PROVIDER CONFIG (Fal.ai, Replicate, RunwayML, ComfyUI) */}
        <button
          type="button"
          onClick={() => setAiSettingsModalOpen(true)}
          className="w-full py-3 px-3 rounded-lg bg-[#182232] hover:bg-[#202d42] border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-white flex flex-col items-center justify-center text-center gap-1.5 transition-all shadow-[0_0_12px_rgba(6,182,212,0.15)] cursor-pointer"
          title="Configure AI Generation Provider: Fal.ai, Replicate, RunwayML, ComfyUI"
        >
          <Cpu className="w-5 h-5 text-cyan-400" />
          <span className="text-[11px] font-extrabold tracking-wider leading-tight uppercase">
            AI PROVIDERS
            <br />
            <span className="text-[9px] font-mono text-emerald-400">
              [{aiProviderConfig.activeProvider.toUpperCase()}]
            </span>
          </span>
        </button>

        {/* 4.5. EXPORT SHOW BACKUP (.JSON) */}
        <button
          type="button"
          onClick={exportShowPackage}
          className="w-full py-2.5 px-3 rounded-lg bg-[#182232] hover:bg-[#202d42] border border-slate-600/60 hover:border-cyan-400 text-slate-200 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          title="Download full show backup (.lumen.json) to share with friends"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          <span className="text-[10px] font-extrabold tracking-wider uppercase">
            EXPORT BACKUP
          </span>
        </button>

        {/* PYTHON CV BACKEND / STANDALONE DEMO STATUS */}
        <div
          className={`w-full px-2.5 py-2 rounded-lg border text-center ${
            backendMode === 'online'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : backendMode === 'checking'
              ? 'bg-slate-900/60 border-slate-700 text-slate-400'
              : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
          }`}
          title="Indicates whether the local Python FastAPI + OpenCV backend is reachable or running in Browser-Only Demo Mode"
        >
          <div className="text-[9px] font-mono font-bold uppercase tracking-wider">
            {backendMode === 'online'
              ? 'PYTHON CV: ONLINE'
              : backendMode === 'checking'
              ? 'PYTHON CV: CHECKING...'
              : 'BROWSER-ONLY MODE'}
          </div>
          {backendMode === 'standalone' && (
            <div className="text-[8px] text-amber-200/80 mt-0.5 leading-tight">
              Client-side fallback active
            </div>
          )}
        </div>

        {/* 5. GLOBAL SETTINGS & CALIBRATION */}
        <button
          type="button"
          onClick={openGlobalSettingsModal}
          className="w-full py-4 px-3 rounded-lg bg-[#1c2433] hover:bg-[#242f42] border border-[#2b364b] text-slate-200 flex flex-col items-center justify-center text-center gap-2 transition-colors mt-auto"
        >
          <Settings className="w-7 h-7 text-slate-300" />
          <span className="text-[11px] font-bold tracking-wider leading-tight uppercase">
            GLOBAL SETTINGS
            <br />
            &amp; CALIBRATION
          </span>
        </button>
      </aside>

      {/* DRAGGABLE DIVIDER (RESIZE LEFT NAVIGATION SIDEBAR) */}
      <DraggableDivider
        onDrag={handleDragLeftSidebar}
        onReset={resetLeftSidebarWidth}
        title="Drag border left or right to resize Left Sidebar (Double-click to reset)"
      />

      {/* CENTER RECENT PROJECTS GRID */}
      <main className="flex-1 min-w-0 p-5 flex flex-col overflow-hidden">
        {/* New User Interactive Sample Show Walkthrough Banner */}
        <div className="mb-3.5 p-3 rounded-xl bg-gradient-to-r from-emerald-950/80 via-[#122238] to-cyan-950/80 border border-emerald-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                  New to LUMEN-MAP AI?
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  10 Guided Steps
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate">
                Learn what every screen, mask, and AI control does while building a complete 60-second Ghostbusters Firehouse sample show.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setTutorialWalkthroughStep(0);
              setIsTutorialWalkthroughOpen(true);
            }}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.4)] shrink-0 transition-all cursor-pointer"
          >
            Start Sample Show Walkthrough &rarr;
          </button>
        </div>

        {/* Project Search & Theme Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 bg-[#121927] p-2.5 rounded-lg border border-[#202c40]">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects by name or theme..."
              className="w-full pl-9 pr-8 py-1.5 rounded-md bg-[#0a0f18] border border-[#26354d] text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                title="Clear search query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Theme Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto select-none">
            {(['ALL', 'VICTORIAN', 'LASER', 'SPOOKY', 'MODERN'] as const).map(
              (filter) => {
                const isSelected = themeFilter === filter;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setThemeFilter(filter)}
                    className={`px-3 py-1 rounded text-[11px] font-bold tracking-wider uppercase transition-colors shrink-0 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,115,240,0.4)]'
                        : 'bg-[#182232] text-slate-300 hover:bg-[#202d42] hover:text-white border border-[#28374f]'
                    }`}
                  >
                    {filter}
                  </button>
                );
              }
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold tracking-wider uppercase text-slate-300">
              RECENT PROJECTS
            </h1>
            <button
              type="button"
              onClick={saveCurrentProject}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-600/25 hover:bg-emerald-600/40 border border-emerald-500/60 text-emerald-300 hover:text-white text-xs font-bold uppercase transition-all shadow-sm cursor-pointer"
              title="Save current project to storage"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              <span>SAVE PROJECT</span>
            </button>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Showing {filteredProjects.length} of {recentProjects.length} saved
            architectural mapping shows
          </span>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          {filteredProjects.length === 0 ? (
            <div className="h-64 rounded-xl border border-dashed border-[#26354d] bg-[#121927]/60 flex flex-col items-center justify-center gap-3 text-center p-6">
              <Search className="w-8 h-8 text-slate-500" />
              <p className="text-sm font-semibold text-slate-300">
                No projects matched your search criteria
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setThemeFilter('ALL');
                }}
                className="px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-xs font-bold uppercase text-white transition-colors"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProjects.map((project, idx) => {
                const isSelected = project.id === activeProjectId;
                return (
                  <article
                    key={project.id}
                    onClick={() => openExistingProject(project.id)}
                    className={`group relative rounded-lg bg-[#18202f] border transition-all cursor-pointer overflow-hidden flex flex-col ${
                      isSelected
                        ? 'border-blue-500/70 shadow-[0_0_20px_rgba(37,115,240,0.15)]'
                        : 'border-[#263147] hover:border-slate-500/70'
                    }`}
                  >
                    {/* Thumbnail Area */}
                    <div className="relative h-[196px] w-full overflow-hidden bg-[#0a0f18]">
                      <ArchitecturalHousePreview
                        variant={project.themeStyle}
                        imageUrl={project.thumbnailUrl}
                        videoUrl={project.videoUrl}
                        playVideoOnHover={true}
                        className="w-full h-full group-hover:scale-[1.02] transition-transform duration-300"
                      />

                      {/* Hover Action Overlay */}
                      <div
                        className={`absolute inset-y-0 right-0 w-[56%] bg-[#0f1623]/90 backdrop-blur-sm border-l border-slate-700/60 p-3.5 flex flex-col justify-center gap-3 transition-opacity duration-200 ${
                          idx === 1
                            ? 'opacity-95 group-hover:opacity-100'
                            : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="grid grid-cols-2 gap-2.5">
                          {/* Play -> Routes to Screen 7 */}
                          <button
                            type="button"
                            onClick={() => {
                              openExistingProject(project.id);
                              setActiveScreen(7);
                            }}
                            className="h-[68px] rounded-md bg-[#263145] hover:bg-emerald-600/90 border border-slate-600/70 hover:border-emerald-400 flex flex-col items-center justify-center gap-1.5 text-slate-100 transition-colors"
                          >
                            <Play className="w-5 h-5 fill-current" />
                            <span className="text-xs font-semibold">Play</span>
                          </button>

                          {/* Edit Layout -> Routes to Screen 2 */}
                          <button
                            type="button"
                            onClick={() => {
                              openExistingProject(project.id);
                              setActiveScreen(2);
                            }}
                            className="h-[68px] rounded-md bg-[#263145] hover:bg-blue-600/90 border border-slate-600/70 hover:border-blue-400 flex flex-col items-center justify-center gap-1.5 text-slate-100 transition-colors"
                          >
                            <SquarePen className="w-5 h-5" />
                            <span className="text-xs font-semibold">
                              Edit Layout
                            </span>
                          </button>
                        </div>

                        <div className="flex items-center justify-around pt-1">
                          <button
                            type="button"
                            onClick={() => duplicateProject(project.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Duplicate
                          </button>
                          {recentProjects.length > 1 && (
                            <button
                              type="button"
                              onClick={() => deleteProject(project.id)}
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Metadata Footer with Quick Duplicate / Delete Buttons */}
                    <div className="p-3.5 bg-[#1b2333] border-t border-[#263147] flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h2 className="text-[15px] font-bold text-slate-100 truncate">
                            {project.title}
                          </h2>
                          {isSelected && (
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 shrink-0">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-400 mt-1 gap-2">
                          <span className="truncate">Last Modified: {project.lastModified}</span>
                          <span
                            className="inline-flex items-center gap-1 font-mono font-bold text-cyan-300 bg-cyan-950/70 border border-cyan-800/60 px-2 py-0.5 rounded text-[11px] shrink-0 shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                            title={`Show Total Run Time: ${project.runTime || '03:45'}`}
                          >
                            <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                            <span>Run Time: {project.runTime || '03:45'}</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {project.alignedVideosCount} Aligned Videos /{' '}
                          {project.masksCount} Masks
                        </p>
                      </div>

                      {/* Direct action icons for fast project library management */}
                      <div
                        className="flex items-center gap-1.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => duplicateProject(project.id)}
                          title="Duplicate Project"
                          className="p-1.5 rounded-md bg-[#243044] hover:bg-[#2f3f59] text-slate-300 hover:text-white transition-colors"
                          aria-label="Duplicate project"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {recentProjects.length > 1 && (
                          <button
                            type="button"
                            onClick={() => deleteProject(project.id)}
                            title="Delete Project"
                            className="p-1.5 rounded-md bg-[#243044] hover:bg-red-950/80 text-slate-300 hover:text-red-400 border border-transparent hover:border-red-500/40 transition-colors"
                            aria-label="Delete project"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* DRAGGABLE DIVIDER (RESIZE QUICK-OUTPUT MONITOR) */}
      <DraggableDivider
        onDrag={handleDragRightSidebar}
        onReset={resetRightSidebarWidth}
        title="Drag border left or right to resize Quick-Output Monitor (Double-click to reset)"
      />

      {/* RIGHT QUICK-OUTPUT MONITOR */}
      <aside
        style={{ width: `${rightSidebarWidth}px` }}
        className="shrink-0 bg-[#111723] p-4 flex flex-col justify-between select-none overflow-y-auto"
      >
        <div>
          {/* Header with Mode Toggle: WIREFRAME vs LIVE VIDEO */}
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-sm font-bold tracking-wider uppercase text-slate-200">
              QUICK-OUTPUT
            </h2>
            <div className="flex items-center bg-[#0b1018] p-0.5 rounded-md border border-[#223046]">
              <button
                type="button"
                onClick={() => setMonitorMode('WIREFRAME')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase transition-all ${
                  monitorMode === 'WIREFRAME'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                WIREFRAME
              </button>
              <button
                type="button"
                onClick={() => setMonitorMode('LIVE VIDEO')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase transition-all ${
                  monitorMode === 'LIVE VIDEO'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                LIVE VIDEO
              </button>
            </div>
          </div>

          {/* Output Display Dropdown */}
          <div className="flex items-center gap-2.5 mb-2">
            <label
              htmlFor="quick-output-select"
              className="text-xs font-medium text-slate-400 shrink-0"
            >
              Output:
            </label>
            <select
              id="quick-output-select"
              value={selectedOutputDisplay}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedOutputDisplay(val);
                if (val.startsWith('Virtual Screen')) {
                  const res = val.includes('1280x720') ? '1280x720' : '1920x1080';
                  updateGlobalSettings({
                    virtualScreenEnabled: true,
                    virtualScreenResolution: res,
                  });
                } else {
                  updateGlobalSettings({ virtualScreenEnabled: false });
                }
              }}
              className="flex-1 bg-[#1b2434] border border-[#2e3b52] rounded px-2.5 py-1.5 text-xs font-medium text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="HDMI 1 (1920x1080)">HDMI 1 (1920x1080)</option>
              <option value="HDMI 2 (1920x1080)">HDMI 2 (1920x1080)</option>
              <option value="1x2 Blend Array (3840x1080)">
                1x2 Blend Array (3840x1080)
              </option>
              <option value="2x2 Quad Matrix (3840x2160)">
                2x2 Quad Matrix (3840x2160)
              </option>
              <option value="Virtual Screen (1920x1080)">
                Virtual Screen (1920x1080)
              </option>
              <option value="Virtual Screen (1280x720)">
                Virtual Screen (1280x720)
              </option>
            </select>
          </div>

          {/* Output Display Actions */}
          <div className="flex flex-col gap-2 mb-3.5">
            {/* CONFIGURE MULTI-PROJECTOR ARRAY Link -> Routes to Screen 8 */}
            <button
              type="button"
              onClick={() => setActiveScreen(8)}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-cyan-400 hover:text-cyan-300 uppercase transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              CONFIGURE MULTI-PROJECTOR ARRAY
            </button>

            {/* POP OUT PROJECTOR WINDOW Button */}
            <button
              type="button"
              onClick={() => {
                const isVirtual =
                  globalSettings.virtualScreenEnabled ||
                  selectedOutputDisplay.startsWith('Virtual Screen');
                const res = globalSettings.virtualScreenResolution || '1920x1080';
                const [w, h] = res.split('x').map(Number);
                const winW = isVirtual ? Math.min(w || 1280, 1280) : 1280;
                const winH = isVirtual ? Math.min(h || 720, 720) : 720;
                window.open(
                  isVirtual
                    ? `/?projector=true&virtual=true&res=${res}`
                    : '/?projector=true',
                  'LumenMapProjectorOutput',
                  `width=${winW},height=${winH}`
                );
                showToast(
                  isVirtual
                    ? `Launched Virtual Screen (${res}) Window`
                    : 'Popped out Projector Output Window (1280x720)'
                );
              }}
              className="w-full py-2 px-3 rounded bg-[#1b2537] hover:bg-[#25324b] border border-cyan-500/40 text-[11px] font-bold tracking-wider text-cyan-300 flex items-center justify-center gap-2 transition-colors cursor-pointer uppercase shadow-sm"
            >
              <Projector className="w-3.5 h-3.5 text-cyan-400" />
              {globalSettings.virtualScreenEnabled ||
              selectedOutputDisplay.startsWith('Virtual Screen')
                ? `LAUNCH VIRTUAL SCREEN (${globalSettings.virtualScreenResolution || '1920x1080'})`
                : 'POP OUT PROJECTOR WINDOW'}
            </button>
          </div>

          {/* 16:9 Live Output Monitor with Zoom Out Control */}
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-400">
              Monitor Zoom:
            </span>
            <PreviewZoomControl
              zoom={quickMonitorZoom}
              onChange={setQuickMonitorZoom}
              compact
            />
          </div>
          <div
            onWheel={(e) => {
              e.preventDefault();
              const delta = e.deltaY < 0 ? 10 : -10;
              setQuickMonitorZoom((z) =>
                Math.max(25, Math.min(250, z + delta))
              );
            }}
            className="w-full aspect-video rounded-md overflow-hidden border border-[#2a364d] shadow-inner bg-[#050811] flex items-center justify-center relative"
          >
            <div
              className="w-full h-full transition-transform duration-150 border border-dashed border-cyan-500/45 relative"
              style={{ transform: `scale(${quickMonitorZoom / 100})` }}
            >
              {masterBlackout ? (
                <ArchitecturalHousePreview
                  variant="blackout"
                  className="w-full h-full"
                />
              ) : projectorTestPattern ? (
                <ArchitecturalHousePreview
                  variant="test-pattern"
                  className="w-full h-full"
                />
              ) : monitorMode === 'LIVE VIDEO' ? (
                <div className="relative w-full h-full bg-black overflow-hidden select-none">
                  <video
                    src={activeVideoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {/* Vector masks overlaid on top of live video */}
                  <svg
                    viewBox="0 0 1080 600"
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  >
                    {layers
                      .filter((l) => l.visible)
                      .map((l) => {
                        if (!l.vertices || l.vertices.length < 2) return null;
                        const pts = l.vertices
                          .map((v) => `${v.x},${v.y}`)
                          .join(' ');
                        const isBlackout = l.role === 'Hard Blackout Cutout';
                        return (
                          <polygon
                            key={l.id}
                            points={pts}
                            fill={
                              isBlackout
                                ? 'rgba(0,0,0,0.85)'
                                : `${l.color}25`
                            }
                            stroke={l.color || '#00f0ff'}
                            strokeWidth={2}
                            strokeDasharray={
                              l.role === 'Structural Guide Line'
                                ? '4 3'
                                : undefined
                            }
                          />
                        );
                      })}
                  </svg>
                  <div className="absolute top-1.5 left-2 px-1.5 py-0.5 rounded bg-black/75 border border-emerald-500/40 text-[9px] font-mono text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE VIDEO + {layers.filter((l) => l.visible).length} MASKS
                  </div>
                </div>
              ) : (
                <ArchitecturalHousePreview
                  variant="wireframe-monitor"
                  className="w-full h-full"
                />
              )}
            </div>
          </div>

          {/* PROJECTOR TEST PATTERN Toggle */}
          <label className="mt-4 flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={projectorTestPattern}
              onChange={(e) => setProjectorTestPattern(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-[#242f44] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 peer-checked:after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 relative shrink-0" />
            <span className="text-xs font-bold tracking-wide text-slate-300 group-hover:text-white leading-tight uppercase">
              PROJECTOR TEST PATTERN
              <br />
              <span className="text-[11px] text-cyan-400 font-semibold font-mono">
                {projectorTestPattern ? `[ACTIVE: ${testPatternType.toUpperCase()}]` : '(SMPTE, FOCUS & GRID)'}
              </span>
            </span>
          </label>

          {/* Interactive Calibration Test Pattern Selector */}
          {projectorTestPattern && (
            <div className="mt-3 p-2.5 rounded-lg bg-[#0e1625] border border-cyan-500/40 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300 font-bold uppercase">
                <span>Select Calibration Standard</span>
                <span className="text-emerald-400">1080p REC.709</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'smpte-bars', label: 'SMPTE Bars', desc: 'Color & PLUGE' },
                  { id: 'focus-star', label: 'Focus Star', desc: 'Optical Sharpness' },
                  { id: 'geometry-circles', label: 'Geometry', desc: 'Keystone Circles' },
                  { id: 'greyscale-ramp', label: '16-Step Grey', desc: 'Dynamic Range' },
                  { id: 'grid', label: 'Align Grid', desc: '100px Matrix' },
                  { id: 'color-purity', label: 'Color Purity', desc: 'Dead Pixel Check' },
                ].map((pat) => (
                  <button
                    key={pat.id}
                    type="button"
                    onClick={() => setTestPatternType(pat.id as any)}
                    className={`p-1.5 rounded text-left border transition-all ${
                      testPatternType === pat.id
                        ? 'bg-blue-600/40 border-cyan-400 text-white shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                        : 'bg-[#151f32] border-[#25334d] text-slate-300 hover:text-white hover:bg-[#1c2942]'
                    }`}
                  >
                    <div className="text-[11px] font-bold uppercase leading-tight">
                      {pat.label}
                    </div>
                    <div className="text-[9px] font-mono text-slate-400 leading-tight">
                      {pat.desc}
                    </div>
                  </button>
                ))}
              </div>

              {/* Color Swatches if Color Purity is Selected */}
              {testPatternType === 'color-purity' && (
                <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between gap-1">
                  <span className="text-[10px] font-mono text-slate-400">Field:</span>
                  {(
                    [
                      { id: 'white', label: 'WHT', bg: '#ffffff' },
                      { id: 'red', label: 'RED', bg: '#ff0000' },
                      { id: 'green', label: 'GRN', bg: '#00ff00' },
                      { id: 'blue', label: 'BLU', bg: '#0000ff' },
                      { id: 'cyan', label: 'CYN', bg: '#00ffff' },
                      { id: 'magenta', label: 'MAG', bg: '#ff00ff' },
                      { id: 'yellow', label: 'YEL', bg: '#ffff00' },
                    ] as const
                  ).map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => setPurityColor(col.id)}
                      title={`Full-field ${col.id.toUpperCase()}`}
                      className={`w-5 h-5 rounded-full border transition-all cursor-pointer ${
                        purityColor === col.id
                          ? 'scale-125 border-white ring-2 ring-cyan-400 shadow-md'
                          : 'border-slate-600 opacity-60 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: col.bg }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom MASTER BLACKOUT Button (ESC Panic Button) */}
        <div className="pt-4">
          <button
            type="button"
            onClick={() => toggleMasterBlackout()}
            className={`relative w-full py-5 px-4 rounded-lg font-extrabold text-sm tracking-wider uppercase transition-all border ${
              masterBlackout
                ? 'bg-red-950 border-red-500 text-red-200 shadow-[0_0_25px_rgba(239,68,68,0.65)] animate-pulse'
                : 'bg-[#c82829] hover:bg-[#dc2626] active:bg-[#b91c1c] border-red-400/40 text-white shadow-[0_6px_20px_rgba(200,40,41,0.45)]'
            }`}
          >
            <span className="absolute top-1.5 right-2 px-1.5 py-0.5 rounded bg-black/35 text-[10px] font-mono font-semibold text-red-100 border border-white/15">
              ESC
            </span>
            {masterBlackout ? 'RESTORE OUTPUT' : 'MASTER BLACKOUT'}
          </button>
        </div>
      </aside>

      {/* Native Modal Dialog: GLOBAL SETTINGS & CALIBRATION */}
      <dialog
        ref={settingsDialogRef}
        onClose={handleSettingsDialogClose}
        aria-labelledby="global-settings-title"
        className="bg-[#151d2c] text-slate-100 border border-[#2d3b55] rounded-xl p-6 shadow-2xl max-w-lg w-full"
      >
        <h2
          id="global-settings-title"
          className="text-base font-bold text-white flex items-center gap-2"
        >
          <Settings className="w-5 h-5 text-cyan-400" />
          Global Settings &amp; Calibration
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure low-latency audio routing, DMX/Art-Net hardware triggers,
          and AI video diffusion pipeline endpoints.
        </p>

        <form method="dialog" className="mt-4 space-y-3.5">
          <div>
            <label
              htmlFor="settings-audio"
              className="block text-xs font-semibold text-slate-300 mb-1"
            >
              Audio Output Interface
            </label>
            <input
              id="settings-audio"
              type="text"
              autoFocus
              value={localSettings.audioOutputDevice}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  audioOutputDevice: e.target.value,
                })
              }
              className="w-full px-3 py-1.5 rounded bg-[#0c1017] border border-[#2c3a52] text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label
                htmlFor="settings-dmx"
                className="block text-xs font-semibold text-slate-300 mb-1"
              >
                DMX / Art-Net Node IP:Port
              </label>
              <input
                id="settings-dmx"
                type="text"
                value={localSettings.dmxArtnetPort}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    dmxArtnetPort: e.target.value,
                  })
                }
                className="w-full px-3 py-1.5 rounded bg-[#0c1017] border border-[#2c3a52] text-xs text-white font-mono"
              />
            </div>
            <div>
              <label
                htmlFor="settings-universe"
                className="block text-xs font-semibold text-slate-300 mb-1"
              >
                DMX Universe
              </label>
              <input
                id="settings-universe"
                type="number"
                min={0}
                max={512}
                value={localSettings.dmxUniverse}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    dmxUniverse: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-1.5 rounded bg-[#0c1017] border border-[#2c3a52] text-xs text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="settings-backend"
              className="block text-xs font-semibold text-slate-300 mb-1"
            >
              Python FastAPI + OpenCV/ControlNet Backend URL
            </label>
            <input
              id="settings-backend"
              type="text"
              value={localSettings.aiBackendUrl}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  aiBackendUrl: e.target.value,
                })
              }
              className="w-full px-3 py-1.5 rounded bg-[#0c1017] border border-[#2c3a52] text-xs text-white font-mono"
            />
          </div>

          <div>
            <label
              htmlFor="settings-apikey"
              className="block text-xs font-semibold text-slate-300 mb-1"
            >
              AI Diffusion Engine API Key
            </label>
            <input
              id="settings-apikey"
              type="password"
              value={localSettings.aiApiKey}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  aiApiKey: e.target.value,
                })
              }
              className="w-full px-3 py-1.5 rounded bg-[#0c1017] border border-[#2c3a52] text-xs text-white font-mono"
            />
          </div>

          {/* Virtual Screen Output Settings */}
          <div className="pt-2 border-t border-[#232e42] space-y-2.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="settings-virtual-screen"
                className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2 cursor-pointer"
              >
                <input
                  id="settings-virtual-screen"
                  type="checkbox"
                  checked={Boolean(localSettings.virtualScreenEnabled)}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      virtualScreenEnabled: e.target.checked,
                    })
                  }
                  className="rounded border-slate-600 bg-[#0c1017] text-cyan-500 focus:ring-cyan-500"
                />
                Enable Virtual Screen Mode (No HDMI Required)
              </label>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                {localSettings.virtualScreenEnabled ? 'VIRTUAL ON' : 'HDMI HARDWARE'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="settings-virtual-res"
                  className="block text-[11px] font-semibold text-slate-400 mb-1"
                >
                  Virtual Screen Resolution
                </label>
                <select
                  id="settings-virtual-res"
                  value={localSettings.virtualScreenResolution || '1920x1080'}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      virtualScreenResolution: e.target.value as NonNullable<
                        typeof localSettings.virtualScreenResolution
                      >,
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded bg-[#0c1017] border border-[#2c3a52] text-xs text-white font-mono"
                >
                  <option value="1920x1080">1920x1080 (16:9 HD)</option>
                  <option value="1280x720">1280x720 (720p)</option>
                  <option value="3840x2160">3840x2160 (4K UHD)</option>
                  <option value="1080x1920">1080x1920 (9:16 Portrait)</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="settings-virtual-target"
                  className="block text-[11px] font-semibold text-slate-400 mb-1"
                >
                  Virtual Screen Target
                </label>
                <select
                  id="settings-virtual-target"
                  value={localSettings.virtualScreenTarget || 'in-app'}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      virtualScreenTarget: e.target.value as 'in-app' | 'popout',
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded bg-[#0c1017] border border-[#2c3a52] text-xs text-white"
                >
                  <option value="in-app">In-App Virtual Overlay</option>
                  <option value="popout">Detached Virtual Window</option>
                </select>
              </div>
            </div>
          </div>

          {/* Audio Delay & Sync Calibration Test Screen */}
          <div className="pt-2 border-t border-[#232e42] space-y-2.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="settings-audio-delay"
                className="text-xs font-bold text-slate-200 uppercase tracking-wide"
              >
                Audio Delay vs. Video (-1.00s to +3.00s)
              </label>
              <span className="text-xs font-mono font-bold text-cyan-300">
                {audioDelayMs >= 0 ? '+' : ''}
                {(audioDelayMs / 1000).toFixed(2)}s ({audioDelayMs} ms)
              </span>
            </div>
            <input
              id="settings-audio-delay"
              type="range"
              min={-1000}
              max={3000}
              step={25}
              value={audioDelayMs}
              onChange={(e) => setAudioDelayMs(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>-1.00s (Audio Early)</span>
              <button
                type="button"
                onClick={() => setAudioDelayMs(0)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600"
              >
                Reset 0ms
              </button>
              <span>+3.00s (Audio Late)</span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const next = !audioDelayTestActive;
                  setAudioDelayTestState(next, false);
                  showToast(
                    next
                      ? 'Audio Delay Test Screen Active: Black screen + 0.2s White Flash & Beep every 2s'
                      : 'Stopped Audio Delay Test Screen'
                  );
                }}
                className={`flex-1 py-2 px-3 rounded text-xs font-extrabold uppercase tracking-wider border transition-colors cursor-pointer ${
                  audioDelayTestActive
                    ? 'bg-red-600 hover:bg-red-500 text-white border-red-400'
                    : 'bg-cyan-600/25 hover:bg-cyan-600/40 text-cyan-200 border-cyan-500/50'
                }`}
              >
                {audioDelayTestActive
                  ? 'STOP AUDIO DELAY TEST SCREEN'
                  : 'START AUDIO DELAY TEST SCREEN (2s FLASH + BEEP)'}
              </button>
              {audioDelayTestActive && (
                <span
                  className={`px-2.5 py-2 rounded text-[10px] font-mono font-bold border ${
                    audioDelayTestFlash
                      ? 'bg-white text-black border-white'
                      : 'bg-black text-slate-300 border-slate-600'
                  }`}
                >
                  {audioDelayTestFlash ? 'FLASH 0.2s' : 'BLACK'}
                </span>
              )}
            </div>
          </div>

          {/* Backend & DMX Diagnostic Section */}
          <div className="pt-2 border-t border-[#232e42] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                  Backend &amp; DMX Telemetry
                </span>
              </div>
              <button
                type="button"
                onClick={handlePingBackend}
                disabled={isPingingBackend}
                className="px-3 py-1 rounded bg-[#1e2a3e] hover:bg-[#283854] active:bg-[#182335] text-cyan-300 border border-cyan-500/40 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isPingingBackend ? 'animate-spin' : ''}`}
                />
                {isPingingBackend ? 'PINGING...' : 'PING PYTHON CV BACKEND & DMX'}
              </button>
            </div>

            {backendPingData && (
              <div className="p-3 rounded bg-[#0c111a] border border-cyan-500/30 text-xs space-y-1.5 font-mono">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Status:</span>
                  <span
                    className={`font-bold uppercase ${
                      backendPingData.status.includes('online')
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {backendPingData.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Engine Version:</span>
                  <span className="text-slate-200">
                    {backendPingData.engine_version}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">OpenCV Acceleration:</span>
                  <span
                    className={
                      backendPingData.opencv_available
                        ? 'text-emerald-400 font-semibold'
                        : 'text-amber-400 font-semibold'
                    }
                  >
                    {backendPingData.opencv_available
                      ? `Available (${
                          backendPingData.opencv_version || 'v4.10.0'
                        })`
                      : 'Client Fallback (OpenCV Offline)'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Discovered Assets:</span>
                  <span className="text-cyan-300 font-semibold">
                    {backendPingData.discovered_assets?.total_videos ?? 0} videos
                    &amp;{' '}
                    {backendPingData.discovered_assets?.total_audio ?? 0} audio
                    files
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[#232e42]">
            <button
              value="cancel"
              className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700"
            >
              Cancel
            </button>
            <button
              value="save"
              className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white"
            >
              Save Calibration Settings
            </button>
          </div>
        </form>
      </dialog>

      {/* NEW HOUSE MAPPING PROJECT MODAL */}
      {isNewProjectModalOpen && (
        <div
          ref={newProjectDialogRef}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-[#131b2a] border border-[#273852] rounded-xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#23314d]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-400/40 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold uppercase tracking-wider text-white">
                    New House Mapping Project
                  </h3>
                  <p className="text-xs text-slate-400">
                    Select one of Austin's 4 templates or upload your own custom
                    house photo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewProjectModalOpen(false)}
                className="p-1.5 rounded-lg bg-[#1a2336] hover:bg-[#25324d] text-slate-400 hover:text-white transition-colors"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Project Title Input */}
            <div>
              <label
                htmlFor="new-project-title-input"
                className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Project Title
              </label>
              <input
                id="new-project-title-input"
                type="text"
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
                placeholder="e.g. Austin Halloween Firehouse 2026"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0c121c] border border-[#2c3d59] text-sm text-white focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>

            {/* Custom House Photo Upload Section */}
            <div className="rounded-lg border border-[#23334d] p-3.5 bg-[#0e1522] flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Custom House Photo Reference
                  </span>
                </div>
                {customPhotoUrl && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold uppercase flex items-center gap-1">
                    <Check className="w-3 h-3" /> ACTIVE CUSTOM PHOTO
                  </span>
                )}
              </div>

              {customPhotoUrl ? (
                <div className="flex items-center gap-3 bg-[#131d2e] border border-blue-500/40 rounded-lg p-2.5">
                  <img
                    src={customPhotoUrl}
                    alt="Custom House Reference Preview"
                    className="w-20 h-14 object-cover rounded border border-slate-700"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {customPhotoFileName || 'Custom House Photo (.jfif/.png/.jpg)'}
                    </p>
                    <p className="text-[11px] text-cyan-300 mt-0.5">
                      Ready to become active reference photo in Screen 3 &amp;
                      Screen 4
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => customPhotoInputRef.current?.click()}
                      className="px-2.5 py-1 rounded bg-[#202d44] hover:bg-[#2b3c5a] text-xs font-medium text-slate-200 border border-[#374c70] transition-colors"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomPhotoUrl(null);
                        setCustomPhotoFileName('');
                      }}
                      className="p-1.5 rounded bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 transition-colors"
                      title="Remove custom photo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => customPhotoInputRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#141d2d] hover:bg-[#1c293f] border border-dashed border-[#2d3f5c] hover:border-blue-400/60 text-cyan-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Upload className="w-4 h-4" />
                  UPLOAD CUSTOM HOUSE PHOTO (.JPG / .PNG / .JFIF)
                </button>
              )}
            </div>

            {/* Template Selection Grid */}
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2.5">
                Choose House Starting Template
              </span>
              <div className="grid grid-cols-2 gap-3">
                {STARTING_HOUSE_TEMPLATES.map((tmpl, idx) => {
                  const isSelected =
                    idx === selectedTemplateIndex && !customPhotoUrl;
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => setSelectedTemplateIndex(idx)}
                      className={`rounded-lg border p-3 cursor-pointer transition-all flex flex-col gap-2 ${
                        isSelected
                          ? 'bg-[#1c2940] border-blue-500 shadow-[0_0_15px_rgba(37,115,240,0.3)]'
                          : 'bg-[#101725] border-[#223046] hover:border-slate-500/60'
                      }`}
                    >
                      <div className="relative h-24 w-full rounded overflow-hidden bg-black/60 border border-slate-700/40">
                        <img
                          src={tmpl.photoUrl}
                          alt={tmpl.title}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[9px] font-mono font-bold uppercase text-cyan-300 border border-cyan-500/30">
                          {tmpl.badge}
                        </span>
                        {isSelected && (
                          <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded bg-blue-600 text-[10px] font-bold uppercase text-white shadow">
                            Selected
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-100 truncate">
                          {tmpl.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 leading-snug line-clamp-2 mt-0.5">
                          {tmpl.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#23314d]">
              <button
                type="button"
                onClick={() => setIsNewProjectModalOpen(false)}
                className="px-4 py-2.5 rounded-lg bg-[#182336] hover:bg-[#202d44] border border-[#2b3a54] text-xs font-semibold text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const tmpl = STARTING_HOUSE_TEMPLATES[selectedTemplateIndex];
                  const finalPhoto = customPhotoUrl || tmpl.photoUrl;
                  createNewHouseMappingProject(
                    newProjectTitle,
                    finalPhoto,
                    tmpl.videoUrl
                  );
                  if (customPhotoUrl) {
                    setReferencePhotoUrl(customPhotoUrl);
                  }
                  setActiveScreen(2);
                  setIsNewProjectModalOpen(false);
                  showToast(
                    customPhotoUrl
                      ? `Project created with custom house photo. Opened Vector Canvas.`
                      : `Project created. Opened Vector Canvas.`
                  );
                }}
                className="px-5 py-2.5 rounded-lg bg-[#2573f0] hover:bg-[#1d64d8] text-white text-xs font-extrabold tracking-wider uppercase shadow-[0_4px_16px_rgba(37,115,240,0.45)] border border-blue-400/40 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                Create &amp; Open Vector Canvas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
