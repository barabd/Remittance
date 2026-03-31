import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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
  approveQueuedReport,
  fetchReportRequestAudit,
  fetchReportRequests,
  queueReportRequest,
  rejectQueuedReport,
  REPORT_REQUEST_EVENT,
} from '../../integrations/reports/reportRequestRepository'
import {
  buildReportDataset,
  isReportKey,
  REPORT_KEYS,
  type ReportKey,
} from '../../lib/reportDatasets'
import {
  downloadJsonPretty,
  exportRowsToCsv,
  exportRowsToExcel,
  exportRowsToTxt,
  exportRowsToWordHtml,
  openPrintableReportWindow,
  safeExportFilename,
} from '../../lib/reportExport'
import {
  approveReportRequest as approveReportRequestLocal,
  createReportRequest as createReportRequestLocal,
  listReportRequestAudit as listReportRequestAuditLocal,
  listReportRequests as listReportRequestsLocal,
  rejectReportRequest as rejectReportRequestLocal,
  type ReportRequestAuditEvent,
  type ReportRequestRow,
} from '../../state/reportRequestStore'

const DEFAULT_REPORT = REPORT_KEYS[0]

export function ReportsPage() {
  const live = useLiveApi()
  const [rows, setRows] = useState<ReportRequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [actionNotice, setActionNotice] = useState('')
  const [checkerUser, setCheckerUser] = useState('HO-Admin')
  const [rejectReason, setRejectReason] = useState('')
  const [reportName, setReportName] = useState<ReportKey>(DEFAULT_REPORT)
  const [periodFrom, setPeriodFrom] = useState('2026-03-01')
  const [periodTo, setPeriodTo] = useState('2026-03-31')
  const [branchScope, setBranchScope] = useState('All branches')
  const [maker, setMaker] = useState('Finance-01')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [auditRows, setAuditRows] = useState<ReportRequestAuditEvent[]>([])
  const [auditLoading, setAuditLoading] = useState(false)

  function isRecoverableLiveFailure(e: unknown) {
    return e instanceof ApiHttpError && (e.status === 404 || e.status >= 500)
  }

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const out = await fetchReportRequests()
      setRows(out)
    } catch (e) {
      if (live && isRecoverableLiveFailure(e)) {
        setRows(listReportRequestsLocal())
        setError('')
      } else {
        setError(e instanceof ApiHttpError ? e.message : 'Could not load reports')
      }
    } finally {
      setLoading(false)
    }
  }, [live])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const onChanged = () => void refresh()
    window.addEventListener(REPORT_REQUEST_EVENT, onChanged as EventListener)
    return () => window.removeEventListener(REPORT_REQUEST_EVENT, onChanged as EventListener)
  }, [refresh])

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId])

  useEffect(() => {
    if (!selectedId) {
      setAuditRows([])
      return
    }
    setAuditLoading(true)
    void fetchReportRequestAudit(selectedId)
      .then((out) => setAuditRows(out))
      .catch((e) => {
        if (live && isRecoverableLiveFailure(e)) {
          setAuditRows(listReportRequestAuditLocal(selectedId))
          setError('')
        } else {
          setError(e instanceof ApiHttpError ? e.message : 'Could not load report audit trail')
        }
      })
      .finally(() => setAuditLoading(false))
  }, [live, selectedId])

  const selectedDataset = useMemo(() => {
    if (!selected || !isReportKey(selected.reportName)) return []
    return buildReportDataset(selected.reportName, selected.periodFrom, selected.periodTo)
  }, [selected])

  const rowSelectionModel = useMemo(
    () => ({ type: 'include' as const, ids: new Set(selectedId ? [selectedId] : []) }),
    [selectedId],
  )

  const columns: GridColDef<ReportRequestRow>[] = useMemo(
    () => [
      { field: 'id', headerName: 'Ref', minWidth: 150, flex: 0.8 },
      { field: 'reportName', headerName: 'Report', minWidth: 230, flex: 1.4 },
      { field: 'generatedAt', headerName: 'Generated', minWidth: 150, flex: 0.8 },
      { field: 'periodFrom', headerName: 'From', minWidth: 110, flex: 0.6 },
      { field: 'periodTo', headerName: 'To', minWidth: 110, flex: 0.6 },
      { field: 'branchScope', headerName: 'Scope', minWidth: 150, flex: 0.9 },
      { field: 'rowCount', headerName: 'Rows', type: 'number', minWidth: 90, flex: 0.5 },
      { field: 'maker', headerName: 'Maker', minWidth: 120, flex: 0.7 },
      { field: 'checker', headerName: 'Checker', minWidth: 120, flex: 0.7 },
      { field: 'status', headerName: 'Status', minWidth: 150, flex: 0.8 },
    ],
    [],
  )

  async function onGenerate() {
    const cleanFrom = periodFrom.trim()
    const cleanTo = periodTo.trim()
    const cleanScope = branchScope.trim()
    const cleanMaker = maker.trim()
    if (!cleanFrom || !cleanTo || !cleanScope || !cleanMaker) {
      setError('Report period, scope, and maker are required')
      return
    }
    if (cleanFrom > cleanTo) {
      setError('From date must be on or before To date')
      return
    }

    const rowCount = buildReportDataset(reportName, cleanFrom, cleanTo).length

    setBusy(true)
    setError('')
    try {
      const created = await queueReportRequest({
        reportName,
        periodFrom: cleanFrom,
        periodTo: cleanTo,
        branchScope: cleanScope,
        maker: cleanMaker,
        rowCount,
      })
      setSelectedId(created.id)
      setActionNotice(`Report request queued: ${created.id}`)
      await refresh()
    } catch (e) {
      if (live && isRecoverableLiveFailure(e)) {
        const created = createReportRequestLocal({
          reportName,
          periodFrom: cleanFrom,
          periodTo: cleanTo,
          branchScope: cleanScope,
          maker: cleanMaker,
          rowCount,
        })
        setSelectedId(created.id)
        setRows(listReportRequestsLocal())
        setAuditRows(listReportRequestAuditLocal(created.id))
        setActionNotice(`Live API unavailable. Report request queued locally: ${created.id}`)
      } else {
        setError(e instanceof ApiHttpError ? e.message : 'Could not queue report request')
      }
    } finally {
      setBusy(false)
    }
  }

  async function onApprove() {
    if (!selected) return
    const cleanChecker = checkerUser.trim() || 'HO-Admin'
    setBusy(true)
    setError('')
    try {
      await approveQueuedReport(selected.id, cleanChecker)
      await refresh()
      const audit = await fetchReportRequestAudit(selected.id)
      setAuditRows(audit)
      setActionNotice(`Report approved: ${selected.id}`)
    } catch (e) {
      if (live && isRecoverableLiveFailure(e)) {
        approveReportRequestLocal(selected.id, cleanChecker)
        setRows(listReportRequestsLocal())
        setAuditRows(listReportRequestAuditLocal(selected.id))
        setActionNotice(`Live API unavailable. Report approved locally: ${selected.id}`)
      } else {
        setError(e instanceof ApiHttpError ? e.message : 'Could not approve report request')
      }
    } finally {
      setBusy(false)
    }
  }

  async function onReject() {
    if (!selected) return
    const cleanChecker = checkerUser.trim() || 'HO-Admin'
    setBusy(true)
    setError('')
    try {
      await rejectQueuedReport(selected.id, cleanChecker, rejectReason)
      await refresh()
      const audit = await fetchReportRequestAudit(selected.id)
      setAuditRows(audit)
      setActionNotice(`Report rejected: ${selected.id}`)
    } catch (e) {
      if (live && isRecoverableLiveFailure(e)) {
        rejectReportRequestLocal(selected.id, cleanChecker, rejectReason)
        setRows(listReportRequestsLocal())
        setAuditRows(listReportRequestAuditLocal(selected.id))
        setActionNotice(`Live API unavailable. Report rejected locally: ${selected.id}`)
      } else {
        setError(e instanceof ApiHttpError ? e.message : 'Could not reject report request')
      }
    } finally {
      setBusy(false)
    }
  }

  function exportSelected(kind: 'xlsx' | 'csv' | 'txt' | 'doc' | 'print' | 'json') {
    if (!selected) return
    if (selectedDataset.length === 0) {
      setError('No dataset available for this report type')
      return
    }
    const base = safeExportFilename(`${selected.reportName}_${selected.id}_${selected.periodFrom}_${selected.periodTo}`)
    if (kind === 'xlsx') exportRowsToExcel(selectedDataset, selected.reportName, `${base}.xlsx`)
    if (kind === 'csv') exportRowsToCsv(selectedDataset, `${base}.csv`)
    if (kind === 'txt') exportRowsToTxt(selectedDataset, `${base}.txt`)
    if (kind === 'doc') exportRowsToWordHtml(selected.reportName, selectedDataset, `${base}.doc`)
    if (kind === 'print') openPrintableReportWindow(selected.reportName, selectedDataset)
    if (kind === 'json') downloadJsonPretty(`${base}.json`, selectedDataset)
  }

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
          Reports
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Generate finance and operations report requests with maker-checker flow, audit trail, and multi-format exports.
        </Typography>
      </Box>

      {live ? (
        <Alert severity="info">Live API mode: requests are persisted via /api/v1/reports and audit via /api/v1/reports/:id/audit.</Alert>
      ) : (
        <Alert severity="info">Local storage mode: requests are persisted in browser storage with the same workflow and validation.</Alert>
      )}

      {error ? (
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      ) : null}

      {actionNotice ? (
        <Alert severity="success" onClose={() => setActionNotice('')}>
          {actionNotice}
        </Alert>
      ) : null}

      <Paper sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 900, mb: 1.25 }}>Create Report Request</Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
          <FormControl size="small" sx={{ minWidth: 280 }}>
            <InputLabel id="report-name-label">Report Name</InputLabel>
            <Select
              labelId="report-name-label"
              label="Report Name"
              value={reportName}
              onChange={(e) => setReportName(e.target.value as ReportKey)}
            >
              {REPORT_KEYS.map((k) => (
                <MenuItem key={k} value={k}>
                  {k}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField size="small" type="date" label="From" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField size="small" type="date" label="To" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField size="small" label="Branch scope" value={branchScope} onChange={(e) => setBranchScope(e.target.value)} sx={{ minWidth: 180 }} />
          <TextField size="small" label="Maker" value={maker} onChange={(e) => setMaker(e.target.value)} sx={{ minWidth: 150 }} />
          <Button variant="contained" onClick={() => void onGenerate()} disabled={busy || loading}>
            Generate & queue
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 1.5 }}>
        <Box sx={{ height: 420 }}>
          <DataGrid
            loading={loading}
            rows={rows}
            columns={columns}
            getRowId={(r) => r.id}
            onRowClick={(p) => setSelectedId(String(p.row.id))}
            rowSelectionModel={rowSelectionModel}
            onRowSelectionModelChange={(model) => {
              const next = (model as any).ids?.values().next().value
              setSelectedId(next ? String(next) : null)
            }}
            initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
            pageSizeOptions={[10, 25]}
            sx={{ border: 0 }}
          />
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 900, mb: 1 }}>Actions</Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
          <TextField
            size="small"
            label="Checker user"
            value={checkerUser}
            onChange={(e) => setCheckerUser(e.target.value)}
            sx={{ minWidth: 160 }}
          />
          <TextField
            size="small"
            label="Reject reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            sx={{ minWidth: 260 }}
          />
          <Button
            variant="contained"
            disabled={!selected || busy || selected?.status !== 'Pending Approval'}
            onClick={() => void onApprove()}
          >
            Approve selected
          </Button>
          <Button
            variant="outlined"
            color="error"
            disabled={!selected || busy || selected?.status !== 'Pending Approval'}
            onClick={() => void onReject()}
          >
            Reject selected
          </Button>
          <Button variant="text" disabled={loading || busy} onClick={() => void refresh()}>
            Refresh
          </Button>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 1.25 }}>
          <Button variant="outlined" disabled={!selected} onClick={() => exportSelected('xlsx')}>Excel</Button>
          <Button variant="outlined" disabled={!selected} onClick={() => exportSelected('csv')}>CSV</Button>
          <Button variant="outlined" disabled={!selected} onClick={() => exportSelected('txt')}>TXT</Button>
          <Button variant="outlined" disabled={!selected} onClick={() => exportSelected('doc')}>Word</Button>
          <Button variant="outlined" disabled={!selected} onClick={() => exportSelected('json')}>JSON</Button>
          <Button variant="outlined" disabled={!selected} onClick={() => exportSelected('print')}>Print/PDF</Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 900, mb: 1 }}>Audit Trail</Typography>
        {!selected ? (
          <Typography variant="body2" color="text.secondary">Select a report row to view audit events.</Typography>
        ) : auditLoading ? (
          <Typography variant="body2" color="text.secondary">Loading audit events...</Typography>
        ) : auditRows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No audit events recorded.</Typography>
        ) : (
          <Stack spacing={1}>
            {auditRows.map((a, idx) => (
              <Paper key={`${a.at}-${a.actor}-${idx}`} variant="outlined" sx={{ p: 1.2 }}>
                <Typography variant="caption" color="text.secondary">
                  {a.at} | {a.actor}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {a.action}
                </Typography>
                {a.details ? (
                  <Typography variant="body2" color="text.secondary">
                    {a.details}
                  </Typography>
                ) : null}
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>
    </Stack>
  )
}
