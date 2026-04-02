export type BfiuReportType = 'CTR' | 'STR'

export type BfiuReport = {
  id: string
  remittanceNo: string
  reportType: BfiuReportType
  amountBdt: number
  reportedAt: string
  status: 'Pending' | 'Reported' | 'Internal Review'
  reason?: string
}

export const BFIU_REPORT_CHANGED_EVENT = 'bfiuReport:changed'

const BFIU_STORAGE_KEY = 'bfiu_reports_v1'

const MOCK_REPORTS: BfiuReport[] = [
  {
    id: 'BFIU-001',
    remittanceNo: 'REM-992211',
    reportType: 'CTR',
    amountBdt: 1250000,
    reportedAt: '2026-03-28T14:22:00Z',
    status: 'Reported',
    reason: 'Remittance amount exceeds 1,000,000 BDT cash threshold.',
  },
  {
    id: 'BFIU-002',
    remittanceNo: 'REM-883344',
    reportType: 'STR',
    amountBdt: 450000,
    reportedAt: '2026-03-30T10:15:00Z',
    status: 'Internal Review',
    reason: 'Structuring pattern detected (many-to-one).',
  },
  {
    id: 'BFIU-003',
    remittanceNo: 'REM-775566',
    reportType: 'STR',
    amountBdt: 890000,
    reportedAt: '2026-04-01T16:45:00Z',
    status: 'Pending',
    reason: 'OFAC/UN Sanctions keyword hit.',
  },
]

export function loadBfiuReports(): BfiuReport[] {
  const stored = localStorage.getItem(BFIU_STORAGE_KEY)
  if (!stored) return MOCK_REPORTS
  try {
    return JSON.parse(stored) as BfiuReport[]
  } catch {
    return MOCK_REPORTS
  }
}

export function saveBfiuReports(reports: BfiuReport[]) {
  localStorage.setItem(BFIU_STORAGE_KEY, JSON.stringify(reports))
  window.dispatchEvent(new CustomEvent(BFIU_REPORT_CHANGED_EVENT))
}

export function appendBfiuReport(report: Omit<BfiuReport, 'id' | 'reportedAt' | 'status'>) {
  const reports = loadBfiuReports()
  const next: BfiuReport = {
    ...report,
    id: `BFIU-${String(reports.length + 1).padStart(3, '0')}`,
    reportedAt: new Date().toISOString(),
    status: 'Pending',
  }
  saveBfiuReports([next, ...reports])
}

export function updateBfiuReportStatus(id: string, status: BfiuReport['status']) {
  const reports = loadBfiuReports()
  const idx = reports.findIndex((r) => r.id === id)
  if (idx !== -1) {
    reports[idx].status = status
    saveBfiuReports([...reports])
  }
}
