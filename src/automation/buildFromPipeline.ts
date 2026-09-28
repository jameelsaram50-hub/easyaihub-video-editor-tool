import { CompositionSettings, OverlayEffects, TimelineClip } from '../types/project';
import { getTransition } from '../templates/transitions';
import { getSfx, sfxSrc } from '../templates/sfx';
import { getTitleTemplate } from '../templates/titles';
import { VideoStyle } from '../templates/styles';
import { AiEditPlan, ASPECT_DIMENSIONS, AspectRatio, PipelineJobData } from './types';
import { sanitizePlan } from './aiPlan';

/** Track layout of an auto-built project (0 = bottom of the stack). */
export const AUTO_TRACKS = {
  music: 0,
  voiceover: 1,
  sfx: 2,
  sceneA: 3,
  sceneB: 4,
  overlay: 5,
  captions: 6,
} as const;
export const AUTO_TRACK_COUNT = 7;

export interface BuildOptions {
  style: VideoStyle;
  aspect: AspectRatio;
  fps?: number;
  voiceDurationFrames?: number | null;
  music?: { url: string; path: string; name: string } | null;
  plan?: AiEditPlan | null;
  captionsEnabled?: boolean;
  introTitle?: string; // text for the intro title card; empty = AI title or none
}

export interface BuildResult {
  settings: CompositionSettings;
  clips: TimelineClip[];
  tracksCount: number;
  summary: {
    scenes: number;
    missingMedia: number;
    captions: number;
    sfx: number;
    overlays: number;
    aiUsed: boolean;
  };
}

