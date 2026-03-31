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
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import DoneOutlinedIcon from '@mui/icons-material/DoneOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import PauseCircleOutlineOutlinedIcon from '@mui/icons-material/PauseCircleOutlineOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined'
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined'
import { brand } from '../../theme/appTheme'
import { liveGetAgentAudit } from '../../api/live/client'
import type { AgentRecord, MasterApprovalStatus } from '../../state/mastersStore'
import {
  addAgent,
  loadAgents,
  setMasterStatusAgent,
  updateAgent,
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

export function AgentManagementPage() {
  const [rows, , apiMeta] = useMastersRefresh('agents', loadAgents)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    code: '',
    name: '',
    type: 'Exchange House' as AgentRecord['type'],
    country: '',
    contactPhone: '',
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
    setForm({
      code: '',
      name: '',
      type: 'Exchange House',
      country: 'BD',
      contactPhone: '',
      notes: '',
    })
    setDialogOpen(true)
  }

  function openEdit() {
    if (!selected) return
    setEditingId(selected.id)
    setForm({
      code: selected.code,
      name: selected.name,
      type: selected.type,
      country: selected.country,
      contactPhone: selected.contactPhone,
      notes: selected.notes ?? '',
    })
    setDialogOpen(true)
  }

  async function saveForm() {
    if (!form.code.trim() || !form.name.trim()) return
    if (editingId) {
      await updateAgent(editingId, { ...form })
    } else {
      await addAgent({
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        type: form.type,
        country: form.country.trim().toUpperCase().slice(0, 2) || 'BD',
        contactPhone: form.contactPhone.trim(),
        notes: form.notes.trim() || undefined,
      })
    }
    setDialogOpen(false)
    if (apiMeta.live) setAuditFetchKey((k) => k + 1)
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
        return liveGetAgentAudit(selectedId)
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
        details: `${selected.code} · ${selected.name} (${selected.type})`,
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

  const canApprove =
    selected?.status === 'Pending Approval' || selected?.status === 'On Hold'
  const canHold = selected?.status === 'Pending Approval'
  const canReject =
    selected?.status === 'Pending Approval' || selected?.status === 'On Hold'

  const columns: GridColDef<AgentRecord>[] = [
    { field: 'code', headerName: 'Code', flex: 0.7, minWidth: 110 },
    { field: 'name', headerName: 'Agent name', flex: 1.2, minWidth: 180 },
    { field: 'type', headerName: 'Type', flex: 0.9, minWidth: 130 },
    { field: 'country', headerName: 'Country', flex: 0.4, minWidth: 80 },
    { field: 'contactPhone', headerName: 'Contact', flex: 0.9, minWidth: 130 },
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
            : 'Live API: GET /agents; A.1.4 #9 — POST …/approve | …/reject (maker≠checker); hold via PATCH; audit GET …/audit.'}
        </Alert>
      ) : null}
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems="flex-start" justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
            Exchange house management
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            A.1.4 #9 — exchange houses and correspondent agents with maker-checker onboarding.
          </Typography>
        </Box>
        <Stack direction="row" gap={1} flexWrap="wrap" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
          <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={openCreate}>
            New agent
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
            onClick={() =>
              selected &&
              void setMasterStatusAgent(selected.id, 'Active').then(() =>
                setAuditFetchKey((k) => k + 1),
              )
            }
          >
            Approve
          </Button>
          <Button
            variant="outlined"
            startIcon={<PauseCircleOutlineOutlinedIcon />}
            disabled={!canHold}
            onClick={() =>
              selected &&
              void setMasterStatusAgent(selected.id, 'On Hold').then(() =>
                setAuditFetchKey((k) => k + 1),
              )
            }
            sx={{ borderColor: 'divider' }}
          >
            Hold
          </Button>
          <Button
            variant="outlined"
            startIcon={<CloseOutlinedIcon />}
            disabled={!canReject}
            onClick={() =>
              selected &&
              void setMasterStatusAgent(selected.id, 'Rejected').then(() =>
                setAuditFetchKey((k) => k + 1),
              )
            }
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
        <DialogTitle>{editingId ? 'Edit agent' : 'New agent'}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <TextField
              label="Agent code"
              value={form.code}
              onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))}
              fullWidth
              required
              disabled={Boolean(editingId)}
              helperText={editingId ? 'Code is fixed after create.' : ' '}
            />
            <TextField
              label="Name"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              select
              label="Type"
              value={form.type}
              onChange={(e) => setForm((s) => ({ ...s, type: e.target.value as AgentRecord['type'] }))}
              fullWidth
            >
              <MenuItem value="Exchange House">Exchange House</MenuItem>
              <MenuItem value="Correspondent">Correspondent</MenuItem>
              <MenuItem value="Branch Agent">Branch Agent</MenuItem>
            </TextField>
            <TextField
              label="Country (ISO2)"
              value={form.country}
              onChange={(e) => setForm((s) => ({ ...s, country: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Contact phone"
              value={form.contactPhone}
              onChange={(e) => setForm((s) => ({ ...s, contactPhone: e.target.value }))}
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
            {!form.code.trim() || !form.name.trim() ? (
              <Alert severity="warning">Code and name are required.</Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={saveForm} disabled={!form.code.trim() || !form.name.trim()}>
            Save
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
                {selected ? `${selected.code} — ${selected.name}` : 'Select an agent'}
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
                  Demo timeline — enable live API for persisted audit from `masters_agent_audit`.
                </Alert>
              ) : null}
            </>
          )}
        </Stack>
      </Drawer>
    </Stack>
  )
}
