import React from 'react';
import {
  Sparkles,
  Play,
  FolderOpen,
  Save,
  Download,
  Plus,
  Maximize2,
  Video,
  Layers,
  Settings2,
  Subtitles,
  Undo2,
  Redo2,
  Wand2,
} from 'lucide-react';
import { CompositionSettings } from '../types/project';

interface HeaderProps {
  settings: CompositionSettings;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onUpdateSettings: (settings: Partial<CompositionSettings>) => void;
  onSaveProject: () => void;
  onLoadProject: () => void;
  onExport: () => void;
  onAddTextClip: () => void;
  onAddMediaClip: () => void;
  onAddShapeClip: () => void;
  onAddCaptionClip: () => void;
  onAutoEdit: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onUpdateSettings,
  onSaveProject,
  onLoadProject,
  onExport,
  onAddTextClip,
  onAddMediaClip,
  onAddShapeClip,
  onAddCaptionClip,
  onAutoEdit,
  onOpenSettings,
}) => {
  return (
    <header
      style={{
        height: '52px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 50,
      }}
    >
      {/* Brand & Project Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(99, 102, 241, 0.1)',
            padding: '5px 10px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
          }}
        >
          <Sparkles size={18} color="#818cf8" />
          <span style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '-0.3px' }}>
            <span style={{ color: '#fff' }}>Easy AI Hub</span>
            <span style={{ color: '#818cf8', marginLeft: '4px' }}>Video Editor</span>
          </span>
        </div>

        {/* Undo / Redo controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            className="btn-icon"
            disabled={!canUndo}
            onClick={onUndo}
            title="Undo (Ctrl+Z)"
            style={{ opacity: canUndo ? 1 : 0.4 }}
          >
            <Undo2 size={15} />
          </button>
          <button
            className="btn-icon"
            disabled={!canRedo}
            onClick={onRedo}
            title="Redo (Ctrl+Y)"
            style={{ opacity: canRedo ? 1 : 0.4 }}
          >
            <Redo2 size={15} />
          </button>
        </div>

        <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--border-color)' }} />

        <input
          type="text"
          value={settings.title}
          onChange={(e) => onUpdateSettings({ title: e.target.value })}
          style={{
            background: 'transparent',
            border: '1px solid transparent',
            color: 'var(--text-main)',
            fontWeight: 600,
            fontSize: '13px',
            padding: '4px 8px',
            borderRadius: '4px',
            width: '200px',
          }}
          placeholder="Untitled Video Project"
        />

        {/* Aspect Ratio / Preset Selector */}
        <select
          value={`${settings.width}x${settings.height}`}
          onChange={(e) => {
            const [w, h] = e.target.value.split('x').map(Number);
            const titleMap: Record<string, string> = {
              '1920x1080': 'YouTube Long Video (16:9)',
              '3840x2160': 'YouTube 4K Ultra HD (16:9)',
              '1280x720': 'YouTube 720p HD (16:9)',
              '1080x1920': 'Shorts / Reels / TikTok (9:16)',
              '1080x1080': 'Instagram Square (1:1)',
            };
            onUpdateSettings({ width: w, height: h, title: titleMap[e.target.value] ?? settings.title });
          }}
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            fontSize: '12px',
            padding: '4px 8px',
            borderRadius: '6px',
            color: 'var(--text-muted)',
            width: '160px',
          }}
        >
          <option value="1920x1080">🎬 YouTube Long Video (16:9 1080p)</option>
          <option value="3840x2160">🎬 YouTube 4K Ultra HD (16:9 2160p)</option>
          <option value="1280x720">🎬 YouTube 720p HD (16:9)</option>
          <option value="1080x1920">📱 Shorts / Reels / TikTok (9:16)</option>
          <option value="1080x1080">📸 Instagram Square (1:1)</option>
        </select>

        {/* Total video length (seconds) */}
        <label
          title="Total video length in seconds"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}
        >
          Length
          <input
            key={settings.durationInFrames}
            type="number"
            min={1}
            max={36000}
            step={1}
            defaultValue={Math.round((settings.durationInFrames / settings.fps) * 10) / 10}
            onBlur={(e) => {
              const seconds = Number(e.target.value);
              if (Number.isFinite(seconds) && seconds > 0) {
                onUpdateSettings({
                  durationInFrames: Math.max(1, Math.round(Math.min(seconds, 36000) * settings.fps)),
                });
              } else {
                e.target.value = String(Math.round((settings.durationInFrames / settings.fps) * 10) / 10);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            style={{
              width: '70px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              fontSize: '12px',
              padding: '4px 6px',
              borderRadius: '6px',
              color: 'var(--text-main)',
            }}
          />
          s
        </label>
      </div>

      {/* Quick Add Elements */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          className="btn-primary"
          onClick={onAutoEdit}
          title="Create a fully edited video from a pipeline job"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #ec4899)' }}
        >
          <Wand2 size={14} /> AI Auto Edit
        </button>
        <button
          className="btn-secondary"
          onClick={onAddTextClip}
          title="Add Animated Text Title"
        >
          <Plus size={14} /> Add Text
        </button>
        <button
          className="btn-secondary"
          onClick={onAddCaptionClip}
          title="Add Viral Karaoke Captions"
        >
          <Subtitles size={14} /> Add Captions
        </button>
        <button
          className="btn-secondary"
          onClick={onAddShapeClip}
          title="Add Decorative Shape / Badge"
        >
          <Plus size={14} /> Add Badge
        </button>
        <button
          className="btn-secondary"
          onClick={onAddMediaClip}
          title="Import Media File (Video, Audio, Image)"
        >
          <FolderOpen size={14} /> Import Media
        </button>
      </div>

      {/* Project Actions & Export */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button className="btn-icon" onClick={onOpenSettings} title="AI Settings">
          <Settings2 size={16} />
        </button>
        <button
          className="btn-secondary"
          onClick={onLoadProject}
          title="Open Project from File"
        >
          <FolderOpen size={15} /> Open
        </button>
        <button
          className="btn-secondary"
          onClick={onSaveProject}
          title="Save Project"
        >
          <Save size={15} /> Save
        </button>
        <button
          className="btn-primary"
          onClick={onExport}
          title="Export / Render Video"
        >
          <Download size={15} /> Render Video
        </button>
      </div>
    </header>
  );
};
