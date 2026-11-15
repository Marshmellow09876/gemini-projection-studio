import React, { useState } from 'react';
import {
  X,
  Camera,
  Check,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Layers,
  Sliders,
} from 'lucide-react';
import { useProjectionStore } from '../../store/useProjectionStore';

export const AutoCalibrationWizardModal: React.FC = () => {
  const {
    isAutoCalibrationModalOpen,
    setIsAutoCalibrationModalOpen,
    runAutoStructuredLightWarp,
    isAutoWarpingActive,
    autoWarpProgressPct,
    customReferencePhotoUrl,
  } = useProjectionStore();

  const [wizardStep, setWizardStep] = useState<number>(1);
  const [selectedCam, setSelectedCam] = useState<string>('cam-01');
  const [stripeFrequency, setStripeFrequency] = useState<number>(16);
  const [autoMaskTrees, setAutoMaskTrees] = useState<boolean>(true);

  if (!isAutoCalibrationModalOpen) return null;

  const handleNext = () => {
    if (wizardStep === 2) {
      runAutoStructuredLightWarp();
    }
    setWizardStep((prev) => Math.min(4, prev + 1));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0b121e] border border-[#213047] rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans select-none">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1b2638] flex items-center justify-between bg-[#0e1626]">
          <div className="flex items-center gap-2.5">
            <Camera className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                Structured-Light Camera Auto-Calibration Wizard
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Step {wizardStep} of 4: {['Select Camera', 'Project Gray-Code Patterns', 'Compute Homography', 'Verify & Apply'][wizardStep - 1]}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsAutoCalibrationModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2538] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full bg-[#080d16] h-1.5 flex">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`flex-1 transition-all ${
                wizardStep >= step ? 'bg-cyan-500' : 'bg-[#152030]'
              }`}
            />
          ))}
        </div>

        {/* Wizard Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh] text-xs">
          {/* STEP 1: Select Camera */}
          {wizardStep === 1 && (
            <div className="space-y-4">
              <div className="text-sm font-bold text-slate-200">1. Select Calibration Camera Input</div>
              <p className="text-slate-400 text-xs">
                Position a tripod-mounted camera with a full, unobstructed view of the house facade.
              </p>

              <div className="space-y-2">
                {[
                  { id: 'cam-01', name: 'Logitech Brio 4K Ultra HD (USB 3.0)', res: '3840x2160 @ 60 FPS' },
                  { id: 'cam-02', name: 'Front Yard RTSP Security Camera', res: '1920x1080 @ 30 FPS' },
                  { id: 'cam-03', name: 'Smartphone Web-Camera Link', res: '1920x1080 @ 60 FPS' },
                ].map((cam) => (
                  <div
                    key={cam.id}
                    onClick={() => setSelectedCam(cam.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedCam === cam.id
                        ? 'bg-cyan-600/20 text-cyan-300 border-cyan-500 shadow-sm'
                        : 'bg-[#101826] text-slate-300 border-[#1f2d42] hover:bg-[#162132]'
                    }`}
                  >
                    <div className="font-bold">{cam.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{cam.res}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Project Binary Gray-Code Stripes */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <div className="text-sm font-bold text-slate-200">2. Flash Binary Structured Light Patterns</div>
              <p className="text-slate-400 text-xs">
                The projector will flash 16 vertical and horizontal Gray-code stripe patterns to map camera pixel coordinates to projector pixels.
              </p>

              <div className="w-full h-44 rounded-xl border border-[#1f2d42] bg-black relative overflow-hidden flex items-center justify-center shadow-inner">
                {/* Simulated Binary Stripes */}
                <div
                  className="absolute inset-0 bg-[linear-gradient(90deg,transparent_50%,rgba(0,240,255,0.7)_50%)] animate-pulse"
                  style={{ backgroundSize: `${stripeFrequency * 2}px 100%` }}
                />
                <div className="z-10 bg-black/80 px-3 py-1 rounded text-cyan-300 font-mono text-xs border border-cyan-500/40">
                  PROJECTING STRIPE SEQUENCE: FRAME 8 / 16
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#0e1624] border border-[#1b2638]">
                <span>Stripe Density Resolution:</span>
                <span className="font-mono text-cyan-400 font-bold">{stripeFrequency} px</span>
              </div>
            </div>
          )}

          {/* STEP 3: Compute Sub-Pixel Homography */}
          {wizardStep === 3 && (
            <div className="space-y-4">
              <div className="text-sm font-bold text-slate-200">3. Compute Sub-Pixel Mesh & Obstructions</div>

              <div className="p-4 rounded-xl bg-[#080d16] border border-[#1f2d42] space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-semibold">Sub-Pixel Homography Solver:</span>
                  <span className="font-mono text-emerald-400 font-bold">SOLVED (RMS: 0.38 px)</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-semibold">Corner Mesh Grid:</span>
                  <span className="font-mono text-cyan-300 font-bold">128 Control Points</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-semibold">Detected Swaying Obstructions:</span>
                  <span className="font-mono text-amber-400 font-bold">Front Tree Branch (Auto-Masked)</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#101724] border border-[#1e2a3c] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-200">Auto-Subtract Tree & Shrub Obstructions</div>
                  <div className="text-[10px] text-slate-400">Creates dynamic blackout mask over foliage</div>
                </div>
                <input
                  type="checkbox"
                  checked={autoMaskTrees}
                  onChange={(e) => setAutoMaskTrees(e.target.checked)}
                  className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* STEP 4: Verify & Apply */}
          {wizardStep === 4 && (
            <div className="space-y-4">
              <div className="text-sm font-bold text-slate-200">4. Calibration Verification & Apply</div>
              <p className="text-slate-400 text-xs">
                Review the aligned test grid mapped over the house. Click Apply to lock in the homography matrices.
              </p>

              <div className="w-full h-44 rounded-xl border border-emerald-500/50 bg-black relative overflow-hidden flex items-center justify-center shadow-lg">
                <img
                  src={customReferencePhotoUrl || 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80'}
                  alt="House Aligned"
                  className="w-full h-full object-cover opacity-70"
                />
                <div className="absolute inset-0 border border-emerald-400/40 pointer-events-none" />
                <div className="absolute top-2 left-2 text-[10px] font-mono text-emerald-300 bg-black/80 px-2 py-0.5 rounded border border-emerald-500/50">
                  ✓ SUB-PIXEL WARP VERIFIED
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-5 py-3 border-t border-[#1b2638] bg-[#0c121e] flex justify-between items-center">
          <button
            type="button"
            onClick={() => setWizardStep((prev) => Math.max(1, prev - 1))}
            disabled={wizardStep === 1}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase flex items-center gap-1 ${
              wizardStep === 1 ? 'opacity-40 cursor-not-allowed text-slate-500' : 'text-slate-300 hover:text-white'
            }`}
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          {wizardStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase flex items-center gap-1.5 shadow-md shadow-cyan-900/40"
            >
              Next Step <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsAutoCalibrationModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase flex items-center gap-1.5 shadow-md shadow-emerald-900/40"
            >
              <Check className="w-4 h-4" /> Commit Warp to Project
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
