import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Paper,
  SegmentedControl,
  Stack,
  Text,
  ThemeIcon
} from '@mantine/core'
import {
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  GripVertical,
  ListFilter,
  Plus,
  Undo2
} from 'lucide-react'
import PropTypes from 'prop-types'
import { useEffect, useMemo, useRef, useState } from 'react'
import { durationHours, formatHours, priorityColor, priorityTone } from '../lib/plan'
import BlockEditorModal from './BlockEditorModal'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const HOUR_HEIGHT = 56
const DEFAULT_DAY_START = 8
const DEFAULT_DAY_END = 18
const MIN_BLOCK_HEIGHT = 20
const COMPACT_HEIGHT = 46
const SNAP_MINUTES = 15
const MIN_DURATION = 15
const DRAG_THRESHOLD = 3

function toMinutes(time) {
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}

function toTime(minutes) {
  const clamped = Math.max(0, Math.min(24 * 60, Math.round(minutes)))
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`
}

function snap(minutes) {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES
}

function shiftDate(date, days) {
  const parsed = new Date(`${date}T00:00`)
  parsed.setDate(parsed.getDate() + days)
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`
}

function formatHour(hour) {
  const suffix = hour < 12 ? 'AM' : 'PM'
  const display = hour % 12 === 0 ? 12 : hour % 12
  return `${display} ${suffix}`
}

/**
 * Chooses the visible hour window so every block fits, padded by an hour on
 * each side and never narrower than the default working day.
 */
function hourWindow(blocks) {
  if (!blocks.length) return { start: DEFAULT_DAY_START, end: DEFAULT_DAY_END }

  let earliest = Number.POSITIVE_INFINITY
  let latest = Number.NEGATIVE_INFINITY
  for (const block of blocks) {
    earliest = Math.min(earliest, Math.floor(toMinutes(block.start) / 60))
    latest = Math.max(latest, Math.ceil(toMinutes(block.end) / 60))
  }

  return {
    start: Math.max(0, Math.min(earliest - 1, DEFAULT_DAY_START)),
    end: Math.min(24, Math.max(latest + 1, DEFAULT_DAY_END))
  }
}

/**
 * Assigns overlapping blocks to side-by-side lanes so nothing is hidden.
 */
function layoutDay(blocks) {
  const sorted = [...blocks].sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
  const laneEnds = []
  const placed = sorted.map((block) => {
    const start = toMinutes(block.start)
    const end = Math.max(toMinutes(block.end), start + 15)
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = end
    return { block, start, end, lane }
  })

  // Blocks that share any overlap must agree on how many lanes to divide.
  return placed.map((entry) => {
    const overlapping = placed.filter((other) => other.start < entry.end && entry.start < other.end)
    const lanes = Math.max(...overlapping.map((other) => other.lane + 1))
    return { ...entry, lanes }
  })
}

function startOfWorkWeek(offsetWeeks) {
  const date = new Date()
  const weekday = date.getDay()
  date.setDate(date.getDate() - (weekday === 0 ? 6 : weekday - 1) + offsetWeeks * 7)
  date.setHours(0, 0, 0, 0)
  return date
}

function buildWeek(offsetWeeks, blocks) {
  const monday = startOfWorkWeek(offsetWeeks)
  const today = new Date().toDateString()

  return WEEKDAY_LABELS.map((label, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    return {
      key,
      weekday: label,
      date: String(date.getDate()),
      isToday: date.toDateString() === today,
      blocks: blocks.filter((block) => block.date === key)
    }
  })
}

function weekOffsetFor(date) {
  const target = startOfWorkWeek(0)
  const parsed = new Date(`${date}T00:00`)
  if (Number.isNaN(parsed.getTime())) return 0
  parsed.setHours(0, 0, 0, 0)
  return Math.round((parsed - target) / (7 * 24 * 60 * 60 * 1000))
}

function formatRange(days) {
  if (!days.length) return ''
  const monday = new Date(`${days[0].key}T00:00`)
  const friday = new Date(`${days[days.length - 1].key}T00:00`)
  const month = monday.toLocaleDateString([], { month: 'long' })
  const endMonth = friday.toLocaleDateString([], { month: 'long' })
  const span =
    month === endMonth
      ? `${month} ${monday.getDate()} – ${friday.getDate()}`
      : `${month} ${monday.getDate()} – ${endMonth} ${friday.getDate()}`
  return `${span}, ${friday.getFullYear()}`
}

