import { Container, Typography, Grid, Paper, Box, Button } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Add } from '@mui/icons-material'
import { eventsApi } from '../services/api'
import { useAuthStore } from '../store'
import StatCard from '../components/StatCard'
import EventCard from '../components/EventCard'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

export default function Dashboard() {
  const { user } = useAuthStore()

  const { data: events } = useQuery({
    queryKey: ['my-events'],
    queryFn: () => eventsApi.list(),
  })

  const myEvents = events?.filter(e => e.organizer_id === user?.id) || []

  // Mock analytics data
  const analyticsData = [
    { name: 'Jan', registrations: 40 },
    { name: 'Feb', registrations: 30 },
    { name: 'Mar', registrations: 60 },
    { name: 'Apr', registrations: 80 },
    { name: 'May', registrations: 45 },
  ]

  const revenueData = [
    { name: 'Events', revenue: 4000 },
    { name: 'Sponsors', revenue: 3000 },
    { name: 'Registration', revenue: 2000 },
  ]

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        Organizer Dashboard
      </Typography>

      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<Add />}
          component={Link}
          to="/events/create"
          aria-label="Create a new event"
        >
          Create Event
        </Button>
      </Box>

      {/* Stats Cards — F5: using reusable StatCard */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Events" value={myEvents.length} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Registrations" value={124} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Revenue" value="$9,000" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Active Events" value={myEvents.filter(e => e.status === 'published').length} />
        </Grid>
      </Grid>

      {/* Charts — F6: aria-labels for accessibility */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }} aria-label="Registration trends chart">
            <Typography variant="h6" gutterBottom>Registration Trends</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="registrations" stroke="#1976d2" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }} aria-label="Revenue sources chart">
            <Typography variant="h6" gutterBottom>Revenue Sources</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" fill="#1976d2" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* My Events — F5: using reusable EventCard */}
      <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>My Events</Typography>
      {myEvents.length === 0 ? (
        <Typography color="text.secondary">You haven't created any events yet.</Typography>
      ) : (
        <Grid container spacing={2}>
          {myEvents.map(event => (
            <Grid item xs={12} sm={6} md={4} key={event.id}>
              <EventCard event={event} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  )
}
