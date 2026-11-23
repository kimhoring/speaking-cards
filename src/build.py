"""src -> app/ (웹 배포 + 앱 내부 업데이트 묶음), dist/artifact.html (claude.ai 게시용)"""
import hashlib
import json
import os
import shutil
import time

import build_data

H = os.path.dirname(os.path.abspath(__file__))
R = os.path.dirname(H)
A = os.path.join(R, "app")
MIN_SHELL = 1  # 이 묶음을 돌리는 데 필요한 안드로이드 앱 버전(versionCode)


def rd(p):
    return open(p, encoding="utf8").read()


def wr(p, s):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, "w", encoding="utf8", newline="\n").write(s)


build_data.main()
n = int(os.environ.get("BUILD_TIME") or time.time())
page = rd(os.path.join(H, "app.html")).replace("/*__CSS__*/", rd(os.path.join(H, "style.css")))
page = page.replace("/*__DATA__*/[]", rd(os.path.join(H, "cards.json"))).replace("/*__BUILD__*/0", str(n))
GF = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Nunito:wght@400;700&display=swap">'
LF = (
    '<style>@font-face{font-family:"Gowun Dodum";src:url(fonts/gowun.woff2) format("woff2");font-display:swap}'
    '@font-face{font-family:"Nunito";src:url(fonts/nunito.woff2) format("woff2");font-weight:400 700;font-display:swap}</style>'
)
wr(os.path.join(R, "dist", "artifact.html"), page.replace("<!--FONT-->", GF))
head = (
    '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    '<meta name="robots" content="noindex"><meta name="theme-color" content="#ece2d0">'
    '<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="3초 만능문장">'
    '<link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="icon-192.png">'
    "<style>:root{padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}[hidden]{display:none!important}</style>"
    "<script>window.__PWA=1</script></head><body>"
)
full = head + page.replace("<!--FONT-->", LF) + "</body></html>"
shutil.rmtree(A, ignore_errors=True)
shutil.copytree(os.path.join(H, "static"), A)
wr(os.path.join(A, "index.html"), full)
wr(os.path.join(A, "robots.txt"), "User-agent: *\nDisallow: /\n")
icons = [{"src": "icon-%d.png" % k, "sizes": "%dx%d" % (k, k), "type": "image/png"} for k in (192, 512)]
icons.append({**icons[1], "purpose": "maskable"})
man = {"name": "3초 만능문장", "short_name": "3초 만능문장", "lang": "ko", "id": "./", "start_url": "./", "scope": "./", "display": "standalone",
       "orientation": "portrait", "background_color": "#ece2d0", "theme_color": "#ece2d0", "icons": icons}
wr(os.path.join(A, "manifest.webmanifest"), json.dumps(man, ensure_ascii=False))
fd = os.path.join(A, "fonts")
fonts = ["fonts/" + f for f in sorted(os.listdir(fd)) if f.endswith(".woff2")] if os.path.isdir(fd) else []


def sha(f):
    b = open(os.path.join(A, *f.split("/")), "rb").read()
    return {"sha256": hashlib.sha256(b).hexdigest(), "size": len(b)}


wr(os.path.join(A, "version.json"), json.dumps({"n": n, "min": MIN_SHELL, "files": {f: sha(f) for f in ["index.html"] + fonts}}))
v = hashlib.sha1(full.encode()).hexdigest()[:8]
SW = """const V = "mn-%s";
const F = %s;
self.addEventListener("install", e => e.waitUntil(caches.open(V).then(c => c.addAll(F)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || e.request.url.includes("version.json")) return;
  e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(r => r || fetch(e.request)));
});
"""
wr(os.path.join(A, "sw.js"), SW % (v, json.dumps(["./", "manifest.webmanifest", "icon-192.png", "icon-512.png"] + fonts)))
print("build", n, v, len(full) // 1024, "KB", "fonts", fonts)
