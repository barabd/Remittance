/**
 * Demo settlement positions & daily statistics (#31). Facade over `integrations/settlementRegulatory/settlementRepository`.
 */

import type { BilateralPosition } from '../integrations/settlementRegulatory/types'
import {
  loadBilateralPositions as loadBilateralFromRepo,
  loadSettlementStatistics as loadStatsFromRepo,
} from '../integrations/settlementRegulatory/settlementRepository'

export type { BilateralPosition, SettlementStatPoint } from '../integrations/settlementRegulatory/types'

export function loadSettlementStatistics() {
  return loadStatsFromRepo()
}

export function loadBilateralPositions() {
  return loadBilateralFromRepo()
}

export function multilateralSummary(positions: BilateralPosition[]) {
  const map = new Map<string, number>()
  for (const p of positions) {
    map.set(p.multilateralBucket, (map.get(p.multilateralBucket) ?? 0) + p.netPositionBdt)
  }
  return [...map.entries()].map(([bucket, netBdt]) => ({ bucket, netBdt }))
}
