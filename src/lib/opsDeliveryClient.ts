/**
 * Production ops delivery: POST JSON to VITE_OPS_EMAIL_SEND_API_URL and VITE_OPS_PUSH_SEND_API_URL.
 * Use absolute URLs or same-origin paths (e.g. /api/v1/operations/delivery/email) so Vite proxy reaches Java.
 */

import type { EmailOutboxItem, OperationalNotification } from '../integrations/operationsHub/types'
import { opsEmailSendApiConfigured, opsPushSendApiConfigured } from './operationsHubProduction'

export type OpsEmailDeliveryPayload = {
  id: string
  to: string
  subject: string
  bodyPreview: string
  /** Optional full body when worker renders HTML vs plain text */
  bodyText?: string
  exchangeHouse?: string
  reportRef?: string
  createdAt: string
  status: string
}

export type OpsPushDeliveryPayload = {
  id: string
  kind: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  body: string
  remittanceNo?: string
  createdAt: string
  read: boolean
  /** When set, FCM sends to this device token; otherwise the server uses topic (e.g. ops-alerts). */
  fcmToken?: string
}

export function mapKindToSeverity(kind: OperationalNotification['kind']): OpsPushDeliveryPayload['severity'] {
  if (kind === 'stop_payment') return 'critical'
  if (kind === 'return') return 'warning'
  return 'info'
}

export function mapNotificationToPushPayload(
  n: OperationalNotification,
  fcmToken?: string,
): OpsPushDeliveryPayload {
  return {
    id: n.id,
    kind: n.kind,
    severity: mapKindToSeverity(n.kind),
    title: n.title,
    body: n.body,
    remittanceNo: n.remittanceNo,
    createdAt: n.createdAt,
    read: n.read,
    ...(fcmToken != null && fcmToken.trim() !== '' ? { fcmToken: fcmToken.trim() } : {}),
  }
}

export function mapOutboxToEmailPayload(row: EmailOutboxItem): OpsEmailDeliveryPayload {
  return {
    id: row.id,
    to: row.to,
    subject: row.subject,
    bodyPreview: row.bodyPreview,
    exchangeHouse: row.exchangeHouse,
    reportRef: row.reportRef,
    createdAt: row.createdAt,
    status: row.status,
  }
}

function resolveRequestUrl(configured: string): string {
  const t = configured.trim()
  if (t.startsWith('http://') || t.startsWith('https://')) return t
  const path = t.startsWith('/') ? t : `/${t}`
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`
  }
  return path
}

function deliveryCredentials(): RequestCredentials {
  const m = import.meta.env.VITE_API_FETCH_CREDENTIALS
  if (m === 'include' || m === 'omit' || m === 'same-origin') return m
  return 'omit'
}

function deliveryAuthHeaders(): HeadersInit {
  const token = import.meta.env.VITE_API_BEARER_TOKEN
  const h: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  if (typeof token === 'string' && token.length > 0) {
    h.Authorization = `Bearer ${token}`
  }
  return h
}

export type OpsDeliveryResult = { ok: boolean; status: number; message?: string }

export async function postOpsEmailDelivery(payload: OpsEmailDeliveryPayload): Promise<OpsDeliveryResult> {
  const url = String(import.meta.env.VITE_OPS_EMAIL_SEND_API_URL ?? '').trim()
  if (!url) {
    return { ok: false, status: 0, message: 'VITE_OPS_EMAIL_SEND_API_URL is not set' }
  }
  return postDeliveryJson(resolveRequestUrl(url), payload)
}

export async function postOpsPushDelivery(payload: OpsPushDeliveryPayload): Promise<OpsDeliveryResult> {
  const url = String(import.meta.env.VITE_OPS_PUSH_SEND_API_URL ?? '').trim()
  if (!url) {
    return { ok: false, status: 0, message: 'VITE_OPS_PUSH_SEND_API_URL is not set' }
  }
  return postDeliveryJson(resolveRequestUrl(url), payload)
}

async function postDeliveryJson(url: string, body: unknown): Promise<OpsDeliveryResult> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      credentials: deliveryCredentials(),
      headers: deliveryAuthHeaders(),
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      let message = res.statusText
      try {
        const j = (await res.json()) as { message?: string }
        if (typeof j.message === 'string' && j.message.length > 0) message = j.message
      } catch {
        /* ignore */
      }
      return { ok: false, status: res.status, message }
    }
    return { ok: true, status: res.status }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network error'
    return { ok: false, status: 0, message }
  }
}

/** Fire-and-forget when push URL is configured (return/stop/system alerts). */
export function postOpsPushDeliveryIfConfigured(n: OperationalNotification, fcmToken?: string): void {
  if (!opsPushSendApiConfigured()) return
  void postOpsPushDelivery(mapNotificationToPushPayload(n, fcmToken))
}

/** POST outbox row to email worker, then mark sent when API succeeds. */
export async function deliverOutboxRowViaProductionApi(
  row: EmailOutboxItem,
  markSent: (id: string) => Promise<void>,
): Promise<OpsDeliveryResult> {
  if (!opsEmailSendApiConfigured()) {
    return { ok: false, status: 0, message: 'VITE_OPS_EMAIL_SEND_API_URL is not set' }
  }
  const r = await postOpsEmailDelivery(mapOutboxToEmailPayload(row))
  if (r.ok) {
    await markSent(row.id)
  }
  return r
}
