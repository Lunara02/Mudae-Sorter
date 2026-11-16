'use strict';

/* Puente seguro entre la app (renderer) y Electron (main): window.mudaeDesktop */

const { contextBridge, ipcRenderer } = require('electron');
const call = (ch, ...a) => ipcRenderer.invoke(ch, ...a);

contextBridge.exposeInMainWorld('mudaeDesktop', {
  isDesktop: true,
  platform: process.platform,
  getVersion: () => call('app:version'),
  getPaths: () => call('app:paths'),
  chooseDataFile: (defaultName) => call('dialog:choose-data-file', defaultName),
  saveAs: (opts) => call('dialog:save-as', opts),
  openFiles: (opts) => call('dialog:open-files', opts),
  writeDataFile: (filePath, text) => call('file:write', filePath, text),
  readDataFile: (filePath) => call('file:read', filePath),
  revealFile: (filePath) => call('file:reveal', filePath),
  openFolder: (dir) => call('file:open-folder', dir),
  readClipboard: () => call('clipboard:read-text'),
  backupDaily: (prefix, text) => call('backup:daily', prefix, text),
  mudaeLogin: () => call('mudae:login'),
  mudaeStatus: () => call('mudae:status'),
  mudaeLogout: () => call('mudae:logout'),
  profileRead: (id) => call('profile:read', id),
  profileWrite: (id, text) => call('profile:write', id, text),
  profileDelete: (id) => call('profile:delete', id),
  storeRead: () => call('store:read'),
  storeWrite: (text) => call('store:write', text)
});
