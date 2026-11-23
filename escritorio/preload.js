// Lo que el launcher puede pedirle a la app (nada más)
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('forja', {
  check:() => ipcRenderer.invoke('check'),
  update:full => ipcRenderer.invoke('update', !!full),
  onProgress:cb => ipcRenderer.on('progress', (e, p) => cb(p)),
  play:opts => ipcRenderer.invoke('play', opts || {}),
  folder:() => ipcRenderer.invoke('folder'),
  web:() => ipcRenderer.invoke('web'),
  win:a => ipcRenderer.invoke('win', a),
  appVersion:() => ipcRenderer.invoke('appVersion'),
});
