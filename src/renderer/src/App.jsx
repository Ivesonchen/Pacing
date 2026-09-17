import { useState } from 'react'
import AppSidebar from './components/AppSidebar'
import CalendarPlannerPage from './components/CalendarPlannerPage'
import GoalChatPage from './components/GoalChatPage'
import StitchSettingsPage from './components/StitchSettingsPage'
import WorkspaceHeader from './components/WorkspaceHeader'

function App() {
  const [activeView, setActiveView] = useState('chat')

  const page = {
    chat: <GoalChatPage />,
    calendar: <CalendarPlannerPage />,
    settings: <StitchSettingsPage />
  }[activeView]

  return (
    <main className="application-frame">
      <AppSidebar activeView={activeView} onNavigate={setActiveView} />
      <section className="application-workspace">
        <WorkspaceHeader activeView={activeView} />
        <div className="page-viewport">{page}</div>
      </section>
    </main>
  )
}

export default App
