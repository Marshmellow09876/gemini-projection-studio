import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GripVertical } from 'lucide-react';

interface DraggableDividerProps {
  onDrag: (deltaX: number) => void;
  onReset?: () => void;
  className?: string;
  title?: string;
  vertical?: boolean; // default true for left-right resizing
}

export const DraggableDivider: React.FC<DraggableDividerProps> = ({
  onDrag,
  onReset,
  className = '',
  title = 'Drag left or right to resize panels (Double-click to reset)',
  vertical = true,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = useRef<number>(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startPosRef.current = vertical ? e.clientX : e.clientY;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const currentPos = vertical ? moveEvent.clientX : moveEvent.clientY;
      const delta = currentPos - startPosRef.current;
      startPosRef.current = currentPos;
      onDrag(delta);
    };

    const onMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = vertical ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div
      role="separator"
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      title={title}
      onMouseDown={handleMouseDown}
      onDoubleClick={onReset}
      className={`relative z-20 flex items-center justify-center shrink-0 select-none transition-colors group cursor-col-resize ${
        vertical
          ? 'w-2.5 -mx-1 h-full cursor-col-resize hover:bg-cyan-500/10'
          : 'h-2.5 -my-1 w-full cursor-row-resize hover:bg-cyan-500/10'
      } ${isDragging ? (vertical ? 'cursor-col-resize bg-cyan-500/20' : 'cursor-row-resize bg-cyan-500/20') : ''} ${className}`}
    >
      {/* Central Thin Border Line with Dynamic Glowing State */}
      <div
        className={`${
          vertical ? 'w-[2px] h-full' : 'h-[2px] w-full'
        } transition-all duration-150 ${
          isDragging
            ? 'bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.9)]'
            : 'bg-[#1b2536] group-hover:bg-cyan-400/80 group-hover:shadow-[0_0_8px_rgba(6,182,212,0.5)]'
        }`}
      />

      {/* Floating Grip Pip in Center for Visual Discoverability */}
      <div
        className={`absolute rounded-full bg-[#131a26] border transition-all duration-150 flex items-center justify-center shadow-md ${
          isDragging
            ? 'border-cyan-400 text-cyan-300 scale-110 shadow-[0_0_12px_rgba(6,182,212,0.6)]'
            : 'border-[#2d3d56] text-slate-400 group-hover:border-cyan-400 group-hover:text-cyan-300 group-hover:scale-105'
        } ${vertical ? 'w-3.5 h-7 py-0.5' : 'h-3.5 w-7 px-0.5'}`}
      >
        <GripVertical className="w-2.5 h-2.5 stroke-[2.5]" />
      </div>
    </div>
  );
};

/**
 * Hook for managing 3-panel horizontal percentage-based resizing (e.g. Screen 4)
 */
export function useResizable3Panels({
  defaultPercentages = [25, 35, 40],
  minPercentages = [15, 20, 20],
  maxPercentages = [45, 60, 60],
  storageKey,
}: {
  defaultPercentages?: [number, number, number];
  minPercentages?: [number, number, number];
  maxPercentages?: [number, number, number];
  storageKey?: string;
} = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [percentages, setPercentages] = useState<[number, number, number]>(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === 3) {
            return parsed as [number, number, number];
          }
        }
      } catch (err) {
        console.warn('Failed reading saved panel proportions:', err);
      }
    }
    return defaultPercentages;
  });

  const saveProportions = (next: [number, number, number]) => {
    setPercentages(next);
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
    }
  };

  const handleDragDivider1 = useCallback(
    (deltaX: number) => {
      if (!containerRef.current) return;
      const totalWidth = containerRef.current.clientWidth;
      if (totalWidth <= 0) return;

      const deltaPercent = (deltaX / totalWidth) * 100;
      setPercentages((prev) => {
        let p1 = prev[0] + deltaPercent;
        let p2 = prev[1] - deltaPercent;
        const p3 = prev[2];

        // Enforce min & max bounds on panel 1
        if (p1 < minPercentages[0]) {
          const diff = minPercentages[0] - p1;
          p1 = minPercentages[0];
          p2 -= diff;
        } else if (p1 > maxPercentages[0]) {
          const diff = p1 - maxPercentages[0];
          p1 = maxPercentages[0];
          p2 += diff;
        }

        // Enforce min & max bounds on panel 2
        if (p2 < minPercentages[1]) {
          const diff = minPercentages[1] - p2;
          p2 = minPercentages[1];
          p1 -= diff;
        } else if (p2 > maxPercentages[1]) {
          const diff = p2 - maxPercentages[1];
          p2 = maxPercentages[1];
          p1 += diff;
        }

        const next: [number, number, number] = [p1, p2, p3];
        saveProportions(next);
        return next;
      });
    },
    [minPercentages, maxPercentages]
  );

  const handleDragDivider2 = useCallback(
    (deltaX: number) => {
      if (!containerRef.current) return;
      const totalWidth = containerRef.current.clientWidth;
      if (totalWidth <= 0) return;

      const deltaPercent = (deltaX / totalWidth) * 100;
      setPercentages((prev) => {
        const p1 = prev[0];
        let p2 = prev[1] + deltaPercent;
        let p3 = prev[2] - deltaPercent;

        // Enforce min & max bounds on panel 2
        if (p2 < minPercentages[1]) {
          const diff = minPercentages[1] - p2;
          p2 = minPercentages[1];
          p3 -= diff;
        } else if (p2 > maxPercentages[1]) {
          const diff = p2 - maxPercentages[1];
          p2 = maxPercentages[1];
          p3 += diff;
        }

        // Enforce min & max bounds on panel 3
        if (p3 < minPercentages[2]) {
          const diff = minPercentages[2] - p3;
          p3 = minPercentages[2];
          p2 -= diff;
        } else if (p3 > maxPercentages[2]) {
          const diff = p3 - maxPercentages[2];
          p3 = maxPercentages[2];
          p2 += diff;
        }

        const next: [number, number, number] = [p1, p2, p3];
        saveProportions(next);
        return next;
      });
    },
    [minPercentages, maxPercentages]
  );

  const resetPercentages = useCallback(() => {
    saveProportions(defaultPercentages);
  }, [defaultPercentages]);

  return {
    containerRef,
    percentages,
    handleDragDivider1,
    handleDragDivider2,
    resetPercentages,
  };
}

