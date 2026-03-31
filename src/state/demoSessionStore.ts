/**
 * Demo console "acting as" role for RBAC previews. Production: OIDC claims / policy on API + route guards.
 */

import type { DirectoryUser } from './securityDirectoryStore'

export const DEMO_SESSION_EVENT = 'demoSession:changed'

const KEY = 'frms.demoConsoleRole.v1'

/** Roles allowed to open audit trail per policy (auditors + admins). */
export const AUDIT_TRAIL_ROLES = ['HO Admin', 'Auditor'] as const

export type DemoConsoleRole = DirectoryUser['role']

const ALL_ROLES: DemoConsoleRole[] = ['HO Admin', 'Checker', 'Maker', 'Finance', 'Auditor']

export function isAuditTrailRole(role: DemoConsoleRole): boolean {
  return role === 'HO Admin' || role === 'Auditor'
}

export function getDemoConsoleRole(): DemoConsoleRole {
  try {
    const raw = localStorage.getItem(KEY) as DemoConsoleRole | null
    if (raw && ALL_ROLES.includes(raw)) return raw
    const initial: DemoConsoleRole = 'HO Admin'
    localStorage.setItem(KEY, initial)
    return initial
  } catch {
    return 'HO Admin'
  }
}

export function setDemoConsoleRole(role: DemoConsoleRole) {
  localStorage.setItem(KEY, role)
  window.dispatchEvent(new CustomEvent(DEMO_SESSION_EVENT))
}

export function canAccessAuditTrail(): boolean {
  return isAuditTrailRole(getDemoConsoleRole())
}

export function listDemoRoles(): readonly DemoConsoleRole[] {
  return ALL_ROLES
}
