#!/usr/bin/env python3
"""Costruisce la versione APP (Android/iOS con Capacitor + PWA installabile) in ../fmv-app/www.
Uso: python3 build.py && python3 build-app.py"""
import json, shutil, re
from pathlib import Path
P = Path(__file__).resolve().parent
A = P.parent if (P.parent / 'capacitor.config.json').exists() else P.parent / 'fmv-app'
W = A / 'www'
VERSION = json.loads((A / 'package.json').read_text())['version']
W.mkdir(parents=True, exist_ok=True); (W / 'fonts').mkdir(exist_ok=True); (W / 'icons').mkdir(exist_ok=True)
html = (P / 'index.html').read_text(encoding='utf-8')
# font locali (offline)
fs = A / 'node_modules/@fontsource/barlow-semi-condensed/files'
faces = []
for w in (400, 500, 600, 700, 800, 900):
    f = fs / f'barlow-semi-condensed-latin-{w}-normal.woff2'
    if f.exists():
        shutil.copy(f, W / 'fonts' / f.name)
        faces.append(f"@font-face{{font-family:'Barlow Semi Condensed';font-style:normal;font-weight:{w};font-display:swap;src:url(fonts/{f.name}) format('woff2')}}")
html = re.sub(r'<link rel="preconnect"[^>]*>\s*<link rel="preconnect"[^>]*>\s*<link rel="stylesheet" href="https://fonts.googleapis.com[^>]*>', '<style>' + ''.join(faces) + '</style>', html)
assert 'fonts.googleapis' not in html
for n in ('icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'):
    shutil.copy(A / 'assets' / n, W / 'icons' / n)
head_extra = ('<link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="icons/apple-touch-icon.png">'
              '<link rel="icon" type="image/png" href="icons/icon-192.png"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">')
html = html.replace('<title>', head_extra + '<title>', 1)
NATIVE = r'''<script>
(function () {
  var C = window.Capacitor;
  if (C && C.isNativePlatform && C.isNativePlatform()) {
    document.documentElement.classList.add('native');
    var P = C.Plugins || {};
    try { P.StatusBar && P.StatusBar.setOverlaysWebView({ overlay: false }); P.StatusBar && P.StatusBar.setStyle({ style: 'DARK' }); P.StatusBar && P.StatusBar.setBackgroundColor({ color: '#1a1c23' }); } catch (e) {}
    setTimeout(function () { try { P.SplashScreen && P.SplashScreen.hide(); } catch (e) {} }, 250);
    if (P.App) {
      P.App.addListener('backButton', function () {
        var ov = document.getElementById('ov');
        if (ov) { var x = ov.querySelector('[data-a=close]'); if (x) x.click(); else ov.remove(); return; }
        try { var U = window.FMUI; if (U && U.inGame() && U.view() !== 'home') { U.go('home'); return; } } catch (e) {}
        P.App.minimizeApp ? P.App.minimizeApp() : P.App.exitApp();
      });
      P.App.addListener('pause', function () { try { window.FMUI && window.FMUI.inGame() && window.FMUI.autosave(); } catch (e) {} });
    }
  } else if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();
</script>'''
html = html.replace('</body>', NATIVE + '\n</body>', 1)
(W / 'index.html').write_text(html, encoding='utf-8')
(W / 'manifest.webmanifest').write_text(json.dumps({
    'name': 'FM del Valdarno', 'short_name': 'FM Valdarno', 'description': 'Manageriale di calcio: dalla Terza Categoria alla Serie A',
    'lang': 'it', 'start_url': './', 'scope': './', 'display': 'standalone', 'orientation': 'portrait',
    'background_color': '#1a1c23', 'theme_color': '#1a1c23',
    'icons': [{'src': 'icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
              {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
              {'src': 'icons/icon-maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}]
}, ensure_ascii=False, indent=1), encoding='utf-8')
files = ['./', 'index.html', 'manifest.webmanifest'] + ['icons/' + p.name for p in (W / 'icons').iterdir()] + ['fonts/' + p.name for p in (W / 'fonts').iterdir()]
(W / 'sw.js').write_text(f'''// cache offline: la partita funziona anche senza rete
const CACHE = 'fmv-{VERSION}';
const FILES = {json.dumps(sorted(files))};
self.addEventListener('install', e => {{ e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); }});
self.addEventListener('activate', e => {{ e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); }});
self.addEventListener('fetch', e => {{
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url); if (u.origin !== location.origin) return;
  // pagina: prima la rete (aggiornamenti), poi la cache; il resto: prima la cache
  if (e.request.mode === 'navigate') e.respondWith(fetch(e.request).then(r => {{ const c = r.clone(); caches.open(CACHE).then(x => x.put('index.html', c)); return r; }}).catch(() => caches.match('index.html')));
  else e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
}});
''', encoding='utf-8')
print(f'www pronto: {len(html)//1024} KB, versione {VERSION}')
