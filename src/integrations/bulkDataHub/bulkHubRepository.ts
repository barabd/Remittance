/**
 * Bulk data hub: local activity log + optional POST/GET `/bulk-hub/events` (Java + MSSQL).
 * Stack: `database/mssql/bulk_hub_log.sql` → `com.frms.ops.bulk` → this module → `bulkHubStore` / `bulkHubApi`.
 */

import type { BulkHubEventDto } from '../../api/types'
import { liveListBulkHubEvents, livePostBulkHubEvent } from '../../api/live/client'
import { nextId, nowTs } from '../../lib/datetimeIds'
import * as local from './activityLocal'
import type { BulkHubActivityEntry, BulkHubTarget } from './types'

export { BULK_HUB_EVENT } from './constants'

function frmsLiveApiEnabled(): boolean {
  return import.meta.env.VITE_USE_LIVE_API === 'true'
}

const TARGET_SET = new Set<BulkHubTarget>([
  'exchange_bulk',
  'remittance_search',
  'file_mapping',
  'admin_bulk',
  'unknown',
])

function isTarget(s: string): s is BulkHubTarget {
  return TARGET_SET.has(s as BulkHubTarget)
}

export function normalizeBulkHubEventDto(d: BulkHubEventDto): BulkHubActivityEntry {
  const t = String(d.target ?? 'unknown')
  return {
    id: String(d.id ?? ''),
    target: isTarget(t) ? t : 'unknown',
    fileName: String(d.fileName ?? ''),
    rowCount: typeof d.rowCount === 'number' ? d.rowCount : Number(d.rowCount ?? 0),
    columnCount: typeof d.columnCount === 'number' ? d.columnCount : Number(d.columnCount ?? 0),
    sheetName: d.sheetName != null && String(d.sheetName).length > 0 ? String(d.sheetName) : undefined,
    recordedAt: String(d.recordedAt ?? ''),
  }
}

export function loadBulkHubActivity(): BulkHubActivityEntry[] {
  return local.loadBulkHubActivity()
}

export async function syncBulkHubActivityFromLive(): Promise<void> {
  if (!frmsLiveApiEnabled()) return
  const p = await liveListBulkHubEvents()
  local.replaceBulkHubActivity(p.items.map(normalizeBulkHubEventDto))
}

/**
 * Persists preview metadata locally and, when live, creates a row in `bulk_hub_event`.
 */
export async function recordBulkHubPreview(input: {
  target: BulkHubTarget
  fileName: string
  rowCount: number
  columnCount: number
  sheetName?: string
}): Promise<BulkHubActivityEntry> {
  const recordedAt = nowTs()
  if (!frmsLiveApiEnabled()) {
    const entry: BulkHubActivityEntry = {
      id: nextId('BHUB'),
      target: input.target,
      fileName: input.fileName,
      rowCount: input.rowCount,
      columnCount: input.columnCount,
      sheetName: input.sheetName,
      recordedAt,
    }
    local.prependBulkHubActivity(entry)
    return entry
  }
  const created = await livePostBulkHubEvent({
    target: input.target,
    fileName: input.fileName,
    rowCount: input.rowCount,
    columnCount: input.columnCount,
    sheetName: input.sheetName,
    recordedAt,
  })
  const entry = normalizeBulkHubEventDto(created)
  local.prependBulkHubActivity(entry)
  return entry
}
