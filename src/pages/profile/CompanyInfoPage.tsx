import {
  Avatar,
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import { useEffect, useId, useMemo, useState } from 'react'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import {
  loadCompanySettings,
  saveCompanySettings,
  type CompanySettings,
} from '../../state/companySettings'

export function CompanyInfoPage() {
  const uploadId = useId()
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [form, setForm] = useState<CompanySettings>(() => loadCompanySettings())
  const [savedToast, setSavedToast] = useState(false)

  const logoPreviewUrl = useMemo(() => {
    if (!logoFile) return null
    return URL.createObjectURL(logoFile)
  }, [logoFile])

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl)
    }
  }, [logoPreviewUrl])

  useEffect(() => {
    // If user didn't pick a new file, show stored logo.
    if (!logoFile) return
  }, [logoFile])

  const displayedLogo = logoPreviewUrl || form.logoDataUrl || undefined

  async function fileToDataUrl(file: File) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  async function onSave() {
    let next: CompanySettings = { ...form }

    if (logoFile) {
      next = { ...next, logoDataUrl: await fileToDataUrl(logoFile) }
    }

    saveCompanySettings(next)
    setForm(next)
    setLogoFile(null)
    setSavedToast(true)
  }

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 980 }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
          Company information
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Configure organization details used in reports, certificates, and headers.
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 950, mb: 0.5 }}>Company logo</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Used in the sidebar, reports, receipts, and certificates.
              </Typography>
            </Box>

            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
              sx={{ flex: 1 }}
            >
              <Avatar
                variant="rounded"
                src={displayedLogo}
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: 'rgba(0,0,0,0.06)',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                LOGO
              </Avatar>

              <input
                id={uploadId}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null
                  setLogoFile(file)
                }}
              />

              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<CloudUploadOutlinedIcon />}
                  onClick={() => document.getElementById(uploadId)?.click()}
                  sx={{ borderColor: 'divider' }}
                >
                  Upload
                </Button>
                <Button
                  variant="text"
                  color="inherit"
                  startIcon={<DeleteOutlineOutlinedIcon />}
                  disabled={!logoFile && !form.logoDataUrl}
                  onClick={() => {
                    setLogoFile(null)
                    setForm((s) => ({ ...s, logoDataUrl: '' }))
                  }}
                >
                  Remove
                </Button>
              </Stack>
            </Stack>
          </Stack>

          <Divider />

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label="Company name"
              value={form.companyName}
              onChange={(e) => setForm((s) => ({ ...s, companyName: e.target.value }))}
            />
            <TextField
              fullWidth
              label="Short name"
              value={form.shortName}
              onChange={(e) => setForm((s) => ({ ...s, shortName: e.target.value }))}
            />
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label="Head office address"
              value={form.headOfficeAddress}
              onChange={(e) => setForm((s) => ({ ...s, headOfficeAddress: e.target.value }))}
            />
            <TextField
              fullWidth
              label="Country"
              value={form.country}
              onChange={(e) => setForm((s) => ({ ...s, country: e.target.value }))}
            />
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
            />
            <TextField
              fullWidth
              label="Email"
              value={form.email}
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            />
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label="Regulator / Compliance note (optional)"
              value={form.regulatorNote ?? ''}
              onChange={(e) => setForm((s) => ({ ...s, regulatorNote: e.target.value }))}
            />
            <TextField
              fullWidth
              label="Report footer text (optional)"
              value={form.reportFooterText ?? ''}
              onChange={(e) => setForm((s) => ({ ...s, reportFooterText: e.target.value }))}
            />
          </Stack>

          <Box>
            <Button variant="contained" startIcon={<SaveOutlinedIcon />} onClick={onSave}>
              Save changes
            </Button>
          </Box>
        </Stack>
      </Paper>

      <Snackbar
        open={savedToast}
        autoHideDuration={2500}
        onClose={() => setSavedToast(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSavedToast(false)}
          severity="success"
          icon={<CheckCircleOutlinedIcon fontSize="inherit" />}
          sx={{ borderRadius: 2 }}
        >
          Saved successfully.
        </Alert>
      </Snackbar>
    </Stack>
  )
}

