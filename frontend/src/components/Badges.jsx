const STATUS_TONE = {
  Open: 'text-bg-primary',
  'In Progress': 'text-bg-warning',
  Resolved: 'text-bg-success',
}

const PRIORITY_TONE = {
  Low: 'text-bg-secondary',
  Medium: 'text-bg-warning',
  High: 'text-bg-danger',
}

const AVAILABILITY_TONE = {
  Available: 'text-bg-success',
  Unavailable: 'text-bg-secondary',
}

function Badge({ tone, children }) {
  return <span className={`badge rounded-pill ${tone || 'text-bg-light'}`}>{children}</span>
}

export function StatusBadge({ status }) {
  return <Badge tone={STATUS_TONE[status]}>{status}</Badge>
}

export function PriorityBadge({ priority }) {
  return <Badge tone={PRIORITY_TONE[priority]}>{priority}</Badge>
}

export function AvailabilityBadge({ availability }) {
  return <Badge tone={AVAILABILITY_TONE[availability]}>{availability}</Badge>
}
