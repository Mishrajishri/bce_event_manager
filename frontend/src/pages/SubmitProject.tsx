
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
    Typography, Box, Paper, TextField, Button, Alert,
    Autocomplete, Chip, CircularProgress,
} from '@mui/material'
import { techApi, eventsApi, teamsApi } from '../services/api'
import { useAuthStore } from '../store'
import { PageContainer } from '../components/layout_components'

const submissionSchema = z.object({
    title: z.string().min(5, 'Title must be at least 5 characters'),
    description: z.string().min(20, 'Please provide a more detailed description'),
    github_url: z.string().url('Invalid GitHub URL').optional().or(z.literal('')),
    demo_video_url: z.string().url('Invalid Demo Video URL').optional().or(z.literal('')),
    pitch_deck_url: z.string().url('Invalid Pitch Deck URL').optional().or(z.literal('')),
    tech_stack: z.array(z.string()).min(1, 'Please add at least one technology'),
})

type SubmissionForm = z.infer<typeof submissionSchema>

export default function SubmitProject() {
    const { eventId } = useParams<{ eventId: string }>()
    const navigate = useNavigate()
    const { user } = useAuthStore()
    const [submitError, setSubmitError] = useState<string | null>(null)

    // 1. Fetch Event Details
    const { data: event, isLoading: eventLoading } = useQuery({
        queryKey: ['event', eventId],
        queryFn: () => eventsApi.get(eventId!),
        enabled: !!eventId,
    })

    // 2. Fetch User's Team for this event
    const { data: teams, isLoading: teamsLoading } = useQuery({
        queryKey: ['teams', eventId],
        queryFn: () => teamsApi.listByEvent(eventId!),
        enabled: !!eventId,
    })

    // Find the team where current user is captain
    const myTeam = teams?.find(t => t.captain_id === user?.id)

    const { control, handleSubmit, formState: { errors } } = useForm<SubmissionForm>({
        resolver: zodResolver(submissionSchema),
        defaultValues: {
            title: '',
            description: '',
            github_url: '',
            demo_video_url: '',
            pitch_deck_url: '',
            tech_stack: [],
        }
    })

    const submitMutation = useMutation({
        mutationFn: techApi.submitProject,
        onSuccess: () => {
            navigate(`/events/${eventId}`)
        },
        onError: (err: any) => {
            setSubmitError(err.message || 'Failed to submit project')
        }
    })

    const onSubmit = (data: SubmissionForm) => {
        if (!myTeam) {
            setSubmitError('You must be a team captain to submit a project.')
            return
        }

        submitMutation.mutate({
            ...data,
            event_id: eventId!,
            team_id: myTeam.id,
        })
    }

    if (eventLoading || teamsLoading) {
        return (
            <PageContainer maxWidth="md">
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
                    <CircularProgress />
                </Box>
            </PageContainer>
        )
    }

    if (!event || event.event_type !== 'hackathon') {
        return (
            <PageContainer maxWidth="md">
                <Alert severity="error">This event does not support project submissions.</Alert>
            </PageContainer>
        )
    }

    if (!myTeam) {
        return (
            <PageContainer maxWidth="md">
                <Alert severity="warning">
                    Only team captains can submit projects. If you are a member but not the captain, please ask your captain to submit.
                </Alert>
                <Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>Go Back</Button>
            </PageContainer>
        )
    }

    return (
        <PageContainer title={`Submit Project - ${event.name}`} maxWidth="md">
            <Paper sx={{ p: 4 }}>
                <Typography variant="h6" gutterBottom>Project Details for Team: {myTeam.name}</Typography>

                {submitError && <Alert severity="error" sx={{ mb: 3 }}>{submitError}</Alert>}

                <form onSubmit={handleSubmit(onSubmit)}>
                    <Controller
                        name="title"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                fullWidth
                                label="Project Title"
                                margin="normal"
                                required
                                error={!!errors.title}
                                helperText={errors.title?.message}
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
                                label="Detailed Description"
                                margin="normal"
                                multiline
                                rows={6}
                                required
                                error={!!errors.description}
                                helperText={errors.description?.message}
                                placeholder="What problem does it solve? How did you build it?"
                            />
                        )}
                    />

                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Controller
                            name="github_url"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    sx={{ flex: 1, minWidth: '300px' }}
                                    label="GitHub Repository URL"
                                    margin="normal"
                                    error={!!errors.github_url}
                                    helperText={errors.github_url?.message}
                                />
                            )}
                        />
                        <Controller
                            name="demo_video_url"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    sx={{ flex: 1, minWidth: '300px' }}
                                    label="Demo Video URL (YouTube/Vimeo)"
                                    margin="normal"
                                    error={!!errors.demo_video_url}
                                    helperText={errors.demo_video_url?.message}
                                />
                            )}
                        />
                    </Box>

                    <Controller
                        name="pitch_deck_url"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                fullWidth
                                label="Pitch Deck / Presentation URL"
                                margin="normal"
                                error={!!errors.pitch_deck_url}
                                helperText={errors.pitch_deck_url?.message}
                            />
                        )}
                    />

                    <Controller
                        name="tech_stack"
                        control={control}
                        render={({ field }) => (
                            <Autocomplete
                                {...field}
                                multiple
                                id="tech-stack-tags"
                                options={['React', 'Next.js', 'Node.js', 'Python', 'FastAPI', 'Supabase', 'TypeScript', 'Tailwind CSS', 'PostgreSQL', 'AI/ML', 'Web3', 'Blockchain']}
                                freeSolo
                                onChange={(_, newValue) => field.onChange(newValue)}
                                renderTags={(value: string[], getTagProps) =>
                                    value.map((option: string, index: number) => (
                                        <Chip variant="outlined" label={option} {...getTagProps({ index })} key={option} />
                                    ))
                                }
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        variant="outlined"
                                        label="Tech Stack"
                                        placeholder="Press Enter to add"
                                        margin="normal"
                                        error={!!errors.tech_stack}
                                        helperText={errors.tech_stack?.message || "Select or type and press Enter"}
                                    />
                                )}
                            />
                        )}
                    />

                    <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        <Button onClick={() => navigate(-1)}>Cancel</Button>
                        <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            disabled={submitMutation.isPending}
                        >
                            {submitMutation.isPending ? 'Submitting...' : 'Submit Project'}
                        </Button>
                    </Box>
                </form>
            </Paper>
        </PageContainer>
    )
}
