/**
 * Live HTTP client — implements docs/API_CONTRACT.md against a real backend.
 * Import these from pages when `useLiveApi()` is true; until then keep using stores.
 * Operations hub (#15–#18): `integrations/operationsHub` + `operationsHubClient.ts` + `server/frms-ops-api`.
 */

import { apiDelete, apiGet, apiPatch, apiPost } from '../http'
import type {
  AgentAuditEventDto,
  AgentRecord,
  AmlAlertDto,
  BeneficiaryAuditEventDto,
  BeneficiaryRecord,
  BlockedRemittanceDto,
  BulkHubEventDto,
  BeftnAckApplyResultDto,
  BeftnAckFileDto,
  BeftnAckProfileDto,
  BeftnAckRowDto,
  ComplianceRulesReadinessDto,
  CoverFundRecord,
  DashboardMetricsDto,
  DisbursementAuditEventDto,
  DisbursementDto,
  InvestigationCaseDto,
  MlaSettingsDto,
  RiskControlProfileDto,
  Page,
  QueueItemDto,
  ReconciliationExceptionDto,
  ReconciliationSlabDto,
  ReportRequestAuditEventDto,
  ReportRequestDto,
  RegulatoryPackageDto,
  EhEntryIdsDto,
  RemittanceDto,
  ScreenPartiesRequest,
  SingleEntrySubmitResponse,
  ScreenPartiesResponse,
  SettlementBilateralPositionDto,
  SettlementWeekStatDto,
} from '../types'

/** --- Beneficiaries --- */

export function liveListBeneficiaries(query?: string) {
  const q = query ? `?${new URLSearchParams({ q: query })}` : ''
  return apiGet<Page<BeneficiaryRecord>>(`/beneficiaries${q}`)
}

export function liveCreateBeneficiary(body: Omit<BeneficiaryRecord, 'id' | 'checker'>) {
  return apiPost<BeneficiaryRecord>('/beneficiaries', body as unknown as Record<string, unknown>)
}

export function livePatchBeneficiary(id: string, patch: Partial<BeneficiaryRecord>) {
  return apiPatch<BeneficiaryRecord>(`/beneficiaries/${encodeURIComponent(id)}`, patch as Record<string, unknown>)
}

export function liveGetBeneficiaryAudit(id: string) {
  return apiGet<{ events: BeneficiaryAuditEventDto[] }>(
    `/beneficiaries/${encodeURIComponent(id)}/audit`,
  )
}

export function liveApproveBeneficiary(id: string, body?: { checkerUser?: string }) {
  return apiPost<BeneficiaryRecord>(
    `/beneficiaries/${encodeURIComponent(id)}/approve`,
    (body ?? {}) as Record<string, unknown>,
  )
}

export function liveRejectBeneficiary(id: string, body?: { checkerUser?: string; reason?: string }) {
  return apiPost<BeneficiaryRecord>(
    `/beneficiaries/${encodeURIComponent(id)}/reject`,
    (body ?? {}) as Record<string, unknown>,
  )
}

/** --- Agents --- */

export function liveListAgents(query?: string) {
  const q = query ? `?${new URLSearchParams({ q: query })}` : ''
  return apiGet<Page<AgentRecord>>(`/agents${q}`)
}

export function liveGetAgentAudit(id: string) {
  return apiGet<{ events: AgentAuditEventDto[] }>(`/agents/${encodeURIComponent(id)}/audit`)
}

export function liveCreateAgent(body: Omit<AgentRecord, 'id' | 'checker'>) {
  return apiPost<AgentRecord>('/agents', body as unknown as Record<string, unknown>)
}

export function livePatchAgent(id: string, patch: Partial<AgentRecord>) {
  return apiPatch<AgentRecord>(`/agents/${encodeURIComponent(id)}`, patch as Record<string, unknown>)
}

export function liveApproveAgent(id: string, body?: { checkerUser?: string }) {
  return apiPost<AgentRecord>(
    `/agents/${encodeURIComponent(id)}/approve`,
    (body ?? {}) as Record<string, unknown>,
  )
}

export function liveRejectAgent(id: string, body?: { checkerUser?: string; reason?: string }) {
  return apiPost<AgentRecord>(
    `/agents/${encodeURIComponent(id)}/reject`,
    (body ?? {}) as Record<string, unknown>,
  )
}

/** --- Cover funds --- */

export function liveListCoverFunds() {
  return apiGet<Page<CoverFundRecord>>('/cover-funds')
}

