import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip
} from '@mantine/core'
import {
  ArrowUp,
  CalendarCheck,
  Check,
  Clock3,
  History,
  Lightbulb,
  ListChecks,
  Paperclip,
  Settings2,
  Sparkles,
  Target,
  Trash2,
  WandSparkles
} from 'lucide-react'
import PropTypes from 'prop-types'
import { useState } from 'react'

const quickPrompts = [
  'Plan client deliverables for Friday',
  "Reschedule today's deep work block",
  'Add 30m buffer'
]

function AssistantIdentity({ timestamp }) {
  return (
    <Group gap={7}>
      <ThemeIcon size={22} radius="xl" variant="light">
        <Sparkles size={12} />
      </ThemeIcon>
      <Text size="xs" fw={650}>Pacing Copilot</Text>
      <Text size="10px" c="dimmed">· {timestamp}</Text>
    </Group>
  )
}

AssistantIdentity.propTypes = {
  timestamp: PropTypes.string.isRequired
}

function UserMessage({ children, timestamp }) {
  return (
    <Stack gap={4} align="flex-end">
      <Text size="10px" c="dimmed">Alex Vance · {timestamp}</Text>
      <Paper className="user-message" radius="lg" px="md" py="sm">
        <Text size="sm" c="white" fw={500}>{children}</Text>
      </Paper>
    </Stack>
  )
}

UserMessage.propTypes = {
  children: PropTypes.node.isRequired,
  timestamp: PropTypes.string.isRequired
}

function AssistantMessage({ children, timestamp }) {
  return (
    <Stack gap={7} align="flex-start">
      <AssistantIdentity timestamp={timestamp} />
      <Paper className="assistant-message" radius="lg" px="md" py="sm">
        <Text size="sm" lh={1.55}>{children}</Text>
      </Paper>
    </Stack>
  )
}

AssistantMessage.propTypes = {
  children: PropTypes.node.isRequired,
  timestamp: PropTypes.string.isRequired
}

