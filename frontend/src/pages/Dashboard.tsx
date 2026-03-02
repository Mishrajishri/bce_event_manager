import { Typography, Grid, Paper, Box, Button, Skeleton } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Add } from '@mui/icons-material'
import { useMemo } from 'react'
import { eventsApi } from '../services/api'
import { useAuthStore } from '../store'
import StatCard from '../components/StatCard'
import { EventCard } from '../components/features/EventCard'
import { PageContainer } from '../components/layout_components'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import type { Event } from '../types'

export default function Dashboard() {
  const { user } = useAuthStore()

  const { data: events, isLoading } = useQuery({
    queryKey: ['my-events'],
    queryFn: () => eventsApi.list(),
  })

  const myEvents = events?.filter((e: Event) => e.organizer_id === user?.id) || []

  // Compute real stats from events data
  const stats = useMemo(() => {
    if (!myEvents.length) return { totalRegs: 0, revenue: 0, activeCount: 0 }

    const activeCount = myEvents.filter((e: Event) => e.status === 'published' || e.status === 'ongoing').length

    // Aggregate registration counts from event data
    const totalRegs = myEvents.reduce((sum: number, e: Event) => sum + (e.current_participants || 0), 0)

    // Aggregate revenue from paid events
    const revenue = myEvents.reduce((sum: number, e: Event) => {
      const fee = e.registration_fee || 0
      const participants = e.current_participants || 0
      return sum + (fee * participants)
    }, 0)

    return { totalRegs, revenue, activeCount }
  }, [myEvents])

  // Build chart data from real events (registrations by month)
  const registrationTrends = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const counts: Record<string, number> = {}
    months.forEach(m => { counts[m] = 0 })

    myEvents.forEach((e: Event) => {
      const month = months[new Date(e.start_date).getMonth()]
      counts[month] += (e.current_participants || 0)
    })

    return months
      .filter(m => counts[m] > 0)
      .map(m => ({ name: m, registrations: counts[m] }))
  }, [myEvents])

  // Revenue by event type
  const revenueByType = useMemo(() => {
    const types: Record<string, number> = {}
    myEvents.forEach((e: Event) => {
      const fee = e.registration_fee || 0
      const participants = e.current_participants || 0
      const label = (e.event_type || 'other').replace('_', ' ')
      types[label] = (types[label] || 0) + fee * participants
    })

    return Object.entries(types).map(([name, revenue]) => ({ name, revenue }))
  }, [myEvents])

  const headerAction = (
    <Button
      variant="contained"
      startIcon={<Add />}
      component={Link}
      to="/events/create"
      aria-label="Create a new event"
    >
      Create Event
    </Button>
  )

  return (
    <PageContainer title="Organizer Dashboard" action={headerAction} maxWidth="xl">
      {/* Stats Cards — real data */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          {isLoading ? <Skeleton variant="rounded" height={100} /> :
            <StatCard title="Total Events" value={myEvents.length} />}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {isLoading ? <Skeleton variant="rounded" height={100} /> :
            <StatCard title="Total Registrations" value={stats.totalRegs} />}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {isLoading ? <Skeleton variant="rounded" height={100} /> :
            <StatCard title="Total Revenue" value={`₹${stats.revenue.toLocaleString()}`} />}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {isLoading ? <Skeleton variant="rounded" height={100} /> :
            <StatCard title="Active Events" value={stats.activeCount} />}
        </Grid>
      </Grid>

      {/* Charts — real data */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }} aria-label="Registration trends chart">
            <Typography variant="h6" gutterBottom>Registration Trends</Typography>
            {registrationTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={registrationTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="registrations" stroke="#7c3aed" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.secondary">No registration data yet. Create and publish events to see trends.</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }} aria-label="Revenue by event type chart">
            <Typography variant="h6" gutterBottom>Revenue by Type</Typography>
            {revenueByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueByType}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#7c3aed" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.secondary">No revenue data yet.</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* My Events */}
      <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>My Events</Typography>
      {isLoading ? (
        <Grid container spacing={2}>
          {[1, 2, 3].map(i => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <EventCard isLoading={true} />
            </Grid>
          ))}
        </Grid>
      ) : myEvents.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">📋 No events created yet</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Click &quot;Create Event&quot; to get started!
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {myEvents.map((event: Event) => (
            <Grid item xs={12} sm={6} md={4} key={event.id}>
              <EventCard event={event} />
            </Grid>
          ))}
        </Grid>
      )}
    </PageContainer>
  )
}
