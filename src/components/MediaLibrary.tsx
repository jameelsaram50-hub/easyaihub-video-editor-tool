import React, { useRef, useState } from 'react';
import {
  FolderOpen,
  Sparkles,
  Subtitles,
  Play,
  Plus,
  Type,
  ArrowRightLeft,
  Palette,
  Move,
  Volume2,
  Wand2,
} from 'lucide-react';
import { AssetTemplate, TimelineClip } from '../types/project';
import { CAPTION_TEMPLATES } from '../templates/captions';
import { TITLE_TEMPLATES } from '../templates/titles';
import { TRANSITIONS } from '../templates/transitions';
import { COLOR_GRADES, EFFECT_PRESETS } from '../templates/effects';
import { MOTIONS } from '../templates/motion';
import { SFX_LIBRARY, sfxSrc } from '../templates/sfx';
import { VIDEO_STYLES } from '../templates/styles';

interface MediaLibraryProps {
  width?: number;
  onAddPreset: (template: AssetTemplate) => void;
  onImportCustomMedia: () => void;
  onAddCaptionTrack: () => void;
  selectedClip: TimelineClip | null;
  hasCaptions: boolean;
  compWidth: number;
  compHeight: number;
  fps: number;
  onUpdateSelected: (updates: Partial<TimelineClip>) => void;
  onUpdateAllCaptions: (updates: Partial<TimelineClip>) => void;
  onUpdateAllScenes: (updates: Partial<TimelineClip>) => void;
  onAddClip: (clip: Partial<TimelineClip> & Pick<TimelineClip, 'type' | 'name'>, kind: 'overlay' | 'sfx' | 'caption') => void;
  onApplyStyle: (styleId: string) => void;
}

type Tab = 'assets' | 'styles' | 'captions' | 'titles' | 'transitions' | 'effects' | 'motion' | 'sfx';

const TABS: { id: Tab; label: string }[] = [
  { id: 'assets', label: 'Assets' },
  { id: 'styles', label: 'Styles' },
  { id: 'captions', label: 'Captions' },
  { id: 'titles', label: 'Titles' },
  { id: 'transitions', label: 'Transitions' },
  { id: 'effects', label: 'Effects' },
  { id: 'motion', label: 'Motion' },
  { id: 'sfx', label: 'SFX' },
];

const PRO_PRESETS: AssetTemplate[] = [
  {
    name: 'YouTube Subscribe CTA',
    category: 'preset',
    clip: {
      type: 'shape',
      name: 'Subscribe Button',
      content: '🔔 SUBSCRIBE & LIKE',
      fontSize: 24,
      backgroundColor: '#ef4444',
      color: '#ffffff',
      y: 320,
      x: 320,
      borderRadius: 24,
      animation: 'bounce',
      durationInFrames: 100,
      trackIndex: 2,
    },
  },
  {
    name: 'Discount Promo Sticker',
    category: 'preset',
    clip: {
      type: 'shape',
      name: 'Sale Tag',
      content: '🔥 LIMITED OFFER: 70% OFF',
      fontSize: 26,
      backgroundColor: '#f59e0b',
      color: '#000000',
      y: -220,
      x: 340,
      borderRadius: 18,
      animation: 'pulse',
      durationInFrames: 130,
      trackIndex: 2,
    },
  },
];

const isMedia = (c: TimelineClip | null) => !!c && (c.type === 'image' || c.type === 'video');

const SmallButton: React.FC<{ onClick: (e: React.MouseEvent) => void; title?: string; children: React.ReactNode; disabled?: boolean }> = ({
  onClick,
  title,
  children,
  disabled,
}) => (
  <button
    className="btn-secondary"
    style={{ padding: '3px 7px', fontSize: 10, flexShrink: 0 }}
    title={title}
    disabled={disabled}
    onClick={(e) => {
      e.stopPropagation();
      onClick(e);
    }}
  >
    {children}
  </button>
);

