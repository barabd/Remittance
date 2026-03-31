/**
 * Data integrity & compliance helpers for audit logs (SPA demo).
 * - Timestamps: canonical UTC ISO-8601.
 * - W5H: who, what, when (UTC), where (IP + device summary), how (channel / verb).
 * - Tamper-evidence: hash chain over canonical payloads (append-only). Browser storage is not WORM;
 *   production should use server HMAC-SHA256 + immutable / append-only retention.
 */

export const AUDIT_GENESIS = 'GENESIS'

export const DEFAULT_AUDIT_HOW = 'UI_ACTION'

/** UTC instant, ISO-8601 with Z suffix (sortable, unambiguous). */
export function nowUtcIso(): string {
  return new Date().toISOString()
}

/** Truncated client environment for "where" (device / UA). */
export function getClientDeviceSummary(): string {
  if (typeof navigator === 'undefined') return 'n/a'
  try {
    const ua = (navigator.userAgent || '').slice(0, 160)
    const pl = (navigator.platform || '').slice(0, 80)
    return `${pl} · ${ua}`.trim() || 'n/a'
  } catch {
    return 'n/a'
  }
}

function fnv1aHex(s: string): string {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return `fnv1a:${(h >>> 0).toString(16).padStart(8, '0')}`
}

/**
 * Demo tamper-evident chain link. previousParentHash = null → treated as AUDIT_GENESIS.
 * Production: replace with HMAC-SHA256(secret, prevHash + canonical) on the server.
 */
export function computeAuditEntryHash(previousParentHash: string | null, stable: Record<string, string>): string {
  const keys = Object.keys(stable).sort()
  const canonical = keys.map((k) => `${k}=${stable[k]}`).join('|')
  const prev = previousParentHash ?? AUDIT_GENESIS
  return fnv1aHex(`${prev}|${canonical}`)
}

export type IntegrityStamp = {
  atUtc: string
  how: string
  clientDevice: string
  previousEntryHash: string | null
  entryHash: string
}

/**
 * @param previousTipEntryHash - entryHash of the current newest row (first in descending arrays), or undefined if empty
 */
export function stampIntegrity(
  previousTipEntryHash: string | undefined,
  stableSansTime: Record<string, string>,
): IntegrityStamp {
  const atUtc = nowUtcIso()
  const prev = previousTipEntryHash === undefined ? null : previousTipEntryHash
  const how = stableSansTime.how ?? DEFAULT_AUDIT_HOW
  const stable = { ...stableSansTime, how, atUtc }
  const entryHash = computeAuditEntryHash(prev, stable)
  return {
    atUtc,
    how,
    clientDevice: getClientDeviceSummary(),
    previousEntryHash: prev,
    entryHash,
  }
}

export type ChainVerifyResult = {
  ok: boolean
  /** Index in descending array where link or hash failed */
  brokenAt?: number
  /** Rows with no integrity stamp (pre-migration / seed) */
  skippedLegacy: number
  checked: number
}

/**
 * rows: newest-first. Each row's previousEntryHash must equal the next row's entryHash (or null if oldest and genesis).
 */
export function verifyDescendingIntegrityChain<T extends Partial<IntegrityStamp & { entryHash?: string }>>(
  rows: T[],
  buildStable: (row: T) => Record<string, string>,
): ChainVerifyResult {
  let skippedLegacy = 0
  let checked = 0
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    if (!r.entryHash || !r.atUtc) {
      skippedLegacy++
      continue
    }
    checked++
    const older = i + 1 < rows.length ? rows[i + 1] : null
    const expectedPrevHash = older?.entryHash != null ? older.entryHash : null
    if (r.previousEntryHash !== expectedPrevHash) {
      return { ok: false, brokenAt: i, skippedLegacy, checked }
    }
    const stable = buildStable(r)
    const recomputed = computeAuditEntryHash(expectedPrevHash, stable)
    if (recomputed !== r.entryHash) {
      return { ok: false, brokenAt: i, skippedLegacy, checked }
    }
  }
  return { ok: true, skippedLegacy, checked }
}

/** Calendar date YYYY-MM-DD from UTC field for filters */
export function utcDayFromIso(atUtc: string): string {
  return atUtc.slice(0, 10)
}
