(() => {
  'use strict';

  const PACKAGES = [
    {
      id: 'battle-v1',
      desktop: './resources/sw-video/battle-desktop-v1.mp4',
      mobile: './resources/sw-video/battle-mobile-v1.mp4',
    },
    {
      id: 'battle-v2',
      desktop: './resources/sw-video/battle-v2.mp4',
      mobile: './resources/sw-video/battle-v2.mp4',
    },
  ];

  const MOBILE = '(max-width: 767px)';
  const STATE_KEY = 'namiya-starwars-background-rotation-v1';
  const attached = new WeakSet();
  let activeIndex = -1;
  let queue = [];

  const media = () => window.matchMedia(MOBILE).matches ? 'mobile' : 'desktop';
  const srcFor = (item) => item[media()] || item.desktop || item.mobile;
  const absolute = (src) => new URL(src, document.baseURI).href;

  function findBackgroundVideo() {
    const videos = [...document.querySelectorAll('video')];
    return videos.find((video) => {
      const urls = [video.currentSrc, video.src, video.poster, ...[...video.querySelectorAll('source')].map((s) => s.src)];
      return urls.some((url) => String(url || '').includes('/resources/sw-video/'));
    }) || null;
  }

  function detectIndex(video) {
    const current = video.currentSrc || video.src || '';
    const found = PACKAGES.findIndex((item) => [item.desktop, item.mobile].some((src) => src && current.includes(src.replace(/^\.\//, ''))));
    return found >= 0 ? found : 0;
  }

  function shuffledNextQueue(excludeIndex) {
    const indexes = PACKAGES.map((_, index) => index).filter((index) => index !== excludeIndex);
    for (let i = indexes.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
    }
    if (excludeIndex >= 0 && PACKAGES.length > 1) indexes.push(excludeIndex);
    return indexes;
  }

  function remember(index) {
    try { sessionStorage.setItem(STATE_KEY, String(index)); } catch (_) {}
  }

  function playPackage(video, index) {
    const item = PACKAGES[index];
    if (!item) return;
    activeIndex = index;
    remember(index);
    video.loop = false;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    const target = absolute(srcFor(item));
    if (video.currentSrc !== target && video.src !== target) {
      video.src = target;
      video.load();
    }
    const result = video.play();
    if (result && typeof result.catch === 'function') result.catch(() => {});
  }

  function advance(video) {
    if (PACKAGES.length < 2) {
      playPackage(video, 0);
      return;
    }
    if (!queue.length) queue = shuffledNextQueue(activeIndex);
    let next = queue.shift();
    if (next === activeIndex && queue.length) {
      queue.push(next);
      next = queue.shift();
    }
    playPackage(video, next);
  }

  function attach(video) {
    if (!video || attached.has(video)) return;
    attached.add(video);
    video.loop = false;
    activeIndex = detectIndex(video);
    queue = shuffledNextQueue(activeIndex);
    video.addEventListener('ended', () => advance(video));
    video.addEventListener('error', () => {
      if (!video.isConnected) return;
      window.setTimeout(() => advance(video), 700);
    });
  }

  function scan() {
    const video = findBackgroundVideo();
    if (video) attach(video);
  }

  scan();
  window.setInterval(scan, 1000);
})();
