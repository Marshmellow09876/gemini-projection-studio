import React, { useState } from 'react';
import { X, QrCode, Smartphone, Sparkles, Check, ThumbsUp, Gamepad2 } from 'lucide-react';
import { useProjectionStore } from '../../store/useProjectionStore';

export const SpectatorPortalModal: React.FC = () => {
  const { isSpectatorPortalModalOpen, setIsSpectatorPortalModalOpen } = useProjectionStore();

  const [portalGameActive, setPortalGameActive] = useState<boolean>(true);
  const [selectedGame, setSelectedGame] = useState<'ghost-zapper' | 'snowball-toss'>('ghost-zapper');
  const [votingEnabled, setVotingEnabled] = useState<boolean>(true);

  if (!isSpectatorPortalModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0b121e] border border-[#213047] rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans select-none">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1b2638] flex items-center justify-between bg-[#0e1626]">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-fuchsia-400" />
            <div>
              <div className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                Spectator Smartphone QR Portal & Live Game Customizer
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Interactive Sidewalk Audience Web-App & Proton-Beam Mini-Games
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSpectatorPortalModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2538] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 grid grid-cols-12 gap-5 overflow-y-auto max-h-[75vh] text-xs">
          {/* Left Column: Smartphone App Mockup (Cols 5) */}
          <div className="col-span-5 flex flex-col items-center">
            <div className="w-52 h-96 rounded-3xl border-4 border-slate-700 bg-black p-3 flex flex-col justify-between shadow-2xl relative overflow-hidden">
              <div className="w-16 h-3 bg-slate-800 rounded-full mx-auto" />

              {/* Mobile Content */}
              <div className="flex-1 flex flex-col justify-center items-center text-center p-2 space-y-3">
                <div className="text-[11px] font-bold text-fuchsia-400 uppercase tracking-wider">
                  Austin Facade Live
                </div>
                <div className="p-2 bg-white rounded-lg shadow-md">
                  {/* Mock QR */}
                  <QrCode className="w-24 h-24 text-black" />
                </div>
                <div className="text-[10px] font-mono text-slate-300">
                  Scan to Vote or Fire Proton Beams!
                </div>
                {portalGameActive && (
                  <button
                    type="button"
                    className="w-full py-1.5 rounded-lg bg-gradient-to-r from-fuchsia-600 to-cyan-500 text-white font-bold text-[10px] uppercase shadow-lg animate-pulse"
                  >
                    ⚡ Tap to Zap Ghosts!
                  </button>
                )}
              </div>

              <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-1" />
            </div>
          </div>

          {/* Right Column: Portal Settings (Cols 7) */}
          <div className="col-span-7 space-y-4">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Audience URL / QR Destination
              </label>
              <input
                type="text"
                readOnly
                value="https://lumen-show.local/live"
                className="w-full mt-1.5 bg-[#121a28] border border-[#233248] rounded px-3 py-2 font-mono text-cyan-300 font-bold"
              />
            </div>

            {/* Interactive Game Mode */}
            <div className="p-3.5 rounded-xl bg-[#0c121e] border border-[#1b2638] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Gamepad2 className="w-4 h-4 text-fuchsia-400" /> Interactive Projection Arcade
                </div>
                <input
                  type="checkbox"
                  checked={portalGameActive}
                  onChange={(e) => setPortalGameActive(e.target.checked)}
                  className="w-4 h-4 accent-fuchsia-400 rounded cursor-pointer"
                />
              </div>

              <div className="space-y-1.5 pt-1">
                {[
                  { id: 'ghost-zapper', name: 'Ghost Zapper (Proton Beams on House)', desc: 'Tapping phone fires animated lasers at window ghosts' },
                  { id: 'snowball-toss', name: 'Virtual Snowball Splat', desc: 'Fling snowballs that splat across brick siding' },
                ].map((game) => (
                  <div
                    key={game.id}
                    onClick={() => setSelectedGame(game.id as any)}
                    className={`p-2 rounded-lg border cursor-pointer transition-all ${
                      selectedGame === game.id
                        ? 'bg-fuchsia-600/20 text-fuchsia-200 border-fuchsia-500'
                        : 'bg-[#101724] text-slate-400 border-[#1f2d42]'
                    }`}
                  >
                    <div className="font-bold text-xs">{game.name}</div>
                    <div className="text-[10px] opacity-80">{game.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Audience Voting */}
            <div className="p-3.5 rounded-xl bg-[#0c121e] border border-[#1b2638] flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-200">Crowd Next-Song Voting</div>
                <div className="text-[10px] text-slate-400">Spectators vote on next show clip via smartphone</div>
              </div>
              <input
                type="checkbox"
                checked={votingEnabled}
                onChange={(e) => setVotingEnabled(e.target.checked)}
                className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1b2638] bg-[#0c121e] flex justify-end">
          <button
            type="button"
            onClick={() => setIsSpectatorPortalModalOpen(false)}
            className="px-4 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-xs uppercase flex items-center gap-1.5 shadow-md shadow-fuchsia-900/40"
          >
            <Check className="w-4 h-4" /> Save Audience Portal
          </button>
        </div>
      </div>
    </div>
  );
};
