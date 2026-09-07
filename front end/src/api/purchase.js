import { createClient } from './client'
import { buildParams } from './utils'

const client = createClient('/api/purchases')

export { buildParams, extractErrorMessage } from './utils'

export const purchasesApi = {
  list: async (params) => (await client.get('', { params: buildParams(params) })).data,
  get: async (id) => (await client.get(`/${id}`)).data,
  create: async (payload) => (await client.post('', payload)).data,
  update: async (id, payload) => (await client.put(`/${id}`, payload)).data,
}
