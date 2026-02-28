import { Typography, Box, Grid, Card, CardContent, CardMedia, CardActionArea, Chip, Container, TextField, InputAdornment } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Event, Search } from '@mui/icons-material'
import { useState } from 'react'
import { eventsApi } from '../services/api'

export default function Events() {
  const [search, setSearch] = useState('')
  
  const { data: events, isLoading } = useQuery({
    queryKey: ['events', search],
    queryFn: () => eventsApi.list({ search: search || undefined, status: 'published' }),
  })
  
  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        All Events
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      
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
                    <Chip label={event.event_type} size="small" sx={{ mb: 1 }} />
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
