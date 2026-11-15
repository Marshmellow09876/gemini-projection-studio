import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MousePointer,
  PenTool,
  Square,
  Spline,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronRight,
  ChevronDown,
  Trash2,
  Download,
  Upload,
  Plus,
  Copy,
  RotateCcw,
  Focus,
  FlipHorizontal,
  FlipVertical,
  Undo2,
  Redo2,
  ArrowLeft,
  Save,
  Shield,
  Sliders,
  Sun,
  Layers,
  Activity,
  Check,
  Zap,
  Tag,
  Move,
  Grid,
  Palette,
  Scissors,
} from 'lucide-react';
import { clipPolygon, subdividePolygonToBricks } from '../utils/polygonBoolean';
import {
  AUSTIN_HOUSE_ASSETS,
  MaskRole,
  VectorVertex,
  VectorLayer,
  useProjectionStore,
} from '../store/useProjectionStore';
import {
  PreviewZoomControl,
  computeZoomViewBox,
  useMiddleClickPan,
} from '../components/PreviewZoomControl';

const LAYER_CATEGORIES: VectorLayer['category'][] = [
  'Roofline',
  'Garage',
  'Pillars',
  'Main Walls',
  'Windows',
  'Blackout Masks',
];

export const Screen2LayoutMapping: React.FC = () => {
  const {
    activeVectorTool,
    snapVertices,
    snap90Deg,
    showGrid,
    liveTraceOnHouse,
    canvasZoom,
    cursorCoords,
    layers,
    selectedLayerId,
    customReferencePhotoUrl,
    setVectorToolbar,
    addLayer,
    duplicateLayer,
    deleteLayer,
    updateLayer,
    updateLayerVertex,
    addLayerVertex,
    exportLayoutToAiStudio,
    navigateBack,
    saveCurrentProject,
    showToast,
    setIsWallNeutralizerModalOpen,
    setIsBezierMeshModalOpen,
    setIsFitVideoModalOpen,
    setIsExportStencilModalOpen,
    setIsMapRecalibrationModalOpen,
    setIsSceneLibraryModalOpen,
  } = useProjectionStore();

  const svgRef = useRef<SVGSVGElement>(null);
  const svgImportInputRef = useRef<HTMLInputElement>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<
    Record<string, boolean>
  >({});
  const [draggingVertex, setDraggingVertex] = useState<{
    layerId: string;
    index: number;
  } | null>(null);

  // Undo / Redo Vertex History Stack for selected layer
  const [historyStack, setHistoryStack] = useState<VectorVertex[][]>([]);
  const [redoStack, setRedoStack] = useState<VectorVertex[][]>([]);
  const prevSelectedLayerIdRef = useRef<string>(selectedLayerId);

  // Clear history when switching to a different layer
  useEffect(() => {
    if (prevSelectedLayerIdRef.current !== selectedLayerId) {
      prevSelectedLayerIdRef.current = selectedLayerId;
      setHistoryStack([]);
      setRedoStack([]);
    }
  }, [selectedLayerId]);

  // Expandable Role Drawer State for the 3 buttons at bottom of left panel
  const [expandedRole, setExpandedRole] = useState<MaskRole | null>(
    'Active Projection Surface'
  );

  // Middle scroll wheel click to pan on main Vector Canvas
  const {
    pan: canvasPan,
    resetPan: resetCanvasPan,
    handlePointerDown: handleMiddleDown,
    handlePointerMove: handleMiddleMove,
    handlePointerUp: handleMiddleUp,
    handleMouseDown: handleMiddleMouseDown,
  } = useMiddleClickPan();

  // Rectangle drag state
  const [rectDragStart, setRectDragStart] = useState<VectorVertex | null>(null);
  const [rectDragCurrent, setRectDragCurrent] = useState<VectorVertex | null>(null);

  // Interactive Bounding Box & Rotation Drag State
  const [isDraggingBounds, setIsDraggingBounds] = useState(false);
  const [isRotatingBounds, setIsRotatingBounds] = useState(false);
  const boundsDragRef = useRef<{
    startPointer: VectorVertex;
    initialVertices: VectorVertex[];
    initialPosX: number;
    initialPosY: number;
  } | null>(null);
  const rotationDragRef = useRef<{
    center: VectorVertex;
    startAngle: number;
    initialRotation: number;
  } | null>(null);

  const selectedLayer = useMemo(
    () => layers.find((l) => l.id === selectedLayerId) || layers[0],
    [layers, selectedLayerId]
  );

  const pushHistory = useCallback((currentVertices: VectorVertex[]) => {
    setHistoryStack((prev) => [
      ...prev.slice(-30),
      currentVertices.map((v) => ({ ...v })),
    ]);
    setRedoStack([]);
  }, []);

  const handleUndo = useCallback(() => {
    if (selectedLayer.locked) {
      showToast(`Layer "${selectedLayer.name}" is locked`);
      return;
    }
    if (historyStack.length === 0) return;
    const previous = historyStack[historyStack.length - 1];
    const nextHistory = historyStack.slice(0, -1);
    setRedoStack((prev) => [
      ...prev,
      selectedLayer.vertices.map((v) => ({ ...v })),
    ]);
    setHistoryStack(nextHistory);
    updateLayer(selectedLayer.id, { vertices: previous });
    showToast(`Undo: restored previous vertices (${previous.length} pts)`);
  }, [selectedLayer, historyStack, updateLayer, showToast]);

  const handleRedo = useCallback(() => {
    if (selectedLayer.locked) {
      showToast(`Layer "${selectedLayer.name}" is locked`);
      return;
    }
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const nextRedo = redoStack.slice(0, -1);
    setHistoryStack((prev) => [
      ...prev,
      selectedLayer.vertices.map((v) => ({ ...v })),
    ]);
    setRedoStack(nextRedo);
    updateLayer(selectedLayer.id, { vertices: next });
    showToast(`Redo: restored vertices (${next.length} pts)`);
  }, [selectedLayer, redoStack, updateLayer, showToast]);

  const anySolo = useMemo(() => layers.some((l) => l.solo), [layers]);

  // Compute dynamic bounding box for selection transform cage
  const selectedBounds = useMemo(() => {
    if (!selectedLayer || selectedLayer.vertices.length === 0) return null;
    const xs = selectedLayer.vertices.map((v) => v.x);
    const ys = selectedLayer.vertices.map((v) => v.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return {
      x: minX - 6,
      y: minY - 6,
      w: Math.max(12, maxX - minX + 12),
      h: Math.max(12, maxY - minY + 12),
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
    };
  }, [selectedLayer]);

  // Convert SVG coordinates helper with vertex & 90-degree snapping
  const getTransformedCoords = (
    e: React.PointerEvent<SVGElement> | React.MouseEvent<SVGElement>,
    applySnap = true
  ): VectorVertex => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const screenCTM = svg.getScreenCTM();
    if (!screenCTM) return { x: 0, y: 0 };
    const transformed = pt.matrixTransform(screenCTM.inverse());
    // Allow drawing/dragging vertices up to 150%+ outside the 100% (1080x600) frame into overscan space
    let x = Math.max(-540, Math.min(1620, Math.round(transformed.x)));
    let y = Math.max(-300, Math.min(900, Math.round(transformed.y)));

    if (applySnap) {
      if (snapVertices) {
        let closestDist = 14;
        let snapped: VectorVertex | null = null;
        for (const l of layers) {
          if (!l.visible) continue;
          for (const v of l.vertices) {
            const dist = Math.hypot(v.x - x, v.y - y);
            if (dist < closestDist) {
              closestDist = dist;
              snapped = { x: v.x, y: v.y };
            }
          }
        }
        if (snapped) {
          x = snapped.x;
          y = snapped.y;
        } else {
          x = Math.round(x / 8) * 8;
          y = Math.round(y / 8) * 8;
        }
      }

      if (snap90Deg && selectedLayer.vertices.length > 0) {
        const last = selectedLayer.vertices[selectedLayer.vertices.length - 1];
        const dx = Math.abs(x - last.x);
        const dy = Math.abs(y - last.y);
        if (dx < dy) {
          x = last.x;
        } else {
          y = last.y;
        }
      }
    }

    return { x, y };
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (handleMiddleDown(e)) return;
    if (activeVectorTool === 'rectangle') {
      if (selectedLayer.locked) {
        showToast(`Layer "${selectedLayer.name}" is locked`);
        return;
      }
      const coords = getTransformedCoords(e, false);
      setRectDragStart(coords);
      setRectDragCurrent(coords);
    } else if (activeVectorTool === 'arch') {
      if (selectedLayer.locked) {
        showToast(`Layer "${selectedLayer.name}" is locked`);
        return;
      }
      pushHistory(selectedLayer.vertices);
      const center = getTransformedCoords(e, true);
      const spanW = 120;
      const heightH = 75;
      const steps = 7;
      const archVertices: VectorVertex[] = [];
      archVertices.push({ x: center.x - spanW / 2, y: center.y + heightH / 2 });
      for (let i = 0; i <= steps; i++) {
        const angle = Math.PI - (i / steps) * Math.PI;
        const vx = Math.round(center.x + (spanW / 2) * Math.cos(angle));
        const vy = Math.round(center.y - heightH * Math.sin(angle));
        archVertices.push({ x: vx, y: vy });
      }
      archVertices.push({ x: center.x + spanW / 2, y: center.y + heightH / 2 });
      updateLayer(selectedLayer.id, {
        vertices: archVertices,
        width: spanW,
        height: heightH,
        positionX: center.x,
        positionY: center.y,
      });
      showToast(`Generated architectural arch mask on "${selectedLayer.name}"`);
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (handleMiddleMove(e)) return;
    const rawCoords = getTransformedCoords(e, false);
    setVectorToolbar({
      cursorCoords: rawCoords,
    });

    if (activeVectorTool === 'rectangle' && rectDragStart) {
      const snapCoords = getTransformedCoords(e, snapVertices);
      setRectDragCurrent(snapCoords);
    }

    if (draggingVertex) {
      const targetLayer = layers.find((l) => l.id === draggingVertex.layerId);
      if (!targetLayer || targetLayer.locked) return;

      let { x, y } = getTransformedCoords(e, true);

      if (snap90Deg && draggingVertex.index > 0) {
        const prev = targetLayer.vertices[draggingVertex.index - 1];
        if (Math.abs(x - prev.x) < Math.abs(y - prev.y)) {
          x = prev.x;
        } else {
          y = prev.y;
        }
      }

      updateLayerVertex(draggingVertex.layerId, draggingVertex.index, { x, y });
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (handleMiddleUp(e)) return;
    if (activeVectorTool === 'rectangle' && rectDragStart && rectDragCurrent) {
      const minX = Math.min(rectDragStart.x, rectDragCurrent.x);
      const maxX = Math.max(rectDragStart.x, rectDragCurrent.x);
      const minY = Math.min(rectDragStart.y, rectDragCurrent.y);
      const maxY = Math.max(rectDragStart.y, rectDragCurrent.y);
      const w = maxX - minX;
      const h = maxY - minY;

      if (w > 6 && h > 6) {
        pushHistory(selectedLayer.vertices);
        const corners: VectorVertex[] = [
          { x: minX, y: minY },
          { x: maxX, y: minY },
          { x: maxX, y: maxY },
          { x: minX, y: maxY },
        ];
        updateLayer(selectedLayer.id, {
          vertices: corners,
          positionX: Math.round((minX + maxX) / 2),
          positionY: Math.round((minY + maxY) / 2),
          width: Math.round(w),
          height: Math.round(h),
        });
        showToast(
          `Traced rectangle mask (${w}x${h}px) into "${selectedLayer.name}"`
        );
      }
      setRectDragStart(null);
      setRectDragCurrent(null);
    }

    setDraggingVertex(null);
  };

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeVectorTool !== 'pen' || draggingVertex) return;
    if (selectedLayer.locked) {
      showToast(`Layer "${selectedLayer.name}" is locked`);
      return;
    }

    const { x, y } = getTransformedCoords(e, true);
    pushHistory(selectedLayer.vertices);
    addLayerVertex(selectedLayer.id, { x, y });

    // Update layer bounding metrics in inspector
    const updated = [...selectedLayer.vertices, { x, y }];
    const xs = updated.map((v) => v.x);
    const ys = updated.map((v) => v.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    updateLayer(selectedLayer.id, {
      positionX: Math.round((minX + maxX) / 2),
      positionY: Math.round((minY + maxY) / 2),
      width: Math.round(maxX - minX),
      height: Math.round(maxY - minY),
    });
    showToast(`Added vertex [${x}, ${y}] to "${selectedLayer.name}"`);
  };

  const handleDeleteLastVertex = () => {
    if (selectedLayer.locked) {
      showToast(`Layer "${selectedLayer.name}" is locked`);
      return;
    }
    if (selectedLayer.vertices.length === 0) return;
    pushHistory(selectedLayer.vertices);
    const nextVertices = selectedLayer.vertices.slice(0, -1);
    updateLayer(selectedLayer.id, { vertices: nextVertices });
    showToast(
      `Removed last vertex from "${selectedLayer.name}" (${nextVertices.length} remaining)`
    );
  };

  const handleCenterLayer = () => {
    if (selectedLayer.locked || selectedLayer.vertices.length === 0) return;
    pushHistory(selectedLayer.vertices);
    const xs = selectedLayer.vertices.map((v) => v.x);
    const ys = selectedLayer.vertices.map((v) => v.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const curCx = (minX + maxX) / 2;
    const curCy = (minY + maxY) / 2;
    const targetCx = 540;
    const targetCy = 300;
    const dx = Math.round(targetCx - curCx);
    const dy = Math.round(targetCy - curCy);
    const nextVertices = selectedLayer.vertices.map((v) => ({
      x: v.x + dx,
      y: v.y + dy,
    }));
    updateLayer(selectedLayer.id, {
      vertices: nextVertices,
      positionX: targetCx,
      positionY: targetCy,
    });
    showToast(`Centered layer "${selectedLayer.name}" on canvas`);
  };

  const handleResetLayerVertices = () => {
    if (selectedLayer.locked) {
      showToast(`Layer "${selectedLayer.name}" is locked`);
      return;
    }
    pushHistory(selectedLayer.vertices);
    const cx = 540;
    const cy = 300;
    const w = 240;
    const h = 140;
    const defaultVertices: VectorVertex[] = [
      { x: cx - w / 2, y: cy - h / 2 },
      { x: cx + w / 2, y: cy - h / 2 },
      { x: cx + w / 2, y: cy + h / 2 },
      { x: cx - w / 2, y: cy + h / 2 },
    ];
    updateLayer(selectedLayer.id, {
      vertices: defaultVertices,
      positionX: cx,
      positionY: cy,
      width: w,
      height: h,
      rotation: 0,
    });
    showToast(`Reset vertices for layer "${selectedLayer.name}" to default box`);
  };

  const handleFlipHorizontal = () => {
    if (selectedLayer.locked || selectedLayer.vertices.length === 0) return;
    pushHistory(selectedLayer.vertices);
    const xs = selectedLayer.vertices.map((v) => v.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const cx = (minX + maxX) / 2;
    const flippedVertices = selectedLayer.vertices.map((v) => ({
      ...v,
      x: Math.round(2 * cx - v.x),
    }));
    updateLayer(selectedLayer.id, { vertices: flippedVertices });
    showToast(`Flipped layer "${selectedLayer.name}" horizontally`);
  };

  const handleFlipVertical = () => {
    if (selectedLayer.locked || selectedLayer.vertices.length === 0) return;
    pushHistory(selectedLayer.vertices);
    const ys = selectedLayer.vertices.map((v) => v.y);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const cy = (minY + maxY) / 2;
    const flippedVertices = selectedLayer.vertices.map((v) => ({
      ...v,
      y: Math.round(2 * cy - v.y),
    }));
    updateLayer(selectedLayer.id, { vertices: flippedVertices });
    showToast(`Flipped layer "${selectedLayer.name}" vertically`);
  };

  // Interactive Bounding Box Drag & Drop Handlers (Select & Transform V)
  const handleBoundsPointerDown = (e: React.PointerEvent<SVGRectElement>) => {
    if (selectedLayer.locked) {
      showToast(`Layer "${selectedLayer.name}" is locked`);
      return;
    }
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    pushHistory(selectedLayer.vertices);
    const startPt = getTransformedCoords(e, false);
    boundsDragRef.current = {
      startPointer: startPt,
      initialVertices: selectedLayer.vertices.map((v) => ({ ...v })),
      initialPosX: selectedLayer.positionX,
      initialPosY: selectedLayer.positionY,
    };
    setIsDraggingBounds(true);
  };

  const handleBoundsPointerMove = (e: React.PointerEvent<SVGRectElement>) => {
    if (!boundsDragRef.current) return;
    const currentPt = getTransformedCoords(e, false);
    const dx = Math.round(currentPt.x - boundsDragRef.current.startPointer.x);
    const dy = Math.round(currentPt.y - boundsDragRef.current.startPointer.y);
    const shiftedVertices = boundsDragRef.current.initialVertices.map((v) => ({
      x: v.x + dx,
      y: v.y + dy,
    }));
    updateLayer(selectedLayer.id, {
      vertices: shiftedVertices,
      positionX: boundsDragRef.current.initialPosX + dx,
      positionY: boundsDragRef.current.initialPosY + dy,
    });
  };

  const handleBoundsPointerUp = (e: React.PointerEvent<SVGRectElement>) => {
    if (boundsDragRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      boundsDragRef.current = null;
      setIsDraggingBounds(false);
      showToast(`Moved layer "${selectedLayer.name}"`);
    }
  };

  // Interactive Rotation Handle Drag Handlers
  const handleRotationPointerDown = (e: React.PointerEvent<SVGCircleElement>) => {
    if (selectedLayer.locked) {
      showToast(`Layer "${selectedLayer.name}" is locked`);
      return;
    }
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getTransformedCoords(e, false);
    if (!selectedBounds) return;
    const ys = selectedLayer.vertices.map((v) => v.y);
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const center = { x: selectedBounds.cx, y: cy };
    const startAngle = Math.atan2(pt.y - center.y, pt.x - center.x) * (180 / Math.PI);
    rotationDragRef.current = {
      center,
      startAngle,
      initialRotation: selectedLayer.rotation,
    };
    setIsRotatingBounds(true);
  };

  const handleRotationPointerMove = (e: React.PointerEvent<SVGCircleElement>) => {
    if (!rotationDragRef.current) return;
    const pt = getTransformedCoords(e, false);
    const currentAngle =
      Math.atan2(
        pt.y - rotationDragRef.current.center.y,
        pt.x - rotationDragRef.current.center.x
      ) *
      (180 / Math.PI);
    const deltaAngle = currentAngle - rotationDragRef.current.startAngle;
    let nextRot = (rotationDragRef.current.initialRotation + deltaAngle) % 360;
    if (nextRot < 0) nextRot += 360;
    updateLayer(selectedLayer.id, {
      rotation: Number(nextRot.toFixed(1)),
    });
  };

  const handleRotationPointerUp = (e: React.PointerEvent<SVGCircleElement>) => {
    if (rotationDragRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      rotationDragRef.current = null;
      setIsRotatingBounds(false);
      showToast(`Rotated layer "${selectedLayer.name}" to ${selectedLayer.rotation.toFixed(1)}°`);
    }
  };

  // Boolean Polygon Operation: Subtract Cutouts/Windows from selected Surface (Feature #9)
  const handleSubtractBlackouts = () => {
    if (!selectedLayer || selectedLayer.vertices.length < 3) {
      showToast('Please select a valid polygon layer with at least 3 vertices');
      return;
    }
    const cutoutLayers = layers.filter(
      (l) => l.id !== selectedLayer.id && (l.role === 'Hard Blackout Cutout' || l.category === 'Windows') && l.vertices.length >= 3
    );
    if (!cutoutLayers.length) {
      showToast('No cutout/window masks found to subtract');
      return;
    }

    pushHistory(selectedLayer.vertices);
    let currentPoly = [...selectedLayer.vertices];
    let subtractCount = 0;

    for (const cutout of cutoutLayers) {
      const clipped = clipPolygon(currentPoly, cutout.vertices);
      if (clipped.length >= 3) {
        currentPoly = clipped;
        subtractCount++;
      }
    }

    updateLayer(selectedLayer.id, { vertices: currentPoly });
    showToast(`Boolean Subtract: Clipped ${subtractCount} cutouts from "${selectedLayer.name}"`);
  };

  // Parametric Architectural Brick / Siding Grid Subdivider (Feature #10)
  const handleSubdivideMasonry = () => {
    if (!selectedLayer || selectedLayer.vertices.length < 3) {
      showToast('Please select a valid wall/facade polygon to subdivide');
      return;
    }

    const tiles = subdividePolygonToBricks(selectedLayer.vertices, {
      rows: 4,
      columns: 6,
      gapPx: 2,
    });

    if (!tiles.length) {
      showToast('Subdivision yielded 0 valid masonry tiles');
      return;
    }

    // Add generated masonry tiles as child sub-layers
    tiles.slice(0, 12).forEach((tile, idx) => {
      const brickName = `${selectedLayer.name} Brick ${idx + 1}`;
      addLayer(brickName, selectedLayer.category);
      const newest = useProjectionStore.getState().layers.slice(-1)[0];
      if (newest) {
        updateLayer(newest.id, {
          vertices: tile.vertices,
          color: idx % 2 === 0 ? '#38bdf8' : '#0ea5e9',
          role: 'Active Projection Surface',
        });
      }
    });

    showToast(`Parametric Masonry: Generated ${Math.min(12, tiles.length)} masonry brick sub-layers`);
  };

  const handleExportSvgMask = () => {
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 600" width="1080" height="600">
  <!-- Austin Ranch House Vector Projection Mask -->
  <!-- Generated by Lumen-Map AI Projection Studio v3.5 -->
  <rect width="1080" height="600" fill="#000000" />
${layers
  .filter((l) => l.visible && l.vertices.length > 0)
  .map(
    (l) => `  <polygon id="${l.id}" data-role="${l.role}" points="${l.vertices
      .map((v) => `${v.x},${v.y}`)
      .join(' ')}"
    fill="${
      l.role === 'Hard Blackout Cutout'
        ? 'rgba(239, 68, 68, 0.45)'
        : 'rgba(0, 240, 255, 0.12)'
    }"
    stroke="${l.color}"
    stroke-width="${l.outlineGlowWidth || 2}"
    stroke-linejoin="round" />`
  )
  .join('\n')}
</svg>`;
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `austin_house_mask_${selectedLayer.name
      .toLowerCase()
      .replace(/\s+/g, '_')}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(
      `Exported Architectural SVG Mask Package (${layers.length} layers)`
    );
  };

  const handleImportSvgFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'image/svg+xml');
        const parserError = doc.querySelector('parsererror');
        if (parserError) {
          showToast('Failed to parse SVG: Invalid XML syntax');
          return;
        }

        const polygons = Array.from(doc.querySelectorAll('polygon'));
        if (polygons.length === 0) {
          showToast('No <polygon> elements found in selected SVG mask');
          return;
        }

        let importedCount = 0;
        polygons.forEach((poly, idx) => {
          const pointsAttr = poly.getAttribute('points') || '';
          const idAttr = poly.getAttribute('id');
          const strokeAttr = poly.getAttribute('stroke');
          const roleAttr = poly.getAttribute('data-role') as MaskRole | null;

          const rawCoords = pointsAttr
            .trim()
            .split(/[\s,]+/)
            .map(Number)
            .filter((n) => !isNaN(n));

          const vertices: VectorVertex[] = [];
          for (let i = 0; i < rawCoords.length - 1; i += 2) {
            vertices.push({
              x: Math.round(rawCoords[i]),
              y: Math.round(rawCoords[i + 1]),
            });
          }

          if (vertices.length < 3) return;

          // Check if a layer with matching id exists
          const currentLayers = useProjectionStore.getState().layers;
          const existingLayer = idAttr
            ? currentLayers.find((l) => l.id === idAttr)
            : undefined;

          if (existingLayer) {
            updateLayer(existingLayer.id, {
              vertices,
              ...(strokeAttr ? { color: strokeAttr } : {}),
              ...(roleAttr ? { role: roleAttr } : {}),
            });
          } else {
            const layerName = idAttr
              ? idAttr.replace(/^layer-/, '').replace(/[-_]/g, ' ')
              : `Imported Mask ${idx + 1}`;
            addLayer(layerName, 'Main Walls');
            const newest = useProjectionStore.getState().layers.slice(-1)[0];
            if (newest) {
              updateLayer(newest.id, {
                vertices,
                ...(strokeAttr ? { color: strokeAttr } : {}),
                ...(roleAttr ? { role: roleAttr } : {}),
              });
            }
          }
          importedCount++;
        });

        showToast(
          `Imported ${importedCount} SVG polygon mask${importedCount === 1 ? '' : 's'} into layout`
        );
      } catch (err) {
        console.error('Error importing SVG mask:', err);
        showToast('Error importing SVG mask file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Keyboard shortcuts for quick tool selection, delete, and undo/redo
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

      // Undo / Redo: Ctrl+Z / Ctrl+Y / Shift+Ctrl+Z
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
          return;
        }
        if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          handleRedo();
          return;
        }
      }

      const key = e.key.toLowerCase();
      if (key === 'v') setVectorToolbar({ activeVectorTool: 'select' });
      if (key === 'p') setVectorToolbar({ activeVectorTool: 'pen' });
      if (key === 'r') setVectorToolbar({ activeVectorTool: 'rectangle' });
      if (key === 'a') setVectorToolbar({ activeVectorTool: 'arch' });
      if (key === 'w' && !e.ctrlKey && !e.metaKey) {
        setIsMapRecalibrationModalOpen(true);
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleDeleteLastVertex();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedLayer, layers, historyStack, redoStack, handleUndo, handleRedo]);

  return (
    <div className="flex-1 flex min-h-0 bg-[#0d121b] text-slate-100 select-none overflow-hidden">
      {/* LEFT SURFACE & MASK HIERARCHY LAYER TREE */}
      <aside className="w-[248px] shrink-0 bg-[#111723] border-r border-[#1f293a] p-4 flex flex-col justify-between">
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xs font-bold tracking-wider uppercase text-slate-200">
              SURFACE &amp; MASK HIERARCHY
            </h2>
          </div>
          <p className="text-[11px] text-slate-400 mb-2.5">
            Architectural Layer Tree ({layers.length} layers)
          </p>

          {/* Layer Management Toolbar: + ADD, DUPLICATE, DELETE */}
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            <button
              type="button"
              onClick={() => {
                addLayer(undefined, selectedLayer?.category || 'Main Walls');
              }}
              className="py-1 px-1.5 rounded bg-[#1c273a] hover:bg-[#253652] border border-blue-500/40 text-[10px] font-bold uppercase tracking-wider text-blue-300 flex items-center justify-center gap-1 transition-colors cursor-pointer"
              title="Add New Vector Layer"
            >
              <Plus className="w-3 h-3 stroke-[2.5]" />
              ADD
            </button>
            <button
              type="button"
              onClick={() => {
                if (selectedLayerId) duplicateLayer(selectedLayerId);
              }}
              className="py-1 px-1.5 rounded bg-[#1c273a] hover:bg-[#253652] border border-[#344666] text-[10px] font-bold uppercase tracking-wider text-slate-200 flex items-center justify-center gap-1 transition-colors cursor-pointer"
              title="Duplicate Selected Layer"
            >
              <Copy className="w-3 h-3" />
              DUPLICATE
            </button>
            <button
              type="button"
              onClick={() => {
                if (selectedLayerId) deleteLayer(selectedLayerId);
              }}
              disabled={layers.length <= 1}
              className="py-1 px-1.5 rounded bg-[#1c273a] hover:bg-rose-950/60 disabled:opacity-30 border border-[#344666] hover:border-rose-500/50 text-[10px] font-bold uppercase tracking-wider text-rose-300 flex items-center justify-center gap-1 transition-colors cursor-pointer"
              title="Delete Selected Layer"
            >
              <Trash2 className="w-3 h-3 text-rose-400" />
              DELETE
            </button>
          </div>

          {/* Categorized & Collapsible Layer Tree */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-2">
            {LAYER_CATEGORIES.map((category) => {
              const catLayers = layers.filter((l) => l.category === category);
              const isCollapsed = !!collapsedCategories[category];
              return (
                <div key={category} className="rounded-md border border-[#1f2b3e] overflow-hidden bg-[#0d1420]">
                  {/* Category Group Header (Clickable Collapse/Expand) */}
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsedCategories((prev) => ({
                        ...prev,
                        [category]: !prev[category],
                      }))
                    }
                    className="w-full flex items-center justify-between px-2.5 py-1.5 bg-[#141d2c] hover:bg-[#1a263a] text-[11px] font-bold uppercase tracking-wider text-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span>{category}</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/50 text-slate-400 border border-slate-700/60">
                      {catLayers.length}
                    </span>
                  </button>

                  {/* Layers inside this category */}
                  {!isCollapsed && (
                    <div className="p-1 space-y-1">
                      {catLayers.length === 0 ? (
                        <div className="text-[10px] text-slate-500 italic px-2 py-1">
                          No layers in this category
                        </div>
                      ) : (
                        catLayers.map((layer) => {
                          const isSelected = layer.id === selectedLayerId;
                          return (
                            <div
                              key={layer.id}
                              onClick={() =>
                                setVectorToolbar({ selectedLayerId: layer.id })
                              }
                              className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-[#212c42] text-white border border-[#344666]'
                                  : 'text-slate-300 hover:bg-[#182030]'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: layer.color }}
                                />
                                <span className="text-xs font-medium truncate">
                                  {layer.name}
                                </span>
                              </div>

                              {/* Per-Layer Controls: Visibility (Eye), Lock (Padlock), Solo (S) */}
                              <div
                                className="flex items-center gap-1 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateLayer(layer.id, {
                                      visible: !layer.visible,
                                    })
                                  }
                                  className="p-1 rounded hover:bg-slate-700/60 text-slate-300"
                                  title={
                                    layer.visible ? 'Hide Layer' : 'Show Layer'
                                  }
                                >
                                  {layer.visible ? (
                                    <Eye className="w-3.5 h-3.5" />
                                  ) : (
                                    <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    updateLayer(layer.id, {
                                      locked: !layer.locked,
                                    })
                                  }
                                  className="p-1 rounded hover:bg-slate-700/60 text-slate-300"
                                  title={
                                    layer.locked ? 'Unlock Layer' : 'Lock Layer'
                                  }
                                >
                                  {layer.locked ? (
                                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                                  ) : (
                                    <Unlock className="w-3.5 h-3.5 text-slate-400" />
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    updateLayer(layer.id, { solo: !layer.solo })
                                  }
                                  className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center border transition-colors ${
                                    layer.solo
                                      ? 'bg-cyan-500 text-black border-cyan-300'
                                      : 'bg-[#28344b] text-slate-300 border-[#394866] hover:text-white'
                                  }`}
                                  title="Solo Layer (S)"
                                >
                                  S
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Mask Role Assignment Accordion Drawers at Bottom of Left Panel */}
        <div className="space-y-2 pt-3 border-t border-[#1f293a]">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1">
            <span>SURFACE ROLE &amp; HARDWARE MAPPING</span>
            <span className="font-mono text-cyan-400 text-[9px]">
              {selectedLayer.role.toUpperCase()}
            </span>
          </div>
          {(
            [
              'Active Projection Surface',
              'Hard Blackout Cutout',
              'Structural Guide Line',
            ] as MaskRole[]
          ).map((roleOption) => {
            const isAssigned = selectedLayer.role === roleOption;
            const isExpanded = expandedRole === roleOption;

            return (
              <div
                key={roleOption}
                className={`rounded-md border overflow-hidden transition-all ${
                  isAssigned
                    ? 'border-blue-500/60 bg-[#162238]'
                    : 'border-[#223049] bg-[#121927]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    updateLayer(selectedLayer.id, { role: roleOption });
                    setExpandedRole((prev) =>
                      prev === roleOption ? null : roleOption
                    );
                  }}
                  className={`w-full px-3 py-2 text-xs font-semibold flex items-center justify-between transition-colors ${
                    isAssigned
                      ? 'bg-[#1e2f4d] text-white'
                      : 'text-slate-300 hover:bg-[#1a2538] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shadow-sm ${
                        roleOption === 'Active Projection Surface'
                          ? 'bg-cyan-400 shadow-cyan-500/50'
                          : roleOption === 'Hard Blackout Cutout'
                          ? 'bg-rose-500 shadow-rose-500/50'
                          : 'bg-amber-400 shadow-amber-500/50'
                      }`}
                    />
                    <span>{roleOption}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isAssigned && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/25 border border-blue-400/40 text-cyan-300 font-bold uppercase">
                        ACTIVE
                      </span>
                    )}
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180 text-cyan-400' : ''
                      }`}
                    />
                  </div>
                </button>

                {/* Expandable Drawer with Rich Role-Specific Features & Settings */}
                {isExpanded && (
                  <div className="p-3 bg-[#0c1322] border-t border-[#1e2a3f] text-slate-200 space-y-3 text-[11px] animate-in fade-in duration-150">
                    {roleOption === 'Active Projection Surface' && (
                      <div className="space-y-3">
                        {/* Luminance Opacity Slider */}
                        <div>
                          <div className="flex justify-between items-center text-[10px] mb-1">
                            <span className="text-slate-400 font-bold uppercase">
                              Luminance Opacity
                            </span>
                            <span className="font-mono text-cyan-300 font-bold">
                              {selectedLayer.opacity ?? 100}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={10}
                            max={100}
                            step={5}
                            value={selectedLayer.opacity ?? 100}
                            onChange={(e) =>
                              updateLayer(selectedLayer.id, {
                                opacity: Number(e.target.value),
                              })
                            }
                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                          />
                        </div>

                        {/* Edge Feathering Slider */}
                        <div>
                          <div className="flex justify-between items-center text-[10px] mb-1">
                            <span className="text-slate-400 font-bold uppercase">
                              Edge Feathering
                            </span>
                            <span className="font-mono text-cyan-300 font-bold">
                              {selectedLayer.edgeFeathering}px
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={30}
                            step={1}
                            value={selectedLayer.edgeFeathering}
                            onChange={(e) =>
                              updateLayer(selectedLayer.id, {
                                edgeFeathering: Number(e.target.value),
                              })
                            }
                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                          />
                        </div>

                        {/* Outline Glow Width & Palette */}
                        <div>
                          <div className="flex justify-between items-center text-[10px] mb-1">
                            <span className="text-slate-400 font-bold uppercase">
                              Outline Glow &amp; Border
                            </span>
                            <span className="font-mono text-cyan-300 font-bold">
                              {selectedLayer.outlineGlowWidth}px
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={8}
                            step={1}
                            value={selectedLayer.outlineGlowWidth}
                            onChange={(e) =>
                              updateLayer(selectedLayer.id, {
                                outlineGlowWidth: Number(e.target.value),
                              })
                            }
                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                          />

                          <div className="flex items-center gap-1.5 mt-2">
                            {[
                              { label: 'Cyan', color: '#00f0ff' },
                              { label: 'Emerald', color: '#10b981' },
                              { label: 'Amber', color: '#f59e0b' },
                              { label: 'Purple', color: '#a855f7' },
                              { label: 'White', color: '#ffffff' },
                            ].map((preset) => (
                              <button
                                key={preset.color}
                                type="button"
                                onClick={() =>
                                  updateLayer(selectedLayer.id, {
                                    color: preset.color,
                                  })
                                }
                                className={`w-5 h-5 rounded-full border transition-transform ${
                                  selectedLayer.color === preset.color
                                    ? 'scale-125 border-white shadow-md'
                                    : 'border-black/50 hover:scale-110 opacity-70 hover:opacity-100'
                                }`}
                                style={{ backgroundColor: preset.color }}
                                title={preset.label}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Texture Blend Mode */}
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                            Texture Blend Mode
                          </span>
                          <select
                            value={selectedLayer.blendMode || 'normal'}
                            onChange={(e) =>
                              updateLayer(selectedLayer.id, {
                                blendMode: e.target.value as any,
                              })
                            }
                            className="w-full py-1.5 px-2 rounded bg-[#162033] border border-[#2b3d5b] text-slate-200 text-[11px] font-mono focus:border-cyan-400 focus:outline-none"
                          >
                            <option value="normal">Normal (Opaque Surface)</option>
                            <option value="screen">Screen (Additive Light Glow)</option>
                            <option value="overlay">Overlay (High Contrast Pop)</option>
                            <option value="multiply">Multiply (Shadow Mapping)</option>
                          </select>
                        </div>

                        {/* Laser / Wireframe Border Trace & Audio Pulse Toggles */}
                        <div className="pt-2 border-t border-[#1a2538] space-y-2">
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-[10px] font-medium text-slate-300">
                              Laser Border Tracing
                            </span>
                            <input
                              type="checkbox"
                              checked={selectedLayer.laserTrace ?? false}
                              onChange={(e) =>
                                updateLayer(selectedLayer.id, {
                                  laserTrace: e.target.checked,
                                })
                              }
                              className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                            />
                          </label>

                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-[10px] font-medium text-slate-300">
                              Audio-Reactive Accent Pulse
                            </span>
                            <input
                              type="checkbox"
                              checked={selectedLayer.audioReactive ?? false}
                              onChange={(e) =>
                                updateLayer(selectedLayer.id, {
                                  audioReactive: e.target.checked,
                                })
                              }
                              className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                            />
                          </label>
                        </div>
                      </div>
                    )}

                    {roleOption === 'Hard Blackout Cutout' && (
                      <div className="space-y-3">
                        {/* 0% Lumen Safety Latch */}
                        <div className="p-2 rounded bg-rose-950/40 border border-rose-500/40">
                          <label className="flex items-center justify-between cursor-pointer">
                            <div>
                              <span className="text-[10px] font-bold text-rose-300 uppercase block">
                                0% Lumen Safety Latch
                              </span>
                              <span className="text-[9px] text-slate-400 block">
                                Enforces 0 IRE black (lamp blanking)
                              </span>
                            </div>
                            <input
                              type="checkbox"
                              checked={selectedLayer.zeroLumenSafety ?? true}
                              onChange={(e) =>
                                updateLayer(selectedLayer.id, {
                                  zeroLumenSafety: e.target.checked,
                                })
                              }
                              className="rounded border-rose-700 text-rose-500 focus:ring-0"
                            />
                          </label>
                        </div>

                        {/* Invert Cutout Mask */}
                        <label className="flex items-center justify-between cursor-pointer">
                          <span className="text-[10px] font-medium text-slate-300">
                            Invert Cutout (Blackout Outside)
                          </span>
                          <input
                            type="checkbox"
                            checked={selectedLayer.invertCutout ?? false}
                            onChange={(e) =>
                              updateLayer(selectedLayer.id, {
                                invertCutout: e.target.checked,
                              })
                            }
                            className="rounded border-slate-700 text-rose-500 focus:ring-0"
                          />
                        </label>

                        {/* Safety Margin / Bleed Inset */}
                        <div>
                          <div className="flex justify-between items-center text-[10px] mb-1">
                            <span className="text-slate-400 font-bold uppercase">
                              Safety Bleed Margin
                            </span>
                            <span className="font-mono text-rose-300 font-bold">
                              {(selectedLayer.safetyMargin ?? 0) > 0
                                ? `+${selectedLayer.safetyMargin}px`
                                : `${selectedLayer.safetyMargin ?? 0}px`}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={-15}
                            max={15}
                            step={1}
                            value={selectedLayer.safetyMargin ?? 0}
                            onChange={(e) =>
                              updateLayer(selectedLayer.id, {
                                safetyMargin: Number(e.target.value),
                              })
                            }
                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                          />
                        </div>

                        {/* Blackout Fill Shade */}
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1.5">
                            Blackout Fill Shade
                          </span>
                          <div className="grid grid-cols-3 gap-1">
                            {[
                              { label: 'Pitch Void', val: 'rgba(0, 0, 0, 0.95)' },
                              { label: 'Charcoal', val: 'rgba(15, 23, 42, 0.85)' },
                              { label: 'Safety Red', val: 'rgba(239, 68, 68, 0.28)' },
                            ].map((shade) => (
                              <button
                                key={shade.val}
                                type="button"
                                onClick={() =>
                                  updateLayer(selectedLayer.id, {
                                    blackoutShade: shade.val,
                                  })
                                }
                                className={`py-1 px-1.5 rounded text-[9px] font-mono border text-center transition-colors ${
                                  (selectedLayer.blackoutShade ||
                                    'rgba(239, 68, 68, 0.25)') === shade.val
                                    ? 'border-rose-400 bg-rose-950/70 text-rose-200'
                                    : 'border-[#26354f] bg-[#141b29] text-slate-400 hover:text-white'
                                }`}
                              >
                                {shade.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Glass Thermal Concentration Protection */}
                        <div className="pt-2 border-t border-[#1a2538]">
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-[10px] font-medium text-slate-300">
                              Glass Thermal Safeguard
                            </span>
                            <input
                              type="checkbox"
                              checked={selectedLayer.thermalSafeguard ?? true}
                              onChange={(e) =>
                                updateLayer(selectedLayer.id, {
                                  thermalSafeguard: e.target.checked,
                                })
                              }
                              className="rounded border-slate-700 text-rose-500 focus:ring-0"
                            />
                          </label>
                        </div>
                      </div>
                    )}

                    {roleOption === 'Structural Guide Line' && (
                      <div className="space-y-3">
                        {/* Stroke Width */}
                        <div>
                          <div className="flex justify-between items-center text-[10px] mb-1">
                            <span className="text-slate-400 font-bold uppercase">
                              Stroke Width
                            </span>
                            <span className="font-mono text-amber-300 font-bold">
                              {selectedLayer.strokeWidth ?? 2}px
                            </span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={10}
                            step={1}
                            value={selectedLayer.strokeWidth ?? 2}
                            onChange={(e) =>
                              updateLayer(selectedLayer.id, {
                                strokeWidth: Number(e.target.value),
                              })
                            }
                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                          />
                        </div>

                        {/* Dash Pattern Selector */}
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1.5">
                            Dash Pattern
                          </span>
                          <div className="grid grid-cols-4 gap-1">
                            {[
                              { id: 'solid', label: 'Solid' },
                              { id: 'dashed', label: 'Dash' },
                              { id: 'dotted', label: 'Dot' },
                              { id: 'laser', label: 'Pulse' },
                            ].map((pattern) => (
                              <button
                                key={pattern.id}
                                type="button"
                                onClick={() =>
                                  updateLayer(selectedLayer.id, {
                                    dashPattern: pattern.id as any,
                                  })
                                }
                                className={`py-1 px-1 rounded text-[9px] font-mono border text-center transition-colors ${
                                  (selectedLayer.dashPattern || 'solid') ===
                                  pattern.id
                                    ? 'border-amber-400 bg-amber-950/60 text-amber-200'
                                    : 'border-[#26354f] bg-[#141b29] text-slate-400 hover:text-white'
                                }`}
                              >
                                {pattern.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Snap Magnetism Strength */}
                        <div>
                          <div className="flex justify-between items-center text-[10px] mb-1">
                            <span className="text-slate-400 font-bold uppercase">
                              Snap Magnetism Radius
                            </span>
                            <span className="font-mono text-amber-300 font-bold">
                              {selectedLayer.snapMagnetism ?? 14}px
                            </span>
                          </div>
                          <input
                            type="range"
                            min={4}
                            max={36}
                            step={2}
                            value={selectedLayer.snapMagnetism ?? 14}
                            onChange={(e) =>
                              updateLayer(selectedLayer.id, {
                                snapMagnetism: Number(e.target.value),
                              })
                            }
                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                          />
                        </div>

                        {/* Architectural Tag Dropdown */}
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                            Architectural Anchor Tag
                          </span>
                          <select
                            value={
                              selectedLayer.archTag || 'Roofline Peak / Gable'
                            }
                            onChange={(e) =>
                              updateLayer(selectedLayer.id, {
                                archTag: e.target.value,
                              })
                            }
                            className="w-full py-1.5 px-2 rounded bg-[#162033] border border-[#2b3d5b] text-slate-200 text-[11px] font-mono focus:border-amber-400 focus:outline-none"
                          >
                            <option value="Roofline Peak / Gable">
                              Roofline Peak / Gable
                            </option>
                            <option value="Eaves & Fascia Track">
                              Eaves &amp; Fascia Track
                            </option>
                            <option value="Garage Door Frame">
                              Garage Door Frame
                            </option>
                            <option value="Front Porch Arch">
                              Front Porch Arch
                            </option>
                            <option value="Bay Window Sill">
                              Bay Window Sill
                            </option>
                            <option value="Chimney Base">Chimney Base</option>
                            <option value="Custom Structural Guide">
                              Custom Structural Guide
                            </option>
                          </select>
                        </div>

                        {/* Production Routing Toggle */}
                        <div className="pt-2 border-t border-[#1a2538]">
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-[10px] font-medium text-slate-300">
                              Hide in Live Audience Output
                            </span>
                            <input
                              type="checkbox"
                              checked={selectedLayer.hideInAudience ?? true}
                              onChange={(e) =>
                                updateLayer(selectedLayer.id, {
                                  hideInAudience: e.target.checked,
                                })
                              }
                              className="rounded border-slate-700 text-amber-500 focus:ring-0"
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* CENTER VECTOR TOOLBAR + MAIN CANVAS VIEWPORT */}
      <main className="flex-1 min-w-0 flex flex-col bg-[#0a0f18] overflow-hidden">
        {/* TOP VECTOR DRAWING & SNAP TOOLBAR */}
        <div className="h-[78px] bg-[#111723] border-b border-[#1f293a] px-4 flex items-center justify-between gap-4 shrink-0">
          {/* Navigation & Vector Tool Buttons */}
          <div className="flex items-center gap-2">
            {/* Screen Back & Save Buttons */}
            <button
              type="button"
              onClick={navigateBack}
              className="flex flex-col items-center justify-center w-[76px] py-1.5 rounded-md bg-[#182335] hover:bg-[#202f48] border border-cyan-500/60 hover:border-cyan-400 text-cyan-300 hover:text-white transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)] cursor-pointer"
              title="Go back to previous screen (Alt+Left)"
            >
              <ArrowLeft className="w-4 h-4 mb-1 text-cyan-400" />
              <span className="text-[10px] font-extrabold uppercase leading-tight tracking-wider">
                BACK
              </span>
            </button>

            <button
              type="button"
              onClick={saveCurrentProject}
              className="flex flex-col items-center justify-center w-[76px] py-1.5 rounded-md bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/70 hover:border-emerald-400 text-emerald-300 hover:text-white transition-all shadow-[0_0_10px_rgba(16,185,129,0.25)] cursor-pointer"
              title="Save current project to storage (Ctrl+S)"
            >
              <Save className="w-4 h-4 mb-1 text-emerald-400" />
              <span className="text-[10px] font-extrabold uppercase leading-tight tracking-wider">
                SAVE
              </span>
            </button>

            <div className="h-9 w-[1px] bg-[#253147] mx-1" />

            {[
              {
                id: 'select' as const,
                icon: MousePointer,
                line1: 'Select &',
                line2: 'Transform (V)',
              },
              {
                id: 'pen' as const,
                icon: PenTool,
                line1: 'Pen &',
                line2: 'Polygon (P)',
              },
              {
                id: 'rectangle' as const,
                icon: Square,
                line1: 'Rectangle &',
                line2: 'Window (R)',
              },
              {
                id: 'arch' as const,
                icon: Spline,
                line1: 'Arch &',
                line2: 'Curve (A)',
              },
            ].map((tool) => {
              const Icon = tool.icon;
              const isActive = activeVectorTool === tool.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => setVectorToolbar({ activeVectorTool: tool.id })}
                  className={`flex flex-col items-center justify-center w-[98px] py-1.5 rounded-md border text-center transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#1e3a6e] border-blue-400 text-white shadow-[0_0_12px_rgba(59,130,246,0.35)]'
                      : 'bg-[#1a2233] border-[#2c3850] text-slate-300 hover:bg-[#222c42]'
                  }`}
                >
                  <Icon className="w-4 h-4 mb-1" />
                  <span className="text-[10px] leading-tight font-medium">
                    {tool.line1}
                    <br />
                    {tool.line2}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="h-9 w-[1px] bg-[#253147]" />

          {/* Snap & Grid Checkboxes */}
          <div className="flex items-center gap-4 text-xs font-bold tracking-wide text-slate-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={snapVertices}
                onChange={(e) =>
                  setVectorToolbar({ snapVertices: e.target.checked })
                }
                className="rounded border-slate-600 text-blue-600"
              />
              <span>SNAP VERTICES</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={snap90Deg}
                onChange={(e) =>
                  setVectorToolbar({ snap90Deg: e.target.checked })
                }
                className="rounded border-slate-600 text-blue-600"
              />
              <span>SNAP 90°</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) =>
                  setVectorToolbar({ showGrid: e.target.checked })
                }
                className="rounded border-slate-600 text-blue-600"
              />
              <span>SHOW GRID</span>
            </label>

            <div className="h-7 w-[1px] bg-[#253147] ml-1" />

            {/* Undo / Redo Buttons */}
            <div className="flex items-center gap-1.5 ml-1">
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyStack.length === 0 || selectedLayer.locked}
                className="py-1 px-2 rounded bg-[#1a2333] hover:bg-[#222d42] disabled:opacity-30 disabled:cursor-not-allowed border border-[#2f3e5b] text-[10px] font-bold text-slate-200 inline-flex items-center gap-1 transition-colors cursor-pointer"
                title="Undo Last Vertex Action (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>UNDO (Ctrl+Z)</span>
              </button>

              <button
                type="button"
                onClick={handleRedo}
                disabled={redoStack.length === 0 || selectedLayer.locked}
                className="py-1 px-2 rounded bg-[#1a2333] hover:bg-[#222d42] disabled:opacity-30 disabled:cursor-not-allowed border border-[#2f3e5b] text-[10px] font-bold text-slate-200 inline-flex items-center gap-1 transition-colors cursor-pointer"
                title="Redo Vertex Action (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>REDO (Ctrl+Y)</span>
              </button>
            </div>

            <div className="h-7 w-[1px] bg-[#253147] ml-1" />

            {/* Advanced Architectural CAD & Calibration Modals */}
            <div className="flex items-center gap-1.5 ml-1">
              <button
                type="button"
                onClick={handleSubtractBlackouts}
                className="py-1 px-2 rounded bg-[#162032] hover:bg-[#1f2d47] border border-[#2c3d59] hover:border-cyan-400 text-cyan-300 hover:text-white text-[10px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer"
                title="Boolean Subtract: Clip out all windows/cutouts from selected surface polygon (Feature #9)"
              >
                <Scissors className="w-3.5 h-3.5 text-cyan-400" />
                <span>Clip Cutouts</span>
              </button>

              <button
                type="button"
                onClick={handleSubdivideMasonry}
                className="py-1 px-2 rounded bg-[#162032] hover:bg-[#1f2d47] border border-[#2c3d59] hover:border-amber-400 text-amber-300 hover:text-white text-[10px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer"
                title="Parametric Architectural Subdivider: Split selected wall into brick/siding blocks (Feature #10)"
              >
                <Grid className="w-3.5 h-3.5 text-amber-400" />
                <span>Subdivide</span>
              </button>

              <button
                type="button"
                onClick={() => setIsWallNeutralizerModalOpen(true)}
                className="py-1 px-2 rounded bg-[#162032] hover:bg-[#1f2d47] border border-[#2c3d59] hover:border-fuchsia-400 text-fuchsia-300 hover:text-white text-[10px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer"
                title="Wall Color & Brick Pigment Neutralizer LUT (Feature #2)"
              >
                <Palette className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>Wall Neutralizer</span>
              </button>

              <button
                type="button"
                onClick={() => setIsBezierMeshModalOpen(true)}
                className="py-1 px-2 rounded bg-[#162032] hover:bg-[#1f2d47] border border-[#2c3d59] hover:border-emerald-400 text-emerald-300 hover:text-white text-[10px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer"
                title="Sub-Grid NxN Bezier Mesh Warp (Feature #1)"
              >
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>Bezier Mesh</span>
              </button>

              {/* Marshall Studio Mapping & Stencil Suite */}
              <button
                type="button"
                onClick={() => setIsMapRecalibrationModalOpen(true)}
                className="py-1 px-2.5 rounded bg-gradient-to-r from-amber-600/30 to-amber-500/20 hover:from-amber-600/50 hover:to-amber-500/40 border border-amber-500/70 hover:border-amber-400 text-amber-200 hover:text-white text-[10px] font-extrabold inline-flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(245,158,11,0.25)] cursor-pointer"
                title="Global Map Warp (W), Two-Tier Recalibration, Holes Outliner & Geometry Classifier"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Warp & Calib (W)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsExportStencilModalOpen(true)}
                className="py-1 px-2.5 rounded bg-[#162032] hover:bg-[#1f2d47] border border-cyan-500/60 hover:border-cyan-400 text-cyan-300 hover:text-white text-[10px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                title="Export House Stencil — High-res filled mask & outline for AI video generators (§22-F)"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export Stencil</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFitVideoModalOpen(true)}
                className="py-1 px-2.5 rounded bg-[#162032] hover:bg-[#1f2d47] border border-sky-500/60 hover:border-sky-400 text-sky-300 hover:text-white text-[10px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                title="Fit Video to House — Map single video across house shapes (§22-A..22-E)"
              >
                <Sliders className="w-3.5 h-3.5 text-sky-400" />
                <span>Fit Video</span>
              </button>
            </div>
          </div>
        </div>

        {/* CENTER MAIN CANVAS VIEWPORT */}
        <div
          onWheel={(e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 10 : -10;
            setVectorToolbar({
              canvasZoom: Math.max(25, Math.min(250, canvasZoom + delta)),
            });
          }}
          className="flex-1 relative overflow-hidden flex items-center justify-center bg-[#050811]"
        >
          {/* Top-Left Canvas Title */}
          <div className="absolute top-3 left-4 z-10 flex items-center gap-2 pointer-events-none">
            <span className="text-xs font-medium text-slate-300">
              Main Canvas
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-mono uppercase">
              Tool: {activeVectorTool.toUpperCase()}
            </span>
          </div>

          {/* Top-Right LIVE TRACE ON HOUSE Toggle + Interactive Zoom/Overscan Toolbar */}
          <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <PreviewZoomControl
                zoom={canvasZoom}
                onChange={(z) => setVectorToolbar({ canvasZoom: z })}
                pan={canvasPan}
                onResetPan={resetCanvasPan}
              />
              <label className="px-3 py-1.5 rounded bg-[#141c2b]/90 border border-[#2b3954] flex items-center gap-2.5 cursor-pointer backdrop-blur-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
                  LIVE TRACE ON HOUSE
                </span>
                <input
                  type="checkbox"
                  checked={liveTraceOnHouse}
                  onChange={(e) =>
                    setVectorToolbar({ liveTraceOnHouse: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <span className="text-[10px] font-mono font-bold text-cyan-400">
                  {liveTraceOnHouse ? 'ON' : 'OFF'}
                </span>
                <div className="w-8 h-4 bg-slate-700 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500 relative" />
              </label>
            </div>

            <div className="rounded bg-[#141c2b]/90 border border-[#2b3954] px-2.5 py-1.5 text-[11px] font-mono text-slate-300 backdrop-blur-sm flex items-center gap-3">
              <span>
                Cursor: X:{cursorCoords.x} Y:{cursorCoords.y}
              </span>
              <button
                type="button"
                onClick={() => setVectorToolbar({ canvasZoom: 67 })}
                className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-[10px] font-bold text-amber-200 transition-colors"
              >
                Overscan 150%
              </button>
              <button
                type="button"
                onClick={() => setVectorToolbar({ canvasZoom: 100 })}
                className="px-2 py-0.5 rounded bg-[#222e45] hover:bg-[#2c3b57] border border-[#364869] text-[10px] font-semibold text-white transition-colors"
              >
                Fit 100%
              </button>
            </div>
          </div>

          {/* Interactive SVG Vector Canvas */}
          <svg
            ref={svgRef}
            viewBox={computeZoomViewBox(1080, 600, canvasZoom, canvasPan.x, canvasPan.y).viewBox}
            className={`w-full h-full object-contain ${canvasPan.x !== 0 || canvasPan.y !== 0 ? 'cursor-grab' : 'cursor-crosshair'}`}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onPointerLeave={handleCanvasPointerUp}
            onMouseDown={handleMiddleMouseDown}
            onClick={handleCanvasClick}
          >
            <defs>
              <linearGradient id="screen2NightSky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0b1528" />
                <stop offset="100%" stopColor="#1b2c47" />
              </linearGradient>
              <pattern
                id="vectorSnapGrid"
                width="32"
                height="32"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 32 0 L 0 0 0 32"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="0.6"
                  strokeOpacity="0.3"
                />
              </pattern>
              <filter id="vectorGlow">
                <feGaussianBlur stdDeviation="2.2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Outer Overscan Pasteboard Background (visible when zoomed out < 100%) */}
            <rect
              x="-1080"
              y="-600"
              width="3240"
              height="1800"
              fill="#050811"
            />
            {showGrid && (
              <rect
                x="-1080"
                y="-600"
                width="3240"
                height="1800"
                fill="url(#vectorSnapGrid)"
              />
            )}

            {/* 100% Frame Boundary Indicator + Austin's Real House Reference Photo */}
            <rect
              x="0"
              y="0"
              width="1080"
              height="600"
              fill="#000000"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeDasharray="8 5"
              strokeOpacity="0.6"
            />
            <image
              href={customReferencePhotoUrl || AUSTIN_HOUSE_ASSETS.photos.v1EctoOpenGarage}
              x="0"
              y="0"
              width="1080"
              height="600"
              preserveAspectRatio="xMidYMid meet"
              opacity={liveTraceOnHouse ? '0.55' : '0.1'}
            />
            <image
              href={AUSTIN_HOUSE_ASSETS.wireframeLayout}
              x="0"
              y="0"
              width="1080"
              height="600"
              preserveAspectRatio="xMidYMid meet"
              style={{
                mixBlendMode: 'screen',
                opacity: liveTraceOnHouse ? 0.75 : 0.25,
              }}
            />

            {showGrid && (
              <rect width="1080" height="600" fill="url(#vectorSnapGrid)" />
            )}

            {/* Dynamic Selection Transform Bounding Box for Selected Layer */}
            {selectedBounds && (
              <g>
                <rect
                  x={selectedBounds.x}
                  y={selectedBounds.y}
                  width={selectedBounds.w}
                  height={selectedBounds.h}
                  fill={isDraggingBounds ? 'rgba(56, 189, 248, 0.15)' : 'rgba(56, 189, 248, 0.04)'}
                  stroke={isDraggingBounds ? '#38bdf8' : '#7dd3fc'}
                  strokeWidth={isDraggingBounds ? '2' : '1.5'}
                  strokeDasharray="4 2"
                  className={activeVectorTool === 'select' ? 'cursor-move' : 'cursor-pointer'}
                  onPointerDown={handleBoundsPointerDown}
                  onPointerMove={handleBoundsPointerMove}
                  onPointerUp={handleBoundsPointerUp}
                />
                {/* Rotation Handle Stalk */}
                <line
                  x1={selectedBounds.cx}
                  y1={selectedBounds.y}
                  x2={selectedBounds.cx}
                  y2={selectedBounds.y - 20}
                  stroke="#7dd3fc"
                  strokeWidth="1.5"
                />
                <circle
                  cx={selectedBounds.cx}
                  cy={selectedBounds.y - 22}
                  r={isRotatingBounds ? '6' : '4.5'}
                  fill={isRotatingBounds ? '#38bdf8' : '#7dd3fc'}
                  stroke="#0f172a"
                  strokeWidth="1.5"
                  className="cursor-grab active:cursor-grabbing"
                  onPointerDown={handleRotationPointerDown}
                  onPointerMove={handleRotationPointerMove}
                  onPointerUp={handleRotationPointerUp}
                />
              </g>
            )}

            {/* Render All Visible Vector Layers & Draggable Vertex Handles */}
            {layers.map((layer) => {
              if (!layer.visible) return null;
              if (anySolo && !layer.solo) return null;
              const isSelected = layer.id === selectedLayerId;
              const pointsStr = layer.vertices
                .map((v) => `${v.x},${v.y}`)
                .join(' ');

              return (
                <g
                  key={layer.id}
                  filter="url(#vectorGlow)"
                  onClick={(e) => {
                    e.stopPropagation();
                    setVectorToolbar({ selectedLayerId: layer.id });
                  }}
                  className="cursor-pointer"
                >
                  <polygon
                    points={pointsStr}
                    fill={
                      layer.role === 'Hard Blackout Cutout'
                        ? layer.blackoutShade || 'rgba(239, 68, 68, 0.25)'
                        : layer.role === 'Structural Guide Line'
                        ? 'none'
                        : `rgba(0, 240, 255, ${((layer.opacity ?? 100) / 100) * 0.12})`
                    }
                    stroke={layer.color}
                    strokeWidth={
                      layer.strokeWidth || Math.max(1, layer.outlineGlowWidth)
                    }
                    strokeDasharray={
                      layer.dashPattern === 'dashed'
                        ? '6 4'
                        : layer.dashPattern === 'dotted'
                        ? '2 3'
                        : layer.dashPattern === 'laser'
                        ? '10 3 2 3'
                        : undefined
                    }
                    style={{
                      filter:
                        layer.edgeFeathering > 0
                          ? `drop-shadow(0 0 ${layer.edgeFeathering}px ${layer.color})`
                          : undefined,
                    }}
                  />

                  {/* Vertex Control Point Handles */}
                  {layer.vertices.map((v, vIdx) => (
                    <g
                      key={vIdx}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        if (e.button === 2) return; // Right-click handled by onContextMenu
                        if (e.altKey) {
                          if (layer.locked) {
                            showToast(`Layer "${layer.name}" is locked`);
                            return;
                          }
                          pushHistory(layer.vertices);
                          const nextVertices = layer.vertices.filter(
                            (_, idx) => idx !== vIdx
                          );
                          updateLayer(layer.id, { vertices: nextVertices });
                          showToast(
                            `Deleted vertex #${vIdx + 1} from "${layer.name}" (${nextVertices.length} remaining)`
                          );
                          return;
                        }
                        e.currentTarget.setPointerCapture(e.pointerId);
                        pushHistory(layer.vertices);
                        setVectorToolbar({ selectedLayerId: layer.id });
                        setDraggingVertex({ layerId: layer.id, index: vIdx });
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (layer.locked) {
                          showToast(`Layer "${layer.name}" is locked`);
                          return;
                        }
                        pushHistory(layer.vertices);
                        const nextVertices = layer.vertices.filter(
                          (_, idx) => idx !== vIdx
                        );
                        updateLayer(layer.id, { vertices: nextVertices });
                        showToast(
                          `Deleted vertex #${vIdx + 1} from "${layer.name}" (${nextVertices.length} remaining)`
                        );
                      }}
                      onPointerUp={(e) => {
                        try {
                          e.currentTarget.releasePointerCapture(e.pointerId);
                        } catch {}
                        setDraggingVertex(null);
                      }}
                      className="cursor-pointer"
                    >
                      <title>{`Vertex #${vIdx + 1} (${v.x}, ${v.y}) - Drag to move, Alt+Click or Right-Click to delete`}</title>
                      <rect
                        x={v.x - 4.5}
                        y={v.y - 4.5}
                        width="9"
                        height="9"
                        rx="1.5"
                        fill={isSelected ? '#ffffff' : '#0f172a'}
                        stroke={layer.color}
                        strokeWidth="2"
                      />
                    </g>
                  ))}
                </g>
              );
            })}

            {/* Dynamic Live Pen Guide Line from Last Vertex to Cursor */}
            {activeVectorTool === 'pen' &&
              selectedLayer.vertices.length > 0 && (
                <line
                  x1={
                    selectedLayer.vertices[selectedLayer.vertices.length - 1].x
                  }
                  y1={
                    selectedLayer.vertices[selectedLayer.vertices.length - 1].y
                  }
                  x2={cursorCoords.x}
                  y2={cursorCoords.y}
                  stroke={selectedLayer.color}
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  opacity="0.8"
                />
              )}

            {/* Dynamic Rectangle Drag Preview */}
            {activeVectorTool === 'rectangle' &&
              rectDragStart &&
              rectDragCurrent && (
                <rect
                  x={Math.min(rectDragStart.x, rectDragCurrent.x)}
                  y={Math.min(rectDragStart.y, rectDragCurrent.y)}
                  width={Math.abs(rectDragCurrent.x - rectDragStart.x)}
                  height={Math.abs(rectDragCurrent.y - rectDragStart.y)}
                  fill="rgba(56, 189, 248, 0.2)"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              )}

            {/* Ground Alignment Vector Segments */}
            <polyline
              points="85,495 360,488 415,498"
              fill="none"
              stroke="#22c55e"
              strokeWidth="2.5"
              filter="url(#vectorGlow)"
            />
            <polyline
              points="520,498 585,488 980,492"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2.5"
              filter="url(#vectorGlow)"
            />
          </svg>
        </div>
      </main>

      {/* RIGHT SURFACE INSPECTOR PANEL */}
      <aside className="w-[285px] shrink-0 bg-[#111723] border-l border-[#1f293a] p-5 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold tracking-wider uppercase text-slate-200">
              SURFACE INSPECTOR
            </h2>
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: selectedLayer.color }}
              />
              <input
                type="text"
                value={selectedLayer.name}
                onChange={(e) =>
                  updateLayer(selectedLayer.id, { name: e.target.value })
                }
                className="w-28 px-2 py-0.5 rounded bg-[#182236] border border-[#2f3e5b] text-[11px] font-bold text-white focus:outline-none focus:border-cyan-400 truncate"
                title="Rename Layer"
              />
            </div>
          </div>

          {/* Color Picker & Quick Neon Swatch Palette */}
          <div className="p-2.5 rounded-lg bg-[#0d1420] border border-[#1f2b3e] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Layer Color:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={selectedLayer.color}
                  onChange={(e) =>
                    updateLayer(selectedLayer.id, { color: e.target.value })
                  }
                  className="w-6 h-6 rounded border border-slate-600 bg-transparent cursor-pointer p-0"
                  title="Custom Color Picker"
                />
                <span className="text-xs font-mono text-cyan-300 font-bold uppercase">
                  {selectedLayer.color}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-[#1a2436]">
              <span className="text-[10px] text-slate-500 uppercase font-mono">
                Presets:
              </span>
              <div className="flex items-center gap-1.5">
                {[
                  '#00f0ff',
                  '#22c55e',
                  '#d946ef',
                  '#f59e0b',
                  '#ef4444',
                  '#eab308',
                ].map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() =>
                      updateLayer(selectedLayer.id, { color: swatch })
                    }
                    className={`w-4 h-4 rounded-full border transition-all cursor-pointer ${
                      selectedLayer.color.toLowerCase() === swatch.toLowerCase()
                        ? 'scale-125 border-white shadow-[0_0_8px_rgba(255,255,255,0.7)] ring-1 ring-cyan-400'
                        : 'border-black/60 hover:scale-110 opacity-75 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: swatch }}
                    title={`Set color ${swatch}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Layer Category Assignment Dropdown */}
          <div className="p-2.5 rounded-lg bg-[#0d1420] border border-[#1f2b3e] flex items-center justify-between gap-2">
            <label
              htmlFor="layer-category-select"
              className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0"
            >
              Category:
            </label>
            <select
              id="layer-category-select"
              value={selectedLayer.category}
              onChange={(e) =>
                updateLayer(selectedLayer.id, {
                  category: e.target.value as VectorLayer['category'],
                })
              }
              className="flex-1 bg-[#182236] border border-[#2f3e5b] rounded px-2.5 py-1 text-xs font-bold text-slate-100 focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              {LAYER_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Numeric Input Boxes: Position X/Y, Width, Height, Rotation */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400">Position X:</span>
              <input
                type="text"
                value={`${selectedLayer.positionX}px`}
                onChange={(e) =>
                  updateLayer(selectedLayer.id, {
                    positionX:
                      parseInt(e.target.value.replace(/\D/g, ''), 10) || 0,
                  })
                }
                className="w-20 px-2.5 py-1.5 rounded bg-[#1d273b] border border-[#2f3e5b] text-xs font-mono text-white text-center"
              />
              <span className="text-xs text-slate-400">Y:</span>
              <input
                type="text"
                value={`${selectedLayer.positionY}px`}
                onChange={(e) =>
                  updateLayer(selectedLayer.id, {
                    positionY:
                      parseInt(e.target.value.replace(/\D/g, ''), 10) || 0,
                  })
                }
                className="w-20 px-2.5 py-1.5 rounded bg-[#1d273b] border border-[#2f3e5b] text-xs font-mono text-white text-center"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400">Width:</span>
              <input
                type="text"
                value={`${selectedLayer.width}px`}
                onChange={(e) =>
                  updateLayer(selectedLayer.id, {
                    width: parseInt(e.target.value.replace(/\D/g, ''), 10) || 0,
                  })
                }
                className="w-20 px-2.5 py-1.5 rounded bg-[#1d273b] border border-[#2f3e5b] text-xs font-mono text-white text-center"
              />
              <span className="text-xs text-slate-400">Height:</span>
              <input
                type="text"
                value={`${selectedLayer.height}px`}
                onChange={(e) =>
                  updateLayer(selectedLayer.id, {
                    height:
                      parseInt(e.target.value.replace(/\D/g, ''), 10) || 0,
                  })
                }
                className="w-20 px-2.5 py-1.5 rounded bg-[#1d273b] border border-[#2f3e5b] text-xs font-mono text-white text-center"
              />
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">Rotation:</span>
              <input
                type="text"
                value={`${selectedLayer.rotation.toFixed(1)}°`}
                onChange={(e) =>
                  updateLayer(selectedLayer.id, {
                    rotation: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-20 px-2.5 py-1.5 rounded bg-[#1d273b] border border-[#2f3e5b] text-xs font-mono text-white text-center"
              />
            </div>
          </div>

          <div className="border-t border-[#222d42] pt-4 space-y-4">
            {/* Edge Feathering Slider (0-50 px) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-300">
                  Edge Feathering (0-50 px)
                </span>
                <span className="px-2.5 py-1 rounded bg-[#1d273b] border border-[#2f3e5b] text-xs font-mono font-bold text-white">
                  {selectedLayer.edgeFeathering}px
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                value={selectedLayer.edgeFeathering}
                onChange={(e) =>
                  updateLayer(selectedLayer.id, {
                    edgeFeathering: Number(e.target.value),
                  })
                }
                className="w-full"
              />
            </div>

            {/* Outline Glow Width Slider (1-20 px) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-300">
                  Outline Glow Width (1-20 px)
                </span>
                <span className="px-2.5 py-1 rounded bg-[#1d273b] border border-[#2f3e5b] text-xs font-mono font-bold text-white">
                  {selectedLayer.outlineGlowWidth}px
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={selectedLayer.outlineGlowWidth}
                onChange={(e) =>
                  updateLayer(selectedLayer.id, {
                    outlineGlowWidth: Number(e.target.value),
                  })
                }
                className="w-full"
              />
            </div>
          </div>

          {/* Interactive Vertex Mesh Tools: DELETE LAST VERTEX & EXPORT SVG MASK */}
          <div className="border-t border-[#222d42] pt-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span>Vertex Tools</span>
              <span className="font-mono text-cyan-400">
                {selectedLayer.vertices.length} pts
              </span>
            </div>

            <button
              type="button"
              onClick={handleDeleteLastVertex}
              disabled={selectedLayer.vertices.length === 0}
              className="w-full py-2.5 px-3 rounded-lg bg-[#202738] hover:bg-[#2b344a] disabled:opacity-40 disabled:cursor-not-allowed border border-[#2f3e5b] text-xs font-bold text-rose-300 hover:text-rose-200 inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              DELETE LAST VERTEX
            </button>

            {/* Center Layer & Reset Vertices Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCenterLayer}
                disabled={selectedLayer.vertices.length === 0 || selectedLayer.locked}
                className="py-2 px-2 rounded-lg bg-[#1c2638] hover:bg-[#25324b] disabled:opacity-40 border border-[#2f3e5b] text-[11px] font-bold text-slate-200 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Center layer bounding box in 1080x600 canvas"
              >
                <Focus className="w-3.5 h-3.5 text-cyan-400" />
                CENTER LAYER
              </button>

              <button
                type="button"
                onClick={handleResetLayerVertices}
                disabled={selectedLayer.locked}
                className="py-2 px-2 rounded-lg bg-[#1c2638] hover:bg-[#25324b] disabled:opacity-40 border border-[#2f3e5b] text-[11px] font-bold text-slate-200 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Reset layer vertices to standard rectangle"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                RESET VERTICES
              </button>
            </div>

            {/* Flip Horizontal & Flip Vertical Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleFlipHorizontal}
                disabled={selectedLayer.vertices.length === 0 || selectedLayer.locked}
                className="py-2 px-2 rounded-lg bg-[#1c2638] hover:bg-[#25324b] disabled:opacity-40 border border-[#2f3e5b] text-[11px] font-bold text-slate-200 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Flip layer horizontally across bounding box center"
              >
                <FlipHorizontal className="w-3.5 h-3.5 text-blue-400" />
                FLIP HORIZ
              </button>

              <button
                type="button"
                onClick={handleFlipVertical}
                disabled={selectedLayer.vertices.length === 0 || selectedLayer.locked}
                className="py-2 px-2 rounded-lg bg-[#1c2638] hover:bg-[#25324b] disabled:opacity-40 border border-[#2f3e5b] text-[11px] font-bold text-slate-200 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Flip layer vertically across bounding box center"
              >
                <FlipVertical className="w-3.5 h-3.5 text-blue-400" />
                FLIP VERT
              </button>
            </div>

            {/* Hidden Input for Import SVG Mask */}
            <input
              ref={svgImportInputRef}
              type="file"
              accept=".svg,image/svg+xml"
              onChange={handleImportSvgFile}
              className="hidden"
            />

            {/* Import & Export SVG Mask Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => svgImportInputRef.current?.click()}
                className="py-2.5 px-2 rounded-lg bg-[#142338] hover:bg-[#1b304c] border border-cyan-500/40 text-[11px] font-bold text-cyan-200 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Import architectural polygons from SVG file"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                IMPORT SVG MASK (.SVG)
              </button>

              <button
                type="button"
                onClick={handleExportSvgMask}
                className="py-2.5 px-2 rounded-lg bg-[#142338] hover:bg-[#1b304c] border border-cyan-500/40 text-[11px] font-bold text-cyan-200 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Export vector masks as SVG file"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                EXPORT SVG MASK (.SVG)
              </button>
            </div>
          </div>
        </div>

        {/* Bottom CTA: EXPORT LAYOUT TO AI STUDIO -> Routes to Screen 5 (AI Studio) */}
        <button
          type="button"
          onClick={exportLayoutToAiStudio}
          className="relative w-full py-5 px-4 rounded-lg bg-[#2573f0] hover:bg-[#1d64d8] active:bg-[#1956bc] text-white font-extrabold text-xs tracking-wider uppercase shadow-[0_6px_20px_rgba(37,115,240,0.45)] border border-blue-400/40 transition-all cursor-pointer mt-4"
        >
          <span className="absolute top-1.5 right-2 px-1.5 py-0.5 rounded bg-black/25 text-[9px] font-mono font-bold text-blue-100 border border-white/15">
            CTA
          </span>
          EXPORT LAYOUT TO AI STUDIO (SCREEN 5)
        </button>
      </aside>
    </div>
  );
};
