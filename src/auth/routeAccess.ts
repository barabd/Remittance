/**
 * Maps a route path to a module right key (matches backend `rights` CSV / ASSIGNABLE_RIGHTS).
 * Returns null when the path is always allowed (e.g. profile, login).
 */
export function requiredModuleForPath(pathname: string): string | null {
  if (pathname === '/login') return null
  if (pathname.startsWith('/profile')) return null

  if (pathname.startsWith('/tools/security')) return 'security'
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard')) return 'dashboard'
  if (
    pathname.startsWith('/operations') ||
    pathname.startsWith('/remittance') ||
    pathname.startsWith('/masters') ||
    pathname.startsWith('/exchange-house')
  ) {
    return 'remittance'
  }
  if (pathname.startsWith('/compliance')) return 'compliance'
  if (pathname.startsWith('/reconciliation') || pathname.startsWith('/finance')) return 'finance'
  if (pathname.startsWith('/integrations')) return 'remittance'
  if (pathname.startsWith('/head-office')) return 'head_office'
  if (pathname.startsWith('/security')) return 'security'
  if (pathname.startsWith('/administration') || pathname.startsWith('/audit')) return 'admin'
  if (pathname.startsWith('/tools')) return 'finance'

  return 'dashboard'
}

export function canAccessPath(rights: string[], pathname: string): boolean {
  const mod = requiredModuleForPath(pathname)
  if (mod === null) return true
  return rights.includes(mod)
}

/** Audit nav: JWT mode uses role; demo mode uses session role selector. */
export function canSeeAuditNav(
  jwtMode: boolean,
  userRole: string | undefined,
  demoCanAccessAudit: () => boolean,
): boolean {
  if (jwtMode) {
    return userRole === 'Auditor' || userRole === 'HO Admin'
  }
  return demoCanAccessAudit()
}
