import { apiClient } from './client'

export const authApi = {
  login: (email, password) =>
    apiClient.post('/api/users/login/', { email, password }).then((r) => r.data),

  register: (data) =>
    apiClient.post('/api/users/register/', data).then((r) => r.data),

  me: () =>
    apiClient.get('/api/users/me/').then((r) => r.data),

  updateMe: (data) =>
    apiClient.patch('/api/users/me/', data).then((r) => r.data),

  googleLogin: (token, clientId) =>
    apiClient.post('/api/users/google/', { token, client_id: clientId }).then((r) => r.data),
}
