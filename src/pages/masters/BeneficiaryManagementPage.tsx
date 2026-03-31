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
import { useEffect, useMemo, useState } from 'react'
import { ApiHttpError } from '../../api/http'
import { brand } from '../../theme/appTheme'
import { liveGetBeneficiaryAudit } from '../../api/live/client'
import type { BeneficiaryRecord, MasterApprovalStatus } from '../../state/mastersStore'
import {
  addBeneficiary,
  loadBeneficiaries,
  setMasterStatusBeneficiary,
  updateBeneficiary,
} from '../../state/mastersStore'
import { useMastersRefresh } from '../../hooks/useMastersRefresh'

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

export function BeneficiaryManagementPage() {
  const [rows, , apiMeta] = useMastersRefresh('beneficiaries', loadBeneficiaries)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saveBusy, setSaveBusy] = useState(false)
  const [saveNotice, setSaveNotice] = useState<{ severity: 'success' | 'error'; message: string } | null>(null)
  const [acting, setActing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    idDocumentRef: '',
    bankName: '',
    bankAccountMasked: '',
    branch: '',
    notes: '',
  })

  const [auditOpen, setAuditOpen] = useState(false)
  const [serverAuditEvents, setServerAuditEvents] = useState<
    { at: string; actor: string; action: string; details?: string }[] | null
  >(null)
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditFetchKey, setAuditFetchKey] = useState(0)

  function openCreate() {
    setEditingId(null)
    setSaveNotice(null)
    setForm({
      fullName: '',
      phone: '',
      idDocumentRef: '',
      bankName: '',
      bankAccountMasked: '',
      branch: 'Head Office',
      notes: '',
    })
    setDialogOpen(true)
  }

  function openEdit() {
    if (!selected) return
    setEditingId(selected.id)
    setSaveNotice(null)
    setForm({
      fullName: selected.fullName,
      phone: selected.phone,
      idDocumentRef: selected.idDocumentRef,
      bankName: selected.bankName,
      bankAccountMasked: selected.bankAccountMasked,
      branch: selected.branch,
      notes: selected.notes ?? '',
    })
    setDialogOpen(true)
  }

  async function saveForm() {
    if (!form.fullName.trim() || !form.phone.trim()) return
    setSaveBusy(true)
    setSaveNotice(null)
    try {
      if (editingId) {
        await updateBeneficiary(editingId, { ...form })
        setSaveNotice({ severity: 'success', message: `Beneficiary updated: ${editingId}` })
      } else {
        const created = await addBeneficiary({
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          idDocumentRef: form.idDocumentRef.trim(),
          bankName: form.bankName.trim(),
          bankAccountMasked: form.bankAccountMasked.trim(),
          branch: form.branch.trim() || 'Head Office',
          notes: form.notes.trim() || undefined,
        })
        setSelectedId(created.id)
        setSaveNotice({ severity: 'success', message: `Beneficiary created: ${created.id}` })
      }
      setDialogOpen(false)
      if (apiMeta.live) setAuditFetchKey((k) => k + 1)
    } catch (error) {
      setSaveNotice({
        severity: 'error',
        message: error instanceof ApiHttpError ? error.message : 'Could not save beneficiary.',
      })
    } finally {
      setSaveBusy(false)
    }
  }

  function closeAuditDrawer() {
    setServerAuditEvents(null)
    setAuditOpen(false)
  }

  useEffect(() => {
    if (!auditOpen || !apiMeta.live || !selectedId) return
    let cancelled = false
    void Promise.resolve()
      .then(() => {
        if (cancelled) return null
        setAuditLoading(true)
        return liveGetBeneficiaryAudit(selectedId)
      })
      .then((r) => {
        if (cancelled || !r) return
        setServerAuditEvents(
          r.events.map((e) => ({
            at: e.at,
            actor: e.actor,
            action: e.action,
            details: e.details,
          })),
        )
      })
      .catch(() => {
        if (!cancelled) setServerAuditEvents([])
      })
      .finally(() => {
        if (!cancelled) setAuditLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [auditOpen, apiMeta.live, selectedId, auditFetchKey])

  const demoAuditEvents = useMemo((): { at: string; actor: string; action: string; details?: string }[] => {
    if (!selected) return []
    const ev: { at: string; actor: string; action: string; details?: string }[] = [
      {
        at: selected.createdAt,
        actor: selected.maker,
        action: 'Registered / last saved',
        details: `${selected.fullName} · ${selected.phone}`,
      },
    ]
    if (selected.status === 'Pending Approval') {
      ev.push({
        at: selected.createdAt,
        actor: 'System',
        action: 'Queued for maker-checker approval',
        details: 'Awaiting checker decision.',
      })
    }
    if (selected.checker) {
      ev.push({
        at: selected.createdAt,
        actor: selected.checker,
        action:
          selected.status === 'Rejected'
            ? 'Rejected (maker-checker)'
            : selected.status === 'Active'
              ? 'Approved (maker-checker)'
              : 'Checker action',
      })
    }
    return ev
  }, [selected])

  const auditTimeline =
    apiMeta.live && serverAuditEvents !== null ? serverAuditEvents : demoAuditEvents

  async function onSetStatus(status: MasterApprovalStatus) {
    if (!selected) return
    setActionError(null)
    setActionNotice(null)
    setActing(true)
    try {
      await setMasterStatusBeneficiary(selected.id, status === 'Approved' ? 'Active' : status)
      setActionNotice(
        `Beneficiary ${selected.fullName} updated to ${status === 'Approved' || status === 'Active' ? 'Active' : status}.`,
      )
      if (apiMeta.live) setAuditFetchKey((k) => k + 1)
    } catch (e) {
      setActionError(e instanceof ApiHttpError ? e.message : 'Could not update beneficiary status in live API.')
    } finally {
      setActing(false)
    }
  }

  const canApprove =
    (selected?.status === 'Pending Approval' || selected?.status === 'On Hold') && !acting
  const canHold = selected?.status === 'Pending Approval' && !acting
  const canReject =
    (selected?.status === 'Pending Approval' || selected?.status === 'On Hold') && !acting

  const columns: GridColDef<BeneficiaryRecord>[] = [
    { field: 'id', headerName: 'ID', flex: 0.7, minWidth: 120 },
    { field: 'fullName', headerName: 'Name', flex: 1, minWidth: 160 },
    { field: 'phone', headerName: 'Phone', flex: 0.9, minWidth: 130 },
    { field: 'bankName', headerName: 'Bank', flex: 0.9, minWidth: 140 },
    { field: 'bankAccountMasked', headerName: 'Account', flex: 0.9, minWidth: 130 },
    { field: 'branch', headerName: 'Branch', flex: 0.7, minWidth: 110 },
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
    { field: 'createdAt', headerName: 'Created', flex: 0.9, minWidth: 140 },
  ]

  return (
    <Stack spacing={2.5}>
      {apiMeta.live ? (
        <Alert severity={apiMeta.lastError ? 'warning' : 'info'}>
          {apiMeta.lastError
            ? `Live API: could not refresh — ${apiMeta.lastError}. Showing cached/local data.`
            : 'Live API: GET /beneficiaries; maker-checker via POST …/approve | …/reject; hold/release via PATCH; audit via GET …/audit.'}
        </Alert>
      ) : null}
      {actionError ? <Alert severity="error">{actionError}</Alert> : null}
      {actionNotice ? <Alert severity="success" onClose={() => setActionNotice(null)}>{actionNotice}</Alert> : null}
      {saveNotice ? (
        <Alert severity={saveNotice.severity} onClose={() => setSaveNotice(null)}>
          {saveNotice.message}
        </Alert>
      ) : null}
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems="flex-start" justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
            Beneficiary management
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Register and maintain payout beneficiaries with maker-checker approval.
          </Typography>
        </Box>
        <Stack direction="row" gap={1} flexWrap="wrap" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
          <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={openCreate}>
            New beneficiary
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
            onClick={() => setAuditOpen(true)}
            sx={{ borderColor: 'divider' }}
          >
            Audit
          </Button>
          <Button
            variant="contained"
            startIcon={<DoneOutlinedIcon />}
            disabled={!canApprove}
            onClick={() => void onSetStatus('Active')}
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
        <DialogTitle>{editingId ? 'Edit beneficiary' : 'New beneficiary'}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            {saveNotice?.severity === 'error' ? (
              <Alert severity="error" onClose={() => setSaveNotice(null)}>
                {saveNotice.message}
              </Alert>
            ) : null}
            <TextField
              label="Full name"
              value={form.fullName}
              onChange={(e) => setForm((s) => ({ ...s, fullName: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="ID / reference (masked ok)"
              value={form.idDocumentRef}
              onChange={(e) => setForm((s) => ({ ...s, idDocumentRef: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Bank name"
              value={form.bankName}
              onChange={(e) => setForm((s) => ({ ...s, bankName: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Account (masked)"
              value={form.bankAccountMasked}
              onChange={(e) => setForm((s) => ({ ...s, bankAccountMasked: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Branch"
              value={form.branch}
              onChange={(e) => setForm((s) => ({ ...s, branch: e.target.value }))}
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
            {!form.fullName.trim() || !form.phone.trim() ? (
              <Alert severity="warning">Name and phone are required.</Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color="inherit" disabled={saveBusy}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void saveForm()} disabled={saveBusy || !form.fullName.trim() || !form.phone.trim()}>
            {saveBusy ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Drawer
        anchor="right"
        open={auditOpen}
        onClose={closeAuditDrawer}
        PaperProps={{ sx: { width: { xs: '100%', sm: 440 }, p: 2 } }}
      >
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography sx={{ fontWeight: 950 }}>Audit trail</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {selected ? selected.id : 'Select a beneficiary'}
              </Typography>
            </Box>
            <IconButton onClick={closeAuditDrawer}>
              <ClearOutlinedIcon />
            </IconButton>
          </Stack>
          {!selected ? (
            <Alert severity="info">Select a row.</Alert>
          ) : (
            <>
              <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
                <Chip size="small" label={`Status: ${selected.status}`} />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Maker: <Box component="span" sx={{ fontWeight: 800 }}>{selected.maker}</Box>
                  {selected.checker ? (
                    <>
                      {' '}
                      · Checker: <Box component="span" sx={{ fontWeight: 800 }}>{selected.checker}</Box>
                    </>
                  ) : null}
                </Typography>
              </Stack>
              {apiMeta.live && auditLoading ? (
                <Alert severity="info">Loading audit from API…</Alert>
              ) : (
                <Stack spacing={1}>
                  {auditTimeline.map((e, idx) => (
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
                  ))}
                </Stack>
              )}
              {!apiMeta.live ? (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Demo timeline — enable live API for persisted audit from `masters_beneficiary_audit`.
                </Alert>
              ) : null}
            </>
          )}
        </Stack>
      </Drawer>
    </Stack>
  )
}
