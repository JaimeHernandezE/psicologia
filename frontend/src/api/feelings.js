import { apiClient } from './client'

export const feelingsApi = {
  list: (params) =>
    apiClient.get('/api/feelings/', { params }).then((r) => r.data),
}
