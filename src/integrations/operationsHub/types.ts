/**
 * Operations hub domain types — aligned with:
 * - DB: database/mssql/operations_hub.sql (ops_notification, ops_email_outbox, ops_sms_outbox, ops_feedback_log)
 * - API: server/frms-ops-api …/notification, …/outbox, …/feedback
 * - JSON field names match Java DTOs / Hibernate entities as serialized by Spring.
 */

export type OperationalNotificationKind = 'return' | 'stop_payment' | 'system'

/** Maps to dbo.ops_notification + OpsNotification entity */
export type OperationalNotification = {
  id: string
  kind: OperationalNotificationKind
  title: string
  body: string
  remittanceNo?: string
  createdAt: string
  read: boolean
}

/** Maps to dbo.ops_email_outbox + EmailOutboxRow (JSON uses `to` ↔ column recipient) */
export type EmailOutboxItem = {
  id: string
  to: string
  subject: string
  bodyPreview: string
  exchangeHouse?: string
  reportRef?: string
  createdAt: string
  status: 'queued' | 'sent_demo'
}

/** Maps to dbo.ops_sms_outbox + SmsOutboxRow */
export type SmsOutboxItem = {
  id: string
  to: string
  messagePreview: string
  provider?: string
  createdAt: string
  status: 'queued' | 'sent_demo'
}

export type FeedbackSource =
  | 'bulk_upload'
  | 'finance'
  | 'search_import'
  | 'disbursement'
  | 'pricing'
  | 'fx_quote'
  | 'security_utilities'
  | 'security_vapt'
  | 'single_entry'
  | 'operations_hub'
  | 'system'

/** Maps to dbo.ops_feedback_log + FeedbackLogRow (JSON `at` ↔ logged_at) */
export type FeedbackLogEntry = {
  id: string
  at: string
  source: FeedbackSource
  message: string
  meta?: string
}
