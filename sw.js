/* 離線快取：第一次開啟後，沒有網路也能使用。改版時把版本號加一即可。 */
var CACHE = "kmbt-calc-v1";
var CORE = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});
function store(req, res) {
  if (res && (res.ok || res.type === "opaque")) {
    var copy = res.clone();
    caches.open(CACHE).then(function (c) { c.put(req, copy); });
  }
  return res;
}
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin === location.origin) {
    /* 自己的檔案：先連網取最新版，失敗再用快取 */
    e.respondWith(
      fetch(req).then(function (res) { return store(req, res); }).catch(function () {
        return caches.match(req).then(function (hit) { return hit || caches.match("index.html"); });
      })
    );
  } else if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    /* 字型：快取優先 */
    e.respondWith(caches.match(req).then(function (hit) { return hit || fetch(req).then(function (res) { return store(req, res); }); }));
  }
});
