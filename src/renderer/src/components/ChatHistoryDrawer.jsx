import { ActionIcon, Button, Drawer, Group, Stack, Text, TextInput, Tooltip } from '@mantine/core'
import { Check, MessageSquareText, Pencil, Plus, Trash2, X } from 'lucide-react'
import PropTypes from 'prop-types'
import { useState } from 'react'

function relativeTime(iso) {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return ''

  const minutes = Math.round((Date.now() - parsed.getTime()) / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`
  if (minutes < 10080) return `${Math.round(minutes / 1440)}d ago`
  return parsed.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function ChatHistoryDrawer({
  opened,
  onClose,
  conversations,
  activeId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  busy
}) {
  const [editingId, setEditingId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')

  const startRename = (conversation) => {
    setEditingId(conversation.id)
    setEditingTitle(conversation.title)
  }

  const commitRename = () => {
    const title = editingTitle.trim()
    if (title) onRename(editingId, title)
    setEditingId(null)
  }

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size={330}
      title={<Text fw={700} size="sm">Chat history</Text>}
    >
      <Button
        fullWidth
        size="xs"
        mb="sm"
        leftSection={<Plus size={14} />}
        onClick={onCreate}
        disabled={busy}
      >
        New conversation
      </Button>

      {conversations.length ? (
        <Stack gap={6}>
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`history-item${conversation.id === activeId ? ' active' : ''}`}
            >
              {editingId === conversation.id ? (
                <Group gap={4} wrap="nowrap">
                  <TextInput
                    size="xs"
                    autoFocus
                    value={editingTitle}
                    onChange={(event) => setEditingTitle(event.currentTarget.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') commitRename()
                      if (event.key === 'Escape') setEditingId(null)
                    }}
                    style={{ flex: 1 }}
                  />
                  <ActionIcon variant="subtle" color="green" onClick={commitRename} aria-label="Save title">
                    <Check size={13} />
                  </ActionIcon>
                  <ActionIcon variant="subtle" color="gray" onClick={() => setEditingId(null)} aria-label="Cancel rename">
                    <X size={13} />
                  </ActionIcon>
                </Group>
              ) : (
                <Group gap={6} wrap="nowrap" align="flex-start">
                  <button
                    type="button"
                    className="history-select"
                    onClick={() => onSelect(conversation.id)}
                    disabled={busy}
                  >
                    <Group gap={6} wrap="nowrap">
                      <MessageSquareText size={13} className="history-glyph" />
                      <Text size="xs" fw={600} lineClamp={2}>{conversation.title}</Text>
                    </Group>
                    <Text size="10px" c="dimmed" mt={3}>
                      {relativeTime(conversation.updatedAt)} · {conversation.messageCount}{' '}
                      {conversation.messageCount === 1 ? 'message' : 'messages'}
                    </Text>
                  </button>
                  <Tooltip label="Rename">
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      onClick={() => startRename(conversation)}
                      aria-label={`Rename ${conversation.title}`}
                    >
                      <Pencil size={12} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Delete">
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => onDelete(conversation.id)}
                      aria-label={`Delete ${conversation.title}`}
                    >
                      <Trash2 size={12} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              )}
            </div>
          ))}
        </Stack>
      ) : (
        <Text size="xs" c="dimmed" ta="center" mt="xl">
          Conversations you start will be saved here.
        </Text>
      )}
    </Drawer>
  )
}

ChatHistoryDrawer.propTypes = {
  opened: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  conversations: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      updatedAt: PropTypes.string,
      messageCount: PropTypes.number
    })
  ).isRequired,
  activeId: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
  onRename: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  busy: PropTypes.bool
}

export default ChatHistoryDrawer
