import {
  liveGetBranches,
  liveCreateBranch,
  livePatchBranch,
  liveGetPrivilegedAudit,
  livePostPrivilegedAudit
} from '../../api/live/client'

function live() { return import.meta.env.VITE_USE_LIVE_API === 'true' }

export async function getBranches(): Promise<any[]> {
  if (live()) {
    try {
      return (await liveGetBranches()).items ?? []
    } catch {}
  }
  return []
}

export async function createBranch(branch: any): Promise<any> {
  if (live()) {
    try {
      return await liveCreateBranch(branch)
    } catch (e) { throw e }
  }
  throw new Error('Live API is disabled')
}

export async function updateBranch(id: string, patch: any): Promise<any> {
  if (live()) {
    try {
      return await livePatchBranch(id, patch)
    } catch (e) { throw e }
  }
  throw new Error('Live API is disabled')
}

export async function getPrivilegedAudit(): Promise<any[]> {
  if (live()) {
    try { return (await liveGetPrivilegedAudit()).items ?? [] } catch {}
  }
  return []
}

export async function createPrivilegedAudit(audit: any): Promise<any> {
  if (live()) return await livePostPrivilegedAudit(audit)
  throw new Error('Live API is disabled')
}
