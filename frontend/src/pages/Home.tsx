import { Typography, Box, Grid, Button } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Add, SearchOff } from '@mui/icons-material'
import { eventsApi } from '../services/api'
import { useAuthStore, isOrganizer } from '../store'
import { PageContainer } from '../components/layout_components'
import { EventCard } from '../components/features/EventCard'

export default function Home() {
  const { user } = useAuthStore()

  const { data: events, isLoading } = useQuery({
    queryKey: ['events', 'published'],
    queryFn: () => eventsApi.list({ status: 'published' }),
  })

  const headerAction = isOrganizer(user) ? (
    <Button
      variant="contained"
      startIcon={<Add />}
      component={Link}
      to="/events/create"
    >
      Create Event
    </Button>
  ) : undefined

  return (
    <PageContainer
      title={`Welcome${user?.first_name ? `, ${user.first_name}` : ''}!`}
      action={headerAction}
    >
      <Typography variant="body1" color="text.secondary" sx={{ mt: -2, mb: 2 }}>
        Discover and join amazing events
      </Typography>

      <Typography variant="h5" sx={{ mt: 2, mb: 1 }}>
        Upcoming Events
      </Typography>

      {isLoading ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <EventCard isLoading={true} />
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
              <EventCard event={event} />
            </Grid>
          ))}
        </Grid>
      )}
    </PageContainer>
  )
}
