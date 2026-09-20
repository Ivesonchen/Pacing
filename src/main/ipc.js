import { BrowserWindow, ipcMain, shell } from 'electron'
import {
  cancelDeviceFlow,
  checkAuth,
  closeChatSession,
  listModels,
  onAuthEvent,
  sendChatMessage,
  signOut,
  startDeviceFlow
} from './copilot-service'
import {
  getSettings,
  getSettingsFilePath,
  onSettingsChanged,
  updateSettings
} from './settings-store'
import {
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  onConversationsChanged,
  renameConversation
} from './conversation-store'

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

  handle('chat:send', async (request) => {
    const { prompt, requestId, conversationId } = request || {}
    if (typeof requestId !== 'string' || !requestId) throw new Error('A request id is required.')
    if (typeof conversationId !== 'string' || !conversationId) {
      throw new Error('A conversation id is required.')
    }
    return sendChatMessage({ prompt, requestId, conversationId }, (event) =>
      broadcast('chat:event', event)
    )
  })
  handle('history:list', async () => ({ conversations: listConversations() }))
  handle('history:get', async (id) => ({ conversation: getConversation(id) }))
  handle('history:create', async () => ({ conversation: createConversation() }))
  handle('history:delete', async (id) => {
    deleteConversation(id)
    await closeChatSession()
    return {}
  })
  handle('history:rename', async (id, title) => ({
    conversation: renameConversation(id, title)
  }))

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
  onConversationsChanged((conversations) => broadcast('history:changed', { conversations }))
}
