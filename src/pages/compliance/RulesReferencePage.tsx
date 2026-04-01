import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Link as MuiLink,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import SyncOutlinedIcon from '@mui/icons-material/SyncOutlined'
import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useLiveApi } from '../../api/config'
import { ApiHttpError } from '../../api/http'
import { liveGetComplianceRulesReadiness } from '../../api/live/client'
import { loadAmlComplianceSettings } from '../../state/amlComplianceSettingsStore'
import { loadAmlAlerts } from '../../state/amlAlertsStore'

type ComplianceRulesReadinessDto = {
  generatedAt: string
  backend: {
    ok: boolean
    service: string
  }
  database: {
    mlaSettingsSeeded: boolean
    screeningMode: string
    remittanceRecordCount: number
    remittancePendingApprovalCount: number
    amlAlertOpenCount: number
    emailOutboxQueuedCount: number
  }
  integrations: {
    smtpEnabled: boolean
    emailOutboxMode: string
  }
}

const bdBlocks = [
  {
    title: 'Bangladesh Bank / AML oversight',
    body:
      'Maintain KYC on remitters/beneficiaries, retain transaction records, screen against sanctions and local watchlists, and report suspicious transactions per central bank guidance. This console provides AML alerts and screening hooks — production requires BB reporting channels.',
    checklist: [
      'KYC data completeness verified for remitter and beneficiary flows',
      'Transaction retention policy mapped to BB requirements in core systems',
      'Sanctions/watchlist screening enabled with auditable outcomes',
      'STR/SAR reporting channel to BB confirmed outside this console',
    ],
  },
  {
    title: 'Inward remittance settlement',
    body:
      'Settlement with NBFIs/exchange houses should follow negotiated corridors, nostro/vostro arrangements, and regulatory caps. Use Cover funds and Reconciliation modules for operational control; legal limits are enforced in core banking.',
    checklist: [
      'Corridor-level agreements and caps documented in settlement policy',
      'Nostro/vostro reconciliation cadence approved by operations and finance',
      'Cover fund thresholds and escalation steps configured',
      'Core banking validations enforce legal settlement limits',
    ],
  },
]

const intlBlocks = [
  {
    title: 'Foreign sanctions & partner compliance',
    body:
      'OFAC/OSFI and partner-bank compliance for USD/EUR/AED corridors: blocked parties, country programmes, and dual-use controls. AML screening in this app is a stub — integrate a certified screening service.',
    checklist: [
      'Certified screening vendor integrated for production corridors',
      'Blocked party and country programme handling tested with evidence',
      'Partner-bank rules documented per currency/corridor',
      'Dual-use/controlled goods escalation workflow approved',
    ],
  },
  {
    title: 'Data protection & correspondent rules',
    body:
      'Exchange of PII with exchange houses should follow DPA / correspondent agreements. Email outbox in Operations hub is audit-only until SMTP and legal templates are approved.',
    checklist: [
      'DPA and correspondent data-sharing clauses signed and versioned',
      'PII minimisation and retention controls reviewed by compliance',
      'Legal-approved outbound notification templates prepared',
      'SMTP and secure transport controls validated before enabling outbound email',
    ],
  },
]

const appModuleLinks = [
  { label: 'AML Alerts', to: '/compliance/alerts' },
  { label: 'MLA & screening settings', to: '/compliance/mla-settings' },
  { label: 'Cover funds', to: '/finance/cover-funds' },
  { label: 'Reconciliation exceptions', to: '/reconciliation/exceptions' },
  { label: 'Operations hub', to: '/operations/hub' },
]

type RulesReadinessView = ComplianceRulesReadinessDto & {
  source: 'live' | 'fallback'
}

function fallbackReadiness(): RulesReadinessView {
  const settings = loadAmlComplianceSettings()
  const alerts = loadAmlAlerts()
  const openAlerts = alerts.filter((a) => a.status === 'Open').length
  return {
    generatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    backend: {
      ok: false,
      service: 'frms-ops-api',
    },
    database: {
      mlaSettingsSeeded: true,
      screeningMode: settings.screeningMode,
      remittanceRecordCount: 0,
      remittancePendingApprovalCount: 0,
      amlAlertOpenCount: openAlerts,
      emailOutboxQueuedCount: 0,
    },
    integrations: {
      smtpEnabled: false,
      emailOutboxMode: 'audit_only',
    },
    source: 'fallback',
  }
}

