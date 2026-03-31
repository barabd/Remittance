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
  Drawer,
  IconButton,
  Link as MuiLink,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import GppGoodOutlinedIcon from '@mui/icons-material/GppGoodOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined'
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined'
import DoneOutlinedIcon from '@mui/icons-material/DoneOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import PauseCircleOutlineOutlinedIcon from '@mui/icons-material/PauseCircleOutlineOutlined'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { brand } from '../theme/appTheme'
import { pickMapped } from '../lib/excelMap'
import { publishOpsMetrics } from '../state/opsMetricsStore'
import { MASTERS_CHANGED_EVENT } from '../state/mastersStore'
import { activeBeneficiaryNameSet, isActiveBeneficiary } from '../lib/beneficiaryRegistry'
import { runScreeningForRemittance } from '../lib/screening'
import { registerBatch, validateIncomingBatch } from '../state/duplicateIndexStore'
import { pushOperationalNotification } from '../state/operationalNotificationsStore'
import { appendFeedback } from '../state/feedbackLogStore'
import { ApiHttpError } from '../api/http'
import { useLiveApi } from '../api/config'
import type { RemittanceDto } from '../api/types'
import {
  liveApproveRemittanceRecord,
  liveGetRemittanceAudit,
  liveListRemittances,
  livePatchRemittanceRecord,
  liveScreenParties,
} from '../api/live/client'
import { syncMlaSettingsFromLive } from '../integrations/mlaSettings/mlaSettingsRepository'
import { appendAmlAlert, createAmlAlertFromScreening, type AmlAlertRow } from '../state/amlAlertsStore'
import {
  FILE_MAPPING_EVENT,
  type FileMappingProfile,
  getDefaultSearchProfileId,
  getMappingProfile,
  loadMappingProfiles,
  searchHeadersFor,
} from '../state/fileMappingStore'
import { computeRemittanceIncentive, estimateBdtEquivalent, parseAmountDisplay } from '../state/incentiveStore'
import { verifyCoverFundForCurrency } from '../state/coverFundGuardStore'
import { evaluateRiskForApproval, syncRiskProfilesFromLive } from '../state/riskControlStore'
import { upsertBlockedRemittance } from '../state/blockedRemittanceStore'
import {
  AML_COMPLIANCE_SETTINGS_EVENT,
  loadAmlComplianceSettings,
} from '../state/amlComplianceSettingsStore'
import {
  appendRemittanceAudit,
  loadRemittanceAudit,
  REMITTANCE_AUDIT_EVENT,
} from '../state/remittanceAuditTrailStore'
import {
  analyzeStructuringPatterns,
  assertPhotoIdOk,
  evaluateRemitterDailyLimits,
  getHighRiskBusinessBlockReason,
  partitionHits,
  runDoubleAmlScreening,
} from '../lib/amlCompliance'

type RemittanceStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Sent'
  | 'Paid'
  | 'Stopped'
  | 'Returned'
  | 'Rejected'
  | 'On Hold'

type RemittanceRow = {
  id: string
  remittanceNo: string
  exchangeHouse: string
  createdAt: string
  corridor: string
  amount: string
  remitter: string
  beneficiary: string
  maker: string
  checker?: string
  status: RemittanceStatus
  channel: 'BEFTN' | 'RTGS' | 'NPSB' | 'MFS' | 'Cash'
  /** MLA / KYC — required when enabled under Compliance → MLA settings */
  photoIdType?: string
  photoIdRef?: string
  /** Set on Excel import (#30); otherwise derived in grid from amount. */
  incentiveBdt?: number
  incentiveRule?: string
}

type AuditEvent = {
  at: string
  actor: string
  action: string
  details?: string
}

const seedRows: RemittanceRow[] = [
  {
    id: 'REM-2026-000184',
    remittanceNo: 'REM-2026-000184',
    exchangeHouse: 'EH-GULF-01',
    createdAt: '2026-03-25 10:14',
    corridor: 'USD → BDT',
    amount: '2,500.00 USD',
    remitter: 'John Smith',
    beneficiary: 'Rahim Uddin',
    maker: 'Branch-01',
    checker: 'HO-Checker',
    status: 'Approved',
    channel: 'BEFTN',
    photoIdType: 'Passport',
    photoIdRef: 'US-PPT-2024-184',
  },
  {
    id: 'REM-2026-000185',
    remittanceNo: 'REM-2026-000185',
    exchangeHouse: 'EH-RUH-02',
    createdAt: '2026-03-25 10:22',
    corridor: 'AED → BDT',
    amount: '4,000.00 AED',
    remitter: 'Ahmed Ali',
    beneficiary: 'Karim Mia',
    maker: 'Sub-Branch-03',
    status: 'Pending Approval',
    channel: 'MFS',
    photoIdType: 'National ID',
    photoIdRef: 'NID-AE-77821',
  },
  {
    id: 'REM-2026-000186',
    remittanceNo: 'REM-2026-000186',
    exchangeHouse: 'EH-GULF-01',
    createdAt: '2026-03-25 10:33',
    corridor: 'SAR → BDT',
    amount: '1,200.00 SAR',
    remitter: 'Mohammed Faisal',
    beneficiary: 'Nusrat Jahan',
    maker: 'Branch-02',
    status: 'On Hold',
    channel: 'RTGS',
    photoIdType: 'Passport',
    photoIdRef: 'PPT-SA-99102',
  },
] as const

function statusChip(status: RemittanceStatus) {
  const map: Record<
    RemittanceStatus,
    { bg: string; fg: string }
  > = {
    Draft: { bg: 'rgba(0,0,0,0.06)', fg: brand.black },
    'Pending Approval': { bg: 'rgba(255,255,255,0.22)', fg: brand.black },
    Approved: { bg: 'rgba(66,171,72,0.14)', fg: brand.green },
    Sent: { bg: 'rgba(0,0,0,0.06)', fg: brand.black },
    Paid: { bg: 'rgba(66,171,72,0.14)', fg: brand.green },
    Stopped: { bg: 'rgba(0,0,0,0.08)', fg: brand.black },
    Returned: { bg: 'rgba(0,0,0,0.08)', fg: brand.black },
    Rejected: { bg: 'rgba(0,0,0,0.08)', fg: brand.black },
    'On Hold': { bg: 'rgba(0,0,0,0.06)', fg: brand.black },
  }
  return map[status]
}

