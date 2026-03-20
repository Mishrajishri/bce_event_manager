import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    Chip,
    LinearProgress,
    Button,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Grid,
} from '@mui/material'
import {
    CheckCircle as CheckCircleIcon,
    Schedule as ScheduleIcon,
    Warning as WarningIcon,
    ArrowBack as ArrowBackIcon,
    Add as AddIcon,
    Edit as EditIcon,
} from '@mui/icons-material'
import { milestonesApi } from '../services/api'
import type { TeamMilestone, TeamMilestoneProgress, MilestoneSubmissionType } from '../types'

const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
    pending: 'default',
    in_progress: 'primary',
    submitted: 'warning',
    approved: 'success',
    rejected: 'error',
}

const statusIcons = {
    pending: <ScheduleIcon />,
    in_progress: <EditIcon />,
    submitted: <WarningIcon />,
    approved: <CheckCircleIcon />,
    rejected: <WarningIcon />,
}

export default function MilestoneTracker() {
    const { teamId } = useParams<{ teamId: string }>()
    const navigate = useNavigate()
    const [milestones, setMilestones] = useState<TeamMilestone[]>([])
    const [progress, setProgress] = useState<TeamMilestoneProgress | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [submitDialog, setSubmitDialog] = useState<{ open: boolean; milestone: TeamMilestone | null }>({
        open: false,
        milestone: null,
    })
    const [submission, setSubmission] = useState({
        submission_type: '' as MilestoneSubmissionType | '',
        submission_url: '',
        submission_notes: '',
    })

    useEffect(() => {
        if (teamId) {
            loadMilestones()
            loadProgress()
        }
    }, [teamId])

    const loadMilestones = async () => {
        try {
            setLoading(true)
            const data = await milestonesApi.listTeamMilestones(teamId!)
            setMilestones(data)
        } catch (err: any) {
            setError(err.message || 'Failed to load milestones')
        } finally {
            setLoading(false)
        }
    }

    const loadProgress = async () => {
        try {
            const data = await milestonesApi.getTeamProgress(teamId!)
            setProgress(data)
        } catch (err: any) {
            console.error('Failed to load progress:', err)
        }
    }

    const handleSubmitMilestone = async () => {
        if (!submitDialog.milestone || !submission.submission_type || !submission.submission_url) return

        try {
            await milestonesApi.updateTeamMilestone(submitDialog.milestone.team_id, submitDialog.milestone.id, {
                status: 'submitted',
                submission_link: submission.submission_url,
                submission_notes: submission.submission_notes,
            })
            setSubmitDialog({ open: false, milestone: null })
            setSubmission({ submission_type: '', submission_url: '', submission_notes: '' })
            loadMilestones()
            loadProgress()
        } catch (err: any) {
            setError(err.message || 'Failed to submit milestone')
        }
    }

    const openSubmitDialog = (milestone: TeamMilestone) => {
        setSubmitDialog({ open: true, milestone })
        setSubmission({
            submission_type: '',
            submission_url: milestone.submission_link || '',
            submission_notes: milestone.submission_notes || '',
        })
    }

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <LinearProgress />
            </Container>
        )
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h4" component="h1">
                    Milestone Tracker
                </Typography>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {/* Progress Summary */}
            {progress && (
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} md={4}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Overall Progress
                                </Typography>
                                <Typography variant="h3">
                                    {Math.round((progress.completed_milestones / Math.max(progress.total_milestones, 1)) * 100)}%
                                </Typography>
                                <LinearProgress
                                    variant="determinate"
                                    value={(progress.completed_milestones / Math.max(progress.total_milestones, 1)) * 100}
                                    sx={{ mt: 1, height: 8, borderRadius: 4 }}
                                />
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Points Earned
                                </Typography>
                                <Typography variant="h3">
                                    {progress.earned_points} / {progress.total_points}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    {progress.completed_milestones} completed, {progress.submitted_milestones} submitted
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Status
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {progress.overdue_count > 0 && (
                                        <Chip label={`${progress.overdue_count} Overdue`} color="error" size="small" />
                                    )}
                                    {progress.in_progress_milestones > 0 && (
                                        <Chip label={`${progress.in_progress_milestones} In Progress`} color="primary" size="small" />
                                    )}
                                    {progress.pending_milestones > 0 && (
                                        <Chip label={`${progress.pending_milestones} Pending`} size="small" />
                                    )}
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Milestones List */}
            <Typography variant="h5" gutterBottom>
                Milestones
            </Typography>

            {milestones.length === 0 ? (
                <Alert severity="info">No milestones defined for this event yet.</Alert>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Milestone</TableCell>
                                <TableCell>Due Date</TableCell>
                                <TableCell>Points</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {milestones.map((milestone) => (
                                <TableRow key={milestone.id}>
                                    <TableCell>
                                        <Typography variant="body1" fontWeight={500}>
                                            {milestone.milestone_name}
                                        </Typography>
                                        {milestone.milestone_is_required && (
                                            <Chip label="Required" size="small" color="error" sx={{ ml: 1 }} />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {milestone.milestone_due_date
                                            ? new Date(milestone.milestone_due_date).toLocaleDateString()
                                            : '-'}
                                    </TableCell>
                                    <TableCell>{milestone.milestone_point_value || 0}</TableCell>
                                    <TableCell>
                                        <Chip
                                            icon={statusIcons[milestone.status as keyof typeof statusIcons]}
                                            label={milestone.status.replace('_', ' ')}
                                            color={statusColors[milestone.status]}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {milestone.status === 'pending' && (
                                            <Button
                                                variant="contained"
                                                size="small"
                                                startIcon={<AddIcon />}
                                                onClick={() => openSubmitDialog(milestone)}
                                            >
                                                Start
                                            </Button>
                                        )}
                                        {milestone.status === 'in_progress' && (
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                size="small"
                                                onClick={() => openSubmitDialog(milestone)}
                                            >
                                                Submit
                                            </Button>
                                        )}
                                        {milestone.status === 'submitted' && (
                                            <Typography variant="body2" color="textSecondary">
                                                Awaiting review
                                            </Typography>
                                        )}
                                        {milestone.status === 'approved' && (
                                            <Chip label={`+${milestone.points_earned} pts`} color="success" size="small" />
                                        )}
                                        {milestone.status === 'rejected' && (
                                            <Box>
                                                <Typography variant="body2" color="error" gutterBottom>
                                                    Rejected
                                                </Typography>
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    onClick={() => openSubmitDialog(milestone)}
                                                >
                                                    Resubmit
                                                </Button>
                                            </Box>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Submit Dialog */}
            <Dialog open={submitDialog.open} onClose={() => setSubmitDialog({ open: false, milestone: null })} maxWidth="sm" fullWidth>
                <DialogTitle>
                    Submit Milestone: {submitDialog.milestone?.milestone_name}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <FormControl fullWidth>
                            <InputLabel>Submission Type</InputLabel>
                            <Select
                                value={submission.submission_type}
                                label="Submission Type"
                                onChange={(e) => setSubmission({ ...submission, submission_type: e.target.value as MilestoneSubmissionType })}
                            >
                                <MenuItem value="github">GitHub Repository</MenuItem>
                                <MenuItem value="demo_video">Demo Video</MenuItem>
                                <MenuItem value="pitch_deck">Pitch Deck</MenuItem>
                                <MenuItem value="document">Document</MenuItem>
                                <MenuItem value="other">Other</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label="Submission URL"
                            fullWidth
                            value={submission.submission_url}
                            onChange={(e) => setSubmission({ ...submission, submission_url: e.target.value })}
                            placeholder="https://github.com/your-repo or https://youtube.com/watch?v=..."
                        />
                        <TextField
                            label="Notes"
                            fullWidth
                            multiline
                            rows={3}
                            value={submission.submission_notes}
                            onChange={(e) => setSubmission({ ...submission, submission_notes: e.target.value })}
                            placeholder="Describe what you've accomplished..."
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSubmitDialog({ open: false, milestone: null })}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmitMilestone}
                        disabled={!submission.submission_type || !submission.submission_url}
                    >
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    )
}
