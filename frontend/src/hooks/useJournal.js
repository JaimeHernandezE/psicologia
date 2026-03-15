import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { journalApi } from '../api/journal'

export function useJournalList(params = {}) {
  return useQuery({
    queryKey: ['journal', params],
    queryFn: () => journalApi.list(params),
  })
}

export function useJournalEntry(id, options = {}) {
  return useQuery({
    queryKey: ['journal', id],
    queryFn: () => journalApi.get(id),
    enabled: !!id && (options.enabled !== false),
  })
}

export function useJournalCreate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: journalApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['journal'] }),
  })
}

export function useJournalUpdate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => journalApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['journal'] })
      queryClient.invalidateQueries({ queryKey: ['journal', id] })
    },
  })
}

export function useJournalDelete() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: journalApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['journal'] }),
  })
}
