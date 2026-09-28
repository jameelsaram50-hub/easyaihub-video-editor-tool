import { Easing, interpolate, random } from 'remotion';
import { TransitionType } from '../types/project';

export interface TransitionDef {
  id: TransitionType;
  name: string;
  category: 'Basic' | 'Slide & Wipe' | 'Zoom & Blur' | 'Stylized';
  /**
   * overlap: the two scenes play on top of each other during the transition (dissolve, slide...).
   * cut: the outgoing scene finishes its half, then the incoming scene plays its half (flash, dip...).
   */
  kind: 'overlap' | 'cut';
  defaultSeconds: number;
}

export const TRANSITIONS: TransitionDef[] = [
  { id: 'none', name: 'None (Hard Cut)', category: 'Basic', kind: 'cut', defaultSeconds: 0 },
  { id: 'fade', name: 'Cross Dissolve', category: 'Basic', kind: 'overlap', defaultSeconds: 0.6 },
  { id: 'dip-black', name: 'Dip to Black', category: 'Basic', kind: 'cut', defaultSeconds: 0.8 },
  { id: 'flash-white', name: 'Flash White', category: 'Basic', kind: 'cut', defaultSeconds: 0.4 },
  { id: 'slide-left', name: 'Slide Left', category: 'Slide & Wipe', kind: 'overlap', defaultSeconds: 0.5 },
  { id: 'slide-right', name: 'Slide Right', category: 'Slide & Wipe', kind: 'overlap', defaultSeconds: 0.5 },
  { id: 'slide-up', name: 'Slide Up', category: 'Slide & Wipe', kind: 'overlap', defaultSeconds: 0.5 },
  { id: 'slide-down', name: 'Slide Down', category: 'Slide & Wipe', kind: 'overlap', defaultSeconds: 0.5 },
  { id: 'whip-left', name: 'Whip Pan Left', category: 'Slide & Wipe', kind: 'overlap', defaultSeconds: 0.3 },
  { id: 'whip-right', name: 'Whip Pan Right', category: 'Slide & Wipe', kind: 'overlap', defaultSeconds: 0.3 },
  { id: 'wipe-left', name: 'Wipe Left', category: 'Slide & Wipe', kind: 'overlap', defaultSeconds: 0.6 },
  { id: 'wipe-right', name: 'Wipe Right', category: 'Slide & Wipe', kind: 'overlap', defaultSeconds: 0.6 },
  { id: 'wipe-up', name: 'Wipe Up', category: 'Slide & Wipe', kind: 'overlap', defaultSeconds: 0.6 },
  { id: 'wipe-down', name: 'Wipe Down', category: 'Slide & Wipe', kind: 'overlap', defaultSeconds: 0.6 },
  { id: 'zoom-in', name: 'Zoom In', category: 'Zoom & Blur', kind: 'overlap', defaultSeconds: 0.5 },
  { id: 'zoom-out', name: 'Zoom Out', category: 'Zoom & Blur', kind: 'overlap', defaultSeconds: 0.5 },
  { id: 'zoom-blur', name: 'Zoom Blur', category: 'Zoom & Blur', kind: 'overlap', defaultSeconds: 0.45 },
  { id: 'blur', name: 'Blur Dissolve', category: 'Zoom & Blur', kind: 'overlap', defaultSeconds: 0.7 },
  { id: 'iris', name: 'Iris Circle', category: 'Stylized', kind: 'overlap', defaultSeconds: 0.7 },
  { id: 'glitch', name: 'Glitch', category: 'Stylized', kind: 'cut', defaultSeconds: 0.35 },
  { id: 'flip', name: '3D Flip', category: 'Stylized', kind: 'overlap', defaultSeconds: 0.6 },
  { id: 'slide', name: 'Slide (Classic)', category: 'Slide & Wipe', kind: 'overlap', defaultSeconds: 0.5 },
];

export const TRANSITION_IDS = TRANSITIONS.map((t) => t.id);

export const getTransition = (id?: string): TransitionDef =>
  TRANSITIONS.find((t) => t.id === id) ?? TRANSITIONS[0];

/** Visual state of a clip while a transition is running. */
export interface TransitionFrame {
  opacity: number;
  translateX: number;
  translateY: number;
  scale: number;
  blur: number;
  rotateY: number;
  hueRotate: number;
  clipPath?: string;
  flash: number; // white overlay 0–1
  dark: number; // black overlay 0–1
}

