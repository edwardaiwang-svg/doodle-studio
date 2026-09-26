import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { LLMDirector, LUNA } from '../extension/engine/llm.js';
import { RulesDirector } from '../extension/engine/rules.js';
import { validate } from '../extension/engine/validate.js';
import { assets, fixtures, recordedEmbedder } from './helpers.mjs';

const lib = await assets();
const [fx] = fixtures(['printing_press']);
const recorded = recordedEmbedder(fx);
// The rules draft uses Python's vectors; texts only the AI director embeds (whole beats) get a stable stand-in.
const embedder = async (texts) => Promise.all(texts.map(async (t) => (fx.embeddings[t] ? (await recorded([t]))[0]
  : Float32Array.from(createHash('sha256').update(t).digest().subarray(0, 32).toString('hex').repeat(12).slice(0, 384), (c) => parseInt(c, 16) / 15 - 0.5))));

function cloud(answers, model = LUNA) {
  const calls = { opened: 0, payloads: [] };
  return {
    calls,
    async openVideo() { calls.opened += 1; return { video_id: 'v1', model }; },
    async directSection(videoId, payload) {
      calls.payloads.push(payload);
      const answer = answers[payload.section_title];
      if (answer instanceof Error) throw answer;
      return typeof answer === 'function' ? answer(payload) : answer || { section_title: '', hook: '', takeaway: '', beats: [] };
    },
  };
}

const good = (payload) => {
  const b0 = payload.beats[0];
  return { section_title: 'Gutenberg builds a machine', hook: 'Metal letters, fast', takeaway: 'Printing got fast and cheap',
    beats: [{ beat_id: b0.beat_id, visuals: [
      { type: 'cluster', relation: 'none', items: [{ doodle: b0.candidates[0].id, label: 'Gutenberg', trigger: 'Johannes Gutenberg' }] },
      { type: 'stat', value: '1450', label: 'invented', doodle: '', trigger: 'Around 1450' }] }] };
};
const bad = (payload) => ({ section_title: 'x'.repeat(80), hook: '', takeaway: 'It sold 999 million copies',
  beats: [{ beat_id: payload.beats[0].beat_id, visuals: [
    { type: 'cluster', relation: 'none', items: [{ doodle: 'unicorn_rainbow', label: '', trigger: 'x' }] },
    { type: 'stat', value: '42 million', label: 'invented', doodle: '', trigger: 'nothing' }] }] });

const known = (id) => Boolean(lib.catalog.entries[id]) || id.startsWith('narrator_');

test('good answers are used, mapped to spoken words, and the narrator says the AI takeaway', async () => {
  const board = structuredClone(fx.skeleton);
  const c = cloud({ 'One machine, one idea': good });
  const report = await new LLMDirector(c, new RulesDirector(lib, embedder)).direct(board);
  assert.equal(report.model, LUNA);
  const first = board.beats.find((b) => b.chapter === 's1' && b.kind === 'narration');
  assert.deepEqual(first.visuals.map((v) => v.type), ['stat', 'cluster']);          // in spoken order: the date first
  assert.equal(first.visuals[0].trigger.en, 'Around fourteen fifty');
  const take = board.beats.find((b) => b.chapter === 's1' && b.kind === 'take');
  assert.equal(take.display.en, 'Key takeaway: Printing got fast and cheap.');
  assert.equal(board.chapters.find((ch) => ch.id === 's1').title.en, 'Gutenberg builds a machine');
  assert.ok(validate(board, { known }).ok);
});

test('bad answers fall back to the rules draft', async () => {
  const board = structuredClone(fx.skeleton);
  const report = await new LLMDirector(cloud({ 'One machine, one idea': bad, 'Books everywhere': new Error('rate limited') }),
    new RulesDirector(lib, embedder)).direct(board);
  const first = board.beats.find((b) => b.chapter === 's1' && b.kind === 'narration');
  assert.deepEqual(first.visuals, fx.directed.beats.find((b) => b.id === first.id).visuals);
  assert.ok(!board.beats.find((b) => b.chapter === 's1' && b.kind === 'take').take.headline.en.includes('999'));
  const notes = report.notes.join(' ');
  assert.ok(notes.includes('was not offered') && notes.includes('not in the text') && notes.includes('rate limited'), notes);
});

