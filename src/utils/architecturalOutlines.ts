/**
 * Architectural Façade Outline Generator for LUMEN-MAP AI
 * Generates projection-mapping-optimized SVG blueprints with high contrast
 * (pure white/cyan on pure black #000000) for camera calibration,
 * ControlNet lineart conditioning, and vector layer auto-extraction.
 */

export interface ArchitecturalStylePreset {
  id: string;
  name: string;
  category: string;
  description: string;
  defaultPrompt: string;
  accentColor: string;
}

export const ARCHITECTURAL_STYLE_PRESETS: ArchitecturalStylePreset[] = [
  {
    id: 'victorian',
    name: 'Austin Victorian Firehouse',
    category: 'Historic Commercial / Civic',
    description: 'High gabled roof pediment, brick bell tower, open arched garage bay, and symmetric upper sash windows',
    defaultPrompt: 'Victorian brick firehouse facade, ornamental parapet, high-pitched pediment, dual garage bay, arched entryway, projection mapping blueprint',
    accentColor: '#38bdf8',
  },
  {
    id: 'modern',
    name: 'Modernist Minimalist Villa',
    category: 'Contemporary Residential',
    description: 'Crisp horizontal rooflines, cantilevered upper volume, floor-to-ceiling panoramic glass, and recessed entry',
    defaultPrompt: 'Modern minimalist two-story residence, geometric cubic volumes, flat roofline, floor-to-ceiling structural glass, concrete facade wireframe',
    accentColor: '#a855f7',
  },
  {
    id: 'suburban',
    name: 'Suburban Two-Story Colonial',
    category: 'Traditional American',
    description: 'Dual triangular roof gables, double-wide garage door, covered front porch with columns, and shuttered windows',
    defaultPrompt: 'Suburban American two-story home, dual cross-gables, two-car garage, columned front porch, multi-pane sash windows, architectural CAD outline',
    accentColor: '#22c55e',
  },
  {
    id: 'ranch',
    name: 'Single-Story Mid-Century Ranch',
    category: 'Mid-Century Modern',
    description: 'Low-slope hip roofline, wide front picture bay window, brick chimney accent, and horizontal facade bands',
    defaultPrompt: 'Mid-century single-story ranch home facade, wide low hip roof, front picture bay window, brick chimney, horizontal lap siding lines',
    accentColor: '#f59e0b',
  },
  {
    id: 'gothic',
    name: 'Haunted Victorian Manor',
    category: 'Halloween Theme / Fantasy',
    description: 'Steep gothic turret tower, arched mullion windows, jagged dormer gables, and wrought-iron cresting',
    defaultPrompt: 'Haunted gothic victorian mansion facade, steep conical turret, pointed arch lancet windows, ragged cornices, eerie architectural blueprint',
    accentColor: '#ec4899',
  },
  {
    id: 'chalet',
    name: 'Holiday Alpine Chalet',
    category: 'Winter Holiday / Festive',
    description: 'Steep A-frame gable, decorative scalloped eaves, wooden balcony trim, and snow-cap roof ridges',
    defaultPrompt: 'Alpine winter chalet facade, steep pitched A-frame roof with snow trim, decorative vergeboards, wood beam balcony, holiday projection mapping',
    accentColor: '#3b82f6',
  },
];

/**
 * Builds a valid SVG data URI containing an architectural projection outline
 */
