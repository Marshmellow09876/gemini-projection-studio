import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Play,
  Pause,
  Square,
  Repeat,
  Volume2,
  VolumeX,
  Music,
  Wand2,
  ArrowLeft,
  ArrowRight,
  Save,
  Zap,
  Sliders,
  Plus,
  Trash2,
  Edit3,
  Layers,
  Sparkles,
  Keyboard,
  Clock,
  Activity,
  Upload,
  Check,
  RotateCcw,
  Palette,
  Shield,
  Eye,
} from 'lucide-react';
import {
  AUDIO_OVERLAY_TRACKS,
  AUSTIN_HOUSE_ASSETS,
  BeatFlag,
  LayerColorModifier,
  useProjectionStore,
  VectorLayer,
} from '../store/useProjectionStore';
import {
  audioReactiveEngine,
  autoSynthesizeBeatsAndFlags,
  TapTempoCalculator,
} from '../utils/audioBeatAnalyzer';
import {
  DraggableDivider,
  useResizable2Panels,
} from '../components/DraggableDivider';

const NEON_PALETTE = [
  { name: 'Neon Cyan', hex: '#00f0ff' },
  { name: 'Electric Purple', hex: '#a855f7' },
  { name: 'Acid Green', hex: '#22c55e' },
  { name: 'Blaze Amber', hex: '#f59e0b' },
  { name: 'Crimson Drop', hex: '#ef4444' },
  { name: 'Strobe White', hex: '#ffffff' },
  { name: 'Dark Void', hex: '#000000' },
];

