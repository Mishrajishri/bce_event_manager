import { Component, ErrorInfo, ReactNode } from 'react'
import { Box, Typography, Button, Paper } from '@mui/material'
import { ErrorOutline } from '@mui/icons-material'

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

/**
 * React Error Boundary — catches runtime errors in the component tree
 * and renders a user-friendly fallback UI instead of a white screen.
 */
export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log to external service in production
        console.error('[ErrorBoundary]', error, errorInfo.componentStack)
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback

            return (
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: '60vh',
                        p: 3,
                    }}
                >
                    <Paper
                        elevation={3}
                        sx={{
                            p: 5,
                            maxWidth: 480,
                            textAlign: 'center',
                            borderRadius: 3,
                        }}
                    >
                        <ErrorOutline color="error" sx={{ fontSize: 64, mb: 2 }} />
                        <Typography variant="h5" gutterBottom>
                            Something went wrong
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            An unexpected error occurred. Please try again or contact support if the problem persists.
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={this.handleReset}
                            aria-label="Try again"
                        >
                            Try Again
                        </Button>
                    </Paper>
                </Box>
            )
        }

        return this.props.children
    }
}
