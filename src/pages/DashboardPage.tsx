import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { brand } from '../theme/appTheme'
import { useLiveApi } from '../api/config'
import {
  getMastersDashboardCounts,
  MASTERS_CHANGED_EVENT,
} from '../state/mastersStore'
import {
  loadOpsMetrics,
  OPS_METRICS_EVENT,
  worklistTransactionTotal,
} from '../state/opsMetricsStore'
import { AML_ALERTS_CHANGED_EVENT, openAmlAlertCount } from '../state/amlAlertsStore'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const volumeData = [
  { day: 'Mon', tx: 120, flagged: 6 },
  { day: 'Tue', tx: 165, flagged: 9 },
  { day: 'Wed', tx: 142, flagged: 5 },
  { day: 'Thu', tx: 190, flagged: 12 },
  { day: 'Fri', tx: 210, flagged: 10 },
  { day: 'Sat', tx: 130, flagged: 4 },
  { day: 'Sun', tx: 98, flagged: 3 },
] as const

function KpiCard({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string
  value: string
  hint: string
  tone?: 'neutral' | 'good' | 'risk'
}) {
  const chipColor =
    tone === 'good'
      ? 'rgba(66,171,72,0.16)'
      : tone === 'risk'
        ? 'rgba(0,0,0,0.08)'
        : 'rgba(0,0,0,0.06)'

  const chipText =
    tone === 'good' ? brand.green : tone === 'risk' ? brand.black : brand.black

  return (
    <Paper sx={{ p: 2.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
        <Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>
            {label}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 950, letterSpacing: -0.6, mt: 0.5 }}>
            {value}
          </Typography>
        </Box>
        <Chip
          label={hint}
          size="small"
          sx={{ bgcolor: chipColor, color: chipText, borderRadius: 999 }}
        />
      </Stack>
    </Paper>
  )
}

export function DashboardPage() {
  const theme = useTheme()
  const live = useLiveApi()
  const [masterKpis, setMasterKpis] = useState(() => getMastersDashboardCounts())
  const [ops, setOps] = useState(() => loadOpsMetrics())
  const [amlOpen, setAmlOpen] = useState(() => openAmlAlertCount())

  useEffect(() => {
    const tickMasters = () => setMasterKpis(getMastersDashboardCounts())
    const tickOps = () => setOps(loadOpsMetrics())
    const tickAml = () => setAmlOpen(openAmlAlertCount())
    const tickAll = () => {
      tickMasters()
      tickOps()
      tickAml()
    }
    tickAll()
    const id = window.setInterval(tickAll, 15_000)
    window.addEventListener(MASTERS_CHANGED_EVENT, tickMasters as EventListener)
    window.addEventListener(OPS_METRICS_EVENT, tickOps as EventListener)
    window.addEventListener(AML_ALERTS_CHANGED_EVENT, tickAml as EventListener)
    return () => {
      window.clearInterval(id)
      window.removeEventListener(MASTERS_CHANGED_EVENT, tickMasters as EventListener)
      window.removeEventListener(OPS_METRICS_EVENT, tickOps as EventListener)
      window.removeEventListener(AML_ALERTS_CHANGED_EVENT, tickAml as EventListener)
    }
  }, [])

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
          Dashboard
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Production command center for worklists, master data, AML alerts, settlement operations, integrations, and
          incentive distribution.
        </Typography>
      </Box>

      <Alert severity={live ? 'success' : 'warning'}>
        {live
          ? 'Live rails enabled: KPIs and workflows are connected to API-backed modules.'
          : 'Live rails disabled: currently using local/demo persistence. Enable VITE_USE_LIVE_API=true for production behavior.'}
      </Alert>

      <Paper sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography sx={{ fontWeight: 900 }}>Operational shortcuts (features 31-40)</Typography>
          <Chip
            size="small"
            label={live ? 'Live mode' : 'Demo mode'}
            sx={{ bgcolor: live ? 'rgba(66,171,72,0.14)' : 'rgba(0,0,0,0.06)', color: live ? brand.green : brand.black }}
          />
        </Stack>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Button component={RouterLink} to="/operations/settlement-regulatory" variant="outlined" size="small">
            Settlement & regulatory
          </Button>
          <Button component={RouterLink} to="/integrations/hub" variant="outlined" size="small">
            Integration hub
          </Button>
          <Button component={RouterLink} to="/finance/incentive-distribution" variant="outlined" size="small">
            Incentive distribution
          </Button>
          <Button component={RouterLink} to="/compliance/alerts" variant="outlined" size="small">
            AML alerts
          </Button>
        </Stack>
      </Paper>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            sm: '1fr 1fr',
            md: 'repeat(4, minmax(0, 1fr))',
          },
        }}
      >
        <KpiCard
          label="Tracked worklist rows"
          value={String(worklistTransactionTotal(ops))}
          hint="Search + disbursement"
          tone="good"
        />
        <KpiCard
          label="Pending approvals"
          value={String(ops.queuePendingApprovals + masterKpis.pending)}
          hint="Queue + master data"
        />
        <KpiCard
          label="AML alerts (open hits)"
          value={String(amlOpen)}
          hint="Possible + open"
          tone={amlOpen > 0 ? 'risk' : 'good'}
        />
        <KpiCard label="Recon Exceptions" value="3" hint="Unmatched" tone="risk" />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, minmax(0, 1fr))' },
        }}
      >
        <KpiCard
          label="Master data pending"
          value={String(masterKpis.pending)}
          hint="Beneficiaries / agents / cover"
          tone={masterKpis.pending > 0 ? 'risk' : 'good'}
        />
        <KpiCard
          label="Active beneficiaries"
          value={String(masterKpis.activeBen)}
          hint="Registered"
          tone="good"
        />
        <KpiCard
          label="Active cover funds"
          value={String(masterKpis.activeCf)}
          hint={`${masterKpis.activeAg} agents`}
          tone="neutral"
        />
      </Box>

      <Paper sx={{ p: 2.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Box>
            <Typography sx={{ fontWeight: 900 }}>Weekly volume</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Transactions and flagged items (screening/AML).
            </Typography>
          </Box>
          <Chip
            label="Primary: #42AB48"
            size="small"
            sx={{ bgcolor: 'rgba(66,171,72,0.12)', color: brand.green }}
          />
        </Stack>

        <Box sx={{ height: 280, minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={volumeData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="txFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={brand.green} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={brand.green} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={theme.palette.divider} strokeDasharray="4 4" />
              <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: theme.palette.divider }} />
              <YAxis tickLine={false} axisLine={{ stroke: theme.palette.divider }} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: `1px solid ${theme.palette.divider}`,
                }}
              />
              <Area
                type="monotone"
                dataKey="tx"
                stroke={brand.green}
                strokeWidth={2}
                fill="url(#txFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </Stack>
  )
}

