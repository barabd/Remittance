import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined'
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined'
import DoneOutlinedIcon from '@mui/icons-material/DoneOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import PauseCircleOutlineOutlinedIcon from '@mui/icons-material/PauseCircleOutlineOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react'
import * as XLSX from 'xlsx'
import { brand } from '../theme/appTheme'
import {
  defaultRightsForRole,
  loadDirectoryUsers,
  saveDirectoryUsers,
  SECURITY_DIRECTORY_EVENT,
  type ApprovalStatus,
  type DirectoryUser,
  type UserRealm,
} from '../state/securityDirectoryStore'
import { recordPrivilegedAuditEvent } from '../state/privilegedActionsAuditStore'
import { AdministrationPrivilegedAuditPanel } from './administration/AdministrationPrivilegedAuditPanel'
import { getBranches, createBranch, updateBranch as liveUpdateBranch } from '../integrations/administration/adminRepository'

type AdminTab = 'users' | 'branches' | 'privileged_actions'

type BranchRow = {
  id: string
  branchCode: string
  branchName: string
  type: 'Head Office' | 'Branch' | 'Sub-Branch' | 'Exchange House'
  district: string
  status: ApprovalStatus
  maker: string
  checker?: string
  createdAt: string
}

type AuditEvent = {
  at: string
  actor: string
  action: string
  details?: string
}

const seedBranches: BranchRow[] = [
  {
    id: 'BR-000',
    branchCode: '000',
    branchName: 'Head Office',
    type: 'Head Office',
    district: 'Dhaka',
    status: 'Active',
    maker: 'System',
    checker: 'System',
    createdAt: '2026-03-01 09:00',
  },
  {
    id: 'BR-101',
    branchCode: '101',
    branchName: 'Branch-01',
    type: 'Branch',
    district: 'Dhaka',
    status: 'Active',
    maker: 'HO Admin',
    checker: 'HO Admin',
    createdAt: '2026-03-05 11:20',
  },
  {
    id: 'BR-301',
    branchCode: '301',
    branchName: 'Sub-Branch-03',
    type: 'Sub-Branch',
    district: 'Chattogram',
    status: 'Pending Approval',
    maker: 'HO Admin',
    createdAt: '2026-03-25 10:55',
  },
] as const

function statusChip(status: ApprovalStatus) {
  const map: Record<ApprovalStatus, { bg: string; fg: string }> = {
    Active: { bg: 'rgba(66,171,72,0.14)', fg: brand.green },
    'Pending Approval': { bg: 'rgba(255,255,255,0.22)', fg: brand.black },
    Approved: { bg: 'rgba(66,171,72,0.14)', fg: brand.green },
    Rejected: { bg: 'rgba(0,0,0,0.08)', fg: brand.black },
    'On Hold': { bg: 'rgba(0,0,0,0.06)', fg: brand.black },
    Disabled: { bg: 'rgba(0,0,0,0.08)', fg: brand.black },
  }
  return map[status]
}

