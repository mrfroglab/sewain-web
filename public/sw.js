// Sewain service worker (PWA): app shell + offline fallback + web push (F6.5).
// Navigations: network-first (fresh data), fall back to cache, then to "/" when offline.
// Static assets (/_next/static, /img, /icons): cache-first.
const VERSION = "sewain-v2";
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("/"))),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/img/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(VERSION).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});

/* ------------------------------------------------------------------ web push */
// Payload from sewain-api notify (docs/integration/notify.md §6): {title, body, href, tag}, href = app path.

self.addEventListener("push", (event) => {
  let m = {};
  try {
    m = event.data ? event.data.json() : {};
  } catch {
    m = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(m.title || "Sewain", {
      body: m.body || "",
      tag: m.tag || undefined, // same tag replaces the previous notification on the device
      data: { href: typeof m.href === "string" && m.href.startsWith("/") ? m.href : "/notifikasi" },
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      lang: "id",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.href) || "/notifikasi", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const same = list.find((c) => c.url === url);
      if (same) return same.focus();
      const any = list.find((c) => new URL(c.url).origin === self.location.origin);
      if (any && "navigate" in any) return any.navigate(url).then((c) => (c ? c.focus() : self.clients.openWindow(url)));
      return self.clients.openWindow(url);
    }),
  );
});

// The browser rotated the subscription keys: register the new subscription with the signed-in account (cookie).
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const res = await fetch("/api/v1/push/vapid-key");
      if (!res.ok) return;
      const { publicKey } = await res.json();
      if (!publicKey) return;
      const sub = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: publicKey });
      await fetch("/api/v1/push/subscriptions", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub) });
    })(),
  );
});
