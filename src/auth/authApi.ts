import { apiUrl } from '../api/config'
import type { AuthUserProfile, LoginResponse } from './types'
import { clearAccessToken, getAccessToken, setAccessToken } from './tokenStore'

export async function loginWithPassword(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(apiUrl('/auth/login'), {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    credentials: 'omit',
  })
  const text = await res.text()
  if (!res.ok) {
    let msg = res.statusText
    try {
      const j = JSON.parse(text) as { message?: string }
      if (typeof j.message === 'string') msg = j.message
    } catch {
      if (text) msg = text
    }
    throw new Error(msg)
  }
  const data = JSON.parse(text) as LoginResponse
  setAccessToken(data.accessToken)
  return data
}

export async function fetchCurrentUser(): Promise<AuthUserProfile> {
  const token = getAccessToken()
  if (!token) {
    throw new Error('Not authenticated')
  }
  const res = await fetch(apiUrl('/auth/me'), {
    method: 'GET',
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    credentials: 'omit',
  })
  const text = await res.text()
  if (!res.ok) {
    if (res.status === 401) clearAccessToken()
    throw new Error(text || res.statusText)
  }
  return JSON.parse(text) as AuthUserProfile
}

export function logoutSession() {
  clearAccessToken()
}
