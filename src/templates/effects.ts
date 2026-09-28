import { ColorFilterPreset, OverlayEffects } from '../types/project';

export interface ColorGradeDef {
  id: ColorFilterPreset;
  name: string;
  filter: string; // CSS filter chain
}

export const COLOR_GRADES: ColorGradeDef[] = [
  { id: 'none', name: 'Original', filter: '' },
  { id: 'cinematic-teal', name: 'Cinematic Teal & Orange', filter: 'contrast(115%) saturate(115%) sepia(12%) hue-rotate(-8deg)' },
  { id: 'warm-documentary', name: 'Warm Documentary', filter: 'sepia(18%) contrast(106%) saturate(108%) brightness(103%)' },
  { id: 'kodak-film', name: 'Kodak Film', filter: 'sepia(20%) contrast(95%) saturate(112%) brightness(106%)' },
  { id: 'vintage-warm', name: 'Vintage 35mm', filter: 'sepia(35%) contrast(105%) brightness(105%)' },
  { id: 'golden-hour', name: 'Golden Hour', filter: 'sepia(22%) saturate(130%) brightness(108%)' },
  { id: 'vibrant-hdr', name: 'Vibrant HDR Pop', filter: 'contrast(118%) saturate(145%)' },
  { id: 'nordic-cold', name: 'Cool Nordic', filter: 'contrast(112%) saturate(75%) brightness(102%) hue-rotate(-12deg)' },
  { id: 'bleach-bypass', name: 'Bleach Bypass', filter: 'contrast(140%) saturate(55%) brightness(98%)' },
  { id: 'horror-desat', name: 'Horror Desaturated', filter: 'contrast(125%) saturate(35%) brightness(88%) hue-rotate(-10deg)' },
  { id: 'black-white', name: 'Noir Black & White', filter: 'grayscale(100%) contrast(125%)' },
  { id: 'cyberpunk', name: 'Cyberpunk Neon', filter: 'contrast(130%) saturate(150%) hue-rotate(290deg)' },
  { id: 'matrix-green', name: 'Matrix Green', filter: 'contrast(130%) saturate(120%) hue-rotate(90deg)' },
];

export const COLOR_GRADE_IDS = COLOR_GRADES.map((c) => c.id);

export const getColorGradeFilter = (id?: ColorFilterPreset) =>
  COLOR_GRADES.find((c) => c.id === id)?.filter ?? '';

export interface OverlayEffectDef {
  key: keyof OverlayEffects;
  name: string;
}

export const OVERLAY_EFFECTS: OverlayEffectDef[] = [
  { key: 'vignette', name: 'Vignette' },
  { key: 'filmGrain', name: 'Film Grain' },
  { key: 'lightLeak', name: 'Light Leak' },
  { key: 'vhs', name: 'VHS Tape' },
  { key: 'glitch', name: 'Digital Glitch' },
  { key: 'oldFilm', name: 'Old Film (scratches)' },
  { key: 'flicker', name: 'Light Flicker' },
  { key: 'letterbox', name: 'Cinema Bars' },
];

/** Ready-made looks: a color grade plus overlay effects */
export interface EffectPresetDef {
  id: string;
  name: string;
  colorFilter: ColorFilterPreset;
  effects: OverlayEffects;
}

export const EFFECT_PRESETS: EffectPresetDef[] = [
  { id: 'clean', name: 'Clean (No Effects)', colorFilter: 'none', effects: {} },
  { id: 'documentary', name: 'Documentary Film', colorFilter: 'warm-documentary', effects: { vignette: 35, filmGrain: 20 } },
  { id: 'cinematic', name: 'Cinematic Widescreen', colorFilter: 'cinematic-teal', effects: { vignette: 30, filmGrain: 12, letterbox: 60 } },
  { id: 'dreamy', name: 'Dreamy Light Leak', colorFilter: 'golden-hour', effects: { lightLeak: 55, vignette: 20 } },
  { id: 'retro-vhs', name: 'Retro VHS 1985', colorFilter: 'vintage-warm', effects: { vhs: 65, glitch: 15, filmGrain: 20 } },
  { id: 'silent-film', name: 'Silent Film 1920', colorFilter: 'black-white', effects: { oldFilm: 70, filmGrain: 45, flicker: 40, vignette: 60 } },
  { id: 'horror', name: 'Horror / Mystery', colorFilter: 'horror-desat', effects: { vignette: 70, filmGrain: 30, flicker: 25 } },
  { id: 'hacker', name: 'Glitch Hacker', colorFilter: 'matrix-green', effects: { glitch: 45, vhs: 30 } },
  { id: 'hype', name: 'Hype / Viral', colorFilter: 'vibrant-hdr', effects: { vignette: 15 } },
  { id: 'noir', name: 'Film Noir', colorFilter: 'black-white', effects: { vignette: 65, filmGrain: 30 } },
];
