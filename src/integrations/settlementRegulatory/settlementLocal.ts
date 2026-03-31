/**
 * Browser cache for weekly stats + bilateral rows (mirrors GET /settlement/* when live).
 */

import { SETTLEMENT_ANALYTICS_EVENT, SETTLEMENT_BILATERAL_LS_KEY, SETTLEMENT_STATS_LS_KEY } from './constants'
import type { BilateralPosition, SettlementStatPoint } from './types'

const STAT_SEED: SettlementStatPoint[] = [
  { day: 'Mon', grossInBdt: 4280e6, netSettlementBdt: 4195e6, bilateralAdjustments: 12.4e6 },
  { day: 'Tue', grossInBdt: 4510e6, netSettlementBdt: 4402e6, bilateralAdjustments: 15.1e6 },
  { day: 'Wed', grossInBdt: 4390e6, netSettlementBdt: 4310e6, bilateralAdjustments: 11.8e6 },
  { day: 'Thu', grossInBdt: 4680e6, netSettlementBdt: 4588e6, bilateralAdjustments: 14.6e6 },
  { day: 'Fri', grossInBdt: 4920e6, netSettlementBdt: 4820e6, bilateralAdjustments: 16.2e6 },
]

const BILATERAL_SEED: BilateralPosition[] = [
  {
    id: 'BL-001',
    counterparty: 'NEC Money Transfer Ltd (UK)',
    corridor: 'GBP → BDT',
    netPositionBdt: -128.4e6,
    asOf: '2026-03-26',
    multilateralBucket: 'EUR-UK',
  },
  {
    id: 'BL-002',
    counterparty: 'Wall Street Exchange Kuwait',
    corridor: 'KWD → BDT',
    netPositionBdt: 64.2e6,
    asOf: '2026-03-26',
    multilateralBucket: 'Asia-GCC',
  },
  {
    id: 'BL-003',
    counterparty: 'Al Rajhi Banking & Investment Corp',
    corridor: 'SAR → BDT',
    netPositionBdt: 210.9e6,
    asOf: '2026-03-26',
    multilateralBucket: 'Asia-GCC',
  },
  {
    id: 'BL-004',
    counterparty: 'Partner nostro (USD)',
    corridor: 'USD → BDT',
    netPositionBdt: -88.0e6,
    asOf: '2026-03-26',
    multilateralBucket: 'USD-corridor',
  },
]

function readStats(): SettlementStatPoint[] {
  try {
    const raw = localStorage.getItem(SETTLEMENT_STATS_LS_KEY)
    if (!raw) {
      localStorage.setItem(SETTLEMENT_STATS_LS_KEY, JSON.stringify(STAT_SEED))
      return [...STAT_SEED]
    }
    const p = JSON.parse(raw) as SettlementStatPoint[]
    return Array.isArray(p) && p.length > 0 ? p : [...STAT_SEED]
  } catch {
    return [...STAT_SEED]
  }
}

function readBilateral(): BilateralPosition[] {
  try {
    const raw = localStorage.getItem(SETTLEMENT_BILATERAL_LS_KEY)
    if (!raw) {
      localStorage.setItem(SETTLEMENT_BILATERAL_LS_KEY, JSON.stringify(BILATERAL_SEED))
      return [...BILATERAL_SEED]
    }
    const p = JSON.parse(raw) as BilateralPosition[]
    return Array.isArray(p) && p.length > 0 ? p : [...BILATERAL_SEED]
  } catch {
    return [...BILATERAL_SEED]
  }
}

function saveStats(rows: SettlementStatPoint[]) {
  localStorage.setItem(SETTLEMENT_STATS_LS_KEY, JSON.stringify(rows))
  window.dispatchEvent(new CustomEvent(SETTLEMENT_ANALYTICS_EVENT))
}

function saveBilateral(rows: BilateralPosition[]) {
  localStorage.setItem(SETTLEMENT_BILATERAL_LS_KEY, JSON.stringify(rows))
  window.dispatchEvent(new CustomEvent(SETTLEMENT_ANALYTICS_EVENT))
}

export function loadSettlementStatistics(): SettlementStatPoint[] {
  return readStats()
}

export function loadBilateralPositions(): BilateralPosition[] {
  return readBilateral()
}

export function saveSettlementStatistics(rows: SettlementStatPoint[]) {
  saveStats(rows)
}

export function saveBilateralPositions(rows: BilateralPosition[]) {
  saveBilateral(rows)
}
