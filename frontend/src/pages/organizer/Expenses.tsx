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
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material'
import {
    AttachMoney,
    FilterList,
    Refresh,
    Receipt,
    TrendingUp,
    Category,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts'
import { organizerApi } from '../../services/api'
import { useAuthStore, isOrganizer } from '../../store'
import { Navigate } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Expense {
    id: string
    event_id: string
    event_name: string
    category: string
    description: string
    amount: number
    date: string
    receipt?: string
    created_by_id?: string
    created_at: string
}

interface CategoryBreakdown {
    category: string
    count: number
    total: number
}



// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#4ECDC4']

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------
function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

function formatCurrency(amount: number): string {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

// ---------------------------------------------------------------------------
// Category Pie Chart
// ---------------------------------------------------------------------------
function CategoryPieChart({ categories }: { categories: CategoryBreakdown[] }) {
    const data = categories.map((cat) => ({
        name: cat.category || 'Uncategorized',
        value: cat.total,
        count: cat.count,
    }))

    if (data.length === 0) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography color="text.secondary">No expense data</Typography>
            </Box>
        )
    }

    return (
        <ResponsiveContainer width="100%" height={250}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                    {data.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    )
}

// ---------------------------------------------------------------------------
// Expense by Event Chart
// ---------------------------------------------------------------------------
function ExpenseByEventChart({ expenses }: { expenses: Expense[] }) {
    // Group by event
    const eventTotals: Record<string, number> = {}
    expenses.forEach((exp) => {
        const name = exp.event_name || 'Unknown Event'
        eventTotals[name] = (eventTotals[name] || 0) + exp.amount
    })

    const data = Object.entries(eventTotals)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)

    if (data.length === 0) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography color="text.secondary">No expense data</Typography>
            </Box>
        )
    }

    return (
        <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => `₹${value}`} />
                <YAxis type="category" dataKey="name" width={120} />
                <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="total" fill="#8884d8" name="Expenses" />
            </BarChart>
        </ResponsiveContainer>
    )
}

