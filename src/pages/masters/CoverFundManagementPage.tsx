import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import DoneOutlinedIcon from '@mui/icons-material/DoneOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import PauseCircleOutlineOutlinedIcon from '@mui/icons-material/PauseCircleOutlineOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined'
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined'
import { useMemo, useState } from 'react'
import { brand } from '../../theme/appTheme'
import type { CoverFundRecord, MasterApprovalStatus } from '../../state/mastersStore'
import { ApiHttpError } from '../../api/http'
import { liveGetCoverFundAudit } from '../../api/live/client'
import * as localMasters from '../../integrations/masters/mastersLocal'
import {
  addCoverFund,
  loadCoverFunds,
  setMasterStatusCoverFund,
  updateCoverFund,
} from '../../state/mastersStore'
import { useMastersRefresh } from '../../hooks/useMastersRefresh'

type CoverFundAuditEvent = {
  at: string
  actor: string
  action: string
  details?: string
}

function statusChip(status: MasterApprovalStatus) {
  const map: Record<MasterApprovalStatus, { bg: string; fg: string }> = {
    Draft: { bg: 'rgba(0,0,0,0.06)', fg: brand.black },
    'Pending Approval': { bg: 'rgba(255,255,255,0.22)', fg: brand.black },
    Active: { bg: 'rgba(66,171,72,0.14)', fg: brand.green },
    Approved: { bg: 'rgba(66,171,72,0.14)', fg: brand.green },
    Rejected: { bg: 'rgba(0,0,0,0.08)', fg: brand.black },
    'On Hold': { bg: 'rgba(0,0,0,0.06)', fg: brand.black },
  }
  return map[status]
}

