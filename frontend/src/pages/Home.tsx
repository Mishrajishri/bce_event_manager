import { Typography, Box, Grid, Card, CardContent, CardMedia, CardActionArea, Chip, Button, Container, Skeleton } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Event, Add, SearchOff } from '@mui/icons-material'
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
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card>
                <Skeleton variant="rectangular" height={140} animation="wave" />
                <CardContent>
                  <Skeleton variant="text" width="80%" height={32} />
                  <Skeleton variant="text" width="40%" />
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="50%" />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : events?.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <SearchOff sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">No events found</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Check back later for upcoming events!
          </Typography>
        </Box>
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
                      background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
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
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <Chip
                        label={event.event_type}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={event.status}
                        size="small"
                        color="success"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      📅 {new Date(event.start_date).toLocaleDateString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      📍 {event.venue}
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
