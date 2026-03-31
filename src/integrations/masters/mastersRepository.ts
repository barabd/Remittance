/**
 * Single merge point for masters CRUD: VITE_USE_LIVE_API → Java + MSSQL, else localStorage + seeds.
 */

import {
  liveApproveAgent,
  liveApproveBeneficiary,
  liveRejectAgent,
  liveApproveCoverFund,
  liveCreateAgent,
  liveCreateBeneficiary,
  liveRejectBeneficiary,
  liveCreateCoverFund,
  liveListAgents,
  liveListBeneficiaries,
  liveListCoverFunds,
  livePatchAgent,
  livePatchBeneficiary,
  livePatchCoverFund,
} from '../../api/live/client'
import { ApiHttpError } from '../../api/http'
import { nowTs } from '../../lib/datetimeIds'
import { DEFAULT_CHECKER, DEFAULT_MAKER } from './constants'
import * as local from './mastersLocal'
import type { AgentRecord, BeneficiaryRecord, CoverFundRecord, MasterApprovalStatus } from './types'

export type MastersPullScope = 'beneficiaries' | 'agents' | 'coverFunds' | 'all'

function frmsLiveApiEnabled(): boolean {
  return import.meta.env.VITE_USE_LIVE_API === 'true'
}

function isRecoverableLiveFailure(error: unknown): boolean {
  return error instanceof TypeError || (error instanceof ApiHttpError && (error.status === 404 || error.status >= 500))
}

function pickDelta<T extends Record<string, unknown>>(cur: T, next: T): Partial<T> {
  const out: Partial<T> = {}
  for (const k of Object.keys(next) as (keyof T)[]) {
    if (k === ('id' as keyof T)) continue
    if (cur[k] !== next[k]) out[k] = next[k]
  }
  return out
}

export async function syncMastersFromLive(scope: MastersPullScope): Promise<void> {
  if (!frmsLiveApiEnabled()) return
  if (scope === 'beneficiaries' || scope === 'all') {
    const p = await liveListBeneficiaries()
    local.saveBeneficiaries(p.items)
  }
  if (scope === 'agents' || scope === 'all') {
    const p = await liveListAgents()
    local.saveAgents(p.items)
  }
  if (scope === 'coverFunds' || scope === 'all') {
    const p = await liveListCoverFunds()
    local.saveCoverFunds(p.items)
  }
}

export function loadBeneficiaries(): BeneficiaryRecord[] {
  return local.loadBeneficiaries()
}

export function saveBeneficiaries(rows: BeneficiaryRecord[]) {
  local.saveBeneficiaries(rows)
}

export function loadAgents(): AgentRecord[] {
  return local.loadAgents()
}

export function saveAgents(rows: AgentRecord[]) {
  local.saveAgents(rows)
}

export function loadCoverFunds(): CoverFundRecord[] {
  return local.loadCoverFunds()
}

export function saveCoverFunds(rows: CoverFundRecord[]) {
  local.saveCoverFunds(rows)
}

export function getMastersDashboardCounts() {
  return local.getMastersDashboardCounts()
}

export function addBeneficiary(
  input: Omit<BeneficiaryRecord, 'id' | 'status' | 'maker' | 'createdAt' | 'checker'>,
): Promise<BeneficiaryRecord> {
  if (!frmsLiveApiEnabled()) return Promise.resolve(local.addBeneficiary(input))
  return liveCreateBeneficiary({
    ...input,
    status: 'Pending Approval',
    maker: DEFAULT_MAKER,
    createdAt: nowTs(),
  }).then((created) => {
    local.saveBeneficiaries([created, ...local.loadBeneficiaries().filter((r) => r.id !== created.id)])
    return created
  }).catch((error: unknown) => {
    if (!isRecoverableLiveFailure(error)) throw error
    return local.addBeneficiary(input)
  })
}

export function updateBeneficiary(
  id: string,
  patch: Partial<BeneficiaryRecord>,
): Promise<BeneficiaryRecord | null> {
  if (!frmsLiveApiEnabled()) return Promise.resolve(local.updateBeneficiary(id, patch))
  const cur = local.loadBeneficiaries().find((r) => r.id === id)
  const nextRow = local.previewUpdateBeneficiary(id, patch)
  if (!cur || !nextRow) return Promise.resolve(null)
  const delta = pickDelta(cur as unknown as Record<string, unknown>, nextRow as unknown as Record<string, unknown>)
  if (Object.keys(delta).length === 0) return Promise.resolve(nextRow)
  return livePatchBeneficiary(id, delta as Partial<BeneficiaryRecord>).then((updated) => {
    const rows = local.loadBeneficiaries().map((r) => (r.id === id ? updated : r))
    local.saveBeneficiaries(rows)
    return updated
  }).catch((error: unknown) => {
    if (!isRecoverableLiveFailure(error)) throw error
    return local.updateBeneficiary(id, patch)
  })
}

export function addAgent(input: Omit<AgentRecord, 'id' | 'status' | 'maker' | 'createdAt' | 'checker'>): Promise<AgentRecord> {
  if (!frmsLiveApiEnabled()) return Promise.resolve(local.addAgent(input))
  return liveCreateAgent({
    ...input,
    status: 'Pending Approval',
    maker: DEFAULT_MAKER,
    createdAt: nowTs(),
  }).then((created) => {
    local.saveAgents([created, ...local.loadAgents().filter((r) => r.id !== created.id)])
    return created
  })
}

