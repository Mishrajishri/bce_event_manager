import { useState, useMemo } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import { useQuery } from '@tanstack/react-query'
import {
    Box,
    Typography,
    Paper,
    ToggleButtonGroup,
    ToggleButton,
    CircularProgress,
    Chip,
} from '@mui/material'
import { ViewList, CalendarMonth } from '@mui/icons-material'
import { eventsApi } from '../services/api'
import type { Event } from '../types'

import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

interface CalendarEvent {
    id: string
    title: string
    start: Date
    end: Date
    resource: Event
}

const eventTypeColors: Record<string, string> = {
    sports: '#10b981',
    tech_fest: '#3b82f6',
    seminar: '#f59e0b',
    other: '#8b5cf6',
}

export default function EventCalendar() {
    const [view, setView] = useState<'month' | 'week' | 'agenda'>('month')

    const { data: events, isLoading } = useQuery({
        queryKey: ['events'],
        queryFn: () => eventsApi.list(),
    })

    const calendarEvents = useMemo<CalendarEvent[]>(() => {
        if (!events) return []
        return (events as Event[]).map((e) => ({
            id: e.id,
            title: e.name,
            start: new Date(e.start_date),
            end: new Date(e.end_date),
            resource: e,
        }))
    }, [events])

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
            </Box>
        )
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>Event Calendar</Typography>
                <ToggleButtonGroup
                    value={view}
                    exclusive
                    onChange={(_, v) => v && setView(v)}
                    size="small"
                >
                    <ToggleButton value="month"><CalendarMonth fontSize="small" sx={{ mr: 0.5 }} /> Month</ToggleButton>
                    <ToggleButton value="week"><ViewList fontSize="small" sx={{ mr: 0.5 }} /> Week</ToggleButton>
                    <ToggleButton value="agenda"><ViewList fontSize="small" sx={{ mr: 0.5 }} /> Agenda</ToggleButton>
                </ToggleButtonGroup>
            </Box>

            <Paper sx={{ p: 2, borderRadius: 3 }}>
                <Calendar
                    localizer={localizer}
                    events={calendarEvents}
                    view={view}
                    onView={(v) => setView(v as 'month' | 'week' | 'agenda')}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: 600 }}
                    eventPropGetter={(event) => ({
                        style: {
                            backgroundColor: eventTypeColors[event.resource.event_type] || '#7c3aed',
                            borderRadius: 8,
                            border: 'none',
                            padding: '2px 6px',
                            fontSize: 12,
                            fontWeight: 600,
                        },
                    })}
                    components={{
                        event: ({ event }) => (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <span>{event.title}</span>
                                <Chip
                                    label={event.resource.event_type}
                                    size="small"
                                    sx={{ height: 16, fontSize: 10, ml: 'auto' }}
                                />
                            </Box>
                        ),
                    }}
                    popup
                />
            </Paper>

            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {Object.entries(eventTypeColors).map(([type, color]) => (
                    <Chip
                        key={type}
                        label={type.replace('_', ' ')}
                        size="small"
                        sx={{ backgroundColor: color, color: '#fff', fontWeight: 600 }}
                    />
                ))}
            </Box>
        </Box>
    )
}
