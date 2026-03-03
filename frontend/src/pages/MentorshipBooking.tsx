
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Typography, Box, Paper, Grid, Card, CardContent,
    Button, Avatar, Chip, CircularProgress,
    List, ListItem, ListItemText, ListItemAvatar,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Alert,
} from '@mui/material'
import { School, Event as EventIcon, VideoCall, Message } from '@mui/icons-material'
import { techApi, teamsApi } from '../services/api'
import { useAuthStore } from '../store'
import { PageContainer } from '../components/layout_components'
import { Mentor, MentorshipSlot } from '../types'

export default function MentorshipBooking() {
    const { eventId } = useParams<{ eventId: string }>()
    const queryClient = useQueryClient()
    const { user } = useAuthStore()
    const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null)
    const [bookingSlot, setBookingSlot] = useState<MentorshipSlot | null>(null)
    const [notes, setNotes] = useState('')
    const [error, setError] = useState<string | null>(null)

    const { data: mentors, isLoading: mentorsLoading } = useQuery({
        queryKey: ['mentors', eventId],
        queryFn: () => techApi.listMentors(eventId!),
        enabled: !!eventId,
    })

    const { data: teams } = useQuery({
        queryKey: ['teams', eventId],
        queryFn: () => teamsApi.listByEvent(eventId!),
        enabled: !!eventId,
    })

    const myTeam = teams?.find(t => t.captain_id === user?.id)

    const { data: slots, isLoading: slotsLoading } = useQuery({
        queryKey: ['slots', selectedMentor?.id],
        queryFn: () => techApi.listMentorSlots(selectedMentor!.id),
        enabled: !!selectedMentor,
    })

    const bookMutation = useMutation({
        mutationFn: (data: { slot_id: string; team_id: string; notes?: string }) =>
            techApi.bookMentorship(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['slots', selectedMentor?.id] })
            setBookingSlot(null)
            setNotes('')
            setSelectedMentor(null)
        },
        onError: (err: any) => setError(err.message || 'Failed to book slot')
    })

    if (mentorsLoading) {
        return (
            <PageContainer>
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
                    <CircularProgress />
                </Box>
            </PageContainer>
        )
    }

    return (
        <PageContainer title="Mentorship Booking">
            <Typography variant="body1" color="text.secondary" paragraph>
                Expert guidance is just a click away. Book a 1:1 session with a mentor to refine your project.
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

            {!myTeam && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    Only team captains can book mentorship slots.
                </Alert>
            )}

            <Grid container spacing={4}>
                <Grid item xs={12} md={selectedMentor ? 5 : 12}>
                    <Typography variant="h6" gutterBottom>Available Mentors</Typography>
                    <Grid container spacing={2}>
                        {mentors?.map(mentor => (
                            <Grid item xs={12} sm={selectedMentor ? 12 : 6} md={selectedMentor ? 12 : 4} key={mentor.id}>
                                <Card
                                    sx={{
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s, box-shadow 0.2s',
                                        '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                                        border: selectedMentor?.id === mentor.id ? `2px solid` : 'none',
                                        borderColor: 'primary.main'
                                    }}
                                    onClick={() => setSelectedMentor(mentor)}
                                >
                                    <CardContent>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                            <Avatar sx={{ bgcolor: 'secondary.main' }}>
                                                <School />
                                            </Avatar>
                                            <Box>
                                                <Typography variant="subtitle1">User {mentor.user_id.substring(0, 8)}</Typography>
                                                <Typography variant="caption" color="text.secondary">Expert Mentor</Typography>
                                            </Box>
                                        </Box>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                                            {mentor.expertise_areas.map(area => (
                                                <Chip key={area} label={area} size="small" variant="outlined" />
                                            ))}
                                        </Box>
                                        <Typography variant="body2" color="text.secondary" noWrap>
                                            {mentor.bio || 'Click to view available slots for guidance.'}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Grid>

                {selectedMentor && (
                    <Grid item xs={12} md={7}>
                        <Paper sx={{ p: 3, position: 'sticky', top: 24 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6">Available Slots</Typography>
                                <Button size="small" onClick={() => setSelectedMentor(null)}>Close</Button>
                            </Box>

                            {slotsLoading ? (
                                <CircularProgress size={24} />
                            ) : (
                                <List>
                                    {slots?.filter(s => !s.is_booked).map(slot => (
                                        <ListItem
                                            key={slot.id}
                                            sx={{
                                                mb: 1,
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                borderRadius: 1,
                                                '&:hover': { bgcolor: 'action.hover' }
                                            }}
                                        >
                                            <ListItemAvatar>
                                                <Avatar sx={{ bgcolor: 'primary.light' }}>
                                                    <EventIcon />
                                                </Avatar>
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary={new Date(slot.start_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                secondary={`${new Date(slot.start_time).toLocaleTimeString([], { timeStyle: 'short' })} - ${new Date(slot.end_time).toLocaleTimeString([], { timeStyle: 'short' })}`}
                                            />
                                            <Button
                                                variant="contained"
                                                size="small"
                                                disabled={!myTeam}
                                                onClick={() => setBookingSlot(slot)}
                                            >
                                                Book Session
                                            </Button>
                                        </ListItem>
                                    ))}
                                    {slots?.filter(s => !s.is_booked).length === 0 && (
                                        <Typography color="text.secondary">No more slots available for this mentor.</Typography>
                                    )}
                                </List>
                            )}
                        </Paper>
                    </Grid>
                )}
            </Grid>

            {/* Booking Dialog */}
            <Dialog open={!!bookingSlot} onClose={() => setBookingSlot(null)}>
                <DialogTitle>Confirm Mentorship Session</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" gutterBottom>
                        You are booking a session for <strong>{bookingSlot && new Date(bookingSlot.start_time).toLocaleString()}</strong>.
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, mb: 1 }}>
                        <VideoCall color="action" />
                        <Typography variant="body2">Meeting Link: {bookingSlot?.meeting_link || 'To be shared upon booking'}</Typography>
                    </Box>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="What do you need help with?"
                        placeholder="Share your tech stack or specific problems..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        sx={{ mt: 2 }}
                        InputProps={{
                            startAdornment: <Message sx={{ mr: 1, color: 'action.active' }} />
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setBookingSlot(null)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={() => bookMutation.mutate({
                            slot_id: bookingSlot!.id,
                            team_id: myTeam!.id,
                            notes
                        })}
                        disabled={bookMutation.isPending}
                    >
                        {bookMutation.isPending ? 'Booking...' : 'Confirm Booking'}
                    </Button>
                </DialogActions>
            </Dialog>
        </PageContainer>
    )
}