export function updateAgent(id: string, patch: Partial<AgentRecord>): Promise<AgentRecord | null> {
  if (!frmsLiveApiEnabled()) return Promise.resolve(local.updateAgent(id, patch))
  const cur = local.loadAgents().find((r) => r.id === id)
  const nextRow = local.previewUpdateAgent(id, patch)
  if (!cur || !nextRow) return Promise.resolve(null)
  const delta = pickDelta(cur as unknown as Record<string, unknown>, nextRow as unknown as Record<string, unknown>)
  if (Object.keys(delta).length === 0) return Promise.resolve(nextRow)
  return livePatchAgent(id, delta as Partial<AgentRecord>).then((updated) => {
    const rows = local.loadAgents().map((r) => (r.id === id ? updated : r))
    local.saveAgents(rows)
    return updated
  })
}

export function addCoverFund(
  input: Omit<CoverFundRecord, 'id' | 'status' | 'maker' | 'checker' | 'updatedAt'>,
): Promise<CoverFundRecord> {
  if (!frmsLiveApiEnabled()) return Promise.resolve(local.addCoverFund(input))
  return liveCreateCoverFund({
    ...input,
    status: 'Pending Approval',
    maker: DEFAULT_MAKER,
    updatedAt: nowTs(),
  }).then((created) => {
    local.saveCoverFunds([created, ...local.loadCoverFunds().filter((r) => r.id !== created.id)])
    return created
  })
}

export function updateCoverFund(id: string, patch: Partial<CoverFundRecord>): Promise<CoverFundRecord | null> {
  if (!frmsLiveApiEnabled()) return Promise.resolve(local.updateCoverFund(id, patch))
  const cur = local.loadCoverFunds().find((r) => r.id === id)
  const nextRow = local.previewUpdateCoverFund(id, patch)
  if (!cur || !nextRow) return Promise.resolve(null)
  const delta = pickDelta(cur as unknown as Record<string, unknown>, nextRow as unknown as Record<string, unknown>)
  if (Object.keys(delta).length === 0) return Promise.resolve(nextRow)
  return livePatchCoverFund(id, delta as Partial<CoverFundRecord>).then((updated) => {
    const rows = local.loadCoverFunds().map((r) => (r.id === id ? updated : r))
    local.saveCoverFunds(rows)
    return updated
  })
}

export function setMasterStatusBeneficiary(id: string, status: MasterApprovalStatus): Promise<void> {
  if (!frmsLiveApiEnabled()) {
    local.setMasterStatusBeneficiary(id, status)
    return Promise.resolve()
  }
  if (status === 'Active') {
    return liveApproveBeneficiary(id, { checkerUser: DEFAULT_CHECKER }).then((updated) => {
      const rows = local.loadBeneficiaries().map((r) => (r.id === id ? updated : r))
      local.saveBeneficiaries(rows)
    }).catch((error: unknown) => {
      if (!isRecoverableLiveFailure(error)) throw error
      local.setMasterStatusBeneficiary(id, status)
    })
  }
  if (status === 'Rejected') {
    return liveRejectBeneficiary(id, { checkerUser: DEFAULT_CHECKER }).then((updated) => {
      const rows = local.loadBeneficiaries().map((r) => (r.id === id ? updated : r))
      local.saveBeneficiaries(rows)
    }).catch((error: unknown) => {
      if (!isRecoverableLiveFailure(error)) throw error
      local.setMasterStatusBeneficiary(id, status)
    })
  }
  const patch: Partial<BeneficiaryRecord> = { status }
  if (status === 'Approved') patch.checker = DEFAULT_CHECKER
  return livePatchBeneficiary(id, patch).then((updated) => {
    const rows = local.loadBeneficiaries().map((r) => (r.id === id ? updated : r))
    local.saveBeneficiaries(rows)
  }).catch((error: unknown) => {
    if (!isRecoverableLiveFailure(error)) throw error
    local.setMasterStatusBeneficiary(id, status)
  })
}

export function setMasterStatusAgent(id: string, status: MasterApprovalStatus): Promise<void> {
  if (!frmsLiveApiEnabled()) {
    local.setMasterStatusAgent(id, status)
    return Promise.resolve()
  }
  if (status === 'Active') {
    return liveApproveAgent(id, { checkerUser: DEFAULT_CHECKER }).then((updated) => {
      const rows = local.loadAgents().map((r) => (r.id === id ? updated : r))
      local.saveAgents(rows)
    })
  }
  if (status === 'Rejected') {
    return liveRejectAgent(id, { checkerUser: DEFAULT_CHECKER }).then((updated) => {
      const rows = local.loadAgents().map((r) => (r.id === id ? updated : r))
      local.saveAgents(rows)
    })
  }
  const patch: Partial<AgentRecord> = { status }
  if (status === 'Approved') patch.checker = DEFAULT_CHECKER
  return livePatchAgent(id, patch).then((updated) => {
    const rows = local.loadAgents().map((r) => (r.id === id ? updated : r))
    local.saveAgents(rows)
  })
}

export function setMasterStatusCoverFund(id: string, status: MasterApprovalStatus): Promise<void> {
  if (!frmsLiveApiEnabled()) {
    local.setMasterStatusCoverFund(id, status)
    return Promise.resolve()
  }
  const nextStatus = status === 'Approved' ? 'Active' : status
  if (status === 'Approved') {
    return liveApproveCoverFund(id).then((updated) => {
      const rows = local.loadCoverFunds().map((r) => (r.id === id ? updated : r))
      local.saveCoverFunds(rows)
    })
  }
  const patch: Partial<CoverFundRecord> = { status: nextStatus }
  if (nextStatus === 'Active' || nextStatus === 'Rejected') patch.checker = DEFAULT_CHECKER
  return livePatchCoverFund(id, patch).then((updated) => {
    const rows = local.loadCoverFunds().map((r) => (r.id === id ? updated : r))
    local.saveCoverFunds(rows)
  })
}
