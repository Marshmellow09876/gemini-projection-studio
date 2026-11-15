import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  Grid,
  Crosshair,
  Palette,
  Focus,
  Maximize2,
  Minimize2,
  Scissors,
  Check,
  RotateCcw,
  RotateCw,
  Sparkles,
  Sliders,
  Download,
  Layers,
  Eye,
  Monitor,
  Copy,
  ChevronRight,
  Info,
  Tv,
  Square,
  RefreshCw,
  HelpCircle,
  FileCheck2,
  Zap
} from 'lucide-react';
import { useProjectionStore, VectorLayer } from '../../store/useProjectionStore';
import {
  TestPatternType,
  TestPatternOptions,
  TEST_PATTERN_CATALOG,
  renderTestPatternToCanvas,
  simplifyPolygonRamerDouglasPeucker,
  computePolygonPerimeter,
  computePolygonArea,
  calculateVertexReduction,
  globalUndoManager,
  downloadCanvasAsPng,
  getCommonAspectLabel,
  Point2D,
  UndoableAction
} from '../../utils/testPatternsAndGeometryEngine';

export interface TestPatternsAndGeometryToolsModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  initialTab?: 'patterns' | 'simplifier';
}

interface ResolutionPreset {
  label: string;
  width: number;
  height: number;
  desc: string;
}

const RESOLUTION_PRESETS: ResolutionPreset[] = [
  { label: '1920 × 1080', width: 1920, height: 1080, desc: '1080p Full HD Standard' },
  { label: '1280 × 720', width: 1280, height: 720, desc: '720p HD' },
  { label: '2750 × 1536', width: 2750, height: 1536, desc: 'Runway/Kling AI Native' },
  { label: '3840 × 2160', width: 3840, height: 2160, desc: '4K Ultra HD' },
  { label: '1024 × 768', width: 1024, height: 768, desc: '4:3 Traditional Lens' },
  { label: 'Custom', width: 1920, height: 1080, desc: 'Custom Dimensions' }
];

const UNIFORM_COLOR_PRESETS = [
  { label: 'White', hex: '#FFFFFF', textDark: true },
  { label: 'Black', hex: '#000000', textDark: false },
  { label: 'Pure Red', hex: '#FF0000', textDark: false },
  { label: 'Pure Green', hex: '#00FF00', textDark: true },
  { label: 'Pure Blue', hex: '#0000FF', textDark: false },
  { label: 'Cyan', hex: '#00FFFF', textDark: true },
  { label: 'Magenta', hex: '#FF00FF', textDark: false },
  { label: 'Amber', hex: '#F59E0B', textDark: true }
];

