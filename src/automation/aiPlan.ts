import { MOTION_IDS } from '../templates/motion';
import { TRANSITION_IDS } from '../templates/transitions';
import { COLOR_GRADE_IDS } from '../templates/effects';
import { SFX_IDS, SFX_LIBRARY } from '../templates/sfx';
import { CAPTION_TEMPLATE_IDS } from '../templates/captions';
import { TITLE_TEMPLATE_IDS } from '../templates/titles';
import { VideoStyle } from '../templates/styles';
import { AiEditPlan, EffectBoost, PipelineJobData, ScenePlan } from './types';

const EFFECT_BOOSTS: EffectBoost[] = ['none', 'vignette', 'filmGrain', 'lightLeak', 'vhs', 'glitch', 'oldFilm', 'flicker'];

/** Request sent to the main process, which forwards it to OpenAI (electron/ai-editor.js). */
export function buildAiRequest(job: PipelineJobData, style: VideoStyle) {
  return {
    title: job.title,
    style: {
      name: style.name,
      description: style.description,
      transitions: style.transitions,
      motions: style.motions,
      colorFilter: style.colorFilter,
      captionTemplate: style.captionTemplate,
      sfxOnCut: style.sfxOnCut,
      sfxEveryNthCut: style.sfxEveryNthCut,
      overlayTemplate: style.overlayTemplate,
    },
    scenes: job.scenes.map((s) => ({
      index: s.index,
      text: s.text,
      visual: s.prompt,
      seconds: Math.max(0.1, s.endSec - s.startSec),
    })),
    options: {
      motions: MOTION_IDS,
      transitions: TRANSITION_IDS.filter((t) => t !== 'slide'),
      colorFilters: COLOR_GRADE_IDS,
      sfx: SFX_IDS,
      captionTemplates: CAPTION_TEMPLATE_IDS,
      titleTemplates: TITLE_TEMPLATE_IDS,
    },
    sfxHints: SFX_LIBRARY.map((s) => `${s.id} (${s.usage})`).join('; '),
  };
}

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

/**
 * Validates the model's answer against the editor's real template ids. Anything
 * unknown falls back to the style's choice, so a bad answer can never break the build.
 */
export function sanitizePlan(raw: any, style: VideoStyle, sceneCount: number): AiEditPlan {
  const byIndex = new Map<number, any>();
  if (Array.isArray(raw?.scenes)) {
    for (const s of raw.scenes) {
      if (s && Number.isInteger(s.index)) byIndex.set(s.index, s);
    }
  }

  const scenes: ScenePlan[] = [];
  for (let i = 0; i < sceneCount; i++) {
    const s = byIndex.get(i) ?? {};
    scenes.push({
      index: i,
      motion: pick(s.motion, MOTION_IDS, style.motions[i % style.motions.length]),
      transition_in: pick(s.transition_in, TRANSITION_IDS, style.transitions[i % style.transitions.length]),
      color_filter: pick(s.color_filter, COLOR_GRADE_IDS, style.colorFilter),
      sfx: pick(s.sfx, [...SFX_IDS, 'none'], 'none'),
      overlay_text: typeof s.overlay_text === 'string' ? s.overlay_text.trim().split(/\s+/).slice(0, 6).join(' ') : '',
      overlay_template: pick(s.overlay_template, TITLE_TEMPLATE_IDS, style.overlayTemplate),
      emphasis_words: Array.isArray(s.emphasis_words)
        ? s.emphasis_words.filter((w: unknown) => typeof w === 'string').slice(0, 4)
        : [],
      effect_boost: pick(s.effect_boost, EFFECT_BOOSTS, 'none'),
    });
  }

  return {
    video_title: typeof raw?.video_title === 'string' ? raw.video_title.trim().slice(0, 80) : '',
    title_subtitle: typeof raw?.title_subtitle === 'string' ? raw.title_subtitle.trim().slice(0, 100) : '',
    caption_template: pick(raw?.caption_template, CAPTION_TEMPLATE_IDS, style.captionTemplate),
    scenes,
  };
}
