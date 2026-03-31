/**
 * Administrative & privileged actions audit (demo localStorage).
 * Production: append-only table in SQL Server fed by ASP.NET Core (admin API, DBA tools, CI/CD webhooks).
 */

import { DEFAULT_AUDIT_HOW, stampIntegrity, verifyDescendingIntegrityChain, type ChainVerifyResult } from '../lib/auditIntegrity'
import { nextId } from './mastersStore'
import { createPrivilegedAudit } from '../integrations/administration/adminRepository'

export const PRIVILEGED_AUDIT_EVENT = 'privilegedAudit:changed'

/** Requirement buckets from spec */
export type PrivilegedAuditCategory =
  | 'admin_action'
  | 'database_change'
  | 'deployment'
  | 'privilege_escalation'

export type PrivilegedAuditOutcome = 'Success' | 'Failure' | 'Info'

export type PrivilegedAuditEntry = {
  id: string
  at: string
  /** UTC ISO-8601 (Z). Present on new rows; legacy seed may omit. */
  atUtc?: string
  category: PrivilegedAuditCategory
  eventType: string
  actorUserId: string
  targetUserId?: string
  environment?: string
  resourceRef?: string
  ip: string
  details: string
  outcome: PrivilegedAuditOutcome
  /** Channel / mechanism (W5H — how). */
  how?: string
  clientDevice?: string
  previousEntryHash?: string | null
  entryHash?: string
}

const KEY = 'frms.privilegedAudit.v1'

const CATEGORY_LABEL: Record<PrivilegedAuditCategory, string> = {
  admin_action: 'Admin logins & actions',
  database_change: 'DB / schema',
  deployment: 'Deploy / patch',
  privilege_escalation: 'Privilege escalation',
}

export function privilegedCategoryLabel(c: PrivilegedAuditCategory) {
  return CATEGORY_LABEL[c]
}

function seed(): PrivilegedAuditEntry[] {
  const t = '2026-03-25'
  return [
    {
      id: 'PAD-001',
      at: `${t} 07:58:00`,
      category: 'admin_action',
      eventType: 'ADMIN_LOGIN_SUCCESS',
      actorUserId: 'HO-SuperAdmin',
      environment: 'Production',
      ip: '10.10.10.1',
      details: 'Privileged console login (MFA verified)',
      outcome: 'Success',
    },
    {
      id: 'PAD-002',
      at: `${t} 08:05:12`,
      category: 'admin_action',
      eventType: 'CONFIG_CHANGE',
      actorUserId: 'HO-SuperAdmin',
      resourceRef: 'pricing/incentive-tiers',
      environment: 'Production',
      ip: '10.10.10.1',
      details: 'Updated BDT incentive band thresholds (before/after hash logged server-side)',
      outcome: 'Success',
    },
    {
      id: 'PAD-003',
      at: `${t} 08:22:40`,
      category: 'admin_action',
      eventType: 'ROLE_ASSIGNMENT',
      actorUserId: 'HO-Admin',
      targetUserId: 'Finance-01',
      resourceRef: 'User:Finance-01',
      environment: 'Production',
      ip: '10.10.10.10',
      details: 'Granted GL posting approval role',
      outcome: 'Success',
    },
    {
      id: 'PAD-004',
      at: `${t} 09:10:05`,
      category: 'admin_action',
      eventType: 'CONTENT_MODERATION',
      actorUserId: 'Compliance-01',
      resourceRef: 'REM-2026-000099',
      environment: 'Production',
      ip: '10.10.20.3',
      details: 'Moderation: held remittance narrative pending KYC — user-visible banner applied',
      outcome: 'Info',
    },
    {
      id: 'PAD-005',
      at: `${t} 09:45:00`,
      category: 'database_change',
      eventType: 'MANUAL_SQL_EXECUTED',
      actorUserId: 'DBA-01',
      environment: 'Production',
      ip: '10.10.1.50',
      details: 'Ad-hoc read-only reconciliation SELECT (ticket DBA-4482); full statement in DBA vault',
      outcome: 'Success',
    },
    {
      id: 'PAD-006',
      at: `${t} 10:02:33`,
      category: 'database_change',
      eventType: 'SCHEMA_MIGRATION',
      actorUserId: 'DBA-01',
      resourceRef: 'Flyway V2026.03.25.1',
      environment: 'Production',
      ip: '10.10.1.50',
      details: 'Applied EF migration: add column Remittances.PhotoIdRef (nullable)',
      outcome: 'Success',
    },
    {
      id: 'PAD-007',
      at: `${t} 11:30:00`,
      category: 'deployment',
      eventType: 'CODE_DEPLOY',
      actorUserId: 'CICD-Service',
      resourceRef: 'admin-dashboard@sha256:abc…f12',
      environment: 'Production',
      ip: '10.10.5.20',
      details: 'Blue/green deploy: API + SPA bundle; pipeline #4821',
      outcome: 'Success',
    },
    {
      id: 'PAD-008',
      at: `${t} 11:31:15`,
      category: 'deployment',
      eventType: 'CONFIG_UPDATE',
      actorUserId: 'CICD-Service',
      resourceRef: 'appsettings.Production.json',
      environment: 'Production',
      ip: '10.10.5.20',
      details: 'Runtime config refresh: VAPT header block version bump',
      outcome: 'Success',
    },
    {
      id: 'PAD-009',
      at: `${t} 13:15:00`,
      category: 'privilege_escalation',
      eventType: 'ROLE_PROMOTION',
      actorUserId: 'HO-SuperAdmin',
      targetUserId: 'Branch-Lead-04',
      resourceRef: 'Branch-Lead-04',
      environment: 'Production',
      ip: '10.10.10.1',
      details: 'Elevation: Operator → Administrator (ticket CHG-2026-0318; dual approval)',
      outcome: 'Success',
    },
    {
      id: 'PAD-010',
      at: `${t} 13:20:44`,
      category: 'privilege_escalation',
      eventType: 'ADMIN_LOGIN_FAILED',
      actorUserId: 'unknown',
      environment: 'Production',
      ip: '185.220.101.4',
      details: 'Break-glass admin URL: invalid certificate + failed password',
      outcome: 'Failure',
    },
  ]
}

