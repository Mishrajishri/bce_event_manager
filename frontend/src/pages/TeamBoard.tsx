
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Typography, Box, Paper, Grid, Card, CardContent,
    Button, TextField, Alert, Chip, Divider, CircularProgress,
    List, ListItem, ListItemText, IconButton,
    Accordion, AccordionSummary, AccordionDetails, Stack, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material'
import { Group, GroupAdd, Person, Search, Check, Close, Mail, FilterList, AutoAwesome, ExpandMore, Send, Campaign, Delete } from '@mui/icons-material'
import { teamsApi, techApi, skillsApi } from '../services/api'
import { useAuthStore } from '../store'
import { PageContainer } from '../components/layout_components'

// Email validation helper
const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

export default function TeamBoard() {
    const { eventId } = useParams<{ eventId: string }>()
    const queryClient = useQueryClient()
    const { user } = useAuthStore()
    const [search, setSearch] = useState('')
    const [skillFilter, setSkillFilter] = useState<string[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [newTeamName, setNewTeamName] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteMessage, setInviteMessage] = useState('')
    const [emailError, setEmailError] = useState<string | null>(null)
    const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false)
    const [newAnnouncement, setNewAnnouncement] = useState('')

    const { data: teams, isLoading } = useQuery({
        queryKey: ['teams', eventId],
        queryFn: () => teamsApi.listByEvent(eventId!),
        enabled: !!eventId,
    })

    // Fetch user's skills for matching (for future use)
    useQuery({
        queryKey: ['my-skills'],
        queryFn: () => skillsApi.getMySkills(),
    })

    // Fetch available skills for filtering
    const { data: availableSkills } = useQuery({
        queryKey: ['available-skills'],
        queryFn: () => skillsApi.listAvailableSkills(),
    })

    // Fetch team suggestions based on user skills
    const { data: teamSuggestions } = useQuery({
        queryKey: ['team-suggestions', eventId, skillFilter],
        queryFn: () => skillsApi.findTeammates(eventId!, skillFilter.length > 0 ? skillFilter : undefined),
        enabled: !!eventId && showSuggestions,
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

    // Fetch team invites (for captains)
    const { data: teamInvites } = useQuery({
        queryKey: ['team-invites', myCaptainedTeam?.id],
        queryFn: () => myCaptainedTeam ? skillsApi.getTeamInvites(myCaptainedTeam.id) : Promise.resolve([]),
        enabled: !!myCaptainedTeam,
    })

    // Fetch team announcements (for captains)
    const { data: announcements = [], refetch: refetchAnnouncements } = useQuery({
        queryKey: ['team-announcements', myCaptainedTeam?.id],
        queryFn: () => myCaptainedTeam ? skillsApi.getTeamAnnouncements(myCaptainedTeam.id) : Promise.resolve([]),
        enabled: !!myCaptainedTeam,
    })

    // Fetch team members details
    const { data: teamMembersData } = useQuery({
        queryKey: ['team-members-details', myCaptainedTeam?.id],
        queryFn: () => myCaptainedTeam ? skillsApi.getTeamMembersDetails(myCaptainedTeam.id) : Promise.resolve({ team: null, members: [] }),
        enabled: !!myCaptainedTeam,
    })

    // Invite mutation
    const inviteMutation = useMutation({
        mutationFn: (data: { user_email: string; message?: string }) =>
            myCaptainedTeam ? skillsApi.inviteToTeam(myCaptainedTeam.id, data) : Promise.reject('No team'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['team-invites'] })
            setInviteDialogOpen(false)
            setInviteEmail('')
            setInviteMessage('')
            setEmailError(null)
            setError(null)
        },
        onError: (err: any) => setError(err.message || 'Failed to send invite')
    })

    // Create announcement handler
    const handleCreateAnnouncement = async () => {
        if (!newAnnouncement.trim() || !myCaptainedTeam) return
        try {
            await skillsApi.createTeamAnnouncement(myCaptainedTeam.id, newAnnouncement)
            refetchAnnouncements()
            setNewAnnouncement('')
            setAnnouncementDialogOpen(false)
        } catch (err: any) {
            setError(err.message || 'Failed to post announcement')
        }
    }

    // Delete announcement handler
    const handleDeleteAnnouncement = async (announcementId: string) => {
        if (!myCaptainedTeam) return
        try {
            await skillsApi.deleteTeamAnnouncement(myCaptainedTeam.id, announcementId)
            refetchAnnouncements()
        } catch (err: any) {
            setError(err.message || 'Failed to delete announcement')
        }
    }

    // Apply both search and skill filters
    const filteredTeams = teams?.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase())
        // Skill filtering would require teams to have skills data
        // For now, skill filter shows in UI but search is the main filter
        return matchesSearch
    })

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
                        {/* Skill Filter */}
                        <Accordion sx={{ mt: 1, boxShadow: 'none' }}>
                            <AccordionSummary expandIcon={<ExpandMore />}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <FilterList fontSize="small" />
                                    <Typography variant="body2">Filter by skills</Typography>
                                    {skillFilter.length > 0 && (
                                        <Chip size="small" label={skillFilter.length} color="primary" />
                                    )}
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Stack direction="row" flexWrap="wrap" gap={1}>
                                    {availableSkills?.map((skill: { id?: string; name: string }) => (
                                        <Chip
                                            key={skill.id || skill.name}
                                            label={skill.name}
                                            onClick={() => {
                                                setSkillFilter(prev =>
                                                    prev.includes(skill.name)
                                                        ? prev.filter(s => s !== skill.name)
                                                        : [...prev, skill.name]
                                                )
                                            }}
                                            color={skillFilter.includes(skill.name) ? 'primary' : 'default'}
                                            variant={skillFilter.includes(skill.name) ? 'filled' : 'outlined'}
                                        />
                                    ))}
                                </Stack>
                            </AccordionDetails>
                        </Accordion>
                    </Paper>

                    {/* Smart Suggestions Toggle */}
                    <Box sx={{ mb: 3 }}>
                        <Button
                            variant="outlined"
                            startIcon={<AutoAwesome />}
                            onClick={() => setShowSuggestions(!showSuggestions)}
                            fullWidth
                            color={showSuggestions ? 'secondary' : 'primary'}
                        >
                            {showSuggestions ? 'Hide AI Suggestions' : 'Get Smart Suggestions'}
                        </Button>
                        {showSuggestions && teamSuggestions && teamSuggestions.length > 0 && (
                            <Paper sx={{ p: 2, mt: 2, border: '1px solid', borderColor: 'secondary.main' }}>
                                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <AutoAwesome fontSize="small" /> Recommended Teams Based on Your Skills
                                </Typography>
                                <Stack spacing={1}>
                                    {teamSuggestions.slice(0, 3).map((suggestion: { team_id?: string; id: string; team_name?: string; match_score?: string | number }) => (
                                        <Box key={suggestion.team_id || suggestion.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Box>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {suggestion.team_name || 'Team'}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Match Score: {suggestion.match_score || 'N/A'}%
                                                </Typography>
                                            </Box>
                                            <Button size="small" variant="contained" onClick={() => requestJoinMutation.mutate(suggestion.team_id || suggestion.id)}>
                                                Join
                                            </Button>
                                        </Box>
                                    ))}
                                </Stack>
                            </Paper>
                        )}
                    </Box>

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

                    {myCaptainedTeam && (
                        <Paper sx={{ p: 3, mt: 3 }}>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Send /> Invite to Team
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                Invite specific users to join your team by email.
                            </Typography>
                            <Button
                                fullWidth
                                variant="contained"
                                startIcon={<Send />}
                                onClick={() => setInviteDialogOpen(true)}
                            >
                                Send Invite
                            </Button>
                            {teamInvites && teamInvites.length > 0 && (
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="subtitle2" gutterBottom>Sent Invites</Typography>
                                    {teamInvites.map((invite: any) => (
                                        <Chip
                                            key={invite.id}
                                            label={`${invite.user_email} - ${invite.status}`}
                                            size="small"
                                            color={invite.status === 'accepted' ? 'success' : invite.status === 'declined' ? 'error' : 'default'}
                                            sx={{ mr: 1, mb: 1 }}
                                        />
                                    ))}
                                </Box>
                            )}
                        </Paper>
                    )}

                    {/* Team Announcements Section - for captains */}
                    {myCaptainedTeam && (
                        <Paper sx={{ p: 3, mt: 3, bgcolor: 'warning.light' }}>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Campaign /> Team Announcements
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                Post announcements for your team members.
                            </Typography>
                            <Button
                                fullWidth
                                variant="contained"
                                color="warning"
                                startIcon={<Campaign />}
                                onClick={() => setAnnouncementDialogOpen(true)}
                                sx={{ mb: 2 }}
                            >
                                Post Announcement
                            </Button>
                            {announcements.length > 0 ? (
                                <Box>
                                    {announcements.map((announcement: any) => (
                                        <Box key={announcement.id} sx={{ mb: 2, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <Typography variant="body2">{announcement.content}</Typography>
                                                <IconButton size="small" onClick={() => handleDeleteAnnouncement(announcement.id)}>
                                                    <Delete fontSize="small" />
                                                </IconButton>
                                            </Box>
                                            <Typography variant="caption" color="text.secondary">
                                                {new Date(announcement.created_at).toLocaleString()}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>
                            ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                    No announcements yet.
                                </Typography>
                            )}
                        </Paper>
                    )}

                    {/* Team Members Section - for captains */}
                    {myCaptainedTeam && teamMembersData && (
                        <Paper sx={{ p: 3, mt: 3 }}>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Group /> Team Members
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                Manage your team members here.
                            </Typography>
                            <List dense>
                                {teamMembersData.members?.map((member: any) => (
                                    <ListItem key={member.id}>
                                        <ListItemText
                                            primary={`${member.user?.first_name || ''} ${member.user?.last_name || ''}`.trim() || 'Team Member'}
                                            secondary={member.user?.email || member.user_id}
                                        />
                                        <Chip label={member.role || 'member'} size="small" color="default" />
                                    </ListItem>
                                ))}
                                {teamMembersData.members?.length === 0 && (
                                    <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
                                        No team members yet.
                                    </Typography>
                                )}
                            </List>
                        </Paper>
                    )}
                </Grid>
            </Grid>

            {/* Invite Dialog */}
            <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)}>
                <DialogTitle>Invite User to Team</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        Invite a user to join {myCaptainedTeam?.name}
                    </Typography>
                    <TextField
                        fullWidth
                        label="User Email"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => {
                            const value = e.target.value
                            setInviteEmail(value)
                            setEmailError(value && !isValidEmail(value) ? 'Please enter a valid email address' : null)
                        }}
                        error={!!emailError}
                        helperText={emailError}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        fullWidth
                        label="Message (optional)"
                        multiline
                        rows={2}
                        value={inviteMessage}
                        onChange={(e) => setInviteMessage(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setInviteDialogOpen(false); setEmailError(null); }}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={() => inviteMutation.mutate({ user_email: inviteEmail, message: inviteMessage })}
                        disabled={!inviteEmail || !isValidEmail(inviteEmail) || inviteMutation.isPending}
                    >
                        {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Announcement Dialog */}
            <Dialog open={announcementDialogOpen} onClose={() => setAnnouncementDialogOpen(false)}>
                <DialogTitle>Post Team Announcement</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        This announcement will be visible to all team members.
                    </Typography>
                    <TextField
                        fullWidth
                        label="Announcement"
                        multiline
                        rows={3}
                        value={newAnnouncement}
                        onChange={(e) => setNewAnnouncement(e.target.value)}
                        placeholder="Enter your announcement here..."
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAnnouncementDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleCreateAnnouncement}
                        disabled={!newAnnouncement.trim()}
                    >
                        Post
                    </Button>
                </DialogActions>
            </Dialog>
        </PageContainer>
    )
}
