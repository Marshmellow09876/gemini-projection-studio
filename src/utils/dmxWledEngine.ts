/**
 * Marshall Projection Studio Parity - Phase 2 Work Package 2
 * DMX Art-Net 4 & WLED DDP Pixel Light Engine
 *
 * Provides bit-level network packet serialization for Art-Net 4 (OpDmx 0x5000),
 * WLED DDP (Distributed Display Protocol), patch sheet validation with channel collision detection,
 * real-time projection shape color sampling, network streaming simulation, and JSON import/export.
 */

// ---------------------------------------------------------------------------
// 1. Data Types & Interfaces
// ---------------------------------------------------------------------------

export type DmxFixtureProfile = 'RGB' | 'RGBW' | 'Dimmer' | 'Strobe' | 'MovingHead';

export interface DmxUniverseConfig {
  universe: number; // 0-32767
  name: string;
  ip: string;
  port: number; // default 6454
  broadcast: boolean;
  refreshRateHz: number; // default 40
}

export interface DmxFixturePatch {
  id: string;
  name: string;
  universe: number; // 0-32767
  startChannel: number; // 1-512
  profile: DmxFixtureProfile;
  channelCount: number;
  targetShapeId?: string;
  targetTag?: string; // e.g. 'Roofline', 'Bushes', 'Columns', 'Windows', 'Garage'
  colorMultiplier: [number, number, number]; // [r, g, b] multipliers e.g. [1.0, 1.0, 1.0]
}

export interface WledSegmentConfig {
  id: number;
  start: number;
  stop: number;
  name: string;
}

export interface WledDeviceConfig {
  id: string;
  name: string;
  ip: string;
  port: number; // default 21324 for DDP, 80 for HTTP JSON API
  totalPixels: number;
  segments: WledSegmentConfig[];
  online: boolean;
  lastPingMs: number;
}

export type WledSyncMode = 'color_sample' | 'border_marquee' | 'energy_pulse' | 'strobe';

export interface WledSegmentPatch {
  id: string;
  deviceId: string;
  segmentId: number;
  targetShapeId?: string;
  targetTag?: string;
  syncMode: WledSyncMode;
}

export interface DmxWledPatchSheet {
  version: '1.0';
  dmxUniverses: DmxUniverseConfig[];
  dmxFixtures: DmxFixturePatch[];
  wledDevices: WledDeviceConfig[];
  wledPatches: WledSegmentPatch[];
}

// ---------------------------------------------------------------------------
// 2. Profile Definitions & Constants
// ---------------------------------------------------------------------------

export const DMX_PROFILE_SPECS: Record<
  DmxFixtureProfile,
  {
    channels: number;
    description: string;
    channelLabels: string[];
    defaultColor: string;
  }
> = {
  RGB: {
    channels: 3,
    description: '3-Channel RGB Fixture (Red, Green, Blue)',
    channelLabels: ['Red', 'Green', 'Blue'],
    defaultColor: '#38bdf8',
  },
  RGBW: {
    channels: 4,
    description: '4-Channel RGBW Wash / Flood (Red, Green, Blue, White)',
    channelLabels: ['Red', 'Green', 'Blue', 'White'],
    defaultColor: '#f43f5e',
  },
  Dimmer: {
    channels: 1,
    description: '1-Channel Single Dimmer / Warm Halogen',
    channelLabels: ['Intensity'],
    defaultColor: '#fbbf24',
  },
  Strobe: {
    channels: 2,
    description: '2-Channel Strobe Cannon (Intensity, Flash Rate)',
    channelLabels: ['Intensity', 'Flash Rate'],
    defaultColor: '#a855f7',
  },
  MovingHead: {
    channels: 8,
    description: '8-Channel Moving Head (Pan, Tilt, Dim, Strobe, R, G, B, W)',
    channelLabels: [
      'Pan (0-540°)',
      'Tilt (0-270°)',
      'Master Dimmer',
      'Strobe / Shutter',
      'Red',
      'Green',
      'Blue',
      'White',
    ],
    defaultColor: '#10b981',
  },
};

export const COMMON_HOUSE_TAGS: string[] = [
  'Roofline',
  'Main Walls',
  'Columns',
  'Bushes',
  'Windows',
  'Garage',
  'Trees',
  'Walkway',
  'Yard Arches',
];

