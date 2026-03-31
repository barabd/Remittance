/**
 * Per-remittance audit events for Search & Tracking (browser persistence).
 */

import { nowTs } from '../lib/datetimeIds'

export const REMITTANCE_AUDIT_EVENT = 'remittanceAudit:changed'

const KEY = 'frms.remittanceAudit.v1'

export type RemittanceAuditEvent = {
  at: string
  actor: string
  action: string
  details?: string
}

type Bucket = Record<string, RemittanceAuditEvent[]>

function readAll(): Bucket {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const p = JSON.parse(raw) as Bucket
    return p && typeof p === 'object' ? p : {}
  } catch {
    return {}
  }
}

function writeAll(b: Bucket) {
  localStorage.setItem(KEY, JSON.stringify(b))
  window.dispatchEvent(new CustomEvent(REMITTANCE_AUDIT_EVENT))
}

export function loadRemittanceAudit(remittanceNo: string): RemittanceAuditEvent[] {
  const b = readAll()
  const list = b[remittanceNo]
  return Array.isArray(list) ? [...list] : []
}

export function appendRemittanceAudit(
  remittanceNo: string,
  event: Omit<RemittanceAuditEvent, 'at'> & { at?: string },
) {
  const b = readAll()
  const prev = Array.isArray(b[remittanceNo]) ? b[remittanceNo] : []
  const row: RemittanceAuditEvent = {
    at: event.at ?? nowTs(),
    actor: event.actor,
    action: event.action,
    details: event.details,
  }
  b[remittanceNo] = [...prev, row]
  writeAll(b)
}
