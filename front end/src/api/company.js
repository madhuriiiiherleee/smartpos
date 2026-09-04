import { createClient } from './client'

const client = createClient('/api/company-profile')

export const companyProfileApi = {
  get: async () => (await client.get('')).data,
  update: async (payload) => (await client.put('', payload)).data,
  uploadLogo: async (file) => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await client.post('/logo', form)
    return data
  },
  removeLogo: async () => (await client.delete('/logo')).data,
}

export function extractErrorMessage(error) {
  return error?.response?.data?.detail || 'Something went wrong. Please try again.'
}
