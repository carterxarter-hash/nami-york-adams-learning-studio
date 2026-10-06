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
  assert.match(await status(), /630 sounds.*323 ambient quotes/);
  assert.equal(await page.evaluate(() => starWarsBanks.battleLight.length), 70);
  await page.waitForFunction(() => !!starWarsBed && !!starWarsAmbientTimer && !!starWarsVoiceTimer);
  await page.evaluate(() => playStarWarsBank('ambientEffects', .65, false, 'ambient'));
  await click('sample-blaster');
  await page.waitForFunction(() => window.audioEvents.some(e => /Blasters and Cannons/.test(e.filename)));
  await click('sample-saber');
  await page.waitForFunction(() => window.audioEvents.some(e => /Lightsabers/.test(e.filename)));
  await click('sample-voice');
  await page.waitForFunction(() => [...starWarsActiveAudio].some(a => a.voice));
  console.log('PASS: manifest, blaster, saber, voice playback and ambient bed with third-party requests blocked.');

  // Measure real decoded waveforms, including all formats in the supplied pack.
  const decoding = await page.evaluate(async () => {
    clearStarWarsAmbience(); swStopAudio();
    const failed = [], silent = [];
    for (const entry of new Map(starWarsZipEntries.map(e => [e.file, e])).values()) {
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
  console.log('PASS: all 617 unique curated recordings decode to non-silent audio; memory cache stays bounded.');

  // Check exact folder membership and full rotations, not a small random sample.
  const pools = await page.evaluate(() => {
    const counts = {};
    for (const e of starWarsZipEntries) counts[e.pool] = (counts[e.pool] || 0) + 1;
    starWarsShuffles.clear();
    const cycles = [0, 1].map(() => Array.from({ length: 91 }, () => swPick(starWarsBanks.clicks, 'clicks').file));
    return { counts, cycles, effectsAreNonverbal: starWarsBanks.ambientEffects.every(e => !e.voice),
      quotesHaveNoParentheses: starWarsBanks.voiceLines.every(e => !/\([^)]*\)/.test(e.filename)),
      allAmbienceUsed: starWarsZipEntries.filter(e => e.filename.startsWith('Ambience/')).every(e =>
        [...starWarsBanks.voiceLines, ...starWarsBanks.ambientEffects].includes(e)) };
  });
  assert.deepEqual(pools.counts, { ambientEffects: 110, ambientQuotes: 323, clicks: 91, rightSingle: 33, rightTask: 12, wrongSingle: 44, wrongTask: 17 });
  for (const cycle of pools.cycles) assert.equal(new Set(cycle).size, 91);
  assert.notEqual(pools.cycles[0].at(-1), pools.cycles[1][0]);
  assert.ok(pools.effectsAreNonverbal && pools.quotesHaveNoParentheses && pools.allAmbienceUsed);

  // Deterministic timer harness: both timelines run independently, and only
  // schedule their next gap once their own playback completes.
  const timing = await page.evaluate(async () => {
    clearStarWarsAmbience(); swStopAudio();
    const original = { set: window.setTimeout, clear: window.clearTimeout, play: playStarWarsBank, random: Math.random };
    const timers = [], calls = [], done = {};
    let id = 80000;
    try {
      window.setTimeout = (callback, delay) => { const t = { id: ++id, callback, delay }; timers.push(t); return t.id; };
      window.clearTimeout = () => {};
      playStarWarsBank = (bank, scale, duck, channel) => { calls.push({ bank, channel }); return new Promise(resolve => { done[channel] = resolve; }); };
      Math.random = () => 0;
      scheduleStarWarsAmbience();
      const first = timers.map(t => t.delay);
      const voice = timers.find(t => t.delay === 7000).callback();
      const ambient = timers.find(t => t.delay === 15000).callback();
      const duringPlayback = timers.length;
      Math.random = () => .999999;
      done.ambient(true); await ambient;
      const afterEffect = timers.map(t => t.delay);
      done.voice(true); await voice;
      return { first, duringPlayback, afterEffect, final: timers.map(t => t.delay), calls };
    } finally {
      clearStarWarsAmbience();
      window.setTimeout = original.set; window.clearTimeout = original.clear;
      playStarWarsBank = original.play; Math.random = original.random;
    }
  });
  assert.deepEqual(timing.first, [15000, 7000]);
  assert.equal(timing.duringPlayback, 2);
  assert.equal(timing.afterEffect.length, 3);
  assert.ok(timing.afterEffect[2] >= 15000 && timing.afterEffect[2] < 25000);
  assert.equal(timing.final.length, 4);
  assert.ok(timing.final[3] >= 7000 && timing.final[3] < 15000);
  assert.deepEqual(timing.calls, [{ bank: 'voiceLines', channel: 'voice' }, { bank: 'ambientEffects', channel: 'ambient' }]);
  console.log('PASS: every curated folder, all 91 clicks before repeats, independent 7–15/15–25-second gaps after playback.');

  const overlapping = await page.evaluate(async () => {
    const quote = starWarsBanks.voiceLines.find(e => /Death Star plans/.test(e.filename));
    const effect = starWarsBanks.ambientEffects.find(e => /Vader Breath/.test(e.filename));
    await Promise.all([swEntryBuffer(quote), swEntryBuffer(effect)]);
    await Promise.all([swPlayEntry(quote, .9, true, 'voice'), swPlayEntry(effect, .5, false, 'ambient')]);
    const result = [...starWarsActiveAudio].map(a => a.channel);
    window.audioEvents = [];
    playStarWarsGradeSfx('strong');
    return result;
  });
  assert.ok(overlapping.includes('voice') && overlapping.includes('ambient'));
  await page.waitForFunction(() => window.audioEvents.some(e => e.pool === 'rightSingle'));
  assert.equal(await page.evaluate(() => [...starWarsActiveAudio].some(a => a.channel === 'voice')), false);
  console.log('PASS: simultaneous quote/environment playback; answer dialogue takes priority.');
  await page.evaluate(async () => {
    swStopAudio();
    const click = starWarsBanks.clicks.find(e => /Ion Cannon Hoth/.test(e.filename));
    await swEntryBuffer(click);
    for (let i = 0; i < 6; i++) await swPlayEntry(click, .2, false, 'effect');
    window.audioEvents = [];
    playStarWarsGradeSfx('wrong');
  });
  await page.waitForFunction(() => window.audioEvents.some(e => e.pool === 'wrongSingle'));
  assert.ok(await page.evaluate(() => starWarsActiveAudio.size <= 5));
  console.log('PASS: rapid clicks stay bounded and cannot crowd out graded feedback.');


  // Drive the actual UI handlers for each assessment type. Speed up only the
  // test context's source playback so queued answer/task clips finish quickly.
  await page.evaluate(() => {
    swStopAudio(); clearStarWarsAmbience();
    window.originalSource = starWarsSfxCtx.createBufferSource.bind(starWarsSfxCtx);
    starWarsSfxCtx.createBufferSource = () => { const source = window.originalSource(); source.playbackRate.value = 8; return source; };
  });
  const resetAudio = async () => {
    await page.evaluate(() => { clearStarWarsAmbience(); swStopAudio(); });
    await page.waitForFunction(() => !starWarsFeedbackRunning);
    await page.evaluate(() => { window.audioEvents = []; });
  };
  for (const [grade, side] of [['best', 'right'], ['revisit', 'wrong']]) {
    await resetAudio();
    const selector = await page.evaluate(grade => {
      const c = CASES.find(c => c.branch && c.options.some(o => o.grade === grade) && c.branch.options.some(o => o.grade === grade));
      const initial = c.options.findIndex(o => o.grade === grade), final = c.branch.options.findIndex(o => o.grade === grade);
      state.answers[c.id] = { 0: { choice: initial, grade } }; ui.caseStage[c.id] = 1;
      go('practice/' + c.id);
      return `[data-action="answer"][data-case="${c.id}"][data-stage="1"][data-choice="${final}"]`;
    }, grade);
    await page.locator(selector).click();
    await page.waitForFunction(side => window.audioEvents.some(e => e.pool === side + 'Task'), side);
    assert.deepEqual(await page.evaluate(() => window.audioEvents.filter(e => e.channel === 'feedback').map(e => e.pool)), [side + 'Single', side + 'Task']);
    assert.equal(await page.evaluate(() => window.audioEvents.filter(e => e.pool === 'clicks').length), 1);
  }
  for (const correct of [true, false]) {
    await resetAudio();
    await page.evaluate(correct => {
      const d = DRILLS.find(d => d.kind === 'sequence');
      V.drafts[d.id] = correct ? [...d.correct] : [...d.correct].reverse(); V.revealed[d.id] = false;
      go('drill/' + d.id);
    }, correct);
    await page.locator('[data-v2="drill-check"]').click();
    await page.waitForFunction(pool => window.audioEvents.some(e => e.pool === pool), correct ? 'rightTask' : 'wrongTask');
  }
  for (const [grade, side] of [['strong', 'right'], ['rethink', 'wrong']]) {
    await resetAudio();
    const selector = await page.evaluate(grade => {
      const s = SIMS.find(s => s.nodes[s.start].options.some(o => o.grade === grade));
      delete state.simulations[s.id]; go('simulation/' + s.id);
      return `[data-v2="sim-answer"][data-index="${s.nodes[s.start].options.findIndex(o => o.grade === grade)}"]`;
    }, grade);
    await page.locator(selector).click();
    await page.waitForFunction(pool => window.audioEvents.some(e => e.pool === pool), side + 'Single');
    await resetAudio();
    await page.evaluate(grade => {
      const s = SIMS.find(s => Object.values(s.nodes).some(n => n.options.some(o => o.next === 'end' && o.grade === grade)));
      const n = Object.values(s.nodes).find(n => n.options.some(o => o.next === 'end' && o.grade === grade));
      state.simulations[s.id] = { history: [{ node: n.id, choice: n.options.findIndex(o => o.next === 'end' && o.grade === grade) }], current: n.id, completed: false };
      go('simulation/' + s.id);
    }, grade);
    await page.locator('[data-v2="sim-next"]').click();
    await page.waitForFunction(pool => window.audioEvents.some(e => e.pool === pool), side + 'Task');
  }
  for (const [grade, side] of [['strong', 'right'], ['rethink', 'wrong']]) {
    await resetAudio();
    await page.evaluate(grade => {
      const story = STORIES[0], history = []; let node = story.start;
      while (node !== 'end') { const n = story.nodes[node], choice = n.options.findIndex(o => o.grade === grade); history.push({ node, choice }); node = n.options[choice].next; }
      state.stories[story.id] = { history, pending: true, endings: [] }; go('story/' + story.id);
    }, grade);
    await page.locator('[data-story="next"]').click();
    await page.waitForFunction(pool => window.audioEvents.some(e => e.pool === pool), side + 'Task');
  }
  await resetAudio();
  assert.deepEqual(await page.evaluate(() => ['workable', 'reasonable', 'okay', 'review'].map(g => swFeedbackBank(g))), [null, null, null, null]);
  await page.evaluate(() => { starWarsSfxCtx.createBufferSource = window.originalSource; go('themes'); });
  console.log('PASS: real answer, drill, simulation and story controls select the matching single/task folders, with one click cue per answer.');

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
  await click('voices'); // On, then explicit preview
  await click('sample-voice');
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
    const banks = ['clicks', 'battleLight', 'saberOn', 'voiceLines'];
    return banks.map(bank => { let previous, repeats = 0; for (let i = 0; i < 200; i++) { const entry = swPick(starWarsBanks[bank], bank); if (entry.filename === previous) repeats++; previous = entry.filename; } return repeats; });
  });
  assert.deepEqual(repeats, [0, 0, 0, 0]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.getElementById('sidebar').getBoundingClientRect().right <= 0);
  await page.locator('[data-starwars-sfx="enable"]').scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: 'test-results/starwars-audio-mobile.png' });
  assert.equal(archiveRequests, 0);
  assert.deepEqual(errors, []);
  console.log('PASS: reload/unlock, no immediate repeats, mobile layout, zero archive requests and no page errors.');
} finally { pending.splice(0).forEach(resolve => resolve()); await browser.close(); }
