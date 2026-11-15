import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  Sparkles,
  Layers,
  Palette,
  Play,
  Pause,
  RotateCw,
  Sliders,
  Check,
  Plus,
  Trash2,
  Copy,
  Download,
  Upload,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Compass,
  Zap,
  Activity,
  Flame,
  Snowflake,
  Wind,
  Shuffle,
  ChevronRight,
  Maximize2,
  RefreshCw,
  Send,
  AlertCircle,
  Link,
  Unlink,
} from 'lucide-react';
import {
  useProjectionStore,
  VectorLayer,
  PlaylistClip,
} from '../../store/useProjectionStore';
import {
  MpsScene,
  ThemePalette,
  BUILT_IN_THEME_PALETTES,
  BUILT_IN_FX_PRESETS,
  FxGraphDefinition,
  FxGraphNode,
  FxGraphConnection,
  FxNodeKind,
  SemanticShapeTag,
  GeneratorSourceType,
  HolidayDecorEffectType,
  WindowSilhouetteType,
  SceneParticleOverlay,
  classifyLayerTag,
  autoDecorateScene,
  createHueShiftedSceneVariant,
  createHueShiftedPalette,
  renderSceneOnHouseCanvas,
  wouldCreateCycle,
  createDefaultFxGraph,
  topologicalSortNodes,
  evaluateFxGraphCssFilterAndLut,
  loadStoredScenes,
  saveStoredScenes,
  loadStoredPalettes,
  saveStoredPalettes,
  exportScenesToJson,
  importScenesFromJson,
  exportPalettesToJson,
  importPalettesFromJson,
} from '../../utils/sceneAutoDecorator';

export interface SceneLibraryAndFxGraphModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  initialTab?: 'scenes' | 'auto-decorate' | 'holiday-fx' | 'fx-graph';
}

