/**
 * phonemeLipSyncEngine.ts
 * AI Singing Faces, Formant Frequency Audio Viseme Detection,
 * and Preston Blair 10-Mouth Character Rig Puppeteer.
 * Part of Lumen-Map AI Master Expansion Suite (Features #25, #36)
 */

export type VisemeType =
  | 'Rest' // Closed relaxed mouth
  | 'AI' // Wide open 'Ah', 'Eye'
  | 'E' // Wide stretched 'Ee', 'Eh'
  | 'O' // Round open 'Oh'
  | 'U' // Small circle 'Oo', 'You'
  | 'MBP' // Pressed lips 'M', 'B', 'P'
  | 'FV' // Bottom lip tucked under teeth 'F', 'V'
  | 'L' // Tongue to upper teeth 'L', 'Th'
  | 'WQ' // Tight pursed lips 'W', 'Q'
  | 'Smile'; // Broad smile grin

export type PrestonBlairViseme = VisemeType;
export const PRESTON_BLAIR_VISEMES: VisemeType[] = [
  'Rest',
  'AI',
  'E',
  'O',
  'U',
  'MBP',
  'FV',
  'L',
  'WQ',
  'Smile',
];
export const classifyVisemeFromFrequency = classifyAudioToViseme;

export interface CharacterPuppetState {
  viseme: VisemeType;
  jawOpenness: number; // 0.0 - 1.0
  mouthWidth: number; // 0.5 - 1.5
  eyeBlinkProgress: number; // 0 = open, 1 = fully closed
  headBobY: number; // -10px to +10px
  headTiltDeg: number; // -12deg to +12deg
  eyebrowRaise: number; // -1.0 (angry) to +1.0 (surprised)
}

export interface CharacterPreset {
  id: string;
  name: string;
  category: 'Halloween' | 'Christmas' | 'Sci-Fi' | 'General';
  primaryColor: string;
  secondaryColor: string;
  defaultMouthType: 'pumpkin-carved' | 'organic-lips' | 'skull-teeth' | 'neon-matrix';
}

export const CHARACTER_PRESETS: CharacterPreset[] = [
  {
    id: 'pumpkin-center',
    name: 'Gourd Singer (Center)',
    category: 'Halloween',
    primaryColor: '#f97316',
    secondaryColor: '#facc15',
    defaultMouthType: 'pumpkin-carved',
  },
  {
    id: 'pumpkin-left-tenor',
    name: 'Slim Pumpkin (Tenor)',
    category: 'Halloween',
    primaryColor: '#ea580c',
    secondaryColor: '#fde047',
    defaultMouthType: 'pumpkin-carved',
  },
  {
    id: 'pumpkin-right-baritone',
    name: 'Round Gourd (Baritone)',
    category: 'Halloween',
    primaryColor: '#c2410c',
    secondaryColor: '#fef08a',
    defaultMouthType: 'pumpkin-carved',
  },
  {
    id: 'skull-necromancer',
    name: 'Talking Crypt Skull',
    category: 'Halloween',
    primaryColor: '#e2e8f0',
    secondaryColor: '#38bdf8',
    defaultMouthType: 'skull-teeth',
  },
  {
    id: 'santa-claus',
    name: 'Jolly Singing Santa',
    category: 'Christmas',
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff',
    defaultMouthType: 'organic-lips',
  },
  {
    id: 'snowman-frosty',
    name: 'Top-Hat Snowman',
    category: 'Christmas',
    primaryColor: '#f8fafc',
    secondaryColor: '#0ea5e9',
    defaultMouthType: 'pumpkin-carved',
  },
];

/**
 * Classifies the active Viseme from audio frequency bands and energy level.
 * Uses Formant 1 (300-900 Hz) and Formant 2 (900-2800 Hz) acoustic analysis.
 */
