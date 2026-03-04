import { useState } from 'react'
import {
    Container,
    Typography,
    Grid,
    Paper,
    Box,
    Card,
    CardContent,
    CircularProgress,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    LinearProgress,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Divider,
} from '@mui/material'
import {
    TrendingUp,
    People,
    AttachMoney,
    Event,
    CheckCircle,
    Schedule,
    TrendingDown,
    TrendingFlat,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    FunnelChart,
    Funnel,
    LabelList,
} from 'recharts'
import { organizerApi } from '../../services/api'
import { useAuthStore, isOrganizer } from '../../store'
import { Navigate } from 'react-router-dom'
import type { OrganizerAnalytics, EventPerformance, RecentActivity } from '../../types'

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

// ---------------------------------------------------------------------------
// Stat Card Component
// ---------------------------------------------------------------------------
interface StatCardProps {
    title: string
    value: string | number
    icon: React.ReactNode
    subtitle?: string
    trend?: 'up' | 'down' | 'stable'
}

function StatCard({ title, value, icon, subtitle, trend }: StatCardProps) {
    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ color: 'primary.main', mr: 2 }}>{icon}</Box>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        {title}
                    </Typography>
                    {trend && (
                        <Box sx={{ color: trend === 'up' ? 'success.main' : trend === 'down' ? 'error.main' : 'text.secondary' }}>
                            {trend === 'up' ? <TrendingUp /> : trend === 'down' ? <TrendingDown /> : <TrendingFlat />}
                        </Box>
                    )}
                </Box>
                <Typography variant="h4" component="div" sx={{ fontWeight: 700 }}>
                    {value}
                </Typography>
                {subtitle && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {subtitle}
                    </Typography>
                )}
            </CardContent>
        </Card>
    )
}

// ---------------------------------------------------------------------------
// Overview Stats Section
// ---------------------------------------------------------------------------
function OverviewStats({ data }: { data: OrganizerAnalytics['overview'] }) {
    return (
        <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
                <StatCard
                    title="Total Events"
                    value={data.total_events}
                    icon={<Event fontSize="large" />}
                    subtitle={`${data.active_events} active, ${data.draft_events} draft`}
                />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <StatCard
                    title="Registrations"
                    value={data.total_registrations.toLocaleString()}
                    icon={<People fontSize="large" />}
                    subtitle={`${data.confirmed_registrations} confirmed • ${data.checkin_rate}% check-in`}
                    trend="up"
                />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <StatCard
                    title="Revenue"
                    value={`₹${data.total_revenue.toLocaleString()}`}
                    icon={<AttachMoney fontSize="large" />}
                    subtitle={`${data.collection_rate}% collection rate`}
                    trend={data.total_revenue > data.total_expenses ? 'up' : 'down'}
                />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <StatCard
                    title="Budget Used"
                    value={`${data.budget_utilization}%`}
                    icon={<TrendingUp fontSize="large" />}
                    subtitle={`₹${data.total_expenses.toLocaleString()} expenses`}
                    trend={data.budget_utilization > 80 ? 'down' : 'stable'}
                />
            </Grid>
        </Grid>
    )
}

// ---------------------------------------------------------------------------
// Registration Trends Chart
// ---------------------------------------------------------------------------
function RegistrationTrendsChart({ data }: { data: OrganizerAnalytics['registration_trends'] }) {
    return (
        <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
                Registration Trends (30 Days)
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="date"
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis />
                    <Tooltip
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        formatter={(value: number, name: string) => [value, name === 'registrations' ? 'Registrations' : 'Check-ins']}
                    />
                    <Line type="monotone" dataKey="registrations" stroke="#8884d8" name="Registrations" strokeWidth={2} />
                    <Line type="monotone" dataKey="checkins" stroke="#82ca9d" name="Check-ins" strokeWidth={2} />
                </LineChart>
            </ResponsiveContainer>
        </Paper>
    )
}

