const CACHE_NAME = "smartbell-v1";
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/manifest.json"
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("[SmartBell] Service worker installing");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SmartBell] Cache addAll failed", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SmartBell] Service worker activating");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  event.waitUntil(clients.claim());
});

// Fetch event - network first, fallback to cache
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip Supabase and external API calls
  if (
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("firebase") ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone the response for caching
        const responseToCache = response.clone();
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return offline page if available
          return caches.match("/");
        });
      })
  );
});

// Push notification event
self.addEventListener("push", (event) => {
  if (!event.data) return;
  
  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { title: "Smart Bell", body: event.data.text() };
  }

  const notificationTitle = payload.title ?? "Smart Bell";
  const notificationOptions = {
    body: payload.body ?? "Nova notificação",
    data: payload.data ?? {},
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    vibrate: [200, 100, 200],
    tag: payload.data?.call_id ?? "default",
    requireInteraction: payload.data?.type === "call",
    actions: payload.data?.type === "call" ? [
      {
        action: "answer",
        title: "Atender",
        icon: "/icons/icon-192.png"
      },
      {
        action: "dismiss",
        title: "Ignorar"
      }
    ] : []
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});

// Notification click event
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  let targetUrl = "/dashboard";
  
  if (action === "answer" && data.call_id) {
    targetUrl = `/call/${data.call_id}`;
  } else if (data.call_id) {
    targetUrl = `/call/${data.call_id}`;
  } else if (data.url) {
    targetUrl = data.url;
  }

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus existing window
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && "focus" in client) {
            return client.focus();
          }
        }
        // Try to navigate existing window
        for (const client of clientList) {
          if ("navigate" in client && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

