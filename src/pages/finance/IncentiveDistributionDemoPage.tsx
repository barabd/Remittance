import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { Link as RouterLink } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import { brand } from '../../theme/appTheme'
import { useLiveApi } from '../../api/config'
import { ApiHttpError } from '../../api/http'
import {
  liveAccrueIncentiveDistributionBatch,
  liveAdvanceIncentiveDistributionBatch,
  liveListIncentiveDistributionBatches,
} from '../../api/live/client'
import {
  advanceBatchStatus,
  accrueDemoBatch,
  INCENTIVE_DISTRIBUTION_EVENT,
  loadIncentiveDistributionBatches,
  type IncentiveDistributionBatch,
} from '../../state/incentiveDistributionStore'
import { appendFeedback } from '../../state/feedbackLogStore'

function toLocalRow(r: {
  id: string
  exchangeHouse: string
  period: string
  totalIncentiveBdt: number
  remittanceCount: number
  status: 'Accrued' | 'Approved for payout' | 'Paid' | 'On hold'
  channel: 'Nostro adjustment' | 'Partner invoice' | 'GL sweep'
  updatedAt?: string
}): IncentiveDistributionBatch {
  return {
    id: r.id,
    exchangeHouse: r.exchangeHouse,
    period: r.period,
    totalIncentiveBdt: r.totalIncentiveBdt,
    remittanceCount: r.remittanceCount,
    status: r.status,
    channel: r.channel,
    updatedAt: r.updatedAt ? new Date(r.updatedAt).toLocaleString() : new Date().toLocaleString(),
  }
}

