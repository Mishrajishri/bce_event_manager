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
} from '@mui/material'
import {
    Search,
    Person,
    Email,
    Phone,
    School,
    FilterList,
    Refresh,
    CheckCircle,
    QrCode,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { organizerApi } from '../../services/api'
import { useAuthStore, isOrganizer } from '../../store'
import { Navigate } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Participant {
    id: string
    user_id: string
    event_id: string
    event_name: string
    event_type: string
    status: string
    payment_status: string
    payment_amount: number
    qr_code?: string
    checked_in_at?: string
    registered_at: string
    user: {
        id: string
        email: string
        first_name: string
        last_name: string
        phone?: string
        enrollment_number?: string
        branch?: string
        college_name?: string
    }
}



// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------
function getStatusColor(status: string): 'success' | 'warning' | 'error' | 'default' {
    switch (status) {
        case 'confirmed': return 'success'
        case 'pending': return 'warning'
        case 'cancelled': return 'error'
        default: return 'default'
    }
}

function getPaymentColor(status: string): 'success' | 'warning' | 'error' | 'default' {
    switch (status) {
        case 'paid': return 'success'
        case 'unpaid': return 'warning'
        case 'refunded': return 'error'
        default: return 'default'
    }
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

// ---------------------------------------------------------------------------
// Participant Detail Dialog
// ---------------------------------------------------------------------------
function ParticipantDetailDialog({
    open,
    onClose,
    participant,
}: {
    open: boolean
    onClose: () => void
    participant: Participant | null
}) {
    if (!participant) return null

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <Person />
                    </Avatar>
                    <Box>
                        <Typography variant="h6">
                            {participant.user.first_name} {participant.user.last_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {participant.user.email}
                        </Typography>
                    </Box>
                </Box>
            </DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">Event</Typography>
                        <Typography variant="body1">{participant.event_name}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">Event Type</Typography>
                        <Typography variant="body1">{participant.event_type}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">Registration Status</Typography>
                        <Box>
                            <Chip
                                label={participant.status}
                                color={getStatusColor(participant.status)}
                                size="small"
                            />
                        </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">Payment Status</Typography>
                        <Box>
                            <Chip
                                label={participant.payment_status}
                                color={getPaymentColor(participant.payment_status)}
                                size="small"
                            />
                        </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">Amount</Typography>
                        <Typography variant="body1">₹{participant.payment_amount.toLocaleString()}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">Registered At</Typography>
                        <Typography variant="body1">{formatDate(participant.registered_at)}</Typography>
                    </Grid>
                    {participant.checked_in_at && (
                        <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary">Checked In At</Typography>
                            <Typography variant="body1">{formatDate(participant.checked_in_at)}</Typography>
                        </Grid>
                    )}
                    <Grid item xs={12}>
                        <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>User Details</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Email fontSize="small" color="action" />
                            <Typography variant="body2">{participant.user.email}</Typography>
                        </Box>
                    </Grid>
                    {participant.user.phone && (
                        <Grid item xs={12} sm={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Phone fontSize="small" color="action" />
                                <Typography variant="body2">{participant.user.phone}</Typography>
                            </Box>
                        </Grid>
                    )}
                    {participant.user.enrollment_number && (
                        <Grid item xs={12} sm={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <School fontSize="small" color="action" />
                                <Typography variant="body2">{participant.user.enrollment_number}</Typography>
                            </Box>
                        </Grid>
                    )}
                    {participant.user.branch && (
                        <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary">Branch</Typography>
                            <Typography variant="body2">{participant.user.branch}</Typography>
                        </Grid>
                    )}
                    {participant.user.college_name && (
                        <Grid item xs={12}>
                            <Typography variant="caption" color="text.secondary">College</Typography>
                            <Typography variant="body2">{participant.user.college_name}</Typography>
                        </Grid>
                    )}
                    {participant.qr_code && (
                        <Grid item xs={12}>
                            <Typography variant="caption" color="text.secondary">QR Code</Typography>
                            <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1, textAlign: 'center' }}>
                                <QrCode sx={{ fontSize: 100 }} />
                                <Typography variant="body2" sx={{ mt: 1 }}>{participant.qr_code}</Typography>
                            </Box>
                        </Grid>
                    )}
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
function StatsCards({ participants }: { participants: Participant[] }) {
    const total = participants.length
    const confirmed = participants.filter(p => p.status === 'confirmed').length
    const paid = participants.filter(p => p.payment_status === 'paid').length
    const checkedIn = participants.filter(p => p.checked_in_at).length

    const stats = [
        { title: 'Total Participants', value: total, color: 'primary.main' },
        { title: 'Confirmed', value: confirmed, color: 'success.main' },
        { title: 'Paid', value: paid, color: 'info.main' },
        { title: 'Checked In', value: checkedIn, color: 'warning.main' },
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
// Main Participants Page
// ---------------------------------------------------------------------------
export default function ParticipantsPage() {
    const { user } = useAuthStore()

    // Redirect if not an organizer
    if (!isOrganizer(user)) {
        return <Navigate to="/dashboard" replace />
    }

    // Filter state
    const [eventFilter, setEventFilter] = useState<string>('')
    const [statusFilter, setStatusFilter] = useState<string>('')
    const [paymentFilter, setPaymentFilter] = useState<string>('')
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [page, setPage] = useState(0)
    const [rowsPerPage, setRowsPerPage] = useState(25)
    const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)
    const [detailDialogOpen, setDetailDialogOpen] = useState(false)

    // Fetch participants
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['organizer-participants', eventFilter, statusFilter, paymentFilter, searchQuery, page, rowsPerPage],
        queryFn: () => organizerApi.listParticipants({
            event_id: eventFilter || undefined,
            status: statusFilter || undefined,
            payment_status: paymentFilter || undefined,
            search: searchQuery || undefined,
            limit: rowsPerPage,
            offset: page * rowsPerPage,
        }),
    })

    const participants = data?.participants || []
    const total = data?.total || 0
    const events = data?.events || []

    const handleChangePage = (_: unknown, newPage: number) => {
        setPage(newPage)
    }

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10))
        setPage(0)
    }

    const handleViewDetails = (participant: Participant) => {
        setSelectedParticipant(participant)
        setDetailDialogOpen(true)
    }

    const clearFilters = () => {
        setEventFilter('')
        setStatusFilter('')
        setPaymentFilter('')
        setSearchQuery('')
        setPage(0)
    }

    if (error) {
        return (
            <Container maxWidth="xl" sx={{ py: 4 }}>
                <Alert severity="error">
                    Failed to load participants. Please try again later.
                </Alert>
            </Container>
        )
    }

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                    👥 Participant Management
                </Typography>
                <Tooltip title="Refresh">
                    <IconButton onClick={() => refetch()}>
                        <Refresh />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Stats Cards */}
            <StatsCards participants={participants} />

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                    <FilterList color="action" />

                    {/* Search */}
                    <TextField
                        size="small"
                        placeholder="Search by name or email..."
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
                            <MenuItem value="confirmed">Confirmed</MenuItem>
                            <MenuItem value="pending">Pending</MenuItem>
                            <MenuItem value="cancelled">Cancelled</MenuItem>
                        </Select>
                    </FormControl>

                    {/* Payment Filter */}
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Payment</InputLabel>
                        <Select
                            value={paymentFilter}
                            label="Payment"
                            onChange={(e) => {
                                setPaymentFilter(e.target.value)
                                setPage(0)
                            }}
                        >
                            <MenuItem value="">All Payments</MenuItem>
                            <MenuItem value="paid">Paid</MenuItem>
                            <MenuItem value="unpaid">Unpaid</MenuItem>
                            <MenuItem value="refunded">Refunded</MenuItem>
                        </Select>
                    </FormControl>

                    {/* Clear Filters */}
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={clearFilters}
                        disabled={!eventFilter && !statusFilter && !paymentFilter && !searchQuery}
                    >
                        Clear Filters
                    </Button>
                </Box>
            </Paper>

            {/* Participants Table */}
            <Paper>
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : participants.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                        <Person sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                            No participants found
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {searchQuery || eventFilter || statusFilter || paymentFilter
                                ? 'Try adjusting your filters'
                                : 'Create events and wait for registrations'}
                        </Typography>
                    </Box>
                ) : (
                    <>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Participant</TableCell>
                                        <TableCell>Event</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Payment</TableCell>
                                        <TableCell>Registered</TableCell>
                                        <TableCell align="center">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {participants.map((participant) => (
                                        <TableRow
                                            key={participant.id}
                                            hover
                                            sx={{ cursor: 'pointer' }}
                                            onClick={() => handleViewDetails(participant)}
                                        >
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <Avatar sx={{ bgcolor: 'primary.light' }}>
                                                        {participant.user.first_name?.[0]}{participant.user.last_name?.[0]}
                                                    </Avatar>
                                                    <Box>
                                                        <Typography variant="body2" fontWeight={600}>
                                                            {participant.user.first_name} {participant.user.last_name}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {participant.user.email}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {participant.event_name}
                                                </Typography>
                                                <Chip
                                                    label={participant.event_type}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={participant.status}
                                                    color={getStatusColor(participant.status)}
                                                    size="small"
                                                    icon={participant.status === 'confirmed' ? <CheckCircle /> : undefined}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={participant.payment_status}
                                                    color={getPaymentColor(participant.payment_status)}
                                                    size="small"
                                                />
                                                {participant.payment_amount > 0 && (
                                                    <Typography variant="caption" display="block" color="text.secondary">
                                                        ₹{participant.payment_amount.toLocaleString()}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {formatDate(participant.registered_at)}
                                                </Typography>
                                                {participant.checked_in_at && (
                                                    <Chip
                                                        label="Checked In"
                                                        color="success"
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                )}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Tooltip title="View Details">
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleViewDetails(participant)
                                                        }}
                                                    >
                                                        <Person />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
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
            <ParticipantDetailDialog
                open={detailDialogOpen}
                onClose={() => setDetailDialogOpen(false)}
                participant={selectedParticipant}
            />
        </Container>
    )
}
