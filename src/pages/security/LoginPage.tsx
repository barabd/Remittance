import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { brand } from '../../theme/appTheme'

export function LoginPage({ onLogin }: { onLogin: (token: string) => void }) {
  const [user, setUser] = useState('admin')
  const [pass, setPass] = useState('admin')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = () => {
    setLoading(true)
    setError('')
    // Simulate JWT fetch
    setTimeout(() => {
      if (user === 'admin' && pass === 'admin') {
        const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_token'
        localStorage.setItem('auth_token', mockToken)
        onLogin(mockToken)
      } else {
        setError('Invalid username or password (demo: admin / admin)')
      }
      setLoading(false)
    }, 800)
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: `linear-gradient(135deg, ${brand.black} 0%, #1a1a1a 100%)`,
      }}
    >
      <Container maxWidth="xs">
        <Paper
          elevation={24}
          sx={{
            p: 4,
            borderRadius: 3,
            bgcolor: 'rgba(255,255,255,0.02)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          }}
        >
          <Stack spacing={3}>
            <Box textAlign="center">
              <Typography variant="h4" sx={{ fontWeight: 950, color: brand.green, letterSpacing: -1 }}>
                REMITTANCE
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                Admin Dashboard Login
              </Typography>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              fullWidth
              label="Username"
              variant="outlined"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              InputProps={{ sx: { color: 'white' } }}
              InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }}
              sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } } }}
            />

            <TextField
              fullWidth
              label="Password"
              type="password"
              variant="outlined"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              InputProps={{ sx: { color: 'white' } }}
              InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }}
              sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } } }}
            />

            <Button
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              onClick={handleLogin}
              sx={{
                py: 1.5,
                fontWeight: 800,
                bgcolor: brand.green,
                '&:hover': { bgcolor: '#389140' },
              }}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>

            <Typography variant="caption" align="center" sx={{ color: 'rgba(255,255,255,0.3)' }}>
              © 2026 Remittance Admin · Version 2.1.0-JWT
            </Typography>
          </Stack>
        </Paper>
      </Container>
    </Box>
  )
}
