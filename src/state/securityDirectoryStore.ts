/**
 * User directory + security module (local demo). Items #14–15 & User Rights — sync with Java/IAM in production.
 */

import {
  DEFAULT_AUDIT_HOW,
  stampIntegrity,
  verifyDescendingIntegrityChain,
  type ChainVerifyResult,
} from '../lib/auditIntegrity'

export type ApprovalStatus = 'Active' | 'Pending Approval' | 'Approved' | 'Rejected' | 'On Hold' | 'Disabled'

export type UserRealm = 'ho' | 'branch' | 'exchange_house'

export type DirectoryUser = {
  id: string
  username: string
  fullName: string
  role: 'HO Admin' | 'Checker' | 'Maker' | 'Finance' | 'Auditor'
  branch: string
  realm: UserRealm
  /** #14 — exchange-house branch / counter (when realm is exchange_house). */
  ehBranchUnit?: string
  status: ApprovalStatus
  maker: string
  checker?: string
  createdAt: string
  employeeId?: string
  /** Assigned module rights (keys). */
  rights: string[]
  financialTxnLimitBdt: number
  /** #5 User Rights — HO user funding ceiling (BDT); 0 when not applicable. */
  hoFundingLimitBdt: number
}

export type EmployeeRecord = {
  id: string
  employeeNo: string
  fullName: string
  department: string
  designation: string
  email: string
  phone: string
  linkedUsername?: string
  status: 'Active' | 'Inactive'
}

export type SecurityAuditEntry = {
  id: string
  at: string
  atUtc?: string
  actor: string
  action: string
  details?: string
  how?: string
  clientDevice?: string
  previousEntryHash?: string | null
  entryHash?: string
}

export type UserActivityEntry = {
  id: string
  at: string
  atUtc?: string
  username: string
  action: string
  ip?: string
  how?: string
  clientDevice?: string
  previousEntryHash?: string | null
  entryHash?: string
}

export const ASSIGNABLE_RIGHTS: { key: string; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'remittance', label: 'Remittance' },
  { key: 'compliance', label: 'Compliance' },
  { key: 'finance', label: 'Finance & GL' },
  { key: 'reports', label: 'Reports' },
  { key: 'head_office', label: 'Head office' },
  { key: 'admin', label: 'Administration' },
  { key: 'security', label: 'User rights / Security' },
]

const KU = 'frms.security.directory.users.v1'
const KE = 'frms.security.employees.v1'
const KA = 'frms.security.audit.v1'
const KV = 'frms.security.activity.v1'

export const SECURITY_DIRECTORY_EVENT = 'securityDirectory:changed'

function emit() {
  window.dispatchEvent(new CustomEvent(SECURITY_DIRECTORY_EVENT))
}

function nowStr() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase()
}

export function defaultRightsForRole(role: DirectoryUser['role']): string[] {
  if (role === 'HO Admin') return ASSIGNABLE_RIGHTS.map((r) => r.key)
  if (role === 'Auditor') return ['dashboard', 'reports', 'compliance', 'admin', 'security']
  if (role === 'Finance') return ['dashboard', 'finance', 'reports', 'remittance']
  return ['dashboard', 'remittance', 'reports']
}

function seedUsers(): DirectoryUser[] {
  return [
    {
      id: 'USR-001',
      username: 'ho_admin',
      fullName: 'Head Office Admin',
      role: 'HO Admin',
      branch: 'Head Office',
      realm: 'ho',
      status: 'Active',
      maker: 'System',
      checker: 'System',
      createdAt: '2026-03-01 09:00',
      employeeId: 'EMP-001',
      rights: defaultRightsForRole('HO Admin'),
      financialTxnLimitBdt: 99_999_999,
      hoFundingLimitBdt: 500_000_000,
    },
    {
      id: 'USR-102',
      username: 'branch01_maker',
      fullName: 'Branch 01 Maker',
      role: 'Maker',
      branch: 'Branch-01',
      realm: 'branch',
      status: 'Pending Approval',
      maker: 'HO Admin',
      createdAt: '2026-03-25 10:40',
      employeeId: 'EMP-102',
      rights: defaultRightsForRole('Maker'),
      financialTxnLimitBdt: 500_000,
      hoFundingLimitBdt: 0,
    },
    {
      id: 'USR-205',
      username: 'finance_checker',
      fullName: 'Finance Checker',
      role: 'Finance',
      branch: 'Head Office',
      realm: 'ho',
      status: 'On Hold',
      maker: 'HO Admin',
      createdAt: '2026-03-24 16:10',
      rights: defaultRightsForRole('Finance'),
      financialTxnLimitBdt: 5_000_000,
      hoFundingLimitBdt: 25_000_000,
    },
    {
      id: 'USR-330',
      username: 'eh_gulf_ops',
      fullName: 'Gulf Exchange House Operator',
      role: 'Maker',
      branch: 'EH-GULF-01',
      realm: 'exchange_house',
      ehBranchUnit: 'EH-GULF-01 / Counter-A',
      status: 'Active',
      maker: 'HO Admin',
      checker: 'HO Admin',
      createdAt: '2026-03-10 08:15',
      employeeId: 'EMP-330',
      rights: ['dashboard', 'remittance', 'reports'],
      financialTxnLimitBdt: 1_000_000,
      hoFundingLimitBdt: 0,
    },
  ]
}

