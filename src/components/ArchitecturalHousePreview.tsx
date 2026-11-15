import React from 'react';
import { AUSTIN_HOUSE_ASSETS, useProjectionStore } from '../store/useProjectionStore';
import { ProjectorTestPatternRenderer } from './ProjectorTestPatternRenderer';

interface ArchitecturalHousePreviewProps {
  variant:
    | 'victorian'
    | 'laser'
    | 'spooky'
    | 'modern'
    | 'wireframe-monitor'
    | 'test-pattern'
    | 'blackout';
  imageUrl?: string;
  videoUrl?: string;
  playVideoOnHover?: boolean;
  className?: string;
}

export const ArchitecturalHousePreview: React.FC<
  ArchitecturalHousePreviewProps
> = ({
  variant,
  imageUrl,
  videoUrl,
  playVideoOnHover = false,
  className = '',
}) => {
  const { testPatternType, purityColor } = useProjectionStore();

  if (variant === 'blackout') {
    return (
      <div
        className={`relative bg-black flex flex-col items-center justify-center select-none overflow-hidden ${className}`}
      >
        <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping mb-2" />
        <span className="text-[11px] font-mono tracking-widest text-red-500 font-bold uppercase">
          MASTER BLACKOUT ACTIVE (0 IRE)
        </span>
        <span className="text-[10px] font-mono text-slate-500 mt-0.5">
          Press [ESC] or click button to restore output
        </span>
      </div>
    );
  }

  if (variant === 'test-pattern') {
    return (
      <div
        className={`relative bg-[#070b12] overflow-hidden select-none ${className}`}
      >
        <ProjectorTestPatternRenderer
          patternType={testPatternType}
          purityColor={purityColor}
          viewBox="0 0 1920 1080"
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  if (variant === 'wireframe-monitor') {
    return (
      <div
        className={`relative bg-black overflow-hidden select-none ${className}`}
      >
        <img
          src={AUSTIN_HOUSE_ASSETS.wireframeLayout}
          alt="Austin Ranch House Wireframe Layout"
          className="w-full h-full object-contain opacity-90"
          style={{
            filter:
              'sepia(100%) hue-rotate(155deg) saturate(400%) brightness(1.05)',
          }}
        />
        <div className="absolute bottom-1.5 right-2 px-1.5 py-0.5 rounded bg-black/75 border border-cyan-500/40 text-[9px] font-mono text-cyan-300">
          LOCKED WIREFRAME: dd58ee98.jfif
        </div>
      </div>
    );
  }

  // Default fallback image from Austin's assets based on variant
  const resolvedImage =
    imageUrl ||
    (variant === 'victorian'
      ? AUSTIN_HOUSE_ASSETS.photos.v1EctoOpenGarage
      : variant === 'laser'
      ? AUSTIN_HOUSE_ASSETS.photos.v4SlimerBreach
      : variant === 'spooky'
      ? AUSTIN_HOUSE_ASSETS.photos.v2FirehouseTower
      : AUSTIN_HOUSE_ASSETS.photos.v3ClosedLogoGarage);

  return (
    <div
      className={`relative bg-[#070b14] overflow-hidden select-none ${className}`}
    >
      {videoUrl && playVideoOnHover ? (
        <video
          src={videoUrl}
          poster={resolvedImage}
          muted
          loop
          playsInline
          autoPlay
          className="w-full h-full object-cover"
        />
      ) : (
        <img
          src={resolvedImage}
          alt={`${variant} projection mapping preview`}
          className="w-full h-full object-cover"
        />
      )}
      {/* Subtle Neon Wireframe Registration Overlay */}
      <img
        src={AUSTIN_HOUSE_ASSETS.wireframeLayout}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-30 pointer-events-none"
      />
    </div>
  );
};
