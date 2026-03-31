// Mock FRMS Operations API Server (ES Module version)
// Listens on port 4000 at /api/v1/*

import http from 'http'
import url from 'url'

const PORT = 4000
const hoEhBlocks = {}
let investigationCases = [
  { id: 'CASE-001', title: 'Possible sanctions keyword match', source: 'AML', ref: 'REM-2026-000186', subject: 'Rahim Uddin', priority: 'High', status: 'Investigating', assignee: 'Compliance-01', createdAt: '2026-03-26 09:20', notes: [{ at: '2026-03-26 09:25', by: 'Compliance-01', text: 'Requested additional KYC docs (demo).' }] },
  { id: 'CASE-002', title: 'Reconciliation mismatch: Bank vs. Swift', source: 'Reconciliation', ref: 'SWIFT-99182', subject: 'Settlement Account', priority: 'Medium', status: 'Open', assignee: 'Analyst-02', createdAt: '2026-03-27 14:10', notes: [] },
  { id: 'CASE-003', title: 'Suspicious recurring transfers', source: 'AML', ref: 'REM-2026-000215', subject: 'Gulshan Ara', priority: 'High', status: 'Investigating', assignee: 'Compliance-01', createdAt: '2026-03-28 11:45', notes: [] },
]

let regulatoryPackages = [
  { id: 'RP-2026-001', kind: 'net_position_daily', title: 'Daily net position — 2026-03-29', period: '2026-03-29', summary: 'Net aggregate ৳140.2m across 8 counterparties.', status: 'Sent', destination: 'Bangladesh Bank / FI reporting portal', createdAt: '2026-03-29 18:05' },
  { id: 'RP-2026-002', kind: 'net_position_daily', title: 'Daily net position — 2026-03-30', period: '2026-03-30', summary: 'Net aggregate ৳155.5m across 8 counterparties.', status: 'Queued', destination: 'Bangladesh Bank / FI reporting portal', createdAt: '2026-03-30 18:10' },
  { id: 'RP-2026-003', kind: 'net_position_daily', title: 'Daily net position — 2026-03-31', period: '2026-03-31', summary: 'Net aggregate ৳125.0m across 8 counterparties.', status: 'Draft', destination: 'Bangladesh Bank / FI reporting portal', createdAt: '2026-03-31 14:15' },
]

let remittanceRecords = [
  { id: 'REM-2026-000184', remittanceNo: 'REM-2026-000184', exchangeHouse: 'EH-GULF-01', createdAt: '2026-03-25 10:14', corridor: 'USD → BDT', amount: '2,500.00 USD', remitter: 'John Smith', beneficiary: 'Rahim Uddin', maker: 'Branch-01', checker: 'HO-Checker', status: 'Approved', channel: 'BEFTN', photoIdType: 'Passport', photoIdRef: 'US-PPT-2024-184' },
  { id: 'REM-2026-000185', remittanceNo: 'REM-2026-000185', exchangeHouse: 'EH-RUH-02', createdAt: '2026-03-25 10:22', corridor: 'AED → BDT', amount: '4,000.00 AED', remitter: 'Ahmed Ali', beneficiary: 'Karim Mia', maker: 'Sub-Branch-03', status: 'Pending Approval', channel: 'MFS', photoIdType: 'National ID', photoIdRef: 'NID-AE-77821' },
  { id: 'REM-2026-000186', remittanceNo: 'REM-2026-000186', exchangeHouse: 'EH-GULF-01', createdAt: '2026-03-25 10:33', corridor: 'SAR → BDT', amount: '1,200.00 SAR', remitter: 'Mohammed Faisal', beneficiary: 'Nusrat Jahan', maker: 'Branch-02', status: 'On Hold', channel: 'RTGS', photoIdType: 'Passport', photoIdRef: 'PPT-SA-99102' },
]

let mlaSettings = {
  screeningMode: 'keywords',
  requirePhotoId: true,
  maxRemittancesPerRemitterPerDay: 5,
  maxBdtTotalPerRemitterPerDay: 500000,
  patternOneToManyMin: 3,
  patternManyToOneMin: 3,
  blockApprovalOnBusinessTerm: true,
  blockApprovalOnPattern: true,
  blockApprovalOnPrimaryAmlHit: true,
  blockApprovalOnOpacDsriHit: true,
  autoScreenOnSearchImport: true,
  countryKeywordsJson: '{}'
}

