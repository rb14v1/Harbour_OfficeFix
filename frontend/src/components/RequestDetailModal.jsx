import { useMemo, useState } from 'react'
import { CATEGORIES, PRIORITIES, STATUSES, updateRequest } from '../services/api.js'
import { formatDateTime } from '../services/format.js'
import { LIMITS, checkEmail, checkName, checkText } from '../services/validation.js'
import { PriorityBadge, StatusBadge } from './Badges.jsx'
import FormField from './FormField.jsx'
import Modal from './Modal.jsx'

const TEXT_FIELDS = [
  { key: 'employee_name', label: 'Employee name', max: LIMITS.name, hint: 'Letters, spaces, hyphens, apostrophes and periods only.' },
  { key: 'employee_email', label: 'Employee email', max: LIMITS.email },
  { key: 'title', label: 'Issue title', max: LIMITS.title, hint: "Letters, numbers and . , - ( ) / & ' # only." },
  { key: 'location', label: 'Location / floor', max: LIMITS.location, hint: "Letters, numbers and . , - ( ) / & ' # only." },
]

function toFormState(request) {
  return {
    employee_name: request.employee_name,
    employee_email: request.employee_email,
    title: request.title,
    description: request.description,
    category: request.category,
    category_other: request.category_other || '',
    location: request.location,
    priority: request.priority,
    status: request.status,
    technician_id: request.technician_id ? String(request.technician_id) : '',
    resolution_notes: request.resolution_notes || '',
  }
}

function validate(form) {
  const errors = {
    employee_name: checkName(form.employee_name, 'Employee name') || undefined,
    employee_email: checkEmail(form.employee_email) || undefined,
    title: checkText(form.title, 'Issue title', LIMITS.title) || undefined,
    location: checkText(form.location, 'Location / floor', LIMITS.location) || undefined,
  }
  if (form.category === 'Other') {
    errors.category_other = checkText(form.category_other, 'Other category', LIMITS.categoryOther) || undefined
  }
  if (!form.description.trim()) errors.description = 'Description is required.'
  else if (form.description.length > LIMITS.description) errors.description = `Description must be ${LIMITS.description} characters or fewer.`
  if (form.resolution_notes.length > LIMITS.notes) errors.resolution_notes = `Resolution notes must be ${LIMITS.notes} characters or fewer.`
  return errors
}

// Build a PATCH body containing only fields that differ from the stored request.
function buildChanges(request, form) {
  const changes = {}
  for (const field of [...TEXT_FIELDS.map((f) => f.key), 'description', 'priority', 'status']) {
    const next = form[field].trim()
    if (next !== request[field]) changes[field] = next
  }
  if (form.category !== request.category) changes.category = form.category
  const nextOther = form.category === 'Other' ? form.category_other.trim() : null
  if (nextOther !== (request.category_other || null)) changes.category_other = nextOther
  if (form.resolution_notes.trim() !== (request.resolution_notes || '').trim()) {
    changes.resolution_notes = form.resolution_notes.trim() || null
  }
  const nextTechnician = form.technician_id ? Number(form.technician_id) : null
  if (nextTechnician !== request.technician_id) changes.technician_id = nextTechnician
  return changes
}

const HINTS = Object.fromEntries(TEXT_FIELDS.map((field) => [field.key, field.hint]))

