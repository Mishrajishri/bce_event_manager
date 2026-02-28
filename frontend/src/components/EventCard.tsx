import { Card, CardContent, Typography, Button } from '@mui/material'
import { Link } from 'react-router-dom'

interface EventCardProps {
    event: {
        id: string
        name: string
        start_date: string
        status: string
    }
}

/**
 * Reusable event summary card.
 */
export default function EventCard({ event }: EventCardProps) {
    return (
        <Card>
            <CardContent>
                <Typography variant="h6">{event.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                    {new Date(event.start_date).toLocaleDateString()}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                    Status: {event.status}
                </Typography>
                <Button
                    size="small"
                    component={Link}
                    to={`/events/${event.id}`}
                    sx={{ mt: 1 }}
                    aria-label={`View details for ${event.name}`}
                >
                    View Details
                </Button>
            </CardContent>
        </Card>
    )
}
