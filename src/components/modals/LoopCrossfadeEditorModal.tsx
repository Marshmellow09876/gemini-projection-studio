import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Play,
  Pause,
  Repeat,
  RotateCcw,
  Sliders,
  Check,
  Film,
  Sparkles,
  Volume2,
  VolumeX,
  FastForward,
  Clock
} from 'lucide-react';
import { useProjectionStore, PlaylistClip } from '../../store/useProjectionStore';
import {
  computeLoopCrossfadeWeights,
  renderProceduralAnimation
} from '../../utils/fitVideoToHouseEngine';

export interface LoopCrossfadeEditorModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const LoopCrossfadeEditorModal: React.FC<LoopCrossfadeEditorModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose
}) => {
  const {
    playlistClips,
    selectedClipId,
    setPlaylistClips,
    showToast
  } = useProjectionStore();

  const [internalOpen, setInternalOpen] = useState(true);
  const isVisible = propIsOpen !== undefined ? propIsOpen : internalOpen;

  const handleClose = () => {
    if (propOnClose) propOnClose();
    else setInternalOpen(false);
  };

  // Selected Clip
  const [activeClipId, setActiveClipId] = useState<string>(() => {
    if (selectedClipId) return selectedClipId;
    if (playlistClips.length > 0) return playlistClips[0].id;
    return '';
  });

  const activeClip = useMemo(() => {
    return playlistClips.find((c) => c.id === activeClipId) || playlistClips[0] || null;
  }, [playlistClips, activeClipId]);

  // Video / Source Timing Parameters
  const sourceDuration = useMemo(() => {
    if (activeClip && activeClip.durationSec > 0) return activeClip.durationSec;
    return 10.0;
  }, [activeClip]);

  const [trimIn, setTrimIn] = useState<number>(0.0);
  const [trimOut, setTrimOut] = useState<number>(sourceDuration);
  const [crossfadeSec, setCrossfadeSec] = useState<number>(1.5);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isReverse, setIsReverse] = useState<boolean>(false);

  // Playback & Scrub Position
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [scrubPositionSec, setScrubPositionSec] = useState<number>(() => {
    return Math.max(0, sourceDuration - 1.5 / 2);
  });

  // Dual Video / Canvas Elements for Live Tail-to-Head Crossfade Preview
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const primaryVideoRef = useRef<HTMLVideoElement | null>(null);
  const wrapVideoRef = useRef<HTMLVideoElement | null>(null);
  const envelopeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Dragging on timeline
  const [isDraggingScrub, setIsDraggingScrub] = useState<boolean>(false);
  const [isDraggingCrossfadeHandle, setIsDraggingCrossfadeHandle] = useState<boolean>(false);
  const timelineBarRef = useRef<HTMLDivElement | null>(null);

  // Update trimOut when source duration changes
  useEffect(() => {
    if (sourceDuration > 0) {
      setTrimOut(sourceDuration);
      setScrubPositionSec(Math.max(0, sourceDuration - crossfadeSec / 2));
    }
  }, [sourceDuration]);

  // Real-time weights sample for current scrub position
  const currentWeights = useMemo(() => {
    return computeLoopCrossfadeWeights(
      scrubPositionSec,
      trimIn,
      trimOut,
      crossfadeSec,
      playbackSpeed,
      isReverse
    );
  }, [scrubPositionSec, trimIn, trimOut, crossfadeSec, playbackSpeed, isReverse]);

  // Animation Loop for live playback
  useEffect(() => {
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (isPlaying) {
        const span = Math.max(0.1, trimOut - trimIn);
        setScrubPositionSec((prev) => {
          const delta = dt * playbackSpeed;
          let next = prev + (isReverse ? -delta : delta);
          if (next >= trimOut) {
            next = trimIn + (next - trimOut) % span;
          } else if (next < trimIn) {
            next = trimOut - (trimIn - next) % span;
          }
          return next;
        });
      }

      // Draw dual-buffer canvas blend
      renderDualBufferBlend();
      // Draw crossfade envelope graph
      drawEnvelopeGraph();

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [
    isPlaying,
    trimIn,
    trimOut,
    crossfadeSec,
    playbackSpeed,
    isReverse,
    scrubPositionSec,
    currentWeights
  ]);

  // Render Live Dual-Buffer Tail-to-Head Blend Canvas
  const renderDualBufferBlend = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, w, h);

    const { primaryTimeSec, primaryWeight, wrapTimeSec, wrapWeight, inCrossfadeZone } = currentWeights;

    // Buffer 1: Primary source frame
    const buf1 = document.createElement('canvas');
    buf1.width = w;
    buf1.height = h;
    const ctx1 = buf1.getContext('2d');
    if (ctx1) {
      if (primaryVideoRef.current && primaryVideoRef.current.readyState >= 2) {
        try {
          ctx1.drawImage(primaryVideoRef.current, 0, 0, w, h);
        } catch {
          renderProceduralAnimation(ctx1, 'Northern Lights Aurora', primaryTimeSec, w, h);
        }
      } else {
        renderProceduralAnimation(ctx1, 'Northern Lights Aurora', primaryTimeSec, w, h);
      }
    }

    // Buffer 2: Wrap-around head frame
    const buf2 = document.createElement('canvas');
    buf2.width = w;
    buf2.height = h;
    const ctx2 = buf2.getContext('2d');
    if (ctx2) {
      if (wrapVideoRef.current && wrapVideoRef.current.readyState >= 2) {
        try {
          ctx2.drawImage(wrapVideoRef.current, 0, 0, w, h);
        } catch {
          renderProceduralAnimation(ctx2, 'Northern Lights Aurora', wrapTimeSec, w, h);
        }
      } else {
        renderProceduralAnimation(ctx2, 'Northern Lights Aurora', wrapTimeSec, w, h);
      }
    }

    // Composite primary frame
    ctx.globalAlpha = primaryWeight;
    ctx.drawImage(buf1, 0, 0);

    // Composite wrap-around head frame on top
    if (inCrossfadeZone && wrapWeight > 0.001) {
      ctx.globalAlpha = wrapWeight;
      ctx.drawImage(buf2, 0, 0);
    }
    ctx.globalAlpha = 1.0;

    // Draw Crossfade Zone Indicator Pill on Preview
    if (inCrossfadeZone) {
      ctx.fillStyle = 'rgba(234, 88, 12, 0.85)'; // Orange zone badge
      ctx.beginPath();
      ctx.roundRect(16, 16, 210, 28, 6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`SEAM BLEND: ${(primaryWeight * 100).toFixed(0)}% / ${(wrapWeight * 100).toFixed(0)}%`, 26, 34);
    }
  };

  // Draw Crossfade Curve Envelope Graph
  const drawEnvelopeGraph = () => {
    const canvas = envelopeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const span = Math.max(0.1, trimOut - trimIn);
    const effCrossfade = Math.min(crossfadeSec, span);

    const timeToX = (t: number) => {
      const clamped = Math.max(trimIn, Math.min(trimOut, t));
      return ((clamped - trimIn) / span) * w;
    };

    // Draw background
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, w, h);

    // Crossfade zone fill
    if (effCrossfade > 0) {
      const windowStartX = timeToX(trimOut - effCrossfade);
      ctx.fillStyle = 'rgba(234, 88, 12, 0.15)';
      ctx.fillRect(windowStartX, 0, w - windowStartX, h);

      ctx.strokeStyle = 'rgba(234, 88, 12, 0.5)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(windowStartX, 0);
      ctx.lineTo(windowStartX, h);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Primary Weight Curve w1(t) (fades 1.0 -> 0.0 at tail)
    ctx.strokeStyle = '#38bdf8'; // Sky blue
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.15);
    if (effCrossfade > 0) {
      const startX = timeToX(trimOut - effCrossfade);
      ctx.lineTo(startX, h * 0.15);
      ctx.lineTo(w, h * 0.85);
    } else {
      ctx.lineTo(w, h * 0.15);
    }
    ctx.stroke();

    // Wrap Weight Curve w2(t) (fades 0.0 -> 1.0 at tail)
    if (effCrossfade > 0) {
      ctx.strokeStyle = '#f59e0b'; // Amber
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const startX = timeToX(trimOut - effCrossfade);
      ctx.moveTo(startX, h * 0.85);
      ctx.lineTo(w, h * 0.15);
      ctx.stroke();
    }

    // Playhead vertical line
    const scrubX = timeToX(scrubPositionSec);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(scrubX, 0);
    ctx.lineTo(scrubX, h);
    ctx.stroke();

    // Playhead triangle cap
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(scrubX - 5, 0);
    ctx.lineTo(scrubX + 5, 0);
    ctx.lineTo(scrubX, 7);
    ctx.closePath();
    ctx.fill();
  };

  // Timeline Mouse Interaction
  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = timelineBarRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const span = Math.max(0.1, trimOut - trimIn);
    const targetSec = trimIn + ratio * span;

    setScrubPositionSec(targetSec);
    setIsDraggingScrub(true);
  };

  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingScrub) return;
    const bar = timelineBarRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const span = Math.max(0.1, trimOut - trimIn);
    setScrubPositionSec(trimIn + ratio * span);
  };

  const handleTimelineMouseUp = () => {
    setIsDraggingScrub(false);
  };

  // Commit Action: Apply Loop Settings
  const handleApplyLoopSettings = () => {
    if (!activeClip) return;

    const span = Math.max(0.1, trimOut - trimIn);
    const updatedClips = playlistClips.map((c) => {
      if (c.id === activeClip.id) {
        return {
          ...c,
          durationSec: Math.round(span),
          durationFormatted: `${Math.floor(span / 60)}:${Math.floor(span % 60)
            .toString()
            .padStart(2, '0')}`,
          prompt: `${c.prompt} | Loop Crossfade: ${crossfadeSec.toFixed(2)}s @ ${playbackSpeed}x`
        };
      }
      return c;
    });

    setPlaylistClips(updatedClips);
    showToast(`Applied seamless loop crossfade (${crossfadeSec.toFixed(2)}s) to "${activeClip.title}"`);
    handleClose();
  };

  if (!isVisible) return null;

  const span = Math.max(0.1, trimOut - trimIn);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none font-sans animate-in fade-in duration-200">
      {/* Hidden decoders for clip video preview */}
      {activeClip?.videoUrl && (
        <>
          <video
            ref={primaryVideoRef}
            src={activeClip.videoUrl}
            playsInline
            muted
            className="hidden"
          />
          <video
            ref={wrapVideoRef}
            src={activeClip.videoUrl}
            playsInline
            muted
            className="hidden"
          />
        </>
      )}

      <div className="w-full max-w-5xl h-[90vh] bg-[#0b121e] border border-[#213047] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Top Header */}
        <div className="px-6 py-4 bg-[#0e1626] border-b border-[#1b2638] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-950/80 border border-orange-800/60 rounded-xl text-orange-400">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white tracking-wide">
                  Seamless Loop Crossfade Studio
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-orange-900/50 text-orange-300 border border-orange-700/50 rounded-full">
                  ClipTimeMap Parity
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Eliminate harsh loop pops with real-time tail-to-head crossfade blend envelopes
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2538] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Visualizer Stage (~60%) */}
          <div className="flex-1 bg-[#060a12] p-6 flex flex-col justify-between border-r border-[#1a2538] overflow-hidden">
            {/* Live Dual-Buffer Blend Canvas Preview */}
            <div className="flex-1 relative flex items-center justify-center min-h-0 bg-[#04060c] rounded-xl border border-[#1b283d] overflow-hidden shadow-inner mb-4">
              <canvas
                ref={previewCanvasRef}
                width={854}
                height={480}
                className="max-w-full max-h-full aspect-video object-contain"
              />

              {/* Status Readout Pill */}
              <div className="absolute top-3 right-3 font-mono text-[11px] bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-slate-300">
                <span>Playhead: </span>
                <span className="text-orange-400 font-bold">{scrubPositionSec.toFixed(2)}s</span>
              </div>
            </div>

            {/* Crossfade Curves Envelope Graph */}
            <div className="h-28 bg-[#090e18] rounded-xl border border-[#1b283d] p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <div className="flex items-center gap-3 font-mono font-semibold">
                  <span className="flex items-center gap-1.5 text-sky-400">
                    <span className="w-2.5 h-0.5 bg-sky-400 inline-block" />
                    w1 Primary Tail: {(currentWeights.primaryWeight * 100).toFixed(0)}%
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <span className="w-2.5 h-0.5 bg-amber-400 inline-block" />
                    w2 Wrap Head: {(currentWeights.wrapWeight * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="text-[10px] font-mono text-orange-300">
                  {crossfadeSec > 0
                    ? `Window: [${(trimOut - crossfadeSec).toFixed(2)}s → ${trimOut.toFixed(2)}s]`
                    : 'Hard cut (Crossfade 0s)'}
                </div>
              </div>

              {/* Envelope Canvas */}
              <div
                ref={timelineBarRef}
                onMouseDown={handleTimelineMouseDown}
                onMouseMove={handleTimelineMouseMove}
                onMouseUp={handleTimelineMouseUp}
                className="flex-1 w-full relative cursor-ew-resize rounded overflow-hidden"
              >
                <canvas
                  ref={envelopeCanvasRef}
                  width={800}
                  height={80}
                  className="w-full h-full object-fill"
                />
              </div>
            </div>

            {/* Playback Control Bar */}
            <div className="pt-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white shadow-lg transition-colors"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>

                <div className="flex items-center gap-1 bg-[#101928] p-1 rounded-lg border border-[#1e2e46] text-[11px] font-mono">
                  {[0.5, 1.0, 1.5, 2.0].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setPlaybackSpeed(s)}
                      className={`px-2 py-0.5 rounded ${
                        playbackSpeed === s
                          ? 'bg-orange-700 text-white font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setIsReverse(!isReverse)}
                  className={`px-2.5 py-1.5 rounded-lg font-bold text-xs border transition-colors ${
                    isReverse
                      ? 'bg-purple-900/40 text-purple-300 border-purple-600'
                      : 'bg-[#101928] text-slate-400 border-[#1e2e46]'
                  }`}
                >
                  Reverse Play
                </button>
              </div>

              <div className="font-mono text-xs text-slate-400">
                Trim Span: <span className="text-white font-bold">{span.toFixed(2)}s</span>
              </div>
            </div>
          </div>

          {/* Configuration Sidebar (~40%) */}
          <div className="w-96 bg-[#0b121e] flex flex-col justify-between overflow-y-auto">
            <div className="p-5 space-y-5">
              {/* Target Playlist Clip Picker */}
              <div>
                <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-2">
                  Target Playlist Clip
                </label>
                <select
                  value={activeClipId}
                  onChange={(e) => setActiveClipId(e.target.value)}
                  className="w-full bg-[#121b2a] border border-[#223249] rounded-xl px-3 py-2 text-xs text-white outline-none font-semibold cursor-pointer"
                >
                  {playlistClips.map((clip) => (
                    <option key={clip.id} value={clip.id}>
                      {clip.title} ({clip.durationFormatted})
                    </option>
                  ))}
                </select>
              </div>

              {/* Trim In & Trim Out Controls */}
              <div className="space-y-3">
                <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                  Clip Trim Boundaries
                </label>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Trim In</span>
                    <span className="font-mono text-cyan-400 font-bold">{trimIn.toFixed(2)}s</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, trimOut - 0.2)}
                    step={0.05}
                    value={trimIn}
                    onChange={(e) => setTrimIn(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 h-1.5 bg-[#172338] rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Trim Out</span>
                    <span className="font-mono text-cyan-400 font-bold">{trimOut.toFixed(2)}s</span>
                  </div>
                  <input
                    type="range"
                    min={trimIn + 0.2}
                    max={sourceDuration}
                    step={0.05}
                    value={trimOut}
                    onChange={(e) => setTrimOut(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 h-1.5 bg-[#172338] rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Loop Crossfade Duration Slider */}
              <div className="p-4 bg-[#090f19] border border-[#1b283d] rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] text-orange-400 font-bold uppercase tracking-wider">
                    Loop Crossfade Duration
                  </label>
                  <span className="font-mono text-sm text-orange-300 font-bold">
                    {crossfadeSec.toFixed(2)}s
                  </span>
                </div>

                <input
                  type="range"
                  min={0.0}
                  max={Math.min(5.0, span)}
                  step={0.05}
                  value={crossfadeSec}
                  onChange={(e) => setCrossfadeSec(parseFloat(e.target.value))}
                  className="w-full accent-orange-500 h-2 bg-[#172338] rounded-lg cursor-pointer"
                />

                {/* Quick Presets */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[0.5, 1.0, 1.5, 2.5].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setCrossfadeSec(Math.min(sec, span))}
                      className={`py-1 rounded text-[10px] font-mono font-bold border transition-colors ${
                        Math.abs(crossfadeSec - sec) < 0.05
                          ? 'bg-orange-950 text-orange-300 border-orange-600'
                          : 'bg-[#121c2d] text-slate-400 border-[#1f2d42] hover:text-white'
                      }`}
                    >
                      {sec.toFixed(1)}s
                    </button>
                  ))}
                </div>

                <div className="text-[10px] text-slate-400">
                  {crossfadeSec > 0
                    ? `Blends the last ${crossfadeSec.toFixed(2)}s of the clip smoothly into its beginning for seamless looping.`
                    : 'Hard loop cut (no blend transition).'}
                </div>
              </div>

              {/* Realtime Blend Diagnostics Card */}
              <div className="p-3 bg-[#0c1422] rounded-xl border border-[#1e2e46] text-xs space-y-1.5 font-mono">
                <div className="text-[10px] uppercase font-bold text-slate-400">Live Blend Diagnostic</div>
                <div className="text-slate-300 text-[11px]">
                  {currentWeights.inCrossfadeZone ? (
                    <span className="text-orange-400 font-bold">
                      IN CROSSFADE ZONE: Tail {currentWeights.primaryTimeSec.toFixed(2)}s ({(currentWeights.primaryWeight * 100).toFixed(0)}%) + Head {currentWeights.wrapTimeSec.toFixed(2)}s ({(currentWeights.wrapWeight * 100).toFixed(0)}%)
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      Standard Playback: Reading source @ {currentWeights.primaryTimeSec.toFixed(2)}s (100%)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-5 bg-[#0e1626] border-t border-[#182335] space-y-2">
              <button
                type="button"
                onClick={handleApplyLoopSettings}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-all"
              >
                <Check className="w-4 h-4" />
                Apply Loop Settings to Clip
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
