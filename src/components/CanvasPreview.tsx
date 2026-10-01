import React, { useRef, useState, useEffect } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Rewind,
  Maximize2,
  Grid,
  ShieldCheck,
  Tv,
  Menu,
  Maximize,
} from 'lucide-react';
import { MainComposition } from '../remotion/MainComposition';
import { CompositionSettings, TimelineClip } from '../types/project';
import { getCaptionDefaultY } from '../remotion/CaptionRenderer';

interface CanvasPreviewProps {
  settings: CompositionSettings;
  clips: TimelineClip[];
  hiddenTracks?: Record<number, boolean>;
  currentFrame: number;
  isPlaying: boolean;
  selectedClipId: string | null;
  onSelectClip: (id: string | null) => void;
  onUpdateClip: (id: string, updates: Partial<TimelineClip>) => void;
  onCommitHistory?: () => void;
  onFrameUpdate: (frame: number) => void;
  onPlayPauseToggle: () => void;
  playerRef: React.RefObject<PlayerRef>;
}

export const CanvasPreview: React.FC<CanvasPreviewProps> = ({
  settings,
  clips,
  hiddenTracks = {},
  currentFrame,
  isPlaying,
  selectedClipId,
  onSelectClip,
  onUpdateClip,
  onCommitHistory,
  onFrameUpdate,
  onPlayPauseToggle,
  playerRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerWrapperRef = useRef<HTMLDivElement>(null);

  // Captions without an explicit y sit where their template places them
  const effectiveY = (clip: TimelineClip) =>
    clip.y ??
    (clip.type === 'caption' ? getCaptionDefaultY(clip.captionTemplate, settings.height, settings.width) : 0);

  // Safe area & grid overlay guides state (Off by default for clean view, can toggle)
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [showRuleOfThirds, setShowRuleOfThirds] = useState(false);
  // Canvas View Zoom: 'fit' (Stretch to container maintaining aspect ratio) | 0.5 | 0.75 | 1 | 1.25
  const [zoomLevel, setZoomLevel] = useState<number | 'fit'>('fit');

  // Direct on-canvas dragging gizmo state
  const [isDraggingGizmo, setIsDraggingGizmo] = useState(false);
  const [dragStart, setDragStart] = useState<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    scaleFactor: number;
  } | null>(null);

  // Active selected clip
  const selectedClip = clips.find((c) => c.id === selectedClipId) || null;
  // Show gizmo whenever a clip is selected so the user can always reposition it,
  // not only during its active time window.
  const gizmoVisible = !!selectedClip;

  // Format frame counter into SMPTE style HH:MM:SS:FF
  const formatSMPTETimecode = (frame: number, fps: number) => {
    const totalSecs = Math.floor(frame / fps);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    const remainderFrames = frame % fps;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(remainderFrames).padStart(2, '0')}`;
  };

  const handleStepFrames = (step: number) => {
    if (playerRef.current) {
      const next = Math.max(
        0,
        Math.min(settings.durationInFrames - 1, currentFrame + step)
      );
      playerRef.current.seekTo(next);
      onFrameUpdate(next);
    }
  };

  const handleReset = () => {
    if (playerRef.current) {
      playerRef.current.seekTo(0);
      onFrameUpdate(0);
    }
  };

  // Fullscreen player toggle
  const handleToggleFullscreen = () => {
    if (!playerWrapperRef.current) return;
    if (!document.fullscreenElement) {
      playerWrapperRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Direct canvas gizmo drag handling
  const handleGizmoMouseDown = (e: React.MouseEvent) => {
    if (!selectedClip || !playerWrapperRef.current) return;
    e.stopPropagation();

    const rect = playerWrapperRef.current.getBoundingClientRect();
    const scaleFactor = settings.width / rect.width;

    setIsDraggingGizmo(true);
    setDragStart({
      startX: e.clientX,
      startY: e.clientY,
      initialX: selectedClip.x || 0,
      initialY: effectiveY(selectedClip),
      scaleFactor,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingGizmo && dragStart && selectedClip) {
        const deltaX = (e.clientX - dragStart.startX) * dragStart.scaleFactor;
        const deltaY = (e.clientY - dragStart.startY) * dragStart.scaleFactor;

        onUpdateClip(selectedClip.id, {
          x: Math.round(dragStart.initialX + deltaX),
          y: Math.round(dragStart.initialY + deltaY),
        });
      }
    };

    const handleMouseUp = () => {
      if (isDraggingGizmo && onCommitHistory) {
        onCommitHistory();
      }
      setIsDraggingGizmo(false);
      setDragStart(null);
    };

    if (isDraggingGizmo) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingGizmo, dragStart, selectedClip, onUpdateClip, onCommitHistory]);

  const isYouTube169 = settings.width === 1920 && settings.height === 1080;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0c0d12',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Outer Studio Stage Center */}
      <div
        ref={containerRef}
        onClick={() => onSelectClip(null)}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px 14px',
          background: 'radial-gradient(ellipse at 50% 40%, #151822 0%, #0d0f15 70%, #07080c 100%)',
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
          height: '100%',
        }}
      >
        {/* Dedicated Monitor Station Frame (Full-width CapCut Pro / DaVinci Resolve Master Monitor) */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            height: '100%',
            maxHeight: '100%',
            maxWidth: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#16181f',
            borderRadius: '10px',
            border: '1px solid #232733',
            boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.04)',
            overflow: 'hidden',
          }}
        >
          {/* Monitor Card Header */}
          <div
            style={{
              height: '38px',
              padding: '0 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(180deg, #1e212b 0%, #16181f 100%)',
              borderBottom: '1px solid #232733',
              userSelect: 'none',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#38bdf8', opacity: 0.8 }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#f1f5f9', letterSpacing: '0.2px' }}>
                  Program Monitor
                </span>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: isYouTube169 ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  color: isYouTube169 ? '#7dd3fc' : '#94a3b8',
                  fontWeight: 500,
                  border: isYouTube169 ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {isYouTube169 ? 'YouTube Long Video (16:9 1080p)' : `${settings.width}×${settings.height}`}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* YouTube Safe Margins Toggle */}
              <button
                className="btn-icon"
                onClick={() => setShowSafeZones(!showSafeZones)}
                title="Toggle Title/Caption Safe Margins (10% & 20% YouTube Safe Areas)"
                style={{
                  backgroundColor: showSafeZones ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: showSafeZones ? '#38bdf8' : '#64748b',
                  border: showSafeZones ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                  padding: '4px 8px',
                  borderRadius: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <ShieldCheck size={13} />
                <span>Safe Bounds</span>
              </button>

              {/* Grid Toggle */}
              <button
                className="btn-icon"
                onClick={() => setShowRuleOfThirds(!showRuleOfThirds)}
                title="Toggle Rule-of-Thirds Composition Grid"
                style={{
                  backgroundColor: showRuleOfThirds ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: showRuleOfThirds ? '#a5b4fc' : '#64748b',
                  border: showRuleOfThirds ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                  padding: '4px 8px',
                  borderRadius: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Grid size={13} />
                <span>Grid</span>
              </button>

              {/* Status Indicator Dot */}
              <div
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
                  marginLeft: '4px',
                }}
                title="Canvas Live & Ready"
              />
            </div>
          </div>

          {/* Actual Video Viewport Canvas Stage (Surrounding stage #282828, Inside screen pure black #000000, No border) */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              padding: zoomLevel === 'fit' ? '12px' : '20px',
              backgroundColor: '#282828',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              ref={playerWrapperRef}
              style={{
                width: '100%',
                height: '100%',
                maxHeight: '100%',
                maxWidth: '100%',
                aspectRatio: `${settings.width} / ${settings.height}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#000000',
                position: 'relative',
                border: 'none',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                overflow: 'hidden',
                zIndex: 1,
                transform: zoomLevel === 'fit' ? 'none' : `scale(${zoomLevel})`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease',
              }}
            >
              <Player
                ref={playerRef}
                component={MainComposition}
                inputProps={{
                  settings,
                  clips,
                  hiddenTracks,
                }}
                durationInFrames={Math.max(1, settings.durationInFrames)}
                fps={settings.fps}
                compositionWidth={settings.width}
                compositionHeight={settings.height}
                style={{
                  width: '100%',
                  height: '100%',
                }}
                acknowledgeRemotionLicense
                controls={false}
                autoPlay={false}
                loop
              />

              {/* YouTube Title & Caption Safe Area Overlay (Subtle Professional Guides) */}
              {showSafeZones && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    zIndex: 40,
                  }}
                >
                  {/* Action Safe Zone (5% margin) */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: '5%',
                      border: '1px dashed rgba(56, 189, 248, 0.22)',
                      borderRadius: '3px',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: '4px',
                        left: '6px',
                        fontSize: '9px',
                        fontWeight: 600,
                        letterSpacing: '0.3px',
                        color: 'rgba(56, 189, 248, 0.7)',
                        backgroundColor: 'rgba(10, 15, 25, 0.75)',
                        backdropFilter: 'blur(2px)',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        border: '1px solid rgba(56, 189, 248, 0.15)',
                      }}
                    >
                      ACTION SAFE (90%)
                    </span>
                  </div>

                  {/* Title & Caption Safe Zone (10% margin - standard for YouTube text and captions) */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: '10%',
                      border: '1px solid rgba(250, 204, 21, 0.25)',
                      borderRadius: '3px',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '4px',
                        left: '6px',
                        fontSize: '9px',
                        fontWeight: 600,
                        letterSpacing: '0.3px',
                        color: 'rgba(250, 204, 21, 0.8)',
                        backgroundColor: 'rgba(15, 23, 42, 0.75)',
                        backdropFilter: 'blur(2px)',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        border: '1px solid rgba(250, 204, 21, 0.18)',
                      }}
                    >
                      TEXT & CAPTION SAFE (80%)
                    </span>
                  </div>

                  {/* Center Crosshair marker */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      width: '14px',
                      height: '14px',
                      transform: 'translate(-50%, -50%)',
                      borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRight: '1px solid rgba(255, 255, 255, 0.2)',
                      borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                    }}
                  />
                </div>
              )}

              {/* Rule-of-Thirds Grid Overlay */}
              {showRuleOfThirds && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    zIndex: 41,
                  }}
                >
                  <div style={{ position: 'absolute', left: '33.333%', top: 0, bottom: 0, width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
                  <div style={{ position: 'absolute', left: '66.666%', top: 0, bottom: 0, width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
                  <div style={{ position: 'absolute', top: '33.333%', left: 0, right: 0, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
                  <div style={{ position: 'absolute', top: '66.666%', left: 0, right: 0, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
                </div>
              )}

              {/* Interactive Visual Gizmo Overlay for Selected Clip */}
              {gizmoVisible && selectedClip && (() => {
                if (!playerWrapperRef.current) return null;
                // Use offsetWidth to get unscaled inner player width so children elements
                // inside playerWrapperRef (which inherits the transform) align 1:1 with Remotion Player
                const unscaledWidth = playerWrapperRef.current.offsetWidth || 1;
                const displayScale = unscaledWidth / settings.width;
                const isMedia = selectedClip.type === 'image' || selectedClip.type === 'video';
                const clipScale = selectedClip.scale ?? 1;
                // Full-frame media always matches the current composition size
                const boxW = isMedia && selectedClip.fitToFrame ? settings.width : selectedClip.width || settings.width;
                const boxH = isMedia && selectedClip.fitToFrame ? settings.height : selectedClip.height || settings.height;

                return (
                  <div
                    onMouseDown={handleGizmoMouseDown}
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: `translate(calc(-50% + ${(selectedClip.x || 0) * displayScale}px), calc(-50% + ${effectiveY(selectedClip) * displayScale}px)) scale(${clipScale}) rotate(${selectedClip.rotation || 0}deg)`,
                      transformOrigin: 'center center',
                      cursor: isDraggingGizmo ? 'grabbing' : 'grab',
                      border: '1.5px solid #38bdf8',
                      boxShadow: '0 0 0 1px rgba(0,0,0,0.6), 0 0 10px rgba(56,189,248,0.3)',
                      pointerEvents: 'auto',
                      zIndex: 99,
                      width: isMedia ? `${Math.max(60, boxW * displayScale)}px` : undefined,
                      height: isMedia ? `${Math.max(40, boxH * displayScale)}px` : undefined,
                      minWidth: isMedia ? undefined : '100px',
                      minHeight: isMedia ? undefined : '44px',
                      padding: isMedia ? '0' : '6px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '3px',
                    }}
                    title="Click and drag inside box to reposition directly on canvas"
                  >
                    {/* Clip Info Badge */}
                    <div
                      style={{
                        position: 'absolute',
                        backgroundColor: 'rgba(10, 15, 26, 0.92)',
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        top: '-26px',
                        fontSize: '10px',
                        color: '#7dd3fc',
                        fontWeight: 600,
                        letterSpacing: '0.2px',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
                      }}
                    >
                      {selectedClip.name} ({selectedClip.x || 0}, {Math.round(effectiveY(selectedClip))})
                    </div>

                    {/* 4 Corner Resize / Anchor Handles (Sleek Apple/CapCut Pro dots) */}
                    <div style={{ position: 'absolute', top: '-4px', left: '-4px', width: '8px', height: '8px', backgroundColor: '#ffffff', border: '1.5px solid #0284c7', borderRadius: '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }} />
                    <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '8px', height: '8px', backgroundColor: '#ffffff', border: '1.5px solid #0284c7', borderRadius: '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }} />
                    <div style={{ position: 'absolute', bottom: '-4px', left: '-4px', width: '8px', height: '8px', backgroundColor: '#ffffff', border: '1.5px solid #0284c7', borderRadius: '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }} />
                    <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '8px', height: '8px', backgroundColor: '#ffffff', border: '1.5px solid #0284c7', borderRadius: '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }} />
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Monitor Card Bottom Controls Bar */}
          <div
            style={{
              height: '46px',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(180deg, #16181f 0%, #12141a 100%)',
              borderTop: '1px solid #232733',
              userSelect: 'none',
            }}
          >
            {/* Left: Cyan SMPTE Timecode Counter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#22d3ee', // Cyan timecode from reference screenshot
                  letterSpacing: '0.5px',
                }}
              >
                {formatSMPTETimecode(currentFrame, settings.fps)}
              </span>
              <span style={{ color: '#64748b', fontSize: '12px' }}>/</span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#94a3b8',
                }}
              >
                {formatSMPTETimecode(settings.durationInFrames, settings.fps)}
              </span>
            </div>

            {/* Center: Playback Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                className="btn-icon"
                onClick={handleReset}
                title="Go to Start (00:00:00:00)"
                style={{ color: '#cbd5e1' }}
              >
                <RotateCcw size={15} />
              </button>

              <button
                className="btn-icon"
                onClick={() => handleStepFrames(-1)}
                title="Previous Frame"
                style={{ color: '#cbd5e1' }}
              >
                <Rewind size={16} />
              </button>

              <button
                onClick={onPlayPauseToggle}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: isPlaying ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                  border: isPlaying ? '1px solid #ef4444' : '1px solid #38bdf8',
                  color: isPlaying ? '#ef4444' : '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              >
                {isPlaying ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: '2px' }} />}
              </button>

              <button
                className="btn-icon"
                onClick={() => handleStepFrames(1)}
                title="Next Frame"
                style={{ color: '#cbd5e1' }}
              >
                <FastForward size={16} />
              </button>
            </div>

            {/* Right: Zoom / Fit, Grid, Ratio & Fullscreen Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Zoom & Stretch-to-Fit Controller */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <select
                  value={zoomLevel}
                  onChange={(e) => {
                    const val = e.target.value;
                    setZoomLevel(val === 'fit' ? 'fit' : parseFloat(val));
                  }}
                  title="Canvas Zoom / Stretch-to-Fit"
                  style={{
                    padding: '3px 6px',
                    backgroundColor: '#232733',
                    border: '1px solid #373c4d',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: zoomLevel === 'fit' ? '#38bdf8' : '#cbd5e1',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="fit">Fit to Screen</option>
                  <option value="0.5">50%</option>
                  <option value="0.75">75%</option>
                  <option value="1">100% (Original)</option>
                  <option value="1.25">125%</option>
                </select>
              </div>

              <button
                onClick={() => setShowRuleOfThirds(!showRuleOfThirds)}
                style={{
                  padding: '3px 8px',
                  backgroundColor: '#282b32',
                  border: '1px solid #3f4450',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: showRuleOfThirds ? '#818cf8' : '#cbd5e1',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Toggle Rule of Thirds"
              >
                <Grid size={12} />
              </button>

              <div
                style={{
                  padding: '3px 8px',
                  backgroundColor: '#282b32',
                  border: '1px solid #3f4450',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title={`Aspect Ratio: ${settings.width}×${settings.height}`}
              >
                <span>Ratio</span>
                <span style={{ color: '#38bdf8' }}>{(() => {
                  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
                  const g = gcd(settings.width, settings.height);
                  return `${settings.width / g}:${settings.height / g}`;
                })()}</span>
              </div>

              <button
                className="btn-icon"
                onClick={handleToggleFullscreen}
                title="Full Screen Preview"
                style={{ color: '#cbd5e1' }}
              >
                <Maximize2 size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

