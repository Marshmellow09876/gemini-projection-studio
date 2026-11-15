import React, { useState, useEffect } from 'react';
import {
  Tv,
  DoorOpen,
  Plus,
  Trash2,
  Sliders,
  Eye,
  RotateCw,
  Sparkles,
  Layers,
  ArrowRight,
  Maximize2,
  Minimize2,
  Save,
  Check,
  User,
  Clock,
} from 'lucide-react';
import { useProjectionStore, WindowPortalConfig } from '../store/useProjectionStore';

export const Screen17WindowPortals: React.FC = () => {
  const {
    windowPortals,
    activeWindowPortalId,
    addWindowPortal,
    updateWindowPortal,
    deleteWindowPortal,
    setActiveWindowPortalId,
    customReferencePhotoUrl,
    addTimelineClip,
  } = useProjectionStore();

  const [isSimulatingTransit, setIsSimulatingTransit] = useState<boolean>(true);
  const [transitWindowIndex, setTransitWindowIndex] = useState<number>(0);
  const [bakeToast, setBakeToast] = useState<string | null>(null);

  const activePortal =
    windowPortals.find((p) => p.id === activeWindowPortalId) || windowPortals[0];

  // Auto-transit animation across registered window portals
  useEffect(() => {
    if (!isSimulatingTransit || windowPortals.length <= 1) return;
    const interval = setInterval(() => {
      setTransitWindowIndex((prev) => (prev + 1) % windowPortals.length);
    }, (activePortal?.transitDelaySec || 3.5) * 1000);
    return () => clearInterval(interval);
  }, [isSimulatingTransit, windowPortals.length, activePortal?.transitDelaySec]);

  // Bake cross-window transit into Multi-track Timeline Sequencer
  const handleBakeTransitToTimeline = () => {
    addTimelineClip('track-portals', {
      title: `Transit: ${activePortal?.activeCharacter || 'Slimer'} (${activePortal?.name || 'Window'})`,
      startSec: 15,
      durationSec: (activePortal?.transitDelaySec || 3.5) * 2 + 5,
      sourceType: 'character',
      opacity: 0.95,
      color: '#00f0ff',
    });
    setBakeToast('Pushed Transit Cues to Timeline Track 3!');
    setTimeout(() => setBakeToast(null), 2500);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#070b13] text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. TOP HEADER BAR */}
      <div className="h-12 bg-[#0c121d] border-b border-[#1b2638] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <DoorOpen className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Interior Window Portals, Hollusions & Yard Prop Mapper
          </span>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800 px-2 py-0.5 rounded">
            Rear-Projection & Cross-Room Synchronizer
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {bakeToast && (
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-700/60 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> {bakeToast}
            </span>
          )}

          <button
            type="button"
            onClick={handleBakeTransitToTimeline}
            className="px-3 py-1.5 rounded bg-[#152336] hover:bg-[#1d304a] border border-cyan-600/40 text-cyan-300 font-bold text-xs uppercase flex items-center gap-1.5 transition-all"
          >
            <Save className="w-3.5 h-3.5" /> Bake to Timeline (Track 3)
          </button>

          <button
            type="button"
            onClick={() => setIsSimulatingTransit(!isSimulatingTransit)}
            className={`px-3 py-1.5 rounded font-bold text-xs uppercase flex items-center gap-1.5 shadow-md ${
              isSimulatingTransit
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/40'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/40'
            }`}
          >
            {isSimulatingTransit ? 'Simulating Transit...' : 'Trigger Character Transit'}
          </button>
        </div>
      </div>

      {/* 2. MAIN 3-COLUMN WORKSPACE */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Left Panel: Portals & Prop Registry (Cols 3) */}
        <div className="col-span-3 border-r border-[#1b2638] bg-[#090f19] p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="pb-2 border-b border-[#1b2638] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Tv className="w-3.5 h-3.5 text-cyan-400" /> Window Cutouts & Scrims
            </span>
            <button
              type="button"
              onClick={() => addWindowPortal()}
              className="p-1 rounded bg-[#162132] hover:bg-[#202f47] border border-[#233550] text-cyan-400"
              title="Add Window Portal"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {windowPortals.map((portal) => (
              <div
                key={portal.id}
                onClick={() => setActiveWindowPortalId(portal.id)}
                className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                  activeWindowPortalId === portal.id
                    ? 'bg-[#152033] border-cyan-500 shadow-md'
                    : 'bg-[#0e1624] border-[#1d293d] hover:bg-[#121c2d]'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-200">{portal.name}</div>
                  <div className="text-[10px] text-cyan-400 font-mono uppercase">
                    {portal.mode} • Depth: {portal.interiorDepthMeters}m
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteWindowPortal(portal.id);
                  }}
                  className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Cross-Window Transit Route */}
          <div className="p-3 rounded-lg bg-[#0c121e] border border-[#1b2638] space-y-2 text-xs">
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">
              Cross-Room Character Route
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
              <span className="text-cyan-300 font-bold">Bay Window</span>
              <ArrowRight className="w-3 h-3" />
              <span>Hallway (3.5s)</span>
              <ArrowRight className="w-3 h-3" />
              <span className="text-cyan-300 font-bold">Garage</span>
            </div>
          </div>
        </div>

        {/* Center Viewport: Multi-Portal Cutaway Monitor (Cols 6) */}
        <div className="col-span-6 flex flex-col p-4 bg-[#05080e] items-center justify-center relative">
          <div className="w-full h-full rounded-xl border border-[#1f2d42] bg-black relative overflow-hidden flex items-center justify-center shadow-2xl">
            {/* Background Facade */}
            <img
              src={customReferencePhotoUrl || 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80'}
              alt="House"
              className="w-full h-full object-cover opacity-60"
            />

            {/* Simulated 3D Interior Cutaway Glow & Multi-Window Transit View */}
            <div className="absolute inset-0 flex items-center justify-around px-8 pointer-events-none">
              {windowPortals.map((portal, idx) => {
                const isCurrentTransit = idx === (transitWindowIndex % windowPortals.length);
                const isSelected = portal.id === activePortal?.id;

                return (
                  <div
                    key={portal.id}
                    className={`w-36 h-28 rounded-lg border-2 flex flex-col items-center justify-center transition-all duration-700 shadow-xl ${
                      isCurrentTransit
                        ? 'border-cyan-400 bg-cyan-950/60 shadow-[0_0_25px_rgba(0,240,255,0.6)] scale-105'
                        : isSelected
                        ? 'border-indigo-500/80 bg-indigo-950/30'
                        : 'border-slate-700/60 bg-black/50 opacity-60'
                    }`}
                  >
                    <div className="text-[9px] font-mono uppercase text-slate-300 truncate max-w-[120px]">
                      {portal.name}
                    </div>

                    {isCurrentTransit ? (
                      <div className="flex flex-col items-center mt-1 animate-pulse">
                        <Sparkles className="w-5 h-5 text-cyan-300 drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
                        <span className="text-[11px] font-bold text-white mt-0.5">
                          {portal.activeCharacter || 'Slimer'}
                        </span>
                        <span className="text-[8px] font-mono text-cyan-300 uppercase">
                          TRANSIT ACTIVE ({portal.mode})
                        </span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 mt-2 font-mono flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-600" /> Standby
                      </div>
                    )}

                    <div className="text-[8px] font-mono text-slate-400 mt-1">
                      Depth: {portal.interiorDepthMeters}m {portal.rearProjectorFlipH ? '• Mirror' : ''}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="absolute top-4 left-4 text-xs font-mono text-cyan-400 bg-black/80 px-2 py-1 rounded border border-cyan-500/40">
              INTERIOR HOLLUSION STAGE • 3 ACTIVE PORTALS
            </div>
          </div>
        </div>

        {/* Right Panel: Portal Depth & Vignette Controls (Cols 3) */}
        <div className="col-span-3 border-l border-[#1b2638] bg-[#090f19] p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="pb-2 border-b border-[#1b2638] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" /> Portal Vignette & Flip
            </span>
          </div>

          {activePortal && (
            <div className="space-y-4 text-xs">
              {/* Placement Mode */}
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase">Placement Routing</label>
                <select
                  value={activePortal.mode}
                  onChange={(e) =>
                    updateWindowPortal(activePortal.id, { mode: e.target.value as any })
                  }
                  className="w-full mt-1 bg-[#121a28] border border-[#233248] rounded px-2 py-1 text-slate-200 font-semibold"
                >
                  <option value="exterior-front">Exterior Main Projector</option>
                  <option value="interior-window-rear">Interior Rear-Projection Window</option>
                  <option value="yard-scrim">Yard Prop Mesh Scrim</option>
                </select>
              </div>

              {/* Rear-Projection Mirror Flip */}
              <div className="p-3 rounded-lg bg-[#101724] border border-[#1e2a3c] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-200">Rear-Projection Horizontal Flip</div>
                  <div className="text-[10px] text-slate-400">Mirrors video for rear glass projection</div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateWindowPortal(activePortal.id, {
                      rearProjectorFlipH: !activePortal.rearProjectorFlipH,
                    })
                  }
                  className={`w-9 h-5 rounded-full transition-colors relative ${
                    activePortal.rearProjectorFlipH ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                      activePortal.rearProjectorFlipH ? 'translate-x-4' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Virtual Curtain Vignette */}
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase">Virtual Curtain Vignette</label>
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  {(['none', 'drapes', 'blinds', 'stained-glass'] as const).map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => updateWindowPortal(activePortal.id, { virtualCurtainStyle: style })}
                      className={`px-2 py-1.5 rounded text-[10px] font-bold uppercase border transition-all ${
                        activePortal.virtualCurtainStyle === style
                          ? 'bg-cyan-600/30 text-cyan-300 border-cyan-500'
                          : 'bg-[#101724] text-slate-400 border-[#1e2a3c]'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interior Room Depth */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <label className="text-[10px] uppercase font-semibold text-slate-400">Interior Room Depth</label>
                  <span className="font-mono text-cyan-400">{activePortal.interiorDepthMeters.toFixed(1)}m</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="0.5"
                  value={activePortal.interiorDepthMeters}
                  onChange={(e) =>
                    updateWindowPortal(activePortal.id, {
                      interiorDepthMeters: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-cyan-400"
                />
              </div>

              {/* Character Rig Selector */}
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase">Assigned Character Puppet</label>
                <select
                  value={activePortal.activeCharacter || 'Slimer (Ghostbusters)'}
                  onChange={(e) =>
                    updateWindowPortal(activePortal.id, { activeCharacter: e.target.value })
                  }
                  className="w-full mt-1 bg-[#121a28] border border-[#233248] rounded px-2 py-1 text-slate-200 font-semibold"
                >
                  <option value="Slimer (Ghostbusters)">Slimer (Ghostbusters)</option>
                  <option value="Floating Victorian Ghost">Floating Victorian Ghost</option>
                  <option value="Singing Jack-O'-Lantern">Singing Jack-O'-Lantern</option>
                  <option value="Santa Claus Peeking">Santa Claus Peeking</option>
                  <option value="Dancing Skeleton">Dancing Skeleton</option>
                  <option value="Zombie Silhouette">Zombie Silhouette</option>
                </select>
              </div>

              {/* Transit Delay Between Rooms */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <label className="text-[10px] uppercase font-semibold text-slate-400">Transit Delay (Seconds)</label>
                  <span className="font-mono text-cyan-400">{(activePortal.transitDelaySec || 3.5).toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={activePortal.transitDelaySec || 3.5}
                  onChange={(e) =>
                    updateWindowPortal(activePortal.id, {
                      transitDelaySec: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
