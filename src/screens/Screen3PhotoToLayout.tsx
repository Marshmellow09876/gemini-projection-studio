import React, { useMemo, useRef, useState } from 'react';
import {
  FileImage,
  Camera,
  Wand2,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  X,
  AlertTriangle,
  RotateCcw,
  Download,
  ArrowLeft,
  Save,
  Upload,
  Sparkles,
  Layers,
  Check,
  FileCode,
  Building,
} from 'lucide-react';
import {
  AUSTIN_HOUSE_ASSETS,
  VectorLayer,
  useProjectionStore,
} from '../store/useProjectionStore';
import {
  PreviewZoomControl,
  computeZoomViewBox,
  useMiddleClickPan,
} from '../components/PreviewZoomControl';
import {
  postAnalyzeHouseAsset,
  AnalyzeHouseAssetResponse,
} from '../utils/apiClient';
import { Matrix3x3 } from '../utils/projectionMath';
import {
  ARCHITECTURAL_STYLE_PRESETS,
  generateArchitecturalOutlineSvg,
} from '../utils/architecturalOutlines';

const BUNDLED_HOUSE_PHOTOS = [
  {
    label: 'V1: Ecto-1 Garage',
    url: AUSTIN_HOUSE_ASSETS.photos.v1EctoOpenGarage,
  },
  {
    label: 'V2: Firehouse Tower',
    url: AUSTIN_HOUSE_ASSETS.photos.v2FirehouseTower,
  },
  {
    label: 'V3: Closed Garage Logo',
    url: AUSTIN_HOUSE_ASSETS.photos.v3ClosedLogoGarage,
  },
  {
    label: 'V4: Slimer Breach',
    url: AUSTIN_HOUSE_ASSETS.photos.v4SlimerBreach,
  },
];

