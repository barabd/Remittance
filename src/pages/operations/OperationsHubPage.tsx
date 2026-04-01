import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useLiveApi } from '../../api/config'
import {
  appendFeedback,
  EMAIL_OUTBOX_EVENT,
  FEEDBACK_LOG_EVENT,
  loadEmailOutbox,
  loadFeedbackLog,
  loadOperationalNotifications,
  markAllOperationalRead,
  markOperationalRead,
  markOutboxItemSentDemo,
  OPERATIONAL_NOTIFICATIONS_EVENT,
  pushOperationalNotification,
  queueEmailToExchangeHouse,
  refreshOperationsHubSnapshot,
  resetOutboxItemToQueued,
  SMS_OUTBOX_EVENT,
  type EmailOutboxItem,
  type FeedbackLogEntry,
  type FeedbackSource,
  type OperationalNotification,
  type OperationalNotificationKind,
} from '../../integrations/operationsHub'
import { deliverOutboxRowViaProductionApi } from '../../lib/opsDeliveryClient'
import {
  OPS_PRODUCTION_NOTES,
  opsEmailSendApiConfigured,
  opsPushSendApiConfigured,
  opsSmsSendApiConfigured,
} from '../../lib/operationsHubProduction'
import { brand } from '../../theme/appTheme'

type AlertFilter = 'all' | OperationalNotificationKind

const FEEDBACK_SOURCES: FeedbackSource[] = [
  'bulk_upload',
  'search_import',
  'disbursement',
  'pricing',
  'fx_quote',
  'single_entry',
  'operations_hub',
  'system',
]

