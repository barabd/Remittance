import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined'
import FilterListOutlinedIcon from '@mui/icons-material/FilterListOutlined'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  CASE_PRIORITIES,
  CASE_SOURCES,
  isRemittanceRef,
} from '../../integrations/investigationCases/constants'
import { useInvestigationCasesRefresh } from '../../hooks/useInvestigationCasesRefresh'
import {
  addCaseNote,
  createCase,
  loadCases,
  setCaseStatus,
  syncInvestigationCasesFromLive,
  type CaseSource,
  type InvestigationCase,
} from '../../state/caseStore'
import { brand } from '../../theme/appTheme'

export function InvestigationCasesPage() {
  const [rows, , apiMeta] = useInvestigationCasesRefresh(loadCases)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId])

  const [filterQuery, setFilterQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'' | InvestigationCase['status']>('')
  const [filterSource, setFilterSource] = useState<'' | CaseSource>('')
  const [filterPriority, setFilterPriority] = useState<'' | InvestigationCase['priority']>('')
  const [filterAssignee, setFilterAssignee] = useState('')

  const filteredRows = useMemo(() => {
    const q = filterQuery.trim().toLowerCase()
    return rows.filter((r) => {
      if (filterStatus && r.status !== filterStatus) return false
      if (filterSource && r.source !== filterSource) return false
      if (filterPriority && r.priority !== filterPriority) return false
      if (filterAssignee.trim() && !r.assignee.toLowerCase().includes(filterAssignee.trim().toLowerCase()))
        return false
      if (!q) return true
      return (
        r.id.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        (r.ref?.toLowerCase().includes(q) ?? false) ||
        (r.subject?.toLowerCase().includes(q) ?? false) ||
        r.assignee.toLowerCase().includes(q)
      )
    })
  }, [rows, filterQuery, filterStatus, filterSource, filterPriority, filterAssignee])

  const [newOpen, setNewOpen] = useState(false)
  const [newSubmitting, setNewSubmitting] = useState(false)
  const [newError, setNewError] = useState<string | null>(null)
  const [newForm, setNewForm] = useState({
    title: '',
    source: 'Operational' as InvestigationCase['source'],
    ref: '',
    subject: '',
    priority: 'Medium' as InvestigationCase['priority'],
    assignee: 'Compliance-01',
    note: '',
  })
  const [noteText, setNoteText] = useState('')

  function openNewCase() {
    setNewForm({
      title: '',
      source: 'Operational',
      ref: '',
      subject: '',
      priority: 'Medium',
      assignee: 'Compliance-01',
      note: '',
    })
    setNewError(null)
    setNewOpen(true)
  }

  async function submitNewCase() {
    if (newSubmitting) return

    const title = newForm.title.trim()
    const assignee = newForm.assignee.trim()
    const ref = newForm.ref.trim()
    const subject = newForm.subject.trim()
    const note = newForm.note.trim()

    if (!title) {
      setNewError('Title is required.')
      return
    }

    setNewSubmitting(true)
    setNewError(null)
    try {
      const c = await createCase({
        title,
        source: newForm.source,
        ref: ref || undefined,
        subject: subject || undefined,
        priority: newForm.priority,
        status: 'Open',
        assignee: assignee || 'Compliance-01',
        note: note || undefined,
      })

      // In live mode, some backends normalize fields; reload list to avoid stale UI snapshots.
      await syncInvestigationCasesFromLive().catch(() => undefined)
      setNewOpen(false)
      setSelectedId(c.id)
    } catch (e) {
      setNewError(e instanceof Error ? e.message : 'Could not create case')
    } finally {
      setNewSubmitting(false)
    }
  }

  function clearFilters() {
    setFilterQuery('')
    setFilterStatus('')
    setFilterSource('')
    setFilterPriority('')
    setFilterAssignee('')
  }

  const hasActiveFilters =
    Boolean(filterQuery.trim()) ||
    Boolean(filterStatus) ||
    Boolean(filterSource) ||
    Boolean(filterPriority) ||
    Boolean(filterAssignee.trim())

  const remittanceSearchHref = (ref: string) =>
    `/remittance/search?remittanceNo=${encodeURIComponent(ref.trim())}`

  const cols: GridColDef<InvestigationCase>[] = [
    { field: 'id', headerName: 'Case', flex: 0.7, minWidth: 130 },
    { field: 'title', headerName: 'Title', flex: 1.4, minWidth: 220 },
    { field: 'source', headerName: 'Source', flex: 0.6, minWidth: 120 },
    {
      field: 'ref',
      headerName: 'Ref',
      flex: 0.8,
      minWidth: 150,
      renderCell: (p) => {
        const ref = p.row.ref
        if (!ref?.trim()) return '—'
        if (isRemittanceRef(ref)) {
          return (
            <Link
              component={RouterLink}
              to={remittanceSearchHref(ref)}
              underline="hover"
              sx={{ fontWeight: 600, color: brand.green }}
              onClick={(e) => e.stopPropagation()}
            >
              {ref}
            </Link>
          )
        }
        return ref
      },
    },
    {
      field: 'priority',
      headerName: 'Priority',
      flex: 0.6,
      minWidth: 110,
      renderCell: (p) => {
        const pr = p.value as InvestigationCase['priority']
        const tone =
          pr === 'High'
            ? { bg: 'rgba(180,0,0,0.08)', fg: '#8b0000' }
            : pr === 'Medium'
              ? { bg: 'rgba(0,0,0,0.06)', fg: brand.black }
              : { bg: 'rgba(66,171,72,0.1)', fg: brand.green }
        return <Chip size="small" label={pr} sx={{ bgcolor: tone.bg, color: tone.fg }} />
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.7,
      minWidth: 140,
      renderCell: (p) => (
        <Chip
          size="small"
          label={p.value}
          sx={{
            bgcolor: p.value === 'Closed' ? 'rgba(66,171,72,0.14)' : 'rgba(0,0,0,0.06)',
            color: p.value === 'Closed' ? brand.green : brand.black,
          }}
        />
      ),
    },
    { field: 'assignee', headerName: 'Assignee', flex: 0.8, minWidth: 140 },
    { field: 'createdAt', headerName: 'Created', flex: 0.8, minWidth: 140 },
  ]

  return (
    <Stack spacing={2.5}>
      {apiMeta.live ? (
        <Alert severity={apiMeta.lastError ? 'warning' : 'info'}>
          {apiMeta.lastError
            ? `Live API: could not refresh cases — ${apiMeta.lastError}. Showing cached/local data.`
            : 'Live API: cases loaded from GET /investigation-cases (Java `frms-ops-api` + MSSQL).'}
        </Alert>
      ) : null}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
            Investigation cases
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Case workflow for AML alerts, reconciliation exceptions, and operational returns. Filter the grid, open
            remittance refs in Search & Tracking, and use structured fields when creating cases.
          </Typography>
        </Box>
        <Button id="btn-new-case" variant="contained" onClick={openNewCase}>
          New case
        </Button>
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.5 }}>
          <FilterListOutlinedIcon sx={{ color: 'text.secondary', fontSize: 22 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            Filters
          </Typography>
          {hasActiveFilters ? (
            <Button size="small" onClick={clearFilters} sx={{ ml: { sm: 'auto' } }}>
              Clear all
            </Button>
          ) : null}
        </Stack>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          flexWrap="wrap"
          useFlexGap
          sx={{ alignItems: { md: 'flex-start' } }}
        >
          <TextField
            size="small"
            label="Search"
            placeholder="Case ID, title, ref, subject, assignee"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            sx={{ minWidth: { md: 240 }, flex: { md: '1 1 220px' } }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="ic-filter-status">Status</InputLabel>
            <Select
              labelId="ic-filter-status"
              label="Status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Open">Open</MenuItem>
              <MenuItem value="Investigating">Investigating</MenuItem>
              <MenuItem value="Closed">Closed</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="ic-filter-source">Source</InputLabel>
            <Select
              labelId="ic-filter-source"
              label="Source"
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value as typeof filterSource)}
            >
              <MenuItem value="">All</MenuItem>
              {CASE_SOURCES.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="ic-filter-priority">Priority</InputLabel>
            <Select
              labelId="ic-filter-priority"
              label="Priority"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as typeof filterPriority)}
            >
              <MenuItem value="">All</MenuItem>
              {CASE_PRIORITIES.map((p) => (
                <MenuItem key={p} value={p}>
                  {p}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="Assignee contains"
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            sx={{ minWidth: { md: 160 } }}
          />
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Showing {filteredRows.length} of {rows.length} case{rows.length === 1 ? '' : 's'}
        </Typography>
      </Paper>

      <Paper sx={{ p: 1.5 }}>
        <Box sx={{ height: 440 }}>
          <DataGrid
            rows={filteredRows}
            columns={cols}
            getRowId={(r) => r.id}
            disableRowSelectionOnClick
            onRowClick={(p) => setSelectedId(String(p.row.id))}
            initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
            pageSizeOptions={[10, 25, 50]}
            sx={{ border: 0 }}
          />
        </Box>
      </Paper>

      {!selected ? (
        <Alert severity="info">Select a case to view and add notes.</Alert>
      ) : (
        <Paper sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} gap={2} justifyContent="space-between">
            <Box>
              <Typography sx={{ fontWeight: 950 }}>{selected.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {selected.source} · {selected.ref ?? '—'} · Assignee: {selected.assignee}
              </Typography>
              {selected.ref && isRemittanceRef(selected.ref) ? (
                <Button
                  size="small"
                  component={RouterLink}
                  to={remittanceSearchHref(selected.ref)}
                  endIcon={<OpenInNewOutlinedIcon sx={{ fontSize: 18 }} />}
                  sx={{ mt: 1, alignSelf: 'flex-start' }}
                >
                  Open remittance in Search &amp; Tracking
                </Button>
              ) : null}
            </Box>
            <Stack direction="row" gap={1} flexWrap="wrap">
              <Button
                size="small"
                variant="outlined"
                onClick={() => void setCaseStatus(selected.id, 'Open')}
              >
                Open
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => void setCaseStatus(selected.id, 'Investigating')}
              >
                Investigating
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={() => void setCaseStatus(selected.id, 'Closed')}
              >
                Close
              </Button>
            </Stack>
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Add note"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <Button
              variant="contained"
              onClick={() => {
                if (!noteText.trim()) return
                void addCaseNote(selected.id, 'Analyst', noteText.trim()).then(() => setNoteText(''))
              }}
            >
              Add
            </Button>
          </Stack>
          <Stack spacing={1} sx={{ mt: 2 }}>
            {selected.notes.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No notes.
              </Typography>
            ) : (
              selected.notes.map((n, idx) => (
                <Paper key={`${n.at}-${idx}`} variant="outlined" sx={{ p: 1.25, borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary">
                    {n.at} · {n.by}
                  </Typography>
                  <Typography variant="body2">{n.text}</Typography>
                </Paper>
              ))
            )}
          </Stack>
        </Paper>
      )}

      <Dialog open={newOpen} onClose={() => !newSubmitting && setNewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New case</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            {newError ? (
              <Alert severity="error" sx={{ mb: 1 }}>
                {newError}
              </Alert>
            ) : null}
            <TextField
              id="ic-new-title"
              label="Title"
              value={newForm.title}
              onChange={(e) => setNewForm((s) => ({ ...s, title: e.target.value }))}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel id="ic-new-source">Source</InputLabel>
              <Select
                labelId="ic-new-source"
                label="Source"
                value={newForm.source}
                onChange={(e) => setNewForm((s) => ({ ...s, source: e.target.value as CaseSource }))}
              >
                {CASE_SOURCES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              id="ic-new-ref"
              label="Reference (e.g. remittance no.)"
              value={newForm.ref}
              onChange={(e) => setNewForm((s) => ({ ...s, ref: e.target.value }))}
              fullWidth
              helperText={
                newForm.ref.trim() && isRemittanceRef(newForm.ref)
                  ? 'Will link to Search & Tracking from the grid and detail panel.'
                  : undefined
              }
            />
            <TextField
              id="ic-new-subject"
              label="Subject (customer)"
              value={newForm.subject}
              onChange={(e) => setNewForm((s) => ({ ...s, subject: e.target.value }))}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel id="ic-new-priority">Priority</InputLabel>
              <Select
                labelId="ic-new-priority"
                label="Priority"
                value={newForm.priority}
                onChange={(e) =>
                    setNewForm((s) => ({ ...s, priority: e.target.value as InvestigationCase['priority'] }))
                }
              >
                {CASE_PRIORITIES.map((p) => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              id="ic-new-assignee"
              label="Assignee"
              value={newForm.assignee}
              onChange={(e) => setNewForm((s) => ({ ...s, assignee: e.target.value }))}
              fullWidth
            />
            <TextField
              id="ic-new-note"
              label="Initial note"
              value={newForm.note}
              onChange={(e) => setNewForm((s) => ({ ...s, note: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewOpen(false)} disabled={newSubmitting}>
            Cancel
          </Button>
          <Button
            id="btn-create-case-submit"
            variant="contained"
            disabled={newSubmitting}
            onClick={() => {
              void submitNewCase()
            }}
          >
            {newSubmitting ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
