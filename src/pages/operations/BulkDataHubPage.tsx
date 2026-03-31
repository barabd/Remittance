import type { ReactNode } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import TableViewOutlinedIcon from '@mui/icons-material/TableViewOutlined'
import PeopleOutlineOutlinedIcon from '@mui/icons-material/PeopleOutlineOutlined'
import ManageSearchOutlinedIcon from '@mui/icons-material/ManageSearchOutlined'
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useLiveApi } from '../../api/config'
import {
  BULK_ACCEPT,
  BULK_HUB_CARDS,
  BULK_HUB_EVENT,
  loadBulkHubActivity,
  parseSpreadsheetPreview,
  recordBulkHubPreview,
  syncBulkHubActivityFromLive,
  type BulkHubActivityEntry,
  type BulkHubRouteCard,
  type BulkHubTarget,
  type SpreadsheetPreview,
} from '../../state/bulkHubStore'
import { brand } from '../../theme/appTheme'

const ICONS: Record<BulkHubTarget, ReactNode> = {
  exchange_bulk: <CloudUploadOutlinedIcon color="primary" />,
  remittance_search: <ManageSearchOutlinedIcon color="primary" />,
  file_mapping: <TableViewOutlinedIcon color="primary" />,
  admin_bulk: <PeopleOutlineOutlinedIcon color="primary" />,
  unknown: <CloudUploadOutlinedIcon color="disabled" />,
}

const TARGET_LABEL: Record<BulkHubTarget, string> = {
  exchange_bulk: 'Exchange bulk upload',
  remittance_search: 'Remittance search import',
  file_mapping: 'Corporate file mapping',
  admin_bulk: 'Administration bulk',
  unknown: 'Unknown',
}

function cardByTarget(t: BulkHubTarget): BulkHubRouteCard | undefined {
  return BULK_HUB_CARDS.find((c) => c.target === t)
}

