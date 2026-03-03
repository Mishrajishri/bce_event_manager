import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
    Typography, Box, Paper, Grid, TextField,
    Button, Divider, Avatar, Chip
} from '@mui/material'
import {
    Email, School, Edit, Save
} from '@mui/icons-material'
import { authApi } from '../services/api'
import { useAuthStore } from '../store'
import { PageContainer } from '../components/layout_components'
import { User } from '../types/index'

export default function Profile() {
    const { user, setAuth } = useAuthStore()
    const [editMode, setEditMode] = useState(false)
    const [formData, setFormData] = useState({
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        phone: user?.phone || '',
        enrollment_number: user?.enrollment_number || '',
        branch: user?.branch || '',
        year: user?.year || 1,
        college_name: user?.college_name || ''
    })

    const updateMutation = useMutation({
        mutationFn: (data: any) => authApi.updateProfile(data),
        onSuccess: (updatedUser: User) => {
            // Update local store as well
            setAuth(updatedUser, localStorage.getItem('access_token') || '', localStorage.getItem('refresh_token') || '')
            setEditMode(false)
            alert('Profile updated successfully!')
        }
    })


    if (!user) return <Typography>Please login.</Typography>

    return (
        <PageContainer title="My Profile">
            <Grid container spacing={4}>
                {/* Profile Summary Card */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 4, textAlign: 'center', height: '100%' }}>
                        <Avatar
                            sx={{ width: 100, height: 100, mx: 'auto', mb: 2, bgcolor: 'primary.main', fontSize: '2.5rem' }}
                        >
                            {user.first_name[0]}{user.last_name[0]}
                        </Avatar>
                        <Typography variant="h5">{user.first_name} {user.last_name}</Typography>
                        <Typography color="text.secondary" gutterBottom>{user.role.toUpperCase()}</Typography>
                        <Chip label={user.is_external ? 'External Student' : 'BCE Student'} sx={{ mt: 1 }} variant="outlined" />

                        <Box sx={{ mt: 4, textAlign: 'left' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Email sx={{ mr: 2, color: 'text.secondary' }} />
                                <Typography variant="body2">{user.email}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <School sx={{ mr: 2, color: 'text.secondary' }} />
                                <Typography variant="body2">{user.enrollment_number}</Typography>
                            </Box>
                        </Box>
                    </Paper>
                </Grid>

                {/* Edit Details */}
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 4 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                            <Typography variant="h6">Personal & Academic Details</Typography>
                            {!editMode ? (
                                <Button startIcon={<Edit />} onClick={() => setEditMode(true)}>Edit Profile</Button>
                            ) : (
                                <Box>
                                    <Button onClick={() => setEditMode(false)} sx={{ mr: 1 }}>Cancel</Button>
                                    <Button
                                        variant="contained"
                                        startIcon={<Save />}
                                        onClick={() => updateMutation.mutate(formData)}
                                        disabled={updateMutation.isPending}
                                    >
                                        Save Changes
                                    </Button>
                                </Box>
                            )}
                        </Box>

                        <Divider sx={{ mb: 4 }} />

                        <Grid container spacing={3}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="First Name"
                                    fullWidth
                                    disabled={!editMode}
                                    value={formData.first_name}
                                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Last Name"
                                    fullWidth
                                    disabled={!editMode}
                                    value={formData.last_name}
                                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Phone Number"
                                    fullWidth
                                    disabled={!editMode}
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Enrollment Number"
                                    fullWidth
                                    disabled={!editMode}
                                    value={formData.enrollment_number}
                                    onChange={(e) => setFormData({ ...formData, enrollment_number: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={8}>
                                <TextField
                                    label="Branch"
                                    fullWidth
                                    disabled={!editMode}
                                    value={formData.branch}
                                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    label="Year"
                                    type="number"
                                    fullWidth
                                    disabled={!editMode}
                                    value={formData.year}
                                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    label="College Name"
                                    fullWidth
                                    disabled={!editMode}
                                    value={formData.college_name}
                                    onChange={(e) => setFormData({ ...formData, college_name: e.target.value })}
                                />
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>
            </Grid>
        </PageContainer>
    )
}
