/**
 * A.2.2.1 User Activity Logging — demo persistence (localStorage).
 * Production: emit the same events from ASP.NET Core into SQL Server; this store is for UI/dev only.
 */

import { DEFAULT_AUDIT_HOW, stampIntegrity, verifyDescendingIntegrityChain, type ChainVerifyResult } from '../lib/auditIntegrity'
import { nextId } from './mastersStore'
import { createUserActivityAudit, deleteUserActivityAudit } from '../integrations/auditMonitoring/auditRepository'

export const USER_ACTIVITY_AUDIT_EVENT = 'userActivityAudit:changed'

/** Maps to specification §A.2.2.1 categories */
export type UserActivityCategory =
  | 'authentication'
  | 'account_admin'
  | 'session'
  | 'password'
  | 'data_change'

export type UserActivityOutcome = 'Success' | 'Failure' | 'Info'

export type UserActivityAuditEntry = {
  id: string
  /** Legacy / display; new rows mirror atUtc (UTC ISO). */
  at: string
  atUtc?: string
  category: UserActivityCategory
  /** Machine-friendly subtype, e.g. LOGIN_SUCCESS */
  eventType: string
  /** Subject user (account affected or logging in) */
  userId: string
  /** When different from userId (e.g. admin changed another user) */
  actorUserId?: string
  outcome: UserActivityOutcome
  resourceType?: string
  resourceRef?: string
  ip: string
  details: string
  how?: string
  clientDevice?: string
  previousEntryHash?: string | null
  entryHash?: string
}

const KEY = 'frms.userActivityAudit.v1'

const CATEGORY_LABEL: Record<UserActivityCategory, string> = {
  authentication: 'Authentication',
  account_admin: 'Account / roles',
  session: 'Session',
  password: 'Password',
  data_change: 'Data (CRUD)',
}

export function categoryLabel(c: UserActivityCategory) {
  return CATEGORY_LABEL[c]
}

function seed(): UserActivityAuditEntry[] {
  const t = '2026-03-25'
  return [
    {
      id: 'UAA-001',
      at: `${t} 08:55:01`,
      category: 'authentication',
      eventType: 'LOGIN_SUCCESS',
      userId: 'HO-Admin',
      outcome: 'Success',
      ip: '10.10.10.10',
      details: 'Successful login (SSO)',
    },
    {
      id: 'UAA-002',
      at: `${t} 08:57:44`,
      category: 'authentication',
      eventType: 'LOGIN_FAILED',
      userId: 'unknown@attempt',
      outcome: 'Failure',
      ip: '203.0.113.50',
      details: 'Invalid password — 3rd failed attempt in window',
    },
    {
      id: 'UAA-003',
      at: `${t} 09:12:00`,
      category: 'session',
      eventType: 'SESSION_START',
      userId: 'Finance-01',
      outcome: 'Success',
      resourceRef: 'sess-8f2a9c',
      ip: '10.10.10.12',
      details: 'New session issued after authentication',
    },
    {
      id: 'UAA-004',
      at: `${t} 09:45:00`,
      category: 'session',
      eventType: 'SESSION_TIMEOUT',
      userId: 'Branch-01',
      outcome: 'Info',
      resourceRef: 'sess-7aa101',
      ip: '10.20.1.5',
      details: 'Idle timeout (policy 30 min)',
    },
    {
      id: 'UAA-005',
      at: `${t} 10:05:22`,
      category: 'session',
      eventType: 'SESSION_FORCED_TERMINATION',
      userId: 'Ops-Temp',
      actorUserId: 'HO-Admin',
      outcome: 'Success',
      ip: '10.10.10.10',
      details: 'Administrator revoked active sessions for user',
    },
    {
      id: 'UAA-006',
      at: `${t} 10:18:33`,
      category: 'authentication',
      eventType: 'LOGOUT',
      userId: 'HO-Admin',
      outcome: 'Success',
      ip: '10.10.10.10',
      details: 'Explicit logout',
    },
    {
      id: 'UAA-007',
      at: `${t} 10:22:10`,
      category: 'account_admin',
      eventType: 'USER_CREATED',
      userId: 'new-operator-12',
      actorUserId: 'HO-Admin',
      outcome: 'Success',
      resourceType: 'User',
      resourceRef: 'new-operator-12',
      ip: '10.10.10.10',
      details: 'New user account created',
    },
    {
      id: 'UAA-008',
      at: `${t} 10:25:40`,
      category: 'account_admin',
      eventType: 'ROLE_UPDATED',
      userId: 'Branch-01',
      actorUserId: 'HO-Admin',
      outcome: 'Success',
      resourceType: 'User',
      resourceRef: 'Branch-01',
      ip: '10.10.10.10',
      details: 'Roles changed: added RemittanceApprover',
    },
    {
      id: 'UAA-009',
      at: `${t} 10:30:05`,
      category: 'account_admin',
      eventType: 'PERMISSION_UPDATED',
      userId: 'Finance-01',
      actorUserId: 'HO-Admin',
      outcome: 'Success',
      resourceType: 'User',
      resourceRef: 'Finance-01',
      ip: '10.10.10.10',
      details: 'Screen rights: Finance GL → Approve enabled',
    },
    {
      id: 'UAA-010',
      at: `${t} 11:00:00`,
      category: 'account_admin',
      eventType: 'USER_DELETED',
      userId: 'leavers-09',
      actorUserId: 'HO-Admin',
      outcome: 'Success',
      resourceType: 'User',
      resourceRef: 'leavers-09',
      ip: '10.10.10.10',
      details: 'Account deactivated and soft-deleted per HR ticket',
    },
    {
      id: 'UAA-011',
      at: `${t} 11:15:18`,
      category: 'password',
      eventType: 'PASSWORD_RESET_REQUESTED',
      userId: 'Branch-02',
      outcome: 'Success',
      ip: '10.20.2.8',
      details: 'Self-service reset email dispatched',
    },
    {
      id: 'UAA-012',
      at: `${t} 11:16:02`,
      category: 'password',
      eventType: 'PASSWORD_RECOVERY_ATTEMPT',
      userId: 'unknown',
      outcome: 'Failure',
      ip: '198.51.100.22',
      details: 'Recovery token invalid / expired',
    },
    {
      id: 'UAA-013',
      at: `${t} 11:40:18`,
      category: 'data_change',
      eventType: 'DATA_CREATE',
      userId: 'Branch-01',
      outcome: 'Success',
      resourceType: 'Remittance',
      resourceRef: 'REM-2026-000210',
      ip: '10.20.1.5',
      details: 'Created remittance draft',
    },
    {
      id: 'UAA-014',
      at: `${t} 11:41:55`,
      category: 'data_change',
      eventType: 'DATA_UPDATE',
      userId: 'HO-Checker',
      outcome: 'Success',
      resourceType: 'Remittance',
      resourceRef: 'REM-2026-000210',
      ip: '10.10.10.20',
      details: 'Status Approved',
    },
    {
      id: 'UAA-015',
      at: `${t} 11:42:30`,
      category: 'data_change',
      eventType: 'DATA_DELETE',
      userId: 'Finance-01',
      outcome: 'Success',
      resourceType: 'Voucher',
      resourceRef: 'VCH-2026-000099',
      ip: '10.10.10.12',
      details: 'Draft voucher removed before posting',
    },
    {
      id: 'UAA-016',
      at: `${t} 11:45:00`,
      category: 'data_change',
      eventType: 'DATA_UPDATE',
      userId: 'Branch-01',
      outcome: 'Info',
      resourceType: 'Acknowledgement',
      resourceRef: 'ACK-442',
      ip: '10.20.1.5',
      details: 'Duplicate acknowledgement flagged against REM-2026-000099',
    },
  ]
}

