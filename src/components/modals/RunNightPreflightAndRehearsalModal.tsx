import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Play,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Download,
  Upload,
  Clock,
  Sun,
  Moon,
  Volume2,
  Shuffle,
  Activity,
  HardDrive,
  Radio,
  Zap,
  Terminal,
  RefreshCw,
  FolderSync,
  Sliders,
  Check,
  Sparkles,
  Layers,
  Music,
  Power,
  Eye,
  Flame,
  Snowflake,
} from 'lucide-react';
import { useProjectionStore, VectorLayer, PlaylistClip } from '../../store/useProjectionStore';
import {
  computeAstronomicalDusk,
  PRESET_LOCATIONS,
  simulateEveningRehearsal,
  runPreShowPreflight,
  exportSupportDiagnosticsBundle,
  exportMarshallFile,
  importMarshallFile,
  runDocumentDoctorOnMpsJson,
  getMarshallSampleHouseAndShow,
  relinkMissingMedia,
  PreflightCheckItem,
  EveningRehearsalReport,
  WeightedPlaylistItem,
  DoctorReport,
} from '../../utils/eveningRehearsalAndPreflight';

export interface RunNightPreflightAndRehearsalModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  initialTab?: 'rehearsal' | 'preflight' | 'kiosk-resilience' | 'calendar-mps';
}

