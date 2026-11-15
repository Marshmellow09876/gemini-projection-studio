import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  RotateCcw,
  Layers,
  Sparkles,
  Video,
  Film,
  Upload,
  Eye,
  Check,
  ChevronDown,
  Volume2,
  VolumeX,
  Sliders,
  FolderPlus,
  Save,
  Crosshair,
  Grid
} from 'lucide-react';
import {
  useProjectionStore,
  VectorLayer,
  VectorVertex,
  PlaylistClip
} from '../../store/useProjectionStore';
import {
  ClipPlacement,
  ClipPlacementMode,
  ClipEndBehavior,
  FitVideoGroupAssignment,
  ProceduralPresetName,
  PROCEDURAL_PRESETS,
  STORAGE_KEY_SCENES_LIBRARY,
  createDefaultPlacement,
  fitPlacementToShapesBoundingBox,
  fitPlacementToFullStage,
  solveHomographyFromUnitSquare,
  invertMatrix3x3,
  applyHomographyToPoint,
  mapStagePointToClipUV,
  isUvInsideClip,
  loadFitVideoGroupAssignments,
  saveFitVideoGroupAssignments,
  createDefaultGroupAssignment,
  renderProceduralAnimation
} from '../../utils/fitVideoToHouseEngine';

export interface FitVideoToHouseModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const FitVideoToHouseModal: React.FC<FitVideoToHouseModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose
}) => {
  const {
    layers,
    playlistClips,
    selectedClipId,
    addPlaylistClip,
    updateLayer,
    showToast
  } = useProjectionStore();

  // Dialog open state fallback
  const [internalOpen, setInternalOpen] = useState(true);
  const isVisible = propIsOpen !== undefined ? propIsOpen : internalOpen;

  const handleClose = () => {
    if (propOnClose) {
      propOnClose();
    } else {
      setInternalOpen(false);
    }
  };

  // Group Assignments (Roof vs Walls/Windows multi-group mapping)
  const [groups, setGroups] = useState<FitVideoGroupAssignment[]>(() => {
    const loaded = loadFitVideoGroupAssignments();
    if (loaded && loaded.length > 0) return loaded;
    return [
      createDefaultGroupAssignment('group-1', 'Group 1: Roof & Gables', []),
      createDefaultGroupAssignment('group-2', 'Group 2: Main Walls & Windows', [])
    ];
  });
  const [activeGroupId, setActiveGroupId] = useState<string>('group-1');

  const activeGroup = useMemo(() => {
    return groups.find((g) => g.id === activeGroupId) || groups[0];
  }, [groups, activeGroupId]);

  // View mode: 'outlines' (shows video overhang with cyan/amber outlines) vs 'preview-fill' (clipped to house polygons)
  const [viewMode, setViewMode] = useState<'outlines' | 'preview-fill'>('outlines');

  // Media source state
  const [mediaSourceType, setMediaSourceType] = useState<'procedural' | 'playlist' | 'file' | 'url'>(
    activeGroup.mediaType === 'image' || activeGroup.mediaType === 'video'
      ? activeGroup.mediaUrl ? 'url' : 'procedural'
      : (activeGroup.mediaType || 'procedural')
  );
  const [selectedProcedural, setSelectedProcedural] = useState<ProceduralPresetName>(
    (activeGroup.proceduralPreset as ProceduralPresetName) || 'Snowy Gingerbread Facade'
  );
  const [mediaUrl, setMediaUrl] = useState<string>(activeGroup.mediaUrl || '');
  const [aspectLocked, setAspectLocked] = useState<boolean>(true);

  // Placement state
  const [placement, setPlacement] = useState<ClipPlacement>(activeGroup.placement);

  // Selected shape IDs for this group
  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>(
    activeGroup.targetShapeIds && activeGroup.targetShapeIds.length > 0
      ? activeGroup.targetShapeIds
      : layers.filter((l) => l.visible).map((l) => l.id)
  );

  // Shape category filter tab
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [durationSec, setDurationSec] = useState<number>(10);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(activeGroup.placement.playbackSpeed || 1.0);
  const [endBehavior, setEndBehavior] = useState<ClipEndBehavior>(activeGroup.placement.endBehavior || 'loop');
  const [isMuted, setIsMuted] = useState<boolean>(true);

  // Scene save modal prompt
  const [isSavingScene, setIsSavingScene] = useState<boolean>(false);
  const [newSceneName, setNewSceneName] = useState<string>('Holiday Architectural Facade');

  // Interactive Canvas & Video Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Dragging & Interaction State
  const [dragHandle, setDragHandle] = useState<
    'body' | 'corner-tl' | 'corner-tr' | 'corner-br' | 'corner-bl' | 'edge-n' | 'edge-s' | 'edge-e' | 'edge-w' | null
  >(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const dragStartPlacement = useRef<ClipPlacement | null>(null);

  // Sync active group changes
  const updateActiveGroup = (updates: Partial<FitVideoGroupAssignment>) => {
    setGroups((prev) => {
      const next = prev.map((g) => (g.id === activeGroupId ? { ...g, ...updates } : g));
      saveFitVideoGroupAssignments(next);
      return next;
    });
  };

  // Sync placement to active group
  const handlePlacementChange = useCallback(
    (newPlacement: ClipPlacement) => {
      setPlacement(newPlacement);
      updateActiveGroup({ placement: newPlacement });
    },
    [activeGroupId]
  );

  // Sync target shapes to active group
  const handleShapeToggle = (id: string) => {
    const next = selectedShapeIds.includes(id)
      ? selectedShapeIds.filter((s) => s !== id)
      : [...selectedShapeIds, id];
    setSelectedShapeIds(next);
    updateActiveGroup({ targetShapeIds: next });
  };

  const handleSelectAllShapes = () => {
    const all = layers.map((l) => l.id);
    setSelectedShapeIds(all);
    updateActiveGroup({ targetShapeIds: all });
  };

  const handleDeselectAllShapes = () => {
    setSelectedShapeIds([]);
    updateActiveGroup({ targetShapeIds: [] });
  };

  // Switch Active Group
  const handleSwitchGroup = (groupId: string) => {
    const target = groups.find((g) => g.id === groupId);
    if (!target) return;
    setActiveGroupId(groupId);
    setPlacement(target.placement);
    setSelectedShapeIds(target.targetShapeIds);
    setMediaUrl(target.mediaUrl);
    if (target.proceduralPreset) {
      setSelectedProcedural(target.proceduralPreset as ProceduralPresetName);
    }
  };

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setMediaUrl(url);
    const isVideo = file.type.startsWith('video');
    setMediaSourceType(isVideo ? 'file' : 'file');
    updateActiveGroup({
      mediaUrl: url,
      mediaType: isVideo ? 'video' : 'image'
    });
    showToast(`Loaded ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`);
  };

  // Quick Fit Actions
  const handleFitToShapes = () => {
    const fitted = fitPlacementToShapesBoundingBox(layers, selectedShapeIds);
    fitted.mode = placement.mode;
    fitted.playbackSpeed = playbackSpeed;
    fitted.endBehavior = endBehavior;
    handlePlacementChange(fitted);
    showToast('Fitted video placement to bounding box of selected house shapes');
  };

  const handleFitFullStage = () => {
    const full = fitPlacementToFullStage();
    full.mode = placement.mode;
    full.playbackSpeed = playbackSpeed;
    full.endBehavior = endBehavior;
    full.targetShapeIds = selectedShapeIds;
    handlePlacementChange(full);
    showToast('Fitted video placement to 16:9 full stage (100% bounds)');
  };

  const handleCenterOnHouse = () => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    layers.forEach((l) => {
      (l.vertices || []).forEach((v) => {
        minX = Math.min(minX, v.x);
        minY = Math.min(minY, v.y);
        maxX = Math.max(maxX, v.x);
        maxY = Math.max(maxY, v.y);
      });
    });
    if (Number.isFinite(minX)) {
      const houseCx = (minX + maxX) / 2;
      const houseCy = (minY + maxY) / 2;
      const newX = houseCx - placement.normW / 2;
      const newY = houseCy - placement.normH / 2;
      const nextPlacement: ClipPlacement = {
        ...placement,
        normX: newX,
        normY: newY,
        corners: [
          { x: newX, y: newY },
          { x: newX + placement.normW, y: newY },
          { x: newX + placement.normW, y: newY + placement.normH },
          { x: newX, y: newY + placement.normH }
        ]
      };
      handlePlacementChange(nextPlacement);
      showToast('Centered placement rectangle on house centroid');
    }
  };

  // Video duration listener
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const handleLoadedMetadata = () => {
      if (vid.duration && Number.isFinite(vid.duration)) {
        setDurationSec(vid.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTimeSec(vid.currentTime);
      if (vid.ended) {
        if (endBehavior === 'loop') {
          vid.currentTime = 0;
          vid.play().catch(() => {});
        } else if (endBehavior === 'play-once-hold') {
          setIsPlaying(false);
        } else if (endBehavior === 'play-once-black') {
          setIsPlaying(false);
        }
      }
    };

    vid.addEventListener('loadedmetadata', handleLoadedMetadata);
    vid.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      vid.removeEventListener('loadedmetadata', handleLoadedMetadata);
      vid.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [endBehavior]);

  // Sync playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Keyboard shortcut listeners (Space = Play/Pause, Esc = Close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Main Canvas Render Loop
  useEffect(() => {
    let lastTimestamp = performance.now();

    const render = (now: number) => {
      const dt = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      if (isPlaying && mediaSourceType === 'procedural') {
        setCurrentTimeSec((t) => (t + dt * playbackSpeed) % 60);
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawStage(ctx, canvas.width, canvas.height);
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    isPlaying,
    currentTimeSec,
    playbackSpeed,
    placement,
    viewMode,
    mediaSourceType,
    selectedProcedural,
    mediaUrl,
    selectedShapeIds,
    layers
  ]);

  // Draw stage helper
  const drawStage = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // 1. Stage ground: Pure black #000000 (lawn/sky zero light spill)
    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, width, height);

    // Subtle stage grid
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    const gridCols = 16;
    const gridRows = 9;
    for (let c = 0; c <= gridCols; c++) {
      ctx.beginPath();
      ctx.moveTo((c / gridCols) * width, 0);
      ctx.lineTo((c / gridCols) * width, height);
      ctx.stroke();
    }
    for (let r = 0; r <= gridRows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, (r / gridRows) * height);
      ctx.lineTo(width, (r / gridRows) * height);
      ctx.stroke();
    }

    const scaleX = width / 100;
    const scaleY = height / 100;

    // Helper to render media source to an offscreen canvas
    const offscreen = document.createElement('canvas');
    offscreen.width = 640;
    offscreen.height = 360;
    const offCtx = offscreen.getContext('2d');
    if (offCtx) {
      if (mediaSourceType === 'procedural') {
        renderProceduralAnimation(offCtx, selectedProcedural, currentTimeSec, 640, 360);
      } else if (videoRef.current && videoRef.current.readyState >= 2) {
        try {
          offCtx.drawImage(videoRef.current, 0, 0, 640, 360);
        } catch {
          renderProceduralAnimation(offCtx, 'Snowy Gingerbread Facade', currentTimeSec, 640, 360);
        }
      } else {
        renderProceduralAnimation(offCtx, selectedProcedural, currentTimeSec, 640, 360);
      }
    }

    // Trace polygon path helper
    const traceLayerPath = (layer: VectorLayer) => {
      const pts = layer.vertices || [];
      if (pts.length < 3) return false;
      ctx.beginPath();
      ctx.moveTo(pts[0].x * scaleX, pts[0].y * scaleY);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x * scaleX, pts[i].y * scaleY);
      }
      ctx.closePath();
      return true;
    };

    // Calculate placement quad in canvas pixels
    let quadPx: [VectorVertex, VectorVertex, VectorVertex, VectorVertex];
    if (placement.mode === 'corner-pin') {
      quadPx = [
        { x: placement.corners[0].x * scaleX, y: placement.corners[0].y * scaleY },
        { x: placement.corners[1].x * scaleX, y: placement.corners[1].y * scaleY },
        { x: placement.corners[2].x * scaleX, y: placement.corners[2].y * scaleY },
        { x: placement.corners[3].x * scaleX, y: placement.corners[3].y * scaleY }
      ];
    } else {
      const rx = placement.normX * scaleX;
      const ry = placement.normY * scaleY;
      const rw = placement.normW * scaleX;
      const rh = placement.normH * scaleY;
      quadPx = [
        { x: rx, y: ry },
        { x: rx + rw, y: ry },
        { x: rx + rw, y: ry + rh },
        { x: rx, y: ry + rh }
      ];
    }

    // 2. Draw Video/Media Source
    ctx.save();

    if (viewMode === 'preview-fill') {
      // PREVIEW FILL MODE: Stencil-clip strictly to selected house shapes
      const targetLayers = layers.filter(
        (l) => selectedShapeIds.includes(l.id) && l.visible && l.role !== 'Hard Blackout Cutout'
      );

      ctx.beginPath();
      targetLayers.forEach((layer) => {
        const pts = layer.vertices || [];
        if (pts.length < 3) return;
        ctx.moveTo(pts[0].x * scaleX, pts[0].y * scaleY);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x * scaleX, pts[i].y * scaleY);
        }
        ctx.closePath();
      });
      ctx.clip();
    }

    // Render media inside placement quad
    if (placement.mode === 'rect') {
      const rx = placement.normX * scaleX;
      const ry = placement.normY * scaleY;
      const rw = placement.normW * scaleX;
      const rh = placement.normH * scaleY;

      ctx.save();
      if (placement.rotationDeg) {
        ctx.translate(rx + rw / 2, ry + rh / 2);
        ctx.rotate((placement.rotationDeg * Math.PI) / 180);
        ctx.drawImage(offscreen, -rw / 2, -rh / 2, rw, rh);
      } else {
        ctx.drawImage(offscreen, rx, ry, rw, rh);
      }
      ctx.restore();
    } else {
      // Corner Pin Perspective Warp rendering onto canvas
      // Triangulate quad into two triangles and map texture
      drawWarpedQuad(ctx, offscreen, quadPx);
    }

    ctx.restore();

    // 3. Punch Out Blackout Masks (in both modes)
    const blackoutLayers = layers.filter(
      (l) => l.role === 'Hard Blackout Cutout' || l.category === 'Blackout Masks'
    );
    blackoutLayers.forEach((layer) => {
      if (traceLayerPath(layer)) {
        ctx.fillStyle = '#000000';
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });

    // 4. In Outlines Mode: Draw House Outlines and Handles OVER the Video
    if (viewMode === 'outlines') {
      // Draw all house layer outlines
      layers.forEach((layer) => {
        if (!layer.visible) return;
        const isSelected = selectedShapeIds.includes(layer.id);
        const pts = layer.vertices || [];
        if (pts.length < 3) return;

        ctx.beginPath();
        ctx.moveTo(pts[0].x * scaleX, pts[0].y * scaleY);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x * scaleX, pts[i].y * scaleY);
        }
        ctx.closePath();

        if (isSelected) {
          ctx.fillStyle = 'rgba(6, 182, 212, 0.12)'; // Cyan tint
          ctx.fill();
          ctx.strokeStyle = '#06b6d4'; // Cyan outline
          ctx.lineWidth = 2.0;
          ctx.stroke();
        } else {
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
          ctx.lineWidth = 1.0;
          ctx.stroke();
        }
      });

      // Draw Placement Boundary Box & Diamond Handles
      ctx.strokeStyle = '#f59e0b'; // Amber placement border
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(quadPx[0].x, quadPx[0].y);
      ctx.lineTo(quadPx[1].x, quadPx[1].y);
      ctx.lineTo(quadPx[2].x, quadPx[2].y);
      ctx.lineTo(quadPx[3].x, quadPx[3].y);
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Corner Handles
      const handleLabels = ['TL', 'TR', 'BR', 'BL'];
      quadPx.forEach((corner, idx) => {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        if (placement.mode === 'corner-pin') {
          // Diamond handle for corner-pin
          ctx.moveTo(corner.x, corner.y - 7);
          ctx.lineTo(corner.x + 7, corner.y);
          ctx.lineTo(corner.x, corner.y + 7);
          ctx.lineTo(corner.x - 7, corner.y);
        } else {
          // Square handle for rect
          ctx.rect(corner.x - 5, corner.y - 5, 10, 10);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label
        ctx.fillStyle = '#f8fafc';
        ctx.font = '9px monospace';
        ctx.fillText(handleLabels[idx], corner.x + 8, corner.y - 6);
      });

      // Draw Midpoint Edge Handles (in rect mode)
      if (placement.mode === 'rect') {
        const midN = { x: (quadPx[0].x + quadPx[1].x) / 2, y: (quadPx[0].y + quadPx[1].y) / 2 };
        const midE = { x: (quadPx[1].x + quadPx[2].x) / 2, y: (quadPx[1].y + quadPx[2].y) / 2 };
        const midS = { x: (quadPx[2].x + quadPx[3].x) / 2, y: (quadPx[2].y + quadPx[3].y) / 2 };
        const midW = { x: (quadPx[3].x + quadPx[0].x) / 2, y: (quadPx[3].y + quadPx[0].y) / 2 };

        [midN, midE, midS, midW].forEach((mid) => {
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(mid.x, mid.y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      }
    }
  };

  // Helper to draw textured quad with homography / affine subdivision
  const drawWarpedQuad = (
    ctx: CanvasRenderingContext2D,
    image: HTMLCanvasElement,
    pts: [VectorVertex, VectorVertex, VectorVertex, VectorVertex]
  ) => {
    // Subdivide quad into 2 triangles: (0, 1, 2) and (0, 2, 3)
    const drawTri = (
      p0: VectorVertex, p1: VectorVertex, p2: VectorVertex,
      u0: number, v0: number, u1: number, v1: number, u2: number, v2: number
    ) => {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.closePath();
      ctx.clip();

      const denom = (u0 * (v1 - v2) - u1 * (v0 - v2) + u2 * (v0 - v1));
      if (Math.abs(denom) > 1e-6) {
        const a = (p0.x * (v1 - v2) - p1.x * (v0 - v2) + p2.x * (v0 - v1)) / denom;
        const b = (p0.y * (v1 - v2) - p1.y * (v0 - v2) + p2.y * (v0 - v1)) / denom;
        const c = (u0 * (p1.x - p2.x) - u1 * (p0.x - p2.x) + u2 * (p0.x - p1.x)) / denom;
        const d = (u0 * (p1.y - p2.y) - u1 * (p0.y - p2.y) + u2 * (p0.y - p1.y)) / denom;
        const e = p0.x - a * u0 - c * v0;
        const f = p0.y - b * u0 - d * v0;

        ctx.transform(a, b, c, d, e, f);
        ctx.drawImage(image, 0, 0);
      }
      ctx.restore();
    };

    const iw = image.width;
    const ih = image.height;
    drawTri(pts[0], pts[1], pts[2], 0, 0, iw, 0, iw, ih);
    drawTri(pts[0], pts[2], pts[3], 0, 0, iw, ih, 0, ih);
  };

  // Canvas Mouse Interaction: Pan and Corner Handles
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * 100;
    const my = ((e.clientY - rect.top) / rect.height) * 100;

    dragStartPos.current = { x: mx, y: my };
    dragStartPlacement.current = { ...placement, corners: [...placement.corners] };

    // Check hit test against corner handles
    const hitRadius = 3.5; // in stage percent coordinates
    const corners = placement.corners;

    if (Math.hypot(mx - corners[0].x, my - corners[0].y) < hitRadius) {
      setDragHandle('corner-tl');
      return;
    }
    if (Math.hypot(mx - corners[1].x, my - corners[1].y) < hitRadius) {
      setDragHandle('corner-tr');
      return;
    }
    if (Math.hypot(mx - corners[2].x, my - corners[2].y) < hitRadius) {
      setDragHandle('corner-br');
      return;
    }
    if (Math.hypot(mx - corners[3].x, my - corners[3].y) < hitRadius) {
      setDragHandle('corner-bl');
      return;
    }

    // Check hit test inside placement box for body pan
    if (
      mx >= placement.normX &&
      mx <= placement.normX + placement.normW &&
      my >= placement.normY &&
      my <= placement.normY + placement.normH
    ) {
      setDragHandle('body');
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragHandle || !dragStartPos.current || !dragStartPlacement.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * 100;
    const my = ((e.clientY - rect.top) / rect.height) * 100;

    const dx = mx - dragStartPos.current.x;
    const dy = my - dragStartPos.current.y;
    const init = dragStartPlacement.current;

    if (dragHandle === 'body') {
      const newX = init.normX + dx;
      const newY = init.normY + dy;
      const newCorners: [VectorVertex, VectorVertex, VectorVertex, VectorVertex] = [
        { x: init.corners[0].x + dx, y: init.corners[0].y + dy },
        { x: init.corners[1].x + dx, y: init.corners[1].y + dy },
        { x: init.corners[2].x + dx, y: init.corners[2].y + dy },
        { x: init.corners[3].x + dx, y: init.corners[3].y + dy }
      ];
      handlePlacementChange({
        ...placement,
        normX: newX,
        normY: newY,
        corners: newCorners
      });
    } else if (placement.mode === 'corner-pin') {
      // 4-corner perspective warp pulls individual corner alone
      const nextCorners = [...placement.corners] as [VectorVertex, VectorVertex, VectorVertex, VectorVertex];
      if (dragHandle === 'corner-tl') nextCorners[0] = { x: init.corners[0].x + dx, y: init.corners[0].y + dy };
      if (dragHandle === 'corner-tr') nextCorners[1] = { x: init.corners[1].x + dx, y: init.corners[1].y + dy };
      if (dragHandle === 'corner-br') nextCorners[2] = { x: init.corners[2].x + dx, y: init.corners[2].y + dy };
      if (dragHandle === 'corner-bl') nextCorners[3] = { x: init.corners[3].x + dx, y: init.corners[3].y + dy };
      handlePlacementChange({
        ...placement,
        corners: nextCorners
      });
    } else {
      // Rect mode scale anchored against opposite corner
      let newX = init.normX;
      let newY = init.normY;
      let newW = init.normW;
      let newH = init.normH;

      if (dragHandle === 'corner-br') {
        newW = Math.max(5, init.normW + dx);
        newH = aspectLocked ? newW * (9 / 16) : Math.max(5, init.normH + dy);
      } else if (dragHandle === 'corner-tl') {
        newW = Math.max(5, init.normW - dx);
        newH = aspectLocked ? newW * (9 / 16) : Math.max(5, init.normH - dy);
        newX = init.normX + (init.normW - newW);
        newY = init.normY + (init.normH - newH);
      } else if (dragHandle === 'corner-tr') {
        newW = Math.max(5, init.normW + dx);
        newH = aspectLocked ? newW * (9 / 16) : Math.max(5, init.normH - dy);
        newY = init.normY + (init.normH - newH);
      } else if (dragHandle === 'corner-bl') {
        newW = Math.max(5, init.normW - dx);
        newH = aspectLocked ? newW * (9 / 16) : Math.max(5, init.normH + dy);
        newX = init.normX + (init.normW - newW);
      }

      handlePlacementChange({
        ...placement,
        normX: newX,
        normY: newY,
        normW: newW,
        normH: newH,
        corners: [
          { x: newX, y: newY },
          { x: newX + newW, y: newY },
          { x: newX + newW, y: newY + newH },
          { x: newX, y: newY + newH }
        ]
      });
    }
  };

  const handleMouseUp = () => {
    setDragHandle(null);
    dragStartPos.current = null;
    dragStartPlacement.current = null;
  };

  // Commit Action: Assign to Selected Shapes
  const handleAssignToShapes = () => {
    const updatedCount = selectedShapeIds.length;
    if (updatedCount === 0) {
      showToast('No shapes selected to assign video placement');
      return;
    }

    selectedShapeIds.forEach((shapeId) => {
      updateLayer(shapeId, {
        archTag: `Fitted Video Group: ${activeGroup.name}`,
        colorModifier: {
          blendMode: 'normal',
          tintColor: '#ffffff',
          opacity: 1.0,
          audioReactive: false,
          audioTriggerBand: 'all',
          reactiveEffect: 'pulse',
          reactiveIntensity: 0
        }
      });
    });

    showToast(`Assigned video to ${updatedCount} house shapes with shared UV sampling`);
    handleClose();
  };

  // Commit Action: Save as Scene
  const handleSaveScene = () => {
    if (!newSceneName.trim()) return;

    // Save into localStorage scenes library
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SCENES_LIBRARY);
      const scenes = raw ? JSON.parse(raw) : [];
      const newSceneEntry = {
        id: `scene-${Date.now()}`,
        name: newSceneName.trim(),
        groupId: activeGroupId,
        groupName: activeGroup.name,
        targetShapeIds: selectedShapeIds,
        mediaType: mediaSourceType,
        mediaUrl: mediaUrl || (mediaSourceType === 'procedural' ? selectedProcedural : ''),
        placement,
        speed: playbackSpeed,
        endBehavior,
        timestamp: new Date().toISOString()
      };
      scenes.unshift(newSceneEntry);
      localStorage.setItem(STORAGE_KEY_SCENES_LIBRARY, JSON.stringify(scenes));

      // Also create a matching PlaylistClip in the project store
      addPlaylistClip({
        title: newSceneName.trim(),
        durationSec: Math.round(durationSec),
        durationFormatted: `${Math.floor(durationSec / 60)}:${Math.floor(durationSec % 60)
          .toString()
          .padStart(2, '0')}`,
        videoUrl: mediaUrl || '',
        prompt: `Architectural video mapped onto ${selectedShapeIds.length} house shapes (${activeGroup.name})`,
        themeStyle: 'modern',
        status: 'Queued'
      });

      showToast(`Saved scene "${newSceneName.trim()}" to Scene Library & Playlist`);
      setIsSavingScene(false);
      handleClose();
    } catch (err) {
      console.error('Failed to save scene', err);
      showToast('Error saving scene');
    }
  };

  // Filtered layers based on category tab
  const filteredLayers = useMemo(() => {
    if (categoryFilter === 'All') return layers;
    if (categoryFilter === 'Walls') return layers.filter((l) => l.category === 'Main Walls');
    if (categoryFilter === 'Roof') return layers.filter((l) => l.category === 'Roofline');
    if (categoryFilter === 'Windows') return layers.filter((l) => l.category === 'Windows');
    if (categoryFilter === 'Garage') return layers.filter((l) => l.category === 'Garage');
    if (categoryFilter === 'Pillars') return layers.filter((l) => l.category === 'Pillars');
    return layers;
  }, [layers, categoryFilter]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 select-none font-sans animate-in fade-in duration-200">
      {/* Hidden video element for decoding/playback */}
      {mediaUrl && (
        <video
          ref={videoRef}
          src={mediaUrl}
          playsInline
          muted={isMuted}
          autoPlay={isPlaying}
          crossOrigin="anonymous"
          className="hidden"
        />
      )}

      <div className="w-full max-w-7xl h-[94vh] bg-[#0b121e] border border-[#213047] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 bg-[#0e1626] border-b border-[#1b2638] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-950/80 border border-cyan-800/60 rounded-xl text-cyan-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white tracking-wide">
                  Fit Video to House Studio
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-cyan-900/50 text-cyan-300 border border-cyan-700/50 rounded-full">
                  Blueprint §22-A..E Parity
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Shared UV sampling without slicing video files • Zero lawn & sky spill
              </div>
            </div>
          </div>

          {/* Group Switcher Tabs */}
          <div className="flex items-center gap-1.5 bg-[#080d16] p-1 rounded-xl border border-[#1e293b]">
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => handleSwitchGroup(group.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeGroupId === group.id
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#121c2d]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                {group.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2538] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Studio Workspace Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Stage & Canvas (Left/Center ~70%) */}
          <div className="flex-1 flex flex-col bg-[#070b13] p-4 border-r border-[#1a2538] overflow-hidden">
            {/* View Mode & Quick Placement Actions Toolbar */}
            <div className="flex items-center justify-between pb-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider mr-1">
                  View Mode:
                </span>
                <button
                  type="button"
                  onClick={() => setViewMode('outlines')}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                    viewMode === 'outlines'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                      : 'bg-[#111a28] text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Outlines & Overhang
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('preview-fill')}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                    viewMode === 'preview-fill'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                      : 'bg-[#111a28] text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Live Preview Fill (Projector View)
                </button>
              </div>

              {/* Quick Fit Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleFitToShapes}
                  title="Fit placement rectangle to bounding box of selected house shapes"
                  className="px-2.5 py-1.5 rounded-lg bg-[#111c2e] hover:bg-[#1a2942] text-slate-200 border border-[#233550] flex items-center gap-1 font-semibold text-[11px] transition-colors"
                >
                  <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                  Fit to Shapes
                </button>
                <button
                  type="button"
                  onClick={handleFitFullStage}
                  title="Fit placement to full 16:9 stage (0,0 to 100,100)"
                  className="px-2.5 py-1.5 rounded-lg bg-[#111c2e] hover:bg-[#1a2942] text-slate-200 border border-[#233550] flex items-center gap-1 font-semibold text-[11px] transition-colors"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                  Fit 16:9 Stage
                </button>
                <button
                  type="button"
                  onClick={handleCenterOnHouse}
                  title="Center current placement on the house"
                  className="px-2.5 py-1.5 rounded-lg bg-[#111c2e] hover:bg-[#1a2942] text-slate-200 border border-[#233550] flex items-center gap-1 font-semibold text-[11px] transition-colors"
                >
                  <Grid className="w-3.5 h-3.5 text-slate-400" />
                  Center
                </button>

                {/* Rect vs Corner Pin Toggle */}
                <div className="ml-2 pl-2 border-l border-[#1f2d42] flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const nextMode: ClipPlacementMode =
                        placement.mode === 'rect' ? 'corner-pin' : 'rect';
                      handlePlacementChange({ ...placement, mode: nextMode });
                    }}
                    className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] border transition-all ${
                      placement.mode === 'corner-pin'
                        ? 'bg-purple-900/40 text-purple-300 border-purple-600'
                        : 'bg-[#111c2e] text-slate-300 border-[#233550]'
                    }`}
                  >
                    {placement.mode === 'corner-pin' ? '4-Corner Pin Warp' : 'Rect Mode'}
                  </button>
                  {placement.mode === 'rect' && (
                    <button
                      type="button"
                      onClick={() => setAspectLocked(!aspectLocked)}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
                        aspectLocked
                          ? 'bg-cyan-950 text-cyan-400 border-cyan-800'
                          : 'bg-[#111c2e] text-slate-400 border-[#233550]'
                      }`}
                    >
                      {aspectLocked ? '16:9 Locked' : 'Free Aspect'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Interactive Canvas Container (16:9 Aspect Ratio) */}
            <div className="flex-1 relative flex items-center justify-center min-h-0 bg-[#04060c] rounded-xl border border-[#1b283d] overflow-hidden shadow-inner">
              <canvas
                ref={canvasRef}
                width={1280}
                height={720}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="max-w-full max-h-full aspect-video object-contain cursor-crosshair"
              />

              {/* Status HUD Overhang Overlay */}
              <div className="absolute top-3 left-3 pointer-events-none flex flex-col gap-1.5 font-mono text-[11px]">
                <div className="px-2.5 py-1 bg-black/75 backdrop-blur-md rounded-md border border-white/10 text-slate-300">
                  Target Shapes: <span className="text-cyan-400 font-bold">{selectedShapeIds.length}</span>
                </div>
                <div className="px-2.5 py-1 bg-black/75 backdrop-blur-md rounded-md border border-white/10 text-slate-300">
                  Placement Rect: [{placement.normX.toFixed(1)}%, {placement.normY.toFixed(1)}%, {placement.normW.toFixed(1)}% × {placement.normH.toFixed(1)}%]
                </div>
              </div>
            </div>

            {/* Bottom Playback & Scrub Bar */}
            <div className="pt-3 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const next = !isPlaying;
                    setIsPlaying(next);
                    if (videoRef.current) {
                      if (next) videoRef.current.play().catch(() => {});
                      else videoRef.current.pause();
                    }
                  }}
                  className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg transition-colors"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>

                {/* Timeline Slider */}
                <div className="flex-1 flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-400 w-12 text-right">
                    {currentTimeSec.toFixed(1)}s
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={durationSec}
                    step={0.1}
                    value={currentTimeSec}
                    onChange={(e) => {
                      const t = parseFloat(e.target.value);
                      setCurrentTimeSec(t);
                      if (videoRef.current) videoRef.current.currentTime = t;
                    }}
                    className="flex-1 accent-cyan-500 h-1.5 bg-[#172338] rounded-lg cursor-pointer"
                  />
                  <span className="font-mono text-xs text-slate-400 w-12">
                    {durationSec.toFixed(1)}s
                  </span>
                </div>

                {/* Speed Multipliers */}
                <div className="flex items-center gap-1 bg-[#101928] p-1 rounded-lg border border-[#1e2e46] text-[11px] font-mono">
                  {[0.5, 1.0, 1.5, 2.0].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setPlaybackSpeed(s)}
                      className={`px-2 py-0.5 rounded ${
                        playbackSpeed === s
                          ? 'bg-cyan-700 text-white font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>

                {/* End Behavior Selector */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400">End:</span>
                  <select
                    value={endBehavior}
                    onChange={(e) => setEndBehavior(e.target.value as ClipEndBehavior)}
                    className="bg-[#101928] border border-[#1e2e46] text-slate-200 text-xs rounded-lg px-2 py-1 outline-none font-semibold cursor-pointer"
                  >
                    <option value="loop">Loop Seamlessly</option>
                    <option value="play-once-hold">Play Once & Hold</option>
                    <option value="play-once-black">Play Once & Cut to Black</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Configuration Sidebar (Right ~30%) */}
          <div className="w-96 flex flex-col bg-[#0b121e] overflow-y-auto">
            {/* Step 1: Media Source Selection */}
            <div className="p-4 border-b border-[#182335]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-cyan-400" />
                  Media Source
                </span>
                <span className="text-[10px] text-cyan-400 font-mono font-semibold">Step 1</span>
              </div>

              {/* Source Type Selector */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-[#090f19] rounded-xl border border-[#1a2538] mb-3 text-xs">
                <button
                  type="button"
                  onClick={() => setMediaSourceType('procedural')}
                  className={`py-1.5 rounded-lg font-semibold transition-all ${
                    mediaSourceType === 'procedural'
                      ? 'bg-cyan-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Procedural
                </button>
                <button
                  type="button"
                  onClick={() => setMediaSourceType('playlist')}
                  className={`py-1.5 rounded-lg font-semibold transition-all ${
                    mediaSourceType === 'playlist'
                      ? 'bg-cyan-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Playlist
                </button>
                <button
                  type="button"
                  onClick={() => setMediaSourceType('file')}
                  className={`py-1.5 rounded-lg font-semibold transition-all ${
                    mediaSourceType === 'file'
                      ? 'bg-cyan-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Upload
                </button>
              </div>

              {/* Procedural Preset Dropdown */}
              {mediaSourceType === 'procedural' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">
                    Holiday Animation Preset
                  </label>
                  <select
                    value={selectedProcedural}
                    onChange={(e) => {
                      const p = e.target.value as ProceduralPresetName;
                      setSelectedProcedural(p);
                      updateActiveGroup({ proceduralPreset: p, mediaType: 'procedural' });
                    }}
                    className="w-full bg-[#121b2a] border border-[#223249] rounded-lg px-3 py-2 text-xs text-white outline-none font-semibold cursor-pointer"
                  >
                    {PROCEDURAL_PRESETS.map((preset) => (
                      <option key={preset} value={preset}>
                        {preset}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Playlist Clip Picker */}
              {mediaSourceType === 'playlist' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">
                    Project Playlist Clip
                  </label>
                  <select
                    value={mediaUrl}
                    onChange={(e) => {
                      const url = e.target.value;
                      setMediaUrl(url);
                      updateActiveGroup({ mediaUrl: url, mediaType: 'video' });
                    }}
                    className="w-full bg-[#121b2a] border border-[#223249] rounded-lg px-3 py-2 text-xs text-white outline-none font-semibold cursor-pointer"
                  >
                    <option value="">Select a project video clip...</option>
                    {playlistClips.map((clip) => (
                      <option key={clip.id} value={clip.videoUrl}>
                        {clip.title} ({clip.durationFormatted})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Local File Upload */}
              {mediaSourceType === 'file' && (
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">
                    Upload Local MP4 / WebM / Image
                  </label>
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#233550] hover:border-cyan-500/60 rounded-xl p-4 cursor-pointer bg-[#0e1624] transition-colors">
                    <Upload className="w-5 h-5 text-cyan-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-200">
                      Choose video or still image
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      Direct local decoding via blob URL
                    </span>
                    <input
                      type="file"
                      accept="video/*,image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Step 2: Target Shape Assignment */}
            <div className="flex-1 p-4 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Target House Shapes
                </span>
                <span className="text-[10px] text-cyan-400 font-mono font-semibold">Step 2</span>
              </div>

              {/* Category Quick Filter Pills */}
              <div className="flex flex-wrap gap-1 mb-2.5">
                {['All', 'Walls', 'Roof', 'Windows', 'Garage', 'Pillars'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${
                      categoryFilter === cat
                        ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-700/60'
                        : 'bg-[#101826] text-slate-400 hover:text-white border border-[#1b283d]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Quick Select / Deselect All */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 px-1">
                <span>
                  Selected: <b className="text-cyan-400">{selectedShapeIds.length}</b> / {layers.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllShapes}
                    className="hover:text-cyan-300 underline"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAllShapes}
                    className="hover:text-amber-300 underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Scrollable Shape Checkbox List */}
              <div className="flex-1 overflow-y-auto space-y-1 pr-1 border border-[#1a2538] rounded-xl p-2 bg-[#090e18]">
                {filteredLayers.map((layer) => {
                  const isChecked = selectedShapeIds.includes(layer.id);
                  const isBlackout = layer.role === 'Hard Blackout Cutout' || layer.category === 'Blackout Masks';

                  return (
                    <label
                      key={layer.id}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                        isChecked
                          ? 'bg-cyan-950/40 border border-cyan-800/40 text-cyan-200'
                          : 'hover:bg-[#121b2b] text-slate-300 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleShapeToggle(layer.id)}
                          className="accent-cyan-500 rounded"
                        />
                        <span className="truncate font-medium">{layer.name}</span>
                      </div>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                          isBlackout
                            ? 'bg-red-950 text-red-400 border border-red-800'
                            : 'bg-[#182336] text-slate-400'
                        }`}
                      >
                        {layer.category}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Commit & Save Controls */}
            <div className="p-4 bg-[#0e1626] border-t border-[#182335] space-y-2.5">
              <button
                type="button"
                onClick={handleAssignToShapes}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-all"
              >
                <Check className="w-4 h-4" />
                Assign Video to Selected Shapes
              </button>

              <button
                type="button"
                onClick={() => setIsSavingScene(true)}
                className="w-full py-2 rounded-xl bg-[#131f32] hover:bg-[#1a2a44] text-slate-200 border border-[#233550] font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <FolderPlus className="w-4 h-4 text-amber-400" />
                Save as Named Scene...
              </button>
            </div>
          </div>
        </div>

        {/* Modal Prompt: Save As Scene */}
        {isSavingScene && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#0e1626] border border-[#213047] rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <Save className="w-4 h-4 text-amber-400" />
                  Save as Scene Library Entry
                </span>
                <button
                  type="button"
                  onClick={() => setIsSavingScene(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">
                  Scene Name
                </label>
                <input
                  type="text"
                  value={newSceneName}
                  onChange={(e) => setNewSceneName(e.target.value)}
                  className="w-full bg-[#141f30] border border-[#233550] rounded-lg px-3 py-2 text-sm text-white font-medium outline-none focus:border-cyan-500"
                  placeholder="e.g. Christmas Blizzard Facade"
                />
              </div>

              <div className="text-[11px] text-slate-400 font-mono bg-[#090f19] p-3 rounded-lg border border-[#1b2638]">
                Bakes: Group "{activeGroup.name}", {selectedShapeIds.length} shapes, speed {playbackSpeed}x, mode {placement.mode}.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSavingScene(false)}
                  className="px-4 py-2 rounded-lg bg-[#141f30] hover:bg-[#1d2d46] text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveScene}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow"
                >
                  Commit Scene
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
