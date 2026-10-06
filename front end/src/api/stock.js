import { createClient } from './client'

const client = createClient('/api/stock-adjustments')

export const stockAdjustmentsApi = {
  sheet: async (params) => (await client.get('/sheet', { params })).data,
  list: async (params) => (await client.get('', { params })).data,
  get: async (id) => (await client.get(`/${id}`)).data,
  create: async (payload) => (await client.post('', payload)).data,
}
