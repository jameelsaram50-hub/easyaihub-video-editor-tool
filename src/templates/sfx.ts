/**
 * Built-in sound effects (files in public/sfx). Clips reference them as
 * "builtin:sfx/<file>" – see remotion/assets.ts for how that is resolved.
 */
export interface SfxDef {
  id: string;
  name: string;
  category: 'Transition' | 'Impact' | 'UI & Pop' | 'Mood' | 'Retro' | 'Foley';
  seconds: number;
  /** Frames before the cut where the sound should start so its peak lands on the cut */
  leadSeconds: number;
  usage: string; // short hint, also given to the AI
}

export const SFX_LIBRARY: SfxDef[] = [
  { id: 'whoosh', name: 'Whoosh', category: 'Transition', seconds: 0.35, leadSeconds: 0.15, usage: 'fast scene change, whip pans, slides' },
  { id: 'riser', name: 'Riser', category: 'Transition', seconds: 1.4, leadSeconds: 1.3, usage: 'build tension right before a reveal or title' },
  { id: 'glitch', name: 'Glitch', category: 'Transition', seconds: 0.22, leadSeconds: 0.05, usage: 'glitch transitions, tech, hacking' },
  { id: 'tape-start', name: 'Tape Start', category: 'Transition', seconds: 0.45, leadSeconds: 0.1, usage: 'retro intros, rewind moments' },
  { id: 'braam', name: 'Braam', category: 'Impact', seconds: 1.2, leadSeconds: 0, usage: 'epic trailer hit on a big title or reveal' },
  { id: 'cinematic-hit', name: 'Cinematic Hit', category: 'Impact', seconds: 0.45, leadSeconds: 0, usage: 'dramatic cut, important fact appears' },
  { id: 'impact-boom', name: 'Impact Boom', category: 'Impact', seconds: 0.75, leadSeconds: 0, usage: 'shocking moment, explosion, big number' },
  { id: 'heavy-thud', name: 'Heavy Thud', category: 'Impact', seconds: 0.3, leadSeconds: 0, usage: 'text slams onto screen' },
  { id: 'metal-hit', name: 'Metal Hit', category: 'Impact', seconds: 0.8, leadSeconds: 0, usage: 'industrial, war, weapons, machines' },
  { id: 'sub-bass', name: 'Sub Bass Drop', category: 'Impact', seconds: 0.6, leadSeconds: 0, usage: 'deep tension drop, ominous moment' },
  { id: 'pop', name: 'Pop', category: 'UI & Pop', seconds: 0.15, leadSeconds: 0, usage: 'text or sticker pops in, light and playful' },
  { id: 'ding', name: 'Ding', category: 'UI & Pop', seconds: 0.6, leadSeconds: 0, usage: 'correct answer, tip, positive fact' },
  { id: 'sparkle-chime', name: 'Sparkle Chime', category: 'UI & Pop', seconds: 0.55, leadSeconds: 0, usage: 'magic, discovery, beautiful reveal' },
  { id: 'mouse-click', name: 'Mouse Click', category: 'UI & Pop', seconds: 0.07, leadSeconds: 0, usage: 'UI, websites, tutorials' },
  { id: 'hud-beep', name: 'HUD Beep', category: 'UI & Pop', seconds: 0.12, leadSeconds: 0, usage: 'sci-fi interface, data, stats' },
  { id: 'keyboard-fast', name: 'Keyboard Typing', category: 'UI & Pop', seconds: 0.24, leadSeconds: 0, usage: 'typing, coding, messages' },
  { id: 'typewriter', name: 'Typewriter', category: 'UI & Pop', seconds: 0.16, leadSeconds: 0, usage: 'typewriter text, old documents, dates' },
  { id: 'heartbeat', name: 'Heartbeat', category: 'Mood', seconds: 0.9, leadSeconds: 0, usage: 'suspense, fear, danger' },
  { id: 'clock-ticking', name: 'Clock Tick', category: 'Mood', seconds: 0.12, leadSeconds: 0, usage: 'deadline, time pressure, history dates' },
  { id: 'downer', name: 'Downer', category: 'Mood', seconds: 1.1, leadSeconds: 0, usage: 'failure, sad or bad news' },
  { id: 'record-scratch', name: 'Record Scratch', category: 'Retro', seconds: 0.35, leadSeconds: 0, usage: 'comedic stop, plot twist, "wait what?"' },
  { id: 'projector', name: 'Film Projector', category: 'Retro', seconds: 0.5, leadSeconds: 0, usage: 'old footage, history, archives' },
  { id: 'camera-flash', name: 'Camera Flash', category: 'Foley', seconds: 0.5, leadSeconds: 0, usage: 'photo, flash transitions, paparazzi' },
  { id: 'camera-shutter', name: 'Camera Shutter', category: 'Foley', seconds: 0.28, leadSeconds: 0, usage: 'photo freeze frame, evidence' },
  { id: 'cash-register', name: 'Cash Register', category: 'Foley', seconds: 0.5, leadSeconds: 0, usage: 'money, prices, profit, sales' },
  { id: 'paper-turn', name: 'Paper Turn', category: 'Foley', seconds: 0.32, leadSeconds: 0.05, usage: 'new chapter, documents, books' },
];

export const SFX_IDS = SFX_LIBRARY.map((s) => s.id);

export const getSfx = (id?: string | null) => SFX_LIBRARY.find((s) => s.id === id);

export const sfxSrc = (id: string) => `builtin:sfx/${id}.wav`;
