import { Avatar, Badge, Box, Group, NavLink, Paper, Progress, Stack, Text, ThemeIcon } from '@mantine/core'
import { CalendarDays, MessageSquareText, Settings } from 'lucide-react'
import PropTypes from 'prop-types'

const navigation = [
  { id: 'chat', label: 'Goal Chat', icon: MessageSquareText },
  { id: 'calendar', label: 'Calendar Planner', icon: CalendarDays },
  { id: 'settings', label: 'Settings', icon: Settings }
]

function AppSidebar({ activeView, onNavigate }) {
  return (
    <aside className="app-sidebar">
      <Group className="sidebar-brand" gap="sm">
        <ThemeIcon size={28} radius="md" color="blue">
          <span className="brand-glyph">P</span>
        </ThemeIcon>
        <Text fw={700} size="sm">Pacing</Text>
      </Group>

      <Paper className="pace-card" radius="md" p="sm" withBorder>
        <Group justify="space-between" gap="xs" mb={6}>
          <Group gap={6}>
            <span className="online-dot" />
            <Text size="xs" fw={600}>On Pace</Text>
          </Group>
          <Text size="xs" c="dimmed">68%</Text>
        </Group>
        <Progress value={68} size={3} color="green" />
      </Paper>

      <Stack className="sidebar-navigation" gap={4}>
        {navigation.map(({ id, label, icon: Icon }) => (
          <NavLink
            key={id}
            active={activeView === id}
            label={label}
            leftSection={<Icon size={16} strokeWidth={1.8} />}
            onClick={() => onNavigate(id)}
            color="blue"
            variant="light"
          />
        ))}
      </Stack>

      <Box mt="auto">
        <Paper className="profile-card" radius="md" p="sm" withBorder>
          <Group wrap="nowrap" gap="sm">
            <Avatar size={30} color="dark" radius="xl">AV</Avatar>
            <Box className="profile-copy">
              <Text size="xs" fw={650} truncate>Alex Vance</Text>
              <Text size="10px" c="dimmed" truncate>Focus Mode · Deep Work</Text>
            </Box>
            <Badge size="xs" circle color="green" variant="filled" aria-label="Online" />
          </Group>
        </Paper>
      </Box>
    </aside>
  )
}

AppSidebar.propTypes = {
  activeView: PropTypes.oneOf(['chat', 'calendar', 'settings']).isRequired,
  onNavigate: PropTypes.func.isRequired
}

export default AppSidebar
