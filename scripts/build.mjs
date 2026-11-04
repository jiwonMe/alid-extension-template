import { createHash } from 'node:crypto';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { build } from 'vite';
import { createPackageManifest } from '../src/manifest.js';
import { validateConfig } from './validate-config.mjs';

const metadata = validateConfig(JSON.parse(await readFile(new URL('../extension.json', import.meta.url), 'utf8')));
const contract = createPackageManifest(metadata);

await build();
const files = await readdir(new URL('../dist/', import.meta.url));
if (files.length !== 1 || files[0] !== 'plugin.js') throw new Error('The installer expects one self-contained dist/plugin.js bundle.');
const bundle = await readFile(new URL('../dist/plugin.js', import.meta.url));
const manifest = {
  apiVersion: 2,
  ...contract,
  title: metadata.title,
  summary: metadata.summary,
  entry: 'dist/plugin.js',
  sha256: createHash('sha256').update(bundle).digest('hex'),
  aspectIds: contract.provides.aspects,
  capabilities: {
    readAspects: [`${metadata.id}.note`, 'core.transform', 'core.bounds'],
    writeAspects: [`${metadata.id}.note`, 'core.transform', 'core.bounds'],
    services: ['canvas.creation'],
    commands: [`${metadata.id}:add-note`],
  },
};
await writeFile(new URL('../alid.extension.json', import.meta.url), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Prepared ${manifest.id} ${manifest.version}: ${manifest.sha256}`);