export function liveCreateCoverFund(body: Omit<CoverFundRecord, 'id' | 'checker'>) {
  return apiPost<CoverFundRecord>('/cover-funds', body as unknown as Record<string, unknown>)
}

export function livePatchCoverFund(id: string, patch: Partial<CoverFundRecord>) {
  return apiPatch<CoverFundRecord>(`/cover-funds/${encodeURIComponent(id)}`, patch as Record<string, unknown>)
}

export function liveApproveCoverFund(id: string) {
  return apiPost<CoverFundRecord>(`/cover-funds/${encodeURIComponent(id)}/approve`, {})
}

/** --- Remittances --- */

export function liveListRemittances(params: Record<string, string>) {
  const q = `?${new URLSearchParams(params)}`
  return apiGet<Page<RemittanceDto>>(`/remittances/records${q}`)
}

/** Approvals queue item (not full remittance tracking). */
export function liveApproveRemittance(id: string, body?: { checkerUser?: string }) {
  return apiPost<QueueItemDto>(
    `/remittances/${encodeURIComponent(id)}/approve`,
    (body ?? {}) as Record<string, unknown>,
  )
}

/** Search & Tracking — server MLA gates on approve. */
export function liveApproveRemittanceRecord(id: string, body?: { checkerUser?: string }) {
  return apiPost<RemittanceDto>(
    `/remittances/records/${encodeURIComponent(id)}/approve`,
    (body ?? {}) as Record<string, unknown>,
  )
}

export function livePatchRemittanceRecord(id: string, patch: Record<string, unknown>) {
  return apiPatch<RemittanceDto>(
    `/remittances/records/${encodeURIComponent(id)}`,
    patch as Record<string, unknown>,
  )
}

export function liveGetRemittanceAudit(id: string) {
  return apiGet<{ events: any[] }>(`/remittances/records/${encodeURIComponent(id)}/audit`)
}

/** A.1.3 — next IDs without consuming sequence (form open). */
export function livePeekSingleEntryIds() {
  return apiGet<{ nextIds: EhEntryIdsDto }>('/remittances/single-entry/id-preview')
}

/** A.1.3 — consume one sequence step (“New IDs only”). */
export function liveReserveSingleEntryIds() {
  return apiPost<{ nextIds: EhEntryIdsDto }>('/remittances/single-entry/reserve-ids', {})
}

/** A.1.3 — persist remittance with server MLA gates; returns saved row + peeked next IDs. */
export function liveSubmitSingleEntry(body: Record<string, unknown>) {
  return apiPost<SingleEntrySubmitResponse>('/remittances/single-entry', body)
}

/** --- Block remittance reports (A.1.3) --- */

export function liveListBlockedRemittances(params?: Record<string, string>) {
  const q =
    params && Object.keys(params).length > 0 ? `?${new URLSearchParams(params)}` : ''
  return apiGet<Page<BlockedRemittanceDto>>(`/exchange-house/blocked-remittances${q}`)
}

export function livePatchBlockedRemittance(id: string, patch: { note?: string }) {
  return apiPatch<BlockedRemittanceDto>(
    `/exchange-house/blocked-remittances/${encodeURIComponent(id)}`,
    patch as Record<string, unknown>,
  )
}

export function liveDeleteBlockedRemittance(id: string) {
  return apiDelete(`/exchange-house/blocked-remittances/${encodeURIComponent(id)}`)
}

export function liveGetMlaSettings() {
  return apiGet<MlaSettingsDto>('/compliance/mla-settings')
}

export function livePatchMlaSettings(patch: Partial<MlaSettingsDto>) {
  return apiPatch<MlaSettingsDto>('/compliance/mla-settings', patch as Record<string, unknown>)
}

export function liveListRiskControls(query?: string) {
  const q = query ? `?${new URLSearchParams({ q: query })}` : ''
  return apiGet<Page<RiskControlProfileDto>>(`/compliance/risk-controls${q}`)
}

export function liveCreateRiskControl(
  body: Omit<RiskControlProfileDto, 'id' | 'updatedAt'>,
) {
  return apiPost<RiskControlProfileDto>('/compliance/risk-controls', body as unknown as Record<string, unknown>)
}

export function livePatchRiskControl(id: string, patch: Partial<RiskControlProfileDto>) {
  return apiPatch<RiskControlProfileDto>(
    `/compliance/risk-controls/${encodeURIComponent(id)}`,
    patch as Record<string, unknown>,
  )
}

export function liveDeleteRiskControl(id: string) {
  return apiDelete(`/compliance/risk-controls/${encodeURIComponent(id)}`)
}