export const STORAGE_KEY_DMX_WLED_PATCH = 'marshall_dmx_wled_patch_sheet_v1';

// ---------------------------------------------------------------------------
// 3. Default Preset Patch Sheet
// ---------------------------------------------------------------------------

export const DEFAULT_DMX_WLED_PATCH_SHEET: DmxWledPatchSheet = {
  version: '1.0',
  dmxUniverses: [
    {
      universe: 1,
      name: 'Universe 1 - Main Facade & Stage Wash',
      ip: '192.168.1.201',
      port: 6454,
      broadcast: true,
      refreshRateHz: 40,
    },
    {
      universe: 2,
      name: 'Universe 2 - Landscape Trees & Yard Arches',
      ip: '192.168.1.202',
      port: 6454,
      broadcast: true,
      refreshRateHz: 40,
    },
  ],
  dmxFixtures: [
    {
      id: 'fix-1',
      name: 'Roofline Center Wash Flood',
      universe: 1,
      startChannel: 1,
      profile: 'RGBW',
      channelCount: 4,
      targetTag: 'Roofline',
      colorMultiplier: [1.0, 1.0, 1.0],
    },
    {
      id: 'fix-2',
      name: 'Left Bush RGB Par 64',
      universe: 1,
      startChannel: 5,
      profile: 'RGB',
      channelCount: 3,
      targetTag: 'Bushes',
      colorMultiplier: [1.0, 0.9, 0.8],
    },
    {
      id: 'fix-3',
      name: 'Right Bush RGB Par 64',
      universe: 1,
      startChannel: 8,
      profile: 'RGB',
      channelCount: 3,
      targetTag: 'Bushes',
      colorMultiplier: [1.0, 0.9, 0.8],
    },
    {
      id: 'fix-4',
      name: 'Column Left Moving Spot',
      universe: 1,
      startChannel: 11,
      profile: 'MovingHead',
      channelCount: 8,
      targetTag: 'Columns',
      colorMultiplier: [1.0, 1.0, 1.0],
    },
    {
      id: 'fix-5',
      name: 'Column Right Moving Spot',
      universe: 1,
      startChannel: 19,
      profile: 'MovingHead',
      channelCount: 8,
      targetTag: 'Columns',
      colorMultiplier: [1.0, 1.0, 1.0],
    },
    {
      id: 'fix-6',
      name: 'Roof Apex High-Power Strobe',
      universe: 1,
      startChannel: 27,
      profile: 'Strobe',
      channelCount: 2,
      targetTag: 'Roofline',
      colorMultiplier: [1.0, 1.0, 1.0],
    },
  ],
  wledDevices: [
    {
      id: 'wled-dev-1',
      name: 'Roof Gutter Pixel Strip (ESP32)',
      ip: '192.168.1.150',
      port: 21324,
      totalPixels: 300,
      segments: [
        { id: 0, start: 0, stop: 150, name: 'Gutter Eaves West' },
        { id: 1, start: 150, stop: 300, name: 'Gutter Eaves East' },
      ],
      online: true,
      lastPingMs: 12,
    },
    {
      id: 'wled-dev-2',
      name: 'Driveway Pixel Arches (ESP8266)',
      ip: '192.168.1.151',
      port: 21324,
      totalPixels: 200,
      segments: [{ id: 0, start: 0, stop: 200, name: 'Driveway Arch Sequence' }],
      online: true,
      lastPingMs: 16,
    },
  ],
  wledPatches: [
    {
      id: 'wled-patch-1',
      deviceId: 'wled-dev-1',
      segmentId: 0,
      targetTag: 'Roofline',
      syncMode: 'color_sample',
    },
    {
      id: 'wled-patch-2',
      deviceId: 'wled-dev-1',
      segmentId: 1,
      targetTag: 'Roofline',
      syncMode: 'border_marquee',
    },
    {
      id: 'wled-patch-3',
      deviceId: 'wled-dev-2',
      segmentId: 0,
      targetTag: 'Garage',
      syncMode: 'energy_pulse',
    },
  ],
};

// ---------------------------------------------------------------------------
// 4. Core Protocol Encoding & Decoding
// ---------------------------------------------------------------------------

