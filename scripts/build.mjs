import { createHash } from 'node:crypto';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { build } from 'vite';

const metadata = JSON.parse(await readFile(new URL('../extension.json', import.meta.url), 'utf8'));
if (!/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/.test(metadata.id)) throw new Error('extension.json id must be a unique dotted namespace, e.g. yourname.sticky-notes.');
for (const key of ['title', 'version', 'summary']) if (typeof metadata[key] !== 'string' || !metadata[key].trim()) throw new Error(`extension.json requires ${key}.`);

await build();
const files = await readdir(new URL('../dist/', import.meta.url));
if (files.length !== 1 || files[0] !== 'plugin.js') throw new Error('The installer expects one self-contained dist/plugin.js bundle.');
const bundle = await readFile(new URL('../dist/plugin.js', import.meta.url));
const manifest = {
  apiVersion: 1,
  id: metadata.id,
  title: metadata.title,
  version: metadata.version,
  summary: metadata.summary,
  entry: 'dist/plugin.js',
  sha256: createHash('sha256').update(bundle).digest('hex'),
  aspectIds: [`${metadata.id}.note`],
  capabilities: {
    readAspects: [`${metadata.id}.note`, 'core.transform', 'core.bounds'],
    writeAspects: [`${metadata.id}.note`, 'core.transform', 'core.bounds'],
    services: ['canvas.creation'],
    commands: [`${metadata.id}:add-note`],
  },
};
await writeFile(new URL('../alid.extension.json', import.meta.url), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Prepared ${manifest.id} ${manifest.version}: ${manifest.sha256}`);
