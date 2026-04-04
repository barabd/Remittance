const KEY = 'frms.accessToken'

export function getAccessToken(): string | null {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setAccessToken(token: string) {
  sessionStorage.setItem(KEY, token)
}

export function clearAccessToken() {
  sessionStorage.removeItem(KEY)
}
