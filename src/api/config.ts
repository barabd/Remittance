/**
 * When `VITE_USE_LIVE_API` is true, pages should call `src/api/live/client.ts`
 * instead of local stores. Wiring is incremental per screen.
 * Full stack (DB ↔ Java ↔ Vite proxy ↔ fetch): docs/STACK_INTEGRATION.md
 */

export function useLiveApi(): boolean {
  return import.meta.env.VITE_USE_LIVE_API === 'true'
}

/** Path prefix, e.g. `/api/v1` — same origin; Vite proxies to backend in dev. */
export function apiBasePath(): string {
  const p = import.meta.env.VITE_API_BASE_PATH
  return typeof p === 'string' && p.length > 0 ? p.replace(/\/$/, '') : '/api/v1'
}

export function apiUrl(path: string): string {
  const base = apiBasePath()
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${base}${suffix}`
}
