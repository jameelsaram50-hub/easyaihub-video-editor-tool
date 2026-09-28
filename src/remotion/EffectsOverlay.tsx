import React from 'react';
import { random } from 'remotion';
import { OverlayEffects } from '../types/project';

const amount = (v?: number) => Math.max(0, Math.min(100, v ?? 0)) / 100;

/**
 * Changes applied to the clip content itself (CSS filter additions and a small
 * horizontal jitter) for flicker / old film / VHS / glitch.
 */
export function getEffectContentStyle(effects: OverlayEffects | undefined, frame: number) {
  const filters: string[] = [];
  let jitterX = 0;
  if (!effects) return { filters, jitterX };

  const flicker = amount(effects.flicker);
  if (flicker > 0) {
    const r = random(`flicker-${frame}`);
    filters.push(`brightness(${(1 + (r - 0.5) * 0.35 * flicker).toFixed(3)})`);
  }

  const oldFilm = amount(effects.oldFilm);
  if (oldFilm > 0) {
    filters.push(`sepia(${Math.round(oldFilm * 55)}%)`);
    jitterX += (random(`oldfilm-j-${frame}`) - 0.5) * 3 * oldFilm;
  }

  const vhs = amount(effects.vhs);
  if (vhs > 0) {
    filters.push(`saturate(${Math.round(100 + vhs * 25)}%) contrast(${Math.round(100 + vhs * 10)}%)`);
    jitterX += Math.sin(frame * 0.9) * 1.5 * vhs;
  }

  const glitch = amount(effects.glitch);
  if (glitch > 0 && random(`glitch-on-${frame}`) < glitch * 0.25) {
    filters.push(`hue-rotate(${Math.round(random(`glitch-h-${frame}`) * 360)}deg)`);
    jitterX += (random(`glitch-x-${frame}`) - 0.5) * 60 * glitch;
  }

  return { filters, jitterX };
}

interface EffectsOverlayProps {
  effects?: OverlayEffects;
  frame: number;
  width: number;
  height: number;
}

/** Layers drawn on top of a clip: vignette, grain, light leaks, scanlines, scratches, bars. */
export const EffectsOverlay: React.FC<EffectsOverlayProps> = ({ effects, frame, width, height }) => {
  if (!effects) return null;
  const layers: React.ReactNode[] = [];
  const fill: React.CSSProperties = { position: 'absolute', inset: 0, pointerEvents: 'none' };

  const lightLeak = amount(effects.lightLeak);
  if (lightLeak > 0) {
    const t = frame / 30;
    const x1 = 20 + Math.sin(t * 0.4) * 25;
    const y1 = 25 + Math.cos(t * 0.3) * 20;
    const x2 = 80 + Math.cos(t * 0.35) * 20;
    layers.push(
      <div
        key="leak"
        style={{
          ...fill,
          mixBlendMode: 'screen',
          opacity: 0.75 * lightLeak,
          background: `radial-gradient(circle at ${x1}% ${y1}%, rgba(255,140,40,0.85), transparent 45%), radial-gradient(circle at ${x2}% 80%, rgba(255,60,120,0.6), transparent 40%)`,
        }}
      />
    );
  }

  const grain = amount(effects.filmGrain);
  if (grain > 0) {
    // New noise pattern every frame; seed cycles to keep it deterministic
    layers.push(
      <svg key="grain" style={{ ...fill, opacity: 0.45 * grain, mixBlendMode: 'overlay' }} width="100%" height="100%">
        <filter id={`grain-${frame % 60}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 60} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${frame % 60})`} />
      </svg>
    );
  }

  const vhs = amount(effects.vhs);
  if (vhs > 0) {
    const bandY = ((frame * 7) % (height + 200)) - 100;
    layers.push(
      <div
        key="scanlines"
        style={{
          ...fill,
          opacity: 0.55 * vhs,
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.35) 0px, rgba(0,0,0,0.35) 1px, transparent 1px, transparent 4px)',
        }}
      />,
      <div
        key="band"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: bandY,
          height: Math.max(20, height * 0.05),
          background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.12), transparent)',
          opacity: vhs,
          pointerEvents: 'none',
        }}
      />,
      <div
        key="vhs-tint"
        style={{ ...fill, mixBlendMode: 'screen', opacity: 0.12 * vhs, background: 'linear-gradient(90deg, rgba(255,0,80,0.6), transparent 30%, transparent 70%, rgba(0,200,255,0.6))' }}
      />
    );
  }

  const glitch = amount(effects.glitch);
  if (glitch > 0 && random(`glitch-bars-${frame}`) < glitch * 0.3) {
    const bars = Array.from({ length: 3 }).map((_, i) => {
      const top = random(`gb-top-${frame}-${i}`) * 100;
      const h = 1 + random(`gb-h-${frame}-${i}`) * 5;
      const color = i % 2 === 0 ? 'rgba(255,0,200,0.55)' : 'rgba(0,255,230,0.5)';
      return (
        <div
          key={`gbar-${i}`}
          style={{ position: 'absolute', left: 0, right: 0, top: `${top}%`, height: `${h}%`, background: color, mixBlendMode: 'screen', pointerEvents: 'none' }}
        />
      );
    });
    layers.push(...bars);
  }

  const oldFilm = amount(effects.oldFilm);
  if (oldFilm > 0) {
    const scratches = Array.from({ length: 3 }).map((_, i) => {
      if (random(`scr-on-${frame}-${i}`) > 0.55) return null;
      const left = random(`scr-x-${Math.floor(frame / 2)}-${i}`) * 100;
      return (
        <div
          key={`scr-${i}`}
          style={{ position: 'absolute', top: 0, bottom: 0, left: `${left}%`, width: 1.5, background: 'rgba(255,255,240,0.55)', opacity: oldFilm, pointerEvents: 'none' }}
        />
      );
    });
    const dust = Array.from({ length: 6 }).map((_, i) => {
      if (random(`dust-on-${frame}-${i}`) > 0.4) return null;
      const size = 2 + random(`dust-s-${frame}-${i}`) * 6;
      return (
        <div
          key={`dust-${i}`}
          style={{
            position: 'absolute',
            left: `${random(`dust-x-${frame}-${i}`) * 100}%`,
            top: `${random(`dust-y-${frame}-${i}`) * 100}%`,
            width: size,
            height: size,
            borderRadius: '50%',
            background: 'rgba(20,15,10,0.8)',
            opacity: oldFilm,
            pointerEvents: 'none',
          }}
        />
      );
    });
    layers.push(...scratches, ...dust);
  }

  const vignette = amount(effects.vignette);
  if (vignette > 0) {
    layers.push(
      <div
        key="vignette"
        style={{ ...fill, background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${(0.92 * vignette).toFixed(2)}) 100%)` }}
      />
    );
  }

  const letterbox = amount(effects.letterbox);
  if (letterbox > 0) {
    // Bars sized towards a 2.39:1 frame at 100%
    const target = width / 2.39;
    const barHeight = Math.max(0, ((height - target) / 2) * letterbox);
    layers.push(
      <div key="lb-top" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: barHeight, background: '#000', pointerEvents: 'none' }} />,
      <div key="lb-bottom" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: barHeight, background: '#000', pointerEvents: 'none' }} />
    );
  }

  return <>{layers}</>;
};
