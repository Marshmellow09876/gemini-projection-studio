import React, { useState } from 'react';
import { X, Grid, Sliders, Check, RotateCcw, Lock, Unlock, Sparkles } from 'lucide-react';
import { useProjectionStore } from '../../store/useProjectionStore';

export const BezierMeshWarpModal: React.FC = () => {
  const { isBezierMeshModalOpen, setIsBezierMeshModalOpen, customReferencePhotoUrl } =
    useProjectionStore();

  const [gridSize, setGridSize] = useState<3 | 5 | 9>(5);
  const [symmetryLocked, setSymmetryLocked] = useState<boolean>(true);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);

  if (!isBezierMeshModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-[#0b121e] border border-[#213047] rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans select-none">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1b2638] flex items-center justify-between bg-[#0e1626]">
          <div className="flex items-center gap-2.5">
            <Grid className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                Sub-Grid Bicubic Bezier Mesh Warp Editor
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {gridSize}x{gridSize} Control Grid with Tangent Handles
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Grid Size Switcher */}
            <div className="flex items-center bg-[#070b12] p-0.5 rounded-lg border border-[#1b2638]">
              {([3, 5, 9] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setGridSize(size)}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                    gridSize === size
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {size}x{size}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsBezierMeshModalOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2538] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Warp Canvas Area */}
        <div className="p-6 flex flex-col items-center justify-center bg-[#05080e] relative">
          <div className="w-full h-96 rounded-xl border border-[#1f2d42] bg-black relative overflow-hidden flex items-center justify-center shadow-inner">
            {/* Background Facade */}
            <img
              src={customReferencePhotoUrl || 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80'}
              alt="Mesh Target"
              className="w-full h-full object-cover opacity-60 pointer-events-none"
            />

            {/* Bezier Grid Matrix Overlay */}
            <svg className="absolute inset-0 w-full h-full">
              {Array.from({ length: gridSize }).map((_, r) => (
                <line
                  key={`r-${r}`}
                  x1="10%"
                  y1={`${15 + (r * 70) / (gridSize - 1)}%`}
                  x2="90%"
                  y2={`${15 + (r * 70) / (gridSize - 1)}%`}
                  stroke="#00f0ff"
                  strokeWidth="1.5"
                  opacity="0.6"
                />
              ))}

              {Array.from({ length: gridSize }).map((_, c) => (
                <line
                  key={`c-${c}`}
                  x1={`${10 + (c * 80) / (gridSize - 1)}%`}
                  y1="15%"
                  x2={`${10 + (c * 80) / (gridSize - 1)}%`}
                  y2="85%"
                  stroke="#00f0ff"
                  strokeWidth="1.5"
                  opacity="0.6"
                />
              ))}
            </svg>

            {/* Interactive Control Points */}
            {Array.from({ length: gridSize * gridSize }).map((_, i) => {
              const r = Math.floor(i / gridSize);
              const c = i % gridSize;
              const left = 10 + (c * 80) / (gridSize - 1);
              const top = 15 + (r * 70) / (gridSize - 1);
              const isSelected = selectedPointIndex === i;

              return (
                <div
                  key={i}
                  onClick={() => setSelectedPointIndex(i)}
                  className={`absolute w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full cursor-grab border-2 transition-all ${
                    isSelected
                      ? 'bg-amber-400 border-white scale-150 z-30 shadow-[0_0_12px_rgba(251,191,36,0.9)]'
                      : 'bg-cyan-500 border-black hover:scale-125 z-20'
                  }`}
                  style={{ left: `${left}%`, top: `${top}%` }}
                />
              );
            })}

            <div className="absolute bottom-3 left-3 text-[10px] font-mono text-cyan-300 bg-black/80 px-2 py-0.5 rounded border border-cyan-500/40">
              DRAG VERTICES TO WARP ARCHITECTURAL CONTOURS • SYMMETRY: {symmetryLocked ? 'LOCKED' : 'OFF'}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1b2638] bg-[#0c121e] flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSymmetryLocked(!symmetryLocked)}
              className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 font-bold uppercase ${
                symmetryLocked
                  ? 'bg-cyan-600/20 text-cyan-300 border-cyan-500'
                  : 'bg-[#101724] text-slate-400 border-[#1f2d42]'
              }`}
            >
              {symmetryLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              Bilateral Symmetry Lock
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedPointIndex(null)}
              className="px-3 py-1.5 rounded-lg bg-[#141b28] hover:bg-[#1d2638] border border-[#233248] text-slate-300 font-bold uppercase"
            >
              Reset Handles
            </button>
            <button
              type="button"
              onClick={() => setIsBezierMeshModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase flex items-center gap-1.5 shadow-md shadow-cyan-900/40"
            >
              <Check className="w-4 h-4" /> Save Mesh Warp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
