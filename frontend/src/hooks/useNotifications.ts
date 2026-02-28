/** Push notifications hook for browser Notifications API. */
import { useState, useEffect, useCallback } from 'react'

export function useNotifications() {
    const [permission, setPermission] = useState<NotificationPermission>(
        typeof Notification !== 'undefined' ? Notification.permission : 'default'
    )
    const [supported, setSupported] = useState(false)

    useEffect(() => {
        setSupported('Notification' in window)
        if ('Notification' in window) {
            setPermission(Notification.permission)
        }
    }, [])

    const requestPermission = useCallback(async () => {
        if (!supported) return 'denied' as NotificationPermission

        const result = await Notification.requestPermission()
        setPermission(result)
        return result
    }, [supported])

    const sendNotification = useCallback(
        (title: string, options?: NotificationOptions) => {
            if (!supported || permission !== 'granted') return null

            return new Notification(title, {
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                ...options,
            })
        },
        [supported, permission]
    )

    const notifyNewAnnouncement = useCallback(
        (eventName: string, title: string, priority: string) => {
            const urgencyEmoji = priority === 'urgent' ? '🚨' : priority === 'high' ? '⚠️' : 'ℹ️'
            return sendNotification(`${urgencyEmoji} ${eventName}`, {
                body: title,
                tag: `announcement-${Date.now()}`,
            })
        },
        [sendNotification]
    )

    const notifyEventReminder = useCallback(
        (eventName: string, startDate: string) => {
            return sendNotification(`⏰ Event Reminder`, {
                body: `${eventName} starts at ${new Date(startDate).toLocaleString()}`,
                tag: `reminder-${eventName}`,
            })
        },
        [sendNotification]
    )

    return {
        supported,
        permission,
        requestPermission,
        sendNotification,
        notifyNewAnnouncement,
        notifyEventReminder,
    }
}
