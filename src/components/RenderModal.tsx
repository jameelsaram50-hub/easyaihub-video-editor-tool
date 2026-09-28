import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Terminal,
  Copy,
  Check,
  Sparkles,
  Loader2,
  FolderCheck,
  ExternalLink,
  Film,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { CompositionSettings, TimelineClip, RenderProgressData, RenderCodec } from '../types/project';

interface RenderModalProps {
  settings: CompositionSettings;
  clips: TimelineClip[];
  hiddenTracks?: Record<number, boolean>;
  onClose: () => void;
}

const CODEC_LABELS: Record<RenderCodec, string> = {
  h264: 'H.264 MP4',
  h265: 'H.265 MP4',
  vp9: 'VP9 WebM',
  prores: 'ProRes MOV',
};

export const RenderModal: React.FC<RenderModalProps> = ({
  settings,
  clips,
  hiddenTracks = {},
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [stageText, setStageText] = useState<string>('Ready to render');
  const [completedFilePath, setCompletedFilePath] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [codec, setCodec] = useState<RenderCodec>('h264');
  const [isCancelling, setIsCancelling] = useState(false);

  // Electron real-time progress listener
  useEffect(() => {
    const electron = (window as any).electronAPI;
    if (!electron?.onRenderProgress) return;

    const cleanup = electron.onRenderProgress((data: RenderProgressData & { stage?: string }) => {
      if (data.stage === 'bundling') {
        setStageText('Preparing Remotion composition...');
        return;
      }
      setRenderProgress(Math.round(data.progress * 100));
      if (data.stitchStage === 'rendering') {
        setStageText(`Rendering frames (${data.renderedFrames} / ${data.totalFrames})...`);
      } else if (data.stitchStage === 'encoding') {
        setStageText(`Encoding video stream (${data.encodedFrames} / ${data.totalFrames})...`);
      } else if (data.stitchStage === 'muxing') {
        setStageText('Muxing audio and video streams with FFmpeg...');
      }
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const cliCommand = `npx remotion render src/index.ts Main out/${settings.title.toLowerCase().replace(/\s+/g, '-') || 'video'}.mp4 --props='${JSON.stringify({ settings, clips, hiddenTracks })}'`;

  const handleCopyCli = () => {
    navigator.clipboard.writeText(cliCommand).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Clipboard API unavailable (non-HTTPS or permissions denied)
      // Silently ignore — the user can manually copy the displayed command
    });
  };

  // Start In-App MP4 Rendering through Electron
  const handleStartNativeRender = async () => {
    const electron = (window as any).electronAPI;
    if (!electron?.startRender) {
      alert('Native rendering requires running inside the Electron desktop application.');
      return;
    }

    // 1. Choose output destination file
    const chosenPath = await electron.selectRenderOutput({
      defaultName: settings.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'video',
      codec,
    });

    if (!chosenPath) return;

    setIsRendering(true);
    setIsCancelling(false);
    setRenderProgress(0);
    setRenderError(null);
    setCompletedFilePath(null);
    setStageText('Preparing Remotion composition...');

    let result: { success: boolean; outputPath?: string; error?: string };
    try {
      result = await electron.startRender({
        outputPath: chosenPath,
        settings,
        clips,
        hiddenTracks,
        codec,
        crf: 18,
      });
    } catch (err: any) {
      result = { success: false, error: err?.message || String(err) };
    }

    setIsRendering(false);
    setIsCancelling(false);

    if (result.success && result.outputPath) {
      setRenderProgress(100);
      setCompletedFilePath(result.outputPath);
      setStageText('Render completed successfully!');
    } else {
      setRenderError(result.error || 'Failed to render video.');
    }
  };

  const handleCancelRender = async () => {
    const electron = (window as any).electronAPI;
    if (!electron?.cancelRender) return;
    setIsCancelling(true);
    setStageText('Cancelling render...');
    await electron.cancelRender();
  };

  const handleRevealInFolder = () => {
    const electron = (window as any).electronAPI;
    if (electron?.showItemInFolder && completedFilePath) {
      electron.showItemInFolder(completedFilePath);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '580px',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255,255,255,0.12)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Film size={18} color="#818cf8" />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
              Render & Export High-Quality Video
            </h3>
          </div>
          {!isRendering && (
            <button className="btn-icon" onClick={onClose}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Video specs summary card */}
          <div
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              textAlign: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Output Preset</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                {CODEC_LABELS[codec]}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Dimensions</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                {settings.width} × {settings.height}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Total Duration</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                {(settings.durationInFrames / settings.fps).toFixed(1)}s ({settings.durationInFrames}f)
              </div>
            </div>
          </div>

          {/* Codec Selection */}
          {!isRendering && !completedFilePath && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  VIDEO CODEC
                </label>
                <select
                  value={codec}
                  onChange={(e) => setCodec(e.target.value as RenderCodec)}
                >
                  <option value="h264">H.264 MP4 (Maximum Compatibility)</option>
                  <option value="h265">H.265 / HEVC MP4 (High Efficiency)</option>
                  <option value="vp9">VP9 WebM (Web)</option>
                  <option value="prores">Apple ProRes MOV (Studio Master)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  FRAME RATE
                </label>
                <input
                  type="text"
                  disabled
                  value={`${settings.fps} FPS (Remotion Configured)`}
                />
              </div>
            </div>
          )}

          {/* Active Render Progress Bar */}
          {isRendering && (
            <div style={{ backgroundColor: '#0f121d', padding: '16px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                  <Loader2 size={16} className="spin" color="#818cf8" />
                  <span>{stageText}</span>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#818cf8', fontFamily: "'JetBrains Mono', monospace" }}>
                  {renderProgress}%
                </span>
              </div>

              <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${renderProgress}%`,
                    height: '100%',
                    background: 'var(--accent-gradient)',
                    transition: 'width 0.15s ease',
                  }}
                />
              </div>
            </div>
          )}

          {/* Success Result Box */}
          {completedFilePath && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={20} color="#10b981" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                    Render Finished!
                  </div>
                  <div style={{ fontSize: '11px', color: '#a7f3d0', maxWidth: '340px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {completedFilePath}
                  </div>
                </div>
              </div>

              <button className="btn-secondary" onClick={handleRevealInFolder}>
                <FolderCheck size={14} /> Open Folder
              </button>
            </div>
          )}

          {/* Error Result Box */}
          {renderError && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#fca5a5',
                fontSize: '12px',
                display: 'flex',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} />
              <div>{renderError}</div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
            {!isRendering && !completedFilePath && (
              <button
                className="btn-primary"
                style={{ flex: 1, padding: '12px 20px', fontSize: '14px', justifyContent: 'center' }}
                onClick={handleStartNativeRender}
              >
                <Download size={16} /> Render Video
              </button>
            )}

            {isRendering && (
              <button
                className="btn-secondary"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={handleCancelRender}
                disabled={isCancelling}
              >
                <X size={14} /> {isCancelling ? 'Cancelling...' : 'Cancel Render'}
              </button>
            )}

            <button
              className="btn-secondary"
              style={{ flex: completedFilePath ? 1 : undefined, justifyContent: 'center' }}
              onClick={handleCopyCli}
            >
              {copied ? <Check size={14} /> : <Terminal size={14} />}
              {copied ? 'CLI Copied!' : 'Copy CLI Command'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