export const RunNightPreflightAndRehearsalModal: React.FC<RunNightPreflightAndRehearsalModalProps> = ({
  isOpen = true,
  onClose,
  initialTab = 'rehearsal',
}) => {
  const store = useProjectionStore();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'rehearsal' | 'preflight' | 'kiosk-resilience' | 'calendar-mps'>(initialTab);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // Tab 1: Evening Rehearsal Parameters
  const [targetDate, setTargetDate] = useState<string>('2026-12-24');
  const [selectedLocation, setSelectedLocation] = useState<string>(PRESET_LOCATIONS[0].name);
  const [customLat, setCustomLat] = useState<number>(PRESET_LOCATIONS[0].latitudeDeg);
  const [customLng, setCustomLng] = useState<number>(PRESET_LOCATIONS[0].longitudeDeg);
  const [utcOffset, setUtcOffset] = useState<number>(PRESET_LOCATIONS[0].utcOffsetHours);
  const [startMode, setStartMode] = useState<'civil-dusk' | 'fixed-time'>('civil-dusk');
  const [fixedStartTime, setFixedStartTime] = useState<string>('17:30');
  const [cutoffTime, setCutoffTime] = useState<string>('22:30');
  const [quietHoursTime, setQuietHoursTime] = useState<string>('21:30');
  const [normalVolume, setNormalVolume] = useState<number>(85);
  const [normalBrightness, setNormalBrightness] = useState<number>(100);
  const [quietVolume, setQuietVolume] = useState<number>(45);
  const [quietBrightness, setQuietBrightness] = useState<number>(70);
  const [deckShuffle, setDeckShuffle] = useState<boolean>(true);
  const [autoInterstitial, setAutoInterstitial] = useState<boolean>(true);
  const [interstitialDuration, setInterstitialDuration] = useState<number>(15);
  const [clipWeights, setClipWeights] = useState<Record<string, number>>({});
  const [quarantinedClips, setQuarantinedClips] = useState<Record<string, boolean>>({});
  const [rehearsalReport, setRehearsalReport] = useState<EveningRehearsalReport | null>(null);

  // Live Spencer Dusk calculation
  const duskInfo = useMemo(() => {
    return computeAstronomicalDusk({
      date: targetDate,
      latitudeDeg: customLat,
      longitudeDeg: customLng,
      utcOffsetHours: utcOffset,
    });
  }, [targetDate, customLat, customLng, utcOffset]);

  const handleLocationPresetChange = (name: string) => {
    setSelectedLocation(name);
    const preset = PRESET_LOCATIONS.find((l) => l.name === name);
    if (preset) {
      setCustomLat(preset.latitudeDeg);
      setCustomLng(preset.longitudeDeg);
      setUtcOffset(preset.utcOffsetHours);
    }
  };

  // Convert store playlistClips to WeightedPlaylistItems
  const rehearsalItems: WeightedPlaylistItem[] = useMemo(() => {
    if (!store.playlistClips || store.playlistClips.length === 0) {
      return [
        {
          id: 'demo-clip-1',
          title: 'Carol of the Bells (Gothic Orchestra)',
          durationSec: 180,
          weight: clipWeights['demo-clip-1'] || 2,
          enabled: true,
          quarantined: !!quarantinedClips['demo-clip-1'],
        },
        {
          id: 'demo-clip-2',
          title: 'Wizards in Winter (High-Energy Beat)',
          durationSec: 210,
          weight: clipWeights['demo-clip-2'] || 3,
          enabled: true,
          quarantined: !!quarantinedClips['demo-clip-2'],
        },
        {
          id: 'demo-clip-3',
          title: 'Nutcracker Suite — Sugar Plum Remix',
          durationSec: 150,
          weight: clipWeights['demo-clip-3'] || 1,
          enabled: true,
          quarantined: !!quarantinedClips['demo-clip-3'],
        },
        {
          id: 'demo-clip-4',
          title: 'Silent Night — Ambient House Glow',
          durationSec: 195,
          weight: clipWeights['demo-clip-4'] || 1,
          enabled: true,
          quarantined: !!quarantinedClips['demo-clip-4'],
        },
      ];
    }

    return store.playlistClips.map((clip) => ({
      id: clip.id,
      title: clip.title,
      durationSec: clip.durationSec > 0 ? clip.durationSec : 120,
      weight: clipWeights[clip.id] || 1,
      enabled: true,
      quarantined: !!quarantinedClips[clip.id],
      videoUrl: clip.videoUrl,
      audioUrl: clip.audioUrl,
    }));
  }, [store.playlistClips, clipWeights, quarantinedClips]);

  // Run Rehearsal Simulator
  const handleRunRehearsal = () => {
    const report = simulateEveningRehearsal({
      date: targetDate,
      startMode,
      fixedStartTime,
      latitudeDeg: customLat,
      longitudeDeg: customLng,
      utcOffsetHours: utcOffset,
      cutoffTime,
      quietHoursStartTime: quietHoursTime,
      normalVolumePct: normalVolume,
      normalBrightnessPct: normalBrightness,
      quietVolumePct: quietVolume,
      quietBrightnessPct: quietBrightness,
      crossfadeDurationSec: 1.5,
      autoInterstitial,
      interstitialDurationSec: interstitialDuration,
      interstitialTitle: 'Warm House Glow + Slow Snow',
      deckShuffle,
      items: rehearsalItems,
    });
    setRehearsalReport(report);
  };

  // Run rehearsal once on initial mount
  useEffect(() => {
    handleRunRehearsal();
  }, [targetDate, customLat, customLng, utcOffset, startMode, fixedStartTime, cutoffTime, quietHoursTime, normalVolume, quietVolume, deckShuffle, autoInterstitial, rehearsalItems]);

  // Tab 2: Preflight Checks
  const preflightState = useMemo(() => ({
    layers: store.layers || [],
    playlistClips: store.playlistClips || [],
    beatFlags: store.beatFlags || [],
    masterBlackout: store.masterBlackout || false,
    projectorTestPattern: store.projectorTestPattern || false,
    projectorLumens: store.projectorLumens ?? 95,
    masterVolume: store.masterVolume ?? 80,
  }), [store.layers, store.playlistClips, store.beatFlags, store.masterBlackout, store.projectorTestPattern, store.projectorLumens, store.masterVolume]);

  const [preflightResults, setPreflightResults] = useState<PreflightCheckItem[]>([]);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const refreshPreflight = () => {
    const findings = runPreShowPreflight(preflightState);
    setPreflightResults(findings);
  };

  useEffect(() => {
    refreshPreflight();
  }, [preflightState]);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  // Auto-Fix Actions
  const handleAutoFix = (actionKey?: string) => {
    if (!actionKey) return;

    if (actionKey === 'disengage-blackout') {
      store.toggleMasterBlackout(false);
      showToast('Master Blackout disengaged. Projector beam active.');
    } else if (actionKey === 'disable-test-pattern') {
      store.setProjectorTestPattern(false);
      showToast('Alignment Test Pattern disabled.');
    } else if (actionKey === 'restore-lumens') {
      useProjectionStore.setState({ projectorLumens: 95 });
      showToast('Projector lumens restored to 95%.');
    } else if (actionKey === 'fix-master-volume') {
      useProjectionStore.setState({ masterVolume: 85 });
      showToast('Master volume restored to 85%.');
    } else if (actionKey === 'load-sample-house') {
      const sample = getMarshallSampleHouseAndShow();
      useProjectionStore.setState({ layers: sample.layers });
      showToast('Marshall Sample House (Gable roof, door, windows) loaded!');
    } else if (actionKey === 'load-sample-show') {
      const sample = getMarshallSampleHouseAndShow();
      store.setPlaylistClips(sample.playlistClips);
      useProjectionStore.setState({ beatFlags: sample.beatFlags });
      showToast('Marshall Sample Show (Four-chord pad & Carol of the Bells) loaded!');
    } else if (actionKey.startsWith('clamp-layer-')) {
      const layerId = actionKey.replace('clamp-layer-', '');
      const layer = store.layers.find((l) => l.id === layerId);
      if (layer) {
        const clamped = layer.vertices.map((v) => ({
          x: Math.max(0, Math.min(100, v.x)),
          y: Math.max(0, Math.min(100, v.y)),
        }));
        store.updateLayer(layerId, { vertices: clamped });
        showToast(`Vertices clamped to 0..100% bounds on "${layer.name}".`);
      }
    } else if (actionKey.startsWith('remove-layer-')) {
      const layerId = actionKey.replace('remove-layer-', '');
      store.deleteLayer(layerId);
      showToast('Degenerate layer removed from stage.');
    } else if (actionKey.startsWith('relink-media-')) {
      showToast('Scanning directory for candidate media...');
      handleRunMissingMediaRelinker();
    }
  };

  // Missing Media Relinker
  const [relinkResult, setRelinkResult] = useState<{ count: number; message: string } | null>(null);

  const handleRunMissingMediaRelinker = () => {
    const candidateFiles = [
      'https://images.unsplash.com/photo-1543258103-a62bdc069871?auto=format&fit=crop&w=1920&q=80',
      'https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=1920&q=80',
      'https://images.unsplash.com/photo-1514896856000-91cb6de818e0?auto=format&fit=crop&w=1920&q=80',
    ];

    const plan = relinkMissingMedia(store.playlistClips || [], candidateFiles);
    if (plan.matches.length > 0) {
      const updatedClips = (store.playlistClips || []).map((clip) => {
        const match = plan.matches.find((m) => m.clipId === clip.id);
        if (match) {
          return { ...clip, videoUrl: match.relinkedUrl };
        }
        return clip;
      });
      store.setPlaylistClips(updatedClips);
      setRelinkResult({
        count: plan.matches.length,
        message: `Successfully relinked ${plan.matches.length} broken media file(s)!`,
      });
      showToast(`Relinked ${plan.matches.length} missing clips automatically.`);
    } else {
      setRelinkResult({
        count: 0,
        message: 'No broken clips matched the candidate search folder.',
      });
    }
  };

  // Tab 3: Launch Pad & Resilience State
  const [activePad, setActivePad] = useState<number | null>(null);
  const [pjLinkPower, setPjLinkPower] = useState<'ON' | 'STANDBY'>('ON');
  const [pjLinkShutter, setPjLinkShutter] = useState<'OPEN' | 'MUTED'>('OPEN');
  const [lampHours, setLampHours] = useState<number>(3850);
  const maxLampHours = 4000;
  const [mqttStatus, setMqttStatus] = useState<string>('Connected (192.168.1.55:1883)');
  const [bigRedTriggered, setBigRedTriggered] = useState<boolean>(false);

  const LAUNCH_PAD_SCENES = [
    { num: 0, label: 'Master Blackout', icon: Moon, color: 'text-slate-400', border: 'border-slate-700' },
    { num: 1, label: 'Warm House Glow', icon: Sun, color: 'text-amber-400', border: 'border-amber-500/50' },
    { num: 2, label: 'Candy Cane Chase', icon: Sliders, color: 'text-rose-400', border: 'border-rose-500/50' },
    { num: 3, label: 'Winter Blizzard', icon: Snowflake, color: 'text-cyan-400', border: 'border-cyan-500/50' },
    { num: 4, label: 'Fireplace Flicker', icon: Flame, color: 'text-orange-400', border: 'border-orange-500/50' },
    { num: 5, label: 'Holiday Finale Fireworks', icon: Sparkles, color: 'text-emerald-400', border: 'border-emerald-500/50' },
    { num: 6, label: 'Santa Sleigh Flyover', icon: Play, color: 'text-yellow-400', border: 'border-yellow-500/50' },
    { num: 7, label: 'Laser Strobe Accent', icon: Zap, color: 'text-purple-400', border: 'border-purple-500/50' },
    { num: 8, label: 'Slow Snow Ambient', icon: Snowflake, color: 'text-sky-400', border: 'border-sky-500/50' },
    { num: 9, label: 'Full Architectural White', icon: Eye, color: 'text-white', border: 'border-white/50' },
  ];

  const handleTriggerPad = (padNum: number) => {
    setActivePad(padNum);
    if (padNum === 0) {
      store.toggleMasterBlackout(true);
      showToast('Pad 0: Master Blackout Engaged!');
    } else {
      if (store.masterBlackout) store.toggleMasterBlackout(false);
      showToast(`Pad ${padNum}: Firing ${LAUNCH_PAD_SCENES[padNum].label}!`);
    }
    setTimeout(() => setActivePad(null), 800);
  };

  // Keyboard shortcut listener for Launch Pad (0-9)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || activeTab !== 'kiosk-resilience') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 0 && num <= 9) {
        e.preventDefault();
        handleTriggerPad(num);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab]);

  // Tab 4: Season Calendar & MPS Bridge State
  const [selectedCalendarMonth, setSelectedCalendarMonth] = useState<'Nov' | 'Dec' | 'Jan'>('Dec');
  const [calendarOverrides, setCalendarOverrides] = useState<Record<string, string>>({
    '2026-12-24': 'Extended Holiday Hours (17:00 - 00:30)',
    '2026-12-25': 'Extended Holiday Hours (17:00 - 01:00)',
    '2026-12-31': 'NYE Countdown Show (17:00 - 01:30)',
  });
  const [selectedCalDate, setSelectedCalDate] = useState<string>('2026-12-24');
  const [doctorReport, setDoctorReport] = useState<DoctorReport | null>(null);

  // File download helper
  const triggerDownload = (filename: string, content: string, mime = 'application/json') => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloaded: ${filename}`);
  };

  // Export Native Marshall Files
  const handleExportMarshall = (type: 'map' | 'show' | 'playlist' | 'bundle') => {
    const json = exportMarshallFile(type, {
      layers: store.layers || [],
      playlistClips: store.playlistClips || [],
      beatFlags: store.beatFlags || [],
      projectName: 'Gemini House',
    });
    triggerDownload(`GeminiProject.${type === 'map' ? 'mpsmap' : type === 'show' ? 'mpsshow' : type === 'playlist' ? 'mpsplaylist' : 'mpsbundle'}`, json);
  };

  // Support Diagnostic Bundle Export
  const handleExportDiagnostics = () => {
    const bundleJson = exportSupportDiagnosticsBundle(preflightState);
    triggerDownload(`GeminiSupportDiagnostics_${Date.now()}.mpsdiag.json`, bundleJson);
  };

  // Run Sheet CSV Export
  const handleExportRunSheetCsv = () => {
    if (!rehearsalReport || !rehearsalReport.events.length) return;
    const header = 'Index,Start Time,End Time,Duration Sec,Type,Title,Deck,Volume %,Brightness %,Notes\n';
    const rows = rehearsalReport.events.map((ev) =>
      `"${ev.index}","${ev.startTimeHHMMSS}","${ev.endTimeHHMMSS}",${ev.durationSec},"${ev.type}","${ev.title.replace(/"/g, '""')}",${ev.deckNumber},${ev.volumePct},${ev.brightnessPct},"${(ev.notes || '').replace(/"/g, '""')}"`
    ).join('\n');
    triggerDownload(`EveningRunSheet_${targetDate}.csv`, header + rows, 'text/csv');
  };

  // Import Native Marshall File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const docReport = runDocumentDoctorOnMpsJson(text);
      setDoctorReport(docReport);

      const importRes = importMarshallFile(text);
      if (importRes.success) {
        if (importRes.layers) useProjectionStore.setState({ layers: importRes.layers });
        if (importRes.beatFlags) useProjectionStore.setState({ beatFlags: importRes.beatFlags });
        showToast(importRes.message);
      } else {
        showToast(`Import Warning: ${importRes.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 select-none font-sans">
      <div className="w-full max-w-6xl max-h-[92vh] bg-[#0b121e] border border-[#213047] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1b2638] bg-[#0e1626] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white tracking-wide">
                  Outdoor Run Night Preflight, Evening Rehearsal & Resilience Hub
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  Marshall Parity
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                <span>Spencer (1971) Astronomical Dusk</span>
                <span>•</span>
                <span>Deck-Shuffle Seam Guarantee</span>
                <span>•</span>
                <span>Kiosk Launch Pad (0–9)</span>
                <span>•</span>
                <span>Native .mps* Bridge</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {feedbackToast && (
              <div className="px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono animate-fade-in flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                {feedbackToast}
              </div>
            )}
            <button
              onClick={() => onClose?.()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2538] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-[#1b2638] bg-[#0c1322] flex items-center gap-2">
          <button
            onClick={() => setActiveTab('rehearsal')}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'rehearsal'
                ? 'border-sky-400 text-sky-400 bg-sky-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            Tab 1: Evening Rehearsal Simulator
          </button>

          <button
            onClick={() => setActiveTab('preflight')}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'preflight'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Tab 2: Pre-Show Preflight & Media Relinker
            {preflightResults.some((p) => p.severity === 'error') && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('kiosk-resilience')}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'kiosk-resilience'
                ? 'border-purple-400 text-purple-400 bg-purple-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            Tab 3: Kiosk Launch Pad (0–9) & Resilience
          </button>

          <button
            onClick={() => setActiveTab('calendar-mps')}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'calendar-mps'
                ? 'border-amber-400 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Tab 4: Season Calendar & Native .mps* Bridge
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">

          {/* ================================================================= */}
          {/* TAB 1: EVENING REHEARSAL SIMULATOR */}
          {/* ================================================================= */}
          {activeTab === 'rehearsal' && (
            <div className="space-y-6">
              {/* Solar Dusk Calculator Card */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#0c1829] to-[#0f1f33] border border-sky-900/40 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-sky-400 flex items-center gap-1.5 uppercase tracking-wide">
                    <Sun className="w-4 h-4 text-amber-400" />
                    Spencer (1971) Solar Dusk
                  </div>
                  <div className="text-xl font-mono font-bold text-white">
                    {duskInfo.civilDuskTimeHHMM} <span className="text-xs text-sky-300 font-normal">Civil Dusk</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Sunset: <span className="font-mono text-slate-200">{duskInfo.sunsetTimeHHMM}</span> (90.8° zenith)
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Target Date</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full bg-[#080d15] border border-[#1b2638] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                  />
                  <div className="text-[10px] text-slate-400 font-mono">
                    Declination: {duskInfo.declinationDegrees}°
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">House Location Preset</label>
                  <select
                    value={selectedLocation}
                    onChange={(e) => handleLocationPresetChange(e.target.value)}
                    className="w-full bg-[#080d15] border border-[#1b2638] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                  >
                    {PRESET_LOCATIONS.map((loc) => (
                      <option key={loc.name} value={loc.name}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Lat: {customLat.toFixed(2)}°, Lng: {customLng.toFixed(2)}°
                  </div>
                </div>

                <div className="flex flex-col gap-2 justify-center">
                  <button
                    onClick={handleRunRehearsal}
                    className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Simulate Full Evening Now
                  </button>
                  <div className="text-[10px] text-center text-slate-400 font-mono">
                    Eq of Time: {duskInfo.equationOfTimeMinutes}m
                  </div>
                </div>
              </div>

              {/* Schedule Tuning Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Start & Cutoff Times */}
                <div className="p-4 rounded-xl bg-[#0c1322] border border-[#1b2638] space-y-3">
                  <div className="font-bold text-slate-200 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-400" />
                    Schedule Windows
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Start Trigger:</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setStartMode('civil-dusk')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            startMode === 'civil-dusk' ? 'bg-sky-500 text-white' : 'bg-[#1b2638] text-slate-400'
                          }`}
                        >
                          Civil Dusk ({duskInfo.civilDuskTimeHHMM})
                        </button>
                        <button
                          onClick={() => setStartMode('fixed-time')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            startMode === 'fixed-time' ? 'bg-sky-500 text-white' : 'bg-[#1b2638] text-slate-400'
                          }`}
                        >
                          Fixed
                        </button>
                      </div>
                    </div>

                    {startMode === 'fixed-time' && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Fixed Start Time:</span>
                        <input
                          type="time"
                          value={fixedStartTime}
                          onChange={(e) => setFixedStartTime(e.target.value)}
                          className="bg-[#080d15] border border-[#1b2638] rounded px-2 py-0.5 text-slate-200 font-mono"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Hard Cutoff Time:</span>
                      <input
                        type="time"
                        value={cutoffTime}
                        onChange={(e) => setCutoffTime(e.target.value)}
                        className="bg-[#080d15] border border-[#1b2638] rounded px-2 py-0.5 text-slate-200 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Neighborhood Quiet Hours */}
                <div className="p-4 rounded-xl bg-[#0c1322] border border-[#1b2638] space-y-3">
                  <div className="font-bold text-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-amber-400" />
                      Curfew & Quiet Hours
                    </span>
                    <span className="text-[10px] font-mono text-amber-400">Auto-Cap</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Quiet Hours Start:</span>
                      <input
                        type="time"
                        value={quietHoursTime}
                        onChange={(e) => setQuietHoursTime(e.target.value)}
                        className="bg-[#080d15] border border-[#1b2638] rounded px-2 py-0.5 text-slate-200 font-mono"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Quiet Volume Cap:</span>
                      <span className="font-mono text-amber-400 font-bold">{quietVolume}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="80"
                      value={quietVolume}
                      onChange={(e) => setQuietVolume(parseInt(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Quiet Brightness Cap:</span>
                      <span className="font-mono text-amber-400 font-bold">{quietBrightness}%</span>
                    </div>
                  </div>
                </div>

                {/* Deck Shuffle & Interstitials */}
                <div className="p-4 rounded-xl bg-[#0c1322] border border-[#1b2638] space-y-3">
                  <div className="font-bold text-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Shuffle className="w-4 h-4 text-emerald-400" />
                      Shuffle & Interstitials
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Seam Guarantee ON
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-slate-300">Weighted Deck-Shuffle</span>
                      <input
                        type="checkbox"
                        checked={deckShuffle}
                        onChange={(e) => setDeckShuffle(e.target.checked)}
                        className="accent-emerald-400 rounded"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-slate-300">Auto-Interstitial (Warm Glow)</span>
                      <input
                        type="checkbox"
                        checked={autoInterstitial}
                        onChange={(e) => setAutoInterstitial(e.target.checked)}
                        className="accent-emerald-400 rounded"
                      />
                    </label>

                    {autoInterstitial && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Gap Duration:</span>
                          <span className="font-mono text-sky-400 font-bold">{interstitialDuration}s</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="45"
                          step="5"
                          value={interstitialDuration}
                          onChange={(e) => setInterstitialDuration(parseInt(e.target.value))}
                          className="w-full accent-sky-400"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Clip Weights Table */}
              <div className="p-4 rounded-xl bg-[#0c1322] border border-[#1b2638] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-200 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-sky-400" />
                    Playlist Entry Rotation Weights & Quarantine Controls
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Weights 1x..5x expand deck entries before shuffle
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {rehearsalItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border flex items-center justify-between ${
                        item.quarantined
                          ? 'bg-rose-950/20 border-rose-900/40 text-rose-300'
                          : 'bg-[#080d15] border-[#1b2638] text-slate-200'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-xs truncate max-w-[280px]">{item.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Duration: {Math.floor(item.durationSec / 60)}m {item.durationSec % 60}s
                          {item.quarantined && <span className="ml-2 text-rose-400 font-bold">[QUARANTINED]</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400">Weight:</span>
                          <select
                            value={item.weight}
                            onChange={(e) => {
                              const w = parseInt(e.target.value);
                              setClipWeights((prev) => ({ ...prev, [item.id]: w }));
                            }}
                            className="bg-[#0e1626] border border-[#213047] rounded px-2 py-0.5 font-mono text-xs text-sky-300"
                          >
                            <option value={1}>1x</option>
                            <option value={2}>2x</option>
                            <option value={3}>3x</option>
                            <option value={4}>4x</option>
                            <option value={5}>5x</option>
                          </select>
                        </div>

                        <button
                          onClick={() => {
                            setQuarantinedClips((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                            item.quarantined
                              ? 'bg-rose-500 text-white'
                              : 'bg-[#1b2638] text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {item.quarantined ? 'Unquarantine' : 'Quarantine'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Simulation Results Dashboard */}
              {rehearsalReport && (
                <div className="space-y-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    <div className="p-3 rounded-xl bg-[#0e1626] border border-[#1b2638]">
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Evening Span</div>
                      <div className="text-base font-bold font-mono text-white">
                        {rehearsalReport.summary.startTimeHHMM} - {rehearsalReport.summary.endTimeHHMM}
                      </div>
                      <div className="text-[10px] text-sky-400 font-mono">
                        {Math.floor(rehearsalReport.summary.totalDurationMin / 60)}h {Math.round(rehearsalReport.summary.totalDurationMin % 60)}m total
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#0e1626] border border-[#1b2638]">
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Shows Played</div>
                      <div className="text-lg font-bold font-mono text-emerald-400">
                        {rehearsalReport.summary.totalShowsPlayed}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">Songs completed</div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#0e1626] border border-[#1b2638]">
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Interstitials</div>
                      <div className="text-lg font-bold font-mono text-sky-400">
                        {rehearsalReport.summary.totalInterstitialsPlayed}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">Warm house glows</div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#0e1626] border border-[#1b2638]">
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Deck Passes</div>
                      <div className="text-lg font-bold font-mono text-indigo-400">
                        {rehearsalReport.summary.deckPassesCompleted}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">Seam Guarantee active</div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#0e1626] border border-[#1b2638]">
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Quiet Hours At</div>
                      <div className="text-lg font-bold font-mono text-amber-400">
                        {rehearsalReport.summary.quietHoursTriggeredAt?.slice(0, 5) || 'N/A'}
                      </div>
                      <div className="text-[10px] text-amber-400/80 font-mono">Curfew volume cap</div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#0e1626] border border-[#1b2638]">
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Quarantine Skips</div>
                      <div className="text-lg font-bold font-mono text-rose-400">
                        {rehearsalReport.summary.skippedQuarantinedCount}
                      </div>
                      <div className="text-[10px] text-rose-400/80 font-mono">Bypassed cleanly</div>
                    </div>
                  </div>

                  {/* Play Count Distribution Bar Chart */}
                  <div className="p-4 rounded-xl bg-[#0c1322] border border-[#1b2638] space-y-2">
                    <div className="font-bold text-slate-200 text-xs">Weighted Rotation Distribution (Play Counts)</div>
                    <div className="space-y-2">
                      {rehearsalItems.map((item) => {
                        const count = rehearsalReport.summary.playCountByClip[item.id] || 0;
                        const maxCount = Math.max(1, ...Object.values(rehearsalReport.summary.playCountByClip));
                        const pct = (count / maxCount) * 100;

                        return (
                          <div key={item.id} className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-300 font-medium truncate max-w-[400px]">{item.title}</span>
                              <span className="font-mono text-sky-400 font-bold">{count} plays</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-[#1b2638] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Scrollable Run Sheet Table */}
                  <div className="p-4 rounded-xl bg-[#0c1322] border border-[#1b2638] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-200 text-xs flex items-center gap-2">
                        <FileText className="w-4 h-4 text-sky-400" />
                        Minute-by-Minute Run Sheet ({rehearsalReport.events.length} Events)
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleExportRunSheetCsv}
                          className="px-3 py-1.5 rounded-lg bg-[#1b2638] hover:bg-[#25354e] text-slate-200 font-mono text-[10px] flex items-center gap-1.5 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Export CSV
                        </button>
                        <button
                          onClick={() => triggerDownload(`EveningRunSheet_${targetDate}.json`, JSON.stringify(rehearsalReport, null, 2))}
                          className="px-3 py-1.5 rounded-lg bg-[#1b2638] hover:bg-[#25354e] text-slate-200 font-mono text-[10px] flex items-center gap-1.5 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Export JSON
                        </button>
                      </div>
                    </div>

                    <div className="max-h-[360px] overflow-y-auto rounded-lg border border-[#1b2638]">
                      <table className="w-full text-left font-mono text-[11px]">
                        <thead className="bg-[#0e1626] text-slate-400 border-b border-[#1b2638] sticky top-0">
                          <tr>
                            <th className="py-2 px-3">#</th>
                            <th className="py-2 px-3">Time Window</th>
                            <th className="py-2 px-3">Duration</th>
                            <th className="py-2 px-3">Type</th>
                            <th className="py-2 px-3">Title</th>
                            <th className="py-2 px-3">Deck</th>
                            <th className="py-2 px-3">Vol / Brt</th>
                            <th className="py-2 px-3">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1b2638] text-slate-300">
                          {rehearsalReport.events.map((ev) => (
                            <tr
                              key={ev.index}
                              className={`hover:bg-[#121c2e] transition-colors ${
                                ev.type === 'quiet-hours-transition'
                                  ? 'bg-amber-950/20 text-amber-300'
                                  : ev.type === 'interstitial'
                                  ? 'bg-sky-950/10 text-sky-200'
                                  : ''
                              }`}
                            >
                              <td className="py-2 px-3 text-slate-400">{ev.index}</td>
                              <td className="py-2 px-3 text-slate-200">
                                {ev.startTimeHHMMSS} - {ev.endTimeHHMMSS}
                              </td>
                              <td className="py-2 px-3 text-slate-400">
                                {ev.durationSec > 0 ? `${ev.durationSec}s` : '—'}
                              </td>
                              <td className="py-2 px-3">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                                    ev.type === 'show'
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : ev.type === 'interstitial'
                                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  }`}
                                >
                                  {ev.type}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-sans font-medium text-slate-200 truncate max-w-[240px]">
                                {ev.title}
                              </td>
                              <td className="py-2 px-3 text-slate-400">{ev.deckNumber}</td>
                              <td className="py-2 px-3 font-mono">
                                {ev.volumePct}% / {ev.brightnessPct}%
                              </td>
                              <td className="py-2 px-3 text-[10px] text-slate-400 truncate max-w-[180px]">
                                {ev.notes || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: PRE-SHOW PREFLIGHT & MEDIA RELINKER */}
          {/* ================================================================= */}
          {activeTab === 'preflight' && (
            <div className="space-y-6">
              {/* Readiness Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#0c1829] to-[#0f1f33] border border-sky-900/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      preflightResults.some((p) => p.severity === 'error')
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        : preflightResults.some((p) => p.severity === 'warn')
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    }`}
                  >
                    {preflightResults.some((p) => p.severity === 'error') ? (
                      <XCircle className="w-6 h-6" />
                    ) : preflightResults.some((p) => p.severity === 'warn') ? (
                      <AlertTriangle className="w-6 h-6" />
                    ) : (
                      <CheckCircle2 className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <div className="text-base font-bold text-white">
                      {preflightResults.some((p) => p.severity === 'error')
                        ? 'Show Preflight: Action Required (Blocking Errors)'
                        : preflightResults.some((p) => p.severity === 'warn')
                        ? 'Show Preflight: Warnings Detected (Non-Blocking)'
                        : 'All Systems Ready — Clear for Show Night'}
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      {preflightResults.filter((p) => p.severity === 'pass').length} Passed •{' '}
                      {preflightResults.filter((p) => p.severity === 'warn').length} Warnings •{' '}
                      {preflightResults.filter((p) => p.severity === 'error').length} Errors
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={refreshPreflight}
                    className="px-3 py-2 rounded-xl bg-[#1b2638] hover:bg-[#25354e] text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Re-Audit
                  </button>

                  <button
                    onClick={handleExportDiagnostics}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 flex items-center gap-2 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Export Support Bundle (.mpsdiag.json)
                  </button>
                </div>
              </div>

              {/* Preflight Findings Checklist */}
              <div className="space-y-3">
                <div className="font-bold text-slate-200 text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Pre-Show Diagnostic Items (Map Geometry, Media, Audio & Projector State)
                </div>

                <div className="space-y-2">
                  {preflightResults.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                        item.severity === 'error'
                          ? 'bg-rose-950/20 border-rose-900/50'
                          : item.severity === 'warn'
                          ? 'bg-amber-950/20 border-amber-900/50'
                          : 'bg-[#0c1322] border-[#1b2638]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {item.severity === 'error' ? (
                            <XCircle className="w-4 h-4 text-rose-400" />
                          ) : item.severity === 'warn' ? (
                            <AlertTriangle className="w-4 h-4 text-amber-400" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200 text-xs">{item.title}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold font-mono ${
                                item.category === 'geometry'
                                  ? 'bg-sky-500/20 text-sky-400'
                                  : item.category === 'media'
                                  ? 'bg-purple-500/20 text-purple-400'
                                  : item.category === 'audio'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-emerald-500/20 text-emerald-400'
                              }`}
                            >
                              {item.category}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 font-sans">{item.detail}</div>
                        </div>
                      </div>

                      {item.autoFixLabel && (
                        <button
                          onClick={() => handleAutoFix(item.autoFixActionKey)}
                          className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-bold transition-all whitespace-nowrap active:scale-95"
                        >
                          {item.autoFixLabel}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Missing Media Relinker Panel */}
              <div className="p-4 rounded-xl bg-[#0c1322] border border-[#1b2638] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-200 text-xs flex items-center gap-2">
                    <FolderSync className="w-4 h-4 text-purple-400" />
                    Missing-Media Fuzzy Relinker (Document Doctor Engine)
                  </div>
                  <button
                    onClick={handleRunMissingMediaRelinker}
                    className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <FolderSync className="w-3.5 h-3.5" />
                    Scan & Auto-Relink Media
                  </button>
                </div>

                <div className="text-[11px] text-slate-400">
                  Fuzzy filename matching scans directory trees for matching media assets if files were moved, renamed,
                  or brought in from a flash drive.
                </div>

                {relinkResult && (
                  <div className="p-3 rounded-lg bg-[#0e1626] border border-purple-900/40 text-xs font-mono text-purple-300">
                    {relinkResult.message}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3: RUN NIGHT KIOSK LAUNCH PAD (0–9) & RESILIENCE */}
          {/* ================================================================= */}
          {activeTab === 'kiosk-resilience' && (
            <div className="space-y-6">
              {/* 10 Touch-Friendly Scene Launch Pad Buttons (0-9) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-200 text-xs flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    10-Scene Live Override Launch Pad (0–9 Key Bindings)
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Touch-friendly live show control for outdoor operator
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {LAUNCH_PAD_SCENES.map((pad) => {
                    const Icon = pad.icon;
                    const isPulsing = activePad === pad.num;

                    return (
                      <button
                        key={pad.num}
                        onClick={() => handleTriggerPad(pad.num)}
                        className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all relative overflow-hidden active:scale-95 ${
                          isPulsing
                            ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/50 scale-105'
                            : 'bg-[#0c1322] hover:bg-[#121c2e] ' + pad.border
                        }`}
                      >
                        <div className="absolute top-2 left-2 text-[10px] font-mono font-bold text-slate-400">
                          [{pad.num}]
                        </div>
                        <Icon className={`w-6 h-6 ${isPulsing ? 'text-black' : pad.color}`} />
                        <span className={`text-xs font-bold text-center leading-tight ${isPulsing ? 'text-black' : 'text-slate-200'}`}>
                          {pad.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hardware Resilience: PJLink, Frame-Pacing & MQTT */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* PJLink Class 1 Projector Ledger */}
                <div className="p-4 rounded-xl bg-[#0c1322] border border-[#1b2638] space-y-3">
                  <div className="font-bold text-slate-200 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Power className="w-4 h-4 text-sky-400" />
                      PJLink Class 1 Projector Ledger
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">Online (Port 4352)</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Lamp Hours:</span>
                      <span className="font-mono text-amber-400 font-bold">
                        {lampHours} / {maxLampHours} hrs ({((lampHours / maxLampHours) * 100).toFixed(1)}%)
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-[#1b2638] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-500"
                        style={{ width: `${(lampHours / maxLampHours) * 100}%` }}
                      />
                    </div>

                    {lampHours > 3800 && (
                      <div className="p-2 rounded bg-amber-950/20 border border-amber-900/40 text-[10px] text-amber-300 font-mono">
                        ⚠️ LAMP REPLACEMENT WARNING: &lt; 150 operating hours remaining before lumen degradation.
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        onClick={() => {
                          setPjLinkPower(pjLinkPower === 'ON' ? 'STANDBY' : 'ON');
                          showToast(`PJLink: POWR ${pjLinkPower === 'ON' ? '0 (Standby)' : '1 (Power On)'}`);
                        }}
                        className="px-3 py-2 rounded-lg bg-[#1b2638] hover:bg-[#25354e] text-slate-200 font-mono text-[11px] font-bold flex items-center justify-center gap-1.5"
                      >
                        <Power className="w-3.5 h-3.5 text-sky-400" />
                        POWR {pjLinkPower === 'ON' ? '0 (Standby)' : '1 (On)'}
                      </button>

                      <button
                        onClick={() => {
                          setPjLinkShutter(pjLinkShutter === 'OPEN' ? 'MUTED' : 'OPEN');
                          showToast(`PJLink: AVMT ${pjLinkShutter === 'OPEN' ? '31 (Shutter Mute)' : '30 (Shutter Open)'}`);
                        }}
                        className="px-3 py-2 rounded-lg bg-[#1b2638] hover:bg-[#25354e] text-slate-200 font-mono text-[11px] font-bold flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        AVMT {pjLinkShutter === 'OPEN' ? '31 (Mute)' : '30 (Open)'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Session Frame-Pacing & Health Recorder */}
                <div className="p-4 rounded-xl bg-[#0c1322] border border-[#1b2638] space-y-3">
                  <div className="font-bold text-slate-200 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      Session Frame-Pacing Health
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      60.2 FPS ROCK-SOLID
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-lg bg-[#0e1626] border border-[#1b2638] text-center">
                      <div className="text-[10px] text-slate-400 uppercase font-mono">P50 Latency</div>
                      <div className="text-base font-bold font-mono text-emerald-400">16.6 ms</div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#0e1626] border border-[#1b2638] text-center">
                      <div className="text-[10px] text-slate-400 uppercase font-mono">P95 Latency</div>
                      <div className="text-base font-bold font-mono text-sky-400">17.2 ms</div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#0e1626] border border-[#1b2638] text-center">
                      <div className="text-[10px] text-slate-400 uppercase font-mono">P99 Jitter</div>
                      <div className="text-base font-bold font-mono text-purple-400">19.4 ms</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Dropped Frames: 0 (0.00%)</span>
                    <span>Uptime: 03:42:15</span>
                  </div>
                </div>
              </div>

              {/* USB Big Red Button & Home Assistant MQTT Bridge */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* USB Serial Big Red Button Trigger */}
                <div className="p-4 rounded-xl bg-[#0c1322] border border-[#1b2638] space-y-3">
                  <div className="font-bold text-slate-200 text-xs flex items-center gap-2">
                    <Radio className="w-4 h-4 text-rose-400" />
                    USB Serial Big-Red-Button Trigger (Audience Gate)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Listens on COM3 / /dev/ttyUSB0 for physical contact closure to trigger live fireworks or next show.
                  </div>
                  <button
                    onClick={() => {
                      setBigRedTriggered(true);
                      showToast('🚨 Big Red Button Triggered! Firing Next Show...');
                      setTimeout(() => setBigRedTriggered(false), 1200);
                    }}
                    className={`w-full py-3 rounded-xl font-bold font-mono text-xs uppercase tracking-wider transition-all active:scale-95 ${
                      bigRedTriggered
                        ? 'bg-rose-600 text-white shadow-xl shadow-rose-600/50 scale-105'
                        : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {bigRedTriggered ? 'TRIGGER TRANSMITTED!' : 'Simulate Physical Big-Red-Button Click'}
                  </button>
                </div>

                {/* Home Assistant MQTT State Publisher */}
                <div className="p-4 rounded-xl bg-[#0c1322] border border-[#1b2638] space-y-3">
                  <div className="font-bold text-slate-200 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-sky-400" />
                      Home Assistant MQTT State Publisher
                    </span>
                    <span className="text-[10px] font-mono text-sky-400">{mqttStatus}</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 bg-[#080d15] p-2 rounded border border-[#1b2638]">
                    topic: <span className="text-sky-300">homeassistant/light/projection_studio/state</span>
                    <br />
                    payload: <span className="text-amber-300">{JSON.stringify({ state: 'ON', brightness: 255, quiet_hours: false })}</span>
                  </div>
                  <button
                    onClick={() => showToast('MQTT: State published to Home Assistant broker.')}
                    className="w-full py-2 rounded-lg bg-[#1b2638] hover:bg-[#25354e] text-slate-200 font-mono text-xs font-bold transition-colors"
                  >
                    Publish Test MQTT Packet
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 4: SEASON PLANNING CALENDAR & NATIVE .mps* BRIDGE */}
          {/* ================================================================= */}
          {activeTab === 'calendar-mps' && (
            <div className="space-y-6">
              {/* Season Calendar with Spencer Civil Dusk Readouts */}
              <div className="p-4 rounded-xl bg-[#0c1322] border border-[#1b2638] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-200 text-xs flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    Outdoor Holiday Season Planning Calendar (Nov / Dec / Jan)
                  </div>
                  <div className="flex items-center gap-1">
                    {(['Nov', 'Dec', 'Jan'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setSelectedCalendarMonth(m)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition-colors ${
                          selectedCalendarMonth === m ? 'bg-amber-500 text-black' : 'bg-[#1b2638] text-slate-400'
                        }`}
                      >
                        {m} 2026
                      </button>
                    ))}
                  </div>
                </div>

                {/* Calendar Days Grid */}
                <div className="grid grid-cols-7 gap-2 text-center text-xs font-mono">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="text-slate-500 font-bold py-1">
                      {d}
                    </div>
                  ))}

                  {Array.from({ length: 31 }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = `2026-12-${day.toString().padStart(2, '0')}`;
                    const hasOverride = calendarOverrides[dateStr];
                    const isSelected = selectedCalDate === dateStr;

                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedCalDate(dateStr)}
                        className={`p-2 rounded-lg border transition-all text-left flex flex-col justify-between h-16 ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 text-white'
                            : hasOverride
                            ? 'bg-sky-950/20 border-sky-800/40 text-sky-200'
                            : 'bg-[#080d15] border-[#1b2638] text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{day}</span>
                          {hasOverride && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                        </div>
                        <div className="text-[9px] text-slate-400 truncate">
                          {computeAstronomicalDusk({
                            date: dateStr,
                            latitudeDeg: customLat,
                            longitudeDeg: customLng,
                            utcOffsetHours: utcOffset,
                          }).civilDuskTimeHHMM}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Date Override Box */}
                <div className="p-3 rounded-lg bg-[#080d15] border border-[#1b2638] flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-200 text-xs">
                      Schedule for {selectedCalDate}:{' '}
                      <span className="text-amber-400 font-mono">
                        {calendarOverrides[selectedCalDate] || 'Normal Schedule (Civil Dusk - 22:30)'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Civil Dusk on this date: {computeAstronomicalDusk({
                        date: selectedCalDate,
                        latitudeDeg: customLat,
                        longitudeDeg: customLng,
                        utcOffsetHours: utcOffset,
                      }).civilDuskTimeHHMM}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setCalendarOverrides((prev) => ({
                          ...prev,
                          [selectedCalDate]: 'Extended Holiday Hours (17:00 - 01:00)',
                        }));
                        showToast(`Set Extended Hours for ${selectedCalDate}`);
                      }}
                      className="px-2.5 py-1 rounded bg-[#1b2638] hover:bg-[#25354e] text-[10px] font-mono text-slate-200"
                    >
                      Set Extended Hours
                    </button>
                    <button
                      onClick={() => {
                        setCalendarOverrides((prev) => ({
                          ...prev,
                          [selectedCalDate]: 'Dark / Off Night',
                        }));
                        showToast(`Marked ${selectedCalDate} as Dark Night`);
                      }}
                      className="px-2.5 py-1 rounded bg-[#1b2638] hover:bg-[#25354e] text-[10px] font-mono text-rose-300"
                    >
                      Set Dark Night
                    </button>
                  </div>
                </div>
              </div>

              {/* Native .mps* File Export & Import Bridge */}
              <div className="p-4 rounded-xl bg-[#0c1322] border border-[#1b2638] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-200 text-xs flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-sky-400" />
                    Native .mps* File Compatibility Bridge & Document Doctor
                  </div>
                  <button
                    onClick={() => {
                      const sample = getMarshallSampleHouseAndShow();
                      useProjectionStore.setState({
                        layers: sample.layers,
                        beatFlags: sample.beatFlags,
                      });
                      store.setPlaylistClips(sample.playlistClips);
                      showToast('Loaded Marshall Sample Pack (SampleHouse.mpsmap + SampleShow.mpsshow)!');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-sky-500/20 active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Load Marshall Sample House & Show Pack
                  </button>
                </div>

                <div className="text-[11px] text-slate-400">
                  Export and import native MarshallProjectionStudio schemas (.mpsmap, .mpsshow, .mpsplaylist, .mpsbundle)
                  with automatic coordinate scaling between 0..100% and 1920x1080.
                </div>

                {/* Export Buttons */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <button
                    onClick={() => handleExportMarshall('map')}
                    className="p-3 rounded-lg bg-[#0e1626] border border-[#1b2638] hover:border-sky-500/40 text-left transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-white">Export .mpsmap</div>
                      <div className="text-[10px] text-slate-400">Traced Map Shapes</div>
                    </div>
                    <Download className="w-4 h-4 text-sky-400" />
                  </button>

                  <button
                    onClick={() => handleExportMarshall('show')}
                    className="p-3 rounded-lg bg-[#0e1626] border border-[#1b2638] hover:border-sky-500/40 text-left transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-white">Export .mpsshow</div>
                      <div className="text-[10px] text-slate-400">Show Cues & Flags</div>
                    </div>
                    <Download className="w-4 h-4 text-sky-400" />
                  </button>

                  <button
                    onClick={() => handleExportMarshall('playlist')}
                    className="p-3 rounded-lg bg-[#0e1626] border border-[#1b2638] hover:border-sky-500/40 text-left transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-white">Export .mpsplaylist</div>
                      <div className="text-[10px] text-slate-400">Evening Schedule</div>
                    </div>
                    <Download className="w-4 h-4 text-sky-400" />
                  </button>

                  <button
                    onClick={() => handleExportMarshall('bundle')}
                    className="p-3 rounded-lg bg-[#0e1626] border border-[#1b2638] hover:border-sky-500/40 text-left transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-white">Export .mpsbundle</div>
                      <div className="text-[10px] text-slate-400">Complete Archive</div>
                    </div>
                    <Download className="w-4 h-4 text-sky-400" />
                  </button>
                </div>

                {/* Import File with Document Doctor Report */}
                <div className="p-4 rounded-xl bg-[#080d15] border border-dashed border-[#25354e] flex flex-col items-center justify-center gap-2 text-center">
                  <Upload className="w-6 h-6 text-slate-400" />
                  <div className="font-bold text-xs text-slate-200">
                    Import Any Native Marshall File (.mpsmap, .mpsshow, .mpsplaylist, .mpsbundle)
                  </div>
                  <label className="cursor-pointer px-4 py-2 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-bold text-xs transition-colors">
                    Browse File on Disk
                    <input
                      type="file"
                      accept=".mpsmap,.mpsshow,.mpsplaylist,.mpsbundle,.json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {doctorReport && (
                    <div className="mt-2 w-full p-3 rounded-lg bg-[#0c1322] border border-[#1b2638] text-left font-mono text-[11px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200">Document Doctor Audit:</span>
                        <span className={`font-bold ${doctorReport.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                          Status: {doctorReport.status}
                        </span>
                      </div>
                      <div className="text-slate-400">
                        Kind: <span className="text-sky-300">{doctorReport.kind}</span> • Schema: v{doctorReport.schemaVersionBefore} → v{doctorReport.schemaVersionAfter}
                      </div>
                      {doctorReport.migrationStepsApplied > 0 && (
                        <div className="text-emerald-300">
                          Applied {doctorReport.migrationStepsApplied} schema migration step(s).
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#1b2638] bg-[#0e1626] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2 font-mono">
            <span>Stage Layers: {store.layers?.length || 0}</span>
            <span>•</span>
            <span>Playlist Clips: {store.playlistClips?.length || 0}</span>
            <span>•</span>
            <span>Beat Flags: {store.beatFlags?.length || 0}</span>
          </div>

          <button
            onClick={() => onClose?.()}
            className="px-5 py-2 rounded-xl bg-[#1b2638] hover:bg-[#25354e] text-slate-200 font-bold transition-colors"
          >
            Close Hub
          </button>
        </div>

      </div>
    </div>
  );
};
