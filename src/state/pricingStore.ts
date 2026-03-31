/** Commission bands, range-wise FX, and bank-specific rates (local demo; backend in API v2). */

import { nextId, nowTs } from './mastersStore'

export type CommissionBand = {
  id: string
  label: string
  currencyPair: string
  commissionFor: 'Any' | 'Cash' | 'Deposit Slip' | 'Credit/Debit Card'
  minAmount: number
  maxAmount: number
  commissionPct: number
  flatFee: number
  updatedAt: string
}

export type FxRangeBand = {
  id: string
  label: string
  fromCurrency: string
  toCurrency: string
  minAmountFrom: number
  maxAmountFrom: number
  rate: number
  updatedAt: string
}

export type BankFxRate = {
  id: string
  bankCode: string
  bankName: string
  fromCurrency: string
  toCurrency: string
  rate: number
  commissionPct: number
  updatedAt: string
}

export const PRICING_CHANGED_EVENT = 'pricing:changed'

const K_COM = 'frms.pricing.commissions.v1'
const K_FXR = 'frms.pricing.fxRanges.v1'
const K_BNK = 'frms.pricing.bankFx.v1'

function emit() {
  window.dispatchEvent(new CustomEvent(PRICING_CHANGED_EVENT))
}

function seedCommissions(): CommissionBand[] {
  return [
    {
      id: 'COM-1',
      label: 'Retail USD→BDT',
      currencyPair: 'USD/BDT',
      commissionFor: 'Any',
      minAmount: 0,
      maxAmount: 1000,
      commissionPct: 0.35,
      flatFee: 0,
      updatedAt: '2026-03-01',
    },
    {
      id: 'COM-2',
      label: 'Retail USD→BDT high',
      currencyPair: 'USD/BDT',
      commissionFor: 'Any',
      minAmount: 1000,
      maxAmount: 100000,
      commissionPct: 0.22,
      flatFee: 2,
      updatedAt: '2026-03-01',
    },
  ]
}

function seedFxRanges(): FxRangeBand[] {
  return [
    {
      id: 'FXR-1',
      label: 'USD→BDT standard',
      fromCurrency: 'USD',
      toCurrency: 'BDT',
      minAmountFrom: 0,
      maxAmountFrom: 50000,
      rate: 122.5,
      updatedAt: '2026-03-25',
    },
    {
      id: 'FXR-2',
      label: 'USD→BDT bulk',
      fromCurrency: 'USD',
      toCurrency: 'BDT',
      minAmountFrom: 50000,
      maxAmountFrom: 1e12,
      rate: 122.35,
      updatedAt: '2026-03-25',
    },
    {
      id: 'FXR-3',
      label: 'AED→BDT',
      fromCurrency: 'AED',
      toCurrency: 'BDT',
      minAmountFrom: 0,
      maxAmountFrom: 1e12,
      rate: 33.4,
      updatedAt: '2026-03-25',
    },
  ]
}

function seedBankFx(): BankFxRate[] {
  return [
    {
      id: 'BNK-1',
      bankCode: 'UBPLC',
      bankName: 'Uttara Bank PLC',
      fromCurrency: 'USD',
      toCurrency: 'BDT',
      rate: 122.42,
      commissionPct: 0.2,
      updatedAt: '2026-03-25',
    },
    {
      id: 'BNK-2',
      bankCode: 'PARTNER-A',
      bankName: 'Partner Bank A',
      fromCurrency: 'USD',
      toCurrency: 'BDT',
      rate: 122.28,
      commissionPct: 0.28,
      updatedAt: '2026-03-25',
    },
  ]
}

function readLs<T>(key: string, seed: () => T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) {
      const s = seed()
      localStorage.setItem(key, JSON.stringify(s))
      return s
    }
    const p = JSON.parse(raw) as T
    if (Array.isArray(p) && p.length === 0) {
      const s = seed()
      localStorage.setItem(key, JSON.stringify(s))
      return s
    }
    return p
  } catch {
    const s = seed()
    localStorage.setItem(key, JSON.stringify(s))
    return s
  }
}

export function loadCommissionBands() {
  return readLs(K_COM, seedCommissions)
}

export function saveCommissionBands(rows: CommissionBand[], emitEvent = true) {
  localStorage.setItem(K_COM, JSON.stringify(rows))
  if (emitEvent) emit()
}

export function loadFxRangeBands() {
  return readLs(K_FXR, seedFxRanges)
}

export function saveFxRangeBands(rows: FxRangeBand[], emitEvent = true) {
  localStorage.setItem(K_FXR, JSON.stringify(rows))
  if (emitEvent) emit()
}

export function loadBankFxRates() {
  return readLs(K_BNK, seedBankFx)
}

