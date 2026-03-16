import { apiClient } from './client'

export const linksApi = {
  list: (params) =>
    apiClient.get('/api/links/', { params }).then((r) => r.data),

  get: (id) =>
    apiClient.get(`/api/links/${id}/`).then((r) => r.data),

  create: (email) =>
    apiClient.post('/api/links/', { email }).then((r) => r.data),

  update: (id, data) =>
    apiClient.patch(`/api/links/${id}/`, data).then((r) => r.data),

  activate: (id) =>
    apiClient.post(`/api/links/${id}/activate/`).then((r) => r.data),

  getPendingInvitations: () =>
    apiClient.get('/api/links/', { params: { status: 'pending' } }).then((r) => r.data),

  acceptInvitation: (linkId) =>
    apiClient.post(`/api/links/${linkId}/activate/`).then((r) => r.data),
}