export function RulesReferencePage() {
  const live = useLiveApi()
  const [loading, setLoading] = useState(false)
  const [liveError, setLiveError] = useState<string | null>(null)
  const [readiness, setReadiness] = useState<RulesReadinessView | null>(null)

  const refreshLive = useCallback(async () => {
    if (!live) return
    setLoading(true)
    setLiveError(null)
    try {
      const dto = (await liveGetComplianceRulesReadiness()) as ComplianceRulesReadinessDto
      setReadiness({ ...dto, source: 'live' })
    } catch (e) {
      const msg =
        e instanceof ApiHttpError
          ? `Could not load live readiness (${e.status}). Showing fallback snapshot.`
          : 'Could not load live readiness. Showing fallback snapshot.'
      setLiveError(msg)
      setReadiness(fallbackReadiness())
    } finally {
      setLoading(false)
    }
  }, [live])

  useEffect(() => {
    if (!live) return
    void refreshLive()
  }, [live, refreshLive])

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
          Rules & compliance reference
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          High-level checklist for Bangladesh vs foreign-country obligations (#20). Not legal advice — configure policies in
          your compliance programme and core systems.
        </Typography>
      </Box>

      <Alert severity="warning" icon={<WarningAmberOutlinedIcon fontSize="inherit" />}>
        Not legal advice. Use this page as an operational checklist and align final controls with approved legal,
        regulatory, and correspondent-bank guidance.
      </Alert>

      <Stack direction="row" gap={1} flexWrap="wrap">
        {appModuleLinks.map((m) => (
          <Chip
            key={m.to}
            label={m.label}
            component={RouterLink}
            to={m.to}
            clickable
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
        ))}
      </Stack>

      {live ? (
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
            <Typography sx={{ fontWeight: 850 }}>Live integration status</Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={loading ? <CircularProgress size={14} /> : <SyncOutlinedIcon />}
              onClick={() => void refreshLive()}
              disabled={loading}
            >
              Refresh status
            </Button>
          </Stack>

          {liveError ? (
            <Alert severity="error" sx={{ mt: 1.25 }}>
              {liveError}
            </Alert>
          ) : null}

          {readiness ? (
            <Stack spacing={1.25} sx={{ mt: 1.25 }}>
              <Stack direction="row" gap={1} flexWrap="wrap">
                <Chip
                  color={readiness.source === 'live' && readiness.backend.ok ? 'success' : 'warning'}
                  label={
                    readiness.source === 'live' && readiness.backend.ok
                      ? 'Backend: online'
                      : 'Backend: fallback mode'
                  }
                />
                <Chip
                  color={readiness.database.mlaSettingsSeeded ? 'success' : 'warning'}
                  label={`MLA settings: ${readiness.database.mlaSettingsSeeded ? 'seeded' : 'missing'}`}
                />
                <Chip
                  color={readiness.integrations.smtpEnabled ? 'success' : 'warning'}
                  label={`Email outbox: ${readiness.integrations.emailOutboxMode}`}
                />
                <Chip variant="outlined" label={`Screening mode: ${readiness.database.screeningMode}`} />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} flexWrap="wrap">
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Remittance records: {readiness.database.remittanceRecordCount}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Pending approvals: {readiness.database.remittancePendingApprovalCount}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Open AML alerts: {readiness.database.amlAlertOpenCount}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Outbox queued: {readiness.database.emailOutboxQueuedCount}
                </Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Last sync: {readiness.generatedAt} ({readiness.source})
              </Typography>
            </Stack>
          ) : null}
        </Paper>
      ) : (
        <Alert severity="info">
          Live API is disabled. Enable live mode to view backend and database readiness on this page.
        </Alert>
      )}

      <Typography sx={{ fontWeight: 900 }}>Bangladesh</Typography>
      <Stack spacing={1.5}>
        {bdBlocks.map((b) => (
          <Paper key={b.title} sx={{ p: 2 }}>
            <Typography sx={{ fontWeight: 800, mb: 0.5 }}>{b.title}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {b.body}
            </Typography>
            <Divider sx={{ my: 1.25 }} />
            <Stack spacing={0.75}>
              {b.checklist.map((line) => (
                <Stack key={line} direction="row" spacing={1} alignItems="flex-start">
                  <TaskAltOutlinedIcon sx={{ mt: '2px', fontSize: 18, color: 'success.main' }} />
                  <Typography variant="body2">{line}</Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>
        ))}
      </Stack>

      <Typography sx={{ fontWeight: 900 }}>International / partner jurisdictions</Typography>
      <Stack spacing={1.5}>
        {intlBlocks.map((b) => (
          <Paper key={b.title} sx={{ p: 2 }}>
            <Typography sx={{ fontWeight: 800, mb: 0.5 }}>{b.title}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {b.body}
            </Typography>
            <Divider sx={{ my: 1.25 }} />
            <Stack spacing={0.75}>
              {b.checklist.map((line) => (
                <Stack key={line} direction="row" spacing={1} alignItems="flex-start">
                  <TaskAltOutlinedIcon sx={{ mt: '2px', fontSize: 18, color: 'success.main' }} />
                  <Typography variant="body2">{line}</Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>
        ))}
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 850, mb: 0.5 }}>Production sign-off note</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Before go-live, confirm that legal obligations, regulator reporting channels, and partner compliance contracts
          are approved and mapped to system controls. Track approvals in your internal governance process.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Supporting docs: <MuiLink component={RouterLink} to="/tools/security-vapt" underline="hover">Security &amp; VAPT reference</MuiLink> and{' '}
          <MuiLink component={RouterLink} to="/administration" underline="hover">Administration</MuiLink> audit records.
        </Typography>
      </Paper>
    </Stack>
  )
}
