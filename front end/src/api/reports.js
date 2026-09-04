import { createClient } from './client'

const client = createClient('/api/reports')

export const reportsApi = {
  salesB2B: async (year, month) => (await client.get('/sales-b2b', { params: { year, month } })).data,
  salesB2C: async (year, month) => (await client.get('/sales-b2c', { params: { year, month } })).data,
  purchaseGst: async (year, month) => (await client.get('/purchase-gst', { params: { year, month } })).data,
  stock: async (params) => (await client.get('/stock', { params })).data,
  exportUrl: (reportKey, year, month) =>
    `/api/reports/${reportKey}/export?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`,
  stockExportUrl: (params = {}) => {
    const query = new URLSearchParams()
    if (params.category_id) query.set('category_id', params.category_id)
    if (params.product_id) query.set('product_id', params.product_id)
    const qs = query.toString()
    return `/api/reports/stock/export${qs ? `?${qs}` : ''}`
  },
}
