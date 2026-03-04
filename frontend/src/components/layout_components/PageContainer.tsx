import { Box, Container, Typography, useTheme, useMediaQuery } from '@mui/material'
import { ReactNode } from 'react'

export interface PageContainerProps {
    children: ReactNode
    title?: string
    action?: ReactNode
    maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false
    disablePadding?: boolean
    centered?: boolean
    background?: 'default' | 'paper' | 'transparent'
    spacing?: number
}

/**
 * Standardized page container with consistent widths and padding.
 * 
 * Max widths:
 * - xs (600px): Forms, auth pages
 * - sm (900px): Card layouts, dashboards
 * - md (1200px): Default content
 * - lg (1536px): Wide layouts
 * 
 * @example
 * // Default usage
 * <PageContainer>
 *   <Typography>Content</Typography>
 * </PageContainer>
 * 
 * @example
 * // Wide layout for data tables
 * <PageContainer maxWidth="lg">
 *   <DataGrid />
 * </PageContainer>
 * 
 * @example
 * // Centered form
 * <PageContainer maxWidth="sm" centered>
 *   <LoginForm />
 * </PageContainer>
 */
export function PageContainer({
    children,
    title,
    action,
    maxWidth = 'lg',
    disablePadding = false,
    centered = false,
    background = 'default',
    spacing = 3
}: PageContainerProps) {
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

    // Reduce maxWidth on mobile if needed
    const responsiveMaxWidth = isMobile && maxWidth !== false
        ? (maxWidth === 'lg' ? 'md' : maxWidth === 'md' ? 'sm' : maxWidth)
        : maxWidth

    const backgroundColor = background === 'default'
        ? theme.palette.background.default
        : background === 'paper'
            ? theme.palette.background.paper
            : 'transparent'

    return (
        <Box
            sx={{
                minHeight: '100vh',
                backgroundColor,
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Container
                maxWidth={responsiveMaxWidth}
                disableGutters={disablePadding}
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: spacing,
                    py: disablePadding ? 0 : { xs: 2, sm: 3 },
                    px: disablePadding ? 0 : { xs: 2, sm: 3, md: 4 },
                    ...(centered && {
                        alignItems: 'center',
                        justifyContent: 'center',
                    }),
                }}
            >
                {(title || action) && (
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 3,
                        flexWrap: 'wrap',
                        gap: 1
                    }}>
                        {title && (
                            <Typography variant="h4" component="h1" sx={{ m: 0, fontSize: '2rem', fontWeight: 600 }}>
                                {title}
                            </Typography>
                        )}
                        {action}
                    </Box>
                )}
                {children}
            </Container>
        </Box>
    )
}

/**
 * Section container for grouping related content
 */
export interface SectionProps {
    children: ReactNode
    title?: string
    subtitle?: string
    action?: ReactNode
    padding?: number
}

export function Section({
    children,
    title,
    subtitle,
    action,
    padding = 3
}: SectionProps) {
    return (
        <Box sx={{ mb: padding }}>
            {(title || action) && (
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                    flexWrap: 'wrap',
                    gap: 1
                }}>
                    <Box>
                        {title && (
                            <Typography variant="h5" component="h2" sx={{ m: 0, fontSize: '1.5rem', fontWeight: 600 }}>
                                {title}
                            </Typography>
                        )}
                        {subtitle && (
                            <Box sx={{ color: 'text.secondary', mt: 0.5 }}>
                                {subtitle}
                            </Box>
                        )}
                    </Box>
                    {action}
                </Box>
            )}
            {children}
        </Box>
    )
}

/**
 * Two-column layout for desktop, stacked for mobile
 */
export interface TwoColumnLayoutProps {
    left: ReactNode
    right: ReactNode
    leftWeight?: number
    rightWeight?: number
    spacing?: number
}

export function TwoColumnLayout({
    left,
    right,
    leftWeight = 1,
    rightWeight = 1,
    spacing = 3
}: TwoColumnLayoutProps) {
    return (
        <Box
            sx={{
                display: 'flex',
                gap: spacing,
                flexDirection: { xs: 'column', md: 'row' },
                '& > *': {
                    flex: { xs: 1, md: undefined },
                    flexBasis: { md: `${(leftWeight / (leftWeight + rightWeight)) * 100}%` },
                }
            }}
        >
            <Box>{left}</Box>
            <Box>{right}</Box>
        </Box>
    )
}
