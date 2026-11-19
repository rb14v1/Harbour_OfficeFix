import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboardStats } from '../services/api.js'
import { formatDateTime } from '../services/format.js'
import { AvailabilityBadge, PriorityBadge, StatusBadge } from '../components/Badges.jsx'
import { EmptyState, ErrorState, LoadingState } from '../components/StateMessage.jsx'

const CARDS = [
  { key: 'total_requests', label: 'Total requests', tone: '', path: '/requests' },
  { key: 'open_requests', label: 'Open', tone: 'open', path: '/requests' },
  { key: 'in_progress_requests', label: 'In progress', tone: 'progress', path: '/requests' },
  { key: 'resolved_requests', label: 'Resolved', tone: 'resolved', path: '/requests' },
  { key: 'high_priority_unresolved', label: 'High priority unresolved', tone: 'high', path: '/requests' },
  { key: 'total_technicians', label: 'Technicians', tone: '', path: '/technicians' },
  { key: 'available_technicians', label: 'Available technicians', tone: 'resolved', path: '/technicians' },
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setStats(await getDashboardStats())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading && !stats) return <LoadingState label="Loading dashboard..." />
  if (error && !stats) return <ErrorState message={error} onRetry={load} />

  return (
    <div className="d-flex flex-column gap-4">
      {error && <ErrorState message={error} onRetry={load} />}

      <section className="row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-3" aria-label="Summary">
        {CARDS.map((card) => (
          <div className="col" key={card.key}>
            <button
              type="button"
              className={`card stat-card shadow-sm border-0 p-3 h-100 stat-card--${card.tone || 'neutral'}`}
              onClick={() => navigate(card.path)}
            >
              <span className="stat-card__label">{card.label}</span>
              <span className="stat-card__value">{stats[card.key]}</span>
            </button>
          </div>
        ))}
      </section>

      <div className="row g-4">
        <section className="col-lg-7">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Recently submitted</h2>
              <button type="button" className="btn btn-link btn-sm" onClick={() => navigate('/requests')}>
                View all
              </button>
            </div>
            {stats.recent_requests.length === 0 ? (
              <EmptyState message="No maintenance requests have been submitted yet." />
            ) : (
              <ul className="list-group list-group-flush">
                {stats.recent_requests.map((request) => (
                  <li key={request.id} className="list-group-item d-flex justify-content-between align-items-center gap-3">
                    <div className="d-flex flex-column min-w-0">
                      <span className="fw-semibold text-truncate">#{request.id} {request.title}</span>
                      <span className="small text-secondary">
                        {request.location} · {formatDateTime(request.created_at)}
                      </span>
                    </div>
                    <div className="d-flex gap-2 flex-shrink-0">
                      <PriorityBadge priority={request.priority} />
                      <StatusBadge status={request.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="col-lg-5">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white">
              <h2 className="h6 mb-0">Technician workload</h2>
            </div>
            {stats.technician_workload.length === 0 ? (
              <EmptyState message="No technicians have been added yet." />
            ) : (
              <div className="table-responsive">
                <table className="table table-sm mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Technician</th>
                      <th>Availability</th>
                      <th className="text-end">Active requests</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.technician_workload.map((row) => (
                      <tr key={row.technician_id}>
                        <td>{row.name}</td>
                        <td><AvailabilityBadge availability={row.availability} /></td>
                        <td className="text-end">{row.active_requests}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
