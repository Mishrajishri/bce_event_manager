import { useState } from 'react'
import {
    Box,
    Card,
    CardContent,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    IconButton,
    Button,
    TextField,
    InputAdornment,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    CircularProgress,
    Pagination,
    Paper,
    Grid,
} from '@mui/material'
import {
    Search,
    CheckCircle,
    PlayArrow,
    Person,
    AccessTime,
    LocationOn,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { organizerApi } from '../../services/api'

interface Volunteer {
    id: string
    user_id: string
    event_id: string
    event_name: string
    shift_id: string
    shift_name: string
    shift_start: string
    shift_end: string
    shift_location: string
    role: string
    status: string
    checked_in_at: string | null
    hours_worked: number
    created_at: string
    user: {
        id: string
        email: string
        first_name: string
        last_name: string
        phone: string
    }
}

export default function Volunteers() {
    const queryClient = useQueryClient()
    const [search, setSearch] = useState('')
    const [eventFilter, setEventFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [page, setPage] = useState(1)
    const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null)
    const [detailOpen, setDetailOpen] = useState(false)
    const limit = 20

    const { data, isLoading, error } = useQuery({
        queryKey: ['organizer-volunteers', eventFilter, statusFilter, page, search],
        queryFn: () =>
            organizerApi.getVolunteers({
                event_id: eventFilter || undefined,
                status: statusFilter || undefined,
                limit,
                offset: (page - 1) * limit,
            }),
    })

    const checkInMutation = useMutation({
        mutationFn: (volunteerId: string) => organizerApi.checkInVolunteer(volunteerId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['organizer-volunteers'] })
            setDetailOpen(false)
        },
    })

    const completeMutation = useMutation({
        mutationFn: (volunteerId: string) => organizerApi.completeVolunteer(volunteerId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['organizer-volunteers'] })
            setDetailOpen(false)
        },
    })

    const handleCheckIn = (volunteer: Volunteer) => {
        checkInMutation.mutate(volunteer.id)
    }

    const handleComplete = (volunteer: Volunteer) => {
        completeMutation.mutate(volunteer.id)
    }

    const openDetail = (volunteer: Volunteer) => {
        setSelectedVolunteer(volunteer)
        setDetailOpen(true)
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'assigned':
                return 'default'
            case 'on_duty':
                return 'primary'
            case 'completed':
                return 'success'
            default:
                return 'default'
        }
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const totalPages = data ? Math.ceil(data.total / limit) : 0

    // Calculate stats
    const stats = {
        total: data?.total || 0,
        assigned: data?.volunteers.filter((v) => v.status === 'assigned').length || 0,
        onDuty: data?.volunteers.filter((v) => v.status === 'on_duty').length || 0,
        completed: data?.volunteers.filter((v) => v.status === 'completed').length || 0,
        totalHours: data?.volunteers.reduce((sum, v) => sum + (v.hours_worked || 0), 0) || 0,
    }

    // Filter volunteers by search
    const filteredVolunteers = data?.volunteers.filter((v) => {
        if (!search) return true
        const searchLower = search.toLowerCase()
        const fullName = `${v.user.first_name} ${v.user.last_name}`.toLowerCase()
        return (
            fullName.includes(searchLower) ||
            v.user.email.toLowerCase().includes(searchLower) ||
            v.event_name?.toLowerCase().includes(searchLower) ||
            v.shift_name?.toLowerCase().includes(searchLower)
        )
    }) || []

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Volunteer Management
            </Typography>

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={2}>
                    <Card>
                        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                            <Typography variant="h6" color="primary">
                                {stats.total}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Total Volunteers
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                    <Card>
                        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                            <Typography variant="h6" color="text.secondary">
                                {stats.assigned}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Assigned
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                    <Card>
                        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                            <Typography variant="h6" color="warning.main">
                                {stats.onDuty}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                On Duty
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                    <Card>
                        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                            <Typography variant="h6" color="success.main">
                                {stats.completed}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Completed
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                    <Card>
                        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                            <Typography variant="h6" color="info.main">
                                {stats.totalHours.toFixed(1)}h
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Total Hours
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search volunteers..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Event</InputLabel>
                            <Select
                                value={eventFilter}
                                label="Event"
                                onChange={(e) => setEventFilter(e.target.value)}
                            >
                                <MenuItem value="">All Events</MenuItem>
                                {data?.events.map((event) => (
                                    <MenuItem key={event.id} value={event.id}>
                                        {event.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={statusFilter}
                                label="Status"
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <MenuItem value="">All Statuses</MenuItem>
                                <MenuItem value="assigned">Assigned</MenuItem>
                                <MenuItem value="on_duty">On Duty</MenuItem>
                                <MenuItem value="completed">Completed</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Paper>

            {/* Error Alert */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    Failed to load volunteers. Please try again.
                </Alert>
            )}

            {/* Loading */}
            {isLoading ? (
                <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    {/* Volunteers Table */}
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Volunteer</TableCell>
                                    <TableCell>Event</TableCell>
                                    <TableCell>Shift</TableCell>
                                    <TableCell>Time</TableCell>
                                    <TableCell>Location</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Hours</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredVolunteers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                            <Typography color="text.secondary">
                                                No volunteers found
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredVolunteers.map((volunteer) => (
                                        <TableRow
                                            key={volunteer.id}
                                            hover
                                            onClick={() => openDetail(volunteer)}
                                            sx={{ cursor: 'pointer' }}
                                        >
                                            <TableCell>
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Person color="action" />
                                                    <Box>
                                                        <Typography variant="body2">
                                                            {volunteer.user.first_name} {volunteer.user.last_name}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {volunteer.user.email}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                            <TableCell>{volunteer.event_name}</TableCell>
                                            <TableCell>{volunteer.shift_name}</TableCell>
                                            <TableCell>
                                                <Box display="flex" alignItems="center" gap={0.5}>
                                                    <AccessTime fontSize="small" color="action" />
                                                    <Typography variant="body2">
                                                        {formatDate(volunteer.shift_start)}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Box display="flex" alignItems="center" gap={0.5}>
                                                    <LocationOn fontSize="small" color="action" />
                                                    {volunteer.shift_location || '-'}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={volunteer.status.replace('_', ' ')}
                                                    color={getStatusColor(volunteer.status)}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {volunteer.hours_worked ? `${volunteer.hours_worked}h` : '-'}
                                            </TableCell>
                                            <TableCell align="right">
                                                {volunteer.status === 'assigned' && (
                                                    <IconButton
                                                        color="primary"
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleCheckIn(volunteer)
                                                        }}
                                                        title="Check In"
                                                    >
                                                        <PlayArrow />
                                                    </IconButton>
                                                )}
                                                {volunteer.status === 'on_duty' && (
                                                    <IconButton
                                                        color="success"
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleComplete(volunteer)
                                                        }}
                                                        title="Complete Shift"
                                                    >
                                                        <CheckCircle />
                                                    </IconButton>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <Box display="flex" justifyContent="center" mt={2}>
                            <Pagination
                                count={totalPages}
                                page={page}
                                onChange={(_, value) => setPage(value)}
                                color="primary"
                            />
                        </Box>
                    )}
                </>
            )}

            {/* Volunteer Detail Dialog */}
            <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Volunteer Details</DialogTitle>
                <DialogContent>
                    {selectedVolunteer && (
                        <Box>
                            <Typography variant="h6">
                                {selectedVolunteer.user.first_name} {selectedVolunteer.user.last_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                {selectedVolunteer.user.email}
                            </Typography>
                            <Typography variant="body2" gutterBottom>
                                Phone: {selectedVolunteer.user.phone || 'N/A'}
                            </Typography>

                            <Box mt={2}>
                                <Typography variant="subtitle2">Event</Typography>
                                <Typography variant="body2">{selectedVolunteer.event_name}</Typography>
                            </Box>

                            <Box mt={2}>
                                <Typography variant="subtitle2">Shift</Typography>
                                <Typography variant="body2">{selectedVolunteer.shift_name}</Typography>
                            </Box>

                            <Box mt={2}>
                                <Typography variant="subtitle2">Role</Typography>
                                <Typography variant="body2">{selectedVolunteer.role}</Typography>
                            </Box>

                            <Box mt={2}>
                                <Typography variant="subtitle2">Schedule</Typography>
                                <Typography variant="body2">
                                    {formatDate(selectedVolunteer.shift_start)} - {formatDate(selectedVolunteer.shift_end)}
                                </Typography>
                            </Box>

                            <Box mt={2}>
                                <Typography variant="subtitle2">Location</Typography>
                                <Typography variant="body2">
                                    {selectedVolunteer.shift_location || 'Not specified'}
                                </Typography>
                            </Box>

                            <Box mt={2}>
                                <Typography variant="subtitle2">Status</Typography>
                                <Chip
                                    label={selectedVolunteer.status.replace('_', ' ')}
                                    color={getStatusColor(selectedVolunteer.status)}
                                    size="small"
                                />
                            </Box>

                            {selectedVolunteer.checked_in_at && (
                                <Box mt={2}>
                                    <Typography variant="subtitle2">Checked In At</Typography>
                                    <Typography variant="body2">
                                        {formatDate(selectedVolunteer.checked_in_at)}
                                    </Typography>
                                </Box>
                            )}

                            {selectedVolunteer.hours_worked > 0 && (
                                <Box mt={2}>
                                    <Typography variant="subtitle2">Hours Worked</Typography>
                                    <Typography variant="body2">{selectedVolunteer.hours_worked} hours</Typography>
                                </Box>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    {selectedVolunteer?.status === 'assigned' && (
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => handleCheckIn(selectedVolunteer)}
                            disabled={checkInMutation.isPending}
                            startIcon={<PlayArrow />}
                        >
                            Check In
                        </Button>
                    )}
                    {selectedVolunteer?.status === 'on_duty' && (
                        <Button
                            variant="contained"
                            color="success"
                            onClick={() => handleComplete(selectedVolunteer)}
                            disabled={completeMutation.isPending}
                            startIcon={<CheckCircle />}
                        >
                            Complete Shift
                        </Button>
                    )}
                    <Button onClick={() => setDetailOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}