let riskProfiles = [
  { id: 'RP-01', customerName: 'John Smith', maxPerTxnBdt: 1000000, maxDailyTotalBdt: 2000000, watchLevel: 'Low', updatedAt: '2026-03-20 10:00' },
  { id: 'RP-02', customerName: 'Ahmed Ali', maxPerTxnBdt: 500000, maxDailyTotalBdt: 1000000, watchLevel: 'Medium', updatedAt: '2026-03-20 11:00' }
]

let disbursements = [
  { id: 'REM-2026-000210', remittanceNo: 'REM-2026-000210', createdAt: '2026-03-25 12:05', corridor: 'USD → BDT', channel: 'BEFTN', payoutTo: 'Bank A · 0123****89', payoutRef: 'BEFTN-942114', beneficiary: 'Rahim Uddin', amountBDT: '৳ 295,000.00', maker: 'Branch-01', status: 'Approved', checker: 'HO-Checker', originatingUnit: 'Branch' },
  { id: 'REM-2026-000211', remittanceNo: 'REM-2026-000211', createdAt: '2026-03-25 12:18', corridor: 'AED → BDT', channel: 'MFS', payoutTo: 'bKash · 01*********', payoutRef: '', beneficiary: 'Karim Mia', amountBDT: '৳ 132,500.00', maker: 'Sub-Branch-03', status: 'Pending Approval', originatingUnit: 'Sub-Branch' },
  { id: 'REM-2026-000212', remittanceNo: 'REM-2026-000212', createdAt: '2026-03-25 12:35', corridor: 'SAR → BDT', channel: 'RTGS', payoutTo: 'Bank B · 77********01', payoutRef: 'RTGS-118220', beneficiary: 'Nusrat Jahan', amountBDT: '৳ 39,800.00', maker: 'Branch-02', status: 'On Hold', originatingUnit: 'Branch' },
]

let disbursementAudits = {
  'REM-2026-000210': [
    { at: '2026-03-25 12:05', actor: 'Branch-01', action: 'Created for disbursement', details: 'BEFTN payout to Bank A · 0123****89' },
    { at: '2026-03-25 12:10', actor: 'System', action: 'Queued for maker-checker approval' },
    { at: '2026-03-25 12:55', actor: 'HO-Checker', action: 'Approved' }
  ],
  'REM-2026-000211': [
    { at: '2026-03-25 12:18', actor: 'Sub-Branch-03', action: 'Created for disbursement', details: 'MFS payout to bKash · 01*********' },
    { at: '2026-03-25 12:25', actor: 'System', action: 'Queued for maker-checker approval' }
  ],
  'REM-2026-000212': [
    { at: '2026-03-25 12:35', actor: 'Branch-02', action: 'Created for disbursement', details: 'RTGS payout to Bank B · 77********01' },
    { at: '2026-03-25 12:40', actor: 'System', action: 'Queued for maker-checker approval' },
    { at: '2026-03-25 12:45', actor: 'HO-Checker', action: 'Status: On hold', details: 'Verification required' }
  ]
}

let mastersAgents = [
  { id: 'AG-01', code: 'EH-GULF-01', name: 'Gulf Exchange', type: 'Exchange House', country: 'AE', contactPhone: '+971-50-000-0000', maker: 'HO-Admin', status: 'Active', createdAt: '2026-01-10 09:00' },
  { id: 'AG-02', code: 'EH-RUH-02', name: 'Riyadh Remit', type: 'Exchange House', country: 'SA', contactPhone: '+966-11-000-0000', maker: 'HO-Admin', status: 'Active', createdAt: '2026-01-12 11:30' },
  { id: 'AG-03', code: 'COR-BNY-01', name: 'BNY Mellon', type: 'Correspondent', country: 'US', contactPhone: '+1-212-000-0000', maker: 'HO-Admin', status: 'Pending Approval', createdAt: '2026-03-30 14:20' }
]

let mastersBeneficiaries = [
  { id: 'BEN-01', name: 'Rahim Uddin', phone: '01711000000', bankName: 'Islami Bank', accountNo: '1234567890123', district: 'Dhaka', branchName: 'Gulshan', maker: 'Sub-Branch-03', status: 'Active', createdAt: '2026-02-15 10:15' },
  { id: 'BEN-02', name: 'Karim Mia', phone: '01811000000', bankName: 'Dutch Bangla Bank', accountNo: '9876543210987', district: 'Chittagong', branchName: 'Agrabad', maker: 'Branch-01', status: 'Active', createdAt: '2026-02-18 14:45' }
]

