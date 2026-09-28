/**
 * Caption (subtitle) templates. Sizes are for a 1080px short side and are
 * scaled to the composition automatically. Fonts are Windows system fonts so
 * rendering works offline.
 */
export type CaptionMode =
  | 'karaoke' // page of words, active word recolored
  | 'pop' // page of words, active word pops bigger
  | 'box' // active word gets a colored box behind it
  | 'single' // only the active word is shown, big
  | 'line' // whole cue shown as a normal subtitle line
  | 'typewriter' // words appear one after another
  | 'bounce' // each word bounces in when it is spoken
  | 'underline'; // active word gets an animated underline

export interface CaptionTemplate {
  id: string;
  name: string;
  category: 'Viral' | 'Clean' | 'Cinematic' | 'Fun';
  mode: CaptionMode;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  uppercase: boolean;
  italic?: boolean;
  letterSpacing?: number;
  textColor: string;
  activeColor: string;
  activeBg?: string;
  containerBg?: string;
  containerRadius?: number;
  strokeColor?: string;
  strokeWidth?: number;
  shadow?: string;
  glow?: string;
  position: 'bottom' | 'center' | 'top' | 'lower';
  wordsPerPage: number;
  emphasisColor?: string; // color for AI-picked emphasis words
}

export const CAPTION_TEMPLATES: CaptionTemplate[] = [
  {
    id: 'viral-yellow',
    name: 'Viral Yellow Pop',
    category: 'Viral',
    mode: 'pop',
    fontFamily: "'Arial Black', 'Segoe UI Black', sans-serif",
    fontSize: 64,
    fontWeight: '900',
    uppercase: true,
    textColor: '#ffffff',
    activeColor: '#ffe600',
    strokeColor: '#000000',
    strokeWidth: 10,
    shadow: '0 6px 0 rgba(0,0,0,0.85)',
    position: 'lower',
    wordsPerPage: 3,
    emphasisColor: '#39ff14',
  },
  {
    id: 'hormozi-box',
    name: 'Hormozi Green Box',
    category: 'Viral',
    mode: 'box',
    fontFamily: "'Arial Black', 'Segoe UI Black', sans-serif",
    fontSize: 60,
    fontWeight: '900',
    uppercase: true,
    textColor: '#ffffff',
    activeColor: '#ffffff',
    activeBg: '#22c55e',
    strokeColor: '#000000',
    strokeWidth: 8,
    position: 'lower',
    wordsPerPage: 3,
    emphasisColor: '#facc15',
  },
  {
    id: 'tiktok-purple',
    name: 'TikTok Purple Box',
    category: 'Viral',
    mode: 'box',
    fontFamily: "'Segoe UI', sans-serif",
    fontSize: 58,
    fontWeight: '800',
    uppercase: false,
    textColor: '#ffffff',
    activeColor: '#ffffff',
    activeBg: '#8b5cf6',
    shadow: '0 4px 14px rgba(0,0,0,0.8)',
    position: 'center',
    wordsPerPage: 4,
    emphasisColor: '#fde047',
  },
  {
    id: 'single-punch',
    name: 'Single Word Punch',
    category: 'Viral',
    mode: 'single',
    fontFamily: "Impact, 'Arial Black', sans-serif",
    fontSize: 120,
    fontWeight: '400',
    uppercase: true,
    textColor: '#ffffff',
    activeColor: '#ffffff',
    strokeColor: '#000000',
    strokeWidth: 12,
    shadow: '0 8px 0 rgba(0,0,0,0.9)',
    position: 'center',
    wordsPerPage: 1,
    emphasisColor: '#ff3b3b',
  },
  {
    id: 'karaoke-classic',
    name: 'Karaoke Classic',
    category: 'Clean',
    mode: 'karaoke',
    fontFamily: "'Segoe UI', sans-serif",
    fontSize: 50,
    fontWeight: '800',
    uppercase: false,
    textColor: '#ffffff',
    activeColor: '#facc15',
    containerBg: 'rgba(0,0,0,0.6)',
    containerRadius: 18,
    shadow: '0 2px 8px rgba(0,0,0,0.8)',
    position: 'bottom',
    wordsPerPage: 6,
    emphasisColor: '#38bdf8',
  },
  {
    id: 'documentary-clean',
    name: 'Documentary Serif',
    category: 'Clean',
    mode: 'line',
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: 44,
    fontWeight: '400',
    uppercase: false,
    textColor: '#f5f5f4',
    activeColor: '#f5f5f4',
    shadow: '0 2px 10px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.9)',
    position: 'bottom',
    wordsPerPage: 12,
    emphasisColor: '#fcd34d',
  },
  {
    id: 'netflix-subtitle',
    name: 'Streaming Subtitle',
    category: 'Clean',
    mode: 'line',
    fontFamily: "'Segoe UI', Arial, sans-serif",
    fontSize: 46,
    fontWeight: '600',
    uppercase: false,
    textColor: '#ffffff',
    activeColor: '#ffffff',
    containerBg: 'rgba(0,0,0,0.72)',
    containerRadius: 6,
    position: 'bottom',
    wordsPerPage: 10,
  },
  {
    id: 'underline-modern',
    name: 'Modern Underline',
    category: 'Clean',
    mode: 'underline',
    fontFamily: "'Segoe UI', sans-serif",
    fontSize: 54,
    fontWeight: '700',
    uppercase: false,
    textColor: '#ffffff',
    activeColor: '#ffffff',
    activeBg: '#f43f5e',
    shadow: '0 3px 12px rgba(0,0,0,0.85)',
    position: 'lower',
    wordsPerPage: 4,
    emphasisColor: '#fb7185',
  },
  {
    id: 'cinematic-minimal',
    name: 'Cinematic Minimal',
    category: 'Cinematic',
    mode: 'line',
    fontFamily: "'Segoe UI Light', 'Segoe UI', sans-serif",
    fontSize: 38,
    fontWeight: '300',
    uppercase: true,
    letterSpacing: 6,
    textColor: '#e7e5e4',
    activeColor: '#e7e5e4',
    shadow: '0 2px 12px rgba(0,0,0,0.9)',
    position: 'bottom',
    wordsPerPage: 9,
  },
  {
    id: 'neon-glow',
    name: 'Neon Glow',
    category: 'Cinematic',
    mode: 'karaoke',
    fontFamily: "'Segoe UI', sans-serif",
    fontSize: 56,
    fontWeight: '800',
    uppercase: true,
    textColor: '#e0f2fe',
    activeColor: '#22d3ee',
    glow: '0 0 12px #22d3ee, 0 0 28px #0ea5e9, 0 0 48px #6366f1',
    shadow: '0 2px 8px rgba(0,0,0,0.8)',
    position: 'lower',
    wordsPerPage: 4,
    emphasisColor: '#f0abfc',
  },
  {
    id: 'horror-red',
    name: 'Horror Red',
    category: 'Cinematic',
    mode: 'pop',
    fontFamily: "'Times New Roman', Georgia, serif",
    fontSize: 62,
    fontWeight: '700',
    uppercase: true,
    letterSpacing: 2,
    textColor: '#e5e5e5',
    activeColor: '#dc2626',
    shadow: '0 0 18px rgba(0,0,0,1), 0 4px 10px rgba(0,0,0,0.9)',
    position: 'lower',
    wordsPerPage: 3,
    emphasisColor: '#ef4444',
  },
  {
    id: 'typewriter-mono',
    name: 'Typewriter',
    category: 'Cinematic',
    mode: 'typewriter',
    fontFamily: "'Courier New', Consolas, monospace",
    fontSize: 46,
    fontWeight: '700',
    uppercase: false,
    textColor: '#fafaf9',
    activeColor: '#fafaf9',
    containerBg: 'rgba(0,0,0,0.55)',
    containerRadius: 4,
    position: 'bottom',
    wordsPerPage: 8,
  },
  {
    id: 'bounce-kids',
    name: 'Bouncy Fun',
    category: 'Fun',
    mode: 'bounce',
    fontFamily: "'Comic Sans MS', 'Segoe Print', sans-serif",
    fontSize: 62,
    fontWeight: '800',
    uppercase: false,
    textColor: '#ffffff',
    activeColor: '#fb923c',
    strokeColor: '#1e3a8a',
    strokeWidth: 8,
    position: 'lower',
    wordsPerPage: 3,
    emphasisColor: '#4ade80',
  },
  {
    id: 'comic-pop',
    name: 'Comic Pop',
    category: 'Fun',
    mode: 'pop',
    fontFamily: "Impact, 'Arial Black', sans-serif",
    fontSize: 78,
    fontWeight: '400',
    uppercase: true,
    textColor: '#fef08a',
    activeColor: '#ffffff',
    strokeColor: '#7c2d12',
    strokeWidth: 10,
    shadow: '6px 6px 0 #000000',
    position: 'lower',
    wordsPerPage: 2,
    emphasisColor: '#f472b6',
  },
];

export const CAPTION_TEMPLATE_IDS = CAPTION_TEMPLATES.map((c) => c.id);

export const getCaptionTemplate = (id?: string): CaptionTemplate =>
  CAPTION_TEMPLATES.find((c) => c.id === id) ?? CAPTION_TEMPLATES[4];
