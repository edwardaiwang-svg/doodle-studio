// The media layer end to end in the real extension (headless Chromium): tts.js speaks with the real Kokoro voice,
// audio.js assembles and mixes, encode.js writes the MP4 (dev/media-check.html drives them), then ffprobe and ffmpeg
// check what came out. Two runs:
//   native       the WebGPU voice when there is a GPU, WebCodecs AAC when the platform has it
//   chromebook   the WASM voice and the WASM AAC encoder, as on ChromeOS (no WebCodecs AAC there)
// Run `node tools/build.mjs` first. The first run downloads the voice model (fp32 for WebGPU, 326 MB; q8 for WASM,
// 92 MB) into a Chromium profile kept in tests/out/, so later runs reuse it. Exits non-zero on any failed check.
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const EDU = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(EDU, 'tests', 'out');
const PAGE = 'chrome-extension://hoddalijnehhimlamfchabikgmjfgeoe/dev/media-check.html';
const RUNS = [['native', ''], ['chromebook', '?forceWasmAac=1&tts=wasm']];
const INTRO = 2;                                          // media-check.js: music alone before the first sentence
const tool = (name) => ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin'].map((dir) => join(dir, name)).find(existsSync) ?? name;
const FFMPEG = tool('ffmpeg');
const FFPROBE = tool('ffprobe');

