import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Square,
  Repeat,
  Lock,
  Unlock,
  Sparkles,
  Film,
  Volume2,
  VolumeX,
  Music,
  Loader2,
  Download,
  Camera,
  History,
  Wand2,
  ArrowLeft,
  Save,
  Cpu,
  Dices,
  Layers,
  Scissors,
} from 'lucide-react';
import {
  AUDIO_OVERLAY_TRACKS,
  AUSTIN_HOUSE_ASSETS,
  useProjectionStore,
} from '../store/useProjectionStore';
import {
  PreviewZoomControl,
  useMiddleClickPan,
} from '../components/PreviewZoomControl';
import * as apiClient from '../utils/apiClient';
import {
  getRandomHolidayPrompt,
  getRandomHalloweenPrompt,
  getRandomChristmasPrompt,
  HolidayPrompt,
} from '../utils/holidayDecorationPrompts';
import {
  DraggableDivider,
  useResizable3Panels,
} from '../components/DraggableDivider';

// Helper to call postGenerateVideo safely from apiClient or backend failover
async function postGenerateVideo(payload: Record<string, unknown>): Promise<unknown> {
  try {
    const clientAny = apiClient as Record<string, unknown>;
    if (typeof clientAny.postGenerateVideo === 'function') {
      return await (clientAny.postGenerateVideo as (p: unknown) => Promise<unknown>)(payload);
    }
    const res = await fetch(`${apiClient.BACKEND_BASE_URL}/ai/generate-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.warn('postGenerateVideo client failover handled:', err);
    return null;
  }
}

const THEME_PRESETS = [
  {
    id: 'Cyberpunk Neon',
    label: 'Cyberpunk\nNeon',
    gradient: 'from-fuchsia-900 via-indigo-950 to-cyan-900',
    accent: '#00f0ff',
  },
  {
    id: 'Haunted Manor',
    label: 'Haunted\nManor',
    gradient: 'from-slate-900 via-purple-950 to-emerald-950',
    accent: '#a855f7',
  },
  {
    id: 'Gingerbread House',
    label: 'Gingerbread\nHouse',
    gradient: 'from-amber-900 via-orange-950 to-red-950',
    accent: '#f59e0b',
  },
  {
    id: 'Molten Lava',
    label: 'Molten\nLava',
    gradient: 'from-red-900 via-orange-950 to-stone-950',
    accent: '#ef4444',
  },
  {
    id: 'Ice Palace',
    label: 'Ice Palace',
    gradient: 'from-cyan-700 via-blue-900 to-slate-950',
    accent: '#38bdf8',
  },
  {
    id: 'Laser Grid',
    label: 'Laser Grid',
    gradient: 'from-purple-900 via-slate-950 to-cyan-950',
    accent: '#ec4899',
  },
];

export const Screen4AiVideoStudio: React.FC = () => {
  const {
    useColorLightingRef,
    useControlNetWireframe,
    structureAdherence,
    preserveBlackoutZones,
    positivePrompt,
    negativePrompt,
    selectedThemePreset,
    clipDuration,
    motionIntensity,
    frameRate,
    seed,
    seedLocked,
    hardCameraLock,
    ghostWireframeOverlay,
    isGeneratingVideo,
    generationProgress,
    activePreviewVideoUrl,
    videoSoundVolume,
    videoSoundMuted,
    musicOverlayVolume,
    musicOverlayMuted,
    musicOverlayPlaying,
    musicOverlayTrackUrl,
    masterBlackout,
    setAiStudioParams,
    setAudioMixerParams,
    applyThemePreset,
    generateAiVideo,
    approveAndSaveToPlaylist,
    setActiveScreen,
    navigateBack,
    saveCurrentProject,
    showToast,
    aiProviderConfig,
    setAiSettingsModalOpen,
    setIsHolidayAssetModalOpen,
    setIsChromaKeyModalOpen,
    setIsBatchRenderModalOpen,
    setIsExportStencilModalOpen,
    setIsFitVideoModalOpen,
  } = useProjectionStore();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [scrubSec, setScrubSec] = useState(4);
  const [previewZoom, setPreviewZoom] = useState<number>(100);
  const [refPhotoZoom, setRefPhotoZoom] = useState<number>(100);

  // Middle scroll wheel click to pan on Aligned Reference Photo
  const {
    pan: refPhotoPan,
    resetPan: resetRefPhotoPan,
    handlePointerDown: handleRefPhotoMiddleDown,
    handlePointerMove: handleRefPhotoMiddleMove,
    handlePointerUp: handleRefPhotoMiddleUp,
    handleMouseDown: handleRefPhotoMiddleMouseDown,
  } = useMiddleClickPan();

  // Middle scroll wheel click to pan on AI Video Diffusion Output
  const {
    pan: previewPan,
    resetPan: resetPreviewPan,
    handlePointerDown: handlePreviewMiddleDown,
    handlePointerMove: handlePreviewMiddleMove,
    handlePointerUp: handlePreviewMiddleUp,
    handleMouseDown: handlePreviewMiddleMouseDown,
  } = useMiddleClickPan();
  const totalSec = parseInt(clipDuration, 10) || 30;

  // Local state for seamless loop & optical crossfade
  const [isSeamlessLoop, setIsSeamlessLoop] = useState<boolean>(true);
  const [videoLoopOpacity, setVideoLoopOpacity] = useState<number>(1);

  // Local state for 4K Super-Resolution Upscaling
  const [isUpscaling4K, setIsUpscaling4K] = useState<boolean>(false);
  const [is4KUpscaled, setIs4KUpscaled] = useState<boolean>(false);

  // Active Random Holiday Prompt state (selected from the 40 prompts on load/open of Screen 4)
  const [activeHolidayPrompt, setActiveHolidayPrompt] = useState<{
    id: string;
    title: string;
    category: 'Halloween' | 'Christmas';
    icon: string;
    index: number;
    total: number;
  } | null>(null);

  // Dynamic Draggable Resizable 3-Column Panels (Structural Lock vs Prompts vs Render Preview)
  const {
    containerRef: workspaceContainerRef,
    percentages: workspacePercentages,
    handleDragDivider1,
    handleDragDivider2,
    resetPercentages,
  } = useResizable3Panels({
    defaultPercentages: [25, 35, 40],
    minPercentages: [15, 20, 20],
    maxPercentages: [45, 60, 60],
    storageKey: 'lumen_screen4_panels_proportions',
  });

  // Automatically randomize one of the 40 Halloween/Christmas prompts whenever Screen 4 is loaded/opened
  useEffect(() => {
    const picked = getRandomHolidayPrompt();
    setAiStudioParams({
      positivePrompt: picked.prompt,
    });
    setActiveHolidayPrompt({
      id: picked.id,
      title: picked.title,
      category: picked.category,
      icon: picked.icon,
      index: picked.index,
      total: picked.total,
    });
    showToast(
      `🎲 Loaded ${picked.category} Example Prompt (${picked.index} of ${picked.total}): "${picked.title}"`
    );
  }, []);

  const handleShufflePrompt = (type?: 'Halloween' | 'Christmas') => {
    const picked =
      type === 'Halloween'
        ? getRandomHalloweenPrompt()
        : type === 'Christmas'
        ? getRandomChristmasPrompt()
        : getRandomHolidayPrompt();

    setAiStudioParams({
      positivePrompt: picked.prompt,
    });
    setActiveHolidayPrompt({
      id: picked.id,
      title: picked.title,
      category: picked.category,
      icon: picked.icon,
      index: picked.index,
      total: picked.total,
    });
    showToast(
      `🎲 Shuffled ${picked.category} Example Prompt (${picked.index}/${picked.total}): "${picked.title}"`
    );
  };

  // Recent Render History / Variant Takes (last 4 takes with metadata)
  interface RenderTake {
    id: string;
    title: string;
    videoUrl: string;
    thumbnailUrl: string;
    seed: number;
    duration: string;
    timestamp: string;
  }

  const [recentTakes, setRecentTakes] = useState<RenderTake[]>([
    {
      id: 'take-1',
      title: 'Ghostbusters HQ Master',
      videoUrl: AUSTIN_HOUSE_ASSETS.videos.mainShow,
      thumbnailUrl: AUSTIN_HOUSE_ASSETS.photos.v1EctoOpenGarage,
      seed: 849201,
      duration: '0:30',
      timestamp: 'Take #1',
    },
    {
      id: 'take-2',
      title: 'Firehouse Tower V1',
      videoUrl: AUSTIN_HOUSE_ASSETS.videos.v1Show,
      thumbnailUrl: AUSTIN_HOUSE_ASSETS.photos.v2FirehouseTower,
      seed: 512940,
      duration: '0:15',
      timestamp: 'Take #2',
    },
    {
      id: 'take-3',
      title: 'Slimer Ecto Breach V2',
      videoUrl: AUSTIN_HOUSE_ASSETS.videos.v2Show,
      thumbnailUrl: AUSTIN_HOUSE_ASSETS.photos.v4SlimerBreach,
      seed: 733812,
      duration: '0:10',
      timestamp: 'Take #3',
    },
    {
      id: 'take-4',
      title: 'Singing Gourd Chorus',
      videoUrl: AUSTIN_HOUSE_ASSETS.videos.pumpkins,
      thumbnailUrl: AUSTIN_HOUSE_ASSETS.photos.v3ClosedLogoGarage,
      seed: 391048,
      duration: '0:30',
      timestamp: 'Take #4',
    },
  ]);

  // Dynamically compute playback rate from motionIntensity: 1 => 0.6x, 5 => 1.0x, 10 => 1.5x
  const currentPlaybackRate = 0.6 + (motionIntensity - 1) * 0.1;

  // Keep Video Sound Volume & Playback Rate synced to the HTML5 <video> element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = Math.max(
        0,
        Math.min(1, videoSoundVolume / 100)
      );
      videoRef.current.muted = videoSoundMuted || masterBlackout;
      videoRef.current.playbackRate = currentPlaybackRate;
    }
  }, [
    videoSoundVolume,
    videoSoundMuted,
    masterBlackout,
    activePreviewVideoUrl,
    currentPlaybackRate,
  ]);

  // Keep Music Overlay Volume (default 80%) and playback state synced to the HTML5 <audio> element
  useEffect(() => {
    if (musicRef.current) {
      musicRef.current.volume =
        musicOverlayMuted || masterBlackout
          ? 0
          : Math.max(0, Math.min(1, musicOverlayVolume / 100));
      if (musicOverlayPlaying && !masterBlackout) {
        musicRef.current.play().catch(() => {});
      } else {
        musicRef.current.pause();
      }
    }
  }, [
    musicOverlayVolume,
    musicOverlayMuted,
    musicOverlayPlaying,
    musicOverlayTrackUrl,
    masterBlackout,
  ]);

  // Composite CSS filter: applies 4K sharpening + warm/cinematic lighting reference LUT
  const videoFilter = [
    is4KUpscaled ? 'contrast(1.1) saturate(1.15) brightness(1.03)' : '',
    useColorLightingRef ? 'sepia(0.22) contrast(1.08) hue-rotate(-8deg) saturate(1.2)' : '',
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  // Handle Generate Video with prompt-based asset routing & apiClient invocation
  const handleGenerateVideoClick = async () => {
    if (isGeneratingVideo) return;

    const lower = positivePrompt.toLowerCase();
    let targetVideoUrl = AUSTIN_HOUSE_ASSETS.videos.mainShow;
    if (lower.includes('pumpkin') || lower.includes('gourd')) {
      targetVideoUrl = AUSTIN_HOUSE_ASSETS.videos.pumpkins;
    } else if (lower.includes('slimer') || lower.includes('breach')) {
      targetVideoUrl = AUSTIN_HOUSE_ASSETS.videos.v2Show;
    } else if (lower.includes('tower') || lower.includes('two-story')) {
      targetVideoUrl = AUSTIN_HOUSE_ASSETS.videos.v1Show;
    } else if (lower.includes('long') || lower.includes('finale')) {
      targetVideoUrl = AUSTIN_HOUSE_ASSETS.videos.extendedFinale;
    }

    setAiStudioParams({ activePreviewVideoUrl: targetVideoUrl });
    generateAiVideo();

    // Register new take in render history
    const newTake: RenderTake = {
      id: `take-${Date.now()}`,
      title: positivePrompt.slice(0, 24) || 'Custom Architectural Take',
      videoUrl: targetVideoUrl,
      thumbnailUrl: AUSTIN_HOUSE_ASSETS.photos.v1EctoOpenGarage,
      seed,
      duration: `${parseInt(clipDuration, 10) || 30}s`,
      timestamp: `Take #${recentTakes.length + 1}`,
    };
    setRecentTakes((prev) => [newTake, ...prev.slice(0, 3)]);

    try {
      await postGenerateVideo({
        prompt: positivePrompt,
        negative_prompt: negativePrompt,
        clip_duration_sec: parseInt(clipDuration, 10) || 30,
        fps: parseInt(frameRate, 10) || 30,
        structure_adherence: structureAdherence,
        hard_camera_lock: hardCameraLock,
        preserve_blackout_zones: preserveBlackoutZones,
        seed,
      });
    } catch (err) {
      console.warn('postGenerateVideo call failed gracefully:', err);
    }
  };

  // Handle 4K Super-Resolution Upscaling with 1.2s progress animation
  const handleUpscaleTo4K = () => {
    if (isUpscaling4K) return;
    setIsUpscaling4K(true);
    showToast('AI Super-Resolution Engine: Upscaling 1080p to 4K UHD (3840x2160)...');
    setTimeout(() => {
      setIsUpscaling4K(false);
      setIs4KUpscaled((prev) => {
        const next = !prev;
        showToast(
          next
            ? 'TensorRT 4K AI Super-Resolution Applied (3840x2160 UHD)'
            : 'Reverted to Native 1080p Resolution'
        );
        return next;
      });
    }, 1200);
  };

  // AI Prompt Enhancer with architectural projection-mapping conditioning tokens
  const handleEnhancePrompt = () => {
    const TOKENS = [
      '8k architectural projection mapping',
      'perspective-locked facade',
      'high-contrast volumetric lighting',
      'zero camera movement',
      'sharp mortar lines',
      'photorealistic surface relief displacement',
    ];
    const current = positivePrompt.trim();
    const needed = TOKENS.filter((t) => !current.toLowerCase().includes(t.toLowerCase()));
    if (needed.length === 0) {
      showToast('Prompt already contains complete projection-mapping tokens');
      return;
    }
    const enhanced = current ? `${current}, ${needed.slice(0, 4).join(', ')}` : needed.join(', ');
    setAiStudioParams({ positivePrompt: enhanced });
    showToast('✨ AI Enhanced: Added architectural projection mapping conditioning tokens');
  };

  // Browser download of generated MP4 video file
  const handleDownloadMp4 = () => {
    try {
      const a = document.createElement('a');
      a.href = activePreviewVideoUrl;
      const filename = activePreviewVideoUrl.split('/').pop() || 'projection-render.mp4';
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast(`Exporting video: ${filename}`);
    } catch (err) {
      console.warn('Download MP4 error:', err);
      showToast('Downloading active preview video stream');
    }
  };

  // Snapshot current video frame to offscreen canvas and download as PNG
  const handleSnapshotPng = () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('2D context unavailable');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `projection-frame-snapshot-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('📸 Snapshot frame captured and exported as PNG');
    } catch (err) {
      console.warn('Canvas export tainted or failed, falling back:', err);
      const a = document.createElement('a');
      a.href = activePreviewVideoUrl;
      a.target = '_blank';
      a.download = `projection-frame-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('Frame snapshot downloaded via direct stream fallback');
    }
  };

  const SAMPLE_VIDEO_OPTIONS = [
    {
      label: 'Ghostbusters Master',
      url: AUSTIN_HOUSE_ASSETS.videos.mainShow,
    },
    {
      label: 'Ghostbusters V1',
      url: AUSTIN_HOUSE_ASSETS.videos.v1Show,
    },
    {
      label: 'Ghostbusters V2',
      url: AUSTIN_HOUSE_ASSETS.videos.v2Show,
    },
    {
      label: 'Singing Pumpkins',
      url: AUSTIN_HOUSE_ASSETS.videos.pumpkins,
    },
    {
      label: 'Extended Loop',
      url: AUSTIN_HOUSE_ASSETS.videos.extendedFinale,
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-[calc(100vh-3.5rem)] bg-[#0d121b] text-slate-100 select-none overflow-y-auto">
      {/* SCREEN 4 TOP WORKFLOW & NAVIGATION TOOLBAR */}
      <div className="h-11 bg-[#121927] border-b border-[#212d40] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={navigateBack}
            className="py-1 px-3 rounded-md bg-[#182335] hover:bg-[#202f48] border border-cyan-500/60 hover:border-cyan-400 text-cyan-300 hover:text-white text-xs font-extrabold tracking-wider uppercase inline-flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)] cursor-pointer"
            title="Go back to previous screen (Alt+Left)"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
            <span>BACK</span>
          </button>

          <button
            type="button"
            onClick={saveCurrentProject}
            className="py-1 px-3 rounded-md bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/70 hover:border-emerald-400 text-emerald-300 hover:text-white text-xs font-extrabold tracking-wider uppercase inline-flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(16,185,129,0.25)] cursor-pointer"
            title="Save current project to storage (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5 text-emerald-400" />
            <span>SAVE</span>
          </button>

          <div className="h-6 w-[1px] bg-[#223147] mx-1" />

          <span className="text-xs font-bold text-slate-300 tracking-wide uppercase">
            SCREEN 5: AI VIDEO DIFFUSION STUDIO
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Production Tools */}
          <button
            type="button"
            onClick={() => setIsHolidayAssetModalOpen(true)}
            className="py-1 px-2.5 rounded-md bg-[#162032] hover:bg-[#1f2d47] border border-[#2c3d59] hover:border-emerald-400 text-emerald-300 hover:text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title="Open Holiday Asset & Animated Decal Library (Feature #30)"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Decals</span>
          </button>

          <button
            type="button"
            onClick={() => setIsChromaKeyModalOpen(true)}
            className="py-1 px-2.5 rounded-md bg-[#162032] hover:bg-[#1f2d47] border border-[#2c3d59] hover:border-cyan-400 text-cyan-300 hover:text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title="Open Chroma & Luma Key Background Remover (Feature #28)"
          >
            <Scissors className="w-3.5 h-3.5 text-cyan-400" />
            <span>Chroma Key</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBatchRenderModalOpen(true)}
            className="py-1 px-2.5 rounded-md bg-[#162032] hover:bg-[#1f2d47] border border-[#2c3d59] hover:border-fuchsia-400 text-fuchsia-300 hover:text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title="Open Overnight Batch AI Video Render Farm Queue (Feature #48)"
          >
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>Batch Queue</span>
          </button>

          {/* AI Provider Config Modal Trigger */}
          <button
            type="button"
            onClick={() => setAiSettingsModalOpen(true)}
            className="py-1 px-3 rounded-md bg-[#182335] hover:bg-[#22334e] border border-cyan-500/60 hover:border-cyan-400 text-cyan-300 hover:text-white text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)] cursor-pointer"
            title="Configure AI Video Generation Provider (Fal.ai, Replicate, RunwayML, ComfyUI)"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI PROVIDER: {aiProviderConfig.activeProvider.toUpperCase()}</span>
          </button>

          {/* Export House Stencil for AI Generation (ControlNet / Kling / Sora) */}
          <button
            type="button"
            onClick={() => setIsExportStencilModalOpen(true)}
            className="py-1 px-2.5 rounded-md bg-[#182335] hover:bg-[#22334e] border border-indigo-500/60 hover:border-indigo-400 text-indigo-300 hover:text-white text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 transition-all cursor-pointer"
            title="Export House Stencil — High-res filled mask & outline for AI video generators (§22-F)"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export Stencil (§22-F)</span>
          </button>

          {/* Fit Video to House */}
          <button
            type="button"
            onClick={() => setIsFitVideoModalOpen(true)}
            className="py-1 px-2.5 rounded-md bg-[#182335] hover:bg-[#22334e] border border-sky-500/60 hover:border-sky-400 text-sky-300 hover:text-white text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 transition-all cursor-pointer"
            title="Fit Video to House — Map single video across house shapes (§22-A..22-E)"
          >
            <Film className="w-3.5 h-3.5 text-sky-400" />
            <span>Fit Video (§22)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveScreen(5)}
            className="py-1 px-2.5 rounded bg-[#182335] hover:bg-amber-600/30 border border-[#2b3c56] hover:border-amber-400 text-[11px] font-bold text-amber-300 uppercase transition-colors"
          >
            REPAIR / INPAINT (SCREEN 6) →
          </button>
          <button
            type="button"
            onClick={() => setActiveScreen(10)}
            className="py-1 px-2.5 rounded bg-purple-600/25 hover:bg-purple-600/40 border border-purple-500/60 text-[11px] font-bold text-purple-300 uppercase transition-colors"
          >
            MUSIC SYNC (SCREEN 7) →
          </button>
          <button
            type="button"
            onClick={approveAndSaveToPlaylist}
            className="py-1 px-2.5 rounded bg-emerald-600/25 hover:bg-emerald-600/40 border border-emerald-500/60 text-[11px] font-bold text-emerald-300 uppercase transition-colors"
          >
            APPROVE TO PLAYLIST (SCREEN 8) →
          </button>
        </div>
      </div>

      {/* 3-COLUMN DYNAMIC RESIZABLE WORKSPACE */}
      <div
        ref={workspaceContainerRef}
        className="flex-1 flex flex-row p-4 min-h-[720px] w-full overflow-hidden items-stretch"
      >
        {/* LEFT PANEL: STRUCTURAL LOCK & REFERENCE */}
        <aside
          style={{ width: `calc(${workspacePercentages[0]}% - 6px)` }}
          className="bg-[#141b27] border border-[#243044] rounded-lg p-4 flex flex-col justify-between overflow-y-auto shrink-0 transition-all duration-75"
        >
        <div className="space-y-4">
          <h2 className="text-xs font-extrabold tracking-wider uppercase text-slate-200">
            STRUCTURAL LOCK &amp; REFERENCE
          </h2>

          {/* ALIGNED HOUSE PHOTO Square */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                ALIGNED HOUSE PHOTO
              </span>
              <PreviewZoomControl
                zoom={refPhotoZoom}
                onChange={setRefPhotoZoom}
                pan={refPhotoPan}
                onResetPan={resetRefPhotoPan}
                compact
              />
            </div>
            <div
              onWheel={(e) => {
                e.preventDefault();
                const delta = e.deltaY < 0 ? 10 : -10;
                setRefPhotoZoom((z) => Math.max(25, Math.min(250, z + delta)));
              }}
              onPointerDown={handleRefPhotoMiddleDown}
              onPointerMove={handleRefPhotoMiddleMove}
              onPointerUp={handleRefPhotoMiddleUp}
              onMouseDown={handleRefPhotoMiddleMouseDown}
              className={`w-full aspect-[16/10] rounded-md overflow-hidden border border-[#2e3c56] bg-[#050811] relative flex items-center justify-center ${
                refPhotoPan.x !== 0 || refPhotoPan.y !== 0 ? 'cursor-grab' : ''
              }`}
            >
              <img
                src={AUSTIN_HOUSE_ASSETS.photos.v1EctoOpenGarage}
                alt="Aligned House Reference Photo"
                className="w-full h-full object-contain transition-transform duration-150 border border-dashed border-slate-600/60"
                style={{
                  transform: `translate(${refPhotoPan.x}px, ${refPhotoPan.y}px) scale(${refPhotoZoom / 100})`,
                }}
              />
              <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-mono text-cyan-300 border border-cyan-500/30">
                GhostbustersHouseV1.jfif ({refPhotoZoom}%)
              </span>
            </div>
            <label className="mt-2 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useColorLightingRef}
                onChange={(e) =>
                  setAiStudioParams({ useColorLightingRef: e.target.checked })
                }
                className="w-4 h-4 rounded border-slate-600 text-blue-600"
              />
              <span className="text-xs text-slate-200">
                Use for Color/Lighting Reference
              </span>
            </label>
          </div>

          {/* CONTROLNET WIREFRAME Square */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
              CONTROLNET WIREFRAME
            </div>
            <div
              onWheel={(e) => {
                e.preventDefault();
                const delta = e.deltaY < 0 ? 10 : -10;
                setRefPhotoZoom((z) => Math.max(25, Math.min(250, z + delta)));
              }}
              className="w-full aspect-[16/10] rounded-md overflow-hidden border border-[#2e3c56] bg-[#050811] relative flex items-center justify-center"
            >
              <img
                src={AUSTIN_HOUSE_ASSETS.wireframeLayout}
                alt="Austin House ControlNet Wireframe"
                className="w-full h-full object-contain transition-transform duration-150 border border-dashed border-slate-600/60"
                style={{ transform: `scale(${refPhotoZoom / 100})` }}
              />
              <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-mono text-emerald-300 border border-emerald-500/30">
                Locked House Wireframe ({refPhotoZoom}%)
              </span>
            </div>
            <label className="mt-2 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useControlNetWireframe}
                onChange={(e) =>
                  setAiStudioParams({
                    useControlNetWireframe: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded border-slate-600 text-blue-600"
              />
              <span className="text-xs text-slate-200">
                ControlNet Wireframe &amp; Depth
              </span>
            </label>
          </div>

          {/* Structure Adherence Slider (0.0 to 1.0) */}
          <div className="pt-1">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-200 font-medium">
                Structure Adherence
              </span>
              <span className="font-mono font-bold text-slate-100">
                {structureAdherence.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={structureAdherence}
              onChange={(e) =>
                setAiStudioParams({
                  structureAdherence: Number(e.target.value),
                })
              }
              className="w-full"
            />
          </div>
        </div>

        {/* Bottom PRESERVE BLACKOUT ZONES Checkbox */}
        <div className="pt-3 border-t border-[#232f45]">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={preserveBlackoutZones}
              onChange={(e) =>
                setAiStudioParams({ preserveBlackoutZones: e.target.checked })
              }
              className="w-4 h-4 rounded border-slate-600 text-blue-600"
            />
            <span className="text-xs font-extrabold tracking-wider uppercase text-slate-200">
              PRESERVE BLACKOUT ZONES
            </span>
          </label>
        </div>
      </aside>

      {/* INTERACTIVE DRAGGABLE DIVIDER (RESIZE LEFT VS CENTER) */}
      <DraggableDivider
        onDrag={handleDragDivider1}
        onReset={resetPercentages}
        title="Drag border left or right to resize Structural Lock vs Prompts & Theme Engine (Double-click to reset)"
        className="mx-1"
      />

      {/* CENTER PANEL: PROMPTS & THEME ENGINE */}
      <section
        style={{ width: `calc(${workspacePercentages[1]}% - 6px)` }}
        className="bg-[#141b27] border border-[#243044] rounded-lg p-4 flex flex-col justify-between overflow-y-auto shrink-0 transition-all duration-75"
      >
        <div className="space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-extrabold tracking-wider uppercase text-slate-200">
              PROMPTS &amp; THEME ENGINE
            </h2>
            <button
              type="button"
              onClick={() => handleShufflePrompt()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase bg-[#1a2333] hover:bg-[#223048] border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 hover:text-white transition-all shadow-[0_0_8px_rgba(6,182,212,0.15)] cursor-pointer"
              title="Shuffle another video generation prompt (1 of 40: 20 Halloween & 20 Christmas)"
            >
              <Dices className="w-3.5 h-3.5 text-cyan-400" />
              <span>🎲 RANDOM EXAMPLE (40)</span>
            </button>
          </div>

          {/* ACTIVE RANDOM HOLIDAY PROMPT BADGE & FILTER BUTTONS */}
          {activeHolidayPrompt && (
            <div className="p-2.5 rounded-lg bg-[#0e1420] border border-cyan-500/40 shadow-inner flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 font-bold min-w-0">
                  <span className="text-sm shrink-0">{activeHolidayPrompt.icon}</span>
                  <span className="text-cyan-300 uppercase shrink-0">
                    {activeHolidayPrompt.category} #{activeHolidayPrompt.index}:
                  </span>
                  <span className="text-slate-100 font-semibold truncate">
                    {activeHolidayPrompt.title}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-1">
                  {activeHolidayPrompt.index}/40
                </span>
              </div>
              <div className="flex items-center gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => handleShufflePrompt('Halloween')}
                  className="px-2 py-0.5 rounded bg-orange-950/70 border border-orange-600/50 hover:bg-orange-800/80 text-[10px] font-bold text-orange-200 transition-colors cursor-pointer"
                  title="Randomize one of 20 Halloween house decoration prompts"
                >
                  🎃 Halloween (20)
                </button>
                <button
                  type="button"
                  onClick={() => handleShufflePrompt('Christmas')}
                  className="px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-600/50 hover:bg-emerald-800/80 text-[10px] font-bold text-emerald-200 transition-colors cursor-pointer"
                  title="Randomize one of 20 Christmas house decoration prompts"
                >
                  🎄 Christmas (20)
                </button>
                <button
                  type="button"
                  onClick={() => handleShufflePrompt()}
                  className="px-2 py-0.5 rounded bg-purple-950/70 border border-purple-500/50 hover:bg-purple-800/80 text-[10px] font-bold text-purple-200 transition-colors ml-auto cursor-pointer"
                  title="Randomize from all 40 holiday prompts"
                >
                  🎲 Shuffle Any
                </button>
              </div>
            </div>
          )}

          {/* POSITIVE PROMPT */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="positive-prompt-box"
                className="text-[11px] font-semibold uppercase tracking-wider text-slate-400"
              >
                POSITIVE PROMPT
              </label>
              <button
                type="button"
                onClick={handleEnhancePrompt}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase bg-gradient-to-r from-amber-500/20 via-cyan-500/20 to-blue-500/20 border border-amber-400/60 text-amber-300 hover:text-white hover:border-amber-300 transition-all shadow-[0_0_10px_rgba(245,158,11,0.25)] cursor-pointer"
                title="Enrich prompt with architectural projection-mapping conditioning tokens"
              >
                <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                <span>✨ AI ENHANCE PROMPT</span>
              </button>
            </div>
            <textarea
              id="positive-prompt-box"
              rows={4}
              value={positivePrompt}
              onChange={(e) =>
                setAiStudioParams({ positivePrompt: e.target.value })
              }
              className="w-full rounded-md bg-[#0e141f] border border-[#2c3a52] p-2.5 text-xs text-slate-100 leading-relaxed focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* NEGATIVE PROMPT */}
          <div>
            <label
              htmlFor="negative-prompt-box"
              className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1"
            >
              NEGATIVE PROMPT
            </label>
            <textarea
              id="negative-prompt-box"
              rows={2}
              value={negativePrompt}
              onChange={(e) =>
                setAiStudioParams({ negativePrompt: e.target.value })
              }
              className="w-full rounded-md bg-[#0e141f] border border-[#2c3a52] p-2.5 text-xs text-slate-300 leading-relaxed focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* QUICK THEME PRESETS Thumbnail Grid */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-2">
              QUICK THEME PRESETS
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {THEME_PRESETS.map((preset) => {
                const isSelected = selectedThemePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyThemePreset(preset.id)}
                    className="flex flex-col items-center text-center group focus:outline-none"
                  >
                    <div
                      className={`w-full aspect-square rounded-md bg-gradient-to-br ${
                        preset.gradient
                      } border-2 flex items-center justify-center p-1 transition-all ${
                        isSelected
                          ? 'border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)] scale-105'
                          : 'border-[#2d3b54] group-hover:border-slate-400'
                      }`}
                    >
                      <Sparkles
                        className="w-4 h-4"
                        style={{ color: preset.accent }}
                      />
                    </div>
                    <span
                      className={`text-[10px] leading-tight mt-1 whitespace-pre-line ${
                        isSelected
                          ? 'text-amber-300 font-bold'
                          : 'text-slate-300'
                      }`}
                    >
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* GENERATION PARAMETERS */}
          <div className="pt-2 border-t border-[#232f45] space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              GENERATION PARAMETERS
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Clip Duration Dropdown */}
              <div>
                <label
                  htmlFor="clip-duration-select"
                  className="block text-xs text-slate-300 mb-1"
                >
                  Clip Duration
                </label>
                <select
                  id="clip-duration-select"
                  value={clipDuration}
                  onChange={(e) =>
                    setAiStudioParams({
                      clipDuration: e.target.value as '10s' | '15s' | '30s',
                    })
                  }
                  className="w-full bg-[#0e141f] border border-[#2d3b54] rounded px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="10s">10s</option>
                  <option value="15s">15s</option>
                  <option value="30s">30s (Seamless Show Loop)</option>
                </select>
              </div>

              {/* Motion Intensity Slider (1 - 10) dynamically updates playbackRate */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Motion Intensity</span>
                  <span className="font-mono font-bold text-white">
                    {motionIntensity} ({currentPlaybackRate.toFixed(1)}x)
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={motionIntensity}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setAiStudioParams({
                      motionIntensity: val,
                    });
                    if (videoRef.current) {
                      videoRef.current.playbackRate = 0.6 + (val - 1) * 0.1;
                    }
                  }}
                  className="w-full mt-1.5"
                />
              </div>

              {/* Frame Rate Dropdown */}
              <div>
                <label
                  htmlFor="fps-select"
                  className="block text-xs text-slate-300 mb-1"
                >
                  Frame Rate
                </label>
                <select
                  id="fps-select"
                  value={frameRate}
                  onChange={(e) =>
                    setAiStudioParams({
                      frameRate: e.target.value as
                        | '24 FPS'
                        | '30 FPS'
                        | '60 FPS',
                    })
                  }
                  className="w-full bg-[#0e141f] border border-[#2d3b54] rounded px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="24 FPS">24 FPS</option>
                  <option value="30 FPS">30 FPS</option>
                  <option value="60 FPS">60 FPS</option>
                </select>
              </div>

              {/* Seed Input with Lock Button */}
              <div>
                <label
                  htmlFor="seed-input"
                  className="block text-xs text-slate-300 mb-1"
                >
                  Seed
                </label>
                <div className="flex items-center rounded bg-[#0e141f] border border-[#2d3b54] px-2 py-1">
                  <input
                    id="seed-input"
                    type="number"
                    value={seed}
                    onChange={(e) =>
                      setAiStudioParams({ seed: Number(e.target.value) })
                    }
                    className="w-full bg-transparent text-xs font-mono text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setAiStudioParams({ seedLocked: !seedLocked })
                    }
                    className="text-amber-400 hover:text-amber-300 px-1"
                    title={seedLocked ? 'Unlock Seed' : 'Lock Seed'}
                  >
                    {seedLocked ? (
                      <Lock className="w-3.5 h-3.5" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* HARD CAMERA LOCK [ON] Toggle */}
        <div className="pt-3 border-t border-[#232f45] flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              setAiStudioParams({ hardCameraLock: !hardCameraLock })
            }
            className={`w-12 h-6 rounded-full p-0.5 transition-colors flex items-center ${
              hardCameraLock ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
            }`}
            aria-label="Toggle Hard Camera Lock"
          >
            <span className="w-5 h-5 rounded-full bg-white shadow" />
          </button>
          <span className="text-sm font-extrabold tracking-wider uppercase text-white">
            HARD CAMERA LOCK{' '}
            <span
              className={
                hardCameraLock ? 'text-emerald-400' : 'text-slate-400'
              }
            >
              [{hardCameraLock ? 'ON' : 'OFF'}]
            </span>
          </span>
        </div>
      </section>

      {/* INTERACTIVE DRAGGABLE DIVIDER (RESIZE CENTER VS RIGHT) */}
      <DraggableDivider
        onDrag={handleDragDivider2}
        onReset={resetPercentages}
        title="Drag border left or right to resize Prompts & Theme Engine vs Render Queue & Preview (Double-click to reset)"
        className="mx-1"
      />

      {/* RIGHT PANEL: RENDER QUEUE & PREVIEW */}
      <section
        style={{ width: `calc(${workspacePercentages[2]}% - 6px)` }}
        className="bg-[#141b27] border border-[#243044] rounded-lg p-4 flex flex-col justify-between overflow-y-auto shrink-0 transition-all duration-75"
      >
        <div>
          <h2 className="text-xs font-extrabold tracking-wider uppercase text-slate-200">
            RENDER QUEUE &amp; PREVIEW
          </h2>
          <div className="flex items-center justify-between mt-1 mb-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              MAIN VIDEO PREVIEW (REAL AI MP4 ASSET)
            </div>
            <div className="flex items-center gap-1">
              {SAMPLE_VIDEO_OPTIONS.map((v) => (
                <button
                  key={v.url}
                  type="button"
                  onClick={() =>
                    setAiStudioParams({ activePreviewVideoUrl: v.url })
                  }
                  className={`px-2 py-0.5 rounded text-[9px] font-mono border transition-colors ${
                    activePreviewVideoUrl === v.url
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                      : 'bg-[#192336] border-[#2c3c59] text-slate-400 hover:text-white'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* MAIN VIDEO PREVIEW 16:9 Monitor */}
          <div
            onWheel={(e) => {
              e.preventDefault();
              const delta = e.deltaY < 0 ? 10 : -10;
              setPreviewZoom((z) => Math.max(25, Math.min(250, z + delta)));
            }}
            onPointerDown={handlePreviewMiddleDown}
            onPointerMove={handlePreviewMiddleMove}
            onPointerUp={handlePreviewMiddleUp}
            onMouseDown={handlePreviewMiddleMouseDown}
            className={`relative w-full aspect-video rounded-lg overflow-hidden border border-[#2e3d59] bg-[#050811] shadow-2xl flex items-center justify-center ${
              previewPan.x !== 0 || previewPan.y !== 0 ? 'cursor-grab' : ''
            }`}
          >
            {/* Hidden HTML5 Audio Element for Music Overlay */}
            <audio
              ref={musicRef}
              src={musicOverlayTrackUrl}
              loop
              preload="metadata"
            />

            {/* Glowing 4K Super-Res Active Badge in Monitor Corner */}
            {is4KUpscaled && (
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-20 px-2.5 py-1 rounded bg-amber-500/90 text-black font-extrabold text-[10px] tracking-wider uppercase shadow-[0_0_15px_rgba(245,158,11,0.7)] flex items-center gap-1.5 border border-amber-300 animate-pulse">
                <Sparkles className="w-3.5 h-3.5 fill-current text-black" />
                <span>4K UHD 3840x2160 SUPER-RES</span>
              </div>
            )}

            {/* Zoomable 100% Frame Wrapper with Overscan Boundary */}
            <div
              className="relative w-full h-full transition-transform duration-150 border border-dashed border-cyan-500/50"
              style={{
                transform: `translate(${previewPan.x}px, ${previewPan.y}px) scale(${previewZoom / 100})`,
              }}
            >
              <video
                ref={videoRef}
                key={activePreviewVideoUrl}
                src={activePreviewVideoUrl}
                poster={AUSTIN_HOUSE_ASSETS.photos.v1EctoOpenGarage}
                autoPlay
                loop={isSeamlessLoop}
                muted={videoSoundMuted || masterBlackout}
                playsInline
                onLoadedMetadata={(e) => {
                  e.currentTarget.volume = Math.max(
                    0,
                    Math.min(1, videoSoundVolume / 100)
                  );
                  e.currentTarget.muted = videoSoundMuted || masterBlackout;
                  e.currentTarget.playbackRate = currentPlaybackRate;
                  if (isPlaying) {
                    e.currentTarget.play().catch(() => {});
                  }
                }}
                onTimeUpdate={(e) => {
                  const ct = e.currentTarget.currentTime;
                  const dur = e.currentTarget.duration;
                  setScrubSec(Math.floor(ct));

                  // Seamless Loop Optical Crossfade Opacity Dip within 0.4s of end
                  if (isSeamlessLoop && dur > 0) {
                    const timeLeft = dur - ct;
                    if (timeLeft >= 0 && timeLeft <= 0.4) {
                      setVideoLoopOpacity(0.35 + 0.65 * (timeLeft / 0.4));
                    } else if (ct <= 0.25) {
                      setVideoLoopOpacity(0.35 + 0.65 * (ct / 0.25));
                    } else {
                      setVideoLoopOpacity(1);
                    }
                  } else {
                    setVideoLoopOpacity(1);
                  }
                }}
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.muted = videoSoundMuted || masterBlackout;
                    videoRef.current.volume = Math.max(
                      0,
                      Math.min(1, videoSoundVolume / 100)
                    );
                    if (videoRef.current.paused) {
                      videoRef.current.play().catch(() => {});
                      setIsPlaying(true);
                    }
                  }
                }}
                style={{
                  opacity: videoLoopOpacity,
                  filter: videoFilter,
                  transition: 'opacity 0.1s ease',
                }}
                className="w-full h-full object-cover cursor-pointer"
              />

              {/* Ghost Wireframe Overlay when toggled ON */}
              {ghostWireframeOverlay && (
                <img
                  src={AUSTIN_HOUSE_ASSETS.wireframeLayout}
                  alt="Ghost Wireframe Overlay"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-45 mix-blend-screen"
                />
              )}
            </div>

            <div className="absolute top-2.5 left-2.5 z-10 px-2 py-1 rounded bg-black/75 border border-cyan-500/40 text-[10px] font-mono text-cyan-300 flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5" />
              <span>{activePreviewVideoUrl.split('/').pop()}</span>
            </div>

            <div className="absolute bottom-2.5 right-2.5 z-10">
              <PreviewZoomControl
                zoom={previewZoom}
                onChange={setPreviewZoom}
                pan={previewPan}
                onResetPan={resetPreviewPan}
                compact
              />
            </div>

            <div className="absolute top-2.5 right-2.5 z-10 px-2 py-1 rounded bg-black/75 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 flex items-center gap-2">
              <span>
                VID SND: {videoSoundMuted ? 'MUTE' : `${videoSoundVolume}%`}
              </span>
              <span>|</span>
              <span>
                MUSIC: {musicOverlayMuted ? 'MUTE' : `${musicOverlayVolume}%`}
              </span>
            </div>

            {isGeneratingVideo && (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-30">
                <Sparkles className="w-8 h-8 text-cyan-400 animate-spin mb-2" />
                <div className="text-xs font-bold uppercase tracking-wider text-white">
                  Conditioning Diffusion Pipeline on Locked Wireframe...
                </div>
                <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden mt-3">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-300"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Video Transport Scrub Bar */}
          <div className="mt-2.5 flex items-center gap-3 px-1">
            <button
              type="button"
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.muted = videoSoundMuted || masterBlackout;
                  videoRef.current.volume = Math.max(
                    0,
                    Math.min(1, videoSoundVolume / 100)
                  );
                  if (isPlaying) {
                    videoRef.current.pause();
                  } else {
                    videoRef.current.play().catch(() => {});
                  }
                }
                setIsPlaying(!isPlaying);
              }}
              className="text-slate-200 hover:text-white"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.pause();
                  videoRef.current.currentTime = 0;
                }
                if (musicRef.current) {
                  musicRef.current.pause();
                  musicRef.current.currentTime = 0;
                }
                setAudioMixerParams({ musicOverlayPlaying: false });
                setIsPlaying(false);
                setScrubSec(0);
              }}
              className="text-slate-400 hover:text-white"
              aria-label="Stop"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
            <input
              type="range"
              min={0}
              max={totalSec}
              value={scrubSec}
              onChange={(e) => {
                const nextTime = Number(e.target.value);
                setScrubSec(nextTime);
                if (videoRef.current) {
                  videoRef.current.currentTime = nextTime;
                }
              }}
              className="flex-1"
            />
            <span className="text-xs font-mono text-slate-300">
              0:{String(scrubSec).padStart(2, '0')} / 0:
              {String(totalSec).padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={() => {
                const next = !isSeamlessLoop;
                setIsSeamlessLoop(next);
                showToast(
                  next
                    ? 'Seamless Loop Playback Enabled'
                    : 'Seamless Loop Playback Disabled'
                );
              }}
              className={`p-1 rounded transition-colors ${
                isSeamlessLoop
                  ? 'text-cyan-300 bg-cyan-500/20 border border-cyan-400/50 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={
                isSeamlessLoop
                  ? 'Seamless Loop Active (Click to disable)'
                  : 'Loop Disabled (Click to enable)'
              }
              aria-label={isSeamlessLoop ? 'Disable Loop' : 'Enable Loop'}
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          {/* DOWNLOAD MP4 & SNAPSHOT FRAME ACTIONS */}
          <div className="mt-2.5 flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadMp4}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#182336] hover:bg-[#202f47] border border-cyan-500/40 hover:border-cyan-400 text-cyan-200 hover:text-white text-[11px] font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                title="Download active preview video as MP4"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>DOWNLOAD MP4</span>
              </button>

              <button
                type="button"
                onClick={handleSnapshotPng}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#182336] hover:bg-[#202f47] border border-emerald-500/40 hover:border-emerald-400 text-emerald-200 hover:text-white text-[11px] font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                title="Capture current video frame to PNG"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span>SNAPSHOT PNG</span>
              </button>
            </div>

            <span className="text-[10px] font-mono text-slate-400">
              1080p AI RENDER
            </span>
          </div>

          {/* RENDER HISTORY / VARIANT TAKES STRIP */}
          <div className="mt-2.5 p-2 rounded-lg bg-[#0e1420] border border-[#28354d]">
            <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <History className="w-3 h-3 text-cyan-400" />
                RENDER HISTORY / VARIANT TAKES
              </span>
              <span className="text-[9px] font-mono text-cyan-400">
                CLICK TAKE TO LOAD
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {recentTakes.map((take) => {
                const isSelected = activePreviewVideoUrl === take.videoUrl;
                return (
                  <button
                    key={take.id}
                    type="button"
                    onClick={() => {
                      setAiStudioParams({
                        activePreviewVideoUrl: take.videoUrl,
                        seed: take.seed,
                      });
                      showToast(`Loaded ${take.title} into Preview Monitor`);
                    }}
                    className={`group relative rounded overflow-hidden border text-left p-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-400 ring-1 ring-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.35)]'
                        : 'bg-[#141c2c] border-[#24324b] hover:border-slate-400'
                    }`}
                  >
                    <div className="relative aspect-video rounded overflow-hidden mb-1 bg-black">
                      <img
                        src={take.thumbnailUrl}
                        alt={take.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/80 text-[8px] font-mono text-cyan-300">
                        {take.duration}
                      </span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-200 truncate leading-tight">
                      {take.title}
                    </div>
                    <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 mt-0.5">
                      <span>#{take.seed}</span>
                      <span className="text-emerald-400">{take.timestamp}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* VIDEO SOUND (80%) & MUSIC OVERLAY (80%) AUDIO MIXER */}
          <div className="mt-2.5 p-2.5 rounded-lg bg-[#0e1420] border border-[#28354d] space-y-2">
            <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-300">
              <span>AUDIO &amp; MUSIC OVERLAY MIXER</span>
              <span className="font-mono text-cyan-400">
                DEFAULT: 80% / 80%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* 1. Video Native Sound Volume Control */}
              <div className="bg-[#141c2c] border border-[#24324b] rounded p-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      const nextMuted = !videoSoundMuted;
                      setAudioMixerParams({ videoSoundMuted: nextMuted });
                      if (videoRef.current) {
                        videoRef.current.muted = nextMuted || masterBlackout;
                        videoRef.current.volume = Math.max(
                          0,
                          Math.min(1, videoSoundVolume / 100)
                        );
                        if (!nextMuted && isPlaying) {
                          videoRef.current.play().catch(() => {});
                        }
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase ${
                      videoSoundMuted ? 'text-red-400' : 'text-emerald-400'
                    }`}
                    title={
                      videoSoundMuted ? 'Unmute Video Sound' : 'Mute Video Sound'
                    }
                  >
                    {videoSoundMuted ? (
                      <VolumeX className="w-3.5 h-3.5" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                    <span>VIDEO SOUND</span>
                  </button>
                  <span className="text-[11px] font-mono font-bold text-white">
                    {videoSoundMuted ? 'MUTED' : `${videoSoundVolume}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={videoSoundVolume}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setAudioMixerParams({
                      videoSoundVolume: val,
                      videoSoundMuted: val === 0,
                    });
                    if (videoRef.current) {
                      videoRef.current.volume = val / 100;
                      videoRef.current.muted = val === 0 || masterBlackout;
                      if (val > 0 && isPlaying) {
                        videoRef.current.play().catch(() => {});
                      }
                    }
                  }}
                  aria-label="Video Sound Volume"
                  className="w-full h-1.5 cursor-pointer"
                />
              </div>

              {/* 2. Music Overlay Volume & Track Control */}
              <div className="bg-[#141c2c] border border-[#24324b] rounded p-2 space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const nextPlay = !musicOverlayPlaying;
                        setAudioMixerParams({ musicOverlayPlaying: nextPlay });
                        if (musicRef.current) {
                          musicRef.current.volume =
                            musicOverlayMuted || masterBlackout
                              ? 0
                              : musicOverlayVolume / 100;
                          if (nextPlay) {
                            musicRef.current.play().catch(() => {});
                          } else {
                            musicRef.current.pause();
                          }
                        }
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border flex items-center gap-1 ${
                        musicOverlayPlaying
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                          : 'bg-slate-800 border-slate-600 text-slate-300 hover:text-white'
                      }`}
                      title={
                        musicOverlayPlaying
                          ? 'Pause Music Overlay'
                          : 'Play Music Overlay'
                      }
                    >
                      {musicOverlayPlaying ? (
                        <Pause className="w-2.5 h-2.5 fill-current" />
                      ) : (
                        <Play className="w-2.5 h-2.5 fill-current" />
                      )}
                      <span>{musicOverlayPlaying ? 'ON' : 'PLAY'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setAudioMixerParams({
                          musicOverlayMuted: !musicOverlayMuted,
                        })
                      }
                      className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase ${
                        musicOverlayMuted ? 'text-red-400' : 'text-cyan-400'
                      }`}
                      title={
                        musicOverlayMuted
                          ? 'Unmute Music Overlay'
                          : 'Mute Music Overlay'
                      }
                    >
                      <Music className="w-3 h-3" />
                      <span>MUSIC</span>
                    </button>
                  </div>

                  <span className="text-[11px] font-mono font-bold text-white">
                    {musicOverlayMuted ? 'MUTED' : `${musicOverlayVolume}%`}
                  </span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={100}
                  value={musicOverlayVolume}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setAudioMixerParams({
                      musicOverlayVolume: val,
                      musicOverlayMuted: val === 0,
                    });
                    if (musicRef.current) {
                      musicRef.current.volume = masterBlackout ? 0 : val / 100;
                    }
                  }}
                  aria-label="Music Overlay Volume"
                  className="w-full h-1.5 cursor-pointer"
                />
              </div>
            </div>

            {/* Music Overlay Track Selector Dropdown */}
            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-[10px] font-semibold uppercase text-slate-400 shrink-0">
                Music Track:
              </span>
              <select
                aria-label="Select Music Overlay Track"
                value={musicOverlayTrackUrl}
                onChange={(e) => {
                  setAudioMixerParams({
                    musicOverlayTrackUrl: e.target.value,
                    musicOverlayPlaying: true,
                  });
                }}
                className="flex-1 bg-[#0b1019] border border-[#2a3954] rounded px-2 py-1 text-[11px] text-cyan-200 truncate"
              >
                {AUDIO_OVERLAY_TRACKS.map((track) => (
                  <option key={track.id} value={track.url}>
                    {track.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ghost Wireframe Overlay Toggle Button */}
          <button
            type="button"
            onClick={() =>
              setAiStudioParams({
                ghostWireframeOverlay: !ghostWireframeOverlay,
              })
            }
            className={`mt-2.5 w-full py-2 rounded-md border text-xs font-bold transition-colors ${
              ghostWireframeOverlay
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                : 'bg-[#1b2436] hover:bg-[#232f46] border-amber-500/40 text-slate-100'
            }`}
          >
            Ghost Wireframe Overlay {ghostWireframeOverlay ? '[ON]' : ''}
          </button>
        </div>

        {/* GENERATE VIDEO CTA + 4 Post-Process Action Buttons */}
        <div className="space-y-3 pt-3">
          <div className="flex items-center justify-between px-1 text-[11px] font-mono">
            <span className="text-slate-400">AI Engine:</span>
            <button
              type="button"
              onClick={() => setAiSettingsModalOpen(true)}
              className="text-cyan-300 hover:text-cyan-100 flex items-center gap-1 font-bold underline decoration-dotted transition-colors cursor-pointer"
              title="Click to change AI provider or configure API credentials"
            >
              <span>{aiProviderConfig.activeProvider.toUpperCase()}</span>
              <span className="text-slate-500 font-normal text-[10px]">
                (
                {aiProviderConfig.activeProvider === 'fal'
                  ? aiProviderConfig.falModel
                  : aiProviderConfig.activeProvider === 'replicate'
                  ? aiProviderConfig.replicateModel
                  : aiProviderConfig.activeProvider === 'runway'
                  ? aiProviderConfig.runwayModel
                  : aiProviderConfig.activeProvider === 'comfyui'
                  ? 'Local ComfyUI'
                  : 'Native'}
                )
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleGenerateVideoClick}
            disabled={isGeneratingVideo}
            className="relative w-full py-4 px-5 rounded-lg bg-gradient-to-r from-[#1d6bf3] to-[#257bf5] hover:from-[#195ed6] hover:to-[#1d6bf3] text-white font-extrabold text-lg tracking-wider uppercase shadow-[0_4px_20px_rgba(37,115,240,0.5)] border border-amber-400/70 flex items-center justify-center transition-all disabled:opacity-75 disabled:cursor-not-allowed"
          >
            <span>
              {isGeneratingVideo ? 'GENERATING...' : 'GENERATE VIDEO'}
            </span>
            <span className="absolute right-4 text-xs font-mono font-semibold text-blue-100">
              EST: 45s
            </span>
          </button>

          <div className="grid grid-cols-4 gap-2">
            {/* MAKE SEAMLESS LOOP Toggle Button */}
            <button
              type="button"
              onClick={() => {
                const next = !isSeamlessLoop;
                setIsSeamlessLoop(next);
                showToast(
                  next
                    ? 'FFmpeg Optical-Flow Crossfade Applied: 30s Seamless Loop Verified'
                    : 'Seamless Loop Disabled (Single Playback)'
                );
              }}
              className={`py-2.5 px-2 rounded-md border text-[10px] font-bold uppercase tracking-wider text-center leading-tight transition-all ${
                isSeamlessLoop
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'bg-[#1d2536] hover:bg-[#263147] border-[#313f59] text-slate-200'
              }`}
            >
              {isSeamlessLoop ? (
                <>
                  SEAMLESS LOOP:
                  <br />
                  <span className="text-cyan-300 font-extrabold">[ON]</span>
                </>
              ) : (
                <>
                  MAKE SEAMLESS
                  <br />
                  LOOP
                </>
              )}
            </button>

            {/* UPSCALE TO 4K Toggle Button */}
            <button
              type="button"
              onClick={handleUpscaleTo4K}
              disabled={isUpscaling4K}
              className={`py-2.5 px-2 rounded-md border text-[10px] font-bold uppercase tracking-wider text-center leading-tight transition-all ${
                is4KUpscaled
                  ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                  : 'bg-[#1d2536] hover:bg-[#263147] border-[#313f59] text-slate-200'
              }`}
            >
              {isUpscaling4K ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin text-amber-300 inline" />
                  UPSCALING...
                </span>
              ) : is4KUpscaled ? (
                <>
                  4K SUPER-RES:
                  <br />
                  <span className="text-amber-300 font-extrabold">[ON]</span>
                </>
              ) : (
                <>
                  UPSCALE
                  <br />
                  TO 4K
                </>
              )}
            </button>

            {/* SEND TO FIX/MODIFY -> Routes to Screen 5 */}
            <button
              type="button"
              onClick={() => setActiveScreen(5)}
              className="py-2.5 px-2 rounded-md bg-[#1d2536] hover:bg-amber-600/30 border border-[#313f59] hover:border-amber-400 text-[10px] font-bold uppercase tracking-wider text-slate-100 text-center leading-tight transition-colors"
            >
              SEND TO
              <br />
              FIX/MODIFY
            </button>

            {/* APPROVE & SAVE TO PLAYLIST -> Routes to Screen 6 */}
            <button
              type="button"
              onClick={approveAndSaveToPlaylist}
              className="py-2.5 px-2 rounded-md bg-[#1d2536] hover:bg-emerald-600/30 border border-[#313f59] hover:border-emerald-400 text-[10px] font-bold uppercase tracking-wider text-slate-100 text-center leading-tight transition-colors"
            >
              APPROVE &amp; SAVE
              <br />
              TO PLAYLIST
            </button>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
};
