import React, { useState } from 'react';
import { X, ShieldAlert, Thermometer, CloudRain, Wind, AlertTriangle, Check, Bell } from 'lucide-react';
import { useProjectionStore } from '../../store/useProjectionStore';

export const HardwareSafetyRulesModal: React.FC = () => {
  const { isHardwareSafetyModalOpen, setIsHardwareSafetyModalOpen } = useProjectionStore();

  const [maxTempLimit, setMaxTempLimit] = useState<number>(145);
  const [maxWindLimit, setMaxWindLimit] = useState<number>(28);
  const [rainShutoffActive, setRainShutoffActive] = useState<boolean>(true);
  const [fanCoolDownMinutes, setFanCoolDownMinutes] = useState<number>(5);

  if (!isHardwareSafetyModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#0b121e] border border-[#213047] rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans select-none">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1b2638] flex items-center justify-between bg-[#0e1626]">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <div>
              <div className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                Weather, Thermal & Dew-Point Safety Rules
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Automated Hardware Failsafes & Emergency Lamp Shutoff
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsHardwareSafetyModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2538] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh] text-xs">
          {/* Temperature Limit */}
          <div className="p-3.5 rounded-xl bg-[#0c121e] border border-[#1b2638] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Thermometer className="w-4 h-4 text-amber-400" /> Enclosure Overheat Auto-Shutoff
              </span>
              <span className="font-mono text-amber-400 font-bold">{maxTempLimit}°F</span>
            </div>
            <input
              type="range"
              min="110"
              max="165"
              step="1"
              value={maxTempLimit}
              onChange={(e) => setMaxTempLimit(parseInt(e.target.value))}
              className="w-full accent-amber-400"
            />
            <div className="text-[10px] text-slate-400">
              Immediately blacks out projector lamps if internal exhaust temp exceeds threshold.
            </div>
          </div>

          {/* Wind Speed Limit */}
          <div className="p-3.5 rounded-xl bg-[#0c121e] border border-[#1b2638] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Wind className="w-4 h-4 text-cyan-400" /> High Wind Gust Safety Shutoff
              </span>
              <span className="font-mono text-cyan-400 font-bold">{maxWindLimit} MPH</span>
            </div>
            <input
              type="range"
              min="15"
              max="45"
              step="1"
              value={maxWindLimit}
              onChange={(e) => setMaxWindLimit(parseInt(e.target.value))}
              className="w-full accent-cyan-400"
            />
            <div className="text-[10px] text-slate-400">
              Protects yard scrims and tower mountings from structural wind damage.
            </div>
          </div>

          {/* Rain Sensor */}
          <div className="p-3.5 rounded-xl bg-[#0c121e] border border-[#1b2638] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-blue-400" />
              <div>
                <div className="font-bold text-slate-200">Optical Rain Sensor Auto-Lamp Off</div>
                <div className="text-[10px] text-slate-400">Engages weather enclosure seals upon first raindrop detection</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={rainShutoffActive}
              onChange={(e) => setRainShutoffActive(e.target.checked)}
              className="w-4 h-4 accent-blue-400 rounded cursor-pointer"
            />
          </div>

          {/* Notification Alert Webhook */}
          <div className="p-3 rounded-lg bg-[#101724] border border-[#1e2a3c] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-slate-300">Push Notification & Home Assistant Webhook</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
              ARMED
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1b2638] bg-[#0c121e] flex justify-end">
          <button
            type="button"
            onClick={() => setIsHardwareSafetyModalOpen(false)}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase flex items-center gap-1.5 shadow-md shadow-rose-900/40"
          >
            <Check className="w-4 h-4" /> Save Safety Thresholds
          </button>
        </div>
      </div>
    </div>
  );
};
