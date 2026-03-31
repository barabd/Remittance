import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLiveApi } from '../../api/config'
import { ApiHttpError } from '../../api/http'
import {
  liveListReconciliationSlabs,
  liveListReconciliationExceptions,
} from '../../api/live/client'
import type { ReconciliationSlabDto, ReconciliationExceptionDto } from '../../api/types'
import { brand } from '../../theme/appTheme'

type SlabRow = ReconciliationSlabDto
type ExceptionRow = ReconciliationExceptionDto

const fallbackRows: SlabRow[] = [
  { id: 'SLAB-1', channel: 'BEFTN', slabLabel: 'Slab A (0 – 200k BDT)', amountFrom: '৳ 0', amountTo: '৳ 200,000', expectedCredits: 142, matchedCredits: 142, variance: '৳ 0', status: 'Balanced' },
  { id: 'SLAB-2', channel: 'BEFTN', slabLabel: 'Slab B (200k – 1M BDT)', amountFrom: '৳ 200,000', amountTo: '৳ 1,000,000', expectedCredits: 38, matchedCredits: 37, variance: '৳ 12,500', status: 'Review' },
  { id: 'SLAB-3', channel: 'Vostro', slabLabel: 'Nostro mirror — USD', amountFrom: 'USD 0', amountTo: 'USD 500k', expectedCredits: 56, matchedCredits: 56, variance: 'USD 0', status: 'Balanced' },
  { id: 'SLAB-4', channel: 'Vostro', slabLabel: 'Nostro mirror — EUR', amountFrom: 'EUR 0', amountTo: 'EUR 250k', expectedCredits: 22, matchedCredits: 21, variance: 'EUR 4,200', status: 'Review' },
]

const exceptionFallback: ExceptionRow[] = [
  { id: 'REX-0001', ref: 'BEFTN-942114', source: 'BEFTN', detectedAt: '2026-03-25 10:06', amount: '৳ 295,000.00', reason: 'Amount mismatch', status: 'Open', slabId: 'SLAB-2' },
  { id: 'REX-0002', ref: 'VOS-118220', source: 'Vostro', detectedAt: '2026-03-25 09:40', amount: '৳ 120,000.00', reason: 'Unmatched credit', status: 'Open', slabId: 'SLAB-4' },
]

const slabColumns: GridColDef<SlabRow>[] = [
  { field: 'channel', headerName: 'Channel', flex: 0.6, minWidth: 100 },
  { field: 'slabLabel', headerName: 'Slab / band', flex: 1.2, minWidth: 200 },
  { field: 'amountFrom', headerName: 'From', flex: 0.7, minWidth: 110 },
  { field: 'amountTo', headerName: 'To', flex: 0.7, minWidth: 110 },
  { field: 'expectedCredits', headerName: 'Expected txns', type: 'number', flex: 0.6, minWidth: 120 },
  { field: 'matchedCredits', headerName: 'Matched', type: 'number', flex: 0.6, minWidth: 100 },
  { field: 'variance', headerName: 'Variance', flex: 0.7, minWidth: 110 },
  {
    field: 'status',
    headerName: 'Status',
    flex: 0.5,
    minWidth: 100,
    renderCell: (p) => (
      <Chip
        size="small"
        label={p.value}
        sx={{
          bgcolor: p.value === 'Balanced' ? 'rgba(66,171,72,0.14)' : 'rgba(0,0,0,0.06)',
          color: p.value === 'Balanced' ? brand.green : brand.black,
        }}
      />
    ),
  },
]

const exceptionColumns: GridColDef<ExceptionRow>[] = [
  { field: 'ref', headerName: 'Reference', flex: 1, minWidth: 130 },
  { field: 'source', headerName: 'Source', flex: 0.7, minWidth: 100 },
  { field: 'detectedAt', headerName: 'Detected', flex: 0.9, minWidth: 140 },
  { field: 'amount', headerName: 'Amount', flex: 0.8, minWidth: 120 },
  { field: 'reason', headerName: 'Reason', flex: 1, minWidth: 150 },
  {
    field: 'status',
    headerName: 'Status',
    flex: 0.7,
    minWidth: 100,
    renderCell: (p) => (
      <Chip
        size="small"
        label={p.value}
        sx={{
          bgcolor: p.value === 'Resolved' ? 'rgba(66,171,72,0.14)' : 'rgba(240, 83, 83, 0.14)',
          color: p.value === 'Resolved' ? brand.green : '#f05353',
        }}
      />
    ),
  },
]

