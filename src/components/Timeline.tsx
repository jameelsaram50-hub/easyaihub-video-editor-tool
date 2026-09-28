import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Scissors,
  Trash2,
  Copy,
  Plus,
  Volume2,
  Eye,
  EyeOff,
  Type,
  Video,
  Music,
  Image as ImageIcon,
  Square,
  ZoomIn,
  ZoomOut,
  Subtitles,
  Lock,
  Unlock,
  Layers,
  Minus,
} from 'lucide-react';
import { TimelineClip, TrackType } from '../types/project';

interface TimelineProps {
  clips: TimelineClip[];
  currentFrame: number;
  durationInFrames: number;
  fps: number;
  selectedClipId: string | null;
  lockedTracks: Record<number, boolean>;
  hiddenTracks: Record<number, boolean>;
  onToggleTrackLock: (trackIndex: number) => void;
  onToggleTrackVisibility: (trackIndex: number) => void;
  onSelectClip: (id: string | null) => void;
  onUpdateClip: (id: string, updates: Partial<TimelineClip>) => void;
  onCommitHistory?: () => void;
  onDeleteClip: (id: string) => void;
  onDuplicateClip: (id: string) => void;
  onSplitClip: (id: string, splitFrame: number) => void;
  height?: number;
  tracksCount?: number;
  onAddTrack?: () => void;
  onRemoveTrack?: () => void;
  onSeek: (frame: number) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  clips,
  currentFrame,
  durationInFrames,
  fps,
  selectedClipId,
  lockedTracks,
  hiddenTracks,
  height,
  tracksCount = 4,
  onAddTrack,
  onRemoveTrack,
  onToggleTrackLock,
  onToggleTrackVisibility,
  onSelectClip,
  onUpdateClip,
  onCommitHistory,
  onDeleteClip,
  onDuplicateClip,
  onSplitClip,
  onSeek,
}) => {
  const [zoom, setZoom] = useState<number>(3); // pixels per frame
  const timelineContentRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const [draggedClip, setDraggedClip] = useState<{
    id: string;
    startX: number;
    startY: number;
    initialStartFrame: number;
    mode: 'move' | 'trim-left' | 'trim-right';
    initialDuration: number;
    initialTrackIndex: number;
    initialMediaStart: number;
    isMedia: boolean;
  } | null>(null);


  // Track icons & color accents
  const getTrackIcon = (type: TrackType) => {
    switch (type) {
      case 'video':
        return <Video size={13} color="var(--track-video)" />;
      case 'audio':
        return <Music size={13} color="var(--track-audio)" />;
      case 'text':
        return <Type size={13} color="var(--track-text)" />;
      case 'caption':
        return <Subtitles size={13} color="#facc15" />;
      case 'image':
        return <ImageIcon size={13} color="var(--track-image)" />;
      case 'shape':
        return <Square size={13} color="var(--track-shape)" />;
    }
  };

  const getTrackColor = (type: TrackType) => {
    switch (type) {
      case 'video':
        return 'var(--track-video)';
      case 'audio':
        return 'var(--track-audio)';
      case 'text':
        return 'var(--track-text)';
      case 'caption':
        return '#facc15';
      case 'image':
        return 'var(--track-image)';
      case 'shape':
        return 'var(--track-shape)';
    }
  };

  // Convert pixel offset to frame
  const getFrameFromX = (clientX: number): number => {
    if (!timelineContentRef.current) return 0;
    const rect = timelineContentRef.current.getBoundingClientRect();
    const scrollLeft = timelineContentRef.current.scrollLeft;
    const x = clientX - rect.left + scrollLeft;
    const frame = Math.round(x / zoom);
    return Math.max(0, Math.min(durationInFrames - 1, frame));
  };

  // Handle timeline ruler scrub click
  const handleRulerMouseDown = (e: React.MouseEvent) => {
    setIsScrubbing(true);
    const frame = getFrameFromX(e.clientX);
    onSeek(frame);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isScrubbing) {
        const frame = getFrameFromX(e.clientX);
        onSeek(frame);
      } else if (draggedClip) {
        const deltaX = e.clientX - draggedClip.startX;
        const deltaFrames = Math.round(deltaX / zoom);

        if (draggedClip.mode === 'move') {
          const maxStart = Math.max(0, durationInFrames - draggedClip.initialDuration);
          const newStart = Math.max(0, Math.min(maxStart, draggedClip.initialStartFrame + deltaFrames));
          const deltaY = e.clientY - draggedClip.startY;
          const trackDiff = Math.round(deltaY / 48);
          // Invert trackDiff because top track is rendered first
          const newTrack = Math.max(0, Math.min(tracksCount - 1, draggedClip.initialTrackIndex - trackDiff));

          onUpdateClip(draggedClip.id, {
            startFrame: newStart,
            trackIndex: newTrack,
          });
        } else if (draggedClip.mode === 'trim-right') {
          const maxAllowedDuration = Math.max(5, durationInFrames - draggedClip.initialStartFrame);
          const newDur = Math.max(5, Math.min(maxAllowedDuration, draggedClip.initialDuration + deltaFrames));
          onUpdateClip(draggedClip.id, { durationInFrames: newDur });
        } else if (draggedClip.mode === 'trim-left') {
          const maxStart = draggedClip.initialStartFrame + draggedClip.initialDuration - 5;
          // Video/audio can't be extended to the left past the beginning of the source file
          const minStart = draggedClip.isMedia
            ? Math.max(0, draggedClip.initialStartFrame - draggedClip.initialMediaStart)
            : 0;
          const possibleStart = Math.max(minStart, Math.min(maxStart, draggedClip.initialStartFrame + deltaFrames));
          const diff = possibleStart - draggedClip.initialStartFrame;
          const newDur = draggedClip.initialDuration - diff;
          if (newDur >= 5) {
            onUpdateClip(draggedClip.id, {
              startFrame: possibleStart,
              durationInFrames: newDur,
              // Trimming the left edge also skips that much of the source media
              ...(draggedClip.isMedia
                ? { mediaStartFrame: Math.max(0, draggedClip.initialMediaStart + diff) }
                : {}),
            });
          }
        }
      }
    };

    const handleMouseUp = () => {
      setIsScrubbing(false);
      if (draggedClip && onCommitHistory) {
        onCommitHistory();
      }
      setDraggedClip(null);
    };

    if (isScrubbing || draggedClip) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isScrubbing, draggedClip, zoom, tracksCount, durationInFrames, onSeek, onUpdateClip, onCommitHistory]);

  // Timeline ticks calculation — round up to ensure integer frame boundaries
  const totalWidth = Math.max(800, durationInFrames * zoom);
  const frameInterval = zoom > 4 ? Math.ceil(fps / 2) : zoom > 1 ? fps : fps * 2;
  const tickCount = Math.ceil(durationInFrames / frameInterval);

  const calculatedHeight = height ?? Math.min(420, Math.max(260, 64 + tracksCount * 48));

  return (
    <div
      style={{
        height: `${calculatedHeight}px`,
        minHeight: '180px',
        backgroundColor: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {/* Timeline Action Bar */}
      <div
        style={{
          height: '38px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          backgroundColor: 'rgba(18, 20, 28, 0.7)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn-icon"
            disabled={!selectedClipId}
            onClick={() => {
              if (selectedClipId) onSplitClip(selectedClipId, currentFrame);
            }}
            title="Split Clip at Playhead (S)"
            style={{ opacity: selectedClipId ? 1 : 0.4 }}
          >
            <Scissors size={15} />
          </button>

          <button
            className="btn-icon"
            disabled={!selectedClipId}
            onClick={() => {
              if (selectedClipId) onDuplicateClip(selectedClipId);
            }}
            title="Duplicate Clip"
            style={{ opacity: selectedClipId ? 1 : 0.4 }}
          >
            <Copy size={15} />
          </button>

          <button
            className="btn-icon"
            disabled={!selectedClipId}
            onClick={() => {
              if (selectedClipId) onDeleteClip(selectedClipId);
            }}
            title="Delete Selected Clip (Del)"
            style={{ opacity: selectedClipId ? 1 : 0.4, color: '#ef4444' }}
          >
            <Trash2 size={15} />
          </button>

          <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--border-color)', margin: '0 4px' }} />

          {/* Dynamic Track Management Buttons */}
          <button
            className="btn-secondary"
            style={{ padding: '3px 8px', fontSize: '11px', height: '26px' }}
            onClick={onAddTrack}
            title="Add New Layer / Track"
          >
            <Plus size={13} /> Add Track ({tracksCount})
          </button>

          {tracksCount > 2 && (
            <button
              className="btn-icon"
              style={{ width: '26px', height: '26px' }}
              onClick={onRemoveTrack}
              title="Remove Topmost Empty Track"
            >
              <Minus size={13} />
            </button>
          )}
        </div>

        {/* Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn-icon"
            onClick={() => setZoom((z) => Math.max(0.8, z - 0.6))}
            title="Zoom Out Timeline"
          >
            <ZoomOut size={15} />
          </button>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)', minWidth: '40px', textAlign: 'center' }}>
            {zoom.toFixed(1)}x
          </span>
          <button
            className="btn-icon"
            onClick={() => setZoom((z) => Math.min(10, z + 0.6))}
            title="Zoom In Timeline"
          >
            <ZoomIn size={15} />
          </button>
        </div>
      </div>

      {/* Main Track Workspace & Headers */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Track Headers Column */}
        <div
          style={{
            width: '160px',
            borderRight: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-tertiary)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10,
          }}
        >
          {/* Header Spacer for Ruler */}
          <div
            style={{
              height: '24px',
              borderBottom: '1px solid var(--border-color)',
              padding: '4px 10px',
              fontSize: '10px',
              color: 'var(--text-dim)',
              fontWeight: 700,
            }}
          >
            TRACKS / LAYERS
          </div>

          {/* Track Labels & Controls */}
          {Array.from({ length: tracksCount }).map((_, index) => {
            const trackNum = tracksCount - 1 - index;
            const isLocked = !!lockedTracks[trackNum];
            const isHidden = !!hiddenTracks[trackNum];

            return (
              <div
                key={trackNum}
                style={{
                  height: '48px',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: isHidden ? 'var(--text-dim)' : 'var(--text-muted)',
                }}
              >
                <span>Track {trackNum + 1}</span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    className="btn-icon"
                    style={{ width: '22px', height: '22px' }}
                    onClick={() => onToggleTrackVisibility(trackNum)}
                    title={isHidden ? 'Show Track' : 'Hide Track'}
                  >
                    {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>

                  <button
                    className="btn-icon"
                    style={{ width: '22px', height: '22px' }}
                    onClick={() => onToggleTrackLock(trackNum)}
                    title={isLocked ? 'Unlock Track' : 'Lock Track'}
                  >
                    {isLocked ? <Lock size={12} color="#f59e0b" /> : <Unlock size={12} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Scrollable Tracks Area & Ruler */}
        <div
          ref={timelineContentRef}
          style={{
            flex: 1,
            overflowX: 'auto',
            overflowY: 'hidden',
            position: 'relative',
          }}
          onClick={(e) => {
            if (e.target === timelineContentRef.current) {
              onSelectClip(null);
            }
          }}
        >
          <div style={{ width: `${totalWidth}px`, height: '100%', position: 'relative' }}>
            {/* Top Frame/Second Ruler */}
            <div
              onMouseDown={handleRulerMouseDown}
              style={{
                height: '24px',
                borderBottom: '1px solid var(--border-color)',
                backgroundColor: 'rgba(26, 29, 41, 0.95)',
                position: 'relative',
                cursor: 'pointer',
              }}
            >
              {Array.from({ length: tickCount }).map((_, i) => {
                const tickFrame = i * frameInterval;
                const leftPos = tickFrame * zoom;
                const secs = (tickFrame / fps).toFixed(1);
                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: `${leftPos}px`,
                      top: 0,
                      bottom: 0,
                      borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                      paddingLeft: '4px',
                      fontSize: '9px',
                      color: 'var(--text-dim)',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {secs}s
                  </div>
                );
              })}
            </div>

            {/* Track Lanes — clicking empty lane space deselects the clip */}
            {Array.from({ length: tracksCount }).map((_, index) => {
              const trackNum = tracksCount - 1 - index;
              return (
                <div
                  key={trackNum}
                  onClick={() => onSelectClip(null)}
                  style={{
                    height: '48px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    backgroundColor:
                      index % 2 === 0
                        ? 'rgba(255, 255, 255, 0.01)'
                        : 'transparent',
                    position: 'relative',
                  }}
                />
              );
            })}

            {/* Render Clips */}
            {clips.map((clip) => {
              const isSelected = clip.id === selectedClipId;
              const left = clip.startFrame * zoom;
              const width = Math.max(16, clip.durationInFrames * zoom);
              const trackPos = tracksCount - 1 - Math.min(tracksCount - 1, Math.max(0, clip.trackIndex));
              const top = 24 + trackPos * 48 + 4;
              const color = getTrackColor(clip.type);
              const isLocked = !!lockedTracks[clip.trackIndex];
              const isHidden = !!hiddenTracks[clip.trackIndex];

              return (
                <div
                  key={clip.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectClip(clip.id);
                  }}
                  onMouseDown={(e) => {
                    if (isLocked) return;
                    e.stopPropagation();
                    onSelectClip(clip.id);
                    setDraggedClip({
                      id: clip.id,
                      startX: e.clientX,
                      startY: e.clientY,
                      initialStartFrame: clip.startFrame,
                      mode: 'move',
                      initialDuration: clip.durationInFrames,
                      initialTrackIndex: clip.trackIndex,
                      initialMediaStart: clip.mediaStartFrame ?? 0,
                      isMedia: clip.type === 'video' || clip.type === 'audio',
                    });
                  }}
                  style={{
                    position: 'absolute',
                    left: `${left}px`,
                    top: `${top}px`,
                    width: `${width}px`,
                    height: '40px',
                    backgroundColor: isHidden ? 'rgba(20, 22, 30, 0.6)' : 'rgba(30, 35, 52, 0.9)',
                    border: isHidden
                      ? '1px dashed rgba(255, 255, 255, 0.2)'
                      : `1px solid ${isSelected ? '#fff' : color}`,
                    borderRadius: '6px',
                    boxShadow: isSelected
                      ? `0 0 14px ${color}88, inset 0 0 8px ${color}44`
                      : '0 2px 8px rgba(0,0,0,0.3)',
                    cursor: isLocked ? 'not-allowed' : 'grab',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 8px',
                    zIndex: isSelected ? 20 : 5,
                    opacity: isHidden ? 0.4 : isLocked ? 0.7 : 1,
                  }}
                >
                  {/* Left Trim Handle */}
                  {!isLocked && (
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDraggedClip({
                          id: clip.id,
                          startX: e.clientX,
                          startY: e.clientY,
                          initialStartFrame: clip.startFrame,
                          mode: 'trim-left',
                          initialDuration: clip.durationInFrames,
                          initialTrackIndex: clip.trackIndex,
                          initialMediaStart: clip.mediaStartFrame ?? 0,
                          isMedia: clip.type === 'video' || clip.type === 'audio',
                        });
                      }}
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '6px',
                        cursor: 'ew-resize',
                        backgroundColor: isSelected ? color : 'transparent',
                      }}
                    />
                  )}

                  {/* Clip Label & Icon */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#fff',
                      pointerEvents: 'none',
                    }}
                  >
                    {getTrackIcon(clip.type)}
                    <span>{clip.name || clip.content || clip.type}</span>
                    {clip.animation && clip.animation !== 'none' && (
                      <span
                        style={{
                          fontSize: '9px',
                          padding: '1px 4px',
                          borderRadius: '3px',
                          backgroundColor: 'rgba(255,255,255,0.15)',
                          color: '#e2e8f0',
                        }}
                      >
                        {clip.animation}
                      </span>
                    )}
                    {clip.inTransition && clip.inTransition !== 'none' && (
                      <span
                        style={{
                          fontSize: '9px',
                          padding: '1px 4px',
                          borderRadius: '3px',
                          backgroundColor: 'rgba(6, 182, 212, 0.25)',
                          color: '#67e8f9',
                        }}
                      >
                        {clip.inTransition}
                      </span>
                    )}
                  </div>

                  {/* Right Trim Handle */}
                  {!isLocked && (
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDraggedClip({
                          id: clip.id,
                          startX: e.clientX,
                          startY: e.clientY,
                          initialStartFrame: clip.startFrame,
                          mode: 'trim-right',
                          initialDuration: clip.durationInFrames,
                          initialTrackIndex: clip.trackIndex,
                          initialMediaStart: clip.mediaStartFrame ?? 0,
                          isMedia: clip.type === 'video' || clip.type === 'audio',
                        });
                      }}
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: '6px',
                        cursor: 'ew-resize',
                        backgroundColor: isSelected ? color : 'transparent',
                      }}
                    />
                  )}
                </div>
              );
            })}

            {/* Playhead Red Indicator Line */}
            <div
              style={{
                position: 'absolute',
                left: `${currentFrame * zoom}px`,
                top: 0,
                bottom: 0,
                width: '2px',
                backgroundColor: '#ef4444',
                zIndex: 30,
                pointerEvents: 'none',
                boxShadow: '0 0 8px rgba(239, 68, 68, 0.8)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '-6px',
                  width: '14px',
                  height: '14px',
                  backgroundColor: '#ef4444',
                  clipPath: 'polygon(0% 0%, 100% 0%, 100% 60%, 50% 100%, 0% 60%)',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
