// BTC 매매 연습 — 서비스 워커 (오프라인 실행용)
// 프로그램을 고쳐서 다시 올릴 때 VERSION 숫자를 올리면 아이패드에 새 버전이 반영됩니다.
const VERSION = 'v3';
const SHELL = `shell-${VERSION}`;
const DATA = 'data-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js',
];

self.addEventListener('install', e => {
  // cache:'reload' — 브라우저 캐시에 남은 옛 파일이 아니라 서버의 최신 파일을 저장
  e.waitUntil(caches.open(SHELL)
    .then(c => c.addAll(SHELL_FILES.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('shell-') && k !== SHELL).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // 시세 데이터: 인터넷이 되면 최신 데이터, 안 되면 마지막으로 받은 데이터
  if (url.pathname.includes('/api/v3/klines')) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(DATA).then(c => c.put(e.request, copy)); }
        return res;
      }).catch(() => caches.match(e.request).then(r => r || Response.error()))
    );
    return;
  }

  // 앱 화면·라이브러리: 저장본을 바로 쓰고, 뒤에서 최신본으로 갱신
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(cached => {
      const net = fetch(e.request).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(SHELL).then(c => c.put(e.request, copy)); }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
