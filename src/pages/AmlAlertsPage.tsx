import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Snackbar,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useLiveApi } from '../api/config'
import { syncAmlFromLive } from '../integrations/aml/amlRepository'
import { pushMlaSettingsToLive, syncMlaSettingsFromLive } from '../integrations/mlaSettings/mlaSettingsRepository'
import { brand } from '../theme/appTheme'
import { ApiHttpError } from '../api/http'
import {
  AML_ALERTS_CHANGED_EVENT,
  loadAmlAlerts,
  type AmlAlertRow,
  updateAmlAlertStatus,
} from '../state/amlAlertsStore'
import {
  getScreeningDemoMode,
  SCREENING_SETTINGS_EVENT,
  setScreeningDemoMode,
  type ScreeningDemoMode,
} from '../state/screeningSettingsStore'
import { loadAmlComplianceSettings } from '../state/amlComplianceSettingsStore'
import { createCase } from '../state/caseStore'

export function AmlAlertsPage() {
  const live = useLiveApi()
  const [rows, setRows] = useState<AmlAlertRow[]>(() => loadAmlAlerts())
  const [screenMode, setScreenMode] = useState<ScreeningDemoMode>(() => getScreeningDemoMode())
  const [apiReady, setApiReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'All' | AmlAlertRow['status']>('All')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creatingCase, setCreatingCase] = useState(false)
  const [caseCreatedMessage, setCaseCreatedMessage] = useState<string | null>(null)
  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId])
  const filteredRows = useMemo(() => {
    return statusFilter === 'All' ? rows : rows.filter((r) => r.status === statusFilter)
  }, [rows, statusFilter])

  useEffect(() => {
    if (!selectedId) return
    if (!filteredRows.some((r) => r.id === selectedId)) {
      setSelectedId(null)
    }
  }, [filteredRows, selectedId])

  const refresh = useCallback(() => setRows(loadAmlAlerts()), [])

  useEffect(() => {
    if (!live) return
    let cancelled = false
    void Promise.resolve()
      .then(() => {
        if (!cancelled) {
          setApiReady(false)
          setError(null)
        }
      })
      .then(() => Promise.all([syncAmlFromLive(), syncMlaSettingsFromLive()]))
      .then(() => {
        if (!cancelled) {
          setApiReady(true)
          setScreenMode(getScreeningDemoMode())
          refresh()
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setApiReady(false)
          setError(e instanceof ApiHttpError ? e.message : 'Could not sync AML settings/alerts from live API.')
          refresh()
        }
      })
    return () => {
      cancelled = true
    }
  }, [live, refresh])

  async function onSetStatus(next: AmlAlertRow['status']) {
    if (!selected) return
    setError(null)
    try {
      if (live && apiReady) {
        await updateAmlAlertStatus(selected.id, next)
      } else {
        // Fallback for demo mode: update via the local API facade
        await updateAmlAlertStatus(selected.id, next)
      }
      refresh()
    } catch (e) {
      setError(e instanceof ApiHttpError ? e.message : 'Could not update status locally or on remote.')
    }
  }

  async function onCreateCase() {
    if (!selected || selected.match !== 'Possible') return
    setCreatingCase(true)
    setError(null)
    try {
      const created = await createCase({
        title: `AML alert investigation: ${selected.remittanceNo}`,
        source: 'AML',
        ref: selected.remittanceNo,
        subject: selected.subjectHint,
        priority: selected.score >= 85 ? 'High' : 'Medium',
        status: 'Open',
        assignee: 'Compliance-01',
        note: `Alert ${selected.id}, list=${selected.list}, score=${selected.score}`,
      })
      setCaseCreatedMessage(`Case created: ${created.id}`)
      await onSetStatus('Investigating')
    } catch (e) {
      setError(e instanceof ApiHttpError ? e.message : 'Could not create investigation case.')
    } finally {
      setCreatingCase(false)
    }
  }

  useEffect(() => {
    const on = () => refresh()
    window.addEventListener(AML_ALERTS_CHANGED_EVENT, on as EventListener)
    return () => window.removeEventListener(AML_ALERTS_CHANGED_EVENT, on as EventListener)
  }, [refresh])

  useEffect(() => {
    const on = () => setScreenMode(getScreeningDemoMode())
    window.addEventListener(SCREENING_SETTINGS_EVENT, on as EventListener)
    return () => window.removeEventListener(SCREENING_SETTINGS_EVENT, on as EventListener)
  }, [])

  const columns: GridColDef<AmlAlertRow>[] = [
    { field: 'remittanceNo', headerName: 'Remittance No', flex: 1, minWidth: 170 },
    { field: 'screenedAt', headerName: 'Screened', flex: 1, minWidth: 160 },
    { field: 'list', headerName: 'List', flex: 0.7, minWidth: 100 },
    {
      field: 'subjectHint',
      headerName: 'Hint',
      flex: 1,
      minWidth: 160,
      valueGetter: (_v, row) => row.subjectHint ?? '—',
    },
    {
      field: 'match',
      headerName: 'Match',
      flex: 0.7,
      minWidth: 100,
      renderCell: (params) => (
        <Chip
          size="small"
          label={params.value}
          sx={{
            bgcolor: params.value === 'Possible' ? 'rgba(0,0,0,0.08)' : 'rgba(66,171,72,0.12)',
            color: params.value === 'Possible' ? brand.black : brand.green,
          }}
        />
      ),
    },
    { field: 'score', headerName: 'Score', type: 'number', flex: 0.6, minWidth: 90 },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.8,
      minWidth: 120,
      renderCell: (params) => {
        const val = params.value as AmlAlertRow['status']
        const colors: Record<string, { bg: string; fg: string }> = {
          Investigating: { bg: 'rgba(237, 108, 2, 0.12)', fg: '#ed6c02' },
          Resolved: { bg: 'rgba(66, 171, 72, 0.12)', fg: brand.green },
          'False Positive': { bg: 'rgba(0,0,0,0.06)', fg: 'text.secondary' },
          Open: { bg: 'rgba(66, 171, 72, 0.12)', fg: brand.green },
        }
        const c = colors[val] || { bg: 'rgba(0,0,0,0.06)', fg: brand.black }
        return (
          <Chip
            size="small"
            label={val}
            sx={{ bgcolor: c.bg, color: c.fg, fontWeight: 700 }}
          />
        )
      },
    },
  ]

  const actionRowStatusDisabled = !selected || (live && !apiReady)

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
            AML / Screening Alerts
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Review possible matches. Remittance Search runs screening by the mode below.
          </Typography>
        </Box>
        <Stack alignItems={{ xs: 'stretch', sm: 'flex-end' }} gap={1.5} sx={{ minWidth: { sm: 280 } }}>
          <FormControl size="small" fullWidth>
            <InputLabel id="screening-mode-label">Screening mode</InputLabel>
            <Select
              labelId="screening-mode-label"
              label="Screening mode"
              value={screenMode}
              disabled={live && !apiReady}
              onChange={(e) => {
                const v = e.target.value as ScreeningDemoMode
                setScreeningDemoMode(v)
                setScreenMode(v)
                if (live && apiReady) {
                  const next = { ...loadAmlComplianceSettings(), screeningMode: v }
                  void pushMlaSettingsToLive(next).catch((err) => {
                    setError(err instanceof ApiHttpError ? err.message : 'Could not save screening mode to live API.')
                  })
                }
              }}
            >
              <MenuItem value="keywords">Local keyword rules</MenuItem>
              <MenuItem value="mock_vendor_api">Mock bank screening API</MenuItem>
            </Select>
          </FormControl>
          <TextField
            select
            size="small"
            label="Alert status"
            value={statusFilter}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setStatusFilter(e.target.value as 'All' | AmlAlertRow['status'])
            }
          >
            <MenuItem value="All">All Statuses</MenuItem>
            <MenuItem value="Open">Open Alerts</MenuItem>
            <MenuItem value="Investigating">Investigation in Progress</MenuItem>
            <MenuItem value="Resolved">Resolved / Closed</MenuItem>
            <MenuItem value="False Positive">False Positives</MenuItem>
          </TextField>
          <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="flex-end">
            <Button
              variant="outlined"
              size="small"
              onClick={() => void onSetStatus('Investigating')}
              disabled={actionRowStatusDisabled || selected?.status === 'Investigating'}
            >
              Investigate
            </Button>
            <Button
              variant="outlined"
              size="small"
              color="success"
              onClick={() => void onSetStatus('Resolved')}
              disabled={actionRowStatusDisabled || selected?.status === 'Resolved'}
            >
              Resolve
            </Button>
            <Button
              variant="outlined"
              size="small"
              color="error"
              onClick={() => void onSetStatus('False Positive')}
              disabled={actionRowStatusDisabled || selected?.status === 'False Positive'}
            >
              False Positive
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<VisibilityOutlinedIcon />}
              disabled={actionRowStatusDisabled || selected?.match !== 'Possible' || creatingCase}
              onClick={() => void onCreateCase()}
            >
              {creatingCase ? 'Escalate to Case…' : 'Create Case'}
            </Button>
          </Stack>
        </Stack>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {live ? (
        apiReady ? (
          <Alert severity="success">
            Live API connected. Alert status updates and screening-mode changes persist to backend and database.
          </Alert>
        ) : (
          <Alert severity="error">
            Live API is configured but currently unreachable. Production actions are locked until connectivity is restored.
          </Alert>
        )
      ) : (
        <Alert severity="warning">Live API is off. This page is in read-only demo mode for production actions.</Alert>
      )}

      <Paper sx={{ p: 1.5 }}>
        <Box sx={{ height: 460 }}>
          <DataGrid
            rows={filteredRows}
            columns={columns}
            disableRowSelectionOnClick
            getRowId={(r) => r.id}
            rowSelectionModel={{ type: 'include', ids: new Set(selectedId ? [selectedId] : []) }}
            onRowSelectionModelChange={(model: any) => {
              const next = model.ids?.values().next().value
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

      <Snackbar
        open={Boolean(caseCreatedMessage)}
        autoHideDuration={4000}
        onClose={() => setCaseCreatedMessage(null)}
        message={caseCreatedMessage ?? ''}
      />
    </Stack>
  )
}