export function liveRejectRemittance(id: string, body?: { checkerUser?: string; reason?: string }) {
  return apiPost<QueueItemDto>(
    `/remittances/${encodeURIComponent(id)}/reject`,
    (body ?? {}) as Record<string, unknown>,
  )
}

/** --- Queue --- */

export function liveListQueue() {
  return apiGet<Page<QueueItemDto>>('/remittances/queue')
}

/** --- Disbursements --- */

export function liveListDisbursements(params?: Record<string, string>) {
  const q =
    params && Object.keys(params).length > 0 ? `?${new URLSearchParams(params)}` : ''
  return apiGet<Page<DisbursementDto>>(`/disbursements${q}`)
}

export function liveGetDisbursementAudit(id: string) {
  return apiGet<{ events: DisbursementAuditEventDto[] }>(
    `/disbursements/${encodeURIComponent(id)}/audit`,
  )
}

export function liveApproveDisbursement(id: string, body?: { checkerUser?: string }) {
  return apiPost<DisbursementDto>(
    `/disbursements/${encodeURIComponent(id)}/approve`,
    (body ?? {}) as Record<string, unknown>,
  )
}

export function liveRejectDisbursement(id: string, body?: { checkerUser?: string; reason?: string }) {
  return apiPost<DisbursementDto>(
    `/disbursements/${encodeURIComponent(id)}/reject`,
    (body ?? {}) as Record<string, unknown>,
  )
}

export function livePatchDisbursement(id: string, patch: Record<string, unknown>) {
  return apiPatch<DisbursementDto>(
    `/disbursements/${encodeURIComponent(id)}`,
    patch as Record<string, unknown>,
  )
}

export function liveMarkDisbursed(id: string, body?: { payoutRef?: string }) {
  return apiPost<DisbursementDto>(
    `/disbursements/${encodeURIComponent(id)}/mark-disbursed`,
    (body ?? {}) as Record<string, unknown>,
  )
}

/** --- AML --- */

export function liveScreenParties(body: ScreenPartiesRequest) {
  return apiPost<ScreenPartiesResponse>('/compliance/screen', body as unknown as Record<string, unknown>)
}

export function liveListAmlAlerts() {
  return apiGet<Page<AmlAlertDto>>('/compliance/alerts')
}

export function liveCreateAmlAlert(body: AmlAlertDto) {
  return apiPost<AmlAlertDto>('/compliance/alerts', body as unknown as Record<string, unknown>)
}

export function livePatchAmlAlert(id: string, patch: Partial<AmlAlertDto>) {
  return apiPatch<AmlAlertDto>(`/compliance/alerts/${encodeURIComponent(id)}`, patch as Record<string, unknown>)
}

/** --- Investigation cases --- */

export function liveListInvestigationCases() {
  return apiGet<Page<InvestigationCaseDto>>('/investigation-cases')
}

export function liveCreateInvestigationCase(
  body: Record<string, string | undefined>,
) {
  return apiPost<InvestigationCaseDto>('/investigation-cases', body as Record<string, unknown>)
}

export function livePatchInvestigationCase(id: string, patch: Partial<InvestigationCaseDto>) {
  return apiPatch<InvestigationCaseDto>(
    `/investigation-cases/${encodeURIComponent(id)}`,
    patch as Record<string, unknown>,
  )
}

export function liveAddInvestigationCaseNote(id: string, body: { by: string; text: string }) {
  return apiPost<InvestigationCaseDto>(
    `/investigation-cases/${encodeURIComponent(id)}/notes`,
    body as Record<string, unknown>,
  )
}

/** --- Bulk data hub (preview audit) --- */

export function liveListBulkHubEvents() {
  return apiGet<Page<BulkHubEventDto>>('/bulk-hub/events')
}

export function livePostBulkHubEvent(body: Record<string, string | number | undefined>) {
  return apiPost<BulkHubEventDto>('/bulk-hub/events', body as Record<string, unknown>)
}

/** --- BEFTN acknowledgment processing (A.1.3) --- */

export function liveListBeftnAckFiles() {
  return apiGet<Page<BeftnAckFileDto>>('/exchange-house/beftn-acks')
}

export function liveListBeftnAckProfiles() {
  return apiGet<Page<BeftnAckProfileDto>>('/exchange-house/beftn-acks/profiles')
}