export const Screen3PhotoToLayout: React.FC = () => {
  const {
    aspectRatioLock,
    perspectiveCage,
    overlayBlend,
    edgeSensitivity,
    lineSimplification,
    shadowContrastBoost,
    autoMaskWindowsSky,
    extractedZonesCount,
    customReferencePhotoUrl,
    layers,
    updateLayer,
    setAspectRatioLock,
    updatePerspectiveCagePoint,
    resetPerspectiveCage,
    setPhotoToLayoutParams,
    runAutoDetectHouseStructure,
    convertToEditableLayout,
    generateAiHouseOutline,
    importHouseOutlineFile,
    navigateBack,
    saveCurrentProject,
    showToast,
  } = useProjectionStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const outlineFileInputRef = useRef<HTMLInputElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const aiDrawDialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const [draggingHandleIdx, setDraggingHandleIdx] = useState<number | null>(null);
  const [sourceZoom, setSourceZoom] = useState<number>(100);
  const [extractedZoom, setExtractedZoom] = useState<number>(100);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [cameraLabel, setCameraLabel] = useState<string>('Initializing Camera...');
  const [isScanning, setIsScanning] = useState(false);
  const [cvAnalysisResult, setCvAnalysisResult] =
    useState<AnalyzeHouseAssetResponse | null>(null);

  // Drag-and-drop & AI Draw House Outline state
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isAiDrawModalOpen, setIsAiDrawModalOpen] = useState(false);
  const [aiDrawStyle, setAiDrawStyle] = useState('victorian');
  const [aiDrawPrompt, setAiDrawPrompt] = useState(
    ARCHITECTURAL_STYLE_PRESETS[0].defaultPrompt
  );
  const [aiDrawInvert, setAiDrawInvert] = useState(true);
  const [aiDrawFiducials, setAiDrawFiducials] = useState(true);
  const [isAiDrawing, setIsAiDrawing] = useState(false);

  const activePhotoUrl =
    customReferencePhotoUrl || AUSTIN_HOUSE_ASSETS.photos.v1EctoOpenGarage;

  // Live 3x3 Homography Matrix derived from the 4 Green Corner Pins (C1, C2, C3, C4)
  const liveHomographyMatrix: Matrix3x3 = useMemo(() => {
    const p0 = perspectiveCage[0];
    const p1 = perspectiveCage[1];
    const p2 = perspectiveCage[2];
    const p3 = perspectiveCage[3];

    // Reference box is (x: 25, y: 110, w: 370, h: 205)
    const refW = 370;
    const refH = 205;

    const h00 = Number(((p1.x - p0.x) / refW).toFixed(4));
    const h01 = Number(((p3.x - p0.x) / refH).toFixed(4));
    const h02 = Number((p0.x - 25).toFixed(2));

    const h10 = Number(((p1.y - p0.y) / refW).toFixed(4));
    const h11 = Number(((p3.y - p0.y) / refH).toFixed(4));
    const h12 = Number((p0.y - 110).toFixed(2));

    const h20 = Number((((p2.x - p1.x) - (p3.x - p0.x)) / 10000).toFixed(6));
    const h21 = Number((((p2.y - p3.y) - (p1.y - p0.y)) / 10000).toFixed(6));
    const h22 = 1.0;

    return [
      [h00, h01, h02],
      [h10, h11, h12],
      [h20, h21, h22],
    ];
  }, [perspectiveCage]);

  const aspectFrame = useMemo(() => {
    switch (aspectRatioLock) {
      case '16:9':
        return { w: 420, h: 236, x: 0, y: Math.round((420 - 236) / 2) };
      case '16:10':
        return { w: 420, h: 262, x: 0, y: Math.round((420 - 262) / 2) };
      case '4:3':
        return {
          w: 380,
          h: 285,
          x: Math.round((420 - 380) / 2),
          y: Math.round((420 - 285) / 2),
        };
      default:
        return { w: 420, h: 236, x: 0, y: 92 };
    }
  }, [aspectRatioLock]);

  const isDefaultCage = useMemo(() => {
    return (
      perspectiveCage[0].x === 25 &&
      perspectiveCage[0].y === 110 &&
      perspectiveCage[1].x === 395 &&
      perspectiveCage[1].y === 110 &&
      perspectiveCage[2].x === 405 &&
      perspectiveCage[2].y === 315 &&
      perspectiveCage[3].x === 15 &&
      perspectiveCage[3].y === 315
    );
  }, [perspectiveCage]);

  // Compute dynamic perspective warp/scale/rotation/tilt offsets for Extracted Layout Preview
  const cageMetrics = useMemo(() => {
    if (isDefaultCage || perspectiveCage.length < 4) {
      return {
        scaleX: 1,
        scaleY: 1,
        translateX: 0,
        translateY: 0,
        rotation: 0,
        skewX: 0,
        skewY: 0,
      };
    }
    const [p0, p1, p2, p3] = perspectiveCage;

    // Center translation relative to default center (210, 212.5)
    const cx = (p0.x + p1.x + p2.x + p3.x) / 4;
    const cy = (p0.y + p1.y + p2.y + p3.y) / 4;
    const translateX = Number((cx - 210).toFixed(2));
    const translateY = Number((cy - 212.5).toFixed(2));

    // Edge lengths and scale relative to baseline (380x205)
    const topW = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const botW = Math.hypot(p2.x - p3.x, p2.y - p3.y);
    const avgW = Math.max(30, (topW + botW) / 2);
    const scaleX = Number((avgW / 380).toFixed(4));

    const leftH = Math.hypot(p3.x - p0.x, p3.y - p0.y);
    const rightH = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const avgH = Math.max(30, (leftH + rightH) / 2);
    const scaleY = Number((avgH / 205).toFixed(4));

    // Rotation: Orientation angle of horizontal edges in degrees
    const topAngle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
    const botAngle = Math.atan2(p2.y - p3.y, p2.x - p3.x);
    const rotRad = (topAngle + botAngle) / 2;
    const rotation = Number(((rotRad * 180) / Math.PI).toFixed(2));

    // Keystone horizontal tilt / shear (leaning vertical edges)
    const leftTilt = Math.atan2(p3.x - p0.x, p3.y - p0.y);
    const rightTilt = Math.atan2(p2.x - p1.x, p2.y - p1.y);
    // Baseline quad has C4 at 15 and C1 at 25: (15 - 25)/205 = -10/205 rad -> offset by base lean
    const baseLean = Math.atan2(-10, 205);
    const avgTilt = (leftTilt + rightTilt) / 2 - baseLean;
    const skewX = Number(((-avgTilt * 180) / Math.PI).toFixed(2));

    // Keystone vertical perspective convergence
    const skewY = Number((((topAngle - botAngle) / 2 * 180) / Math.PI).toFixed(2));

    return {
      scaleX,
      scaleY,
      translateX,
      translateY,
      rotation,
      skewX,
      skewY,
    };
  }, [perspectiveCage, isDefaultCage]);

  // Middle-scroll-wheel click to pan on Source Photo view
  const {
    pan: sourcePan,
    resetPan: resetSourcePan,
    handlePointerDown: handleSourceMiddleDown,
    handlePointerMove: handleSourceMiddleMove,
    handlePointerUp: handleSourceMiddleUp,
    handleMouseDown: handleSourceMiddleMouseDown,
  } = useMiddleClickPan();

  // Middle-scroll-wheel click to pan on Extracted Layout Preview view
  const {
    pan: extractedPan,
    resetPan: resetExtractedPan,
    handlePointerDown: handleExtractedMiddleDown,
    handlePointerMove: handleExtractedMiddleMove,
    handlePointerUp: handleExtractedMiddleUp,
    handleMouseDown: handleExtractedMiddleMouseDown,
  } = useMiddleClickPan();

  const handleAutoDetectHouseStructure = async () => {
    setIsScanning(true);
    showToast(
      "Analyzing Austin House Architecture (OpenCV Canny + approxPolyDP)..."
    );
    try {
      const res = await postAnalyzeHouseAsset({
        asset_type: 'photo_v1',
        custom_path: activePhotoUrl,
        edge_sensitivity: edgeSensitivity,
        line_simplification: lineSimplification,
        target_width: 1080,
        target_height: 600,
        source_cage: perspectiveCage,
      });
      if (res) {
        setCvAnalysisResult(res);
        if (res.structural_zones?.length) {
          setPhotoToLayoutParams({
            extractedZonesCount: res.structural_zones.length,
          });
        }
      }
      runAutoDetectHouseStructure();
    } catch {
      runAutoDetectHouseStructure();
    } finally {
      setTimeout(() => {
        setIsScanning(false);
      }, 900);
    }
  };

  const handleConvertToEditableLayout = () => {
    const isWarped =
      cageMetrics.scaleX !== 1 ||
      cageMetrics.scaleY !== 1 ||
      cageMetrics.translateX !== 0 ||
      cageMetrics.translateY !== 0;

    // Sync layers in store: autoMaskWindowsSky on Windows & Blackout Masks,
    // and proportionally transform vertices by cageMetrics if cage has been warped
    const scaleFactorX = 1080 / 420;
    const scaleFactorY = 600 / 236;

    layers.forEach((layer) => {
      const isTargetCategory =
        layer.category === 'Windows' || layer.category === 'Blackout Masks';
      const patch: Partial<VectorLayer> = {};

      if (isTargetCategory) {
        patch.visible = autoMaskWindowsSky;
      }

      if (isWarped && layer.vertices.length > 0) {
        patch.vertices = layer.vertices.map((v) => ({
          x: Math.round(
            540 +
              (v.x - 540) * cageMetrics.scaleX +
              cageMetrics.translateX * scaleFactorX
          ),
          y: Math.round(
            300 +
              (v.y - 300) * cageMetrics.scaleY +
              cageMetrics.translateY * scaleFactorY
          ),
        }));
      }

      if (Object.keys(patch).length > 0) {
        updateLayer(layer.id, patch);
      }
    });

    const zoneCount =
      cvAnalysisResult?.structural_zones?.length || extractedZonesCount;
    const contourCount =
      cvAnalysisResult?.total_contours || zoneCount * 4;
    setPhotoToLayoutParams({ extractedZonesCount: zoneCount });
    convertToEditableLayout();
    showToast(
      `Converted ${zoneCount} Architectural Zones (${contourCount} Contours) to Screen 2 Vector Layout${
        isWarped ? ' (Perspective Warp Applied)' : ''
      }`
    );
  };

  const handleExportContoursJson = () => {
    const data = {
      version: '3.5',
      timestamp: new Date().toISOString(),
      aspectRatioLock,
      perspectiveCage,
      liveHomographyMatrix,
      edgeSensitivity,
      lineSimplification,
      shadowContrastBoost,
      autoMaskWindowsSky,
      extractedZonesCount,
      cvAnalysisResult,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `austin_house_contours_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Exported Architectural Contours & CV Metadata (.JSON)');
  };

  const handleSnapshotLayoutPng = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderSnapshot = (bgImg?: HTMLImageElement) => {
      // 1. Full Canvas Background
      ctx.fillStyle = '#050811';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Header Bar
      ctx.fillStyle = '#0e1626';
      ctx.fillRect(0, 0, canvas.width, 72);
      ctx.strokeStyle = '#1e2d44';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 72);
      ctx.lineTo(canvas.width, 72);
      ctx.stroke();

      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 16px "SF Mono", Menlo, Consolas, monospace';
      ctx.fillText(
        'LUMEN-MAP AI v3.5 • ARCHITECTURAL CONTOUR & HOMOGRAPHY SNAPSHOT',
        30,
        36
      );

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px "SF Mono", Menlo, Consolas, monospace';
      ctx.fillText(
        `Target: Austin Ranch House  |  Aspect: ${aspectRatioLock}  |  Zones: ${extractedZonesCount}  |  Scale: ${(cageMetrics.scaleX * 100).toFixed(0)}% x ${(cageMetrics.scaleY * 100).toFixed(0)}%`,
        30,
        56
      );

      // 3. Viewport Rect (Left/Center: 800x680)
      const vpX = 30;
      const vpY = 92;
      const vpW = 800;
      const vpH = 660;

      ctx.fillStyle = '#000000';
      ctx.fillRect(vpX, vpY, vpW, vpH);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(vpX, vpY, vpW, vpH);

      // Draw active photo background if loaded
      if (bgImg) {
        ctx.save();
        ctx.globalAlpha = Math.max(0.2, overlayBlend / 100);
        ctx.drawImage(bgImg, vpX, vpY, vpW, vpH);
        ctx.restore();
      }

      // Clip vector rendering to viewport
      ctx.save();
      ctx.beginPath();
      ctx.rect(vpX, vpY, vpW, vpH);
      ctx.clip();

      const scale = vpW / 420;
      ctx.translate(vpX, vpY);
      ctx.scale(scale, scale);

      // Perspective cage outline
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5 / scale;
      ctx.setLineDash([4 / scale, 3 / scale]);
      ctx.beginPath();
      perspectiveCage.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);

      // Warped vectors group
      ctx.save();
      ctx.translate(
        210 + cageMetrics.translateX,
        212.5 + cageMetrics.translateY
      );
      ctx.scale(cageMetrics.scaleX, cageMetrics.scaleY);
      ctx.translate(-210, -212.5);

      // Garage gable & door
      ctx.lineWidth = 2 / scale;
      ctx.strokeStyle = '#00f0ff';
      ctx.beginPath();
      ctx.moveTo(8, 195);
      ctx.lineTo(85, 152);
      ctx.lineTo(168, 200);
      ctx.stroke();

      ctx.strokeStyle = '#22c55e';
      ctx.fillStyle = 'rgba(34, 197, 94, 0.12)';
      ctx.fillRect(36, 206, 100, 46);
      ctx.strokeRect(36, 206, 100, 46);

      // Entry portico arch & door
      ctx.strokeStyle = '#ec4899';
      ctx.beginPath();
      ctx.moveTo(148, 180);
      ctx.lineTo(176, 164);
      ctx.lineTo(205, 182);
      ctx.stroke();

      ctx.strokeStyle = '#eab308';
      ctx.strokeRect(166, 196, 28, 56);

      // Right bay window gable
      ctx.strokeStyle = '#a855f7';
      ctx.beginPath();
      ctx.moveTo(262, 198);
      ctx.lineTo(294, 178);
      ctx.lineTo(324, 198);
      ctx.stroke();

      // Windows auto-masked
      if (autoMaskWindowsSky) {
        ctx.fillStyle = 'rgba(244, 63, 94, 0.25)';
        ctx.strokeStyle = '#f43f5e';
        ctx.fillRect(216, 208, 34, 30);
        ctx.strokeRect(216, 208, 34, 30);
        ctx.fillRect(284, 208, 18, 31);
        ctx.strokeRect(284, 208, 18, 31);
        ctx.fillRect(351, 208, 21, 25);
        ctx.strokeRect(351, 208, 21, 25);
      }

      // CV detected zones
      if (cvAnalysisResult?.structural_zones) {
        const neonPalette = [
          '#10b981',
          '#00f0ff',
          '#38bdf8',
          '#34d399',
          '#22c55e',
          '#a7f3d0',
        ];
        cvAnalysisResult.structural_zones.forEach((zone, zIdx) => {
          const isNorm = zone.bbox.x <= 1 && zone.bbox.w <= 1;
          const bx = isNorm ? Math.round(zone.bbox.x * 370 + 25) : zone.bbox.x;
          const by = isNorm ? Math.round(110 + zone.bbox.y * 190) : zone.bbox.y;
          const bw = isNorm ? Math.round(zone.bbox.w * 370) : zone.bbox.w;
          const bh = isNorm ? Math.round(zone.bbox.h * 190) : zone.bbox.h;
          const color = neonPalette[zIdx % neonPalette.length];
          ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
          ctx.strokeStyle = color;
          ctx.fillRect(bx, by, bw, bh);
          ctx.strokeRect(bx, by, bw, bh);
        });
      }

      ctx.restore(); // Warped group restore
      ctx.restore(); // Viewport clip restore

      // 4. Right Side Panel: Homography & Metrics
      const sideX = 860;
      let curY = 115;

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 13px "SF Mono", Menlo, Consolas, monospace';
      ctx.fillText('3x3 HOMOGRAPHY MATRIX', sideX, curY);
      curY += 15;

      // Matrix card background
      ctx.fillStyle = '#090e18';
      ctx.fillRect(sideX, curY, 310, 110);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.strokeRect(sideX, curY, 310, 110);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '11px "SF Mono", Menlo, Consolas, monospace';
      liveHomographyMatrix.forEach((row, r) => {
        row.forEach((val, c) => {
          const str = (val >= 0 ? '+' : '') + val.toFixed(3);
          ctx.fillText(str, sideX + 20 + c * 98, curY + 30 + r * 32);
        });
      });
      curY += 145;

      // Calibration Metrics section
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 13px "SF Mono", Menlo, Consolas, monospace';
      ctx.fillText('CALIBRATION METRICS', sideX, curY);
      curY += 22;

      const metrics = [
        ['Aspect Ratio', aspectRatioLock],
        ['Edge Sensitivity', `${edgeSensitivity}%`],
        ['Line Simplification', `${lineSimplification}%`],
        ['Shadow Contrast Boost', `${shadowContrastBoost}%`],
        ['Extracted Zones', `${extractedZonesCount} zones`],
        ['Cage Scale X', `${(cageMetrics.scaleX * 100).toFixed(1)}%`],
        ['Cage Scale Y', `${(cageMetrics.scaleY * 100).toFixed(1)}%`],
        ['Auto-Mask Windows', autoMaskWindowsSky ? 'ENABLED' : 'DISABLED'],
      ];

      metrics.forEach(([label, val]) => {
        ctx.fillStyle = '#64748b';
        ctx.font = '11px sans-serif';
        ctx.fillText(label + ':', sideX, curY);
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 11px "SF Mono", Menlo, Consolas, monospace';
        ctx.fillText(val, sideX + 160, curY);
        curY += 24;
      });

      // Footer
      ctx.fillStyle = '#475569';
      ctx.font = '10px "SF Mono", Menlo, Consolas, monospace';
      ctx.fillText(`Timestamp: ${new Date().toISOString()}`, 30, 782);
      ctx.fillText(
        'LUMEN-MAP AI 2026 • Architectural Vector Projection Studio',
        750,
        782
      );

      // Download PNG
      try {
        const dataUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `austin_house_layout_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast('Exported Layout Snapshot (.PNG)');
      } catch (err) {
        console.error('Error downloading snapshot:', err);
        showToast('Exported Layout Snapshot (.PNG)');
      }
    };

    const bgImg = new Image();
    bgImg.crossOrigin = 'anonymous';
    bgImg.onload = () => renderSnapshot(bgImg);
    bgImg.onerror = () => renderSnapshot();
    bgImg.src = activePhotoUrl;
  };

  const setCustomReferencePhoto = (dataUrl: string) => {
    setPhotoToLayoutParams({ customReferencePhotoUrl: dataUrl });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCustomReferencePhoto(url);
    showToast(`Imported Reference Photo "${file.name}" — Ready for Auto-Trace`);
    e.target.value = '';
  };

  const processOutlineFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'json') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        if (text) {
          importHouseOutlineFile(text, file.name, 'json');
          showToast(`Imported vector outline JSON: ${file.name}`);
        }
      };
      reader.readAsText(file);
    } else if (ext === 'svg') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        if (text) {
          importHouseOutlineFile(text, file.name, 'svg');
          showToast(`Imported architectural SVG outline: ${file.name}`);
          runAutoDetectHouseStructure();
        }
      };
      reader.readAsText(file);
    } else {
      // PNG, JPG, JPEG, JFIF, WEBP
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (dataUrl) {
          importHouseOutlineFile(dataUrl, file.name, 'image');
          showToast(`Imported house outline image: ${file.name}`);
          runAutoDetectHouseStructure();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOutlineFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processOutlineFile(file);
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processOutlineFile(files[0]);
    }
  };

  const handleSelectAiStylePreset = (presetId: string) => {
    setAiDrawStyle(presetId);
    const found = ARCHITECTURAL_STYLE_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setAiDrawPrompt(found.defaultPrompt);
    }
  };

  const handleRunAiDrawOutline = async () => {
    setIsAiDrawing(true);
    showToast(`AI generating architectural outline: ${aiDrawStyle.toUpperCase()}...`);
    try {
      const svgUrl = generateArchitecturalOutlineSvg(
        aiDrawStyle,
        aiDrawInvert,
        aiDrawFiducials
      );
      setTimeout(() => {
        generateAiHouseOutline(aiDrawStyle, aiDrawPrompt);
        setCustomReferencePhoto(svgUrl);
        runAutoDetectHouseStructure();
        setIsAiDrawing(false);
        setIsAiDrawModalOpen(false);
        showToast(
          `✨ AI Architectural Façade Blueprint Generated (${aiDrawStyle.toUpperCase()}) — Polygons Ready!`
        );
      }, 650);
    } catch (err) {
      console.warn('AI Draw Outline error:', err);
      setIsAiDrawing(false);
      showToast('Error generating AI house outline — using default wireframe');
    }
  };

  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const handleOpenLiveCameraModal = async () => {
    setCameraError(null);
    setUsingFallback(false);
    dialogRef.current?.showModal();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('WebRTC getUserMedia is not supported in this environment.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1920, height: 1080 },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      const track = stream.getVideoTracks()[0];
      setCameraLabel(track?.label || 'USB Optical Mapping Camera (1080p)');
      setUsingFallback(false);
    } catch (err: any) {
      console.warn('Physical webcam unavailable, switching to simulated feed:', err);
      setCameraError(
        'No physical USB/WebRTC webcam detected or permission blocked. Activated simulated 1080p projection capture feed.'
      );
      setUsingFallback(true);
      setCameraLabel('Simulated HD Camera Feed (1920x1080 @ 30FPS)');
    }
  };

  const handleCloseCameraModal = () => {
    stopCameraStream();
    dialogRef.current?.close();
  };

  const handleSnapPhoto = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1920;
    canvas.height = 1080;

    if (!usingFallback && videoRef.current && videoRef.current.videoWidth > 0) {
      ctx.drawImage(videoRef.current, 0, 0, 1920, 1080);
    } else {
      const simImg = new Image();
      simImg.crossOrigin = 'anonymous';
      simImg.src = activePhotoUrl;
      try {
        ctx.drawImage(simImg, 0, 0, 1920, 1080);
      } catch {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 1920, 1080);
      }
      ctx.fillStyle = 'rgba(0, 240, 255, 0.9)';
      ctx.font = 'bold 22px monospace';
      ctx.fillText(
        `LUMEN-MAP OPTICAL RETICLE [1920x1080] — ${new Date().toLocaleTimeString()}`,
        40,
        60
      );
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCustomReferencePhoto(dataUrl);
    showToast(
      'Captured Perspective-Locked RAW Frame of Austin Ranch House (1920x1080)'
    );
    handleCloseCameraModal();
    runAutoDetectHouseStructure();
  };

  const handleCagePointerDown = (
    e: React.PointerEvent<SVGGElement>,
    idx: number
  ) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingHandleIdx(idx);
  };

  const handleCagePointerMove = (e: React.PointerEvent<SVGSVGElement | SVGGElement>) => {
    if (draggingHandleIdx === null) return;
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const screenCTM = svg.getScreenCTM();
    if (!screenCTM) return;
    const transformed = pt.matrixTransform(screenCTM.inverse());
    // Allow dragging up to 150%+ outside the 100% (420x420) view window into overscan space
    const x = Math.max(-210, Math.min(630, Math.round(transformed.x)));
    const y = Math.max(-210, Math.min(630, Math.round(transformed.y)));
    updatePerspectiveCagePoint(draggingHandleIdx, { x, y });
  };

  const handleCagePointerUp = (e: React.PointerEvent<SVGSVGElement | SVGGElement>) => {
    if (draggingHandleIdx !== null) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      setDraggingHandleIdx(null);
    }
  };

  return (
    <div className="flex-1 flex min-h-0 bg-[#0d121b] text-slate-100 select-none overflow-hidden">
      {/* Hidden File Input for IMPORT REFERENCE PHOTO */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {/* Hidden File Input for UPLOAD HOUSE OUTLINE (.svg, .json, image) */}
      <input
        ref={outlineFileInputRef}
        type="file"
        accept=".svg,.json,image/*,.jfif"
        onChange={handleOutlineFileInputChange}
        className="hidden"
      />

      {/* Hidden 1920x1080 Canvas for Frame Capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* NATIVE <dialog> MODAL FOR LIVE WEBRTC CAMERA CAPTURE */}
      <dialog
        ref={dialogRef}
        onClose={handleCloseCameraModal}
        className="backdrop:bg-black/85 bg-[#0f172a] text-slate-100 rounded-2xl border border-[#273852] p-0 shadow-2xl max-w-3xl w-full overflow-hidden m-auto"
      >
        <div className="p-4 bg-[#141e33] border-b border-[#23314d] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-400/40 flex items-center justify-center">
              <Camera className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">
                Live WebRTC Projection Camera Calibration
              </h3>
              <p className="text-[11px] font-mono text-slate-400">
                {cameraLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseCameraModal}
            className="p-1.5 rounded-lg bg-[#1c273e] hover:bg-[#273656] text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {cameraError && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold">Hardware Status:</span> {cameraError}
              </div>
            </div>
          )}

          {/* Video Feed / Simulated Feed Viewport */}
          <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-[#263753] flex items-center justify-center">
            {/* Real WebRTC Video Element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${usingFallback ? 'hidden' : 'block'}`}
            />

            {/* Simulated Live Camera Feed when no physical webcam is connected */}
            {usingFallback && (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={activePhotoUrl}
                  alt="Simulated Live Feed"
                  className="w-full h-full object-cover brightness-90 contrast-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />
              </div>
            )}

            {/* Camera Reticle & Overlays */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded bg-red-600/80 backdrop-blur-sm text-[10px] font-mono font-bold tracking-wider uppercase text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  {usingFallback ? 'SIMULATED FEED [1080P 30FPS]' : 'LIVE STREAM [1080P]'}
                </span>
                <span className="px-2.5 py-1 rounded bg-black/60 backdrop-blur-sm text-[10px] font-mono text-cyan-400 border border-cyan-500/30">
                  FOV: 84° • ISO 200 • 1/60s
                </span>
              </div>

              {/* Center Crosshair & Alignment Grid */}
              <div className="self-center flex items-center justify-center relative w-24 h-24">
                <div className="w-full h-[1px] bg-cyan-400/60" />
                <div className="h-full w-[1px] bg-cyan-400/60 absolute" />
                <div className="w-12 h-12 rounded-full border border-cyan-400/50 absolute" />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 bg-black/60 px-3 py-1.5 rounded-lg border border-slate-700/50 backdrop-blur-sm">
                <span>PROJECTOR HOMOGRAPHY MATRIX: LOCKED</span>
                <span>ASPECT: {aspectRatioLock}</span>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCloseCameraModal}
              className="px-4 py-2.5 rounded-lg bg-[#182236] hover:bg-[#202d47] border border-[#2c3c5b] text-xs font-bold text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSnapPhoto}
              className="px-5 py-2.5 rounded-lg bg-[#2573f0] hover:bg-[#1d64d8] text-white text-xs font-extrabold tracking-wider uppercase shadow-[0_4px_16px_rgba(37,115,240,0.45)] border border-blue-400/40 inline-flex items-center gap-2 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              SNAP PERSPECTIVE-LOCKED PHOTO
            </button>
          </div>
        </div>
      </dialog>

      {/* LEFT & CENTER WORKSPACE (TOP TOOLBAR + DUAL-SQUARE VIEWPORT) */}
      <div className="flex-1 min-w-0 flex flex-col p-5 overflow-hidden">
        {/* TOP CAPTURE & AUTO-DETECTION TOOLBAR */}
        <div className="flex flex-wrap items-center gap-3 mb-4 shrink-0">
          <button
            type="button"
            onClick={navigateBack}
            className="h-11 px-4 rounded-lg bg-[#182335] hover:bg-[#202f48] border border-cyan-500/60 hover:border-cyan-400 text-cyan-300 hover:text-white text-xs font-extrabold tracking-wider uppercase inline-flex items-center gap-2 transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)] cursor-pointer"
            title="Go back to previous screen (Alt+Left)"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span>BACK</span>
          </button>

          <button
            type="button"
            onClick={saveCurrentProject}
            className="h-11 px-4 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/70 hover:border-emerald-400 text-emerald-300 hover:text-white text-xs font-extrabold tracking-wider uppercase inline-flex items-center gap-2 transition-all shadow-[0_0_10px_rgba(16,185,129,0.25)] cursor-pointer"
            title="Save current project to storage (Ctrl+S)"
          >
            <Save className="w-4 h-4 text-emerald-400" />
            <span>SAVE</span>
          </button>

          <div className="h-8 w-[1px] bg-[#293850] mx-0.5" />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-11 px-4 rounded-lg bg-[#1d2536] hover:bg-[#263147] border border-[#2f3c56] text-xs font-bold tracking-wider uppercase text-slate-100 inline-flex items-center gap-2.5 transition-colors cursor-pointer"
            title="Import reference photo from your computer (image/*)"
          >
            <FileImage className="w-4 h-4 text-slate-300" />
            IMPORT REFERENCE PHOTO
          </button>

          {/* UPLOAD HOUSE OUTLINE (.svg, .json, image) */}
          <button
            type="button"
            onClick={() => outlineFileInputRef.current?.click()}
            className="h-11 px-4 rounded-lg bg-[#182336] hover:bg-[#202f48] border border-cyan-500/50 hover:border-cyan-400 text-xs font-bold tracking-wider uppercase text-cyan-200 hover:text-white inline-flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
            title="Upload an already-made house outline (.svg, .json, or lineart image)"
          >
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>UPLOAD HOUSE OUTLINE</span>
          </button>

          {/* AI DRAW HOUSE OUTLINE (Façade Architect & Lineart Generator) */}
          <button
            type="button"
            onClick={() => setIsAiDrawModalOpen(true)}
            className="h-11 px-4 rounded-lg bg-gradient-to-r from-purple-700/80 to-blue-600/80 hover:from-purple-600 hover:to-blue-500 border border-purple-400/50 text-xs font-extrabold tracking-wider uppercase text-white inline-flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(168,85,247,0.35)] cursor-pointer"
            title="Use AI to draw and create an architectural house mapping outline"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>AI DRAW HOUSE OUTLINE</span>
          </button>

          <button
            type="button"
            onClick={handleOpenLiveCameraModal}
            className="h-11 px-4 rounded-lg bg-[#1d2536] hover:bg-[#263147] border border-[#2f3c56] text-xs font-bold tracking-wider uppercase text-slate-100 inline-flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <Camera className="w-4 h-4 text-slate-300" />
            LIVE CAMERA CAPTURE
          </button>

          <div className="flex items-center gap-2 ml-1">
            <div className="flex flex-col justify-center">
              <label
                htmlFor="aspect-lock-select"
                className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5"
              >
                ASPECT RATIO LOCK
              </label>
              <select
                id="aspect-lock-select"
                value={aspectRatioLock}
                onChange={(e) =>
                  setAspectRatioLock(e.target.value as '16:9' | '16:10' | '4:3')
                }
                className="h-8 bg-[#1a2232] border border-[#2f3c56] rounded px-3 text-xs font-bold text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="16:9">16:9</option>
                <option value="16:10">16:10</option>
                <option value="4:3">4:3</option>
              </select>
            </div>

            {/* RESET CAGE Button */}
            <button
              type="button"
              onClick={resetPerspectiveCage}
              className="h-8 mt-3.5 px-3 rounded bg-[#1c273a] hover:bg-[#253652] border border-cyan-500/40 text-[11px] font-bold uppercase tracking-wider text-cyan-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Reset 4 Green Perspective Corner Pins to Default Bounds"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              RESET CAGE
            </button>
          </div>

          {/* Quick Asset Picker for Austin's Bundled Samples */}
          <div className="flex items-center gap-1.5 bg-[#131a28] px-2.5 py-1.5 rounded-lg border border-[#25324a]">
            <span className="text-[10px] font-mono uppercase text-cyan-400 mr-1">
              Assets:
            </span>
            {BUNDLED_HOUSE_PHOTOS.map((sample) => (
              <button
                key={sample.url}
                type="button"
                onClick={() =>
                  setPhotoToLayoutParams({
                    customReferencePhotoUrl: sample.url,
                  })
                }
                className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                  activePhotoUrl === sample.url
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#1c2538] text-slate-300 hover:text-white'
                }`}
              >
                {sample.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAutoDetectHouseStructure}
            disabled={isScanning}
            className="h-11 px-5 rounded-lg bg-[#2573f0] hover:bg-[#1e63d4] disabled:opacity-60 text-xs font-extrabold tracking-wider uppercase text-white shadow-[0_4px_18px_rgba(37,115,240,0.45)] border border-blue-400/40 inline-flex items-center gap-2 ml-auto transition-all cursor-pointer"
          >
            <Wand2 className={`w-4 h-4 ${isScanning ? 'animate-spin text-cyan-200' : ''}`} />
            {isScanning ? 'DETECTING CONTOURS...' : 'AUTO-DETECT HOUSE STRUCTURE'}
          </button>
        </div>

        {/* CENTER DUAL-SQUARE COMPARISON VIEWPORT WITH DRAG-AND-DROP FILE IMPORT */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="flex-1 min-h-0 relative grid grid-cols-2 gap-5 items-stretch"
        >
          {/* Visual Drag-and-Drop Active Overlay */}
          {isDraggingFile && (
            <div className="absolute inset-0 z-50 bg-[#060a14]/90 border-2 border-dashed border-cyan-400 rounded-xl flex flex-col items-center justify-center gap-3 backdrop-blur-md pointer-events-none animate-in fade-in duration-150">
              <div className="w-16 h-16 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.6)]">
                <Upload className="w-8 h-8 text-cyan-300 animate-bounce" />
              </div>
              <div className="text-center">
                <h3 className="text-base font-extrabold uppercase tracking-wider text-white">
                  Drop House Outline or Photo Here
                </h3>
                <p className="text-xs font-mono text-cyan-300 mt-1">
                  Supports .SVG, .PNG, .JPG, .JFIF, .WEBP, or .JSON Vector Outlines
                </p>
                <span className="inline-block mt-2 px-3 py-1 rounded bg-[#101b2d] border border-cyan-500/40 text-[10px] font-mono text-slate-300">
                  Auto-converts into perspective-locked vector polygons
                </span>
              </div>
            </div>
          )}

          {/* LEFT SQUARE: SOURCE PHOTO & PERSPECTIVE CAGE */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                SOURCE PHOTO &amp; PERSPECTIVE CAGE
              </h2>
              <span className="text-[11px] font-mono text-emerald-400">
                Interactive Homography (Drag Corners)
              </span>
            </div>
            <div
              onWheel={(e) => {
                e.preventDefault();
                const delta = e.deltaY < 0 ? 10 : -10;
                setSourceZoom((z) => Math.max(25, Math.min(250, z + delta)));
              }}
              className="flex-1 rounded-lg bg-[#050811] border border-[#263248] relative overflow-hidden flex items-center justify-center"
            >
              <div className="absolute top-2.5 right-2.5 z-10">
                <PreviewZoomControl
                  zoom={sourceZoom}
                  onChange={setSourceZoom}
                  pan={sourcePan}
                  onResetPan={resetSourcePan}
                  compact
                />
              </div>

              <svg
                ref={svgRef}
                viewBox={computeZoomViewBox(420, 420, sourceZoom, sourcePan.x, sourcePan.y).viewBox}
                className={`w-full h-full object-contain ${sourcePan.x !== 0 || sourcePan.y !== 0 ? 'cursor-grab' : 'cursor-crosshair'}`}
                onPointerDown={(e) => {
                  handleSourceMiddleDown(e);
                }}
                onPointerMove={(e) => {
                  if (handleSourceMiddleMove(e)) return;
                  handleCagePointerMove(e);
                }}
                onPointerUp={(e) => {
                  handleSourceMiddleUp(e);
                  handleCagePointerUp(e);
                }}
                onPointerLeave={(e) => {
                  handleSourceMiddleUp(e);
                  handleCagePointerUp(e);
                }}
                onMouseDown={handleSourceMiddleMouseDown}
              >
                {/* Overscan Pasteboard Background */}
                <rect
                  x="-420"
                  y="-420"
                  width="1260"
                  height="1260"
                  fill="#050811"
                />
                {/* 100% View Window Boundary Box */}
                <rect
                  x="0"
                  y="0"
                  width="420"
                  height="420"
                  fill="#000000"
                  stroke="#334155"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                />

                {/* Aspect Ratio Lock Boundary Frame Guide */}
                <g className="pointer-events-none select-none">
                  <rect
                    x={aspectFrame.x}
                    y={aspectFrame.y}
                    width={aspectFrame.w}
                    height={aspectFrame.h}
                    fill="none"
                    stroke="#00f0ff"
                    strokeWidth="1.8"
                    strokeDasharray="6 4"
                    opacity="0.85"
                  />
                  <rect
                    x={aspectFrame.x + 6}
                    y={aspectFrame.y + 6}
                    width="118"
                    height="18"
                    rx="3"
                    fill="rgba(0,0,0,0.85)"
                    stroke="#00f0ff"
                    strokeWidth="0.8"
                  />
                  <text
                    x={aspectFrame.x + 10}
                    y={aspectFrame.y + 19}
                    fill="#00f0ff"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    LOCK {aspectRatioLock} [{aspectFrame.w}x{aspectFrame.h}]
                  </text>
                </g>
                <image
                  href={activePhotoUrl}
                  x="0"
                  y="70"
                  width="420"
                  height="280"
                  preserveAspectRatio="xMidYMid meet"
                  style={{
                    filter: `contrast(${100 + shadowContrastBoost * 0.4}%)`,
                  }}
                />

                {/* Green 4-Point Homography Perspective Correction Cage */}
                <g>
                  {/* Outer Reference Bounding Box */}
                  <rect
                    x="25"
                    y="110"
                    width="370"
                    height="205"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="1.5"
                    strokeOpacity="0.4"
                    strokeDasharray="4 4"
                  />

                  {/* Dynamically Warped Perspective Polygon */}
                  <polygon
                    points={perspectiveCage
                      .map((pt) => `${pt.x},${pt.y}`)
                      .join(' ')}
                    fill="rgba(34, 197, 94, 0.12)"
                    stroke="#4ade80"
                    strokeWidth="2.5"
                  />

                  {/* Perspective Diagonal Crosshairs */}
                  <line
                    x1={perspectiveCage[0].x}
                    y1={perspectiveCage[0].y}
                    x2={perspectiveCage[2].x}
                    y2={perspectiveCage[2].y}
                    stroke="#4ade80"
                    strokeWidth="1.2"
                    strokeOpacity="0.7"
                  />
                  <line
                    x1={perspectiveCage[1].x}
                    y1={perspectiveCage[1].y}
                    x2={perspectiveCage[3].x}
                    y2={perspectiveCage[3].y}
                    stroke="#4ade80"
                    strokeWidth="1.2"
                    strokeOpacity="0.7"
                  />

                  {/* 4 Draggable Green Corner Pin Handles */}
                  {perspectiveCage.map((pt, idx) => {
                    const isDragging = draggingHandleIdx === idx;
                    return (
                      <g
                        key={idx}
                        onPointerDown={(e) => handleCagePointerDown(e, idx)}
                        onPointerMove={handleCagePointerMove}
                        onPointerUp={handleCagePointerUp}
                        className="cursor-grab active:cursor-grabbing"
                      >
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isDragging ? '14' : '10'}
                          fill="rgba(34, 197, 94, 0.4)"
                          stroke="#4ade80"
                          strokeWidth={isDragging ? '3' : '2'}
                          className="transition-all"
                        />
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="4"
                          fill="#ffffff"
                        />
                        {/* Corner Coordinates Badge */}
                        <text
                          x={pt.x + (idx % 2 === 0 ? -12 : 12)}
                          y={pt.y + (idx < 2 ? -12 : 18)}
                          fill="#4ade80"
                          fontSize="9"
                          fontFamily="monospace"
                          fontWeight="bold"
                          textAnchor={idx % 2 === 0 ? 'end' : 'start'}
                          className="pointer-events-none select-none drop-shadow"
                        >
                          C{idx + 1} [{pt.x}, {pt.y}]
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>
          </div>

          {/* RIGHT SQUARE: EXTRACTED LAYOUT PREVIEW (Dynamically Warps/Scales/Rotates/Tilts to Perspective Cage) */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                EXTRACTED LAYOUT PREVIEW (AUSTIN RANCH HOUSE)
              </h2>
              <div className="flex items-center gap-2 font-mono text-[10px]">
                <span className="text-cyan-400" title="Horizontal & Vertical Scale">
                  Scale: {(cageMetrics.scaleX * 100).toFixed(0)}% × {(cageMetrics.scaleY * 100).toFixed(0)}%
                </span>
                {cageMetrics.rotation !== 0 && (
                  <span className="text-emerald-400" title="Cage Rotation">
                    Rot: {cageMetrics.rotation > 0 ? `+${cageMetrics.rotation.toFixed(1)}°` : `${cageMetrics.rotation.toFixed(1)}°`}
                  </span>
                )}
                {cageMetrics.skewX !== 0 && (
                  <span className="text-amber-400" title="Keystone Horizontal Tilt / Shear">
                    Tilt: {cageMetrics.skewX > 0 ? `+${cageMetrics.skewX.toFixed(1)}°` : `${cageMetrics.skewX.toFixed(1)}°`}
                  </span>
                )}
              </div>
            </div>
            <div
              onWheel={(e) => {
                e.preventDefault();
                const delta = e.deltaY < 0 ? 10 : -10;
                setExtractedZoom((z) => Math.max(25, Math.min(250, z + delta)));
              }}
              className="flex-1 rounded-lg bg-[#050811] border border-[#263248] relative overflow-hidden flex items-center justify-center"
            >
              <span className="absolute top-2.5 left-2.5 z-10 px-2.5 py-1 rounded bg-black/75 border border-slate-700 text-[11px] font-mono text-slate-200">
                Extracted Zones: {extractedZonesCount}
              </span>

              {/* Compact 3x3 Homography Matrix HUD Badge */}
              <div className="absolute bottom-2.5 left-2.5 z-10 bg-[#0d1424]/90 border border-emerald-500/35 rounded-lg p-2 font-mono shadow-2xl backdrop-blur-md pointer-events-auto select-none">
                <div className="flex items-center justify-between gap-3 mb-1 text-[9px] font-bold text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    3x3 HOMOGRAPHY MATRIX
                  </span>
                  <span className="text-[8px] text-slate-400 uppercase">
                    {cvAnalysisResult ? 'CV Mapped' : 'Live Cage'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-0.5 text-[8.5px] text-center bg-black/60 p-1 rounded border border-emerald-500/20">
                  {liveHomographyMatrix.map((row, r) =>
                    row.map((val, c) => (
                      <span key={`hud-mat-${r}-${c}`} className="text-slate-200">
                        {val >= 0 ? `+${val.toFixed(2)}` : val.toFixed(2)}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="absolute top-2.5 right-2.5 z-10">
                <PreviewZoomControl
                  zoom={extractedZoom}
                  onChange={setExtractedZoom}
                  pan={extractedPan}
                  onResetPan={resetExtractedPan}
                  compact
                />
              </div>

              {/* Scanning Laser / Radar Animation Overlay */}
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none z-30 flex flex-col items-center justify-center bg-cyan-950/30 backdrop-blur-[1px]">
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_24px_#00f0ff] animate-pulse" />
                  <div className="px-4 py-2 rounded-lg bg-black/85 border border-cyan-400/80 text-xs font-mono font-bold text-cyan-300 tracking-wider shadow-2xl flex items-center gap-2.5">
                    <Wand2 className="w-4 h-4 animate-spin text-cyan-400" />
                    OPENCV CANNY SCANNING FACADE CONTOURS...
                  </div>
                </div>
              )}

              <svg
                viewBox={computeZoomViewBox(420, 420, extractedZoom, extractedPan.x, extractedPan.y).viewBox}
                className={`w-full h-full object-contain ${extractedPan.x !== 0 || extractedPan.y !== 0 ? 'cursor-grab' : ''}`}
                onPointerDown={(e) => {
                  handleExtractedMiddleDown(e);
                }}
                onPointerMove={(e) => {
                  handleExtractedMiddleMove(e);
                }}
                onPointerUp={(e) => {
                  handleExtractedMiddleUp(e);
                }}
                onPointerLeave={(e) => {
                  handleExtractedMiddleUp(e);
                }}
                onMouseDown={handleExtractedMiddleMouseDown}
              >
                {/* Overscan Pasteboard Background */}
                <rect
                  x="-420"
                  y="-420"
                  width="1260"
                  height="1260"
                  fill="#050811"
                />
                {/* 100% View Window Boundary Box */}
                <rect
                  x="0"
                  y="0"
                  width="420"
                  height="420"
                  fill="#000000"
                  stroke="#334155"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                />

                {/* Aspect Ratio Lock Boundary Frame Guide */}
                <g className="pointer-events-none select-none">
                  <rect
                    x={aspectFrame.x}
                    y={aspectFrame.y}
                    width={aspectFrame.w}
                    height={aspectFrame.h}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="1.8"
                    strokeDasharray="6 4"
                    opacity="0.85"
                  />
                  <rect
                    x={aspectFrame.x + 6}
                    y={aspectFrame.y + 6}
                    width="118"
                    height="18"
                    rx="3"
                    fill="rgba(0,0,0,0.85)"
                    stroke="#38bdf8"
                    strokeWidth="0.8"
                  />
                  <text
                    x={aspectFrame.x + 10}
                    y={aspectFrame.y + 19}
                    fill="#38bdf8"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    LOCK {aspectRatioLock} [{aspectFrame.w}x{aspectFrame.h}]
                  </text>
                </g>

                {/* Source House Photo Ghosting controlled by OVERLAY BLEND Slider */}
                <image
                  href={activePhotoUrl}
                  x="0"
                  y="70"
                  width="420"
                  height="280"
                  preserveAspectRatio="xMidYMid meet"
                  opacity={overlayBlend / 100}
                />

                {/* Perspective Cage Wireframe Reference overlay on extracted preview */}
                <polygon
                  points={perspectiveCage.map((pt) => `${pt.x},${pt.y}`).join(' ')}
                  fill="rgba(56, 189, 248, 0.05)"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />

                {/* Dynamically Warped/Scaled/Rotated/Tilted Extracted Architectural Vectors */}
                <g
                  transform={`translate(${210 + cageMetrics.translateX}, ${212.5 + cageMetrics.translateY}) rotate(${cageMetrics.rotation.toFixed(2)}) skewX(${cageMetrics.skewX.toFixed(2)}) skewY(${cageMetrics.skewY.toFixed(2)}) scale(${cageMetrics.scaleX.toFixed(3)}, ${cageMetrics.scaleY.toFixed(3)}) translate(-210, -212.5)`}
                >
                  {/* Austin's Actual Extracted Wireframe Image from assets/Houselayouts */}
                  <image
                    href={AUSTIN_HOUSE_ASSETS.wireframeLayout}
                    x="0"
                    y="70"
                    width="420"
                    height="280"
                    preserveAspectRatio="xMidYMid meet"
                    style={{
                      mixBlendMode: 'screen',
                      filter:
                        'sepia(100%) hue-rotate(150deg) saturate(500%) brightness(1.2)',
                    }}
                  />

                  {/* Color-Coded Semantic Segmentation Overlays Matching Austin's Ranch House */}
                  <g
                    fill="none"
                    strokeWidth={lineSimplification > 50 ? 2.2 : 1.5}
                    opacity={Math.max(0.35, edgeSensitivity / 100)}
                  >
                    {/* Left 2-Car Garage Gable & Door */}
                    <polygon
                      points="8,195 85,152 168,200"
                      stroke="#00f0ff"
                    />
                    <rect
                      x="36"
                      y="206"
                      width="100"
                      height="46"
                      stroke="#22c55e"
                      fill="rgba(34, 197, 94, 0.08)"
                    />

                    {/* Entry Portico Arch & Door */}
                    <polygon
                      points="148,180 176,164 205,182"
                      stroke="#ec4899"
                    />
                    <rect
                      x="166"
                      y="196"
                      width="28"
                      height="56"
                      stroke="#eab308"
                    />

                    {/* Right Bay Window Gable */}
                    <polygon
                      points="262,198 294,178 324,198"
                      stroke="#a855f7"
                    />

                    {/* Auto-Masked Windows (Center Picture Window, 3-Pane Bay Window, Far Right Window) */}
                    {autoMaskWindowsSky && (
                      <g stroke="#f43f5e" fill="rgba(244, 63, 94, 0.22)">
                        <rect x="216" y="208" width="34" height="30" />
                        <rect x="284" y="208" width="18" height="31" />
                        <rect x="351" y="208" width="21" height="25" />
                      </g>
                    )}

                    {/* OpenCV Detected Contour Polygons & Structural Zones */}
                    {cvAnalysisResult?.structural_zones?.map((zone, zIdx) => {
                      const isNorm = zone.bbox.x <= 1 && zone.bbox.w <= 1;
                      const bx = isNorm
                        ? Math.round(zone.bbox.x * 370 + 25)
                        : zone.bbox.x;
                      const by = isNorm
                        ? Math.round(110 + zone.bbox.y * 190)
                        : zone.bbox.y;
                      const bw = isNorm
                        ? Math.round(zone.bbox.w * 370)
                        : zone.bbox.w;
                      const bh = isNorm
                        ? Math.round(zone.bbox.h * 190)
                        : zone.bbox.h;
                      const neonPalette = [
                        '#10b981',
                        '#00f0ff',
                        '#38bdf8',
                        '#34d399',
                        '#22c55e',
                        '#a7f3d0',
                      ];
                      const neonColor = neonPalette[zIdx % neonPalette.length];
                      return (
                        <g key={zone.zone_id}>
                          <rect
                            x={bx}
                            y={by}
                            width={bw}
                            height={bh}
                            fill="rgba(16, 185, 129, 0.14)"
                            stroke={neonColor}
                            strokeWidth="2"
                            strokeDasharray="5 2.5"
                          />
                          <rect
                            x={bx}
                            y={by}
                            width={Math.min(bw, 50)}
                            height="12"
                            rx="2"
                            fill="rgba(0, 0, 0, 0.85)"
                            stroke={neonColor}
                            strokeWidth="0.8"
                          />
                          <text
                            x={bx + 3}
                            y={by + 9}
                            fill={neonColor}
                            fontSize="8"
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            {zone.zone_id.toUpperCase()}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                </g>
              </svg>
            </div>
          </div>

          {/* FLOATING CENTER OVERLAY BLEND WIDGET */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-[195px] rounded-lg bg-[#182132]/95 border border-[#32425f] p-3 shadow-2xl backdrop-blur-md">
            <div className="text-[11px] font-bold uppercase tracking-wider text-center text-slate-200 mb-2">
              OVERLAY BLEND
            </div>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() =>
                  setPhotoToLayoutParams({
                    overlayBlend: Math.max(0, overlayBlend - 10),
                  })
                }
                className="p-1 rounded hover:bg-slate-700 text-slate-300"
                aria-label="Decrease Overlay Blend"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={overlayBlend}
                onChange={(e) =>
                  setPhotoToLayoutParams({
                    overlayBlend: Number(e.target.value),
                  })
                }
                className="w-20"
              />
              <span className="text-xs font-mono font-bold text-white w-9 text-right">
                {overlayBlend}%
              </span>
              <button
                type="button"
                onClick={() =>
                  setPhotoToLayoutParams({
                    overlayBlend: Math.min(100, overlayBlend + 10),
                  })
                }
                className="p-1 rounded hover:bg-slate-700 text-slate-300"
                aria-label="Increase Overlay Blend"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SEGMENTATION & TRACING PARAMETER PANEL */}
      <aside className="w-[300px] shrink-0 bg-[#111723] border-l border-[#1f293a] p-5 flex flex-col justify-between">
        <div className="space-y-5">
          <h2 className="text-sm font-bold tracking-wider uppercase text-slate-200">
            SEGMENTATION &amp; TRACING
          </h2>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-300">
                Edge Detection Sensitivity
              </span>
              <span className="px-2 py-0.5 rounded bg-[#1d273b] border border-[#2f3e5b] text-xs font-mono font-bold text-slate-100">
                {edgeSensitivity}%
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={edgeSensitivity}
              onChange={(e) =>
                setPhotoToLayoutParams({
                  edgeSensitivity: Number(e.target.value),
                })
              }
              className="w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-300">
                Line Simplification
              </span>
              <span className="px-2 py-0.5 rounded bg-[#1d273b] border border-[#2f3e5b] text-xs font-mono font-bold text-slate-100">
                {lineSimplification}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={lineSimplification}
              onChange={(e) =>
                setPhotoToLayoutParams({
                  lineSimplification: Number(e.target.value),
                })
              }
              className="w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-300">
                Shadow &amp; Contrast Boost
              </span>
              <span className="px-2 py-0.5 rounded bg-[#1d273b] border border-[#2f3e5b] text-xs font-mono font-bold text-slate-100">
                {shadowContrastBoost}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={shadowContrastBoost}
              onChange={(e) =>
                setPhotoToLayoutParams({
                  shadowContrastBoost: Number(e.target.value),
                })
              }
              className="w-full"
            />
          </div>

          <div className="pt-2 border-t border-[#222d42] space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoMaskWindowsSky}
                onChange={(e) =>
                  setPhotoToLayoutParams({
                    autoMaskWindowsSky: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-bold tracking-wide uppercase text-slate-200">
                AUTO-MASK WINDOWS &amp; SKY
              </span>
            </label>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Loaded house profile:{' '}
              <code className="text-cyan-300">
                assets/Houselayouts/dd58ee98.jfif
              </code>
              . Automatically assigns blackout cutouts to center, bay, and
              right windows.
            </p>
          </div>

          {/* Compact 3x3 Homography Matrix Readout Card */}
          <div className="pt-2 border-t border-[#222d42] space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                3x3 HOMOGRAPHY MATRIX
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {cvAnalysisResult ? 'OPENCV LOCKED' : 'LIVE CAGE'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 bg-[#090e18] p-2 rounded-lg border border-emerald-500/30 font-mono text-[11px] text-center shadow-inner">
              {liveHomographyMatrix.map((row, r) =>
                row.map((val, c) => (
                  <span
                    key={`insp-${r}-${c}`}
                    className="p-1 rounded bg-[#131b2e] text-slate-200 border border-emerald-500/15"
                  >
                    {val >= 0 ? `+${val.toFixed(3)}` : val.toFixed(3)}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Export Contours JSON & Snapshot Layout PNG Action Row */}
        <div className="space-y-2 mt-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleExportContoursJson}
              className="py-2.5 px-2 rounded-lg bg-[#142338] hover:bg-[#1c3352] border border-cyan-500/40 text-[11px] font-bold text-cyan-200 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Export all contours, cage coordinates, and homography matrix as JSON"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              EXPORT CONTOURS (.JSON)
            </button>

            <button
              type="button"
              onClick={handleSnapshotLayoutPng}
              className="py-2.5 px-2 rounded-lg bg-[#142338] hover:bg-[#1c3352] border border-emerald-500/40 text-[11px] font-bold text-emerald-200 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Render and download layout preview snapshot with homography matrix as PNG"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              SNAPSHOT LAYOUT (.PNG)
            </button>
          </div>

          {/* Bottom CTA: CONVERT TO EDITABLE LAYOUT -> Routes to Screen 4 (Vectors) */}
          <button
            type="button"
            onClick={handleConvertToEditableLayout}
            className="w-full py-4 px-4 rounded-lg bg-[#2573f0] hover:bg-[#1d64d8] active:bg-[#1956bc] text-white font-extrabold text-xs tracking-wider uppercase shadow-[0_6px_20px_rgba(37,115,240,0.45)] border border-blue-400/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>CONVERT TO EDITABLE LAYOUT (SCREEN 4)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* AI DRAW HOUSE OUTLINE MODAL */}
      {isAiDrawModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !isAiDrawing && setIsAiDrawModalOpen(false)}
        >
          <div
            className="bg-[#101725] border border-[#273852] rounded-2xl max-w-3xl w-full p-6 shadow-2xl flex flex-col gap-5 text-slate-100 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#23314d]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600/30 to-blue-600/30 border border-purple-400/50 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold uppercase tracking-wider text-white">
                    AI Architectural Façade Generator
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Synthesize perspective-locked CAD blueprints, lineart, and projection zones
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isAiDrawing && setIsAiDrawModalOpen(false)}
                className="p-1.5 rounded-lg bg-[#1c273e] hover:bg-[#273656] text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Architectural Style Presets Grid */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                1. Select Architectural Façade Style Preset
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {ARCHITECTURAL_STYLE_PRESETS.map((preset) => {
                  const isSelected = aiDrawStyle === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectAiStylePreset(preset.id)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-[#1b263b] border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400/50'
                          : 'bg-[#121927] hover:bg-[#182235] border-[#253248]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase"
                          style={{
                            backgroundColor: `${preset.accentColor}20`,
                            color: preset.accentColor,
                            border: `1px solid ${preset.accentColor}40`,
                          }}
                        >
                          {preset.category}
                        </span>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-cyan-400 flex items-center justify-center">
                            <Check className="w-3 h-3 text-[#0d121b] stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-white">
                          {preset.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 leading-snug mt-1">
                          {preset.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prompt Conditioning */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  2. Architectural Prompt Conditioning
                </label>
                <span className="text-[10px] font-mono text-cyan-400">
                  Façade Vector Geometry
                </span>
              </div>
              <textarea
                value={aiDrawPrompt}
                onChange={(e) => setAiDrawPrompt(e.target.value)}
                rows={3}
                className="w-full bg-[#0b1019] border border-[#273852] focus:border-cyan-400 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-500 font-mono resize-none focus:outline-none"
                placeholder="Describe specific architectural facade features (roofline gables, window mullions, doors, columns, garage)..."
              />
            </div>

            {/* Calibration & Darkroom Options */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                3. Projection Calibration Options
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-center gap-3 p-3 rounded-lg bg-[#0e1624] border border-[#25334a] cursor-pointer hover:border-cyan-500/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={aiDrawInvert}
                    onChange={(e) => setAiDrawInvert(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500/40 bg-slate-900"
                  />
                  <div className="text-left">
                    <div className="text-xs font-bold text-slate-200">
                      Inverted Darkroom Calibration
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Pure white vectors on pitch black background (#000000)
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg bg-[#0e1624] border border-[#25334a] cursor-pointer hover:border-cyan-500/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={aiDrawFiducials}
                    onChange={(e) => setAiDrawFiducials(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500/40 bg-slate-900"
                  />
                  <div className="text-left">
                    <div className="text-xs font-bold text-slate-200">
                      Corner Optical Fiducials
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Target crosshairs for physical projector alignment
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[#23314d]">
              <button
                type="button"
                onClick={() => setIsAiDrawModalOpen(false)}
                disabled={isAiDrawing}
                className="px-4 py-2 rounded-lg bg-[#192336] hover:bg-[#22314b] text-slate-300 text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRunAiDrawOutline}
                disabled={isAiDrawing}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-60 text-white text-xs font-extrabold tracking-wider uppercase shadow-[0_0_20px_rgba(168,85,247,0.4)] border border-purple-400/50 inline-flex items-center gap-2 transition-all cursor-pointer"
              >
                <Sparkles className={`w-4 h-4 text-amber-300 ${isAiDrawing ? 'animate-spin' : ''}`} />
                <span>
                  {isAiDrawing ? 'GENERATING ARCHITECTURAL BLUEPRINT...' : 'GENERATE OUTLINE WITH AI'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