function CalendarPlannerPage({ plan, onClearPlan, onRevertPlan, canRevert, onUpdatePlan }) {
  const blocks = useMemo(() => plan?.blocks || [], [plan])
  const [weekOffset, setWeekOffset] = useState(() => (blocks.length ? weekOffsetFor(blocks[0].date) : 0))
  const [drag, setDrag] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const gridRef = useRef(null)
  const dragRef = useRef(null)

  // The dragged block previews at its candidate time until the pointer is released.
  const previewBlocks = useMemo(() => {
    if (!drag) return blocks
    return blocks.map((block) =>
      block.id === drag.id
        ? { ...block, date: drag.date, start: toTime(drag.start), end: toTime(drag.end) }
        : block
    )
  }, [blocks, drag])

  const days = useMemo(() => buildWeek(weekOffset, previewBlocks), [weekOffset, previewBlocks])
  const scheduledBlocks = days.reduce((total, day) => total + day.blocks.length, 0)

  const range = useMemo(() => hourWindow(days.flatMap((day) => day.blocks)), [days])
  const hours = useMemo(
    () => Array.from({ length: range.end - range.start }, (_, index) => range.start + index),
    [range]
  )
  const timelineHeight = hours.length * HOUR_HEIGHT

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const nowOffset = (now.getHours() * 60 + now.getMinutes() - range.start * 60) * (HOUR_HEIGHT / 60)
  const nowVisible = nowOffset >= 0 && nowOffset <= timelineHeight

  const updateBlock = (id, patch) => {
    if (!plan) return
    onUpdatePlan({
      ...plan,
      blocks: plan.blocks.map((block) => (block.id === id ? { ...block, ...patch } : block))
    })
  }

  const deleteBlock = (id) => {
    if (!plan) return
    onUpdatePlan({ ...plan, blocks: plan.blocks.filter((block) => block.id !== id) })
  }

  const beginDrag = (event, block, mode) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    const next = {
      id: block.id,
      mode,
      pointerX: event.clientX,
      pointerY: event.clientY,
      originStart: toMinutes(block.start),
      originEnd: toMinutes(block.end),
      originDate: block.date,
      start: toMinutes(block.start),
      end: toMinutes(block.end),
      date: block.date,
      moved: false
    }
    dragRef.current = next
    setDrag(next)
  }

  useEffect(() => {
    if (!drag) return undefined

    const columnWidth = () => {
      const column = gridRef.current?.querySelector('.day-column')
      return column?.getBoundingClientRect().width || 1
    }

    const handleMove = (event) => {
      const current = dragRef.current
      if (!current) return

      const deltaY = event.clientY - current.pointerY
      const deltaX = event.clientX - current.pointerX
      const moved =
        current.moved || Math.abs(deltaY) > DRAG_THRESHOLD || Math.abs(deltaX) > DRAG_THRESHOLD
      const deltaMinutes = snap(deltaY / (HOUR_HEIGHT / 60))

      let next
      if (current.mode === 'resize-start') {
        next = {
          ...current,
          moved,
          start: Math.max(
            0,
            Math.min(current.originStart + deltaMinutes, current.originEnd - MIN_DURATION)
          )
        }
      } else if (current.mode === 'resize-end') {
        next = {
          ...current,
          moved,
          end: Math.min(
            24 * 60,
            Math.max(current.originEnd + deltaMinutes, current.originStart + MIN_DURATION)
          )
        }
      } else {
        const duration = current.originEnd - current.originStart
        const start = Math.max(0, Math.min(current.originStart + deltaMinutes, 24 * 60 - duration))
        const dayShift = Math.round(deltaX / columnWidth())
        next = {
          ...current,
          moved,
          start,
          end: start + duration,
          date: dayShift ? shiftDate(current.originDate, dayShift) : current.originDate
        }
      }

      dragRef.current = next
      setDrag(next)
    }

    const handleUp = () => {
      const current = dragRef.current
      dragRef.current = null
      setDrag(null)
      if (!current) return

      if (!current.moved) {
        setEditingId(current.id)
        return
      }

      const patch = {
        start: toTime(current.start),
        end: toTime(current.end),
        date: current.date
      }
      const changed =
        patch.start !== toTime(current.originStart) ||
        patch.end !== toTime(current.originEnd) ||
        patch.date !== current.originDate
      if (changed) updateBlock(current.id, patch)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
    // Re-binding per gesture keeps updateBlock's captured plan current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.id, drag?.mode, plan])

  const editingBlock = blocks.find((block) => block.id === editingId) || null

  return (
    <div className="calendar-page">
      <Card className="incoming-panel" radius="lg" withBorder padding="md">
        <Group justify="space-between" mb={4}>
          <Group gap={7}>
            <ListFilter size={15} />
            <Text size="sm" fw={700}>Incoming Tasks</Text>
            <Badge variant="light" color="gray" size="xs">
              {blocks.length} {blocks.length === 1 ? 'Task' : 'Tasks'}
            </Badge>
          </Group>
          <ActionIcon variant="subtle" color="gray" size="sm"><ListFilter size={14} /></ActionIcon>
        </Group>
        <Text size="xs" c="dimmed" mb="md">
          {plan ? plan.title : 'Drag or schedule decomposed project micro-tasks into calendar slots.'}
        </Text>
        {blocks.length ? (
          <Stack gap={7}>
            {blocks.map((block, index) => (
              <Paper key={block.id} className="task-card" p="xs" radius="md" withBorder draggable>
                <Group wrap="nowrap" gap={6}>
                  <GripVertical className="drag-handle" size={14} />
                  {block.priority === 'buffer' ? (
                    <Check size={13} color="#16a34a" />
                  ) : (
                    <Circle size={12} color="#9ca3af" />
                  )}
                  <Box className="task-copy">
                    <Text size="xs" fw={650} truncate>{index + 1}. {block.title}</Text>
                    <Text size="10px" c="dimmed" truncate>
                      {formatHours(durationHours(block))} · {block.date} {block.start}
                    </Text>
                  </Box>
                  <Badge variant="light" color={priorityColor(block.priority)} size="xs">
                    {block.priority}
                  </Badge>
                </Group>
              </Paper>
            ))}
          </Stack>
        ) : (
          <Paper className="task-card empty-state" p="md" radius="md" withBorder>
            <Text size="xs" fw={600} ta="center">No tasks yet</Text>
            <Text size="10px" c="dimmed" ta="center" mt={4}>
              Break down a goal in Goal Chat, then apply the schedule here.
            </Text>
          </Paper>
        )}
        {plan ? (
          <Button fullWidth variant="subtle" color="red" size="xs" mt="sm" onClick={onClearPlan}>
            Clear plan
          </Button>
        ) : (
          <Button fullWidth variant="subtle" color="gray" size="xs" mt="sm" leftSection={<Plus size={13} />}>
            Add task
          </Button>
        )}
        <Button
          fullWidth
          variant="subtle"
          color="gray"
          size="xs"
          mt={4}
          leftSection={<Undo2 size={13} />}
          disabled={!canRevert}
          onClick={onRevertPlan}
        >
          Undo last change
        </Button>
      </Card>

      <Card className="week-panel" radius="lg" withBorder padding="md">
        <Group justify="space-between" mb="sm">
          <Group gap="xs">
            <ActionIcon variant="subtle" color="gray" onClick={() => setWeekOffset((value) => value - 1)} aria-label="Previous week">
              <ChevronLeft size={15} />
            </ActionIcon>
            <Text size="sm" fw={700}>{formatRange(days)}</Text>
            <ActionIcon variant="subtle" color="gray" onClick={() => setWeekOffset((value) => value + 1)} aria-label="Next week">
              <ChevronRight size={15} />
            </ActionIcon>
            <Badge color={scheduledBlocks ? 'green' : 'gray'} variant="light" size="xs">
              {scheduledBlocks ? `${scheduledBlocks} scheduled` : 'Nothing scheduled'}
            </Badge>
          </Group>
          <SegmentedControl size="xs" data={['Day', 'Week', 'Split']} defaultValue="Week" />
        </Group>

        <div className="week-grid" ref={gridRef}>
          <div className="time-gutter" style={{ height: timelineHeight }}>
            {hours.map((hour) => (
              <div className="hour-label" key={hour} style={{ height: HOUR_HEIGHT }}>
                <Text size="9px" c="dimmed">{formatHour(hour)}</Text>
              </div>
            ))}
          </div>

          {days.map((day) => (
            <div className="day-column" key={day.key}>
              <div className={`day-heading ${day.isToday ? 'today' : ''}`}>
                <Text size="10px" c={day.isToday ? 'white' : 'dimmed'}>
                  {day.isToday ? `${day.weekday} (Today)` : day.weekday}
                </Text>
                <Text fw={700} size="sm" c={day.isToday ? 'white' : undefined}>{day.date}</Text>
              </div>

              <div className="day-timeline" style={{ height: timelineHeight }}>
                {hours.map((hour, index) => (
                  <div className="hour-line" key={hour} style={{ top: index * HOUR_HEIGHT }} />
                ))}

                {day.isToday && nowVisible && (
                  <div className="now-line" style={{ top: nowOffset }}>
                    <span className="now-dot" />
                  </div>
                )}

                {layoutDay(day.blocks).map(({ block, start, end, lane, lanes }) => {
                  const top = (start - range.start * 60) * (HOUR_HEIGHT / 60)
                  const height = Math.max((end - start) * (HOUR_HEIGHT / 60), MIN_BLOCK_HEIGHT)
                  const compact = height < COMPACT_HEIGHT
                  const dragging = drag?.id === block.id && drag.moved
                  return (
                    <div
                      key={block.id}
                      role="button"
                      tabIndex={0}
                      className={`timeline-block ${priorityTone(block.priority)}${compact ? ' compact' : ''}${dragging ? ' dragging' : ''}`}
                      style={{
                        top,
                        height,
                        left: `calc(${(lane / lanes) * 100}% + 2px)`,
                        width: `calc(${(1 / lanes) * 100}% - 4px)`
                      }}
                      title={`${block.start} – ${block.end} · ${block.title}${block.notes ? ` · ${block.notes}` : ''}`}
                      onPointerDown={(event) => beginDrag(event, block, 'move')}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setEditingId(block.id)
                        }
                      }}
                    >
                      <span
                        className="resize-handle top"
                        onPointerDown={(event) => beginDrag(event, block, 'resize-start')}
                      />
                      {compact ? (
                        <Text size="8px" fw={700} className="timeline-compact">
                          {block.start} {block.title}
                        </Text>
                      ) : (
                        <>
                          <Text size="8px" c="dimmed" className="timeline-time">
                            {block.start} – {block.end}
                          </Text>
                          <Text size="xs" fw={700} lh={1.2} className="timeline-title">{block.title}</Text>
                          {height >= 78 && (
                            <Text size="8px" c="dimmed" mt={2} className="timeline-time">
                              {formatHours(durationHours(block))} · {block.priority}
                            </Text>
                          )}
                          {height >= 104 && block.notes && (
                            <Text size="8px" c="dimmed" mt={2} lh={1.3} className="timeline-notes">
                              {block.notes}
                            </Text>
                          )}
                        </>
                      )}
                      <span
                        className="resize-handle bottom"
                        onPointerDown={(event) => beginDrag(event, block, 'resize-end')}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <Group className="calendar-legend" gap="lg" mt="md">
          <Group gap={6}><ThemeIcon size={17} color="green" variant="light"><CalendarCheck size={10} /></ThemeIcon><Text size="10px" c="dimmed">Schedule calibrated to focus capacity</Text></Group>
          <Group gap={6}><span className="legend-dot critical" /><Text size="10px" c="dimmed">Critical work</Text></Group>
          <Group gap={6}><span className="legend-dot buffer" /><Text size="10px" c="dimmed">Protected buffer</Text></Group>
          <Text size="10px" c="dimmed">Click to edit · drag to move · drag edges to resize</Text>
        </Group>
      </Card>

      <BlockEditorModal
        key={editingId}
        block={editingBlock}
        onClose={() => setEditingId(null)}
        onSave={updateBlock}
        onDelete={deleteBlock}
      />
    </div>
  )
}

CalendarPlannerPage.propTypes = {
  plan: PropTypes.shape({
    title: PropTypes.string,
    blocks: PropTypes.array
  }),
  onClearPlan: PropTypes.func.isRequired,
  onRevertPlan: PropTypes.func.isRequired,
  canRevert: PropTypes.bool,
  onUpdatePlan: PropTypes.func.isRequired
}

export default CalendarPlannerPage