export const Screen10MusicSync: React.FC = () => {
  const {
    musicSyncTrackUrl,
    musicSyncTrackTitle,
    musicSyncBpm,
    beatFlags,
    selectedBeatFlagId,
    isMusicSyncEditMode,
    musicSyncTapMode,
    audioReactiveMasterGain,
    layers,
    activePreviewVideoUrl,
    setMusicSyncTrack,
    setMusicSyncBpm,
    addBeatFlag,
    updateBeatFlag,
    deleteBeatFlag,
    clearBeatFlags,
    autoDetectBeatsAndFlags,
    setSelectedBeatFlagId,
    setIsMusicSyncEditMode,
    setMusicSyncTapMode,
    setAudioReactiveMasterGain,
    updateLayerColorModifier,
    setActiveScreen,
    navigateBack,
    saveCurrentProject,
    showToast,
    setIsStemSplitterOpen,
    setIsAutoShowKaraokeModalOpen,
  } = useProjectionStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const tapCalculatorRef = useRef(new TapTempoCalculator());

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(60);
  const [isLooping, setIsLooping] = useState(true);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // Live FFT Audio-reactive state
  const [audioLevels, setAudioLevels] = useState({
    bass: 0,
    mids: 0,
    highs: 0,
    energy: 0,
    beatDetected: false,
  });

  // Track which layers are currently being pulsed by real-time audio or active flags
  const [activeFlashingLayers, setActiveFlashingLayers] = useState<Record<string, string>>({});
  const [activeFlagNotification, setActiveFlagNotification] = useState<string | null>(null);

  // Selected flag for the Inspector panel
  const selectedFlag = useMemo(
    () => beatFlags.find((f) => f.id === selectedBeatFlagId) || null,
    [beatFlags, selectedBeatFlagId]
  );

  // Selected layer for Shape Modifier panel
  const [selectedLayerIdForModifier, setSelectedLayerIdForModifier] = useState<string>(
    layers[0]?.id || 'layer-roofline'
  );

  // Dynamic Draggable Workspace Panels Resizer (Projection Viewport vs Shape/Beat Inspector)
  const {
    containerRef: workspaceContainerRef,
    percentages: workspacePercentages,
    handleDrag: handleDragPanels,
    resetPercentages: resetPanels,
  } = useResizable2Panels({
    defaultPercentages: [58, 42],
    minPercentages: [30, 25],
    maxPercentages: [75, 70],
    storageKey: 'lumen_screen10_panels_proportions',
  });
  const selectedLayer = useMemo(
    () => layers.find((l) => l.id === selectedLayerIdForModifier) || layers[0],
    [layers, selectedLayerIdForModifier]
  );

  // Connect AudioReactiveEngine to audio element on mount
  useEffect(() => {
    if (audioRef.current) {
      audioReactiveEngine.connectMediaElement(audioRef.current);
    }
  }, [musicSyncTrackUrl]);

  // Audio spectrum polling loop
  useEffect(() => {
    let animId: number;
    const updateSpectrum = () => {
      if (isPlaying) {
        const spectrum = audioReactiveEngine.getSpectrum();
        setAudioLevels({
          bass: spectrum.bass * audioReactiveMasterGain,
          mids: spectrum.mids * audioReactiveMasterGain,
          highs: spectrum.highs * audioReactiveMasterGain,
          energy: spectrum.energy * audioReactiveMasterGain,
          beatDetected: spectrum.beatDetected,
        });

        if (audioRef.current) {
          const t = audioRef.current.currentTime;
          setCurrentTimeSec(t);

          // Check if any beat flag triggers in this window (within 120ms)
          const activeTrigger = beatFlags.find(
            (f) => Math.abs(f.timestampSec - t) < 0.12
          );
          if (activeTrigger) {
            setActiveFlagNotification(`${activeTrigger.label} (${activeTrigger.type.toUpperCase()})`);
            const target = activeTrigger.targetLayerId || 'all';
            const color = activeTrigger.colorModifier || '#00f0ff';
            if (target === 'all') {
              const allMap: Record<string, string> = {};
              layers.forEach((l) => (allMap[l.id] = color));
              setActiveFlashingLayers(allMap);
            } else {
              setActiveFlashingLayers((prev) => ({ ...prev, [target]: color }));
            }
          } else {
            // Decay layer pulses
            setActiveFlashingLayers({});
            setActiveFlagNotification(null);
          }
        }
      } else {
        setAudioLevels({ bass: 0, mids: 0, highs: 0, energy: 0, beatDetected: false });
        setActiveFlashingLayers({});
        setActiveFlagNotification(null);
      }
      animId = requestAnimationFrame(updateSpectrum);
    };

    animId = requestAnimationFrame(updateSpectrum);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, audioReactiveMasterGain, beatFlags, layers]);

  // Global Keyboard shortcuts for manual tap mapping: Space, B, D, C, X, 1-6
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Space: Play / Pause toggle
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
        return;
      }

      // If tap mode or playing, handle beat taps
      const key = e.key.toLowerCase();
      const t = audioRef.current ? audioRef.current.currentTime : currentTimeSec;

      if (key === 'b') {
        e.preventDefault();
        handleManualTap('beat', 'Kick Beat', '#00f0ff');
      } else if (key === 'd') {
        e.preventDefault();
        handleManualTap('drop', '⚡ Bass Drop', '#ef4444', 'all', 1.0);
      } else if (key === 'c') {
        e.preventDefault();
        handleManualTap('color-shift', '🎨 Color Shift', '#a855f7', 'layer-windows');
      } else if (key === 'x') {
        e.preventDefault();
        handleManualTap('blackout', '⚫ Blackout Cutout', '#000000', 'layer-mainwalls');
      } else if (key === 't') {
        e.preventDefault();
        setMusicSyncTapMode(!musicSyncTapMode);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTimeSec, musicSyncTapMode]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    const video = videoRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play().then(() => {
        setIsPlaying(true);
        if (video) video.play().catch(() => {});
      }).catch((e) => console.warn('Audio play error:', e));
    } else {
      audio.pause();
      setIsPlaying(false);
      if (video) video.pause();
    }
  };

  const handleStop = () => {
    const audio = audioRef.current;
    const video = videoRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTimeSec(0);
  };

  const handleSeek = (newTime: number) => {
    const t = Math.max(0, Math.min(durationSec, newTime));
    setCurrentTimeSec(t);
    if (audioRef.current) audioRef.current.currentTime = t;
    if (videoRef.current) videoRef.current.currentTime = t % 30; // loop video in sync
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    handleSeek(ratio * durationSec);
  };

  // Manual Beat / Flag Tap Handler
  const handleManualTap = (
    type: BeatFlag['type'] = 'beat',
    label: string = 'Beat',
    colorModifier: string = '#00f0ff',
    targetLayerId: string = 'layer-roofline',
    intensity: number = 0.8
  ) => {
    const t = audioRef.current ? audioRef.current.currentTime : currentTimeSec;
    // Calculate Tap Tempo BPM
    const calculatedBpm = tapCalculatorRef.current.tap();
    if (calculatedBpm) {
      setMusicSyncBpm(calculatedBpm);
    }

    addBeatFlag({
      timestampSec: Number(t.toFixed(3)),
      label,
      type,
      targetLayerId,
      colorModifier,
      intensity,
      isAutoGenerated: false,
    });
  };

  // Run Synthesizer Auto-Detection
  const handleRunAutoDetection = async () => {
    setIsSynthesizing(true);
    showToast('Synthesizer analyzing audio spectrum, transients, and tempo...');
    try {
      const result = await autoSynthesizeBeatsAndFlags(
        musicSyncTrackUrl,
        durationSec,
        musicSyncBpm
      );
      setMusicSyncBpm(result.bpm);
      clearBeatFlags();
      result.flags.forEach((f) => addBeatFlag(f));
      setIsMusicSyncEditMode(true);
      showToast(
        `⚡ Synthesizer auto-detected ${result.flags.length} beat flags at ${result.bpm} BPM! Click Edit to customize.`
      );
    } catch (err) {
      console.warn('Auto beat detection error, using procedural synth:', err);
      autoDetectBeatsAndFlags(1.0);
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Quantize flags to 1/4 or 1/8 beat grid
  const handleQuantizeFlags = (subdivision: 4 | 8 = 4) => {
    const beatInterval = 60 / musicSyncBpm;
    const step = beatInterval / (subdivision === 4 ? 1 : 2);
    beatFlags.forEach((flag) => {
      const snapped = Math.round(flag.timestampSec / step) * step;
      updateBeatFlag(flag.id, { timestampSec: Number(snapped.toFixed(3)) });
    });
    showToast(`Quantized ${beatFlags.length} flags to 1/${subdivision} beat grid`);
  };

  // Custom Audio File Upload Handler
  const handleCustomAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const title = file.name.replace(/\.[^/.]+$/, '');
    setMusicSyncTrack(url, title);
    showToast(`Loaded Custom Show Audio: "${title}"`);
    e.target.value = '';
  };

  // Render SVG Shape Overlays over Video
  const renderLayerPolygons = (layer: VectorLayer) => {
    if (!layer.visible || layer.vertices.length < 3) return null;
    const pointsStr = layer.vertices.map((v) => `${v.x},${v.y}`).join(' ');

    // Check if layer is actively flashing from beat trigger
    const flashColor = activeFlashingLayers[layer.id];
    const isFlashing = Boolean(flashColor);

    const mod = layer.colorModifier;
    const blendMode = mod?.blendMode || 'screen';
    const baseColor = mod?.tintColor || layer.color || '#00f0ff';
    const activeColor = isFlashing ? flashColor : baseColor;

    // Calculate dynamic opacity modulated by audio reactive FFT levels
    let dynamicOpacity = mod?.opacity ?? 0.65;
    if (mod?.audioReactive) {
      const bandLevel =
        mod.audioTriggerBand === 'bass'
          ? audioLevels.bass
          : mod.audioTriggerBand === 'mids'
          ? audioLevels.mids
          : mod.audioTriggerBand === 'highs'
          ? audioLevels.highs
          : audioLevels.energy;

      if (mod.reactiveEffect === 'pulse') {
        dynamicOpacity = Math.min(1.0, dynamicOpacity + bandLevel * 0.5);
      } else if (mod.reactiveEffect === 'flash') {
        dynamicOpacity = isFlashing || bandLevel > 0.6 ? 0.95 : 0.2;
      } else if (mod.reactiveEffect === 'blackout') {
        dynamicOpacity = isFlashing || bandLevel > 0.7 ? 1.0 : 0.0;
      }
    }

    if (layer.role === 'Hard Blackout Cutout') {
      return (
        <polygon
          key={`poly-${layer.id}`}
          points={pointsStr}
          fill="#000000"
          fillOpacity={1.0}
          stroke="#000000"
          strokeWidth={1}
        />
      );
    }

    return (
      <polygon
        key={`poly-${layer.id}`}
        points={pointsStr}
        fill={activeColor}
        fillOpacity={dynamicOpacity}
        style={{ mixBlendMode: blendMode as any }}
        stroke={activeColor}
        strokeWidth={isFlashing ? 3.5 : Math.max(1.5, layer.outlineGlowWidth || 2)}
        strokeOpacity={isFlashing ? 1.0 : 0.7}
        className="transition-all duration-75"
      />
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0e17] text-slate-100 select-none overflow-hidden font-sans">
      {/* Hidden Native Audio Element */}
      <audio
        ref={audioRef}
        src={musicSyncTrackUrl}
        loop={isLooping}
        onLoadedMetadata={(e) => {
          setDurationSec(e.currentTarget.duration || 60);
          e.currentTarget.volume = isMuted ? 0 : volume / 100;
        }}
        onTimeUpdate={(e) => setCurrentTimeSec(e.currentTarget.currentTime)}
        onEnded={() => {
          if (!isLooping) setIsPlaying(false);
        }}
      />

      {/* Hidden File Input for Custom Audio Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.m4a"
        onChange={handleCustomAudioUpload}
        className="hidden"
      />

      {/* SCREEN 10 TOP WORKFLOW TOOLBAR */}
      <header className="h-12 bg-[#121927] border-b border-[#212d40] px-4 flex items-center justify-between shrink-0 z-20">
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

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-purple-600/20 border border-purple-500/40 flex items-center justify-center">
              <Music className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            </div>
            <span className="text-xs font-extrabold text-white tracking-wide uppercase">
              SCREEN 7: MUSIC SYNCHRONIZATION &amp; BEAT MAPPER
            </span>
          </div>
        </div>

        {/* Audio Track Selector & BPM Readout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#0c1018] px-2.5 py-1 rounded-md border border-[#233149]">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Show Track:</span>
            <select
              value={musicSyncTrackUrl}
              onChange={(e) => {
                const found = AUDIO_OVERLAY_TRACKS.find((t) => t.url === e.target.value);
                setMusicSyncTrack(e.target.value, found?.title || 'Custom Track');
              }}
              className="bg-transparent text-xs font-bold text-cyan-300 focus:outline-none cursor-pointer max-w-[260px] truncate"
            >
              {AUDIO_OVERLAY_TRACKS.map((t) => (
                <option key={t.id} value={t.url} className="bg-[#121927] text-white">
                  {t.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1 rounded bg-[#182338] hover:bg-[#20304a] text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Upload Custom Audio File (.mp3, .wav)"
            >
              <Upload className="w-3 h-3 text-cyan-400" />
            </button>
          </div>

          {/* AI 4-Stem Audio Isolator Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsStemSplitterOpen(true)}
            className="py-1 px-2.5 rounded-md bg-[#162032] hover:bg-[#1f2d47] border border-[#2c3d59] hover:border-cyan-400 text-cyan-300 hover:text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title="Open AI 4-Stem Audio Isolator (Vocals, Drums, Bass, Melody) - Feature #34"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Audio Stems</span>
          </button>

          {/* BPM Tempo Controls */}
          <div className="flex items-center gap-1.5 bg-[#0c1018] px-2 py-1 rounded-md border border-[#233149]">
            <span className="text-[10px] font-mono text-slate-400 uppercase">BPM:</span>
            <input
              type="number"
              value={musicSyncBpm}
              onChange={(e) => setMusicSyncBpm(Math.max(40, Math.min(240, Number(e.target.value))))}
              className="w-12 bg-transparent text-xs font-bold text-emerald-400 text-center focus:outline-none"
            />
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => setMusicSyncBpm(musicSyncBpm + 1)}
                className="text-[8px] px-1 bg-[#182338] hover:bg-[#20304a] rounded text-slate-300 leading-none"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => setMusicSyncBpm(musicSyncBpm - 1)}
                className="text-[8px] px-1 bg-[#182338] hover:bg-[#20304a] rounded text-slate-300 leading-none"
              >
                ▼
              </button>
            </div>
          </div>

          {/* Marshall One-Button Auto-Show, Word-Level Karaoke (.srt/.vtt) & xLights .xtiming Bridge */}
          <button
            type="button"
            onClick={() => setIsAutoShowKaraokeModalOpen(true)}
            className="py-1 px-3 rounded-md bg-gradient-to-r from-purple-600/35 to-fuchsia-600/35 hover:from-purple-600/55 hover:to-fuchsia-600/55 border border-purple-500/70 hover:border-fuchsia-400 text-xs font-extrabold text-purple-200 hover:text-white uppercase transition-all shadow-[0_0_12px_rgba(168,85,247,0.3)] flex items-center gap-1.5 cursor-pointer"
            title="One-Button Auto-Show Generator, Word-Level Karaoke (.srt/.vtt) & xLights .xtiming Bridge"
          >
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>Auto-Show &amp; Karaoke</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveScreen(6)}
            className="py-1 px-3 rounded bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/60 text-xs font-bold text-blue-300 hover:text-white uppercase transition-colors flex items-center gap-1"
          >
            <span>PLAYLIST (SCREEN 8)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* MAIN TWO-COLUMN DYNAMIC RESIZABLE WORKSPACE */}
      <div
        ref={workspaceContainerRef}
        className="flex-1 flex flex-row p-3 min-h-[720px] w-full overflow-hidden items-stretch"
      >
        {/* LEFT COLUMN: LIVE ARCHITECTURAL PROJECTION VIEWPORT */}
        <section
          style={{ width: `calc(${workspacePercentages[0]}% - 6px)` }}
          className="flex flex-col min-h-0 bg-[#0f1522] border border-[#232e42] rounded-xl overflow-hidden relative shrink-0 transition-all duration-75"
        >
          {/* Header Bar */}
          <div className="h-9 px-3 bg-[#141b2b] border-b border-[#232e42] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Live House Projection + Front Shape Modifiers
              </span>
            </div>
            {activeFlagNotification ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-600/30 border border-purple-500/50 text-purple-300 font-bold animate-pulse">
                {activeFlagNotification}
              </span>
            ) : (
              <span className="text-[10px] font-mono text-slate-400">
                {layers.filter((l) => l.colorModifier?.audioReactive).length} Audio-Reactive Shape Layers
              </span>
            )}
          </div>

          {/* Interactive Stacked Canvas: Background AI Video + Front Vector Shape Modifiers */}
          <div className="flex-1 relative bg-black overflow-hidden flex items-center justify-center">
            {/* Background Layer: Playing AI Video */}
            <video
              ref={videoRef}
              src={activePreviewVideoUrl}
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Front Shape Layers Overlay: Direct Vector Color/Blend Modifiers */}
            <svg
              viewBox="0 0 1080 600"
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              {layers.map(renderLayerPolygons)}
            </svg>

            {/* Corner Alignment Indicator */}
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 border border-cyan-500/30 text-[9px] font-mono text-cyan-300">
              SYNCHRONIZED COMPOSITE [1080x600]
            </div>

            {/* Visual Beat Indicator Pulse in Corner */}
            <div
              className={`absolute top-2 right-2 w-3.5 h-3.5 rounded-full border transition-all duration-75 ${
                audioLevels.beatDetected
                  ? 'bg-emerald-400 border-white shadow-[0_0_15px_#10b981] scale-125'
                  : 'bg-slate-700/60 border-slate-600 scale-100'
              }`}
              title="Real-Time Kick / Transient Beat Detection"
            />
          </div>

          {/* Bottom HUD: Real-Time Multi-Band FFT Audio Frequency Spectrum */}
          <div className="h-16 bg-[#111724] border-t border-[#232e42] px-3 py-2 flex items-center gap-4">
            <div className="flex flex-col justify-center min-w-[120px]">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Live FFT Spectrum</span>
              <span className="text-xs font-bold text-cyan-300 font-mono">
                {audioLevels.beatDetected ? '⚡ BEAT TRANSIENT' : 'MONITORING'}
              </span>
            </div>

            {/* 4 Spectrum Bars */}
            <div className="flex-1 grid grid-cols-4 gap-3 items-center">
              {/* Bass Band */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[9px] font-mono text-slate-400">
                  <span>BASS (20-250Hz)</span>
                  <span className="text-emerald-400">{Math.round(audioLevels.bass * 100)}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-75"
                    style={{ width: `${Math.min(100, audioLevels.bass * 100)}%` }}
                  />
                </div>
              </div>

              {/* Mids Band */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[9px] font-mono text-slate-400">
                  <span>MIDS (250-2kHz)</span>
                  <span className="text-purple-400">{Math.round(audioLevels.mids * 100)}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all duration-75"
                    style={{ width: `${Math.min(100, audioLevels.mids * 100)}%` }}
                  />
                </div>
              </div>

              {/* Highs Band */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[9px] font-mono text-slate-400">
                  <span>HIGHS (2k-16kHz)</span>
                  <span className="text-cyan-400">{Math.round(audioLevels.highs * 100)}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 rounded-full transition-all duration-75"
                    style={{ width: `${Math.min(100, audioLevels.highs * 100)}%` }}
                  />
                </div>
              </div>

              {/* Master Gain Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[9px] font-mono text-slate-400">
                  <span>GAIN SENSITIVITY</span>
                  <span className="text-amber-400">{audioReactiveMasterGain.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.5"
                  step="0.1"
                  value={audioReactiveMasterGain}
                  onChange={(e) => setAudioReactiveMasterGain(Number(e.target.value))}
                  className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE DRAGGABLE DIVIDER (RESIZE PROJECTION VIEWPORT VS SHAPE INSPECTOR) */}
        <DraggableDivider
          onDrag={handleDragPanels}
          onReset={resetPanels}
          title="Drag border left or right to resize Projection Viewport vs Shape/Beat Inspector (Double-click to reset)"
          className="mx-1"
        />

        {/* RIGHT COLUMN: SHAPE COLOR MODIFIER & BEAT FLAG INSPECTOR */}
        <aside
          style={{ width: `calc(${workspacePercentages[1]}% - 6px)` }}
          className="flex flex-col min-h-0 bg-[#0f1522] border border-[#232e42] rounded-xl overflow-hidden shrink-0 transition-all duration-75"
        >
          {/* Tabs: 1. Shape Color Modifiers | 2. Flag Inspector */}
          <div className="h-10 bg-[#141b2b] border-b border-[#232e42] px-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Front Shape &amp; Color Modifiers
              </span>
            </div>
            {isMusicSyncEditMode && (
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-[10px] font-mono font-bold">
                EDIT MODE ACTIVE
              </span>
            )}
          </div>

          <div className="flex-1 p-3 overflow-y-auto space-y-4">
            {/* Shape Object Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase text-slate-300 flex items-center justify-between">
                <span>Select Target Shape Object:</span>
                <span className="text-[10px] font-mono text-cyan-400">
                  {selectedLayer?.category || 'Layer'}
                </span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {layers.map((l) => {
                  const isSelected = l.id === selectedLayerIdForModifier;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setSelectedLayerIdForModifier(l.id)}
                      className={`px-2 py-1.5 rounded-lg border text-left text-xs font-bold truncate transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#1b263b] border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                          : 'bg-[#121927] hover:bg-[#182235] border-[#253248] text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: l.colorModifier?.tintColor || l.color }}
                        />
                        <span className="truncate">{l.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Shape Modifier Settings for Selected Layer */}
            {selectedLayer && (
              <div className="p-3 rounded-xl bg-[#131b2b] border border-[#233148] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-extrabold text-white">
                      {selectedLayer.name} Modifier
                    </span>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={selectedLayer.colorModifier?.audioReactive ?? true}
                      onChange={(e) =>
                        updateLayerColorModifier(selectedLayer.id, {
                          audioReactive: e.target.checked,
                        })
                      }
                      className="w-3.5 h-3.5 rounded text-cyan-500"
                    />
                    <span className="text-cyan-300 font-bold">Audio Reactive</span>
                  </label>
                </div>

                {/* Tint Color Picker & Neon Quick Swatches */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">
                    Shape Tint &amp; Glow Color:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedLayer.colorModifier?.tintColor || selectedLayer.color}
                      onChange={(e) =>
                        updateLayerColorModifier(selectedLayer.id, {
                          tintColor: e.target.value,
                        })
                      }
                      className="w-8 h-8 rounded border border-slate-600 bg-transparent cursor-pointer"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {NEON_PALETTE.map((pal) => (
                        <button
                          key={pal.hex}
                          type="button"
                          onClick={() =>
                            updateLayerColorModifier(selectedLayer.id, {
                              tintColor: pal.hex,
                            })
                          }
                          className="w-6 h-6 rounded-md border border-slate-600 transition-transform hover:scale-110 cursor-pointer"
                          style={{ backgroundColor: pal.hex }}
                          title={pal.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Blend Mode & Reactive Effect Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Blend Mode */}
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase">
                      Front Blend Mode:
                    </label>
                    <select
                      value={selectedLayer.colorModifier?.blendMode || 'screen'}
                      onChange={(e) =>
                        updateLayerColorModifier(selectedLayer.id, {
                          blendMode: e.target.value as any,
                        })
                      }
                      className="w-full mt-1 bg-[#0c1018] border border-[#2a3952] rounded px-2 py-1 text-xs text-slate-200"
                    >
                      <option value="screen">Screen (Neon Glow)</option>
                      <option value="overlay">Overlay (High Contrast)</option>
                      <option value="multiply">Multiply (Shadow Tint)</option>
                      <option value="color-dodge">Color Dodge (Intense Flash)</option>
                      <option value="difference">Difference (Invert Cyber)</option>
                      <option value="normal">Normal (Solid Color)</option>
                    </select>
                  </div>

                  {/* Reactive Effect */}
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase">
                      Audio Beat Effect:
                    </label>
                    <select
                      value={selectedLayer.colorModifier?.reactiveEffect || 'pulse'}
                      onChange={(e) =>
                        updateLayerColorModifier(selectedLayer.id, {
                          reactiveEffect: e.target.value as any,
                        })
                      }
                      className="w-full mt-1 bg-[#0c1018] border border-[#2a3952] rounded px-2 py-1 text-xs text-slate-200"
                    >
                      <option value="pulse">Pulse Size &amp; Opacity</option>
                      <option value="flash">Lightning Flash</option>
                      <option value="color-shift">Color Shift</option>
                      <option value="blackout">Blackout Cutout Mask</option>
                      <option value="strobe">Rapid Strobe</option>
                    </select>
                  </div>
                </div>

                {/* Trigger Frequency Band */}
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase">
                    Trigger Frequency Band:
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 mt-1">
                    {(['bass', 'mids', 'highs', 'all'] as const).map((band) => {
                      const isActive =
                        (selectedLayer.colorModifier?.audioTriggerBand || 'bass') === band;
                      return (
                        <button
                          key={band}
                          type="button"
                          onClick={() =>
                            updateLayerColorModifier(selectedLayer.id, {
                              audioTriggerBand: band,
                            })
                          }
                          className={`py-1 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-blue-600 text-white'
                              : 'bg-[#0d121c] text-slate-400 hover:text-white'
                          }`}
                        >
                          {band}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Selected Flag Inspector (Visible when editing or clicking a flag) */}
            {selectedFlag && isMusicSyncEditMode && (
              <div className="p-3 rounded-xl bg-[#182030] border border-cyan-500/50 space-y-2.5 animate-in fade-in duration-100">
                <div className="flex items-center justify-between pb-1.5 border-b border-cyan-500/30">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-extrabold text-cyan-200 uppercase">
                      Edit Flag: {selectedFlag.label}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteBeatFlag(selectedFlag.id)}
                    className="p-1 rounded bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white transition-colors"
                    title="Delete Flag"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-mono text-slate-400 uppercase">
                      Label:
                    </label>
                    <input
                      type="text"
                      value={selectedFlag.label}
                      onChange={(e) =>
                        updateBeatFlag(selectedFlag.id, { label: e.target.value })
                      }
                      className="w-full bg-[#0d131f] border border-[#263750] rounded px-2 py-1 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-mono text-slate-400 uppercase">
                      Timestamp:
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.05"
                        value={selectedFlag.timestampSec}
                        onChange={(e) =>
                          updateBeatFlag(selectedFlag.id, {
                            timestampSec: Number(e.target.value),
                          })
                        }
                        className="w-full bg-[#0d131f] border border-[#263750] rounded px-2 py-1 text-xs text-emerald-400 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleSeek(selectedFlag.timestampSec)}
                        className="px-2 py-1 bg-cyan-600/30 hover:bg-cyan-600 text-[10px] font-bold text-cyan-200 rounded cursor-pointer"
                        title="Jump Playhead Here"
                      >
                        GO
                      </button>
                    </div>
                  </div>
                </div>

                {/* Target Shape & Type */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-mono text-slate-400 uppercase">
                      Target Shape:
                    </label>
                    <select
                      value={selectedFlag.targetLayerId || 'all'}
                      onChange={(e) =>
                        updateBeatFlag(selectedFlag.id, {
                          targetLayerId: e.target.value,
                        })
                      }
                      className="w-full bg-[#0d131f] border border-[#263750] rounded px-2 py-1 text-xs text-slate-200"
                    >
                      <option value="all">Entire House (All)</option>
                      {layers.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-mono text-slate-400 uppercase">
                      Action Type:
                    </label>
                    <select
                      value={selectedFlag.type}
                      onChange={(e) =>
                        updateBeatFlag(selectedFlag.id, {
                          type: e.target.value as any,
                        })
                      }
                      className="w-full bg-[#0d131f] border border-[#263750] rounded px-2 py-1 text-xs text-slate-200"
                    >
                      <option value="beat">Kick Beat Pulse</option>
                      <option value="drop">Massive Bass Drop</option>
                      <option value="color-shift">Color Shift</option>
                      <option value="blackout">Blackout Cutout</option>
                      <option value="flag">Marker Flag</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* BOTTOM WORKFLOW BAR: TIMELINE + BEAT MAPPING CONTROLS (Manual, Auto, Edit) */}
      <footer className="h-56 bg-[#101624] border-t border-[#202c40] p-3 flex flex-col justify-between shrink-0 z-20">
        {/* Playback Controls & Timecode Row */}
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-[#1b2639]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlayPause}
              className="w-10 h-10 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all cursor-pointer"
              title="Play / Pause (Spacebar)"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={handleStop}
              className="w-8 h-8 rounded-lg bg-[#182338] hover:bg-[#22314e] text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
              title="Stop & Rewind to 0:00"
            >
              <Square className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsLooping(!isLooping)}
              className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                isLooping
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                  : 'bg-[#182338] border-slate-700 text-slate-400'
              }`}
              title="Loop Track"
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>

            {/* Timecode Readout */}
            <div className="flex items-center gap-1.5 ml-2 font-mono text-xs">
              <span className="text-white font-bold">
                {Math.floor(currentTimeSec / 60)
                  .toString()
                  .padStart(2, '0')}
                :{(currentTimeSec % 60).toFixed(2).padStart(5, '0')}
              </span>
              <span className="text-slate-500">/</span>
              <span className="text-slate-400">
                {Math.floor(durationSec / 60)
                  .toString()
                  .padStart(2, '0')}
                :{(durationSec % 60).toFixed(2).padStart(5, '0')}
              </span>
            </div>
          </div>

          {/* Core Mapping Buttons: 1. Keyboard Tap Mode, 2. Auto Synthesizer, 3. Edit Mode */}
          <div className="flex items-center gap-2">
            {/* MANUAL KEYBOARD TAP MODE */}
            <button
              type="button"
              onClick={() => setMusicSyncTapMode(!musicSyncTapMode)}
              className={`px-3 py-2 rounded-lg border text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                musicSyncTapMode
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                  : 'bg-[#182338] hover:bg-[#20314d] border-slate-700 text-slate-200'
              }`}
              title="Toggle Live Keyboard Tap Mapping (Keys: B, D, C, X)"
            >
              <Keyboard className="w-4 h-4 text-amber-400" />
              <span>TAP MODE {musicSyncTapMode ? '[ACTIVE]' : ''}</span>
            </button>

            {/* AUTO-DETECT BEATS & FLAGS BUTTON */}
            <button
              type="button"
              onClick={handleRunAutoDetection}
              disabled={isSynthesizing}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-60 text-white text-xs font-extrabold uppercase tracking-wider shadow-[0_0_15px_rgba(168,85,247,0.35)] border border-purple-400/40 inline-flex items-center gap-1.5 transition-all cursor-pointer"
              title="Automatically detect beats, drops, and flags using Web Audio FFT synthesizer analysis"
            >
              <Wand2 className={`w-4 h-4 ${isSynthesizing ? 'animate-spin' : ''}`} />
              <span>{isSynthesizing ? 'ANALYZING AUDIO...' : '⚡ AUTO-DETECT BEATS'}</span>
            </button>

            {/* EDIT BEATS & FLAGS BUTTON */}
            <button
              type="button"
              onClick={() => setIsMusicSyncEditMode(!isMusicSyncEditMode)}
              className={`px-3.5 py-2 rounded-lg border text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                isMusicSyncEditMode
                  ? 'bg-emerald-600/30 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.35)]'
                  : 'bg-[#182338] hover:bg-[#20314d] border-slate-700 text-slate-200'
              }`}
              title="Toggle Edit Mode to drag, delete, or customize auto-generated flags"
            >
              <Edit3 className="w-4 h-4 text-emerald-400" />
              <span>{isMusicSyncEditMode ? 'DONE EDITING' : '✏️ EDIT BEATS & FLAGS'}</span>
            </button>

            {/* Quantize Helpers */}
            <button
              type="button"
              onClick={() => handleQuantizeFlags(4)}
              className="px-2.5 py-2 rounded-lg bg-[#151e2f] hover:bg-[#1d2a42] border border-[#273752] text-[11px] font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Quantize all flags to nearest 1/4 beat"
            >
              QUANTIZE 1/4
            </button>

            <button
              type="button"
              onClick={clearBeatFlags}
              className="p-2 rounded-lg bg-[#182338] hover:bg-red-600/20 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/50 transition-colors cursor-pointer"
              title="Clear all flags"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Tap Trigger Pads (Clickable or Keyboard-mapped) */}
        {musicSyncTapMode && (
          <div className="grid grid-cols-4 gap-2 my-2 animate-in fade-in duration-100">
            <button
              type="button"
              onClick={() => handleManualTap('beat', 'Kick Beat', '#00f0ff', 'layer-roofline')}
              className="py-2 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-400 text-cyan-200 font-extrabold text-xs uppercase flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.2)]"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>TAP BEAT [B]</span>
            </button>

            <button
              type="button"
              onClick={() => handleManualTap('drop', '⚡ Bass Drop', '#ef4444', 'all', 1.0)}
              className="py-2 rounded-lg bg-red-600/20 hover:bg-red-600/40 border border-red-500 text-red-200 font-extrabold text-xs uppercase flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.25)]"
            >
              <Sparkles className="w-3.5 h-3.5 text-red-400" />
              <span>TAP DROP [D]</span>
            </button>

            <button
              type="button"
              onClick={() => handleManualTap('color-shift', '🎨 Color Shift', '#a855f7', 'layer-windows')}
              className="py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 border border-purple-400 text-purple-200 font-extrabold text-xs uppercase flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-[0_0_10px_rgba(168,85,247,0.2)]"
            >
              <Palette className="w-3.5 h-3.5 text-purple-400" />
              <span>COLOR SHIFT [C]</span>
            </button>

            <button
              type="button"
              onClick={() => handleManualTap('blackout', '⚫ Blackout Cutout', '#000000', 'layer-mainwalls')}
              className="py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-600 text-slate-200 font-extrabold text-xs uppercase flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span>BLACKOUT [X]</span>
            </button>
          </div>
        )}

        {/* INTERACTIVE TIMELINE WITH BEAT FLAGS */}
        <div className="flex-1 flex flex-col justify-center min-h-0">
          <div
            ref={timelineRef}
            onClick={handleTimelineClick}
            className="relative h-16 w-full bg-[#0a0f19] border border-[#233148] rounded-xl overflow-hidden cursor-pointer select-none group"
          >
            {/* Audio Waveform Background Bars (Simulated Rhythm Profile) */}
            <div className="absolute inset-0 flex items-center justify-between px-1 opacity-25 pointer-events-none">
              {Array.from({ length: 90 }).map((_, idx) => {
                const h = Math.sin(idx * 0.3) * 35 + 40;
                return (
                  <div
                    key={idx}
                    className="w-1 rounded-full bg-cyan-400"
                    style={{ height: `${h}%` }}
                  />
                );
              })}
            </div>

            {/* Playhead Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white z-20 shadow-[0_0_8px_#ffffff] pointer-events-none"
              style={{ left: `${(currentTimeSec / durationSec) * 100}%` }}
            >
              <div className="w-3 h-3 rounded-full bg-white -translate-x-[5px] -translate-y-1 shadow-md" />
            </div>

            {/* Beat Flags Pins on Timeline */}
            {beatFlags.map((flag) => {
              const leftPercent = (flag.timestampSec / durationSec) * 100;
              const isSelected = flag.id === selectedBeatFlagId;
              const color = flag.colorModifier || (flag.type === 'drop' ? '#ef4444' : '#00f0ff');

              return (
                <div
                  key={flag.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBeatFlagId(flag.id);
                    handleSeek(flag.timestampSec);
                  }}
                  className={`absolute top-1 bottom-1 w-2.5 -translate-x-1/2 flex flex-col items-center justify-between transition-transform cursor-pointer group/pin ${
                    isSelected ? 'scale-125 z-30' : 'hover:scale-110 z-10'
                  }`}
                  style={{ left: `${leftPercent}%` }}
                  title={`${flag.label} (${flag.timestampSec}s)`}
                >
                  <div
                    className={`w-3 h-3 rounded-full border shadow-md flex items-center justify-center ${
                      isSelected ? 'ring-2 ring-white' : ''
                    }`}
                    style={{ backgroundColor: color, borderColor: '#ffffff' }}
                  />
                  <div
                    className="w-0.5 flex-1 opacity-80"
                    style={{ backgroundColor: color }}
                  />
                  {/* Flag label badge */}
                  <span className="text-[8px] font-mono font-bold text-white px-1 rounded bg-black/80 truncate max-w-[60px]">
                    {flag.label.slice(0, 8)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Status Readout */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
          <div className="flex items-center gap-3">
            <span>
              Flags Placed: <strong className="text-white">{beatFlags.length}</strong>
            </span>
            <span>
              Auto Synthesized:{' '}
              <strong className="text-cyan-300">
                {beatFlags.filter((f) => f.isAutoGenerated).length}
              </strong>
            </span>
            <span>
              Manual Taps:{' '}
              <strong className="text-amber-300">
                {beatFlags.filter((f) => !f.isAutoGenerated).length}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Audio Sync Status:</span>
            <span className="text-emerald-400 font-bold uppercase">
              {isPlaying ? 'ACTIVE AUDIO STREAMING' : 'IDLE / READY'}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
