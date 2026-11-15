import React, { useState, useEffect, useMemo } from 'react';
import { X, History, RotateCcw, GitBranch, Check, Clock, Layers, ArrowLeftRight } from 'lucide-react';
import { useProjectionStore } from '../../store/useProjectionStore';
import {
  getStoredSnapshots,
  recordProjectSnapshot,
  computeStateDiff,
  ProjectSnapshot,
} from '../../utils/projectTimeMachine';

export const ProjectTimeMachineModal: React.FC = () => {
  const { isProjectTimeMachineModalOpen, setIsProjectTimeMachineModalOpen, activeProjectName, activeScreen, showToast } =
    useProjectionStore();

  const [snapshots, setSnapshots] = useState<ProjectSnapshot[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>('');
  const [restoredSuccess, setRestoredSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (!isProjectTimeMachineModalOpen) return;
    let list = getStoredSnapshots();
    if (list.length === 0) {
      // Record initial live state snapshot
      const snap = recordProjectSnapshot('Initial Baseline Checkpoint', activeScreen, useProjectionStore.getState());
      list = [snap];
    }
    setSnapshots(list);
    setSelectedSnapshotId(list[0].id);
  }, [isProjectTimeMachineModalOpen, activeScreen]);

  const activeSnap = useMemo(
    () => snapshots.find((s) => s.id === selectedSnapshotId) || snapshots[0],
    [snapshots, selectedSnapshotId]
  );

  const diffSummary = useMemo(() => {
    if (!activeSnap) return null;
    const currentJson = JSON.stringify(useProjectionStore.getState());
    return computeStateDiff(activeSnap.stateJson, currentJson);
  }, [activeSnap]);

  if (!isProjectTimeMachineModalOpen) return null;

  const handleRestore = () => {
    if (!activeSnap) return;
    try {
      const parsed = JSON.parse(activeSnap.stateJson);
      // Restore key slices
      if (parsed.layers) useProjectionStore.setState({ layers: parsed.layers });
      if (parsed.projectors) useProjectionStore.setState({ projectors: parsed.projectors });
      if (parsed.beatFlags) useProjectionStore.setState({ beatFlags: parsed.beatFlags });

      setRestoredSuccess(true);
      showToast?.(`Restored project checkpoint: "${activeSnap.label}"`);
      setTimeout(() => {
        setRestoredSuccess(false);
        setIsProjectTimeMachineModalOpen(false);
      }, 1500);
    } catch (err) {
      console.error('Failed to restore snapshot:', err);
    }
  };

  const handleCreateManualSnapshot = () => {
    const snap = recordProjectSnapshot('Manual User Milestone', activeScreen, useProjectionStore.getState());
    const updated = [snap, ...snapshots];
    setSnapshots(updated);
    setSelectedSnapshotId(snap.id);
    showToast?.('Created new Project Time Machine milestone checkpoint');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-[#0b121e] border border-[#213047] rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans select-none">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1b2638] flex items-center justify-between bg-[#0e1626]">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                Project Time-Machine & Snapshot Diff Viewer
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                IndexedDB Auto-Save History • Rollback & Branch Recovery
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsProjectTimeMachineModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2538] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 grid grid-cols-12 gap-5 overflow-y-auto max-h-[75vh] text-xs">
          {/* Snapshots Timeline (Cols 5) */}
          <div className="col-span-5 space-y-2 border-r border-[#1b2638] pr-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Timeline Checkpoints ({snapshots.length})
              </span>
              <button
                type="button"
                onClick={handleCreateManualSnapshot}
                className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase cursor-pointer"
              >
                + Save Checkpoint
              </button>
            </div>
            {snapshots.map((snap) => (
              <div
                key={snap.id}
                onClick={() => setSelectedSnapshotId(snap.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  (selectedSnapshotId || snapshots[0]?.id) === snap.id
                    ? 'bg-cyan-600/20 text-cyan-200 border-cyan-500 shadow-sm'
                    : 'bg-[#0e1624] text-slate-300 border-[#1b2638] hover:bg-[#141e2e]'
                }`}
              >
                <div className="font-bold truncate">{snap.label}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{snap.formattedTime}</div>
                <div className="text-[9px] text-cyan-400 font-mono mt-1">
                  {snap.layerCount} Masks • Screen {snap.screenId} • Run Time: {snap.runTime || '03:45'}
                </div>
              </div>
            ))}
          </div>

          {/* Visual Diff Inspector (Cols 7) */}
          <div className="col-span-7 space-y-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Side-by-Side Diff Comparison
            </div>

            <div className="p-4 rounded-xl bg-[#080d16] border border-[#1f2d42] space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                <span>Selected: {activeSnap?.label}</span>
                <span className="font-mono text-cyan-400 text-[10px]">
                  Delta: {diffSummary?.rawDiffCount || 0} changes
                </span>
              </div>

              <div className="space-y-1.5 font-mono text-[11px] text-slate-300">
                {diffSummary && diffSummary.addedLayers.length > 0 && (
                  <div className="p-2 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-900/50">
                    + Added Layers ({diffSummary.addedLayers.length}): {diffSummary.addedLayers.join(', ')}
                  </div>
                )}
                {diffSummary && diffSummary.removedLayers.length > 0 && (
                  <div className="p-2 rounded bg-rose-950/40 text-rose-300 border border-rose-900/50">
                    - Removed Layers ({diffSummary.removedLayers.length}): {diffSummary.removedLayers.join(', ')}
                  </div>
                )}
                {diffSummary && diffSummary.modifiedLayers.length > 0 && (
                  <div className="p-2 rounded bg-amber-950/40 text-amber-300 border border-amber-900/50">
                    ~ Modified Polygons ({diffSummary.modifiedLayers.length}): {diffSummary.modifiedLayers.join(', ')}
                  </div>
                )}
                {diffSummary && diffSummary.changedPrompts && (
                  <div className="p-2 rounded bg-purple-950/40 text-purple-300 border border-purple-900/50">
                    ~ AI Video Prompt updated between versions
                  </div>
                )}
                {diffSummary && diffSummary.beatFlagsDelta !== 0 && (
                  <div className="p-2 rounded bg-blue-950/40 text-blue-300 border border-blue-900/50">
                    {diffSummary.beatFlagsDelta > 0 ? '+' : ''}{diffSummary.beatFlagsDelta} Music Beat Flags
                  </div>
                )}
                {(!diffSummary || diffSummary.rawDiffCount === 0) && (
                  <div className="p-2 rounded bg-[#0f1828] text-slate-400 border border-[#1d293d]">
                    ✓ Identical to current working copy (Zero deviation)
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleRestore}
                className="flex-1 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase flex items-center justify-center gap-1.5 shadow-md shadow-cyan-900/40 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {restoredSuccess ? 'Restored Snapshot!' : 'Rollback to this Checkpoint'}
              </button>

              <button
                type="button"
                onClick={handleCreateManualSnapshot}
                className="px-3 py-2 rounded-lg bg-[#141b28] hover:bg-[#1d2638] border border-[#233248] text-slate-200 font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <GitBranch className="w-3.5 h-3.5" /> New Branch
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1b2638] bg-[#0c121e] flex justify-end">
          <button
            type="button"
            onClick={() => setIsProjectTimeMachineModalOpen(false)}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs uppercase"
          >
            Close Time Machine
          </button>
        </div>
      </div>
    </div>
  );
};
