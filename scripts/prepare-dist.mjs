import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');

if (!fs.existsSync(dist)) {
  throw new Error('Vite dist directory does not exist.');
}

const copyFile = (source, destination) => {
  const from = path.join(root, source);
  const to = path.join(root, destination);
  if (!fs.existsSync(from)) {
    throw new Error('Required PWA file is missing: ' + source);
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
};

copyFile('sw.js', 'dist/sw.js');
copyFile('manifest.webmanifest', 'dist/manifest.webmanifest');
copyFile('public/starwars-music-browser.js', 'dist/starwars-music-browser.js');

const distIndex = path.join(dist, 'index.html');
if (!fs.existsSync(distIndex)) {
  throw new Error('Vite dist/index.html does not exist.');
}
let html = fs.readFileSync(distIndex, 'utf8');
const musicBrowserTag = '<script src="./starwars-music-browser.js?v=2" defer></script>';
if (!html.includes('starwars-music-browser.js')) {
  if (!html.includes('</body>')) throw new Error('Could not find </body> in dist/index.html.');
  html = html.replace('</body>', musicBrowserTag + '\n</body>');
  fs.writeFileSync(distIndex, html);
}

// The source ZIPs stay in Git for rebuilds; production serves extracted clips.
fs.rmSync(path.join(dist, 'resources/sw-sfx'), { recursive: true, force: true });
fs.rmSync(path.join(dist, 'resources/starwars-embedded-sfx.js'), { force: true });

const iconsSource = path.join(root, 'icons');
const iconsDestination = path.join(dist, 'icons');
if (!fs.existsSync(iconsSource)) {
  throw new Error('Required icons directory is missing.');
}
fs.rmSync(iconsDestination, { recursive: true, force: true });
fs.cpSync(iconsSource, iconsDestination, { recursive: true });

console.log('Copied PWA files and injected Star Wars music browser into dist/index.html.');
