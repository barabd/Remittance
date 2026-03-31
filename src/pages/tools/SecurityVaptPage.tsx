import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  Link,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { useLiveApi } from '../../api/config'
import { ApiHttpError } from '../../api/http'
import {
  liveCreateVaptFinding,
  liveDeleteVaptFinding,
  liveListVaptFindings,
  livePatchVaptFinding,
} from '../../api/live/client'
import { appendFeedback } from '../../state/feedbackLogStore'

export type VaptFindingDto = {
  id: number
  referenceNo: string
  vaptQuarter?: string
  areaNo?: number
  areaName: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
  description: string
  status: 'OPEN' | 'IN_PROGRESS' | 'REMEDIATED' | 'RETESTED' | 'RISK_ACCEPTED'
  owner?: string
  targetDate?: string
  closedDate?: string
  ticketId?: string
  retestNotes?: string
  createdAt: string
  updatedAt: string
}

const OWASP_TOP_10_2021 = [
  'A01:2021 – Broken Access Control',
  'A02:2021 – Cryptographic Failures',
  'A03:2021 – Injection',
  'A04:2021 – Insecure Design',
  'A05:2021 – Security Misconfiguration',
  'A06:2021 – Vulnerable and Outdated Components',
  'A07:2021 – Identification and Authentication Failures',
  'A08:2021 – Software and Data Integrity Failures',
  'A09:2021 – Security Logging and Monitoring Failures',
  'A10:2021 – Server-Side Request Forgery (SSRF)',
] as const

const VAPT_ROWS: { n: number; area: string; spa: string; api: string }[] = [
  { n: 1, area: 'API Testing', spa: 'Client consumes API only', api: 'Full scope: authz, input, errors, rate limits' },
  { n: 2, area: 'Access Control', spa: 'UI gating is not security', api: 'Enforce RBAC on every endpoint' },
  { n: 3, area: 'Authentication', spa: 'Login flows when integrated', api: 'OIDC/JWT/session validation, lockout/MFA policy' },
  { n: 4, area: 'Business Logic', spa: 'Never trust client checks', api: 'Server-side invariants, limits, state machine' },
  { n: 5, area: 'CORS', spa: 'Browser enforces', api: 'Explicit allowed origins; no * with credentials' },
  { n: 6, area: 'CSRF', spa: 'Lower with Bearer token pattern', api: 'Anti-forgery / SameSite if using cookies' },
  { n: 7, area: 'Clickjacking', spa: 'Headers in dev; prod via proxy', api: 'X-Frame-Options / CSP frame-ancestors' },
  { n: 8, area: 'Command Injection', spa: 'N/A', api: 'Never shell-execute user input' },
  { n: 9, area: 'DOM-Based', spa: 'React default escaping; avoid unsafe DOM', api: 'Encode sensitive responses' },
  { n: 10, area: 'File Upload', spa: 'Excel parse only; not AV', api: 'Type/size limits, scan, safe storage' },
  { n: 11, area: 'HTTP Request Smuggling', spa: 'N/A', api: 'Proxy + server HTTP parsing hardening' },
  { n: 12, area: 'HTTP Host Header', spa: 'N/A', api: 'Validate Host; default vhost deny' },
  { n: 13, area: 'Information Disclosure', spa: 'Production build; no secrets in bundle', api: 'Generic errors; no stack to client' },
  { n: 14, area: 'Insecure Deserialization', spa: 'JSON parse only', api: 'Safe types; no unsafe binary formats' },
  { n: 15, area: 'JWT Attacks', spa: 'Secure storage when implemented', api: 'sig/exp/aud/iss; reject alg=none' },
  { n: 16, area: 'NoSQL Injection', spa: 'N/A for SQL Server', api: 'N/A unless NoSQL added' },
  { n: 17, area: 'OAuth', spa: 'PKCE-friendly SPA patterns', api: 'Redirect URI allowlist; token validation' },
  { n: 18, area: 'Path Traversal', spa: 'Sanitize display names', api: 'Canonical paths; jail uploads' },
  { n: 19, area: 'Prototype Pollution', spa: 'Avoid merging untrusted objects', api: 'Strict DTO binding' },
  { n: 20, area: 'Race Conditions', spa: 'N/A', api: 'Transactions, idempotency keys' },
  { n: 21, area: 'SQL Injection', spa: 'No DB access', api: 'EF Core/Dapper parameters only' },
  { n: 22, area: 'SSRF', spa: 'N/A', api: 'Block internal/metadata URLs' },
  { n: 23, area: 'SSTI', spa: 'N/A', api: 'No user content in templates' },
  { n: 24, area: 'Web Cache Poisoning', spa: 'Static assets', api: 'Vary, Cache-Control, CDN rules' },
  { n: 25, area: 'Web LLM', spa: 'If added later', api: 'Policy + input/output controls' },
  { n: 26, area: 'WebSockets', spa: 'If added', api: 'Auth on connect; validate messages' },
  { n: 27, area: 'XSS', spa: 'React escaping; audit unsafe HTML', api: 'Encode; CSP helps' },
  { n: 28, area: 'XXE', spa: 'N/A', api: 'Disable DTD if parsing XML' },
]

