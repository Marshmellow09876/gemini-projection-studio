import React, { useState } from 'react';
import {
  X,
  Key,
  Server,
  Cloud,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  ExternalLink,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  AiProviderType,
  useProjectionStore,
} from '../store/useProjectionStore';

export const AiProviderSettingsModal: React.FC = () => {
  const {
    isAiSettingsModalOpen,
    setAiSettingsModalOpen,
    aiProviderConfig,
    updateAiProviderConfig,
    testAiProviderConnection,
    showToast,
  } = useProjectionStore();

  const [localConfig, setLocalConfig] = useState(aiProviderConfig);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({
    fal: false,
    replicate: false,
    runway: false,
  });
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  if (!isAiSettingsModalOpen) return null;

  const toggleShowKey = (provider: string) => {
    setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleTestConnection = async (provider: AiProviderType) => {
    setIsTesting(true);
    setTestResult(null);
    try {
      // First save local config
      updateAiProviderConfig(localConfig);
      const res = await testAiProviderConnection(provider);
      setTestResult(res);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndClose = () => {
    updateAiProviderConfig(localConfig);
    showToast(
      `AI Provider set to [${localConfig.activeProvider.toUpperCase()}]`
    );
    setAiSettingsModalOpen(false);
  };

  const PROVIDER_TABS: Array<{
    id: AiProviderType;
    label: string;
    sublabel: string;
    icon: React.FC<{ className?: string }>;
    tag: string;
  }> = [
    {
      id: 'fal',
      label: 'Fal.ai',
      sublabel: 'Wan 2.1 Video & ControlNet',
      icon: Cloud,
      tag: 'FASTEST CLOUD',
    },
    {
      id: 'replicate',
      label: 'Replicate',
      sublabel: 'CogVideoX & AnimateDiff',
      icon: Cpu,
      tag: 'DIFFUSION HUB',
    },
    {
      id: 'runway',
      label: 'RunwayML',
      sublabel: 'Gen-3 Alpha Turbo',
      icon: Zap,
      tag: 'CINEMATIC VIDEO',
    },
    {
      id: 'comfyui',
      label: 'Local ComfyUI',
      sublabel: 'NVIDIA GPU • Zero Cost',
      icon: Server,
      tag: 'PRIVATE LOCAL',
    },
    {
      id: 'simulation',
      label: 'Built-in Studio',
      sublabel: 'Offline Bundled Austin Assets',
      icon: Sparkles,
      tag: 'OFFLINE READY',
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-provider-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none animate-in fade-in duration-200"
    >
      <div className="w-full max-w-3xl bg-[#111724] border border-[#233148] rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* MODAL HEADER */}
        <div className="h-14 px-5 bg-[#162032] border-b border-[#233148] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2
                id="ai-provider-modal-title"
                className="text-sm font-extrabold uppercase tracking-wider text-white"
              >
                AI Generation Engine &amp; API Key Settings
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Choose cloud AI providers or connect to your local ComfyUI GPU
                rig
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAiSettingsModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PROVIDER TAB SELECTOR */}
        <div className="grid grid-cols-5 p-3 bg-[#0d131f] border-b border-[#1f2c42] gap-2 shrink-0">
          {PROVIDER_TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = localConfig.activeProvider === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setLocalConfig((prev) => ({
                    ...prev,
                    activeProvider: tab.id,
                  }))
                }
                className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-[#19273f] border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                    : 'bg-[#121927] border-[#223048] text-slate-300 hover:bg-[#162134] hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Icon
                    className={`w-4 h-4 ${
                      isSelected ? 'text-cyan-400' : 'text-slate-400'
                    }`}
                  />
                  <span
                    className={`px-1 py-0.2 rounded text-[8px] font-mono font-bold ${
                      isSelected
                        ? 'bg-cyan-950 text-cyan-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.tag}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold truncate">{tab.label}</div>
                  <div className="text-[9px] text-slate-400 truncate">
                    {tab.sublabel}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* MODAL BODY (Active Provider Settings) */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* PROVIDER CONFIG PANEL */}
          {localConfig.activeProvider === 'fal' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span>Fal.ai Cloud Video &amp; ControlNet Setup</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                      Recommended
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Fast cloud GPU inference for Wan 2.1, Kling 1.5, and Flux.1
                    with ControlNet Canny.
                  </p>
                </div>
                <a
                  href="https://fal.ai/dashboard/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 font-bold underline"
                >
                  <span>Get FAL_KEY</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* API Key Input */}
              <div>
                <label
                  htmlFor="fal-key-input"
                  className="block text-xs font-bold uppercase text-slate-300 mb-1"
                >
                  FAL_KEY Secret Token
                </label>
                <div className="relative">
                  <input
                    id="fal-key-input"
                    type={showKeys.fal ? 'text' : 'password'}
                    value={localConfig.falApiKey}
                    onChange={(e) =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        falApiKey: e.target.value,
                      }))
                    }
                    placeholder="fal_key_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full bg-[#0a0f18] border border-[#27374e] rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('fal')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showKeys.fal ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Model Preset Dropdown */}
              <div>
                <label
                  htmlFor="fal-model-select"
                  className="block text-xs font-bold uppercase text-slate-300 mb-1"
                >
                  Diffusion Model Preset
                </label>
                <select
                  id="fal-model-select"
                  value={localConfig.falModel}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      falModel: e.target.value,
                    }))
                  }
                  className="w-full bg-[#0a0f18] border border-[#27374e] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="fal-ai/wan-2.1/t2v">
                    Wan 2.1 Video (14B Text-to-Video / 720p/1080p)
                  </option>
                  <option value="fal-ai/flux/dev/controlnet">
                    Flux.1 Dev with ControlNet Canny (Locked to House Lines)
                  </option>
                  <option value="fal-ai/kling-video/v1.5/pro">
                    Kling 1.5 Pro (High Motion / Cinematic Video)
                  </option>
                  <option value="fal-ai/minimax/video-01">
                    MiniMax Hailuo Video-01
                  </option>
                </select>
              </div>
            </div>
          )}

          {localConfig.activeProvider === 'replicate' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Replicate Open-Source Diffusion Setup
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Host for CogVideoX, AnimateDiff, SDXL, and Stable Diffusion
                    Inpainting.
                  </p>
                </div>
                <a
                  href="https://replicate.com/account/api-tokens"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 font-bold underline"
                >
                  <span>Get REPLICATE_API_TOKEN</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div>
                <label
                  htmlFor="replicate-token-input"
                  className="block text-xs font-bold uppercase text-slate-300 mb-1"
                >
                  REPLICATE_API_TOKEN
                </label>
                <div className="relative">
                  <input
                    id="replicate-token-input"
                    type={showKeys.replicate ? 'text' : 'password'}
                    value={localConfig.replicateApiToken}
                    onChange={(e) =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        replicateApiToken: e.target.value,
                      }))
                    }
                    placeholder="r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full bg-[#0a0f18] border border-[#27374e] rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('replicate')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showKeys.replicate ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="replicate-model-select"
                  className="block text-xs font-bold uppercase text-slate-300 mb-1"
                >
                  Replicate Model
                </label>
                <select
                  id="replicate-model-select"
                  value={localConfig.replicateModel}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      replicateModel: e.target.value,
                    }))
                  }
                  className="w-full bg-[#0a0f18] border border-[#27374e] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="lucataco/animate-diff">
                    lucataco/animate-diff (Motion LoRA Video)
                  </option>
                  <option value="black-forest-labs/flux-dev">
                    black-forest-labs/flux-dev (High Res Textures)
                  </option>
                  <option value="cjwbw/cogvideox-5b">
                    cjwbw/cogvideox-5b (5B Parameter Text-to-Video)
                  </option>
                </select>
              </div>
            </div>
          )}

          {localConfig.activeProvider === 'runway' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Runway Gen-3 Video API Setup
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Photorealistic generative video from aligned house
                    reference photos.
                  </p>
                </div>
                <a
                  href="https://dev.runwayml.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 font-bold underline"
                >
                  <span>Get RUNWAYML_API_SECRET</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div>
                <label
                  htmlFor="runway-secret-input"
                  className="block text-xs font-bold uppercase text-slate-300 mb-1"
                >
                  RUNWAYML_API_SECRET
                </label>
                <div className="relative">
                  <input
                    id="runway-secret-input"
                    type={showKeys.runway ? 'text' : 'password'}
                    value={localConfig.runwayApiSecret}
                    onChange={(e) =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        runwayApiSecret: e.target.value,
                      }))
                    }
                    placeholder="runway_sec_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full bg-[#0a0f18] border border-[#27374e] rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('runway')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showKeys.runway ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="runway-model-select"
                  className="block text-xs font-bold uppercase text-slate-300 mb-1"
                >
                  Runway Model Engine
                </label>
                <select
                  id="runway-model-select"
                  value={localConfig.runwayModel}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      runwayModel: e.target.value,
                    }))
                  }
                  className="w-full bg-[#0a0f18] border border-[#27374e] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="gen3a_turbo">
                    Gen-3 Alpha Turbo (Fast 10s Motion)
                  </option>
                  <option value="gen3a">
                    Gen-3 Alpha (Maximum Architectural Detail)
                  </option>
                </select>
              </div>
            </div>
          )}

          {localConfig.activeProvider === 'comfyui' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span>Local ComfyUI Private Server</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                      100% Free &amp; Private
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Connects directly to your local NVIDIA GPU (RTX
                    3080/4080/4090) with zero API keys or subscriptions.
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="comfyui-endpoint-input"
                  className="block text-xs font-bold uppercase text-slate-300 mb-1"
                >
                  ComfyUI Server Endpoint (IP:Port)
                </label>
                <input
                  id="comfyui-endpoint-input"
                  type="text"
                  value={localConfig.comfyuiEndpoint}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      comfyuiEndpoint: e.target.value,
                    }))
                  }
                  placeholder="http://127.0.0.1:8188"
                  className="w-full bg-[#0a0f18] border border-[#27374e] rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label
                  htmlFor="comfyui-workflow-select"
                  className="block text-xs font-bold uppercase text-slate-300 mb-1"
                >
                  Architectural Mapping Workflow Preset
                </label>
                <select
                  id="comfyui-workflow-select"
                  value={localConfig.comfyuiWorkflow}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      comfyuiWorkflow: e.target.value,
                    }))
                  }
                  className="w-full bg-[#0a0f18] border border-[#27374e] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="controlnet_wan">
                    ControlNet LineArt + Wan 2.1 (Locks Video to Gables &amp;
                    Walls)
                  </option>
                  <option value="animatediff_lineart">
                    AnimateDiff + SD1.5 Architectural Wireframe LoRA
                  </option>
                  <option value="flux_inpaint">
                    Flux.1 Inpainting + Regional Architectural Mask
                  </option>
                </select>
              </div>
            </div>
          )}

          {localConfig.activeProvider === 'simulation' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Built-in Studio Simulation Engine
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Offline mode using the bundled Austin Ranch House 4K video and
                  photo dataset. No API keys or external servers required.
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-[#0b1019] border border-[#1e2a3c] space-y-1.5 text-xs font-mono text-slate-300">
                <div>• Ghostbusters V1 &amp; V2 Master Show</div>
                <div>• Slimer Garage Ectoplasm Breach V4</div>
                <div>• Musical Singing Pumpkins Patch</div>
                <div>• Precision Wireframe Calibration Grid</div>
              </div>
            </div>
          )}

          {/* GLOBAL ARCHITECTURAL PROJECTION SAFEGUARDS */}
          <div className="pt-4 border-t border-[#1f2c42] space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Architectural Mapping Safeguards
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center justify-between p-3 rounded-lg bg-[#0d131f] border border-[#1f2c42] cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-white">
                    Strict Camera Lock
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Enforces zero pan, tilt, or zoom drift
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={localConfig.hardCameraLock}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      hardCameraLock: e.target.checked,
                    }))
                  }
                  className="rounded border-[#293c54] text-cyan-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg bg-[#0d131f] border border-[#1f2c42] cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-white">
                    Auto-Inject Wireframe
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Feeds Screen 2 SVG mask to ControlNet
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={localConfig.enableControlNetConditioning}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      enableControlNetConditioning: e.target.checked,
                    }))
                  }
                  className="rounded border-[#293c54] text-cyan-500"
                />
              </label>
            </div>
          </div>

          {/* CONNECTION TEST RESULT NOTIFICATION */}
          {testResult && (
            <div
              className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between ${
                testResult.success
                  ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                  : 'bg-red-950/60 border-red-500/60 text-red-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="h-16 px-6 bg-[#162032] border-t border-[#233148] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => handleTestConnection(localConfig.activeProvider)}
            disabled={isTesting}
            className="px-4 py-2 rounded-lg bg-[#182336] hover:bg-[#202f48] border border-[#2d3d58] text-xs font-bold uppercase tracking-wider text-slate-200 inline-flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-cyan-400 ${
                isTesting ? 'animate-spin' : ''
              }`}
            />
            <span>
              {isTesting ? 'Testing Connection...' : 'Test Provider Connection'}
            </span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAiSettingsModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold uppercase tracking-wider text-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveAndClose}
              className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-extrabold uppercase tracking-wider text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all cursor-pointer"
            >
              Save &amp; Apply Provider
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
