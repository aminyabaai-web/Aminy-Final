/**
 * Service Worker for Push Notifications
 * Handles background push events for Aminy
 */

// Handle push events
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();

    const options = {
      body: data.body || 'You have a new message from Aminy',
      icon: '/aminy-icon-192.png',
      badge: '/aminy-badge-72.png',
      tag: data.tag || 'aminy-notification',
      data: data.data || {},
      actions: data.actions || [
        { action: 'open', title: 'Open Aminy' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      requireInteraction: data.requireInteraction || false,
      silent: false,
      vibrate: [200, 100, 200],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Aminy', options)
    );
  } catch (error) {
    console.error('Error handling push event:', error);
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  if (action === 'dismiss') {
    return;
  }

  // Default action or 'open' action - open the app
  const urlToOpen = data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (data.route) {
            client.navigate(data.route);
          }
          return;
        }
      }

      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close (for analytics)
self.addEventListener('notificationclose', (event) => {
  const data = event.notification.data || {};

  // Could send analytics here
  console.log('Notification closed:', data);
});

// Handle push subscription change
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('Push subscription changed');

  // Re-subscribe when subscription expires
  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: self.vapidPublicKey,
      })
      .then((subscription) => {
        // Send new subscription to server
        return fetch('/api/push/resubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription),
        });
      })
  );
});
