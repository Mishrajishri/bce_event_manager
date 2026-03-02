import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Alert,
  IconButton,
  TextField,
  InputAdornment,
} from '@mui/material'
import { Visibility, VisibilityOff, Email, Lock } from '@mui/icons-material'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../services/supabase'
import { useAuthStore } from '../store'
import { authApi } from '../services/api'
import { AuthLayout } from '../components/layout_components'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const [resetSent, setResetSent] = useState(false)

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const handleForgotPassword = async () => {
    const email = getValues('email')
    if (!email) {
      setServerError('Please enter your email address first')
      return
    }
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email)
      if (resetError) throw resetError
      setResetSent(true)
      setServerError('')
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to send reset email')
    }
  }

  const onSubmit = async (data: LoginForm) => {
    setServerError('')

    try {
      const response = await authApi.login({ email: data.email, password: data.password })
      const { user, access_token, refresh_token } = response

      setAuth(user, access_token, refresh_token)
      navigate('/')
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Login to your account to continue"
      bottomLinkTagline="Don't have an account?"
      bottomLinkText="Register"
      bottomLinkTo="/register"
    >
      {serverError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {serverError}
        </Alert>
      )}

      {resetSent && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Password reset email sent! Check your inbox.
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>

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
                startAdornment: (
                  <InputAdornment position="start">
                    <Email />
                  </InputAdornment>
                ),
              }}
            />
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
              autoComplete="current-password"
              error={!!errors.password}
              helperText={errors.password?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock />
                  </InputAdornment>
                ),
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

        <Button
          sx={{ mt: 1, textTransform: 'none', display: 'flex', ml: 'auto', p: 0, '&:hover': { background: 'transparent', textDecoration: 'underline' } }}
          color="primary"
          variant="text"
          onClick={handleForgotPassword}
        >
          Forgot Password?
        </Button>

        <Button
          fullWidth
          type="submit"
          variant="contained"
          size="large"
          disabled={isSubmitting}
          sx={{ mt: 3, mb: 2 }}
        >
          {isSubmitting ? 'Signing in...' : 'Login'}
        </Button>
      </form>
    </AuthLayout>
  )
}
