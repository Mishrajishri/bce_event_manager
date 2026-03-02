import { Typography, Box, Grid, TextField, InputAdornment } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Search } from '@mui/icons-material'
import { useState } from 'react'
import { useDebounce } from '../hooks/useDebounce'
import { eventsApi } from '../services/api'
import { PageContainer } from '../components/layout_components'
import { EventCard } from '../components/features/EventCard'

export default function Events() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 500)

  const { data: events, isLoading } = useQuery({
    queryKey: ['events', debouncedSearch],
    queryFn: () => eventsApi.list({ search: debouncedSearch || undefined, status: 'published' }),
  })

  return (
    <PageContainer title="All Events">
      <Box sx={{ mb: 1 }}>
        <TextField
          fullWidth
          placeholder="Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {isLoading ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <EventCard isLoading={true} />
            </Grid>
          ))}
        </Grid>
      ) : events?.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No events found matching your search.
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {events?.map((event) => (
            <Grid item xs={12} sm={6} md={4} key={event.id}>
              <EventCard event={event} />
            </Grid>
          ))}
        </Grid>
      )}
    </PageContainer>
  )
}
