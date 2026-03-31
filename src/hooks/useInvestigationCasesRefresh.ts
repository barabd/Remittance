import { useCallback, useEffect, useState } from 'react'
import { useLiveApi } from '../api/config'
import { CASES_EVENT, loadCases, syncInvestigationCasesFromLive } from '../integrations/investigationCases/caseRepository'

/**
 * Loads cases from local cache; when `VITE_USE_LIVE_API=true`, replaces cache from GET `/investigation-cases` on mount.
 */
export function useInvestigationCasesRefresh(loader: () => ReturnType<typeof loadCases>) {
  const live = useLiveApi()
  const [data, setData] = useState(() => loader())
  const [lastError, setLastError] = useState<string | null>(null)

  const refreshLocal = useCallback(() => {
    setData(loader())
  }, [loader])

  useEffect(() => {
    let cancelled = false
    async function pull() {
      if (!live) {
        refreshLocal()
        return
      }
      setLastError(null)
      try {
        await syncInvestigationCasesFromLive()
        if (!cancelled) refreshLocal()
      } catch (e) {
        if (!cancelled) {
          setLastError(e instanceof Error ? e.message : 'Live API sync failed')
          refreshLocal()
        }
      }
    }
    void pull()
    return () => {
      cancelled = true
    }
  }, [live, refreshLocal])

  useEffect(() => {
    const on = () => refreshLocal()
    window.addEventListener(CASES_EVENT, on as EventListener)
    return () => window.removeEventListener(CASES_EVENT, on as EventListener)
  }, [refreshLocal])

  return [data, refreshLocal, { live, lastError }] as const
}
