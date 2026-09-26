import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RulesDirector } from '../extension/engine/rules.js';
import { assets, fixtures, recordedEmbedder } from './helpers.mjs';

const lib = await assets();
for (const fx of fixtures(['printing_press', 'bicycle', 'sky_blue', 'photosynthesis', 'tiny', 'water_cycle'])) {
  test(`${fx.name}: the rules director plans exactly what the Python director plans`, async () => {
    const board = structuredClone(fx.skeleton);
    await new RulesDirector(lib, recordedEmbedder(fx)).direct(board);
    for (let i = 0; i < board.beats.length; i++) {
      assert.deepEqual(board.beats[i].visuals, fx.directed.beats[i].visuals, `${fx.name} ${board.beats[i].id}`);
    }
  });
}
