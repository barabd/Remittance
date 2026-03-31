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
  Link as MuiLink,
  MenuItem,
} from '@mui/material'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined'
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined'
import DoneOutlinedIcon from '@mui/icons-material/DoneOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import PauseCircleOutlineOutlinedIcon from '@mui/icons-material/PauseCircleOutlineOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { brand } from '../theme/appTheme'
import { pickMapped } from '../lib/excelMap'
import { registerBatch, validateIncomingBatch } from '../state/duplicateIndexStore'
import { appendFeedback } from '../state/feedbackLogStore'
import { queueEmailToExchangeHouse } from '../state/emailOutboxStore'
import {
  FILE_MAPPING_EVENT,
  type FileMappingProfile,
  bulkHeadersFor,
  getDefaultBulkProfileId,
  getMappingProfile,
  loadMappingProfiles,
} from '../state/fileMappingStore'
import { computeRemittanceIncentive } from '../state/incentiveStore'
import { loadAmlComplianceSettings } from '../state/amlComplianceSettingsStore'
import { assertPhotoIdOk, getHighRiskBusinessBlockReason } from '../lib/amlCompliance'
import { importBulkBatch } from '../integrations/ehBulkUpload/ehBulkUploadRepository'

type BatchStatus = 'Draft' | 'Validated' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Imported'

type UploadRow = {
  id: string
  rowNo: number
  remittanceNo: string
  remitter: string
  beneficiary: string
  amount: number
  currency: string
  payoutChannel: 'BEFTN' | 'RTGS' | 'NPSB' | 'MFS' | 'Cash'
  payoutTo: string
  exchangeHouse: string
  photoIdType: string
  photoIdRef: string
  errors: string[]
  incentiveBdt: number
  incentiveRule: string
}

type AuditEvent = {
  at: string
  actor: string
  action: string
  details?: string
}

function isValidCurrency(cur: string) {
  return /^[A-Z]{3}$/.test(cur)
}

function parseBulkChannel(raw: string): UploadRow['payoutChannel'] {
  const x = raw.trim().toUpperCase()
  if (x === 'BEFTN' || x === 'RTGS' || x === 'NPSB' || x === 'MFS') return x
  if (x === 'CASH') return 'Cash'
  return 'Cash'
}

function validateRow(
  r: Pick<
    UploadRow,
    | 'remittanceNo'
    | 'remitter'
    | 'beneficiary'
    | 'amount'
    | 'currency'
    | 'payoutChannel'
    | 'payoutTo'
    | 'exchangeHouse'
    | 'photoIdType'
    | 'photoIdRef'
  >,
) {
  const errors: string[] = []
  if (!r.remittanceNo) errors.push('Missing remittance number.')
  if (!r.remitter) errors.push('Missing remitter.')
  if (!r.beneficiary) errors.push('Missing beneficiary.')
  if (!Number.isFinite(r.amount) || r.amount <= 0) errors.push('Amount must be > 0.')
  if (!isValidCurrency(r.currency)) errors.push('Currency must be 3-letter code (e.g., USD).')
  if (!r.payoutTo) errors.push('Missing payout destination.')
  if (!r.exchangeHouse) errors.push('Missing exchange house.')
  const s = loadAmlComplianceSettings()
  const pid = assertPhotoIdOk(r.photoIdType, r.photoIdRef, s)
  if (!pid.ok) errors.push(pid.message)
  const biz = getHighRiskBusinessBlockReason(r.remitter, r.beneficiary)
  if (biz && s.blockApprovalOnBusinessTerm) errors.push(biz)
  return errors
}