export function saveBankFxRates(rows: BankFxRate[], emitEvent = true) {
  localStorage.setItem(K_BNK, JSON.stringify(rows))
  if (emitEvent) emit()
}

export function addCommissionBand(
  row: Omit<CommissionBand, 'id' | 'updatedAt'>,
) {
  const rows = loadCommissionBands()
  const list: CommissionBand[] = [
    {
      ...row,
      id: nextId('COM'),
      updatedAt: nowTs(),
    },
    ...rows,
  ]
  saveCommissionBands(list)
}

export function addFxRangeBand(row: Omit<FxRangeBand, 'id' | 'updatedAt'>) {
  const rows = loadFxRangeBands()
  saveFxRangeBands([
    { ...row, id: nextId('FXR'), updatedAt: nowTs() },
    ...rows,
  ])
}

export function addBankFxRate(row: Omit<BankFxRate, 'id' | 'updatedAt'>) {
  const rows = loadBankFxRates()
  saveBankFxRates([
    { ...row, id: nextId('BNK'), updatedAt: nowTs() },
    ...rows,
  ])
}

export function removeCommissionBand(id: string) {
  const rows = loadCommissionBands().filter((r) => r.id !== id)
  saveCommissionBands(rows)
}

export function removeFxRangeBand(id: string) {
  const rows = loadFxRangeBands().filter((r) => r.id !== id)
  saveFxRangeBands(rows)
}

export function removeBankFxRate(id: string) {
  const rows = loadBankFxRates().filter((r) => r.id !== id)
  saveBankFxRates(rows)
}

/** Pick commission % and flat for amount in fromCurrency (pair e.g. USD/BDT). */
export function pickCommission(
  amount: number,
  currencyPair: string,
  paymentMethod: CommissionBand['commissionFor'] = 'Any',
) {
  const bands = loadCommissionBands().filter(
    (b) =>
      b.currencyPair === currencyPair &&
      (((b.commissionFor ?? 'Any') === 'Any') || (b.commissionFor ?? 'Any') === paymentMethod),
  )
  for (const b of bands) {
    if (amount >= b.minAmount && amount < b.maxAmount) return b
  }
  return bands[0] ?? null
}

/** Range-wise rate: first matching band for from→to and amount. */
export function pickRangeRate(amountFrom: number, fromCcy: string, toCcy: string) {
  const from = fromCcy.toUpperCase().slice(0, 3)
  const to = toCcy.toUpperCase().slice(0, 3)
  const bands = loadFxRangeBands().filter((b) => b.fromCurrency === from && b.toCurrency === to)
  for (const b of bands) {
    if (amountFrom >= b.minAmountFrom && amountFrom < b.maxAmountFrom) return b
  }
  return bands[0] ?? null
}

/** Bank override if bankCode matches pair. */
export function pickBankRate(bankCode: string | undefined, fromCcy: string, toCcy: string) {
  if (!bankCode?.trim()) return null
  const from = fromCcy.toUpperCase().slice(0, 3)
  const to = toCcy.toUpperCase().slice(0, 3)
  return (
    loadBankFxRates().find(
      (b) =>
        b.bankCode.toLowerCase() === bankCode.trim().toLowerCase() &&
        b.fromCurrency === from &&
        b.toCurrency === to,
    ) ?? null
  )
}

export type FxQuote = {
  grossTo: number
  rate: number
  commissionPct: number
  flatFee: number
  commissionAmount: number
  netTo: number
  source: 'bank' | 'range'
}

export function quoteConversion(
  amountFrom: number,
  fromCcy: string,
  toCcy: string,
  options?: {
    bankCode?: string
    currencyPair?: string
    paymentMethod?: CommissionBand['commissionFor']
  },
): FxQuote | null {
  if (!Number.isFinite(amountFrom) || amountFrom <= 0) return null
  const pair = options?.currencyPair || `${fromCcy.toUpperCase().slice(0, 3)}/${toCcy.toUpperCase().slice(0, 3)}`
  const bank = pickBankRate(options?.bankCode, fromCcy, toCcy)
  const range = pickRangeRate(amountFrom, fromCcy, toCcy)
  const rateRow = bank ?? range
  if (!rateRow) return null
  const rate = rateRow.rate
  const grossTo = amountFrom * rate
  const comBand = pickCommission(amountFrom, pair, options?.paymentMethod ?? 'Any')
  const commissionPct = bank ? bank.commissionPct : comBand?.commissionPct ?? 0
  const flatFee = comBand?.flatFee ?? 0
  const commissionAmount = grossTo * (commissionPct / 100) + flatFee
  const netTo = Math.max(0, grossTo - commissionAmount)
  return {
    grossTo,
    rate,
    commissionPct,
    flatFee,
    commissionAmount,
    netTo,
    source: bank ? 'bank' : 'range',
  }
}
