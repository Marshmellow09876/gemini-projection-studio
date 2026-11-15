import React from 'react';
import { X, Compass, Check, AlertTriangle, Sliders, Monitor } from 'lucide-react';
import { useProjectionStore } from '../../store/useProjectionStore';
import {
  POPULAR_PROJECTOR_PRESETS,
  calculateProjectorOptics,
} from '../../utils/opticsCalculator';

export const ProjectorOpticsCalculatorModal: React.FC = () => {
  const {
    isOpticsCalculatorOpen,
    setIsOpticsCalculatorOpen,
    opticsCalculator,
    setOpticsParams,
  } = useProjectionStore();

  if (!isOpticsCalculatorOpen) return null;

  const results = calculateProjectorOptics({
    throwRatio: opticsCalculator.throwRatio,
    throwDistanceFeet: opticsCalculator.distanceFeet,
    aspectRatio: opticsCalculator.aspectRatio,
    ansiLumens: opticsCalculator.ansiLumens,
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0b121e] border border-[#213047] rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans select-none">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#1b2638] flex items-center justify-between bg-[#0e1626]">
          <div className="flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-amber-400" />
            <div>
              <div className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                Projector Throw, Lens Shift & Brightness Calculator
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Optical Throw Math & Surface Foot-Lamberts
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpticsCalculatorOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2538] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh] text-xs">
          {/* Preset Selector */}
          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Projector Model Preset
            </label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {POPULAR_PROJECTOR_PRESETS.slice(0, 4).map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() =>
                    setOpticsParams({
                      projectorModel: p.model,
                      throwRatio: p.throwRatioMin,
                      ansiLumens: p.ansiLumens,
                    })
                  }
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    opticsCalculator.projectorModel === p.model
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-sm'
                      : 'bg-[#101826] text-slate-300 border-[#1f2d42] hover:bg-[#162132]'
                  }`}
                >
                  <div className="font-bold truncate">{p.model}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {p.throwRatioMin}:1 • {p.ansiLumens} Lumens
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Sliders */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Throw Ratio</label>
                <span className="font-mono text-amber-400 font-bold">{opticsCalculator.throwRatio.toFixed(2)}:1</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="2.5"
                step="0.05"
                value={opticsCalculator.throwRatio}
                onChange={(e) => setOpticsParams({ throwRatio: parseFloat(e.target.value) })}
                className="w-full accent-amber-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Distance to Facade</label>
                <span className="font-mono text-amber-400 font-bold">{opticsCalculator.distanceFeet} ft</span>
              </div>
              <input
                type="range"
                min="6"
                max="60"
                step="1"
                value={opticsCalculator.distanceFeet}
                onChange={(e) => setOpticsParams({ distanceFeet: parseInt(e.target.value) })}
                className="w-full accent-amber-400"
              />
            </div>
          </div>

          {/* Real-time Math Results Card */}
          <div className="p-4 rounded-xl bg-[#080d16] border border-[#1f2d42] space-y-2.5">
            <div className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center justify-between">
              <span>Calculated Optical Metrics</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                {results.recommendationRating}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#172030] text-center">
              <div className="p-2.5 rounded-lg bg-[#0e1624] border border-[#1b2638]">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Image Width</div>
                <div className="text-base font-bold font-mono text-amber-300 mt-1">
                  {results.imageWidthFeet.toFixed(1)} ft
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0e1624] border border-[#1b2638]">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Image Height</div>
                <div className="text-base font-bold font-mono text-amber-300 mt-1">
                  {results.imageHeightFeet.toFixed(1)} ft
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0e1624] border border-[#1b2638]">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Surface Brightness</div>
                <div className="text-base font-bold font-mono text-emerald-400 mt-1">
                  {results.footLamberts.toFixed(1)} fL
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#1b2638] bg-[#0c121e] flex justify-end">
          <button
            type="button"
            onClick={() => setIsOpticsCalculatorOpen(false)}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase"
          >
            Apply Optics Values
          </button>
        </div>
      </div>
    </div>
  );
};
