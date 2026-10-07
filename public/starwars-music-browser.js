(() => {
  'use strict';

  const TRACKS = [
    ['dW9xbFLaatU','Star Wars Main Title and the Arrival at Naboo','The Phantom Menace'],
    ['WUC7MgkOgKA',"Anakin's Theme",'The Phantom Menace'],
    ['cqh1mKpvzCI',"Jar Jar's Introduction and the Swim to Otoh Gunga",'The Phantom Menace'],
    ['zvlHwdINoTs','The Trip to the Naboo Temple and the Audience with Boss Nass','The Phantom Menace'],
    ['D_2bluVPsb0','Duel of the Fates','The Phantom Menace'],
    ['inyJGAXkbEg','The Arrival at Tatooine and the Flag Parade','The Phantom Menace'],
    ['CmVY8YZI_hQ',"Qui-Gon's Noble End",'The Phantom Menace'],
    ['zNIZ_Ym-ECE','Anakin Defeats Sebulba','The Phantom Menace'],
    ['u_mmm2CrCds','The Sith Spacecraft and the Droid Battle','The Phantom Menace'],
    ['x-U5yUw2_AQ',"Panaka and the Queen's Protectors",'The Phantom Menace'],
    ['JP-Phg1hey0','The Droid Invasion and the Appearance of Darth Maul','The Phantom Menace'],
    ['Gfcr1NnoAkw','Queen Amidala and the Naboo Palace','The Phantom Menace'],
    ['W2AUHTZA89s','He Is the Chosen One','The Phantom Menace'],
    ['0OHj4XXytaI','Passage Through the Planet Core','The Phantom Menace'],
    ['9ZBihl6gk4c',"The High Council Meeting and Qui-Gon's Funeral",'The Phantom Menace'],
    ['BX0YGAyjd88',"Watto's Deal and Kids at Play",'The Phantom Menace'],
    ['DqLSBS8E7Do',"Augie's Great Municipal Band and End Credits",'The Phantom Menace'],
    ['de7Ny4oe4Sg','Star Wars Main Title and Ambush on Coruscant','Attack of the Clones'],
    ['7wMiMDBHnJ0','Across the Stars (Love Theme)','Attack of the Clones'],
    ['fD-TOXoIaWQ',"Jango's Escape",'Attack of the Clones'],
    ['4x5xORsCKYs','Return to Tatooine','Attack of the Clones'],
    ['F6sKutslvIg','Confrontation with Count Dooku and Finale','Attack of the Clones'],
    ['ljw9qKXKo-w','The Tusken Camp and the Homestead','Attack of the Clones'],
    ['QU2HpDUlUzY','Love Pledge and the Arena','Attack of the Clones'],
    ['auKKpluaMSg','Departing Coruscant','Attack of the Clones'],
    ['frEjVrDXmKI','Anakin and Padmé','Attack of the Clones'],
    ['1PQ-nAskDcM','Zam the Assassin and the Chase Through Coruscant','Attack of the Clones'],
    ['4K_zN6bNd3s','Yoda and the Younglings','Attack of the Clones'],
    ['8HiQD_3S8OM','The Meadow Picnic','Attack of the Clones'],
    ['r5Dk_0LRNNU',"Bounty Hunter's Pursuit",'Attack of the Clones'],
    ['3gqnXj5RngA',"Palpatine's Teachings",'Revenge of the Sith'],
    ['FVWr249AUq4',"Anakin's Dark Deeds",'Revenge of the Sith'],
    ['NMYUsYMDqgc','Star Wars and the Revenge of the Sith','Revenge of the Sith'],
    ['pykumg2nKtI','Enter Lord Vader','Revenge of the Sith'],
    ['Q4JsA4jF7yo',"Padmé's Ruminations",'Revenge of the Sith'],
    ['ApJumkyz7F0','General Grievous','Revenge of the Sith'],
    ['2MqBvcjxJ70',"Anakin's Dream",'Revenge of the Sith'],
    ['HUpipZMNGhA','The Immolation Scene','Revenge of the Sith'],
    ['Tl-dmo9_VCg','Anakin vs. Obi-Wan','Revenge of the Sith'],
    ['Ossn_cc6SyQ','Grievous and the Droids','Revenge of the Sith'],
    ['k_OTAM5Yu3M','Grievous Speaks to Lord Sidious','Revenge of the Sith'],
    ['ZK52tEenER8','A New Hope and End Credits','Revenge of the Sith'],
    ['xaqF9mRLu38','Battle of the Heroes','Revenge of the Sith'],
    ['Oppez7oQ30w',"The Birth of the Twins and Padmé's Destiny",'Revenge of the Sith'],
    ['m2p-im7cxa4',"Anakin's Betrayal",'Revenge of the Sith'],
    ['e9lapdvLSGw','Main Title','A New Hope'],
    ['eyHOUMWw5_M',"Princess Leia's Theme",'A New Hope'],
    ['EsvfptdFXf4','Cantina Band','A New Hope'],
    ['trYeKG17hYc','The Throne Room and End Title','A New Hope'],
    ['s3SZ5sIMY6o','The Imperial March','The Empire Strikes Back'],
    ['9C8J-jhMtRA',"Yoda's Theme",'The Empire Strikes Back'],
    ['XNDEljd1cQI','The Asteroid Field','The Empire Strikes Back'],
    ['oSXeOY_Ad4U','Luke and Leia','Return of the Jedi']
  ];
  const IDS = TRACKS.map(t => t[0]);
  const FILMS = ['The Phantom Menace','Attack of the Clones','Revenge of the Sith','A New Hope','The Empire Strikes Back','Return of the Jedi'];
  const PREF_KEY = 'namiya-starwars-music-browser-v3';
  let playlistLoaded = false;
  let loadingPlaylist = false;

  const css = `
    .starwars-music-browser{margin:12px 0 2px;padding:14px;border:1px solid rgba(255,225,125,.38);border-radius:12px;background:linear-gradient(180deg,rgba(9,20,36,.96),rgba(4,10,19,.96));box-shadow:0 16px 34px rgba(0,0,0,.24),inset 0 0 0 1px rgba(255,255,255,.025)}
    .starwars-music-browser-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:11px}.starwars-music-browser-head>div{display:grid;gap:2px}.starwars-music-kicker{font-size:10px;letter-spacing:.17em;color:#ffe17d;font-weight:800}.starwars-music-browser-head strong{font-size:15px;color:#f8f5e8}.starwars-track-count{font-size:11px;color:#b9c7d8;white-space:nowrap}
    .starwars-music-browser-controls{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;align-items:end}.starwars-track-select-wrap{display:grid;gap:5px;min-width:0}.starwars-track-select-wrap>span{font-size:10px;letter-spacing:.12em;color:#b9c7d8;font-weight:800}.starwars-track-select{width:100%;min-width:0;height:40px;padding:0 34px 0 11px;border:1px solid #55708c;border-radius:8px;background:#07111f;color:#fff;font:inherit;font-size:12px}.starwars-track-select:focus{outline:2px solid rgba(255,225,125,.55);outline-offset:1px;border-color:#ffe17d}
    .starwars-shuffle-btn{height:40px;min-width:105px}.starwars-shuffle-btn.on{border-color:#ffe17d!important;background:#293b53!important;color:#fff!important;box-shadow:0 0 0 1px rgba(255,225,125,.12) inset}.starwars-music-browser-note{margin:10px 0 0;color:#9fb0c4;font-size:11px;line-height:1.5}.starwars-music-browser-note strong{color:#f8f5e8}
    @media(max-width:640px){.starwars-music-browser{padding:11px}.starwars-music-browser-controls{grid-template-columns:1fr}.starwars-shuffle-btn{width:100%}.starwars-music-browser-head{align-items:flex-start}.starwars-track-select{font-size:16px}}
  `;

  function addStyles(){
    if(document.getElementById('starwars-music-browser-styles')) return;
    const style=document.createElement('style');style.id='starwars-music-browser-styles';style.textContent=css;document.head.appendChild(style);
  }
  function prefs(){try{return Object.assign({shuffle:false,index:45},JSON.parse(localStorage.getItem(PREF_KEY)||'{}'));}catch(_){return{shuffle:false,index:45};}}
  function save(patch){const next=Object.assign(prefs(),patch||{});next.index=Math.max(0,Math.min(TRACKS.length-1,Number(next.index)||0));try{localStorage.setItem(PREF_KEY,JSON.stringify(next));}catch(_){}return next;}
  function iframe(){return document.querySelector('#starwars-youtube-player iframe');}
  function command(func,args=[]){const f=iframe();if(!f||!f.contentWindow)return false;try{f.contentWindow.postMessage(JSON.stringify({event:'command',func,args}),'*');return true;}catch(_){return false;}}
  function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
  function normalize(s){return String(s||'').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
  function currentIndexFromText(){const text=normalize(document.querySelector('[data-starwars-track]')?.textContent);if(!text)return prefs().index;const i=TRACKS.findIndex(t=>{const n=normalize(t[1]);return text.includes(n)||n.includes(text);});return i>=0?i:prefs().index;}
  function setUI(){const p=prefs();document.querySelectorAll('[data-starwars-track-menu]').forEach(s=>{if(document.activeElement!==s)s.value=String(p.index);});document.querySelectorAll('[data-starwars-shuffle]').forEach(b=>{b.textContent=p.shuffle?'Shuffle on':'Shuffle off';b.classList.toggle('on',p.shuffle);b.setAttribute('aria-pressed',p.shuffle?'true':'false');});document.querySelectorAll('[data-starwars-track-count]').forEach(el=>el.textContent=TRACKS.length+' tracks');}
  function options(){return FILMS.map(f=>'<optgroup label="'+f.replace(/"/g,'&quot;')+'">'+TRACKS.map((t,i)=>({t,i})).filter(x=>x.t[2]===f).map(x=>'<option value="'+x.i+'">'+x.t[1].replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</option>').join('')+'</optgroup>').join('');}
  function enhance(){
    addStyles();
    const panel=document.querySelector('.starwars-audio-settings');if(!panel)return;
    const h=panel.querySelector('h2');if(h)h.textContent='Saga soundtrack';
    const intro=panel.querySelector('h2 + p');if(intro)intro.textContent='Choose any track directly, keep the familiar playback controls, or turn on shuffle. The complete Prequel Trilogy playlist is now included alongside the Original Trilogy favorites.';
    if(!panel.querySelector('[data-starwars-music-browser]')){
      const controls=panel.querySelector('.starwars-audio-settings-controls');if(!controls)return;
      const box=document.createElement('div');box.className='starwars-music-browser';box.dataset.starwarsMusicBrowser='true';box.innerHTML='<div class="starwars-music-browser-head"><div><span class="starwars-music-kicker">TRACK LIBRARY</span><strong>Select any track</strong></div><span class="starwars-track-count" data-starwars-track-count></span></div><div class="starwars-music-browser-controls"><label class="starwars-track-select-wrap"><span>TRACK</span><select class="starwars-track-select" data-starwars-track-menu aria-label="Choose Star Wars soundtrack track">'+options()+'</select></label><button class="starwars-audio-btn starwars-shuffle-btn" type="button" data-starwars-shuffle aria-pressed="false">Shuffle off</button></div><p class="starwars-music-browser-note"><strong>53 tracks total:</strong> all 45 tracks from the supplied Prequel Trilogy playlist plus the 8 Original Trilogy selections already in the theme.</p>';
      const first=controls.querySelector('.starwars-audio-settings-row');(first||controls).insertAdjacentElement(first?'afterend':'afterbegin',box);
    }
    setUI();
  }
  async function waitForIframe(startIfNeeded){
    let f=iframe();if(f)return f;
    if(startIfNeeded){const play=document.querySelector('[data-starwars-audio="toggle"]');if(play)play.click();}
    for(let i=0;i<32;i++){await sleep(125);f=iframe();if(f)return f;}
    return null;
  }
  async function loadFullPlaylist(index,autoplay){
    if(loadingPlaylist)return;
    loadingPlaylist=true;
    try{
      const f=await waitForIframe(autoplay);if(!f)return;
      const safe=Math.max(0,Math.min(TRACKS.length-1,Number(index)||0));save({index:safe});
      command(autoplay?'loadPlaylist':'cuePlaylist',[IDS,safe,0]);
      await sleep(250);command('setShuffle',[prefs().shuffle]);playlistLoaded=true;setUI();
    }finally{loadingPlaylist=false;}
  }
  async function ensureExpandedAfterOriginalControl(){
    const f=await waitForIframe(false);if(!f)return;
    if(!playlistLoaded){const idx=currentIndexFromText();const playing=(document.querySelector('[data-starwars-audio="toggle"]')?.textContent||'').trim().toLowerCase()==='pause';await loadFullPlaylist(idx,playing);}
    else command('setShuffle',[prefs().shuffle]);
  }

  document.addEventListener('change',e=>{const s=e.target.closest?.('[data-starwars-track-menu]');if(!s)return;const i=Number(s.value);if(Number.isFinite(i))loadFullPlaylist(i,true);});
  document.addEventListener('click',e=>{
    const sh=e.target.closest?.('[data-starwars-shuffle]');if(sh){e.preventDefault();const next=save({shuffle:!prefs().shuffle,index:currentIndexFromText()});setUI();if(iframe()){if(!playlistLoaded)loadFullPlaylist(next.index,false).then(()=>command('setShuffle',[next.shuffle]));else command('setShuffle',[next.shuffle]);}return;}
    const transport=e.target.closest?.('[data-starwars-audio]');if(transport&&!transport.matches('input'))setTimeout(ensureExpandedAfterOriginalControl,450);
  });

  const observer=new MutationObserver(()=>enhance());observer.observe(document.documentElement,{childList:true,subtree:true});
  enhance();
  setInterval(()=>{enhance();if(playlistLoaded){const i=currentIndexFromText();if(i!==prefs().index){save({index:i});setUI();}}},1200);
})();