const SEVERITY_OPTIONS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const
const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'REMEDIATED', 'RETESTED', 'RISK_ACCEPTED'] as const

function SeverityChip({ value }: { value: string }) {
  switch (value) {
    case 'CRITICAL':
      return <Chip label="CRITICAL" size="small" color="error" />
    case 'HIGH':
      return <Chip label="HIGH" size="small" color="error" variant="outlined" />
    case 'MEDIUM':
      return <Chip label="MEDIUM" size="small" color="warning" />
    case 'LOW':
      return <Chip label="LOW" size="small" color="info" />
    default:
      return <Chip label={value} size="small" />
  }
}

type FormDraft = {
  referenceNo: string
  vaptQuarter: string
  areaNo: number | ''
  areaName: string
  severity: string
  description: string
  owner: string
  targetDate: string
  ticketId: string
}

const BLANK_FORM: FormDraft = {
  referenceNo: '',
  vaptQuarter: '',
  areaNo: '',
  areaName: '',
  severity: 'HIGH',
  description: '',
  owner: '',
  targetDate: '',
  ticketId: '',
}

export function SecurityVaptPage() {
  const live = useLiveApi()
  const [findings, setFindings] = useState<VaptFindingDto[]>([])
  const [syncWarning, setSyncWarning] = useState('')
  const [actionNotice, setActionNotice] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formDraft, setFormDraft] = useState<FormDraft>(BLANK_FORM)
  const [saving, setSaving] = useState(false)

  function isRecoverableLiveFailure(error: unknown) {
    return error instanceof ApiHttpError && (error.status === 404 || error.status >= 500)
  }

  function makeLocalFinding(): VaptFindingDto {
    const now = new Date().toISOString()
    return {
      id: Date.now(),
      referenceNo: formDraft.referenceNo.trim(),
      vaptQuarter: formDraft.vaptQuarter.trim() || undefined,
      areaNo: formDraft.areaNo === '' ? undefined : Number(formDraft.areaNo),
      areaName: formDraft.areaName.trim(),
      severity: formDraft.severity as VaptFindingDto['severity'],
      description: formDraft.description.trim(),
      status: 'OPEN',
      owner: formDraft.owner.trim() || undefined,
      targetDate: formDraft.targetDate || undefined,
      closedDate: undefined,
      ticketId: formDraft.ticketId.trim() || undefined,
      retestNotes: undefined,
      createdAt: now,
      updatedAt: now,
    }
  }

  useEffect(() => {
    if (!live) return
    void liveListVaptFindings()
      .then((res) => {
        setFindings(res.items as any[])
        setSyncWarning('')
      })
      .catch((e) => {
        setSyncWarning(
          e instanceof ApiHttpError ? e.message : 'Could not load VAPT findings from live API.',
        )
      })
  }, [live])

  async function submitFinding() {
    setSaving(true)
    setSyncWarning('')
    try {
      const created = await liveCreateVaptFinding({
        referenceNo: formDraft.referenceNo,
        vaptQuarter: formDraft.vaptQuarter || undefined,
        areaNo: formDraft.areaNo === '' ? undefined : formDraft.areaNo,
        areaName: formDraft.areaName,
        severity: formDraft.severity as VaptFindingDto['severity'],
        description: formDraft.description,
        owner: formDraft.owner || undefined,
        targetDate: formDraft.targetDate || undefined,
        ticketId: formDraft.ticketId || undefined,
      })
      setFindings((prev) => [created as any, ...prev])
      setFormDraft(BLANK_FORM)
      setShowForm(false)
      setActionNotice('Finding saved.')
      void appendFeedback(
        'security_vapt',
        `Finding logged: ${created.referenceNo} [${created.severity}]`,
      )
    } catch (e) {
      if (isRecoverableLiveFailure(e)) {
        const created = makeLocalFinding()
        setFindings((prev) => [created, ...prev])
        setFormDraft(BLANK_FORM)
        setShowForm(false)
        setActionNotice('Live API unavailable. Finding saved locally for this session.')
        void appendFeedback(
          'security_vapt',
          `Finding logged locally: ${created.referenceNo} [${created.severity}]`,
        )
      } else {
        setSyncWarning(e instanceof ApiHttpError ? e.message : 'Failed to save finding.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function patchStatus(id: number, status: string) {
    setSyncWarning('')
    try {
      const updated = await livePatchVaptFinding(String(id), {
        status: status as VaptFindingDto['status'],
      })
      setFindings((prev) => prev.map((f) => (f.id === id ? (updated as any) : f)))
      setActionNotice(`Finding ${id} updated.`)
      void appendFeedback('security_vapt', `Finding ${id} status → ${status}`)
    } catch (e) {
      if (isRecoverableLiveFailure(e)) {
        setFindings((prev) =>
          prev.map((f) =>
            f.id === id
              ? {
                  ...f,
                  status: status as VaptFindingDto['status'],
                  closedDate:
                    status === 'REMEDIATED' || status === 'RETESTED' || status === 'RISK_ACCEPTED'
                      ? new Date().toISOString().slice(0, 10)
                      : undefined,
                }
              : f,
          ),
        )
        setActionNotice(`Live API unavailable. Finding ${id} updated locally.`)
        void appendFeedback('security_vapt', `Finding ${id} status → ${status} (local fallback)`)
      } else {
        setSyncWarning(e instanceof ApiHttpError ? e.message : 'Failed to update status.')
      }
    }
  }

  async function deleteFinding(id: number) {
    setSyncWarning('')
    try {
      await liveDeleteVaptFinding(String(id))
      setFindings((prev) => prev.filter((f) => f.id !== id))
      setActionNotice(`Finding ${id} deleted.`)
      void appendFeedback('security_vapt', `Finding ${id} deleted`)
    } catch (e) {
      if (isRecoverableLiveFailure(e)) {
        setFindings((prev) => prev.filter((f) => f.id !== id))
        setActionNotice(`Live API unavailable. Finding ${id} deleted locally.`)
        void appendFeedback('security_vapt', `Finding ${id} deleted (local fallback)`)
      } else {
        setSyncWarning(e instanceof ApiHttpError ? e.message : 'Failed to delete finding.')
      }
    }
  }

  const openCritical = findings.filter((f) => f.status === 'OPEN' && f.severity === 'CRITICAL').length
  const openHigh = findings.filter((f) => f.status === 'OPEN' && f.severity === 'HIGH').length
  const activeCount = findings.filter(
    (f) => f.status === 'OPEN' || f.status === 'IN_PROGRESS',
  ).length
  const closedCount = findings.filter((f) =>
    (['REMEDIATED', 'RETESTED', 'RISK_ACCEPTED'] as string[]).includes(f.status),
  ).length

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
          Security, OWASP Top 10 &amp; VAPT scope
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          <Box component="span" sx={{ fontWeight: 600 }}>VAPT</Box> (Vulnerability Assessment &amp; Penetration Testing) must be performed by a qualified team; it produces
          findings and retest reports. This screen documents <Box component="span" sx={{ fontWeight: 600 }}>where controls apply</Box> (SPA vs ASP.NET Core API vs
          infrastructure). Repository references: <code>SECURITY.md</code>, <code>docs/VAPT_OWASP_COVERAGE.md</code>,{' '}
          <code>docs/deploy/nginx-security-headers.example.conf</code>.
        </Typography>
      </Box>

      {syncWarning ? (
        <Alert severity="warning" onClose={() => setSyncWarning('')}>
          {syncWarning}
        </Alert>
      ) : null}

      {actionNotice ? (
        <Alert severity="success" onClose={() => setActionNotice('')}>
          {actionNotice}
        </Alert>
      ) : null}

      <Alert severity="warning" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
        <Typography sx={{ fontWeight: 800, mb: 0.75 }}>VAPT remediation policy (required)</Typography>
        <Typography variant="body2" component="div">
          All <strong>VAPT recommendations</strong> must be implemented <strong>promptly</strong>. Conduct{' '}
          <strong>comprehensive assessments quarterly</strong>. <strong>Immediate remediation</strong> is required for all{' '}
          <strong>critical</strong> and <strong>high-risk</strong> vulnerabilities, with tracking, fix deployment, and retest evidence.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
          Operational SLAs and auditor evidence checklist: <code>docs/VAPT_REMEDIATION_POLICY.md</code> · summary in{' '}
          <code>SECURITY.md</code>.
        </Typography>
      </Alert>

      <Alert severity="info">
        Dev server applies baseline headers (see <code>vite.config.ts</code>). Production must add the same (or stricter) headers at{' '}
        <strong>IIS / Nginx / CDN</strong> — see the nginx example in <code>docs/deploy/</code>.
      </Alert>

      {/* ── Findings tracker ─────────────────────────────────────── */}
      <Paper sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography sx={{ fontWeight: 900 }}>VAPT findings tracker</Typography>
          {live && (
            <Button
              size="small"
              variant={showForm ? 'outlined' : 'contained'}
              onClick={() => setShowForm((v) => !v)}
            >
              {showForm ? 'Cancel' : 'Log finding'}
            </Button>
          )}
        </Stack>

        {!live ? (
          <Alert severity="info">
            Enable live API mode (<code>VITE_USE_LIVE_API=true</code>) to log and track VAPT findings in
            the database.
          </Alert>
        ) : (
          <>
            {findings.length > 0 && (
              <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 1.5 }}>
                {openCritical > 0 && (
                  <Chip label={`${openCritical} Open Critical`} color="error" size="small" />
                )}
                {openHigh > 0 && (
                  <Chip label={`${openHigh} Open High`} color="error" variant="outlined" size="small" />
                )}
                <Chip
                  label={`${activeCount} active`}
                  color={activeCount > 0 ? 'warning' : 'default'}
                  variant="outlined"
                  size="small"
                />
                <Chip label={`${closedCount} closed`} color="success" variant="outlined" size="small" />
                <Chip label={`${findings.length} total`} variant="outlined" size="small" />
              </Stack>
            )}

            <Collapse in={showForm}>
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography sx={{ fontWeight: 800, mb: 1.5 }}>Log new finding</Typography>
                <Stack spacing={1.5}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
                    <TextField
                      label="Reference no."
                      required
                      size="small"
                      value={formDraft.referenceNo}
                      onChange={(e) => setFormDraft((d) => ({ ...d, referenceNo: e.target.value }))}
                      placeholder="VAPT-2026-Q1-001"
                      sx={{ flex: 1.5 }}
                    />
                    <TextField
                      label="VAPT quarter"
                      size="small"
                      value={formDraft.vaptQuarter}
                      onChange={(e) => setFormDraft((d) => ({ ...d, vaptQuarter: e.target.value }))}
                      placeholder="2026-Q1"
                      sx={{ flex: 0.8 }}
                    />
                    <TextField
                      select
                      label="Severity"
                      required
                      size="small"
                      value={formDraft.severity}
                      onChange={(e) => setFormDraft((d) => ({ ...d, severity: e.target.value }))}
                      sx={{ flex: 0.7 }}
                    >
                      {SEVERITY_OPTIONS.map((s) => (
                        <MenuItem key={s} value={s}>
                          {s}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>

                  <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
                    <TextField
                      select
                      label="Test area (1–28)"
                      size="small"
                      value={formDraft.areaNo}
                      onChange={(e) => {
                        const n = e.target.value === '' ? '' : Number(e.target.value)
                        const row = n !== '' ? VAPT_ROWS.find((r) => r.n === n) : undefined
                        setFormDraft((d) => ({
                          ...d,
                          areaNo: n,
                          areaName: row ? row.area : d.areaName,
                        }))
                      }}
                      sx={{ flex: 1 }}
                    >
                      <MenuItem value="">— Not area-specific —</MenuItem>
                      {VAPT_ROWS.map((r) => (
                        <MenuItem key={r.n} value={r.n}>
                          #{r.n} {r.area}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="Area name"
                      required
                      size="small"
                      value={formDraft.areaName}
                      onChange={(e) => setFormDraft((d) => ({ ...d, areaName: e.target.value }))}
                      placeholder="e.g. SQL Injection"
                      sx={{ flex: 1.5 }}
                    />
                  </Stack>

                  <TextField
                    label="Description"
                    required
                    size="small"
                    multiline
                    minRows={2}
                    value={formDraft.description}
                    onChange={(e) => setFormDraft((d) => ({ ...d, description: e.target.value }))}
                    placeholder="Describe the finding concisely, including reproduction steps if applicable."
                    fullWidth
                  />

                  <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
                    <TextField
                      label="Owner"
                      size="small"
                      value={formDraft.owner}
                      onChange={(e) => setFormDraft((d) => ({ ...d, owner: e.target.value }))}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Target date"
                      size="small"
                      type="date"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={formDraft.targetDate}
                      onChange={(e) => setFormDraft((d) => ({ ...d, targetDate: e.target.value }))}
                      sx={{ flex: 0.8 }}
                    />
                    <TextField
                      label="Ticket / PR reference"
                      size="small"
                      value={formDraft.ticketId}
                      onChange={(e) => setFormDraft((d) => ({ ...d, ticketId: e.target.value }))}
                      placeholder="JIRA-123"
                      sx={{ flex: 1 }}
                    />
                  </Stack>

                  <Stack direction="row" gap={1}>
                    <Button
                      variant="contained"
                      size="small"
                      disabled={
                        saving ||
                        !formDraft.referenceNo.trim() ||
                        !formDraft.areaName.trim() ||
                        !formDraft.description.trim()
                      }
                      onClick={() => void submitFinding()}
                    >
                      {saving ? 'Saving…' : 'Save finding'}
                    </Button>
                    <Button
                      size="small"
                      onClick={() => {
                        setShowForm(false)
                        setFormDraft(BLANK_FORM)
                      }}
                    >
                      Cancel
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            </Collapse>

            {findings.length === 0 ? (
              <Alert severity="info">
                No findings logged yet. Use "Log finding" to record a finding from a VAPT assessment cycle.
              </Alert>
            ) : (
              <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, minWidth: 120 }}>Reference</TableCell>
                      <TableCell sx={{ fontWeight: 800, minWidth: 80 }}>Quarter</TableCell>
                      <TableCell sx={{ fontWeight: 800, minWidth: 140 }}>Area</TableCell>
                      <TableCell sx={{ fontWeight: 800, minWidth: 90 }}>Severity</TableCell>
                      <TableCell sx={{ fontWeight: 800, minWidth: 160 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 800, minWidth: 220 }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Owner</TableCell>
                      <TableCell sx={{ fontWeight: 800, minWidth: 90 }}>Target</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Ticket</TableCell>
                      <TableCell sx={{ width: 48 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {findings.map((f) => (
                      <TableRow key={f.id} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{f.referenceNo}</TableCell>
                        <TableCell>{f.vaptQuarter ?? '—'}</TableCell>
                        <TableCell>
                          {f.areaNo != null ? `#${f.areaNo} ` : ''}
                          {f.areaName}
                        </TableCell>
                        <TableCell>
                          <SeverityChip value={f.severity} />
                        </TableCell>
                        <TableCell>
                          <TextField
                            select
                            size="small"
                            variant="standard"
                            value={f.status}
                            onChange={(e) => void patchStatus(f.id, e.target.value)}
                            sx={{ minWidth: 148 }}
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <MenuItem key={s} value={s}>
                                {s.replace('_', ' ')}
                              </MenuItem>
                            ))}
                          </TextField>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 280 }}>{f.description}</TableCell>
                        <TableCell>{f.owner ?? '—'}</TableCell>
                        <TableCell>{f.targetDate ?? '—'}</TableCell>
                        <TableCell>{f.ticketId ?? '—'}</TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            color="error"
                            sx={{ minWidth: 0, px: 0.5 }}
                            onClick={() => void deleteFinding(f.id)}
                          >
                            ✕
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </Paper>

      <Divider />

      <Paper sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 900, mb: 1 }}>Suggested remediation SLAs (adjust per bank policy)</Typography>
        <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Severity</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Expectation</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Critical</TableCell>
                <TableCell>Immediate — same-day response; deploy fix ASAP; mandatory retest sign-off</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>High</TableCell>
                <TableCell>Immediate priority — short clock (e.g. start ≤ 3 business days, close per policy)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Medium / Low</TableCell>
                <TableCell>Tracked; remediate within agreed release windows; document risk acceptance if deferred</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 900, mb: 1 }}>OWASP Top 10 — 2021 (summary)</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
          Official reference:{' '}
          <Link href="https://owasp.org/Top10/" target="_blank" rel="noopener noreferrer">
            owasp.org/Top10
          </Link>
        </Typography>
        <Stack component="ol" spacing={0.5} sx={{ m: 0, pl: 2.5 }}>
          {OWASP_TOP_10_2021.map((x) => (
            <Typography key={x} component="li" variant="body2">
              {x}
            </Typography>
          ))}
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 900, mb: 1 }}>Contract test areas (28) — responsibility split</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
          Each row must be exercised under VAPT with <strong>individual detail</strong> in the test report where required by your
          sponsor. “SPA” = this React app; “API” = ASP.NET Core + SQL Server (production target).
        </Typography>
        <TableContainer sx={{ maxHeight: 560, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, width: 48 }}>#</TableCell>
                <TableCell sx={{ fontWeight: 800, minWidth: 160 }}>Area</TableCell>
                <TableCell sx={{ fontWeight: 800, minWidth: 200 }}>This SPA</TableCell>
                <TableCell sx={{ fontWeight: 800, minWidth: 220 }}>API / database</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {VAPT_ROWS.map((r) => (
                <TableRow key={r.n} hover>
                  <TableCell>{r.n}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{r.area}</TableCell>
                  <TableCell>{r.spa}</TableCell>
                  <TableCell>{r.api}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Stack>
  )
}
