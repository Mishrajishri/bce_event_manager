import { Typography, Box, Grid, Card, CardContent, CardMedia, CardActionArea, Chip, Button, Container } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Event, Add } from '@mui/icons-material'
import { eventsApi } from '../services/api'
import { useAuthStore, isOrganizer } from '../store'

export default function Home() {
  const { user } = useAuthStore()
  
  const { data: events, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.list({ status: 'published' }),
  })
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome{user ? `, ${user.first_name}` : ''}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Discover and join amazing events
        </Typography>
      </Box>
      
      {isOrganizer(user) && (
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            component={Link}
            to="/events/create"
          >
            Create Event
          </Button>
        </Box>
      )}
      
      <Typography variant="h5" gutterBottom>
        Upcoming Events
      </Typography>
      
      {isLoading ? (
        <Typography>Loading events...</Typography>
      ) : events?.length === 0 ? (
        <Typography color="text.secondary">No events found</Typography>
      ) : (
        <Grid container spacing={3}>
          {events?.map((event) => (
            <Grid item xs={12} sm={6} md={4} key={event.id}>
              <Card className="event-card">
                <CardActionArea component={Link} to={`/events/${event.id}`}>
                  <CardMedia
                    component="div"
                    sx={{
                      height: 140,
                      bgcolor: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Event sx={{ fontSize: 60, color: 'white' }} />
                  </CardMedia>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {event.name}
                    </Typography>
                    <Chip
                      label={event.event_type}
                      size="small"
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {new Date(event.start_date).toLocaleDateString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {event.venue}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  )
}