export function BulkDataHubPage() {
  const live = useLiveApi()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [target, setTarget] = useState<BulkHubTarget>(BULK_HUB_CARDS[0].target)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<SpreadsheetPreview | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [activity, setActivity] = useState<BulkHubActivityEntry[]>(() => loadBulkHubActivity())
  const [syncError, setSyncError] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)

  const refreshActivity = useCallback(() => setActivity(loadBulkHubActivity()), [])

  useEffect(() => {
    const on = () => refreshActivity()
    window.addEventListener(BULK_HUB_EVENT, on as EventListener)
    return () => window.removeEventListener(BULK_HUB_EVENT, on as EventListener)
  }, [refreshActivity])

  useEffect(() => {
    if (!live) {
      refreshActivity()
      return
    }
    let cancelled = false
    setSyncError(null)
    void syncBulkHubActivityFromLive()
      .then(() => {
        if (!cancelled) refreshActivity()
      })
      .catch((e) => {
        if (!cancelled) setSyncError(e instanceof Error ? e.message : 'Sync failed')
      })
    return () => {
      cancelled = true
    }
  }, [live, refreshActivity])

  async function runParse(f: File) {
    setParseError(null)
    setParsing(true)
    setPreview(null)
    try {
      const p = await parseSpreadsheetPreview(f)
      setPreview(p)
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Parse failed')
      setPreview(null)
    } finally {
      setParsing(false)
    }
  }

  function onPickFile(f: File | null) {
    setFile(f)
    if (f) void runParse(f)
    else {
      setPreview(null)
      setParseError(null)
    }
  }

  const previewCols: GridColDef[] = useMemo(() => {
    if (!preview?.headers.length) return []
    return preview.headers.map((h) => ({
      field: h,
      headerName: h,
      flex: 1,
      minWidth: 100,
    }))
  }, [preview])

  const previewRows = useMemo(() => {
    if (!preview) return []
    return preview.previewRows.map((row, i) => ({ id: `p-${i}`, ...row }))
  }, [preview])

  async function onRecordAndContinue() {
    if (!file || !preview) return
    const card = cardByTarget(target)
    if (!card) return
    setRecording(true)
    setSyncError(null)
    try {
      await recordBulkHubPreview({
        target,
        fileName: file.name,
        rowCount: preview.rowCount,
        columnCount: preview.columnCount,
        sheetName: preview.sheetName,
      })
      refreshActivity()
      navigate(card.to, {
        state: {
          bulkHubOrigin: true,
          bulkHubFileName: file.name,
          bulkHubRowCount: preview.rowCount,
          bulkHubTarget: target,
        },
      })
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Could not record preview')
    } finally {
      setRecording(false)
    }
  }

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
          Bulk data upload hub (#15)
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Drop a spreadsheet to inspect the first sheet (headers + sample rows). Logging a preview stores metadata locally and,
          when the live API is on, in MSSQL via POST /bulk-hub/events. Finish mapping and validation on the target screen.
        </Typography>
      </Box>

      {live ? (
        <Alert severity={syncError ? 'warning' : 'info'}>
          {syncError
            ? `Live API: activity sync issue — ${syncError}. Showing cached/local log.`
            : 'Live API: activity list can sync from GET /bulk-hub/events (frms-ops-api + bulk_hub_event).'}
        </Alert>
      ) : null}

      <Paper variant="outlined" sx={{ p: 2, borderColor: dragOver ? brand.green : 'divider' }}>
        <Typography sx={{ fontWeight: 900, mb: 1 }}>Preview upload</Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems={{ md: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 280 }}>
            <InputLabel id="bulk-target-label">Destination workflow</InputLabel>
            <Select
              labelId="bulk-target-label"
              label="Destination workflow"
              value={target}
              onChange={(e) => setTarget(e.target.value as BulkHubTarget)}
            >
              {BULK_HUB_CARDS.map((c) => (
                <MenuItem key={c.target} value={c.target}>
                  {c.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <input
            ref={fileRef}
            type="file"
            accept={BULK_ACCEPT}
            hidden
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          />
          <Button variant="outlined" onClick={() => fileRef.current?.click()}>
            Choose file
          </Button>
          {file ? (
            <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
              {file.name}
            </Typography>
          ) : null}
          <Button
            size="small"
            disabled={!file}
            onClick={() => {
              onPickFile(null)
              if (fileRef.current) fileRef.current.value = ''
            }}
          >
            Clear
          </Button>
        </Stack>
        <Paper
          variant="outlined"
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const f = e.dataTransfer.files?.[0]
            if (f) onPickFile(f)
          }}
          sx={{
            p: 3,
            textAlign: 'center',
            bgcolor: dragOver ? 'rgba(66,171,72,0.06)' : 'rgba(0,0,0,0.02)',
            borderStyle: 'dashed',
          }}
        >
          <CloudUploadOutlinedIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            Drag & drop .xlsx, .xls, or .csv here
          </Typography>
        </Paper>
        {parsing ? <LinearProgress sx={{ mt: 2 }} /> : null}
        {parseError ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {parseError}
          </Alert>
        ) : null}
        {preview && !parseError ? (
          <Stack spacing={1} sx={{ mt: 2 }}>
            <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
              <Chip size="small" label={`Sheet: ${preview.sheetName}`} />
              <Chip size="small" label={`Rows (data): ${preview.rowCount}`} />
              <Chip size="small" label={`Columns: ${preview.columnCount}`} />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Showing up to {preview.previewRows.length} data rows for review — not full ingestion.
            </Typography>
            <Box sx={{ height: 320 }}>
              <DataGrid
                rows={previewRows}
                columns={previewCols}
                getRowId={(r) => r.id}
                disableRowSelectionOnClick
                density="compact"
                hideFooter
                sx={{ border: 0 }}
              />
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button
                variant="contained"
                startIcon={<PlayArrowOutlinedIcon />}
                disabled={!file || !preview || recording}
                onClick={() => void onRecordAndContinue()}
              >
                Record preview &amp; open target
              </Button>
            </Stack>
          </Stack>
        ) : null}
      </Paper>

      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
        Quick links
      </Typography>
      <Stack spacing={1.5}>
        {BULK_HUB_CARDS.map((c) => (
          <Paper key={c.to} variant="outlined" sx={{ p: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Box sx={{ pt: 0.25 }}>{ICONS[c.target]}</Box>
                <Box>
                  <Typography sx={{ fontWeight: 900 }}>{c.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {c.body}
                  </Typography>
                </Box>
              </Stack>
              <Button variant="contained" component={RouterLink} to={c.to} sx={{ flexShrink: 0 }}>
                Open
              </Button>
            </Stack>
          </Paper>
        ))}
      </Stack>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 900, mb: 1 }}>Recent preview activity</Typography>
        {activity.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No entries yet. Parse a file and use &quot;Record preview &amp; open target&quot;, or sync from the API when live.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {activity.slice(0, 12).map((a) => (
              <Paper key={a.id} variant="outlined" sx={{ p: 1.25, borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary">
                  {a.recordedAt} · {a.id}
                </Typography>
                <Typography variant="body2">
                  <strong>{TARGET_LABEL[a.target]}</strong> — {a.fileName} ({a.rowCount} rows, {a.columnCount} cols)
                  {a.sheetName ? ` · ${a.sheetName}` : ''}
                </Typography>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>
    </Stack>
  )
}
