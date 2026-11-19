import { useState } from 'react'
import { AVAILABILITIES, createTechnician, updateTechnician } from '../services/api.js'
import { LIMITS, checkEmail, checkName, checkText } from '../services/validation.js'
import FormField from './FormField.jsx'
import Modal from './Modal.jsx'

export default function TechnicianModal({ technician, onClose, onSaved }) {
  const isEdit = Boolean(technician)
  const [form, setForm] = useState({
    name: technician?.name || '',
    email: technician?.email || '',
    specialization: technician?.specialization || '',
    availability: technician?.availability || 'Available',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
    setSaveError(null)
  }

  function validate() {
    return {
      name: checkName(form.name, 'Name') || undefined,
      email: checkEmail(form.email) || undefined,
      specialization: checkText(form.specialization, 'Specialization', LIMITS.specialization) || undefined,
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      specialization: form.specialization.trim(),
      availability: form.availability,
    }

    setSaving(true)
    setSaveError(null)
    try {
      if (isEdit) {
        const saved = await updateTechnician(technician.id, payload)
        onSaved(saved, `${saved.name} updated.`)
      } else {
        const saved = await createTechnician(payload)
        onSaved(saved, `${saved.name} added to the team.`)
      }
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={isEdit ? 'Edit technician' : 'Add technician'}
      onClose={onClose}
      size="md"
      footer={
        <>
          <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="technician-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Add technician'}
          </button>
        </>
      }
    >
      <form id="technician-form" className="row g-3" onSubmit={handleSubmit} noValidate>
        <FormField label="Full name *" error={errors.name} hint="Letters, spaces, hyphens, apostrophes and periods only." counter={form.name.length} max={LIMITS.name} full>
          <input className={`form-control ${errors.name ? 'is-invalid' : ''}`} value={form.name} maxLength={LIMITS.name} onChange={(e) => update('name', e.target.value)} />
        </FormField>
        <FormField label="Email *" error={errors.email} counter={form.email.length} max={LIMITS.email} full>
          <input className={`form-control ${errors.email ? 'is-invalid' : ''}`} type="email" value={form.email} maxLength={LIMITS.email} onChange={(e) => update('email', e.target.value)} />
        </FormField>
        <FormField
          label="Specialization *"
          error={errors.specialization}
          hint="Letters, numbers and . , - ( ) / & ' # only, for example HVAC/AC."
          counter={form.specialization.length}
          max={LIMITS.specialization}
          full
        >
          <input
            className={`form-control ${errors.specialization ? 'is-invalid' : ''}`}
            value={form.specialization}
            maxLength={LIMITS.specialization}
            onChange={(e) => update('specialization', e.target.value)}
            placeholder="For example: Electrical, HVAC/AC, Plumbing"
          />
        </FormField>
        <FormField label="Availability" full>
          <select className="form-select" value={form.availability} onChange={(e) => update('availability', e.target.value)}>
            {AVAILABILITIES.map((availability) => (
              <option key={availability} value={availability}>{availability}</option>
            ))}
          </select>
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
