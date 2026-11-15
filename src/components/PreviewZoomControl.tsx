import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Minimize2, Move } from 'lucide-react';

export interface PreviewZoomControlProps {
  zoom: number;
  onChange: (nextZoom: number) => void;
  min?: number;
  max?: number;
  compact?: boolean;
  className?: string;
  label?: string;
  pan?: { x: number; y: number };
  onResetPan?: () => void;
}

/**
 * Computes an SVG viewBox that centers the base [0, 0, baseW, baseH] frame
 * and incorporates horizontal/vertical middle-mouse pan offsets (panX, panY),
 * revealing the outer overscan pasteboard when zoom < 100% (e.g. 67% = 150% view window).
 */
export function computeZoomViewBox(
  baseW: number,
  baseH: number,
  zoomPercent: number,
  panX: number = 0,
  panY: number = 0
) {
  const clampedZoom = Math.max(25, Math.min(250, zoomPercent || 100));
  const viewScale = 100 / clampedZoom;
  const vbW = Number((baseW * viewScale).toFixed(2));
  const vbH = Number((baseH * viewScale).toFixed(2));
  // Shift viewBox inversely to pan so content follows mouse cursor
  const vbX = Number(((baseW - vbW) / 2 - panX * viewScale).toFixed(2));
  const vbY = Number(((baseH - vbH) / 2 - panY * viewScale).toFixed(2));
  return {
    viewBox: `${vbX} ${vbY} ${vbW} ${vbH}`,
    vbX,
    vbY,
    vbW,
    vbH,
    cssScale: clampedZoom / 100,
  };
}

export interface UseMiddleClickPanOptions {
  initialPan?: { x: number; y: number };
}

/**
 * Hook enabling middle scroll wheel click (mouse button 1) and drag to pan
 * on all preview view windows and main Canvas SVG viewports.
 */
export function useMiddleClickPan(options?: UseMiddleClickPanOptions) {
  const [pan, setPan] = useState<{ x: number; y: number }>(
    options?.initialPan || { x: 0, y: 0 }
  );
  const [isPanning, setIsPanning] = useState(false);
  const isPanningRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0, clientX: 0, clientY: 0 });

  const resetPan = useCallback(() => {
    setPan({ x: 0, y: 0 });
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<any>) => {
      // Middle mouse button is e.button === 1
      if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
        isPanningRef.current = true;
        setIsPanning(true);
        startRef.current = {
          x: pan.x,
          y: pan.y,
          clientX: e.clientX,
          clientY: e.clientY,
        };
        try {
          (e.currentTarget as any)?.setPointerCapture?.(e.pointerId);
        } catch {}
        return true;
      }
      return false;
    },
    [pan.x, pan.y]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent<any>) => {
    if (isPanningRef.current) {
      e.preventDefault();
      const dx = e.clientX - startRef.current.clientX;
      const dy = e.clientY - startRef.current.clientY;
      setPan({
        x: Math.round(startRef.current.x + dx),
        y: Math.round(startRef.current.y + dy),
      });
      return true;
    }
    return false;
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<any>) => {
    if (isPanningRef.current) {
      e.preventDefault();
      isPanningRef.current = false;
      setIsPanning(false);
      try {
        (e.currentTarget as any)?.releasePointerCapture?.(e.pointerId);
      } catch {}
      return true;
    }
    return false;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<any>) => {
    if (e.button === 1) {
      // Prevent browser default autoscroll wheel icon
      e.preventDefault();
    }
  }, []);

  // Global window release failsafe
  useEffect(() => {
    const handleGlobalPointerUp = (e: PointerEvent) => {
      if (e.button === 1 && isPanningRef.current) {
        isPanningRef.current = false;
        setIsPanning(false);
      }
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, []);

  return {
    pan,
    setPan,
    resetPan,
    isPanning,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleMouseDown,
    panProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onMouseDown: handleMouseDown,
    },
  };
}

export const PreviewZoomControl: React.FC<PreviewZoomControlProps> = ({
  zoom,
  onChange,
  min = 25,
  max = 250,
  compact = false,
  className = '',
  label,
  pan,
  onResetPan,
}) => {
  const clamp = (val: number) => Math.max(min, Math.min(max, Math.round(val)));

  // View window coverage percentage (e.g. 67% scale = 150% view window)
  const viewWindowPercent = Math.round((100 / Math.max(25, zoom)) * 100);
  const isPanned = pan && (pan.x !== 0 || pan.y !== 0);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#0d1422]/90 border border-[#2b3b57] text-[10px] font-mono text-slate-200 backdrop-blur-md shadow-lg ${className}`}
      title="Middle-click & drag canvas to pan"
    >
      {label && (
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mr-0.5">
          {label}
        </span>
      )}

      <button
        type="button"
        onClick={() => onChange(clamp(zoom - 10))}
        className="p-0.5 rounded hover:bg-slate-700/70 text-slate-300 hover:text-white transition-colors"
        title="Zoom Out (-10%)"
        aria-label="Zoom Out"
      >
        <ZoomOut className="w-3.5 h-3.5" />
      </button>

      <input
        type="range"
        min={min}
        max={max}
        step={5}
        value={zoom}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        className={`${compact ? 'w-14' : 'w-20'} h-1 cursor-pointer accent-cyan-400`}
        aria-label="Preview Zoom Percentage"
      />

      <button
        type="button"
        onClick={() => onChange(clamp(zoom + 10))}
        className="p-0.5 rounded hover:bg-slate-700/70 text-slate-300 hover:text-white transition-colors"
        title="Zoom In (+10%)"
        aria-label="Zoom In"
      >
        <ZoomIn className="w-3.5 h-3.5" />
      </button>

      <span
        className="min-w-[36px] text-center font-bold text-cyan-300"
        title={`Scale: ${zoom}% (View Window: ${viewWindowPercent}%)`}
      >
        {zoom}%
      </span>

      {/* Quick 150% Out (Overscan) Button -> 67% scale shows 150% view window so elements can go outside 100% frame */}
      <button
        type="button"
        onClick={() => onChange(67)}
        className={`px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase transition-colors inline-flex items-center gap-0.5 ${
          zoom === 67
            ? 'bg-amber-500/25 border-amber-400 text-amber-300'
            : 'bg-[#172236] hover:bg-[#22324d] border-[#2e4063] text-amber-200'
        }`}
        title="Zoom Out to 150% Overscan View Window (67% Scale) to edit outside the 100% frame"
      >
        <Minimize2 className="w-2.5 h-2.5" />
        <span>OUT 150%</span>
      </button>

      {/* Quick 100% Reset Button */}
      <button
        type="button"
        onClick={() => onChange(100)}
        className={`px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase transition-colors inline-flex items-center gap-0.5 ${
          zoom === 100
            ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
            : 'bg-[#172236] hover:bg-[#22324d] border-[#2e4063] text-slate-300 hover:text-white'
        }`}
        title="Reset to 100% Frame Fit"
      >
        <Maximize2 className="w-2.5 h-2.5" />
        <span>100%</span>
      </button>

      {/* Reset Pan Pill if middle-click panned */}
      {isPanned && onResetPan && (
        <button
          type="button"
          onClick={onResetPan}
          className="px-1.5 py-0.5 rounded border border-cyan-500/50 bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 text-[9px] font-bold transition-all flex items-center gap-1 shadow-sm"
          title={`Middle-click panned (${pan.x}px, ${pan.y}px). Click to reset pan.`}
        >
          <Move className="w-2.5 h-2.5 animate-pulse" />
          <span>RESET PAN</span>
        </button>
      )}
    </div>
  );
};
