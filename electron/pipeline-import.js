const fs = require('fs');
const path = require('path');

/**
 * Reads jobs produced by the "Script Video Creator" pipeline app
 * (%APPDATA%/script-video-creator/jobs/<job_id>/). A finished job contains:
 *   job.json          – step status + outputs
 *   final_table.json  – one row per scene: narration, timing, image file
 *   audio.mp3         – voiceover
 *   subtitles.srt     – subtitle cues
 *   images/           – scene images (or videos)
 */

const VIDEO_EXTS = ['.mp4', '.webm', '.mov', '.m4v', '.mkv'];
const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'];

function getJobsDir(appDataDir) {
  return path.join(appDataDir, 'script-video-creator', 'jobs');
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function firstExisting(candidates) {
  return candidates.find((p) => p && fs.existsSync(p)) || null;
}

function getRows(jobDir, job) {
  const fromFile = readJson(path.join(jobDir, 'final_table.json'));
  if (Array.isArray(fromFile) && fromFile.length > 0) return fromFile;
  const fromJob = job?.steps?.final_table?.rows;
  return Array.isArray(fromJob) ? fromJob : [];
}

function getTitle(jobDir, job, rows) {
  if (job?.project_name) return String(job.project_name);
  if (job?.settings?.project_name) return String(job.settings.project_name);
  const topic = job?.steps?.topic?.output;
  if (typeof topic === 'string') {
    const match = /TOPIC:\s*(.+)/i.exec(topic);
    if (match) return match[1].trim().slice(0, 120);
  }
  try {
    const script = fs.readFileSync(path.join(jobDir, 'script.txt'), 'utf8').trim();
    const firstLine = script.split(/\r?\n/).find((l) => l.trim().length > 0);
    if (firstLine) return firstLine.trim().slice(0, 80);
  } catch {
    // no script file
  }
  if (rows[0]?.narration) return String(rows[0].narration).slice(0, 80);
  return job?.job_id || path.basename(jobDir);
}

function parseSrtTime(value) {
  const m = /(\d+):(\d+):(\d+)[,.](\d+)/.exec(value);
  if (!m) return 0;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4].padEnd(3, '0').slice(0, 3)) / 1000;
}

function parseSrt(text) {
  const cues = [];
  const blocks = text.replace(/\r/g, '').split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim() !== '');
    const timeIdx = lines.findIndex((l) => l.includes('-->'));
    if (timeIdx === -1) continue;
    const [start, end] = lines[timeIdx].split('-->').map((s) => s.trim());
    const cueText = lines.slice(timeIdx + 1).join(' ').replace(/<[^>]+>/g, '').trim();
    if (!cueText) continue;
    cues.push({ startSec: parseSrtTime(start), endSec: parseSrtTime(end), text: cueText });
  }
  return cues;
}

/** Finds the media file for a scene, trying other extensions if the named one is missing. */
function findSceneMedia(jobDir, job, row) {
  const imagesDir = path.join(jobDir, 'images');
  const candidates = [];
  if (row.image) candidates.push(path.join(imagesDir, row.image));
  const fromStep = (job?.steps?.images?.files || []).find((f) => f && f.no === row.no && f.file);
  if (fromStep) candidates.push(fromStep.file, path.join(imagesDir, path.basename(fromStep.file)));
  if (row.image) {
    const base = path.join(imagesDir, path.parse(row.image).name);
    for (const ext of [...VIDEO_EXTS, ...IMAGE_EXTS]) candidates.push(base + ext);
  }
  const found = firstExisting(candidates);
  if (!found) return null;
  const ext = path.extname(found).toLowerCase();
  return { path: found, type: VIDEO_EXTS.includes(ext) ? 'video' : 'image' };
}

function listJobs(appDataDir, getMediaUrl) {
  const jobsDir = getJobsDir(appDataDir);
  if (!fs.existsSync(jobsDir)) return { jobsDir, jobs: [] };

  const jobs = [];
  for (const name of fs.readdirSync(jobsDir)) {
    const jobDir = path.join(jobsDir, name);
    const job = readJson(path.join(jobDir, 'job.json'));
    if (!job) continue;
    const rows = getRows(jobDir, job);
    const audio = firstExisting([path.join(jobDir, 'audio.mp3'), job?.steps?.voiceover?.file]);
    const firstMedia = rows.length > 0 ? findSceneMedia(jobDir, job, rows[0]) : null;
    const lastRow = rows[rows.length - 1];
    const mediaCount = rows.filter((r) => findSceneMedia(jobDir, job, r)).length;
    jobs.push({
      id: job.job_id || name,
      jobDir,
      title: getTitle(jobDir, job, rows),
      templateId: job.template_id || null,
      createdAt: job.created_at || null,
      sceneCount: rows.length,
      mediaCount,
      durationSec: lastRow ? Number(lastRow.end_ms || 0) / 1000 : 0,
      hasAudio: !!audio,
      hasSrt: fs.existsSync(path.join(jobDir, 'subtitles.srt')),
      ready: rows.length > 0,
      thumbnailUrl: firstMedia && firstMedia.type === 'image' ? getMediaUrl(firstMedia.path) : null,
    });
  }
  jobs.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return { jobsDir, jobs };
}

function loadJob(jobDir, getMediaUrl) {
  const job = readJson(path.join(jobDir, 'job.json'));
  const rows = getRows(jobDir, job);
  if (rows.length === 0) {
    throw new Error('This job has no scene table yet. Finish the pipeline (final table step) first.');
  }

  const scenes = rows.map((row, i) => {
    const media = findSceneMedia(jobDir, job, row);
    const startSec = Number(row.start_ms ?? 0) / 1000;
    const endSec = Number(row.end_ms ?? (row.start_ms ?? 0) + (row.duration_sec ?? 5) * 1000) / 1000;
    return {
      index: i,
      number: row.no ?? i + 1,
      text: String(row.narration || ''),
      prompt: String(row.prompt || ''),
      startSec,
      endSec: Math.max(startSec + 0.2, endSec),
      mediaPath: media ? media.path : null,
      mediaUrl: media ? getMediaUrl(media.path) : null,
      mediaType: media ? media.type : null,
    };
  });

  const audioPath = firstExisting([path.join(jobDir, 'audio.mp3'), job?.steps?.voiceover?.file]);
  const srtPath = firstExisting([path.join(jobDir, 'subtitles.srt'), job?.steps?.srt?.file]);
  let srtCues = [];
  if (srtPath) {
    try {
      srtCues = parseSrt(fs.readFileSync(srtPath, 'utf8'));
    } catch {
      srtCues = [];
    }
  }

  return {
    id: job?.job_id || path.basename(jobDir),
    jobDir,
    title: getTitle(jobDir, job, rows),
    templateId: job?.template_id || null,
    scenes,
    voiceover: audioPath ? { path: audioPath, url: getMediaUrl(audioPath) } : null,
    srtCues,
  };
}

module.exports = { getJobsDir, listJobs, loadJob, parseSrt };
