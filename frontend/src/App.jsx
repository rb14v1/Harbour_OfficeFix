import { useCallback, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import Topbar from './components/Topbar.jsx'
import Toast from './components/Toast.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import RequestsPage from './pages/RequestsPage.jsx'
import SubmitRequestPage from './pages/SubmitRequestPage.jsx'
import TechniciansPage from './pages/TechniciansPage.jsx'

export const PAGES = [
  { path: '/', label: 'Dashboard', title: 'Dashboard', subtitle: 'Live maintenance overview', icon: 'bi-speedometer2' },
  { path: '/requests', label: 'Maintenance Requests', title: 'Maintenance Requests', subtitle: 'Review, assign and resolve office issues', icon: 'bi-clipboard-check' },
  { path: '/submit', label: 'Submit Request', title: 'Submit Maintenance Request', subtitle: 'Report an office issue to the facilities team', icon: 'bi-plus-circle' },
  { path: '/technicians', label: 'Technicians', title: 'Technicians', subtitle: 'Manage maintenance staff and availability', icon: 'bi-people' },
]

export default function App() {
  const location = useLocation()
  const [navOpen, setNavOpen] = useState(false)
  const [toast, setToast] = useState(null)

  const current = PAGES.find((page) => page.path === location.pathname) || PAGES[0]

  const notify = useCallback((message, type = 'success') => {
    setToast({ id: Date.now(), message, type })
  }, [])
  const dismissToast = useCallback(() => setToast(null), [])

  return (
    <div className="app-shell">
      <Sidebar pages={PAGES} open={navOpen} onClose={() => setNavOpen(false)} />
      {navOpen && <div className="sidebar-backdrop" onClick={() => setNavOpen(false)} aria-hidden="true" />}
      <div className="app-main">
        <Topbar title={current.title} subtitle={current.subtitle} onToggleNav={() => setNavOpen((open) => !open)} />
        <main className="page-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/requests" element={<RequestsPage onNotify={notify} />} />
            <Route path="/submit" element={<SubmitRequestPage onNotify={notify} />} />
            <Route path="/technicians" element={<TechniciansPage onNotify={notify} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  )
}
