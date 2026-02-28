import { useState } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Link,
  Paper,
  Alert,
} from '@mui/material'
import { signIn } from '../services/supabase'
import { useAuthStore } from '../store'
import { authApi } from '../services/api'
import { supabase } from '../services/supabase'

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: signInError } = await signIn(email, password)

      if (signInError) {
        throw new Error(signInError.message)
      }

      if (data.session) {
        // Try to get full user data from API, fallback to session data
        let userData
        try {
          userData = await authApi.me()
        } catch {
          // Fallback: build user from Supabase session metadata
          const meta = data.user?.user_metadata || {}
          userData = {
            id: data.user?.id || '',
            email: data.user?.email || email,
            first_name: meta.first_name || '',
            last_name: meta.last_name || '',
            phone: meta.phone || undefined,
            role: meta.role || 'attendee',
            is_verified: true,
            created_at: data.user?.created_at || new Date().toISOString(),
          }
        }

        setAuth(
          userData,
          data.session.access_token,
          data.session.refresh_token
        )
        navigate('/')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Login
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {resetSent && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Password reset email sent! Check your inbox.
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
            />
            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mt: 3 }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <Box sx={{ mt: 1, textAlign: 'right' }}>
            <Link
              component="button"
              variant="body2"
              onClick={handleForgotPassword}
              sx={{ cursor: 'pointer' }}
            >
              Forgot Password?
            </Link>
          </Box>

          <Typography variant="body2" sx={{ mt: 2 }} align="center">
            Don't have an account?{' '}
            <Link component={RouterLink} to="/register">
              Register
            </Link>
          </Typography>
        </Paper>
      </Box>
    </Container>
  )
}