function read(): PrivilegedAuditEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      const s = seed()
      localStorage.setItem(KEY, JSON.stringify(s))
      return s
    }
    const p = JSON.parse(raw) as PrivilegedAuditEntry[]
    return Array.isArray(p) && p.length > 0 ? p : seed()
  } catch {
    return seed()
  }
}

function save(rows: PrivilegedAuditEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 5000)))
  window.dispatchEvent(new CustomEvent(PRIVILEGED_AUDIT_EVENT))
}

export function loadPrivilegedActionsAuditLog(): PrivilegedAuditEntry[] {
  return read()
}

export function resetPrivilegedActionsAuditToSeed() {
  localStorage.removeItem(KEY)
  save(seed())
}

export function appendPrivilegedAuditEntry(entry: PrivilegedAuditEntry) {
  save([entry, ...read()])
}

export type RecordPrivilegedAuditInput = {
  category: PrivilegedAuditCategory
  eventType: string
  actorUserId: string
  targetUserId?: string
  environment?: string
  resourceRef?: string
  ip?: string
  details: string
  outcome?: PrivilegedAuditOutcome
  at?: string
  /** e.g. UI_ACTION, REST_PATCH, MAKER_CHECKER */
  how?: string
}

function privilegedStableForVerify(r: PrivilegedAuditEntry): Record<string, string> {
  return {
    who: r.actorUserId,
    what: r.eventType,
    where: r.ip,
    how: r.how ?? DEFAULT_AUDIT_HOW,
    category: r.category,
    details: (r.details || '').slice(0, 2000),
    target: r.targetUserId ?? '',
    resource: r.resourceRef ?? '',
    env: r.environment ?? 'Demo',
    outcome: r.outcome,
    atUtc: r.atUtc!,
  }
}

export function verifyPrivilegedAuditChain(): ChainVerifyResult {
  return verifyDescendingIntegrityChain(loadPrivilegedActionsAuditLog(), privilegedStableForVerify)
}

export function recordPrivilegedAuditEvent(input: RecordPrivilegedAuditInput): PrivilegedAuditEntry {
  const rows = read()
  const stamp = stampIntegrity(rows[0]?.entryHash, {
    who: input.actorUserId,
    what: input.eventType,
    where: input.ip ?? '127.0.0.1',
    how: input.how ?? DEFAULT_AUDIT_HOW,
    category: input.category,
    details: input.details.slice(0, 2000),
    target: input.targetUserId ?? '',
    resource: input.resourceRef ?? '',
    env: input.environment ?? 'Demo',
    outcome: input.outcome ?? 'Success',
  })
  const entry: PrivilegedAuditEntry = {
    id: nextId('PAD'),
    at: input.at ?? stamp.atUtc,
    atUtc: stamp.atUtc,
    category: input.category,
    eventType: input.eventType,
    actorUserId: input.actorUserId,
    targetUserId: input.targetUserId,
    environment: input.environment ?? 'Demo',
    resourceRef: input.resourceRef,
    ip: input.ip ?? '127.0.0.1',
    details: input.details,
    outcome: input.outcome ?? 'Success',
    how: stamp.how,
    clientDevice: stamp.clientDevice,
    previousEntryHash: stamp.previousEntryHash,
    entryHash: stamp.entryHash,
  }
  appendPrivilegedAuditEntry(entry)
  createPrivilegedAudit(entry).catch(console.error)
  return entry
}
