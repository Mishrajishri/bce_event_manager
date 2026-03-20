import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Alert,
  IconButton,
  TextField,
  InputAdornment,
  Box,
  Typography,
} from '@mui/material'
import { Visibility, VisibilityOff, Email, Lock } from '@mui/icons-material'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../services/supabase'
import { useAuthStore } from '../store'
import { authApi } from '../services/api'
import { AuthLayout, useAuthContext } from '../components/layout_components'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

function LoginFormContent() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const { setReaction } = useAuthContext()

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
      // Trigger error reaction - sad shaking denial
      setReaction('error')
      setTimeout(() => setReaction('idle'), 1800)
      setServerError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  const handleEmailFocus = () => {
    setReaction('typing_email')
  }

  const handlePasswordFocus = () => {
    setReaction(showPassword ? 'sneaking_password_visible' : 'sneaking_password_hidden')
  }

  const handleInputBlur = () => {
    setReaction('idle')
  }

  const handleEmailChange = () => {
    setReaction('typing_email')
  }

  return (
    <>
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
              onFocus={handleEmailFocus}
              onBlur={handleInputBlur}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                field.onChange(e)
                handleEmailChange()
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'background.paper',
                }
              }}
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
              onFocus={handlePasswordFocus}
              onBlur={handleInputBlur}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'background.paper',
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => {
                        const newShow = !showPassword;
                        setShowPassword(newShow);
                        if (document.activeElement?.getAttribute('name') === 'password') {
                          setReaction(newShow ? 'sneaking_password_visible' : 'sneaking_password_hidden');
                        }
                      }}
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

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%', mt: 0.5 }}>
          <Typography
            component="span"
            variant="body2"
            color="primary"
            fontWeight={500}
            onClick={handleForgotPassword}
            onMouseEnter={() => setReaction('hover_forgot_password')}
            onMouseLeave={() => setReaction('idle')}
            sx={(theme) => ({
              cursor: 'pointer',
              color: theme.palette.mode === 'dark' ? '#84cc16' : '#2563eb',
              '&:hover': {
                textDecoration: 'underline'
              }
            })}
          >
            Forgot Password?
          </Typography>
        </Box>

        <Button
          fullWidth
          type="submit"
          variant="contained"
          size="large"
          disabled={isSubmitting}
          sx={{ mt: 3, mb: 2, padding: '12px', fontSize: '1.1rem' }}
        >
          {isSubmitting ? 'Signing in...' : 'Login'}
        </Button>
      </form>
    </>
  )
}

export default function Login() {
  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Login to your account to continue"
      bottomLinkTagline="Don't have an account?"
      bottomLinkText="Register"
      bottomLinkTo="/register"
      showInteractiveCharacters={true}
    >
      <LoginFormContent />
    </AuthLayout>
  )
}
