import React from 'react';
import {
  Sliders,
  Type,
  Move,
  Palette,
  Sparkles,
  Layers,
  Volume2,
  Trash2,
  Copy,
  Scissors,
  Eye,
  Film,
  Sun,
  Activity,
  ArrowRightLeft,
} from 'lucide-react';
import {
  TimelineClip,
  AnimationType,
  TransitionType,
  ColorFilterPreset,
  MotionType,
} from '../types/project';
import { TRANSITIONS, getTransition } from '../templates/transitions';
import { MOTIONS } from '../templates/motion';
import { COLOR_GRADES, OVERLAY_EFFECTS } from '../templates/effects';
import { CAPTION_TEMPLATES } from '../templates/captions';

interface PropertiesPanelProps {
  width?: number;
  clip: TimelineClip | null;
  tracksCount?: number;
  onUpdateClip: (updates: Partial<TimelineClip>) => void;
  onDeleteClip: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  width = 330,
  clip,
  tracksCount = 4,
  onUpdateClip,
  onDeleteClip,
}) => {
  if (!clip) {
    return (
      <aside
        style={{
          width: `${width}px`,
          minWidth: `${width}px`,
          maxWidth: `${width}px`,
          backgroundColor: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          color: 'var(--text-dim)',
          textAlign: 'center',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <Sliders size={36} style={{ marginBottom: '12px', opacity: 0.4 }} />
        <h4 style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '6px' }}>
          No Clip Selected
        </h4>
        <p style={{ fontSize: '12px', lineHeight: '1.5' }}>
          Click any element on the canvas or timeline track to customize typography, animations, transitions, color grading, audio curves, and transforms.
        </p>
      </aside>
    );
  }

  return (
    <aside
      style={{
        width: `${width}px`,
        minWidth: `${width}px`,
        maxWidth: `${width}px`,
        backgroundColor: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: 'rgba(99, 102, 241, 0.2)',
              color: '#818cf8',
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            {clip.type}
          </span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {clip.name}
          </span>
        </div>

        <button
          className="btn-icon"
          onClick={onDeleteClip}
          title="Delete clip"
          style={{ color: '#ef4444' }}
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Content Section (for Text, Captions and Shape) */}
        {(clip.type === 'text' || clip.type === 'caption' || clip.type === 'shape') && (
          <section>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
              CONTENT & CAPTION SCRIPT
            </label>
            <textarea
              rows={3}
              value={clip.content || ''}
              // Caption word timings no longer match edited text, so fall back to even timing
              onChange={(e) =>
                onUpdateClip(clip.type === 'caption' ? { content: e.target.value, words: undefined } : { content: e.target.value })
              }
              placeholder="Enter text or words..."
            />
          </section>
        )}

        {/* Transitions Engine */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <ArrowRightLeft size={14} color="#06b6d4" />
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
              TRANSITIONS (IN & OUT)
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>In Transition</span>
              <select
                value={clip.inTransition || 'none'}
                onChange={(e) => onUpdateClip({ inTransition: e.target.value as TransitionType })}
              >
                {TRANSITIONS.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Out Transition</span>
              <select
                value={clip.outTransition || 'none'}
                onChange={(e) => onUpdateClip({ outTransition: e.target.value as TransitionType })}
              >
                {TRANSITIONS.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>In length (frames)</span>
              <input
                type="number"
                min={1}
                max={120}
                value={clip.inTransitionDuration ?? (Math.round(getTransition(clip.inTransition).defaultSeconds * 30) || 15)}
                onChange={(e) => onUpdateClip({ inTransitionDuration: Math.max(1, Number(e.target.value)) })}
              />
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Out length (frames)</span>
              <input
                type="number"
                min={1}
                max={120}
                value={clip.outTransitionDuration ?? (Math.round(getTransition(clip.outTransition).defaultSeconds * 30) || 15)}
                onChange={(e) => onUpdateClip({ outTransitionDuration: Math.max(1, Number(e.target.value)) })}
              />
            </div>
          </div>
        </section>

        {/* Caption template */}
        {clip.type === 'caption' && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Type size={14} color="#facc15" />
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>CAPTION STYLE</label>
            </div>
            <select
              value={clip.captionTemplate || 'karaoke-classic'}
              onChange={(e) =>
                onUpdateClip({
                  captionTemplate: e.target.value,
                  y: undefined,
                  fontSize: undefined,
                  color: undefined,
                  backgroundColor: undefined,
                  fontFamily: undefined,
                  fontWeight: undefined,
                })
              }
            >
              {CAPTION_TEMPLATES.map((c) => (
                <option key={c.id} value={c.id}>{c.category} — {c.name}</option>
              ))}
            </select>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                Highlight words (comma separated)
              </span>
              <input
                type="text"
                value={(clip.emphasisWords || []).join(', ')}
                onChange={(e) =>
                  onUpdateClip({ emphasisWords: e.target.value.split(',').map((w) => w.trim()).filter(Boolean) })
                }
              />
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
              Editing the text below re-times the words evenly.
            </span>
          </section>
        )}

        {/* Camera motion (images & videos) */}
        {(clip.type === 'image' || clip.type === 'video') && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Move size={14} color="#38bdf8" />
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>CAMERA MOTION</label>
            </div>
            <select value={clip.motion || 'none'} onChange={(e) => onUpdateClip({ motion: e.target.value as MotionType })}>
              {MOTIONS.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-dim)' }}>Intensity</span>
                <span>{clip.motionIntensity ?? 50}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={clip.motionIntensity ?? 50}
                onChange={(e) => onUpdateClip({ motionIntensity: parseInt(e.target.value) })}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <input
                type="checkbox"
                checked={!!clip.fitToFrame}
                onChange={(e) => onUpdateClip({ fitToFrame: e.target.checked })}
                style={{ width: 'auto' }}
              />
              Always fill the whole frame
            </label>
          </section>
        )}

        {/* Overlay effects (images & videos) */}
        {(clip.type === 'image' || clip.type === 'video') && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sun size={14} color="#f59e0b" />
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>EFFECTS</label>
            </div>
            {OVERLAY_EFFECTS.map((fx) => {
              const value = clip.effects?.[fx.key] ?? 0;
              return (
                <div key={fx.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
                    <span style={{ color: 'var(--text-dim)' }}>{fx.name}</span>
                    <span>{value}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={value}
                    onChange={(e) => onUpdateClip({ effects: { ...(clip.effects || {}), [fx.key]: parseInt(e.target.value) } })}
                  />
                </div>
              );
            })}
          </section>
        )}

        {/* Remotion Animation Engine */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Sparkles size={14} color="#818cf8" />
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
              REMOTION ANIMATION PRESETS
            </label>
          </div>
          <select
            value={clip.animation || 'none'}
            onChange={(e) => onUpdateClip({ animation: e.target.value as AnimationType })}
          >
            <option value="none">None (Static)</option>
            <option value="pop-in">Pop In (Remotion Spring Physics)</option>
            <option value="fade-in">Fade In</option>
            <option value="slide-up">Slide Up Entrance</option>
            <option value="slide-left">Slide Left Entrance</option>
            <option value="slide-right">Slide Right Entrance</option>
            <option value="bounce">Bouncy Spring</option>
            <option value="pulse">Pulse Loop</option>
            <option value="zoom-in">Slow Dynamic Zoom-In</option>
            <option value="zoom-out">Slow Dynamic Zoom-Out</option>
            <option value="neon-glow">Cyberpunk Neon Glow</option>
            <option value="typewriter">Typewriter Reveal</option>
          </select>
        </section>

        {/* Color Grading LUT Filters */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Film size={14} color="#ec4899" />
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
              COLOR GRADING & LUT PRESETS
            </label>
          </div>
          <select
            value={clip.colorFilter || 'none'}
            onChange={(e) => onUpdateClip({ colorFilter: e.target.value as ColorFilterPreset })}
          >
            {COLOR_GRADES.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </section>

        {/* Typography Settings (if text or caption) */}
        {(clip.type === 'text' || clip.type === 'caption') && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
              TYPOGRAPHY & STYLING
            </label>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Font Family</span>
              <select
                value={clip.fontFamily || "'Plus Jakarta Sans', sans-serif"}
                onChange={(e) => onUpdateClip({ fontFamily: e.target.value })}
              >
                <option value="'Plus Jakarta Sans', sans-serif">Plus Jakarta Sans</option>
                <option value="'JetBrains Mono', monospace">JetBrains Mono (Tech/Code)</option>
                <option value="Impact, fantasy">Impact (Meme / Bold Poster)</option>
                <option value="'Georgia', serif">Georgia (Editorial Serif)</option>
                <option value="system-ui, sans-serif">System Sans</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Font Size (px)</span>
                <input
                  type="number"
                  value={clip.fontSize || 48}
                  onChange={(e) => onUpdateClip({ fontSize: Number(e.target.value) })}
                  min={12}
                  max={250}
                />
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Weight</span>
                <select
                  value={clip.fontWeight || '700'}
                  onChange={(e) => onUpdateClip({ fontWeight: e.target.value })}
                >
                  <option value="400">Regular (400)</option>
                  <option value="600">SemiBold (600)</option>
                  <option value="700">Bold (700)</option>
                  <option value="900">Black Ultra (900)</option>
                </select>
              </div>
            </div>

            {/* Colors */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Text Color</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="color"
                    value={clip.color || '#ffffff'}
                    onChange={(e) => onUpdateClip({ color: e.target.value })}
                    style={{ width: '32px', height: '32px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                  />
                  <input
                    type="text"
                    value={clip.color || '#ffffff'}
                    onChange={(e) => onUpdateClip({ color: e.target.value })}
                    style={{ fontSize: '11px' }}
                  />
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Background Pill</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="color"
                    value={clip.backgroundColor || '#000000'}
                    onChange={(e) => onUpdateClip({ backgroundColor: e.target.value })}
                    style={{ width: '32px', height: '32px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                  />
                  <button
                    className="btn-secondary"
                    style={{ padding: '6px 8px', fontSize: '10px' }}
                    onClick={() => onUpdateClip({ backgroundColor: undefined })}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
            {/* Alignment & Letter Spacing */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Alignment</span>
                <select
                  value={clip.textAlign || 'center'}
                  onChange={(e) => onUpdateClip({ textAlign: e.target.value as 'left' | 'center' | 'right' })}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Letter Spacing</span>
                <input
                  type="number"
                  value={clip.letterSpacing || 0}
                  onChange={(e) => onUpdateClip({ letterSpacing: Number(e.target.value) })}
                  min={-5}
                  max={20}
                />
              </div>
            </div>
          </section>
        )}

        {/* Transform & Position (Coordinates) */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
            POSITION & GEOMETRY
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>X Pos (Center 0)</span>
              <input
                type="number"
                value={clip.x ?? 0}
                onChange={(e) => onUpdateClip({ x: isNaN(Number(e.target.value)) ? 0 : Number(e.target.value) })}
              />
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Y Pos (Center 0)</span>
              <input
                type="number"
                value={clip.y ?? 0}
                onChange={(e) => onUpdateClip({ y: isNaN(Number(e.target.value)) ? 0 : Number(e.target.value) })}
              />
            </div>
          </div>

          {/* Media Sizing Mode (for Image and Video) */}
          {(clip.type === 'image' || clip.type === 'video') && (
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                Canvas Fit Mode
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => onUpdateClip({ objectFit: 'cover', scale: 1, x: 0, y: 0 })}
                  style={{
                    padding: '6px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: clip.objectFit === 'cover' || !clip.objectFit ? '#38bdf8' : 'var(--border-color)',
                    backgroundColor: clip.objectFit === 'cover' || !clip.objectFit ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-tertiary)',
                    color: clip.objectFit === 'cover' || !clip.objectFit ? '#38bdf8' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  Fill Screen (16:9)
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateClip({ objectFit: 'contain', scale: 1, x: 0, y: 0 })}
                  style={{
                    padding: '6px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: clip.objectFit === 'contain' ? '#38bdf8' : 'var(--border-color)',
                    backgroundColor: clip.objectFit === 'contain' ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-tertiary)',
                    color: clip.objectFit === 'contain' ? '#38bdf8' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  Fit Entire Image
                </button>
              </div>
            </div>
          )}

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-dim)' }}>Scale</span>
              <span>{(clip.scale ?? 1).toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3"
              step="0.05"
              value={clip.scale ?? 1}
              onChange={(e) => onUpdateClip({ scale: parseFloat(e.target.value) })}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-dim)' }}>Rotation</span>
              <span>{clip.rotation || 0}°</span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              value={clip.rotation || 0}
              onChange={(e) => onUpdateClip({ rotation: parseInt(e.target.value) })}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-dim)' }}>Opacity</span>
              <span>{clip.opacity ?? 100}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={clip.opacity ?? 100}
              onChange={(e) => onUpdateClip({ opacity: parseInt(e.target.value) })}
            />
          </div>
        </section>

        {/* Fine Adjustments (Blur & Brightness) */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
            FILTER ADJUSTMENTS
          </label>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-dim)' }}>Blur Effect</span>
              <span>{clip.filterBlur || 0}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              value={clip.filterBlur || 0}
              onChange={(e) => onUpdateClip({ filterBlur: parseInt(e.target.value) })}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-dim)' }}>Brightness</span>
              <span>{clip.filterBrightness ?? 100}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              value={clip.filterBrightness ?? 100}
              onChange={(e) => onUpdateClip({ filterBrightness: parseInt(e.target.value) })}
            />
          </div>
        </section>

        {/* Audio Volume & Envelopes */}
        {(clip.type === 'video' || clip.type === 'audio') && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
              AUDIO MIXING & ENVELOPES
            </label>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-dim)' }}>Master Volume</span>
                <span>{clip.volume ?? 100}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={clip.volume ?? 100}
                onChange={(e) => onUpdateClip({ volume: parseInt(e.target.value) })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Fade In (frames)</span>
                <input
                  type="number"
                  value={clip.fadeInFrames || 0}
                  onChange={(e) => onUpdateClip({ fadeInFrames: Number(e.target.value) })}
                  min={0}
                  max={60}
                />
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Fade Out (frames)</span>
                <input
                  type="number"
                  value={clip.fadeOutFrames || 0}
                  onChange={(e) => onUpdateClip({ fadeOutFrames: Number(e.target.value) })}
                  min={0}
                  max={60}
                />
              </div>
            </div>
          </section>
        )}

        {/* Timing & Track Layer Position */}
        <section style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
            TIMING & TRACK LAYER
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Start Frame</span>
              <input
                type="number"
                value={clip.startFrame}
                min={0}
                onChange={(e) => onUpdateClip({ startFrame: Math.max(0, Number(e.target.value)) })}
              />
            </div>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Duration (frames)</span>
              <input
                type="number"
                value={clip.durationInFrames}
                min={5}
                onChange={(e) => onUpdateClip({ durationInFrames: Math.max(5, Number(e.target.value)) })}
              />
            </div>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Track Assignment</span>
            <select
              value={clip.trackIndex}
              onChange={(e) => onUpdateClip({ trackIndex: Number(e.target.value) })}
            >
              {Array.from({ length: tracksCount }).map((_, idx) => {
                const tNum = tracksCount - 1 - idx;
                const label =
                  tNum === tracksCount - 1
                    ? `Track ${tNum + 1} (Top Layer)`
                    : tNum === 0
                    ? `Track 1 (Base Layer)`
                    : `Track ${tNum + 1}`;
                return (
                  <option key={tNum} value={tNum}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
        </section>
      </div>
    </aside>
  );
};
