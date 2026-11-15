import React, { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Lightbulb,
  Sliders,
  Plus,
  Trash2,
  Eye,
  RotateCw,
  Box,
  Layers,
  Sparkles,
  RefreshCw,
  Check,
  Maximize2,
  Compass,
} from 'lucide-react';
import { useProjectionStore, Virtual3DLight } from '../store/useProjectionStore';
import { synthesizeDepthAndNormalMaps, computeWallColorNeutralization } from '../utils/depthNormalSynthesizer';

export const Screen12DepthRelighting: React.FC = () => {
  const {
    virtual3DLights,
    active3DLightId,
    depthIntensity,
    normalRelief,
    facadeRoughness,
    wallNeutralizerActive,
    addVirtual3DLight,
    updateVirtual3DLight,
    deleteVirtual3DLight,
    setActive3DLightId,
    setDepth3DParams,
    customReferencePhotoUrl,
  } = useProjectionStore();

  const [activeViewportTab, setActiveViewportTab] = useState<'relit' | 'depth' | 'normal' | 'mesh3d'>('relit');
  const [orbitRotX, setOrbitRotX] = useState<number>(10);
  const [orbitRotY, setOrbitRotY] = useState<number>(-15);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [depthMapData, setDepthMapData] = useState<{ depthUrl: string; normalUrl: string } | null>(null);

  const activeLight = virtual3DLights.find((l) => l.id === active3DLightId) || virtual3DLights[0];

  const handleRunDepthSynthesis = () => {
    setIsSynthesizing(true);
    setTimeout(() => {
      const res = synthesizeDepthAndNormalMaps(
        customReferencePhotoUrl || 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80',
        {
          skyZ: 0.95,
          roofZ: 0.65,
          wallsZ: 0.40,
          pillarsZ: 0.20,
          garageZ: 0.15,
          bumpRelief: normalRelief,
        }
      );
      setDepthMapData({ depthUrl: res.depthMapDataUrl, normalUrl: res.normalMapDataUrl });
      setIsSynthesizing(false);
    }, 600);
  };

  useEffect(() => {
    handleRunDepthSynthesis();
  }, [normalRelief]);

  return (
    <div className="flex-1 flex flex-col bg-[#070b13] text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. TOP HEADER BAR */}
      <div className="h-12 bg-[#0c121d] border-b border-[#1b2536] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            3D Facade Depth & Virtual Relighting Studio
          </span>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800 px-2 py-0.5 rounded">
            Lambertian & Specular Phong Engine
          </span>
        </div>

        {/* Viewport Mode Switcher */}
        <div className="flex items-center bg-[#070b12] p-0.5 rounded-lg border border-[#1b2638]">
          {[
            { id: 'relit', label: 'Relit 3D Facade' },
            { id: 'depth', label: '16-Bit Depth Map' },
            { id: 'normal', label: 'Surface Normal Map' },
            { id: 'mesh3d', label: '3D Orbit Mesh' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveViewportTab(tab.id as any)}
              className={`px-3 py-1 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
                activeViewportTab === tab.id
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleRunDepthSynthesis}
          disabled={isSynthesizing}
          className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase flex items-center gap-1.5 shadow-md shadow-cyan-900/40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSynthesizing ? 'animate-spin' : ''}`} />
          {isSynthesizing ? 'Synthesizing...' : 'Recompute Depth'}
        </button>
      </div>

      {/* 2. MAIN 3-COLUMN WORKSPACE */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Left Panel: Depth & Normal Map Sliders (Cols 3) */}
        <div className="col-span-3 border-r border-[#1b2536] bg-[#090f19] p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="pb-2 border-b border-[#1b2536] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> Depth Planes & Geometry
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Depth Intensity */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <label className="text-[10px] uppercase font-semibold text-slate-400">Master Depth Displacement</label>
                <span className="font-mono text-cyan-400">{Math.round(depthIntensity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={depthIntensity}
                onChange={(e) => setDepth3DParams({ depthIntensity: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Surface Normal Relief */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <label className="text-[10px] uppercase font-semibold text-slate-400">Brick / Micro-Bump Relief</label>
                <span className="font-mono text-cyan-400">{Math.round(normalRelief * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={normalRelief}
                onChange={(e) => setDepth3DParams({ normalRelief: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Facade Roughness */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <label className="text-[10px] uppercase font-semibold text-slate-400">Surface Roughness (Micro-Pores)</label>
                <span className="font-mono text-cyan-400">{Math.round(facadeRoughness * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.95"
                step="0.05"
                value={facadeRoughness}
                onChange={(e) => setDepth3DParams({ facadeRoughness: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Wall Pigment Neutralizer Toggle */}
            <div className="p-3 rounded-lg bg-[#101724] border border-[#1e2a3c] flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-200">Wall Color Pigment Neutralizer</div>
                <div className="text-[10px] text-slate-400">Inverts red brick hue to project clean whites</div>
              </div>
              <button
                type="button"
                onClick={() => setDepth3DParams({ wallNeutralizerActive: !wallNeutralizerActive })}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  wallNeutralizerActive ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    wallNeutralizerActive ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Architectural Depth Planes Info */}
            <div className="p-3 rounded-lg bg-[#0c121e] border border-[#1b2638] space-y-2">
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">
                Architectural $Z$-Plane Assignment
              </div>
              <div className="text-[10px] text-slate-400 divide-y divide-[#172030]">
                <div className="py-1 flex justify-between">
                  <span>Sky & Background</span>
                  <span className="font-mono text-cyan-400">Z = 0.95 (Far)</span>
                </div>
                <div className="py-1 flex justify-between">
                  <span>Roof & Gable Planes</span>
                  <span className="font-mono text-cyan-400">Z = 0.65 (Mid-Far)</span>
                </div>
                <div className="py-1 flex justify-between">
                  <span>Main Brick Walls</span>
                  <span className="font-mono text-cyan-400">Z = 0.40 (Mid)</span>
                </div>
                <div className="py-1 flex justify-between">
                  <span>Pillars & Window Frames</span>
                  <span className="font-mono text-cyan-400">Z = 0.20 (Near)</span>
                </div>
                <div className="py-1 flex justify-between">
                  <span>Garage & Front Porch</span>
                  <span className="font-mono text-cyan-400">Z = 0.15 (Nearest)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center Viewport: Interactive 3D Quad Viewer (Cols 6) */}
        <div className="col-span-6 flex flex-col p-4 bg-[#05080e] items-center justify-center relative">
          <div className="w-full h-full rounded-xl border border-[#1f2d42] bg-black relative overflow-hidden flex items-center justify-center shadow-2xl">
            {/* Viewport Content based on active tab */}
            {activeViewportTab === 'relit' && (
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                <img
                  src={customReferencePhotoUrl || 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80'}
                  alt="House Facade"
                  className="w-full h-full object-cover"
                  style={{
                    filter: wallNeutralizerActive ? 'contrast(1.2) saturate(0.6)' : 'none',
                  }}
                />
                {/* SVG Phong Relighting Simulation Filter */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {virtual3DLights.map((light) => (
                    <circle
                      key={light.id}
                      cx={`${light.x}%`}
                      cy={`${light.y}%`}
                      r={light.radius}
                      fill={light.color}
                      opacity={light.intensity * 0.35}
                      style={{ mixBlendMode: 'color-dodge', filter: 'blur(40px)' }}
                    />
                  ))}
                </svg>

                {/* Interactive Light Gizmos */}
                {virtual3DLights.map((light) => (
                  <div
                    key={light.id}
                    onClick={() => setActive3DLightId(light.id)}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 flex flex-col items-center group transition-all ${
                      active3DLightId === light.id ? 'scale-125' : 'hover:scale-110'
                    }`}
                    style={{ left: `${light.x}%`, top: `${light.y}%` }}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-[0_0_14px_rgba(255,255,255,0.8)]"
                      style={{ backgroundColor: light.color }}
                    >
                      <Lightbulb className="w-3 h-3 text-black fill-current" />
                    </div>
                    <span className="text-[10px] font-mono text-white bg-black/80 px-1.5 py-0.5 rounded mt-1 border border-[#1f2d42] whitespace-nowrap">
                      {light.name}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {activeViewportTab === 'depth' && (
              <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
                {depthMapData?.depthUrl ? (
                  <img
                    src={depthMapData.depthUrl}
                    alt="Depth Map"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-slate-400 font-mono text-xs">Computing 16-bit Depth Map...</div>
                )}
                <div className="absolute bottom-4 left-4 text-xs font-mono text-cyan-300 bg-black/80 px-2 py-1 rounded border border-cyan-500/40">
                  16-BIT GRAYSCALE DEPTH BUFFER ($Z \in [0.0, 1.0]$)
                </div>
              </div>
            )}

            {activeViewportTab === 'normal' && (
              <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
                {depthMapData?.normalUrl ? (
                  <img
                    src={depthMapData.normalUrl}
                    alt="Surface Normal Map"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-slate-400 font-mono text-xs">Computing Normal Map...</div>
                )}
                <div className="absolute bottom-4 left-4 text-xs font-mono text-fuchsia-300 bg-black/80 px-2 py-1 rounded border border-fuchsia-500/40">
                  TANGENT SURFACE NORMAL MAP ($R=N_x, G=N_y, B=N_z$)
                </div>
              </div>
            )}

            {activeViewportTab === 'mesh3d' && (
              <div
                className="relative w-full h-full flex items-center justify-center overflow-hidden"
                style={{ perspective: '1000px' }}
              >
                <div
                  className="w-4/5 h-4/5 rounded-lg border border-cyan-500/40 shadow-2xl transition-transform duration-75 relative overflow-hidden"
                  style={{
                    transform: `rotateX(${orbitRotX}deg) rotateY(${orbitRotY}deg) translateZ(50px)`,
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <img
                    src={customReferencePhotoUrl || 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80'}
                    alt="3D Extrusion"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                </div>

                {/* Orbit Control Hints */}
                <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-black/80 px-3 py-1.5 rounded-lg border border-[#1f2d42] text-[10px] font-mono text-slate-300">
                  <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Orbit Rot: X={orbitRotX}° Y={orbitRotY}°</span>
                  <button
                    type="button"
                    onClick={() => setOrbitRotY((prev) => prev + 15)}
                    className="px-1.5 py-0.5 bg-[#172233] hover:bg-[#203048] rounded text-cyan-300"
                  >
                    +15° Y
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrbitRotX((prev) => prev + 10)}
                    className="px-1.5 py-0.5 bg-[#172233] hover:bg-[#203048] rounded text-cyan-300"
                  >
                    +10° X
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Virtual 3D Light Rig Inspector (Cols 3) */}
        <div className="col-span-3 border-l border-[#1b2536] bg-[#090f19] p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="pb-2 border-b border-[#1b2536] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Virtual 3D Light Rig
            </span>
            <button
              type="button"
              onClick={() => addVirtual3DLight()}
              className="p-1 rounded bg-[#162132] hover:bg-[#202f47] border border-[#233550] text-cyan-400"
              title="Add 3D Light"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Light Rig List */}
          <div className="space-y-2">
            {virtual3DLights.map((light) => (
              <div
                key={light.id}
                onClick={() => setActive3DLightId(light.id)}
                className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                  active3DLightId === light.id
                    ? 'bg-[#152033] border-cyan-500 shadow-md'
                    : 'bg-[#0e1624] border-[#1d293d] hover:bg-[#121c2d]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-white/50"
                    style={{ backgroundColor: light.color }}
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-200">{light.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono uppercase">{light.type} • {light.intensity}x</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteVirtual3DLight(light.id);
                  }}
                  className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Active Light Parameters */}
          {activeLight && (
            <div className="p-3 rounded-lg bg-[#0c121e] border border-[#1b2638] space-y-3 text-xs">
              <div className="text-[11px] font-bold text-cyan-300 uppercase tracking-wide">
                Selected: {activeLight.name}
              </div>

              {/* Light Type */}
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase">Emitter Type</label>
                <select
                  value={activeLight.type}
                  onChange={(e) =>
                    updateVirtual3DLight(activeLight.id, { type: e.target.value as any })
                  }
                  className="w-full mt-1 bg-[#121a28] border border-[#233248] rounded px-2 py-1 text-slate-200 font-semibold"
                >
                  <option value="point">Point Light (Omni)</option>
                  <option value="directional">Directional (Sun/Moon)</option>
                  <option value="spotlight">Sweeping Spotlight</option>
                  <option value="window-emitter">Window Glow Emitter</option>
                </select>
              </div>

              {/* Light Color */}
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase">Color Tint</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={activeLight.color}
                    onChange={(e) => updateVirtual3DLight(activeLight.id, { color: e.target.value })}
                    className="w-8 h-8 rounded border border-[#233248] cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={activeLight.color}
                    onChange={(e) => updateVirtual3DLight(activeLight.id, { color: e.target.value })}
                    className="flex-1 bg-[#121a28] border border-[#233248] rounded px-2 py-1 font-mono text-slate-200"
                  />
                </div>
              </div>

              {/* 3D Coordinates X & Y */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-semibold uppercase">
                    <span>X</span>
                    <span className="font-mono text-cyan-400">{activeLight.x}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={activeLight.x}
                    onChange={(e) => updateVirtual3DLight(activeLight.id, { x: parseInt(e.target.value) })}
                    className="w-full accent-cyan-400 mt-1"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-semibold uppercase">
                    <span>Y</span>
                    <span className="font-mono text-cyan-400">{activeLight.y}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={activeLight.y}
                    onChange={(e) => updateVirtual3DLight(activeLight.id, { y: parseInt(e.target.value) })}
                    className="w-full accent-cyan-400 mt-1"
                  />
                </div>
              </div>

              {/* Intensity */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold uppercase">
                  <span>Intensity Lumens</span>
                  <span className="font-mono text-cyan-400">{activeLight.intensity}x</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="4.0"
                  step="0.1"
                  value={activeLight.intensity}
                  onChange={(e) => updateVirtual3DLight(activeLight.id, { intensity: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 mt-1"
                />
              </div>

              {/* Animated Orbit */}
              <div className="flex items-center justify-between pt-2 border-t border-[#1b2638]">
                <span className="text-[10px] text-slate-300 font-semibold uppercase">Animated Orbit Path</span>
                <input
                  type="checkbox"
                  checked={activeLight.animatedOrbit}
                  onChange={(e) => updateVirtual3DLight(activeLight.id, { animatedOrbit: e.target.checked })}
                  className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