function GoalChatPage() {
  const [draft, setDraft] = useState('')
  const [extraMessages, setExtraMessages] = useState([])

  const sendMessage = () => {
    const value = draft.trim()
    if (!value) return
    setExtraMessages((messages) => [...messages, value])
    setDraft('')
  }

  return (
    <div className="chat-page">
      <Card className="project-summary" radius="lg" withBorder padding="md">
        <Group justify="space-between" wrap="nowrap">
          <Group wrap="nowrap">
            <ThemeIcon variant="light" size={36} radius="md"><ListChecks size={18} /></ThemeIcon>
            <Box>
              <Group gap="xs">
                <Text fw={700} size="md">Client Brand &amp; Pitch Deck</Text>
                <Badge color="green" variant="light" size="sm">On Track</Badge>
              </Group>
              <Text size="xs" c="dimmed">16.5 total hours planned across 5 days · Due Fri, Oct 27</Text>
            </Box>
          </Group>
          <Group gap="xs" wrap="nowrap">
            <Button size="xs" variant="default" leftSection={<WandSparkles size={14} />}>Reschedule</Button>
            <Button size="xs" leftSection={<Check size={14} />}>Lock Plan</Button>
          </Group>
        </Group>
      </Card>

      <Card className="chat-panel" radius="lg" withBorder padding={0}>
        <Group className="chat-panel-header" justify="space-between" px="md" py="sm">
          <AssistantIdentity timestamp="Active · Context Synced" />
          <Group gap={2}>
            <Tooltip label="Clear chat"><ActionIcon variant="subtle" color="gray"><Trash2 size={14} /></ActionIcon></Tooltip>
            <Tooltip label="History"><ActionIcon variant="subtle" color="gray"><History size={14} /></ActionIcon></Tooltip>
            <Tooltip label="Settings"><ActionIcon variant="subtle" color="gray"><Settings2 size={14} /></ActionIcon></Tooltip>
          </Group>
        </Group>
        <Divider />

        <div className="conversation-scroll">
          <Stack gap="lg">
            <Paper className="chat-welcome" radius="lg" p="lg">
              <ThemeIcon size={24} radius="xl" variant="light" mb="xs"><Lightbulb size={13} /></ThemeIcon>
              <Text fw={700} size="sm">What goal or project are we pacing today?</Text>
              <Text size="xs" c="dimmed" mt={4}>Type your objective or deadline below to decompose it into sustainable focus blocks.</Text>
            </Paper>

            <UserMessage timestamp="10:14 AM">I need to deliver our full client brand identity and pitch deck by this Friday 4 PM.</UserMessage>

            <Stack gap={8} align="flex-start">
              <AssistantIdentity timestamp="10:15 AM" />
              <Paper className="assistant-message summary-message" radius="lg" p="md">
                <Text size="sm" lh={1.55}>
                  Understood! I can break this into 7 actionable micro-tasks totaling 16.5 focus hours, calibrated with safety buffers before Friday 4:00 PM. Would you like me to push this directly into your Calendar Planner?
                </Text>
                <Card className="deconstruction-card" withBorder radius="md" mt="md" padding="sm">
                  <Group justify="space-between" mb="sm">
                    <Group gap={6}><Target size={14} color="#3b82f6" /><Text size="xs" fw={650}>Target Deconstruction Summary</Text></Group>
                    <Badge color="green" variant="light" size="xs">Feasible Load</Badge>
                  </Group>
                  <div className="summary-metrics">
                    <Box><Text size="9px" c="dimmed">CONFIRMED TARGET</Text><Text size="xs" fw={600}>Fri, Oct 27 · 4:00 PM</Text></Box>
                    <Box><Text size="9px" c="dimmed">ESTIMATED FOCUS</Text><Text size="xs" fw={600} c="blue">16.5 Hours (7 Tasks)</Text></Box>
                    <Box><Text size="9px" c="dimmed">SAFETY BUFFER</Text><Text size="xs" fw={600} c="green">3.0h Pre-Cutoff Buffer</Text></Box>
                  </div>
                  <Group gap="xs" mt="sm">
                    <Button size="compact-xs" leftSection={<CalendarCheck size={12} />}>Confirm &amp; Push to Calendar</Button>
                    <Button size="compact-xs" variant="default" leftSection={<Clock3 size={12} />}>Adjust Daily Focus</Button>
                    <Button size="compact-xs" variant="default" leftSection={<ListChecks size={12} />}>Break Down Steps</Button>
                  </Group>
                </Card>
              </Paper>
            </Stack>

            <UserMessage timestamp="10:18 AM">Can we add an extra 30m buffer before Friday rehearsal to review slides one last time?</UserMessage>
            <AssistantMessage timestamp="Just now">Done! Added a 30m focus buffer before Friday 11:00 AM. Total load is well-paced and safely within capacity limits.</AssistantMessage>

            {extraMessages.map((message, index) => (
              <UserMessage key={`${message}-${index}`} timestamp="Just now">{message}</UserMessage>
            ))}
          </Stack>
        </div>

        <div className="composer-area">
          <Group gap="xs" mb="xs" wrap="nowrap">
            <Text size="10px" c="dimmed">Quick prompts:</Text>
            {quickPrompts.map((prompt) => (
              <Button key={prompt} size="compact-xs" variant="default" radius="xl" onClick={() => setDraft(prompt)}>{prompt}</Button>
            ))}
          </Group>
          <TextInput
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            onKeyDown={(event) => event.key === 'Enter' && sendMessage()}
            placeholder="Ask Pacing to plan a goal, break down tasks, or reschedule..."
            leftSection={<Paperclip size={15} />}
            rightSection={
              <ActionIcon color="blue" radius="xl" onClick={sendMessage} aria-label="Send message">
                <ArrowUp size={15} />
              </ActionIcon>
            }
            rightSectionWidth={42}
          />
        </div>
      </Card>
    </div>
  )
}

export default GoalChatPage
