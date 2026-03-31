import {
  liveGetUserActivityAudit,
  livePostUserActivityAudit,
  liveDeleteUserActivityAudit
} from '../../api/live/client'

function live() { return import.meta.env.VITE_USE_LIVE_API === 'true' }

export async function getUserActivityAudit(): Promise<any[]> {
  if (live()) {
    try { return await liveGetUserActivityAudit() } catch {}
  }
  return []
}

export async function createUserActivityAudit(audit: any): Promise<any> {
  if (live()) {
    try {
      return await livePostUserActivityAudit(audit)
    } catch (e) {}
  }
  return audit
}

export async function deleteUserActivityAudit(): Promise<any> {
  if (live()) {
    try {
      return await liveDeleteUserActivityAudit()
    } catch (e) {}
  }
  return null
}
