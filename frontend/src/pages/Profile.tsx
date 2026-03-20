import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    Typography, Box, Paper, Grid, TextField,
    Button, Divider, Avatar, Chip, Autocomplete,
    Slider, Alert, CircularProgress
} from '@mui/material'
import {
    Email, School, Edit, Save, Add, Delete
} from '@mui/icons-material'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { authApi, skillsApi } from '../services/api'
import { useAuthStore } from '../store'
import { PageContainer } from '../components/layout_components'
import { User } from '../types/index'

const profileSchema = z.object({
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    phone: z.string().optional(),
    enrollment_number: z.string().min(1, 'Enrollment number is required'),
    branch: z.string().min(1, 'Branch is required'),
    year: z.coerce.number().int().min(1, 'Year must be at least 1').max(5, 'Year must be at most 5'),
    college_name: z.string().min(1, 'College name is required'),
})

type ProfileForm = z.infer<typeof profileSchema>

export default function Profile() {
    const { user, setAuth } = useAuthStore()
    const [editMode, setEditMode] = useState(false)
    const [skillEditMode, setSkillEditMode] = useState(false)
    const queryClient = useQueryClient()

    // Fetch user's current skills
    const { data: userSkills = [], isLoading: skillsLoading } = useQuery({
        queryKey: ['mySkills'],
        queryFn: () => skillsApi.getMySkills(),
    })

    // Fetch available skills for autocomplete - with fallback
    const defaultSkills = [
        'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js',
        'Java', 'C++', 'C#', 'Go', 'Rust', 'Swift', 'Kotlin',
        'Machine Learning', 'Data Science', 'Deep Learning', 'NLP',
        'Web Development', 'Mobile Development', 'DevOps', 'Cloud Computing',
        'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes',
        'UI/UX Design', 'Graphic Design', 'Video Editing', 'Animation',
        'Public Speaking', 'Leadership', 'Project Management', 'Marketing',
        'Content Writing', 'Social Media', 'Event Management', 'Photography'
    ]

    const { data: availableSkills = [] } = useQuery({
        queryKey: ['availableSkills'],
        queryFn: () => skillsApi.listAvailableSkills().catch(() => []),
    })

    const skillOptions = availableSkills.length > 0
        ? availableSkills.map((s: any) => s.skill_name)
        : defaultSkills

    const [localSkills, setLocalSkills] = useState<{ skill_name: string; proficiency_level: number }[]>([])

    useEffect(() => {
        if (userSkills.length > 0) {
            setLocalSkills(userSkills.map((s: any) => ({
                skill_name: s.skill_name,
                proficiency_level: s.proficiency_level || 50
            })))
        }
    }, [userSkills])

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ProfileForm>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            first_name: user?.first_name || '',
            last_name: user?.last_name || '',
            phone: user?.phone || '',
            enrollment_number: user?.enrollment_number || '',
            branch: user?.branch || '',
            year: user?.year || 1,
            college_name: user?.college_name || ''
        }
    })

    const updateMutation = useMutation({
        mutationFn: (data: ProfileForm) => authApi.updateProfile(data),
        onSuccess: (updatedUser: User) => {
            setAuth(updatedUser, localStorage.getItem('access_token') || '', localStorage.getItem('refresh_token') || '')
            setEditMode(false)
        },
        onError: () => {
            alert('Failed to update profile. Please try again.')
        }
    })

    // Skill update mutation
    const updateSkillsMutation = useMutation({
        mutationFn: (skills: { skill_name: string; proficiency_level: number }[]) =>
            skillsApi.updateMySkills(skills),
        onSuccess: (updatedSkills) => {
            queryClient.setQueryData(['mySkills'], updatedSkills)
            setSkillEditMode(false)
        },
        onError: () => {
            alert('Failed to update skills. Please try again.')
        }
    })

    const onSubmit = (data: ProfileForm) => {
        updateMutation.mutate(data)
    }

    const handleCancel = () => {
        reset()
        setEditMode(false)
    }

    const handleAddSkill = () => {
        setLocalSkills([...localSkills, { skill_name: '', proficiency_level: 50 }])
    }

    const handleRemoveSkill = (index: number) => {
        setLocalSkills(localSkills.filter((_, i) => i !== index))
    }

    const handleSkillChange = (index: number, field: 'skill_name' | 'proficiency_level', value: string | number) => {
        const newSkills = [...localSkills]
        newSkills[index] = { ...newSkills[index], [field]: value }
        setLocalSkills(newSkills)
    }

    const handleSaveSkills = () => {
        const validSkills = localSkills.filter(s => s.skill_name.trim() !== '')
        updateSkillsMutation.mutate(validSkills)
    }

    const handleCancelSkills = () => {
        setLocalSkills(userSkills.map((s: any) => ({
            skill_name: s.skill_name,
            proficiency_level: s.proficiency_level || 50
        })))
        setSkillEditMode(false)
    }


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
                                    <Button onClick={handleCancel} sx={{ mr: 1 }}>Cancel</Button>
                                    <Button
                                        variant="contained"
                                        startIcon={<Save />}
                                        onClick={handleSubmit(onSubmit)}
                                        disabled={updateMutation.isPending}
                                    >
                                        {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </Box>
                            )}
                        </Box>

                        <Divider sx={{ mb: 4 }} />

                        <Grid container spacing={3}>
                            <Grid item xs={12} sm={6}>
                                <Controller
                                    name="first_name"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="First Name"
                                            fullWidth
                                            disabled={!editMode}
                                            error={!!errors.first_name}
                                            helperText={errors.first_name?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Controller
                                    name="last_name"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Last Name"
                                            fullWidth
                                            disabled={!editMode}
                                            error={!!errors.last_name}
                                            helperText={errors.last_name?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Controller
                                    name="phone"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Phone Number"
                                            fullWidth
                                            disabled={!editMode}
                                            error={!!errors.phone}
                                            helperText={errors.phone?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Controller
                                    name="enrollment_number"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Enrollment Number"
                                            fullWidth
                                            disabled={!editMode}
                                            error={!!errors.enrollment_number}
                                            helperText={errors.enrollment_number?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} sm={8}>
                                <Controller
                                    name="branch"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Branch"
                                            fullWidth
                                            disabled={!editMode}
                                            error={!!errors.branch}
                                            helperText={errors.branch?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <Controller
                                    name="year"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Year"
                                            type="number"
                                            fullWidth
                                            disabled={!editMode}
                                            error={!!errors.year}
                                            helperText={errors.year?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <Controller
                                    name="college_name"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="College Name"
                                            fullWidth
                                            disabled={!editMode}
                                            error={!!errors.college_name}
                                            helperText={errors.college_name?.message}
                                        />
                                    )}
                                />
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>

                {/* Skills Section */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 4 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                            <Typography variant="h6">My Skills & Expertise</Typography>
                            {!skillEditMode ? (
                                <Button startIcon={<Edit />} onClick={() => setSkillEditMode(true)}>Edit Skills</Button>
                            ) : (
                                <Box>
                                    <Button onClick={handleCancelSkills} sx={{ mr: 1 }}>Cancel</Button>
                                    <Button
                                        variant="contained"
                                        startIcon={<Save />}
                                        onClick={handleSaveSkills}
                                        disabled={updateSkillsMutation.isPending}
                                    >
                                        {updateSkillsMutation.isPending ? 'Saving...' : 'Save Skills'}
                                    </Button>
                                </Box>
                            )}
                        </Box>

                        <Divider sx={{ mb: 3 }} />

                        {skillsLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                <CircularProgress />
                            </Box>
                        ) : skillEditMode ? (
                            <Box>
                                {localSkills.length === 0 && (
                                    <Alert severity="info" sx={{ mb: 2 }}>
                                        No skills added yet. Click "Add Skill" to start building your profile.
                                    </Alert>
                                )}
                                {localSkills.map((skill, index) => (
                                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                        <Autocomplete
                                            freeSolo
                                            options={skillOptions}
                                            value={skill.skill_name}
                                            onChange={(_, value) => handleSkillChange(index, 'skill_name', value || '')}
                                            sx={{ flex: 1 }}
                                            renderInput={(params) => (
                                                <TextField {...params} label="Skill" placeholder="e.g., Python, Web Development" />
                                            )}
                                        />
                                        <Box sx={{ width: 200 }}>
                                            <Typography variant="caption" color="text.secondary">
                                                Proficiency: {skill.proficiency_level}%
                                            </Typography>
                                            <Slider
                                                value={skill.proficiency_level}
                                                onChange={(_, value) => handleSkillChange(index, 'proficiency_level', value as number)}
                                                min={0}
                                                max={100}
                                                step={10}
                                                valueLabelDisplay="auto"
                                            />
                                        </Box>
                                        <Button
                                            color="error"
                                            onClick={() => handleRemoveSkill(index)}
                                            startIcon={<Delete />}
                                        >
                                            Remove
                                        </Button>
                                    </Box>
                                ))}
                                <Button
                                    startIcon={<Add />}
                                    onClick={handleAddSkill}
                                    variant="outlined"
                                    sx={{ mt: 1 }}
                                >
                                    Add Skill
                                </Button>
                            </Box>
                        ) : (
                            <Box>
                                {userSkills.length === 0 ? (
                                    <Alert severity="info">
                                        No skills added yet. Click "Edit Skills" to add your expertise.
                                    </Alert>
                                ) : (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {userSkills.map((skill: any, index: number) => (
                                            <Chip
                                                key={index}
                                                label={`${skill.skill_name} (${skill.proficiency_level || 50}%)`}
                                                color="primary"
                                                variant="outlined"
                                            />
                                        ))}
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </PageContainer>
    )
}