function parseExcelRows<T extends Record<string, unknown>>(file: File) {
  return new Promise<T[]>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json<T>(firstSheet, { defval: '' })
        resolve(json)
      } catch (e) {
        reject(e)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

export function AdministrationPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [tab, setTab] = useState<AdminTab>('users')
  const [users, setUsers] = useState<DirectoryUser[]>(() => loadDirectoryUsers())
  const [branches, setBranches] = useState<BranchRow[]>([])
  const [userRealmFilter, setUserRealmFilter] = useState<'all' | UserRealm>('all')

  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const liveB = await getBranches()
      if (liveB.length > 0) setBranches(liveB)
      else setBranches([...seedBranches])
    }
    load()
    const on = () => setUsers(loadDirectoryUsers())
    window.addEventListener(SECURITY_DIRECTORY_EVENT, on as EventListener)
    return () => window.removeEventListener(SECURITY_DIRECTORY_EVENT, on as EventListener)
  }, [])

  const selectedUser = useMemo(
    () => (tab === 'users' ? users.find((u) => u.id === selectedId) ?? null : null),
    [tab, users, selectedId],
  )
  const selectedBranch = useMemo(
    () => (tab === 'branches' ? branches.find((b) => b.id === selectedId) ?? null : null),
    [tab, branches, selectedId],
  )
  const selectedAny = selectedUser ?? selectedBranch

  const [filters, setFilters] = useState({
    query: '',
    status: '' as '' | ApprovalStatus,
    branch: '',
    role: '',
  })
  const [filterError, setFilterError] = useState('')

  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [uploadPreviewCount, setUploadPreviewCount] = useState(0)

  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false)

  const auditEvents = useMemo((): AuditEvent[] => {
    if (!selectedAny) return []
    const createdAt = selectedAny.createdAt ?? '2026-03-25 00:00'
    const maker = selectedAny.maker ?? 'System'
    const base: AuditEvent[] = [
      {
        at: createdAt,
        actor: maker,
        action: tab === 'users' ? 'Created user' : 'Created branch',
      },
    ]
    if (selectedAny.status === 'Pending Approval') {
      base.push({
        at: '2026-03-25 11:00',
        actor: 'System',
        action: 'Queued for maker-checker approval',
      })
    }
    if (selectedAny.checker) {
      base.push({
        at: '2026-03-25 11:10',
        actor: selectedAny.checker,
        action: 'Reviewed',
      })
    }
    return base
  }, [selectedAny, tab])

  function handleTabChange(_: SyntheticEvent, v: AdminTab) {
    setTab(v)
    setSelectedId(null)
    setAuditDrawerOpen(false)
    setUserRealmFilter('all')
  }

  const filteredUsers = useMemo(() => {
    const q = filters.query.trim().toLowerCase()
    return users.filter((u) => {
      if (userRealmFilter !== 'all' && u.realm !== userRealmFilter) return false
      if (filters.status && u.status !== filters.status) return false
      if (filters.branch && !u.branch.toLowerCase().includes(filters.branch.trim().toLowerCase()))
        return false
      if (filters.role && !u.role.toLowerCase().includes(filters.role.trim().toLowerCase()))
        return false
      if (!q) return true
      return (
        u.username.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        u.maker.toLowerCase().includes(q)
      )
    })
  }, [users, filters, userRealmFilter])

  const filteredBranches = useMemo(() => {
    const q = filters.query.trim().toLowerCase()
    return branches.filter((b) => {
      if (filters.status && b.status !== filters.status) return false
      if (filters.branch && !b.branchName.toLowerCase().includes(filters.branch.trim().toLowerCase()))
        return false
      if (!q) return true
      return (
        b.branchCode.toLowerCase().includes(q) ||
        b.branchName.toLowerCase().includes(q) ||
        b.district.toLowerCase().includes(q)
      )
    })
  }, [branches, filters])

  function validateFilters() {
    if (filters.query.length > 80) return 'Search text is too long.'
    return ''
  }

  function onApplyFilters() {
    setFilterError(validateFilters())
  }

  function onClear() {
    setFilters({ query: '', status: '', branch: '', role: '' })
    setFilterError('')
  }

  const canApprove = Boolean(selectedAny && (selectedAny.status === 'Pending Approval' || selectedAny.status === 'On Hold'))
  const canHold = Boolean(selectedAny && (selectedAny.status === 'Pending Approval' || selectedAny.status === 'Active' || selectedAny.status === 'Approved'))
  const canReject = Boolean(selectedAny && (selectedAny.status === 'Pending Approval' || selectedAny.status === 'On Hold'))

  function updateSelectedStatus(next: ApprovalStatus) {
    if (!selectedAny) return
    const kind = tab === 'users' ? 'User' : 'Branch'
    const ref =
      tab === 'users'
        ? (selectedAny as DirectoryUser).username
        : `${(selectedAny as BranchRow).branchCode} ${(selectedAny as BranchRow).branchName}`
    recordPrivilegedAuditEvent({
      category: 'admin_action',
      eventType: 'MAKER_CHECKER_DECISION',
      actorUserId: 'HO Admin',
      resourceRef: ref,
      environment: 'Production',
      details: `${kind} ${selectedAny.id}: maker-checker status → ${next}`,
      outcome: next === 'Rejected' ? 'Info' : 'Success',
      how: 'ADMIN_UI_MAKER_CHECKER',
    })
    if (tab === 'users') {
      setUsers((prev) => {
        const mapped = prev.map((u) =>
          u.id === selectedAny.id
            ? {
                ...u,
                status: next,
                checker: next === 'Approved' || next === 'Rejected' ? 'HO Admin' : u.checker,
              }
            : u,
        )
        saveDirectoryUsers(mapped)
        return mapped
      })
    } else {
      setBranches((prev) =>
        prev.map((b) =>
          b.id === selectedAny.id
            ? {
                ...b,
                status: next,
                checker: next === 'Approved' || next === 'Rejected' ? 'HO Admin' : b.checker,
              }
            : b,
        ),
      )
      liveUpdateBranch(selectedAny.id, {
        status: next,
        checker: next === 'Approved' || next === 'Rejected' ? 'HO Admin' : (selectedAny as BranchRow).checker,
      }).catch(console.error)
    }
  }

  async function onImport() {
    setUploadError('')
    if (!uploadFile) {
      setUploadError('Please choose an Excel file.')
      return
    }

    try {
      const raw = await parseExcelRows<Record<string, unknown>>(uploadFile)
      if (raw.length === 0) {
        setUploadError('No rows found in file.')
        return
      }

      if (tab === 'users') {
        const imported: DirectoryUser[] = raw
          .map((r, idx) => {
            const username = String(r.username ?? r.Username ?? '').trim()
            if (!username) return null
            const fullName = String(r.fullName ?? r.FullName ?? r['Full Name'] ?? '').trim() || username
            const role = (String(r.role ?? r.Role ?? '').trim() as DirectoryUser['role']) || 'Maker'
            const branch = String(r.branch ?? r.Branch ?? '').trim() || 'Head Office'
            const realmRaw = String(r.realm ?? r.Realm ?? r.userRealm ?? '').trim().toLowerCase()
            const realm: UserRealm =
              realmRaw === 'ho' || realmRaw === 'head'
                ? 'ho'
                : realmRaw === 'exchange_house' || realmRaw === 'eh' || realmRaw === 'exchange'
                  ? 'exchange_house'
                  : realmRaw === 'branch'
                    ? 'branch'
                    : branch.toUpperCase().startsWith('EH-')
                      ? 'exchange_house'
                      : branch === 'Head Office'
                        ? 'ho'
                        : 'branch'
            const status = (String(r.status ?? r.Status ?? '').trim() as ApprovalStatus) || 'Pending Approval'
            const maker = String(r.maker ?? r.Maker ?? '').trim() || 'Excel'
            const createdAt = String(r.createdAt ?? r.CreatedAt ?? '').trim() || '2026-03-25 00:00'
            const ehBranchUnit = String(r.ehBranchUnit ?? r.EHBranch ?? r['EH Branch'] ?? '').trim()
            const employeeId = String(r.employeeId ?? r.EmployeeId ?? '').trim() || undefined
            const fin = Number(r.financialTxnLimitBdt ?? r.txnLimit ?? '') || 500_000
            const hoFund = Number(r.hoFundingLimitBdt ?? r.hoFund ?? '') || (realm === 'ho' ? 10_000_000 : 0)
            return {
              id: `USR-X-${idx}-${username}`,
              username,
              fullName,
              role,
              branch,
              realm,
              ehBranchUnit,
              employeeId,
              status,
              maker,
              checker: '',
              createdAt,
              rights: defaultRightsForRole(role),
              financialTxnLimitBdt: fin,
              hoFundingLimitBdt: hoFund,
            } satisfies DirectoryUser
          })
          .filter(Boolean) as DirectoryUser[]

        setUsers((prev) => {
          const next = [...imported, ...prev]
          saveDirectoryUsers(next)
          return next
        })
        recordPrivilegedAuditEvent({
          category: 'admin_action',
          eventType: 'BULK_USER_IMPORT',
          actorUserId: 'HO Admin',
          environment: 'Production',
          resourceRef: `rows:${imported.length}`,
          details: `Excel bulk import: ${imported.length} user row(s) staged`,
          outcome: 'Success',
          how: 'ADMIN_UI_EXCEL_IMPORT',
        })
      } else {
        const imported: BranchRow[] = raw
          .map((r, idx) => {
            const branchCode = String(r.branchCode ?? r.BranchCode ?? r['Branch Code'] ?? '').trim()
            const branchName = String(r.branchName ?? r.BranchName ?? r['Branch Name'] ?? '').trim()
            if (!branchCode || !branchName) return null
            const type = (String(r.type ?? r.Type ?? '').trim() as BranchRow['type']) || 'Branch'
            const district = String(r.district ?? r.District ?? '').trim() || '-'
            const status = (String(r.status ?? r.Status ?? '').trim() as ApprovalStatus) || 'Pending Approval'
            const maker = String(r.maker ?? r.Maker ?? '').trim() || 'Excel'
            const createdAt = String(r.createdAt ?? r.CreatedAt ?? '').trim() || '2026-03-25 00:00'
            return {
              id: `BR-X-${idx}-${branchCode}`,
              branchCode,
              branchName,
              type,
              district,
              status,
              maker,
              checker: '',
              createdAt,
            } satisfies BranchRow
          })
          .filter(Boolean) as BranchRow[]

        setBranches((prev) => [...imported, ...prev])
        Promise.all(imported.map((x) => createBranch(x))).catch(console.error)
        recordPrivilegedAuditEvent({
          category: 'admin_action',
          eventType: 'BULK_BRANCH_IMPORT',
          actorUserId: 'HO Admin',
          environment: 'Production',
          resourceRef: `rows:${imported.length}`,
          details: `Excel bulk import: ${imported.length} branch row(s) staged`,
          outcome: 'Success',
          how: 'ADMIN_UI_EXCEL_IMPORT',
        })
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
        const raw = await parseExcelRows<Record<string, unknown>>(uploadFile)
        if (!cancelled) setUploadPreviewCount(raw.length)
      } catch {
        if (!cancelled) setUploadPreviewCount(0)
      }
    }
    void preview()
    return () => {
      cancelled = true
    }
  }, [uploadFile])

  const userColumns: GridColDef<DirectoryUser>[] = [
    { field: 'username', headerName: 'Username', flex: 1, minWidth: 140 },
    { field: 'fullName', headerName: 'Full name', flex: 1.2, minWidth: 170 },
    {
      field: 'realm',
      headerName: 'Population',
      flex: 0.85,
      minWidth: 130,
      renderCell: (p) =>
        p.value === 'ho'
          ? 'Head office'
          : p.value === 'exchange_house'
            ? 'Exchange house'
            : 'Branch / sub',
    },
    { field: 'role', headerName: 'Role', flex: 0.9, minWidth: 140 },
    { field: 'branch', headerName: 'Branch', flex: 1, minWidth: 160 },
    { field: 'maker', headerName: 'Maker', flex: 0.8, minWidth: 130 },
    { field: 'createdAt', headerName: 'Created', flex: 1, minWidth: 160 },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.9,
      minWidth: 150,
      renderCell: (params) => (
        <Chip
          size="small"
          label={params.value}
          sx={{
            bgcolor: statusChip(params.value).bg,
            color: statusChip(params.value).fg,
            fontWeight: 900,
            fontSize: '0.7rem',
            '& .MuiChip-label': { px: 1 },
          }}
        />
      ),
    },
  ]

  const branchColumns: GridColDef<BranchRow>[] = [
    { field: 'branchCode', headerName: 'Code', flex: 0.6, minWidth: 100 },
    { field: 'branchName', headerName: 'Branch name', flex: 1.4, minWidth: 180 },
    { field: 'type', headerName: 'Type', flex: 1, minWidth: 160 },
    { field: 'district', headerName: 'District', flex: 1, minWidth: 140 },
    { field: 'maker', headerName: 'Maker', flex: 0.8, minWidth: 130 },
    { field: 'createdAt', headerName: 'Created', flex: 1, minWidth: 160 },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.9,
      minWidth: 150,
      renderCell: (params) => (
        <Chip
          size="small"
          label={params.value}
          sx={{
            bgcolor: statusChip(params.value).bg,
            color: statusChip(params.value).fg,
            fontWeight: 900,
            fontSize: '0.7rem',
            '& .MuiChip-label': { px: 1 },
          }}
        />
      ),
    },
  ]

  const filtersValid = validateFilters() === ''

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'stretch', md: 'flex-start' }}
        justifyContent="space-between"
        gap={2}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
            Administration
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            A.1.4 #10–#13: users, branches, maker-checker. Tab <Box component="span" sx={{ fontWeight: 900 }}>Privileged actions audit</Box>: admin logins/actions, DB
            changes, deployments, privilege escalations (stored in SQL Server).
          </Typography>
        </Box>

        <Stack direction="row" gap={1} flexWrap="wrap" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
          <Button
            variant="outlined"
            startIcon={<UploadFileOutlinedIcon />}
            disabled={tab === 'privileged_actions'}
            onClick={() => setUploadOpen(true)}
            sx={{ borderColor: 'divider' }}
          >
            Excel upload
          </Button>
          <Button
            variant="outlined"
            startIcon={<HistoryOutlinedIcon />}
            disabled={!selectedAny || tab === 'privileged_actions'}
            onClick={() => setAuditDrawerOpen(true)}
            sx={{ borderColor: 'divider' }}
          >
            Audit trail
          </Button>
          <Button
            variant="contained"
            startIcon={<DoneOutlinedIcon />}
            disabled={!canApprove || tab === 'privileged_actions'}
            onClick={() => updateSelectedStatus('Approved')}
          >
            Approve
          </Button>
          <Button
            variant="outlined"
            startIcon={<PauseCircleOutlineOutlinedIcon />}
            disabled={!canHold || tab === 'privileged_actions'}
            onClick={() => updateSelectedStatus('On Hold')}
            sx={{ borderColor: 'divider' }}
          >
            Hold
          </Button>
          <Button
            variant="outlined"
            startIcon={<CloseOutlinedIcon />}
            disabled={!canReject || tab === 'privileged_actions'}
            onClick={() => updateSelectedStatus('Rejected')}
            sx={{ borderColor: 'divider' }}
          >
            Reject
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ px: 2, pt: 1 }}>
        <Tabs value={tab} onChange={handleTabChange} textColor="inherit" indicatorColor="primary">
          <Tab value="users" label="Users & roles" />
          <Tab value="branches" label="Branches & sub-branches" />
          <Tab value="privileged_actions" label="Privileged actions audit" />
        </Tabs>
      </Paper>

      {tab === 'privileged_actions' ? (
        <AdministrationPrivilegedAuditPanel />
      ) : null}

      {tab === 'users' ? (
        <Paper sx={{ px: 2, py: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            User population (A.1.4 #11–#13)
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={userRealmFilter}
            onChange={(_, v) => v != null && setUserRealmFilter(v)}
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="ho">Head office</ToggleButton>
            <ToggleButton value="branch">Branch / sub-branch</ToggleButton>
            <ToggleButton value="exchange_house">Exchange house</ToggleButton>
          </ToggleButtonGroup>
        </Paper>
      ) : null}

      {tab !== 'privileged_actions' ? (
      <Paper sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField
              fullWidth
              label="Search"
              placeholder={tab === 'users' ? 'Username / Full name / Maker' : 'Code / Branch name / District'}
              value={filters.query}
              onChange={(e) => setFilters((s) => ({ ...s, query: e.target.value }))}
              error={Boolean(filterError)}
              helperText={filterError || ' '}
            />
            <TextField
              label="Status"
              value={filters.status}
              onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value as '' | ApprovalStatus }))}
              placeholder="All"
              sx={{ minWidth: { xs: '100%', md: 220 } }}
            />
            <TextField
              label={tab === 'users' ? 'Branch' : 'Branch name'}
              value={filters.branch}
              onChange={(e) => setFilters((s) => ({ ...s, branch: e.target.value }))}
              placeholder={tab === 'users' ? 'Head Office / Branch' : 'Branch-01'}
              sx={{ minWidth: { xs: '100%', md: 240 } }}
            />
            {tab === 'users' ? (
              <TextField
                label="Role"
                value={filters.role}
                onChange={(e) => setFilters((s) => ({ ...s, role: e.target.value }))}
                placeholder="Maker / Checker / Admin"
                sx={{ minWidth: { xs: '100%', md: 240 } }}
              />
            ) : null}
          </Stack>

          <Stack direction="row" gap={1} justifyContent="flex-end">
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
      </Paper>
      ) : null}

      {tab !== 'privileged_actions' ? (
      <Paper sx={{ p: 1.5 }}>
        <Box sx={{ height: 560 }}>
          {tab === 'users' ? (
            <DataGrid
              rows={filteredUsers}
              columns={userColumns}
              disableRowSelectionOnClick
              onRowClick={(p) => setSelectedId(String(p.row.id))}
              initialState={{
                pagination: { paginationModel: { pageSize: 10, page: 0 } },
              }}
              pageSizeOptions={[10, 25, 50]}
              sx={{
                border: 0,
                '& .MuiDataGrid-columnHeaders': {
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                },
                '& .MuiDataGrid-row:hover': { bgcolor: 'rgba(66,171,72,0.06)' },
                '& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus': {
                  outline: 'none',
                },
              }}
            />
          ) : (
            <DataGrid
              rows={filteredBranches}
              columns={branchColumns}
              disableRowSelectionOnClick
              onRowClick={(p) => setSelectedId(String(p.row.id))}
              initialState={{
                pagination: { paginationModel: { pageSize: 10, page: 0 } },
              }}
              pageSizeOptions={[10, 25, 50]}
              sx={{
                border: 0,
                '& .MuiDataGrid-columnHeaders': {
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                },
                '& .MuiDataGrid-row:hover': { bgcolor: 'rgba(66,171,72,0.06)' },
                '& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus': {
                  outline: 'none',
                },
              }}
            />
          )}
        </Box>
      </Paper>
      ) : null}

      <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Excel upload ({tab === 'users' ? 'Users' : 'Branches'})</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Box sx={{ mt: 1 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  setUploadError('')
                  setUploadFile(e.target.files?.[0] ?? null)
                }}
                style={{ display: 'none' }}
                id="admin-excel-upload"
              />
              <label htmlFor="admin-excel-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<UploadFileOutlinedIcon />}
                  fullWidth
                  sx={{ py: 2, borderStyle: 'dashed', borderWidth: 2 }}
                >
                  {uploadFile ? 'Change File' : 'Choose Excel File'}
                </Button>
              </label>
            </Box>

            {uploadFile ? (
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'rgba(0,0,0,0.02)', borderColor: 'divider' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 900 }}>
                      {uploadFile.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {uploadPreviewCount} rows detected
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      setUploadFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                  >
                    <ClearOutlinedIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Paper>
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
        onClose={() => setAuditDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 460 }, p: 2 } }}
      >
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
            <Box>
              <Typography sx={{ fontWeight: 950 }}>Audit trail</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {selectedAny ? `${selectedAny.id}` : 'Select a record to view events.'}
              </Typography>
            </Box>
            <IconButton onClick={() => setAuditDrawerOpen(false)}>
              <ClearOutlinedIcon />
            </IconButton>
          </Stack>

          {!selectedAny ? (
            <Alert severity="info">Select a row first.</Alert>
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
                    <Box component="span" sx={{ fontWeight: 900, color: 'text.primary' }}>
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

