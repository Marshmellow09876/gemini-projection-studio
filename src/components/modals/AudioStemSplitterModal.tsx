import React, { useState } from 'react';
import { X, Sliders, Music, Volume2, VolumeX, Sparkles, Check, Play, Pause } from 'lucide-react';
import { useProjectionStore } from '../../store/useProjectionStore';
import { INITIAL_AUDIO_STEMS, AudioStemChannel } from '../../utils/stemSplitter';

export const AudioStemSplitterModal: React.FC = () => {
  const { isStemSplitterOpen, setIsStemSplitterOpen } = useProjectionStore();

  const [stemFaders, setStemFaders] = useState<Record<string, number>>({
    vocals: 85,
    drums: 100,
    bass: 90,
    melody: 75,
  });

  const [stemMutes, setStemMutes] = useState<Record<string, boolean>>({
    vocals: false,
    drums: false,
    bass: false,
    melody: false,
  });

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [splitComplete, setSplitComplete] = useState<boolean>(true);

  if (!isStemSplitterOpen) return null;

  const handleRunSplit = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setSplitComplete(true);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0b121e] border border-[#213047] rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans select-none">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1b2638] flex items-center justify-between bg-[#0e1626]">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                AI 4-Stem Audio Splitter & EQ Routing Mixer
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Demucs WebAudio Frequency Separation (Vocals, Drums, Bass, Melody)
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsStemSplitterOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2538] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh] text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#080d16] border border-[#1f2d42]">
            <div className="flex items-center gap-3">
              <Music className="w-5 h-5 text-cyan-400" />
              <div>
                <div className="font-bold text-slate-200">Active Audio: Ghostbusters Theme (Ray Parker Jr.)</div>
                <div className="text-[10px] text-slate-400 font-mono">Duration: 01:24 • 128 BPM • 44.1 kHz</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRunSplit}
              disabled={isProcessing}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isProcessing ? 'Separating Stems...' : 'Re-Separate Stems'}
            </button>
          </div>

          {/* 4 Stem Faders */}
          <div className="grid grid-cols-4 gap-3">
            {INITIAL_AUDIO_STEMS.map((stem: AudioStemChannel) => {
              const val = stemFaders[stem.id] ?? 80;
              const isMuted = stemMutes[stem.id] ?? false;

              return (
                <div
                  key={stem.id}
                  className="p-3 rounded-xl bg-[#0e1624] border border-[#1b2638] flex flex-col items-center gap-3"
                >
                  <div className="font-bold uppercase tracking-wider text-xs truncate max-w-[120px]" style={{ color: stem.color }}>
                    {stem.label.split(' ')[0]}
                  </div>

                  {/* Vertical Fader Simulation */}
                  <div className="h-32 flex items-center justify-center">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={isMuted ? 0 : val}
                      onChange={(e) =>
                        setStemFaders({ ...stemFaders, [stem.id]: parseInt(e.target.value) })
                      }
                      className="w-28 -rotate-90 accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  <div className="font-mono text-[11px] text-slate-300 font-bold">{isMuted ? 'MUTE' : `${val}%`}</div>

                  <button
                    type="button"
                    onClick={() =>
                      setStemMutes({ ...stemMutes, [stem.id]: !isMuted })
                    }
                    className={`w-full py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                      isMuted
                        ? 'bg-rose-600 text-white'
                        : 'bg-[#182335] text-slate-300 hover:text-white'
                    }`}
                  >
                    {isMuted ? 'Unmute' : 'Mute'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Target Surface Binding Info */}
          <div className="p-3 rounded-lg bg-[#0c121e] border border-[#1b2638] space-y-1.5 text-slate-400 text-[11px]">
            <div className="font-bold text-slate-200 uppercase">One-Click Hardware & Layer Routing</div>
            <div className="flex justify-between">
              <span>Vocals Stem:</span>
              <span className="text-cyan-400 font-bold">Routed to Screen 13 Singing Characters</span>
            </div>
            <div className="flex justify-between">
              <span>Drums & Bass:</span>
              <span className="text-cyan-400 font-bold">Routed to Screen 14 DMX Strobes & Garage Flash</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1b2638] bg-[#0c121e] flex justify-end">
          <button
            type="button"
            onClick={() => setIsStemSplitterOpen(false)}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase"
          >
            Save Stem Routing
          </button>
        </div>
      </div>
    </div>
  );
};
