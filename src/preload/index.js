import { contextBridge, ipcRenderer } from 'electron'

function unwrap(promise) {
  return promise.then((result) => {
    if (result?.success === false) throw new Error(result.error || 'Desktop operation failed.')
    if (!result || typeof result !== 'object') return result
    return Object.fromEntries(
      Object.entries(result).filter(([key]) => key !== 'success' && key !== 'error')
    )
  })
}

function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api = {
  getVersions: () => ({
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  }),
  ping: () => ipcRenderer.invoke('app:ping'),
  openExternal: (url) => unwrap(ipcRenderer.invoke('app:openExternal', url)),
  auth: {
    check: () => unwrap(ipcRenderer.invoke('auth:check')),
    startDeviceFlow: () => unwrap(ipcRenderer.invoke('auth:startDeviceFlow')),
    cancelDeviceFlow: () => unwrap(ipcRenderer.invoke('auth:cancelDeviceFlow')),
    signOut: () => unwrap(ipcRenderer.invoke('auth:signOut')),
    onChanged: (callback) => subscribe('auth:changed', callback),
    onLoginSucceeded: (callback) => subscribe('auth:loginSucceeded', callback),
    onLoginFailed: (callback) => subscribe('auth:loginFailed', callback)
  },
  models: {
    list: () => unwrap(ipcRenderer.invoke('models:list'))
  },
  settings: {
    get: () => unwrap(ipcRenderer.invoke('settings:get')),
    update: (patch) => unwrap(ipcRenderer.invoke('settings:update', patch)),
    reveal: () => unwrap(ipcRenderer.invoke('settings:reveal')),
    onChanged: (callback) => subscribe('settings:changed', callback)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.api = api
}
