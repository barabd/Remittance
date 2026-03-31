/**
 * Browser-only masters persistence + business rules (mirrors DB when offline).
 */

import { nextId, nowTs } from '../../lib/datetimeIds'
import { DEFAULT_CHECKER, DEFAULT_MAKER, LS_KEYS, MASTERS_CHANGED_EVENT } from './constants'
import type { AgentRecord, BeneficiaryRecord, CoverFundRecord, MasterApprovalStatus } from './types'

type MastersScope = 'beneficiaries' | 'agents' | 'coverFunds' | 'all'

function emit(scope: MastersScope) {
  window.dispatchEvent(new CustomEvent(MASTERS_CHANGED_EVENT, { detail: { scope } }))
}

function readLs<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeLs<T>(key: string, value: T, scope: MastersScope) {
  localStorage.setItem(key, JSON.stringify(value))
  emit(scope)
}

function seedBeneficiaries(): BeneficiaryRecord[] {
  return [
    {
      id: 'BEN-001',
      fullName: 'Rahim Uddin',
      phone: '+880 1711 ******',
      idDocumentRef: 'NID-****2188',
      bankName: 'Uttara Bank PLC',
      bankAccountMasked: '********4521',
      branch: 'Branch-01',
      status: 'Active',
      maker: 'System',
      checker: 'System',
      createdAt: '2026-03-01 10:00',
    },
    {
      id: 'BEN-002',
      fullName: 'Karim Mia',
      phone: '+880 1812 ******',
      idDocumentRef: 'NID-****9031',
      bankName: 'Uttara Bank PLC',
      bankAccountMasked: '********8890',
      branch: 'Sub-Branch-03',
      status: 'Pending Approval',
      maker: 'Branch-01',
      createdAt: '2026-03-25 11:20',
    },
  ]
}

function seedAgents(): AgentRecord[] {
  return [
    {
      id: 'AGT-001',
      code: 'EH-DXB-01',
      name: 'Gulf Remit LLC',
      type: 'Exchange House',
      country: 'AE',
      contactPhone: '+971 4 *** ****',
      status: 'Active',
      maker: 'System',
      checker: 'System',
      createdAt: '2026-03-01 10:00',
    },
    {
      id: 'AGT-002',
      code: 'EH-RUH-02',
      name: 'Saudi Fast Transfer',
      type: 'Exchange House',
      country: 'SA',
      contactPhone: '+966 11 *** ****',
      status: 'Pending Approval',
      maker: 'HO-Maker',
      createdAt: '2026-03-25 09:10',
    },
  ]
}

function seedCoverFunds(): CoverFundRecord[] {
  return [
    {
      id: 'CF-001',
      fundCode: 'USD-VOSTRO-UB',
      partnerName: 'Correspondent Bank A',
      currency: 'USD',
      balanceAmount: 1_250_000,
      status: 'Active',
      maker: 'System',
      checker: 'System',
      updatedAt: '2026-03-24 18:00',
    },
    {
      id: 'CF-002',
      fundCode: 'AED-NOSTRO-UB',
      partnerName: 'Partner Treasury AE',
      currency: 'AED',
      balanceAmount: 420_000,
      status: 'Pending Approval',
      maker: 'Finance-01',
      updatedAt: '2026-03-25 08:30',
      notes: 'Opening balance adjustment proposal',
    },
    {
      id: 'CF-003',
      fundCode: 'BDT-NOSTRO-UB',
      partnerName: 'Uttara Bank Bangladesh',
      currency: 'BDT',
      balanceAmount: 50_000_000,
      status: 'Active',
      maker: 'System',
      checker: 'System',
      updatedAt: '2026-03-24 18:00',
    },
  ]
}

export function loadBeneficiaries(): BeneficiaryRecord[] {
  const rows = readLs<BeneficiaryRecord[] | null>(LS_KEYS.beneficiaries, null)
  if (!rows?.length) {
    const seed = seedBeneficiaries()
    writeLs(LS_KEYS.beneficiaries, seed, 'beneficiaries')
    return seed
  }
  return rows
}

export function saveBeneficiaries(rows: BeneficiaryRecord[]) {
  writeLs(LS_KEYS.beneficiaries, rows, 'beneficiaries')
}

