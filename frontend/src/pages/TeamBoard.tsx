
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Typography, Box, Paper, Grid, Card, CardContent,
    Button, TextField, Alert, Chip, Divider, CircularProgress,
    List, ListItem, ListItemText,
} from '@mui/material'
import { Group, GroupAdd, Person, Search, Check, Close, Mail } from '@mui/icons-material'
import { teamsApi, techApi } from '../services/api'
import { useAuthStore } from '../store'
import { PageContainer } from '../components/layout_components'

export default function TeamBoard() {
    const { eventId } = useParams<{ eventId: string }>()
    const queryClient = useQueryClient()
    const { user } = useAuthStore()
    const [search, setSearch] = useState('')
    const [newTeamName, setNewTeamName] = useState('')
    const [error, setError] = useState<string | null>(null)

    const { data: teams, isLoading } = useQuery({
        queryKey: ['teams', eventId],
        queryFn: () => teamsApi.listByEvent(eventId!),
        enabled: !!eventId,
    })

    if (isLoading) {
        return (
            <PageContainer>
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
                    <CircularProgress />
                </Box>
            </PageContainer>
        )
    }

    const requestJoinMutation = useMutation({
        mutationFn: (teamId: string) => techApi.createTeamRequest({ team_id: teamId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-requests'] })
            setError(null)
        },
        onError: (err: any) => setError(err.message || 'Failed to send request')
    })

    const { data: myRequests } = useQuery({
        queryKey: ['my-requests'],
        queryFn: () => techApi.listMyRequests(),
        enabled: !!user,
    })


    const createTeamMutation = useMutation({
        mutationFn: (data: { name: string }) => teamsApi.create(eventId!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teams', eventId] })
            setNewTeamName('')
        },
        onError: (err: any) => setError(err.message || 'Failed to create team')
    })

    const acceptMutation = useMutation({
        mutationFn: (requestId: string) => techApi.updateTeamRequest(requestId, 'accepted'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teams', eventId] })
            queryClient.invalidateQueries({ queryKey: ['team-requests'] })
        },
        onError: (err: any) => setError(err.message || 'Failed to accept request')
    })

    const declineMutation = useMutation({
        mutationFn: (requestId: string) => techApi.updateTeamRequest(requestId, 'declined'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['team-requests'] })
        },
        onError: (err: any) => setError(err.message || 'Failed to decline request')
    })

    // Get requests for teams the user captains
    const myCaptainedTeam = teams?.find(t => t.captain_id === user?.id)
    const { data: incomingRequests } = useQuery({
        queryKey: ['team-requests', myCaptainedTeam?.id],
        queryFn: () => techApi.listTeamRequests(myCaptainedTeam!.id),
        enabled: !!myCaptainedTeam,
    })

    const filteredTeams = teams?.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase())
    )

    const isUserInAnyTeam = teams?.some((t: any) =>
        t.captain_id === user?.id || t.team_members?.some((m: any) => m.user_id === user?.id)
    )


    return (
        <PageContainer title="Find a Team / Team Board">
            <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 2, mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Search color="action" />
                            <TextField
                                fullWidth
                                variant="standard"
                                placeholder="Search teams..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </Box>
                    </Paper>

                    {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

                    <Grid container spacing={2}>
                        {filteredTeams?.map(team => (
                            <Grid item xs={12} sm={6} key={team.id}>
                                <Card variant="outlined">
                                    <CardContent>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Typography variant="h6">{team.name}</Typography>
                                            <Chip
                                                label={team.status}
                                                size="small"
                                                color={team.status === 'confirmed' ? 'success' : 'default'}
                                            />
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                            <Person fontSize="small" color="action" />
                                            <Typography variant="body2" color="text.secondary">
                                                Captain ID: {team.captain_id?.substring(0, 8)}...
                                            </Typography>
                                        </Box>
                                        <Divider sx={{ my: 1 }} />
                                        <Box>
                                            {(() => {
                                                const myRequest = myRequests?.find((r: any) => r.team_id === team.id)
                                                if (myRequest) {
                                                    return (
                                                        <Chip
                                                            label={`Request ${myRequest.status}`}
                                                            color={myRequest.status === 'accepted' ? 'success' : myRequest.status === 'pending' ? 'warning' : 'error'}
                                                            sx={{ width: '100%' }}
                                                            icon={<Mail />}
                                                        />
                                                    )
                                                }
                                                return (
                                                    <Button
                                                        fullWidth
                                                        startIcon={<GroupAdd />}
                                                        variant="outlined"
                                                        disabled={isUserInAnyTeam || requestJoinMutation.isPending}
                                                        onClick={() => requestJoinMutation.mutate(team.id)}
                                                    >
                                                        {requestJoinMutation.isPending ? 'Sending...' : 'Request to Join'}
                                                    </Button>
                                                )
                                            })()}
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                        {filteredTeams?.length === 0 && (
                            <Box sx={{ p: 4, textAlign: 'center', width: '100%' }}>
                                <Typography color="text.secondary">No teams found matching your search.</Typography>
                            </Box>
                        )}
                    </Grid>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Group /> Create a Team
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            Can't find a team? Create your own and invite others to join!
                        </Typography>
                        <TextField
                            fullWidth
                            label="Team Name"
                            value={newTeamName}
                            onChange={(e) => setNewTeamName(e.target.value)}
                            sx={{ mb: 2 }}
                            disabled={isUserInAnyTeam}
                        />
                        <Button
                            fullWidth
                            variant="contained"
                            onClick={() => createTeamMutation.mutate({ name: newTeamName })}
                            disabled={!newTeamName || isUserInAnyTeam || createTeamMutation.isPending}
                        >
                            Create Team
                        </Button>
                        {isUserInAnyTeam && (
                            <Typography variant="caption" color="info.main" sx={{ mt: 1, display: 'block' }}>
                                You are already a captain of a team in this event.
                            </Typography>
                        )}
                    </Paper>

                    <Paper sx={{ p: 3, mt: 3, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                        <Typography variant="h6" gutterBottom>Find-a-Team Tip</Typography>
                        <Typography variant="body2">
                            Teams with descriptive names and active captains are more likely to get members.
                            Be sure to check your notifications for join requests!
                        </Typography>
                    </Paper>

                    {myCaptainedTeam && incomingRequests && incomingRequests.length > 0 && (
                        <Paper sx={{ p: 3, mt: 3 }}>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Mail /> Pending Requests
                            </Typography>
                            <List>
                                {incomingRequests.filter(r => r.status === 'pending').map(req => (
                                    <ListItem key={req.id} sx={{ px: 0 }}>
                                        <ListItemText
                                            primary={`User ${req.user_id.substring(0, 8)}`}
                                            secondary={req.message || 'No message'}
                                        />
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Button
                                                size="small"
                                                color="success"
                                                variant="outlined"
                                                onClick={() => acceptMutation.mutate(req.id)}
                                                disabled={acceptMutation.isPending}
                                            >
                                                <Check />
                                            </Button>
                                            <Button
                                                size="small"
                                                color="error"
                                                variant="outlined"
                                                onClick={() => declineMutation.mutate(req.id)}
                                                disabled={declineMutation.isPending}
                                            >
                                                <Close />
                                            </Button>
                                        </Box>
                                    </ListItem>
                                ))}
                            </List>
                        </Paper>
                    )}
                </Grid>
            </Grid>
        </PageContainer>
    )
}
