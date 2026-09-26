// Test-only: render stills of a parity storyboard (synthetic timing) so they can be compared with the Python render.
//   render-check.html?fixture=printing_press&times=10,30,60     → window.__renderResult = { stills: {t: dataURL}, ... }
import { loadAssets } from '../engine/assets.js';
import { Hand, SvgLibrary, loadFonts, loadPaper } from '../engine/ink.js';
import { Production, measureCaption, pacing } from '../engine/render.js';
import { layout, syntheticClips } from '../engine/timeline.js';

const params = new URLSearchParams(location.search);
const read = async (path) => (await fetch(chrome.runtime.getURL(path))).arrayBuffer();

async function main() {
  const t0 = performance.now();
  await loadFonts(read, document);
  const assets = await loadAssets(read);
  const env = { svg: new SvgLibrary(assets), hand: await Hand.load(read), paper: await loadPaper(read) };
  const fixture = await (await fetch(`/dev/fixtures/${params.get('fixture') || 'printing_press'}.json`)).json();
  const board = fixture.directed;
  const clips = syntheticClips(board);
  const pauses = params.get('pace') === '0' ? {} : await pacing(board, clips, env);
  const timing = layout(board, clips, pauses, measureCaption);
  const tBuild = performance.now();
  const prod = await Production.create(board, timing, env);
  const built = performance.now();
  const g = document.getElementById('frame').getContext('2d');
  const stills = {};
  const times = (params.get('times') || '5,20,40').split(',').map(Number).sort((a, b) => a - b);
  let fps = null;
  if (params.get('fps')) {                               // how fast frames are drawn (no encoding)
    const n = Number(params.get('fps'));
    const f0 = performance.now();
    for (let i = 0; i < n; i++) prod.drawFrame(g, times[0] + i / 30);
    fps = n / ((performance.now() - f0) / 1000);
  }
  const fresh = await Production.create(board, timing, env);
  for (const t of times) {
    fresh.drawFrame(g, t);
    stills[t] = g.canvas.toDataURL('image/jpeg', 0.85);
  }
  window.__renderResult = { stills, warnings: prod.warnings, pauses, duration: timing.duration, fps,
    setupMs: Math.round(tBuild - t0), buildMs: Math.round(built - tBuild), elements: prod.els.length };
}
main().catch((e) => { window.__renderResult = { error: String(e.stack || e) }; });