export const MediaLibrary: React.FC<MediaLibraryProps> = ({
  width = 280,
  onAddPreset,
  onImportCustomMedia,
  onAddCaptionTrack,
  selectedClip,
  hasCaptions,
  compWidth,
  compHeight,
  fps,
  onUpdateSelected,
  onUpdateAllCaptions,
  onUpdateAllScenes,
  onAddClip,
  onApplyStyle,
}) => {
  const [tab, setTab] = useState<Tab>('styles');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const previewSfx = (id: string) => {
    audioRef.current?.pause();
    const a = new Audio(`./sfx/${id}.wav`);
    a.volume = 0.8;
    audioRef.current = a;
    a.play().catch(() => undefined);
  };

  const selectedIsCaption = selectedClip?.type === 'caption';
  const selectedIsMedia = isMedia(selectedClip);
  const selectedIsText = selectedClip?.type === 'text';

  const targetHint = (() => {
    if (!selectedClip) return 'No clip selected';
    return `Selected: ${selectedClip.name}`;
  })();

  const resetCaptionStyle = { y: undefined, fontSize: undefined, color: undefined, backgroundColor: undefined, fontFamily: undefined, fontWeight: undefined };

  return (
    <aside
      style={{
        width: `${width}px`,
        minWidth: `${width}px`,
        maxWidth: `${width}px`,
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <div className="tab-bar">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '12px 12px 20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tab !== 'assets' && tab !== 'styles' && tab !== 'sfx' && <div className="lib-hint">{targetHint}</div>}

        {/* ---------------- Assets ---------------- */}
        {tab === 'assets' && (
          <>
            <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={onImportCustomMedia}>
              <FolderOpen size={15} /> Import Video / Image / Audio
            </button>
            <button
              className="btn-secondary"
              style={{ width: '100%', justifyContent: 'center', borderColor: 'rgba(250, 204, 21, 0.3)', color: '#facc15' }}
              onClick={onAddCaptionTrack}
            >
              <Subtitles size={15} /> Add Caption Clip
            </button>
            <div className="section-label" style={{ marginTop: 8 }}>Stickers</div>
            {PRO_PRESETS.map((item) => (
              <button key={item.name} className="lib-item" onClick={() => onAddPreset(item)}>
                <Sparkles size={14} color="#818cf8" />
                <span style={{ fontSize: 12, fontWeight: 600 }}>{item.name}</span>
              </button>
            ))}
          </>
        )}

        {/* ---------------- Styles ---------------- */}
        {tab === 'styles' && (
          <>
            <div className="lib-hint">
              Re-style the whole video: color grade, effects and camera motion on every scene, plus the caption look.
            </div>
            {VIDEO_STYLES.map((s) => (
              <div key={s.id} className="lib-item" style={{ flexDirection: 'column', alignItems: 'stretch', cursor: 'default' }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>
                  {s.emoji} {s.name}
                </div>
                <div className="lib-hint">{s.description}</div>
                <SmallButton onClick={() => onApplyStyle(s.id)}>
                  <Wand2 size={10} /> Apply to project
                </SmallButton>
              </div>
            ))}
          </>
        )}

        {/* ---------------- Captions ---------------- */}
        {tab === 'captions' && (
          <>
            <div className="lib-hint">
              Click to style the selected caption. "All" restyles every caption; "+" adds a new caption at the playhead.
            </div>
            {CAPTION_TEMPLATES.map((c) => (
              <div
                key={c.id}
                className="lib-item"
                onClick={() => selectedIsCaption && onUpdateSelected({ captionTemplate: c.id, ...resetCaptionStyle })}
                style={{ cursor: selectedIsCaption ? 'pointer' : 'default' }}
              >
                <span
                  style={{
                    fontFamily: c.fontFamily,
                    fontWeight: c.fontWeight as React.CSSProperties['fontWeight'],
                    textTransform: c.uppercase ? 'uppercase' : 'none',
                    color: c.activeBg ? '#fff' : c.activeColor,
                    background: c.activeBg ?? c.containerBg,
                    WebkitTextStroke: c.strokeWidth ? `1px ${c.strokeColor}` : undefined,
                    fontSize: 13,
                    padding: '1px 6px',
                    borderRadius: 4,
                    flex: 1,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {c.name}
                </span>
                <SmallButton onClick={() => onUpdateAllCaptions({ captionTemplate: c.id, ...resetCaptionStyle })} disabled={!hasCaptions} title="Apply to all captions">
                  All
                </SmallButton>
                <SmallButton
                  title="Add a caption with this style"
                  onClick={() =>
                    onAddClip(
                      {
                        type: 'caption',
                        name: 'Caption',
                        role: 'caption',
                        content: 'TYPE YOUR CAPTION TEXT HERE',
                        captionTemplate: c.id,
                        durationInFrames: fps * 3,
                      },
                      'caption'
                    )
                  }
                >
                  <Plus size={10} />
                </SmallButton>
              </div>
            ))}
          </>
        )}

        {/* ---------------- Titles ---------------- */}
        {tab === 'titles' && (
          <>
            <div className="lib-hint">Click to add at the playhead. "Style" restyles the selected text clip.</div>
            {TITLE_TEMPLATES.map((t) => {
              const props = t.apply(compWidth, compHeight);
              return (
                <div
                  key={t.id}
                  className="lib-item"
                  onClick={() =>
                    onAddClip(
                      {
                        type: 'text',
                        name: t.name,
                        role: 'overlay',
                        textTemplate: t.id,
                        ...props,
                        content: t.sample,
                        durationInFrames: fps * 3,
                      },
                      'overlay'
                    )
                  }
                >
                  <Type size={13} color="var(--track-text)" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{t.name}</div>
                    <div
                      className="lib-hint"
                      style={{
                        fontFamily: props.fontFamily,
                        color: props.color,
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {t.sample}
                    </div>
                  </div>
                  <SmallButton
                    disabled={!selectedIsText}
                    title="Apply this look to the selected text clip"
                    onClick={() => {
                      const { x, y, ...look } = props;
                      onUpdateSelected({ ...look, textTemplate: t.id });
                    }}
                  >
                    Style
                  </SmallButton>
                </div>
              );
            })}
          </>
        )}

        {/* ---------------- Transitions ---------------- */}
        {tab === 'transitions' && (
          <>
            <div className="lib-hint">Set how the selected clip enters (In) or leaves (Out).</div>
            {TRANSITIONS.filter((t) => t.id !== 'slide').map((t) => (
              <div key={t.id} className="lib-item" style={{ cursor: 'default' }}>
                <ArrowRightLeft size={13} color="#06b6d4" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{t.name}</div>
                  <div className="lib-hint">{t.category}</div>
                </div>
                <SmallButton
                  disabled={!selectedClip}
                  onClick={() =>
                    onUpdateSelected({ inTransition: t.id, inTransitionDuration: Math.max(1, Math.round(t.defaultSeconds * fps)) })
                  }
                >
                  In
                </SmallButton>
                <SmallButton
                  disabled={!selectedClip}
                  onClick={() =>
                    onUpdateSelected({ outTransition: t.id, outTransitionDuration: Math.max(1, Math.round(t.defaultSeconds * fps)) })
                  }
                >
                  Out
                </SmallButton>
              </div>
            ))}
          </>
        )}

        {/* ---------------- Effects ---------------- */}
        {tab === 'effects' && (
          <>
            <div className="section-label">Looks (grade + effects)</div>
            {EFFECT_PRESETS.map((p) => (
              <div
                key={p.id}
                className="lib-item"
                onClick={() => selectedIsMedia && onUpdateSelected({ colorFilter: p.colorFilter, effects: { ...p.effects } })}
                style={{ cursor: selectedIsMedia ? 'pointer' : 'default' }}
              >
                <Palette size={13} color="#ec4899" />
                <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{p.name}</span>
                <SmallButton title="Apply to every scene" onClick={() => onUpdateAllScenes({ colorFilter: p.colorFilter, effects: { ...p.effects } })}>
                  All
                </SmallButton>
              </div>
            ))}
            <div className="section-label" style={{ marginTop: 8 }}>Color grades only</div>
            {COLOR_GRADES.map((g) => (
              <div
                key={g.id}
                className="lib-item"
                onClick={() => selectedClip && onUpdateSelected({ colorFilter: g.id })}
                style={{ cursor: selectedClip ? 'pointer' : 'default' }}
              >
                <span
                  style={{
                    width: 26,
                    height: 16,
                    borderRadius: 3,
                    flexShrink: 0,
                    background: 'linear-gradient(90deg, #f97316, #22c55e, #3b82f6)',
                    filter: g.filter || undefined,
                  }}
                />
                <span style={{ fontSize: 12, flex: 1 }}>{g.name}</span>
                <SmallButton title="Apply to every scene" onClick={() => onUpdateAllScenes({ colorFilter: g.id })}>
                  All
                </SmallButton>
              </div>
            ))}
          </>
        )}

        {/* ---------------- Motion ---------------- */}
        {tab === 'motion' && (
          <>
            <div className="lib-hint">Camera movement for images and videos.</div>
            {MOTIONS.map((m) => (
              <div
                key={m.id}
                className="lib-item"
                onClick={() => selectedIsMedia && onUpdateSelected({ motion: m.id })}
                style={{ cursor: selectedIsMedia ? 'pointer' : 'default' }}
              >
                <Move size={13} color="#38bdf8" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{m.name}</div>
                  <div className="lib-hint">{m.description}</div>
                </div>
                <SmallButton title="Apply to every scene" onClick={() => onUpdateAllScenes({ motion: m.id })}>
                  All
                </SmallButton>
              </div>
            ))}
          </>
        )}

        {/* ---------------- Sound effects ---------------- */}
        {tab === 'sfx' && (
          <>
            <div className="lib-hint">▶ to listen, + to place at the playhead.</div>
            {Array.from(new Set(SFX_LIBRARY.map((s) => s.category))).map((cat) => (
              <React.Fragment key={cat}>
                <div className="section-label" style={{ marginTop: 6 }}>{cat}</div>
                {SFX_LIBRARY.filter((s) => s.category === cat).map((s) => (
                  <div key={s.id} className="lib-item" style={{ cursor: 'default' }} title={s.usage}>
                    <Volume2 size={13} color="var(--track-audio)" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{s.name}</div>
                      <div className="lib-hint" style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {s.usage}
                      </div>
                    </div>
                    <SmallButton onClick={() => previewSfx(s.id)} title="Preview">
                      <Play size={10} />
                    </SmallButton>
                    <SmallButton
                      title="Add at playhead"
                      onClick={() =>
                        onAddClip(
                          {
                            type: 'audio',
                            name: `SFX: ${s.name}`,
                            role: 'sfx',
                            src: sfxSrc(s.id),
                            volume: 60,
                            durationInFrames: Math.max(2, Math.round(s.seconds * fps) + 2),
                          },
                          'sfx'
                        )
                      }
                    >
                      <Plus size={10} />
                    </SmallButton>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </>
        )}
      </div>
    </aside>
  );
};
