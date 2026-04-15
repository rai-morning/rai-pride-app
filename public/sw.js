const CACHE_NAME = "raise-pwa-v1";
const STATIC_ASSETS = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned)).catch(() => undefined);
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/")))
  );
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== "BADGE_COUNT") return;
  const count = Number(data.count ?? 0);
  const nav = self.navigator || {};
  if (count > 0) {
    if (typeof nav.setAppBadge === "function") {
      nav.setAppBadge(count).catch(() => undefined);
    } else if (self.registration && typeof self.registration.setAppBadge === "function") {
      self.registration.setAppBadge(count).catch(() => undefined);
    }
    return;
  }
  if (typeof nav.clearAppBadge === "function") {
    nav.clearAppBadge().catch(() => undefined);
  } else if (self.registration && typeof self.registration.clearAppBadge === "function") {
    self.registration.clearAppBadge().catch(() => undefined);
  }
});

self.addEventListener("push", (event) => {
  const payload = (() => {
    try {
      return event.data ? event.data.json() : {};
    } catch {
      return {};
    }
  })();

  const title =
    payload?.notification?.title ||
    payload?.data?.title ||
    "RAISE";
  const body =
    payload?.notification?.body ||
    payload?.data?.body ||
    "新しい通知があります";
  const icon =
    payload?.notification?.icon ||
    payload?.data?.icon ||
    "/icon?size=192";
  const badge =
    payload?.notification?.badge ||
    payload?.data?.badge ||
    "/icon?size=192";
  const url = payload?.data?.url || "/notifications";
  const badgeCount = Number(payload?.data?.badgeCount ?? 0);

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, {
        body,
        icon,
        badge,
        data: { url },
      });
      if (badgeCount > 0) {
        const nav = self.navigator || {};
        if (typeof nav.setAppBadge === "function") {
          await nav.setAppBadge(badgeCount).catch(() => undefined);
        } else if (typeof self.registration.setAppBadge === "function") {
          await self.registration.setAppBadge(badgeCount).catch(() => undefined);
        }
      }
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/notifications";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((allClients) => {
      const existing = allClients.find((client) => "focus" in client);
      if (existing) {
        existing.navigate(url);
        return existing.focus();
      }
      return clients.openWindow(url);
    })
  );
});
