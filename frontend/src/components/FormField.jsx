import CharCounter from './CharCounter.jsx'

// Wraps a single input with its label, hint or error, and optional character counter.
// The label element wraps the control so the field is reachable by its label text.
export default function FormField({ label, error, hint, counter, max, full = false, children }) {
  return (
    <div className={`field ${full ? 'col-12' : 'col-md-6'}`}>
      <label className="form-label fw-semibold small w-100 mb-1">
        {label}
        <span className="d-block mt-1">{children}</span>
      </label>
      <div className="field__footer mt-1">
        <div className="flex-grow-1">
          {error ? (
            <span className="text-danger">{error}</span>
          ) : (
            hint && <span className="text-secondary">{hint}</span>
          )}
        </div>
        {max && <CharCounter length={counter} max={max} />}
      </div>
    </div>
  )
}
