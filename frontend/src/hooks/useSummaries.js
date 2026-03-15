import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { summariesApi } from '../api/summaries'

export function useSummariesList() {
  return useQuery({
    queryKey: ['summaries'],
    queryFn: summariesApi.list,
  })
}

export function useSummary(id, options = {}) {
  return useQuery({
    queryKey: ['summaries', id],
    queryFn: () => summariesApi.get(id),
    enabled: !!id && (options.enabled !== false),
  })
}

export function useSummaryGenerate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ linkId, journalEntryIds }) =>
      summariesApi.generate(linkId, journalEntryIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['summaries'] }),
  })
}

export function useSummaryUpdate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => summariesApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['summaries'] })
      queryClient.invalidateQueries({ queryKey: ['summaries', id] })
    },
  })
}

export function useSummarySend() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: summariesApi.send,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['summaries'] }),
  })
}
