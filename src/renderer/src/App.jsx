import { useState } from 'react'
import SettingsPage from './components/SettingsPage'

function App() {
  const [status, setStatus] = useState('Not checked')
  const [activeView, setActiveView] = useState('overview')
  const versions = window.api.getVersions()

  const checkDesktopBridge = async () => {
    setStatus('Checking…')
    const result = await window.api.ping()
    setStatus(result === 'ready' ? 'Connected' : 'Unavailable')
  }

  return (
    <main className="shell">
      <nav className="nav" aria-label="Primary navigation">
        <div className="brand-mark" aria-hidden="true">P</div>
        <div className="nav-items">
          <button className={`nav-item ${activeView === 'overview' ? 'active' : ''}`} type="button" aria-label="Overview" onClick={() => setActiveView('overview')}>⌂</button>
          <button className={`nav-item ${activeView === 'workspace' ? 'active' : ''}`} type="button" aria-label="Workspace" onClick={() => setActiveView('workspace')}>◇</button>
          <button className={`nav-item ${activeView === 'settings' ? 'active' : ''}`} type="button" aria-label="Settings" onClick={() => setActiveView('settings')}>⚙</button>
        </div>
        <div className="nav-avatar">PC</div>
      </nav>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Desktop workspace</p>
            <h1>{activeView === 'settings' ? 'Settings' : activeView === 'workspace' ? 'Workspace' : 'Pacing'}</h1>
          </div>
          <span className="platform-pill"><i /> Windows ready</span>
        </header>

        {activeView === 'settings' ? <SettingsPage /> : <>
        <section className="hero">
          <div className="hero-copy">
            <span className="kicker">STARTER ENVIRONMENT</span>
            <h2>Your desktop foundation is ready.</h2>
            <p>
              Build the experience in React while Electron handles the native Windows shell.
              Vite keeps every iteration fast.
            </p>
            <button className="primary-button" type="button" onClick={checkDesktopBridge}>
              Test desktop bridge <span>→</span>
            </button>
          </div>
          <div className="orb" aria-hidden="true"><span /></div>
        </section>

        <section className="content-grid">
          <article className="panel stack-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Infrastructure</p>
                <h3>Application stack</h3>
              </div>
              <span className="healthy">Healthy</span>
            </div>
            <div className="stack-list">
              <div><span className="stack-icon react-icon">R</span><p><strong>React</strong><small>Renderer interface</small></p><b>Ready</b></div>
              <div><span className="stack-icon electron-icon">E</span><p><strong>Electron</strong><small>Windows runtime</small></p><b>v{versions.electron}</b></div>
              <div><span className="stack-icon vite-icon">V</span><p><strong>Vite</strong><small>Build tooling</small></p><b>Configured</b></div>
            </div>
          </article>

          <article className="panel bridge-panel">
            <div>
              <p className="eyebrow">Secure IPC</p>
              <h3>Desktop bridge</h3>
              <p className="muted">Context isolation and a minimal preload API are enabled.</p>
            </div>
            <div className="bridge-status">
              <span className={status === 'Connected' ? 'status-dot connected' : 'status-dot'} />
              <div><small>CONNECTION</small><strong>{status}</strong></div>
            </div>
          </article>
        </section>
        </>}
      </section>
    </main>
  )
}

export default App
