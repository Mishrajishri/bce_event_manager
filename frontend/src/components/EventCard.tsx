import { Card, CardContent, CardMedia, Typography, Button, Chip, Box } from '@mui/material'
import { Link } from 'react-router-dom'
import { CalendarMonth, LocationOn } from '@mui/icons-material'
import { Event } from '../types'

interface EventCardProps {
    event: Partial<Event> & {
        id: string
        name: string
        start_date: string
        status: string
    }
}

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

/**
 * Reusable event summary card with colored status chip.
 */
export default function EventCard({ event }: EventCardProps) {
    return (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardMedia
                component="img"
                height="160"
                image={event.cover_image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800'}
                alt={event.name}
                sx={{ objectFit: 'cover' }}
            />
            <CardContent sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" sx={{ flex: 1 }}>{event.name}</Typography>
                    <Chip
                        label={event.status}
                        color={statusColor(event.status) as any}
                        size="small"
                        sx={{ ml: 1 }}
                    />
                </Box>

                {event.event_type && (
                    <Chip label={event.event_type} size="small" variant="outlined" sx={{ mb: 1.5 }} />
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', mb: 0.5 }}>
                    <CalendarMonth sx={{ fontSize: 16 }} />
                    <Typography variant="body2">
                        {new Date(event.start_date).toLocaleDateString()}
                    </Typography>
                </Box>

                {event.venue && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                        <LocationOn sx={{ fontSize: 16 }} />
                        <Typography variant="body2">{event.venue}</Typography>
                    </Box>
                )}

                <Button
                    size="small"
                    component={Link}
                    to={`/events/${event.id}`}
                    sx={{ mt: 1.5 }}
                    aria-label={`View details for ${event.name}`}
                >
                    View Details
                </Button>
            </CardContent>
        </Card>
    )
}