/**
 * Creates an Art-Net 4 ArtDmx UDP packet (OpCode 0x5000).
 *
 * Header Layout (18 bytes):
 * - 0..7:   'Art-Net\0' (8 bytes ASCII)
 * - 8..9:   OpCode 0x5000 (Little Endian: 0x00, 0x50)
 * - 10..11: ProtVer 14 (Big Endian: 0x00, 0x0E)
 * - 12:     Sequence (0x00 disabled or 1-255)
 * - 13:     Physical (0x00 input port)
 * - 14:     SubUni (Low 8 bits: Sub-Net bits 7-4, Universe bits 3-0)
 * - 15:     Net (High 7 bits: Net bits 6-0)
 * - 16..17: Length of DMX channels (Big Endian, even number 2-512)
 * - 18..N:  Channel Data (512 bytes)
 */
export function createArtDmxPacket(
  universe: number,
  channels: Uint8Array,
  sequence: number = 0
): Uint8Array {
  const safeUniverse = Math.max(0, Math.min(32767, Math.floor(universe)));
  const channelLen = Math.min(512, Math.max(2, channels.length));
  // Art-Net specs require even data length between 2 and 512
  const evenLength = channelLen % 2 === 0 ? channelLen : channelLen + 1;
  const packet = new Uint8Array(18 + evenLength);

  // 1. Identification: 'Art-Net\0'
  const header = [0x41, 0x72, 0x74, 0x2d, 0x4e, 0x65, 0x74, 0x00];
  for (let i = 0; i < 8; i++) {
    packet[i] = header[i];
  }

  // 2. OpCode 0x5000 (Little Endian)
  packet[8] = 0x00;
  packet[9] = 0x50;

  // 3. ProtVer 14 (Big Endian)
  packet[10] = 0x00;
  packet[11] = 0x0e;

  // 4. Sequence & Physical
  packet[12] = sequence & 0xff;
  packet[13] = 0x00;

  // 5. Port-Address (15-bit Art-Net 4)
  // Low byte: SubUni (bits 0-7)
  packet[14] = safeUniverse & 0xff;
  // High byte: Net (bits 8-14)
  packet[15] = (safeUniverse >> 8) & 0x7f;

  // 6. Length (Big Endian)
  packet[16] = (evenLength >> 8) & 0xff;
  packet[17] = evenLength & 0xff;

  // 7. DMX Payload
  packet.set(channels.subarray(0, Math.min(channels.length, evenLength)), 18);

  return packet;
}

/**
 * Creates a WLED DDP (Distributed Display Protocol) UDP frame.
 *
 * Header Layout (10 bytes):
 * - 0:     Flags (0x41 = Version 1 0x40 | Push 0x01)
 * - 1:     Sequence / Packet index (0x01 or counter)
 * - 2:     Data Type (0x01 = RGB 24-bit)
 * - 3:     Destination ID (0x01 = Device Default)
 * - 4..7:  Offset (32-bit Big Endian byte offset)
 * - 8..9:  Length in bytes (16-bit Big Endian)
 * - 10..N: RGB Payload
 */
export function createWledDdpPacket(
  pixelsRgb: Uint8Array,
  offset: number = 0
): Uint8Array {
  const payloadLen = pixelsRgb.length;
  const packet = new Uint8Array(10 + payloadLen);

  // 0. Flags: Ver 1 (0x40) | Push (0x01) = 0x41
  packet[0] = 0x41;
  // 1. Sequence / Type
  packet[1] = 0x01;
  // 2. Data Type (0x01 = RGB)
  packet[2] = 0x01;
  // 3. Destination ID
  packet[3] = 0x01;

  // 4-7. 32-bit Big Endian Offset
  const safeOffset = Math.max(0, offset);
  packet[4] = (safeOffset >>> 24) & 0xff;
  packet[5] = (safeOffset >>> 16) & 0xff;
  packet[6] = (safeOffset >>> 8) & 0xff;
  packet[7] = safeOffset & 0xff;

  // 8-9. 16-bit Big Endian Data Length
  packet[8] = (payloadLen >> 8) & 0xff;
  packet[9] = payloadLen & 0xff;

  // 10..N. RGB payload
  packet.set(pixelsRgb, 10);

  return packet;
}

// ---------------------------------------------------------------------------
// 5. Validation & Channel Collision Detection
// ---------------------------------------------------------------------------

/**
 * Validates a single DMX fixture patch against channel bounds and overlapping fixtures.
 */
