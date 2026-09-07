import axios from 'axios'
import { withBase } from '../lib/url'

const LOGIN_PATH = withBase('login')

export function createClient(baseURL) {
  const fullBaseURL = withBase(baseURL)
  const client = axios.create({ baseURL: fullBaseURL, withCredentials: true })
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.response?.status === 401 && window.location.pathname !== LOGIN_PATH) {
        window.location.assign(LOGIN_PATH)
      }
      return Promise.reject(error)
    },
  )
  return client
}
