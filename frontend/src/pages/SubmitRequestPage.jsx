import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES, PRIORITIES, createRequest } from '../services/api.js'
import { LIMITS, checkEmail, checkName, checkText } from '../services/validation.js'
import FormField from '../components/FormField.jsx'

const EMPTY_FORM = {
  employee_name: '',
  employee_email: '',
  title: '',
  description: '',
  category: '',
  category_other: '',
  location: '',
  priority: 'Medium',
}

function validate(form) {
  const errors = {
    employee_name: checkName(form.employee_name, 'Your name') || undefined,
    employee_email: checkEmail(form.employee_email) || undefined,
    title: checkText(form.title, 'Issue title', LIMITS.title) || undefined,
    location: checkText(form.location, 'Office location or floor', LIMITS.location) || undefined,
  }
  if (!form.description.trim()) errors.description = 'Describe the issue so the technician can act on it.'
  else if (form.description.trim().length > LIMITS.description) errors.description = `Description must be ${LIMITS.description} characters or fewer.`
  if (!form.category) errors.category = 'Select a category.'
  else if (form.category === 'Other') errors.category_other = checkText(form.category_other, 'Other category', LIMITS.categoryOther) || undefined
  if (!PRIORITIES.includes(form.priority)) errors.priority = 'Select a priority.'
  return errors
}

export default function SubmitRequestPage({ onNotify }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [created, setCreated] = useState(null)

  function update(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === 'category' && value !== 'Other' ? { category_other: '' } : {}),
    }))
    setErrors((current) => ({ ...current, [key]: undefined }))
    setSubmitError(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validate(form)
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      const saved = await createRequest({
        employee_name: form.employee_name.trim(),
        employee_email: form.employee_email.trim(),
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        category_other: form.category === 'Other' ? form.category_other.trim() : null,
        location: form.location.trim(),
        priority: form.priority,
      })
      setCreated(saved)
      setForm(EMPTY_FORM)
      onNotify(`Request #${saved.id} submitted.`)
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="d-flex flex-column gap-3" style={{ maxWidth: 900 }}>
      {created && (
        <div className="alert alert-success d-flex justify-content-between align-items-center gap-3 mb-0" role="status">
          <span>
            Request #{created.id} has been submitted and is now <strong>{created.status}</strong>.
          </span>
          <button type="button" className="btn btn-outline-success btn-sm" onClick={() => navigate('/requests')}>
            View requests
          </button>
        </div>
      )}

      <section className="card shadow-sm border-0">
        <div className="card-header bg-white">
          <h2 className="h6 mb-0">New maintenance request</h2>
          <p className="small text-secondary mb-0">Fields marked * are required.</p>
        </div>
        <div className="card-body">
          <form className="row g-3" onSubmit={handleSubmit} noValidate>
            <FormField label="Your name *" error={errors.employee_name} hint="Letters, spaces, hyphens, apostrophes and periods only." counter={form.employee_name.length} max={LIMITS.name}>
              <input className={`form-control ${errors.employee_name ? 'is-invalid' : ''}`} value={form.employee_name} maxLength={LIMITS.name} autoComplete="name" onChange={(e) => update('employee_name', e.target.value)} />
            </FormField>

            <FormField label="Your email *" error={errors.employee_email} counter={form.employee_email.length} max={LIMITS.email}>
              <input className={`form-control ${errors.employee_email ? 'is-invalid' : ''}`} type="email" value={form.employee_email} maxLength={LIMITS.email} autoComplete="email" onChange={(e) => update('employee_email', e.target.value)} />
            </FormField>

            <FormField label="Issue title *" error={errors.title} full hint="Letters, numbers and . , - ( ) / & ' # only." counter={form.title.length} max={LIMITS.title}>
              <input className={`form-control ${errors.title ? 'is-invalid' : ''}`} value={form.title} maxLength={LIMITS.title} placeholder="For example: Air conditioning unit making a loud noise" onChange={(e) => update('title', e.target.value)} />
            </FormField>

            <FormField label="Category *" error={errors.category}>
              <select className={`form-select ${errors.category ? 'is-invalid' : ''}`} value={form.category} onChange={(e) => update('category', e.target.value)}>
                <option value="">Select a category</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Priority *" error={errors.priority}>
              <select className="form-select" value={form.priority} onChange={(e) => update('priority', e.target.value)}>
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </FormField>

            {form.category === 'Other' && (
              <FormField label="Specify the category *" error={errors.category_other} full hint="Describe the type of issue, for example: Window blinds." counter={form.category_other.length} max={LIMITS.categoryOther}>
                <input className={`form-control ${errors.category_other ? 'is-invalid' : ''}`} value={form.category_other} maxLength={LIMITS.categoryOther} onChange={(e) => update('category_other', e.target.value)} />
              </FormField>
            )}

            <FormField label="Office location or floor *" error={errors.location} full hint="Letters, numbers and . , - ( ) / & ' # only." counter={form.location.length} max={LIMITS.location}>
              <input className={`form-control ${errors.location ? 'is-invalid' : ''}`} value={form.location} maxLength={LIMITS.location} placeholder="For example: Floor 3, Meeting Room B" onChange={(e) => update('location', e.target.value)} />
            </FormField>

            <FormField label="Description *" error={errors.description} full counter={form.description.length} max={LIMITS.description}>
              <textarea className={`form-control ${errors.description ? 'is-invalid' : ''}`} rows={5} value={form.description} maxLength={LIMITS.description} placeholder="What is happening, where, and since when?" onChange={(e) => update('description', e.target.value)} />
            </FormField>

            {submitError && (
              <div className="col-12">
                <div className="alert alert-danger mb-0" role="alert">{submitError}</div>
              </div>
            )}

            <div className="col-12 d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-outline-secondary" disabled={submitting} onClick={() => { setForm(EMPTY_FORM); setErrors({}); setSubmitError(null) }}>
                Clear form
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit request'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}
