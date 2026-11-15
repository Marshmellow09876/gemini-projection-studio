import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Activity,
  Mic,
  Radio,
  Sliders,
  Volume2,
  Music,
  Disc,
  Usb,
  Zap,
  Check,
  Trash2,
  X,
  Play,
  Square,
  RefreshCw,
  Plus,
  Sparkles,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useProjectionStore } from '../../store/useProjectionStore';
import {
  liveAudioAnalyzer,
  webMidiManager,
  WebMidiManager,
  AudioFrequencyBands,
  AudioModulationRule,
  MidiMappingEntry,
  MidiDeviceInfo,
  MidiRawEvent,
  ModulationTarget,
  DEFAULT_AUDIO_MODULATION_RULES,
  DEFAULT_MIDI_MAPPINGS,
  DEFAULT_LIVE_AUDIO_ANALYZER_OPTIONS,
  loadLiveAudioMidiProfile,
  saveLiveAudioMidiProfile,
  computeModulatedValue,
} from '../../utils/liveAudioMidiEngine';

export interface LiveAudioAndMidiModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const LiveAudioAndMidiModal: React.FC<LiveAudioAndMidiModalProps> = ({
  isOpen,
  onClose,
}) => {
  // Store integration (works safely whether open state is controlled via props or store)
  const storeIsOpen = useProjectionStore((state: any) => state.isLiveAudioMidiModalOpen);
  const storeSetIsOpen = useProjectionStore((state: any) => state.setIsLiveAudioMidiModalOpen);
  const showToast = useProjectionStore((state) => state.showToast);
  const toggleMasterBlackout = useProjectionStore((state) => state.toggleMasterBlackout);
  const setProjectorLumens = useProjectionStore((state) => state.setProjectorLumens);
  const playlistClips = useProjectionStore((state) => state.playlistClips);
  const activatePlaylistClip = useProjectionStore((state) => state.activatePlaylistClip);

  const effectiveIsOpen = isOpen !== undefined ? isOpen : (storeIsOpen ?? false);

  // Tabs
  const [activeTab, setActiveTab] = useState<'spectrum' | 'modulation' | 'midi'>('spectrum');

  // Audio Engine State
  const [isAudioRunning, setIsAudioRunning] = useState<boolean>(false);
  const [audioSource, setAudioSource] = useState<'mic' | 'simulated'>('simulated');
  const [simBpm, setSimBpm] = useState<number>(128);
  const [sensitivity, setSensitivity] = useState<number>(1.25);
  const [attackMs, setAttackMs] = useState<number>(15);
  const [releaseMs, setReleaseMs] = useState<number>(120);
  const [fftSize, setFftSize] = useState<number>(2048);
  const [smoothing, setSmoothing] = useState<number>(0.8);
  const [bands, setBands] = useState<AudioFrequencyBands>({
    subBass: 0,
    bass: 0,
    lowMid: 0,
    mid: 0,
    treble: 0,
    overallEnergy: 0,
  });
  const [isOnsetBeat, setIsOnsetBeat] = useState<boolean>(false);

  // Modulation Matrix State
  const [rules, setRules] = useState<AudioModulationRule[]>([]);
  const [liveOutputs, setLiveOutputs] = useState<Record<ModulationTarget, number>>({
    master_dimmer: 1.0,
    bulb_speed: 1.0,
    icicle_drip: 1.0,
    strobe_intensity: 0.0,
    particle_speed: 1.0,
    plasma_frequency: 1.0,
  });

  // Web MIDI State
  const [isMidiSupported, setIsMidiSupported] = useState<boolean>(false);
  const [midiDevices, setMidiDevices] = useState<MidiDeviceInfo[]>([]);
  const [mappings, setMappings] = useState<MidiMappingEntry[]>([]);
  const [isLearning, setIsLearning] = useState<boolean>(false);
  const [learnSuccessMsg, setLearnSuccessMsg] = useState<string | null>(null);
  const [recentEvents, setRecentEvents] = useState<MidiRawEvent[]>([]);

  // Add rule modal / inline state
  const [newRuleBand, setNewRuleBand] = useState<keyof AudioFrequencyBands>('bass');
  const [newRuleTarget, setNewRuleTarget] = useState<ModulationTarget>('bulb_speed');
  const [newRuleMin, setNewRuleMin] = useState<number>(0.5);
  const [newRuleMax, setNewRuleMax] = useState<number>(3.0);

  // Canvas visualizer refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const onsetTimerRef = useRef<number | null>(null);

  // Peak hold data for spectrum bars
  const peaksRef = useRef<Float32Array>(new Float32Array(64));

  // Initialize and load saved profile
  useEffect(() => {
    const profile = loadLiveAudioMidiProfile();
    setRules(profile.modulationRules);
    setMappings(profile.midiMappings);
    webMidiManager.setMappings(profile.midiMappings);

    setSensitivity(profile.options.sensitivity);
    setAttackMs(Math.round(profile.options.attackSeconds * 1000));
    setReleaseMs(Math.round(profile.options.releaseSeconds * 1000));
    setFftSize(profile.options.fftSize);
    setSmoothing(profile.options.smoothingTimeConstant);

    liveAudioAnalyzer.setOptions(profile.options);

    const supported = WebMidiManager.isSupported();
    setIsMidiSupported(supported);

    if (supported) {
      webMidiManager.requestAccess().then((ok) => {
        if (ok) {
          setMidiDevices(webMidiManager.getConnectedDevices());
        }
      });
    }

    // Subscribe to incoming raw MIDI events for the live event monitor
    const unsub = webMidiManager.subscribeRawEvents((evt) => {
      setRecentEvents((prev) => [evt, ...prev.slice(0, 30)]);
    });

    // Wire action handler to store actions
    webMidiManager.onActionTriggered((entry, rawVal, normalizedVal) => {
      switch (entry.actionType) {
        case 'scene_launch': {
          const idx = entry.targetValue ?? 0;
          if (playlistClips && playlistClips[idx]) {
            activatePlaylistClip(playlistClips[idx].id);
            showToast(`MIDI Pad Triggered: Scene #${idx + 1} "${playlistClips[idx].title}"`);
          } else {
            showToast(`MIDI Pad Triggered: Scene Pad #${idx + 1}`);
          }
          break;
        }
        case 'blackout': {
          toggleMasterBlackout();
          showToast('MIDI Emergency Master Blackout Toggled');
          break;
        }
        case 'master_dimmer': {
          const lumens = Math.round(normalizedVal * 10000);
          setProjectorLumens(lumens);
          break;
        }
        case 'audio_volume': {
          showToast(`MIDI CC: Master Audio Volume set to ${Math.round(normalizedVal * 100)}%`);
          break;
        }
        case 'strobe': {
          showToast('⚡ MIDI Trigger: Thunder & Strobe Flash Dispatched!');
          break;
        }
        case 'speed_nudge': {
          showToast(`MIDI Speed Nudge Fired (${entry.targetValue || 1.25}x)`);
          break;
        }
      }
    });

    return () => {
      unsub();
      liveAudioAnalyzer.stop();
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      if (onsetTimerRef.current) {
        clearTimeout(onsetTimerRef.current);
      }
    };
  }, [activatePlaylistClip, playlistClips, setProjectorLumens, showToast, toggleMasterBlackout]);

  // Handle Close
  const handleClose = useCallback(() => {
    liveAudioAnalyzer.stop();
    setIsAudioRunning(false);
    if (onClose) onClose();
    if (storeSetIsOpen) storeSetIsOpen(false);
  }, [onClose, storeSetIsOpen]);

  // Audio start/stop control
  const handleToggleAudio = async () => {
    if (isAudioRunning) {
      liveAudioAnalyzer.stop();
      setIsAudioRunning(false);
      showToast('Audio Analyzer Engine Paused');
    } else {
      if (audioSource === 'mic') {
        const ok = await liveAudioAnalyzer.startMicrophone();
        if (ok) {
          setIsAudioRunning(true);
          showToast('Live Microphone Input Active');
        } else {
          setIsAudioRunning(true);
          setAudioSource('simulated');
          showToast('Microphone Unavailable — Running Simulated EDM Test Beat');
        }
      } else {
        liveAudioAnalyzer.startSimulatedSignal(simBpm);
        setIsAudioRunning(true);
        showToast(`Simulated Test Beat Started (${simBpm} BPM)`);
      }
    }
  };

  const handleSourceChange = async (source: 'mic' | 'simulated') => {
    setAudioSource(source);
    if (isAudioRunning) {
      if (source === 'mic') {
        const ok = await liveAudioAnalyzer.startMicrophone();
        if (!ok) {
          setAudioSource('simulated');
          liveAudioAnalyzer.startSimulatedSignal(simBpm);
        }
      } else {
        liveAudioAnalyzer.startSimulatedSignal(simBpm);
      }
    }
  };

  // Update analyzer options
  const handleUpdateOptions = (key: string, val: number) => {
    if (key === 'sensitivity') {
      setSensitivity(val);
      liveAudioAnalyzer.setOptions({ sensitivity: val });
    } else if (key === 'attack') {
      setAttackMs(val);
      liveAudioAnalyzer.setOptions({ attackSeconds: val / 1000 });
    } else if (key === 'release') {
      setReleaseMs(val);
      liveAudioAnalyzer.setOptions({ releaseSeconds: val / 1000 });
    } else if (key === 'fftSize') {
      setFftSize(val);
      liveAudioAnalyzer.setOptions({ fftSize: val });
    } else if (key === 'smoothing') {
      setSmoothing(val);
      liveAudioAnalyzer.setOptions({ smoothingTimeConstant: val });
    }
  };

  // Live 60fps render loop for canvas and modulation outputs
  useEffect(() => {
    if (!effectiveIsOpen) return;

    let isMounted = true;

    const renderLoop = () => {
      if (!isMounted) return;

      const currentBands = liveAudioAnalyzer.getBands();
      setBands(currentBands);

      // Transient onset detector
      if (liveAudioAnalyzer.isOnset()) {
        setIsOnsetBeat(true);
        if (onsetTimerRef.current) clearTimeout(onsetTimerRef.current);
        onsetTimerRef.current = window.setTimeout(() => {
          setIsOnsetBeat(false);
        }, 120);
      }

      // Compute live modulation rule outputs
      const outputs: Record<ModulationTarget, number> = {
        master_dimmer: 1.0,
        bulb_speed: 1.0,
        icicle_drip: 1.0,
        strobe_intensity: 0.0,
        particle_speed: 1.0,
        plasma_frequency: 1.0,
      };

      for (const rule of rules) {
        if (!rule.enabled) continue;
        const energy = currentBands[rule.band] ?? 0;
        outputs[rule.target] = computeModulatedValue(energy, rule);
      }
      setLiveOutputs(outputs);

      // Draw canvas spectrum & oscilloscope
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;

          // Clear background
          ctx.fillStyle = '#080d16';
          ctx.fillRect(0, 0, width, height);

          // Background subtle grid
          ctx.strokeStyle = '#141e30';
          ctx.lineWidth = 1;
          for (let y = 30; y < height; y += 35) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
          }

          const freqData = liveAudioAnalyzer.getFrequencyData();
          const waveData = liveAudioAnalyzer.getWaveformData();

          // 1. Draw 64-Band Spectrum Bars (Top 65% of canvas)
          const barCount = 64;
          const barSpacing = 2;
          const barWidth = Math.max(1, (width - (barCount + 1) * barSpacing) / barCount);
          const spectrumMaxHeight = height * 0.62;

          for (let i = 0; i < barCount; i++) {
            // Logarithmic bin sampling
            const binIdx = Math.min(
              freqData.length - 1,
              Math.floor(Math.pow(i / barCount, 1.8) * (freqData.length * 0.75))
            );
            const rawVal = freqData[binIdx] || 0;
            const barHeight = Math.max(2, (rawVal / 255) * spectrumMaxHeight);

            // Update peak hold
            if (rawVal > peaksRef.current[i]) {
              peaksRef.current[i] = rawVal;
            } else {
              peaksRef.current[i] = Math.max(0, peaksRef.current[i] - 1.8);
            }

            const x = barSpacing + i * (barWidth + barSpacing);
            const y = spectrumMaxHeight - barHeight + 10;

            // Bar gradient (Neon Cyan -> Electric Purple -> Coral Red)
            const grad = ctx.createLinearGradient(0, y + barHeight, 0, y);
            if (i < 12) {
              // Sub-bass / Bass: Deep red to vibrant amber
              grad.addColorStop(0, '#7f1d1d');
              grad.addColorStop(0.6, '#ef4444');
              grad.addColorStop(1, '#f97316');
            } else if (i < 28) {
              // Low-Mid: Amber to gold
              grad.addColorStop(0, '#b45309');
              grad.addColorStop(0.7, '#f59e0b');
              grad.addColorStop(1, '#eab308');
            } else if (i < 46) {
              // Mid: Green to cyan
              grad.addColorStop(0, '#065f46');
              grad.addColorStop(0.6, '#10b981');
              grad.addColorStop(1, '#06b6d4');
            } else {
              // Treble: Cyan to vivid purple
              grad.addColorStop(0, '#0284c7');
              grad.addColorStop(0.6, '#38bdf8');
              grad.addColorStop(1, '#c084fc');
            }

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
            ctx.fill();

            // Floating peak marker
            const peakY = spectrumMaxHeight - (peaksRef.current[i] / 255) * spectrumMaxHeight + 10;
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(x, Math.max(8, peakY), barWidth, 2);
          }

          // 2. Draw Oscilloscope Waveform (Bottom 35% of canvas)
          const waveBaseY = height * 0.82;
          const waveHeight = height * 0.28;

          ctx.beginPath();
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 1.8;
          ctx.shadowColor = '#22d3ee';
          ctx.shadowBlur = 6;

          const sliceWidth = width / waveData.length;
          let waveX = 0;

          for (let i = 0; i < waveData.length; i++) {
            const v = waveData[i] / 128.0; // 0.0 - 2.0
            const waveY = waveBaseY + (v - 1.0) * (waveHeight / 2);

            if (i === 0) {
              ctx.moveTo(waveX, waveY);
            } else {
              ctx.lineTo(waveX, waveY);
            }
            waveX += sliceWidth;
          }
          ctx.stroke();
          ctx.shadowBlur = 0; // Reset shadow

          // Baseline divider
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, waveBaseY);
          ctx.lineTo(width, waveBaseY);
          ctx.stroke();
        }
      }

      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isMounted = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [effectiveIsOpen, rules]);

  // MIDI Scan
  const handleScanMidi = async () => {
    const ok = await webMidiManager.requestAccess();
    if (ok) {
      const devs = webMidiManager.getConnectedDevices();
      setMidiDevices(devs);
      showToast(`MIDI Scan Complete: ${devs.length} Controller(s) Found`);
    } else {
      showToast('Web MIDI API Permission Required or Unsupported');
    }
  };

  // MIDI Learn
  const handleToggleLearn = () => {
    if (isLearning) {
      webMidiManager.stopLearn();
      setIsLearning(false);
      showToast('MIDI Learn Cancelled');
    } else {
      setIsLearning(true);
      setLearnSuccessMsg(null);
      showToast('Listening... Press any Pad or Turn any CC Knob on your controller!');

      webMidiManager.startLearn((learned) => {
        setIsLearning(false);
        const autoName = learned.isCc
          ? `CC Knob #${learned.noteOrCc} (Ch ${learned.channel})`
          : `Pad #${learned.noteOrCc} (Ch ${learned.channel})`;

        setLearnSuccessMsg(
          `Captured: ${learned.isCc ? 'CC #' : 'Note #'}${learned.noteOrCc} on Channel ${learned.channel}`
        );

        // Append to mappings
        const newEntry: MidiMappingEntry = {
          id: `midi-learn-${Date.now()}`,
          noteOrCc: learned.noteOrCc,
          isCc: learned.isCc,
          channel: learned.channel,
          actionName: autoName,
          actionType: learned.isCc ? 'master_dimmer' : 'scene_launch',
          targetValue: learned.isCc ? undefined : 0,
        };

        const updated = [...mappings, newEntry];
        setMappings(updated);
        webMidiManager.setMappings(updated);
        showToast(`Learned and Mapped: ${autoName}`);
      });
    }
  };

  // Save Profile
  const handleSaveProfile = () => {
    const profile = {
      options: {
        sensitivity,
        attackSeconds: attackMs / 1000,
        releaseSeconds: releaseMs / 1000,
        fftSize,
        smoothingTimeConstant: smoothing,
      },
      modulationRules: rules,
      midiMappings: mappings,
    };
    saveLiveAudioMidiProfile(profile);
    showToast('Live Audio & Web MIDI Profile Saved to LocalStorage');
  };

  // Reset to Defaults
  const handleResetProfile = () => {
    setRules(DEFAULT_AUDIO_MODULATION_RULES);
    setMappings(DEFAULT_MIDI_MAPPINGS);
    webMidiManager.setMappings(DEFAULT_MIDI_MAPPINGS);
    setSensitivity(DEFAULT_LIVE_AUDIO_ANALYZER_OPTIONS.sensitivity);
    setAttackMs(DEFAULT_LIVE_AUDIO_ANALYZER_OPTIONS.attackSeconds * 1000);
    setReleaseMs(DEFAULT_LIVE_AUDIO_ANALYZER_OPTIONS.releaseSeconds * 1000);
    setFftSize(DEFAULT_LIVE_AUDIO_ANALYZER_OPTIONS.fftSize);
    setSmoothing(DEFAULT_LIVE_AUDIO_ANALYZER_OPTIONS.smoothingTimeConstant);
    showToast('Reset to Marshall Parity Default Rules & MIDI Mappings');
  };

  // Add rule
  const handleAddRule = () => {
    const newRule: AudioModulationRule = {
      id: `rule-${Date.now()}`,
      band: newRuleBand,
      target: newRuleTarget,
      minOutput: newRuleMin,
      maxOutput: newRuleMax,
      enabled: true,
    };
    const updated = [...rules, newRule];
    setRules(updated);
    showToast(`Added Modulation Rule: ${newRule.band} -> ${newRule.target}`);
  };

  // Delete rule
  const handleDeleteRule = (id: string) => {
    const updated = rules.filter((r) => r.id !== id);
    setRules(updated);
  };

  // Toggle rule
  const handleToggleRule = (id: string) => {
    const updated = rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    setRules(updated);
  };

  // Delete MIDI mapping
  const handleDeleteMapping = (id: string) => {
    const updated = mappings.filter((m) => m.id !== id);
    setMappings(updated);
    webMidiManager.setMappings(updated);
  };

  // Simulate MIDI button press
  const handleSimulateMidi = (entry: MidiMappingEntry) => {
    webMidiManager.simulateMidiMessage(entry.isCc, entry.noteOrCc, entry.channel || 1, 127);
  };

  if (!effectiveIsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 font-sans select-none animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-[#0b121e] border border-[#213047] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1b2638] flex items-center justify-between bg-[#0e1626]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-800 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950/50">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  Live Audio Spectrum & Web MIDI Studio
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
                  PHASE 2 PARITY
                </span>
                {isOnsetBeat && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-700 animate-ping">
                    ⚡ ONSET BEAT
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                2048-Point FFT Isolation • Attack/Release Modulation Matrix • USB Hardware MIDI Bridge
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2538] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-[#1b2638] bg-[#090e18] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('spectrum')}
              className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'spectrum'
                  ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-4 h-4" />
              1. Spectrum Analyzer & Waveform
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('modulation')}
              className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'modulation'
                  ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-4 h-4" />
              2. Audio-Reactive Modulation Matrix ({rules.filter((r) => r.enabled).length} Active)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('midi')}
              className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'midi'
                  ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Usb className="w-4 h-4" />
              3. Web MIDI Controller Studio ({midiDevices.length} Connected)
            </button>
          </div>

          {/* Quick Engine Status Indicator */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span
                className={`w-2 h-2 rounded-full ${
                  isAudioRunning ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-slate-600'
                }`}
              />
              <span className={isAudioRunning ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                {isAudioRunning ? (audioSource === 'mic' ? 'MIC LIVE' : 'SYNTH BEAT') : 'STANDBY'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleAudio}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-md ${
                isAudioRunning
                  ? 'bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900'
                  : 'bg-cyan-600 text-white hover:bg-cyan-500 shadow-cyan-950/50'
              }`}
            >
              {isAudioRunning ? (
                <>
                  <Square className="w-3.5 h-3.5" />
                  Stop Audio
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Start Analyzer
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* ============================================================== */}
          {/* TAB 1: LIVE SPECTRUM ANALYZER & OSCILLOSCOPE                  */}
          {/* ============================================================== */}
          {activeTab === 'spectrum' && (
            <div className="space-y-6">
              {/* Audio Source Bar */}
              <div className="p-4 rounded-xl bg-[#070c14] border border-[#1a2638] flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">
                    Audio Signal Source:
                  </span>
                  <div className="flex items-center bg-[#0d1726] p-1 rounded-lg border border-[#213047]">
                    <button
                      type="button"
                      onClick={() => handleSourceChange('mic')}
                      className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        audioSource === 'mic'
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      Live Microphone
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSourceChange('simulated')}
                      className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        audioSource === 'simulated'
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Music className="w-3.5 h-3.5" />
                      Simulated Test Beat
                    </button>
                  </div>
                </div>

                {audioSource === 'simulated' && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-mono text-[11px]">BPM Tempo:</span>
                    {[90, 110, 128, 140, 160].map((bpmVal) => (
                      <button
                        key={bpmVal}
                        type="button"
                        onClick={() => {
                          setSimBpm(bpmVal);
                          if (isAudioRunning) liveAudioAnalyzer.startSimulatedSignal(bpmVal);
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                          simBpm === bpmVal
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                            : 'bg-[#101b2b] text-slate-400 hover:text-slate-200 border border-[#1f2d42]'
                        }`}
                      >
                        {bpmVal}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 60fps Visualizer Canvas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-bold">64-Band FFT Spectrum</span>
                    <span>(20 Hz - 16,000 Hz)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-bold">Oscilloscope Time-Domain</span>
                    <span>(60 FPS)</span>
                  </div>
                </div>

                <div className="relative rounded-xl overflow-hidden border border-[#213047] shadow-xl bg-[#080d16]">
                  <canvas
                    ref={canvasRef}
                    width={860}
                    height={230}
                    className="w-full h-[230px] block"
                  />
                  {!isAudioRunning && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Volume2 className="w-8 h-8 text-cyan-400 animate-bounce" />
                      <span className="text-xs font-bold text-slate-200">
                        Analyzer Engine Offline
                      </span>
                      <button
                        type="button"
                        onClick={handleToggleAudio}
                        className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg transition-all"
                      >
                        Start Live Stream
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 5-Band Vertical EQ Meters */}
              <div className="grid grid-cols-6 gap-3">
                {[
                  {
                    key: 'subBass',
                    name: 'Sub-Bass',
                    range: '20-60 Hz',
                    val: bands.subBass,
                    color: 'from-rose-500 to-red-600',
                    border: 'border-red-900',
                    desc: 'Kick & Rumble',
                  },
                  {
                    key: 'bass',
                    name: 'Bass',
                    range: '60-250 Hz',
                    val: bands.bass,
                    color: 'from-amber-500 to-orange-600',
                    border: 'border-amber-900',
                    desc: 'Basslines & Punch',
                  },
                  {
                    key: 'lowMid',
                    name: 'Low-Mid',
                    range: '250-500 Hz',
                    val: bands.lowMid,
                    color: 'from-yellow-400 to-amber-500',
                    border: 'border-yellow-900',
                    desc: 'Vocals & Warmth',
                  },
                  {
                    key: 'mid',
                    name: 'Mid',
                    range: '500-2k Hz',
                    val: bands.mid,
                    color: 'from-emerald-400 to-teal-500',
                    border: 'border-emerald-900',
                    desc: 'Leads & Clarity',
                  },
                  {
                    key: 'treble',
                    name: 'Treble',
                    range: '2k-16k Hz',
                    val: bands.treble,
                    color: 'from-cyan-400 to-sky-500',
                    border: 'border-cyan-900',
                    desc: 'Hats & Sparkle',
                  },
                  {
                    key: 'overallEnergy',
                    name: 'RMS Energy',
                    range: 'Overall',
                    val: bands.overallEnergy,
                    color: 'from-purple-400 to-violet-600',
                    border: 'border-purple-900',
                    desc: 'Total Level',
                  },
                ].map((band) => (
                  <div
                    key={band.key}
                    className={`p-3 rounded-xl bg-[#080d16] border ${band.border} flex flex-col items-center justify-between text-center`}
                  >
                    <div>
                      <div className="text-[11px] font-bold text-slate-200">{band.name}</div>
                      <div className="text-[9px] text-slate-400 font-mono">{band.range}</div>
                    </div>

                    {/* Meter Track */}
                    <div className="w-6 h-28 my-2 rounded-full bg-[#111a29] border border-[#1f2d42] p-0.5 flex flex-col justify-end overflow-hidden relative shadow-inner">
                      <div
                        className={`w-full rounded-full bg-gradient-to-t ${band.color} transition-all duration-75 shadow-[0_0_8px_rgba(34,211,238,0.4)]`}
                        style={{ height: `${Math.round(band.val * 100)}%` }}
                      />
                    </div>

                    <div>
                      <span className="font-mono text-xs font-bold text-slate-100">
                        {Math.round(band.val * 100)}%
                      </span>
                      <div className="text-[9px] text-slate-500 font-mono">{band.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Analyzer Tuning Controls */}
              <div className="p-4 rounded-xl bg-[#070c14] border border-[#1a2638] space-y-3">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  FFT & Smoothing Filter Calibration
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                      <span>Sensitivity</span>
                      <span className="text-cyan-400">{sensitivity.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.2}
                      max={3.0}
                      step={0.05}
                      value={sensitivity}
                      onChange={(e) => handleUpdateOptions('sensitivity', parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 h-1.5 bg-[#141f30] rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                      <span>Attack Filter</span>
                      <span className="text-cyan-400">{attackMs} ms</span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={60}
                      step={1}
                      value={attackMs}
                      onChange={(e) => handleUpdateOptions('attack', parseInt(e.target.value))}
                      className="w-full accent-cyan-400 h-1.5 bg-[#141f30] rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                      <span>Release Filter</span>
                      <span className="text-cyan-400">{releaseMs} ms</span>
                    </div>
                    <input
                      type="range"
                      min={30}
                      max={400}
                      step={5}
                      value={releaseMs}
                      onChange={(e) => handleUpdateOptions('release', parseInt(e.target.value))}
                      className="w-full accent-cyan-400 h-1.5 bg-[#141f30] rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                      <span>FFT Window Size</span>
                      <span className="text-cyan-400">{fftSize} pts</span>
                    </div>
                    <select
                      value={fftSize}
                      onChange={(e) => handleUpdateOptions('fftSize', parseInt(e.target.value))}
                      className="w-full px-2 py-1 bg-[#0b121e] border border-[#213047] rounded-lg text-slate-200 font-mono text-xs"
                    >
                      <option value={512}>512 (Fast / Coarse)</option>
                      <option value={1024}>1024 (Balanced)</option>
                      <option value={2048}>2048 (Studio Parity)</option>
                      <option value={4096}>4096 (Ultra-Fine Low Bass)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: AUDIO-REACTIVE MODULATION MATRIX                        */}
          {/* ============================================================== */}
          {activeTab === 'modulation' && (
            <div className="space-y-6">
              {/* Presets Bar */}
              <div className="p-4 rounded-xl bg-[#070c14] border border-[#1a2638] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Modulation Matrix Routing Presets
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Instant rule maps for Holiday Lighting, EDM Shows, and Ambient Winter
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRules([
                        { id: '1', band: 'bass', target: 'bulb_speed', minOutput: 0.5, maxOutput: 3.5, enabled: true },
                        { id: '2', band: 'subBass', target: 'strobe_intensity', minOutput: 0.0, maxOutput: 1.0, enabled: true },
                        { id: '3', band: 'overallEnergy', target: 'master_dimmer', minOutput: 0.3, maxOutput: 1.0, enabled: true },
                      ]);
                      showToast('Loaded "Holiday Dance Party" Matrix Preset');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#111c2e] hover:bg-[#1a2942] text-slate-200 border border-[#213047] font-semibold text-xs flex items-center gap-1.5 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Holiday Dance Party
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRules([
                        { id: '1', band: 'treble', target: 'icicle_drip', minOutput: 0.0, maxOutput: 3.0, enabled: true },
                        { id: '2', band: 'lowMid', target: 'particle_speed', minOutput: 0.2, maxOutput: 1.8, enabled: true },
                        { id: '3', band: 'mid', target: 'bulb_speed', minOutput: 0.8, maxOutput: 1.5, enabled: true },
                      ]);
                      showToast('Loaded "Gentle Winter Snow" Matrix Preset');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#111c2e] hover:bg-[#1a2942] text-slate-200 border border-[#213047] font-semibold text-xs flex items-center gap-1.5 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    Gentle Winter Snow
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRules([
                        { id: '1', band: 'subBass', target: 'strobe_intensity', minOutput: 0.0, maxOutput: 1.0, enabled: true },
                        { id: '2', band: 'bass', target: 'plasma_frequency', minOutput: 0.2, maxOutput: 2.5, enabled: true },
                        { id: '3', band: 'overallEnergy', target: 'master_dimmer', minOutput: 0.0, maxOutput: 1.0, enabled: true },
                      ]);
                      showToast('Loaded "Cyber Strobe Assault" Matrix Preset');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#111c2e] hover:bg-[#1a2942] text-slate-200 border border-[#213047] font-semibold text-xs flex items-center gap-1.5 transition-all"
                  >
                    <Zap className="w-3.5 h-3.5 text-rose-400" />
                    Cyber Strobe Assault
                  </button>
                </div>
              </div>

              {/* Rules List Table */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Active Frequency Modulation Rules ({rules.length})</span>
                  <span>Live Animated Mod Output Value</span>
                </div>

                <div className="space-y-2">
                  {rules.map((rule) => {
                    const currentVal = liveOutputs[rule.target] ?? rule.minOutput;
                    const bandVal = bands[rule.band] ?? 0;

                    return (
                      <div
                        key={rule.id}
                        className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                          rule.enabled
                            ? 'bg-[#080d16] border-[#22334d]'
                            : 'bg-[#060a12] border-[#162133] opacity-60'
                        }`}
                      >
                        {/* Enabled Checkbox */}
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={rule.enabled}
                            onChange={() => handleToggleRule(rule.id)}
                            className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                          />
                          <div>
                            <div className="font-bold text-slate-100 flex items-center gap-2">
                              <span className="capitalize text-cyan-400 font-mono">
                                [{rule.band}]
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                              <span className="text-slate-200 font-mono">{rule.target}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Range: {rule.minOutput.toFixed(2)} → {rule.maxOutput.toFixed(2)} | Band In: {Math.round(bandVal * 100)}%
                            </div>
                          </div>
                        </div>

                        {/* Live Output Meter & Controls */}
                        <div className="flex items-center gap-6">
                          <div className="w-48 space-y-1">
                            <div className="flex justify-between font-mono text-[10px] text-slate-400">
                              <span>Output:</span>
                              <span className="text-cyan-400 font-bold">
                                {currentVal.toFixed(2)}
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-[#121c2c] overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-75"
                                style={{
                                  width: `${Math.max(
                                    0,
                                    Math.min(
                                      100,
                                      ((currentVal - rule.minOutput) /
                                        Math.max(0.001, rule.maxOutput - rule.minOutput)) *
                                        100
                                    )
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add Rule Form */}
              <div className="p-4 rounded-xl bg-[#070c14] border border-[#1a2638] space-y-3">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Plus className="w-4 h-4 text-cyan-400" />
                  Add Custom Modulation Rule
                </div>
                <div className="grid grid-cols-5 gap-3 items-end">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">
                      Audio Band
                    </label>
                    <select
                      value={newRuleBand}
                      onChange={(e) => setNewRuleBand(e.target.value as keyof AudioFrequencyBands)}
                      className="w-full px-2 py-1.5 bg-[#0b121e] border border-[#213047] rounded-lg text-slate-200 text-xs font-mono"
                    >
                      <option value="subBass">Sub-Bass (20-60 Hz)</option>
                      <option value="bass">Bass (60-250 Hz)</option>
                      <option value="lowMid">Low-Mid (250-500 Hz)</option>
                      <option value="mid">Mid (500-2k Hz)</option>
                      <option value="treble">Treble (2k-16k Hz)</option>
                      <option value="overallEnergy">Overall Energy</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">
                      Target Parameter
                    </label>
                    <select
                      value={newRuleTarget}
                      onChange={(e) => setNewRuleTarget(e.target.value as ModulationTarget)}
                      className="w-full px-2 py-1.5 bg-[#0b121e] border border-[#213047] rounded-lg text-slate-200 text-xs font-mono"
                    >
                      <option value="bulb_speed">C9 Bulb Chase Speed</option>
                      <option value="master_dimmer">Master Dimmer Pulse</option>
                      <option value="strobe_intensity">Strobe Burst Intensity</option>
                      <option value="icicle_drip">Icicle Drip / Sparkle Rate</option>
                      <option value="particle_speed">Snow Particle Speed</option>
                      <option value="plasma_frequency">Plasma Frequency</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">
                      Min Output
                    </label>
                    <input
                      type="number"
                      step={0.1}
                      value={newRuleMin}
                      onChange={(e) => setNewRuleMin(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-[#0b121e] border border-[#213047] rounded-lg text-slate-200 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">
                      Max Output
                    </label>
                    <input
                      type="number"
                      step={0.1}
                      value={newRuleMax}
                      onChange={(e) => setNewRuleMax(parseFloat(e.target.value) || 1)}
                      className="w-full px-2 py-1.5 bg-[#0b121e] border border-[#213047] rounded-lg text-slate-200 text-xs font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddRule}
                    className="w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xs transition-colors shadow"
                  >
                    Add Rule
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: WEB MIDI CONTROLLER STUDIO                              */}
          {/* ============================================================== */}
          {activeTab === 'midi' && (
            <div className="space-y-6">
              {/* Controller Status Bar */}
              <div className="p-4 rounded-xl bg-[#070c14] border border-[#1a2638] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-800 flex items-center justify-center text-purple-400">
                    <Usb className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                        Hardware Controller Connectivity
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          isMidiSupported
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}
                      >
                        {isMidiSupported ? 'WEB MIDI SUPPORTED' : 'BROWSER UNSUPPORTED'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Novation Launchpad • Akai APC40 / MPK • DJ Mixers • StreamDeck
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleScanMidi}
                    className="px-3 py-1.5 rounded-lg bg-[#111c2e] hover:bg-[#1a2942] text-slate-200 border border-[#213047] font-semibold text-xs flex items-center gap-1.5 transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                    Scan Devices
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleLearn}
                    className={`px-4 py-1.5 rounded-lg font-bold text-xs flex items-center gap-2 transition-all shadow-lg ${
                      isLearning
                        ? 'bg-amber-500 text-slate-950 animate-pulse border border-amber-300'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-950/50'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    {isLearning ? 'Listening for Input...' : 'Learn MIDI'}
                  </button>
                </div>
              </div>

              {/* Connected Device Cards */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Connected MIDI Input Interfaces ({midiDevices.length})
                </div>
                {midiDevices.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {midiDevices.map((dev) => (
                      <div
                        key={dev.id}
                        className="p-3 rounded-xl bg-[#080d16] border border-[#213047] flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                          <div>
                            <div className="font-bold text-slate-200">{dev.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Mfg: {dev.manufacturer} • State: {dev.state}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 font-bold">
                          ONLINE
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-[#080d16] border border-[#1b2738] flex items-center justify-between text-slate-400">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                      <span>
                        No physical USB controller detected. You can test mappings using the &quot;Test&quot; buttons below!
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {learnSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-700 text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="font-mono text-xs">{learnSuccessMsg}</span>
                </div>
              )}

              {/* MIDI Mapping Table */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Hardware Mappings Table ({mappings.length})</span>
                  <span>Software Action Binding</span>
                </div>

                <div className="rounded-xl border border-[#213047] overflow-hidden bg-[#080d16]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0e1726] border-b border-[#1b2638] text-[10px] font-mono text-slate-400 uppercase">
                      <tr>
                        <th className="py-2.5 px-4">Hardware Type</th>
                        <th className="py-2.5 px-4">Channel</th>
                        <th className="py-2.5 px-4">Note / CC#</th>
                        <th className="py-2.5 px-4">Action Target</th>
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#172233]">
                      {mappings.map((entry) => (
                        <tr key={entry.id} className="hover:bg-[#0c1422] transition-colors">
                          <td className="py-2 px-4 font-mono">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                entry.isCc
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                              }`}
                            >
                              {entry.isCc ? 'CC KNOB / FADER' : 'PAD / KEY'}
                            </span>
                          </td>
                          <td className="py-2 px-4 font-mono text-slate-300">
                            Ch {entry.channel || 'All'}
                          </td>
                          <td className="py-2 px-4 font-mono font-bold text-slate-200">
                            {entry.isCc ? `CC #${entry.noteOrCc}` : `Note #${entry.noteOrCc}`}
                          </td>
                          <td className="py-2 px-4 text-slate-200">
                            <div className="font-bold">{entry.actionName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Type: {entry.actionType}
                              {entry.targetValue !== undefined && ` [Target: ${entry.targetValue}]`}
                            </div>
                          </td>
                          <td className="py-2 px-4 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => handleSimulateMidi(entry)}
                              className="px-2.5 py-1 rounded bg-[#131f33] hover:bg-[#1a2d4a] text-cyan-400 border border-cyan-900 font-mono text-[11px] font-bold transition-colors"
                            >
                              Test
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMapping(entry.id)}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Live Incoming MIDI Event Monitor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    Incoming MIDI Packet Stream Monitor
                  </div>
                  <button
                    type="button"
                    onClick={() => setRecentEvents([])}
                    className="text-[10px] font-mono text-slate-500 hover:text-slate-300"
                  >
                    Clear Stream Log
                  </button>
                </div>

                <div className="h-32 rounded-xl bg-[#060a12] border border-[#172233] p-2 overflow-y-auto font-mono text-[11px] space-y-1">
                  {recentEvents.length > 0 ? (
                    recentEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className="flex items-center justify-between py-0.5 px-2 rounded hover:bg-[#0c1422] text-slate-300"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500">
                            {new Date(evt.timestamp).toLocaleTimeString()}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              evt.isCc ? 'text-amber-400' : 'text-cyan-400'
                            }`}
                          >
                            {evt.type}
                          </span>
                          <span>Ch {evt.channel}</span>
                          <span className="text-slate-200">
                            {evt.isCc ? `CC#${evt.noteOrCc}` : `Note#${evt.noteOrCc}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400">Val: {evt.value} ({Math.round(evt.normalized * 100)}%)</span>
                          {evt.matchedAction && (
                            <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-bold">
                              {evt.matchedAction}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500 text-[11px]">
                      Waiting for hardware input... (Events will stream here in real time)
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-[#1b2638] bg-[#090e18] flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span>Profile Storage: Active</span>
            <span>•</span>
            <span>{rules.length} Mod Rules</span>
            <span>•</span>
            <span>{mappings.length} MIDI Bindings</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetProfile}
              className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#141e30] font-semibold text-xs transition-colors"
            >
              Reset Defaults
            </button>
            <button
              type="button"
              onClick={handleSaveProfile}
              className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-950/40"
            >
              <Check className="w-3.5 h-3.5" />
              Save Profile
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
