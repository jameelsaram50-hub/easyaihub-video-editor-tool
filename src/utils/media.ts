// Reads the real length of a video/audio file so a clip isn't longer than its media
export const getMediaDurationInFrames = (
  url: string,
  type: 'video' | 'audio',
  fps: number
): Promise<number | null> =>
  new Promise((resolve) => {
    const el = document.createElement(type);
    el.preload = 'metadata';
    let settled = false;
    const done = (value: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      el.removeAttribute('src');
      el.load();
      resolve(value);
    };
    // Don't hang forever on files the browser can't read
    const timer = setTimeout(() => done(null), 15000);
    el.onloadedmetadata = () =>
      done(Number.isFinite(el.duration) && el.duration > 0 ? Math.max(1, Math.floor(el.duration * fps)) : null);
    el.onerror = () => done(null);
    el.src = url;
  });

export const getElectronAPI = (): any => (window as any).electronAPI ?? null;
