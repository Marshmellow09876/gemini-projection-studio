import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Download,
  Sparkles,
  Layers,
  Sliders,
  Check,
  FileImage,
  Copy,
  ExternalLink,
  Ratio,
  Palette
} from 'lucide-react';
import { useProjectionStore, VectorLayer } from '../../store/useProjectionStore';
import {
  HouseStencilStyle,
  HouseStencilOptions,
  renderHouseStencilToCanvas,
  downloadCanvasAsPng,
  SEMANTIC_COLOR_MAP
} from '../../utils/fitVideoToHouseEngine';

export interface ExportHouseStencilModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface ResolutionPreset {
  label: string;
  width: number;
  height: number;
  description: string;
}

const RESOLUTION_PRESETS: ResolutionPreset[] = [
  { label: '1280 × 720', width: 1280, height: 720, description: '720p Standard' },
  { label: '1920 × 1080', width: 1920, height: 1080, description: '1080p Full HD' },
  { label: '2750 × 1536', width: 2750, height: 1536, description: 'Runway/Kling AI Native' },
  { label: '3840 × 2160', width: 3840, height: 2160, description: '4K Ultra HD' },
  { label: 'Custom', width: 1920, height: 1080, description: 'Custom Dimensions' }
];

export const ExportHouseStencilModal: React.FC<ExportHouseStencilModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose
}) => {
  const {
    layers,
    activeScreen,
    setActiveScreen,
    showToast
  } = useProjectionStore();

  const [internalOpen, setInternalOpen] = useState(true);
  const isVisible = propIsOpen !== undefined ? propIsOpen : internalOpen;

  const handleClose = () => {
    if (propOnClose) propOnClose();
    else setInternalOpen(false);
  };

  // Stencil Style
  const [selectedStyle, setSelectedStyle] = useState<HouseStencilStyle>('filled-mask');

  // Resolution Preset
  const [selectedPreset, setSelectedPreset] = useState<string>('2750 × 1536');
  const [customWidth, setCustomWidth] = useState<number>(1920);
  const [customHeight, setCustomHeight] = useState<number>(1080);

  // Stroke Width for outline styles
  const [strokeWidth, setStrokeWidth] = useState<number>(3);

  // Punch out blackout/window masks toggle
  const [punchBlackouts, setPunchBlackouts] = useState<boolean>(true);

  // Category Filtering
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    layers.forEach((l) => cats.add(l.category));
    return Array.from(cats);
  }, [layers]);

  const [selectedCategories, setSelectedCategories] = useState<string[]>(availableCategories);

  // Canvas Refs
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Resolved Output Dimensions
  const resolvedDimensions = useMemo(() => {
    if (selectedPreset === 'Custom') {
      return {
        width: Math.max(320, customWidth),
        height: Math.max(240, customHeight)
      };
    }
    const preset = RESOLUTION_PRESETS.find((p) => p.label === selectedPreset);
    return preset ? { width: preset.width, height: preset.height } : { width: 1920, height: 1080 };
  }, [selectedPreset, customWidth, customHeight]);

  // Re-render preview canvas whenever options change
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const options: HouseStencilOptions = {
      style: selectedStyle,
      width: resolvedDimensions.width,
      height: resolvedDimensions.height,
      strokeWidthPx: strokeWidth,
      includeCategories: selectedCategories,
      respectBlackoutMasks: punchBlackouts
    };

    renderHouseStencilToCanvas(canvas, layers, options);
  }, [
    layers,
    selectedStyle,
    resolvedDimensions,
    strokeWidth,
    selectedCategories,
    punchBlackouts
  ]);

  // Category Toggle
  const handleCategoryToggle = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      if (selectedCategories.length === 1) return; // keep at least 1
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  // Download Action
  const handleDownloadPng = () => {
    const offscreen = document.createElement('canvas');
    const options: HouseStencilOptions = {
      style: selectedStyle,
      width: resolvedDimensions.width,
      height: resolvedDimensions.height,
      strokeWidthPx: Math.round((strokeWidth * resolvedDimensions.width) / 1280),
      includeCategories: selectedCategories,
      respectBlackoutMasks: punchBlackouts
    };

    renderHouseStencilToCanvas(offscreen, layers, options);
    const filename = `HouseStencil_${selectedStyle}_${resolvedDimensions.width}x${resolvedDimensions.height}.png`;
    downloadCanvasAsPng(offscreen, filename);
    showToast(`Downloaded house stencil: ${filename}`);
  };

  // Apply to AI Studio Action
  const handleApplyToAiStudio = () => {
    const offscreen = document.createElement('canvas');
    const options: HouseStencilOptions = {
      style: selectedStyle,
      width: resolvedDimensions.width,
      height: resolvedDimensions.height,
      strokeWidthPx: Math.round((strokeWidth * resolvedDimensions.width) / 1280),
      includeCategories: selectedCategories,
      respectBlackoutMasks: punchBlackouts
    };

    renderHouseStencilToCanvas(offscreen, layers, options);
    const dataUrl = offscreen.toDataURL('image/png');

    // Update customReferencePhotoUrl in projection store
    useProjectionStore.setState({
      customReferencePhotoUrl: dataUrl
    });

    // Optionally navigate to AI Video Studio (Screen 4)
    if (setActiveScreen) {
      setActiveScreen(4);
    }

    showToast('Applied house stencil as ControlNet reference in AI Video Studio (Screen 4)');
    handleClose();
  };

  // Copy Data URL to Clipboard
  const handleCopyDataUrl = async () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      await navigator.clipboard.writeText(dataUrl);
      showToast('Copied stencil Base64 Data URL to clipboard');
    } catch {
      showToast('Clipboard access unavailable');
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none font-sans animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-[88vh] bg-[#0b121e] border border-[#213047] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0e1626] border-b border-[#1b2638] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-950/80 border border-emerald-800/60 rounded-xl text-emerald-400">
              <FileImage className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white tracking-wide">
                  Export House Stencil
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-emerald-900/50 text-emerald-300 border border-emerald-700/50 rounded-full">
                  Blueprint §22-F
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Generate high-contrast control masks for Runway Gen-3, Kling 1.5, Sora & ControlNet
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2538] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Canvas Preview (~60%) */}
          <div className="flex-1 bg-[#060a12] p-6 flex flex-col items-center justify-center border-r border-[#1a2538] relative overflow-hidden">
            <div className="w-full h-full flex items-center justify-center relative">
              <canvas
                ref={previewCanvasRef}
                className="max-w-full max-h-full object-contain rounded-lg border border-[#1b283d] shadow-2xl bg-black"
              />
            </div>

            {/* Canvas Info HUD Badge */}
            <div className="absolute bottom-4 left-6 flex items-center gap-2 font-mono text-[11px] bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-slate-300">
              <span>Output:</span>
              <span className="text-emerald-400 font-bold">
                {resolvedDimensions.width} × {resolvedDimensions.height} px
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-cyan-300 uppercase">{selectedStyle}</span>
            </div>
          </div>

          {/* Right Configuration Panel (~40%) */}
          <div className="w-96 bg-[#0b121e] flex flex-col justify-between overflow-y-auto">
            <div className="p-5 space-y-5">
              {/* 1. Stencil Flavor / Style */}
              <div>
                <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-2">
                  1. Stencil Flavor
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedStyle('filled-mask')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      selectedStyle === 'filled-mask'
                        ? 'bg-emerald-950/40 border-emerald-600 text-emerald-200 shadow-sm'
                        : 'bg-[#101826] border-[#1f2d42] text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <div className="font-bold">Filled Mask</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      White silhouette on black ground
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStyle('stroked-outline')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      selectedStyle === 'stroked-outline'
                        ? 'bg-emerald-950/40 border-emerald-600 text-emerald-200 shadow-sm'
                        : 'bg-[#101826] border-[#1f2d42] text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <div className="font-bold">Stroked Outline</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      White line drawings on black
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStyle('filled-plus-outline')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      selectedStyle === 'filled-plus-outline'
                        ? 'bg-emerald-950/40 border-emerald-600 text-emerald-200 shadow-sm'
                        : 'bg-[#101826] border-[#1f2d42] text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <div className="font-bold">Filled + Outline</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      White shapes with dark seams
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStyle('semantic-color-map')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      selectedStyle === 'semantic-color-map'
                        ? 'bg-emerald-950/40 border-emerald-600 text-emerald-200 shadow-sm'
                        : 'bg-[#101826] border-[#1f2d42] text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1">
                      <Palette className="w-3.5 h-3.5 text-cyan-400" />
                      Semantic Map
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      ControlNet RGB segmentation
                    </div>
                  </button>
                </div>
              </div>

              {/* Stroke Width Slider (if outline) */}
              {(selectedStyle === 'stroked-outline' || selectedStyle === 'filled-plus-outline') && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400">
                      Outline Stroke Width
                    </label>
                    <span className="font-mono text-emerald-400 font-bold">{strokeWidth} px</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={12}
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-500 h-1.5 bg-[#172338] rounded-lg cursor-pointer"
                  />
                </div>
              )}

              {/* 2. Resolution Preset Selector */}
              <div>
                <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-2">
                  2. Output Resolution
                </label>
                <div className="space-y-1.5">
                  {RESOLUTION_PRESETS.map((preset) => (
                    <label
                      key={preset.label}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer border transition-colors text-xs ${
                        selectedPreset === preset.label
                          ? 'bg-emerald-950/30 border-emerald-600/80 text-emerald-200'
                          : 'bg-[#101826] border-[#1b283d] text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="resolution"
                          checked={selectedPreset === preset.label}
                          onChange={() => setSelectedPreset(preset.label)}
                          className="accent-emerald-500"
                        />
                        <span className="font-bold font-mono">{preset.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{preset.description}</span>
                    </label>
                  ))}
                </div>

                {/* Custom Resolution Inputs */}
                {selectedPreset === 'Custom' && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block mb-1">Width</span>
                      <input
                        type="number"
                        min={320}
                        max={7680}
                        value={customWidth}
                        onChange={(e) => setCustomWidth(parseInt(e.target.value, 10) || 1920)}
                        className="w-full bg-[#141f30] border border-[#233550] rounded-lg px-2.5 py-1.5 font-mono text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block mb-1">Height</span>
                      <input
                        type="number"
                        min={240}
                        max={4320}
                        value={customHeight}
                        onChange={(e) => setCustomHeight(parseInt(e.target.value, 10) || 1080)}
                        className="w-full bg-[#141f30] border border-[#233550] rounded-lg px-2.5 py-1.5 font-mono text-xs text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Category Filter & Blackout Options */}
              <div>
                <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-2">
                  3. Architectural Filters
                </label>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {availableCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategoryToggle(cat)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        selectedCategories.includes(cat)
                          ? 'bg-cyan-950/60 border-cyan-600 text-cyan-200'
                          : 'bg-[#101826] border-[#1e2e46] text-slate-500'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#090f19] border border-[#182436] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={punchBlackouts}
                    onChange={(e) => setPunchBlackouts(e.target.checked)}
                    className="accent-emerald-500 rounded"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-200 block">
                      Punch Out Blackout Masks
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Leaves windows and spectator zones pure #000000 black
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Bottom Commit Actions */}
            <div className="p-5 bg-[#0e1626] border-t border-[#182335] space-y-2.5">
              <button
                type="button"
                onClick={handleDownloadPng}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" />
                Download PNG Stencil ({resolvedDimensions.width}×{resolvedDimensions.height})
              </button>

              <button
                type="button"
                onClick={handleApplyToAiStudio}
                className="w-full py-2.5 rounded-xl bg-[#142338] hover:bg-[#1c304d] text-cyan-300 border border-cyan-800/60 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Apply as ControlNet Reference in AI Studio
              </button>

              <div className="flex items-center justify-end pt-1">
                <button
                  type="button"
                  onClick={handleCopyDataUrl}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  Copy Base64 Data URL
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
