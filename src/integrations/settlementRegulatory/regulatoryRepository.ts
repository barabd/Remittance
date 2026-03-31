/**
 * Regulatory packages (#32): localStorage + optional Java (`/regulatory/packages`).
 */

import type { RegulatoryPackageDto } from '../../api/types'
import {
  liveAdvanceRegulatoryPackage,
  liveCreateRegulatoryPackage,
  liveListRegulatoryPackages,
} from '../../api/live/client'
import { nextId, nowTs } from '../../lib/datetimeIds'
import * as local from './regulatoryLocal'
import type { RegulatoryPackage } from './types'

export { REGULATORY_PACKAGE_EVENT } from './constants'

function frmsLiveApiEnabled(): boolean {
  return import.meta.env.VITE_USE_LIVE_API === 'true'
}

const KINDS = ['net_position_daily', 'aggregate_remittance'] as const
const STATUSES = ['Draft', 'Queued', 'Sent', 'Ack'] as const

function isKind(s: string): s is RegulatoryPackage['kind'] {
  return (KINDS as readonly string[]).includes(s)
}

function isStatus(s: string): s is RegulatoryPackage['status'] {
  return (STATUSES as readonly string[]).includes(s)
}

export function normalizeRegulatoryPackage(d: RegulatoryPackageDto): RegulatoryPackage {
  const k = String(d.kind ?? 'net_position_daily')
  const st = String(d.status ?? 'Draft').replace(' (demo)', '')
  const dest = String(d.destination ?? '').replace(' (demo target)', '')
  return {
    id: String(d.id ?? ''),
    kind: isKind(k) ? k : 'net_position_daily',
    title: String(d.title ?? ''),
    period: String(d.period ?? ''),
    summary: String(d.summary ?? ''),
    status: isStatus(st) ? st : 'Draft',
    destination: dest,
    createdAt: String(d.createdAt ?? ''),
  }
}

export async function syncRegulatoryPackagesFromLive(): Promise<void> {
  if (!frmsLiveApiEnabled()) return
  const p = await liveListRegulatoryPackages()
  local.saveRegulatoryPackages(p.items.map(normalizeRegulatoryPackage))
}

export function loadRegulatoryPackages(): RegulatoryPackage[] {
  return local.loadRegulatoryPackages()
}

export function queueNetPositionPackageDemo(period: string, netBdtSummary: string): Promise<void> {
  if (!frmsLiveApiEnabled()) {
    const row: RegulatoryPackage = {
      id: nextId('REG'),
      kind: 'net_position_daily',
      title: `Daily net position — ${period}`,
      period,
      summary: netBdtSummary,
      status: 'Draft',
      destination: 'Bangladesh Bank / FI reporting portal',
      createdAt: nowTs(),
    }
    local.saveRegulatoryPackages([row, ...local.loadRegulatoryPackages()])
    return Promise.resolve()
  }
  return liveCreateRegulatoryPackage({ period, summary: netBdtSummary }).then((created) => {
    const row = normalizeRegulatoryPackage(created)
    local.saveRegulatoryPackages([row, ...local.loadRegulatoryPackages().filter((r) => r.id !== row.id)])
  })
}

export function advanceRegulatoryPackageDemo(id: string): Promise<void> {
  if (!frmsLiveApiEnabled()) {
    local.saveRegulatoryPackages(
      local.loadRegulatoryPackages().map((r) => {
        if (r.id !== id) return r
        const next =
          r.status === 'Draft'
            ? 'Queued'
            : r.status === 'Queued'
              ? 'Sent'
              : r.status === 'Sent'
                ? 'Ack'
                : 'Draft'
        return { ...r, status: next }
      }),
    )
    return Promise.resolve()
  }
  return liveAdvanceRegulatoryPackage(id).then((updated) => {
    const row = normalizeRegulatoryPackage(updated)
    local.saveRegulatoryPackages(
      local.loadRegulatoryPackages().map((r) => (r.id === row.id ? row : r)),
    )
  })
}
