import { useState } from 'react'
import {
    Container,
    Typography,
    Tabs,
    Tab,
    Box,
    Paper,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Chip,
    IconButton,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tooltip,
    CircularProgress,
    Alert,
} from '@mui/material'
import {
    Delete,
    LockReset,
    Edit,
    Download,
    People,
    Event,
    History,
    BarChart,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../services/api'
import StatCard from '../../components/StatCard'
import type { User, AuditLog } from '../../types'

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

    const roleColor = (role: string) => {
        switch (role) {
            case 'super_admin': return 'error'
            case 'organizer': return 'primary'
            case 'captain': return 'warning'
            default: return 'default'
        }
    }

    return (
        <>
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
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
            </Box>

            {isLoading ? <CircularProgress /> : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Role</TableCell>
                                <TableCell>Verified</TableCell>
                                <TableCell>Created</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users?.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>{user.first_name} {user.last_name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Chip label={user.role} color={roleColor(user.role) as any} size="small" />
                                    </TableCell>
                                    <TableCell>{user.is_verified ? '✅' : '❌'}</TableCell>
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

    const actionColor = (action: string) => {
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
                                        <Chip label={log.action} color={actionColor(log.action) as any} size="small" />
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
                                    <TableCell colSpan={4} align="center">No audit logs yet</TableCell>
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
            )}

            {/* Tabs */}
            <Paper sx={{ borderRadius: 3 }}>
                <Tabs
                    value={tab}
                    onChange={(_, v) => setTab(v)}
                    sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
                >
                    <Tab icon={<People />} label="Users" iconPosition="start" />
                    <Tab icon={<Event />} label="Events" iconPosition="start" />
                    <Tab icon={<History />} label="Audit Logs" iconPosition="start" />
                </Tabs>

                <Box sx={{ p: 3 }}>
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
    const { data: events, isLoading } = useQuery({
        queryKey: ['admin-events'],
        queryFn: () => adminApi.listAllEvents(),
    })

    const statusColor = (s: string) => {
        switch (s) {
            case 'published': return 'success'
            case 'draft': return 'default'
            case 'ongoing': return 'info'
            case 'completed': return 'primary'
            case 'cancelled': return 'error'
            default: return 'default'
        }
    }

    return isLoading ? <CircularProgress /> : (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Event Name</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Start Date</TableCell>
                        <TableCell>Organizer ID</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {events?.map((event) => (
                        <TableRow key={event.id}>
                            <TableCell>{event.name}</TableCell>
                            <TableCell>{event.event_type}</TableCell>
                            <TableCell>
                                <Chip label={event.status} color={statusColor(event.status) as any} size="small" />
                            </TableCell>
                            <TableCell>{new Date(event.start_date).toLocaleDateString()}</TableCell>
                            <TableCell>
                                <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                    {event.organizer_id.substring(0, 8)}…
                                </Typography>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    )
}