export function loadAgents(): AgentRecord[] {
  const rows = readLs<AgentRecord[] | null>(LS_KEYS.agents, null)
  if (!rows?.length) {
    const seed = seedAgents()
    writeLs(LS_KEYS.agents, seed, 'agents')
    return seed
  }
  return rows
}

export function saveAgents(rows: AgentRecord[]) {
  writeLs(LS_KEYS.agents, rows, 'agents')
}

export function loadCoverFunds(): CoverFundRecord[] {
  const rows = readLs<CoverFundRecord[] | null>(LS_KEYS.coverFunds, null)
  if (!rows?.length) {
    const seed = seedCoverFunds()
    writeLs(LS_KEYS.coverFunds, seed, 'coverFunds')
    return seed
  }
  // Ensure BDT cover fund exists (migration for existing data)
  const hasBdt = rows.some((r) => r.currency === 'BDT')
  if (!hasBdt) {
    const bdtFund: CoverFundRecord = {
      id: 'CF-003',
      fundCode: 'BDT-NOSTRO-UB',
      partnerName: 'Uttara Bank Bangladesh',
      currency: 'BDT',
      balanceAmount: 50_000_000,
      status: 'Active',
      maker: 'System',
      checker: 'System',
      updatedAt: '2026-03-24 18:00',
    }
    const updated = [bdtFund, ...rows]
    writeLs(LS_KEYS.coverFunds, updated, 'coverFunds')
    return updated
  }
  return rows
}

export function saveCoverFunds(rows: CoverFundRecord[]) {
  writeLs(LS_KEYS.coverFunds, rows, 'coverFunds')
}

export function addBeneficiary(input: Omit<BeneficiaryRecord, 'id' | 'status' | 'maker' | 'createdAt' | 'checker'>) {
  const rows = loadBeneficiaries()
  const row: BeneficiaryRecord = {
    ...input,
    id: nextId('BEN'),
    status: 'Pending Approval',
    maker: DEFAULT_MAKER,
    createdAt: nowTs(),
  }
  saveBeneficiaries([row, ...rows])
  return row
}

export function previewUpdateBeneficiary(id: string, patch: Partial<BeneficiaryRecord>): BeneficiaryRecord | null {
  const rows = loadBeneficiaries()
  const idx = rows.findIndex((r) => r.id === id)
  if (idx < 0) return null
  const cur = rows[idx]
  const nextRow: BeneficiaryRecord = { ...cur, ...patch, id: cur.id }
  const reapprove =
    patch.fullName !== undefined ||
    patch.phone !== undefined ||
    patch.bankAccountMasked !== undefined ||
    patch.bankName !== undefined
  if (reapprove && cur.status === 'Active') {
    nextRow.status = 'Pending Approval'
    nextRow.checker = undefined
    nextRow.maker = DEFAULT_MAKER
  }
  return nextRow
}

export function updateBeneficiary(id: string, patch: Partial<BeneficiaryRecord>) {
  const rows = loadBeneficiaries()
  const idx = rows.findIndex((r) => r.id === id)
  if (idx < 0) return null
  const nextRow = previewUpdateBeneficiary(id, patch)
  if (!nextRow) return null
  rows[idx] = nextRow
  saveBeneficiaries(rows)
  return nextRow
}

export function addAgent(input: Omit<AgentRecord, 'id' | 'status' | 'maker' | 'createdAt' | 'checker'>) {
  const rows = loadAgents()
  const row: AgentRecord = {
    ...input,
    id: nextId('AGT'),
    status: 'Pending Approval',
    maker: DEFAULT_MAKER,
    createdAt: nowTs(),
  }
  saveAgents([row, ...rows])
  return row
}

export function previewUpdateAgent(id: string, patch: Partial<AgentRecord>): AgentRecord | null {
  const rows = loadAgents()
  const idx = rows.findIndex((r) => r.id === id)
  if (idx < 0) return null
  const cur = rows[idx]
  const nextRow: AgentRecord = { ...cur, ...patch, id: cur.id }
  if (
    cur.status === 'Active' &&
    (patch.name !== undefined ||
      patch.code !== undefined ||
      patch.contactPhone !== undefined ||
      patch.type !== undefined)
  ) {
    nextRow.status = 'Pending Approval'
    nextRow.checker = undefined
    nextRow.maker = DEFAULT_MAKER
  }
  return nextRow
}

