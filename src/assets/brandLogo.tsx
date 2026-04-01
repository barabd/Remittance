import { Box } from '@mui/material'

const DEFAULT_MARK_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="120 40 360 540" role="img" aria-label="Uttara Bank mark">
  <g fill="#006b2d">
    <path d="M300 54L176 214l38 28 86-111 86 111 38-28z"/>
    <rect x="278" y="130" width="44" height="160" rx="8"/>
    <path d="M140 275h74v167c0 36 25 64 58 64s58-28 58-64V275h74v167c0 78-56 138-132 138S140 520 140 442z"/>
    <path fill-rule="evenodd" d="M392 298a136 136 0 1 1 0 272 136 136 0 0 1 0-272m0 66a70 70 0 1 0 0 140 70 70 0 0 0 0-140"/>
  </g>
</svg>
`.trim()

const DEFAULT_MARK_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(DEFAULT_MARK_SVG)}`

export function BrandLogo({
  size = 34,
  src,
  alt = 'Company logo',
}: {
  size?: number
  src?: string
  alt?: string
}) {
  return (
    <Box
      component="img"
      src={src && src.trim() !== '' ? src : DEFAULT_MARK_DATA_URL}
      alt={alt}
      sx={{
        width: size,
        height: size,
        display: 'block',
        objectFit: 'contain',
      }}
    />
  )
}