function parseExcelRows(file: File, profile: FileMappingProfile | undefined): Promise<UploadRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' })

        const out = json
          .map((r, idx) => {
            const remittanceNo = pickMapped(r, bulkHeadersFor(profile, 'remittanceNo'))
            if (!remittanceNo) return null

            const rowBase = {
              id: `${remittanceNo}-${idx}`,
              rowNo: idx + 1,
              remittanceNo,
              remitter: pickMapped(r, bulkHeadersFor(profile, 'remitter')),
              beneficiary: pickMapped(r, bulkHeadersFor(profile, 'beneficiary')),
              amount: Number(pickMapped(r, bulkHeadersFor(profile, 'amount'))) || 0,
              currency:
                pickMapped(r, bulkHeadersFor(profile, 'currency')).toUpperCase().slice(0, 3) || 'USD',
              payoutChannel: parseBulkChannel(
                pickMapped(r, bulkHeadersFor(profile, 'payoutChannel')),
              ),
              payoutTo: pickMapped(r, bulkHeadersFor(profile, 'payoutTo')),
              exchangeHouse: pickMapped(r, bulkHeadersFor(profile, 'exchangeHouse')) || 'ExchangeHouse-01',
              photoIdType: pickMapped(r, bulkHeadersFor(profile, 'photoIdType')),
              photoIdRef: pickMapped(r, bulkHeadersFor(profile, 'photoIdRef')),
            } satisfies Omit<UploadRow, 'errors' | 'incentiveBdt' | 'incentiveRule'>

            const inc = computeRemittanceIncentive(rowBase.amount, rowBase.currency, rowBase.exchangeHouse)

            return {
              ...rowBase,
              errors: validateRow(rowBase),
              incentiveBdt: inc.incentiveBdt,
              incentiveRule: inc.rule,
            } satisfies UploadRow
          })
          .filter(Boolean) as UploadRow[]

        resolve(out)
      } catch (e) {
        reject(e)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

export function ExchangeHouseBulkUploadPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [batchStatus, setBatchStatus] = useState<BatchStatus>('Draft')
  const [rows, setRows] = useState<UploadRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedRow = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId])

  const [filters, setFilters] = useState({
    query: '',
    onlyErrors: false,
    exchangeHouse: '',
    channel: '' as '' | UploadRow['payoutChannel'],
  })
  const [filterError, setFilterError] = useState('')

  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [uploadPreviewCount, setUploadPreviewCount] = useState(0)
  const [excelProfileId, setExcelProfileId] = useState(() => getDefaultBulkProfileId())
  const [mappingProfiles, setMappingProfiles] = useState(loadMappingProfiles)

  useEffect(() => {
    const sync = () => setMappingProfiles(loadMappingProfiles())
    window.addEventListener(FILE_MAPPING_EVENT, sync as EventListener)
    return () => window.removeEventListener(FILE_MAPPING_EVENT, sync as EventListener)
  }, [])

  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false)
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState(false)

  const auditEvents = useMemo((): AuditEvent[] => {
    const ev: AuditEvent[] = [{ at: '2026-03-25 09:30', actor: 'HO Admin', action: 'Opened bulk upload module' }]
    if (batchStatus === 'Validated') ev.push({ at: '2026-03-25 09:35', actor: 'System', action: 'Validated batch' })
    if (batchStatus === 'Pending Approval')
      ev.push({ at: '2026-03-25 09:40', actor: 'Maker', action: 'Submitted for approval' })
    if (batchStatus === 'Approved') ev.push({ at: '2026-03-25 09:45', actor: 'Checker', action: 'Approved batch' })
    if (batchStatus === 'Imported') ev.push({ at: '2026-03-25 09:55', actor: 'System', action: 'Imported remittances' })
    return ev
  }, [batchStatus])

  const filteredRows = useMemo(() => {
    const q = filters.query.trim().toLowerCase()
    return rows.filter((r) => {
      if (filters.onlyErrors && r.errors.length === 0) return false
      if (filters.exchangeHouse && !r.exchangeHouse.toLowerCase().includes(filters.exchangeHouse.trim().toLowerCase()))
        return false
      if (filters.channel && r.payoutChannel !== filters.channel) return false
      if (!q) return true
      return (
        r.remittanceNo.toLowerCase().includes(q) ||
        r.remitter.toLowerCase().includes(q) ||
        r.beneficiary.toLowerCase().includes(q)
      )
    })
  }, [rows, filters])

  function validateFilters() {
    if (filters.query.length > 80) return 'Search text is too long.'
    return ''
  }

  function onApplyFilters() {
    setFilterError(validateFilters())
  }

  function onClearFilters() {
    setFilters({ query: '', onlyErrors: false, exchangeHouse: '', channel: '' })
    setFilterError('')
  }

  async function onImportExcel() {
    setUploadError('')
    if (!uploadFile) {
      setUploadError('Please choose an Excel file.')
      return
    }
    try {
      const parsed = await parseExcelRows(uploadFile, getMappingProfile(excelProfileId))
      if (parsed.length === 0) {
        setUploadError('No rows found. Add “Remittance No” / “remittanceNo” column.')
        return
      }
      const dupErr = validateIncomingBatch(
        parsed.map((r) => ({ exchangeHouse: r.exchangeHouse, remittanceNo: r.remittanceNo })),
      )
      if (dupErr.length > 0) {
        setUploadError(
          `Duplicate check (#19): ${dupErr.slice(0, 6).join('; ')}${dupErr.length > 6 ? '…' : ''}`,
        )
        return
      }
      setRows(parsed)
      setBatchStatus('Validated')
      setUploadOpen(false)
      setUploadFile(null)
      setUploadPreviewCount(0)
      setSelectedId(null)
    } catch {
      setUploadError('Failed to parse file. Please upload a valid .xlsx file.')
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
        const parsed = await parseExcelRows(uploadFile, getMappingProfile(excelProfileId))
        if (!cancelled) setUploadPreviewCount(parsed.length)
      } catch {
        if (!cancelled) setUploadPreviewCount(0)
      }
    }
    void preview()
    return () => {
      cancelled = true
    }
  }, [uploadFile, excelProfileId])

  async function finalizeBulkImport() {
    if (rows.length === 0) return
    setImportError('')
    setImportSuccess(false)
    try {
      await importBulkBatch(rows)
      registerBatch(rows.map((r) => ({ exchangeHouse: r.exchangeHouse, remittanceNo: r.remittanceNo })))
      await appendFeedback('bulk_upload', `Exchange house batch imported: ${rows.length} row(s).`, 'Indexed by EH + remittance no')
      const houses = [...new Set(rows.map((r) => r.exchangeHouse))]
      await Promise.all(
        houses.slice(0, 5).map((h) => {
          const n = rows.filter((r) => r.exchangeHouse === h).length
          return queueEmailToExchangeHouse({
            to: `treasury.${h.replace(/[^a-zA-Z0-9-]+/g, '-').toLowerCase()}@exchange-partner.example.com`,
            subject: `Remittance batch posted — ${h}`,
            bodyPreview: `${n} record(s) accepted into FRMS index. Attach signed manifest & FX confirmation.`,
            exchangeHouse: h,
            reportRef: `BULK-${Date.now()}`,
          })
        }),
      )
      setBatchStatus('Imported')
      setImportSuccess(true)
      setTimeout(() => setImportSuccess(false), 5000)
    } catch (e) {
      setImportError(`Failed to import batch: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }

  const hasErrors = rows.some((r) => r.errors.length > 0)
  const canSubmit = batchStatus === 'Validated' && rows.length > 0 && !hasErrors
  const canApprove = batchStatus === 'Pending Approval'
  const canHold = batchStatus === 'Pending Approval'
  const canReject = batchStatus === 'Pending Approval'
  const canFinalizeImport = batchStatus === 'Approved'

  const columns: GridColDef<UploadRow>[] = [
    { field: 'rowNo', headerName: 'Row', type: 'number', flex: 0.4, minWidth: 80 },
    { field: 'remittanceNo', headerName: 'Remittance No', flex: 1, minWidth: 170 },
    { field: 'exchangeHouse', headerName: 'Exchange house', flex: 1, minWidth: 160 },
    { field: 'payoutChannel', headerName: 'Channel', flex: 0.7, minWidth: 110 },
    { field: 'amount', headerName: 'Amount', type: 'number', flex: 0.7, minWidth: 110 },
    { field: 'currency', headerName: 'Cur', flex: 0.4, minWidth: 80 },
    {
      field: 'incentiveBdt',
      headerName: 'Incentive (৳)',
      type: 'number',
      flex: 0.65,
      minWidth: 110,
    },
    { field: 'remitter', headerName: 'Remitter', flex: 1, minWidth: 140 },
    { field: 'beneficiary', headerName: 'Beneficiary', flex: 1, minWidth: 140 },
    {
      field: 'photoIdRef',
      headerName: 'Photo ID',
      flex: 0.55,
      minWidth: 90,
      valueGetter: (_v, row) => row.photoIdRef || '—',
    },
    { field: 'payoutTo', headerName: 'Payout to', flex: 1.2, minWidth: 200 },
    {
      field: 'errors',
      headerName: 'Validation',
      flex: 1.4,
      minWidth: 220,
      renderCell: (params) =>
        params.value?.length ? (
          <Chip
            size="small"
            label={`${params.value.length} error(s)`}
            sx={{ bgcolor: 'rgba(0,0,0,0.08)', color: brand.black }}
          />
        ) : (
          <Chip size="small" label="OK" sx={{ bgcolor: 'rgba(66,171,72,0.14)', color: brand.green }} />
        ),
    },
  ]

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'stretch', md: 'flex-start' }}
        justifyContent="space-between"
        gap={2}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
            Exchange House Bulk Upload
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Upload formatted Excel, validate rows, submit for maker-checker approval, then import.
          </Typography>
        </Box>

        <Stack direction="row" gap={1} flexWrap="wrap" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
          <Button
            variant="outlined"
            startIcon={<UploadFileOutlinedIcon />}
            onClick={() => {
              setExcelProfileId(getDefaultBulkProfileId())
              setUploadOpen(true)
            }}
            sx={{ borderColor: 'divider' }}
          >
            Excel upload
          </Button>
          <Button
            variant="outlined"
            startIcon={<HistoryOutlinedIcon />}
            onClick={() => setAuditDrawerOpen(true)}
            sx={{ borderColor: 'divider' }}
          >
            Audit trail
          </Button>
          <Button
            variant="contained"
            startIcon={<SearchOutlinedIcon />}
            disabled={!canSubmit}
            onClick={() => setBatchStatus('Pending Approval')}
          >
            Submit
          </Button>
          <Button
            variant="contained"
            startIcon={<DoneOutlinedIcon />}
            disabled={!canApprove}
            onClick={() => setBatchStatus('Approved')}
          >
            Approve
          </Button>
          <Button
            variant="outlined"
            startIcon={<PauseCircleOutlineOutlinedIcon />}
            disabled={!canHold}
            onClick={() => setBatchStatus('Validated')}
            sx={{ borderColor: 'divider' }}
          >
            Hold
          </Button>
          <Button
            variant="outlined"
            startIcon={<CloseOutlinedIcon />}
            disabled={!canReject}
            onClick={() => setBatchStatus('Rejected')}
            sx={{ borderColor: 'divider' }}
          >
            Reject
          </Button>
          <Button variant="contained" disabled={!canFinalizeImport} onClick={() => void finalizeBulkImport()}>
            Import remittances
          </Button>
        </Stack>
      </Stack>

      {importError ? (
        <Alert severity="error" onClose={() => setImportError('')}>
          {importError}
        </Alert>
      ) : null}
      {importSuccess ? (
        <Alert severity="success">
          ✓ Batch imported successfully! {rows.length} remittance(s) processed and queued for exchange house notification.
        </Alert>
      ) : null}

      <Paper sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField
              fullWidth
              label="Search"
              placeholder="Remittance no / Remitter / Beneficiary"
              value={filters.query}
              onChange={(e) => setFilters((s) => ({ ...s, query: e.target.value }))}
              error={Boolean(filterError)}
              helperText={filterError || ' '}
            />
            <TextField
              label="Exchange house"
              value={filters.exchangeHouse}
              onChange={(e) => setFilters((s) => ({ ...s, exchangeHouse: e.target.value }))}
              placeholder="Name"
              sx={{ minWidth: { xs: '100%', md: 240 } }}
            />
            <TextField
              label="Channel"
              value={filters.channel}
              onChange={(e) =>
                setFilters((s) => ({ ...s, channel: e.target.value as '' | UploadRow['payoutChannel'] }))
              }
              placeholder="All"
              sx={{ minWidth: { xs: '100%', md: 220 } }}
            />
          </Stack>

          <Stack direction="row" gap={1} justifyContent="flex-end">
            <Button variant="contained" onClick={onApplyFilters} disabled={validateFilters() !== ''}>
              Apply
            </Button>
            <Button
              variant="outlined"
              startIcon={<ClearOutlinedIcon />}
              onClick={onClearFilters}
              sx={{ borderColor: 'divider' }}
            >
              Clear
            </Button>
          </Stack>

          <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
            <Chip
              size="small"
              label={`Batch status: ${batchStatus}`}
              sx={{ bgcolor: 'rgba(0,0,0,0.06)', color: brand.black }}
            />
            <Chip
              size="small"
              label={`Rows: ${rows.length}`}
              sx={{ bgcolor: 'rgba(0,0,0,0.06)', color: brand.black }}
            />
            <Chip
              size="small"
              label={`Errors: ${rows.filter((r) => r.errors.length).length}`}
              sx={{
                bgcolor: hasErrors ? 'rgba(0,0,0,0.08)' : 'rgba(66,171,72,0.14)',
                color: hasErrors ? brand.black : brand.green,
              }}
            />
          </Stack>

          {batchStatus === 'Validated' && hasErrors ? (
            <Alert severity="warning">
              Fix validation errors before submitting for approval. Use filters to search rows and check the “Validation” column.
            </Alert>
          ) : null}
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
        <DialogTitle>Excel upload (Exchange House)</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Map custom column titles per corporate partner (#24). Incentive (৳) is computed per row from amount/currency and
              tiers (#30).
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              label="Column mapping profile"
              value={excelProfileId}
              onChange={(e) => setExcelProfileId(e.target.value)}
            >
              {mappingProfiles.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </TextField>
            <MuiLink component={RouterLink} to="/tools/corporate-file-mapping" variant="body2" underline="hover">
              Edit mapping profiles & incentive tiers
            </MuiLink>
            <Divider />
            <Box sx={{ mt: 1 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  setUploadError('')
                  setUploadFile(e.target.files?.[0] ?? null)
                }}
                style={{ display: 'none' }}
                id="eh-bulk-excel-upload"
              />
              <label htmlFor="eh-bulk-excel-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<UploadFileOutlinedIcon />}
                  fullWidth
                  sx={{ py: 2, borderStyle: 'dashed', borderWidth: 2 }}
                >
                  {uploadFile ? 'Change File' : 'Choose Excel File'}
                </Button>
              </label>
            </Box>

            {uploadFile ? (
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'rgba(0,0,0,0.02)', borderColor: 'divider' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 900 }}>
                      {uploadFile.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {uploadPreviewCount} rows detected
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      setUploadFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                  >
                    <ClearOutlinedIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Paper>
            ) : null}
            {uploadError ? <Alert severity="error">{uploadError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={onImportExcel}>
            Validate & load
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
                Batch status: {batchStatus}
              </Typography>
            </Box>
            <IconButton onClick={() => setAuditDrawerOpen(false)}>
              <ClearOutlinedIcon />
            </IconButton>
          </Stack>

          <Stack spacing={1}>
            {auditEvents.map((e, idx) => (
              <Paper key={idx} variant="outlined" sx={{ p: 1.5, borderColor: 'divider' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                  <Typography sx={{ fontWeight: 900 }}>{e.action}</Typography>
                  <Chip size="small" label={e.at} sx={{ bgcolor: 'rgba(0,0,0,0.06)', color: brand.black }} />
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

          {selectedRow ? (
            <>
              <Divider />
              <Typography sx={{ fontWeight: 950 }}>Selected row</Typography>
              <Paper variant="outlined" sx={{ p: 1.5, borderColor: 'divider' }}>
                <Typography sx={{ fontWeight: 900 }}>{selectedRow.remittanceNo}</Typography>
                {selectedRow.errors.length ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Errors: {selectedRow.errors.join(' | ')}
                  </Typography>
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Validation: OK
                  </Typography>
                )}
              </Paper>
            </>
          ) : null}
        </Stack>
      </Drawer>
    </Stack>
  )
}

