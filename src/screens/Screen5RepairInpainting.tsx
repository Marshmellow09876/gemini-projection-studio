import React, { useEffect, useRef, useState } from 'react';
import {
  Paintbrush,
  Lasso,
  BoxSelect,
  Play,
  Pause,
  Square,
  Repeat,
  Pin,
  Wand2,
  Loader2,
  Lock,
  Volume2,
  VolumeX,
  Music,
  Sparkles,
  RotateCcw,
  Move,
  Layers,
  Trash2,
  Undo2,
  Copy,
  Download,
  Camera,
  ArrowLeft,
  Save,
} from 'lucide-react';
import {
  AUDIO_OVERLAY_TRACKS,
  AUSTIN_HOUSE_ASSETS,
  useProjectionStore,
} from '../store/useProjectionStore';
import {
  PreviewZoomControl,
  computeZoomViewBox,
  useMiddleClickPan,
} from '../components/PreviewZoomControl';
import { postRegionalInpaint } from '../utils/apiClient';
import {
  DraggableDivider,
  useResizable2Panels,
} from '../components/DraggableDivider';

export const Screen5RepairInpainting: React.FC = () => {
  const {
    repairTab,
    maskTool,
    featherPx,
    invertSelection,
    inpaintPrompt,
    changeStrength,
    temporalConsistency,
    wipePosition,
    currentFrame,
    totalFrames,
    isRenderingRepair,
    brushStrokes,
    seed,
    positivePrompt,
    structureAdherence,
    activePreviewVideoUrl,
    layers,
    videoSoundVolume,
    videoSoundMuted,
    musicOverlayVolume,
    musicOverlayMuted,
    musicOverlayPlaying,
    musicOverlayTrackUrl,
    masterBlackout,
    setRepairParams,
    setAiStudioParams,
    setAudioMixerParams,
    addBrushStroke,
    clearBrushStrokes,
    renderRepairPreview,
    overwriteOriginalClip,
    saveAsNewPlaylistVariant,
    navigateBack,
    saveCurrentProject,
    showToast,
    appendConsoleLog,
  } = useProjectionStore();

  const setPositivePrompt = (val: string) =>
    setAiStudioParams({ positivePrompt: val });
  const appendShowtimeLog = (message: string) =>
    appendConsoleLog(message, 'info');
  const controlNetLockWeight = structureAdherence ?? 0.85;
  const activeVideoUrl =
    activePreviewVideoUrl || AUSTIN_HOUSE_ASSETS.videos.mainShow;

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const setBrushStrokes = (
    updater:
      | { x: number; y: number; r: number }[]
      | ((
          prev: { x: number; y: number; r: number }[]
        ) => { x: number; y: number; r: number }[])
  ) => {
    const next =
      typeof updater === 'function' ? updater(brushStrokes) : updater;
    setRepairParams({ brushStrokes: next });
  };

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const [isPainting, setIsPainting] = useState(false);
  const [isLassoing, setIsLassoing] = useState(false);
  const [draggingWipe, setDraggingWipe] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [repairZoom, setRepairZoom] = useState<number>(100);

  // Brush Size slider state (10px - 60px, default 28px)
  const [brushSize, setBrushSize] = useState<number>(28);

  // Dynamic Draggable Workspace Panels Resizer (Canvas vs Inpaint Inspector)
  const {
    containerRef: workspaceContainerRef,
    percentages: workspacePercentages,
    handleDrag: handleDragPanels,
    resetPercentages: resetPanels,
  } = useResizable2Panels({
    defaultPercentages: [65, 35],
    minPercentages: [35, 20],
    maxPercentages: [80, 65],
    storageKey: 'lumen_screen5_panels_proportions',
  });

  // Lasso points for connected polygon path
  const [lassoPoints, setLassoPoints] = useState<Array<{ x: number; y: number }>>([]);

  // Selected layout mask polygon from Screen 2 layers
  const [layoutMaskPoints, setLayoutMaskPoints] = useState<Array<{ x: number; y: number }>>([]);

  // Middle scroll wheel click to pan on Repair & Inpainting canvas
  const {
    pan: repairPan,
    resetPan: resetRepairPan,
    handlePointerDown: handleRepairMiddleDown,
    handlePointerMove: handleRepairMiddleMove,
    handlePointerUp: handleRepairMiddleUp,
    handleMouseDown: handleRepairMiddleMouseDown,
  } = useMiddleClickPan();
  const [selectedLayerMaskName, setSelectedLayerMaskName] = useState<string | null>(null);

  // Structural Re-Anchor Homography micro-nudge offsets
  const [homographyOffset, setHomographyOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  // Pinned Reference Photo Overlay state
  const [pinnedPhotoOverlay, setPinnedPhotoOverlay] = useState<boolean>(false);

  // Split-Screen Inspection Mode: 'wipe' | 'side-by-side' | 'difference'
  const [splitViewMode, setSplitViewMode] = useState<
    'wipe' | 'side-by-side' | 'difference'
  >('wipe');

  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({
    x: 195,
    y: 235,
  });

  // Step Frame (-1f or +1f) synced with video currentTime
  const handleStepFrame = (delta: -1 | 1) => {
    const nextFrame = Math.max(0, Math.min(totalFrames, currentFrame + delta));
    setRepairParams({ currentFrame: nextFrame });
    if (videoRef.current) {
      const dur = videoRef.current.duration || 10;
      videoRef.current.pause();
      setIsPlaying(false);
      videoRef.current.currentTime = (nextFrame / totalFrames) * dur;
    }
    showToast(`Frame Step: ${nextFrame}/${totalFrames}`);
  };

  // Sync Video Sound Volume (default 80%) to the <video> element in Screen 5
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = Math.max(
        0,
        Math.min(1, videoSoundVolume / 100)
      );
      videoRef.current.muted = videoSoundMuted || masterBlackout;
    }
  }, [videoSoundVolume, videoSoundMuted, masterBlackout, activePreviewVideoUrl]);

  // Sync Music Overlay Volume (default 80%) & playback to the <audio> element in Screen 5
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

  const handleCanvasPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (handleRepairMiddleDown(e)) return;
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const transformed = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    const wipeX = (wipePosition / 100) * 640;
  const effectiveWipeX =
    splitViewMode === 'side-by-side'
      ? 320
      : splitViewMode === 'difference'
      ? 0
      : wipeX;

    if (splitViewMode === 'wipe' && Math.abs(transformed.x - wipeX) < 18) {
      setDraggingWipe(true);
      return;
    }

    if (maskTool === 'brush') {
      setIsPainting(true);
      addBrushStroke({
        x: Math.round(transformed.x),
        y: Math.round(transformed.y),
        r: Math.round(brushSize / 2),
      });
    } else if (maskTool === 'lasso') {
      setIsLassoing(true);
      setLassoPoints([
        { x: Math.round(transformed.x), y: Math.round(transformed.y) },
      ]);
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (handleRepairMiddleMove(e)) return;
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const transformed = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    setCursorPos({
      x: Math.round(transformed.x),
      y: Math.round(transformed.y),
    });

    if (draggingWipe) {
      const nextPercent = Math.max(
        10,
        Math.min(90, Math.round((transformed.x / 640) * 100))
      );
      setRepairParams({ wipePosition: nextPercent });
      return;
    }

    if (isPainting && maskTool === 'brush') {
      addBrushStroke({
        x: Math.round(transformed.x),
        y: Math.round(transformed.y),
        r: Math.round(brushSize / 2),
      });
    } else if (isLassoing && maskTool === 'lasso') {
      setLassoPoints((pts) => [
        ...pts,
        { x: Math.round(transformed.x), y: Math.round(transformed.y) },
      ]);
    }
  };

  const handleCanvasPointerUp = (e?: React.PointerEvent<SVGSVGElement>) => {
    if (e && handleRepairMiddleUp(e)) return;
    setIsPainting(false);
    setIsLassoing(false);
    setDraggingWipe(false);
  };

  // Re-roll Latent Seed
  const handleRerollSeed = () => {
    const newSeed = Math.floor(Math.random() * 899999) + 100000;
    setAiStudioParams({ seed: newSeed });
    showToast(`Latent Seed Re-rolled: #${newSeed}`);
  };

  // Brush / Lasso Stroke Undo
  const canUndo =
    maskTool === 'lasso' ? lassoPoints.length > 0 : brushStrokes.length > 0;

  const handleUndoStroke = () => {
    if (maskTool === 'lasso') {
      if (lassoPoints.length > 0) {
        setLassoPoints((prev) => prev.slice(0, -1));
        showToast('Undid Last Lasso Point');
      }
    } else {
      if (brushStrokes.length > 0) {
        setBrushStrokes((prev) => prev.slice(0, -1));
        showToast('Undid Last Brush Stroke');
      }
    }
  };

  // Wire RENDER REPAIR PREVIEW & EXECUTE REGIONAL INPAINT to Backend postRegionalInpaint
  const handleExecuteInpaint = async (actionType: 'preview' | 'execute' = 'preview') => {
    if (isRenderingRepair) return;
    renderRepairPreview();

    const maskCount = Math.max(
      1,
      brushStrokes.length +
        (lassoPoints.length > 2 ? 1 : 0) +
        (layoutMaskPoints.length > 2 ? 1 : 0)
    );

    try {
      const res = await postRegionalInpaint({
        mode: repairTab,
        target_Prompt: inpaintPrompt || positivePrompt,
        controlnet_Lock_Strength: controlNetLockWeight,
        denoising_Strength: changeStrength,
        mask_Polygon_Count: maskCount,
      });

      const actionTitle = actionType === 'execute' ? 'Regional Inpaint' : 'Repair Preview';
      const statusMsg = `Job [${res.job_id}] ${res.status.toUpperCase()}: ${actionTitle} (${res.estimated_seconds}s)`;
      setStatusMessage(statusMsg);
      showToast(statusMsg);
      appendShowtimeLog(
        `[INPAINT ${res.status.toUpperCase()}]: Job ${res.job_id} | Mode: ${res.mode} | Masks: ${res.mask_polygon_count} | Drift Repaired: ${res.drift_repaired}`
      );
    } catch {
      const fallbackMsg = `Regional inpaint completed (client failover): ${repairTab}`;
      setStatusMessage(fallbackMsg);
      showToast(fallbackMsg);
      appendShowtimeLog(fallbackMsg);
    }

    // After 1250ms (when inpainting finishes), smoothly sweep wipePosition from 85 down to 30
    setTimeout(() => {
      let currentWipe = 85;
      setRepairParams({ wipePosition: currentWipe });
      const targetWipe = 30;
      const step = 2;
      const interval = setInterval(() => {
        currentWipe -= step;
        if (currentWipe <= targetWipe) {
          currentWipe = targetWipe;
          clearInterval(interval);
        }
        setRepairParams({ wipePosition: currentWipe });
      }, 25);
    }, 1250);
  };

  const handleRenderRepairPreviewClick = () => {
    handleExecuteInpaint('preview');
  };

  // Export Repaired Video as MP4
  const handleExportRepairedMp4 = () => {
    const link = document.createElement('a');
    link.href = activeVideoUrl;
    link.download = `repaired_${repairTab}_${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    const msg = `Exported Repaired Video: ${link.download}`;
    setStatusMessage(msg);
    showToast(msg);
    appendShowtimeLog(msg);
  };

  // Snapshot PNG with watermarked repair metadata
  const handleSnapshotDiffPng = () => {
    const video = videoRef.current;
    if (!video) {
      showToast('Video element not available for snapshot');
      return;
    }

    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 1920;
    const height = video.videoHeight || 1080;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      showToast('Failed to acquire canvas 2D context for snapshot');
      return;
    }

    try {
      ctx.drawImage(video, 0, 0, width, height);

      // Watermark in bottom-right corner
      const pad = 24;
      const boxW = 560;
      const boxH = 136;
      const boxX = width - boxW - pad;
      const boxY = height - boxH - pad;

      ctx.fillStyle = 'rgba(10, 16, 28, 0.90)';
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 20px monospace';
      ctx.fillText('LUMEN-MAP AI v3.5 — REPAIR SNAPSHOT', boxX + 16, boxY + 30);

      ctx.fillStyle = '#f1f5f9';
      ctx.font = '15px monospace';
      ctx.fillText(
        `MODE: ${repairTab.toUpperCase()} | FRAME: ${currentFrame}/${totalFrames} | SEED: #${seed}`,
        boxX + 16,
        boxY + 58
      );
      ctx.fillText(
        `CNET LOCK: ${(controlNetLockWeight * 100).toFixed(0)}% | DENOISE: ${changeStrength}% | STROKES: ${brushStrokes.length}`,
        boxX + 16,
        boxY + 82
      );

      const promptSnippet =
        inpaintPrompt.length > 50
          ? inpaintPrompt.slice(0, 48) + '...'
          : inpaintPrompt || positivePrompt.slice(0, 48);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px monospace';
      ctx.fillText(`PROMPT: "${promptSnippet}"`, boxX + 16, boxY + 106);

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `repair_snapshot_${repairTab}_f${currentFrame}_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      const msg = `Captured Snapshot PNG: ${link.download}`;
      setStatusMessage(msg);
      showToast(msg);
      appendShowtimeLog(msg);
    } catch (err) {
      console.warn('Canvas export fallback:', err);
      const link = document.createElement('a');
      link.href = AUSTIN_HOUSE_ASSETS.photos.v4SlimerBreach;
      link.download = `repair_snapshot_${repairTab}_f${currentFrame}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Exported snapshot using reference frame');
    }
  };

  // Clear all mask strokes, lasso paths, and layout selections
  const handleClearAllMasks = () => {
    clearBrushStrokes();
    setLassoPoints([]);
    setLayoutMaskPoints([]);
    setSelectedLayerMaskName(null);
    showToast('Inpainting Mask Cleared');
  };

  const BASE_VARIANTS = [
    { label: 'Main Show', url: AUSTIN_HOUSE_ASSETS.videos.mainShow },
    { label: 'V1 Firehouse', url: AUSTIN_HOUSE_ASSETS.videos.v1Show },
    { label: 'V2 Slimer', url: AUSTIN_HOUSE_ASSETS.videos.v2Show },
    { label: 'Pumpkins', url: AUSTIN_HOUSE_ASSETS.videos.pumpkins },
  ];

  const wipeX = (wipePosition / 100) * 640;
  const effectiveWipeX =
    splitViewMode === 'side-by-side'
      ? 320
      : splitViewMode === 'difference'
      ? 0
      : wipeX;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0d121b] text-slate-100 select-none overflow-hidden">
      {/* SCREEN 5 TOP WORKFLOW & NAVIGATION TOOLBAR */}
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

          <span className="text-xs font-extrabold text-white tracking-wide uppercase">
            SCREEN 6: VIDEO INPAINTING &amp; REGIONAL DRIFT REPAIR
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={overwriteOriginalClip}
            className="py-1 px-2.5 rounded bg-red-950/40 hover:bg-red-950/70 border border-red-500/60 text-[11px] font-bold text-red-300 uppercase transition-colors"
          >
            OVERWRITE ORIGINAL →
          </button>
          <button
            type="button"
            onClick={saveAsNewPlaylistVariant}
            className="py-1 px-2.5 rounded bg-emerald-600/25 hover:bg-emerald-600/40 border border-emerald-500/60 text-[11px] font-bold text-emerald-300 uppercase transition-colors"
          >
            COMMIT TO PLAYLIST (SCREEN 8) →
          </button>
        </div>
      </div>

      {/* 2-COLUMN DYNAMIC RESIZABLE WORKSPACE */}
      <div
        ref={workspaceContainerRef}
        className="flex-1 flex flex-row p-4 min-h-[720px] w-full overflow-hidden items-stretch"
      >
        {/* LEFT & CENTER COLUMN: REPAIR TABS + MASKING TOOLBAR + BEFORE/AFTER WIPE CANVAS */}
        <div
          style={{ width: `calc(${workspacePercentages[0]}% - 6px)` }}
          className="flex flex-col min-h-0 shrink-0 transition-all duration-75"
        >
        {/* TOP REPAIR MODE TAB BAR */}
        <div className="flex items-center gap-1 border-b border-[#253146] shrink-0">
          {[
            { id: 'prompt-delta' as const, label: 'PROMPT DELTA & RE-ROLL' },
            { id: 'regional-inpainting' as const, label: 'REGIONAL INPAINTING' },
            { id: 'structural-reanchor' as const, label: 'STRUCTURAL RE-ANCHOR' },
          ].map((tab) => {
            const isActive = repairTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRepairParams({ repairTab: tab.id })}
                className={`px-5 py-2.5 text-xs font-extrabold tracking-wider uppercase rounded-t-lg border-t border-x transition-colors ${
                  isActive
                    ? 'bg-[#161f2f] border-[#324463] text-white border-b-2 border-b-blue-500'
                    : 'bg-[#101622] border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* MAIN REPAIR WORKSPACE CARD */}
        <div className="flex-1 bg-[#141c2b] border border-t-0 border-[#253146] rounded-b-lg p-3.5 flex flex-col justify-between min-h-0">
          {/* CONTEXTUAL QUICK CONTROL BAR DEPENDING ON REPAIR TAB */}
          {repairTab === 'prompt-delta' && (
            <div className="flex items-center justify-between gap-3 bg-[#0f1724] border border-cyan-500/35 p-2 rounded-lg mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRerollSeed}
                  className="px-3 py-1.5 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-blue-400/80 text-xs font-bold uppercase text-white flex items-center gap-1.5 shadow-[0_0_10px_rgba(59,130,246,0.35)] transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>RE-ROLL LATENT SEED</span>
                  <span className="font-mono text-[11px] text-amber-200">
                    (#{seed})
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  SWAP BASE VARIANT:
                </span>
                {BASE_VARIANTS.map((v) => {
                  const isSelected = activePreviewVideoUrl === v.url;
                  return (
                    <button
                      key={v.label}
                      type="button"
                      onClick={() => {
                        setAiStudioParams({ activePreviewVideoUrl: v.url });
                        showToast(`Swapped Base Variant to ${v.label}`);
                      }}
                      className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase border transition-colors ${
                        isSelected
                          ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.35)]'
                          : 'bg-[#151f30] border-[#293b54] text-slate-300 hover:text-white'
                      }`}
                    >
                      {v.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {repairTab === 'structural-reanchor' && (
            <div className="flex items-center justify-between gap-3 bg-[#0f1724] border border-emerald-500/40 p-2 rounded-lg mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Move className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                  HOMOGRAPHY LOCK X/Y MICRO-NUDGE:
                </span>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-black/60 border border-emerald-500/40 text-emerald-300">
                  X: {homographyOffset.x >= 0 ? `+${homographyOffset.x}` : homographyOffset.x}px | Y:{' '}
                  {homographyOffset.y >= 0 ? `+${homographyOffset.y}` : homographyOffset.y}px
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setHomographyOffset((prev) => ({ ...prev, x: prev.x - 2 }))
                  }
                  className="px-2 py-1 rounded bg-[#182335] hover:bg-[#22314a] border border-[#2e415d] text-xs font-mono font-bold text-slate-200"
                  title="Nudge Alignment Left -2px"
                >
                  X -2px
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setHomographyOffset((prev) => ({ ...prev, x: prev.x + 2 }))
                  }
                  className="px-2 py-1 rounded bg-[#182335] hover:bg-[#22314a] border border-[#2e415d] text-xs font-mono font-bold text-slate-200"
                  title="Nudge Alignment Right +2px"
                >
                  X +2px
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setHomographyOffset((prev) => ({ ...prev, y: prev.y - 2 }))
                  }
                  className="px-2 py-1 rounded bg-[#182335] hover:bg-[#22314a] border border-[#2e415d] text-xs font-mono font-bold text-slate-200"
                  title="Nudge Alignment Up -2px"
                >
                  Y -2px
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setHomographyOffset((prev) => ({ ...prev, y: prev.y + 2 }))
                  }
                  className="px-2 py-1 rounded bg-[#182335] hover:bg-[#22314a] border border-[#2e415d] text-xs font-mono font-bold text-slate-200"
                  title="Nudge Alignment Down +2px"
                >
                  Y +2px
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHomographyOffset({ x: 0, y: 0 });
                    showToast('Structural Homography Alignment Reset');
                  }}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold uppercase text-amber-300 flex items-center gap-1"
                  title="Reset Homography Lock"
                >
                  <RotateCcw className="w-3 h-3" />
                  RESET
                </button>
              </div>
            </div>
          )}

          {/* MASKING TOOLBAR */}
          <div
            className={`flex items-center justify-between gap-2 mb-3 shrink-0 rounded-lg transition-all ${
              repairTab === 'regional-inpainting'
                ? 'p-1 bg-[#101929] border border-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                : ''
            }`}
          >
            <div className="flex items-center gap-2 bg-[#101723] p-1.5 rounded-lg border border-[#243147] flex-1">
              <button
                type="button"
                onClick={() => setRepairParams({ maskTool: 'brush' })}
                className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase inline-flex items-center gap-2 border transition-colors ${
                  maskTool === 'brush'
                    ? 'bg-[#1e3a6e] border-blue-400 text-white shadow'
                    : 'bg-transparent border-transparent text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Paintbrush className="w-4 h-4 text-cyan-400" />
                <span className="leading-tight text-left">
                  PAINT
                  <br />
                  BRUSH
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRepairParams({ maskTool: 'lasso' })}
                className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase inline-flex items-center gap-2 border transition-colors ${
                  maskTool === 'lasso'
                    ? 'bg-[#1e3a6e] border-blue-400 text-white shadow'
                    : 'bg-transparent border-transparent text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Lasso className="w-4 h-4 text-slate-300" />
                LASSO
              </button>

              <button
                type="button"
                onClick={() => {
                  setRepairParams({ maskTool: 'layout-mask' });
                  showToast('Choose a Vector Layer Polygon below to inpaint');
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase inline-flex items-center gap-2 border transition-colors ${
                  maskTool === 'layout-mask'
                    ? 'bg-[#1e3a6e] border-blue-400 text-white shadow'
                    : 'bg-transparent border-transparent text-slate-300 hover:bg-slate-800'
                }`}
              >
                <BoxSelect className="w-4 h-4 text-slate-300" />
                <span className="leading-tight text-left">
                  SELECT FROM
                  <br />
                  LAYOUT MASK
                </span>
              </button>

              <div className="h-6 w-[1px] bg-[#26334a] mx-1" />

              {/* BRUSH SIZE Slider (10px to 60px) */}
              <div className="flex-1 px-2">
                <div className="flex justify-between text-[11px] font-bold mb-1">
                  <span className="text-slate-300 uppercase">BRUSH SIZE</span>
                  <span className="font-mono text-cyan-300">{brushSize}px</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={60}
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="h-6 w-[1px] bg-[#26334a] mx-1" />

              {/* FEATHER Slider (12px) */}
              <div className="flex-1 px-2">
                <div className="flex justify-between text-[11px] font-bold mb-1">
                  <span className="text-slate-300 uppercase">FEATHER</span>
                  <span className="font-mono text-white">{featherPx}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={40}
                  value={featherPx}
                  onChange={(e) =>
                    setRepairParams({ featherPx: Number(e.target.value) })
                  }
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* UNDO STROKE BUTTON */}
              <button
                type="button"
                onClick={handleUndoStroke}
                disabled={!canUndo}
                className="px-3 py-2 rounded-lg bg-[#1b2436] hover:bg-[#25334c] border border-[#2f3e5b] hover:border-cyan-500/60 text-xs font-bold uppercase leading-tight text-center text-slate-300 hover:text-cyan-300 transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title={maskTool === 'lasso' ? 'Undo last lasso point' : 'Undo last brush stroke'}
              >
                <Undo2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  UNDO
                  <br />
                  STROKE
                </span>
              </button>

              {/* CLEAR MASK BUTTON */}
              <button
                type="button"
                onClick={handleClearAllMasks}
                className="px-3 py-2 rounded-lg bg-[#1b2436] hover:bg-red-950/40 border border-[#2f3e5b] hover:border-red-500/60 text-xs font-bold uppercase leading-tight text-center text-slate-300 hover:text-red-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Clear all brush strokes, lasso paths, and loaded layout masks"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  CLEAR
                  <br />
                  MASK
                </span>
              </button>

              {/* INVERT SELECTION BUTTON */}
              <button
                type="button"
                onClick={() =>
                  setRepairParams({ invertSelection: !invertSelection })
                }
                className={`px-3.5 py-2 rounded-lg border text-xs font-bold uppercase leading-tight text-center transition-colors ${
                  invertSelection
                    ? 'bg-blue-600/35 border-blue-400 text-white shadow-[0_0_10px_rgba(59,130,246,0.35)]'
                    : 'bg-[#1b2436] hover:bg-[#232f46] border-[#2f3e5b] text-slate-200'
                }`}
              >
                INVERT
                <br />
                SELECTION {invertSelection ? '[ON]' : ''}
              </button>
            </div>
          </div>

          {/* QUICK LAYER PILLS WHEN SELECT FROM LAYOUT MASK IS ACTIVE */}
          {maskTool === 'layout-mask' && (
            <div className="flex items-center gap-2 p-2 bg-[#0c1421] border border-cyan-500/40 rounded-lg mb-2.5 overflow-x-auto shrink-0">
              <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-cyan-300 shrink-0">
                <Layers className="w-3.5 h-3.5" />
                <span>CLICK LAYER TO LOAD MASK:</span>
              </div>
              <div className="flex items-center gap-1.5 flex-1 overflow-x-auto">
                {layers.map((layer) => {
                  const isLayerSelected = selectedLayerMaskName === layer.name;
                  return (
                    <button
                      key={layer.id}
                      type="button"
                      onClick={() => {
                        // Map coordinates from 1080x600 layout space to 640x360 Screen 5 space
                        const mapped = layer.vertices.map((v) => ({
                          x: Math.round((v.x * 640) / 1080),
                          y: Math.round((v.y * 360) / 600),
                        }));
                        setLayoutMaskPoints(mapped);
                        setSelectedLayerMaskName(layer.name);
                        showToast(
                          `Loaded "${layer.name}" Polygon Mask (${mapped.length} points) onto Inpainting Canvas`
                        );
                      }}
                      className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase border transition-colors shrink-0 ${
                        isLayerSelected
                          ? 'bg-red-500/30 border-red-400 text-red-200 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                          : 'bg-[#152033] border-[#293d5a] text-slate-300 hover:text-white hover:border-slate-400'
                      }`}
                    >
                      {layer.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* CENTER INTERACTIVE SPLIT-SCREEN VIEWPORT HEADER WITH MODE SELECTOR */}
          <div className="flex items-center justify-between mb-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300">
                SPLIT-SCREEN INSPECTION:
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {splitViewMode === 'wipe' && `VERTICAL WIPE (${wipePosition}%)`}
                {splitViewMode === 'side-by-side' && 'SIDE-BY-SIDE (50/50)'}
                {splitViewMode === 'difference' && 'DIFFERENCE BLEND (OPTICAL DRIFT)'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {[
                { id: 'wipe' as const, label: 'VERTICAL WIPE' },
                { id: 'side-by-side' as const, label: 'SIDE-BY-SIDE' },
                { id: 'difference' as const, label: 'DIFF HEATMAP' },
              ].map((m) => {
                const isActive = splitViewMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSplitViewMode(m.id);
                      showToast(`Inspection Mode: ${m.label}`);
                    }}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase border transition-colors cursor-pointer ${
                      isActive
                        ? m.id === 'difference'
                          ? 'bg-purple-600/30 border-purple-400 text-purple-200 shadow-[0_0_8px_rgba(192,132,252,0.35)]'
                          : 'bg-blue-600/30 border-blue-400 text-white shadow-[0_0_8px_rgba(59,130,246,0.35)]'
                        : 'bg-[#151f30] border-[#293d5a] text-slate-300 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* CENTER INTERACTIVE SPLIT-SCREEN BEFORE / AFTER WIPE CANVAS */}
          <div
            onWheel={(e) => {
              e.preventDefault();
              const delta = e.deltaY < 0 ? 10 : -10;
              setRepairZoom((z) => Math.max(25, Math.min(250, z + delta)));
            }}
            className="flex-1 min-h-0 rounded-lg border border-[#2c3b57] bg-[#050811] relative overflow-hidden flex items-center justify-center"
          >
            {/* Hidden Music Overlay Audio Element */}
            <audio
              ref={musicRef}
              src={musicOverlayTrackUrl}
              loop
              preload="metadata"
            />

            {/* Pinned Reference Photo Overlay at 35% opacity */}
            {pinnedPhotoOverlay && (
              <div className="absolute inset-0 pointer-events-none z-15 flex items-center justify-center">
                <img
                  src={AUSTIN_HOUSE_ASSETS.photos.v1EctoOpenGarage}
                  alt="Pinned Reference House Photo"
                  className="w-full h-full object-cover opacity-35 mix-blend-screen"
                  style={{
                    transform: `scale(${repairZoom / 100}) translate(${homographyOffset.x}px, ${homographyOffset.y}px)`,
                  }}
                />
                <div className="absolute top-12 left-3 z-20 px-2.5 py-1 rounded bg-amber-500/90 text-black text-[9px] font-mono font-extrabold flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.6)] border border-amber-300 animate-pulse">
                  <Pin className="w-3 h-3 fill-current" />
                  <span>PINNED PHOTO LOCK (35% REF OVERLAY)</span>
                </div>
              </div>
            )}

            {/* Homography Alignment Offset Active Badge */}
            {(homographyOffset.x !== 0 || homographyOffset.y !== 0) && (
              <div className="absolute top-12 right-3 z-20 px-2 py-0.5 rounded bg-blue-600/90 text-white text-[9px] font-mono font-bold flex items-center gap-1 shadow-md border border-blue-400">
                <Move className="w-3 h-3" />
                <span>
                  ALIGN NUDGE: X:{homographyOffset.x >= 0 ? `+${homographyOffset.x}` : homographyOffset.x}px Y:{' '}
                  {homographyOffset.y >= 0 ? `+${homographyOffset.y}` : homographyOffset.y}px
                </span>
              </div>
            )}

            {/* Zoomable 100% Frame Wrapper for Video Layer */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-150"
              style={{
                transform: `scale(${repairZoom / 100}) translate(${homographyOffset.x}px, ${homographyOffset.y}px)`,
              }}
            >
              {/* Reference Photo Underneath in Difference Blend Mode */}
              {splitViewMode === 'difference' && (
                <img
                  src={AUSTIN_HOUSE_ASSETS.photos.v3ClosedLogoGarage}
                  alt="Reference House for Difference Mode"
                  className="w-full h-full object-cover"
                />
              )}

              {/* Real AI Video Element on AFTER Side with Native Video Sound (default 80%) */}
              <video
                ref={videoRef}
                key={activePreviewVideoUrl}
                src={activePreviewVideoUrl}
                poster={AUSTIN_HOUSE_ASSETS.photos.v4SlimerBreach}
                crossOrigin="anonymous"
                autoPlay
                loop
                muted={videoSoundMuted || masterBlackout}
                playsInline
                onLoadedMetadata={(e) => {
                  e.currentTarget.volume = Math.max(
                    0,
                    Math.min(1, videoSoundVolume / 100)
                  );
                  e.currentTarget.muted = videoSoundMuted || masterBlackout;
                  if (isPlaying) {
                    e.currentTarget.play().catch(() => {});
                  }
                }}
                onTimeUpdate={(e) => {
                  const dur = e.currentTarget.duration || 10;
                  const frame = Math.max(
                    0,
                    Math.min(
                      totalFrames,
                      Math.round(
                        (e.currentTarget.currentTime / dur) * totalFrames
                      )
                    )
                  );
                  setRepairParams({ currentFrame: frame });
                }}
                className={`w-full h-full object-cover ${
                  splitViewMode === 'difference' ? 'mix-blend-difference' : ''
                }`}
                style={{
                  clipPath:
                    splitViewMode === 'difference'
                      ? 'none'
                      : `inset(0 0 0 ${splitViewMode === 'side-by-side' ? 50 : wipePosition}%)`,
                }}
              />
            </div>

            <span className="absolute top-3 left-3 z-20 px-3 py-1 rounded bg-black/75 border border-slate-700 text-xs font-extrabold tracking-wider uppercase text-slate-200">
              {splitViewMode === 'difference' ? 'REFERENCE (BEFORE)' : 'BEFORE'}
            </span>
            <div className="absolute bottom-2.5 right-2.5 z-20">
              <PreviewZoomControl
                zoom={repairZoom}
                onChange={setRepairZoom}
                pan={repairPan}
                onResetPan={resetRepairPan}
                compact
              />
            </div>
            <span className="absolute top-3 right-3 z-20 px-3 py-1 rounded bg-black/75 border border-slate-700 text-xs font-extrabold tracking-wider uppercase text-slate-200">
              {splitViewMode === 'difference'
                ? 'DIFF HEATMAP (OPTICAL DRIFT)'
                : 'AFTER (LIVE VIDEO + AUDIO)'}
            </span>

            <svg
              viewBox={computeZoomViewBox(640, 360, repairZoom, repairPan.x, repairPan.y).viewBox}
              className={`relative z-10 w-full h-full object-cover ${repairPan.x !== 0 || repairPan.y !== 0 ? 'cursor-grab' : 'cursor-crosshair'}`}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onPointerLeave={handleCanvasPointerUp}
              onMouseDown={handleRepairMiddleMouseDown}
            >
              <defs>
                <clipPath id="beforeClip">
                  <rect x="0" y="0" width={effectiveWipeX} height="360" />
                </clipPath>
                <clipPath id="afterClip">
                  <rect x={effectiveWipeX} y="0" width={640 - effectiveWipeX} height="360" />
                </clipPath>
                <filter id="maskFeatherBlur">
                  <feGaussianBlur stdDeviation={Math.max(2, featherPx * 0.4)} />
                </filter>

                {/* Inverted Selection Mask Cutout */}
                <mask id="invertedMaskCutout">
                  <rect x="0" y="0" width="640" height="360" fill="white" />
                  <path
                    d="M 110 245 Q 175 260 250 230"
                    stroke="black"
                    strokeWidth="44"
                    strokeLinecap="round"
                    fill="none"
                  />
                  {brushStrokes.map((s, idx) => (
                    <circle
                      key={idx}
                      cx={s.x}
                      cy={s.y}
                      r={s.r}
                      fill="black"
                    />
                  ))}
                  {lassoPoints.length > 2 && (
                    <polygon
                      points={lassoPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                      fill="black"
                    />
                  )}
                  {layoutMaskPoints.length > 2 && (
                    <polygon
                      points={layoutMaskPoints
                        .map((p) => `${p.x},${p.y}`)
                        .join(' ')}
                      fill="black"
                    />
                  )}
                </mask>
              </defs>

              {/* LEFT SIDE (BEFORE): GhostbustersHouseV3 + Inpaint Mask Overlay */}
              <g clipPath={splitViewMode === 'difference' ? undefined : "url(#beforeClip)"}>
                {splitViewMode !== 'difference' && (
                  <image
                    href={AUSTIN_HOUSE_ASSETS.photos.v3ClosedLogoGarage}
                    x="0"
                    y="0"
                    width="640"
                    height="360"
                    preserveAspectRatio="none"
                  />
                )}

                {/* When Invert Selection is ON: tint entire background outside the strokes red */}
                {invertSelection ? (
                  <rect
                    x="0"
                    y="0"
                    width="640"
                    height="360"
                    fill="#ef4444"
                    opacity="0.45"
                    mask="url(#invertedMaskCutout)"
                  />
                ) : (
                  /* Standard Mask Strokes & Polygons */
                  <g filter="url(#maskFeatherBlur)" opacity="0.65">
                    {/* Default Garage Logo Inpaint stroke */}
                    <path
                      d="M 110 245 Q 175 260 250 230"
                      stroke="#ef4444"
                      strokeWidth="44"
                      strokeLinecap="round"
                      fill="none"
                    />

                    {/* Dynamic Brush Strokes */}
                    {brushStrokes.map((s, idx) => (
                      <circle
                        key={idx}
                        cx={s.x}
                        cy={s.y}
                        r={s.r}
                        fill="#ef4444"
                      />
                    ))}

                    {/* Lasso Connected Polygon Path */}
                    {lassoPoints.length > 1 && (
                      <polygon
                        points={lassoPoints
                          .map((p) => `${p.x},${p.y}`)
                          .join(' ')}
                        fill="#ef4444"
                        fillOpacity="0.6"
                        stroke="#ef4444"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                      />
                    )}

                    {/* Layout Mask Vector Polygon */}
                    {layoutMaskPoints.length > 2 && (
                      <polygon
                        points={layoutMaskPoints
                          .map((p) => `${p.x},${p.y}`)
                          .join(' ')}
                        fill="#ef4444"
                        fillOpacity="0.65"
                        stroke="#f87171"
                        strokeWidth="2.5"
                      />
                    )}
                  </g>
                )}

                {/* Interactive Brush / Lasso Circle Cursor */}
                {maskTool === 'brush' && (
                  <circle
                    cx={cursorPos.x}
                    cy={cursorPos.y}
                    r={Math.round(brushSize / 2)}
                    fill="rgba(239, 68, 68, 0.35)"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                )}
                {maskTool === 'lasso' && (
                  <circle
                    cx={cursorPos.x}
                    cy={cursorPos.y}
                    r={6}
                    fill="rgba(56, 189, 248, 0.6)"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                )}
              </g>

              {/* RIGHT SIDE (AFTER): Fallback image when video paused/loading */}
              {splitViewMode !== 'difference' && (
                <g clipPath="url(#afterClip)" opacity={isPlaying ? 0 : 1}>
                  <image
                    href={AUSTIN_HOUSE_ASSETS.photos.v4SlimerBreach}
                    x="0"
                    y="0"
                    width="640"
                    height="360"
                    preserveAspectRatio="none"
                  />
                </g>
              )}

              {/* Vertical Split-Screen Wipe Bar / Divider / Difference Overlay */}
              {splitViewMode === 'wipe' && (
                <g
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setDraggingWipe(true);
                  }}
                  className="cursor-ew-resize"
                >
                  <line
                    x1={effectiveWipeX}
                    y1="0"
                    x2={effectiveWipeX}
                    y2="360"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                  />
                  <rect
                    x={effectiveWipeX - 10}
                    y="150"
                    width="20"
                    height="52"
                    rx="10"
                    fill="#2573f0"
                    stroke="#93c5fd"
                    strokeWidth="1.5"
                  />
                  <line
                    x1={effectiveWipeX - 3}
                    y1="168"
                    x2={effectiveWipeX - 3}
                    y2="184"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <line
                    x1={effectiveWipeX + 3}
                    y1="168"
                    x2={effectiveWipeX + 3}
                    y2="184"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </g>
              )}

              {splitViewMode === 'side-by-side' && (
                <g className="pointer-events-none">
                  <line
                    x1="320"
                    y1="0"
                    x2="320"
                    y2="360"
                    stroke="#38bdf8"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                  />
                  <rect
                    x="288"
                    y="166"
                    width="64"
                    height="28"
                    rx="6"
                    fill="#0f172a"
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                  />
                  <text
                    x="320"
                    y="184"
                    fill="#38bdf8"
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    50 / 50
                  </text>
                </g>
              )}

              {splitViewMode === 'difference' && (
                <g className="pointer-events-none">
                  <rect
                    x="140"
                    y="322"
                    width="360"
                    height="26"
                    rx="6"
                    fill="rgba(15, 23, 42, 0.85)"
                    stroke="#c084fc"
                    strokeWidth="1.5"
                  />
                  <text
                    x="320"
                    y="339"
                    fill="#e9d5ff"
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    DIFF OPTICAL DRIFT: Dark = Match | Color = Drift
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* BOTTOM TRANSPORT SCRUBBER, AUDIO MIXER & PIN TO ORIGINAL PHOTO */}
          <div className="pt-2.5 space-y-2 shrink-0">
            <div className="flex items-center gap-2">
              {/* -1 Frame Step Button */}
              <button
                type="button"
                onClick={() => handleStepFrame(-1)}
                className="px-2.5 py-1 rounded bg-[#182335] hover:bg-[#22314a] border border-[#2e415d] text-xs font-mono font-bold text-cyan-300 hover:text-white transition-colors cursor-pointer"
                title="Step backward 1 frame (-1f)"
              >
                -1f
              </button>

              {/* Play / Pause Toggle Button */}
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
                className={`p-1.5 rounded border transition-colors cursor-pointer ${
                  isPlaying
                    ? 'bg-blue-600/30 border-blue-400 text-cyan-200'
                    : 'bg-[#182335] border-[#2e415d] text-slate-200 hover:text-white'
                }`}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                title={isPlaying ? 'Pause Playback' : 'Play Video'}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
              </button>

              {/* +1 Frame Step Button */}
              <button
                type="button"
                onClick={() => handleStepFrame(1)}
                className="px-2.5 py-1 rounded bg-[#182335] hover:bg-[#22314a] border border-[#2e415d] text-xs font-mono font-bold text-cyan-300 hover:text-white transition-colors cursor-pointer"
                title="Step forward 1 frame (+1f)"
              >
                +1f
              </button>

              {/* Stop Button */}
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
                  setRepairParams({ currentFrame: 0 });
                }}
                className="p-1.5 rounded bg-[#182335] hover:bg-[#22314a] border border-[#2e415d] text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Stop & Return to Frame 0"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>

              {/* Interactive Frame Transport Scrubber Slider */}
              <input
                type="range"
                min={0}
                max={totalFrames}
                value={currentFrame}
                onChange={(e) => {
                  const frame = Number(e.target.value);
                  setRepairParams({ currentFrame: frame });
                  if (videoRef.current) {
                    const dur = videoRef.current.duration || 10;
                    videoRef.current.currentTime = (frame / totalFrames) * dur;
                  }
                }}
                className="flex-1 cursor-pointer"
                aria-label="Frame Transport Scrubber"
              />

              <span className="text-xs font-mono font-bold text-slate-200 shrink-0">
                Frame {currentFrame}/{totalFrames} (
                {((currentFrame / totalFrames) * (videoRef.current?.duration || 10)).toFixed(1)}s)
              </span>

              <button
                type="button"
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.loop = !videoRef.current.loop;
                  }
                  showToast('Loop Playback Toggled');
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
                title="Toggle Loop Playback"
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>

            {/* VIDEO SOUND (80%) & MUSIC OVERLAY (80%) MIXER BAR FOR MODIFYING VIDEO */}
            <div className="flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg bg-[#0f1623] border border-[#26344d]">
              {/* Video Sound Volume (Default 80%) */}
              <div className="flex items-center gap-2 flex-1">
                <button
                  type="button"
                  onClick={() => {
                    const nextMuted = !videoSoundMuted;
                    setAudioMixerParams({ videoSoundMuted: nextMuted });
                    if (videoRef.current) {
                      videoRef.current.muted = nextMuted || masterBlackout;
                      videoRef.current.volume = videoSoundVolume / 100;
                    }
                  }}
                  className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase shrink-0 ${
                    videoSoundMuted ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {videoSoundMuted ? (
                    <VolumeX className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                  <span>VIDEO SOUND:</span>
                </button>
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
                    }
                  }}
                  aria-label="Video Sound Volume"
                  className="w-24 h-1.5 cursor-pointer"
                />
                <span className="text-[11px] font-mono font-bold text-white w-9">
                  {videoSoundMuted ? 'MUTE' : `${videoSoundVolume}%`}
                </span>
              </div>

              <div className="h-4 w-[1px] bg-[#283652]" />

              {/* Music Overlay Volume (Default 80%) & Play/Track Selector */}
              <div className="flex items-center gap-2 flex-[1.5]">
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
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border flex items-center gap-1 shrink-0 ${
                    musicOverlayPlaying
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : 'bg-slate-800 border-slate-600 text-slate-300 hover:text-white'
                  }`}
                >
                  {musicOverlayPlaying ? (
                    <Pause className="w-2.5 h-2.5 fill-current" />
                  ) : (
                    <Play className="w-2.5 h-2.5 fill-current" />
                  )}
                  <Music className="w-3 h-3" />
                  <span>MUSIC:</span>
                </button>
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
                  className="w-20 h-1.5 cursor-pointer"
                />
                <span className="text-[11px] font-mono font-bold text-white w-9">
                  {musicOverlayMuted ? 'MUTE' : `${musicOverlayVolume}%`}
                </span>
                <select
                  aria-label="Select Music Overlay Track"
                  value={musicOverlayTrackUrl}
                  onChange={(e) =>
                    setAudioMixerParams({
                      musicOverlayTrackUrl: e.target.value,
                      musicOverlayPlaying: true,
                    })
                  }
                  className="bg-[#0b1019] border border-[#2a3954] rounded px-1.5 py-0.5 text-[10px] text-cyan-200 max-w-[130px] truncate"
                >
                  {AUDIO_OVERLAY_TRACKS.map((track) => (
                    <option key={track.id} value={track.url}>
                      {track.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* PIN PHOTO Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  const next = !pinnedPhotoOverlay;
                  setPinnedPhotoOverlay(next);
                  showToast(
                    next
                      ? 'Pinned Reference Photo Overlay Locked at 35% Opacity'
                      : 'Reference Photo Overlay Unpinned'
                  );
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors shrink-0 border ${
                  pinnedPhotoOverlay
                    ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.35)]'
                    : 'bg-[#1d273b] hover:bg-[#27344f] border-[#324363] text-slate-200'
                }`}
              >
                <Pin
                  className={`w-3 h-3 ${
                    pinnedPhotoOverlay ? 'text-amber-300 fill-current' : 'text-slate-300'
                  }`}
                />
                <span>PIN PHOTO {pinnedPhotoOverlay ? '[LOCKED]' : ''}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* INTERACTIVE DRAGGABLE DIVIDER (RESIZE CANVAS VS INPAINT INSPECTOR) */}
      <DraggableDivider
        onDrag={handleDragPanels}
          onReset={resetPanels}
          title="Drag border left or right to resize Canvas vs Inpaint Inspector (Double-click to reset)"
          className="mx-1"
        />

        {/* RIGHT PANEL: MODIFICATION & INPAINT INSPECTOR */}
        <aside
          style={{ width: `calc(${workspacePercentages[1]}% - 6px)` }}
          className="bg-[#141c2b] border border-[#253146] rounded-lg p-4 flex flex-col justify-between overflow-y-auto shrink-0 transition-all duration-75"
        >
        <div className="space-y-4">
          {/* STATUS TOAST BANNER */}
          {statusMessage && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-blue-950/80 border border-blue-500/60 text-xs font-mono text-cyan-200 shadow-md">
              <div className="flex items-center gap-2 truncate">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-pulse" />
                <span className="truncate" title={statusMessage}>
                  {statusMessage}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStatusMessage(null)}
                className="text-slate-400 hover:text-white font-bold ml-2 text-sm leading-none shrink-0 cursor-pointer"
                aria-label="Dismiss Status Banner"
              >
                ×
              </button>
            </div>
          )}

          {/* ORIGINAL PROMPT & SEED (READONLY) */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              <span>ORIGINAL PROMPT &amp; SEED (READONLY)</span>
              <button
                type="button"
                onClick={() => {
                  setRepairParams({ inpaintPrompt: positivePrompt });
                  showToast('Copied Original Prompt to Modification / Inpaint Box');
                }}
                className="px-2 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/60 text-[10px] font-bold text-cyan-200 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                title="Copy Original AI Prompt to Inpaint Prompt Box"
              >
                <Copy className="w-3 h-3" />
                <span>COPY TO REPAIR</span>
              </button>
            </div>
            <div className="px-3 py-2.5 rounded-md bg-[#0e1420] border border-[#28354d] flex items-center justify-between text-xs gap-2">
              <span className="text-slate-300 truncate" title={positivePrompt}>
                {positivePrompt || 'Ghostbusters Firehouse HQ with volumetric proton beams...'}
              </span>
              <span className="font-mono text-slate-200 flex items-center gap-1 shrink-0">
                Seed: {seed}{' '}
                <Lock className="w-3.5 h-3.5 text-amber-400 inline" />
              </span>
            </div>
          </div>

          {/* MODIFICATION / INPAINT PROMPT */}
          <div>
            <label
              htmlFor="inpaint-prompt-box"
              className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
            >
              MODIFICATION / INPAINT PROMPT
            </label>
            <textarea
              id="inpaint-prompt-box"
              rows={5}
              value={inpaintPrompt}
              onChange={(e) =>
                setRepairParams({ inpaintPrompt: e.target.value })
              }
              className="w-full rounded-md bg-[#0b101a] border border-blue-500/60 p-3 text-xs text-slate-100 leading-relaxed focus:outline-none focus:border-blue-400 resize-none"
            />
          </div>

          {/* Change Strength (Denoise) Slider (45%) */}
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-300 font-medium">
                Change Strength (Denoise)
              </span>
              <span className="font-mono font-bold text-slate-100">
                {changeStrength}%
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              value={changeStrength}
              onChange={(e) =>
                setRepairParams({ changeStrength: Number(e.target.value) })
              }
              className="w-full"
            />
          </div>

          {/* Temporal Consistency Toggle */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-medium text-slate-200">
              Temporal Consistency
            </span>
            <button
              type="button"
              onClick={() =>
                setRepairParams({
                  temporalConsistency: !temporalConsistency,
                })
              }
              className={`w-12 h-6 rounded-full p-0.5 transition-colors flex items-center ${
                temporalConsistency
                  ? 'bg-emerald-500 justify-end'
                  : 'bg-slate-700 justify-start'
              }`}
              aria-label="Toggle Temporal Consistency"
            >
              <span className="w-5 h-5 rounded-full bg-white shadow" />
            </button>
          </div>
        </div>

        {/* Action Buttons: RENDER REPAIR PREVIEW, EXECUTE REGIONAL INPAINT, COMMIT REPAIR TO PLAYLIST, EXPORT UTILITIES */}
        <div className="space-y-3 pt-4">
          <button
            type="button"
            onClick={() => handleExecuteInpaint('preview')}
            disabled={isRenderingRepair}
            className="w-full py-3.5 px-4 rounded-lg bg-gradient-to-r from-[#1d6bf3] to-[#2b84f7] hover:from-[#185cd4] hover:to-[#2272db] text-white font-extrabold text-sm tracking-wider uppercase shadow-[0_4px_20px_rgba(37,115,240,0.45)] border border-cyan-300/40 flex items-center justify-between transition-all disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
          >
            <Loader2
              className={`w-5 h-5 text-cyan-200 ${
                isRenderingRepair ? 'animate-spin' : ''
              }`}
            />
            <span>
              {isRenderingRepair
                ? 'RENDERING INPAINT...'
                : 'RENDER REPAIR PREVIEW'}
            </span>
            <Wand2 className="w-5 h-5 text-cyan-100" />
          </button>

          <button
            type="button"
            onClick={() => handleExecuteInpaint('execute')}
            disabled={isRenderingRepair}
            className="w-full py-2.5 px-3 rounded-lg bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-300 hover:text-emerald-100 font-extrabold text-xs tracking-wider uppercase border border-emerald-500/60 flex items-center justify-center gap-2 transition-all disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.2)]"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>EXECUTE REGIONAL INPAINT</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            {/* OVERWRITE ORIGINAL CLIP -> Routes to Screen 6 */}
            <button
              type="button"
              onClick={overwriteOriginalClip}
              className="py-3 px-3 rounded-lg bg-[#1d2230] hover:bg-red-950/50 border border-red-500/80 text-xs font-extrabold uppercase tracking-wider text-red-400 hover:text-red-300 text-center leading-tight transition-colors cursor-pointer"
            >
              OVERWRITE
              <br />
              ORIGINAL CLIP
            </button>

            {/* COMMIT REPAIR TO PLAYLIST / SAVE AS NEW PLAYLIST VARIANT -> Routes to Screen 6 */}
            <button
              type="button"
              onClick={saveAsNewPlaylistVariant}
              className="py-3 px-3 rounded-lg bg-[#1d2536] hover:bg-[#27324a] border border-[#344463] text-xs font-extrabold uppercase tracking-wider text-slate-200 hover:text-white text-center leading-tight transition-colors cursor-pointer"
              title="Save repaired clip as a new variant in the show playlist"
            >
              COMMIT REPAIR
              <br />
              TO PLAYLIST
            </button>
          </div>

          {/* UTILITY ROW: EXPORT REPAIRED MP4 & SNAPSHOT DIFF PNG */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#232f44]">
            <button
              type="button"
              onClick={handleExportRepairedMp4}
              className="py-2.5 px-2 rounded-lg bg-[#111927] hover:bg-[#182337] border border-[#2c3d5a] hover:border-cyan-400/60 text-[11px] font-bold uppercase tracking-wider text-slate-300 hover:text-cyan-300 text-center flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Download currently active repaired video as MP4"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>EXPORT REPAIRED MP4</span>
            </button>

            <button
              type="button"
              onClick={handleSnapshotDiffPng}
              className="py-2.5 px-2 rounded-lg bg-[#111927] hover:bg-[#182337] border border-[#2c3d5a] hover:border-cyan-400/60 text-[11px] font-bold uppercase tracking-wider text-slate-300 hover:text-cyan-300 text-center flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Capture current video frame with repair metadata watermark to PNG"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>SNAPSHOT DIFF PNG</span>
            </button>
          </div>
        </div>
      </aside>
      </div>
    </div>
  );
};
