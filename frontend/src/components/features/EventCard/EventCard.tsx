import { Card, CardContent, CardMedia, Typography, Box, Chip, Skeleton } from '@mui/material'
import { CalendarMonth, LocationOn, PeopleAlt } from '@mui/icons-material'
import { Link } from 'react-router-dom'
import { Event } from '../../../types'

export interface EventCardProps {
    event?: Event
    variant?: 'default' | 'compact' | 'horizontal'
    isLoading?: boolean
    action?: React.ReactNode
}

const statusColorMap: Record<string, "success" | "default" | "info" | "primary" | "error" | "warning"> = {
    published: 'success',
    draft: 'default',
    ongoing: 'info',
    completed: 'primary',
    cancelled: 'error',
}

/**
 * Reusable event summary card with multiple layout variants.
 */
export function EventCard({ event, variant = 'default', isLoading, action }: EventCardProps) {
    if (isLoading || !event) {
        return <EventCardSkeleton variant={variant} />
    }

    const { id, name, cover_image, status, event_type, start_date, venue, current_participants, max_participants } = event
    const statusColor = statusColorMap[status] || 'default'

    // Formatted strings
    const dateStr = new Date(start_date).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric'
    })
    const typeStr = event_type ? event_type.replace('_', ' ') : 'Event'
    const imageUrl = cover_image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800'

    // -----------------------------------------------------------------------
    // Horizontal Variant (Typically for List Views)
    // -----------------------------------------------------------------------
    if (variant === 'horizontal') {
        return (
            <Card sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, height: '100%', textDecoration: 'none' }} component={Link} to={`/events/${id}`}>
                <CardMedia
                    component="img"
                    sx={{ width: { xs: '100%', sm: 200 }, height: { xs: 160, sm: 'auto' }, objectFit: 'cover' }}
                    image={imageUrl}
                    alt={name}
                    loading="lazy"
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <CardContent sx={{ flex: '1 0 auto' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
                                {name}
                            </Typography>
                            <Chip label={status} color={statusColor} size="small" sx={{ ml: 1, textTransform: 'capitalize' }} />
                        </Box>

                        <Chip label={typeStr} size="small" variant="outlined" sx={{ mb: 1.5, textTransform: 'capitalize' }} />

                        <Box sx={{ display: 'flex', gap: 2, color: 'text.secondary', mb: 1, flexWrap: 'wrap' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <CalendarMonth sx={{ fontSize: 18 }} />
                                <Typography variant="body2">{dateStr}</Typography>
                            </Box>
                            {venue && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <LocationOn sx={{ fontSize: 18 }} />
                                    <Typography variant="body2">{venue}</Typography>
                                </Box>
                            )}
                            {max_participants !== undefined && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <PeopleAlt sx={{ fontSize: 18 }} />
                                    <Typography variant="body2">{current_participants || 0} / {max_participants}</Typography>
                                </Box>
                            )}
                        </Box>
                    </CardContent>
                    {action && (
                        <Box sx={{ p: 2, pt: 0, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid', borderColor: 'divider' }}>
                            {action}
                        </Box>
                    )}
                </Box>
            </Card>
        )
    }

    // -----------------------------------------------------------------------
    // Compact Variant (Dashboard widgets)
    // -----------------------------------------------------------------------
    if (variant === 'compact') {
        return (
            <Card sx={{ display: 'flex', alignItems: 'center', p: 1.5, textDecoration: 'none' }} component={Link} to={`/events/${id}`}>
                <CardMedia
                    component="img"
                    sx={{ width: 64, height: 64, borderRadius: 1, objectFit: 'cover' }}
                    image={imageUrl}
                    alt={name}
                    loading="lazy"
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, ml: 2 }}>
                    <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 600, lineHeight: 1.2, mb: 0.5 }}>
                        {name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            {dateStr}
                        </Typography>
                        <Chip label={status} color={statusColor} size="small" sx={{ height: 20, fontSize: '0.7rem', textTransform: 'capitalize' }} />
                    </Box>
                </Box>
                {action}
            </Card>
        )
    }

    // -----------------------------------------------------------------------
    // Default Variant (Grid view)
    // -----------------------------------------------------------------------
    return (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', textDecoration: 'none' }} component={Link} to={`/events/${id}`}>
            <CardMedia
                component="img"
                height="160"
                image={imageUrl}
                alt={name}
                sx={{ objectFit: 'cover' }}
                loading="lazy"
            />
            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" sx={{ flex: 1, color: 'text.primary', fontWeight: 600, lineHeight: 1.3 }}>
                        {name}
                    </Typography>
                    <Chip label={status} color={statusColor} size="small" sx={{ ml: 1, textTransform: 'capitalize' }} />
                </Box>

                <Box sx={{ mb: 1.5 }}>
                    <Chip label={typeStr} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} />
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, color: 'text.secondary', mb: 2, flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarMonth sx={{ fontSize: 18 }} />
                        <Typography variant="body2">{dateStr}</Typography>
                    </Box>
                    {venue && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LocationOn sx={{ fontSize: 18 }} />
                            <Typography variant="body2" sx={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {venue}
                            </Typography>
                        </Box>
                    )}
                </Box>

                {action}
            </CardContent>
        </Card>
    )
}

// ---------------------------------------------------------------------------
// Skeleton Loaders
// ---------------------------------------------------------------------------
function EventCardSkeleton({ variant }: { variant: 'default' | 'compact' | 'horizontal' }) {
    if (variant === 'compact') {
        return (
            <Card sx={{ display: 'flex', alignItems: 'center', p: 1.5 }}>
                <Skeleton variant="rounded" width={64} height={64} />
                <Box sx={{ flex: 1, ml: 2 }}>
                    <Skeleton variant="text" width="80%" height={24} />
                    <Skeleton variant="text" width="40%" />
                </Box>
            </Card>
        )
    }

    if (variant === 'horizontal') {
        return (
            <Card sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, height: { sm: 160 } }}>
                <Skeleton variant="rectangular" sx={{ width: { xs: '100%', sm: 200 }, height: { xs: 160, sm: '100%' } }} />
                <CardContent sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" height={32} />
                    <Skeleton variant="rounded" width={80} height={24} sx={{ my: 1 }} />
                    <Skeleton variant="text" width="40%" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Skeleton variant="rectangular" height={160} />
            <CardContent sx={{ flex: 1 }}>
                <Skeleton variant="text" width="80%" height={32} />
                <Skeleton variant="rounded" width={80} height={24} sx={{ my: 1 }} />
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="50%" />
            </CardContent>
        </Card>
    )
}
