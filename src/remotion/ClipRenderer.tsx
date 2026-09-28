import React from 'react';
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Img,
  Audio,
  Video,
  OffthreadVideo,
  useRemotionEnvironment,
} from 'remotion';
import { TimelineClip, AnimationType, TransitionType } from '../types/project';
import { computeTransition, getTransition, IDLE_TRANSITION, TransitionFrame } from '../templates/transitions';
import { computeMotion } from '../templates/motion';
import { getColorGradeFilter } from '../templates/effects';
import { EffectsOverlay, getEffectContentStyle } from './EffectsOverlay';
import { CaptionRenderer, getCaptionDefaultY } from './CaptionRenderer';
import { resolveSrc } from './assets';

interface ClipRendererProps {
  clip: TimelineClip;
}

const combineTransitions = (a: TransitionFrame, b: TransitionFrame): TransitionFrame => ({
  opacity: a.opacity * b.opacity,
  translateX: a.translateX + b.translateX,
  translateY: a.translateY + b.translateY,
  scale: a.scale * b.scale,
  blur: a.blur + b.blur,
  rotateY: a.rotateY + b.rotateY,
  hueRotate: a.hueRotate + b.hueRotate,
  clipPath: a.clipPath ?? b.clipPath,
  flash: Math.max(a.flash, b.flash),
  dark: Math.max(a.dark, b.dark),
});

const transitionFrames = (type: TransitionType, explicit: number | undefined, fps: number) =>
  Math.max(1, Math.round(explicit ?? getTransition(type).defaultSeconds * fps) || Math.round(0.5 * fps));

