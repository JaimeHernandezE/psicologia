import { apiClient } from './client'

export const groupsApi = {
  list: () =>
    apiClient.get('/api/groups/').then((r) => r.data),

  create: (name) =>
    apiClient.post('/api/groups/', { name }).then((r) => r.data),

  get: (id) =>
    apiClient.get(`/api/groups/${id}/`).then((r) => r.data),

  update: (id, data) =>
    apiClient.patch(`/api/groups/${id}/`, data).then((r) => r.data),

  delete: (id) =>
    apiClient.delete(`/api/groups/${id}/`).then((r) => r.data),

  addMember: (groupId, patientId) =>
    apiClient.post(`/api/groups/${groupId}/add_member/`, { patient_id: patientId }).then((r) => r.data),

  removeMember: (groupId, membershipId) =>
    apiClient.post(`/api/groups/${groupId}/remove_member/`, { membership_id: membershipId }).then((r) => r.data),

  getSummaries: (groupId) =>
    apiClient.get(`/api/groups/${groupId}/summaries/`).then((r) => r.data),

  generateGroupSummary: (groupId, summaryIds) =>
    apiClient.post(`/api/groups/${groupId}/generate_group_summary/`, { summary_ids: summaryIds }).then((r) => r.data),

  updateGroupSummary: (groupId, summaryPk, data) =>
    apiClient.patch(`/api/groups/${groupId}/group_summaries/${summaryPk}/`, data).then((r) => r.data),

  patientGroups: () =>
    apiClient.get('/api/groups/patient/').then((r) => r.data),
}
