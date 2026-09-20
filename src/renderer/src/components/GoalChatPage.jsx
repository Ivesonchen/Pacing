import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip
} from '@mantine/core'
import {
  ArrowUp,
  CircleAlert,
  History,
  Lightbulb,
  ListChecks,
  Paperclip,
  Settings2,
  Sparkles,
  Trash2
} from 'lucide-react'
import PropTypes from 'prop-types'
import { useEffect, useMemo, useRef, useState } from 'react'
import PlanScheduleCard from './PlanScheduleCard'
import ChatHistoryDrawer from './ChatHistoryDrawer'
import { formatDeadline, formatHours, parseAssistantMessage, totalHours } from '../lib/plan'

const quickPrompts = ['Plan a goal', 'Reschedule a block', 'Add a buffer']

function AssistantIdentity({ timestamp }) {
  return (
    <Group gap={7}>
      <ThemeIcon size={22} radius="xl" variant="light">
        <Sparkles size={12} />
      </ThemeIcon>
      <Text size="xs" fw={650}>Pacing Copilot</Text>
      {timestamp && <Text size="10px" c="dimmed">· {timestamp}</Text>}
    </Group>
  )
}

AssistantIdentity.propTypes = {
  timestamp: PropTypes.string
}

function UserMessage({ children, author, timestamp }) {
  return (
    <Stack gap={4} align="flex-end">
      <Text size="10px" c="dimmed">{author ? `${author} · ${timestamp}` : timestamp}</Text>
      <Paper className="user-message" radius="lg" px="md" py="sm">
        <Text size="sm" c="white" fw={500}>{children}</Text>
      </Paper>
    </Stack>
  )
}

UserMessage.propTypes = {
  children: PropTypes.node.isRequired,
  author: PropTypes.string,
  timestamp: PropTypes.string.isRequired
}

function AssistantMessage({ children, timestamp, plan, onApplyPlan, appliedPlanId }) {
  return (
    <Stack gap={7} align="flex-start">
      <AssistantIdentity timestamp={timestamp} />
      <Paper
        className={`assistant-message${plan ? ' summary-message' : ''}`}
        radius="lg"
        px="md"
        py="sm"
      >
        <Text size="sm" lh={1.55} className="assistant-copy">{children}</Text>
        {plan && (
          <PlanScheduleCard
            plan={plan}
            onApply={onApplyPlan}
            applied={appliedPlanId === plan.messageId}
          />
        )}
      </Paper>
    </Stack>
  )
}

AssistantMessage.propTypes = {
  children: PropTypes.node.isRequired,
  timestamp: PropTypes.string.isRequired,
  plan: PropTypes.object,
  onApplyPlan: PropTypes.func.isRequired,
  appliedPlanId: PropTypes.string
}

function ProjectSummaryCard({ plan }) {
  const blockCount = plan?.blocks.length || 0
  const hours = plan ? totalHours(plan.blocks) : 0
  const days = plan ? new Set(plan.blocks.map((block) => block.date)).size : 0

  return (
    <Card className="project-summary" radius="lg" withBorder padding="md">
      <Group justify="space-between" wrap="nowrap">
        <Group wrap="nowrap">
          <ThemeIcon variant="light" size={36} radius="md" color={plan ? 'blue' : 'gray'}>
            <ListChecks size={18} />
          </ThemeIcon>
          <Box>
            <Group gap="xs">
              <Text fw={700} size="md">{plan ? plan.title : 'No active plan'}</Text>
              {plan && <Badge color="green" variant="light" size="sm">On calendar</Badge>}
            </Group>
            <Text size="xs" c="dimmed">
              {plan
                ? `${formatHours(hours)} across ${blockCount} blocks · ${days} ${days === 1 ? 'day' : 'days'}${
                    plan.deadline ? ` · Due ${formatDeadline(plan.deadline)}` : ''
                  }`
                : 'Describe a goal below and Pacing will build an editable schedule here.'}
            </Text>
          </Box>
        </Group>
      </Group>
    </Card>
  )
}

