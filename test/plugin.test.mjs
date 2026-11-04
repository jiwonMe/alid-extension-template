import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import plugin from '../dist/plugin.js';

const manifest = JSON.parse(await readFile(new URL('../alid.extension.json', import.meta.url), 'utf8'));
const aspect = plugin.aspects[0];
const geometry = { x: 24, y: 32, width: 240, height: 160, rotation: 0.5, zOrder: 10 };

test('the committed install manifest identifies and hashes the built module', async () => {
  assert.equal(manifest.apiVersion, 1);
  assert.equal(manifest.id, plugin.id);
  assert.deepEqual(manifest.aspectIds, plugin.aspects.map(item => item.id));
  assert.equal(manifest.entry, 'dist/plugin.js');
  const bytes = await readFile(new URL('../dist/plugin.js', import.meta.url));
  assert.equal(manifest.sha256, createHash('sha256').update(bytes).digest('hex'));
});

test('activation registers a command, creation is explicit, disposal unregisters it', () => {
  let command, created, removed = 0;
  const dispose = plugin.activate({
    services: { get: name => name === 'canvas.creation' ? { create: request => { created = request; return 'new-note'; } } : undefined },
    commands: { register: value => { command = value; return () => { removed++; }; } },
  });
  assert.equal(created, undefined);
  assert.equal(command.id, manifest.capabilities.commands[0]);
  assert.equal(command.run(), 'new-note');
  assert.deepEqual(created, { caller: command.id, aspects: { [aspect.id]: aspect.defaults }, width: 240, height: 160 });
  assert.equal(Object.hasOwn(created.aspects, 'core.transform'), false);
  dispose();
  assert.equal(removed, 1);
});

test('the toolbar points to the same creation command without requiring selection', () => {
  const action = plugin.ui.controls[0];
  assert.equal(action.placement, 'tool-shelf');
  assert.equal(action.requiresSelection, false);
  assert.equal(action.commandSymbol, manifest.capabilities.commands[0]);
});

test('derive reads canonical intent and never writes or changes it', () => {
  const transform = Object.freeze({ x: 24, y: 32, rotation: 0.5 }), bounds = Object.freeze({ width: 240, height: 160 });
  const reads = [];
  const derived = aspect.derive(aspect.defaults, 'note-1', { getCanonical(id, name) { reads.push([id, name]); return name === 'core.transform' ? transform : bounds; } });
  assert.deepEqual(derived, geometry);
  assert.deepEqual(reads, [['note-1', 'core.transform'], ['note-1', 'core.bounds']]);
});

test('derive remains finite when imported bounds are missing or invalid', () => {
  const derived = aspect.derive(aspect.defaults, 'note-1', { getCanonical: () => ({ x: Infinity, y: NaN, rotation: Infinity, width: -10, height: NaN }) });
  assert.deepEqual(derived, { x: 0, y: 0, width: 240, height: 160, rotation: 0, zOrder: 10 });
});

test('DOM and SVG render escaped text, validate colors and never need a mounted editor', () => {
  const props = { title: '"><script>alert(1)</script>', body: '<img src=x onerror=alert(1)>', color: 'url(https://example.invalid/pixel)' };
  const rendered = aspect.renderSvg(props, geometry, 'offscreen-note');
  assert.equal(rendered.layer, 'underlay');
  assert.match(rendered.svg, /translate\(24,32\) rotate\(/);
  assert.ok(rendered.svg.includes('&lt;script&gt;'));
  assert.ok(!rendered.svg.includes('<script>'));
  assert.ok(!rendered.svg.includes('https://'));
  const content = { innerHTML: '' };
  aspect.renderDom(content, props, geometry, 'note-1');
  assert.ok(content.innerHTML.includes('&lt;img'));
  assert.ok(content.innerHTML.includes('viewBox="0 0 240 160"'));
});

test('all inspector fields belong to declared canonical defaults', () => {
  for (const control of aspect.ui.controls) assert.ok(Object.hasOwn(aspect.defaults, control.field));
  assert.deepEqual(aspect.textFields, ['title', 'body']);
});
