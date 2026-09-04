import { createClient } from './client'

const client = createClient('/api/auth')

export async function login(username, password) {
  const { data } = await client.post('/login', { username, password })
  return data
}

export async function logout() {
  await client.post('/logout')
}

export async function fetchCurrentUser() {
  const { data } = await client.get('/me')
  return data
}

export async function changePassword(currentPassword, newPassword) {
  const { data } = await client.post('/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  })
  return data
}

export async function fetchUsers() {
  const { data } = await client.get('/users')
  return data
}

export async function createUser(username, password) {
  const { data } = await client.post('/users', { username, password })
  return data
}
