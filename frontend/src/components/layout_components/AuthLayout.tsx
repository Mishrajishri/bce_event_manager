import { Box, Paper, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import { PageContainer } from './PageContainer'

import { useUIStore } from '../../store'

interface AuthLayoutProps {
    children: React.ReactNode
    title: string
    subtitle?: string
    bottomLinkText?: string
    bottomLinkTo?: string
    bottomLinkTagline?: string
}

export function AuthLayout({
    children,
    title,
    subtitle,
    bottomLinkText,
    bottomLinkTo,
    bottomLinkTagline,
}: AuthLayoutProps) {
    const { themeMode } = useUIStore()

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PageContainer maxWidth="sm" spacing="relaxed">
                <Paper
                    sx={{
                        p: { xs: 4, md: 6 },
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        width: '100%',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    <Box sx={{ textAlign: 'center', mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Box
                            component="img"
                            src={themeMode === 'dark' ? "/images/logo_dark.png" : "/images/logo.png"}
                            alt="Bansal College of Engineering - BGI Mandideep"
                            sx={{
                                height: 80, // Approximate Golden Ratio size referencing the form size
                                mb: 2,
                                objectFit: 'contain',
                            }}
                        />
                        <Typography variant="h4" sx={{ mb: 1 }}>
                            {title}
                        </Typography>
                        {subtitle && (
                            <Typography variant="body1" color="text.secondary">
                                {subtitle}
                            </Typography>
                        )}
                    </Box>

                    <Box sx={{ width: '100%' }}>
                        {children}
                    </Box>

                    {(bottomLinkText && bottomLinkTo) && (
                        <Typography variant="body2" sx={{ mt: 4, textAlign: 'center' }}>
                            {bottomLinkTagline}{' '}
                            <Link to={bottomLinkTo} style={{ textDecoration: 'none' }}>
                                <Typography component="span" variant="body2" color="primary" fontWeight={700}>
                                    {bottomLinkText}
                                </Typography>
                            </Link>
                        </Typography>
                    )}
                </Paper>
            </PageContainer>
        </Box>
    )
}
