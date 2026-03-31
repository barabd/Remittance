/**
 * Operations hub delivery (#17–#18–#15).
 * The SPA stores alerts, outbox rows, and feedback locally (or via your API when wired).
 * Real SMTP and FCM must run on a trusted backend or worker — never embed SMTP credentials in Vite env.
 */

/** Backend route that accepts outbox payloads and sends via SMTP (SendGrid, SES, Exchange, etc.). */
export function opsEmailSendApiConfigured(): boolean {
  return Boolean(String(import.meta.env.VITE_OPS_EMAIL_SEND_API_URL ?? '').trim())
}

/** Backend route or Cloud Function that triggers FCM / mobile push for ops alerts. */
export function opsPushSendApiConfigured(): boolean {
  return Boolean(String(import.meta.env.VITE_OPS_PUSH_SEND_API_URL ?? '').trim())
}

export const OPS_PRODUCTION_NOTES = {
  email:
    'Queued rows can use “Send via production API” when VITE_OPS_EMAIL_SEND_API_URL is set. Java sends real SMTP when FRMS_OPS_MAIL_ENABLED=true and FRMS_SMTP_* are set; otherwise the API accepts the POST but does not send.',
  push:
    'New alerts POST to VITE_OPS_PUSH_SEND_API_URL. Java sends real FCM when FRMS_OPS_FCM_ENABLED=true and FRMS_FCM_CREDENTIALS_PATH (or _JSON) is set; else accepts without push. Topic default: ops-alerts.',
} as const
