// Run npm run build first. VIDEO_TEST_URL optionally checks a deployed build.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const options = { headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] };
if (process.env.VIDEO_CHROMIUM_MODULE) {
  const { default: runtime } = await import(process.env.VIDEO_CHROMIUM_MODULE);
  options.executablePath = process.env.VIDEO_CHROMIUM_PATH || await runtime.executablePath();
  options.args = runtime.args;
}
const browser = await chromium.launch(options);
const base = process.env.VIDEO_TEST_URL || 'http://localhost/';
const errors = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
await context.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.origin !== new URL(base).origin) return route.abort();
  if (process.env.VIDEO_TEST_URL) return route.continue();
  const file = path.join(process.cwd(), 'dist', url.pathname === '/' ? 'index.html' : url.pathname);
  try {
    const body = fs.readFileSync(file);
    const contentType = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.wav': 'audio/wav' }[path.extname(file)] || 'application/octet-stream';
    const range = route.request().headers().range?.match(/^bytes=(\d+)-(\d*)$/);
    if (range) {
      const start = Number(range[1]), end = Math.min(Number(range[2] || body.length - 1), body.length - 1);
      return route.fulfill({ status: 206, contentType, headers: { 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${body.length}` }, body: body.subarray(start, end + 1) });
    }
    return route.fulfill({ status: 200, body, contentType });
  } catch { return route.fulfill({ status: 404, body: 'missing' }); }
});
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
const videoState = () => page.locator('#starwars-background-video').evaluate(v => ({
  paused: v.paused, time: v.currentTime, duration: v.duration, width: v.videoWidth,
  source: v.currentSrc, muted: v.muted, loop: v.loop, inline: v.playsInline,
}));
const playing = p => p.waitForFunction(() => {
  const v = document.getElementById('starwars-background-video');
  return v && !v.paused && v.currentTime > .1 && v.videoWidth > 0;
});
try {
  let videoRequests = 0;
  page.on('request', r => { if (/sw-video\/.*\.mp4/.test(r.url())) videoRequests++; });
  await page.goto(base + '#themes');
  assert.equal(videoRequests, 0, 'Other themes must not download video');
  await page.locator('[data-theme-id="starwars"]').click();
  await playing(page);
  const initial = await videoState();
  assert.match(initial.source, /battle-desktop/);
  assert.ok(initial.muted && initial.loop && initial.inline);
  assert.ok(initial.duration > 109 && initial.width === 1156);
  assert.equal(await page.locator('.theme-motion-canvas').evaluate(el => getComputedStyle(el).display), 'none');
  // Verify a changing decoded frame, not only an advancing timestamp.
  const firstFrame = await page.locator('#starwars-background-video').screenshot();
  await page.waitForFunction(t => document.getElementById('starwars-background-video').currentTime > t + .5, initial.time);
  assert.ok(!firstFrame.equals(await page.locator('#starwars-background-video').screenshot()));
  await page.locator('#motion-shortcut').click();
  const paused = await videoState();
  assert.ok(paused.paused);
  await page.waitForTimeout(250);
  assert.equal((await videoState()).time, paused.time);
  await page.locator('#motion-shortcut').click();
  await playing(page);
  await page.evaluate(() => { window.checkedVideo = document.getElementById('starwars-background-video'); location.hash = 'home'; });
  await page.waitForFunction(() => location.hash === '#home' && document.querySelector('.dashboard-hero'));
  assert.ok(await page.evaluate(() => window.checkedVideo === document.getElementById('starwars-background-video')));
  fs.mkdirSync('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/starwars-video-desktop.png' });
  await page.evaluate(() => { document.getElementById('starwars-background-video').currentTime = 109.8; });
  await page.waitForFunction(() => document.getElementById('starwars-background-video').currentTime < 2);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  assert.ok((await videoState()).paused);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow')));
  await playing(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => document.getElementById('starwars-background-video').paused);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await playing(page);
  await page.evaluate(() => { applyTheme('navy'); render(); });
  assert.ok((await videoState()).paused);
  assert.ok(await page.locator('.starwars-video-backdrop').evaluate(el => el.hidden));
  assert.notEqual(await page.locator('.theme-motion-canvas').evaluate(el => getComputedStyle(el).display), 'none');
  await page.evaluate(() => { applyTheme('starwars'); render(); });
  await playing(page);
  assert.equal(await page.locator('#starwars-background-video').count(), 1);
  console.log('PASS: real desktop decoding, loop, pause/resume, navigation, theme changes, reduced motion, page lifecycle.');

  const mobile = await context.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.setViewportSize({ width: 390, height: 844 });
  mobile.on('pageerror', error => errors.push(error.message));
  await mobile.goto(base + '#themes');
  await mobile.locator('[data-theme-id="starwars"]').click();
  await playing(mobile);
  assert.match(await mobile.locator('video').evaluate(v => v.currentSrc), /battle-mobile/);
  await mobile.evaluate(() => { location.hash = 'home'; });
  await mobile.waitForFunction(() => !!document.querySelector('.dashboard-hero'));
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await mobile.screenshot({ path: 'test-results/starwars-video-mobile.png' });
  await mobile.setViewportSize({ width: 844, height: 390 });
  await playing(mobile);
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await mobile.screenshot({ path: 'test-results/starwars-video-landscape.png' });

  const reduced = await context.newPage();
  await reduced.emulateMedia({ reducedMotion: 'reduce' });
  let reducedDownloads = 0;
  reduced.on('request', r => { if (/sw-video\/.*\.mp4/.test(r.url())) reducedDownloads++; });
  await reduced.goto(base + '#themes');
  await reduced.locator('[data-theme-id="starwars"]').click();
  assert.equal(await reduced.locator('video').getAttribute('src'), null);
  assert.equal(reducedDownloads, 0);
  assert.ok(await reduced.locator('video').evaluate(v => !!v.poster && v.paused));

  const failed = await context.newPage();
  await failed.route('**/sw-video/*.mp4', route => route.fulfill({ status: 404, body: 'missing' }));
  await failed.goto(base + '#themes');
  await failed.locator('[data-theme-id="starwars"]').click();
  await failed.waitForFunction(() => document.querySelector('.starwars-video-backdrop')?.hidden);
  assert.notEqual(await failed.locator('.theme-motion-canvas').evaluate(el => getComputedStyle(el).display), 'none');
  console.log('PASS: mobile portrait/landscape, reduced-motion poster without download, missing-video fallback.');
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
