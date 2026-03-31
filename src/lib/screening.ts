import { appendAmlAlert, createAmlAlertFromScreening } from '../state/amlAlertsStore'
import { runDoubleAmlScreening, type ScreeningHit } from './amlCompliance'

export type { ScreeningHit }

/** @deprecated Use runDoubleAmlScreening — kept for narrow compatibility */
export function evaluateKeywordHits(remitter: string, beneficiary: string): ScreeningHit | null {
  const hits = runDoubleAmlScreening(remitter, beneficiary, '', '')
  return hits[0] ?? null
}

export function evaluateScreening(
  remitter: string,
  beneficiary: string,
  remittanceNo: string,
  corridor = '',
): ScreeningHit | null {
  const hits = runDoubleAmlScreening(remitter, beneficiary, remittanceNo, corridor)
  return hits[0] ?? null
}

/**
 * Double AML (primary + OPAC/DSRI) with alerts persisted. Returns how many new alert rows were added.
 */
export function runScreeningForRemittance(
  remittanceNo: string,
  remitter: string,
  beneficiary: string,
  corridor = '',
): { added: number; hits: ScreeningHit[]; firstHit: ScreeningHit | null } {
  const hits = runDoubleAmlScreening(remitter, beneficiary, remittanceNo, corridor)
  let added = 0
  for (const hit of hits) {
    const row = createAmlAlertFromScreening({
      remittanceNo,
      list: hit.list,
      score: hit.score,
      subjectHint: hit.subjectHint,
    })
    if (appendAmlAlert(row)) added += 1
  }
  return { added, hits, firstHit: hits[0] ?? null }
}
