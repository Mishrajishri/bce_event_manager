import { Box, CircularProgress, Typography, Paper } from '@mui/material'

interface LoadingSpinnerProps {
    message?: string
    fullScreen?: boolean
    size?: 'small' | 'medium' | 'large'
}

export function LoadingSpinner({
    message = 'Loading...',
    fullScreen = false,
    size = 'medium'
}: LoadingSpinnerProps) {
    const sizeMap = {
        small: 24,
        medium: 40,
        large: 60
    }

    const content = (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                p: 4,
            }}
        >
            <CircularProgress size={sizeMap[size]} />
            {message && (
                <Typography variant="body2" color="text.secondary">
                    {message}
                </Typography>
            )}
        </Box>
    )

    if (fullScreen) {
        return (
            <Box
                sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'background.default',
                    zIndex: 9999,
                }}
            >
                {content}
            </Box>
        )
    }

    return (
        <Paper
            elevation={0}
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                py: 6,
            }}
        >
            {content}
        </Paper>
    )
}

interface LoadingSkeletonProps {
    variant?: 'text' | 'rectangular' | 'circular'
    width?: string | number
    height?: string | number
    count?: number
}

export function LoadingSkeleton({
    variant = 'rectangular',
    width = '100%',
    height,
    count = 1
}: LoadingSkeletonProps) {
    // Default heights based on variant
    const defaultHeights = {
        text: 20,
        rectangular: 100,
        circular: 60
    }

    const items = []
    for (let i = 0; i < count; i++) {
        items.push(
            <Box
                key={i}
                sx={{
                    width,
                    height: height || defaultHeights[variant],
                    borderRadius: variant === 'circular' ? '50%' : 1,
                    animation: 'pulse 1.5s ease-in-out infinite',
                    '@keyframes pulse': {
                        '0%': { opacity: 0.6 },
                        '50%': { opacity: 1 },
                        '100%': { opacity: 0.6 },
                    },
                    mb: i < count - 1 ? 1 : 0,
                }}
            />
        )
    }

    return <>{items}</>
}

export function LoadingPage({ message = 'Loading page...' }: { message?: string }) {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '50vh',
            }}
        >
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
                {message}
            </Typography>
        </Box>
    )
}
