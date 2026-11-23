const V = "mn-40d82d13";
const F = ["./", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
self.addEventListener("install", e => e.waitUntil(caches.open(V).then(c => c.addAll(F)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x.startsWith("mn-") && x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => { if (e.request.method !== "GET") return; e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(r => r || fetch(e.request).then(n => {
  if (/^fonts\./.test(new URL(e.request.url).hostname)) { const k = n.clone(); caches.open("font").then(c => c.put(e.request, k)); }
  return n;
}))); });