function read(): UserActivityAuditEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      const s = seed()
      localStorage.setItem(KEY, JSON.stringify(s))
      return s
    }
    const p = JSON.parse(raw) as UserActivityAuditEntry[]
    return Array.isArray(p) && p.length > 0 ? p : seed()
  } catch {
    return seed()
  }
}

function save(rows: UserActivityAuditEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 5000)))
  window.dispatchEvent(new CustomEvent(USER_ACTIVITY_AUDIT_EVENT))
}

// Note: this is synchronous for UI but components use the async wrapper.
export function loadUserActivityAuditLog(): UserActivityAuditEntry[] {
  return read()
}

export function clearUserActivityAuditLog() {
  save([])
}

export function resetUserActivityAuditLogToSeed() {
  localStorage.removeItem(KEY)
  save(seed())
  deleteUserActivityAudit().catch(console.error)
}

/** Append one entry (newest first). Call from UI demos or future global hooks. */
export function appendUserActivityAuditEntry(entry: UserActivityAuditEntry) {
  save([entry, ...read()])
}

export type RecordUserActivityInput = {
  category: UserActivityCategory
  eventType: string
  userId: string
  outcome?: UserActivityOutcome
  actorUserId?: string
  resourceType?: string
  resourceRef?: string
  ip?: string
  details: string
  at?: string
  how?: string
}

function userActivityStableForVerify(r: UserActivityAuditEntry): Record<string, string> {
  return {
    subject: r.userId,
    what: r.eventType,
    where: r.ip,
    how: r.how ?? DEFAULT_AUDIT_HOW,
    category: r.category,
    actor: r.actorUserId ?? '',
    resourceType: r.resourceType ?? '',
    resourceRef: r.resourceRef ?? '',
    outcome: r.outcome,
    details: (r.details || '').slice(0, 2000),
    atUtc: r.atUtc!,
  }
}

export function verifyUserActivityAuditChain(): ChainVerifyResult {
  return verifyDescendingIntegrityChain(loadUserActivityAuditLog(), userActivityStableForVerify)
}

/**
 * A.2.2.1 logging helper — generates id/timestamp and persists.
 * Production equivalent: POST /audit/user-activity from API after each real event.
 */
export function recordUserActivityEvent(input: RecordUserActivityInput): UserActivityAuditEntry {
  const rows = read()
  const stamp = stampIntegrity(rows[0]?.entryHash, {
    subject: input.userId,
    what: input.eventType,
    where: input.ip ?? '127.0.0.1',
    how: input.how ?? DEFAULT_AUDIT_HOW,
    category: input.category,
    actor: input.actorUserId ?? '',
    resourceType: input.resourceType ?? '',
    resourceRef: input.resourceRef ?? '',
    outcome: input.outcome ?? 'Success',
    details: input.details.slice(0, 2000),
  })
  const entry: UserActivityAuditEntry = {
    id: nextId('UAA'),
    at: input.at ?? stamp.atUtc,
    atUtc: stamp.atUtc,
    category: input.category,
    eventType: input.eventType,
    userId: input.userId,
    actorUserId: input.actorUserId,
    outcome: input.outcome ?? 'Success',
    resourceType: input.resourceType,
    resourceRef: input.resourceRef,
    ip: input.ip ?? '127.0.0.1',
    details: input.details,
    how: stamp.how,
    clientDevice: stamp.clientDevice,
    previousEntryHash: stamp.previousEntryHash,
    entryHash: stamp.entryHash,
  }
  appendUserActivityAuditEntry(entry)
  createUserActivityAudit(entry).catch(console.error)
  return entry
}
