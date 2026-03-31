/**
 * Settlement analytics (#31): local cache + optional Java (`/settlement/week-stats`, `/settlement/bilateral-positions`).
 */

import type { SettlementBilateralPositionDto, SettlementWeekStatDto } from '../../api/types'
import {
  liveListSettlementBilateralPositions,
  liveListSettlementWeekStats,
} from '../../api/live/client'
import * as local from './settlementLocal'
import type { BilateralPosition, SettlementStatPoint } from './types'

export { SETTLEMENT_ANALYTICS_EVENT } from './constants'

function frmsLiveApiEnabled(): boolean {
  return import.meta.env.VITE_USE_LIVE_API === 'true'
}

const BUCKETS = ['Asia-GCC', 'USD-corridor', 'EUR-UK', 'Other'] as const

function isBucket(s: string): s is BilateralPosition['multilateralBucket'] {
  return (BUCKETS as readonly string[]).includes(s)
}

export function normalizeWeekStat(d: SettlementWeekStatDto): SettlementStatPoint {
  return {
    day: String(d.day ?? ''),
    grossInBdt: Number(d.grossInBdt ?? 0),
    netSettlementBdt: Number(d.netSettlementBdt ?? 0),
    bilateralAdjustments: Number(d.bilateralAdjustments ?? 0),
  }
}

export function normalizeBilateral(d: SettlementBilateralPositionDto): BilateralPosition {
  const b = String(d.multilateralBucket ?? 'Other')
  return {
    id: String(d.id ?? ''),
    counterparty: String(d.counterparty ?? ''),
    corridor: String(d.corridor ?? ''),
    netPositionBdt: Number(d.netPositionBdt ?? 0),
    asOf: String(d.asOf ?? ''),
    multilateralBucket: isBucket(b) ? b : 'Other',
  }
}

export async function syncSettlementAnalyticsFromLive(): Promise<void> {
  if (!frmsLiveApiEnabled()) return
  const [statsPage, bilPage] = await Promise.all([
    liveListSettlementWeekStats(),
    liveListSettlementBilateralPositions(),
  ])
  local.saveSettlementStatistics(statsPage.items.map(normalizeWeekStat))
  local.saveBilateralPositions(bilPage.items.map(normalizeBilateral))
}

export function loadSettlementStatistics(): SettlementStatPoint[] {
  return local.loadSettlementStatistics()
}

export function loadBilateralPositions(): BilateralPosition[] {
  return local.loadBilateralPositions()
}
