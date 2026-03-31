import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLiveApi } from '../../api/config'
import { ApiHttpError } from '../../api/http'
import {
  deleteRiskProfile,
  loadRiskProfiles,
  RISK_CONTROL_EVENT,
  syncRiskProfilesFromLive,
  type RiskProfile,
  upsertRiskProfile,
} from '../../state/riskControlStore'

function parsePositiveAmount(raw: string): number | null {
  const value = raw.trim()
  if (!/^\d+$/.test(value)) return null
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

function watchChipColor(level: RiskProfile['watchLevel']): 'success' | 'warning' | 'error' {
  if (level === 'High') return 'error'
  if (level === 'Medium') return 'warning'
  return 'success'
}

const EMPTY_FORM = {
  customerName: '',
  maxPerTxnBdt: '500000',
  maxDailyTotalBdt: '1500000',
  watchLevel: 'Medium' as RiskProfile['watchLevel'],
}

export function RiskControlPage() {
  const live = useLiveApi()
  const [rows, setRows] = useState(loadRiskProfiles)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<RiskProfile | null>(null)
  const [saving, setSaving] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    const sync = () => setRows(loadRiskProfiles())
    window.addEventListener(RISK_CONTROL_EVENT, sync as EventListener)
    return () => window.removeEventListener(RISK_CONTROL_EVENT, sync as EventListener)
  }, [])

  useEffect(() => {
    if (!live) return
    // All setState calls are deferred into the async chain to satisfy
    // react-hooks/set-state-in-effect (no synchronous setState in effect body).
    void Promise.resolve()
      .then(() => {
        setSyncing(true)
        return syncRiskProfilesFromLive()
      })
      .then(() => {
        setRows(loadRiskProfiles())
        setSyncError(null)
      })
      .catch((e: unknown) => {
        setSyncError(e instanceof ApiHttpError ? e.message : 'Could not sync risk profiles from live API.')
      })
      .finally(() => setSyncing(false))
  }, [live])

  const openAdd = useCallback(() => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogError(null)
    setDialogOpen(true)
  }, [])

  const openEdit = useCallback(
    (id: string) => {
      const r = rows.find((x) => x.id === id) ?? null
      if (!r) return
      setEditing(r)
      setForm({
        customerName: r.customerName,
        maxPerTxnBdt: String(r.maxPerTxnBdt),
        maxDailyTotalBdt: String(r.maxDailyTotalBdt),
        watchLevel: r.watchLevel,
      })
      setDialogError(null)
      setDialogOpen(true)
    },
    [rows],
  )

  const cols: GridColDef<RiskProfile>[] = useMemo(
    () => [
      { field: 'customerName', headerName: 'Customer', flex: 1.2, minWidth: 180 },
      {
        field: 'maxPerTxnBdt',
        headerName: 'Per Txn Limit (BDT)',
        type: 'number',
        flex: 0.9,
        minWidth: 160,
        valueFormatter: (val) => Number(val).toLocaleString(),
      },
      {
        field: 'maxDailyTotalBdt',
        headerName: 'Daily Limit (BDT)',
        type: 'number',
        flex: 0.9,
        minWidth: 160,
        valueFormatter: (val) => Number(val).toLocaleString(),
      },
      {
        field: 'watchLevel',
        headerName: 'Watch',
        flex: 0.6,
        minWidth: 110,
        renderCell: (p) => (
          <Chip
            size="small"
            label={p.value as string}
            color={watchChipColor(p.value as RiskProfile['watchLevel'])}
          />
        ),
      },
      { field: 'updatedAt', headerName: 'Updated', flex: 0.8, minWidth: 140 },
      {
        field: 'id',
        headerName: 'Actions',
        flex: 0.9,
        minWidth: 170,
        sortable: false,
        renderCell: (p) => (
          <Stack direction="row" gap={1}>
            <Button
              size="small"
              variant="outlined"
              disabled={saving || deleting}
              onClick={() => openEdit(String(p.value))}
            >
              Edit
            </Button>
            <Button
              size="small"
              color="error"
              disabled={saving || deleting}
              onClick={() => {
                setDeleteError(null)
                setPendingDeleteId(String(p.value))
              }}
            >
              Delete
            </Button>
          </Stack>
        ),
      },
    ],
    // `rows` removed: openEdit (in deps) already has [rows] as its own dep,
    // so the compiler correctly infers rows is tracked transitively.
    [saving, deleting, openEdit],
  )

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
          Customer credit &amp; payment risk controls
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Per-customer transaction and daily BDT caps. Approval gates in remittance and disbursement
          screens enforce these limits automatically.
        </Typography>
      </Box>

      {syncError ? (
        <Alert severity="error" onClose={() => setSyncError(null)}>
          {syncError}
        </Alert>
      ) : null}
      {deleteError ? (
        <Alert severity="error" onClose={() => setDeleteError(null)}>
          {deleteError}
        </Alert>
      ) : null}
      {live ? (
        <Alert severity="success">
          Live API connected — risk profiles persist to the backend database.
        </Alert>
      ) : (
        <Alert severity="warning">Live API is off — running in local demo mode.</Alert>
      )}

      <Paper sx={{ p: 1.5 }}>
        <Stack direction="row" justifyContent="flex-end" alignItems="center" gap={1.5} sx={{ mb: 1 }}>
          {syncing ? <CircularProgress size={18} /> : null}
          <Button variant="contained" onClick={openAdd} disabled={syncing}>
            Add risk profile
          </Button>
        </Stack>
        <Box sx={{ height: 460 }}>
          <DataGrid
            rows={rows}
            columns={cols}
            getRowId={(r) => r.id}
            disableRowSelectionOnClick
            initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
            pageSizeOptions={[10, 25]}
            sx={{ border: 0 }}
            loading={syncing}
          />
        </Box>
      </Paper>

      {/* Add / Edit dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => {
          if (saving) return
          setDialogOpen(false)
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editing ? 'Edit risk profile' : 'New risk profile'}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            {dialogError ? <Alert severity="error">{dialogError}</Alert> : null}
            <TextField
              label="Customer name"
              value={form.customerName}
              onChange={(e) => setForm((s) => ({ ...s, customerName: e.target.value }))}
              fullWidth
              autoFocus
              disabled={saving}
            />
            <TextField
              label="Max per transaction (BDT)"
              value={form.maxPerTxnBdt}
              onChange={(e) => setForm((s) => ({ ...s, maxPerTxnBdt: e.target.value }))}
              fullWidth
              inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
              disabled={saving}
              helperText="Must be a positive whole number, e.g. 500000"
            />
            <TextField
              label="Max daily total (BDT)"
              value={form.maxDailyTotalBdt}
              onChange={(e) => setForm((s) => ({ ...s, maxDailyTotalBdt: e.target.value }))}
              fullWidth
              inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
              disabled={saving}
              helperText="Must be ≥ max per transaction"
            />
            <TextField
              select
              label="Watch level"
              value={form.watchLevel}
              onChange={(e) =>
                setForm((s) => ({ ...s, watchLevel: e.target.value as RiskProfile['watchLevel'] }))
              }
              fullWidth
              disabled={saving}
            >
              <MenuItem value="Low">Low</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="High">High</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={saving}
            onClick={() => {
              const customerName = form.customerName.trim()
              const maxPerTxnBdt = parsePositiveAmount(form.maxPerTxnBdt)
              const maxDailyTotalBdt = parsePositiveAmount(form.maxDailyTotalBdt)

              if (!customerName) {
                setDialogError('Customer name is required.')
                return
              }
              if (maxPerTxnBdt == null) {
                setDialogError('Max per transaction must be a positive whole number (e.g. 500000).')
                return
              }
              if (maxDailyTotalBdt == null) {
                setDialogError('Max daily total must be a positive whole number (e.g. 1500000).')
                return
              }
              if (maxDailyTotalBdt < maxPerTxnBdt) {
                setDialogError(
                  'Max daily total must be greater than or equal to max per transaction.',
                )
                return
              }

              const duplicate = rows.some(
                (r) =>
                  r.customerName.trim().toLowerCase() === customerName.toLowerCase() &&
                  r.id !== editing?.id,
              )
              if (duplicate) {
                setDialogError(`A risk profile already exists for "${customerName}".`)
                return
              }

              setSaving(true)
              setDialogError(null)
              void upsertRiskProfile({
                id: editing?.id,
                customerName,
                maxPerTxnBdt,
                maxDailyTotalBdt,
                watchLevel: form.watchLevel,
              })
                .then(() => {
                  setRows(loadRiskProfiles())
                  setDialogOpen(false)
                })
                .catch((e: unknown) => {
                  setDialogError(
                    e instanceof ApiHttpError ? e.message : 'Could not save risk profile.',
                  )
                })
                .finally(() => setSaving(false))
            }}
          >
            {saving ? <CircularProgress size={18} color="inherit" /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={pendingDeleteId != null}
        onClose={() => {
          if (deleting) return
          setPendingDeleteId(null)
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete risk profile?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This will permanently remove the risk profile for{' '}
            <Box component="span" sx={{ fontWeight: 600 }}>
              {rows.find((r) => r.id === pendingDeleteId)?.customerName ?? pendingDeleteId}
            </Box>
            . Approval gates that reference this customer will no longer apply transaction or daily
            limits.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDeleteId(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleting}
            onClick={() => {
              if (!pendingDeleteId) return
              setDeleting(true)
              void deleteRiskProfile(pendingDeleteId)
                .then(() => {
                  setRows(loadRiskProfiles())
                  setPendingDeleteId(null)
                })
                .catch((e: unknown) => {
                  setDeleteError(
                    e instanceof ApiHttpError ? e.message : 'Could not delete risk profile.',
                  )
                  setPendingDeleteId(null)
                })
                .finally(() => setDeleting(false))
            }}
          >
            {deleting ? <CircularProgress size={18} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

