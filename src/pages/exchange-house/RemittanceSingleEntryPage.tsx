import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
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
import { computeRemittanceIncentive } from '../../state/incentiveStore'
import { loadQueueRows, saveQueueRows, REMITTANCE_QUEUE_EVENT } from '../../state/remittanceQueueStore'
import type { RemittanceQueueRow } from '../../state/remittanceQueueStore'

const LS_REMITTANCE_KEY = 'frms.remittance_search.v1'
const REMITTANCE_ADDED_EVENT = 'remittance:added'

type RemittanceRow = {
  id: string
  remittanceNo: string
  exchangeHouse: string
  createdAt: string
  corridor: string
  amount: string
  remitter: string
  beneficiary: string
  maker: string
  checker?: string
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Sent' | 'Paid' | 'Stopped' | 'Returned' | 'Rejected' | 'On Hold'
  channel: 'BEFTN' | 'RTGS' | 'NPSB' | 'MFS' | 'Cash'
  photoIdType?: string
  photoIdRef?: string
  photoImage?: string
  incentiveBdt?: number
  incentiveRule?: string
}

function persistSearchRows(rows: RemittanceRow[]): { ok: boolean; compacted: boolean } {
  const capped = rows.slice(0, 500)
  try {
    localStorage.setItem(LS_REMITTANCE_KEY, JSON.stringify(capped))
    return { ok: true, compacted: false }
  } catch (e) {
    console.warn('Primary search storage write failed, retrying with compact payload.', e)
  }

  // Fallback for quota/size errors: drop photo blobs and retry.
  try {
    const compact = capped.map(({ photoImage, ...rest }) => rest)
    localStorage.setItem(LS_REMITTANCE_KEY, JSON.stringify(compact))
    return { ok: true, compacted: true }
  } catch (e) {
    console.error('Compact search storage write failed.', e)
    return { ok: false, compacted: false }
  }
}