// ---------------------------------------------------------------------------
// Revenue by Event Chart
// ---------------------------------------------------------------------------
function RevenueByEventChart({ data }: { data: OrganizerAnalytics['revenue_by_event'] }) {
    return (
        <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
                Revenue by Event
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
                <BarChart data={data} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(value) => `₹${value}`} />
                    <YAxis type="category" dataKey="event_name" width={150} />
                    <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                    <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
                    <Bar dataKey="target" fill="#82ca9d" name="Target" />
                </BarChart>
            </ResponsiveContainer>
        </Paper>
    )
}

// ---------------------------------------------------------------------------
// Payment Breakdown Chart
// ---------------------------------------------------------------------------
function PaymentBreakdownChart({ data }: { data: OrganizerAnalytics['payment_breakdown'] }) {
    // Note: total unused but kept for potential future use in displaying sum
    // const total = data.reduce((sum, item) => sum + item.count, 0)

    return (
        <Paper sx={{ p: 3, height: 350 }}>
            <Typography variant="h6" gutterBottom>
                Payment Status
            </Typography>
            <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ status, percent }) => `${status}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="status"
                    >
                        {data.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value: number, _name: string, props: any) => {
                        const item = data[props.payload.index]
                        return [`${value} (${item.amount ? `₹${item.amount.toLocaleString()}` : '₹0'})`, item.status]
                    }} />
                </PieChart>
            </ResponsiveContainer>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                {data.map((item, index) => (
                    <Box key={item.status} sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ width: 12, height: 12, backgroundColor: COLORS[index % COLORS.length], mr: 1 }} />
                        <Typography variant="caption">
                            {item.status} ({item.count})
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Paper>
    )
}

// ---------------------------------------------------------------------------
// Attendance Funnel
// ---------------------------------------------------------------------------
function AttendanceFunnelChart({ data }: { data: OrganizerAnalytics['attendance_funnel'] }) {
    const funnelData = data.map((item, index) => ({
        ...item,
        fill: COLORS[index % COLORS.length],
    }))

    return (
        <Paper sx={{ p: 3, height: 350 }}>
            <Typography variant="h6" gutterBottom>
                Attendance Funnel
            </Typography>
            <ResponsiveContainer width="100%" height="80%">
                <FunnelChart>
                    <Tooltip />
                    <Funnel
                        dataKey="count"
                        data={funnelData}
                        isAnimationActive
                        nameKey="stage"
                    >
                        <LabelList position="inside" fill="#fff" stroke="none" dataKey="stage" />
                        {funnelData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Funnel>
                </FunnelChart>
            </ResponsiveContainer>
        </Paper>
    )
}

// ---------------------------------------------------------------------------
// Events Performance Table
// ---------------------------------------------------------------------------
function EventsPerformanceTable({ data }: { data: EventPerformance[] }) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'published': return 'success'
            case 'ongoing': return 'info'
            case 'completed': return 'primary'
            case 'draft': return 'default'
            case 'cancelled': return 'error'
            default: return 'default'
        }
    }

    return (
        <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
                Event Performance
            </Typography>
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Event</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Registrations</TableCell>
                            <TableCell>Fill Rate</TableCell>
                            <TableCell align="right">Revenue</TableCell>
                            <TableCell align="right">Profit</TableCell>
                            <TableCell align="center">Check-in</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.map((event) => (
                            <TableRow key={event.event_id}>
                                <TableCell>
                                    <Box>
                                        <Typography variant="body2" fontWeight={600}>
                                            {event.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {event.type} • {new Date(event.start_date).toLocaleDateString()}
                                        </Typography>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Chip label={event.status} color={getStatusColor(event.status) as any} size="small" />
                                </TableCell>
                                <TableCell align="right">
                                    {event.registrations.toLocaleString()} / {event.capacity.toLocaleString()}
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <LinearProgress
                                            variant="determinate"
                                            value={event.fill_rate}
                                            sx={{ width: 60, height: 6, borderRadius: 3 }}
                                            color={event.fill_rate > 80 ? 'success' : event.fill_rate > 50 ? 'warning' : 'error'}
                                        />
                                        <Typography variant="caption">{event.fill_rate.toFixed(0)}%</Typography>
                                    </Box>
                                </TableCell>
                                <TableCell align="right">₹{event.revenue.toLocaleString()}</TableCell>
                                <TableCell align="right">
                                    <Typography
                                        variant="body2"
                                        color={event.profit >= 0 ? 'success.main' : 'error.main'}
                                        fontWeight={600}
                                    >
                                        {event.profit >= 0 ? '+' : ''}₹{event.profit.toLocaleString()}
                                    </Typography>
                                </TableCell>
                                <TableCell align="center">
                                    <Chip
                                        icon={<CheckCircle fontSize="small" />}
                                        label={`${event.checkin_rate}%`}
                                        size="small"
                                        color={event.checkin_rate > 70 ? 'success' : event.checkin_rate > 40 ? 'warning' : 'error'}
                                        variant="outlined"
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    )
}

// ---------------------------------------------------------------------------
// Recent Activity Feed
// ---------------------------------------------------------------------------
function RecentActivityFeed({ data }: { data: RecentActivity[] }) {
    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'registration': return <Event />
            case 'checkin': return <CheckCircle />
            case 'payment': return <AttachMoney />
            default: return <Schedule />
        }
    }

    return (
        <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
                Recent Activity
            </Typography>
            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                {data.map((activity, index) => (
                    <div key={activity.id}>
                        <ListItem alignItems="flex-start">
                            <ListItemAvatar>
                                <Avatar sx={{ bgcolor: 'primary.light' }}>
                                    {getActivityIcon(activity.type)}
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                                primary={activity.description}
                                secondary={
                                    <Box component="span" sx={{ display: 'flex', flexDirection: 'column' }}>
                                        <Typography variant="caption" component="span" color="text.secondary">
                                            {activity.user_name && `by ${activity.user_name} • `}
                                            {new Date(activity.timestamp).toLocaleString()}
                                        </Typography>
                                        {activity.event_name && (
                                            <Typography variant="caption" component="span" color="primary">
                                                {activity.event_name}
                                            </Typography>
                                        )}
                                    </Box>
                                }
                            />
                        </ListItem>
                        {index < data.length - 1 && <Divider variant="inset" component="li" />}
                    </div>
                ))}
            </List>
        </Paper>
    )
}

// ---------------------------------------------------------------------------
// Main Analytics Page
// ---------------------------------------------------------------------------
export default function OrganizerAnalyticsPage() {
    const { user } = useAuthStore()
    const [timeRange] = useState('30d')

    // Redirect if not an organizer
    if (!isOrganizer(user)) {
        return <Navigate to="/dashboard" replace />
    }

    const { data: analytics, isLoading, error } = useQuery({
        queryKey: ['organizer-analytics', timeRange],
        queryFn: () => organizerApi.getAnalytics(),
    })

    if (isLoading) {
        return (
            <Container maxWidth="xl" sx={{ py: 4, textAlign: 'center' }}>
                <CircularProgress />
                <Typography sx={{ mt: 2 }}>Loading analytics...</Typography>
            </Container>
        )
    }

    if (error) {
        return (
            <Container maxWidth="xl" sx={{ py: 4 }}>
                <Alert severity="error">
                    Failed to load analytics data. Please try again later.
                </Alert>
            </Container>
        )
    }

    if (!analytics) {
        return (
            <Container maxWidth="xl" sx={{ py: 4 }}>
                <Alert severity="info">
                    No analytics data available. Create events to see analytics.
                </Alert>
            </Container>
        )
    }

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                    📊 Organizer Analytics
                </Typography>
            </Box>

            {/* Overview Stats */}
            <OverviewStats data={analytics.overview} />

            {/* Charts Row 1 */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} lg={8}>
                    <RegistrationTrendsChart data={analytics.registration_trends} />
                </Grid>
                <Grid item xs={12} lg={4}>
                    <RecentActivityFeed data={analytics.recent_activity} />
                </Grid>
            </Grid>

            {/* Charts Row 2 */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                    <RevenueByEventChart data={analytics.revenue_by_event} />
                </Grid>
                <Grid item xs={12} md={3}>
                    <PaymentBreakdownChart data={analytics.payment_breakdown} />
                </Grid>
                <Grid item xs={12} md={3}>
                    <AttendanceFunnelChart data={analytics.attendance_funnel} />
                </Grid>
            </Grid>

            {/* Events Performance Table */}
            <EventsPerformanceTable data={analytics.events} />
        </Container>
    )
}