export function liveParseBeftnAckFile(body: {
  fileName: string
  rawText: string
  uploader?: string
  profile?: string
  strictHeader?: boolean
}) {
  return apiPost<{ file: BeftnAckFileDto; rows: BeftnAckRowDto[] }>(
    '/exchange-house/beftn-acks/parse',
    body as unknown as Record<string, unknown>,
  )
}

export function liveListBeftnAckRows(fileId: string, params?: Record<string, string>) {
  const q = params && Object.keys(params).length > 0 ? `?${new URLSearchParams(params)}` : ''
  return apiGet<Page<BeftnAckRowDto>>(`/exchange-house/beftn-acks/${encodeURIComponent(fileId)}/rows${q}`)
}

export function liveApplyBeftnAckFile(fileId: string) {
  return apiPost<BeftnAckApplyResultDto>(
    `/exchange-house/beftn-acks/${encodeURIComponent(fileId)}/apply`,
    {},
  )
}

/** --- Settlement & regulatory (#31 / #32) --- */

export function liveListSettlementWeekStats() {
  return apiGet<Page<SettlementWeekStatDto>>('/settlement/week-stats')
}

export function liveListSettlementBilateralPositions() {
  return apiGet<Page<SettlementBilateralPositionDto>>('/settlement/bilateral-positions')
}

export function liveListRegulatoryPackages() {
  return apiGet<Page<RegulatoryPackageDto>>('/regulatory/packages')
}

export function liveCreateRegulatoryPackage(body: Record<string, string | undefined>) {
  return apiPost<RegulatoryPackageDto>('/regulatory/packages', body as Record<string, unknown>)
}

export function liveAdvanceRegulatoryPackage(id: string) {
  return apiPatch<RegulatoryPackageDto>(
    `/regulatory/packages/${encodeURIComponent(id)}/advance`,
    {},
  )
}


/** --- Reconciliation --- */

export function liveListReconciliationExceptions(params?: Record<string, string>) {
  const q =
    params && Object.keys(params).length > 0 ? `?${new URLSearchParams(params)}` : ''
  return apiGet<Page<ReconciliationExceptionDto>>(`/reconciliation/exceptions${q}`)
}

export function liveResolveReconciliationException(id: string) {
  return apiPost<ReconciliationExceptionDto>(
    `/reconciliation/exceptions/${encodeURIComponent(id)}/resolve`,
    {},
  )
}

export function liveListReconciliationSlabs() {
  return apiGet<Page<ReconciliationSlabDto>>('/reconciliation/slabs')
}

/** --- Reports --- */

export function liveListReportRequests() {
  return apiGet<Page<ReportRequestDto>>('/reports')
}

export function liveGetReportRequestAudit(id: string) {
  return apiGet<{ events: ReportRequestAuditEventDto[] }>(`/reports/${encodeURIComponent(id)}/audit`)
}

export function liveCreateReportRequest(body: {
  reportName: string
  periodFrom: string
  periodTo: string
  branchScope: string
  maker: string
  rowCount: number
}) {
  return apiPost<ReportRequestDto>('/reports', body as unknown as Record<string, unknown>)
}

export function liveApproveReportRequest(id: string, body?: { checkerUser?: string }) {
  return apiPost<ReportRequestDto>(
    `/reports/${encodeURIComponent(id)}/approve`,
    (body ?? {}) as Record<string, unknown>,
  )
}

export function liveRejectReportRequest(id: string, body?: { checkerUser?: string; reason?: string }) {
  return apiPost<ReportRequestDto>(
    `/reports/${encodeURIComponent(id)}/reject`,
    (body ?? {}) as Record<string, unknown>,
  )
}

/** --- GL vouchers --- */

export function liveListGlVouchers() {
  return apiGet<Page<Record<string, unknown>>>('/finance/gl-vouchers')
}

export function liveCreateGlVoucher(body: Record<string, unknown>) {
  return apiPost<Record<string, unknown>>('/finance/gl-vouchers', body)
}

export function liveSubmitGlVoucher(id: string) {
  return apiPost<Record<string, unknown>>(`/finance/gl-vouchers/${encodeURIComponent(id)}/submit`, {})
}

export function liveApproveGlVoucher(id: string) {
  return apiPost<Record<string, unknown>>(`/finance/gl-vouchers/${encodeURIComponent(id)}/approve`, {})
}

export function liveRejectGlVoucher(id: string) {
  return apiPost<Record<string, unknown>>(`/finance/gl-vouchers/${encodeURIComponent(id)}/reject`, {})
}

export function livePostGlVoucher(id: string) {
  return apiPost<Record<string, unknown>>(`/finance/gl-vouchers/${encodeURIComponent(id)}/post`, {})
}

