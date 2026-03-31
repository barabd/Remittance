import { nextId, nowTs } from './mastersStore'

export type ReportRequestStatus =
  | 'Draft'
  | 'Generated'
  | 'Pending Approval'
  | 'Approved'
  | 'Rejected'

export type ReportRequestRow = {
  id: string
  reportName: string
  generatedAt: string
  periodFrom: string
  periodTo: string
  branchScope: string
  rowCount: number
  maker: string
  checker?: string
  status: ReportRequestStatus
}

export type ReportRequestAuditEvent = {
  at: string
  actor: string
  action: string
  details?: string
}

export const REPORT_REQUEST_EVENT = 'reportRequest:changed'

const K_REQ = 'frms.reportRequest.rows.v1'
const K_AUDIT = 'frms.reportRequest.audit.v1'

function emitChange() {
  window.dispatchEvent(new CustomEvent(REPORT_REQUEST_EVENT))
}

function seedRows(): ReportRequestRow[] {
  return [
    {
      id: 'RPT-2026-000001',
      reportName: 'Day Wise Total Summary',
      generatedAt: '2026-03-27 09:45',
      periodFrom: '2026-03-01',
      periodTo: '2026-03-27',
      branchScope: 'All branches',
      rowCount: 2,
      maker: 'Finance-01',
      checker: 'HO-Admin',
      status: 'Approved',
    },
    {
      id: 'RPT-2026-000002',
      reportName: 'Account Pay Remittance (Exchange House)',
      generatedAt: '2026-03-28 11:20',
      periodFrom: '2026-03-15',
      periodTo: '2026-03-28',
      branchScope: 'Head Office',
      rowCount: 2,
      maker: 'Finance-02',
      status: 'Pending Approval',
    },
  ]
}

function seedAudit(): Record<string, ReportRequestAuditEvent[]> {
  return {
    'RPT-2026-000001': [
      {
        at: '2026-03-27 09:45',
        actor: 'Finance-01',
        action: 'Generated report',
        details: 'Day Wise Total Summary · 2026-03-01 -> 2026-03-27',
      },
      {
        at: '2026-03-27 09:45',
        actor: 'System',
        action: 'Queued for maker-checker approval',
      },
      {
        at: '2026-03-27 10:05',
        actor: 'HO-Admin',
        action: 'Approved',
      },
    ],
    'RPT-2026-000002': [
      {
        at: '2026-03-28 11:20',
        actor: 'Finance-02',
        action: 'Generated report',
        details: 'Account Pay Remittance (Exchange House) · 2026-03-15 -> 2026-03-28',
      },
      {
        at: '2026-03-28 11:20',
        actor: 'System',
        action: 'Queued for maker-checker approval',
      },
    ],
  }
}

function readRows(): ReportRequestRow[] {
  try {
    const raw = localStorage.getItem(K_REQ)
    if (!raw) {
      const rows = seedRows()
      localStorage.setItem(K_REQ, JSON.stringify(rows))
      return rows
    }
    const parsed = JSON.parse(raw) as ReportRequestRow[]
    if (!Array.isArray(parsed)) return seedRows()
    return parsed
  } catch {
    return seedRows()
  }
}

function readAudit(): Record<string, ReportRequestAuditEvent[]> {
  try {
    const raw = localStorage.getItem(K_AUDIT)
    if (!raw) {
      const rows = seedAudit()
      localStorage.setItem(K_AUDIT, JSON.stringify(rows))
      return rows
    }
    const parsed = JSON.parse(raw) as Record<string, ReportRequestAuditEvent[]>
    if (parsed && typeof parsed === 'object') return parsed
    return seedAudit()
  } catch {
    return seedAudit()
  }
}

function writeRows(rows: ReportRequestRow[]) {
  localStorage.setItem(K_REQ, JSON.stringify(rows.slice(0, 600)))
  emitChange()
}

function writeAudit(audit: Record<string, ReportRequestAuditEvent[]>) {
  localStorage.setItem(K_AUDIT, JSON.stringify(audit))
  emitChange()
}

function appendAudit(reportId: string, event: ReportRequestAuditEvent) {
  const audit = readAudit()
  const events = audit[reportId] ?? []
  audit[reportId] = [...events, event]
  writeAudit(audit)
}

export function listReportRequests(): ReportRequestRow[] {
  return [...readRows()].sort((a, b) => `${b.generatedAt}-${b.id}`.localeCompare(`${a.generatedAt}-${a.id}`))
}

export function listReportRequestAudit(reportId: string): ReportRequestAuditEvent[] {
  return [...(readAudit()[reportId] ?? [])]
}

export function createReportRequest(input: {
  reportName: string
  periodFrom: string
  periodTo: string
  branchScope: string
  maker: string
  rowCount: number
}): ReportRequestRow {
  const row: ReportRequestRow = {
    id: nextId('RPT'),
    reportName: input.reportName,
    generatedAt: nowTs(),
    periodFrom: input.periodFrom,
    periodTo: input.periodTo,
    branchScope: input.branchScope,
    rowCount: input.rowCount,
    maker: input.maker,
    status: 'Pending Approval',
  }
  writeRows([row, ...readRows()])
  appendAudit(row.id, {
    at: nowTs(),
    actor: row.maker,
    action: 'Generated report',
    details: `${row.reportName} · ${row.periodFrom} -> ${row.periodTo}`,
  })
  appendAudit(row.id, {
    at: nowTs(),
    actor: 'System',
    action: 'Queued for maker-checker approval',
  })
  return row
}

export function approveReportRequest(reportId: string, checkerUser: string): ReportRequestRow {
  const rows = readRows()
  const idx = rows.findIndex((r) => r.id === reportId)
  if (idx < 0) throw new Error(`Report not found: ${reportId}`)
  const row = rows[idx]
  if (row.status !== 'Pending Approval') {
    throw new Error('Only pending reports can be approved')
  }
  if (row.maker.toLowerCase() === checkerUser.toLowerCase()) {
    throw new Error('Checker cannot be the same as maker')
  }
  const next: ReportRequestRow = {
    ...row,
    status: 'Approved',
    checker: checkerUser,
  }
  rows[idx] = next
  writeRows(rows)
  appendAudit(reportId, { at: nowTs(), actor: checkerUser, action: 'Approved' })
  return next
}

export function rejectReportRequest(reportId: string, checkerUser: string, reason?: string): ReportRequestRow {
  const rows = readRows()
  const idx = rows.findIndex((r) => r.id === reportId)
  if (idx < 0) throw new Error(`Report not found: ${reportId}`)
  const row = rows[idx]
  if (row.status !== 'Pending Approval') {
    throw new Error('Only pending reports can be rejected')
  }
  if (row.maker.toLowerCase() === checkerUser.toLowerCase()) {
    throw new Error('Checker cannot be the same as maker')
  }
  const next: ReportRequestRow = {
    ...row,
    status: 'Rejected',
    checker: checkerUser,
  }
  rows[idx] = next
  writeRows(rows)
  appendAudit(reportId, {
    at: nowTs(),
    actor: checkerUser,
    action: 'Rejected',
    details: reason?.trim() ? `Reason: ${reason.trim()}` : undefined,
  })
  return next
}