export const IDLE_TRANSITION: TransitionFrame = {
  opacity: 1,
  translateX: 0,
  translateY: 0,
  scale: 1,
  blur: 0,
  rotateY: 0,
  hueRotate: 0,
  flash: 0,
  dark: 0,
};

const DIRECTIONS: Record<string, [number, number]> = {
  left: [-1, 0],
  right: [1, 0],
  up: [0, -1],
  down: [0, 1],
};

/**
 * @param progress 0 = transition just starting (clip hidden), 1 = finished (clip fully shown).
 *                 For the out-transition pass the remaining progress, i.e. it runs 1 → 0.
 * @param phase    'in' when the clip is appearing, 'out' when it is leaving.
 */
export function computeTransition(
  type: TransitionType,
  progress: number,
  phase: 'in' | 'out',
  width: number,
  height: number,
  seedFrame: number
): TransitionFrame {
  const p = Math.max(0, Math.min(1, progress));
  const eased = Easing.inOut(Easing.cubic)(p);
  const hidden = 1 - eased;
  const f: TransitionFrame = { ...IDLE_TRANSITION };

  // Movement direction: "slide-left" means content travels to the left.
  // Appearing clips come from the opposite side; leaving clips exit towards it.
  const moveBy = (dirName: string, distanceX: number, distanceY: number) => {
    const [dx, dy] = DIRECTIONS[dirName];
    const sign = phase === 'in' ? -1 : 1;
    f.translateX = sign * dx * hidden * distanceX;
    f.translateY = sign * dy * hidden * distanceY;
  };

  switch (type) {
    case 'fade':
      f.opacity = eased;
      break;
    case 'dip-black':
      f.dark = hidden;
      break;
    case 'flash-white':
      f.flash = Math.pow(hidden, 1.5);
      break;
    case 'slide':
      moveBy('left', width, height);
      break;
    case 'slide-left':
    case 'slide-right':
    case 'slide-up':
    case 'slide-down':
      moveBy(type.replace('slide-', ''), width, height);
      break;
    case 'whip-left':
    case 'whip-right': {
      const fast = Easing.in(Easing.exp)(1 - p);
      const [dx] = DIRECTIONS[type.replace('whip-', '')];
      f.translateX = (phase === 'in' ? -1 : 1) * dx * fast * width;
      f.blur = fast * 40;
      break;
    }
    case 'wipe-left':
    case 'wipe-right':
    case 'wipe-up':
    case 'wipe-down': {
      // Edge travels in the named direction, revealing (in) or hiding (out) the clip
      const pct = hidden * 100;
      const insets: Record<string, string> =
        phase === 'in'
          ? {
              'wipe-left': `inset(0 0 0 ${pct}%)`,
              'wipe-right': `inset(0 ${pct}% 0 0)`,
              'wipe-up': `inset(${pct}% 0 0 0)`,
              'wipe-down': `inset(0 0 ${pct}% 0)`,
            }
          : {
              'wipe-left': `inset(0 ${pct}% 0 0)`,
              'wipe-right': `inset(0 0 0 ${pct}%)`,
              'wipe-up': `inset(0 0 ${pct}% 0)`,
              'wipe-down': `inset(${pct}% 0 0 0)`,
            };
      f.clipPath = insets[type];
      break;
    }
    case 'zoom-in':
      // Appears from very close / leaves by flying into the camera
      f.scale = phase === 'in' ? 1 + hidden * 0.6 : 1 + hidden * 0.6;
      f.opacity = eased;
      break;
    case 'zoom-out':
      f.scale = 1 - hidden * 0.35;
      f.opacity = eased;
      break;
    case 'zoom-blur':
      f.scale = 1 + hidden * 0.35;
      f.blur = hidden * 28;
      f.opacity = interpolate(p, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' });
      break;
    case 'blur':
      f.blur = hidden * 30;
      f.opacity = eased;
      break;
    case 'iris':
      f.clipPath = `circle(${eased * 75}% at 50% 50%)`;
      break;
    case 'glitch': {
      const r = random(`glitch-${seedFrame}`);
      const r2 = random(`glitch-y-${seedFrame}`);
      f.translateX = (r - 0.5) * 120 * hidden;
      f.translateY = (r2 - 0.5) * 30 * hidden;
      f.hueRotate = hidden > 0.05 ? Math.round(r * 360) : 0;
      f.opacity = hidden > 0.6 && r > 0.5 ? 0.3 : 1;
      break;
    }
    case 'flip':
      f.rotateY = (phase === 'in' ? 90 : -90) * hidden;
      f.opacity = p > 0.02 ? 1 : 0;
      break;
    default:
      break;
  }
  return f;
}
