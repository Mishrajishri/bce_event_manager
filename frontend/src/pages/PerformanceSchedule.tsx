
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Typography, Box, Paper, Grid, Card, CardContent,
    Button, Chip, CircularProgress, TextField, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material'
import { Add, GraphicEq } from '@mui/icons-material'
import { culturalApi } from '../services/api'
import { useAuthStore } from '../store'
import { PageContainer } from '../components/layout_components'

export default function PerformanceSchedule() {
    const { eventId } = useParams<{ eventId: string }>()
    const queryClient = useQueryClient()
    const { user } = useAuthStore()

    const [openDialog, setOpenDialog] = useState(false)
    const [performanceData, setPerformanceData] = useState({
        title: '',
        description: '',
        participant_id: user?.id || '',
        participant_type: 'individual',
        duration_minutes: 10
    })

    const { data: performances, isLoading } = useQuery({
        queryKey: ['performances', eventId],
        queryFn: () => culturalApi.listPerformances(eventId!),
        enabled: !!eventId,
    })

    const createMutation = useMutation({
        mutationFn: (data: any) => culturalApi.createPerformance(eventId!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['performances', eventId] })
            setOpenDialog(false)
        }
    })

    if (isLoading) return <CircularProgress />

    return (
        <PageContainer title="Performance Schedule">
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                    View and manage performance slots for this cultural fest.
                </Typography>
                <Button variant="contained" startIcon={<Add />} onClick={() => setOpenDialog(true)}>
                    Apply to Perform
                </Button>
            </Box>

            <Grid container spacing={3}>
                {performances?.map((perf) => (
                    <Grid item xs={12} key={perf.id}>
                        <Card variant="outlined">
                            <CardContent>
                                <Grid container alignItems="center" spacing={2}>
                                    <Grid item xs={12} sm={3}>
                                        <Typography variant="h6" color="primary">
                                            {perf.scheduled_start
                                                ? new Date(perf.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                : "TBA"}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Duration: {perf.duration_minutes} mins
                                        </Typography>
                                    </Grid>

                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="h6">{perf.title}</Typography>
                                        <Typography variant="body2" color="text.secondary">{perf.description}</Typography>
                                        <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                                            <Chip label={perf.status} size="small" color={perf.status === 'approved' ? 'success' : 'default'} />
                                            <Chip label={perf.participant_type} size="small" variant="outlined" />
                                        </Box>
                                    </Grid>

                                    <Grid item xs={12} sm={3} textAlign="right">
                                        {perf.status === 'approved' && (
                                            <Button size="small" variant="outlined" startIcon={<GraphicEq />}>
                                                Technical Rider
                                            </Button>
                                        )}
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}

                {performances?.length === 0 && (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 4, textAlign: 'center' }}>
                            <Typography color="text.secondary">No performances scheduled yet.</Typography>
                        </Paper>
                    </Grid>
                )}
            </Grid>

            {/* Application Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Performance Application</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            label="Performance Title"
                            fullWidth
                            value={performanceData.title}
                            onChange={(e) => setPerformanceData({ ...performanceData, title: e.target.value })}
                        />
                        <TextField
                            label="Description / Act Details"
                            fullWidth
                            multiline
                            rows={3}
                            value={performanceData.description}
                            onChange={(e) => setPerformanceData({ ...performanceData, description: e.target.value })}
                        />
                        <TextField
                            label="Estimated Duration (minutes)"
                            type="number"
                            fullWidth
                            value={performanceData.duration_minutes}
                            onChange={(e) => setPerformanceData({ ...performanceData, duration_minutes: parseInt(e.target.value) })}
                        />
                        <Typography variant="caption" color="text.secondary">
                            Note: All applications are subject to review by the event organizer.
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={() => createMutation.mutate(performanceData)} disabled={createMutation.isPending}>
                        Submit Application
                    </Button>
                </DialogActions>
            </Dialog>
        </PageContainer>
    )
}
