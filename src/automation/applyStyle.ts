import { TimelineClip } from '../types/project';
import { VideoStyle } from '../templates/styles';

const isSceneClip = (c: TimelineClip) =>
  c.role === 'scene' || ((c.type === 'image' || c.type === 'video') && !!c.fitToFrame);

/**
 * Re-styles an existing timeline: scenes get the style's grade, effects and
 * rotating camera motions; captions switch to the style's caption template.
 * Timing, text and media are left untouched.
 */
export function applyStyleToClips(clips: TimelineClip[], style: VideoStyle): TimelineClip[] {
  const scenes = clips.filter(isSceneClip).sort((a, b) => a.startFrame - b.startFrame);
  const sceneOrder = new Map(scenes.map((c, i) => [c.id, i]));

  return clips.map((c) => {
    if (isSceneClip(c)) {
      const i = sceneOrder.get(c.id) ?? 0;
      return {
        ...c,
        colorFilter: style.colorFilter,
        effects: { ...style.effects },
        motion: style.motions[i % style.motions.length],
        motionIntensity: style.motionIntensity,
      };
    }
    if (c.type === 'caption') {
      return { ...c, captionTemplate: style.captionTemplate, y: undefined, fontSize: undefined, color: undefined, backgroundColor: undefined };
    }
    return c;
  });
}
