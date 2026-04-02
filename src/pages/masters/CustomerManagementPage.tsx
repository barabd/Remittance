import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import DoneOutlinedIcon from '@mui/icons-material/DoneOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { useEffect, useMemo, useState } from 'react'
import {
  addCustomer,
  CUSTOMERS_CHANGED_EVENT,
  loadCustomers,
  setCustomerStatus,
  updateCustomer,
  type CustomerRecord,
} from '../../state/customerStore'
import { brand } from '../../theme/appTheme'

export function CustomerManagementPage() {
  const [rows, setRows] = useState(loadCustomers)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CustomerRecord | null>(null)
  const [form, setForm] = useState({
    name: '',
    nid: '',
    passport: '',
    phone: '',
    email: '',
    photoUrl: '',
  })

  useEffect(() => {
    const sync = () => setRows(loadCustomers())
    window.addEventListener(CUSTOMERS_CHANGED_EVENT, sync as EventListener)
    return () => window.removeEventListener(CUSTOMERS_CHANGED_EVENT, sync as EventListener)
  }, [])

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId])

  function openCreate() {
    setEditing(null)
    setForm({ name: '', nid: '', passport: '', phone: '', email: '', photoUrl: '' })
    setDialogOpen(true)
  }

  function openEdit() {
    if (!selected) return
    setEditing(selected)
    setForm({
      name: selected.name,
      nid: selected.nid,
      passport: selected.passport || '',
      phone: selected.phone,
      email: selected.email,
      photoUrl: selected.photoUrl || '',
    })
    setDialogOpen(true)
  }

  async function save() {
    if (!form.name || !form.nid) return
    if (editing) {
      await updateCustomer(editing.id, form)
    } else {
      await addCustomer(form)
    }
    setDialogOpen(false)
  }

  const columns: GridColDef<CustomerRecord>[] = [
    { field: 'id', headerName: 'Ref', width: 100 },
    { field: 'name', headerName: 'Customer Name', flex: 1, minWidth: 150 },
    { field: 'nid', headerName: 'NID', width: 140 },
    { field: 'passport', headerName: 'Passport', width: 140 },
    { field: 'phone', headerName: 'Phone', width: 130 },
    { field: 'email', headerName: 'Email', width: 160 },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (p) => (
        <Chip
          size="small"
          label={p.value}
          sx={{
            bgcolor:
              p.value === 'Approved'
                ? 'rgba(66,171,72,0.14)'
                : p.value === 'Pending Approval'
                  ? 'rgba(237,108,2,0.12)'
                  : 'rgba(0,0,0,0.06)',
            color:
              p.value === 'Approved' ? brand.green : p.value === 'Pending Approval' ? '#ed6c02' : 'text.primary',
          }}
        />
      ),
    },
    { field: 'maker', headerName: 'Maker', width: 120 },
    { field: 'createdAt', headerName: 'Registered', width: 160, valueFormatter: (p) => String(p).slice(0, 16).replace('T', ' ') },
  ]

  return (
    <Stack spacing={2.5}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
            Customer Management (KYC Basic)
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Remitter onboarding with NID and KYC document tracking. Maker-checker approval workflow.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={openCreate}>
            New Customer
          </Button>
          <Button variant="outlined" startIcon={<EditOutlinedIcon />} disabled={!selected} onClick={openEdit}>
            Edit
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<DoneOutlinedIcon />}
            disabled={selected?.status !== 'Pending Approval'}
            onClick={() => selected && setCustomerStatus(selected.id, 'Approved')}
          >
            Approve
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<CloseOutlinedIcon />}
            disabled={selected?.status !== 'Pending Approval'}
            onClick={() => selected && setCustomerStatus(selected.id, 'Rejected')}
          >
            Reject
          </Button>
        </Stack>
      </Box>

      <Paper sx={{ p: 1.5 }}>
        <Box sx={{ height: 500, width: '100%' }}>
          <DataGrid
            rows={rows}
            columns={columns}
            disableRowSelectionOnClick
            onRowClick={(p) => setSelectedId(String(p.row.id))}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            pageSizeOptions={[10, 25]}
            sx={{ border: 0 }}
          />
        </Box>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <TextField
              label="Full Name"
              fullWidth
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            />
            <TextField
              label="NID Number"
              fullWidth
              value={form.nid}
              onChange={(e) => setForm((s) => ({ ...s, nid: e.target.value }))}
              placeholder="10 or 17 digit NID"
            />
            <TextField
              label="Passport No"
              fullWidth
              value={form.passport}
              onChange={(e) => setForm((s) => ({ ...s, passport: e.target.value }))}
              placeholder="Passport Number"
            />
            <TextField
              label="Phone Number"
              fullWidth
              value={form.phone}
              onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
            />
            <TextField
              label="Email Address"
              fullWidth
              value={form.email}
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            />
            <Box sx={{ p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 1, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ mb: 1 }}>NID / Profile Photo Upload</Typography>
              <Button variant="outlined" component="label">
                Upload File
                <input type="file" hidden accept="image/*" />
              </Button>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save}>
            {editing ? 'Save Changes' : 'Register Customer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
