import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip
} from '@mantine/core'
import { CalendarCheck, Check, Plus, Target, Trash2 } from 'lucide-react'
import PropTypes from 'prop-types'
import { useMemo, useState } from 'react'
import {
  PRIORITIES,
  formatDeadline,
  formatHours,
  durationHours,
  priorityColor,
  totalHours
} from '../lib/plan'

const priorityOptions = PRIORITIES.map((value) => ({
  value,
  label: value[0].toUpperCase() + value.slice(1)
}))

function weekdayLabel(date) {
  const parsed = new Date(`${date}T00:00`)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleDateString([], { weekday: 'short' })
}

function PlanScheduleCard({ plan, onApply, applied }) {
  const [draft, setDraft] = useState(plan)
  const [dirty, setDirty] = useState(false)

  // A revised plan must replace the draft, otherwise the card keeps showing the
  // schedule captured on first render. Compare content rather than identity so
  // re-renders during a later streaming reply do not discard local edits.
  const signature = useMemo(() => JSON.stringify(plan), [plan])
  const [syncedSignature, setSyncedSignature] = useState(signature)
  if (syncedSignature !== signature) {
    setSyncedSignature(signature)
    setDraft(plan)
    setDirty(false)
  }

  const hours = totalHours(draft.blocks)
  const days = new Set(draft.blocks.map((block) => block.date)).size

  const updateBlock = (id, patch) => {
    setDirty(true)
    setDraft((current) => ({
      ...current,
      blocks: current.blocks.map((block) => (block.id === id ? { ...block, ...patch } : block))
    }))
  }

  const removeBlock = (id) => {
    setDirty(true)
    setDraft((current) => ({
      ...current,
      blocks: current.blocks.filter((block) => block.id !== id)
    }))
  }

  const addBlock = () => {
    setDirty(true)
    setDraft((current) => {
      const last = current.blocks[current.blocks.length - 1]
      return {
        ...current,
        blocks: [
          ...current.blocks,
          {
            id: `block-new-${Date.now()}`,
            title: 'New focus block',
            date: last?.date || new Date().toISOString().slice(0, 10),
            start: '09:00',
            end: '10:00',
            priority: 'medium',
            notes: ''
          }
        ]
      }
    })
  }

  return (
    <Card className="plan-card" withBorder radius="md" mt="md" padding="sm">
      <Group justify="space-between" mb="sm" wrap="nowrap">
        <Group gap={6} wrap="nowrap">
          <Target size={14} color="#3b82f6" />
          <Text size="xs" fw={650} truncate>{draft.title}</Text>
        </Group>
        <Badge color={applied && !dirty ? 'green' : 'blue'} variant="light" size="xs">
          {applied && !dirty ? 'On calendar' : `${draft.blocks.length} blocks`}
        </Badge>
      </Group>

      <div className="summary-metrics">
        <Box>
          <Text size="9px" c="dimmed">TARGET</Text>
          <Text size="xs" fw={600}>{formatDeadline(draft.deadline) || 'No deadline set'}</Text>
        </Box>
        <Box>
          <Text size="9px" c="dimmed">TOTAL FOCUS</Text>
          <Text size="xs" fw={600} c="blue">{formatHours(hours)} · {draft.blocks.length} blocks</Text>
        </Box>
        <Box>
          <Text size="9px" c="dimmed">SPREAD</Text>
          <Text size="xs" fw={600} c="green">{days} {days === 1 ? 'day' : 'days'}</Text>
        </Box>
      </div>

      <Stack gap={6} mt="sm">
        {draft.blocks.map((block) => (
          <div className="plan-row" key={block.id}>
            <TextInput
              size="xs"
              aria-label="Block title"
              value={block.title}
              onChange={(event) => updateBlock(block.id, { title: event.currentTarget.value })}
            />
            <TextInput
              size="xs"
              type="date"
              aria-label="Date"
              value={block.date}
              onChange={(event) => updateBlock(block.id, { date: event.currentTarget.value })}
            />
            <TextInput
              size="xs"
              type="time"
              aria-label="Start time"
              value={block.start}
              onChange={(event) => updateBlock(block.id, { start: event.currentTarget.value })}
            />
            <TextInput
              size="xs"
              type="time"
              aria-label="End time"
              value={block.end}
              onChange={(event) => updateBlock(block.id, { end: event.currentTarget.value })}
            />
            <Select
              size="xs"
              aria-label="Priority"
              data={priorityOptions}
              value={block.priority}
              onChange={(value) => value && updateBlock(block.id, { priority: value })}
              allowDeselect={false}
            />
            <Tooltip label="Remove block">
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label={`Remove ${block.title}`}
                onClick={() => removeBlock(block.id)}
              >
                <Trash2 size={13} />
              </ActionIcon>
            </Tooltip>
            <TextInput
              size="xs"
              className="plan-row-notes"
              aria-label="Details"
              placeholder="Details for this block"
              value={block.notes}
              onChange={(event) => updateBlock(block.id, { notes: event.currentTarget.value })}
            />
            <Text size="9px" c="dimmed" className="plan-row-meta">
              {weekdayLabel(block.date)} · {formatHours(durationHours(block))}
            </Text>
            <Badge size="xs" variant="light" color={priorityColor(block.priority)} className="plan-row-badge">
              {block.priority}
            </Badge>
          </div>
        ))}
      </Stack>

      <Group gap="xs" mt="sm">
        <Button
          size="compact-xs"
          leftSection={applied && !dirty ? <Check size={12} /> : <CalendarCheck size={12} />}
          disabled={!draft.blocks.length || (applied && !dirty)}
          onClick={() => {
            onApply(draft)
            setDirty(false)
          }}
        >
          {applied && !dirty ? 'Applied to calendar' : 'Apply to calendar'}
        </Button>
        <Button size="compact-xs" variant="default" leftSection={<Plus size={12} />} onClick={addBlock}>
          Add block
        </Button>
        {dirty && <Text size="10px" c="dimmed">Edited · re-apply to update the calendar</Text>}
      </Group>
    </Card>
  )
}

PlanScheduleCard.propTypes = {
  plan: PropTypes.shape({
    title: PropTypes.string.isRequired,
    deadline: PropTypes.string,
    blocks: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        date: PropTypes.string.isRequired,
        start: PropTypes.string.isRequired,
        end: PropTypes.string.isRequired,
        priority: PropTypes.string.isRequired,
        notes: PropTypes.string
      })
    ).isRequired
  }).isRequired,
  onApply: PropTypes.func.isRequired,
  applied: PropTypes.bool
}

export default PlanScheduleCard
