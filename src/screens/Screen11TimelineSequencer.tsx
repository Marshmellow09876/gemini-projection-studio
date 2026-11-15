import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Scissors,
  Split,
  Trash2,
  ZoomIn,
  ZoomOut,
  Layers,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Plus,
  Sliders,
  Sparkles,
  Tv,
  Music,
  Radio,
  Flame,
  User,
  Clock,
  Maximize2,
  FastForward,
  Rewind,
  FileVideo,
  ArrowRightLeft,
  Check,
} from 'lucide-react';
import { useProjectionStore, TimelineTrack, TimelineClip, PlaylistClip } from '../store/useProjectionStore';
import { PreviewZoomControl } from '../components/PreviewZoomControl';

export const Screen11TimelineSequencer: React.FC = () => {
  const {
    timelineTracks,
    timelinePlayheadSec,
    isTimelinePlaying,
    timelineZoom,
    setTimelinePlayheadSec,
    setIsTimelinePlaying,
    setTimelineZoom,
    addTimelineClip,
    updateTimelineClip,
    toggleTrackMute,
    toggleTrackSolo,
    layers,
    customReferencePhotoUrl,
    playlistClips,
    setPlaylistClips,
  } = useProjectionStore();

  const [selectedClipId, setSelectedClipId] = useState<string>('clip-1');
  const [selectedTrackId, setSelectedTrackId] = useState<string>('track-video');
  const [snapToBpm, setSnapToBpm] = useState<boolean>(true);
  const [bpmValue, setBpmValue] = useState<number>(128);
  const [curveType, setCurveType] = useState<'linear' | 'ease-in-out' | 'bounce'>('ease-in-out');
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // Drag-and-drop / drag-to-move state
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
  const dragStartXRef = useRef<number>(0);
  const dragStartSecRef = useRef<number>(0);
  const dragTrackIdRef = useRef<string>('');

  // Animation loop for playhead playback
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      if (isTimelinePlaying) {
        const delta = (currentTime - lastTime) / 1000;
        setTimelinePlayheadSec(timelinePlayheadSec + delta);
        if (timelinePlayheadSec >= 90) {
          setTimelinePlayheadSec(0);
        }
      }
      lastTime = currentTime;
      if (isTimelinePlaying) {
        animId = requestAnimationFrame(loop);
      }
    };

    if (isTimelinePlaying) {
      animId = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(animId);
  }, [isTimelinePlaying, timelinePlayheadSec, setTimelinePlayheadSec]);

  // Global mouse handlers for clip dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingClipId || !dragTrackIdRef.current) return;
      const pixelsPerSecond = 14 * timelineZoom;
      const deltaX = e.clientX - dragStartXRef.current;
      const deltaSec = deltaX / pixelsPerSecond;
      let newSec = Math.max(0, dragStartSecRef.current + deltaSec);

      if (snapToBpm) {
        const beatSec = 60 / bpmValue;
        newSec = Math.round(newSec / beatSec) * beatSec;
      }

      updateTimelineClip(dragTrackIdRef.current, draggingClipId, {
        startSec: Number(newSec.toFixed(2)),
      });
    };

    const handleMouseUp = () => {
      if (draggingClipId) {
        setDraggingClipId(null);
      }
    };

    if (draggingClipId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingClipId, timelineZoom, snapToBpm, bpmValue, updateTimelineClip]);

  // Format SMPTE Timecode HH:MM:SS:FF (at 30fps)
  const formatTimecode = (sec: number) => {
    const totalFrames = Math.floor(sec * 30);
    const frames = totalFrames % 30;
    const totalSeconds = Math.floor(sec);
    const s = totalSeconds % 60;
    const m = Math.floor((totalSeconds / 60) % 60);
    const h = Math.floor(totalSeconds / 3600);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  const selectedClip = timelineTracks
    .flatMap((t) => t.clips)
    .find((c) => c.id === selectedClipId);

  const pixelsPerSecond = 14 * timelineZoom;

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingClipId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newSec = Math.max(0, clickX / pixelsPerSecond);
    setTimelinePlayheadSec(newSec);
  };

  // Sync timeline video track to Show Playlist
  const handleSyncToPlaylist = () => {
    const videoTrack = timelineTracks.find((t) => t.id === 'track-video');
    if (!videoTrack || videoTrack.clips.length === 0) return;

    const sortedClips = [...videoTrack.clips].sort((a, b) => a.startSec - b.startSec);
    const updatedPlaylist: PlaylistClip[] = sortedClips.map((clip, idx) => {
      const existing = playlistClips[idx] || playlistClips[0];
      return {
        ...existing,
        id: `clip-tl-${clip.id}`,
        index: idx + 1,
        title: `${String(idx + 1).padStart(2, '0')} - ${clip.title}`,
        durationSec: clip.durationSec,
        durationFormatted: `00:00:${String(Math.floor(clip.durationSec)).padStart(2, '0')}`,
      };
    });

    setPlaylistClips(updatedPlaylist);
    setSyncToast('Synced Video Track to Show Playlist!');
    setTimeout(() => setSyncToast(null), 2500);
  };

  // Import Playlist Clips into Track 1
  const handleImportPlaylistToTimeline = () => {
    if (playlistClips.length === 0) return;
    let currentStart = 0;
    playlistClips.forEach((pClip) => {
      addTimelineClip('track-video', {
        title: pClip.title.replace(/^\d+\s*-\s*/, ''),
        startSec: currentStart,
        durationSec: pClip.durationSec,
        sourceType: 'video',
        opacity: 1,
        color: '#00f0ff',
      });
      currentStart += pClip.durationSec;
    });
    setSyncToast(`Imported ${playlistClips.length} Playlist Clips to Track 1!`);
    setTimeout(() => setSyncToast(null), 2500);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#080d14] text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. TOP TRANSPORT & TIMECODE BAR */}
      <div className="h-14 bg-[#0d1420] border-b border-[#1b2638] px-4 flex items-center justify-between gap-4 shrink-0 shadow-md">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTimelinePlayheadSec(0)}
            title="Rewind to Start"
            className="p-2 rounded hover:bg-[#1a2538] text-slate-400 hover:text-white transition-colors"
          >
            <Rewind className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsTimelinePlaying(!isTimelinePlaying)}
            className={`px-4 py-1.5 rounded-md font-bold text-xs uppercase flex items-center gap-2 shadow-lg transition-all ${
              isTimelinePlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/40'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
            }`}
          >
            {isTimelinePlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" /> Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" /> Play
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTimelinePlayheadSec(timelinePlayheadSec + 10)}
            title="Fast Forward 10s"
            className="p-2 rounded hover:bg-[#1a2538] text-slate-400 hover:text-white transition-colors"
          >
            <FastForward className="w-4 h-4" />
          </button>
          <div className="h-6 w-px bg-[#1f2d42] mx-2" />
          {/* SMPTE Display */}
          <div className="bg-[#05090f] border border-[#1d2a3d] px-3 py-1 rounded font-mono text-cyan-400 text-sm tracking-widest font-semibold flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-cyan-500" />
            <span>{formatTimecode(timelinePlayheadSec)}</span>
          </div>
        </div>

        {/* Editing Tools */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSnapToBpm(!snapToBpm)}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              snapToBpm
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                : 'bg-[#121b2a] text-slate-400 border-[#1f2d42]'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            Snap BPM ({bpmValue})
          </button>
          <button
            type="button"
            title="Split Clip at Playhead (S)"
            className="p-1.5 rounded hover:bg-[#1a2538] text-slate-300 hover:text-white border border-[#1f2d42]"
          >
            <Scissors className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (selectedTrackId && selectedClip) {
                addTimelineClip(selectedTrackId, {
                  title: `${selectedClip.title} (Copy)`,
                  startSec: timelinePlayheadSec,
                  durationSec: selectedClip.durationSec,
                  sourceType: selectedClip.sourceType as any,
                  opacity: selectedClip.opacity,
                  color: selectedClip.color,
                });
              }
            }}
            className="px-2.5 py-1 rounded bg-[#162132] hover:bg-[#202f47] border border-[#233550] text-xs font-bold text-slate-200 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" /> Add Clip
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTimelineZoom(timelineZoom - 0.25)}
            className="p-1.5 rounded hover:bg-[#1a2538] text-slate-300"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-slate-400 w-10 text-center">
            {Math.round(timelineZoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setTimelineZoom(timelineZoom + 0.25)}
            className="p-1.5 rounded hover:bg-[#1a2538] text-slate-300"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Playlist Sync Tools */}
        <div className="flex items-center gap-1.5 border-l border-[#1f2d42] pl-2">
          <button
            type="button"
            onClick={handleSyncToPlaylist}
            title="Export Video Track Order to Show Playlist"
            className="px-2.5 py-1 rounded bg-[#101926] hover:bg-[#18263a] border border-[#233550] text-[11px] font-semibold text-cyan-300 flex items-center gap-1"
          >
            <ArrowRightLeft className="w-3 h-3 text-cyan-400" />
            Sync to Playlist
          </button>
          <button
            type="button"
            onClick={handleImportPlaylistToTimeline}
            title="Import all Clips from Show Playlist to Track 1"
            className="px-2 py-1 rounded bg-[#101926] hover:bg-[#18263a] border border-[#233550] text-[11px] font-semibold text-slate-300 hover:text-white"
          >
            Import Playlist
          </button>
          {syncToast && (
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/60 flex items-center gap-1">
              <Check className="w-3 h-3" /> {syncToast}
            </span>
          )}
        </div>
      </div>

      {/* 2. UPPER HALF: MEDIA BIN | COMPOSITOR MONITOR | CLIP INSPECTOR */}
      <div className="h-[360px] grid grid-cols-12 border-b border-[#1b2638] shrink-0 bg-[#070b12]">
        {/* Upper Left: Asset Bin (Cols 3) */}
        <div className="col-span-3 border-r border-[#1b2638] flex flex-col p-3 bg-[#0a0f18]">
          <div className="flex items-center justify-between pb-2 border-b border-[#1b2638] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> Media & Asset Bin
            </span>
            <span className="text-[10px] text-cyan-400 font-mono">12 Assets</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {[
              { title: 'Ectoplasm Loop 4K', type: 'video', duration: '35s', icon: FileVideo, color: '#39ff14' },
              { title: 'Ghostbusters Firehouse HQ', type: 'video', duration: '45s', icon: FileVideo, color: '#00f0ff' },
              { title: 'Voronoi Wall Shatter', type: 'shader', duration: '20s', icon: Flame, color: '#ff007f' },
              { title: 'Singing Pumpkin Trio Rig', type: 'character', duration: '30s', icon: User, color: '#ffaa00' },
              { title: 'Tesla Electric Lightning', type: 'shader', duration: '15s', icon: Sparkles, color: '#b026ff' },
              { title: 'Isolated Vocals Stem', type: 'audio', duration: '80s', icon: Music, color: '#00ffaa' },
              { title: 'WLED Eaves Chaser', type: 'dmx', duration: '25s', icon: Radio, color: '#ffe600' },
            ].map((asset, i) => (
              <div
                key={i}
                draggable
                className="p-2 rounded bg-[#101724] border border-[#1d293d] hover:border-cyan-500/50 flex items-center justify-between cursor-grab active:cursor-grabbing group transition-all"
              >
                <div className="flex items-center gap-2">
                  <asset.icon className="w-3.5 h-3.5" style={{ color: asset.color }} />
                  <div>
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 truncate max-w-[140px]">
                      {asset.title}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono uppercase">{asset.type}</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-400 bg-[#0a0f18] px-1.5 py-0.5 rounded">
                  {asset.duration}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Upper Center: Live Compositor Monitor (Cols 6) */}
        <div className="col-span-6 flex flex-col p-3 items-center justify-center relative bg-[#05080e]">
          <div className="w-full h-full rounded border border-[#1f2d42] bg-black relative overflow-hidden flex items-center justify-center shadow-2xl">
            {/* Background reference facade */}
            <img
              src={customReferencePhotoUrl || 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80'}
              alt="Austin Ranch Facade"
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
            {/* Architectural Vector Overlay representation */}
            <div className="absolute inset-0 pointer-events-none border border-cyan-500/20">
              <div className="absolute top-4 left-4 text-[10px] font-mono text-cyan-400 bg-black/70 px-2 py-0.5 rounded border border-cyan-500/40">
                LIVE COMPOSITOR MONITOR (16:9 • 60 FPS)
              </div>
              <div className="absolute bottom-4 right-4 text-[10px] font-mono text-emerald-400 bg-black/70 px-2 py-0.5 rounded border border-emerald-500/40">
                ACTIVE LAYERS: {timelineTracks.filter((t) => !t.muted).length} / {timelineTracks.length}
              </div>
            </div>
            {/* Center animated graphic representing active playback */}
            <div className="z-10 text-center pointer-events-none">
              <div className="text-sm font-bold tracking-widest text-cyan-300 uppercase drop-shadow-[0_0_12px_rgba(0,240,255,0.8)]">
                {selectedClip ? selectedClip.title : 'Playhead Active'}
              </div>
              <div className="text-xs font-mono text-slate-400 mt-1">
                T = {timelinePlayheadSec.toFixed(2)}s / 90.00s
              </div>
            </div>
          </div>
        </div>

        {/* Upper Right: Selected Clip & Curve Inspector (Cols 3) */}
        <div className="col-span-3 border-l border-[#1b2638] flex flex-col p-3 bg-[#0a0f18]">
          <div className="flex items-center justify-between pb-2 border-b border-[#1b2638] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-fuchsia-400" /> Clip & Curve Inspector
            </span>
            <span className="text-[10px] text-fuchsia-400 font-mono">
              {selectedClip ? selectedClip.id : 'None'}
            </span>
          </div>

          {selectedClip ? (
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase">Clip Title</label>
                <input
                  type="text"
                  value={selectedClip.title}
                  onChange={(e) =>
                    selectedTrackId &&
                    updateTimelineClip(selectedTrackId, selectedClip.id, { title: e.target.value })
                  }
                  className="w-full mt-1 bg-[#121a28] border border-[#233248] rounded px-2 py-1 text-slate-200 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Start (Sec)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={selectedClip.startSec}
                    onChange={(e) =>
                      selectedTrackId &&
                      updateTimelineClip(selectedTrackId, selectedClip.id, {
                        startSec: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full mt-1 bg-[#121a28] border border-[#233248] rounded px-2 py-1 font-mono text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Duration (Sec)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={selectedClip.durationSec}
                    onChange={(e) =>
                      selectedTrackId &&
                      updateTimelineClip(selectedTrackId, selectedClip.id, {
                        durationSec: parseFloat(e.target.value) || 1,
                      })
                    }
                    className="w-full mt-1 bg-[#121a28] border border-[#233248] rounded px-2 py-1 font-mono text-slate-200"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Opacity</label>
                  <span className="text-[10px] font-mono text-cyan-300">
                    {Math.round(selectedClip.opacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={selectedClip.opacity}
                  onChange={(e) =>
                    selectedTrackId &&
                    updateTimelineClip(selectedTrackId, selectedClip.id, {
                      opacity: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-cyan-400 mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase">Bezier Interpolation Curve</label>
                <div className="grid grid-cols-3 gap-1 mt-1">
                  {(['linear', 'ease-in-out', 'bounce'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setCurveType(mode)}
                      className={`px-1.5 py-1 rounded text-[10px] font-semibold uppercase border transition-all ${
                        curveType === mode
                          ? 'bg-fuchsia-600/30 text-fuchsia-300 border-fuchsia-500'
                          : 'bg-[#101724] text-slate-400 border-[#1e2a3c]'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                {/* Interactive SVG Bezier Curve Graph */}
                <div className="mt-2 h-16 bg-[#070b13] border border-[#1b2738] rounded relative overflow-hidden flex items-center justify-center">
                  <svg className="w-full h-full px-2 py-1" viewBox="0 0 100 50">
                    <line x1="0" y1="45" x2="100" y2="45" stroke="#1f2d42" strokeWidth="1" strokeDasharray="2 2" />
                    <line x1="0" y1="5" x2="100" y2="5" stroke="#1f2d42" strokeWidth="1" strokeDasharray="2 2" />
                    <path
                      d={
                        curveType === 'linear'
                          ? 'M 5 45 L 95 5'
                          : curveType === 'bounce'
                          ? 'M 5 45 C 30 15, 50 55, 75 10 C 85 2, 90 8, 95 5'
                          : 'M 5 45 C 45 45, 55 5, 95 5'
                      }
                      fill="none"
                      stroke="#d946ef"
                      strokeWidth="2.5"
                    />
                    <polygon points="5,41 9,45 5,49 1,45" fill="#00f0ff" />
                    <polygon points="95,1 99,5 95,9 91,5" fill="#00f0ff" />
                    {curveType === 'ease-in-out' && (
                      <>
                        <line x1="5" y1="45" x2="45" y2="45" stroke="#ec4899" strokeWidth="1" strokeDasharray="1 1" />
                        <circle cx="45" cy="45" r="2" fill="#ec4899" />
                        <line x1="95" y1="5" x2="55" y2="5" stroke="#ec4899" strokeWidth="1" strokeDasharray="1 1" />
                        <circle cx="55" cy="5" r="2" fill="#ec4899" />
                      </>
                    )}
                  </svg>
                  <div className="absolute bottom-1 right-2 text-[8px] font-mono text-fuchsia-400">
                    Cubic-Bezier({curveType === 'linear' ? '0,0,1,1' : curveType === 'bounce' ? '0.7,-0.5,0.3,1.5' : '0.42,0,0.58,1'})
                  </div>
                </div>
              </div>

              <div className="p-2 rounded bg-[#0e1622] border border-[#1f2d42] text-[11px] text-slate-300">
                <span className="text-cyan-400 font-bold">Target Zone:</span> All Architectural Facades (Mapped)
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
              Select any clip on the timeline below to inspect properties.
            </div>
          )}
        </div>
      </div>

      {/* 3. BOTTOM HALF: MULTI-TRACK TIMELINE EDITOR */}
      <div className="flex-1 flex overflow-hidden bg-[#090d16]">
        {/* Track Headers (Left sidebar) */}
        <div className="w-56 border-r border-[#1b2638] bg-[#0c121e] flex flex-col shrink-0">
          <div className="h-8 border-b border-[#1b2638] px-3 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Track Name</span>
            <span>M / S / L</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-[#172030]">
            {timelineTracks.map((track) => (
              <div
                key={track.id}
                onClick={() => setSelectedTrackId(track.id)}
                className={`h-16 px-3 flex items-center justify-between cursor-pointer transition-colors ${
                  selectedTrackId === track.id ? 'bg-[#152033]' : 'hover:bg-[#101726]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: track.color }} />
                  <div className="truncate">
                    <div className="text-xs font-bold text-slate-200 truncate">{track.name}</div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase">{track.type}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTrackMute(track.id);
                    }}
                    className={`p-1 rounded text-[10px] font-bold ${
                      track.muted ? 'bg-rose-600 text-white' : 'bg-[#1a2538] text-slate-400 hover:text-white'
                    }`}
                  >
                    M
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTrackSolo(track.id);
                    }}
                    className={`p-1 rounded text-[10px] font-bold ${
                      track.solo ? 'bg-amber-600 text-white' : 'bg-[#1a2538] text-slate-400 hover:text-white'
                    }`}
                  >
                    S
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Tracks & Ruler Canvas (Right Area) */}
        <div className="flex-1 flex flex-col overflow-x-auto relative" onClick={handleTimelineClick}>
          {/* Time Ruler */}
          <div className="h-8 border-b border-[#1b2638] bg-[#0d1422] relative shrink-0">
            {Array.from({ length: 19 }).map((_, i) => {
              const sec = i * 5;
              const left = sec * pixelsPerSecond;
              return (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-l border-[#1f2d42] pl-1 text-[10px] font-mono text-slate-400 flex items-center"
                  style={{ left: `${left}px` }}
                >
                  {sec}s
                </div>
              );
            })}
          </div>

          {/* Tracks Content Area */}
          <div className="flex-1 relative overflow-y-auto divide-y divide-[#172030] bg-[#070b13]">
            {/* Playhead Vertical Needle */}
            <div
              className="absolute top-0 bottom-0 z-30 pointer-events-none flex flex-col items-center"
              style={{ left: `${timelinePlayheadSec * pixelsPerSecond}px` }}
            >
              <div className="w-3 h-3 bg-rose-500 rotate-45 -mt-1 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
              <div className="w-0.5 flex-1 bg-rose-500/90 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
            </div>

            {timelineTracks.map((track) => (
              <div key={track.id} className="h-16 relative bg-[#090e18]/40">
                {/* Horizontal Grid lines */}
                {Array.from({ length: 19 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 border-l border-[#152030]"
                    style={{ left: `${i * 5 * pixelsPerSecond}px` }}
                  />
                ))}

                {/* Clips */}
                {track.clips.map((clip) => {
                  const left = clip.startSec * pixelsPerSecond;
                  const width = clip.durationSec * pixelsPerSecond;
                  const isSelected = selectedClipId === clip.id;

                  return (
                    <div
                      key={clip.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClipId(clip.id);
                        setSelectedTrackId(track.id);
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedClipId(clip.id);
                        setSelectedTrackId(track.id);
                        setDraggingClipId(clip.id);
                        dragStartXRef.current = e.clientX;
                        dragStartSecRef.current = clip.startSec;
                        dragTrackIdRef.current = track.id;
                      }}
                      className={`absolute top-2 bottom-2 rounded-md px-2 py-1 flex items-center justify-between text-xs font-semibold cursor-grab active:cursor-grabbing shadow-md transition-all ${
                        isSelected
                          ? 'ring-2 ring-white z-20 brightness-110 shadow-lg'
                          : 'opacity-90 hover:opacity-100'
                      }`}
                      style={{
                        left: `${left}px`,
                        width: `${width}px`,
                        backgroundColor: clip.color || track.color,
                        color: '#05090f',
                      }}
                    >
                      <span className="truncate">{clip.title}</span>
                      <span className="text-[10px] font-mono opacity-80 shrink-0 ml-1">
                        {clip.durationSec}s
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
