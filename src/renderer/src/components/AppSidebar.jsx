import { Avatar, Badge, Box, Group, NavLink, Paper, Progress, Stack, Text, ThemeIcon } from '@mantine/core'
import { CalendarDays, MessageSquareText, Settings, User } from 'lucide-react'
import PropTypes from 'prop-types'

const navigation = [
  { id: 'chat', label: 'Goal Chat', icon: MessageSquareText },
  { id: 'calendar', label: 'Calendar Planner', icon: CalendarDays },
  { id: 'settings', label: 'Settings', icon: Settings }
]

function initials(username) {
  return username ? username.slice(0, 2).toUpperCase() : ''
}

function AppSidebar({ activeView, onNavigate, account, pace }) {
  const hasPace = typeof pace === 'number'

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
            <span className={hasPace ? 'online-dot' : 'online-dot idle'} />
            <Text size="xs" fw={600}>{hasPace ? 'On Pace' : 'No active plan'}</Text>
          </Group>
          <Text size="xs" c="dimmed">{hasPace ? `${pace}%` : '—'}</Text>
        </Group>
        <Progress value={hasPace ? pace : 0} size={3} color={hasPace ? 'green' : 'gray'} />
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
            <Avatar size={30} color={account.authenticated ? 'dark' : 'gray'} radius="xl">
              {initials(account.username) || <User size={14} />}
            </Avatar>
            <Box className="profile-copy">
              <Text size="xs" fw={650} truncate>{account.username || 'Not signed in'}</Text>
              <Text size="10px" c="dimmed" truncate>
                {account.authenticated ? 'GitHub Copilot connected' : 'Connect in Settings'}
              </Text>
            </Box>
            <Badge
              size="xs"
              circle
              color={account.authenticated ? 'green' : 'gray'}
              variant="filled"
              aria-label={account.authenticated ? 'Connected' : 'Disconnected'}
            />
          </Group>
        </Paper>
      </Box>
    </aside>
  )
}

AppSidebar.propTypes = {
  activeView: PropTypes.oneOf(['chat', 'calendar', 'settings']).isRequired,
  onNavigate: PropTypes.func.isRequired,
  account: PropTypes.shape({
    authenticated: PropTypes.bool,
    username: PropTypes.string
  }).isRequired,
  pace: PropTypes.number
}

export default AppSidebar
