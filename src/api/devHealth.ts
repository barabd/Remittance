/** Vite dev stub `/api/health` (same origin). Not under `/api/v1`. */

export async function pingFrmsDevHealth(): Promise<{ ok: boolean; service?: string }> {
  const r = await fetch('/api/health', { headers: { Accept: 'application/json' } })
  if (!r.ok) throw new Error(`Health HTTP ${r.status}`)
  return (await r.json()) as { ok: boolean; service?: string }
}