function fmtAmount(n: number, cur: string) {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${cur}`
}

export function CoverFundManagementPage() {
  const [rows, , apiMeta] = useMastersRefresh('coverFunds', loadCoverFunds)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    fundCode: '',
    partnerName: '',
    currency: 'USD',
    balanceAmount: '',
    notes: '',
  })

  const [auditOpen, setAuditOpen] = useState(false)
  const [auditRows, setAuditRows] = useState<CoverFundAuditEvent[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveNotice, setSaveNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const [acting, setActing] = useState(false)
  const fallbackAuditRows = useMemo<CoverFundAuditEvent[]>(() => {
    if (!selected) return []
    return [
      {
        at: selected.updatedAt,
        actor: selected.checker ?? selected.maker,
        action: 'Current record snapshot',
        details: `Status=${selected.status}; Balance=${fmtAmount(selected.balanceAmount, selected.currency)}`,
      },
    ]
  }, [selected])

  async function openAuditDrawer() {
    if (!selected) return
    setAuditOpen(true)
    if (!apiMeta.live) return

    setAuditLoading(true)
    setAuditError(null)
    try {
      const res = await liveGetCoverFundAudit(selected.id)
      setAuditRows((res.events ?? []) as CoverFundAuditEvent[])
    } catch (e) {
      setAuditRows([])
      setAuditError(e instanceof ApiHttpError ? e.message : 'Could not load audit from API.')
    } finally {
      setAuditLoading(false)
    }
  }

  function openCreate() {
    setEditingId(null)
    setForm({
      fundCode: '',
      partnerName: '',
      currency: 'USD',
      balanceAmount: '0',
      notes: '',
    })
    setDialogOpen(true)
  }

  function openEdit() {
    if (!selected) return
    setEditingId(selected.id)
    setForm({
      fundCode: selected.fundCode,
      partnerName: selected.partnerName,
      currency: selected.currency,
      balanceAmount: String(selected.balanceAmount),
      notes: selected.notes ?? '',
    })
    setDialogOpen(true)
  }

  async function saveForm() {
    setSaveError(null)
    setSaveNotice(null)
    const bal = Number(form.balanceAmount.replace(/,/g, ''))
    if (!form.fundCode.trim() || !form.partnerName.trim() || !Number.isFinite(bal)) return
    const payload = {
      fundCode: form.fundCode.trim().toUpperCase(),
      partnerName: form.partnerName.trim(),
      currency: form.currency.trim().toUpperCase().slice(0, 3),
      balanceAmount: bal,
      notes: form.notes.trim() || undefined,
    }
    setSaving(true)
    try {
      if (editingId) {
        await updateCoverFund(editingId, payload)
        setSaveNotice('Cover fund updated.')
      } else {
        await addCoverFund(payload)
        setSaveNotice('Cover fund created.')
      }
      setDialogOpen(false)
    } catch (e) {
      if (editingId) {
        localMasters.updateCoverFund(editingId, payload)
        setSaveNotice('Cover fund updated locally (live API unavailable).')
      } else {
        localMasters.addCoverFund(payload)
        setSaveNotice('Cover fund created locally (live API unavailable).')
      }
      setSaveError(e instanceof ApiHttpError ? e.message : 'Could not save cover fund to live API.')
      setDialogOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function onSetStatus(status: MasterApprovalStatus) {
    if (!selected) return
    setActionError(null)
    setActionNotice(null)
    setActing(true)
    try {
      await setMasterStatusCoverFund(selected.id, status)
      setActionNotice(`Cover fund ${selected.fundCode} updated to ${status === 'Approved' ? 'Active' : status}.`)
    } catch (e) {
      localMasters.setMasterStatusCoverFund(selected.id, status)
      setActionNotice(
        `Cover fund ${selected.fundCode} updated locally to ${status === 'Approved' ? 'Active' : status} (live API unavailable).`,
      )
      setActionError(e instanceof ApiHttpError ? e.message : 'Could not update cover fund status in live API.')
    } finally {
      setActing(false)
    }
  }

  const canApprove = selected?.status === 'Pending Approval' && !acting
  const canHold = selected?.status === 'Pending Approval' && !acting
  const canReject = selected?.status === 'Pending Approval' && !acting

  const columns: GridColDef<CoverFundRecord>[] = [
    { field: 'fundCode', headerName: 'Fund code', flex: 1, minWidth: 140 },
    { field: 'partnerName', headerName: 'Partner', flex: 1.2, minWidth: 160 },
    { field: 'currency', headerName: 'Ccy', flex: 0.4, minWidth: 70 },
    {
      field: 'balanceAmount',
      headerName: 'Balance',
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => fmtAmount(row.balanceAmount, row.currency),
    },
    { field: 'maker', headerName: 'Maker', flex: 0.6, minWidth: 100 },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.8,
      minWidth: 130,
      renderCell: (p) => (
        <Chip
          size="small"
          label={p.value}
          sx={{ bgcolor: statusChip(p.value).bg, color: statusChip(p.value).fg }}
        />
      ),
    },
    { field: 'updatedAt', headerName: 'Updated', flex: 0.9, minWidth: 140 },
  ]

  const balNum = Number(form.balanceAmount.replace(/,/g, ''))
  const formValid =
    form.fundCode.trim() &&
    form.partnerName.trim() &&
    Number.isFinite(balNum) &&
    /^[A-Z]{3}$/.test(form.currency.trim().toUpperCase().slice(0, 3) || 'USD')

  return (
    <Stack spacing={2.5}>
      {apiMeta.live ? (
        <Alert severity={apiMeta.lastError ? 'warning' : 'info'}>
          {apiMeta.lastError
            ? `Live API: could not refresh — ${apiMeta.lastError}. Showing cached/local data.`
            : 'Live API: list refreshed from GET /cover-funds.'}
        </Alert>
      ) : null}
      {saveError ? <Alert severity="error">{saveError}</Alert> : null}
      {saveNotice ? <Alert severity="success" onClose={() => setSaveNotice(null)}>{saveNotice}</Alert> : null}
      {actionError ? <Alert severity="error">{actionError}</Alert> : null}
      {actionNotice ? <Alert severity="success" onClose={() => setActionNotice(null)}>{actionNotice}</Alert> : null}
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems="flex-start" justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
            Cover fund management
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Vostro/nostro-style cover positions per partner and currency, with approval on setup and balance changes.
          </Typography>
        </Box>
        <Stack direction="row" gap={1} flexWrap="wrap" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
          <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={openCreate}>
            New cover fund
          </Button>
          <Button
            variant="outlined"
            startIcon={<EditOutlinedIcon />}
            disabled={!selected}
            onClick={openEdit}
            sx={{ borderColor: 'divider' }}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            startIcon={<HistoryOutlinedIcon />}
            disabled={!selected}
            onClick={() => void openAuditDrawer()}
            sx={{ borderColor: 'divider' }}
          >
            Audit
          </Button>
          <Button
            variant="contained"
            startIcon={<DoneOutlinedIcon />}
            disabled={!canApprove}
            onClick={() => void onSetStatus('Approved')}
          >
            Approve
          </Button>
          <Button
            variant="outlined"
            startIcon={<PauseCircleOutlineOutlinedIcon />}
            disabled={!canHold}
            onClick={() => void onSetStatus('On Hold')}
            sx={{ borderColor: 'divider' }}
          >
            Hold
          </Button>
          <Button
            variant="outlined"
            startIcon={<CloseOutlinedIcon />}
            disabled={!canReject}
            onClick={() => void onSetStatus('Rejected')}
            sx={{ borderColor: 'divider' }}
          >
            Reject
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ p: 1.5 }}>
        <Box sx={{ height: 520 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            disableRowSelectionOnClick
            onRowClick={(p) => setSelectedId(String(p.row.id))}
            initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
            pageSizeOptions={[10, 25, 50]}
            sx={{
              border: 0,
              '& .MuiDataGrid-columnHeaders': { borderBottom: '1px solid', borderColor: 'divider' },
              '& .MuiDataGrid-row:hover': { bgcolor: 'rgba(66,171,72,0.06)' },
              '& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus': { outline: 'none' },
            }}
          />
        </Box>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit cover fund' : 'New cover fund'}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <TextField
              label="Fund code"
              value={form.fundCode}
              onChange={(e) => setForm((s) => ({ ...s, fundCode: e.target.value }))}
              fullWidth
              required
              disabled={Boolean(editingId)}
            />
            <TextField
              label="Partner name"
              value={form.partnerName}
              onChange={(e) => setForm((s) => ({ ...s, partnerName: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Currency (ISO 4217)"
              value={form.currency}
              onChange={(e) => setForm((s) => ({ ...s, currency: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Balance amount"
              value={form.balanceAmount}
              onChange={(e) => setForm((s) => ({ ...s, balanceAmount: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
            {!formValid ? (
              <Alert severity="warning">
                Fund code, partner, numeric balance, and 3-letter currency are required.
              </Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void saveForm()} disabled={!formValid || saving}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Drawer anchor="right" open={auditOpen} onClose={() => setAuditOpen(false)} PaperProps={{ sx: { width: { xs: '100%', sm: 420 }, p: 2 } }}>
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography sx={{ fontWeight: 950 }}>Record summary</Typography>
            <IconButton onClick={() => setAuditOpen(false)}>
              <ClearOutlinedIcon />
            </IconButton>
          </Stack>
          {!selected ? (
            <Alert severity="info">Select a row.</Alert>
          ) : (
            <Stack spacing={1}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Fund <Box component="span" sx={{ fontWeight: 800, color: 'text.primary' }}>{selected.fundCode}</Box>
              </Typography>
              <Typography variant="body2">Current balance: {fmtAmount(selected.balanceAmount, selected.currency)}</Typography>
              <Typography variant="body2">Current status: {selected.status}</Typography>
              {auditLoading ? <Alert severity="info">Loading audit events...</Alert> : null}
              {auditError ? <Alert severity="warning">{auditError}</Alert> : null}
              {(apiMeta.live ? auditRows : fallbackAuditRows).length === 0 && !auditLoading ? (
                <Alert severity="info">No audit events found.</Alert>
              ) : (
                (apiMeta.live ? auditRows : fallbackAuditRows).map((e, idx) => (
                  <Paper key={`${e.at}-${idx}`} variant="outlined" sx={{ p: 1.5, borderColor: 'divider' }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                      <Typography sx={{ fontWeight: 900 }}>{e.action}</Typography>
                      <Chip
                        size="small"
                        label={e.at}
                        sx={{ bgcolor: 'rgba(0,0,0,0.06)', color: brand.black }}
                      />
                    </Stack>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                      Actor:{' '}
                      <Box component="span" sx={{ fontWeight: 900, color: 'text.primary' }}>
                        {e.actor}
                      </Box>
                    </Typography>
                    {e.details ? (
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {e.details}
                      </Typography>
                    ) : null}
                  </Paper>
                ))
              )}
            </Stack>
          )}
        </Stack>
      </Drawer>
    </Stack>
  )
}
