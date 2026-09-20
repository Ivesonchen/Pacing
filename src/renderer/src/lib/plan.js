const PLAN_BLOCK = /```pacing-plan\s*([\s\S]*?)```/
const PARTIAL_PLAN_BLOCK = /```pacing-plan[\s\S]*$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

export const PRIORITIES = ['critical', 'high', 'medium', 'low', 'buffer']

const PRIORITY_COLORS = {
  critical: 'red',
  high: 'blue',
  medium: 'gray',
  low: 'gray',
  buffer: 'green'
}

const PRIORITY_TONES = {
  critical: 'red',
  high: 'strong',
  medium: 'blue',
  low: 'plain',
  buffer: 'buffer'
}

export function priorityColor(priority) {
  return PRIORITY_COLORS[priority] || 'gray'
}

export function priorityTone(priority) {
  return PRIORITY_TONES[priority] || 'blue'
}

function text(value, fallback = '', limit = 200) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, limit) : fallback
}

function normalizeBlock(block, index) {
  if (!block || typeof block !== 'object') return null

  const date = text(block.date)
  const start = text(block.start)
  const end = text(block.end)
  if (!DATE_PATTERN.test(date) || !TIME_PATTERN.test(start) || !TIME_PATTERN.test(end)) return null

  const priority = PRIORITIES.includes(block.priority) ? block.priority : 'medium'
  return {
    id: `block-${index}-${date}-${start}`,
    title: text(block.title, 'Untitled block'),
    date,
    start,
    end,
    priority,
    notes: text(block.notes, '', 400)
  }
}

export function durationHours(block) {
  const [startHour, startMinute] = block.start.split(':').map(Number)
  const [endHour, endMinute] = block.end.split(':').map(Number)
  const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute)
  return minutes > 0 ? minutes / 60 : 0
}

export function totalHours(blocks) {
  return blocks.reduce((total, block) => total + durationHours(block), 0)
}

export function formatHours(hours) {
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`
}

/**
 * Splits an assistant message into the prose shown in the bubble and the
 * structured plan the app renders as an editable schedule.
 */
export function parseAssistantMessage(content) {
  if (typeof content !== 'string') return { prose: '', plan: null }

  const match = content.match(PLAN_BLOCK)
  if (!match) {
    // While streaming, hide the half-written block instead of showing raw JSON.
    return { prose: content.replace(PARTIAL_PLAN_BLOCK, '').trim(), plan: null }
  }

  const prose = content.replace(PLAN_BLOCK, '').trim()

  let parsed
  try {
    parsed = JSON.parse(match[1])
  } catch {
    return { prose: content.trim(), plan: null }
  }

  const blocks = Array.isArray(parsed?.blocks)
    ? parsed.blocks.slice(0, 60).map(normalizeBlock).filter(Boolean)
    : []
  if (!blocks.length) return { prose: prose || content.trim(), plan: null }

  blocks.sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`))

  return {
    prose,
    plan: {
      title: text(parsed.title, 'Proposed plan'),
      deadline: text(parsed.deadline),
      blocks
    }
  }
}

export function formatDeadline(deadline) {
  if (!deadline) return ''
  const parsed = new Date(deadline)
  if (Number.isNaN(parsed.getTime())) return deadline
  return parsed.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}
