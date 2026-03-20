import { Box, Paper, Typography, Link } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useUIStore } from '../../store'
import { InteractiveCharacters } from '../InteractiveCharacters'
import { useState, createContext, useContext, useMemo, useCallback } from 'react'

interface AuthLayoutProps {
    children: React.ReactNode
    title: string
    subtitle?: string
    bottomLinkText?: string
    bottomLinkTo?: string
    bottomLinkTagline?: string
    showInteractiveCharacters?: boolean
}

type ReactionState = 'idle' | 'typing_email' | 'sneaking_password_hidden' | 'sneaking_password_visible' | 'error' | 'hover_forgot_password' | 'hover_register'

interface AuthContextType {
    reaction: ReactionState
    setReaction: (reaction: ReactionState) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuthContext() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuthContext must be used within an AuthLayout')
    }
    return context
}

export function AuthLayout({
    children,
    title,
    subtitle,
    bottomLinkText,
    bottomLinkTo,
    bottomLinkTagline,
    showInteractiveCharacters = false,
}: AuthLayoutProps) {
    const { themeMode } = useUIStore()
    const [reaction, setReactionState] = useState<ReactionState>('idle')

    const setReaction = useCallback((newReaction: ReactionState) => {
        setReactionState(newReaction)
    }, [])

    const contextValue = useMemo(() => ({
        reaction,
        setReaction,
    }), [reaction, setReaction])

    return (
        <AuthContext.Provider value={contextValue}>
            {/* Full-screen wrapper — deep black/dark-blue with gradient waves */}
            <Box sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                p: { xs: 2, md: 4 },
                position: 'relative',
                background: themeMode === 'dark'
                    ? `
                        radial-gradient(ellipse 120% 40% at 10% 90%, rgba(30, 27, 75, 0.5) 0%, transparent 70%),
                        radial-gradient(ellipse 100% 50% at 90% 70%, rgba(23, 37, 84, 0.4) 0%, transparent 60%),
                        radial-gradient(ellipse 140% 35% at 50% 100%, rgba(49, 46, 129, 0.35) 0%, transparent 65%),
                        radial-gradient(ellipse 80% 60% at 80% 20%, rgba(15, 23, 42, 0.6) 0%, transparent 70%),
                        radial-gradient(ellipse 90% 45% at 20% 40%, rgba(30, 58, 95, 0.25) 0%, transparent 60%),
                        linear-gradient(180deg, #000000 0%, #020617 20%, #0a0f2e 45%, #0c1445 65%, #060d1f 85%, #000000 100%)
                    `
                    : 'linear-gradient(180deg, #e0e7ff 0%, #f0f9ff 40%, #ede9fe 100%)',
            }}>
                {/* Card + characters container — everything is positioned relative to this */}
                <Box sx={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: 480,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    zIndex: 1,
                }}>
                    {/* Characters strip — sits ABOVE the card, peeking over the top edge */}
                    {showInteractiveCharacters && (
                        <Box sx={{
                            display: { xs: 'none', md: 'block' },
                            width: '120%',
                            height: '160px',
                            position: 'relative',
                            zIndex: 5,
                            mb: '-30px', // overlap with card top edge so characters peek over
                            pointerEvents: 'none',
                        }}>
                            <InteractiveCharacters reaction={reaction} />
                        </Box>
                    )}

                    {/* The floating card */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: { xs: 4, md: 6 },
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            width: '100%',
                            position: 'relative',
                            zIndex: 10,
                            overflow: 'hidden',
                            borderRadius: 4,
                            boxShadow: themeMode === 'dark'
                                ? '0 25px 60px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(139, 92, 246, 0.1)'
                                : '0 25px 60px -12px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(99, 102, 241, 0.08)',
                            backgroundColor: themeMode === 'dark'
                                ? 'rgba(15, 23, 42, 0.95)'
                                : 'rgba(255, 255, 255, 0.97)',
                            backdropFilter: 'blur(20px)',
                        }}
                    >
                        <Box sx={{ textAlign: 'center', mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Box
                                component="img"
                                src={themeMode === 'dark' ? "/images/logo_dark.png" : "/images/logo.png"}
                                alt="Bansal College of Engineering - BGI Mandideep"
                                loading="lazy"
                                sx={{
                                    height: 80,
                                    mb: 2,
                                    objectFit: 'contain',
                                }}
                            />
                            <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
                                {title}
                            </Typography>
                            {subtitle && (
                                <Typography variant="body1" color="text.secondary">
                                    {subtitle}
                                </Typography>
                            )}
                        </Box>

                        <Box sx={{ width: '100%' }} id="auth-form-container">
                            {children}
                        </Box>

                        {(bottomLinkText && bottomLinkTo) && (
                            <Typography
                                variant="body2"
                                sx={{ mt: 4, textAlign: 'center' }}
                                onMouseEnter={() => setReaction('hover_register')}
                                onMouseLeave={() => setReaction('idle')}
                            >
                                {bottomLinkTagline}{' '}
                                <Link component={RouterLink} to={bottomLinkTo} underline="none">
                                    <Typography component="span" variant="body2" color="primary" fontWeight={700}>
                                        {bottomLinkText}
                                    </Typography>
                                </Link>
                            </Typography>
                        )}
                    </Paper>
                </Box>
            </Box>
        </AuthContext.Provider>
    )
}
