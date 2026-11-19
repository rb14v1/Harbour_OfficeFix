export default function Topbar({ title, subtitle, onToggleNav }) {
  return (
    <header className="topbar">
      <button type="button" className="btn btn-outline-secondary btn-sm topbar__menu" onClick={onToggleNav} aria-label="Toggle navigation">
        <i className="bi bi-list" aria-hidden="true" />
      </button>
      <div>
        <h1 className="h4 mb-0">{title}</h1>
        <p className="text-secondary small mb-0">{subtitle}</p>
      </div>
    </header>
  )
}
