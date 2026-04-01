import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined'
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined'
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import DataObjectOutlinedIcon from '@mui/icons-material/DataObjectOutlined'
import TerminalOutlinedIcon from '@mui/icons-material/TerminalOutlined'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { DataIntegrityCompliancePanel } from '../components/DataIntegrityCompliancePanel'
import { userActivityToStructuredJson, userActivityToSyslogLines } from '../lib/auditStructuredExport'
import { utcDayFromIso } from '../lib/auditIntegrity'
import { redactLogText, redactUserIdentifier } from '../lib/logRedaction'
import { brand } from '../theme/appTheme'
import {
  downloadJsonPretty,
  downloadTextFile,
  exportRowsToCsv,
  exportRowsToExcel,
  exportRowsToTxt,
  exportRowsToWordHtml,
  openPrintableReportWindow,
  safeExportFilename,
} from '../lib/reportExport'
import {
  DEMO_SESSION_EVENT,
  getDemoConsoleRole,
  canAccessAuditTrail,
  isAuditTrailRole,
  listDemoRoles,
  setDemoConsoleRole,
  type DemoConsoleRole,
} from '../state/demoSessionStore'
import {
  categoryLabel,
  recordUserActivityEvent,
  resetUserActivityAuditLogToSeed,
  USER_ACTIVITY_AUDIT_EVENT,
  type UserActivityAuditEntry,
  type UserActivityCategory,
  type UserActivityOutcome,
} from '../state/userActivityAuditStore'
import { getUserActivityAudit } from '../integrations/auditMonitoring/auditRepository'

const ALL_CATEGORIES = [
  'authentication',
  'account_admin',
  'session',
  'password',
  'data_change',
] as const satisfies readonly UserActivityCategory[]

