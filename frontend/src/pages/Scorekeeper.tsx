
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Typography, Box, Paper, Grid, TextField,
    Button, Divider,
    CircularProgress, Alert, MenuItem, Select, FormControl, InputLabel,
    IconButton
} from '@mui/material'
import { Add, Remove, Send } from '@mui/icons-material'
import { matchesApi } from '../services/api'
import { PageContainer } from '../components/layout_components'

export default function Scorekeeper() {
    const { eventId, matchId } = useParams<{ eventId: string, matchId: string }>()
    const queryClient = useQueryClient()

    const [commentaryText, setCommentaryText] = useState('')
    const [commentaryType, setCommentaryType] = useState('general')

    const { data: match, isLoading: matchLoading } = useQuery({
        queryKey: ['match', matchId],
        queryFn: () => matchesApi.get(eventId!, matchId!),
        enabled: !!matchId,
    })

    const updateScoreMutation = useMutation({
        mutationFn: (data: any) =>
            matchesApi.update(eventId!, matchId!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['match', matchId] })
        }
    })

    const addCommentaryMutation = useMutation({
        mutationFn: (data: { content: string, type: string }) =>
            matchesApi.addCommentary(eventId!, matchId!, data),
        onSuccess: () => {
            setCommentaryText('')
            queryClient.invalidateQueries({ queryKey: ['commentary', matchId] })
        }
    })

    if (matchLoading) return <CircularProgress />
    if (!match) return <Alert severity="error">Match not found</Alert>

    const handleScoreChange = (team: 1 | 2, delta: number) => {
        const newScore = team === 1
            ? Math.max(0, match.score_team1 + delta)
            : Math.max(0, match.score_team2 + delta)

        updateScoreMutation.mutate({
            [team === 1 ? 'score_team1' : 'score_team2']: newScore
        })
    }

    return (
        <PageContainer title="Match Scorekeeper">
            <Grid container spacing={4}>
                {/* Score Controls */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>Live Scores</Typography>
                        <Divider sx={{ mb: 3 }} />

                        <Grid container spacing={3} alignItems="center">
                            <Grid item xs={5} textAlign="center">
                                <Typography variant="subtitle1" fontWeight="bold">Team 1</Typography>
                                <Typography variant="h2">{match.score_team1}</Typography>
                                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 1 }}>
                                    <IconButton size="small" onClick={() => handleScoreChange(1, -1)} disabled={updateScoreMutation.isPending}>
                                        <Remove />
                                    </IconButton>
                                    <IconButton size="small" color="primary" onClick={() => handleScoreChange(1, 1)} disabled={updateScoreMutation.isPending}>
                                        <Add />
                                    </IconButton>
                                </Box>
                            </Grid>

                            <Grid item xs={2} textAlign="center">
                                <Typography variant="h4">VS</Typography>
                            </Grid>

                            <Grid item xs={5} textAlign="center">
                                <Typography variant="subtitle1" fontWeight="bold">Team 2</Typography>
                                <Typography variant="h2">{match.score_team2}</Typography>
                                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 1 }}>
                                    <IconButton size="small" onClick={() => handleScoreChange(2, -1)} disabled={updateScoreMutation.isPending}>
                                        <Remove />
                                    </IconButton>
                                    <IconButton size="small" color="primary" onClick={() => handleScoreChange(2, 1)} disabled={updateScoreMutation.isPending}>
                                        <Add />
                                    </IconButton>
                                </Box>
                            </Grid>
                        </Grid>

                        <Box sx={{ mt: 4 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Match Status</InputLabel>
                                <Select
                                    value={match.status}
                                    label="Match Status"
                                    onChange={(e) => updateScoreMutation.mutate({ status: e.target.value as any })}
                                >
                                    <MenuItem value="scheduled">Scheduled</MenuItem>
                                    <MenuItem value="ongoing">Ongoing</MenuItem>
                                    <MenuItem value="completed">Completed</MenuItem>
                                    <MenuItem value="cancelled">Cancelled</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                    </Paper>
                </Grid>

                {/* Commentary Controls */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>Add Commentary</Typography>
                        <Divider sx={{ mb: 2 }} />

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Event Type</InputLabel>
                                <Select
                                    value={commentaryType}
                                    label="Event Type"
                                    onChange={(e) => setCommentaryType(e.target.value)}
                                >
                                    <MenuItem value="general">General Update</MenuItem>
                                    <MenuItem value="goal">Goal / Point</MenuItem>
                                    <MenuItem value="foul">Foul / Card</MenuItem>
                                    <MenuItem value="substitution">Substitution</MenuItem>
                                    <MenuItem value="period_start">Period Start</MenuItem>
                                    <MenuItem value="period_end">Period End</MenuItem>
                                </Select>
                            </FormControl>

                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                placeholder="Details: 'Rahul scores a brilliant header!'"
                                value={commentaryText}
                                onChange={(e) => setCommentaryText(e.target.value)}
                            />

                            <Button
                                variant="contained"
                                endIcon={<Send />}
                                onClick={() => addCommentaryMutation.mutate({ content: commentaryText, type: commentaryType })}
                                disabled={!commentaryText || addCommentaryMutation.isPending}
                            >
                                Post Update
                            </Button>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </PageContainer>
    )
}