let idCounter = 0;
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++idCounter}`;

/** Splits a subtitle cue into words with timings weighted by word length (frames relative to the cue). */
function timeWords(text: string, durationInFrames: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const weights = words.map((w) => Math.max(2, w.replace(/[^\p{L}\p{N}]/gu, '').length + 1));
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let cursor = 0;
  return words.map((word, i) => {
    const startFrame = Math.round(cursor);
    cursor += (weights[i] / total) * durationInFrames;
    return { word, startFrame, endFrame: Math.max(startFrame + 1, Math.round(cursor)) };
  });
}

function addBoost(effects: OverlayEffects, boost: string): OverlayEffects {
  if (!boost || boost === 'none') return effects;
  const key = boost as keyof OverlayEffects;
  return { ...effects, [key]: Math.max(effects[key] ?? 0, 45) };
}

/**
 * Turns a finished pipeline job into a fully edited timeline:
 * scenes with camera motion + transitions + grade/effects, voiceover, optional
 * music, sound effects on cuts, intro title, AI overlays and styled captions.
 */
export function buildProjectFromPipeline(job: PipelineJobData, options: BuildOptions): BuildResult {
  const { style, aspect } = options;
  const fps = options.fps ?? 30;
  const { width, height } = ASPECT_DIMENSIONS[aspect];
  const captionsEnabled = options.captionsEnabled ?? style.captionsEnabled;
  const plan = options.plan ?? sanitizePlan(null, style, job.scenes.length);
  const aiUsed = !!options.plan;

  const clips: TimelineClip[] = [];
  const sfxClips: TimelineClip[] = [];
  const secondsToFrames = (s: number) => Math.max(0, Math.round(s * fps));

  const addSfx = (id: string | null | undefined, atFrame: number, label: string) => {
    const sfx = getSfx(id);
    if (!sfx) return;
    const start = Math.max(0, atFrame - secondsToFrames(sfx.leadSeconds));
    sfxClips.push({
      id: newId('sfx'),
      name: `SFX: ${sfx.name} (${label})`,
      type: 'audio',
      role: 'sfx',
      src: sfxSrc(sfx.id),
      startFrame: start,
      durationInFrames: Math.max(2, secondsToFrames(sfx.seconds) + 2),
      trackIndex: AUTO_TRACKS.sfx,
      volume: style.sfxVolume,
    });
  };

  // ---- 1. Scene timing (frames), gap-free and strictly increasing ----
  const starts: number[] = [];
  job.scenes.forEach((scene, i) => {
    const s = i === 0 ? 0 : secondsToFrames(scene.startSec);
    starts.push(i === 0 ? 0 : Math.max(s, starts[i - 1] + 1));
  });
  const lastSceneEnd = secondsToFrames(job.scenes[job.scenes.length - 1]?.endSec ?? 0);
  const ends = starts.map((_, i) =>
    i < starts.length - 1
      ? starts[i + 1]
      : Math.max(lastSceneEnd, options.voiceDurationFrames ?? 0, starts[i] + fps)
  );

  // ---- 2. Scene clips ----
  let missingMedia = 0;
  const sceneClips: TimelineClip[] = job.scenes.map((scene, i) => {
    const sp = plan.scenes[i];
    if (!scene.mediaUrl) missingMedia++;
    return {
      id: newId('scene'),
      name: `Scene ${scene.number}${scene.mediaUrl ? '' : ' (no image)'}`,
      type: scene.mediaType ?? 'image',
      role: 'scene',
      src: scene.mediaUrl ?? undefined,
      filePath: scene.mediaPath ?? undefined,
      mediaStartFrame: 0,
      startFrame: starts[i],
      durationInFrames: Math.max(1, ends[i] - starts[i]),
      trackIndex: i % 2 === 0 ? AUTO_TRACKS.sceneA : AUTO_TRACKS.sceneB,
      fitToFrame: true,
      width,
      height,
      objectFit: 'cover',
      x: 0,
      y: 0,
      motion: sp.motion,
      motionIntensity: style.motionIntensity,
      colorFilter: sp.color_filter,
      effects: addBoost({ ...style.effects }, sp.effect_boost),
      volume: 0, // scene videos are muted; the voiceover carries the audio
      content: scene.text,
    };
  });

  // ---- 3. Transitions between scenes ----
  // The video always opens with a short fade from black
  if (sceneClips[0]) {
    sceneClips[0].inTransition = 'fade';
    sceneClips[0].inTransitionDuration = secondsToFrames(0.6);
  }

  for (let i = 1; i < sceneClips.length; i++) {
    const type = plan.scenes[i].transition_in;
    const prev = sceneClips[i - 1];
    const cur = sceneClips[i];
    const cutFrame = starts[i];

    if (type !== 'none') {
      const def = getTransition(type);
      const shortest = Math.min(prev.durationInFrames, cur.durationInFrames);
      const frames = Math.max(
        2,
        Math.min(secondsToFrames(style.transitionSeconds ?? def.defaultSeconds), Math.floor(shortest * 0.4))
      );

      if (def.kind === 'overlap') {
        // Both scenes are visible during the transition: extend the outgoing
        // scene; the clip on the upper track performs the transition.
        prev.durationInFrames += frames;
        if (cur.trackIndex > prev.trackIndex) {
          cur.inTransition = type;
          cur.inTransitionDuration = frames;
        } else {
          prev.outTransition = type;
          prev.outTransitionDuration = frames;
        }
      } else {
        // Flash / dip / glitch: outgoing plays the first half, incoming the second
        const half = Math.max(1, Math.ceil(frames / 2));
        prev.outTransition = type;
        prev.outTransitionDuration = half;
        cur.inTransition = type;
        cur.inTransitionDuration = half;
      }
    }

    // Sound on the cut: AI choice, otherwise the style's rhythm
    const aiSfx = aiUsed ? plan.scenes[i].sfx : 'none';
    if (aiSfx && aiSfx !== 'none') {
      addSfx(aiSfx, cutFrame, `cut ${i}`);
    } else if (!aiUsed && style.sfxOnCut && i % Math.max(1, style.sfxEveryNthCut) === 0) {
      addSfx(style.sfxOnCut, cutFrame, `cut ${i}`);
    }
  }

  // Fade the ending to black
  const lastScene = sceneClips[sceneClips.length - 1];
  if (lastScene && !lastScene.outTransition) {
    lastScene.outTransition = 'dip-black';
    lastScene.outTransitionDuration = secondsToFrames(style.outroFadeSeconds);
  }
  clips.push(...sceneClips);

  const totalFrames = Math.max(
    ...sceneClips.map((c) => c.startFrame + c.durationInFrames),
    options.voiceDurationFrames ?? 0,
    fps
  );

  // ---- 4. Voiceover + music ----
  if (job.voiceover) {
    clips.push({
      id: newId('voice'),
      name: 'Voiceover',
      type: 'audio',
      role: 'voiceover',
      src: job.voiceover.url,
      filePath: job.voiceover.path,
      mediaStartFrame: 0,
      startFrame: 0,
      durationInFrames: options.voiceDurationFrames ?? totalFrames,
      trackIndex: AUTO_TRACKS.voiceover,
      volume: 100,
    });
  }

  if (options.music) {
    clips.push({
      id: newId('music'),
      name: `Music: ${options.music.name}`,
      type: 'audio',
      role: 'music',
      src: options.music.url,
      filePath: options.music.path,
      mediaStartFrame: 0,
      startFrame: 0,
      durationInFrames: totalFrames,
      trackIndex: AUTO_TRACKS.music,
      volume: style.musicVolume,
      loop: true,
      fadeInFrames: secondsToFrames(1.5),
      fadeOutFrames: secondsToFrames(2.5),
    });
  }

  // ---- 5. Intro title ----
  let titleEnd = 0;
  // Pipeline job titles can be raw step output, so only a title typed by the
  // user or written by the AI goes on screen
  const titleText = (options.introTitle?.trim() || (aiUsed ? plan.video_title : '')).trim();
  if (style.introTitle && titleText) {
    const tpl = getTitleTemplate(style.titleTemplate);
    const duration = Math.min(secondsToFrames(3), Math.max(secondsToFrames(1.5), ends[0] - starts[0]));
    clips.push({
      id: newId('title'),
      name: 'Intro Title',
      type: 'text',
      role: 'title',
      textTemplate: tpl?.id,
      ...(tpl ? tpl.apply(width, height) : {}),
      content: titleText,
      startFrame: 0,
      durationInFrames: duration,
      trackIndex: AUTO_TRACKS.overlay,
      inTransitionDuration: secondsToFrames(0.5),
      outTransitionDuration: secondsToFrames(0.5),
    });
    addSfx(style.sfxOnTitle, secondsToFrames(0.1), 'title');
    titleEnd = duration;
  }

  // ---- 6. AI overlays (key facts / numbers on screen) ----
  let overlays = 0;
  plan.scenes.forEach((sp, i) => {
    if (!sp.overlay_text) return;
    const start = starts[i] + secondsToFrames(0.3);
    if (start < titleEnd) return;
    const available = ends[i] - start;
    if (available < secondsToFrames(0.8)) return;
    const tpl = getTitleTemplate(sp.overlay_template) ?? getTitleTemplate(style.overlayTemplate);
    clips.push({
      id: newId('overlay'),
      name: `Overlay: ${sp.overlay_text}`,
      type: 'text',
      role: 'overlay',
      textTemplate: tpl?.id,
      ...(tpl ? tpl.apply(width, height) : {}),
      content: sp.overlay_text,
      startFrame: start,
      durationInFrames: Math.min(secondsToFrames(2.6), available),
      trackIndex: AUTO_TRACKS.overlay,
      inTransitionDuration: secondsToFrames(0.35),
      outTransitionDuration: secondsToFrames(0.35),
    });
    addSfx(style.sfxOnOverlay, start, 'overlay');
    overlays++;
  });

  // ---- 7. Captions (one clip per subtitle cue, words timed inside it) ----
  let captions = 0;
  if (captionsEnabled) {
    const cues =
      job.srtCues.length > 0
        ? job.srtCues
        : job.scenes.map((s) => ({ startSec: s.startSec, endSec: s.endSec, text: s.text }));

    for (const cue of cues) {
      const start = secondsToFrames(cue.startSec);
      const duration = Math.max(1, secondsToFrames(cue.endSec) - start);
      if (!cue.text.trim()) continue;
      // Emphasis words from every scene this cue overlaps
      const emphasis = new Set<string>();
      job.scenes.forEach((s, i) => {
        if (s.startSec < cue.endSec && s.endSec > cue.startSec) {
          plan.scenes[i]?.emphasis_words.forEach((w) => emphasis.add(w));
        }
      });
      clips.push({
        id: newId('cap'),
        name: `Caption: ${cue.text.slice(0, 24)}`,
        type: 'caption',
        role: 'caption',
        captionTemplate: plan.caption_template,
        content: cue.text,
        words: timeWords(cue.text, duration),
        emphasisWords: [...emphasis],
        startFrame: start,
        durationInFrames: duration,
        trackIndex: AUTO_TRACKS.captions,
        x: 0,
      });
      captions++;
    }
  }

  clips.push(...sfxClips);

  const durationInFrames = Math.max(
    totalFrames,
    ...clips.filter((c) => c.role !== 'music').map((c) => c.startFrame + c.durationInFrames)
  );
  // Music always spans the whole video
  clips.forEach((c) => {
    if (c.role === 'music') c.durationInFrames = durationInFrames;
  });

  return {
    settings: {
      id: 'main-comp',
      title: job.title,
      fps,
      durationInFrames,
      width,
      height,
      backgroundColor: '#000000',
    },
    clips,
    tracksCount: AUTO_TRACK_COUNT,
    summary: {
      scenes: sceneClips.length,
      missingMedia,
      captions,
      sfx: sfxClips.length,
      overlays,
      aiUsed,
    },
  };
}