function isValidDateStr(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

function outcomeChipColor(o: UserActivityOutcome) {
  if (o === 'Failure') return { bg: 'rgba(211,47,47,0.12)', fg: '#c62828' }
  if (o === 'Success') return { bg: 'rgba(66,171,72,0.14)', fg: brand.green }
  return { bg: 'rgba(0,0,0,0.06)', fg: brand.black }
}

function AuditAccessDenied() {
  const [role, setRole] = useState<DemoConsoleRole>(() => getDemoConsoleRole())

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 560 }}>
      <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
        Audit &amp; monitoring
      </Typography>
      <Alert severity="error">
        <Box component="span" sx={{ fontWeight: 900 }}>Access denied (RBAC).</Box> This audit trail is available only to <Box component="span" sx={{ fontWeight: 900 }}>Auditor</Box> and{' '}
        <Box component="span" sx={{ fontWeight: 900 }}>HO Admin</Box> roles. In production, enforce the same with OIDC claims and API policies. Use the role selector below to test access control.
      </Alert>
      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Acting as (session role)</InputLabel>
            <Select
              label="Acting as (session role)"
              value={role}
              onChange={(e) => {
                const v = e.target.value as DemoConsoleRole
                setRole(v)
                setDemoConsoleRole(v)
              }}
            >
              {listDemoRoles().map((r) => (
                <MenuItem key={r} value={r}>
                  {r}
                  {isAuditTrailRole(r) ? ' — can view audit' : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button component={RouterLink} to="/dashboard" variant="outlined" sx={{ borderColor: 'divider' }}>
            Back to dashboard
          </Button>
        </Stack>
      </Paper>
    </Stack>
  )
}

export function AuditMonitoringPage() {
  const [, setSessionBump] = useState(0)
  const [actingRole, setActingRole] = useState<DemoConsoleRole>(() => getDemoConsoleRole())

  useEffect(() => {
    const fn = () => {
      setSessionBump((x) => x + 1)
      setActingRole(getDemoConsoleRole())
    }
    window.addEventListener(DEMO_SESSION_EVENT, fn as EventListener)
    return () => window.removeEventListener(DEMO_SESSION_EVENT, fn as EventListener)
  }, [])

  const [rows, setRows] = useState<UserActivityAuditEntry[]>([])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [userId, setUserId] = useState('')
  const [actorQ, setActorQ] = useState('')
  const [ipQ, setIpQ] = useState('')
  const [eventTypeQ, setEventTypeQ] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'' | UserActivityCategory>('')
  const [outcomeFilter, setOutcomeFilter] = useState<'' | UserActivityOutcome>('')
  const [filterError, setFilterError] = useState('')
  const [demoMsg, setDemoMsg] = useState<string | null>(null)
  const [redactPii, setRedactPii] = useState(true)

  const refresh = useCallback(async () => {
    setRows(await getUserActivityAudit())
  }, [])

  useEffect(() => {
    refresh()
    const on = () => refresh()
    window.addEventListener(USER_ACTIVITY_AUDIT_EVENT, on as EventListener)
    return () => window.removeEventListener(USER_ACTIVITY_AUDIT_EVENT, on as EventListener)
  }, [refresh])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (categoryFilter && r.category !== categoryFilter) return false
      if (outcomeFilter && r.outcome !== outcomeFilter) return false
      if (userId.trim() && !r.userId.toLowerCase().includes(userId.trim().toLowerCase())) return false
      if (actorQ.trim()) {
        const a = (r.actorUserId ?? '').toLowerCase()
        if (!a.includes(actorQ.trim().toLowerCase())) return false
      }
      if (ipQ.trim() && !r.ip.toLowerCase().includes(ipQ.trim().toLowerCase())) return false
      if (
        eventTypeQ.trim() &&
        !r.eventType.toLowerCase().includes(eventTypeQ.trim().toLowerCase()) &&
        !r.details.toLowerCase().includes(eventTypeQ.trim().toLowerCase())
      )
        return false
      const day = r.atUtc ? utcDayFromIso(r.atUtc) : r.at.slice(0, 10)
      if (fromDate && isValidDateStr(fromDate) && day < fromDate) return false
      if (toDate && isValidDateStr(toDate) && day > toDate) return false
      return true
    })
  }, [rows, fromDate, toDate, userId, actorQ, ipQ, eventTypeQ, categoryFilter, outcomeFilter])

  const displayRows = useMemo(() => {
    if (!redactPii) return filtered
    return filtered.map((r) => ({
      ...r,
      details: redactLogText(r.details),
      userId: redactUserIdentifier(r.userId),
      actorUserId: r.actorUserId ? redactUserIdentifier(r.actorUserId) : r.actorUserId,
      resourceRef: r.resourceRef ? redactLogText(r.resourceRef) : r.resourceRef,
      clientDevice: r.clientDevice ? '[REDACTED]' : r.clientDevice,
    }))
  }, [filtered, redactPii])

  const exportRows = useMemo(
    () =>
      displayRows.map((r) => ({
        at: r.at,
        atUtc: r.atUtc ?? '—',
        category: categoryLabel(r.category),
        eventType: r.eventType,
        outcome: r.outcome,
        userId: r.userId,
        actorUserId: r.actorUserId ?? '—',
        resourceType: r.resourceType ?? '—',
        resourceRef: r.resourceRef ?? '—',
        ip: r.ip,
        how: r.how ?? '—',
        clientDevice: (r.clientDevice ?? '—').slice(0, 120),
        chainHash: r.entryHash ?? '—',
        details: r.details,
      })),
    [displayRows],
  )

  const baseName = safeExportFilename(`User_activity_audit_${fromDate || 'all'}_${toDate || 'all'}`)
  const jsonName = safeExportFilename(`User_activity_audit_structured_${fromDate || 'all'}_${toDate || 'all'}`)
  const syslogName = safeExportFilename(`User_activity_audit_syslog_${fromDate || 'all'}_${toDate || 'all'}`)

  function validate() {
    if (fromDate && !isValidDateStr(fromDate)) return 'From must be YYYY-MM-DD.'
    if (toDate && !isValidDateStr(toDate)) return 'To must be YYYY-MM-DD.'
    if (fromDate && toDate && fromDate > toDate) return 'From cannot be after To.'
    return ''
  }

  function onApply() {
    setFilterError(validate())
  }

  function onClear() {
    setFromDate('')
    setToDate('')
    setUserId('')
    setActorQ('')
    setIpQ('')
    setEventTypeQ('')
    setCategoryFilter('')
    setOutcomeFilter('')
    setFilterError('')
  }

  function setLastUtcDays(n: number) {
    const to = new Date()
    const from = new Date(to)
    from.setUTCDate(from.getUTCDate() - n)
    setToDate(to.toISOString().slice(0, 10))
    setFromDate(from.toISOString().slice(0, 10))
    setFilterError('')
  }

  function flash(msg: string) {
    setDemoMsg(msg)
    window.setTimeout(() => setDemoMsg(null), 4000)
  }

  async function openPeriodicReport() {
    const generated = new Date().toISOString()
    const meta: Record<string, unknown>[] = [
      { rowType: 'report_meta', field: 'Title', value: 'Periodic user activity audit report (A.2.2.1)' },
      { rowType: 'report_meta', field: 'Generated (UTC)', value: generated },
      { rowType: 'report_meta', field: 'Filter from', value: fromDate || '(any)' },
      { rowType: 'report_meta', field: 'Filter to', value: toDate || '(any)' },
      { rowType: 'report_meta', field: 'Events included', value: exportRows.length },
      { rowType: 'report_meta', field: 'PII redaction in export', value: redactPii ? 'on' : 'off' },
      { rowType: 'report_meta', field: 'Acting role (demo)', value: actingRole },
    ]
    const combined = [...meta, ...exportRows.map((r) => ({ rowType: 'event', ...r }))]
    await openPrintableReportWindow('Periodic user activity audit report', combined)
  }

  const cols: GridColDef<UserActivityAuditEntry>[] = [
    {
      field: 'atUtc',
      headerName: 'When (UTC)',
      flex: 1,
      minWidth: 168,
      valueGetter: (_v, row) => row.atUtc ?? row.at,
    },
    {
      field: 'category',
      headerName: 'A.2.2.1 category',
      flex: 0.85,
      minWidth: 130,
      valueGetter: (_v, row) => categoryLabel(row.category),
    },
    { field: 'eventType', headerName: 'Event type', flex: 0.9, minWidth: 140 },
    {
      field: 'outcome',
      headerName: 'Outcome',
      flex: 0.55,
      minWidth: 90,
      renderCell: (p) => {
        const c = outcomeChipColor(p.value as UserActivityOutcome)
        return <Chip size="small" label={p.value} sx={{ bgcolor: c.bg, color: c.fg }} />
      },
    },
    { field: 'userId', headerName: 'User', flex: 0.75, minWidth: 110 },
    {
      field: 'actorUserId',
      headerName: 'Actor',
      flex: 0.75,
      minWidth: 100,
      valueGetter: (_v, row) => row.actorUserId ?? '—',
    },
    {
      field: 'resourceType',
      headerName: 'Resource',
      flex: 0.65,
      minWidth: 100,
      valueGetter: (_v, row) => row.resourceType ?? '—',
    },
    {
      field: 'resourceRef',
      headerName: 'Ref',
      flex: 0.75,
      minWidth: 120,
      valueGetter: (_v, row) => row.resourceRef ?? '—',
    },
    { field: 'ip', headerName: 'IP', flex: 0.65, minWidth: 110 },
    {
      field: 'how',
      headerName: 'How',
      flex: 0.55,
      minWidth: 92,
      valueGetter: (_v, row) => row.how ?? '—',
    },
    {
      field: 'entryHash',
      headerName: 'Chain',
      flex: 0.5,
      minWidth: 100,
      valueGetter: (_v, row) => (row.entryHash ? `${row.entryHash.slice(0, 12)}…` : '—'),
    },
    { field: 'details', headerName: 'Details', flex: 1.2, minWidth: 200 },
  ]

  if (!canAccessAuditTrail()) {
    return <AuditAccessDenied />
  }

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
          Audit &amp; monitoring
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          <Box component="span" sx={{ fontWeight: 900 }}>A.2.2.1 User activity logging</Box> plus <Box component="span" sx={{ fontWeight: 900 }}>audit trail accessibility &amp; monitoring</Box>: RBAC,
          investigation filters, structured JSON/syslog exports, PII/password redaction, and periodic report generation. Audit events stored in <code>localStorage</code>; production: <Box component="span" sx={{ fontWeight: 900 }}>ASP.NET Core → SQL Server</Box> with matching policies. Related:{' '}
          <RouterLink to="/reports">Reports</RouterLink>, <RouterLink to="/administration">Administration</RouterLink>,{' '}
          <RouterLink to="/security/user-rights">User rights</RouterLink>,{' '}
          <RouterLink to="/tools/security-vapt">Security &amp; VAPT</RouterLink>.
        </Typography>
      </Box>

      <Alert severity="warning" variant="outlined">
        <Box component="span" sx={{ fontWeight: 900 }}>RBAC:</Box> You are viewing this page as <Box component="span" sx={{ fontWeight: 900 }}>{actingRole}</Box> (active session role). Only{' '}
        <Box component="span" sx={{ fontWeight: 900 }}>Auditor</Box> and <Box component="span" sx={{ fontWeight: 900 }}>HO Admin</Box> may access audit logs — switch role below to test denial.
      </Alert>

      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Acting as</InputLabel>
            <Select
              label="Acting as"
              value={actingRole}
              onChange={(e) => setDemoConsoleRole(e.target.value as DemoConsoleRole)}
            >
              {listDemoRoles().map((r) => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={<Switch checked={redactPii} onChange={(_, c) => setRedactPii(c)} color="primary" />}
            label="Redact passwords &amp; PII in grid / exports"
          />
        </Stack>
      </Paper>

      <DataIntegrityCompliancePanel />

      {demoMsg ? (
        <Alert severity="success" onClose={() => setDemoMsg(null)}>
          {demoMsg}
        </Alert>
      ) : null}

      <Paper sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 900, mb: 1 }}>Simulate user activity events</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
          Use these buttons to record sample audit log entries. Each click logs one event to verify audit recording.
        </Typography>
        <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 1.5 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddCircleOutlineOutlinedIcon />}
            onClick={() => {
              recordUserActivityEvent({
                category: 'authentication',
                eventType: 'LOGIN_FAILED',
                userId: 'demo.attacker',
                outcome: 'Failure',
                ip: '198.51.100.1',
                details: 'Authentication failure: invalid credentials',
              })
              refresh()
              flash('Logged: LOGIN_FAILED (authentication)')
            }}
          >
            Failed login
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddCircleOutlineOutlinedIcon />}
            onClick={() => {
              recordUserActivityEvent({
                category: 'authentication',
                eventType: 'LOGOUT',
                userId: 'HO-Admin',
                outcome: 'Success',
                ip: '127.0.0.1',
                details: 'User session ended',
              })
              refresh()
              flash('Logged: LOGOUT (authentication)')
            }}
          >
            Logout
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddCircleOutlineOutlinedIcon />}
            onClick={() => {
              recordUserActivityEvent({
                category: 'session',
                eventType: 'SESSION_TIMEOUT',
                userId: 'Branch-Demo',
                outcome: 'Info',
                resourceRef: `sess-${Date.now().toString(36)}`,
                ip: '127.0.0.1',
                details: 'Session expired: idle timeout',
              })
              refresh()
              flash('Logged: SESSION_TIMEOUT (session)')
            }}
          >
            Session timeout
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddCircleOutlineOutlinedIcon />}
            onClick={() => {
              recordUserActivityEvent({
                category: 'password',
                eventType: 'PASSWORD_RESET_REQUESTED',
                userId: 'Branch-Demo',
                outcome: 'Success',
                ip: '127.0.0.1',
                details: 'Password reset request issued',
              })
              refresh()
              flash('Logged: PASSWORD_RESET_REQUESTED (password)')
            }}
          >
            Password reset
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddCircleOutlineOutlinedIcon />}
            onClick={() => {
              recordUserActivityEvent({
                category: 'account_admin',
                eventType: 'ROLE_UPDATED',
                userId: 'Branch-Demo',
                actorUserId: 'HO-Admin',
                outcome: 'Success',
                resourceType: 'User',
                resourceRef: 'Branch-Demo',
                ip: '127.0.0.1',
                details: 'User role and permissions updated',
              })
              refresh()
              flash('Logged: ROLE_UPDATED (account / roles)')
            }}
          >
            Role update
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddCircleOutlineOutlinedIcon />}
            onClick={() => {
              recordUserActivityEvent({
                category: 'data_change',
                eventType: 'DATA_UPDATE',
                userId: 'HO-Checker',
                outcome: 'Success',
                resourceType: 'Remittance',
                resourceRef: 'REM-DEMO-001',
                ip: '127.0.0.1',
                details: 'Business record modified by user action',
              })
              refresh()
              flash('Logged: DATA_UPDATE (data CRUD)')
            }}
          >
            Data update
          </Button>
          <Button
            size="small"
            color="warning"
            variant="outlined"
            startIcon={<RestartAltOutlinedIcon />}
            onClick={() => {
              resetUserActivityAuditLogToSeed()
              refresh()
              flash('Audit log reset to built-in A.2.2.1 seed dataset')
            }}
          >
            Reset to seed
          </Button>
        </Stack>
        <Divider />
      </Paper>

      <Alert severity="info">
        <Box component="span" sx={{ fontWeight: 900 }}>Structured logging:</Box> download <Box component="span" sx={{ fontWeight: 900 }}>JSON</Box> (schema <code>frms.user_activity_audit.v1</code>) or{' '}
        <Box component="span" sx={{ fontWeight: 900 }}>syslog-style</Box> lines for SIEM ingestion demos. Production should log structured fields at source (e.g.
        Serilog JSON + syslog UDP).
      </Alert>

      <Paper sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 900, mb: 1 }}>Structured export (filtered set)</Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Button
            size="small"
            variant="outlined"
            startIcon={<DataObjectOutlinedIcon />}
            disabled={filtered.length === 0}
            onClick={() =>
              downloadJsonPretty(
                `${jsonName}.json`,
                userActivityToStructuredJson(filtered, redactPii),
              )
            }
            sx={{ borderColor: 'divider' }}
          >
            JSON
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<TerminalOutlinedIcon />}
            disabled={filtered.length === 0}
            onClick={() =>
              downloadTextFile(
                `${syslogName}.txt`,
                userActivityToSyslogLines(filtered, redactPii),
                'text/plain;charset=utf-8;',
              )
            }
            sx={{ borderColor: 'divider' }}
          >
            Syslog (txt)
          </Button>
        </Stack>
      </Paper>

      <Alert severity="info">
        Tabular exports + <Box component="span" sx={{ fontWeight: 900 }}>periodic report</Box> (print / save as PDF). Redaction toggle applies to grid and these
        downloads when enabled.
      </Alert>

      <Paper sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              Quick range (UTC dates)
            </Typography>
            <Button size="small" variant="outlined" onClick={() => setLastUtcDays(7)} sx={{ borderColor: 'divider' }}>
              Last 7 days
            </Button>
            <Button size="small" variant="outlined" onClick={() => setLastUtcDays(30)} sx={{ borderColor: 'divider' }}>
              Last 30 days
            </Button>
            <Button
              size="small"
              variant="text"
              onClick={() => {
                setFromDate('')
                setToDate('')
              }}
            >
              Clear dates
            </Button>
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} flexWrap="wrap">
            <TextField
              select
              label="A.2.2.1 category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as '' | UserActivityCategory)}
              sx={{ minWidth: 220 }}
            >
              <MenuItem value="">All categories</MenuItem>
              {ALL_CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>
                  {categoryLabel(c)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Outcome"
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value as '' | UserActivityOutcome)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">All outcomes</MenuItem>
              <MenuItem value="Success">Success</MenuItem>
              <MenuItem value="Failure">Failure</MenuItem>
              <MenuItem value="Info">Info</MenuItem>
            </TextField>
            <TextField
              label="From (YYYY-MM-DD)"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              error={Boolean(filterError)}
              sx={{ minWidth: 200 }}
            />
            <TextField
              label="To (YYYY-MM-DD)"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              error={Boolean(filterError)}
              sx={{ minWidth: 200 }}
            />
            <TextField label="User ID contains" value={userId} onChange={(e) => setUserId(e.target.value)} sx={{ minWidth: 200 }} />
            <TextField label="Actor contains" value={actorQ} onChange={(e) => setActorQ(e.target.value)} sx={{ minWidth: 180 }} />
            <TextField label="IP contains" value={ipQ} onChange={(e) => setIpQ(e.target.value)} sx={{ minWidth: 160 }} />
            <TextField
              label="Event / details contains"
              value={eventTypeQ}
              onChange={(e) => setEventTypeQ(e.target.value)}
              sx={{ minWidth: 220 }}
            />
          </Stack>
          {filterError ? <Alert severity="error">{filterError}</Alert> : null}
          <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
            <Button variant="contained" startIcon={<SearchOutlinedIcon />} onClick={onApply}>
              Apply
            </Button>
            <Button variant="outlined" startIcon={<ClearOutlinedIcon />} onClick={onClear} sx={{ borderColor: 'divider' }}>
              Clear
            </Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<PictureAsPdfOutlinedIcon />}
              disabled={exportRows.length === 0}
              onClick={() => void openPeriodicReport()}
            >
              Periodic report (print / PDF)
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadOutlinedIcon />}
              disabled={exportRows.length === 0}
              onClick={() => void exportRowsToExcel(exportRows, 'UserActivityAudit', `${baseName}.xlsx`)}
              sx={{ borderColor: 'divider' }}
            >
              Excel
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadOutlinedIcon />}
              disabled={exportRows.length === 0}
              onClick={() => void exportRowsToCsv(exportRows, `${baseName}.csv`)}
              sx={{ borderColor: 'divider' }}
            >
              CSV
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadOutlinedIcon />}
              disabled={exportRows.length === 0}
              onClick={() => exportRowsToTxt(exportRows, `${baseName}.txt`)}
              sx={{ borderColor: 'divider' }}
            >
              TXT
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadOutlinedIcon />}
              disabled={exportRows.length === 0}
              onClick={() => exportRowsToWordHtml('User activity audit', exportRows, `${baseName}.doc`)}
              sx={{ borderColor: 'divider' }}
            >
              Word
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadOutlinedIcon />}
              disabled={exportRows.length === 0}
              onClick={() => void openPrintableReportWindow('User activity audit', exportRows)}
              sx={{ borderColor: 'divider' }}
            >
              PDF
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: 1.5 }}>
        <Box sx={{ height: 520 }}>
          <DataGrid
            rows={displayRows}
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
