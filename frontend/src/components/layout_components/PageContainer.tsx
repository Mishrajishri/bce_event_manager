import { Container, Box, Typography, ContainerProps } from '@mui/material'

export interface PageContainerProps extends Omit<ContainerProps, 'maxWidth'> {
    children: React.ReactNode
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | false
    title?: string
    action?: React.ReactNode
    spacing?: 'compact' | 'normal' | 'relaxed'
}

/**
 * Standardized Page Container with Golden Ratio constraints for maximum readability
 * and balanced whitespace.
 */
export function PageContainer({
    children,
    maxWidth = 'lg',
    title,
    action,
    spacing = 'normal',
    sx,
    ...props
}: PageContainerProps) {
    const spacingModes = {
        compact: { pt: 2, pb: 2, gap: 2 },
        // Golden Ratio 1.618 margins (Base ~40px left/right, ~65px top/bottom)
        normal: {
            pt: { xs: 4, md: '65px' },
            pb: { xs: 4, md: '65px' },
            pl: { xs: 2, md: '40px' },
            pr: { xs: 2, md: '40px' },
            gap: { xs: 3, md: 4 }
        },
        relaxed: {
            pt: { xs: 6, md: '105px' },
            pb: { xs: 6, md: '105px' },
            pl: { xs: 3, md: '65px' },
            pr: { xs: 3, md: '65px' },
            gap: { xs: 4, md: 6 }
        },
    }

    return (
        <Box
            sx={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start'
            }}
        >
            <Container
                maxWidth={maxWidth}
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    ...spacingModes[spacing],
                    ...sx,
                }}
                {...props}
            >
                {(title || action) && (
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: { xs: 'flex-start', sm: 'flex-end' },
                            justifyContent: 'space-between',
                            gap: 2,
                            mb: spacing === 'compact' ? 2 : 1,
                        }}
                    >
                        {title && (
                            <Typography variant="h4" component="h1">
                                {title}
                            </Typography>
                        )}
                        {action && <Box>{action}</Box>}
                    </Box>
                )}

                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: spacingModes[spacing].gap }}>
                    {children}
                </Box>
            </Container>
        </Box>
    )
}
