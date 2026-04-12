const CACHE = "dookmusic-v1";
const ASSETS = [
  "./", "./index.html", "./style.css",
  "./js/main.js", "./js/visualizer.js",
  "./js/hidetutorial.js", "./js/mobile.js",
  "./default.png", "./svgs/play.svg",
  "./svgs/pause.svg", "./svgs/prev.svg",
  "./svgs/next.svg", "./svgs/viz.svg",
  "svgs/vizNo.svg"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener("fetch", e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});