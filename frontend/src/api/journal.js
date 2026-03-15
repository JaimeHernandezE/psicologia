import { apiClient } from './client'

export const journalApi = {
  list: (params) =>
    apiClient.get('/api/journal/', { params }).then((r) => r.data),

  get: (id) =>
    apiClient.get(`/api/journal/${id}/`).then((r) => r.data),

  create: (data) =>
    apiClient.post('/api/journal/', data).then((r) => r.data),

  update: (id, data) =>
    apiClient.patch(`/api/journal/${id}/`, data).then((r) => r.data),

  delete: (id) =>
    apiClient.delete(`/api/journal/${id}/`).then((r) => r.data),
}
