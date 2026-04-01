/**
 * Operations hub HTTP — used only by `integrations/operationsHub/operationsHubRepository` when live.
 * Server: server/frms-ops-api · DB: database/mssql/operations_hub.sql
 */

import { apiGet, apiPatch, apiPost, apiRequest } from '../http'
import type {
  EmailOutboxItem,
  FeedbackLogEntry,
  FeedbackSource,
  OperationalNotification,
  OperationalNotificationKind,
  SmsOutboxItem,
} from '../../integrations/operationsHub/types'

export function liveListOpsNotifications() {
  return apiGet<OperationalNotification[]>('/operations/notifications')
}

export function liveCreateOpsNotification(body: {
  kind: OperationalNotificationKind
  title: string
  body: string
  remittanceNo?: string
}) {
  return apiPost<OperationalNotification>('/operations/notifications', {
    kind: body.kind,
    title: body.title,
    body: body.body,
    ...(body.remittanceNo != null && body.remittanceNo !== ''
      ? { remittanceNo: body.remittanceNo }
      : {}),
  } as Record<string, unknown>)
}

export function livePatchOpsNotification(id: string, patch: { read: boolean }) {
  return apiPatch<OperationalNotification>(`/operations/notifications/${encodeURIComponent(id)}`, {
    read: patch.read,
  })
}

export function liveMarkAllOpsNotificationsRead() {
  return apiRequest<void>('/operations/notifications/mark-all-read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
    parseJson: false,
  })
}

export function liveListEmailOutbox() {
  return apiGet<EmailOutboxItem[]>('/operations/email-outbox')
}

export function liveCreateEmailOutbox(body: {
  to: string
  subject: string
  bodyPreview: string
  exchangeHouse?: string
  reportRef?: string
}) {
  return apiPost<EmailOutboxItem>('/operations/email-outbox', {
    to: body.to,
    subject: body.subject,
    bodyPreview: body.bodyPreview,
    ...(body.exchangeHouse ? { exchangeHouse: body.exchangeHouse } : {}),
    ...(body.reportRef ? { reportRef: body.reportRef } : {}),
  } as Record<string, unknown>)
}

export function livePatchEmailOutbox(id: string, status: EmailOutboxItem['status']) {
  return apiPatch<EmailOutboxItem>(`/operations/email-outbox/${encodeURIComponent(id)}`, { status })
}

export function liveListSmsOutbox() {
  return apiGet<SmsOutboxItem[]>('/operations/sms-outbox')
}

export function liveCreateSmsOutbox(body: {
  to: string
  messagePreview: string
  provider?: string
}) {
  return apiPost<SmsOutboxItem>('/operations/sms-outbox', {
    to: body.to,
    messagePreview: body.messagePreview,
    ...(body.provider ? { provider: body.provider } : {}),
  } as Record<string, unknown>)
}

export function livePatchSmsOutbox(id: string, status: SmsOutboxItem['status']) {
  return apiPatch<SmsOutboxItem>(`/operations/sms-outbox/${encodeURIComponent(id)}`, { status })
}

export function liveListFeedbackLog() {
  return apiGet<FeedbackLogEntry[]>('/operations/feedback-log')
}

export function liveCreateFeedbackLog(body: {
  source: FeedbackSource
  message: string
  meta?: string
}) {
  return apiPost<FeedbackLogEntry>('/operations/feedback-log', {
    source: body.source,
    message: body.message,
    ...(body.meta != null && body.meta !== '' ? { meta: body.meta } : {}),
  } as Record<string, unknown>)
}