/**
 * Hook for managing 2-panel percentage-based resizing (e.g. Screen 7, Screen 5, Screen 10)
 */
export function useResizable2Panels({
  defaultPercentages = [50, 50],
  minPercentages = [20, 20],
  maxPercentages = [80, 80],
  storageKey,
}: {
  defaultPercentages?: [number, number];
  minPercentages?: [number, number];
  maxPercentages?: [number, number];
  storageKey?: string;
} = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [percentages, setPercentages] = useState<[number, number]>(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === 2) {
            return parsed as [number, number];
          }
        }
      } catch (err) {
        console.warn('Failed reading saved 2-panel proportions:', err);
      }
    }
    return defaultPercentages;
  });

  const saveProportions = (next: [number, number]) => {
    setPercentages(next);
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
    }
  };

  const handleDrag = useCallback(
    (deltaX: number) => {
      if (!containerRef.current) return;
      const totalWidth = containerRef.current.clientWidth;
      if (totalWidth <= 0) return;

      const deltaPercent = (deltaX / totalWidth) * 100;
      setPercentages((prev) => {
        let p1 = prev[0] + deltaPercent;
        let p2 = prev[1] - deltaPercent;

        if (p1 < minPercentages[0]) {
          p1 = minPercentages[0];
          p2 = 100 - p1;
        } else if (p1 > maxPercentages[0]) {
          p1 = maxPercentages[0];
          p2 = 100 - p1;
        }

        const next: [number, number] = [p1, p2];
        saveProportions(next);
        return next;
      });
    },
    [minPercentages, maxPercentages]
  );

  const resetPercentages = useCallback(() => {
    saveProportions(defaultPercentages);
  }, [defaultPercentages]);

  return {
    containerRef,
    percentages,
    handleDrag,
    resetPercentages,
  };
}

/**
 * Hook for managing a pixel-based resizable sidebar (e.g. Left/Right sidebars in Screen 1)
 */
export function useResizableSidebar({
  defaultWidth = 240,
  minWidth = 150,
  maxWidth = 480,
  direction = 'left-to-right', // 'left-to-right' means dragging right increases width
  storageKey,
}: {
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  direction?: 'left-to-right' | 'right-to-left';
  storageKey?: string;
} = {}) {
  const [width, setWidth] = useState<number>(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const num = Number(saved);
          if (!isNaN(num) && num >= minWidth && num <= maxWidth) {
            return num;
          }
        }
      } catch {
        // ignore
      }
    }
    return defaultWidth;
  });

  const handleDrag = useCallback(
    (deltaX: number) => {
      setWidth((prev) => {
        const delta = direction === 'left-to-right' ? deltaX : -deltaX;
        const next = Math.max(minWidth, Math.min(maxWidth, prev + delta));
        if (storageKey && typeof window !== 'undefined') {
          try {
            localStorage.setItem(storageKey, String(next));
          } catch {
            // ignore
          }
        }
        return next;
      });
    },
    [direction, minWidth, maxWidth, storageKey]
  );

  const resetWidth = useCallback(() => {
    setWidth(defaultWidth);
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, String(defaultWidth));
      } catch {
        // ignore
      }
    }
  }, [defaultWidth, storageKey]);

  return {
    width,
    handleDrag,
    resetWidth,
  };
}
