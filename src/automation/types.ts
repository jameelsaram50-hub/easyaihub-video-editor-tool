import { ColorFilterPreset, MotionType, TransitionType } from '../types/project';

/** A job exported by the Easy AI Hub pipeline (see electron/pipeline-import.js). */
export interface PipelineScene {
  index: number;
  number: number;
  text: string;
  prompt: string;
  startSec: number;
  endSec: number;
  mediaPath: string | null;
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | null;
}

export interface PipelineJobData {
  id: string;
  jobDir: string;
  title: string;
  templateId: string | null;
  scenes: PipelineScene[];
  voiceover: { path: string; url: string } | null;
  srtCues: Array<{ startSec: number; endSec: number; text: string }>;
}

export interface PipelineJobSummary {
  id: string;
  jobDir: string;
  title: string;
  templateId: string | null;
  createdAt: string | null;
  sceneCount: number;
  mediaCount: number;
  durationSec: number;
  hasAudio: boolean;
  hasSrt: boolean;
  ready: boolean;
  thumbnailUrl: string | null;
}

export type EffectBoost = 'none' | 'vignette' | 'filmGrain' | 'lightLeak' | 'vhs' | 'glitch' | 'oldFilm' | 'flicker';

/** Per-scene edit decisions returned by the AI (after validation). */
export interface ScenePlan {
  index: number;
  motion: MotionType;
  transition_in: TransitionType;
  color_filter: ColorFilterPreset;
  sfx: string; // sfx id or 'none'
  overlay_text: string;
  overlay_template: string;
  emphasis_words: string[];
  effect_boost: EffectBoost;
}

export interface AiEditPlan {
  video_title: string;
  title_subtitle: string;
  caption_template: string;
  scenes: ScenePlan[];
}

export type AspectRatio = '16:9' | '9:16' | '1:1';

export const ASPECT_DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
};
