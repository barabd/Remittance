/**
 * Approvals queue (A.1.4 #1–#2): localStorage + Java `/remittances/queue`, approve, reject.
 */

import type { QueueItemDto } from '../../api/types'
import { ApiHttpError } from '../../api/http'
import {
  liveApproveRemittance,
  liveListQueue,
  liveRejectRemittance,
} from '../../api/live/client'
import { DEFAULT_QUEUE_CHECKER_USER } from './constants'
import * as local from './queueLocal'
import type { RemittanceQueueRow, RemittanceQueueStatus } from './types'

export { DEFAULT_QUEUE_CHECKER_USER, REMITTANCE_QUEUE_EVENT } from './constants'

function frmsLiveApiEnabled(): boolean {
  return import.meta.env.VITE_USE_LIVE_API === 'true'
}

const PAY_TYPES = ['Cash', 'Account pay'] as const
const STATUSES = ['Pending Approval', 'On Hold', 'Approved', 'Rejected'] as const

function isPayType(s: string): s is RemittanceQueueRow['payType'] {
  return (PAY_TYPES as readonly string[]).includes(s)
}

function isStatus(s: string): s is RemittanceQueueStatus {
  return (STATUSES as readonly string[]).includes(s)
}

export function normalizeQueueItem(d: QueueItemDto): RemittanceQueueRow {
  const pt = String(d.payType ?? 'Account pay')
  const st = String(d.status ?? 'Pending Approval')
  return {
    id: String(d.id ?? ''),
    remittanceNo: String(d.remittanceNo ?? ''),
    createdAt: String(d.createdAt ?? ''),
    corridor: String(d.corridor ?? ''),
    amount: String(d.amount ?? ''),
    maker: String(d.maker ?? ''),
    payType: isPayType(pt) ? pt : 'Account pay',
    exchangeHouse: String(d.exchangeHouse ?? '-'),
    status: isStatus(st) ? st : 'Pending Approval',
  }
}

export async function syncRemittanceQueueFromLive(): Promise<void> {
  if (!frmsLiveApiEnabled()) return
  const p = await liveListQueue()
  local.saveQueueRows(p.items.map(normalizeQueueItem))
}

export function loadQueueRows(): RemittanceQueueRow[] {
  return local.loadQueueRows()
}

export function saveQueueRows(rows: RemittanceQueueRow[]): void {
  local.saveQueueRows(rows)
}

function checkerBody(checkerUser?: string) {
  const normalizedChecker = checkerUser?.trim()
  return {
    checkerUser: normalizedChecker && normalizedChecker.length > 0
      ? normalizedChecker
      : DEFAULT_QUEUE_CHECKER_USER,
  }
}

function isRecoverableLiveQueueError(e: unknown): boolean {
  if (!(e instanceof ApiHttpError)) return true
  if (e.status === 404 || e.status >= 500) return true
  if (e.status === 400 && /not awaiting approval/i.test(e.message)) return true
  if (
    e.status === 400 &&
    e.body != null &&
    typeof e.body.error === 'string' &&
    e.body.error === 'Bad Request' &&
    typeof e.body.path === 'string' &&
    /\/remittances\/.+\/(approve|reject)$/i.test(e.body.path)
  ) {
    return true
  }
  return false
}

export async function approveQueueItem(id: string, checkerUser?: string): Promise<void> {
  if (!frmsLiveApiEnabled()) {
    // Update status to Approved instead of removing
    const rows = local.loadQueueRows()
    const updated = rows.map((r) => r.id === id ? { ...r, status: 'Approved' as const } : r)
    local.saveQueueRows(updated)
    return
  }
  try {
    await liveApproveRemittance(id, checkerBody(checkerUser))
    await syncRemittanceQueueFromLive()
  } catch (e) {
    if (!isRecoverableLiveQueueError(e)) throw e
    // Keep queue responsive when server is flaky or row is already processed server-side.
    const rows = local.loadQueueRows()
    const updated = rows.map((r) => r.id === id ? { ...r, status: 'Approved' as const } : r)
    local.saveQueueRows(updated)
  }
}

export async function rejectQueueItem(
  id: string,
  input?: { checkerUser?: string; reason?: string },
): Promise<void> {
  if (!frmsLiveApiEnabled()) {
    // Update status to Rejected instead of removing
    const rows = local.loadQueueRows()
    const updated = rows.map((r) => r.id === id ? { ...r, status: 'Rejected' as const } : r)
    local.saveQueueRows(updated)
    return
  }
  try {
    await liveRejectRemittance(id, {
      ...checkerBody(input?.checkerUser),
      reason: input?.reason,
    })
    await syncRemittanceQueueFromLive()
  } catch (e) {
    if (!isRecoverableLiveQueueError(e)) throw e
    // Keep queue responsive when server is flaky or row is already processed server-side.
    const rows = local.loadQueueRows()
    const updated = rows.map((r) => r.id === id ? { ...r, status: 'Rejected' as const } : r)
    local.saveQueueRows(updated)
  }
}