export function updateAgent(id: string, patch: Partial<AgentRecord>) {
  const rows = loadAgents()
  const idx = rows.findIndex((r) => r.id === id)
  if (idx < 0) return null
  const nextRow = previewUpdateAgent(id, patch)
  if (!nextRow) return null
  rows[idx] = nextRow
  saveAgents(rows)
  return nextRow
}

export function addCoverFund(input: Omit<CoverFundRecord, 'id' | 'status' | 'maker' | 'checker' | 'updatedAt'>) {
  const rows = loadCoverFunds()
  const row: CoverFundRecord = {
    ...input,
    id: nextId('CF'),
    status: 'Pending Approval',
    maker: DEFAULT_MAKER,
    updatedAt: nowTs(),
  }
  saveCoverFunds([row, ...rows])
  return row
}

export function previewUpdateCoverFund(id: string, patch: Partial<CoverFundRecord>): CoverFundRecord | null {
  const rows = loadCoverFunds()
  const idx = rows.findIndex((r) => r.id === id)
  if (idx < 0) return null
  const cur = rows[idx]
  const nextRow: CoverFundRecord = { ...cur, ...patch, id: cur.id, updatedAt: nowTs() }
  if (cur.status === 'Active' && (patch.balanceAmount !== undefined || patch.partnerName !== undefined)) {
    nextRow.status = 'Pending Approval'
    nextRow.checker = undefined
    nextRow.maker = DEFAULT_MAKER
  }
  return nextRow
}

export function updateCoverFund(id: string, patch: Partial<CoverFundRecord>) {
  const rows = loadCoverFunds()
  const idx = rows.findIndex((r) => r.id === id)
  if (idx < 0) return null
  const nextRow = previewUpdateCoverFund(id, patch)
  if (!nextRow) return null
  rows[idx] = nextRow
  saveCoverFunds(rows)
  return nextRow
}

export function setMasterStatusBeneficiary(id: string, status: MasterApprovalStatus) {
  const rows = loadBeneficiaries()
  const idx = rows.findIndex((r) => r.id === id)
  if (idx < 0) return
  rows[idx] = {
    ...rows[idx],
    status,
    checker:
      status === 'Active' || status === 'Approved' || status === 'Rejected'
        ? DEFAULT_CHECKER
        : rows[idx].checker,
  }
  saveBeneficiaries(rows)
}

export function setMasterStatusAgent(id: string, status: MasterApprovalStatus) {
  const rows = loadAgents()
  const idx = rows.findIndex((r) => r.id === id)
  if (idx < 0) return
  rows[idx] = {
    ...rows[idx],
    status,
    checker:
      status === 'Active' || status === 'Approved' || status === 'Rejected'
        ? DEFAULT_CHECKER
        : rows[idx].checker,
  }
  saveAgents(rows)
}

export function setMasterStatusCoverFund(id: string, status: MasterApprovalStatus) {
  const rows = loadCoverFunds()
  const idx = rows.findIndex((r) => r.id === id)
  if (idx < 0) return
  const nextStatus = status === 'Approved' ? 'Active' : status
  rows[idx] = {
    ...rows[idx],
    status: nextStatus,
    checker:
      nextStatus === 'Active' || nextStatus === 'Rejected' ? DEFAULT_CHECKER : rows[idx].checker,
  }
  saveCoverFunds(rows)
}

export function getMastersDashboardCounts() {
  const ben = loadBeneficiaries()
  const ag = loadAgents()
  const cf = loadCoverFunds()
  const pending = [...ben, ...ag, ...cf].filter((r) => r.status === 'Pending Approval').length
  const activeBen = ben.filter((r) => r.status === 'Active').length
  const activeAg = ag.filter((r) => r.status === 'Active').length
  const activeCf = cf.filter((r) => r.status === 'Active').length
  return { pending, activeBen, activeAg, activeCf }
}
