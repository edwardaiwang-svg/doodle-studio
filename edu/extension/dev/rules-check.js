// Test-only: the render rules of tests/test_render_rules.py, checked on the JavaScript engine (paced synthetic timing).
import { loadAssets } from '../engine/assets.js';
import { COL, STALE } from '../engine/board.js';
import { Hand, SvgLibrary, loadFonts, loadPaper } from '../engine/ink.js';
import { FPS, NOTE_READ, Production, SIZE, measureCaption, pacing } from '../engine/render.js';
import { takeText } from '../engine/script.js';
import { layout, syntheticClips } from '../engine/timeline.js';

const read = async (path) => (await fetch(chrome.runtime.getURL(path))).arrayBuffer();

async function check(name, env) {
  const board = (await (await fetch(`/dev/fixtures/${name}.json`)).json()).directed;
  const clips = syntheticClips(board);
  const timeline = layout(board, clips, await pacing(board, clips, env), measureCaption);
  const prod = await Production.create(board, timeline, env);
  const fails = [];
  const expect = (ok, what) => { if (!ok) fails.push(what); };
  // the camera never jumps or goes back
  let prev = null;
  for (let i = 0; i < timeline.duration * FPS; i++) {
    const t = i / FPS;
    if (prod.modeAt(t)[0] !== 'board') continue;
    const L = prod.camera.at(t);
    if (prev && t - prev[0] < 1.5 / FPS) expect(Math.abs(L - prev[1]) < 200, `camera jumps at ${t.toFixed(2)}s`);
    prev = [t, L];
  }
  for (const [t0, a, b, kind] of prod.camera.segments()) expect(!(kind === 'pan' && b < a), `camera pans back at ${t0.toFixed(2)}s`);
  // every stroke is drawn on screen; drawings start near their words
  for (const e of prod.els) {
    if (e.fixed || !e.hand) continue;
    for (const t of [e.start + 0.01, e.end - 0.01]) {
      if (prod.modeAt(t)[0] !== 'board') continue;
      const L = prod.camera.at(t);
      expect(L - 2 <= e.x && e.x + e.w <= L + SIZE[0] + 2, `${e.group} drawn off screen at ${t.toFixed(2)}s`);
    }
    if (!e.essential && e.after === null) {
      const first = Math.min(...prod.els.filter((x) => x.group === e.group).map((x) => x.start));
      if (e.start === first) expect(e.start - e.trigger <= STALE + 1e-6, `${e.group} starts ${(e.start - e.trigger).toFixed(1)}s after its words`);
    }
  }
  // takeaway notes: written as they are said, finished before they fly
  for (const tr of timeline.transitions) {
    const beat = board.beats.find((b) => b.id === tr.take_beat);
    const [sticky, label, head] = prod.notes[tr.section].els;
    const spoken = beat.spoken.en;
    const prefix = takeText('');
    const said = prod.ctx.timeOf(beat, { en: spoken.slice(prefix.length, prefix.length + 24) });
    expect(head.trigger >= said - 1e-6 && head.start >= said - 1e-6, `${tr.section} headline written before it is said`);
    expect(head.start - said <= STALE, `${tr.section} headline written ${(head.start - said).toFixed(1)}s after it is said`);
    expect(label.trigger >= timeline.beats[beat.id].start - 1e-6, `${tr.section} label before "Key takeaway" is said`);
    expect(sticky.end <= label.start + 1e-6, `${tr.section} label written before the note is down`);
    for (const e of prod.notes[tr.section].els) if (!e.skipped) expect(e.end <= tr.hold_end - NOTE_READ + 1e-6, `${tr.section} note not finished before it flies`);
  }
  // section title cards are written while they are said
  for (const ch of board.chapters.filter((c) => c.kind === 'section')) {
    const opener = board.beats.find((b) => b.chapter === ch.id);
    const info = timeline.beats[opener.id];
    const card = prod.els.filter((e) => e.group === `opener:${ch.id}`);
    expect(card.length && info.start <= Math.min(...card.map((e) => e.start)) && Math.min(...card.map((e) => e.start)) < info.speech_end, `${ch.id} card not written while said`);
  }
  // timeline dates are written when they are said
  for (const b of board.beats) {
    for (const v of b.visuals.filter((x) => x.type === 'lanes')) {
      v.lanes[0].events.forEach((ev, k) => {
        const parts = prod.ctx.registry.get(v.id)?.get(k) || [];
        expect(parts.length && parts.every((e) => !e.skipped), `${v.id} date ${ev.display.en} skipped`);
        if (ev.trigger) expect(Math.min(...parts.map((e) => e.start)) >= prod.ctx.timeOf(b, ev.trigger) - 1e-6, `${v.id} date ${ev.display.en} written early`);
      });
    }
  }
  const skipped = [...new Set(prod.ctx.elements.filter((e) => e.skipped && e.beat).map((e) => e.group))];
  return { name, fails, skipped, duration: timeline.duration, elements: prod.els.length };
}

async function main() {
  await loadFonts(read, document);
  const assets = await loadAssets(read);
  const env = { svg: new SvgLibrary(assets), hand: await Hand.load(read), paper: await loadPaper(read) };
  const results = [];
  for (const name of ['printing_press', 'bicycle', 'water_cycle']) results.push(await check(name, env));
  window.__rulesResult = results;
  document.getElementById('out').textContent = JSON.stringify(results, null, 1);
}
main().catch((e) => { window.__rulesResult = { error: String(e.stack || e) }; });
