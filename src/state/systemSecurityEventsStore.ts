/**
 * System & security events (demo localStorage).
 * Production: central log (SQL Server + SIEM) fed by API gateway, app insights, WAF, and file-proxy services.
 */

import { DEFAULT_AUDIT_HOW, stampIntegrity, verifyDescendingIntegrityChain, type ChainVerifyResult } from '../lib/auditIntegrity'
import { nextId } from './mastersStore'

export const SYSTEM_SECURITY_EVENT = 'systemSecurityEvents:changed'

/** Requirement buckets from spec */
export type SystemSecurityCategory =
  | 'app_error'
  | 'security_alert'
  | 'restricted_access'
  | 'file_transfer'
  | 'config_change'

export type SystemSecurityOutcome = 'Success' | 'Failure' | 'Info'

export type SystemSecurityEntry = {
  id: string
  at: string
  atUtc?: string
  category: SystemSecurityCategory
  eventType: string
  actorUserId: string
  resourceRef?: string
  environment?: string
  ip: string
  details: string
  outcome: SystemSecurityOutcome
  /** File transfer: upload | download */
  transferDirection?: 'upload' | 'download'
  /** Media / sensitive document flag */
  sensitiveAsset?: boolean
  how?: string
  clientDevice?: string
  previousEntryHash?: string | null
  entryHash?: string
}

const KEY = 'frms.systemSecurityEvents.v1'

const CATEGORY_LABEL: Record<SystemSecurityCategory, string> = {
  app_error: 'Application errors & exceptions',
  security_alert: 'Security alerts',
  restricted_access: 'Restricted pages / APIs',
  file_transfer: 'File upload / download',
  config_change: 'Configuration changes',
}

export function systemSecurityCategoryLabel(c: SystemSecurityCategory) {
  return CATEGORY_LABEL[c]
}

function seed(): SystemSecurityEntry[] {
  const t = '2026-03-25'
  return [
    {
      id: 'SSE-001',
      at: `${t} 06:12:08`,
      category: 'app_error',
      eventType: 'UNHANDLED_EXCEPTION',
      actorUserId: 'system',
      resourceRef: 'RemittanceQueuePage',
      environment: 'Production',
      ip: '10.10.20.11',
      details: 'TypeError: Cannot read properties of undefined (reading map) — correlationId: a1b2c3d4',
      outcome: 'Failure',
    },
    {
      id: 'SSE-002',
      at: `${t} 06:45:22`,
      category: 'app_error',
      eventType: 'API_5XX',
      actorUserId: 'api-client',
      resourceRef: 'POST /api/remittances/validate',
      environment: 'Production',
      ip: '10.10.20.11',
      details: 'Upstream timeout 504 from core banking adapter (retried x2)',
      outcome: 'Failure',
    },
    {
      id: 'SSE-003',
      at: `${t} 07:01:00`,
      category: 'security_alert',
      eventType: 'FAILED_LOGIN_BURST',
      actorUserId: 'unknown',
      resourceRef: '/auth/oidc/callback',
      environment: 'Production',
      ip: '203.0.113.44',
      details: '12 failed password attempts in 4 min — account lockout applied',
      outcome: 'Failure',
    },
    {
      id: 'SSE-004',
      at: `${t} 07:18:33`,
      category: 'security_alert',
      eventType: 'SUSPICIOUS_GEO',
      actorUserId: 'Maker-Branch-02',
      resourceRef: '/dashboard',
      environment: 'Production',
      ip: '198.51.100.9',
      details: 'New country vs 90-day baseline — step-up MFA enforced',
      outcome: 'Info',
    },
    {
      id: 'SSE-005',
      at: `${t} 08:02:10`,
      category: 'restricted_access',
      eventType: 'ADMIN_PAGE_VIEW',
      actorUserId: 'HO-Admin',
      resourceRef: 'GET /security/user-rights',
      environment: 'Production',
      ip: '10.10.10.10',
      details: 'Privileged IAM screen rendered (session validated)',
      outcome: 'Success',
    },
    {
      id: 'SSE-006',
      at: `${t} 08:04:55`,
      category: 'restricted_access',
      eventType: 'API_FORBIDDEN',
      actorUserId: 'Maker-EH-01',
      resourceRef: 'GET /api/admin/privileged-audit',
      environment: 'Production',
      ip: '10.10.30.5',
      details: '403 — missing role SecurityAuditor',
      outcome: 'Failure',
    },
    {
      id: 'SSE-007',
      at: `${t} 09:30:00`,
      category: 'file_transfer',
      eventType: 'FILE_UPLOAD',
      actorUserId: 'Compliance-01',
      resourceRef: 'bulk-kyc-20260325.xlsx',
      environment: 'Production',
      ip: '10.10.20.3',
      details: 'Bulk screening import — virus scan OK, SHA-256 logged server-side',
      outcome: 'Success',
      transferDirection: 'upload',
      sensitiveAsset: true,
    },
    {
      id: 'SSE-008',
      at: `${t} 09:31:12`,
      category: 'file_transfer',
      eventType: 'FILE_DOWNLOAD',
      actorUserId: 'Auditor-01',
      resourceRef: 'statement-run-2026Q1.pdf',
      environment: 'Production',
      ip: '10.10.40.2',
      details: 'Regulatory statement export — watermark + user id in audit',
      outcome: 'Success',
      transferDirection: 'download',
      sensitiveAsset: true,
    },
    {
      id: 'SSE-009',
      at: `${t} 10:15:40`,
      category: 'file_transfer',
      eventType: 'MEDIA_UPLOAD',
      actorUserId: 'Branch-Ops-12',
      resourceRef: 'photo-id-REM-8842.jpg',
      environment: 'Production',
      ip: '10.10.12.8',
      details: 'Customer photo ID attachment — PII class: ID document',
      outcome: 'Success',
      transferDirection: 'upload',
      sensitiveAsset: true,
    },
    {
      id: 'SSE-010',
      at: `${t} 11:05:00`,
      category: 'config_change',
      eventType: 'APP_SETTINGS',
      actorUserId: 'HO-SuperAdmin',
      resourceRef: 'appsettings / feature flags',
      environment: 'Production',
      ip: '10.10.10.1',
      details: 'Toggle: enableEnhancedAmlScreening=true (hash of prior value retained)',
      outcome: 'Success',
    },
    {
      id: 'SSE-011',
      at: `${t} 11:22:18`,
      category: 'config_change',
      eventType: 'SERVER_ENV',
      actorUserId: 'CICD-Service',
      resourceRef: 'container:api-prod-7f9c',
      environment: 'Production',
      ip: '10.10.5.20',
      details: 'Rolling restart — env ASPNETCORE_ENVIRONMENT=Production (no secret values in log)',
      outcome: 'Info',
    },
    {
      id: 'SSE-012',
      at: `${t} 11:40:00`,
      category: 'config_change',
      eventType: 'API_KEY_ROTATION',
      actorUserId: 'SecOps-01',
      resourceRef: 'Azure Key Vault / partner-webhook',
      environment: 'Production',
      ip: '10.10.1.5',
      details: 'Webhook signing key rotated — old version disabled after grace window',
      outcome: 'Success',
    },
  ]
}

