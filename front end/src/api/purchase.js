import { createClient } from './client'

const client = createClient('/api/purchases')

function buildParams(params = {}) {
  const cleaned = {}
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) cleaned[key] = value
  })
  return cleaned
}

export const purchasesApi = {
  list: async (params) => (await client.get('', { params: buildParams(params) })).data,
  get: async (id) => (await client.get(`/${id}`)).data,
  create: async (payload) => (await client.post('', payload)).data,
  update: async (id, payload) => (await client.put(`/${id}`, payload)).data,
}

export function extractErrorMessage(error) {
  return error?.response?.data?.detail || 'Something went wrong. Please try again.'
}
