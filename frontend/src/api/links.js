import { apiClient } from './client'

export const linksApi = {
  list: () =>
    apiClient.get('/api/links/').then((r) => r.data),

  get: (id) =>
    apiClient.get(`/api/links/${id}/`).then((r) => r.data),

  create: (email) =>
    apiClient.post('/api/links/', { email }).then((r) => r.data),

  update: (id, data) =>
    apiClient.patch(`/api/links/${id}/`, data).then((r) => r.data),

  activate: (id) =>
    apiClient.post(`/api/links/${id}/activate/`).then((r) => r.data),

  groupsList: () =>
    apiClient.get('/api/links/groups/').then((r) => r.data),

  groupCreate: (data) =>
    apiClient.post('/api/links/groups/', data).then((r) => r.data),
}