function normalizeUser(raw: DirectoryUser): DirectoryUser {
  return {
    ...raw,
    rights: Array.isArray(raw.rights) && raw.rights.length ? raw.rights : defaultRightsForRole(raw.role),
    financialTxnLimitBdt: Number.isFinite(raw.financialTxnLimitBdt) ? raw.financialTxnLimitBdt : 500_000,
    hoFundingLimitBdt: Number.isFinite(raw.hoFundingLimitBdt) ? raw.hoFundingLimitBdt : 0,
    ehBranchUnit: raw.ehBranchUnit ?? '',
  }
}

export function loadDirectoryUsers(): DirectoryUser[] {
  try {
    const s = localStorage.getItem(KU)
    if (!s) {
      const seed = seedUsers()
      localStorage.setItem(KU, JSON.stringify(seed))
      return seed
    }
    const parsed = JSON.parse(s) as DirectoryUser[]
    if (!Array.isArray(parsed)) return seedUsers()
    return parsed.map(normalizeUser)
  } catch {
    return seedUsers()
  }
}

export function saveDirectoryUsers(rows: DirectoryUser[]) {
  localStorage.setItem(KU, JSON.stringify(rows))
  emit()
}

function seedEmployees(): EmployeeRecord[] {
  return [
    {
      id: 'EMP-001',
      employeeNo: 'HO-0001',
      fullName: 'Head Office Admin',
      department: 'Operations',
      designation: 'HO Administrator',
      email: 'ho.admin@example.com',
      phone: '+880-1700-000001',
      linkedUsername: 'ho_admin',
      status: 'Active',
    },
    {
      id: 'EMP-102',
      employeeNo: 'BR-0102',
      fullName: 'Branch 01 Maker',
      department: 'Branch Ops',
      designation: 'Senior Teller',
      email: 'branch01.maker@example.com',
      phone: '+880-1700-000102',
      linkedUsername: 'branch01_maker',
      status: 'Active',
    },
    {
      id: 'EMP-330',
      employeeNo: 'EH-0330',
      fullName: 'Gulf Exchange House Operator',
      department: 'Exchange House',
      designation: 'EH Branch Operator',
      email: 'gulf.ops@example.com',
      phone: '+966-500-000330',
      linkedUsername: 'eh_gulf_ops',
      status: 'Active',
    },
  ]
}

export function loadEmployees(): EmployeeRecord[] {
  try {
    const s = localStorage.getItem(KE)
    if (!s) {
      const seed = seedEmployees()
      localStorage.setItem(KE, JSON.stringify(seed))
      return seed
    }
    const parsed = JSON.parse(s) as EmployeeRecord[]
    return Array.isArray(parsed) ? parsed : seedEmployees()
  } catch {
    return seedEmployees()
  }
}

export function saveEmployees(rows: EmployeeRecord[]) {
  localStorage.setItem(KE, JSON.stringify(rows))
  emit()
}

export function appendEmployee(row: Omit<EmployeeRecord, 'id'>) {
  const rows = loadEmployees()
  rows.unshift({ ...row, id: uid('EMP') })
  saveEmployees(rows)
}

export function updateEmployee(id: string, patch: Partial<EmployeeRecord>) {
  saveEmployees(loadEmployees().map((e) => (e.id === id ? { ...e, ...patch } : e)))
}

function readAudit(): SecurityAuditEntry[] {
  try {
    const s = localStorage.getItem(KA)
    if (!s) return []
    return JSON.parse(s) as SecurityAuditEntry[]
  } catch {
    return []
  }
}

function readActivity(): UserActivityEntry[] {
  try {
    const s = localStorage.getItem(KV)
    if (!s) return []
    return JSON.parse(s) as UserActivityEntry[]
  } catch {
    return []
  }
}

export function loadSecurityAuditLog(): SecurityAuditEntry[] {
  return readAudit().slice(0, 500)
}

export function loadUserActivityLog(): UserActivityEntry[] {
  return readActivity().slice(0, 500)
}

