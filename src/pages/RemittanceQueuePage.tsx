import { Alert, Box, Button, Chip, Paper, Snackbar, Stack, TextField, Typography } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import DoneOutlinedIcon from '@mui/icons-material/DoneOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLiveApi } from '../api/config'
import { brand } from '../theme/appTheme'
import { publishOpsMetrics } from '../state/opsMetricsStore'
import { appendBfiuReport } from '../state/bfiuReportingStore'
import {
  approveQueueItem,
  DEFAULT_QUEUE_CHECKER_USER,
  loadQueueRows,
  REMITTANCE_QUEUE_EVENT,
  rejectQueueItem,
  syncRemittanceQueueFromLive,
  type RemittanceQueueRow,
} from '../state/remittanceQueueStore'

const LS_REMITTANCE_KEY = 'frms.remittance_search.v1'
const LS_DISBURSEMENT_KEY = 'frms.disbursement.v1'

type RemittanceStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Sent'
  | 'Paid'
  | 'Stopped'
  | 'Returned'
  | 'Rejected'
  | 'On Hold'

/** Sync queue approval/rejection to Search page localStorage */
function syncQueueStatusToSearchPage(remittanceNo: string, status: 'Approved' | 'Rejected', checker: string) {
  try {
    const raw = localStorage.getItem(LS_REMITTANCE_KEY)
    if (!raw) return
    
    const rows = JSON.parse(raw) as Array<{ remittanceNo: string; status: RemittanceStatus; checker?: string }>
    const updated = rows.map((r) => 
      r.remittanceNo === remittanceNo 
        ? { ...r, status, checker }
        : r
    )
    localStorage.setItem(LS_REMITTANCE_KEY, JSON.stringify(updated))
    console.log(`Synced ${status} status to Search page for ${remittanceNo}`)
  } catch (e) {
    console.error('Failed to sync status to Search page:', e)
  }
}

