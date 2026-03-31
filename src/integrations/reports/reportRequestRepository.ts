import type { ReportRequestAuditEventDto, ReportRequestDto } from '../../api/types'
import {
  liveApproveReportRequest,
  liveCreateReportRequest,
  liveGetReportRequestAudit,
  liveListReportRequests,
  liveRejectReportRequest,
} from '../../api/live/client'
import {
  approveReportRequest,
  createReportRequest,
  listReportRequestAudit,
  listReportRequests,
  rejectReportRequest,
  REPORT_REQUEST_EVENT,
  type ReportRequestAuditEvent,
  type ReportRequestRow,
} from '../../state/reportRequestStore'

function frmsLiveApiEnabled(): boolean {
  return import.meta.env.VITE_USE_LIVE_API === 'true'
}

function emitChange() {
  window.dispatchEvent(new CustomEvent(REPORT_REQUEST_EVENT))
}

function dtoToRow(d: ReportRequestDto): ReportRequestRow {
  return {
    id: d.id,
    reportName: d.reportName,
    generatedAt: d.generatedAt,
    periodFrom: d.periodFrom,
    periodTo: d.periodTo,
    branchScope: d.branchScope,
    rowCount: d.rowCount,
    maker: d.maker,
    checker: d.checker,
    status: d.status,
  }
}

function dtoToAudit(e: ReportRequestAuditEventDto): ReportRequestAuditEvent {
  return {
    at: e.at,
    actor: e.actor,
    action: e.action,
    details: e.details,
  }
}

export async function fetchReportRequests(): Promise<ReportRequestRow[]> {
  if (frmsLiveApiEnabled()) {
    const page = await liveListReportRequests()
    return page.items.map(dtoToRow)
  }
  return listReportRequests()
}

export async function fetchReportRequestAudit(reportId: string): Promise<ReportRequestAuditEvent[]> {
  if (frmsLiveApiEnabled()) {
    const out = await liveGetReportRequestAudit(reportId)
    return out.events.map(dtoToAudit)
  }
  return listReportRequestAudit(reportId)
}

export async function queueReportRequest(input: {
  reportName: string
  periodFrom: string
  periodTo: string
  branchScope: string
  maker: string
  rowCount: number
}): Promise<ReportRequestRow> {
  if (frmsLiveApiEnabled()) {
    const row = await liveCreateReportRequest(input)
    emitChange()
    return dtoToRow(row)
  }
  return createReportRequest(input)
}

export async function approveQueuedReport(reportId: string, checkerUser?: string): Promise<ReportRequestRow> {
  if (frmsLiveApiEnabled()) {
    const row = await liveApproveReportRequest(reportId, checkerUser ? { checkerUser } : undefined)
    emitChange()
    return dtoToRow(row)
  }
  return approveReportRequest(reportId, checkerUser && checkerUser.trim() ? checkerUser : 'HO-Admin')
}

export async function rejectQueuedReport(
  reportId: string,
  checkerUser?: string,
  reason?: string,
): Promise<ReportRequestRow> {
  if (frmsLiveApiEnabled()) {
    const row = await liveRejectReportRequest(reportId, {
      checkerUser: checkerUser && checkerUser.trim() ? checkerUser : 'HO-Admin',
      reason,
    })
    emitChange()
    return dtoToRow(row)
  }
  return rejectReportRequest(
    reportId,
    checkerUser && checkerUser.trim() ? checkerUser : 'HO-Admin',
    reason,
  )
}

export { REPORT_REQUEST_EVENT }
