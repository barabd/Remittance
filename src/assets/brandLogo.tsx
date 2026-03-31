import { Avatar, Box } from '@mui/material'
import { brand } from '../theme/appTheme'

export function BrandLogo({
  size = 34,
  src,
  alt = 'Company logo',
}: {
  size?: number
  src?: string
  alt?: string
}) {
  if (src) {
    return (
      <Avatar
        variant="rounded"
        src={src}
        alt={alt}
        sx={{
          width: size,
          height: size,
          borderRadius: 2,
          bgcolor: 'rgba(255,255,255,0.32)',
          border: '1px solid rgba(0,0,0,0.14)',
        }}
      />
    )
  }

  return (
    <Box
      aria-hidden="true"
      sx={{
        width: size,
        height: size,
        borderRadius: 12,
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'rgba(255,255,255,0.32)',
        border: '1px solid rgba(0,0,0,0.14)',
        boxShadow: '0 10px 16px -14px rgba(0,0,0,0.55)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          width: size * 0.62,
          height: size * 0.62,
          borderRadius: 999,
          bgcolor: brand.black,
          opacity: 0.9,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: -20,
          transform: 'rotate(25deg)',
          background:
            'linear-gradient(90deg, rgba(255,255,255,0.0) 0%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.0) 100%)',
        }}
      />
    </Box>
  )
}