ProjectSummaryCard.propTypes = {
  plan: PropTypes.object
}

function GoalChatPage({ account, appliedPlan, appliedPlanId, onApplyPlan }) {
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [conversationId, setConversationId] = useState(null)
  const [conversations, setConversations] = useState([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const scrollRef = useRef(null)
  const pendingRef = useRef(null)

  const rendered = useMemo(
    () =>
      messages.map((message) => {
        if (message.role !== 'assistant') return message
        const { prose, plan } = parseAssistantMessage(message.text)
        return { ...message, prose, plan: plan ? { ...plan, messageId: message.id } : null }
      }),
    [messages]
  )

  useEffect(() => {
    const off = window.api.chat.onEvent((event) => {
      if (event.type !== 'delta' || event.requestId !== pendingRef.current) return
      setMessages((current) =>
        current.map((message) =>
          message.id === event.requestId ? { ...message, text: event.content } : message
        )
      )
    })
    return off
  }, [])

  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages])

  // Load the conversation list and open the most recent one on first mount.
  useEffect(() => {
    let active = true

    const bootstrap = async () => {
      try {
        const { conversations: list } = await window.api.history.list()
        if (!active) return

        if (list.length) {
          setConversations(list)
          const { conversation } = await window.api.history.get(list[0].id)
          if (!active) return
          setConversationId(conversation.id)
          setMessages(conversation.messages)
        } else {
          const { conversation } = await window.api.history.create()
          if (!active) return
          setConversationId(conversation.id)
        }
      } catch (loadError) {
        if (active) setError(loadError.message)
      }
    }

    void bootstrap()
    const off = window.api.history.onChanged(({ conversations: list }) => {
      if (active) setConversations(list)
    })

    return () => {
      active = false
      off()
    }
  }, [])

  const now = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  const sendMessage = async () => {
    const value = draft.trim()
    if (!value || sending || !conversationId) return

    const requestId = crypto.randomUUID()
    pendingRef.current = requestId
    setError(null)
    setDraft('')
    setSending(true)
    setMessages((current) => [
      ...current,
      { id: `user-${requestId}`, role: 'user', text: value, timestamp: now() },
      { id: requestId, role: 'assistant', text: '', timestamp: now() }
    ])

    try {
      const result = await window.api.chat.send({ prompt: value, requestId, conversationId })
      setMessages((current) =>
        current.map((message) =>
          message.id === requestId ? { ...message, text: result.content } : message
        )
      )
    } catch (sendError) {
      setError(sendError.message)
      setMessages((current) => current.filter((message) => message.id !== requestId))
    } finally {
      pendingRef.current = null
      setSending(false)
    }
  }

  const openConversation = async (id) => {
    if (sending || id === conversationId) return
    try {
      const { conversation } = await window.api.history.get(id)
      setConversationId(conversation.id)
      setMessages(conversation.messages)
      setError(null)
      setHistoryOpen(false)
    } catch (loadError) {
      setError(loadError.message)
    }
  }

  const startConversation = async () => {
    if (sending) return
    try {
      const { conversation } = await window.api.history.create()
      setConversationId(conversation.id)
      setMessages([])
      setError(null)
      setHistoryOpen(false)
    } catch (createError) {
      setError(createError.message)
    }
  }

  const renameConversation = async (id, title) => {
    try {
      await window.api.history.rename(id, title)
    } catch (renameError) {
      setError(renameError.message)
    }
  }

  const deleteConversation = async (id) => {
    try {
      await window.api.history.remove(id)
      if (id !== conversationId) return

      const { conversations: list } = await window.api.history.list()
      if (list.length) await openConversation(list[0].id)
      else await startConversation()
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  // Clearing starts a fresh conversation so the saved transcript is preserved.
  const clearChat = () => startConversation()

  return (
    <div className="chat-page">
      <ProjectSummaryCard plan={appliedPlan} />

      <Card className="chat-panel" radius="lg" withBorder padding={0}>
        <Group className="chat-panel-header" justify="space-between" px="md" py="sm">
          <AssistantIdentity timestamp={account.authenticated ? 'Connected' : 'Not connected'} />
          <Group gap={2}>
            <Tooltip label="New conversation">
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={clearChat}
                disabled={!messages.length || sending}
              >
                <Trash2 size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="History">
              <ActionIcon variant="subtle" color="gray" onClick={() => setHistoryOpen(true)}>
                <History size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Settings"><ActionIcon variant="subtle" color="gray"><Settings2 size={14} /></ActionIcon></Tooltip>
          </Group>
        </Group>
        <Divider />

        <div className="conversation-scroll" ref={scrollRef}>
          <Stack gap="lg">
            {!messages.length && (
              <Paper className="chat-welcome" radius="lg" p="lg">
                <ThemeIcon size={24} radius="xl" variant="light" mb="xs"><Lightbulb size={13} /></ThemeIcon>
                <Text fw={700} size="sm">What goal or project are we pacing today?</Text>
                <Text size="xs" c="dimmed" mt={4}>Type your objective or deadline below to decompose it into sustainable focus blocks.</Text>
              </Paper>
            )}

            {rendered.map((message) =>
              message.role === 'user' ? (
                <UserMessage key={message.id} author={account.username} timestamp={message.timestamp}>
                  {message.text}
                </UserMessage>
              ) : (
                <AssistantMessage
                  key={message.id}
                  timestamp={message.timestamp}
                  plan={message.plan}
                  onApplyPlan={onApplyPlan}
                  appliedPlanId={appliedPlanId}
                >
                  {message.prose || (message.plan ? 'Here is the schedule I put together.' : <span className="thinking-dots">Thinking…</span>)}
                </AssistantMessage>
              )
            )}

            {error && (
              <Alert color="red" icon={<CircleAlert size={15} />} withCloseButton onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
          </Stack>
        </div>

        <div className="composer-area">
          <Group gap="xs" mb="xs" wrap="nowrap">
            <Text size="10px" c="dimmed">Quick prompts:</Text>
            {quickPrompts.map((prompt) => (
              <Button
                key={prompt}
                size="compact-xs"
                variant="default"
                radius="xl"
                disabled={sending}
                onClick={() => setDraft(prompt)}
              >
                {prompt}
              </Button>
            ))}
          </Group>
          <TextInput
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            onKeyDown={(event) => event.key === 'Enter' && void sendMessage()}
            disabled={sending}
            placeholder={
              account.authenticated
                ? 'Ask Pacing to plan a goal, break down tasks, or reschedule...'
                : 'Sign in to GitHub Copilot in Settings to start chatting...'
            }
            leftSection={<Paperclip size={15} />}
            rightSection={
              sending ? (
                <Loader size={15} />
              ) : (
                <ActionIcon color="blue" radius="xl" onClick={() => void sendMessage()} aria-label="Send message">
                  <ArrowUp size={15} />
                </ActionIcon>
              )
            }
            rightSectionWidth={42}
          />
        </div>
      </Card>

      <ChatHistoryDrawer
        opened={historyOpen}
        onClose={() => setHistoryOpen(false)}
        conversations={conversations}
        activeId={conversationId}
        onSelect={openConversation}
        onCreate={startConversation}
        onRename={renameConversation}
        onDelete={deleteConversation}
        busy={sending}
      />
    </div>
  )
}

GoalChatPage.propTypes = {
  account: PropTypes.shape({
    authenticated: PropTypes.bool,
    username: PropTypes.string
  }).isRequired,
  appliedPlan: PropTypes.object,
  appliedPlanId: PropTypes.string,
  onApplyPlan: PropTypes.func.isRequired
}

export default GoalChatPage
