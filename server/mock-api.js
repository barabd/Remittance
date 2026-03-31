#!/usr/bin/env node
/**
 * Mock FRMS Operations API Server
 * Listens on port 4000 at /api/v1/*
 * Provides realistic mock responses for all dashboard endpoints
 */

const http = require('http')
const url = require('url')

const PORT = 4000
const hoEhBlocks = {}

// Helper functions
function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
  res.end(JSON.stringify(data, null, 2))
}

function sendText(res, status, text) {
  res.writeHead(status, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' })
  res.end(text)
}

function handleCORS(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    })
    res.end()
    return true
  }
  return false
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
    })
    req.on('end', () => {
      if (!raw) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch (e) {
        resolve({})
      }
    })
    req.on('error', () => resolve({}))
  })
}

// Mock data generators
function generateDashboardMetrics() {
  return {
    ok: true,
    service: 'admin-dashboard-dev',
    timestamp: new Date().toISOString(),
    stats: {
      worklist: Math.floor(Math.random() * 50) + 10,
      pending: Math.floor(Math.random() * 30) + 5,
      processed: Math.floor(Math.random() * 100) + 50,
      flagged: Math.floor(Math.random() * 10) + 2,
    },
  }
}

function generateInvestigationCases() {
  return {
    total: 23,
    items: [
      { id: 'IC-001', status: 'open', description: 'AML screening alert', createdAt: '2024-03-20' },
      { id: 'IC-002', status: 'resolved', description: 'Beneficiary verification', createdAt: '2024-03-19' },
      { id: 'IC-003', status: 'pending', description: 'Transaction review', createdAt: '2024-03-18' },
    ],
  }
}

function generateBulkHubEvents() {
  return {
    total: 156,
    items: [
      { id: 'BHE-001', type: 'import', status: 'completed', count: 500, at: new Date().toISOString() },
      { id: 'BHE-002', type: 'export', status: 'processing', count: 250, at: new Date().toISOString() },
      { id: 'BHE-003', type: 'sync', status: 'completed', count: 1000, at: new Date().toISOString() },
    ],
  }
}

function generateSettlementWeekStats() {
  return {
    total: 52,
    items: [
      { week: '2024-W13', settled: 125000, pending: 25000, failed: 5000 },
      { week: '2024-W12', settled: 140000, pending: 10000, failed: 2000 },
      { week: '2024-W11', settled: 155000, pending: 0, failed: 1000 },
    ],
  }
}

function generateRegulatoryPackages() {
  return {
    total: 18,
    items: [
      { id: 'RP-2024-01', type: 'quarterly', status: 'submitted', dueDate: '2024-03-31' },
      { id: 'RP-2024-02', type: 'annual', status: 'draft', dueDate: '2024-12-31' },
      { id: 'RP-2024-03', type: 'incident', status: 'completed', dueDate: '2024-03-15' },
    ],
  }
}

function generateQueue() {
  return {
    total: 42,
    items: [
      { id: 'REM-001', amount: 5000, payType: 'BEFTN', status: 'pending', createdAt: '2024-03-20' },
      { id: 'REM-002', amount: 10000, payType: 'Check', status: 'approved', createdAt: '2024-03-20' },
      { id: 'REM-003', amount: 3500, payType: 'Cash', status: 'pending', createdAt: '2024-03-19' },
    ],
  }
}

function generateBlockedRemittances() {
  return {
    total: 8,
    items: [
      { id: 'BR-001', remittanceNo: 'REM-BLOCK-001', reason: 'AML Match', blockedAt: '2024-03-20' },
      { id: 'BR-002', remittanceNo: 'REM-BLOCK-002', reason: 'Manual Review', blockedAt: '2024-03-19' },
    ],
  }
}

function generateScreenResponse() {
  return {
    alert: false,
    message: 'No risks detected',
    timestamp: new Date().toISOString(),
  }
}

function generateIntegrationConnectors() {
  return [
    { id: 'conn-01', name: 'bKash', status: 'Connected', protocol: 'REST', region: 'Bangladesh', category: 'domestic_rail', lastSync: 'now', notes: 'Mobile money' },
    { id: 'conn-02', name: 'BEFTN', status: 'Connected', protocol: 'FTP+XML', region: 'Bangladesh', category: 'domestic_rail', lastSync: 'now', notes: 'ACH batch processor' },
    { id: 'conn-03', name: 'Swift', status: 'Sandbox', protocol: 'SWIFT', region: 'Global', category: 'payment_network', lastSync: 'yesterday', notes: 'Cross-border messaging' },
  ]
}

function generateIntegrationWebhooks() {
  return []
}

