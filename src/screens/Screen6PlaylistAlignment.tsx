import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Lock,
  Unlock,
  SquarePen,
  Play,
  Pause,
  SkipForward,
  Repeat,
  Video,
  RotateCcw,
  Plus,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Radio,
  ChevronDown,
  Volume2,
  VolumeX,
  Music,
  ArrowLeft,
  Save,
} from 'lucide-react';
import {
  AUSTIN_HOUSE_ASSETS,
  AUDIO_OVERLAY_TRACKS,
  useProjectionStore,
} from '../store/useProjectionStore';
import { ArchitecturalHousePreview } from '../components/ArchitecturalHousePreview';
import { computeFinalAlignmentMatrix } from '../utils/projectionMath';
import {
  PreviewZoomControl,
  computeZoomViewBox,
  useMiddleClickPan,
} from '../components/PreviewZoomControl';

export const Screen6PlaylistAlignment: React.FC = () => {
  const {
    calibrationMode,
    warpMode,
    sendLiveToProjector,
    projectWireframeGrid,
    showCrosshairs,
    applyBlackoutMasks,
    baseHouseGhosting,
    globalKeyReference,
    nudgeResolution,
    playlistClips,
    selectedClipId,
    transitionMode,
    loopMode,
    masterBlackout,
    videoSoundVolume,
    videoSoundMuted,
    musicOverlayVolume,
    musicOverlayMuted,
    musicOverlayPlaying,
    musicOverlayTrackUrl,
    setAudioMixerParams,
    setCalibrationParams,
    updateGlobalKeyReference,
    updateClipDeltaOffset,
    toggleClipBypassOffset,
    resetClipToGlobal,
    copyClipOffsetToAll,
    bakeClipAlignment,
    addPlaylistClip,
    duplicatePlaylistClip,
    deletePlaylistClip,
    reorderPlaylistClip,
    toggleMasterBlackout,
    setActiveScreen,
    navigateBack,
    saveCurrentProject,
    showToast,
    setIsLoopCrossfadeModalOpen,
    setIsFitVideoModalOpen,
    setIsRunNightRehearsalModalOpen,
  } = useProjectionStore();

  const [dragType, setDragType] = useState<
    'none' | 'body' | 'corner' | 'rotation'
  >('none');
  const [calibZoom, setCalibZoom] = useState<number>(100);

  // Middle scroll wheel click to pan on alignment viewport
  const {
    pan: calibPan,
    resetPan: resetCalibPan,
    handlePointerDown: handleCalibMiddleDown,
    handlePointerMove: handleCalibMiddleMove,
    handlePointerUp: handleCalibMiddleUp,
    handleMouseDown: handleCalibMiddleMouseDown,
  } = useMiddleClickPan();
  const [dragCornerIdx, setDragCornerIdx] = useState<number | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [dragInitial, setDragInitial] = useState<{
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
  }>({ x: 0, y: 0, scaleX: 100, scaleY: 100, rotation: 0 });

  // Sequencer video playback ref & state
  const calibrationVideoRef = useRef<HTMLVideoElement | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(true);
  const [transitionState, setTransitionState] = useState<
    'idle' | 'crossfade' | 'dip-black'
  >('idle');

  // Warp Mode 2: 4-Corner Pin (Keystone) Offsets - loaded from localStorage if present
  const [cornerPinOffsets, setCornerPinOffsets] = useState<{
    tl: { x: number; y: number };
    tr: { x: number; y: number };
    br: { x: number; y: number };
    bl: { x: number; y: number };
  }>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lumen-map-warp-offsets');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.cornerPinOffsets) {
            return parsed.cornerPinOffsets;
          }
        }
      } catch (e) {
        console.warn('Failed to parse initial cornerPinOffsets from localStorage', e);
      }
    }
    return {
      tl: { x: 0, y: 0 },
      tr: { x: 0, y: 0 },
      br: { x: 0, y: 0 },
      bl: { x: 0, y: 0 },
    };
  });

  // Warp Mode 3: 3x3 Bezier Mesh Grid Node Offsets - loaded from localStorage if present
  const [meshNodeOffsets, setMeshNodeOffsets] = useState<
    { x: number; y: number }[]
  >(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lumen-map-warp-offsets');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (
            Array.isArray(parsed.meshNodeOffsets) &&
            parsed.meshNodeOffsets.length === 9
          ) {
            return parsed.meshNodeOffsets;
          }
        }
      } catch (e) {
        console.warn('Failed to parse initial meshNodeOffsets from localStorage', e);
      }
    }
    return Array.from({ length: 9 }, () => ({ x: 0, y: 0 }));
  });

  // Pointer drag state for individual corner pin or mesh node
  const [draggingNode, setDraggingNode] = useState<{
    type: 'corner-pin' | 'mesh-node';
    id: string | number;
    startX: number;
    startY: number;
    initialOffset: { x: number; y: number };
  } | null>(null);

  const resetCornerPins = () => {
    setCornerPinOffsets({
      tl: { x: 0, y: 0 },
      tr: { x: 0, y: 0 },
      br: { x: 0, y: 0 },
      bl: { x: 0, y: 0 },
    });
    showToast('Corner Pins Reset to Default Keystone Rect');
  };

  const resetMeshGrid = () => {
    setMeshNodeOffsets(Array.from({ length: 9 }, () => ({ x: 0, y: 0 })));
    showToast('Bezier Mesh Grid Reset to 3x3 Default');
  };

  const selectedClip = useMemo(
    () =>
      playlistClips.find((c) => c.id === selectedClipId) || playlistClips[1],
    [playlistClips, selectedClipId]
  );

  // Synchronize HTML5 video element with isVideoPlaying, videoSoundVolume, videoSoundMuted, and masterBlackout
  useEffect(() => {
    if (calibrationVideoRef.current) {
      calibrationVideoRef.current.volume = Math.max(
        0,
        Math.min(1, videoSoundVolume / 100)
      );
      calibrationVideoRef.current.muted = videoSoundMuted || masterBlackout;
      if (isVideoPlaying && !masterBlackout) {
        calibrationVideoRef.current.play().catch(() => {});
      } else {
        calibrationVideoRef.current.pause();
      }
    }
  }, [
    isVideoPlaying,
    masterBlackout,
    selectedClipId,
    videoSoundVolume,
    videoSoundMuted,
  ]);

  // Synchronize Music Overlay <audio> element with volume, mute, playing, and track url
  useEffect(() => {
    if (musicAudioRef.current) {
      musicAudioRef.current.volume = Math.max(
        0,
        Math.min(1, musicOverlayVolume / 100)
      );
      musicAudioRef.current.muted = musicOverlayMuted || masterBlackout;
      if (musicOverlayPlaying && !masterBlackout) {
        musicAudioRef.current.play().catch(() => {});
      } else {
        musicAudioRef.current.pause();
      }
    }
  }, [
    musicOverlayVolume,
    musicOverlayMuted,
    musicOverlayPlaying,
    musicOverlayTrackUrl,
    masterBlackout,
  ]);

  // Transition handler for switching clips (matching CROSSFADE, DIP TO BLACK, HARD CUT)
  const switchClipWithTransition = (nextClipId: string) => {
    if (nextClipId === selectedClipId) return;
    if (transitionMode === 'HARD CUT (0.0s)') {
      setCalibrationParams({ selectedClipId: nextClipId });
      return;
    }
    if (transitionMode === 'DIP TO BLACK (1.0s)') {
      setTransitionState('dip-black');
      setTimeout(() => {
        setCalibrationParams({ selectedClipId: nextClipId });
        setTimeout(() => {
          setTransitionState('idle');
        }, 500);
      }, 500);
      return;
    }
    if (transitionMode === 'CROSSFADE (1.5s)') {
      setTransitionState('crossfade');
      setCalibrationParams({ selectedClipId: nextClipId });
      setTimeout(() => {
        setTransitionState('idle');
      }, 1500);
    }
  };

  const handleSkipForward = () => {
    const idx = playlistClips.findIndex((c) => c.id === selectedClipId);
    const next = playlistClips[(idx + 1) % playlistClips.length];
    switchClipWithTransition(next.id);
    showToast(`Skipped to #${next.index}: ${next.title}`);
  };

  const cycleLoopMode = () => {
    const modes: ('INFINITE' | 'SINGLE PASS' | 'SCHEDULED WINDOW')[] = [
      'INFINITE',
      'SINGLE PASS',
      'SCHEDULED WINDOW',
    ];
    const nextIdx = (modes.indexOf(loopMode) + 1) % modes.length;
    const nextMode = modes[nextIdx];
    setCalibrationParams({ loopMode: nextMode });
    showToast(`Loop Mode: ${nextMode}`);
  };

  // Compute real-time 3x3 Dual-Layer Alignment Matrix: T_final = M_blackout * (T_global * T_clip_delta)
  const finalMatrix = useMemo(() => {
    const isSynced =
      selectedClip.alignmentMode === 'GLOBAL SYNCED' ||
      selectedClip.bypassOffset;
    return computeFinalAlignmentMatrix(
      globalKeyReference,
      selectedClip.deltaOffset,
      isSynced
    );
  }, [globalKeyReference, selectedClip]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showPresetMenu, setShowPresetMenu] = useState<boolean>(false);

  const AUSTIN_PRESET_OPTIONS = [
    {
      title: 'Ghostbusters HQ Master',
      videoUrl: AUSTIN_HOUSE_ASSETS.videos.mainShow,
      thumbnailUrl: AUSTIN_HOUSE_ASSETS.photos.v1EctoOpenGarage,
      themeStyle: 'spooky' as const,
      durationSec: 30,
      durationFormatted: '0:30',
    },
    {
      title: 'Firehouse Tower V1',
      videoUrl: AUSTIN_HOUSE_ASSETS.videos.v1Show,
      thumbnailUrl: AUSTIN_HOUSE_ASSETS.photos.v2FirehouseTower,
      themeStyle: 'spooky' as const,
      durationSec: 15,
      durationFormatted: '0:15',
    },
    {
      title: 'Slimer Ecto Breach V2',
      videoUrl: AUSTIN_HOUSE_ASSETS.videos.v2Show,
      thumbnailUrl: AUSTIN_HOUSE_ASSETS.photos.v4SlimerBreach,
      themeStyle: 'laser' as const,
      durationSec: 10,
      durationFormatted: '0:10',
    },
    {
      title: 'Singing Gourd Chorus',
      videoUrl: AUSTIN_HOUSE_ASSETS.videos.pumpkins,
      thumbnailUrl: AUSTIN_HOUSE_ASSETS.photos.v3ClosedLogoGarage,
      themeStyle: 'spooky' as const,
      durationSec: 30,
      durationFormatted: '0:30',
    },
    {
      title: 'Extended Grand Finale',
      videoUrl: AUSTIN_HOUSE_ASSETS.videos.extendedFinale,
      thumbnailUrl: AUSTIN_HOUSE_ASSETS.photos.v2FirehouseTower,
      themeStyle: 'laser' as const,
      durationSec: 45,
      durationFormatted: '0:45',
    },
  ];

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const title = file.name.replace(/\.[^/.]+$/, '');
    addPlaylistClip({
      title,
      videoUrl: url,
      thumbnailUrl: AUSTIN_HOUSE_ASSETS.photos.v1EctoOpenGarage,
      themeStyle: 'spooky',
      durationSec: 30,
      durationFormatted: '0:30',
    });
    showToast(`Imported video clip: ${title}`);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Interactive Warp Effect: Computes live CSS 3D perspective/skew/scale transform on <video> driven by 4 Corner Pins & Bezier Mesh
  const videoWarpTransform = useMemo(() => {
    if (warpMode === 'corner-pin') {
      const { tl, tr, br, bl } = cornerPinOffsets;
      const pinTx = (tl.x + tr.x + br.x + bl.x) / 4;
      const pinTy = (tl.y + tr.y + br.y + bl.y) / 4;
      const skewX =
        ((tr.x - tl.x) - (br.x - bl.x)) * 0.05 +
        ((tl.y - bl.y) - (tr.y - br.y)) * 0.04;
      const skewY =
        ((bl.y - tl.y) - (br.y - tr.y)) * 0.05 +
        ((tr.x - br.x) - (tl.x - bl.x)) * 0.04;
      const scaleDiffX = Math.max(
        0.2,
        1 + ((tr.x - tl.x) + (br.x - bl.x)) / 800
      );
      const scaleDiffY = Math.max(
        0.2,
        1 + ((bl.y - tl.y) + (br.y - tr.y)) / 800
      );
      const rotateX = ((bl.y + br.y) - (tl.y + tr.y)) * 0.08;
      const rotateY = ((tr.x + br.x) - (tl.x + bl.x)) * 0.08;

      return `perspective(1000px) translate(${finalMatrix[0][2] + pinTx}px, ${
        finalMatrix[1][2] + pinTy
      }px) scale(${finalMatrix[0][0] * scaleDiffX}, ${
        finalMatrix[1][1] * scaleDiffY
      }) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(
        2
      )}deg) skew(${skewX.toFixed(2)}deg, ${skewY.toFixed(2)}deg)`;
    }

    if (warpMode === 'bezier-mesh') {
      const meshTx =
        meshNodeOffsets.reduce((acc, n) => acc + n.x, 0) / 9;
      const meshTy =
        meshNodeOffsets.reduce((acc, n) => acc + n.y, 0) / 9;
      const centerOffset = meshNodeOffsets[4] || { x: 0, y: 0 };
      const n0 = meshNodeOffsets[0] || { x: 0, y: 0 };
      const n1 = meshNodeOffsets[1] || { x: 0, y: 0 };
      const n2 = meshNodeOffsets[2] || { x: 0, y: 0 };
      const n3 = meshNodeOffsets[3] || { x: 0, y: 0 };
      const n5 = meshNodeOffsets[5] || { x: 0, y: 0 };
      const n6 = meshNodeOffsets[6] || { x: 0, y: 0 };
      const n7 = meshNodeOffsets[7] || { x: 0, y: 0 };
      const n8 = meshNodeOffsets[8] || { x: 0, y: 0 };

      const meshSkewX =
        ((n2.x - n0.x) - (n8.x - n6.x)) * 0.06;
      const meshSkewY =
        ((n6.y - n0.y) - (n8.y - n2.y)) * 0.06;
      const meshRotX = (n7.y - n1.y) * 0.08;
      const meshRotY = (n5.x - n3.x) * 0.08;
      const meshScaleX = Math.max(
        0.2,
        1 + (n5.x - n3.x + centerOffset.x * 0.5) / 700
      );
      const meshScaleY = Math.max(
        0.2,
        1 + (n7.y - n1.y + centerOffset.y * 0.5) / 700
      );

      return `perspective(1000px) translate(${finalMatrix[0][2] + meshTx}px, ${
        finalMatrix[1][2] + meshTy
      }px) scale(${finalMatrix[0][0] * meshScaleX}, ${
        finalMatrix[1][1] * meshScaleY
      }) rotateX(${meshRotX.toFixed(2)}deg) rotateY(${meshRotY.toFixed(
        2
      )}deg) skew(${meshSkewX.toFixed(2)}deg, ${meshSkewY.toFixed(2)}deg)`;
    }

    return `translate(${finalMatrix[0][2]}px, ${finalMatrix[1][2]}px) scale(${finalMatrix[0][0]}, ${finalMatrix[1][1]})`;
  }, [warpMode, cornerPinOffsets, meshNodeOffsets, finalMatrix]);

  // Persist & Broadcast 4-Corner Pin and 3x3 Bezier Mesh Warps to ProjectorOutputView
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const warpPayload = {
      warpMode,
      cornerPinOffsets,
      meshNodeOffsets,
      videoWarpTransform,
    };
    try {
      localStorage.setItem(
        'lumen-map-warp-offsets',
        JSON.stringify(warpPayload)
      );
    } catch (err) {
      console.warn('Failed to save warp offsets to localStorage:', err);
    }

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('lumen-map-projector-sync');
      channel.postMessage({
        type: 'WARP_UPDATE',
        payload: warpPayload,
      });
    } catch (err) {
      console.warn('Failed to broadcast WARP_UPDATE over BroadcastChannel:', err);
    } finally {
      channel?.close();
    }
  }, [warpMode, cornerPinOffsets, meshNodeOffsets, videoWarpTransform]);

  const activeOffsetX =
    calibrationMode === 'global'
      ? globalKeyReference.x
      : selectedClip.deltaOffset.x;
  const activeOffsetY =
    calibrationMode === 'global'
      ? globalKeyReference.y
      : selectedClip.deltaOffset.y;
  const activeScaleX =
    calibrationMode === 'global'
      ? globalKeyReference.scaleX
      : selectedClip.deltaOffset.scaleX;
  const activeScaleY =
    calibrationMode === 'global'
      ? globalKeyReference.scaleY
      : selectedClip.deltaOffset.scaleY;
  const activeRot =
    calibrationMode === 'global'
      ? globalKeyReference.rotation
      : selectedClip.deltaOffset.rotation;

  const nudgeDelta = (
    field: 'x' | 'y' | 'scaleX' | 'rotation',
    dir: 1 | -1
  ) => {
    const step =
      field === 'scaleX' || field === 'rotation'
        ? nudgeResolution * 0.2
        : nudgeResolution;
    const currentVal = selectedClip.deltaOffset[field];
    const nextVal = Number((currentVal + dir * step).toFixed(1));
    if (field === 'scaleX') {
      updateClipDeltaOffset(selectedClip.id, {
        scaleX: nextVal,
        scaleY: nextVal,
      });
    } else {
      updateClipDeltaOffset(selectedClip.id, { [field]: nextVal });
    }
  };

  // Keyboard arrow-key nudging (ArrowUp, ArrowDown, ArrowLeft, ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        return;
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowUp') dy = -nudgeResolution;
        if (e.key === 'ArrowDown') dy = nudgeResolution;
        if (e.key === 'ArrowLeft') dx = -nudgeResolution;
        if (e.key === 'ArrowRight') dx = nudgeResolution;

        if (calibrationMode === 'global') {
          if (globalKeyReference.locked) {
            showToast(
              'Master Global Key Reference is locked — click Unlock to nudge'
            );
            return;
          }
          const nextX = Number((globalKeyReference.x + dx).toFixed(2));
          const nextY = Number((globalKeyReference.y + dy).toFixed(2));
          updateGlobalKeyReference({ x: nextX, y: nextY });
          showToast(
            `Nudged Global Ref [${nextX > 0 ? '+' : ''}${nextX.toFixed(1)}px, ${nextY > 0 ? '+' : ''}${nextY.toFixed(1)}px]`
          );
        } else {
          const nextX = Number((selectedClip.deltaOffset.x + dx).toFixed(2));
          const nextY = Number((selectedClip.deltaOffset.y + dy).toFixed(2));
          updateClipDeltaOffset(selectedClip.id, { x: nextX, y: nextY });
          showToast(
            `Nudged Clip #${selectedClip.index} Delta [${nextX > 0 ? '+' : ''}${nextX.toFixed(1)}px, ${nextY > 0 ? '+' : ''}${nextY.toFixed(1)}px]`
          );
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    calibrationMode,
    globalKeyReference,
    selectedClip,
    nudgeResolution,
    updateGlobalKeyReference,
    updateClipDeltaOffset,
    showToast,
  ]);

  // Amber Calibration Cage Pointer Handlers
  const handleBodyPointerDown = (e: React.PointerEvent<SVGElement>) => {
    if (calibrationMode === 'global' && globalKeyReference.locked) {
      showToast(
        'Master Global Key Reference is locked — click Unlock in the inspector to calibrate'
      );
      return;
    }
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragType('body');
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDragInitial({
      x: activeOffsetX,
      y: activeOffsetY,
      scaleX: activeScaleX,
      scaleY: activeScaleY,
      rotation: activeRot,
    });
  };

  const handleHandlePointerDown = (
    e: React.PointerEvent<SVGElement>,
    idx: number,
    type: string
  ) => {
    if (calibrationMode === 'global' && globalKeyReference.locked) {
      showToast(
        'Master Global Key Reference is locked — click Unlock in the inspector to resize'
      );
      return;
    }
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    if (type === 'center') {
      setDragType('body');
    } else {
      setDragType('corner');
      setDragCornerIdx(idx);
    }
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDragInitial({
      x: activeOffsetX,
      y: activeOffsetY,
      scaleX: activeScaleX,
      scaleY: activeScaleY,
      rotation: activeRot,
    });
  };

  const handleRotationPointerDown = (e: React.PointerEvent<SVGElement>) => {
    if (calibrationMode === 'global' && globalKeyReference.locked) {
      showToast(
        'Master Global Key Reference is locked — click Unlock in the inspector to rotate'
      );
      return;
    }
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragType('rotation');
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDragInitial({
      x: activeOffsetX,
      y: activeOffsetY,
      scaleX: activeScaleX,
      scaleY: activeScaleY,
      rotation: activeRot,
    });
  };

  const handlePointerMove = (e: React.PointerEvent<SVGElement>) => {
    if (dragType === 'none') return;
    const dx = e.clientX - dragStartPos.x;
    const dy = e.clientY - dragStartPos.y;

    if (dragType === 'body') {
      const nextX = Number((dragInitial.x + dx).toFixed(1));
      const nextY = Number((dragInitial.y + dy).toFixed(1));
      if (calibrationMode === 'global') {
        updateGlobalKeyReference({ x: nextX, y: nextY });
      } else {
        updateClipDeltaOffset(selectedClip.id, { x: nextX, y: nextY });
      }
    } else if (dragType === 'corner') {
      let factor = 1;
      if (dragCornerIdx === 0 || dragCornerIdx === 6 || dragCornerIdx === 3) {
        factor = -1;
      }
      const scaleDelta = (dx * factor + dy * factor) * 0.25;
      const nextScaleX = Math.max(
        10,
        Math.min(300, Number((dragInitial.scaleX + scaleDelta).toFixed(1)))
      );
      const nextScaleY = Math.max(
        10,
        Math.min(300, Number((dragInitial.scaleY + scaleDelta).toFixed(1)))
      );
      if (calibrationMode === 'global') {
        updateGlobalKeyReference({ scaleX: nextScaleX, scaleY: nextScaleY });
      } else {
        updateClipDeltaOffset(selectedClip.id, {
          scaleX: nextScaleX,
          scaleY: nextScaleY,
        });
      }
    } else if (dragType === 'rotation') {
      const rotDelta = Number((dx * 0.4).toFixed(1));
      const nextRot = Number((dragInitial.rotation + rotDelta).toFixed(1));
      if (calibrationMode === 'global') {
        updateGlobalKeyReference({ rotation: nextRot });
      } else {
        updateClipDeltaOffset(selectedClip.id, { rotation: nextRot });
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGElement>) => {
    if (dragType !== 'none') {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      setDragType('none');
      setDragCornerIdx(null);
    }
  };

  // Dedicated pointer handlers for Corner Pin Keystone and Bezier Mesh nodes
  const handleCornerPinDown = (
    e: React.PointerEvent<SVGElement>,
    pin: 'tl' | 'tr' | 'br' | 'bl'
  ) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingNode({
      type: 'corner-pin',
      id: pin,
      startX: e.clientX,
      startY: e.clientY,
      initialOffset: { ...cornerPinOffsets[pin] },
    });
  };

  const handleMeshNodeDown = (
    e: React.PointerEvent<SVGElement>,
    idx: number
  ) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingNode({
      type: 'mesh-node',
      id: idx,
      startX: e.clientX,
      startY: e.clientY,
      initialOffset: { ...meshNodeOffsets[idx] },
    });
  };

  const handleNodePointerMove = (e: React.PointerEvent<SVGElement>) => {
    if (!draggingNode) return;
    const scaleFactor = 100 / calibZoom;
    const dx = (e.clientX - draggingNode.startX) * scaleFactor;
    const dy = (e.clientY - draggingNode.startY) * scaleFactor;

    if (draggingNode.type === 'corner-pin') {
      const pin = draggingNode.id as 'tl' | 'tr' | 'br' | 'bl';
      setCornerPinOffsets((prev) => ({
        ...prev,
        [pin]: {
          x: Number((draggingNode.initialOffset.x + dx).toFixed(1)),
          y: Number((draggingNode.initialOffset.y + dy).toFixed(1)),
        },
      }));
    } else if (draggingNode.type === 'mesh-node') {
      const idx = draggingNode.id as number;
      setMeshNodeOffsets((prev) =>
        prev.map((pt, i) =>
          i === idx
            ? {
                x: Number((draggingNode.initialOffset.x + dx).toFixed(1)),
                y: Number((draggingNode.initialOffset.y + dy).toFixed(1)),
              }
            : pt
        )
      );
    }
  };

  const handleNodePointerUp = (e: React.PointerEvent<SVGElement>) => {
    if (draggingNode) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      setDraggingNode(null);
    }
  };

  // SAVE & LOAD GLOBAL PRESET using localStorage key 'lumen-map-global-keystone-preset'
  const handleSaveGlobalPreset = () => {
    try {
      const presetData = {
        x: globalKeyReference.x,
        y: globalKeyReference.y,
        scaleX: globalKeyReference.scaleX,
        scaleY: globalKeyReference.scaleY,
        rotation: globalKeyReference.rotation,
        locked: globalKeyReference.locked,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(
        'lumen-map-global-keystone-preset',
        JSON.stringify(presetData)
      );
      showToast(
        `Saved Global Preset to Storage (X: ${globalKeyReference.x.toFixed(1)}, Y: ${globalKeyReference.y.toFixed(1)}, Scale: ${globalKeyReference.scaleX.toFixed(1)}%)`
      );
    } catch {
      showToast('Failed to save preset to localStorage');
    }
  };

  const handleLoadGlobalPreset = () => {
    try {
      const raw = localStorage.getItem('lumen-map-global-keystone-preset');
      if (!raw) {
        showToast(
          'No saved preset found in storage ("lumen-map-global-keystone-preset")'
        );
        return;
      }
      const parsed = JSON.parse(raw);
      if (typeof parsed.x === 'number' && typeof parsed.scaleX === 'number') {
        updateGlobalKeyReference({
          x: parsed.x,
          y: parsed.y ?? 0,
          scaleX: parsed.scaleX,
          scaleY: parsed.scaleY ?? parsed.scaleX,
          rotation: parsed.rotation ?? 0,
        });
        showToast(
          `Loaded Global Preset from Storage (X: ${parsed.x.toFixed(1)}, Y: ${(parsed.y ?? 0).toFixed(1)}, Scale: ${parsed.scaleX.toFixed(1)}%)`
        );
      } else {
        showToast('Invalid preset format in localStorage');
      }
    } catch {
      showToast('Error reading preset from localStorage');
    }
  };

  const cageHandles = [
    { x: 90, y: 32, type: 'corner', cursor: 'cursor-nwse-resize' }, // TL
    { x: 380, y: 32, type: 'edge', cursor: 'cursor-ns-resize' }, // TC
    { x: 670, y: 32, type: 'corner', cursor: 'cursor-nesw-resize' }, // TR
    { x: 90, y: 182, type: 'edge', cursor: 'cursor-ew-resize' }, // ML
    { x: 380, y: 182, type: 'center', cursor: 'cursor-move' }, // Center
    { x: 670, y: 182, type: 'edge', cursor: 'cursor-ew-resize' }, // MR
    { x: 90, y: 332, type: 'corner', cursor: 'cursor-nesw-resize' }, // BL
    { x: 380, y: 332, type: 'edge', cursor: 'cursor-ns-resize' }, // BC
    { x: 670, y: 332, type: 'corner', cursor: 'cursor-nwse-resize' }, // BR
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0d121b] text-slate-100 select-none overflow-hidden">
      {/* TOP CALIBRATION MODE & LIVE OUTPUT BAR */}
      <div className="h-12 bg-[#121927] border-b border-[#232f45] px-4 flex items-center justify-between gap-4 shrink-0">
        {/* Navigation & Dual-Layer Mode Buttons */}
        <div className="flex items-center gap-2">
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

          <div className="h-6 w-[1px] bg-[#24334a] mx-1" />

          <button
            type="button"
            onClick={() => setCalibrationParams({ calibrationMode: 'global' })}
            className={`px-4 py-1.5 rounded-md text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-2 border transition-all cursor-pointer ${
              calibrationMode === 'global'
                ? 'bg-[#2573f0] border-blue-400 text-white shadow-[0_0_15px_rgba(37,115,240,0.5)]'
                : 'bg-[#1d3b6e] border-blue-500/40 text-blue-100 hover:bg-[#224785]'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            GLOBAL KEY REFERENCE MODE
          </button>

          <button
            type="button"
            onClick={() =>
              setCalibrationParams({ calibrationMode: 'individual' })
            }
            className={`px-4 py-1.5 rounded-md text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-2 border transition-all cursor-pointer ${
              calibrationMode === 'individual'
                ? 'bg-[#f59e0b] border-amber-300 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                : 'bg-[#252d3d] border-[#364259] text-amber-300 hover:bg-[#2f394d]'
            }`}
          >
            <SquarePen className="w-3.5 h-3.5" />
            INDIVIDUAL CLIP OVERRIDE MODE
          </button>

          <button
            type="button"
            onClick={() => setActiveScreen(10)}
            className="px-3.5 py-1.5 rounded-md text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5 border border-purple-500/50 bg-purple-600/25 hover:bg-purple-600/40 text-purple-300 hover:text-white transition-all shadow-[0_0_12px_rgba(168,85,247,0.25)] cursor-pointer"
            title="Open Screen 7: Music Synchronization & Audio-Reactive Shader System"
          >
            <Music className="w-3.5 h-3.5 text-purple-400" />
            <span>MUSIC SYNC (SCREEN 7)</span>
          </button>

          {/* Marshall Architectural Alignment & Rehearsal Tools */}
          <button
            type="button"
            onClick={() => setIsLoopCrossfadeModalOpen(true)}
            className="px-3 py-1.5 rounded-md text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5 border border-cyan-500/50 bg-cyan-600/25 hover:bg-cyan-600/40 text-cyan-300 hover:text-white transition-all shadow-sm cursor-pointer"
            title="Seamless Loop Crossfade Studio — Trim & blend tail-to-head seamlessly"
          >
            <Repeat className="w-3.5 h-3.5 text-cyan-400" />
            <span>Loop Crossfade</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFitVideoModalOpen(true)}
            className="px-3 py-1.5 rounded-md text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5 border border-sky-500/50 bg-sky-600/25 hover:bg-sky-600/40 text-sky-300 hover:text-white transition-all shadow-sm cursor-pointer"
            title="Fit Video to House — Map single video across house shapes (§22-A..22-E)"
          >
            <Video className="w-3.5 h-3.5 text-sky-400" />
            <span>Fit Video</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRunNightRehearsalModalOpen(true)}
            className="px-3 py-1.5 rounded-md text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5 border border-amber-500/60 bg-gradient-to-r from-amber-600/30 to-rose-600/30 hover:from-amber-600/50 hover:to-rose-600/50 text-amber-200 hover:text-white transition-all shadow-[0_0_10px_rgba(245,158,11,0.25)] cursor-pointer"
            title="Evening Rehearsal Simulator (--rehearse-evening) & Pre-Show Preflight"
          >
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            <span>Rehearsal</span>
          </button>
        </div>

        {/* Live Output Toggles */}
        <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-wider">
          <button
            type="button"
            onClick={() =>
              setCalibrationParams({
                sendLiveToProjector: !sendLiveToProjector,
              })
            }
            className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 cursor-pointer"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                sendLiveToProjector
                  ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
                  : 'bg-slate-600'
              }`}
            />
            SEND LIVE TO PROJECTOR
          </button>

          <button
            type="button"
            onClick={() =>
              setCalibrationParams({
                projectWireframeGrid: !projectWireframeGrid,
              })
            }
            className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 cursor-pointer"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                projectWireframeGrid
                  ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
                  : 'bg-slate-600'
              }`}
            />
            PROJECT WIREFRAME GRID
          </button>

          <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showCrosshairs}
              onChange={(e) =>
                setCalibrationParams({ showCrosshairs: e.target.checked })
              }
              className="rounded border-slate-600 text-blue-600"
            />
            SHOW CROSSHAIRS
          </label>

          <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={applyBlackoutMasks}
              onChange={(e) =>
                setCalibrationParams({ applyBlackoutMasks: e.target.checked })
              }
              className="rounded border-slate-600 text-blue-600"
            />
            APPLY BLACKOUT MASKS
          </label>
        </div>
      </div>

      {/* MAIN CONTENT AREA (LEFT/CENTER CALIBRATION + PLAYLIST SEQUENCER vs RIGHT INSPECTOR) */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* CENTER-LEFT MAIN CALIBRATION VIEWPORT + BOTTOM PLAYLIST SEQUENCER */}
        <div className="flex-1 min-w-0 flex flex-col p-4 justify-between overflow-hidden">
          {/* Viewport Header + Warp Mode Selectors */}
          <div className="flex items-center justify-between mb-2.5 shrink-0">
            <div className="flex items-center gap-3">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                MAIN CALIBRATION VIEWPORT
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Active: {calibrationMode === 'global' ? 'GLOBAL KEY REFERENCE' : `CLIP DELTA (#${selectedClip.index})`}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {[
                { id: 'simple' as const, label: 'SIMPLE SCALE/ROTATE/MOVE' },
                { id: 'corner-pin' as const, label: '4-CORNER PIN (KEYSTONE)' },
                { id: 'bezier-mesh' as const, label: 'BEZIER MESH GRID (3x3)' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setCalibrationParams({ warpMode: m.id })}
                  className={`px-3 py-1 rounded text-[11px] font-bold uppercase border transition-colors cursor-pointer ${
                    warpMode === m.id
                      ? 'bg-[#24324b] border-slate-400 text-white shadow'
                      : 'bg-[#172030] border-[#29364f] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}

              {warpMode === 'corner-pin' && (
                <button
                  type="button"
                  onClick={resetCornerPins}
                  className="px-2.5 py-1 rounded text-[11px] font-bold uppercase bg-amber-500/20 border border-amber-400 text-amber-300 hover:bg-amber-500/30 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  RESET CORNER PINS
                </button>
              )}

              {warpMode === 'bezier-mesh' && (
                <button
                  type="button"
                  onClick={resetMeshGrid}
                  className="px-2.5 py-1 rounded text-[11px] font-bold uppercase bg-emerald-500/20 border border-emerald-400 text-emerald-300 hover:bg-emerald-500/30 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  RESET MESH GRID
                </button>
              )}
            </div>
          </div>

          {/* Interactive Warping Viewport Canvas + BASE HOUSE GHOSTING Slider */}
          <div className="flex-1 min-h-0 flex items-end gap-4">
            <div
              onWheel={(e) => {
                e.preventDefault();
                const delta = e.deltaY < 0 ? 10 : -10;
                setCalibZoom((z) => Math.max(25, Math.min(250, z + delta)));
              }}
              className="flex-1 h-full rounded-lg bg-[#050811] border border-[#26334d] relative overflow-hidden flex items-center justify-center"
            >
              {/* Top-Right Interactive Zoom Toolbar (Supports 150% Overscan Out) */}
              <div className="absolute top-2.5 right-2.5 z-20">
                <PreviewZoomControl
                  zoom={calibZoom}
                  onChange={setCalibZoom}
                  pan={calibPan}
                  onResetPan={resetCalibPan}
                />
              </div>

              {/* Zoomable 100% Frame Wrapper so Images/Videos Can Extend Outside 100% Window */}
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-150"
                style={{
                  transform: `translate(${calibPan.x}px, ${calibPan.y}px) scale(${calibZoom / 100})`,
                }}
              >
                {/* 100% Frame Reference Boundary */}
                <div className="absolute inset-0 border border-dashed border-cyan-500/45 pointer-events-none" />

                {/* Real Video Playback Transformed by Dual-Layer Alignment Matrix T_final */}
                {!masterBlackout && selectedClip.videoUrl && (
                  <video
                    ref={calibrationVideoRef}
                    key={selectedClip.id}
                    src={selectedClip.videoUrl}
                    poster={selectedClip.thumbnailUrl}
                    autoPlay
                    loop={loopMode === 'INFINITE'}
                    muted={videoSoundMuted || masterBlackout}
                    playsInline
                    onLoadedMetadata={(e) => {
                      e.currentTarget.volume = Math.max(
                        0,
                        Math.min(1, videoSoundVolume / 100)
                      );
                      e.currentTarget.muted = videoSoundMuted || masterBlackout;
                      if (isVideoPlaying && !masterBlackout) {
                        e.currentTarget.play().catch(() => {});
                      } else {
                        e.currentTarget.pause();
                      }
                    }}
                    className={`absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity ${
                      transitionState === 'crossfade'
                        ? 'duration-1000 opacity-90'
                        : 'duration-200 opacity-100'
                    }`}
                    style={{
                      transform: videoWarpTransform,
                    }}
                  />
                )}

                {/* Dual-Channel Music Overlay Audio Player */}
                <audio
                  ref={musicAudioRef}
                  src={musicOverlayTrackUrl}
                  loop
                  preload="metadata"
                />

                {/* Dip to Black Transition Overlay */}
                {transitionState === 'dip-black' && (
                  <div className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-500 z-10" />
                )}

                {/* Base House Wireframe Ghosting Layer */}
                <img
                  src={AUSTIN_HOUSE_ASSETS.wireframeLayout}
                  alt="Base House Wireframe Ghosting"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none mix-blend-screen"
                  style={{ opacity: baseHouseGhosting / 100 }}
                />
              </div>

              <svg
                viewBox={computeZoomViewBox(760, 360, calibZoom, calibPan.x, calibPan.y).viewBox}
                className={`relative z-10 w-full h-full object-contain select-none ${calibPan.x !== 0 || calibPan.y !== 0 ? 'cursor-grab' : ''}`}
                onPointerDown={handleCalibMiddleDown}
                onPointerMove={(e) => {
                  if (handleCalibMiddleMove(e)) return;
                  handleNodePointerMove(e);
                }}
                onPointerUp={(e) => {
                  if (handleCalibMiddleUp(e)) return;
                  handleNodePointerUp(e);
                }}
                onPointerLeave={handleCalibMiddleUp}
                onMouseDown={handleCalibMiddleMouseDown}
              >
                {/* 100% Frame Boundary Indicator inside SVG */}
                <rect
                  x="0"
                  y="0"
                  width="760"
                  height="360"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.2"
                  strokeDasharray="6 4"
                  strokeOpacity="0.45"
                />
                {/* Transformed Clip Vector Overlay driven by T_final matrix */}
                <g
                  transform={`translate(${finalMatrix[0][2]}, ${
                    finalMatrix[1][2]
                  }) scale(${finalMatrix[0][0].toFixed(
                    3
                  )}, ${finalMatrix[1][1].toFixed(3)})`}
                >
                  {/* Laser Sky Beams when PROJECT WIREFRAME GRID is active */}
                  {projectWireframeGrid && (
                    <g opacity="0.75">
                      <line
                        x1="190"
                        y1="102"
                        x2="130"
                        y2="10"
                        stroke="#22c55e"
                        strokeWidth="1.5"
                      />
                      <line
                        x1="280"
                        y1="95"
                        x2="255"
                        y2="10"
                        stroke="#00f0ff"
                        strokeWidth="1.5"
                      />
                      <line
                        x1="380"
                        y1="68"
                        x2="395"
                        y2="10"
                        stroke="#22c55e"
                        strokeWidth="1.5"
                      />
                      <line
                        x1="485"
                        y1="95"
                        x2="545"
                        y2="10"
                        stroke="#00f0ff"
                        strokeWidth="1.5"
                      />
                      <line
                        x1="565"
                        y1="102"
                        x2="650"
                        y2="15"
                        stroke="#22c55e"
                        strokeWidth="1.5"
                      />
                    </g>
                  )}

                  {/* Blackout Window Cutouts when APPLY BLACKOUT MASKS is enabled */}
                  {applyBlackoutMasks && (
                    <g
                      fill="rgba(3, 7, 18, 0.88)"
                      stroke="#ef4444"
                      strokeWidth="1.4"
                    >
                      <rect x="330" y="210" width="95" height="62" />
                      <rect x="462" y="205" width="92" height="65" />
                      <rect x="590" y="212" width="44" height="45" />
                    </g>
                  )}
                </g>

                {/* Interactive Warping Calibration Viewport Overlay (Simple vs Corner Pin vs Bezier Mesh) */}
                {warpMode === 'simple' && (
                  <g
                    transform={`translate(${activeOffsetX}, ${activeOffsetY}) translate(380, 182) rotate(${activeRot}) scale(${activeScaleX / 100}, ${activeScaleY / 100}) translate(-380, -182)`}
                    stroke="#00f0ff"
                    strokeWidth="1.5"
                    fill="none"
                  >
                    {/* Cyan Bounding Box Body */}
                    <rect
                      x="90"
                      y="32"
                      width="580"
                      height="300"
                      fill="rgba(0, 240, 255, 0.08)"
                      stroke="#00f0ff"
                      strokeWidth="1.8"
                      className={
                        calibrationMode === 'global' && globalKeyReference.locked
                          ? 'cursor-not-allowed'
                          : 'cursor-move active:opacity-90'
                      }
                      onPointerDown={handleBodyPointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                    />

                    {/* Top Rotation Stalk & Handle */}
                    <line
                      x1="380"
                      y1="32"
                      x2="380"
                      y2="12"
                      stroke="#00f0ff"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx="380"
                      cy="10"
                      r="6"
                      fill="#00f0ff"
                      stroke="#0f172a"
                      strokeWidth="1.5"
                      className="cursor-grab active:cursor-grabbing"
                      onPointerDown={handleRotationPointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                    />

                    {/* 4 Corner Scale Handles */}
                    {[
                      { x: 90, y: 32, idx: 0, cursor: 'cursor-nwse-resize' },
                      { x: 670, y: 32, idx: 2, cursor: 'cursor-nesw-resize' },
                      { x: 90, y: 332, idx: 6, cursor: 'cursor-nesw-resize' },
                      { x: 670, y: 332, idx: 8, cursor: 'cursor-nwse-resize' },
                    ].map((pt) => (
                      <circle
                        key={pt.idx}
                        cx={pt.x}
                        cy={pt.y}
                        r={7.5}
                        fill="#00f0ff"
                        stroke="#0f172a"
                        strokeWidth="2"
                        className={`${pt.cursor} active:scale-125 transition-transform`}
                        onPointerDown={(e) =>
                          handleHandlePointerDown(e, pt.idx, 'corner')
                        }
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                      />
                    ))}

                    {/* Center Move Handle */}
                    <circle
                      cx="380"
                      cy="182"
                      r="6"
                      fill="#0f172a"
                      stroke="#00f0ff"
                      strokeWidth="2"
                      className="cursor-move"
                      onPointerDown={(e) =>
                        handleHandlePointerDown(e, 4, 'center')
                      }
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                    />

                    {/* Center HUD Badge */}
                    <text
                      x="380"
                      y="186"
                      fill="#00f0ff"
                      fontSize="11"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="pointer-events-none select-none drop-shadow"
                    >
                      {calibrationMode === 'global' ? 'GLOBAL MASTER' : 'CLIP DELTA'}: [{activeOffsetX.toFixed(1)}, {activeOffsetY.toFixed(1)}] • {activeScaleX.toFixed(1)}%
                    </text>
                  </g>
                )}

                {/* WARP MODE: 4-CORNER PIN (KEYSTONE) */}
                {warpMode === 'corner-pin' && (
                  <g
                    transform={`translate(${activeOffsetX}, ${activeOffsetY}) translate(380, 182) rotate(${activeRot}) scale(${activeScaleX / 100}, ${activeScaleY / 100}) translate(-380, -182)`}
                  >
                    {(() => {
                      const tl = {
                        x: 90 + cornerPinOffsets.tl.x,
                        y: 32 + cornerPinOffsets.tl.y,
                      };
                      const tr = {
                        x: 670 + cornerPinOffsets.tr.x,
                        y: 32 + cornerPinOffsets.tr.y,
                      };
                      const br = {
                        x: 670 + cornerPinOffsets.br.x,
                        y: 332 + cornerPinOffsets.br.y,
                      };
                      const bl = {
                        x: 90 + cornerPinOffsets.bl.x,
                        y: 332 + cornerPinOffsets.bl.y,
                      };

                      return (
                        <>
                          {/* Skewed Keystone Bounding Polygon */}
                          <polygon
                            points={`${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}`}
                            fill="rgba(245, 158, 11, 0.12)"
                            stroke="#f59e0b"
                            strokeWidth="2"
                            strokeDasharray="6 3"
                          />

                          {/* Keystone Diagonal and Cross Guidelines */}
                          <line
                            x1={tl.x}
                            y1={tl.y}
                            x2={br.x}
                            y2={br.y}
                            stroke="#f59e0b"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                            opacity="0.4"
                          />
                          <line
                            x1={bl.x}
                            y1={bl.y}
                            x2={tr.x}
                            y2={tr.y}
                            stroke="#f59e0b"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                            opacity="0.4"
                          />
                          <line
                            x1={(tl.x + bl.x) / 2}
                            y1={(tl.y + bl.y) / 2}
                            x2={(tr.x + br.x) / 2}
                            y2={(tr.y + br.y) / 2}
                            stroke="#f59e0b"
                            strokeWidth="1.2"
                            strokeDasharray="4 4"
                            opacity="0.6"
                          />
                          <line
                            x1={(tl.x + tr.x) / 2}
                            y1={(tl.y + tr.y) / 2}
                            x2={(bl.x + br.x) / 2}
                            y2={(bl.y + br.y) / 2}
                            stroke="#f59e0b"
                            strokeWidth="1.2"
                            strokeDasharray="4 4"
                            opacity="0.6"
                          />

                          {/* 4 Large Draggable Yellow/Amber Keystone Corner Pins */}
                          {[
                            { key: 'tl' as const, pt: tl, label: 'TL' },
                            { key: 'tr' as const, pt: tr, label: 'TR' },
                            { key: 'br' as const, pt: br, label: 'BR' },
                            { key: 'bl' as const, pt: bl, label: 'BL' },
                          ].map((pin) => (
                            <g key={pin.key} className="cursor-crosshair">
                              <circle
                                cx={pin.pt.x}
                                cy={pin.pt.y}
                                r="11"
                                fill="#f59e0b"
                                stroke="#0f172a"
                                strokeWidth="2.5"
                                className="active:scale-125 transition-transform"
                                onPointerDown={(e) =>
                                  handleCornerPinDown(e, pin.key)
                                }
                                onPointerMove={handleNodePointerMove}
                                onPointerUp={handleNodePointerUp}
                              />
                              <text
                                x={pin.pt.x}
                                y={pin.pt.y + 3.5}
                                fill="#0f172a"
                                fontSize="9"
                                fontFamily="monospace"
                                fontWeight="bold"
                                textAnchor="middle"
                                className="pointer-events-none select-none"
                              >
                                {pin.label}
                              </text>
                            </g>
                          ))}

                          {/* Center HUD Badge */}
                          <text
                            x="380"
                            y="186"
                            fill="#f59e0b"
                            fontSize="11"
                            fontFamily="monospace"
                            fontWeight="bold"
                            textAnchor="middle"
                            className="pointer-events-none select-none drop-shadow"
                          >
                            KEYSTONE PIN: [TL: {cornerPinOffsets.tl.x.toFixed(1)}, {cornerPinOffsets.tl.y.toFixed(1)} | BR: {cornerPinOffsets.br.x.toFixed(1)}, {cornerPinOffsets.br.y.toFixed(1)}]
                          </text>
                        </>
                      );
                    })()}
                  </g>
                )}

                {/* WARP MODE: BEZIER MESH GRID (3x3) */}
                {warpMode === 'bezier-mesh' && (
                  <g
                    transform={`translate(${activeOffsetX}, ${activeOffsetY}) translate(380, 182) rotate(${activeRot}) scale(${activeScaleX / 100}, ${activeScaleY / 100}) translate(-380, -182)`}
                  >
                    {(() => {
                      const meshCols = [90, 380, 670];
                      const meshRows = [32, 182, 332];
                      const meshPoints = [0, 1, 2].flatMap((r) =>
                        [0, 1, 2].map((c) => {
                          const idx = r * 3 + c;
                          const off = meshNodeOffsets[idx] || { x: 0, y: 0 };
                          return {
                            x: meshCols[c] + off.x,
                            y: meshRows[r] + off.y,
                            r,
                            c,
                            idx,
                          };
                        })
                      );

                      return (
                        <>
                          {/* Warped Mesh Boundary Outline */}
                          <polygon
                            points={`${meshPoints[0].x},${meshPoints[0].y} ${meshPoints[1].x},${meshPoints[1].y} ${meshPoints[2].x},${meshPoints[2].y} ${meshPoints[5].x},${meshPoints[5].y} ${meshPoints[8].x},${meshPoints[8].y} ${meshPoints[7].x},${meshPoints[7].y} ${meshPoints[6].x},${meshPoints[6].y} ${meshPoints[3].x},${meshPoints[3].y}`}
                            fill="rgba(34, 197, 94, 0.08)"
                            stroke="#22c55e"
                            strokeWidth="1"
                            strokeDasharray="4 2"
                          />

                          {/* Horizontal Green Bezier Grid Lines */}
                          {[0, 1, 2].map((r) => {
                            const p0 = meshPoints[r * 3 + 0];
                            const p1 = meshPoints[r * 3 + 1];
                            const p2 = meshPoints[r * 3 + 2];
                            const ctrlX = 2 * p1.x - 0.5 * (p0.x + p2.x);
                            const ctrlY = 2 * p1.y - 0.5 * (p0.y + p2.y);
                            return (
                              <path
                                key={`mesh-r-${r}`}
                                d={`M ${p0.x} ${p0.y} Q ${ctrlX} ${ctrlY} ${p2.x} ${p2.y}`}
                                stroke="#22c55e"
                                strokeWidth="2.2"
                                strokeOpacity="0.85"
                                fill="none"
                              />
                            );
                          })}

                          {/* Vertical Green Bezier Grid Lines */}
                          {[0, 1, 2].map((c) => {
                            const p0 = meshPoints[0 * 3 + c];
                            const p1 = meshPoints[1 * 3 + c];
                            const p2 = meshPoints[2 * 3 + c];
                            const ctrlX = 2 * p1.x - 0.5 * (p0.x + p2.x);
                            const ctrlY = 2 * p1.y - 0.5 * (p0.y + p2.y);
                            return (
                              <path
                                key={`mesh-c-${c}`}
                                d={`M ${p0.x} ${p0.y} Q ${ctrlX} ${ctrlY} ${p2.x} ${p2.y}`}
                                stroke="#22c55e"
                                strokeWidth="2.2"
                                strokeOpacity="0.85"
                                fill="none"
                              />
                            );
                          })}

                          {/* 9 Individually Draggable Green Bezier Mesh Nodes */}
                          {meshPoints.map((pt) => (
                            <g key={pt.idx} className="cursor-move">
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r="7.5"
                                fill="#22c55e"
                                stroke="#052e16"
                                strokeWidth="2"
                                className="active:scale-125 transition-transform"
                                onPointerDown={(e) =>
                                  handleMeshNodeDown(e, pt.idx)
                                }
                                onPointerMove={handleNodePointerMove}
                                onPointerUp={handleNodePointerUp}
                              />
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r="2.5"
                                fill="#ffffff"
                                className="pointer-events-none"
                              />
                            </g>
                          ))}

                          {/* Center HUD Badge */}
                          <text
                            x="380"
                            y="186"
                            fill="#22c55e"
                            fontSize="11"
                            fontFamily="monospace"
                            fontWeight="bold"
                            textAnchor="middle"
                            className="pointer-events-none select-none drop-shadow"
                          >
                            BEZIER MESH GRID (3x3): Drag any node to warp surface
                          </text>
                        </>
                      );
                    })()}
                  </g>
                )}

                {/* Optional Crosshairs */}
                {showCrosshairs && (
                  <g stroke="#00f0ff" strokeWidth="1" strokeDasharray="4 4">
                    <line x1="380" y1="0" x2="380" y2="360" />
                    <line x1="0" y1="180" x2="760" y2="180" />
                  </g>
                )}
              </svg>
            </div>

            {/* BASE HOUSE GHOSTING Slider */}
            <div className="w-[175px] shrink-0 pb-2">
              <div className="flex justify-between text-xs font-bold uppercase text-slate-300 mb-1.5">
                <span>BASE HOUSE GHOSTING</span>
                <span className="font-mono text-white">
                  {baseHouseGhosting}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={baseHouseGhosting}
                onChange={(e) =>
                  setCalibrationParams({
                    baseHouseGhosting: Number(e.target.value),
                  })
                }
                className="w-full"
              />
            </div>
          </div>

          {/* BOTTOM PLAYLIST SEQUENCER & TRANSPORT STRIP */}
          <div className="pt-3 shrink-0">
            {/* Playlist Header & Clip Management Toolbar */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                  PLAYLIST SEQUENCER ({playlistClips.length} CLIPS)
                </h3>
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
                  Selected: #{selectedClip.index} ({selectedClip.title})
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Hidden File Input for Video Import */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleFileImport}
                />

                {/* Preset Menu Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowPresetMenu(!showPresetMenu)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#1b2537] hover:bg-[#24334b] border border-[#2f405d] text-[11px] font-bold uppercase text-slate-200 transition-colors cursor-pointer"
                  >
                    <span>PRESET CLIPS</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>
                  {showPresetMenu && (
                    <div className="absolute right-0 bottom-full mb-1 w-60 bg-[#101826] border border-[#2c3d5a] rounded-lg shadow-2xl py-1 z-30">
                      <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase border-b border-[#1e2a3e]">
                        AUSTIN HOUSE SHOW PRESETS
                      </div>
                      {AUSTIN_PRESET_OPTIONS.map((opt) => (
                        <button
                          key={opt.title}
                          type="button"
                          onClick={() => {
                            addPlaylistClip({
                              title: opt.title,
                              videoUrl: opt.videoUrl,
                              thumbnailUrl: opt.thumbnailUrl,
                              themeStyle: opt.themeStyle,
                              durationSec: opt.durationSec,
                              durationFormatted: opt.durationFormatted,
                            });
                            setShowPresetMenu(false);
                            showToast(`Added "${opt.title}" to Playlist`);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-blue-600/30 hover:text-white transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <span className="truncate">{opt.title}</span>
                          <span className="text-[10px] font-mono text-cyan-300 ml-2">
                            {opt.durationFormatted}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* + IMPORT VIDEO CLIP Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-600/25 hover:bg-blue-600/40 border border-blue-400/60 text-[11px] font-bold uppercase text-cyan-200 hover:text-white transition-colors cursor-pointer"
                  title="Import an MP4 video file into the playlist"
                >
                  <Plus className="w-3.5 h-3.5 text-cyan-400" />
                  <span>+ IMPORT CLIP</span>
                </button>

                {/* DUPLICATE CLIP Button */}
                <button
                  type="button"
                  onClick={() => {
                    duplicatePlaylistClip(selectedClipId);
                    showToast(`Duplicated: ${selectedClip.title}`);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#1b2537] hover:bg-[#24334b] border border-[#2f405d] text-[11px] font-bold uppercase text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Duplicate selected clip"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>DUPLICATE</span>
                </button>

                {/* DELETE CLIP Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (playlistClips.length <= 1) {
                      showToast('Cannot delete the only clip in the playlist');
                      return;
                    }
                    deletePlaylistClip(selectedClipId);
                    showToast(`Deleted: ${selectedClip.title}`);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#20181e] hover:bg-red-950/40 border border-red-500/40 text-[11px] font-bold uppercase text-red-300 hover:text-red-200 transition-colors cursor-pointer"
                  title="Delete selected clip"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>DELETE</span>
                </button>
              </div>
            </div>

            {/* Horizontal Timeline of ALL Saved Video Thumbnails (Scrollable Strip) */}
            <div className="flex items-center gap-3 mb-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
              {playlistClips.map((clip, idx) => {
                const isSelected = clip.id === selectedClipId;
                const isCustomOffset =
                  clip.alignmentMode === 'CUSTOM OFFSET ACTIVE';
                return (
                  <div
                    key={clip.id}
                    onClick={() => switchClipWithTransition(clip.id)}
                    className={`min-w-[210px] w-[210px] shrink-0 rounded-lg overflow-hidden border cursor-pointer transition-all bg-[#151d2c] group ${
                      isSelected
                        ? 'border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)] ring-1 ring-amber-400'
                        : 'border-[#26334d] hover:border-slate-500'
                    }`}
                  >
                    <div className="relative h-24 w-full">
                      <ArchitecturalHousePreview
                        variant={
                          clip.themeStyle === 'ice' ? 'modern' : clip.themeStyle
                        }
                        imageUrl={clip.thumbnailUrl}
                        videoUrl={clip.videoUrl}
                        className="w-full h-full"
                      />

                      {/* Reorder Buttons (< and >) in top-left overlay */}
                      <div className="absolute top-1 left-1 flex items-center gap-1 z-10 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            reorderPlaylistClip(clip.id, 'left');
                            showToast(`Moved #${clip.index} Left`);
                          }}
                          className="w-5 h-5 rounded bg-black/80 hover:bg-blue-600 disabled:opacity-30 disabled:hover:bg-black/80 text-white flex items-center justify-center border border-white/20 transition-colors cursor-pointer"
                          title="Move clip left"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === playlistClips.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            reorderPlaylistClip(clip.id, 'right');
                            showToast(`Moved #${clip.index} Right`);
                          }}
                          className="w-5 h-5 rounded bg-black/80 hover:bg-blue-600 disabled:opacity-30 disabled:hover:bg-black/80 text-white flex items-center justify-center border border-white/20 transition-colors cursor-pointer"
                          title="Move clip right"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Status Badge: GLOBAL SYNCED vs CUSTOM OFFSET ACTIVE */}
                      <span
                        className={`absolute top-1.5 right-1.5 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${
                          isCustomOffset
                            ? 'bg-amber-400 text-black'
                            : 'bg-emerald-500 text-black'
                        }`}
                      >
                        {clip.alignmentMode}
                      </span>

                      <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[10px] font-mono text-slate-200">
                        <div className="flex items-center gap-1 bg-black/70 px-1.5 py-0.5 rounded">
                          <Video className="w-3 h-3 text-cyan-300" />
                          <span>#{clip.index}</span>
                        </div>
                        <span className="bg-black/70 px-1.5 py-0.5 rounded">
                          {clip.durationFormatted}
                        </span>
                      </div>
                    </div>
                    <div className="px-2.5 py-1.5 text-xs font-semibold text-slate-200 truncate border-t border-[#232f46] flex items-center justify-between">
                      <span className="truncate">{clip.title}</span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 ml-1.5" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Transport Controls & Transition / Loop Dropdowns */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                {/* LAUNCH LIVE SHOW (SCREEN 9) CTA Button */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveScreen(7);
                    showToast('Launching Live Showtime (Screen 9)...');
                  }}
                  className="px-3.5 py-1.5 rounded-md bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-extrabold text-[11px] tracking-wider uppercase flex items-center gap-1.5 shadow-[0_0_12px_rgba(225,29,72,0.4)] border border-rose-400/80 transition-all cursor-pointer mr-2 animate-pulse"
                  title="Launch full live show projection playback on Screen 9"
                >
                  <Radio className="w-3.5 h-3.5 text-amber-200" />
                  <span>LAUNCH LIVE SHOW (SCREEN 9)</span>
                </button>

                {/* Play Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsVideoPlaying(true);
                    if (calibrationVideoRef.current) {
                      calibrationVideoRef.current.play().catch(() => {});
                    }
                    showToast('Sequencer Playback Resumed');
                  }}
                  title="Play Calibration Video"
                  className={`w-10 h-8 rounded border flex items-center justify-center transition-all cursor-pointer ${
                    isVideoPlaying
                      ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                      : 'bg-[#212b3f] hover:bg-[#2c3954] border-[#33415e] text-slate-300'
                  }`}
                >
                  <Play className="w-4 h-4 fill-current" />
                </button>

                {/* Pause Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsVideoPlaying(false);
                    if (calibrationVideoRef.current) {
                      calibrationVideoRef.current.pause();
                    }
                    showToast('Sequencer Paused');
                  }}
                  title="Pause Calibration Video"
                  className={`w-10 h-8 rounded border flex items-center justify-center transition-all cursor-pointer ${
                    !isVideoPlaying
                      ? 'bg-amber-600 border-amber-400 text-white shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                      : 'bg-[#212b3f] hover:bg-[#2c3954] border-[#33415e] text-slate-300'
                  }`}
                >
                  <Pause className="w-4 h-4 fill-current" />
                </button>

                {/* SkipForward Button */}
                <button
                  type="button"
                  onClick={handleSkipForward}
                  title="Skip to Next Playlist Clip"
                  className="w-10 h-8 rounded bg-[#212b3f] hover:bg-[#2c3954] border border-[#33415e] flex items-center justify-center text-slate-200 cursor-pointer transition-colors"
                >
                  <SkipForward className="w-4 h-4 fill-current" />
                </button>

                {/* Repeat Button */}
                <button
                  type="button"
                  onClick={cycleLoopMode}
                  title={`Loop Mode: ${loopMode} (Click to Cycle)`}
                  className={`w-10 h-8 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                    loopMode === 'INFINITE'
                      ? 'bg-blue-600/30 border-blue-400 text-cyan-300'
                      : 'bg-[#212b3f] hover:bg-[#2c3954] border-[#33415e] text-slate-200'
                  }`}
                >
                  <Repeat className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 ml-3">
                  <span className="text-xs text-slate-400">Transition:</span>
                  <select
                    value={transitionMode}
                    onChange={(e) =>
                      setCalibrationParams({
                        transitionMode: e.target
                          .value as typeof transitionMode,
                      })
                    }
                    className="bg-[#1b2436] border border-[#2f3e5b] rounded px-2.5 py-1 text-xs font-bold text-slate-100"
                  >
                    <option value="CROSSFADE (1.5s)">CROSSFADE (1.5s)</option>
                    <option value="HARD CUT (0.0s)">HARD CUT (0.0s)</option>
                    <option value="DIP TO BLACK (1.0s)">
                      DIP TO BLACK (1.0s)
                    </option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Loop:</span>
                <select
                  value={loopMode}
                  onChange={(e) =>
                    setCalibrationParams({
                      loopMode: e.target.value as typeof loopMode,
                    })
                  }
                  className="bg-[#1b2436] border border-[#2f3e5b] rounded px-3 py-1 text-xs font-bold text-slate-100"
                >
                  <option value="INFINITE">INFINITE</option>
                  <option value="SINGLE PASS">SINGLE PASS</option>
                  <option value="SCHEDULED WINDOW">SCHEDULED WINDOW</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT DUAL-LAYER ALIGNMENT INSPECTOR PANEL */}
        <aside className="w-[310px] shrink-0 bg-[#121926] border-l border-[#222d42] p-4 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            {/* 1. GLOBAL KEY REFERENCE (MASTER) Box */}
            <div className="pb-3.5 border-b border-[#243047]">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200 mb-2">
                GLOBAL KEY REFERENCE (MASTER)
              </h3>
              <div className="flex items-start justify-between text-xs font-mono text-slate-300">
                <div className="space-y-1">
                  <div>
                    Master X/Y [{globalKeyReference.x.toFixed(1)},{' '}
                    {globalKeyReference.y.toFixed(1)}]
                  </div>
                  <div>Scale [{globalKeyReference.scaleX.toFixed(1)}%]</div>
                  <div>
                    Rotation [{globalKeyReference.rotation.toFixed(1)}°]
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateGlobalKeyReference({
                      locked: !globalKeyReference.locked,
                    })
                  }
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#1b2436] border border-[#2f3e5b] text-xs text-slate-200 cursor-pointer"
                >
                  {globalKeyReference.locked ? (
                    <>
                      <Lock className="w-3.5 h-3.5 text-slate-300" />
                      <span>[Locked]</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-amber-400" />
                      <span>[Unlocked]</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleSaveGlobalPreset}
                  className="py-1.5 px-2 rounded bg-[#202b40] hover:bg-[#293752] active:bg-[#1b2538] border border-[#334463] text-[10px] font-bold uppercase text-slate-200 transition-colors cursor-pointer"
                >
                  SAVE GLOBAL PRESET
                </button>
                <button
                  type="button"
                  onClick={handleLoadGlobalPreset}
                  className="py-1.5 px-2 rounded bg-[#202b40] hover:bg-[#293752] active:bg-[#1b2538] border border-[#334463] text-[10px] font-bold uppercase text-slate-200 transition-colors cursor-pointer"
                >
                  LOAD GLOBAL PRESET
                </button>
              </div>
            </div>

            {/* 2. INDIVIDUAL CLIP OFFSET (CHILD DELTA) Panel */}
            <div className="space-y-3">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                  INDIVIDUAL CLIP OFFSET (CHILD DELTA)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  Editing:{' '}
                  <span className="text-slate-200 font-medium">
                    {selectedClip.title.replace(/^\d+\s-\s/, '')} (Clip #0
                    {selectedClip.index})
                  </span>
                </p>
              </div>

              {/* Delta X / Delta Y Spinners */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-slate-400">Delta X</span>
                  <div className="flex items-center bg-[#1c2538] border border-[#30405e] rounded px-2 py-1 font-mono text-white">
                    <span>
                      {selectedClip.deltaOffset.x >= 0 ? '+' : ''}
                      {selectedClip.deltaOffset.x.toFixed(1)} px
                    </span>
                    <div className="flex flex-col ml-1.5 text-[9px] leading-none">
                      <button
                        type="button"
                        onClick={() => nudgeDelta('x', 1)}
                        className="hover:text-cyan-400 cursor-pointer"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => nudgeDelta('x', -1)}
                        className="hover:text-cyan-400 cursor-pointer"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-1">
                  <span className="text-slate-400">Delta Y</span>
                  <div className="flex items-center bg-[#1c2538] border border-[#30405e] rounded px-2 py-1 font-mono text-white">
                    <span>
                      {selectedClip.deltaOffset.y >= 0 ? '+' : ''}
                      {selectedClip.deltaOffset.y.toFixed(1)} px
                    </span>
                    <div className="flex flex-col ml-1.5 text-[9px] leading-none">
                      <button
                        type="button"
                        onClick={() => nudgeDelta('y', 1)}
                        className="hover:text-cyan-400 cursor-pointer"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => nudgeDelta('y', -1)}
                        className="hover:text-cyan-400 cursor-pointer"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </div>

                {/* Scale X/Y & Rot Spinners */}
                <div className="flex items-center justify-between gap-1">
                  <span className="text-slate-400">Scale X/Y</span>
                  <div className="flex items-center bg-[#1c2538] border border-[#30405e] rounded px-2 py-1 font-mono text-white">
                    <span>{selectedClip.deltaOffset.scaleX.toFixed(1)}%</span>
                    <div className="flex flex-col ml-1.5 text-[9px] leading-none">
                      <button
                        type="button"
                        onClick={() => nudgeDelta('scaleX', 1)}
                        className="hover:text-cyan-400 cursor-pointer"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => nudgeDelta('scaleX', -1)}
                        className="hover:text-cyan-400 cursor-pointer"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-1">
                  <span className="text-slate-400">Rot</span>
                  <div className="flex items-center bg-[#1c2538] border border-[#30405e] rounded px-2 py-1 font-mono text-white">
                    <span>
                      {selectedClip.deltaOffset.rotation >= 0 ? '+' : ''}
                      {selectedClip.deltaOffset.rotation.toFixed(1)}°
                    </span>
                    <div className="flex flex-col ml-1.5 text-[9px] leading-none">
                      <button
                        type="button"
                        onClick={() => nudgeDelta('rotation', 1)}
                        className="hover:text-cyan-400 cursor-pointer"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => nudgeDelta('rotation', -1)}
                        className="hover:text-cyan-400 cursor-pointer"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Small nudge resolution buttons */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">
                  Small nudge resolution:
                </span>
                <div className="flex items-center gap-1">
                  {([0.1, 1.0, 5.0] as const).map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() =>
                        setCalibrationParams({ nudgeResolution: res })
                      }
                      className={`px-2 py-0.5 rounded text-[11px] font-mono border cursor-pointer ${
                        nudgeResolution === res
                          ? 'bg-blue-600/30 border-blue-400 text-white font-bold'
                          : 'bg-[#1b2436] border-[#2d3b54] text-slate-300'
                      }`}
                    >
                      {res.toFixed(1)} px
                    </button>
                  ))}
                </div>
              </div>

              {/* Utilities 2x2 Grid */}
              <div className="pt-2">
                <div className="text-xs text-slate-400 mb-2">Utilities:</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => toggleClipBypassOffset(selectedClip.id)}
                    className={`py-2 px-2 rounded border text-[11px] font-bold uppercase cursor-pointer ${
                      selectedClip.bypassOffset
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-[#202b40] hover:bg-[#293752] border-[#334463] text-slate-200'
                    }`}
                  >
                    BYPASS OFFSET
                  </button>
                  <button
                    type="button"
                    onClick={() => resetClipToGlobal(selectedClip.id)}
                    className="py-2 px-2 rounded bg-[#202b40] hover:bg-[#293752] border border-[#334463] text-[11px] font-bold uppercase text-slate-200 cursor-pointer"
                  >
                    RESET TO GLOBAL
                  </button>
                  <button
                    type="button"
                    onClick={() => copyClipOffsetToAll(selectedClip.id)}
                    className="py-2 px-2 rounded bg-[#202b40] hover:bg-[#293752] border border-[#334463] text-[11px] font-bold uppercase text-slate-200 cursor-pointer"
                  >
                    COPY TO OTHER CLIPS
                  </button>
                  <button
                    type="button"
                    onClick={() => bakeClipAlignment(selectedClip.id)}
                    className="py-2 px-2 rounded bg-[#202b40] hover:bg-[#293752] border border-[#334463] text-[11px] font-bold uppercase text-slate-200 cursor-pointer"
                  >
                    BAKE ALIGNMENT
                  </button>
                  <button
                    type="button"
                    onClick={resetCornerPins}
                    className="py-2 px-2 rounded bg-[#202b40] hover:bg-[#293752] border border-amber-500/40 text-[10px] font-bold uppercase text-amber-300 cursor-pointer"
                  >
                    RESET CORNER PINS
                  </button>
                  <button
                    type="button"
                    onClick={resetMeshGrid}
                    className="py-2 px-2 rounded bg-[#202b40] hover:bg-[#293752] border border-emerald-500/40 text-[10px] font-bold uppercase text-emerald-400 cursor-pointer"
                  >
                    RESET MESH GRID
                  </button>
                </div>
              </div>
            </div>

            {/* 3. AUDIO MIXER (VIDEO SOUND & MUSIC OVERLAY) Section */}
            <div className="pt-3.5 border-t border-[#243047] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                    AUDIO MIXER (VIDEO SOUND & MUSIC OVERLAY)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setAudioMixerParams({
                      videoSoundVolume: 80,
                      videoSoundMuted: false,
                      musicOverlayVolume: 80,
                      musicOverlayMuted: false,
                    })
                  }
                  className="px-2 py-0.5 rounded bg-[#1c2638] hover:bg-[#25324a] border border-[#2f3f5c] text-[10px] font-mono font-bold text-cyan-400 cursor-pointer transition-colors shadow-sm"
                  title="Reset Video Sound & Music Overlay to 80% and Unmute Both"
                >
                  RESET 80%
                </button>
              </div>

              {/* Video Sound Channel (Default 80%) */}
              <div className="p-2.5 rounded-lg bg-[#141d2d] border border-[#223048] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[11px] font-bold uppercase text-slate-200">
                      Video Sound (Default 80%)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setAudioMixerParams({
                        videoSoundMuted: !videoSoundMuted,
                      })
                    }
                    className={`p-1 rounded text-xs border cursor-pointer transition-colors ${
                      videoSoundMuted
                        ? 'bg-red-500/20 border-red-500/40 text-red-400'
                        : 'bg-[#1b2538] border-[#2c3d59] text-cyan-400 hover:text-white'
                    }`}
                    title={videoSoundMuted ? 'Unmute Video Sound' : 'Mute Video Sound'}
                  >
                    {videoSoundMuted ? (
                      <VolumeX className="w-3.5 h-3.5" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2">
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
                    className="w-full h-1.5 bg-[#233149] rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <span className="w-10 text-right font-mono text-xs font-bold text-cyan-300">
                    {videoSoundVolume}%
                  </span>
                </div>
              </div>

              {/* Music Overlay Channel (Default 80%) */}
              <div className="p-2.5 rounded-lg bg-[#141d2d] border border-[#223048] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-[11px] font-bold uppercase text-slate-200">
                      Music Overlay (Default 80%)
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setAudioMixerParams({
                          musicOverlayPlaying: !musicOverlayPlaying,
                        })
                      }
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border cursor-pointer transition-colors flex items-center gap-1 ${
                        musicOverlayPlaying
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-[#1b2538] border-[#2c3d59] text-slate-300 hover:text-white'
                      }`}
                      title={musicOverlayPlaying ? 'Pause Music Overlay' : 'Play Music Overlay'}
                    >
                      {musicOverlayPlaying ? (
                        <>
                          <Pause className="w-3 h-3 text-emerald-400" />
                          <span>PAUSE</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 text-slate-300" />
                          <span>PLAY</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setAudioMixerParams({
                          musicOverlayMuted: !musicOverlayMuted,
                        })
                      }
                      className={`p-1 rounded text-xs border cursor-pointer transition-colors ${
                        musicOverlayMuted
                          ? 'bg-red-500/20 border-red-500/40 text-red-400'
                          : 'bg-[#1b2538] border-[#2c3d59] text-purple-400 hover:text-white'
                      }`}
                      title={musicOverlayMuted ? 'Unmute Music Overlay' : 'Mute Music Overlay'}
                    >
                      {musicOverlayMuted ? (
                        <VolumeX className="w-3.5 h-3.5" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Dropdown for AUDIO_OVERLAY_TRACKS */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Track:
                  </label>
                  <div className="relative">
                    <select
                      value={musicOverlayTrackUrl}
                      onChange={(e) =>
                        setAudioMixerParams({
                          musicOverlayTrackUrl: e.target.value,
                        })
                      }
                      className="w-full bg-[#1b2538] border border-[#2d3e5c] rounded px-2 py-1 text-xs text-slate-200 appearance-none pr-6 focus:outline-none focus:border-purple-400 truncate cursor-pointer"
                    >
                      {AUDIO_OVERLAY_TRACKS.map((track) => (
                        <option key={track.id} value={track.url}>
                          {track.title}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2 pointer-events-none" />
                  </div>
                </div>

                {/* Music Volume Slider */}
                <div className="flex items-center gap-2 pt-0.5">
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
                    className="w-full h-1.5 bg-[#233149] rounded-lg appearance-none cursor-pointer accent-purple-400"
                  />
                  <span className="w-10 text-right font-mono text-xs font-bold text-purple-300">
                    {musicOverlayVolume}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom MASTER BLACKOUT [ESC] Button */}
          <button
            type="button"
            onClick={() => toggleMasterBlackout()}
            className={`relative w-full py-5 px-4 rounded-lg font-extrabold text-sm tracking-wider uppercase transition-all border mt-4 cursor-pointer ${
              masterBlackout
                ? 'bg-red-950 border-red-500 text-red-200 animate-pulse'
                : 'bg-[#c82829] hover:bg-[#dc2626] border-red-400/40 text-white shadow-[0_6px_20px_rgba(200,40,41,0.45)]'
            }`}
          >
            <span className="absolute top-1.5 right-2 px-1.5 py-0.5 rounded bg-black/35 text-[10px] font-mono font-semibold text-red-100 border border-white/15">
              ESC
            </span>
            {masterBlackout ? 'RESTORE OUTPUT' : 'MASTER BLACKOUT'}
          </button>
        </aside>
      </div>
    </div>
  );
};
