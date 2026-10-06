import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import AdmZip from 'adm-zip';

// Extract at build time. Browsers request one small manifest and only the clips
// they play, without a CDN dependency, ZIP workers, or range requests.
const source = path.resolve('public/resources/sw-sfx');
const output = path.resolve('public/resources/sw-audio');
const archives = JSON.parse(fs.readFileSync(path.join(source, 'archives.json'), 'utf8'));
// The user-organized pack is authoritative. Its recordings already exist in the
// source archives; content hashes preserve the new folder assignments without
// duplicating the large binaries. Do not infer movie provenance from filenames.
const catalog = JSON.parse(fs.readFileSync('scripts/starwars-audio-catalog.json', 'utf8'));
const pools = ['clicks', 'rightSingle', 'wrongSingle', 'rightTask', 'wrongTask', 'ambientQuotes', 'ambientEffects'];
if (catalog.version !== 2 || !catalog.entries.length || catalog.entries.some(e =>
  !pools.includes(e.pool) || typeof e.voice !== 'boolean' || !/^[a-f0-9]{24}\.wav$/.test(e.file)
)) throw new Error('Invalid curated Star Wars catalog.');
const wanted = new Set(catalog.entries.map(e => e.file));
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
const found = new Map();
for (const archive of archives.archives) {
  const zip = new AdmZip(path.join(source, typeof archive === 'string' ? archive : archive.file));
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory || !/\.wav$/i.test(entry.entryName)) continue;
    const data = entry.getData();
    if (data.toString('ascii', 0, 4) !== 'RIFF' || data.toString('ascii', 8, 12) !== 'WAVE') {
      throw new Error('Invalid WAV: ' + entry.entryName);
    }
    const file = createHash('sha256').update(data).digest('hex').slice(0, 24) + '.wav';
    if (!wanted.has(file) || found.has(file)) continue;
    fs.writeFileSync(path.join(output, file), data);
    found.set(file, data.length);
  }
}
const missing = [...wanted].filter(file => !found.has(file));
if (missing.length) throw new Error('Curated recordings missing from source archives: ' + missing.join(', '));
for (const pool of pools) if (!catalog.entries.some(e => e.pool === pool)) throw new Error('Empty sound pool: ' + pool);
const entries = catalog.entries.map(e => ({ ...e, bytes: found.get(e.file) }));
fs.writeFileSync(path.join(output, 'sounds.json'), JSON.stringify({ version: 2, entries }) + '\n');
console.log('Prepared ' + entries.length + ' curated clips (' + found.size + ' unique recordings).');
