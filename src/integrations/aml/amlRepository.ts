/**
 * AML alerts: local cache + optional live sync to `/compliance/alerts`.
 */

import type { AmlAlertDto } from '../../api/types'
import { liveCreateAmlAlert, liveListAmlAlerts, livePatchAmlAlert } from '../../api/live/client'
import { nextId, nowTs } from '../../lib/datetimeIds'
import { AML_ALERTS_CHANGED_EVENT } from './constants'
import * as amlLocal from './amlLocal'
import type { AmlAlertRow } from './types'

export { AML_ALERTS_CHANGED_EVENT }

function frmsLiveApiEnabled(): boolean {
  return import.meta.env.VITE_USE_LIVE_API === 'true'
}

export function loadAmlAlerts(): AmlAlertRow[] {
  return amlLocal.loadAmlAlerts()
}

export function openAmlAlertCount() {
  return amlLocal.loadAmlAlerts().filter((r) => r.match === 'Possible' && r.status === 'Open').length
}

export async function syncAmlFromLive(): Promise<void> {
  if (!frmsLiveApiEnabled()) return
  const p = await liveListAmlAlerts()
  amlLocal.saveAmlAlerts(p.items as AmlAlertRow[])
}

export function appendAmlAlert(row: AmlAlertRow): boolean {
  const rows = amlLocal.loadAmlAlerts()
  const dup = rows.some(
    (r) =>
      r.remittanceNo === row.remittanceNo &&
      r.match === 'Possible' &&
      row.match === 'Possible' &&
      r.list === row.list,
  )
  if (dup) return false
  amlLocal.saveAmlAlerts([row, ...rows])
  if (frmsLiveApiEnabled()) {
    void liveCreateAmlAlert(row as AmlAlertDto).then((created) => {
      const cur = amlLocal.loadAmlAlerts()
      const merged = cur.map((r) => (r.id === row.id ? (created as AmlAlertRow) : r))
      amlLocal.saveAmlAlerts(merged)
    })
  }
  return true
}

export function createAmlAlertFromScreening(input: {
  remittanceNo: string
  list: AmlAlertRow['list']
  score: number
  subjectHint: string
}): AmlAlertRow {
  return {
    id: nextId('AML'),
    remittanceNo: input.remittanceNo,
    screenedAt: nowTs(),
    match: 'Possible',
    list: input.list,
    score: input.score,
    status: 'Open',
    subjectHint: input.subjectHint,
  }
}

export async function updateAmlAlertStatus(
  id: string,
  status: AmlAlertRow['status'],
): Promise<AmlAlertRow | null> {
  const rows = amlLocal.loadAmlAlerts()
  const existing = rows.find((r) => r.id === id)
  if (!existing) return null

  const nextLocal = rows.map((r) => (r.id === id ? { ...r, status } : r))
  amlLocal.saveAmlAlerts(nextLocal)

  if (!frmsLiveApiEnabled()) {
    return nextLocal.find((r) => r.id === id) ?? null
  }

  const patched = await livePatchAmlAlert(id, { status })
  const merged = amlLocal
    .loadAmlAlerts()
    .map((r) => (r.id === id ? ({ ...r, ...patched } as AmlAlertRow) : r))
  amlLocal.saveAmlAlerts(merged)
  return merged.find((r) => r.id === id) ?? null
}
