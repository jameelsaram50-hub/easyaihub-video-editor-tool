import { Easing, interpolate, spring, random } from 'remotion';
import { MotionType } from '../types/project';

export interface MotionDef {
  id: MotionType;
  name: string;
  description: string;
}

export const MOTIONS: MotionDef[] = [
  { id: 'none', name: 'None (Static)', description: 'No camera movement' },
  { id: 'ken-burns-in', name: 'Ken Burns Zoom In', description: 'Slow push-in, classic documentary' },
  { id: 'ken-burns-out', name: 'Ken Burns Zoom Out', description: 'Slow pull-back reveal' },
  { id: 'pan-left', name: 'Pan Left', description: 'Camera glides to the left' },
  { id: 'pan-right', name: 'Pan Right', description: 'Camera glides to the right' },
  { id: 'pan-up', name: 'Tilt Up', description: 'Camera tilts upwards' },
  { id: 'pan-down', name: 'Tilt Down', description: 'Camera tilts downwards' },
  { id: 'zoom-punch', name: 'Zoom Punch', description: 'Fast punch-in then settle (retention style)' },
  { id: 'shake', name: 'Handheld Shake', description: 'Subtle handheld camera shake' },
  { id: 'float', name: 'Float', description: 'Gentle floating movement' },
  { id: 'rotate-drift', name: 'Rotate Drift', description: 'Slow cinematic rotation' },
];

export const MOTION_IDS = MOTIONS.map((m) => m.id);

export interface MotionFrame {
  scale: number;
  translateX: number; // px
  translateY: number; // px
  rotate: number; // deg
}

/**
 * Camera move for one frame of a clip.
 * @param frame relative frame inside the clip
 * @param intensity 0–100 (50 = default strength)
 */
export function computeMotion(
  type: MotionType | undefined,
  frame: number,
  durationInFrames: number,
  fps: number,
  width: number,
  height: number,
  intensity = 50
): MotionFrame {
  const k = Math.max(0, intensity) / 50;
  const t = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const smooth = Easing.inOut(Easing.sin)(t);
  const m: MotionFrame = { scale: 1, translateX: 0, translateY: 0, rotate: 0 };

  switch (type) {
    case 'ken-burns-in':
      m.scale = 1 + 0.18 * k * smooth;
      m.translateX = -width * 0.015 * k * smooth;
      break;
    case 'ken-burns-out':
      m.scale = 1 + 0.18 * k * (1 - smooth);
      m.translateX = width * 0.015 * k * (1 - smooth);
      break;
    case 'pan-left':
    case 'pan-right': {
      const dir = type === 'pan-left' ? -1 : 1;
      const travel = width * 0.06 * k;
      m.scale = 1 + 0.14 * k; // zoomed so the edges never show
      m.translateX = dir * interpolate(smooth, [0, 1], [-travel, travel]);
      break;
    }
    case 'pan-up':
    case 'pan-down': {
      const dir = type === 'pan-up' ? -1 : 1;
      const travel = height * 0.06 * k;
      m.scale = 1 + 0.14 * k;
      m.translateY = dir * interpolate(smooth, [0, 1], [-travel, travel]);
      break;
    }
    case 'zoom-punch': {
      const punch = spring({ frame, fps, config: { damping: 14, stiffness: 180, mass: 0.6 } });
      m.scale = 1 + 0.22 * k * (1 - punch) + 0.05 * k * t;
      break;
    }
    case 'shake': {
      const amp = 7 * k;
      m.scale = 1 + 0.06 * k;
      m.translateX = (random(`shake-x-${Math.floor(frame / 2)}`) - 0.5) * 2 * amp;
      m.translateY = (random(`shake-y-${Math.floor(frame / 2)}`) - 0.5) * 2 * amp;
      m.rotate = (random(`shake-r-${Math.floor(frame / 3)}`) - 0.5) * 0.6 * k;
      break;
    }
    case 'float': {
      const s = frame / fps;
      m.scale = 1 + 0.05 * k;
      m.translateY = Math.sin(s * Math.PI * 0.5) * 12 * k;
      m.translateX = Math.cos(s * Math.PI * 0.35) * 8 * k;
      break;
    }
    case 'rotate-drift':
      m.scale = 1 + 0.12 * k;
      m.rotate = interpolate(smooth, [0, 1], [-1.5 * k, 1.5 * k]);
      break;
    default:
      break;
  }
  return m;
}