test('only GPT-6 Luna: any other model is refused before a single section is sent', async () => {
  const c = cloud({}, 'claude-opus-5-5');
  await assert.rejects(new LLMDirector(c, new RulesDirector(lib, embedder)).direct(structuredClone(fx.skeleton)), /only uses gpt-6-luna/);
  assert.equal(c.calls.payloads.length, 0);
});

test('banned pictures are never offered to the model', async () => {
  const c = cloud({});
  await new LLMDirector(c, new RulesDirector(lib, embedder)).direct(structuredClone(fx.skeleton));
  const offered = new Set(c.calls.payloads.flatMap((p) => p.beats.flatMap((b) => b.candidates.map((x) => x.id))));
  assert.ok(offered.size > 20);
  for (const id of lib.banned.doodles) assert.ok(!offered.has(id), id);
});

// The outro beat of printing_press: "The printing press turned knowledge ... Every time you read a book, a newspaper or a
// website, you are using an idea ...". Its rules draft: printing_press | the list, lightbulb_idea, the 570 stat.
const outro = (visuals) => (payload) => {
  const beat = payload.beats.find((b) => b.text.includes('newspaper'));
  return { section_title: '', hook: '', takeaway: '', beats: beat ? [{ beat_id: beat.beat_id, visuals }] : [] };
};
const lone = (doodle, trigger) => ({ type: 'cluster', relation: 'none', items: [{ doodle, label: '', trigger }] });
const outroBeat = (board) => board.beats.find((b) => b.kind === 'narration' && b.display.en.includes('newspaper'));

test('the model never leaves a sentence with less than the rules drew: a list keeps every item', async () => {
  const board = structuredClone(fx.skeleton);
  const c = cloud({ '': outro([lone('book_stack', 'knowledge'), lone('newspaper', 'a newspaper')]) });
  await new LLMDirector(c, new RulesDirector(lib, embedder)).direct(board);
  const draft = outroBeat(fx.directed).visuals;
  const doodles = outroBeat(board).visuals.map((v) => (v.items || []).map((i) => i.doodle));
  assert.deepEqual(doodles[0], ['book_stack']);            // 1st sentence: the model's pick replaces printing_press (a tie)
  assert.ok(doodles.some((d) => d.join() === 'book_stack,newspaper,web_page'));   // 2nd: the whole list, not a lone newspaper
  assert.ok(!doodles.some((d) => d.join() === 'newspaper' || d.join() === 'printing_press'));
  assert.deepEqual(outroBeat(board).visuals.slice(1).map((v) => v.type), draft.slice(1).map((v) => v.type));
  assert.ok(validate(board, { known }).ok);
});

test('a rules picture the model drew elsewhere in the beat is not drawn twice', async () => {
  const board = structuredClone(fx.skeleton);
  const c = cloud({ '': outro([lone('lightbulb_idea', 'knowledge')]) });
  await new LLMDirector(c, new RulesDirector(lib, embedder)).direct(board);
  const offered = c.calls.payloads.flatMap((p) => p.beats).find((b) => b.text.includes('newspaper'));
  assert.ok(offered.candidates.some((x) => x.id === 'lightbulb_idea'));
  const doodles = outroBeat(board).visuals.flatMap((v) => (v.items || []).map((i) => i.doodle));
  assert.equal(doodles.filter((d) => d === 'lightbulb_idea').length, 1);
  assert.deepEqual(doodles.slice(0, 4), ['lightbulb_idea', 'book_stack', 'newspaper', 'web_page']);
});
