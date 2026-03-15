import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      login: (tokens, user) =>
        set({
          accessToken: tokens.access,
          refreshToken: tokens.refresh,
          user: tokens.user ?? user,
        }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
        }),

      updateUser: (user) => set({ user }),

      setTokens: (access, refresh) =>
        set((state) => ({
          accessToken: access ?? state.accessToken,
          refreshToken: refresh ?? state.refreshToken,
        })),
    }),
    { name: 'psicologia-auth', partialize: (s) => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken }) }
  )
)
