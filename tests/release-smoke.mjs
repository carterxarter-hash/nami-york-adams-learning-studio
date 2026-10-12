import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root=process.cwd(),dist=path.join(root,'dist');
const meta=JSON.parse(fs.readFileSync(path.join(dist,'build-meta.json'),'utf8'));
const rotation=JSON.parse(fs.readFileSync(path.join(dist,'resources/sw-video/rotation-v1.json'),'utf8'));
assert.equal(meta.version,'3.0.0');
assert.ok(meta.buildId);
assert.ok(rotation.items.length>=2);
assert.ok(rotation.items.some(x=>x.id==='battle-v1'));
assert.ok(rotation.items.some(x=>x.id==='background-package-2026-10-07-01'));
for(const item of rotation.items){for(const key of ['desktop','mobile']){const file=path.join(dist,String(item[key]).replace(/^\.\//,''));assert.ok(fs.existsSync(file),`missing rotation asset ${file}`);}}
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
assert.match(html,/learning-studio-v3\.js/);assert.match(html,/starwars-music-browser\.js/);
assert.doesNotMatch(fs.readFileSync(path.join(dist,'sw.js'),'utf8'),/__BUILD_ID__/);
const music=fs.readFileSync(path.join(dist,'starwars-music-browser.js'),'utf8');
assert.doesNotMatch(music,/setInterval\s*\(/);assert.doesNotMatch(music,/MutationObserver/);

const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1280,height:900},serviceWorkers:'block'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!=='http://localhost')return route.abort();const pathname=u.pathname==='/'?'/index.html':u.pathname;const file=path.join(dist,pathname);try{const body=fs.readFileSync(file),ext=path.extname(file),contentType=({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.mp4':'video/mp4','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.wav':'audio/wav'})[ext]||'application/octet-stream';return route.fulfill({status:200,body,contentType});}catch{return route.fulfill({status:404,body:'Not found'});}});
try{
  await page.goto('http://localhost/#home',{waitUntil:'domcontentloaded'});await page.waitForSelector('#main');await page.waitForTimeout(500);
  assert.equal(await page.locator('[data-nav="simulations"]').count(),0,'separate Simulation Room nav must be retired');
  assert.equal(await page.locator('[data-nav="stories"]').count(),1,'Story Mode nav should exist once');
  await page.evaluate(()=>location.hash='#stories');await page.waitForTimeout(450);
  assert.equal(await page.locator('.story-mode-tabs').count(),1);assert.match(await page.locator('.story-mode-unified-note').innerText(),/support-group simulator/i);
  await page.evaluate(()=>location.hash='#simulations');await page.waitForTimeout(450);
  assert.equal(await page.locator('.story-mode-tabs a.active').innerText(),'Focused branches');
  const storyActive=await page.locator('[data-nav="stories"]').evaluate(el=>el.classList.contains('active'));assert.equal(storyActive,true);
  await page.evaluate(()=>location.hash='#themes');await page.waitForTimeout(300);
  const starWars=page.locator('[data-theme-id="starwars"],[data-theme="starwars"]').first();if(await starWars.count()){await starWars.click();await page.waitForTimeout(700);const video=page.locator('#starwars-background-video');if(await video.count()){const state=await video.evaluate(v=>({muted:v.muted,loop:v.loop,ready:v.dataset.rotationReady}));assert.equal(state.muted,true);assert.equal(state.loop,false);assert.equal(state.ready,'true');}}
  const unlabeled=await page.locator('button').evaluateAll(buttons=>buttons.filter(b=>{const visible=!!(b.offsetWidth||b.offsetHeight||b.getClientRects().length);return visible&&!!b.querySelector('svg,.icon')&&!(b.textContent||'').trim()&&!b.getAttribute('aria-label')&&!b.getAttribute('title');}).length);assert.equal(unlabeled,0,'visible icon-only buttons need accessible names');
  assert.deepEqual(errors,[]);
  console.log('PASS unified Story Mode, accessibility, release metadata and background rotation smoke test');
}finally{await browser.close();}