function isValidDateStr(s: string) {
  // expects yyyy-mm-dd
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

const STATUS_SET = new Set<RemittanceStatus>([
  'Draft',
  'Pending Approval',
  'Approved',
  'Sent',
  'Paid',
  'Stopped',
  'Returned',
  'Rejected',
  'On Hold',
])

function parseChannel(raw: string): RemittanceRow['channel'] {
  const x = raw.trim()
  if (x === 'BEFTN' || x === 'RTGS' || x === 'NPSB' || x === 'MFS' || x === 'Cash') return x
  return 'Cash'
}

function withinRange(rowCreatedAt: string, from?: string, to?: string) {
  if (!from && !to) return true
  const datePart = rowCreatedAt.slice(0, 10)
  if (!isValidDateStr(datePart)) return true
  const d = new Date(datePart + 'T00:00:00Z').getTime()
  if (from) {
    const f = new Date(from + 'T00:00:00Z').getTime()
    if (d < f) return false
  }
  if (to) {
    const t = new Date(to + 'T23:59:59Z').getTime()
    if (d > t) return false
  }
  return true
}

function parseExcelRows(file: File, profile: FileMappingProfile | undefined): Promise<RemittanceRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
          defval: '',
        })

        const out: RemittanceRow[] = json
          .map((r, idx) => {
            const remittanceNo = pickMapped(r, searchHeadersFor(profile, 'remittanceNo'))
            if (!remittanceNo) return null
            const createdAt =
              pickMapped(r, searchHeadersFor(profile, 'createdAt')) || '2026-03-25 00:00'
            const corridor = pickMapped(r, searchHeadersFor(profile, 'corridor')) || 'USD → BDT'
            const amount = pickMapped(r, searchHeadersFor(profile, 'amount')) || '0'
            const maker = pickMapped(r, searchHeadersFor(profile, 'maker')) || 'Excel'
            const statusRaw = pickMapped(r, searchHeadersFor(profile, 'status'))
            const status: RemittanceStatus = STATUS_SET.has(statusRaw as RemittanceStatus)
              ? (statusRaw as RemittanceStatus)
              : 'Draft'
            const channel = parseChannel(pickMapped(r, searchHeadersFor(profile, 'channel')))
            const remitter = pickMapped(r, searchHeadersFor(profile, 'remitter')) || 'Unknown'
            const beneficiary = pickMapped(r, searchHeadersFor(profile, 'beneficiary')) || 'Unknown'
            const exchangeHouse =
              pickMapped(r, searchHeadersFor(profile, 'exchangeHouse')) || 'UNKNOWN-EH'
            const photoIdType = pickMapped(r, searchHeadersFor(profile, 'photoIdType'))
            const photoIdRef = pickMapped(r, searchHeadersFor(profile, 'photoIdRef'))

            const { num, ccy } = parseAmountDisplay(amount)
            const inc = computeRemittanceIncentive(num, ccy, exchangeHouse)

            return {
              id: remittanceNo || `X-${idx}`,
              remittanceNo,
              exchangeHouse,
              createdAt,
              corridor,
              amount,
              remitter,
              beneficiary,
              maker,
              checker: '',
              status,
              channel,
              photoIdType: photoIdType || undefined,
              photoIdRef: photoIdRef || undefined,
              incentiveBdt: inc.incentiveBdt,
              incentiveRule: inc.rule,
            } satisfies RemittanceRow
          })
          .filter(Boolean) as RemittanceRow[]

        resolve(out)
      } catch (e) {
        reject(e)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

function remittanceDtoToRow(d: RemittanceDto, prev: RemittanceRow): RemittanceRow {
  const exchangeHouse = String(d.exchangeHouse ?? prev.exchangeHouse ?? '').trim() || 'LIVE-API'
  const amount = String(d.amount ?? prev.amount)
  const { num, ccy } = parseAmountDisplay(amount)
  const inc = computeRemittanceIncentive(num, ccy, exchangeHouse)
  const statusRaw = String(d.status ?? prev.status)
  return {
    id: String(d.id ?? prev.id),
    remittanceNo: String(d.remittanceNo ?? prev.remittanceNo),
    exchangeHouse,
    createdAt: String(d.createdAt ?? prev.createdAt),
    corridor: String(d.corridor ?? prev.corridor),
    amount,
    remitter: String(d.remitter ?? prev.remitter),
    beneficiary: String(d.beneficiary ?? prev.beneficiary),
    maker: String(d.maker ?? prev.maker),
    checker: d.checker != null ? String(d.checker) : prev.checker,
    status: STATUS_SET.has(statusRaw as RemittanceStatus) ? (statusRaw as RemittanceStatus) : prev.status,
    channel: parseChannel(String(d.channel ?? prev.channel)),
    photoIdType: String(d.photoIdType ?? prev.photoIdType ?? '').trim() || undefined,
    photoIdRef: String(d.photoIdRef ?? prev.photoIdRef ?? '').trim() || undefined,
    incentiveBdt: inc.incentiveBdt,
    incentiveRule: inc.rule,
  }
}

function amlDtoToRow(d: {
  id: string
  remittanceNo: string
  screenedAt: string
  match: 'None' | 'Possible'
  list: AmlAlertRow['list']
  score: number
  status: 'Open' | 'Investigating'
  subjectHint?: string
}): AmlAlertRow {
  return {
    id: d.id,
    remittanceNo: d.remittanceNo,
    screenedAt: d.screenedAt,
    match: d.match,
    list: d.list,
    score: d.score,
    status: d.status,
    subjectHint: d.subjectHint,
  }
}

export function RemittanceSearchPage() {
  const liveApi = useLiveApi()
  const [searchParams] = useSearchParams()

  const [rows, setRows] = useState<RemittanceRow[]>(() => [...seedRows])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [liveError, setLiveError] = useState<string | null>(null)
  const selectedRow = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  )

  const [filters, setFilters] = useState({
    query: '',
    status: '' as '' | RemittanceStatus,
    fromDate: '',
    toDate: '',
    maker: '',
  })
  const [filterError, setFilterError] = useState<string>('')

  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string>('')
  const [uploadPreviewCount, setUploadPreviewCount] = useState<number>(0)
  const [excelProfileId, setExcelProfileId] = useState(() => getDefaultSearchProfileId())
  const [mappingProfiles, setMappingProfiles] = useState(loadMappingProfiles)

  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false)
  const [auditRev, setAuditRev] = useState(0)
  const [mlaRev, setMlaRev] = useState(0)

  const [benNames, setBenNames] = useState(() => activeBeneficiaryNameSet())
  const [snack, setSnack] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'info' | 'warning' | 'error'
  }>({ open: false, message: '', severity: 'info' })
  const [acting, setActing] = useState(false)
  const [serverAudit, setServerAudit] = useState<AuditEvent[]>([])

  useEffect(() => {
    const sync = () => setBenNames(activeBeneficiaryNameSet())
    sync()
    window.addEventListener(MASTERS_CHANGED_EVENT, sync as EventListener)
    return () => window.removeEventListener(MASTERS_CHANGED_EVENT, sync as EventListener)
  }, [])

  useEffect(() => {
    const sync = () => setMappingProfiles(loadMappingProfiles())
    window.addEventListener(FILE_MAPPING_EVENT, sync as EventListener)
    return () => window.removeEventListener(FILE_MAPPING_EVENT, sync as EventListener)
  }, [])

  useEffect(() => {
    publishOpsMetrics({ remittanceSearchRows: rows.length })
  }, [rows])

  /** Deep-link from Investigation cases (and bookmarks): ?remittanceNo= or ?q= */
  useEffect(() => {
    const fromUrl = (searchParams.get('remittanceNo') ?? searchParams.get('q') ?? '').trim()
    if (!fromUrl) return
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) setFilters((f) => ({ ...f, query: fromUrl }))
    })
    return () => {
      cancelled = true
    }
  }, [searchParams])

  useEffect(() => {
    const fromUrl = (searchParams.get('remittanceNo') ?? searchParams.get('q') ?? '').trim()
    if (!fromUrl || rows.length === 0) return
    const q = fromUrl.toLowerCase()
    const exact = rows.find((r) => r.remittanceNo.toLowerCase() === q || r.id.toLowerCase() === q)
    const partial = exact ?? rows.find((r) => r.remittanceNo.toLowerCase().includes(q))
    if (!partial) return
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) setSelectedId(partial.id)
    })
    return () => {
      cancelled = true
    }
  }, [searchParams, rows])

  useEffect(() => {
    if (!liveApi) return
    void syncMlaSettingsFromLive().catch(() => {})
    void syncRiskProfilesFromLive().catch(() => {})
  }, [liveApi])

  useEffect(() => {
    let cancelled = false
    async function pullInitial() {
      if (!liveApi) return
      setLiveError(null)
      try {
        const queryParams: Record<string, string> = { page: '1', pageSize: '50' }
        if (filters.query) queryParams.q = filters.query
        if (filters.status) queryParams.status = filters.status
        
        const p = await liveListRemittances(queryParams)
        const next: RemittanceRow[] = p.items.map((raw, idx) => {
          const d = raw as Record<string, unknown>
          const amount = String(d.amount ?? '0')
          const exchangeHouse = String(d.exchangeHouse ?? '').trim() || 'LIVE-API'
          const { num, ccy } = parseAmountDisplay(amount)
          const inc = computeRemittanceIncentive(num, ccy, exchangeHouse)
          const ch = parseChannel(String(d.channel ?? ''))
          const statusRaw = String(d.status ?? '')
          return {
            id: String(d.id ?? d.remittanceNo ?? `LIVE-${idx}`),
            remittanceNo: String(d.remittanceNo ?? ''),
            exchangeHouse,
            createdAt: String(d.createdAt ?? ''),
            corridor: String(d.corridor ?? ''),
            amount,
            remitter: String(d.remitter ?? ''),
            beneficiary: String(d.beneficiary ?? ''),
            maker: String(d.maker ?? ''),
            checker: d.checker != null ? String(d.checker) : undefined,
            status: STATUS_SET.has(statusRaw as RemittanceStatus) ? (statusRaw as RemittanceStatus) : 'Draft',
            channel: ch,
            photoIdType: String(d.photoIdType ?? '').trim() || undefined,
            photoIdRef: String(d.photoIdRef ?? '').trim() || undefined,
            incentiveBdt: inc.incentiveBdt,
            incentiveRule: inc.rule,
          }
        })
        if (!cancelled) {
          setRows(next)
          setSelectedId(null)
        }
      } catch (e) {
        if (!cancelled) setLiveError(e instanceof Error ? e.message : 'Live API failed')
      }
    }
    void pullInitial()
    return () => {
      cancelled = true
    }
  }, [liveApi, auditRev]) // Re-fetch on auditRev to show state changes if server handles them

  useEffect(() => {
    registerBatch(rows.map((r) => ({ exchangeHouse: r.exchangeHouse, remittanceNo: r.remittanceNo })))
  }, [rows])

  useEffect(() => {
    const onAudit = () => setAuditRev((n) => n + 1)
    window.addEventListener(REMITTANCE_AUDIT_EVENT, onAudit as EventListener)
    return () => window.removeEventListener(REMITTANCE_AUDIT_EVENT, onAudit as EventListener)
  }, [])

  useEffect(() => {
    const onMla = () => setMlaRev((n) => n + 1)
    window.addEventListener(AML_COMPLIANCE_SETTINGS_EVENT, onMla as EventListener)
    return () => window.removeEventListener(AML_COMPLIANCE_SETTINGS_EVENT, onMla as EventListener)
  }, [])

  useEffect(() => {
    if (!liveApi || !selectedId) {
      setServerAudit([])
      return
    }
    let cancelled = false
    void liveGetRemittanceAudit(selectedId)
      .then((res) => {
        if (!cancelled && res.events) {
          setServerAudit(res.events)
        }
      })
      .catch(() => {
        if (!cancelled) setServerAudit([])
      })
    return () => {
      cancelled = true
    }
  }, [liveApi, selectedId, auditRev])

  const auditEvents = useMemo((): AuditEvent[] => {
    void auditRev
    if (!selectedRow) return []
    const persisted = loadRemittanceAudit(selectedRow.remittanceNo)
    const ev: AuditEvent[] = [
      {
        at: selectedRow.createdAt,
        actor: selectedRow.maker,
        action: 'Created remittance',
        details: `Corridor ${selectedRow.corridor}, Amount ${selectedRow.amount}`,
      },
    ]
    if (selectedRow.status === 'Pending Approval') {
      const hasQueued = persisted.some((e) => /queued|maker-checker/i.test(e.action))
      if (!hasQueued) {
        ev.push({
          at: selectedRow.createdAt,
          actor: 'System',
          action: 'Queued for maker-checker approval',
          details: 'Awaiting checker (A.1.4); MLA gates run on Approve.',
        })
      }
    }
    const hasPersistedApproval = persisted.some((e) => e.action.startsWith('Approved'))
    if (selectedRow.checker && selectedRow.status === 'Approved' && !hasPersistedApproval) {
      ev.push({
        at: selectedRow.createdAt,
        actor: selectedRow.checker,
        action: 'Approved',
        details: 'Checker on record (seed / core)',
      })
    }
    if (selectedRow.status === 'On Hold') {
      const hasHold = persisted.some((e) => /hold/i.test(e.action))
      if (!hasHold) {
        ev.push({
          at: selectedRow.createdAt,
          actor: 'System',
          action: 'Status: On hold',
          details: 'Intervention required before payout.',
        })
      }
    }
    const sortedPersisted = [...persisted].sort((a, b) => a.at.localeCompare(b.at))
    return [...ev, ...serverAudit, ...sortedPersisted]
  }, [selectedRow, auditRev, serverAudit])

  const filteredRows = useMemo(() => {
    const q = filters.query.trim().toLowerCase()
    return rows.filter((r) => {
      if (filters.status && r.status !== filters.status) return false
      if (filters.maker && !r.maker.toLowerCase().includes(filters.maker.trim().toLowerCase()))
        return false
      if (!withinRange(r.createdAt, filters.fromDate || undefined, filters.toDate || undefined))
        return false
      if (!q) return true
      return (
        r.remittanceNo.toLowerCase().includes(q) ||
        r.remitter.toLowerCase().includes(q) ||
        r.beneficiary.toLowerCase().includes(q)
      )
    })
  }, [rows, filters])

  useEffect(() => {
    if (!selectedId) return
    const stillVisible = filteredRows.some((r) => r.id === selectedId)
    if (!stillVisible) setSelectedId(null)
  }, [filteredRows, selectedId])

  function validateFilters() {
    if (filters.fromDate && !isValidDateStr(filters.fromDate)) return 'From date must be YYYY-MM-DD.'
    if (filters.toDate && !isValidDateStr(filters.toDate)) return 'To date must be YYYY-MM-DD.'
    if (filters.fromDate && filters.toDate) {
      const f = new Date(filters.fromDate + 'T00:00:00Z').getTime()
      const t = new Date(filters.toDate + 'T00:00:00Z').getTime()
      if (f > t) return 'From date cannot be after To date.'
    }
    return ''
  }

  async function onSearch() {
    const err = validateFilters()
    setFilterError(err)
    if (err) return

    if (liveApi) {
      setActing(true)
      try {
        const queryParams: Record<string, string> = { page: '1', pageSize: '50' }
        if (filters.query) queryParams.q = filters.query
        if (filters.status) queryParams.status = filters.status
        if (filters.maker) queryParams.maker = filters.maker

        const p = await liveListRemittances(queryParams)
        const next: RemittanceRow[] = p.items.map((raw, idx) => {
          const d = raw as Record<string, unknown>
          const amount = String(d.amount ?? '0')
          const exchangeHouse = String(d.exchangeHouse ?? '').trim() || 'LIVE-API'
          const { num, ccy } = parseAmountDisplay(amount)
          const inc = computeRemittanceIncentive(num, ccy, exchangeHouse)
          const ch = parseChannel(String(d.channel ?? ''))
          const statusRaw = String(d.status ?? '')
          return {
            id: String(d.id ?? d.remittanceNo ?? `LIVE-${idx}`),
            remittanceNo: String(d.remittanceNo ?? ''),
            exchangeHouse,
            createdAt: String(d.createdAt ?? ''),
            corridor: String(d.corridor ?? ''),
            amount,
            remitter: String(d.remitter ?? ''),
            beneficiary: String(d.beneficiary ?? ''),
            maker: String(d.maker ?? ''),
            checker: d.checker != null ? String(d.checker) : undefined,
            status: STATUS_SET.has(statusRaw as RemittanceStatus) ? (statusRaw as RemittanceStatus) : 'Draft',
            channel: ch,
            photoIdType: String(d.photoIdType ?? '').trim() || undefined,
            photoIdRef: String(d.photoIdRef ?? '').trim() || undefined,
            incentiveBdt: inc.incentiveBdt,
            incentiveRule: inc.rule,
          }
        })
        setRows(next)
        setSelectedId(null)
        setSnack({ open: true, severity: 'success', message: `Found ${p.items.length} records on server.` })
      } catch {
        setSnack({ open: true, severity: 'error', message: 'Server search failed.' })
      } finally {
        setActing(false)
      }
    }
  }

  function onClear() {
    setFilters({ query: '', status: '', fromDate: '', toDate: '', maker: '' })
    setFilterError('')
    setSelectedId(null)
  }

  async function onImport() {
    setUploadError('')
    if (!uploadFile) {
      setUploadError('Please choose an Excel file.')
      return
    }
    try {
      const imported = await parseExcelRows(uploadFile, getMappingProfile(excelProfileId))
      if (imported.length === 0) {
        setUploadError('No rows found. Add a column like “Remittance No” or “remittanceNo”.')
        return
      }
      const batchErr = validateIncomingBatch(
        imported.map((r) => ({ exchangeHouse: r.exchangeHouse, remittanceNo: r.remittanceNo })),
      )
      if (batchErr.length > 0) {
        setUploadError(
          `${batchErr.slice(0, 8).join('; ')}${batchErr.length > 8 ? ` … +${batchErr.length - 8} more` : ''}`,
        )
        return
      }
      const existingIds = new Set(rows.map((r) => r.id))
      const newlyAdded = imported.filter((r) => !existingIds.has(r.id))
      const merged = [...newlyAdded, ...rows]
      setRows(merged)
      const profile = getMappingProfile(excelProfileId)
      const profileLabel = profile?.name ?? excelProfileId
      for (const r of newlyAdded) {
        appendRemittanceAudit(r.remittanceNo, {
          actor: 'Excel import',
          action: 'Imported into Search & Tracking',
          details: `Column profile: ${profileLabel} (${excelProfileId}).`,
        })
      }
      await appendFeedback('search_import', `Imported ${imported.length} remittance row(s) into Search & Tracking.`)
      const impSettings = loadAmlComplianceSettings()
      if (impSettings.autoScreenOnSearchImport && newlyAdded.length > 0) {
        let amlAdded = 0
        for (const r of newlyAdded) {
          const { added } = runScreeningForRemittance(r.remittanceNo, r.remitter, r.beneficiary, r.corridor)
          amlAdded += added
        }
        if (amlAdded > 0) {
          setSnack({
            open: true,
            severity: 'info',
            message: `Import AML: logged ${amlAdded} new alert row(s). Open Compliance → AML Alerts.`,
          })
        }
      }
      setUploadOpen(false)
      setUploadFile(null)
      setUploadPreviewCount(0)
    } catch {
      setUploadError('Failed to parse file. Please upload a valid .xlsx file.')
    }
  }

  useEffect(() => {
    let cancelled = false
    async function preview() {
      if (!uploadFile) {
        setUploadPreviewCount(0)
        return
      }
      try {
        const imported = await parseExcelRows(uploadFile, getMappingProfile(excelProfileId))
        if (!cancelled) setUploadPreviewCount(imported.length)
      } catch {
        if (!cancelled) setUploadPreviewCount(0)
      }
    }
    void preview()
    return () => {
      cancelled = true
    }
  }, [uploadFile, excelProfileId])

  const canApprove =
    (selectedRow?.status === 'Pending Approval' || selectedRow?.status === 'On Hold') && !acting
  const canReject =
    (selectedRow?.status === 'Pending Approval' || selectedRow?.status === 'On Hold') && !acting
  const canHold = selectedRow?.status === 'Pending Approval' && !acting

  function isRecoverableLiveFailure(e: unknown) {
    return e instanceof ApiHttpError && (e.status === 404 || e.status >= 500)
  }

  async function updateSelectedStatus(next: RemittanceStatus) {
    if (!selectedRow) return
    const row = selectedRow
    const applyLocalStatus = (status: RemittanceStatus, checker = 'HO-Checker') => {
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, status, checker } : r)),
      )
    }
    setActing(true)

    try {
      if (liveApi && next === 'Approved') {
        try {
          const dto =
            row.status === 'On Hold'
              ? await livePatchRemittanceRecord(row.id, {
                  status: 'Approved',
                  checker: 'HO-Checker-01',
                })
              : await liveApproveRemittanceRecord(row.id, {
                  checkerUser: 'HO-Checker-01',
                })
          appendRemittanceAudit(row.remittanceNo, {
            actor: 'HO-Checker-01',
            action: 'Approved (maker-checker)',
            details:
              'Server MLA gates passed (photo ID, limits, patterns, double AML blocks per frms_mla_settings).',
          })
          setRows((prev) =>
            prev.map((r) => (r.id === row.id ? remittanceDtoToRow(dto, r) : r)),
          )
          setSnack({
            open: true,
            severity: 'success',
            message: 'Approved successfully.',
          })
          return
        } catch (e) {
          if (
            e instanceof ApiHttpError &&
            e.status === 400 &&
            /not pending approval/i.test(e.message)
          ) {
            try {
              const dto = await livePatchRemittanceRecord(row.id, {
                status: 'Approved',
                checker: 'HO-Checker-01',
              })
              appendRemittanceAudit(row.remittanceNo, {
                actor: 'HO-Checker-01',
                action: 'Approved (maker-checker)',
                details: 'Fallback via PATCH after approve endpoint rejected stale pending state.',
              })
              setRows((prev) =>
                prev.map((r) => (r.id === row.id ? remittanceDtoToRow(dto, r) : r)),
              )
              setSnack({
                open: true,
                severity: 'info',
                message: 'Approve applied using PATCH fallback (status was not pending on server).',
              })
              return
            } catch {
              setSnack({
                open: true,
                severity: 'error',
                message: e.message,
              })
              return
            }
          }
          if (e instanceof ApiHttpError && !isRecoverableLiveFailure(e)) {
            setSnack({
              open: true,
              severity: 'error',
              message: e.message,
            })
            return
          }
          setSnack({
            open: true,
            severity: 'warning',
            message: 'Live API unavailable. Falling back to local approval logic.',
          })
        }
      }

      if (liveApi && (next === 'On Hold' || next === 'Rejected')) {
        try {
          await livePatchRemittanceRecord(row.id, { status: next })
          if (next === 'On Hold') {
            appendRemittanceAudit(row.remittanceNo, {
              actor: 'HO-Checker-01',
              action: 'Placed on hold (maker-checker)',
              details: 'Persisted via PATCH /remittances/records.',
            })
          } else {
            appendRemittanceAudit(row.remittanceNo, {
              actor: 'HO-Checker-01',
              action: 'Rejected (maker-checker)',
              details: 'Persisted via PATCH /remittances/records.',
            })
          }
          applyLocalStatus(next, 'HO-Checker-01')
          setSnack({
            open: true,
            severity: 'success',
            message: `${next} applied successfully.`,
          })
          return
        } catch (e) {
          if (e instanceof ApiHttpError && !isRecoverableLiveFailure(e)) {
            setSnack({
              open: true,
              severity: 'error',
              message: e.message,
            })
            return
          }
          setSnack({
            open: true,
            severity: 'warning',
            message: 'Live API unavailable. Applying local update.',
          })
        }
      }

      if (liveApi && next === 'Returned') {
      try {
        await livePatchRemittanceRecord(row.id, { status: next })
        appendRemittanceAudit(row.remittanceNo, {
          actor: 'HO-Checker-01',
          action: 'Return initiated',
          details: 'Operational notification raised for settlement / nostro follow-up.',
        })
        void pushOperationalNotification({
          kind: 'return',
          title: 'Transaction return',
          body: `Remittance marked returned (requires settlement / Nostro action in core).`,
          remittanceNo: row.remittanceNo,
        })
        applyLocalStatus(next, 'HO-Checker-01')
        return
      } catch (e) {
        if (e instanceof ApiHttpError && !isRecoverableLiveFailure(e)) {
          setSnack({
            open: true,
            severity: 'error',
            message: e.message,
          })
          return
        }
        setSnack({
          open: true,
          severity: 'warning',
          message: 'Live API unavailable. Applying local update.',
        })
      }
      }

      if (liveApi && next === 'Stopped') {
      try {
        await livePatchRemittanceRecord(row.id, { status: next })
        appendRemittanceAudit(row.remittanceNo, {
          actor: 'HO-Checker-01',
          action: 'Stop payment flagged',
          details: 'Blocked remittance register updated; disbursement must not proceed until cleared.',
        })
        void pushOperationalNotification({
          kind: 'stop_payment',
          title: 'Stop payment',
          body: `Stop payment flag set — block disbursement until cleared.`,
          remittanceNo: row.remittanceNo,
        })
        // Server syncs `eh_blocked_remittance` on PATCH when status = Stopped
        applyLocalStatus(next, 'HO-Checker-01')
        return
      } catch (e) {
        if (e instanceof ApiHttpError && !isRecoverableLiveFailure(e)) {
          setSnack({
            open: true,
            severity: 'error',
            message: e.message,
          })
          return
        }
        setSnack({
          open: true,
          severity: 'warning',
          message: 'Live API unavailable. Applying local update.',
        })
      }
      }

      if (next === 'Approved') {
      const amlSettings = loadAmlComplianceSettings()
      const pid = assertPhotoIdOk(row.photoIdType, row.photoIdRef, amlSettings)
      if (pid.ok === false) {
        setSnack({ open: true, severity: 'error', message: pid.message })
        return
      }
      const biz = getHighRiskBusinessBlockReason(row.remitter, row.beneficiary)
      if (biz && amlSettings.blockApprovalOnBusinessTerm) {
        setSnack({ open: true, severity: 'error', message: biz })
        return
      }
      const daily = evaluateRemitterDailyLimits(rows, row, amlSettings)
      if (daily.ok === false) {
        setSnack({ open: true, severity: 'warning', message: daily.message })
        return
      }
      const { patterns } = analyzeStructuringPatterns(rows, row, amlSettings)
      if (patterns.length > 0 && amlSettings.blockApprovalOnPattern) {
        setSnack({ open: true, severity: 'warning', message: patterns[0] })
        return
      }

      const hits = runDoubleAmlScreening(
        row.remitter,
        row.beneficiary,
        row.remittanceNo,
        row.corridor,
        amlSettings,
      )
      for (const h of hits) {
        appendAmlAlert(
          createAmlAlertFromScreening({
            remittanceNo: row.remittanceNo,
            list: h.list,
            score: h.score,
            subjectHint: h.subjectHint,
          }),
        )
      }
      const { primary, secondary } = partitionHits(hits)
      if (primary.length > 0 && amlSettings.blockApprovalOnPrimaryAmlHit) {
        setSnack({
          open: true,
          severity: 'warning',
          message: `Approval blocked: primary AML hit (${primary.map((p) => p.list).join(', ')}). Review Compliance → AML Alerts.`,
        })
        return
      }
      if (secondary.length > 0 && amlSettings.blockApprovalOnOpacDsriHit) {
        setSnack({
          open: true,
          severity: 'warning',
          message: `Approval blocked: OPAC/DSRI pass hit (${secondary.map((p) => p.list).join(', ')}).`,
        })
        return
      }

      const srcCurrency =
        row.corridor.split('→')[0]?.trim().slice(0, 3) || parseAmountDisplay(row.amount).ccy
      const cover = verifyCoverFundForCurrency(srcCurrency)
      if (!cover.ok) {
        setSnack({ open: true, severity: 'warning', message: `Cover fund check failed: ${cover.message}` })
        return
      }
      const amt = parseAmountDisplay(row.amount)
      const amountBdt = estimateBdtEquivalent(amt.num, amt.ccy)
      const sameDay = rows
        .filter(
          (r) =>
            r.beneficiary.toLowerCase() === row.beneficiary.toLowerCase() &&
            r.createdAt.slice(0, 10) === row.createdAt.slice(0, 10),
        )
        .map((r) => {
          const p = parseAmountDisplay(r.amount)
          return estimateBdtEquivalent(p.num, p.ccy)
        })
      const risk = evaluateRiskForApproval({
        customerName: row.beneficiary,
        amountBdt,
        sameDayAmountsBdt: sameDay,
      })
      if (!risk.ok) {
        setSnack({ open: true, severity: 'warning', message: risk.reason || 'Risk threshold exceeded.' })
        return
      }
      appendRemittanceAudit(row.remittanceNo, {
        actor: 'HO-Checker',
        action: 'Approved (maker-checker)',
        details:
          'MLA gates evaluated: photo ID, per-day limits, structuring patterns, double AML (primary + OPAC/DSRI), cover fund, risk controls.',
      })
      applyLocalStatus('Approved', 'HO-Checker')
      setSnack({ open: true, severity: 'success', message: 'Approved locally.' })
      return
    }
    if (next === 'On Hold') {
      appendRemittanceAudit(row.remittanceNo, {
        actor: 'HO-Checker',
        action: 'Placed on hold (maker-checker)',
        details: 'Payout paused pending review.',
      })
      applyLocalStatus('On Hold', 'HO-Checker')
      setSnack({ open: true, severity: 'info', message: 'Placed on hold.' })
      return
    }
    if (next === 'Rejected') {
      appendRemittanceAudit(row.remittanceNo, {
        actor: 'HO-Checker',
        action: 'Rejected (maker-checker)',
        details: 'Removed from active processing.',
      })
      applyLocalStatus('Rejected', 'HO-Checker')
      setSnack({ open: true, severity: 'info', message: 'Rejected.' })
      return
    }
    if (next === 'Returned') {
      appendRemittanceAudit(row.remittanceNo, {
        actor: 'HO-Checker',
        action: 'Return initiated',
        details: 'Operational notification raised for settlement / nostro follow-up.',
      })
      void pushOperationalNotification({
        kind: 'return',
        title: 'Transaction return',
        body: `Remittance marked returned (requires settlement / Nostro action in core).`,
        remittanceNo: row.remittanceNo,
      })
      applyLocalStatus('Returned', 'HO-Checker')
      return
    }
    if (next === 'Stopped') {
      appendRemittanceAudit(row.remittanceNo, {
        actor: 'HO-Checker',
        action: 'Stop payment flagged',
        details: 'Blocked remittance register updated; disbursement must not proceed until cleared.',
      })
      void pushOperationalNotification({
        kind: 'stop_payment',
        title: 'Stop payment',
        body: `Stop payment flag set — block disbursement until cleared.`,
        remittanceNo: row.remittanceNo,
      })
      upsertBlockedRemittance({
        remittanceNo: row.remittanceNo,
        remitter: row.remitter,
        beneficiary: row.beneficiary,
        corridor: row.corridor,
        amount: row.amount,
        branch: row.exchangeHouse,
        note: 'Stopped from Search & Tracking',
      })
      applyLocalStatus('Stopped', 'HO-Checker')
      return
    }
    } finally {
      setActing(false)
    }
  }

  async function onAmlScreenSelected() {
    if (!selectedRow) return
    if (liveApi) {
      try {
        const res = await liveScreenParties({
          remittanceNo: selectedRow.remittanceNo,
          remitter: selectedRow.remitter,
          beneficiary: selectedRow.beneficiary,
        })
        if (res.alert && res.alert.match === 'Possible') {
          const added = appendAmlAlert(amlDtoToRow(res.alert))
          appendRemittanceAudit(selectedRow.remittanceNo, {
            actor: 'HO-Checker',
            action: 'AML screen (live API)',
            details: added
              ? 'Possible match logged — Compliance → AML Alerts.'
              : 'Duplicate alert skipped.',
          })
          setSnack({
            open: true,
            severity: added ? 'warning' : 'info',
            message: added
              ? 'Live screening: possible match logged — Compliance → AML Alerts.'
              : 'Live screening: duplicate alert skipped.',
          })
          return
        }
        appendRemittanceAudit(selectedRow.remittanceNo, {
          actor: 'HO-Checker',
          action: 'AML screen (live API)',
          details: 'No match returned from POST /compliance/screen.',
        })
        setSnack({
          open: true,
          severity: 'success',
          message: 'Live screening: no match from API.',
        })
        return
      } catch {
        appendRemittanceAudit(selectedRow.remittanceNo, {
          actor: 'System',
          action: 'AML screen (live API error)',
          details: 'Request failed — running local double AML pass below.',
        })
        setSnack({
          open: true,
          severity: 'warning',
          message: 'Live screening failed — falling back to local rules.',
        })
      }
    }
    const { added, hits } = runScreeningForRemittance(
      selectedRow.remittanceNo,
      selectedRow.remitter,
      selectedRow.beneficiary,
      selectedRow.corridor,
    )
    appendRemittanceAudit(selectedRow.remittanceNo, {
      actor: 'HO-Checker',
      action: 'AML screen (double pass — local)',
      details:
        hits.length === 0
          ? 'No hits (primary + OPAC/DSRI rules).'
          : `${hits.length} hit(s): ${hits.map((h) => h.list).join(', ')}; ${added} new alert row(s).`,
    })
    if (hits.length === 0) {
      setSnack({
        open: true,
        severity: 'success',
        message: 'No hit on double AML pass (primary + OPAC/DSRI rules).',
      })
    } else if (added > 0) {
      setSnack({
        open: true,
        severity: 'warning',
        message: `Logged ${added} new alert(s) (${hits.map((h) => h.list).join(', ')}) — Compliance → AML Alerts.`,
      })
    } else {
      setSnack({
        open: true,
        severity: 'info',
        message: 'Hits match existing alert lists for this remittance (no duplicate rows).',
      })
    }
  }

  const columns: GridColDef<RemittanceRow>[] = useMemo(
    () => [
      { field: 'remittanceNo', headerName: 'Remittance No', flex: 1, minWidth: 170 },
      { field: 'exchangeHouse', headerName: 'Exchange house', flex: 0.8, minWidth: 120 },
      { field: 'createdAt', headerName: 'Created', flex: 1, minWidth: 160 },
      { field: 'corridor', headerName: 'Corridor', flex: 1, minWidth: 120 },
      { field: 'channel', headerName: 'Channel', flex: 0.7, minWidth: 100 },
      { field: 'amount', headerName: 'Amount', flex: 1, minWidth: 130 },
      {
        field: 'incentiveBdt',
        headerName: 'Incentive (৳)',
        flex: 0.75,
        minWidth: 120,
        renderCell: (params) => {
          const row = params.row
          const { num, ccy } = parseAmountDisplay(row.amount)
          const v =
            row.incentiveBdt ?? computeRemittanceIncentive(num, ccy, row.exchangeHouse).incentiveBdt
          const tip = row.incentiveRule ?? computeRemittanceIncentive(num, ccy, row.exchangeHouse).rule
          return (
            <Typography variant="body2" title={tip}>
              {v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          )
        },
      },
      { field: 'remitter', headerName: 'Remitter', flex: 1, minWidth: 140 },
      {
        field: 'beneficiary',
        headerName: 'Beneficiary',
        flex: 1.1,
        minWidth: 160,
        renderCell: (params) => (
          <Stack direction="row" alignItems="center" gap={0.75} sx={{ py: 0.5 }}>
            <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
              {params.value}
            </Typography>
            {isActiveBeneficiary(String(params.value), benNames) ? (
              <Chip
                label="Registered"
                size="small"
                sx={{ height: 22, bgcolor: 'rgba(66,171,72,0.14)', color: brand.green }}
              />
            ) : null}
          </Stack>
        ),
      },
      {
        field: 'photoIdRef',
        headerName: 'Photo ID',
        flex: 0.65,
        minWidth: 100,
        valueGetter: (_v, row) => row.photoIdRef || '—',
      },
      { field: 'maker', headerName: 'Maker', flex: 0.8, minWidth: 120 },
      {
        field: 'status',
        headerName: 'Status',
        flex: 0.9,
        minWidth: 140,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.value}
            sx={{
              bgcolor: statusChip(params.value).bg,
              color: statusChip(params.value).fg,
            }}
          />
        ),
      },
    ],
    [benNames],
  )

  // Debounced auto-save for Photo ID fields
  const [lastPatch, setLastPatch] = useState<{ id: string, patch: Partial<RemittanceRow> } | null>(null)

  useEffect(() => {
    if (!liveApi || !lastPatch) return
    const { id, patch } = lastPatch
    const timer = setTimeout(() => {
      void livePatchRemittanceRecord(id, patch)
        .then(() => {
          setSnack({ open: true, severity: 'success', message: 'Sync complete.' })
        })
        .catch(e => {
          console.error('Server sync failed:', e)
          setSnack({ open: true, severity: 'warning', message: 'Server sync failed.' })
        })
    }, 1000)
    return () => clearTimeout(timer)
  }, [lastPatch, liveApi])

  function patchSelectedPhoto(patch: Partial<Pick<RemittanceRow, 'photoIdType' | 'photoIdRef'>>) {
    if (!selectedId) return
    const row = selectedRow
    if (!row) return

    // Update local state immediately for responsiveness
    setRows((prev) => prev.map((r) => (r.id === selectedId ? { ...r, ...patch } : r)))

    // Track for debounced server sync
    setLastPatch({ id: row.id, patch })
    
    appendRemittanceAudit(row.remittanceNo, {
      actor: 'HO-User',
      action: 'Updated Photo ID',
      details: JSON.stringify(patch),
    })
  }

  return (
    <Stack spacing={2.5}>
      {liveApi ? (
        <Alert severity={liveError ? 'warning' : 'info'}>
          {liveError
            ? `Live API: ${liveError}. Showing local rows (including Excel imports).`
            : 'Live API: list from GET /remittances/records; approve uses POST …/approve (server MLA from frms_mla_settings). MLA toggles sync from GET /compliance/mla-settings on load. AML screen uses POST /compliance/screen.'}
        </Alert>
      ) : null}
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'flex-start' }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
            Remittance Search & Tracking
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Search remittances, track status, run maker-checker actions, and view audit trail. MLA gates (photo ID, limits,
            patterns, double AML) are configured under{' '}
            <MuiLink component={RouterLink} to="/compliance/mla-settings" underline="hover">
              Compliance → MLA &amp; screening settings
            </MuiLink>
            . Saving there updates gates for approve, Excel import, and AML screen on this page immediately.
          </Typography>
          <Alert
            key={`mla-${mlaRev}`}
            variant="outlined"
            severity="info"
            sx={{ mt: 1.5, borderColor: 'divider' }}
          >
            <Typography variant="body2" component="span">
              {(() => {
                const m = loadAmlComplianceSettings()
                return (
                  <>
                    <Box component="strong" sx={{ fontWeight: 800 }}>
                      Active MLA snapshot:
                    </Box>{' '}
                    photo ID {m.requirePhotoId ? 'required' : 'optional'} on approve · per-day limits / pattern blocks per toggles ·
                    double AML on Excel import {m.autoScreenOnSearchImport ? 'on' : 'off'} · primary / OPAC–DSRI approval blocks as
                    configured.
                  </>
                )
              })()}
            </Typography>
          </Alert>
        </Box>

        <Stack direction="row" gap={1} flexWrap="wrap" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
          <Button
            variant="outlined"
            startIcon={<GppGoodOutlinedIcon />}
            disabled={!selectedRow}
            onClick={() => void onAmlScreenSelected()}
            sx={{ borderColor: 'divider' }}
          >
            AML screen
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadFileOutlinedIcon />}
            onClick={() => {
              setExcelProfileId(getDefaultSearchProfileId())
              setUploadOpen(true)
            }}
            sx={{ borderColor: 'divider' }}
          >
            Excel upload
          </Button>
          <Button
            variant="outlined"
            startIcon={<HistoryOutlinedIcon />}
            disabled={!selectedRow}
            onClick={() => setAuditDrawerOpen(true)}
            sx={{ borderColor: 'divider' }}
          >
            Audit trail
          </Button>
          <Button
            variant="contained"
            startIcon={<DoneOutlinedIcon />}
            disabled={!canApprove}
            onClick={() => void updateSelectedStatus('Approved')}
          >
            Approve
          </Button>
          <Button
            variant="outlined"
            startIcon={<PauseCircleOutlineOutlinedIcon />}
            disabled={!canHold}
            onClick={() => void updateSelectedStatus('On Hold')}
            sx={{ borderColor: 'divider' }}
          >
            Hold
          </Button>
          <Button
            variant="outlined"
            startIcon={<CloseOutlinedIcon />}
            disabled={!canReject}
            onClick={() => void updateSelectedStatus('Rejected')}
            sx={{ borderColor: 'divider' }}
          >
            Reject
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField
              fullWidth
              label="Search"
              placeholder="Remittance no / Remitter / Beneficiary"
              value={filters.query}
              onChange={(e) => setFilters((s) => ({ ...s, query: e.target.value }))}
            />
            <TextField
              label="Status"
              value={filters.status}
              onChange={(e) =>
                setFilters((s) => ({ ...s, status: e.target.value as '' | RemittanceStatus }))
              }
              placeholder="All"
              sx={{ minWidth: { xs: '100%', md: 220 } }}
            />
            <TextField
              label="Maker"
              value={filters.maker}
              onChange={(e) => setFilters((s) => ({ ...s, maker: e.target.value }))}
              placeholder="Branch / user"
              sx={{ minWidth: { xs: '100%', md: 220 } }}
            />
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
            <TextField
              label="From (YYYY-MM-DD)"
              value={filters.fromDate}
              onChange={(e) => setFilters((s) => ({ ...s, fromDate: e.target.value }))}
              error={Boolean(filterError)}
              sx={{ minWidth: { xs: '100%', md: 220 } }}
            />
            <TextField
              label="To (YYYY-MM-DD)"
              value={filters.toDate}
              onChange={(e) => setFilters((s) => ({ ...s, toDate: e.target.value }))}
              error={Boolean(filterError)}
              sx={{ minWidth: { xs: '100%', md: 220 } }}
            />
            <Box sx={{ flex: 1 }} />
            <Stack direction="row" gap={1}>
              <Button
                variant="contained"
                startIcon={<SearchOutlinedIcon />}
                onClick={onSearch}
              >
                Apply
              </Button>
              <Button
                variant="outlined"
                startIcon={<ClearOutlinedIcon />}
                onClick={onClear}
                sx={{ borderColor: 'divider' }}
              >
                Clear
              </Button>
            </Stack>
          </Stack>

          {filterError ? <Alert severity="error">{filterError}</Alert> : null}
        </Stack>
      </Paper>

      <Paper sx={{ p: 1.5 }}>
        <Box sx={{ height: 560 }}>
          <DataGrid
            rows={filteredRows}
            columns={columns}
            disableRowSelectionOnClick
            onRowClick={(p) => setSelectedId(String(p.row.id))}
            getRowClassName={(params) =>
              String(params.row.id) === selectedId ? 'search-row-selected' : ''
            }
            initialState={{
              pagination: { paginationModel: { pageSize: 10, page: 0 } },
            }}
            pageSizeOptions={[10, 25, 50]}
            sx={{
              border: 0,
              '& .MuiDataGrid-columnHeaders': { borderBottom: '1px solid', borderColor: 'divider' },
              '& .MuiDataGrid-row:hover': { bgcolor: 'rgba(66,171,72,0.06)' },
              '& .search-row-selected': { bgcolor: 'rgba(66,171,72,0.12)' },
              '& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus': { outline: 'none' },
            }}
          />
        </Box>
      </Paper>

      {selectedRow ? (
        <Paper sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 900, mb: 1 }}>MLA / KYC — photo ID</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
            Required for approval when enabled under{' '}
            <MuiLink component={RouterLink} to="/compliance/mla-settings" underline="hover">
              MLA &amp; screening settings
            </MuiLink>{' '}
            (this page picks up changes immediately). Map Excel columns via Tools → Corporate file mapping.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Photo ID type"
              value={selectedRow.photoIdType ?? ''}
              onChange={(e) => patchSelectedPhoto({ photoIdType: e.target.value })}
              fullWidth
              size="small"
            />
            <TextField
              label="Photo ID number / reference"
              value={selectedRow.photoIdRef ?? ''}
              onChange={(e) => patchSelectedPhoto({ photoIdRef: e.target.value })}
              fullWidth
              size="small"
            />
          </Stack>
        </Paper>
      ) : null}

      <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Excel upload (Search & Tracking)</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Upload an Excel file to add transactions into this table. Map non-standard column titles under Tools → Corporate
              file mapping (#24). Incentive (৳) is calculated from tiers and BDT-equivalent principal (#30). Include optional
              columns for <Box component="span" sx={{ fontWeight: 900 }}>Photo ID type</Box> and <Box component="span" sx={{ fontWeight: 900 }}>Photo ID reference</Box> (MLA).
            </Typography>
            <TextField
              select
              fullWidth
              label="Column mapping profile"
              value={excelProfileId}
              onChange={(e) => setExcelProfileId(e.target.value)}
              size="small"
            >
              {mappingProfiles.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </TextField>
            <MuiLink component={RouterLink} to="/tools/corporate-file-mapping" variant="body2" underline="hover">
              Edit mapping profiles & incentive tiers
            </MuiLink>
            <Divider />

            <Button
              variant="outlined"
              component="label"
              sx={{ borderColor: 'divider' }}
            >
              Choose File
              <input
                hidden
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  setUploadError('')
                  setUploadFile(e.target.files?.[0] ?? null)
                }}
              />
            </Button>

            {uploadFile ? (
              <Typography variant="body2">
                Selected: <Box component="span" sx={{ fontWeight: 900 }}>{uploadFile.name}</Box> · Preview rows:{' '}
                <Box component="span" sx={{ fontWeight: 900 }}>{uploadPreviewCount}</Box>
              </Typography>
            ) : null}

            {uploadError ? <Alert severity="error">{uploadError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void onImport()}>
            Import
          </Button>
        </DialogActions>
      </Dialog>

      <Drawer
        anchor="right"
        open={auditDrawerOpen}
        onClose={() => setAuditDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 460 }, p: 2 } }}
      >
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
            <Box>
              <Typography sx={{ fontWeight: 950 }}>Audit trail</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {selectedRow
                  ? `${selectedRow.remittanceNo} — events append here (stored in browser; maker-checker and AML actions are logged).`
                  : 'Select a remittance to view events.'}
              </Typography>
            </Box>
            <IconButton onClick={() => setAuditDrawerOpen(false)}>
              <ClearOutlinedIcon />
            </IconButton>
          </Stack>

          {!selectedRow ? (
            <Alert severity="info">Select a remittance row first.</Alert>
          ) : (
            <Stack spacing={1}>
              {auditEvents.map((e, idx) => (
                <Paper key={`${e.at}-${e.action}-${idx}`} variant="outlined" sx={{ p: 1.5, borderColor: 'divider' }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                    <Typography sx={{ fontWeight: 900 }}>{e.action}</Typography>
                    <Chip size="small" label={e.at} sx={{ bgcolor: 'rgba(0,0,0,0.06)', color: brand.black }} />
                  </Stack>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    Actor: <Box component="span" sx={{ fontWeight: 900, color: 'text.primary' }}>{e.actor}</Box>
                  </Typography>
                  {e.details ? (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {e.details}
                    </Typography>
                  ) : null}
                </Paper>
              ))}
            </Stack>
          )}
        </Stack>
      </Drawer>

      <Snackbar
        open={snack.open}
        autoHideDuration={6000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))} variant="filled">
          {snack.message}
        </Alert>
      </Snackbar>
    </Stack>
  )
}

