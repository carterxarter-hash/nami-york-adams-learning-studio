// Run after npm run build. Uses Playwright and optionally AUDIO_CHROMIUM_PATH.
// The fixture serves exact dist files and blocks third-party requests, proving
// that effects and dialogue work without a CDN, YouTube, or archive service.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
  ? require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'playwright'))
  : await import('playwright');
const browser = await chromium.launch({
  executablePath: process.env.AUDIO_CHROMIUM_PATH || undefined,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const errors = [];
let manifestFailure = false;
let delayAudio = false;
const pending = [];
let archiveRequests = 0;
const page = await browser.newPage({ viewport: { width: 1280, height: 950 }, serviceWorkers: 'block' });
page.on('pageerror', error => errors.push(error.message));
await page.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (/\.zip|zip-full/.test(url.href)) archiveRequests++;
  if (url.origin !== 'http://localhost') return route.abort();
  if (url.pathname.endsWith('sounds.json') && manifestFailure) return route.fulfill({ status: 503, body: 'Unavailable' });
  if (url.pathname.endsWith('.wav') && delayAudio) await new Promise(resolve => pending.push(resolve));
  const file = path.join(process.cwd(), 'dist', url.pathname === '/' ? 'index.html' : url.pathname);
  try {
    const body = fs.readFileSync(file);
    const contentType = { '.html': 'text/html', '.json': 'application/json', '.wav': 'audio/wav', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(file)] || 'application/octet-stream';
    return route.fulfill({ status: 200, body, contentType });
  } catch { return route.fulfill({ status: 404, body: 'Not found' }); }
});
const click = action => page.locator('[data-starwars-sfx="' + action + '"]').click();
const status = () => page.locator('[data-starwars-sfx-status]').innerText();
try {
  await page.goto('http://localhost/#themes', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { window.audioEvents = []; document.addEventListener('starwars-audio-play', e => window.audioEvents.push(e.detail)); });
  await page.locator('[data-theme-id="starwars"]').click();
  await page.waitForFunction(() => starWarsLibraryState === 'ready' && starWarsSfxCtx?.state === 'running');
  assert.match(await status(), /791 sounds.*444 voice lines/);
  assert.equal(await page.evaluate(() => starWarsBanks.battleLight.length), 46);
  await page.waitForFunction(() => !!starWarsBed && window.audioEvents.some(e => e.channel === 'ambient'));
  await click('sample-blaster');
  await page.waitForFunction(() => window.audioEvents.some(e => /Blasters and Cannons/.test(e.filename)));
  await click('sample-saber');
  await page.waitForFunction(() => window.audioEvents.filter(e => /Lightsabers/.test(e.filename)).length >= 2);
  await click('sample-voice');
  await page.waitForFunction(() => [...starWarsActiveAudio].some(a => a.voice));
  console.log('PASS: manifest, blaster, saber, voice playback and ambient bed with third-party requests blocked.');

  // Measure real decoded waveforms, including all formats in the supplied pack.
  const decoding = await page.evaluate(async () => {
    clearStarWarsAmbience(); swStopAudio();
    const failed = [], silent = [];
    for (const entry of starWarsZipEntries) {
      try {
        const b = await swEntryBuffer(entry), samples = b.getChannelData(0);
        if (!samples.some(value => Math.abs(value) > .00001)) silent.push(entry.filename);
      } catch (e) { failed.push({ filename: entry.filename, error: e.message }); }
    }
    return { failed, silent, cacheBytes: starWarsCacheBytes, cacheSize: starWarsAudioCache.size };
  });
  assert.deepEqual(decoding.failed, []);
  assert.deepEqual(decoding.silent, []);
  assert.ok(decoding.cacheBytes <= 24 * 1024 * 1024 && decoding.cacheSize <= 40);
  console.log('PASS: all 791 clips decode to non-silent audio; memory cache stays bounded.');

  // A slow request completing after mute must not create a source.
  await page.evaluate(() => { clearStarWarsAmbience(); swStopAudio(); starWarsAudioCache.clear(); starWarsCacheBytes = 0; window.audioEvents = []; });
  delayAudio = true;
  await click('sample-blaster');
  await page.waitForFunction(() => starWarsAudioPending.size > 0);
  await click('toggle');
  delayAudio = false;
  pending.splice(0).forEach(resolve => resolve());
  await page.waitForFunction(() => starWarsAudioPending.size === 0);
  assert.deepEqual(await page.evaluate(() => ({ sources: starWarsActiveAudio.size, bed: !!starWarsBed, events: window.audioEvents.length })), { sources: 0, bed: false, events: 0 });
  console.log('PASS: mute cancels active audio and delayed playback.');

  await click('toggle');
  await click('voices'); // Off
  await page.evaluate(() => { window.audioEvents = []; });
  await click('sample-voice');
  assert.match(await status(), /Turn Voices on/);
  assert.equal(await page.evaluate(() => [...starWarsActiveAudio].some(a => a.voice)), false);
  await click('voices'); // On and immediate preview
  await page.waitForFunction(() => [...starWarsActiveAudio].some(a => a.voice));
  await click('ambient'); // Off, voices remain independent
  assert.equal(await page.evaluate(() => !!starWarsBed), false);
  assert.equal(await page.evaluate(() => !!starWarsVoiceTimer), true);
  console.log('PASS: independent voice and ambience controls.');

  // Interactions and rerenders must not postpone the already-scheduled voice.
  const timer = await page.evaluate(() => starWarsVoiceTimer);
  await page.locator('a[href="#home"]').first().click();
  assert.equal(await page.evaluate(() => starWarsVoiceTimer), timer);
  await page.locator('a[href="#themes"]').first().click();
  await page.locator('[data-theme-id="navy"]').click();
  assert.deepEqual(await page.evaluate(() => ({ sources: starWarsActiveAudio.size, bed: !!starWarsBed, voice: !!starWarsVoiceTimer })), { sources: 0, bed: false, voice: false });
  console.log('PASS: navigation preserves scheduling; changing theme stops all effects.');

  // A reload requires a gesture. A failed manifest settles and can be retried.
  manifestFailure = true;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-theme-id="starwars"]').click();
  await page.waitForFunction(() => starWarsLibraryState === 'error');
  assert.match(await status(), /Retry audio/);
  manifestFailure = false;
  await click('retry');
  await page.waitForFunction(() => starWarsLibraryState === 'ready');
  console.log('PASS: failed load shows a retry action and recovers.');

  await page.evaluate(() => saveStarWarsSfxPrefs({ enabled: true, ambient: true, voices: true }));
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.equal(await page.evaluate(() => starWarsActiveAudio.size), 0);
  await click('enable');
  await page.waitForFunction(() => starWarsSfxCtx?.state === 'running' && !!starWarsBed);
  const repeats = await page.evaluate(() => {
    const banks = ['battleLight', 'saberOn', 'voiceLines'];
    return banks.map(bank => { let previous, repeats = 0; for (let i = 0; i < 200; i++) { const entry = swPick(starWarsBanks[bank], bank); if (entry.filename === previous) repeats++; previous = entry.filename; } return repeats; });
  });
  assert.deepEqual(repeats, [0, 0, 0]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.getElementById('sidebar').getBoundingClientRect().right <= 0);
  await page.locator('[data-starwars-sfx="enable"]').scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: 'test-results/starwars-audio-mobile.png' });
  assert.equal(archiveRequests, 0);
  assert.deepEqual(errors, []);
  console.log('PASS: reload/unlock, no immediate repeats, mobile layout, zero archive requests and no page errors.');
} finally { pending.splice(0).forEach(resolve => resolve()); await browser.close(); }
