import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { groupsApi } from '../api/groups'

export function useGroupsList() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: groupsApi.list,
  })
}

export function useGroup(id, options = {}) {
  return useQuery({
    queryKey: ['groups', id],
    queryFn: () => groupsApi.get(id),
    enabled: !!id && (options.enabled !== false),
  })
}

export function useCreateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name) => groupsApi.create(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  })
}

export function useUpdateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => groupsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['groups', id] })
    },
  })
}

export function useDeleteGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: groupsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  })
}

export function useAddGroupMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, patientId }) => groupsApi.addMember(groupId, patientId),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['groups', groupId] })
    },
  })
}

export function useRemoveGroupMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, membershipId }) => groupsApi.removeMember(groupId, membershipId),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['groups', groupId] })
    },
  })
}

export function useGroupSummaries(groupId, options = {}) {
  return useQuery({
    queryKey: ['groups', groupId, 'summaries'],
    queryFn: () => groupsApi.getSummaries(groupId),
    enabled: !!groupId && (options.enabled !== false),
  })
}

export function useGenerateGroupSummary() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, summaryIds }) => groupsApi.generateGroupSummary(groupId, summaryIds),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId] })
    },
  })
}

export function useUpdateGroupSummary() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, summaryPk, ...data }) =>
      groupsApi.updateGroupSummary(groupId, summaryPk, data),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId] })
    },
  })
}

export function usePatientGroups() {
  return useQuery({
    queryKey: ['groups', 'patient'],
    queryFn: groupsApi.patientGroups,
  })
}
