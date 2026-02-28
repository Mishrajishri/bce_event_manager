import { useState } from 'react'
import {
    Box,
    Typography,
    Rating,
    TextField,
    Button,
    Paper,
    Alert,
    Divider,
    Avatar,
    Chip,
} from '@mui/material'
import { Star, SentimentSatisfied } from '@mui/icons-material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { feedbackApi } from '../services/api'
import type { Feedback } from '../types'

interface FeedbackFormProps {
    eventId: string
    eventStatus: string
}

export default function FeedbackForm({ eventId, eventStatus }: FeedbackFormProps) {
    const queryClient = useQueryClient()
    const [rating, setRating] = useState<number | null>(null)
    const [comment, setComment] = useState('')

    const { data: feedbackList } = useQuery({
        queryKey: ['feedback', eventId],
        queryFn: () => feedbackApi.list(eventId),
    })

    const { data: summary } = useQuery({
        queryKey: ['feedback-summary', eventId],
        queryFn: () => feedbackApi.summary(eventId),
    })

    const submitMutation = useMutation({
        mutationFn: () => feedbackApi.create(eventId, { rating: rating!, comment: comment || undefined }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feedback', eventId] })
            queryClient.invalidateQueries({ queryKey: ['feedback-summary', eventId] })
            setRating(null)
            setComment('')
        },
    })

    const isCompleted = eventStatus === 'completed'

    return (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <SentimentSatisfied color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Feedback & Ratings
                </Typography>
            </Box>

            {/* Summary */}
            {summary && summary.total_feedback > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 2, bgcolor: 'rgba(124,58,237,0.05)', borderRadius: 2 }}>
                    <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {summary.average_rating}
                    </Typography>
                    <Box>
                        <Rating
                            value={summary.average_rating}
                            precision={0.1}
                            readOnly
                            icon={<Star sx={{ color: '#f59e0b' }} />}
                            emptyIcon={<Star />}
                        />
                        <Typography variant="body2" color="text.secondary">
                            {summary.total_feedback} review{summary.total_feedback !== 1 ? 's' : ''}
                        </Typography>
                    </Box>
                </Box>
            )}

            {/* Submit Form */}
            {isCompleted ? (
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>Rate this event</Typography>
                    <Rating
                        value={rating}
                        onChange={(_, v) => setRating(v)}
                        size="large"
                        icon={<Star sx={{ color: '#f59e0b' }} fontSize="inherit" />}
                        emptyIcon={<Star fontSize="inherit" />}
                    />
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="Share your experience (optional)"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        sx={{ mt: 2 }}
                    />
                    {submitMutation.isError && (
                        <Alert severity="error" sx={{ mt: 1 }}>
                            {(submitMutation.error as Error)?.message || 'Failed to submit feedback'}
                        </Alert>
                    )}
                    {submitMutation.isSuccess && (
                        <Alert severity="success" sx={{ mt: 1 }}>Feedback submitted! Thank you.</Alert>
                    )}
                    <Button
                        variant="contained"
                        onClick={() => submitMutation.mutate()}
                        disabled={!rating || submitMutation.isPending}
                        sx={{ mt: 2 }}
                    >
                        {submitMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
                    </Button>
                </Box>
            ) : (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Feedback is available after the event is completed.
                </Alert>
            )}

            {/* Feedback List */}
            {feedbackList && feedbackList.length > 0 && (
                <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" gutterBottom>All Reviews</Typography>
                    {feedbackList.map((fb: Feedback) => (
                        <Box key={fb.id} sx={{ display: 'flex', gap: 2, mb: 2, p: 1.5, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                            <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, fontSize: 14 }}>
                                {fb.user_id.substring(0, 2).toUpperCase()}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Rating value={fb.rating} readOnly size="small" />
                                    <Chip label={`${fb.rating}/5`} size="small" />
                                </Box>
                                {fb.comment && (
                                    <Typography variant="body2" sx={{ mt: 0.5 }}>{fb.comment}</Typography>
                                )}
                                <Typography variant="caption" color="text.secondary">
                                    {new Date(fb.created_at).toLocaleDateString()}
                                </Typography>
                            </Box>
                        </Box>
                    ))}
                </>
            )}
        </Paper>
    )
}
