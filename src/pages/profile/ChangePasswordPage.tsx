import {
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined'
import { useMemo, useState } from 'react'

function validate(next: {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}) {
  const errors: Partial<Record<keyof typeof next, string>> = {}

  if (!next.currentPassword) errors.currentPassword = 'Current password is required.'
  if (!next.newPassword) errors.newPassword = 'New password is required.'
  if (next.newPassword && next.newPassword.length < 10) {
    errors.newPassword = 'Use at least 10 characters.'
  }
  if (!next.confirmPassword) errors.confirmPassword = 'Please confirm the new password.'
  if (next.newPassword && next.confirmPassword && next.newPassword !== next.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.'
  }

  return errors
}

export function ChangePasswordPage() {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const errors = useMemo(() => validate(form), [form])

  const canSubmit = Object.keys(errors).length === 0

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 720 }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: -0.4 }}>
          Change password
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Update your login password. This screen is UI-only right now; connect it to your auth API.
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <TextField
            type="password"
            label="Current password"
            value={form.currentPassword}
            onChange={(e) => setForm((s) => ({ ...s, currentPassword: e.target.value }))}
            onBlur={() => setTouched((t) => ({ ...t, currentPassword: true }))}
            error={Boolean(touched.currentPassword && errors.currentPassword)}
            helperText={touched.currentPassword ? errors.currentPassword : ' '}
            fullWidth
          />
          <TextField
            type="password"
            label="New password"
            value={form.newPassword}
            onChange={(e) => setForm((s) => ({ ...s, newPassword: e.target.value }))}
            onBlur={() => setTouched((t) => ({ ...t, newPassword: true }))}
            error={Boolean(touched.newPassword && errors.newPassword)}
            helperText={touched.newPassword ? errors.newPassword : 'Use 10+ characters.'}
            fullWidth
          />
          <TextField
            type="password"
            label="Confirm new password"
            value={form.confirmPassword}
            onChange={(e) => setForm((s) => ({ ...s, confirmPassword: e.target.value }))}
            onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
            error={Boolean(touched.confirmPassword && errors.confirmPassword)}
            helperText={touched.confirmPassword ? errors.confirmPassword : ' '}
            fullWidth
          />

          <Box>
            <Button variant="contained" startIcon={<KeyOutlinedIcon />} disabled={!canSubmit}>
              Update password
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Stack>
  )
}

