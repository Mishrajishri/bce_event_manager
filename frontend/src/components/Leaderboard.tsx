import { useEffect, useState } from 'react'
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    CircularProgress,
    Alert,
} from '@mui/material'
import { EmojiEvents, SportsSoccer } from '@mui/icons-material'
import { supabase } from '../services/supabase'
import type { Match, Team } from '../types'

interface LeaderboardEntry {
    team: Team
    wins: number
    losses: number
    draws: number
    points: number
    goalsFor: number
    goalsAgainst: number
}

interface LeaderboardProps {
    eventId: string
}

export default function Leaderboard({ eventId }: LeaderboardProps) {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([])
    const [matches, setMatches] = useState<Match[]>([])
    const [loading, setLoading] = useState(true)
    const [liveTag, setLiveTag] = useState(false)

    useEffect(() => {
        // Initial fetch
        fetchData()

        // Subscribe to real-time match updates
        const channel = supabase
            .channel(`matches-${eventId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'matches',
                    filter: `event_id=eq.${eventId}`,
                },
                () => {
                    setLiveTag(true)
                    fetchData()
                    // Flash live indicator
                    setTimeout(() => setLiveTag(false), 3000)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [eventId])

    async function fetchData() {
        try {
            // Fetch teams
            const teamsResp = await supabase
                .from('teams')
                .select('*')
                .eq('event_id', eventId)

            // Fetch matches
            const matchesResp = await supabase
                .from('matches')
                .select('*')
                .eq('event_id', eventId)
                .order('match_date', { ascending: false })

            if (teamsResp.data && matchesResp.data) {
                setMatches(matchesResp.data)
                calculateStandings(teamsResp.data, matchesResp.data)
            }
        } catch (err) {
            console.error('Failed to fetch leaderboard data:', err)
        } finally {
            setLoading(false)
        }
    }

    function calculateStandings(teams: Team[], matchList: Match[]) {
        const standings: Record<string, LeaderboardEntry> = {}

        teams.forEach((team) => {
            standings[team.id] = {
                team,
                wins: 0,
                losses: 0,
                draws: 0,
                points: 0,
                goalsFor: 0,
                goalsAgainst: 0,
            }
        })

        matchList
            .filter((m) => m.status === 'completed')
            .forEach((match) => {
                const team1 = standings[match.team1_id]
                const team2 = standings[match.team2_id]

                if (team1) {
                    team1.goalsFor += match.score_team1
                    team1.goalsAgainst += match.score_team2
                }
                if (team2) {
                    team2.goalsFor += match.score_team2
                    team2.goalsAgainst += match.score_team1
                }

                if (match.score_team1 > match.score_team2) {
                    if (team1) { team1.wins++; team1.points += 3 }
                    if (team2) { team2.losses++ }
                } else if (match.score_team2 > match.score_team1) {
                    if (team2) { team2.wins++; team2.points += 3 }
                    if (team1) { team1.losses++ }
                } else {
                    if (team1) { team1.draws++; team1.points += 1 }
                    if (team2) { team2.draws++; team2.points += 1 }
                }
            })

        const sorted = Object.values(standings).sort(
            (a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)
        )

        setEntries(sorted)
    }

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
            </Box>
        )
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <EmojiEvents color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Live Leaderboard</Typography>
                {liveTag && (
                    <Chip
                        label="🔴 LIVE"
                        size="small"
                        color="error"
                        sx={{ animation: 'pulse 1s infinite', fontWeight: 700 }}
                    />
                )}
            </Box>

            {entries.length === 0 ? (
                <Alert severity="info">No teams registered for this event yet.</Alert>
            ) : (
                <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>#</TableCell>
                                <TableCell>Team</TableCell>
                                <TableCell align="center">W</TableCell>
                                <TableCell align="center">D</TableCell>
                                <TableCell align="center">L</TableCell>
                                <TableCell align="center">GF</TableCell>
                                <TableCell align="center">GA</TableCell>
                                <TableCell align="center">GD</TableCell>
                                <TableCell align="center">
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>PTS</Typography>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {entries.map((entry, idx) => (
                                <TableRow
                                    key={entry.team.id}
                                    sx={{
                                        backgroundColor: idx === 0 ? 'rgba(124,58,237,0.06)' : 'transparent',
                                        '&:hover': { backgroundColor: 'rgba(124,58,237,0.04)' },
                                    }}
                                >
                                    <TableCell>
                                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <SportsSoccer fontSize="small" color="primary" />
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                {entry.team.name}
                                            </Typography>
                                            {entry.team.status === 'winner' && (
                                                <Chip label="Winner" size="small" color="success" />
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center">{entry.wins}</TableCell>
                                    <TableCell align="center">{entry.draws}</TableCell>
                                    <TableCell align="center">{entry.losses}</TableCell>
                                    <TableCell align="center">{entry.goalsFor}</TableCell>
                                    <TableCell align="center">{entry.goalsAgainst}</TableCell>
                                    <TableCell align="center">{entry.goalsFor - entry.goalsAgainst}</TableCell>
                                    <TableCell align="center">
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                            {entry.points}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Recent Matches */}
            {matches.length > 0 && (
                <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Recent Matches</Typography>
                    {matches.slice(0, 5).map((match) => (
                        <Paper key={match.id} sx={{ p: 2, mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: 2 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right', flex: 1 }}>
                                Team 1
                            </Typography>
                            <Chip
                                label={`${match.score_team1} - ${match.score_team2}`}
                                color={match.status === 'in_progress' ? 'error' : 'default'}
                                sx={{ fontWeight: 700, minWidth: 60 }}
                            />
                            <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'left', flex: 1 }}>
                                Team 2
                            </Typography>
                            <Chip label={match.status} size="small" />
                        </Paper>
                    ))}
                </Box>
            )}
        </Box>
    )
}
