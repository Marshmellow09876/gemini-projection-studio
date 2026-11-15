import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Radio,
  Clock,
  Play,
  Pause,
  Zap,
  Check,
  Grid,
  Crosshair,
  Box,
  Volume2,
  VolumeX,
  Music,
  Activity,
  Download,
  Trash2,
  RotateCcw,
  ArrowLeft,
  Save,
  Minimize2,
  Maximize2,
  Layers,
  Smartphone,
  ShieldAlert,
  HardDrive,
  History,
  Calendar,
} from 'lucide-react';
import {
  AUSTIN_HOUSE_ASSETS,
  useProjectionStore,
} from '../store/useProjectionStore';
import {
  PreviewZoomControl,
  computeZoomViewBox,
  useMiddleClickPan,
} from '../components/PreviewZoomControl';
import { playManualCueSound } from '../utils/soundEffects';
import { fetchBackendTelemetry, BackendTelemetryResponse } from '../utils/apiClient';
import {
  DraggableDivider,
  useResizable2Panels,
  useResizableSidebar,
} from '../components/DraggableDivider';

const MANUAL_CUE_PADS = [
  {
    id: 'THUNDER & FLASH',
    label: 'THUNDER\n& FLASH',
    bgClass:
      'bg-[#1e5bb8] hover:bg-[#256ad1] border-[#4d94ff] text-white shadow-[0_0_15px_rgba(37,115,240,0.4)]',
    hasIcon: true,
  },
  {
    id: 'SNOW STORM',
    label: 'SNOW\nSTORM',
    bgClass:
      'bg-white hover:bg-slate-100 border-white text-slate-900 shadow-[0_0_15px_rgba(255,255,255,0.35)]',
    hasIcon: false,
  },
  {
    id: 'GHOST SCREAM',
    label: 'GHOST\nSCREAM',
    bgClass:
      'bg-[#7e22ce] hover:bg-[#9333ea] border-[#c084fc] text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]',
    hasIcon: false,
  },
  {
    id: 'STRIKE LASER',
    label: 'STRIKE\nLASER',
    bgClass:
      'bg-[#b91c1c] hover:bg-[#dc2626] border-[#f87171] text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]',
    hasIcon: false,
  },
  {
    id: 'FIREWORKS',
    label: 'FIREWORKS',
    bgClass:
      'bg-[#d97706] hover:bg-[#f59e0b] border-[#fcd34d] text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]',
    hasIcon: false,
  },
  {
    id: 'MERRY CHRISTMAS',
    label: 'MERRY\nCHRISTMAS',
    bgClass:
      'bg-[#15803d] hover:bg-[#16a34a] border-[#4ade80] text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]',
    hasIcon: false,
  },
];