export function classifyAudioToViseme(
  rmsVolume: number,
  lowMidFreq: number, // ~300 - 800 Hz
  highMidFreq: number // ~800 - 2500 Hz
): VisemeType {
  // If volume is below speaking gate threshold, mouth stays closed at Rest
  if (rmsVolume < 0.04) {
    return 'Rest';
  }

  const ratio = highMidFreq / Math.max(0.01, lowMidFreq);

  if (rmsVolume > 0.45) {
    // High volume peak
    if (ratio > 1.3) return 'AI'; // Loud 'Ah' / 'Aye'
    return 'O'; // Loud 'Oh'
  }

  // Vowel Formant differentiation
  if (ratio > 1.6) {
    return 'E'; // High F2 formant: 'Ee', 'Eh'
  } else if (ratio < 0.6) {
    return 'U'; // Low F2 formant: 'Oo', 'U'
  } else if (lowMidFreq > 0.35 && highMidFreq < 0.25) {
    return 'O'; // Deep resonance
  } else if (rmsVolume < 0.12 && ratio < 0.9) {
    return 'MBP'; // M / B / P closure
  } else if (ratio >= 0.9 && ratio <= 1.3) {
    return 'AI'; // Moderate vowel
  }

  return 'Rest';
}

/**
 * Generates an SVG `<path>` `d` attribute for any Preston Blair viseme.
 * Scales inside standard normalized mouth box: [cx=100, cy=100, w=120, h=80]
 */
export function getProceduralMouthSvgPath(
  viseme: VisemeType,
  jawOpenness: number = 0.5,
  mouthType: CharacterPreset['defaultMouthType'] = 'pumpkin-carved'
): string {
  const openH = Math.max(6, Math.round(jawOpenness * 35));

  if (mouthType === 'pumpkin-carved') {
    switch (viseme) {
      case 'AI':
        return `M 60,95 Q 100,${70 - openH / 2} 140,95 Q 100,${110 + openH} 60,95 Z`;
      case 'O':
        return `M 75,90 Q 100,${75 - openH / 2} 125,90 Q 140,105 125,${115 + openH} Q 100,${120 + openH} 75,${115 + openH} Q 60,105 75,90 Z`;
      case 'E':
        return `M 50,98 Q 100,85 150,98 Q 100,${106 + openH / 2} 50,98 Z`;
      case 'U':
      case 'WQ':
        return `M 85,95 Q 100,${85 - openH / 3} 115,95 Q 115,${110 + openH} 85,${110 + openH} Z`;
      case 'FV':
        return `M 65,96 Q 100,90 135,96 Q 100,108 65,96 M 75,98 L 78,103 L 85,98 L 92,103 L 100,98`;
      case 'MBP':
        return `M 65,100 Q 100,98 135,100 Q 100,104 65,100 Z`;
      case 'Smile':
        return `M 55,90 Q 100,120 145,90 Q 100,108 55,90 Z`;
      case 'Rest':
      default:
        return `M 70,100 Q 100,98 130,100 Q 100,103 70,100 Z`;
    }
  }

  // Organic smooth lips
  switch (viseme) {
    case 'AI':
      return `M 60,95 C 75,${70 - openH} 125,${70 - openH} 140,95 C 125,${120 + openH} 75,${120 + openH} 60,95 Z`;
    case 'O':
      return `M 75,95 C 75,${75 - openH} 125,${75 - openH} 125,95 C 125,${115 + openH} 75,${115 + openH} 75,95 Z`;
    case 'E':
      return `M 50,98 C 75,90 125,90 150,98 C 125,108 75,108 50,98 Z`;
    case 'Rest':
    default:
      return `M 65,100 Q 100,97 135,100 Q 100,103 65,100 Z`;
  }
}

/**
 * Returns a complete SVG string representing a procedural viseme mouth
 */
export function generateProceduralVisemeSvg(
  viseme: string,
  jawOpenness: number = 0.5,
  emotion: string = 'happy'
): string {
  const pathD = getProceduralMouthSvgPath(
    (viseme as VisemeType) || 'Rest',
    jawOpenness,
    'pumpkin-carved'
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 160" width="100%" height="100%">
    <path d="${pathD}" fill="#fbbf24" stroke="#f59e0b" stroke-width="3" />
  </svg>`;
}
