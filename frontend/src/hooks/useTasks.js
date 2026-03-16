import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi } from '../api/tasks'

export function useTasksList(params) {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: () => tasksApi.list(params),
  })
}

export function useTask(id, options = {}) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: () => tasksApi.get(id),
    enabled: !!id && (options.enabled !== false),
  })
}

export function useTaskCreate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useTaskUpdate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => tasksApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useTaskDelete() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useTaskProgressList() {
  return useQuery({
    queryKey: ['tasks', 'progress'],
    queryFn: tasksApi.progressList,
  })
}

export function useTaskProgressUpdate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => tasksApi.progressUpdate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', 'progress'] })
    },
  })
}