export const Screen7LiveShowtime: React.FC = () => {
  const {
    isShowActive,
    cameraGridOverlay,
    testGridOverlay,
    alignmentCrossOverlay,
    refWireframeOverlay,
    gridBrightness,
    projectorLumens,
    masterVolume,
    audioDelayMs,
    setAudioDelayMs,
    activeManualCue,
    dmxGatewayOnline,
    pir01Status,
    pir02Status,
    consoleLogs,
    playlistClips,
    masterBlackout,
    videoSoundVolume,
    videoSoundMuted,
    musicOverlayVolume,
    musicOverlayMuted,
    musicOverlayPlaying,
    musicOverlayTrackUrl,
    setLiveShowParams,
    activatePlaylistClip,
    triggerManualOverlayCue,
    skipToNextPlaylistClip,
    appendConsoleLog,
    clearConsoleLogs,
    toggleMasterBlackout,
    setAudioMixerParams,
    navigateBack,
    saveCurrentProject,
    setIsFmRadioSignModalOpen,
    setIsSpectatorPortalModalOpen,
    setIsHardwareSafetyModalOpen,
    setIsShowExportModalOpen,
    setIsProjectTimeMachineModalOpen,
    setIsRunNightRehearsalModalOpen,
  } = useProjectionStore();

  const AUDIO_TRACK_OPTIONS = [
    {
      id: 'track-1',
      title: 'Pumpkins -> Ghostbusters (Something Strange)',
      url: AUSTIN_HOUSE_ASSETS.audio.pumpkinsToGhostbusters,
    },
    {
      id: 'track-2',
      title: 'Hit the Music Maestro',
      url: AUSTIN_HOUSE_ASSETS.audio.hitTheMusicMaestro,
    },
    {
      id: 'track-3',
      title: 'Iron Gate Nocturne',
      url: AUSTIN_HOUSE_ASSETS.audio.ironGateNocturne,
    },
    {
      id: 'track-4',
      title: 'Midnight at the Gourd Patch',
      url: AUSTIN_HOUSE_ASSETS.audio.midnightGourdPatch,
    },
    {
      id: 'track-5',
      title: 'Midnight at the Manor',
      url: AUSTIN_HOUSE_ASSETS.audio.midnightManor,
    },
    {
      id: 'track-6',
      title: 'Stage Fright Boogie',
      url: AUSTIN_HOUSE_ASSETS.audio.stageFrightBoogie,
    },
    {
      id: 'track-7',
      title: 'The Alleyway Chase',
      url: AUSTIN_HOUSE_ASSETS.audio.alleywayChase,
    },
    {
      id: 'track-8',
      title: 'The Emerald Furnace',
      url: AUSTIN_HOUSE_ASSETS.audio.emeraldFurnace,
    },
  ];

  const [clockString, setClockString] = useState('19:15:23 PM');
  const [countdownSec, setCountdownSec] = useState(105); // 01m 45s
  const [camZoom, setCamZoom] = useState<number>(100);

  // Middle scroll wheel click to pan on security/feed camera viewport
  const {
    pan: camPan,
    resetPan: resetCamPan,
    handlePointerDown: handleCamMiddleDown,
    handlePointerMove: handleCamMiddleMove,
    handlePointerUp: handleCamMiddleUp,
    handleMouseDown: handleCamMiddleMouseDown,
  } = useMiddleClickPan();
  const [selectedAudioUrl, setSelectedAudioUrl] = useState<string>(
    () => musicOverlayTrackUrl || AUSTIN_HOUSE_ASSETS.audio.pumpkinsToGhostbusters
  );
  const [videoProgress, setVideoProgress] = useState({ current: 0, duration: 30 });
  const [backendTelemetry, setBackendTelemetry] = useState<BackendTelemetryResponse | null>(null);

  // Sync selectedAudioUrl with musicOverlayTrackUrl in store
  useEffect(() => {
    if (musicOverlayTrackUrl && musicOverlayTrackUrl !== selectedAudioUrl) {
      setSelectedAudioUrl(musicOverlayTrackUrl);
    } else if (!musicOverlayTrackUrl && selectedAudioUrl) {
      setAudioMixerParams({ musicOverlayTrackUrl: selectedAudioUrl });
    }
  }, [musicOverlayTrackUrl, selectedAudioUrl, setAudioMixerParams]);

  // System Automation & Playback Schedule State
  const [scheduleStartTime, setScheduleStartTime] = useState('17:30');
  const [scheduleEndTime, setScheduleEndTime] = useState('23:30');
  const [playbackMode, setPlaybackMode] = useState<
    'SCHEDULED LOOP' | 'PIR MOTION TRIGGER' | 'MANUAL DECK OVERRIDE'
  >('SCHEDULED LOOP');

  // Auto-advance / Hold mode for playlist countdown
  const [isAutoAdvance, setIsAutoAdvance] = useState(true);

  // DMX strobe test flashing feedback state
  const [isDmxStrobeFlashing, setIsDmxStrobeFlashing] = useState(false);

  // Manual Console Command input state
  const [manualCommandInput, setManualCommandInput] = useState('');

  // Quick Pattern / Calibration Overlays minimizable window state
  const [isCalibrationOverlayMinimized, setIsCalibrationOverlayMinimized] = useState(false);

  // Dynamic Draggable Workspace Columns Resizer (Camera/Cues vs Playlist/Logs)
  const {
    containerRef: workspaceContainerRef,
    percentages: workspacePercentages,
    handleDrag: handleDragMiddleColumns,
    resetPercentages: resetMiddleColumns,
  } = useResizable2Panels({
    defaultPercentages: [58, 42],
    minPercentages: [30, 25],
    maxPercentages: [75, 70],
    storageKey: 'lumen_screen7_middle_columns',
  });

  // Dynamic Draggable Master Operator Column Resizer
  const {
    width: masterColumnWidth,
    handleDrag: handleDragMasterColumn,
    resetWidth: resetMasterColumnWidth,
  } = useResizableSidebar({
    defaultWidth: 215,
    minWidth: 160,
    maxWidth: 380,
    direction: 'right-to-left',
    storageKey: 'lumen_screen7_master_col_w',
  });

  // Ref to console log list for auto-scrolling to newest entries
  const consoleLogContainerRef = useRef<HTMLDivElement | null>(null);

  const cyclePlaybackMode = () => {
    const modes: (
      | 'SCHEDULED LOOP'
      | 'PIR MOTION TRIGGER'
      | 'MANUAL DECK OVERRIDE'
    )[] = ['SCHEDULED LOOP', 'PIR MOTION TRIGGER', 'MANUAL DECK OVERRIDE'];
    const nextIdx = (modes.indexOf(playbackMode) + 1) % modes.length;
    const nextMode = modes[nextIdx];
    setPlaybackMode(nextMode);
    appendConsoleLog(`Playback Mode set to: ${nextMode}`, 'info');
  };

  const toggleAutoAdvance = () => {
    setIsAutoAdvance((prev) => {
      const next = !prev;
      appendConsoleLog(
        `Playlist Queue: Auto-Advance ${
          next
            ? 'ENABLED (Auto-Advance Mode)'
            : 'PAUSED (Hold / Loop Active Clip Mode)'
        }`,
        'info'
      );
      return next;
    });
  };

  const handleResetCountdown = () => {
    setCountdownSec(105);
    appendConsoleLog(
      'Operator Reset Playlist Countdown Timer to 01m 45s',
      'info'
    );
  };

  const handleTestDmxStrobe = () => {
    setIsDmxStrobeFlashing(true);
    appendConsoleLog(
      'DMX: [Universe 1] Test Packet Dispatched -> 512 Ch Strobe Burst 255 (Rate: 20Hz)',
      'trigger'
    );
    if (!masterBlackout) {
      playManualCueSound('THUNDER & FLASH', masterVolume);
    }
    setTimeout(() => {
      setIsDmxStrobeFlashing(false);
    }, 1000);
  };

  const handleExportConsoleLogsTxt = () => {
    const timestampStr = new Date().toISOString();
    const formattedDate = timestampStr.replace(/[:.]/g, '-');
    const header = [
      '================================================================',
      'LUMEN-MAP AI v3.5 — LIVE SHOWTIME OPERATOR ACTION LOG',
      `Export Timestamp : ${timestampStr}`,
      `Show Active      : ${isShowActive ? 'YES' : 'NO'}`,
      `Playback Mode    : ${playbackMode}`,
      `Total Log Entries: ${consoleLogs.length}`,
      '================================================================\n',
    ].join('\n');

    const logLines = consoleLogs.map(
      (entry) =>
        `[${entry.timestamp}] [${(entry.level || 'info').toUpperCase().padEnd(7)}] ${entry.message}`
    );

    const fullText = `${header}\n${logLines.join('\n')}\n`;
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `showtime-console-log-${formattedDate}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    appendConsoleLog(
      `Console Action Log exported to .txt (${consoleLogs.length} entries)`,
      'info'
    );
  };

  const handleManualCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualCommandInput.trim();
    if (!trimmed) return;
    appendConsoleLog(`[OPERATOR COMMAND]: ${trimmed}`, 'info');
    setManualCommandInput('');
  };

  // Auto-scroll console log container to newest entries
  useEffect(() => {
    if (consoleLogContainerRef.current) {
      consoleLogContainerRef.current.scrollTop =
        consoleLogContainerRef.current.scrollHeight;
    }
  }, [consoleLogs]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const activeClip = useMemo(
    () =>
      playlistClips.find((c) => c.status === 'Active') || playlistClips[1] || playlistClips[0],
    [playlistClips]
  );

  // Sync audio & video volume with MASTER VOLUME fader, Video Sound Volume (80%), Music Overlay Volume (80%) & blackout
  useEffect(() => {
    const masterFactor = Math.max(0, Math.min(1, masterVolume / 100));
    if (audioRef.current) {
      audioRef.current.volume =
        masterBlackout || musicOverlayMuted
          ? 0
          : Math.max(0, Math.min(1, (musicOverlayVolume / 100) * masterFactor));
    }
    if (videoRef.current) {
      videoRef.current.muted = masterBlackout || videoSoundMuted;
      videoRef.current.volume =
        masterBlackout || videoSoundMuted
          ? 0
          : Math.max(0, Math.min(1, (videoSoundVolume / 100) * masterFactor));
    }
  }, [
    masterVolume,
    audioDelayMs,
    setAudioDelayMs,
    masterBlackout,
    videoSoundVolume,
    videoSoundMuted,
    musicOverlayVolume,
    musicOverlayMuted,
  ]);

  // Sync HTML5 soundtrack playback with musicOverlayPlaying, isShowActive & blackout
  useEffect(() => {
    if (audioRef.current) {
      if (musicOverlayPlaying && isShowActive && !masterBlackout) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [musicOverlayPlaying, isShowActive, masterBlackout]);

  // Periodic Telemetry sync with Python FastAPI backend (with clean client fallback)
  useEffect(() => {
    let isMounted = true;
    const fetchTelemetry = async () => {
      try {
        const data = await fetchBackendTelemetry();
        if (isMounted) {
          setBackendTelemetry(data);
        }
      } catch {
        // Fallback is handled inside apiClient
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 6000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Clock & Automatic Playlist Countdown: triggers skipToNextPlaylistClip at 1s remaining
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setClockString(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' PM'
      );

      if (isShowActive && !masterBlackout && isAutoAdvance) {
        setCountdownSec((prev) => {
          if (prev <= 1) {
            skipToNextPlaylistClip();
            return 105; // Reset countdown for the next clip
          }
          return prev - 1;
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isShowActive, masterBlackout, isAutoAdvance, skipToNextPlaylistClip]);

  const mins = String(Math.floor(countdownSec / 60)).padStart(2, '0');
  const secs = String(countdownSec % 60).padStart(2, '0');

  const formatVideoTime = (timeSec: number) => {
    if (isNaN(timeSec) || timeSec < 0) return '00:00';
    const m = Math.floor(timeSec / 60);
    const s = Math.floor(timeSec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleCueClick = (padId: string) => {
    if (!masterBlackout) {
      playManualCueSound(padId, masterVolume);
    }
    triggerManualOverlayCue(padId);
  };

  return (
    <div className="flex-1 flex flex-col xl:flex-row min-h-[calc(100vh-3.5rem)] bg-[#0a0d12] text-slate-100 select-none p-3 gap-3 overflow-y-auto">
      {/* LEFT & CENTER PERFORMANCE DASHBOARD (10 Cols Equivalent) */}
      <div className="flex-1 min-w-0 flex flex-col gap-3">
        {/* TOP LIVE STATUS & SCHEDULE HEADER BANNER */}
        <div className="bg-[#12161f] border border-[#232b3a] rounded-lg px-4 py-2.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={navigateBack}
              className="py-1.5 px-3 rounded-md bg-[#182335] hover:bg-[#202f48] border border-cyan-500/60 hover:border-cyan-400 text-cyan-300 hover:text-white text-xs font-extrabold tracking-wider uppercase inline-flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)] cursor-pointer"
              title="Go back to previous screen (Alt+Left)"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
              <span>BACK</span>
            </button>

            <button
              type="button"
              onClick={saveCurrentProject}
              className="py-1.5 px-3 rounded-md bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/70 hover:border-emerald-400 text-emerald-300 hover:text-white text-xs font-extrabold tracking-wider uppercase inline-flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(16,185,129,0.25)] cursor-pointer"
              title="Save current project to storage (Ctrl+S)"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              <span>SAVE</span>
            </button>

            <div className="h-7 w-[1px] bg-[#233148] mx-0.5" />

            <div>
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-black tracking-wider uppercase text-white">
                  SCREEN 9: LIVE SHOWTIME / RUN SHOW SCREEN
                </h1>
              <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-lg tracking-wider uppercase">
                <Radio className="w-5 h-5 animate-pulse" />
                <span>
                  {masterBlackout
                    ? 'EMERGENCY BLACKOUT'
                    : isShowActive
                    ? 'LIVE SHOW ACTIVE'
                    : 'SHOW PAUSED'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-300 mt-0.5">
              <button
                type="button"
                onClick={cyclePlaybackMode}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#182030] hover:bg-[#202b40] border border-[#2c3b57] text-xs font-semibold cursor-pointer transition-colors"
                title="Click to cycle playback mode"
              >
                <span className="text-slate-400">PLAYBACK:</span>
                <strong className="text-cyan-300">{playbackMode}</strong>
                <span className="text-[10px] text-slate-400 font-mono">
                  ({scheduleStartTime} - {scheduleEndTime})
                </span>
              </button>
              <span className="text-slate-600">|</span>
              <span className="inline-flex items-center gap-1.5 font-mono text-slate-200">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {clockString}
              </span>
              {backendTelemetry && (
                <>
                  <span className="text-slate-600">|</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-cyan-300">
                    <Activity className="w-3 h-3 text-cyan-400" />
                    CV Engine:{' '}
                    {backendTelemetry.opencv_available ? 'OpenCV Active' : 'Fallback Ready'} (
                    {backendTelemetry.cpu_utilization_percent}% CPU)
                  </span>
                </>
              )}
            </div>
          </div>
          </div>

          {/* Dual-Channel Live Audio Mixer (VIDEO SOUND & MUSIC OVERLAY) */}
          <div className="flex items-center gap-3 bg-[#161d2b] border border-[#2c3b57] rounded-lg px-3 py-1.5 shadow-sm">
            {/* Soundtrack Selector */}
            <div className="flex flex-col min-w-0 max-w-[200px]">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Music className="w-3 h-3 text-cyan-400 shrink-0" />
                SHOW SOUNDTRACK (MP3)
              </span>
              <select
                aria-label="Select Show Soundtrack"
                value={selectedAudioUrl}
                onChange={(e) => {
                  const newTrack = e.target.value;
                  setSelectedAudioUrl(newTrack);
                  setAudioMixerParams({
                    musicOverlayTrackUrl: newTrack,
                    musicOverlayPlaying: true,
                  });
                  appendConsoleLog(
                    `Audio Mixer: Selected Soundtrack -> ${newTrack.split('/').pop() || newTrack}`,
                    'info'
                  );
                  setTimeout(() => {
                    if (audioRef.current && isShowActive && !masterBlackout) {
                      audioRef.current.play().catch(() => {});
                    }
                  }, 50);
                }}
                className="bg-transparent text-xs font-bold text-cyan-300 truncate focus:outline-none cursor-pointer"
              >
                {AUDIO_TRACK_OPTIONS.map((t) => (
                  <option
                    key={t.id}
                    value={t.url}
                    className="bg-[#12161f] text-white"
                  >
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="h-7 w-px bg-[#26354e]" />

            {/* Video Sound Channel */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const nextMuted = !videoSoundMuted;
                  setAudioMixerParams({ videoSoundMuted: nextMuted });
                  appendConsoleLog(
                    `Audio Mixer: Video Sound ${nextMuted ? 'MUTED' : 'UNMUTED'}`,
                    'info'
                  );
                }}
                className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                  videoSoundMuted
                    ? 'text-red-400 hover:text-red-300'
                    : 'text-emerald-400 hover:text-emerald-300'
                }`}
                title={videoSoundMuted ? 'Unmute Video Sound' : 'Mute Video Sound'}
              >
                {videoSoundMuted ? (
                  <VolumeX className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
                <span>VID {videoSoundMuted ? 'MUTED' : `${videoSoundVolume}%`}</span>
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
                }}
                aria-label="Video Sound Volume"
                className="w-16 h-1 cursor-pointer accent-emerald-400"
              />
            </div>

            <div className="h-7 w-px bg-[#26354e]" />

            {/* Music Overlay Channel */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const nextPlay = !musicOverlayPlaying;
                  setAudioMixerParams({ musicOverlayPlaying: nextPlay });
                  if (audioRef.current) {
                    if (nextPlay && !masterBlackout) {
                      audioRef.current.play().catch(() => {});
                    } else {
                      audioRef.current.pause();
                    }
                  }
                  appendConsoleLog(
                    `Audio Mixer: Soundtrack Overlay ${nextPlay ? 'PLAYING' : 'PAUSED'}`,
                    'info'
                  );
                }}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border flex items-center gap-1 transition-colors cursor-pointer ${
                  musicOverlayPlaying
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : 'bg-slate-800 border-slate-600 text-slate-300 hover:text-white'
                }`}
                title={musicOverlayPlaying ? 'Pause Soundtrack' : 'Play Soundtrack'}
              >
                {musicOverlayPlaying ? (
                  <Pause className="w-2.5 h-2.5 fill-current" />
                ) : (
                  <Play className="w-2.5 h-2.5 fill-current" />
                )}
                <span>{musicOverlayPlaying ? 'PAUSE' : 'PLAY'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const nextMuted = !musicOverlayMuted;
                  setAudioMixerParams({ musicOverlayMuted: nextMuted });
                  appendConsoleLog(
                    `Audio Mixer: Soundtrack Overlay ${nextMuted ? 'MUTED' : 'UNMUTED'}`,
                    'info'
                  );
                }}
                className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                  musicOverlayMuted
                    ? 'text-red-400 hover:text-red-300'
                    : 'text-cyan-400 hover:text-cyan-300'
                }`}
                title={musicOverlayMuted ? 'Unmute Soundtrack' : 'Mute Soundtrack'}
              >
                {musicOverlayMuted ? (
                  <VolumeX className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
                <span>OST {musicOverlayMuted ? 'MUTED' : `${musicOverlayVolume}%`}</span>
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
                }}
                aria-label="Music Overlay Volume"
                className="w-16 h-1 cursor-pointer accent-cyan-400"
              />
            </div>

            <div className="h-7 w-px bg-[#26354e]" />

            {/* 80% RESET Button */}
            <button
              type="button"
              onClick={() => {
                setAudioMixerParams({
                  videoSoundVolume: 80,
                  videoSoundMuted: false,
                  musicOverlayVolume: 80,
                  musicOverlayMuted: false,
                });
                appendConsoleLog(
                  'Audio Mixer: Reset 80/80 Dual-Channel Balance (Video Sound: 80%, Music Overlay: 80%, Both Unmuted)',
                  'info'
                );
              }}
              className="px-2 py-1 rounded bg-[#1f293d] hover:bg-[#2b3a56] border border-cyan-500/40 text-cyan-300 hover:text-white text-[10px] font-mono font-bold tracking-wider transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              title="Restore Video Sound to 80% and Music Overlay to 80% with both unmuted"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>80% RESET</span>
            </button>
          </div>

          {/* Specialized Live Showtime Tools */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsFmRadioSignModalOpen(true)}
              className="px-2.5 py-1 rounded bg-[#162032] hover:bg-[#1f2d47] border border-[#2c3d59] hover:border-cyan-400 text-cyan-300 hover:text-white text-[11px] font-bold tracking-wide transition-all shadow-sm flex items-center gap-1 cursor-pointer"
              title="FM Radio Transmitter & Dynamic RDS Text Broadcaster (Feature #42)"
            >
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span>FM RDS</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSpectatorPortalModalOpen(true)}
              className="px-2.5 py-1 rounded bg-[#162032] hover:bg-[#1f2d47] border border-[#2c3d59] hover:border-emerald-400 text-emerald-300 hover:text-white text-[11px] font-bold tracking-wide transition-all shadow-sm flex items-center gap-1 cursor-pointer"
              title="Spectator Smartphone QR Live Arcade & Interactive Mini-Games (Feature #45)"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Spectators</span>
            </button>

            <button
              type="button"
              onClick={() => setIsHardwareSafetyModalOpen(true)}
              className="px-2.5 py-1 rounded bg-[#162032] hover:bg-[#1f2d47] border border-[#2c3d59] hover:border-amber-400 text-amber-300 hover:text-white text-[11px] font-bold tracking-wide transition-all shadow-sm flex items-center gap-1 cursor-pointer"
              title="Projector Enclosure Thermal, Wind & Dew-Point Safety Guard (Feature #43)"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Safety Guard</span>
            </button>

            <button
              type="button"
              onClick={() => setIsShowExportModalOpen(true)}
              className="px-2.5 py-1 rounded bg-[#162032] hover:bg-[#1f2d47] border border-[#2c3d59] hover:border-fuchsia-400 text-fuchsia-300 hover:text-white text-[11px] font-bold tracking-wide transition-all shadow-sm flex items-center gap-1 cursor-pointer"
              title="Export Standalone Raspberry Pi / Kiosk Show Appliance (Feature #50)"
            >
              <HardDrive className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>Export Kiosk</span>
            </button>

            {/* Marshall Evening Rehearsal Simulator & Pre-Show Preflight Checklist */}
            <button
              type="button"
              onClick={() => setIsRunNightRehearsalModalOpen(true)}
              className="px-2.5 py-1 rounded bg-gradient-to-r from-amber-600/30 to-rose-600/30 hover:from-amber-600/50 hover:to-rose-600/50 border border-amber-500/70 hover:border-amber-400 text-amber-200 hover:text-white text-[11px] font-extrabold tracking-wide transition-all shadow-[0_0_12px_rgba(245,158,11,0.25)] flex items-center gap-1.5 cursor-pointer"
              title="Evening Rehearsal Simulator (--rehearse-evening) & Pre-Show Preflight Checklist"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Rehearsal &amp; Preflight</span>
            </button>

            <button
              type="button"
              onClick={() => setIsProjectTimeMachineModalOpen(true)}
              className="px-2.5 py-1 rounded bg-[#162032] hover:bg-[#1f2d47] border border-[#2c3d59] hover:border-blue-400 text-blue-300 hover:text-white text-[11px] font-bold tracking-wide transition-all shadow-sm flex items-center gap-1 cursor-pointer"
              title="Project Time Machine & Snapshot Visual Diff History (Feature #49)"
            >
              <History className="w-3.5 h-3.5 text-blue-400" />
              <span>Time Machine</span>
            </button>
          </div>
        </div>

        {/* MIDDLE 2-COLUMN DYNAMIC RESIZABLE WORKSPACE */}
        <div
          ref={workspaceContainerRef}
          className="flex flex-row min-h-[380px] w-full overflow-hidden"
        >
          {/* LEFT COLUMN (LIVE SECURITY/FEED CAMERA + INTERACTIVE MANUAL CUES) */}
          <div
            style={{ width: `calc(${workspacePercentages[0]}% - 6px)` }}
            className="flex flex-col gap-3 min-h-0 shrink-0 transition-all duration-75"
          >
            {/* LIVE SECURITY/FEED CAMERA Card */}
            <div
              className={`flex-1 bg-[#131822] border rounded-lg p-3 flex flex-col min-h-0 relative transition-all duration-200 ${
                isDmxStrobeFlashing
                  ? 'border-amber-400 shadow-[0_0_28px_rgba(245,158,11,0.7)] ring-2 ring-amber-400'
                  : 'border-[#242d3d]'
              }`}
            >
              <div className="flex items-center justify-between mb-2 shrink-0">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                  LIVE SECURITY/FEED CAMERA
                </h2>
                <div className="flex items-center gap-2">
                  <PreviewZoomControl
                    zoom={camZoom}
                    onChange={setCamZoom}
                    pan={camPan}
                    onResetPan={resetCamPan}
                    compact
                  />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-[11px] font-bold uppercase text-slate-400">
                      GRID OVERLAY
                    </span>
                    <input
                      type="checkbox"
                      checked={cameraGridOverlay}
                      onChange={(e) =>
                        setLiveShowParams({
                          cameraGridOverlay: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-700 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500 relative" />
                  </label>
                </div>
              </div>

              {/* 16:9 Low-IR Night Vision Feed Viewport */}
              <div
                onWheel={(e) => {
                  e.preventDefault();
                  const delta = e.deltaY < 0 ? 10 : -10;
                  setCamZoom((z) => Math.max(25, Math.min(250, z + delta)));
                }}
                onPointerDown={handleCamMiddleDown}
                onPointerMove={handleCamMiddleMove}
                onPointerUp={handleCamMiddleUp}
                onMouseDown={handleCamMiddleMouseDown}
                className={`flex-1 rounded-md bg-[#050811] relative overflow-hidden flex items-center justify-center transition-all duration-200 border ${
                  camPan.x !== 0 || camPan.y !== 0 ? 'cursor-grab' : ''
                } ${
                  isDmxStrobeFlashing
                    ? 'border-amber-400 ring-2 ring-amber-400/90 shadow-[inset_0_0_25px_rgba(245,158,11,0.45)]'
                    : 'border-[#263042]'
                }`}
              >
                {/* DMX Strobe Flash HUD Banner */}
                {isDmxStrobeFlashing && (
                  <div className="absolute inset-0 z-30 pointer-events-none bg-amber-400/20 animate-pulse flex items-center justify-center">
                    <div className="px-3.5 py-1.5 rounded-md bg-black/85 border border-amber-400 text-amber-300 font-mono text-xs font-black tracking-widest uppercase shadow-[0_0_20px_rgba(245,158,11,0.85)] animate-bounce">
                      ⚡ DMX UNIVERSE 1 STROBE PACKET ACTIVE ⚡
                    </div>
                  </div>
                )}
                <span className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded bg-black/70 text-[10px] font-mono text-slate-300">
                  16:9 low IR night vision ({camZoom}%)
                </span>
                <span className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded bg-black/70 text-[10px] font-mono text-slate-300">
                  Actively showing: {activeClip.title}
                </span>
                <span className="absolute bottom-2 left-2 z-20 px-2 py-0.5 rounded bg-black/75 text-[11px] font-mono text-slate-200">
                  Status: Cam 01 Active (30fps)
                </span>

                {/* Hidden HTML5 Audio Player for Show Soundtrack (.mp3 from /assets/Audio/) */}
                <audio
                  ref={audioRef}
                  src={selectedAudioUrl}
                  loop
                  preload="metadata"
                />

                {/* Zoomable 100% Frame Wrapper for Video & Wireframe */}
                <div
                  className="absolute inset-0 transition-transform duration-150 border border-dashed border-cyan-500/40"
                  style={{
                    transform: `translate(${camPan.x}px, ${camPan.y}px) scale(${camZoom / 100})`,
                  }}
                >
                  {/* Real AI Video Mapped onto House in Security Camera Feed with Real-Time Progress */}
                  {!masterBlackout && activeClip.videoUrl && (
                    <video
                      ref={videoRef}
                      key={activeClip.id}
                      src={activeClip.videoUrl}
                      poster={activeClip.thumbnailUrl}
                      autoPlay
                      loop
                      muted={masterBlackout || videoSoundMuted}
                      playsInline
                      onTimeUpdate={(e) => {
                        const el = e.currentTarget;
                        setVideoProgress({
                          current: el.currentTime,
                          duration: el.duration || activeClip.durationSec || 30,
                        });
                      }}
                      onLoadedMetadata={(e) => {
                        const el = e.currentTarget;
                        const masterFactor = Math.max(
                          0,
                          Math.min(1, masterVolume / 100)
                        );
                        el.volume = Math.max(
                          0,
                          Math.min(1, (videoSoundVolume / 100) * masterFactor)
                        );
                        el.muted = masterBlackout || videoSoundMuted;
                        setVideoProgress({
                          current: el.currentTime,
                          duration: el.duration || activeClip.durationSec || 30,
                        });
                      }}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ opacity: projectorLumens / 100 }}
                    />
                  )}

                  {/* Reference Wireframe Overlay when toggled ON */}
                  {refWireframeOverlay && (
                    <img
                      src={AUSTIN_HOUSE_ASSETS.wireframeLayout}
                      alt="Reference Wireframe"
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-45 mix-blend-screen"
                    />
                  )}
                </div>

                {/* SVG Visual Overlays: Calibration + 6 Distinct Manual Live Cue Animations */}
                <svg
                  viewBox={computeZoomViewBox(560, 280, camZoom, camPan.x, camPan.y).viewBox}
                  className="relative z-10 w-full h-full object-cover pointer-events-none"
                >
                  <defs>
                    <radialGradient id="thunder-glow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                      <stop offset="40%" stopColor="#60a5fa" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="slimer-glow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#86efac" stopOpacity="0.85" />
                      <stop offset="50%" stopColor="#22c55e" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#052e16" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="laser-beam" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="50%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                    <linearGradient id="xmas-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="25%" stopColor="#22c55e" />
                      <stop offset="50%" stopColor="#facc15" />
                      <stop offset="75%" stopColor="#22c55e" />
                      <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                  </defs>

                  {/* 1. THUNDER & FLASH LIVE OVERLAY: Lightning bolt + blinding white strobe flash */}
                  {activeManualCue === 'THUNDER & FLASH' && !masterBlackout && (
                    <g className="animate-pulse">
                      {/* Full-frame flash */}
                      <rect width="560" height="280" fill="#ffffff" opacity="0.75" />
                      <circle cx="280" cy="70" r="90" fill="url(#thunder-glow)" />

                      {/* Main Lightning Bolt */}
                      <path
                        d="M 285 0 L 260 65 L 298 88 L 240 162 L 275 186 L 220 280"
                        stroke="#60a5fa"
                        strokeWidth="6"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M 285 0 L 260 65 L 298 88 L 240 162 L 275 186 L 220 280"
                        stroke="#ffffff"
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Lightning Fork Branches */}
                      <path
                        d="M 260 65 L 205 115 L 230 132 L 185 195"
                        stroke="#93c5fd"
                        strokeWidth="3.5"
                        fill="none"
                      />
                      <path
                        d="M 240 162 L 295 208 L 320 250"
                        stroke="#93c5fd"
                        strokeWidth="2.5"
                        fill="none"
                      />

                      {/* Live HUD Label */}
                      <rect x="130" y="16" width="300" height="28" rx="6" fill="rgba(15, 23, 42, 0.85)" stroke="#60a5fa" strokeWidth="1.5" />
                      <text
                        x="280"
                        y="35"
                        textAnchor="middle"
                        fill="#93c5fd"
                        fontSize="13"
                        fontFamily="monospace"
                        fontWeight="bold"
                        letterSpacing="1.5"
                      >
                        ⚡ THUNDERCLAP &amp; STROBE FLASH ⚡
                      </text>
                    </g>
                  )}

                  {/* 2. SNOW STORM LIVE OVERLAY: Blizzard gusts + swirling falling snow particles */}
                  {activeManualCue === 'SNOW STORM' && !masterBlackout && (
                    <g>
                      {/* Frosty cold atmospheric tint */}
                      <rect width="560" height="280" fill="rgba(186, 230, 253, 0.22)" />
                      {/* Frost Vignette */}
                      <rect width="554" height="274" x="3" y="3" fill="none" stroke="#e0f2fe" strokeWidth="6" opacity="0.6" strokeDasharray="14 8" />

                      {/* Howling Wind Streaks */}
                      <line x1="10" y1="45" x2="220" y2="75" stroke="#ffffff" strokeWidth="2" opacity="0.75" strokeDasharray="40 20" />
                      <line x1="180" y1="125" x2="420" y2="155" stroke="#e0f2fe" strokeWidth="2.5" opacity="0.8" strokeDasharray="50 25" />
                      <line x1="260" y1="210" x2="550" y2="245" stroke="#ffffff" strokeWidth="2" opacity="0.7" strokeDasharray="45 20" />

                      {/* Falling Snowflake Particles */}
                      {[
                        [40, 35, 3], [90, 80, 4], [140, 50, 2], [180, 110, 3.5],
                        [230, 65, 4.5], [280, 140, 3], [330, 75, 4], [380, 160, 2.5],
                        [430, 95, 3.5], [480, 180, 4], [520, 120, 3], [70, 190, 3.5],
                        [120, 230, 4], [210, 215, 3], [310, 240, 4.5], [410, 225, 3],
                        [470, 250, 4], [530, 205, 3], [160, 170, 2.5], [360, 40, 3],
                      ].map(([cx, cy, r], idx) => (
                        <circle
                          key={idx}
                          cx={cx}
                          cy={cy}
                          r={r}
                          fill="#ffffff"
                          opacity={0.75 + (idx % 3) * 0.1}
                        />
                      ))}

                      {/* HUD Banner */}
                      <rect x="130" y="16" width="300" height="28" rx="6" fill="rgba(15, 23, 42, 0.85)" stroke="#ffffff" strokeWidth="1.5" />
                      <text
                        x="280"
                        y="35"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="13"
                        fontFamily="monospace"
                        fontWeight="bold"
                        letterSpacing="1.5"
                      >
                        ❄️ BLIZZARD / SNOW STORM ACTIVE ❄️
                      </text>
                    </g>
                  )}

                  {/* 3. GHOST SCREAM LIVE OVERLAY: Slimer ectoplasm aura + glowing paranormal eyes */}
                  {activeManualCue === 'GHOST SCREAM' && !masterBlackout && (
                    <g>
                      <rect width="560" height="280" fill="rgba(34, 197, 94, 0.22)" />
                      <ellipse cx="280" cy="130" rx="180" ry="100" fill="url(#slimer-glow)" />

                      {/* Ectoplasm Wavy Rings */}
                      <ellipse cx="280" cy="130" rx="210" ry="110" fill="none" stroke="#4ade80" strokeWidth="4" opacity="0.6" strokeDasharray="14 10" />
                      <ellipse cx="280" cy="130" rx="140" ry="75" fill="none" stroke="#86efac" strokeWidth="3" opacity="0.75" />

                      {/* Dripping Ecto-Tendrils */}
                      <path
                        d="M 60 50 Q 140 110 220 70 T 360 90 T 500 60"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="5"
                        opacity="0.8"
                      />
                      <path
                        d="M 100 200 Q 200 260 300 215 T 480 235"
                        fill="none"
                        stroke="#a3e635"
                        strokeWidth="4"
                        opacity="0.7"
                      />

                      {/* Glowing Paranormal Eyes in the Upper Window */}
                      <ellipse cx="260" cy="115" rx="9" ry="13" fill="#facc15" />
                      <ellipse cx="300" cy="115" rx="9" ry="13" fill="#facc15" />
                      <circle cx="260" cy="115" r="4.5" fill="#000000" />
                      <circle cx="300" cy="115" r="4.5" fill="#000000" />

                      <rect x="110" y="16" width="340" height="28" rx="6" fill="rgba(5, 46, 22, 0.9)" stroke="#4ade80" strokeWidth="1.5" />
                      <text
                        x="280"
                        y="35"
                        textAnchor="middle"
                        fill="#86efac"
                        fontSize="13"
                        fontFamily="monospace"
                        fontWeight="bold"
                        letterSpacing="1.2"
                      >
                        👻 SLIMER ECTOPLASM BREACH / SCREAM 👻
                      </text>
                    </g>
                  )}

                  {/* 4. STRIKE LASER LIVE OVERLAY: Sci-fi proton pack beams with crackling energy sparks */}
                  {activeManualCue === 'STRIKE LASER' && !masterBlackout && (
                    <g>
                      <rect width="560" height="280" fill="rgba(239, 68, 68, 0.15)" />

                      {/* Primary Red Proton Beam */}
                      <path
                        d="M 0 270 Q 180 150 295 130 T 560 45"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="6"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 0 270 Q 180 150 295 130 T 560 45"
                        fill="none"
                        stroke="#fef08a"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />

                      {/* Secondary Intertwined Cyan Particle Stream */}
                      <path
                        d="M 0 255 Q 195 110 310 145 T 560 60"
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="4"
                        strokeDasharray="10 6"
                        strokeLinecap="round"
                      />

                      {/* Energy Focal Spark Ring */}
                      <circle cx="295" cy="130" r="26" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="5 5" />
                      <circle cx="295" cy="130" r="10" fill="#ffffff" />
                      <circle cx="160" cy="180" r="5" fill="#fef08a" />
                      <circle cx="430" cy="85" r="6" fill="#06b6d4" />

                      <rect x="120" y="16" width="320" height="28" rx="6" fill="rgba(69, 10, 10, 0.9)" stroke="#f87171" strokeWidth="1.5" />
                      <text
                        x="280"
                        y="35"
                        textAnchor="middle"
                        fill="#fca5a5"
                        fontSize="13"
                        fontFamily="monospace"
                        fontWeight="bold"
                        letterSpacing="1.5"
                      >
                        ⚡ PROTON-PACK LASER STRIKE ACTIVE ⚡
                      </text>
                    </g>
                  )}

                  {/* 5. FIREWORKS LIVE OVERLAY: Colorful aerial bursts & launch rocket trails */}
                  {activeManualCue === 'FIREWORKS' && !masterBlackout && (
                    <g>
                      <rect width="560" height="280" fill="rgba(245, 158, 11, 0.15)" />

                      {/* Rocket Launch Trails */}
                      <path d="M 130 280 Q 135 180 140 80" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6 4" />
                      <path d="M 280 280 Q 280 160 280 50" stroke="#ec4899" strokeWidth="2.5" strokeDasharray="6 4" />
                      <path d="M 430 280 Q 425 180 420 90" stroke="#06b6d4" strokeWidth="2.5" strokeDasharray="6 4" />

                      {/* Burst 1: Gold / Amber (Left) */}
                      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
                        const rad = (deg * Math.PI) / 180;
                        const x2 = 140 + Math.cos(rad) * 42;
                        const y2 = 80 + Math.sin(rad) * 42;
                        return (
                          <line key={`b1-${deg}`} x1="140" y1="80" x2={x2} y2={y2} stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
                        );
                      })}
                      <circle cx="140" cy="80" r="6" fill="#ffffff" />

                      {/* Burst 2: Magenta / Rose (Center Top) */}
                      {[15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315, 345].map((deg) => {
                        const rad = (deg * Math.PI) / 180;
                        const x2 = 280 + Math.cos(rad) * 55;
                        const y2 = 50 + Math.sin(rad) * 55;
                        return (
                          <line key={`b2-${deg}`} x1="280" y1="50" x2={x2} y2={y2} stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />
                        );
                      })}
                      <circle cx="280" cy="50" r="8" fill="#ffffff" />

                      {/* Burst 3: Cyan / Sky (Right) */}
                      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
                        const rad = (deg * Math.PI) / 180;
                        const x2 = 420 + Math.cos(rad) * 45;
                        const y2 = 90 + Math.sin(rad) * 45;
                        return (
                          <line key={`b3-${deg}`} x1="420" y1="90" x2={x2} y2={y2} stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                        );
                      })}
                      <circle cx="420" cy="90" r="6" fill="#ffffff" />

                      <rect x="120" y="16" width="320" height="28" rx="6" fill="rgba(69, 26, 3, 0.9)" stroke="#fbbf24" strokeWidth="1.5" />
                      <text
                        x="280"
                        y="35"
                        textAnchor="middle"
                        fill="#fde68a"
                        fontSize="13"
                        fontFamily="monospace"
                        fontWeight="bold"
                        letterSpacing="1.5"
                      >
                        🎆 CELEBRATION FIREWORKS DISPLAY 🎆
                      </text>
                    </g>
                  )}

                  {/* 6. MERRY CHRISTMAS LIVE OVERLAY: Festive red/green garland + twinkling stars */}
                  {activeManualCue === 'MERRY CHRISTMAS' && !masterBlackout && (
                    <g>
                      <rect width="560" height="280" fill="rgba(22, 163, 74, 0.15)" />
                      {/* Decorative Festive Border Shimmer */}
                      <rect width="554" height="274" x="3" y="3" fill="none" stroke="url(#xmas-grad)" strokeWidth="5" opacity="0.8" />

                      {/* Roofline Evergreen Garland */}
                      <path
                        d="M 20 60 Q 80 95 140 65 T 260 70 T 380 65 T 500 70 T 560 60"
                        fill="none"
                        stroke="#15803d"
                        strokeWidth="5"
                        strokeLinecap="round"
                      />

                      {/* Glowing Christmas Lights along Garland */}
                      {[
                        [30, 62, '#ef4444'], [75, 82, '#facc15'], [110, 78, '#22c55e'],
                        [145, 66, '#38bdf8'], [185, 78, '#ef4444'], [225, 80, '#facc15'],
                        [265, 71, '#22c55e'], [305, 78, '#38bdf8'], [345, 78, '#ef4444'],
                        [385, 66, '#facc15'], [425, 78, '#22c55e'], [465, 80, '#38bdf8'],
                        [505, 71, '#ef4444'], [545, 62, '#facc15'],
                      ].map(([lx, ly, col], idx) => (
                        <circle key={`l-${idx}`} cx={Number(lx)} cy={Number(ly)} r="5" fill={String(col)} />
                      ))}

                      {/* Golden Northern Star over the house ridge */}
                      <polygon
                        points="280,18 284,32 298,36 284,40 280,54 276,40 262,36 276,32"
                        fill="#fef08a"
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                      />

                      <rect x="100" y="16" width="360" height="28" rx="6" fill="rgba(20, 83, 45, 0.9)" stroke="#4ade80" strokeWidth="1.5" />
                      <text
                        x="280"
                        y="35"
                        textAnchor="middle"
                        fill="#bbf7d0"
                        fontSize="13"
                        fontFamily="monospace"
                        fontWeight="bold"
                        letterSpacing="1.2"
                      >
                        🎄 MERRY CHRISTMAS &amp; HAPPY HOLIDAYS 🎄
                      </text>
                    </g>
                  )}

                  {/* Alignment Crosshair Overlay */}
                  {alignmentCrossOverlay && (
                    <g stroke="#00f0ff" strokeWidth="1.2" strokeDasharray="4 4">
                      <line x1="280" y1="0" x2="280" y2="280" />
                      <line x1="0" y1="140" x2="560" y2="140" />
                    </g>
                  )}

                  {/* Camera Calibration Grid Overlay */}
                  {(cameraGridOverlay || testGridOverlay) && (
                    <g
                      stroke="#94a3b8"
                      strokeWidth="0.6"
                      opacity={gridBrightness / 100}
                    >
                      {[55, 110, 165, 220].map((y) => (
                        <line key={y} x1="0" y1={y} x2="560" y2={y} />
                      ))}
                      {[90, 180, 270, 360, 450].map((x) => (
                        <line key={x} x1={x} y1="0" x2={x} y2="280" />
                      ))}
                    </g>
                  )}
                </svg>

                {/* Inset Bottom-Right QUICK PATTERN / CALIBRATION OVERLAYS Sub-Box (Minimizable to reveal full preview) */}
                {isCalibrationOverlayMinimized ? (
                  <button
                    type="button"
                    onClick={() => setIsCalibrationOverlayMinimized(false)}
                    className="absolute bottom-2 right-2 z-20 px-2.5 py-1.5 rounded-md bg-[#121722]/90 hover:bg-[#1c2436] border border-[#2c384e] hover:border-cyan-500/60 text-slate-200 shadow-2xl backdrop-blur-md flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider transition-all group cursor-pointer"
                    title="Expand Quick Pattern / Calibration Overlays window"
                    aria-label="Expand Quick Pattern / Calibration Overlays window"
                  >
                    <Layers className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                    <span>Calibration Overlays</span>
                    <Maximize2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-300" />
                  </button>
                ) : (
                  <div className="absolute bottom-2 right-2 z-20 w-[240px] rounded-md bg-[#121722]/95 border border-[#2c384e] p-2.5 shadow-2xl backdrop-blur-md transition-all">
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-200 truncate">
                        QUICK PATTERN / CALIBRATION OVERLAYS
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCalibrationOverlayMinimized(true)}
                        className="p-1 rounded hover:bg-[#202a3d] text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer shrink-0"
                        title="Minimize window to view full camera preview"
                        aria-label="Minimize overlay window"
                      >
                        <Minimize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="space-y-1.5 text-[10px] font-bold">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <Grid className="w-3 h-3 text-slate-400" />
                          TEST GRID
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setLiveShowParams({
                              testGridOverlay: !testGridOverlay,
                            })
                          }
                          className={`px-2 py-0.5 rounded-full text-[9px] font-mono ${
                            testGridOverlay
                              ? 'bg-emerald-500 text-black font-extrabold'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {testGridOverlay ? 'ON' : 'OFF'}
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <Crosshair className="w-3 h-3 text-slate-400" />
                          ALIGNMENT CROSS
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setLiveShowParams({
                              alignmentCrossOverlay: !alignmentCrossOverlay,
                            })
                          }
                          className={`px-2 py-0.5 rounded-full text-[9px] font-mono ${
                            alignmentCrossOverlay
                              ? 'bg-emerald-500 text-black font-extrabold'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {alignmentCrossOverlay ? 'ON' : 'OFF'}
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <Box className="w-3 h-3 text-slate-400" />
                          REF WIREFRAME
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setLiveShowParams({
                              refWireframeOverlay: !refWireframeOverlay,
                            })
                          }
                          className={`px-2 py-0.5 rounded-full text-[9px] font-mono ${
                            refWireframeOverlay
                              ? 'bg-emerald-500 text-black font-extrabold'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {refWireframeOverlay ? 'ON' : 'OFF'}
                        </button>
                      </div>

                      <div className="pt-1 flex items-center gap-2">
                        <span className="text-[9px] text-slate-400 shrink-0">
                          GRID BRIGHTNESS:
                        </span>
                        <input
                          type="range"
                          min={10}
                          max={100}
                          value={gridBrightness}
                          onChange={(e) =>
                            setLiveShowParams({
                              gridBrightness: Number(e.target.value),
                            })
                          }
                          className="flex-1 h-1"
                        />
                        <span className="font-mono text-[10px] text-slate-200">
                          {gridBrightness}%
                        </span>
                      </div>
                    </div>

                    {/* DMX Universe 1 Strobe Test Button */}
                    <button
                      type="button"
                      onClick={handleTestDmxStrobe}
                      className="w-full mt-2 py-1.5 px-2 rounded bg-[#271b0b] hover:bg-[#3a2811] border border-amber-500/60 text-amber-300 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.25)] transition-all active:scale-95 cursor-pointer"
                      title="Dispatch DMX Universe 1 strobe packet and flash camera feed"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      TEST DMX STROBE
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* BOTTOM-LEFT ROW: INTERACTIVE MANUAL CUES (LIVE OVERLAYS) + HARDWARE TRIGGER STATUS */}
            <div className="h-[190px] grid grid-cols-12 gap-3 shrink-0">
              {/* 6 Tactile Live Overlay Pads with Real-Time Web Audio Synthesizer */}
              <div className="col-span-7 bg-[#131822] border border-[#242d3d] rounded-lg p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-200">
                    INTERACTIVE MANUAL CUES (LIVE OVERLAYS)
                  </h3>
                  <span className="text-[9px] font-mono text-cyan-400 font-bold">
                    WebAudio Synth Active
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 flex-1 pt-2">
                  {MANUAL_CUE_PADS.map((pad) => (
                    <button
                      key={pad.id}
                      type="button"
                      onClick={() => handleCueClick(pad.id)}
                      className={`rounded-md border font-extrabold text-[10px] uppercase tracking-wider leading-tight flex flex-col items-center justify-center text-center p-1.5 transition-transform active:scale-95 ${pad.bgClass}`}
                    >
                      {pad.hasIcon && <Zap className="w-4 h-4 mb-0.5" />}
                      <span className="whitespace-pre-line">{pad.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* HARDWARE TRIGGER STATUS Panel */}
              <div className="col-span-5 bg-[#131822] border border-[#242d3d] rounded-lg p-3 flex flex-col justify-between">
                <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-200">
                  HARDWARE TRIGGER STATUS
                </h3>
                <div className="space-y-2.5 my-auto text-xs">
                  <div
                    onClick={() => {
                      const next = !dmxGatewayOnline;
                      setLiveShowParams({ dmxGatewayOnline: next });
                      appendConsoleLog(
                        `DMX: Gateway status changed to ${next ? 'ONLINE' : 'OFFLINE'}`,
                        next ? 'info' : 'warning'
                      );
                    }}
                    role="button"
                    tabIndex={0}
                    className="flex items-center justify-between cursor-pointer hover:opacity-85 transition-opacity"
                  >
                    <span className="text-slate-300">DMX: GATEWAY</span>
                    <span
                      className={`px-2.5 py-0.5 rounded font-mono text-[11px] font-bold border transition-colors ${
                        dmxGatewayOnline
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                          : 'bg-red-500/20 border-red-500/40 text-red-400'
                      }`}
                    >
                      {dmxGatewayOnline ? 'ON' : 'OFF'}
                    </span>
                  </div>

                  <div
                    onClick={() => {
                      const next =
                        pir01Status === 'TRIGGERED' ? 'READY' : 'TRIGGERED';
                      setLiveShowParams({ pir01Status: next });
                      if (next === 'TRIGGERED') {
                        appendConsoleLog(
                          'Driveway Motion Sensor PIR_01 TRIGGERED!',
                          'trigger'
                        );
                        handleCueClick('GHOST SCREAM');
                      } else {
                        appendConsoleLog(
                          'Driveway Motion Sensor PIR_01 Reset to READY',
                          'info'
                        );
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className="flex items-center justify-between cursor-pointer hover:opacity-85 transition-opacity"
                  >
                    <span className="text-slate-300">
                      Motion Sensor PIR_01:
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border transition-colors ${
                        pir01Status === 'TRIGGERED'
                          ? 'bg-amber-500/25 border-amber-400 text-amber-300 animate-pulse'
                          : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                      }`}
                    >
                      {pir01Status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">PIR_02:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const next =
                          pir02Status === 'TRIGGERED' ? 'READY' : 'TRIGGERED';
                        setLiveShowParams({ pir02Status: next });
                        appendConsoleLog(
                          `Sensor PIR_02 ${next}`,
                          next === 'TRIGGERED' ? 'trigger' : 'info'
                        );
                      }}
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                        pir02Status === 'TRIGGERED'
                          ? 'bg-amber-500/25 border-amber-400 text-amber-300'
                          : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                      }`}
                    >
                      {pir02Status}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* INTERACTIVE DRAGGABLE DIVIDER (RESIZE CAMERA/CUES VS PLAYLIST/LOGS) */}
          <DraggableDivider
            onDrag={handleDragMiddleColumns}
            onReset={resetMiddleColumns}
            title="Drag border left or right to resize Camera Feed vs Playlist Queue (Double-click to reset)"
            className="mx-1"
          />

          {/* CENTER-RIGHT COLUMN (PLAYLIST QUEUE + COUNTDOWN + AUTOMATION/CONSOLE LOG) */}
          <div
            style={{ width: `calc(${workspacePercentages[1]}% - 6px)` }}
            className="flex flex-col gap-3 min-h-0 shrink-0 transition-all duration-75"
          >
            {/* PLAYLIST QUEUE Live Tracker */}
            <div className="flex-1 bg-[#131822] border border-[#242d3d] rounded-lg p-3 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                  PLAYLIST QUEUE ({playlistClips.length} CLIPS)
                </h2>
                <span className="text-[10px] font-mono text-cyan-400 font-bold">
                  All Cues Clickable
                </span>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                {playlistClips.map((clip, index) => {
                  const isActive = clip.status === 'Active';
                  return (
                    <div
                      key={clip.id}
                      onClick={() => {
                        activatePlaylistClip(clip.id);
                        if (clip.audioUrl) {
                          setSelectedAudioUrl(clip.audioUrl);
                          setAudioMixerParams({
                            musicOverlayTrackUrl: clip.audioUrl,
                            musicOverlayPlaying: true,
                          });
                        }
                        setCountdownSec(105);
                        setTimeout(() => {
                          if (audioRef.current && isShowActive && !masterBlackout) {
                            audioRef.current.play().catch(() => {});
                          }
                          if (videoRef.current && isShowActive && !masterBlackout) {
                            videoRef.current.play().catch(() => {});
                          }
                        }, 50);
                      }}
                      role="button"
                      tabIndex={0}
                      className={`rounded-lg p-2.5 border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#172622] border-2 border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.3)]'
                          : 'bg-[#19202d] border-[#283347] hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold flex items-center gap-2 ${
                            isActive ? 'text-white' : 'text-slate-300'
                          }`}
                        >
                          <span className="font-mono text-[10px] text-slate-400 font-normal">
                            #{index + 1}
                          </span>
                          {clip.title}
                        </span>

                        {clip.status === 'Finished' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">
                            Finished <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                        {clip.status === 'Active' && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/25 text-emerald-300 text-[10px] font-extrabold">
                            Active Cue
                          </span>
                        )}
                        {clip.status === 'Up Next' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                            Up Next <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                        {clip.status === 'Queued' && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">
                            Queued
                          </span>
                        )}
                      </div>

                      {/* Real-time interactive video progress readouts */}
                      {isActive && (
                        <div
                          className="mt-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex justify-between items-center text-xs font-mono text-slate-300 mb-1">
                            <span className="text-[10px] uppercase text-emerald-400 font-bold flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              LIVE PLAYBACK
                            </span>
                            <div className="flex items-center gap-2">
                              <span>
                                {formatVideoTime(videoProgress.current)} /{' '}
                                {formatVideoTime(
                                  videoProgress.duration || clip.durationSec || 30
                                )}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (videoRef.current) {
                                    videoRef.current.currentTime = 0;
                                    setVideoProgress((prev) => ({
                                      ...prev,
                                      current: 0,
                                    }));
                                    if (isShowActive && !masterBlackout) {
                                      videoRef.current.play().catch(() => {});
                                    }
                                    appendConsoleLog(
                                      `Playlist Cue #${index + 1} (${clip.title}): RESTART CLIP to 00:00`,
                                      'trigger'
                                    );
                                  }
                                }}
                                className="px-1.5 py-0.5 rounded bg-[#1e293b] hover:bg-[#2d3e58] text-emerald-300 hover:text-white border border-emerald-500/40 text-[9px] font-mono font-bold tracking-tight transition-colors cursor-pointer"
                                title="Restart clip to 00:00"
                              >
                                RESTART CLIP
                              </button>
                            </div>
                          </div>
                          <div
                            role="progressbar"
                            aria-label="Interactive Video Progress Bar"
                            aria-valuenow={videoProgress.current}
                            aria-valuemin={0}
                            aria-valuemax={
                              videoProgress.duration || clip.durationSec || 30
                            }
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect =
                                e.currentTarget.getBoundingClientRect();
                              if (rect.width <= 0) return;
                              const ratio = Math.max(
                                0,
                                Math.min(
                                  1,
                                  (e.clientX - rect.left) / rect.width
                                )
                              );
                              const duration =
                                videoProgress.duration ||
                                clip.durationSec ||
                                30;
                              const seekTime = ratio * duration;
                              if (videoRef.current) {
                                videoRef.current.currentTime = seekTime;
                              }
                              setVideoProgress((prev) => ({
                                ...prev,
                                current: seekTime,
                                duration,
                              }));
                              appendConsoleLog(
                                `Playlist Cue #${index + 1} (${clip.title}): Seeked to ${formatVideoTime(seekTime)} (${Math.round(ratio * 100)}%)`,
                                'info'
                              );
                            }}
                            className="w-full h-2.5 bg-slate-800 hover:bg-slate-700/80 rounded-full overflow-hidden cursor-pointer p-[2px] transition-colors relative group"
                            title="Click or scrub to seek playback position"
                          >
                            <div
                              className="h-full bg-emerald-400 group-hover:bg-emerald-300 rounded-full transition-all duration-100 relative pointer-events-none"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(
                                    2,
                                    (videoProgress.current /
                                      (videoProgress.duration ||
                                        clip.durationSec ||
                                        30)) *
                                      100
                                  )
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TIME TO NEXT CLIP Countdown Readout with AUTO-ADVANCE / LOOP ALL & RESET TIMER */}
            <div className="h-[108px] bg-[#131822] border border-[#242d3d] rounded-lg p-2.5 flex flex-col justify-between shrink-0">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300">
                  TIME TO NEXT CLIP
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleAutoAdvance}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                      isAutoAdvance
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                        : 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                    }`}
                    title="Toggle between Auto-Advancing to next cue or Holding/Looping current clip"
                  >
                    {isAutoAdvance ? '● AUTO-ADVANCE' : '⏸ LOOP ALL / HOLD'}
                  </button>
                  <button
                    type="button"
                    onClick={handleResetCountdown}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1c2436] hover:bg-[#25324d] border border-[#334466] text-cyan-300 transition-colors cursor-pointer"
                    title="Reset countdown timer to 01m 45s"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    RESET TIMER
                  </button>
                </div>
              </div>
              <div className="flex items-baseline justify-center gap-3">
                <div className="text-4xl font-black font-mono tracking-tight text-white">
                  {mins}m {secs}s
                </div>
                <span
                  className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                    isAutoAdvance
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {isAutoAdvance ? 'Auto-Skipping' : 'Holding Clip'}
                </span>
              </div>
            </div>

            {/* SYSTEM AUTOMATION & CALENDAR + CONSOLE ACTION LOG */}
            <div className="h-[148px] bg-[#131822] border border-[#242d3d] rounded-lg p-2.5 grid grid-cols-12 gap-3 shrink-0">
              <div className="col-span-5 border-r border-[#242d3d] pr-2 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-200">
                  <span>SYSTEM AUTOMATION</span>
                  <button
                    type="button"
                    onClick={cyclePlaybackMode}
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 cursor-pointer"
                    title="Click to cycle playback mode"
                  >
                    {playbackMode.split(' ')[0]}
                  </button>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">
                    Daily calendar schedule window
                  </div>
                  <div className="text-xs font-bold text-emerald-400 mt-0.5">
                    Tonight: Active ({playbackMode})
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      type="time"
                      value={scheduleStartTime}
                      onChange={(e) => {
                        setScheduleStartTime(e.target.value);
                        appendConsoleLog(
                          `Schedule start time set to ${e.target.value}`,
                          'info'
                        );
                      }}
                      className="bg-[#0b1019] border border-[#2b374e] rounded px-1.5 py-0.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-400 w-20"
                      aria-label="Schedule Start Time"
                    />
                    <span className="text-slate-400 text-xs">to</span>
                    <input
                      type="time"
                      value={scheduleEndTime}
                      onChange={(e) => {
                        setScheduleEndTime(e.target.value);
                        appendConsoleLog(
                          `Schedule end time set to ${e.target.value}`,
                          'info'
                        );
                      }}
                      className="bg-[#0b1019] border border-[#2b374e] rounded px-1.5 py-0.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-400 w-20"
                      aria-label="Schedule End Time"
                    />
                  </div>
                </div>
              </div>

              <div className="col-span-7 flex flex-col min-h-0">
                <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-200 mb-1 shrink-0">
                  <span>CONSOLE ACTION LOG</span>
                  <div className="flex items-center gap-1 font-mono text-[9px]">
                    <button
                      type="button"
                      onClick={handleExportConsoleLogsTxt}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1c2436] hover:bg-[#26344d] border border-[#2f3f5c] text-cyan-300 font-bold transition-colors cursor-pointer"
                      title="Download console logs as timestamped .txt file"
                    >
                      <Download className="w-2.5 h-2.5" />
                      EXPORT .TXT
                    </button>
                    <button
                      type="button"
                      onClick={clearConsoleLogs}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-950/60 hover:bg-red-900/80 border border-red-500/40 text-red-300 font-bold transition-colors cursor-pointer"
                      title="Clear console action log history"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                      CLEAR
                    </button>
                  </div>
                </div>

                <div
                  ref={consoleLogContainerRef}
                  className="flex-1 overflow-y-auto space-y-1 font-mono text-[11px] text-slate-300 pr-1 scroll-smooth"
                >
                  {consoleLogs.map((entry) => (
                    <div key={entry.id} className="truncate">
                      <span className="text-slate-400">{entry.timestamp}</span>{' '}
                      -{' '}
                      <span
                        className={
                          entry.level === 'trigger'
                            ? 'text-amber-300'
                            : entry.level === 'warning'
                            ? 'text-red-400'
                            : 'text-slate-200'
                        }
                      >
                        {entry.message}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Manual Operator Command Input */}
                <form
                  onSubmit={handleManualCommandSubmit}
                  className="mt-1 flex items-center gap-1 shrink-0"
                >
                  <input
                    type="text"
                    value={manualCommandInput}
                    onChange={(e) => setManualCommandInput(e.target.value)}
                    placeholder="Send cue / DMX command..."
                    className="flex-1 bg-[#0b1019] border border-[#2b374e] rounded px-2 py-0.5 text-[10px] font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-[10px] font-mono font-bold text-white transition-colors cursor-pointer"
                  >
                    SEND
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* INTERACTIVE DRAGGABLE DIVIDER (RESIZE MASTER OPERATOR COLUMN) */}
      <DraggableDivider
        onDrag={handleDragMasterColumn}
        onReset={resetMasterColumnWidth}
        title="Drag border left or right to resize Master Operator Column (Double-click to reset)"
        className="mx-0.5"
      />

      {/* RIGHT MASTER OPERATOR CONTROL COLUMN */}
      <aside
        style={{ width: `${masterColumnWidth}px` }}
        className="shrink-0 bg-[#12161f] border border-[#232b3a] rounded-lg p-3.5 flex flex-col justify-between items-center transition-all duration-75 overflow-y-auto"
      >
        {/* Giant Circular Neon-Green GO Button */}
        <button
          type="button"
          onClick={() => {
            setLiveShowParams({ isShowActive: true });
            toggleMasterBlackout(false);
            setAudioMixerParams({ musicOverlayPlaying: true });
            if (audioRef.current) {
              audioRef.current.play().catch(() => {});
            }
            if (videoRef.current) {
              videoRef.current.play().catch(() => {});
            }
            appendConsoleLog('Operator Manual GO Command Executed');
          }}
          className="w-36 h-36 rounded-full bg-[#15231d] hover:bg-[#1a2e25] border-4 border-emerald-400 shadow-[0_0_28px_rgba(16,185,129,0.55)] flex flex-col items-center justify-center gap-1 transition-transform active:scale-95"
        >
          <Play className="w-12 h-12 text-emerald-400 fill-emerald-400 translate-x-0.5" />
          <span className="text-2xl font-black tracking-wider text-emerald-400">
            GO
          </span>
        </button>

        {/* PAUSE & SKIP NEXT Buttons */}
        <div className="w-full space-y-2.5 my-2">
          <button
            type="button"
            onClick={() => {
              const nextActive = !isShowActive;
              setLiveShowParams({ isShowActive: nextActive });
              setAudioMixerParams({ musicOverlayPlaying: nextActive });
              if (audioRef.current) {
                if (nextActive) {
                  audioRef.current.play().catch(() => {});
                } else {
                  audioRef.current.pause();
                }
              }
              if (videoRef.current) {
                if (nextActive) {
                  videoRef.current.play().catch(() => {});
                } else {
                  videoRef.current.pause();
                }
              }
              appendConsoleLog(
                isShowActive ? 'Show Playback Paused' : 'Show Playback Resumed'
              );
            }}
            className="w-full py-3 rounded-lg bg-[#242018] hover:bg-[#332c1e] border-2 border-amber-400/90 text-amber-300 font-extrabold text-base tracking-wider uppercase shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-colors"
          >
            PAUSE
          </button>

          <button
            type="button"
            onClick={() => {
              skipToNextPlaylistClip();
              setCountdownSec(105);
            }}
            className="w-full py-3 rounded-lg bg-[#162238] hover:bg-[#1e2f4d] border-2 border-blue-500 text-blue-400 font-extrabold text-base tracking-wider uppercase shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-colors"
          >
            SKIP NEXT
          </button>
        </div>

        {/* Dual Vertical Master Faders: PROJECTOR LUMENS & MASTER VOLUME */}
        <div className="w-full flex-1 flex items-center justify-around py-2">
          <div className="flex flex-col items-center h-full justify-between">
            <span className="text-[10px] font-extrabold uppercase text-center text-slate-300 leading-tight">
              PROJECTOR
              <br />
              LUMENS ({projectorLumens}%)
            </span>
            <div className="relative h-28 flex items-center justify-center my-2">
              <input
                type="range"
                min={0}
                max={100}
                value={projectorLumens}
                onChange={(e) =>
                  setLiveShowParams({
                    projectorLumens: Number(e.target.value),
                  })
                }
                className="w-24 -rotate-90 cursor-pointer"
                aria-label="Projector Lumens"
              />
            </div>
          </div>

          <div className="flex flex-col items-center h-full justify-between">
            <span className="text-[10px] font-extrabold uppercase text-center text-slate-300 leading-tight">
              MASTER
              <br />
              VOLUME ({masterVolume}%)
            </span>
            <div className="relative h-28 flex items-center justify-center my-2">
              <input
                type="range"
                min={0}
                max={100}
                value={masterVolume}
                onChange={(e) =>
                  setLiveShowParams({ masterVolume: Number(e.target.value) })
                }
                className="w-24 -rotate-90 cursor-pointer"
                aria-label="Master Volume"
              />
            </div>
          </div>
        </div>

        {/* LIVE AUDIO DELAY SYNC (-1.00s to +3.00s) */}
        <div className="rounded-lg p-2.5 bg-[#111928] border border-cyan-500/30 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase text-cyan-300">
            <span>Audio Delay</span>
            <span className="font-mono text-white">
              {audioDelayMs >= 0 ? '+' : ''}
              {(audioDelayMs / 1000).toFixed(2)}s
            </span>
          </div>
          <input
            type="range"
            min={-1000}
            max={3000}
            step={25}
            value={audioDelayMs}
            onChange={(e) => setAudioDelayMs(Number(e.target.value))}
            aria-label="Live Audio Delay"
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => setAudioDelayMs(audioDelayMs - 50)}
              className="py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] font-mono text-slate-200 border border-slate-600"
            >
              -50ms
            </button>
            <button
              type="button"
              onClick={() => setAudioDelayMs(0)}
              className="py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] font-mono text-cyan-300 border border-slate-600"
            >
              0ms
            </button>
            <button
              type="button"
              onClick={() => setAudioDelayMs(audioDelayMs + 50)}
              className="py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] font-mono text-slate-200 border border-slate-600"
            >
              +50ms
            </button>
          </div>
        </div>

        {/* MASTER PANIC / BLACKOUT [ESC] Button */}
        <button
          type="button"
          onClick={() => toggleMasterBlackout()}
          className={`w-full py-4 px-3 rounded-lg border-2 font-black text-xs tracking-wider uppercase text-center leading-snug transition-all ${
            masterBlackout
              ? 'bg-red-950 border-red-400 text-red-200 shadow-[0_0_25px_rgba(239,68,68,0.8)] animate-pulse'
              : 'bg-[#b91c1c] hover:bg-[#dc2626] border-red-400 text-white shadow-[0_0_22px_rgba(220,38,38,0.55)]'
          }`}
        >
          MASTER
          <br />
          PANIC / BLACKOUT
          <br />
          <span className="text-[11px] font-mono text-red-200">[ESC]</span>
        </button>
      </aside>
    </div>
  );
};
