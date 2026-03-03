import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Typography, Box, Chip, Button, Paper, Grid, Card, CardContent,
  TextField, Snackbar, Alert, Skeleton,
} from '@mui/material'
import { CalendarMonth, LocationOn, People, Timer } from '@mui/icons-material'
import { useState } from 'react'
import { eventsApi, teamsApi, registrationsApi } from '../services/api'
import { useAuthStore, isOrganizer } from '../store'
import { PageContainer } from '../components/layout_components'

type ChipColor = "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning";

const statusColor = (s: string): ChipColor => {
  switch (s) {
    case 'published': return 'success'
    case 'draft': return 'default'
    case 'ongoing': return 'info'
    case 'completed': return 'primary'
    case 'cancelled': return 'error'
    default: return 'default'
  }
}

export default function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isAuthenticated, user } = useAuthStore()
  const canManage = isOrganizer(user)
  const [teamName, setTeamName] = useState('')
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  })

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.get(id!),
    enabled: !!id,
  })

  const { data: teams } = useQuery({
    queryKey: ['teams', id],
    queryFn: () => teamsApi.listByEvent(id!),
    enabled: !!id,
  })

  const registerMutation = useMutation({
    mutationFn: (data: { team_id?: string; payment_amount?: number }) =>
      registrationsApi.register(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] })
      setSnackbar({ open: true, message: '🎉 Registration successful!', severity: 'success' })
    },
    onError: (err: Error) => {
      setSnackbar({ open: true, message: err.message || 'Registration failed', severity: 'error' })
    },
  })

  const createTeamMutation = useMutation({
    mutationFn: (data: { name: string }) => teamsApi.create(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', id] })
      setTeamName('')
      setSnackbar({ open: true, message: 'Team created!', severity: 'success' })
    },
  })

  if (isLoading) {
    return (
      <PageContainer maxWidth="lg">
        <Paper sx={{ overflow: 'hidden', mb: 3 }}>
          <Skeleton variant="rectangular" height={300} />
          <Box sx={{ p: 3 }}>
            <Skeleton variant="text" width="60%" height={48} />
            <Skeleton variant="text" width="30%" />
            <Grid container spacing={2} sx={{ mt: 4 }}>
              {[1, 2, 3, 4].map(i => (
                <Grid item xs={12} sm={6} key={i}>
                  <Skeleton variant="text" width="40%" />
                  <Skeleton variant="text" width="60%" />
                </Grid>
              ))}
            </Grid>
          </Box>
        </Paper>
      </PageContainer>
    )
  }

  if (!event) {
    return (
      <PageContainer maxWidth="lg">
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" color="text.secondary">😕 Event not found</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This event may have been removed or doesn&apos;t exist.
          </Typography>
        </Paper>
      </PageContainer>
    )
  }

  const canRegister = new Date(event.registration_deadline) > new Date() &&
    event.status === 'published'

  return (
    <PageContainer maxWidth="lg">
      <Paper sx={{ overflow: 'hidden', mb: 3 }}>
        <Box
          component="img"
          src={event.cover_image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1200'}
          alt={event.name}
          sx={{ width: '100%', height: { xs: 200, md: 350 }, objectFit: 'cover' }}
        />
        <Box sx={{ p: { xs: 3, md: 4 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="h4">{event.name}</Typography>
            <Chip label={event.status} color={statusColor(event.status)} sx={{ textTransform: 'capitalize' }} />
          </Box>

          <Chip label={event.event_type.replace('_', ' ')} sx={{ mb: 2, textTransform: 'capitalize' }} variant="outlined" />

          <Box sx={{ float: 'right', display: 'flex', gap: 1 }}>
            {event.event_type === 'hackathon' && isAuthenticated && teams?.some(t => t.captain_id === user?.id) && (
              <Button
                variant="contained"
                color="secondary"
                onClick={() => navigate(`/events/${event.id}/submit`)}
              >
                Submit Project
              </Button>
            )}

            {isAuthenticated && (
              <Button
                variant="outlined"
                onClick={() => navigate(`/events/${event.id}/teams`)}
              >
                Team Board
              </Button>
            )}

            {event.event_type === 'hackathon' && isAuthenticated && (
              <Button
                variant="outlined"
                color="primary"
                onClick={() => navigate(`/events/${event.id}/mentorship`)}
              >
                Mentorship
              </Button>
            )}

            {(user?.role === 'organizer' || user?.role === 'admin' || user?.role === 'super_admin') && (
              <Button
                variant="outlined"
                color="info"
                onClick={() => navigate(`/events/${event.id}/judging`)}
              >
                Judging
              </Button>
            )}

            {event.event_type === 'sports' && (
              <Button
                variant="contained"
                color="success"
                onClick={() => navigate(`/events/${event.id}/matches`)}
              >
                Live Scores
              </Button>
            )}

            {event.event_type === 'sports' && (
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => navigate(`/events/${event.id}/brackets`)}
              >
                Brackets
              </Button>
            )}

            {event.event_type === 'cultural' && (
              <Button
                variant="contained"
                color="secondary"
                onClick={() => navigate(`/events/${event.id}/performances`)}
              >
                Performances
              </Button>
            )}

            {event.event_type === 'paper_presentation' && (
              <Button
                variant="contained"
                color="info"
                onClick={() => navigate(`/events/${event.id}/academic/submit`)}
              >
                Submit Paper
              </Button>
            )}

            {canManage && event.event_type === 'paper_presentation' && (
              <Button
                variant="outlined"
                color="info"
                onClick={() => navigate(`/events/${event.id}/academic/review`)}
              >
                Review Submissions
              </Button>
            )}
          </Box>

          <Typography variant="body1" paragraph>{event.description}</Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationOn fontSize="small" color="primary" />
                <Box>
                  <Typography variant="subtitle2">Venue</Typography>
                  <Typography variant="body2">{event.venue}</Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarMonth fontSize="small" color="primary" />
                <Box>
                  <Typography variant="subtitle2">Date</Typography>
                  <Typography variant="body2">
                    {new Date(event.start_date).toLocaleDateString()} – {new Date(event.end_date).toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Timer fontSize="small" color="primary" />
                <Box>
                  <Typography variant="subtitle2">Registration Deadline</Typography>
                  <Typography variant="body2">
                    {new Date(event.registration_deadline).toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <People fontSize="small" color="primary" />
                <Box>
                  <Typography variant="subtitle2">Max Participants</Typography>
                  <Typography variant="body2">{event.max_participants}</Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>

          {isAuthenticated && canRegister && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>Join Event</Typography>

              {teams && teams.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Join an existing team:</Typography>
                  {teams.map(team => (
                    <Card key={team.id} sx={{ mb: 1 }}>
                      <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2">{team.name}</Typography>
                          <Button size="small" onClick={() => registerMutation.mutate({ team_id: team.id })}>
                            Join
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}

              <Typography variant="subtitle2" gutterBottom>Or create a new team:</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Team Name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                />
                <Button
                  variant="contained"
                  onClick={() => createTeamMutation.mutate({ name: teamName })}
                  disabled={!teamName}
                >
                  Create Team
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Snackbar notification */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  )
}
