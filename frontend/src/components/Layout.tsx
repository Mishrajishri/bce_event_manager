import { Outlet, Link, useNavigate } from 'react-router-dom'
import {
  Box,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
  Menu,
  MenuItem,
  Avatar,
  Tooltip,
  Divider,
  Chip,
  Switch,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  Event as EventIcon,
  Dashboard as DashboardIcon,
  Assignment as RegistrationIcon,
  Logout as LogoutIcon,
  AccountCircle,
  DarkMode,
  LightMode,
  AdminPanelSettings,
  People as PeopleIcon,
  Analytics as AnalyticsIcon,
  Groups as GroupsIcon,
  AttachMoney as MoneyIcon,
  VolunteerActivism as VolunteerIcon,
} from '@mui/icons-material'
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner'
import { useState, useMemo } from 'react'
import { useAuthStore, useUIStore, isOrganizer, isSuperAdmin } from '../store'
import { signOut } from '../services/supabase'

const drawerWidth = 240

export default function Layout() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()
  const { themeMode, toggleTheme } = useUIStore()

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = async () => {
    await signOut()
    clearAuth()
    navigate('/login')
    handleClose()
  }

  const roleLabel = (role?: string) => {
    if (!role) return 'User'
    return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  // Memoize menu items to prevent unnecessary re-renders
  const menuItems = useMemo(() => {
    const items = [
      { text: 'Home', icon: <HomeIcon />, path: '/home' },
      { text: 'Events', icon: <EventIcon />, path: '/events' },
      { text: 'My Registrations', icon: <RegistrationIcon />, path: '/my-registrations' },
    ]

    if (isOrganizer(user)) {
      items.push(
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
        { text: 'Scan QR', icon: <QrCodeScannerIcon />, path: '/scan' },
        { text: 'Participants', icon: <PeopleIcon />, path: '/organizer/participants' },
        { text: 'Teams', icon: <GroupsIcon />, path: '/organizer/teams' },
        { text: 'Expenses', icon: <MoneyIcon />, path: '/organizer/expenses' },
        { text: 'Volunteers', icon: <VolunteerIcon />, path: '/organizer/volunteers' },
        { text: 'Analytics', icon: <AnalyticsIcon />, path: '/organizer/analytics' }
      )
    }
    if (isSuperAdmin(user)) {
      items.push(
        { text: 'Admin Panel', icon: <AdminPanelSettings />, path: '/admin' }
      )
    }

    return items
  }, [user])

  const drawer = (
    <Box component="nav" sx={{ overflow: 'auto' }} aria-label="Main navigation">
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            component="img"
            src={themeMode === 'dark' ? "/images/logo_dark.png" : "/images/logo.png"}
            alt="BCE Logo"
            loading="lazy"
            sx={{
              height: 40,
              objectFit: 'contain'
            }}
          />
          <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700 }}>
            BCE Events
          </Typography>
        </Box>
      </Toolbar>
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton component={Link} to={item.path}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Floating hamburger — mobile only */}
      {isMobile && (
        <IconButton
          onClick={handleDrawerToggle}
          aria-label="Toggle navigation menu"
          sx={{
            position: 'fixed',
            top: 12,
            left: 12,
            zIndex: 1201,
            bgcolor: theme.palette.background.paper,
            boxShadow: theme.palette.mode === 'dark'
              ? '0 2px 12px rgba(0,0,0,0.4)'
              : '0 2px 12px rgba(0,0,0,0.1)',
            '&:hover': {
              bgcolor: theme.palette.background.paper,
              transform: 'scale(1.05)',
            },
            transition: 'transform 0.2s ease',
            width: 42,
            height: 42,
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {/* Floating avatar — top right */}
      <Box
        sx={{
          position: 'fixed',
          top: 12,
          right: 16,
          zIndex: 1201,
        }}
      >
        <Tooltip title="Account menu">
          <IconButton
            onClick={handleMenu}
            aria-label="User account menu"
            aria-haspopup="true"
            sx={{ p: 0.5 }}
          >
            <Avatar
              sx={{
                width: 40,
                height: 40,
                fontSize: 16,
                fontWeight: 700,
                bgcolor: theme.palette.mode === 'dark' ? '#365314' : '#E0E7FF',
                color: theme.palette.mode === 'dark' ? '#A3E635' : '#4353EB',
                border: '2px solid transparent',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                '&:hover': {
                  borderColor: theme.palette.mode === 'dark' ? '#A3E635' : '#4353EB',
                  boxShadow: theme.palette.mode === 'dark'
                    ? '0 0 12px rgba(163,230,53,0.3)'
                    : '0 0 12px rgba(67,83,235,0.3)',
                },
              }}
            >
              {user?.first_name?.[0] || <AccountCircle />}
            </Avatar>
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          slotProps={{
            paper: {
              sx: {
                mt: 0.5,
                minWidth: 240,
                borderRadius: 2,
                border: theme.palette.mode === 'dark'
                  ? '1px solid rgba(148,163,184,0.15)'
                  : '1px solid rgba(0,0,0,0.06)',
                boxShadow: theme.palette.mode === 'dark'
                  ? '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)'
                  : '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
              },
            },
          }}
        >
          {/* User info header */}
          <Box sx={{ px: 2.5, pt: 2, pb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
              {user?.first_name} {user?.last_name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
              {user?.email}
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Chip
                label={roleLabel(user?.role)}
                size="small"
                sx={{
                  height: 22,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(163,230,53,0.15)' : 'rgba(67,83,235,0.1)',
                  color: theme.palette.mode === 'dark' ? '#A3E635' : '#4353EB',
                }}
              />
            </Box>
          </Box>

          <Divider />

          {/* Theme toggle */}
          <MenuItem
            onClick={(e) => { e.stopPropagation(); toggleTheme() }}
            sx={{ py: 1 }}
          >
            <ListItemIcon>
              {themeMode === 'light' ? <DarkMode fontSize="small" /> : <LightMode fontSize="small" />}
            </ListItemIcon>
            <ListItemText primary="Dark Mode" />
            <Switch
              size="small"
              checked={themeMode === 'dark'}
              onChange={toggleTheme}
              onClick={(e) => e.stopPropagation()}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#A3E635',
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#A3E635',
                },
              }}
            />
          </MenuItem>

          <Divider />

          {/* Profile */}
          <MenuItem onClick={() => { navigate('/profile'); handleClose() }}>
            <ListItemIcon>
              <AccountCircle fontSize="small" />
            </ListItemIcon>
            My Profile
          </MenuItem>

          {/* Logout */}
          <MenuItem onClick={handleLogout} sx={{ color: theme.palette.error.main }}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" sx={{ color: theme.palette.error.main }} />
            </ListItemIcon>
            Logout
          </MenuItem>
        </Menu>
      </Box>

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content — no AppBar offset */}
      <Box
        component="main"
        role="main"
        sx={{
          flexGrow: 1,
          p: 3,
          pt: { xs: 8, md: 3 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Outlet />
      </Box>
    </Box >
  )
}
