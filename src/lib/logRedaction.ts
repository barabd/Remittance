/**
 * Mask passwords, tokens, and common PII patterns in log text for display/export.
 * Production: redact server-side before persistence; this mirrors policy in the SPA demo.
 */

/** Redact secrets and PII-like patterns inside free-text log fields. */
export function redactLogText(input: string): string {
  if (!input) return input
  let s = input
  s = s.replace(/\bpassword\s*[=:]\s*\S+/gi, 'password=[REDACTED]')
  s = s.replace(/\bpwd\s*[=:]\s*\S+/gi, 'pwd=[REDACTED]')
  s = s.replace(/\bsecret\s*[=:]\s*\S+/gi, 'secret=[REDACTED]')
  s = s.replace(/\bapi[_-]?key\s*[=:]\s*\S+/gi, 'api_key=[REDACTED]')
  s = s.replace(/\bBearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
  s = s.replace(/\bsk_live_[A-Za-z0-9]+/gi, 'sk_live_[REDACTED]')
  s = s.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[PAN_MASKED]')
  s = s.replace(/\b\+?\d{1,3}[\s-]?\d{6,14}\d\b/g, '[PHONE_MASKED]')
  s = s.replace(/([a-zA-Z0-9._%+-]{1,3})[a-zA-Z0-9._%+-]*@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, (_m, a, d) => `${a}***@${d}`)
  return s
}

/** Short username / id: keep prefix hint only. */
export function redactUserIdentifier(id: string): string {
  const s = id.trim()
  if (s.length <= 2) return '***'
  if (s.includes('@')) return redactLogText(s)
  if (s.length <= 4) return s[0] + '***'
  return `${s.slice(0, 2)}***${s.slice(-1)}`
}
