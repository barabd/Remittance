import { loadCoverFunds } from './mastersStore'

export type CoverFundCheck = {
  ok: boolean
  currency: string
  message: string
  availableAmount: number
}

/** Demo cover-fund verification hook used by approval/disbursement actions (#3). */
export function verifyCoverFundForCurrency(currency: string, requiredAmount = 0): CoverFundCheck {
  const cur = currency.toUpperCase().slice(0, 3)
  const rows = loadCoverFunds().filter((r) => r.currency === cur && r.status === 'Active')
  const available = rows.reduce((s, r) => s + (Number.isFinite(r.balanceAmount) ? r.balanceAmount : 0), 0)
  if (rows.length === 0) {
    return {
      ok: false,
      currency: cur,
      availableAmount: 0,
      message: `No active cover fund configured for ${cur}.`,
    }
  }
  if (available < requiredAmount) {
    return {
      ok: false,
      currency: cur,
      availableAmount: available,
      message: `Insufficient ${cur} cover fund. Required ${requiredAmount.toFixed(2)}, available ${available.toFixed(2)}.`,
    }
  }
  return {
    ok: true,
    currency: cur,
    availableAmount: available,
    message: `Cover fund check passed for ${cur}.`,
  }
}
