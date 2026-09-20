import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Loader,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title
} from '@mantine/core'
import {
  Activity,
  Check,
  CircleAlert,
  Cloud,
  Copy,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Zap
} from 'lucide-react'
import { FaGithub } from 'react-icons/fa6'
import { useCallback, useEffect, useMemo, useState } from 'react'

const EMPTY_AUTH = { authenticated: false, username: '', host: 'https://github.com', authType: '' }

function StitchSettingsPage() {
  const [auth, setAuth] = useState(EMPTY_AUTH)
  const [settings, setSettings] = useState(null)
  const [models, setModels] = useState([])
  const [deviceFlow, setDeviceFlow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState(null)
  const [latency, setLatency] = useState(null)

  const measureLatency = useCallback(async () => {
    const started = performance.now()
    try {
      await window.api.ping()
      setLatency(Math.round(performance.now() - started))
    } catch {
      setLatency(null)
    }
  }, [])

  const loadModels = useCallback(async () => {
    setBusy('models')
    try {
      const result = await window.api.models.list()
      setModels(result.models)
    } catch (error) {
      setModels([])
      setMessage({ type: 'error', text: error.message })
    } finally {
      setBusy('')
    }
  }, [])

  const refreshAuth = useCallback(async () => {
    await measureLatency()
    const result = await window.api.auth.check()
    setAuth(result.status)
    if (result.status.authenticated) await loadModels()
    else setModels([])
  }, [loadModels, measureLatency])

  useEffect(() => {
    let active = true
    Promise.all([window.api.auth.check(), window.api.settings.get()])
      .then(async ([authResult, settingsResult]) => {
        if (!active) return
        setAuth(authResult.status)
        setSettings(settingsResult.settings)
        await measureLatency()
        if (authResult.status.authenticated) await loadModels()
      })
      .catch((error) => active && setMessage({ type: 'error', text: error.message }))
      .finally(() => active && setLoading(false))

    const offAuth = window.api.auth.onChanged(({ status }) => {
      if (!active) return
      setAuth(status)
      if (status.authenticated) void loadModels()
      else setModels([])
    })
    const offSuccess = window.api.auth.onLoginSucceeded(({ username }) => {
      if (!active) return
      setDeviceFlow(null)
      setMessage({ type: 'success', text: `Connected as ${username}.` })
      void refreshAuth()
    })
    const offFailure = window.api.auth.onLoginFailed(({ reason }) => {
      if (active) setMessage({ type: 'error', text: reason })
    })
    const offSettings = window.api.settings.onChanged(({ settings: next }) => active && setSettings(next))

    return () => {
      active = false
      offAuth()
      offSuccess()
      offFailure()
      offSettings()
      void window.api.auth.cancelDeviceFlow()
    }
  }, [loadModels, measureLatency, refreshAuth])

  const modelOptions = useMemo(
    () => [{ value: '', label: 'Automatic / Copilot default' }, ...models.map((model) => ({ value: model.id, label: model.name }))],
    [models]
  )
  const selectedModel = models.find((model) => model.id === settings?.ai.defaultModel)
  const reasoningOptions = selectedModel?.supportedReasoningEfforts?.length
    ? selectedModel.supportedReasoningEfforts
    : ['low', 'medium', 'high']

  const updateAi = async (name, value) => {
    const ai = { ...settings.ai, [name]: value || '' }
    setSettings({ ...settings, ai })
    try {
      await window.api.settings.update({ ai })
      setMessage({ type: 'success', text: 'All changes saved automatically.' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    }
  }

  const startSignIn = async () => {
    setBusy('signin')
    setMessage(null)
    try {
      const result = await window.api.auth.startDeviceFlow()
      if (result.userCode) setDeviceFlow(result)
      else await refreshAuth()
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setBusy('')
    }
  }

  const openDeviceFlow = async () => {
    await navigator.clipboard?.writeText(deviceFlow.userCode).catch(() => {})
    await window.api.openExternal(deviceFlow.verificationUri)
  }

  const signOut = async () => {
    setBusy('signout')
    try {
      await window.api.auth.signOut()
      setAuth(EMPTY_AUTH)
      setModels([])
      setMessage({ type: 'success', text: 'Signed out of GitHub Copilot.' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setBusy('')
    }
  }

  if (loading || !settings) {
    return <div className="centered-loader"><Loader size="sm" /><Text size="sm" c="dimmed">Loading settings…</Text></div>
  }

  return (
    <div className="stitch-settings-page">
      <Box mb="xl">
        <Title order={1} size="h2">Settings</Title>
        <Text size="sm" c="dimmed" mt={4}>Manage your AI engine, account connections, and pacing preferences.</Text>
      </Box>

      {message && (
        <Alert
          mb="md"
          color={message.type === 'error' ? 'red' : 'green'}
          icon={message.type === 'error' ? <CircleAlert size={16} /> : <Check size={16} />}
          withCloseButton
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      <Stack gap="lg">
        <Card className="settings-section" radius="lg" withBorder padding="lg">
          <Group justify="space-between" align="flex-start">
            <Group align="flex-start">
              <ThemeIcon color="dark" radius="md" size={32}><FaGithub size={18} /></ThemeIcon>
              <Box>
                <Text fw={700} size="sm">GitHub Copilot Integration</Text>
                <Text size="xs" c="dimmed">Subscription provides access to foundation reasoning models</Text>
              </Box>
            </Group>
            <Badge color={auth.authenticated ? 'green' : 'gray'} variant="light" leftSection={<span className="online-dot" />}>
              {auth.authenticated ? 'Active Connection' : 'Not Connected'}
            </Badge>
          </Group>

          {auth.authenticated ? (
            <>
              <Paper className="connected-account" radius="md" withBorder p="md" mt="md">
                <Group justify="space-between">
                  <Group>
                    <Avatar color="dark" radius="xl">{auth.username.slice(0, 2).toUpperCase()}</Avatar>
                    <Box>
                      <Text size="sm" fw={650}>{auth.username}</Text>
                      <Text size="xs" c="dimmed">{auth.host}</Text>
                    </Box>
                  </Group>
                  <Box ta="right">
                    <Text size="xs" fw={600}>GitHub Copilot Subscription</Text>
                    <Text size="10px" c="dimmed">OAuth token synced · {auth.authType || 'user authentication'}</Text>
                  </Box>
                </Group>
              </Paper>
              <Group mt="md">
                <Button size="xs" variant="default" leftSection={<RefreshCw size={13} />} onClick={startSignIn}>Re-authenticate</Button>
                <Button size="xs" variant="default" onClick={startSignIn}>Switch Account</Button>
                <Button size="xs" variant="subtle" color="red" ml="auto" leftSection={<LogOut size={13} />} loading={busy === 'signout'} onClick={signOut}>Sign Out</Button>
              </Group>
            </>
          ) : deviceFlow ? (
            <Paper radius="md" withBorder p="md" mt="md">
              <Group justify="space-between">
                <Box>
                  <Text size="10px" c="dimmed" tt="uppercase">One-time GitHub code</Text>
                  <Text className="device-code" fw={800} size="xl">{deviceFlow.userCode}</Text>
                  <Text size="xs" c="dimmed">Copy the code, then approve access on GitHub.</Text>
                </Box>
                <Button leftSection={<Copy size={14} />} onClick={openDeviceFlow}>Copy &amp; Open GitHub</Button>
              </Group>
            </Paper>
          ) : (
            <Paper radius="md" withBorder p="md" mt="md">
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Connect an account with an active GitHub Copilot subscription.</Text>
                <Button leftSection={<FaGithub size={15} />} loading={busy === 'signin'} onClick={startSignIn}>Sign in with GitHub</Button>
              </Group>
            </Paper>
          )}
        </Card>

        <Card className="settings-section" radius="lg" withBorder padding="lg">
          <Group justify="space-between" align="flex-start" mb="md">
            <Box>
              <Text fw={700} size="sm">Default AI Engine Model</Text>
              <Text size="xs" c="dimmed" mt={3}>Select the foundation model provided through your GitHub Copilot subscription to power task deconstruction, scheduling buffers, and calendar planning.</Text>
            </Box>
            <Badge variant="outline" color="gray" size="xs">Powered by GitHub Copilot API</Badge>
          </Group>
          <Paper radius="md" withBorder p="md">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Box>
                <Text size="xs" fw={650} mb={5}>Select Model</Text>
                <Text size="10px" c="dimmed">Primary foundation model for planning and task decomposition</Text>
              </Box>
              <Select
                data={modelOptions}
                value={settings.ai.defaultModel}
                onChange={(value) => updateAi('defaultModel', value)}
                disabled={!auth.authenticated}
                rightSection={busy === 'models' ? <Loader size={13} /> : undefined}
                searchable
              />
              <Box>
                <Text size="xs" fw={650} mb={5}>Reasoning Effort</Text>
                <Text size="10px" c="dimmed">Controls planning depth for supported models</Text>
              </Box>
              <Select
                data={[{ value: 'default', label: 'Model default' }, ...reasoningOptions.map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))]}
                value={settings.ai.reasoningEffort}
                onChange={(value) => updateAi('reasoningEffort', value)}
                disabled={!selectedModel?.supportsReasoningEffort}
              />
            </SimpleGrid>
          </Paper>
          <Text size="10px" c="dimmed" mt="sm">{models.length ? `${models.length} models available through your Copilot subscription.` : 'Connect Copilot to load available models.'}</Text>
        </Card>

        <Card className="settings-section" radius="lg" withBorder padding="lg">
          <Group justify="space-between" mb="md">
            <Group gap={7}><Activity size={15} /><Text fw={700} size="sm">Telemetry &amp; Connection Diagnostics</Text></Group>
            <Button size="compact-xs" variant="subtle" leftSection={<RefreshCw size={12} />} onClick={refreshAuth}>Check Connection</Button>
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            <Paper className="diagnostic-tile" p="md" radius="md">
              <Group justify="space-between"><Text size="9px" c="dimmed">ROUNDTRIP LATENCY</Text><Zap size={13} color={latency === null ? '#9ca3af' : '#22c55e'} /></Group>
              <Text fw={700} mt={6}>
                {latency === null ? '—' : `${latency} ms`}{' '}
                <Text component="span" size="10px" c="dimmed">{latency === null ? 'Not measured' : 'Desktop bridge'}</Text>
              </Text>
            </Paper>
            <Paper className="diagnostic-tile" p="md" radius="md">
              <Group justify="space-between"><Text size="9px" c="dimmed">CONNECTION STATUS</Text><ShieldCheck size={13} color={auth.authenticated ? '#3b82f6' : '#9ca3af'} /></Group>
              <Text fw={700} mt={6}>
                {auth.authenticated ? 'Connected' : 'Disconnected'}{' '}
                <Text component="span" size="10px" c="dimmed">{auth.host || '—'}</Text>
              </Text>
            </Paper>
            <Paper className="diagnostic-tile" p="md" radius="md">
              <Group justify="space-between"><Text size="9px" c="dimmed">ACTIVE MODEL</Text><Cloud size={13} color={selectedModel ? '#3b82f6' : '#9ca3af'} /></Group>
              <Text fw={700} mt={6}>
                {selectedModel?.name || 'Copilot default'}{' '}
                <Text component="span" size="10px" c="dimmed">{models.length ? `${models.length} available` : 'Not loaded'}</Text>
              </Text>
            </Paper>
          </SimpleGrid>
        </Card>
      </Stack>

      <Group justify="center" gap={6} mt="lg">
        <Check size={12} color="#16a34a" />
        <Text size="10px" c="dimmed">All changes save automatically to your Pacing local workspace.</Text>
      </Group>
    </div>
  )
}

export default StitchSettingsPage
