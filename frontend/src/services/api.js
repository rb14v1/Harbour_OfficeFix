import axios from 'axios'

export const CATEGORIES = ['Electrical', 'HVAC/AC', 'Plumbing', 'Internet/Network', 'Furniture', 'Other']
export const PRIORITIES = ['Low', 'Medium', 'High']
export const STATUSES = ['Open', 'In Progress', 'Resolved']
export const AVAILABILITIES = ['Available', 'Unavailable']

const DEFAULT_API_BASE_URL = 'http://localhost:8001'
const API_PREFIX = '/api/v1'

// Remove every trailing slash so the base URL never produces "//" when joined with an endpoint.
// An empty VITE_API_BASE_URL means same origin (used behind the nginx proxy in Docker).
const RAW_API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const API_BASE_URL = (RAW_API_BASE_URL === undefined ? DEFAULT_API_BASE_URL : RAW_API_BASE_URL).replace(/\/+$/, '')

// Request timeout in milliseconds, read from VITE_API_TIMEOUT_MS (Vite only exposes VITE_-prefixed variables).
const DEFAULT_API_TIMEOUT_MS = 15000
function readApiTimeoutMs() {
  const raw = import.meta.env.VITE_API_TIMEOUT_MS
  if (raw === undefined || String(raw).trim() === '') return DEFAULT_API_TIMEOUT_MS
  const value = Number(raw)
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`VITE_API_TIMEOUT_MS must be a positive whole number of milliseconds (got "${raw}").`)
  }
  return value
}
const API_TIMEOUT_MS = readApiTimeoutMs()

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: { Accept: 'application/json' },
})

// Every endpoint is written with exactly one leading slash, and joined to the prefix in one place.
function route(endpoint) {
  return `${API_PREFIX}/${endpoint.replace(/^\/+/, '')}`
}

const FIELD_LABELS = {
  employee_name: 'Employee name',
  employee_email: 'Employee email',
  title: 'Issue title',
  description: 'Description',
  category: 'Category',
  category_other: 'Other category',
  location: 'Location',
  priority: 'Priority',
  status: 'Status',
  technician_id: 'Technician',
  resolution_notes: 'Resolution notes',
  name: 'Name',
  email: 'Email',
  specialization: 'Specialization',
  availability: 'Availability',
}

// Turns one DRF field message into a sentence that names the field.
function describeFieldMessage(field, message) {
  const label = FIELD_LABELS[field] || field
  if (message.startsWith('Please ')) return message
  if (message === 'This field is required.' || message === 'This field may not be blank.' || message === 'This field may not be null.') {
    return `${label} is required.`
  }
  const tooLong = message.match(/no more than (\d+) characters/)
  if (tooLong) return `${label} must be ${tooLong[1]} characters or fewer.`
  if (message.includes('valid email')) return `${label} must be a valid email address.`
  if (/^[a-z]/.test(message)) return `${label} ${message}`
  return `${label}: ${message}`
}

// DRF returns either {detail: "..."} (business rules, not found, conflicts) or {field: ["message", ...]} (validation).
function describeErrorBody(data) {
  if (typeof data?.detail === 'string') return data.detail
  if (data && typeof data === 'object') {
    const parts = []
    for (const [field, messages] of Object.entries(data)) {
      const list = Array.isArray(messages) ? messages : [messages]
      for (const message of list) {
        parts.push(describeFieldMessage(field === 'non_field_errors' ? '' : field, String(message)))
      }
    }
    if (parts.length) return parts.join(' ')
  }
  return null
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function toApiError(error) {
  if (error.response) {
    const { status, data } = error.response
    const message = describeErrorBody(data)
    return new ApiError(message || `The server returned an unexpected error (HTTP ${status}).`, status)
  }
  if (error.request) {
    return new ApiError(
      `Cannot reach the OfficeFix server at ${API_BASE_URL}. Check that the backend is running.`,
      0
    )
  }
  return new ApiError(error.message || 'An unexpected error occurred.', 0)
}

async function request(config) {
  try {
    const response = await http.request(config)
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

function withoutEmpty(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  )
}

// Dashboard

export function getDashboardStats() {
  return request({ method: 'GET', url: route('/dashboard/stats') })
}

// Maintenance requests

export function listRequests(filters = {}) {
  return request({ method: 'GET', url: route('/requests'), params: withoutEmpty(filters) })
}

export function getRequest(requestId) {
  return request({ method: 'GET', url: route(`/requests/${requestId}`) })
}

export function createRequest(payload) {
  return request({ method: 'POST', url: route('/requests'), data: payload })
}

export function updateRequest(requestId, changes) {
  return request({ method: 'PATCH', url: route(`/requests/${requestId}`), data: changes })
}

export function deleteRequest(requestId) {
  return request({ method: 'DELETE', url: route(`/requests/${requestId}`) })
}

// Technicians

export function listTechnicians() {
  return request({ method: 'GET', url: route('/technicians') })
}

export function createTechnician(payload) {
  return request({ method: 'POST', url: route('/technicians'), data: payload })
}

export function updateTechnician(technicianId, changes) {
  return request({ method: 'PATCH', url: route(`/technicians/${technicianId}`), data: changes })
}
