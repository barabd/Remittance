/**
 * Single merge point: every operations-hub mutation/list goes through here.
 * VITE_USE_LIVE_API=true → Java + MSSQL (operationsHubClient). Else → localStore + same events.
 */

import {
  liveCreateEmailOutbox,
  liveCreateFeedbackLog,
  liveCreateOpsNotification,
  liveListEmailOutbox,
  liveListFeedbackLog,
  liveListOpsNotifications,
  liveMarkAllOpsNotificationsRead,
  livePatchEmailOutbox,
  livePatchOpsNotification,
} from '../../api/live/operationsHubClient'
import { postOpsPushDeliveryIfConfigured } from '../../lib/opsDeliveryClient'
import { nextId, nowTs } from '../../lib/datetimeIds'
import {
  EMAIL_OUTBOX_EVENT,
  FEEDBACK_LOG_EVENT,
  OPERATIONAL_NOTIFICATIONS_EVENT,
} from './constants'
import {
  loadLocalEmailOutbox,
  loadLocalFeedbackLog,
  loadLocalNotifications,
  saveLocalEmailOutbox,
  saveLocalFeedbackLog,
  saveLocalNotifications,
} from './localStore'
import type {
  EmailOutboxItem,
  FeedbackLogEntry,
  FeedbackSource,
  OperationalNotification,
  OperationalNotificationKind,
} from './types'

function frmsLiveApiEnabled(): boolean {
  return import.meta.env.VITE_USE_LIVE_API === 'true'
}

function emit(name: string) {
  window.dispatchEvent(new CustomEvent(name))
}

// --- Notifications (#17) ---

export function loadOperationalNotifications(): OperationalNotification[] {
  return loadLocalNotifications()
}

export async function fetchOperationalNotifications(): Promise<OperationalNotification[]> {
  if (frmsLiveApiEnabled()) {
    return liveListOpsNotifications()
  }
  return loadLocalNotifications()
}

export function unreadOperationalCount(): number {
  return loadLocalNotifications().filter((n) => !n.read).length
}

export async function fetchUnreadOperationalNotificationCount(): Promise<number> {
  const rows = await fetchOperationalNotifications()
  return rows.filter((n) => !n.read).length
}

export function pushOperationalNotification(input: {
  kind: OperationalNotificationKind
  title: string
  body: string
  remittanceNo?: string
}): Promise<void> {
  if (frmsLiveApiEnabled()) {
    return liveCreateOpsNotification(input).then((created) => {
      postOpsPushDeliveryIfConfigured(created)
      emit(OPERATIONAL_NOTIFICATIONS_EVENT)
    })
  }
  const row: OperationalNotification = {
    id: nextId('OPN'),
    ...input,
    createdAt: nowTs(),
    read: false,
  }
  saveLocalNotifications([row, ...loadLocalNotifications()])
  postOpsPushDeliveryIfConfigured(row)
  emit(OPERATIONAL_NOTIFICATIONS_EVENT)
  return Promise.resolve()
}

export function markAllOperationalRead(): Promise<void> {
  if (frmsLiveApiEnabled()) {
    return liveMarkAllOpsNotificationsRead().then(() => {
      emit(OPERATIONAL_NOTIFICATIONS_EVENT)
    })
  }
  saveLocalNotifications(loadLocalNotifications().map((n) => ({ ...n, read: true })))
  emit(OPERATIONAL_NOTIFICATIONS_EVENT)
  return Promise.resolve()
}

export function markOperationalRead(id: string): Promise<void> {
  if (frmsLiveApiEnabled()) {
    return livePatchOpsNotification(id, { read: true }).then(() => {
      emit(OPERATIONAL_NOTIFICATIONS_EVENT)
    })
  }
  saveLocalNotifications(
    loadLocalNotifications().map((n) => (n.id === id ? { ...n, read: true } : n)),
  )
  emit(OPERATIONAL_NOTIFICATIONS_EVENT)
  return Promise.resolve()
}

// --- Email outbox (#18) ---

export function loadEmailOutbox(): EmailOutboxItem[] {
  return loadLocalEmailOutbox()
}

export async function fetchEmailOutbox(): Promise<EmailOutboxItem[]> {
  if (frmsLiveApiEnabled()) {
    return liveListEmailOutbox()
  }
  return loadLocalEmailOutbox()
}

export function queueEmailToExchangeHouse(input: {
  to: string
  subject: string
  bodyPreview: string
  exchangeHouse?: string
  reportRef?: string
}): Promise<void> {
  if (frmsLiveApiEnabled()) {
    return liveCreateEmailOutbox(input).then(() => {
      emit(EMAIL_OUTBOX_EVENT)
    })
  }
  const row: EmailOutboxItem = {
    id: nextId('EML'),
    ...input,
    createdAt: nowTs(),
    status: 'queued',
  }
  saveLocalEmailOutbox([row, ...loadLocalEmailOutbox()])
  emit(EMAIL_OUTBOX_EVENT)
  return Promise.resolve()
}

export function markOutboxItemSentDemo(id: string): Promise<void> {
  if (frmsLiveApiEnabled()) {
    return livePatchEmailOutbox(id, 'sent_demo').then(() => {
      emit(EMAIL_OUTBOX_EVENT)
    })
  }
  saveLocalEmailOutbox(
    loadLocalEmailOutbox().map((e) => (e.id === id ? { ...e, status: 'sent_demo' as const } : e)),
  )
  emit(EMAIL_OUTBOX_EVENT)
  return Promise.resolve()
}

export function resetOutboxItemToQueued(id: string): Promise<void> {
  if (frmsLiveApiEnabled()) {
    return livePatchEmailOutbox(id, 'queued').then(() => {
      emit(EMAIL_OUTBOX_EVENT)
    })
  }
  saveLocalEmailOutbox(
    loadLocalEmailOutbox().map((e) => (e.id === id ? { ...e, status: 'queued' as const } : e)),
  )
  emit(EMAIL_OUTBOX_EVENT)
  return Promise.resolve()
}

// --- Feedback log (#15) ---

export function loadFeedbackLog() {
  return loadLocalFeedbackLog()
}

export async function fetchFeedbackLog() {
  if (frmsLiveApiEnabled()) {
    return liveListFeedbackLog()
  }
  return loadLocalFeedbackLog()
}

export function appendFeedback(source: FeedbackSource, message: string, meta?: string): Promise<void> {
  if (frmsLiveApiEnabled()) {
    return liveCreateFeedbackLog({ source, message, meta }).then(() => {
      emit(FEEDBACK_LOG_EVENT)
    })
  }
  saveLocalFeedbackLog([
    {
      id: nextId('FBK'),
      at: nowTs(),
      source,
      message,
      meta,
    },
    ...loadLocalFeedbackLog(),
  ])
  emit(FEEDBACK_LOG_EVENT)
  return Promise.resolve()
}

/** Refresh all three domains from the active backend (for Operations hub page). */
export async function refreshOperationsHubSnapshot(): Promise<{
  notifications: OperationalNotification[]
  outbox: EmailOutboxItem[]
  feedback: FeedbackLogEntry[]
}> {
  const [notifications, outbox, feedback] = await Promise.all([
    fetchOperationalNotifications(),
    fetchEmailOutbox(),
    fetchFeedbackLog(),
  ])
  return { notifications, outbox, feedback }
}
