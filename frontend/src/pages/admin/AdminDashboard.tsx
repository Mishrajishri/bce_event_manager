import { useState } from 'react'
import {
    Container, Typography, Tabs, Tab, Box, Paper, Grid, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow,
    Button, Chip, IconButton, TextField, Select, MenuItem,
    FormControl, InputLabel, Dialog, DialogTitle, DialogContent,
    DialogActions, Tooltip, CircularProgress, Alert, Checkbox,
} from '@mui/material'
import {
    Delete, LockReset, Edit, Download, People, Event, EventBusy,
    History, HistoryToggleOff, BarChart, SearchOff, ContentCopy,
    SwapHoriz, TrendingUp, AttachMoney, Add
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, eventsApi } from '../../services/api'
import StatCard from '../../components/StatCard'
import type { User, AuditLog, ChipColor, EventType } from '../../types'

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
    return value === index ? <Box sx={{ mt: 3 }}>{children}</Box> : null
}

// ---------------------------------------------------------------------------
// Users Tab
// ---------------------------------------------------------------------------
function UsersTab() {
    const queryClient = useQueryClient()
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('')
    const [editUser, setEditUser] = useState<User | null>(null)
    const [editRole, setEditRole] = useState('')
    const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
    const [selectedUsers, setSelectedUsers] = useState<string[]>([])
    const [bulkActionDialog, setBulkActionDialog] = useState<{ action: 'delete' | 'role'; role?: string } | null>(null)

    const { data: users, isLoading } = useQuery({
        queryKey: ['admin-users', search, roleFilter],
        queryFn: () => adminApi.listUsers({
            ...(search ? { search } : {}),
            ...(roleFilter ? { role: roleFilter } : {}),
        }),
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: { role?: string } }) => adminApi.updateUser(id, data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); setEditUser(null) },
    })

    const deleteMutation = useMutation({
        mutationFn: adminApi.deleteUser,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); setDeleteTarget(null) },
    })

    const resetMutation = useMutation({
        mutationFn: adminApi.resetPassword,
    })

    // Bulk actions
    const toggleSelectAll = () => {
        if (selectedUsers.length === (users?.length || 0)) {
            setSelectedUsers([])
        } else {
            setSelectedUsers(users?.map(u => u.id) || [])
        }
    }

    const toggleSelectUser = (userId: string) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        )
    }

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedUsers.length} users? This cannot be undone.`)) return
        for (const userId of selectedUsers) {
            await adminApi.deleteUser(userId)
        }
        queryClient.invalidateQueries({ queryKey: ['admin-users'] })
        setSelectedUsers([])
        setBulkActionDialog(null)
    }

    const handleBulkRoleChange = async () => {
        if (!bulkActionDialog?.role) return
        for (const userId of selectedUsers) {
            await adminApi.updateUser(userId, { role: bulkActionDialog.role })
        }
        queryClient.invalidateQueries({ queryKey: ['admin-users'] })
        setSelectedUsers([])
        setBulkActionDialog(null)
    }

    const roleColor = (role: string): ChipColor => {
        switch (role) {
            case 'super_admin': return 'error'
            case 'organizer': return 'primary'
            case 'captain': return 'warning'
            default: return 'default'
        }
    }

    return (
        <>
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField
                    label="Search users"
                    size="small"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ minWidth: 220 }}
                />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Role</InputLabel>
                    <Select value={roleFilter} label="Role" onChange={(e) => setRoleFilter(e.target.value)}>
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="super_admin">Super Admin</MenuItem>
                        <MenuItem value="organizer">Organizer</MenuItem>
                        <MenuItem value="captain">Captain</MenuItem>
                        <MenuItem value="attendee">Attendee</MenuItem>
                    </Select>
                </FormControl>
                <Button
                    variant="outlined"
                    startIcon={<Download />}
                    href={adminApi.exportUsersCSV()}
                    target="_blank"
                >
                    Export CSV
                </Button>
                {selectedUsers.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                        <Button
                            variant="contained"
                            size="small"
                            onClick={() => setBulkActionDialog({ action: 'role', role: 'attendee' })}
                        >
                            Change Role ({selectedUsers.length})
                        </Button>
                        <Button
                            variant="contained"
                            color="error"
                            size="small"
                            onClick={() => setBulkActionDialog({ action: 'delete' })}
                        >
                            Delete Selected
                        </Button>
                    </Box>
                )}
            </Box>

            {isLoading ? <CircularProgress /> : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        checked={(users?.length || 0) > 0 && selectedUsers.length === users?.length}
                                        indeterminate={selectedUsers.length > 0 && selectedUsers.length < (users?.length || 0)}
                                        onChange={toggleSelectAll}
                                    />
                                </TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Role</TableCell>
                                <TableCell align="center">Verified</TableCell>
                                <TableCell>Created</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users?.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={selectedUsers.includes(user.id)}
                                            onChange={() => toggleSelectUser(user.id)}
                                        />
                                    </TableCell>
                                    <TableCell>{user.first_name} {user.last_name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Chip label={user.role} color={roleColor(user.role)} size="small" />
                                    </TableCell>
                                    <TableCell align="center">{user.is_verified ? '✅' : '❌'}</TableCell>
                                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Edit role">
                                            <IconButton size="small" onClick={() => { setEditUser(user); setEditRole(user.role) }}>
                                                <Edit fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Reset password">
                                            <IconButton size="small" onClick={() => resetMutation.mutate(user.id)}>
                                                <LockReset fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete user">
                                            <IconButton size="small" color="error" onClick={() => setDeleteTarget(user)}>
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {users?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 8, border: 0 }}>
                                        <SearchOff sx={{ fontSize: 56, color: 'text.secondary', opacity: 0.4, mb: 1 }} />
                                        <Typography variant="h6" color="text.secondary" gutterBottom>
                                            No users found
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.7 }}>
                                            Try adjusting your search or filter criteria
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Edit Role Dialog */}
            <Dialog open={!!editUser} onClose={() => setEditUser(null)}>
                <DialogTitle>Edit User Role</DialogTitle>
                <DialogContent sx={{ pt: 2, minWidth: 300 }}>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        {editUser?.first_name} {editUser?.last_name} ({editUser?.email})
                    </Typography>
                    <FormControl fullWidth>
                        <InputLabel>Role</InputLabel>
                        <Select value={editRole} label="Role" onChange={(e) => setEditRole(e.target.value)}>
                            <MenuItem value="super_admin">Super Admin</MenuItem>
                            <MenuItem value="organizer">Organizer</MenuItem>
                            <MenuItem value="captain">Captain</MenuItem>
                            <MenuItem value="attendee">Attendee</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditUser(null)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={() => editUser && updateMutation.mutate({ id: editUser.id, data: { role: editRole } })}
                        disabled={updateMutation.isPending}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
                <DialogTitle>⚠️ Delete User</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to permanently delete <strong>{deleteTarget?.first_name} {deleteTarget?.last_name}</strong> ({deleteTarget?.email})?
                    </Typography>
                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                        This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                        disabled={deleteMutation.isPending}
                    >
                        {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            {resetMutation.isSuccess && (
                <Alert severity="success" sx={{ mt: 2 }}>Password reset email sent!</Alert>
            )}

            {/* Bulk Action Dialog */}
            <Dialog open={!!bulkActionDialog} onClose={() => setBulkActionDialog(null)}>
                <DialogTitle>
                    {bulkActionDialog?.action === 'delete' ? '⚠️ Delete Multiple Users' : 'Change Role for Multiple Users'}
                </DialogTitle>
                <DialogContent>
                    {bulkActionDialog?.action === 'delete' ? (
                        <Typography>
                            Are you sure you want to delete <strong>{selectedUsers.length}</strong> users? This action cannot be undone.
                        </Typography>
                    ) : (
                        <>
                            <Typography sx={{ mb: 2 }}>
                                Changing role for <strong>{selectedUsers.length}</strong> users to:
                            </Typography>
                            <FormControl fullWidth>
                                <InputLabel>New Role</InputLabel>
                                <Select
                                    value={bulkActionDialog?.role || ''}
                                    label="New Role"
                                    onChange={(e) => setBulkActionDialog({ action: 'role', role: e.target.value })}
                                >
                                    <MenuItem value="super_admin">Super Admin</MenuItem>
                                    <MenuItem value="organizer">Organizer</MenuItem>
                                    <MenuItem value="captain">Captain</MenuItem>
                                    <MenuItem value="attendee">Attendee</MenuItem>
                                </Select>
                            </FormControl>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setBulkActionDialog(null)}>Cancel</Button>
                    {bulkActionDialog?.action === 'delete' ? (
                        <Button variant="contained" color="error" onClick={handleBulkDelete}>
                            Delete {selectedUsers.length} Users
                        </Button>
                    ) : (
                        <Button variant="contained" onClick={handleBulkRoleChange} disabled={!bulkActionDialog?.role}>
                            Change Role
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </>
    )
}

// ---------------------------------------------------------------------------
// Audit Logs Tab
// ---------------------------------------------------------------------------
function AuditLogsTab() {
    const [actionFilter, setActionFilter] = useState('')

    const { data: logs, isLoading } = useQuery({
        queryKey: ['admin-audit-logs', actionFilter],
        queryFn: () => adminApi.getAuditLogs(actionFilter ? { action: actionFilter } : undefined),
    })

    const actionColor = (action: string): ChipColor => {
        if (action.includes('delete')) return 'error'
        if (action.includes('update') || action.includes('reassign')) return 'warning'
        return 'info'
    }

    return (
        <>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Filter by action</InputLabel>
                    <Select value={actionFilter} label="Filter by action" onChange={(e) => setActionFilter(e.target.value)}>
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="update_user">Update User</MenuItem>
                        <MenuItem value="delete_user">Delete User</MenuItem>
                        <MenuItem value="reset_password">Reset Password</MenuItem>
                        <MenuItem value="reassign_event">Reassign Event</MenuItem>
                    </Select>
                </FormControl>
                {logs && logs.length > 0 && (
                    <Button
                        variant="outlined"
                        startIcon={<Download />}
                        onClick={() => {
                            const csv = [
                                ['Time', 'Action', 'Target Type', 'Target ID', 'Changes'].join(','),
                                ...logs.map(l => [
                                    new Date(l.created_at).toISOString(),
                                    l.action,
                                    l.target_type,
                                    l.target_id,
                                    l.changes ? JSON.stringify(l.changes).replace(/"/g, '""') : ''
                                ].join(','))
                            ].join('\n')
                            const blob = new Blob([csv], { type: 'text/csv' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
                            a.click()
                            URL.revokeObjectURL(url)
                        }}
                    >
                        Export CSV
                    </Button>
                )}
            </Box>

            {isLoading ? <CircularProgress /> : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Time</TableCell>
                                <TableCell>Action</TableCell>
                                <TableCell>Target</TableCell>
                                <TableCell>Changes</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {logs?.map((log: AuditLog) => (
                                <TableRow key={log.id}>
                                    <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Chip label={log.action} color={actionColor(log.action)} size="small" />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{log.target_type}</Typography>
                                        <Typography variant="caption" color="text.secondary">{log.target_id}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                            {log.changes ? JSON.stringify(log.changes, null, 1) : '—'}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {logs?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 8, border: 0 }}>
                                        <HistoryToggleOff sx={{ fontSize: 56, color: 'text.secondary', opacity: 0.4, mb: 1 }} />
                                        <Typography variant="h6" color="text.secondary" gutterBottom>
                                            No audit logs yet
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.7 }}>
                                            Actions performed in the admin panel will appear here
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </>
    )
}

// ---------------------------------------------------------------------------
// Main Admin Dashboard
// ---------------------------------------------------------------------------
export default function AdminDashboard() {
    const [tab, setTab] = useState(0)

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['admin-stats'],
        queryFn: adminApi.getStats,
    })

    return (
        <Container maxWidth="xl">
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
                🛡️ Super Admin Panel
            </Typography>

            {/* Stats Overview */}
            {statsLoading ? <CircularProgress /> : stats && (
                <>
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard title="Total Users" value={stats.total_users} icon={<People color="primary" />} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard title="Total Events" value={stats.total_events} icon={<Event color="secondary" />} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard title="Registrations" value={stats.total_registrations} icon={<BarChart color="success" />} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard title="Revenue" value={`₹${stats.total_revenue.toLocaleString()}`} icon={<BarChart color="warning" />} />
                        </Grid>
                    </Grid>

                    {/* Enhanced Analytics - Breakdown Cards */}
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        <Grid item xs={12} md={4}>
                            <Paper sx={{ p: 2, borderRadius: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    📊 Events by Status
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {stats.events_by_status && Object.entries(stats.events_by_status).map(([status, count]) => (
                                        <Chip
                                            key={status}
                                            label={`${status}: ${count}`}
                                            color={status === 'published' ? 'success' : status === 'draft' ? 'default' : status === 'ongoing' ? 'info' : status === 'completed' ? 'primary' : 'error'}
                                            size="small"
                                        />
                                    ))}
                                </Box>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Paper sx={{ p: 2, borderRadius: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    👥 Users by Role
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {stats.users_by_role && Object.entries(stats.users_by_role).map(([role, count]) => (
                                        <Chip
                                            key={role}
                                            label={`${role}: ${count}`}
                                            color={role === 'super_admin' ? 'error' : role === 'organizer' ? 'primary' : role === 'captain' ? 'warning' : 'default'}
                                            size="small"
                                        />
                                    ))}
                                </Box>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Paper sx={{ p: 2, borderRadius: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    📈 Quick Stats
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Typography variant="body2">
                                        <TrendingUp fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                                        Active Events: <strong>{stats.active_events}</strong>
                                    </Typography>
                                    <Typography variant="body2">
                                        <AttachMoney fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                                        Avg Revenue/Event: <strong>₹{stats.total_events > 0 ? (stats.total_revenue / stats.total_events).toFixed(0) : 0}</strong>
                                    </Typography>
                                    {stats.recent_registrations !== undefined && (
                                        <Typography variant="body2">
                                            <BarChart fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                                            New This Week: <strong>{stats.recent_registrations}</strong>
                                        </Typography>
                                    )}
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                </>
            )}

            {/* Tabs */}
            <Paper sx={{ borderRadius: 3, minHeight: 'calc(100vh - 300px)', display: 'flex', flexDirection: 'column' }}>
                <Tabs
                    value={tab}
                    onChange={(_, v) => setTab(v)}
                    sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
                >
                    <Tab icon={<People />} label="Users" iconPosition="start" />
                    <Tab icon={<Event />} label="Events" iconPosition="start" />
                    <Tab icon={<History />} label="Audit Logs" iconPosition="start" />
                </Tabs>

                <Box sx={{ p: 3, flexGrow: 1 }}>
                    <TabPanel value={tab} index={0}>
                        <UsersTab />
                    </TabPanel>

                    <TabPanel value={tab} index={1}>
                        <EventsAdminTab />
                    </TabPanel>

                    <TabPanel value={tab} index={2}>
                        <AuditLogsTab />
                    </TabPanel>
                </Box>
            </Paper>
        </Container>
    )
}

// ---------------------------------------------------------------------------
// Events Admin Tab
// ---------------------------------------------------------------------------
function EventsAdminTab() {
    const queryClient = useQueryClient()
    const [cloneDialog, setCloneDialog] = useState<{ eventId: string; name: string } | null>(null)
    const [reassignDialog, setReassignDialog] = useState<{ eventId: string; name: string } | null>(null)
    const [newOrganizerId, setNewOrganizerId] = useState('')
    const [createDialog, setCreateDialog] = useState(false)
    const [wizardStep, setWizardStep] = useState(0)

    type NewEventForm = {
        name: string
        description: string
        event_type: EventType
        venue: string
        max_participants: number
        start_date: string
        end_date: string
        registration_deadline: string
        registration_fee: number
    }

    const [newEvent, setNewEvent] = useState<NewEventForm>({
        name: '',
        description: '',
        event_type: 'other',
        venue: '',
        max_participants: 50,
        start_date: '',
        end_date: '',
        registration_deadline: '',
        registration_fee: 0,
    })

    const { data: events, isLoading } = useQuery({
        queryKey: ['admin-events'],
        queryFn: () => adminApi.listAllEvents(),
    })

    const { data: organizers } = useQuery({
        queryKey: ['organizers'],
        queryFn: () => adminApi.listUsers({ role: 'organizer' }),
    })

    const cloneMutation = useMutation({
        mutationFn: ({ eventId, newName }: { eventId: string; newName: string }) => adminApi.cloneEvent(eventId, newName),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-events'] })
            setCloneDialog(null)
        },
    })

    const createMutation = useMutation({
        mutationFn: (data: NewEventForm) => eventsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-events'] })
            setCreateDialog(false)
            setWizardStep(0)
            setNewEvent({
                name: '', description: '', event_type: 'other', venue: '',
                max_participants: 50, start_date: '', end_date: '',
                registration_deadline: '', registration_fee: 0,
            })
        },
    })

    const reassignMutation = useMutation({
        mutationFn: ({ eventId, organizerId }: { eventId: string; organizerId: string }) => adminApi.reassignEvent(eventId, organizerId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-events'] })
            setReassignDialog(null)
            setNewOrganizerId('')
        },
    })

    const getStatusColor = (status: string): ChipColor => {
        switch (status) {
            case 'published': return 'success'
            case 'draft': return 'default'
            case 'ongoing': return 'info'
            case 'completed': return 'primary'
            case 'cancelled': return 'error'
            default: return 'default'
        }
    }

    return isLoading ? <CircularProgress /> : (
        <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">All Events</Typography>
                <Button variant="contained" startIcon={<Add />} onClick={() => setCreateDialog(true)}>
                    Create Event
                </Button>
            </Box>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Event Name</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Start Date</TableCell>
                            <TableCell>Organizer ID</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {events?.map((evt) => (
                            <TableRow key={evt.id}>
                                <TableCell>{evt.name}</TableCell>
                                <TableCell>{evt.event_type}</TableCell>
                                <TableCell>
                                    <Chip label={evt.status} color={getStatusColor(evt.status)} size="small" />
                                </TableCell>
                                <TableCell>{new Date(evt.start_date).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                        {evt.organizer_id.substring(0, 8)}…
                                    </Typography>
                                </TableCell>
                                <TableCell align="right">
                                    <Tooltip title="Clone event">
                                        <IconButton size="small" onClick={() => setCloneDialog({ eventId: evt.id, name: evt.name + ' (Copy)' })}>
                                            <ContentCopy fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Reassign organizer">
                                        <IconButton size="small" onClick={() => setReassignDialog({ eventId: evt.id, name: evt.name })}>
                                            <SwapHoriz fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                        {events?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 8, border: 0 }}>
                                    <EventBusy sx={{ fontSize: 56, color: 'text.secondary', opacity: 0.4, mb: 1 }} />
                                    <Typography variant="h6" color="text.secondary" gutterBottom>
                                        No events yet
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.7 }}>
                                        Events created by organizers will appear here
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Clone Event Dialog */}
            <Dialog open={!!cloneDialog} onClose={() => setCloneDialog(null)}>
                <DialogTitle>📋 Clone Event</DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 2 }}>
                        Creating a copy of: <strong>{cloneDialog?.name}</strong>
                    </Typography>
                    <TextField
                        autoFocus
                        fullWidth
                        label="New Event Name"
                        value={cloneDialog?.name || ''}
                        onChange={(e) => setCloneDialog({ eventId: cloneDialog!.eventId, name: e.target.value })}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCloneDialog(null)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={() => cloneDialog && cloneMutation.mutate({ eventId: cloneDialog.eventId, newName: cloneDialog.name })}
                        disabled={cloneMutation.isPending || !cloneDialog?.name}
                    >
                        {cloneMutation.isPending ? 'Cloning...' : 'Clone Event'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Reassign Organizer Dialog */}
            <Dialog open={!!reassignDialog} onClose={() => { setReassignDialog(null); setNewOrganizerId('') }}>
                <DialogTitle>🔄 Reassign Event Organizer</DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 2 }}>
                        Reassigning: <strong>{reassignDialog?.name}</strong>
                    </Typography>
                    <FormControl fullWidth>
                        <InputLabel>New Organizer</InputLabel>
                        <Select
                            value={newOrganizerId}
                            label="New Organizer"
                            onChange={(e) => setNewOrganizerId(e.target.value)}
                        >
                            {organizers?.map(org => (
                                <MenuItem key={org.id} value={org.id}>
                                    {org.first_name} {org.last_name} ({org.email})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setReassignDialog(null); setNewOrganizerId('') }}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={() => reassignDialog && newOrganizerId && reassignMutation.mutate({ eventId: reassignDialog.eventId, organizerId: newOrganizerId })}
                        disabled={reassignMutation.isPending || !newOrganizerId}
                    >
                        {reassignMutation.isPending ? 'Reassigning...' : 'Reassign'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Quick Create Event Wizard */}
            <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    🎯 Quick Create Event
                    <Typography variant="caption" display="block" color="text.secondary">
                        Step {wizardStep + 1} of 2
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    {wizardStep === 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                            <TextField
                                label="Event Name"
                                value={newEvent.name}
                                onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                                fullWidth
                                required
                            />
                            <FormControl fullWidth>
                                <InputLabel>Event Type</InputLabel>
                                <Select
                                    value={newEvent.event_type}
                                    label="Event Type"
                                    onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value as EventType })}
                                >
                                    <MenuItem value="sports">Sports</MenuItem>
                                    <MenuItem value="tech_fest">Tech Fest</MenuItem>
                                    <MenuItem value="cultural">Cultural</MenuItem>
                                    <MenuItem value="hackathon">Hackathon</MenuItem>
                                    <MenuItem value="workshop">Workshop</MenuItem>
                                    <MenuItem value="seminar">Seminar</MenuItem>
                                    <MenuItem value="other">Other</MenuItem>
                                </Select>
                            </FormControl>
                            <TextField
                                label="Description"
                                value={newEvent.description}
                                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                                multiline
                                rows={2}
                                fullWidth
                            />
                            <TextField
                                label="Venue"
                                value={newEvent.venue}
                                onChange={(e) => setNewEvent({ ...newEvent, venue: e.target.value })}
                                fullWidth
                                required
                            />
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                            <TextField
                                label="Start Date"
                                type="datetime-local"
                                value={newEvent.start_date}
                                onChange={(e) => setNewEvent({ ...newEvent, start_date: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                                required
                            />
                            <TextField
                                label="End Date"
                                type="datetime-local"
                                value={newEvent.end_date}
                                onChange={(e) => setNewEvent({ ...newEvent, end_date: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                                required
                            />
                            <TextField
                                label="Registration Deadline"
                                type="datetime-local"
                                value={newEvent.registration_deadline}
                                onChange={(e) => setNewEvent({ ...newEvent, registration_deadline: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                                required
                            />
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <TextField
                                        label="Max Participants"
                                        type="number"
                                        value={newEvent.max_participants}
                                        onChange={(e) => setNewEvent({ ...newEvent, max_participants: parseInt(e.target.value) || 50 })}
                                        fullWidth
                                        required
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        label="Registration Fee (₹)"
                                        type="number"
                                        value={newEvent.registration_fee}
                                        onChange={(e) => setNewEvent({ ...newEvent, registration_fee: parseFloat(e.target.value) || 0 })}
                                        fullWidth
                                    />
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
                    {wizardStep > 0 && (
                        <Button onClick={() => setWizardStep(0)}>Back</Button>
                    )}
                    {wizardStep < 1 ? (
                        <Button variant="contained" onClick={() => setWizardStep(1)}>Next</Button>
                    ) : (
                        <Button
                            variant="contained"
                            onClick={() => createMutation.mutate(newEvent)}
                            disabled={createMutation.isPending || !newEvent.name || !newEvent.venue}
                        >
                            {createMutation.isPending ? 'Creating...' : 'Create Event'}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </>
    )
}
