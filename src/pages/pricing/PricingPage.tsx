import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { appendFeedback } from '../../state/feedbackLogStore'
import {
  addBankFxRate,
  addCommissionBand,
  addFxRangeBand,
  loadBankFxRates,
  loadCommissionBands,
  loadFxRangeBands,
  PRICING_CHANGED_EVENT,
  removeBankFxRate,
  removeCommissionBand,
  removeFxRangeBand,
  saveBankFxRates,
  saveCommissionBands,
  saveFxRangeBands,
} from '../../state/pricingStore'
import type { BankFxRate, CommissionBand, FxRangeBand } from '../../state/pricingStore'
import { useLiveApi } from '../../api/config'
import { ApiHttpError } from '../../api/http'
import {
  liveListCommissions,
  liveCreateCommission,
  liveDeleteCommission,
  liveListFxRanges,
  liveCreateFxRange,
  liveDeleteFxRange,
  liveListBankFx,
  liveCreateBankFx,
  liveDeleteBankFx,
} from '../../api/live/client'

export function PricingPage() {
  const live = useLiveApi()
  const skipNextPricingEventRef = useRef(false)
  const [tab, setTab] = useState(0)
  const [commissions, setCommissions] = useState(loadCommissionBands)
  const [fxRanges, setFxRanges] = useState(loadFxRangeBands)
  const [bankFx, setBankFx] = useState(loadBankFxRates)
  const [saveError, setSaveError] = useState('')
  const [saveNotice, setSaveNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')

  const refresh = useCallback(() => {
    setCommissions(loadCommissionBands())
    setFxRanges(loadFxRangeBands())
    setBankFx(loadBankFxRates())
  }, [])

  const closeDialog = useCallback(() => {
    if (saving) return
    setDialog(null)
    setSaveError('')
  }, [saving])

  const refreshLive = useCallback(async () => {
    if (!live) {
      refresh()
      return
    }
    try {
      const [comRes, fxRes, bnkRes] = await Promise.all([
        liveListCommissions(),
        liveListFxRanges(),
        liveListBankFx(),
      ])
      const comItems = comRes.items as unknown as CommissionBand[]
      const fxItems = fxRes.items as unknown as FxRangeBand[]
      const bankItems = bnkRes.items as unknown as BankFxRate[]
      saveCommissionBands(comItems, false)
      saveFxRangeBands(fxItems, false)
      saveBankFxRates(bankItems, false)
      setCommissions(comItems)
      setFxRanges(fxItems)
      setBankFx(bankItems)
      skipNextPricingEventRef.current = true
      window.dispatchEvent(new CustomEvent(PRICING_CHANGED_EVENT))
    } catch {
      refresh()
    }
  }, [live, refresh])

  useEffect(() => {
    const init = async () => {
      await refreshLive()
    }
    void init()
  }, [refreshLive])

  const deleteCommission = useCallback(async (id: string) => {
    if (!window.confirm('Delete this commission band?')) return
    setActionError('')
    try {
      if (live) {
        await liveDeleteCommission(id)
      } else {
        removeCommissionBand(id)
      }
      void appendFeedback('pricing', `Deleted commission band: ${id}`)
      setSaveNotice('Commission band deleted.')
      await refreshLive()
    } catch (e) {
      if (live && isRecoverableLiveFailure(e)) {
        removeCommissionBand(id)
        void appendFeedback('pricing', `Deleted commission band: ${id}`)
        setSaveNotice('Live pricing API unavailable. Commission band deleted locally.')
        refresh()
        return
      }
      setActionError(e instanceof ApiHttpError ? e.message : 'Could not delete commission band.')
    }
  }, [live, refresh, refreshLive])

  const deleteFxRange = useCallback(async (id: string) => {
    if (!window.confirm('Delete this FX range?')) return
    setActionError('')
    try {
      if (live) {
        await liveDeleteFxRange(id)
      } else {
        removeFxRangeBand(id)
      }
      void appendFeedback('pricing', `Deleted FX range: ${id}`)
      setSaveNotice('FX range deleted.')
      await refreshLive()
    } catch (e) {
      if (live && isRecoverableLiveFailure(e)) {
        removeFxRangeBand(id)
        void appendFeedback('pricing', `Deleted FX range: ${id}`)
        setSaveNotice('Live pricing API unavailable. FX range deleted locally.')
        refresh()
        return
      }
      setActionError(e instanceof ApiHttpError ? e.message : 'Could not delete FX range.')
    }
  }, [live, refresh, refreshLive])

  const deleteBankFx = useCallback(async (id: string) => {
    if (!window.confirm('Delete this bank FX rate?')) return
    setActionError('')
    try {
      if (live) {
        await liveDeleteBankFx(id)
      } else {
        removeBankFxRate(id)
      }
      void appendFeedback('pricing', `Deleted bank FX: ${id}`)
      setSaveNotice('Bank FX rate deleted.')
      await refreshLive()
    } catch (e) {
      if (live && isRecoverableLiveFailure(e)) {
        removeBankFxRate(id)
        void appendFeedback('pricing', `Deleted bank FX: ${id}`)
        setSaveNotice('Live pricing API unavailable. Bank FX rate deleted locally.')
        refresh()
        return
      }
      setActionError(e instanceof ApiHttpError ? e.message : 'Could not delete bank FX rate.')
    }
  }, [live, refresh, refreshLive])

  useEffect(() => {
    const on = () => {
      if (skipNextPricingEventRef.current) {
        skipNextPricingEventRef.current = false
        return
      }
      void refreshLive()
    }
    window.addEventListener(PRICING_CHANGED_EVENT, on as EventListener)
    return () => window.removeEventListener(PRICING_CHANGED_EVENT, on as EventListener)
  }, [refreshLive])

  const [dialog, setDialog] = useState<'com' | 'fxr' | 'bnk' | null>(null)
  const [comForm, setComForm] = useState({
    label: '',
    currencyPair: 'USD/BDT',
    commissionFor: 'Any' as CommissionBand['commissionFor'],
    minAmount: '0',
    maxAmount: '1000',
    commissionPct: '0.3',
    flatFee: '0',
  })
  const [fxForm, setFxForm] = useState({
    label: '',
    fromCurrency: 'USD',
    toCurrency: 'BDT',
    minAmountFrom: '0',
    maxAmountFrom: '100000',
    rate: '122.5',
  })
  const [bnkForm, setBnkForm] = useState({
    bankCode: '',
    bankName: '',
    fromCurrency: 'USD',
    toCurrency: 'BDT',
    rate: '122.4',
    commissionPct: '0.25',
  })

  function openDialog(next: 'com' | 'fxr' | 'bnk') {
    setSaveError('')
    setDialog(next)
  }

  function isRecoverableLiveFailure(error: unknown) {
    return error instanceof ApiHttpError && (error.status === 404 || error.status >= 500)
  }

  async function onSaveCommission() {
    setSaving(true)
    setSaveError('')
    try {
      if (live) {
        await liveCreateCommission({
          label: comForm.label || 'Band',
          currencyPair: comForm.currencyPair,
          commissionFor: comForm.commissionFor,
          minAmount: Number(comForm.minAmount) || 0,
          maxAmount: Number(comForm.maxAmount) || 0,
          commissionPct: Number(comForm.commissionPct) || 0,
          flatFee: Number(comForm.flatFee) || 0,
        })
      } else {
        addCommissionBand({
          label: comForm.label || 'Band',
          currencyPair: comForm.currencyPair,
          commissionFor: comForm.commissionFor,
          minAmount: Number(comForm.minAmount) || 0,
          maxAmount: Number(comForm.maxAmount) || 0,
          commissionPct: Number(comForm.commissionPct) || 0,
          flatFee: Number(comForm.flatFee) || 0,
        })
      }
      void appendFeedback('pricing', `Added commission band: ${comForm.label}`, comForm.currencyPair)
      setDialog(null)
      setSaveNotice('Commission band saved.')
      await refreshLive()
    } catch (error) {
      if (live && isRecoverableLiveFailure(error)) {
        addCommissionBand({
          label: comForm.label || 'Band',
          currencyPair: comForm.currencyPair,
          commissionFor: comForm.commissionFor,
          minAmount: Number(comForm.minAmount) || 0,
          maxAmount: Number(comForm.maxAmount) || 0,
          commissionPct: Number(comForm.commissionPct) || 0,
          flatFee: Number(comForm.flatFee) || 0,
        })
        void appendFeedback('pricing', `Added commission band: ${comForm.label}`, comForm.currencyPair)
        setDialog(null)
        setSaveNotice('Live pricing API unavailable. Commission band saved locally.')
        refresh()
        return
      }
      setSaveError(error instanceof ApiHttpError ? error.message : 'Could not save commission band.')
    } finally {
      setSaving(false)
    }
  }

  async function onSaveFxRange() {
    setSaving(true)
    setSaveError('')
    try {
      if (live) {
        await liveCreateFxRange({
          label: fxForm.label || 'Range',
          fromCurrency: fxForm.fromCurrency.toUpperCase().slice(0, 3),
          toCurrency: fxForm.toCurrency.toUpperCase().slice(0, 3),
          minAmountFrom: Number(fxForm.minAmountFrom) || 0,
          maxAmountFrom: Number(fxForm.maxAmountFrom) || 0,
          rate: Number(fxForm.rate) || 0,
        })
      } else {
        addFxRangeBand({
          label: fxForm.label || 'Range',
          fromCurrency: fxForm.fromCurrency.toUpperCase().slice(0, 3),
          toCurrency: fxForm.toCurrency.toUpperCase().slice(0, 3),
          minAmountFrom: Number(fxForm.minAmountFrom) || 0,
          maxAmountFrom: Number(fxForm.maxAmountFrom) || 0,
          rate: Number(fxForm.rate) || 0,
        })
      }
      void appendFeedback('pricing', `Added FX range: ${fxForm.label}`, `${fxForm.fromCurrency}/${fxForm.toCurrency}`)
      setDialog(null)
      setSaveNotice('FX range saved.')
      await refreshLive()
    } catch (error) {
      if (live && isRecoverableLiveFailure(error)) {
        addFxRangeBand({
          label: fxForm.label || 'Range',
          fromCurrency: fxForm.fromCurrency.toUpperCase().slice(0, 3),
          toCurrency: fxForm.toCurrency.toUpperCase().slice(0, 3),
          minAmountFrom: Number(fxForm.minAmountFrom) || 0,
          maxAmountFrom: Number(fxForm.maxAmountFrom) || 0,
          rate: Number(fxForm.rate) || 0,
        })
        void appendFeedback('pricing', `Added FX range: ${fxForm.label}`, `${fxForm.fromCurrency}/${fxForm.toCurrency}`)
        setDialog(null)
        setSaveNotice('Live pricing API unavailable. FX range saved locally.')
        refresh()
        return
      }
      setSaveError(error instanceof ApiHttpError ? error.message : 'Could not save FX range.')
    } finally {
      setSaving(false)
    }
  }

  async function onSaveBankFx() {
    setSaving(true)
    setSaveError('')
    try {
      if (live) {
        await liveCreateBankFx({
          bankCode: bnkForm.bankCode,
          bankName: bnkForm.bankName || bnkForm.bankCode,
          fromCurrency: bnkForm.fromCurrency.toUpperCase().slice(0, 3),
          toCurrency: bnkForm.toCurrency.toUpperCase().slice(0, 3),
          rate: Number(bnkForm.rate) || 0,
          commissionPct: Number(bnkForm.commissionPct) || 0,
        })
      } else {
        addBankFxRate({
          bankCode: bnkForm.bankCode,
          bankName: bnkForm.bankName || bnkForm.bankCode,
          fromCurrency: bnkForm.fromCurrency.toUpperCase().slice(0, 3),
          toCurrency: bnkForm.toCurrency.toUpperCase().slice(0, 3),
          rate: Number(bnkForm.rate) || 0,
          commissionPct: Number(bnkForm.commissionPct) || 0,
        })
      }
      void appendFeedback('pricing', `Added bank FX: ${bnkForm.bankCode}`, bnkForm.bankName)
      setDialog(null)
      setSaveNotice('Bank FX rate saved.')
      await refreshLive()
    } catch (error) {
      if (live && isRecoverableLiveFailure(error)) {
        addBankFxRate({
          bankCode: bnkForm.bankCode,
          bankName: bnkForm.bankName || bnkForm.bankCode,
          fromCurrency: bnkForm.fromCurrency.toUpperCase().slice(0, 3),
          toCurrency: bnkForm.toCurrency.toUpperCase().slice(0, 3),
          rate: Number(bnkForm.rate) || 0,
          commissionPct: Number(bnkForm.commissionPct) || 0,
        })
        void appendFeedback('pricing', `Added bank FX: ${bnkForm.bankCode}`, bnkForm.bankName)
        setDialog(null)
        setSaveNotice('Live pricing API unavailable. Bank FX rate saved locally.')
        refresh()
        return
      }
      setSaveError(error instanceof ApiHttpError ? error.message : 'Could not save bank FX rate.')
    } finally {
      setSaving(false)
    }
  }

  const comCols: GridColDef<CommissionBand>[] = useMemo(
    () => [
      { field: 'label', headerName: 'Label', flex: 1, minWidth: 140 },
      { field: 'currencyPair', headerName: 'Pair', flex: 0.6, minWidth: 90 },
      { field: 'commissionFor', headerName: 'For', flex: 0.7, minWidth: 130 },
      { field: 'minAmount', headerName: 'Min', type: 'number', flex: 0.5, minWidth: 80 },
      { field: 'maxAmount', headerName: 'Max', type: 'number', flex: 0.5, minWidth: 80 },
      { field: 'commissionPct', headerName: '% Comm', type: 'number', flex: 0.5, minWidth: 80 },
      { field: 'flatFee', headerName: 'Flat', type: 'number', flex: 0.4, minWidth: 70 },
      {
        field: 'actions',
        headerName: 'Actions',
        sortable: false,
        filterable: false,
        width: 120,
        renderCell: (params) => (
          <Button color="error" size="small" onClick={() => void deleteCommission(String(params.row.id))}>
            Delete
          </Button>
        ),
      },
    ],
    [deleteCommission],
  )

  const fxCols: GridColDef<FxRangeBand>[] = useMemo(
    () => [
      { field: 'label', headerName: 'Label', flex: 1, minWidth: 140 },
      { field: 'fromCurrency', headerName: 'From', flex: 0.4, minWidth: 70 },
      { field: 'toCurrency', headerName: 'To', flex: 0.4, minWidth: 70 },
      { field: 'minAmountFrom', headerName: 'Min amt', type: 'number', flex: 0.5, minWidth: 90 },
      { field: 'maxAmountFrom', headerName: 'Max amt', type: 'number', flex: 0.5, minWidth: 90 },
      { field: 'rate', headerName: 'Rate', type: 'number', flex: 0.5, minWidth: 80 },
      {
        field: 'actions',
        headerName: 'Actions',
        sortable: false,
        filterable: false,
        width: 120,
        renderCell: (params) => (
          <Button color="error" size="small" onClick={() => void deleteFxRange(String(params.row.id))}>
            Delete
          </Button>
        ),
      },
    ],
    [deleteFxRange],
  )

  const bnkCols: GridColDef<BankFxRate>[] = useMemo(
    () => [
      { field: 'bankCode', headerName: 'Code', flex: 0.5, minWidth: 90 },
      { field: 'bankName', headerName: 'Bank', flex: 1, minWidth: 140 },
      { field: 'fromCurrency', headerName: 'From', flex: 0.4, minWidth: 70 },
      { field: 'toCurrency', headerName: 'To', flex: 0.4, minWidth: 70 },
      { field: 'rate', headerName: 'Rate', type: 'number', flex: 0.5, minWidth: 80 },
      { field: 'commissionPct', headerName: '%', type: 'number', flex: 0.4, minWidth: 70 },
      {
        field: 'actions',
        headerName: 'Actions',
        sortable: false,
        filterable: false,
        width: 120,
        renderCell: (params) => (
          <Button color="error" size="small" onClick={() => void deleteBankFx(String(params.row.id))}>
            Delete
          </Button>
        ),
      },
    ],
    [deleteBankFx],
  )

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
          Pricing & rates
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Range-wise commission (#12), range-wise FX (#13), bank-wise FX (#14). Demo persistence — replace with core banking
          rates API in production.
        </Typography>
      </Box>

      <Paper sx={{ px: 2, pt: 1 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="inherit" indicatorColor="primary">
          <Tab label="Commission bands" />
          <Tab label="FX by amount range" />
          <Tab label="Bank FX" />
        </Tabs>
      </Paper>

      {tab === 0 ? (
        <Paper sx={{ p: 1.5 }}>
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
            <Button variant="contained" onClick={() => openDialog('com')}>
              Add band
            </Button>
          </Stack>
          <Box sx={{ height: 420 }}>
            <DataGrid
              rows={commissions}
              columns={comCols}
              getRowId={(r) => r.id}
              disableRowSelectionOnClick
              pageSizeOptions={[10, 25]}
              initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
            />
          </Box>
        </Paper>
      ) : null}

      {tab === 1 ? (
        <Paper sx={{ p: 1.5 }}>
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
            <Button variant="contained" onClick={() => openDialog('fxr')}>
              Add range
            </Button>
          </Stack>
          <Box sx={{ height: 420 }}>
            <DataGrid
              rows={fxRanges}
              columns={fxCols}
              getRowId={(r) => r.id}
              disableRowSelectionOnClick
              pageSizeOptions={[10, 25]}
              initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
            />
          </Box>
        </Paper>
      ) : null}

      {tab === 2 ? (
        <Paper sx={{ p: 1.5 }}>
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
            <Button variant="contained" onClick={() => openDialog('bnk')}>
              Add bank rate
            </Button>
          </Stack>
          <Box sx={{ height: 420 }}>
            <DataGrid
              rows={bankFx}
              columns={bnkCols}
              getRowId={(r) => r.id}
              disableRowSelectionOnClick
              pageSizeOptions={[10, 25]}
              initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
            />
          </Box>
        </Paper>
      ) : null}

      <Dialog open={dialog === 'com'} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>New commission band</DialogTitle>
        <DialogContent>
          {saveError && dialog === 'com' ? (
            <Alert severity="error" sx={{ mt: 1 }}>
              {saveError}
            </Alert>
          ) : null}
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <TextField label="Label" value={comForm.label} onChange={(e) => setComForm((s) => ({ ...s, label: e.target.value }))} fullWidth />
            <TextField label="Pair e.g. USD/BDT" value={comForm.currencyPair} onChange={(e) => setComForm((s) => ({ ...s, currencyPair: e.target.value }))} fullWidth />
            <TextField
              select
              label="Commission for"
              value={comForm.commissionFor}
              onChange={(e) =>
                setComForm((s) => ({ ...s, commissionFor: e.target.value as CommissionBand['commissionFor'] }))
              }
              fullWidth
            >
              <MenuItem value="Any">Any</MenuItem>
              <MenuItem value="Cash">Cash</MenuItem>
              <MenuItem value="Deposit Slip">Deposit Slip</MenuItem>
              <MenuItem value="Credit/Debit Card">Credit/Debit Card</MenuItem>
            </TextField>
            <TextField label="Min amount" value={comForm.minAmount} onChange={(e) => setComForm((s) => ({ ...s, minAmount: e.target.value }))} fullWidth />
            <TextField label="Max amount" value={comForm.maxAmount} onChange={(e) => setComForm((s) => ({ ...s, maxAmount: e.target.value }))} fullWidth />
            <TextField label="Commission %" value={comForm.commissionPct} onChange={(e) => setComForm((s) => ({ ...s, commissionPct: e.target.value }))} fullWidth />
            <TextField label="Flat fee (same ccy as payout)" value={comForm.flatFee} onChange={(e) => setComForm((s) => ({ ...s, flatFee: e.target.value }))} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={() => void onSaveCommission()} disabled={saving}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialog === 'fxr'} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>New FX range</DialogTitle>
        <DialogContent>
          {saveError && dialog === 'fxr' ? (
            <Alert severity="error" sx={{ mt: 1 }}>
              {saveError}
            </Alert>
          ) : null}
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <TextField label="Label" value={fxForm.label} onChange={(e) => setFxForm((s) => ({ ...s, label: e.target.value }))} fullWidth />
            <TextField label="From CCY" value={fxForm.fromCurrency} onChange={(e) => setFxForm((s) => ({ ...s, fromCurrency: e.target.value }))} fullWidth />
            <TextField label="To CCY" value={fxForm.toCurrency} onChange={(e) => setFxForm((s) => ({ ...s, toCurrency: e.target.value }))} fullWidth />
            <TextField label="Min amount (from)" value={fxForm.minAmountFrom} onChange={(e) => setFxForm((s) => ({ ...s, minAmountFrom: e.target.value }))} fullWidth />
            <TextField label="Max amount (from)" value={fxForm.maxAmountFrom} onChange={(e) => setFxForm((s) => ({ ...s, maxAmountFrom: e.target.value }))} fullWidth />
            <TextField label="Rate (multiply)" value={fxForm.rate} onChange={(e) => setFxForm((s) => ({ ...s, rate: e.target.value }))} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={() => void onSaveFxRange()} disabled={saving}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialog === 'bnk'} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>New bank rate</DialogTitle>
        <DialogContent>
          {saveError && dialog === 'bnk' ? (
            <Alert severity="error" sx={{ mt: 1 }}>
              {saveError}
            </Alert>
          ) : null}
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <TextField label="Bank code" value={bnkForm.bankCode} onChange={(e) => setBnkForm((s) => ({ ...s, bankCode: e.target.value }))} fullWidth />
            <TextField label="Bank name" value={bnkForm.bankName} onChange={(e) => setBnkForm((s) => ({ ...s, bankName: e.target.value }))} fullWidth />
            <TextField label="From CCY" value={bnkForm.fromCurrency} onChange={(e) => setBnkForm((s) => ({ ...s, fromCurrency: e.target.value }))} fullWidth />
            <TextField label="To CCY" value={bnkForm.toCurrency} onChange={(e) => setBnkForm((s) => ({ ...s, toCurrency: e.target.value }))} fullWidth />
            <TextField label="Rate" value={bnkForm.rate} onChange={(e) => setBnkForm((s) => ({ ...s, rate: e.target.value }))} fullWidth />
            <TextField label="Commission %" value={bnkForm.commissionPct} onChange={(e) => setBnkForm((s) => ({ ...s, commissionPct: e.target.value }))} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={() => void onSaveBankFx()} disabled={saving}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(saveNotice)}
        autoHideDuration={5000}
        onClose={() => setSaveNotice('')}
        message={saveNotice}
      />

      <Snackbar
        open={Boolean(actionError)}
        autoHideDuration={6000}
        onClose={() => setActionError('')}
        message={actionError}
      />
    </Stack>
  )
}