export function ReconciliationSlabsPage() {
  const live = useLiveApi()
  const [rows, setRows] = useState<SlabRow[]>(fallbackRows)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [channelFilter, setChannelFilter] = useState<'All' | 'BEFTN' | 'Vostro'>('All')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Balanced' | 'Review'>('All')

  // Drill-down state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedSlab, setSelectedSlab] = useState<SlabRow | null>(null)
  const [exceptions, setExceptions] = useState<ExceptionRow[]>([])
  const [exceptionsLoading, setExceptionsLoading] = useState(false)

  const refreshLive = useCallback(() => {
    setLoading(true)
    setError(null)
    return liveListReconciliationSlabs()
      .then((p) => {
        setRows(p.items.length > 0 ? (p.items as SlabRow[]) : fallbackRows)
      })
      .catch((e: unknown) => {
        const msg = e instanceof ApiHttpError ? e.message : 'Failed to load slabs from backend.'
        setError(`${msg} Showing local fallback rows.`)
        setRows(fallbackRows)
      })
      .finally(() => setLoading(false))
  }, [])

  const loadExceptions = useCallback(
    (slabId: string) => {
      setExceptionsLoading(true)
      return liveListReconciliationExceptions({ slabId })
        .then((p) => {
          setExceptions(p.items.length > 0 ? (p.items as ExceptionRow[]) : exceptionFallback.filter((e) => e.slabId === slabId))
        })
        .catch(() => {
          setExceptions(exceptionFallback.filter((e) => e.slabId === slabId))
        })
        .finally(() => setExceptionsLoading(false))
    },
    [],
  )

  const handleViewExceptions = useCallback(
    (slab: SlabRow) => {
      setSelectedSlab(slab)
      setDrawerOpen(true)
      void loadExceptions(slab.id)
    },
    [loadExceptions],
  )

  useEffect(() => {
    if (!live) {
      void Promise.resolve().then(() => setRows(fallbackRows))
      return
    }
    void Promise.resolve().then(() => refreshLive())
  }, [live, refreshLive])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const chOk = channelFilter === 'All' || r.channel === channelFilter
      const stOk = statusFilter === 'All' || r.status === statusFilter
      return chOk && stOk
    })
  }, [rows, channelFilter, statusFilter])

  // Extend columns with action button
  const columnsWithActions: GridColDef<SlabRow>[] = [
    ...slabColumns,
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.6,
      minWidth: 100,
      sortable: false,
      renderCell: (params) => (
        <Button
          size="small"
          variant="outlined"
          startIcon={<OpenInNewIcon />}
          onClick={() => handleViewExceptions(params.row)}
        >
          Exceptions
        </Button>
      ),
    },
  ]

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
          Slab-wise BEFTN &amp; Vostro reconciliation
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          A.1.3: summary by amount slab. Tie out to settlement batches and vostro statements; drill into Reconciliation Exceptions for breaks. Data backed by{' '}
          <Box component="code" sx={{ fontFamily: 'monospace', fontSize: '0.85em' }}>
            GET /reconciliation/slabs
          </Box>{' '}
          → <Box component="code" sx={{ fontFamily: 'monospace', fontSize: '0.85em' }}>reconciliation_slab</Box>.
        </Typography>
      </Box>

      {live ? (
        <Alert severity="success">
          Live API connected — slab rows read from{' '}
          <Box component="code" sx={{ fontFamily: 'monospace', fontSize: '0.85em' }}>
            GET /reconciliation/slabs
          </Box>{' '}
          (database: <Box component="code" sx={{ fontFamily: 'monospace', fontSize: '0.85em' }}>reconciliation_slab</Box>).
        </Alert>
      ) : (
        <Alert severity="warning">Live API off — showing local demo slabs.</Alert>
      )}

      {error ? (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Paper sx={{ p: 1.5 }}>
        <Stack direction="row" gap={1.5} sx={{ mb: 1.5 }} flexWrap="wrap" alignItems="center">
          {loading ? <CircularProgress size={18} /> : null}
          <TextField
            select
            size="small"
            label="Channel"
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value as typeof channelFilter)}
            sx={{ minWidth: 130 }}
          >
            {['All', 'BEFTN', 'Vostro'].map((v) => (
              <MenuItem key={v} value={v}>
                {v}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            sx={{ minWidth: 130 }}
          >
            {['All', 'Balanced', 'Review'].map((v) => (
              <MenuItem key={v} value={v}>
                {v}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <Box sx={{ height: 400 }}>
          <DataGrid
            rows={filtered}
            columns={columnsWithActions}
            loading={loading}
            disableRowSelectionOnClick
            initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
            pageSizeOptions={[10, 25]}
            sx={{
              border: 0,
              '& .MuiDataGrid-columnHeaders': { borderBottom: '1px solid', borderColor: 'divider' },
            }}
          />
        </Box>
      </Paper>

      {/* Drill-down drawer for exceptions */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)} sx={{ '& .MuiDrawer-paper': { width: 800 } }}>
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
          {selectedSlab ? (
            <>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Exceptions: {selectedSlab.slabLabel}
              </Typography>
              <Stack direction="row" gap={2} sx={{ mb: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Channel
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {selectedSlab.channel}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Expected / Matched
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {selectedSlab.expectedCredits} / {selectedSlab.matchedCredits}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Variance
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: selectedSlab.status === 'Balanced' ? brand.green : '#f05353' }}>
                    {selectedSlab.variance}
                  </Typography>
                </Box>
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              {exceptionsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress />
                </Box>
              ) : exceptions.length === 0 ? (
                <Typography variant="body2" sx={{ color: 'text.secondary', py: 2 }}>
                  No exceptions found for this slab.
                </Typography>
              ) : (
                <Box sx={{ flex: 1, overflow: 'auto', mt: 1 }}>
                  <DataGrid
                    rows={exceptions}
                    columns={exceptionColumns}
                    disableRowSelectionOnClick
                    initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                    pageSizeOptions={[10, 25]}
                    sx={{
                      border: 0,
                      height: '100%',
                      '& .MuiDataGrid-columnHeaders': { borderBottom: '1px solid', borderColor: 'divider' },
                    }}
                  />
                </Box>
              )}
            </>
          ) : null}
        </Box>
      </Drawer>
    </Stack>
  )
}
