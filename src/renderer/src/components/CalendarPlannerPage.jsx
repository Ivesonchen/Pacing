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
  Plus
} from 'lucide-react'

const tasks = [
  { title: 'Moodboard & Archetypes', meta: '2.0h · Mon scheduled', status: 'Done', color: 'green', done: true },
  { title: 'Vector Logo Concepts', meta: '3.5h · In Progress', status: 'Critical', color: 'red' },
  { title: 'Typography & Color Tokens', meta: '1.5h · Scheduled Wed', status: 'Med', color: 'gray' },
  { title: 'Brand Guidelines Document', meta: '3.0h · Scheduled Wed', status: 'High', color: 'blue' },
  { title: 'Slide Outline & Narrative', meta: '1.5h · Scheduled Fri', status: 'Med', color: 'gray' },
  { title: 'Pitch Deck Slide Design', meta: '4.0h · Deep Work Thu', status: 'Queued', color: 'blue' },
  { title: 'Final Review & Client Handoff', meta: '1.0h · Friday rehearsal', status: 'Buffer', color: 'green' }
]

const days = [
  {
    weekday: 'Mon', date: '23', blocks: [
      { time: '09:00 – 11:00', title: 'Brand Moodboard & Archetypes', meta: '2.0h completed', tone: 'green', badge: 'Done' },
      { time: '', title: 'Free Buffer', meta: '', tone: 'plain' }
    ]
  },
  {
    weekday: 'Tue', date: '24', blocks: [
      { time: '13:30 – 17:00', title: 'Vector Logo Concepts', meta: 'Figma review session', tone: 'red', badge: 'Critical · 3.5h' },
      { time: '', title: 'Morning Focus', meta: '', tone: 'plain' }
    ]
  },
  {
    weekday: 'Wed', date: '25', blocks: [
      { time: '10:00 – 11:30', title: 'Typography & Tokens', meta: 'Design system', tone: 'blue', badge: '1.5h' },
      { time: '13:00 – 16:00', title: 'Brand Guidelines Doc', meta: 'Decks & guidelines', tone: 'blue', badge: 'High · 3.0h' }
    ]
  },
  {
    weekday: 'Thu (Today)', date: '26', blocks: [
      { time: '13:00 – 17:00', title: 'Pitch Deck Slide Design', meta: 'Deep focus block · Key deliverables', tone: 'strong', badge: 'Queued · 4.0h' },
      { time: '', title: 'Buffer Preserved', meta: '', tone: 'buffer' }
    ]
  },
  {
    weekday: 'Fri', date: '27', blocks: [
      { time: '10:00 – 11:30', title: 'Slide Outline & Narrative', meta: 'Final adjustments', tone: 'plain', badge: '1.5h' },
      { time: '14:00 – 15:30', title: 'Client Rehearsal & Export', meta: '30m AI buffer included', tone: 'green', badge: 'Buffer · 1.5h' }
    ]
  }
]

function CalendarPlannerPage() {
  return (
    <div className="calendar-page">
      <Card className="incoming-panel" radius="lg" withBorder padding="md">
        <Group justify="space-between" mb={4}>
          <Group gap={7}><ListFilter size={15} /><Text size="sm" fw={700}>Incoming Tasks</Text><Badge variant="light" color="gray" size="xs">7 Tasks</Badge></Group>
          <ActionIcon variant="subtle" color="gray" size="sm"><ListFilter size={14} /></ActionIcon>
        </Group>
        <Text size="xs" c="dimmed" mb="md">Drag or schedule decomposed project micro-tasks into calendar slots.</Text>
        <Stack gap={7}>
          {tasks.map((task, index) => (
            <Paper key={task.title} className="task-card" p="xs" radius="md" withBorder draggable>
              <Group wrap="nowrap" gap={6}>
                <GripVertical className="drag-handle" size={14} />
                {task.done ? <Check size={13} color="#16a34a" /> : <Circle size={12} color="#9ca3af" />}
                <Box className="task-copy">
                  <Text size="xs" fw={650} truncate>{index + 1}. {task.title}</Text>
                  <Text size="10px" c="dimmed" truncate>{task.meta}</Text>
                </Box>
                <Badge variant="light" color={task.color} size="xs">{task.status}</Badge>
              </Group>
            </Paper>
          ))}
        </Stack>
        <Button fullWidth variant="subtle" color="gray" size="xs" mt="sm" leftSection={<Plus size={13} />}>Add task</Button>
      </Card>

      <Card className="week-panel" radius="lg" withBorder padding="md">
        <Group justify="space-between" mb="sm">
          <Group gap="xs">
            <ActionIcon variant="subtle" color="gray"><ChevronLeft size={15} /></ActionIcon>
            <Text size="sm" fw={700}>October 23 – 27, 2023</Text>
            <ActionIcon variant="subtle" color="gray"><ChevronRight size={15} /></ActionIcon>
            <Badge color="green" variant="light" size="xs">On Track</Badge>
          </Group>
          <SegmentedControl size="xs" data={['Day', 'Week', 'Split']} defaultValue="Week" />
        </Group>

        <div className="week-grid">
          {days.map((day) => (
            <div className="day-column" key={day.date}>
              <div className={`day-heading ${day.date === '26' ? 'today' : ''}`}>
                <Text size="10px" c={day.date === '26' ? 'white' : 'dimmed'}>{day.weekday}</Text>
                <Text fw={700} size="sm" c={day.date === '26' ? 'white' : undefined}>{day.date}</Text>
              </div>
              <Stack className="day-schedule" gap={8}>
                {day.blocks.map((block) => (
                  <Paper key={`${day.date}-${block.title}`} className={`calendar-block ${block.tone}`} p="xs" radius="md" withBorder>
                    {block.time && <Text size="9px" c="dimmed" mb={5}>{block.time}</Text>}
                    {block.badge && <Badge size="xs" variant="light" color={block.tone === 'red' ? 'red' : block.tone === 'green' ? 'green' : 'blue'} mb={5}>{block.badge}</Badge>}
                    <Text size="xs" fw={700} lh={1.25}>{block.title}</Text>
                    {block.meta && <Text size="9px" c="dimmed" mt={4} lh={1.3}>{block.meta}</Text>}
                  </Paper>
                ))}
              </Stack>
            </div>
          ))}
        </div>

        <Group className="calendar-legend" gap="lg" mt="md">
          <Group gap={6}><ThemeIcon size={17} color="green" variant="light"><CalendarCheck size={10} /></ThemeIcon><Text size="10px" c="dimmed">Schedule calibrated to focus capacity</Text></Group>
          <Group gap={6}><span className="legend-dot critical" /><Text size="10px" c="dimmed">Critical work</Text></Group>
          <Group gap={6}><span className="legend-dot buffer" /><Text size="10px" c="dimmed">Protected buffer</Text></Group>
        </Group>
      </Card>
    </div>
  )
}

export default CalendarPlannerPage