let failures = 0;
function check(label, ok, detail) {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}: ${detail}`);
  if (!ok) failures += 1;
}

// A throwaway copy of the unpacked extension. The manifest names parts other lanes may still be writing (the service
// worker, the Classroom content script), and Chrome refuses an extension whose files are missing, so the copy leaves
// those out; the CSP, COOP/COEP and permissions stay the real ones.
function extensionCopy() {
  const src = join(EDU, 'extension');
  if (!existsSync(join(src, 'vendor', 'mediabunny', 'mediabunny-aac-encoder-worker.js'))) throw new Error('run `node tools/build.mjs` first');
  const dir = join(OUT, 'media-extension');
  rmSync(dir, { recursive: true, force: true });
  cpSync(src, dir, { recursive: true });
  const file = join(dir, 'manifest.json');
  const manifest = JSON.parse(readFileSync(file, 'utf8'));
  const present = (path) => existsSync(join(dir, path));
  if (manifest.background && !present(manifest.background.service_worker)) delete manifest.background;
  manifest.content_scripts = (manifest.content_scripts ?? []).filter((c) => [...(c.js ?? []), ...(c.css ?? [])].every(present));
  writeFileSync(file, JSON.stringify(manifest, null, 2));
  return dir;
}

const ffmpeg = (file, from, to, filter) => spawnSync(FFMPEG, ['-hide_banner', '-nostats', '-ss', String(from), '-to', String(to), '-i', file,
  '-af', filter, '-f', 'null', '-'], { encoding: 'utf8' }).stderr;

// Integrated loudness (BS.1770) of the left channel between two times. ebur128, not loudnorm: loudnorm leaves out
// the audio still in its 3 s look-ahead when a short input ends.
const loudnessOf = (file, from, to) =>
  Number(ffmpeg(file, from, to, 'pan=mono|c0=c0,ebur128=framelog=quiet').match(/I:\s+(-?[\d.]+) LUFS/g).pop().match(/-?[\d.]+/)[0]);

const rmsOf = (file, from, to) =>
  Number(ffmpeg(file, from, to, 'astats=measure_perchannel=none:measure_overall=RMS_level').match(/RMS level dB: (\S+)/)?.[1].replace('inf', 'Infinity'));

// How late (ms) the soundtrack plays against the video: where the page's excerpt of the mix (from INTRO + 0.25 s)
// turns up in the decoded left channel. AAC encoders start with priming samples, which only an edit list hides.
function audioDelay(file, excerptBase64) {
  const bytes = Buffer.from(excerptBase64, 'base64');
  const excerpt = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.length / 4);
  const raw = execFileSync(FFMPEG, ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '2', '-ar', '48000', '-'], { maxBuffer: 1 << 28 });
  const decoded = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
  const at = Math.round((INTRO + 0.25) * 48000);
  let best = { lag: 0, error: Infinity };
  for (let lag = -4800; lag <= 9600; lag++) {                            // -100 … +200 ms
    let error = 0;
    for (let i = 0; i < excerpt.length && error < best.error; i++) error += (excerpt[i] - decoded[2 * (at + lag + i)]) ** 2;
    if (error < best.error) best = { lag, error };
  }
  return best.lag / 48;
}

function verify(file, result, forced) {
  const { streams, format } = JSON.parse(execFileSync(FFPROBE, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' }));
  const video = streams.find((s) => s.codec_type === 'video');
  const audio = streams.find((s) => s.codec_type === 'audio');
  check('cross-origin isolated (multi-threaded WASM)', result.crossOriginIsolated === true, String(result.crossOriginIsolated));
  if (forced) check('voice on WASM', result.ttsBackend === 'wasm', result.ttsBackend);
  if (forced) check('WASM AAC encoder used', result.aacWorkerLoaded === true, `worker loaded: ${result.aacWorkerLoaded}`);
  const times = Object.values(result.clips).flatMap((c) => c.charTimes.map((t, i, all) => i === 0 || t >= all[i - 1]));
  check('character times never run backwards', times.every(Boolean), `${times.length} characters`);
  check('H.264 1920x1080', video?.codec_name === 'h264' && video.width === 1920 && video.height === 1080,
    `${video?.codec_name} ${video?.profile} ${video?.width}x${video?.height} (${result.codecs.video})`);
  check('30 fps, every frame', video?.avg_frame_rate === '30/1' && Number(video.nb_frames) === result.frames,
    `${video?.avg_frame_rate}, ${video?.nb_frames} of ${result.frames} frames`);
  check('AAC 48 kHz stereo', audio?.codec_name === 'aac' && audio.sample_rate === '48000' && audio.channels === 2,
    `${audio?.codec_name} ${audio?.profile} ${audio?.sample_rate} Hz, ${audio?.channels} channels (${result.codecs.audio})`);
  check('duration', Math.abs(Number(format.duration) - result.duration) < 0.1,
    `${Number(format.duration).toFixed(3)} s for a ${result.duration.toFixed(3)} s timeline`);
  const [from, to] = result.speech;
  const speech = loudnessOf(file, from, to);
  check('speech near -18 LUFS', Math.abs(speech + 18) <= 1, `${speech.toFixed(2)} LUFS in the MP4 (left channel, ${from.toFixed(2)}–${to.toFixed(2)} s)`);
  check('same loudness as audio.js measured', Math.abs(speech - result.narrationLufs) <= 0.5,
    `${result.narrationLufs.toFixed(2)} LUFS before encoding, peak ${result.narrationPeakDb.toFixed(2)} dBFS`);
  const start = rmsOf(file, 0, 0.1);
  const middle = rmsOf(file, INTRO / 2 - 0.2, INTRO / 2 + 0.2);
  check('music fades in under the title', middle > -45 && start < middle - 10, `${start.toFixed(1)} dB at 0 s, ${middle.toFixed(1)} dB at ${INTRO / 2} s`);
  const delay = audioDelay(file, result.excerpt);
  check('sound in sync with the picture', Math.abs(delay) <= 50, `audio ${delay.toFixed(1)} ms late (encoder priming)`);
  return { speech, delay };
}

const ext = extensionCopy();
mkdirSync(OUT, { recursive: true });
const context = await chromium.launchPersistentContext(join(OUT, 'media-profile'), {
  channel: 'chromium',             // Playwright's Chromium in the new headless mode; the default headless shell has no extensions
  headless: true,
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
});
const rows = [];
try {
  for (const [name, query] of RUNS) {
    console.log(`\n${name}: ${PAGE}${query}`);
    const page = await context.newPage();
    page.on('console', (message) => { if (['info', 'warning', 'error'].includes(message.type())) console.log(`  [page] ${message.text()}`); });
    page.on('pageerror', (error) => console.log(`  [page error] ${error.message}`));
    await page.goto(PAGE + query);
    await page.waitForFunction(() => window.__mediaResult, null, { timeout: 30 * 60_000, polling: 1000 });
    const result = await page.evaluate(() => window.__mediaResult);
    await page.close();
    if (result.error) {
      check('media check page', false, result.error);
      continue;
    }
    const file = join(OUT, `media-${name}.mp4`);
    writeFileSync(file, Buffer.from(result.base64, 'base64'));
    console.log(`  saved ${file}`);
    const { speech, delay } = verify(file, result, Boolean(query));
    rows.push({ run: name, voice: result.ttsBackend, 'load s': result.ttsLoadSeconds.toFixed(1), 'first s': result.ttsFirstSeconds.toFixed(1),
      rtf: result.ttsRtf.toFixed(3), 'encode fps': result.encodeFps.toFixed(1), 'audio+finish s': result.audioAndFinishSeconds.toFixed(2),
      bytes: result.bytes, video: result.codecs.video, audio: `${result.codecs.audio}${result.aacWorkerLoaded ? ' (wasm)' : ''}`,
      'narration LUFS': result.narrationLufs.toFixed(2), 'MP4 speech LUFS': speech.toFixed(1), 'audio delay ms': delay.toFixed(1) });
  }
} finally {
  await context.close();
  rmSync(ext, { recursive: true, force: true });                 // 57 MB; the profile (the cached model) stays
}
console.log();
console.table(rows);
console.log(failures ? `${failures} check(s) failed` : 'all media checks passed');
process.exitCode = failures ? 1 : 0;
