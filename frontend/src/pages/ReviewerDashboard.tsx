
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Typography, Box, Paper, Grid,
    Button, Chip, CircularProgress,
    Divider, TextField, Slider, List, ListItem, ListItemText
} from '@mui/material'
import { RateReview, Assignment } from '@mui/icons-material'
import { academicApi } from '../services/api'
import { useAuthStore, isOrganizer } from '../store'
import { PageContainer } from '../components/layout_components'

export default function ReviewerDashboard() {
    const { eventId } = useParams<{ eventId: string }>()
    const queryClient = useQueryClient()
    const { user } = useAuthStore()

    const [selectedSubmission, setSelectedSubmission] = useState<any>(null)
    const [reviewData, setReviewData] = useState({ score: 70, comments: '' })

    const { data: submissions, isLoading } = useQuery({
        queryKey: ['submissions', eventId],
        queryFn: () => academicApi.listSubmissions(eventId!),
        enabled: !!eventId,
    })

    const reviewMutation = useMutation({
        mutationFn: (data: any) => academicApi.reviewPaper(eventId!, selectedSubmission.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['submissions', eventId] })
            setSelectedSubmission(null)
            setReviewData({ score: 70, comments: '' })
            alert('Review submitted successfully!')
        }
    })

    const statusMutation = useMutation({
        mutationFn: (status: string) => academicApi.updateStatus(eventId!, selectedSubmission.id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['submissions', eventId] })
        }
    })

    if (isLoading) return <CircularProgress />

    return (
        <PageContainer title="Reviewer Dashboard">
            <Grid container spacing={4}>
                {/* Submissions List */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>Submissions</Typography>
                        <Divider sx={{ mb: 2 }} />
                        <List>
                            {submissions?.map((sub) => (
                                <ListItem
                                    key={sub.id}
                                    button
                                    selected={selectedSubmission?.id === sub.id}
                                    onClick={() => setSelectedSubmission(sub)}
                                    sx={{ borderRadius: 1, mb: 1 }}
                                >
                                    <ListItemText
                                        primary={sub.title}
                                        secondary={`Status: ${sub.status}`}
                                        primaryTypographyProps={{ noWrap: true }}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                </Grid>

                {/* Review Panel */}
                <Grid item xs={12} md={8}>
                    {selectedSubmission ? (
                        <Paper sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                <Typography variant="h5">{selectedSubmission.title}</Typography>
                                <Chip label={selectedSubmission.status} />
                            </Box>

                            <Typography variant="subtitle2" color="text.secondary">Abstract:</Typography>
                            <Typography variant="body1" sx={{ mb: 3 }}>{selectedSubmission.abstract}</Typography>

                            {selectedSubmission.file_url && (
                                <Button
                                    variant="outlined"
                                    sx={{ mb: 4 }}
                                    onClick={() => window.open(selectedSubmission.file_url, '_blank')}
                                >
                                    Open Paper PDF
                                </Button>
                            )}

                            <Divider sx={{ mb: 4 }} />

                            <Typography variant="h6" gutterBottom>Grading & Feedback</Typography>

                            <Box sx={{ px: 2, mb: 4 }}>
                                <Typography gutterBottom>Score: {reviewData.score}%</Typography>
                                <Slider
                                    value={reviewData.score}
                                    onChange={(_, val) => setReviewData({ ...reviewData, score: val as number })}
                                    valueLabelDisplay="auto"
                                    step={1}
                                    marks
                                    min={0}
                                    max={100}
                                />
                            </Box>

                            <TextField
                                label="Reviewer Comments"
                                fullWidth
                                multiline
                                rows={4}
                                value={reviewData.comments}
                                onChange={(e) => setReviewData({ ...reviewData, comments: e.target.value })}
                                sx={{ mb: 3 }}
                            />

                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Button
                                    variant="contained"
                                    startIcon={<RateReview />}
                                    onClick={() => reviewMutation.mutate(reviewData)}
                                    disabled={reviewMutation.isPending}
                                >
                                    Submit Review
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="success"
                                    onClick={() => statusMutation.mutate('accepted')}
                                >
                                    Accept
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="error"
                                    onClick={() => statusMutation.mutate('rejected')}
                                >
                                    Reject
                                </Button>
                            </Box>
                        </Paper>
                    ) : (
                        <Paper sx={{ p: 10, textAlign: 'center' }}>
                            <Assignment sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                            <Typography color="text.secondary">Select a submission to begin reviewing.</Typography>
                        </Paper>
                    )}
                </Grid>
            </Grid>
        </PageContainer>
    )
}
