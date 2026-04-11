import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { getSession, clearSession } from '../../auth/session'
import { DashboardProvider } from './DashboardContext'
import '../../styles/dashboard.css'

const navCls = ({ isActive }) =>
  `dash-nav-panel__link${isActive ? ' dash-nav-panel__link--active' : ''}`

export default function DashboardLayout() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!getSession()) navigate('/login', { replace: true })
  }, [navigate])

  if (!getSession()) return null

  return (
    <DashboardProvider>
      <DashboardShell />
    </DashboardProvider>
  )
}

function DashboardShell() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  function logout() {
    clearSession()
    setMenuOpen(false)
    navigate('/login', { replace: true })
  }

  return (
    <div className="dashboard">
      <header className="dash-header">
        <h1 className="dash-header__title">Dashboard</h1>
        <button
          type="button"
          className="dash-header__menu-btn"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      <div
        className={`dash-nav-backdrop${menuOpen ? ' dash-nav-backdrop--open' : ''}`}
        aria-hidden={!menuOpen}
        onClick={() => setMenuOpen(false)}
      />
      <nav className={`dash-nav-panel${menuOpen ? ' dash-nav-panel--open' : ''}`} aria-label="Dashboard sections">
        <NavLink to="/dashboard" end className={navCls} onClick={() => setMenuOpen(false)}>
          Dashboard
        </NavLink>
        <NavLink to="/dashboard/geo" className={navCls} onClick={() => setMenuOpen(false)}>
          Visual Insights
        </NavLink>
        <NavLink to="/dashboard/cnn" className={navCls} onClick={() => setMenuOpen(false)}>
          Detailed Analysis
        </NavLink>
        <NavLink to="/dashboard/alerts" className={navCls} onClick={() => setMenuOpen(false)}>
          Alerts
        </NavLink>
        <Link to="/" className="dash-nav-panel__link dash-nav-panel__link--muted" onClick={() => setMenuOpen(false)}>
          Home
        </Link>
        <button type="button" className="dash-nav-panel__link dash-nav-panel__logout" onClick={logout}>
          Log out
        </button>
      </nav>

      <Outlet />
    </div>
  )
}
