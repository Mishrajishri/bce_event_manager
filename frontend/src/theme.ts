import { createTheme, Theme } from '@mui/material'

// ---------------------------------------------------------------------------
// Claymorphism shadow recipes
// ---------------------------------------------------------------------------

const clayShadowLight = [
    '8px 8px 16px rgba(0, 0, 0, 0.08)',
    'inset -3px -3px 6px rgba(0, 0, 0, 0.04)',
    'inset 3px 3px 6px rgba(255, 255, 255, 0.7)',
].join(', ')

const clayShadowDark = [
    '6px 6px 14px rgba(0, 0, 0, 0.35)',
    'inset -3px -3px 6px rgba(0, 0, 0, 0.2)',
    'inset 3px 3px 6px rgba(255, 255, 255, 0.04)',
].join(', ')

const clayButtonShadow = [
    '4px 4px 10px rgba(0, 0, 0, 0.08)',
    'inset -2px -2px 4px rgba(0, 0, 0, 0.04)',
    'inset 2px 2px 4px rgba(255, 255, 255, 0.6)',
].join(', ')

// ---------------------------------------------------------------------------
// Theme factory
// ---------------------------------------------------------------------------

export function createAppTheme(mode: 'light' | 'dark'): Theme {
    const isLight = mode === 'light'
    const clayShadow = isLight ? clayShadowLight : clayShadowDark

    return createTheme({
        palette: {
            mode,
            primary: {
                main: '#7c3aed',
                light: '#a78bfa',
                dark: '#5b21b6',
            },
            secondary: {
                main: '#ec4899',
                light: '#f472b6',
                dark: '#be185d',
            },
            background: {
                default: isLight ? '#f0eaf8' : '#1a1625',
                paper: isLight ? '#faf5ff' : '#241e35',
            },
            success: { main: '#10b981' },
            warning: { main: '#f59e0b' },
            error: { main: '#ef4444' },
            info: { main: '#3b82f6' },
        },

        shape: {
            borderRadius: 20,
        },

        typography: {
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
            h4: { fontWeight: 700 },
            h5: { fontWeight: 600 },
            h6: { fontWeight: 600 },
            button: { fontWeight: 600, textTransform: 'none' as const },
        },

        components: {
            MuiCard: {
                styleOverrides: {
                    root: {
                        boxShadow: clayShadow,
                        borderRadius: 24,
                        border: isLight ? '1px solid rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.06)',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        '&:hover': {
                            transform: 'translateY(-2px)',
                        },
                    },
                },
            },

            MuiPaper: {
                styleOverrides: {
                    root: {
                        boxShadow: clayShadow,
                        borderRadius: 20,
                        border: isLight ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.05)',
                    },
                },
            },

            MuiButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 14,
                        padding: '10px 24px',
                        fontWeight: 600,
                    },
                    contained: {
                        boxShadow: clayButtonShadow,
                        '&:hover': {
                            boxShadow: clayShadow,
                        },
                    },
                },
            },

            MuiAppBar: {
                styleOverrides: {
                    root: {
                        boxShadow: clayShadow,
                        backdropFilter: 'blur(12px)',
                        backgroundColor: isLight ? 'rgba(250, 245, 255, 0.85)' : 'rgba(26, 22, 37, 0.9)',
                        color: isLight ? '#1e1b4b' : '#e9d5ff',
                    },
                },
            },

            MuiDrawer: {
                styleOverrides: {
                    paper: {
                        backgroundColor: isLight ? '#faf5ff' : '#1e1a2e',
                        borderRight: isLight ? '1px solid rgba(124,58,237,0.1)' : '1px solid rgba(124,58,237,0.15)',
                    },
                },
            },

            MuiTextField: {
                styleOverrides: {
                    root: {
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 14,
                        },
                    },
                },
            },

            MuiChip: {
                styleOverrides: {
                    root: {
                        borderRadius: 12,
                    },
                },
            },

            MuiCssBaseline: {
                styleOverrides: {
                    body: {
                        backgroundImage: isLight
                            ? 'radial-gradient(circle at 20% 80%, rgba(124,58,237,0.05) 0%, transparent 50%),radial-gradient(circle at 80% 20%, rgba(236,72,153,0.05) 0%, transparent 50%)'
                            : 'radial-gradient(circle at 20% 80%, rgba(124,58,237,0.08) 0%, transparent 50%),radial-gradient(circle at 80% 20%, rgba(236,72,153,0.06) 0%, transparent 50%)',
                    },
                },
            },
        },
    })
}
