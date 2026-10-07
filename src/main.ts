import './styles.css';

const STAR_WARS_TRACKS = [
  { id: 'D_2bluVPsb0', title: 'Duel of the Fates', film: 'The Phantom Menace', era: 'Prequel Trilogy' },
  { id: 'e9lapdvLSGw', title: 'Main Title', film: 'A New Hope', era: 'Original Trilogy' },
  { id: 'eyHOUMWw5_M', title: "Princess Leia's Theme", film: 'A New Hope', era: 'Original Trilogy' },
  { id: 'EsvfptdFXf4', title: 'Cantina Band', film: 'A New Hope', era: 'Original Trilogy' },
  { id: 'trYeKG17hYc', title: 'The Throne Room and End Title', film: 'A New Hope', era: 'Original Trilogy' },
  { id: 's3SZ5sIMY6o', title: 'The Imperial March', film: 'The Empire Strikes Back', era: 'Original Trilogy' },
  { id: '9C8J-jhMtRA', title: "Yoda's Theme", film: 'The Empire Strikes Back', era: 'Original Trilogy' },
  { id: 'XNDEljd1cQI', title: 'The Asteroid Field', film: 'The Empire Strikes Back', era: 'Original Trilogy' },
  { id: 'oSXeOY_Ad4U', title: 'Luke and Leia', film: 'Return of the Jedi', era: 'Original Trilogy' }
] as const;

const STAR_WARS_TRACK_IDS = STAR_WARS_TRACKS.map(track => track.id);
const STAR_WARS_MENU_PREFS_KEY = 'namiya-starwars-music-menu-v1';

type StarWarsMenuPrefs = { shuffle: boolean; index: number };

function readMusicPrefs(): StarWarsMenuPrefs {
  try {
    const parsed = JSON.parse(localStorage.getItem(STAR_WARS_MENU_PREFS_KEY) || '{}');
    return {
      shuffle: Boolean(parsed.shuffle),
      index: Math.max(0, Math.min(STAR_WARS_TRACKS.length - 1, Number(parsed.index) || 0))
    };
  } catch {
    return { shuffle: false, index: 0 };
  }
}

function saveMusicPrefs(patch: Partial<StarWarsMenuPrefs>): StarWarsMenuPrefs {
  const next = { ...readMusicPrefs(), ...patch };
  try { localStorage.setItem(STAR_WARS_MENU_PREFS_KEY, JSON.stringify(next)); } catch {}
  return next;
}

function normalizeTrackText(value: string): string {
  return value.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function inferTrackIndex(): number {
  const nowPlaying = document.querySelector<HTMLElement>('[data-starwars-track]')?.textContent || '';
  const normalized = normalizeTrackText(nowPlaying);
  if (normalized) {
    const match = STAR_WARS_TRACKS.findIndex(track => {
      const title = normalizeTrackText(track.title);
      return normalized.includes(title) || title.includes(normalized);
    });
    if (match >= 0) return match;
  }
  return readMusicPrefs().index;
}

function getStarWarsIframe(): HTMLIFrameElement | null {
  return document.querySelector<HTMLIFrameElement>('#starwars-youtube-player iframe');
}

function youtubeCommand(func: string, args: unknown[] = []): boolean {
  const iframe = getStarWarsIframe();
  if (!iframe?.contentWindow) return false;
  iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args }), 'https://www.youtube.com');
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

async function ensureStarWarsPlayer(): Promise<HTMLIFrameElement | null> {
  let iframe = getStarWarsIframe();
  if (iframe) return iframe;
  const playButton = document.querySelector<HTMLButtonElement>('[data-starwars-audio="toggle"]');
  playButton?.click();
  for (let i = 0; i < 24; i++) {
    await sleep(125);
    iframe = getStarWarsIframe();
    if (iframe) return iframe;
  }
  return null;
}

async function loadExpandedPlaylist(index: number, autoplay = true): Promise<boolean> {
  const iframe = await ensureStarWarsPlayer();
  if (!iframe) return false;
  const safeIndex = Math.max(0, Math.min(STAR_WARS_TRACKS.length - 1, index));
  saveMusicPrefs({ index: safeIndex });
  const command = autoplay ? 'loadPlaylist' : 'cuePlaylist';
  youtubeCommand(command, [STAR_WARS_TRACK_IDS, safeIndex, 0]);
  await sleep(180);
  youtubeCommand('setShuffle', [readMusicPrefs().shuffle]);
  syncStarWarsMusicMenu();
  return true;
}

function groupedTrackOptions(): string {
  const groups = ['Prequel Trilogy', 'Original Trilogy'];
  return groups.map(era => {
    const options = STAR_WARS_TRACKS.map((track, index) => ({ track, index }))
      .filter(item => item.track.era === era)
      .map(item => `<option value="${item.index}">${item.track.title} · ${item.track.film}</option>`)
      .join('');
    return `<optgroup label="${era}">${options}</optgroup>`;
  }).join('');
}

function syncStarWarsMusicMenu(): void {
  const prefs = readMusicPrefs();
  document.querySelectorAll<HTMLSelectElement>('[data-starwars-track-menu]').forEach(select => {
    if (document.activeElement !== select) select.value = String(prefs.index);
  });
  document.querySelectorAll<HTMLButtonElement>('[data-starwars-shuffle]').forEach(button => {
    button.classList.toggle('on', prefs.shuffle);
    button.setAttribute('aria-pressed', prefs.shuffle ? 'true' : 'false');
    button.textContent = prefs.shuffle ? 'Shuffle on' : 'Shuffle off';
  });
  document.querySelectorAll<HTMLElement>('[data-starwars-track-count]').forEach(el => {
    el.textContent = `${prefs.index + 1} / ${STAR_WARS_TRACKS.length}`;
  });
}

