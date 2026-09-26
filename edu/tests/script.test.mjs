import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileTitle, readText } from '../extension/engine/ingest.js';
import { build } from '../extension/engine/script.js';

const dir = new URL('./parity/', import.meta.url);
const fixtures = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'numbers.json')
  .map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')));

for (const fx of fixtures) {
  test(`${fx.name}: the document is read as Python reads it`, () => {
    assert.deepEqual(readText(fx.text, { fallback: fileTitle(fx.name) }), fx.document);
  });
  test(`${fx.name}: the storyboard skeleton matches Python's`, () => {
    assert.deepEqual(build(readText(fx.text, { fallback: fileTitle(fx.name) })), fx.skeleton);
  });
}

test('a .docx is read as Python reads it', async () => {
  const { readDocx } = await import('../extension/engine/ingest.js');
  const bytes = readFileSync(new URL('bee_dance.docx', dir));
  const expected = JSON.parse(readFileSync(new URL('bee_dance.docx.expected', dir), 'utf8'));
  assert.deepEqual(await readDocx(bytes, { fallback: fileTitle('bee_dance.docx') }), expected);
});

test('a takeaway never leans on the sentence before it', async () => {
  const { headline } = await import('../extension/engine/script.js');
  assert.equal(headline(['The sun heats the water in the ocean. We call this evaporation.'], 'Evaporation'),
    'The sun heats the water in the ocean.');
  assert.equal(headline(['When the drops in a cloud get too big and heavy, they fall to the ground. We call this precipitation.'],
    'Precipitation'), 'When the drops in a cloud get too big and heavy, they fall to the ground.');
  assert.equal(headline(['Rain falls. Tiny drops of water float high above us in very cold clouds, then join into much bigger and heavier drops.'],
    'Precipitation'), 'Precipitation.');
});
