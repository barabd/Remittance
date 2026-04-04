import { Box, CircularProgress } from '@mui/material'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { shouldRequireLogin } from './requireLogin'

export function RequireAuth() {
  const { ready, user } = useAuth()
  const location = useLocation()

  if (!shouldRequireLogin()) {
    return <Outlet />
  }

  if (!ready) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
