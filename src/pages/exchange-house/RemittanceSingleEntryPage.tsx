import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import {
  livePeekSingleEntryIds,
  liveReserveSingleEntryIds,
  liveSubmitSingleEntry,
} from '../../api/live/client'
import { ApiHttpError } from '../../api/http'
import { useLiveApi } from '../../api/config'
import type { EhEntryIdsDto } from '../../api/types'
import { appendFeedback } from '../../state/feedbackLogStore'
import { loadBankFxRates, PRICING_CHANGED_EVENT, quoteConversion } from '../../state/pricingStore'
import { nextAbroadIds } from '../../state/abroadIdSequences'
import { loadAmlComplianceSettings } from '../../state/amlComplianceSettingsStore'
import { assertPhotoIdOk, getHighRiskBusinessBlockReason } from '../../lib/amlCompliance'
import { runScreeningForRemittance } from '../../lib/screening'
import { syncMlaSettingsFromLive } from '../../integrations/mlaSettings/mlaSettingsRepository'

export function RemittanceSingleEntryPage() {
  const live = useLiveApi()
  const [remitterName, setRemitterName] = useState('')
  const [beneficiaryName, setBeneficiaryName] = useState('')
  const [photoIdType, setPhotoIdType] = useState('')
  const [photoIdRef, setPhotoIdRef] = useState('')
  const [amount, setAmount] = useState('1000')
  const [fromCcy, setFromCcy] = useState('USD')
  const [toCcy, setToCcy] = useState('BDT')
  const [bankCode, setBankCode] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'Any' | 'Cash' | 'Deposit Slip' | 'Credit/Debit Card'>('Any')
  const [vatPct, setVatPct] = useState('5')
  const [gateError, setGateError] = useState('')
  const [idsLoading, setIdsLoading] = useState(live)
  const [submitting, setSubmitting] = useState(false)

  const [ids, setIds] = useState<EhEntryIdsDto>(() =>
    live
      ? { remitterId: '…', beneficiaryId: '…', remittanceNo: '…', moneyReceiptNo: '…' }
      : nextAbroadIds(),
  )

  const [banks, setBanks] = useState(() => loadBankFxRates())
  useEffect(() => {
    const refresh = () => setBanks(loadBankFxRates())
    window.addEventListener(PRICING_CHANGED_EVENT, refresh as EventListener)
    return () => window.removeEventListener(PRICING_CHANGED_EVENT, refresh as EventListener)
  }, [])

  const quote = useMemo(() => {
    const a = Number(amount.replace(/,/g, ''))
    if (!Number.isFinite(a) || a <= 0) return null
    return quoteConversion(a, fromCcy, toCcy, {
      bankCode: bankCode.trim() || undefined,
      currencyPair: `${fromCcy.toUpperCase().slice(0, 3)}/${toCcy.toUpperCase().slice(0, 3)}`,
      paymentMethod,
    })
  }, [amount, fromCcy, toCcy, bankCode, paymentMethod])

  useEffect(() => {
    if (!live) {
      setIdsLoading(false)
      return
    }
    let cancelled = false
    void syncMlaSettingsFromLive().catch(() => {})
    setIdsLoading(true)
    void livePeekSingleEntryIds()
      .then((r) => {
        if (!cancelled) setIds(r.nextIds)
      })
      .catch(() => {
        if (!cancelled) setGateError('Could not load ID preview from server (check API and VITE_USE_LIVE_API).')
      })
      .finally(() => {
        if (!cancelled) setIdsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [live])

  const vatOnCommission = useMemo(() => {
    const pct = Number(vatPct.replace(/,/g, ''))
    if (!quote || !Number.isFinite(pct) || pct < 0) return 0
    return (quote.commissionAmount * pct) / 100
  }, [quote, vatPct])

  async function refreshIds() {
    setGateError('')
    if (live) {
      try {
        const r = await liveReserveSingleEntryIds()
        setIds(r.nextIds)
      } catch (e) {
        setGateError(e instanceof ApiHttpError ? e.message : 'Could not reserve new IDs from server.')
      }
      return
    }
    setIds(nextAbroadIds())
  }

  async function onSubmit() {
    setGateError('')
    if (!remitterName.trim() || !beneficiaryName.trim()) return

    const amlSettings = loadAmlComplianceSettings()

    if (live) {
      setSubmitting(true)
      try {
        const out = await liveSubmitSingleEntry({
          remitterName: remitterName.trim(),
          beneficiaryName: beneficiaryName.trim(),
          photoIdType: photoIdType.trim(),
          photoIdRef: photoIdRef.trim(),
          amount: amount.replace(/,/g, ''),
          fromCcy,
          toCcy,
          paymentMethod,
        })
        const q = quote
        const line = q
          ? `Single entry ${out.record.remittanceNo}: ${amount} ${fromCcy}→${toCcy}, net ${q.netTo.toFixed(2)} ${toCcy}, comm ${q.commissionAmount.toFixed(2)}, VAT on comm ${vatOnCommission.toFixed(2)} · server MLA OK · ${out.record.status}`
          : `Single entry ${out.record.remittanceNo}: ${amount} ${fromCcy}→${toCcy} (quote unavailable) · server MLA OK · ${out.record.status}`
        void appendFeedback('single_entry', line, 'exchange-house-abroad')
        setIds(out.nextIds)
        setRemitterName('')
        setBeneficiaryName('')
        setPhotoIdType('')
        setPhotoIdRef('')
      } catch (e) {
        setGateError(
          e instanceof ApiHttpError ? e.message : 'Save failed (network or unexpected error).',
        )
      } finally {
        setSubmitting(false)
      }
      return
    }

    const pid = assertPhotoIdOk(photoIdType, photoIdRef, amlSettings)
    if (!pid.ok) {
      setGateError(pid.message)
      return
    }
    const biz = getHighRiskBusinessBlockReason(remitterName, beneficiaryName)
    if (biz && amlSettings.blockApprovalOnBusinessTerm) {
      setGateError(biz)
      return
    }

    const corridor = `${fromCcy.toUpperCase().slice(0, 3)} → ${toCcy.toUpperCase().slice(0, 3)}`
    const { hits } = runScreeningForRemittance(ids.remittanceNo, remitterName, beneficiaryName, corridor)

    const q = quote
    const amlNote =
      hits.length > 0
        ? ` · Double AML: ${hits.map((h) => h.list).join(', ')} (alerts logged)`
        : ' · Double AML: clear on demo rules'
    const line = q
      ? `Single entry ${ids.remittanceNo}: ${amount} ${fromCcy}→${toCcy}, net ${q.netTo.toFixed(2)} ${toCcy}, comm ${q.commissionAmount.toFixed(2)}, VAT on comm ${vatOnCommission.toFixed(2)}${amlNote}`
      : `Single entry ${ids.remittanceNo}: ${amount} ${fromCcy}→${toCcy} (quote unavailable)${amlNote}`
    void appendFeedback('single_entry', line, 'exchange-house-abroad')
    const next = nextAbroadIds()
    setIds(next)
    setRemitterName('')
    setBeneficiaryName('')
    setPhotoIdType('')
    setPhotoIdRef('')
  }

  const amlSnap = loadAmlComplianceSettings()
  const canSave =
    Boolean(remitterName.trim() && beneficiaryName.trim()) &&
    (!amlSnap.requirePhotoId || (photoIdType.trim() && photoIdRef.trim().length >= 4))

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
          Exchange House — single remittance entry
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Module A.1.3: manual capture with MLA gates (photo ID, high-risk name terms, double AML). Configure under{' '}
          <RouterLink to="/compliance/mla-settings">MLA &amp; screening settings</RouterLink>.
        </Typography>
      </Box>

      <Alert severity="info">
        IDs refresh after each submit. Use &quot;New IDs only&quot; to regenerate without saving.
        {live ? (
          <>
            {' '}
            Live mode: IDs and MLA gates are enforced on the server (<code>frms_eh_entry_sequence</code>,{' '}
            <code>frms_mla_settings</code>).
          </>
        ) : null}
      </Alert>

      {gateError ? (
        <Alert severity="error" onClose={() => setGateError('')}>
          {gateError}
        </Alert>
      ) : null}

      <Paper sx={{ p: 2.5 }}>
        <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Auto-generated references</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" alignItems="center">
          {idsLoading ? (
            <CircularProgress size={28} sx={{ my: 1 }} />
          ) : (
            <>
              <TextField label="Remitter ID" value={ids.remitterId} fullWidth InputProps={{ readOnly: true }} />
              <TextField label="Beneficiary ID" value={ids.beneficiaryId} fullWidth InputProps={{ readOnly: true }} />
              <TextField label="Remittance no." value={ids.remittanceNo} fullWidth InputProps={{ readOnly: true }} />
              <TextField label="Money receipt no." value={ids.moneyReceiptNo} fullWidth InputProps={{ readOnly: true }} />
            </>
          )}
        </Stack>
        <Button sx={{ mt: 1.5 }} variant="outlined" size="small" onClick={() => void refreshIds()} disabled={idsLoading}>
          New IDs only
        </Button>
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Parties, photo ID & amount</Typography>
        <Stack spacing={1.5}>
          <TextField
            label="Remitter name"
            value={remitterName}
            onChange={(e) => setRemitterName(e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Beneficiary name"
            value={beneficiaryName}
            onChange={(e) => setBeneficiaryName(e.target.value)}
            fullWidth
            required
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Photo ID type"
              value={photoIdType}
              onChange={(e) => setPhotoIdType(e.target.value)}
              fullWidth
              required={amlSnap.requirePhotoId}
              helperText="Passport, National ID, etc."
            />
            <TextField
              label="Photo ID number / reference"
              value={photoIdRef}
              onChange={(e) => setPhotoIdRef(e.target.value)}
              fullWidth
              required={amlSnap.requirePhotoId}
            />
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap">
            <TextField label="Amount (from)" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <TextField label="From CCY" value={fromCcy} onChange={(e) => setFromCcy(e.target.value)} sx={{ width: 120 }} />
            <TextField label="To CCY" value={toCcy} onChange={(e) => setToCcy(e.target.value)} sx={{ width: 120 }} />
            <TextField select label="Bank override" value={bankCode} onChange={(e) => setBankCode(e.target.value)} sx={{ minWidth: 200 }}>
              <MenuItem value="">None (range rates)</MenuItem>
              {[...new Set(banks.map((b) => b.bankCode))].map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
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
              <MenuItem value="Any">Any</MenuItem>
              <MenuItem value="Cash">Cash</MenuItem>
              <MenuItem value="Deposit Slip">Deposit Slip</MenuItem>
              <MenuItem value="Credit/Debit Card">Credit/Debit Card</MenuItem>
            </TextField>
            <TextField
              label="VAT % on commission"
              value={vatPct}
              onChange={(e) => setVatPct(e.target.value)}
              sx={{ width: 160 }}
              helperText="A.1.3 VAT on fee/commission (demo)"
            />
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {quote ? (
          <Stack spacing={0.75}>
            <Typography variant="body2">
              Rate source: <strong>{quote.source}</strong>
            </Typography>
            <Typography variant="body2">
              Gross in {toCcy}: <strong>{quote.grossTo.toFixed(2)}</strong> · Commission:{' '}
              <strong>{quote.commissionAmount.toFixed(2)}</strong> · Net: <strong>{quote.netTo.toFixed(2)}</strong>
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              VAT on commission ({vatPct}%): <strong>{vatOnCommission.toFixed(2)}</strong> {toCcy}
            </Typography>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Enter a valid amount to preview conversion and commission from Pricing &amp; spreads.
          </Typography>
        )}

        <Button
          sx={{ mt: 2 }}
          variant="contained"
          disabled={!canSave || idsLoading || submitting}
          onClick={() => void onSubmit()}
        >
          {live ? 'Save entry (server + MLA)' : 'Save entry (demo log)'}
        </Button>
      </Paper>
    </Stack>
  )
}
