import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { ApiHttpError } from '../../api/http'
import { useLiveApi } from '../../api/config'
import type {
  BeftnAckApplyResultDto,
  BeftnAckFileDto,
  BeftnAckProfileDto,
  BeftnAckRowDto,
} from '../../api/types'
import {
  liveApplyBeftnAckFile,
  liveListBeftnAckFiles,
  liveListBeftnAckProfiles,
  liveListBeftnAckRows,
  liveParseBeftnAckFile,
} from '../../api/live/client'

type AckRow = {
  id: string
  ackFileId?: string
  lineNo?: number
  batchRef: string
  txnRef: string
  remittanceNo: string
  amount: string
  status: string
  valueDate: string
  parseStatus?: string
  parseMessage?: string
  matchedDisbursementId?: string
  rawLine: string
}

type AckFile = {
  id: string
  fileName: string
  uploadedAt: string
  uploader?: string
  rowCount: number
  status: string
  appliedAt?: string
}

const MAX_UPLOAD_BYTES = 2_000_000

function mapAckRowDto(d: BeftnAckRowDto): AckRow {
  return {
    id: d.id,
    ackFileId: d.ackFileId,
    lineNo: d.lineNo,
    batchRef: d.batchRef ?? '',
    txnRef: d.txnRef ?? '',
    remittanceNo: d.remittanceNo ?? '',
    amount: d.amountBdt ?? '',
    status: d.ackStatus ?? '',
    valueDate: d.valueDate ?? '',
    parseStatus: d.parseStatus,
    parseMessage: d.parseMessage,
    matchedDisbursementId: d.matchedDisbursementId,
    rawLine: d.rawLine,
  }
}

function mapAckFileDto(d: BeftnAckFileDto): AckFile {
  return {
    id: d.id,
    fileName: d.fileName,
    uploadedAt: d.uploadedAt,
    uploader: d.uploader,
    rowCount: d.rowCount,
    status: d.status,
    appliedAt: d.appliedAt,
  }
}

const columns: GridColDef<AckRow>[] = [
  { field: 'lineNo', headerName: 'Line', flex: 0.45, minWidth: 80 },
  { field: 'batchRef', headerName: 'Batch / file ref', flex: 1, minWidth: 130 },
  { field: 'txnRef', headerName: 'Txn ref', flex: 1, minWidth: 130 },
  { field: 'remittanceNo', headerName: 'Remittance no', flex: 1, minWidth: 130 },
  { field: 'amount', headerName: 'Amount', flex: 0.7, minWidth: 100 },
  { field: 'status', headerName: 'Status', flex: 0.6, minWidth: 90 },
  { field: 'valueDate', headerName: 'Value date', flex: 0.7, minWidth: 110 },
  { field: 'parseStatus', headerName: 'Parse state', flex: 0.7, minWidth: 110 },
  { field: 'matchedDisbursementId', headerName: 'Matched disb.', flex: 0.9, minWidth: 130 },
  { field: 'parseMessage', headerName: 'Result', flex: 1.1, minWidth: 180 },
  { field: 'rawLine', headerName: 'Raw', flex: 1.4, minWidth: 200 },
]

const fileColumns: GridColDef<AckFile>[] = [
  { field: 'fileName', headerName: 'File', flex: 1.2, minWidth: 220 },
  { field: 'uploadedAt', headerName: 'Uploaded at', flex: 0.8, minWidth: 140 },
  { field: 'uploader', headerName: 'By', flex: 0.7, minWidth: 100 },
  { field: 'rowCount', headerName: 'Rows', flex: 0.45, minWidth: 80 },
  { field: 'status', headerName: 'Status', flex: 0.6, minWidth: 90 },
  { field: 'appliedAt', headerName: 'Applied at', flex: 0.8, minWidth: 140 },
]

