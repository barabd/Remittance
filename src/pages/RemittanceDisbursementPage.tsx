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
  Paper,
  Stack,
  TextField,
  Typography,
  MenuItem,
} from '@mui/material'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined'
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined'
import DoneOutlinedIcon from '@mui/icons-material/DoneOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import PauseCircleOutlineOutlinedIcon from '@mui/icons-material/PauseCircleOutlineOutlined'
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { brand } from '../theme/appTheme'
import { publishOpsMetrics } from '../state/opsMetricsStore'
import { MASTERS_CHANGED_EVENT } from '../state/mastersStore'
import { activeBeneficiaryNameSet, isActiveBeneficiary } from '../lib/beneficiaryRegistry'
import { ApiHttpError } from '../api/http'
import { useLiveApi } from '../api/config'
import type { DisbursementDto } from '../api/types'
import {
  liveApproveDisbursement,
  liveGetDisbursementAudit,
  liveListDisbursements,
  liveMarkDisbursed,
  livePatchDisbursement,
  liveRejectDisbursement,
} from '../api/live/client'
import { verifyCoverFundForCurrency } from '../state/coverFundGuardStore'
import {
  evaluateRiskForApproval,
  parseBdtAmountDisplay,
  syncRiskProfilesFromLive,
} from '../state/riskControlStore'

type DisbursementStatus =
  | 'Pending Approval'
  | 'Approved'
  | 'Queued'
  | 'Disbursed'
  | 'Failed'
  | 'On Hold'
  | 'Rejected'

type DisbursementRow = {
  id: string
  remittanceNo: string
  createdAt: string
  corridor: string
  channel: 'BEFTN' | 'RTGS' | 'NPSB' | 'MFS' | 'Cash'
  payoutTo: string
  payoutRef?: string
  beneficiary: string
  amountBDT: string
  maker: string
  checker?: string
  status: DisbursementStatus
  /** #37 — Branch vs Sub-Branch capture (demo). */
  originatingUnit: 'Branch' | 'Sub-Branch'
}

type AuditEvent = {
  at: string
  actor: string
  action: string
  details?: string
}

const seedRows: DisbursementRow[] = [
  {
    id: 'REM-2026-000210',
    remittanceNo: 'REM-2026-000210',
    createdAt: '2026-03-25 12:05',
    corridor: 'USD → BDT',
    channel: 'BEFTN',
    payoutTo: 'Bank A · 0123****89',
    payoutRef: 'BEFTN-942114',
    beneficiary: 'Rahim Uddin',
    amountBDT: '৳ 295,000.00',
    maker: 'Branch-01',
    status: 'Approved',
    checker: 'HO-Checker',
    originatingUnit: 'Branch',
  },
  {
    id: 'REM-2026-000211',
    remittanceNo: 'REM-2026-000211',
    createdAt: '2026-03-25 12:18',
    corridor: 'AED → BDT',
    channel: 'MFS',
    payoutTo: 'bKash · 01*********',
    payoutRef: '',
    beneficiary: 'Karim Mia',
    amountBDT: '৳ 132,500.00',
    maker: 'Sub-Branch-03',
    status: 'Pending Approval',
    originatingUnit: 'Sub-Branch',
  },
  {
    id: 'REM-2026-000212',
    remittanceNo: 'REM-2026-000212',
    createdAt: '2026-03-25 12:35',
    corridor: 'SAR → BDT',
    channel: 'RTGS',
    payoutTo: 'Bank B · 77********01',
    payoutRef: 'RTGS-118220',
    beneficiary: 'Nusrat Jahan',
    amountBDT: '৳ 39,800.00',
    maker: 'Branch-02',
    status: 'On Hold',
    originatingUnit: 'Branch',
  },
] as const

function statusChip(status: DisbursementStatus) {
  const map: Record<DisbursementStatus, { bg: string; fg: string }> = {
    'Pending Approval': { bg: 'rgba(255,255,255,0.22)', fg: brand.black },
    Approved: { bg: 'rgba(66,171,72,0.14)', fg: brand.green },
    Queued: { bg: 'rgba(0,0,0,0.06)', fg: brand.black },
    Disbursed: { bg: 'rgba(66,171,72,0.14)', fg: brand.green },
    Failed: { bg: 'rgba(239,68,68,0.14)', fg: '#ef4444' },
    'On Hold': { bg: 'rgba(0,0,0,0.06)', fg: brand.black },
    Rejected: { bg: 'rgba(239,68,68,0.14)', fg: '#ef4444' },
  }

  return map[status]
}

