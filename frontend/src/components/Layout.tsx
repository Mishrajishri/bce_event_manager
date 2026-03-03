import { Outlet, Link, useNavigate } from 'react-router-dom'
import {
  AppBar,
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
} from '@mui/icons-material'
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner'
import { useState } from 'react'
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

  // Layout is only rendered for authenticated users (wrapped in ProtectedRoute)
  // so we can always show the full menu
  const menuItems = [
    { text: 'Home', icon: <HomeIcon />, path: '/home' },
    { text: 'Events', icon: <EventIcon />, path: '/events' },
    { text: 'My Registrations', icon: <RegistrationIcon />, path: '/my-registrations' },
  ]

  if (isOrganizer(user)) {
    menuItems.push(
      { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
      { text: 'Scan QR', icon: <QrCodeScannerIcon />, path: '/scan' }
    )
  }
  if (isSuperAdmin(user)) {
    menuItems.push(
      { text: 'Admin Panel', icon: <AdminPanelSettings />, path: '/admin' }
    )
  }

  const drawer = (
    <Box component="nav" sx={{ overflow: 'auto' }} aria-label="Main navigation">
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            component="img"
            src={themeMode === 'dark' ? "/images/logo_dark.png" : "/images/logo.png"}
            alt="BCE Logo"
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
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
            aria-label="Toggle navigation menu"
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
            BCE Event Manager
          </Typography>

          {/* Dark Mode Toggle */}
          <Tooltip title={themeMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
            <IconButton color="inherit" onClick={toggleTheme} aria-label="Toggle theme">
              {themeMode === 'light' ? <DarkMode /> : <LightMode />}
            </IconButton>
          </Tooltip>


          {/* User menu — Layout is always authenticated */}
          <IconButton
            size="large"
            onClick={handleMenu}
            color="inherit"
            aria-label="User account menu"
            aria-haspopup="true"
          >
            <Avatar sx={{ bgcolor: 'secondary.main', width: 36, height: 36, fontSize: 16 }}>
              {user?.first_name?.[0] || <AccountCircle />}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem disabled>
              <Typography variant="body2">
                {user?.first_name} {user?.last_name}
              </Typography>
            </MenuItem>
            <MenuItem disabled>
              <Typography variant="caption" color="text.secondary">
                {user?.role}
              </Typography>
            </MenuItem>
            <MenuItem onClick={() => { navigate('/profile'); handleClose(); }}>
              <ListItemIcon>
                <AccountCircle fontSize="small" />
              </ListItemIcon>
              Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

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

      <Box
        component="main"
        role="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
        }}
      >
        <Outlet />
      </Box>
    </Box >
  )
}