/** Convert amount to BDT format */
function convertToBDT(amount: string, corridor: string): string {
  const numMatch = amount.match(/[\d,]+\.?\d*/)?.[0]?.replace(/,/g, '')
  const num = parseFloat(numMatch || '0')
  
  const rates: Record<string, number> = {
    'USD': 119,
    'AED': 32.5,
    'SAR': 31.8,
    'GBP': 155,
    'EUR': 130,
  }
  
  const ccy = corridor.split('→')[0]?.trim() || 'USD'
  const rate = rates[ccy] || 100
  const bdtAmount = num * rate
  
  return `৳ ${bdtAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Sync approved queue item to Disbursement page */
function syncApprovedToDisbursement(queueRow: RemittanceQueueRow, checker: string) {
  try {
    // Get beneficiary from Search page
    const searchRaw = localStorage.getItem(LS_REMITTANCE_KEY)
    let beneficiary = 'Unknown'
    
    if (searchRaw) {
      const searchRows = JSON.parse(searchRaw) as Array<{ 
        remittanceNo: string
        beneficiary: string 
      }>
      const match = searchRows.find(r => r.remittanceNo === queueRow.remittanceNo)
      if (match) beneficiary = match.beneficiary
    }

    const disbursementItem = {
      id: queueRow.id,
      remittanceNo: queueRow.remittanceNo,
      createdAt: queueRow.createdAt,
      corridor: queueRow.corridor,
      channel: queueRow.payType === 'Cash' ? 'Cash' as const : 'BEFTN' as const,
      payoutTo: queueRow.payType === 'Cash' ? 'Cash Pickup' : 'Bank Account',
      beneficiary: beneficiary,
      amountBDT: convertToBDT(queueRow.amount, queueRow.corridor),
      maker: queueRow.maker,
      checker: checker,
      status: 'Approved' as const,
      originatingUnit: queueRow.maker.toLowerCase().includes('sub') ? 'Sub-Branch' as const : 'Branch' as const,
    }

    const disbursementRaw = localStorage.getItem(LS_DISBURSEMENT_KEY)
    const disbursementRows = disbursementRaw ? JSON.parse(disbursementRaw) : []
    
    const existingIndex = disbursementRows.findIndex((r: { remittanceNo: string }) => r.remittanceNo === queueRow.remittanceNo)
    
    if (existingIndex >= 0) {
      disbursementRows[existingIndex] = disbursementItem
    } else {
      disbursementRows.unshift(disbursementItem)
    }

    localStorage.setItem(LS_DISBURSEMENT_KEY, JSON.stringify(disbursementRows))
    window.dispatchEvent(new CustomEvent('disbursement:added', { detail: disbursementItem }))
    
    console.log(`✓ Synced to Disbursement: ${queueRow.remittanceNo}`)
  } catch (e) {
    console.error('Failed to sync to Disbursement:', e)
  }
}

function pendingCount(list: RemittanceQueueRow[]) {
  return list.filter((r) => r.status === 'Pending Approval').length
}

function statusChipColor(status: RemittanceQueueRow['status']) {
  if (status === 'Pending Approval') return { bg: 'rgba(66,171,72,0.12)', fg: brand.green }
  if (status === 'Approved') return { bg: 'rgba(66,171,72,0.14)', fg: brand.green }
  if (status === 'On Hold') return { bg: 'rgba(237,108,2,0.12)', fg: '#ed6c02' }
  return { bg: 'rgba(0,0,0,0.06)', fg: brand.black }
}

const columns: GridColDef<RemittanceQueueRow>[] = [
  { field: 'remittanceNo', headerName: 'Remittance No', flex: 1, minWidth: 170 },
  { field: 'payType', headerName: 'Pay type', flex: 0.7, minWidth: 110 },
  { field: 'exchangeHouse', headerName: 'Exchange house', flex: 0.8, minWidth: 120 },
  { field: 'createdAt', headerName: 'Created', flex: 1, minWidth: 160 },
  { field: 'corridor', headerName: 'Corridor', flex: 1, minWidth: 120 },
  { field: 'amount', headerName: 'Amount', flex: 1, minWidth: 140 },
  { field: 'maker', headerName: 'Maker', flex: 1, minWidth: 120 },
  {
    field: 'status',
    headerName: 'Status',
    flex: 1,
    minWidth: 140,
    renderCell: (params) => {
      const c = statusChipColor(params.value)
      return (
        <Chip
          size="small"
          label={params.value}
          sx={{ bgcolor: c.bg, color: c.fg, fontWeight: 500 }}
        />
      )
    },
  },
]

export function RemittanceQueuePage() {
  const live = useLiveApi()
  const [rows, setRows] = useState<RemittanceQueueRow[]>(() => loadQueueRows())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [checkerUser, setCheckerUser] = useState(DEFAULT_QUEUE_CHECKER_USER)
  const [rejectReason, setRejectReason] = useState('')
  const [liveError, setLiveError] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [snack, setSnack] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'info' | 'warning' | 'error'
  }>({ open: false, message: '', severity: 'info' })

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  )

  const checkerConflict = Boolean(
    selected && checkerUser.trim() && checkerUser.trim().toLowerCase() === selected.maker.trim().toLowerCase(),
  )

  const canAct =
    Boolean(selected) &&
    (selected?.status === 'Pending Approval' || selected?.status === 'On Hold') &&
    checkerUser.trim().length > 0 &&
    !checkerConflict

  const refreshFromStore = useCallback(() => {
    setRows(loadQueueRows())
  }, [])

  useEffect(() => {
    publishOpsMetrics({ queuePendingApprovals: pendingCount(rows) })
  }, [rows])

  useEffect(() => {
    let cancelled = false
    async function pull() {
      if (!live) {
        refreshFromStore()
        return
      }
      setLiveError(null)
      try {
        await syncRemittanceQueueFromLive()
        if (!cancelled) {
          refreshFromStore()
          setSelectedId(null)
        }
      } catch (e) {
        if (!cancelled) {
          refreshFromStore()
          setLiveError(e instanceof Error ? e.message : 'Live API failed')
        }
      }
    }
    void pull()
    return () => {
      cancelled = true
    }
  }, [live, refreshFromStore])

  useEffect(() => {
    const on = () => refreshFromStore()
    window.addEventListener(REMITTANCE_QUEUE_EVENT, on as EventListener)
    return () => window.removeEventListener(REMITTANCE_QUEUE_EVENT, on as EventListener)
  }, [refreshFromStore])

  async function approve() {
    if (!selected || !canAct || actionBusy) return
    setActionBusy(true)
    setLiveError(null)
    try {
      await approveQueueItem(selected.id, checkerUser)
      syncQueueStatusToSearchPage(selected.remittanceNo, 'Approved', checkerUser)
      syncApprovedToDisbursement(selected, checkerUser)
      refreshFromStore()
      setSelectedId(null)
      setSnack({ open: true, severity: 'success', message: 'Approved! Added to Disbursement worklist for payout.' })
    } catch (e) {
      setLiveError(e instanceof Error ? e.message : 'Approve failed')
      setSnack({
        open: true,
        severity: 'error',
        message: e instanceof Error ? e.message : 'Approve failed',
      })
    } finally {
      setActionBusy(false)
    }
  }

  async function reject() {
    if (!selected || !canAct || actionBusy) return
    setActionBusy(true)
    setLiveError(null)
    try {
      await rejectQueueItem(selected.id, {
        checkerUser,
        reason: rejectReason.trim() || undefined,
      })
      syncQueueStatusToSearchPage(selected.remittanceNo, 'Rejected', checkerUser)
      refreshFromStore()
      setSelectedId(null)
      setRejectReason('')
      setSnack({ open: true, severity: 'info', message: 'Queue item rejected. Status updated in Search & Tracking.' })
    } catch (e) {
      setLiveError(e instanceof Error ? e.message : 'Reject failed')
      setSnack({
        open: true,
        severity: 'error',
        message: e instanceof Error ? e.message : 'Reject failed',
      })
    } finally {
      setActionBusy(false)
    }
  }

  function reportStr() {
    if (!selected) return
    const amt = parseFloat(selected.amount.replace(/[^0-9.]/g, ''))
    appendBfiuReport({
      remittanceNo: selected.remittanceNo,
      reportType: 'STR',
      amountBdt: amt,
      reason: 'Manual STR report from approvals queue by checker.',
    })
    setSnack({ open: true, severity: 'warning', message: `Transaction ${selected.remittanceNo} reported to BFIU as STR.` })
  }

  return (
    <Stack spacing={2.5}>
      {live ? (
        <Alert severity={liveError ? 'warning' : 'info'}>
          {liveError
            ? `Live API: ${liveError}. Showing cached queue.`
            : `Live API: GET /remittances/queue. Approve/reject call POST …/approve|reject with checker "${checkerUser.trim() || DEFAULT_QUEUE_CHECKER_USER}" (must differ from maker).`}
        </Alert>
      ) : null}
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
            Approvals Queue
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Maker-checker approval for cash and account-pay remittances (A.1.4 #1–#2). Queue rows match table{' '}
            <code>remittance_queue_item</code> when live API is enabled.
          </Typography>
        </Box>
        <Stack spacing={1.25} sx={{ width: { xs: '100%', md: 420 } }}>
          <TextField
            size="small"
            label="Checker user"
            value={checkerUser}
            onChange={(e) => setCheckerUser(e.target.value)}
            error={checkerConflict}
            helperText={
              checkerConflict
                ? 'Checker user must not match the selected maker.'
                : 'This checker will be sent with approve/reject requests.'
            }
          />
          <TextField
            size="small"
            label="Reject reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Optional reason for rejection"
          />
          <Stack direction="row" gap={1}>
            <Button
              variant="contained"
              startIcon={<DoneOutlinedIcon />}
              disabled={!canAct || actionBusy}
              onClick={() => void approve()}
            >
              {!selected ? 'Approve' : selected.payType === 'Cash' ? 'Approve cash pay' : 'Approve account pay'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<CloseOutlinedIcon />}
              sx={{ borderColor: 'divider' }}
              disabled={!canAct || actionBusy}
              onClick={() => void reject()}
            >
              Reject
            </Button>
            <Button
              variant="text"
              color="error"
              disabled={!selected || actionBusy}
              onClick={reportStr}
              sx={{ fontWeight: 700 }}
            >
              Report STR
            </Button>
          </Stack>
        </Stack>
      </Stack>

      <Paper sx={{ p: 1.5 }}>
        <Box sx={{ height: 460 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            disableRowSelectionOnClick
            onRowClick={(p) => setSelectedId(String(p.row.id))}
            getRowClassName={(params) => (String(params.row.id) === selectedId ? 'queue-row-selected' : '')}
            initialState={{
              pagination: { paginationModel: { pageSize: 10, page: 0 } },
            }}
            pageSizeOptions={[10, 25, 50]}
            sx={{
              border: 0,
              '& .MuiDataGrid-columnHeaders': { borderBottom: '1px solid', borderColor: 'divider' },
              '& .MuiDataGrid-row:hover': { bgcolor: 'rgba(66,171,72,0.06)' },
              '& .queue-row-selected': { bgcolor: 'rgba(66,171,72,0.12)' },
              '& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus': { outline: 'none' },
            }}
          />
        </Box>
      </Paper>

      <Snackbar
        open={snack.open}
        autoHideDuration={5000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          variant="filled"
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Stack>
  )
}