function isValidDateStr(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
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

const DEFAULT_DISBURSEMENT_CHECKER = 'HO-Checker-01'

function disbursementDtoToRow(d: DisbursementDto): DisbursementRow {
  const ouRaw = String(d.originatingUnit ?? '').trim()
  const ou =
    ouRaw || (String(d.maker ?? '').toLowerCase().includes('sub') ? 'Sub-Branch' : 'Branch')
  const originatingUnit: DisbursementRow['originatingUnit'] =
    ou.toLowerCase().includes('sub') ? 'Sub-Branch' : 'Branch'
  const ch = String(d.channel ?? '')
  const st = String(d.status ?? 'Pending Approval') as DisbursementStatus
  return {
    id: String(d.id ?? ''),
    remittanceNo: String(d.remittanceNo ?? ''),
    createdAt: String(d.createdAt ?? ''),
    corridor: String(d.corridor ?? ''),
    channel: (['BEFTN', 'RTGS', 'NPSB', 'MFS', 'Cash'].includes(ch) ? ch : 'Cash') as DisbursementRow['channel'],
    payoutTo: String(d.payoutTo ?? ''),
    payoutRef: d.payoutRef != null ? String(d.payoutRef) : undefined,
    beneficiary: String(d.beneficiary ?? ''),
    amountBDT: String(d.amountBDT ?? ''),
    maker: String(d.maker ?? ''),
    checker: d.checker != null ? String(d.checker) : undefined,
    status: st,
    originatingUnit,
  }
}

function parseExcelRows(file: File): Promise<DisbursementRow[]> {
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

        const out: DisbursementRow[] = json
          .map((r, idx) => {
            const remittanceNo = String(
              r.remittanceNo ?? r.RemittanceNo ?? r['Remittance No'] ?? '',
            ).trim()
            if (!remittanceNo) return null

            const createdAt =
              String(r.createdAt ?? r.CreatedAt ?? r['Created At'] ?? '').trim() ||
              '2026-03-25 00:00'
            const corridor = String(r.corridor ?? r.Corridor ?? '').trim() || 'USD → BDT'
            const channel =
              (String(r.channel ?? r.Channel ?? '').trim() as DisbursementRow['channel']) ||
              'Cash'
            const payoutTo = String(r.payoutTo ?? r.PayoutTo ?? r['Payout To'] ?? '').trim() || '-'
            const payoutRef = String(r.payoutRef ?? r.PayoutRef ?? r['Payout Ref'] ?? '').trim()
            const beneficiary =
              String(r.beneficiary ?? r.Beneficiary ?? '').trim() || 'Unknown'
            const amountBDT =
              String(r.amountBDT ?? r.AmountBDT ?? r['Amount BDT'] ?? '').trim() || '৳ 0'
            const maker = String(r.maker ?? r.Maker ?? '').trim() || 'Excel'
            const status =
              (String(r.status ?? r.Status ?? '').trim() as DisbursementStatus) ||
              'Pending Approval'
            const ou = String(r.originatingUnit ?? r['Originating Unit'] ?? '').trim()
            const originatingUnit: DisbursementRow['originatingUnit'] =
              ou.toLowerCase().includes('sub') ? 'Sub-Branch' : 'Branch'

            return {
              id: remittanceNo || `X-${idx}`,
              remittanceNo,
              createdAt,
              corridor,
              channel,
              payoutTo,
              payoutRef,
              beneficiary,
              amountBDT,
              maker,
              checker: '',
              status,
              originatingUnit,
            } satisfies DisbursementRow
          })
          .filter(Boolean) as DisbursementRow[]

        resolve(out)
      } catch (e) {
        reject(e)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

const LS_DISBURSEMENT_KEY = 'frms.disbursement.v1'

export function RemittanceDisbursementPage() {
  const live = useLiveApi()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [rows, setRows] = useState<DisbursementRow[]>(() => {
    if (import.meta.env.VITE_USE_LIVE_API === 'true') return [...seedRows]
    const raw = localStorage.getItem(LS_DISBURSEMENT_KEY)
    if (!raw) return [...seedRows]
    try {
      const p = JSON.parse(raw) as DisbursementRow[]
      return Array.isArray(p) && p.length > 0 ? p : [...seedRows]
    } catch {
      return [...seedRows]
    }
  })

  // Persist to local storage in mock mode
  useEffect(() => {
    if (import.meta.env.VITE_USE_LIVE_API !== 'true') {
      localStorage.setItem(LS_DISBURSEMENT_KEY, JSON.stringify(rows))
    }
  }, [rows])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [liveError, setLiveError] = useState<string | null>(null)
  const selectedRow = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  )

  const [filters, setFilters] = useState({
    query: '',
    status: '' as '' | DisbursementStatus,
    channel: '' as '' | DisbursementRow['channel'],
    fromDate: '',
    toDate: '',
    maker: '',
    originatingUnit: '' as '' | DisbursementRow['originatingUnit'],
  })
  const [filterError, setFilterError] = useState<string>('')

  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string>('')
  const [uploadPreviewCount, setUploadPreviewCount] = useState<number>(0)
  const [actionError, setActionError] = useState<string>('')

  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false)
  const [serverAuditEvents, setServerAuditEvents] = useState<AuditEvent[] | null>(null)
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditFetchKey, setAuditFetchKey] = useState(0)
  const [benNames, setBenNames] = useState(() => activeBeneficiaryNameSet())

  useEffect(() => {
    const sync = () => setBenNames(activeBeneficiaryNameSet())
    window.addEventListener(MASTERS_CHANGED_EVENT, sync as EventListener)
    return () => window.removeEventListener(MASTERS_CHANGED_EVENT, sync as EventListener)
  }, [])

  useEffect(() => {
    publishOpsMetrics({ remittanceDisbursementRows: rows.length })
  }, [rows])

  useEffect(() => {
    if (!live) return
    void syncRiskProfilesFromLive().catch(() => {})
  }, [live])

  useEffect(() => {
    let cancelled = false
    async function pull() {
      if (!live) return
      setLiveError(null)
      try {
        const p = await liveListDisbursements({ page: '1', pageSize: '200' })
        const next: DisbursementRow[] = p.items.map((raw) => disbursementDtoToRow(raw as DisbursementDto))
        if (!cancelled) {
          setRows(next)
          setSelectedId(null)
        }
      } catch (e) {
        if (!cancelled) setLiveError(e instanceof Error ? e.message : 'Live API failed')
      }
    }
    void pull()
    return () => {
      cancelled = true
    }
  }, [live])

  function closeAuditDrawer() {
    setServerAuditEvents(null)
    setAuditDrawerOpen(false)
  }

  useEffect(() => {
    if (!live || !auditDrawerOpen || !selectedId) return
    let cancelled = false
    void Promise.resolve()
      .then(() => {
        if (cancelled) return null
        setAuditLoading(true)
        return liveGetDisbursementAudit(selectedId)
      })
      .then((r) => {
        if (cancelled || !r) return
        setServerAuditEvents(
          r.events.map((e) => ({
            at: e.at,
            actor: e.actor,
            action: e.action,
            details: e.details,
          })),
        )
      })
      .catch(() => {
        if (!cancelled) setServerAuditEvents([])
      })
      .finally(() => {
        if (!cancelled) setAuditLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [live, auditDrawerOpen, selectedId, auditFetchKey])

  const demoAuditEvents = useMemo((): AuditEvent[] => {
    if (!selectedRow) return []
    const ev: AuditEvent[] = [
      {
        at: selectedRow.createdAt,
        actor: selectedRow.maker,
        action: 'Created for disbursement',
        details: `${selectedRow.channel} payout to ${selectedRow.payoutTo}`,
      },
    ]
    if (selectedRow.status === 'Pending Approval') {
      ev.push({
        at: '2026-03-25 12:40',
        actor: 'System',
        action: 'Queued for maker-checker approval',
      })
    }
    if (selectedRow.checker) {
      ev.push({
        at: '2026-03-25 12:55',
        actor: selectedRow.checker,
        action: selectedRow.status === 'Rejected' ? 'Rejected' : 'Approved',
      })
    }
    if (selectedRow.status === 'Disbursed') {
      ev.push({
        at: '2026-03-25 13:10',
        actor: 'Ops',
        action: 'Marked disbursed',
        details: selectedRow.payoutRef ? `Payout ref ${selectedRow.payoutRef}` : undefined,
      })
    }
    return ev
  }, [selectedRow])

  const auditEvents =
    live && serverAuditEvents !== null ? serverAuditEvents : demoAuditEvents

  const filteredRows = useMemo(() => {
    const q = filters.query.trim().toLowerCase()
    return rows.filter((r) => {
      if (filters.status && r.status !== filters.status) return false
      if (filters.channel && r.channel !== filters.channel) return false
      if (filters.originatingUnit && r.originatingUnit !== filters.originatingUnit) return false
      if (filters.maker && !r.maker.toLowerCase().includes(filters.maker.trim().toLowerCase()))
        return false
      if (!withinRange(r.createdAt, filters.fromDate || undefined, filters.toDate || undefined))
        return false
      if (!q) return true
      return (
        r.remittanceNo.toLowerCase().includes(q) ||
        r.beneficiary.toLowerCase().includes(q) ||
        r.payoutTo.toLowerCase().includes(q)
      )
    })
  }, [rows, filters])

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

  function onApplyFilters() {
    setFilterError(validateFilters())
  }

  function onClear() {
    setFilters({
      query: '',
      status: '',
      channel: '',
      fromDate: '',
      toDate: '',
      maker: '',
      originatingUnit: '',
    })
    setFilterError('')
  }

  async function onImport() {
    setUploadError('')
    if (!uploadFile) {
      setUploadError('Please choose an Excel file.')
      return
    }
    try {
      const imported = await parseExcelRows(uploadFile)
      if (imported.length === 0) {
        setUploadError('No rows found. Add a column like “Remittance No” or “remittanceNo”.')
        return
      }
      const existingIds = new Set(rows.map((r) => r.id))
      setRows((prev) => [...imported.filter((r) => !existingIds.has(r.id)), ...prev])
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
        const imported = await parseExcelRows(uploadFile)
        if (!cancelled) setUploadPreviewCount(imported.length)
      } catch {
        if (!cancelled) setUploadPreviewCount(0)
      }
    }
    void preview()
    return () => {
      cancelled = true
    }
  }, [uploadFile])

  const canApprove = selectedRow?.status === 'Pending Approval'
  const canHold =
    selectedRow?.status === 'Pending Approval' || selectedRow?.status === 'On Hold'
  const canReject = selectedRow?.status === 'Pending Approval'
  const canMarkDisbursed = selectedRow?.status === 'Approved' || selectedRow?.status === 'Queued'

  const holdNextStatus: DisbursementStatus =
    selectedRow?.status === 'On Hold' ? 'Pending Approval' : 'On Hold'

  function isRecoverableLiveFailure(e: unknown, action: 'approve' | 'reject' | 'hold' | 'disburse') {
    if (!(e instanceof ApiHttpError)) return true
    if (e.status === 404 || e.status >= 500) return true
    if (action === 'approve' && /not pending approval/i.test(e.message)) return true
    if (action === 'reject' && /not pending approval/i.test(e.message)) return true
    if (action === 'hold' && /only allowed from pending approval/i.test(e.message)) return true
    if (action === 'disburse' && /requires approved or queued/i.test(e.message)) return true
    if (
      e.status === 400 &&
      e.body != null &&
      typeof e.body.error === 'string' &&
      e.body.error === 'Bad Request' &&
      typeof e.body.path === 'string' &&
      /\/disbursements\/.+\/(approve|reject|mark-disbursed)$/i.test(e.body.path)
    ) {
      return true
    }
    return false
  }

  async function updateSelectedStatus(next: DisbursementStatus) {
    if (!selectedRow) return

    if (live && next === 'Approved') {
      const amountBdt = parseBdtAmountDisplay(selectedRow.amountBDT)
      const sameDay = rows
        .filter(
          (r) =>
            r.beneficiary.toLowerCase() === selectedRow.beneficiary.toLowerCase() &&
            r.createdAt.slice(0, 10) === selectedRow.createdAt.slice(0, 10),
        )
        .map((r) => parseBdtAmountDisplay(r.amountBDT))
      const risk = evaluateRiskForApproval({
        customerName: selectedRow.beneficiary,
        amountBdt,
        sameDayAmountsBdt: sameDay,
      })
      if (!risk.ok) {
        setActionError(risk.reason || 'Risk threshold exceeded.')
        return
      }
      try {
        const dto = await liveApproveDisbursement(selectedRow.id, {
          checkerUser: DEFAULT_DISBURSEMENT_CHECKER,
        })
        setActionError('')
        setRows((prev) =>
          prev.map((r) => (r.id === selectedRow.id ? disbursementDtoToRow(dto) : r)),
        )
        setAuditFetchKey((k) => k + 1)
      } catch (e) {
        if (!isRecoverableLiveFailure(e, 'approve')) {
          setActionError(e instanceof ApiHttpError ? e.message : 'Approve failed.')
          return
        }
        setActionError('Live API unavailable/stale state. Applied local approve fallback.')
      }
    }

    if (live && next === 'Rejected') {
      try {
        const dto = await liveRejectDisbursement(selectedRow.id, {
          checkerUser: DEFAULT_DISBURSEMENT_CHECKER,
        })
        setActionError('')
        setRows((prev) =>
          prev.map((r) => (r.id === selectedRow.id ? disbursementDtoToRow(dto) : r)),
        )
        setAuditFetchKey((k) => k + 1)
      } catch (e) {
        if (!isRecoverableLiveFailure(e, 'reject')) {
          setActionError(e instanceof ApiHttpError ? e.message : 'Reject failed.')
          return
        }
        setActionError('Live API unavailable/stale state. Applied local reject fallback.')
      }
    }

    if (live && next === 'On Hold') {
      try {
        const dto = await livePatchDisbursement(selectedRow.id, { status: 'On Hold' })
        setActionError('')
        setRows((prev) =>
          prev.map((r) => (r.id === selectedRow.id ? disbursementDtoToRow(dto) : r)),
        )
        setAuditFetchKey((k) => k + 1)
      } catch (e) {
        if (!isRecoverableLiveFailure(e, 'hold')) {
          setActionError(e instanceof ApiHttpError ? e.message : 'Hold failed.')
          return
        }
        setActionError('Live API unavailable/stale state. Applied local hold fallback.')
      }
    }

    if (next === 'Approved') {
      const amountBdt = parseBdtAmountDisplay(selectedRow.amountBDT)
      const sameDay = rows
        .filter(
          (r) =>
            r.beneficiary.toLowerCase() === selectedRow.beneficiary.toLowerCase() &&
            r.createdAt.slice(0, 10) === selectedRow.createdAt.slice(0, 10),
        )
        .map((r) => parseBdtAmountDisplay(r.amountBDT))
      const risk = evaluateRiskForApproval({
        customerName: selectedRow.beneficiary,
        amountBdt,
        sameDayAmountsBdt: sameDay,
      })
      if (!risk.ok) {
        setActionError(risk.reason || 'Risk threshold exceeded.')
        return
      }
    }
    setActionError('')
    setRows((prev) =>
      prev.map((r) =>
        r.id === selectedRow.id
          ? {
              ...r,
              status: next,
              checker: next === 'Approved' || next === 'Rejected' ? 'HO-Checker' : r.checker,
            }
          : r,
      ),
    )
  }

  async function markDisbursed() {
    if (!selectedRow) return
    const cover = verifyCoverFundForCurrency('BDT')
    if (!cover.ok) {
      setActionError(`Cover fund gate: ${cover.message}`)
      return
    }
    if (live) {
      try {
        const dto = await liveMarkDisbursed(selectedRow.id, {})
        setActionError('')
        setRows((prev) =>
          prev.map((r) => (r.id === selectedRow.id ? disbursementDtoToRow(dto) : r)),
        )
        setAuditFetchKey((k) => k + 1)
      } catch (e) {
        if (!isRecoverableLiveFailure(e, 'disburse')) {
          setActionError(e instanceof ApiHttpError ? e.message : 'Mark disbursed failed.')
          return
        }
        setActionError('Live API unavailable/stale state. Applied local disburse fallback.')
      }
    }
    setActionError('')
    setRows((prev) =>
      prev.map((r) =>
        r.id === selectedRow.id
          ? {
              ...r,
              status: 'Disbursed',
              payoutRef: r.payoutRef || `${r.channel}-${Math.floor(100000 + Math.random() * 899999)}`,
            }
          : r,
      ),
    )
  }

  const columns: GridColDef<DisbursementRow>[] = useMemo(
    () => [
      { field: 'remittanceNo', headerName: 'Remittance No', flex: 1, minWidth: 170 },
      {
        field: 'originatingUnit',
        headerName: 'Unit',
        flex: 0.5,
        minWidth: 100,
      },
      { field: 'createdAt', headerName: 'Created', flex: 1, minWidth: 160 },
      { field: 'corridor', headerName: 'Corridor', flex: 0.8, minWidth: 120 },
      { field: 'channel', headerName: 'Channel', flex: 0.6, minWidth: 100 },
      {
        field: 'beneficiary',
        headerName: 'Beneficiary',
        flex: 1.1,
        minWidth: 160,
        renderCell: (params) => (
          <Stack
            direction="row"
            alignItems="center"
            gap={0.75}
            sx={{ height: '100%', py: 0.5 }}
          >
            <Typography variant="body2" noWrap sx={{ maxWidth: 200, fontWeight: 500 }}>
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
        field: 'payoutTo',
        headerName: 'Payout to',
        flex: 1.2,
        minWidth: 200,
        renderCell: (params) => (
          <Typography
            variant="body2"
            sx={{ height: '100%', display: 'flex', alignItems: 'center' }}
          >
            {params.value}
          </Typography>
        ),
      },
      {
        field: 'payoutRef',
        headerName: 'Payout ref',
        flex: 0.9,
        minWidth: 150,
        renderCell: (params) => (
          <Typography
            variant="body2"
            sx={{ height: '100%', display: 'flex', alignItems: 'center' }}
          >
            {params.value || '—'}
          </Typography>
        ),
      },
      {
        field: 'amountBDT',
        headerName: 'Amount (BDT)',
        flex: 0.9,
        minWidth: 140,
        align: 'right',
        headerAlign: 'right',
        renderCell: (params) => (
          <Typography
            variant="body2"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              height: '100%',
              width: '100%',
              fontWeight: 500,
            }}
          >
            {params.value}
          </Typography>
        ),
      },
      { field: 'maker', headerName: 'Maker', flex: 0.8, minWidth: 120 },
      {
        field: 'status',
        headerName: 'Status',
        flex: 0.9,
        minWidth: 140,
        renderCell: (params) => (
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
            <Chip
              size="small"
              label={params.value}
              sx={{ bgcolor: statusChip(params.value as DisbursementStatus).bg, color: statusChip(params.value as DisbursementStatus).fg }}
            />
          </Box>
        ),
      },

    ],
    [benNames],
  )

  const filtersValid = validateFilters() === ''

  return (
    <Stack spacing={2.5}>
      {live ? (
        <Alert severity={liveError ? 'warning' : 'info'}>
          {liveError
            ? `Live API: ${liveError}. Showing cached/local data.`
            : 'Live API: list from GET /disbursements; approve/reject/hold/mark-disbursed persist via POST/PATCH; audit from GET …/audit.'}
        </Alert>
      ) : null}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'stretch', md: 'flex-start' }}
        justifyContent="space-between"
        gap={2}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
            Distribution / Disbursement
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Worklist for BEFTN/RTGS/NPSB/MFS payouts (#36), from branches & sub-branches (#37), with maker-checker and audit
            trail (demo).
          </Typography>
        </Box>

        <Stack direction="row" gap={1} flexWrap="wrap" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
          <Button
            variant="outlined"
            startIcon={<UploadFileOutlinedIcon />}
            onClick={() => setUploadOpen(true)}
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
            onClick={() => void updateSelectedStatus(holdNextStatus)}
            sx={{ borderColor: 'divider' }}
          >
            {selectedRow?.status === 'On Hold' ? 'Release hold' : 'Hold'}
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
          <Button
            variant="contained"
            startIcon={<PaidOutlinedIcon />}
            disabled={!canMarkDisbursed}
            onClick={() => void markDisbursed()}
          >
            Mark disbursed
          </Button>
        </Stack>
      </Stack>
      {actionError ? (
        <Alert severity="error" sx={{ color: '#FF0000', '& .MuiAlert-icon': { color: '#FF0000' } }}>
          {actionError}
        </Alert>
      ) : null}

      <Paper sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField
              fullWidth
              label="Search"
              placeholder="Remittance no / Beneficiary / Payout to"
              value={filters.query}
              onChange={(e) => setFilters((s) => ({ ...s, query: e.target.value }))}
            />
            <TextField
              label="Status"
              value={filters.status}
              onChange={(e) =>
                setFilters((s) => ({ ...s, status: e.target.value as '' | DisbursementStatus }))
              }
              placeholder="All"
              sx={{ minWidth: { xs: '100%', md: 220 } }}
            />
            <TextField
              label="Channel"
              value={filters.channel}
              onChange={(e) =>
                setFilters((s) => ({ ...s, channel: e.target.value as '' | DisbursementRow['channel'] }))
              }
              placeholder="All"
              sx={{ minWidth: { xs: '100%', md: 220 } }}
            />
            <TextField
              select
              label="Originating unit"
              value={filters.originatingUnit}
              onChange={(e) =>
                setFilters((s) => ({ ...s, originatingUnit: e.target.value as typeof filters.originatingUnit }))
              }
              sx={{ minWidth: { xs: '100%', md: 200 } }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Branch">Branch</MenuItem>
              <MenuItem value="Sub-Branch">Sub-Branch</MenuItem>
            </TextField>
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
            <TextField
              label="Maker"
              value={filters.maker}
              onChange={(e) => setFilters((s) => ({ ...s, maker: e.target.value }))}
              placeholder="Branch / user"
              sx={{ minWidth: { xs: '100%', md: 220 } }}
            />
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
                onClick={onApplyFilters}
                disabled={!filtersValid}
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
              '& .search-row-selected': { 
                bgcolor: 'rgba(66,171,72,0.12) !important',
                '&:hover': { bgcolor: 'rgba(66,171,72,0.18) !important' }
              },
              '& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus': { outline: 'none' },
            }}
          />

        </Box>
      </Paper>

      <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Excel upload (Distribution / Disbursement)</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Expected columns:
              <Box component="span" sx={{ fontWeight: 900 }}>
                {' '}
                Remittance No / remittanceNo
              </Box>
              , optional: Channel, Payout To, Amount BDT, Status, Maker.
            </Typography>
            <Divider />

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                setUploadError('')
                setUploadFile(e.target.files?.[0] ?? null)
              }}
            />

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
          <Button variant="contained" onClick={onImport}>
            Import
          </Button>
        </DialogActions>
      </Dialog>

      <Drawer
        anchor="right"
        open={auditDrawerOpen}
        onClose={closeAuditDrawer}
        PaperProps={{ sx: { width: { xs: '100%', sm: 460 }, p: 2 } }}
      >
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
            <Box>
              <Typography sx={{ fontWeight: 950 }}>Audit trail</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {selectedRow ? selectedRow.remittanceNo : 'Select a remittance to view events.'}
              </Typography>
            </Box>
            <IconButton onClick={closeAuditDrawer}>
              <ClearOutlinedIcon />
            </IconButton>
          </Stack>

          {!selectedRow ? (
            <Alert severity="info">Select a remittance row first.</Alert>
          ) : live && auditLoading ? (
            <Alert severity="info">Loading audit from API…</Alert>
          ) : (
            <Stack spacing={1}>
              {auditEvents.map((e, idx) => (
                <Paper key={idx} variant="outlined" sx={{ p: 1.5, borderColor: 'divider' }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                    <Typography sx={{ fontWeight: 900 }}>{e.action}</Typography>
                    <Chip
                      size="small"
                      label={e.at}
                      sx={{ bgcolor: 'rgba(0,0,0,0.06)', color: brand.black }}
                    />
                  </Stack>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    Actor:{' '}
                    <Box
                      component="span"
                      sx={{ fontWeight: 900, color: 'text.primary' }}
                    >
                      {e.actor}
                    </Box>
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
    </Stack>
  )
}

