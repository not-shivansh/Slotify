import { NavLink } from 'react-router-dom'
import { useState } from 'react'

const navItems = [
  { to: '/events', label: 'Event Types', icon: '📅' },
  { to: '/availability', label: 'Availability', icon: '🕐' },
  { to: '/overrides', label: 'Date Overrides', icon: '📌' },
  { to: '/meetings', label: 'Meetings', icon: '👥' },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleNavClick = () => {
    setSidebarOpen(false)
  }

  return (
    <div className="app-layout">
      {/* Mobile menu button */}
      <button
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle menu"
      >
        ☰
      </button>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">S</div>
          <h1>Slotify</h1>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="main-content">
        <div className="main-content-inner">
          {/* Your page content goes here via Outlet */}
        </div>
      </main>
    </div>
  )
}
