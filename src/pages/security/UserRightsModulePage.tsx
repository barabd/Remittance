import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  FormGroup,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ASSIGNABLE_RIGHTS,
  SECURITY_DIRECTORY_EVENT,
  type DirectoryUser,
  type EmployeeRecord,
  type NewDirectoryUserInput,
  type SecurityAuditEntry,
  type UserActivityEntry,
  type UserRealm,
} from '../../state/securityDirectoryStore'
import {
  getUsers,
  addUser,
  updateUser,
  getEmployees,
  addEmployee,
  updateEmployee,
  getAudit,
  appendAudit,
  getActivity,
  appendActivity
} from '../../integrations/securityDirectory/securityDirectoryRepository'
import { recordSystemSecurityEvent } from '../../state/systemSecurityEventsStore'
import { SystemSecurityEventsPanel } from './SystemSecurityEventsPanel'

function TabPanel({ children, value, index }: { children: ReactNode; value: number; index: number }) {
  if (value !== index) return null
  return <Box sx={{ pt: 2 }}>{children}</Box>
}

export function UserRightsModulePage() {
  const [tab, setTab] = useState(0)
  const [users, setUsers] = useState<DirectoryUser[]>([])
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [audit, setAudit] = useState<SecurityAuditEntry[]>([])
  const [activity, setActivity] = useState<UserActivityEntry[]>([])

  const refresh = useCallback(async () => {
    setUsers(await getUsers())
    setEmployees(await getEmployees())
    setAudit(await getAudit())
    setActivity(await getActivity())
  }, [])

  useEffect(() => {
    refresh()
    const on = () => refresh()
    window.addEventListener(SECURITY_DIRECTORY_EVENT, on as EventListener)
    return () => window.removeEventListener(SECURITY_DIRECTORY_EVENT, on as EventListener)
  }, [refresh])

  useEffect(() => {
    recordSystemSecurityEvent({
      category: 'restricted_access',
      eventType: 'SENSITIVE_MODULE_VIEW',
      actorUserId: 'SecurityAdmin',
      resourceRef: '/security/user-rights',
      environment: 'Demo',
      details: 'User rights & security module route loaded',
      outcome: 'Success',
      how: 'SPA_ROUTE_MOUNT',
    })
  }, [])

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const selectedUser = useMemo(() => users.find((u) => u.id === selectedUserId) ?? null, [users, selectedUserId])

  const [createOpen, setCreateOpen] = useState(false)
  const [rightsOpen, setRightsOpen] = useState(false)
  const [resetPwdOpen, setResetPwdOpen] = useState(false)
  const [empDialogOpen, setEmpDialogOpen] = useState(false)

  const [createForm, setCreateForm] = useState<NewDirectoryUserInput>({
    username: '',
    fullName: '',
    role: 'Maker',
    branch: '',
    realm: 'branch',
    ehBranchUnit: '',
    status: 'Pending Approval',
    maker: 'SecurityAdmin',
    financialTxnLimitBdt: 500_000,
    hoFundingLimitBdt: 0,
  })

  const [rightsDraft, setRightsDraft] = useState<string[]>([])
  const [limitDraft, setLimitDraft] = useState({ fin: '', hoFund: '' })
  const [ehBranchDraft, setEhBranchDraft] = useState('')

  const [empForm, setEmpForm] = useState({
    employeeNo: '',
    fullName: '',
    department: '',
    designation: '',
    email: '',
    phone: '',
    linkedUsername: '',
  })

  const [onlyEhBranch, setOnlyEhBranch] = useState(false)

  const filteredUsers = useMemo(() => {
    if (!onlyEhBranch) return users
    return users.filter((u) => u.realm === 'exchange_house')
  }, [users, onlyEhBranch])

  const userCols: GridColDef<DirectoryUser>[] = useMemo(
    () => [
      { field: 'username', headerName: 'Username', flex: 1, minWidth: 120 },
      { field: 'fullName', headerName: 'Name', flex: 1.1, minWidth: 150 },
      { field: 'role', headerName: 'Role', flex: 0.7, minWidth: 100 },
      { field: 'branch', headerName: 'Branch', flex: 0.9, minWidth: 120 },
      {
        field: 'ehBranchUnit',
        headerName: 'EH branch / counter',
        flex: 1,
        minWidth: 140,
        valueGetter: (_v, row) => row.ehBranchUnit || '—',
      },
      { field: 'status', headerName: 'Status', flex: 0.7, minWidth: 110 },
      {
        field: 'financialTxnLimitBdt',
        headerName: 'Txn limit (৳)',
        type: 'number',
        flex: 0.7,
        minWidth: 110,
      },
      {
        field: 'hoFundingLimitBdt',
        headerName: 'HO fund limit (৳)',
        type: 'number',
        flex: 0.75,
        minWidth: 120,
      },
    ],
    [],
  )

  const empCols: GridColDef<EmployeeRecord>[] = [
    { field: 'employeeNo', headerName: 'Employee no.', flex: 0.8, minWidth: 110 },
    { field: 'fullName', headerName: 'Name', flex: 1.2, minWidth: 160 },
    { field: 'department', headerName: 'Dept', flex: 0.8, minWidth: 100 },
    { field: 'designation', headerName: 'Designation', flex: 1, minWidth: 130 },
    { field: 'email', headerName: 'Email', flex: 1.2, minWidth: 180 },
    { field: 'linkedUsername', headerName: 'Linked user', flex: 0.8, minWidth: 120 },
    { field: 'status', headerName: 'Status', flex: 0.5, minWidth: 80 },
  ]

  function openRights() {
    if (!selectedUser) return
    setRightsDraft([...selectedUser.rights])
    setLimitDraft({
      fin: String(selectedUser.financialTxnLimitBdt),
      hoFund: String(selectedUser.hoFundingLimitBdt),
    })
    setEhBranchDraft(selectedUser.ehBranchUnit ?? '')
    setRightsOpen(true)
  }

  async function saveRights() {
    if (!selectedUser) return
    await updateUser(selectedUser.id, {
      rights: rightsDraft,
      financialTxnLimitBdt: Number(limitDraft.fin.replace(/,/g, '')) || 0,
      hoFundingLimitBdt: Number(limitDraft.hoFund.replace(/,/g, '')) || 0,
      ehBranchUnit: ehBranchDraft.trim(),
    })
    await appendAudit('SecurityAdmin', 'Rights / limits updated', selectedUser.username, {
      how: 'SECURITY_IAM_UI',
    })
    await appendActivity(selectedUser.username, 'Rights or limits changed', undefined, { how: 'SECURITY_IAM_UI' })
    recordSystemSecurityEvent({
      category: 'config_change',
      eventType: 'USER_ENTITLEMENTS_UPDATED',
      actorUserId: 'SecurityAdmin',
      resourceRef: selectedUser.username,
      environment: 'Demo',
      details: 'Rights, limits, or EH branch/counter updated from IAM UI',
      outcome: 'Success',
      how: 'SECURITY_IAM_UI',
    })
    refresh()
    setRightsOpen(false)
  }

  async function setUserActive(active: boolean) {
    if (!selectedUser) return
    await updateUser(selectedUser.id, { status: active ? 'Active' : 'Disabled' })
    await appendAudit('SecurityAdmin', active ? 'User activated' : 'User deactivated', selectedUser.username, {
      how: 'SECURITY_IAM_UI',
    })
    await appendActivity(selectedUser.username, active ? 'Activated' : 'Deactivated', undefined, {
      how: 'SECURITY_IAM_UI',
    })
    recordSystemSecurityEvent({
      category: 'security_alert',
      eventType: active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      actorUserId: 'SecurityAdmin',
      resourceRef: selectedUser.username,
      environment: 'Demo',
      details: active ? 'Directory user activated' : 'Directory user deactivated',
      outcome: 'Success',
      how: 'SECURITY_IAM_UI',
    })
    refresh()
  }

  async function submitCreate() {
    if (!createForm.username.trim() || !createForm.fullName.trim() || !createForm.branch.trim()) return
    const newUser = createForm.username.trim()
    await addUser({
      ...createForm,
      hoFundingLimitBdt:
        createForm.realm === 'ho' ? createForm.hoFundingLimitBdt ?? 10_000_000 : 0,
    })
    recordSystemSecurityEvent({
      category: 'security_alert',
      eventType: 'USER_PROVISIONED',
      actorUserId: 'SecurityAdmin',
      resourceRef: newUser,
      environment: 'Demo',
      details: 'New directory user created from security module',
      outcome: 'Info',
      how: 'SECURITY_IAM_UI',
    })
    refresh()
    setCreateOpen(false)
    setCreateForm({
      username: '',
      fullName: '',
      role: 'Maker',
      branch: '',
      realm: 'branch',
      ehBranchUnit: '',
      status: 'Pending Approval',
      maker: 'SecurityAdmin',
      financialTxnLimitBdt: 500_000,
      hoFundingLimitBdt: 0,
    })
  }

  async function submitResetPassword() {
    if (!selectedUser) return
    await appendAudit('SecurityAdmin', 'Password reset issued (demo)', selectedUser.username, {
      how: 'SECURITY_IAM_UI',
    })
    await appendActivity(selectedUser.username, 'Password reset (demo — wire to IAM)', undefined, {
      how: 'SECURITY_IAM_UI',
    })
    recordSystemSecurityEvent({
      category: 'security_alert',
      eventType: 'PASSWORD_RESET_ISSUED',
      actorUserId: 'SecurityAdmin',
      resourceRef: selectedUser.username,
      environment: 'Demo',
      details: 'Password reset workflow triggered (demo — wire to IAM)',
      outcome: 'Info',
      how: 'SECURITY_IAM_UI',
    })
    refresh()
    setResetPwdOpen(false)
  }

  async function submitNewEmployee() {
    if (!empForm.employeeNo.trim() || !empForm.fullName.trim()) return
    const empNo = empForm.employeeNo.trim()
    await addEmployee({
      employeeNo: empForm.employeeNo.trim(),
      fullName: empForm.fullName.trim(),
      department: empForm.department.trim() || '-',
      designation: empForm.designation.trim() || '-',
      email: empForm.email.trim() || '-',
      phone: empForm.phone.trim() || '-',
      linkedUsername: empForm.linkedUsername.trim() || undefined,
      status: 'Active',
    })
    recordSystemSecurityEvent({
      category: 'config_change',
      eventType: 'EMPLOYEE_MASTER_UPDATED',
      actorUserId: 'SecurityAdmin',
      resourceRef: empNo,
      environment: 'Demo',
      details: 'Employee master record added',
      outcome: 'Success',
      how: 'SECURITY_IAM_UI',
    })
    refresh()
    setEmpDialogOpen(false)
    setEmpForm({
      employeeNo: '',
      fullName: '',
      department: '',
      designation: '',
      email: '',
      phone: '',
      linkedUsername: '',
    })
  }

  const auditCols: GridColDef<SecurityAuditEntry>[] = [
    { field: 'at', headerName: 'When', flex: 1, minWidth: 160 },
    { field: 'actor', headerName: 'Actor', flex: 0.8, minWidth: 120 },
    { field: 'action', headerName: 'Action', flex: 1, minWidth: 140 },
    { field: 'details', headerName: 'Details', flex: 1.4, minWidth: 200 },
  ]

  const actCols: GridColDef<UserActivityEntry>[] = [
    { field: 'at', headerName: 'When', flex: 1, minWidth: 160 },
    { field: 'username', headerName: 'User', flex: 0.9, minWidth: 130 },
    { field: 'action', headerName: 'Action', flex: 1.2, minWidth: 180 },
    { field: 'ip', headerName: 'IP', flex: 0.6, minWidth: 100 },
  ]

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
          User rights module (Security management)
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Employee master, user creation, rights, limits, activation, password reset, security audit, user activity, and{' '}
          <Box component="span" sx={{ fontWeight: 900 }}>System &amp; security events</Box> (errors, alerts, restricted access, file transfers, config) — demo
          persistence only.
        </Typography>
      </Box>

      <Alert severity="info">
        #14 Exchange-house branch users: filter below. #15 Bulk uploads: open{' '}
        <Box component="span" sx={{ fontWeight: 900 }}>Bulk data hub</Box> in the sidebar (Operations). Connect all actions to Java / Oracle APEX IAM in production.
      </Alert>

      <Paper sx={{ px: 2, pt: 1 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="inherit" indicatorColor="primary">
          <Tab label="Employee information" />
          <Tab label="Users & rights" />
          <Tab label="Security audit trail" />
          <Tab label="User activity log" />
          <Tab label="System & security events" />
        </Tabs>
      </Paper>

      <TabPanel value={tab} index={0}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Employee information (#1)
          </Typography>
          <Button variant="contained" onClick={() => setEmpDialogOpen(true)}>
            Add employee
          </Button>
        </Stack>
        <Paper sx={{ p: 1, height: 420 }}>
          <DataGrid
            rows={employees}
            columns={empCols}
            disableRowSelectionOnClick
            onRowClick={async (p) => {
              const e = employees.find((x) => x.id === p.row.id)
              if (e)
                await updateEmployee(e.id, {
                  status: e.status === 'Active' ? 'Inactive' : 'Active',
                })
              refresh()
            }}
            initialState={{ pagination: { paginationModel: { pageSize: 8, page: 0 } } }}
            pageSizeOptions={[8, 25]}
            sx={{ border: 0 }}
          />
        </Paper>
        <Typography variant="caption" color="text.secondary">
          Tip: row click toggles Active/Inactive (demo).
        </Typography>
      </TabPanel>

      <TabPanel value={tab} index={1}>
        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1 }} alignItems="center">
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            User creation (#2) · Assign rights (#3) · Limits (#4–#5) · Activate (#6) · Reset password (#7)
          </Typography>
          <Button variant="outlined" size="small" onClick={() => setOnlyEhBranch((v) => !v)}>
            {onlyEhBranch ? 'Show all users' : 'Exchange house branch users only (#14)'}
          </Button>
        </Stack>
        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
          <Button variant="contained" onClick={() => setCreateOpen(true)}>
            Create user
          </Button>
          <Button variant="outlined" disabled={!selectedUser} onClick={openRights}>
            Assign rights &amp; limits
          </Button>
          <Button variant="outlined" color="success" disabled={!selectedUser} onClick={() => setUserActive(true)}>
            Activate
          </Button>
          <Button variant="outlined" color="warning" disabled={!selectedUser} onClick={() => setUserActive(false)}>
            Deactivate
          </Button>
          <Button variant="outlined" disabled={!selectedUser} onClick={() => setResetPwdOpen(true)}>
            Reset password
          </Button>
        </Stack>
        <Paper sx={{ p: 1, height: 440 }}>
          <DataGrid
            rows={filteredUsers}
            columns={userCols}
            disableRowSelectionOnClick
            onRowClick={(p) => setSelectedUserId(String(p.row.id))}
            initialState={{ pagination: { paginationModel: { pageSize: 8, page: 0 } } }}
            pageSizeOptions={[8, 25]}
            sx={{ border: 0 }}
          />
        </Paper>
      </TabPanel>

      <TabPanel value={tab} index={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
          Audit trail (#8)
        </Typography>
        <Paper sx={{ p: 1, height: 440 }}>
          <DataGrid
            rows={audit}
            columns={auditCols}
            disableRowSelectionOnClick
            initialState={{ pagination: { paginationModel: { pageSize: 8, page: 0 } } }}
            pageSizeOptions={[8, 25]}
            sx={{ border: 0 }}
          />
        </Paper>
      </TabPanel>

      <TabPanel value={tab} index={3}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
          User activity log (#9)
        </Typography>
        <Paper sx={{ p: 1, height: 440 }}>
          <DataGrid
            rows={activity}
            columns={actCols}
            disableRowSelectionOnClick
            initialState={{ pagination: { paginationModel: { pageSize: 8, page: 0 } } }}
            pageSizeOptions={[8, 25]}
            sx={{ border: 0 }}
          />
        </Paper>
      </TabPanel>

      <TabPanel value={tab} index={4}>
        <SystemSecurityEventsPanel />
      </TabPanel>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create user (#2)</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <TextField
              label="Username"
              value={createForm.username}
              onChange={(e) => setCreateForm((s) => ({ ...s, username: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Full name"
              value={createForm.fullName}
              onChange={(e) => setCreateForm((s) => ({ ...s, fullName: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              select
              label="Role"
              value={createForm.role}
              onChange={(e) =>
                setCreateForm((s) => ({ ...s, role: e.target.value as DirectoryUser['role'] }))
              }
              fullWidth
            >
              {(['HO Admin', 'Checker', 'Maker', 'Finance', 'Auditor'] as const).map((r) => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Branch / unit"
              value={createForm.branch}
              onChange={(e) => setCreateForm((s) => ({ ...s, branch: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              select
              label="Population"
              value={createForm.realm}
              onChange={(e) => setCreateForm((s) => ({ ...s, realm: e.target.value as UserRealm }))}
              fullWidth
            >
              <MenuItem value="ho">Head office</MenuItem>
              <MenuItem value="branch">Branch / sub-branch</MenuItem>
              <MenuItem value="exchange_house">Exchange house (#14)</MenuItem>
            </TextField>
            {createForm.realm === 'exchange_house' ? (
              <TextField
                label="EH branch / counter"
                value={createForm.ehBranchUnit}
                onChange={(e) => setCreateForm((s) => ({ ...s, ehBranchUnit: e.target.value }))}
                fullWidth
                placeholder="e.g. EH-GULF-01 / Counter-B"
              />
            ) : null}
            <TextField
              select
              label="Initial status"
              value={createForm.status}
              onChange={(e) =>
                setCreateForm((s) => ({ ...s, status: e.target.value as DirectoryUser['status'] }))
              }
              fullWidth
            >
              <MenuItem value="Pending Approval">Pending Approval</MenuItem>
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Disabled">Disabled</MenuItem>
            </TextField>
            <TextField
              label="Financial transaction limit (BDT)"
              type="number"
              value={createForm.financialTxnLimitBdt}
              onChange={(e) =>
                setCreateForm((s) => ({ ...s, financialTxnLimitBdt: Number(e.target.value) || 0 }))
              }
              fullWidth
            />
            {createForm.realm === 'ho' ? (
              <TextField
                label="HO funding limit (BDT)"
                type="number"
                value={createForm.hoFundingLimitBdt ?? 0}
                onChange={(e) =>
                  setCreateForm((s) => ({ ...s, hoFundingLimitBdt: Number(e.target.value) || 0 }))
                }
                fullWidth
              />
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitCreate}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rightsOpen} onClose={() => setRightsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign user rights (#3) · Limits (#4–#5)</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {selectedUser?.username}
          </Typography>
          <FormGroup>
            {ASSIGNABLE_RIGHTS.map((r) => (
              <FormControlLabel
                key={r.key}
                control={
                  <Checkbox
                    checked={rightsDraft.includes(r.key)}
                    onChange={(_, c) =>
                      setRightsDraft((prev) =>
                        c ? [...prev, r.key] : prev.filter((x) => x !== r.key),
                      )
                    }
                  />
                }
                label={r.label}
              />
            ))}
          </FormGroup>
          <Divider sx={{ my: 2 }} />
          <TextField
            label="Financial transaction limit (BDT)"
            value={limitDraft.fin}
            onChange={(e) => setLimitDraft((s) => ({ ...s, fin: e.target.value }))}
            fullWidth
            sx={{ mb: 1.5 }}
          />
          <TextField
            label="HO funding limit (BDT)"
            value={limitDraft.hoFund}
            onChange={(e) => setLimitDraft((s) => ({ ...s, hoFund: e.target.value }))}
            fullWidth
            sx={{ mb: 1.5 }}
          />
          <TextField
            label="EH branch / counter (#14)"
            value={ehBranchDraft}
            onChange={(e) => setEhBranchDraft(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRightsOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveRights}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={resetPwdOpen} onClose={() => setResetPwdOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Reset password (#7)</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Demo: logs audit entry only. Production should call your Java auth service to invalidate sessions and email a
            reset link.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetPwdOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitResetPassword}>
            Confirm reset
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={empDialogOpen} onClose={() => setEmpDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add employee (#1)</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <TextField
              label="Employee no."
              value={empForm.employeeNo}
              onChange={(e) => setEmpForm((s) => ({ ...s, employeeNo: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Full name"
              value={empForm.fullName}
              onChange={(e) => setEmpForm((s) => ({ ...s, fullName: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Department"
              value={empForm.department}
              onChange={(e) => setEmpForm((s) => ({ ...s, department: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Designation"
              value={empForm.designation}
              onChange={(e) => setEmpForm((s) => ({ ...s, designation: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Email"
              value={empForm.email}
              onChange={(e) => setEmpForm((s) => ({ ...s, email: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Phone"
              value={empForm.phone}
              onChange={(e) => setEmpForm((s) => ({ ...s, phone: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Linked username (optional)"
              value={empForm.linkedUsername}
              onChange={(e) => setEmpForm((s) => ({ ...s, linkedUsername: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmpDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitNewEmployee}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
