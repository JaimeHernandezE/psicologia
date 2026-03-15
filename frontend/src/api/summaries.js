import { apiClient } from './client'

export const summariesApi = {
  list: () =>
    apiClient.get('/api/summaries/').then((r) => r.data),

  get: (id) =>
    apiClient.get(`/api/summaries/${id}/`).then((r) => r.data),

  generate: (linkId, journalEntryIds) =>
    apiClient
      .post('/api/summaries/generate/', { link_id: linkId, journal_entry_ids: journalEntryIds })
      .then((r) => r.data),

  update: (id, data) =>
    apiClient.patch(`/api/summaries/${id}/`, data).then((r) => r.data),

  send: (id) =>
    apiClient.post(`/api/summaries/${id}/send/`).then((r) => r.data),
}
