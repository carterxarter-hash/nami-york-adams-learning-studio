import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';

const sourcePath = path.resolve('public/resources/sw-ultimate-sfx-collection.zip');
const duplicatePath = path.resolve('public/resources/sw-ultimate-sfx-collection.zip.zip');
const outputDir = path.resolve('public/resources/sw-sfx');
const targetCompressedBytes = 5 * 1024 * 1024;

if (!fs.existsSync(sourcePath)) {
  const existingManifest = path.join(outputDir, 'archives.json');
  if (fs.existsSync(existingManifest)) {
    console.log('Using the existing pre-split Star Wars SFX archives.');
    process.exit(0);
  }
  throw new Error('Star Wars SFX source archive and pre-split manifest are both missing.');
}

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

const sourceZip = new AdmZip(sourcePath);
const entries = sourceZip.getEntries().filter((entry) => !entry.isDirectory);
const groups = [];
let current = [];
let currentCompressedBytes = 0;

for (const entry of entries) {
  const compressedBytes = Number(entry.header?.compressedSize || entry.header?.size || entry.getData().length);
  if (current.length && currentCompressedBytes + compressedBytes > targetCompressedBytes) {
    groups.push(current);
    current = [];
    currentCompressedBytes = 0;
  }
  current.push(entry);
  currentCompressedBytes += compressedBytes;
}
if (current.length) groups.push(current);

const manifest = {
  version: 1,
  sourceEntries: entries.length,
  archives: [],
};

groups.forEach((group, index) => {
  const name = 'part-' + String(index + 1).padStart(2, '0') + '.zip';
  const partZip = new AdmZip();
  for (const entry of group) {
    partZip.addFile(entry.entryName, entry.getData());
  }
  const buffer = partZip.toBuffer();
  fs.writeFileSync(path.join(outputDir, name), buffer);
  manifest.archives.push({
    file: name,
    bytes: buffer.length,
    entries: group.length,
  });
});

fs.writeFileSync(
  path.join(outputDir, 'archives.json'),
  JSON.stringify(manifest, null, 2) + '\n',
);

fs.rmSync(sourcePath, { force: true });
fs.rmSync(duplicatePath, { force: true });

const largest = Math.max(...manifest.archives.map((archive) => archive.bytes));
console.log(
  'Star Wars SFX split into ' +
    manifest.archives.length +
    ' archives; largest is ' +
    (largest / 1024 / 1024).toFixed(2) +
    ' MB.',
);
