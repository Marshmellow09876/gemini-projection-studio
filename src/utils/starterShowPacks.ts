import {
  AUSTIN_HOUSE_ASSETS,
  BeatFlag,
  PlaylistClip,
  VectorLayer,
  useProjectionStore,
} from '../store/useProjectionStore';

export type StarterPackId =
  | 'halloween_manor'
  | 'christmas_wonderland'
  | 'nye_countdown'
  | 'edm_party';

export interface StarterShowPack {
  id: StarterPackId;
  title: string;
  subtitle: string;
  holidayBadge: string;
  emoji: string;
  difficulty: 'Beginner Friendly';
  description: string;
  highlights: string[];
  accentColor: string;
  previewGradient: string;
  recommendedBpm: number;
  referenceImageUrl: string;
  layers: VectorLayer[];
  playlistClips: PlaylistClip[];
  beatFlags: BeatFlag[];
}

const DEFAULT_DELTA = {
  x: 0,
  y: 0,
  scaleX: 100,
  scaleY: 100,
  rotation: 0,
};

const createHousePolygonLayers = (palette: {
  roof: string;
  wall: string;
  garage: string;
  window: string;
  pillar: string;
}): VectorLayer[] => [
  {
    id: 'starter-roof-main',
    name: 'Main Roofline & Eaves',
    category: 'Roofline',
    visible: true,
    locked: false,
    solo: false,
    role: 'Active Projection Surface',
    color: palette.roof,
    positionX: 50,
    positionY: 22,
    width: 72,
    height: 22,
    rotation: 0,
    edgeFeathering: 4,
    outlineGlowWidth: 3,
    opacity: 0.95,
    strokeWidth: 3,
    dashPattern: 'solid',
    blendMode: 'normal',
    audioReactive: true,
    archTag: 'Roofline',
    vertices: [
      { x: 14, y: 32 },
      { x: 50, y: 10 },
      { x: 86, y: 32 },
      { x: 82, y: 35 },
      { x: 50, y: 15 },
      { x: 18, y: 35 },
    ],
  },
  {
    id: 'starter-wall-main',
    name: 'Upper Facade Wall',
    category: 'Main Walls',
    visible: true,
    locked: false,
    solo: false,
    role: 'Active Projection Surface',
    color: palette.wall,
    positionX: 50,
    positionY: 50,
    width: 68,
    height: 44,
    rotation: 0,
    edgeFeathering: 6,
    outlineGlowWidth: 2,
    opacity: 0.9,
    strokeWidth: 2,
    dashPattern: 'solid',
    blendMode: 'normal',
    audioReactive: false,
    archTag: 'Wall',
    vertices: [
      { x: 16, y: 33 },
      { x: 84, y: 33 },
      { x: 84, y: 82 },
      { x: 16, y: 82 },
    ],
  },
  {
    id: 'starter-garage-door',
    name: 'Garage Feature Canvas',
    category: 'Garage',
    visible: true,
    locked: false,
    solo: false,
    role: 'Active Projection Surface',
    color: palette.garage,
    positionX: 34,
    positionY: 66,
    width: 28,
    height: 28,
    rotation: 0,
    edgeFeathering: 3,
    outlineGlowWidth: 3,
    opacity: 1,
    strokeWidth: 2.5,
    dashPattern: 'solid',
    blendMode: 'normal',
    audioReactive: true,
    archTag: 'Garage',
    vertices: [
      { x: 20, y: 52 },
      { x: 48, y: 52 },
      { x: 48, y: 82 },
      { x: 20, y: 82 },
    ],
  },
  {
    id: 'starter-window-left',
    name: 'Left Upper Window (Masked)',
    category: 'Windows',
    visible: true,
    locked: false,
    solo: false,
    role: 'Hard Blackout Cutout',
    color: palette.window,
    positionX: 28,
    positionY: 41,
    width: 10,
    height: 11,
    rotation: 0,
    edgeFeathering: 2,
    outlineGlowWidth: 2,
    opacity: 1,
    strokeWidth: 2,
    dashPattern: 'dashed',
    blendMode: 'normal',
    zeroLumenSafety: true,
    invertCutout: true,
    safetyMargin: 4,
    blackoutShade: '#000000',
    archTag: 'Window',
    vertices: [
      { x: 23, y: 36 },
      { x: 33, y: 36 },
      { x: 33, y: 47 },
      { x: 23, y: 47 },
    ],
  },
  {
    id: 'starter-window-right',
    name: 'Right Parlor Window (Masked)',
    category: 'Windows',
    visible: true,
    locked: false,
    solo: false,
    role: 'Hard Blackout Cutout',
    color: palette.window,
    positionX: 68,
    positionY: 54,
    width: 12,
    height: 16,
    rotation: 0,
    edgeFeathering: 2,
    outlineGlowWidth: 2,
    opacity: 1,
    strokeWidth: 2,
    dashPattern: 'dashed',
    blendMode: 'normal',
    zeroLumenSafety: true,
    invertCutout: true,
    safetyMargin: 4,
    blackoutShade: '#000000',
    archTag: 'Window',
    vertices: [
      { x: 62, y: 46 },
      { x: 74, y: 46 },
      { x: 74, y: 62 },
      { x: 62, y: 62 },
    ],
  },
  {
    id: 'starter-pillar-entry',
    name: 'Front Entry Columns',
    category: 'Pillars',
    visible: true,
    locked: false,
    solo: false,
    role: 'Active Projection Surface',
    color: palette.pillar,
    positionX: 55,
    positionY: 64,
    width: 6,
    height: 32,
    rotation: 0,
    edgeFeathering: 3,
    outlineGlowWidth: 2,
    opacity: 0.95,
    strokeWidth: 2,
    dashPattern: 'solid',
    blendMode: 'normal',
    audioReactive: true,
    archTag: 'Pillar',
    vertices: [
      { x: 52, y: 48 },
      { x: 58, y: 48 },
      { x: 58, y: 82 },
      { x: 52, y: 82 },
    ],
  },
];

