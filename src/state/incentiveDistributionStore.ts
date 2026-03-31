/** Demo incentive accrual & distribution to exchange partners (#33). */

import { nextId, nowTs } from './mastersStore'

export type IncentiveDistributionBatch = {
  id: string
  exchangeHouse: string
  period: string
  totalIncentiveBdt: number
  remittanceCount: number
  status: 'Accrued' | 'Approved for payout' | 'Paid' | 'On hold'
  channel: 'Nostro adjustment' | 'Partner invoice' | 'GL sweep'
  updatedAt: string
}

export const INCENTIVE_DISTRIBUTION_EVENT = 'incentiveDistribution:changed'

const KEY = 'frms.incentiveDistribution.v1'

function load(): IncentiveDistributionBatch[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      const seed = seedBatches()
      localStorage.setItem(KEY, JSON.stringify(seed))
      return seed
    }
    const p = JSON.parse(raw) as IncentiveDistributionBatch[]
    return Array.isArray(p) && p.length > 0 ? p : seedBatches()
  } catch {
    return seedBatches()
  }
}

function seedBatches(): IncentiveDistributionBatch[] {
  return [
    {
      id: 'IDB-001',
      exchangeHouse: 'EH-GULF-01',
      period: '2026-03',
      totalIncentiveBdt: 128_450.75,
      remittanceCount: 1840,
      status: 'Accrued',
      channel: 'Nostro adjustment',
      updatedAt: '2026-03-26 09:00',
    },
    {
      id: 'IDB-002',
      exchangeHouse: 'EH-RUH-02',
      period: '2026-03',
      totalIncentiveBdt: 82_110.2,
      remittanceCount: 960,
      status: 'Approved for payout',
      channel: 'Partner invoice',
      updatedAt: '2026-03-26 10:15',
    },
  ]
}

function save(rows: IncentiveDistributionBatch[]) {
  localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 300)))
  window.dispatchEvent(new CustomEvent(INCENTIVE_DISTRIBUTION_EVENT))
}

export function loadIncentiveDistributionBatches(): IncentiveDistributionBatch[] {
  return load()
}

export function accrueDemoBatch(exchangeHouse: string, period: string, totalBdt: number, count: number) {
  const row: IncentiveDistributionBatch = {
    id: nextId('IDB'),
    exchangeHouse,
    period,
    totalIncentiveBdt: totalBdt,
    remittanceCount: count,
    status: 'Accrued',
    channel: 'Nostro adjustment',
    updatedAt: nowTs(),
  }
  save([row, ...load()])
}

export function advanceBatchStatus(id: string) {
  const order: IncentiveDistributionBatch['status'][] = [
    'Accrued',
    'Approved for payout',
    'Paid',
  ]
  save(
    load().map((b) => {
      if (b.id !== id) return b
      const i = order.indexOf(b.status)
      const next = i >= 0 && i < order.length - 1 ? order[i + 1] : b.status
      return { ...b, status: next, updatedAt: nowTs() }
    }),
  )
}
