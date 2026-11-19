import { NavLink } from 'react-router-dom'

export default function Sidebar({ pages, open, onClose }) {
  return (
    <aside className={`sidebar ${open ? 'sidebar--open' : ''}`} aria-label="Main navigation">
      <div className="sidebar__brand">
        <span className="sidebar__logo">OF</span>
        <div>
          <div className="sidebar__title">OfficeFix</div>
          <div className="sidebar__subtitle">Maintenance Management</div>
        </div>
      </div>
      <nav className="nav flex-column sidebar__nav">
        {pages.map((page) => (
          <NavLink
            key={page.path}
            to={page.path}
            end={page.path === '/'}
            onClick={onClose}
            className={({ isActive }) => `nav-link sidebar__link ${isActive ? 'active' : ''}`}
          >
            <i className={`bi ${page.icon}`} aria-hidden="true" />
            <span>{page.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar__footer">Internal use only</div>
    </aside>
  )
}