// ---------------------------------------------------------------------------
// Stats Cards
// ---------------------------------------------------------------------------
function StatsCards({
    totalAmount,
    categoryCount,
    expenseCount,
    eventsWithExpenses
}: {
    totalAmount: number
    categoryCount: number
    expenseCount: number
    eventsWithExpenses: number
}) {
    const stats = [
        { title: 'Total Expenses', value: formatCurrency(totalAmount), color: 'error.main', icon: <AttachMoney /> },
        { title: 'Categories', value: categoryCount, color: 'primary.main', icon: <Category /> },
        { title: 'Transactions', value: expenseCount, color: 'info.main', icon: <Receipt /> },
        { title: 'Events', value: eventsWithExpenses, color: 'warning.main', icon: <TrendingUp /> },
    ]

    return (
        <Grid container spacing={3} sx={{ mb: 3 }}>
            {stats.map((stat) => (
                <Grid item xs={6} sm={3} key={stat.title}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Box sx={{ color: stat.color, mb: 1 }}>{stat.icon}</Box>
                            <Typography variant="h5" sx={{ color: stat.color, fontWeight: 700 }}>
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
// Main Expenses Page
// ---------------------------------------------------------------------------
export default function ExpensesPage() {
    const { user } = useAuthStore()

    // Redirect if not an organizer
    if (!isOrganizer(user)) {
        return <Navigate to="/dashboard" replace />
    }

    // Filter state
    const [eventFilter, setEventFilter] = useState<string>('')
    const [categoryFilter, setCategoryFilter] = useState<string>('')
    const [page, setPage] = useState(0)
    const [rowsPerPage, setRowsPerPage] = useState(25)
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
    const [detailDialogOpen, setDetailDialogOpen] = useState(false)

    // Fetch expenses
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['organizer-expenses', eventFilter, categoryFilter, page, rowsPerPage],
        queryFn: () => organizerApi.listExpenses({
            event_id: eventFilter || undefined,
            category: categoryFilter || undefined,
            limit: rowsPerPage,
            offset: page * rowsPerPage,
        }),
    })

    const expenses = data?.expenses || []
    const total = data?.total || 0
    const totalAmount = data?.total_amount || 0
    const categories = data?.categories || []
    const events = data?.events || []

    // Get unique categories from data
    const uniqueCategories = categories.map((c) => c.category)

    // Count events with expenses
    const eventsWithExpenses = new Set(expenses.map((e) => e.event_id)).size

    const handleChangePage = (_: unknown, newPage: number) => {
        setPage(newPage)
    }

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10))
        setPage(0)
    }

    const handleViewDetails = (expense: Expense) => {
        setSelectedExpense(expense)
        setDetailDialogOpen(true)
    }

    const clearFilters = () => {
        setEventFilter('')
        setCategoryFilter('')
        setPage(0)
    }

    if (error) {
        return (
            <Container maxWidth="xl" sx={{ py: 4 }}>
                <Alert severity="error">
                    Failed to load expenses. Please try again later.
                </Alert>
            </Container>
        )
    }

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                    💰 Expense Tracking
                </Typography>
                <Tooltip title="Refresh">
                    <IconButton onClick={() => refetch()}>
                        <Refresh />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Stats Cards */}
            <StatsCards
                totalAmount={totalAmount}
                categoryCount={categories.length}
                expenseCount={total}
                eventsWithExpenses={eventsWithExpenses}
            />

            {/* Charts Row */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, height: 350 }}>
                        <Typography variant="h6" gutterBottom>
                            Expenses by Category
                        </Typography>
                        <CategoryPieChart categories={categories} />
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, height: 350 }}>
                        <Typography variant="h6" gutterBottom>
                            Top Events by Expenses
                        </Typography>
                        <ExpenseByEventChart expenses={expenses} />
                    </Paper>
                </Grid>
            </Grid>

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                    <FilterList color="action" />

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

                    {/* Category Filter */}
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                        <InputLabel>Category</InputLabel>
                        <Select
                            value={categoryFilter}
                            label="Category"
                            onChange={(e) => {
                                setCategoryFilter(e.target.value)
                                setPage(0)
                            }}
                        >
                            <MenuItem value="">All Categories</MenuItem>
                            {uniqueCategories.map((cat) => (
                                <MenuItem key={cat} value={cat}>
                                    {cat || 'Uncategorized'}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Clear Filters */}
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={clearFilters}
                        disabled={!eventFilter && !categoryFilter}
                    >
                        Clear Filters
                    </Button>
                </Box>
            </Paper>

            {/* Expenses Table */}
            <Paper>
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : expenses.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                        <Receipt sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                            No expenses found
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {eventFilter || categoryFilter
                                ? 'Try adjusting your filters'
                                : 'Add expenses to your events to see them here'}
                        </Typography>
                    </Box>
                ) : (
                    <>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Description</TableCell>
                                        <TableCell>Event</TableCell>
                                        <TableCell>Category</TableCell>
                                        <TableCell>Date</TableCell>
                                        <TableCell align="right">Amount</TableCell>
                                        <TableCell align="center">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {expenses.map((expense) => (
                                        <TableRow
                                            key={expense.id}
                                            hover
                                            sx={{ cursor: 'pointer' }}
                                            onClick={() => handleViewDetails(expense)}
                                        >
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {expense.description}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {expense.event_name}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={expense.category || 'Uncategorized'}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {formatDate(expense.date)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight={600} color="error.main">
                                                    {formatCurrency(expense.amount)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Tooltip title="View Details">
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleViewDetails(expense)
                                                        }}
                                                    >
                                                        <Receipt />
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
            <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Expense Details</DialogTitle>
                <DialogContent dividers>
                    {selectedExpense && (
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <Typography variant="caption" color="text.secondary">Description</Typography>
                                <Typography variant="body1">{selectedExpense.description}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Event</Typography>
                                <Typography variant="body1">{selectedExpense.event_name}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Category</Typography>
                                <Box>
                                    <Chip
                                        label={selectedExpense.category || 'Uncategorized'}
                                        size="small"
                                        variant="outlined"
                                    />
                                </Box>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Amount</Typography>
                                <Typography variant="h6" color="error.main">
                                    {formatCurrency(selectedExpense.amount)}
                                </Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Date</Typography>
                                <Typography variant="body1">{formatDate(selectedExpense.date)}</Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="caption" color="text.secondary">Created</Typography>
                                <Typography variant="body2">{formatDate(selectedExpense.created_at)}</Typography>
                            </Grid>
                            {selectedExpense.receipt && (
                                <Grid item xs={12}>
                                    <Typography variant="caption" color="text.secondary">Receipt</Typography>
                                    <Typography variant="body2">{selectedExpense.receipt}</Typography>
                                </Grid>
                            )}
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Container>
    )
}
