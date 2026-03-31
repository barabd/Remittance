import {
  loadRolePolicies as localRoles,
  saveRolePolicies as localSaveRoles,
  loadEhPayoutBlocks as localEhBlocks,
  setEhPayoutBlocked as localSetEhBlock,
  loadBranchBlockPermissions as localBranchPerms,
  upsertBranchBlockPermission as localUpsertBranchPerm,
  type RoleTxnPolicy,
  type BranchBlockPermission
} from '../../state/headOfficeStore'

import {
  liveGetRolePolicies,
  liveSaveRolePolicies,
  liveGetEhBlocks,
  liveSetEhBlock,
  liveGetBranchPerms,
  liveUpsertBranchPerm
} from '../../api/live/client'

function live() { return import.meta.env.VITE_USE_LIVE_API === 'true' }

export async function getRolePolicies(): Promise<RoleTxnPolicy[]> {
  if(live()) {
    try { return await liveGetRolePolicies() } catch(e){}
  }
  return localRoles()
}

export async function saveRolePolicies(rows: RoleTxnPolicy[]) {
  if (live()) {
    try {
      await liveSaveRolePolicies(rows)
      return
    } catch (e) {}
  }
  localSaveRoles(rows)
}

export async function getEhBlocks(): Promise<Record<string, boolean>> {
  if(live()) {
    try { return await liveGetEhBlocks() } catch(e){}
  }
  return localEhBlocks()
}

export async function setEhBlock(code: string, blocked: boolean) {
  if (live()) {
    try {
      await liveSetEhBlock(code, blocked)
      return
    } catch (e) {}
  }
  localSetEhBlock(code, blocked)
}

export async function getBranchPerms(): Promise<BranchBlockPermission[]> {
  if(live()) {
    try{ return await liveGetBranchPerms() } catch(e){}
  }
  return localBranchPerms()
}

export async function upsertBranchPerm(row: BranchBlockPermission) {
  if (live()) {
    try {
      await liveUpsertBranchPerm(row)
      return
    } catch (e) {}
  }
  localUpsertBranchPerm(row)
}
