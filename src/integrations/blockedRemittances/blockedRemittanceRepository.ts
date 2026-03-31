/**
 * Block remittance reports — `VITE_USE_LIVE_API` → Java + `eh_blocked_remittance`; else `blockedRemittanceStore`.
 */

import type { BlockedRemittanceDto } from '../../api/types'
import {
  liveDeleteBlockedRemittance,
  liveListBlockedRemittances,
  livePatchBlockedRemittance,
} from '../../api/live/client'
import {
  BLOCKED_REMITTANCES_EVENT,
  type BlockedRemittanceEntry,
  listBlockedRemittances as listLocal,
  removeBlockedRemittance,
  updateBlockedNote,
} from '../../state/blockedRemittanceStore'

function frmsLiveApiEnabled(): boolean {
  return import.meta.env.VITE_USE_LIVE_API === 'true'
}

function emitBlockedChanged() {
  window.dispatchEvent(new CustomEvent(BLOCKED_REMITTANCES_EVENT))
}

function dtoToEntry(d: BlockedRemittanceDto): BlockedRemittanceEntry {
  return {
    id: d.id,
    remittanceNo: d.remittanceNo,
    remitter: d.remitter,
    beneficiary: d.beneficiary,
    corridor: d.corridor,
    amount: d.amount,
    blockedAt: d.blockedAt,
    branch: d.branch,
    note: d.note,
  }
}

function filterLocalRows(rows: BlockedRemittanceEntry[], query?: string): BlockedRemittanceEntry[] {
  const q = (query ?? '').trim().toLowerCase()
  if (!q) return rows
  return rows.filter((r) => {
    const haystack = [
      r.remittanceNo,
      r.remitter,
      r.beneficiary,
      r.corridor,
      r.amount,
      r.blockedAt,
      r.branch ?? '',
      r.note ?? '',
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}

export async function fetchBlockedRemittances(query?: string): Promise<BlockedRemittanceEntry[]> {
  const q = (query ?? '').trim()
  if (frmsLiveApiEnabled()) {
    const pageSize = 200
    const first = await liveListBlockedRemittances({
      page: '1',
      pageSize: String(pageSize),
      ...(q ? { q } : {}),
    })
    const items = [...first.items]

    const totalPages = Math.ceil(first.total / pageSize)
    for (let page = 2; page <= totalPages; page += 1) {
      const next = await liveListBlockedRemittances({
        page: String(page),
        pageSize: String(pageSize),
        ...(q ? { q } : {}),
      })
      items.push(...next.items)
    }

    return items.map(dtoToEntry)
  }
  return filterLocalRows(listLocal(), q)
}

export async function saveBlockedNote(id: string, note: string): Promise<void> {
  if (frmsLiveApiEnabled()) {
    await livePatchBlockedRemittance(id, { note })
    emitBlockedChanged()
    return
  }
  updateBlockedNote(id, note)
}

export async function releaseBlockedRemittance(id: string): Promise<void> {
  if (frmsLiveApiEnabled()) {
    await liveDeleteBlockedRemittance(id)
    emitBlockedChanged()
    return
  }
  removeBlockedRemittance(id)
}

export { BLOCKED_REMITTANCES_EVENT }
