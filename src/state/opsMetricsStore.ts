/** Aggregated counts published by remittance worklist pages for dashboard KPIs. */

export type OpsMetrics = {
  remittanceSearchRows: number
  remittanceDisbursementRows: number
  queuePendingApprovals: number
}

export const OPS_METRICS_EVENT = 'opsMetrics:changed'

const KEY = 'frms.opsMetrics.v1'

const SEED: OpsMetrics = {
  remittanceSearchRows: 3,
  remittanceDisbursementRows: 3,
  queuePendingApprovals: 2,
}

function readLs(): OpsMetrics {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...SEED }
    const parsed = JSON.parse(raw) as Partial<OpsMetrics>
    return { ...SEED, ...parsed }
  } catch {
    return { ...SEED }
  }
}

export function loadOpsMetrics(): OpsMetrics {
  return readLs()
}

export function publishOpsMetrics(patch: Partial<OpsMetrics>) {
  const next = { ...loadOpsMetrics(), ...patch }
  localStorage.setItem(KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent(OPS_METRICS_EVENT, { detail: next }))
}

export function worklistTransactionTotal(ops: OpsMetrics) {
  return ops.remittanceSearchRows + ops.remittanceDisbursementRows
}