export default function RequestDetailModal({ request, technicians, onClose, onSaved, onNotify, onRequestDelete }) {
  const [form, setForm] = useState(() => toFormState(request))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const changes = useMemo(() => buildChanges(request, form), [request, form])
  const dirty = Object.keys(changes).length > 0

  // Assignable: available technicians, plus the current one even if now unavailable (so it stays visible).
  const technicianOptions = technicians.filter(
    (technician) => technician.availability === 'Available' || technician.id === request.technician_id
  )

  function update(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === 'category' && value !== 'Other' ? { category_other: '' } : {}),
    }))
    setErrors((current) => ({ ...current, [key]: undefined }))
    setSaveError(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validate(form)
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return
    if (!dirty) {
      onNotify('No changes to save.', 'info')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await updateRequest(request.id, changes)
      onSaved(updated)
      setForm(toFormState(updated))
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const footer = (
    <>
      <button type="button" className="btn btn-outline-danger" onClick={onRequestDelete} disabled={saving}>
        Delete request
      </button>
      <div className="d-flex gap-2">
        <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>
          Close
        </button>
        <button type="submit" form="request-detail-form" className="btn btn-primary" disabled={saving || !dirty}>
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </>
  )

  return (
    <Modal title={`Request #${request.id}`} onClose={onClose} footer={footer} size="xl">
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3 pb-3 border-bottom">
        <StatusBadge status={request.status} />
        <PriorityBadge priority={request.priority} />
        <span className="text-secondary small">Submitted {formatDateTime(request.created_at)}</span>
        {request.resolved_at && <span className="text-secondary small">Resolved {formatDateTime(request.resolved_at)}</span>}
        <span className="text-secondary small">Last updated {formatDateTime(request.updated_at)}</span>
      </div>

      <form id="request-detail-form" className="row g-3" onSubmit={handleSubmit} noValidate>
        {TEXT_FIELDS.map((field) => (
          <FormField
            key={field.key}
            label={field.label}
            error={errors[field.key]}
            hint={HINTS[field.key]}
            counter={form[field.key].length}
            max={field.max}
          >
            <input
              className={`form-control ${errors[field.key] ? 'is-invalid' : ''}`}
              value={form[field.key]}
              maxLength={field.max}
              onChange={(e) => update(field.key, e.target.value)}
            />
          </FormField>
        ))}

        <FormField label="Category" error={errors.category}>
          <select className="form-select" value={form.category} onChange={(e) => update('category', e.target.value)}>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </FormField>

        {form.category === 'Other' && (
          <FormField label="Specify the category" error={errors.category_other} counter={form.category_other.length} max={LIMITS.categoryOther}>
            <input
              className={`form-control ${errors.category_other ? 'is-invalid' : ''}`}
              value={form.category_other}
              maxLength={LIMITS.categoryOther}
              onChange={(e) => update('category_other', e.target.value)}
            />
          </FormField>
        )}

        <FormField label="Priority" error={errors.priority}>
          <select className="form-select" value={form.priority} onChange={(e) => update('priority', e.target.value)}>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>{priority}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Status" error={errors.status}>
          <select className="form-select" value={form.status} onChange={(e) => update('status', e.target.value)}>
            {STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Assigned technician" error={errors.technician_id} hint="Only available technicians can be newly assigned.">
          <select className="form-select" value={form.technician_id} onChange={(e) => update('technician_id', e.target.value)}>
            <option value="">Unassigned</option>
            {technicianOptions.map((technician) => (
              <option key={technician.id} value={technician.id}>
                {technician.name}
                {technician.availability === 'Unavailable' ? ' (unavailable)' : ''}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Description" error={errors.description} full counter={form.description.length} max={LIMITS.description}>
          <textarea
            className="form-control"
            rows={4}
            value={form.description}
            maxLength={LIMITS.description}
            onChange={(e) => update('description', e.target.value)}
          />
        </FormField>

        <FormField
          label="Resolution notes"
          error={errors.resolution_notes}
          full
          hint="Record what was done to fix the issue."
          counter={form.resolution_notes.length}
          max={LIMITS.notes}
        >
          <textarea
            className="form-control"
            rows={4}
            value={form.resolution_notes}
            maxLength={LIMITS.notes}
            onChange={(e) => update('resolution_notes', e.target.value)}
          />
        </FormField>

        {saveError && (
          <div className="col-12">
            <div className="alert alert-danger mb-0" role="alert">{saveError}</div>
          </div>
        )}
      </form>
    </Modal>
  )
}
