import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Maximize2,
  Minimize2,
  X,
  AlertTriangle,
  Grid,
  Eye,
  EyeOff,
  Sliders,
  Volume2,
  VolumeX,
  Tv,
  Sparkles,
  Zap,
  Crop,
  Play,
  Pause,
  Music,
} from 'lucide-react';
import {
  AUSTIN_HOUSE_ASSETS,
  PlaylistClip,
  ProjectorOutput,
  useProjectionStore,
  VectorLayer,
  VectorVertex,
} from '../store/useProjectionStore';
import {
  computeFinalAlignmentMatrix,
  computeProjectorCornerPinMatrix3d,
  computeSCurveBlendAlpha,
  Matrix3x3,
} from '../utils/projectionMath';
import { ProjectorTestPatternRenderer } from './ProjectorTestPatternRenderer';

export const PROJECTOR_SYNC_CHANNEL = 'lumen-map-projector-sync';

interface ProjectorSyncMessage {
  type: 'STATE_UPDATE' | 'REQUEST_STATE' | 'COMMAND' | 'WARP_UPDATE';
  senderId?: string;
  state?: Partial<ReturnType<typeof useProjectionStore.getState>>;
  command?: string;
  payload?: any;
}

/**
 * Hook used by App.tsx in the primary studio window to broadcast all Zustand state changes
 * in real time to any detached projector display window via BroadcastChannel.
 */
export function useProjectorSyncBroadcaster() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let channel: BroadcastChannel | null = null;
    const clientId = `studio-broadcaster-${Math.random().toString(36).substring(2, 9)}`;

    try {
      channel = new BroadcastChannel(PROJECTOR_SYNC_CHANNEL);
    } catch (e) {
      console.warn('BroadcastChannel not supported in this environment', e);
    }

    // Subscribe to Zustand state modifications and broadcast to secondary projector windows
    const unsubscribe = useProjectionStore.subscribe((state) => {
      if (!channel) return;
      try {
        const payload: ProjectorSyncMessage = {
          type: 'STATE_UPDATE',
          senderId: clientId,
          state: {
            masterBlackout: state.masterBlackout,
            projectorTestPattern: state.projectorTestPattern,
            testPatternType: state.testPatternType,
            purityColor: state.purityColor,
            playlistClips: state.playlistClips,
            selectedClipId: state.selectedClipId,
            globalKeyReference: state.globalKeyReference,
            applyBlackoutMasks: state.applyBlackoutMasks,
            projectWireframeGrid: state.projectWireframeGrid,
            showCrosshairs: state.showCrosshairs,
            layers: state.layers,
            projectors: state.projectors,
            selectedProjectorId: state.selectedProjectorId,
            enableSoftEdgeBlending: state.enableSoftEdgeBlending,
            blendCurve: state.blendCurve,
            blendGamma: state.blendGamma,
            featherInsetPx: state.featherInsetPx,
            blackLevelUplift: state.blackLevelUplift,
            sendCalibrationGridToAll: state.sendCalibrationGridToAll,
            calibrationOverlayMode: state.calibrationOverlayMode,
            identifyingProjectorId: state.identifyingProjectorId,
            activeManualCue: state.activeManualCue,
            projectorLumens: state.projectorLumens,
            liveTraceOnHouse: state.liveTraceOnHouse,
            baseHouseGhosting: state.baseHouseGhosting,
            isShowActive: state.isShowActive,
            masterVolume: state.masterVolume,
            videoSoundVolume: state.videoSoundVolume,
            videoSoundMuted: state.videoSoundMuted,
            musicOverlayVolume: state.musicOverlayVolume,
            musicOverlayMuted: state.musicOverlayMuted,
            musicOverlayPlaying: state.musicOverlayPlaying,
            musicOverlayTrackUrl: state.musicOverlayTrackUrl,
            arrayTopology: state.arrayTopology,
            warpMode: state.warpMode,
            audioDelayMs: state.audioDelayMs,
            audioDelayTestActive: state.audioDelayTestActive,
            audioDelayTestFlash: state.audioDelayTestFlash,
          },
        };
        channel.postMessage(payload);
      } catch (err) {
        console.error('Failed to broadcast projector state:', err);
      }
    });

    // Listen for requests from newly opened projector windows seeking the latest state
    if (channel) {
      channel.onmessage = (event: MessageEvent<ProjectorSyncMessage>) => {
        if (event.data?.type === 'REQUEST_STATE') {
          const currentState = useProjectionStore.getState();
          channel?.postMessage({
            type: 'STATE_UPDATE',
            senderId: clientId,
            state: currentState,
          });
        }
      };
    }

    return () => {
      unsubscribe();
      channel?.close();
    };
  }, []);
}

export interface ProjectorOutputViewProps {
  isPopout?: boolean;
  onClose?: () => void;
}

