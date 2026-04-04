import { getAccessToken } from '../auth/tokenStore'
import { apiUrl } from './config'
import type { ApiErrorBody } from './types'

export class ApiHttpError extends Error {
  status: number
  body: ApiErrorBody | null

  constructor(status: number, message: string, body: ApiErrorBody | null) {
    super(message)
    this.name = 'ApiHttpError'
    this.status = status
    this.body = body
  }
}

type Json = Record<string, unknown>

/** `omit` default for Bearer JWT; use `include` if API relies on HttpOnly cookies (then add CSRF strategy server-side). */
function fetchCredentials(): RequestCredentials {
  const m = import.meta.env.VITE_API_FETCH_CREDENTIALS
  if (m === 'include' || m === 'omit' || m === 'same-origin') return m
  return 'omit'
}

function authHeaders(): HeadersInit {
  const envToken = import.meta.env.VITE_API_BEARER_TOKEN
  if (typeof envToken === 'string' && envToken.length > 0) {
    return { Authorization: `Bearer ${envToken}` }
  }
  const sessionToken = getAccessToken()
  if (sessionToken) {
    return { Authorization: `Bearer ${sessionToken}` }
  }
  return {}
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit & { parseJson?: boolean } = {},
): Promise<T> {
  const { parseJson = true, headers, credentials: credentialsInit, ...rest } = init
  const res = await fetch(apiUrl(path), {
    ...rest,
    credentials: credentialsInit ?? fetchCredentials(),
    headers: {
      Accept: 'application/json',
      ...authHeaders(),
      ...headers,
    },
  })

  if (!res.ok) {
    let body: ApiErrorBody | null = null
    let rawText = ''
    try {
      rawText = (await res.text()).trim()
      if (rawText) {
        body = JSON.parse(rawText) as ApiErrorBody
      }
    } catch {
      /* ignore */
    }
    const fromBody =
      (typeof body?.message === 'string' && body.message.length > 0 ? body.message : undefined) ??
      (typeof body?.detail === 'string' && body.detail.length > 0 ? body.detail : undefined)
    const fromText = rawText.length > 0 ? rawText : undefined
    const msg = fromBody || fromText || res.statusText || 'Request failed'
    throw new ApiHttpError(res.status, msg, body)
  }

  if (!parseJson || res.status === 204) {
    return undefined as T
  }

  return (await res.json()) as T
}

export async function apiGet<T>(path: string) {
  return apiRequest<T>(path, { method: 'GET' })
}

export async function apiPost<T>(path: string, body?: Json) {
  return apiRequest<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

export async function apiPatch<T>(path: string, body: Json) {
  return apiRequest<T>(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function apiDelete(path: string) {
  return apiRequest<void>(path, { method: 'DELETE', parseJson: false })
}
