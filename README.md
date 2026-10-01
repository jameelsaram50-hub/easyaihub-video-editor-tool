# Remotion Video Editor Pro (Desktop Application)

A fully fledged, professional-grade desktop video editor powered by **[Remotion](https://www.remotion.dev/)**, **Electron**, and **React**.

---

## 🌟 Professional Features

### 1. In-App Native MP4 Rendering
- Direct background rendering powered by `@remotion/bundler` and `@remotion/renderer`.
- Native file save dialog to choose export destination (`.mp4`, `.webm`, `.mov` ProRes).
- Real-time progress bar with current frames, encoding percentage, and stage status (Bundling -> Rendering -> Encoding -> Muxing).
- "Open Folder" button after rendering completes.

### 2. Direct On-Canvas Gizmo & Dragging
- Select any element on the preview canvas to reveal an interactive visual bounding box.
- Click and drag anywhere inside the gizmo to freely reposition titles, stickers, badges, or videos with instant coordinate feedback.

### 3. Word-by-Word Viral Karaoke Captions
- Dedicated caption engine that highlights spoken words synchronously across frames.
- Customized for modern vertical reels, TikToks, and YouTube Shorts.

### 4. Remotion Animation & Transition Engine
- **In & Out Transitions**: Smooth Fade, Wipe Left, Wipe Right, Wipe Up, Slide In, and Slide Out.
- **Physics Springs & Keyframe Motion**: Pop-in with damping/stiffness, Bouncy Spring, Neon Glow, Typewriter effect, Slow Zooms, Pulse.

### 5. Color Grading & Cinematic LUT Presets
- Cinematic Teal & Orange
- Vintage 35mm Film
- Cyberpunk Neon Glow
- Vibrant HDR Pop
- Dramatic Black & White (Noir)
- Golden Hour Sunset

### 6. Multi-Track Timeline & Audio Envelopes
- Multi-layer stacked tracks with individual **Track Lock** and **Visibility (Eye/Mute)** toggles.
- Left and right trim handles for trimming clips.
- Scissors tool to split clips at the exact playhead position (`S` shortcut).
- Duplicate and delete clips (`Delete` / `Backspace`).
- Audio volume sliders with configurable **Fade In** and **Fade Out** frame envelopes.

### 7. Undo / Redo & Keyboard Shortcuts
- `Ctrl + Z` / `Cmd + Z`: Undo timeline changes
- `Ctrl + Y` / `Ctrl + Shift + Z`: Redo changes
- `Space`: Play / Pause playback
- `S`: Split selected clip at playhead
- `Del` / `Backspace`: Remove selected clip

---

## 🤖 AI Auto Edit (one-click videos from the pipeline)

**AI Auto Edit** (header button) turns a finished *Easy AI Hub* pipeline job into a fully edited timeline:

1. Pick a job — jobs are read from `%APPDATA%\easy-ai-hub\jobs\<job_id>` (or legacy folder), (`final_table.json`, `audio.mp3`, `subtitles.srt`, `images/`), or browse to any job folder.
2. Pick a video style — Simple, Documentary, Cinematic, Dynamic, Shorts, Mystery, Retro VHS, Kids.
3. Optionally let ChatGPT edit: it reads the script and picks per-scene camera motion, transition, color grade, sound effect, highlight words and short on-screen text. Add the OpenAI API key under ⚙ Settings (stored encrypted with Windows secure storage, only used in the main process). Without a key the style rules produce the edit.

Everything stays editable afterwards. The left panel has template libraries for **Styles, Captions (14), Titles & lower thirds (11), Transitions (21), Effects & color grades, Camera motion (10) and SFX (26)**.

| Code | What it does |
|---|---|
| `src/templates/*` | Template libraries (captions, titles, transitions, motion, effects, sfx, video styles) |
| `src/automation/buildFromPipeline.ts` | Pipeline job + style + AI plan → timeline |
| `src/automation/aiPlan.ts` | Builds the AI request and validates the answer against real template ids |
| `electron/pipeline-import.js` | Reads pipeline jobs from disk |
| `electron/ai-editor.js` | OpenAI call with a strict JSON schema |
| `electron/settings-store.js` | Encrypted API key + model setting |

Auto-built projects use a fixed track layout: 0 music, 1 voiceover, 2 SFX, 3–4 scenes (alternating so transitions can overlap), 5 titles/overlays, 6 captions.

## 🛠️ Running the Desktop App

```bash
npm run dev
```

To build a standalone production installer (`.exe` on Windows):
```bash
npm run build
```

The build runs three steps:
1. `build:vite` – builds the editor UI into `dist/`.
2. `build:remotion` – prebuilds the Remotion composition into `remotion-bundle/` and downloads Chrome Headless Shell into `node_modules/.remotion/` (needs internet the first time).
3. `build:electron` – packages everything; both folders above are shipped as `extraResources`, so the installed app can render without `src/` or webpack.

`asar` is disabled because Remotion launches FFmpeg and the headless browser as child processes, and those can't run from inside an asar archive.

## How media is loaded

Imported files are streamed by a small localhost-only HTTP server in the main process (`electron/media-server.js`) with a random per-launch token. Both the editor preview and Remotion's render browser load media from it, so `webSecurity` stays on. Projects store each file's absolute path (`filePath`); the playable URL is rebuilt when a project is opened.
