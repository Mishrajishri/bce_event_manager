import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store'
import { fetchWithAuth } from '../services/api'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// VAPID public key for push notifications
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

interface PushSubscription {
    id: string
    endpoint: string
    browser: string | null
    created_at: string
}

export function usePushNotifications() {
    const { accessToken } = useAuthStore()
    const [isSupported, setIsSupported] = useState(false)
    const [subscription, setSubscription] = useState<PushSubscription | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        // Check if push notifications are supported
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true)
        }
    }, [])

    const subscribe = useCallback(async () => {
        if (!isSupported || !accessToken) return null

        try {
            setIsLoading(true)

            // Register service worker
            const registration = await navigator.serviceWorker.register('/sw.js')
            console.log('Service Worker registered')

            // Subscribe to push
            const pushSubscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource
            })

            // Send subscription to server
            const response = await fetchWithAuth(`${API_BASE_URL}/communication/push/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    endpoint: pushSubscription.endpoint,
                    keys: {
                        p256dh: pushSubscription.getKey('p256dh'),
                        auth: pushSubscription.getKey('auth')
                    },
                    browser: getBrowserName()
                })
            })

            setSubscription(response)
            return response
        } catch (error) {
            console.error('Failed to subscribe to push notifications:', error)
            return null
        } finally {
            setIsLoading(false)
        }
    }, [isSupported, accessToken])

    const unsubscribe = useCallback(async () => {
        if (!subscription || !accessToken) return

        try {
            setIsLoading(true)

            // Unsubscribe from push
            const registration = await navigator.serviceWorker.ready
            const pushSub = await registration.pushManager.getSubscription()
            if (pushSub) {
                await pushSub.unsubscribe()
            }

            // Remove from server
            await fetchWithAuth(
                `${API_BASE_URL}/communication/push/unsubscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            )

            setSubscription(null)
        } catch (error) {
            console.error('Failed to unsubscribe from push notifications:', error)
        } finally {
            setIsLoading(false)
        }
    }, [subscription, accessToken])

    const loadSubscription = useCallback(async () => {
        if (!accessToken) return

        try {
            const response = await fetchWithAuth(
                `${API_BASE_URL}/communication/push/subscriptions`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            )

            if (response && response.length > 0) {
                setSubscription(response[0])
            }
        } catch (error) {
            console.error('Failed to load push subscription:', error)
        }
    }, [accessToken])

    // Load subscription on mount
    useEffect(() => {
        if (isSupported && accessToken) {
            loadSubscription()
        }
    }, [isSupported, accessToken, loadSubscription])

    return {
        isSupported,
        subscription,
        isLoading,
        subscribe,
        unsubscribe,
        isSubscribed: !!subscription
    }
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array | ArrayBuffer {
    if (!base64String) return new Uint8Array()

    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}

// Helper to get browser name
function getBrowserName(): string {
    const ua = navigator.userAgent
    if (ua.includes('Chrome')) return 'Chrome'
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Safari')) return 'Safari'
    if (ua.includes('Edge')) return 'Edge'
    return 'Unknown'
}

export default usePushNotifications
