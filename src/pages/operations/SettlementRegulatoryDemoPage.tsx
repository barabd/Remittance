import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useLiveApi } from '../../api/config'
import {
  REGULATORY_PACKAGE_EVENT,
  SETTLEMENT_ANALYTICS_EVENT,
  syncRegulatoryPackagesFromLive,
  syncSettlementAnalyticsFromLive,
} from '../../integrations/settlementRegulatory'
import { brand } from '../../theme/appTheme'
import {
  advanceRegulatoryPackageDemo,
  loadRegulatoryPackages,
  queueNetPositionPackageDemo,
  type RegulatoryPackage,
} from '../../state/regulatoryPackageStore'
import {
  loadBilateralPositions,
  loadSettlementStatistics,
  multilateralSummary,
} from '../../state/settlementDemoStore'

export function SettlementRegulatoryDemoPage() {
  const live = useLiveApi()
  const [tab, setTab] = useState(0)
  const [stats, setStats] = useState(loadSettlementStatistics)
  const [bilateral, setBilateral] = useState(loadBilateralPositions)
  const [packages, setPackages] = useState(loadRegulatoryPackages)
  const [syncError, setSyncError] = useState<string | null>(null)

  const refreshAnalytics = useCallback(() => {
    setStats(loadSettlementStatistics())
    setBilateral(loadBilateralPositions())
  }, [])

  const refreshPk = useCallback(() => {
    setPackages(loadRegulatoryPackages())
  }, [])

  const refreshAll = useCallback(() => {
    refreshAnalytics()
    refreshPk()
  }, [refreshAnalytics, refreshPk])

  useEffect(() => {
    let cancelled = false
    async function pull() {
      if (!live) {
        refreshAll()
        return
      }
      setSyncError(null)
      try {
        await Promise.all([syncSettlementAnalyticsFromLive(), syncRegulatoryPackagesFromLive()])
        if (!cancelled) refreshAll()
      } catch (e) {
        if (!cancelled) {
          setSyncError(e instanceof Error ? e.message : 'Live API sync failed')
          refreshAll()
        }
      }
    }
    void pull()
    return () => {
      cancelled = true
    }
  }, [live, refreshAll])

  useEffect(() => {
    const onReg = () => refreshPk()
    const onSet = () => refreshAnalytics()
    window.addEventListener(REGULATORY_PACKAGE_EVENT, onReg as EventListener)
    window.addEventListener(SETTLEMENT_ANALYTICS_EVENT, onSet as EventListener)
    return () => {
      window.removeEventListener(REGULATORY_PACKAGE_EVENT, onReg as EventListener)
      window.removeEventListener(SETTLEMENT_ANALYTICS_EVENT, onSet as EventListener)
    }
  }, [refreshPk, refreshAnalytics])

  const multi = useMemo(() => multilateralSummary(bilateral), [bilateral])

  const chartData = stats.map((s) => ({
    name: s.day,
    'Gross inflow (m BDT)': Math.round(s.grossInBdt / 1e6),
    'Net settlement (m BDT)': Math.round(s.netSettlementBdt / 1e6),
  }))

  const handleAdvance = useCallback(
    (id: string) => {
      void advanceRegulatoryPackageDemo(id).then(() => refreshPk())
    },
    [refreshPk],
  )

  const pkgCols: GridColDef<RegulatoryPackage>[] = useMemo(
    () => [
      { field: 'title', headerName: 'Package', flex: 1.2, minWidth: 200 },
      { field: 'period', headerName: 'Period', flex: 0.6, minWidth: 100 },
      { field: 'summary', headerName: 'Summary', flex: 1.4, minWidth: 220 },
      { field: 'destination', headerName: 'Destination', flex: 1, minWidth: 200 },
      {
        field: 'status',
        headerName: 'Status',
        flex: 0.7,
        minWidth: 120,
        renderCell: (p) => (
          <Chip size="small" label={p.value} sx={{ bgcolor: 'rgba(0,0,0,0.06)', color: brand.black }} />
        ),
      },
      {
        field: 'createdAt',
        headerName: 'Created',
        flex: 0.9,
        minWidth: 150,
        renderCell: (p) => {
          if (!p.value) return ''
          const str = String(p.value)
          if (str.length === 16) {
            // Append Z to parse the backend non-annotated database string as UTC.
            const d = new Date(str.replace(' ', 'T') + ':00Z')
            if (!isNaN(d.getTime())) {
              const pad = (n: number) => String(n).padStart(2, '0')
              return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
            }
          }
          return str
        },
      },
      {
        field: 'id',
        headerName: 'Workflow',
        flex: 0.8,
        minWidth: 140,
        sortable: false,
        renderCell: (p) => (
          <Button size="small" variant="outlined" onClick={() => handleAdvance(String(p.value))}>
            Advance
          </Button>
        ),
      },
    ],
    [handleAdvance],
  )

  function generatePackage() {
    const totalNet = bilateral.reduce((a, b) => a + b.netPositionBdt, 0)
    void queueNetPositionPackageDemo(
      new Date().toISOString().slice(0, 10),
      `Net aggregate ৳${(totalNet / 1e6).toFixed(1)}m across ${bilateral.length} counterparties.`,
    ).then(() => refreshPk())
  }

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
          Settlement statistics & regulatory reporting
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          #31 (settlement analytics) and #32 (net-position packages for supervisors). No live central-bank
          connectivity. With <code>VITE_USE_LIVE_API=true</code>, chart and bilateral rows sync from Java (
          <code>/settlement/*</code>); packages use <code>/regulatory/packages</code> and browser cache.
        </Typography>
      </Box>

      {live ? (
        <Alert severity="info">
          Live API: opening this page runs GET <code>/settlement/week-stats</code>,{' '}
          <code>/settlement/bilateral-positions</code>, and <code>/regulatory/packages</code>, then refreshes local cache.
        </Alert>
      ) : null}
      {syncError ? (
        <Alert severity="warning" onClose={() => setSyncError(null)}>
          {syncError}
        </Alert>
      ) : null}

      <Paper sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 900, mb: 1 }}>How this maps to the UI</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>Area</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>What you see</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>How to drive it</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Settlement analytics tab</TableCell>
              <TableCell>Weekly bar chart + bilateral table + multilateral roll-up</TableCell>
              <TableCell>
                Seeded in browser; with live API, data comes from MSSQL via GET <code>/settlement/week-stats</code> and{' '}
                <code>/settlement/bilateral-positions</code>.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Regulatory packages tab</TableCell>
              <TableCell>Grid of queued reporting packages</TableCell>
              <TableCell>
                Click <strong>Generate net-position package</strong> to append a draft row, then <strong>Advance</strong> per
                row for Draft → Queued → Sent → Ack.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ px: 2, pt: 1 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Settlement analytics" />
          <Tab label="Regulatory packages" />
        </Tabs>
      </Paper>

      {tab === 0 ? (
        <Stack spacing={2}>
          <Paper
            sx={{
              p: 3,
              height: 400,
              background: 'linear-gradient(135deg, #ffffff 0%, #fbfcfd 100%)',
              border: '1px solid rgba(0,0,0,0.05)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 950, color: brand.black, letterSpacing: -0.5 }}>
                  Weekly Settlement Performance
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Comparison between gross inflows and final net positions in m BDT
                </Typography>
              </Box>
              <Stack direction="row" gap={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: brand.green }} />
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>Gross Inflow</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: '#374151' }} />
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>Net Settlement</Typography>
                </Box>
              </Stack>
            </Stack>

            <Box sx={{ height: 'calc(100% - 60px)' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={6}>

                  <defs>
                    <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={brand.green} stopOpacity={1} />
                      <stop offset="95%" stopColor={brand.greenBright} stopOpacity={0.8} />
                    </linearGradient>
                    <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#374151" stopOpacity={1} />
                      <stop offset="95%" stopColor="#111827" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fontWeight: 600, fill: brand.gray600 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 500, fill: brand.gray600 }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      padding: '12px',
                    }}
                    itemStyle={{ fontWeight: 700, fontSize: '13px' }}
                  />
                  <Bar
                    dataKey="Gross inflow (m BDT)"
                    name="Gross Inflow"
                    fill="url(#colorGross)"
                    radius={[10, 10, 0, 0]}
                    barSize={64}
                  />
                  <Bar
                    dataKey="Net settlement (m BDT)"
                    name="Net Settlement"
                    fill="url(#colorNet)"
                    radius={[10, 10, 0, 0]}
                    barSize={64}
                  />

                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>


          <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
            <Paper sx={{ p: 2, flex: 1, border: '1px solid rgba(0,0,0,0.05)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1.5, color: brand.green }}>
                Bilateral / Nostro-style Positions
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                    <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Counterparty</TableCell>
                    <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Corridor</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, py: 1.5 }}>Net ৳</TableCell>
                    <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Bucket</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bilateral.map((b) => (
                    <TableRow key={b.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell sx={{ fontWeight: 500 }}>{b.counterparty}</TableCell>
                      <TableCell>{b.corridor}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: b.netPositionBdt < 0 ? '#d32f2f' : 'inherit' }}>
                        {(b.netPositionBdt / 1e6).toFixed(1)}m
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={b.multilateralBucket}
                          sx={{
                            fontSize: '10px',
                            height: 20,
                            bgcolor: 'rgba(0,0,0,0.04)',
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>

            <Paper sx={{ p: 2, flex: 0.5 }}>
              <Typography sx={{ fontWeight: 900, mb: 1 }}>Multilateral summary</Typography>
              <Stack spacing={1}>
                {multi.map((m) => (
                  <Stack key={m.bucket} direction="row" justifyContent="space-between">
                    <Typography variant="body2">{m.bucket}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      {(m.netBdt / 1e6).toFixed(1)}m ৳
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          </Stack>
        </Stack>
      ) : (
        <Paper sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
            <Button variant="contained" onClick={generatePackage}>
              Generate net-position package
            </Button>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Use Advance to walk Draft → Queued → Sent → Ack.
            </Typography>
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ height: 420 }}>
            <DataGrid
              rows={packages}
              columns={pkgCols}
              getRowId={(r) => r.id}
              disableRowSelectionOnClick
              initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
              pageSizeOptions={[10, 25]}
              sx={{ border: 0 }}
            />
          </Box>
        </Paper>
      )}
    </Stack>
  )
}
