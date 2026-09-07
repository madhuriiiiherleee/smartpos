import { createClient } from './client'
import { buildParams } from './utils'

const client = createClient('/api/master')

export { buildParams, extractErrorMessage } from './utils'

function makeResource(path) {
  return {
    list: async (params) => (await client.get(`/${path}`, { params: buildParams(params) })).data,
    create: async (payload) => (await client.post(`/${path}`, payload)).data,
    update: async (id, payload) => (await client.put(`/${path}/${id}`, payload)).data,
    setActive: async (id, active) => (await client.patch(`/${path}/${id}/active`, { active })).data,
  }
}

export const categoriesApi = {
  ...makeResource('categories'),
  remove: async (id) => (await client.delete(`/categories/${id}`)).data,
}
export const packingSizesApi = {
  ...makeResource('packing-sizes'),
  remove: async (id) => (await client.delete(`/packing-sizes/${id}`)).data,
}
export const productsApi = {
  ...makeResource('products'),
  createWithDetail: async (payload) => (await client.post('/products/with-detail', payload)).data,
  remove: async (id) => (await client.delete(`/products/${id}`)).data,
}
export const vendorsApi = makeResource('vendors')
export const customersApi = {
  ...makeResource('customers'),
  remove: async (id) => (await client.delete(`/customers/${id}`)).data,
}

export const productDetailsApi = {
  list: async (params) => (await client.get('/product-details', { params: buildParams(params) })).data,
  create: async (payload) => (await client.post('/product-details', payload)).data,
  update: async (id, payload) => (await client.put(`/product-details/${id}`, payload)).data,
}

export const financialYearsApi = {
  list: async () => (await client.get('/financial-years')).data,
  create: async (payload) => (await client.post('/financial-years', payload)).data,
  activate: async (id) => (await client.patch(`/financial-years/${id}/activate`)).data,
}
