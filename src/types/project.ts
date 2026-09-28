export type TrackType = 'video' | 'audio' | 'text' | 'image' | 'shape' | 'caption';

export type AnimationType = 
  | 'none' 
  | 'fade-in' 
  | 'pop-in' 
  | 'slide-up' 
  | 'slide-left' 
  | 'slide-right'
  | 'pulse' 
  | 'zoom-in'
  | 'zoom-out'
  | 'neon-glow'
  | 'bounce'
  | 'typewriter'
  | 'karaoke';

export type TransitionType =
  | 'none'
  | 'fade'
  | 'flash-white'
  | 'dip-black'
  | 'wipe-left'
  | 'wipe-right'
  | 'wipe-up'
  | 'wipe-down'
  | 'slide' // legacy: slide from the right
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'whip-left'
  | 'whip-right'
  | 'zoom-in'
  | 'zoom-out'
  | 'zoom-blur'
  | 'blur'
  | 'iris'
  | 'glitch'
  | 'flip';

export type ColorFilterPreset =
  | 'none'
  | 'cinematic-teal'
  | 'vintage-warm'
  | 'cyberpunk'
  | 'black-white'
  | 'vibrant-hdr'
  | 'golden-hour'
  | 'kodak-film'
  | 'nordic-cold'
  | 'matrix-green'
  | 'horror-desat'
  | 'bleach-bypass'
  | 'warm-documentary';

// Continuous camera move applied to a clip for its whole duration
export type MotionType =
  | 'none'
  | 'ken-burns-in'
  | 'ken-burns-out'
  | 'pan-left'
  | 'pan-right'
  | 'pan-up'
  | 'pan-down'
  | 'zoom-punch'
  | 'shake'
  | 'float'
  | 'rotate-drift';

// Overlay effects, each 0–100 (0 = off)
export interface OverlayEffects {
  vignette?: number;
  filmGrain?: number;
  lightLeak?: number;
  vhs?: number;
  glitch?: number;
  oldFilm?: number;
  flicker?: number;
  letterbox?: number;
}

// What a clip is used for in an auto-built project
export type ClipRole = 'scene' | 'voiceover' | 'music' | 'sfx' | 'caption' | 'title' | 'overlay';

export interface KeyframePoint {
  frame: number;
  value: number;
}

export interface TimelineClip {
  id: string;
  name: string;
  type: TrackType;
  startFrame: number;
  durationInFrames: number;
  trackIndex: number;
  
  // Media content properties
  src?: string;
  filePath?: string; // absolute path on disk (desktop app); src is rebuilt from it on load
  mediaStartFrame?: number; // frames trimmed from the start of the source media
  content?: string; // Text or caption content
  
  // Visual transformations & positioning on canvas
  x?: number; // px offset from center
  y?: number;
  width?: number; // dimensions when resizing on canvas
  height?: number;
  scale?: number;
  rotation?: number;
  opacity?: number;
  objectFit?: 'cover' | 'contain' | 'fill';
  
  // Text styling & typography
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  borderRadius?: number;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  letterSpacing?: number;
  lineHeight?: number;
  textShadow?: string;
  textStroke?: string;
  textStrokeWidth?: number;

  // Effects, Transitions & Animations
  animation?: AnimationType;
  inTransition?: TransitionType;
  inTransitionDuration?: number; // in frames (default 15)
  outTransition?: TransitionType;
  outTransitionDuration?: number; // in frames (default 15)

  // Camera motion, overlay effects and templates
  motion?: MotionType;
  motionIntensity?: number; // 0–100, default 50
  effects?: OverlayEffects;
  captionTemplate?: string; // id from templates/captions.ts
  textTemplate?: string; // id from templates/titles.ts
  role?: ClipRole;
  fitToFrame?: boolean; // image/video always fills the whole composition
  loop?: boolean; // audio/video repeats (e.g. background music)
  emphasisWords?: string[]; // caption words to highlight (picked by the AI)

  // Color grading and visual filters
  colorFilter?: ColorFilterPreset;
  filterBlur?: number;
  filterBrightness?: number;
  filterContrast?: number;
  filterSaturation?: number;
  filterHue?: number;
  filterSepia?: number;
  
  // Audio properties
  volume?: number;
  fadeInFrames?: number;
  fadeOutFrames?: number;

  // Caption words timing for word-by-word highlights
  words?: Array<{
    word: string;
    startFrame: number;
    endFrame: number;
  }>;
}

export interface CompositionSettings {
  id: string;
  title: string;
  fps: number;
  durationInFrames: number;
  width: number;
  height: number;
  backgroundColor: string;
}

export interface ProjectState {
  version: string;
  settings: CompositionSettings;
  clips: TimelineClip[];
}

export interface RenderProgressData {
  renderedFrames: number;
  encodedFrames: number;
  totalFrames: number;
  progress: number; // 0 to 1
  renderedDoneIn: number | null;
  stitchStage: 'encoding' | 'rendering' | 'muxing';
  fps: number;
}

export type RenderCodec = 'h264' | 'h265' | 'vp9' | 'prores';

export interface RenderRequestPayload {
  outputPath: string;
  settings: CompositionSettings;
  clips: TimelineClip[];
  hiddenTracks?: Record<number, boolean>;
  codec?: RenderCodec;
  crf?: number;
}

export interface AssetTemplate {
  name: string;
  category: 'preset' | 'title' | 'lower-third' | 'sticker' | 'audio';
  clip: Partial<TimelineClip>;
}