// API routing
async function handleRequest(req, res, pathname, method) {
  // Handle CORS
  if (handleCORS(req, res)) return

  // Health check
  if (pathname === '/health') {
    return sendJson(res, 200, { ok: true, service: 'frms-ops-api-mock', port: 4000 })
  }

  // Dashboard metrics
  if (pathname === '/api/v1/metrics/dashboard' && method === 'GET') {
    return sendJson(res, 200, generateDashboardMetrics())
  }

  // Investigation cases
  if (pathname === '/api/v1/investigation-cases' && method === 'GET') {
    return sendJson(res, 200, generateInvestigationCases())
  }

  // Bulk hub events
  if (pathname === '/api/v1/bulk-hub/events' && method === 'GET') {
    return sendJson(res, 200, generateBulkHubEvents())
  }

  // Settlement week stats
  if (pathname === '/api/v1/settlement/week-stats' && method === 'GET') {
    return sendJson(res, 200, generateSettlementWeekStats())
  }

  // Regulatory packages
  if (pathname === '/api/v1/regulatory/packages' && method === 'GET') {
    return sendJson(res, 200, generateRegulatoryPackages())
  }

  // Remittance queue
  if (pathname === '/api/v1/remittances/queue' && method === 'GET') {
    return sendJson(res, 200, generateQueue())
  }

  // Blocked remittances
  if (pathname === '/api/v1/exchange-house/blocked-remittances' && method === 'GET') {
    return sendJson(res, 200, generateBlockedRemittances())
  }

  // Screen parties (compliance)
  if (pathname === '/api/v1/compliance/screen' && method === 'POST') {
    return sendJson(res, 200, generateScreenResponse())
  }

  // Integration connectors
  if (pathname === '/api/v1/integrations/connectors' && method === 'GET') {
    return sendJson(res, 200, generateIntegrationConnectors())
  }

  // Sync connector
  if (pathname.match(/^\/api\/v1\/integrations\/connectors\/[^/]+$/) && method === 'PATCH') {
    return sendJson(res, 200, { id: 'updated', status: 'synced', at: new Date().toISOString() })
  }

  // Integration webhooks
  if (pathname === '/api/v1/integrations/webhooks' && method === 'GET') {
    return sendJson(res, 200, generateIntegrationWebhooks())
  }

  // Post webhook
  if (pathname === '/api/v1/integrations/webhooks' && method === 'POST') {
    return sendJson(res, 201, { id: 'webhook-' + Date.now(), message: 'recorded' })
  }

  // Head Office - Role policies
  if (pathname === '/api/v1/ho/policies' && method === 'GET') {
    return sendJson(res, 200, [
      { role: 'Maker', makerMaxTxnBdt: 500000, checkerRequiredAboveBdt: 250000 },
      { role: 'Checker', makerMaxTxnBdt: 1000000, checkerRequiredAboveBdt: 500000 },
      { role: 'HO Admin', makerMaxTxnBdt: 5000000, checkerRequiredAboveBdt: 2000000 },
      { role: 'Finance', makerMaxTxnBdt: 10000000, checkerRequiredAboveBdt: 5000000 },
      { role: 'Auditor', makerMaxTxnBdt: 0, checkerRequiredAboveBdt: 0 },
    ])
  }

  // Head Office - Save policies
  if (pathname === '/api/v1/ho/policies' && method === 'POST') {
    return sendJson(res, 200, { message: 'Policies saved' })
  }

  // Head Office - Branch permissions
  if (pathname === '/api/v1/ho/branch-perms' && method === 'GET') {
    return sendJson(res, 200, [
      { branchCode: '101', branchName: 'Branch-01', canInitiateExchangeHouseBlock: true },
      { branchCode: '301', branchName: 'Sub-Branch-03', canInitiateExchangeHouseBlock: true },
      { branchCode: '000', branchName: 'Head Office', canInitiateExchangeHouseBlock: true },
    ])
  }

  // Head Office - Upsert branch permission
  if (pathname === '/api/v1/ho/branch-perms' && method === 'POST') {
    return sendJson(res, 200, { message: 'Branch permission updated' })
  }

  // Head Office - Exchange house blocks
  if (pathname === '/api/v1/ho/eh-blocks' && method === 'GET') {
    return sendJson(res, 200, hoEhBlocks)
  }

  // Head Office - Set EH block
  if (pathname.match(/^\/api\/v1\/ho\/eh-blocks\/[^/]+$/) && method === 'POST') {
    const code = decodeURIComponent((pathname.split('/').pop() || '')).trim()
    const body = await readJsonBody(req)
    const blocked = Boolean(body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'blocked') ? body.blocked : false)
    hoEhBlocks[code] = blocked
    return sendJson(res, 200, { message: 'Block status updated', code, blocked })
  }

  // Default 404
  sendJson(res, 404, { error: 'Endpoint not found', path: pathname })
}

// Create server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true)
  const pathname = parsedUrl.pathname
  const method = req.method

  console.log(`[${new Date().toISOString()}] ${method} ${pathname}`)

  try {
    Promise.resolve(handleRequest(req, res, pathname, method)).catch((err) => {
      console.error('Error:', err)
      sendJson(res, 500, { error: 'Internal server error', message: err.message })
    })
  } catch (err) {
    console.error('Error:', err)
    sendJson(res, 500, { error: 'Internal server error', message: err.message })
  }
})

server.listen(PORT, () => {
  console.log(`\n✅ Mock FRMS Operations API Server running on http://localhost:${PORT}`)
  console.log(`📍 Base path: /api/v1/*`)
  console.log(`🔌 Endpoints ready for dashboard`)
  console.log(`⏹️  Press Ctrl+C to stop\n`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`)
    console.error(`   Kill the process using: lsof -ti:${PORT} | xargs kill -9 (macOS/Linux)`)
    process.exit(1)
  } else {
    console.error('Server error:', err)
    process.exit(1)
  }
})
