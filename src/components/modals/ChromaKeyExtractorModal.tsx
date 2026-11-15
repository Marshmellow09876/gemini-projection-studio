import React, { useState } from 'react';
import { X, Pipette, Sliders, Check, Sparkles, Image, RefreshCw } from 'lucide-react';
import { useProjectionStore } from '../../store/useProjectionStore';

export const ChromaKeyExtractorModal: React.FC = () => {
  const { isChromaKeyModalOpen, setIsChromaKeyModalOpen } = useProjectionStore();

  const [keyColor, setKeyColor] = useState<string>('#00ff00');
  const [similarity, setSimilarity] = useState<number>(0.4);
  const [smoothness, setSmoothness] = useState<number>(0.15);
  const [spillSuppression, setSpillSuppression] = useState<number>(0.7);

  if (!isChromaKeyModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0b121e] border border-[#213047] rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans select-none">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1b2638] flex items-center justify-between bg-[#0e1626]">
          <div className="flex items-center gap-2.5">
            <Pipette className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                Chroma-Key & Alpha Prop Extractor
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Green / Blue / Luma Screen Background Keying & Spill Suppression
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsChromaKeyModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2538] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh] text-xs">
          {/* Dual Preview: Source vs Keyed Alpha */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 rounded-xl bg-[#080d16] border border-[#1f2d42]">
              <div className="text-[10px] text-slate-400 font-mono uppercase mb-2">Original Green Screen Feed</div>
              <div
                className="w-full h-32 rounded-lg flex items-center justify-center text-xs font-bold shadow-inner relative overflow-hidden"
                style={{ backgroundColor: keyColor }}
              >
                <div className="p-3 bg-white/90 rounded-full text-slate-900 shadow-lg font-bold">
                  Floating Ghost Prop
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#080d16] border border-[#1f2d42]">
              <div className="text-[10px] text-slate-400 font-mono uppercase mb-2">Keyed Transparent Alpha Output</div>
              <div className="w-full h-32 rounded-lg flex items-center justify-center text-xs font-bold shadow-inner relative overflow-hidden bg-[radial-gradient(#26354a_1px,transparent_1px)] bg-[size:12px_12px] bg-[#0c131f]">
                <div className="p-3 bg-cyan-400/90 rounded-full text-slate-900 shadow-[0_0_20px_rgba(34,211,238,0.8)] font-bold">
                  Transparent Ghost
                </div>
              </div>
            </div>
          </div>

          {/* Key Color Picker */}
          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Key Color Target
            </label>
            <div className="flex items-center gap-3 mt-1.5">
              <input
                type="color"
                value={keyColor}
                onChange={(e) => setKeyColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-[#233550] cursor-pointer bg-transparent"
              />
              <div className="flex gap-2">
                {[
                  { name: 'Green Screen', hex: '#00ff00' },
                  { name: 'Blue Screen', hex: '#0000ff' },
                  { name: 'Luma Black', hex: '#000000' },
                ].map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setKeyColor(preset.hex)}
                    className="px-2.5 py-1.5 rounded bg-[#121a28] hover:bg-[#1a2538] border border-[#233248] text-slate-300 font-semibold text-[11px]"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Color Similarity Threshold</label>
                <span className="font-mono text-emerald-400 font-bold">{Math.round(similarity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={similarity}
                onChange={(e) => setSimilarity(parseFloat(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Edge Feather & Smoothness</label>
                <span className="font-mono text-emerald-400 font-bold">{Math.round(smoothness * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.02"
                value={smoothness}
                onChange={(e) => setSmoothness(parseFloat(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Spill Suppression Gain</label>
                <span className="font-mono text-emerald-400 font-bold">{Math.round(spillSuppression * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={spillSuppression}
                onChange={(e) => setSpillSuppression(parseFloat(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1b2638] bg-[#0c121e] flex justify-end">
          <button
            type="button"
            onClick={() => setIsChromaKeyModalOpen(false)}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase flex items-center gap-1.5 shadow-md shadow-emerald-900/40"
          >
            <Check className="w-4 h-4" /> Apply Chroma Filter to Clip
          </button>
        </div>
      </div>
    </div>
  );
};
