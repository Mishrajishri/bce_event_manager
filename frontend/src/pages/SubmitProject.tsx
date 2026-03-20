
import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
    Typography, Box, Paper, TextField, Button, Alert,
    Autocomplete, Chip, CircularProgress, Dialog,
    DialogTitle, DialogContent, DialogActions, IconButton,
    Divider, List, ListItem, ListItemText, ListItemIcon,
} from '@mui/material'
import {
    GitHub, VideoLibrary, PictureAsPdf, Link as LinkIcon,
    Preview, Close, Schedule
} from '@mui/icons-material'
import { techApi, eventsApi, teamsApi } from '../services/api'
import { useAuthStore } from '../store'
import { PageContainer } from '../components/layout_components'

const submissionSchema = z.object({
    title: z.string().min(5, 'Title must be at least 5 characters'),
    description: z.string().min(20, 'Please provide a more detailed description'),
    github_url: z.string().url('Invalid GitHub URL').optional().or(z.literal('')),
    demo_video_url: z.string().url('Invalid Demo Video URL').optional().or(z.literal('')),
    pitch_deck_url: z.string().url('Invalid Pitch Deck URL').optional().or(z.literal('')),
    additional_links: z.array(z.object({
        title: z.string().min(1, 'Link title is required'),
        url: z.string().url('Invalid URL'),
    })).optional(),
    tech_stack: z.array(z.string()).min(1, 'Please add at least one technology'),
})

type SubmissionForm = z.infer<typeof submissionSchema>

