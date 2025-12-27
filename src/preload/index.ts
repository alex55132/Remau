import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  webrtc: {
    start: () => ipcRenderer.invoke('webrtc:start'),
    stop: () => ipcRenderer.invoke('webrtc:stop'),
    getUrl: () => ipcRenderer.invoke('webrtc:get-url')
  },
  driver: {
    check: () => ipcRenderer.invoke('driver:check'),
    install: () => ipcRenderer.invoke('driver:install'),
    openDownload: () => ipcRenderer.invoke('driver:open-download')
  },
  window: {
    openSettings: () => ipcRenderer.invoke('window:open-settings'),
    openReceiver: () => ipcRenderer.invoke('window:open-receiver')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
