import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { authApi } from '../api/auth'

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
    enabled: !!useAuthStore.getState().accessToken,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  const loginStore = useAuthStore((s) => s.login)

  return useMutation({
    mutationFn: ({ email, password }) => authApi.login(email, password),
    onSuccess: (data) => {
      loginStore(data, data.user)
      queryClient.setQueryData(['me'], data.user)
    },
  })
}

export function useRegister() {
  const loginStore = useAuthStore((s) => s.login)

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      loginStore(data, data.user)
    },
  })
}

export function useLogout() {
  const logoutStore = useAuthStore((s) => s.logout)
  const queryClient = useQueryClient()

  return () => {
    logoutStore()
    queryClient.clear()
  }
}

export function useUpdateMe() {
  const queryClient = useQueryClient()
  const updateUser = useAuthStore((s) => s.updateUser)

  return useMutation({
    mutationFn: authApi.updateMe,
    onSuccess: (data) => {
      updateUser(data)
      queryClient.setQueryData(['me'], data)
    },
  })
}
