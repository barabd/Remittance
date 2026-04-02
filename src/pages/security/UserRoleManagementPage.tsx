import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { useState, type ReactNode } from 'react'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined'
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined'

function TabPanel({ children, value, index }: { children: ReactNode; value: number; index: number }) {
  if (value !== index) return null
  return <Box sx={{ pt: 3 }}>{children}</Box>
}

export function UserRoleManagementPage() {
  const [tab, setTab] = useState(0)

  const adminCols: GridColDef[] = [
    { field: 'username', headerName: 'Username', flex: 1 },
    { field: 'fullName', headerName: 'Full Name', flex: 1 },
    { field: 'role', headerName: 'Role', flex: 0.8, renderCell: (p) => <Chip label={p.value} size="small" /> },
    { field: 'status', headerName: 'Status', flex: 0.7, renderCell: (p) => <Chip label={p.value} color={p.value === 'Active' ? 'success' : 'default'} size="small" /> },
    { field: 'lastLogin', headerName: 'Last Login', flex: 1 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      renderCell: (p) => (
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="text"
            color={p.row.status === 'Active' ? 'error' : 'success'}
            onClick={() => handleToggleAdmin(p.row.id)}
          >
            {p.row.status === 'Active' ? 'Disable' : 'Enable'}
          </Button>
        </Stack>
      ),
    },
  ]

  const agentCols: GridColDef[] = [
    { field: 'agentCode', headerName: 'Agent Code', flex: 0.8 },
    { field: 'agentName', headerName: 'Agent Name', flex: 1.2 },
    { field: 'userCount', headerName: 'Active Users', flex: 0.7, type: 'number' },
    { field: 'commissionRate', headerName: 'Comm %', flex: 0.6, type: 'number' },
    { field: 'status', headerName: 'Status', flex: 0.7, renderCell: (p) => <Chip label={p.value} color={p.value === 'Active' ? 'success' : 'default'} size="small" /> },
  ]

  const customerCols: GridColDef[] = [
    { field: 'id', headerName: 'Ref', flex: 0.7 },
    { field: 'name', headerName: 'Customer Name', flex: 1.2 },
    { field: 'nid', headerName: 'NID / Passport', flex: 1 },
    { field: 'status', headerName: 'Status', flex: 0.8, renderCell: (p) => <Chip label={p.value} color={p.value === 'Approved' ? 'success' : 'warning'} size="small" /> },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      renderCell: (p) => (
        <Stack direction="row" spacing={1}>
          {p.row.status === 'Pending' ? (
            <>
              <Button size="small" variant="text" color="success" onClick={() => handleSetCustStatus(p.id, 'Approved')}>Approve</Button>
              <Button size="small" variant="text" color="error" onClick={() => handleSetCustStatus(p.id, 'Rejected')}>Reject</Button>
            </>
          ) : (
            <Button size="small" variant="text" onClick={() => handleSetCustStatus(p.id, 'Pending')}>Reset</Button>
          )}
        </Stack>
      ),
    },
  ]

  const [admins, setAdmins] = useState([
    { id: 1, username: 'admin_audit', fullName: 'Audit Manager', role: 'Auditor', status: 'Active', lastLogin: '2026-04-02 09:12' },
    { id: 2, username: 'ops_head', fullName: 'Operations Head', role: 'Super Admin', status: 'Active', lastLogin: '2026-04-01 14:45' },
  ])

  const [agents, setAgents] = useState([
    { id: 1, agentCode: 'EH-GULF-01', agentName: 'Gulf Remit', userCount: 12, commissionRate: 1.5, status: 'Active' },
    { id: 2, agentCode: 'EH-RUH-02', agentName: 'Riyadh Express', userCount: 5, commissionRate: 1.2, status: 'Active' },
  ])

  const [customers, setCustomers] = useState([
    { id: 'CUST-001', name: 'Rahim Uddin', nid: '1234567890', status: 'Approved' },
    { id: 'CUST-002', name: 'Karim Hasan', nid: '9876543210', status: 'Pending' },
  ])

  const [openAdmin, setOpenAdmin] = useState(false)
  const [openAgent, setOpenAgent] = useState(false)
  const [openCustomer, setOpenCustomer] = useState(false)

  const [adminForm, setAdminForm] = useState({ username: '', fullName: '', role: 'Maker' })
  const [agentForm, setAgentForm] = useState({ code: '', name: '', commission: '1.0' })
  const [custForm, setCustForm] = useState({ name: '', nid: '' })

  const handleAddAdmin = () => {
    setAdmins([...admins, { ...adminForm, id: admins.length + 1, status: 'Active', lastLogin: 'Never' }])
    setOpenAdmin(false)
    setAdminForm({ username: '', fullName: '', role: 'Maker' })
  }

  const handleAddAgent = () => {
    setAgents([...agents, { id: agents.length + 1, agentCode: agentForm.code, agentName: agentForm.name, userCount: 0, commissionRate: Number(agentForm.commission), status: 'Active' }])
    setOpenAgent(false)
    setAgentForm({ code: '', name: '', commission: '1.0' })
  }

  const handleAddCustomer = () => {
    setCustomers([...customers, { id: `CUST-00${customers.length + 1}`, name: custForm.name, nid: custForm.nid, status: 'Pending' }])
    setOpenCustomer(false)
    setCustForm({ name: '', nid: '' })
  }

  const handleToggleAdmin = (id: number) => {
    setAdmins(admins.map(a => a.id === id ? { ...a, status: a.status === 'Active' ? 'Disabled' : 'Active' } : a))
  }

  const handleSetCustStatus = (id: any, status: string) => {
    setCustomers(customers.map(c => c.id === id ? { ...c, status } : c))
  }

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
            User & Role Management
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Unified identity management for internal staff, agents, and customers. Login behavior and JWT authorization settings.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<SecurityOutlinedIcon />}>
          Global Auth Settings
        </Button>
      </Box>

      <Paper sx={{ px: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          textColor="inherit"
          indicatorColor="primary"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<PeopleAltOutlinedIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Internal Admins / Staff" />
          <Tab icon={<StorefrontOutlinedIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Agent Users" />
          <Tab icon={<PersonOutlineOutlinedIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Customers (KYC)" />
          <Tab icon={<SecurityOutlinedIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Login & JWT Auth" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
            <Button variant="outlined" size="small" onClick={() => setOpenAdmin(true)}>Add Internal User</Button>
          </Stack>
          <Box sx={{ height: 400 }}>
            <DataGrid rows={admins} columns={adminCols} sx={{ border: 0 }} disableRowSelectionOnClick />
          </Box>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
            <Button variant="outlined" size="small" onClick={() => setOpenAgent(true)}>Add Agent House</Button>
          </Stack>
          <Box sx={{ height: 400 }}>
            <DataGrid rows={agents} columns={agentCols} sx={{ border: 0 }} disableRowSelectionOnClick />
          </Box>
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
            <Button variant="outlined" size="small" onClick={() => setOpenCustomer(true)}>Add KYC Record</Button>
          </Stack>
          <Box sx={{ height: 400 }}>
            <DataGrid rows={customers} columns={customerCols} sx={{ border: 0 }} disableRowSelectionOnClick />
          </Box>
        </TabPanel>

        <TabPanel value={tab} index={3}>
          <Stack spacing={2} sx={{ py: 2 }}>
            <Alert severity="info" variant="outlined">
              Authentication relies on industry-standard JWT (JSON Web Tokens). Internal users use RSA-256 signing via the Bank's central IAM.
            </Alert>
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1 }}>Token Configuration</Typography>
              <Typography variant="body2" color="text.secondary">Access Token Expiry: 45 Minutes</Typography>
              <Typography variant="body2" color="text.secondary">Refresh Token Expiry: 8 Hours</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Auth Provider: Java frms-auth-service (Active)</Typography>
            </Box>
          </Stack>
        </TabPanel>
      </Paper>

      <Dialog open={openAdmin} onClose={() => setOpenAdmin(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Internal User</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Username" fullWidth size="small" value={adminForm.username} onChange={(e) => setAdminForm({...adminForm, username: e.target.value})} />
            <TextField label="Full Name" fullWidth size="small" value={adminForm.fullName} onChange={(e) => setAdminForm({...adminForm, fullName: e.target.value})} />
            <TextField select label="Role" fullWidth size="small" value={adminForm.role} onChange={(e) => setAdminForm({...adminForm, role: e.target.value})}>
              <MenuItem value="Maker">Maker</MenuItem>
              <MenuItem value="Checker">Checker</MenuItem>
              <MenuItem value="Auditor">Auditor</MenuItem>
              <MenuItem value="Super Admin">Super Admin</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAdmin(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddAdmin}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openAgent} onClose={() => setOpenAgent(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Agent House</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Agent Code" fullWidth size="small" value={agentForm.code} onChange={(e) => setAgentForm({...agentForm, code: e.target.value})} />
            <TextField label="Agent Name" fullWidth size="small" value={agentForm.name} onChange={(e) => setAgentForm({...agentForm, name: e.target.value})} />
            <TextField label="Commission Rate (%)" type="number" fullWidth size="small" value={agentForm.commission} onChange={(e) => setAgentForm({...agentForm, commission: e.target.value})} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAgent(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddAgent}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openCustomer} onClose={() => setOpenCustomer(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add KYC Customer</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Customer Name" fullWidth size="small" value={custForm.name} onChange={(e) => setCustForm({...custForm, name: e.target.value})} />
            <TextField label="NID / Passport" fullWidth size="small" value={custForm.nid} onChange={(e) => setCustForm({...custForm, nid: e.target.value})} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCustomer(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddCustomer}>Save</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
