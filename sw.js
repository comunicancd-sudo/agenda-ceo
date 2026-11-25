/* Agenda CEO · NCD — service worker: guarda o app no aparelho para abrir sem internet. */
const VERSAO = 'agenda-ceo-v3';
const ARQUIVOS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './icon-512-maskable.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO)
    .then(c => Promise.all(ARQUIVOS.map(u => fetch(new Request(u, { cache: 'reload' })).then(r => r.ok && c.put(u, r)))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO && k !== 'fontes').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

function comLimite(p, ms) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('tempo')), ms))]); }

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
  // a página do app: tenta a versão mais nova (até 4 s); sem internet, usa a guardada
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/')) {
    e.respondWith(caches.open(VERSAO).then(c =>
      comLimite(fetch(new Request(req.url, { cache: 'no-cache' })), 4000)
        .then(res => { if (res.ok) c.put('./index.html', res.clone()); return res; })
        .catch(() => c.match('./index.html'))));
    return;
  }
  // demais arquivos (ícones, manifesto): do aparelho, atualizando em segundo plano
  e.respondWith(caches.open(VERSAO).then(c => c.match(req, { ignoreSearch: true }).then(cached => {
    const rede = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => cached);
    return cached || rede;
  })));
});
