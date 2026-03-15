import { apiClient } from './client'

export const notificationsApi = {
  alertsList: () =>
    apiClient.get('/api/notifications/alerts/').then((r) => r.data),

  alertCreate: (data) =>
    apiClient.post('/api/notifications/alerts/', data).then((r) => r.data),

  alertUpdate: (id, data) =>
    apiClient.patch(`/api/notifications/alerts/${id}/`, data).then((r) => r.data),

  preferencesGet: () =>
    apiClient.get('/api/notifications/preferences/').then((r) => r.data),

  preferencesUpdate: (data) =>
    apiClient.patch('/api/notifications/preferences/', data).then((r) => r.data),
}
