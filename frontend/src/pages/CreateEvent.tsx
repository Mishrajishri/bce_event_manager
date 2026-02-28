import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Container, Typography, TextField, Button, Paper, Box, MenuItem, Select, FormControl, InputLabel } from '@mui/material'
import { eventsApi } from '../services/api'

export default function CreateEvent() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    event_type: 'sports',
    venue: '',
    max_participants: 50,
    start_date: '',
    end_date: '',
    registration_deadline: '',
  })
  
  const createMutation = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: (event) => {
      navigate(`/events/${event.id}`)
    },
  })
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { value: unknown }>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData as any)
  }
  
  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Create New Event</Typography>
        
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Event Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            margin="normal"
            required
          />
          
          <TextField
            fullWidth
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={4}
            required
          />
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Event Type</InputLabel>
            <Select
              name="event_type"
              value={formData.event_type}
              label="Event Type"
              onChange={handleChange as any}
            >
              <MenuItem value="sports">Sports</MenuItem>
              <MenuItem value="tech_fest">Tech Fest</MenuItem>
              <MenuItem value="seminar">Seminar</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            label="Venue"
            name="venue"
            value={formData.venue}
            onChange={handleChange}
            margin="normal"
            required
          />
          
          <TextField
            fullWidth
            label="Max Participants"
            name="max_participants"
            type="number"
            value={formData.max_participants}
            onChange={handleChange}
            margin="normal"
            required
          />
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="Start Date"
              name="start_date"
              type="datetime-local"
              value={formData.start_date}
              onChange={handleChange}
              margin="normal"
              required
              InputLabelProps={{ shrink: true }}
            />
            
            <TextField
              fullWidth
              label="End Date"
              name="end_date"
              type="datetime-local"
              value={formData.end_date}
              onChange={handleChange}
              margin="normal"
              required
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          
          <TextField
            fullWidth
            label="Registration Deadline"
            name="registration_deadline"
            type="datetime-local"
            value={formData.registration_deadline}
            onChange={handleChange}
            margin="normal"
            required
            InputLabelProps={{ shrink: true }}
          />
          
          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            disabled={createMutation.isPending}
            sx={{ mt: 3 }}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Event'}
          </Button>
        </form>
      </Paper>
    </Container>
  )
}
