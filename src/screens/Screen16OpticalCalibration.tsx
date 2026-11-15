import React, { useState } from 'react';
import {
  Compass,
  Sliders,
  Camera,
  RefreshCw,
  Check,
  Maximize2,
  Box,
  Layers,
  Sparkles,
  Zap,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { useProjectionStore } from '../store/useProjectionStore';
import {
  POPULAR_PROJECTOR_PRESETS,
  calculateProjectorOptics,
} from '../utils/opticsCalculator';

export const Screen16OpticalCalibration: React.FC = () => {
  const {
    opticsCalculator,
    isAutoWarpingActive,
    autoWarpProgressPct,
    setOpticsParams,
    runAutoStructuredLightWarp,
    customReferencePhotoUrl,
  } = useProjectionStore();

  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(1);
  const [activeCamStream, setActiveCamStream] = useState<boolean>(true);
  const [rgbNudgeR, setRgbNudgeR] = useState<number>(0);
  const [rgbNudgeG, setRgbNudgeG] = useState<number>(0);
  const [rgbNudgeB, setRgbNudgeB] = useState<number>(0);

  const opticsResults = calculateProjectorOptics({
    throwRatio: opticsCalculator.throwRatio,
    throwDistanceFeet: opticsCalculator.distanceFeet,
    aspectRatio: opticsCalculator.aspectRatio,
    ansiLumens: opticsCalculator.ansiLumens,
  });

  const handleSelectPreset = (idx: number) => {
    setSelectedPresetIndex(idx);
    const p = POPULAR_PROJECTOR_PRESETS[idx];
    setOpticsParams({
      projectorModel: p.model,
      throwRatio: p.throwRatioMin,
      ansiLumens: p.ansiLumens,
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#070b13] text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. TOP HEADER BAR */}
      <div className="h-12 bg-[#0c121d] border-b border-[#1b2638] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Optical Auto-Calibration & Lens Calculator Lab
          </span>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800 px-2 py-0.5 rounded">
            Structured-Light Gray-Code Solver
          </span>
        </div>

        {/* Auto-Warp Action */}
        <div className="flex items-center gap-3">
          {isAutoWarpingActive && (
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Calibrating Sub-Pixel Mesh ({autoWarpProgressPct}%)...</span>
            </div>
          )}

          <button
            type="button"
            onClick={runAutoStructuredLightWarp}
            disabled={isAutoWarpingActive}
            className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase flex items-center gap-1.5 shadow-md shadow-cyan-900/40"
          >
            <Camera className="w-3.5 h-3.5" />
            {isAutoWarpingActive ? 'Running Auto-Warp...' : 'Run 10s Auto-Warp'}
          </button>
        </div>
      </div>

      {/* 2. MAIN 3-COLUMN WORKSPACE */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Left Panel: Hardware Database & Throw Math (Cols 3) */}
        <div className="col-span-3 border-r border-[#1b2638] bg-[#090f19] p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="pb-2 border-b border-[#1b2638] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" /> Projector Hardware Presets
            </span>
          </div>

          {/* Model Presets */}
          <div className="space-y-1.5">
            {POPULAR_PROJECTOR_PRESETS.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectPreset(i)}
                className={`w-full text-left p-2 rounded-lg border text-xs transition-all ${
                  selectedPresetIndex === i
                    ? 'bg-cyan-600/20 text-cyan-300 border-cyan-500 shadow-sm'
                    : 'bg-[#101724] text-slate-300 border-[#1f2d42] hover:bg-[#162132]'
                }`}
              >
                <div className="font-bold truncate">{p.model}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Throw: {p.throwRatioMin}:1 • {p.ansiLumens} Lumens
                </div>
              </button>
            ))}
          </div>

          {/* Interactive Distance & Throw Inputs */}
          <div className="p-3 rounded-lg bg-[#0c121e] border border-[#1b2638] space-y-3 text-xs">
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">
              Throw Distance & Yard Layout
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <label className="text-[10px] uppercase font-semibold text-slate-400">Distance to Facade</label>
                <span className="font-mono text-cyan-400">{opticsCalculator.distanceFeet} ft</span>
              </div>
              <input
                type="range"
                min="6"
                max="50"
                step="1"
                value={opticsCalculator.distanceFeet}
                onChange={(e) => setOpticsParams({ distanceFeet: parseInt(e.target.value) })}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Calculated Metrics Readout */}
            <div className="divide-y divide-[#172030] text-[10px] text-slate-400 font-mono pt-1">
              <div className="py-1.5 flex justify-between">
                <span>Projected Width:</span>
                <span className="text-cyan-300 font-bold">{opticsResults.imageWidthFeet.toFixed(1)} ft</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span>Projected Height:</span>
                <span className="text-cyan-300 font-bold">{opticsResults.imageHeightFeet.toFixed(1)} ft</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span>Brightness (Foot-Lamberts):</span>
                <span className="text-emerald-400 font-bold">{opticsResults.footLamberts.toFixed(1)} fL</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span>Outdoor Viability:</span>
                <span className="text-emerald-400 font-bold uppercase">{opticsResults.recommendationRating}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Split Viewport: Yard CAD Frustum + Live Camera Calibration (Cols 6) */}
        <div className="col-span-6 flex flex-col p-4 bg-[#05080e] items-center justify-center gap-3">
          {/* Top Half: Yard CAD Throw Frustum */}
          <div className="w-full h-1/2 rounded-xl border border-[#1f2d42] bg-[#080d16] relative overflow-hidden flex items-center justify-center shadow-lg">
            <svg className="w-full h-full">
              {/* Yard grid */}
              <defs>
                <pattern id="cadGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#142032" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#cadGrid)" />

              {/* House Facade Wall (Top) */}
              <line x1="80" y1="50" x2="520" y2="50" stroke="#00f0ff" strokeWidth="4" />
              <text x="300" y="35" fill="#00f0ff" fontSize="10" fontFamily="monospace" textAnchor="middle">
                HOUSE FAÇADE WALL ({opticsResults.imageWidthFeet.toFixed(1)} FT SPREAD)
              </text>

              {/* Projector Frustum Cone */}
              <polygon
                points="300,200 120,50 480,50"
                fill="rgba(0, 240, 255, 0.12)"
                stroke="#00f0ff"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />

              {/* Projector Icon (Bottom) */}
              <circle cx="300" cy="200" r="10" fill="#22c55e" />
              <text x="300" y="225" fill="#22c55e" fontSize="10" fontFamily="monospace" textAnchor="middle">
                PROJECTOR [{opticsCalculator.distanceFeet} FT THROW]
              </text>
            </svg>
            <div className="absolute top-2 left-2 text-[10px] font-mono text-cyan-400 bg-black/70 px-2 py-0.5 rounded border border-cyan-500/30">
              TOP-DOWN YARD CAD FRUSTUM
            </div>
          </div>

          {/* Bottom Half: Live Structured-Light Camera Feed */}
          <div className="w-full h-1/2 rounded-xl border border-[#1f2d42] bg-black relative overflow-hidden flex items-center justify-center shadow-lg">
            <img
              src={customReferencePhotoUrl || 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80'}
              alt="Live Cam Feed"
              className="w-full h-full object-cover opacity-60"
            />

            {/* Binary Gray-Code Projected Stripes representation */}
            {isAutoWarpingActive && (
              <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_50%,rgba(0,240,255,0.4)_50%)] bg-[length:16px_100%] animate-pulse pointer-events-none" />
            )}

            <div className="absolute top-2 left-2 text-[10px] font-mono text-emerald-400 bg-black/70 px-2 py-0.5 rounded border border-emerald-500/30">
              CALIBRATION CAMERA FEED (1080p • 60 FPS)
            </div>
            <div className="absolute bottom-2 right-2 text-[10px] font-mono text-cyan-300 bg-black/70 px-2 py-0.5 rounded border border-cyan-500/30">
              HOMOGRAPHY ERROR: ±0.42 PX (SUB-PIXEL)
            </div>
          </div>
        </div>

        {/* Right Panel: Auto-Warp Solver & Color Neutralizer (Cols 3) */}
        <div className="col-span-3 border-l border-[#1b2638] bg-[#090f19] p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="pb-2 border-b border-[#1b2638] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" /> Solver & Alignment
            </span>
          </div>

          {/* RGB Sub-Pixel Convergence Nudgers */}
          <div className="p-3 rounded-lg bg-[#0c121e] border border-[#1b2638] space-y-3 text-xs">
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">
              RGB Panel Convergence Nudge
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-rose-400 font-semibold uppercase">
                <span>Red Offset</span>
                <span className="font-mono">{rgbNudgeR} px</span>
              </div>
              <input
                type="range"
                min="-10"
                max="10"
                value={rgbNudgeR}
                onChange={(e) => setRgbNudgeR(parseInt(e.target.value))}
                className="w-full accent-rose-400 mt-1"
              />
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-emerald-400 font-semibold uppercase">
                <span>Green Offset</span>
                <span className="font-mono">{rgbNudgeG} px</span>
              </div>
              <input
                type="range"
                min="-10"
                max="10"
                value={rgbNudgeG}
                onChange={(e) => setRgbNudgeG(parseInt(e.target.value))}
                className="w-full accent-emerald-400 mt-1"
              />
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-blue-400 font-semibold uppercase">
                <span>Blue Offset</span>
                <span className="font-mono">{rgbNudgeB} px</span>
              </div>
              <input
                type="range"
                min="-10"
                max="10"
                value={rgbNudgeB}
                onChange={(e) => setRgbNudgeB(parseInt(e.target.value))}
                className="w-full accent-blue-400 mt-1"
              />
            </div>
          </div>

          {/* Auto-Detect Tree/Bush Obstructions */}
          <div className="p-3 rounded-lg bg-[#101724] border border-[#1e2a3c] space-y-2">
            <div className="text-xs font-bold text-slate-200">Obstruction Auto-Masker</div>
            <div className="text-[10px] text-slate-400">
              Scans calibration camera feed for swaying trees, bush branches, or parked vehicles blocking the throw.
            </div>
            <button
              type="button"
              className="w-full py-1.5 rounded bg-[#182438] hover:bg-[#20304a] text-cyan-300 border border-[#233550] text-xs font-semibold"
            >
              Scan & Cutout Obstructions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
