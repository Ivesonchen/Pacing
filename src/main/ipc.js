import { BrowserWindow, ipcMain, shell } from 'electron'
import {
  cancelDeviceFlow,
  checkAuth,
  listModels,
  onAuthEvent,
  signOut,
  startDeviceFlow
} from './copilot-service'
import {
  getSettings,
  getSettingsFilePath,
  onSettingsChanged,
  updateSettings
} from './settings-store'

const allowedExternalUrls = new Set(['https://github.com/login/device'])

function broadcast(channel, payload) {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send(channel, payload)
  }
}

function handle(channel, handler) {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      return { success: true, ...(await handler(...args)) }
    } catch (error) {
      console.error(`IPC handler ${channel} failed.`, error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })
}

export function registerIpcHandlers() {
  ipcMain.handle('app:ping', () => 'ready')

  handle('app:openExternal', async (url) => {
    if (!allowedExternalUrls.has(url)) throw new Error('This URL is not allowed.')
    await shell.openExternal(url)
    return {}
  })

  handle('auth:check', async () => ({ status: await checkAuth() }))
  handle('auth:startDeviceFlow', async () => startDeviceFlow())
  handle('auth:cancelDeviceFlow', async () => {
    cancelDeviceFlow()
    return {}
  })
  handle('auth:signOut', async () => {
    await signOut()
    broadcast('auth:changed', { status: await checkAuth() })
    return {}
  })
  handle('models:list', async () => ({ models: await listModels() }))

  handle('settings:get', async () => ({ settings: getSettings() }))
  handle('settings:update', async (patch) => ({ settings: updateSettings(patch) }))
  handle('settings:reveal', async () => {
    shell.showItemInFolder(getSettingsFilePath())
    return {}
  })

  onAuthEvent(async (event) => {
    if (event.type === 'succeeded') {
      broadcast('auth:loginSucceeded', { username: event.username })
      broadcast('auth:changed', { status: await checkAuth() })
    } else {
      broadcast('auth:loginFailed', { reason: event.reason })
    }
  })

  onSettingsChanged((settings) => broadcast('settings:changed', { settings }))
}
