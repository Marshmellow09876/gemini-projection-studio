import React, { useState } from 'react';
import { X, Radio, Type, Sparkles, Check, Sliders, Volume2, Send } from 'lucide-react';
import { useProjectionStore } from '../../store/useProjectionStore';
import {
  FM_SHOW_PRESETS,
  generateRdsBroadcastPacket,
  dispatchRdsBroadcast,
} from '../../utils/fmRdsBroadcaster';

export const FmRadioSignModal: React.FC = () => {
  const { isFmRadioSignModalOpen, setIsFmRadioSignModalOpen, broadcastHealth, setBroadcastParams, showToast } =
    useProjectionStore();

  const [signText, setSignText] = useState<string>('TUNE RADIO TO 89.7 FM');
  const [signFont, setSignFont] = useState<'neon' | 'digital' | 'gothic'>('neon');
  const [signColor, setSignColor] = useState<string>('#00f0ff');
  const [intermissionAnnouncement, setIntermissionAnnouncement] = useState<boolean>(true);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);

  if (!isFmRadioSignModalOpen) return null;

  const handleApplyPreset = (idx: number) => {
    setSelectedPresetIndex(idx);
    const p = FM_SHOW_PRESETS[idx];
    setSignText(`TUNE 89.7 FM • ${p.ps}`);
  };

  const handleBroadcastRds = async () => {
    setIsBroadcasting(true);
    const preset = FM_SHOW_PRESETS[selectedPresetIndex];
    const packet = generateRdsBroadcastPacket(preset.ps, preset.label);
    const res = await dispatchRdsBroadcast('mock://fm-transmitter/rds', packet);
    setIsBroadcasting(false);
    showToast?.(res.message);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#0b121e] border border-[#213047] rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans select-none">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1b2638] flex items-center justify-between bg-[#0e1626]">
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                FM Radio & "Tune To Sign" Overlay Designer
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Projected Corner Bug & LED Pixel Matrix Sign Stencil
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsFmRadioSignModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2538] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh] text-xs">
          {/* Sign Preview Box */}
          <div className="p-4 rounded-xl bg-black border border-[#1f2d42] flex items-center justify-center h-28 relative overflow-hidden shadow-2xl">
            <div
              className="text-lg font-bold tracking-widest text-center"
              style={{
                color: signColor,
                textShadow: `0 0 14px ${signColor}, 0 0 28px ${signColor}`,
                fontFamily: signFont === 'digital' ? 'monospace' : 'sans-serif',
              }}
            >
              📻 {signText}
            </div>
            <div className="absolute top-2 left-2 text-[9px] font-mono text-slate-500 uppercase">
              Projected On-House Preview
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Sign Banner Text
            </label>
            <input
              type="text"
              value={signText}
              onChange={(e) => setSignText(e.target.value)}
              className="w-full mt-1.5 bg-[#121a28] border border-[#233248] rounded px-3 py-2 text-slate-200 font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Font Typestyle
              </label>
              <div className="flex gap-2 mt-1.5">
                {(['neon', 'digital', 'gothic'] as const).map((font) => (
                  <button
                    key={font}
                    type="button"
                    onClick={() => setSignFont(font)}
                    className={`flex-1 py-1.5 rounded uppercase font-semibold text-[10px] border transition-all ${
                      signFont === font
                        ? 'bg-cyan-600 text-white border-cyan-400'
                        : 'bg-[#101724] text-slate-400 border-[#1f2d42]'
                    }`}
                  >
                    {font}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Neon Glow Color
              </label>
              <div className="flex items-center gap-2 mt-1.5">
                <input
                  type="color"
                  value={signColor}
                  onChange={(e) => setSignColor(e.target.value)}
                  className="w-8 h-8 rounded border border-[#233248] cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={signColor}
                  onChange={(e) => setSignColor(e.target.value)}
                  className="flex-1 bg-[#121a28] border border-[#233248] rounded px-2 py-1 font-mono text-slate-200 uppercase"
                />
              </div>
            </div>
          </div>

          {/* Dynamic RDS Show Presets */}
          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">
              FM RDS Dynamic "Now Playing" Show Presets
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FM_SHOW_PRESETS.map((preset, idx) => (
                <button
                  key={preset.ps}
                  type="button"
                  onClick={() => handleApplyPreset(idx)}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    selectedPresetIndex === idx
                      ? 'bg-cyan-600/20 border-cyan-500 text-cyan-200'
                      : 'bg-[#101724] border-[#1f2d42] text-slate-300 hover:bg-[#162030]'
                  }`}
                >
                  <div className="font-bold text-[11px] truncate">{preset.label}</div>
                  <div className="text-[9px] font-mono text-cyan-400 mt-0.5">PS: {preset.ps}</div>
                  <div className="text-[8.5px] font-mono text-slate-400 truncate">{preset.rt}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0c121e] border border-[#1b2638] flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-200">Periodic Voiceover Audio Announcement</div>
              <div className="text-[10px] text-slate-400">Plays "Please tune car radio to 89.7 FM" every 3 clips</div>
            </div>
            <input
              type="checkbox"
              checked={intermissionAnnouncement}
              onChange={(e) => setIntermissionAnnouncement(e.target.checked)}
              className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1b2638] bg-[#0c121e] flex items-center justify-between">
          <button
            type="button"
            onClick={handleBroadcastRds}
            disabled={isBroadcasting}
            className="px-3.5 py-2 rounded-lg bg-[#182338] hover:bg-[#22334e] border border-cyan-500/50 text-cyan-300 hover:text-white font-bold text-xs uppercase flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isBroadcasting ? 'Broadcasting...' : 'Broadcast RDS to Cars'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFmRadioSignModalOpen(false)}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase flex items-center gap-1.5 shadow-md shadow-cyan-900/40 cursor-pointer"
          >
            <Check className="w-4 h-4" /> Save Sign Settings
          </button>
        </div>
      </div>
    </div>
  );
};
