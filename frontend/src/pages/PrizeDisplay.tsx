import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    Grid,
    Chip,
    Avatar,
    Divider,
    Alert,
    LinearProgress,
    Tabs,
    Tab,
} from '@mui/material'
import {
    EmojiEvents as TrophyIcon,
    CardGiftcard as GiftIcon,
    WorkspacePremium as MedalIcon,
} from '@mui/icons-material'
import { prizesApi } from '../services/api'

interface TabPanelProps {
    children?: React.ReactNode
    index: number
    value: number
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
        </div>
    )
}

const prizeTypeIcons: Record<string, React.ReactNode> = {
    cash: <GiftIcon />,
    certificate: <MedalIcon />,
    trophy: <TrophyIcon />,
    merch: <GiftIcon />,
}

const prizeTypeColors: Record<string, string> = {
    cash: '#FFD700',
    certificate: '#4CAF50',
    trophy: '#FF9800',
    merch: '#E91E63',
}

export default function PrizeDisplay() {
    const { eventId } = useParams<{ eventId: string }>()
    const [prizes, setPrizes] = useState<any[]>([])
    const [winners, setWinners] = useState<any[]>([])
    const [sponsors, setSponsors] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [tabValue, setTabValue] = useState(0)

    useEffect(() => {
        if (eventId) {
            loadData()
        }
    }, [eventId])

    const loadData = async () => {
        try {
            setLoading(true)
            const [prizesData, winnersData, sponsorsData] = await Promise.all([
                prizesApi.listPrizes(eventId!),
                prizesApi.getEventWinners(eventId!).catch(() => []),
                prizesApi.listSponsors(eventId!).catch(() => []),
            ])
            setPrizes(prizesData)
            setWinners(winnersData)
            setSponsors(sponsorsData)
        } catch (err) {
            console.error('Failed to load prizes:', err)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <LinearProgress />
            </Container>
        )
    }

    const hasWinners = winners.length > 0

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Typography variant="h3" component="h1" gutterBottom align="center">
                🏆 Prizes & Awards
            </Typography>
            <Typography variant="h6" color="textSecondary" align="center" sx={{ mb: 4 }}>
                Amazing rewards await the winners!
            </Typography>

            <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} centered>
                <Tab label="Prizes" />
                <Tab label="Winners" />
                <Tab label="Sponsors" />
            </Tabs>

            <TabPanel value={tabValue} index={0}>
                {!hasWinners ? (
                    <Alert severity="info" sx={{ mb: 3 }}>
                        Winners will be announced soon! Stay tuned.
                    </Alert>
                ) : null}

                <Grid container spacing={3}>
                    {prizes.map((prize) => {
                        const prizeWinner = winners.find(
                            (w) => w.prize_name === prize.name
                        )
                        return (
                            <Grid item xs={12} sm={6} md={4} key={prize.id}>
                                <Card
                                    sx={{
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        position: 'relative',
                                        transition: 'transform 0.2s',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: 6,
                                        },
                                    }}
                                >
                                    {prizeWinner && (
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: 8,
                                                right: 8,
                                                zIndex: 1,
                                            }}
                                        >
                                            <Chip
                                                icon={<TrophyIcon />}
                                                label="Won!"
                                                color="success"
                                                size="small"
                                            />
                                        </Box>
                                    )}

                                    <Box
                                        sx={{
                                            bgcolor: prizeTypeColors[prize.prize_type] || '#9E9E9E',
                                            height: 100,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Avatar
                                            sx={{
                                                width: 64,
                                                height: 64,
                                                bgcolor: 'white',
                                                color: prizeTypeColors[prize.prize_type] || '#9E9E9E',
                                            }}
                                        >
                                            {prizeTypeIcons[prize.prize_type] || <GiftIcon />}
                                        </Avatar>
                                    </Box>

                                    <CardContent sx={{ flexGrow: 1 }}>
                                        <Typography variant="h6" gutterBottom>
                                            {prize.name}
                                        </Typography>
                                        {prize.description && (
                                            <Typography variant="body2" color="textSecondary" paragraph>
                                                {prize.description}
                                            </Typography>
                                        )}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                                            <Chip
                                                label={prize.prize_type}
                                                size="small"
                                                sx={{
                                                    bgcolor: `${prizeTypeColors[prize.prize_type]}20`,
                                                    color: prizeTypeColors[prize.prize_type],
                                                }}
                                            />
                                            {prize.value && (
                                                <Typography variant="h6" color="primary" fontWeight="bold">
                                                    {prize.currency === 'INR' ? '₹' : '$'}
                                                    {prize.value.toLocaleString()}
                                                </Typography>
                                            )}
                                        </Box>

                                        {prizeWinner && (
                                            <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                                                <Typography variant="subtitle2" color="textSecondary">
                                                    Winner:
                                                </Typography>
                                                <Typography variant="h6" color="success.main">
                                                    {prizeWinner.team_name || prizeWinner.winner_name}
                                                </Typography>
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        )
                    })}

                    {prizes.length === 0 && (
                        <Grid item xs={12}>
                            <Alert severity="info">
                                No prizes have been announced yet for this event.
                            </Alert>
                        </Grid>
                    )}
                </Grid>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
                {hasWinners ? (
                    <Grid container spacing={3}>
                        {winners.map((winner, index) => (
                            <Grid item xs={12} sm={6} md={4} key={index}>
                                <Card
                                    sx={{
                                        height: '100%',
                                        border: winner.is_special ? '2px solid #FFD700' : 'none',
                                    }}
                                >
                                    <CardContent>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                            <Avatar
                                                sx={{
                                                    width: 48,
                                                    height: 48,
                                                    bgcolor: winner.is_special ? '#FFD700' :
                                                        winner.winner_rank === 1 ? '#FFD700' :
                                                            winner.winner_rank === 2 ? '#C0C0C0' :
                                                                winner.winner_rank === 3 ? '#CD7F32' : '#9E9E9E',
                                                }}
                                            >
                                                {winner.winner_rank <= 3 ? (
                                                    <Typography variant="h6" fontWeight="bold">
                                                        {winner.winner_rank}
                                                    </Typography>
                                                ) : (
                                                    <TrophyIcon />
                                                )}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="subtitle2" color="textSecondary">
                                                    {winner.category_name}
                                                </Typography>
                                                <Typography variant="h6">
                                                    {winner.prize_name}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        <Divider sx={{ my: 2 }} />

                                        <Typography variant="h5" color="success.main" gutterBottom>
                                            🎉 {winner.team_name || winner.winner_name}
                                        </Typography>

                                        {winner.value && (
                                            <Typography variant="body2" color="textSecondary">
                                                Prize: {winner.currency === 'INR' ? '₹' : '$'}
                                                {winner.value.toLocaleString()}
                                            </Typography>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                ) : (
                    <Alert severity="info">
                        Winners will be announced soon! Check back after the event concludes.
                    </Alert>
                )}
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
                {sponsors.length > 0 ? (
                    <Grid container spacing={3}>
                        {sponsors.map((sponsor) => (
                            <Grid item xs={12} sm={6} md={3} key={sponsor.id}>
                                <Card sx={{ textAlign: 'center', p: 2 }}>
                                    {sponsor.logo_url ? (
                                        <Box
                                            component="img"
                                            src={sponsor.logo_url}
                                            alt={sponsor.name}
                                            sx={{ height: 80, objectFit: 'contain', mb: 2 }}
                                        />
                                    ) : (
                                        <Avatar
                                            sx={{
                                                width: 80,
                                                height: 80,
                                                mx: 'auto',
                                                mb: 2,
                                                bgcolor:
                                                    sponsor.tier === 'platinum'
                                                        ? '#E5E4E2'
                                                        : sponsor.tier === 'gold'
                                                            ? '#FFD700'
                                                            : sponsor.tier === 'silver'
                                                                ? '#C0C0C0'
                                                                : '#CD7F32',
                                            }}
                                        >
                                            {sponsor.name[0]}
                                        </Avatar>
                                    )}
                                    <Typography variant="h6">{sponsor.name}</Typography>
                                    <Chip
                                        label={sponsor.tier}
                                        size="small"
                                        sx={{ mt: 1, textTransform: 'capitalize' }}
                                        color={
                                            sponsor.tier === 'platinum'
                                                ? 'default'
                                                : sponsor.tier === 'gold'
                                                    ? 'warning'
                                                    : 'secondary'
                                        }
                                    />
                                    {sponsor.website_url && (
                                        <Typography
                                            variant="body2"
                                            color="primary"
                                            sx={{ mt: 1, cursor: 'pointer' }}
                                            onClick={() => window.open(sponsor.website_url, '_blank')}
                                        >
                                            Visit Website →
                                        </Typography>
                                    )}
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                ) : (
                    <Alert severity="info">
                        No sponsors yet. Check back later!
                    </Alert>
                )}
            </TabPanel>
        </Container>
    )
}
