import React, { useEffect, useState } from 'react';
import {
  X,
  Wand2,
  FolderOpen,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Music,
  Film,
  Image as ImageIcon,
  Mic,
  Subtitles,
  Settings2,
} from 'lucide-react';
import { VIDEO_STYLES, getVideoStyle } from '../templates/styles';
import { buildAiRequest, sanitizePlan } from '../automation/aiPlan';
import { buildProjectFromPipeline, BuildResult } from '../automation/buildFromPipeline';
import { AiEditPlan, AspectRatio, PipelineJobData, PipelineJobSummary } from '../automation/types';
import { getElectronAPI, getMediaDurationInFrames } from '../utils/media';

interface AutoEditModalProps {
  onClose: () => void;
  onApply: (result: BuildResult) => void;
  onOpenSettings: () => void;
  settingsVersion: number; // bumps after settings change so the key status refreshes
}

type Phase = 'setup' | 'working' | 'done' | 'ai-failed';

const FPS = 30;

export const AutoEditModal: React.FC<AutoEditModalProps> = ({ onClose, onApply, onOpenSettings, settingsVersion }) => {
  const api = getElectronAPI();
  const [jobs, setJobs] = useState<PipelineJobSummary[]>([]);
  const [jobsDir, setJobsDir] = useState('');
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [selectedDir, setSelectedDir] = useState<string | null>(null);
  const [customDir, setCustomDir] = useState<string | null>(null);
  const [styleId, setStyleId] = useState('documentary');
  const [aspect, setAspect] = useState<AspectRatio>('16:9');
  const [useAi, setUseAi] = useState(true);
  const [hasKey, setHasKey] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [introTitle, setIntroTitle] = useState('');
  const [music, setMusic] = useState<{ url: string; path: string; name: string } | null>(null);
  const [phase, setPhase] = useState<Phase>('setup');
  const [steps, setSteps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BuildResult | null>(null);
  const [pendingJob, setPendingJob] = useState<{ job: PipelineJobData; voiceFrames: number | null } | null>(null);

  const refreshJobs = async () => {
    if (!api?.pipeline) return;
    setLoadingJobs(true);
    const res = await api.pipeline.listJobs();
    setJobs(res.jobs || []);
    setJobsDir(res.jobsDir || '');
    setLoadingJobs(false);
    const firstReady = (res.jobs || []).find((j: PipelineJobSummary) => j.ready);
    setSelectedDir((prev) => prev ?? firstReady?.jobDir ?? null);
  };

  useEffect(() => {
    refreshJobs();
  }, []);

  useEffect(() => {
    api?.settings?.get().then((s: any) => {
      setHasKey(!!s.hasOpenAIKey);
      if (!s.hasOpenAIKey) setUseAi(false);
    });
  }, [settingsVersion]);

  const style = getVideoStyle(styleId);

  const chooseStyle = (id: string) => {
    setStyleId(id);
    setAspect(getVideoStyle(id).recommendedAspect);
  };

  const pickFolder = async () => {
    const dir = await api.pipeline.pickJobFolder();
    if (dir) {
      setCustomDir(dir);
      setSelectedDir(dir);
    }
  };

  const pickMusic = async () => {
    const m = await api.openAudio();
    if (m) setMusic({ url: m.url, path: m.filePath, name: m.fileName });
  };

  const log = (text: string) => setSteps((prev) => [...prev, text]);

  const finish = (job: PipelineJobData, voiceFrames: number | null, plan: AiEditPlan | null) => {
    log('Building timeline: scenes, transitions, captions, sound effects...');
    const built = buildProjectFromPipeline(job, {
      style,
      aspect,
      fps: FPS,
      voiceDurationFrames: voiceFrames,
      music,
      plan,
      captionsEnabled: captions,
      introTitle,
    });
    onApply(built);
    setResult(built);
    setPhase('done');
  };

  const create = async () => {
    if (!selectedDir) return;
    setPhase('working');
    setSteps([]);
    setError(null);

    try {
      log('Loading content from the pipeline job...');
      const res = await api.pipeline.loadJob(selectedDir);
      if (!res.success) throw new Error(res.error);
      const job: PipelineJobData = res.job;
      log(`Found ${job.scenes.length} scenes${job.voiceover ? ', voiceover' : ''}${job.srtCues.length ? `, ${job.srtCues.length} subtitle lines` : ''}.`);

      let voiceFrames: number | null = null;
      if (job.voiceover) {
        voiceFrames = await getMediaDurationInFrames(job.voiceover.url, 'audio', FPS);
        if (voiceFrames) log(`Voiceover length: ${(voiceFrames / FPS).toFixed(1)}s`);
      }

      if (useAi && hasKey) {
        log('ChatGPT is planning the edit (motion, transitions, SFX, highlights)...');
        const ai = await api.ai.planEdit(buildAiRequest(job, style));
        if (!ai.success) {
          setPendingJob({ job, voiceFrames });
          setError(ai.error);
          setPhase('ai-failed');
          return;
        }
        const plan = sanitizePlan(ai.plan, style, job.scenes.length);
        const tokens = ai.usage?.total_tokens ? ` (${ai.usage.total_tokens} tokens)` : '';
        log(`AI edit plan ready from ${ai.model}${tokens}.`);
        finish(job, voiceFrames, plan);
      } else {
        log(`Applying the "${style.name}" style rules...`);
        finish(job, voiceFrames, null);
      }
    } catch (err: any) {
      setError(err?.message || String(err));
      setPhase('setup');
    }
  };

  const continueWithoutAi = () => {
    if (!pendingJob) return;
    setPhase('working');
    log(`Continuing without AI, using the "${style.name}" style rules...`);
    finish(pendingJob.job, pendingJob.voiceFrames, null);
  };

  if (!api?.pipeline) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" style={{ width: 480 }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-body">
            <div className="notice">AI Auto Edit reads pipeline jobs from disk, so it only works in the desktop app.</div>
          </div>
        </div>
      </div>
    );
  }

  const selectedJob = jobs.find((j) => j.jobDir === selectedDir);

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ width: 'min(980px, calc(100vw - 48px))' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wand2 size={18} color="#818cf8" />
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>AI Auto Edit — one click video</h3>
          </div>
          {phase !== 'working' && (
            <button className="btn-icon" onClick={onClose}>
              <X size={16} />
            </button>
          )}
        </div>

        {phase === 'setup' && (
          <>
            <div className="modal-body">
              {/* 1. Content */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span className="section-label">1. Content from the pipeline</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={refreshJobs}>
                      <RefreshCw size={12} /> Refresh
                    </button>
                    <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={pickFolder}>
                      <FolderOpen size={12} /> Browse folder
                    </button>
                  </div>
                </div>

                {loadingJobs ? (
                  <div className="lib-hint">
                    <Loader2 size={12} className="spin" /> Looking for pipeline jobs...
                  </div>
                ) : jobs.length === 0 && !customDir ? (
                  <div className="notice">
                    No pipeline jobs found in {jobsDir || 'the pipeline folder'}. Run the Script Video Creator pipeline
                    first, or use "Browse folder" to pick a job folder.
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                      gap: 8,
                      maxHeight: 210,
                      overflowY: 'auto',
                      paddingRight: 4,
                    }}
                  >
                    {customDir && !jobs.some((j) => j.jobDir === customDir) && (
                      <button
                        className={`choice-card ${selectedDir === customDir ? 'selected' : ''}`}
                        onClick={() => setSelectedDir(customDir)}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700 }}>Selected folder</div>
                        <div className="lib-hint" style={{ wordBreak: 'break-all' }}>{customDir}</div>
                      </button>
                    )}
                    {jobs.map((job) => (
                      <button
                        key={job.jobDir}
                        className={`choice-card ${selectedDir === job.jobDir ? 'selected' : ''}`}
                        disabled={!job.ready}
                        onClick={() => setSelectedDir(job.jobDir)}
                        title={job.ready ? job.title : 'This job has not finished the pipeline yet'}
                        style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}
                      >
                        <div
                          style={{
                            width: 56,
                            height: 36,
                            borderRadius: 4,
                            flexShrink: 0,
                            background: job.thumbnailUrl ? `center / cover no-repeat url("${job.thumbnailUrl}")` : 'var(--bg-hover)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {!job.thumbnailUrl && <Film size={14} color="var(--text-dim)" />}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {job.title}
                          </div>
                          <div className="lib-hint" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {job.ready ? (
                              <>
                                <span>{job.sceneCount} scenes</span>
                                <span>{Math.round(job.durationSec)}s</span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                  <ImageIcon size={10} />
                                  {job.mediaCount}/{job.sceneCount}
                                </span>
                                {job.hasAudio && <Mic size={10} />}
                                {job.hasSrt && <Subtitles size={10} />}
                              </>
                            ) : (
                              <span>Not finished</span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {selectedJob && selectedJob.mediaCount < selectedJob.sceneCount && (
                  <div className="notice" style={{ marginTop: 8 }}>
                    {selectedJob.sceneCount - selectedJob.mediaCount} of {selectedJob.sceneCount} scenes have no image yet
                    and will be black. Generate the images in the pipeline for a complete video.
                  </div>
                )}
              </section>

              {/* 2. Style */}
              <section>
                <div className="section-label" style={{ marginBottom: 8 }}>2. Video style</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 8 }}>
                  {VIDEO_STYLES.map((s) => (
                    <button
                      key={s.id}
                      className={`choice-card ${styleId === s.id ? 'selected' : ''}`}
                      onClick={() => chooseStyle(s.id)}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                        {s.emoji} {s.name}
                      </div>
                      <div className="lib-hint">{s.description}</div>
                    </button>
                  ))}
                </div>
              </section>

              {/* 3. Options */}
              <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="section-label">3. Options</div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    Format
                    <select value={aspect} onChange={(e) => setAspect(e.target.value as AspectRatio)} style={{ width: 200 }}>
                      <option value="16:9">16:9 YouTube (1920×1080)</option>
                      <option value="9:16">9:16 Shorts/Reels (1080×1920)</option>
                      <option value="1:1">1:1 Square (1080×1080)</option>
                    </select>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={captions} onChange={(e) => setCaptions(e.target.checked)} style={{ width: 'auto' }} />
                    Add animated captions
                  </label>
                  {style.introTitle && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      Intro title
                      <input
                        type="text"
                        value={introTitle}
                        onChange={(e) => setIntroTitle(e.target.value)}
                        placeholder={useAi && hasKey ? 'Empty = ChatGPT writes it' : 'Empty = no intro title'}
                        style={{ width: 230 }}
                      />
                    </label>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: 11 }} onClick={pickMusic}>
                      <Music size={12} /> {music ? 'Change music' : 'Add background music'}
                    </button>
                    {music && (
                      <>
                        <span className="lib-hint" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170 }}>
                          {music.name}
                        </span>
                        <button className="btn-icon" onClick={() => setMusic(null)} title="Remove music">
                          <X size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="section-label">4. AI editor</div>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      fontSize: 12,
                      cursor: hasKey ? 'pointer' : 'not-allowed',
                      opacity: hasKey ? 1 : 0.6,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={useAi && hasKey}
                      disabled={!hasKey}
                      onChange={(e) => setUseAi(e.target.checked)}
                      style={{ width: 'auto', marginTop: 2 }}
                    />
                    <span>
                      Let ChatGPT edit: it reads the script and picks motion, transitions, sound effects, highlight words and
                      on-screen text for every scene.
                    </span>
                  </label>
                  {!hasKey && (
                    <button className="btn-secondary" style={{ alignSelf: 'flex-start', padding: '5px 10px', fontSize: 11 }} onClick={onOpenSettings}>
                      <Settings2 size={12} /> Add OpenAI API key
                    </button>
                  )}
                  <div className="lib-hint">Without AI the style rules are used — still a complete edit.</div>
                </div>
              </section>

              {error && <div className="notice error">{error}</div>}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button className="btn-primary" onClick={create} disabled={!selectedDir} style={{ padding: '10px 18px' }}>
                <Wand2 size={15} /> Create Edited Video
              </button>
            </div>
          </>
        )}

        {(phase === 'working' || phase === 'done' || phase === 'ai-failed') && (
          <>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {steps.map((s, i) => {
                  const isLast = i === steps.length - 1;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      {isLast && phase === 'working' ? (
                        <Loader2 size={15} className="spin" color="#818cf8" />
                      ) : (
                        <CheckCircle2 size={15} color="#10b981" />
                      )}
                      <span>{s}</span>
                    </div>
                  );
                })}
              </div>

              {phase === 'ai-failed' && (
                <div className="notice error">
                  ChatGPT could not plan the edit: {error}
                  <br />
                  You can continue with the style rules instead.
                </div>
              )}

              {phase === 'done' && result && (
                <div className="notice success">
                  Video ready in the editor: {result.summary.scenes} scenes, {result.summary.captions} captions,{' '}
                  {result.summary.sfx} sound effects, {result.summary.overlays} on-screen texts
                  {result.summary.aiUsed ? ' (edited by ChatGPT)' : ' (style rules)'} —{' '}
                  {(result.settings.durationInFrames / result.settings.fps).toFixed(1)}s.
                  {result.summary.missingMedia > 0 && ` ${result.summary.missingMedia} scenes have no image.`}
                  <br />
                  Press Space to preview. Click any clip to change it, or pick templates from the left panel.
                </div>
              )}
            </div>
            <div className="modal-footer">
              {phase === 'ai-failed' && (
                <>
                  <button className="btn-secondary" onClick={() => setPhase('setup')}>
                    Back
                  </button>
                  <button className="btn-primary" onClick={continueWithoutAi}>
                    Continue without AI
                  </button>
                </>
              )}
              {phase === 'done' && (
                <button className="btn-primary" onClick={onClose}>
                  Open in Editor
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