export const ProjectorOutputView: React.FC<ProjectorOutputViewProps> = ({
  isPopout = false,
  onClose,
}) => {
  const {
    masterBlackout,
    projectorTestPattern,
    testPatternType,
    purityColor,
    playlistClips,
    selectedClipId,
    globalKeyReference,
    applyBlackoutMasks,
    projectWireframeGrid,
    showCrosshairs,
    layers,
    projectors,
    selectedProjectorId,
    enableSoftEdgeBlending,
    blendCurve,
    blendGamma,
    featherInsetPx,
    blackLevelUplift,
    sendCalibrationGridToAll,
    identifyingProjectorId,
    activeManualCue,
    projectorLumens,
    liveTraceOnHouse,
    baseHouseGhosting,
    masterVolume,
    videoSoundVolume,
    videoSoundMuted,
    musicOverlayVolume,
    musicOverlayMuted,
    musicOverlayPlaying,
    musicOverlayTrackUrl,
    warpMode,
    setAudioMixerParams,
    toggleMasterBlackout,
    setProjectorTestPattern,
    setTestPatternType,
    setPurityColor,
    setSelectedProjectorId,
    setLiveShowParams,
    globalSettings,
    audioDelayMs,
    audioDelayTestActive,
    audioDelayTestFlash,
  } = useProjectionStore();

  // Local state for targeted projector slice ('all' = full canvas, or 'proj-1' through 'proj-4')
  const [targetProjectorId, setTargetProjectorId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const paramProj = new URLSearchParams(window.location.search).get('proj');
      if (paramProj) return paramProj;
    }
    return selectedProjectorId || 'proj-1';
  });

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hudVisible, setHudVisible] = useState<boolean>(true);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(true);
  const [frustumSliceClip, setFrustumSliceClip] = useState<boolean>(false);
  const [showSafeAreaGuides, setShowSafeAreaGuides] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const virtualScreenMeta = useMemo(() => {
    const params =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : null;
    const urlVirtual = params?.get('virtual') === 'true';
    const urlRes = params?.get('res');
    const isVirtual = urlVirtual || Boolean(globalSettings?.virtualScreenEnabled);
    const resolution =
      urlRes || globalSettings?.virtualScreenResolution || '1920x1080';
    const [wRaw, hRaw] = resolution.split('x').map(Number);
    const w = wRaw || 1920;
    const h = hRaw || 1080;
    return {
      isVirtual,
      resolution,
      aspectRatio: `${w} / ${h}`,
      isPortrait: h > w,
    };
  }, [globalSettings?.virtualScreenEnabled, globalSettings?.virtualScreenResolution]);
  const hudTimeoutRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasBoxRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const musicAudioRef = useRef<HTMLAudioElement>(null);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({
    width: 1280,
    height: 720,
  });

  useEffect(() => {
    const el = canvasBoxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Synced 4-Corner Pin and 3x3 Bezier Mesh Warp state
  const [syncedWarp, setSyncedWarp] = useState<{
    warpMode?: 'simple' | 'corner-pin' | 'bezier-mesh';
    cornerPinOffsets?: any;
    meshNodeOffsets?: any;
    videoWarpTransform?: string;
  }>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lumen-map-warp-offsets');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse saved warp offsets in ProjectorOutputView', e);
      }
    }
    return {};
  });

  // Sync listener: listen to BroadcastChannel and window storage events for real-time synchronization
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    const clientId = `projector-window-${Math.random().toString(36).substring(2, 9)}`;

    try {
      channel = new BroadcastChannel(PROJECTOR_SYNC_CHANNEL);
      channel.onmessage = (event: MessageEvent<ProjectorSyncMessage>) => {
        if (event.data?.type === 'STATE_UPDATE' && event.data.state) {
          useProjectionStore.setState(event.data.state);
          setLastSyncTime(new Date().toLocaleTimeString());
        } else if (
          (event.data as any)?.type === 'WARP_UPDATE' &&
          (event.data as any).payload
        ) {
          setSyncedWarp((event.data as any).payload);
          setLastSyncTime(new Date().toLocaleTimeString());
        }
      };
      // Request latest state from the studio
      channel.postMessage({ type: 'REQUEST_STATE', senderId: clientId });
    } catch (e) {
      console.warn('BroadcastChannel initialization failed:', e);
    }

    // Storage event fallback for cross-tab sync
    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === 'marshall-projection-studio-v3.5-austin-assets' &&
        e.newValue
      ) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed?.state) {
            useProjectionStore.setState(parsed.state);
          }
        } catch (err) {
          console.error('Storage sync parse error:', err);
        }
      } else if (e.key === 'lumen-map-warp-offsets' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setSyncedWarp(parsed);
        } catch (err) {
          console.warn('Warp storage sync error in ProjectorOutputView:', err);
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      channel?.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Synchronize HTML5 video element with videoSoundVolume, masterVolume, and mute states
  useEffect(() => {
    if (videoRef.current) {
      const vol = Math.max(
        0,
        Math.min(1, (videoSoundVolume / 100) * (masterVolume / 100))
      );
      videoRef.current.volume = vol;
      videoRef.current.muted =
        masterBlackout || videoSoundMuted || isAudioMuted;
    }
  }, [
    videoSoundVolume,
    masterVolume,
    masterBlackout,
    videoSoundMuted,
    isAudioMuted,
    selectedClipId,
  ]);

  // Apply Audio Delay (-1000ms early to +3000ms late) between video & music overlay track
  useEffect(() => {
    const syncDelay = () => {
      const vid = videoRef.current;
      const aud = musicAudioRef.current;
      if (!vid || !aud || !musicOverlayPlaying) return;
      const targetAudioTime = Math.max(0, vid.currentTime - audioDelayMs / 1000);
      if (Math.abs(aud.currentTime - targetAudioTime) > 0.06) {
        try {
          aud.currentTime = targetAudioTime;
        } catch {
          // Ignore seek errors while media metadata is loading
        }
      }
    };
    syncDelay();
    const timer = window.setInterval(syncDelay, 250);
    return () => window.clearInterval(timer);
  }, [audioDelayMs, musicOverlayPlaying, selectedClipId]);

  // Synchronize HTML5 audio element with musicOverlayVolume, masterVolume, mute states, and play/pause
  useEffect(() => {
    if (musicAudioRef.current) {
      const vol = Math.max(
        0,
        Math.min(1, (musicOverlayVolume / 100) * (masterVolume / 100))
      );
      musicAudioRef.current.volume = vol;
      musicAudioRef.current.muted =
        masterBlackout || musicOverlayMuted || isAudioMuted;

      if (musicOverlayPlaying && !masterBlackout) {
        musicAudioRef.current.play().catch(() => {});
      } else {
        musicAudioRef.current.pause();
      }
    }
  }, [
    musicOverlayVolume,
    masterVolume,
    masterBlackout,
    musicOverlayMuted,
    isAudioMuted,
    musicOverlayPlaying,
    musicOverlayTrackUrl,
  ]);

  // HUD Auto-hiding timer (2.5 seconds of mouse/keyboard inactivity)
  const wakeHud = useCallback(() => {
    setHudVisible(true);
    if (hudTimeoutRef.current) {
      window.clearTimeout(hudTimeoutRef.current);
    }
    hudTimeoutRef.current = window.setTimeout(() => {
      setHudVisible(false);
    }, 2500);
  }, []);

  useEffect(() => {
    const handleActivity = () => wakeHud();
    window.addEventListener('pointermove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    wakeHud();

    return () => {
      window.removeEventListener('pointermove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      if (hudTimeoutRef.current) {
        window.clearTimeout(hudTimeoutRef.current);
      }
    };
  }, [wakeHud]);

  // Fullscreen state listener and keyboard shortcuts (ESC = blackout toggle, F11 / F = fullscreen)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        toggleMasterBlackout();
      } else if (e.key === 'f' || e.key === 'F') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          toggleFullscreen();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleMasterBlackout]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current) {
          await containerRef.current.requestFullscreen();
        } else {
          await document.documentElement.requestFullscreen();
        }
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
  };

  // Auto-fullscreen trigger for targeted multi-display takeover
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isAuto = new URLSearchParams(window.location.search).get('fullscreen') === 'auto';
    if (!isAuto) return;

    const timer = setTimeout(async () => {
      try {
        if (!document.fullscreenElement) {
          if (containerRef.current) {
            await containerRef.current.requestFullscreen();
          } else {
            await document.documentElement.requestFullscreen();
          }
        }
      } catch (err) {
        console.log('Browser requires user click inside window to enter fullscreen:', err);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (isPopout) {
      window.close();
    }
  };

  // Resolve active playlist clip
  const selectedClip: PlaylistClip = useMemo(() => {
    return (
      playlistClips.find((c) => c.id === selectedClipId) || playlistClips[0]
    );
  }, [playlistClips, selectedClipId]);

  // Compute 3x3 Dual-Layer Alignment Transformation Matrix: T_final = M_blackout * (T_global * T_clip_delta)
  const finalMatrix: Matrix3x3 = useMemo(() => {
    const isSynced =
      selectedClip.alignmentMode === 'GLOBAL SYNCED' ||
      selectedClip.bypassOffset;
    return computeFinalAlignmentMatrix(
      globalKeyReference,
      selectedClip.deltaOffset,
      isSynced
    );
  }, [globalKeyReference, selectedClip]);

  // Currently targeted projector output object (if not 'all')
  const targetedProjector: ProjectorOutput | undefined = useMemo(() => {
    if (targetProjectorId === 'all') return undefined;
    return (
      projectors.find((p) => p.id === targetProjectorId) || projectors[0]
    );
  }, [projectors, targetProjectorId]);

  // Compute Frustum Slice Viewport Cropping bounds when operator toggles FRUSTUM SLICE CLIP
  const frustumClipBounds = useMemo(() => {
    if (!frustumSliceClip || !targetedProjector) return null;
    const { x, y, width, height } = targetedProjector.frustumRect;
    // Normalized to 980x500 multi-projector array layout space from Screen 8
    const left = Math.max(0, Math.min(100, (x / 980) * 100));
    const top = Math.max(0, Math.min(100, (y / 500) * 100));
    const right = Math.max(0, Math.min(100, 100 - ((x + width) / 980) * 100));
    const bottom = Math.max(0, Math.min(100, 100 - ((y + height) / 500) * 100));
    return {
      left,
      top,
      right,
      bottom,
      clipPath: `inset(${top.toFixed(2)}% ${right.toFixed(2)}% ${bottom.toFixed(2)}% ${left.toFixed(2)}%)`,
    };
  }, [frustumSliceClip, targetedProjector]);

  // Compute RGB Gain FeColorMatrix filter values for hardware color balancing
  const targetedRgbGainMatrix = useMemo(() => {
    if (!targetedProjector) return '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0';
    const r = ((targetedProjector.rgbGain?.r ?? 100) / 100).toFixed(3);
    const g = ((targetedProjector.rgbGain?.g ?? 100) / 100).toFixed(3);
    const b = ((targetedProjector.rgbGain?.b ?? 100) / 100).toFixed(3);
    return `${r} 0 0 0 0  0 ${g} 0 0 0  0 0 ${b} 0 0  0 0 0 1 0`;
  }, [targetedProjector]);

  // Compute brightness multiplier based on projector lumens and individual projector lumen match
  const effectiveBrightnessMultiplier = useMemo(() => {
    if (masterBlackout) return 0;
    const base = projectorLumens / 100;
    if (targetedProjector) {
      return base * (targetedProjector.lumenMatchPercent / 100);
    }
    return base;
  }, [masterBlackout, projectorLumens, targetedProjector]);

  // CSS transform string derived from 3x3 affine matrix
  // CSS matrix format: matrix(a, b, c, d, tx, ty)
  const matrixCssTransform = useMemo(() => {
    const a = finalMatrix[0][0];
    const b = finalMatrix[1][0];
    const c = finalMatrix[0][1];
    const d = finalMatrix[1][1];
    const tx = finalMatrix[0][2];
    const ty = finalMatrix[1][2];
    return `matrix(${a.toFixed(6)}, ${b.toFixed(6)}, ${c.toFixed(6)}, ${d.toFixed(6)}, ${tx.toFixed(2)}, ${ty.toFixed(2)})`;
  }, [finalMatrix]);

  // Derived effective video transform: uses 4-Corner Pin or Bezier Mesh 3D warp when active,
  // falling back cleanly to dual-layer affine matrixCssTransform in simple mode
  const effectiveWarpMode = syncedWarp.warpMode || warpMode;
  const effectiveVideoTransform = useMemo(() => {
    if (
      (effectiveWarpMode === 'corner-pin' ||
        effectiveWarpMode === 'bezier-mesh') &&
      syncedWarp.videoWarpTransform
    ) {
      return syncedWarp.videoWarpTransform;
    }
    return matrixCssTransform;
  }, [effectiveWarpMode, syncedWarp.videoWarpTransform, matrixCssTransform]);

  // Per-projector 4-Corner Pin projective homography warp (from Screen 8 Projector Alignment)
  const projectorCornerPinTransform = useMemo(() => {
    if (!targetedProjector) return '';
    return computeProjectorCornerPinMatrix3d(
      targetedProjector.frustumRect,
      targetedProjector.cornerPins,
      canvasSize.width,
      canvasSize.height
    );
  }, [targetedProjector, canvasSize.width, canvasSize.height]);

  // Orientation mount flip CSS (0° Standard, 180° Inverted, 90° Portrait)
  const mountFlipTransform = useMemo(() => {
    if (!targetedProjector) return '';
    switch (targetedProjector.mountFlip) {
      case '180° Inverted':
        return 'rotate(180deg)';
      case '90° Portrait':
        return 'rotate(90deg)';
      default:
        return '';
    }
  }, [targetedProjector]);

  // Filter visible vector layers for Hard Blackout Cutouts & Structural Guide Lines
  const anySoloLayer = useMemo(() => layers.some((l) => l.solo), [layers]);

  const blackoutLayers = useMemo(() => {
    if (!applyBlackoutMasks) return [];
    return layers.filter((layer) => {
      if (!layer.visible) return false;
      if (anySoloLayer && !layer.solo) return false;
      return layer.role === 'Hard Blackout Cutout';
    });
  }, [layers, applyBlackoutMasks, anySoloLayer]);

  const guideLineLayers = useMemo(() => {
    return layers.filter((layer) => {
      if (!layer.visible) return false;
      if (anySoloLayer && !layer.solo) return false;
      return (
        layer.role === 'Structural Guide Line' ||
        (liveTraceOnHouse && layer.role === 'Active Projection Surface')
      );
    });
  }, [layers, liveTraceOnHouse, anySoloLayer]);

  // Check if currently identifying this projector
  const isCurrentlyIdentifying = useMemo(() => {
    if (!identifyingProjectorId) return false;
    if (targetProjectorId === 'all') return true;
    return identifyingProjectorId === targetProjectorId;
  }, [identifyingProjectorId, targetProjectorId]);

  // Precompute S-Curve Blend Gradient stops for seamless multi-projector overlapping edges
  const sCurveBlendStops = useMemo(() => {
    const stopsLeft: { offset: string; opacity: number }[] = [];
    const stopsRight: { offset: string; opacity: number }[] = [];
    const count = 16;
    for (let i = 0; i <= count; i++) {
      const d = i / count;
      const alphaLeft = enableSoftEdgeBlending
        ? computeSCurveBlendAlpha(1 - d, blendGamma)
        : d < 0.5
        ? 1
        : 0;
      const alphaRight = enableSoftEdgeBlending
        ? computeSCurveBlendAlpha(d, blendGamma)
        : d >= 0.5
        ? 1
        : 0;
      stopsLeft.push({
        offset: `${(d * 100).toFixed(1)}%`,
        opacity: Number(alphaLeft.toFixed(4)),
      });
      stopsRight.push({
        offset: `${(d * 100).toFixed(1)}%`,
        opacity: Number(alphaRight.toFixed(4)),
      });
    }
    return { stopsLeft, stopsRight };
  }, [blendGamma, enableSoftEdgeBlending]);

  // Black-level uplift baseline value in RGB (0-255)
  const upliftRgb = useMemo(() => {
    return Math.round((blackLevelUplift / 100) * 255);
  }, [blackLevelUplift]);

  // Helper to render polygons from layer vertices
  const renderLayerPolygons = (
    layer: VectorLayer,
    fillColor: string,
    strokeColor?: string,
    strokeWidth = 2
  ) => {
    // If window layer contains multiple 4-vertex window rectangles
    if (
      layer.category === 'Windows' &&
      layer.vertices.length >= 8 &&
      layer.vertices.length % 4 === 0
    ) {
      const quads: VectorVertex[][] = [];
      for (let i = 0; i < layer.vertices.length; i += 4) {
        quads.push(layer.vertices.slice(i, i + 4));
      }
      return (
        <g key={layer.id}>
          {quads.map((quad, idx) => (
            <polygon
              key={idx}
              points={quad.map((p) => `${p.x},${p.y}`).join(' ')}
              fill={fillColor}
              stroke={strokeColor || 'none'}
              strokeWidth={strokeWidth}
            />
          ))}
        </g>
      );
    }

    return (
      <polygon
        key={layer.id}
        points={layer.vertices.map((p) => `${p.x},${p.y}`).join(' ')}
        fill={fillColor}
        stroke={strokeColor || 'none'}
        strokeWidth={strokeWidth}
      />
    );
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-screen h-screen bg-[#000000] text-slate-100 overflow-hidden select-none z-[99999] flex items-center justify-center"
      style={{
        cursor: hudVisible ? 'default' : 'none',
      }}
    >
      {/* Hidden SVG Filter Defs for Hardware RGB Gain Color Balance */}
      <svg
        className="absolute w-0 h-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <defs>
          <filter id="targetedProjectorRgbGainFilter">
            <feColorMatrix type="matrix" values={targetedRgbGainMatrix} />
          </filter>
        </defs>
      </svg>

      {/* =========================================================================
          HARDWARE / VIRTUAL PROJECTOR CANVAS (PURE #000000 LETTERBOXED BASE)
          ========================================================================= */}
      <div
        ref={canvasBoxRef}
        className={`relative bg-[#000000] overflow-hidden flex items-center justify-center ${
          virtualScreenMeta.isVirtual
            ? 'border border-cyan-500/40 shadow-[0_0_40px_rgba(6,182,212,0.18)]'
            : ''
        } ${
          virtualScreenMeta.isPortrait
            ? 'h-full max-w-full'
            : 'w-full h-full max-w-[177.78vh] max-h-[56.25vw]'
        }`}
        style={{
          aspectRatio: virtualScreenMeta.isVirtual
            ? virtualScreenMeta.aspectRatio
            : '16 / 9',
          transform: mountFlipTransform || undefined,
          filter: `brightness(${effectiveBrightnessMultiplier}) url(#targetedProjectorRgbGainFilter)`,
          clipPath: frustumClipBounds ? frustumClipBounds.clipPath : undefined,
        }}
      >
        {/* Multi-Projector Geometry Alignment Warp Layer */}
        <div
          className="relative w-full h-full flex items-center justify-center overflow-hidden"
          style={{
            transform: projectorCornerPinTransform || undefined,
            transformOrigin: '0 0',
          }}
        >
        {/* =========================================================================
            LAYER 0: BLACK-LEVEL UPLIFT COMPENSATION
            Compensates for dual-projector overlap black floor discrepancy
            ========================================================================= */}
        {blackLevelUplift > 0 && !masterBlackout && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundColor: `rgb(${upliftRgb}, ${upliftRgb}, ${upliftRgb})`,
            }}
          />
        )}

        {/* =========================================================================
            LAYER 1: REAL HARDWARE VIDEO PLAYBACK LAYER
            Transformed by computeFinalAlignmentMatrix (Dual-Layer: Global * Clip Delta)
            or synced 4-Corner Pin / Bezier Mesh 3D warp (Screen 6 Sync)
            ========================================================================= */}
        {!masterBlackout && selectedClip?.videoUrl && (
          <div
            className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none overflow-hidden"
            style={{
              transform: effectiveVideoTransform,
              transformOrigin: '50% 50%',
            }}
          >
            <video
              ref={videoRef}
              key={selectedClip.id}
              src={selectedClip.videoUrl}
              poster={selectedClip.thumbnailUrl}
              autoPlay
              loop
              muted={masterBlackout || videoSoundMuted || isAudioMuted}
              playsInline
              onLoadedMetadata={(e) => {
                e.currentTarget.volume = Math.max(
                  0,
                  Math.min(1, (videoSoundVolume / 100) * (masterVolume / 100))
                );
                e.currentTarget.muted =
                  masterBlackout || videoSoundMuted || isAudioMuted;
              }}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Dual-Channel Music Overlay Audio Element */}
        <audio
          ref={musicAudioRef}
          src={musicOverlayTrackUrl}
          loop
          preload="metadata"
          className="hidden"
          onLoadedMetadata={(e) => {
            e.currentTarget.volume = Math.max(
              0,
              Math.min(1, (musicOverlayVolume / 100) * (masterVolume / 100))
            );
            e.currentTarget.muted =
              masterBlackout || musicOverlayMuted || isAudioMuted;
          }}
        />

        {/* =========================================================================
            LAYER 2: BASE HOUSE WIREFRAME GHOSTING (IF ENABLED IN STUDIO)
            ========================================================================= */}
        {!masterBlackout && baseHouseGhosting > 0 && (
          <img
            src={AUSTIN_HOUSE_ASSETS.wireframeLayout}
            alt="Base House Alignment Wireframe"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none mix-blend-screen"
            style={{ opacity: baseHouseGhosting / 100 }}
          />
        )}

        {/* =========================================================================
            LAYER 3: HARD BLACKOUT CUTOUT MASKS & VECTOR GUIDE LINES (SVG CANVAS)
            Uses the 1080x600 ranch house vector coordinate space traced to facade
            ========================================================================= */}
        {!masterBlackout && (
          <svg
            viewBox="0 0 1080 600"
            className="absolute inset-0 w-full h-full pointer-events-none"
            preserveAspectRatio="none"
          >
            <defs>
              {/* Dynamic Feathering Gaussian Blur Filters for Soft Mask Boundaries */}
              {blackoutLayers.map((layer) => (
                <filter
                  key={`blur-${layer.id}`}
                  id={`blur-${layer.id}`}
                  x="-20%"
                  y="-20%"
                  width="140%"
                  height="140%"
                >
                  <feGaussianBlur
                    stdDeviation={Math.max(1, layer.edgeFeathering / 2)}
                  />
                </filter>
              ))}

              {/* Wireframe Glow Filter for Guide Lines */}
              <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* FRONT SHAPE COLOR & BLEND MODIFIERS (Tints, Pulses, Blackouts) */}
            {layers
              .filter(
                (l: VectorLayer) =>
                  l.visible &&
                  l.role === 'Active Projection Surface' &&
                  l.colorModifier
              )
              .map((layer: VectorLayer) => {
                const mod = layer.colorModifier;
                const blendMode = mod?.blendMode || 'screen';
                const fillColor = mod?.tintColor || layer.color;
                const opacity = mod?.opacity ?? 0.65;
                return (
                  <g
                    key={`front-modifier-${layer.id}`}
                    style={{ mixBlendMode: blendMode as any }}
                    opacity={opacity}
                  >
                    {renderLayerPolygons(
                      layer,
                      fillColor,
                      fillColor,
                      Math.max(1, layer.outlineGlowWidth || 1)
                    )}
                  </g>
                );
              })}

            {/* HARD BLACKOUT CUTOUT MASKS (Pure #000000 polygons over windows & sky) */}
            {blackoutLayers.map((layer) => (
              <g
                key={`blackout-${layer.id}`}
                filter={
                  layer.edgeFeathering > 0
                    ? `url(#blur-${layer.id})`
                    : undefined
                }
              >
                {renderLayerPolygons(layer, '#000000')}
              </g>
            ))}

            {/* STRUCTURAL GUIDE LINES & LIVE TRACE (Roofline, Pillars, Walls) */}
            {(liveTraceOnHouse || projectWireframeGrid) &&
              guideLineLayers.map((layer) => (
                <g key={`guideline-${layer.id}`} filter="url(#neonGlow)">
                  {renderLayerPolygons(
                    layer,
                    'none',
                    layer.color || '#00f0ff',
                    Math.max(2, layer.outlineGlowWidth || 2)
                  )}
                </g>
              ))}

            {/* LASER SKY BEAMS (WHEN PROJECT WIREFRAME GRID IS ACTIVE) */}
            {projectWireframeGrid && (
              <g opacity="0.85">
                <line
                  x1="270"
                  y1="196"
                  x2="180"
                  y2="0"
                  stroke="#22c55e"
                  strokeWidth="2.5"
                  strokeDasharray="8 4"
                />
                <line
                  x1="455"
                  y1="210"
                  x2="420"
                  y2="0"
                  stroke="#00f0ff"
                  strokeWidth="2.5"
                />
                <line
                  x1="530"
                  y1="258"
                  x2="540"
                  y2="0"
                  stroke="#eab308"
                  strokeWidth="2.5"
                />
                <line
                  x1="752"
                  y1="244"
                  x2="800"
                  y2="0"
                  stroke="#d946ef"
                  strokeWidth="2.5"
                />
                <line
                  x1="948"
                  y1="196"
                  x2="1040"
                  y2="0"
                  stroke="#00f0ff"
                  strokeWidth="2.5"
                  strokeDasharray="8 4"
                />
              </g>
            )}
          </svg>
        )}

        {/* =========================================================================
            LAYER 4: TRUE S-CURVE SVG GRADIENT LUT EDGE BLENDING
            Uses exact mathematical S-Curve alpha(d) LUT stops from sCurveBlendStops
            ========================================================================= */}
        {enableSoftEdgeBlending && !masterBlackout && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden"
            style={{ mixBlendMode: 'multiply' }}
            preserveAspectRatio="none"
          >
            <defs>
              {/* Left Edge S-Curve LinearGradient built from sCurveBlendStops.stopsRight */}
              <linearGradient
                id="sCurveLutGradientLeft"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                {sCurveBlendStops.stopsRight.map((stop, idx) => (
                  <stop
                    key={`stop-l-${idx}`}
                    offset={stop.offset}
                    stopColor="#000000"
                    stopOpacity={Number((1 - stop.opacity).toFixed(4))}
                  />
                ))}
              </linearGradient>

              {/* Right Edge S-Curve LinearGradient built from sCurveBlendStops.stopsLeft */}
              <linearGradient
                id="sCurveLutGradientRight"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                {sCurveBlendStops.stopsLeft.map((stop, idx) => (
                  <stop
                    key={`stop-r-${idx}`}
                    offset={stop.offset}
                    stopColor="#000000"
                    stopOpacity={Number((1 - stop.opacity).toFixed(4))}
                  />
                ))}
              </linearGradient>
            </defs>

            {/* If viewing Projector 1 (Left projector), apply blend on RIGHT edge */}
            {(targetProjectorId === 'proj-1' || targetProjectorId === 'all') && (
              <rect
                x={
                  targetProjectorId === 'all'
                    ? `calc(50% - ${featherInsetPx * 0.75}px)`
                    : `calc(100% - ${featherInsetPx * 1.5}px)`
                }
                y="0"
                width={`${featherInsetPx * 1.5}px`}
                height="100%"
                fill="url(#sCurveLutGradientRight)"
              />
            )}

            {/* If viewing Projector 2 (Right projector), apply blend on LEFT edge */}
            {(targetProjectorId === 'proj-2' || targetProjectorId === 'all') && (
              <rect
                x={
                  targetProjectorId === 'all'
                    ? `calc(50% - ${featherInsetPx * 0.75}px)`
                    : '0'
                }
                y="0"
                width={`${featherInsetPx * 1.5}px`}
                height="100%"
                fill="url(#sCurveLutGradientLeft)"
              />
            )}
          </svg>
        )}

        {/* =========================================================================
            LAYER 5: HIGH-PRECISION SMPTE & MULTI-PATTERN CALIBRATION SUITE
            Shown when projectorTestPattern or sendCalibrationGridToAll is active
            ========================================================================= */}
        {(projectorTestPattern || sendCalibrationGridToAll) && !masterBlackout && (
          <div className="absolute inset-0 w-full h-full bg-[#030712] z-20 flex flex-col items-center justify-center pointer-events-none select-none">
            <ProjectorTestPatternRenderer
              patternType={testPatternType}
              purityColor={purityColor}
              viewBox="0 0 1920 1080"
              className="w-full h-full object-contain"
            />
          </div>
        )}

        {/* =========================================================================
            LAYER 6: PRECISION CROSSHAIRS OVERLAY
            ========================================================================= */}
        {showCrosshairs && !masterBlackout && (
          <div className="absolute inset-0 pointer-events-none z-10">
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-red-500/80 shadow-[0_0_8px_#ef4444]" />
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-red-500/80 shadow-[0_0_8px_#ef4444]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-red-500 shadow-[0_0_10px_#ef4444] flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
            </div>
          </div>
        )}

        {/* =========================================================================
            LAYER 7: LIVE SHOWTIME MANUAL OVERLAY CUES (LIGHTNING, LASERS, PARTICLES)
            Driven by activeManualCue in Screen 7 Live Showtime
            ========================================================================= */}
        {activeManualCue && !masterBlackout && (
          <div className="absolute inset-0 pointer-events-none z-30 transition-all duration-300">
            {activeManualCue === 'THUNDER & FLASH' && (
              <div className="absolute inset-0 bg-white/90 animate-ping" />
            )}
            {activeManualCue === 'GHOST SCREAM' && (
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/40 via-purple-600/30 to-emerald-500/40 mix-blend-screen animate-pulse" />
            )}
            {activeManualCue === 'STRIKE LASER' && (
              <div className="absolute inset-0 bg-red-500/30 mix-blend-color-dodge flex flex-col justify-around">
                <div className="h-1 bg-red-400 shadow-[0_0_20px_#ef4444] animate-pulse" />
                <div className="h-1 bg-red-400 shadow-[0_0_20px_#ef4444] animate-pulse" />
              </div>
            )}
            {activeManualCue === 'SNOW STORM' && (
              <div className="absolute inset-0 bg-cyan-100/20 mix-blend-screen backdrop-brightness-125" />
            )}
            {activeManualCue === 'FIREWORKS' && (
              <div className="absolute inset-0 bg-amber-400/25 mix-blend-screen animate-pulse" />
            )}
            {activeManualCue === 'MERRY CHRISTMAS' && (
              <div className="absolute inset-0 bg-gradient-to-r from-red-600/25 via-emerald-600/25 to-red-600/25 mix-blend-screen" />
            )}
          </div>
        )}

        {/* =========================================================================
            LAYER 8: PROJECTOR IDENTIFICATION FLASHING RETICLE
            Triggered by flashIdentifyProjector (Screen 8)
            ========================================================================= */}
        {isCurrentlyIdentifying && (
          <div className="absolute inset-0 z-40 border-8 border-amber-400 bg-amber-500/20 flex flex-col items-center justify-center pointer-events-none animate-pulse">
            <div className="bg-[#0c121e]/95 border-2 border-amber-400 px-8 py-5 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.8)] text-center">
              <Zap className="w-12 h-12 text-amber-400 mx-auto animate-bounce mb-2" />
              <div className="text-3xl font-extrabold text-white tracking-widest font-mono">
                {targetedProjector
                  ? targetedProjector.name.toUpperCase()
                  : 'ALL PROJECTORS ACTIVE'}
              </div>
              <div className="text-amber-300 font-mono text-sm mt-1">
                PHYSICAL PORT:{' '}
                {targetedProjector ? targetedProjector.port : 'COMBINED ARRAY'}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            LAYER 9: EMERGENCY MASTER BLACKOUT FULL CUTOUT (0 IRE / 0% LUMENS)
            ========================================================================= */}
        {masterBlackout && (
          <div className="absolute inset-0 z-50 bg-[#000000] flex flex-col items-center justify-center select-none">
            <div className="flex items-center gap-3 px-6 py-3 rounded-xl bg-red-950/60 border border-red-600/80 shadow-[0_0_30px_rgba(239,68,68,0.4)]">
              <div className="w-3.5 h-3.5 rounded-full bg-red-500 animate-ping" />
              <span className="text-sm font-mono font-bold text-red-300 tracking-wider">
                MASTER BLACKOUT ENGAGED — PHYSICAL LUMENS ZEROED [ESC]
              </span>
            </div>
            <p className="text-xs font-mono text-slate-500 mt-3">
              Press [ESC] on keyboard or click button to disengage
            </p>
          </div>
        )}
        {/* Audio Delay Sync Calibration Test Screen (Black with 0.2s White Flash) */}
        {audioDelayTestActive && (
          <div
            className="absolute inset-0 z-[95] transition-none pointer-events-none"
            style={{
              backgroundColor: audioDelayTestFlash ? '#ffffff' : '#000000',
            }}
          />
        )}
        </div>
      </div>

      {/* =========================================================================
          FLOATING AUTO-HIDING TOP-RIGHT HUD CONTROLS
          Auto-hides after 2.5 seconds of mouse/keyboard inactivity
          ========================================================================= */}
      <aside
        aria-label="Projector Output Controls HUD"
        className={`fixed top-4 right-4 z-[100000] bg-[#0d1424]/90 backdrop-blur-md border border-cyan-500/30 rounded-xl p-3 shadow-2xl transition-all duration-300 ${
          hudVisible
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-700/60">
          <div className="flex items-center gap-1.5 min-w-0">
            <Tv className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
              Projector Engine Output
            </span>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            {/* Audio Mute/Unmute */}
            <button
              type="button"
              onClick={() => {
                const nextMuted = !isAudioMuted;
                setIsAudioMuted(nextMuted);
                if (!nextMuted) {
                  if (videoRef.current) {
                    videoRef.current.muted =
                      masterBlackout || videoSoundMuted;
                    videoRef.current.play().catch(() => {});
                  }
                  if (
                    musicAudioRef.current &&
                    musicOverlayPlaying &&
                    !masterBlackout
                  ) {
                    musicAudioRef.current.muted =
                      masterBlackout || musicOverlayMuted;
                    musicAudioRef.current.play().catch(() => {});
                  }
                }
              }}
              className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title={isAudioMuted ? 'Unmute Master Audio' : 'Mute Master Audio'}
            >
              {isAudioMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              )}
            </button>

            {/* Close Output */}
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-md bg-slate-800 hover:bg-red-600/80 text-slate-300 hover:text-white transition-colors"
              title="Close Output View"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Target Projector Selector Buttons */}
        <div className="mb-2.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Display Slice Target:
          </label>
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => {
                setTargetProjectorId('all');
                setSelectedProjectorId('proj-1');
              }}
              className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                targetProjectorId === 'all'
                  ? 'bg-cyan-500 text-black shadow-[0_0_8px_#06b6d4]'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              ALL (MASTER)
            </button>
            {projectors.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setTargetProjectorId(p.id);
                  setSelectedProjectorId(p.id);
                }}
                className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                  targetProjectorId === p.id
                    ? 'bg-blue-600 text-white shadow-[0_0_8px_#2563eb]'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                PROJ #{idx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Dual-Channel Live Audio HUD Mixers */}
        <div className="mb-2.5 p-2 rounded-lg bg-slate-900/90 border border-slate-700/60 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1">
              <Volume2 className="w-3 h-3 text-cyan-400" />
              LIVE AUDIO MIXER
            </span>
            <button
              type="button"
              onClick={() => {
                const nextPlaying = !musicOverlayPlaying;
                setAudioMixerParams({
                  musicOverlayPlaying: nextPlaying,
                });
                if (nextPlaying && !masterBlackout && isAudioMuted) {
                  setIsAudioMuted(false);
                }
              }}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase flex items-center gap-1 border transition-all cursor-pointer ${
                musicOverlayPlaying
                  ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title={
                musicOverlayPlaying
                  ? 'Pause Music Overlay'
                  : 'Play Music Overlay'
              }
            >
              {musicOverlayPlaying ? (
                <>
                  <Pause className="w-2.5 h-2.5" />
                  <span>PAUSE MUSIC</span>
                </>
              ) : (
                <>
                  <Play className="w-2.5 h-2.5" />
                  <span>PLAY MUSIC</span>
                </>
              )}
            </button>
          </div>

          {/* Video Vol Slider */}
          <div>
            <div className="flex justify-between text-[9px] font-mono text-slate-300 mb-0.5">
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setAudioMixerParams({ videoSoundMuted: !videoSoundMuted })
                  }
                  className="hover:text-cyan-400 cursor-pointer"
                  title={
                    videoSoundMuted ? 'Unmute Video Sound' : 'Mute Video Sound'
                  }
                >
                  {videoSoundMuted ? (
                    <VolumeX className="w-2.5 h-2.5 text-red-400" />
                  ) : (
                    <Volume2 className="w-2.5 h-2.5 text-cyan-400" />
                  )}
                </button>
                VIDEO VOL ({videoSoundVolume}%)
              </span>
              <span className="font-bold text-cyan-300">
                {videoSoundVolume}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={videoSoundVolume}
              onChange={(e) =>
                setAudioMixerParams({
                  videoSoundVolume: Number(e.target.value),
                })
              }
              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Music Vol Slider */}
          <div>
            <div className="flex justify-between text-[9px] font-mono text-slate-300 mb-0.5">
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setAudioMixerParams({
                      musicOverlayMuted: !musicOverlayMuted,
                    })
                  }
                  className="hover:text-purple-400 cursor-pointer"
                  title={
                    musicOverlayMuted
                      ? 'Unmute Music Overlay'
                      : 'Mute Music Overlay'
                  }
                >
                  {musicOverlayMuted ? (
                    <VolumeX className="w-2.5 h-2.5 text-red-400" />
                  ) : (
                    <Volume2 className="w-2.5 h-2.5 text-purple-400" />
                  )}
                </button>
                MUSIC VOL ({musicOverlayVolume}%)
              </span>
              <span className="font-bold text-purple-300">
                {musicOverlayVolume}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={musicOverlayVolume}
              onChange={(e) =>
                setAudioMixerParams({
                  musicOverlayVolume: Number(e.target.value),
                })
              }
              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-400"
            />
          </div>
        </div>

        {/* Action Toggles: Fullscreen, Test Pattern, Blackout */}
        <div className="flex flex-col gap-1.5">
          {/* Enter Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(37,99,235,0.4)] transition-all"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>EXIT FULLSCREEN (F)</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>ENTER FULLSCREEN (F11)</span>
              </>
            )}
          </button>

          {/* Safe Area & Overscan Calibration Guides */}
          {showSafeAreaGuides && !masterBlackout && (
            <div className="absolute inset-0 pointer-events-none z-30">
              <div
                className="absolute border border-dashed border-cyan-400/70"
                style={{ inset: '2.5%' }}
              >
                <span className="absolute top-1 left-1.5 text-[9px] font-mono text-cyan-300 bg-black/60 px-1 rounded">
                  95% ACTION SAFE
                </span>
              </div>
              <div
                className="absolute border border-dashed border-amber-400/70"
                style={{ inset: '5%' }}
              >
                <span className="absolute bottom-1 right-1.5 text-[9px] font-mono text-amber-300 bg-black/60 px-1 rounded">
                  90% TITLE SAFE
                </span>
              </div>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-px bg-white/60" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-px bg-white/60" />
            </div>
          )}

          {/* Virtual Screen & Sync Heartbeat Badge */}
          {hudVisible && (
            <div className="absolute top-3 left-3 z-40 flex items-center gap-2 pointer-events-none">
              {virtualScreenMeta.isVirtual && (
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/50 text-[10px] font-mono font-bold text-cyan-300 backdrop-blur-sm">
                  VIRTUAL SCREEN · {virtualScreenMeta.resolution}
                </span>
              )}
              {projectorCornerPinTransform && (
                <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-[10px] font-mono font-bold text-amber-300 backdrop-blur-sm">
                  WARP: CORNER-PIN
                </span>
              )}
              <span className="px-2 py-0.5 rounded bg-black/65 border border-slate-700 text-[10px] font-mono text-emerald-300 backdrop-blur-sm">
                {lastSyncTime ? `SYNCED · ${lastSyncTime}` : 'SYNC READY'}
              </span>
            </div>
          )}

          {/* Frustum Slice Clip Toggle (Available when targetProjectorId !== 'all') */}
          {targetProjectorId !== 'all' && (
            <button
              type="button"
              onClick={() => setFrustumSliceClip(!frustumSliceClip)}
              className={`w-full py-1 px-2.5 rounded text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border transition-all ${
                frustumSliceClip
                  ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_8px_#06b6d4]'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Crop className="w-3 h-3" />
              <span>
                {frustumSliceClip
                  ? 'FRUSTUM SLICE: CLIPPED'
                  : 'FRUSTUM SLICE CLIP'}
              </span>
            </button>
          )}

          {/* Master Output Mute & Safe-Area Guides */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setIsAudioMuted(!isAudioMuted)}
              className={`py-1 px-2 rounded text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 border transition-all ${
                isAudioMuted
                  ? 'bg-red-500/20 text-red-300 border-red-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {isAudioMuted ? (
                <VolumeX className="w-3 h-3" />
              ) : (
                <Volume2 className="w-3 h-3" />
              )}
              <span>{isAudioMuted ? 'MUTED' : 'AUDIO LIVE'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSafeAreaGuides(!showSafeAreaGuides)}
              className={`py-1 px-2 rounded text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 border transition-all ${
                showSafeAreaGuides
                  ? 'bg-cyan-500 text-black border-cyan-400'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Crop className="w-3 h-3" />
              <span>SAFE GUIDES</span>
            </button>
          </div>

          {/* Test Pattern Toggle & Pattern Selector */}
          <button
            type="button"
            onClick={() => setProjectorTestPattern(!projectorTestPattern)}
            className={`w-full py-1 px-2.5 rounded text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border transition-all ${
              projectorTestPattern
                ? 'bg-amber-500 text-black border-amber-400'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Grid className="w-3 h-3" />
            <span>
              {projectorTestPattern ? 'HIDE TEST PATTERN' : 'CALIBRATION TEST PATTERNS'}
            </span>
          </button>

          {/* Pattern Type Quick-Selector Bar when Active */}
          {projectorTestPattern && (
            <div className="flex flex-col gap-1 p-1.5 rounded bg-[#0d1422] border border-amber-500/40">
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    { id: 'grid', label: 'Grid' },
                    { id: 'smpte-bars', label: 'SMPTE' },
                    { id: 'focus-star', label: 'Focus' },
                    { id: 'geometry-circles', label: 'Circles' },
                    { id: 'greyscale-ramp', label: 'Ramp' },
                    { id: 'color-purity', label: 'Purity' },
                  ] as const
                ).map((pat) => (
                  <button
                    key={pat.id}
                    type="button"
                    onClick={() => setTestPatternType(pat.id)}
                    className={`py-0.5 px-1 rounded text-[9px] font-bold uppercase tracking-wide border transition-all ${
                      testPatternType === pat.id
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-extrabold shadow-sm'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {pat.label}
                  </button>
                ))}
              </div>

              {/* Color Swatches if Purity Selected */}
              {testPatternType === 'color-purity' && (
                <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-700/60">
                  {(['white', 'red', 'green', 'blue', 'cyan', 'magenta', 'yellow'] as const).map(
                    (col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setPurityColor(col)}
                        title={`100% ${col.toUpperCase()} Field`}
                        className={`w-4 h-4 rounded-full border transition-all ${
                          purityColor === col
                            ? 'scale-125 border-white ring-1 ring-cyan-400'
                            : 'border-slate-600 opacity-70 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor:
                            col === 'white'
                              ? '#ffffff'
                              : col === 'red'
                              ? '#ff0000'
                              : col === 'green'
                              ? '#00ff00'
                              : col === 'blue'
                              ? '#0000ff'
                              : col === 'cyan'
                              ? '#00ffff'
                              : col === 'magenta'
                              ? '#ff00ff'
                              : '#ffff00',
                        }}
                      />
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {/* Master Blackout Panic Button */}
          <button
            type="button"
            onClick={() => toggleMasterBlackout()}
            className={`w-full py-1 px-2.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border transition-all ${
              masterBlackout
                ? 'bg-red-600 text-white border-red-500 animate-pulse'
                : 'bg-red-950/40 text-red-300 border-red-800/60 hover:bg-red-900/50'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span>
              {masterBlackout ? 'BLACKOUT ENGAGED [ESC]' : 'EMERGENCY BLACKOUT [ESC]'}
            </span>
          </button>
        </div>

        {/* Live Projector Engine Telemetry Badge */}
        <div className="mt-2.5 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400 flex flex-col gap-0.5">
          <div className="flex justify-between">
            <span>PLAYLIST CLIP:</span>
            <span className="text-cyan-300 font-semibold truncate max-w-[130px]">
              {selectedClip.title}
            </span>
          </div>
          <div className="flex justify-between">
            <span>OUTPUT LUMENS:</span>
            <span className="text-emerald-400 font-semibold">
              {projectorLumens}% ({(effectiveBrightnessMultiplier * 100).toFixed(0)}% NET)
            </span>
          </div>
          <div className="flex justify-between">
            <span>EDGE BLEND:</span>
            <span
              className={
                enableSoftEdgeBlending ? 'text-amber-400' : 'text-slate-500'
              }
            >
              {enableSoftEdgeBlending ? `S-CURVE (${blendGamma})` : 'DISABLED'}
            </span>
          </div>
          {targetProjectorId !== 'all' && targetedProjector && (
            <div className="flex justify-between">
              <span>COLOR BALANCE:</span>
              <span className="text-cyan-300 font-semibold">
                R:{targetedProjector.rgbGain?.r ?? 100}% G:{targetedProjector.rgbGain?.g ?? 100}% B:{targetedProjector.rgbGain?.b ?? 100}%
              </span>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
