import axios from 'axios'

const LOGIN_PATH = `${import.meta.env.BASE_URL}login`.replace(/\/+/g, '/')

export function createClient(baseURL) {
  const fullBaseURL = `${import.meta.env.BASE_URL}${baseURL}`.replace(/\/+/g, '/')
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
