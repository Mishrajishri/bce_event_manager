import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import {
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Box,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
} from '@mui/material'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { eventsApi } from '../services/api'

// F2 — Zod schema for form validation
const createEventSchema = z
  .object({
    name: z.string().min(3, 'Event name must be at least 3 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    event_type: z.enum(['sports', 'tech_fest', 'seminar', 'other'], {
      required_error: 'Please select an event type',
    }),
    venue: z.string().min(2, 'Venue is required'),
    max_participants: z.coerce.number().int().min(2, 'At least 2 participants required'),
    start_date: z.string().min(1, 'Start date is required'),
    end_date: z.string().min(1, 'End date is required'),
    registration_deadline: z.string().min(1, 'Registration deadline is required'),
  })
  .refine((data) => data.end_date > data.start_date, {
    message: 'End date must be after start date',
    path: ['end_date'],
  })
  .refine((data) => data.registration_deadline <= data.start_date, {
    message: 'Registration deadline must be on or before start date',
    path: ['registration_deadline'],
  })

type CreateEventForm = z.infer<typeof createEventSchema>

export default function CreateEvent() {
  const navigate = useNavigate()

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateEventForm>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      name: '',
      description: '',
      event_type: 'sports',
      venue: '',
      max_participants: 50,
      start_date: '',
      end_date: '',
      registration_deadline: '',
    },
  })

  const createMutation = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: (event) => {
      navigate(`/events/${event.id}`)
    },
  })

  const onSubmit = (data: CreateEventForm) => {
    createMutation.mutate(data as any)
  }

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Create New Event</Typography>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Event Name"
                margin="normal"
                required
                error={!!errors.name}
                helperText={errors.name?.message}
                id="event-name"
              />
            )}
          />

          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Description"
                margin="normal"
                multiline
                rows={4}
                required
                error={!!errors.description}
                helperText={errors.description?.message}
                id="event-description"
              />
            )}
          />

          <Controller
            name="event_type"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth margin="normal" error={!!errors.event_type}>
                <InputLabel id="event-type-label">Event Type</InputLabel>
                <Select
                  {...field}
                  labelId="event-type-label"
                  label="Event Type"
                  id="event-type"
                >
                  <MenuItem value="sports">Sports</MenuItem>
                  <MenuItem value="tech_fest">Tech Fest</MenuItem>
                  <MenuItem value="seminar">Seminar</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
                {errors.event_type && (
                  <FormHelperText>{errors.event_type.message}</FormHelperText>
                )}
              </FormControl>
            )}
          />

          <Controller
            name="venue"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Venue"
                margin="normal"
                required
                error={!!errors.venue}
                helperText={errors.venue?.message}
                id="event-venue"
              />
            )}
          />

          <Controller
            name="max_participants"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Max Participants"
                type="number"
                margin="normal"
                required
                error={!!errors.max_participants}
                helperText={errors.max_participants?.message}
                id="event-max-participants"
              />
            )}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Controller
              name="start_date"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Start Date"
                  type="datetime-local"
                  margin="normal"
                  required
                  InputLabelProps={{ shrink: true }}
                  error={!!errors.start_date}
                  helperText={errors.start_date?.message}
                  id="event-start-date"
                />
              )}
            />

            <Controller
              name="end_date"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="End Date"
                  type="datetime-local"
                  margin="normal"
                  required
                  InputLabelProps={{ shrink: true }}
                  error={!!errors.end_date}
                  helperText={errors.end_date?.message}
                  id="event-end-date"
                />
              )}
            />
          </Box>

          <Controller
            name="registration_deadline"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Registration Deadline"
                type="datetime-local"
                margin="normal"
                required
                InputLabelProps={{ shrink: true }}
                error={!!errors.registration_deadline}
                helperText={errors.registration_deadline?.message}
                id="event-reg-deadline"
              />
            )}
          />

          {createMutation.isError && (
            <Typography color="error" sx={{ mt: 2 }}>
              {(createMutation.error as Error)?.message || 'Failed to create event'}
            </Typography>
          )}

          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            disabled={createMutation.isPending}
            sx={{ mt: 3 }}
            aria-label="Create event"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Event'}
          </Button>
        </form>
      </Paper>
    </Container>
  )
}
