import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'

const MAX_CONVERSATIONS = 200
const MAX_MESSAGES = 400
const MAX_TEXT = 200_000
const MAX_TITLE = 120
const listeners = new Set()
let cache

function storePath() {
  return join(app.getPath('userData'), 'conversations.json')
}

function text(value, limit) {
  return typeof value === 'string' ? value.slice(0, limit) : ''
}

function normalizeMessage(message) {
  if (!message || typeof message !== 'object') return null
  const role = message.role === 'assistant' ? 'assistant' : 'user'
  const body = text(message.text, MAX_TEXT)
  if (!body) return null
  return {
    id: text(message.id, 100) || randomUUID(),
    role,
    text: body,
    timestamp: text(message.timestamp, 40)
  }
}

function normalizeConversation(conversation) {
  if (!conversation || typeof conversation !== 'object') return null
  const messages = Array.isArray(conversation.messages)
    ? conversation.messages.map(normalizeMessage).filter(Boolean).slice(-MAX_MESSAGES)
    : []

  return {
    id: text(conversation.id, 100) || randomUUID(),
    title: text(conversation.title, MAX_TITLE) || 'New conversation',
    copilotSessionId: text(conversation.copilotSessionId, 200),
    createdAt: text(conversation.createdAt, 40) || new Date().toISOString(),
    updatedAt: text(conversation.updatedAt, 40) || new Date().toISOString(),
    messages
  }
}

function read() {
  if (cache) return cache

  const file = storePath()
  try {
    if (existsSync(file)) {
      const parsed = JSON.parse(readFileSync(file, 'utf8'))
      cache = Array.isArray(parsed?.conversations)
        ? parsed.conversations.map(normalizeConversation).filter(Boolean)
        : []
    } else {
      cache = []
    }
  } catch (error) {
    console.warn('Unable to read conversations; starting with an empty history.', error)
    cache = []
  }

  return cache
}

function write(conversations) {
  const trimmed = conversations
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_CONVERSATIONS)

  const file = storePath()
  const temporaryFile = `${file}.tmp`
  mkdirSync(app.getPath('userData'), { recursive: true })
  writeFileSync(temporaryFile, JSON.stringify({ version: 1, conversations: trimmed }, null, 2), {
    encoding: 'utf8',
    mode: 0o600
  })
  renameSync(temporaryFile, file)

  cache = trimmed
  for (const listener of listeners) listener(summaries())
  return trimmed
}

function summaries() {
  return read().map(({ id, title, createdAt, updatedAt, messages }) => ({
    id,
    title,
    createdAt,
    updatedAt,
    messageCount: messages.length
  }))
}

function titleFrom(body) {
  const firstLine = body.split('\n').find((line) => line.trim()) || 'New conversation'
  const trimmed = firstLine.trim()
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}…` : trimmed
}

export function onConversationsChanged(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function listConversations() {
  return summaries()
}

export function getConversation(id) {
  const found = read().find((conversation) => conversation.id === id)
  if (!found) throw new Error('That conversation no longer exists.')
  return found
}

export function createConversation() {
  const now = new Date().toISOString()
  const conversation = {
    id: randomUUID(),
    title: 'New conversation',
    copilotSessionId: '',
    createdAt: now,
    updatedAt: now,
    messages: []
  }
  write([...read(), conversation])
  return conversation
}

export function deleteConversation(id) {
  write(read().filter((conversation) => conversation.id !== id))
}

export function renameConversation(id, title) {
  const clean = text(title, MAX_TITLE).trim()
  if (!clean) throw new Error('A conversation title cannot be empty.')

  write(
    read().map((conversation) =>
      conversation.id === id ? { ...conversation, title: clean } : conversation
    )
  )
  return getConversation(id)
}

export function setCopilotSessionId(id, copilotSessionId) {
  const conversations = read()
  if (!conversations.some((conversation) => conversation.id === id)) return

  write(
    conversations.map((conversation) =>
      conversation.id === id
        ? { ...conversation, copilotSessionId: text(copilotSessionId, 200) }
        : conversation
    )
  )
}

/**
 * Appends messages and keeps the derived title in sync with the opening
 * question, so history entries stay recognisable without manual naming.
 */
export function appendMessages(id, messages) {
  const normalized = messages.map(normalizeMessage).filter(Boolean)
  if (!normalized.length) return

  const conversations = read()
  const existing = conversations.find((conversation) => conversation.id === id)
  if (!existing) throw new Error('That conversation no longer exists.')

  const nextMessages = [...existing.messages, ...normalized].slice(-MAX_MESSAGES)
  const firstUserMessage = nextMessages.find((message) => message.role === 'user')
  const autoTitled = !existing.messages.some((message) => message.role === 'user')

  write(
    conversations.map((conversation) =>
      conversation.id === id
        ? {
            ...conversation,
            title:
              autoTitled && firstUserMessage ? titleFrom(firstUserMessage.text) : conversation.title,
            updatedAt: new Date().toISOString(),
            messages: nextMessages
          }
        : conversation
    )
  )

  return getConversation(id)
}
