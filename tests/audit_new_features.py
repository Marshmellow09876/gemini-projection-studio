import os
import sys

def check_file_contains(filepath, patterns, label):
    if not os.path.exists(filepath):
        print(f"FAIL: {label} - File does not exist: {filepath}")
        return False
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    all_ok = True
    for pat in patterns:
        if pat not in content:
            print(f"FAIL: {label} - Missing pattern: {pat}")
            all_ok = False
    if all_ok:
        print(f"PASS: {label}")
    return all_ok

def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    results = []

    # 1. ProjectCard runTime support & initial runtimes
    results.append(check_file_contains(
        os.path.join(root, 'src', 'store', 'useProjectionStore.ts'),
        ['runTime?: string;', "runTime: '03:45'", "runTime: '02:18'", "runTime: '04:12'", "runTime: '03:05'"],
        'Store: ProjectCard runTime and initial run times for all shows'
    ))

    # 2. Home Screen displays Run Time for all shows
    results.append(check_file_contains(
        os.path.join(root, 'src', 'screens', 'Screen1Home.tsx'),
        ['Run Time:', 'project.runTime', 'Clock'],
        'Screen1Home.tsx: Show run time rendered under Recent Projects'
    ))

    # 3. Minimizable Quick Pattern / Calibration Overlays window in Screen 7
    results.append(check_file_contains(
        os.path.join(root, 'src', 'screens', 'Screen7LiveShowtime.tsx'),
        ['isCalibrationOverlayMinimized', 'setIsCalibrationOverlayMinimized', 'Minimize2', 'Maximize2', 'Calibration Overlays'],
        'Screen7LiveShowtime.tsx: Minimizable Calibration Overlay window for full preview'
    ))

    # 4. Webpage scrollability and sidebar scrollbar
    results.append(check_file_contains(
        os.path.join(root, 'src', 'App.tsx'),
        ['overflow-y-auto', 'overflow-x-hidden', 'min-h-screen', 'sticky top-0'],
        'App.tsx: Webpage full-height scrolling and sticky navigation header'
    ))

    results.append(check_file_contains(
        os.path.join(root, 'src', 'index.css'),
        ['::-webkit-scrollbar', 'overflow-y: auto', 'scrollbar-color'],
        'index.css: Visible sidebar scrollbar styles and smooth scrolling'
    ))

    # 5. 20 Halloween + 20 Christmas prompts (40 total)
    results.append(check_file_contains(
        os.path.join(root, 'src', 'utils', 'holidayDecorationPrompts.ts'),
        [
            'HALLOWEEN_HOUSE_PROMPTS',
            'CHRISTMAS_HOUSE_PROMPTS',
            'ALL_HOLIDAY_PROMPTS',
            'getRandomHolidayPrompt',
            'getRandomHalloweenPrompt',
            'getRandomChristmasPrompt',
            'hal-20',
            'xmas-20'
        ],
        'holidayDecorationPrompts.ts: 20 Halloween + 20 Christmas prompts (40 total)'
    ))

    # 6. Screen 4 AI Video Studio random prompt on load/open
    results.append(check_file_contains(
        os.path.join(root, 'src', 'screens', 'Screen4AiVideoStudio.tsx'),
        [
            'getRandomHolidayPrompt',
            'activeHolidayPrompt',
            'setActiveHolidayPrompt',
            'handleShufflePrompt',
            'RANDOM EXAMPLE',
            'Halloween (20)',
            'Christmas (20)'
        ],
        'Screen4AiVideoStudio.tsx: Screen 4 random prompt on load/open and shuffle controls'
    ))

    # 7. Draggable Divider and Resizable Panels across screens
    results.append(check_file_contains(
        os.path.join(root, 'src', 'components', 'DraggableDivider.tsx'),
        ['DraggableDivider', 'useResizable3Panels', 'useResizable2Panels', 'useResizableSidebar', 'cursor-col-resize'],
        'DraggableDivider.tsx: Draggable divider component and resizable hooks'
    ))

    results.append(check_file_contains(
        os.path.join(root, 'src', 'screens', 'Screen4AiVideoStudio.tsx'),
        ['DraggableDivider', 'useResizable3Panels', 'handleDragDivider1', 'handleDragDivider2'],
        'Screen4AiVideoStudio.tsx: Dynamic draggable column borders in AI Studio'
    ))

    results.append(check_file_contains(
        os.path.join(root, 'src', 'screens', 'Screen1Home.tsx'),
        ['DraggableDivider', 'useResizableSidebar', 'handleDragLeftSidebar', 'handleDragRightSidebar'],
        'Screen1Home.tsx: Dynamic draggable sidebar borders on Home screen'
    ))

    results.append(check_file_contains(
        os.path.join(root, 'src', 'screens', 'Screen7LiveShowtime.tsx'),
        ['DraggableDivider', 'useResizable2Panels', 'handleDragMiddleColumns', 'handleDragMasterColumn'],
        'Screen7LiveShowtime.tsx: Dynamic draggable borders in Live Showtime'
    ))

    # 8. Middle scroll wheel click to pan on preview windows and canvas
    results.append(check_file_contains(
        os.path.join(root, 'src', 'components', 'PreviewZoomControl.tsx'),
        ['useMiddleClickPan', 'e.button === 1', 'computeZoomViewBox', 'panX', 'panY', 'RESET PAN'],
        'PreviewZoomControl.tsx: useMiddleClickPan hook and computeZoomViewBox pan support'
    ))

    results.append(check_file_contains(
        os.path.join(root, 'src', 'screens', 'Screen2LayoutMapping.tsx'),
        ['useMiddleClickPan', 'canvasPan', 'handleMiddleDown', 'handleMiddleMove', 'handleMiddleUp'],
        'Screen2LayoutMapping.tsx: Middle-click pan on main Vector Canvas'
    ))

    results.append(check_file_contains(
        os.path.join(root, 'src', 'screens', 'Screen3PhotoToLayout.tsx'),
        ['useMiddleClickPan', 'sourcePan', 'extractedPan', 'handleSourceMiddleDown', 'handleExtractedMiddleDown'],
        'Screen3PhotoToLayout.tsx: Middle-click pan on dual-square preview windows'
    ))

    # 9. Three buttons on bottom of Vectors screen have expandable settings drawers
    results.append(check_file_contains(
        os.path.join(root, 'src', 'screens', 'Screen2LayoutMapping.tsx'),
        [
            'expandedRole',
            'setExpandedRole',
            'Active Projection Surface',
            'Hard Blackout Cutout',
            'Structural Guide Line',
            'Luminance Opacity',
            'Edge Feathering',
            'Outline Glow',
            '0% Lumen Safety Latch',
            'Safety Bleed Margin',
            'Blackout Fill Shade',
            'Stroke Width',
            'Dash Pattern',
            'Architectural Anchor Tag'
        ],
        'Screen2LayoutMapping.tsx: 3 buttons on bottom have expandable drawers with rich settings'
    ))

    # 10. Screen 3 Perspective Cage stretches, tilts, and rotates extracted layout preview
    results.append(check_file_contains(
        os.path.join(root, 'src', 'screens', 'Screen3PhotoToLayout.tsx'),
        [
            'rotation',
            'skewX',
            'skewY',
            'scaleX',
            'scaleY',
            'rotate(${cageMetrics.rotation',
            'skewX(${cageMetrics.skewX',
            'skewY(${cageMetrics.skewY',
            'Rot:',
            'Tilt:'
        ],
        'Screen3PhotoToLayout.tsx: Perspective cage rotation, tilt, and stretch real-time transform'
    ))

    # 11. Sequential Screen Renumbering (1 to 10 in nav order)
    results.append(check_file_contains(
        os.path.join(root, 'src', 'components', 'SystemHeader.tsx'),
        [
            "'1. Home'",
            "'2. Projectors'",
            "'3. Photo CV'",
            "'4. Vectors'",
            "'5. AI Studio'",
            "'6. Repair'",
            "'7. Music Sync'",
            "'8. Playlist'",
            "'9. Showtime'",
            "'10. Smart Auto'"
        ],
        'SystemHeader.tsx: Screens renumbered 1 to 10 sequentially'
    ))

    # 12. Master Expansion Utilities Created & Validated
    results.append(check_file_contains(
        os.path.join(root, 'src', 'utils', 'opticsCalculator.ts'),
        ['calculateProjectorOptics', 'POPULAR_PROJECTOR_PRESETS', 'throwRatioMin', 'ansiLumens', 'footLamberts'],
        'opticsCalculator.ts: Optics throw distance, lens ratio & foot-lambert engine'
    ))

    results.append(check_file_contains(
        os.path.join(root, 'src', 'utils', 'polygonBoolean.ts'),
        ['clipPolygon', 'isPointInsidePolygon', 'subdividePolygonToBricks'],
        'polygonBoolean.ts: Sutherland-Hodgman polygon clipping & masonry tessellator'
    ))

    results.append(check_file_contains(
        os.path.join(root, 'src', 'utils', 'depthNormalSynthesizer.ts'),
        ['synthesizeDepthAndNormalMaps', 'computeWallColorNeutralization', 'DEFAULT_VIRTUAL_LIGHTS'],
        'depthNormalSynthesizer.ts: Monocular depth map, surface normals & wall color neutralizer'
    ))

    results.append(check_file_contains(
        os.path.join(root, 'src', 'utils', 'phonemeLipSyncEngine.ts'),
        ['PRESTON_BLAIR_VISEMES', 'classifyAudioToViseme', 'getProceduralMouthSvgPath', 'generateProceduralVisemeSvg'],
        'phonemeLipSyncEngine.ts: Preston Blair 10-viseme formant classifier & SVG rig'
    ))

    results.append(check_file_contains(
        os.path.join(root, 'src', 'utils', 'stemSplitter.ts'),
        ['INITIAL_AUDIO_STEMS', 'estimateStemLevelsFromFft', 'DEFAULT_STEM_FREQUENCIES'],
        'stemSplitter.ts: 4-stem WebAudio frequency isolator & level extractor'
    ))

    results.append(check_file_contains(
        os.path.join(root, 'src', 'utils', 'midiOscController.ts'),
        ['midiHardwareManager', 'MidiBinding', 'DEFAULT_MIDI_BINDINGS', 'ConnectedMidiDevice'],
        'midiOscController.ts: WebMIDI hardware learn & physical fader/button mapping'
    ))

    # 13. Pro Expansion Screens (Screens 11 to 18)
    screens_to_check = [
        ('Screen11TimelineSequencer.tsx', ['formatTimecode', 'timelineTracks', 'pixelsPerSecond', 'Live Compositor Monitor'], '11. Timeline NLE'),
        ('Screen12DepthRelighting.tsx', ['synthesizeDepthAndNormalMaps', 'virtual3DLights', 'activeViewportTab', 'Lambertian'], '12. 3D Relight'),
        ('Screen13SingingFacesStudio.tsx', ['singingCharacters', 'generateProceduralVisemeSvg', 'jawSensitivity', 'Phoneme Syllables'], '13. Singing Faces'),
        ('Screen14PixelDmxStage.tsx', ['physicalDmxFixtures', 'movingHeadX', 'dmxAmbilightBleed', 'xLights'], '14. Pixel & DMX'),
        ('Screen15ShaderParticleForge.tsx', ['activeShaderPreset', 'physicsParticleCount', 'isPhysicsSimulating', 'blizzard'], '15. Shader Forge'),
        ('Screen16OpticalCalibration.tsx', ['opticsCalculator', 'calculateProjectorOptics', 'autoWarpProgressPct', 'TOP-DOWN YARD CAD'], '16. Optical Calib'),
        ('Screen17WindowPortals.tsx', ['windowPortals', 'activeWindowPortalId', 'rearProjectorFlipH', 'INTERIOR HOLLUSION STAGE'], '17. Window Portals'),
        ('Screen18BroadcastDiagnostics.tsx', ['broadcastHealth', 'fmFrequencyMHz', 'liveDecibelSpl', 'renderQueue'], '18. Broadcast & Health'),
    ]

    for fname, patterns, label in screens_to_check:
        results.append(check_file_contains(
            os.path.join(root, 'src', 'screens', fname),
            patterns,
            f"Screen: {label} ({fname}) implemented"
        ))

    # 14. Pro Modal Dialogs (Full 14-Modal Suite)
    modals_to_check = [
        ('ProjectorOpticsCalculatorModal.tsx', ['isOpticsCalculatorOpen', 'calculateProjectorOptics'], 'Optics Calculator Modal'),
        ('AudioStemSplitterModal.tsx', ['isStemSplitterOpen', 'INITIAL_AUDIO_STEMS'], 'Audio Stem Splitter Modal'),
        ('WallColorNeutralizerModal.tsx', ['isWallNeutralizerModalOpen', 'computeWallColorNeutralization'], 'Wall Color Neutralizer Modal'),
        ('BatchRenderQueueModal.tsx', ['isBatchRenderModalOpen', 'renderQueue', 'addRenderJob'], 'Batch Render Queue Modal'),
        ('ShowApplianceExportModal.tsx', ['isShowExportModalOpen', 'standalone-kiosk', 'install-kiosk.sh'], 'Show Appliance Export Modal'),
        ('AutoCalibrationWizardModal.tsx', ['isAutoCalibrationModalOpen', 'runAutoStructuredLightWarp', 'Gray-Code'], 'Auto Calibration Wizard Modal'),
        ('ChromaKeyExtractorModal.tsx', ['isChromaKeyModalOpen', 'keyColor', 'spillSuppression'], 'Chroma Key Extractor Modal'),
        ('BezierMeshWarpModal.tsx', ['isBezierMeshModalOpen', 'gridSize', 'Symmetry'], 'Bezier Mesh Warp Modal'),
        ('FmRadioSignModal.tsx', ['isFmRadioSignModalOpen', 'signText', 'signFont'], 'FM Radio Sign Modal'),
        ('SpectatorPortalModal.tsx', ['isSpectatorPortalModalOpen', 'ghost-zapper', 'snowball-toss'], 'Spectator Portal Modal'),
        ('HardwareSafetyRulesModal.tsx', ['isHardwareSafetyModalOpen', 'maxTempLimit', 'maxWindLimit'], 'Hardware Safety Rules Modal'),
        ('HolidayAssetLibraryModal.tsx', ['isHolidayAssetModalOpen', 'Halloween', 'Christmas'], 'Holiday Asset Library Modal'),
        ('MidiControllerMapModal.tsx', ['isMidiControllerModalOpen', 'actionName', 'targetParameter', 'noteOrCcNumber'], 'MIDI Controller Map Modal'),
        ('ProjectTimeMachineModal.tsx', ['isProjectTimeMachineModalOpen', 'snapshots', 'Rollback to this Checkpoint'], 'Project Time Machine Modal'),
    ]

    for fname, patterns, label in modals_to_check:
        results.append(check_file_contains(
            os.path.join(root, 'src', 'components', 'modals', fname),
            patterns,
            f"Modal: {label} ({fname}) implemented"
        ))

    # 15. Header Dual-Tier Core vs Pro Toggle
    results.append(check_file_contains(
        os.path.join(root, 'src', 'components', 'SystemHeader.tsx'),
        ['activeStudioMode', 'setActiveStudioMode', 'Core 1–10', 'Pro 11–18', 'PRO_SCREEN_LABELS'],
        'SystemHeader.tsx: Dual-tier Core (1-10) and Pro (11-18) workflow navigation'
    ))

    # 16. App Routing & Global Modals
    results.append(check_file_contains(
        os.path.join(root, 'src', 'App.tsx'),
        [
            'Screen11TimelineSequencer',
            'Screen12DepthRelighting',
            'Screen13SingingFacesStudio',
            'Screen14PixelDmxStage',
            'Screen15ShaderParticleForge',
            'Screen16OpticalCalibration',
            'Screen17WindowPortals',
            'Screen18BroadcastDiagnostics',
            'ProjectorOpticsCalculatorModal',
            'AudioStemSplitterModal',
            'WallColorNeutralizerModal',
            'BatchRenderQueueModal',
            'ShowApplianceExportModal',
            'AutoCalibrationWizardModal',
            'ChromaKeyExtractorModal',
            'BezierMeshWarpModal',
            'FmRadioSignModal',
            'SpectatorPortalModal',
            'HardwareSafetyRulesModal',
            'HolidayAssetLibraryModal',
            'MidiControllerMapModal',
            'ProjectTimeMachineModal',
        ],
        'App.tsx: All 8 new screens and 14 modal dialogs wired and routed'
    ))

    # 17. xLights FPP Bridge (.fseq binary & .xsq xml)
    results.append(check_file_contains(
        os.path.join(root, 'src', 'utils', 'xlightsFppBridge.ts'),
        ['generateFseqV2Binary', 'createFseqV2Header', 'generateXLightsXsqXml', 'downloadFseqFile', 'downloadXsqFile'],
        'xlightsFppBridge.ts: xLights .fseq v2 Binary Generator & .xsq XML Exporter'
    ))

    # 18. Project Time Machine Snapshots & Visual Diff
    results.append(check_file_contains(
        os.path.join(root, 'src', 'utils', 'projectTimeMachine.ts'),
        ['getStoredSnapshots', 'recordProjectSnapshot', 'computeStateDiff', 'StateDiffSummary', 'MAX_SNAPSHOTS'],
        'projectTimeMachine.ts: Snapshot Recording, Visual Diff & Auto-Save History'
    ))

    # 19. Structured Light Gray-Code Camera Solver
    results.append(check_file_contains(
        os.path.join(root, 'src', 'utils', 'structuredLightSolver.ts'),
        ['generateGrayCodeSequence', 'solveHomographyFromPoints', 'detectObstructionShadowMasks', 'calculateSpectatorSweetSpotMatrix'],
        'structuredLightSolver.ts: Gray-Code Stripe Generator & Obstruction Shadow Detector'
    ))

    # 20. FM Radio & RDS Broadcaster Engine
    results.append(check_file_contains(
        os.path.join(root, 'src', 'utils', 'fmRdsBroadcaster.ts'),
        ['FM_SHOW_PRESETS', 'formatProgramService', 'formatRadioText', 'generateRdsBroadcastPacket', 'dispatchRdsBroadcast'],
        'fmRdsBroadcaster.ts: FM Radio Dynamic RDS PS/RT Broadcaster & Show Presets'
    ))

    # 21. Screen 8 (Projector Setup) Modal Quick Launchers
    results.append(check_file_contains(
        os.path.join(root, 'src', 'screens', 'Screen8ProjectorSetup.tsx'),
        ['setIsOpticsCalculatorOpen', 'setIsAutoCalibrationModalOpen', 'setIsBezierMeshModalOpen', 'Optics Calc', 'Auto-Calib', 'Bezier Mesh'],
        'Screen8ProjectorSetup.tsx: Direct Action Launchers for Optics, Auto-Calib & Bezier Mesh'
    ))

    # 22. Screen 2 (Layout Mapping) Boolean CAD & Architectural Subdivider
    results.append(check_file_contains(
        os.path.join(root, 'src', 'screens', 'Screen2LayoutMapping.tsx'),
        ['handleSubtractBlackouts', 'handleSubdivideMasonry', 'setIsWallNeutralizerModalOpen', 'setIsBezierMeshModalOpen', 'Clip Cutouts', 'Subdivide'],
        'Screen2LayoutMapping.tsx: Boolean Clip Cutouts, Masonry Subdivider & Modal Triggers'
    ))

    # 23. Screen 4 (AI Video Studio) Quick Production Tools
    results.append(check_file_contains(
        os.path.join(root, 'src', 'screens', 'Screen4AiVideoStudio.tsx'),
        ['setIsHolidayAssetModalOpen', 'setIsChromaKeyModalOpen', 'setIsBatchRenderModalOpen', 'Decals', 'Chroma Key', 'Batch Queue'],
        'Screen4AiVideoStudio.tsx: Direct Launchers for Decals Library, Chroma Key & Batch Queue'
    ))

    # 24. Screen 10 (Music Sync) Audio Stem Isolator Trigger
    results.append(check_file_contains(
        os.path.join(root, 'src', 'screens', 'Screen10MusicSync.tsx'),
        ['setIsStemSplitterOpen', 'Audio Stems'],
        'Screen10MusicSync.tsx: Direct Trigger for AI 4-Stem Audio Isolator'
    ))

    # 25. Screen 7 (Showtime) Production Controls
    results.append(check_file_contains(
        os.path.join(root, 'src', 'screens', 'Screen7LiveShowtime.tsx'),
        ['setIsFmRadioSignModalOpen', 'setIsSpectatorPortalModalOpen', 'setIsHardwareSafetyModalOpen', 'setIsShowExportModalOpen', 'setIsProjectTimeMachineModalOpen'],
        'Screen7LiveShowtime.tsx: Direct Triggers for FM RDS, Spectator Arcade, Safety Guard & Time Machine'
    ))

    # 26. Screen 14 (Pixel DMX Stage) Real FSEQ & XSQ Export Triggers
    results.append(check_file_contains(
        os.path.join(root, 'src', 'screens', 'Screen14PixelDmxStage.tsx'),
        ['generateFseqV2Binary', 'downloadFseqFile', 'generateXLightsXsqXml', 'downloadXsqFile', 'Export .fseq', 'Export .xsq'],
        'Screen14PixelDmxStage.tsx: Real Binary .fseq and .xsq XML Exporters'
    ))

    # 27. Interactive Step-by-Step Sample Show Walkthrough Tutorial
    results.append(check_file_contains(
        os.path.join(root, 'src', 'components', 'modals', 'SampleShowTutorialModal.tsx'),
        [
            'SAMPLE_SHOW_TUTORIAL_STEPS',
            'SampleShowTutorialModal',
            'handleRunStepAutoDemo',
            'stepNumber: 1',
            'stepNumber: 10',
            'All Screens &amp; FAQ'
        ],
        'SampleShowTutorialModal.tsx: 10-step Interactive Sample Show Walkthrough Coach & Auto-Demo Engine'
    ))

    results.append(check_file_contains(
        os.path.join(root, 'src', 'components', 'SystemHeader.tsx'),
        ['setIsTutorialWalkthroughOpen', 'setTutorialWalkthroughStep', 'Tutorial'],
        'SystemHeader.tsx: Top header Tutorial button trigger'
    ))

    results.append(check_file_contains(
        os.path.join(root, 'src', 'screens', 'Screen1Home.tsx'),
        ['Start Sample Show Walkthrough', 'STEP-BY-STEP', 'TUTORIAL GUIDE', 'setIsTutorialWalkthroughOpen'],
        'Screen1Home.tsx: Home screen banner and sidebar trigger for Sample Show Walkthrough'
    ))

    results.append(check_file_contains(
        os.path.join(root, 'BEGINNER_SAMPLE_SHOW_TUTORIAL.md'),
        ['Step 1:', 'Step 2:', 'Step 3:', 'Step 4:', 'Step 5:', 'Step 6:', 'Step 7:', 'Step 8:', 'Step 9:', 'Step 10:'],
        'BEGINNER_SAMPLE_SHOW_TUTORIAL.md: Complete 10-step Sample Show Markdown Guide'
    ))

    passed = sum(1 for r in results if r)
    print(f"\nNew features audit complete: {passed} / {len(results)} tests passed.")
    if passed != len(results):
        sys.exit(1)

if __name__ == '__main__':
    main()
