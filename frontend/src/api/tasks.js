import { apiClient } from './client'

export const tasksApi = {
  list: (params) =>
    apiClient.get('/api/tasks/', { params }).then((r) => r.data),

  get: (id) =>
    apiClient.get(`/api/tasks/${id}/`).then((r) => r.data),

  create: (data) =>
    apiClient.post('/api/tasks/', data).then((r) => r.data),

  update: (id, data) =>
    apiClient.patch(`/api/tasks/${id}/`, data).then((r) => r.data),

  delete: (id) =>
    apiClient.delete(`/api/tasks/${id}/`).then((r) => r.data),

  progressList: () =>
    apiClient.get('/api/tasks/progress/').then((r) => r.data),

  progressUpdate: (id, data) =>
    apiClient.patch(`/api/tasks/progress/${id}/`, data).then((r) => r.data),
}