export const SceneLibraryAndFxGraphModal: React.FC<SceneLibraryAndFxGraphModalProps> = ({
  isOpen = true,
  onClose,
  initialTab = 'scenes',
}) => {
  const {
    layers,
    selectedLayerId,
    addPlaylistClip,
    updateLayer,
    statusToast,
  } = useProjectionStore();

  // Internal open state fallback if uncontrolled
  const [internalOpen, setInternalOpen] = useState<boolean>(true);
  const effectiveOpen = isOpen !== undefined ? isOpen : internalOpen;

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setInternalOpen(false);
    }
  };

  // Tab navigation
  const [activeTab, setActiveTab] = useState<'scenes' | 'auto-decorate' | 'holiday-fx' | 'fx-graph'>(initialTab);

  // Stored Scenes and Palettes
  const [scenes, setScenes] = useState<MpsScene[]>(() => loadStoredScenes(layers));
  const [palettes, setPalettes] = useState<ThemePalette[]>(() => loadStoredPalettes());
  const [activeSceneId, setActiveSceneId] = useState<string>(() => (scenes[0]?.id || 'scene-0'));

  // Active Scene ref for stable animation loop
  const activeScene = useMemo(() => {
    return scenes.find((s) => s.id === activeSceneId) || scenes[0];
  }, [scenes, activeSceneId]);

  // Selected layer for editing in Tab 3
  const [editingLayerId, setEditingLayerId] = useState<string>(() => {
    return selectedLayerId || layers[0]?.id || 'layer-roofline';
  });

  // Animation & Canvas controls
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [showOutlines, setShowOutlines] = useState<boolean>(true);
  const [fps, setFps] = useState<number>(60);
  const animTimeRef = useRef<number>(0);
  const lastTimestampRef = useRef<number>(0);

  // Auto-decorate states
  const [selectedPaletteId, setSelectedPaletteId] = useState<string>('classic-christmas');
  const [autoSeed, setAutoSeed] = useState<number>(1234);

  // FX Graph editor state
  const [selectedFxNodeId, setSelectedFxNodeId] = useState<string | null>(null);
  const [wiringFromId, setWiringFromId] = useState<string | null>(null);
  const [graphWarning, setGraphWarning] = useState<string | null>(null);

  // Search & Category filters
  const [sceneSearch, setSceneSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Sync stored scenes to localStorage on change
  useEffect(() => {
    if (scenes.length > 0) {
      saveStoredScenes(scenes);
    }
  }, [scenes]);

  // Sync stored palettes to localStorage on change
  useEffect(() => {
    if (palettes.length > 0) {
      saveStoredPalettes(palettes);
    }
  }, [palettes]);

  // Ensure active scene has assignments for all current layers
  useEffect(() => {
    if (!activeScene || layers.length === 0) return;
    const missingLayers = layers.filter((l) => !activeScene.assignments[l.id]);
    if (missingLayers.length > 0) {
      const pal = palettes.find((p) => p.id === activeScene.paletteId) || palettes[0];
      const regenerated = autoDecorateScene(layers, pal, activeScene.seed, activeScene);
      setScenes((prev) => prev.map((s) => (s.id === activeScene.id ? regenerated : s)));
    }
  }, [layers, activeScene, palettes]);

  // 60fps HTML5 Canvas Animation Render Loop
  useEffect(() => {
    if (!effectiveOpen) return;

    let frameId: number;
    let frameCount = 0;
    let lastFpsUpdate = performance.now();

    const loop = (timestamp: number) => {
      if (!lastTimestampRef.current) lastTimestampRef.current = timestamp;
      const deltaSec = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      if (isPlaying) {
        animTimeRef.current += Math.min(deltaSec, 0.1);
      }

      // Calculate FPS
      frameCount++;
      if (timestamp - lastFpsUpdate >= 500) {
        setFps(Math.round((frameCount * 1000) / (timestamp - lastFpsUpdate)));
        frameCount = 0;
        lastFpsUpdate = timestamp;
      }

      // Render house vector layers & effects on canvas
      if (canvasRef.current && activeScene) {
        renderSceneOnHouseCanvas(
          canvasRef.current,
          layers,
          activeScene,
          animTimeRef.current,
          {
            showOutlines,
            activeLayerId: editingLayerId,
          }
        );
      }

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [effectiveOpen, isPlaying, layers, activeScene, showOutlines, editingLayerId]);

  if (!effectiveOpen) return null;

  // --------------------------------------------------------------------------
  // SCENE ACTIONS (Tab 1)
  // --------------------------------------------------------------------------

  const handleApplySceneToLive = (scene: MpsScene) => {
    // Apply scene colors & modifiers directly to project layers in store
    for (const [layerId, assignment] of Object.entries(scene.assignments)) {
      updateLayer(layerId, {
        color: assignment.generator.primaryColor,
        blendMode: assignment.blendMode as any,
        opacity: assignment.opacity,
      });
    }

    // Push as new Playlist Clip
    addPlaylistClip({
      title: `${scene.name} (Scene)`,
      themeStyle: scene.category.toLowerCase().includes('halloween')
        ? 'spooky'
        : scene.category.toLowerCase().includes('winter')
        ? 'ice'
        : 'victorian',
      durationSec: 30,
      durationFormatted: '00:30',
      prompt: `Holiday Architectural Projection: ${scene.name} with ${scene.particleOverlay} overlay`,
      seed: scene.seed,
    });
  };

  const handleDuplicateScene = (scene: MpsScene) => {
    const dup: MpsScene = {
      ...scene,
      id: `scene-${Date.now()}`,
      name: `${scene.name} (Copy)`,
    };
    setScenes((prev) => [dup, ...prev]);
    setActiveSceneId(dup.id);
  };

  const handleCreateHueShift = (scene: MpsScene, deltaDeg: number) => {
    const variant = createHueShiftedSceneVariant(scene, deltaDeg);
    setScenes((prev) => [variant, ...prev]);
    setActiveSceneId(variant.id);
  };

  const handleDeleteScene = (sceneId: string) => {
    if (scenes.length <= 1) return;
    setScenes((prev) => prev.filter((s) => s.id !== sceneId));
    if (activeSceneId === sceneId) {
      setActiveSceneId(scenes.find((s) => s.id !== sceneId)?.id || '');
    }
  };

  const handleExportScenes = () => {
    const json = exportScenesToJson(scenes);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MPS_House_Scenes_${Date.now()}.mpsscenes`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportScenes = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const imported = importScenesFromJson(text);
        setScenes((prev) => [...imported, ...prev]);
        if (imported[0]) setActiveSceneId(imported[0].id);
      } catch (err: any) {
        alert(`Failed to import .mpsscenes: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // --------------------------------------------------------------------------
  // AUTO-DECORATE ACTIONS (Tab 2)
  // --------------------------------------------------------------------------

  const handleAutoDecorate = () => {
    const pal = palettes.find((p) => p.id === selectedPaletteId) || palettes[0];
    const newScene = autoDecorateScene(layers, pal, autoSeed, activeScene);
    setScenes((prev) => prev.map((s) => (s.id === activeScene.id ? newScene : s)));
  };

  const handleRerollUnlocked = () => {
    const nextSeed = (autoSeed + Math.floor(Math.random() * 999) + 1) % 100000;
    setAutoSeed(nextSeed);
    const pal = palettes.find((p) => p.id === selectedPaletteId) || palettes[0];
    const rerolled = autoDecorateScene(layers, pal, nextSeed, activeScene);
    setScenes((prev) => prev.map((s) => (s.id === activeScene.id ? rerolled : s)));
  };

  const handleToggleLayerLock = (layerId: string) => {
    if (!activeScene) return;
    const curr = activeScene.assignments[layerId];
    if (!curr) return;

    const updated = {
      ...activeScene,
      assignments: {
        ...activeScene.assignments,
        [layerId]: {
          ...curr,
          locked: !curr.locked,
        },
      },
    };
    setScenes((prev) => prev.map((s) => (s.id === activeScene.id ? updated : s)));
  };

  // --------------------------------------------------------------------------
  // HOLIDAY FX & GENERATORS INSPECTOR (Tab 3)
  // --------------------------------------------------------------------------

  const editingAssignment = activeScene?.assignments[editingLayerId];

  const handleUpdateAssignment = (patch: Partial<MpsScene['assignments'][string]>) => {
    if (!activeScene || !editingAssignment) return;
    const updatedScene: MpsScene = {
      ...activeScene,
      assignments: {
        ...activeScene.assignments,
        [editingLayerId]: {
          ...editingAssignment,
          ...patch,
        },
      },
    };
    setScenes((prev) => prev.map((s) => (s.id === activeScene.id ? updatedScene : s)));
  };

  const handleUpdateGenerator = (patch: Partial<MpsScene['assignments'][string]['generator']>) => {
    if (!activeScene || !editingAssignment) return;
    handleUpdateAssignment({
      generator: {
        ...editingAssignment.generator,
        ...patch,
      },
    });
  };

  const handleUpdateDecorEffect = (patch: Partial<MpsScene['assignments'][string]['decorEffect']>) => {
    if (!activeScene || !editingAssignment) return;
    handleUpdateAssignment({
      decorEffect: {
        ...editingAssignment.decorEffect,
        ...patch,
      },
    });
  };

  // --------------------------------------------------------------------------
  // FX GRAPH EDITOR ACTIONS (Tab 4)
  // --------------------------------------------------------------------------

  const fxGraph = activeScene?.fxGraph || createDefaultFxGraph();

  const handleUpdateFxGraph = (newGraph: FxGraphDefinition) => {
    if (!activeScene) return;
    const updated = { ...activeScene, fxGraph: newGraph };
    setScenes((prev) => prev.map((s) => (s.id === activeScene.id ? updated : s)));
  };

  const handleAddFxNode = (kind: FxNodeKind) => {
    const id = `node-${kind.toLowerCase()}-${Date.now().toString().slice(-4)}`;
    const newNode: FxGraphNode = {
      id,
      kind,
      x: 200 + Math.random() * 200,
      y: 120 + Math.random() * 160,
      params: {
        brightness: 0.0,
        contrast: 1.0,
        hueShiftDeg: 0,
        saturation: 1.0,
        levelsBlack: 0.0,
        levelsWhite: 1.0,
        levelsGamma: 1.0,
        curveKnots: [0, 0.25, 0.5, 0.75, 1],
        tintColor: '#FFFFFF',
        tintAmount: 0.5,
        invertAmount: 1.0,
        posterizeLevels: 6,
        mixMode: 'normal',
        mixFactor: 0.5,
      },
    };

    handleUpdateFxGraph({
      ...fxGraph,
      nodes: [...fxGraph.nodes, newNode],
    });
    setSelectedFxNodeId(id);
  };

  const handleDeleteFxNode = (nodeId: string) => {
    if (nodeId === 'node-source' || nodeId === 'node-output') return; // protect terminals
    handleUpdateFxGraph({
      ...fxGraph,
      nodes: fxGraph.nodes.filter((n) => n.id !== nodeId),
      connections: fxGraph.connections.filter((c) => c.fromId !== nodeId && c.toId !== nodeId),
    });
    if (selectedFxNodeId === nodeId) setSelectedFxNodeId(null);
  };

  const handleConnectNodes = (toId: string, toPort: number = 0) => {
    if (!wiringFromId || wiringFromId === toId) {
      setWiringFromId(null);
      return;
    }

    if (wouldCreateCycle(fxGraph.nodes, fxGraph.connections, wiringFromId, toId)) {
      setGraphWarning(`Connection ${wiringFromId} → ${toId} would create a circular dependency cycle!`);
      setTimeout(() => setGraphWarning(null), 3500);
      setWiringFromId(null);
      return;
    }

    // Replace existing connection into this port
    const filtered = fxGraph.connections.filter(
      (c) => !(c.toId === toId && (c.toPort || 0) === toPort)
    );

    handleUpdateFxGraph({
      ...fxGraph,
      connections: [...filtered, { fromId: wiringFromId, toId, toPort }],
    });
    setWiringFromId(null);
    setGraphWarning(null);
  };

  const handleDisconnectNodeInput = (toId: string, toPort: number = 0) => {
    handleUpdateFxGraph({
      ...fxGraph,
      connections: fxGraph.connections.filter(
        (c) => !(c.toId === toId && (c.toPort || 0) === toPort)
      ),
    });
  };

  const handleLoadFxPreset = (preset: FxGraphDefinition) => {
    handleUpdateFxGraph({
      ...preset,
      id: `fx-${Date.now()}`,
    });
    setSelectedFxNodeId(null);
  };

  const selectedNode = fxGraph.nodes.find((n) => n.id === selectedFxNodeId);

  const handleUpdateNodeParams = (patch: Partial<FxGraphNode['params']>) => {
    if (!selectedNode) return;
    const updatedNodes = fxGraph.nodes.map((n) => {
      if (n.id !== selectedNode.id) return n;
      return {
        ...n,
        params: {
          ...n.params,
          ...patch,
        },
      };
    });
    handleUpdateFxGraph({
      ...fxGraph,
      nodes: updatedNodes,
    });
  };

  // Filtered scenes
  const filteredScenes = scenes.filter((s) => {
    const matchCat = categoryFilter === 'All' || s.category.toLowerCase().includes(categoryFilter.toLowerCase());
    const matchSearch = s.name.toLowerCase().includes(sceneSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 lg:p-5 select-none font-sans">
      <div className="w-full max-w-[1620px] h-[94vh] bg-[#0A0F1D] border border-[#1E293B] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* ================================================================== */}
        {/* MODAL HEADER */}
        {/* ================================================================== */}
        <div className="px-6 py-3.5 border-b border-[#1E293B] bg-[#0E1626] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-amber-500/40 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-slate-100 tracking-wide uppercase">
                  Scene Studio & 11-Node Colour/FX Graph
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  MPS v3.5 Parity
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  {fps} FPS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Tag-Aware Auto-Decorate • Holiday Bulbs & Icicles • Theme Palettes • Real-Time House Canvas
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1.5 bg-[#090D16] p-1 rounded-xl border border-[#1E293B]">
            <button
              type="button"
              onClick={() => setActiveTab('scenes')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'scenes'
                  ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Scene Library
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('auto-decorate')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'auto-decorate'
                  ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              Auto-Decorate & Palettes
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('holiday-fx')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'holiday-fx'
                  ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              Holiday Effects & Generators
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('fx-graph')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'fx-graph'
                  ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              11-Node FX Graph
            </button>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E293B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================================================================== */}
        {/* MAIN BODY: SPLIT VIEW (Canvas Preview Right/Top + Controls Left) */}
        {/* ================================================================== */}
        <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
          {/* LEFT 6 COLS: TAB CONTROL PANELS */}
          <div className="col-span-12 lg:col-span-6 border-r border-[#1E293B] flex flex-col overflow-hidden bg-[#0B101E]">
            {/* TAB 1: SCENE LIBRARY */}
            {activeTab === 'scenes' && (
              <div className="flex-1 flex flex-col p-5 overflow-y-auto space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <input
                    type="text"
                    placeholder="Search scenes by name..."
                    value={sceneSearch}
                    onChange={(e) => setSceneSearch(e.target.value)}
                    className="flex-1 bg-[#121929] border border-[#223147] rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleExportScenes}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium bg-[#131B2C] border border-[#223147] text-slate-300 hover:text-white"
                      title="Export .mpsscenes JSON"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export
                    </button>
                    <label className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium bg-[#131B2C] border border-[#223147] text-slate-300 hover:text-white cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      Import
                      <input
                        type="file"
                        accept=".mpsscenes,.json"
                        onChange={handleImportScenes}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {['All', 'Christmas', 'Winter', 'Halloween', 'Hanukkah', 'NewYear'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                        categoryFilter === cat
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'bg-[#131B2C] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Scene Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {filteredScenes.map((scene) => {
                    const isActive = scene.id === activeSceneId;
                    const pal = palettes.find((p) => p.id === scene.paletteId) || palettes[0];

                    return (
                      <div
                        key={scene.id}
                        onClick={() => setActiveSceneId(scene.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                          isActive
                            ? 'bg-gradient-to-br from-[#1A2338] to-[#121929] border-amber-500/70 shadow-lg shadow-amber-950/20'
                            : 'bg-[#0E1524] border-[#1C263A] hover:border-[#2C3B57]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/80 text-amber-300 border border-slate-700">
                              {scene.category}
                            </span>
                            <div className="flex items-center gap-1">
                              {/* Swatch dots */}
                              {pal.colors.slice(0, 4).map((c, ci) => (
                                <span
                                  key={ci}
                                  className="w-2.5 h-2.5 rounded-full border border-black/40"
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                          </div>

                          <h3 className="text-sm font-bold text-slate-100 mt-2 truncate">
                            {scene.name}
                          </h3>

                          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                            <span>Weather: <strong className="text-slate-300">{scene.particleOverlay}</strong></span>
                            <span>•</span>
                            <span>Flyover: <strong className="text-slate-300">{scene.santaFlyoverActive ? 'Yes' : 'No'}</strong></span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-between border-t border-[#1C263A] pt-2.5 mt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplySceneToLive(scene);
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-sm"
                            title="Push Scene to Live Show Playlist"
                          >
                            <Send className="w-3 h-3" />
                            Push to Show
                          </button>

                          <div className="flex items-center gap-1">
                            {/* Quick Hue-Shift Popover or Buttons */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCreateHueShift(scene, 60);
                              }}
                              className="px-2 py-1 rounded text-[10px] font-mono bg-[#151D2E] text-slate-300 hover:text-white border border-[#223147]"
                              title="Duplicate with +60° Hue Shift"
                            >
                              +60°
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateScene(scene);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-white"
                              title="Duplicate Scene"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteScene(scene.id);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-rose-400"
                              title="Delete Scene"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: TAG-AWARE AUTO-DECORATE & PALETTES */}
            {activeTab === 'auto-decorate' && (
              <div className="flex-1 flex flex-col p-5 overflow-y-auto space-y-4">
                {/* 1. Theme Palette Selector */}
                <div className="p-4 rounded-xl bg-[#0E1524] border border-[#1C263A] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                      <Palette className="w-4 h-4 text-amber-400" />
                      1. Select Holiday Theme Palette
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {palettes.length} Presets Available
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {palettes.map((pal) => (
                      <button
                        key={pal.id}
                        type="button"
                        onClick={() => setSelectedPaletteId(pal.id)}
                        className={`p-2.5 rounded-lg border text-left transition-all flex items-center justify-between ${
                          selectedPaletteId === pal.id
                            ? 'bg-amber-500/15 border-amber-500 text-white'
                            : 'bg-[#121928] border-[#1D2B40] text-slate-300 hover:border-[#2C3B57]'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold truncate">{pal.name}</div>
                          <div className="text-[10px] text-slate-400">{pal.category}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          {pal.colors.map((c, ci) => (
                            <span
                              key={ci}
                              className="w-3.5 h-3.5 rounded-full border border-black/50 shadow-sm"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. House Shape Tags & Per-Shape Locking */}
                <div className="p-4 rounded-xl bg-[#0E1524] border border-[#1C263A] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-cyan-400" />
                        2. House Shapes & Semantic Lock Table
                      </span>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Locked shapes are skipped during Reroll and keep their exact look
                      </p>
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                    {layers.map((layer) => {
                      const tag = classifyLayerTag(layer);
                      const assign = activeScene?.assignments[layer.id];
                      const isLocked = assign?.locked || false;

                      return (
                        <div
                          key={layer.id}
                          className="px-3 py-2 rounded-lg bg-[#121928] border border-[#1C263A] flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full border border-black/40"
                              style={{ backgroundColor: assign?.generator.primaryColor || layer.color }}
                            />
                            <span className="font-semibold text-slate-200">{layer.name}</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                              {tag}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400">
                              {assign?.decorEffect.type || 'none'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleLayerLock(layer.id)}
                              className={`p-1 rounded transition-colors ${
                                isLocked
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                              title={isLocked ? 'Locked (Protected from Reroll)' : 'Unlocked'}
                            >
                              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Execution Bar: Auto-Decorate & Reroll Seed */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-[#141C2E] to-[#171E33] border border-[#23324C] space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-300 font-medium">Seed:</span>
                      <input
                        type="number"
                        value={autoSeed}
                        onChange={(e) => setAutoSeed(parseInt(e.target.value) || 0)}
                        className="w-24 bg-[#0E1524] border border-[#223147] rounded-lg px-2.5 py-1 text-xs text-slate-200 font-mono text-center"
                      />
                      <button
                        type="button"
                        onClick={() => setAutoSeed(Math.floor(Math.random() * 99999))}
                        className="p-1.5 rounded-lg bg-[#0E1524] border border-[#223147] text-slate-300 hover:text-white"
                        title="Randomize Seed"
                      >
                        <Shuffle className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Quick Hue-Shifts */}
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-slate-400">Hue:</span>
                      {[30, 60, 120, 180].map((deg) => (
                        <button
                          key={deg}
                          type="button"
                          onClick={() => handleCreateHueShift(activeScene, deg)}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#0E1524] border border-[#223147] text-slate-300 hover:text-white"
                        >
                          +{deg}°
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleAutoDecorate}
                      className="py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 hover:from-amber-400 hover:to-rose-400 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-amber-950/30"
                    >
                      <Sparkles className="w-4 h-4" />
                      Auto-Decorate House
                    </button>

                    <button
                      type="button"
                      onClick={handleRerollUnlocked}
                      className="py-2.5 rounded-xl font-bold text-xs bg-[#1C263A] text-slate-200 hover:bg-[#25324C] hover:text-white transition-all flex items-center justify-center gap-1.5 border border-[#2D3D5A]"
                    >
                      <Shuffle className="w-4 h-4 text-cyan-400" />
                      Reroll Unlocked Shapes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: HOLIDAY EFFECTS & GENERATORS INSPECTOR */}
            {activeTab === 'holiday-fx' && (
              <div className="flex-1 flex flex-col p-5 overflow-y-auto space-y-4">
                {/* Shape Selector */}
                <div className="flex items-center justify-between bg-[#0E1524] p-3 rounded-xl border border-[#1C263A]">
                  <span className="text-xs font-semibold text-slate-300">Selected House Shape:</span>
                  <select
                    value={editingLayerId}
                    onChange={(e) => setEditingLayerId(e.target.value)}
                    className="bg-[#121928] border border-[#223147] rounded-lg px-3 py-1.5 text-xs text-slate-100 font-medium"
                  >
                    {layers.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({classifyLayerTag(l)})
                      </option>
                    ))}
                  </select>
                </div>

                {editingAssignment ? (
                  <div className="space-y-4">
                    {/* Procedural Generator Panel */}
                    <div className="p-4 rounded-xl bg-[#0E1524] border border-[#1C263A] space-y-3">
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-amber-400" />
                        Procedural Generator Source
                      </span>

                      <div className="grid grid-cols-3 gap-1.5">
                        {(['solid', 'gradient', 'simplex-noise', 'plasma', 'stripes', 'checkerboard'] as GeneratorSourceType[]).map(
                          (gt) => (
                            <button
                              key={gt}
                              type="button"
                              onClick={() => handleUpdateGenerator({ type: gt })}
                              className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold capitalize border transition-all ${
                                editingAssignment.generator.type === gt
                                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                                  : 'bg-[#121928] text-slate-400 border-[#1F2C41] hover:text-white'
                              }`}
                            >
                              {gt.replace('-', ' ')}
                            </button>
                          )
                        )}
                      </div>

                      {/* Color Pickers */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Primary Color</label>
                          <input
                            type="color"
                            value={editingAssignment.generator.primaryColor}
                            onChange={(e) => handleUpdateGenerator({ primaryColor: e.target.value })}
                            className="w-full h-8 rounded bg-[#121928] border border-[#223147] cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Secondary Color</label>
                          <input
                            type="color"
                            value={editingAssignment.generator.secondaryColor}
                            onChange={(e) => handleUpdateGenerator({ secondaryColor: e.target.value })}
                            className="w-full h-8 rounded bg-[#121928] border border-[#223147] cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Tertiary Color</label>
                          <input
                            type="color"
                            value={editingAssignment.generator.tertiaryColor || '#ffffff'}
                            onChange={(e) => handleUpdateGenerator({ tertiaryColor: e.target.value })}
                            className="w-full h-8 rounded bg-[#121928] border border-[#223147] cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Speed & Scale Sliders */}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                            <span>Speed</span>
                            <span>{editingAssignment.generator.speed.toFixed(1)}x</span>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="3.0"
                            step="0.1"
                            value={editingAssignment.generator.speed}
                            onChange={(e) => handleUpdateGenerator({ speed: parseFloat(e.target.value) })}
                            className="w-full accent-amber-500"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                            <span>Scale / Angle</span>
                            <span>{editingAssignment.generator.angleDeg}°</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="180"
                            step="5"
                            value={editingAssignment.generator.angleDeg}
                            onChange={(e) => handleUpdateGenerator({ angleDeg: parseInt(e.target.value) })}
                            className="w-full accent-amber-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Holiday Decor Effect Panel */}
                    <div className="p-4 rounded-xl bg-[#0E1524] border border-[#1C263A] space-y-3">
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-rose-400" />
                        Holiday Decor Effect
                      </span>

                      <div className="grid grid-cols-3 gap-1.5">
                        {(
                          [
                            'none',
                            'border-chase-bulbs',
                            'icicle-drip',
                            'window-silhouette',
                            'candle-flicker',
                            'ornament-twinkle',
                          ] as HolidayDecorEffectType[]
                        ).map((ef) => (
                          <button
                            key={ef}
                            type="button"
                            onClick={() => handleUpdateDecorEffect({ type: ef })}
                            className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold capitalize border transition-all ${
                              editingAssignment.decorEffect.type === ef
                                ? 'bg-rose-500 text-white border-rose-400 shadow-sm'
                                : 'bg-[#121928] text-slate-400 border-[#1F2C41] hover:text-white'
                            }`}
                          >
                            {ef.replace('-', ' ')}
                          </button>
                        ))}
                      </div>

                      {/* Effect-Specific Controls */}
                      {editingAssignment.decorEffect.type === 'border-chase-bulbs' && (
                        <div className="space-y-2 pt-2 border-t border-[#1C263A]">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                                <span>Bulb Spacing</span>
                                <span>{editingAssignment.decorEffect.bulbSpacingPx}px</span>
                              </div>
                              <input
                                type="range"
                                min="12"
                                max="48"
                                value={editingAssignment.decorEffect.bulbSpacingPx}
                                onChange={(e) =>
                                  handleUpdateDecorEffect({ bulbSpacingPx: parseInt(e.target.value) })
                                }
                                className="w-full accent-rose-500"
                              />
                            </div>
                            <div>
                              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                                <span>Chase Speed</span>
                                <span>{editingAssignment.decorEffect.chaseSpeed.toFixed(1)}x</span>
                              </div>
                              <input
                                type="range"
                                min="0.5"
                                max="4.0"
                                step="0.2"
                                value={editingAssignment.decorEffect.chaseSpeed}
                                onChange={(e) =>
                                  handleUpdateDecorEffect({ chaseSpeed: parseFloat(e.target.value) })
                                }
                                className="w-full accent-rose-500"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {editingAssignment.decorEffect.type === 'icicle-drip' && (
                        <div className="pt-2 border-t border-[#1C263A]">
                          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                            <span>Icicle Length</span>
                            <span>{editingAssignment.decorEffect.icicleLengthPx}px</span>
                          </div>
                          <input
                            type="range"
                            min="14"
                            max="50"
                            value={editingAssignment.decorEffect.icicleLengthPx}
                            onChange={(e) =>
                              handleUpdateDecorEffect({ icicleLengthPx: parseInt(e.target.value) })
                            }
                            className="w-full accent-cyan-400"
                          />
                        </div>
                      )}

                      {editingAssignment.decorEffect.type === 'window-silhouette' && (
                        <div className="pt-2 border-t border-[#1C263A] space-y-1.5">
                          <label className="text-[11px] text-slate-400 block">Silhouette Figure:</label>
                          <select
                            value={editingAssignment.decorEffect.silhouette}
                            onChange={(e) =>
                              handleUpdateDecorEffect({ silhouette: e.target.value as WindowSilhouetteType })
                            }
                            className="w-full bg-[#121928] border border-[#223147] rounded-lg px-3 py-1.5 text-xs text-slate-100"
                          >
                            <option value="santa-walking">Santa Claus Walking with Sack</option>
                            <option value="elves-workshop">Elf at Toymaker Workbench</option>
                            <option value="spinning-tree">Spinning Christmas Tree & Star</option>
                            <option value="bethlehem-star">Glowing Bethlehem 8-Point Star</option>
                            <option value="spooky-cat">Arched Halloween Cat & Slit Eyes</option>
                            <option value="dancing-skeleton">Dancing Skeleton Groove</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Scene-Wide Overlays */}
                    <div className="p-4 rounded-xl bg-[#0E1524] border border-[#1C263A] space-y-3">
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                        <Snowflake className="w-4 h-4 text-cyan-400" />
                        Scene-Wide Weather & Flyover Overlays
                      </span>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Weather Particle:</label>
                          <select
                            value={activeScene.particleOverlay}
                            onChange={(e) => {
                              const updated = {
                                ...activeScene,
                                particleOverlay: e.target.value as SceneParticleOverlay,
                              };
                              setScenes((prev) => prev.map((s) => (s.id === activeScene.id ? updated : s)));
                            }}
                            className="w-full bg-[#121928] border border-[#223147] rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                          >
                            <option value="none">None (Clear Sky)</option>
                            <option value="gentle-snow">Gentle Snow Fall</option>
                            <option value="blizzard">Blizzard Snow Wind</option>
                            <option value="falling-leaves">Falling Autumn Leaves</option>
                            <option value="rising-embers">Rising Fire Embers</option>
                            <option value="nye-confetti">NYE Confetti Ribbons</option>
                            <option value="fireflies">Bioluminescent Fireflies</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Santa Sky Flyover:</label>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = {
                                ...activeScene,
                                santaFlyoverActive: !activeScene.santaFlyoverActive,
                              };
                              setScenes((prev) => prev.map((s) => (s.id === activeScene.id ? updated : s)));
                            }}
                            className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                              activeScene.santaFlyoverActive
                                ? 'bg-amber-500 text-slate-950 border-amber-400'
                                : 'bg-[#121928] text-slate-400 border-[#1F2C41]'
                            }`}
                          >
                            {activeScene.santaFlyoverActive ? 'Santa Flyover Active' : 'Santa Flyover Off'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No shape selected. Choose a shape from the list above to inspect its generator and holiday effect.
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: 11-NODE COLOUR/FX GRAPH EDITOR */}
            {activeTab === 'fx-graph' && (
              <div className="flex-1 flex flex-col p-4 overflow-hidden space-y-3">
                {/* Node Toolbar & Presets */}
                <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-[#1E293B]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-300">Add Node:</span>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddFxNode(e.target.value as FxNodeKind);
                          e.target.value = '';
                        }
                      }}
                      className="bg-[#121928] border border-[#223147] rounded-lg px-2.5 py-1 text-xs text-slate-200"
                    >
                      <option value="">+ Choose Node Type...</option>
                      <option value="BrightnessContrast">Brightness & Contrast</option>
                      <option value="HueSaturation">Hue & Saturation</option>
                      <option value="Levels">Levels (Black / White / Gamma)</option>
                      <option value="Curves">5-Knot Tone Curves</option>
                      <option value="Tint">Color Tint Multiply</option>
                      <option value="Invert">Color Invert</option>
                      <option value="Posterize">Posterize Quantize</option>
                      <option value="Mix">Mix / Blend Branch</option>
                      <option value="Mask">Mask / Alpha Matte</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-400">Presets:</span>
                    {BUILT_IN_FX_PRESETS.map((pst) => (
                      <button
                        key={pst.id}
                        type="button"
                        onClick={() => handleLoadFxPreset(pst)}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#121928] border border-[#223147] text-slate-300 hover:text-white"
                        title={pst.name}
                      >
                        {pst.name.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {graphWarning && (
                  <div className="p-2 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{graphWarning}</span>
                  </div>
                )}

                {/* Node Graph Canvas (Visual Node Grid) */}
                <div className="flex-1 bg-[#070B14] rounded-xl border border-[#1C263A] p-4 overflow-auto relative min-h-[220px]">
                  {/* Visual Node Cards */}
                  <div className="flex flex-wrap gap-3 items-start">
                    {fxGraph.nodes.map((node) => {
                      const isSelected = node.id === selectedFxNodeId;
                      const isWiringSource = node.id === wiringFromId;
                      const hasIncoming = fxGraph.connections.some((c) => c.toId === node.id);

                      return (
                        <div
                          key={node.id}
                          onClick={() => setSelectedFxNodeId(node.id)}
                          className={`w-44 p-3 rounded-xl border transition-all cursor-pointer shadow-md ${
                            isSelected
                              ? 'bg-[#172238] border-amber-500 shadow-amber-950/20'
                              : 'bg-[#0E1524] border-[#1D2A3F] hover:border-[#2F4262]'
                          }`}
                        >
                          <div className="flex items-center justify-between pb-1.5 border-b border-[#1E293B]">
                            <span className="text-xs font-bold text-slate-200 truncate">{node.kind}</span>
                            {node.kind !== 'Source' && node.kind !== 'Output' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFxNode(node.id);
                                }}
                                className="text-slate-500 hover:text-rose-400 p-0.5"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          <div className="text-[10px] text-slate-400 font-mono mt-1">ID: {node.id}</div>

                          {/* Port Connections Toolbar */}
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1C263A]">
                            {/* Input Port */}
                            {node.kind !== 'Source' ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (wiringFromId) {
                                    handleConnectNodes(node.id, 0);
                                  } else if (hasIncoming) {
                                    handleDisconnectNodeInput(node.id, 0);
                                  }
                                }}
                                className={`px-2 py-0.5 rounded text-[9px] font-mono border transition-all ${
                                  wiringFromId
                                    ? 'bg-amber-500 text-slate-950 animate-pulse border-amber-400'
                                    : hasIncoming
                                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-rose-500/20 hover:text-rose-300'
                                    : 'bg-[#141C2B] text-slate-400 border-[#223147]'
                                }`}
                              >
                                {wiringFromId ? 'Connect In' : hasIncoming ? 'In Wired' : 'In Free'}
                              </button>
                            ) : (
                              <span className="text-[9px] font-mono text-slate-600">Root</span>
                            )}

                            {/* Output Port */}
                            {node.kind !== 'Output' ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setWiringFromId(isWiringSource ? null : node.id);
                                }}
                                className={`px-2 py-0.5 rounded text-[9px] font-mono border transition-all ${
                                  isWiringSource
                                    ? 'bg-rose-500 text-white border-rose-400'
                                    : 'bg-[#141C2B] text-slate-300 border-[#223147] hover:text-white hover:border-amber-400'
                                }`}
                              >
                                {isWiringSource ? 'Cancel Wire' : 'Drag Wire'}
                              </button>
                            ) : (
                              <span className="text-[9px] font-mono text-slate-600">Master</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Node Parameter Inspector */}
                {selectedNode ? (
                  <div className="p-3.5 rounded-xl bg-[#0E1524] border border-[#1C263A] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                        {selectedNode.kind} Node Inspector
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">Node ID: {selectedNode.id}</span>
                    </div>

                    {selectedNode.kind === 'BrightnessContrast' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                            <span>Brightness</span>
                            <span>{(selectedNode.params.brightness || 0).toFixed(2)}</span>
                          </div>
                          <input
                            type="range"
                            min="-0.5"
                            max="0.5"
                            step="0.02"
                            value={selectedNode.params.brightness || 0}
                            onChange={(e) => handleUpdateNodeParams({ brightness: parseFloat(e.target.value) })}
                            className="w-full accent-amber-500"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                            <span>Contrast</span>
                            <span>{(selectedNode.params.contrast || 1.0).toFixed(2)}x</span>
                          </div>
                          <input
                            type="range"
                            min="0.2"
                            max="2.5"
                            step="0.05"
                            value={selectedNode.params.contrast ?? 1.0}
                            onChange={(e) => handleUpdateNodeParams({ contrast: parseFloat(e.target.value) })}
                            className="w-full accent-amber-500"
                          />
                        </div>
                      </div>
                    )}

                    {selectedNode.kind === 'HueSaturation' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                            <span>Hue Shift</span>
                            <span>{selectedNode.params.hueShiftDeg || 0}°</span>
                          </div>
                          <input
                            type="range"
                            min="-180"
                            max="180"
                            step="5"
                            value={selectedNode.params.hueShiftDeg || 0}
                            onChange={(e) => handleUpdateNodeParams({ hueShiftDeg: parseInt(e.target.value) })}
                            className="w-full accent-amber-500"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                            <span>Saturation</span>
                            <span>{(selectedNode.params.saturation || 1.0).toFixed(2)}x</span>
                          </div>
                          <input
                            type="range"
                            min="0.0"
                            max="2.5"
                            step="0.05"
                            value={selectedNode.params.saturation ?? 1.0}
                            onChange={(e) => handleUpdateNodeParams({ saturation: parseFloat(e.target.value) })}
                            className="w-full accent-amber-500"
                          />
                        </div>
                      </div>
                    )}

                    {selectedNode.kind === 'Levels' && (
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Black Point</label>
                          <input
                            type="range"
                            min="0"
                            max="0.5"
                            step="0.02"
                            value={selectedNode.params.levelsBlack || 0}
                            onChange={(e) => handleUpdateNodeParams({ levelsBlack: parseFloat(e.target.value) })}
                            className="w-full accent-amber-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">White Point</label>
                          <input
                            type="range"
                            min="0.5"
                            max="1.0"
                            step="0.02"
                            value={selectedNode.params.levelsWhite ?? 1.0}
                            onChange={(e) => handleUpdateNodeParams({ levelsWhite: parseFloat(e.target.value) })}
                            className="w-full accent-amber-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Midtone Gamma</label>
                          <input
                            type="range"
                            min="0.3"
                            max="2.5"
                            step="0.05"
                            value={selectedNode.params.levelsGamma ?? 1.0}
                            onChange={(e) => handleUpdateNodeParams({ levelsGamma: parseFloat(e.target.value) })}
                            className="w-full accent-amber-500"
                          />
                        </div>
                      </div>
                    )}

                    {selectedNode.kind === 'Tint' && (
                      <div className="flex items-center gap-4">
                        <div className="w-24">
                          <label className="text-[10px] text-slate-400 block mb-1">Tint Color</label>
                          <input
                            type="color"
                            value={selectedNode.params.tintColor || '#FFE7B3'}
                            onChange={(e) => handleUpdateNodeParams({ tintColor: e.target.value })}
                            className="w-full h-8 rounded bg-[#121928] border border-[#223147] cursor-pointer"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                            <span>Tint Mix Amount</span>
                            <span>{Math.round((selectedNode.params.tintAmount ?? 0.5) * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={selectedNode.params.tintAmount ?? 0.5}
                            onChange={(e) => handleUpdateNodeParams({ tintAmount: parseFloat(e.target.value) })}
                            className="w-full accent-amber-500"
                          />
                        </div>
                      </div>
                    )}

                    {selectedNode.kind === 'Posterize' && (
                      <div>
                        <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                          <span>Quantize Color Steps</span>
                          <span>{selectedNode.params.posterizeLevels || 6} Steps</span>
                        </div>
                        <input
                          type="range"
                          min="2"
                          max="24"
                          step="1"
                          value={selectedNode.params.posterizeLevels || 6}
                          onChange={(e) => handleUpdateNodeParams({ posterizeLevels: parseInt(e.target.value) })}
                          className="w-full accent-amber-500"
                        />
                      </div>
                    )}

                    {selectedNode.kind === 'Curves' && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] text-slate-400 block">5-Knot Tone Curve Handles (Shadows to Highlights):</span>
                        <div className="grid grid-cols-5 gap-2">
                          {[0, 1, 2, 3, 4].map((idx) => {
                            const val = selectedNode.params.curveKnots?.[idx] ?? (idx * 0.25);
                            return (
                              <div key={idx} className="text-center">
                                <span className="text-[9px] font-mono text-slate-400 block mb-0.5">K{idx}</span>
                                <input
                                  type="range"
                                  min="0"
                                  max="1"
                                  step="0.05"
                                  value={val}
                                  onChange={(e) => {
                                    const nextKnots = [
                                      ...(selectedNode.params.curveKnots || [0, 0.25, 0.5, 0.75, 1]),
                                    ] as [number, number, number, number, number];
                                    nextKnots[idx] = parseFloat(e.target.value);
                                    handleUpdateNodeParams({ curveKnots: nextKnots });
                                  }}
                                  className="w-full accent-amber-500"
                                />
                                <span className="text-[9px] font-mono text-slate-300 block">{val.toFixed(2)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 text-center text-slate-500 text-xs bg-[#0E1524] rounded-xl border border-[#1C263A]">
                    Select any node in the graph above to adjust its parameters.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT 6 COLS: LIVE 60FPS HTML5 HOUSE CANVAS PREVIEW */}
          <div className="col-span-12 lg:col-span-6 flex flex-col bg-[#070B14] p-4 relative overflow-hidden">
            {/* Canvas Header Controls */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1A2538]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                  Live Projector Output Preview
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  ({layers.length} Shapes Active)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                    isPlaying
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : 'bg-[#121B2A] border-[#1D2B40] text-slate-400'
                  }`}
                  title={isPlaying ? 'Pause Animation' : 'Resume 60fps'}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlaying ? '60fps Live' : 'Paused'}</span>
                </button>

                <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer ml-2">
                  <input
                    type="checkbox"
                    checked={showOutlines}
                    onChange={(e) => setShowOutlines(e.target.checked)}
                    className="rounded accent-amber-500 cursor-pointer"
                  />
                  <span>Shape Wireframe</span>
                </label>
              </div>
            </div>

            {/* HTML5 Canvas Container */}
            <div className="flex-1 w-full flex items-center justify-center overflow-hidden rounded-xl border border-[#1E293B] bg-[#05080F] relative shadow-inner">
              <canvas
                ref={canvasRef}
                width={1280}
                height={720}
                className="w-full h-full object-contain"
              />

              {/* Floating Overlay Badge */}
              <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 flex items-center gap-3 text-[11px] font-mono text-slate-300">
                <span>Scene: <strong className="text-amber-400">{activeScene?.name}</strong></span>
                <span>•</span>
                <span>Seed: <strong className="text-cyan-400">{activeScene?.seed}</strong></span>
                <span>•</span>
                <span>FX Filter: <strong className="text-emerald-400">{evaluateFxGraphCssFilterAndLut(fxGraph).cssFilter}</strong></span>
              </div>

              {/* Push Scene Quick CTA */}
              <button
                type="button"
                onClick={() => handleApplySceneToLive(activeScene)}
                className="absolute top-3 right-3 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 shadow-lg hover:from-amber-400 hover:to-rose-400 transition-all flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Push to Show
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
