import { ElectronAPI } from '@electron-toolkit/preload'

export interface Api {
  webrtc: {
    start: () => Promise<{ success: boolean; url?: string; error?: string }>
    stop: () => Promise<{ success: boolean; error?: string }>
    getUrl: () => Promise<{ success: boolean; url?: string; error?: string }>
  }
  driver: {
    check: () => Promise<{
      success: boolean
      driver?: {
        name: string
        installed: boolean
        platform: string
        installer?: string
      }
      downloadUrl?: string
      instructions?: string[]
      error?: string
    }>
    install: () => Promise<{ success: boolean; message: string }>
    openDownload: () => Promise<{ success: boolean; error?: string }>
  }
  window: {
    openSettings: () => Promise<{ success: boolean; error?: string }>
    openReceiver: () => Promise<{ success: boolean; message?: string; error?: string }>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
