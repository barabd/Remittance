/** Blocked / stop-payment remittances (local demo; sync with Java/APEX backend later). */

import { nextId } from './mastersStore'

export type BlockedRemittanceEntry = {
  id: string
  remittanceNo: string
  remitter: string
  beneficiary: string
  corridor: string
  amount: string
  blockedAt: string
  branch?: string
  note?: string
}

const KEY = 'frms.blockedRemittances.v1'
export const BLOCKED_REMITTANCES_EVENT = 'blockedRemittances:changed'

const seed: BlockedRemittanceEntry[] = [
  {
    id: 'BLK-SEED-1',
    remittanceNo: 'REM-2026-000140',
    remitter: 'Demo Sender Ltd',
    beneficiary: 'Pending KYC User',
    corridor: 'GBP → BDT',
    amount: '1,200.00 GBP',
    blockedAt: '2026-03-24 11:20',
    branch: 'Head Office',
    note: 'Compliance hold — awaiting docs',
  },
]

function read(): BlockedRemittanceEntry[] {
  try {
    const s = localStorage.getItem(KEY)
    if (!s) {
      localStorage.setItem(KEY, JSON.stringify(seed))
      return [...seed]
    }
    const parsed = JSON.parse(s) as BlockedRemittanceEntry[]
    return Array.isArray(parsed) ? parsed : [...seed]
  } catch {
    return [...seed]
  }
}

function write(rows: BlockedRemittanceEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(rows))
  window.dispatchEvent(new CustomEvent(BLOCKED_REMITTANCES_EVENT))
}

export function listBlockedRemittances(): BlockedRemittanceEntry[] {
  return read()
}

export function upsertBlockedRemittance(
  row: Omit<BlockedRemittanceEntry, 'id' | 'blockedAt'> & { id?: string; blockedAt?: string },
) {
  const rows = read()
  const blockedAt = row.blockedAt ?? new Date().toISOString().slice(0, 19).replace('T', ' ')
  const id = row.id ?? nextId('BLK')
  const entry: BlockedRemittanceEntry = {
    id,
    remittanceNo: row.remittanceNo,
    remitter: row.remitter,
    beneficiary: row.beneficiary,
    corridor: row.corridor,
    amount: row.amount,
    blockedAt,
    branch: row.branch,
    note: row.note,
  }
  const idx = rows.findIndex((r) => r.remittanceNo === entry.remittanceNo)
  if (idx >= 0) {
    rows[idx] = { ...rows[idx], ...entry, id: rows[idx].id }
  } else {
    rows.unshift(entry)
  }
  write(rows)
}

export function updateBlockedNote(id: string, note: string) {
  const rows = read().map((r) => (r.id === id ? { ...r, note } : r))
  write(rows)
}

export function removeBlockedRemittance(id: string) {
  write(read().filter((r) => r.id !== id))
}
