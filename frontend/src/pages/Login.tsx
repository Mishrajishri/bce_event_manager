import { useState } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Button,
  Container,
  Typography,
  Link,
  Alert,
  IconButton,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material'
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
  Person as PersonIcon,
} from '@mui/icons-material'
import { keyframes } from '@mui/system'
import { signIn } from '../services/supabase'
import { useAuthStore } from '../store'
import { authApi } from '../services/api'
import { supabase } from '../services/supabase'

// ---------------------------------------------------------------------------
// Keyframe animations
// ---------------------------------------------------------------------------
const floatIn = keyframes`
  0% { transform: translateY(30px) scale(0.95); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
`

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
`

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`

// ---------------------------------------------------------------------------
// Claymorphism style tokens
// ---------------------------------------------------------------------------
const clay = {
  card: {
    background: 'linear-gradient(145deg, #f0e6ff 0%, #e8dff5 50%, #dfd4f0 100%)',
    borderRadius: '28px',
    boxShadow: `
      12px 12px 24px rgba(160, 130, 200, 0.35),
      -8px -8px 20px rgba(255, 255, 255, 0.85),
      inset 2px 2px 6px rgba(255, 255, 255, 0.7),
      inset -2px -2px 6px rgba(140, 110, 180, 0.15)
    `,
    border: '1px solid rgba(255, 255, 255, 0.6)',
  },

  input: {
    background: 'linear-gradient(145deg, #ede4fa, #f5eeff)',
    borderRadius: '16px',
    boxShadow: `
      inset 3px 3px 6px rgba(160, 130, 200, 0.25),
      inset -3px -3px 6px rgba(255, 255, 255, 0.8)
    `,
    border: '1px solid rgba(200, 180, 230, 0.3)',
    transition: 'all 0.3s ease',
    '&:hover': {
      boxShadow: `
        inset 3px 3px 6px rgba(140, 100, 200, 0.3),
        inset -3px -3px 6px rgba(255, 255, 255, 0.9)
      `,
    },
    '&:focus-within': {
      boxShadow: `
        inset 3px 3px 8px rgba(124, 58, 237, 0.25),
        inset -3px -3px 6px rgba(255, 255, 255, 0.9),
        0 0 0 3px rgba(124, 58, 237, 0.15)
      `,
      border: '1px solid rgba(124, 58, 237, 0.3)',
    },
  },

  button: {
    background: 'linear-gradient(145deg, #9b6dff, #7c3aed)',
    borderRadius: '16px',
    boxShadow: `
      6px 6px 14px rgba(100, 50, 180, 0.4),
      -4px -4px 10px rgba(180, 140, 255, 0.3),
      inset 2px 2px 4px rgba(255, 255, 255, 0.25),
      inset -1px -1px 3px rgba(80, 30, 150, 0.2)
    `,
    transition: 'all 0.15s ease',
    '&:hover': {
      background: 'linear-gradient(145deg, #a47aff, #8b4dff)',
      transform: 'translateY(-2px)',
      boxShadow: `
        8px 8px 18px rgba(100, 50, 180, 0.45),
        -4px -4px 12px rgba(180, 140, 255, 0.4),
        inset 2px 2px 4px rgba(255, 255, 255, 0.3),
        inset -1px -1px 3px rgba(80, 30, 150, 0.15)
      `,
    },
    '&:active': {
      transform: 'translateY(1px) scale(0.98)',
      boxShadow: `
        2px 2px 6px rgba(100, 50, 180, 0.3),
        -2px -2px 4px rgba(180, 140, 255, 0.2),
        inset 4px 4px 8px rgba(80, 30, 150, 0.3),
        inset -2px -2px 4px rgba(255, 255, 255, 0.15)
      `,
    },
  },
}

