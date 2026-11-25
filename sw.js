/* Agenda CEO · NCD — service worker: guarda o app no aparelho para abrir sem internet. */
const VERSAO = 'agenda-ceo-v2';
const ARQUIVOS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './icon-512-maskable.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO && k !== 'fontes').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  // dados da agenda: sempre pela rede (o app guarda a cópia local por conta própria)
  if (url.hostname.endsWith('script.google.com') || url.hostname.endsWith('googleusercontent.com')) return;
  // fontes do Google: guarda depois do primeiro uso
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open('fontes').then(c => c.match(req).then(r => r || fetch(req).then(res => { c.put(req, res.clone()); return res; }).catch(() => r))));
    return;
  }
  if (url.origin !== location.origin) return;
  // app: responde do aparelho na hora e atualiza em segundo plano
  const chave = req.mode === 'navigate' ? './index.html' : req;
  e.respondWith(caches.open(VERSAO).then(c => c.match(chave, { ignoreSearch: true }).then(cached => {
    const rede = fetch(req).then(res => { if (res.ok) c.put(chave, res.clone()); return res; }).catch(() => cached);
    return cached || rede;
  })));
});
