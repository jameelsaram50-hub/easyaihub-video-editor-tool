const { renderMedia, selectComposition, makeCancelSignal } = require('@remotion/renderer');
const path = require('path');
const fs = require('fs');

let currentCancel = null;

// Output container that each codec must be written into
const CODEC_EXTENSIONS = {
  h264: '.mp4',
  h265: '.mp4',
  vp9: '.webm',
  prores: '.mov',
};

/**
 * Returns the Remotion serve URL (a bundle folder).
 * - Packaged app: the bundle prebuilt by scripts/prepare-remotion.js and shipped in resources.
 * - Development: bundle src/index.ts on the fly so code changes are picked up.
 */
async function getServeUrl({ isPackaged, resourcesPath, projectRoot }) {
  if (isPackaged) {
    const prebuilt = path.join(resourcesPath, 'remotion-bundle');
    if (!fs.existsSync(path.join(prebuilt, 'index.html'))) {
      throw new Error(`Remotion bundle is missing from the installation (${prebuilt}). Rebuild the app with "npm run build".`);
    }
    return prebuilt;
  }

  const { bundle } = require('@remotion/bundler');
  const entryPoint = path.join(projectRoot, 'src', 'index.ts');
  console.log(`[Remotion Worker] Bundling ${entryPoint}...`);
  // public/ holds the built-in sound effects referenced via staticFile()
  return bundle({ entryPoint, publicDir: path.join(projectRoot, 'public') });
}

/**
 * Packaged app ships Chrome Headless Shell in resources (see prepare-remotion.js),
 * because Remotion's default download location is inside the read-only install folder.
 */
function getBrowserExecutable({ isPackaged, resourcesPath }) {
  if (!isPackaged || process.platform !== 'win32') return null;
  const exe = path.join(
    resourcesPath,
    'chrome-headless-shell',
    'win64',
    'chrome-headless-shell-win64',
    'chrome-headless-shell.exe'
  );
  return fs.existsSync(exe) ? exe : null;
}

/**
 * Executes full Remotion video render using headless Chrome and FFmpeg
 */
async function renderVideoProject({
  compositionId = 'Main',
  outputPath,
  inputProps,
  codec = 'h264',
  crf = 18,
  isPackaged,
  resourcesPath,
  projectRoot,
  onProgress,
  onStage,
}) {
  if (!CODEC_EXTENSIONS[codec]) {
    throw new Error(`Unsupported codec: ${codec}`);
  }

  // Make sure the file extension matches the container the codec needs
  const expectedExt = CODEC_EXTENSIONS[codec];
  if (path.extname(outputPath).toLowerCase() !== expectedExt) {
    outputPath = outputPath.replace(/\.[^.\\/]*$/, '') + expectedExt;
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  if (typeof onStage === 'function') onStage('bundling');
  const serveUrl = await getServeUrl({ isPackaged, resourcesPath, projectRoot });
  const browserExecutable = getBrowserExecutable({ isPackaged, resourcesPath });

  const composition = await selectComposition({
    serveUrl,
    id: compositionId,
    inputProps,
    browserExecutable,
  });

  console.log(
    `[Remotion Worker] Selected composition: ${composition.id} (${composition.width}x${composition.height} @ ${composition.fps}fps, ${composition.durationInFrames} frames)`
  );

  const { cancelSignal, cancel } = makeCancelSignal();
  currentCancel = cancel;

  let lastProgressReportTime = 0;
  try {
    await renderMedia({
      composition,
      serveUrl,
      codec,
      outputLocation: outputPath,
      inputProps,
      browserExecutable,
      cancelSignal,
      // ProRes is a fixed-quality codec and rejects a CRF value
      ...(codec === 'prores' ? { proResProfile: 'hq' } : { crf }),
      onProgress: (progressData) => {
        const now = Date.now();
        // Throttle IPC events to 10 times a second
        if (now - lastProgressReportTime > 100 || progressData.progress === 1) {
          lastProgressReportTime = now;
          if (typeof onProgress === 'function') {
            onProgress({
              renderedFrames: progressData.renderedFrames,
              encodedFrames: progressData.encodedFrames,
              totalFrames: composition.durationInFrames,
              progress: progressData.progress,
              stitchStage: progressData.stitchStage,
              renderedDoneIn: progressData.renderedDoneIn,
            });
          }
        }
      },
    });
  } finally {
    currentCancel = null;
  }

  console.log(`[Remotion Worker] Video render successfully finished: ${outputPath}`);
  return { success: true, outputPath };
}

function cancelCurrentRender() {
  if (currentCancel) {
    currentCancel();
    return true;
  }
  return false;
}

module.exports = {
  renderVideoProject,
  cancelCurrentRender,
  CODEC_EXTENSIONS,
};
