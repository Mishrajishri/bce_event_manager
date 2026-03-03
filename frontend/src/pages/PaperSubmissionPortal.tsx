import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Typography, Box, Paper, Grid, TextField,
    Button, Divider, CircularProgress, Chip,
    List, ListItem, ListItemText
} from '@mui/material'
import { academicApi } from '../services/api'
import { useAuthStore } from '../store'
import { PageContainer } from '../components/layout_components'

export default function PaperSubmissionPortal() {
    const { eventId } = useParams<{ eventId: string }>()
    const queryClient = useQueryClient()
    const { user } = useAuthStore()

    const [submissionData, setSubmissionData] = useState({
        title: '',
        abstract: '',
        file_url: ''
    })

    const { data: submissions, isLoading } = useQuery({
        queryKey: ['submissions', eventId],
        queryFn: () => academicApi.listSubmissions(eventId!),
        enabled: !!eventId,
    })

    const submitMutation = useMutation({
        mutationFn: (data: any) => academicApi.submitPaper(eventId!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['submissions', eventId] })
            setSubmissionData({ title: '', abstract: '', file_url: '' })
            alert('Paper submitted successfully!')
        }
    })

    if (isLoading) return <CircularProgress />

    return (
        <PageContainer title="Academic Submission Portal">
            <Grid container spacing={4}>
                {/* Submit Form */}
                <Grid item xs={12} md={5}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>Submit Your Research</Typography>
                        <Divider sx={{ mb: 3 }} />

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField
                                label="Paper Title"
                                fullWidth
                                value={submissionData.title}
                                onChange={(e) => setSubmissionData({ ...submissionData, title: e.target.value })}
                            />
                            <TextField
                                label="Abstract"
                                fullWidth
                                multiline
                                rows={6}
                                value={submissionData.abstract}
                                onChange={(e) => setSubmissionData({ ...submissionData, abstract: e.target.value })}
                            />
                            <TextField
                                label="PDF / Drive URL"
                                fullWidth
                                placeholder="https://drive.google.com/..."
                                value={submissionData.file_url}
                                onChange={(e) => setSubmissionData({ ...submissionData, file_url: e.target.value })}
                            />
                            <Button
                                variant="contained"
                                color="primary"
                                size="large"
                                onClick={() => submitMutation.mutate(submissionData)}
                                disabled={!submissionData.title || submitMutation.isPending}
                            >
                                Submit Paper
                            </Button>
                        </Box>
                    </Paper>
                </Grid>

                {/* Status View */}
                <Grid item xs={12} md={7}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>My Submissions</Typography>
                        <Divider sx={{ mb: 2 }} />

                        <List>
                            {submissions?.filter((s: any) => s.author_id === user?.id).map((sub: any) => (
                                <ListItem key={sub.id} divider>
                                    <ListItemText
                                        primary={sub.title}
                                        secondary={
                                            <Box sx={{ mt: 1 }}>
                                                <Chip label={sub.status.toUpperCase()} size="small" color={
                                                    sub.status === 'accepted' ? 'success' :
                                                        sub.status === 'rejected' ? 'error' : 'warning'
                                                } />
                                                <Typography variant="caption" sx={{ ml: 2 }}>
                                                    Submitted: {new Date(sub.submission_date).toLocaleDateString()}
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                    {sub.file_url && (
                                        <Button size="small" onClick={() => window.open(sub.file_url, '_blank')}>
                                            View PDF
                                        </Button>
                                    )}
                                </ListItem>
                            ))}
                            {submissions?.filter(s => s.author_id === user?.id).length === 0 && (
                                <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                                    You haven't submitted any papers yet.
                                </Typography>
                            )}
                        </List>
                    </Paper>
                </Grid>
            </Grid>
        </PageContainer>
    )
}
