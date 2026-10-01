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

const iconsSource = path.join(root, 'icons');
const iconsDestination = path.join(dist, 'icons');
if (!fs.existsSync(iconsSource)) {
  throw new Error('Required icons directory is missing.');
}
fs.rmSync(iconsDestination, { recursive: true, force: true });
fs.cpSync(iconsSource, iconsDestination, { recursive: true });

console.log('Copied service worker, manifest, and icons into dist.');
