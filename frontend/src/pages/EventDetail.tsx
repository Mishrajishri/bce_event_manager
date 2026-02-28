import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Container, Typography, Box, Chip, Button, Paper, Grid, Card, CardContent, Alert } from '@mui/material'
import { useState } from 'react'
import { eventsApi, teamsApi, registrationsApi } from '../services/api'
import { useAuthStore } from '../store'

export default function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { user, isAuthenticated } = useAuthStore()
  const [teamName, setTeamName] = useState('')
  
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
      alert('Registration successful!')
    },
  })
  
  const createTeamMutation = useMutation({
    mutationFn: (data: { name: string }) => teamsApi.create(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', id] })
      setTeamName('')
    },
  })
  
  if (isLoading) return <Typography>Loading...</Typography>
  if (!event) return <Typography>Event not found</Typography>
  
  const canRegister = new Date(event.registration_deadline) > new Date() && 
    event.status === 'published'
  
  return (
    <Container maxWidth="lg">
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h4">{event.name}</Typography>
          <Chip label={event.status} color="primary" />
        </Box>
        
        <Chip label={event.event_type} sx={{ mb: 2 }} />
        
        <Typography variant="body1" paragraph>{event.description}</Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2">Venue</Typography>
            <Typography variant="body2">{event.venue}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2">Date</Typography>
            <Typography variant="body2">
              {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2">Registration Deadline</Typography>
            <Typography variant="body2">
              {new Date(event.registration_deadline).toLocaleDateString()}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2">Max Participants</Typography>
            <Typography variant="body2">{event.max_participants}</Typography>
          </Grid>
        </Grid>
        
        {isAuthenticated && canRegister && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>Join Event</Typography>
            
            {teams && teams.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Or join an existing team:</Typography>
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
              <input
                type="text"
                placeholder="Team Name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                style={{ padding: '8px', flex: 1 }}
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
      </Paper>
    </Container>
  )
}
