import React, { useState } from 'react';
import {
  QrCode,
  Smartphone,
  Users,
  Sun,
  Moon,
  Sunset,
  Sunrise,
  Clock,
  Calendar,
  Zap,
  Ghost,
  CloudLightning,
  AlertTriangle,
  Shield,
  Volume2,
  VolumeX,
  Lightbulb,
  Radio,
  CheckCircle2,
  RefreshCw,
  Send,
  Power,
  Flame,
  ArrowLeft,
  Save,
  Eye,
  Sliders,
  Sparkles,
  Copy,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useProjectionStore } from '../store/useProjectionStore';

export const Screen9AudienceAutomation: React.FC = () => {
  const {
    audiencePortalEnabled,
    spectatorCount,
    allowCrowdVoting,
    allowCrowdTriggers,
    crowdCooldownSec,
    activeCrowdEffect,
    pollOptions,
    triggerItems,
    recentCrowdEvents,
    castAudienceVote,
    fireAudienceTrigger,
    toggleAudiencePortal,
    setCrowdPermissions,

    solarEphemeris,
    duskToDawnSchedulerEnabled,
    scheduleDays,
    courtesyModeActive,
    courtesyVolumeLevel,
    toggleCourtesyMode,
    setCourtesyVolumeLevel,
    toggleDuskToDawnScheduler,
    updateScheduleDay,
    updateSolarLocation,

    smartHomeBridgeEnabled,
    mqttBrokerUrl,
    smartEntities,
    toggleSmartHomeBridge,
    setSmartEntityState,
    testSmartHomeTrigger,

    motionSensorEnabled,
    lastMotionDetectedAt,
    simulateSidewalkMotionDetection,
    navigateBack,
    saveCurrentProject,
    showToast,
  } = useProjectionStore();

  const [activeTab, setActiveTab] = useState<
    'audience' | 'scheduler' | 'smarthome'
  >('audience');
  const [selectedCity, setSelectedCity] = useState(solarEphemeris.cityName);
  const [customLat, setCustomLat] = useState(solarEphemeris.latitude);
  const [customLng, setCustomLng] = useState(solarEphemeris.longitude);
  const [copiedLink, setCopiedLink] = useState(false);

  const CITY_PRESETS = [
    { city: 'Austin, TX (Home Studio)', lat: 30.2672, lng: -97.7431 },
    { city: 'New York, NY', lat: 40.7128, lng: -74.006 },
    { city: 'Los Angeles, CA', lat: 34.0522, lng: -118.2437 },
    { city: 'Chicago, IL', lat: 41.8781, lng: -87.6298 },
    { city: 'Denver, CO', lat: 39.7392, lng: -104.9903 },
    { city: 'London, UK', lat: 51.5074, lng: -0.1278 },
  ];

  const totalVotes = pollOptions.reduce((sum, opt) => sum + opt.votes, 0);

  const handleCopyPortalLink = () => {
    const url = `${window.location.origin}/?remote=true`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedLink(true);
    showToast(`Copied Audience Remote URL to Clipboard: ${url}`);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCitySelect = (cityName: string) => {
    const found = CITY_PRESETS.find((c) => c.city === cityName);
    if (found) {
      setSelectedCity(found.city);
      setCustomLat(found.lat);
      setCustomLng(found.lng);
      updateSolarLocation(found.city, found.lat, found.lng);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0e17] text-slate-100 overflow-hidden select-none">
      {/* TOP CONTROL DECK */}
      <div className="h-14 bg-[#111724] border-b border-[#222d3f] px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={navigateBack}
            className="py-1 px-3 rounded-md bg-[#182335] hover:bg-[#202f48] border border-cyan-500/60 hover:border-cyan-400 text-cyan-300 hover:text-white text-xs font-extrabold tracking-wider uppercase inline-flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)] cursor-pointer"
            title="Go back to previous screen (Alt+Left)"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
            <span>BACK</span>
          </button>

          <button
            type="button"
            onClick={saveCurrentProject}
            className="py-1 px-3 rounded-md bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/70 hover:border-emerald-400 text-emerald-300 hover:text-white text-xs font-extrabold tracking-wider uppercase inline-flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(16,185,129,0.25)] cursor-pointer"
            title="Save current project to storage (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5 text-emerald-400" />
            <span>SAVE</span>
          </button>

          <div className="h-6 w-[1px] bg-[#223147] mx-0.5" />

          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-wider uppercase text-white">
                SCREEN 10: AUDIENCE PORTAL &amp; SMART AUTOMATION
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                v3.5 AUTO-PILOT
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Live Spectator Remote • Dusk-to-Dawn Solar Ephemeris • Home
              Assistant MQTT Bridge
            </div>
          </div>
        </div>

        {/* Global Action Badges & Courtesy Mode Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => toggleCourtesyMode()}
            className={`px-3 py-1.5 rounded-md border text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              courtesyModeActive
                ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.35)] animate-pulse'
                : 'bg-[#182232] hover:bg-[#223046] border-[#2c3d56] text-slate-300 hover:text-white'
            }`}
            title="Temporarily cap master audio to 25% and soften strobe flashes"
          >
            {courtesyModeActive ? (
              <VolumeX className="w-4 h-4 text-amber-300" />
            ) : (
              <Volume2 className="w-4 h-4 text-slate-400" />
            )}
            <span>
              {courtesyModeActive
                ? `COURTESY MODE (${courtesyVolumeLevel}%)`
                : 'NEIGHBORHOOD COURTESY'}
            </span>
          </button>

          <button
            type="button"
            onClick={simulateSidewalkMotionDetection}
            className="px-3 py-1.5 rounded-md bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/60 text-purple-300 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Simulate a sidewalk guest tripping PIR_01 sensor to test jump-scares"
          >
            <Ghost className="w-4 h-4 text-purple-400" />
            <span>TEST MOTION JUMP-SCARE</span>
          </button>

          <button
            type="button"
            onClick={() => toggleAudiencePortal()}
            className={`px-3 py-1.5 rounded-md border text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${
              audiencePortalEnabled
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>
              PORTAL: {audiencePortalEnabled ? 'ONLINE' : 'SUSPENDED'}
            </span>
          </button>
        </div>
      </div>

      {/* SUB-NAVIGATION TABS */}
      <div className="h-10 bg-[#0e1420] border-b border-[#1e293b] px-5 flex items-center gap-4 text-xs font-bold uppercase tracking-wider">
        <button
          type="button"
          onClick={() => setActiveTab('audience')}
          className={`h-full border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'audience'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Audience Mobile Remote &amp; Live Voting</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-900/60 text-cyan-200">
            {spectatorCount} Live
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('scheduler')}
          className={`h-full border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'scheduler'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sunset className="w-3.5 h-3.5" />
          <span>Dusk-to-Dawn Astronomical Scheduler</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-900/60 text-amber-200">
            Dusk {solarEphemeris.civilDusk}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('smarthome')}
          className={`h-full border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'smarthome'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5" />
          <span>Home Assistant &amp; MQTT Bridge</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-900/60 text-emerald-200">
            {smartEntities.length} Fixtures
          </span>
        </button>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 p-5 overflow-y-auto">
        {activeTab === 'audience' && (
          <div className="grid grid-cols-12 gap-5 h-full">
            {/* LEFT: QR CODE, ACCESS LINK & PERMISSIONS (4 Cols) */}
            <div className="col-span-4 bg-[#121927] border border-[#233148] rounded-xl p-5 flex flex-col justify-between">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-cyan-400" />
                    <span className="text-sm font-bold uppercase tracking-wider text-white">
                      Sidewalk Guest Portal
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/50">
                    SCAN &amp; PLAY
                  </span>
                </div>

                {/* Scannable High-Contrast QR Code Visual */}
                <div className="bg-white p-4 rounded-xl flex flex-col items-center justify-center shadow-lg border-4 border-cyan-500/30">
                  <svg
                    viewBox="0 0 100 100"
                    className="w-48 h-48 text-black fill-current"
                  >
                    {/* Visual QR Code Pattern representation */}
                    <rect x="0" y="0" width="100" height="100" fill="white" />
                    {/* Corners */}
                    <rect x="5" y="5" width="28" height="28" fill="black" />
                    <rect x="9" y="9" width="20" height="20" fill="white" />
                    <rect x="13" y="13" width="12" height="12" fill="black" />

                    <rect x="67" y="5" width="28" height="28" fill="black" />
                    <rect x="71" y="9" width="20" height="20" fill="white" />
                    <rect x="75" y="13" width="12" height="12" fill="black" />

                    <rect x="5" y="67" width="28" height="28" fill="black" />
                    <rect x="9" y="71" width="20" height="20" fill="white" />
                    <rect x="13" y="75" width="12" height="12" fill="black" />

                    {/* Data dots */}
                    <rect x="38" y="10" width="6" height="6" fill="black" />
                    <rect x="48" y="10" width="6" height="6" fill="black" />
                    <rect x="58" y="10" width="6" height="6" fill="black" />
                    <rect x="38" y="24" width="6" height="6" fill="black" />
                    <rect x="48" y="34" width="12" height="6" fill="black" />
                    <rect x="10" y="44" width="6" height="12" fill="black" />
                    <rect x="24" y="44" width="14" height="6" fill="black" />
                    <rect x="44" y="44" width="12" height="12" fill="black" />
                    <rect x="62" y="44" width="6" height="16" fill="black" />
                    <rect x="74" y="44" width="16" height="6" fill="black" />
                    <rect x="38" y="64" width="6" height="14" fill="black" />
                    <rect x="50" y="64" width="14" height="8" fill="black" />
                    <rect x="70" y="64" width="8" height="8" fill="black" />
                    <rect x="84" y="64" width="8" height="8" fill="black" />
                    <rect x="44" y="78" width="8" height="14" fill="black" />
                    <rect x="58" y="78" width="18" height="6" fill="black" />
                    <rect x="80" y="78" width="12" height="14" fill="black" />
                  </svg>
                  <span className="text-[11px] font-mono font-bold text-slate-800 mt-2">
                    scan to control house show
                  </span>
                </div>

                {/* Direct Link Copy */}
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-300 font-bold uppercase mb-1.5">
                    <span>Direct Web Remote Link</span>
                    <button
                      type="button"
                      onClick={handleCopyPortalLink}
                      className="text-cyan-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {copiedLink ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedLink ? 'COPIED!' : 'COPY URL'}</span>
                    </button>
                  </div>
                  <div className="px-3 py-2 rounded-lg bg-[#0a0f18] border border-[#202d42] font-mono text-xs text-slate-300 truncate">
                    http://192.168.1.120:5173/?remote=true
                  </div>
                </div>

                {/* Crowd Permissions & Limits */}
                <div className="space-y-3 pt-3 border-t border-[#202d42]">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Host Interaction Safeguards
                  </span>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">
                        Allow Theme Voting
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Let spectators pick next video
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setCrowdPermissions({
                          allowCrowdVoting: !allowCrowdVoting,
                        })
                      }
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors flex items-center cursor-pointer ${
                        allowCrowdVoting
                          ? 'bg-cyan-500 justify-end'
                          : 'bg-slate-700 justify-start'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-white shadow" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">
                        Allow Sound/Light Triggers
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Fire proton beams &amp; lightning
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setCrowdPermissions({
                          allowCrowdTriggers: !allowCrowdTriggers,
                        })
                      }
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors flex items-center cursor-pointer ${
                        allowCrowdTriggers
                          ? 'bg-emerald-500 justify-end'
                          : 'bg-slate-700 justify-start'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-white shadow" />
                    </button>
                  </div>

                  {/* Cooldown slider */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-300">
                        Anti-Spam Trigger Cooldown
                      </span>
                      <span className="font-mono font-bold text-cyan-300">
                        {crowdCooldownSec}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={60}
                      value={crowdCooldownSec}
                      onChange={(e) =>
                        setCrowdPermissions({
                          crowdCooldownSec: Number(e.target.value),
                        })
                      }
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Spectator Stat Box */}
              <div className="mt-4 p-3 rounded-lg bg-[#0b1019] border border-[#1e2a3c] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold uppercase text-slate-300">
                    Connected Phones
                  </span>
                </div>
                <span className="font-mono text-base font-black text-cyan-300">
                  {spectatorCount} Spectators
                </span>
              </div>
            </div>

            {/* CENTER: INTERACTIVE LIVE MOBILE REMOTE SIMULATOR (5 Cols) */}
            <div className="col-span-5 bg-[#121927] border border-[#233148] rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm font-bold uppercase tracking-wider text-white">
                      Live Sidewalk Remote Simulator
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    CLICK TO TEST AS GUEST
                  </span>
                </div>

                {/* Mobile Phone Mockup Container */}
                <div className="max-w-xs mx-auto bg-[#070b12] border-2 border-[#2b3a52] rounded-3xl p-4 shadow-2xl space-y-4">
                  <div className="text-center pb-2 border-b border-[#1b2638]">
                    <div className="text-xs font-black tracking-wider uppercase text-cyan-400">
                      MARSHALL HOUSE SHOW
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Austin, TX • Sidewalk Remote
                    </div>
                  </div>

                  {/* Section A: Vote for Next Show Song */}
                  <div>
                    <div className="text-[11px] font-bold uppercase text-slate-300 mb-2 flex items-center justify-between">
                      <span>VOTE NEXT SHOW THEME:</span>
                      <span className="text-cyan-400 font-mono text-[10px]">
                        {totalVotes} Votes Total
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {pollOptions.map((opt) => {
                        const pct =
                          totalVotes > 0
                            ? Math.round((opt.votes / totalVotes) * 100)
                            : 0;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => castAudienceVote(opt.id)}
                            className="w-full text-left p-2 rounded-lg bg-[#111926] hover:bg-[#1a263a] border border-[#202e44] hover:border-cyan-400 transition-all cursor-pointer relative overflow-hidden group"
                          >
                            <div
                              className="absolute inset-y-0 left-0 bg-cyan-500/20 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                            <div className="relative z-10 flex items-center justify-between text-xs">
                              <span className="font-bold text-white group-hover:text-cyan-300 truncate">
                                {opt.title}
                              </span>
                              <span className="font-mono text-[10px] text-slate-300 font-bold shrink-0 ml-2">
                                {pct}% ({opt.votes})
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section B: Interactive Crowd Trigger Buttons */}
                  <div>
                    <div className="text-[11px] font-bold uppercase text-slate-300 mb-2">
                      INTERACTIVE SHOW CUES (TAP TO BLAST):
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {triggerItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => fireAudienceTrigger(item.id)}
                          className="p-2.5 rounded-lg bg-gradient-to-br from-[#162133] to-[#111824] hover:from-[#1e2f47] hover:to-[#172235] border border-[#293d5c] hover:border-emerald-400 text-left transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            {item.effectType === 'proton_stream' && (
                              <Zap className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                            )}
                            {item.effectType === 'slimer_breach' && (
                              <Ghost className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                            )}
                            {item.effectType === 'lightning' && (
                              <CloudLightning className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                            )}
                            {item.effectType === 'strobe' && (
                              <AlertTriangle className="w-3.5 h-3.5 text-red-400 group-hover:scale-110 transition-transform" />
                            )}
                            <span className="text-[11px] font-extrabold uppercase text-white truncate">
                              {item.label}
                            </span>
                          </div>
                          <div className="text-[9px] font-mono text-slate-400 flex items-center justify-between">
                            <span>{item.soundFx}</span>
                            <span className="text-cyan-300 font-bold">
                              x{item.totalTriggered}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Active Visual Stunt Indicator */}
                  {activeCrowdEffect && (
                    <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-400 text-center animate-bounce">
                      <span className="text-xs font-mono font-bold text-cyan-300">
                        ⚡ LIVE CROWD STUNT ON FAÇADE: {activeCrowdEffect}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-400 font-mono pt-3 border-t border-[#1e293b]">
                Real-time WebSocket bidirectional sync with live stage
              </div>
            </div>

            {/* RIGHT: REAL-TIME AUDIENCE EVENT FEED (3 Cols) */}
            <div className="col-span-3 bg-[#121927] border border-[#233148] rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <span className="text-sm font-bold uppercase tracking-wider text-white">
                      Live Audience Stream
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    REAL-TIME
                  </span>
                </div>

                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                  {recentCrowdEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-2 rounded-lg bg-[#0b1019] border border-[#1b2738] text-xs font-mono"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span>{evt.time}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded uppercase text-[9px] font-bold ${
                            evt.type === 'vote'
                              ? 'bg-blue-900/60 text-blue-300'
                              : 'bg-emerald-900/60 text-emerald-300'
                          }`}
                        >
                          {evt.type}
                        </span>
                      </div>
                      <div className="text-slate-200 text-[11px] leading-snug">
                        {evt.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#0e1420] border border-[#1f2c40] mt-3">
                <div className="text-xs font-bold text-slate-300 mb-1">
                  Crowd Engagement Score
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black text-emerald-400 font-mono">
                    98.4%
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    HIGH PARTICIPATION
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'scheduler' && (
          <div className="grid grid-cols-12 gap-5 h-full">
            {/* LEFT: SOLAR EPHEMERIS & CITY SELECTION (5 Cols) */}
            <div className="col-span-5 bg-[#121927] border border-[#233148] rounded-xl p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sunset className="w-5 h-5 text-amber-400" />
                  <span className="text-sm font-bold uppercase tracking-wider text-white">
                    Astronomical Solar Ephemeris
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-500/50">
                  REAL SOLAR CALC
                </span>
              </div>

              {/* City Selection Dropdown */}
              <div>
                <label
                  htmlFor="city-preset-select"
                  className="block text-xs font-bold uppercase text-slate-300 mb-1"
                >
                  Geographic Location Preset
                </label>
                <select
                  id="city-preset-select"
                  value={selectedCity}
                  onChange={(e) => handleCitySelect(e.target.value)}
                  className="w-full bg-[#0a0f18] border border-[#27374e] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  {CITY_PRESETS.map((p) => (
                    <option key={p.city} value={p.city}>
                      {p.city}
                    </option>
                  ))}
                </select>
              </div>

              {/* Solar Phase Metrics Card */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[#0b1019] border border-[#1e2a3c]">
                  <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold uppercase mb-1">
                    <Sun className="w-3.5 h-3.5" />
                    <span>Sunset (Dusk Start)</span>
                  </div>
                  <div className="text-lg font-black font-mono text-white">
                    {solarEphemeris.sunset}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Daylight drops below 10 lux
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#0b1019] border border-[#1e2a3c]">
                  <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-bold uppercase mb-1">
                    <Sunset className="w-3.5 h-3.5" />
                    <span>Civil Dusk (Show Launch)</span>
                  </div>
                  <div className="text-lg font-black font-mono text-white">
                    {solarEphemeris.civilDusk}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Ideal projector contrast
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#0b1019] border border-[#1e2a3c]">
                  <div className="flex items-center gap-1.5 text-xs text-purple-400 font-bold uppercase mb-1">
                    <Moon className="w-3.5 h-3.5" />
                    <span>Full Astronomical Night</span>
                  </div>
                  <div className="text-lg font-black font-mono text-white">
                    {solarEphemeris.astronomicalDarkness}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Max 100% dynamic range
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#0b1019] border border-[#1e2a3c]">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold uppercase mb-1">
                    <Sunrise className="w-3.5 h-3.5" />
                    <span>Next Morning Dawn</span>
                  </div>
                  <div className="text-lg font-black font-mono text-white">
                    {solarEphemeris.sunrise}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Projector auto-sleep off
                  </div>
                </div>
              </div>

              {/* Recommended Operational Milestones */}
              <div className="p-3.5 rounded-lg bg-[#0a0f18] border border-[#202e42] space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Calculated Austin Daily Automation Timetable
                </span>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">PJLink Power Warmup:</span>
                  <span className="text-cyan-300 font-bold">18:45 (Sunset)</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Master Show Loop Start:</span>
                  <span className="text-emerald-300 font-bold">
                    {solarEphemeris.suggestedShowStart} (Civil Dusk)
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Courtesy Quiet Hours:</span>
                  <span className="text-amber-300 font-bold">
                    {solarEphemeris.suggestedCourtesyDim} (Volume 25%)
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Curfew Night Shutoff:</span>
                  <span className="text-red-300 font-bold">
                    {solarEphemeris.suggestedCurfewShutoff} (Lamp Standby)
                  </span>
                </div>
              </div>

              {/* Master Auto-Scheduler Enable Button */}
              <button
                type="button"
                onClick={() => toggleDuskToDawnScheduler()}
                className={`w-full py-3 px-4 rounded-lg font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  duskToDawnSchedulerEnabled
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <Power className="w-4 h-4" />
                <span>
                  {duskToDawnSchedulerEnabled
                    ? 'ASTRONOMICAL AUTO-PILOT SCHEDULER ACTIVE'
                    : 'AUTOMATED SCHEDULER PAUSED'}
                </span>
              </button>
            </div>

            {/* RIGHT: 7-DAY SCHEDULE MATRIX (7 Cols) */}
            <div className="col-span-7 bg-[#121927] border border-[#233148] rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-cyan-400" />
                    <span className="text-sm font-bold uppercase tracking-wider text-white">
                      Weekly Showtime &amp; Curfew Timetable
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      scheduleDays.forEach((d) => {
                        updateScheduleDay(d.day, {
                          powerOnTime: '18:45',
                          showStartTime: solarEphemeris.civilDusk,
                        });
                      });
                      showToast('Applied Solar Dusk Times to all 7 Days');
                    }}
                    className="px-2.5 py-1 rounded bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold uppercase transition-colors cursor-pointer"
                  >
                    SYNC ALL TO DUSK ({solarEphemeris.civilDusk})
                  </button>
                </div>

                {/* Schedule Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-[#202e42] text-[10px] text-slate-400 uppercase">
                        <th className="py-2">Day</th>
                        <th>Active</th>
                        <th>Power On</th>
                        <th>Show Start</th>
                        <th>Courtesy Cap</th>
                        <th>Curfew Off</th>
                        <th>Target Vol</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1b2638]">
                      {scheduleDays.map((d) => (
                        <tr key={d.day} className="hover:bg-[#152033]">
                          <td className="py-2.5 font-bold text-white">
                            {d.day}
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              checked={d.enabled}
                              onChange={(e) =>
                                updateScheduleDay(d.day, {
                                  enabled: e.target.checked,
                                })
                              }
                              className="rounded border-[#293c54] text-cyan-500 focus:ring-0 cursor-pointer"
                              aria-label={`Enable schedule for ${d.day}`}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={d.powerOnTime}
                              onChange={(e) =>
                                updateScheduleDay(d.day, {
                                  powerOnTime: e.target.value,
                                })
                              }
                              className="w-16 bg-[#0a0f18] border border-[#233148] rounded px-1.5 py-0.5 text-xs text-slate-200"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={d.showStartTime}
                              onChange={(e) =>
                                updateScheduleDay(d.day, {
                                  showStartTime: e.target.value,
                                })
                              }
                              className="w-16 bg-[#0a0f18] border border-[#233148] rounded px-1.5 py-0.5 text-xs text-emerald-300 font-bold"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={d.courtesyVolumeTime}
                              onChange={(e) =>
                                updateScheduleDay(d.day, {
                                  courtesyVolumeTime: e.target.value,
                                })
                              }
                              className="w-16 bg-[#0a0f18] border border-[#233148] rounded px-1.5 py-0.5 text-xs text-amber-300"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={d.shutoffTime}
                              onChange={(e) =>
                                updateScheduleDay(d.day, {
                                  shutoffTime: e.target.value,
                                })
                              }
                              className="w-16 bg-[#0a0f18] border border-[#233148] rounded px-1.5 py-0.5 text-xs text-red-300"
                            />
                          </td>
                          <td>
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-bold">
                              {d.targetVolumePercent}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Automated Shutdown Safeguard Note */}
              <div className="mt-4 p-3 rounded-lg bg-blue-950/40 border border-blue-500/30 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-slate-300 leading-relaxed">
                  <span className="font-bold text-cyan-300">
                    Fail-Safe Curfew Engine:
                  </span>{' '}
                  At curfew shutoff time (e.g. 22:30), the studio sends PJLink
                  lamp cooling commands to all projectors, sets Master Blackout,
                  and turns on yard security lighting via MQTT.
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'smarthome' && (
          <div className="grid grid-cols-12 gap-5 h-full">
            {/* LEFT: MQTT BROKER & CONNECTION CONFIG (4 Cols) */}
            <div className="col-span-4 bg-[#121927] border border-[#233148] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-bold uppercase tracking-wider text-white">
                    Smart Home Bridge
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/50">
                  MQTT / HASS
                </span>
              </div>

              <div>
                <label
                  htmlFor="mqtt-broker-url-input"
                  className="block text-xs font-bold uppercase text-slate-300 mb-1"
                >
                  MQTT Broker Endpoint
                </label>
                <input
                  id="mqtt-broker-url-input"
                  type="text"
                  value={mqttBrokerUrl}
                  readOnly
                  className="w-full bg-[#0a0f18] border border-[#27374e] rounded-lg px-3 py-2 text-xs font-mono text-cyan-300"
                />
              </div>

              <div className="p-3.5 rounded-lg bg-[#0b1019] border border-[#1e2a3c] space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Integration Protocols
                </span>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Home Assistant Core:</span>
                  <span className="text-emerald-400 font-bold font-mono">
                    CONNECTED (v2026.11)
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Philips Hue Entertainment:</span>
                  <span className="text-emerald-400 font-bold font-mono">
                    STREAMING (Zigbee 3.0)
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">DMX512 Art-Net Gateway:</span>
                  <span className="text-emerald-400 font-bold font-mono">
                    UNIVERSE 1 (Port 6454)
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleSmartHomeBridge()}
                className={`w-full py-2.5 px-3 rounded-lg border text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  smartHomeBridgeEnabled
                    ? 'bg-emerald-600/20 border-emerald-400 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {smartHomeBridgeEnabled
                  ? 'SMART BRIDGE: ONLINE'
                  : 'SMART BRIDGE: OFFLINE'}
              </button>
            </div>

            {/* RIGHT: SMART FIXTURE ENTITY CONTROLS (8 Cols) */}
            <div className="col-span-8 bg-[#121927] border border-[#233148] rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-amber-400" />
                    <span className="text-sm font-bold uppercase tracking-wider text-white">
                      Synchronized Yard Fixtures &amp; Fog Machine Relays
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    REAL-TIME AUTOMATION
                  </span>
                </div>

                <div className="space-y-3">
                  {smartEntities.map((ent) => (
                    <div
                      key={ent.id}
                      className="p-3.5 rounded-lg bg-[#0b1019] border border-[#1e2a3c] flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{
                            backgroundColor:
                              ent.state === 'ON' || ent.state === 'COLOR_SYNCED'
                                ? ent.colorHex || '#10b981'
                                : '#334155',
                            borderColor: ent.colorHex || '#10b981',
                          }}
                        />
                        <div>
                          <div className="text-xs font-bold text-white">
                            {ent.name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {ent.protocol.toUpperCase()} • {ent.topicOrEntity}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {ent.type === 'porch_rgb' && (
                          <div className="flex items-center gap-1.5 mr-2">
                            {['#10b981', '#3b82f6', '#8b5cf6', '#ef4444'].map(
                              (color) => (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() =>
                                    setSmartEntityState(
                                      ent.id,
                                      'COLOR_SYNCED',
                                      color
                                    )
                                  }
                                  className="w-5 h-5 rounded-full border border-white/40 transition-transform hover:scale-110 cursor-pointer"
                                  style={{ backgroundColor: color }}
                                  aria-label={`Set color to ${color}`}
                                />
                              )
                            )}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            setSmartEntityState(
                              ent.id,
                              ent.state === 'ON' ? 'OFF' : 'ON'
                            )
                          }
                          className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase border transition-colors cursor-pointer ${
                            ent.state === 'ON' || ent.state === 'COLOR_SYNCED'
                              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          {ent.state}
                        </button>

                        <button
                          type="button"
                          onClick={() => testSmartHomeTrigger(ent.id)}
                          className="px-2.5 py-1 rounded bg-[#162235] hover:bg-[#20304a] border border-[#2b3e5b] text-[11px] font-bold text-cyan-300 hover:text-white uppercase transition-colors cursor-pointer"
                        >
                          TEST
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sidewalk Sensor Health Widget */}
              <div className="mt-4 p-3 rounded-lg bg-[#0e1420] border border-[#1f2c40] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Ghost className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold uppercase text-slate-300">
                    Sidewalk Motion Sensor (PIR_01)
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-purple-300">
                    {lastMotionDetectedAt
                      ? `Last Tripped: ${lastMotionDetectedAt}`
                      : 'ARMED & READY'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Auto-fire Slimer jump-scare on visitor approach
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
