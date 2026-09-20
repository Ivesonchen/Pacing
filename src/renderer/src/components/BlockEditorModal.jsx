import { Button, Group, Modal, Select, Stack, Textarea, TextInput } from '@mantine/core'
import { Trash2 } from 'lucide-react'
import PropTypes from 'prop-types'
import { useState } from 'react'
import { PRIORITIES } from '../lib/plan'

const priorityOptions = PRIORITIES.map((value) => ({
  value,
  label: value[0].toUpperCase() + value.slice(1)
}))

// The caller remounts this via a key when the selected block changes, so the
// form can initialise straight from props.
function BlockEditorModal({ block, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(block)
  const [error, setError] = useState('')

  if (!form) return null

  const update = (patch) => setForm((current) => ({ ...current, ...patch }))

  const save = () => {
    if (!form.title.trim()) {
      setError('Give this block a title.')
      return
    }
    if (form.end <= form.start) {
      setError('The end time must be after the start time.')
      return
    }
    onSave(form.id, {
      title: form.title.trim(),
      date: form.date,
      start: form.start,
      end: form.end,
      priority: form.priority,
      notes: form.notes.trim()
    })
    onClose()
  }

  return (
    <Modal opened={Boolean(block)} onClose={onClose} title="Edit block" size="md" centered>
      <Stack gap="sm">
        <TextInput
          label="Title"
          value={form.title}
          onChange={(event) => update({ title: event.currentTarget.value })}
          error={error && !form.title.trim() ? error : undefined}
          autoFocus
        />
        <Group grow>
          <TextInput
            label="Date"
            type="date"
            value={form.date}
            onChange={(event) => update({ date: event.currentTarget.value })}
          />
          <Select
            label="Priority"
            data={priorityOptions}
            value={form.priority}
            onChange={(value) => value && update({ priority: value })}
            allowDeselect={false}
          />
        </Group>
        <Group grow>
          <TextInput
            label="Start"
            type="time"
            value={form.start}
            onChange={(event) => update({ start: event.currentTarget.value })}
          />
          <TextInput
            label="End"
            type="time"
            value={form.end}
            onChange={(event) => update({ end: event.currentTarget.value })}
            error={error && form.end <= form.start ? error : undefined}
          />
        </Group>
        <Textarea
          label="Details"
          placeholder="What this session covers"
          autosize
          minRows={2}
          maxRows={6}
          value={form.notes}
          onChange={(event) => update({ notes: event.currentTarget.value })}
        />

        <Group justify="space-between" mt="xs">
          <Button
            variant="subtle"
            color="red"
            size="xs"
            leftSection={<Trash2 size={14} />}
            onClick={() => {
              onDelete(form.id)
              onClose()
            }}
          >
            Delete block
          </Button>
          <Group gap="xs">
            <Button variant="default" size="xs" onClick={onClose}>Cancel</Button>
            <Button size="xs" onClick={save}>Save changes</Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  )
}

BlockEditorModal.propTypes = {
  block: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    date: PropTypes.string,
    start: PropTypes.string,
    end: PropTypes.string,
    priority: PropTypes.string,
    notes: PropTypes.string
  }),
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired
}

export default BlockEditorModal
