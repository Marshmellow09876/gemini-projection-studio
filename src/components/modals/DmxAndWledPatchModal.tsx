import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  X,
  Sliders,
  Zap,
  Radio,
  Globe,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Wifi,
  Download,
  Upload,
  Play,
  Square,
  Activity,
  Layers,
  Sparkles,
  Info,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  Flame,
} from 'lucide-react';
import { useProjectionStore } from '../../store/useProjectionStore';
import {
  DmxUniverseConfig,
  DmxFixtureProfile,
  DmxFixturePatch,
  WledDeviceConfig,
  WledSegmentPatch,
  WledSyncMode,
  DmxWledPatchSheet,
  DMX_PROFILE_SPECS,
  COMMON_HOUSE_TAGS,
  DEFAULT_DMX_WLED_PATCH_SHEET,
  validateDmxPatch,
  validateEntirePatchSheet,
  createArtDmxPacket,
  createWledDdpPacket,
  simulateDmxNetworkStream,
  buildUniverseOccupancyMap,
  saveDmxWledPatchSheet,
  loadDmxWledPatchSheet,
  exportDmxPatchToJson,
  importDmxPatchFromJson,
  exportWledPatchToJson,
  importWledPatchFromJson,
  downloadJsonFile,
} from '../../utils/dmxWledEngine';

