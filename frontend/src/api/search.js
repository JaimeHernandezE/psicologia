import { apiClient } from './client'

/**
 * Búsqueda estándar: llama al endpoint del recurso con params.
 * resource: 'journal' | 'summaries' | 'tasks'
 */
export function standardSearch(resource, params) {
  const base = {
    journal: '/api/journal/',
    summaries: '/api/summaries/',
    tasks: '/api/tasks/',
  }[resource]
  if (!base) return Promise.reject(new Error('resource inválido'))
  return apiClient.get(base, { params }).then((r) => r.data)
}

/**
 * Consulta IA contextual (solo tratante).
 * query: string, patientId?: number, groupId?: number, contextType: 'patient' | 'group'
 */
export function aiSearch({ query, patientId, groupId, contextType }) {
  const body = { query, context_type: contextType }
  if (contextType === 'patient' && patientId != null) body.patient_id = patientId
  if (contextType === 'group' && groupId != null) body.group_id = groupId
  return apiClient.post('/api/search/ai/', body).then((r) => r.data)
}
