import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Typography,
} from '@mui/material'
import { NavLink, useLocation } from 'react-router-dom'
import { Fragment, useEffect, useState } from 'react'
import { canAccessAuditTrail, DEMO_SESSION_EVENT } from '../state/demoSessionStore'
import { navGroups } from './navItems'
import { brand, layout } from '../theme/appTheme'

export function NavSection() {
  const location = useLocation()
  const [, setNavBump] = useState(0)

  useEffect(() => {
    const fn = () => setNavBump((n) => n + 1)
    window.addEventListener(DEMO_SESSION_EVENT, fn as EventListener)
    return () => window.removeEventListener(DEMO_SESSION_EVENT, fn as EventListener)
  }, [])

  return (
    <List disablePadding sx={{ py: 1.25 }}>
      {navGroups.map((group, gi) => (
        <Fragment key={group.title}>
          <ListSubheader
            disableSticky
            sx={{
              bgcolor: 'transparent',
              color: layout.sidebarMuted,
              fontSize: 11,
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              px: 2.5,
              py: 1.25,
              mt: gi > 0 ? 2 : 0,
            }}
          >
            {group.title}
          </ListSubheader>

          {group.items
            .filter((item) => (item.to === '/audit' ? canAccessAuditTrail() : true))
            .map((item) => {
              const selected = location.pathname === item.to

              return (
                <ListItem key={item.to} disablePadding>
                  <ListItemButton
                    component={NavLink}
                    to={item.to}
                    selected={selected}
                    sx={{
                      color: layout.sidebarText,
                      '& .MuiListItemIcon-root': {
                        color: selected ? brand.greenBright : layout.sidebarMuted,
                        transition: 'color 0.15s ease',
                      },
                      '&:hover .MuiListItemIcon-root': {
                        color: selected ? brand.greenBright : layout.sidebarText,
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          sx={{
                            fontWeight: selected ? 700 : 500,
                            fontSize: 14.5,
                            letterSpacing: '-0.01em',
                            color: selected ? layout.sidebarText : 'rgba(255,255,255,0.82)',
                          }}
                        >
                          {item.label}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              )
            })}
        </Fragment>
      ))}
    </List>
  )
}
