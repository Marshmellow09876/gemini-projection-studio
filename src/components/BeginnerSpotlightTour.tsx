import React, { useEffect, useState } from 'react';
import {
  Compass,
  ChevronLeft,
  ChevronRight,
  Zap,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';
import { useProjectionStore } from '../store/useProjectionStore';
import { loadStarterShowPack } from '../utils/starterShowPacks';
import { playManualCueSound } from '../utils/soundEffects';

interface TourStepConfig {
  step: number;
  title: string;
  targetId: string;
  plainEnglish: string;
  actionTip: string;
  autoDemoLabel: string;
}

const TOUR_STEPS: TourStepConfig[] = [
  {
    step: 1,
    title: 'Step 1: Load a Starter Show or House Photo',
    targetId: 'tour-starter-shows',
    plainEnglish:
      'New to projection mapping? Never start from an empty screen! Click "Starter Shows" to pick a complete Holiday In a Box (Christmas, Halloween, New Year\'s, or Indoor Wall Party) with pre-traced shapes and music.',
    actionTip: 'Click "⚡ Auto-Demo Step 1" to load Christmas Wonderland right now.',
    autoDemoLabel: '⚡ Auto-Demo: Load Christmas Wonderland',
  },
  {
    step: 2,
    title: 'Step 2: Meet Your Outlines & Window Masks',
    targetId: 'tour-screen-map',
    plainEnglish:
      'These colored polygons act like digital cookie-cutters for your projector. Solid outlines get bright animations (like roofs and garage doors), while dashed Window Masks keep harsh projector light out of bedrooms!',
    actionTip: 'Click "Auto-Demo" to jump straight to the House Map view.',
    autoDemoLabel: '⚡ Auto-Demo: Open House Map View',
  },
  {
    step: 3,
    title: 'Step 3: Fit a Video Onto Your House',
    targetId: 'tour-fit-video',
    plainEnglish:
      'Have a cool video of falling snow or ghosts? Click "Fit Video" to slide and stretch one video underneath your house outlines. Anything outside your house shapes stays pure black—zero light spill onto the lawn or sky!',
    actionTip: 'Try opening Fit Video to see live outline clipping in action.',
    autoDemoLabel: '⚡ Auto-Demo: Open Fit Video Studio',
  },
  {
    step: 4,
    title: 'Step 4: 30-Second Tripod Recalibration (W)',
    targetId: 'tour-warp-calib',
    plainEnglish:
      'Did wind bump your projector tripod? You NEVER have to redraw your house! Click "Warp & Calib" (or press W) and drag 4 master corners to snap the entire house layout back into alignment in seconds.',
    actionTip: 'Click Auto-Demo to preview the 4-Corner Recalibration cage.',
    autoDemoLabel: '⚡ Auto-Demo: Preview 4-Corner Warp',
  },
  {
    step: 5,
    title: 'Step 5: Showtime & Blackout Safety (ESC)',
    targetId: 'tour-showtime',
    plainEnglish:
      'You are ready to project! Open Showtime to play your sequence fullscreen on your projector. And remember: pressing the ESC key at any moment triggers an instant Master Blackout if someone walks in front of the beam!',
    actionTip: 'Click Auto-Demo to enter Live Showtime and finish the tour!',
    autoDemoLabel: '⚡ Auto-Demo: Launch Showtime',
  },
];

export const BeginnerSpotlightTour: React.FC = () => {
  const {
    isSpotlightTourActive,
    setIsSpotlightTourActive,
    spotlightTourStep,
    setSpotlightTourStep,
    setActiveScreen,
    setIsFitVideoModalOpen,
    setIsMapRecalibrationModalOpen,
    setIsStarterPacksModalOpen,
    showToast,
  } = useProjectionStore();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const safeStepIdx = Math.max(
    0,
    Math.min(TOUR_STEPS.length - 1, spotlightTourStep)
  );
  const current = TOUR_STEPS[safeStepIdx];

  useEffect(() => {
    if (!isSpotlightTourActive) return;

    const updateRect = () => {
      const el = document.querySelector(
        `[data-tour-id="${current.targetId}"]`
      ) as HTMLElement | null;
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setTargetRect(rect);
          return;
        }
      }
      setTargetRect(null);
    };

    updateRect();
    const timer = setInterval(updateRect, 350);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      clearInterval(timer);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [isSpotlightTourActive, current.targetId]);

  if (!isSpotlightTourActive) return null;

  const handleClose = () => {
    setIsSpotlightTourActive(false);
    showToast('Guided Tour closed. Re-open anytime via "Guided Tour" in the top bar!');
  };

  const handleAutoDemo = () => {
    playManualCueSound('chime');
    if (current.step === 1) {
      setIsStarterPacksModalOpen(false);
      loadStarterShowPack('christmas_wonderland');
      setActiveScreen(2);
    } else if (current.step === 2) {
      setIsFitVideoModalOpen(false);
      setIsMapRecalibrationModalOpen(false);
      setActiveScreen(2);
      showToast('Viewing traced house outlines & zero-lumen window masks');
    } else if (current.step === 3) {
      setIsMapRecalibrationModalOpen(false);
      setIsFitVideoModalOpen(true);
    } else if (current.step === 4) {
      setIsFitVideoModalOpen(false);
      setActiveScreen(2);
      setIsMapRecalibrationModalOpen(true);
    } else if (current.step === 5) {
      setIsFitVideoModalOpen(false);
      setIsMapRecalibrationModalOpen(false);
      setActiveScreen(7);
      showToast('Welcome to Showtime! Press ESC anytime for emergency blackout.');
    }
  };

  const handleNext = () => {
    playManualCueSound('click');
    if (safeStepIdx < TOUR_STEPS.length - 1) {
      setSpotlightTourStep(safeStepIdx + 1);
    } else {
      setIsSpotlightTourActive(false);
      playManualCueSound('chime');
      showToast('🎉 Beginner Tour Complete! You are ready to map your show.');
    }
  };

  const handlePrev = () => {
    playManualCueSound('click');
    if (safeStepIdx > 0) {
      setSpotlightTourStep(safeStepIdx - 1);
    }
  };

  // Position coach card cleanly under target or centered
  const cardWidth = 400;
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;

  let cardStyle: React.CSSProperties = {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  };

  if (targetRect) {
    const preferredLeft = Math.max(
      16,
      Math.min(viewportW - cardWidth - 16, targetRect.left + targetRect.width / 2 - cardWidth / 2)
    );
    const fitsBelow = targetRect.bottom + 270 < viewportH;
    const preferredTop = fitsBelow
      ? targetRect.bottom + 14
      : Math.max(16, targetRect.top - 260);

    cardStyle = {
      top: `${preferredTop}px`,
      left: `${preferredLeft}px`,
    };
  }

  return (
    <div className="fixed inset-0 z-[70] pointer-events-none">
      {/* Backdrop Dimmer (or Spotlight Ring) */}
      {targetRect ? (
        <div
          className="fixed rounded-lg border-2 border-cyan-400 shadow-[0_0_0_9999px_rgba(2,6,23,0.72),0_0_24px_rgba(34,211,238,0.8)] transition-all duration-300 pointer-events-none animate-pulse"
          style={{
            top: `${targetRect.top - 5}px`,
            left: `${targetRect.left - 5}px`,
            width: `${targetRect.width + 10}px`,
            height: `${targetRect.height + 10}px`,
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-[2px] pointer-events-auto" />
      )}

      {/* Floating Coach Card */}
      <div
        style={cardStyle}
        className="fixed w-[400px] max-w-[calc(100vw-32px)] bg-[#0f172a] border-2 border-cyan-500/80 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-4 pointer-events-auto text-slate-100 flex flex-col gap-3"
      >
        {/* Top Row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center shrink-0">
              <Compass className="w-4 h-4 text-cyan-300" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-300">
                Beginner Guided Tour • Step {current.step} of {TOUR_STEPS.length}
              </div>
              <h3 className="text-sm font-extrabold text-white leading-snug">
                {current.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close Tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
          {TOUR_STEPS.map((s, idx) => (
            <div
              key={s.step}
              className={`flex-1 h-full transition-all ${
                idx <= safeStepIdx ? 'bg-gradient-to-r from-cyan-400 to-emerald-400' : 'bg-slate-800'
              }`}
            />
          ))}
        </div>

        {/* Plain English Explanation */}
        <p className="text-xs text-slate-200 leading-relaxed">
          {current.plainEnglish}
        </p>

        {/* Try It / Auto-Demo Box */}
        <div className="bg-[#162238] border border-[#283c5e] rounded-xl p-2.5 flex flex-col gap-2">
          <div className="text-[11px] text-amber-200 flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{current.actionTip}</span>
          </div>
          <button
            type="button"
            onClick={handleAutoDemo}
            className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow cursor-pointer transition-all"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>{current.autoDemoLabel}</span>
          </button>
        </div>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            disabled={safeStepIdx === 0}
            onClick={handlePrev}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-xs font-bold text-slate-200 flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
          >
            Skip Tour
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1 shadow cursor-pointer"
          >
            {safeStepIdx < TOUR_STEPS.length - 1 ? (
              <>
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Finish!</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
