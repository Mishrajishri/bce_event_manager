import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import {
  TextField,
  Button,
  Paper,
  Box,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
  Alert,
} from '@mui/material'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { eventsApi } from '../services/api'
import { PageContainer } from '../components/layout_components'

// F2 — Zod schema for form validation
const createEventSchema = z
  .object({
    name: z.string().min(3, 'Event name must be at least 3 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    event_type: z.enum([
      'sports', 'tech_fest', 'seminar', 'hackathon',
      'coding_competition', 'cultural', 'workshop',
      'paper_presentation', 'other'
    ], {
      required_error: 'Please select an event type',
    }),
    category: z.string().optional(),
    venue: z.string().min(2, 'Venue is required'),
    max_participants: z.coerce.number().int().min(2, 'At least 2 participants required'),
    start_date: z.string().min(1, 'Start date is required'),
    end_date: z.string().min(1, 'End date is required'),
    registration_deadline: z.string().min(1, 'Registration deadline is required'),
    // Category specific config
    match_duration: z.coerce.number().optional(),
    max_team_size: z.coerce.number().optional(),
    submission_deadline: z.string().optional(),
    tracks: z.string().optional(),
    rounds: z.coerce.number().optional(),
    audition_required: z.boolean(),
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
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateEventForm>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      name: '',
      description: '',
      event_type: 'sports',
      category: '',
      venue: '',
      max_participants: 50,
      start_date: '',
      end_date: '',
      registration_deadline: '',
      audition_required: false,
      match_duration: 0,
      max_team_size: 1,
      submission_deadline: '',
      tracks: '',
      rounds: 1,
    },
  })

  const createMutation = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: (event) => {
      navigate(`/events/${event.id}`)
    },
    onError: (error: Error) => {
      setSubmitError(error.message || 'Failed to create event. Please try again.')
    },
  })

  const onSubmit = (data: CreateEventForm) => {
    setSubmitError(null)

    // Prepare category-specific configuration
    const config_data: Record<string, any> = {}

    if (data.event_type === 'sports') {
      if (data.match_duration) config_data.match_duration = data.match_duration
    } else if (data.event_type === 'hackathon') {
      if (data.max_team_size) config_data.max_team_size = data.max_team_size
      if (data.submission_deadline) config_data.submission_deadline = data.submission_deadline
      if (data.tracks) config_data.tracks = data.tracks
    } else if (data.event_type === 'cultural') {
      if (data.rounds) config_data.rounds = data.rounds
      config_data.audition_required = data.audition_required
    }

    const payload: any = {
      name: data.name,
      description: data.description,
      event_type: data.event_type,
      category: data.category,
      venue: data.venue,
      max_participants: data.max_participants,
      start_date: data.start_date,
      end_date: data.end_date,
      registration_deadline: data.registration_deadline,
      config_data: Object.keys(config_data).length > 0 ? config_data : undefined
    }
    createMutation.mutate(payload)
  }

  return (
    <PageContainer title="Create New Event" maxWidth="md">
      <Paper sx={{ p: 4 }}>
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
                  <MenuItem value="hackathon">Hackathon</MenuItem>
                  <MenuItem value="coding_competition">Coding Competition</MenuItem>
                  <MenuItem value="cultural">Cultural</MenuItem>
                  <MenuItem value="workshop">Workshop</MenuItem>
                  <MenuItem value="paper_presentation">Paper Presentation</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
                {errors.event_type && (
                  <FormHelperText>{errors.event_type.message}</FormHelperText>
                )}
              </FormControl>
            )}
          />

          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Category / Sub-type"
                placeholder="e.g. Cricket, AI, Dance"
                margin="normal"
                error={!!errors.category}
                helperText={errors.category?.message}
                id="event-category"
              />
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

          {/* Conditional Category Specific Fields */}
          {watch('event_type') === 'sports' && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Controller
                name="match_duration"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Match Duration (minutes)"
                    type="number"
                    margin="normal"
                    error={!!errors.match_duration}
                    helperText={errors.match_duration?.message}
                  />
                )}
              />
            </Box>
          )}

          {watch('event_type') === 'hackathon' && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Controller
                  name="max_team_size"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Max Team Size"
                      type="number"
                      margin="normal"
                      error={!!errors.max_team_size}
                      helperText={errors.max_team_size?.message}
                    />
                  )}
                />
                <Controller
                  name="submission_deadline"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Submission Deadline"
                      type="datetime-local"
                      margin="normal"
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.submission_deadline}
                      helperText={errors.submission_deadline?.message}
                    />
                  )}
                />
              </Box>
              <Controller
                name="tracks"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Tracks (comma separated)"
                    placeholder="AI, Web, Mobile"
                    margin="normal"
                    error={!!errors.tracks}
                    helperText={errors.tracks?.message}
                  />
                )}
              />
            </Box>
          )}

          {watch('event_type') === 'cultural' && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Controller
                name="rounds"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Number of Rounds"
                    type="number"
                    margin="normal"
                    error={!!errors.rounds}
                    helperText={errors.rounds?.message}
                  />
                )}
              />
              <Controller
                name="audition_required"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <FormControl fullWidth margin="normal">
                    <InputLabel id="audition-label">Audition Required?</InputLabel>
                    <Select
                      {...field}
                      labelId="audition-label"
                      label="Audition Required?"
                      value={value ? 'true' : 'false'}
                      onChange={(e) => onChange(e.target.value === 'true')}
                    >
                      <MenuItem value="false">No</MenuItem>
                      <MenuItem value="true">Yes</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Box>
          )}

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
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

          {submitError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {submitError}
            </Alert>
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
    </PageContainer>
  )
}
