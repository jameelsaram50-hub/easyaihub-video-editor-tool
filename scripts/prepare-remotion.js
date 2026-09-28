/**
 * Runs before electron-builder. The installed app has no src/ folder and no
 * webpack toolchain, so everything Remotion needs at render time is prepared here:
 *   1. remotion-bundle/  – the composition prebuilt with @remotion/bundler
 *   2. Chrome Headless Shell – downloaded into node_modules/.remotion and
 *      copied into the installer by the "extraResources" rule in package.json
 */
const path = require('path');
const fs = require('fs');
const { bundle } = require('@remotion/bundler');
const { ensureBrowser } = require('@remotion/renderer');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'remotion-bundle');

async function main() {
  fs.rmSync(outDir, { recursive: true, force: true });

  console.log('[prepare-remotion] Bundling src/index.ts ...');
  await bundle({
    entryPoint: path.join(root, 'src', 'index.ts'),
    publicDir: path.join(root, 'public'),
    outDir,
  });
  console.log(`[prepare-remotion] Bundle written to ${outDir}`);

  console.log('[prepare-remotion] Making sure Chrome Headless Shell is downloaded ...');
  await ensureBrowser();
  console.log('[prepare-remotion] Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
