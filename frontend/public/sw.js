// Service Worker for Push Notifications
// BCE Event Manager

self.addEventListener('push', function (event) {
    console.log('Push notification received:', event)

    let data = {
        title: 'BCE Event Manager',
        body: 'You have a new notification',
        icon: '/images/logo.png',
        badge: '/images/logo.png',
        tag: 'bce-notification',
        data: {}
    }

    if (event.data) {
        try {
            const payload = event.data.json()
            data.title = payload.title || data.title
            data.body = payload.body || data.body
            data.icon = payload.icon || data.icon
            data.badge = payload.badge || data.badge
            data.tag = payload.tag || data.tag
            data.data = payload.data || {}
        } catch (e) {
            data.body = event.data.text()
        }
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon,
            badge: data.badge,
            tag: data.tag,
            data: data.data,
            vibrate: [100, 50, 100],
            actions: [
                { action: 'view', title: 'View' },
                { action: 'dismiss', title: 'Dismiss' }
            ]
        })
    )
})

self.addEventListener('notificationclick', function (event) {
    console.log('Notification clicked:', event)

    event.notification.close()

    if (event.action === 'view') {
        // Open the app
        event.waitUntil(
            clients.openWindow('/')
        )
    } else if (event.action === 'dismiss') {
        // Just close the notification
    } else {
        // Default click behavior
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
                if (clientList.length > 0) {
                    return clientList[0].focus()
                }
                return clients.openWindow('/')
            })
        )
    }
})

self.addEventListener('install', function (event) {
    console.log('Service Worker installing')
    self.skipWaiting()
})

self.addEventListener('activate', function (event) {
    console.log('Service Worker activated')
    event.waitUntil(clients.claim())
})

// Handle background sync for offline support
self.addEventListener('sync', function (event) {
    console.log('Background sync:', event.tag)

    if (event.tag === 'sync-notifications') {
        event.waitUntil(syncNotifications())
    }
})

async function syncNotifications() {
    // Sync any pending notifications
    console.log('Syncing notifications...')
}
