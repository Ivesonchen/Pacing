import { ActionIcon, Avatar, Breadcrumbs, Group, Kbd, Text, TextInput } from '@mantine/core'
import { Bell, Search } from 'lucide-react'
import PropTypes from 'prop-types'

const titles = {
  chat: 'Goal Chat',
  calendar: 'Calendar Planner',
  settings: 'Settings'
}

function WorkspaceHeader({ activeView }) {
  return (
    <header className="workspace-header">
      <Breadcrumbs separator="/" className="workspace-breadcrumbs">
        <Text size="xs" c="dimmed">Pacing Workspace</Text>
        <Text size="xs" fw={600}>{titles[activeView]}</Text>
      </Breadcrumbs>

      <TextInput
        className="global-search"
        size="xs"
        radius="xl"
        leftSection={<Search size={14} />}
        rightSection={<Kbd size="xs">⌘K</Kbd>}
        placeholder="Ask AI to plan, split goals, or find tasks..."
        aria-label="Search and ask AI"
      />

      <Group gap="xs" wrap="nowrap">
        <ActionIcon variant="subtle" color="gray" aria-label="Notifications">
          <Bell size={16} />
        </ActionIcon>
        <Avatar size={27} radius="xl" color="dark">AV</Avatar>
      </Group>
    </header>
  )
}

WorkspaceHeader.propTypes = {
  activeView: PropTypes.oneOf(['chat', 'calendar', 'settings']).isRequired
}

export default WorkspaceHeader
