/** Duplicate remittance detection: exchange house + remittance number (demo index in localStorage). */

export const DUPLICATE_INDEX_EVENT = 'duplicateIndex:changed'

const KEY = 'frms.duplicateIndex.v1'

export function dupKey(exchangeHouse: string, remittanceNo: string) {
  const eh = (exchangeHouse || 'UNKNOWN').trim().toLowerCase()
  const rn = (remittanceNo || '').trim().toLowerCase()
  return `${eh}::${rn}`
}

function loadMap(): Record<string, true> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, true>
  } catch {
    return {}
  }
}

function saveMap(m: Record<string, true>) {
  localStorage.setItem(KEY, JSON.stringify(m))
  window.dispatchEvent(new CustomEvent(DUPLICATE_INDEX_EVENT))
}

export function isDuplicatePair(exchangeHouse: string, remittanceNo: string) {
  return Boolean(loadMap()[dupKey(exchangeHouse, remittanceNo)])
}

/** Merge keys into persistent index (idempotent). */
export function registerBatch(items: { exchangeHouse?: string; remittanceNo: string }[]) {
  const m = { ...loadMap() }
  for (const r of items) {
    if (!r.remittanceNo?.trim()) continue
    m[dupKey(r.exchangeHouse ?? 'UNKNOWN', r.remittanceNo)] = true
  }
  saveMap(m)
}

/** Validate file rows: within-file duplicates + collision with index (#19). */
export function validateIncomingBatch(items: { exchangeHouse?: string; remittanceNo: string }[]): string[] {
  const seen = new Set<string>()
  const problems: string[] = []
  for (const r of items) {
    if (!r.remittanceNo?.trim()) continue
    const k = dupKey(r.exchangeHouse ?? 'UNKNOWN', r.remittanceNo)
    if (seen.has(k)) problems.push(`Duplicate in batch: ${k}`)
    seen.add(k)
    if (loadMap()[k]) problems.push(`Already in system: ${k}`)
  }
  return problems
}
