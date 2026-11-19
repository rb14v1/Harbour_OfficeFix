import { useState } from 'react'
import { updateRequest } from '../services/api.js'
import Modal from './Modal.jsx'

export default function AssignTechnicianModal({ request, technicians, onClose, onAssigned }) {
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)

  const available = technicians.filter((t) => t.availability === 'Available').length
  const current = request.technician_id

  async function assign(technicianId) {
    setBusyId(technicianId ?? 'none')
    setError(null)
    try {
      const updated = await updateRequest(request.id, { technician_id: technicianId })
      onAssigned(updated)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Modal title={`Assign technician: request #${request.id}`} onClose={onClose} size="lg">
      <p className="mb-1">
        <span className="fw-semibold">{request.title}</span>
        <span className="text-secondary small">
          {' '}· Currently {request.technician_name ? <strong>{request.technician_name}</strong> : 'unassigned'}
        </span>
      </p>
      <p className="text-secondary small assign-count">
        {available} of {technicians.length} technicians available. Only available technicians can be newly assigned.
      </p>

      {error && <div className="alert alert-danger" role="alert">{error}</div>}

      {technicians.length === 0 ? (
        <p className="text-secondary mb-0">No technicians exist yet. Add one on the Technicians page first.</p>
      ) : (
        <div className="list-group assign-list">
          {technicians.map((technician) => {
            const isCurrent = technician.id === current
            const selectable = technician.availability === 'Available' || isCurrent
            return (
              <div
                key={technician.id}
                className={`list-group-item d-flex justify-content-between align-items-center gap-3 assign-list__item ${!selectable ? 'is-disabled bg-light text-secondary' : ''}`}
              >
                <div className="d-flex flex-column">
                  <span className="fw-semibold">{technician.name}</span>
                  <span className="small text-secondary">
                    {technician.specialization} · {technician.active_request_count} active request
                    {technician.active_request_count === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="d-flex align-items-center gap-2 flex-shrink-0">
                  <span className={`badge rounded-pill ${technician.availability === 'Available' ? 'text-bg-success' : 'text-bg-secondary'}`}>
                    {technician.availability}
                  </span>
                  {isCurrent ? (
                    <span className="badge rounded-pill text-bg-primary">Assigned</span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={!selectable || busyId !== null}
                      onClick={() => assign(technician.id)}
                      title={selectable ? '' : 'Unavailable technicians cannot be assigned'}
                    >
                      {busyId === technician.id ? 'Assigning...' : 'Assign'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {current && (
        <div className="mt-3">
          <button type="button" className="btn btn-outline-danger btn-sm" disabled={busyId !== null} onClick={() => assign(null)}>
            {busyId === 'none' ? 'Removing...' : 'Remove assignment'}
          </button>
        </div>
      )}
    </Modal>
  )
}