export function generateArchitecturalOutlineSvg(
  styleId: string,
  invertBlackout: boolean = true,
  includeMarkers: boolean = true
): string {
  const bg = invertBlackout ? '#000000' : '#0c1017';
  const strokeMain = '#ffffff';
  const strokeAccent = '#00f0ff';
  const strokeDim = '#64748b';

  // Coordinate viewBox: 0 0 1920 1080 (Standard 16:9 Mapping Standard)
  let elementsSvg = '';

  switch (styleId) {
    case 'victorian':
      elementsSvg = `
        <!-- Main Roof Gable & Cornice -->
        <polygon id="roof_gable" points="480,240 960,60 1440,240 1420,280 500,280" fill="none" stroke="${strokeMain}" stroke-width="4" />
        <line x1="960" y1="60" x2="960" y2="240" stroke="${strokeDim}" stroke-width="2" stroke-dasharray="6 6" />
        
        <!-- Decorative Upper Pediment / Crest -->
        <polygon id="pediment_crest" points="860,60 960,10 1060,60" fill="none" stroke="${strokeAccent}" stroke-width="3" />
        
        <!-- Firehouse Tower (Right Bay) -->
        <rect id="tower_roof" x="1340" y="80" width="160" height="160" fill="none" stroke="${strokeAccent}" stroke-width="3" />
        <polygon id="tower_spire" points="1340,80 1420,20 1500,80" fill="none" stroke="${strokeAccent}" stroke-width="4" />
        <circle id="tower_oculus" cx="1420" cy="140" r="30" fill="none" stroke="${strokeMain}" stroke-width="3" />
        
        <!-- Main Façade Walls -->
        <rect id="facade_walls" x="480" y="280" width="960" height="700" fill="none" stroke="${strokeMain}" stroke-width="5" />
        <line x1="480" y1="580" x2="1440" y2="580" stroke="${strokeDim}" stroke-width="2" stroke-dasharray="8 4" />
        
        <!-- Upper Floor Sash Windows (4 symmetrically spaced) -->
        <rect id="window_upper_1" x="540" y="340" width="140" height="200" rx="10" fill="none" stroke="${strokeAccent}" stroke-width="3.5" />
        <line x1="610" y1="340" x2="610" y2="540" stroke="${strokeAccent}" stroke-width="2" />
        <line x1="540" y1="440" x2="680" y2="440" stroke="${strokeAccent}" stroke-width="2" />
        
        <rect id="window_upper_2" x="740" y="340" width="140" height="200" rx="10" fill="none" stroke="${strokeAccent}" stroke-width="3.5" />
        <line x1="810" y1="340" x2="810" y2="540" stroke="${strokeAccent}" stroke-width="2" />
        <line x1="740" y1="440" x2="880" y2="440" stroke="${strokeAccent}" stroke-width="2" />
        
        <rect id="window_upper_3" x="1040" y="340" width="140" height="200" rx="10" fill="none" stroke="${strokeAccent}" stroke-width="3.5" />
        <line x1="1110" y1="340" x2="1110" y2="540" stroke="${strokeAccent}" stroke-width="2" />
        <line x1="1040" y1="440" x2="1180" y2="440" stroke="${strokeAccent}" stroke-width="2" />
        
        <rect id="window_upper_4" x="1240" y="340" width="140" height="200" rx="10" fill="none" stroke="${strokeAccent}" stroke-width="3.5" />
        <line x1="1310" y1="340" x2="1310" y2="540" stroke="${strokeAccent}" stroke-width="2" />
        <line x1="1240" y1="440" x2="1380" y2="440" stroke="${strokeAccent}" stroke-width="2" />
        
        <!-- Large Ground Floor Arched Garage Bay (Ecto-1 Bay) -->
        <path id="garage_arch" d="M 540,980 L 540,700 A 240,240 0 0 1 1020,700 L 1020,980 Z" fill="none" stroke="${strokeMain}" stroke-width="4.5" />
        <line x1="540" y1="780" x2="1020" y2="780" stroke="${strokeDim}" stroke-width="2" />
        <line x1="540" y1="880" x2="1020" y2="880" stroke="${strokeDim}" stroke-width="2" />
        
        <!-- Front Entryway Door -->
        <rect id="front_door" x="1120" y="660" width="180" height="320" rx="6" fill="none" stroke="${strokeAccent}" stroke-width="4" />
        <circle id="door_knob" cx="1270" cy="820" r="8" fill="${strokeAccent}" />
      `;
      break;

    case 'modern':
      elementsSvg = `
        <!-- Modern Cantilever Upper Story -->
        <rect id="upper_cantilever" x="380" y="160" width="1160" height="360" fill="none" stroke="${strokeMain}" stroke-width="5" />
        <line x1="380" y1="160" x2="1540" y2="160" stroke="${strokeAccent}" stroke-width="3" />
        
        <!-- Continuous Glass Ribbon (Upper Floor) -->
        <rect id="glass_ribbon" x="440" y="240" width="1040" height="200" fill="none" stroke="${strokeAccent}" stroke-width="3.5" />
        <line x1="700" y1="240" x2="700" y2="440" stroke="${strokeDim}" stroke-width="2" />
        <line x1="960" y1="240" x2="960" y2="440" stroke="${strokeDim}" stroke-width="2" />
        <line x1="1220" y1="240" x2="1220" y2="440" stroke="${strokeDim}" stroke-width="2" />
        
        <!-- Lower Floor Concrete & Wood Slat Volumes -->
        <rect id="lower_main_pod" x="480" y="520" width="960" height="460" fill="none" stroke="${strokeMain}" stroke-width="5" />
        
        <!-- Large Sliding Glass Patio Doors -->
        <rect id="lower_sliding_glass" x="540" y="580" width="480" height="380" fill="none" stroke="${strokeAccent}" stroke-width="4" />
        <line x1="780" y1="580" x2="780" y2="960" stroke="${strokeMain}" stroke-width="3" />
        
        <!-- Recessed Entrance Porch & Door -->
        <rect id="modern_entrance_recess" x="1100" y="580" width="280" height="380" fill="none" stroke="${strokeMain}" stroke-width="4" />
        <rect id="modern_front_door" x="1180" y="640" width="140" height="320" fill="none" stroke="${strokeAccent}" stroke-width="3.5" />
        
        <!-- Architectural Overhang Lines -->
        <line x1="300" y1="150" x2="1620" y2="150" stroke="${strokeAccent}" stroke-width="4" />
      `;
      break;

    case 'suburban':
      elementsSvg = `
        <!-- Main Gable (Left/Center) -->
        <polygon id="suburban_gable_left" points="360,340 760,100 1160,340" fill="none" stroke="${strokeMain}" stroke-width="5" />
        
        <!-- Secondary Cross Gable (Right) -->
        <polygon id="suburban_gable_right" points="1100,340 1360,180 1620,340" fill="none" stroke="${strokeMain}" stroke-width="4" />
        
        <!-- Facade Enclosure -->
        <rect id="suburban_facade" x="380" y="340" width="1220" height="640" fill="none" stroke="${strokeMain}" stroke-width="5" />
        <line x1="380" y1="620" x2="1600" y2="620" stroke="${strokeDim}" stroke-width="2" stroke-dasharray="10 5" />
        
        <!-- Double Two-Car Garage -->
        <rect id="garage_door_double" x="440" y="660" width="560" height="320" rx="8" fill="none" stroke="${strokeAccent}" stroke-width="4.5" />
        <line x1="720" y1="660" x2="720" y2="980" stroke="${strokeDim}" stroke-width="2.5" />
        <line x1="440" y1="760" x2="1000" y2="760" stroke="${strokeDim}" stroke-width="1.5" />
        <line x1="440" y1="860" x2="1000" y2="860" stroke="${strokeDim}" stroke-width="1.5" />
        
        <!-- Covered Front Porch -->
        <rect id="porch_roof" x="1060" y="580" width="480" height="40" fill="none" stroke="${strokeMain}" stroke-width="4" />
        <line x1="1120" y1="620" x2="1120" y2="980" stroke="${strokeMain}" stroke-width="4" />
        <line x1="1480" y1="620" x2="1480" y2="980" stroke="${strokeMain}" stroke-width="4" />
        
        <!-- Front Door -->
        <rect id="front_door_suburban" x="1220" y="680" width="140" height="300" rx="4" fill="none" stroke="${strokeAccent}" stroke-width="3.5" />
        
        <!-- Second Floor Windows -->
        <rect id="suburban_win_1" x="660" y="240" width="180" height="180" rx="6" fill="none" stroke="${strokeAccent}" stroke-width="3" />
        <line x1="750" y1="240" x2="750" y2="420" stroke="${strokeAccent}" stroke-width="2" />
        <line x1="660" y1="330" x2="840" y2="330" stroke="${strokeAccent}" stroke-width="2" />
        
        <rect id="suburban_win_2" x="1280" y="260" width="160" height="160" rx="6" fill="none" stroke="${strokeAccent}" stroke-width="3" />
        <line x1="1360" y1="260" x2="1360" y2="420" stroke="${strokeAccent}" stroke-width="2" />
        <line x1="1280" y1="340" x2="1440" y2="340" stroke="${strokeAccent}" stroke-width="2" />
      `;
      break;

    case 'gothic':
      elementsSvg = `
        <!-- High Peaked Gothic Roof with Cresting -->
        <polygon id="gothic_roof" points="400,320 840,40 1280,320" fill="none" stroke="${strokeMain}" stroke-width="5" />
        
        <!-- Left Spire / Turret -->
        <polygon id="gothic_spire" points="300,380 400,20 500,380" fill="none" stroke="${strokeAccent}" stroke-width="4" />
        <circle id="spire_finial" cx="400" cy="18" r="10" fill="${strokeAccent}" />
        <rect id="turret_tower" x="320" y="380" width="160" height="600" fill="none" stroke="${strokeMain}" stroke-width="4.5" />
        
        <!-- Pointed Lancet Turret Windows -->
        <path id="lancet_1" d="M 370,520 L 370,440 Q 400,400 430,440 L 430,520 Z" fill="none" stroke="${strokeAccent}" stroke-width="3" />
        <path id="lancet_2" d="M 370,680 L 370,600 Q 400,560 430,600 L 430,680 Z" fill="none" stroke="${strokeAccent}" stroke-width="3" />
        
        <!-- Main Haunted Facade -->
        <rect id="gothic_facade" x="480" y="320" width="940" height="660" fill="none" stroke="${strokeMain}" stroke-width="5" />
        
        <!-- Rose Window / Gothic Arch Centerpiece -->
        <circle id="gothic_rose_window" cx="840" cy="220" r="60" fill="none" stroke="${strokeAccent}" stroke-width="3.5" />
        <circle id="gothic_inner_rose" cx="840" cy="220" r="30" fill="none" stroke="${strokeMain}" stroke-width="2" />
        
        <!-- Double Arched Second Floor Windows -->
        <path id="gothic_win_arch1" d="M 600,500 L 600,400 Q 670,330 740,400 L 740,500 Z" fill="none" stroke="${strokeAccent}" stroke-width="3.5" />
        <path id="gothic_win_arch2" d="M 940,500 L 940,400 Q 1010,330 1080,400 L 1080,500 Z" fill="none" stroke="${strokeAccent}" stroke-width="3.5" />
        
        <!-- Massive Double Arched Entrance Doorway -->
        <path id="gothic_portal" d="M 720,980 L 720,680 Q 840,560 960,680 L 960,980 Z" fill="none" stroke="${strokeMain}" stroke-width="5" />
        <line x1="840" y1="640" x2="840" y2="980" stroke="${strokeAccent}" stroke-width="3" />
      `;
      break;

    case 'ranch':
    default:
      elementsSvg = `
        <!-- Broad Low-Slope Hip Roof -->
        <polygon id="ranch_roof" points="300,380 500,240 1420,240 1620,380" fill="none" stroke="${strokeMain}" stroke-width="5" />
        <line x1="500" y1="240" x2="300" y2="380" stroke="${strokeMain}" stroke-width="4" />
        <line x1="1420" y1="240" x2="1620" y2="380" stroke="${strokeMain}" stroke-width="4" />
        
        <!-- Chimney Accent -->
        <rect id="ranch_chimney" x="540" y="160" width="100" height="160" fill="none" stroke="${strokeAccent}" stroke-width="3.5" />
        
        <!-- Wide Single-Story Main Facade -->
        <rect id="ranch_facade" x="340" y="380" width="1240" height="580" fill="none" stroke="${strokeMain}" stroke-width="5" />
        
        <!-- Large Picture Bay Window -->
        <rect id="picture_window" x="420" y="480" width="460" height="320" rx="4" fill="none" stroke="${strokeAccent}" stroke-width="4" />
        <line x1="570" y1="480" x2="570" y2="800" stroke="${strokeAccent}" stroke-width="2.5" />
        <line x1="730" y1="480" x2="730" y2="800" stroke="${strokeAccent}" stroke-width="2.5" />
        
        <!-- Central Recessed Front Porch & Door -->
        <rect id="ranch_entry_porch" x="940" y="440" width="220" height="520" fill="none" stroke="${strokeMain}" stroke-width="3.5" />
        <rect id="ranch_front_door" x="980" y="520" width="140" height="440" fill="none" stroke="${strokeAccent}" stroke-width="3.5" />
        
        <!-- Attached Garage (Right Wing) -->
        <rect id="ranch_garage" x="1220" y="520" width="320" height="440" rx="6" fill="none" stroke="${strokeAccent}" stroke-width="4" />
        <line x1="1220" y1="620" x2="1540" y2="620" stroke="${strokeDim}" stroke-width="2" />
        <line x1="1220" y1="740" x2="1540" y2="740" stroke="${strokeDim}" stroke-width="2" />
        <line x1="1220" y1="860" x2="1540" y2="860" stroke="${strokeDim}" stroke-width="2" />
      `;
      break;
  }

  // Optional Projection Alignment Markers (Corner fiducials for optical calibration)
  let markersSvg = '';
  if (includeMarkers) {
    markersSvg = `
      <!-- Corner Optical Calibration Fiducials -->
      <g id="calibration_fiducials" stroke="${strokeAccent}" stroke-width="2">
        <!-- Top Left -->
        <circle cx="60" cy="60" r="30" fill="none" />
        <line x1="30" y1="60" x2="90" y2="60" />
        <line x1="60" y1="30" x2="60" y2="90" />
        
        <!-- Top Right -->
        <circle cx="1860" cy="60" r="30" fill="none" />
        <line x1="1830" y1="60" x2="1890" y2="60" />
        <line x1="1860" y1="30" x2="1860" y2="90" />
        
        <!-- Bottom Left -->
        <circle cx="60" cy="1020" r="30" fill="none" />
        <line x1="30" y1="1020" x2="90" y2="1020" />
        <line x1="60" y1="990" x2="60" y2="1050" />
        
        <!-- Bottom Right -->
        <circle cx="1860" cy="1020" r="30" fill="none" />
        <line x1="1830" y1="1020" x2="1890" y2="1020" />
        <line x1="1860" y1="990" x2="1860" y2="1050" />
        
        <!-- Center Origin Crosshair -->
        <circle cx="960" cy="540" r="20" fill="none" stroke-dasharray="4 4" />
        <line x1="930" y1="540" x2="990" y2="540" />
        <line x1="960" y1="510" x2="960" y2="570" />
      </g>
    `;
  }

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
    <rect width="1920" height="1080" fill="${bg}" />
    <!-- Architectural Grid Background -->
    <defs>
      <pattern id="arch_grid" width="80" height="80" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="80" y2="0" stroke="#182338" stroke-width="0.75" />
        <line x1="0" y1="0" x2="0" y2="80" stroke="#182338" stroke-width="0.75" />
      </pattern>
    </defs>
    <rect width="1920" height="1080" fill="url(#arch_grid)" opacity="0.4" />
    
    <!-- Architectural Outline Elements -->
    ${elementsSvg}
    
    <!-- Optical Calibration Overlay -->
    ${markersSvg}
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
}
