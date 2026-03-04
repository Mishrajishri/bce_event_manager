import { useState, useEffect, useRef } from 'react'
import {
    IconButton,
    Badge,
    Popover,
    Box,
    Typography,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    Button,
    Chip,
    CircularProgress
} from '@mui/material'
import {
    Notifications,
    Event,
    PersonAdd,
    Message,
    CheckCircle,
    Warning,
    Info
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { notificationsApi } from '../services/api'

interface Notification {
    id: string
    type: string
    title: string
    message: string
    is_read: boolean
    created_at: string
    link?: string
}

const getNotificationIcon = (type: string) => {
    switch (type) {
        case 'registration':
            return <PersonAdd fontSize="small" color="primary" />
        case 'event':
            return <Event fontSize="small" color="info" />
        case 'team':
            return <PersonAdd fontSize="small" color="secondary" />
        case 'message':
            return <Message fontSize="small" color="warning" />
        case 'success':
            return <CheckCircle fontSize="small" color="success" />
        case 'error':
            return <Warning fontSize="small" color="error" />
        default:
            return <Info fontSize="small" />
    }
}

export function NotificationBell() {
    const navigate = useNavigate()
    const anchorRef = useRef<HTMLButtonElement>(null)
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(false)

    const fetchNotifications = async () => {
        setLoading(true)
        try {
            const data = await notificationsApi.list({ limit: 10 })
            setNotifications(data)
            const unread = data.filter((n: Notification) => !n.is_read).length
            setUnreadCount(unread)
        } catch (error) {
            console.error('Failed to fetch notifications:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchNotifications()
        // Poll for new notifications every 30 seconds
        const interval = setInterval(fetchNotifications, 30000)
        return () => clearInterval(interval)
    }, [])

    const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget)
        fetchNotifications()
    }

    const handleClose = () => {
        setAnchorEl(null)
    }

    const handleMarkAsRead = async (id: string) => {
        try {
            await notificationsApi.markAsRead(id)
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            )
            setUnreadCount(prev => Math.max(0, prev - 1))
        } catch (error) {
            console.error('Failed to mark as read:', error)
        }
    }

    const handleMarkAllAsRead = async () => {
        try {
            await notificationsApi.markAllAsRead()
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
            setUnreadCount(0)
        } catch (error) {
            console.error('Failed to mark all as read:', error)
        }
    }

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.is_read) {
            handleMarkAsRead(notification.id)
        }
        if (notification.link) {
            navigate(notification.link)
        }
        handleClose()
    }

    const formatTime = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const minutes = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)

        if (minutes < 1) return 'Just now'
        if (minutes < 60) return `${minutes}m ago`
        if (hours < 24) return `${hours}h ago`
        if (days < 7) return `${days}d ago`
        return date.toLocaleDateString()
    }

    const open = Boolean(anchorEl)

    return (
        <>
            <IconButton
                ref={anchorRef}
                onClick={handleOpen}
                sx={{ color: 'inherit' }}
                aria-label={`${unreadCount} unread notifications`}
            >
                <Badge badgeContent={unreadCount} color="error">
                    <Notifications />
                </Badge>
            </IconButton>

            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                PaperProps={{
                    sx: {
                        width: 360,
                        maxHeight: 480,
                    }
                }}
            >
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">Notifications</Typography>
                    {unreadCount > 0 && (
                        <Button size="small" onClick={handleMarkAllAsRead}>
                            Mark all read
                        </Button>
                    )}
                </Box>

                <Divider />

                {loading ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : notifications.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                        <Notifications sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                        <Typography color="text.secondary">No notifications</Typography>
                    </Box>
                ) : (
                    <List sx={{ py: 0, maxHeight: 360, overflow: 'auto' }}>
                        {notifications.map((notification, index) => (
                            <ListItem
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                sx={{
                                    py: 1.5,
                                    px: 2,
                                    bgcolor: notification.is_read ? 'transparent' : 'action.hover',
                                    cursor: 'pointer',
                                    '&:hover': {
                                        bgcolor: 'action.selected',
                                    },
                                    borderBottom: index < notifications.length - 1 ? '1px solid' : 'none',
                                    borderColor: 'divider',
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                    {getNotificationIcon(notification.type)}
                                </ListItemIcon>
                                <ListItemText
                                    primary={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography
                                                variant="body2"
                                                sx={{ fontWeight: notification.is_read ? 400 : 600 }}
                                            >
                                                {notification.title}
                                            </Typography>
                                            {!notification.is_read && (
                                                <Chip label="New" size="small" color="primary" sx={{ height: 18, fontSize: '0.65rem' }} />
                                            )}
                                        </Box>
                                    }
                                    secondary={
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                                {notification.message}
                                            </Typography>
                                            <Typography variant="caption" color="text.disabled">
                                                {formatTime(notification.created_at)}
                                            </Typography>
                                        </Box>
                                    }
                                />
                            </ListItem>
                        ))}
                    </List>
                )}

                <Divider />

                <Box sx={{ p: 1, textAlign: 'center' }}>
                    <Button
                        size="small"
                        onClick={() => {
                            navigate('/notifications')
                            handleClose()
                        }}
                    >
                        View all notifications
                    </Button>
                </Box>
            </Popover>
        </>
    )
}

export default NotificationBell
