import React, { useState } from 'react';
import { X, Download, Package, Check, Cpu, Sparkles, Terminal } from 'lucide-react';
import { useProjectionStore } from '../../store/useProjectionStore';

export const ShowApplianceExportModal: React.FC = () => {
  const { isShowExportModalOpen, setIsShowExportModalOpen, activeProjectName } =
    useProjectionStore();

  const [exportType, setExportType] = useState<'standalone-kiosk' | 'fseq' | 'svg-masks'>('standalone-kiosk');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [downloadReady, setDownloadReady] = useState<boolean>(false);

  if (!isShowExportModalOpen) return null;

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setDownloadReady(true);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#0b121e] border border-[#213047] rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans select-none">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1b2638] flex items-center justify-between bg-[#0e1626]">
          <div className="flex items-center gap-2.5">
            <Package className="w-5 h-5 text-rose-400" />
            <div>
              <div className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                Show Appliance & Hardware Kiosk Exporter
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Standalone Offline Player for Raspberry Pi 5 / Intel NUC Mini-PC
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsShowExportModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2538] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh] text-xs">
          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Export Package Format
            </label>
            <div className="space-y-2 mt-2">
              {[
                {
                  id: 'standalone-kiosk',
                  title: 'Zero-Dependency Standalone Offline WebGL Kiosk (.zip)',
                  desc: 'Includes self-contained HTML5 player, homography matrices, and media loops for mini-PCs.',
                },
                {
                  id: 'fseq',
                  title: 'Falcon Player (FPP) & xLights .fseq Matrix (.fseq)',
                  desc: 'Synchronized lighting sequence file with DMX/E1.31 channel routing.',
                },
                {
                  id: 'svg-masks',
                  title: 'Vector Blackout & Architectural Cutout Masks (.svg / .json)',
                  desc: 'Raw vector paths and homography coordinates for MadMapper or Resolume.',
                },
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setExportType(opt.id as any)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    exportType === opt.id
                      ? 'bg-rose-600/20 text-rose-200 border-rose-500 shadow-sm'
                      : 'bg-[#101826] text-slate-300 border-[#1f2d42] hover:bg-[#162132]'
                  }`}
                >
                  <div className="font-bold">{opt.title}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{opt.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#080d16] border border-[#1f2d42] space-y-2 text-slate-300 text-[11px]">
            <div className="font-bold text-slate-200 uppercase flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-rose-400" /> Auto-Boot Installation on Raspberry Pi
            </div>
            <p className="text-[10px] text-slate-400 font-mono bg-[#0c121e] p-2 rounded border border-[#172030]">
              unzip lumen-show.zip && bash install-kiosk.sh --autostart
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1b2638] bg-[#0c121e] flex justify-between items-center">
          <div className="text-[11px] font-mono text-cyan-400">
            {downloadReady && '✓ Bundle Generated Ready for Download'}
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase flex items-center gap-1.5 shadow-md shadow-rose-900/40"
          >
            <Download className="w-3.5 h-3.5" />
            {isExporting ? 'Packaging Appliance...' : downloadReady ? 'Download .zip' : 'Build & Export Bundle'}
          </button>
        </div>
      </div>
    </div>
  );
};
