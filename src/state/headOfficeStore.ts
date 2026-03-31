/** A.1.4 Head Office policy (local demo) — replace with Java + Oracle security model. */

export type HoUserRole = 'HO Admin' | 'Checker' | 'Maker' | 'Finance' | 'Auditor'

export type RoleTxnPolicy = {
  role: HoUserRole
  /** Max amount maker can originate without extra checks (BDT equivalent, demo). */
  makerMaxTxnBdt: number
  /** Amounts at or above require checker authorization path. */
  checkerRequiredAboveBdt: number
}

export type BranchBlockPermission = {
  branchCode: string
  branchName: string
  canInitiateExchangeHouseBlock: boolean
}

const K_ROLE = 'frms.ho.rolePolicies.v1'
const K_EH = 'frms.ho.ehPayoutBlock.v1'
const K_BR = 'frms.ho.branchBlockPermission.v1'

export const HEAD_OFFICE_POLICY_EVENT = 'headOfficePolicy:changed'

function emit() {
  window.dispatchEvent(new CustomEvent(HEAD_OFFICE_POLICY_EVENT))
}

const defaultRolePolicies: RoleTxnPolicy[] = [
  { role: 'Maker', makerMaxTxnBdt: 500_000, checkerRequiredAboveBdt: 500_000 },
  { role: 'Checker', makerMaxTxnBdt: 9_999_999, checkerRequiredAboveBdt: 0 },
  { role: 'HO Admin', makerMaxTxnBdt: 9_999_999, checkerRequiredAboveBdt: 0 },
  { role: 'Finance', makerMaxTxnBdt: 2_000_000, checkerRequiredAboveBdt: 500_000 },
  { role: 'Auditor', makerMaxTxnBdt: 0, checkerRequiredAboveBdt: 0 },
]

export function loadRolePolicies(): RoleTxnPolicy[] {
  try {
    const s = localStorage.getItem(K_ROLE)
    if (!s) return defaultRolePolicies.map((r) => ({ ...r }))
    const parsed = JSON.parse(s) as RoleTxnPolicy[]
    return Array.isArray(parsed) && parsed.length ? parsed : defaultRolePolicies.map((r) => ({ ...r }))
  } catch {
    return defaultRolePolicies.map((r) => ({ ...r }))
  }
}

export function saveRolePolicies(rows: RoleTxnPolicy[]) {
  localStorage.setItem(K_ROLE, JSON.stringify(rows))
  emit()
}

/** Exchange house agent `code` → block account-pay / payout file (demo flag). */
export function loadEhPayoutBlocks(): Record<string, boolean> {
  try {
    const s = localStorage.getItem(K_EH)
    if (!s) return {}
    return JSON.parse(s) as Record<string, boolean>
  } catch {
    return {}
  }
}

export function setEhPayoutBlocked(agentCode: string, blocked: boolean) {
  const cur = loadEhPayoutBlocks()
  if (blocked) cur[agentCode] = true
  else delete cur[agentCode]
  localStorage.setItem(K_EH, JSON.stringify(cur))
  emit()
}

export function isEhPayoutBlocked(agentCode: string): boolean {
  return Boolean(loadEhPayoutBlocks()[agentCode])
}

export function loadBranchBlockPermissions(): BranchBlockPermission[] {
  try {
    const s = localStorage.getItem(K_BR)
    if (!s) return []
    const parsed = JSON.parse(s) as BranchBlockPermission[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function upsertBranchBlockPermission(row: BranchBlockPermission) {
  const rows = loadBranchBlockPermissions().filter((r) => r.branchCode !== row.branchCode)
  rows.push(row)
  localStorage.setItem(K_BR, JSON.stringify(rows))
  emit()
}

export function getPolicyForRole(role: HoUserRole): RoleTxnPolicy | undefined {
  return loadRolePolicies().find((r) => r.role === role)
}
