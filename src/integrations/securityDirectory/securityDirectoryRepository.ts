import {
  loadDirectoryUsers as localUsers,
  addDirectoryUser as localAddUser,
  updateDirectoryUser as localUpdateUser,
  loadEmployees as localEmployees,
  appendEmployee as localAddEmployee,
  updateEmployee as localUpdateEmployee,
  loadSecurityAuditLog as localAudit,
  appendSecurityAudit as localAppendAudit,
  loadUserActivityLog as localActivity,
  appendUserActivity as localAppendActivity,
  type DirectoryUser,
  type EmployeeRecord,
  type SecurityAuditEntry,
  type UserActivityEntry,
  type NewDirectoryUserInput
} from '../../state/securityDirectoryStore'

import {
  liveGetUsers,
  liveCreateUser,
  liveUpdateUser,
  liveGetEmployees,
  liveCreateEmployee,
  liveUpdateEmployee,
  liveGetAudit,
  livePostAudit,
  liveGetActivity,
  livePostActivity
} from '../../api/live/client'

function live() { return import.meta.env.VITE_USE_LIVE_API === 'true' }

export async function getUsers(): Promise<DirectoryUser[]> {
  if(live()) {
    try {
      const users = await liveGetUsers()
      return users.map(u => ({...u, rights: u.rights ? u.rights.split(',').filter(Boolean) : []}))
    } catch(e) {}
  }
  return localUsers()
}

export async function addUser(input: NewDirectoryUserInput): Promise<DirectoryUser> {
  if(live()) {
    try {
      return await liveCreateUser({
        ...input, 
        rights: input.rights ? input.rights.join(',') : '',
        hoFundingLimitBdt: input.realm === 'ho' ? input.hoFundingLimitBdt ?? 10000000 : 0
      }) as any
    } catch (e) {}
  }
  return localAddUser(input)
}

export async function updateUser(id: string, patch: Partial<DirectoryUser>) {
  if(live()) {
    try {
      const p: any = {...patch}
      if(patch.rights) p.rights = patch.rights.join(',')
      await liveUpdateUser(id, p)
      return
    } catch (e) {}
  }
  localUpdateUser(id, patch)
}

export async function getEmployees(): Promise<EmployeeRecord[]> {
  if(live()) {
    try{ return await liveGetEmployees() } catch(e){}
  }
  return localEmployees()
}

export async function addEmployee(input: Omit<EmployeeRecord, 'id'>) {
  if (live()) {
    try {
      await liveCreateEmployee(input)
      return
    } catch (e) {}
  }
  localAddEmployee(input)
}

export async function updateEmployee(id: string, patch: Partial<EmployeeRecord>) {
  if (live()) {
    try {
      await liveUpdateEmployee(id, patch)
      return
    } catch (e) {}
  }
  localUpdateEmployee(id, patch)
}

export async function getAudit(): Promise<SecurityAuditEntry[]> {
  if(live()) {
    try{ return await liveGetAudit() } catch(e){}
  }
  return localAudit()
}

export async function appendAudit(actor: string, action: string, details?: string, opts?: {how?: string}) {
  if(live()) {
    try {
      await livePostAudit({actor, action, details, how: opts?.how})
      return
    } catch (e) {}
  }
  localAppendAudit(actor, action, details, opts)
}

export async function getActivity(): Promise<UserActivityEntry[]> {
  if(live()) {
    try{ return await liveGetActivity() } catch(e){}
  }
  return localActivity()
}

export async function appendActivity(username: string, action: string, ip?: string, opts?: {how?: string}) {
  if(live()) {
    try {
      await livePostActivity({username, action, ip, how: opts?.how})
      return
    } catch (e) {}
  }
  localAppendActivity(username, action, ip, opts)
}
