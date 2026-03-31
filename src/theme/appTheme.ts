import { createTheme } from '@mui/material/styles'

export const brand = {
  green: '#2d9d5a',
  greenBright: '#3ecf72',
  black: '#0b0f14',
  white: '#FFFFFF',
  gray50: '#f3f5f8',
  gray100: '#e8ecf2',
  gray200: '#d5dbe6',
  gray600: '#5c6578',
} as const

/** Layout tokens — dark sidebar + light shell */
export const layout = {
  sidebarBg: '#0b1020',
  sidebarHeaderBg: 'linear-gradient(165deg, #0f1729 0%, #0b1020 48%, #0a1628 100%)',
  sidebarBorder: 'rgba(255, 255, 255, 0.08)',
  sidebarText: 'rgba(255, 255, 255, 0.92)',
  sidebarMuted: 'rgba(255, 255, 255, 0.55)',
  sidebarHover: 'rgba(255, 255, 255, 0.07)',
  sidebarSelected: 'rgba(61, 207, 114, 0.16)',
  sidebarSelectedHover: 'rgba(61, 207, 114, 0.24)',
  shellBg: '#eef1f6',
} as const

export const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: brand.green, contrastText: brand.white },
    secondary: { main: brand.black, contrastText: brand.white },
    error: { main: '#d32f2f', contrastText: '#FFFFFF' },
    background: { default: layout.shellBg, paper: '#ffffff' },
    text: { primary: brand.black, secondary: brand.gray600 },
    divider: brand.gray200,
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: [
      '"Plus Jakarta Sans"',
      '"Franklin Gothic URW"',
      'system-ui',
      '-apple-system',
      'sans-serif',
    ].join(','),
    h4: { fontWeight: 800, letterSpacing: '-0.02em' },
    h5: { fontWeight: 800, letterSpacing: '-0.02em' },
    h6: { fontWeight: 800, letterSpacing: '-0.02em' },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backdropFilter: 'blur(12px)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: layout.sidebarHeaderBg,
          color: layout.sidebarText,
          borderRight: `1px solid ${layout.sidebarBorder}`,
          boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          marginInline: 10,
          marginBlock: 3,
          paddingLeft: 11,
          paddingRight: 12,
          borderLeft: '3px solid transparent',
          transition: 'background-color 0.15s ease, border-color 0.15s ease',
          '&:hover': {
            backgroundColor: layout.sidebarHover,
          },
          '&.Mui-selected': {
            backgroundColor: layout.sidebarSelected,
            borderLeftColor: brand.greenBright,
          },
          '&.Mui-selected:hover': {
            backgroundColor: layout.sidebarSelectedHover,
          },
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        h4: { color: brand.green },
        h5: { color: brand.green },
        h6: { color: brand.green },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05), 0 6px 18px rgba(15, 23, 42, 0.045)',
        },
        outlined: {
          boxShadow: 'none',
          borderColor: 'rgba(15, 23, 42, 0.1)',
        },
        elevation0: {
          boxShadow: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 700,
          borderRadius: 12,
        },
        containedPrimary: {
          boxShadow: '0 2px 8px rgba(45, 157, 90, 0.35)',
          '&:hover': {
            boxShadow: '0 4px 14px rgba(45, 157, 90, 0.4)',
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        standardError: {
          color: '#c62828',
          backgroundColor: 'rgba(211, 47, 47, 0.08)',
          '& .MuiAlert-icon': {
            color: '#c62828',
          },
        },
        filledError: {
          backgroundColor: '#d32f2f',
          color: '#FFFFFF',
          '& .MuiAlert-icon': {
            color: '#FFFFFF',
          },
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          '&.Mui-error': {
            color: '#d32f2f',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          '&.Mui-error .MuiOutlinedInput-notchedOutline': {
            borderColor: '#d32f2f',
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          '&.Mui-error': {
            color: '#d32f2f',
          },
        },
      },
    },
  },
})
