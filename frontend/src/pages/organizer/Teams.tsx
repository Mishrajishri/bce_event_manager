import { useState } from 'react'
import {
    Container,
    Typography,
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Chip,
    TextField,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    IconButton,
    CircularProgress,
    Alert,
    Card,
    CardContent,
    Grid,
    Avatar,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Collapse,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    AvatarGroup,
} from '@mui/material'
import {
    Search,
    Groups,
    FilterList,
    Refresh,
    ExpandMore,
    ExpandLess,
    EmojiEvents,
    Star,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { organizerApi } from '../../services/api'
import { useAuthStore, isOrganizer } from '../../store'
import { Navigate } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TeamMember {
    id: string
    user_id: string
    role: string
    jersey_number?: number
    is_active: boolean
    user: {
        id: string
        first_name: string
        last_name: string
        email: string
    }
}

interface Team {
    id: string
    name: string
    event_id: string
    event_name: string
    event_type: string
    status: string
    captain_id?: string
    captain?: {
        id: string
        first_name: string
        last_name: string
        email: string
    }
    member_count: number
    members: TeamMember[]
    created_at: string
}



// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------
function getStatusColor(status: string): 'success' | 'warning' | 'error' | 'default' | 'info' {
    switch (status) {
        case 'confirmed': return 'success'
        case 'registered': return 'info'
        case 'eliminated': return 'error'
        case 'winner': return 'warning'
        default: return 'default'
    }
}

function getStatusIcon(status: string): React.ReactElement | undefined {
    switch (status) {
        case 'winner': return <EmojiEvents />
        case 'confirmed': return <Star />
        default: return undefined
    }
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

// ---------------------------------------------------------------------------
// Team Detail Dialog
// ---------------------------------------------------------------------------
function TeamDetailDialog({
    open,
    onClose,
    team,
}: {
    open: boolean
    onClose: () => void
    team: Team | null
}) {
    if (!team) return null

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <Groups />
                    </Avatar>
                    <Box>
                        <Typography variant="h6">{team.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                            {team.event_name}
                        </Typography>
                    </Box>
                </Box>
            </DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">Status</Typography>
                        <Box>
                            <Chip
                                label={team.status}
                                color={getStatusColor(team.status)}
                                size="small"
                                icon={getStatusIcon(team.status)}
                            />
                        </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">Event Type</Typography>
                        <Typography variant="body1">{team.event_type}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">Created</Typography>
                        <Typography variant="body1">{formatDate(team.created_at)}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Captain</Typography>
                        {team.captain ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar sx={{ bgcolor: 'secondary.main' }}>
                                    {team.captain.first_name?.[0]}{team.captain.last_name?.[0]}
                                </Avatar>
                                <Box>
                                    <Typography variant="body2" fontWeight={600}>
                                        {team.captain.first_name} {team.captain.last_name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {team.captain.email}
                                    </Typography>
                                </Box>
                            </Box>
                        ) : (
                            <Typography variant="body2" color="text.secondary">No captain assigned</Typography>
                        )}
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                            Members ({team.members.length})
                        </Typography>
                        <List>
                            {team.members.map((member) => (
                                <ListItem key={member.id} disablePadding sx={{ py: 1 }}>
                                    <ListItemAvatar>
                                        <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.light' }}>
                                            {member.user.first_name?.[0]}{member.user.last_name?.[0]}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={`${member.user.first_name} ${member.user.last_name}`}
                                        secondary={
                                            <Box component="span" sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                                <Typography variant="caption">{member.user.email}</Typography>
                                                <Chip label={member.role} size="small" variant="outlined" />
                                                {member.jersey_number && (
                                                    <Chip label={`#${member.jersey_number}`} size="small" />
                                                )}
                                            </Box>
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    )
}

// ---------------------------------------------------------------------------
// Stats Cards
// ---------------------------------------------------------------------------
function StatsCards({ teams }: { teams: Team[] }) {
    const total = teams.length
    const confirmed = teams.filter(t => t.status === 'confirmed').length
    const winners = teams.filter(t => t.status === 'winner').length

    const totalMembers = teams.reduce((sum, t) => sum + t.member_count, 0)

    const stats = [
        { title: 'Total Teams', value: total, color: 'primary.main' },
        { title: 'Confirmed', value: confirmed, color: 'success.main' },
        { title: 'Winners', value: winners, color: 'warning.main' },
        { title: 'Total Members', value: totalMembers, color: 'info.main' },
    ]

    return (
        <Grid container spacing={3} sx={{ mb: 3 }}>
            {stats.map((stat) => (
                <Grid item xs={6} sm={3} key={stat.title}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" sx={{ color: stat.color, fontWeight: 700 }}>
                                {stat.value}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {stat.title}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            ))}
        </Grid>
    )
}

// ---------------------------------------------------------------------------
// Main Teams Page
// ---------------------------------------------------------------------------
export default function TeamsPage() {
    const { user } = useAuthStore()

    // Redirect if not an organizer
    if (!isOrganizer(user)) {
        return <Navigate to="/dashboard" replace />
    }

    // Filter state
    const [eventFilter, setEventFilter] = useState<string>('')
    const [statusFilter, setStatusFilter] = useState<string>('')
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [page, setPage] = useState(0)
    const [rowsPerPage, setRowsPerPage] = useState(25)
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
    const [detailDialogOpen, setDetailDialogOpen] = useState(false)
    const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set())

    // Fetch teams
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['organizer-teams', eventFilter, statusFilter, searchQuery, page, rowsPerPage],
        queryFn: () => organizerApi.listTeams({
            event_id: eventFilter || undefined,
            status: statusFilter || undefined,
            search: searchQuery || undefined,
            limit: rowsPerPage,
            offset: page * rowsPerPage,
        }),
    })

    const teams = data?.teams || []
    const total = data?.total || 0
    const events = data?.events || []

    const handleChangePage = (_: unknown, newPage: number) => {
        setPage(newPage)
    }

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10))
        setPage(0)
    }

    const handleViewDetails = (team: Team) => {
        setSelectedTeam(team)
        setDetailDialogOpen(true)
    }

    const toggleExpand = (teamId: string) => {
        const newExpanded = new Set(expandedTeams)
        if (newExpanded.has(teamId)) {
            newExpanded.delete(teamId)
        } else {
            newExpanded.add(teamId)
        }
        setExpandedTeams(newExpanded)
    }

    const clearFilters = () => {
        setEventFilter('')
        setStatusFilter('')
        setSearchQuery('')
        setPage(0)
    }

    if (error) {
        return (
            <Container maxWidth="xl" sx={{ py: 4 }}>
                <Alert severity="error">
                    Failed to load teams. Please try again later.
                </Alert>
            </Container>
        )
    }

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                    🏆 Team Management
                </Typography>
                <Tooltip title="Refresh">
                    <IconButton onClick={() => refetch()}>
                        <Refresh />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Stats Cards */}
            <StatsCards teams={teams} />

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                    <FilterList color="action" />

                    {/* Search */}
                    <TextField
                        size="small"
                        placeholder="Search by team name..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value)
                            setPage(0)
                        }}
                        sx={{ minWidth: 250 }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search />
                                </InputAdornment>
                            ),
                        }}
                    />

                    {/* Event Filter */}
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Event</InputLabel>
                        <Select
                            value={eventFilter}
                            label="Event"
                            onChange={(e) => {
                                setEventFilter(e.target.value)
                                setPage(0)
                            }}
                        >
                            <MenuItem value="">All Events</MenuItem>
                            {events.map((event) => (
                                <MenuItem key={event.id} value={event.id}>
                                    {event.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Status Filter */}
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={statusFilter}
                            label="Status"
                            onChange={(e) => {
                                setStatusFilter(e.target.value)
                                setPage(0)
                            }}
                        >
                            <MenuItem value="">All Statuses</MenuItem>
                            <MenuItem value="registered">Registered</MenuItem>
                            <MenuItem value="confirmed">Confirmed</MenuItem>
                            <MenuItem value="eliminated">Eliminated</MenuItem>
                            <MenuItem value="winner">Winner</MenuItem>
                        </Select>
                    </FormControl>

                    {/* Clear Filters */}
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={clearFilters}
                        disabled={!eventFilter && !statusFilter && !searchQuery}
                    >
                        Clear Filters
                    </Button>
                </Box>
            </Paper>

            {/* Teams Table */}
            <Paper>
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : teams.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                        <Groups sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                            No teams found
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {searchQuery || eventFilter || statusFilter
                                ? 'Try adjusting your filters'
                                : 'Teams will appear here when participants register for team events'}
                        </Typography>
                    </Box>
                ) : (
                    <>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell />
                                        <TableCell>Team Name</TableCell>
                                        <TableCell>Event</TableCell>
                                        <TableCell>Captain</TableCell>
                                        <TableCell align="center">Members</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Created</TableCell>
                                        <TableCell align="center">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {teams.map((team) => (
                                        <>
                                            <TableRow
                                                key={team.id}
                                                hover
                                                sx={{ cursor: 'pointer' }}
                                            >
                                                <TableCell>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => toggleExpand(team.id)}
                                                    >
                                                        {expandedTeams.has(team.id) ? <ExpandLess /> : <ExpandMore />}
                                                    </IconButton>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {team.name}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {team.event_name}
                                                    </Typography>
                                                    <Chip
                                                        label={team.event_type}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {team.captain ? (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Avatar sx={{ width: 28, height: 28, bgcolor: 'secondary.main' }}>
                                                                {team.captain.first_name?.[0]}{team.captain.last_name?.[0]}
                                                            </Avatar>
                                                            <Typography variant="body2">
                                                                {team.captain.first_name} {team.captain.last_name}
                                                            </Typography>
                                                        </Box>
                                                    ) : (
                                                        <Typography variant="body2" color="text.secondary">
                                                            No captain
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <AvatarGroup max={4}>
                                                        {team.members.map((member) => (
                                                            <Tooltip
                                                                key={member.id}
                                                                title={`${member.user.first_name} ${member.user.last_name}`}
                                                            >
                                                                <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.light' }}>
                                                                    {member.user.first_name?.[0]}
                                                                </Avatar>
                                                            </Tooltip>
                                                        ))}
                                                    </AvatarGroup>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {team.member_count} members
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={team.status}
                                                        color={getStatusColor(team.status)}
                                                        size="small"
                                                        icon={getStatusIcon(team.status)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {formatDate(team.created_at)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Tooltip title="View Details">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleViewDetails(team)}
                                                        >
                                                            <Groups />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell colSpan={8} sx={{ py: 0 }}>
                                                    <Collapse in={expandedTeams.has(team.id)} timeout="auto" unmountOnExit>
                                                        <Box sx={{ py: 2 }}>
                                                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                                                Team Members
                                                            </Typography>
                                                            <Grid container spacing={2}>
                                                                {team.members.map((member) => (
                                                                    <Grid item xs={12} sm={6} md={4} key={member.id}>
                                                                        <Card variant="outlined">
                                                                            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                                                    <Avatar sx={{ bgcolor: 'primary.light' }}>
                                                                                        {member.user.first_name?.[0]}{member.user.last_name?.[0]}
                                                                                    </Avatar>
                                                                                    <Box sx={{ flexGrow: 1 }}>
                                                                                        <Typography variant="body2" fontWeight={600}>
                                                                                            {member.user.first_name} {member.user.last_name}
                                                                                        </Typography>
                                                                                        <Typography variant="caption" color="text.secondary">
                                                                                            {member.user.email}
                                                                                        </Typography>
                                                                                    </Box>
                                                                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                                                        {member.jersey_number && (
                                                                                            <Chip label={`#${member.jersey_number}`} size="small" />
                                                                                        )}
                                                                                        <Chip label={member.role} size="small" variant="outlined" />
                                                                                    </Box>
                                                                                </Box>
                                                                            </CardContent>
                                                                        </Card>
                                                                    </Grid>
                                                                ))}
                                                            </Grid>
                                                        </Box>
                                                    </Collapse>
                                                </TableCell>
                                            </TableRow>
                                        </>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            component="div"
                            count={total}
                            page={page}
                            onPageChange={handleChangePage}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                            rowsPerPageOptions={[10, 25, 50, 100]}
                        />
                    </>
                )}
            </Paper>

            {/* Detail Dialog */}
            <TeamDetailDialog
                open={detailDialogOpen}
                onClose={() => setDetailDialogOpen(false)}
                team={selectedTeam}
            />
        </Container>
    )
}
