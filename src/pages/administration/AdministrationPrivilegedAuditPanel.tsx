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
  privilegedCategoryLabel,
  recordPrivilegedAuditEvent,
  resetPrivilegedActionsAuditToSeed,
  PRIVILEGED_AUDIT_EVENT,
  type PrivilegedAuditCategory,
  type PrivilegedAuditEntry,
  type PrivilegedAuditOutcome,
} from '../../state/privilegedActionsAuditStore'
import {
  getPrivilegedAudit
} from '../../integrations/administration/adminRepository'

const ALL_CAT = ['admin_action', 'database_change', 'deployment', 'privilege_escalation'] as const satisfies readonly PrivilegedAuditCategory[]

function isValidDateStr(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

function outcomeStyle(o: PrivilegedAuditOutcome) {
  if (o === 'Failure') return { bg: 'rgba(211,47,47,0.12)', fg: '#c62828' }
  if (o === 'Success') return { bg: 'rgba(66,171,72,0.14)', fg: brand.green }
  return { bg: 'rgba(0,0,0,0.06)', fg: brand.black }
}

export function AdministrationPrivilegedAuditPanel() {
  const [rows, setRows] = useState<PrivilegedAuditEntry[]>([])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [actorQ, setActorQ] = useState('')
  const [detailsQ, setDetailsQ] = useState('')
  const [cat, setCat] = useState<'' | PrivilegedAuditCategory>('')
  const [outcome, setOutcome] = useState<'' | PrivilegedAuditOutcome>('')
  const [filterError, setFilterError] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setRows(await getPrivilegedAudit())
  }, [])

  useEffect(() => {
    refresh()
    const on = () => refresh()
    window.addEventListener(PRIVILEGED_AUDIT_EVENT, on as EventListener)
    return () => window.removeEventListener(PRIVILEGED_AUDIT_EVENT, on as EventListener)
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
        category: privilegedCategoryLabel(r.category),
        eventType: r.eventType,
        outcome: r.outcome,
        actorUserId: r.actorUserId,
        targetUserId: r.targetUserId ?? '—',
        environment: r.environment ?? '—',
        resourceRef: r.resourceRef ?? '—',
        ip: r.ip,
        how: r.how ?? '—',
        chainHash: r.entryHash ?? '—',
        clientDevice: (r.clientDevice ?? '—').slice(0, 120),
        details: r.details,
      })),
    [filtered],
  )

  const baseName = safeExportFilename(`Privileged_audit_${fromDate || 'all'}_${toDate || 'all'}`)

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

  const cols: GridColDef<PrivilegedAuditEntry>[] = [
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
      flex: 0.95,
      minWidth: 150,
      valueGetter: (_v, row) => privilegedCategoryLabel(row.category),
    },
    { field: 'eventType', headerName: 'Event type', flex: 0.9, minWidth: 130 },
    {
      field: 'outcome',
      headerName: 'Outcome',
      flex: 0.5,
      minWidth: 88,
      renderCell: (p) => {
        const s = outcomeStyle(p.value as PrivilegedAuditOutcome)
        return <Chip size="small" label={p.value} sx={{ bgcolor: s.bg, color: s.fg }} />
      },
    },
    { field: 'actorUserId', headerName: 'Actor', flex: 0.8, minWidth: 120 },
    {
      field: 'targetUserId',
      headerName: 'Target user',
      flex: 0.75,
      minWidth: 110,
      valueGetter: (_v, row) => row.targetUserId ?? '—',
    },
    {
      field: 'environment',
      headerName: 'Env',
      flex: 0.45,
      minWidth: 90,
      valueGetter: (_v, row) => row.environment ?? '—',
    },
    {
      field: 'resourceRef',
      headerName: 'Resource ref',
      flex: 0.75,
      minWidth: 120,
      valueGetter: (_v, row) => row.resourceRef ?? '—',
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
      <Alert severity="info">
        <strong>Administrative &amp; privileged actions:</strong> (1) admin logins and actions — configuration, role assignment,
        content moderation; (2) database changes — manual SQL and schema migrations; (3) deployments and configuration updates;
        (4) privilege escalations (e.g. operator → admin). Audit events stored in <code>localStorage</code>; production: SQL Server +
        immutable audit pipeline.
      </Alert>

      {msg ? (
        <Alert severity="success" onClose={() => setMsg(null)}>
          {msg}
        </Alert>
      ) : null}

      <Paper sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 900, mb: 1 }}>Privileged event simulator</Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddCircleOutlineOutlinedIcon />}
            onClick={() => {
              recordPrivilegedAuditEvent({
                category: 'admin_action',
                eventType: 'CONFIG_CHANGE',
                actorUserId: 'HO-Admin',
                environment: 'Production',
                resourceRef: 'compliance/mla-settings',
                details: 'Configuration changed: MLA photo-ID requirement updated',
                how: 'ADMIN_BUTTON',
              })
              refresh()
              flash('Logged CONFIG_CHANGE (admin)')
            }}
          >
            Config change
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddCircleOutlineOutlinedIcon />}
            onClick={() => {
              recordPrivilegedAuditEvent({
                category: 'database_change',
                eventType: 'MANUAL_SQL_EXECUTED',
                actorUserId: 'DBA',
                environment: 'Production',
                details: 'Manual SQL executed: ad-hoc SELECT count(*) … (read-only)',
                how: 'SQL_BUTTON',
              })
              refresh()
              flash('Logged MANUAL_SQL_EXECUTED (database)')
            }}
          >
            Manual SQL
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddCircleOutlineOutlinedIcon />}
            onClick={() => {
              recordPrivilegedAuditEvent({
                category: 'deployment',
                eventType: 'CODE_DEPLOY',
                actorUserId: 'CICD',
                resourceRef: `build-${Date.now().toString(36)}`,
                environment: 'Production',
                details: 'Code deployment: release tag pushed to production',
                how: 'DEPLOY_BUTTON',
              })
              refresh()
              flash('Logged CODE_DEPLOY (deployment)')
            }}
          >
            Deploy / push
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddCircleOutlineOutlinedIcon />}
            onClick={() => {
              recordPrivilegedAuditEvent({
                category: 'privilege_escalation',
                eventType: 'ROLE_PROMOTION',
                actorUserId: 'HO-SuperAdmin',
                targetUserId: 'Standard-User',
                environment: 'Production',
                details: 'User role promoted: Standard user elevated to Administrator',
                how: 'ESCALATION_BUTTON',
              })
              refresh()
              flash('Logged ROLE_PROMOTION (privilege escalation)')
            }}
          >
            Privilege escalation
          </Button>
          <Button
            size="small"
            color="warning"
            variant="outlined"
            startIcon={<RestartAltOutlinedIcon />}
            onClick={() => {
              resetPrivilegedActionsAuditToSeed()
              refresh()
              flash('Privileged audit log reset to seed data')
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
            onChange={(e) => setCat(e.target.value as '' | PrivilegedAuditCategory)}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">All</MenuItem>
            {ALL_CAT.map((c) => (
              <MenuItem key={c} value={c}>
                {privilegedCategoryLabel(c)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Outcome"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as '' | PrivilegedAuditOutcome)}
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
            onClick={() => exportRowsToExcel(exportRows, 'PrivilegedAudit', `${baseName}.xlsx`)}
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
            onClick={() => exportRowsToWordHtml('Privileged actions audit', exportRows, `${baseName}.doc`)}
            sx={{ borderColor: 'divider' }}
          >
            Word
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadOutlinedIcon />}
            disabled={exportRows.length === 0}
            onClick={() => openPrintableReportWindow('Privileged actions audit', exportRows)}
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
