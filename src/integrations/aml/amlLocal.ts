/**
 * Browser AML alert cache (mirrors `/compliance/alerts` when offline).
 */

import { AML_ALERTS_CHANGED_EVENT, AML_LS_KEY } from './constants'
import type { AmlAlertRow } from './types'

const SEED: AmlAlertRow[] = [
  {
    id: 'aml-seed-1',
    remittanceNo: 'REM-2026-000186',
    screenedAt: '2026-03-25 10:33',
    match: 'Possible',
    list: 'OFAC',
    score: 82,
    status: 'Open',
    subjectHint: 'Legacy seed',
  },
  {
    id: 'aml-seed-2',
    remittanceNo: 'REM-2026-000172',
    screenedAt: '2026-03-25 09:50',
    match: 'Possible',
    list: 'Local',
    score: 71,
    status: 'Investigating',
  },
  {
    id: 'aml-seed-3',
    remittanceNo: 'REM-2026-000160',
    screenedAt: '2026-03-25 09:05',
    match: 'None',
    list: 'OSFI',
    score: 0,
    status: 'Open',
  },
]

function readLs(): AmlAlertRow[] {
  try {
    const raw = localStorage.getItem(AML_LS_KEY)
    if (!raw) {
      localStorage.setItem(AML_LS_KEY, JSON.stringify(SEED))
      return [...SEED]
    }
    const parsed = JSON.parse(raw) as AmlAlertRow[]
    if (!Array.isArray(parsed) || parsed.length === 0) return [...SEED]
    return parsed
  } catch {
    return [...SEED]
  }
}

export function loadAmlAlerts(): AmlAlertRow[] {
  return readLs()
}

export function saveAmlAlerts(rows: AmlAlertRow[]) {
  localStorage.setItem(AML_LS_KEY, JSON.stringify(rows))
  window.dispatchEvent(new CustomEvent(AML_ALERTS_CHANGED_EVENT, { detail: { count: rows.length } }))
}