export function IncentiveDistributionDemoPage() {
  const live = useLiveApi()
  const [rows, setRows] = useState(loadIncentiveDistributionBatches)
  const [syncWarning, setSyncWarning] = useState('')
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [actionNotice, setActionNotice] = useState('')
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [accruing, setAccruing] = useState(false)

  function isRecoverableLiveFailure(error: unknown) {
    return error instanceof ApiHttpError && (error.status === 404 || error.status >= 500)
  }

  const refresh = useCallback(() => setRows(loadIncentiveDistributionBatches()), [])

  useEffect(() => {
    if (!live) return
    void liveListIncentiveDistributionBatches()
      .then((res) => {
        setRows((res.items as any[]).map(toLocalRow))
        setSyncWarning('')
        setLastSyncedAt(new Date().toISOString())
      })
      .catch((e) => {
        setSyncWarning(
          e instanceof ApiHttpError
            ? e.message
            : 'Live incentive service unavailable. Showing local fallback data.',
        )
      })
  }, [live])

  useEffect(() => {
    window.addEventListener(INCENTIVE_DISTRIBUTION_EVENT, refresh as EventListener)
    return () => window.removeEventListener(INCENTIVE_DISTRIBUTION_EVENT, refresh as EventListener)
  }, [refresh])

  const columns: GridColDef<IncentiveDistributionBatch>[] = [
    { field: 'exchangeHouse', headerName: 'Exchange house', flex: 1, minWidth: 140 },
    { field: 'period', headerName: 'Period', flex: 0.5, minWidth: 90 },
    {
      field: 'totalIncentiveBdt',
      headerName: 'Incentive ৳',
      type: 'number',
      flex: 0.7,
      minWidth: 120,
    },
    { field: 'remittanceCount', headerName: 'Tx count', type: 'number', flex: 0.5, minWidth: 100 },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.9,
      minWidth: 160,
      renderCell: (p) => (
        <Chip
          size="small"
          label={p.value}
          sx={{
            bgcolor:
              p.value === 'Paid'
                ? 'rgba(66,171,72,0.14)'
                : p.value === 'On hold'
                  ? 'rgba(0,0,0,0.08)'
                  : 'rgba(0,0,0,0.06)',
            color: p.value === 'Paid' ? brand.green : brand.black,
          }}
        />
      ),
    },
    { field: 'channel', headerName: 'Distribution channel', flex: 1, minWidth: 160 },
    { field: 'updatedAt', headerName: 'Updated', flex: 0.9, minWidth: 140 },
    {
      field: 'id',
      headerName: 'Workflow',
      flex: 0.7,
      minWidth: 120,
      sortable: false,
      renderCell: (p) => (
        <Button
          size="small"
          variant="outlined"
          disabled={workingId === String(p.value)}
          onClick={() => {
            const run = async () => {
              const id = String(p.value)
              setWorkingId(id)
              setSyncWarning('')
              if (live) {
                try {
                  const out = await liveAdvanceIncentiveDistributionBatch(id)
                  setRows((prev) => prev.map((r) => (r.id === id ? toLocalRow(out as any) : r)))
                  setSyncWarning('')
                  setLastSyncedAt(new Date().toISOString())
                  setActionNotice(`Batch ${id} advanced.`)
                  void appendFeedback('finance', `Incentive batch advanced`, id)
                } catch (e) {
                  if (isRecoverableLiveFailure(e)) {
                    advanceBatchStatus(id)
                    refresh()
                    setActionNotice(`Live API unavailable. Batch ${id} advanced locally.`)
                    void appendFeedback('finance', `Incentive batch advanced locally`, id)
                  } else {
                    setSyncWarning(e instanceof ApiHttpError ? e.message : 'Failed to advance batch')
                  }
                }
              } else {
                advanceBatchStatus(id)
                refresh()
                setActionNotice(`Batch ${id} advanced.`)
              }
              setWorkingId(null)
            }
            void run()
          }}
        >
          {workingId === String(p.value) ? 'Advancing...' : 'Advance'}
        </Button>
      ),
    },
  ]

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
          Incentive management & distribution
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          #33 — Separate demo workbench for <Box component="span" sx={{ fontWeight: 600 }}>partner incentive accrual and payout staging</Box>. Parameterized incentive
          maths live under{' '}
          <RouterLink to="/tools/corporate-file-mapping">Corporate file mapping → Incentive tiers</RouterLink>.
        </Typography>
        {live ? (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
            Last synced: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Not synced yet in this session'}
          </Typography>
        ) : null}
      </Box>

      {syncWarning ? (
        <Alert severity="warning" onClose={() => setSyncWarning('')}>
          {syncWarning}
        </Alert>
      ) : null}

      {actionNotice ? (
        <Alert severity="success" onClose={() => setActionNotice('')}>
          {actionNotice}
        </Alert>
      ) : null}

      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} flexWrap="wrap">
        <Button
          variant="contained"
          disabled={accruing}
          onClick={() => {
            const run = async () => {
              const exchangeHouse = 'EH-DEMO-' + Math.floor(Math.random() * 900 + 100)
              const period = '2026-03'
              const total = Number((15_250 + Math.random() * 500).toFixed(2))
              const count = 120
              setAccruing(true)
              setSyncWarning('')
              if (live) {
                try {
                  const out = await liveAccrueIncentiveDistributionBatch({
                    exchangeHouse,
                    period,
                    totalIncentiveBdt: total,
                    remittanceCount: count,
                  })
                  setRows((prev) => [toLocalRow(out as any), ...prev])
                  setSyncWarning('')
                  setLastSyncedAt(new Date().toISOString())
                  setActionNotice(`Batch accrued for ${exchangeHouse}.`)
                  void appendFeedback('finance', 'Incentive batch accrued', `${exchangeHouse} · ${period}`)
                } catch (e) {
                  if (isRecoverableLiveFailure(e)) {
                    accrueDemoBatch(exchangeHouse, period, total, count)
                    refresh()
                    setActionNotice(`Live API unavailable. Batch accrued locally for ${exchangeHouse}.`)
                    void appendFeedback('finance', 'Incentive batch accrued locally', `${exchangeHouse} · ${period}`)
                  } else {
                    setSyncWarning(e instanceof ApiHttpError ? e.message : 'Failed to accrue batch')
                  }
                }
              } else {
                accrueDemoBatch(exchangeHouse, period, total, count)
                refresh()
                setActionNotice(`Batch accrued for ${exchangeHouse}.`)
              }
              setAccruing(false)
            }
            void run()
          }}
        >
          {accruing ? 'Accruing...' : 'Accrue batch'}
        </Button>
        <Button variant="outlined" component={RouterLink} to="/tools/corporate-file-mapping">
          Edit tier parameters
        </Button>
      </Stack>

      <Paper sx={{ p: 1.5 }}>
        <Box sx={{ height: 480 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(r) => r.id}
            disableRowSelectionOnClick
            initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
            pageSizeOptions={[10, 25]}
            sx={{ border: 0 }}
          />
        </Box>
      </Paper>
    </Stack>
  )
}
