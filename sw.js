const CACHE_NAME = "evia-shell-v75";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./assets/index-D_kAPZ6L.css",
  "./assets/evia-selfobs-live.css",
  "./assets/evia-selfobs-fixes.css",
  "./assets/evia-updater.css",
  "./assets/evia-tools.css",
  "./assets/evia-rpl-evidence.css",
  "./assets/evia-rpl-course.css",
  "./assets/evia-targets.css",
  "./assets/evia-course-packs.css",
  "./assets/evia-otj.css",
  "./assets/evia-toc.css",
  "./assets/evia-export-status.css",
  "./assets/evia-video-recorder.css",
  "./assets/evia-v21.css",
  "./assets/evia-nvq.css",
  "./assets/evia-premium-motion.css",
  "./assets/evia-avatar-motion.css",
  "./assets/evia-avatar-life.js",
  "./assets/evia-trowel-meta.js",
  "./assets/evia-trowel-data.js",
  "./assets/evia-trowel-ac-text.js",
  "./assets/evia-trowel-loader.js",
  "./assets/evia-course-packs.js",
  "./assets/evia-course-pack-export.js",
  "./assets/evia-6570-pack-migration.js",
  "./assets/evia-course-context.js",
  "./assets/evia-st0264-epa-enable.js",
  "./assets/evia-6570-pack-cutover.js",
  "./assets/evia-trowel-fetch.js",
  "./assets/evia-brick-pack-migration.js",
  "./assets/evia-brick-pack-cutover.js",
  "./assets/evia-st0264-pack-migration.js",
  "./assets/evia-st0264-pack-cutover.js",
  "./assets/evia-selfobs-live.js",
  "./assets/evia-avatar-motion.js",
  "./assets/evia-avatar-life.js",
  "./assets/evia-count-display.js",
  "./assets/evia-arp.js",
  "./assets/evia-assistant-network.js",
  "./assets/evia-v69-interaction-fixes.js",
  "./assets/evia-v73-page-handoff.js",
  "./assets/evia-selfobs-fixes.js",
  "./assets/evia-video-recorder.js",
  "./assets/evia-nvq.js",
  "./assets/evia-nvq-learner-guard.js",
  "./assets/evia-export-status.js",
  "./assets/evia-export-preserve-media.js",
  "./assets/evia-otj-export.js",
  "./assets/evia-compact-export.js",
  "./assets/evia-storage-guard.js",
  "./assets/evia-admin.js",
  "./assets/evia-rpl-evidence.js",
  "./assets/evia-rpl-course.js",
  "./assets/evia-otj.js",
  "./assets/evia-otj-course.js",
  "./assets/evia-otj-arch.js",
  "./assets/evia-toc.js",
  "./assets/evia-targets.js",
  "./assets/evia-6570-smoke.js",
  "./assets/evia-updater.js",
  "./course-packs/Bricklayer_ST0095_v1.2.nisi",
  "./app/evia-site-data-1.ts",
  "./app/evia-site-data-2.ts",
  "./app/evia-site-data-3.ts",
  "./app/evia-carpentry-site-data-1.ts",
  "./app/evia-carpentry-site-data-2.ts",
  "./app/evia-carpentry-site-data-3.ts",
  "./app/evia-carpentry-joiner-data-1.ts",
  "./app/evia-carpentry-joiner-data-2.ts",
  "./app/evia-carpentry-joiner-data-3.ts",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(async (path) => {
      const response = await fetch(path, { cache: "reload" });
      if (!response.ok) throw new Error(`Evia precache failed: ${path} ${response.status}`);
      await cache.put(path, response.clone());
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("evia-shell-") && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (url.pathname.endsWith("/update.json") || url.pathname.endsWith("/sw.js")) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  if (url.pathname.endsWith("/index.html") && url.searchParams.has("version-check")) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  if (url.pathname.endsWith("/assets/evia-course-epa-guard.js")) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { cache: "no-store" });
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        return (await caches.match(request, { ignoreSearch: true })) || Response.error();
      }
    })());
    return;
  }

  if (request.mode === "navigate" || url.pathname.endsWith("/index.html")) {
    event.respondWith((async () => {
      const cached = (await caches.match("./index.html")) || (await caches.match("./"));
      if (cached) return cached;
      try {
        const response = await fetch(request, { cache: "no-store" });
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put("./index.html", response.clone());
          await cache.put("./", response.clone());
        }
        return response;
      } catch {
        return Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const exact = await caches.match(request);
    if (exact) return exact;
    try {
      const response = await fetch(request, { cache: "no-cache" });
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
        return response;
      }
      return (await caches.match(request, { ignoreSearch: true })) || response;
    } catch {
      return (await caches.match(request, { ignoreSearch: true })) || Response.error();
    }
  })());
});