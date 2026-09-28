import { ColorFilterPreset, MotionType, OverlayEffects, TransitionType } from '../types/project';

/**
 * Video styles for automation channels. A style is the "editing recipe" the
 * auto-editor follows; the AI can vary choices inside the pools per scene.
 */
export interface VideoStyle {
  id: string;
  name: string;
  description: string;
  emoji: string;
  recommendedAspect: '16:9' | '9:16';
  captionTemplate: string;
  captionsEnabled: boolean;
  transitions: TransitionType[]; // rotated between scenes
  transitionSeconds?: number; // overrides the transition's default length
  motions: MotionType[]; // rotated between scenes
  motionIntensity: number;
  colorFilter: ColorFilterPreset;
  effects: OverlayEffects;
  titleTemplate: string; // intro title card
  overlayTemplate: string; // short on-screen text for key moments
  sfxOnCut: string | null; // played at scene changes
  sfxEveryNthCut: number; // 1 = every cut
  sfxOnTitle: string | null;
  sfxOnOverlay: string | null;
  sfxVolume: number; // 0–100
  musicVolume: number; // 0–100
  introTitle: boolean;
  outroFadeSeconds: number;
}

export const VIDEO_STYLES: VideoStyle[] = [
  {
    id: 'simple',
    name: 'Simple & Clean',
    description: 'Smooth dissolves, gentle zooms, clear captions. Works for any topic.',
    emoji: '✨',
    recommendedAspect: '16:9',
    captionTemplate: 'karaoke-classic',
    captionsEnabled: true,
    transitions: ['fade'],
    motions: ['ken-burns-in', 'ken-burns-out'],
    motionIntensity: 40,
    colorFilter: 'none',
    effects: {},
    titleTemplate: 'big-bold-title',
    overlayTemplate: 'lower-third-clean',
    sfxOnCut: null,
    sfxEveryNthCut: 1,
    sfxOnTitle: 'whoosh',
    sfxOnOverlay: 'pop',
    sfxVolume: 55,
    musicVolume: 12,
    introTitle: true,
    outroFadeSeconds: 1,
  },
  {
    id: 'documentary',
    name: 'Documentary',
    description: 'Slow Ken Burns, long dissolves, film look, serif subtitles. History, true crime, biographies.',
    emoji: '🎞️',
    recommendedAspect: '16:9',
    captionTemplate: 'documentary-clean',
    captionsEnabled: true,
    transitions: ['fade', 'fade', 'dip-black', 'blur'],
    transitionSeconds: 1,
    motions: ['ken-burns-in', 'pan-right', 'ken-burns-out', 'pan-left', 'pan-up'],
    motionIntensity: 45,
    colorFilter: 'warm-documentary',
    effects: { vignette: 35, filmGrain: 20 },
    titleTemplate: 'documentary-title',
    overlayTemplate: 'lower-third-clean',
    sfxOnCut: null,
    sfxEveryNthCut: 1,
    sfxOnTitle: 'cinematic-hit',
    sfxOnOverlay: 'paper-turn',
    sfxVolume: 50,
    musicVolume: 14,
    introTitle: true,
    outroFadeSeconds: 2,
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    description: 'Widescreen bars, teal-orange grade, zoom blurs and trailer hits. Stories, facts, mysteries.',
    emoji: '🎬',
    recommendedAspect: '16:9',
    captionTemplate: 'cinematic-minimal',
    captionsEnabled: true,
    transitions: ['zoom-blur', 'fade', 'dip-black', 'blur'],
    motions: ['ken-burns-in', 'rotate-drift', 'pan-left', 'ken-burns-out'],
    motionIntensity: 55,
    colorFilter: 'cinematic-teal',
    effects: { vignette: 30, filmGrain: 12, letterbox: 60 },
    titleTemplate: 'cinematic-title',
    overlayTemplate: 'chapter-card',
    sfxOnCut: 'whoosh',
    sfxEveryNthCut: 2,
    sfxOnTitle: 'braam',
    sfxOnOverlay: 'cinematic-hit',
    sfxVolume: 55,
    musicVolume: 15,
    introTitle: true,
    outroFadeSeconds: 2,
  },
  {
    id: 'dynamic',
    name: 'Dynamic / High Retention',
    description: 'Fast whips, zoom punches, pop captions and SFX on every cut. List videos, facts, motivation.',
    emoji: '⚡',
    recommendedAspect: '16:9',
    captionTemplate: 'viral-yellow',
    captionsEnabled: true,
    transitions: ['whip-left', 'zoom-in', 'flash-white', 'whip-right', 'zoom-blur', 'slide-up'],
    motions: ['zoom-punch', 'ken-burns-in', 'shake', 'pan-right', 'zoom-punch', 'ken-burns-out'],
    motionIntensity: 65,
    colorFilter: 'vibrant-hdr',
    effects: { vignette: 15 },
    titleTemplate: 'big-bold-title',
    overlayTemplate: 'callout-punch',
    sfxOnCut: 'whoosh',
    sfxEveryNthCut: 1,
    sfxOnTitle: 'impact-boom',
    sfxOnOverlay: 'pop',
    sfxVolume: 60,
    musicVolume: 16,
    introTitle: true,
    outroFadeSeconds: 0.8,
  },
  {
    id: 'shorts',
    name: 'Shorts / Reels',
    description: 'Vertical 9:16, one big word at a time, punchy zooms. YouTube Shorts, TikTok, Reels.',
    emoji: '📱',
    recommendedAspect: '9:16',
    captionTemplate: 'single-punch',
    captionsEnabled: true,
    transitions: ['zoom-in', 'whip-left', 'flash-white', 'whip-right'],
    transitionSeconds: 0.25,
    motions: ['zoom-punch', 'ken-burns-in', 'shake', 'zoom-punch'],
    motionIntensity: 70,
    colorFilter: 'vibrant-hdr',
    effects: {},
    titleTemplate: 'big-bold-title',
    overlayTemplate: 'callout-punch',
    sfxOnCut: 'whoosh',
    sfxEveryNthCut: 1,
    sfxOnTitle: 'impact-boom',
    sfxOnOverlay: 'pop',
    sfxVolume: 60,
    musicVolume: 16,
    introTitle: false,
    outroFadeSeconds: 0.5,
  },
  {
    id: 'mystery',
    name: 'Mystery / Horror',
    description: 'Dark desaturated look, flicker, heartbeat and bass drops. Horror stories, unsolved cases.',
    emoji: '🕯️',
    recommendedAspect: '16:9',
    captionTemplate: 'horror-red',
    captionsEnabled: true,
    transitions: ['dip-black', 'blur', 'glitch', 'fade'],
    transitionSeconds: 0.9,
    motions: ['ken-burns-in', 'shake', 'pan-down', 'ken-burns-in', 'float'],
    motionIntensity: 50,
    colorFilter: 'horror-desat',
    effects: { vignette: 70, filmGrain: 30, flicker: 25 },
    titleTemplate: 'horror-title',
    overlayTemplate: 'quote-italic',
    sfxOnCut: 'sub-bass',
    sfxEveryNthCut: 3,
    sfxOnTitle: 'braam',
    sfxOnOverlay: 'heartbeat',
    sfxVolume: 55,
    musicVolume: 14,
    introTitle: true,
    outroFadeSeconds: 2.5,
  },
  {
    id: 'retro',
    name: 'Retro VHS',
    description: 'VHS tape look, glitches and record scratches. Nostalgia, 80s/90s, internet mysteries.',
    emoji: '📼',
    recommendedAspect: '16:9',
    captionTemplate: 'typewriter-mono',
    captionsEnabled: true,
    transitions: ['glitch', 'fade', 'slide-left', 'glitch'],
    motions: ['ken-burns-in', 'shake', 'ken-burns-out'],
    motionIntensity: 40,
    colorFilter: 'vintage-warm',
    effects: { vhs: 60, glitch: 12, filmGrain: 20 },
    titleTemplate: 'big-bold-title',
    overlayTemplate: 'lower-third-news',
    sfxOnCut: 'glitch',
    sfxEveryNthCut: 2,
    sfxOnTitle: 'tape-start',
    sfxOnOverlay: 'record-scratch',
    sfxVolume: 50,
    musicVolume: 15,
    introTitle: true,
    outroFadeSeconds: 1,
  },
  {
    id: 'kids',
    name: 'Kids & Fun',
    description: 'Bright colors, bouncy captions, playful pops. Kids stories, animals, fun facts.',
    emoji: '🎈',
    recommendedAspect: '16:9',
    captionTemplate: 'bounce-kids',
    captionsEnabled: true,
    transitions: ['slide-left', 'iris', 'zoom-in', 'slide-up'],
    motions: ['float', 'ken-burns-in', 'zoom-punch'],
    motionIntensity: 45,
    colorFilter: 'vibrant-hdr',
    effects: {},
    titleTemplate: 'callout-punch',
    overlayTemplate: 'callout-punch',
    sfxOnCut: 'pop',
    sfxEveryNthCut: 2,
    sfxOnTitle: 'sparkle-chime',
    sfxOnOverlay: 'ding',
    sfxVolume: 55,
    musicVolume: 15,
    introTitle: true,
    outroFadeSeconds: 1,
  },
];

export const VIDEO_STYLE_IDS = VIDEO_STYLES.map((s) => s.id);

export const getVideoStyle = (id?: string): VideoStyle =>
  VIDEO_STYLES.find((s) => s.id === id) ?? VIDEO_STYLES[0];