export function validateDmxPatch(
  patch: DmxFixturePatch,
  allPatches: DmxFixturePatch[]
): { isValid: boolean; error?: string } {
  // 1. Universe bounds check (0 - 32767)
  if (
    typeof patch.universe !== 'number' ||
    patch.universe < 0 ||
    patch.universe > 32767
  ) {
    return {
      isValid: false,
      error: `Invalid Universe "${patch.universe}". Art-Net universe must be between 0 and 32767.`,
    };
  }

  // 2. Start channel bounds check (1 - 512)
  if (
    typeof patch.startChannel !== 'number' ||
    patch.startChannel < 1 ||
    patch.startChannel > 512
  ) {
    return {
      isValid: false,
      error: `Start channel ${patch.startChannel} is out of bounds. DMX channels must be 1–512.`,
    };
  }

  // 3. Channel count and upper limit check
  const channels = patch.channelCount || DMX_PROFILE_SPECS[patch.profile]?.channels || 1;
  const endChannel = patch.startChannel + channels - 1;
  if (endChannel > 512) {
    return {
      isValid: false,
      error: `Fixture "${patch.name}" footprint (Ch ${patch.startChannel}–${endChannel}) exceeds universe limit of 512.`,
    };
  }

  // 4. Overlap collision check within the same universe
  for (const other of allPatches) {
    if (other.id === patch.id) continue;
    if (other.universe !== patch.universe) continue;

    const otherChannels = other.channelCount || DMX_PROFILE_SPECS[other.profile]?.channels || 1;
    const otherEnd = other.startChannel + otherChannels - 1;

    // Interval intersection: [startChannel, endChannel] overlaps [other.startChannel, otherEnd]
    const isOverlapping =
      patch.startChannel <= otherEnd && endChannel >= other.startChannel;

    if (isOverlapping) {
      return {
        isValid: false,
        error: `Channel collision in Universe ${patch.universe}: fixture "${patch.name}" (Ch ${patch.startChannel}–${endChannel}) collides with "${other.name}" (Ch ${other.startChannel}–${otherEnd}).`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Validates an entire patch sheet, returning a list of all conflicts found.
 */
export function validateEntirePatchSheet(sheet: DmxWledPatchSheet): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check all DMX fixtures
  for (let i = 0; i < sheet.dmxFixtures.length; i++) {
    const fix = sheet.dmxFixtures[i];
    const res = validateDmxPatch(fix, sheet.dmxFixtures);
    if (!res.isValid && res.error) {
      errors.push(res.error);
    }
  }

  // Check WLED device IP uniqueness and segment bounds
  const ipSet = new Set<string>();
  for (const dev of sheet.wledDevices) {
    if (!dev.ip || dev.ip.trim() === '') {
      errors.push(`WLED Controller "${dev.name}" has an empty IP address.`);
    } else if (ipSet.has(dev.ip.trim())) {
      errors.push(`Duplicate WLED Controller IP address detected: ${dev.ip}.`);
    } else {
      ipSet.add(dev.ip.trim());
    }

    // Check segment overlaps within the device
    for (const seg of dev.segments) {
      if (seg.start < 0 || seg.stop > dev.totalPixels || seg.start >= seg.stop) {
        errors.push(
          `WLED Controller "${dev.name}" segment "${seg.name}" range (${seg.start}–${seg.stop}) is invalid for ${dev.totalPixels} total pixels.`
        );
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ---------------------------------------------------------------------------
// 6. Real-Time Shape Color Sampler
// ---------------------------------------------------------------------------

/**
 * Deterministic color palette for tags/shapes when live Canvas pixels are unmapped or during previews.
 */
const TAG_FALLBACK_COLORS: Record<string, [number, number, number]> = {
  Roofline: [255, 180, 40], // Warm golden amber
  'Main Walls': [70, 160, 255], // Ice cyan blue
  Columns: [180, 70, 255], // Neon purple
  Bushes: [34, 197, 94], // Vibrant emerald green
  Windows: [244, 63, 94], // Ruby rose red
  Garage: [249, 115, 22], // Fire orange
  Trees: [16, 185, 129], // Deep forest green
  Walkway: [234, 179, 8], // Warm yellow
  'Yard Arches': [236, 72, 153], // Magenta pink
};

/**
 * Samples the average RGB color inside a house projection shape or tag zone.
 * Accepts an HTMLCanvasElement, ImageData, or fallback object.
 */
export function sampleShapeColorForDmx(
  shapeIdOrTag: string,
  canvasElementOrImageData?: any
): [number, number, number] {
  // 1. Direct ImageData sampling
  if (
    canvasElementOrImageData &&
    typeof canvasElementOrImageData.data === 'object' &&
    canvasElementOrImageData.data instanceof Uint8ClampedArray
  ) {
    const data: Uint8ClampedArray = canvasElementOrImageData.data;
    const len = data.length;
    if (len >= 4) {
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      const step = Math.max(4, Math.floor(len / 400) * 4); // sample up to 100 points
      let count = 0;
      for (let i = 0; i < len; i += step) {
        const a = data[i + 3];
        if (a > 30) {
          rSum += data[i];
          gSum += data[i + 1];
          bSum += data[i + 2];
          count++;
        }
      }
      if (count > 0) {
        return [
          Math.min(255, Math.round(rSum / count)),
          Math.min(255, Math.round(gSum / count)),
          Math.min(255, Math.round(bSum / count)),
        ];
      }
    }
  }

  // 2. HTMLCanvasElement sampling
  if (
    canvasElementOrImageData &&
    typeof canvasElementOrImageData.getContext === 'function'
  ) {
    try {
      const ctx = canvasElementOrImageData.getContext('2d');
      if (ctx) {
        const w = canvasElementOrImageData.width || 100;
        const h = canvasElementOrImageData.height || 100;
        const imgData = ctx.getImageData(0, 0, Math.min(w, 200), Math.min(h, 200));
        return sampleShapeColorForDmx(shapeIdOrTag, imgData);
      }
    } catch {
      // Security or headless fallback
    }
  }

  // 3. Fallback color lookup based on known tag name or hash
  if (TAG_FALLBACK_COLORS[shapeIdOrTag]) {
    return TAG_FALLBACK_COLORS[shapeIdOrTag];
  }

  // Hash-based lively color generation
  let hash = 0;
  for (let i = 0; i < shapeIdOrTag.length; i++) {
    hash = (hash << 5) - hash + shapeIdOrTag.charCodeAt(i);
    hash |= 0;
  }
  const r = Math.abs((hash & 0xff0000) >> 16) % 200 + 55;
  const g = Math.abs((hash & 0x00ff00) >> 8) % 200 + 55;
  const b = Math.abs(hash & 0x0000ff) % 200 + 55;

  return [r, g, b];
}

// ---------------------------------------------------------------------------
// 7. Network Stream Simulation
// ---------------------------------------------------------------------------

/**
 * Simulates high-speed streaming of Art-Net DMX and WLED DDP packets over network,
 * returning realistic metrics (packets sent, packet drops, average FPS).
 */
export function simulateDmxNetworkStream(
  patchSheet: DmxWledPatchSheet,
  durationMs: number
): { packetsSent: number; droppedPackets: number; avgFps: number } {
  const durationSec = Math.max(0.001, durationMs / 1000);

  // Sum FPS across active universes
  let totalDmxFps = 0;
  for (const uni of patchSheet.dmxUniverses) {
    totalDmxFps += uni.refreshRateHz || 40;
  }

  // WLED DDP stream runs at ~60 FPS per online device
  const onlineWledCount = patchSheet.wledDevices.filter((d) => d.online).length;
  const totalWledFps = onlineWledCount * 60;

  const combinedFps = totalDmxFps + totalWledFps;
  const theoreticalPackets = Math.floor(combinedFps * durationSec);

  // Typical local UDP drop rate is 0.02% to 0.1% under stress
  const dropRate = 0.0006;
  const droppedPackets = Math.round(theoreticalPackets * dropRate);
  const packetsSent = Math.max(0, theoreticalPackets - droppedPackets);

  const avgFps = parseFloat((packetsSent / durationSec).toFixed(1));

  return {
    packetsSent,
    droppedPackets,
    avgFps,
  };
}

// ---------------------------------------------------------------------------
// 8. Visual Occupancy Map Generator (1-512 Channels)
// ---------------------------------------------------------------------------

export interface ChannelOccupancyInfo {
  channel: number; // 1-512
  isOccupied: boolean;
  fixtureId?: string;
  fixtureName?: string;
  profile?: DmxFixtureProfile;
  color: string;
  channelIndexInFixture?: number;
  label?: string;
  isConflict: boolean;
}

/**
 * Builds a 512-element occupancy array for a specific universe.
 */
export function buildUniverseOccupancyMap(
  universe: number,
  fixtures: DmxFixturePatch[]
): ChannelOccupancyInfo[] {
  const map: ChannelOccupancyInfo[] = [];

  for (let ch = 1; ch <= 512; ch++) {
    map.push({
      channel: ch,
      isOccupied: false,
      color: '#1e293b', // slate-800
      isConflict: false,
    });
  }

  const uniFixtures = fixtures.filter((f) => f.universe === universe);

  for (const fix of uniFixtures) {
    const count = fix.channelCount || DMX_PROFILE_SPECS[fix.profile]?.channels || 1;
    const spec = DMX_PROFILE_SPECS[fix.profile];
    const color = spec ? spec.defaultColor : '#38bdf8';

    for (let c = 0; c < count; c++) {
      const chNum = fix.startChannel + c;
      if (chNum >= 1 && chNum <= 512) {
        const slot = map[chNum - 1];
        if (slot.isOccupied) {
          slot.isConflict = true;
          slot.color = '#ef4444'; // Red conflict alert
          slot.label = `CONFLICT: ${slot.fixtureName} & ${fix.name}`;
        } else {
          slot.isOccupied = true;
          slot.fixtureId = fix.id;
          slot.fixtureName = fix.name;
          slot.profile = fix.profile;
          slot.color = color;
          slot.channelIndexInFixture = c;
          slot.label = spec?.channelLabels[c] || `Channel ${c + 1}`;
        }
      }
    }
  }

  return map;
}

// ---------------------------------------------------------------------------
// 9. Persistence & Storage Helpers
// ---------------------------------------------------------------------------

export function saveDmxWledPatchSheet(sheet: DmxWledPatchSheet): void {
  try {
    localStorage.setItem(STORAGE_KEY_DMX_WLED_PATCH, JSON.stringify(sheet));
  } catch (err) {
    console.error('Failed to save DMX/WLED patch sheet to localStorage:', err);
  }
}

export function loadDmxWledPatchSheet(): DmxWledPatchSheet {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DMX_WLED_PATCH);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === '1.0' && Array.isArray(parsed.dmxFixtures)) {
        return parsed as DmxWledPatchSheet;
      }
    }
  } catch (err) {
    console.warn('Failed to parse saved patch sheet, falling back to defaults:', err);
  }
  return DEFAULT_DMX_WLED_PATCH_SHEET;
}

// ---------------------------------------------------------------------------
// 10. Import / Export Helpers (.mpsdmx and .mpswled)
// ---------------------------------------------------------------------------

export function exportDmxPatchToJson(
  fixtures: DmxFixturePatch[],
  universes: DmxUniverseConfig[]
): string {
  const exportPayload = {
    fileType: 'MarshallProjectionStudio.DmxPatch',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    universes,
    fixtures,
  };
  return JSON.stringify(exportPayload, null, 2);
}

export function importDmxPatchFromJson(jsonStr: string): {
  fixtures: DmxFixturePatch[];
  universes: DmxUniverseConfig[];
} {
  const parsed = JSON.parse(jsonStr);
  if (!parsed || !Array.isArray(parsed.fixtures)) {
    throw new Error('Invalid .mpsdmx format: missing fixtures array');
  }
  return {
    fixtures: parsed.fixtures as DmxFixturePatch[],
    universes: (parsed.universes || []) as DmxUniverseConfig[],
  };
}

export function exportWledPatchToJson(
  devices: WledDeviceConfig[],
  patches: WledSegmentPatch[]
): string {
  const exportPayload = {
    fileType: 'MarshallProjectionStudio.WledPatch',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    devices,
    patches,
  };
  return JSON.stringify(exportPayload, null, 2);
}

export function importWledPatchFromJson(jsonStr: string): {
  devices: WledDeviceConfig[];
  patches: WledSegmentPatch[];
} {
  const parsed = JSON.parse(jsonStr);
  if (!parsed || !Array.isArray(parsed.devices)) {
    throw new Error('Invalid .mpswled format: missing devices array');
  }
  return {
    devices: parsed.devices as WledDeviceConfig[],
    patches: (parsed.patches || []) as WledSegmentPatch[],
  };
}

/**
 * Triggers a client-side file download for patch sheet configurations.
 */
export function downloadJsonFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
