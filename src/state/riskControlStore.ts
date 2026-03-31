import { nextId, nowTs } from './mastersStore'
import type { RiskControlProfileDto } from '../api/types'
import {
  liveCreateRiskControl,
  liveDeleteRiskControl,
  liveListRiskControls,
  livePatchRiskControl,
} from '../api/live/client'

export type RiskProfile = {
  id: string
  customerName: string
  maxPerTxnBdt: number
  maxDailyTotalBdt: number
  watchLevel: 'Low' | 'Medium' | 'High'
  updatedAt: string
}

const KEY = 'frms.risk.profiles.v1'
export const RISK_CONTROL_EVENT = 'riskControl:changed'

function frmsLiveApiEnabled(): boolean {
  return import.meta.env.VITE_USE_LIVE_API === 'true'
}

function seed(): RiskProfile[] {
  return [
    {
      id: 'RISK-1',
      customerName: 'Rahim Uddin',
      maxPerTxnBdt: 500_000,
      maxDailyTotalBdt: 1_500_000,
      watchLevel: 'Medium',
      updatedAt: '2026-03-26 09:00',
    },
    {
      id: 'RISK-2',
      customerName: 'Karim Mia',
      maxPerTxnBdt: 300_000,
      maxDailyTotalBdt: 900_000,
      watchLevel: 'High',
      updatedAt: '2026-03-26 09:00',
    },
  ]
}

function read(): RiskProfile[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      const s = seed()
      localStorage.setItem(KEY, JSON.stringify(s))
      return s
    }
    const p = JSON.parse(raw) as RiskProfile[]
    return Array.isArray(p) && p.length > 0 ? p : seed()
  } catch {
    return seed()
  }
}

function save(rows: RiskProfile[]) {
  localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 200)))
  window.dispatchEvent(new CustomEvent(RISK_CONTROL_EVENT))
}

function normalizedName(name: string): string {
  return name.trim().toLowerCase()
}

export function loadRiskProfiles() {
  return read()
}

const VALID_WATCH_LEVELS: RiskProfile['watchLevel'][] = ['Low', 'Medium', 'High']

function coerceWatchLevel(raw: string): RiskProfile['watchLevel'] {
  const v = raw as RiskProfile['watchLevel']
  return VALID_WATCH_LEVELS.includes(v) ? v : 'Medium'
}

function fromDto(d: RiskControlProfileDto): RiskProfile {
  return {
    id: d.id,
    customerName: d.customerName,
    maxPerTxnBdt: Math.max(Number(d.maxPerTxnBdt) || 0, 0),
    maxDailyTotalBdt: Math.max(Number(d.maxDailyTotalBdt) || 0, 0),
    watchLevel: coerceWatchLevel(d.watchLevel),
    updatedAt: d.updatedAt,
  }
}

export async function syncRiskProfilesFromLive(): Promise<void> {
  if (!frmsLiveApiEnabled()) return
  const p = await liveListRiskControls()
  const merged = p.items.map(fromDto)
  if (merged.length > 0) save(merged)
}

export async function upsertRiskProfile(row: Omit<RiskProfile, 'id' | 'updatedAt'> & { id?: string }) {
  const list = read()
  const hasDuplicateName = list.some(
    (r) => normalizedName(r.customerName) === normalizedName(row.customerName) && r.id !== row.id,
  )
  if (hasDuplicateName) {
    throw new Error(`A risk profile already exists for ${row.customerName.trim()}.`)
  }

  if (!frmsLiveApiEnabled()) {
    const id = row.id ?? nextId('RISK')
    const next: RiskProfile = { ...row, id, updatedAt: nowTs() }
    const idx = list.findIndex((r) => r.id === id)
    if (idx >= 0) list[idx] = next
    else list.unshift(next)
    save(list)
    return next
  }

  if (row.id) {
    const patched = await livePatchRiskControl(row.id, {
      customerName: row.customerName,
      maxPerTxnBdt: row.maxPerTxnBdt,
      maxDailyTotalBdt: row.maxDailyTotalBdt,
      watchLevel: row.watchLevel,
    })
    const merged = read().map((r) => (r.id === row.id ? fromDto(patched) : r))
    save(merged)
    return fromDto(patched)
  }

  const created = await liveCreateRiskControl({
    customerName: row.customerName,
    maxPerTxnBdt: row.maxPerTxnBdt,
    maxDailyTotalBdt: row.maxDailyTotalBdt,
    watchLevel: row.watchLevel,
  })
  const merged = [fromDto(created), ...read().filter((r) => r.id !== created.id)]
  save(merged)
  return fromDto(created)
}

export async function deleteRiskProfile(id: string) {
  if (!frmsLiveApiEnabled()) {
    save(read().filter((r) => r.id !== id))
    return
  }
  await liveDeleteRiskControl(id)
  save(read().filter((r) => r.id !== id))
}

export function parseBdtAmountDisplay(amount: string): number {
  const cleaned = String(amount).replace(/[^\d.]/g, '')
  return Number(cleaned) || 0
}

/** Demo risk gate (#10): per-transaction and same-day cumulative limit. */
export function evaluateRiskForApproval(input: {
  customerName: string
  amountBdt: number
  sameDayAmountsBdt: number[]
}): { ok: boolean; reason?: string; profile?: RiskProfile } {
  const p = read().find((r) => r.customerName.toLowerCase() === input.customerName.trim().toLowerCase())
  if (!p) return { ok: true }
  if (input.amountBdt > p.maxPerTxnBdt) {
    return {
      ok: false,
      reason: `Per-transaction risk cap exceeded for ${p.customerName}. ${input.amountBdt.toFixed(2)} > ${p.maxPerTxnBdt.toFixed(2)} BDT.`,
      profile: p,
    }
  }
  const daily = input.sameDayAmountsBdt.reduce((s, x) => s + x, 0)
  if (daily > p.maxDailyTotalBdt) {
    return {
      ok: false,
      reason: `Daily total risk cap exceeded for ${p.customerName}. ${daily.toFixed(2)} > ${p.maxDailyTotalBdt.toFixed(2)} BDT.`,
      profile: p,
    }
  }
  return { ok: true, profile: p }
}
