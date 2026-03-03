
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Typography, Box, Paper, Grid,
    Button, TextField, Alert, Chip, Divider,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Slider, List, ListItem, ListItemText, CircularProgress,
} from '@mui/material'
import { Gavel, GitHub, VideoLibrary } from '@mui/icons-material'
import { techApi, eventsApi } from '../services/api'
import { PageContainer } from '../components/layout_components'
import { ProjectSubmission, SubmissionScoreCreate } from '../types'

export default function JudgingDashboard() {
    const { eventId } = useParams<{ eventId: string }>()
    const queryClient = useQueryClient()
    const [selectedSub, setSelectedSub] = useState<ProjectSubmission | null>(null)
    const [scores, setScores] = useState<Record<string, number>>({})
    const [comments, setComments] = useState<Record<string, string>>({})
    const [error, setError] = useState<string | null>(null)

    // 1. Fetch Event, Submissions, and Rubrics
    const { data: event } = useQuery({
        queryKey: ['event', eventId],
        queryFn: () => eventsApi.get(eventId!),
        enabled: !!eventId,
    })

    const { data: submissions, isLoading: subsLoading } = useQuery({
        queryKey: ['submissions', eventId],
        queryFn: () => techApi.listSubmissions(eventId!),
        enabled: !!eventId,
    })

    const { data: rubrics, isLoading: rubricsLoading } = useQuery({
        queryKey: ['rubrics', eventId],
        queryFn: () => techApi.listRubrics(eventId!),
        enabled: !!eventId,
    })

    if (subsLoading || rubricsLoading) {
        return (
            <PageContainer>
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
                    <CircularProgress />
                </Box>
            </PageContainer>
        )
    }

    const scoreMutation = useMutation({
        mutationFn: (data: { subId: string; scores: SubmissionScoreCreate[] }) =>
            Promise.all(data.scores.map(s => techApi.submitScore(data.subId, s))),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leaderboard', eventId] })
            setSelectedSub(null)
            setScores({})
            setComments({})
        },
        onError: (err: any) => setError(err.message || 'Failed to submit scores')
    })

    const handleOpenJudging = (sub: ProjectSubmission) => {
        setSelectedSub(sub)
        // Initialize scores with 0
        const initialScores: Record<string, number> = {}
        rubrics?.forEach(r => { initialScores[r.id] = 0 })
        setScores(initialScores)
    }

    const handleScoreChange = (rubricId: string, value: number) => {
        setScores(prev => ({ ...prev, [rubricId]: value }))
    }

    const handleSubmitScores = () => {
        if (!selectedSub || !rubrics) return

        const scorePayload: SubmissionScoreCreate[] = rubrics.map(r => ({
            submission_id: selectedSub.id,
            rubric_id: r.id,
            score: scores[r.id] || 0,
            comments: comments[r.id] || '',
        }))

        scoreMutation.mutate({ subId: selectedSub.id, scores: scorePayload })
    }

    return (
        <PageContainer title={`Judging Dashboard - ${event?.name || 'Loading...'}`}>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Paper sx={{ mb: 3, p: 2 }}>
                        <Typography variant="h6" gutterBottom><Gavel sx={{ verticalAlign: 'middle', mr: 1 }} /> Submissions</Typography>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Project Title</TableCell>
                                        <TableCell>Tech Stack</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Links</TableCell>
                                        <TableCell align="right">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {submissions?.map((sub) => (
                                        <TableRow key={sub.id}>
                                            <TableCell>{sub.title}</TableCell>
                                            <TableCell>
                                                {sub.tech_stack?.map(tech => (
                                                    <Chip key={tech} label={tech} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                                                ))}
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={sub.status} size="small" color={sub.status === 'submitted' ? 'info' : 'success'} />
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                    {sub.github_url && <GitHub fontSize="small" sx={{ cursor: 'pointer' }} onClick={() => window.open(sub.github_url)} />}
                                                    {sub.demo_video_url && <VideoLibrary fontSize="small" sx={{ cursor: 'pointer' }} onClick={() => window.open(sub.demo_video_url)} />}
                                                </Box>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Button variant="outlined" size="small" onClick={() => handleOpenJudging(sub)}>
                                                    Judge
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>
            </Grid>

            {/* Judging Dialog */}
            <Dialog open={!!selectedSub} onClose={() => setSelectedSub(null)} maxWidth="md" fullWidth>
                <DialogTitle>Judging: {selectedSub?.title}</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="subtitle2" gutterBottom>Description</Typography>
                    <Typography variant="body2" paragraph>{selectedSub?.description}</Typography>

                    <Divider sx={{ my: 3 }} />

                    <Typography variant="h6" gutterBottom>Scoring Rubric</Typography>
                    <List>
                        {rubrics?.map((rubric) => (
                            <ListItem key={rubric.id} sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 3 }}>
                                <ListItemText
                                    primary={rubric.criteria_name}
                                    secondary={rubric.description}
                                    primaryTypographyProps={{ variant: 'subtitle1', fontWeight: 'bold' }}
                                />
                                <Box sx={{ width: '100%', mt: 2, px: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="caption">Score: {scores[rubric.id] || 0} / {rubric.max_score}</Typography>
                                        <Typography variant="caption">Weight: {rubric.weight}x</Typography>
                                    </Box>
                                    <Slider
                                        value={scores[rubric.id] || 0}
                                        min={0}
                                        max={rubric.max_score}
                                        step={1}
                                        marks
                                        valueLabelDisplay="auto"
                                        onChange={(_, val) => handleScoreChange(rubric.id, val as number)}
                                    />
                                    <TextField
                                        fullWidth
                                        size="small"
                                        placeholder="Comments for this criterion..."
                                        sx={{ mt: 1 }}
                                        value={comments[rubric.id] || ''}
                                        onChange={(e) => setComments(prev => ({ ...prev, [rubric.id]: e.target.value }))}
                                    />
                                </Box>
                            </ListItem>
                        ))}
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSelectedSub(null)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmitScores}
                        disabled={scoreMutation.isPending}
                    >
                        {scoreMutation.isPending ? 'Saving...' : 'Submit Scores'}
                    </Button>
                </DialogActions>
            </Dialog>

            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </PageContainer>
    )
}
