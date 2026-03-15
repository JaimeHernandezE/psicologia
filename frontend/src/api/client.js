import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err)
    }
    original._retry = true
    const refresh = useAuthStore.getState().refreshToken
    if (!refresh) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
      return Promise.reject(err)
    }
    try {
      const { data } = await axios.post(`${baseURL}/api/token/refresh/`, { refresh })
      useAuthStore.getState().setTokens(data.access, data.refresh)
      original.headers.Authorization = `Bearer ${data.access}`
      return apiClient(original)
    } catch (e) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
      return Promise.reject(e)
    }
  }
)
