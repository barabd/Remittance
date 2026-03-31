import { quoteConversion } from './pricingStore'
import { nextId, nowTs } from './mastersStore'

export type IncentiveTier = {
  id: string
  label: string
  minBdtEquivalent: number
  maxBdtEquivalent: number
  /** Percent of BDT-equivalent principal (e.g. 0.1 = 0.1%) */
  pctOfPrincipal: number
  flatBdt: number
  updatedAt: string
}

export const INCENTIVE_CHANGED_EVENT = 'incentive:changed'

const K_TIERS = 'frms.incentive.tiers.v1'

function emit() {
  window.dispatchEvent(new CustomEvent(INCENTIVE_CHANGED_EVENT))
}

function seedTiers(): IncentiveTier[] {
  return [
    {
      id: 'INC-1',
      label: 'Retail spill (≤100k BDT eq.)',
      minBdtEquivalent: 0,
      maxBdtEquivalent: 100_000,
      pctOfPrincipal: 0.12,
      flatBdt: 10,
      updatedAt: '2026-03-01',
    },
    {
      id: 'INC-2',
      label: 'Mid ticket',
      minBdtEquivalent: 100_000,
      maxBdtEquivalent: 2_000_000,
      pctOfPrincipal: 0.08,
      flatBdt: 25,
      updatedAt: '2026-03-01',
    },
    {
      id: 'INC-3',
      label: 'High touch / corporate',
      minBdtEquivalent: 2_000_000,
      maxBdtEquivalent: 1e18,
      pctOfPrincipal: 0.04,
      flatBdt: 50,
      updatedAt: '2026-03-01',
    },
  ]
}

function readTiers(): IncentiveTier[] {
  try {
    const raw = localStorage.getItem(K_TIERS)
    if (!raw) {
      const s = seedTiers()
      localStorage.setItem(K_TIERS, JSON.stringify(s))
      return s
    }
    const p = JSON.parse(raw) as IncentiveTier[]
    return Array.isArray(p) && p.length > 0 ? p : seedTiers()
  } catch {
    return seedTiers()
  }
}

function writeTiers(rows: IncentiveTier[], emitEvent = true) {
  localStorage.setItem(K_TIERS, JSON.stringify(rows))
  if (emitEvent) emit()
}

export function loadIncentiveTiers(): IncentiveTier[] {
  return readTiers()
}

export function saveIncentiveTiers(rows: IncentiveTier[], emitEvent = true) {
  writeTiers(rows.slice(0, 40), emitEvent)
}

export function upsertIncentiveTier(row: Omit<IncentiveTier, 'id' | 'updatedAt'> & { id?: string }) {
  const list = readTiers()
  const id = row.id ?? nextId('INC')
  const next: IncentiveTier = {
    ...row,
    id,
    updatedAt: nowTs(),
  }
  const idx = list.findIndex((t) => t.id === id)
  if (idx >= 0) list[idx] = next
  else list.unshift(next)
  writeTiers(list)
}

/** BDT equivalent for incentive bands (uses range FX from pricing store). */
export function estimateBdtEquivalent(amount: number, currency: string): number {
  const c = currency.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'USD'
  if (!Number.isFinite(amount) || amount <= 0) return 0
  if (c === 'BDT') return amount
  const q = quoteConversion(amount, c, 'BDT')
  if (q) return q.grossTo
  return amount
}

export function parseAmountDisplay(amountStr: string): { num: number; ccy: string } {
  const cleaned = amountStr.replace(/,/g, '').trim()
  const match = cleaned.match(/^([\d.]+)\s*([A-Za-z]{3})?$/)
  if (match) {
    const num = Number(match[1]) || 0
    const ccy = (match[2] || 'USD').toUpperCase()
    return { num, ccy }
  }
  const parts = cleaned.split(/\s+/).filter(Boolean)
  const num = Number(parts[0]) || 0
  const ccy = (parts.find((p) => /^[A-Za-z]{3}$/.test(p)) || 'USD').toUpperCase()
  return { num, ccy }
}

/**
 * Partner/exchange-house incentive (demo #30): tiered % + flat on BDT-equivalent principal,
 * small kicker when exchange house code contains “PRIORITY”.
 */
export function computeRemittanceIncentive(
  principalAmount: number,
  currency: string,
  exchangeHouse: string,
): { incentiveBdt: number; rule: string } {
  const eq = estimateBdtEquivalent(principalAmount, currency)
  if (eq <= 0) return { incentiveBdt: 0, rule: 'No principal' }
  const tiers = loadIncentiveTiers().slice().sort((a, b) => a.minBdtEquivalent - b.minBdtEquivalent)
  const tier = tiers.find((t) => eq >= t.minBdtEquivalent && eq < t.maxBdtEquivalent) ?? tiers[tiers.length - 1]
  if (!tier) return { incentiveBdt: 0, rule: 'No tier' }
  let bdt = (eq * tier.pctOfPrincipal) / 100 + tier.flatBdt
  let rule = `${tier.label} (${tier.pctOfPrincipal}% + ৳${tier.flatBdt})`
  if (/priority/i.test(exchangeHouse || '')) {
    const bonus = Math.min(500, eq * 0.0002)
    bdt += bonus
    rule += `; PRIORITY EH +৳${bonus.toFixed(2)}`
  }
  return { incentiveBdt: Math.round(bdt * 100) / 100, rule }
}
