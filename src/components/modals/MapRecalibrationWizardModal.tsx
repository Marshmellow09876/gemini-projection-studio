import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Compass,
  Layers,
  Sparkles,
  Bookmark,
  GitBranch,
  Scissors,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Move,
  Maximize2,
  Minimize2,
  Sliders,
  Download,
  Upload,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  HelpCircle,
  ShieldAlert,
  FolderOpen,
  ArrowRight,
  ArrowLeft,
  Grid,
  Check,
  Tag,
  Crosshair,
  Wand2,
} from 'lucide-react';
import { useProjectionStore, VectorLayer, VectorVertex } from '../../store/useProjectionStore';
import {
  ExtendedLayerMetadata,
  GlobalMapWarpState,
  ShapeRecalibrationOffset,
  SemanticShapeTag,
  CalibrationPreset,
  ShapeStampTemplate,
  ShapeClassificationResult,
  HoleDiagnosticIssue,
  DEFAULT_STAGE_WIDTH,
  DEFAULT_STAGE_HEIGHT,
  DEFAULT_GLOBAL_WARP,
  DEFAULT_RECALIBRATION_OFFSET,
  getStoredExtendedMeta,
  saveStoredExtendedMeta,
  getLayerExtendedMeta,
  getStoredGlobalWarp,
  saveStoredGlobalWarp,
  loadCalibrationPresets,
  saveCalibrationPresets,
  exportCalibrationPresetJson,
  importCalibrationPresetJson,
  getBuiltInShapeTemplates,
  stampTemplateAtLocation,
  evaluateTransformChain,
  computePolygonCentroid,
  computePolygonBounds,
  autoDetectHolesInWalls,
  findMisplacedHoles,
  findShapesOverHoles,
  classifyMapShapes,
  mirrorLayerAcrossSymmetryAxis,
  alignAndDistributeLayers,
  createParametricEllipse,
  getEllipse6Handles,
  slideVertexAlongEdge,
  applySoftSelectionDelta,
} from '../../utils/marshallMapEngine';

export interface MapRecalibrationWizardModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  initialTab?: 'recalibration' | 'presets' | 'hierarchy-holes' | 'tools-classifier';
}

