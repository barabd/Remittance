/** Demo integration catalog — partners, MFS, CBS, networks (#34–#35, #40). */

import { nowTs } from './mastersStore'

export type IntegrationCategory = 'exchange_api' | 'domestic_rail' | 'payment_network'

export type IntegrationConnector = {
  id: string
  category: IntegrationCategory
  name: string
  region: string
  protocol: 'REST Open API' | 'ISO 20022' | 'Webhooks' | 'File / SFTP' | 'Core SDK'
  status: 'Connected' | 'Paused' | 'Sandbox'
  lastSync: string
  notes: string
}

export type IntegrationWebhookEvent = {
  id: string
  at: string
  connectorId: string
  direction: 'inbound' | 'outbound'
  message: string
}

export const INTEGRATION_DEMO_EVENT = 'integrationDemo:changed'

const K_CONN = 'frms.integration.connectors.v1'
const K_LOG = 'frms.integration.webhookLog.v1'

function seedConnectors(): IntegrationConnector[] {
  return [
    {
      id: 'nec-uk',
      category: 'exchange_api',
      name: 'NEC Money Transfer Limited — UK',
      region: 'UK',
      protocol: 'REST Open API',
      status: 'Sandbox',
      lastSync: '2026-03-26 08:12',
      notes: 'Quote / send confirm webhooks (demo).',
    },
    {
      id: 'wse-kw',
      category: 'exchange_api',
      name: 'Wall Street Exchange Kuwait',
      region: 'KW',
      protocol: 'REST Open API',
      status: 'Connected',
      lastSync: '2026-03-26 08:44',
      notes: 'Batch settlement file + status API.',
    },
    {
      id: 'rajhi',
      category: 'exchange_api',
      name: 'Al Rajhi Banking & Investment Corp',
      region: 'SA',
      protocol: 'ISO 20022',
      status: 'Sandbox',
      lastSync: '2026-03-25 18:20',
      notes: 'pacs.008 style messages — stub parser (demo).',
    },
    {
      id: 'cbs-core',
      category: 'domestic_rail',
      name: 'Core Banking System (CBS)',
      region: 'BD',
      protocol: 'Core SDK',
      status: 'Connected',
      lastSync: '2026-03-26 08:55',
      notes: 'GL / account posting façade.',
    },
    {
      id: 'bkash',
      category: 'domestic_rail',
      name: 'bKash',
      region: 'BD',
      protocol: 'REST Open API',
      status: 'Connected',
      lastSync: '2026-03-26 08:50',
      notes: 'Disbursement status callbacks.',
    },
    {
      id: 'nagad',
      category: 'domestic_rail',
      name: 'Nagad',
      region: 'BD',
      protocol: 'REST Open API',
      status: 'Sandbox',
      lastSync: '2026-03-25 22:01',
      notes: 'Wallet payout simulation (demo).',
    },
    {
      id: 'small-world',
      category: 'exchange_api',
      name: 'Small World',
      region: 'Global',
      protocol: 'REST Open API',
      status: 'Sandbox',
      lastSync: '2026-03-24 15:30',
      notes: 'Corridor availability pull (demo).',
    },
    {
      id: 'continental-ria',
      category: 'exchange_api',
      name: 'Continental Ex Solutions (RIA)',
      region: 'Multi',
      protocol: 'File / SFTP',
      status: 'Connected',
      lastSync: '2026-03-26 07:00',
      notes: 'Inbound RIA manifest files.',
    },
    {
      id: 'mastercard-ts',
      category: 'payment_network',
      name: 'Mastercard Transaction Services (US) LLC',
      region: 'US',
      protocol: 'ISO 20022',
      status: 'Sandbox',
      lastSync: '2026-03-23 11:45',
      notes: 'Cross-border card-linked payout stub (demo).',
    },
    {
      id: 'swift-demo',
      category: 'payment_network',
      name: 'SWIFT / gpi (demo adapter)',
      region: 'Global',
      protocol: 'ISO 20022',
      status: 'Paused',
      lastSync: '2026-03-20 09:00',
      notes: '#40 — inward/outward message bridge (non-functional demo).',
    },
    {
      id: 'beftn-gw',
      category: 'payment_network',
      name: 'BEFTN gateway',
      region: 'BD',
      protocol: 'File / SFTP',
      status: 'Connected',
      lastSync: '2026-03-26 08:58',
      notes: '#36 — batch debit files.',
    },
    {
      id: 'rtgs-bd',
      category: 'payment_network',
      name: 'RTGS (Bangladesh)',
      region: 'BD',
      protocol: 'ISO 20022',
      status: 'Connected',
      lastSync: '2026-03-26 08:59',
      notes: 'High-value trace references.',
    },
    {
      id: 'npsb-switchDemo',
      category: 'payment_network',
      name: 'NPSB switch (demo)',
      region: 'BD',
      protocol: 'Webhooks',
      status: 'Sandbox',
      lastSync: '2026-03-25 16:10',
      notes: 'Instant retail rail simulation.',
    },
  ]
}

function readConn(): IntegrationConnector[] {
  try {
    const raw = localStorage.getItem(K_CONN)
    if (!raw) {
      const s = seedConnectors()
      localStorage.setItem(K_CONN, JSON.stringify(s))
      return s
    }
    return JSON.parse(raw) as IntegrationConnector[]
  } catch {
    return seedConnectors()
  }
}

function readLog(): IntegrationWebhookEvent[] {
  try {
    const raw = localStorage.getItem(K_LOG)
    if (!raw) return []
    return JSON.parse(raw) as IntegrationWebhookEvent[]
  } catch {
    return []
  }
}

function writeConn(rows: IntegrationConnector[]) {
  localStorage.setItem(K_CONN, JSON.stringify(rows))
  window.dispatchEvent(new CustomEvent(INTEGRATION_DEMO_EVENT))
}

function writeLog(rows: IntegrationWebhookEvent[]) {
  localStorage.setItem(K_LOG, JSON.stringify(rows.slice(0, 500)))
  window.dispatchEvent(new CustomEvent(INTEGRATION_DEMO_EVENT))
}

export function loadIntegrationConnectors(): IntegrationConnector[] {
  return readConn()
}

export function loadIntegrationWebhookLog(): IntegrationWebhookEvent[] {
  return readLog()
}

export function simulateConnectorSync(id: string) {
  const rows = readConn().map((c) => (c.id === id ? { ...c, lastSync: nowTs() } : c))
  writeConn(rows)
}

export function appendWebhookDemo(connectorId: string, direction: IntegrationWebhookEvent['direction'], message: string) {
  const ev: IntegrationWebhookEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: nowTs(),
    connectorId,
    direction,
    message,
  }
  writeLog([ev, ...readLog()])
}
