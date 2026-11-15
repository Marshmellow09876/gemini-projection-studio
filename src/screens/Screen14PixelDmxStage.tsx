import React, { useState, useEffect } from 'react';
import {
  Radio,
  Sliders,
  Plus,
  Trash2,
  Tv,
  Sparkles,
  Download,
  Crosshair,
  Wifi,
  Power,
  RotateCw,
  Layers,
  Circle,
  FileCode,
} from 'lucide-react';
import { useProjectionStore, PhysicalDmxFixture } from '../store/useProjectionStore';
import {
  generateFseqV2Binary,
  downloadFseqFile,
  generateXLightsXsqXml,
  downloadXsqFile,
  XLightsModelMapping,
} from '../utils/xlightsFppBridge';

export const Screen14PixelDmxStage: React.FC = () => {
  const {
    physicalDmxFixtures,
    dmxAmbilightBleed,
    movingHeadX,
    movingHeadY,
    activeDmxUniverse,
    addDmxFixture,
    updateDmxFixture,
    deleteDmxFixture,
    setDmxAmbilightBleed,
    setMovingHeadTarget,
    customReferencePhotoUrl,
  } = useProjectionStore();

  const [selectedFixtureId, setSelectedFixtureId] = useState<string>('fix-1');
  const [isSimulatingChase, setIsSimulatingChase] = useState<boolean>(true);
  const [fseqExportSuccess, setFseqExportSuccess] = useState<boolean>(false);

  const selectedFixture =
    physicalDmxFixtures.find((f) => f.id === selectedFixtureId) ||
    physicalDmxFixtures[0];

  // Moving Head Figure-8 sweep animation loop
  useEffect(() => {
    if (!isSimulatingChase) return;
    let t = 0;
    const interval = setInterval(() => {
      t += 0.05;
      const x = 50 + Math.sin(t) * 30;
      const y = 35 + Math.sin(t * 2) * 15;
      setMovingHeadTarget(Math.round(x), Math.round(y));
    }, 60);
    return () => clearInterval(interval);
  }, [isSimulatingChase, setMovingHeadTarget]);

  const handleExportFseq = () => {
    // Generate 60 frames (3 seconds at 20 FPS) of synchronized light chase
    const channelCount = Math.max(128, physicalDmxFixtures.reduce((acc, f) => acc + (f.startChannel || 0) + 30, 0));
    const frames: Uint8Array[] = [];
    const totalFrames = 60;
    for (let f = 0; f < totalFrames; f++) {
      const frame = new Uint8Array(channelCount);
      for (let i = 0; i < channelCount - 3; i += 3) {
        const phase = (f / totalFrames) * Math.PI * 2 + (i / channelCount) * Math.PI * 4;
        frame[i] = Math.round((Math.sin(phase) * 0.5 + 0.5) * 255); // R
        frame[i + 1] = Math.round((Math.cos(phase * 0.7) * 0.5 + 0.5) * 200); // G
        frame[i + 2] = 255; // B (cyan/purple architectural wash)
      }
      frames.push(frame);
    }

    const binary = generateFseqV2Binary({
      sequenceName: 'LumenMap_Holiday_DMX_Stage',
      stepTimeMs: 50,
      channelCount,
      frames,
    });

    downloadFseqFile(binary, 'LumenMap_DMX_Stage.fseq');
    setFseqExportSuccess(true);
    setTimeout(() => setFseqExportSuccess(false), 2500);
  };

  const handleExportXsqXml = () => {
    const models: XLightsModelMapping[] = physicalDmxFixtures.map((f, idx) => ({
      name: f.name.replace(/[^A-Za-z0-9_]/g, '_'),
      type: f.type === 'roof-wled-strip' ? 'Poly Line' : f.type === 'yard-pixel-arch' ? 'Arch' : 'DMX Moving Head',
      startChannel: f.startChannel || (idx * 30 + 1),
      nodeCount: f.type === 'dmx-moving-head' ? 7 : f.pixelCount || 30,
      rgbOrder: 'RGB',
    }));

    const xml = generateXLightsXsqXml('LumenMap_Holiday_Stage', models, 3.0, 50);
    downloadXsqFile(xml, 'LumenMap_Holiday_Stage.xsq');
  };

  return (
    <div className="flex-1 flex flex-col bg-[#070b13] text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. TOP HEADER BAR */}
      <div className="h-12 bg-[#0c121d] border-b border-[#1b2638] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Physical Pixel, WLED, xLights & DMX Stage Visualizer
          </span>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
            sACN (E1.31) / Art-Net Active
          </span>
        </div>

        {/* Ambilight Toggle & Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#101724] px-3 py-1 rounded-lg border border-[#1f2d42]">
            <span className="text-xs font-semibold text-slate-300">Ambilight Roof Bleed</span>
            <button
              type="button"
              onClick={() => setDmxAmbilightBleed(!dmxAmbilightBleed)}
              className={`w-9 h-5 rounded-full transition-colors relative ${
                dmxAmbilightBleed ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                  dmxAmbilightBleed ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportFseq}
            className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase flex items-center gap-1.5 shadow-md shadow-emerald-900/40 cursor-pointer"
            title="Export binary .fseq v2 sequence for Falcon Player (FPP) or xLights"
          >
            <Download className="w-3.5 h-3.5" />
            {fseqExportSuccess ? 'Exported .fseq!' : 'Export .fseq'}
          </button>

          <button
            type="button"
            onClick={handleExportXsqXml}
            className="px-3 py-1.5 rounded bg-[#182335] hover:bg-[#22334e] border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 hover:text-white font-bold text-xs uppercase flex items-center gap-1.5 transition-all cursor-pointer"
            title="Export xLights sequence XML (.xsq) with models and timing layers"
          >
            <FileCode className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export .xsq</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN 3-COLUMN WORKSPACE */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Left Panel: Fixture & Patch Bay (Cols 3) */}
        <div className="col-span-3 border-r border-[#1b2638] bg-[#090f19] p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="pb-2 border-b border-[#1b2638] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400" /> DMX Fixture Patch Bay
            </span>
            <button
              type="button"
              onClick={() => addDmxFixture()}
              className="p-1 rounded bg-[#162132] hover:bg-[#202f47] border border-[#233550] text-emerald-400"
              title="Patch New Fixture"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Fixtures List */}
          <div className="space-y-2">
            {physicalDmxFixtures.map((fix) => (
              <div
                key={fix.id}
                onClick={() => setSelectedFixtureId(fix.id)}
                className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                  selectedFixtureId === fix.id
                    ? 'bg-[#152033] border-emerald-500 shadow-md'
                    : 'bg-[#0e1624] border-[#1d293d] hover:bg-[#121c2d]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-white/50"
                    style={{ backgroundColor: fix.activeColor }}
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-200">{fix.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      U:{fix.universe} • Ch:{fix.startChannel} • {fix.pixelCount} px
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteDmxFixture(fix.id);
                  }}
                  className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Quick Patch Presets */}
          <div className="p-3 rounded-lg bg-[#0c121e] border border-[#1b2638] space-y-2 text-xs">
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">
              Quick Physical Fixtures
            </div>
            {[
              { name: 'Yard Mega-Tree (16x50)', type: 'roof-wled-strip', pixels: 800, ip: '192.168.1.150' },
              { name: 'DMX Beam Moving Head R', type: 'dmx-moving-head', pixels: 16, ip: '192.168.1.155' },
              { name: 'CO2 / Cryo Fog Burst Jet', type: 'fog-burst', pixels: 4, ip: '192.168.1.160' },
            ].map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() =>
                  addDmxFixture({
                    name: p.name,
                    type: p.type as any,
                    pixelCount: p.pixels,
                    ipAddress: p.ip,
                  })
                }
                className="w-full text-left px-2 py-1.5 rounded bg-[#101724] hover:bg-[#182338] border border-[#1f2d42] text-[11px] font-semibold text-slate-300 flex items-center justify-between"
              >
                <span>{p.name}</span>
                <span className="text-[10px] text-emerald-400 font-mono">+ Patch</span>
              </button>
            ))}
          </div>
        </div>

        {/* Center Viewport: Unified Projection + LED Visualizer (Cols 6) */}
        <div className="col-span-6 flex flex-col p-4 bg-[#05080e] items-center justify-center relative">
          <div className="w-full h-full rounded-xl border border-[#1f2d42] bg-black relative overflow-hidden flex items-center justify-center shadow-2xl">
            {/* Background House Facade */}
            <img
              src={customReferencePhotoUrl || 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80'}
              alt="House Projection"
              className="w-full h-full object-cover opacity-60"
            />

            {/* Glowing Physical Roofline WLED Pixel Ribbon Simulation */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {/* Roofline Pixel Chain */}
              {Array.from({ length: 40 }).map((_, i) => {
                const cx = `${5 + i * 2.3}%`;
                const cy = `${25 + Math.sin(i * 0.4) * 8}%`;
                return (
                  <circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r="4"
                    fill={dmxAmbilightBleed ? '#00f0ff' : '#22c55e'}
                    className="animate-pulse"
                    style={{
                      filter: 'drop-shadow(0 0 6px #00f0ff)',
                      animationDuration: `${1.2 + (i % 3) * 0.2}s`,
                    }}
                  />
                );
              })}

              {/* Volumetric Moving Head Light Beam (Cones) */}
              <polygon
                points={`250,550 ${movingHeadX * 6.5 - 60},${movingHeadY * 3.5} ${movingHeadX * 6.5 + 60},${movingHeadY * 3.5}`}
                fill="url(#beamGradient)"
                opacity="0.45"
              />

              <defs>
                <linearGradient id="beamGradient" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#39ff14" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#39ff14" stopOpacity="0.0" />
                </linearGradient>
              </defs>
            </svg>

            {/* Moving Head Target Crosshair */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center z-20"
              style={{ left: `${movingHeadX}%`, top: `${movingHeadY}%` }}
            >
              <Crosshair className="w-8 h-8 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
              <span className="text-[9px] font-mono text-emerald-300 bg-black/80 px-1 rounded border border-emerald-500/50">
                BEAM TARGET [{movingHeadX}, {movingHeadY}]
              </span>
            </div>

            {/* HUD Status */}
            <div className="absolute bottom-4 left-4 text-xs font-mono text-emerald-400 bg-black/80 px-2.5 py-1 rounded border border-emerald-500/40">
              UNIFIED STAGE: {physicalDmxFixtures.length} PHYSICAL FIXTURES • E1.31 UNIVERSE {activeDmxUniverse}
            </div>
          </div>
        </div>

        {/* Right Panel: Moving Head Joystick & Fixture Inspector (Cols 3) */}
        <div className="col-span-3 border-l border-[#1b2638] bg-[#090f19] p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="pb-2 border-b border-[#1b2638] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-emerald-400" /> Moving Head XY Pad
            </span>
            <button
              type="button"
              onClick={() => setIsSimulatingChase(!isSimulatingChase)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                isSimulatingChase ? 'bg-emerald-600 text-white' : 'bg-[#152033] text-slate-400'
              }`}
            >
              {isSimulatingChase ? 'Figure-8 Auto' : 'Manual'}
            </button>
          </div>

          {/* Interactive XY Joystick Pad */}
          <div
            className="w-full h-44 rounded-lg bg-[#0b101a] border border-[#1e2a3c] relative cursor-crosshair overflow-hidden shadow-inner flex items-center justify-center"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
              const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
              setMovingHeadTarget(x, y);
              setIsSimulatingChase(false);
            }}
          >
            {/* Grid lines */}
            <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none opacity-20">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="border border-emerald-500/30" />
              ))}
            </div>

            {/* Target Reticle */}
            <div
              className="absolute w-5 h-5 rounded-full border-2 border-emerald-400 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center bg-emerald-500/30 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
              style={{ left: `${movingHeadX}%`, top: `${movingHeadY}%` }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
          </div>

          {/* Selected Fixture Settings */}
          {selectedFixture && (
            <div className="p-3 rounded-lg bg-[#0c121e] border border-[#1b2638] space-y-3 text-xs">
              <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wide">
                Config: {selectedFixture.name}
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase">IP / Node Address</label>
                <div className="flex items-center gap-1.5 mt-1">
                  <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <input
                    type="text"
                    value={selectedFixture.ipAddress}
                    onChange={(e) =>
                      updateDmxFixture(selectedFixture.id, { ipAddress: e.target.value })
                    }
                    className="flex-1 bg-[#121a28] border border-[#233248] rounded px-2 py-1 font-mono text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Universe</label>
                  <input
                    type="number"
                    value={selectedFixture.universe}
                    onChange={(e) =>
                      updateDmxFixture(selectedFixture.id, {
                        universe: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full mt-1 bg-[#121a28] border border-[#233248] rounded px-2 py-1 font-mono text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase">Start Channel</label>
                  <input
                    type="number"
                    value={selectedFixture.startChannel}
                    onChange={(e) =>
                      updateDmxFixture(selectedFixture.id, {
                        startChannel: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full mt-1 bg-[#121a28] border border-[#233248] rounded px-2 py-1 font-mono text-slate-200"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold uppercase">
                  <span>Dimmer Level</span>
                  <span className="font-mono text-emerald-400">{selectedFixture.dimmer}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={selectedFixture.dimmer}
                  onChange={(e) =>
                    updateDmxFixture(selectedFixture.id, {
                      dimmer: parseInt(e.target.value),
                    })
                  }
                  className="w-full accent-emerald-400 mt-1"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
