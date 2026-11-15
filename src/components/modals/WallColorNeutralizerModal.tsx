import React, { useState } from 'react';
import { X, Pipette, Sparkles, Check, Sliders, RefreshCw } from 'lucide-react';
import { useProjectionStore } from '../../store/useProjectionStore';
import { computeWallColorNeutralization } from '../../utils/depthNormalSynthesizer';

export const WallColorNeutralizerModal: React.FC = () => {
  const {
    isWallNeutralizerModalOpen,
    setIsWallNeutralizerModalOpen,
    opticsCalculator,
    setOpticsParams,
    customReferencePhotoUrl,
  } = useProjectionStore();

  const [sampledBgColor, setSampledBgColor] = useState<string>(
    opticsCalculator.wallNeutralizerColor || '#8a4b38'
  );
  const [compensationStrength, setCompensationStrength] = useState<number>(0.85);

  if (!isWallNeutralizerModalOpen) return null;

  const lut = computeWallColorNeutralization(
    sampledBgColor,
    Math.round(compensationStrength * 100)
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#0b121e] border border-[#213047] rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans select-none">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1b2638] flex items-center justify-between bg-[#0e1626]">
          <div className="flex items-center gap-2.5">
            <Pipette className="w-5 h-5 text-fuchsia-400" />
            <div>
              <div className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                Wall Color & Brick Pigment Neutralizer
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Inverse Chromatic Radiometric LUT Calibration
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsWallNeutralizerModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2538] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh] text-xs">
          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Sampled Facade Surface Pigment
            </label>
            <div className="flex items-center gap-3 mt-2">
              <input
                type="color"
                value={sampledBgColor}
                onChange={(e) => setSampledBgColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-[#233550] cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={sampledBgColor}
                onChange={(e) => setSampledBgColor(e.target.value)}
                className="flex-1 bg-[#121a28] border border-[#233248] rounded px-3 py-2 font-mono text-slate-200 uppercase font-semibold"
              />
            </div>
          </div>

          {/* Strength slider */}
          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Compensation Strength</label>
              <span className="font-mono text-fuchsia-400 font-bold">
                {Math.round(compensationStrength * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={compensationStrength}
              onChange={(e) => setCompensationStrength(parseFloat(e.target.value))}
              className="w-full accent-fuchsia-400"
            />
          </div>

          {/* Before & After Simulation */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 rounded-xl bg-[#080d16] border border-[#1f2d42]">
              <div className="text-[10px] text-slate-400 font-mono uppercase mb-2">Uncorrected Color Cast</div>
              <div
                className="w-full h-24 rounded-lg flex items-center justify-center text-xs font-bold shadow-inner"
                style={{ backgroundColor: sampledBgColor, color: '#ffffff' }}
              >
                Projected White turns Tan/Red
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#080d16] border border-[#1f2d42]">
              <div className="text-[10px] text-slate-400 font-mono uppercase mb-2">Neutralized Equalization</div>
              <div
                className="w-full h-24 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-inner"
                style={{ backgroundColor: '#2a4365' }}
              >
                Neutral White Perceived
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#0c121e] border border-[#1b2638] text-[11px] text-slate-400 space-y-1">
            <div className="font-bold text-slate-200 uppercase">Computed Inverse Filter</div>
            <div className="font-mono text-cyan-300">{lut.compensationFilterCss}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1b2638] bg-[#0c121e] flex justify-end">
          <button
            type="button"
            onClick={() => {
              setOpticsParams({
                wallCompensationEnabled: true,
                wallNeutralizerColor: sampledBgColor,
              });
              setIsWallNeutralizerModalOpen(false);
            }}
            className="px-4 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-xs uppercase"
          >
            Apply Chromatic LUT
          </button>
        </div>
      </div>
    </div>
  );
};
