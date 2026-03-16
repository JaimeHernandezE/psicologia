import { useAuthStore } from '../stores/authStore'

const localeMap = {
  'dd/mm/yyyy': 'es-CL',
  'mm/dd/yyyy': 'en-US',
  'yyyy-mm-dd': 'sv-SE',
}

function parseDate(dateStr) {
  if (!dateStr) return null
  const str = String(dateStr).length === 10 ? dateStr + 'T00:00:00' : dateStr
  const date = new Date(str)
  return isNaN(date.getTime()) ? null : date
}

export function formatDate(dateStr, optionsOrFormat = null) {
  const date = parseDate(dateStr)
  if (!date) return '—'
  const isFormatOverride = typeof optionsOrFormat === 'string'
  const format = isFormatOverride ? optionsOrFormat : (useAuthStore.getState().user?.profile?.date_format || 'dd/mm/yyyy')
  const options = isFormatOverride ? {} : (optionsOrFormat && typeof optionsOrFormat === 'object' ? optionsOrFormat : {})
  const locale = localeMap[format] || 'es-CL'
  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  })
}

export function formatDateLong(dateStr) {
  const date = parseDate(dateStr)
  if (!date) return '—'
  return date.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatDateShort(dateStr) {
  const date = parseDate(dateStr)
  if (!date) return '—'
  return date.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
  })
}

export function formatDateTime(dateStr) {
  const date = parseDate(dateStr)
  if (!date) return '—'
  return date.toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function toInputDate(dateStr) {
  if (!dateStr) return ''
  const date = parseDate(dateStr)
  if (!date) return ''
  return date.toISOString().split('T')[0]
}

export function today() {
  return toInputDate(new Date().toISOString())
}

export function daysAgo(n) {
  const date = new Date()
  date.setDate(date.getDate() - n)
  return toInputDate(date.toISOString())
}