export function liveHoldGlVoucher(id: string) {
  return apiPost<Record<string, unknown>>(`/finance/gl-vouchers/${encodeURIComponent(id)}/hold`, {})
}

export function liveGetGlVoucherAudit(id: string) {
  return apiGet<{ events: Record<string, unknown>[] }>(`/finance/gl-vouchers/${encodeURIComponent(id)}/audit`)
}

/** --- Pricing --- */

export function liveListCommissions() {
  return apiGet<Page<Record<string, unknown>>>('/pricing/commissions')
}

export function liveCreateCommission(body: Record<string, unknown>) {
  return apiPost<Record<string, unknown>>('/pricing/commissions', body)
}

export function liveDeleteCommission(id: string) {
  return apiDelete(`/pricing/commissions/${encodeURIComponent(id)}`)
}

export function liveListFxRanges() {
  return apiGet<Page<Record<string, unknown>>>('/pricing/fx-ranges')
}

export function liveCreateFxRange(body: Record<string, unknown>) {
  return apiPost<Record<string, unknown>>('/pricing/fx-ranges', body)
}

export function liveDeleteFxRange(id: string) {
  return apiDelete(`/pricing/fx-ranges/${encodeURIComponent(id)}`)
}

export function liveListBankFx() {
  return apiGet<Page<Record<string, unknown>>>('/pricing/bank-fx')
}

export function liveCreateBankFx(body: Record<string, unknown>) {
  return apiPost<Record<string, unknown>>('/pricing/bank-fx', body)
}

export function liveDeleteBankFx(id: string) {
  return apiDelete(`/pricing/bank-fx/${encodeURIComponent(id)}`)
}

/** --- Corporate file mapping --- */

export function liveListCorporateMappingProfiles() {
  return apiGet<Page<Record<string, unknown>>>('/corporate/mapping-profiles')
}

export function liveUpsertCorporateMappingProfile(body: Record<string, unknown>) {
  return apiPost<Record<string, unknown>>('/corporate/mapping-profiles', body)
}

export function liveDeleteCorporateMappingProfile(id: string) {
  return apiDelete(`/corporate/mapping-profiles/${encodeURIComponent(id)}`)
}

export function liveGetCorporateMappingDefaults() {
  return apiGet<Record<string, unknown>>('/corporate/mapping-defaults')
}

export function livePatchCorporateMappingDefaults(body: Record<string, unknown>) {
  return apiPatch<Record<string, unknown>>('/corporate/mapping-defaults', body)
}

export function liveListCorporateIncentiveTiers() {
  return apiGet<Page<Record<string, unknown>>>('/corporate/incentive-tiers')
}

export function liveReplaceCorporateIncentiveTiers(body: Record<string, unknown>[]) {
  return apiPost<Record<string, unknown>[]>('/corporate/incentive-tiers', { tiers: body } as unknown as Record<string, unknown>)
}

/** --- Security utilities --- */

export function liveComputeLuhnCheckDigit(payload: string) {
  return apiPost<{ checkDigit: number; fullReference: string; valid: boolean }>(
    '/security/utilities/luhn/check-digit',
    { payload } as Record<string, unknown>,
  )
}

export function liveValidateLuhnReference(reference: string) {
  return apiPost<{ valid: boolean; reference: string }>(
    '/security/utilities/luhn/validate',
    { reference } as Record<string, unknown>,
  )
}

export function liveListSecurityUtilityEvents() {
  return apiGet<Page<Record<string, unknown>>>('/security/utilities/events')
}

/** --- VAPT findings --- */

export function liveListVaptFindings() {
  return apiGet<Page<Record<string, unknown>>>('/security/vapt/findings')
}

export function liveCreateVaptFinding(body: Record<string, unknown>) {
  return apiPost<Record<string, unknown>>('/security/vapt/findings', body)
}

export function livePatchVaptFinding(id: string, body: Record<string, unknown>) {
  return apiPatch<Record<string, unknown>>(`/security/vapt/findings/${encodeURIComponent(id)}`, body)
}

export function liveDeleteVaptFinding(id: string) {
  return apiDelete(`/security/vapt/findings/${encodeURIComponent(id)}`)
}

/** --- Compliance rules readiness --- */

export function liveGetComplianceRulesReadiness() {
  return apiGet<ComplianceRulesReadinessDto>('/compliance/rules-readiness')
}

/** --- Incentive distribution --- */

