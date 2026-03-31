import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined'
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined'
import DoneOutlinedIcon from '@mui/icons-material/DoneOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import PauseCircleOutlineOutlinedIcon from '@mui/icons-material/PauseCircleOutlineOutlined'
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { useCallback, useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { brand } from '../theme/appTheme'
import { nextId } from '../state/mastersStore'
import { useLiveApi } from '../api/config'
import { ApiHttpError } from '../api/http'
import {
  liveListGlVouchers,
  liveCreateGlVoucher,
  liveSubmitGlVoucher,
  liveApproveGlVoucher,
  liveRejectGlVoucher,
  livePostGlVoucher,
  liveHoldGlVoucher,
  liveGetGlVoucherAudit,
} from '../api/live/client'

type VoucherType = 'Cash' | 'Bank' | 'Journal' | 'Petty'
type VoucherStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Posted' | 'Rejected' | 'On Hold'

type VoucherRow = {
  id: string
  voucherNo: string
  voucherDate: string // yyyy-mm-dd
  type: VoucherType
  narration: string
  debit: number
  credit: number
  /** VAT / withholding on fees (demo). */
  vatAmount: number
  branch: string
  maker: string
  checker?: string
  status: VoucherStatus
}

type AuditEvent = {
  at: string
  actor: string
  action: string
  details?: string
}

const seedRows: VoucherRow[] = [
  {
    id: 'VCH-2026-000071',
    voucherNo: 'VCH-2026-000071',
    voucherDate: '2026-03-25',
    type: 'Journal',
    narration: 'Remittance fee income posting',
    debit: 0,
    credit: 12500,
    vatAmount: 625,
    branch: 'Head Office',
    maker: 'Finance-01',
    checker: 'Finance-Checker',
    status: 'Posted',
  },
  {
    id: 'VCH-2026-000072',
    voucherNo: 'VCH-2026-000072',
    voucherDate: '2026-03-25',
    type: 'Bank',
    narration: 'Settlement to partner (BEFTN batch)',
    debit: 295000,
    credit: 0,
    vatAmount: 0,
    branch: 'Head Office',
    maker: 'Ops-02',
    status: 'Pending Approval',
  },
  {
    id: 'VCH-2026-000073',
    voucherNo: 'VCH-2026-000073',
    voucherDate: '2026-03-24',
    type: 'Cash',
    narration: 'Cash payout adjustment',
    debit: 0,
    credit: 60000,
    vatAmount: 0,
    branch: 'Branch-01',
    maker: 'Branch-01',
    status: 'On Hold',
  },
] as const

function isValidDateStr(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

function withinRange(voucherDate: string, from?: string, to?: string) {
  if (!from && !to) return true
  if (!isValidDateStr(voucherDate)) return true
  const d = new Date(voucherDate + 'T00:00:00Z').getTime()
  if (from) {
    const f = new Date(from + 'T00:00:00Z').getTime()
    if (d < f) return false
  }
  if (to) {
    const t = new Date(to + 'T23:59:59Z').getTime()
    if (d > t) return false
  }
  return true
}

function statusChip(status: VoucherStatus) {
  const map: Record<VoucherStatus, { bg: string; fg: string }> = {
    Draft: { bg: 'rgba(0,0,0,0.06)', fg: brand.black },
    'Pending Approval': { bg: 'rgba(255,255,255,0.22)', fg: brand.black },
    Approved: { bg: 'rgba(66,171,72,0.14)', fg: brand.green },
    Posted: { bg: 'rgba(66,171,72,0.14)', fg: brand.green },
    Rejected: { bg: 'rgba(0,0,0,0.08)', fg: brand.black },
    'On Hold': { bg: 'rgba(0,0,0,0.06)', fg: brand.black },
  }
  return map[status]
}

function parseExcelRows(file: File): Promise<VoucherRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' })

        const out: VoucherRow[] = json
          .map((r, idx) => {
            const voucherNo = String(r.voucherNo ?? r.VoucherNo ?? r['Voucher No'] ?? '').trim()
            if (!voucherNo) return null

            const voucherDate =
              String(r.voucherDate ?? r.VoucherDate ?? r['Voucher Date'] ?? '').trim() ||
              '2026-03-25'
            const type = (String(r.type ?? r.Type ?? '').trim() as VoucherType) || 'Journal'
            const narration = String(r.narration ?? r.Narration ?? '').trim() || '-'
            const debit = Number(r.debit ?? r.Debit ?? 0) || 0
            const credit = Number(r.credit ?? r.Credit ?? 0) || 0
            const vatAmount = Number(r.vatAmount ?? r.VAT ?? r.vat ?? 0) || 0
            const branch = String(r.branch ?? r.Branch ?? '').trim() || 'Head Office'
            const maker = String(r.maker ?? r.Maker ?? '').trim() || 'Excel'
            const status =
              (String(r.status ?? r.Status ?? '').trim() as VoucherStatus) || 'Draft'

            return {
              id: voucherNo || `X-${idx}`,
              voucherNo,
              voucherDate,
              type,
              narration,
              debit,
              credit,
              vatAmount,
              branch,
              maker,
              checker: '',
              status,
            } satisfies VoucherRow
          })
          .filter(Boolean) as VoucherRow[]

        resolve(out)
      } catch (e) {
        reject(e)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

export function FinanceGlPage() {
  const live = useLiveApi()

  const [rows, setRows] = useState<VoucherRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedRow = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  )

  const refreshLive = useCallback(async () => {
    if (!live) return
    setLoading(true)
    setError(null)
    try {
      const page = await liveListGlVouchers()
      setRows(page.items as unknown as VoucherRow[])
      setSelectedId((current) => (current && page.items.some((r) => r.id === current) ? current : null))
    } catch (e) {
      setError(
        e instanceof ApiHttpError
          ? `${e.message}. Showing local fallback rows.`
          : 'Could not load live GL vouchers. Showing local fallback rows.',
      )
      setRows([...seedRows])
    } finally {
      setLoading(false)
    }
  }, [live])

  useEffect(() => {
    if (!live) {
      void Promise.resolve().then(() => setRows([...seedRows]))
      return
    }
    void Promise.resolve().then(() => refreshLive())
  }, [live, refreshLive])

  const [filters, setFilters] = useState({
    query: '',
    type: '' as '' | VoucherType,
    status: '' as '' | VoucherStatus,
    branch: '',
    fromDate: '',
    toDate: '',
  })
  const [filterError, setFilterError] = useState<string>('')

  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string>('')
  const [uploadPreviewCount, setUploadPreviewCount] = useState<number>(0)

  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false)
  const [auditRows, setAuditRows] = useState<AuditEvent[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState<string | null>(null)

  const auditEvents = useMemo((): AuditEvent[] => {
    if (!selectedRow) return []
    const ev: AuditEvent[] = [
      {
        at: `${selectedRow.voucherDate} 09:30`,
        actor: selectedRow.maker,
        action: 'Created voucher',
        details: `${selectedRow.type} · Dr ${selectedRow.debit.toFixed(2)} / Cr ${selectedRow.credit.toFixed(2)}`,
      },
    ]
    if (selectedRow.status === 'Pending Approval') {
      ev.push({
        at: `${selectedRow.voucherDate} 09:45`,
        actor: 'System',
        action: 'Queued for maker-checker approval',
      })
    }
    if (selectedRow.checker) {
      ev.push({
        at: `${selectedRow.voucherDate} 10:10`,
        actor: selectedRow.checker,
        action:
          selectedRow.status === 'Rejected'
            ? 'Rejected'
            : selectedRow.status === 'Posted'
              ? 'Posted to ledger'
              : 'Approved',
      })
    }
    return ev
  }, [selectedRow])

  useEffect(() => {
    if (!auditDrawerOpen) return
    if (!selectedRow) {
      setAuditRows([])
      setAuditError(null)
      return
    }

    if (!live) {
      setAuditRows(auditEvents)
      setAuditError(null)
      return
    }

    setAuditLoading(true)
    setAuditError(null)
    void liveGetGlVoucherAudit(selectedRow.id)
      .then((res) => {
        setAuditRows((res.events ?? []) as AuditEvent[])
      })
      .catch((e) => {
        setAuditRows(auditEvents)
        setAuditError(e instanceof ApiHttpError ? e.message : 'Could not load audit events from API.')
      })
      .finally(() => {
        setAuditLoading(false)
      })
  }, [auditDrawerOpen, selectedRow, live, auditEvents])

  const filteredRows = useMemo(() => {
    const q = filters.query.trim().toLowerCase()
    return rows.filter((r) => {
      if (filters.type && r.type !== filters.type) return false
      if (filters.status && r.status !== filters.status) return false
      if (filters.branch && !r.branch.toLowerCase().includes(filters.branch.trim().toLowerCase()))
        return false
      if (!withinRange(r.voucherDate, filters.fromDate || undefined, filters.toDate || undefined))
        return false
      if (!q) return true
      return (
        r.voucherNo.toLowerCase().includes(q) ||
        r.narration.toLowerCase().includes(q) ||
        r.maker.toLowerCase().includes(q)
      )
    })
  }, [rows, filters])

  function validateFilters() {
    if (filters.fromDate && !isValidDateStr(filters.fromDate)) return 'From date must be YYYY-MM-DD.'
    if (filters.toDate && !isValidDateStr(filters.toDate)) return 'To date must be YYYY-MM-DD.'
    if (filters.fromDate && filters.toDate) {
      const f = new Date(filters.fromDate + 'T00:00:00Z').getTime()
      const t = new Date(filters.toDate + 'T00:00:00Z').getTime()
      if (f > t) return 'From date cannot be after To date.'
    }
    return ''
  }

  function onApplyFilters() {
    setFilterError(validateFilters())
  }

  function onClear() {
    setFilters({ query: '', type: '', status: '', branch: '', fromDate: '', toDate: '' })
    setFilterError('')
  }

  async function onImport() {
    setUploadError('')
    if (!uploadFile) {
      setUploadError('Please choose an Excel file.')
      return
    }
    try {
      const imported = await parseExcelRows(uploadFile)
      if (imported.length === 0) {
        setUploadError('No rows found. Add a column like “Voucher No” or “voucherNo”.')
        return
      }
      if (live) {
        setLoading(true)
        setError(null)
        const existingVoucherNos = new Set(rows.map((r) => r.voucherNo.toLowerCase()))
        const payloads = imported
          .filter((r) => !existingVoucherNos.has(r.voucherNo.toLowerCase()))
          .map((r) => ({
            voucherNo: r.voucherNo,
            voucherDate: r.voucherDate,
            type: r.type,
            narration: r.narration,
            debit: r.debit,
            credit: r.credit,
            vatAmount: r.vatAmount,
            branch: r.branch,
            maker: r.maker,
          }))

        await Promise.all(payloads.map((p) => liveCreateGlVoucher(p)))
        await refreshLive()
      } else {
        const existing = new Set(rows.map((r) => r.id))
        setRows((prev) => [...imported.filter((r) => !existing.has(r.id)), ...prev])
      }
      setUploadOpen(false)
      setUploadFile(null)
      setUploadPreviewCount(0)
    } catch (e) {
      setUploadError(
        e instanceof ApiHttpError
          ? e.message
          : 'Failed to parse or import file. Please upload a valid .xlsx file.',
      )
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function preview() {
      if (!uploadFile) {
        setUploadPreviewCount(0)
        return
      }
      try {
        const imported = await parseExcelRows(uploadFile)
        if (!cancelled) setUploadPreviewCount(imported.length)
      } catch {
        if (!cancelled) setUploadPreviewCount(0)
      }
    }
    void preview()
    return () => {
      cancelled = true
    }
  }, [uploadFile])

  const canApprove = selectedRow?.status === 'Pending Approval' && !loading
  const canHold = selectedRow?.status === 'Pending Approval' && !loading
  const canReject = selectedRow?.status === 'Pending Approval' && !loading
  const canPost = selectedRow?.status === 'Approved' && !loading
  const canSubmit = selectedRow?.status === 'Draft' && !loading

  function addContraFromSelected() {
    if (!selectedRow) return
    const voucherNo = nextId('VCH')
    const contraDraft = {
      voucherNo,
      voucherDate: selectedRow.voucherDate,
      type: selectedRow.type,
      narration: `Contra to ${selectedRow.voucherNo} - ${selectedRow.narration}`,
      debit: selectedRow.credit,
      credit: selectedRow.debit,
      vatAmount: 0,
      branch: selectedRow.branch,
      maker: selectedRow.maker,
    }

    if (!live) {
      const contra: VoucherRow = {
        id: voucherNo,
        ...contraDraft,
      checker: '',
      status: 'Draft',
      }
      setRows((prev) => [contra, ...prev])
      setSelectedId(contra.id)
      return
    }

    setLoading(true)
    setError(null)
    void liveCreateGlVoucher(contraDraft)
      .then(async (created) => {
        await refreshLive()
        setSelectedId(String(created.id))
      })
      .catch((e) => {
        setError(
          e instanceof ApiHttpError ? e.message : 'Could not create contra voucher in live API mode.',
        )
        setLoading(false)
      })
  }

  function updateSelectedStatus(next: VoucherStatus) {
    if (!selectedRow) return

    const applyLocal = () => {
      setRows((prev) =>
        prev.map((r) =>
          r.id === selectedRow.id
            ? {
                ...r,
                status: next,
                checker:
                  next === 'Approved' || next === 'Rejected' || next === 'Posted'
                    ? 'Finance-Checker'
                    : r.checker,
              }
            : r,
        ),
      )
    }

    if (!live) {
      applyLocal()
      setNotice(`Voucher ${selectedRow.voucherNo} updated to ${next} (local mode).`)
      return
    }
    setLoading(true)
    setError(null)
    setNotice(null)
    const action =
      next === 'Approved'
        ? liveApproveGlVoucher(selectedRow.id)
        : next === 'Rejected'
          ? liveRejectGlVoucher(selectedRow.id)
          : next === 'Posted'
            ? livePostGlVoucher(selectedRow.id)
            : next === 'On Hold'
              ? liveHoldGlVoucher(selectedRow.id)
              : next === 'Pending Approval'
                ? liveSubmitGlVoucher(selectedRow.id)
              : Promise.reject(new Error('Invalid status'))
    void action
      .then(async () => {
        applyLocal()
        setNotice(`Voucher ${selectedRow.voucherNo} updated to ${next}.`)
        await refreshLive()
      })
      .catch((e) => {
        applyLocal()
        setNotice(`Voucher ${selectedRow.voucherNo} updated to ${next} locally (live API unavailable).`)
        setError(
          e instanceof ApiHttpError ? e.message : 'Could not update voucher status. Changes not saved.',
        )
        setLoading(false)
      })
  }

  const columns: GridColDef<VoucherRow>[] = [
    { field: 'voucherNo', headerName: 'Voucher No', flex: 1, minWidth: 170 },
    { field: 'voucherDate', headerName: 'Date', flex: 0.7, minWidth: 120 },
    { field: 'type', headerName: 'Type', flex: 0.7, minWidth: 120 },
    { field: 'branch', headerName: 'Branch', flex: 0.9, minWidth: 150 },
    { field: 'narration', headerName: 'Narration', flex: 1.6, minWidth: 220 },
    { field: 'debit', headerName: 'Debit', type: 'number', flex: 0.7, minWidth: 120 },
    { field: 'credit', headerName: 'Credit', type: 'number', flex: 0.7, minWidth: 120 },
    { field: 'vatAmount', headerName: 'VAT', type: 'number', flex: 0.5, minWidth: 90 },
    { field: 'maker', headerName: 'Maker', flex: 0.8, minWidth: 130 },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.9,
      minWidth: 150,
      renderCell: (params) => (
        <Chip
          size="small"
          label={params.value}
          sx={{ bgcolor: statusChip(params.value).bg, color: statusChip(params.value).fg }}
        />
      ),
    },
  ]

  const filtersValid = validateFilters() === ''

  return (
    <Stack spacing={2.5}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {notice ? <Alert severity="success" onClose={() => setNotice(null)}>{notice}</Alert> : null}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'stretch', md: 'flex-start' }}
        justifyContent="space-between"
        gap={2}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
            Finance & GL
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Voucher worklist with maker-checker verification, posting, Excel import, automatic contra lines, VAT column, and
            audit trail.
          </Typography>
        </Box>

        <Stack direction="row" gap={1} flexWrap="wrap" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
          <Button
            variant="outlined"
            startIcon={<UploadFileOutlinedIcon />}
            onClick={() => setUploadOpen(true)}
            sx={{ borderColor: 'divider' }}
          >
            Excel upload
          </Button>
          <Button
            variant="outlined"
            disabled={!selectedRow}
            onClick={addContraFromSelected}
            sx={{ borderColor: 'divider' }}
          >
            Generate contra entry
          </Button>
          <Button
            variant="outlined"
            startIcon={<HistoryOutlinedIcon />}
            disabled={!selectedRow}
            onClick={() => setAuditDrawerOpen(true)}
            sx={{ borderColor: 'divider' }}
          >
            Audit trail
          </Button>
          <Button
            variant="contained"
            startIcon={<DoneOutlinedIcon />}
            disabled={!canSubmit}
            onClick={() => updateSelectedStatus('Pending Approval')}
          >
            Send for approval
          </Button>
          <Button
            variant="contained"
            startIcon={<DoneOutlinedIcon />}
            disabled={!canApprove}
            onClick={() => updateSelectedStatus('Approved')}
          >
            Approve
          </Button>
          <Button
            variant="outlined"
            startIcon={<PauseCircleOutlineOutlinedIcon />}
            disabled={!canHold}
            onClick={() => updateSelectedStatus('On Hold')}
            sx={{ borderColor: 'divider' }}
          >
            Hold
          </Button>
          <Button
            variant="outlined"
            startIcon={<CloseOutlinedIcon />}
            disabled={!canReject}
            onClick={() => updateSelectedStatus('Rejected')}
            sx={{ borderColor: 'divider' }}
          >
            Reject
          </Button>
          <Button
            variant="contained"
            startIcon={<AccountBalanceOutlinedIcon />}
            disabled={!canPost}
            onClick={() => updateSelectedStatus('Posted')}
          >
            Post to ledger
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField
              fullWidth
              label="Search"
              placeholder="Voucher no / Narration / Maker"
              value={filters.query}
              onChange={(e) => setFilters((s) => ({ ...s, query: e.target.value }))}
            />
            <TextField
              label="Type"
              value={filters.type}
              onChange={(e) => setFilters((s) => ({ ...s, type: e.target.value as '' | VoucherType }))}
              placeholder="All"
              sx={{ minWidth: { xs: '100%', md: 220 } }}
            />
            <TextField
              label="Status"
              value={filters.status}
              onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value as '' | VoucherStatus }))}
              placeholder="All"
              sx={{ minWidth: { xs: '100%', md: 220 } }}
            />
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
            <TextField
              label="Branch"
              value={filters.branch}
              onChange={(e) => setFilters((s) => ({ ...s, branch: e.target.value }))}
              placeholder="Head Office / Branch"
              sx={{ minWidth: { xs: '100%', md: 220 } }}
            />
            <TextField
              label="From (YYYY-MM-DD)"
              value={filters.fromDate}
              onChange={(e) => setFilters((s) => ({ ...s, fromDate: e.target.value }))}
              error={Boolean(filterError)}
              sx={{ minWidth: { xs: '100%', md: 220 } }}
            />
            <TextField
              label="To (YYYY-MM-DD)"
              value={filters.toDate}
              onChange={(e) => setFilters((s) => ({ ...s, toDate: e.target.value }))}
              error={Boolean(filterError)}
              sx={{ minWidth: { xs: '100%', md: 220 } }}
            />
            <Box sx={{ flex: 1 }} />
            <Stack direction="row" gap={1}>
              <Button
                variant="contained"
                startIcon={<SearchOutlinedIcon />}
                onClick={onApplyFilters}
                disabled={!filtersValid}
              >
                Apply
              </Button>
              <Button
                variant="outlined"
                startIcon={<ClearOutlinedIcon />}
                onClick={onClear}
                sx={{ borderColor: 'divider' }}
              >
                Clear
              </Button>
            </Stack>
          </Stack>

          {filterError ? <Alert severity="error">{filterError}</Alert> : null}
        </Stack>
      </Paper>

      <Paper sx={{ p: 1.5 }}>
        <Box sx={{ height: 560 }}>
          <DataGrid
            rows={filteredRows}
            columns={columns}
            disableRowSelectionOnClick
            onRowClick={(p) => setSelectedId(String(p.row.id))}
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

      <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Excel upload (Finance & GL)</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Expected columns:
              <Box component="span" sx={{ fontWeight: 900 }}>
                {' '}
                Voucher No / voucherNo
              </Box>
              , optional: Voucher Date, Type, Narration, Debit, Credit, VAT / vatAmount, Branch, Status, Maker.
            </Typography>
            <Divider />

            <Button variant="outlined" component="label" fullWidth>
              {uploadFile ? uploadFile.name : 'Choose Excel file (.xlsx, .xls)'}
              <input
                type="file"
                accept=".xlsx,.xls"
                hidden
                onChange={(e) => {
                  setUploadError('')
                  setUploadFile(e.target.files?.[0] ?? null)
                }}
              />
            </Button>

            {uploadFile ? (
              <Typography variant="body2">
                Selected: <Box component="span" sx={{ fontWeight: 900 }}>{uploadFile.name}</Box> · Preview rows:{' '}
                <Box component="span" sx={{ fontWeight: 900 }}>{uploadPreviewCount}</Box>
              </Typography>
            ) : null}

            {uploadError ? <Alert severity="error">{uploadError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={onImport}>
            Import
          </Button>
        </DialogActions>
      </Dialog>

      <Drawer
        anchor="right"
        open={auditDrawerOpen}
        onClose={() => setAuditDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 460 }, p: 2 } }}
      >
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
            <Box>
              <Typography sx={{ fontWeight: 950 }}>Audit trail</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {selectedRow ? selectedRow.voucherNo : 'Select a voucher to view events.'}
              </Typography>
            </Box>
            <IconButton onClick={() => setAuditDrawerOpen(false)}>
              <ClearOutlinedIcon />
            </IconButton>
          </Stack>

          {!selectedRow ? (
            <Alert severity="info">Select a voucher row first.</Alert>
          ) : (
            <Stack spacing={1}>
              {auditLoading ? <Alert severity="info">Loading audit events...</Alert> : null}
              {auditError ? <Alert severity="warning">{auditError}</Alert> : null}
              {(live ? auditRows : auditEvents).map((e, idx) => (
                <Paper key={idx} variant="outlined" sx={{ p: 1.5, borderColor: 'divider' }}>
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
        </Stack>
      </Drawer>
    </Stack>
  )
}

