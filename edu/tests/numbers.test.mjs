import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { normalize } from '../extension/engine/numbers.js';

const cases = JSON.parse(readFileSync(new URL('./parity/numbers.json', import.meta.url), 'utf8'));

test('numbers are spoken exactly as the Python app speaks them', () => {
  for (const { display, spoken, spans } of cases) {
    const n = normalize(display);
    assert.equal(n.spoken, spoken, display);
    assert.deepEqual(n.spans, spans, display);
  }
});
