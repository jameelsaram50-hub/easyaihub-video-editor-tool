import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PlayerRef } from '@remotion/player';
import { Header } from './components/Header';
import { MediaLibrary } from './components/MediaLibrary';
import { CanvasPreview } from './components/CanvasPreview';
import { PropertiesPanel } from './components/PropertiesPanel';
import { Timeline } from './components/Timeline';
import { RenderModal } from './components/RenderModal';
import { AutoEditModal } from './components/AutoEditModal';
import { SettingsModal } from './components/SettingsModal';
import {
  CompositionSettings,
  TimelineClip,
  AssetTemplate,
  ProjectState,
} from './types/project';
import { BuildResult, AUTO_TRACKS, AUTO_TRACK_COUNT } from './automation/buildFromPipeline';
import { applyStyleToClips } from './automation/applyStyle';
import { getVideoStyle } from './templates/styles';
import { getMediaDurationInFrames } from './utils/media';

const INITIAL_SETTINGS: CompositionSettings = {
  id: 'main-comp',
  title: 'YouTube Long Video (16:9)',
  fps: 30,
  durationInFrames: 240, // 8 seconds
  width: 1920,
  height: 1080,
  backgroundColor: '#090a10',
};

let clipIdCounter = 0;
const newClipId = () => `clip-${Date.now()}-${++clipIdCounter}`;

const isSceneClip = (c: TimelineClip) =>
  c.role === 'scene' || ((c.type === 'image' || c.type === 'video') && !!c.fitToFrame);

const INITIAL_CLIPS: TimelineClip[] = [
  {
    id: 'clip-1',
    name: 'Hero Title',
    type: 'text',
    startFrame: 10,
    durationInFrames: 110,
    trackIndex: 2,
    content: 'YOUTUBE LONG VIDEO STUDIO',
    fontSize: 76,
    fontWeight: '800',
    color: '#ffffff',
    animation: 'pop-in',
    inTransition: 'fade',
    outTransition: 'fade',
    x: 0,
    y: -80,
  },
  {
    id: 'clip-2',
    name: 'YouTube Captions',
    type: 'caption',
    startFrame: 35,
    durationInFrames: 95,
    trackIndex: 3,
    content: 'CLEAR HIGH CONTRAST CAPTIONS SIZED FOR 16:9',
    fontSize: 42,
    fontWeight: '900',
    animation: 'karaoke',
    x: 0,
    y: 120,
  },
  {
    id: 'clip-3',
    name: 'Featured Badge',
    type: 'shape',
    startFrame: 120,
    durationInFrames: 100,
    trackIndex: 2,
    content: '⚡ NATIVE 1080P MP4 EXPORT',
    fontSize: 26,
    color: '#ffffff',
    backgroundColor: '#dc2626',
    borderRadius: 30,
    animation: 'bounce',
    inTransition: 'slide',
    x: 0,
    y: 350,
  },
];

