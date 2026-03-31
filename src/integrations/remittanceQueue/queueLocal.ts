/**
 * Browser cache for items awaiting maker–checker decision (mirrors GET /remittances/queue).
 */

import { REMITTANCE_QUEUE_EVENT, REMITTANCE_QUEUE_LS_KEY } from './constants'
import type { RemittanceQueueRow } from './types'

const SEED: RemittanceQueueRow[] = [
  {
    id: '1',
    remittanceNo: 'REM-2026-000185',
    createdAt: '2026-03-25 10:22',
    corridor: 'AED → BDT',
    amount: '4,000.00 AED',
    maker: 'Sub-Branch-03',
    payType: 'Cash',
    exchangeHouse: 'EH-RUH-02',
    status: 'Pending Approval',
  },
  {
    id: '2',
    remittanceNo: 'REM-2026-000186',
    createdAt: '2026-03-25 10:33',
    corridor: 'SAR → BDT',
    amount: '1,200.00 SAR',
    maker: 'Branch-02',
    payType: 'Account pay',
    exchangeHouse: 'EH-GULF-01',
    status: 'On Hold',
  },
]

function read(): RemittanceQueueRow[] {
  try {
    const raw = localStorage.getItem(REMITTANCE_QUEUE_LS_KEY)
    if (!raw) {
      localStorage.setItem(REMITTANCE_QUEUE_LS_KEY, JSON.stringify(SEED))
      return [...SEED]
    }
    const p = JSON.parse(raw) as RemittanceQueueRow[]
    return Array.isArray(p) && p.length > 0 ? p : [...SEED]
  } catch {
    return [...SEED]
  }
}

function save(rows: RemittanceQueueRow[]) {
  localStorage.setItem(REMITTANCE_QUEUE_LS_KEY, JSON.stringify(rows.slice(0, 500)))
  window.dispatchEvent(new CustomEvent(REMITTANCE_QUEUE_EVENT))
}

export function loadQueueRows(): RemittanceQueueRow[] {
  return read()
}

export function saveQueueRows(rows: RemittanceQueueRow[]) {
  save(rows)
}
