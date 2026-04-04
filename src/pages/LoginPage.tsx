import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { shouldRequireLogin } from '../auth/requireLogin'
import { brand } from '../theme/appTheme'

export function LoginPage() {
  const { login, user, ready, loading, error } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  if (!shouldRequireLogin()) {
    return <Navigate to="/dashboard" replace />
  }

  if (ready && user) {
    return <Navigate to={from} replace />
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLocalError(null)
    try {
      await login(username.trim(), password)
    } catch {
      /* error surfaced via context or local */
      setLocalError('Invalid username or password')
    }
  }

  const showErr = localError || error

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
        py: 4,
      }}
    >
      <Card sx={{ maxWidth: 420, width: '100%', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 800, letterSpacing: '0.14em' }}>
                FRMS Admin Console
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: '-0.03em', mt: 0.5 }}>
                Sign in
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Use your directory credentials. Live API with JWT is required for this screen.
              </Typography>
            </Box>

            {showErr ? (
              <Alert severity="error" onClose={() => setLocalError(null)}>
                {showErr}
              </Alert>
            ) : null}

            <Box component="form" onSubmit={onSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="Username"
                  name="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  fullWidth
                  required
                  disabled={loading}
                />
                <TextField
                  label="Password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  required
                  disabled={loading}
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{
                    mt: 1,
                    fontWeight: 800,
                    py: 1.25,
                    bgcolor: brand.black,
                    '&:hover': { bgcolor: '#111' },
                  }}
                >
                  {loading ? 'Signing in…' : 'Sign in'}
                </Button>
              </Stack>
            </Box>

            <Typography variant="caption" color="text.secondary">
              Demo seeds: <strong>ho_admin</strong> / <strong>ChangeMe!123</strong> (or branch01_maker with same password)
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
