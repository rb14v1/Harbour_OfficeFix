export default function CharCounter({ length, max }) {
  const ratio = length / max
  const tone = ratio >= 1 ? 'text-danger fw-semibold' : ratio >= 0.9 ? 'text-warning' : 'text-secondary'
  return (
    <span className={`char-counter ${tone}`} aria-live="polite">
      {length} / {max}
    </span>
  )
}
