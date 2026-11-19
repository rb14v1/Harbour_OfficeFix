import { useCallback, useEffect, useMemo, useState } from 'react'
import { CATEGORIES, PRIORITIES, STATUSES, deleteRequest, listRequests, listTechnicians } from '../services/api.js'
import { displayCategory, formatDateTime } from '../services/format.js'
import { PriorityBadge, StatusBadge } from '../components/Badges.jsx'
import { EmptyState, ErrorState, LoadingState } from '../components/StateMessage.jsx'
import AssignTechnicianModal from '../components/AssignTechnicianModal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import RequestDetailModal from '../components/RequestDetailModal.jsx'

const EMPTY_FILTERS = { status: '', priority: '', category: '' }

export default function RequestsPage({ onNotify }) {
  const [requests, setRequests] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [search, setSearch] = useState('')
  const [assignment, setAssignment] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [assigning, setAssigning] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [requestRows, technicianRows] = await Promise.all([listRequests(filters), listTechnicians()])
      setRequests(requestRows)
      setTechnicians(technicianRows)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    load()
  }, [load])

  const visibleRequests = useMemo(() => {
    const byAssignment = requests.filter((request) => {
      if (assignment === 'unassigned') return request.technician_id === null
      if (assignment === 'assigned') return request.technician_id !== null
      return true
    })
    const term = search.trim().toLowerCase()
    if (!term) return byAssignment
    return byAssignment.filter((request) =>
      [
        String(request.id),
        request.title,
        request.employee_name,
        request.location,
        request.category,
        request.category_other || '',
        request.technician_name || '',
      ].some((value) => value.toLowerCase().includes(term))
    )
  }, [requests, search, assignment])

  const hasActiveFilters = Boolean(search.trim() || assignment || filters.status || filters.priority || filters.category)

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function clearFilters() {
    setSearch('')
    setAssignment('')
    setFilters(EMPTY_FILTERS)
  }

  function handleSaved(updated) {
    setRequests((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    setSelected(updated)
    onNotify(`Request #${updated.id} saved.`)
  }

  function handleAssigned(updated) {
    setRequests((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    onNotify(
      updated.technician_name
        ? `Request #${updated.id} assigned to ${updated.technician_name}.`
        : `Request #${updated.id} is now unassigned.`
    )
    load()
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await deleteRequest(pendingDelete.id)
      onNotify(`Request #${pendingDelete.id} deleted.`)
      if (selected?.id === pendingDelete.id) setSelected(null)
      setPendingDelete(null)
      await load()
    } catch (err) {
      onNotify(err.message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="d-flex flex-column gap-3">
      <section className="card shadow-sm border-0">
        <div className="card-body">
          <div className="row g-2 align-items-center mb-3">
            <div className="col-12 col-lg-4">
              <input
                className="form-control"
                type="search"
                placeholder="Search by ID, title, employee, location or technician"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search requests"
              />
            </div>
            <div className="col-6 col-md-3 col-lg-2">
              <select className="form-select" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)} aria-label="Filter by status">
                <option value="">All statuses</option>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div className="col-6 col-md-3 col-lg-2">
              <select className="form-select" value={filters.priority} onChange={(e) => updateFilter('priority', e.target.value)} aria-label="Filter by priority">
                <option value="">All priorities</option>
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </div>
            <div className="col-6 col-md-3 col-lg-2">
              <select className="form-select" value={filters.category} onChange={(e) => updateFilter('category', e.target.value)} aria-label="Filter by category">
                <option value="">All categories</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className="col-6 col-md-3 col-lg-1">
              <select className="form-select" value={assignment} onChange={(e) => setAssignment(e.target.value)} aria-label="Filter by assignment">
                <option value="">All</option>
                <option value="unassigned">Unassigned</option>
                <option value="assigned">Assigned</option>
              </select>
            </div>
          </div>
          {hasActiveFilters && (
            <button type="button" className="btn btn-link btn-sm p-0 mb-2" onClick={clearFilters}>
              Clear filters
            </button>
          )}

          {loading && requests.length === 0 ? (
            <LoadingState label="Loading requests..." />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : visibleRequests.length === 0 ? (
            <EmptyState
              message={
                hasActiveFilters
                  ? 'No requests match the current search or filters.'
                  : 'No maintenance requests yet. Submitted requests will appear here.'
              }
            />
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Priority</th>
                    <th>Technician</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th className="actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRequests.map((request) => (
                    <tr key={request.id}>
                      <td className="text-secondary">#{request.id}</td>
                      <td>
                        <button type="button" className="link-button" onClick={() => setSelected(request)}>
                          {request.title}
                        </button>
                        <div className="small text-secondary">{request.employee_name}</div>
                      </td>
                      <td>{displayCategory(request)}</td>
                      <td>{request.location}</td>
                      <td><PriorityBadge priority={request.priority} /></td>
                      <td>{request.technician_name || <span className="text-secondary">Unassigned</span>}</td>
                      <td><StatusBadge status={request.status} /></td>
                      <td className="text-nowrap">{formatDateTime(request.created_at)}</td>
                      <td className="actions-col">
                        <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setAssigning(request)}>
                          {request.technician_id ? 'Reassign' : 'Assign'}
                        </button>
                        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setSelected(request)}>
                          View
                        </button>
                        <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setPendingDelete(request)}>
                          Delete
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

      {assigning && (
        <AssignTechnicianModal
          request={assigning}
          technicians={technicians}
          onClose={() => setAssigning(null)}
          onAssigned={handleAssigned}
        />
      )}

      {selected && (
        <RequestDetailModal
          request={selected}
          technicians={technicians}
          onClose={() => setSelected(null)}
          onSaved={handleSaved}
          onNotify={onNotify}
          onRequestDelete={() => setPendingDelete(selected)}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete maintenance request?"
          message={`Request #${pendingDelete.id} "${pendingDelete.title}" will be permanently deleted. This cannot be undone.`}
          confirmLabel="Delete request"
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}
