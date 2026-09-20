import { useEffect, useState } from 'react'
import AppSidebar from './components/AppSidebar'
import CalendarPlannerPage from './components/CalendarPlannerPage'
import GoalChatPage from './components/GoalChatPage'
import StitchSettingsPage from './components/StitchSettingsPage'
import WorkspaceHeader from './components/WorkspaceHeader'

const EMPTY_ACCOUNT = { authenticated: false, username: '' }
const MAX_PLAN_HISTORY = 20

function App() {
  const [activeView, setActiveView] = useState('chat')
  const [account, setAccount] = useState(EMPTY_ACCOUNT)
  const [appliedPlan, setAppliedPlan] = useState(null)
  const [planHistory, setPlanHistory] = useState([])

  useEffect(() => {
    let active = true

    window.api.auth
      .check()
      .then((result) => active && setAccount(result.status))
      .catch(() => active && setAccount(EMPTY_ACCOUNT))

    const offAuth = window.api.auth.onChanged(({ status }) => active && setAccount(status))

    return () => {
      active = false
      offAuth()
    }
  }, [])

  const applyPlan = (plan) => {
    // Keep the superseded schedule so an insert can be undone and retried.
    setPlanHistory((history) => [...history, appliedPlan].slice(-MAX_PLAN_HISTORY))
    setAppliedPlan(plan)
    setActiveView('calendar')
  }

  const revertPlan = () => {
    if (!planHistory.length) return
    setAppliedPlan(planHistory[planHistory.length - 1])
    setPlanHistory((history) => history.slice(0, -1))
  }

  // Direct calendar edits are undoable through the same stack as inserts.
  const updatePlan = (plan) => {
    setPlanHistory((history) => [...history, appliedPlan].slice(-MAX_PLAN_HISTORY))
    setAppliedPlan(plan)
  }

  const page = {
    chat: (
      <GoalChatPage
        account={account}
        appliedPlan={appliedPlan}
        appliedPlanId={appliedPlan?.messageId}
        onApplyPlan={applyPlan}
      />
    ),
    calendar: (
      <CalendarPlannerPage
        plan={appliedPlan}
        onClearPlan={() => applyPlan(null)}
        onRevertPlan={revertPlan}
        canRevert={planHistory.length > 0}
        onUpdatePlan={updatePlan}
      />
    ),
    settings: <StitchSettingsPage />
  }[activeView]

  return (
    <main className="application-frame">
      <AppSidebar activeView={activeView} onNavigate={setActiveView} account={account} />
      <section className="application-workspace">
        <WorkspaceHeader activeView={activeView} account={account} />
        <div className="page-viewport">{page}</div>
      </section>
    </main>
  )
}

export default App
