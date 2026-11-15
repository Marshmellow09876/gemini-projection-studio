import React from 'react';
import { PurityColor, TestPatternType } from '../store/useProjectionStore';

interface ProjectorTestPatternRendererProps {
  patternType?: TestPatternType;
  purityColor?: PurityColor;
  viewBox?: string;
  className?: string;
}

const PURITY_HEX_MAP: Record<PurityColor, { hex: string; label: string; textDark?: boolean }> = {
  white: { hex: '#FFFFFF', label: '6500K PURE WHITE (D65)', textDark: true },
  red: { hex: '#FF0000', label: '100% PURE RED FIELD (REC.709)', textDark: false },
  green: { hex: '#00FF00', label: '100% PURE GREEN FIELD (REC.709)', textDark: true },
  blue: { hex: '#0000FF', label: '100% PURE BLUE FIELD (REC.709)', textDark: false },
  cyan: { hex: '#00FFFF', label: '100% CYAN FIELD', textDark: true },
  magenta: { hex: '#FF00FF', label: '100% MAGENTA FIELD', textDark: true },
  yellow: { hex: '#FFFF00', label: '100% YELLOW FIELD', textDark: true },
};

/**
 * High-fidelity SVG Projector Calibration & Test Pattern Generator.
 * Supports SMPTE Color Bars, Siemens Star Focus Target, Concentric Geometry Circles,
 * 16-Step Greyscale Dynamic Range Ramp, RGB/White Color Purity, and Sub-Pixel Alignment Grid.
 */