export const MapRecalibrationWizardModal: React.FC<MapRecalibrationWizardModalProps> = ({
  isOpen = true,
  onClose,
  initialTab = 'recalibration',
}) => {
  const store = useProjectionStore();
  const layers = store.layers;
  const selectedLayerId = store.selectedLayerId;
  const setSelectedLayerId = (id: string | null) => {
    if (id) {
      store.setVectorToolbar({ selectedLayerId: id });
    } else {
      useProjectionStore.setState({ selectedLayerId: '' });
    }
  };
  const updateLayer = store.updateLayer;

  // Active Tab
  const [activeTab, setActiveTab] = useState<'recalibration' | 'presets' | 'hierarchy-holes' | 'tools-classifier'>(
    initialTab
  );

  // Extended Metadata Map & Global Warp State
  const [metaMap, setMetaMap] = useState<Record<string, ExtendedLayerMetadata>>(() => getStoredExtendedMeta());
  const [globalWarp, setGlobalWarp] = useState<GlobalMapWarpState>(() => getStoredGlobalWarp());

  // Calibration Presets
  const [presets, setPresets] = useState<CalibrationPreset[]>(() => loadCalibrationPresets());
  const [activePresetId, setActivePresetId] = useState<string>('calib-default-straight');
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [newPresetNotes, setNewPresetNotes] = useState<string>('');
  const [isSavingPreset, setIsSavingPreset] = useState<boolean>(false);

  // New Season Wizard Step (1..4)
  const [seasonWizardActive, setSeasonWizardActive] = useState<boolean>(false);
  const [seasonStep, setSeasonStep] = useState<number>(1);

  // Ghost Saved Layout Diff Toggle
  const [showGhostDiff, setShowGhostDiff] = useState<boolean>(true);
  const [showAlignmentGrid, setShowAlignmentGrid] = useState<boolean>(false);
  const [symmetryAxisX, setSymmetryAxisX] = useState<number>(DEFAULT_STAGE_WIDTH / 2);
  const [showSymmetryGuide, setShowSymmetryGuide] = useState<boolean>(false);

  // Auto-Classifier Results
  const [classificationResults, setClassificationResults] = useState<ShapeClassificationResult[]>([]);
  const [selectedProposalIds, setSelectedProposalIds] = useState<string[]>([]);
  const [classifierSummary, setClassifierSummary] = useState<string>('');

  // Diagnostics
  const [diagnosticIssues, setDiagnosticIssues] = useState<HoleDiagnosticIssue[]>([]);

  // 6-Handle Ellipse Creation Form
  const [ellipseForm, setEllipseForm] = useState({
    name: 'Arch Window Fan',
    rx: 60,
    ry: 40,
    rotation: 0,
  });

  // Soft Selection & Edge Slide
  const [softRadius, setSoftRadius] = useState<number>(60);
  const [edgeSlideDelta, setEdgeSlideDelta] = useState<number>(0.02);

  // Canvas interaction refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [draggingHandle, setDraggingHandle] = useState<{
    type: 'warp_corner' | 'vertex' | 'center' | 'symmetry_axis';
    index?: number;
    layerId?: string;
  } | null>(null);

  // Sync metadata whenever layers change
  useEffect(() => {
    const updated = { ...metaMap };
    let changed = false;
    layers.forEach((layer) => {
      if (!updated[layer.id]) {
        updated[layer.id] = getLayerExtendedMeta(layer, metaMap);
        changed = true;
      }
    });
    if (changed) {
      setMetaMap(updated);
      saveStoredExtendedMeta(updated);
    }
  }, [layers]);

  // Run diagnostics when meta or layers change
  const refreshDiagnostics = useCallback(() => {
    const misplaced = findMisplacedHoles(layers, metaMap);
    const overlapping = findShapesOverHoles(layers, metaMap);
    setDiagnosticIssues([...misplaced, ...overlapping]);
  }, [layers, metaMap]);

  useEffect(() => {
    refreshDiagnostics();
  }, [refreshDiagnostics]);

  // Handle Toast notification safely
  const triggerToast = (msg: string) => {
    useProjectionStore.setState({ statusToast: msg });
  };

  // Selected layer
  const activeLayer = layers.find((l) => l.id === selectedLayerId) || layers[0] || null;
  const activeMeta = activeLayer ? getLayerExtendedMeta(activeLayer, metaMap) : null;

  // --------------------------------------------------------------------------
  // Canvas Rendering Loop
  // --------------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, DEFAULT_STAGE_WIDTH, DEFAULT_STAGE_HEIGHT);

      // 1. Stage Background
      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, DEFAULT_STAGE_WIDTH, DEFAULT_STAGE_HEIGHT);

      // Reference Photo if present
      if (store.customReferencePhotoUrl) {
        // (If image element exists it could be drawn, otherwise dark architect background)
      }

      // 2. Alignment Grid or Subtle Graph Paper
      if (showAlignmentGrid) {
        // High contrast calibration grid (green/cyan)
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.35)';
        ctx.lineWidth = 1;
        const step = 40;
        for (let x = 0; x <= DEFAULT_STAGE_WIDTH; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, DEFAULT_STAGE_HEIGHT);
          ctx.stroke();
        }
        for (let y = 0; y <= DEFAULT_STAGE_HEIGHT; y += step) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(DEFAULT_STAGE_WIDTH, y);
          ctx.stroke();
        }

        // Center crosshair
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(DEFAULT_STAGE_WIDTH / 2, 0);
        ctx.lineTo(DEFAULT_STAGE_WIDTH / 2, DEFAULT_STAGE_HEIGHT);
        ctx.moveTo(0, DEFAULT_STAGE_HEIGHT / 2);
        ctx.lineTo(DEFAULT_STAGE_WIDTH, DEFAULT_STAGE_HEIGHT / 2);
        ctx.stroke();

        // Corner diagonal guides
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(DEFAULT_STAGE_WIDTH, DEFAULT_STAGE_HEIGHT);
        ctx.moveTo(DEFAULT_STAGE_WIDTH, 0);
        ctx.lineTo(0, DEFAULT_STAGE_HEIGHT);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // Subtle grid
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= DEFAULT_STAGE_WIDTH; x += 60) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, DEFAULT_STAGE_HEIGHT);
          ctx.stroke();
        }
        for (let y = 0; y <= DEFAULT_STAGE_HEIGHT; y += 60) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(DEFAULT_STAGE_WIDTH, y);
          ctx.stroke();
        }
      }

      // 3. Symmetry Guide Axis (if enabled)
      if (showSymmetryGuide) {
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(symmetryAxisX, 0);
        ctx.lineTo(symmetryAxisX, DEFAULT_STAGE_HEIGHT);
        ctx.stroke();
        ctx.setLineDash([]);

        // Symmetry handle
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(symmetryAxisX, 24, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText(`M: ${Math.round(symmetryAxisX)}px`, symmetryAxisX + 10, 28);
      }

      // 4. Ghost Saved Layout Diff (Baseline Trace)
      if (showGhostDiff) {
        layers.forEach((l) => {
          const meta = getLayerExtendedMeta(l, metaMap);
          if (meta.baselineVertices && meta.baselineVertices.length > 1) {
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            meta.baselineVertices.forEach((v, idx) => {
              if (idx === 0) ctx.moveTo(v.x, v.y);
              else ctx.lineTo(v.x, v.y);
            });
            if (!meta.isOpenPath) {
              ctx.closePath();
            }
            ctx.stroke();
            ctx.setLineDash([]);
          }
        });
      }

      // 5. Render Layers with 5-Stage Transform Chain & Holes
      layers.forEach((layer) => {
        const meta = getLayerExtendedMeta(layer, metaMap);
        const transformed = evaluateTransformChain(layer, layers, metaMap, globalWarp);
        if (transformed.length < 2) return;

        const isSelected = layer.id === selectedLayerId;

        ctx.save();

        if (meta.isOpenPath) {
          // Open polyline path (e.g. Roofline eave)
          ctx.beginPath();
          transformed.forEach((v, idx) => {
            if (idx === 0) ctx.moveTo(v.x, v.y);
            else ctx.lineTo(v.x, v.y);
          });
          ctx.strokeStyle = isSelected ? '#f59e0b' : layer.color || '#00f0ff';
          ctx.lineWidth = meta.strokeWidthPx || 4;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
        } else {
          // Closed polygon with inner holes cut out using path winding
          ctx.beginPath();
          transformed.forEach((v, idx) => {
            if (idx === 0) ctx.moveTo(v.x, v.y);
            else ctx.lineTo(v.x, v.y);
          });
          ctx.closePath();

          // Cut out inner holes
          if (meta.holes && meta.holes.length > 0) {
            meta.holes.forEach((hole) => {
              if (hole.length > 2) {
                hole.forEach((hv, hIdx) => {
                  if (hIdx === 0) ctx.moveTo(hv.x, hv.y);
                  else ctx.lineTo(hv.x, hv.y);
                });
                ctx.closePath();
              }
            });
          }

          // Fill polygon (evenodd punches out holes)
          ctx.fillStyle = isSelected
            ? 'rgba(245, 158, 11, 0.35)'
            : layer.category === 'Windows'
            ? 'rgba(56, 189, 248, 0.25)'
            : layer.category === 'Main Walls'
            ? 'rgba(217, 70, 239, 0.22)'
            : 'rgba(34, 197, 94, 0.22)';
          ctx.fill('evenodd');

          // Stroke polygon outline
          ctx.strokeStyle = isSelected ? '#f59e0b' : layer.color || '#00f0ff';
          ctx.lineWidth = isSelected ? 2.5 : 1.5;
          ctx.stroke();

          // Stroke holes with dashed dark lines
          if (meta.holes && meta.holes.length > 0) {
            ctx.strokeStyle = 'rgba(255, 70, 70, 0.7)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
            meta.holes.forEach((hole) => {
              if (hole.length > 2) {
                ctx.beginPath();
                hole.forEach((hv, hIdx) => {
                  if (hIdx === 0) ctx.moveTo(hv.x, hv.y);
                  else ctx.lineTo(hv.x, hv.y);
                });
                ctx.closePath();
                ctx.stroke();
              }
            });
            ctx.setLineDash([]);
          }
        }

        // Draw shape vertices & centroid if selected
        if (isSelected) {
          const centroid = computePolygonCentroid(transformed);
          // Centroid handle
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(centroid.x, centroid.y, 5, 0, Math.PI * 2);
          ctx.fill();

          // Vertices handles
          transformed.forEach((v, idx) => {
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(v.x, v.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Index label
            ctx.fillStyle = '#94a3b8';
            ctx.font = '9px monospace';
            ctx.fillText(`${idx}`, v.x + 6, v.y - 4);
          });

          // If 6-handle ellipse, draw cardinal handles
          if (meta.parametricType === 'ellipse-6handle' && meta.ellipseParams) {
            const h = getEllipse6Handles(
              meta.ellipseParams.cx,
              meta.ellipseParams.cy,
              meta.ellipseParams.rx,
              meta.ellipseParams.ry,
              meta.ellipseParams.rotationDeg
            );
            [h.north, h.south, h.east, h.west].forEach((pt) => {
              ctx.fillStyle = '#38bdf8';
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
              ctx.fill();
            });
            // Rotation stalk
            ctx.strokeStyle = '#38bdf8';
            ctx.beginPath();
            ctx.moveTo(h.north.x, h.north.y);
            ctx.lineTo(h.rotationStalk.x, h.rotationStalk.y);
            ctx.stroke();
            ctx.fillStyle = '#eab308';
            ctx.beginPath();
            ctx.arc(h.rotationStalk.x, h.rotationStalk.y, 6, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.restore();
      });

      // 6. Tier 1: Master 4-Corner Global Map Warp Cage
      if (globalWarp.enabled) {
        const [tl, tr, br, bl] = globalWarp.corners;

        // Perspective Quad outline
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tl.x, tl.y);
        ctx.lineTo(tr.x, tr.y);
        ctx.lineTo(br.x, br.y);
        ctx.lineTo(bl.x, bl.y);
        ctx.closePath();
        ctx.stroke();

        // 4 Handles
        const cornerLabels = ['TL', 'TR', 'BR', 'BL'];
        [tl, tr, br, bl].forEach((pt, idx) => {
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText(cornerLabels[idx], pt.x + 10, pt.y + 4);
        });
      }
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    layers,
    selectedLayerId,
    metaMap,
    globalWarp,
    showGhostDiff,
    showAlignmentGrid,
    showSymmetryGuide,
    symmetryAxisX,
    store.customReferencePhotoUrl,
  ]);

  // --------------------------------------------------------------------------
  // Canvas Mouse Interaction (Dragging Corners / Vertices)
  // --------------------------------------------------------------------------
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>): VectorVertex => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = DEFAULT_STAGE_WIDTH / rect.width;
    const scaleY = DEFAULT_STAGE_HEIGHT / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pt = getCanvasCoords(e);

    // 1. Check Global Warp handles if enabled
    if (globalWarp.enabled) {
      for (let i = 0; i < 4; i++) {
        const corner = globalWarp.corners[i];
        if (Math.hypot(pt.x - corner.x, pt.y - corner.y) < 18) {
          setDraggingHandle({ type: 'warp_corner', index: i });
          return;
        }
      }
    }

    // 2. Check Symmetry guide handle
    if (showSymmetryGuide && Math.abs(pt.x - symmetryAxisX) < 15 && pt.y < 50) {
      setDraggingHandle({ type: 'symmetry_axis' });
      return;
    }

    // 3. Check selected layer vertices
    if (activeLayer) {
      for (let i = 0; i < activeLayer.vertices.length; i++) {
        const v = activeLayer.vertices[i];
        if (Math.hypot(pt.x - v.x, pt.y - v.y) < 12) {
          setDraggingHandle({ type: 'vertex', index: i, layerId: activeLayer.id });
          return;
        }
      }
    }

    // 4. Click to select layer under point
    for (let i = layers.length - 1; i >= 0; i--) {
      const l = layers[i];
      const bounds = computePolygonBounds(l.vertices);
      if (
        pt.x >= bounds.minX - 5 &&
        pt.x <= bounds.maxX + 5 &&
        pt.y >= bounds.minY - 5 &&
        pt.y <= bounds.maxY + 5
      ) {
        setSelectedLayerId(l.id);
        return;
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggingHandle) return;
    const pt = getCanvasCoords(e);

    if (draggingHandle.type === 'warp_corner' && draggingHandle.index !== undefined) {
      const nextCorners = [...globalWarp.corners] as [VectorVertex, VectorVertex, VectorVertex, VectorVertex];
      nextCorners[draggingHandle.index] = {
        x: Math.round(pt.x),
        y: Math.round(pt.y),
      };
      const updated = { ...globalWarp, corners: nextCorners };
      setGlobalWarp(updated);
      saveStoredGlobalWarp(updated);
    } else if (draggingHandle.type === 'symmetry_axis') {
      setSymmetryAxisX(Math.max(10, Math.min(DEFAULT_STAGE_WIDTH - 10, Math.round(pt.x))));
    } else if (draggingHandle.type === 'vertex' && draggingHandle.index !== undefined && activeLayer) {
      const nextVertices = activeLayer.vertices.map((v, idx) =>
        idx === draggingHandle.index ? { x: Math.round(pt.x), y: Math.round(pt.y) } : v
      );
      updateLayer(activeLayer.id, { vertices: nextVertices });
    }
  };

  const handleCanvasMouseUp = () => {
    setDraggingHandle(null);
  };

  // --------------------------------------------------------------------------
  // Recalibration Nudge Actions
  // --------------------------------------------------------------------------
  const nudgeActiveLayerOffset = (
    delta: Partial<ShapeRecalibrationOffset>
  ) => {
    if (!activeLayer) return;
    const currentMeta = getLayerExtendedMeta(activeLayer, metaMap);
    const currentOffset = currentMeta.recalibrationOffset;

    const nextOffset: ShapeRecalibrationOffset = {
      dx: currentOffset.dx + (delta.dx || 0),
      dy: currentOffset.dy + (delta.dy || 0),
      dRotationDeg: currentOffset.dRotationDeg + (delta.dRotationDeg || 0),
      dScaleX: currentOffset.dScaleX * (delta.dScaleX !== undefined ? delta.dScaleX : 1.0),
      dScaleY: currentOffset.dScaleY * (delta.dScaleY !== undefined ? delta.dScaleY : 1.0),
    };

    const nextMeta = {
      ...metaMap,
      [activeLayer.id]: {
        ...currentMeta,
        recalibrationOffset: nextOffset,
      },
    };
    setMetaMap(nextMeta);
    saveStoredExtendedMeta(nextMeta);
  };

  const resetActiveLayerToBaseline = () => {
    if (!activeLayer) return;
    const currentMeta = getLayerExtendedMeta(activeLayer, metaMap);
    const nextMeta = {
      ...metaMap,
      [activeLayer.id]: {
        ...currentMeta,
        recalibrationOffset: { ...DEFAULT_RECALIBRATION_OFFSET },
      },
    };
    setMetaMap(nextMeta);
    saveStoredExtendedMeta(nextMeta);
    triggerToast(`Reset "${activeLayer.name}" to original baseline trace.`);
  };

  const commitRecalibrationToStore = () => {
    // Bakes the current post-warp / post-recalibration vertices into the base store layers
    layers.forEach((l) => {
      const evaluated = evaluateTransformChain(l, layers, metaMap, globalWarp);
      updateLayer(l.id, {
        vertices: evaluated.map((v) => ({ x: Math.round(v.x), y: Math.round(v.y) })),
      });
    });

    // Reset offsets since they have now been committed
    const nextMeta = { ...metaMap };
    Object.keys(nextMeta).forEach((id) => {
      nextMeta[id] = {
        ...nextMeta[id],
        recalibrationOffset: { ...DEFAULT_RECALIBRATION_OFFSET },
        baselineVertices: layers.find((l) => l.id === id)?.vertices.map((v) => ({ ...v })) || [],
      };
    });
    setMetaMap(nextMeta);
    saveStoredExtendedMeta(nextMeta);

    // Turn off global warp since it is baked
    const resetWarp = { ...DEFAULT_GLOBAL_WARP };
    setGlobalWarp(resetWarp);
    saveStoredGlobalWarp(resetWarp);

    triggerToast('Committed all recalibration offsets & Global Map Warp to permanent store layers.');
  };

  // --------------------------------------------------------------------------
  // Preset Actions
  // --------------------------------------------------------------------------
  const handleSavePreset = () => {
    if (!newPresetName.trim()) return;
    const shapeOffsets: Record<string, ShapeRecalibrationOffset> = {};
    Object.keys(metaMap).forEach((id) => {
      shapeOffsets[id] = metaMap[id].recalibrationOffset;
    });

    const newPreset: CalibrationPreset = {
      id: `preset-${Date.now()}`,
      name: newPresetName.trim(),
      notes: newPresetNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
      globalMapWarp: globalWarp,
      shapeOffsets,
    };

    const updated = [newPreset, ...presets];
    setPresets(updated);
    saveCalibrationPresets(updated);
    setActivePresetId(newPreset.id);
    setNewPresetName('');
    setNewPresetNotes('');
    setIsSavingPreset(false);
    triggerToast(`Saved calibration preset "${newPreset.name}"`);
  };

  const handleApplyPreset = (preset: CalibrationPreset) => {
    setGlobalWarp(preset.globalMapWarp);
    saveStoredGlobalWarp(preset.globalMapWarp);

    const nextMeta = { ...metaMap };
    Object.keys(preset.shapeOffsets).forEach((layerId) => {
      if (nextMeta[layerId]) {
        nextMeta[layerId] = {
          ...nextMeta[layerId],
          recalibrationOffset: preset.shapeOffsets[layerId],
        };
      }
    });
    setMetaMap(nextMeta);
    saveStoredExtendedMeta(nextMeta);
    setActivePresetId(preset.id);
    triggerToast(`Activated preset "${preset.name}"`);
  };

  const handleExportPresetFile = (preset: CalibrationPreset) => {
    const jsonStr = exportCalibrationPresetJson(preset);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${preset.name.toLowerCase().replace(/\s+/g, '_')}.mpscalib`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerToast(`Exported "${preset.name}.mpscalib"`);
  };

  const handleImportPresetFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const imported = importCalibrationPresetJson(content);
      if (imported) {
        const updated = [imported, ...presets];
        setPresets(updated);
        saveCalibrationPresets(updated);
        handleApplyPreset(imported);
        triggerToast(`Imported and applied "${imported.name}"`);
      } else {
        alert('Invalid .mpscalib file structure.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // --------------------------------------------------------------------------
  // Auto-Classifier & Holes Actions
  // --------------------------------------------------------------------------
  const handleRunAutoPunchHoles = () => {
    const { updatedMeta, punchedCount } = autoDetectHolesInWalls(layers, metaMap);
    setMetaMap(updatedMeta);
    refreshDiagnostics();
    triggerToast(`Auto-punched ${punchedCount} window/door cutouts as polygon holes in walls.`);
  };

  const handleRunAutoClassifier = () => {
    const { results, summary } = classifyMapShapes(layers, metaMap);
    setClassificationResults(results);
    setClassifierSummary(summary);
    setSelectedProposalIds(results.filter((r) => r.willChange || r.confidence === 'Confident').map((r) => r.layerId));
  };

  const handleCommitClassifierNames = () => {
    if (selectedProposalIds.length === 0) return;
    const nextMeta = { ...metaMap };
    let commitCount = 0;

    classificationResults.forEach((res) => {
      if (selectedProposalIds.includes(res.layerId)) {
        updateLayer(res.layerId, { name: res.proposedName });
        if (nextMeta[res.layerId]) {
          nextMeta[res.layerId] = {
            ...nextMeta[res.layerId],
            semanticTag: res.proposedTag,
          };
        }
        commitCount++;
      }
    });

    setMetaMap(nextMeta);
    saveStoredExtendedMeta(nextMeta);
    triggerToast(`Committed ${commitCount} semantic names & tags to project.`);
    setClassificationResults([]);
  };

  // --------------------------------------------------------------------------
  // Stamps & Modeling Tools Actions
  // --------------------------------------------------------------------------
  const handleStampTemplate = (template: ShapeStampTemplate) => {
    const { newLayers, newMeta } = stampTemplateAtLocation(
      template,
      DEFAULT_STAGE_WIDTH / 2 - template.nominalWidth / 2,
      DEFAULT_STAGE_HEIGHT / 2 - template.nominalHeight / 2,
      1.0
    );

    // Append new layers to store
    useProjectionStore.setState((state) => ({
      layers: [...state.layers, ...newLayers],
      selectedLayerId: newLayers[0]?.id || state.selectedLayerId,
    }));

    const mergedMeta = { ...metaMap, ...newMeta };
    setMetaMap(mergedMeta);
    saveStoredExtendedMeta(mergedMeta);
    triggerToast(`Stamped "${template.name}" with ${newLayers.length} sub-shapes.`);
  };

  const handleMirrorSelected = () => {
    if (!activeLayer) return;
    const mirrored = mirrorLayerAcrossSymmetryAxis(activeLayer, symmetryAxisX);
    useProjectionStore.setState((state) => ({
      layers: [...state.layers, mirrored],
      selectedLayerId: mirrored.id,
    }));
    triggerToast(`Mirrored "${activeLayer.name}" across x = ${Math.round(symmetryAxisX)}px`);
  };

  const handleAlign = (
    mode:
      | 'left'
      | 'right'
      | 'top'
      | 'bottom'
      | 'center-h'
      | 'center-v'
      | 'distribute-centres-h'
      | 'distribute-gaps-h'
  ) => {
    // If multiple layers selected, align them; otherwise align active layer against canvas
    const selectedIds = selectedLayerId ? [selectedLayerId] : layers.map((l) => l.id);
    const updated = alignAndDistributeLayers(layers, selectedIds, mode);
    useProjectionStore.setState({ layers: updated });
    triggerToast(`Aligned layers [${mode}]`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 select-none">
      <div className="w-[98vw] max-w-7xl h-[94vh] bg-[#0b121e] border border-[#213047] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans">
        {/* ================================================================== */}
        {/* MODAL HEADER */}
        {/* ================================================================== */}
        <div className="px-5 py-3.5 bg-[#0e1626] border-b border-[#1b2638] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-cyan-500/20 border border-amber-500/40 flex items-center justify-center">
              <Compass className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-wide uppercase text-slate-100">
                  Marshall Advanced Map Studio
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono">
                  Two-Tier Recalibration & Hierarchy
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Global Map Warp (W) • 5-Stage Transform Chain • Polygon Holes • Auto-Classifier • .mpscalib Presets
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 bg-[#070c14] p-1 rounded-xl border border-[#1b2638]">
            <button
              type="button"
              onClick={() => setActiveTab('recalibration')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'recalibration'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#131d2e]'
              }`}
            >
              <Move className="w-3.5 h-3.5" />
              1. Two-Tier Recalibration
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'presets'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#131d2e]'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              2. Presets & New Season
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('hierarchy-holes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'hierarchy-holes'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#131d2e]'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              3. Parent/Child & Holes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tools-classifier')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'tools-classifier'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#131d2e]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              4. Classifier & Stamps
            </button>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2538] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================================================================== */}
        {/* MAIN BODY: VIEWPORT (LEFT) + CONTROLS (RIGHT) */}
        {/* ================================================================== */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT: INTERACTIVE CANVAS VIEWPORT */}
          <div className="flex-1 flex flex-col border-r border-[#1b2638] bg-[#070c14] relative">
            {/* Viewport Overlay Bar */}
            <div className="px-4 py-2 bg-[#0b121e]/90 border-b border-[#1b2638] flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-3">
                <span className="text-slate-400">STAGE: 1080×600 px</span>
                <span className="text-slate-600">•</span>
                <span className="text-amber-400 font-semibold">
                  {activeLayer ? `Selected: ${activeLayer.name}` : 'No Shape Selected'}
                </span>
                {globalWarp.enabled && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px]">
                    GLOBAL WARP W ACTIVE
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowGhostDiff((prev) => !prev)}
                  className={`px-2 py-1 rounded border text-[11px] flex items-center gap-1.5 ${
                    showGhostDiff
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                      : 'border-slate-700 text-slate-400'
                  }`}
                  title="Toggle Ghost Baseline Trace overlay"
                >
                  <Eye className="w-3 h-3" />
                  Ghost Diff
                </button>
                <button
                  type="button"
                  onClick={() => setShowAlignmentGrid((prev) => !prev)}
                  className={`px-2 py-1 rounded border text-[11px] flex items-center gap-1.5 ${
                    showAlignmentGrid
                      ? 'bg-green-500/20 border-green-500/50 text-green-300'
                      : 'border-slate-700 text-slate-400'
                  }`}
                  title="Toggle High-Contrast Calibration Grid"
                >
                  <Grid className="w-3 h-3" />
                  Align Grid
                </button>
                <button
                  type="button"
                  onClick={() => setShowSymmetryGuide((prev) => !prev)}
                  className={`px-2 py-1 rounded border text-[11px] flex items-center gap-1.5 ${
                    showSymmetryGuide
                      ? 'bg-pink-500/20 border-pink-500/50 text-pink-300'
                      : 'border-slate-700 text-slate-400'
                  }`}
                  title="Toggle House Symmetry Axis Guide"
                >
                  <Crosshair className="w-3 h-3" />
                  Symmetry M
                </button>
              </div>
            </div>

            {/* Canvas Surface */}
            <div className="flex-1 flex items-center justify-center p-3 overflow-hidden bg-black/40">
              <div className="relative border border-[#213047] rounded-xl overflow-hidden shadow-2xl bg-black">
                <canvas
                  ref={canvasRef}
                  width={DEFAULT_STAGE_WIDTH}
                  height={DEFAULT_STAGE_HEIGHT}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  className="block cursor-crosshair max-w-full max-h-[70vh] object-contain"
                />
              </div>
            </div>

            {/* Viewport Footer Quick Guide */}
            <div className="px-4 py-2 bg-[#090e18] border-t border-[#1b2638] flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-4">
                <span>
                  <strong className="text-amber-400">Tip:</strong> Drag the 4 master corners on canvas to realign house in 30 seconds.
                </span>
                <span>
                  <strong className="text-cyan-400">Ghost Diff:</strong> Dashed cyan is saved original trace, solid amber is recalibrated.
                </span>
              </div>
              <div className="text-slate-500 font-mono">
                Hover coordinate tracking • Non-destructive offsets
              </div>
            </div>
          </div>

          {/* RIGHT: TAB CONTENT PANELS */}
          <div className="w-[480px] bg-[#0c1424] flex flex-col overflow-y-auto custom-scrollbar p-5 space-y-5">
            {/* ============================================================== */}
            {/* TAB 1: TWO-TIER RECALIBRATION */}
            {/* ============================================================== */}
            {activeTab === 'recalibration' && (
              <div className="space-y-5">
                {/* Tier 1 Card: Global Map Warp (W) */}
                <div className="p-4 rounded-xl bg-[#101a2e] border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold font-mono">
                        W
                      </div>
                      <span className="font-bold text-sm text-slate-100">
                        Tier 1: Global Map Warp (Master Homography)
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={globalWarp.enabled}
                        onChange={(e) => {
                          const updated = { ...globalWarp, enabled: e.target.checked };
                          setGlobalWarp(updated);
                          saveStoredGlobalWarp(updated);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Recovers immediately from bumped tripods or next-year setups by skewing the entire house map through a single 3x3 perspective homography.
                  </p>

                  {/* Corner Coordinates Display & Reset */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-[#090e18] p-2.5 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-amber-400">TL:</span> {globalWarp.corners[0].x}, {globalWarp.corners[0].y}
                    </div>
                    <div>
                      <span className="text-amber-400">TR:</span> {globalWarp.corners[1].x}, {globalWarp.corners[1].y}
                    </div>
                    <div>
                      <span className="text-amber-400">BL:</span> {globalWarp.corners[3].x}, {globalWarp.corners[3].y}
                    </div>
                    <div>
                      <span className="text-amber-400">BR:</span> {globalWarp.corners[2].x}, {globalWarp.corners[2].y}
                    </div>
                  </div>

                  {/* Quick Warp Presets */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const reset = { ...DEFAULT_GLOBAL_WARP, enabled: true };
                        setGlobalWarp(reset);
                        saveStoredGlobalWarp(reset);
                      }}
                      className="px-2.5 py-1 rounded bg-[#172338] hover:bg-[#20304c] text-[11px] text-slate-300 font-mono"
                    >
                      Reset 4-Corners
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const nextCorners = [...globalWarp.corners] as [VectorVertex, VectorVertex, VectorVertex, VectorVertex];
                        nextCorners[0].x += 20;
                        nextCorners[3].x -= 20;
                        const updated = { enabled: true, corners: nextCorners };
                        setGlobalWarp(updated);
                        saveStoredGlobalWarp(updated);
                      }}
                      className="px-2.5 py-1 rounded bg-[#172338] hover:bg-[#20304c] text-[11px] text-slate-300 font-mono"
                    >
                      Keystone Left +
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const nextCorners = [...globalWarp.corners] as [VectorVertex, VectorVertex, VectorVertex, VectorVertex];
                        nextCorners[1].x -= 20;
                        nextCorners[2].x += 20;
                        const updated = { enabled: true, corners: nextCorners };
                        setGlobalWarp(updated);
                        saveStoredGlobalWarp(updated);
                      }}
                      className="px-2.5 py-1 rounded bg-[#172338] hover:bg-[#20304c] text-[11px] text-slate-300 font-mono"
                    >
                      Keystone Right +
                    </button>
                  </div>
                </div>

                {/* Tier 2 Card: Per-Shape Recalibration Offsets */}
                <div className="p-4 rounded-xl bg-[#101a2e] border border-[#1b2638] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-cyan-400" />
                      <span className="font-bold text-sm text-slate-100">
                        Tier 2: Per-Shape Recalibration Offset
                      </span>
                    </div>
                    {activeLayer && (
                      <button
                        type="button"
                        onClick={resetActiveLayerToBaseline}
                        className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-mono"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset Shape
                      </button>
                    )}
                  </div>

                  {activeLayer && activeMeta ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs bg-[#090e18] p-2 rounded border border-slate-800">
                        <span className="text-slate-400">Target Shape:</span>
                        <span className="font-bold text-amber-400">{activeLayer.name}</span>
                      </div>

                      {/* Translation Nudges */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                          <span>HORIZONTAL TRANSLATION (DX)</span>
                          <span className="text-slate-200">
                            {activeMeta.recalibrationOffset.dx.toFixed(1)} px
                          </span>
                        </div>
                        <div className="grid grid-cols-6 gap-1 font-mono text-[11px]">
                          {[-5, -1, -0.1, 0.1, 1, 5].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => nudgeActiveLayerOffset({ dx: val })}
                              className="py-1 bg-[#152033] hover:bg-[#1d2d47] rounded text-slate-300 border border-slate-800"
                            >
                              {val > 0 ? `+${val}` : val}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                          <span>VERTICAL TRANSLATION (DY)</span>
                          <span className="text-slate-200">
                            {activeMeta.recalibrationOffset.dy.toFixed(1)} px
                          </span>
                        </div>
                        <div className="grid grid-cols-6 gap-1 font-mono text-[11px]">
                          {[-5, -1, -0.1, 0.1, 1, 5].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => nudgeActiveLayerOffset({ dy: val })}
                              className="py-1 bg-[#152033] hover:bg-[#1d2d47] rounded text-slate-300 border border-slate-800"
                            >
                              {val > 0 ? `+${val}` : val}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Rotation & Scale */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                          <span>ROTATION (DEGREES)</span>
                          <span className="text-slate-200">
                            {activeMeta.recalibrationOffset.dRotationDeg.toFixed(1)}°
                          </span>
                        </div>
                        <div className="grid grid-cols-6 gap-1 font-mono text-[11px]">
                          {[-5, -1, -0.2, 0.2, 1, 5].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => nudgeActiveLayerOffset({ dRotationDeg: val })}
                              className="py-1 bg-[#152033] hover:bg-[#1d2d47] rounded text-slate-300 border border-slate-800"
                            >
                              {val > 0 ? `+${val}` : val}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                          <span>SCALE UNIFORM</span>
                          <span className="text-slate-200">
                            {(activeMeta.recalibrationOffset.dScaleX * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 font-mono text-[11px]">
                          <button
                            type="button"
                            onClick={() => nudgeActiveLayerOffset({ dScaleX: 0.98, dScaleY: 0.98 })}
                            className="py-1 bg-[#152033] hover:bg-[#1d2d47] rounded text-slate-300 border border-slate-800"
                          >
                            -2.0%
                          </button>
                          <button
                            type="button"
                            onClick={() => nudgeActiveLayerOffset({ dScaleX: 0.995, dScaleY: 0.995 })}
                            className="py-1 bg-[#152033] hover:bg-[#1d2d47] rounded text-slate-300 border border-slate-800"
                          >
                            -0.5%
                          </button>
                          <button
                            type="button"
                            onClick={() => nudgeActiveLayerOffset({ dScaleX: 1.005, dScaleY: 1.005 })}
                            className="py-1 bg-[#152033] hover:bg-[#1d2d47] rounded text-slate-300 border border-slate-800"
                          >
                            +0.5%
                          </button>
                          <button
                            type="button"
                            onClick={() => nudgeActiveLayerOffset({ dScaleX: 1.02, dScaleY: 1.02 })}
                            className="py-1 bg-[#152033] hover:bg-[#1d2d47] rounded text-slate-300 border border-slate-800"
                          >
                            +2.0%
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      Select a shape on the stage to fine-tune its offset.
                    </div>
                  )}
                </div>

                {/* Commit Action */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-cyan-500/10 to-transparent border border-amber-500/30 space-y-3">
                  <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    Commit Recalibration to Permanent Store
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Permanently bakes the current Global Map Warp and per-shape delta offsets directly into the base vector vertices, creating a clean new baseline.
                  </p>
                  <button
                    type="button"
                    onClick={commitRecalibrationToStore}
                    className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wide transition-all shadow-lg shadow-amber-500/20"
                  >
                    Commit & Save as New Baseline Trace
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 2: CALIBRATION PRESETS & NEW SEASON WIZARD */}
            {/* ============================================================== */}
            {activeTab === 'presets' && (
              <div className="space-y-5">
                {/* 4-Step New Season Wizard Card */}
                <div className="p-4 rounded-xl bg-[#101a2e] border border-cyan-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-cyan-400" />
                      <span className="font-bold text-sm text-slate-100">
                        4-Step New Season Setup Wizard
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSeasonWizardActive((prev) => !prev)}
                      className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    >
                      {seasonWizardActive ? 'Exit Wizard' : 'Start Wizard'}
                    </button>
                  </div>

                  {seasonWizardActive ? (
                    <div className="space-y-3 pt-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((step) => (
                          <div
                            key={step}
                            className={`h-1.5 flex-1 rounded-full ${
                              step <= seasonStep ? 'bg-cyan-400' : 'bg-slate-800'
                            }`}
                          />
                        ))}
                      </div>

                      <div className="text-xs font-semibold text-cyan-300">
                        Step {seasonStep} of 4:{' '}
                        {
                          [
                            'Archive Last Season Baseline',
                            'Project High-Contrast Grid',
                            'Align 4-Corner Global Warp',
                            'Fine-Tune & Finalize',
                          ][seasonStep - 1]
                        }
                      </div>

                      <p className="text-xs text-slate-300">
                        {seasonStep === 1 &&
                          'Save a named snapshot of your previous season before modifying any projector alignments.'}
                        {seasonStep === 2 &&
                          'Projecting the high-contrast green grid pattern on the house lets you see keystone distortion immediately.'}
                        {seasonStep === 3 &&
                          'Drag the 4 amber master corners (TL, TR, BR, BL) to match the outer corners of your home.'}
                        {seasonStep === 4 &&
                          'Inspect windows and doors against the cyan dashed ghost trace and nudge any minor drift.'}
                      </p>

                      <div className="flex justify-between pt-2">
                        <button
                          type="button"
                          disabled={seasonStep <= 1}
                          onClick={() => setSeasonStep((prev) => Math.max(1, prev - 1))}
                          className="px-3 py-1.5 rounded bg-[#172338] text-xs disabled:opacity-30"
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (seasonStep === 2) setShowAlignmentGrid(true);
                            if (seasonStep === 4) {
                              setSeasonWizardActive(false);
                              setShowAlignmentGrid(false);
                              triggerToast('Completed New Season Calibration Wizard!');
                            } else {
                              setSeasonStep((prev) => Math.min(4, prev + 1));
                            }
                          }}
                          className="px-3 py-1.5 rounded bg-cyan-500 text-slate-950 font-bold text-xs"
                        >
                          {seasonStep === 4 ? 'Finish Wizard' : 'Next Step'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Brought the projector out next winter? Run the guided 4-step wizard to re-align your entire projection mapping in 3 minutes.
                    </p>
                  )}
                </div>

                {/* Preset List Card */}
                <div className="p-4 rounded-xl bg-[#101a2e] border border-[#1b2638] space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
                      <Bookmark className="w-4 h-4 text-amber-400" />
                      Saved Rig Presets (.mpscalib)
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSavingPreset(true)}
                      className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1"
                    >
                      + Save Current
                    </button>
                  </div>

                  {isSavingPreset && (
                    <div className="p-3 bg-[#090e18] rounded-lg border border-amber-500/30 space-y-2">
                      <input
                        type="text"
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        placeholder="Preset Name (e.g. Christmas Lawn Post A)"
                        className="w-full px-2.5 py-1.5 bg-[#121c2e] border border-slate-700 rounded text-xs text-white"
                      />
                      <input
                        type="text"
                        value={newPresetNotes}
                        onChange={(e) => setNewPresetNotes(e.target.value)}
                        placeholder="Physical notes: tripod height, zoom ring, lens angle..."
                        className="w-full px-2.5 py-1.5 bg-[#121c2e] border border-slate-700 rounded text-xs text-slate-300"
                      />
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsSavingPreset(false)}
                          className="px-2 py-1 text-xs text-slate-400"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSavePreset}
                          className="px-3 py-1 bg-amber-500 text-slate-950 font-bold text-xs rounded"
                        >
                          Save Preset
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Preset Items */}
                  <div className="space-y-2">
                    {presets.map((p) => {
                      const isActive = p.id === activePresetId;
                      return (
                        <div
                          key={p.id}
                          className={`p-3 rounded-lg border transition-all ${
                            isActive
                              ? 'bg-amber-500/10 border-amber-500/50'
                              : 'bg-[#152033] border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-slate-200">
                              {p.name}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleApplyPreset(p)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isActive
                                    ? 'bg-amber-500 text-slate-950'
                                    : 'bg-[#1d2b45] text-amber-300 hover:bg-[#273a5c]'
                                }`}
                              >
                                {isActive ? 'Active' : 'Apply'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExportPresetFile(p)}
                                className="p-1 rounded text-slate-400 hover:text-white"
                                title="Download .mpscalib file"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          {p.notes && (
                            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                              {p.notes}
                            </p>
                          )}
                          <div className="text-[10px] text-slate-500 font-mono mt-1.5 flex items-center justify-between">
                            <span>Warp: {p.globalMapWarp.enabled ? '4-Point Active' : 'Bypassed'}</span>
                            <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* File Import Button */}
                  <div className="pt-2 flex justify-between items-center text-xs text-slate-400">
                    <span>Import .mpscalib from disk:</span>
                    <label className="px-3 py-1.5 rounded bg-[#172338] hover:bg-[#20304c] text-slate-200 font-medium cursor-pointer flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      Browse File
                      <input
                        type="file"
                        accept=".mpscalib,.json"
                        onChange={handleImportPresetFile}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 3: PARENT/CHILD HIERARCHY & POLYGON HOLES */}
            {/* ============================================================== */}
            {activeTab === 'hierarchy-holes' && (
              <div className="space-y-5">
                {/* Outliner Inspector */}
                <div className="p-4 rounded-xl bg-[#101a2e] border border-[#1b2638] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-cyan-400" />
                      Parent/Child Hierarchy Outliner
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {layers.length} Shapes Traced
                    </span>
                  </div>

                  <p className="text-xs text-slate-400">
                    Child shapes inherit their parent&apos;s transform and corner-pinning, so moving a wall carries all window panes and garage panels automatically.
                  </p>

                  {/* Layer Selected Controls */}
                  {activeLayer && activeMeta ? (
                    <div className="space-y-3 p-3 bg-[#090e18] rounded-lg border border-slate-800">
                      <div className="text-xs font-semibold text-amber-400">
                        Editing: {activeLayer.name}
                      </div>

                      {/* Parent Selector */}
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 font-mono">
                          PARENT SHAPE (INHERITANCE)
                        </label>
                        <select
                          value={activeMeta.parentId || ''}
                          onChange={(e) => {
                            const val = e.target.value ? e.target.value : null;
                            const next = {
                              ...metaMap,
                              [activeLayer.id]: {
                                ...activeMeta,
                                parentId: val,
                              },
                            };
                            setMetaMap(next);
                            saveStoredExtendedMeta(next);
                            refreshDiagnostics();
                          }}
                          className="w-full px-2.5 py-1.5 bg-[#121c2e] border border-slate-700 rounded text-xs text-white"
                        >
                          <option value="">(None - Top Level Parent)</option>
                          {layers
                            .filter((l) => l.id !== activeLayer.id)
                            .map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.name} ({l.category})
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Stencil Clipping & Open Path */}
                      <div className="flex items-center justify-between pt-1">
                        <label className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={activeMeta.clipChildrenToParent}
                            onChange={(e) => {
                              const next = {
                                ...metaMap,
                                [activeLayer.id]: {
                                  ...activeMeta,
                                  clipChildrenToParent: e.target.checked,
                                },
                              };
                              setMetaMap(next);
                              saveStoredExtendedMeta(next);
                            }}
                            className="rounded bg-slate-800 border-slate-700"
                          />
                          Clip Children to Parent (Stencil)
                        </label>

                        <label className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={activeMeta.isOpenPath}
                            onChange={(e) => {
                              const next = {
                                ...metaMap,
                                [activeLayer.id]: {
                                  ...activeMeta,
                                  isOpenPath: e.target.checked,
                                },
                              };
                              setMetaMap(next);
                              saveStoredExtendedMeta(next);
                            }}
                            className="rounded bg-slate-800 border-slate-700"
                          />
                          Open Path (Roofline Polyline)
                        </label>
                      </div>

                      {/* Semantic Tag Picker */}
                      <div className="space-y-1 pt-1">
                        <label className="text-[11px] text-slate-400 font-mono">
                          SEMANTIC ARCHITECTURAL TAG
                        </label>
                        <select
                          value={activeMeta.semanticTag}
                          onChange={(e) => {
                            const next = {
                              ...metaMap,
                              [activeLayer.id]: {
                                ...activeMeta,
                                semanticTag: e.target.value as SemanticShapeTag,
                              },
                            };
                            setMetaMap(next);
                            saveStoredExtendedMeta(next);
                          }}
                          className="w-full px-2.5 py-1.5 bg-[#121c2e] border border-slate-700 rounded text-xs text-white"
                        >
                          {[
                            'RoofPlane',
                            'Roofline',
                            'Wall',
                            'Window',
                            'Door',
                            'Garage',
                            'Pillar',
                            'Bush',
                            'Fascia',
                            'Trim',
                            'Custom',
                          ].map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Polygon Holes Card */}
                <div className="p-4 rounded-xl bg-[#101a2e] border border-[#1b2638] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-amber-400" />
                      Polygon Holes & Aperture Cutouts
                    </span>
                    <button
                      type="button"
                      onClick={handleRunAutoPunchHoles}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded"
                    >
                      Auto-Punch All
                    </button>
                  </div>

                  <p className="text-xs text-slate-400">
                    Punches window and door rings out of wall fills so background wall shaders never double-project over glass or entries.
                  </p>

                  {/* Hole list for active shape */}
                  {activeLayer && activeMeta && (
                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>Holes on &quot;{activeLayer.name}&quot;:</span>
                        <span className="font-mono text-amber-400">{activeMeta.holes.length} Cutouts</span>
                      </div>
                      {activeMeta.holes.length > 0 ? (
                        <div className="space-y-1">
                          {activeMeta.holes.map((h, idx) => (
                            <div
                              key={idx}
                              className="px-2.5 py-1.5 rounded bg-[#152033] border border-slate-800 flex items-center justify-between text-xs font-mono"
                            >
                              <span className="text-slate-300">
                                Cutout #{idx + 1} ({h.length} vertices)
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedHoles = activeMeta.holes.filter((_, i) => i !== idx);
                                  const next = {
                                    ...metaMap,
                                    [activeLayer.id]: { ...activeMeta, holes: updatedHoles },
                                  };
                                  setMetaMap(next);
                                  saveStoredExtendedMeta(next);
                                  refreshDiagnostics();
                                }}
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-2 text-slate-500 text-xs">
                          No holes punched in this shape.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Overlap & Hole Diagnostics Checklist */}
                <div className="p-4 rounded-xl bg-[#101a2e] border border-[#1b2638] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-cyan-400" />
                      Live Map Geometry Diagnostics
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {diagnosticIssues.length === 0 ? (
                        <span className="text-green-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Clean
                        </span>
                      ) : (
                        <span className="text-amber-400">{diagnosticIssues.length} Findings</span>
                      )}
                    </span>
                  </div>

                  {diagnosticIssues.length > 0 ? (
                    <div className="space-y-2">
                      {diagnosticIssues.map((issue, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-[#152033] border border-amber-500/30 text-xs space-y-1"
                        >
                          <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            {issue.layerName}: {issue.type}
                          </div>
                          <p className="text-slate-300 text-[11px]">{issue.description}</p>
                          <p className="text-slate-400 text-[10px] italic">{issue.suggestedAction}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      All holes and parent/child shapes validate without boundary spill or unparented overlap conflicts.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 4: GEOMETRY CLASSIFIER, SYMMETRY & STAMPS */}
            {/* ============================================================== */}
            {activeTab === 'tools-classifier' && (
              <div className="space-y-5">
                {/* Auto-Classifier Card */}
                <div className="p-4 rounded-xl bg-[#101a2e] border border-[#1b2638] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Geometry Auto-Classifier
                    </span>
                    <button
                      type="button"
                      onClick={handleRunAutoClassifier}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded"
                    >
                      Classify Map Shapes
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Evaluates elevation aspect ratios, vertical positions, and enclosure heuristics to turn &quot;Zone 41&quot; into semantic architectural names.
                  </p>

                  {classifierSummary && (
                    <div className="text-[11px] font-mono text-amber-300 bg-[#090e18] p-2 rounded border border-amber-500/30">
                      {classifierSummary}
                    </div>
                  )}

                  {classificationResults.length > 0 && (
                    <div className="space-y-2 pt-1 max-h-56 overflow-y-auto custom-scrollbar">
                      {classificationResults.map((res) => {
                        const isChecked = selectedProposalIds.includes(res.layerId);
                        return (
                          <div
                            key={res.layerId}
                            className="p-2 rounded bg-[#152033] border border-slate-800 text-xs flex items-center justify-between gap-2"
                          >
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedProposalIds([...selectedProposalIds, res.layerId]);
                                  } else {
                                    setSelectedProposalIds(
                                      selectedProposalIds.filter((id) => id !== res.layerId)
                                    );
                                  }
                                }}
                                className="rounded bg-slate-800 border-slate-700"
                              />
                              <div>
                                <div className="font-semibold text-slate-200">
                                  {res.currentName} →{' '}
                                  <span className="text-amber-400">{res.proposedName}</span>
                                </div>
                                <div className="text-[10px] text-slate-400">{res.reason}</div>
                              </div>
                            </label>

                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                                res.confidence === 'Confident'
                                  ? 'bg-green-500/20 text-green-300'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {res.proposedTag}
                            </span>
                          </div>
                        );
                      })}

                      <button
                        type="button"
                        onClick={handleCommitClassifierNames}
                        className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded uppercase tracking-wide mt-2"
                      >
                        Commit Selected Semantic Names
                      </button>
                    </div>
                  )}
                </div>

                {/* Symmetry Mirror & Modeling Tools */}
                <div className="p-4 rounded-xl bg-[#101a2e] border border-[#1b2638] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
                      <Crosshair className="w-4 h-4 text-pink-400" />
                      Symmetry Axis & Modeling Tools
                    </span>
                  </div>

                  {/* Symmetry Axis Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>House Symmetry Axis (M):</span>
                      <span className="font-mono text-pink-400">{Math.round(symmetryAxisX)} px</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max={DEFAULT_STAGE_WIDTH - 50}
                      value={symmetryAxisX}
                      onChange={(e) => setSymmetryAxisX(Number(e.target.value))}
                      className="w-full accent-pink-500"
                    />
                    <button
                      type="button"
                      disabled={!activeLayer}
                      onClick={handleMirrorSelected}
                      className="w-full py-2 bg-[#172338] hover:bg-[#20304c] text-pink-300 border border-pink-500/30 rounded text-xs font-semibold disabled:opacity-30"
                    >
                      Mirror Active Shape Across Axis (M)
                    </button>
                  </div>

                  {/* Align & Distribute Toolbar */}
                  <div className="space-y-1.5 pt-2">
                    <label className="text-[11px] text-slate-400 font-mono">
                      ALIGN & DISTRIBUTE
                    </label>
                    <div className="grid grid-cols-4 gap-1 text-[11px] font-mono">
                      <button
                        type="button"
                        onClick={() => handleAlign('left')}
                        className="py-1 bg-[#152033] hover:bg-[#1d2d47] rounded text-slate-300 border border-slate-800"
                      >
                        Left
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAlign('center-h')}
                        className="py-1 bg-[#152033] hover:bg-[#1d2d47] rounded text-slate-300 border border-slate-800"
                      >
                        Center H
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAlign('right')}
                        className="py-1 bg-[#152033] hover:bg-[#1d2d47] rounded text-slate-300 border border-slate-800"
                      >
                        Right
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAlign('distribute-centres-h')}
                        className="py-1 bg-[#152033] hover:bg-[#1d2d47] rounded text-slate-300 border border-slate-800"
                      >
                        Dist H
                      </button>
                    </div>
                  </div>
                </div>

                {/* Built-in .mpsshapes Stamp Templates */}
                <div className="p-4 rounded-xl bg-[#101a2e] border border-[#1b2638] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-cyan-400" />
                      Built-in .mpsshapes Stamp Library
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Instantly drop pre-traced multi-pane windows, arched fans, and garage panel assemblies onto your canvas.
                  </p>

                  <div className="space-y-2">
                    {getBuiltInShapeTemplates().map((tmpl) => (
                      <div
                        key={tmpl.id}
                        className="p-2.5 rounded-lg bg-[#152033] border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700"
                      >
                        <div>
                          <div className="font-semibold text-slate-200">{tmpl.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {tmpl.shapes.length} sub-shapes • {tmpl.nominalWidth}×{tmpl.nominalHeight} px
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleStampTemplate(tmpl)}
                          className="px-2.5 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded text-xs"
                        >
                          Stamp
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
