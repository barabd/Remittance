import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import ApiOutlinedIcon from '@mui/icons-material/ApiOutlined'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiBasePath, useLiveApi } from '../../api/config'
import { pingFrmsDevHealth } from '../../api/devHealth'
import {
  liveDashboardMetrics,
  liveListBlockedRemittances,
  liveListBulkHubEvents,
  liveListInvestigationCases,
  liveListQueue,
  liveListRegulatoryPackages,
  liveListSettlementWeekStats,
  liveScreenParties,
} from '../../api/live/client'
import { brand } from '../../theme/appTheme'
import {
  type IntegrationCategory,
  type IntegrationConnector,
  type IntegrationWebhookEvent,
  INTEGRATION_DEMO_EVENT,
} from '../../state/integrationDemoStore'
import {
  getConnectors,
  getWebhooks,
  recordWebhook,
  syncConnector,
} from '../../integrations/integrationHub/integrationHubRepository'

const CAT_LABEL: Record<IntegrationCategory, string> = {
  exchange_api: 'Exchange partners & Open API (#34)',
  domestic_rail: 'CBS, MFS & domestic rails (#35–#36)',
  payment_network: 'Cross-border & local payment networks (#40)',
}

export function IntegrationsDemoPage() {
  const live = useLiveApi()
  const [tab, setTab] = useState(0)
  const cats: IntegrationCategory[] = ['exchange_api', 'domestic_rail', 'payment_network']
  const activeCat = cats[tab]

  const [connectors, setConnectors] = useState<IntegrationConnector[]>([])
  const [log, setLog] = useState<IntegrationWebhookEvent[]>([])
  const [healthMsg, setHealthMsg] = useState<string | null>(null)
  const [metricsMsg, setMetricsMsg] = useState<string | null>(null)
  const [casesMsg, setCasesMsg] = useState<string | null>(null)
  const [bulkHubMsg, setBulkHubMsg] = useState<string | null>(null)
  const [settlementMsg, setSettlementMsg] = useState<string | null>(null)
  const [regulatoryMsg, setRegulatoryMsg] = useState<string | null>(null)
  const [queueMsg, setQueueMsg] = useState<string | null>(null)
  const [blockedMsg, setBlockedMsg] = useState<string | null>(null)
  const [screenMsg, setScreenMsg] = useState<string | null>(null)
  const [actionNotice, setActionNotice] = useState<string>('')
  const [workingId, setWorkingId] = useState<string>('')

  const refresh = useCallback(async () => {
    const c = await getConnectors()
    const w = await getWebhooks()
    setConnectors(c)
    setLog(w)
  }, [])

  useEffect(() => {
    refresh()
    window.addEventListener(INTEGRATION_DEMO_EVENT, refresh as unknown as EventListener)
    return () => window.removeEventListener(INTEGRATION_DEMO_EVENT, refresh as unknown as EventListener)
  }, [refresh])

  const filtered = useMemo(() => connectors.filter((c) => c.category === activeCat), [connectors, activeCat])

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
            Integration hub
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Named partners and rails appear as <Box component="span" sx={{ fontWeight: 900 }}>connected stubs</Box> (#34–#36, #40). Draft REST shapes live in{' '}
            <code>docs/API_CONTRACT.md</code> — this UI does not call live systems.
          </Typography>
        </Box>
        <Stack alignItems="flex-end" gap={0.75}>
          <Chip icon={<ApiOutlinedIcon />} label={`API base: ${apiBasePath()}`} />
          <Chip
            size="small"
            label={live ? 'VITE_USE_LIVE_API=true' : 'VITE_USE_LIVE_API=false'}
            sx={{ bgcolor: live ? 'rgba(66,171,72,0.14)' : 'rgba(0,0,0,0.06)' }}
          />
        </Stack>
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 900, mb: 0.5 }}>Direct FRMS API integration</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
          With <code>VITE_USE_LIVE_API=true</code>, the buttons below call <code>frms-ops-api</code> through the Vite proxy.
          Partner cards under the tabs remain as connected stubs until you map them to your core.
        </Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Button
            size="small"
            variant="outlined"
            onClick={async () => {
              setHealthMsg(null)
              try {
                const h = await pingFrmsDevHealth()
                setHealthMsg(JSON.stringify(h))
              } catch (e) {
                setHealthMsg(e instanceof Error ? e.message : 'Health check failed')
              }
            }}
          >
            Ping /api/health (dev)
          </Button>
          <Button
            size="small"
            variant="contained"
            disabled={!live}
            onClick={async () => {
              setMetricsMsg(null)
              try {
                const m = await liveDashboardMetrics()
                setMetricsMsg(JSON.stringify(m))
              } catch (e) {
                setMetricsMsg(e instanceof Error ? e.message : 'Request failed')
              }
            }}
          >
            GET /metrics/dashboard
          </Button>
          <Button
            size="small"
            variant="contained"
            disabled={!live}
            onClick={async () => {
              setCasesMsg(null)
              try {
                const p = await liveListInvestigationCases()
                setCasesMsg(JSON.stringify({ total: p.total, itemCount: p.items.length, sampleIds: p.items.slice(0, 3).map((c) => c.id) }))
              } catch (e) {
                setCasesMsg(e instanceof Error ? e.message : 'Request failed')
              }
            }}
          >
            GET /investigation-cases
          </Button>
          <Button
            size="small"
            variant="contained"
            disabled={!live}
            onClick={async () => {
              setBulkHubMsg(null)
              try {
                const p = await liveListBulkHubEvents()
                setBulkHubMsg(
                  JSON.stringify({
                    total: p.total,
                    itemCount: p.items.length,
                    sampleIds: p.items.slice(0, 3).map((e) => e.id),
                  }),
                )
              } catch (e) {
                setBulkHubMsg(e instanceof Error ? e.message : 'Request failed')
              }
            }}
          >
            GET /bulk-hub/events
          </Button>
          <Button
            size="small"
            variant="contained"
            disabled={!live}
            onClick={async () => {
              setSettlementMsg(null)
              try {
                const p = await liveListSettlementWeekStats()
                setSettlementMsg(JSON.stringify({ path: '/settlement/week-stats', itemCount: p.items.length }))
              } catch (e) {
                setSettlementMsg(e instanceof Error ? e.message : 'Request failed')
              }
            }}
          >
            GET /settlement/week-stats
          </Button>
          <Button
            size="small"
            variant="contained"
            disabled={!live}
            onClick={async () => {
              setRegulatoryMsg(null)
              try {
                const p = await liveListRegulatoryPackages()
                setRegulatoryMsg(JSON.stringify({ path: '/regulatory/packages', itemCount: p.items.length }))
              } catch (e) {
                setRegulatoryMsg(e instanceof Error ? e.message : 'Request failed')
              }
            }}
          >
            GET /regulatory/packages
          </Button>
          <Button
            size="small"
            variant="contained"
            disabled={!live}
            onClick={async () => {
              setQueueMsg(null)
              try {
                const p = await liveListQueue()
                setQueueMsg(
                  JSON.stringify({
                    path: '/remittances/queue',
                    itemCount: p.items.length,
                    samplePayTypes: p.items.slice(0, 3).map((q) => q.payType),
                  }),
                )
              } catch (e) {
                setQueueMsg(e instanceof Error ? e.message : 'Request failed')
              }
            }}
          >
            GET /remittances/queue
          </Button>
          <Button
            size="small"
            variant="contained"
            disabled={!live}
            onClick={async () => {
              setBlockedMsg(null)
              try {
                const p = await liveListBlockedRemittances({ page: '1', pageSize: '50' })
                setBlockedMsg(
                  JSON.stringify({
                    path: '/exchange-house/blocked-remittances',
                    total: p.total,
                    itemCount: p.items.length,
                  }),
                )
              } catch (e) {
                setBlockedMsg(e instanceof Error ? e.message : 'Request failed')
              }
            }}
          >
            GET /exchange-house/blocked-remittances
          </Button>
          <Button
            size="small"
            variant="contained"
            disabled={!live}
            onClick={async () => {
              setScreenMsg(null)
              try {
                const r = await liveScreenParties({
                  remittanceNo: 'REM-SCREEN-001',
                  remitter: 'Jane Doe',
                  beneficiary: 'Karim Mia',
                })
                setScreenMsg(JSON.stringify({ path: '/compliance/screen', alert: r.alert }))
              } catch (e) {
                setScreenMsg(e instanceof Error ? e.message : 'Request failed')
              }
            }}
          >
            POST /compliance/screen
          </Button>
        </Stack>
        {healthMsg ? (
          <Alert sx={{ mt: 1.5 }} severity={healthMsg.includes('ok') ? 'success' : 'warning'}>
            {healthMsg}
          </Alert>
        ) : null}
        {actionNotice ? (
          <Alert sx={{ mt: 1.5 }} severity="success" onClose={() => setActionNotice('')}>
            {actionNotice}
          </Alert>
        ) : null}
        {metricsMsg ? (
          <Alert sx={{ mt: 1.5 }} severity={metricsMsg.includes('worklist') || metricsMsg.includes('pending') ? 'info' : 'warning'}>
            {metricsMsg}
          </Alert>
        ) : null}
        {casesMsg ? (
          <Alert sx={{ mt: 1.5 }} severity={casesMsg.includes('itemCount') ? 'info' : 'warning'}>
            {casesMsg}
          </Alert>
        ) : null}
        {bulkHubMsg ? (
          <Alert sx={{ mt: 1.5 }} severity={bulkHubMsg.includes('itemCount') ? 'info' : 'warning'}>
            {bulkHubMsg}
          </Alert>
        ) : null}
        {settlementMsg ? (
          <Alert sx={{ mt: 1.5 }} severity={settlementMsg.includes('itemCount') ? 'info' : 'warning'}>
            {settlementMsg}
          </Alert>
        ) : null}
        {regulatoryMsg ? (
          <Alert sx={{ mt: 1.5 }} severity={regulatoryMsg.includes('itemCount') ? 'info' : 'warning'}>
            {regulatoryMsg}
          </Alert>
        ) : null}
        {queueMsg ? (
          <Alert sx={{ mt: 1.5 }} severity={queueMsg.includes('itemCount') ? 'info' : 'warning'}>
            {queueMsg}
          </Alert>
        ) : null}
        {blockedMsg ? (
          <Alert sx={{ mt: 1.5 }} severity={blockedMsg.includes('total') ? 'info' : 'warning'}>
            {blockedMsg}
          </Alert>
        ) : null}
        {screenMsg ? (
          <Alert sx={{ mt: 1.5 }} severity={screenMsg.includes('alert') ? 'info' : 'warning'}>
            {screenMsg}
          </Alert>
        ) : null}
      </Paper>

      <Paper sx={{ px: 2, pt: 1 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable">
          {cats.map((c, i) => (
            <Tab key={c} label={CAT_LABEL[c]} value={i} />
          ))}
        </Tabs>
      </Paper>

      <Stack spacing={1.5}>
        {filtered.map((c) => (
          <Paper key={c.id} variant="outlined" sx={{ p: 2, borderColor: 'divider' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
              <Box flex={1}>
                <Typography sx={{ fontWeight: 950 }}>{c.name}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  {c.region} · {c.protocol}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {c.notes}
                </Typography>
              </Box>
              <Stack spacing={1} alignItems={{ md: 'flex-end' }}>
                <Chip
                  size="small"
                  label={c.status}
                  sx={{
                    bgcolor:
                      c.status === 'Connected'
                        ? 'rgba(66,171,72,0.14)'
                        : c.status === 'Sandbox'
                          ? 'rgba(0,0,0,0.06)'
                          : 'rgba(0,0,0,0.08)',
                    color: c.status === 'Connected' ? brand.green : brand.black,
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  Last sync: {c.lastSync}
                </Typography>
                <Stack direction="row" gap={1} flexWrap="wrap">
                  <Button 
                    size="small" 
                    variant="outlined" 
                    disabled={workingId === c.id}
                    onClick={async () => {
                      setWorkingId(c.id)
                      try {
                        await syncConnector(c.id)
                        setActionNotice(`Connector ${c.id} synced.`)
                        await refresh()
                      } finally {
                        setWorkingId('')
                      }
                    }}
                  >
                    {workingId === c.id ? 'Syncing...' : 'Simulate poll'}
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    disabled={workingId === c.id}
                    onClick={async () => {
                      setWorkingId(c.id)
                      try {
                        await recordWebhook(c.id, 'inbound', `status_update tx=${Date.now().toString(36)}`)
                        setActionNotice(`Inbound webhook recorded for ${c.id}.`)
                        await refresh()
                      } finally {
                        setWorkingId('')
                      }
                    }}
                  >
                    {workingId === c.id ? 'Recording...' : 'Inbound webhook'}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={workingId === c.id}
                    onClick={async () => {
                      setWorkingId(c.id)
                      try {
                        await recordWebhook(c.id, 'outbound', `payment_instruction ack`)
                        setActionNotice(`Outbound webhook recorded for ${c.id}.`)
                        await refresh()
                      } finally {
                        setWorkingId('')
                      }
                    }}
                  >
                    {workingId === c.id ? 'Recording...' : 'Outbound'}
                  </Button>
                </Stack>
              </Stack>
            </Stack>
          </Paper>
        ))}
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 900, mb: 1 }}>Real-time event log</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
          #35 — mimics webhook / message traces for CBS, bKash, card networks, etc.
        </Typography>
        <Divider sx={{ mb: 1.5 }} />
        <Stack spacing={1} sx={{ maxHeight: 280, overflow: 'auto' }}>
          {log.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No events yet — use Inbound/Outbound on a connector.
            </Typography>
          ) : (
            log.slice(0, 40).map((e) => (
              <Paper key={e.id} variant="outlined" sx={{ p: 1, borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary">
                  {e.at} · {e.direction} · {e.connectorId}
                </Typography>
                <Typography variant="body2">{e.message}</Typography>
              </Paper>
            ))
          )}
        </Stack>
      </Paper>
    </Stack>
  )
}
