import { useCallback, useEffect, useState } from 'react'
import { listTechnicians, updateTechnician } from '../services/api.js'
import { formatDate } from '../services/format.js'
import { AvailabilityBadge } from '../components/Badges.jsx'
import { EmptyState, ErrorState, LoadingState } from '../components/StateMessage.jsx'
import TechnicianModal from '../components/TechnicianModal.jsx'

export default function TechniciansPage({ onNotify }) {
  const [technicians, setTechnicians] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)
  const [togglingId, setTogglingId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setTechnicians(await listTechnicians())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function toggleAvailability(technician) {
    const next = technician.availability === 'Available' ? 'Unavailable' : 'Available'
    setTogglingId(technician.id)
    try {
      const updated = await updateTechnician(technician.id, { availability: next })
      setTechnicians((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      onNotify(`${updated.name} is now ${updated.availability.toLowerCase()}.`)
    } catch (err) {
      onNotify(err.message, 'error')
    } finally {
      setTogglingId(null)
    }
  }

  function handleSaved(saved, message) {
    setEditing(null)
    setAdding(false)
    onNotify(message)
    load()
  }

  return (
    <div className="d-flex flex-column gap-3">
      <section className="card shadow-sm border-0">
        <div className="card-header bg-white d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>
            <h2 className="h6 mb-0">Maintenance team</h2>
            <p className="small text-secondary mb-0">Only technicians marked Available can be assigned to new requests.</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
            Add technician
          </button>
        </div>

        <div className="card-body p-0">
          {loading && technicians.length === 0 ? (
            <LoadingState label="Loading technicians..." />
          ) : error ? (
            <div className="p-3"><ErrorState message={error} onRetry={load} /></div>
          ) : technicians.length === 0 ? (
            <EmptyState message="No technicians yet. Add one to start assigning requests." />
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Specialization</th>
                    <th>Availability</th>
                    <th className="text-end">Active requests</th>
                    <th>Added</th>
                    <th className="actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {technicians.map((technician) => (
                    <tr key={technician.id}>
                      <td className="fw-semibold">{technician.name}</td>
                      <td>{technician.email}</td>
                      <td>{technician.specialization}</td>
                      <td><AvailabilityBadge availability={technician.availability} /></td>
                      <td className="text-end">{technician.active_request_count}</td>
                      <td className="text-nowrap">{formatDate(technician.created_at)}</td>
                      <td className="actions-col">
                        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setEditing(technician)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => toggleAvailability(technician)}
                          disabled={togglingId === technician.id}
                        >
                          {togglingId === technician.id
                            ? 'Updating...'
                            : technician.availability === 'Available'
                              ? 'Mark unavailable'
                              : 'Mark available'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {adding && <TechnicianModal onClose={() => setAdding(false)} onSaved={handleSaved} />}
      {editing && <TechnicianModal technician={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />}
    </div>
  )
}
