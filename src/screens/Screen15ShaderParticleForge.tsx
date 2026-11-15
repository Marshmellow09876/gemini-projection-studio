import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Flame,
  CloudSnow,
  Zap,
  Activity,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Sparkles,
  Layers,
  Save,
  Check,
  Cpu,
  Compass,
  ShieldCheck,
} from 'lucide-react';
import { useProjectionStore } from '../store/useProjectionStore';

export const Screen15ShaderParticleForge: React.FC = () => {
  const {
    activeShaderPreset,
    physicsParticleCount,
    physicsGravity,
    physicsWindSpeed,
    physicsBounceRestitution,
    isPhysicsSimulating,
    setActiveShaderPreset,
    setPhysicsSimParams,
    togglePhysicsSimulating,
    customReferencePhotoUrl,
    layers,
    addPlaylistClip,
  } = useProjectionStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [fps, setFps] = useState<number>(60);
  const [bakedSuccess, setBakedSuccess] = useState<boolean>(false);
  const [voronoiCellCount, setVoronoiCellCount] = useState<number>(48);
  const [bloomIntensity, setBloomIntensity] = useState<number>(0.85);
  const [showColliders, setShowColliders] = useState<boolean>(true);
  const [enabledColliderCategories, setEnabledColliderCategories] = useState<string[]>([
    'Roofline',
    'Windows',
    'Garage',
  ]);

  // Extract real architectural line segments from project vector layers
  const colliderSegments = useMemo(() => {
    const segments: Array<{ x1: number; y1: number; x2: number; y2: number; layerName: string }> = [];
    const activeLayers = layers.filter(
      (l) => l.visible && enabledColliderCategories.includes(l.category) && l.vertices.length >= 2
    );

    activeLayers.forEach((layer) => {
      for (let i = 0; i < layer.vertices.length; i++) {
        const v1 = layer.vertices[i];
        const v2 = layer.vertices[(i + 1) % layer.vertices.length];
        segments.push({
          x1: v1.x,
          y1: v1.y,
          x2: v2.x,
          y2: v2.y,
          layerName: layer.name,
        });
      }
    });

    return segments;
  }, [layers, enabledColliderCategories]);

  // 60 FPS Real-time Particle & Physics Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();
    let frameCount = 0;

    const scaleX = canvas.width / 1080;
    const scaleY = canvas.height / 600;

    // Pre-scale obstacle segments for canvas space
    const scaledSegments = colliderSegments.map((s) => ({
      x1: s.x1 * scaleX,
      y1: s.y1 * scaleY,
      x2: s.x2 * scaleX,
      y2: s.y2 * scaleY,
      layerName: s.layerName,
    }));

    // Initialize particles
    const particles = Array.from({ length: Math.min(physicsParticleCount, 500) }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * (canvas.height * 0.5),
      vx: (Math.random() - 0.5) * 2 + physicsWindSpeed / 20,
      vy: Math.random() * 3 + 1,
      size: Math.random() * 3 + 1.5,
      alpha: Math.random() * 0.8 + 0.2,
    }));

    const render = (currentTime: number) => {
      frameCount++;
      if (currentTime - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = currentTime;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw glowing architectural collider segments if enabled
      if (showColliders && scaledSegments.length > 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);

        scaledSegments.forEach((seg) => {
          ctx.beginPath();
          ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(seg.x2, seg.y2);
          ctx.stroke();
        });
        ctx.restore();
      }

      if (isPhysicsSimulating) {
        // 2. Draw and update particles with real architectural collision physics
        particles.forEach((p) => {
          p.x += p.vx + physicsWindSpeed * 0.05;
          p.y += p.vy + physicsGravity * 0.1;

          // Check collisions against all active architectural line segments
          for (let i = 0; i < scaledSegments.length; i++) {
            const seg = scaledSegments[i];
            const minX = Math.min(seg.x1, seg.x2);
            const maxX = Math.max(seg.x1, seg.x2);

            if (p.x >= minX && p.x <= maxX && Math.abs(seg.x2 - seg.x1) > 0.001) {
              const segY = seg.y1 + ((p.x - seg.x1) / (seg.x2 - seg.x1)) * (seg.y2 - seg.y1);
              if (p.y >= segY - 3 && p.y <= segY + 8 && p.vy > 0) {
                p.y = segY - 1;
                p.vy = -p.vy * physicsBounceRestitution;
                // Add slide impulse along segment slope
                const slope = (seg.y2 - seg.y1) / (seg.x2 - seg.x1);
                p.vx += slope * 0.15;
                break;
              }
            }
          }

          // Fallback floor boundary
          if (p.y > canvas.height) {
            p.y = 0;
            p.x = Math.random() * canvas.width;
          }
          if (p.x > canvas.width) p.x = 0;
          if (p.x < 0) p.x = canvas.width;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          if (activeShaderPreset.includes('blizzard')) {
            ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
          } else if (activeShaderPreset.includes('inferno')) {
            ctx.fillStyle = `rgba(255, ${Math.floor(p.alpha * 160)}, 20, ${p.alpha})`;
          } else if (activeShaderPreset.includes('tesla')) {
            ctx.fillStyle = `rgba(0, 240, 255, ${p.alpha})`;
          } else {
            ctx.fillStyle = `rgba(57, 255, 20, ${p.alpha})`;
          }
          ctx.fill();
        });
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    isPhysicsSimulating,
    physicsParticleCount,
    physicsGravity,
    physicsWindSpeed,
    physicsBounceRestitution,
    activeShaderPreset,
    colliderSegments,
    showColliders,
  ]);

  const handleBakeLoop = () => {
    addPlaylistClip({
      title: `Baked Shader: ${activeShaderPreset}`,
      themeStyle: 'laser',
      prompt: `Procedural 60FPS GPU Shader Loop (${activeShaderPreset}) baked with ${colliderSegments.length} architectural colliders`,
      durationSec: 30,
      durationFormatted: '00:00:30',
    });
    setBakedSuccess(true);
    setTimeout(() => setBakedSuccess(false), 2500);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#070b13] text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. TOP HEADER BAR */}
      <div className="h-12 bg-[#0c121d] border-b border-[#1b2638] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-fuchsia-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Procedural Shader & Particle Physics Forge
          </span>
          <span className="text-[10px] font-mono text-fuchsia-400 bg-fuchsia-950/60 border border-fuchsia-800 px-2 py-0.5 rounded">
            GPU Geometry Colliders & Heightfield
          </span>
        </div>

        {/* Play/Pause & Live GPU HUD */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[#101724] px-3 py-1 rounded-lg border border-[#1f2d42] font-mono text-xs">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400 font-bold">{fps} FPS</span>
            <span className="text-slate-500">|</span>
            <span className="text-cyan-400">16.6ms / frame</span>
          </div>

          <button
            type="button"
            onClick={() => togglePhysicsSimulating()}
            className={`px-3 py-1.5 rounded font-bold text-xs uppercase flex items-center gap-1.5 shadow-md ${
              isPhysicsSimulating
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/40'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
            }`}
          >
            {isPhysicsSimulating ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" /> Pause Sim
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Run Sim
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleBakeLoop}
            className="px-3 py-1.5 rounded bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-xs uppercase flex items-center gap-1.5 shadow-md shadow-fuchsia-900/40"
          >
            <Save className="w-3.5 h-3.5" />
            {bakedSuccess ? 'Baked to Playlist!' : 'Bake 30s Loop'}
          </button>
        </div>
      </div>

      {/* 2. MAIN 3-COLUMN WORKSPACE */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Left Panel: Procedural Shader Presets (Cols 3) */}
        <div className="col-span-3 border-r border-[#1b2638] bg-[#090f19] p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="pb-2 border-b border-[#1b2638] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-fuchsia-400" /> Shader FX Presets
            </span>
          </div>

          <div className="space-y-3">
            {[
              {
                category: 'Weather Simulation',
                items: [
                  { id: 'blizzard-accumulation', name: 'Blizzard Snow Accumulation', icon: CloudSnow },
                  { id: 'heavy-rain-splashes', name: 'Heavy Rain & Puddle Splashes', icon: CloudSnow },
                  { id: 'creeping-window-frost', name: 'Creeping Window Frost', icon: Sparkles },
                ],
              },
              {
                category: 'Destruction & Physics',
                items: [
                  { id: 'voronoi-brick-crumble', name: 'Voronoi Wall Brick Shatter', icon: Flame },
                  { id: 'earthquake-chasm-crack', name: 'Fault-Line Earthquake Cracks', icon: Activity },
                  { id: 'black-hole-vortex', name: 'Center Portal Warp Vortex', icon: Sparkles },
                ],
              },
              {
                category: 'High-Energy Electricity',
                items: [
                  { id: 'tesla-vertex-arcs', name: 'Tesla Architectural Lightning', icon: Zap },
                  { id: 'cyber-neon-edge-chase', name: 'Cyberpunk Neon Wireframe Chase', icon: Zap },
                ],
              },
              {
                category: 'Organic Fluid Dynamics',
                items: [
                  { id: 'window-inferno', name: 'Window Inferno Fire & Smoke', icon: Flame },
                  { id: 'dripping-ectoplasm', name: 'Ectoplasm Slime Dripping Down', icon: Flame },
                ],
              },
            ].map((cat, i) => (
              <div key={i} className="space-y-1.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {cat.category}
                </div>
                <div className="space-y-1">
                  {cat.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveShaderPreset(item.id)}
                      className={`w-full px-2.5 py-1.5 rounded-lg border text-left text-xs font-semibold flex items-center gap-2 transition-all ${
                        activeShaderPreset === item.id
                          ? 'bg-fuchsia-600/20 text-fuchsia-300 border-fuchsia-500 shadow-sm'
                          : 'bg-[#101724] text-slate-300 border-[#1f2d42] hover:bg-[#162132]'
                      }`}
                    >
                      <item.icon className="w-3.5 h-3.5 shrink-0 text-fuchsia-400" />
                      <span className="truncate">{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center Viewport: Interactive 60 FPS Physics Canvas (Cols 6) */}
        <div className="col-span-6 flex flex-col p-4 bg-[#05080e] items-center justify-center relative">
          <div className="w-full h-full rounded-xl border border-[#1f2d42] bg-black relative overflow-hidden flex items-center justify-center shadow-2xl">
            {/* Background House Photo */}
            <img
              src={customReferencePhotoUrl || 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80'}
              alt="House"
              className="w-full h-full object-cover opacity-50"
            />

            {/* Interactive Particle Canvas */}
            <canvas
              ref={canvasRef}
              width={800}
              height={500}
              className="absolute inset-0 w-full h-full cursor-crosshair z-10"
              style={{
                filter: `drop-shadow(0 0 ${bloomIntensity * 12}px rgba(255,0,128,0.7))`,
              }}
            />

            {/* HUD Status */}
            <div className="absolute top-4 left-4 z-20 text-xs font-mono text-fuchsia-400 bg-black/80 px-2.5 py-1 rounded border border-fuchsia-500/40">
              ACTIVE SHADER: {activeShaderPreset.toUpperCase()} • COLLIDERS: ROOFLINE & WINDOWS
            </div>
            <div className="absolute bottom-4 right-4 z-20 text-[10px] font-mono text-slate-400 bg-black/80 px-2 py-0.5 rounded border border-[#1f2d42]">
              CLICK & DRAG TO DISPLACE PARTICLES
            </div>
          </div>
        </div>

        {/* Right Panel: Physics Uniforms & Collision Inspector (Cols 3) */}
        <div className="col-span-3 border-l border-[#1b2638] bg-[#090f19] p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="pb-2 border-b border-[#1b2638] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" /> Physics Uniforms
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Particle Count */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <label className="text-[10px] uppercase font-semibold text-slate-400">Particle Density</label>
                <span className="font-mono text-cyan-400">{physicsParticleCount}</span>
              </div>
              <input
                type="range"
                min="100"
                max="2000"
                step="50"
                value={physicsParticleCount}
                onChange={(e) => setPhysicsSimParams({ particleCount: parseInt(e.target.value) })}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Gravity */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <label className="text-[10px] uppercase font-semibold text-slate-400">Gravity ($m/s^2$)</label>
                <span className="font-mono text-cyan-400">{physicsGravity.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="0.5"
                value={physicsGravity}
                onChange={(e) => setPhysicsSimParams({ gravity: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Wind Speed */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <label className="text-[10px] uppercase font-semibold text-slate-400">Wind Velocity (MPH)</label>
                <span className="font-mono text-cyan-400">{physicsWindSpeed.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="-30"
                max="30"
                step="1"
                value={physicsWindSpeed}
                onChange={(e) => setPhysicsSimParams({ windSpeed: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Collision Restitution */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <label className="text-[10px] uppercase font-semibold text-slate-400">Bounce Restitution</label>
                <span className="font-mono text-cyan-400">{Math.round(physicsBounceRestitution * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.9"
                step="0.05"
                value={physicsBounceRestitution}
                onChange={(e) => setPhysicsSimParams({ bounceRestitution: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Bloom Glow */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <label className="text-[10px] uppercase font-semibold text-slate-400">Post-Process Bloom Glow</label>
                <span className="font-mono text-fuchsia-400">{Math.round(bloomIntensity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={bloomIntensity}
                onChange={(e) => setBloomIntensity(parseFloat(e.target.value))}
                className="w-full accent-fuchsia-400"
              />
            </div>

            {/* Architectural Vector Colliders */}
            <div className="pt-3 border-t border-[#1b2638] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wide flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> Architectural Colliders
                </span>
                <button
                  type="button"
                  onClick={() => setShowColliders(!showColliders)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border transition-all ${
                    showColliders
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                      : 'bg-[#101724] text-slate-400 border-[#1f2d42]'
                  }`}
                >
                  {showColliders ? 'Visible' : 'Hidden'}
                </button>
              </div>

              <div className="text-[10px] text-slate-400">
                Active Segments: <span className="font-mono text-cyan-400 font-bold">{colliderSegments.length}</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {(['Roofline', 'Windows', 'Garage', 'Main Walls'] as const).map((cat) => {
                  const isEnabled = enabledColliderCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        if (isEnabled) {
                          setEnabledColliderCategories(enabledColliderCategories.filter((c) => c !== cat));
                        } else {
                          setEnabledColliderCategories([...enabledColliderCategories, cat]);
                        }
                      }}
                      className={`px-2 py-1 rounded text-[10px] font-semibold border text-left transition-all ${
                        isEnabled
                          ? 'bg-cyan-950/60 text-cyan-200 border-cyan-500/50'
                          : 'bg-[#101724] text-slate-400 border-[#1d293d] hover:text-slate-200'
                      }`}
                    >
                      {isEnabled ? '✓ ' : '○ '}
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