export function RemittanceSingleEntryPage() {
  const navigate = useNavigate()
  const live = useLiveApi()
  const [remitterName, setRemitterName] = useState('')
  const [beneficiaryName, setBeneficiaryName] = useState('')
  const [photoIdType, setPhotoIdType] = useState('')
  const [photoIdRef, setPhotoIdRef] = useState('')
  const [photoImage, setPhotoImage] = useState<string>('')
  const [amount, setAmount] = useState('1000')
  const [fromCcy, setFromCcy] = useState('USD')
  const [toCcy, setToCcy] = useState('BDT')
  const [bankCode, setBankCode] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'Any' | 'Cash' | 'Deposit Slip' | 'Credit/Debit Card'>('Any')
  const [vatPct, setVatPct] = useState('5')
  const [gateError, setGateError] = useState('')
  const [idsLoading, setIdsLoading] = useState(live)
  const [submitting, setSubmitting] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

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

  function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setGateError('Please upload an image file (jpg, png, etc.)')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setGateError('Photo size must be less than 2MB')
      return
    }

    // Convert to base64 for preview and storage
    const reader = new FileReader()
    reader.onload = () => {
      setPhotoImage(reader.result as string)
      setGateError('')
    }
    reader.onerror = () => {
      setGateError('Failed to read photo file')
    }
    reader.readAsDataURL(file)
  }

  function handleRemovePhoto() {
    setPhotoImage('')
  }

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

  async function onSubmit(): Promise<boolean> {
    setGateError('')
    setSuccessMessage('')
    if (!remitterName.trim() || !beneficiaryName.trim()) return false

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
        setPhotoImage('')
        setSuccessMessage(`Entry ${out.record.remittanceNo} saved successfully on server! View in Remittance Search & Tracking.`)
        return true
      } catch (e) {
        setGateError(
          e instanceof ApiHttpError ? e.message : 'Save failed (network or unexpected error).',
        )
        return false
      } finally {
        setSubmitting(false)
      }
    }

    // Local mode: Run MLA validations FIRST before saving
    const pid = assertPhotoIdOk(photoIdType, photoIdRef, amlSettings)
    if (!pid.ok) {
      setGateError(pid.message)
      return false
    }
    const biz = getHighRiskBusinessBlockReason(remitterName, beneficiaryName)
    if (biz && amlSettings.blockApprovalOnBusinessTerm) {
      setGateError(biz)
      return false
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

    // All validations passed - now save to Remittance Search & Tracking page
    const now = new Date()
    const createdAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const amtNum = Number(amount.replace(/,/g, ''))
    const incentive = computeRemittanceIncentive(amtNum, fromCcy, 'EH-ABROAD-01')

    const newEntry: RemittanceRow = {
      id: ids.remittanceNo,
      remittanceNo: ids.remittanceNo,
      exchangeHouse: 'EH-ABROAD-01',
      createdAt,
      corridor,
      amount: `${amount} ${fromCcy}`,
      remitter: remitterName.trim(),
      beneficiary: beneficiaryName.trim(),
      maker: 'Single Entry (Abroad)',
      status: 'Pending Approval',
      channel: paymentMethod === 'Cash' ? 'Cash' : 'BEFTN',
      photoIdType: photoIdType.trim() || undefined,
      photoIdRef: photoIdRef.trim() || undefined,
      photoImage: photoImage || undefined,
      incentiveBdt: incentive.incentiveBdt,
      incentiveRule: incentive.rule,
    }

    console.log('Saving new entry to localStorage:', newEntry)

    let existing: RemittanceRow[] = []
    try {
      const raw = localStorage.getItem(LS_REMITTANCE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as unknown
        if (Array.isArray(parsed)) existing = parsed as RemittanceRow[]
      }
    } catch (e) {
      console.warn('Corrupt search localStorage payload; resetting with latest entry.', e)
    }

    const updated = [newEntry, ...existing]
    console.log('Updated array has', updated.length, 'entries')
    const saved = persistSearchRows(updated)
    if (!saved.ok) {
      setGateError('Could not save entry to Search page storage. Please try again.')
      return false
    }

    // Non-blocking sync: Search page event
    try {
      console.log('Dispatching event:', REMITTANCE_ADDED_EVENT)
      window.dispatchEvent(new CustomEvent(REMITTANCE_ADDED_EVENT, { detail: newEntry }))
    } catch (e) {
      console.warn('Search page event dispatch failed (non-blocking):', e)
    }

    // Non-blocking sync: Approval Queue
    if (newEntry.status === 'Pending Approval') {
      try {
        const queueItem: RemittanceQueueRow = {
          id: newEntry.id,
          remittanceNo: newEntry.remittanceNo,
          createdAt: newEntry.createdAt,
          corridor: newEntry.corridor,
          amount: newEntry.amount,
          maker: newEntry.maker,
          payType: newEntry.channel === 'Cash' ? 'Cash' : 'Account pay',
          exchangeHouse: newEntry.exchangeHouse,
          status: 'Pending Approval',
        }
        const queueRows = loadQueueRows()
        saveQueueRows([queueItem, ...queueRows])
        console.log('Added to approval queue:', queueItem)
      } catch (e) {
        console.warn('Queue sync failed (non-blocking):', e)
      }
    }

    if (saved.compacted) {
      setSuccessMessage(
        `Entry ${ids.remittanceNo} saved successfully (photo preview was trimmed due to browser storage limit). View in Remittance Search & Tracking.`,
      )
    } else {
      setSuccessMessage(`Entry ${ids.remittanceNo} saved successfully! View in Remittance Search & Tracking.`)
    }

    // Clear form and generate new IDs
    const next = nextAbroadIds()
    setIds(next)
    setRemitterName('')
    setBeneficiaryName('')
    setPhotoIdType('')
    setPhotoIdRef('')
    setPhotoImage('')
    return true
  }

  async function submitAndNavigate(closePreview = false): Promise<void> {
    if (closePreview) setPreviewOpen(false)
    const ok = await onSubmit()
    if (ok) navigate('/remittance/search')
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

      {successMessage ? (
        <Alert 
          severity="success" 
          onClose={() => setSuccessMessage('')}
          action={
            <Button 
              component={RouterLink} 
              to="/remittance/search" 
              size="small" 
              sx={{ color: 'inherit', fontWeight: 700 }}
            >
              View
            </Button>
          }
        >
          {successMessage}
        </Alert>
      ) : null}

      <Paper sx={{ p: 2.5 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          gap={1.5}
          sx={{ mb: 1.75 }}
        >
          <Box>
            <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.02rem', md: '1.1rem' }, color: 'primary.main' }}>
              Auto-generated references
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', fontSize: { xs: '0.9rem', md: '0.95rem' }, mt: 0.25 }}
            >
              Generated per entry for remitter, beneficiary, remittance, and receipt tracking.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            onClick={() => void refreshIds()}
            disabled={idsLoading}
            sx={{ whiteSpace: 'nowrap' }}
          >
            New IDs only
          </Button>
        </Stack>

        {idsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
              gap: 1.25,
            }}
          >
            {[
              { label: 'Remitter ID', value: ids.remitterId },
              { label: 'Beneficiary ID', value: ids.beneficiaryId },
              { label: 'Remittance no.', value: ids.remittanceNo },
              { label: 'Money receipt no.', value: ids.moneyReceiptNo },
            ].map((item) => (
              <Paper
                key={item.label}
                variant="outlined"
                sx={{
                  p: 1.35,
                  borderColor: 'rgba(66,171,72,0.35)',
                  bgcolor: 'rgba(66,171,72,0.08)',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', letterSpacing: 0.3, fontSize: '0.76rem', fontWeight: 700 }}
                >
                  {item.label}
                </Typography>
                <Typography
                  sx={{
                    mt: 0.45,
                    fontWeight: 850,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: { xs: '0.95rem', md: '1rem' },
                    color: 'text.primary',
                    lineHeight: 1.35,
                    letterSpacing: 0.25,
                    wordBreak: 'break-all',
                  }}
                >
                  {item.value}
                </Typography>
              </Paper>
            ))}
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Box sx={{ mb: 1.75 }}>
          <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.02rem', md: '1.1rem' }, color: 'primary.main' }}>
            Parties, photo ID & amount
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', fontSize: { xs: '0.9rem', md: '0.95rem' }, mt: 0.25 }}
          >
            Capture sender/receiver details with required identity fields and conversion inputs.
          </Typography>
        </Box>
        <Stack spacing={1.5}>
          <Paper variant="outlined" sx={{ p: 1.5, borderColor: 'rgba(66,171,72,0.3)', bgcolor: 'rgba(66,171,72,0.05)' }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', letterSpacing: 0.3 }}>
              PARTY DETAILS
            </Typography>
            <Box
              sx={{
                mt: 1,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                gap: 1.25,
              }}
            >
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
            </Box>
          </Paper>

          <Paper variant="outlined" sx={{ p: 1.5, borderColor: 'rgba(66,171,72,0.3)', bgcolor: 'rgba(66,171,72,0.05)' }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', letterSpacing: 0.3 }}>
              IDENTITY
            </Typography>
            <Box
              sx={{
                mt: 1,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                gap: 1.25,
              }}
            >
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
            </Box>
            
            <Divider sx={{ my: 1.5 }} />
            
            <Box sx={{ mt: 1.5 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                    Photo ID Image
                  </Typography>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<CloudUploadOutlinedIcon />}
                    size="small"
                    sx={{ borderColor: 'rgba(66,171,72,0.5)' }}
                  >
                    Upload Photo
                    <input
                      hidden
                      accept="image/*"
                      type="file"
                      onChange={handlePhotoUpload}
                    />
                  </Button>
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
                    Max 2MB (jpg, png, etc.)
                  </Typography>
                </Box>
                
                {photoImage && (
                  <Box sx={{ position: 'relative' }}>
                    <Avatar
                      src={photoImage}
                      sx={{ width: 80, height: 80, border: '2px solid', borderColor: 'rgba(66,171,72,0.5)' }}
                      variant="rounded"
                    />
                    <IconButton
                      size="small"
                      onClick={handleRemovePhoto}
                      sx={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        bgcolor: 'error.main',
                        color: 'white',
                        '&:hover': { bgcolor: 'error.dark' },
                        width: 24,
                        height: 24,
                      }}
                    >
                      <ClearOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                )}
              </Stack>
            </Box>
          </Paper>

          <Paper variant="outlined" sx={{ p: 1.5, borderColor: 'rgba(66,171,72,0.3)', bgcolor: 'rgba(66,171,72,0.05)' }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', letterSpacing: 0.3 }}>
              AMOUNT & ROUTING
            </Typography>
            <Box
              sx={{
                mt: 1,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
                gap: 1.25,
              }}
            >
              <TextField label="Amount (from)" value={amount} onChange={(e) => setAmount(e.target.value)} fullWidth />
              <TextField label="From CCY" value={fromCcy} onChange={(e) => setFromCcy(e.target.value)} fullWidth />
              <TextField label="To CCY" value={toCcy} onChange={(e) => setToCcy(e.target.value)} fullWidth />
              <TextField select label="Bank override" value={bankCode} onChange={(e) => setBankCode(e.target.value)} fullWidth>
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
                fullWidth
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
                fullWidth
                helperText="A.1.3 VAT on fee/commission (demo)"
              />
            </Box>
          </Paper>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {quote ? (
          <Stack spacing={0.75} sx={{ p: 1.25, border: '1px solid', borderColor: 'rgba(66,171,72,0.35)', bgcolor: 'rgba(66,171,72,0.08)', borderRadius: 1 }}>
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

        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            disabled={!canSave || idsLoading}
            onClick={() => setPreviewOpen(true)}
          >
            Preview entry
          </Button>
          <Button
            variant="contained"
            disabled={!canSave || idsLoading || submitting}
            onClick={() => void submitAndNavigate()}
          >
            {live ? 'Save entry (server + MLA)' : 'Save entry (demo log)'}
          </Button>
        </Stack>
      </Paper>

      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            Entry Preview — Verify Before Submission
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'rgba(66,171,72,0.05)', borderColor: 'rgba(66,171,72,0.3)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: 'primary.main' }}>
                AUTO-GENERATED REFERENCES
              </Typography>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: '40%' }}>Remitter ID</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{ids.remitterId}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Beneficiary ID</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{ids.beneficiaryId}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Remittance No.</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: 'primary.main', fontWeight: 900 }}>{ids.remittanceNo}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Money Receipt No.</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{ids.moneyReceiptNo}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'rgba(66,171,72,0.05)', borderColor: 'rgba(66,171,72,0.3)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: 'primary.main' }}>
                PARTY DETAILS
              </Typography>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: '40%' }}>Remitter Name</TableCell>
                    <TableCell>
                      {remitterName.trim() ? (
                        <Chip label={remitterName} size="small" color="primary" variant="outlined" />
                      ) : (
                        <Typography variant="body2" color="text.secondary">Not provided</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Beneficiary Name</TableCell>
                    <TableCell>
                      {beneficiaryName.trim() ? (
                        <Chip label={beneficiaryName} size="small" color="primary" variant="outlined" />
                      ) : (
                        <Typography variant="body2" color="text.secondary">Not provided</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'rgba(66,171,72,0.05)', borderColor: 'rgba(66,171,72,0.3)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: 'primary.main' }}>
                IDENTITY (MLA / KYC)
              </Typography>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: '40%' }}>Photo ID Type</TableCell>
                    <TableCell>
                      {photoIdType.trim() ? (
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{photoIdType}</Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {amlSnap.requirePhotoId ? '⚠️ Required but not provided' : 'Not provided'}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Photo ID Reference</TableCell>
                    <TableCell>
                      {photoIdRef.trim() ? (
                        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{photoIdRef}</Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {amlSnap.requirePhotoId ? '⚠️ Required but not provided' : 'Not provided'}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Photo Image</TableCell>
                    <TableCell>
                      {photoImage ? (
                        <Avatar
                          src={photoImage}
                          variant="rounded"
                          sx={{ width: 80, height: 80, border: '2px solid', borderColor: 'success.main' }}
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">No photo uploaded</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'rgba(66,171,72,0.05)', borderColor: 'rgba(66,171,72,0.3)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: 'primary.main' }}>
                AMOUNT & CONVERSION
              </Typography>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: '40%' }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 900, fontSize: '1.05rem' }}>{amount}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>From Currency</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{fromCcy}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>To Currency</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{toCcy}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Corridor</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {fromCcy.toUpperCase().slice(0, 3)} → {toCcy.toUpperCase().slice(0, 3)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Bank Override</TableCell>
                    <TableCell>{bankCode.trim() || 'None (range rates)'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Payment Method</TableCell>
                    <TableCell>{paymentMethod}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>VAT % on Commission</TableCell>
                    <TableCell>{vatPct}%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>

            {quote ? (
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'rgba(66,171,72,0.12)', borderColor: 'rgba(66,171,72,0.4)' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: 'primary.main' }}>
                  CONVERSION CALCULATION
                </Typography>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, width: '40%' }}>Rate Source</TableCell>
                      <TableCell sx={{ fontStyle: 'italic' }}>{quote.source}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Gross in {toCcy}</TableCell>
                      <TableCell sx={{ fontWeight: 900, fontSize: '1.05rem' }}>{quote.grossTo.toFixed(2)} {toCcy}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Commission</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{quote.commissionAmount.toFixed(2)} {toCcy}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>VAT on Commission ({vatPct}%)</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{vatOnCommission.toFixed(2)} {toCcy}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 900, fontSize: '1.05rem', color: 'primary.main' }}>Net Amount</TableCell>
                      <TableCell sx={{ fontWeight: 900, fontSize: '1.1rem', color: 'primary.main' }}>
                        {quote.netTo.toFixed(2)} {toCcy}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Paper>
            ) : (
              <Alert severity="warning">
                Conversion quote unavailable. Please enter a valid amount to see calculation.
              </Alert>
            )}

            <Alert severity="info" sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                MLA Gates will be validated on submission:
              </Typography>
              <Typography variant="body2" component="ul" sx={{ mt: 0.5, pl: 2 }}>
                <li>Photo ID validation (if enabled)</li>
                <li>High-risk business name screening</li>
                <li>Double AML screening (OFAC, UN, OPAC, DSRI)</li>
              </Typography>
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)} color="inherit">
            Close
          </Button>
          <Button
            variant="contained"
            disabled={!canSave || submitting}
            onClick={() => void submitAndNavigate(true)}
          >
            Confirm & Save
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
