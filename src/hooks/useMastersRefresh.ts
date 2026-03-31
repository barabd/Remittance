import { useCallback, useEffect, useState } from 'react'
import { useLiveApi } from '../api/config'
import { MASTERS_CHANGED_EVENT, syncMastersFromLive } from '../state/mastersStore'

type Scope = 'beneficiaries' | 'agents' | 'coverFunds' | 'all'

/**
 * Loads master rows from local cache, and when `VITE_USE_LIVE_API=true` replaces cache from HTTP on mount via `syncMastersFromLive`.
 */
export function useMastersRefresh<T>(scope: Scope, loader: () => T) {
  const live = useLiveApi()
  const [data, setData] = useState<T>(() => loader())
  const [lastError, setLastError] = useState<string | null>(null)

  const refreshLocal = useCallback(() => {
    setData(loader())
  }, [loader])

  useEffect(() => {
    let cancelled = false
    async function pullFromApi() {
      if (!live) {
        refreshLocal()
        return
      }
      setLastError(null)
      try {
        await syncMastersFromLive(scope)
        if (!cancelled) refreshLocal()
      } catch (e) {
        if (!cancelled) {
          setLastError(e instanceof Error ? e.message : 'Live API sync failed')
          refreshLocal()
        }
      }
    }
    void pullFromApi()
    return () => {
      cancelled = true
    }
  }, [live, scope, refreshLocal])

  useEffect(() => {
    const on = (ev: Event) => {
      const d = (ev as CustomEvent<{ scope?: Scope }>).detail?.scope
      if (!d || d === 'all' || d === scope) refreshLocal()
    }
    window.addEventListener(MASTERS_CHANGED_EVENT, on as EventListener)
    return () => window.removeEventListener(MASTERS_CHANGED_EVENT, on as EventListener)
  }, [scope, refreshLocal])

  return [data, refreshLocal, { live, lastError }] as const
}
