import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
    Typography, Box, Paper, Grid, Card, CardContent,
    Button, Chip, CircularProgress
} from '@mui/material'
import { Visibility, Edit, AutoGraph } from '@mui/icons-material'
import { matchesApi } from '../services/api'
import { useAuthStore, isOrganizer } from '../store'
import { PageContainer } from '../components/layout_components'

export default function MatchList() {
    const { eventId } = useParams<{ eventId: string }>()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { user } = useAuthStore()
    const canManage = isOrganizer(user)
    const [bracketType, setBracketType] = useState<'knockout' | 'round_robin'>('knockout')

    const { data: matches, isLoading } = useQuery({
        queryKey: ['matches', eventId],
        queryFn: () => matchesApi.listByEvent(eventId!),
        enabled: !!eventId,
    })

    const generateMutation = useMutation({
        mutationFn: () => matchesApi.generateBrackets(eventId!, bracketType),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matches', eventId] })
            alert('Brackets generated successfully!')
        },
        onError: (err: any) => alert(err.message)
    })

    if (isLoading) return <CircularProgress />

    return (
        <PageContainer title="Tournament Matches">
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="body1" color="text.secondary">
                    View upcoming and live matches for this event.
                </Typography>

                {canManage && (
                    <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <Typography variant="subtitle2">Admin Tools:</Typography>
                        <Chip
                            label="Knockout"
                            onClick={() => setBracketType('knockout')}
                            color={bracketType === 'knockout' ? 'primary' : 'default'}
                            variant={bracketType === 'knockout' ? 'filled' : 'outlined'}
                        />
                        <Chip
                            label="Round Robin"
                            onClick={() => setBracketType('round_robin')}
                            color={bracketType === 'round_robin' ? 'primary' : 'default'}
                            variant={bracketType === 'round_robin' ? 'filled' : 'outlined'}
                        />
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<AutoGraph />}
                            onClick={() => {
                                if (confirm('Generating new brackets will delete ALL existing matches for this event. Continue?')) {
                                    generateMutation.mutate()
                                }
                            }}
                            disabled={generateMutation.isPending}
                        >
                            Generate Brackets
                        </Button>
                    </Paper>
                )}
            </Box>

            <Grid container spacing={3}>
                {matches?.map((match) => (
                    <Grid item xs={12} key={match.id}>
                        <Card sx={{
                            borderLeft: match.status === 'in_progress' ? '6px solid #3b82f6' : 'none',
                            transition: 'all 0.2s',
                            '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' }
                        }}>
                            <CardContent>
                                <Grid container alignItems="center" spacing={2}>
                                    <Grid item xs={12} sm={3}>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            {new Date(match.match_date).toLocaleDateString()} {new Date(match.match_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Typography>
                                        <Chip
                                            label={match.status.replace('_', ' ').toUpperCase()}
                                            size="small"
                                            color={match.status === 'in_progress' ? 'primary' : 'default'}
                                            sx={{ mt: 1 }}
                                        />
                                    </Grid>

                                    <Grid item xs={5} sm={3} textAlign="right">
                                        <Typography variant="h6" noWrap>{match.team1_id.substring(0, 8)}</Typography>
                                    </Grid>

                                    <Grid item xs={2} sm={2} textAlign="center">
                                        <Box sx={{ bgcolor: 'action.hover', py: 1, px: 2, borderRadius: 1 }}>
                                            <Typography variant="h5" fontWeight="bold">
                                                {match.score_team1} - {match.score_team2}
                                            </Typography>
                                        </Box>
                                    </Grid>

                                    <Grid item xs={5} sm={3} textAlign="left">
                                        <Typography variant="h6" noWrap>{match.team2_id.substring(0, 8)}</Typography>
                                    </Grid>

                                    <Grid item xs={12} sm={1} textAlign="right">
                                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={() => navigate(`/events/${eventId}/matches/${match.id}`)}
                                                startIcon={<Visibility />}
                                            >
                                                View
                                            </Button>
                                            {canManage && (
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    color="secondary"
                                                    onClick={() => navigate(`/events/${eventId}/matches/${match.id}/score`)}
                                                    startIcon={<Edit />}
                                                >
                                                    Score
                                                </Button>
                                            )}
                                        </Box>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}

                {matches?.length === 0 && (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 4, textAlign: 'center' }}>
                            <Typography color="text.secondary">No matches scheduled yet.</Typography>
                        </Paper>
                    </Grid>
                )}
            </Grid>
        </PageContainer>
    )
}