export const App: React.FC = () => {
  const [settings, setSettings] = useState<CompositionSettings>(INITIAL_SETTINGS);
  const [clips, setClips] = useState<TimelineClip[]>(INITIAL_CLIPS);
  const [selectedClipId, setSelectedClipId] = useState<string | null>('clip-1');
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isRenderModalOpen, setIsRenderModalOpen] = useState<boolean>(false);
  const [isAutoEditOpen, setIsAutoEditOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settingsVersion, setSettingsVersion] = useState<number>(0);

  // Undo / Redo history stacks (refs so undo/redo read them synchronously;
  // the version counter re-renders the Undo/Redo buttons when they change)
  const historyRef = useRef<TimelineClip[][]>([]);
  const redoRef = useRef<TimelineClip[][]>([]);
  const [, bumpHistoryVersion] = useState(0);

  // Track count and status states
  const [tracksCount, setTracksCount] = useState<number>(4);
  const [lockedTracks, setLockedTracks] = useState<Record<number, boolean>>({});
  const [hiddenTracks, setHiddenTracks] = useState<Record<number, boolean>>({});

  // Resizable Panels & Splitters state (Gutter / Splitter Dragging)
  const [leftSidebarWidth, setLeftSidebarWidth] = useState<number>(270);
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(330);
  const [timelineHeight, setTimelineHeight] = useState<number>(280);
  const [activeResizer, setActiveResizer] = useState<'left' | 'right' | 'bottom' | null>(null);

  // Global mouse handlers for resizable panel splitters
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!activeResizer) return;

      if (activeResizer === 'left') {
        const newWidth = Math.max(160, Math.min(520, e.clientX));
        setLeftSidebarWidth(newWidth);
      } else if (activeResizer === 'right') {
        const newWidth = Math.max(220, Math.min(600, window.innerWidth - e.clientX));
        setRightPanelWidth(newWidth);
      } else if (activeResizer === 'bottom') {
        const newHeight = Math.max(180, Math.min(550, window.innerHeight - e.clientY));
        setTimelineHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setActiveResizer(null);
    };

    if (activeResizer) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor =
        activeResizer === 'bottom' ? 'row-resize' : 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [activeResizer]);

  const handleAddTrack = useCallback(() => {
    setTracksCount((prev) => Math.min(12, prev + 1));
  }, []);

  const handleRemoveTrack = useCallback(() => {
    setTracksCount((prev) => Math.max(2, prev - 1));
  }, []);

  const handleToggleTrackLock = useCallback((trackIndex: number) => {
    setLockedTracks((prev) => ({ ...prev, [trackIndex]: !prev[trackIndex] }));
  }, []);

  const handleToggleTrackVisibility = useCallback((trackIndex: number) => {
    setHiddenTracks((prev) => ({ ...prev, [trackIndex]: !prev[trackIndex] }));
  }, []);

  const playerRef = useRef<PlayerRef>(null);

  // Continuous edits (dragging, typing in the properties panel) are grouped into
  // one undo step: the clips as they were BEFORE the first change are remembered
  // here and pushed onto the history when the edit is committed.
  const clipsRef = useRef<TimelineClip[]>(clips);
  clipsRef.current = clips;
  const pendingSnapshotRef = useRef<TimelineClip[] | null>(null);
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commitHistorySnapshot = useCallback(() => {
    if (commitTimerRef.current) {
      clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
    const snapshot = pendingSnapshotRef.current;
    pendingSnapshotRef.current = null;
    if (!snapshot || snapshot === clipsRef.current) return;
    historyRef.current = [...historyRef.current.slice(-30), snapshot];
    redoRef.current = [];
    bumpHistoryVersion((v) => v + 1);
  }, []);

  // Push history snapshot before mutating clips
  const pushHistory = useCallback(
    (newClips: TimelineClip[]) => {
      commitHistorySnapshot();
      historyRef.current = [...historyRef.current.slice(-30), clipsRef.current];
      redoRef.current = [];
      bumpHistoryVersion((v) => v + 1);
      setClips(newClips);
    },
    [commitHistorySnapshot]
  );

  const handleUndo = useCallback(() => {
    commitHistorySnapshot();
    if (historyRef.current.length === 0) return;
    const previous = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    redoRef.current = [clipsRef.current, ...redoRef.current];
    bumpHistoryVersion((v) => v + 1);
    setClips(previous);
  }, [commitHistorySnapshot]);

  const handleRedo = useCallback(() => {
    commitHistorySnapshot();
    if (redoRef.current.length === 0) return;
    const next = redoRef.current[0];
    redoRef.current = redoRef.current.slice(1);
    historyRef.current = [...historyRef.current, clipsRef.current];
    bumpHistoryVersion((v) => v + 1);
    setClips(next);
  }, [commitHistorySnapshot]);

  const resetHistory = useCallback(() => {
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    commitTimerRef.current = null;
    pendingSnapshotRef.current = null;
    historyRef.current = [];
    redoRef.current = [];
    bumpHistoryVersion((v) => v + 1);
  }, []);

  // Sync Remotion Player current frame changes
  // NOTE: playerRef is a stable ref object — we intentionally use an empty dep array
  // and attach/detach listeners only once on mount/unmount.
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const onFrame = (e: { detail: { frame: number } }) => {
      setCurrentFrame(e.detail.frame);
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    player.addEventListener('frameupdate', onFrame);
    player.addEventListener('play', onPlay);
    player.addEventListener('pause', onPause);

    return () => {
      player.removeEventListener('frameupdate', onFrame);
      player.removeEventListener('play', onPlay);
      player.removeEventListener('pause', onPause);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global Keyboard shortcuts (Space = Play/Pause, Ctrl+Z = Undo, Ctrl+Y = Redo, Del = Delete, S = Split)
  const handleTogglePlay = useCallback(() => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pause();
    } else {
      playerRef.current.play();
    }
  }, [isPlaying]);

  const handleDeleteClip = useCallback((id: string) => {
    pushHistory(clips.filter((c) => c.id !== id));
    if (selectedClipId === id) setSelectedClipId(null);
  }, [clips, pushHistory, selectedClipId]);

  const handleSplitClip = useCallback((id: string, splitFrame: number) => {
    const clip = clips.find((c) => c.id === id);
    if (!clip) return;

    if (splitFrame <= clip.startFrame || splitFrame >= clip.startFrame + clip.durationInFrames) {
      return;
    }

    const firstDuration = splitFrame - clip.startFrame;
    const secondDuration = clip.durationInFrames - firstDuration;

    const updatedFirst: TimelineClip = {
      ...clip,
      durationInFrames: firstDuration,
    };

    const secondPart: TimelineClip = {
      ...clip,
      id: newClipId(),
      name: `${clip.name} (Part 2)`,
      startFrame: splitFrame,
      durationInFrames: secondDuration,
      // The second half continues the media where the first half stopped
      mediaStartFrame: (clip.mediaStartFrame ?? 0) + firstDuration,
    };

    pushHistory([
      ...clips.map((c) => (c.id === id ? updatedFirst : c)),
      secondPart,
    ]);
  }, [clips, pushHistory]);

  const handleDuplicateClip = useCallback((id: string) => {
    const target = clips.find((c) => c.id === id);
    if (!target) return;

    const duplicated: TimelineClip = {
      ...target,
      id: newClipId(),
      name: `${target.name} Copy`,
      startFrame: target.startFrame + 15,
    };
    pushHistory([...clips, duplicated]);
    setSelectedClipId(duplicated.id);
  }, [clips, pushHistory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClipId) {
          e.preventDefault();
          handleDeleteClip(selectedClipId);
        }
      } else if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey) {
        if (selectedClipId) {
          e.preventDefault();
          handleSplitClip(selectedClipId, currentFrame);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        if (selectedClipId) {
          e.preventDefault();
          handleDuplicateClip(selectedClipId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipId, currentFrame, handleUndo, handleRedo, handleTogglePlay, handleDeleteClip, handleSplitClip, handleDuplicateClip]);

  const handleSeek = (frame: number) => {
    setCurrentFrame(frame);
    if (playerRef.current) {
      playerRef.current.seekTo(frame);
    }
  };

  const handleUpdateSettings = (newSettings: Partial<CompositionSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  // Clip manipulation with history snapshots. Drags commit on mouse-up; other
  // edits (e.g. the properties panel) commit after a short pause in typing.
  const handleUpdateClip = (id: string, updates: Partial<TimelineClip>) => {
    if (!pendingSnapshotRef.current) {
      pendingSnapshotRef.current = clipsRef.current;
    }
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    commitTimerRef.current = setTimeout(commitHistorySnapshot, 600);

    setClips((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  // Make sure the video is long enough to hold a clip that was just added
  const ensureDurationFits = (clip: TimelineClip) => {
    const end = clip.startFrame + clip.durationInFrames;
    setSettings((prev) => (end > prev.durationInFrames ? { ...prev, durationInFrames: end } : prev));
  };

  // Add Clips calibrated for YouTube Long Video (1920x1080)
  const handleAddTextClip = () => {
    const newClip: TimelineClip = {
      id: newClipId(),
      name: 'Text Title',
      type: 'text',
      content: 'YOUR YOUTUBE VIDEO TITLE',
      startFrame: currentFrame,
      durationInFrames: 90,
      trackIndex: 2,
      fontSize: 68,
      fontWeight: '800',
      color: '#ffffff',
      animation: 'pop-in',
      inTransition: 'fade',
      x: 0,
      y: -60,
    };
    pushHistory([...clips, newClip]);
    ensureDurationFits(newClip);
    setSelectedClipId(newClip.id);
  };

  const handleAddCaptionClip = () => {
    const newClip: TimelineClip = {
      id: newClipId(),
      name: 'YouTube Captions',
      type: 'caption',
      content: 'CLEAR HIGH CONTRAST CAPTIONS SIZED FOR 16:9 VIDEO',
      startFrame: currentFrame,
      durationInFrames: 90,
      trackIndex: 3,
      fontSize: 44,
      fontWeight: '900',
      animation: 'karaoke',
      inTransition: 'fade',
      x: 0,
      y: 260,
    };
    pushHistory([...clips, newClip]);
    ensureDurationFits(newClip);
    setSelectedClipId(newClip.id);
  };

  const handleAddShapeClip = () => {
    const newClip: TimelineClip = {
      id: newClipId(),
      name: 'Badge / Lower-Third',
      type: 'shape',
      content: '⚡ SUBSCRIBE TO MY CHANNEL',
      startFrame: currentFrame,
      durationInFrames: 90,
      trackIndex: 1,
      fontSize: 26,
      color: '#ffffff',
      backgroundColor: '#e11d48',
      borderRadius: 20,
      animation: 'slide-up',
      inTransition: 'slide',
      x: 0,
      y: 380,
    };
    pushHistory([...clips, newClip]);
    ensureDurationFits(newClip);
    setSelectedClipId(newClip.id);
  };

  const handleAddPreset = (template: AssetTemplate) => {
    const newClip: TimelineClip = {
      // Spread template FIRST so our explicit values always win
      ...template.clip,
      id: newClipId(),
      name: template.name,
      type: template.clip.type ?? 'text',
      // Always place at currentFrame, not the template's baked-in start
      startFrame: currentFrame,
      durationInFrames: template.clip.durationInFrames ?? 90,
      trackIndex: template.clip.trackIndex ?? 2,
    };
    pushHistory([...clips, newClip]);
    ensureDurationFits(newClip);
    setSelectedClipId(newClip.id);
  };

  const addMediaClip = async (
    name: string,
    type: TimelineClip['type'],
    src: string,
    filePath?: string
  ) => {
    // Video/audio clips default to the real media length; images get 4 seconds
    let durationInFrames = settings.fps * 4;
    if (type === 'video' || type === 'audio') {
      durationInFrames =
        (await getMediaDurationInFrames(src, type, settings.fps)) ?? durationInFrames;
    }

    const newClip: TimelineClip = {
      id: newClipId(),
      name,
      type,
      src,
      filePath,
      mediaStartFrame: 0,
      startFrame: currentFrame,
      durationInFrames,
      trackIndex: type === 'audio' ? 0 : 1,
      animation: 'fade-in',
      inTransition: 'fade',
      x: 0,
      y: 0,
      width: settings.width,
      height: settings.height,
      objectFit: 'cover',
    };
    pushHistory([...clipsRef.current, newClip]);
    ensureDurationFits(newClip);
    setSelectedClipId(newClip.id);
  };

  const handleImportMedia = async () => {
    const electron = (window as any).electronAPI;
    if (electron?.openFile) {
      const result = await electron.openFile();
      if (result) {
        let type: TimelineClip['type'] = 'image';
        if (['.mp4', '.mov', '.webm', '.m4v', '.mkv'].includes(result.ext)) type = 'video';
        if (['.mp3', '.wav', '.aac', '.m4a', '.ogg'].includes(result.ext)) type = 'audio';
        await addMediaClip(result.fileName, type, result.url, result.filePath);
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'video/*,image/*,audio/*';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        let type: TimelineClip['type'] = 'image';
        if (file.type.startsWith('video/')) type = 'video';
        if (file.type.startsWith('audio/')) type = 'audio';
        // NOTE: Object URLs only live for this browser session and are not
        // restored when a saved project is reopened. The desktop app uses file paths.
        addMediaClip(file.name, type, URL.createObjectURL(file));
      };
      input.click();
    }
  };

  // Rebuild playable media URLs for a loaded project (URLs from an earlier
  // app session contain a different local port/token)
  const restoreMediaSources = async (loadedClips: TimelineClip[]): Promise<TimelineClip[]> => {
    const electron = (window as any).electronAPI;
    if (!electron?.getMediaUrl) return loadedClips;

    return Promise.all(
      loadedClips.map(async (clip) => {
        let filePath = clip.filePath;
        // Projects saved by older versions stored file:// URLs instead of paths
        if (!filePath && clip.src?.startsWith('file://')) {
          filePath = decodeURIComponent(clip.src.replace(/^file:\/+/, ''));
        }
        if (!filePath) return clip;
        const src = await electron.getMediaUrl(filePath);
        return src ? { ...clip, filePath, src } : clip;
      })
    );
  };

  const applyLoadedProject = async (data: Partial<ProjectState>) => {
    if (!data || !Array.isArray(data.clips)) return;
    const loadedClips = await restoreMediaSources(data.clips);
    if (data.settings) setSettings({ ...INITIAL_SETTINGS, ...data.settings });
    setClips(loadedClips);
    resetHistory();
    setSelectedClipId(null);
    setLockedTracks({});
    setHiddenTracks({});
    const highestTrack = loadedClips.reduce((max, c) => Math.max(max, c.trackIndex), 0);
    setTracksCount(Math.min(12, Math.max(4, highestTrack + 1)));
    handleSeek(0);
  };

  // Project persistence
  const handleSaveProject = async () => {
    const projectState: ProjectState = {
      version: '1.0.0',
      settings,
      clips,
    };

    const electron = (window as any).electronAPI;
    if (electron?.saveProject) {
      await electron.saveProject({
        data: projectState,
        defaultName: `${settings.title.toLowerCase().replace(/\s+/g, '-')}.remotion.json`,
      });
    } else {
      const blob = new Blob([JSON.stringify(projectState, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${settings.title.toLowerCase().replace(/\s+/g, '-')}.remotion.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleLoadProject = async () => {
    const electron = (window as any).electronAPI;
    if (electron?.loadProject) {
      const result = await electron.loadProject();
      if (result?.success && result.data) {
        await applyLoadedProject(result.data);
      } else if (result && !result.success) {
        alert(`Could not open project: ${result.error}`);
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            try {
              const data = JSON.parse(evt.target?.result as string);
              applyLoadedProject(data);
            } catch (err) {
              console.error('Failed to parse project file', err);
            }
          };
          reader.readAsText(file);
        }
      };
      input.click();
    }
  };

  // ---- AI Auto Edit & template library actions ----

  const handleApplyAutoEdit = (result: BuildResult) => {
    setSettings(result.settings);
    setClips(result.clips);
    resetHistory();
    setTracksCount(result.tracksCount);
    setLockedTracks({});
    setHiddenTracks({});
    setSelectedClipId(null);
    handleSeek(0);
  };

  // Auto-built projects use a fixed track layout; otherwise pick sensible tracks
  const isAutoLayout = tracksCount >= AUTO_TRACK_COUNT;
  const libraryTrack = (kind: 'overlay' | 'sfx' | 'caption') => {
    if (kind === 'sfx') return isAutoLayout ? AUTO_TRACKS.sfx : 0;
    if (kind === 'caption') return isAutoLayout ? AUTO_TRACKS.captions : tracksCount - 1;
    return isAutoLayout ? AUTO_TRACKS.overlay : Math.min(tracksCount - 1, 2);
  };

  const handleAddLibraryClip = (
    partial: Partial<TimelineClip> & Pick<TimelineClip, 'type' | 'name'>,
    kind: 'overlay' | 'sfx' | 'caption'
  ) => {
    const newClip: TimelineClip = {
      durationInFrames: settings.fps * 3,
      ...partial,
      id: newClipId(),
      startFrame: currentFrame,
      trackIndex: libraryTrack(kind),
    };
    pushHistory([...clipsRef.current, newClip]);
    ensureDurationFits(newClip);
    setSelectedClipId(newClip.id);
  };

  const handleUpdateAllCaptions = (updates: Partial<TimelineClip>) => {
    pushHistory(clipsRef.current.map((c) => (c.type === 'caption' ? { ...c, ...updates } : c)));
  };

  const handleUpdateAllScenes = (updates: Partial<TimelineClip>) => {
    const current = clipsRef.current;
    const hasScenes = current.some(isSceneClip);
    pushHistory(
      current.map((c) =>
        (hasScenes ? isSceneClip(c) : c.type === 'image' || c.type === 'video') ? { ...c, ...updates } : c
      )
    );
  };

  const handleApplyStyle = (styleId: string) => {
    pushHistory(applyStyleToClips(clipsRef.current, getVideoStyle(styleId)));
  };

  const selectedClip = clips.find((c) => c.id === selectedClipId) || null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        backgroundColor: 'var(--bg-primary)',
        overflow: 'hidden',
      }}
    >
      {/* Header Bar */}
      <Header
        settings={settings}
        canUndo={historyRef.current.length > 0 || pendingSnapshotRef.current !== null}
        canRedo={redoRef.current.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onUpdateSettings={handleUpdateSettings}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
        onExport={() => setIsRenderModalOpen(true)}
        onAddTextClip={handleAddTextClip}
        onAddCaptionClip={handleAddCaptionClip}
        onAddMediaClip={handleImportMedia}
        onAddShapeClip={handleAddShapeClip}
        onAutoEdit={() => setIsAutoEditOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Workspace with Resizable Splitters */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
        <MediaLibrary
          width={leftSidebarWidth}
          onAddPreset={handleAddPreset}
          onImportCustomMedia={handleImportMedia}
          onAddCaptionTrack={handleAddCaptionClip}
          selectedClip={selectedClip}
          hasCaptions={clips.some((c) => c.type === 'caption')}
          compWidth={settings.width}
          compHeight={settings.height}
          fps={settings.fps}
          onUpdateSelected={(updates) => {
            if (selectedClipId) handleUpdateClip(selectedClipId, updates);
          }}
          onUpdateAllCaptions={handleUpdateAllCaptions}
          onUpdateAllScenes={handleUpdateAllScenes}
          onAddClip={handleAddLibraryClip}
          onApplyStyle={handleApplyStyle}
        />

        {/* Left Splitter / Resizer Gutter */}
        <div
          className={`resizer-x ${activeResizer === 'left' ? 'resizing' : ''}`}
          onMouseDown={() => setActiveResizer('left')}
          title="Drag to resize Media Library (Splitter)"
        />

        <CanvasPreview
          settings={settings}
          clips={clips}
          hiddenTracks={hiddenTracks}
          currentFrame={currentFrame}
          isPlaying={isPlaying}
          selectedClipId={selectedClipId}
          onSelectClip={setSelectedClipId}
          onUpdateClip={handleUpdateClip}
          onCommitHistory={commitHistorySnapshot}
          onFrameUpdate={setCurrentFrame}
          onPlayPauseToggle={handleTogglePlay}
          playerRef={playerRef}
        />

        {/* Right Splitter / Resizer Gutter */}
        <div
          className={`resizer-x ${activeResizer === 'right' ? 'resizing' : ''}`}
          onMouseDown={() => setActiveResizer('right')}
          title="Drag to resize Properties Panel (Splitter)"
        />

        <PropertiesPanel
          width={rightPanelWidth}
          clip={selectedClip}
          tracksCount={tracksCount}
          onUpdateClip={(updates) => {
            if (selectedClipId) handleUpdateClip(selectedClipId, updates);
          }}
          onDeleteClip={() => {
            if (selectedClipId) handleDeleteClip(selectedClipId);
          }}
        />
      </div>

      {/* Horizontal Splitter / Resizer Gutter above Timeline */}
      <div
        className={`resizer-y ${activeResizer === 'bottom' ? 'resizing' : ''}`}
        onMouseDown={() => setActiveResizer('bottom')}
        title="Drag up/down to resize Timeline tracks height"
      />

      {/* Interactive Pro Timeline */}
      <Timeline
        height={timelineHeight}
        clips={clips}
        currentFrame={currentFrame}
        durationInFrames={settings.durationInFrames}
        fps={settings.fps}
        selectedClipId={selectedClipId}
        lockedTracks={lockedTracks}
        hiddenTracks={hiddenTracks}
        tracksCount={tracksCount}
        onAddTrack={handleAddTrack}
        onRemoveTrack={handleRemoveTrack}
        onToggleTrackLock={handleToggleTrackLock}
        onToggleTrackVisibility={handleToggleTrackVisibility}
        onSelectClip={setSelectedClipId}
        onUpdateClip={handleUpdateClip}
        onCommitHistory={commitHistorySnapshot}
        onDeleteClip={handleDeleteClip}
        onDuplicateClip={handleDuplicateClip}
        onSplitClip={handleSplitClip}
        onSeek={handleSeek}
      />

      {/* Render & In-App MP4 Export Modal */}
      {isRenderModalOpen && (
        <RenderModal
          settings={settings}
          clips={clips}
          hiddenTracks={hiddenTracks}
          onClose={() => setIsRenderModalOpen(false)}
        />
      )}

      {isAutoEditOpen && (
        <AutoEditModal
          onClose={() => setIsAutoEditOpen(false)}
          onApply={handleApplyAutoEdit}
          onOpenSettings={() => setIsSettingsOpen(true)}
          settingsVersion={settingsVersion}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          onSaved={() => setSettingsVersion((v) => v + 1)}
        />
      )}
    </div>
  );
};

export default App;
