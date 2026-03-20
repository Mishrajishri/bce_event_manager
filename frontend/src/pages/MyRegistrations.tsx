import { useMemo, useState } from 'react'
import {
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
} from '@mui/material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Event, Cancel, Warning } from '@mui/icons-material'
import { registrationsApi, eventsApi } from '../services/api'
import { PageContainer } from '../components/layout_components'


export default function MyRegistrations() {
  const queryClient = useQueryClient()
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; registration: any | null }>({
    open: false,
    registration: null,
  })

  const { data: registrations, isLoading } = useQuery({
    queryKey: ['my-registrations'],
    queryFn: () => registrationsApi.myRegistrations(),
  })

  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.list(),
  })

  const cancelMutation = useMutation({
    mutationFn: (registrationId: string) =>
      registrationsApi.updateStatus(registrationId, { status: 'cancelled' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-registrations'] })
      setCancelDialog({ open: false, registration: null })
    },
  })

  const handleCancel = () => {
    if (cancelDialog.registration) {
      cancelMutation.mutate(cancelDialog.registration.id)
    }
  }

  // Use useMemo to create a Map for O(1) event lookup
  const eventsMap = useMemo(() => {
    const map = new Map<string, NonNullable<typeof events>[number]>()
    events?.forEach(event => map.set(event.id, event))
    return map
  }, [events])

  const getEventDate = (eventId: string) => {
    const event = eventsMap.get(eventId)
    if (!event) return null
    const startDate = new Date(event.start_date)
    const endDate = new Date(event.end_date)
    const now = new Date()
    const daysUntil = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    let statusText = ''
    if (daysUntil > 0) {
      statusText = `Starts in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`
    } else if (daysUntil === 0) {
      statusText = 'Starting today!'
    } else if (now < endDate) {
      statusText = 'In progress'
    } else {
      statusText = 'Completed'
    }

    return {
      date: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      daysUntil,
      statusText,
      isPast: now > endDate,
      isOngoing: now >= startDate && now <= endDate,
    }
  }

  return (
    <PageContainer title="My Registrations">
      {isLoading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : registrations?.length === 0 ? (
        <Typography color="text.secondary">
          You haven't registered for any events yet.{' '}
          <Button component={Link} to="/events">Browse Events</Button>
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {registrations?.map(reg => {
            const event = eventsMap.get(reg.event_id)
            const eventDate = getEventDate(reg.event_id)
            const canCancel = reg.status === 'pending' || reg.status === 'confirmed'
            const isPaid = reg.payment_status === 'paid'

            return (
              <Grid item xs={12} sm={6} md={4} key={reg.id}>
                <Card sx={{
                  opacity: reg.status === 'cancelled' ? 0.6 : 1,
                  borderLeft: reg.status === 'cancelled' ? '4px solid #999' :
                    eventDate?.isOngoing ? '4px solid #4caf50' :
                      eventDate?.daysUntil && eventDate.daysUntil <= 7 ? '4px solid #ff9800' : 'none'
                }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {event?.name || 'Unknown Event'}
                    </Typography>

                    <Box sx={{ mb: 2 }}>
                      <Chip
                        label={reg.status}
                        size="small"
                        color={reg.status === 'confirmed' ? 'success' : reg.status === 'cancelled' ? 'default' : 'warning'}
                        sx={{ mr: 1, textTransform: 'capitalize' }}
                      />
                      <Chip
                        label={reg.payment_status}
                        size="small"
                        color={reg.payment_status === 'paid' ? 'success' : reg.payment_status === 'refunded' ? 'info' : 'warning'}
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </Box>

                    {/* Event Date Info */}
                    {eventDate && (
                      <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Event fontSize="small" color={eventDate.isPast ? 'disabled' : 'primary'} />
                        <Typography variant="body2" color={eventDate.isPast ? 'text.disabled' : 'text.primary'}>
                          {eventDate.date}
                        </Typography>
                        {eventDate.daysUntil > 0 && !eventDate.isPast && (
                          <Chip
                            label={eventDate.daysUntil <= 3 ? 'Soon!' : eventDate.statusText}
                            size="small"
                            color={eventDate.daysUntil <= 3 ? 'error' : 'default'}
                            sx={{ ml: 1 }}
                          />
                        )}
                        {eventDate.isOngoing && (
                          <Chip label="LIVE" size="small" color="success" sx={{ ml: 1 }} />
                        )}
                      </Box>
                    )}

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Registered: {new Date(reg.registered_at).toLocaleDateString()}
                    </Typography>

                    {/* Waitlist Position */}
                    {reg.waitlist_position && reg.status === 'pending' && (
                      <Alert severity="info" sx={{ mb: 2, py: 0 }}>
                        Waitlist Position: #{reg.waitlist_position}
                      </Alert>
                    )}

                    {/* Payment Amount */}
                    {isPaid && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Paid: ₹{reg.payment_amount}
                      </Typography>
                    )}

                    {event && (
                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          component={Link}
                          to={`/events/${event.id}`}
                        >
                          View Event
                        </Button>
                        {canCancel && (
                          <Button
                            size="small"
                            color="error"
                            startIcon={<Cancel />}
                            onClick={() => setCancelDialog({ open: true, registration: reg })}
                          >
                            Cancel
                          </Button>
                        )}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialog.open} onClose={() => setCancelDialog({ open: false, registration: null })}>
        <DialogTitle>Cancel Registration?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Box display="flex" alignItems="center" gap={1}>
              <Warning />
              <Typography variant="body2">
                This action cannot be undone.
              </Typography>
            </Box>
          </Alert>
          <Typography>
            Are you sure you want to cancel your registration for{' '}
            <strong>{eventsMap.get(cancelDialog.registration?.event_id || '')?.name}</strong>?
          </Typography>
          {cancelDialog.registration?.payment_status === 'paid' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              A refund may be processed according to the event's refund policy.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialog({ open: false, registration: null })}>
            Keep Registration
          </Button>
          <Button
            onClick={handleCancel}
            color="error"
            variant="contained"
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Registration'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  )
}
