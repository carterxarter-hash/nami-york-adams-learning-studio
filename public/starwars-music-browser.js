(() => {
  'use strict';

  const PREF_KEY = 'namiya-starwars-music-browser-v5';
  const CATALOG_URL = './resources/starwars-music/tracks-v1.json';
  let tracks = [];
  let ids = [];
  let catalogPromise = null;
  let playlistLoaded = false;
  let loading = false;

  const css = `
    .starwars-music-browser{margin:12px 0 2px;padding:14px;border:1px solid rgba(255,225,125,.38);border-radius:12px;background:linear-gradient(180deg,rgba(9,20,36,.96),rgba(4,10,19,.96));box-shadow:0 16px 34px rgba(0,0,0,.24),inset 0 0 0 1px rgba(255,255,255,.025)}
    .starwars-music-browser-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:11px}.starwars-music-browser-head>div{display:grid;gap:2px}.starwars-music-kicker{font-size:10px;letter-spacing:.17em;color:#ffe17d;font-weight:800}.starwars-music-browser-head strong{font-size:15px;color:#f8f5e8}.starwars-track-count{font-size:11px;color:#b9c7d8;white-space:nowrap}
    .starwars-music-browser-controls{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;align-items:end}.starwars-track-select-wrap{display:grid;gap:5px;min-width:0}.starwars-track-select-wrap>span{font-size:10px;letter-spacing:.12em;color:#b9c7d8;font-weight:800}.starwars-track-select{width:100%;min-width:0;height:44px;padding:0 34px 0 11px;border:1px solid #55708c;border-radius:8px;background:#07111f;color:#fff;font:inherit;font-size:12px}.starwars-track-select:focus-visible{outline:3px solid #ffe17d;outline-offset:2px;border-color:#ffe17d}
    .starwars-shuffle-btn{min-height:44px;min-width:112px}.starwars-shuffle-btn.on{border-color:#ffe17d!important;background:#293b53!important;color:#fff!important;box-shadow:0 0 0 1px rgba(255,225,125,.12) inset}.starwars-music-browser-note{margin:10px 0 0;color:#b7c6d8;font-size:12px;line-height:1.5}.starwars-music-browser-note strong{color:#f8f5e8}
    @media(max-width:640px){.starwars-music-browser{padding:11px}.starwars-music-browser-controls{grid-template-columns:1fr}.starwars-shuffle-btn{width:100%}.starwars-music-browser-head{align-items:flex-start}.starwars-track-select{font-size:16px}}
  `;

  function addStyles() {
    if (document.getElementById('starwars-music-browser-styles')) return;
    const style = document.createElement('style');
    style.id = 'starwars-music-browser-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function prefs() {
    try {
      const parsed = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
      return { shuffle: Boolean(parsed.shuffle), index: Math.max(0, Number(parsed.index) || 0) };
    } catch {
      return { shuffle: false, index: 45 };
    }
  }

  function save(patch) {
    const next = Object.assign(prefs(), patch || {});
    if (tracks.length) next.index = Math.max(0, Math.min(tracks.length - 1, Number(next.index) || 0));
    try { localStorage.setItem(PREF_KEY, JSON.stringify(next)); } catch {}
    return next;
  }

  function frame() { return document.querySelector('#starwars-youtube-player iframe'); }
  function cmd(func, args = []) {
    const iframe = frame();
    if (!iframe || !iframe.contentWindow) return false;
    try { iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args }), '*'); return true; } catch { return false; }
  }

  function loadCatalog() {
    if (catalogPromise) return catalogPromise;
    catalogPromise = fetch(CATALOG_URL, { cache: 'force-cache' }).then(response => {
      if (!response.ok) throw new Error(`Star Wars track catalog ${response.status}`);
      return response.json();
    }).then(data => {
      tracks = Array.isArray(data.tracks) ? data.tracks : [];
      ids = tracks.map(track => track.id);
      if (!tracks.length) throw new Error('Star Wars track catalog is empty');
      save({});
      return tracks;
    }).catch(error => { console.warn('Star Wars music catalog unavailable:', error); tracks = []; ids = []; return tracks; });
    return catalogPromise;
  }

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const norm = value => String(value || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  function currentIndex() {
    const text = norm(document.querySelector('[data-starwars-track]')?.textContent);
    if (!text || !tracks.length) return prefs().index;
    const index = tracks.findIndex(track => { const title = norm(track.title); return text.includes(title) || title.includes(text); });
    return index >= 0 ? index : prefs().index;
  }
  function options() {
    const films = [...new Set(tracks.map(track => track.film))];
    const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    return films.map(film => `<optgroup label="${esc(film)}">${tracks.map((track,index)=>({track,index})).filter(item=>item.track.film===film).map(item=>`<option value="${item.index}">${esc(item.track.title)}</option>`).join('')}</optgroup>`).join('');
  }
  function setUI() {
    if (!tracks.length) return;
    const state = prefs();
    document.querySelectorAll('[data-starwars-track-menu]').forEach(select => { const value=String(state.index); if(document.activeElement!==select&&select.value!==value) select.value=value; });
    document.querySelectorAll('[data-starwars-shuffle]').forEach(button => { const text=state.shuffle?'Shuffle on':'Shuffle off'; if(button.textContent!==text) button.textContent=text; button.classList.toggle('on',state.shuffle); button.setAttribute('aria-pressed',state.shuffle?'true':'false'); button.setAttribute('aria-label',state.shuffle?'Turn soundtrack shuffle off':'Turn soundtrack shuffle on'); });
  }
  async function enhance() {
    addStyles(); await loadCatalog(); if(!tracks.length) return;
    const panel=document.querySelector('.starwars-audio-settings'); if(!panel) return;
    const heading=panel.querySelector('h2'); if(heading) heading.textContent='Saga soundtrack';
    const intro=panel.querySelector('h2 + p'); if(intro) intro.textContent='Choose any track directly, use the transport controls, or turn on shuffle. The full Prequel Trilogy playlist is included alongside the Original Trilogy favorites.';
    if(!panel.querySelector('[data-starwars-music-browser]')){
      const controls=panel.querySelector('.starwars-audio-settings-controls'); if(!controls) return;
      const box=document.createElement('div'); box.className='starwars-music-browser'; box.dataset.starwarsMusicBrowser='true';
      box.innerHTML=`<div class="starwars-music-browser-head"><div><span class="starwars-music-kicker">TRACK LIBRARY</span><strong>Select any track</strong></div><span class="starwars-track-count">${tracks.length} tracks</span></div><div class="starwars-music-browser-controls"><label class="starwars-track-select-wrap"><span>TRACK</span><select class="starwars-track-select" data-starwars-track-menu aria-label="Choose Star Wars soundtrack track">${options()}</select></label><button class="starwars-audio-btn starwars-shuffle-btn" type="button" data-starwars-shuffle aria-pressed="false">Shuffle off</button></div><p class="starwars-music-browser-note"><strong>${tracks.length} tracks:</strong> select a film and cue any soundtrack piece without stepping through the library one track at a time.</p>`;
      const firstRow=controls.querySelector('.starwars-audio-settings-row'); if(firstRow) firstRow.insertAdjacentElement('afterend',box); else controls.prepend(box);
    }
    const nowPlaying=panel.querySelector('[data-starwars-track]'); if(nowPlaying){nowPlaying.setAttribute('aria-live','polite');nowPlaying.setAttribute('aria-atomic','true');}
    setUI();
  }
  async function waitFrame(start){let iframe=frame();if(iframe)return iframe;if(start)document.querySelector('[data-starwars-audio="toggle"]')?.click();for(let i=0;i<28;i+=1){await sleep(125);iframe=frame();if(iframe)return iframe;}return null;}
  async function loadPlaylist(index,autoplay=true){if(loading)return false;loading=true;try{await loadCatalog();if(!ids.length)return false;const iframe=await waitFrame(autoplay);if(!iframe)return false;const safe=Math.max(0,Math.min(tracks.length-1,Number(index)||0));save({index:safe});cmd(autoplay?'loadPlaylist':'cuePlaylist',[ids,safe,0]);await sleep(250);cmd('setShuffle',[prefs().shuffle]);playlistLoaded=true;setUI();return true;}finally{loading=false;}}
  async function afterTransport(){await loadCatalog();const iframe=await waitFrame(false);if(!iframe)return;if(!playlistLoaded){const index=currentIndex(),playing=(document.querySelector('[data-starwars-audio="toggle"]')?.textContent||'').trim().toLowerCase()==='pause';await loadPlaylist(index,playing);}else{cmd('setShuffle',[prefs().shuffle]);setTimeout(()=>{const index=currentIndex();if(index!==prefs().index)save({index});setUI();},700);}}
  document.addEventListener('change',event=>{const select=event.target.closest?.('[data-starwars-track-menu]');if(!select)return;const index=Number(select.value);if(Number.isFinite(index))loadPlaylist(index,true);});
  document.addEventListener('click',event=>{const shuffle=event.target.closest?.('[data-starwars-shuffle]');if(shuffle){event.preventDefault();const next=save({shuffle:!prefs().shuffle,index:currentIndex()});setUI();if(frame()){if(!playlistLoaded)loadPlaylist(next.index,false).then(()=>cmd('setShuffle',[next.shuffle]));else cmd('setShuffle',[next.shuffle]);}return;}const transport=event.target.closest?.('[data-starwars-audio]');if(transport&&!transport.matches('input'))setTimeout(afterTransport,450);});
  document.addEventListener('studio:render',enhance);
  window.addEventListener('hashchange',()=>requestAnimationFrame(enhance));
  window.addEventListener('pageshow',enhance);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true});else enhance();
})();
