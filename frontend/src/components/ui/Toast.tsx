import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Snackbar, Alert, AlertColor, SnackbarCloseReason } from '@mui/material'

// Toast types
export type ToastType = AlertColor

// Toast configuration
export interface ToastConfig {
    message: string
    type?: ToastType
    duration?: number
}

// Toast context type
interface ToastContextType {
    showToast: (config: ToastConfig) => void
    showSuccess: (message: string) => void
    showError: (message: string) => void
    showWarning: (message: string) => void
    showInfo: (message: string) => void
}

// Create context
const ToastContext = createContext<ToastContextType | undefined>(undefined)

// Toast provider component
export function ToastProvider({ children }: { children: ReactNode }) {
    const [open, setOpen] = useState(false)
    const [config, setConfig] = useState<ToastConfig>({ message: '', type: 'info' })

    const handleClose = (_event?: React.SyntheticEvent | Event, reason?: SnackbarCloseReason) => {
        if (reason === 'clickaway') {
            return
        }
        setOpen(false)
    }

    const showToast = useCallback((toastConfig: ToastConfig) => {
        setConfig({
            message: toastConfig.message,
            type: toastConfig.type || 'info',
            duration: toastConfig.duration || 4000,
        })
        setOpen(true)
    }, [])

    const showSuccess = useCallback((message: string) => {
        showToast({ message, type: 'success' })
    }, [showToast])

    const showError = useCallback((message: string) => {
        showToast({ message, type: 'error', duration: 6000 })
    }, [showToast])

    const showWarning = useCallback((message: string) => {
        showToast({ message, type: 'warning' })
    }, [showToast])

    const showInfo = useCallback((message: string) => {
        showToast({ message, type: 'info' })
    }, [showToast])

    return (
        <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
            {children}
            <Snackbar
                open={open}
                autoHideDuration={config.duration}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={handleClose}
                    severity={config.type}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {config.message}
                </Alert>
            </Snackbar>
        </ToastContext.Provider>
    )
}

// Custom hook to use toast
export function useToast() {
    const context = useContext(ToastContext)
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}
