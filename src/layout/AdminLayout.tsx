import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  ClickAwayListener,
  Divider,
  Drawer,
  IconButton,
  InputBase,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Popover,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material'
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined'
import SearchIcon from '@mui/icons-material/Search'
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined'
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { NavSection } from './NavSection'
import { navGroups } from './navItems'
import { brand, layout } from '../theme/appTheme'
import { BrandLogo } from '../assets/brandLogo'
import { loadCompanySettings } from '../state/companySettings'
import { useLiveApi } from '../api/config'
import {
  fetchOperationalNotifications,
  loadOperationalNotifications,
  markOperationalRead,
  OPERATIONAL_NOTIFICATIONS_EVENT,
} from '../integrations/operationsHub'

const drawerWidth = 272

type SearchSuggestion = {
  key: string
  label: string
  description: string
  to: string
}

export function AdminLayout() {
  const liveApi = useLiveApi()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const menuOpen = Boolean(menuAnchor)

  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null)
  const notifOpen = Boolean(notifAnchor)
  const [operationalNotes, setOperationalNotes] = useState<ReturnType<typeof loadOperationalNotifications>>([])

  const [companyName, setCompanyName] = useState(() => loadCompanySettings().companyName)
  const [branchName] = useState(() => 'Head Office')
  const [logoDataUrl, setLogoDataUrl] = useState(() => loadCompanySettings().logoDataUrl || '')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(0)

  useEffect(() => {
    const update = () => {
      const s = loadCompanySettings()
      setCompanyName(s.companyName)
      setLogoDataUrl(s.logoDataUrl || '')
    }
    update()
    const handler = () => update()
    window.addEventListener('companySettings:changed', handler as EventListener)
    return () => window.removeEventListener('companySettings:changed', handler as EventListener)
  }, [])

  useEffect(() => {
    const refresh = async () => {
      if (liveApi) {
        try {
          const rows = await fetchOperationalNotifications()
          setOperationalNotes(rows)
        } catch {
          // Keep navbar usable when live endpoint is temporarily unavailable.
          setOperationalNotes(loadOperationalNotifications())
        }
      } else {
        setOperationalNotes(loadOperationalNotifications())
      }
    }
    void refresh()
    const onChanged = () => {
      void refresh()
    }
    window.addEventListener(OPERATIONAL_NOTIFICATIONS_EVENT, onChanged as EventListener)
    return () => window.removeEventListener(OPERATIONAL_NOTIFICATIONS_EVENT, onChanged as EventListener)
  }, [liveApi])

  useEffect(() => {
    setSearchFocused(false)
    setActiveSuggestion(0)
  }, [location.pathname])

  const routeSuggestions = useMemo((): SearchSuggestion[] => {
    return navGroups.flatMap((group) =>
      group.items.map((item) => ({
        key: item.to,
        label: item.label,
        description: `${group.title} · ${item.to}`,
        to: item.to,
      })),
    )
  }, [])

  const filteredSuggestions = useMemo((): SearchSuggestion[] => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    const routeMatches = routeSuggestions
      .filter((s) => {
        const haystack = `${s.label} ${s.description} ${s.to}`.toLowerCase()
        return haystack.includes(q)
      })
      .slice(0, 7)
    const quickSearch: SearchSuggestion = {
      key: `remittance:${q}`,
      label: `Search : ${searchQuery.trim()}`,
      description: 'Open Search & Tracking with query',
      to: `/remittance/search?q=${encodeURIComponent(searchQuery.trim())}`,
    }
    return [quickSearch, ...routeMatches]
  }, [searchQuery, routeSuggestions])

  useEffect(() => {
    setActiveSuggestion(0)
  }, [searchQuery])

  function navigateFromSearch(to: string) {
    setSearchFocused(false)
    setSearchQuery('')
    setActiveSuggestion(0)
    navigate(to)
  }

  const unreadOps = operationalNotes.filter((n) => !n.read).length

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Stack sx={{ height: '100%' }}>
          <Box
            sx={{
              px: 2.25,
              py: 2.5,
              borderBottom: `1px solid ${layout.sidebarBorder}`,
            }}
          >
            <Typography
              variant="overline"
              sx={{
                color: layout.sidebarMuted,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.14em',
                display: 'block',
                mb: 0.75,
              }}
            >
              Foreign remittance
            </Typography>
            <Stack direction="row" alignItems="center" gap={1.25}>
              <Box
                sx={{
                  width: 46,
                  height: 46,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255,255,255,0.96)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.4)',
                }}
              >
                <BrandLogo size={30} src={logoDataUrl || undefined} />
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    color: layout.sidebarText,
                    fontSize: 18,
                    lineHeight: 1.2,
                  }}
                >
                  Admin Console
                </Typography>
                {liveApi ? (
                  <Typography
                    variant="caption"
                    sx={{
                      color: brand.greenBright,
                      fontWeight: 700,
                      fontSize: 11,
                      letterSpacing: '0.02em',
                    }}
                  >
                    Live API
                  </Typography>
                ) : (
                  <Typography variant="caption" sx={{ color: layout.sidebarMuted, fontSize: 11 }}>
                    Demo mode
                  </Typography>
                )}
              </Box>
            </Stack>
          </Box>
          <Divider sx={{ borderColor: layout.sidebarBorder, opacity: 0.6 }} />
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <NavSection />
          </Box>
          <Divider sx={{ borderColor: layout.sidebarBorder, opacity: 0.6 }} />
          <Box
            sx={{
              px: 2,
              py: 2,
              borderTop: `1px solid ${layout.sidebarBorder}`,
              bgcolor: 'rgba(0,0,0,0.15)',
            }}
          >
            <Stack direction="row" alignItems="center" gap={1.5}>
              <Avatar
                sx={{
                  bgcolor: 'rgba(61, 207, 114, 0.22)',
                  color: brand.greenBright,
                  fontWeight: 800,
                  width: 40,
                  height: 40,
                  fontSize: '0.95rem',
                }}
              >
                A
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{ fontWeight: 800, lineHeight: 1.2, fontSize: 14, color: layout.sidebarText }}
                >
                  Head Office Admin
                </Typography>
                <Typography variant="body2" sx={{ color: layout.sidebarMuted, fontSize: 12.5, mt: 0.25 }}>
                  HO · Admin
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Stack>
      </Drawer>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar
          position="sticky"
          elevation={0}
          color="inherit"
          sx={{
            bgcolor: 'rgba(255,255,255,0.86)',
            borderBottom: '1px solid',
            borderColor: 'divider',
            backdropFilter: 'blur(14px)',
          }}
        >
          <Toolbar sx={{ gap: 2, minHeight: { xs: 56, sm: 64 } }}>
            <ClickAwayListener onClickAway={() => setSearchFocused(false)}>
              <Box sx={{ position: 'relative', flex: 1, maxWidth: 560 }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  sx={{
                    border: '1px solid',
                    borderColor: 'rgba(15, 23, 42, 0.08)',
                    borderRadius: 12,
                    px: 1.75,
                    py: 0.85,
                    bgcolor: 'rgba(255,255,255,0.7)',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    '&:focus-within': {
                      borderColor: `${brand.green}55`,
                      boxShadow: `0 0 0 3px ${brand.green}18`,
                    },
                  }}
                >
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary', opacity: 0.85 }} />
                  <InputBase
                    placeholder="Search remittance / remitter / beneficiary..."
                    sx={{ ml: 1, flex: 1 }}
                    value={searchQuery}
                    onFocus={() => setSearchFocused(true)}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (filteredSuggestions.length === 0 && e.key !== 'Enter') return
                      if (e.key === 'ArrowDown') {
                        e.preventDefault()
                        setActiveSuggestion((idx) => (idx + 1) % filteredSuggestions.length)
                      }
                      if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        setActiveSuggestion((idx) =>
                          idx === 0 ? filteredSuggestions.length - 1 : idx - 1,
                        )
                      }
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const chosen = filteredSuggestions[activeSuggestion]
                        if (chosen) {
                          navigateFromSearch(chosen.to)
                          return
                        }
                        const q = searchQuery.trim()
                        if (q) {
                          navigateFromSearch(`/remittance/search?q=${encodeURIComponent(q)}`)
                        }
                      }
                      if (e.key === 'Escape') {
                        setSearchFocused(false)
                      }
                    }}
                    inputProps={{ 'aria-label': 'search' }}
                  />
                </Stack>

                {searchFocused && filteredSuggestions.length > 0 ? (
                  <Paper
                    elevation={8}
                    sx={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      left: 0,
                      right: 0,
                      zIndex: 20,
                      overflow: 'hidden',
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <List dense disablePadding>
                      {filteredSuggestions.map((s, idx) => (
                        <ListItemButton
                          key={s.key}
                          selected={idx === activeSuggestion}
                          onMouseEnter={() => setActiveSuggestion(idx)}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            navigateFromSearch(s.to)
                          }}
                          sx={{ py: 1 }}
                        >
                          <ListItemIcon sx={{ minWidth: 34 }}>
                            <SearchIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {s.label}
                              </Typography>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary">
                                {s.description}
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </Paper>
                ) : null}
              </Box>
            </ClickAwayListener>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
              <IconButton
                aria-label="notifications"
                onClick={(e) => setNotifAnchor(e.currentTarget)}
                aria-describedby={notifOpen ? 'ops-notifications-popover' : undefined}
              >
                <Badge color="error" badgeContent={unreadOps} max={99} invisible={unreadOps === 0}>
                  <NotificationsNoneOutlinedIcon />
                </Badge>
              </IconButton>
              <Popover
                id="ops-notifications-popover"
                open={notifOpen}
                anchorEl={notifAnchor}
                onClose={() => setNotifAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                  paper: {
                    sx: { width: 360, maxHeight: 420, mt: 1, borderRadius: 2, border: '1px solid', borderColor: 'divider' },
                  },
                }}
              >
                <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                    Operational alerts
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Returns, stop payments, and system notices (demo).
                  </Typography>
                </Box>
                <List dense disablePadding sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {operationalNotes.length === 0 ? (
                    <ListItemText sx={{ px: 2, py: 1.5 }} primary="No notifications yet." />
                  ) : (
                    operationalNotes.slice(0, 12).map((n) => (
                      <ListItemButton
                        key={n.id}
                        sx={{ alignItems: 'flex-start', py: 1 }}
                        onClick={() => {
                          if (!n.read) {
                            void markOperationalRead(n.id)
                          }
                          setNotifAnchor(null)
                          if (n.remittanceNo) {
                            navigate(`/remittance/search?q=${encodeURIComponent(n.remittanceNo)}`)
                            return
                          }
                          navigate('/operations/hub')
                        }}
                      >
                        <ListItemText
                          primary={
                            <Typography component="span" variant="body2" sx={{ fontWeight: n.read ? 500 : 800 }}>
                              {n.title}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                              {n.body}
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    ))
                  )}
                </List>
                <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Button
                    fullWidth
                    size="small"
                    onClick={() => {
                      setNotifAnchor(null)
                      navigate('/operations/hub')
                    }}
                  >
                    Open operations hub
                  </Button>
                </Box>
              </Popover>

              <Button
                onClick={(e) => setMenuAnchor(e.currentTarget)}
                sx={{
                  textTransform: 'none',
                  color: 'text.primary',
                  px: 1,
                  borderRadius: 999,
                }}
              >
                <Stack direction="row" alignItems="center" gap={1}>
                  <BrandLogo size={34} src={logoDataUrl || undefined} />
                  <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'left' }}>
                    <Typography variant="body2" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                      {companyName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {branchName}
                    </Typography>
                  </Box>
                </Stack>
              </Button>
            </Box>

            <Menu
              anchorEl={menuAnchor}
              open={menuOpen}
              onClose={() => setMenuAnchor(null)}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              PaperProps={{
                sx: { borderRadius: 2, minWidth: 240, border: '1px solid', borderColor: 'divider' },
              }}
            >
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null)
                  navigate('/profile/company')
                }}
              >
                <BusinessOutlinedIcon fontSize="small" style={{ marginRight: 10 }} />
                Company information
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null)
                  navigate('/profile/change-password')
                }}
              >
                <KeyOutlinedIcon fontSize="small" style={{ marginRight: 10 }} />
                Change password
              </MenuItem>
              <Divider />
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null)
                  // TODO: wire to real auth logout
                  navigate('/dashboard')
                }}
              >
                <LogoutOutlinedIcon fontSize="small" style={{ marginRight: 10 }} />
                Logout
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        <Box
          component="main"
          sx={{
            flex: 1,
            p: { xs: 2, md: 3 },
            maxWidth: 1680,
            width: '100%',
            mx: 'auto',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}

