import React, { useState } from 'react';
import {
  Radio,
  Thermometer,
  CloudRain,
  Volume2,
  VolumeX,
  Sparkles,
  RefreshCw,
  Trash2,
  Download,
  AlertTriangle,
  ShieldCheck,
  Cpu,
  Clock,
  Play,
  Check,
} from 'lucide-react';
import { useProjectionStore } from '../store/useProjectionStore';

export const Screen18BroadcastDiagnostics: React.FC = () => {
  const {
    broadcastHealth,
    renderQueue,
    setBroadcastParams,
    addRenderJob,
    cancelRenderJob,
    retryRenderJob,
    setIsShowExportModalOpen,
  } = useProjectionStore();

  const [testRadioSuccess, setTestRadioSuccess] = useState<boolean>(false);

  const handleTestRdsBroadcast = () => {
    setTestRadioSuccess(true);
    setTimeout(() => setTestRadioSuccess(false), 2500);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#070b13] text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. TOP HEADER BAR */}
      <div className="h-12 bg-[#0c121d] border-b border-[#1b2638] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-rose-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Broadcast RDS, Weather Safety & Render Farm Center
          </span>
          <span className="text-[10px] font-mono text-rose-400 bg-rose-950/60 border border-rose-800 px-2 py-0.5 rounded">
            Mission Control Operations
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsShowExportModalOpen(true)}
          className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase flex items-center gap-1.5 shadow-md shadow-rose-900/40"
        >
          <Download className="w-3.5 h-3.5" />
          Export Kiosk Appliance (Pi / PC)
        </button>
      </div>

      {/* 2. 4-QUADRANT MISSION CONTROL GRID */}
      <div className="flex-1 grid grid-cols-2 grid-rows-2 p-4 gap-4 overflow-y-auto bg-[#05080e]">
        {/* Quadrant 1: FM Radio Transmitter & RDS Studio */}
        <div className="rounded-xl border border-[#1f2d42] bg-[#090f19] p-4 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#1b2638] mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" /> FM Radio & RDS Station
              </span>
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                {broadcastHealth.fmFrequencyMHz.toFixed(1)} MHz FM
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase">FM Carrier Frequency</label>
                <div className="flex items-center gap-3 mt-1">
                  <input
                    type="range"
                    min="87.9"
                    max="107.9"
                    step="0.2"
                    value={broadcastHealth.fmFrequencyMHz}
                    onChange={(e) =>
                      setBroadcastParams({ fmFrequencyMHz: parseFloat(e.target.value) })
                    }
                    className="flex-1 accent-cyan-400"
                  />
                  <span className="font-mono text-cyan-300 font-bold w-16 text-right">
                    {broadcastHealth.fmFrequencyMHz.toFixed(1)} MHz
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase">RDS Station Identifier (PS)</label>
                <input
                  type="text"
                  maxLength={8}
                  value={broadcastHealth.fmStationCall}
                  onChange={(e) => setBroadcastParams({ fmStationCall: e.target.value.toUpperCase() })}
                  className="w-full mt-1 bg-[#121a28] border border-[#233248] rounded px-2.5 py-1.5 font-mono text-slate-200 font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase">Dynamic RadioText (RT)</label>
                <input
                  type="text"
                  value={broadcastHealth.fmRdsRadioText}
                  onChange={(e) => setBroadcastParams({ fmRdsRadioText: e.target.value })}
                  className="w-full mt-1 bg-[#121a28] border border-[#233248] rounded px-2.5 py-1.5 text-slate-200 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#1b2638] mt-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={broadcastHealth.showOnScreenFmBug}
                onChange={(e) => setBroadcastParams({ showOnScreenFmBug: e.target.checked })}
                className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
              />
              <span className="text-xs text-slate-300 font-semibold">Project "Tune To 89.7 FM" Corner Bug</span>
            </div>
            <button
              type="button"
              onClick={handleTestRdsBroadcast}
              className="px-2.5 py-1 rounded bg-[#162132] hover:bg-[#202f47] border border-[#233550] text-cyan-300 font-bold text-xs"
            >
              {testRadioSuccess ? 'Transmitted RDS!' : 'Send RDS Ping'}
            </button>
          </div>
        </div>

        {/* Quadrant 2: Weather, Thermal & Dew-Point Guard */}
        <div className="rounded-xl border border-[#1f2d42] bg-[#090f19] p-4 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#1b2638] mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-amber-400" /> Weather & Thermal Guard
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> All Safe
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#0c121e] border border-[#1b2638]">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Exhaust Temp</div>
                <div className="text-lg font-mono font-bold text-amber-300 mt-1">
                  {broadcastHealth.enclosureTempF.toFixed(1)}°F
                </div>
                <div className="text-[9px] text-slate-500 font-mono">Limit: 95.0°F (Auto-off)</div>
              </div>

              <div className="p-3 rounded-lg bg-[#0c121e] border border-[#1b2638]">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Enclosure Humidity</div>
                <div className="text-lg font-mono font-bold text-cyan-300 mt-1">
                  {broadcastHealth.enclosureHumidityPercent}%
                </div>
                <div className="text-[9px] text-slate-500 font-mono">Dew Point Margin: +14°F</div>
              </div>

              <div className="p-3 rounded-lg bg-[#0c121e] border border-[#1b2638]">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Outdoor Wind Speed</div>
                <div className="text-lg font-mono font-bold text-slate-200 mt-1">
                  8.4 MPH
                </div>
                <div className="text-[9px] text-slate-500 font-mono">Gust Limit: 30 MPH</div>
              </div>

              <div className="p-3 rounded-lg bg-[#0c121e] border border-[#1b2638]">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Optical Rain Sensor</div>
                <div className="text-lg font-mono font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Clear & Dry
                </div>
                <div className="text-[9px] text-slate-500 font-mono">Status: 0.0 mm/hr</div>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#141d2d] border border-[#1f2d42] text-[11px] text-slate-300 flex items-center justify-between mt-3">
            <span>Emergency Lamp Auto-Off Protection:</span>
            <span className="font-bold text-emerald-400 uppercase">ARMED & ACTIVE</span>
          </div>
        </div>

        {/* Quadrant 3: Neighbor Courtesy & Acoustic dB(A) */}
        <div className="rounded-xl border border-[#1f2d42] bg-[#090f19] p-4 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#1b2638] mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-emerald-400" /> Acoustic dB(A) & Light Spill
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {broadcastHealth.liveDecibelSpl.toFixed(1)} dB(A) SPL
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <label className="text-[10px] uppercase font-semibold text-slate-400">Acoustic SPL Meter</label>
                  <span className="font-mono text-emerald-400">{broadcastHealth.liveDecibelSpl} / {broadcastHealth.maxSplLimitDb} dB</span>
                </div>
                <div className="w-full bg-[#121a28] h-3 rounded-full overflow-hidden border border-[#233248]">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 transition-all"
                    style={{ width: `${(broadcastHealth.liveDecibelSpl / broadcastHealth.maxSplLimitDb) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <label className="text-[10px] uppercase font-semibold text-slate-400">Sky & Neighbor Stray Light Spill</label>
                  <span className="font-mono text-cyan-400">{broadcastHealth.skyLightSpillPercent}%</span>
                </div>
                <div className="w-full bg-[#121a28] h-3 rounded-full overflow-hidden border border-[#233248]">
                  <div
                    className="h-full bg-cyan-400 transition-all"
                    style={{ width: `${broadcastHealth.skyLightSpillPercent * 5}%` }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#101724] border border-[#1e2a3c] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-200">Scheduled 10:00 PM Whisper Mode</div>
                  <div className="text-[10px] text-slate-400">Lowers outdoor audio and dims facade lumens</div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setBroadcastParams({ curfewMuteActive: !broadcastHealth.curfewMuteActive })
                  }
                  className={`w-9 h-5 rounded-full transition-colors relative ${
                    broadcastHealth.curfewMuteActive ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                      broadcastHealth.curfewMuteActive ? 'translate-x-4' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="text-[10px] font-mono text-slate-400 mt-2">
            HOA Noise Ordinance Compliance: PASS (Threshold 85.0 dB)
          </div>
        </div>

        {/* Quadrant 4: Overnight Batch AI Render Farm */}
        <div className="rounded-xl border border-[#1f2d42] bg-[#090f19] p-4 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#1b2638] mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-fuchsia-400" /> Overnight AI Render Farm
              </span>
              <span className="text-xs font-mono font-bold text-fuchsia-400">
                {renderQueue.length} Jobs Queued
              </span>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-48 pr-1 text-xs">
              {renderQueue.map((job) => (
                <div
                  key={job.id}
                  className="p-2.5 rounded-lg bg-[#0c121e] border border-[#1b2638] flex items-center justify-between"
                >
                  <div className="truncate mr-2">
                    <div className="font-bold text-slate-200 truncate">{job.title}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {job.category} • {job.status.toUpperCase()} ({job.progress}%)
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {job.status === 'rendering' && (
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800">
                        {job.estimatedSec}s left
                      </span>
                    )}
                    {job.status === 'completed' && (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                        Ready
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => cancelRenderJob(job.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-[#1b2638] flex justify-between items-center text-xs">
            <span className="text-slate-400 font-mono text-[10px]">IndexedDB Crash Recovery: ON</span>
            <button
              type="button"
              onClick={() =>
                addRenderJob({
                  title: 'Haunted Mansion Ectoplasm Storm 4K',
                  prompt: 'Green ectoplasm storm rushing across ranch windows',
                  category: 'Halloween',
                  status: 'queued',
                  progress: 0,
                  estimatedSec: 35,
                })
              }
              className="px-2.5 py-1 rounded bg-[#162132] hover:bg-[#202f47] border border-[#233550] text-fuchsia-300 font-bold text-[11px]"
            >
              + Queue Job
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