// Rendered inside a <Sequence from={clip.startFrame}>, so useCurrentFrame()
// is already relative to the start of the clip.
export const ClipRenderer: React.FC<ClipRendererProps> = ({ clip }) => {
  const relFrame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const { isRendering } = useRemotionEnvironment();

  if (relFrame < 0 || relFrame >= clip.durationInFrames) {
    return null;
  }

  const remFrames = clip.durationInFrames - relFrame;
  const mediaStartFrame = Math.max(0, Math.round(clip.mediaStartFrame ?? 0));
  const src = resolveSrc(clip.src, isRendering);
  const isVisualMedia = clip.type === 'image' || clip.type === 'video';

  // Base transformations
  let animScale = clip.scale ?? 1;
  let animOpacity = (clip.opacity ?? 100) / 100;
  let animTranslateX = clip.x ?? 0;
  let animTranslateY =
    clip.y ?? (clip.type === 'caption' ? getCaptionDefaultY(clip.captionTemplate, height, width) : 0);
  const animRotation = clip.rotation ?? 0;

  // 1. Transitions (in + out), each capped at half the clip so they never overlap
  const halfDuration = Math.max(1, Math.floor(clip.durationInFrames / 2));
  const inType: TransitionType = clip.inTransition || 'none';
  const outType: TransitionType = clip.outTransition || 'none';
  const inDuration = Math.min(transitionFrames(inType, clip.inTransitionDuration, fps), halfDuration);
  const outDuration = Math.min(transitionFrames(outType, clip.outTransitionDuration, fps), halfDuration);

  const tIn =
    inType !== 'none' && relFrame < inDuration
      ? computeTransition(inType, relFrame / inDuration, 'in', width, height, relFrame)
      : IDLE_TRANSITION;
  const tOut =
    outType !== 'none' && remFrames <= outDuration
      ? computeTransition(outType, (remFrames - 1) / Math.max(1, outDuration - 1), 'out', width, height, relFrame)
      : IDLE_TRANSITION;
  const t = combineTransitions(tIn, tOut);

  animOpacity *= t.opacity;
  animTranslateX += t.translateX;
  animTranslateY += t.translateY;
  animScale *= t.scale;

  // 2. Entrance / loop animations (mostly for text and graphics)
  const anim: AnimationType = clip.animation || 'none';

  if (anim === 'fade-in') {
    animOpacity *= interpolate(relFrame, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  } else if (anim === 'pop-in') {
    animScale *= spring({ frame: relFrame, fps, config: { damping: 12, mass: 0.5, stiffness: 100 } });
  } else if (anim === 'slide-up') {
    animTranslateY += interpolate(relFrame, [0, 20], [80, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    animOpacity *= interpolate(relFrame, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  } else if (anim === 'slide-left') {
    animTranslateX += interpolate(relFrame, [0, 20], [120, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    animOpacity *= interpolate(relFrame, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  } else if (anim === 'slide-right') {
    animTranslateX += interpolate(relFrame, [0, 20], [-120, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    animOpacity *= interpolate(relFrame, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  } else if (anim === 'bounce') {
    animScale *= spring({ frame: relFrame, fps, config: { damping: 6, mass: 0.7, stiffness: 120 } });
  } else if (anim === 'pulse') {
    animScale *= interpolate(Math.sin((relFrame / fps) * Math.PI * 3), [-1, 1], [0.95, 1.05]);
  } else if (anim === 'zoom-in') {
    animScale *= interpolate(relFrame, [0, Math.max(1, clip.durationInFrames - 1)], [1, 1.15], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  } else if (anim === 'zoom-out') {
    animScale *= interpolate(relFrame, [0, Math.max(1, clip.durationInFrames - 1)], [1.15, 1.0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  }

  // 3. Color grading, manual filters and effect-driven filters
  const filterList: string[] = [];
  if (clip.filterBlur !== undefined && clip.filterBlur > 0) filterList.push(`blur(${clip.filterBlur}px)`);
  if (clip.filterBrightness !== undefined && clip.filterBrightness !== 100) filterList.push(`brightness(${clip.filterBrightness}%)`);
  if (clip.filterContrast !== undefined && clip.filterContrast !== 100) filterList.push(`contrast(${clip.filterContrast}%)`);
  if (clip.filterSaturation !== undefined && clip.filterSaturation !== 100) filterList.push(`saturate(${clip.filterSaturation}%)`);
  if (clip.filterHue !== undefined && clip.filterHue !== 0) filterList.push(`hue-rotate(${clip.filterHue}deg)`);
  if (clip.filterSepia !== undefined && clip.filterSepia > 0) filterList.push(`sepia(${clip.filterSepia}%)`);
  const grade = getColorGradeFilter(clip.colorFilter);
  if (grade) filterList.push(grade);

  const effectContent = isVisualMedia ? getEffectContentStyle(clip.effects, relFrame) : { filters: [], jitterX: 0 };
  filterList.push(...effectContent.filters);
  animTranslateX += effectContent.jitterX;

  if (t.blur > 0.1) filterList.push(`blur(${t.blur.toFixed(1)}px)`);
  if (t.hueRotate) filterList.push(`hue-rotate(${t.hueRotate}deg)`);
  const filterStyle = filterList.length > 0 ? filterList.join(' ') : undefined;

  // 4. Audio volume envelope (Fade In / Out)
  let computedVolume = (clip.volume ?? 100) / 100;
  if (clip.fadeInFrames && relFrame < clip.fadeInFrames) {
    computedVolume *= interpolate(relFrame, [0, clip.fadeInFrames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  }
  if (clip.fadeOutFrames && remFrames <= clip.fadeOutFrames) {
    computedVolume *= interpolate(remFrames, [0, clip.fadeOutFrames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  }

  const boxWidth = isVisualMedia && clip.fitToFrame ? width : clip.width;
  const boxHeight = isVisualMedia && clip.fitToFrame ? height : clip.height;

  const wrapperStyle: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: `translate(calc(-50% + ${animTranslateX}px), calc(-50% + ${animTranslateY}px)) scale(${animScale}) rotate(${animRotation}deg)${t.rotateY ? ` perspective(1200px) rotateY(${t.rotateY}deg)` : ''}`,
    opacity: animOpacity,
    filter: filterStyle,
    clipPath: t.clipPath,
    transformOrigin: 'center center',
    userSelect: 'none',
    pointerEvents: 'none',
    zIndex: clip.trackIndex + 10,
    width: boxWidth ? `${boxWidth}px` : undefined,
    height: boxHeight ? `${boxHeight}px` : undefined,
  };

  // White flash / black dip used by some transitions
  const transitionOverlays = (
    <>
      {t.flash > 0.001 && (
        <div style={{ position: 'absolute', inset: 0, background: '#ffffff', opacity: t.flash, pointerEvents: 'none' }} />
      )}
      {t.dark > 0.001 && (
        <div style={{ position: 'absolute', inset: 0, background: '#000000', opacity: t.dark, pointerEvents: 'none' }} />
      )}
    </>
  );

  const textStrokeStyle = clip.textStroke && clip.textStrokeWidth ? `${clip.textStrokeWidth}px ${clip.textStroke}` : undefined;

  // Image / video: media box with camera motion inside and effects on top
  const renderMediaBox = (media: React.ReactNode) => {
    const motion = computeMotion(clip.motion, relFrame, clip.durationInFrames, fps, width, height, clip.motionIntensity ?? 50);
    return (
      <div style={wrapperStyle}>
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            borderRadius: clip.borderRadius ? `${clip.borderRadius}px` : 0,
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              transform: `translate(${motion.translateX}px, ${motion.translateY}px) scale(${motion.scale}) rotate(${motion.rotate}deg)`,
              transformOrigin: 'center center',
            }}
          >
            {media}
          </div>
          <EffectsOverlay effects={clip.effects} frame={relFrame} width={boxWidth ?? width} height={boxHeight ?? height} />
          {transitionOverlays}
        </div>
      </div>
    );
  };

  const mediaStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: clip.objectFit || 'cover',
    display: 'block',
    pointerEvents: 'none',
  };

  switch (clip.type) {
    case 'text': {
      let displayText = clip.content || '';
      if (anim === 'typewriter') {
        const charCount = Math.floor(
          interpolate(relFrame, [0, Math.min(60, clip.durationInFrames)], [0, displayText.length], {
            extrapolateRight: 'clamp',
          })
        );
        displayText = displayText.slice(0, charCount);
      }

      return (
        <div style={wrapperStyle}>
          <div
            style={{
              fontSize: clip.fontSize ? `${clip.fontSize}px` : '48px',
              fontFamily: clip.fontFamily || "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
              color: clip.color || '#ffffff',
              backgroundColor: clip.backgroundColor || 'transparent',
              padding: clip.backgroundColor ? '12px 24px' : '0px',
              borderRadius: clip.borderRadius ? `${clip.borderRadius}px` : '0px',
              fontWeight: clip.fontWeight || '700',
              textAlign: clip.textAlign || 'center',
              letterSpacing: clip.letterSpacing ? `${clip.letterSpacing}px` : 'normal',
              lineHeight: clip.lineHeight || 1.2,
              WebkitTextStroke: textStrokeStyle,
              paintOrder: 'stroke fill',
              textShadow:
                anim === 'neon-glow'
                  ? '0 0 10px #38bdf8, 0 0 20px #38bdf8, 0 0 40px #818cf8'
                  : clip.textShadow || '0 4px 16px rgba(0,0,0,0.6)',
              whiteSpace: 'pre-wrap',
              maxWidth: `${Math.round(width * 0.85)}px`,
              display: 'inline-block',
            }}
          >
            {displayText}
          </div>
        </div>
      );
    }

    case 'caption':
      return (
        <div style={{ ...wrapperStyle, width: undefined, height: undefined }}>
          <CaptionRenderer clip={clip} frame={relFrame} fps={fps} width={width} height={height} />
        </div>
      );

    case 'shape':
      return (
        <div style={wrapperStyle}>
          <div
            style={{
              width: clip.width ? `${clip.width}px` : `${clip.fontSize ? clip.fontSize * 5 : 220}px`,
              height: clip.height ? `${clip.height}px` : `${clip.fontSize ? clip.fontSize * 2.2 : 90}px`,
              backgroundColor: clip.backgroundColor || '#6366f1',
              borderRadius: clip.borderRadius ? `${clip.borderRadius}px` : '16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
              border: `2px solid ${clip.color || 'rgba(255,255,255,0.2)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: clip.color || '#ffffff',
              fontWeight: 700,
              fontSize: clip.fontSize ? `${clip.fontSize}px` : '20px',
              padding: '0 16px',
              textAlign: 'center',
            }}
          >
            {clip.content}
          </div>
        </div>
      );

    case 'image':
      if (!src) return null;
      // Remotion's <Img> delays the render until the image has loaded
      return renderMediaBox(<Img src={src} alt={clip.name || 'image'} style={mediaStyle} />);

    case 'video':
      if (!src) return null;
      // OffthreadVideo extracts exact frames with FFmpeg during export;
      // the regular <Video> tag is used for smooth playback in the preview.
      return renderMediaBox(
        isRendering ? (
          <OffthreadVideo
            src={src}
            volume={computedVolume}
            trimBefore={mediaStartFrame || undefined}
            style={mediaStyle}
          />
        ) : (
          <Video
            src={src}
            volume={computedVolume}
            trimBefore={mediaStartFrame || undefined}
            loop={clip.loop}
            style={mediaStyle}
          />
        )
      );

    case 'audio':
      if (!src) return null;
      return (
        <Audio src={src} volume={computedVolume} trimBefore={mediaStartFrame || undefined} loop={clip.loop} />
      );

    default:
      return null;
  }
};
