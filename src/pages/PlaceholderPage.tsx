import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined'
import { useNavigate } from 'react-router-dom'
import { brand } from '../theme/appTheme'

export function PlaceholderPage({ title }: { title: string }) {
  const navigate = useNavigate()

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.3 }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Page scaffold is ready. Next we’ll wire APIs and real workflows.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<ArrowBackOutlinedIcon />}
          onClick={() => navigate(-1)}
          sx={{ borderColor: brand.gray200 }}
        >
          Back
        </Button>
      </Stack>

      <Paper sx={{ p: 3 }}>
        <Typography sx={{ fontWeight: 800, mb: 1.5 }}>What comes next</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          We can add tables, filters, validation, Excel upload, maker-checker actions, and
          audit trail for this module.
        </Typography>
      </Paper>
    </Stack>
  )
}

