import React from 'react';
import { interpolate, spring } from 'remotion';
import { TimelineClip } from '../types/project';
import { getCaptionTemplate } from '../templates/captions';

interface CaptionRendererProps {
  clip: TimelineClip;
  frame: number; // relative to the clip start
  fps: number;
  width: number;
  height: number;
}

interface TimedWord {
  word: string;
  startFrame: number;
  endFrame: number;
}

const normalize = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '');

/** Word timings: real ones from the clip, otherwise spread evenly (weighted by word length). */
export function getTimedWords(clip: TimelineClip): TimedWord[] {
  if (clip.words && clip.words.length > 0) return clip.words;
  const words = (clip.content || '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const weights = words.map((w) => Math.max(2, w.length));
  const total = weights.reduce((a, b) => a + b, 0);
  let cursor = 0;
  return words.map((word, i) => {
    const len = (weights[i] / total) * clip.durationInFrames;
    const startFrame = Math.round(cursor);
    cursor += len;
    return { word, startFrame, endFrame: Math.max(startFrame + 1, Math.round(cursor)) };
  });
}

export const CaptionRenderer: React.FC<CaptionRendererProps> = ({ clip, frame, fps, width, height }) => {
  const tpl = getCaptionTemplate(clip.captionTemplate);
  const words = getTimedWords(clip);
  if (words.length === 0) return null;

  // Currently spoken word: the last word that has started
  let activeIndex = -1;
  for (let i = 0; i < words.length; i++) {
    if (frame >= words[i].startFrame) activeIndex = i;
  }
  const isSpeaking = activeIndex >= 0 && frame < words[activeIndex].endFrame;

  const perPage = Math.max(1, tpl.wordsPerPage);
  const pageIndex = Math.floor(Math.max(0, activeIndex) / perPage);
  const pageWords = words.slice(pageIndex * perPage, pageIndex * perPage + perPage);
  const pageStart = pageWords[0].startFrame;

  const scale = Math.min(width, height) / 1080;
  const fontSize = clip.fontSize ?? Math.round(tpl.fontSize * scale);
  const textColor = clip.color ?? tpl.textColor;
  const emphasis = new Set((clip.emphasisWords || []).map(normalize));

  const strokeWidth = (tpl.strokeWidth ?? 0) * scale;
  const baseTextStyle: React.CSSProperties = {
    fontFamily: clip.fontFamily ?? tpl.fontFamily,
    fontWeight: (clip.fontWeight ?? tpl.fontWeight) as React.CSSProperties['fontWeight'],
    fontSize,
    fontStyle: tpl.italic ? 'italic' : 'normal',
    letterSpacing: tpl.letterSpacing ? `${tpl.letterSpacing * scale}px` : undefined,
    textTransform: tpl.uppercase ? 'uppercase' : 'none',
    WebkitTextStroke: strokeWidth > 0 ? `${strokeWidth}px ${tpl.strokeColor}` : undefined,
    paintOrder: 'stroke fill',
    textShadow: tpl.glow ? `${tpl.glow}, ${tpl.shadow ?? ''}`.replace(/, $/, '') : tpl.shadow,
    display: 'inline-block',
    lineHeight: 1.15,
    whiteSpace: 'pre',
  };

  const renderWord = (w: TimedWord, indexInAll: number) => {
    const isActive = indexInAll === activeIndex && (isSpeaking || tpl.mode !== 'single');
    const isEmphasis = emphasis.has(normalize(w.word));
    const hasStarted = frame >= w.startFrame;
    const sinceStart = frame - w.startFrame;
    let color = isEmphasis && tpl.emphasisColor ? tpl.emphasisColor : textColor;
    let transform = isEmphasis ? 'scale(1.06)' : undefined;
    let opacity = 1;
    let background: string | undefined;
    let underline: React.ReactNode = null;

    switch (tpl.mode) {
      case 'karaoke':
        if (isActive) color = tpl.activeColor;
        break;
      case 'pop':
        if (isActive) {
          const s = spring({ frame: sinceStart, fps, config: { damping: 10, stiffness: 220, mass: 0.5 } });
          color = isEmphasis && tpl.emphasisColor ? tpl.emphasisColor : tpl.activeColor;
          transform = `scale(${interpolate(s, [0, 1], [1.35, 1.12])})`;
        }
        break;
      case 'box':
        if (isActive) {
          color = tpl.activeColor;
          background = isEmphasis && tpl.emphasisColor ? tpl.emphasisColor : tpl.activeBg;
          transform = 'scale(1.05)';
        }
        break;
      case 'typewriter':
        opacity = hasStarted ? 1 : 0;
        break;
      case 'bounce': {
        if (!hasStarted) {
          opacity = 0;
        } else {
          const s = spring({ frame: sinceStart, fps, config: { damping: 8, stiffness: 180, mass: 0.6 } });
          transform = `translateY(${interpolate(s, [0, 1], [40 * scale, 0])}px) scale(${interpolate(s, [0, 1], [0.6, 1])})`;
          if (isActive) color = tpl.activeColor;
        }
        break;
      }
      case 'underline':
        if (isActive) {
          const grow = interpolate(sinceStart, [0, 5], [0, 100], { extrapolateRight: 'clamp' });
          underline = (
            <span
              style={{
                position: 'absolute',
                left: 0,
                bottom: -6 * scale,
                height: 8 * scale,
                width: `${grow}%`,
                borderRadius: 4 * scale,
                background: tpl.activeBg,
              }}
            />
          );
        }
        break;
      case 'line':
      case 'single':
      default:
        break;
    }

    return (
      <span
        key={indexInAll}
        style={{
          ...baseTextStyle,
          position: 'relative',
          color,
          transform,
          transformOrigin: 'center bottom',
          // Popped/boxed words grow; keep neighbours from being covered
          margin: transform && transform.includes('scale') ? `0 ${0.08 * fontSize}px` : undefined,
          opacity,
          background,
          padding: background ? `${2 * scale}px ${12 * scale}px` : undefined,
          borderRadius: background ? 10 * scale : undefined,
        }}
      >
        {w.word}
        {underline}
      </span>
    );
  };

  let content: React.ReactNode;
  if (tpl.mode === 'single') {
    if (activeIndex < 0) return null;
    const w = words[activeIndex];
    const s = spring({ frame: frame - w.startFrame, fps, config: { damping: 11, stiffness: 240, mass: 0.5 } });
    content = (
      <span style={{ display: 'inline-block', transform: `scale(${interpolate(s, [0, 1], [0.7, 1])})` }}>
        {renderWord(w, activeIndex)}
      </span>
    );
  } else {
    content = pageWords.map((w, i) => renderWord(w, pageIndex * perPage + i));
  }

  // Page fades in quickly for the plain subtitle modes
  const pageOpacity =
    tpl.mode === 'line' || tpl.mode === 'karaoke'
      ? interpolate(frame - pageStart, [0, 4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
      : 1;

  const containerBg = clip.backgroundColor ?? tpl.containerBg;
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        // Stroke is drawn half outside each glyph, so widen the gap by the stroke width
        columnGap: `${0.3 * fontSize + strokeWidth}px`,
        rowGap: `${0.1 * fontSize}px`,
        maxWidth: Math.round(width * 0.86),
        padding: containerBg ? `${12 * scale}px ${26 * scale}px` : 0,
        background: containerBg,
        borderRadius: (tpl.containerRadius ?? 0) * scale,
        opacity: pageOpacity,
        textAlign: 'center',
      }}
    >
      {content}
    </div>
  );
};

/** Default vertical offset (from the frame center) for a caption template position. */
export function getCaptionDefaultY(templateId: string | undefined, height: number, width: number): number {
  const tpl = getCaptionTemplate(templateId);
  const vertical = height > width;
  switch (tpl.position) {
    case 'top':
      return -height * 0.34;
    case 'center':
      return 0;
    case 'lower':
      return height * (vertical ? 0.18 : 0.26);
    case 'bottom':
    default:
      return height * (vertical ? 0.28 : 0.36);
  }
}
