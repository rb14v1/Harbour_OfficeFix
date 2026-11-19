import { useEffect } from 'react'

const TONE = {
  success: 'text-bg-success',
  error: 'text-bg-danger',
  info: 'text-bg-primary',
}

export default function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(onDismiss, 4000)
    return () => clearTimeout(timer)
  }, [toast, onDismiss])

  if (!toast) return null

  return (
    <div className="toast-container position-fixed bottom-0 end-0 p-3">
      <div className={`toast show align-items-center border-0 ${TONE[toast.type] || TONE.info}`} role="status" aria-live="polite">
        <div className="d-flex">
          <div className="toast-body">{toast.message}</div>
          <button type="button" className="btn-close btn-close-white me-2 m-auto" onClick={onDismiss} aria-label="Dismiss notification" />
        </div>
      </div>
    </div>
  )
}