function enhanceStarWarsMusicPanel(): void {
  const panel = document.querySelector<HTMLElement>('.starwars-audio-settings');
  if (!panel) return;

  const heading = panel.querySelector<HTMLHeadingElement>('h2');
  if (heading && /Original Trilogy audio/i.test(heading.textContent || '')) heading.textContent = 'Saga soundtrack';

  const intro = panel.querySelector<HTMLParagraphElement>('h2 + p');
  if (intro && !intro.dataset.expandedMusicCopy) {
    intro.dataset.expandedMusicCopy = 'true';
    intro.textContent = 'Choose a track directly, use the transport controls, or turn on shuffle. Music keeps playing while you move around the Studio and pauses when you leave the Star Wars theme.';
  }

  if (!panel.querySelector('[data-starwars-music-browser]')) {
    const controls = panel.querySelector<HTMLElement>('.starwars-audio-settings-controls');
    if (controls) {
      const browser = document.createElement('div');
      browser.className = 'starwars-music-browser';
      browser.dataset.starwarsMusicBrowser = 'true';
      browser.innerHTML = `
        <div class="starwars-music-browser-head">
          <div>
            <span class="starwars-music-kicker">TRACK LIBRARY</span>
            <strong>Select any track</strong>
          </div>
          <span class="starwars-track-count" data-starwars-track-count></span>
        </div>
        <div class="starwars-music-browser-controls">
          <label class="starwars-track-select-wrap">
            <span>TRACK</span>
            <select class="starwars-track-select" data-starwars-track-menu aria-label="Choose Star Wars soundtrack track">
              ${groupedTrackOptions()}
            </select>
          </label>
          <button class="starwars-audio-btn starwars-shuffle-btn" type="button" data-starwars-shuffle aria-pressed="false">Shuffle off</button>
        </div>
        <p class="starwars-music-browser-note">Prequel music now includes <strong>Duel of the Fates</strong>. The menu lists every soundtrack track currently available in the theme.</p>`;
      const firstRow = controls.querySelector('.starwars-audio-settings-row');
      firstRow?.insertAdjacentElement('afterend', browser);
    }
  }

  const currentText = document.querySelector<HTMLElement>('[data-starwars-track]')?.textContent || '';
  if (currentText) {
    const currentIndex = inferTrackIndex();
    const prefs = readMusicPrefs();
    if (currentIndex !== prefs.index) saveMusicPrefs({ index: currentIndex });
  }
  syncStarWarsMusicMenu();
}

async function selectTrack(index: number): Promise<void> {
  await loadExpandedPlaylist(index, true);
}

async function toggleShuffle(): Promise<void> {
  const prefs = readMusicPrefs();
  const next = saveMusicPrefs({ shuffle: !prefs.shuffle, index: inferTrackIndex() });
  syncStarWarsMusicMenu();
  const iframe = await ensureStarWarsPlayer();
  if (!iframe) return;
  // Loading the expanded list guarantees the new prequel track participates in shuffle.
  youtubeCommand('loadPlaylist', [STAR_WARS_TRACK_IDS, next.index, 0]);
  await sleep(180);
  youtubeCommand('setShuffle', [next.shuffle]);
}

document.addEventListener('change', event => {
  const target = event.target as HTMLElement | null;
  if (!(target instanceof HTMLSelectElement) || !target.matches('[data-starwars-track-menu]')) return;
  const index = Number(target.value);
  if (Number.isFinite(index)) void selectTrack(index);
});

document.addEventListener('click', event => {
  const target = event.target as HTMLElement | null;
  const shuffleButton = target?.closest<HTMLButtonElement>('[data-starwars-shuffle]');
  if (shuffleButton) {
    event.preventDefault();
    void toggleShuffle();
    return;
  }

  const transport = target?.closest<HTMLElement>('[data-starwars-audio]');
  if (!transport || transport.matches('input')) return;
  // Once the richer browser has loaded the combined playlist, the app's existing
  // previous / play / next controls continue to work on all tracks.
  window.setTimeout(() => {
    const iframe = getStarWarsIframe();
    if (!iframe) return;
    const prefs = readMusicPrefs();
    youtubeCommand('setShuffle', [prefs.shuffle]);
    window.setTimeout(() => {
      const index = inferTrackIndex();
      if (index !== prefs.index) saveMusicPrefs({ index });
      syncStarWarsMusicMenu();
    }, 350);
  }, 250);
});

const musicPanelObserver = new MutationObserver(() => enhanceStarWarsMusicPanel());
musicPanelObserver.observe(document.documentElement, { childList: true, subtree: true });
window.setInterval(() => {
  enhanceStarWarsMusicPanel();
  const panel = document.querySelector('.starwars-audio-settings');
  if (!panel) return;
  const index = inferTrackIndex();
  const prefs = readMusicPrefs();
  if (index !== prefs.index) {
    saveMusicPrefs({ index });
    syncStarWarsMusicMenu();
  }
}, 1200);

enhanceStarWarsMusicPanel();
