import { createClient } from './client'

const salesClient = createClient('/api/sales')
const ordersClient = createClient('/api/sales-orders')
const returnsClient = createClient('/api/sales-returns')

function buildParams(params = {}) {
  const cleaned = {}
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) cleaned[key] = value
  })
  return cleaned
}

export const salesApi = {
  nextInvoiceNumber: async (saleDate) =>
    (await salesClient.get('/next-invoice-number', { params: buildParams({ sale_date: saleDate }) })).data,
  list: async (params) => (await salesClient.get('', { params: buildParams(params) })).data,
  get: async (id) => (await salesClient.get(`/${id}`)).data,
  create: async (payload) => (await salesClient.post('', payload)).data,
  update: async (id, payload) => (await salesClient.put(`/${id}`, payload)).data,
  routes: async () => (await salesClient.get('/routes')).data,
  availableQuantity: async (productDetailId) =>
    (await salesClient.get('/available-quantity', { params: { product_detail_id: productDetailId } })).data,
  delivery: async (params) => (await salesClient.get('/delivery', { params: buildParams(params) })).data,
  markDelivered: async (saleIds) => (await salesClient.post('/delivery/mark-delivered', { sale_ids: saleIds })).data,
  remove: async (id) => (await salesClient.delete(`/${id}`)).data,
  sendMail: async (id) => (await salesClient.post(`/${id}/send-mail`)).data,
}

export const salesOrdersApi = {
  nextOrderNumber: async (orderDate) =>
    (await ordersClient.get('/next-order-number', { params: buildParams({ order_date: orderDate }) })).data,
  list: async (params) => (await ordersClient.get('', { params: buildParams(params) })).data,
  get: async (id) => (await ordersClient.get(`/${id}`)).data,
  create: async (payload) => (await ordersClient.post('', payload)).data,
  update: async (id, payload) => (await ordersClient.put(`/${id}`, payload)).data,
}

export const salesReturnsApi = {
  returnableItems: async (saleId) =>
    (await returnsClient.get('/returnable-items', { params: { sale_id: saleId } })).data,
  create: async (payload) => (await returnsClient.post('', payload)).data,
  list: async (params) => (await returnsClient.get('', { params: buildParams(params) })).data,
  get: async (id) => (await returnsClient.get(`/${id}`)).data,
}

export function extractErrorMessage(error) {
  return error?.response?.data?.detail || 'Something went wrong. Please try again.'
}
