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

    # 1. App.tsx mounting AiProviderSettingsModal
    results.append(check_file_contains(
        os.path.join(root, 'src', 'App.tsx'),
        ['<AiProviderSettingsModal />', 'import { AiProviderSettingsModal }'],
        'App.tsx: AiProviderSettingsModal Mounted Globally'
    ))

    # 2. AiProviderSettingsModal.tsx
    results.append(check_file_contains(
        os.path.join(root, 'src', 'components', 'AiProviderSettingsModal.tsx'),
        ['FAL_KEY', 'REPLICATE_API_TOKEN', 'RUNWAYML_API_SECRET', 'http://127.0.0.1:8188', 'testAiProviderConnection'],
        'AiProviderSettingsModal.tsx: All 4 External Providers Supported'
    ))

    # 3. SystemHeader.tsx: AI Provider button
    results.append(check_file_contains(
        os.path.join(root, 'src', 'components', 'SystemHeader.tsx'),
        ['setAiSettingsModalOpen', 'aiProviderConfig.activeProvider'],
        'SystemHeader.tsx: AI Provider Trigger and Status Wired'
    ))

    # 4. Screen1Home.tsx: AI Provider button
    results.append(check_file_contains(
        os.path.join(root, 'src', 'screens', 'Screen1Home.tsx'),
        ['setAiSettingsModalOpen', 'AI PROVIDERS', 'aiProviderConfig.activeProvider'],
        'Screen1Home.tsx: AI Provider Config in Sidebar'
    ))

    # 5. Screen3PhotoToLayout.tsx: AI Draw House Outline + Drag & Drop
    results.append(check_file_contains(
        os.path.join(root, 'src', 'screens', 'Screen3PhotoToLayout.tsx'),
        ['handleDragOver', 'handleDrop', 'isDraggingFile', 'UPLOAD HOUSE OUTLINE', 'AI DRAW HOUSE OUTLINE', 'isAiDrawModalOpen', 'handleRunAiDrawOutline', 'ARCHITECTURAL_STYLE_PRESETS'],
        'Screen3PhotoToLayout.tsx: AI Façade Generator + Drag-and-Drop Outline Import'
    ))

    # 6. Screen4AiVideoStudio.tsx: AI Provider Trigger
    results.append(check_file_contains(
        os.path.join(root, 'src', 'screens', 'Screen4AiVideoStudio.tsx'),
        ['setAiSettingsModalOpen', 'AI PROVIDER:', 'aiProviderConfig.activeProvider'],
        'Screen4AiVideoStudio.tsx: AI Provider Configuration Button'
    ))

    # 7. architecturalOutlines.ts
    results.append(check_file_contains(
        os.path.join(root, 'src', 'utils', 'architecturalOutlines.ts'),
        ['victorian', 'modern', 'suburban', 'ranch', 'gothic', 'chalet', 'generateArchitecturalOutlineSvg'],
        'architecturalOutlines.ts: Architectural Styles & Vector SVG Generation'
    ))

    # 8. Screen10MusicSync.tsx: Music Synchronization & Audio-Reactive System
    results.append(check_file_contains(
        os.path.join(root, 'src', 'screens', 'Screen10MusicSync.tsx'),
        ['MUSIC SYNCHRONIZATION', 'TAP MODE', 'AUTO-DETECT BEATS', 'EDIT BEATS & FLAGS', 'Front Shape &amp; Color Modifiers', 'audioLevels'],
        'Screen10MusicSync.tsx: Manual Tap Mode, Auto Synthesizer, Edit Mode & Front Shape Modifiers'
    ))

    # 9. audioBeatAnalyzer.ts: Web Audio Engine & Beat Synthesizer
    results.append(check_file_contains(
        os.path.join(root, 'src', 'utils', 'audioBeatAnalyzer.ts'),
        ['audioReactiveEngine', 'autoSynthesizeBeatsAndFlags', 'TapTempoCalculator', 'getSpectrum'],
        'audioBeatAnalyzer.ts: FFT Spectrum, Offline Synthesizer & Tap-Tempo'
    ))

    # 10. useProjectionStore.ts: Screen 10 State & Actions
    results.append(check_file_contains(
        os.path.join(root, 'src', 'store', 'useProjectionStore.ts'),
        ['musicSyncTrackUrl', 'beatFlags', 'addBeatFlag', 'autoDetectBeatsAndFlags', 'updateLayerColorModifier', 'colorModifier'],
        'useProjectionStore.ts: Music Sync & Shape Color Modifier State & Actions'
    ))

    # 11. SystemHeader.tsx & App.tsx: Screen 10 Mounted and Navigable
    results.append(check_file_contains(
        os.path.join(root, 'src', 'components', 'SystemHeader.tsx'),
        ['Music Sync', 'MUSIC SYNCHRONIZATION & BEAT MAPPER'],
        'SystemHeader.tsx: Screen 10 Subtitle & Navigation Pill'
    ))
    results.append(check_file_contains(
        os.path.join(root, 'src', 'App.tsx'),
        ['Screen10MusicSync', 'case 10:'],
        'App.tsx: Screen10MusicSync Mounted in Screen Router'
    ))

    # 12. ProjectorTestPatternRenderer.tsx: Multi-Pattern Calibration Suite
    results.append(check_file_contains(
        os.path.join(root, 'src', 'components', 'ProjectorTestPatternRenderer.tsx'),
        ['smpte-bars', 'focus-star', 'geometry-circles', 'greyscale-ramp', 'color-purity', 'ProjectorTestPatternRenderer'],
        'ProjectorTestPatternRenderer.tsx: All 6 Calibration Patterns Implemented'
    ))

    # 13. useProjectionStore.ts, Screen1Home.tsx & ProjectorOutputView.tsx: Pattern Switcher Wired
    results.append(check_file_contains(
        os.path.join(root, 'src', 'store', 'useProjectionStore.ts'),
        ['testPatternType', 'purityColor', 'setTestPatternType', 'setPurityColor'],
        'useProjectionStore.ts: Calibration Pattern State & Actions'
    ))
    results.append(check_file_contains(
        os.path.join(root, 'src', 'screens', 'Screen1Home.tsx'),
        ['testPatternType', 'setTestPatternType', 'setPurityColor', 'SMPTE Bars', 'Focus Star'],
        'Screen1Home.tsx: Interactive Calibration Pattern Selector Deck'
    ))
    results.append(check_file_contains(
        os.path.join(root, 'src', 'components', 'ProjectorOutputView.tsx'),
        ['ProjectorTestPatternRenderer', 'testPatternType', 'purityColor', 'setTestPatternType'],
        'ProjectorOutputView.tsx: Multi-Pattern Projector Output Renderer & HUD Selector'
    ))

    print(f"\nAudit complete: {sum(results)} / {len(results)} tests passed.")
    if not all(results):
        sys.exit(1)

if __name__ == '__main__':
    main()
