import React, { useMemo, useRef, useState } from 'react';
import {
  RefreshCw,
  Grid,
  Zap,
  Save,
  ArrowLeft,
  ArrowRight,
  Sliders,
  Eye,
  Monitor,
  Download,
  Upload,
  Check,
  RotateCcw,
  Sparkles,
  Calculator,
  Camera,
  Layers,
} from 'lucide-react';
import {
  AUSTIN_HOUSE_ASSETS,
  ProjectionStudioState,
  ProjectorOutput,
  VectorVertex,
  useProjectionStore,
} from '../store/useProjectionStore';
import { computeSCurveBlendAlpha } from '../utils/projectionMath';
import {
  PreviewZoomControl,
  computeZoomViewBox,
  useMiddleClickPan,
} from '../components/PreviewZoomControl';
import { postGenerateEdgeBlendLUT as postEdgeBlendLut } from '../utils/apiClient';

const TOPOLOGY_PRESETS: ProjectionStudioState['arrayTopology'][] = [
  '1x2 Horizontal',
  '2x1 Vertical',
  '1x4 Panoramic',
  '2x2 Quad Matrix',
  'Luminance Stack',
];

export const Screen8ProjectorSetup: React.FC = () => {
  const {
    arrayTopology,
    projectors,
    selectedProjectorId,
    selectedSeamId,
    enableSoftEdgeBlending,
    blendCurve,
    blendGamma,
    featherInsetPx,
    blackLevelUplift,
    sendCalibrationGridToAll,
    calibrationOverlayMode,
    identifyingProjectorId,
    detectDisplayOutputs,
    setArrayTopology,
    setSelectedProjectorId,
    updateProjector,
    flashIdentifyProjector,
    setEdgeBlendParams,
    saveArrayPreset,
    setActiveScreen,
    navigateBack,
    saveCurrentProject,
    appendConsoleLog,
    setIsOpticsCalculatorOpen,
    setIsAutoCalibrationModalOpen,
    setIsBezierMeshModalOpen,
    showToast,
    globalSettings,
    updateGlobalSettings,
    setSelectedOutputDisplay,
    projectorTestPattern,
    testPatternType,
    setProjectorTestPattern,
    setTestPatternType,
  } = useProjectionStore();

  const [draggingProjId, setDraggingProjId] = useState<string | null>(null);
  const [hdmiDiagResult, setHdmiDiagResult] = useState<string | null>(null);

  const runHdmiPreflightCheck = async () => {
    const anyWin = window as unknown as {
      getScreenDetails?: () => Promise<{
        screens: { isPrimary?: boolean; width: number; height: number; label?: string }[];
      }>;
    };
    if (typeof anyWin.getScreenDetails === 'function') {
      try {
        const details = await anyWin.getScreenDetails();
        const total = details.screens.length;
        const external = details.screens.filter((s) => !s.isPrimary).length;
        const msg =
          external > 0
            ? `PASS: ${total} displays (${external} external HDMI/DP)`
            : `SINGLE DISPLAY (${total}x): Enable Virtual Screen`;
        setHdmiDiagResult(msg);
        showToast(`HDMI Preflight: ${msg}`);
        return;
      } catch {
        setHdmiDiagResult('PERMISSION NEEDED: Allow Window Management');
        showToast('Grant Window Management permission in browser to detect HDMI');
        return;
      }
    }
    setHdmiDiagResult('FALLBACK: Browser lacks getScreenDetails (Use Virtual Screen)');
    showToast('Window Management API unavailable — use Virtual Screen Mode');
  };
  const [draggingCorner, setDraggingCorner] = useState<{
    projId: string;
    cornerIdx: number;
  } | null>(null);
  const [dragMode, setDragMode] = useState<'move' | 'pins'>('move');
  const [setupZoom, setSetupZoom] = useState<number>(100);

  // Middle scroll wheel click to pan on projector setup canvas
  const {
    pan: setupPan,
    resetPan: resetSetupPan,
    handlePointerDown: handleSetupMiddleDown,
    handlePointerMove: handleSetupMiddleMove,
    handlePointerUp: handleSetupMiddleUp,
    handleMouseDown: handleSetupMiddleMouseDown,
  } = useMiddleClickPan();
  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number }>({
    dx: 0,
    dy: 0,
  });

  const activeProjectors = useMemo(
    () => projectors.filter((p) => p.enabled),
    [projectors]
  );

  const selectedProjector = useMemo(
    () =>
      projectors.find((p) => p.id === selectedProjectorId) || projectors[0],
    [projectors, selectedProjectorId]
  );

  // Dynamically compute pairwise overlap rectangles between enabled projectors
  const overlapZones = useMemo(() => {
    const zones: {
      id: string;
      label: string;
      x: number;
      y: number;
      width: number;
      height: number;
      pixelWidth: number;
    }[] = [];

    for (let i = 0; i < activeProjectors.length; i++) {
      for (let j = i + 1; j < activeProjectors.length; j++) {
        const a = activeProjectors[i].frustumRect;
        const b = activeProjectors[j].frustumRect;
        const x1 = Math.max(a.x, b.x);
        const y1 = Math.max(a.y, b.y);
        const x2 = Math.min(a.x + a.width, b.x + b.width);
        const y2 = Math.min(a.y + a.height, b.y + b.height);

        if (x2 > x1 && y2 > y1) {
          const width = x2 - x1;
          const height = y2 - y1;
          const pixelWidth = Math.round((width / 470) * 1920);
          zones.push({
            id: `seam-${i + 1}-${j + 1}`,
            label: `SEAM P${i + 1}↔P${j + 1}`,
            x: x1,
            y: y1,
            width,
            height,
            pixelWidth,
          });
        }
      }
    }
    return zones;
  }, [activeProjectors]);

  // Compute virtual canvas readout based on topology & overlap
  const virtualCanvasReadout = useMemo(() => {
    if (arrayTopology === '1x2 Horizontal') {
      const overlapPx = overlapZones[0]?.pixelWidth || 240;
      return `${3840 - overlapPx} x 1080 px (1x2 Blended)`;
    }
    if (arrayTopology === '2x1 Vertical') return '1920 x 1960 px (2x1 Blended)';
    if (arrayTopology === '1x4 Panoramic') return '7120 x 1080 px (1x4 Array)';
    if (arrayTopology === '2x2 Quad Matrix')
      return '3600 x 1960 px (2x2 Matrix)';
    if (arrayTopology === 'Luminance Stack')
      return '1920 x 1080 px (Dual 200% Stack)';
    return '1920 x 1080 px';
  }, [arrayTopology, overlapZones]);

  // Pre-compute mathematical S-Curve plot points for the live inspector SVG visualizer
  const sCurvePlot = useMemo(() => {
    const ptsA: string[] = [];
    const ptsB: string[] = [];
    const ptsSum: string[] = [];

    const pSteepness =
      blendCurve === 'Linear Ramp'
        ? 1.0
        : blendCurve === 'Quadratic'
        ? 3.0
        : 2.0;

    const upliftNorm = (blackLevelUplift / 100) * 0.15;
    const steps = 40;

    for (let i = 0; i <= steps; i++) {
      const d = i / steps;
      let alphaA: number;
      let alphaB: number;

      if (!enableSoftEdgeBlending) {
        alphaA = d < 0.5 ? 1.0 : 0.0;
        alphaB = d >= 0.5 ? 1.0 : 0.0;
      } else {
        const rawA = computeSCurveBlendAlpha(1 - d, blendGamma, pSteepness);
        const rawB = computeSCurveBlendAlpha(d, blendGamma, pSteepness);
        alphaA = Math.min(1.0, rawA + upliftNorm * (1 - rawA));
        alphaB = Math.min(1.0, rawB + upliftNorm * (1 - rawB));
      }

      const sum = alphaA + alphaB;

      // Coordinate mapping for SVG width="240" height="68":
      // Graph X ranges from 12 to 228 (width = 216)
      // Graph Y: alpha = 0.0 -> Y = 56, alpha = 1.0 -> Y = 14
      // Delta Y for 1.0 = 42px
      const x = 12 + d * 216;
      const yA = 56 - alphaA * 42;
      const yB = 56 - alphaB * 42;
      const ySum = Math.max(4, Math.min(64, 56 - sum * 42));

      ptsA.push(`${x.toFixed(1)},${yA.toFixed(1)}`);
      ptsB.push(`${x.toFixed(1)},${yB.toFixed(1)}`);
      ptsSum.push(`${x.toFixed(1)},${ySum.toFixed(1)}`);
    }

    return {
      polylineA: ptsA.join(' '),
      polylineB: ptsB.join(' '),
      polylineSum: ptsSum.join(' '),
      pSteepness,
    };
  }, [blendCurve, blendGamma, blackLevelUplift, enableSoftEdgeBlending]);

  const [isSavingLut, setIsSavingLut] = useState(false);

  const handleSaveArrayPreset = async () => {
    setIsSavingLut(true);
    saveArrayPreset();
    try {
      const overlapPx = overlapZones[0]?.pixelWidth || 240;
      const pSteepness =
        blendCurve === 'Linear Ramp'
          ? 1.0
          : blendCurve === 'Quadratic'
          ? 3.0
          : 2.0;

      await postEdgeBlendLut({
        overlap_width_px: overlapPx,
        gamma: blendGamma,
        steepness_p: pSteepness,
        black_level_uplift_ire: blackLevelUplift,
      });
      appendConsoleLog(
        `Edge-Blend LUT Synced to Backend: ${overlapPx}px seam, γ=${blendGamma.toFixed(2)}, p=${pSteepness.toFixed(1)}`,
        'info'
      );
    } catch (err) {
      console.warn('Backend edge-blend LUT sync fallback:', err);
    } finally {
      setIsSavingLut(false);
    }
  };

  const exportArrayLutJson = () => {
    const overlapPx = overlapZones[0]?.pixelWidth || 240;
    const pSteepness =
      blendCurve === 'Linear Ramp'
        ? 1.0
        : blendCurve === 'Quadratic'
        ? 3.0
        : 2.0;

    const upliftNorm = (blackLevelUplift / 100) * 0.15;
    const lut256: {
      index: number;
      normalizedDistance: number;
      alphaProjectorA: number;
      alphaProjectorB: number;
      combinedLuminance: number;
    }[] = [];

    for (let i = 0; i <= 255; i++) {
      const d = i / 255;
      let alphaA: number;
      let alphaB: number;

      if (!enableSoftEdgeBlending) {
        alphaA = d < 0.5 ? 1.0 : 0.0;
        alphaB = d >= 0.5 ? 1.0 : 0.0;
      } else {
        const rawA = computeSCurveBlendAlpha(1 - d, blendGamma, pSteepness);
        const rawB = computeSCurveBlendAlpha(d, blendGamma, pSteepness);
        alphaA = Math.min(1.0, rawA + upliftNorm * (1 - rawA));
        alphaB = Math.min(1.0, rawB + upliftNorm * (1 - rawB));
      }

      lut256.push({
        index: i,
        normalizedDistance: Number(d.toFixed(4)),
        alphaProjectorA: Number(alphaA.toFixed(5)),
        alphaProjectorB: Number(alphaB.toFixed(5)),
        combinedLuminance: Number((alphaA + alphaB).toFixed(5)),
      });
    }

    const payload = {
      format: 'LUMEN-MAP-AI-ARRAY-LUT-CALIBRATION',
      version: '3.5.0',
      exportTimestamp: new Date().toISOString(),
      arrayTopology,
      virtualCanvas: virtualCanvasReadout,
      edgeBlendingParameters: {
        enabled: enableSoftEdgeBlending,
        formula: blendCurve,
        gamma: blendGamma,
        steepnessP: pSteepness,
        featherInsetPx,
        blackLevelUpliftIRE: blackLevelUplift,
        overlapZones: overlapZones.map((z) => ({
          seamId: z.id,
          label: z.label,
          pixelWidth: z.pixelWidth,
          bounds: { x: z.x, y: z.y, width: z.width, height: z.height },
        })),
        lutSamplesCount: lut256.length,
        lutSamples: lut256,
      },
      calibratedProjectors: activeProjectors.map((p, idx) => ({
        index: idx + 1,
        id: p.id,
        name: p.name,
        resolution: p.resolution,
        refreshRate: p.refreshRate,
        mountFlip: p.mountFlip,
        frustumRect: p.frustumRect,
        cornerPins: p.cornerPins,
        lumenMatchPercent: p.lumenMatchPercent,
        rgbGain: p.rgbGain,
      })),
    };

    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.download = `projector-array-lut-config-${Date.now()}.json`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(url);

    appendConsoleLog(
      `Exported Array & S-Curve LUT configuration (.json) for ${activeProjectors.length} projectors`,
      'info'
    );
  };

  const lutFileInputRef = useRef<HTMLInputElement | null>(null);
  const [importSuccessBadge, setImportSuccessBadge] = useState<string | null>(null);

  const handleImportLutFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);

        // 1. Restore arrayTopology
        if (data.arrayTopology && TOPOLOGY_PRESETS.includes(data.arrayTopology)) {
          setArrayTopology(data.arrayTopology);
        }

        // 2. Restore edgeBlendingParameters
        const edgeParams = data.edgeBlendingParameters || {};
        setEdgeBlendParams({
          ...(typeof edgeParams.enabled === 'boolean'
            ? { enableSoftEdgeBlending: edgeParams.enabled }
            : {}),
          ...(edgeParams.formula ? { blendCurve: edgeParams.formula } : {}),
          ...(typeof edgeParams.gamma === 'number'
            ? { blendGamma: edgeParams.gamma }
            : {}),
          ...(typeof edgeParams.featherInsetPx === 'number'
            ? { featherInsetPx: edgeParams.featherInsetPx }
            : {}),
          ...(typeof edgeParams.blackLevelUpliftIRE === 'number'
            ? { blackLevelUplift: edgeParams.blackLevelUpliftIRE }
            : typeof edgeParams.blackLevelUplift === 'number'
            ? { blackLevelUplift: edgeParams.blackLevelUplift }
            : {}),
        });

        // 3. Restore matching calibratedProjectors
        if (Array.isArray(data.calibratedProjectors)) {
          data.calibratedProjectors.forEach((cp: any) => {
            if (!cp.id) return;
            const patch: Partial<ProjectorOutput> = {};
            if (cp.frustumRect) patch.frustumRect = cp.frustumRect;
            if (
              cp.cornerPins &&
              Array.isArray(cp.cornerPins) &&
              cp.cornerPins.length === 4
            ) {
              patch.cornerPins = cp.cornerPins as [
                VectorVertex,
                VectorVertex,
                VectorVertex,
                VectorVertex
              ];
            }
            if (typeof cp.lumenMatchPercent === 'number') {
              patch.lumenMatchPercent = cp.lumenMatchPercent;
            }
            if (cp.rgbGain && typeof cp.rgbGain.r === 'number') {
              patch.rgbGain = cp.rgbGain;
            }
            if (cp.mountFlip) {
              patch.mountFlip = cp.mountFlip;
            }
            updateProjector(cp.id, patch);
          });
        }

        const projectorCount = Array.isArray(data.calibratedProjectors)
          ? data.calibratedProjectors.length
          : 0;
        appendConsoleLog(
          `Imported Array LUT configuration (.json): Restored ${projectorCount} calibrated projectors & edge-blend parameters (${data.arrayTopology || 'custom'})`,
          'info'
        );
        setImportSuccessBadge(`LUT IMPORTED (${file.name})`);
        setTimeout(() => {
          setImportSuccessBadge(null);
        }, 4000);
      } catch (err) {
        console.error('Failed to parse Array LUT JSON:', err);
        appendConsoleLog(
          `Failed to import Array LUT: Invalid JSON format (${err instanceof Error ? err.message : String(err)})`,
          'warning'
        );
      } finally {
        if (e.target) {
          e.target.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const handleAutoAlignOverlapSeams = () => {
    // 240px seam in canvas coordinates: (240 / 1920) * 470 = 58.75 canvas units
    const seamOverlapPx = 240;
    const seamCanvasWidth = 58.75;

    activeProjectors.forEach((p, idx) => {
      let rect = { ...p.frustumRect };

      if (arrayTopology === '1x2 Horizontal') {
        const w = 470;
        const h = 264;
        const totalW = w * 2 - seamCanvasWidth; // 881.25
        const startX = (980 - totalW) / 2; // 49.375
        const startY = (500 - h) / 2; // 118
        rect = {
          x: Number((startX + idx * (w - seamCanvasWidth)).toFixed(3)),
          y: startY,
          width: w,
          height: h,
        };
      } else if (arrayTopology === '1x4 Panoramic') {
        const w = 260;
        const h = 250;
        const step = w - seamCanvasWidth; // 201.25
        const totalW = (activeProjectors.length - 1) * step + w;
        const startX = Math.max(20, (980 - totalW) / 2);
        const startY = 125;
        rect = {
          x: Number((startX + idx * step).toFixed(3)),
          y: startY,
          width: w,
          height: h,
        };
      } else if (arrayTopology === '2x2 Quad Matrix') {
        const w = 460;
        const h = 230;
        const stepX = w - seamCanvasWidth; // 401.25
        const stepY = 195;
        const startX = (980 - (stepX + w)) / 2; // 59.375
        const startY = 35;
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        rect = {
          x: Number((startX + col * stepX).toFixed(3)),
          y: startY + row * stepY,
          width: w,
          height: h,
        };
      } else if (arrayTopology === '2x1 Vertical') {
        const w = 580;
        const h = 235;
        const seamH = 52.22; // (240 / 1080) * 235
        const totalH = h * 2 - seamH;
        const startY = (500 - totalH) / 2;
        rect = {
          x: 200,
          y: Number((startY + idx * (h - seamH)).toFixed(3)),
          width: w,
          height: h,
        };
      } else if (
        arrayTopology === 'Luminance Stack' ||
        arrayTopology === '1x1 Single'
      ) {
        rect = { x: 140, y: 100, width: 700, height: 300 };
      }

      const defaultPins: [VectorVertex, VectorVertex, VectorVertex, VectorVertex] = [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height },
        { x: rect.x, y: rect.y + rect.height },
      ];

      updateProjector(p.id, {
        frustumRect: rect,
        cornerPins: defaultPins,
      });
    });

    setEdgeBlendParams({
      featherInsetPx: seamOverlapPx,
      enableSoftEdgeBlending: true,
    });

    appendConsoleLog(
      `Hardware Calibration: Auto-aligned ${activeProjectors.length} active projectors into clean 240px seam overlap (${arrayTopology}) & reset corner pins to frustums`,
      'info'
    );
  };

  const handleNormalizeAllProjectors = () => {
    projectors.forEach((p) => {
      updateProjector(p.id, {
        lumenMatchPercent: 100,
        rgbGain: { r: 100, g: 100, b: 100 },
      });
    });
    appendConsoleLog(
      `Hardware Calibration: Normalized all ${projectors.length} projectors to 100% Lumens & Flat RGB Gain (100, 100, 100)`,
      'info'
    );
  };

  const handleTakeOverScreens = async () => {
    const anyWin = window as any;
    let screenDetails: any = null;

    if (typeof anyWin.getScreenDetails === 'function') {
      try {
        screenDetails = await anyWin.getScreenDetails();
      } catch (err) {
        console.warn('getScreenDetails access error:', err);
      }
    }

    const availableScreens = screenDetails?.screens || [];
    const externalScreens = availableScreens.filter((s: any) => !s.isPrimary);
    const targetProjectors = ['proj-1', 'proj-2', 'proj-3'];

    targetProjectors.forEach((projId, idx) => {
      const targetScreen = externalScreens[idx] || (availableScreens.length > 1 ? availableScreens[idx + 1] : null);
      let features = 'menubar=no,toolbar=no,location=no,status=no,resizable=yes';

      if (targetScreen) {
        const left = targetScreen.availLeft ?? targetScreen.left ?? 0;
        const top = targetScreen.availTop ?? targetScreen.top ?? 0;
        const width = targetScreen.availWidth ?? targetScreen.width ?? 1920;
        const height = targetScreen.availHeight ?? targetScreen.height ?? 1080;
        features += `,left=${left},top=${top},width=${width},height=${height}`;
      } else {
        features += `,left=${150 + idx * 340},top=${100 + idx * 60},width=1280,height=720`;
      }

      const pop = window.open(`/?projector=true&proj=${projId}&fullscreen=auto`, `LumenProjector_${projId}`, features);
      if (pop && targetScreen) {
        try {
          pop.moveTo(targetScreen.availLeft ?? targetScreen.left, targetScreen.availTop ?? targetScreen.top);
        } catch {}
      }
    });

    showToast('Taking over Screens 2–4: Fullscreen output feeds launched');
  };

  const resetSelectedProjectorPins = () => {
    const { x, y, width, height } = selectedProjector.frustumRect;
    const defaultPins: [
      VectorVertex,
      VectorVertex,
      VectorVertex,
      VectorVertex
    ] = [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ];
    updateProjector(selectedProjector.id, { cornerPins: defaultPins });
  };

  const handleCornerPointerDown = (
    e: React.PointerEvent<SVGElement>,
    projId: string,
    cornerIdx: number
  ) => {
    e.stopPropagation();
    setSelectedProjectorId(projId);
    setDraggingCorner({ projId, cornerIdx });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleCanvasPointerDown = (
    e: React.PointerEvent<SVGGElement>,
    projId: string
  ) => {
    e.stopPropagation();
    setSelectedProjectorId(projId);
    const proj = projectors.find((p) => p.id === projId);
    if (!proj) return;
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const transformed = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    setDraggingProjId(projId);
    setDragOffset({
      dx: transformed.x - proj.frustumRect.x,
      dy: transformed.y - proj.frustumRect.y,
    });
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const transformed = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    // 1. Dragging single corner pin of selected projector
    if (draggingCorner) {
      const proj = projectors.find((p) => p.id === draggingCorner.projId);
      if (proj) {
        const { x, y, width, height } = proj.frustumRect;
        const currentPins: [
          VectorVertex,
          VectorVertex,
          VectorVertex,
          VectorVertex
        ] =
          proj.cornerPins && proj.cornerPins.length === 4
            ? [...proj.cornerPins]
            : [
                { x, y },
                { x: x + width, y },
                { x: x + width, y: y + height },
                { x, y: y + height },
              ];

        currentPins[draggingCorner.cornerIdx] = {
          x: Math.round(transformed.x),
          y: Math.round(transformed.y),
        };
        updateProjector(proj.id, { cornerPins: currentPins });
      }
      return;
    }

    // 2. Dragging entire projector throw frustum
    if (!draggingProjId) return;

    const proj = projectors.find((p) => p.id === draggingProjId);
    if (!proj) return;

    // Allow dragging projector throw rectangles up to 150%+ outside the 100% house frame
    const newX = Math.max(
      -450,
      Math.min(1430 - proj.frustumRect.width, Math.round(transformed.x - dragOffset.dx))
    );
    const newY = Math.max(
      -250,
      Math.min(750 - proj.frustumRect.height, Math.round(transformed.y - dragOffset.dy))
    );

    const deltaX = newX - proj.frustumRect.x;
    const deltaY = newY - proj.frustumRect.y;

    const currentPins: [
      VectorVertex,
      VectorVertex,
      VectorVertex,
      VectorVertex
    ] =
      proj.cornerPins && proj.cornerPins.length === 4
        ? proj.cornerPins
        : [
            { x: proj.frustumRect.x, y: proj.frustumRect.y },
            {
              x: proj.frustumRect.x + proj.frustumRect.width,
              y: proj.frustumRect.y,
            },
            {
              x: proj.frustumRect.x + proj.frustumRect.width,
              y: proj.frustumRect.y + proj.frustumRect.height,
            },
            {
              x: proj.frustumRect.x,
              y: proj.frustumRect.y + proj.frustumRect.height,
            },
          ];

    const shiftedPins = currentPins.map((p) => ({
      x: p.x + deltaX,
      y: p.y + deltaY,
    })) as [VectorVertex, VectorVertex, VectorVertex, VectorVertex];

    updateProjector(draggingProjId, {
      frustumRect: {
        ...proj.frustumRect,
        x: newX,
        y: newY,
      },
      cornerPins: shiftedPins,
    });
  };

  const handleCanvasPointerUp = () => {
    setDraggingCorner(null);
    setDraggingProjId(null);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0c1018] text-slate-100 select-none overflow-hidden">
      {/* TOP HARDWARE DETECTION & ARRAY PRESET BAR */}
      <div className="h-12 bg-[#121926] border-b border-[#222d42] px-4 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={navigateBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#182335] hover:bg-[#202f48] border border-cyan-500/60 hover:border-cyan-400 text-cyan-300 hover:text-white text-xs font-extrabold tracking-wider uppercase transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)] cursor-pointer"
            title="Go back to previous screen (Alt+Left)"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
            <span>BACK</span>
          </button>

          <button
            type="button"
            onClick={saveCurrentProject}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/70 hover:border-emerald-400 text-emerald-300 hover:text-white text-xs font-extrabold tracking-wider uppercase transition-all shadow-[0_0_10px_rgba(16,185,129,0.25)] cursor-pointer"
            title="Save current project to storage (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5 text-emerald-400" />
            <span>SAVE</span>
          </button>

          <div className="h-6 w-[1px] bg-[#28344b] mx-1" />

          <button
            type="button"
            onClick={detectDisplayOutputs}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-[0_0_12px_rgba(37,99,235,0.4)] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            DETECT DISPLAY OUTPUTS
          </button>

          <div className="h-5 w-[1px] bg-[#28344b] mx-1" />

          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Array Presets:
          </span>
          <div className="flex items-center gap-1">
            {TOPOLOGY_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setArrayTopology(preset)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors ${
                  arrayTopology === preset
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                    : 'bg-[#1a2232] border-[#2b374e] text-slate-300 hover:text-white'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* SEND CALIBRATION GRID TO ALL PROJECTORS Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sendCalibrationGridToAll}
              onChange={(e) =>
                setEdgeBlendParams({
                  sendCalibrationGridToAll: e.target.checked,
                })
              }
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-[#222c40] rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 peer-checked:after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 relative" />
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">
              SEND CALIBRATION GRID TO ALL PROJECTORS
            </span>
          </label>

          {/* Specialized Studio Modal Quick Tools */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsOpticsCalculatorOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#162032] hover:bg-[#1f2d47] border border-[#2c3d59] hover:border-cyan-400 text-cyan-300 hover:text-white text-[11px] font-bold tracking-wide transition-all shadow-sm cursor-pointer"
              title="Open Projector Optics & Throw Distance Calculator (Feature #3)"
            >
              <Calculator className="w-3.5 h-3.5 text-cyan-400" />
              <span>Optics Calc</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAutoCalibrationModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#162032] hover:bg-[#1f2d47] border border-[#2c3d59] hover:border-emerald-400 text-emerald-300 hover:text-white text-[11px] font-bold tracking-wide transition-all shadow-sm cursor-pointer"
              title="Open Structured Light Gray-Code Camera Calibration Wizard (Feature #4)"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span>Auto-Calib</span>
            </button>

            <button
              type="button"
              onClick={() => setIsBezierMeshModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#162032] hover:bg-[#1f2d47] border border-[#2c3d59] hover:border-amber-400 text-amber-300 hover:text-white text-[11px] font-bold tracking-wide transition-all shadow-sm cursor-pointer"
              title="Open Sub-Grid NxN Bezier Mesh Warp Matrix (Feature #1)"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Bezier Mesh</span>
            </button>
          </div>

          {/* TOTAL VIRTUAL CANVAS READOUT Badge */}
          <div className="px-3 py-1 rounded bg-[#182234] border border-cyan-500/40 text-[11px] font-mono font-bold text-cyan-300">
            VIRTUAL CANVAS: {virtualCanvasReadout}
          </div>
        </div>
      </div>

      {/* MAIN 3-COLUMN WORKSPACE */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* LEFT CONNECTED HDMI / DISPLAYPORT HARDWARE LIST */}
        <aside className="w-[270px] shrink-0 bg-[#101622] border-r border-[#1f293a] p-3.5 flex flex-col gap-2.5 overflow-y-auto">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xs font-bold tracking-wider uppercase text-slate-300">
              CONNECTED DISPLAY OUTPUTS
            </h2>
            <span className="text-[10px] font-mono text-emerald-400">
              4 Ports Ready
            </span>
          </div>

          {/* Direct Hardware Display Takeover Button */}
          <button
            type="button"
            onClick={handleTakeOverScreens}
            className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_14px_rgba(6,182,212,0.35)] transition-all cursor-pointer"
            title="Launch and take over physical Displays 2, 3, and 4 in Fullscreen"
          >
            <Monitor className="w-4 h-4 text-white" />
            <span>TAKE OVER SCREENS 2–4</span>
          </button>

          {/* Virtual Screen Output Option (Single-Monitor / No-HDMI Simulation) */}
          <div className="rounded-lg p-2.5 bg-[#151d2c] border border-cyan-500/30 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="screen8-virtual-toggle"
                className="text-[11px] font-bold text-cyan-300 uppercase tracking-wide flex items-center gap-1.5 cursor-pointer"
              >
                <input
                  id="screen8-virtual-toggle"
                  type="checkbox"
                  checked={Boolean(globalSettings?.virtualScreenEnabled)}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    const res =
                      globalSettings?.virtualScreenResolution || '1920x1080';
                    updateGlobalSettings({ virtualScreenEnabled: enabled });
                    setSelectedOutputDisplay(
                      enabled
                        ? `Virtual Screen (${res === '1280x720' ? '1280x720' : '1920x1080'})`
                        : 'HDMI 1 (1920x1080)'
                    );
                    showToast(
                      enabled
                        ? `Virtual Screen Mode Enabled (${res})`
                        : 'Switched back to Physical HDMI Output Mode'
                    );
                  }}
                  className="rounded border-slate-600 bg-[#0c1017] text-cyan-500"
                />
                Virtual Screen
              </label>
              <select
                aria-label="Virtual Screen Resolution"
                value={globalSettings?.virtualScreenResolution || '1920x1080'}
                onChange={(e) =>
                  updateGlobalSettings({
                    virtualScreenResolution: e.target.value as NonNullable<
                      typeof globalSettings.virtualScreenResolution
                    >,
                  })
                }
                className="bg-[#0d131d] border border-[#2c3952] rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-200"
              >
                <option value="1920x1080">1920x1080</option>
                <option value="1280x720">1280x720</option>
                <option value="3840x2160">3840x2160</option>
                <option value="1080x1920">1080x1920</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                const res =
                  globalSettings?.virtualScreenResolution || '1920x1080';
                const [w, h] = res.split('x').map(Number);
                window.open(
                  `/?projector=true&virtual=true&res=${res}`,
                  'LumenVirtualScreen',
                  `width=${Math.min(w || 1280, 1280)},height=${Math.min(h || 720, 720)},menubar=no,toolbar=no,location=no,status=no`
                );
                showToast(`Opened Virtual Screen (${res})`);
              }}
              className="w-full py-1.5 px-2.5 rounded bg-[#1b2537] hover:bg-[#25324b] border border-cyan-500/40 text-[10px] font-bold uppercase tracking-wider text-cyan-200 transition-colors cursor-pointer"
            >
              Open Virtual Screen Window
            </button>

            <button
              type="button"
              onClick={runHdmiPreflightCheck}
              className="w-full py-1 px-2 rounded bg-[#0f1726] hover:bg-[#1a263c] border border-slate-600/60 text-[10px] font-bold uppercase tracking-wider text-slate-300 transition-colors cursor-pointer"
            >
              Test HDMI &amp; Displays
            </button>
            {hdmiDiagResult && (
              <div className="text-[10px] font-mono text-cyan-200 bg-[#0c111b] border border-slate-700 rounded px-2 py-1">
                {hdmiDiagResult}
              </div>
            )}

            {/* Quick Test Pattern Trigger */}
            <div className="pt-1 border-t border-slate-700/60">
              <div className="text-[9px] font-mono uppercase text-slate-400 mb-1">
                Output Test Pattern:
              </div>
              <div className="grid grid-cols-4 gap-1">
                {(['grid', 'smpte-bars', 'focus-star', 'off'] as const).map((pat) => {
                  const isActive =
                    pat === 'off'
                      ? !projectorTestPattern
                      : projectorTestPattern && testPatternType === pat;
                  return (
                    <button
                      key={pat}
                      type="button"
                      onClick={() => {
                        if (pat === 'off') {
                          setProjectorTestPattern(false);
                        } else {
                          setTestPatternType(pat);
                          setProjectorTestPattern(true);
                        }
                      }}
                      className={`py-1 rounded text-[9px] font-bold uppercase border transition-colors ${
                        isActive
                          ? 'bg-amber-400 text-black border-amber-300'
                          : 'bg-[#0f1726] text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {pat === 'smpte-bars' ? 'SMPTE' : pat === 'focus-star' ? 'FOCUS' : pat.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {projectors.map((proj, index) => {
            const isSelected = proj.id === selectedProjectorId;
            const isIdentifying = proj.id === identifyingProjectorId;
            return (
              <div
                key={proj.id}
                onClick={() => setSelectedProjectorId(proj.id)}
                className={`rounded-lg p-3 border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#192336] border-blue-500/80 shadow-md'
                    : 'bg-[#151d2c] border-[#243047] hover:border-slate-600'
                }`}
                style={{
                  borderLeftWidth: '4px',
                  borderLeftColor: proj.borderColor,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={proj.enabled}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateProjector(proj.id, { enabled: e.target.checked });
                      }}
                      className="rounded border-slate-600"
                      aria-label={`Enable ${proj.name}`}
                    />
                    <span className="text-xs font-extrabold text-white">
                      {proj.name}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      proj.enabled
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {proj.enabled ? 'ACTIVE' : 'STANDBY'}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center gap-1.5">
                  <Monitor className="w-3 h-3 text-slate-500" />
                  <span>
                    {proj.resolution} @ {proj.refreshRate}Hz
                  </span>
                </div>

                {/* Mount Flip Dropdown */}
                <div
                  className="mt-2.5 flex items-center justify-between gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <label
                    htmlFor={`mount-${proj.id}`}
                    className="text-[10px] font-semibold uppercase text-slate-400"
                  >
                    Mount Flip:
                  </label>
                  <select
                    id={`mount-${proj.id}`}
                    value={proj.mountFlip}
                    onChange={(e) =>
                      updateProjector(proj.id, {
                        mountFlip: e.target
                          .value as ProjectorOutput['mountFlip'],
                      })
                    }
                    className="bg-[#0d131d] border border-[#2c3952] rounded px-2 py-1 text-[11px] text-slate-200"
                  >
                    <option value="0° Standard">0° Standard</option>
                    <option value="180° Inverted">180° Inverted (Ceiling)</option>
                    <option value="90° Portrait">90° Portrait</option>
                  </select>
                </div>

                {/* IDENTIFY ON HOUSE Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    flashIdentifyProjector(proj.id);
                  }}
                  className={`mt-2.5 w-full py-1.5 px-2.5 rounded text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border transition-colors ${
                    isIdentifying
                      ? 'bg-amber-500 text-black border-amber-300 animate-pulse'
                      : 'bg-[#202b3f] hover:bg-[#2a3852] text-slate-200 border-[#31405c]'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  {isIdentifying
                    ? `FLASHING #${index + 1} ON HOUSE...`
                    : 'IDENTIFY ON HOUSE'}
                </button>
              </div>
            );
          })}
        </aside>

        {/* CENTER INTERACTIVE MULTI-PROJECTOR ALIGNMENT CANVAS */}
        <main className="flex-1 min-w-0 p-4 flex flex-col bg-[#090d14] relative overflow-hidden">
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                INTERACTIVE MULTI-PROJECTOR THROW &amp; SEAM CANVAS
              </h2>
              <p className="text-[11px] text-slate-400">
                Drag projector throw rectangles to adjust physical overlap.
                Amber crosshatch indicates real-time S-Curve edge-blend seams.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <div className="flex items-center gap-1 bg-[#121927] p-0.5 rounded border border-[#26334d]">
                <button
                  type="button"
                  onClick={() => setDragMode('move')}
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                    dragMode === 'move'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  MOVE FRUSTUM
                </button>
                <button
                  type="button"
                  onClick={() => setDragMode('pins')}
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                    dragMode === 'pins'
                      ? 'bg-amber-500 text-black shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  KEYSTONE PINS
                </button>
              </div>

              <button
                type="button"
                onClick={resetSelectedProjectorPins}
                title="Reset Corner Pins to Projector Rectangle"
                className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-[#182233] hover:bg-[#202c40] border border-[#2b3a52] text-amber-300 transition-colors cursor-pointer"
              >
                RESET PINS
              </button>

              <PreviewZoomControl
                zoom={setupZoom}
                onChange={setSetupZoom}
                pan={setupPan}
                onResetPan={resetSetupPan}
              />
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-3 h-3 rounded-sm bg-amber-500/40 border border-amber-400 inline-block" />
                Active Overlap Seams: {overlapZones.length}
              </span>
            </div>
          </div>

          {/* Interactive SVG Canvas */}
          <div
            onWheel={(e) => {
              e.preventDefault();
              const delta = e.deltaY < 0 ? 10 : -10;
              setSetupZoom((z) => Math.max(25, Math.min(250, z + delta)));
            }}
            className="flex-1 rounded-lg border border-[#232f46] bg-[#050811] overflow-hidden relative flex items-center justify-center"
          >
            <svg
              viewBox={computeZoomViewBox(980, 500, setupZoom, setupPan.x, setupPan.y).viewBox}
              className={`w-full h-full object-contain ${setupPan.x !== 0 || setupPan.y !== 0 ? 'cursor-grab' : ''}`}
              onPointerDown={handleSetupMiddleDown}
              onPointerMove={(e) => {
                if (handleSetupMiddleMove(e)) return;
                handleCanvasPointerMove(e);
              }}
              onPointerUp={(e) => {
                if (handleSetupMiddleUp(e)) return;
                handleCanvasPointerUp();
              }}
              onPointerLeave={(e) => {
                handleSetupMiddleUp(e);
                handleCanvasPointerUp();
              }}
              onMouseDown={handleSetupMiddleMouseDown}
            >
              <defs>
                <pattern
                  id="amberOverlapCrosshatch"
                  width="12"
                  height="12"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(45)"
                >
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="12"
                    stroke="#f59e0b"
                    strokeWidth="3"
                    strokeOpacity="0.65"
                  />
                  <line
                    x1="0"
                    y1="0"
                    x2="12"
                    y2="0"
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeOpacity="0.35"
                  />
                </pattern>
                <linearGradient
                  id="featherGrad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.45" />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.45" />
                </linearGradient>
                <pattern
                  id="pixelAlignmentGrid"
                  width="24"
                  height="24"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 24 0 L 0 0 0 24"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="0.7"
                    strokeOpacity="0.45"
                  />
                </pattern>
              </defs>

              {/* Background Reference House Photo + Wireframe Silhouette */}
              <g opacity="0.88">
                <rect
                  x="20"
                  y="20"
                  width="940"
                  height="460"
                  fill="#0b1220"
                  rx="6"
                />
                <image
                  href={AUSTIN_HOUSE_ASSETS.photos.v1EctoOpenGarage}
                  x="20"
                  y="20"
                  width="940"
                  height="460"
                  preserveAspectRatio="none"
                  opacity="0.45"
                />
                <image
                  href={AUSTIN_HOUSE_ASSETS.wireframeLayout}
                  x="20"
                  y="20"
                  width="940"
                  height="460"
                  preserveAspectRatio="none"
                  opacity="0.65"
                />
              </g>

              {/* Optional 1-Pixel Alignment Grid Overlay */}
              {(calibrationOverlayMode === 'pixel-grid' ||
                sendCalibrationGridToAll) && (
                <rect
                  x="20"
                  y="20"
                  width="940"
                  height="460"
                  fill="url(#pixelAlignmentGrid)"
                />
              )}

              {/* Draggable Projector Throw Frustums (Polygon Keystone + RGB/Lumen Rendering) */}
              {activeProjectors.map((proj, idx) => {
                const { x, y, width, height } = proj.frustumRect;
                const isFlashing = identifyingProjectorId === proj.id;
                const isSelected = selectedProjectorId === proj.id;

                const r = Math.round(
                  Math.min(255, (proj.rgbGain?.r ?? 100) * 2.55)
                );
                const g = Math.round(
                  Math.min(255, (proj.rgbGain?.g ?? 100) * 2.55)
                );
                const b = Math.round(
                  Math.min(255, (proj.rgbGain?.b ?? 100) * 2.55)
                );
                const baseAlpha = Math.max(
                  0.08,
                  Math.min(
                    0.5,
                    ((proj.lumenMatchPercent ?? 100) / 100) * 0.28
                  )
                );
                const frustumFill = isFlashing
                  ? 'rgba(245, 158, 11, 0.45)'
                  : `rgba(${r}, ${g}, ${b}, ${baseAlpha.toFixed(3)})`;

                const pins: [
                  VectorVertex,
                  VectorVertex,
                  VectorVertex,
                  VectorVertex
                ] =
                  proj.cornerPins && proj.cornerPins.length === 4
                    ? proj.cornerPins
                    : [
                        { x, y },
                        { x: x + width, y },
                        { x: x + width, y: y + height },
                        { x, y: y + height },
                      ];
                const polygonPoints = pins.map((p) => `${p.x},${p.y}`).join(' ');

                return (
                  <g
                    key={proj.id}
                    onPointerDown={(e) => {
                      if (dragMode === 'move') {
                        handleCanvasPointerDown(e, proj.id);
                      } else {
                        setSelectedProjectorId(proj.id);
                      }
                    }}
                    className={
                      dragMode === 'move' ? 'cursor-move' : 'cursor-default'
                    }
                  >
                    {/* Frustum Polygon Reflecting RGB Gain & Lumen Match Tint */}
                    <polygon
                      points={polygonPoints}
                      fill={frustumFill}
                      stroke={proj.borderColor}
                      strokeWidth={isFlashing ? 5 : isSelected ? 3 : 2}
                      strokeDasharray={isSelected ? 'none' : '8 4'}
                      style={{
                        filter: isSelected
                          ? `drop-shadow(0 0 10px ${proj.borderColor}55)`
                          : undefined,
                      }}
                    />

                    {/* Projector Label Badge */}
                    <rect
                      x={x + 10}
                      y={y + 10}
                      width={175}
                      height={26}
                      rx="4"
                      fill="#0c121e"
                      stroke={proj.borderColor}
                      strokeWidth="1.5"
                    />
                    <text
                      x={x + 20}
                      y={y + 27}
                      fill="#ffffff"
                      fontSize="11"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {proj.name} ({proj.mountFlip.split(' ')[0]})
                    </text>

                    {/* Giant Optical ID Number when Identify is triggered */}
                    {isFlashing && (
                      <text
                        x={x + width / 2}
                        y={y + height / 2 + 24}
                        textAnchor="middle"
                        fill="#ffffff"
                        stroke={proj.borderColor}
                        strokeWidth="2"
                        fontSize="72"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        #{idx + 1}
                      </text>
                    )}

                    {/* 4-Corner Keystone Pin Handles */}
                    {pins.map((corner, cIdx) => {
                      const isPinActive = isSelected;
                      return (
                        <g key={cIdx} className="cursor-crosshair">
                          <circle
                            cx={corner.x}
                            cy={corner.y}
                            r={
                              isPinActive
                                ? dragMode === 'pins'
                                  ? 10
                                  : 8
                                : 6
                            }
                            fill={isPinActive ? proj.borderColor : '#0c1017'}
                            stroke={isPinActive ? '#ffffff' : proj.borderColor}
                            strokeWidth={isPinActive ? 2.5 : 2}
                            className={
                              isPinActive
                                ? 'active:scale-125 transition-transform'
                                : ''
                            }
                            onPointerDown={(e) =>
                              handleCornerPointerDown(e, proj.id, cIdx)
                            }
                          />
                          {isPinActive && (
                            <text
                              x={
                                corner.x +
                                (cIdx === 0 || cIdx === 3 ? -10 : 10)
                              }
                              y={
                                corner.y +
                                (cIdx === 0 || cIdx === 1 ? -8 : 16)
                              }
                              fill={proj.borderColor}
                              fontSize="9"
                              fontFamily="monospace"
                              fontWeight="bold"
                              textAnchor={
                                cIdx === 0 || cIdx === 3 ? 'end' : 'start'
                              }
                              className="pointer-events-none select-none drop-shadow"
                            >
                              {['TL', 'TR', 'BR', 'BL'][cIdx]}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </g>
                );
              })}

              {/* Dynamic Overlap & Edge-Blend Amber Crosshatch Zones */}
              {overlapZones.map((zone) => (
                <g key={zone.id} className="pointer-events-none">
                  <rect
                    x={zone.x}
                    y={zone.y}
                    width={zone.width}
                    height={zone.height}
                    fill={
                      calibrationOverlayMode === 'overlap-feather'
                        ? 'url(#featherGrad)'
                        : 'url(#amberOverlapCrosshatch)'
                    }
                    stroke="#f59e0b"
                    strokeWidth="2"
                  />
                  <rect
                    x={zone.x}
                    y={zone.y}
                    width={zone.width}
                    height={zone.height}
                    fill="url(#amberOverlapCrosshatch)"
                  />

                  {/* Black-Level Uplift Lens Glow inside Overlap Seam */}
                  {blackLevelUplift > 0 && (
                    <rect
                      x={zone.x}
                      y={zone.y}
                      width={zone.width}
                      height={zone.height}
                      fill="#ffffff"
                      opacity={Math.min(
                        0.35,
                        (blackLevelUplift / 15) * 0.22
                      )}
                      style={{ mixBlendMode: 'screen' }}
                    />
                  )}

                  {/* Seam Readout Pill */}
                  <rect
                    x={zone.x + zone.width / 2 - 72}
                    y={zone.y + zone.height / 2 - 22}
                    width="144"
                    height="44"
                    rx="6"
                    fill="#0f1623"
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                  />
                  <text
                    x={zone.x + zone.width / 2}
                    y={zone.y + zone.height / 2 - 4}
                    textAnchor="middle"
                    fill="#fbbf24"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {zone.label} OVERLAP
                  </text>
                  <text
                    x={zone.x + zone.width / 2}
                    y={zone.y + zone.height / 2 + 12}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {zone.pixelWidth} px (γ={blendGamma.toFixed(1)})
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </main>

        {/* RIGHT EDGE BLENDING & BLACK-LEVEL COMPENSATION INSPECTOR */}
        <aside className="w-[320px] shrink-0 bg-[#101622] border-l border-[#1f293a] p-4 flex flex-col gap-3.5 overflow-y-auto">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-bold tracking-wider uppercase text-slate-200">
              EDGE BLENDING &amp; BLACK-LEVEL
            </h2>
          </div>

          {/* One-Click Hardware Calibration: AUTO-ALIGN OVERLAP SEAMS */}
          <button
            type="button"
            onClick={handleAutoAlignOverlapSeams}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#1a2638] hover:bg-[#23354f] border border-amber-500/60 text-amber-300 hover:text-amber-200 text-xs font-bold uppercase tracking-wider shadow-[0_0_14px_rgba(245,158,11,0.22)] transition-all active:scale-[0.98] cursor-pointer"
            title="Automatically arranges enabled projectors into a clean 240px seam overlap and resets corner pins"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            AUTO-ALIGN OVERLAP SEAMS (240PX)
          </button>

          {/* Overlap Seam Selector */}
          <div>
            <label
              htmlFor="seam-select"
              className="block text-[11px] font-semibold text-slate-400 mb-1"
            >
              Active Overlap Seam
            </label>
            <select
              id="seam-select"
              value={selectedSeamId}
              onChange={(e) =>
                setEdgeBlendParams({ selectedSeamId: e.target.value })
              }
              className="w-full bg-[#192233] border border-[#2d3b54] rounded px-2.5 py-1.5 text-xs text-white"
            >
              {overlapZones.length > 0 ? (
                overlapZones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.label} — {z.pixelWidth}px Width
                  </option>
                ))
              ) : (
                <option value="seam-none">No Active Overlap Seam</option>
              )}
            </select>
          </div>

          {/* ENABLE SOFT EDGE BLENDING Toggle */}
          <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#161f30] border border-[#26344d] cursor-pointer">
            <span className="text-xs font-bold text-slate-200">
              ENABLE SOFT EDGE BLENDING
            </span>
            <input
              type="checkbox"
              checked={enableSoftEdgeBlending}
              onChange={(e) =>
                setEdgeBlendParams({ enableSoftEdgeBlending: e.target.checked })
              }
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 relative" />
          </label>

          {/* Blend Roll-Off Curve Selector */}
          <div>
            <label
              htmlFor="blend-curve-select"
              className="block text-[11px] font-semibold text-slate-400 mb-1"
            >
              Blend Roll-Off Curve Formula
            </label>
            <select
              id="blend-curve-select"
              value={blendCurve}
              onChange={(e) =>
                setEdgeBlendParams({
                  blendCurve: e.target
                    .value as ProjectionStudioState['blendCurve'],
                })
              }
              className="w-full bg-[#192233] border border-[#2d3b54] rounded px-2.5 py-1.5 text-xs text-white"
            >
              <option value="Raised Cosine / S-Curve">
                Raised Cosine / S-Curve (p=2.0)
              </option>
              <option value="Linear Ramp">Linear Alpha Ramp (p=1.0)</option>
              <option value="Quadratic">Steep Quadratic Roll-Off (p=3.0)</option>
            </select>
          </div>

          {/* Blend Gamma Slider (0.5 - 3.0) */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">
                Blend Gamma (γ)
              </span>
              <span className="font-mono text-amber-400 font-bold">
                {blendGamma.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={3.0}
              step={0.05}
              value={blendGamma}
              onChange={(e) =>
                setEdgeBlendParams({ blendGamma: Number(e.target.value) })
              }
              className="w-full"
            />
          </div>

          {/* Live S-Curve Alpha Roll-Off Graph Visualizer */}
          <div className="rounded-lg bg-[#0b1019] border border-[#243047] p-2.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-300 mb-1">
              <span className="font-bold uppercase tracking-wider text-slate-200">
                S-CURVE ATTENUATION α(d)
              </span>
              <span className="text-amber-400 font-bold">
                p={sCurvePlot.pSteepness.toFixed(1)} | γ={blendGamma.toFixed(2)}
              </span>
            </div>

            <svg
              width="240"
              height="68"
              viewBox="0 0 240 68"
              className="w-full h-[68px] overflow-visible"
            >
              <defs>
                <linearGradient id="curveGridGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.12" />
                  <stop offset="50%" stopColor="#10b981" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.12" />
                </linearGradient>
              </defs>

              {/* Shaded background */}
              <rect
                x="12"
                y="12"
                width="216"
                height="44"
                fill="url(#curveGridGrad)"
                rx="3"
              />

              {/* Baseline (alpha = 0.0) */}
              <line
                x1="12"
                y1="56"
                x2="228"
                y2="56"
                stroke="#1e293b"
                strokeWidth="1.5"
              />

              {/* Nominal 100% luminance line (alpha = 1.0) */}
              <line
                x1="12"
                y1="12"
                x2="228"
                y2="12"
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray="3 3"
              />

              {/* Center seam division (d = 0.5) */}
              <line
                x1="120"
                y1="6"
                x2="120"
                y2="60"
                stroke="#475569"
                strokeDasharray="2 2"
                strokeWidth="1"
              />

              {/* Combined Sum curve (in emerald) */}
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeDasharray="4 2"
                points={sCurvePlot.polylineSum}
              />

              {/* Projector A falling curve (in cyan) */}
              <polyline
                fill="none"
                stroke="#00f0ff"
                strokeWidth="2"
                points={sCurvePlot.polylineA}
              />

              {/* Projector B rising curve (in amber) */}
              <polyline
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                points={sCurvePlot.polylineB}
              />

              {/* Center Seam Intersection Indicators */}
              <circle cx="120" cy="34" r="3" fill="#00f0ff" />
              <circle cx="120" cy="34" r="2" fill="#f59e0b" />
              <circle cx="120" cy="12" r="3" fill="#10b981" />

              {/* Axis labels */}
              <text
                x="14"
                y="10"
                fill="#64748b"
                fontSize="8"
                fontFamily="monospace"
              >
                1.0
              </text>
              <text
                x="14"
                y="64"
                fill="#64748b"
                fontSize="8"
                fontFamily="monospace"
              >
                0.0
              </text>
              <text
                x="120"
                y="66"
                textAnchor="middle"
                fill="#64748b"
                fontSize="8"
                fontFamily="monospace"
              >
                SEAM d=0.5
              </text>
            </svg>

            {/* Visual Legend */}
            <div className="flex items-center justify-between text-[9px] font-mono mt-1 pt-1 border-t border-[#1c2637]">
              <span className="flex items-center gap-1 text-cyan-300">
                <span className="w-2 h-0.5 bg-[#00f0ff] inline-block" />
                Proj A (1.0→0)
              </span>
              <span className="flex items-center gap-1 text-amber-300">
                <span className="w-2 h-0.5 bg-[#f59e0b] inline-block" />
                Proj B (0→1.0)
              </span>
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <span className="w-2 h-0.5 bg-[#10b981] inline-block" />
                Sum Σ(α)
              </span>
            </div>
          </div>

          {/* Feather Inset Slider */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Feather Inset</span>
              <span className="font-mono text-cyan-300 font-bold">
                {featherInsetPx} px
              </span>
            </div>
            <input
              type="range"
              min={16}
              max={300}
              step={4}
              value={featherInsetPx}
              onChange={(e) =>
                setEdgeBlendParams({ featherInsetPx: Number(e.target.value) })
              }
              className="w-full"
            />
          </div>

          {/* BLACK-LEVEL UPLIFT Sub-Panel */}
          <div className="p-3 rounded-lg bg-[#151e2e] border border-[#26344d]">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                BLACK-LEVEL UPLIFT (LENS GLOW)
              </span>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                +{blackLevelUplift.toFixed(1)} IRE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mb-2">
              Compensates for double optical black floor inside overlap zone.
            </p>
            <input
              type="range"
              min={0}
              max={15}
              step={0.5}
              value={blackLevelUplift}
              onChange={(e) =>
                setEdgeBlendParams({ blackLevelUplift: Number(e.target.value) })
              }
              className="w-full"
            />
          </div>

          {/* PER-PROJECTOR COLOR & LUMEN MATCHING Sub-Panel */}
          <div className="p-3 rounded-lg bg-[#151e2e] border border-[#26344d]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                COLOR &amp; LUMEN MATCH ({selectedProjector.name})
              </span>
              <span className="text-xs font-mono text-cyan-300 font-bold">
                {selectedProjector.lumenMatchPercent}%
              </span>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              value={selectedProjector.lumenMatchPercent}
              onChange={(e) =>
                updateProjector(selectedProjector.id, {
                  lumenMatchPercent: Number(e.target.value),
                })
              }
              className="w-full mb-2"
            />
            {/* Interactive R, G, B Gain Controls */}
            <div className="space-y-2 mt-2">
              {/* Red Gain */}
              <div className="bg-[#0d131f] p-2 rounded border border-red-500/30">
                <div className="flex items-center justify-between text-xs font-mono text-red-300 mb-1">
                  <span className="font-bold">RED GAIN</span>
                  <span>{selectedProjector.rgbGain.r}%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      updateProjector(selectedProjector.id, {
                        rgbGain: {
                          ...selectedProjector.rgbGain,
                          r: Math.max(0, selectedProjector.rgbGain.r - 1),
                        },
                      })
                    }
                    className="w-5 h-5 rounded bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-300 flex items-center justify-center text-xs font-bold cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min={50}
                    max={110}
                    value={selectedProjector.rgbGain.r}
                    onChange={(e) =>
                      updateProjector(selectedProjector.id, {
                        rgbGain: {
                          ...selectedProjector.rgbGain,
                          r: Number(e.target.value),
                        },
                      })
                    }
                    className="flex-1 h-1 accent-red-500 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateProjector(selectedProjector.id, {
                        rgbGain: {
                          ...selectedProjector.rgbGain,
                          r: Math.min(120, selectedProjector.rgbGain.r + 1),
                        },
                      })
                    }
                    className="w-5 h-5 rounded bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-300 flex items-center justify-center text-xs font-bold cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Green Gain */}
              <div className="bg-[#0d131f] p-2 rounded border border-emerald-500/30">
                <div className="flex items-center justify-between text-xs font-mono text-emerald-300 mb-1">
                  <span className="font-bold">GREEN GAIN</span>
                  <span>{selectedProjector.rgbGain.g}%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      updateProjector(selectedProjector.id, {
                        rgbGain: {
                          ...selectedProjector.rgbGain,
                          g: Math.max(0, selectedProjector.rgbGain.g - 1),
                        },
                      })
                    }
                    className="w-5 h-5 rounded bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 flex items-center justify-center text-xs font-bold cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min={50}
                    max={110}
                    value={selectedProjector.rgbGain.g}
                    onChange={(e) =>
                      updateProjector(selectedProjector.id, {
                        rgbGain: {
                          ...selectedProjector.rgbGain,
                          g: Number(e.target.value),
                        },
                      })
                    }
                    className="flex-1 h-1 accent-emerald-500 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateProjector(selectedProjector.id, {
                        rgbGain: {
                          ...selectedProjector.rgbGain,
                          g: Math.min(120, selectedProjector.rgbGain.g + 1),
                        },
                      })
                    }
                    className="w-5 h-5 rounded bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 flex items-center justify-center text-xs font-bold cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Blue Gain */}
              <div className="bg-[#0d131f] p-2 rounded border border-blue-500/30">
                <div className="flex items-center justify-between text-xs font-mono text-blue-300 mb-1">
                  <span className="font-bold">BLUE GAIN</span>
                  <span>{selectedProjector.rgbGain.b}%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      updateProjector(selectedProjector.id, {
                        rgbGain: {
                          ...selectedProjector.rgbGain,
                          b: Math.max(0, selectedProjector.rgbGain.b - 1),
                        },
                      })
                    }
                    className="w-5 h-5 rounded bg-blue-950/60 hover:bg-blue-900 border border-blue-500/40 text-blue-300 flex items-center justify-center text-xs font-bold cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min={50}
                    max={110}
                    value={selectedProjector.rgbGain.b}
                    onChange={(e) =>
                      updateProjector(selectedProjector.id, {
                        rgbGain: {
                          ...selectedProjector.rgbGain,
                          b: Number(e.target.value),
                        },
                      })
                    }
                    className="flex-1 h-1 accent-blue-500 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateProjector(selectedProjector.id, {
                        rgbGain: {
                          ...selectedProjector.rgbGain,
                          b: Math.min(120, selectedProjector.rgbGain.b + 1),
                        },
                      })
                    }
                    className="w-5 h-5 rounded bg-blue-950/60 hover:bg-blue-900 border border-blue-500/40 text-blue-300 flex items-center justify-center text-xs font-bold cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Visual Result Swatch */}
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1">
                <span>Color Tint Swatch:</span>
                <div
                  className="w-20 h-4 rounded border border-white/20 shadow-inner"
                  style={{
                    backgroundColor: `rgb(${Math.round(
                      selectedProjector.rgbGain.r * 2.55
                    )}, ${Math.round(
                      selectedProjector.rgbGain.g * 2.55
                    )}, ${Math.round(selectedProjector.rgbGain.b * 2.55)})`,
                    opacity: selectedProjector.lumenMatchPercent / 100,
                  }}
                />
              </div>

              {/* Normalize All Projectors in Array (100% RGB & Lumens) */}
              <button
                type="button"
                onClick={handleNormalizeAllProjectors}
                className="w-full mt-3 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-[#172235] hover:bg-[#20304a] border border-cyan-500/40 text-cyan-300 hover:text-white text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                title="Reset all projectors in the array to 100% Lumens and neutral RGB (100, 100, 100)"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                NORMALIZE ALL PROJECTORS (100% RGB &amp; LUMENS)
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* BOTTOM CALIBRATION PATTERN & ROUTING BAR */}
      <footer className="h-14 bg-[#121926] border-t border-[#222d42] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setEdgeBlendParams({
                calibrationOverlayMode:
                  calibrationOverlayMode === 'overlap-feather'
                    ? 'none'
                    : 'overlap-feather',
              })
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold border transition-colors ${
              calibrationOverlayMode === 'overlap-feather'
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-[#1b2436] border-[#2c3a54] text-slate-300'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Show Overlap Feather Gradient
          </button>

          <button
            type="button"
            onClick={() =>
              setEdgeBlendParams({
                calibrationOverlayMode:
                  calibrationOverlayMode === 'pixel-grid'
                    ? 'none'
                    : 'pixel-grid',
              })
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold border transition-colors ${
              calibrationOverlayMode === 'pixel-grid'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                : 'bg-[#1b2436] border-[#2c3a54] text-slate-300'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            Show 1-Pixel Alignment Grid
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Visual confirmation badge for LUT import */}
          {importSuccessBadge && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-emerald-500/20 border border-emerald-400 text-xs font-mono font-bold text-emerald-300 animate-pulse">
              <Check className="w-3.5 h-3.5" />
              {importSuccessBadge}
            </span>
          )}

          {/* Hidden File Input for IMPORT ARRAY LUT */}
          <input
            ref={lutFileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportLutFile}
            className="hidden"
            aria-label="Upload Array LUT JSON File"
          />

          {/* IMPORT ARRAY LUT (.JSON) Button */}
          <button
            type="button"
            onClick={() => lutFileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-[#162338] hover:bg-[#203250] border border-cyan-500/50 text-xs font-bold text-cyan-300 uppercase shadow-[0_0_12px_rgba(6,182,212,0.25)] transition-all active:scale-95 cursor-pointer"
            title="Upload and restore calibrated multi-projector frustum and S-Curve LUT configuration (.json)"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            IMPORT ARRAY LUT (.JSON)
          </button>

          {/* EXPORT ARRAY LUT (.JSON) Button */}
          <button
            type="button"
            onClick={exportArrayLutJson}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-[#162338] hover:bg-[#203250] border border-cyan-500/50 text-xs font-bold text-cyan-300 uppercase shadow-[0_0_12px_rgba(6,182,212,0.25)] transition-all active:scale-95 cursor-pointer"
            title="Download calibrated multi-projector frustum and S-Curve LUT configuration (.json)"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            EXPORT ARRAY LUT (.JSON)
          </button>

          <button
            type="button"
            onClick={handleSaveArrayPreset}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-[#202b3f] hover:bg-[#2a3852] border border-[#334463] text-xs font-bold text-slate-200 uppercase transition-colors cursor-pointer"
          >
            <Save
              className={`w-3.5 h-3.5 ${
                isSavingLut ? 'animate-spin text-amber-400' : 'text-cyan-400'
              }`}
            />
            {isSavingLut ? 'SYNCING LUT...' : 'SAVE ARRAY PRESET'}
          </button>

          {/* APPLY ARRAY & RETURN TO HOME -> Routes to Screen 1 */}
          <button
            type="button"
            onClick={() => {
              handleSaveArrayPreset();
              setActiveScreen(1);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#25324a] hover:bg-[#30405e] border border-[#3e5275] text-xs font-bold text-white uppercase transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            APPLY ARRAY &amp; RETURN TO HOME (SCREEN 1)
          </button>

          {/* APPLY ARRAY & GO TO PHOTO-TO-LAYOUT -> Routes to Screen 3 */}
          <button
            type="button"
            onClick={() => {
              handleSaveArrayPreset();
              setActiveScreen(3);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-xs font-extrabold text-white uppercase shadow-[0_0_15px_rgba(37,99,235,0.45)] transition-colors cursor-pointer"
          >
            APPLY ARRAY &amp; GO TO PHOTO-TO-LAYOUT (SCREEN 3)
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </footer>
    </div>
  );
};
