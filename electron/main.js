const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { renderVideoProject, cancelCurrentRender, CODEC_EXTENSIONS } = require('./render-worker');
const { startMediaServer, getMediaUrl } = require('./media-server');
const pipelineImport = require('./pipeline-import');
const settingsStore = require('./settings-store');
const aiEditor = require('./ai-editor');

let mainWindow;

function createWindow() {
  const iconPath = path.join(__dirname, '../public/logo-icon.png');
  mainWindow = new BrowserWindow({
    title: 'Easy AI Hub Video Editor',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    width: 1480,
    height: 940,
    minWidth: 1024,
    minHeight: 720,
    frame: true,
    titleBarStyle: 'default',
    backgroundColor: '#0a0b10',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      // Local media is served by media-server.js over http://127.0.0.1, so web security can stay on
      webSecurity: true,
    },
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch((err) => {
      console.warn('[Electron] Initial loadURL failed, retrying in 1s...', err);
      setTimeout(() => {
        if (mainWindow) mainWindow.loadURL('http://localhost:5173');
      }, 1000);
    });

    // If Vite wasn't fully ready when loadURL executed, auto-reload on failure
    mainWindow.webContents.on('did-fail-load', () => {
      console.log('[Electron] Page load failed, retrying in 1.5s...');
      setTimeout(() => {
        if (mainWindow) mainWindow.loadURL('http://localhost:5173');
      }, 1500);
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

process.on('uncaughtException', (err) => {
  console.error('[Electron Uncaught Exception]', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Electron Unhandled Rejection]', reason);
});

app.whenReady().then(async () => {
  await startMediaServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC: Open local media file
ipcMain.handle('editor:dialog:openFile', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: options?.filters || [
      { name: 'Media Files', extensions: ['mp4', 'mov', 'webm', 'png', 'jpg', 'jpeg', 'svg', 'webp', 'mp3', 'wav', 'aac'] },
      { name: 'Video Files', extensions: ['mp4', 'mov', 'webm'] },
      { name: 'Audio Files', extensions: ['mp3', 'wav', 'aac'] },
      { name: 'Image Files', extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  return {
    filePath,
    fileName,
    ext,
    url: getMediaUrl(filePath),
  };
});

// IPC: Build a playable URL for a media file on disk (used when reopening projects)
ipcMain.handle('editor:media:getUrl', async (event, filePath) => {
  if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) return null;
  return getMediaUrl(filePath);
});

// IPC: Save project JSON
ipcMain.handle('editor:dialog:saveProject', async (event, { data, defaultName }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName || 'remotion-project.json',
    filters: [{ name: 'Remotion Project', extensions: ['json'] }]
  });

  if (result.canceled || !result.filePath) {
    return false;
  }

  fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf8');
  return { success: true, filePath: result.filePath };
});

// IPC: Load project JSON
ipcMain.handle('editor:dialog:loadProject', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Remotion Project', extensions: ['json'] }]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  try {
    const raw = fs.readFileSync(result.filePaths[0], 'utf8');
    return { success: true, data: JSON.parse(raw), filePath: result.filePaths[0] };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Choose Save Destination for MP4 Render
ipcMain.handle('editor:dialog:selectRenderOutput', async (event, { defaultName, codec }) => {
  // Only offer the container the chosen codec can be written into
  const ext = (CODEC_EXTENSIONS[codec] || '.mp4').slice(1);
  const filterNames = { mp4: 'MP4 Video (*.mp4)', webm: 'WebM Video (*.webm)', mov: 'ProRes Video (*.mov)' };
  const baseName = (defaultName || 'my-remotion-video').replace(/\.[^.]*$/, '');

  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Select Export Destination for Video',
    defaultPath: `${baseName}.${ext}`,
    filters: [{ name: filterNames[ext], extensions: [ext] }],
  });

  if (result.canceled || !result.filePath) {
    return null;
  }
  return result.filePath;
});

// IPC: Start Native In-App MP4 Rendering
ipcMain.handle('editor:render:start', async (event, renderPayload) => {
  const { outputPath, settings, clips, hiddenTracks, codec, crf } = renderPayload;

  try {
    const result = await renderVideoProject({
      compositionId: 'Main',
      outputPath,
      inputProps: {
        settings,
        clips,
        hiddenTracks: hiddenTracks || {},
      },
      codec: codec || 'h264',
      crf: crf ?? 18,
      isPackaged: app.isPackaged,
      resourcesPath: process.resourcesPath,
      projectRoot: path.resolve(__dirname, '..'),
      onStage: (stage) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('editor:render:progress', { stage });
        }
      },
      onProgress: (progressData) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('editor:render:progress', progressData);
        }
      },
    });

    return { success: true, outputPath: result.outputPath };
  } catch (err) {
    console.error('[Render Error]', err);
    const message = err.message || String(err);
    const cancelled = /cancel/i.test(message);
    return { success: false, cancelled, error: cancelled ? 'Render cancelled.' : message };
  }
});

// IPC: Cancel the render in progress
ipcMain.handle('editor:render:cancel', async () => cancelCurrentRender());

// IPC: Show item in folder
ipcMain.handle('editor:shell:showItemInFolder', async (event, filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
    return true;
  }
  return false;
});

// ---------------------------------------------------------------------------
// Pipeline (Easy AI Hub) jobs
// ---------------------------------------------------------------------------

ipcMain.handle('editor:pipeline:listJobs', async () => {
  try {
    return { success: true, ...pipelineImport.listJobs(app.getPath('appData'), getMediaUrl) };
  } catch (err) {
    return { success: false, error: err.message, jobs: [] };
  }
});

ipcMain.handle('editor:pipeline:loadJob', async (event, jobDir) => {
  try {
    if (typeof jobDir !== 'string' || !path.isAbsolute(jobDir)) throw new Error('Invalid job folder.');
    return { success: true, job: pipelineImport.loadJob(jobDir, getMediaUrl) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('editor:pipeline:pickJobFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select a pipeline job folder (contains job.json)',
    defaultPath: pipelineImport.getJobsDir(app.getPath('appData')),
    properties: ['openDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// ---------------------------------------------------------------------------
// Settings + AI (the API key stays in the main process)
// ---------------------------------------------------------------------------

ipcMain.handle('editor:settings:get', async () => settingsStore.getPublicSettings());

ipcMain.handle('editor:settings:update', async (event, updates) => settingsStore.updateSettings(updates || {}));

ipcMain.handle('editor:ai:test', async () => {
  try {
    const { openaiModel } = settingsStore.getPublicSettings();
    await aiEditor.testConnection(settingsStore.getOpenAIKey(), openaiModel);
    return { success: true, model: openaiModel };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('editor:ai:planEdit', async (event, request) => {
  try {
    const { openaiModel } = settingsStore.getPublicSettings();
    const result = await aiEditor.planEdit(settingsStore.getOpenAIKey(), openaiModel, request);
    return { success: true, ...result };
  } catch (err) {
    console.error('[AI Edit Error]', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('editor:dialog:openAudio', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose background music',
    properties: ['openFile'],
    filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'aac', 'm4a', 'ogg'] }],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  return { filePath, fileName: path.basename(filePath), url: getMediaUrl(filePath) };
});
