import {
  Alert,
  Box,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useLiveApi } from '../../api/config'
import {
  liveListBankFx,
  liveListCommissions,
  liveListFxRanges,
} from '../../api/live/client'
import { ApiHttpError } from '../../api/http'
import {
  type BankFxRate,
  type CommissionBand,
  type FxRangeBand,
  loadCommissionBands,
  loadFxRangeBands,
  loadBankFxRates,
  PRICING_CHANGED_EVENT,
  quoteConversion,
  saveBankFxRates,
  saveCommissionBands,
  saveFxRangeBands,
} from '../../state/pricingStore'

function normalizeCommissionFor(value: unknown): 'Any' | 'Cash' | 'Deposit Slip' | 'Credit/Debit Card' {
  if (value === 'Cash' || value === 'Deposit Slip' || value === 'Credit/Debit Card') return value
  return 'Any'
}

function asText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : Number.isFinite(Number(value))
      ? Number(value)
      : fallback
}

function toCommissionBand(row: Record<string, unknown>): CommissionBand {
  return {
    id: asText(row.id),
    label: asText(row.label, 'Band'),
    currencyPair: asText(row.currencyPair, 'USD/BDT'),
    commissionFor: normalizeCommissionFor(row.commissionFor),
    minAmount: asNumber(row.minAmount),
    maxAmount: asNumber(row.maxAmount),
    commissionPct: asNumber(row.commissionPct),
    flatFee: asNumber(row.flatFee),
    updatedAt: asText(row.updatedAt),
  }
}

function toFxRangeBand(row: Record<string, unknown>): FxRangeBand {
  return {
    id: asText(row.id),
    label: asText(row.label, 'Range'),
    fromCurrency: asText(row.fromCurrency, 'USD'),
    toCurrency: asText(row.toCurrency, 'BDT'),
    minAmountFrom: asNumber(row.minAmountFrom),
    maxAmountFrom: asNumber(row.maxAmountFrom),
    rate: asNumber(row.rate),
    updatedAt: asText(row.updatedAt),
  }
}

function toBankFxRate(row: Record<string, unknown>): BankFxRate {
  return {
    id: asText(row.id),
    bankCode: asText(row.bankCode),
    bankName: asText(row.bankName, asText(row.bankCode)),
    fromCurrency: asText(row.fromCurrency, 'USD'),
    toCurrency: asText(row.toCurrency, 'BDT'),
    rate: asNumber(row.rate),
    commissionPct: asNumber(row.commissionPct),
    updatedAt: asText(row.updatedAt),
  }
}

