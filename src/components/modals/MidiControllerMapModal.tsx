import React, { useState } from 'react';
import { X, Sliders, Radio, Check, Sparkles, RefreshCw, Cpu, Activity } from 'lucide-react';
import { useProjectionStore } from '../../store/useProjectionStore';
import { DEFAULT_MIDI_BINDINGS, midiHardwareManager } from '../../utils/midiOscController';

export const MidiControllerMapModal: React.FC = () => {
  const { isMidiControllerModalOpen, setIsMidiControllerModalOpen } = useProjectionStore();

  const [activeLearnId, setActiveLearnId] = useState<string | null>(null);
  const [bindings, setBindings] = useState(DEFAULT_MIDI_BINDINGS);

  if (!isMidiControllerModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0b121e] border border-[#213047] rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans select-none">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1b2638] flex items-center justify-between bg-[#0e1626]">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                MIDI / OSC / StreamDeck Hardware Controller Mapper
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                WebMIDI API • Akai APC40 / Novation Launchpad / Korg nanoKONTROL
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsMidiControllerModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2538] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh] text-xs">
          {/* Connected Device Status */}
          <div className="p-3.5 rounded-xl bg-[#080d16] border border-[#1f2d42] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <div>
                <div className="font-bold text-slate-200">Akai Professional APC40 MKII (USB MIDI)</div>
                <div className="text-[10px] text-slate-400 font-mono">Status: Connected • 8 Channel Strips + Master</div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 font-bold">
              ONLINE
            </span>
          </div>

          {/* MIDI Learn Table */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between">
              <span>Software Target Parameter</span>
              <span>MIDI Channel / CC#</span>
            </div>

            {bindings.map((b) => (
              <div
                key={b.id}
                className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                  activeLearnId === b.id
                    ? 'bg-cyan-600/20 border-cyan-500 shadow-md animate-pulse'
                    : 'bg-[#0e1624] border-[#1b2638]'
                }`}
              >
                <div>
                  <div className="font-bold text-slate-200">{b.actionName}</div>
                  <div className="text-[10px] text-cyan-400 font-mono mt-0.5">
                    Target: {b.targetParameter}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-300 font-semibold bg-[#080d16] px-2 py-1 rounded border border-[#1f2d42]">
                    Ch {b.channel} • {b.messageType.toUpperCase()} #{b.noteOrCcNumber}
                  </span>

                  <button
                    type="button"
                    onClick={() => setActiveLearnId(activeLearnId === b.id ? null : b.id)}
                    className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                      activeLearnId === b.id
                        ? 'bg-cyan-500 text-black'
                        : 'bg-[#182438] hover:bg-[#20304a] text-cyan-300 border border-[#233550]'
                    }`}
                  >
                    {activeLearnId === b.id ? 'Move Fader...' : 'MIDI Learn'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1b2638] bg-[#0c121e] flex justify-end">
          <button
            type="button"
            onClick={() => setIsMidiControllerModalOpen(false)}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase flex items-center gap-1.5 shadow-md shadow-cyan-900/40"
          >
            <Check className="w-4 h-4" /> Save Hardware Map
          </button>
        </div>
      </div>
    </div>
  );
};