// Shared input style for native inputs (defined OUTSIDE component to avoid re-creation)
const nativeInputStyle: React.CSSProperties = {
  border: 'none',
  outline: 'none',
  background: 'transparent',
  width: '100%',
  fontSize: '0.95rem',
  fontFamily: 'Inter, sans-serif',
  color: '#4a3070',
  fontWeight: 500,
  padding: '10px 0',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginType, setLoginType] = useState('student')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  // Forgot password
  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first')
      return
    }
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email)
      if (resetError) throw resetError
      setResetSent(true)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email')
    }
  }

  // Login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: signInError } = await signIn(email, password)
      if (signInError) throw new Error(signInError.message)
      if (!data.session) throw new Error('No session returned')

      // Fetch user profile
      let userData
      try {
        userData = await authApi.me()
      } catch {
        const meta = data.user?.user_metadata || {}
        userData = {
          id: data.user?.id || '',
          email: data.user?.email || '',
          first_name: meta.first_name || '',
          last_name: meta.last_name || '',
          role: meta.role || 'attendee',
          is_verified: !!data.user?.email_confirmed_at,
          created_at: data.user?.created_at || new Date().toISOString(),
        }
      }

      setAuth(userData, data.session.access_token, data.session.refresh_token)
      navigate('/')  // RoleRedirect will send to /home, /dashboard, or /admin
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #e8daf5 0%, #d5c8f0 30%, #c8b8eb 60%, #ddd0f5 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Container maxWidth="xs">
        <Box
          sx={{
            ...clay.card,
            p: { xs: 3, sm: 4 },
            animation: `${floatIn} 0.7s ease-out`,
          }}
        >
          {/* ---- Header ---- */}
          <Box sx={{ textAlign: 'center', mb: 3, animation: `${fadeUp} 0.5s ease-out 0.1s both` }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: '#7c3aed',
                letterSpacing: '0.5px',
                mb: 0.5,
              }}
            >
              🎪 BCE Event Manager
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                background: 'linear-gradient(135deg, #7c3aed, #a855f7, #7c3aed)',
                backgroundSize: '200% auto',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: `${shimmer} 4s linear infinite`,
              }}
            >
              Welcome Back
            </Typography>
          </Box>

          {/* ---- Alerts ---- */}
          {error && (
            <Alert severity="error" sx={{ mb: 2, ...clay.input, borderRadius: 3 }}>
              {error}
            </Alert>
          )}
          {resetSent && (
            <Alert severity="success" sx={{ mb: 2, ...clay.input, borderRadius: 3 }}>
              Password reset email sent! Check your inbox.
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            {/* ---- Login Type (Role Selector) ---- */}
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mb: 0.5,
                ml: 1,
                color: '#7c5fa8',
                fontWeight: 600,
                animation: `${fadeUp} 0.5s ease-out 0.15s both`,
              }}
            >
              Login Type
            </Typography>
            <Box
              sx={{
                ...clay.input,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 0.5,
                mb: 2,
                animation: `${fadeUp} 0.5s ease-out 0.15s both`,
              }}
            >
              <Box sx={{ color: '#9b7dd4', display: 'flex', mt: 0.5 }}><PersonIcon /></Box>
              <FormControl fullWidth variant="standard">
                <Select
                  value={loginType}
                  onChange={(e) => setLoginType(e.target.value)}
                  disableUnderline
                  sx={{
                    fontWeight: 600,
                    color: '#4a3070',
                    fontSize: '0.95rem',
                    '& .MuiSelect-icon': { color: '#9b7dd4' },
                  }}
                >
                  <MenuItem value="student">🎓 Student</MenuItem>
                  <MenuItem value="admin">🛠️ Admin</MenuItem>
                  <MenuItem value="super_admin">👑 Super Admin</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* ---- Email Input ---- */}
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mb: 0.5,
                ml: 1,
                color: '#7c5fa8',
                fontWeight: 600,
                animation: `${fadeUp} 0.5s ease-out 0.25s both`,
              }}
            >
              Email
            </Typography>
            <Box
              sx={{
                ...clay.input,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 0.5,
                mb: 2,
                animation: `${fadeUp} 0.5s ease-out 0.25s both`,
              }}
            >
              <Box sx={{ color: '#9b7dd4', display: 'flex', mt: 0.5 }}><EmailIcon /></Box>
              <input
                type="email"
                placeholder="you@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={nativeInputStyle}
              />
            </Box>

            {/* ---- Password Input ---- */}
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mb: 0.5,
                ml: 1,
                color: '#7c5fa8',
                fontWeight: 600,
                animation: `${fadeUp} 0.5s ease-out 0.35s both`,
              }}
            >
              Password
            </Typography>
            <Box
              sx={{
                ...clay.input,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 0.5,
                mb: 2,
                animation: `${fadeUp} 0.5s ease-out 0.35s both`,
              }}
            >
              <Box sx={{ color: '#9b7dd4', display: 'flex', mt: 0.5 }}><LockIcon /></Box>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={nativeInputStyle}
              />
              <IconButton
                size="small"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                sx={{ color: '#9b7dd4' }}
                type="button"
              >
                {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
              </IconButton>
            </Box>

            {/* ---- Login Button ---- */}
            <Box sx={{ animation: `${fadeUp} 0.5s ease-out 0.45s both` }}>
              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  ...clay.button,
                  mt: 1,
                  py: 1.6,
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  textTransform: 'none',
                  color: '#fff',
                  letterSpacing: '0.5px',
                }}
              >
                {loading ? '🔐 Signing in…' : '🚀 Login'}
              </Button>
            </Box>
          </form>

          {/* ---- Links ---- */}
          <Box sx={{ animation: `${fadeUp} 0.5s ease-out 0.55s both` }}>
            <Box sx={{ mt: 2, textAlign: 'right' }}>
              <Link
                component="button"
                type="button"
                variant="body2"
                onClick={handleForgotPassword}
                sx={{
                  color: '#7c5fa8',
                  fontWeight: 600,
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                  '&:hover': { color: '#7c3aed', textDecoration: 'underline' },
                }}
              >
                Forgot Password?
              </Link>
            </Box>

            <Typography variant="body2" align="center" sx={{ mt: 2, color: '#7c5fa8' }}>
              Don't have an account?{' '}
              <Link
                component={RouterLink}
                to="/register"
                sx={{
                  fontWeight: 700,
                  color: '#7c3aed',
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Register
              </Link>
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}
