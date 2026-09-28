const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: (options) => ipcRenderer.invoke('editor:dialog:openFile', options),
  saveProject: (data) => ipcRenderer.invoke('editor:dialog:saveProject', data),
  loadProject: () => ipcRenderer.invoke('editor:dialog:loadProject'),
  selectRenderOutput: (options) => ipcRenderer.invoke('editor:dialog:selectRenderOutput', options),
  startRender: (payload) => ipcRenderer.invoke('editor:render:start', payload),
  cancelRender: () => ipcRenderer.invoke('editor:render:cancel'),
  getMediaUrl: (filePath) => ipcRenderer.invoke('editor:media:getUrl', filePath),
  showItemInFolder: (path) => ipcRenderer.invoke('editor:shell:showItemInFolder', path),
  onRenderProgress: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('editor:render:progress', subscription);
    return () => ipcRenderer.removeListener('editor:render:progress', subscription);
  },
  openAudio: () => ipcRenderer.invoke('editor:dialog:openAudio'),
  pipeline: {
    listJobs: () => ipcRenderer.invoke('editor:pipeline:listJobs'),
    loadJob: (jobDir) => ipcRenderer.invoke('editor:pipeline:loadJob', jobDir),
    pickJobFolder: () => ipcRenderer.invoke('editor:pipeline:pickJobFolder'),
  },
  settings: {
    get: () => ipcRenderer.invoke('editor:settings:get'),
    update: (updates) => ipcRenderer.invoke('editor:settings:update', updates),
  },
  ai: {
    test: () => ipcRenderer.invoke('editor:ai:test'),
    planEdit: (request) => ipcRenderer.invoke('editor:ai:planEdit', request),
  },
  platform: process.platform,
});
