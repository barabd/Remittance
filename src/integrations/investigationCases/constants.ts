import type { CaseSource } from './types'

export const CASES_EVENT = 'cases:changed'

export const CASES_LS_KEY = 'frms.cases.v1'

export const CASE_SOURCES: readonly CaseSource[] = ['AML', 'Reconciliation', 'Operational'] as const

export const CASE_PRIORITIES = ['Low', 'Medium', 'High'] as const

export type CasePriority = (typeof CASE_PRIORITIES)[number]

export const CASE_STATUSES = ['Open', 'Investigating', 'Closed'] as const

/** Reference looks like a remittance number (drill-down to Search & Tracking). */
export function isRemittanceRef(ref: string | undefined): boolean {
  if (!ref?.trim()) return false
  const t = ref.trim()
  return /^REM-/i.test(t) || /^RMT-/i.test(t)
}
