import { useCallback, useEffect, useState } from 'react'

const EMPTY_AUTH = {
  authenticated: false,
  username: '',
  host: 'https://github.com',
  authType: ''
}

function SettingsPage() {
  const [auth, setAuth] = useState(EMPTY_AUTH)
  const [settings, setSettings] = useState(null)
  const [models, setModels] = useState([])
  const [deviceFlow, setDeviceFlow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadModels = useCallback(async () => {
    setError('')
    setBusy('models')
    try {
      const result = await window.api.models.list()
      setModels(result.models)
      return result.models
    } catch (loadError) {
      setModels([])
      setError(loadError.message)
      return []
    } finally {
      setBusy('')
    }
  }, [])

  const refreshAuth = useCallback(async () => {
    const result = await window.api.auth.check()
    setAuth(result.status)
    if (result.status.authenticated) await loadModels()
    else setModels([])
    return result.status
  }, [loadModels])

  useEffect(() => {
    let active = true

    Promise.all([window.api.auth.check(), window.api.settings.get()])
      .then(async ([authResult, settingsResult]) => {
        if (!active) return
        setAuth(authResult.status)
        setSettings(settingsResult.settings)
        if (authResult.status.authenticated) await loadModels()
      })
      .catch((loadError) => active && setError(loadError.message))
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
      setNotice(`Signed in as ${username}.`)
      setError('')
      void refreshAuth()
    })
    const offFailure = window.api.auth.onLoginFailed(({ reason }) => {
      if (!active) return
      setBusy('')
      setError(reason)
    })
    const offSettings = window.api.settings.onChanged(({ settings: nextSettings }) => {
      if (active) setSettings(nextSettings)
    })

    return () => {
      active = false
      offAuth()
      offSuccess()
      offFailure()
      offSettings()
      void window.api.auth.cancelDeviceFlow()
    }
  }, [loadModels, refreshAuth])

  const startSignIn = async () => {
    setBusy('signin')
    setError('')
    setNotice('')
    try {
      const result = await window.api.auth.startDeviceFlow()
      if (result.userCode) setDeviceFlow(result)
      else await refreshAuth()
    } catch (signInError) {
      setError(signInError.message)
    } finally {
      setBusy('')
    }
  }

  const cancelSignIn = async () => {
    await window.api.auth.cancelDeviceFlow()
    setDeviceFlow(null)
    setBusy('')
  }

  const openVerificationPage = async () => {
    await navigator.clipboard?.writeText(deviceFlow.userCode).catch(() => {})
    await window.api.openExternal(deviceFlow.verificationUri)
  }

  const handleSignOut = async () => {
    setBusy('signout')
    setError('')
    try {
      await window.api.auth.signOut()
      setAuth(EMPTY_AUTH)
      setModels([])
      setDeviceFlow(null)
      setNotice('Signed out of GitHub Copilot on this device.')
    } catch (signOutError) {
      setError(signOutError.message)
    } finally {
      setBusy('')
    }
  }

  const updateAiSetting = async (name, value) => {
    const optimistic = { ...settings, ai: { ...settings.ai, [name]: value } }
    setSettings(optimistic)
    setError('')
    setNotice('')
    try {
      await window.api.settings.update({ ai: optimistic.ai })
      setNotice('AI preferences saved.')
    } catch (saveError) {
      setError(saveError.message)
      const result = await window.api.settings.get()
      setSettings(result.settings)
    }
  }

  if (loading || !settings) {
    return <div className="settings-loading">Loading AI settings…</div>
  }

  const selectedModel = models.find((model) => model.id === settings.ai.defaultModel)
  const supportsReasoning = selectedModel?.supportsReasoningEffort === true
  const reasoningOptions = selectedModel?.supportedReasoningEfforts?.length
    ? selectedModel.supportedReasoningEfforts
    : ['low', 'medium', 'high']

  return (
    <div className="settings-page">
      <section className="settings-intro">
        <p className="eyebrow">Configuration</p>
        <h2>AI &amp; accounts</h2>
        <p>Connect GitHub Copilot and choose the defaults Pacing will use for new AI sessions.</p>
      </section>

      {(error || notice) && (
        <div className={`settings-message ${error ? 'error' : 'success'}`} role="status">
          {error || notice}
        </div>
      )}

      <section className="settings-card">
        <div className="settings-card-heading">
          <div>
            <p className="eyebrow">Sign-ins</p>
            <h3>GitHub Copilot</h3>
            <p className="muted">Uses GitHub&apos;s official Copilot CLI and secure device authorization.</p>
          </div>
          <span className={`account-status ${auth.authenticated ? 'connected' : ''}`}>
            {auth.authenticated ? 'Connected' : 'Not connected'}
          </span>
        </div>

        {auth.authenticated ? (
          <div className="account-row">
            <div className="account-identity">
              <span className="account-avatar">{auth.username.slice(0, 2).toUpperCase() || 'GH'}</span>
              <div>
                <strong>{auth.username || 'GitHub account'}</strong>
                <small>{auth.host.replace(/^https?:\/\//, '')} · {auth.authType || 'user authentication'}</small>
              </div>
            </div>
            <button className="secondary-button danger" type="button" onClick={handleSignOut} disabled={Boolean(busy)}>
              {busy === 'signout' ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        ) : deviceFlow ? (
          <div className="device-flow">
            <div>
              <small>ONE-TIME CODE</small>
              <strong>{deviceFlow.userCode}</strong>
              <p>Open GitHub, paste this code, and approve access for Copilot.</p>
            </div>
            <div className="button-row">
              <button className="primary-button" type="button" onClick={openVerificationPage}>Copy code &amp; open GitHub</button>
              <button className="secondary-button" type="button" onClick={cancelSignIn}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="account-row disconnected-account">
            <p>Sign in with an account that has access to GitHub Copilot.</p>
            <button className="primary-button" type="button" onClick={startSignIn} disabled={Boolean(busy)}>
              {busy === 'signin' ? 'Starting sign-in…' : 'Sign in with GitHub'}
            </button>
          </div>
        )}
      </section>

      <section className={`settings-card ${!auth.authenticated ? 'disabled-card' : ''}`}>
        <div className="settings-card-heading">
          <div>
            <p className="eyebrow">Models</p>
            <h3>Session defaults</h3>
            <p className="muted">Available models come directly from the connected Copilot account.</p>
          </div>
          {auth.authenticated && (
            <button className="text-button" type="button" onClick={loadModels} disabled={busy === 'models'}>
              {busy === 'models' ? 'Refreshing…' : 'Refresh models'}
            </button>
          )}
        </div>

        <div className="settings-form-grid">
          <label className="field">
            <span>Default model</span>
            <select
              value={settings.ai.defaultModel}
              onChange={(event) => updateAiSetting('defaultModel', event.target.value)}
              disabled={!auth.authenticated || busy === 'models'}
            >
              <option value="">Automatic / Copilot default</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>{model.name}</option>
              ))}
            </select>
            <small>{models.length ? `${models.length} models available` : 'Connect Copilot to load models'}</small>
          </label>

          <label className="field">
            <span>Reasoning effort</span>
            <select
              value={settings.ai.reasoningEffort}
              onChange={(event) => updateAiSetting('reasoningEffort', event.target.value)}
              disabled={!auth.authenticated || !supportsReasoning}
            >
              <option value="default">Model default</option>
              {reasoningOptions.map((effort) => (
                <option key={effort} value={effort}>{effort[0].toUpperCase() + effort.slice(1)}</option>
              ))}
            </select>
            <small>{supportsReasoning ? 'Applied to supported sessions' : 'Select a reasoning-capable model'}</small>
          </label>
        </div>

        {selectedModel && (
          <div className="model-capabilities">
            <span>{selectedModel.id}</span>
            {selectedModel.supportsVision && <b>Vision</b>}
            {selectedModel.supportsReasoningEffort && <b>Reasoning</b>}
          </div>
        )}
      </section>

      <section className="settings-footer">
        <p>Preferences are stored locally in Pacing&apos;s application data. OAuth tokens remain in the operating system credential store.</p>
        <button className="text-button" type="button" onClick={() => window.api.settings.reveal()}>Show settings file</button>
      </section>
    </div>
  )
}

export default SettingsPage
