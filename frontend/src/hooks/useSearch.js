import { useQuery, useMutation } from '@tanstack/react-query'
import { standardSearch, aiSearch } from '../api/search'

/**
 * Búsqueda estándar con filtros. Params: { resource, search?, date_from?, date_to?, visibility?, patient_id?, scope?, status?, ordering? }
 */
export function useStandardSearch(params, options = {}) {
  const { resource, ...rest } = params || {}
  return useQuery({
    queryKey: ['search', params],
    queryFn: () => standardSearch(resource, rest),
    enabled: !!resource && (options.enabled !== false),
  })
}

/**
 * Mutación para consulta IA. Retorna { answer, sources }.
 */
export function useAiSearch() {
  return useMutation({
    mutationFn: ({ query, patientId, groupId, contextType }) =>
      aiSearch({ query, patientId, groupId, contextType }),
  })
}
