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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material'
import { signUp } from '../services/supabase'
import { useAuthStore } from '../store'
import { authApi } from '../services/api'

export default function Register() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'attendee',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: any) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const { data, error: signUpError } = await signUp(formData.email, formData.password, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        role: formData.role,
      })

      if (signUpError) {
        throw new Error(signUpError.message)
      }

      if (data.session) {
        // Try to fetch the full profile; fall back to local metadata
        let userData
        try {
          userData = await authApi.me()
        } catch {
          const meta = data.user?.user_metadata || {}
          userData = {
            id: data.user?.id || '',
            email: data.user?.email || '',
            first_name: meta.first_name || formData.first_name,
            last_name: meta.last_name || formData.last_name,
            role: meta.role || formData.role,
            is_verified: !!data.user?.email_confirmed_at,
            created_at: data.user?.created_at || new Date().toISOString(),
          }
        }

        setAuth(
          userData,
          data.session.access_token,
          data.session.refresh_token
        )
        navigate('/')
      } else {
        // Email confirmation required
        navigate('/login', { state: { message: 'Registration successful! Please check your email to verify.' } })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Register
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="First Name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Last Name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                margin="normal"
                required
              />
            </Box>
            <TextField
              fullWidth
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Role</InputLabel>
              <Select
                name="role"
                value={formData.role}
                label="Role"
                onChange={handleChange as any}
              >
                <MenuItem value="attendee">Attendee</MenuItem>
                <MenuItem value="captain">Team Captain</MenuItem>
              </Select>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1 }}>
                Organizer roles are assigned by administrators.
              </Typography>
            </FormControl>
            <TextField
              fullWidth
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
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
              {loading ? 'Registering...' : 'Register'}
            </Button>
          </form>

          <Typography variant="body2" sx={{ mt: 2 }} align="center">
            Already have an account?{' '}
            <Link component={RouterLink} to="/login">
              Login
            </Link>
          </Typography>
        </Paper>
      </Box>
    </Container>
  )
}
