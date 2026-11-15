import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  Monitor,
  Sliders,
  Grid,
  AlertTriangle,
  Download,
  Upload,
  Plus,
  Trash2,
  Check,
  RotateCcw,
  Layers,
  Activity,
  Save,
  Sun,
  Clock,
  Eye,
  Info
} from 'lucide-react';
import { useProjectionStore } from '../../store/useProjectionStore';
import {
  ProjectorRigDocument,
  ProjectorOutputConfig,
  EdgeBlendZone,
  LampHourRecord,
  BlendRampType,
  STANDARD_RESOLUTIONS,
  createDefaultTwoProjectorSideBySideRig,
  createDefaultThreeProjectorRig,
  createDefaultWarpMesh,
  computeBlendWeight,
  computeBlackLevelCompensation,
  computeMultiProjectorCanvas,
  solveBilinearMeshPoint,
  saveRigDocument,
  loadRigDocument,
  exportMpsRigJson,
  importMpsRigJson,
  downloadMpsRigFile,
  recordLampSession,
  resetProjectorLampHours
} from '../../utils/projectorRigEngine';

export interface ProjectorRigAndEdgeBlendModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

type ModalTab = 'arrangement' | 'curves' | 'warp' | 'lampHours';

export const ProjectorRigAndEdgeBlendModal: React.FC<ProjectorRigAndEdgeBlendModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose
}) => {
  const store = useProjectionStore() as any;
  const storeIsOpen = store.isProjectorRigModalOpen ?? store.isProjectorRigOpen;
  const [internalOpen, setInternalOpen] = useState(true);
  const isVisible = propIsOpen !== undefined ? propIsOpen : (storeIsOpen !== undefined ? storeIsOpen : internalOpen);

  const handleClose = () => {
    if (propOnClose) {
      propOnClose();
    } else if (typeof store.setIsProjectorRigModalOpen === 'function') {
      store.setIsProjectorRigModalOpen(false);
    } else {
      setInternalOpen(false);
    }
  };

  const showToast = useCallback((msg: string) => {
    if (typeof store.showToast === 'function') {
      store.showToast(msg);
    } else {
      console.log('[RigToast]', msg);
    }
  }, [store]);

  // Active Tab
  const [activeTab, setActiveTab] = useState<ModalTab>('arrangement');

  // Projector Rig Document State
  const [rig, setRig] = useState<ProjectorRigDocument>(() => loadRigDocument());
  const [selectedProjectId, setSelectedProjectId] = useState<string>('proj-1');
  const [selectedBlendId, setSelectedBlendId] = useState<string>('blend-proj-1-proj-2');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // File Input Ref for .mpsrig Import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Canvas Refs for Real-Time Renderers
  const curveCanvasRef = useRef<HTMLCanvasElement>(null);
  const blendGradientCanvasRef = useRef<HTMLCanvasElement>(null);

  // Currently Selected Projector
  const activeProjector = useMemo(() => {
    return rig.projectors.find((p) => p.id === selectedProjectId) || rig.projectors[0] || null;
  }, [rig.projectors, selectedProjectId]);

  // Currently Selected Blend Zone
  const activeBlendZone = useMemo(() => {
    return rig.edgeBlends.find((b) => b.id === selectedBlendId) || rig.edgeBlends[0] || null;
  }, [rig.edgeBlends, selectedBlendId]);

  // Synchronize or auto-select IDs when projectors change
  useEffect(() => {
    if (rig.projectors.length > 0 && !rig.projectors.some((p) => p.id === selectedProjectId)) {
      setSelectedProjectId(rig.projectors[0].id);
    }
    if (rig.edgeBlends.length > 0 && !rig.edgeBlends.some((b) => b.id === selectedBlendId)) {
      setSelectedBlendId(rig.edgeBlends[0].id);
    }
  }, [rig.projectors, rig.edgeBlends, selectedProjectId, selectedBlendId]);

  // Recompute Canvas Bounds whenever projectors change
  const recalculateCanvas = useCallback((projectors: ProjectorOutputConfig[]) => {
    const { canvasWidth, canvasHeight, blendZones } = computeMultiProjectorCanvas(projectors, 0.15);
    setRig((prev) => {
      // Merge new blendZones with existing settings (preserve user rampType, gamma, lift)
      const mergedBlends = blendZones.map((bz) => {
        const existing = prev.edgeBlends.find((e) => e.id === bz.id);
        if (existing) {
          return {
            ...bz,
            rampType: existing.rampType,
            gamma: existing.gamma,
            blackLevelLift: existing.blackLevelLift
          };
        }
        return bz;
      });

      return {
        ...prev,
        totalCanvasWidth: canvasWidth,
        totalCanvasHeight: canvasHeight,
        projectors,
        edgeBlends: mergedBlends
      };
    });
    setHasUnsavedChanges(true);
  }, []);

  // Update a single projector's properties
  const updateProjector = useCallback((id: string, patch: Partial<ProjectorOutputConfig>) => {
    setRig((prev) => {
      const updated = prev.projectors.map((p) => (p.id === id ? { ...p, ...patch } : p));
      const { canvasWidth, canvasHeight, blendZones } = computeMultiProjectorCanvas(updated, 0.15);
      const mergedBlends = blendZones.map((bz) => {
        const existing = prev.edgeBlends.find((e) => e.id === bz.id);
        return existing ? { ...bz, rampType: existing.rampType, gamma: existing.gamma, blackLevelLift: existing.blackLevelLift } : bz;
      });

      return {
        ...prev,
        totalCanvasWidth: canvasWidth,
        totalCanvasHeight: canvasHeight,
        projectors: updated,
        edgeBlends: mergedBlends
      };
    });
    setHasUnsavedChanges(true);
  }, []);

  // Update a single edge blend zone
  const updateBlendZone = useCallback((id: string, patch: Partial<EdgeBlendZone>) => {
    setRig((prev) => {
      const updated = prev.edgeBlends.map((b) => (b.id === id ? { ...b, ...patch } : b));
      return { ...prev, edgeBlends: updated };
    });
    setHasUnsavedChanges(true);
  }, []);

  // Load Preset Rigs
  const handleLoadPreset = (type: 'dual-1080p' | 'triple-1080p' | 'dual-4k') => {
    if (type === 'dual-1080p') {
      const defaultRig = createDefaultTwoProjectorSideBySideRig(1920, 1080, 0.15);
      setRig(defaultRig);
      showToast('Loaded Dual 1080p Side-by-Side (15% Overlap) Rig');
    } else if (type === 'triple-1080p') {
      const tripleRig = createDefaultThreeProjectorRig();
      setRig(tripleRig);
      showToast('Loaded Triple 1080p Panoramic Rig (5184 × 1080)');
    } else if (type === 'dual-4k') {
      const dual4k = createDefaultTwoProjectorSideBySideRig(3840, 2160, 0.12);
      dual4k.name = 'Dual 4K UHD Master Rig (6758 × 2160)';
      setRig(dual4k);
      showToast('Loaded Dual 4K UHD Rig (12% Overlap)');
    }
    setHasUnsavedChanges(true);
  };

  // Add Projector
  const handleAddProjector = () => {
    const nextIdx = rig.projectors.length + 1;
    const lastProj = rig.projectors[rig.projectors.length - 1];
    const width = lastProj ? lastProj.resolution.width : 1920;
    const height = lastProj ? lastProj.resolution.height : 1080;
    const overlapPx = Math.round(width * 0.15);
    const newX = lastProj ? lastProj.position.x + width - overlapPx : 0;

    const newProj: ProjectorOutputConfig = {
      id: `proj-${Date.now()}`,
      name: `Projector ${nextIdx}`,
      displayIndex: nextIdx,
      resolution: { width, height },
      position: { x: newX, y: 0 },
      orientation: 'horizontal',
      enabled: true,
      keystone: { tl: [0, 0], tr: [0, 0], br: [0, 0], bl: [0, 0] },
      warpMesh: createDefaultWarpMesh(3, 3, width, height),
      gamma: 2.2,
      blackLevelLift: 0.04
    };

    const newLampRecord: LampHourRecord = {
      projectorId: newProj.id,
      initialHours: 0,
      currentHours: 0,
      warningThresholdHours: 2000,
      maxRatedHours: 3000,
      lastResetDate: new Date().toISOString().substring(0, 10),
      entries: []
    };

    const updatedProjectors = [...rig.projectors, newProj];
    recalculateCanvas(updatedProjectors);
    setRig((prev) => ({
      ...prev,
      lampHours: [...prev.lampHours, newLampRecord]
    }));
    setSelectedProjectId(newProj.id);
    showToast(`Added Projector ${nextIdx} to Rig`);
  };

  // Remove Projector
  const handleRemoveProjector = (id: string) => {
    if (rig.projectors.length <= 1) {
      showToast('Cannot remove last remaining projector in rig');
      return;
    }
    const updated = rig.projectors.filter((p) => p.id !== id);
    const updatedLamps = rig.lampHours.filter((l) => l.projectorId !== id);
    recalculateCanvas(updated);
    setRig((prev) => ({ ...prev, lampHours: updatedLamps }));
    showToast('Removed projector from rig');
  };

  // Save to LocalStorage
  const handleSaveRig = () => {
    saveRigDocument(rig);
    setHasUnsavedChanges(false);
    showToast('Projector Rig configuration saved successfully');
  };

  // Export .mpsrig File
  const handleExport = () => {
    downloadMpsRigFile(rig);
    showToast(`Exported "${rig.name}.mpsrig"`);
  };

  // Import .mpsrig File
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const imported = importMpsRigJson(text);
        setRig(imported);
        setHasUnsavedChanges(true);
        showToast(`Imported rig: "${imported.name}" with ${imported.projectors.length} projectors`);
      } catch (err: any) {
        showToast(`Failed to import .mpsrig: ${err.message || 'Invalid format'}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // -------------------------------------------------------------
  // TAB 2: LIVE EDGE BLEND CURVE GRAPH & VISUAL PREVIEW RENDERER
  // -------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'curves' || !activeBlendZone) return;

    // 1. Render Mathematical Graph
    const canvas = curveCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const padLeft = 40;
        const padRight = 20;
        const padTop = 20;
        const padBottom = 30;
        const plotW = w - padLeft - padRight;
        const plotH = h - padTop - padBottom;

        // Background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);

        // Grid lines
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
          const y = padTop + (plotH * i) / 4;
          ctx.beginPath();
          ctx.moveTo(padLeft, y);
          ctx.lineTo(w - padRight, y);
          ctx.stroke();

          // Y Axis Labels
          ctx.fillStyle = '#64748b';
          ctx.font = '10px monospace';
          ctx.textAlign = 'right';
          ctx.fillText((1 - i * 0.25).toFixed(2), padLeft - 6, y + 3);
        }

        // X Grid & Labels
        for (let i = 0; i <= 4; i++) {
          const x = padLeft + (plotW * i) / 4;
          ctx.beginPath();
          ctx.moveTo(x, padTop);
          ctx.lineTo(x, h - padBottom);
          ctx.stroke();

          ctx.fillStyle = '#64748b';
          ctx.font = '10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${i * 25}%`, x, h - padBottom + 14);
        }

        const { rampType, gamma, blackLevelLift } = activeBlendZone;

        // Plot Total Summation Curve (Dashed White Line)
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let px = 0; px <= plotW; px += 2) {
          const t = px / plotW;
          const wA = 1 - computeBlendWeight(t, rampType, gamma);
          const wB = computeBlendWeight(t, rampType, gamma);
          const sum = wA + wB; // Normalized sum
          const y = padTop + (1 - sum) * plotH;
          if (px === 0) ctx.moveTo(padLeft + px, y);
          else ctx.lineTo(padLeft + px, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Plot Black Level Compensation (Amber Dotted Line)
        ctx.setLineDash([2, 3]);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let px = 0; px <= plotW; px += 2) {
          const t = px / plotW;
          const comp = computeBlackLevelCompensation(t, blackLevelLift, rampType, gamma);
          const y = padTop + (1 - comp) * plotH;
          if (px === 0) ctx.moveTo(padLeft + px, y);
          else ctx.lineTo(padLeft + px, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Plot Projector A Falloff (Cyan / Green Gradient)
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let px = 0; px <= plotW; px += 2) {
          const t = px / plotW;
          const weightA = 1 - computeBlendWeight(t, rampType, gamma);
          const y = padTop + (1 - weightA) * plotH;
          if (px === 0) ctx.moveTo(padLeft + px, y);
          else ctx.lineTo(padLeft + px, y);
        }
        ctx.stroke();

        // Plot Projector B Ramp-Up (Blue / Violet Curve)
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let px = 0; px <= plotW; px += 2) {
          const t = px / plotW;
          const weightB = computeBlendWeight(t, rampType, gamma);
          const y = padTop + (1 - weightB) * plotH;
          if (px === 0) ctx.moveTo(padLeft + px, y);
          else ctx.lineTo(padLeft + px, y);
        }
        ctx.stroke();
      }
    }

    // 2. Render Gradient Simulation Strip
    const gradCanvas = blendGradientCanvasRef.current;
    if (gradCanvas) {
      const gctx = gradCanvas.getContext('2d');
      if (gctx) {
        const gw = gradCanvas.width;
        const gh = gradCanvas.height;
        const { rampType, gamma, blackLevelLift } = activeBlendZone;

        const imgData = gctx.createImageData(gw, gh);
        const data = imgData.data;

        for (let x = 0; x < gw; x++) {
          const t = x / gw;
          const wA = 1 - computeBlendWeight(t, rampType, gamma);
          const wB = computeBlendWeight(t, rampType, gamma);
          const comp = computeBlackLevelCompensation(t, blackLevelLift, rampType, gamma);

          // Simulate combined light intensity
          const totalLight = Math.min(1.0, wA + wB + comp * 0.5);
          const grayVal = Math.round(totalLight * 255);

          for (let y = 0; y < gh; y++) {
            const idx = (y * gw + x) * 4;
            data[idx] = grayVal;     // R
            data[idx + 1] = grayVal; // G
            data[idx + 2] = grayVal; // B
            data[idx + 3] = 255;     // Alpha
          }
        }
        gctx.putImageData(imgData, 0, 0);
      }
    }
  }, [activeTab, activeBlendZone]);

  // -------------------------------------------------------------
  // TAB 3: KEYSTONE & 3X3 WARP MESH DRAG & NUDGE STATE
  // -------------------------------------------------------------
  const [selectedMeshPoint, setSelectedMeshPoint] = useState<{ row: number; col: number } | null>(null);

  const handleCornerKeystoneChange = (corner: 'tl' | 'tr' | 'br' | 'bl', axis: 0 | 1, val: number) => {
    if (!activeProjector) return;
    const current = { ...activeProjector.keystone };
    const pair: [number, number] = [...current[corner]];
    pair[axis] = val;
    current[corner] = pair;
    updateProjector(activeProjector.id, { keystone: current });
  };

  const handleResetKeystone = () => {
    if (!activeProjector) return;
    updateProjector(activeProjector.id, {
      keystone: { tl: [0, 0], tr: [0, 0], br: [0, 0], bl: [0, 0] }
    });
    showToast(`Reset keystone for ${activeProjector.name}`);
  };

  const handleResetWarpMesh = () => {
    if (!activeProjector) return;
    const defaultMesh = createDefaultWarpMesh(
      3,
      3,
      activeProjector.resolution.width,
      activeProjector.resolution.height
    );
    updateProjector(activeProjector.id, { warpMesh: defaultMesh });
    showToast(`Reset 3x3 warp mesh for ${activeProjector.name}`);
  };

  const handleMeshPointNudge = (dx: number, dy: number) => {
    if (!activeProjector || !selectedMeshPoint) return;
    const mesh = activeProjector.warpMesh.map((pt) => {
      if (pt.row === selectedMeshPoint.row && pt.col === selectedMeshPoint.col) {
        return { ...pt, x: pt.x + dx, y: pt.y + dy };
      }
      return pt;
    });
    updateProjector(activeProjector.id, { warpMesh: mesh });
  };

  // -------------------------------------------------------------
  // TAB 4: LAMP HOUR LEDGER ACTIONS
  // -------------------------------------------------------------
  const [sessionMinutesInput, setSessionMinutesInput] = useState<number>(120);
  const [sessionNoteInput, setSessionNoteInput] = useState<string>('Live Show Performance');

  const activeLampRecord = useMemo(() => {
    if (!activeProjector) return null;
    return rig.lampHours.find((l) => l.projectorId === activeProjector.id) || null;
  }, [rig.lampHours, activeProjector]);

  const handleLogLampSession = () => {
    if (!activeProjector || !activeLampRecord) return;
    const updated = recordLampSession(activeLampRecord, sessionMinutesInput, sessionNoteInput);
    setRig((prev) => ({
      ...prev,
      lampHours: prev.lampHours.map((l) => (l.projectorId === activeProjector.id ? updated : l))
    }));
    setHasUnsavedChanges(true);
    showToast(`Logged ${(sessionMinutesInput / 60).toFixed(1)} hrs to ${activeProjector.name}`);
  };

  const handleResetLamp = () => {
    if (!activeProjector || !activeLampRecord) return;
    if (!window.confirm(`Reset lamp hours counter for "${activeProjector.name}"? Only do this after physically replacing the lamp or laser engine.`)) {
      return;
    }
    const updated = resetProjectorLampHours(activeLampRecord);
    setRig((prev) => ({
      ...prev,
      lampHours: prev.lampHours.map((l) => (l.projectorId === activeProjector.id ? updated : l))
    }));
    setHasUnsavedChanges(true);
    showToast(`Lamp hours counter reset to 0 for ${activeProjector.name}`);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-hidden animate-fadeIn">
      {/* Hidden File Input for .mpsrig Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".mpsrig,.json"
        className="hidden"
      />

      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl flex flex-col w-full max-w-6xl max-h-[92vh] text-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-100">
                  Multi-Projector Rig & Edge Blending Studio
                </h2>
                <span className="text-xs px-2 py-0.5 rounded font-mono bg-cyan-900/40 text-cyan-300 border border-cyan-700/50">
                  .mpsrig v1.0
                </span>
                {hasUnsavedChanges && (
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Unsaved Changes
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Display canvas arrangement, mathematical edge-blend falloff curves, keystone warp, and lamp hours maintenance ledger.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleImportClick}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition"
              title="Import .mpsrig JSON"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import .mpsrig</span>
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition"
              title="Export .mpsrig JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export .mpsrig</span>
            </button>
            <button
              onClick={handleSaveRig}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Rig Profile</span>
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition ml-2"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-6 border-b border-gray-800 bg-gray-950/40">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('arrangement')}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition ${
                activeTab === 'arrangement'
                  ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>Canvas Arrangement</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-gray-800 text-gray-300">
                {rig.projectors.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('curves')}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition ${
                activeTab === 'curves'
                  ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Edge Blend Curve Studio</span>
            </button>
            <button
              onClick={() => setActiveTab('warp')}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition ${
                activeTab === 'warp'
                  ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
              }`}
            >
              <Grid className="w-4 h-4" />
              <span>Keystone & 3x3 Warp</span>
            </button>
            <button
              onClick={() => setActiveTab('lampHours')}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition ${
                activeTab === 'lampHours'
                  ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Lamp Hours Ledger</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>
              Canvas: <strong className="text-gray-200">{rig.totalCanvasWidth} × {rig.totalCanvasHeight}</strong>
            </span>
            <span className="text-gray-600">|</span>
            <span>
              Aspect: <strong className="text-gray-200">{(rig.totalCanvasWidth / rig.totalCanvasHeight).toFixed(2)}:1</strong>
            </span>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-950/20">
          {/* TAB 1: CANVAS ARRANGEMENT */}
          {activeTab === 'arrangement' && (
            <div className="space-y-6">
              {/* Presets and Global Canvas Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-gray-800/40 border border-gray-700/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-400">Quick Topology Presets:</span>
                  <button
                    onClick={() => handleLoadPreset('dual-1080p')}
                    className="px-2.5 py-1 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 text-cyan-400 border border-gray-700 transition"
                  >
                    Dual 1080p (15% Overlap)
                  </button>
                  <button
                    onClick={() => handleLoadPreset('triple-1080p')}
                    className="px-2.5 py-1 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 text-cyan-400 border border-gray-700 transition"
                  >
                    Triple 1080p Panoramic
                  </button>
                  <button
                    onClick={() => handleLoadPreset('dual-4k')}
                    className="px-2.5 py-1 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 text-cyan-400 border border-gray-700 transition"
                  >
                    Dual 4K UHD (12% Overlap)
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddProjector}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Projector</span>
                  </button>
                </div>
              </div>

              {/* Visual Multi-Projector Canvas Overview */}
              <div className="p-5 rounded-xl bg-gray-900 border border-gray-800 space-y-3">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-cyan-400" />
                    <span className="font-semibold text-gray-200">Virtual Output Stage Preview</span>
                  </div>
                  <span>
                    Overlap zones are shaded with blend falloff hashes
                  </span>
                </div>

                {/* SVG Canvas Schematic */}
                <div className="relative w-full h-56 bg-gray-950 border border-gray-800/80 rounded-lg overflow-hidden flex items-center justify-center p-4">
                  <svg
                    viewBox={`0 0 ${rig.totalCanvasWidth} ${rig.totalCanvasHeight}`}
                    className="w-full h-full max-h-48 drop-shadow-md"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <defs>
                      <pattern id="blendHash" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                        <rect width="8" height="16" fill="#0891b2" fillOpacity="0.18" />
                        <rect x="8" width="8" height="16" fill="#0e7490" fillOpacity="0.08" />
                        <line x1="0" y1="0" x2="0" y2="16" stroke="#22d3ee" strokeWidth="1" strokeOpacity="0.3" />
                      </pattern>
                    </defs>

                    {/* Total Canvas Bounds */}
                    <rect
                      x="0"
                      y="0"
                      width={rig.totalCanvasWidth}
                      height={rig.totalCanvasHeight}
                      fill="#020617"
                      stroke="#334155"
                      strokeWidth="4"
                    />

                    {/* Individual Projector Rectangles */}
                    {rig.projectors.map((p, idx) => {
                      const isSelected = p.id === selectedProjectId;
                      return (
                        <g key={p.id}>
                          <rect
                            x={p.position.x}
                            y={p.position.y}
                            width={p.resolution.width}
                            height={p.resolution.height}
                            fill={isSelected ? '#0369a1' : '#1e293b'}
                            fillOpacity={p.enabled ? (isSelected ? '0.35' : '0.2') : '0.05'}
                            stroke={isSelected ? '#38bdf8' : '#475569'}
                            strokeWidth="3"
                            strokeDasharray={p.enabled ? 'none' : '8 6'}
                          />
                          <text
                            x={p.position.x + p.resolution.width / 2}
                            y={p.position.y + p.resolution.height / 2 - 20}
                            fill={isSelected ? '#7dd3fc' : '#94a3b8'}
                            fontSize="64"
                            fontWeight="bold"
                            textAnchor="middle"
                            fontFamily="sans-serif"
                          >
                            {p.name}
                          </text>
                          <text
                            x={p.position.x + p.resolution.width / 2}
                            y={p.position.y + p.resolution.height / 2 + 50}
                            fill="#64748b"
                            fontSize="44"
                            textAnchor="middle"
                            fontFamily="monospace"
                          >
                            Display #{p.displayIndex} • {p.resolution.width}×{p.resolution.height}
                          </text>
                        </g>
                      );
                    })}

                    {/* Shaded Edge Blend Overlap Zones */}
                    {rig.edgeBlends.map((b) => {
                      const pA = rig.projectors.find((p) => p.id === b.projectorAId);
                      const pB = rig.projectors.find((p) => p.id === b.projectorBId);
                      if (!pA || !pB || !pA.enabled || !pB.enabled) return null;

                      const overlapX = pB.position.x;
                      const overlapW = (pA.position.x + pA.resolution.width) - pB.position.x;
                      if (overlapW <= 0) return null;

                      return (
                        <g key={b.id}>
                          <rect
                            x={overlapX}
                            y={Math.min(pA.position.y, pB.position.y)}
                            width={overlapW}
                            height={Math.max(pA.resolution.height, pB.resolution.height)}
                            fill="url(#blendHash)"
                            stroke="#06b6d4"
                            strokeWidth="2"
                            strokeDasharray="4 4"
                          />
                          <text
                            x={overlapX + overlapW / 2}
                            y={pA.resolution.height - 60}
                            fill="#22d3ee"
                            fontSize="48"
                            fontWeight="bold"
                            textAnchor="middle"
                            fontFamily="monospace"
                          >
                            BLEND: {(b.overlapFraction * 100).toFixed(1)}% ({overlapW}px)
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Projectors Configuration Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rig.projectors.map((p, idx) => {
                  const isSelected = p.id === selectedProjectId;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProjectId(p.id)}
                      className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-gray-800/80 border-cyan-500 shadow-md ring-1 ring-cyan-500/30'
                          : 'bg-gray-800/30 border-gray-700/60 hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-cyan-900/60 text-cyan-300 font-mono text-xs flex items-center justify-center font-bold">
                              {idx + 1}
                            </span>
                            <input
                              type="text"
                              value={p.name}
                              onChange={(e) => updateProjector(p.id, { name: e.target.value })}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-transparent font-semibold text-sm text-gray-100 hover:bg-gray-700/50 focus:bg-gray-900 px-1 py-0.5 rounded border border-transparent focus:border-cyan-500 outline-none w-40"
                            />
                          </div>

                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={p.enabled}
                                onChange={(e) => updateProjector(p.id, { enabled: e.target.checked })}
                                className="rounded bg-gray-900 border-gray-700 text-cyan-500 focus:ring-0"
                              />
                              <span>Active</span>
                            </label>
                            {rig.projectors.length > 1 && (
                              <button
                                onClick={() => handleRemoveProjector(p.id)}
                                className="p-1 text-gray-500 hover:text-red-400 rounded transition ml-1"
                                title="Remove Projector"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Resolution & Display */}
                        <div className="grid grid-cols-2 gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
                          <div>
                            <label className="text-gray-400 block mb-1">Preset Res</label>
                            <select
                              value={`${p.resolution.width}x${p.resolution.height}`}
                              onChange={(e) => {
                                const [w, h] = e.target.value.split('x').map(Number);
                                if (w && h) {
                                  updateProjector(p.id, { resolution: { width: w, height: h } });
                                }
                              }}
                              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-200 outline-none focus:border-cyan-500"
                            >
                              {STANDARD_RESOLUTIONS.map((res) => (
                                <option key={res.label} value={`${res.width}x${res.height}`}>
                                  {res.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-gray-400 block mb-1">Display Index</label>
                            <input
                              type="number"
                              min={1}
                              max={8}
                              value={p.displayIndex}
                              onChange={(e) => updateProjector(p.id, { displayIndex: parseInt(e.target.value) || 1 })}
                              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-200 outline-none focus:border-cyan-500"
                            />
                          </div>
                        </div>

                        {/* Position X & Y Coordinates */}
                        <div className="grid grid-cols-2 gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
                          <div>
                            <label className="text-gray-400 block mb-1">X Offset (px)</label>
                            <input
                              type="number"
                              value={p.position.x}
                              onChange={(e) => updateProjector(p.id, { position: { ...p.position, x: parseInt(e.target.value) || 0 } })}
                              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-200 outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-gray-400 block mb-1">Y Offset (px)</label>
                            <input
                              type="number"
                              value={p.position.y}
                              onChange={(e) => updateProjector(p.id, { position: { ...p.position, y: parseInt(e.target.value) || 0 } })}
                              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-200 outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-700/50 flex items-center justify-between text-[11px] text-gray-400">
                        <span>Gamma: {p.gamma.toFixed(1)}</span>
                        <span>Black Lift: {(p.blackLevelLift * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: EDGE BLEND CURVE STUDIO */}
          {activeTab === 'curves' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Blend Zone Controls */}
              <div className="lg:col-span-5 space-y-5 bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-semibold text-gray-100">Blend Parameter Controls</h3>
                  </div>
                  {rig.edgeBlends.length > 1 && (
                    <select
                      value={selectedBlendId}
                      onChange={(e) => setSelectedBlendId(e.target.value)}
                      className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 outline-none focus:border-cyan-500"
                    >
                      {rig.edgeBlends.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.id}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {activeBlendZone ? (
                  <div className="space-y-4 text-xs">
                    {/* Overlap Width / Fraction */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-gray-300 font-medium">Overlap Width / Fraction</span>
                        <span className="font-mono text-cyan-400 font-bold">
                          {(activeBlendZone.overlapFraction * 100).toFixed(1)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.05}
                        max={0.40}
                        step={0.005}
                        value={activeBlendZone.overlapFraction}
                        onChange={(e) => {
                          const frac = parseFloat(e.target.value);
                          updateBlendZone(activeBlendZone.id, { overlapFraction: frac });
                          // Adjust adjacent projector X offset accordingly
                          const pA = rig.projectors.find((p) => p.id === activeBlendZone.projectorAId);
                          const pB = rig.projectors.find((p) => p.id === activeBlendZone.projectorBId);
                          if (pA && pB) {
                            const overlapPx = Math.round(pA.resolution.width * frac);
                            updateProjector(pB.id, {
                              position: { ...pB.position, x: pA.position.x + pA.resolution.width - overlapPx }
                            });
                          }
                        }}
                        className="w-full accent-cyan-500"
                      />
                      <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                        <span>5% (Narrow)</span>
                        <span>15% (Standard)</span>
                        <span>40% (Wide)</span>
                      </div>
                    </div>

                    {/* Ramp Type Selector */}
                    <div>
                      <label className="text-gray-300 font-medium block mb-2">Mathematical Falloff Curve</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['linear', 'cosine', 'smoothstep', 'power'] as BlendRampType[]).map((type) => (
                          <button
                            key={type}
                            onClick={() => updateBlendZone(activeBlendZone.id, { rampType: type })}
                            className={`px-3 py-2 rounded-lg border text-left font-mono capitalize transition ${
                              activeBlendZone.rampType === type
                                ? 'bg-cyan-500/10 border-cyan-500 text-cyan-300 font-bold'
                                : 'bg-gray-800/40 border-gray-700/60 text-gray-400 hover:text-gray-200'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Gamma Exponent */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-gray-300 font-medium">Gamma Correction</span>
                        <span className="font-mono text-cyan-400 font-bold">
                          γ = {activeBlendZone.gamma.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1.0}
                        max={3.5}
                        step={0.05}
                        value={activeBlendZone.gamma}
                        onChange={(e) => updateBlendZone(activeBlendZone.id, { gamma: parseFloat(e.target.value) })}
                        className="w-full accent-cyan-500"
                      />
                      <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                        <span>1.0 (Linear)</span>
                        <span>2.2 (sRGB / DCI)</span>
                        <span>3.5 (High Contrast)</span>
                      </div>
                    </div>

                    {/* Black Level Lift Compensation */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-gray-300 font-medium">Black Level Lift (Floor Compensation)</span>
                        <span className="font-mono text-amber-400 font-bold">
                          {(activeBlendZone.blackLevelLift * 100).toFixed(1)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.0}
                        max={0.20}
                        step={0.005}
                        value={activeBlendZone.blackLevelLift}
                        onChange={(e) => updateBlendZone(activeBlendZone.id, { blackLevelLift: parseFloat(e.target.value) })}
                        className="w-full accent-amber-500"
                      />
                      <p className="text-[11px] text-gray-400 mt-1">
                        Compensates for DLP/LCD black leakage in non-overlap regions to prevent bright overlap seams during dark scenes.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-gray-500">
                    No active edge blend zones detected. Check projector positions.
                  </div>
                )}
              </div>

              {/* Right Column: Live Mathematical Curve Graph & Visual Gradient */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-100">Live Mathematical Falloff Curves</h3>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                        Proj A Falloff
                      </span>
                      <span className="flex items-center gap-1 text-indigo-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                        Proj B Ramp
                      </span>
                      <span className="flex items-center gap-1 text-slate-300">
                        <span className="w-2.5 h-0.5 bg-slate-400 inline-block" />
                        Summation (1.0)
                      </span>
                      <span className="flex items-center gap-1 text-amber-400">
                        <span className="w-2.5 h-0.5 bg-amber-400 inline-block" />
                        Black Lift
                      </span>
                    </div>
                  </div>

                  {/* Canvas2D Graph */}
                  <div className="relative rounded-lg overflow-hidden border border-gray-800">
                    <canvas
                      ref={curveCanvasRef}
                      width={640}
                      height={260}
                      className="w-full h-56 bg-slate-950 block"
                    />
                  </div>

                  {/* Gradient Simulation Strip */}
                  <div>
                    <div className="flex justify-between items-center mb-1 text-xs text-gray-400">
                      <span>Simulated Optical Luminance in Blend Band</span>
                      <span className="text-[10px] text-gray-500">Continuous 0% → 100% Transition</span>
                    </div>
                    <canvas
                      ref={blendGradientCanvasRef}
                      width={640}
                      height={32}
                      className="w-full h-8 rounded border border-gray-800 block"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: KEYSTONE & 3X3 WARP */}
          {activeTab === 'warp' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Projector Selection & Keystone Handles */}
              <div className="lg:col-span-5 space-y-5 bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                  <div className="flex items-center gap-2">
                    <Grid className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-semibold text-gray-100">Keystone & Warp Control</h3>
                  </div>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 outline-none focus:border-cyan-500"
                  >
                    {rig.projectors.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {activeProjector && (
                  <div className="space-y-4 text-xs">
                    {/* 4-Corner Keystone Offsets */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-300 font-medium">Corner Keystone Offsets (px)</span>
                        <button
                          onClick={handleResetKeystone}
                          className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset Keystone</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Top Left */}
                        <div className="p-2.5 rounded bg-gray-800/50 border border-gray-700">
                          <span className="font-semibold text-gray-300 block mb-1">Top-Left</span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">X:</span>
                            <input
                              type="number"
                              value={activeProjector.keystone.tl[0]}
                              onChange={(e) => handleCornerKeystoneChange('tl', 0, parseInt(e.target.value) || 0)}
                              className="w-16 bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5 font-mono text-xs"
                            />
                            <span className="text-gray-500">Y:</span>
                            <input
                              type="number"
                              value={activeProjector.keystone.tl[1]}
                              onChange={(e) => handleCornerKeystoneChange('tl', 1, parseInt(e.target.value) || 0)}
                              className="w-16 bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5 font-mono text-xs"
                            />
                          </div>
                        </div>

                        {/* Top Right */}
                        <div className="p-2.5 rounded bg-gray-800/50 border border-gray-700">
                          <span className="font-semibold text-gray-300 block mb-1">Top-Right</span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">X:</span>
                            <input
                              type="number"
                              value={activeProjector.keystone.tr[0]}
                              onChange={(e) => handleCornerKeystoneChange('tr', 0, parseInt(e.target.value) || 0)}
                              className="w-16 bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5 font-mono text-xs"
                            />
                            <span className="text-gray-500">Y:</span>
                            <input
                              type="number"
                              value={activeProjector.keystone.tr[1]}
                              onChange={(e) => handleCornerKeystoneChange('tr', 1, parseInt(e.target.value) || 0)}
                              className="w-16 bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5 font-mono text-xs"
                            />
                          </div>
                        </div>

                        {/* Bottom Left */}
                        <div className="p-2.5 rounded bg-gray-800/50 border border-gray-700">
                          <span className="font-semibold text-gray-300 block mb-1">Bottom-Left</span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">X:</span>
                            <input
                              type="number"
                              value={activeProjector.keystone.bl[0]}
                              onChange={(e) => handleCornerKeystoneChange('bl', 0, parseInt(e.target.value) || 0)}
                              className="w-16 bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5 font-mono text-xs"
                            />
                            <span className="text-gray-500">Y:</span>
                            <input
                              type="number"
                              value={activeProjector.keystone.bl[1]}
                              onChange={(e) => handleCornerKeystoneChange('bl', 1, parseInt(e.target.value) || 0)}
                              className="w-16 bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5 font-mono text-xs"
                            />
                          </div>
                        </div>

                        {/* Bottom Right */}
                        <div className="p-2.5 rounded bg-gray-800/50 border border-gray-700">
                          <span className="font-semibold text-gray-300 block mb-1">Bottom-Right</span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">X:</span>
                            <input
                              type="number"
                              value={activeProjector.keystone.br[0]}
                              onChange={(e) => handleCornerKeystoneChange('br', 0, parseInt(e.target.value) || 0)}
                              className="w-16 bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5 font-mono text-xs"
                            />
                            <span className="text-gray-500">Y:</span>
                            <input
                              type="number"
                              value={activeProjector.keystone.br[1]}
                              onChange={(e) => handleCornerKeystoneChange('br', 1, parseInt(e.target.value) || 0)}
                              className="w-16 bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5 font-mono text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3x3 Warp Mesh Grid Nudge Controls */}
                    <div className="pt-3 border-t border-gray-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-300 font-medium">3x3 Bilinear Warp Mesh</span>
                        <button
                          onClick={handleResetWarpMesh}
                          className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset 3x3 Mesh</span>
                        </button>
                      </div>

                      {selectedMeshPoint ? (
                        <div className="p-3 rounded bg-gray-800/40 border border-cyan-500/30 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-cyan-300 font-semibold">
                              Control Point [Row {selectedMeshPoint.row}, Col {selectedMeshPoint.col}]
                            </span>
                            <button
                              onClick={() => setSelectedMeshPoint(null)}
                              className="text-gray-400 hover:text-gray-200"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 max-w-[150px] mx-auto text-center">
                            <div />
                            <button
                              onClick={() => handleMeshPointNudge(0, -5)}
                              className="p-1 rounded bg-gray-700 hover:bg-gray-600 font-bold"
                            >
                              ▲
                            </button>
                            <div />
                            <button
                              onClick={() => handleMeshPointNudge(-5, 0)}
                              className="p-1 rounded bg-gray-700 hover:bg-gray-600 font-bold"
                            >
                              ◀
                            </button>
                            <div className="flex items-center justify-center font-mono text-[10px] text-gray-400">
                              ±5px
                            </div>
                            <button
                              onClick={() => handleMeshPointNudge(5, 0)}
                              className="p-1 rounded bg-gray-700 hover:bg-gray-600 font-bold"
                            >
                              ▶
                            </button>
                            <div />
                            <button
                              onClick={() => handleMeshPointNudge(0, 5)}
                              className="p-1 rounded bg-gray-700 hover:bg-gray-600 font-bold"
                            >
                              ▼
                            </button>
                            <div />
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500 italic text-[11px]">
                          Click any control node on the interactive mesh preview to select and nudge its position.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Interactive Visual 3x3 Warp Preview */}
              <div className="lg:col-span-7 bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-100">
                    Interactive Calibration Grid: {activeProjector?.name}
                  </h3>
                  <span className="text-xs text-gray-400 font-mono">
                    {activeProjector?.resolution.width} × {activeProjector?.resolution.height} px
                  </span>
                </div>

                {activeProjector && (
                  <div className="relative w-full h-80 bg-gray-950 border border-gray-800 rounded-lg overflow-hidden flex items-center justify-center p-4">
                    <svg
                      viewBox={`0 0 ${activeProjector.resolution.width} ${activeProjector.resolution.height}`}
                      className="w-full h-full max-h-72 drop-shadow-md select-none"
                    >
                      {/* Background Projector Surface */}
                      <rect
                        x="0"
                        y="0"
                        width={activeProjector.resolution.width}
                        height={activeProjector.resolution.height}
                        fill="#030712"
                        stroke="#1e293b"
                        strokeWidth="4"
                      />

                      {/* Bilinear Mesh Grid Lines */}
                      {Array.from({ length: 3 }).map((_, r) => {
                        const ptsInRow = activeProjector.warpMesh.filter((m) => m.row === r).sort((a, b) => a.col - b.col);
                        if (ptsInRow.length < 2) return null;
                        const d = ptsInRow.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                        return <path key={`row-${r}`} d={d} stroke="#0ea5e9" strokeWidth="3" fill="none" opacity="0.6" />;
                      })}

                      {Array.from({ length: 3 }).map((_, c) => {
                        const ptsInCol = activeProjector.warpMesh.filter((m) => m.col === c).sort((a, b) => a.row - a.row);
                        if (ptsInCol.length < 2) return null;
                        const d = ptsInCol.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                        return <path key={`col-${c}`} d={d} stroke="#0ea5e9" strokeWidth="3" fill="none" opacity="0.6" />;
                      })}

                      {/* Control Nodes */}
                      {activeProjector.warpMesh.map((pt) => {
                        const isSelected = selectedMeshPoint?.row === pt.row && selectedMeshPoint?.col === pt.col;
                        return (
                          <g
                            key={`node-${pt.row}-${pt.col}`}
                            onClick={() => setSelectedMeshPoint({ row: pt.row, col: pt.col })}
                            className="cursor-pointer"
                          >
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={isSelected ? 32 : 22}
                              fill={isSelected ? '#38bdf8' : '#0284c7'}
                              stroke="#ffffff"
                              strokeWidth={isSelected ? 6 : 3}
                              className="transition-all hover:scale-125"
                            />
                            <text
                              x={pt.x}
                              y={pt.y + 8}
                              fill="#ffffff"
                              fontSize="22"
                              fontWeight="bold"
                              textAnchor="middle"
                              fontFamily="sans-serif"
                            >
                              {pt.row},{pt.col}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: LAMP HOURS LEDGER */}
          {activeTab === 'lampHours' && (
            <div className="space-y-6">
              {/* Projectors Lamp Gauges Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rig.projectors.map((p) => {
                  const record = rig.lampHours.find((l) => l.projectorId === p.id) || {
                    projectorId: p.id,
                    initialHours: 0,
                    currentHours: 0,
                    warningThresholdHours: 2000,
                    maxRatedHours: 3000,
                    lastResetDate: 'N/A',
                    entries: []
                  };

                  const pct = Math.min(100, (record.currentHours / record.maxRatedHours) * 100);
                  const isWarning = record.currentHours >= record.warningThresholdHours && record.currentHours < record.maxRatedHours;
                  const isDanger = record.currentHours >= record.maxRatedHours;

                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProjectId(p.id)}
                      className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                        selectedProjectId === p.id
                          ? 'bg-gray-800/80 border-cyan-500 shadow-md ring-1 ring-cyan-500/30'
                          : 'bg-gray-800/30 border-gray-700/60 hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm text-gray-100">{p.name}</h4>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              isDanger
                                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                : isWarning
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {isDanger ? 'REPLACE LAMP' : isWarning ? 'WARNING' : 'HEALTHY'}
                          </span>
                        </div>

                        {/* Hours Gauge Bar */}
                        <div>
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="text-2xl font-bold font-mono text-gray-100">
                              {record.currentHours.toFixed(1)}{' '}
                              <span className="text-xs text-gray-400 font-normal">/ {record.maxRatedHours} hrs</span>
                            </span>
                            <span className="text-xs font-mono text-gray-400">{pct.toFixed(0)}%</span>
                          </div>
                          <div className="w-full h-2.5 rounded-full bg-gray-950 overflow-hidden border border-gray-800">
                            <div
                              className={`h-full transition-all duration-300 ${
                                isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-cyan-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                            <span>0 hrs</span>
                            <span>Warning: {record.warningThresholdHours} hrs</span>
                            <span>Max: {record.maxRatedHours} hrs</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-700/50 text-[11px] text-gray-400 space-y-1">
                          <div className="flex justify-between">
                            <span>Last Reset Date:</span>
                            <span className="font-mono text-gray-300">{record.lastResetDate}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Logged Sessions:</span>
                            <span className="font-mono text-gray-300">{record.entries.length}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Maintenance Actions & Ledger Table */}
              {activeProjector && activeLampRecord && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-gray-800">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-sm font-semibold text-gray-100">
                        Maintenance Actions & Session Ledger: {activeProjector.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 bg-gray-800/80 px-2.5 py-1 rounded-lg border border-gray-700 text-xs">
                        <span className="text-gray-400">Add Session (mins):</span>
                        <input
                          type="number"
                          min={15}
                          step={15}
                          value={sessionMinutesInput}
                          onChange={(e) => setSessionMinutesInput(parseInt(e.target.value) || 60)}
                          className="w-16 bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5 text-center font-mono text-cyan-400"
                        />
                        <input
                          type="text"
                          value={sessionNoteInput}
                          onChange={(e) => setSessionNoteInput(e.target.value)}
                          placeholder="Session note..."
                          className="w-44 bg-gray-900 border border-gray-700 rounded px-2 py-0.5 text-xs text-gray-200 outline-none"
                        />
                        <button
                          onClick={handleLogLampSession}
                          className="px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition"
                        >
                          Log Run
                        </button>
                      </div>

                      <button
                        onClick={handleResetLamp}
                        className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-700/50 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Counter (New Lamp)</span>
                      </button>
                    </div>
                  </div>

                  {/* Sessions Ledger Table */}
                  <div className="overflow-x-auto">
                    {activeLampRecord.entries.length > 0 ? (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-gray-800 text-gray-400 font-medium">
                            <th className="py-2 px-3">Date / Timestamp</th>
                            <th className="py-2 px-3">Session Duration</th>
                            <th className="py-2 px-3">Notes & Operational Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                          {activeLampRecord.entries.map((entry, idx) => (
                            <tr key={idx} className="hover:bg-gray-800/30">
                              <td className="py-2 px-3 font-mono text-gray-300">{entry.timestamp}</td>
                              <td className="py-2 px-3 font-mono text-cyan-400 font-medium">
                                {entry.sessionMinutes} mins ({(entry.sessionMinutes / 60).toFixed(2)} hrs)
                              </td>
                              <td className="py-2 px-3 text-gray-300">{entry.note}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="py-6 text-center text-xs text-gray-500">
                        No previous run logs recorded for this projector.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Summary Bar */}
        <div className="px-6 py-3 border-t border-gray-800 bg-gray-900/90 flex flex-wrap items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Rig Topology: <strong>{rig.name}</strong></span>
            </span>
            <span className="text-gray-600">|</span>
            <span>
              Active Projectors: <strong className="text-gray-200">{rig.projectors.filter((p) => p.enabled).length}</strong>
            </span>
            <span className="text-gray-600">|</span>
            <span>
              Edge Blends: <strong className="text-gray-200">{rig.edgeBlends.length} Zone(s)</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition"
            >
              Close
            </button>
            <button
              onClick={handleSaveRig}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-sm transition"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
