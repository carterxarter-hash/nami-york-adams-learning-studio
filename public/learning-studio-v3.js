(() => {
  'use strict';

  const STORY_ROUTES = ['#stories', '#story/', '#simulations', '#simulation/'];
  const ROTATION_URL = './resources/sw-video/rotation-v1.json';
  const handledVideos = new WeakSet();
  let rotationItems = null;
  let rotationBag = [];
  let currentVideoId = '';

  const css = `
    .story-mode-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 20px;padding:8px;border:1px solid var(--line);border-radius:14px;background:var(--panel2)}
    .story-mode-tabs a{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:9px 14px;border-radius:9px;color:var(--muted);text-decoration:none;font-weight:750;font-size:13px}
    .story-mode-tabs a.active{background:var(--ink);color:var(--panel);box-shadow:var(--shadow)}
    .story-mode-unified-note{margin:0 0 18px;padding:16px 18px;border:1px solid var(--line);border-left:4px solid var(--ink);border-radius:12px;background:var(--panel2)}
    .story-mode-unified-note strong{display:block;margin-bottom:4px;color:var(--text);font-size:16px}.story-mode-unified-note span{color:var(--muted);font-size:13px;line-height:1.55}
    details.upcoming-programs{margin-top:26px;border:1px solid var(--line);border-radius:var(--radius);background:var(--panel)}
    details.upcoming-programs>summary{cursor:pointer;padding:17px 20px;font-weight:800;color:var(--text)}.upcoming-programs-body{padding:0 20px 20px}
    .studio-build{opacity:.7;font-variant-numeric:tabular-nums;font-size:11px}.studio-update{position:fixed;right:18px;bottom:18px;z-index:120;padding:12px 15px;border:1px solid var(--line);border-radius:12px;background:var(--panel2);color:var(--text);box-shadow:var(--shadow);font-weight:800}
    .brand-title,.brand strong{font-family:var(--body)!important;letter-spacing:0!important;text-transform:none!important}.brand small{letter-spacing:.02em!important}
    button.icon-only,[class*="audio"] button{min-width:44px;min-height:44px}.content{padding-bottom:max(82px,env(safe-area-inset-bottom))!important}.main,.content,#main{min-width:0}.panel,.card{max-width:100%}
    @media(max-width:640px){.story-mode-tabs{display:grid;grid-template-columns:1fr}.story-mode-tabs a{width:100%}.content{padding-bottom:max(96px,env(safe-area-inset-bottom))!important}}
  `;

  function currentRoute(){ return location.hash || '#home'; }
  function inStoryMode(){ const hash=currentRoute(); return STORY_ROUTES.some(prefix=>hash===prefix || hash.startsWith(prefix)); }
  function addStyles(){ if(document.getElementById('learning-studio-v3-styles')) return; const s=document.createElement('style'); s.id='learning-studio-v3-styles'; s.textContent=css; document.head.appendChild(s); }

  function unifyNavigation(){
    const nav=document.querySelector('.primary-nav,#primary-nav');
    if(!nav) return;
    nav.querySelectorAll('[data-nav="simulations"]').forEach(el=>el.remove());
    let story=nav.querySelector('[data-nav="stories"]');
    if(story){
      story.setAttribute('href','#stories');
      const label=story.querySelector('span:last-child');
      if(label) label.textContent='Story Mode'; else if(/story/i.test(story.textContent||'')) story.textContent='Story Mode';
      const active=inStoryMode(); story.classList.toggle('active',active); active?story.setAttribute('aria-current','page'):story.removeAttribute('aria-current');
    }
    document.querySelectorAll('a[href="#simulations"],a[href^="#simulation/"]').forEach(link=>{
      if(/simulation room/i.test(link.textContent||'')) link.textContent='Story Mode · Focused branches';
    });
  }

  function storyTabs(){
    if(!inStoryMode()) return;
    const main=document.getElementById('main')||document.querySelector('main'); if(!main) return;
    if(!main.querySelector('.story-mode-tabs')){
      const tabs=document.createElement('nav'); tabs.className='story-mode-tabs'; tabs.setAttribute('aria-label','Story Mode practice type');
      tabs.innerHTML='<a href="#stories">Branching meetings</a><a href="#simulations">Focused branches</a>';
      main.prepend(tabs);
    }
    const hash=currentRoute(); const focused=hash.startsWith('#simulation')||hash==='#simulations';
    main.querySelectorAll('.story-mode-tabs a').forEach((a,i)=>{ const active=focused?i===1:i===0; a.classList.toggle('active',active); active?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'); });
    if(!main.querySelector('.story-mode-unified-note')){
      const note=document.createElement('div'); note.className='story-mode-unified-note';
      note.innerHTML=focused?'<strong>Story Mode · Focused branch practice</strong><span>Practice a concentrated support-group pressure point. Your decisions change what happens next, and the debrief explains the consequences.</span>':'<strong>One support-group simulator. Many possible rooms.</strong><span>Run branching meetings where facilitator choices shape trust, voice, privacy, time, safety, repairs and the ending you reach. Switch to Focused branches for shorter decision paths.</span>';
      const tabs=main.querySelector('.story-mode-tabs'); tabs.insertAdjacentElement('afterend',note);
    }
    main.querySelectorAll('a[href="#simulations"]').forEach(a=>{ if(/back/i.test(a.textContent||'')) a.textContent='Back to Story Mode · Focused branches'; });
    if(focused){
      main.querySelectorAll('h1,h2,.eyebrow').forEach(el=>{ if(/^simulation room$/i.test((el.textContent||'').trim())) el.textContent='Story Mode'; else if(/^simulation$/i.test((el.textContent||'').trim())) el.textContent='STORY MODE · FOCUSED BRANCH'; });
    }
  }

  function cleanBrand(){
    const brand=document.querySelector('.brand'); if(!brand) return; brand.setAttribute('aria-label','NAMI York-Adams Learning Studio');
    const title=brand.querySelector('.brand-title,strong'); if(title && /learn/i.test(title.textContent||'')) title.textContent='Learning Studio';
    const small=brand.querySelector('small'); if(small) small.textContent='Volunteer learning · York-Adams';
  }

  function accessibility(){
    const labels=[
      ['[data-starwars-audio="toggle"]','Play or pause Star Wars soundtrack'],['[data-starwars-audio="prev"]','Previous Star Wars soundtrack track'],['[data-starwars-audio="next"]','Next Star Wars soundtrack track'],['[data-starwars-shuffle]','Toggle Star Wars soundtrack shuffle'],
      ['[data-matrix-audio="toggle"]','Play or pause Matrix soundtrack'],['[data-matrix-audio="prev"]','Previous Matrix soundtrack track'],['[data-matrix-audio="next"]','Next Matrix soundtrack track'],['[data-matrix-sfx]','Toggle Matrix sound effects'],
      ['[data-starwars-sfx]','Toggle Star Wars sound effects'],['[data-starwars-ambience]','Toggle Star Wars ambience'],['[data-starwars-voices]','Toggle Star Wars voice lines']
    ];
    labels.forEach(([sel,label])=>document.querySelectorAll(sel).forEach(el=>{ if(!el.getAttribute('aria-label')) el.setAttribute('aria-label',label); }));
    document.querySelectorAll('button').forEach(button=>{ const iconOnly=button.classList.contains('icon-only')||(!button.textContent.trim()&&!!button.querySelector('svg,.icon')); if(iconOnly&&!button.getAttribute('aria-label')) button.setAttribute('aria-label',(button.getAttribute('title')||button.dataset.action||'Control').replace(/[-_]/g,' ')); });
  }

  function consolidateUpcoming(){
    if(currentRoute()!=='#home' && currentRoute()!=='') return;
    const main=document.getElementById('main')||document.querySelector('main'); if(!main||main.querySelector('details.upcoming-programs')) return;
    const nodes=[]; ['.locked-grid','.framework-grid'].forEach(sel=>{ const grid=main.querySelector(sel); if(!grid)return; const head=grid.previousElementSibling?.classList.contains('section-head')?grid.previousElementSibling:null; if(head)nodes.push(head); nodes.push(grid); });
    if(!nodes.length)return; const details=document.createElement('details'); details.className='upcoming-programs'; details.innerHTML='<summary>Upcoming programs and training frameworks</summary><div class="upcoming-programs-body"></div>'; const body=details.querySelector('.upcoming-programs-body'); nodes[0].parentNode.insertBefore(details,nodes[0]); nodes.forEach(n=>body.appendChild(n));
  }

  function removeBrokenBadgeCopy(){ document.querySelectorAll('p,small,span').forEach(el=>{ const t=(el.textContent||'').trim(); if(t.length<140&&/hide this badge/i.test(t)) el.remove(); }); }

  async function loadRotation(){ if(rotationItems)return rotationItems; try{ const r=await fetch(ROTATION_URL,{cache:'no-store'}); if(!r.ok)throw new Error(); const j=await r.json(); rotationItems=Array.isArray(j.items)?j.items:[]; }catch(_){ rotationItems=[]; } return rotationItems; }
  function mediaPath(item){ return matchMedia('(max-width:700px)').matches && item.mobile?item.mobile:item.desktop; }
  function nextItem(items){
    if(items.length<2)return items[0]||null;
    if(items.length===2)return items.find(x=>x.id!==currentVideoId)||items[0];
    if(!rotationBag.length){ rotationBag=items.map(x=>x.id).filter(id=>id!==currentVideoId); for(let i=rotationBag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[rotationBag[i],rotationBag[j]]=[rotationBag[j],rotationBag[i]];} }
    const id=rotationBag.shift(); return items.find(x=>x.id===id)||items[0];
  }
  function playItem(video,item){ if(!item)return; currentVideoId=item.id; video.dataset.rotationItem=item.id; const src=mediaPath(item); if(video.getAttribute('src')!==src){ video.src=src; video.load(); } video.play().catch(()=>{}); }
  async function backgroundRotation(){
    const video=document.getElementById('starwars-background-video'); if(!(video instanceof HTMLVideoElement))return;
    video.loop=false; video.muted=true; video.defaultMuted=true; video.playsInline=true; video.setAttribute('muted',''); video.setAttribute('playsinline','');
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){video.pause();return;}
    const items=await loadRotation(); if(!items.length)return;
    if(!currentVideoId){ const src=video.currentSrc||video.querySelector('source')?.src||''; currentVideoId=(items.find(i=>src.includes((i.desktop||'').split('/').pop()))||items[0]).id; video.dataset.rotationItem=currentVideoId; }
    if(!handledVideos.has(video)){ handledVideos.add(video); video.addEventListener('ended',()=>playItem(video,nextItem(items))); video.addEventListener('error',()=>{const n=nextItem(items);if(n&&n.id!==currentVideoId)playItem(video,n);}); }
    video.dataset.rotationReady='true';
  }

  function buildBadge(){
    const foot=document.querySelector('.page-foot'); if(!foot||foot.querySelector('.studio-build'))return;
    fetch('./build-meta.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(meta=>{if(!meta)return;const s=document.createElement('span');s.className='studio-build';s.textContent=`Build ${String(meta.commit||meta.buildId||'').slice(0,10)}`;s.title=`Published ${meta.builtAt||''}`;foot.appendChild(s);}).catch(()=>{});
  }
  function updateUX(){ if(!('serviceWorker'in navigator)||window.__studioUpdateUX)return; window.__studioUpdateUX=true; navigator.serviceWorker.addEventListener('controllerchange',()=>{if(document.querySelector('.studio-update'))return;const b=document.createElement('button');b.className='studio-update';b.type='button';b.textContent='Update ready · Reload';b.onclick=()=>location.reload();document.body.appendChild(b);}); }

  function apply(){ addStyles(); unifyNavigation(); storyTabs(); cleanBrand(); accessibility(); consolidateUpcoming(); removeBrokenBadgeCopy(); buildBadge(); backgroundRotation(); }
  function schedule(){ requestAnimationFrame(apply); setTimeout(apply,80); setTimeout(apply,450); }
  document.addEventListener('DOMContentLoaded',schedule,{once:true}); window.addEventListener('hashchange',schedule); document.addEventListener('click',()=>setTimeout(apply,80),{passive:true}); document.addEventListener('change',()=>setTimeout(apply,60),{passive:true}); document.addEventListener('visibilitychange',()=>{const v=document.getElementById('starwars-background-video');if(v instanceof HTMLVideoElement){if(document.hidden)v.pause();else if(!matchMedia('(prefers-reduced-motion: reduce)').matches)v.play().catch(()=>{});}}); updateUX(); schedule();
})();