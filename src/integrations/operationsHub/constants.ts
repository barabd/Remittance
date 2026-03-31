/** Browser events — UI subscribes; repository emits after every mutation (local or API). */
export const OPERATIONAL_NOTIFICATIONS_EVENT = 'operationalNotifications:changed'
export const EMAIL_OUTBOX_EVENT = 'emailOutbox:changed'
export const FEEDBACK_LOG_EVENT = 'feedbackLog:changed'

export const STORAGE_KEYS = {
  notifications: 'frms.opNotifications.v1',
  emailOutbox: 'frms.emailOutbox.v1',
  feedbackLog: 'frms.feedbackLog.v1',
} as const

export const STORAGE_LIMITS = {
  notifications: 100,
  emailOutbox: 200,
  feedbackLog: 300,
} as const
