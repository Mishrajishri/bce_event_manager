
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
    Typography, Box, Paper, Grid, Card, CardContent,
    Chip, Divider, List, ListItem, ListItemText,
    CircularProgress, Alert
} from '@mui/material'
import { History, Notes } from '@mui/icons-material'
import { matchesApi } from '../services/api'
import { useSocket } from '../hooks/useSocket'
import { PageContainer } from '../components/layout_components'

export default function LiveScoreboard() {
    const { eventId, matchId } = useParams<{ eventId: string, matchId: string }>()

    // Connect to real-time updates
    useSocket(matchId)

    const { data: match, isLoading: matchLoading } = useQuery({
        queryKey: ['match', matchId],
        queryFn: () => matchesApi.get(eventId!, matchId!),
        enabled: !!matchId,
    })

    const { data: commentary } = useQuery({
        queryKey: ['commentary', matchId],
        queryFn: () => matchesApi.listCommentary(eventId!, matchId!),
        enabled: !!matchId,
    })

    if (matchLoading) return <CircularProgress />

    if (!match) return <Alert severity="error">Match not found</Alert>

    return (
        <PageContainer title="Live Match Center">
            <Box sx={{ mb: 4 }}>
                <Paper sx={{ p: 4, textAlign: 'center', background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', color: 'white' }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={5}>
                            <Typography variant="h4" fontWeight="bold">Team 1</Typography>
                            <Typography variant="caption">Team ID: {match.team1_id.substring(0, 8)}</Typography>
                        </Grid>
                        <Grid item xs={2}>
                            <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', py: 2, borderRadius: 2 }}>
                                <Typography variant="h2" fontWeight="bold">{match.score_team1} - {match.score_team2}</Typography>
                                <Chip label={match.status.toUpperCase()} color="secondary" size="small" sx={{ mt: 1 }} />
                            </Box>
                        </Grid>
                        <Grid item xs={5}>
                            <Typography variant="h4" fontWeight="bold">Team 2</Typography>
                            <Typography variant="caption">Team ID: {match.team2_id.substring(0, 8)}</Typography>
                        </Grid>
                    </Grid>
                </Paper>
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Notes /> Live Commentary
                    </Typography>
                    <Paper sx={{ p: 0 }}>
                        <List sx={{ maxHeight: 500, overflow: 'auto' }}>
                            {commentary?.map((item: any) => (
                                <ListItem key={item.id}>
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography variant="subtitle2" color={item.type === 'goal' ? 'success.main' : 'text.primary'}>
                                                    {item.content}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {new Date(item.created_at).toLocaleTimeString([], { timeStyle: 'short' })}
                                                </Typography>
                                            </Box>
                                        }
                                        secondary={item.type !== 'general' && <Chip label={item.type} size="small" variant="outlined" sx={{ mt: 0.5 }} />}
                                    />
                                </ListItem>
                            ))}
                            {commentary?.length === 0 && (
                                <ListItem>
                                    <ListItemText primary="No commentary updates yet." secondary="Stay tuned for live updates!" />
                                </ListItem>
                            )}
                        </List>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <History /> Match Stats
                    </Typography>
                    <Card>
                        <CardContent>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                Track detailed statistics like possession, shots, and fouls in real-time.
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2">Venue</Typography>
                                <Typography variant="body2" fontWeight="medium">{match.venue || 'TBA'}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2">Round</Typography>
                                <Typography variant="body2" fontWeight="medium">Round {match.round || 1}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </PageContainer>
    )
}