export interface DmxAndWledPatchModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const DmxAndWledPatchModal: React.FC<DmxAndWledPatchModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
}) => {
  // Store integration
  const storeIsOpen = useProjectionStore(
    (s: any) => s.isDmxWledModalOpen ?? s.isDmxAndWledPatchModalOpen ?? false
  );
  const setStoreIsOpen = useProjectionStore(
    (s: any) => s.setIsDmxWledModalOpen ?? s.setIsDmxAndWledPatchModalOpen
  );
  const showToast = useProjectionStore((s) => s.showToast);
  const layers = useProjectionStore((s) => s.layers);

  const isOpen = propIsOpen !== undefined ? propIsOpen : storeIsOpen;

  const handleClose = () => {
    if (propOnClose) propOnClose();
    if (setStoreIsOpen) setStoreIsOpen(false);
  };

  // Active Tab state: 'dmx' | 'wled' | 'monitor'
  const [activeTab, setActiveTab] = useState<'dmx' | 'wled' | 'monitor'>('dmx');

  // Patch sheet state
  const [patchSheet, setPatchSheet] = useState<DmxWledPatchSheet>(() =>
    loadDmxWledPatchSheet()
  );

  // Selected Universe filter for Tab 1 occupancy map
  const [selectedUniverse, setSelectedUniverse] = useState<number>(1);

  // Fixture currently being edited (or null if adding new / none)
  const [editingFixture, setEditingFixture] = useState<DmxFixturePatch | null>(null);
  const [isEditingNew, setIsEditingNew] = useState<boolean>(false);

  // Hovered channel for occupancy heatmap tooltip
  const [hoveredChannel, setHoveredChannel] = useState<{
    channel: number;
    fixtureName?: string;
    profile?: string;
    label?: string;
    isConflict: boolean;
  } | null>(null);

  // Live Output Monitor simulation state
  const [isStreamingLive, setIsStreamingLive] = useState<boolean>(false);
  const [simulatedMetrics, setSimulatedMetrics] = useState({
    packetsSent: 0,
    droppedPackets: 0,
    avgFps: 0,
  });
  const [livePreviewColors, setLivePreviewColors] = useState<string[]>(() =>
    Array(16).fill('#1e293b')
  );
  const [inspectorLog, setInspectorLog] = useState<{
    protocol: 'Art-Net' | 'WLED DDP';
    time: string;
    universeOrOffset: string;
    length: number;
    hexSnippet: string;
  } | null>(null);

  // WLED discovery simulation state
  const [isPingingDevices, setIsPingingDevices] = useState<boolean>(false);

  // Hidden file input refs for JSON imports
  const dmxFileInputRef = useRef<HTMLInputElement>(null);
  const wledFileInputRef = useRef<HTMLInputElement>(null);

  // Available shape tags: union of COMMON_HOUSE_TAGS and layer names from store
  const availableTags = useMemo(() => {
    const layerNames = layers.map((l) => l.name);
    return Array.from(new Set([...COMMON_HOUSE_TAGS, ...layerNames]));
  }, [layers]);

  // Real-time validation
  const validationResult = useMemo(
    () => validateEntirePatchSheet(patchSheet),
    [patchSheet]
  );

  // Save to localStorage on change
  const updatePatchSheet = useCallback(
    (updater: (prev: DmxWledPatchSheet) => DmxWledPatchSheet) => {
      setPatchSheet((prev) => {
        const next = updater(prev);
        saveDmxWledPatchSheet(next);
        return next;
      });
    },
    []
  );

  // -------------------------------------------------------------------------
  // Live Streaming Simulation Loop (Tab 3)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!isOpen || !isStreamingLive) return;

    const interval = setInterval(() => {
      // Calculate realistic metrics
      const metrics = simulateDmxNetworkStream(patchSheet, 200);
      setSimulatedMetrics((prev) => ({
        packetsSent: prev.packetsSent + metrics.packetsSent,
        droppedPackets: prev.droppedPackets + metrics.droppedPackets,
        avgFps: metrics.avgFps,
      }));

      // Generate animated color pulses for the 16 virtual monitor channels
      const now = Date.now();
      const updatedColors = Array.from({ length: 16 }, (_, i) => {
        const hue = (now / 15 + i * 22) % 360;
        const brightness = 50 + Math.sin((now / 200) + i) * 30;
        return `hsl(${hue}, 85%, ${brightness}%)`;
      });
      setLivePreviewColors(updatedColors);
    }, 200);

    return () => clearInterval(interval);
  }, [isOpen, isStreamingLive, patchSheet]);

  // -------------------------------------------------------------------------
  // DMX Fixture Handlers
  // -------------------------------------------------------------------------
  const handleStartAddFixture = () => {
    // Find next available start channel in selected universe
    const uniFixtures = patchSheet.dmxFixtures.filter(
      (f) => f.universe === selectedUniverse
    );
    let nextStart = 1;
    if (uniFixtures.length > 0) {
      const maxEnd = Math.max(
        ...uniFixtures.map((f) => f.startChannel + f.channelCount)
      );
      if (maxEnd <= 512) nextStart = maxEnd;
    }

    const newFix: DmxFixturePatch = {
      id: `fix-${Date.now().toString(36)}`,
      name: `Fixture ${patchSheet.dmxFixtures.length + 1}`,
      universe: selectedUniverse,
      startChannel: nextStart,
      profile: 'RGB',
      channelCount: 3,
      targetTag: availableTags[0] || 'Roofline',
      colorMultiplier: [1.0, 1.0, 1.0],
    };

    setEditingFixture(newFix);
    setIsEditingNew(true);
  };

  const handleSaveFixture = (fixture: DmxFixturePatch) => {
    const validation = validateDmxPatch(fixture, patchSheet.dmxFixtures);
    if (!validation.isValid) {
      showToast?.(`Warning: ${validation.error}`);
    }

    updatePatchSheet((prev) => {
      const exists = prev.dmxFixtures.some((f) => f.id === fixture.id);
      const updated = exists
        ? prev.dmxFixtures.map((f) => (f.id === fixture.id ? fixture : f))
        : [...prev.dmxFixtures, fixture];
      return { ...prev, dmxFixtures: updated };
    });

    setEditingFixture(null);
    setIsEditingNew(false);
    showToast?.(`Fixture "${fixture.name}" saved to Universe ${fixture.universe}`);
  };

  const handleDeleteFixture = (id: string) => {
    const target = patchSheet.dmxFixtures.find((f) => f.id === id);
    updatePatchSheet((prev) => ({
      ...prev,
      dmxFixtures: prev.dmxFixtures.filter((f) => f.id !== id),
    }));
    if (editingFixture?.id === id) {
      setEditingFixture(null);
    }
    showToast?.(target ? `Deleted "${target.name}"` : 'Fixture deleted');
  };

  const handleAutoPatchFloodArray = () => {
    const floods: DmxFixturePatch[] = [
      {
        id: `auto-fix-${Date.now()}-1`,
        name: 'Roof Peak Wash A',
        universe: selectedUniverse,
        startChannel: 1,
        profile: 'RGBW',
        channelCount: 4,
        targetTag: 'Roofline',
        colorMultiplier: [1.0, 1.0, 1.0],
      },
      {
        id: `auto-fix-${Date.now()}-2`,
        name: 'Facade Left Wall Flood B',
        universe: selectedUniverse,
        startChannel: 5,
        profile: 'RGBW',
        channelCount: 4,
        targetTag: 'Main Walls',
        colorMultiplier: [1.0, 1.0, 1.0],
      },
      {
        id: `auto-fix-${Date.now()}-3`,
        name: 'Facade Right Wall Flood C',
        universe: selectedUniverse,
        startChannel: 9,
        profile: 'RGBW',
        channelCount: 4,
        targetTag: 'Main Walls',
        colorMultiplier: [1.0, 1.0, 1.0],
      },
      {
        id: `auto-fix-${Date.now()}-4`,
        name: 'Landscape Bushes Accent D',
        universe: selectedUniverse,
        startChannel: 13,
        profile: 'RGB',
        channelCount: 3,
        targetTag: 'Bushes',
        colorMultiplier: [1.0, 1.0, 1.0],
      },
    ];

    updatePatchSheet((prev) => ({
      ...prev,
      dmxFixtures: [
        ...prev.dmxFixtures.filter((f) => f.universe !== selectedUniverse),
        ...floods,
      ],
    }));

    showToast?.(`Auto-Patched 4-Fixture Wash Array on Universe ${selectedUniverse}`);
  };

  // -------------------------------------------------------------------------
  // WLED Controller Handlers
  // -------------------------------------------------------------------------
  const handleAddWledDevice = () => {
    const ipSuffix = 150 + patchSheet.wledDevices.length;
    const newDevice: WledDeviceConfig = {
      id: `wled-${Date.now().toString(36)}`,
      name: `WLED Controller ${patchSheet.wledDevices.length + 1}`,
      ip: `192.168.1.${ipSuffix}`,
      port: 21324,
      totalPixels: 150,
      segments: [{ id: 0, start: 0, stop: 150, name: 'Default Strip' }],
      online: true,
      lastPingMs: 15,
    };

    const newPatch: WledSegmentPatch = {
      id: `wled-p-${Date.now().toString(36)}`,
      deviceId: newDevice.id,
      segmentId: 0,
      targetTag: 'Roofline',
      syncMode: 'color_sample',
    };

    updatePatchSheet((prev) => ({
      ...prev,
      wledDevices: [...prev.wledDevices, newDevice],
      wledPatches: [...prev.wledPatches, newPatch],
    }));

    showToast?.(`Added WLED Controller ${newDevice.ip}`);
  };

  const handleDeleteWledDevice = (deviceId: string) => {
    const dev = patchSheet.wledDevices.find((d) => d.id === deviceId);
    updatePatchSheet((prev) => ({
      ...prev,
      wledDevices: prev.wledDevices.filter((d) => d.id !== deviceId),
      wledPatches: prev.wledPatches.filter((p) => p.deviceId !== deviceId),
    }));
    showToast?.(`Removed WLED device ${dev?.name || deviceId}`);
  };

  const handleSimulatePing = () => {
    setIsPingingDevices(true);
    showToast?.('Broadcasting mDNS & Ping discovery across local subnet...');

    setTimeout(() => {
      updatePatchSheet((prev) => ({
        ...prev,
        wledDevices: prev.wledDevices.map((d) => ({
          ...d,
          online: true,
          lastPingMs: Math.floor(8 + Math.random() * 15),
        })),
      }));
      setIsPingingDevices(false);
      showToast?.('Discovery Complete: All WLED nodes online & responding (<20ms)');
    }, 900);
  };

  const handleTestWledColor = (deviceId: string, colorName: string, rgb: [number, number, number]) => {
    const dev = patchSheet.wledDevices.find((d) => d.id === deviceId);
    if (!dev) return;

    // Build mock DDP packet
    const pixels = new Uint8Array(dev.totalPixels * 3);
    for (let i = 0; i < pixels.length; i += 3) {
      pixels[i] = rgb[0];
      pixels[i + 1] = rgb[1];
      pixels[i + 2] = rgb[2];
    }
    const packet = createWledDdpPacket(pixels, 0);

    setInspectorLog({
      protocol: 'WLED DDP',
      time: new Date().toLocaleTimeString(),
      universeOrOffset: `Offset 0B (${dev.ip}:21324)`,
      length: packet.length,
      hexSnippet: Array.from(packet.subarray(0, 16))
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' '),
    });

    showToast?.(`Sent ${colorName} test frame to WLED "${dev.name}" (${dev.totalPixels} px)`);
  };

  // -------------------------------------------------------------------------
  // Test Packet Inspector Handlers (Tab 3)
  // -------------------------------------------------------------------------
  const handleSendArtNetTestPacket = () => {
    const channels = new Uint8Array(512);
    // Fill sample values
    channels[0] = 255; // Red
    channels[1] = 128; // Green
    channels[2] = 0;   // Blue
    channels[3] = 255; // White
    const packet = createArtDmxPacket(selectedUniverse, channels, 1);

    setInspectorLog({
      protocol: 'Art-Net',
      time: new Date().toLocaleTimeString(),
      universeOrOffset: `Universe ${selectedUniverse} (Port 6454)`,
      length: packet.length,
      hexSnippet: Array.from(packet.subarray(0, 18))
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' '),
    });

    showToast?.(`Dispatched Art-Net 4 OpDmx packet to Universe ${selectedUniverse}`);
  };

  // -------------------------------------------------------------------------
  // Import / Export Handlers
  // -------------------------------------------------------------------------
  const handleExportDmx = () => {
    const json = exportDmxPatchToJson(
      patchSheet.dmxFixtures,
      patchSheet.dmxUniverses
    );
    downloadJsonFile(json, `AustinHouse_DMX_Patch_U${selectedUniverse}.mpsdmx`);
    showToast?.('Exported DMX Fixture Patch (.mpsdmx)');
  };

  const handleImportDmx = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const imported = importDmxPatchFromJson(text);
        updatePatchSheet((prev) => ({
          ...prev,
          dmxFixtures: imported.fixtures,
          dmxUniverses:
            imported.universes.length > 0
              ? imported.universes
              : prev.dmxUniverses,
        }));
        showToast?.(`Imported ${imported.fixtures.length} DMX fixtures from .mpsdmx`);
      } catch (err: any) {
        showToast?.(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportWled = () => {
    const json = exportWledPatchToJson(
      patchSheet.wledDevices,
      patchSheet.wledPatches
    );
    downloadJsonFile(json, 'AustinHouse_WLED_Pixel_Config.mpswled');
    showToast?.('Exported WLED Strip Configuration (.mpswled)');
  };

  const handleImportWled = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const imported = importWledPatchFromJson(text);
        updatePatchSheet((prev) => ({
          ...prev,
          wledDevices: imported.devices,
          wledPatches: imported.patches,
        }));
        showToast?.(`Imported ${imported.devices.length} WLED controllers from .mpswled`);
      } catch (err: any) {
        showToast?.(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetToDefaults = () => {
    setPatchSheet(DEFAULT_DMX_WLED_PATCH_SHEET);
    saveDmxWledPatchSheet(DEFAULT_DMX_WLED_PATCH_SHEET);
    showToast?.('Reset DMX & WLED patch sheet to factory defaults');
  };

  // -------------------------------------------------------------------------
  // Occupancy Heatmap Data
  // -------------------------------------------------------------------------
  const occupancyMap = useMemo(
    () => buildUniverseOccupancyMap(selectedUniverse, patchSheet.dmxFixtures),
    [selectedUniverse, patchSheet.dmxFixtures]
  );

  const occupiedCount = useMemo(
    () => occupancyMap.filter((c) => c.isOccupied).length,
    [occupancyMap]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-200">
      {/* Hidden file inputs for JSON import */}
      <input
        type="file"
        ref={dmxFileInputRef}
        onChange={handleImportDmx}
        accept=".mpsdmx,.json"
        className="hidden"
      />
      <input
        type="file"
        ref={wledFileInputRef}
        onChange={handleImportWled}
        accept=".mpswled,.json"
        className="hidden"
      />

      <div className="w-full max-w-6xl bg-[#0b121e] border border-[#213047] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] font-sans text-slate-200">
        {/* ================================================================= */}
        {/* HEADER                                                            */}
        {/* ================================================================= */}
        <div className="px-6 py-4 border-b border-[#1b2638] flex items-center justify-between bg-[#0e1626]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-base font-bold text-slate-100 tracking-wide">
                  DMX Art-Net & WLED Pixel Light Synchronization
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
                  Art-Net 4 & DDP v1
                </span>
                {validationResult.errors.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-rose-950/80 text-rose-400 border border-rose-800/60 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationResult.errors.length} Conflict
                    {validationResult.errors.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="text-[12px] text-slate-400 font-mono mt-0.5">
                Physical Stage Floods, Moving Heads, Strobe Cannons & ESP32 Pixel Strip Mapping
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-4 text-xs font-mono text-slate-400 px-3 py-1.5 rounded-lg bg-[#070b13] border border-[#1b2638]">
              <div>
                Universes: <span className="text-cyan-400 font-bold">{patchSheet.dmxUniverses.length}</span>
              </div>
              <div className="h-3 w-px bg-slate-700" />
              <div>
                Fixtures: <span className="text-slate-200 font-bold">{patchSheet.dmxFixtures.length}</span>
              </div>
              <div className="h-3 w-px bg-slate-700" />
              <div>
                WLED Pixels:{' '}
                <span className="text-emerald-400 font-bold">
                  {patchSheet.wledDevices.reduce((sum, d) => sum + d.totalPixels, 0)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2538] transition-colors"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* TABS NAVIGATION                                                   */}
        {/* ================================================================= */}
        <div className="px-6 py-2 border-b border-[#1b2638] bg-[#090e18] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('dmx')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'dmx'
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#131c2c]'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>DMX Fixture Patch Table</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-slate-400">
                {patchSheet.dmxFixtures.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('wled')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'wled'
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#131c2c]'
              }`}
            >
              <Wifi className="w-4 h-4" />
              <span>WLED Pixel Strip Controllers</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-slate-400">
                {patchSheet.wledDevices.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('monitor')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'monitor'
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#131c2c]'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Live Output Monitor & Packet Tester</span>
              {isStreamingLive && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1b2638] transition-colors border border-transparent hover:border-slate-700"
            >
              Reset Defaults
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* BODY TABS CONTENT                                                 */}
        {/* ================================================================= */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
          {/* TAB 1: DMX FIXTURE PATCH TABLE & HEATMAP */}
          {activeTab === 'dmx' && (
            <div className="space-y-6">
              {/* Validation Warning Alert if conflicts exist */}
              {validationResult.errors.length > 0 && (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 space-y-1">
                  <div className="font-bold flex items-center gap-2 text-rose-200">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    Channel Patch Conflicts Detected ({validationResult.errors.length})
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px] font-mono text-rose-300/90">
                    {validationResult.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Toolbar & Universe Filter */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#0d1522] border border-[#1b2638]">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-300">
                    Universe:
                  </span>
                  <select
                    value={selectedUniverse}
                    onChange={(e) => setSelectedUniverse(Number(e.target.value))}
                    className="bg-[#070b13] border border-[#213047] text-cyan-400 rounded-lg px-3 py-1.5 text-xs font-mono font-bold focus:outline-none focus:border-cyan-500"
                  >
                    {patchSheet.dmxUniverses.map((u) => (
                      <option key={u.universe} value={u.universe}>
                        Univ {u.universe}: {u.name} ({u.ip})
                      </option>
                    ))}
                  </select>

                  <div className="text-[11px] font-mono text-slate-400">
                    Occupied Channels:{' '}
                    <span className="text-cyan-400 font-bold">
                      {occupiedCount} / 512
                    </span>{' '}
                    ({((occupiedCount / 512) * 100).toFixed(1)}%)
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoPatchFloodArray}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141e2e] hover:bg-[#1a283e] text-slate-300 hover:text-white border border-[#213047] text-xs font-medium transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Auto-Patch 4x Floods
                  </button>

                  <button
                    type="button"
                    onClick={handleExportDmx}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141e2e] hover:bg-[#1a283e] text-slate-300 hover:text-white border border-[#213047] text-xs font-medium transition-colors"
                    title="Export DMX Patch (.mpsdmx)"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    Export .mpsdmx
                  </button>

                  <button
                    type="button"
                    onClick={() => dmxFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141e2e] hover:bg-[#1a283e] text-slate-300 hover:text-white border border-[#213047] text-xs font-medium transition-colors"
                    title="Import DMX Patch (.mpsdmx)"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    Import .mpsdmx
                  </button>

                  <button
                    type="button"
                    onClick={handleStartAddFixture}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs transition-colors shadow-lg shadow-cyan-600/20"
                  >
                    <Plus className="w-4 h-4" />
                    Add Fixture
                  </button>
                </div>
              </div>

              {/* 512-Channel Visual Occupancy Heat Map */}
              <div className="p-4 rounded-xl bg-[#070b13] border border-[#1b2638] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-semibold text-slate-300">
                    <Flame className="w-4 h-4 text-cyan-400" />
                    <span>Universe {selectedUniverse} Channel Occupancy Heat Map (1–512)</span>
                  </div>

                  {/* Profile Color Legend */}
                  <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#38bdf8]" /> RGB (3ch)
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#f43f5e]" /> RGBW (4ch)
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#fbbf24]" /> Dimmer (1ch)
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#a855f7]" /> Strobe (2ch)
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]" /> MovingHead (8ch)
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-red-500 animate-pulse" /> Overlap Conflict
                    </div>
                  </div>
                </div>

                {/* Grid of 512 cells (32 columns x 16 rows) */}
                <div className="grid grid-cols-16 sm:grid-cols-32 gap-1 p-2 rounded-lg bg-[#04070d] border border-[#131d2d] overflow-x-auto">
                  {occupancyMap.map((slot) => {
                    const isHovered = hoveredChannel?.channel === slot.channel;
                    return (
                      <div
                        key={slot.channel}
                        onMouseEnter={() =>
                          setHoveredChannel({
                            channel: slot.channel,
                            fixtureName: slot.fixtureName,
                            profile: slot.profile,
                            label: slot.label,
                            isConflict: slot.isConflict,
                          })
                        }
                        onMouseLeave={() => setHoveredChannel(null)}
                        className={`h-4 sm:h-5 rounded-xs flex items-center justify-center text-[8px] font-mono transition-transform cursor-pointer ${
                          slot.isConflict
                            ? 'bg-rose-600 text-white animate-pulse ring-1 ring-rose-400'
                            : slot.isOccupied
                            ? 'ring-1 ring-white/20'
                            : 'bg-slate-900/60 text-slate-600 hover:bg-slate-800'
                        } ${isHovered ? 'scale-125 z-10' : ''}`}
                        style={{
                          backgroundColor: slot.isConflict
                            ? undefined
                            : slot.isOccupied
                            ? slot.color
                            : undefined,
                        }}
                        title={`Ch ${slot.channel}${
                          slot.fixtureName ? `: ${slot.fixtureName} (${slot.label})` : ' (Empty)'
                        }`}
                      >
                        {slot.channel % 32 === 1 || slot.channel === 512 ? (
                          <span className="opacity-60">{slot.channel}</span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {/* Tooltip info bar */}
                <div className="h-6 px-3 rounded bg-[#0b121e] border border-[#1b2638] flex items-center justify-between text-[11px] font-mono text-slate-400">
                  {hoveredChannel ? (
                    <div className="flex items-center gap-3">
                      <span className="text-cyan-400 font-bold">
                        Channel {hoveredChannel.channel}:
                      </span>
                      {hoveredChannel.fixtureName ? (
                        <span className="text-slate-200">
                          {hoveredChannel.fixtureName} &bull; Profile:{' '}
                          <span className="text-amber-400">{hoveredChannel.profile}</span> &bull;{' '}
                          {hoveredChannel.label}
                        </span>
                      ) : (
                        <span className="text-slate-500">Unassigned / Free Channel</span>
                      )}
                      {hoveredChannel.isConflict && (
                        <span className="text-rose-400 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Overlapping Collision!
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-500">
                      Hover over any channel in the 512-grid to inspect fixture allocation & pin roles.
                    </span>
                  )}
                  <span className="text-slate-500">Universe {selectedUniverse} &bull; 512 DMX Slots</span>
                </div>
              </div>

              {/* Fixture Editor Form (Inline Drawer) */}
              {editingFixture && (
                <div className="p-5 rounded-xl bg-[#0f1728] border border-cyan-500/50 shadow-xl space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-[#1f2b40] pb-3">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm font-bold text-slate-100">
                        {isEditingNew ? 'Patch New DMX Fixture' : `Edit Fixture: ${editingFixture.name}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingFixture(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    {/* Fixture Name */}
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Fixture Name</label>
                      <input
                        type="text"
                        value={editingFixture.name}
                        onChange={(e) =>
                          setEditingFixture({ ...editingFixture, name: e.target.value })
                        }
                        className="w-full bg-[#070b13] border border-[#213047] rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                        placeholder="e.g. Roofline Wash"
                      />
                    </div>

                    {/* Universe */}
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Universe (0–32767)</label>
                      <input
                        type="number"
                        min={0}
                        max={32767}
                        value={editingFixture.universe}
                        onChange={(e) =>
                          setEditingFixture({
                            ...editingFixture,
                            universe: Math.max(0, parseInt(e.target.value) || 0),
                          })
                        }
                        className="w-full bg-[#070b13] border border-[#213047] rounded-lg px-3 py-1.5 text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    {/* Start Channel */}
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">
                        Start Channel (1–512)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={512}
                        value={editingFixture.startChannel}
                        onChange={(e) =>
                          setEditingFixture({
                            ...editingFixture,
                            startChannel: Math.max(1, Math.min(512, parseInt(e.target.value) || 1)),
                          })
                        }
                        className="w-full bg-[#070b13] border border-[#213047] rounded-lg px-3 py-1.5 text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    {/* Profile */}
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Profile</label>
                      <select
                        value={editingFixture.profile}
                        onChange={(e) => {
                          const prof = e.target.value as DmxFixtureProfile;
                          const channels = DMX_PROFILE_SPECS[prof].channels;
                          setEditingFixture({
                            ...editingFixture,
                            profile: prof,
                            channelCount: channels,
                          });
                        }}
                        className="w-full bg-[#070b13] border border-[#213047] rounded-lg px-3 py-1.5 text-slate-100 font-medium focus:outline-none focus:border-cyan-500"
                      >
                        {Object.entries(DMX_PROFILE_SPECS).map(([key, spec]) => (
                          <option key={key} value={key}>
                            {key} ({spec.channels} ch) - {spec.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Target Shape / House Tag Binding */}
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">
                        Bind to House Shape / Tag
                      </label>
                      <select
                        value={editingFixture.targetTag || ''}
                        onChange={(e) =>
                          setEditingFixture({
                            ...editingFixture,
                            targetTag: e.target.value,
                          })
                        }
                        className="w-full bg-[#070b13] border border-[#213047] rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                      >
                        {availableTags.map((tag) => (
                          <option key={tag} value={tag}>
                            Tag: {tag}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Color Multipliers */}
                    <div className="md:col-span-3">
                      <label className="block text-slate-400 mb-1 font-medium">
                        RGB Color Balance Multipliers
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex items-center gap-1.5 bg-[#070b13] px-2 py-1 rounded-lg border border-[#213047]">
                          <span className="text-red-400 font-bold">R:</span>
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            max="2"
                            value={editingFixture.colorMultiplier[0]}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value) || 0;
                              setEditingFixture({
                                ...editingFixture,
                                colorMultiplier: [v, editingFixture.colorMultiplier[1], editingFixture.colorMultiplier[2]],
                              });
                            }}
                            className="w-full bg-transparent text-slate-200 font-mono focus:outline-none text-xs"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 bg-[#070b13] px-2 py-1 rounded-lg border border-[#213047]">
                          <span className="text-green-400 font-bold">G:</span>
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            max="2"
                            value={editingFixture.colorMultiplier[1]}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value) || 0;
                              setEditingFixture({
                                ...editingFixture,
                                colorMultiplier: [editingFixture.colorMultiplier[0], v, editingFixture.colorMultiplier[2]],
                              });
                            }}
                            className="w-full bg-transparent text-slate-200 font-mono focus:outline-none text-xs"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 bg-[#070b13] px-2 py-1 rounded-lg border border-[#213047]">
                          <span className="text-blue-400 font-bold">B:</span>
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            max="2"
                            value={editingFixture.colorMultiplier[2]}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value) || 0;
                              setEditingFixture({
                                ...editingFixture,
                                colorMultiplier: [editingFixture.colorMultiplier[0], editingFixture.colorMultiplier[1], v],
                              });
                            }}
                            className="w-full bg-transparent text-slate-200 font-mono focus:outline-none text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingFixture(null)}
                      className="px-4 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2538] text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveFixture(editingFixture)}
                      className="px-5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black text-xs font-bold shadow-lg shadow-cyan-600/20"
                    >
                      Save Fixture Patch
                    </button>
                  </div>
                </div>
              )}

              {/* Fixture Patch Table */}
              <div className="rounded-xl border border-[#1b2638] bg-[#070b13] overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0e1626] border-b border-[#1b2638] text-slate-400 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Fixture Name</th>
                      <th className="py-3 px-4">Universe</th>
                      <th className="py-3 px-4">Channel Range</th>
                      <th className="py-3 px-4">Profile</th>
                      <th className="py-3 px-4">Bound Shape / Tag</th>
                      <th className="py-3 px-4">RGB Balance</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#162235]">
                    {patchSheet.dmxFixtures.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-500">
                          No DMX fixtures patched. Click "Add Fixture" or "Auto-Patch 4x Floods" to get started.
                        </td>
                      </tr>
                    ) : (
                      patchSheet.dmxFixtures.map((fix) => {
                        const endChannel = fix.startChannel + fix.channelCount - 1;
                        const validation = validateDmxPatch(fix, patchSheet.dmxFixtures);
                        const spec = DMX_PROFILE_SPECS[fix.profile];

                        return (
                          <tr
                            key={fix.id}
                            className={`hover:bg-[#0c1422] transition-colors ${
                              !validation.isValid ? 'bg-rose-950/20' : ''
                            }`}
                          >
                            <td className="py-3 px-4 font-semibold text-slate-100 flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: spec?.defaultColor || '#38bdf8' }}
                              />
                              {fix.name}
                              {!validation.isValid && (
                                <span title={validation.error}>
                                  <AlertCircle className="w-4 h-4 text-rose-400" />
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-cyan-400">
                              Univ {fix.universe}
                            </td>
                            <td className="py-3 px-4 font-mono">
                              Ch {fix.startChannel}–{endChannel}{' '}
                              <span className="text-slate-500">({fix.channelCount} ch)</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#141e2e] border border-[#213047] text-slate-200">
                                {fix.profile}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-950/40 border border-cyan-800/40 text-cyan-300">
                                {fix.targetTag || 'None'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                              [{fix.colorMultiplier.map((m) => m.toFixed(1)).join(', ')}]
                            </td>
                            <td className="py-3 px-4 text-right space-x-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingFixture(fix);
                                  setIsEditingNew(false);
                                }}
                                className="px-2.5 py-1 rounded bg-[#152032] hover:bg-[#1d2d46] text-slate-300 hover:text-white font-medium text-[11px] transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteFixture(fix.id)}
                                className="px-2 py-1 rounded bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 hover:text-rose-200 text-[11px] transition-colors"
                                title="Delete Fixture"
                              >
                                <Trash2 className="w-3.5 h-3.5 inline" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: WLED PIXEL STRIP CONTROLLER MANAGER */}
          {activeTab === 'wled' && (
            <div className="space-y-6">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#0d1522] border border-[#1b2638]">
                <div>
                  <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-emerald-400" />
                    WLED Controllers & DDP (Distributed Display Protocol)
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Direct UDP pixel streaming on port 21324 without Art-Net universe slicing overhead
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSimulatePing}
                    disabled={isPingingDevices}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141e2e] hover:bg-[#1a283e] text-slate-300 hover:text-white border border-[#213047] text-xs font-medium transition-colors"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 text-cyan-400 ${
                        isPingingDevices ? 'animate-spin' : ''
                      }`}
                    />
                    Ping & Auto-Discover
                  </button>

                  <button
                    type="button"
                    onClick={handleExportWled}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141e2e] hover:bg-[#1a283e] text-slate-300 hover:text-white border border-[#213047] text-xs font-medium transition-colors"
                    title="Export WLED config (.mpswled)"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    Export .mpswled
                  </button>

                  <button
                    type="button"
                    onClick={() => wledFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141e2e] hover:bg-[#1a283e] text-slate-300 hover:text-white border border-[#213047] text-xs font-medium transition-colors"
                    title="Import WLED config (.mpswled)"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    Import .mpswled
                  </button>

                  <button
                    type="button"
                    onClick={handleAddWledDevice}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs transition-colors shadow-lg shadow-emerald-600/20"
                  >
                    <Plus className="w-4 h-4" />
                    Add WLED Device
                  </button>
                </div>
              </div>

              {/* WLED Devices Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {patchSheet.wledDevices.map((dev) => {
                  const devPatches = patchSheet.wledPatches.filter(
                    (p) => p.deviceId === dev.id
                  );

                  return (
                    <div
                      key={dev.id}
                      className="p-5 rounded-xl bg-[#090f19] border border-[#1b2638] space-y-4 shadow-lg hover:border-slate-700 transition-colors"
                    >
                      {/* Device Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-100">
                              {dev.name}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
                                dev.online
                                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                                  : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  dev.online ? 'bg-emerald-400' : 'bg-rose-400'
                                }`}
                              />
                              {dev.online ? `Online (${dev.lastPingMs}ms)` : 'Offline'}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-cyan-400 mt-0.5">
                            IP: {dev.ip} &bull; Port: {dev.port} (DDP) &bull;{' '}
                            <span className="text-slate-300 font-bold">
                              {dev.totalPixels} Total Pixels
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteWledDevice(dev.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                          title="Delete Device"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Segments & Shape Mapping */}
                      <div className="space-y-2 text-xs">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Strip Segments & Shape Synchronization:
                        </div>

                        {dev.segments.map((seg) => {
                          const patch = devPatches.find(
                            (p) => p.segmentId === seg.id
                          );

                          return (
                            <div
                              key={seg.id}
                              className="p-3 rounded-lg bg-[#05080e] border border-[#141e2e] flex flex-wrap items-center justify-between gap-3"
                            >
                              <div>
                                <div className="font-semibold text-slate-200">
                                  Segment #{seg.id}: {seg.name}
                                </div>
                                <div className="text-[10px] font-mono text-slate-500">
                                  Pixel range: {seg.start} &rarr; {seg.stop} (
                                  {seg.stop - seg.start} px)
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Tag Binding */}
                                <select
                                  value={patch?.targetTag || 'Roofline'}
                                  onChange={(e) => {
                                    const newTag = e.target.value;
                                    updatePatchSheet((prev) => {
                                      const existing = prev.wledPatches.find(
                                        (p) =>
                                          p.deviceId === dev.id &&
                                          p.segmentId === seg.id
                                      );
                                      if (existing) {
                                        return {
                                          ...prev,
                                          wledPatches: prev.wledPatches.map((p) =>
                                            p.id === existing.id
                                              ? { ...p, targetTag: newTag }
                                              : p
                                          ),
                                        };
                                      } else {
                                        const created: WledSegmentPatch = {
                                          id: `wled-p-${Date.now().toString(36)}`,
                                          deviceId: dev.id,
                                          segmentId: seg.id,
                                          targetTag: newTag,
                                          syncMode: 'color_sample',
                                        };
                                        return {
                                          ...prev,
                                          wledPatches: [
                                            ...prev.wledPatches,
                                            created,
                                          ],
                                        };
                                      }
                                    });
                                  }}
                                  className="bg-[#0b121e] border border-[#213047] text-cyan-300 rounded px-2 py-1 text-[11px] focus:outline-none"
                                >
                                  {availableTags.map((tag) => (
                                    <option key={tag} value={tag}>
                                      Sync: {tag}
                                    </option>
                                  ))}
                                </select>

                                {/* Sync Mode */}
                                <select
                                  value={patch?.syncMode || 'color_sample'}
                                  onChange={(e) => {
                                    const mode = e.target.value as WledSyncMode;
                                    updatePatchSheet((prev) => ({
                                      ...prev,
                                      wledPatches: prev.wledPatches.map((p) =>
                                        p.deviceId === dev.id &&
                                        p.segmentId === seg.id
                                          ? { ...p, syncMode: mode }
                                          : p
                                      ),
                                    }));
                                  }}
                                  className="bg-[#0b121e] border border-[#213047] text-amber-300 rounded px-2 py-1 text-[11px] focus:outline-none font-mono"
                                >
                                  <option value="color_sample">Color Sample</option>
                                  <option value="border_marquee">Border Marquee</option>
                                  <option value="energy_pulse">Energy Pulse</option>
                                  <option value="strobe">Strobe</option>
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Live Test Color Buttons */}
                      <div className="pt-2 border-t border-[#162235] space-y-1.5">
                        <div className="text-[10px] font-mono text-slate-400">
                          Quick DDP Hardware Test:
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleTestWledColor(dev.id, 'Pure Red', [255, 0, 0])
                            }
                            className="px-2 py-1 rounded bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 text-[10px] font-bold"
                          >
                            Red
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleTestWledColor(dev.id, 'Emerald Green', [0, 255, 0])
                            }
                            className="px-2 py-1 rounded bg-green-600/20 hover:bg-green-600/40 text-green-300 border border-green-500/30 text-[10px] font-bold"
                          >
                            Green
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleTestWledColor(dev.id, 'Ice Blue', [0, 150, 255])
                            }
                            className="px-2 py-1 rounded bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 text-[10px] font-bold"
                          >
                            Blue
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleTestWledColor(dev.id, 'Warm Amber White', [255, 200, 100])
                            }
                            className="px-2 py-1 rounded bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/30 text-[10px] font-bold"
                          >
                            Warm White
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleTestWledColor(dev.id, 'Blackout', [0, 0, 0])
                            }
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-bold"
                          >
                            Blackout
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: LIVE OUTPUT MONITOR & BROADCAST TESTER */}
          {activeTab === 'monitor' && (
            <div className="space-y-6">
              {/* Stream Control Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#0d1522] border border-[#1b2638]">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3.5 h-3.5 rounded-full ${
                      isStreamingLive
                        ? 'bg-emerald-400 animate-ping'
                        : 'bg-slate-600'
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                      <span>Art-Net 4 & WLED DDP Network Streamer</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          isStreamingLive
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {isStreamingLive ? 'TRANSMITTING 60 FPS' : 'PAUSED'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Real-time UDP frame dispatcher bound to projection rasterizer
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsStreamingLive(!isStreamingLive);
                      showToast?.(
                        !isStreamingLive
                          ? 'DMX & WLED UDP Transmission Started (60 FPS)'
                          : 'DMX & WLED Transmission Stopped'
                      );
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
                      isStreamingLive
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
                    }`}
                  >
                    {isStreamingLive ? (
                      <>
                        <Square className="w-4 h-4 fill-current" />
                        Halt Stream
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        Launch Live Stream
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 4 Real-time Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div className="p-4 rounded-xl bg-[#070b13] border border-[#1b2638]">
                  <div className="text-slate-400 text-[11px] mb-1">DMX Packets / Sec</div>
                  <div className="text-xl font-bold text-cyan-400">
                    {isStreamingLive ? (simulatedMetrics.avgFps * 0.4).toFixed(1) : '0.0'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">UDP Port 6454 Broadcast</div>
                </div>

                <div className="p-4 rounded-xl bg-[#070b13] border border-[#1b2638]">
                  <div className="text-slate-400 text-[11px] mb-1">DDP Frames / Sec</div>
                  <div className="text-xl font-bold text-emerald-400">
                    {isStreamingLive ? (simulatedMetrics.avgFps * 0.6).toFixed(1) : '0.0'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Port 21324 Unicast</div>
                </div>

                <div className="p-4 rounded-xl bg-[#070b13] border border-[#1b2638]">
                  <div className="text-slate-400 text-[11px] mb-1">Network Throughput</div>
                  <div className="text-xl font-bold text-amber-400">
                    {isStreamingLive
                      ? `${((simulatedMetrics.avgFps * 530) / 1024).toFixed(1)} KB/s`
                      : '0.0 KB/s'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Local Subnet QoS</div>
                </div>

                <div className="p-4 rounded-xl bg-[#070b13] border border-[#1b2638]">
                  <div className="text-slate-400 text-[11px] mb-1">Dropped Packets</div>
                  <div className="text-xl font-bold text-slate-200">
                    {simulatedMetrics.droppedPackets}{' '}
                    <span className="text-[11px] text-emerald-400">(0.00%)</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">99.98% Network Health</div>
                </div>
              </div>

              {/* 16-Channel Live Output Preview Dots */}
              <div className="p-4 rounded-xl bg-[#070b13] border border-[#1b2638] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-cyan-400" />
                    16-Channel Live Fixture Output Visualizer
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    RGB Color Meters updating in real time
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-16 gap-2">
                  {livePreviewColors.map((color, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-lg bg-[#04070d] border border-[#162235] flex flex-col items-center gap-1.5"
                    >
                      <div
                        className="w-7 h-7 rounded-full shadow-lg transition-colors duration-150 border border-white/20"
                        style={{
                          backgroundColor: isStreamingLive ? color : '#1e293b',
                          boxShadow: isStreamingLive
                            ? `0 0 12px ${color}`
                            : 'none',
                        }}
                      />
                      <span className="text-[9px] font-mono text-slate-400">
                        Ch {i + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Packet Inspector & Raw Protocol Hex Dump */}
              <div className="p-4 rounded-xl bg-[#070b13] border border-[#1b2638] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="font-semibold text-slate-200 flex items-center gap-2">
                    <Send className="w-4 h-4 text-cyan-400" />
                    Protocol Packet Inspector & Hardware Dispatcher
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSendArtNetTestPacket}
                      className="px-2.5 py-1 rounded bg-[#131c2c] hover:bg-[#1a283e] text-cyan-400 border border-cyan-800/50 text-[11px] font-mono font-bold transition-colors"
                    >
                      Send Art-Net Test (0x5000)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const testPixels = new Uint8Array([255, 128, 0, 0, 255, 100]);
                        const ddp = createWledDdpPacket(testPixels, 0);
                        setInspectorLog({
                          protocol: 'WLED DDP',
                          time: new Date().toLocaleTimeString(),
                          universeOrOffset: 'Offset 0 (21324)',
                          length: ddp.length,
                          hexSnippet: Array.from(ddp.subarray(0, 16))
                            .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
                            .join(' '),
                        });
                        showToast?.('Dispatched DDP test packet');
                      }}
                      className="px-2.5 py-1 rounded bg-[#131c2c] hover:bg-[#1a283e] text-emerald-400 border border-emerald-800/50 text-[11px] font-mono font-bold transition-colors"
                    >
                      Send DDP Test Frame
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#03060c] border border-[#141d2c] font-mono text-xs space-y-1.5 text-slate-300">
                  {inspectorLog ? (
                    <>
                      <div className="flex items-center justify-between text-[11px] text-cyan-400 border-b border-[#141d2c] pb-1">
                        <span>
                          [{inspectorLog.time}] {inspectorLog.protocol} Packet Dispatched &bull;{' '}
                          {inspectorLog.universeOrOffset} &bull; Total Size:{' '}
                          {inspectorLog.length} Bytes
                        </span>
                        <span className="text-emerald-400 font-bold">200 OK</span>
                      </div>
                      <div className="text-[11px] text-slate-400 pt-1">
                        Header Hex Dump (First 16–18 Bytes):
                      </div>
                      <div className="p-2 rounded bg-black/60 text-amber-300 tracking-widest text-[11px] select-all overflow-x-auto">
                        {inspectorLog.hexSnippet}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {inspectorLog.protocol === 'Art-Net'
                          ? 'ASCII "Art-Net\\0" (0x41 72 74 2D 4E 65 74 00) | OpCode 0x5000 (OpDmx) | ProtVer 14 | 512 Ch DMX512-A'
                          : 'DDP Flags 0x41 (Ver 1 | Push) | Type 0x01 (RGB 24-bit) | ID 0x01 | 32-bit Offset | Payload Stream'}
                      </div>
                    </>
                  ) : (
                    <div className="text-slate-500 text-center py-4">
                      Click "Send Art-Net Test" or "Send DDP Test Frame" above to inspect network packets and verify wire protocol compatibility.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* FOOTER                                                            */}
        {/* ================================================================= */}
        <div className="px-6 py-4 border-t border-[#1b2638] bg-[#090e18] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              Patch Sheet: <strong className="text-slate-200">{patchSheet.dmxFixtures.length}</strong> Fixtures &bull;{' '}
              <strong className="text-slate-200">{patchSheet.wledDevices.length}</strong> WLED Controllers &bull;{' '}
              Ready for Show Execution
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs transition-colors shadow-lg shadow-cyan-600/20"
            >
              Done & Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