export const TestPatternsAndGeometryToolsModal: React.FC<TestPatternsAndGeometryToolsModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
  initialTab = 'patterns'
}) => {
  const {
    layers,
    selectedLayerId,
    updateLayer,
    setLayers,
    showToast,
    projectorTestPattern,
    setProjectorTestPattern
  } = useProjectionStore();

  const [internalOpen, setInternalOpen] = useState(true);
  const isVisible = propIsOpen !== undefined ? propIsOpen : internalOpen;

  const handleClose = () => {
    if (propOnClose) propOnClose();
    else setInternalOpen(false);
  };

  // Active Tab: 'patterns' or 'simplifier'
  const [activeTab, setActiveTab] = useState<'patterns' | 'simplifier'>(initialTab);

  // Undo / Redo revision state to force re-render when history triggers
  const [, setHistoryRevision] = useState(0);

  // ==========================================
  // TAB 1: TEST PATTERNS STATE
  // ==========================================
  const [selectedPattern, setSelectedPattern] = useState<TestPatternType>('grid');
  const [selectedPresetLabel, setSelectedPresetLabel] = useState<string>('1920 × 1080');
  const [customWidth, setCustomWidth] = useState<number>(1920);
  const [customHeight, setCustomHeight] = useState<number>(1080);
  const [checkerCellPx, setCheckerCellPx] = useState<number>(64);
  const [gridSpacingPx, setGridSpacingPx] = useState<number>(50);
  const [uniformColor, setUniformColor] = useState<string>('#FFFFFF');
  const [focusStarWedges, setFocusStarWedges] = useState<number>(72);
  const [invertColors, setInvertColors] = useState<boolean>(false);
  const [showResolutionLabel, setShowResolutionLabel] = useState<boolean>(true);
  const [isFullscreenActive, setIsFullscreenActive] = useState<boolean>(false);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fullscreenCanvasRef = useRef<HTMLCanvasElement>(null);

  // Compute active dimensions
  const activeResolution = useMemo(() => {
    const preset = RESOLUTION_PRESETS.find((p) => p.label === selectedPresetLabel);
    if (preset && preset.label !== 'Custom') {
      return { width: preset.width, height: preset.height };
    }
    return { width: customWidth, height: customHeight };
  }, [selectedPresetLabel, customWidth, customHeight]);

  const patternOptions = useMemo<TestPatternOptions>(() => {
    return {
      pattern: selectedPattern,
      outputWidth: activeResolution.width,
      outputHeight: activeResolution.height,
      checkerCellPx,
      gridSpacingPx,
      uniformColor,
      focusStarWedges,
      invert: invertColors,
      showResolutionLabel
    };
  }, [
    selectedPattern,
    activeResolution,
    checkerCellPx,
    gridSpacingPx,
    uniformColor,
    focusStarWedges,
    invertColors,
    showResolutionLabel
  ]);

  // Re-render test pattern onto preview canvas
  useEffect(() => {
    if (previewCanvasRef.current && activeTab === 'patterns') {
      renderTestPatternToCanvas(previewCanvasRef.current, patternOptions);
    }
    if (fullscreenCanvasRef.current && isFullscreenActive) {
      renderTestPatternToCanvas(fullscreenCanvasRef.current, patternOptions);
    }
  }, [patternOptions, activeTab, isFullscreenActive]);

  // ==========================================
  // TAB 2: POLYGON SIMPLIFIER STATE
  // ==========================================
  const [selectedShapeId, setSelectedShapeId] = useState<string>(
    selectedLayerId || (layers && layers.length > 0 ? layers[0].id : '')
  );
  const [tolerancePx, setTolerancePx] = useState<number>(2.0);
  const [isClosedLoop, setIsClosedLoop] = useState<boolean>(true);

  const simplifierCanvasRef = useRef<HTMLCanvasElement>(null);

  // Keep selected shape synced if store changes
  useEffect(() => {
    if (selectedLayerId && layers.some((l) => l.id === selectedLayerId)) {
      setSelectedShapeId(selectedLayerId);
    } else if (layers.length > 0 && !layers.some((l) => l.id === selectedShapeId)) {
      setSelectedShapeId(layers[0].id);
    }
  }, [selectedLayerId, layers, selectedShapeId]);

  const targetLayer = useMemo(() => {
    return layers.find((l) => l.id === selectedShapeId) || layers[0] || null;
  }, [layers, selectedShapeId]);

  // Original vertices
  const originalVertices: Point2D[] = useMemo(() => {
    if (!targetLayer || !targetLayer.vertices) return [];
    return targetLayer.vertices.map((v) => ({ x: v.x, y: v.y }));
  }, [targetLayer]);

  // Simplified vertices computed with Ramer-Douglas-Peucker
  const simplifiedVertices: Point2D[] = useMemo(() => {
    if (!originalVertices || originalVertices.length === 0) return [];
    return simplifyPolygonRamerDouglasPeucker(originalVertices, tolerancePx, isClosedLoop);
  }, [originalVertices, tolerancePx, isClosedLoop]);

  // Decimation metrics
  const reductionStats = useMemo(() => {
    const origCount = originalVertices.length;
    const simpCount = simplifiedVertices.length;
    const { reducedCount, reductionPercent } = calculateVertexReduction(origCount, simpCount);

    const origPerimeter = computePolygonPerimeter(originalVertices, isClosedLoop);
    const simpPerimeter = computePolygonPerimeter(simplifiedVertices, isClosedLoop);
    const perimeterDeltaPct =
      origPerimeter > 0
        ? Math.abs(((simpPerimeter - origPerimeter) / origPerimeter) * 100).toFixed(2)
        : '0.00';

    const origArea = computePolygonArea(originalVertices);
    const simpArea = computePolygonArea(simplifiedVertices);
    const areaDeltaPct =
      origArea > 0 ? Math.abs(((simpArea - origArea) / origArea) * 100).toFixed(2) : '0.00';

    return {
      origCount,
      simpCount,
      reducedCount,
      reductionPercent,
      origPerimeter: Math.round(origPerimeter * 10) / 10,
      simpPerimeter: Math.round(simpPerimeter * 10) / 10,
      perimeterDeltaPct,
      origArea: Math.round(origArea),
      simpArea: Math.round(simpArea),
      areaDeltaPct
    };
  }, [originalVertices, simplifiedVertices, isClosedLoop]);

  // Draw comparison canvas for Douglas-Peucker simplifier
  useEffect(() => {
    if (activeTab !== 'simplifier' || !simplifierCanvasRef.current) return;
    const canvas = simplifierCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = canvas.parentElement?.clientWidth || 740);
    const height = (canvas.height = canvas.parentElement?.clientHeight || 480);

    ctx.clearRect(0, 0, width, height);

    // Dark grid background
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, width, height);

    // Subtle grid pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridStep = 40;
    for (let x = 0; x < width; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
      ctx.stroke();
    }

    if (originalVertices.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No shape vertices selected for decimation', width / 2, height / 2);
      return;
    }

    // Compute bounding box of original polygon
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    originalVertices.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    });

    const polyW = Math.max(1, maxX - minX);
    const polyH = Math.max(1, maxY - minY);
    const padding = 50;
    const scale = Math.min((width - padding * 2) / polyW, (height - padding * 2) / polyH);

    const offsetX = (width - polyW * scale) / 2 - minX * scale;
    const offsetY = (height - polyH * scale) / 2 - minY * scale;

    const transform = (p: Point2D) => ({
      x: p.x * scale + offsetX,
      y: p.y * scale + offsetY
    });

    // 1. Draw Original Polygon (Dashed Cyan with small hollow vertices)
    if (originalVertices.length >= 2) {
      ctx.save();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      const p0 = transform(originalVertices[0]);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < originalVertices.length; i++) {
        const pt = transform(originalVertices[i]);
        ctx.lineTo(pt.x, pt.y);
      }
      if (isClosedLoop && originalVertices.length >= 3) {
        ctx.closePath();
      }
      ctx.stroke();
      ctx.restore();

      // Original vertex dots (subtle cyan)
      ctx.fillStyle = '#0891b2';
      originalVertices.forEach((p) => {
        const pt = transform(p);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // 2. Draw Simplified Polygon (Solid Amber / Orange with prominent vertex nodes)
    if (simplifiedVertices.length >= 2) {
      ctx.save();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const s0 = transform(simplifiedVertices[0]);
      ctx.moveTo(s0.x, s0.y);
      for (let i = 1; i < simplifiedVertices.length; i++) {
        const pt = transform(simplifiedVertices[i]);
        ctx.lineTo(pt.x, pt.y);
      }
      if (isClosedLoop && simplifiedVertices.length >= 3) {
        ctx.closePath();
      }
      ctx.stroke();
      ctx.restore();

      // Simplified vertex nodes (glowing gold)
      simplifiedVertices.forEach((p, idx) => {
        const pt = transform(p);
        // Outer halo
        ctx.fillStyle = 'rgba(245, 158, 11, 0.3)';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Inner solid node
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Start point indicator
        if (idx === 0) {
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });
    }
  }, [originalVertices, simplifiedVertices, activeTab, isClosedLoop]);

  // ==========================================
  // ACTIONS & HANDLERS
  // ==========================================

  // Apply decimation to active layer with UndoableAction registered
  const handleApplyDecimation = useCallback(() => {
    if (!targetLayer) return;

    const layerId = targetLayer.id;
    const oldVerts = [...targetLayer.vertices];
    const newVerts = simplifiedVertices.map((p) => ({ x: p.x, y: p.y }));

    updateLayer(layerId, { vertices: newVerts });

    const action: UndoableAction = {
      id: `dp-decimate-${Date.now()}`,
      name: `Simplify ${targetLayer.name} (${oldVerts.length} → ${newVerts.length} pts)`,
      timestamp: Date.now(),
      undo: () => {
        updateLayer(layerId, { vertices: oldVerts });
        setHistoryRevision((r) => r + 1);
        showToast(`Undid decimation on '${targetLayer.name}'`);
      },
      redo: () => {
        updateLayer(layerId, { vertices: newVerts });
        setHistoryRevision((r) => r + 1);
        showToast(`Redid decimation on '${targetLayer.name}'`);
      }
    };

    globalUndoManager.push(action);
    setHistoryRevision((r) => r + 1);

    showToast(
      `Decimated '${targetLayer.name}': ${reductionStats.origCount} → ${reductionStats.simpCount} vertices (${reductionStats.reductionPercent}% reduction)`
    );
  }, [targetLayer, simplifiedVertices, updateLayer, showToast, reductionStats]);

  // Batch Decimate All Traced Shapes with UndoableAction
  const handleBatchDecimateAll = useCallback(() => {
    if (!layers || layers.length === 0) return;

    const previousLayersSnapshot = JSON.parse(JSON.stringify(layers)) as VectorLayer[];
    let totalOld = 0;
    let totalNew = 0;

    const nextLayers = layers.map((layer) => {
      if (!layer.vertices || layer.vertices.length <= 4) {
        totalOld += layer.vertices ? layer.vertices.length : 0;
        totalNew += layer.vertices ? layer.vertices.length : 0;
        return layer;
      }
      totalOld += layer.vertices.length;
      const pts = layer.vertices.map((v) => ({ x: v.x, y: v.y }));
      const decimated = simplifyPolygonRamerDouglasPeucker(pts, tolerancePx, true);
      totalNew += decimated.length;
      return {
        ...layer,
        vertices: decimated.map((p) => ({ x: p.x, y: p.y }))
      };
    });

    setLayers(nextLayers);

    const action: UndoableAction = {
      id: `dp-batch-decimate-${Date.now()}`,
      name: `Batch decimate ${layers.length} shapes (${totalOld} → ${totalNew} pts)`,
      timestamp: Date.now(),
      undo: () => {
        setLayers(previousLayersSnapshot);
        setHistoryRevision((r) => r + 1);
        showToast('Restored all shapes to pre-decimation vertices');
      },
      redo: () => {
        setLayers(nextLayers);
        setHistoryRevision((r) => r + 1);
        showToast('Re-applied batch decimation across all shapes');
      }
    };

    globalUndoManager.push(action);
    setHistoryRevision((r) => r + 1);

    const overallPct = totalOld > 0 ? Math.round(((totalOld - totalNew) / totalOld) * 1000) / 10 : 0;
    showToast(
      `Batch decimated ${layers.length} shapes: ${totalOld} → ${totalNew} total vertices (${overallPct}% reduction)`
    );
  }, [layers, tolerancePx, setLayers, showToast]);

  // Undo / Redo triggers
  const handleUndo = useCallback(() => {
    if (globalUndoManager.canUndo()) {
      globalUndoManager.undo();
      setHistoryRevision((r) => r + 1);
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (globalUndoManager.canRedo()) {
      globalUndoManager.redo();
      setHistoryRevision((r) => r + 1);
    }
  }, []);

  // Download high-resolution PNG
  const handleDownloadPng = useCallback(() => {
    if (previewCanvasRef.current) {
      const filename = `gemini-test-pattern-${selectedPattern}-${activeResolution.width}x${activeResolution.height}.png`;
      downloadCanvasAsPng(previewCanvasRef.current, filename);
      showToast(`Exported test pattern: ${filename}`);
    }
  }, [selectedPattern, activeResolution, showToast]);

  // Toggle Fullscreen Projection Mode
  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreenActive((prev) => !prev);
  }, []);

  // Keyboard shortcut listener (Escape to exit fullscreen / close, Ctrl+Z undo)
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreenActive) {
          setIsFullscreenActive(false);
        } else {
          handleClose();
        }
      } else if (e.key === 'F11' && activeTab === 'patterns') {
        e.preventDefault();
        setIsFullscreenActive((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, isFullscreenActive, activeTab, handleUndo, handleRedo]);

  if (!isVisible) return null;

  // Icon lookup for 10 patterns
  const getPatternIcon = (type: TestPatternType) => {
    switch (type) {
      case 'grid':
        return <Grid className="w-4 h-4" />;
      case 'crosshairs':
        return <Crosshair className="w-4 h-4" />;
      case 'smpte_bars':
        return <Sliders className="w-4 h-4" />;
      case 'checkerboard':
        return <Layers className="w-4 h-4" />;
      case 'focus_star':
        return <Focus className="w-4 h-4" />;
      case 'aspect_test':
        return <Tv className="w-4 h-4" />;
      case 'ansi_contrast':
        return <Square className="w-4 h-4" />;
      case 'grayscale_16':
        return <Sliders className="w-4 h-4" />;
      case 'uniform_wash':
        return <Palette className="w-4 h-4" />;
      case 'uv_gradient':
        return <Sparkles className="w-4 h-4" />;
    }
  };

  return (
    <>
      {/* ========================================== */}
      {/* 1. FULLSCREEN PROJECTION POPUP MODE        */}
      {/* ========================================== */}
      {isFullscreenActive && (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center cursor-default">
          <canvas
            ref={fullscreenCanvasRef}
            className="w-full h-full object-contain"
            style={{ imageRendering: 'pixelated' }}
          />

          {/* Floating Minimalist Control Pill */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#0c1424]/90 border border-cyan-500/40 backdrop-blur-md rounded-full px-5 py-2 flex items-center gap-4 text-xs font-mono shadow-2xl opacity-75 hover:opacity-100 transition-opacity">
            <span className="text-cyan-300 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              {selectedPattern.toUpperCase()} ({activeResolution.width}×{activeResolution.height})
            </span>

            <select
              value={selectedPattern}
              onChange={(e) => setSelectedPattern(e.target.value as TestPatternType)}
              className="bg-[#162032] border border-cyan-500/30 text-cyan-200 rounded px-2 py-1 outline-none text-xs"
            >
              {TEST_PATTERN_CATALOG.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => setInvertColors((v) => !v)}
              className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
                invertColors
                  ? 'bg-amber-500/30 border border-amber-500 text-amber-300'
                  : 'bg-white/10 hover:bg-white/20 text-slate-300'
              }`}
            >
              <RotateCw className="w-3 h-3" />
              Invert
            </button>

            <button
              onClick={handleToggleFullscreen}
              className="px-3 py-1 rounded bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/40 flex items-center gap-1 text-xs"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              Exit (Esc)
            </button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 2. MAIN MODAL CONTAINER                    */}
      {/* ========================================== */}
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
        <div className="bg-[#0b101b] border border-cyan-500/30 rounded-2xl shadow-2xl w-full max-w-7xl h-[92vh] flex flex-col overflow-hidden text-slate-200">
          {/* HEADER */}
          <div className="px-6 py-4 border-b border-cyan-500/20 bg-[#0c1424]/90 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                {activeTab === 'patterns' ? (
                  <Grid className="w-5 h-5" />
                ) : (
                  <Scissors className="w-5 h-5 text-amber-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold text-white tracking-wide">
                    TEST PATTERNS & GEOMETRY TOOLS
                  </h2>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    LUMEN-MAP AI v3.5
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Projector Calibration Alignment, Optical Focus, Color Purity & Douglas-Peucker Decimator
                </p>
              </div>
            </div>

            {/* TAB SELECTOR & TOP CONTROLS */}
            <div className="flex items-center gap-3">
              {/* Tab Pills */}
              <div className="flex bg-[#162032] p-1 rounded-xl border border-cyan-500/20">
                <button
                  onClick={() => setActiveTab('patterns')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'patterns'
                      ? 'bg-cyan-500 text-black shadow-lg font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  Test Patterns Studio
                </button>
                <button
                  onClick={() => setActiveTab('simplifier')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'simplifier'
                      ? 'bg-amber-500 text-black shadow-lg font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  Polygon Simplifier (Douglas-Peucker)
                </button>
              </div>

              {/* Undo / Redo */}
              <div className="flex items-center gap-1 border-l border-slate-700 pl-3">
                <button
                  onClick={handleUndo}
                  disabled={!globalUndoManager.canUndo()}
                  title="Undo Last Action (Ctrl+Z)"
                  className="p-1.5 rounded-lg bg-[#162032] hover:bg-[#1f2d47] border border-cyan-500/20 text-slate-300 disabled:opacity-30 disabled:hover:bg-[#162032] transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={!globalUndoManager.canRedo()}
                  title="Redo (Ctrl+Y)"
                  className="p-1.5 rounded-lg bg-[#162032] hover:bg-[#1f2d47] border border-cyan-500/20 text-slate-300 disabled:opacity-30 disabled:hover:bg-[#162032] transition-colors"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>

              {/* Close Button */}
              <button
                onClick={handleClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ============================================================== */}
          {/* TAB 1: PROJECTOR ALIGNMENT TEST PATTERNS STUDIO               */}
          {/* ============================================================== */}
          {activeTab === 'patterns' && (
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* Left Column: 10-Pattern Selector & Controls */}
              <div className="w-full lg:w-96 border-r border-cyan-500/20 bg-[#0c1424]/60 flex flex-col overflow-y-auto p-4 space-y-4">
                {/* 10-Pattern Grid Buttons */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                      Select Pattern (10 Styles)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {TEST_PATTERN_CATALOG.length} Standard Patterns
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {TEST_PATTERN_CATALOG.map((item) => {
                      const isSelected = selectedPattern === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setSelectedPattern(item.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'bg-cyan-500/15 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                              : 'bg-[#131c2e]/70 border-slate-700/60 hover:bg-[#1a263e] hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              className={`p-1 rounded-lg ${
                                isSelected ? 'bg-cyan-400 text-black' : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {getPatternIcon(item.id)}
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-slate-400">
                              {item.category.split(' ')[0]}
                            </span>
                          </div>
                          <div>
                            <div
                              className={`text-xs font-semibold ${
                                isSelected ? 'text-cyan-200' : 'text-slate-200'
                              }`}
                            >
                              {item.shortName}
                            </div>
                            <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                              {item.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Pattern Info Card */}
                {(() => {
                  const currentItem = TEST_PATTERN_CATALOG.find((p) => p.id === selectedPattern);
                  return (
                    currentItem && (
                      <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-xs">
                        <div className="flex items-center gap-1.5 text-cyan-300 font-bold mb-1">
                          <Info className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{currentItem.name}</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed mb-1.5">
                          {currentItem.description}
                        </p>
                        <div className="text-[10px] text-cyan-400/90 font-mono">
                          <strong className="text-slate-400 font-sans">Ideal for:</strong>{' '}
                          {currentItem.idealFor}
                        </div>
                      </div>
                    )
                  );
                })()}

                {/* Calibration Controls */}
                <div className="space-y-3.5 border-t border-slate-700/60 pt-3">
                  <div className="text-[11px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                    Calibration Parameters
                  </div>

                  {/* Resolution Selector */}
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1.5">
                      Output Resolution
                    </label>
                    <select
                      value={selectedPresetLabel}
                      onChange={(e) => setSelectedPresetLabel(e.target.value)}
                      className="w-full bg-[#131c2e] border border-cyan-500/30 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
                    >
                      {RESOLUTION_PRESETS.map((p) => (
                        <option key={p.label} value={p.label}>
                          {p.label} — {p.desc}
                        </option>
                      ))}
                    </select>

                    {selectedPresetLabel === 'Custom' && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <span className="text-[10px] text-slate-400">Width (px)</span>
                          <input
                            type="number"
                            value={customWidth}
                            onChange={(e) => setCustomWidth(Math.max(100, Number(e.target.value)))}
                            className="w-full bg-[#131c2e] border border-slate-700 rounded px-2 py-1 text-xs text-white"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400">Height (px)</span>
                          <input
                            type="number"
                            value={customHeight}
                            onChange={(e) => setCustomHeight(Math.max(100, Number(e.target.value)))}
                            className="w-full bg-[#131c2e] border border-slate-700 rounded px-2 py-1 text-xs text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Contextual Parameters: Checkerboard Cell Size */}
                  {selectedPattern === 'checkerboard' && (
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                        <span>Checker Cell Size</span>
                        <span className="font-mono text-cyan-400">{checkerCellPx} px</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 mb-2">
                        {[16, 32, 64, 128].map((size) => (
                          <button
                            key={size}
                            onClick={() => setCheckerCellPx(size)}
                            className={`py-1 text-xs font-mono rounded border ${
                              checkerCellPx === size
                                ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200'
                                : 'bg-[#131c2e] border-slate-700 text-slate-400 hover:text-white'
                            }`}
                          >
                            {size}px
                          </button>
                        ))}
                      </div>
                      <input
                        type="range"
                        min="8"
                        max="256"
                        step="8"
                        value={checkerCellPx}
                        onChange={(e) => setCheckerCellPx(Number(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                    </div>
                  )}

                  {/* Contextual Parameters: Grid Spacing */}
                  {selectedPattern === 'grid' && (
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                        <span>Grid Spacing</span>
                        <span className="font-mono text-cyan-400">{gridSpacingPx} px</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 mb-2">
                        {[25, 50, 100, 200].map((spacing) => (
                          <button
                            key={spacing}
                            onClick={() => setGridSpacingPx(spacing)}
                            className={`py-1 text-xs font-mono rounded border ${
                              gridSpacingPx === spacing
                                ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200'
                                : 'bg-[#131c2e] border-slate-700 text-slate-400 hover:text-white'
                            }`}
                          >
                            {spacing}px
                          </button>
                        ))}
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="300"
                        step="5"
                        value={gridSpacingPx}
                        onChange={(e) => setGridSpacingPx(Number(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                    </div>
                  )}

                  {/* Contextual Parameters: Uniform Wash Color */}
                  {selectedPattern === 'uniform_wash' && (
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                        <span>Purity Color</span>
                        <span className="font-mono text-cyan-400">{uniformColor}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 mb-2">
                        {UNIFORM_COLOR_PRESETS.map((c) => (
                          <button
                            key={c.label}
                            onClick={() => setUniformColor(c.hex)}
                            style={{ backgroundColor: c.hex }}
                            className={`py-1.5 text-[10px] font-bold rounded border shadow-sm transition-transform active:scale-95 ${
                              c.textDark ? 'text-black' : 'text-white'
                            } ${
                              uniformColor.toLowerCase() === c.hex.toLowerCase()
                                ? 'ring-2 ring-cyan-400 border-white'
                                : 'border-slate-700'
                            }`}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={uniformColor}
                          onChange={(e) => setUniformColor(e.target.value)}
                          className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                        />
                        <input
                          type="text"
                          value={uniformColor}
                          onChange={(e) => setUniformColor(e.target.value)}
                          className="flex-1 bg-[#131c2e] border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Contextual Parameters: Focus Star Wedges */}
                  {selectedPattern === 'focus_star' && (
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                        <span>Radial Wedges</span>
                        <span className="font-mono text-cyan-400">{focusStarWedges} spokes</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[36, 72, 144].map((w) => (
                          <button
                            key={w}
                            onClick={() => setFocusStarWedges(w)}
                            className={`py-1 text-xs font-mono rounded border ${
                              focusStarWedges === w
                                ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200'
                                : 'bg-[#131c2e] border-slate-700 text-slate-400 hover:text-white'
                            }`}
                          >
                            {w} Wedges
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Toggles: Invert & HUD */}
                  <div className="pt-2 space-y-2">
                    <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                      <span>Invert Colors (Difference)</span>
                      <input
                        type="checkbox"
                        checked={invertColors}
                        onChange={(e) => setInvertColors(e.target.checked)}
                        className="rounded accent-cyan-400 w-4 h-4 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                      <span>Display HUD Info Badge</span>
                      <input
                        type="checkbox"
                        checked={showResolutionLabel}
                        onChange={(e) => setShowResolutionLabel(e.target.checked)}
                        className="rounded accent-cyan-400 w-4 h-4 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Right Column: Live High-Resolution Preview Canvas & Controls */}
              <div className="flex-1 flex flex-col bg-[#060a12] p-4 overflow-hidden">
                {/* Canvas Viewport Toolbar */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-cyan-300 font-mono">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      {activeResolution.width} × {activeResolution.height} (
                      {getCommonAspectLabel(activeResolution.width, activeResolution.height)})
                    </div>
                    {invertColors && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/30">
                        INVERTED
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Project on House live toggle */}
                    <button
                      onClick={() => {
                        const next = !projectorTestPattern;
                        setProjectorTestPattern(next);
                        showToast(
                          next
                            ? 'Test Pattern Enabled on Main Projector Feed'
                            : 'Test Pattern Disabled — Normal Stage Feed Active'
                        );
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        projectorTestPattern
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                          : 'bg-[#162032] border-slate-700 text-slate-300 hover:bg-[#1e2c45]'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      {projectorTestPattern ? 'Projecting on House' : 'Project to Stage'}
                    </button>

                    {/* Download High-Res PNG */}
                    <button
                      onClick={handleDownloadPng}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#162032] hover:bg-[#1e2c45] border border-cyan-500/30 text-cyan-200 text-xs transition-colors"
                      title="Download high-resolution test pattern PNG"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download PNG
                    </button>

                    {/* Fullscreen Button */}
                    <button
                      onClick={handleToggleFullscreen}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-all shadow-md active:scale-95"
                      title="Enter Fullscreen Mode (Press F11 or Esc to exit)"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      Fullscreen (F11)
                    </button>
                  </div>
                </div>

                {/* Canvas Container */}
                <div className="flex-1 flex items-center justify-center p-3 overflow-hidden bg-black/60 rounded-xl border border-slate-800/80 my-3 relative">
                  <canvas
                    ref={previewCanvasRef}
                    className="max-w-full max-h-full object-contain rounded shadow-2xl border border-cyan-500/20"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>

                {/* Footer hints */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>
                    Direct 1:1 hardware canvas rendering. Zero compression artifacts.
                  </span>
                  <span>
                    Shortcut: Press <kbd className="px-1 py-0.5 bg-slate-800 rounded text-cyan-300">F11</kbd> for Fullscreen | <kbd className="px-1 py-0.5 bg-slate-800 rounded text-cyan-300">Esc</kbd> to Exit
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: POLYGON SIMPLIFIER (RAMER-DOUGLAS-PEUCKER)              */}
          {/* ============================================================== */}
          {activeTab === 'simplifier' && (
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* Left Column: Shape Selection & Decimation Controls */}
              <div className="w-full lg:w-96 border-r border-amber-500/20 bg-[#0c1424]/60 flex flex-col overflow-y-auto p-4 space-y-4">
                {/* Shape Selector */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono text-amber-400 font-bold uppercase tracking-wider">
                      Target Traced House Shape
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {layers.length} Shapes Available
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {layers.map((layer) => {
                      const isSelected = selectedShapeId === layer.id;
                      const vertCount = layer.vertices ? layer.vertices.length : 0;
                      return (
                        <button
                          key={layer.id}
                          onClick={() => setSelectedShapeId(layer.id)}
                          className={`w-full p-2 rounded-xl border text-left transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                              : 'bg-[#131c2e]/70 border-slate-700/60 hover:bg-[#1a263e]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-3 h-3 rounded-full border border-white/40"
                              style={{ backgroundColor: layer.color || '#00f0ff' }}
                            />
                            <div>
                              <div
                                className={`text-xs font-semibold ${
                                  isSelected ? 'text-amber-200' : 'text-slate-200'
                                }`}
                              >
                                {layer.name}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {layer.category || 'Mask'}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                              isSelected
                                ? 'bg-amber-500 text-black font-bold'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {vertCount} pts
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tolerance Tuning Controls */}
                <div className="border-t border-slate-700/60 pt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-amber-400 font-bold uppercase tracking-wider">
                      RDP Tolerance (Epsilon)
                    </span>
                    <span className="text-sm font-mono font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                      {tolerancePx.toFixed(1)} px
                    </span>
                  </div>

                  {/* Quick Presets */}
                  <div className="grid grid-cols-5 gap-1">
                    {[
                      { label: '0.2px', val: 0.2, desc: 'Ultra' },
                      { label: '0.8px', val: 0.8, desc: 'Fine' },
                      { label: '2.0px', val: 2.0, desc: 'Balanced' },
                      { label: '5.0px', val: 5.0, desc: 'Aggressive' },
                      { label: '10.0px', val: 10.0, desc: 'Extreme' }
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => setTolerancePx(preset.val)}
                        className={`py-1 text-[10px] font-mono rounded border flex flex-col items-center ${
                          tolerancePx === preset.val
                            ? 'bg-amber-500 text-black font-bold border-amber-400 shadow'
                            : 'bg-[#131c2e] border-slate-700 text-slate-300 hover:text-white'
                        }`}
                      >
                        <span>{preset.label}</span>
                        <span className="text-[8px] opacity-75">{preset.desc}</span>
                      </button>
                    ))}
                  </div>

                  {/* Slider */}
                  <input
                    type="range"
                    min="0.1"
                    max="15.0"
                    step="0.1"
                    value={tolerancePx}
                    onChange={(e) => setTolerancePx(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />

                  {/* Closed Loop Toggle */}
                  <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer pt-1">
                    <span>Treat as Closed Loop Polygon</span>
                    <input
                      type="checkbox"
                      checked={isClosedLoop}
                      onChange={(e) => setIsClosedLoop(e.target.checked)}
                      className="rounded accent-amber-500 w-4 h-4 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Metrics Display Card */}
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#1a1c29] to-[#121622] border border-amber-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Decimation Metrics
                    </span>
                    <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      -{reductionStats.reductionPercent}% Vertices
                    </span>
                  </div>

                  {/* Big Vertex Reduction Comparison Banner */}
                  <div className="p-2.5 rounded-lg bg-black/40 border border-slate-700 flex items-center justify-around text-center">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Original</div>
                      <div className="text-base font-mono font-bold text-cyan-300">
                        {reductionStats.origCount}
                      </div>
                      <div className="text-[9px] text-cyan-500 font-mono">vertices</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-amber-400 animate-pulse" />
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Simplified</div>
                      <div className="text-base font-mono font-bold text-amber-300">
                        {reductionStats.simpCount}
                      </div>
                      <div className="text-[9px] text-amber-500 font-mono">vertices</div>
                    </div>
                    <div className="border-l border-slate-700 pl-3">
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Reduction</div>
                      <div className="text-base font-mono font-bold text-emerald-400">
                        {reductionStats.reducedCount}
                      </div>
                      <div className="text-[9px] text-emerald-500 font-mono">pts pruned</div>
                    </div>
                  </div>

                  {/* Geometric Integrity Data */}
                  <div className="text-[11px] space-y-1 font-mono text-slate-300 pt-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Perimeter Deviation:</span>
                      <span className="text-amber-200">
                        {reductionStats.origPerimeter}px → {reductionStats.simpPerimeter}px (Δ{' '}
                        {reductionStats.perimeterDeltaPct}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Surface Area Delta:</span>
                      <span className="text-amber-200">Δ {reductionStats.areaDeltaPct}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">GPU Vertex Buffer Load:</span>
                      <span className="text-emerald-400 font-bold">
                        -{reductionStats.reductionPercent}% Load
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 bg-amber-500/10 border border-amber-500/20 p-2 rounded text-center">
                    Preserves sharp architectural corners and building facade geometry without visual distortion.
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleApplyDecimation}
                    disabled={!targetLayer || reductionStats.origCount === 0}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    Apply Decimation to Shape
                  </button>

                  <button
                    onClick={handleBatchDecimateAll}
                    disabled={!layers || layers.length === 0}
                    className="w-full py-2 rounded-xl bg-[#162032] hover:bg-[#1f2d47] border border-amber-500/30 text-amber-200 text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Decimate All Traced Shapes ({layers.length})
                  </button>
                </div>
              </div>

              {/* Right Column: Visual Dual-Layer Comparison Canvas */}
              <div className="flex-1 flex flex-col bg-[#060a12] p-4 overflow-hidden">
                {/* Header Legend & Toolbar */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-0.5 border-t-2 border-dashed border-cyan-400 inline-block" />
                      <span className="text-cyan-300">
                        Original Shape ({reductionStats.origCount} pts)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-0.5 bg-amber-400 inline-block" />
                      <span className="text-amber-300 font-semibold">
                        Simplified Polygon ({reductionStats.simpCount} pts)
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono">
                    Target: <strong className="text-white">{targetLayer?.name || 'None'}</strong>
                  </div>
                </div>

                {/* Comparison Canvas Viewport */}
                <div className="flex-1 flex items-center justify-center p-3 overflow-hidden bg-black/60 rounded-xl border border-slate-800/80 my-3 relative">
                  <canvas
                    ref={simplifierCanvasRef}
                    className="w-full h-full object-contain rounded"
                  />
                </div>

                {/* Footer notes */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>
                    Interactive Dual-Layer overlay: Cyan dashed line = raw trace, Solid Amber = RDP decimated polygon.
                  </span>
                  <span>
                    Deep Transaction History: <kbd className="px-1 py-0.5 bg-slate-800 rounded text-amber-300">Ctrl+Z</kbd> to Undo anytime
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
