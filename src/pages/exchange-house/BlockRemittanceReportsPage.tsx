import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiHttpError } from '../../api/http'
import { useLiveApi } from '../../api/config'
import {
  BLOCKED_REMITTANCES_EVENT,
  fetchBlockedRemittances,
  releaseBlockedRemittance,
  saveBlockedNote,
} from '../../integrations/blockedRemittances/blockedRemittanceRepository'
import {
  listBlockedRemittances,
  type BlockedRemittanceEntry,
} from '../../state/blockedRemittanceStore'

export function BlockRemittanceReportsPage() {
  const live = useLiveApi()
  const [rows, setRows] = useState<BlockedRemittanceEntry[]>(() =>
    live ? [] : listBlockedRemittances(),
  )
  const [loading, setLoading] = useState(live)
  const [search, setSearch] = useState('')
  const [loadError, setLoadError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [actionError, setActionError] = useState('')
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    if (live) {
      setLoadError('')
      setLoading(true)
      try {
        setRows(await fetchBlockedRemittances(search))
      } catch (e) {
        setLoadError(
          e instanceof ApiHttpError ? e.message : 'Could not load blocked remittances from server.',
        )
      } finally {
        setLoading(false)
      }
      return
    }
    setRows(await fetchBlockedRemittances(search))
  }, [live, search])

  useEffect(() => {
    if (!selectedId) return
    if (!rows.some((r) => r.id === selectedId)) {
      setSelectedId(null)
    }
  }, [rows, selectedId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (live) return
    const on = () => void refresh()
    window.addEventListener(BLOCKED_REMITTANCES_EVENT, on as EventListener)
    return () => window.removeEventListener(BLOCKED_REMITTANCES_EVENT, on as EventListener)
  }, [live, refresh])

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId])
  const rowSelectionModel = useMemo(
    () => ({ type: 'include' as const, ids: new Set(selectedId ? [selectedId] : []) }),
    [selectedId],
  )

  const columns: GridColDef<BlockedRemittanceEntry>[] = useMemo(
    () => [
      { field: 'remittanceNo', headerName: 'Remittance no.', flex: 1, minWidth: 160 },
      { field: 'remitter', headerName: 'Remitter', flex: 1, minWidth: 130 },
      { field: 'beneficiary', headerName: 'Beneficiary', flex: 1, minWidth: 130 },
      { field: 'corridor', headerName: 'Corridor', flex: 0.7, minWidth: 110 },
      { field: 'amount', headerName: 'Amount', flex: 0.8, minWidth: 120 },
      { field: 'blockedAt', headerName: 'Blocked at', flex: 1, minWidth: 150 },
      { field: 'branch', headerName: 'Branch', flex: 0.7, minWidth: 100 },
      { field: 'note', headerName: 'Note', flex: 1.2, minWidth: 180 },
    ],
    [],
  )

  function openNote() {
    if (!selected) return
    setNoteDraft(selected.note ?? '')
    setNoteOpen(true)
    setActionError('')
  }

  async function onSaveNote() {
    if (!selected) return
    setSaving(true)
    setActionError('')
    try {
      await saveBlockedNote(selected.id, noteDraft)
      await refresh()
      setNoteOpen(false)
    } catch (e) {
      setActionError(e instanceof ApiHttpError ? e.message : 'Could not save note.')
    } finally {
      setSaving(false)
    }
  }

  async function onReleaseBlock() {
    if (!selected) return
    setSaving(true)
    setActionError('')
    try {
      await releaseBlockedRemittance(selected.id)
      setSelectedId(null)
      await refresh()
    } catch (e) {
      setActionError(e instanceof ApiHttpError ? e.message : 'Could not release block.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
          Block remittance reports
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          A.1.3: stop-payment register. Rows are created when a remittance is set to <Box component="span" sx={{ fontWeight: 600 }}>Stopped</Box> in Search
          &amp; Tracking. Releasing a block removes the register row and, on the server, returns the remittance to{' '}
          <Box component="span" sx={{ fontWeight: 600 }}>Pending Approval</Box> if it was stopped.
        </Typography>
      </Box>

      {live ? (
        <Alert severity="info">
          Live API: data from <code>GET /exchange-house/blocked-remittances</code> (table{' '}
          <code>eh_blocked_remittance</code>). Stopped status syncs via{' '}
          <code>PATCH /remittances/records/:id</code>.
        </Alert>
      ) : (
        <Alert severity="info">
          Local storage mode: rows persist in browser storage. To add a row: open Remittance → Search &amp; Tracking, select a
          remittance, set status to <strong>Stopped</strong>.
        </Alert>
      )}

      {loadError ? (
        <Alert severity="error" onClose={() => setLoadError('')}>
          {loadError}
        </Alert>
      ) : null}

      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
        <TextField
          size="small"
          label="Quick search"
          placeholder="Remittance no, remitter, beneficiary, note..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void refresh()
            }
          }}
          sx={{ minWidth: { xs: '100%', sm: 360 } }}
        />
        <Button variant="outlined" disabled={loading} onClick={() => void refresh()}>
          Search
        </Button>
        <Button
          variant="text"
          disabled={loading || search.trim().length === 0}
          onClick={() => setSearch('')}
        >
          Clear
        </Button>
      </Stack>

      <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
        <Button variant="outlined" disabled={!selected || saving} onClick={openNote}>
          Update note
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={!selected || saving}
          onClick={() => void onReleaseBlock()}
        >
          Cancel / release block
        </Button>
        {live ? (
          <Button variant="text" size="small" disabled={loading} onClick={() => void refresh()}>
            Refresh
          </Button>
        ) : null}
      </Stack>

      <Paper sx={{ p: 1.5, position: 'relative' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={36} />
          </Box>
        ) : (
          <Box sx={{ height: 480 }}>
            <DataGrid
              rows={rows}
              columns={columns}
              getRowId={(r) => r.id}
              rowSelectionModel={rowSelectionModel}
              onRowClick={(p) => setSelectedId(String(p.row.id))}
              onRowSelectionModelChange={(model) => {
                const next = (model as any).ids?.values().next().value
                setSelectedId(next ? String(next) : null)
              }}
              initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
              pageSizeOptions={[10, 25]}
              sx={{
                border: 0,
                '& .MuiDataGrid-columnHeaders': { borderBottom: '1px solid', borderColor: 'divider' },
              }}
            />
          </Box>
        )}
      </Paper>

      <Dialog open={noteOpen} onClose={() => !saving && setNoteOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Update block note</DialogTitle>
        <DialogContent>
          {actionError ? (
            <Alert severity="error" sx={{ mb: 1 }}>
              {actionError}
            </Alert>
          ) : null}
          <TextField
            sx={{ mt: 1 }}
            label="Note"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            fullWidth
            multiline
            minRows={3}
            disabled={saving}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteOpen(false)} disabled={saving}>
            Close
          </Button>
          <Button variant="contained" onClick={() => void onSaveNote()} disabled={saving}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(actionError) && !noteOpen}
        autoHideDuration={6000}
        onClose={() => setActionError('')}
        message={actionError}
      />
    </Stack>
  )
}
