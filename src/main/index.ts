import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import icon from '../../resources/icon.png?asset'
import { VirtualAudioDriver } from './VirtualAudioDriver'
import { WebRTCSignalingServer } from './WebrtcSignalingServer'

let signalingServer: WebRTCSignalingServer | null = null
let senderWindow: BrowserWindow | null = null
let receiverWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let virtualDriver: VirtualAudioDriver | null = null

function setupPermissions(window: BrowserWindow): void {
  // Permitir acceso a dispositivos multimedia
  window.webContents.session.setPermissionRequestHandler(
    (_webContents, permission, callback, details) => {
      const allowedPermissions = ['camera', 'microphone', 'media']
      console.log('Permission requested:', permission, details)
      if (allowedPermissions.includes(permission)) {
        callback(true) // Permitir
      } else {
        callback(false)
      }
    }
  )

  // Manejar permisos de medios específicamente
  window.webContents.session.setPermissionCheckHandler(
    (_webContents, permission, _requestingOrigin, _details) => {
      const allowedPermissions = ['camera', 'microphone', 'media']
      if (allowedPermissions.includes(permission)) {
        return true
      }
      return false
    }
  )
}

function createMainWindow(): void {
  // Ventana emisor
  senderWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    title: 'Audio Emisor',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  setupPermissions(senderWindow)

  senderWindow.on('ready-to-show', () => {
    senderWindow?.show()
  })

  // Cerrar todas las ventanas cuando se cierre la principal (emisor)
  senderWindow.on('closed', () => {
    console.log('Ventana emisor cerrada, cerrando ventanas secundarias...')
    if (receiverWindow && !receiverWindow.isDestroyed()) {
      receiverWindow.close()
    }
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.close()
    }
    senderWindow = null
  })

  senderWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    senderWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '?mode=sender')
  } else {
    senderWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { mode: 'sender' }
    })
  }
}

/**
 * @deprecated Only one window will be used
 */
function createReceiverWindow(): void {
  // Ventana receptor
  receiverWindow = new BrowserWindow({
    width: 600,
    height: 400,
    show: false,
    autoHideMenuBar: true,
    title: 'Audio Receptor',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  setupPermissions(receiverWindow)

  receiverWindow.on('ready-to-show', () => {
    receiverWindow?.show()
  })

  receiverWindow.on('closed', () => {
    receiverWindow = null
  })

  receiverWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Cargar el receptor
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    receiverWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '?mode=receiver')
  } else {
    receiverWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { mode: 'receiver' }
    })
  }
}

function createSettingsWindow(): void {
  // Si ya existe, enfocarla
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return
  }

  // Ventana de configuración
  settingsWindow = new BrowserWindow({
    width: 900,
    height: 700,
    show: false,
    autoHideMenuBar: true,
    title: 'Configuración - Audio Virtual',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  setupPermissions(settingsWindow)

  settingsWindow.on('ready-to-show', () => {
    settingsWindow?.show()
  })

  settingsWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })

  // Cargar la configuración
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    settingsWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '?mode=settings')
  } else {
    settingsWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { mode: 'settings' }
    })
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.alexthecaster.remau')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // WebRTC Signaling Server handlers
  ipcMain.handle('webrtc:start', () => {
    try {
      if (!signalingServer || !signalingServer.isActive()) {
        signalingServer = new WebRTCSignalingServer(8080)
        signalingServer.start()
        signalingServer.on('started', (port) => {
          console.log(`WebRTC Signaling Server started on port ${port}`)
        })
        signalingServer.on('error', (err) => {
          console.error('WebRTC Signaling Server error:', err)
        })
        return { success: true, url: signalingServer.getSignalingURL() }
      }
      return { success: true, url: signalingServer.getSignalingURL() }
    } catch (error) {
      console.error('Error starting WebRTC signaling server:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('webrtc:stop', () => {
    try {
      if (signalingServer) {
        signalingServer.stop()
        signalingServer = null
        return { success: true }
      }
      return { success: true }
    } catch (error) {
      console.error('Error stopping WebRTC signaling server:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('webrtc:get-url', () => {
    if (signalingServer && signalingServer.isActive()) {
      return { success: true, url: signalingServer.getSignalingURL() }
    }
    return { success: false, error: 'WebRTC signaling server not active' }
  })

  // Inicializar gestor de drivers virtuales
  virtualDriver = new VirtualAudioDriver()

  // Virtual Audio Driver handlers
  ipcMain.handle('driver:check', () => {
    try {
      const driverInfo = virtualDriver!.getRecommendedDriver()
      return {
        success: true,
        driver: driverInfo,
        downloadUrl: virtualDriver!.getInstallerDownloadUrl(),
        instructions: virtualDriver!.getManualInstallInstructions()
      }
    } catch (error) {
      console.error('Error checking driver:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Crear ambas ventanas
  createMainWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      //createSenderWindow()
      //createReceiverWindow()
      createMainWindow()
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (signalingServer) {
    signalingServer.stop()
    signalingServer = null
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
