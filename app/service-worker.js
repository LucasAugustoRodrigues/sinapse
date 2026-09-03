// service-worker.js — offline shell do PWA.
// TODO(sonnet): cache do app shell (cache-first) + estrategia pro questoes.json.
self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => self.clients.claim());
self.addEventListener("fetch", (e) => { /* TODO: responder do cache quando offline */ });
