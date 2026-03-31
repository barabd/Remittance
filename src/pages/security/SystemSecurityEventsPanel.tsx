import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined'
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { DataIntegrityCompliancePanel } from '../../components/DataIntegrityCompliancePanel'
import { utcDayFromIso } from '../../lib/auditIntegrity'
import { brand } from '../../theme/appTheme'
import {
  exportRowsToCsv,
  exportRowsToExcel,
  exportRowsToTxt,
  exportRowsToWordHtml,
  openPrintableReportWindow,
  safeExportFilename,
} from '../../lib/reportExport'
import {
  loadSystemSecurityEvents,
  recordSystemSecurityEvent,
  resetSystemSecurityEventsToSeed,
  systemSecurityCategoryLabel,
  SYSTEM_SECURITY_EVENT,
  type SystemSecurityCategory,
  type SystemSecurityEntry,
  type SystemSecurityOutcome,
} from '../../state/systemSecurityEventsStore'

const ALL_CAT = [
  'app_error',
  'security_alert',
  'restricted_access',
  'file_transfer',
  'config_change',
] as const satisfies readonly SystemSecurityCategory[]

function isValidDateStr(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

function outcomeStyle(o: SystemSecurityOutcome) {
  if (o === 'Failure') return { bg: 'rgba(211,47,47,0.12)', fg: '#c62828' }
  if (o === 'Success') return { bg: 'rgba(66,171,72,0.14)', fg: brand.green }
  return { bg: 'rgba(0,0,0,0.06)', fg: brand.black }
}

export function SystemSecurityEventsPanel() {
  const [rows, setRows] = useState<SystemSecurityEntry[]>(() => loadSystemSecurityEvents())
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [actorQ, setActorQ] = useState('')
  const [detailsQ, setDetailsQ] = useState('')
  const [cat, setCat] = useState<'' | SystemSecurityCategory>('')
  const [outcome, setOutcome] = useState<'' | SystemSecurityOutcome>('')
  const [filterError, setFilterError] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  const refresh = useCallback(() => setRows(loadSystemSecurityEvents()), [])

  useEffect(() => {
    const on = () => refresh()
    window.addEventListener(SYSTEM_SECURITY_EVENT, on as EventListener)
    return () => window.removeEventListener(SYSTEM_SECURITY_EVENT, on as EventListener)
  }, [refresh])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (cat && r.category !== cat) return false
      if (outcome && r.outcome !== outcome) return false
      if (actorQ.trim() && !r.actorUserId.toLowerCase().includes(actorQ.trim().toLowerCase())) return false
      if (
        detailsQ.trim() &&
        !r.details.toLowerCase().includes(detailsQ.trim().toLowerCase()) &&
        !r.eventType.toLowerCase().includes(detailsQ.trim().toLowerCase())
      )
        return false
      const day = r.atUtc ? utcDayFromIso(r.atUtc) : r.at.slice(0, 10)
      if (fromDate && isValidDateStr(fromDate) && day < fromDate) return false
      if (toDate && isValidDateStr(toDate) && day > toDate) return false
      return true
    })
  }, [rows, fromDate, toDate, actorQ, detailsQ, cat, outcome])

  const exportRows = useMemo(
    () =>
      filtered.map((r) => ({
        at: r.at,
        atUtc: r.atUtc ?? '—',
        category: systemSecurityCategoryLabel(r.category),
        eventType: r.eventType,
        outcome: r.outcome,
        actorUserId: r.actorUserId,
        environment: r.environment ?? '—',
        resourceRef: r.resourceRef ?? '—',
        transfer: r.transferDirection ?? '—',
        sensitive: r.sensitiveAsset ? 'Yes' : '—',
        ip: r.ip,
        how: r.how ?? '—',
        chainHash: r.entryHash ?? '—',
        clientDevice: (r.clientDevice ?? '—').slice(0, 120),
        details: r.details,
      })),
    [filtered],
  )

  const baseName = safeExportFilename(`System_security_events_${fromDate || 'all'}_${toDate || 'all'}`)

  function validate() {
    if (fromDate && !isValidDateStr(fromDate)) return 'From must be YYYY-MM-DD.'
    if (toDate && !isValidDateStr(toDate)) return 'To must be YYYY-MM-DD.'
    if (fromDate && toDate && fromDate > toDate) return 'From cannot be after To.'
    return ''
  }

  function flash(m: string) {
    setMsg(m)
    window.setTimeout(() => setMsg(null), 3500)
  }

  const cols: GridColDef<SystemSecurityEntry>[] = [
    {
      field: 'atUtc',
      headerName: 'When (UTC)',
      flex: 1,
      minWidth: 168,
      valueGetter: (_v, row) => row.atUtc ?? row.at,
    },
    {
      field: 'category',
      headerName: 'Category',
      flex: 1,
      minWidth: 170,
      valueGetter: (_v, row) => systemSecurityCategoryLabel(row.category),
    },
    { field: 'eventType', headerName: 'Event type', flex: 0.9, minWidth: 130 },
    {
      field: 'outcome',
      headerName: 'Outcome',
      flex: 0.5,
      minWidth: 88,
      renderCell: (p) => {
        const s = outcomeStyle(p.value as SystemSecurityOutcome)
        return <Chip size="small" label={p.value} sx={{ bgcolor: s.bg, color: s.fg }} />
      },
    },
    { field: 'actorUserId', headerName: 'Actor', flex: 0.8, minWidth: 120 },
    {
      field: 'resourceRef',
      headerName: 'Resource',
      flex: 0.85,
      minWidth: 140,
      valueGetter: (_v, row) => row.resourceRef ?? '—',
    },
    {
      field: 'transferDirection',
      headerName: 'Transfer',
      flex: 0.45,
      minWidth: 88,
      valueGetter: (_v, row) => row.transferDirection ?? '—',
    },
    {
      field: 'sensitiveAsset',
      headerName: 'Sensitive',
      flex: 0.4,
      minWidth: 88,
      valueGetter: (_v, row) => (row.sensitiveAsset ? 'Yes' : '—'),
    },
    {
      field: 'environment',
      headerName: 'Env',
      flex: 0.45,
      minWidth: 90,
      valueGetter: (_v, row) => row.environment ?? '—',
    },
    { field: 'ip', headerName: 'IP', flex: 0.65, minWidth: 110 },
    {
      field: 'how',
      headerName: 'How',
      flex: 0.5,
      minWidth: 88,
      valueGetter: (_v, row) => row.how ?? '—',
    },
    {
      field: 'entryHash',
      headerName: 'Chain',
      flex: 0.45,
      minWidth: 96,
      valueGetter: (_v, row) => (row.entryHash ? `${row.entryHash.slice(0, 12)}…` : '—'),
    },
    { field: 'details', headerName: 'Details', flex: 1.3, minWidth: 220 },
  ]

  return (
    <Stack spacing={2}>
      <DataIntegrityCompliancePanel />

      <Alert severity="info">
        <strong>System &amp; security events:</strong> (1) application errors and exceptions; (2) security alerts; (3) access to
        restricted pages and APIs; (4) file uploads and downloads (including sensitive / media); (5) configuration changes —
        server, app, and API keys. Demo <code>localStorage</code>; production: aggregate in SQL Server + SIEM / App Insights.
      </Alert>

      {msg ? (
        <Alert severity="success" onClose={() => setMsg(null)}>
          {msg}
        </Alert>
      ) : null}

      <Paper sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 900, mb: 1 }}>Record demo events</Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddCircleOutlineOutlinedIcon />}
            onClick={() => {
              recordSystemSecurityEvent({
                category: 'app_error',
                eventType: 'CLIENT_RUNTIME_ERROR',
                actorUserId: 'browser',
                resourceRef: 'React tree',
                environment: 'Demo',
                details: 'Demo: simulated unhandled render error (correlation id generated client-side)',
                outcome: 'Failure',
                how: 'DEMO_BUTTON',
              })
              refresh()
              flash('Logged CLIENT_RUNTIME_ERROR')
            }}
          >
            App error
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddCircleOutlineOutlinedIcon />}
            onClick={() => {
              recordSystemSecurityEvent({
                category: 'security_alert',
                eventType: 'FAILED_LOGIN',
                actorUserId: 'unknown',
                resourceRef: '/auth/login',
                environment: 'Demo',
                details: 'Demo: invalid credentials — lockout counter incremented',
                outcome: 'Failure',
                how: 'DEMO_BUTTON',
              })
              refresh()
              flash('Logged FAILED_LOGIN')
            }}
          >
            Security alert
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddCircleOutlineOutlinedIcon />}
            onClick={() => {
              recordSystemSecurityEvent({
                category: 'restricted_access',
                eventType: 'API_DENIED',
                actorUserId: 'DemoUser',
                resourceRef: 'GET /api/admin/config',
                environment: 'Demo',
                details: 'Demo: 403 forbidden — insufficient scope',
                outcome: 'Failure',
                how: 'DEMO_BUTTON',
              })
              refresh()
              flash('Logged API_DENIED')
            }}
          >
            Restricted API
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddCircleOutlineOutlinedIcon />}
            onClick={() => {
              recordSystemSecurityEvent({
                category: 'file_transfer',
                eventType: 'FILE_UPLOAD',
                actorUserId: 'SecurityAdmin',
                resourceRef: 'kyc-pack-demo.pdf',
                environment: 'Demo',
                details: 'Demo: sensitive document upload — AV scan simulated OK',
                outcome: 'Success',
                transferDirection: 'upload',
                sensitiveAsset: true,
                how: 'DEMO_BUTTON',
              })
              refresh()
              flash('Logged FILE_UPLOAD (sensitive)')
            }}
          >
            File upload
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddCircleOutlineOutlinedIcon />}
            onClick={() => {
              recordSystemSecurityEvent({
                category: 'config_change',
                eventType: 'FEATURE_FLAG',
                actorUserId: 'HO-Admin',
                resourceRef: 'VITE_* / runtime flags',
                environment: 'Demo',
                details: 'Demo: toggled feature flag (no secret values logged)',
                outcome: 'Success',
                how: 'DEMO_BUTTON',
              })
              refresh()
              flash('Logged FEATURE_FLAG')
            }}
          >
            Config change
          </Button>
          <Button
            size="small"
            color="warning"
            variant="outlined"
            startIcon={<RestartAltOutlinedIcon />}
            onClick={() => {
              resetSystemSecurityEventsToSeed()
              refresh()
              flash('Reset to seed data')
            }}
          >
            Reset to seed
          </Button>
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} flexWrap="wrap">
          <TextField
            select
            label="Category"
            value={cat}
            onChange={(e) => setCat(e.target.value as '' | SystemSecurityCategory)}
            sx={{ minWidth: 260 }}
          >
            <MenuItem value="">All</MenuItem>
            {ALL_CAT.map((c) => (
              <MenuItem key={c} value={c}>
                {systemSecurityCategoryLabel(c)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Outcome"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as '' | SystemSecurityOutcome)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="Success">Success</MenuItem>
            <MenuItem value="Failure">Failure</MenuItem>
            <MenuItem value="Info">Info</MenuItem>
          </TextField>
          <TextField label="From (YYYY-MM-DD)" value={fromDate} onChange={(e) => setFromDate(e.target.value)} sx={{ minWidth: 180 }} />
          <TextField label="To (YYYY-MM-DD)" value={toDate} onChange={(e) => setToDate(e.target.value)} sx={{ minWidth: 180 }} />
          <TextField label="Actor contains" value={actorQ} onChange={(e) => setActorQ(e.target.value)} sx={{ minWidth: 160 }} />
          <TextField
            label="Event / details contains"
            value={detailsQ}
            onChange={(e) => setDetailsQ(e.target.value)}
            sx={{ minWidth: 200 }}
          />
        </Stack>
        {filterError ? (
          <Alert severity="error" sx={{ mt: 1 }}>
            {filterError}
          </Alert>
        ) : null}
        <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1.5 }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<SearchOutlinedIcon />}
            onClick={() => setFilterError(validate())}
          >
            Apply
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ClearOutlinedIcon />}
            onClick={() => {
              setFromDate('')
              setToDate('')
              setActorQ('')
              setDetailsQ('')
              setCat('')
              setOutcome('')
              setFilterError('')
            }}
            sx={{ borderColor: 'divider' }}
          >
            Clear
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadOutlinedIcon />}
            disabled={exportRows.length === 0}
            onClick={() => exportRowsToExcel(exportRows, 'SystemSecurityEvents', `${baseName}.xlsx`)}
            sx={{ borderColor: 'divider' }}
          >
            Excel
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadOutlinedIcon />}
            disabled={exportRows.length === 0}
            onClick={() => exportRowsToCsv(exportRows, `${baseName}.csv`)}
            sx={{ borderColor: 'divider' }}
          >
            CSV
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadOutlinedIcon />}
            disabled={exportRows.length === 0}
            onClick={() => exportRowsToTxt(exportRows, `${baseName}.txt`)}
            sx={{ borderColor: 'divider' }}
          >
            TXT
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadOutlinedIcon />}
            disabled={exportRows.length === 0}
            onClick={() => exportRowsToWordHtml('System & security events', exportRows, `${baseName}.doc`)}
            sx={{ borderColor: 'divider' }}
          >
            Word
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadOutlinedIcon />}
            disabled={exportRows.length === 0}
            onClick={() => openPrintableReportWindow('System & security events', exportRows)}
            sx={{ borderColor: 'divider' }}
          >
            PDF
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 1.5 }}>
        <Box sx={{ height: 440 }}>
          <DataGrid
            rows={filtered}
            columns={cols}
            getRowId={(r) => r.id}
            disableRowSelectionOnClick
            initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
            pageSizeOptions={[10, 25, 50]}
            sx={{ border: 0 }}
          />
        </Box>
      </Paper>
    </Stack>
  )
}
