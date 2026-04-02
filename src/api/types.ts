/**
 * API DTOs aligned with docs/API_CONTRACT.md.
 * Reuses shapes already used in the UI; extend when the backend diverges.
 */

export type {
  BeneficiaryRecord,
  AgentRecord,
  CoverFundRecord,
  MasterApprovalStatus,
} from '../integrations/masters/types'

/** GET `/beneficiaries/:id/audit` */
export type BeneficiaryAuditEventDto = {
  at: string
  actor: string
  action: string
  details?: string
}

/** GET `/agents/:id/audit` — A.1.4 #9 exchange houses / correspondents */
export type AgentAuditEventDto = {
  at: string
  actor: string
  action: string
  details?: string
}

export type Page<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export type ReportRequestStatus =
  | 'Draft'
  | 'Generated'
  | 'Pending Approval'
  | 'Approved'
  | 'Rejected'

export type ReportRequestDto = {
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

export type ReportRequestAuditEventDto = {
  at: string
  actor: string
  action: string
  details?: string
}

export type ApiErrorBody = {
  code?: string
  message?: string
  /** Spring ProblemDetail / RFC 7807 style */
  detail?: string
  title?: string
  details?: unknown
  /** Spring generic error response */
  error?: string
  /** Spring error path */
  path?: string
  timestamp?: string
  status?: number
}

/** Remittance (search / tracking) — mirror `RemittanceSearchPage` row shape. */
export type RemittanceDto = {
  id: string
  remittanceNo: string
  createdAt: string
  corridor: string
  amount: string
  remitter: string
  beneficiary: string
  maker: string
  checker?: string
  status: string
  channel: string
  photoIdType?: string
  photoIdRef?: string
  exchangeHouse?: string
  remitterPartyId?: string
  beneficiaryPartyId?: string
  moneyReceiptNo?: string
}

/** A.1.3 Exchange House single-entry — server `frms_eh_entry_sequence`. */
export type EhEntryIdsDto = {
  remitterId: string
  beneficiaryId: string
  remittanceNo: string
  moneyReceiptNo: string
}

export type SingleEntrySubmitResponse = {
  record: RemittanceDto
  nextIds: EhEntryIdsDto
}

/** GET/PATCH `/exchange-house/blocked-remittances` — A.1.3 stop-payment register */
export type BlockedRemittanceDto = {
  id: string
  remittanceNo: string
  remitter: string
  beneficiary: string
  corridor: string
  amount: string
  blockedAt: string
  branch?: string
  note?: string
  remittanceRecordId?: string
}

/** Server MLA row — GET/PATCH `/compliance/mla-settings`. */
export type MlaSettingsDto = {
  screeningMode?: 'keywords' | 'mock_vendor_api'
  requirePhotoId: boolean
  maxRemittancesPerRemitterPerDay: number
  maxBdtTotalPerRemitterPerDay: number
  patternOneToManyMin: number
  patternManyToOneMin: number
  blockApprovalOnBusinessTerm: boolean
  blockApprovalOnPattern: boolean
  blockApprovalOnPrimaryAmlHit: boolean
  blockApprovalOnOpacDsriHit: boolean
  autoScreenOnSearchImport: boolean
  countryKeywordsJson: string
}

export type RiskControlProfileDto = {
  id: string
  customerName: string
  maxPerTxnBdt: number
  maxDailyTotalBdt: number
  watchLevel: 'Low' | 'Medium' | 'High'
  updatedAt: string
}

export type DisbursementDto = {
  id: string
  remittanceNo: string
  createdAt: string
  corridor: string
  channel: string
  payoutTo: string
  payoutRef?: string
  beneficiary: string
  amountBDT: string
  maker: string
  checker?: string
  status: string
  /** #37 — Branch | Sub-Branch */
  originatingUnit?: string
}

export type DisbursementAuditEventDto = {
  at: string
  actor: string
  action: string
  details?: string
}

/** Approvals queue — A.1.4 #1–#2; `src/integrations/remittanceQueue` + `/remittances/queue`. */
export type QueueItemDto = {
  id: string
  remittanceNo: string
  createdAt: string
  corridor: string
  amount: string
  maker: string
  payType: string
  exchangeHouse: string
  status: string
  checker?: string
  approvedAt?: string
  rejectReason?: string
}

/** Investigation cases — `src/integrations/investigationCases` + `/investigation-cases`. */
/** Bulk hub preview audit — `src/integrations/bulkDataHub` + `/bulk-hub/events`. */
export type BulkHubEventDto = {
  id: string
  target: string
  fileName: string
  rowCount: number
  columnCount: number
  sheetName?: string
  recordedAt: string
}

export type BeftnAckFileDto = {
  id: string
  fileName: string
  uploadedAt: string
  uploader?: string
  rowCount: number
  status: string
  appliedAt?: string
  summaryJson?: string
}

export type BeftnAckRowDto = {
  id: string
  ackFileId: string
  lineNo: number
  batchRef?: string
  txnRef?: string
  remittanceNo?: string
  amountBdt?: string
  ackStatus?: string
  valueDate?: string
  rawLine: string
  parseStatus: string
  parseMessage?: string
  matchedDisbursementId?: string
}

export type BeftnAckApplyResultDto = {
  fileId: string
  status: string
  appliedAt?: string
  appliedCount: number
  failedCount: number
  unmatchedCount: number
  ignoredCount: number
  conflictCount: number
  totalRows: number
}

export type BeftnAckProfileDto = {
  id: string
  template: Record<string, string[]>
}

export type InvestigationCaseDto = {
  id: string
  title: string
  source: string
  ref?: string
  subject?: string
  priority: string
  status: string
  assignee: string
  createdAt: string
  notes: { at: string; by: string; text: string }[]
}

/** Settlement / regulatory — `src/integrations/settlementRegulatory` + `/settlement/*`, `/regulatory/packages`. */
export type SettlementWeekStatDto = {
  day: string
  grossInBdt: number
  netSettlementBdt: number
  bilateralAdjustments: number
}

export type SettlementBilateralPositionDto = {
  id: string
  counterparty: string
  corridor: string
  netPositionBdt: number
  asOf: string
  multilateralBucket: string
}

export type RegulatoryPackageDto = {
  id: string
  kind: string
  title: string
  period: string
  summary: string
  status: string
  destination: string
  createdAt: string
}

export type AmlAlertDto = {
  id: string
  remittanceNo: string
  screenedAt: string
  match: 'None' | 'Possible'
  list: 'OFAC' | 'Local' | 'OSFI' | 'VendorAPI' | 'OPAC' | 'DSRI' | 'UN' | 'BFIU'
  score: number
  status: 'Open' | 'Investigating' | 'Resolved' | 'False Positive'
  subjectHint?: string
}

export type ScreenPartiesRequest = {
  remittanceNo: string
  remitter: string
  beneficiary: string
}

export type ScreenPartiesResponse = {
  alert: AmlAlertDto | null
}

export type DashboardMetricsDto = {
  worklistRowTotal: number
  pendingApprovalsTotal: number
  amlOpenHits: number
  masterDataPending: number
  reconExceptions?: number
}

export type ReconciliationExceptionDto = {
  id: string
  ref: string
  source: string
  detectedAt: string
  amount: string
  reason: string
  status: 'Open' | 'Resolved'
  slabId?: string
}

export type ReconciliationSlabDto = {
  id: string
  channel: string
  slabLabel: string
  amountFrom: string
  amountTo: string
  expectedCredits: number
  matchedCredits: number
  variance: string
  status: 'Balanced' | 'Review'
}
