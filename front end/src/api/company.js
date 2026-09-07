import { createClient } from './client'
import { extractErrorMessage } from './utils'

const client = createClient('/api/company-profile')

export { extractErrorMessage }

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