export default function SubmitProject() {
    const { eventId } = useParams<{ eventId: string }>()
    const navigate = useNavigate()
    const { user } = useAuthStore()
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [previewOpen, setPreviewOpen] = useState(false)
    const [additionalLinks, setAdditionalLinks] = useState<{ title: string; url: string }[]>([])
    const [newLinkTitle, setNewLinkTitle] = useState('')
    const [newLinkUrl, setNewLinkUrl] = useState('')
    const [linkError, setLinkError] = useState<string | null>(null)

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

        // Submit without additional_links since it's not in the API type yet
        // The links are stored locally for preview only
        const { additional_links: _, ...submitData } = data
        submitMutation.mutate({
            ...submitData,
            event_id: eventId!,
            team_id: myTeam.id,
        })
    }

    // Deadline countdown calculation - use registration_deadline
    const deadlineInfo = useMemo(() => {
        const deadlineStr = event?.registration_deadline as string | undefined
        if (!deadlineStr) return null
        const deadline = new Date(deadlineStr)
        const now = new Date()
        const diff = deadline.getTime() - now.getTime()

        if (diff <= 0) return { isOverdue: true, days: 0, hours: 0, minutes: 0 }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

        return { isOverdue: false, days, hours, minutes }
    }, [event?.registration_deadline])

    const handleAddLink = () => {
        if (!newLinkTitle.trim() || !newLinkUrl.trim()) {
            setLinkError('Both title and URL are required')
            return
        }
        try {
            new URL(newLinkUrl)
            setAdditionalLinks([...additionalLinks, { title: newLinkTitle, url: newLinkUrl }])
            setNewLinkTitle('')
            setNewLinkUrl('')
            setLinkError(null)
        } catch {
            setLinkError('Please enter a valid URL')
        }
    }

    const handleRemoveLink = (index: number) => {
        setAdditionalLinks(additionalLinks.filter((_, i) => i !== index))
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
            {/* Deadline Countdown Banner */}
            {deadlineInfo && (
                <Alert
                    severity={deadlineInfo.isOverdue ? 'error' : deadlineInfo.days < 1 ? 'warning' : 'info'}
                    icon={deadlineInfo.isOverdue ? <Close /> : <Schedule />}
                    sx={{ mb: 3 }}
                >
                    {deadlineInfo.isOverdue ? (
                        <Typography variant="body2">
                            <strong>Submission deadline has passed!</strong> Late submissions may not be accepted.
                        </Typography>
                    ) : (
                        <Typography variant="body2">
                            <strong>Time remaining to submit:</strong> {deadlineInfo.days}d {deadlineInfo.hours}h {deadlineInfo.minutes}m
                        </Typography>
                    )}
                </Alert>
            )}

            <Paper sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" gutterBottom>Project Details for Team: {myTeam.name}</Typography>
                    <Button
                        startIcon={<Preview />}
                        onClick={() => setPreviewOpen(true)}
                        variant="outlined"
                    >
                        Preview
                    </Button>
                </Box>

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

                    {/* Additional Links Section */}
                    <Box sx={{ mt: 3, mb: 2 }}>
                        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                            Additional Links
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Add any other relevant links (documentation, live demo, etc.)
                        </Typography>

                        {additionalLinks.map((link, index) => (
                            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <LinkIcon color="action" fontSize="small" />
                                <Typography variant="body2" sx={{ flex: 1 }}>
                                    <strong>{link.title}:</strong> {link.url}
                                </Typography>
                                <Button size="small" color="error" onClick={() => handleRemoveLink(index)}>
                                    Remove
                                </Button>
                            </Box>
                        ))}

                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <TextField
                                size="small"
                                placeholder="Link Title"
                                value={newLinkTitle}
                                onChange={(e) => setNewLinkTitle(e.target.value)}
                                sx={{ flex: 1 }}
                            />
                            <TextField
                                size="small"
                                placeholder="URL (https://...)"
                                value={newLinkUrl}
                                onChange={(e) => setNewLinkUrl(e.target.value)}
                                error={!!linkError}
                                helperText={linkError}
                                sx={{ flex: 2 }}
                            />
                            <Button variant="outlined" onClick={handleAddLink} disabled={!newLinkTitle || !newLinkUrl}>
                                Add
                            </Button>
                        </Box>
                    </Box>

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

            {/* Preview Dialog */}
            <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6">Project Submission Preview</Typography>
                        <IconButton onClick={() => setPreviewOpen(false)}>
                            <Close />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ p: 2 }}>
                        <Controller
                            name="title"
                            control={control}
                            render={({ field }) => (
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="overline" color="text.secondary">Project Title</Typography>
                                    <Typography variant="h5">{field.value || 'Untitled Project'}</Typography>
                                </Box>
                            )}
                        />

                        <Controller
                            name="description"
                            control={control}
                            render={({ field }) => (
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="overline" color="text.secondary">Description</Typography>
                                    <Typography>{field.value || 'No description provided'}</Typography>
                                </Box>
                            )}
                        />

                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>Project Links</Typography>

                        <List dense>
                            <Controller
                                name="github_url"
                                control={control}
                                render={({ field }) => (
                                    <>
                                        {field.value ? (
                                            <ListItem>
                                                <ListItemIcon><GitHub /></ListItemIcon>
                                                <ListItemText primary="GitHub Repository" secondary={field.value} />
                                            </ListItem>
                                        ) : null}
                                    </>
                                )}
                            />
                            <Controller
                                name="demo_video_url"
                                control={control}
                                render={({ field }) => (
                                    <>
                                        {field.value ? (
                                            <ListItem>
                                                <ListItemIcon><VideoLibrary /></ListItemIcon>
                                                <ListItemText primary="Demo Video" secondary={field.value} />
                                            </ListItem>
                                        ) : null}
                                    </>
                                )}
                            />
                            <Controller
                                name="pitch_deck_url"
                                control={control}
                                render={({ field }) => (
                                    <>
                                        {field.value ? (
                                            <ListItem>
                                                <ListItemIcon><PictureAsPdf /></ListItemIcon>
                                                <ListItemText primary="Pitch Deck" secondary={field.value} />
                                            </ListItem>
                                        ) : null}
                                    </>
                                )}
                            />
                            {additionalLinks.map((link, index) => (
                                <ListItem key={index}>
                                    <ListItemIcon><LinkIcon /></ListItemIcon>
                                    <ListItemText primary={link.title} secondary={link.url} />
                                </ListItem>
                            ))}
                        </List>

                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>Tech Stack</Typography>
                        <Controller
                            name="tech_stack"
                            control={control}
                            render={({ field }) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {field.value?.length > 0 ? (
                                        field.value.map((tech: string) => (
                                            <Chip key={tech} label={tech} color="primary" variant="outlined" />
                                        ))
                                    ) : (
                                        <Typography color="text.secondary">No tech stack added</Typography>
                                    )}
                                </Box>
                            )}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPreviewOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </PageContainer>
    )
}