function securityAuditStableForVerify(r: SecurityAuditEntry): Record<string, string> {
  return {
    who: r.actor,
    what: r.action,
    where: '127.0.0.1',
    how: r.how ?? DEFAULT_AUDIT_HOW,
    details: (r.details || '').slice(0, 2000),
    atUtc: r.atUtc!,
  }
}

function userActivityModuleStableForVerify(r: UserActivityEntry): Record<string, string> {
  return {
    who: r.username,
    what: r.action,
    where: r.ip ?? '127.0.0.1',
    how: r.how ?? DEFAULT_AUDIT_HOW,
    atUtc: r.atUtc!,
  }
}

export function verifySecurityAuditChain(): ChainVerifyResult {
  return verifyDescendingIntegrityChain(loadSecurityAuditLog(), securityAuditStableForVerify)
}

export function verifySecurityUserActivityChain(): ChainVerifyResult {
  return verifyDescendingIntegrityChain(loadUserActivityLog(), userActivityModuleStableForVerify)
}

export function appendSecurityAudit(actor: string, action: string, details?: string, opts?: { how?: string }) {
  const rows = readAudit()
  const stamp = stampIntegrity(rows[0]?.entryHash, {
    who: actor,
    what: action,
    where: '127.0.0.1',
    how: opts?.how ?? DEFAULT_AUDIT_HOW,
    details: (details || '').slice(0, 2000),
  })
  rows.unshift({
    id: uid('AUD'),
    at: stamp.atUtc,
    atUtc: stamp.atUtc,
    actor,
    action,
    details,
    how: stamp.how,
    clientDevice: stamp.clientDevice,
    previousEntryHash: stamp.previousEntryHash,
    entryHash: stamp.entryHash,
  })
  localStorage.setItem(KA, JSON.stringify(rows.slice(0, 500)))
  emit()
}

export function appendUserActivity(username: string, action: string, ip?: string, opts?: { how?: string }) {
  const rows = readActivity()
  const where = ip ?? '127.0.0.1'
  const stamp = stampIntegrity(rows[0]?.entryHash, {
    who: username,
    what: action,
    where,
    how: opts?.how ?? DEFAULT_AUDIT_HOW,
    details: '',
  })
  rows.unshift({
    id: uid('ACT'),
    at: stamp.atUtc,
    atUtc: stamp.atUtc,
    username,
    action,
    ip: where,
    how: stamp.how,
    clientDevice: stamp.clientDevice,
    previousEntryHash: stamp.previousEntryHash,
    entryHash: stamp.entryHash,
  })
  localStorage.setItem(KV, JSON.stringify(rows.slice(0, 500)))
  emit()
}

export type NewDirectoryUserInput = {
  username: string
  fullName: string
  role: DirectoryUser['role']
  branch: string
  realm: UserRealm
  ehBranchUnit?: string
  status: ApprovalStatus
  maker: string
  employeeId?: string
  rights?: string[]
  financialTxnLimitBdt?: number
  hoFundingLimitBdt?: number
}

export function addDirectoryUser(input: NewDirectoryUserInput) {
  const row: DirectoryUser = {
    id: uid('USR'),
    username: input.username.trim(),
    fullName: input.fullName.trim(),
    role: input.role,
    branch: input.branch.trim(),
    realm: input.realm,
    ehBranchUnit: input.ehBranchUnit?.trim() || '',
    status: input.status,
    maker: input.maker,
    checker: '',
    createdAt: nowStr(),
    employeeId: input.employeeId?.trim() || undefined,
    rights: input.rights?.length ? input.rights : defaultRightsForRole(input.role),
    financialTxnLimitBdt: input.financialTxnLimitBdt ?? 500_000,
    hoFundingLimitBdt: input.hoFundingLimitBdt ?? (input.realm === 'ho' ? 10_000_000 : 0),
  }
  saveDirectoryUsers([row, ...loadDirectoryUsers()])
  appendSecurityAudit('SecurityAdmin', 'User created', `${row.username} / ${row.role}`, {
    how: 'SECURITY_DIRECTORY_API',
  })
  appendUserActivity(row.username, 'Account created', undefined, { how: 'SECURITY_DIRECTORY_API' })
  return row
}

export function updateDirectoryUser(id: string, patch: Partial<DirectoryUser>) {
  const rows = loadDirectoryUsers().map((u) => (u.id === id ? normalizeUser({ ...u, ...patch } as DirectoryUser) : u))
  saveDirectoryUsers(rows)
  appendSecurityAudit('SecurityAdmin', 'User updated', id, { how: 'SECURITY_DIRECTORY_API' })
}
