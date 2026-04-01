/**
 * Browser persistence — mirrors MSSQL rows when VITE_USE_LIVE_API is false.
 */

import { STORAGE_KEYS, STORAGE_LIMITS } from './constants'
import type { EmailOutboxItem, FeedbackLogEntry, OperationalNotification, SmsOutboxItem } from './types'

export function loadLocalNotifications(): OperationalNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.notifications)
    if (!raw) return []
    const p = JSON.parse(raw) as OperationalNotification[]
    return Array.isArray(p) ? p : []
  } catch {
    return []
  }
}

export function saveLocalNotifications(rows: OperationalNotification[]) {
  localStorage.setItem(
    STORAGE_KEYS.notifications,
    JSON.stringify(rows.slice(0, STORAGE_LIMITS.notifications)),
  )
}

export function loadLocalEmailOutbox(): EmailOutboxItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.emailOutbox)
    if (!raw) return []
    return JSON.parse(raw) as EmailOutboxItem[]
  } catch {
    return []
  }
}

export function saveLocalEmailOutbox(rows: EmailOutboxItem[]) {
  localStorage.setItem(
    STORAGE_KEYS.emailOutbox,
    JSON.stringify(rows.slice(0, STORAGE_LIMITS.emailOutbox)),
  )
}

export function loadLocalSmsOutbox(): SmsOutboxItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.smsOutbox)
    if (!raw) return []
    return JSON.parse(raw) as SmsOutboxItem[]
  } catch {
    return []
  }
}

export function saveLocalSmsOutbox(rows: SmsOutboxItem[]) {
  localStorage.setItem(
    STORAGE_KEYS.smsOutbox,
    JSON.stringify(rows.slice(0, STORAGE_LIMITS.smsOutbox)),
  )
}

export function loadLocalFeedbackLog(): FeedbackLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.feedbackLog)
    if (!raw) return []
    return JSON.parse(raw) as FeedbackLogEntry[]
  } catch {
    return []
  }
}

export function saveLocalFeedbackLog(rows: FeedbackLogEntry[]) {
  localStorage.setItem(
    STORAGE_KEYS.feedbackLog,
    JSON.stringify(rows.slice(0, STORAGE_LIMITS.feedbackLog)),
  )
}
