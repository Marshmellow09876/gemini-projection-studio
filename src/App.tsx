import React, { useEffect } from 'react';
import { SystemHeader } from './components/SystemHeader';
import { Screen1Home } from './screens/Screen1Home';
import { Screen2LayoutMapping } from './screens/Screen2LayoutMapping';
import { Screen3PhotoToLayout } from './screens/Screen3PhotoToLayout';
import { Screen4AiVideoStudio } from './screens/Screen4AiVideoStudio';
import { Screen5RepairInpainting } from './screens/Screen5RepairInpainting';
import { Screen6PlaylistAlignment } from './screens/Screen6PlaylistAlignment';
import { Screen7LiveShowtime } from './screens/Screen7LiveShowtime';
import { Screen8ProjectorSetup } from './screens/Screen8ProjectorSetup';
import { Screen9AudienceAutomation } from './screens/Screen9AudienceAutomation';
import { Screen10MusicSync } from './screens/Screen10MusicSync';
import { Screen11TimelineSequencer } from './screens/Screen11TimelineSequencer';
import { Screen12DepthRelighting } from './screens/Screen12DepthRelighting';
import { Screen13SingingFacesStudio } from './screens/Screen13SingingFacesStudio';
import { Screen14PixelDmxStage } from './screens/Screen14PixelDmxStage';
import { Screen15ShaderParticleForge } from './screens/Screen15ShaderParticleForge';
import { Screen16OpticalCalibration } from './screens/Screen16OpticalCalibration';
import { Screen17WindowPortals } from './screens/Screen17WindowPortals';
import { Screen18BroadcastDiagnostics } from './screens/Screen18BroadcastDiagnostics';
import { useProjectionStore } from './store/useProjectionStore';
import {
  ProjectorOutputView,
  useProjectorSyncBroadcaster,
} from './components/ProjectorOutputView';
import { AiProviderSettingsModal } from './components/AiProviderSettingsModal';
import { ProjectorOpticsCalculatorModal } from './components/modals/ProjectorOpticsCalculatorModal';
import { AudioStemSplitterModal } from './components/modals/AudioStemSplitterModal';
import { WallColorNeutralizerModal } from './components/modals/WallColorNeutralizerModal';
import { BatchRenderQueueModal } from './components/modals/BatchRenderQueueModal';
import { ShowApplianceExportModal } from './components/modals/ShowApplianceExportModal';
import { AutoCalibrationWizardModal } from './components/modals/AutoCalibrationWizardModal';
import { ChromaKeyExtractorModal } from './components/modals/ChromaKeyExtractorModal';
import { BezierMeshWarpModal } from './components/modals/BezierMeshWarpModal';
import { FmRadioSignModal } from './components/modals/FmRadioSignModal';
import { SpectatorPortalModal } from './components/modals/SpectatorPortalModal';
import { HardwareSafetyRulesModal } from './components/modals/HardwareSafetyRulesModal';
import { HolidayAssetLibraryModal } from './components/modals/HolidayAssetLibraryModal';
import { MidiControllerMapModal } from './components/modals/MidiControllerMapModal';
import { ProjectTimeMachineModal } from './components/modals/ProjectTimeMachineModal';
import { SampleShowTutorialModal } from './components/modals/SampleShowTutorialModal';
import { FitVideoToHouseModal } from './components/modals/FitVideoToHouseModal';
import { ExportHouseStencilModal } from './components/modals/ExportHouseStencilModal';
import { LoopCrossfadeEditorModal } from './components/modals/LoopCrossfadeEditorModal';
import { MapRecalibrationWizardModal } from './components/modals/MapRecalibrationWizardModal';
import { SceneLibraryAndFxGraphModal } from './components/modals/SceneLibraryAndFxGraphModal';
import { AutoShowAndKaraokeModal } from './components/modals/AutoShowAndKaraokeModal';
import { RunNightPreflightAndRehearsalModal } from './components/modals/RunNightPreflightAndRehearsalModal';
import { CommandPaletteModal } from './components/modals/CommandPaletteModal';
import { ProjectorRigAndEdgeBlendModal } from './components/modals/ProjectorRigAndEdgeBlendModal';
import { DmxAndWledPatchModal } from './components/modals/DmxAndWledPatchModal';
import { LiveAudioAndMidiModal } from './components/modals/LiveAudioAndMidiModal';
import { TestPatternsAndGeometryToolsModal } from './components/modals/TestPatternsAndGeometryToolsModal';

