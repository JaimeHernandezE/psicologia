import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { linksApi } from '../api/links'

export function useLinksList(params) {
  return useQuery({
    queryKey: ['links', params],
    queryFn: () => linksApi.list(params),
  })
}

export function usePendingInvitations() {
  return useQuery({
    queryKey: ['links', { status: 'pending' }],
    queryFn: linksApi.getPendingInvitations,
  })
}

export function useLink(id, options = {}) {
  return useQuery({
    queryKey: ['links', id],
    queryFn: () => linksApi.get(id),
    enabled: !!id && (options.enabled !== false),
  })
}

export function useLinkInvite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (email) => linksApi.create(email),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['links'] }),
  })
}

export function useLinkActivate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: linksApi.activate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['links'] }),
  })
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: linksApi.acceptInvitation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['links'] }),
  })
}

export function useGroupsList() {
  return useQuery({
    queryKey: ['links', 'groups'],
    queryFn: linksApi.groupsList,
  })
}