export function liveListIncentiveDistributionBatches() {
  return apiGet<Page<Record<string, unknown>>>('/finance/incentive-distribution/batches')
}

export function liveAdvanceIncentiveDistributionBatch(id: string) {
  return apiPost<Record<string, unknown>>(`/finance/incentive-distribution/batches/${encodeURIComponent(id)}/advance`, {})
}

export function liveAccrueIncentiveDistributionBatch(body: Record<string, unknown>) {
  return apiPost<Record<string, unknown>>('/finance/incentive-distribution/batches/accrue', body)
}

/** --- Cover fund audit --- */

export function liveGetCoverFundAudit(id: string) {
  return apiGet<{ events: Record<string, unknown>[] }>(`/cover-funds/${encodeURIComponent(id)}/audit`)
}

/** --- Dashboard --- */


export function liveDashboardMetrics() {
  return apiGet<DashboardMetricsDto>('/metrics/dashboard')
}

/** --- Integration Hub --- */
import type { IntegrationConnector, IntegrationWebhookEvent } from '../../state/integrationDemoStore'

export function liveListIntegrationConnectors() {
  return apiGet<IntegrationConnector[]>('/integrations/connectors')
}

export function liveSyncIntegrationConnector(id: string) {
  return apiPatch<IntegrationConnector>(`/integrations/connectors/${encodeURIComponent(id)}`, {})
}

export function liveListIntegrationWebhooks() {
  return apiGet<IntegrationWebhookEvent[]>('/integrations/webhooks')
}

export function livePostIntegrationWebhook(body: { connectorId: string, direction: 'inbound' | 'outbound', message: string }) {
  return apiPost<IntegrationWebhookEvent>('/integrations/webhooks', body as unknown as Record<string, unknown>)
}

/** --- Head Office --- */
export function liveGetRolePolicies() {
  return apiGet<any[]>('/ho/policies')
}
export function liveSaveRolePolicies(body: any[]) {
  return apiPost<any[]>('/ho/policies', body as any)
}
export function liveGetBranchPerms() {
  return apiGet<any[]>('/ho/branch-perms')
}
export function liveUpsertBranchPerm(body: any) {
  return apiPost<any>('/ho/branch-perms', body)
}
export function liveGetEhBlocks() {
  return apiGet<Record<string, boolean>>('/ho/eh-blocks')
}
export function liveSetEhBlock(code: string, blocked: boolean) {
  return apiPost<Record<string, boolean>>(`/ho/eh-blocks/${encodeURIComponent(code)}`, {blocked} as any)
}

/** --- Security Directory --- */
export function liveGetUsers() { return apiGet<any[]>('/security/users') }
export function liveCreateUser(body: any) { return apiPost<any>('/security/users', body) }
export function liveUpdateUser(id: string, patch: any) { return apiPatch<any>(`/security/users/${encodeURIComponent(id)}`, patch) }
export function liveGetEmployees() { return apiGet<any[]>('/security/employees') }
export function liveCreateEmployee(body: any) { return apiPost<any>('/security/employees', body) }
export function liveUpdateEmployee(id: string, patch: any) { return apiPatch<any>(`/security/employees/${encodeURIComponent(id)}`, patch) }
export function liveGetAudit() { return apiGet<any[]>('/security/audit') }
export function livePostAudit(body: any) { return apiPost<any>('/security/audit', body) }
export function liveGetActivity() { return apiGet<any[]>('/security/activity') }
export function livePostActivity(body: any) { return apiPost<any>('/security/activity', body) }

/** --- Administration --- */
export function liveGetBranches() { return apiGet<any[]>('/admin/branches') }
export function liveCreateBranch(body: any) { return apiPost<any>('/admin/branches', body) }
export function livePatchBranch(id: string, patch: any) { return apiPatch<any>(`/admin/branches/${encodeURIComponent(id)}`, patch) }
export function liveGetPrivilegedAudit() { return apiGet<any[]>('/admin/privileged-audit') }
export function livePostPrivilegedAudit(body: any) { return apiPost<any>('/admin/privileged-audit', body) }

/** --- Audit & Monitoring --- */
export function liveGetUserActivityAudit() { return apiGet<any[]>('/audit/user-activity') }
export function livePostUserActivityAudit(body: any) { return apiPost<any>('/audit/user-activity', body) }
export function liveDeleteUserActivityAudit() { return apiDelete('/audit/user-activity') }

/** --- Bulk Upload --- */
export function liveImportBulkBatch(rows: any[]) { return apiPost<any>('/eh-bulk-upload/import', { rows } as any) }