export const ProjectorTestPatternRenderer: React.FC<ProjectorTestPatternRendererProps> = ({
  patternType = 'grid',
  purityColor = 'white',
  viewBox = '0 0 1920 1080',
  className = 'w-full h-full object-contain',
}) => {
  // 1. Grid Pattern
  if (patternType === 'grid') {
    return (
      <svg viewBox={viewBox} className={className} aria-label="SMPTE Alignment Grid Pattern">
        <defs>
          <pattern id="tpGrid50" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#0284c7" strokeWidth="1" strokeOpacity="0.4" />
          </pattern>
          <pattern id="tpGrid100" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" fill="url(#tpGrid50)" />
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#38bdf8" strokeWidth="1.8" strokeOpacity="0.75" />
          </pattern>
        </defs>

        {/* Background Grid */}
        <rect width="1920" height="1080" fill="#040813" />
        <rect width="1920" height="1080" fill="url(#tpGrid100)" />

        {/* Outer Boundary Green Safe-Line */}
        <rect x="4" y="4" width="1912" height="1072" fill="none" stroke="#22c55e" strokeWidth="4" />
        <rect x="96" y="54" width="1728" height="972" fill="none" stroke="#eab308" strokeWidth="2" strokeDasharray="8,6" opacity="0.7" />

        {/* Center Crosshairs */}
        <line x1="960" y1="0" x2="960" y2="1080" stroke="#f43f5e" strokeWidth="2.5" />
        <line x1="0" y1="540" x2="1920" y2="540" stroke="#f43f5e" strokeWidth="2.5" />
        <circle cx="960" cy="540" r="140" fill="none" stroke="#38bdf8" strokeWidth="3" />
        <circle cx="960" cy="540" r="280" fill="none" stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="6,4" />

        {/* Diagonal Corner-to-Corner Calibration Lines */}
        <line x1="0" y1="0" x2="1920" y2="1080" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.5" />
        <line x1="1920" y1="0" x2="0" y2="1080" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.5" />

        {/* HUD Info Badges */}
        <rect x="830" y="525" width="260" height="30" rx="4" fill="rgba(15,23,42,0.9)" stroke="#38bdf8" strokeWidth="1.5" />
        <text x="960" y="545" fill="#38bdf8" fontSize="13" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
          CENTER: 960 x 540 [16:9]
        </text>

        <rect x="40" y="24" width="340" height="26" rx="4" fill="rgba(15,23,42,0.85)" />
        <text x="50" y="42" fill="#22c55e" fontSize="12" fontFamily="monospace" fontWeight="bold">
          ● CALIBRATION GRID: 1920 x 1080 @ 60Hz
        </text>
      </svg>
    );
  }

  // 2. SMPTE Color Bars
  if (patternType === 'smpte-bars') {
    const topBars = [
      { color: '#BFBFBF', name: '75% White' },
      { color: '#BFBF00', name: 'Yellow' },
      { color: '#00BFBF', name: 'Cyan' },
      { color: '#00BF00', name: 'Green' },
      { color: '#BF00BF', name: 'Magenta' },
      { color: '#BF0000', name: 'Red' },
      { color: '#0000BF', name: 'Blue' },
    ];
    const topBarWidth = 1920 / 7;
    const topBarHeight = 1080 * 0.67;

    const midBars = [
      { color: '#0000BF' },
      { color: '#131313' },
      { color: '#BF00BF' },
      { color: '#131313' },
      { color: '#00BFBF' },
      { color: '#131313' },
      { color: '#BFBFBF' },
    ];
    const midBarHeight = 1080 * 0.08;

    return (
      <svg viewBox={viewBox} className={className} aria-label="SMPTE Standard Color Bars">
        {/* Top 67%: 7 Primary Color Bars */}
        {topBars.map((bar, i) => (
          <rect
            key={`top-${i}`}
            x={i * topBarWidth}
            y={0}
            width={topBarWidth + 0.5}
            height={topBarHeight}
            fill={bar.color}
          />
        ))}

        {/* Middle 8%: Castellation Bars */}
        {midBars.map((bar, i) => (
          <rect
            key={`mid-${i}`}
            x={i * topBarWidth}
            y={topBarHeight}
            width={topBarWidth + 0.5}
            height={midBarHeight}
            fill={bar.color}
          />
        ))}

        {/* Bottom 25%: PLUGE, Reference White & Sub-Black Signals */}
        {/* Navy -I Pulse */}
        <rect x={0} y={topBarHeight + midBarHeight} width={topBarWidth * 1.25} height={1080 - (topBarHeight + midBarHeight)} fill="#00214C" />
        {/* 100% Peak White Reference */}
        <rect x={topBarWidth * 1.25} y={topBarHeight + midBarHeight} width={topBarWidth * 1.25} height={1080 - (topBarHeight + midBarHeight)} fill="#FFFFFF" />
        {/* Purple +Q Pulse */}
        <rect x={topBarWidth * 2.5} y={topBarHeight + midBarHeight} width={topBarWidth * 1.25} height={1080 - (topBarHeight + midBarHeight)} fill="#32006A" />
        {/* Black Level Block */}
        <rect x={topBarWidth * 3.75} y={topBarHeight + midBarHeight} width={topBarWidth * 1.5} height={1080 - (topBarHeight + midBarHeight)} fill="#131313" />

        {/* PLUGE Alignment Cell (-2% Superblack, 0% Black, +2% Black, +4% Above-Black) */}
        <g transform={`translate(${topBarWidth * 5.25}, ${topBarHeight + midBarHeight})`}>
          <rect x={0} y={0} width={topBarWidth * 1.75} height={1080 - (topBarHeight + midBarHeight)} fill="#131313" />
          {/* -2% IRE (Superblack) */}
          <rect x={30} y={0} width={45} height={1080 - (topBarHeight + midBarHeight)} fill="#080808" />
          {/* +2% IRE */}
          <rect x={120} y={0} width={45} height={1080 - (topBarHeight + midBarHeight)} fill="#1C1C1C" />
          {/* +4% IRE */}
          <rect x={210} y={0} width={45} height={1080 - (topBarHeight + midBarHeight)} fill="#282828" />
        </g>

        {/* Outer Frame Border & Spec Labels */}
        <rect x="0" y="0" width="1920" height="1080" fill="none" stroke="#22c55e" strokeWidth="4" />
        <rect x="20" y="1030" width="460" height="34" rx="4" fill="rgba(0,0,0,0.85)" stroke="#38bdf8" strokeWidth="1" />
        <text x="35" y="1053" fill="#38bdf8" fontSize="13" fontFamily="monospace" fontWeight="bold">
          SMPTE RP 219:2002 HIGH DEFINITION COLOR BARS
        </text>
      </svg>
    );
  }

  // 3. Siemens Star Optical Focus Target
  if (patternType === 'focus-star') {
    const spokesCount = 36;
    const cx = 960;
    const cy = 540;
    const radius = 320;
    const spokes = [];

    for (let i = 0; i < spokesCount; i++) {
      const angle1 = (i * 2 * Math.PI) / spokesCount;
      const angle2 = ((i + 0.5) * 2 * Math.PI) / spokesCount;
      const x1 = cx + radius * Math.cos(angle1);
      const y1 = cy + radius * Math.sin(angle1);
      const x2 = cx + radius * Math.cos(angle2);
      const y2 = cy + radius * Math.sin(angle2);
      spokes.push(`M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`);
    }

    return (
      <svg viewBox={viewBox} className={className} aria-label="Siemens Star Focus Target">
        <rect width="1920" height="1080" fill="#000000" />

        {/* Radial Spokes */}
        <circle cx={cx} cy={cy} r={radius} fill="#FFFFFF" />
        {spokes.map((d, i) => (
          <path key={`spoke-${i}`} d={d} fill="#000000" />
        ))}
        <circle cx={cx} cy={cy} r={8} fill="#f43f5e" />

        {/* Concentric Measurement Rings */}
        {[80, 160, 240, 320, 420, 520].map((r) => (
          <circle key={`ring-${r}`} cx={cx} cy={cy} r={r} fill="none" stroke="#38bdf8" strokeWidth={r === 320 ? 3 : 1} strokeDasharray={r > 320 ? '6,6' : undefined} />
        ))}

        {/* 4 Corner 1-Pixel Checkerboards for Edge Focus Inspection */}
        {[
          { x: 40, y: 40 },
          { x: 1720, y: 40 },
          { x: 40, y: 880 },
          { x: 1720, y: 880 },
        ].map((pos, idx) => (
          <g key={`corner-chk-${idx}`} transform={`translate(${pos.x}, ${pos.y})`}>
            <rect width="160" height="160" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
            {Array.from({ length: 8 }).map((_, r) =>
              Array.from({ length: 8 }).map((_, c) => (
                <rect
                  key={`cell-${r}-${c}`}
                  x={c * 20}
                  y={r * 20}
                  width="20"
                  height="20"
                  fill={(r + c) % 2 === 0 ? '#FFFFFF' : '#000000'}
                />
              ))
            )}
            <text x="80" y="150" fill="#eab308" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              CORNER {idx + 1}
            </text>
          </g>
        ))}

        {/* Center Reticle Crosshairs */}
        <line x1={cx - 450} y1={cy} x2={cx + 450} y2={cy} stroke="#22c55e" strokeWidth="1.5" />
        <line x1={cx} y1={cy - 450} x2={cx} y2={cy + 450} stroke="#22c55e" strokeWidth="1.5" />

        {/* HUD Info */}
        <rect x="710" y="30" width="500" height="34" rx="4" fill="rgba(15,23,42,0.9)" stroke="#38bdf8" strokeWidth="1.5" />
        <text x="960" y="52" fill="#38bdf8" fontSize="13" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
          OPTICAL FOCUS &amp; ASTIGMATISM TARGET (SIEMENS STAR)
        </text>
      </svg>
    );
  }

  // 4. Concentric Geometry & Keystone Distortion Circles
  if (patternType === 'geometry-circles') {
    return (
      <svg viewBox={viewBox} className={className} aria-label="Geometric Lens & Keystone Alignment">
        <rect width="1920" height="1080" fill="#030712" />

        {/* Diagonal Corner Cross Lines */}
        <line x1="0" y1="0" x2="1920" y2="1080" stroke="#0284c7" strokeWidth="1.5" />
        <line x1="1920" y1="0" x2="0" y2="1080" stroke="#0284c7" strokeWidth="1.5" />

        {/* Center Master Alignment Circles (5 Concentric Rims) */}
        {[100, 200, 300, 400, 500].map((r) => (
          <circle key={`geom-c-${r}`} cx="960" cy="540" r={r} fill="none" stroke={r === 500 ? '#22c55e' : '#38bdf8'} strokeWidth={r === 500 ? 3 : 1.5} />
        ))}

        {/* 4 Outer Corner Circles */}
        {[
          { cx: 240, cy: 180 },
          { cx: 1680, cy: 180 },
          { cx: 240, cy: 900 },
          { cx: 1680, cy: 900 },
        ].map((pt, idx) => (
          <g key={`corner-circ-${idx}`}>
            <circle cx={pt.cx} cy={pt.cy} r="120" fill="none" stroke="#eab308" strokeWidth="2" />
            <circle cx={pt.cx} cy={pt.cy} r="60" fill="none" stroke="#eab308" strokeWidth="1" strokeDasharray="4,4" />
            <line x1={pt.cx - 130} y1={pt.cy} x2={pt.cx + 130} y2={pt.cy} stroke="#eab308" strokeWidth="1" />
            <line x1={pt.cx} y1={pt.cy - 130} x2={pt.cx} y2={pt.cy + 130} stroke="#eab308" strokeWidth="1" />
          </g>
        ))}

        {/* Aspect Ratio Safe Boxes */}
        {/* 16:9 Active Safe Frame */}
        <rect x="40" y="40" width="1840" height="1000" fill="none" stroke="#38bdf8" strokeWidth="2" />
        {/* 4:3 Centered Pillar Frame */}
        <rect x="240" y="40" width="1440" height="1000" fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="8,6" />

        {/* Center Crosshairs */}
        <line x1="960" y1="40" x2="960" y2="1040" stroke="#22c55e" strokeWidth="2" />
        <line x1="40" y1="540" x2="1880" y2="540" stroke="#22c55e" strokeWidth="2" />

        {/* Diamond Alignment Cage */}
        <polygon points="960,40 1880,540 960,1040 40,540" fill="none" stroke="#0ea5e9" strokeWidth="1" strokeDasharray="5,5" opacity="0.65" />

        {/* Labels */}
        <rect x="730" y="525" width="460" height="30" rx="4" fill="rgba(15,23,42,0.92)" stroke="#22c55e" strokeWidth="1" />
        <text x="960" y="545" fill="#22c55e" fontSize="13" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
          KEYSTONE &amp; GEOMETRIC DISTORTION CALIBRATOR
        </text>
      </svg>
    );
  }

  // 5. 16-Step Dynamic Range Greyscale Ramp
  if (patternType === 'greyscale-ramp') {
    const steps = 16;
    const stepWidth = 1920 / steps;

    return (
      <svg viewBox={viewBox} className={className} aria-label="16-Step Dynamic Range Greyscale Ramp">
        <defs>
          <linearGradient id="smoothRamp" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#000000" />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>
          <linearGradient id="invSmoothRamp" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#000000" />
          </linearGradient>
        </defs>

        <rect width="1920" height="1080" fill="#000000" />

        {/* Top Section: 16 Discrete Greyscale Blocks (0% - 100% IRE) */}
        {Array.from({ length: steps }).map((_, i) => {
          const val = Math.round((i / (steps - 1)) * 255);
          const ire = Math.round((i / (steps - 1)) * 100);
          const hex = `rgb(${val},${val},${val})`;
          return (
            <g key={`step-${i}`}>
              <rect x={i * stepWidth} y={80} width={stepWidth + 0.5} height={420} fill={hex} stroke="#1e293b" strokeWidth="0.5" />
              <text
                x={i * stepWidth + stepWidth / 2}
                y={470}
                fill={val < 120 ? '#e2e8f0' : '#0f172a'}
                fontSize="12"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                {ire}%
              </text>
              <text
                x={i * stepWidth + stepWidth / 2}
                y={490}
                fill={val < 120 ? '#94a3b8' : '#334155'}
                fontSize="10"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Middle Section: Continuous Smooth Linear Gradient */}
        <rect x="0" y="540" width="1920" height="220" fill="url(#smoothRamp)" />
        <text x="960" y="655" fill="#f43f5e" fontSize="14" fontFamily="monospace" fontWeight="bold" textAnchor="middle" stroke="#000" strokeWidth="0.5">
          CONTINUOUS 0 - 255 LINEAR GAMMA RAMP (CHECK FOR BANDING)
        </text>

        {/* Bottom Section: Inverted Smooth Gradient */}
        <rect x="0" y="780" width="1920" height="200" fill="url(#invSmoothRamp)" />

        {/* Outer Boundary Frame */}
        <rect x="2" y="2" width="1916" height="1076" fill="none" stroke="#22c55e" strokeWidth="4" />

        {/* Header HUD */}
        <rect x="680" y="20" width="560" height="34" rx="4" fill="rgba(15,23,42,0.92)" stroke="#38bdf8" strokeWidth="1" />
        <text x="960" y="42" fill="#38bdf8" fontSize="13" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
          16-STEP DYNAMIC RANGE &amp; CONTRAST CLIPPING RAMP (0 - 100% IRE)
        </text>
      </svg>
    );
  }

  // 6. Full-Field RGB & White Color Purity Test (patternType === 'color-purity')
  const purity = PURITY_HEX_MAP[purityColor] || PURITY_HEX_MAP.white;
  const textColor = purity.textDark ? '#0f172a' : '#FFFFFF';

  return (
    <svg viewBox={viewBox} className={className} aria-label={`Color Purity Test: ${purity.label}`}>
      {/* Full-bleed Solid Field */}
      <rect width="1920" height="1080" fill={purity.hex} />

      {/* Subtle Calibration Reticle */}
      <rect x="10" y="10" width="1900" height="1060" fill="none" stroke={textColor} strokeWidth="2" opacity="0.35" />
      <circle cx="960" cy="540" r="100" fill="none" stroke={textColor} strokeWidth="1" opacity="0.35" />
      <line x1="940" y1="540" x2="980" y2="540" stroke={textColor} strokeWidth="1" opacity="0.5" />
      <line x1="960" y1="520" x2="960" y2="560" stroke={textColor} strokeWidth="1" opacity="0.5" />

      {/* Diagnostic Readout Badge */}
      <g transform="translate(60, 980)">
        <rect width="520" height="50" rx="6" fill={purity.textDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.85)'} />
        <text x="20" y="30" fill="#38bdf8" fontSize="14" fontFamily="monospace" fontWeight="bold">
          {purity.label}
        </text>
        <text x="430" y="30" fill="#e2e8f0" fontSize="13" fontFamily="monospace">
          HEX: {purity.hex}
        </text>
      </g>
    </svg>
  );
};
