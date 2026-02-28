import { Container, Typography, Grid, Card, CardContent, Chip, Button, Box } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { registrationsApi, eventsApi } from '../services/api'

export default function MyRegistrations() {
  const { data: registrations, isLoading } = useQuery({
    queryKey: ['my-registrations'],
    queryFn: () => registrationsApi.myRegistrations(),
  })
  
  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.list(),
  })
  
  const getEventDetails = (eventId: string) => {
    return events?.find(e => e.id === eventId)
  }
  
  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        My Registrations
      </Typography>
      
      {isLoading ? (
        <Typography>Loading...</Typography>
      ) : registrations?.length === 0 ? (
        <Typography color="text.secondary">
          You haven't registered for any events yet.{' '}
          <Button component={Link} to="/events">Browse Events</Button>
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {registrations?.map(reg => {
            const event = getEventDetails(reg.event_id)
            return (
              <Grid item xs={12} sm={6} md={4} key={reg.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {event?.name || 'Unknown Event'}
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      <Chip 
                        label={reg.status} 
                        size="small" 
                        color={reg.status === 'confirmed' ? 'success' : 'default'}
                        sx={{ mr: 1 }}
                      />
                      <Chip 
                        label={reg.payment_status} 
                        size="small"
                        color={reg.payment_status === 'paid' ? 'success' : 'warning'}
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Registered: {new Date(reg.registered_at).toLocaleDateString()}
                    </Typography>
                    
                    {event && (
                      <Button 
                        size="small" 
                        component={Link} 
                        to={`/events/${event.id}`}
                      >
                        View Event
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      )}
    </Container>
  )
}
