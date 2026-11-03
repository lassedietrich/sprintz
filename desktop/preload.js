// Schnittstelle zwischen der Web-App und dem Desktop-Programm (nur ausgewählte Funktionen, keine allgemeinen Node-Rechte)
const { contextBridge, ipcRenderer, webUtils } = require('electron');
contextBridge.exposeInMainWorld('sprintzDesktop', {
  isDesktop: true,
  platform: process.platform,
  pathFor: (file) => { try { return webUtils.getPathForFile(file) || null; } catch (e) { return null; } },
  probe: (p) => ipcRenderer.invoke('probe', p),
  proxy: (p) => ipcRenderer.invoke('proxy', p),
  onProgress: (cb) => { const h = (e, d) => cb(d); ipcRenderer.on('proxy-progress', h); return () => ipcRenderer.removeListener('proxy-progress', h); },
  saveFile: (name, data) => ipcRenderer.invoke('save-file', name, data),
  version: () => ipcRenderer.invoke('version'),
  setDev: (on) => ipcRenderer.invoke('set-dev', !!on),
  channel: () => ipcRenderer.invoke('channel'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url)
});
