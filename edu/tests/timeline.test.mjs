import assert from 'node:assert/strict';
import { test } from 'node:test';
import { layout, syntheticClips } from '../extension/engine/timeline.js';
import { fixtures } from './helpers.mjs';

for (const fx of fixtures(['printing_press', 'bicycle', 'water_cycle'])) {
  test(`${fx.name}: the timeline matches Python's (captions aside)`, () => {
    const got = layout(fx.directed, syntheticClips(fx.directed));
    const want = structuredClone(fx.timeline);
    for (const t of [got, want]) {
      delete t.captions;
      for (const b of Object.values(t.beats)) delete b.char_times;
    }
    assert.deepEqual(got, want);
  });
  test(`${fx.name}: synthetic clips match Python's`, () => {
    const clips = syntheticClips(fx.directed);
    for (const [id, info] of Object.entries(fx.timeline.beats)) {
      assert.deepEqual(clips[id].charTimes, info.char_times, id);
    }
  });
}
