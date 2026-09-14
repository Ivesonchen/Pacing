import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DEFAULT_SETTINGS = Object.freeze({
  version: 1,
  ai: {
    defaultModel: '',
    reasoningEffort: 'default'
  }
})

const REASONING_EFFORTS = new Set(['default', 'low', 'medium', 'high', 'xhigh', 'max'])
const listeners = new Set()
let cache

function settingsPath() {
  return join(app.getPath('userData'), 'settings.json')
}

function normalizeSettings(value) {
  const ai = value && typeof value.ai === 'object' ? value.ai : {}
  return {
    version: 1,
    ai: {
      defaultModel: typeof ai.defaultModel === 'string' ? ai.defaultModel.slice(0, 200) : '',
      reasoningEffort: REASONING_EFFORTS.has(ai.reasoningEffort)
        ? ai.reasoningEffort
        : DEFAULT_SETTINGS.ai.reasoningEffort
    }
  }
}

function writeSettings(settings) {
  const file = settingsPath()
  const temporaryFile = `${file}.tmp`
  mkdirSync(app.getPath('userData'), { recursive: true })
  writeFileSync(temporaryFile, JSON.stringify(settings, null, 2), {
    encoding: 'utf8',
    mode: 0o600
  })
  renameSync(temporaryFile, file)
}

export function getSettings() {
  if (cache) return cache

  const file = settingsPath()
  try {
    cache = existsSync(file)
      ? normalizeSettings(JSON.parse(readFileSync(file, 'utf8')))
      : normalizeSettings(DEFAULT_SETTINGS)
  } catch (error) {
    console.warn('Unable to read settings; defaults will be used.', error)
    cache = normalizeSettings(DEFAULT_SETTINGS)
  }

  if (!existsSync(file)) writeSettings(cache)
  return cache
}

export function updateSettings(patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new Error('Settings update must be an object.')
  }

  const current = getSettings()
  const next = normalizeSettings({
    ...current,
    ...patch,
    ai: { ...current.ai, ...(patch.ai && typeof patch.ai === 'object' ? patch.ai : {}) }
  })

  writeSettings(next)
  cache = next
  for (const listener of listeners) listener(next)
  return next
}

export function onSettingsChanged(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSettingsFilePath() {
  return settingsPath()
}
