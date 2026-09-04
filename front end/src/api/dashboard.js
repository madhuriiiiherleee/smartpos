import { createClient } from './client'

const client = createClient('/api')

export async function fetchSummary() {
  const { data } = await client.get('/dashboard/summary')
  return data
}

export async function fetchPurchaseSalesReport(year) {
  const { data } = await client.get('/dashboard/purchase-sales-report', {
    params: year ? { year } : {},
  })
  return data
}

export async function fetchLowStock() {
  const { data } = await client.get('/dashboard/low-stock')
  return data
}
