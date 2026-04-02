import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { useEffect, useMemo, useState } from 'react'
import {
  BFIU_REPORT_CHANGED_EVENT,
  loadBfiuReports,
  updateBfiuReportStatus,
  type BfiuReport,
} from '../../state/bfiuReportingStore'
import { brand } from '../../theme/appTheme'

export function BfiuReportingPage() {
  const [reports, setReports] = useState(loadBfiuReports)
  const [tab, setTab] = useState<'ALL' | 'CTR' | 'STR'>('ALL')

  useEffect(() => {
    const sync = () => setReports(loadBfiuReports())
    window.addEventListener(BFIU_REPORT_CHANGED_EVENT, sync as EventListener)
    return () => window.removeEventListener(BFIU_REPORT_CHANGED_EVENT, sync as EventListener)
  }, [])

  const filtered = useMemo(() => {
    if (tab === 'ALL') return reports
    return reports.filter((r) => r.reportType === tab)
  }, [reports, tab])

  const columns: GridColDef<BfiuReport>[] = [
    { field: 'id', headerName: 'Report ID', width: 120 },
    {
      field: 'reportedAt',
      headerName: 'Date',
      width: 180,
      valueFormatter: (p) => (p as string).slice(0, 16).replace('T', ' '),
    },
    {
      field: 'reportType',
      headerName: 'Type',
      width: 100,
      renderCell: (p) => (
        <Chip
          label={p.value as string}
          size="small"
          sx={{ fontWeight: 700, bgcolor: p.value === 'STR' ? 'error.light' : 'info.light' }}
        />
      ),
    },
    { field: 'remittanceNo', headerName: 'Remittance No.', width: 150 },
    {
      field: 'amountBdt',
      headerName: 'Amount (BDT)',
      width: 150,
      valueFormatter: (p) => Number(p).toLocaleString(),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (p) => (
        <Chip
          label={p.value as string}
          size="small"
          variant="outlined"
          color={p.value === 'Reported' ? 'success' : p.value === 'Pending' ? 'warning' : 'default'}
        />
      ),
    },
    { field: 'reason', headerName: 'Reason / Alert Trigger', flex: 1, minWidth: 250 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      renderCell: (p) => (
        <Stack direction="row" spacing={1}>
          {p.row.status !== 'Reported' && (
            <Button
              size="small"
              variant="text"
              onClick={() => updateBfiuReportStatus(p.row.id, 'Reported')}
            >
              Mark Reported
            </Button>
          )}
        </Stack>
      ),
    },
  ]

  return (
    <Stack spacing={2.5}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
            BFIU reporting (STR/CTR) — regulatory compliance
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Bangladesh Financial Intelligence Unit (BFIU) standard reporting.
            STR: Suspicious Transaction Report. CTR: Cash Transaction Report (threshold: 1,000,000 BDT cash).
          </Typography>
        </Box>
        <Button variant="contained" sx={{ bgcolor: brand.green }} onClick={() => alert('Exporting GoAML XML package for BFIU submission...')}>
          Export XML package
        </Button>
      </Box>

      <Alert severity="info" variant="outlined">
        Automatic STR flagging is enabled based on AML/Sanctions hits. CTR flagging occurs during single entry or bulk processing when BDT equivalent exceeds 1,000,000 in cash.
      </Alert>

      <Paper sx={{ p: 0 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab value="ALL" label="All Reports" />
          <Tab value="CTR" label="Cash Transaction Reports (CTR)" />
          <Tab value="STR" label="Suspicious Transaction Reports (STR)" />
        </Tabs>
        <Box sx={{ height: 500, width: '100%' }}>
          <DataGrid
            rows={filtered}
            columns={columns}
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            disableRowSelectionOnClick
            sx={{ border: 0 }}
          />
        </Box>
      </Paper>
    </Stack>
  )
}
