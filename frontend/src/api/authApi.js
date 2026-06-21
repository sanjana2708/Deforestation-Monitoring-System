import { apiJson } from './client'

export function postRegister(email, password) {
  return apiJson('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function postLogin(email, password) {
  return apiJson('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function postLogout() {
  return apiJson('/auth/logout', {
    method: 'POST',
  })
}