function exportFeedbackCsv(rows: FeedbackLogEntry[]) {
  const header = 'at,source,message,meta\n'
  const body = rows
    .map((r) => {
      const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
      return [esc(r.at), esc(r.source), esc(r.message), esc(r.meta ?? '')].join(',')
    })
    .join('\n')
  const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `feedback-log-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function OperationsHubPage() {
  const liveApi = useLiveApi()
  const [tab, setTab] = useState(0)
  const [notes, setNotes] = useState<OperationalNotification[]>([])
  const [emails, setEmails] = useState<EmailOutboxItem[]>([])
  const [feedback, setFeedback] = useState<FeedbackLogEntry[]>([])
  const [alertFilter, setAlertFilter] = useState<AlertFilter>('all')
  const [feedbackSourceFilter, setFeedbackSourceFilter] = useState<FeedbackSource | 'all'>('all')
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [compose, setCompose] = useState({
    to: '',
    subject: '',
    bodyPreview: '',
    exchangeHouse: '',
    reportRef: '',
  })
  const [deliverySnack, setDeliverySnack] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({ open: false, message: '', severity: 'success' })

  const refresh = useCallback(async () => {
    if (liveApi) {
      try {
        const { notifications, outbox, feedback: fb } = await refreshOperationsHubSnapshot()
        setNotes(notifications)
        setEmails(outbox)
        setFeedback(fb)
      } catch {
        /* keep current rows on failure */
      }
    } else {
      setNotes(loadOperationalNotifications())
      setEmails(loadEmailOutbox())
      setFeedback(loadFeedbackLog())
    }
  }, [liveApi])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const onChange = () => {
      void refresh()
    }
    window.addEventListener(OPERATIONAL_NOTIFICATIONS_EVENT, onChange as EventListener)
    window.addEventListener(EMAIL_OUTBOX_EVENT, onChange as EventListener)
    window.addEventListener(SMS_OUTBOX_EVENT, onChange as EventListener)
    window.addEventListener(FEEDBACK_LOG_EVENT, onChange as EventListener)
    return () => {
      window.removeEventListener(OPERATIONAL_NOTIFICATIONS_EVENT, onChange as EventListener)
      window.removeEventListener(EMAIL_OUTBOX_EVENT, onChange as EventListener)
      window.removeEventListener(SMS_OUTBOX_EVENT, onChange as EventListener)
      window.removeEventListener(FEEDBACK_LOG_EVENT, onChange as EventListener)
    }
  }, [refresh])

  const filteredNotes = useMemo(() => {
    if (alertFilter === 'all') return notes
    return notes.filter((n) => n.kind === alertFilter)
  }, [notes, alertFilter])

  const filteredFeedback = useMemo(() => {
    if (feedbackSourceFilter === 'all') return feedback
    return feedback.filter((f) => f.source === feedbackSourceFilter)
  }, [feedback, feedbackSourceFilter])

  const emailConfigured = opsEmailSendApiConfigured()
  const pushConfigured = opsPushSendApiConfigured()
  const smsConfigured = opsSmsSendApiConfigured()

  async function submitCompose() {
    if (!compose.to.trim() || !compose.subject.trim()) return
    try {
      await queueEmailToExchangeHouse({
        to: compose.to.trim(),
        subject: compose.subject.trim(),
        bodyPreview: compose.bodyPreview.trim() || '(no preview)',
        exchangeHouse: compose.exchangeHouse.trim() || undefined,
        reportRef: compose.reportRef.trim() || undefined,
      })
      await appendFeedback(
        'operations_hub',
        `Queued email to exchange partner: ${compose.subject.trim()}`,
        compose.exchangeHouse.trim() || compose.to.trim(),
      )
    } finally {
      setEmailDialogOpen(false)
      setCompose({ to: '', subject: '', bodyPreview: '', exchangeHouse: '', reportRef: '' })
      await refresh()
    }
  }

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
          Operations hub
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Return/stop alerts (#17), email outbox for exchange houses (#18), auto feedback log (#15). With{' '}
          <Box component="code" sx={{ fontSize: '0.85em' }}>
            VITE_USE_LIVE_API=true
          </Box>{' '}
          this hub reads/writes the Java + MSSQL API (see{' '}
          <Box component="code" sx={{ fontSize: '0.85em' }}>
            server/frms-ops-api
          </Box>
          ). SMTP and FCM still use the env URLs below.
        </Typography>
      </Box>

      <Alert severity={emailConfigured && pushConfigured && smsConfigured ? 'success' : 'info'} sx={{ borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
          Production delivery
        </Typography>
        <Typography variant="body2" component="div" sx={{ mb: 1 }}>
          Email API:{' '}
          <Box component="span" sx={{ fontWeight: emailConfigured ? 800 : 600 }}>
            {emailConfigured ? 'configured' : 'not set'}
          </Box>
          {' · '}
          Push API:{' '}
          <Box component="span" sx={{ fontWeight: pushConfigured ? 800 : 600 }}>
            {pushConfigured ? 'configured' : 'not set'}
          </Box>
          {' · '}
          SMS API:{' '}
          <Box component="span" sx={{ fontWeight: smsConfigured ? 800 : 600 }}>
            {smsConfigured ? 'configured' : 'not set'}
          </Box>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          {OPS_PRODUCTION_NOTES.email}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {OPS_PRODUCTION_NOTES.push}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {OPS_PRODUCTION_NOTES.sms}
        </Typography>
        {pushConfigured ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Push URL active: each new operational alert (return / stop / system) triggers an automatic POST with severity
            mapping.
          </Typography>
        ) : null}
      </Alert>

      <Paper sx={{ px: 2, pt: 1 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="inherit" indicatorColor="primary">
          <Tab label="Alerts" />
          <Tab label="Email outbox" />
          <Tab label="Feedback log" />
        </Tabs>
      </Paper>

      {tab === 0 ? (
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
            <Typography sx={{ fontWeight: 800 }}>Returns & stop payments (#17)</Typography>
            <Stack direction="row" gap={0.5} flexWrap="wrap">
              <Button size="small" component={RouterLink} to="/remittance/search" variant="outlined">
                Search & tracking
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={async () => {
                  try {
                    await pushOperationalNotification({
                      kind: 'return',
                      title: 'Transaction return (demo)',
                      body: 'Simulated return — reconcile Nostro and notify partner treasury.',
                      remittanceNo: `DEMO-RET-${Date.now().toString(36).toUpperCase()}`,
                    })
                    await appendFeedback('operations_hub', 'Simulated return alert from Operations hub.')
                  } finally {
                    await refresh()
                  }
                }}
              >
                Simulate return
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={async () => {
                  try {
                    await pushOperationalNotification({
                      kind: 'stop_payment',
                      title: 'Stop payment (demo)',
                      body: 'Simulated stop — block disbursement until compliance clears.',
                      remittanceNo: `DEMO-STP-${Date.now().toString(36).toUpperCase()}`,
                    })
                    await appendFeedback('operations_hub', 'Simulated stop-payment alert from Operations hub.')
                  } finally {
                    await refresh()
                  }
                }}
              >
                Simulate stop
              </Button>
              <Button
                size="small"
                onClick={async () => {
                  await markAllOperationalRead()
                  await refresh()
                }}
              >
                Mark all read
              </Button>
            </Stack>
          </Stack>
          <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ mb: 2 }}>
            {(['all', 'return', 'stop_payment', 'system'] as const).map((k) => (
              <Chip
                key={k}
                size="small"
                label={k === 'all' ? 'All' : k}
                onClick={() => setAlertFilter(k)}
                color={alertFilter === k ? 'primary' : 'default'}
                variant={alertFilter === k ? 'filled' : 'outlined'}
                sx={{ fontWeight: alertFilter === k ? 800 : 500 }}
              />
            ))}
          </Stack>
          <List disablePadding>
            {filteredNotes.length === 0 ? (
              <Typography color="text.secondary">
                No alerts in this filter. Change status to Returned or Stopped in{' '}
                <Box component={RouterLink} to="/remittance/search" sx={{ color: 'primary.main' }}>
                  Search & Tracking
                </Box>{' '}
                to create real entries, or use the demo buttons above.
              </Typography>
            ) : (
              filteredNotes.map((n) => (
                <ListItemButton
                  key={n.id}
                  onClick={async () => {
                    await markOperationalRead(n.id)
                    await refresh()
                  }}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    bgcolor: n.read ? 'transparent' : 'rgba(66,171,72,0.06)',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                        <Typography sx={{ fontWeight: 800 }}>{n.title}</Typography>
                        <Chip
                          size="small"
                          label={n.kind}
                          sx={{ height: 22, bgcolor: 'rgba(0,0,0,0.06)', color: brand.black }}
                        />
                      </Stack>
                    }
                    secondary={
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {n.body} {n.remittanceNo ? `· ${n.remittanceNo}` : ''} · {n.createdAt}
                      </Typography>
                    }
                  />
                </ListItemButton>
              ))
            )}
          </List>
        </Paper>
      ) : null}

      {tab === 1 ? (
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
            <Typography sx={{ fontWeight: 800 }}>Exchange house email outbox (#18)</Typography>
            <Button size="small" variant="contained" onClick={() => setEmailDialogOpen(true)}>
              Queue email (demo)
            </Button>
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            {emailConfigured
              ? '“Send via production API” POSTs the row JSON to your worker, then marks it sent on success. Use “Mark sent (demo)” to skip the API.'
              : 'Set VITE_OPS_EMAIL_SEND_API_URL (e.g. /api/v1/operations/delivery/email with Java running) to enable production send.'}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {emails.length === 0 ? (
            <Typography color="text.secondary">
              Empty. Use bulk upload / reports, or &quot;Queue email&quot; here. Production: dequeue and send via SMTP or
              provider API.
            </Typography>
          ) : (
            <List disablePadding>
              {emails.map((e) => (
                <Paper key={e.id} variant="outlined" sx={{ p: 1.5, mb: 1, borderColor: 'divider' }}>
                  <Typography sx={{ fontWeight: 800 }}>{e.subject}</Typography>
                  <Typography variant="body2">To: {e.to}</Typography>
                  {e.exchangeHouse ? (
                    <Typography variant="body2" color="text.secondary">
                      Exchange house: {e.exchangeHouse}
                    </Typography>
                  ) : null}
                  {e.reportRef ? (
                    <Typography variant="body2" color="text.secondary">
                      Ref: {e.reportRef}
                    </Typography>
                  ) : null}
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    {e.bodyPreview}
                  </Typography>
                  <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
                    <Chip size="small" label={e.status} />
                    <Typography variant="caption" color="text.secondary">
                      {e.createdAt}
                    </Typography>
                    {e.status === 'queued' ? (
                      <Stack direction="row" gap={0.5} flexWrap="wrap" alignItems="center">
                        {emailConfigured ? (
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            onClick={async () => {
                              try {
                                const r = await deliverOutboxRowViaProductionApi(e, markOutboxItemSentDemo)
                                if (r.ok) {
                                  await appendFeedback(
                                    'operations_hub',
                                    `Production email API accepted: ${e.subject}`,
                                    e.id,
                                  )
                                  setDeliverySnack({
                                    open: true,
                                    message: 'Email delivery API accepted (row marked sent).',
                                    severity: 'success',
                                  })
                                } else {
                                  setDeliverySnack({
                                    open: true,
                                    message: r.message ?? `Email API failed (${r.status})`,
                                    severity: 'error',
                                  })
                                }
                              } finally {
                                await refresh()
                              }
                            }}
                          >
                            Send via production API
                          </Button>
                        ) : null}
                        <Button
                          size="small"
                          variant={emailConfigured ? 'outlined' : 'text'}
                          onClick={async () => {
                            try {
                              await markOutboxItemSentDemo(e.id)
                              await appendFeedback('operations_hub', `Marked outbox sent (demo): ${e.subject}`, e.id)
                            } finally {
                              await refresh()
                            }
                          }}
                        >
                          Mark sent (demo)
                        </Button>
                      </Stack>
                    ) : (
                      <Button
                        size="small"
                        onClick={async () => {
                          await resetOutboxItemToQueued(e.id)
                          await refresh()
                        }}
                      >
                        Back to queued
                      </Button>
                    )}
                  </Stack>
                </Paper>
              ))}
            </List>
          )}
        </Paper>
      ) : null}

      {tab === 2 ? (
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
            <Typography sx={{ fontWeight: 800 }}>Auto feedback log (#15)</Typography>
            <Stack direction="row" gap={1} flexWrap="wrap">
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel id="fb-src">Source</InputLabel>
                <Select
                  labelId="fb-src"
                  label="Source"
                  value={feedbackSourceFilter}
                  onChange={(ev) => setFeedbackSourceFilter(ev.target.value as FeedbackSource | 'all')}
                >
                  <MenuItem value="all">All sources</MenuItem>
                  {FEEDBACK_SOURCES.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                size="small"
                variant="outlined"
                onClick={async () => {
                  try {
                    await appendFeedback('operations_hub', 'Manual note from Operations hub (demo).')
                  } finally {
                    await refresh()
                  }
                }}
              >
                Add demo entry
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={filteredFeedback.length === 0}
                onClick={() => exportFeedbackCsv(filteredFeedback)}
              >
                Export CSV (filtered)
              </Button>
            </Stack>
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Entries are appended automatically from bulk upload, search import, pricing, FX tools, and this hub. Wire{' '}
            <Box component="code" sx={{ fontSize: '0.85em' }}>
              appendFeedback
            </Box>{' '}
            anywhere you need an audit trail.
          </Typography>
          {filteredFeedback.length === 0 ? (
            <Typography color="text.secondary">No entries for this filter.</Typography>
          ) : (
            filteredFeedback.map((f) => (
              <Typography key={f.id} variant="body2" sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box component="span" sx={{ fontWeight: 800 }}>{f.at}</Box> · {f.source} — {f.message}
                {f.meta ? ` (${f.meta})` : ''}
              </Typography>
            ))
          )}
        </Paper>
      ) : null}

      <Dialog open={emailDialogOpen} onClose={() => setEmailDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Queue email to exchange house</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="To"
              fullWidth
              required
              value={compose.to}
              onChange={(ev) => setCompose((c) => ({ ...c, to: ev.target.value }))}
              placeholder="treasury.partner@example.com"
            />
            <TextField
              label="Subject"
              fullWidth
              required
              value={compose.subject}
              onChange={(ev) => setCompose((c) => ({ ...c, subject: ev.target.value }))}
            />
            <TextField
              label="Body preview"
              fullWidth
              multiline
              minRows={3}
              value={compose.bodyPreview}
              onChange={(ev) => setCompose((c) => ({ ...c, bodyPreview: ev.target.value }))}
            />
            <TextField
              label="Exchange house (optional)"
              fullWidth
              value={compose.exchangeHouse}
              onChange={(ev) => setCompose((c) => ({ ...c, exchangeHouse: ev.target.value }))}
            />
            <TextField
              label="Report ref (optional)"
              fullWidth
              value={compose.reportRef}
              onChange={(ev) => setCompose((c) => ({ ...c, reportRef: ev.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => void submitCompose()}
            disabled={!compose.to.trim() || !compose.subject.trim()}
          >
            Queue
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={deliverySnack.open}
        autoHideDuration={7000}
        onClose={() => setDeliverySnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={deliverySnack.severity}
          variant="filled"
          onClose={() => setDeliverySnack((s) => ({ ...s, open: false }))}
          sx={{ width: '100%' }}
        >
          {deliverySnack.message}
        </Alert>
      </Snackbar>
    </Stack>
  )
}
