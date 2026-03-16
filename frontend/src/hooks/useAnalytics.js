import { useQuery } from '@tanstack/react-query'
import { getPatientAnalytics, getComparisonData } from '../api/analytics'

/**
 * @param {number} patientId
 * @param {{ date_from?: string, date_to?: string, granularity?: 'day'|'week'|'month' }} params
 * @param {{ enabled?: boolean }} options
 */
export function usePatientAnalytics(patientId, params, options = {}) {
  return useQuery({
    queryKey: ['analytics', 'patient', patientId, params],
    queryFn: () => getPatientAnalytics(patientId, params),
    enabled: !!patientId && (options.enabled !== false),
  })
}

/**
 * @param {{ date_from?: string, date_to?: string }} params
 * @param {{ enabled?: boolean }} options
 */
export function useComparison(params, options = {}) {
  return useQuery({
    queryKey: ['analytics', 'comparison', params],
    queryFn: () => getComparisonData(params),
    enabled: options.enabled !== false,
  })
}