export function FxConverterPage() {
  const live = useLiveApi()
  const [amount, setAmount] = useState('1000')
  const [fromCcy, setFromCcy] = useState('USD')
  const [toCcy, setToCcy] = useState('BDT')
  const [bankCode, setBankCode] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'Any' | 'Cash' | 'Deposit Slip' | 'Credit/Debit Card'>('Any')
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [syncWarning, setSyncWarning] = useState('')
  const [fxRanges, setFxRanges] = useState(() => loadFxRangeBands())
  const [commissions, setCommissions] = useState(() => loadCommissionBands())

  const [banks, setBanks] = useState(() => loadBankFxRates())
  useEffect(() => {
    const refresh = () => {
      setBanks(loadBankFxRates())
      setFxRanges(loadFxRangeBands())
      setCommissions(loadCommissionBands())
    }
    window.addEventListener(PRICING_CHANGED_EVENT, refresh as EventListener)
    return () => window.removeEventListener(PRICING_CHANGED_EVENT, refresh as EventListener)
  }, [])

  useEffect(() => {
    if (!live) return
    let cancelled = false
    const hydratePricing = async () => {
      try {
        const [comRes, fxRes, bankRes] = await Promise.all([
          liveListCommissions(),
          liveListFxRanges(),
          liveListBankFx(),
        ])
        if (cancelled) return
        saveCommissionBands(comRes.items.map((row) => toCommissionBand(row)), false)
        saveFxRangeBands(fxRes.items.map((row) => toFxRangeBand(row)), false)
        saveBankFxRates(bankRes.items.map((row) => toBankFxRate(row)), false)
        if (cancelled) return
        setLastSyncedAt(new Date().toISOString())
        setSyncWarning('')
        window.dispatchEvent(new CustomEvent(PRICING_CHANGED_EVENT))
      } catch (e) {
        if (cancelled) return
        setSyncWarning('Live pricing refresh failed. Showing last available cached rates and commissions.')
        console.error(e instanceof ApiHttpError ? e.message : 'Failed to hydrate pricing for FX converter')
      }
    }
    void hydratePricing()
    return () => {
      cancelled = true
    }
  }, [live])

  const routes = useMemo(() => {
    const keyed = new Map<string, { from: string; to: string; bankCapable: boolean }>()
    for (const row of fxRanges) {
      const from = row.fromCurrency.toUpperCase().slice(0, 3)
      const to = row.toCurrency.toUpperCase().slice(0, 3)
      keyed.set(`${from}-${to}`, { from, to, bankCapable: false })
    }
    for (const row of banks) {
      const from = row.fromCurrency.toUpperCase().slice(0, 3)
      const to = row.toCurrency.toUpperCase().slice(0, 3)
      const key = `${from}-${to}`
      const existing = keyed.get(key)
      keyed.set(key, { from, to, bankCapable: true || Boolean(existing?.bankCapable) })
    }
    return [...keyed.values()].sort((a, b) => `${a.from}-${a.to}`.localeCompare(`${b.from}-${b.to}`))
  }, [banks, fxRanges])

  const fromCurrencies = useMemo(
    () => [...new Set(routes.map((route) => route.from))].sort((a, b) => a.localeCompare(b)),
    [routes],
  )

  const toCurrencies = useMemo(
    () => [...new Set(routes.filter((route) => route.from === fromCcy).map((route) => route.to))].sort((a, b) => a.localeCompare(b)),
    [fromCcy, routes],
  )

  const compatibleBanks = useMemo(
    () =>
      banks
        .filter(
          (row) =>
            row.fromCurrency.toUpperCase().slice(0, 3) === fromCcy &&
            row.toCurrency.toUpperCase().slice(0, 3) === toCcy,
        )
        .sort((a, b) => a.bankCode.localeCompare(b.bankCode)),
    [banks, fromCcy, toCcy],
  )

  const availablePaymentMethods = useMemo(() => {
    const pair = `${fromCcy}/${toCcy}`
    const exact = commissions
      .filter((row) => row.currencyPair === pair)
      .map((row) => normalizeCommissionFor(row.commissionFor))
    const methods = ['Any', ...exact].filter(
      (value, index, list) => list.indexOf(value) === index,
    ) as Array<'Any' | 'Cash' | 'Deposit Slip' | 'Credit/Debit Card'>
    return methods
  }, [commissions, fromCcy, toCcy])

  useEffect(() => {
    if (!fromCurrencies.length) return
    if (!fromCurrencies.includes(fromCcy)) {
      setFromCcy(fromCurrencies[0])
    }
  }, [fromCurrencies, fromCcy])

  useEffect(() => {
    if (!toCurrencies.length) return
    if (!toCurrencies.includes(toCcy)) {
      setToCcy(toCurrencies[0])
    }
  }, [toCurrencies, toCcy])

  useEffect(() => {
    if (!compatibleBanks.some((row) => row.bankCode === bankCode)) {
      setBankCode('')
    }
  }, [bankCode, compatibleBanks])

  useEffect(() => {
    if (!availablePaymentMethods.includes(paymentMethod)) {
      setPaymentMethod('Any')
    }
  }, [availablePaymentMethods, paymentMethod])

  const parsedAmount = useMemo(() => Number(amount.replace(/,/g, '').trim()), [amount])

  const quote = useMemo(() => {
    return quoteConversion(parsedAmount, fromCcy, toCcy, {
      bankCode: bankCode.trim() || undefined,
      currencyPair: `${fromCcy.toUpperCase().slice(0, 3)}/${toCcy.toUpperCase().slice(0, 3)}`,
      paymentMethod,
    })
  }, [parsedAmount, fromCcy, toCcy, bankCode, paymentMethod])

  const selectedBank = useMemo(
    () => compatibleBanks.find((row) => row.bankCode === bankCode) ?? null,
    [bankCode, compatibleBanks],
  )

  const matchingCommission = useMemo(() => {
    const pair = `${fromCcy}/${toCcy}`
    return (
      commissions.find(
        (row) =>
          row.currencyPair === pair &&
          (row.commissionFor === 'Any' || row.commissionFor === paymentMethod) &&
          parsedAmount >= row.minAmount &&
          parsedAmount < row.maxAmount,
      ) ?? null
    )
  }, [commissions, fromCcy, paymentMethod, parsedAmount, toCcy])

  const helperMessage = useMemo(() => {
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return 'Enter a valid amount greater than 0.'
    }
    if (!routes.length) {
      return 'No pricing routes are available yet. Add FX ranges or bank FX rates in Pricing first.'
    }
    if (!toCurrencies.length) {
      return `No destination currency is configured for ${fromCcy}.`
    }
    if (!quote) {
      return `No matching rate was found for ${fromCcy} to ${toCcy}.`
    }
    return ''
  }, [fromCcy, parsedAmount, quote, routes.length, toCurrencies.length, toCcy])

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
          FX & commission calculator
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Multicurrency conversion (#16) using bank-specific rate when selected, otherwise range-wise rate + range-wise
          commission (#12–#14).
        </Typography>
        {live ? (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
            Last synced:{' '}
            {lastSyncedAt
              ? new Date(lastSyncedAt).toLocaleString()
              : 'Not synced yet in this session'}
          </Typography>
        ) : null}
      </Box>

      {syncWarning ? (
        <Alert severity="warning" onClose={() => setSyncWarning('')}>
          {syncWarning}
        </Alert>
      ) : null}

      <Paper sx={{ p: 2.5 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap">
          <TextField
            label="Amount (from)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            sx={{ minWidth: 160 }}
            helperText="Numeric amount in source currency"
          />
          <FormControl sx={{ minWidth: 160 }}>
            <InputLabel id="fx-from-label">From CCY</InputLabel>
            <Select
              labelId="fx-from-label"
              label="From CCY"
              value={fromCcy}
              onChange={(e) => setFromCcy(String(e.target.value))}
            >
              {fromCurrencies.map((currency) => (
                <MenuItem key={currency} value={currency}>
                  {currency}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 160 }}>
            <InputLabel id="fx-to-label">To CCY</InputLabel>
            <Select
              labelId="fx-to-label"
              label="To CCY"
              value={toCcy}
              onChange={(e) => setToCcy(String(e.target.value))}
            >
              {toCurrencies.map((currency) => (
                <MenuItem key={currency} value={currency}>
                  {currency}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField select label="Bank override" value={bankCode} onChange={(e) => setBankCode(e.target.value)} sx={{ minWidth: 240 }}>
            <MenuItem value="">None (range rates)</MenuItem>
            {compatibleBanks.map((row) => (
              <MenuItem key={row.id} value={row.bankCode}>
                {row.bankCode} - {row.bankName}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Payment method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
            sx={{ minWidth: 210 }}
          >
            {availablePaymentMethods.map((method) => (
              <MenuItem key={method} value={method}>
                {method}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1.5 }}>
          {['100', '500', '1000', '5000'].map((preset) => (
            <Chip
              key={preset}
              label={`${preset} ${fromCcy}`}
              onClick={() => setAmount(preset)}
              variant={amount === preset ? 'filled' : 'outlined'}
            />
          ))}
        </Stack>

        <Divider sx={{ my: 2 }} />

        {helperMessage ? (
          <Alert severity="info">{helperMessage}</Alert>
        ) : !quote ? (
          <Typography color="text.secondary">Enter valid amount and currencies present in Pricing.</Typography>
        ) : (
          <Stack spacing={1}>
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography sx={{ fontWeight: 900 }}>Result</Typography>
              <Chip
                size="small"
                label={quote.source === 'bank' ? 'Bank rate' : 'Range rate'}
                sx={{ borderRadius: 999 }}
              />
              {selectedBank ? <Chip size="small" variant="outlined" label={`${selectedBank.bankCode} selected`} /> : null}
            </Stack>
            <Typography variant="body2">Source amount ({fromCcy}): {parsedAmount.toFixed(2)}</Typography>
            <Typography variant="body2">Rate used: {quote.rate}</Typography>
            <Typography variant="body2">Gross ({toCcy}): {quote.grossTo.toFixed(2)}</Typography>
            <Typography variant="body2">
              Commission ({quote.commissionPct}% + flat {quote.flatFee}): −{quote.commissionAmount.toFixed(2)}
            </Typography>
            <Typography variant="body2">
              Commission basis: {matchingCommission ? `${matchingCommission.label} (${matchingCommission.minAmount} to ${matchingCommission.maxAmount})` : 'No extra commission band matched'}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 950 }}>
              Net to customer ({toCcy}): {quote.netTo.toFixed(2)}
            </Typography>
          </Stack>
        )}
      </Paper>
    </Stack>
  )
}