export function BeftnAckProcessingPage() {
  const live = useLiveApi()
  const [files, setFiles] = useState<AckFile[]>([])
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [rows, setRows] = useState<AckRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [unmatchedOnly, setUnmatchedOnly] = useState(false)
  const [profiles, setProfiles] = useState<BeftnAckProfileDto[]>([])
  const [profile, setProfile] = useState('beftn_standard')
  const [strictHeader, setStrictHeader] = useState(true)
  const [applySummary, setApplySummary] = useState<BeftnAckApplyResultDto | null>(null)

  const selectedFile = useMemo(() => files.find((f) => f.id === selectedFileId) ?? null, [files, selectedFileId])
  const canApplyAck = Boolean(selectedFileId) && selectedFile?.status !== 'Applied' && !loading

  const refreshFiles = useCallback(async () => {
    if (!live) return
    const p = await liveListBeftnAckFiles()
    const mapped = p.items.map(mapAckFileDto)
    setFiles(mapped)
    if (!selectedFileId && mapped.length > 0) setSelectedFileId(mapped[0].id)
    if (selectedFileId && !mapped.some((f) => f.id === selectedFileId)) {
      setSelectedFileId(mapped[0]?.id ?? null)
    }
  }, [live, selectedFileId])

  const refreshProfiles = useCallback(async () => {
    if (!live) return
    const p = await liveListBeftnAckProfiles()
    const next = p.items
    setProfiles(next)
    if (next.length > 0 && !next.some((x) => x.id === profile)) {
      setProfile(next[0].id)
    }
  }, [live, profile])

  const refreshRows = useCallback(async () => {
    if (!live || !selectedFileId) return
    const p = await liveListBeftnAckRows(selectedFileId, {
      page: '1',
      pageSize: '500',
      ...(query.trim() ? { q: query.trim() } : {}),
      ...(statusFilter.trim() ? { status: statusFilter.trim() } : {}),
      ...(unmatchedOnly ? { unmatchedOnly: 'true' } : {}),
    })
    setRows(p.items.map(mapAckRowDto))
  }, [live, query, selectedFileId, statusFilter, unmatchedOnly])

  useEffect(() => {
    if (!live) return
    void Promise.resolve()
      .then(() => {
        setLoading(true)
        setError(null)
      })
      .then(() => Promise.all([refreshFiles(), refreshProfiles()]))
      .catch((e) => {
        setError(e instanceof ApiHttpError ? e.message : 'Could not load BEFTN ACK settings/files.')
      })
      .finally(() => setLoading(false))
  }, [live, refreshFiles, refreshProfiles])

  useEffect(() => {
    if (!live || !selectedFileId) return
    void Promise.resolve()
      .then(() => {
        setLoading(true)
        setError(null)
      })
      .then(() => refreshRows())
      .catch((e) => {
        setError(e instanceof ApiHttpError ? e.message : 'Could not load BEFTN ACK rows.')
      })
      .finally(() => setLoading(false))
  }, [live, selectedFileId, query, statusFilter, unmatchedOnly, refreshRows])

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    setError(null)
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!live) {
      setRows([])
      setError('Live API must be enabled for production ACK processing.')
      return
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      setRows([])
      setError('File exceeds 2 MB limit. Split the ACK file and upload in parts.')
      return
    }
    setFileName(f.name)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result ?? '')
        setLoading(true)
        setError(null)
        void liveParseBeftnAckFile({
          fileName: f.name,
          rawText: text,
          uploader: 'Ops',
          profile,
          strictHeader,
        })
          .then(async (res) => {
            setRows(res.rows.map(mapAckRowDto))
            setSelectedFileId(res.file.id)
            setApplySummary(null)
            await refreshFiles()
          })
          .catch((err) => {
            setRows([])
            setError(err instanceof ApiHttpError ? err.message : 'Could not parse/save ACK file on server.')
          })
          .finally(() => setLoading(false))
      } catch {
        setError('Failed to read file.')
        setRows([])
      }
    }
    reader.onerror = () => setError('Failed to read file.')
    reader.readAsText(f)
  }

  function onApplyServerAck() {
    if (!live || !selectedFileId) return
    setLoading(true)
    setError(null)
    setApplySummary(null)
    void liveApplyBeftnAckFile(selectedFileId)
      .then(async (res) => {
        setApplySummary(res)
        await refreshFiles()
        await refreshRows()
      })
      .catch((e) => {
        setError(e instanceof ApiHttpError ? e.message : 'Could not apply ACK file to disbursements.')
      })
      .finally(() => setLoading(false))
  }

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
          BEFTN acknowledgment file processing
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          A.1.3: parse and post BEFTN acknowledgment files with strict header-profile mapping and disbursement status updates.
        </Typography>
      </Box>

      <Alert severity="success">
        Server-side validation is active: strict header templates, row parse states, conflict detection, and controlled posting
        to disbursement workflow.
      </Alert>

      {live ? (
        <Alert severity="info">
          Live API enabled: file parse persists to <code>beftn_ack_file</code>/<code>beftn_ack_row</code> and Apply updates
          disbursement status + audit.
        </Alert>
      ) : (
        <Alert severity="warning">Production mode requires live API. Local preview is disabled on this page.</Alert>
      )}

      <Paper sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" gap={2} flexWrap="wrap">
          <Button variant="contained" component="label" startIcon={<UploadFileOutlinedIcon />}>
            Load acknowledgment file
            <input type="file" accept=".txt,.csv,.dat" hidden onChange={onFile} />
          </Button>
          {live ? (
            <Button
              color="success"
              variant="outlined"
              disabled={!canApplyAck}
              onClick={onApplyServerAck}
            >
              Apply ACK to disbursements
            </Button>
          ) : null}
          {fileName ? (
            <Typography variant="body2" color="text.secondary">
              {fileName} · {rows.length} row(s)
            </Typography>
          ) : null}
          {loading ? <CircularProgress size={20} /> : null}
        </Stack>
        {live ? (
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} sx={{ mt: 1.5 }}>
            <TextField
              select
              size="small"
              label="Header profile"
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              sx={{ minWidth: 220 }}
            >
              {profiles.length > 0 ? (
                profiles.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.id}
                  </MenuItem>
                ))
              ) : (
                <MenuItem value={profile}>{profile}</MenuItem>
              )}
            </TextField>
            <FormControlLabel
              control={<Checkbox checked={strictHeader} onChange={(e) => setStrictHeader(e.target.checked)} />}
              label="Strict header mapping"
            />
          </Stack>
        ) : null}
        {error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : null}
        {applySummary ? (
          <Alert severity="success" sx={{ mt: 2 }}>
            Applied {applySummary.appliedCount}, failed {applySummary.failedCount}, unmatched {applySummary.unmatchedCount},
            conflicts {applySummary.conflictCount}, ignored {applySummary.ignoredCount}.
          </Alert>
        ) : null}
        {live && selectedFile?.status === 'Applied' ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            This ACK file was already applied. Upload a new file to post new status updates.
          </Alert>
        ) : null}
      </Paper>

      {live ? (
        <Paper sx={{ p: 1.5 }}>
          <Typography sx={{ fontWeight: 900, mb: 1 }}>Persisted ACK files</Typography>
          <Box sx={{ height: 220, mb: 1 }}>
            <DataGrid
              rows={files}
              columns={fileColumns}
              getRowId={(r) => r.id}
              rowSelectionModel={{ type: 'include', ids: new Set(selectedFileId ? [selectedFileId] : []) }}
              onRowClick={(p) => setSelectedFileId(String(p.row.id))}
              onRowSelectionModelChange={(model) => {
                const next = (model as any).ids?.values().next().value
                setSelectedFileId(next ? String(next) : null)
              }}
              disableRowSelectionOnClick
              hideFooter
              sx={{
                border: 0,
                '& .MuiDataGrid-columnHeaders': { borderBottom: '1px solid', borderColor: 'divider' },
              }}
            />
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <TextField
              size="small"
              label="Search rows"
              placeholder="Txn ref / remittance / raw"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              sx={{ minWidth: { xs: '100%', sm: 280 } }}
            />
            <TextField
              size="small"
              label="Parse status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              placeholder="Parsed, Applied, Unmatched..."
              sx={{ minWidth: { xs: '100%', sm: 180 } }}
            />
            <FormControlLabel
              control={<Checkbox checked={unmatchedOnly} onChange={(e) => setUnmatchedOnly(e.target.checked)} />}
              label="Unmatched only"
            />
            <Button variant="text" onClick={() => void refreshRows()} disabled={!selectedFile || loading}>
              Refresh rows
            </Button>
          </Stack>
        </Paper>
      ) : null}

      <Paper sx={{ p: 1.5 }}>
        <Box sx={{ height: 440 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            disableRowSelectionOnClick
            initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
            pageSizeOptions={[10, 25, 50]}
            sx={{
              border: 0,
              '& .MuiDataGrid-columnHeaders': { borderBottom: '1px solid', borderColor: 'divider' },
            }}
          />
        </Box>
      </Paper>
    </Stack>
  )
}