export const App: React.FC = () => {
  // Broadcast all store modifications in real-time to any connected secondary projector displays
  useProjectorSyncBroadcaster();

  const isProjectorWindow =
    typeof window !== 'undefined' &&
    window.location.search.includes('projector=true');

  const {
    activeScreen,
    statusToast,
    clearToast,
    isFitVideoModalOpen,
    isExportStencilModalOpen,
    isLoopCrossfadeModalOpen,
    isMapRecalibrationModalOpen,
    isSceneLibraryModalOpen,
    isAutoShowKaraokeModalOpen,
    isRunNightRehearsalModalOpen,
    isCommandPaletteOpen,
    isProjectorRigModalOpen,
    isDmxWledModalOpen,
    isLiveAudioMidiModalOpen,
    isTestPatternsModalOpen,
    setIsFitVideoModalOpen,
    setIsExportStencilModalOpen,
    setIsLoopCrossfadeModalOpen,
    setIsMapRecalibrationModalOpen,
    setIsSceneLibraryModalOpen,
    setIsAutoShowKaraokeModalOpen,
    setIsRunNightRehearsalModalOpen,
    setIsCommandPaletteOpen,
    setIsProjectorRigModalOpen,
    setIsDmxWledModalOpen,
    setIsLiveAudioMidiModalOpen,
    setIsTestPatternsModalOpen,
  } = useProjectionStore();

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K / Cmd+K opens Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(!isCommandPaletteOpen);
        return;
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isCommandPaletteOpen, setIsCommandPaletteOpen]);

  useEffect(() => {
    if (!statusToast) return;
    const timer = setTimeout(() => {
      clearToast();
    }, 3800);
    return () => clearTimeout(timer);
  }, [statusToast, clearToast]);

  // Dedicated secondary monitor physical projector output view
  if (isProjectorWindow) {
    return <ProjectorOutputView isPopout />;
  }

  const renderActiveScreen = () => {
    switch (activeScreen) {
      case 1:
        return <Screen1Home />;
      case 2:
        return <Screen2LayoutMapping />;
      case 3:
        return <Screen3PhotoToLayout />;
      case 4:
        return <Screen4AiVideoStudio />;
      case 5:
        return <Screen5RepairInpainting />;
      case 6:
        return <Screen6PlaylistAlignment />;
      case 7:
        return <Screen7LiveShowtime />;
      case 8:
        return <Screen8ProjectorSetup />;
      case 9:
        return <Screen9AudienceAutomation />;
      case 10:
        return <Screen10MusicSync />;
      case 11:
        return <Screen11TimelineSequencer />;
      case 12:
        return <Screen12DepthRelighting />;
      case 13:
        return <Screen13SingingFacesStudio />;
      case 14:
        return <Screen14PixelDmxStage />;
      case 15:
        return <Screen15ShaderParticleForge />;
      case 16:
        return <Screen16OpticalCalibration />;
      case 17:
        return <Screen17WindowPortals />;
      case 18:
        return <Screen18BroadcastDiagnostics />;
      default:
        return <Screen1Home />;
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#0c1017] text-slate-100 select-none overflow-x-hidden overflow-y-auto">
      {/* Persistent Top System Header Bar - Sticky so it remains accessible while scrolling */}
      <header className="sticky top-0 z-40 shrink-0 border-b border-[#1b2535] bg-[#0c1017]/95 backdrop-blur-md">
        <SystemHeader />
      </header>

      {/* Main Active Screen Router - Grows naturally in length like a webpage */}
      <main className="flex-1 flex flex-col min-h-0 w-full">
        {renderActiveScreen()}
      </main>

      {/* Global Modals & Dialogs (Suite of 14 Specialized Wizards) */}
      <AiProviderSettingsModal />
      <ProjectorOpticsCalculatorModal />
      <AudioStemSplitterModal />
      <WallColorNeutralizerModal />
      <BatchRenderQueueModal />
      <ShowApplianceExportModal />
      <AutoCalibrationWizardModal />
      <ChromaKeyExtractorModal />
      <BezierMeshWarpModal />
      <FmRadioSignModal />
      <SpectatorPortalModal />
      <HardwareSafetyRulesModal />
      <HolidayAssetLibraryModal />
      <MidiControllerMapModal />
      <ProjectTimeMachineModal />
      <SampleShowTutorialModal />

      {/* Marshall Projection Studio Parity Architecture Modals */}
      <FitVideoToHouseModal
        isOpen={isFitVideoModalOpen}
        onClose={() => setIsFitVideoModalOpen(false)}
      />
      <ExportHouseStencilModal
        isOpen={isExportStencilModalOpen}
        onClose={() => setIsExportStencilModalOpen(false)}
      />
      <LoopCrossfadeEditorModal
        isOpen={isLoopCrossfadeModalOpen}
        onClose={() => setIsLoopCrossfadeModalOpen(false)}
      />
      <MapRecalibrationWizardModal
        isOpen={isMapRecalibrationModalOpen}
        onClose={() => setIsMapRecalibrationModalOpen(false)}
      />
      <SceneLibraryAndFxGraphModal
        isOpen={isSceneLibraryModalOpen}
        onClose={() => setIsSceneLibraryModalOpen(false)}
      />
      <AutoShowAndKaraokeModal
        isOpen={isAutoShowKaraokeModalOpen}
        onClose={() => setIsAutoShowKaraokeModalOpen(false)}
      />
      <RunNightPreflightAndRehearsalModal
        isOpen={isRunNightRehearsalModalOpen}
        onClose={() => setIsRunNightRehearsalModalOpen(false)}
      />
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenModal={(modalKey) => {
          if (modalKey === 'fit-video') setIsFitVideoModalOpen(true);
          else if (modalKey === 'stencil') setIsExportStencilModalOpen(true);
          else if (modalKey === 'loop-crossfade') setIsLoopCrossfadeModalOpen(true);
          else if (modalKey === 'recalibration') setIsMapRecalibrationModalOpen(true);
          else if (modalKey === 'scenes') setIsSceneLibraryModalOpen(true);
          else if (modalKey === 'auto-show') setIsAutoShowKaraokeModalOpen(true);
          else if (modalKey === 'rehearsal') setIsRunNightRehearsalModalOpen(true);
          else if (modalKey === 'projector-rig') setIsProjectorRigModalOpen(true);
          else if (modalKey === 'dmx-wled') setIsDmxWledModalOpen(true);
          else if (modalKey === 'live-audio-midi') setIsLiveAudioMidiModalOpen(true);
          else if (modalKey === 'test-patterns') setIsTestPatternsModalOpen(true);
        }}
      />

      <ProjectorRigAndEdgeBlendModal
        isOpen={isProjectorRigModalOpen}
        onClose={() => setIsProjectorRigModalOpen(false)}
      />
      <DmxAndWledPatchModal
        isOpen={isDmxWledModalOpen}
        onClose={() => setIsDmxWledModalOpen(false)}
      />
      <LiveAudioAndMidiModal
        isOpen={isLiveAudioMidiModalOpen}
        onClose={() => setIsLiveAudioMidiModalOpen(false)}
      />
      <TestPatternsAndGeometryToolsModal
        isOpen={isTestPatternsModalOpen}
        onClose={() => setIsTestPatternsModalOpen(false)}
      />

      {/* Non-blocking Status Toast */}
      {statusToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-[#162032]/95 border border-cyan-500/50 text-xs font-mono text-cyan-200 shadow-2xl backdrop-blur-md flex items-center gap-2.5"
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>{statusToast}</span>
        </div>
      )}
    </div>
  );
};

export default App;
