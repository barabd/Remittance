import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { brand } from '../../theme/appTheme'
import { loadOpsMetrics, OPS_METRICS_EVENT, type OpsMetrics } from '../../state/opsMetricsStore'
import { getMastersDashboardCounts, MASTERS_CHANGED_EVENT } from '../../state/mastersStore'

const quickLinks: { label: string; to: string; hint: string }[] = [
  { label: 'Approvals queue', to: '/remittance/queue', hint: 'Authorize inward remittance (#2)' },
  { label: 'Distribution / disbursement', to: '/remittance/disbursement', hint: 'Cash & rails' },
  { label: 'Reports & exports', to: '/reports', hint: 'Full report list — Excel, CSV, TXT, Word, PDF (print)' },
  { label: 'Audit & monitoring', to: '/audit', hint: 'User/date audit trail & duplicate receipt demo' },
  { label: 'Cover funds', to: '/finance/cover-funds', hint: '#6' },
  { label: 'Block remittances', to: '/exchange-house/blocked-reports', hint: '#4, #7' },
  { label: 'Roles & limits', to: '/head-office/permissions', hint: '#8, #7' },
  { label: 'Exchange houses', to: '/masters/agents', hint: '#9' },
  { label: 'Users & branches', to: '/administration', hint: '#10–#13' },
  { label: 'User rights / Security', to: '/security/user-rights', hint: 'IAM module' },
  { label: 'Bulk data hub', to: '/operations/bulk-data-hub', hint: '#15' },
]

export function HeadOfficeModulePage() {
  const [ops, setOps] = useState<OpsMetrics>(() => loadOpsMetrics())
  const [masters, setMasters] = useState(() => getMastersDashboardCounts())

  useEffect(() => {
    const onOps = () => setOps(loadOpsMetrics())
    const onM = () => setMasters(getMastersDashboardCounts())
    window.addEventListener(OPS_METRICS_EVENT, onOps as EventListener)
    window.addEventListener(MASTERS_CHANGED_EVENT, onM as EventListener)
    return () => {
      window.removeEventListener(OPS_METRICS_EVENT, onOps as EventListener)
      window.removeEventListener(MASTERS_CHANGED_EVENT, onM as EventListener)
    }
  }, [])

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
          Head Office module (A.1.4)
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Central authorization, reporting, cover funds, permissions, and exchange-house governance. Links open existing
          workspaces; role limits and EH blocks are configured under Permissions.
        </Typography>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Live snapshot (demo)</Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Chip
            label={`Queue pending: ${ops.queuePendingApprovals}`}
            sx={{ bgcolor: 'rgba(66,171,72,0.14)', color: brand.green }}
          />
          <Chip label={`Search / worklist txns: ${ops.remittanceSearchRows + ops.remittanceDisbursementRows}`} />
          <Chip
            label={`Active masters — Beneficiaries: ${masters.activeBen} · Agents/EH: ${masters.activeAg} · Cover: ${masters.activeCf} · Pending approvals: ${masters.pending}`}
          />
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Authorization & control (#1)</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Pipeline</TableCell>
              <TableCell>Where to act</TableCell>
              <TableCell>Notes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Remittance approval</TableCell>
              <TableCell>
                <Button size="small" component={RouterLink} to="/remittance/queue">
                  Open queue
                </Button>
              </TableCell>
              <TableCell>Cash &amp; account-pay items (#2)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Disbursement / payout</TableCell>
              <TableCell>
                <Button size="small" component={RouterLink} to="/remittance/disbursement">
                  Open disbursement
                </Button>
              </TableCell>
              <TableCell>Maker-checker on rails</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>GL &amp; finance</TableCell>
              <TableCell>
                <Button size="small" component={RouterLink} to="/finance/gl">
                  Finance &amp; GL
                </Button>
              </TableCell>
              <TableCell>Vouchers, posting</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Operational reports</TableCell>
              <TableCell>
                <Button size="small" component={RouterLink} to="/reports">
                  Reports
                </Button>
              </TableCell>
              <TableCell>Generate → approve → export</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>

      <Typography sx={{ fontWeight: 900 }}>Shortcuts</Typography>
      <Stack direction="row" gap={1.5} flexWrap="wrap">
        {quickLinks.map((l) => (
          <Button
            key={l.to + l.label}
            variant="outlined"
            component={RouterLink}
            to={l.to}
            sx={{ borderColor: 'divider', textAlign: 'left', justifyContent: 'flex-start', py: 1.25, px: 1.5 }}
          >
            <Box>
              <Typography sx={{ fontWeight: 800 }}>{l.label}</Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {l.hint}
              </Typography>
            </Box>
          </Button>
        ))}
      </Stack>
    </Stack>
  )
}
