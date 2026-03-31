import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import PlaylistAddCheckOutlinedIcon from '@mui/icons-material/PlaylistAddCheckOutlined'
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useLiveApi } from '../api/config'
import { ApiHttpError } from '../api/http'
import {
  liveListReconciliationExceptions,
  liveResolveReconciliationException,
} from '../api/live/client'
import type { ReconciliationExceptionDto } from '../api/types'
import { brand } from '../theme/appTheme'

type Row = ReconciliationExceptionDto

function rowId(r: Row): string {
  return String(r.id)
}

const fallbackRows: Row[] = [
  {
    id: '1',
    ref: 'BEFTN-942114',
    source: 'BEFTN',
    detectedAt: '2026-03-25 10:06',
    amount: '৳ 295,000.00',
    reason: 'Amount mismatch',
    status: 'Open',
  },
  {
    id: '2',
    ref: 'VOS-118220',
    source: 'Vostro',
    detectedAt: '2026-03-25 09:40',
    amount: '৳ 120,000.00',
    reason: 'Unmatched credit',
    status: 'Open',
  },
  {
    id: '3',
    ref: 'PRT-550019',
    source: 'Partner',
    detectedAt: '2026-03-24 18:05',
    amount: '৳ 60,000.00',
    reason: 'Duplicate',
    status: 'Resolved',
  },
]

const columns: GridColDef<Row>[] = [
  { field: 'ref', headerName: 'Reference', flex: 1, minWidth: 160 },
  { field: 'source', headerName: 'Source', flex: 0.8, minWidth: 120 },
  { field: 'detectedAt', headerName: 'Detected', flex: 0.9, minWidth: 150 },
  { field: 'amount', headerName: 'Amount', flex: 0.8, minWidth: 130 },
  { field: 'reason', headerName: 'Reason', flex: 1, minWidth: 170 },
  {
    field: 'status',
    headerName: 'Status',
    flex: 0.7,
    minWidth: 120,
    renderCell: (params) => (
      <Chip
        size="small"
        label={params.value}
        sx={{
          bgcolor: params.value === 'Resolved' ? 'rgba(66,171,72,0.12)' : 'rgba(0,0,0,0.06)',
          color: params.value === 'Resolved' ? brand.green : brand.black,
        }}
      />
    ),
  },
]

export function ReconExceptionsPage() {
  const live = useLiveApi()
  const [rows, setRows] = useState<Row[]>(fallbackRows)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'All' | Row['status']>('All')
  const [sourceFilter, setSourceFilter] = useState<'All' | Row['source']>('All')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = useMemo(
    () => rows.find((r) => rowId(r) === selectedId) ?? null,
    [rows, selectedId],
  )
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== 'All' && r.status !== statusFilter) return false
      if (sourceFilter !== 'All' && r.source !== sourceFilter) return false
      return true
    })
  }, [rows, statusFilter, sourceFilter])

  const refreshLive = useCallback(async () => {
    if (!live) return
    setLoading(true)
    setError(null)
    try {
      const page = await liveListReconciliationExceptions()
      setRows(page.items)
      setSelectedId((current) => (current && page.items.some((r) => rowId(r) === current) ? current : null))
    } catch (e) {
      setError(
        e instanceof ApiHttpError
          ? `${e.message}. Showing local fallback rows.`
          : 'Could not load live reconciliation exceptions. Showing local fallback rows.',
      )
      setRows(fallbackRows)
    } finally {
      setLoading(false)
    }
  }, [live])

  useEffect(() => {
    if (!live) {
      void Promise.resolve().then(() => setRows(fallbackRows))
      return
    }
    void Promise.resolve().then(() => refreshLive())
  }, [live, refreshLive])

  async function onResolve() {
    if (!selected || selected.status === 'Resolved') return
    if (!live) {
      setRows((current) =>
        current.map((r) => (rowId(r) === rowId(selected) ? { ...r, status: 'Resolved' } : r)),
      )
      setNotice('Marked resolved in local demo mode.')
      return
    }
    setLoading(true)
    setError(null)
    setNotice(null)
    try {
      const resolved = await liveResolveReconciliationException(selected.id)
      setRows((current) => current.map((r) => (rowId(r) === rowId(resolved) ? resolved : r)))
      try {
        await refreshLive()
      } catch {
        // Keep optimistic resolved state if refresh fails after successful resolve.
      }
      setNotice(`Marked ${selected.ref} as resolved.`)
    } catch (e) {
      setRows((current) =>
        current.map((r) => (rowId(r) === rowId(selected) ? { ...r, status: 'Resolved' } : r)),
      )
      setNotice(`Marked ${selected.ref} as resolved locally (live API unavailable).`)
      setError(e instanceof ApiHttpError ? e.message : 'Could not mark reconciliation exception as resolved.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
            Reconciliation Exceptions
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            BEFTN/Vostro/partner exceptions for matching and resolution.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PlaylistAddCheckOutlinedIcon />}
          onClick={() => void onResolve()}
          disabled={loading || !selected || selected.status === 'Resolved'}
        >
          Mark resolved
        </Button>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
        <TextField
          select
          label="Status"
          size="small"
          value={statusFilter}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setStatusFilter(e.target.value as 'All' | Row['status'])
          }
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="All">All</MenuItem>
          <MenuItem value="Open">Open</MenuItem>
          <MenuItem value="Resolved">Resolved</MenuItem>
        </TextField>
        <TextField
          select
          label="Source"
          size="small"
          value={sourceFilter}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setSourceFilter(e.target.value as 'All' | Row['source'])
          }
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="All">All</MenuItem>
          <MenuItem value="BEFTN">BEFTN</MenuItem>
          <MenuItem value="Vostro">Vostro</MenuItem>
          <MenuItem value="Partner">Partner</MenuItem>
        </TextField>
        {live ? (
          <Button variant="outlined" onClick={() => void refreshLive()} disabled={loading}>
            Refresh live
          </Button>
        ) : null}
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {notice ? <Alert severity="success" onClose={() => setNotice(null)}>{notice}</Alert> : null}

      {live ? (
        <Alert severity="info">
          Live mode: this page reads from backend database via GET /reconciliation/exceptions and resolves via POST /reconciliation/exceptions/:id/resolve.
        </Alert>
      ) : (
        <Alert severity="warning">Live API is off. Showing local demo exceptions only.</Alert>
      )}

      <Paper sx={{ p: 1.5 }}>
        <Box sx={{ height: 460 }}>
          <DataGrid
            rows={filteredRows}
            columns={columns}
            getRowId={(r) => rowId(r)}
            rowSelectionModel={{ type: 'include', ids: new Set(selectedId ? [selectedId] : []) }}
            onRowClick={(params) => setSelectedId(String(params.row.id))}
            onRowSelectionModelChange={(model) => {
              const next = (model as any).ids?.values().next().value
              setSelectedId(next ? String(next) : null)
            }}
            initialState={{
              pagination: { paginationModel: { pageSize: 10, page: 0 } },
            }}
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
    </Stack>
  )
}

