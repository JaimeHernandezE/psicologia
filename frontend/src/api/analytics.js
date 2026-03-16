import { apiClient } from './client'

/**
 * @param {number} patientId
 * @param {{ date_from?: string, date_to?: string, granularity?: 'day'|'week'|'month' }} params
 */
export function getPatientAnalytics(patientId, params) {
  return apiClient
    .get(`/api/analytics/patient/${patientId}/`, { params })
    .then((r) => r.data)
}

/**
 * @param {{ date_from?: string, date_to?: string }} params
 */
export function getComparisonData(params) {
  return apiClient
    .get('/api/analytics/comparison/', { params })
    .then((r) => r.data)
}