let mastersAudits = {}



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
      } catch {
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
    total: investigationCases.length,
    items: investigationCases,
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
    total: regulatoryPackages.length,
    items: regulatoryPackages,
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
  if (pathname === '/api/v1/investigation-cases' && method === 'POST') {
    const body = await readJsonBody(req)
    const id = 'IC-NEW-' + Math.floor(Math.random() * 1000)
    const newCase = {
      id,
      title: body.title || 'New Case',
      source: body.source || 'Operational',
      ref: body.ref || null,
      subject: body.subject || null,
      priority: body.priority || 'Medium',
      status: 'Open',
      assignee: body.assignee || 'Compliance-01',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      notes: body.note ? [{ at: new Date().toISOString().replace('T', ' ').substring(0, 16), by: body.assignee || 'Compliance-01', text: body.note }] : []
    }
    investigationCases.unshift(newCase)
    return sendJson(res, 201, newCase)
  }

  // Case notes
  if (pathname.match(/^\/api\/v1\/investigation-cases\/[^/]+\/notes$/) && method === 'POST') {
    const id = pathname.split('/')[4]
    const body = await readJsonBody(req)
    const idx = investigationCases.findIndex(c => c.id === id)
    if (idx >= 0) {
      const note = { at: new Date().toISOString().replace('T', ' ').substring(0, 16), by: body.by || 'Analyst', text: body.text }
      investigationCases[idx].notes = [note, ...(investigationCases[idx].notes || [])]
      return sendJson(res, 200, investigationCases[idx])
    }
    return sendJson(res, 404, { error: 'Case not found' })
  }

  // Case patch (status)
  if (pathname.match(/^\/api\/v1\/investigation-cases\/[^/]+$/) && method === 'PATCH') {
    const id = pathname.split('/').pop()
    const body = await readJsonBody(req)
    const idx = investigationCases.findIndex(c => c.id === id)
    if (idx >= 0) {
      if (body.status) investigationCases[idx].status = body.status
      if (body.title) investigationCases[idx].title = body.title
      return sendJson(res, 200, investigationCases[idx])
    }
    return sendJson(res, 404, { error: 'Case not found' })
  }

  // Bulk hub events
  if (pathname === '/api/v1/bulk-hub/events' && method === 'GET') {
    return sendJson(res, 200, generateBulkHubEvents())
  }

  // Disbursements list
  if (pathname === '/api/v1/disbursements' && method === 'GET') {
    return sendJson(res, 200, { items: disbursements, total: disbursements.length, page: 1, pageSize: 200 })
  }

  // Disbursement audit
  if (pathname.match(/^\/api\/v1\/disbursements\/[^/]+\/audit$/) && method === 'GET') {
    const id = pathname.split('/')[4]
    return sendJson(res, 200, { events: disbursementAudits[id] || [] })
  }

  // Approve disbursement
  if (pathname.match(/^\/api\/v1\/disbursements\/[^/]+\/approve$/) && method === 'POST') {
    const id = pathname.split('/')[4]
    const body = await readJsonBody(req)
    const idx = disbursements.findIndex(d => d.id === id)
    if (idx >= 0) {
      disbursements[idx].status = 'Approved'
      disbursements[idx].checker = body.checkerUser || 'HO-Checker'
      if (!disbursementAudits[id]) disbursementAudits[id] = []
      disbursementAudits[id].push({ at: new Date().toISOString().replace('T', ' ').substring(0, 16), actor: body.checkerUser || 'HO-Checker', action: 'Approved' })
      return sendJson(res, 200, disbursements[idx])
    }
    return sendJson(res, 404, { error: 'Disbursement not found' })
  }

  // Reject disbursement
  if (pathname.match(/^\/api\/v1\/disbursements\/[^/]+\/reject$/) && method === 'POST') {
    const id = pathname.split('/')[4]
    const body = await readJsonBody(req)
    const idx = disbursements.findIndex(d => d.id === id)
    if (idx >= 0) {
      disbursements[idx].status = 'Rejected'
      disbursements[idx].checker = body.checkerUser || 'HO-Checker'
      if (!disbursementAudits[id]) disbursementAudits[id] = []
      disbursementAudits[id].push({ at: new Date().toISOString().replace('T', ' ').substring(0, 16), actor: body.checkerUser || 'HO-Checker', action: 'Rejected', details: body.reason })
      return sendJson(res, 200, disbursements[idx])
    }
    return sendJson(res, 404, { error: 'Disbursement not found' })
  }

  // Mark disbursed
  if (pathname.match(/^\/api\/v1\/disbursements\/[^/]+\/mark-disbursed$/) && method === 'POST') {
    const id = pathname.split('/')[4]
    const idx = disbursements.findIndex(d => d.id === id)
    if (idx >= 0) {
      disbursements[idx].status = 'Disbursed'
      disbursements[idx].payoutRef = `${disbursements[idx].channel}-${Math.floor(100000 + Math.random() * 899999)}`
      if (!disbursementAudits[id]) disbursementAudits[id] = []
      disbursementAudits[id].push({ at: new Date().toISOString().replace('T', ' ').substring(0, 16), actor: 'Ops', action: 'Marked disbursed', details: `Payout ref ${disbursements[idx].payoutRef}` })
      return sendJson(res, 200, disbursements[idx])
    }
    return sendJson(res, 404, { error: 'Disbursement not found' })
  }

  // Patch disbursement (Hold)
  if (pathname.match(/^\/api\/v1\/disbursements\/[^/]+$/) && method === 'PATCH') {
    const id = pathname.split('/').pop()
    const body = await readJsonBody(req)
    const idx = disbursements.findIndex(d => d.id === id)
    if (idx >= 0) {
      if (body.status) {
        disbursements[idx].status = body.status
        if (!disbursementAudits[id]) disbursementAudits[id] = []
        disbursementAudits[id].push({ at: new Date().toISOString().replace('T', ' ').substring(0, 16), actor: 'System', action: `Status: ${body.status}` })
      }
      return sendJson(res, 200, disbursements[idx])
    }
    return sendJson(res, 404, { error: 'Disbursement not found' })
  }

  // Settlement week stats
  if (pathname === '/api/v1/settlement/week-stats' && method === 'GET') {
    return sendJson(res, 200, generateSettlementWeekStats())
  }

  // Regulatory packages
  if (pathname === '/api/v1/regulatory/packages' && method === 'GET') {
    return sendJson(res, 200, generateRegulatoryPackages())
  }
  if (pathname === '/api/v1/regulatory/packages' && method === 'POST') {
    const body = await readJsonBody(req)
    const id = 'REG-NEW-' + Math.floor(Math.random() * 1000)
    const pkg = {
      id,
      kind: 'net_position_daily',
      title: `Daily net position — ${body.period || 'today'}`,
      period: body.period || 'today',
      summary: body.summary || 'Summary',
      status: 'Draft',
      destination: 'Bangladesh Bank / FI reporting portal',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    }
    regulatoryPackages.unshift(pkg)
    return sendJson(res, 201, pkg)
  }

  // Advance package
  if (pathname.match(/^\/api\/v1\/regulatory\/packages\/[^/]+\/advance$/) && (method === 'POST' || method === 'PATCH')) {
    const id = pathname.split('/')[5]
    const idx = regulatoryPackages.findIndex(p => p.id === id)
    if (idx >= 0) {
      const cur = regulatoryPackages[idx].status
      const next = cur === 'Draft' ? 'Queued' : cur === 'Queued' ? 'Sent' : cur === 'Sent' ? 'Ack' : 'Draft'
      regulatoryPackages[idx].status = next
      return sendJson(res, 200, regulatoryPackages[idx])
    }
    return sendJson(res, 404, { error: 'Package not found' })
  }

  // Remittance queue
  if (pathname === '/api/v1/remittances/queue' && method === 'GET') {
    return sendJson(res, 200, generateQueue())
  }

  // Blocked remittances
  if (pathname === '/api/v1/exchange-house/blocked-remittances' && method === 'GET') {
    return sendJson(res, 200, generateBlockedRemittances())
  }

  // Compliance MLAs
  if (pathname === '/api/v1/compliance/mla-settings' && method === 'GET') {
    return sendJson(res, 200, mlaSettings)
  }
  if (pathname === '/api/v1/compliance/risk-controls' && method === 'GET') {
    return sendJson(res, 200, { items: riskProfiles, total: riskProfiles.length, page: 1, pageSize: 50 })
  }

  // Remittance search & tracking
  if (pathname === '/api/v1/remittances/records' && method === 'GET') {
    return sendJson(res, 200, { items: remittanceRecords, total: remittanceRecords.length, page: 1, pageSize: 50 })
  }

  // Approve remittance record
  if (pathname.match(/^\/api\/v1\/remittances\/records\/[^/]+\/approve$/) && method === 'POST') {
    const id = pathname.split('/')[5]
    const body = await readJsonBody(req)
    const idx = remittanceRecords.findIndex(r => r.id === id)
    if (idx >= 0) {
      if (remittanceRecords[idx].status === 'Approved') {
         return sendJson(res, 400, { error: 'Bad Request', message: 'Record already approved' })
      }
      remittanceRecords[idx].status = 'Approved'
      remittanceRecords[idx].checker = body.checkerUser || 'HO-Checker-01'
      return sendJson(res, 200, remittanceRecords[idx])
    }
    return sendJson(res, 404, { error: 'Record not found' })
  }

  // Patch remittance record (Hold, Reject, etc.)
  if (pathname.match(/^\/api\/v1\/remittances\/records\/[^/]+$/) && method === 'PATCH') {
    const id = pathname.split('/').pop()
    const body = await readJsonBody(req)
    const idx = remittanceRecords.findIndex(r => r.id === id)
    if (idx >= 0) {
      if (body.status) remittanceRecords[idx].status = body.status
      if (body.checker) remittanceRecords[idx].checker = body.checker
      if (body.photoIdType) remittanceRecords[idx].photoIdType = body.photoIdType
      if (body.photoIdRef) remittanceRecords[idx].photoIdRef = body.photoIdRef
      return sendJson(res, 200, remittanceRecords[idx])
    }
    return sendJson(res, 404, { error: 'Record not found' })
  }

  // Remittance record audit
  if (pathname.match(/^\/api\/v1\/remittances\/records\/[^/]+\/audit$/) && method === 'GET') {
    const id = pathname.split('/')[5]
    // Mock: return some base events + any in-memory additions
    const records = [
      { at: '2026-03-25 10:14', actor: 'Branch-01', action: 'Created remittance', details: 'Imported from system' },
      { at: '2026-03-25 10:20', actor: 'System', action: 'AML Screened', details: 'No hits found' }
    ]
    return sendJson(res, 200, { events: records })
  }

  // Remittance single entry IDs
  if (pathname === '/api/v1/remittances/single-entry/id-preview' && method === 'GET') {
    return sendJson(res, 200, {
      nextIds: {
        remitterId: 'RE-' + Math.floor(Math.random() * 10000),
        beneficiaryId: 'BE-' + Math.floor(Math.random() * 10000),
        remittanceNo: 'RN-' + Math.floor(Math.random() * 10000),
        moneyReceiptNo: 'MR-' + Math.floor(Math.random() * 10000)
      }
    })
  }

  if (pathname === '/api/v1/remittances/single-entry/reserve-ids' && method === 'POST') {
    return sendJson(res, 200, {
      nextIds: {
        remitterId: 'RE-RES-' + Math.floor(Math.random() * 10000),
        beneficiaryId: 'BE-RES-' + Math.floor(Math.random() * 10000),
        remittanceNo: 'RN-RES-' + Math.floor(Math.random() * 10000),
        moneyReceiptNo: 'MR-RES-' + Math.floor(Math.random() * 10000)
      }
    })
  }

  // Submit single entry
  if (pathname === '/api/v1/remittances/single-entry' && method === 'POST') {
    const body = await readJsonBody(req)
    const id = body.remittanceNo || 'RE-' + Date.now()
    const record = {
      id,
      remittanceNo: id,
      exchangeHouse: 'EH-LIVE-01',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      corridor: `${body.fromCcy} → ${body.toCcy}`,
      amount: `${body.amount} ${body.fromCcy}`,
      remitter: body.remitterName,
      beneficiary: body.beneficiaryName,
      maker: 'EH-SUBMITTER',
      status: 'Pending Approval',
      channel: body.paymentMethod === 'Any' ? 'BEFTN' : body.paymentMethod,
      photoIdType: body.photoIdType,
      photoIdRef: body.photoIdRef
    }
    remittanceRecords.unshift(record)
    return sendJson(res, 201, {
      record,
      nextIds: {
        remitterId: 'RE-NEXT-' + Math.floor(Math.random() * 10000),
        beneficiaryId: 'BE-NEXT-' + Math.floor(Math.random() * 10000),
        remittanceNo: 'RN-NEXT-' + Math.floor(Math.random() * 10000),
        moneyReceiptNo: 'MR-NEXT-' + Math.floor(Math.random() * 10000)
      }
    })
  }

  // AML screening
  if (pathname === '/api/v1/compliance/screen' && method === 'POST') {
    const body = await readJsonBody(req)
    const match = body.remitter.includes('Rahim') || body.beneficiary.includes('Rahim') ? 'Possible' : 'None'
    const alert = match === 'Possible' ? {
      id: 'AL-' + Date.now(),
      remittanceNo: body.remittanceNo,
      screenedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      match: 'Possible',
      list: 'Local',
      score: 85,
      status: 'Open',
      subjectHint: 'Sanction watch list overlap'
    } : null
    return sendJson(res, 200, { alert })
  }

  // Agents Master
  if (pathname === '/api/v1/agents' && method === 'GET') {
    return sendJson(res, 200, { items: mastersAgents, total: mastersAgents.length, page: 1, pageSize: 200 })
  }
  if (pathname === '/api/v1/agents' && method === 'POST') {
    const body = await readJsonBody(req)
    const id = 'AG-' + Date.now()
    const record = {
      id,
      ...body,
      maker: body.maker || 'HO-Admin',
      status: 'Pending Approval',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    }
    mastersAgents.unshift(record)
    if (!mastersAudits[id]) mastersAudits[id] = []
    mastersAudits[id].push({ at: record.createdAt, actor: record.maker, action: 'Registered / Created', details: `${record.code} · ${record.name}` })
    return sendJson(res, 201, record)
  }
  if (pathname.match(/^\/api\/v1\/agents\/[^/]+\/audit$/) && method === 'GET') {
    const id = pathname.split('/')[4]
    return sendJson(res, 200, { events: mastersAudits[id] || [] })
  }
  if (pathname.match(/^\/api\/v1\/agents\/[^/]+\/approve$/) && method === 'POST') {
    const id = pathname.split('/')[4]
    const body = await readJsonBody(req)
    const idx = mastersAgents.findIndex(a => a.id === id)
    if (idx >= 0) {
      mastersAgents[idx].status = 'Active'
      mastersAgents[idx].checker = body.checkerUser || 'HO-Checker'
      if (!mastersAudits[id]) mastersAudits[id] = []
      mastersAudits[id].push({ at: new Date().toISOString().replace('T', ' ').substring(0, 16), actor: body.checkerUser || 'HO-Checker', action: 'Approved (Master)' })
      return sendJson(res, 200, mastersAgents[idx])
    }
    return sendJson(res, 404, { error: 'Agent not found' })
  }
  if (pathname.match(/^\/api\/v1\/agents\/[^/]+$/) && method === 'PATCH') {
    const id = pathname.split('/').pop()
    const body = await readJsonBody(req)
    const idx = mastersAgents.findIndex(a => a.id === id)
    if (idx >= 0) {
      Object.assign(mastersAgents[idx], body)
      if (!mastersAudits[id]) mastersAudits[id] = []
      mastersAudits[id].push({ at: new Date().toISOString().replace('T', ' ').substring(0, 16), actor: 'System', action: 'Updated / Patched', details: JSON.stringify(body) })
      return sendJson(res, 200, mastersAgents[idx])
    }
    return sendJson(res, 404, { error: 'Agent not found' })
  }

  // Beneficiaries Master
  if (pathname === '/api/v1/beneficiaries' && method === 'GET') {
    return sendJson(res, 200, { items: mastersBeneficiaries, total: mastersBeneficiaries.length, page: 1, pageSize: 200 })
  }
  if (pathname === '/api/v1/beneficiaries' && method === 'POST') {
    const body = await readJsonBody(req)
    const id = 'BEN-' + Date.now()
    const record = {
      id,
      ...body,
      maker: body.maker || 'Branch-User',
      status: 'Pending Approval',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    }
    mastersBeneficiaries.unshift(record)
    return sendJson(res, 201, record)
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
    const code = decodeURIComponent(pathname.split('/').pop() ?? '').trim()
    const body = await readJsonBody(req)
    const blocked = Boolean(body && typeof body === 'object' && 'blocked' in body ? body.blocked : false)
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
    console.error(`   Kill the process using: netstat -ano | findstr :${PORT} (Windows)`)
    process.exit(1)
  } else {
    console.error('Server error:', err)
    process.exit(1)
  }
})
