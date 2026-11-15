import React, { useState, useEffect } from 'react';
import {
  User,
  Mic,
  Music,
  Smile,
  Volume2,
  Sparkles,
  Play,
  Pause,
  Plus,
  Trash2,
  Sliders,
  Eye,
  EyeOff,
  RefreshCw,
  Layers,
  MessageSquare,
} from 'lucide-react';
import { useProjectionStore, SingingCharacter } from '../store/useProjectionStore';
import {
  PRESTON_BLAIR_VISEMES,
  generateProceduralVisemeSvg,
  classifyVisemeFromFrequency,
  PrestonBlairViseme,
} from '../utils/phonemeLipSyncEngine';

export const Screen13SingingFacesStudio: React.FC = () => {
  const {
    singingCharacters,
    activeSingingCharacterId,
    singingLipSyncSource,
    jawSensitivity,
    currentPhonemeViseme,
    addSingingCharacter,
    updateSingingCharacter,
    deleteSingingCharacter,
    setActiveSingingCharacterId,
    setSingingLipSyncSource,
    setCurrentPhonemeViseme,
    customReferencePhotoUrl,
  } = useProjectionStore();

  const [isPlayingScript, setIsPlayingScript] = useState<boolean>(true);
  const [pitchShiftSemitones, setPitchShiftSemitones] = useState<number>(-4);
  const [phonemeScrubIndex, setPhonemeScrubIndex] = useState<number>(0);

  const activeChar =
    singingCharacters.find((c) => c.id === activeSingingCharacterId) ||
    singingCharacters[0];

  // Procedural lip-sync mouth animation loop
  useEffect(() => {
    if (!isPlayingScript) return;
    const visemes: SingingCharacter['currentViseme'][] = [
      'Rest',
      'A',
      'E',
      'O',
      'U',
      'M',
      'L',
      'F',
      'W',
    ];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % visemes.length;
      setCurrentPhonemeViseme(visemes[idx]);
      setPhonemeScrubIndex(idx);
    }, 280);
    return () => clearInterval(interval);
  }, [isPlayingScript, setCurrentPhonemeViseme]);

  const mouthSvg = generateProceduralVisemeSvg(
    (activeChar?.currentViseme as PrestonBlairViseme) || 'Rest',
    (activeChar?.jawOpenness ?? 0.6) * jawSensitivity,
    activeChar?.emotion || 'happy'
  );

  return (
    <div className="flex-1 flex flex-col bg-[#070b13] text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. TOP HEADER BAR */}
      <div className="h-12 bg-[#0c121d] border-b border-[#1b2638] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Smile className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            AI Singing Faces, Talking Characters & Lip-Sync Studio
          </span>
          <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded">
            Preston Blair 10-Viseme Rig
          </span>
        </div>

        {/* Input Mode Selector */}
        <div className="flex items-center bg-[#070b12] p-0.5 rounded-lg border border-[#1b2638]">
          {[
            { id: 'stem-vocals', label: 'Audio Vocal Stem' },
            { id: 'live-mic', label: 'Live Mic Puppet' },
            { id: 'phoneme-script', label: 'Text-to-Phoneme' },
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setSingingLipSyncSource(mode.id as any)}
              className={`px-3 py-1 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
                singingLipSyncSource === mode.id
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setIsPlayingScript(!isPlayingScript)}
          className={`px-3 py-1.5 rounded font-bold text-xs uppercase flex items-center gap-1.5 shadow-md ${
            isPlayingScript
              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/40'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
          }`}
        >
          {isPlayingScript ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" /> Pause Puppet
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" /> Live Animate
            </>
          )}
        </button>
      </div>

      {/* 2. MAIN 3-COLUMN WORKSPACE */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Left Panel: Character Rig Library (Cols 3) */}
        <div className="col-span-3 border-r border-[#1b2638] bg-[#090f19] p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="pb-2 border-b border-[#1b2638] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-400" /> Character Rigs & Presets
            </span>
            <button
              type="button"
              onClick={() => addSingingCharacter()}
              className="p-1 rounded bg-[#162132] hover:bg-[#202f47] border border-[#233550] text-amber-400"
              title="Add Character"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {singingCharacters.map((char) => (
              <div
                key={char.id}
                onClick={() => setActiveSingingCharacterId(char.id)}
                className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                  activeSingingCharacterId === char.id
                    ? 'bg-[#152033] border-amber-500 shadow-md'
                    : 'bg-[#0e1624] border-[#1d293d] hover:bg-[#121c2d]'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-200">{char.name}</div>
                  <div className="text-[10px] text-amber-400 font-mono uppercase">
                    {char.preset} • {char.targetLayerId}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSingingCharacter(char.id);
                  }}
                  className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Preset Importer */}
          <div className="p-3 rounded-lg bg-[#0c121e] border border-[#1b2638] space-y-2 text-xs">
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">
              Quick Character Archetypes
            </div>
            {[
              { name: 'Singing Pumpkin Trio', preset: 'pumpkin-trio', layer: 'layer-windows' },
              { name: 'Haunted Mansion Butler', preset: 'mansion-ghost', layer: 'layer-garage' },
              { name: 'Jolly Santa Claus', preset: 'santa-claus', layer: 'layer-roof' },
              { name: 'Neon Synthwave Face', preset: 'neon-synth-face', layer: 'layer-windows' },
            ].map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() =>
                  addSingingCharacter({
                    name: p.name,
                    preset: p.preset as any,
                    targetLayerId: p.layer,
                  })
                }
                className="w-full text-left px-2 py-1.5 rounded bg-[#101724] hover:bg-[#182338] border border-[#1f2d42] text-[11px] font-semibold text-slate-300 flex items-center justify-between"
              >
                <span>{p.name}</span>
                <span className="text-[10px] text-cyan-400 font-mono">+ Apply</span>
              </button>
            ))}
          </div>
        </div>

        {/* Center Viewport: Stage & Phoneme Mouth Inspection (Cols 6) */}
        <div className="col-span-6 flex flex-col p-4 bg-[#05080e] items-center justify-center relative">
          <div className="w-full h-full rounded-xl border border-[#1f2d42] bg-black relative overflow-hidden flex items-center justify-center shadow-2xl">
            {/* Background House Facade */}
            <img
              src={customReferencePhotoUrl || 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80'}
              alt="House"
              className="w-full h-full object-cover opacity-60"
            />

            {/* Character On-Facade Visualizer */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="p-6 rounded-2xl bg-black/60 border border-amber-500/50 backdrop-blur-sm flex flex-col items-center">
                <div className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2">
                  {activeChar?.name} (Viseme: {activeChar?.currentViseme})
                </div>

                {/* Render Animated SVG Mouth */}
                <div
                  className="w-48 h-32 flex items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: mouthSvg }}
                />

                {/* Eye Status */}
                <div className="flex gap-4 mt-3 text-amber-400">
                  <div className="w-4 h-4 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]" />
                  <div className="w-4 h-4 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]" />
                </div>
              </div>
            </div>

            {/* HUD Overlay */}
            <div className="absolute top-4 left-4 text-xs font-mono text-amber-400 bg-black/80 px-2 py-1 rounded border border-amber-500/40">
              PUPPET TARGET: {activeChar?.targetLayerId.toUpperCase()} • EMOTION: {activeChar?.emotion.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Right Panel: Expression & Lip-Sync Controls (Cols 3) */}
        <div className="col-span-3 border-l border-[#1b2638] bg-[#090f19] p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="pb-2 border-b border-[#1b2638] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" /> Expression & Pitch
            </span>
          </div>

          {activeChar && (
            <div className="space-y-4 text-xs">
              {/* Emotion Selector */}
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase">Emotion & Mood</label>
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  {(['happy', 'spooky', 'surprised', 'sinister'] as const).map((mood) => (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => updateSingingCharacter(activeChar.id, { emotion: mood })}
                      className={`px-2 py-1.5 rounded text-[10px] font-bold uppercase border transition-all ${
                        activeChar.emotion === mood
                          ? 'bg-amber-600/30 text-amber-300 border-amber-500'
                          : 'bg-[#101724] text-slate-400 border-[#1e2a3c]'
                      }`}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>

              {/* Jaw Sensitivity */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <label className="text-[10px] uppercase font-semibold text-slate-400">Jaw Openness Scale</label>
                  <span className="font-mono text-amber-400">{jawSensitivity.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={jawSensitivity}
                  onChange={(e) =>
                    updateSingingCharacter(activeChar.id, {
                      jawOpenness: parseFloat(e.target.value) / 2,
                    })
                  }
                  className="w-full accent-amber-400"
                />
              </div>

              {/* Head Bob To Beat */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <label className="text-[10px] uppercase font-semibold text-slate-400">Head Bob Bounce</label>
                  <span className="font-mono text-amber-400">
                    {Math.round(activeChar.headBobAmount * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={activeChar.headBobAmount}
                  onChange={(e) =>
                    updateSingingCharacter(activeChar.id, {
                      headBobAmount: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-amber-400"
                />
              </div>

              {/* Live Mic Voice Pitch-Shifter */}
              <div className="p-3 rounded-lg bg-[#0c121e] border border-[#1b2638] space-y-2">
                <div className="flex justify-between text-[11px] font-bold text-slate-300 uppercase">
                  <span>Monster Pitch Shifter</span>
                  <span className="font-mono text-cyan-400">{pitchShiftSemitones} St</span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  value={pitchShiftSemitones}
                  onChange={(e) => setPitchShiftSemitones(parseInt(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>-12 St (Demon)</span>
                  <span>0 (Normal)</span>
                  <span>+12 St (Elf)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. BOTTOM SCRUB BAR: PHONEME & LYRICS TIMELINE */}
      <div className="h-14 bg-[#090e18] border-t border-[#1b2638] px-4 flex items-center gap-4 shrink-0 overflow-x-auto">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-amber-400" /> Phoneme Syllables
        </span>

        <div className="flex-1 flex items-center gap-1">
          {['GHOST', 'BUS', 'TERS', 'WHO', 'YOU', 'GON', 'NA', 'CALL', 'ECTO', 'ONE'].map(
            (syllable, i) => (
              <div
                key={i}
                className={`flex-1 py-1 px-2 rounded text-center font-mono text-xs font-bold border transition-all ${
                  phonemeScrubIndex === i
                    ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.6)]'
                    : 'bg-[#101724] text-slate-400 border-[#1e2a3c]'
                }`}
              >
                <div>{syllable}</div>
                <div className="text-[9px] opacity-75">
                  {['Rest', 'A', 'E', 'O', 'U', 'M', 'L', 'F', 'W', 'Rest'][i]}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
