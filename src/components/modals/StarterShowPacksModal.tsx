import React, { useState } from 'react';
import {
  Sparkles,
  Play,
  CheckCircle2,
  X,
  Compass,
  Music,
  Layers,
  ShieldCheck,
  Wand2,
} from 'lucide-react';
import {
  STARTER_SHOW_PACKS,
  StarterPackId,
  loadStarterShowPack,
} from '../../utils/starterShowPacks';
import { useProjectionStore } from '../../store/useProjectionStore';
import { playManualCueSound } from '../../utils/soundEffects';

interface StarterShowPacksModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const StarterShowPacksModal: React.FC<StarterShowPacksModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
}) => {
  const {
    isStarterPacksModalOpen,
    setIsStarterPacksModalOpen,
    setActiveScreen,
    setIsSpotlightTourActive,
    setSpotlightTourStep,
  } = useProjectionStore();

  const isOpen = propIsOpen ?? isStarterPacksModalOpen;
  const handleClose = () => {
    if (propOnClose) propOnClose();
    else setIsStarterPacksModalOpen(false);
  };

  const [loadedId, setLoadedId] = useState<StarterPackId | null>(null);

  if (!isOpen) return null;

  const handleLoadPack = (packId: StarterPackId, startTourAfter = false) => {
    const loaded = loadStarterShowPack(packId);
    if (!loaded) return;
    setLoadedId(packId);
    playManualCueSound('chime');
    handleClose();

    if (startTourAfter) {
      setSpotlightTourStep(1);
      setIsSpotlightTourActive(true);
      setActiveScreen(2);
    } else {
      setActiveScreen(7);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Holiday In a Box Starter Show Packs"
    >
      <div className="w-full max-w-5xl bg-[#0c1320] border border-[#24344d] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#101a2d] via-[#13223b] to-[#101a2d] border-b border-[#24344d] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 border border-emerald-400/50 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Holiday In a Box — 1-Click Starter Shows</span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Beginner Friendly
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Skip the blank canvas! Load a complete pre-traced show with window blackout masks, audio beat cues &amp; holiday video in one click.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-lg bg-[#162135] hover:bg-[#1f2e47] text-slate-300 hover:text-white border border-[#2a3b57] transition-colors cursor-pointer"
            aria-label="Close Starter Shows"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Starter Cards Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-5">
          {STARTER_SHOW_PACKS.map((pack) => {
            const isLoaded = loadedId === pack.id;
            return (
              <div
                key={pack.id}
                className={`rounded-xl border transition-all overflow-hidden flex flex-col bg-[#101827] ${
                  isLoaded
                    ? 'border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.2)]'
                    : 'border-[#22314a] hover:border-cyan-500/50'
                }`}
              >
                {/* Visual Banner */}
                <div
                  className={`relative h-36 bg-gradient-to-br ${pack.previewGradient} overflow-hidden border-b border-[#22314a]`}
                >
                  <img
                    src={pack.referenceImageUrl}
                    alt={pack.title}
                    className="w-full h-full object-cover opacity-55 mix-blend-luminosity"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#101827] via-transparent to-transparent" />

                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-slate-950/85 border border-slate-700/80 text-xs font-bold text-white flex items-center gap-1.5 backdrop-blur-sm">
                      <span>{pack.emoji}</span>
                      <span>{pack.holidayBadge}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-bold text-emerald-300 backdrop-blur-sm">
                      {pack.recommendedBpm} BPM
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-white drop-shadow">
                        {pack.title}
                      </h3>
                      <p className="text-xs text-slate-300">{pack.subtitle}</p>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {pack.description}
                    </p>

                    <div className="grid grid-cols-2 gap-1.5">
                      {pack.highlights.map((h, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 text-[11px] text-slate-200 bg-[#152033] px-2 py-1 rounded-md border border-[#22324d]"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">{h}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-cyan-400" />
                        {pack.layers.length} shapes
                      </span>
                      <span className="flex items-center gap-1">
                        <Music className="w-3.5 h-3.5 text-fuchsia-400" />
                        {pack.beatFlags.length} beat cues
                      </span>
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        Window Blackout ON
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-[#1d2b40]">
                    <button
                      type="button"
                      onClick={() => handleLoadPack(pack.id, false)}
                      className="flex-1 py-2 px-3 rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Load &amp; Open Showtime</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadPack(pack.id, true)}
                      title="Load this show and walk through how the outlines and videos work"
                      className="py-2 px-3 rounded-lg bg-[#182438] hover:bg-[#22324d] border border-slate-600/80 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Compass className="w-3.5 h-3.5 text-amber-400" />
                      <span>Inspect Step-by-Step</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Tip */}
        <div className="px-6 py-3 bg-[#080d16] border-t border-[#1e2d47] flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-cyan-400" />
            <span>
              Tip: After loading any starter show, press{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px]">
                W
              </kbd>{' '}
              on the Map screen to fit it onto your real wall or house in 30 seconds!
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};
