import { createTheme, Theme } from '@mui/material'

// ---------------------------------------------------------------------------
// Refined Claymorphism Shadows & Animations
// ---------------------------------------------------------------------------

const clayShadowLight = '8px 8px 16px rgba(0, 0, 0, 0.06), -8px -8px 16px rgba(255, 255, 255, 0.9), inset 1px 1px 2px rgba(255, 255, 255, 0.3)'
const clayShadowDark = '8px 8px 16px rgba(0, 0, 0, 0.5), -8px -8px 16px rgba(30, 41, 59, 0.4), inset 1px 1px 2px rgba(255, 255, 255, 0.1)'

const hoverClayShadowLight = '12px 12px 20px rgba(0, 0, 0, 0.08), -12px -12px 20px rgba(255, 255, 255, 1), inset 1px 1px 3px rgba(255, 255, 255, 0.5)'
const hoverClayShadowDark = '12px 12px 20px rgba(0, 0, 0, 0.6), -12px -12px 20px rgba(30, 41, 59, 0.6), inset 1px 1px 3px rgba(255, 255, 255, 0.15)'

// ---------------------------------------------------------------------------
// Theme factory
// ---------------------------------------------------------------------------

export function createAppTheme(mode: 'light' | 'dark'): Theme {
    const isLight = mode === 'light'

    // "Soft Alabaster & Indigo" vs "The Esports / Volt"
    const bgDefault = isLight ? '#F5F5F7' : '#0F172A'
    const bgPaper = isLight ? '#FFFFFF' : '#1E293B'
    const textPrimary = isLight ? '#1E293B' : '#F8FAFC'
    const textSecondary = isLight ? '#64748B' : '#94A3B8'
    const accentColor = isLight ? '#4353EB' : '#A3E635' // Indigo vs. Volt Green

    // Aurora/Wave Background Colors for organic feel
    const waveColor1 = isLight ? '#E0E7FF' : '#064E3B'
    const waveColor2 = isLight ? '#C7D2FE' : '#047857'
    const waveColor3 = isLight ? '#FFFFFF' : '#1E293B'

    return createTheme({
        palette: {
            mode,
            primary: {
                main: accentColor,
            },
            secondary: {
                main: isLight ? '#E0E7FF' : '#365314', // Highlight tag backgrounds
                contrastText: accentColor,
            },
            background: {
                default: bgDefault,
                paper: bgPaper,
            },
            text: {
                primary: textPrimary,
                secondary: textSecondary,
            },
            success: { main: '#10b981' },
            warning: { main: '#f59e0b' },
            error: { main: '#ef4444' },
            info: { main: '#3b82f6' },
        },

        shape: {
            borderRadius: 16,
        },

        typography: {
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
            // Applying Golden Ratio (1.618) to Typography Scale
            // Base = 16px (1rem)
            body1: { fontSize: '1rem', color: textPrimary },
            body2: { fontSize: '0.875rem', color: textSecondary },
            subtitle1: { fontSize: '1rem', fontWeight: 600 },
            subtitle2: { fontSize: '0.875rem', fontWeight: 600 },

            // h6: ~20px
            h6: { fontSize: '1.25rem', fontWeight: 600 },
            // h5: 16px * 1.618 ≈ 26px (~1.625rem)
            h5: { fontSize: '1.625rem', fontWeight: 600, letterSpacing: '-0.01em' },
            // h4: 26px * 1.618 ≈ 42px (~2.625rem)
            h4: { fontSize: '2.625rem', fontWeight: 700, letterSpacing: '-0.02em' },
            // h3: 42px * 1.618 ≈ 68px (~4.25rem)
            h3: { fontSize: '4.25rem', fontWeight: 800, letterSpacing: '-0.03em' },

            button: { fontWeight: 600, textTransform: 'none' as const },
        },

        components: {
            MuiCssBaseline: {
                styleOverrides: `
                    @keyframes waveAurora {
                        0% { background-position: 0% 0%; }
                        25% { background-position: 100% 0%; }
                        50% { background-position: 100% 100%; }
                        75% { background-position: 0% 100%; }
                        100% { background-position: 0% 0%; }
                    }
                    body {
                        background-color: ${bgDefault};
                        background-image: 
                            radial-gradient(at 0% 0%, ${waveColor1} 0px, transparent 50%),
                            radial-gradient(at 100% 0%, ${waveColor2} 0px, transparent 50%),
                            radial-gradient(at 100% 100%, ${waveColor1} 0px, transparent 50%),
                            radial-gradient(at 0% 100%, ${waveColor3} 0px, transparent 50%);
                        background-size: 200% 200%;
                        animation: waveAurora 20s ease-in-out infinite;
                        color: ${textPrimary};
                        min-height: 100vh;
                        background-attachment: fixed;
                    }
                `,
            },

            MuiCard: {
                styleOverrides: {
                    root: {
                        boxShadow: isLight ? clayShadowLight : clayShadowDark,
                        backgroundColor: bgPaper,
                        border: 'none',
                        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                        '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: isLight ? hoverClayShadowLight : hoverClayShadowDark,
                        },
                    },
                },
            },

            MuiPaper: {
                defaultProps: {
                    elevation: 0,
                },
                styleOverrides: {
                    root: {
                        boxShadow: isLight ? clayShadowLight : clayShadowDark,
                        border: 'none',
                        backgroundColor: bgPaper,
                    },
                },
            },

            MuiButton: {
                styleOverrides: {
                    root: {
                        padding: '10px 24px',
                        boxShadow: isLight ? clayShadowLight : clayShadowDark,
                        '&:hover': {
                            boxShadow: isLight ? hoverClayShadowLight : hoverClayShadowDark,
                        },
                    },
                    containedPrimary: {
                        ...(mode === 'dark' && {
                            color: '#0F172A',
                            fontWeight: 800,
                        }),
                    },
                    outlinedPrimary: {
                        ...(mode === 'dark' && {
                            borderColor: 'rgba(163,230,53,0.5)',
                            color: '#A3E635',
                            '&:hover': {
                                borderColor: '#A3E635',
                                backgroundColor: 'rgba(163,230,53,0.08)',
                                boxShadow: '0 0 12px rgba(163,230,53,0.15)',
                            },
                        }),
                    },
                },
            },

            MuiOutlinedInput: {
                styleOverrides: {
                    root: {
                        ...(mode === 'dark' && {
                            color: '#CBD5E1',
                            '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'rgba(148,163,184,0.4)',
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'rgba(148,163,184,0.6)',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#A3E635',
                            },
                        }),
                    },
                },
            },

            MuiInputLabel: {
                styleOverrides: {
                    root: {
                        ...(mode === 'dark' && {
                            color: '#94A3B8',
                            '&.Mui-focused': {
                                color: '#A3E635',
                            },
                        }),
                    },
                },
            },

            MuiSelect: {
                styleOverrides: {
                    icon: {
                        ...(mode === 'dark' && {
                            color: '#94A3B8',
                        }),
                    },
                },
            },

            MuiTableHead: {
                styleOverrides: {
                    root: {
                        ...(mode === 'dark' && {
                            '& .MuiTableCell-head': {
                                color: '#E2E8F0',
                                fontWeight: 700,
                                borderBottom: '1px solid rgba(163,230,53,0.2)',
                            },
                        }),
                    },
                },
            },

            MuiAppBar: {
                defaultProps: {
                    elevation: 0,
                },
                styleOverrides: {
                    root: {
                        backgroundColor: isLight ? 'rgba(245, 245, 247, 0.8)' : 'rgba(15, 23, 42, 0.8)',
                        backdropFilter: 'blur(12px)',
                        borderBottom: isLight ? '1px solid rgba(0,0,0,0.05)' : '1px solid rgba(255,255,255,0.05)',
                        color: textPrimary,
                    },
                },
            },

            MuiDrawer: {
                styleOverrides: {
                    paper: {
                        backgroundColor: bgPaper,
                        borderRight: isLight ? '1px solid rgba(0,0,0,0.05)' : '1px solid rgba(255,255,255,0.05)',
                    },
                },
            },

            MuiChip: {
                styleOverrides: {
                    root: {
                        fontWeight: 600,
                    },
                }
            }
        },
    })
}
