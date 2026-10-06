import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import AdmZip from 'adm-zip';

// Extract at build time. Browsers request one small manifest and only the clips
// they play, without a CDN dependency, ZIP workers, or range requests.
const source = path.resolve('public/resources/sw-sfx');
const output = path.resolve('public/resources/sw-audio');
const archives = JSON.parse(fs.readFileSync(path.join(source, 'archives.json'), 'utf8'));
fs.mkdirSync(output, { recursive: true });
const entries = [];
const names = new Set();
for (const archive of archives.archives) {
  const zip = new AdmZip(path.join(source, typeof archive === 'string' ? archive : archive.file));
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory || !/\.wav$/i.test(entry.entryName) || names.has(entry.entryName)) continue;
    const data = entry.getData();
    if (data.toString('ascii', 0, 4) !== 'RIFF' || data.toString('ascii', 8, 12) !== 'WAVE') {
      throw new Error('Invalid WAV: ' + entry.entryName);
    }
    const file = createHash('sha256').update(data).digest('hex').slice(0, 24) + '.wav';
    fs.writeFileSync(path.join(output, file), data);
    names.add(entry.entryName);
    entries.push({ filename: entry.entryName, file, bytes: data.length });
  }
}
if (!entries.length) throw new Error('Star Wars audio manifest is empty.');
fs.writeFileSync(path.join(output, 'sounds.json'), JSON.stringify({ version: 1, entries }) + '\n');
console.log('Prepared ' + entries.length + ' individually playable Star Wars clips.');