const buildBeatGrid = (
  prefix: string,
  bpm: number,
  count: number,
  colorA: string,
  colorB: string
): BeatFlag[] => {
  const secPerBeat = 60 / bpm;
  const flags: BeatFlag[] = [];
  for (let i = 0; i < count; i++) {
    const isDrop = i > 0 && i % 8 === 0;
    const isColorShift = i % 4 === 0 && !isDrop;
    flags.push({
      id: `${prefix}-beat-${i}`,
      timestampSec: Number((i * secPerBeat * 2).toFixed(2)),
      label: isDrop
        ? `Drop Accent #${i / 8}`
        : isColorShift
          ? `Palette Shift #${i / 4 + 1}`
          : `Beat Pulse ${i + 1}`,
      type: isDrop ? 'drop' : isColorShift ? 'color-shift' : 'beat',
      targetLayerId: isDrop ? 'all' : 'starter-roof-main',
      colorModifier: i % 2 === 0 ? colorA : colorB,
      intensity: isDrop ? 1.0 : isColorShift ? 0.85 : 0.65,
      isAutoGenerated: true,
    });
  }
  return flags;
};

export const STARTER_SHOW_PACKS: StarterShowPack[] = [
  {
    id: 'halloween_manor',
    title: 'Halloween Haunted Manor',
    subtitle: 'Spooky windows, lightning drops & pumpkin choir',
    holidayBadge: 'Halloween',
    emoji: '🎃',
    difficulty: 'Beginner Friendly',
    description:
      'Instant haunted house show with blackout window protection, eerie purple/orange facade washes, talking pumpkin garage feature, and beat-synced lightning flashes.',
    highlights: [
      '6 Pre-Traced Architectural Shapes',
      'Zero-Lumen Window Blackouts',
      'Haunted Video + Audio Included',
      '16 Beat & Lightning Drop Cues',
    ],
    accentColor: '#f97316',
    previewGradient: 'from-orange-600/30 via-purple-900/40 to-slate-950',
    recommendedBpm: 118,
    referenceImageUrl: AUSTIN_HOUSE_ASSETS.photos.v1EctoOpenGarage,
    layers: createHousePolygonLayers({
      roof: '#f97316',
      wall: '#9333ea',
      garage: '#22c55e',
      window: '#06b6d4',
      pillar: '#eab308',
    }),
    playlistClips: [
      {
        id: 'pack-halloween-1',
        index: 1,
        title: 'Haunted Firehouse Entrance',
        durationSec: 45,
        durationFormatted: '0:45',
        status: 'Active',
        alignmentMode: 'GLOBAL SYNCED',
        themeStyle: 'spooky',
        prompt:
          'Haunted Victorian brick manor with glowing jack-o-lanterns and spectral green mist',
        seed: 1031,
        deltaOffset: { ...DEFAULT_DELTA },
        bypassOffset: false,
        videoUrl: AUSTIN_HOUSE_ASSETS.videos.mainShow,
        thumbnailUrl: AUSTIN_HOUSE_ASSETS.photos.v1EctoOpenGarage,
        audioUrl: AUSTIN_HOUSE_ASSETS.audio.midnightManor,
      },
      {
        id: 'pack-halloween-2',
        index: 2,
        title: 'Singing Pumpkin Patch Finale',
        durationSec: 42,
        durationFormatted: '0:42',
        status: 'Up Next',
        alignmentMode: 'GLOBAL SYNCED',
        themeStyle: 'spooky',
        prompt: 'Animated singing pumpkins on garage canvas with purple lightning storm',
        seed: 1032,
        deltaOffset: { ...DEFAULT_DELTA },
        bypassOffset: false,
        videoUrl: AUSTIN_HOUSE_ASSETS.videos.pumpkins,
        thumbnailUrl: AUSTIN_HOUSE_ASSETS.photos.v4SlimerBreach,
        audioUrl: AUSTIN_HOUSE_ASSETS.audio.pumpkinsToGhostbusters,
      },
    ],
    beatFlags: buildBeatGrid('halloween', 118, 16, '#f97316', '#9333ea'),
  },
  {
    id: 'christmas_wonderland',
    title: 'Christmas Wonderland',
    subtitle: 'C9 roof bulbs, snow shimmer & warm hearth glow',
    holidayBadge: 'Christmas',
    emoji: '🎄',
    difficulty: 'Beginner Friendly',
    description:
      'Classic red, emerald, and warm-white holiday showcase. Maps marquee bulbs to your roofline, frosty cyan shimmer to walls, and cozy firelight framing.',
    highlights: [
      '6 Pre-Traced Holiday Zones',
      'Red / Emerald / Warm-White Palette',
      'Auto-Balanced Window Masks',
      '16 Festive Downbeat Cues',
    ],
    accentColor: '#10b981',
    previewGradient: 'from-emerald-600/30 via-red-900/35 to-slate-950',
    recommendedBpm: 124,
    referenceImageUrl: AUSTIN_HOUSE_ASSETS.photos.v3ClosedLogoGarage,
    layers: createHousePolygonLayers({
      roof: '#ef4444',
      wall: '#10b981',
      garage: '#f59e0b',
      window: '#38bdf8',
      pillar: '#f8fafc',
    }),
    playlistClips: [
      {
        id: 'pack-xmas-1',
        index: 1,
        title: 'Winter Frost & C9 Chase',
        durationSec: 60,
        durationFormatted: '1:00',
        status: 'Active',
        alignmentMode: 'GLOBAL SYNCED',
        themeStyle: 'ice',
        prompt:
          'Classic Christmas gingerbread house with falling snow, glowing warm windows, and candy cane pillars',
        seed: 1225,
        deltaOffset: { ...DEFAULT_DELTA },
        bypassOffset: false,
        videoUrl: AUSTIN_HOUSE_ASSETS.videos.v1Show,
        thumbnailUrl: AUSTIN_HOUSE_ASSETS.photos.v3ClosedLogoGarage,
        audioUrl: AUSTIN_HOUSE_ASSETS.audio.hitTheMusicMaestro,
      },
      {
        id: 'pack-xmas-2',
        index: 2,
        title: 'North Pole Workshop Finale',
        durationSec: 50,
        durationFormatted: '0:50',
        status: 'Up Next',
        alignmentMode: 'GLOBAL SYNCED',
        themeStyle: 'victorian',
        prompt: 'Festive golden starlight cascade and twinkling Christmas ornaments across facade',
        seed: 1226,
        deltaOffset: { ...DEFAULT_DELTA },
        bypassOffset: false,
        videoUrl: AUSTIN_HOUSE_ASSETS.videos.v2Show,
        thumbnailUrl: AUSTIN_HOUSE_ASSETS.photos.v2FirehouseTower,
        audioUrl: AUSTIN_HOUSE_ASSETS.audio.stageFrightBoogie,
      },
    ],
    beatFlags: buildBeatGrid('xmas', 124, 16, '#ef4444', '#10b981'),
  },
  {
    id: 'nye_countdown',
    title: "New Year's Eve Countdown",
    subtitle: 'Gold fireworks, midnight clock & champagne confetti',
    holidayBadge: "New Year's",
    emoji: '🎆',
    difficulty: 'Beginner Friendly',
    description:
      'High-impact gold and electric cyan celebration show designed for garage countdowns, synchronized pyrotechnic bursts, and celebratory beat drops.',
    highlights: [
      'Gold & Electric Cyan Palette',
      'Garage Countdown Feature Zone',
      'High-Energy Drop Strobe Markers',
      'Ready for Fullscreen Output',
    ],
    accentColor: '#eab308',
    previewGradient: 'from-amber-500/30 via-cyan-900/35 to-slate-950',
    recommendedBpm: 128,
    referenceImageUrl: AUSTIN_HOUSE_ASSETS.photos.v2FirehouseTower,
    layers: createHousePolygonLayers({
      roof: '#eab308',
      wall: '#0ea5e9',
      garage: '#f43f5e',
      window: '#a855f7',
      pillar: '#fde047',
    }),
    playlistClips: [
      {
        id: 'pack-nye-1',
        index: 1,
        title: 'Midnight Pyrotechnics & Confetti',
        durationSec: 55,
        durationFormatted: '0:55',
        status: 'Active',
        alignmentMode: 'GLOBAL SYNCED',
        themeStyle: 'laser',
        prompt:
          'Golden fireworks exploding across architectural columns with electric cyan laser sweeps',
        seed: 2027,
        deltaOffset: { ...DEFAULT_DELTA },
        bypassOffset: false,
        videoUrl: AUSTIN_HOUSE_ASSETS.videos.extendedFinale,
        thumbnailUrl: AUSTIN_HOUSE_ASSETS.photos.v2FirehouseTower,
        audioUrl: AUSTIN_HOUSE_ASSETS.audio.alleywayChase,
      },
    ],
    beatFlags: buildBeatGrid('nye', 128, 16, '#eab308', '#06b6d4'),
  },
  {
    id: 'edm_party',
    title: 'Living Room EDM Party',
    subtitle: 'Indoor wall laser beams, neon synth & mic beat sync',
    holidayBadge: 'Indoor / Party',
    emoji: '🎸',
    difficulty: 'Beginner Friendly',
    description:
      'No outdoor house needed! Built specifically to test on a blank bedroom or living room wall tonight with neon cyberpunk colors and punchy beat triggers.',
    highlights: [
      'Great for Indoor Blank Walls',
      'Neon Magenta & Cyan Laser Look',
      'Audio-Reactive Layer Toggles On',
      '128 BPM High-Impact Drops',
    ],
    accentColor: '#ec4899',
    previewGradient: 'from-fuchsia-600/35 via-indigo-900/40 to-slate-950',
    recommendedBpm: 132,
    referenceImageUrl: AUSTIN_HOUSE_ASSETS.wireframeLayout,
    layers: createHousePolygonLayers({
      roof: '#ec4899',
      wall: '#6366f1',
      garage: '#06b6d4',
      window: '#22d3ee',
      pillar: '#f43f5e',
    }),
    playlistClips: [
      {
        id: 'pack-edm-1',
        index: 1,
        title: 'Cyberpunk Laser Grid Loop',
        durationSec: 38,
        durationFormatted: '0:38',
        status: 'Active',
        alignmentMode: 'GLOBAL SYNCED',
        themeStyle: 'laser',
        prompt:
          'Neon synthwave wireframe laser pulses reactive to electronic bass drops',
        seed: 8080,
        deltaOffset: { ...DEFAULT_DELTA },
        bypassOffset: false,
        videoUrl: AUSTIN_HOUSE_ASSETS.videos.sampleTestClip,
        thumbnailUrl: AUSTIN_HOUSE_ASSETS.wireframeLayout,
        audioUrl: AUSTIN_HOUSE_ASSETS.audio.emeraldFurnace,
      },
    ],
    beatFlags: buildBeatGrid('edm', 132, 16, '#ec4899', '#06b6d4'),
  },
];

export function loadStarterShowPack(packId: StarterPackId): StarterShowPack | null {
  const pack = STARTER_SHOW_PACKS.find((p) => p.id === packId);
  if (!pack) return null;

  const store = useProjectionStore.getState();

  useProjectionStore.setState({
    activeProjectName: `${pack.title} (Starter)`,
    customReferencePhotoUrl: pack.referenceImageUrl,
    layers: pack.layers.map((l) => ({
      ...l,
      vertices: l.vertices.map((v) => ({ ...v })),
    })),
    selectedLayerId: pack.layers[0]?.id ?? null,
    playlistClips: pack.playlistClips.map((c) => ({ ...c })),
    beatFlags: pack.beatFlags.map((f) => ({ ...f })),
    projectorTestPattern: false,
    masterBlackout: false,
    projectStateBadge: 'Unsaved',
  });

  if (pack.playlistClips[0] && typeof store.activatePlaylistClip === 'function') {
    store.activatePlaylistClip(pack.playlistClips[0].id);
  }
  if (typeof store.showToast === 'function') {
    store.showToast(
      `Loaded "${pack.title}" (${pack.layers.length} shapes, ${pack.beatFlags.length} beat cues)!`
    );
  }

  return pack;
}