function read(): SystemSecurityEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      const s = seed()
      localStorage.setItem(KEY, JSON.stringify(s))
      return s
    }
    const p = JSON.parse(raw) as SystemSecurityEntry[]
    return Array.isArray(p) && p.length > 0 ? p : seed()
  } catch {
    return seed()
  }
}

function save(rows: SystemSecurityEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 5000)))
  window.dispatchEvent(new CustomEvent(SYSTEM_SECURITY_EVENT))
}

export function loadSystemSecurityEvents(): SystemSecurityEntry[] {
  return read()
}

export function resetSystemSecurityEventsToSeed() {
  localStorage.removeItem(KEY)
  save(seed())
}

export function appendSystemSecurityEntry(entry: SystemSecurityEntry) {
  save([entry, ...read()])
}

export type RecordSystemSecurityInput = {
  category: SystemSecurityCategory
  eventType: string
  actorUserId: string
  resourceRef?: string
  environment?: string
  ip?: string
  details: string
  outcome?: SystemSecurityOutcome
  at?: string
  transferDirection?: 'upload' | 'download'
  sensitiveAsset?: boolean
  how?: string
}

function systemSecurityStableForVerify(r: SystemSecurityEntry): Record<string, string> {
  return {
    who: r.actorUserId,
    what: r.eventType,
    where: r.ip,
    how: r.how ?? DEFAULT_AUDIT_HOW,
    category: r.category,
    details: (r.details || '').slice(0, 2000),
    resource: r.resourceRef ?? '',
    env: r.environment ?? 'Demo',
    outcome: r.outcome,
    transferDir: r.transferDirection ?? '',
    sensitive: r.sensitiveAsset ? '1' : '0',
    atUtc: r.atUtc!,
  }
}

export function verifySystemSecurityEventsChain(): ChainVerifyResult {
  return verifyDescendingIntegrityChain(loadSystemSecurityEvents(), systemSecurityStableForVerify)
}

export function recordSystemSecurityEvent(input: RecordSystemSecurityInput): SystemSecurityEntry {
  const rows = read()
  const stamp = stampIntegrity(rows[0]?.entryHash, {
    who: input.actorUserId,
    what: input.eventType,
    where: input.ip ?? '127.0.0.1',
    how: input.how ?? DEFAULT_AUDIT_HOW,
    category: input.category,
    details: input.details.slice(0, 2000),
    resource: input.resourceRef ?? '',
    env: input.environment ?? 'Demo',
    outcome: input.outcome ?? 'Success',
    transferDir: input.transferDirection ?? '',
    sensitive: input.sensitiveAsset ? '1' : '0',
  })
  const entry: SystemSecurityEntry = {
    id: nextId('SSE'),
    at: input.at ?? stamp.atUtc,
    atUtc: stamp.atUtc,
    category: input.category,
    eventType: input.eventType,
    actorUserId: input.actorUserId,
    resourceRef: input.resourceRef,
    environment: input.environment ?? 'Demo',
    ip: input.ip ?? '127.0.0.1',
    details: input.details,
    outcome: input.outcome ?? 'Success',
    transferDirection: input.transferDirection,
    sensitiveAsset: input.sensitiveAsset,
    how: stamp.how,
    clientDevice: stamp.clientDevice,
    previousEntryHash: stamp.previousEntryHash,
    entryHash: stamp.entryHash,
  }
  appendSystemSecurityEntry(entry)
  return entry
}
