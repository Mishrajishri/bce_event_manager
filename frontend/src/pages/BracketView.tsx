
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
    Typography, Box, Paper, Grid, Card, CardContent,
    CircularProgress, Alert, Divider
} from '@mui/material'
import { matchesApi } from '../services/api'
import { PageContainer } from '../components/layout_components'

export default function BracketView() {
    const { eventId } = useParams<{ eventId: string }>()

    const { data: bracketData, isLoading } = useQuery({
        queryKey: ['brackets', eventId],
        queryFn: () => matchesApi.getBrackets(eventId!),
        enabled: !!eventId,
    })

    if (isLoading) return <CircularProgress />
    if (!bracketData) return <Alert severity="error">Failed to load bracket data</Alert>

    // Simple visualization of matches group by round or just as a list for now
    // A robust bracket view would use a tree structure.

    return (
        <PageContainer title="Tournament Bracket">
            <Box sx={{ mb: 4 }}>
                <Typography variant="body1" color="text.secondary">
                    Tournament structure for {bracketData.event_id}.
                </Typography>
            </Box>

            <Grid container spacing={4}>
                {bracketData.matches.length > 0 ? (
                    bracketData.matches.map((match: any) => (
                        <Grid item xs={12} md={6} lg={4} key={match.id}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="caption" color="text.secondary">Match ID: {match.id.substring(0, 8)}</Typography>
                                        <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{match.status}</Typography>
                                    </Box>
                                    <Divider sx={{ mb: 1 }} />
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="body1" fontWeight={match.winner_id === match.team1.id ? 'bold' : 'normal'}>
                                            {match.team1.name || 'TBA'}
                                        </Typography>
                                        <Typography variant="h6">{match.score_team1}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                                        <Typography variant="body1" fontWeight={match.winner_id === match.team2.id ? 'bold' : 'normal'}>
                                            {match.team2.name || 'TBA'}
                                        </Typography>
                                        <Typography variant="h6">{match.score_team2}</Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))
                ) : (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 4, textAlign: 'center' }}>
                            <Typography color="text.secondary">Brackets have not been generated yet.</Typography>
                        </Paper>
                    </Grid>
                )}
            </Grid>
        </PageContainer>
    )
}
