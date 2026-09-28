import { staticFile } from 'remotion';

/**
 * Built-in assets (e.g. sound effects in public/sfx) are stored in clips as
 * "builtin:<path inside public>". The editor preview loads them relative to the
 * page (works for the Vite dev server and for the packaged file:// build), while
 * the Remotion render bundle serves the public folder through staticFile().
 */
export const resolveSrc = (src: string | undefined, isRendering: boolean): string | undefined => {
  if (!src || !src.startsWith('builtin:')) return src;
  const path = src.slice('builtin:'.length);
  return isRendering ? staticFile(path) : `./${path}`;
};
