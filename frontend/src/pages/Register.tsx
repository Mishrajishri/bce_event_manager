import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Alert,
  MenuItem,
  TextField,
  Box,
  IconButton,
  InputAdornment,
} from '@mui/material'
import { Visibility, VisibilityOff, Email, Lock, Person, Badge } from '@mui/icons-material'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { signUp } from '../services/supabase'
import { useAuthStore } from '../store'
import { authApi } from '../services/api'
import { AuthLayout } from '../components/layout_components'

const registerSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  role: z.enum(['attendee', 'captain']),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type RegisterForm = z.infer<typeof registerSchema>

export default function Register() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [serverError, setServerError] = useState('')

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      role: 'attendee',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (data: RegisterForm) => {
    setServerError('')

    try {
      const { data: authData, error: signUpError } = await signUp(data.email, data.password, {
        first_name: data.first_name,
        last_name: data.last_name,
        role: data.role,
      })

      if (signUpError) {
        throw new Error(signUpError.message)
      }

      if (authData.session) {
        // Try to fetch the full profile; fall back to local metadata
        let userData
        try {
          userData = await authApi.me()
        } catch {
          const meta = authData.user?.user_metadata || {}
          userData = {
            id: authData.user?.id || '',
            email: authData.user?.email || '',
            first_name: meta.first_name || data.first_name,
            last_name: meta.last_name || data.last_name,
            role: meta.role || data.role,
            is_verified: !!authData.user?.email_confirmed_at,
            created_at: authData.user?.created_at || new Date().toISOString(),
          }
        }

        setAuth(
          userData,
          authData.session.access_token,
          authData.session.refresh_token
        )
        navigate('/')
      } else {
        // Email confirmation required
        navigate('/login', { state: { message: 'Registration successful! Please check your email to verify.' } })
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Registration failed')
    }
  }

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Sign up for BCE Event Manager"
      bottomLinkTagline="Already have an account?"
      bottomLinkText="Login"
      bottomLinkTo="/login"
    >
      {serverError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {serverError}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
          <Controller
            name="first_name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="First Name"
                margin="normal"
                required
                error={!!errors.first_name}
                helperText={errors.first_name?.message}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Badge /></InputAdornment>,
                }}
              />
            )}
          />

          <Controller
            name="last_name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Last Name"
                margin="normal"
                required
                error={!!errors.last_name}
                helperText={errors.last_name?.message}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Badge /></InputAdornment>,
                }}
              />
            )}
          />
        </Box>

        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Email Address"
              type="email"
              margin="normal"
              required
              autoComplete="email"
              error={!!errors.email}
              helperText={errors.email?.message}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Email /></InputAdornment>,
              }}
            />
          )}
        />

        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              select
              fullWidth
              label="Account Role"
              margin="normal"
              helperText="Organizer roles are assigned by administrators."
              InputProps={{
                startAdornment: <InputAdornment position="start"><Person /></InputAdornment>,
              }}
            >
              <MenuItem value="attendee">🎯 Attendee</MenuItem>
              <MenuItem value="captain">🚩 Team Captain</MenuItem>
            </TextField>
          )}
        />

        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              margin="normal"
              required
              autoComplete="new-password"
              error={!!errors.password}
              helperText={errors.password?.message}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Lock /></InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      aria-label="toggle password visibility"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          )}
        />

        <Controller
          name="confirmPassword"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              margin="normal"
              required
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Lock /></InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                      aria-label="toggle password visibility"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          )}
        />

        <Button
          fullWidth
          type="submit"
          variant="contained"
          size="large"
          disabled={isSubmitting}
          sx={{ mt: 3, mb: 2 }}
        >
          {isSubmitting ? 'Registering...' : 'Create Account'}
        </Button>
      </form>
    </AuthLayout>
  )
}
