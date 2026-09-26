// Test-only page (left out of the store zip): the media layer end to end inside the real extension. The real voice
// says two sentences, audio.js assembles and mixes them over the music of a tiny fake timeline, and encode.js writes
// ~11 s of an animated 1080p30 canvas with that soundtrack. The MP4 (base64) and the numbers land on
// window.__mediaResult for tests/e2e/media.mjs.
//   ?forceWasmAac=1   act as if WebCodecs had no AAC encoder (ChromeOS, Linux): encode.js must use the WASM one
//   ?tts=wasm         act as if there were no WebGPU: the voice runs on the WASM runtime
import { GAP, SR, assembleNarration, loudness, mixMusic, truePeak } from '../media/audio.js';
import { createEncoder } from '../media/encode.js';
import { createVoice } from '../media/tts.js';

const FPS = 30;
const SENTENCES = ['Honey never spoils.', 'Bees visit about two million flowers to make one jar of honey.'];
const INTRO = 2;                    // seconds of music before the first sentence
const OUTRO = 2;                    // and after the last one (the end card)
const params = new URLSearchParams(location.search);

if (params.get('forceWasmAac')) {
  const native = AudioEncoder.isConfigSupported.bind(AudioEncoder);
  AudioEncoder.isConfigSupported = async (config) => (config.codec.startsWith('mp4a') ? { supported: false, config } : native(config));
}
if (params.get('tts') === 'wasm') Object.defineProperty(navigator, 'gpu', { value: undefined });
const workers = [];                 // every worker script started, to tell which AAC encoder ran
window.Worker = class extends Worker {
  constructor(url, options) {
    super(url, options);
    workers.push(String(url));
  }
};

function log(text) {
  document.getElementById('log').textContent += `${text}\n`;
  console.info(text);
}

async function run() {
  const result = { crossOriginIsolated: self.crossOriginIsolated };
  let t = performance.now();
  let shown = '';
  const voice = await createVoice({ onStatus: (s) => {
    result.ttsBackend = s.backend;
    const percent = Math.floor((10 * s.loaded) / s.total) * 10;
    const line = s.stage === 'download' ? `download ${percent}% of ${(s.total / 1e6).toFixed(0)} MB` : s.stage;
    if (line !== shown) log(`voice (${s.backend}): ${(shown = line)}`);
  } });
  result.ttsLoadSeconds = (performance.now() - t) / 1000;
  t = performance.now();
  await voice.synthesize('Hello there.');                 // first use: fetches the voice file, warms the model up
  result.ttsFirstSeconds = (performance.now() - t) / 1000;
  const clips = {};
  let speaking = 0;
  t = performance.now();
  for (const [i, text] of SENTENCES.entries()) {
    const clip = await voice.synthesize(text);
    if (clip.charTimes.length !== text.length) throw new Error(`${clip.charTimes.length} charTimes for ${text.length} characters`);
    clips[`b${i + 1}`] = clip;
    speaking += clip.duration;
  }
  result.ttsRtf = (performance.now() - t) / 1000 / speaking;
  voice.close();
  result.clips = Object.fromEntries(Object.entries(clips).map(([id, c]) => [id, { duration: c.duration, charTimes: c.charTimes }]));
  log(`voice: ${result.ttsBackend}, real-time factor ${result.ttsRtf.toFixed(3)}`);

  const { board, timeline } = fakeTimeline(clips);
  const narration = assembleNarration(board, timeline, clips);
  result.narrationLufs = loudness([narration], SR);
  result.narrationPeakDb = 20 * Math.log10(truePeak(narration));
  const { left, right } = await mixMusic(board, timeline, narration, { loadTrack });
  result.duration = timeline.duration;
  result.speech = [timeline.beats.b1.start, timeline.beats.b2.start + clips.b2.duration];
  const excerpt = left.slice(Math.round((INTRO + 0.25) * SR), Math.round((INTRO + 0.75) * SR));   // to find in the MP4
  result.excerpt = await toBase64(new Blob([excerpt]));
  log(`narration ${result.narrationLufs.toFixed(2)} LUFS, peak ${result.narrationPeakDb.toFixed(2)} dBFS`);

  const encoder = await createEncoder({ width: 1920, height: 1080, fps: FPS });
  result.codecs = encoder.codecs;
  const canvas = document.getElementById('frame');
  result.frames = Math.round(timeline.duration * FPS);
  t = performance.now();
  for (let k = 0; k < result.frames; k++) {
    draw(canvas, k, result.frames);
    await encoder.addFrame(canvas);
  }
  result.encodeFps = result.frames / ((performance.now() - t) / 1000);
  t = performance.now();
  await encoder.addAudio(left, right);
  const blob = await encoder.finish();
  result.audioAndFinishSeconds = (performance.now() - t) / 1000;
  result.bytes = blob.size;
  result.aacWorkerLoaded = workers.some((url) => url.endsWith('/mediabunny-aac-encoder-worker.js'));
  result.base64 = await toBase64(blob);
  log(`encoded ${result.frames} frames at ${result.encodeFps.toFixed(1)} fps: ${blob.size} bytes, ${JSON.stringify(encoder.codecs)}`);
  return result;
}

// Intro music, the two sentences (each followed by GAP), end card music: the shape of a real timeline, in miniature.
function fakeTimeline(clips) {
  const board = {
    chapters: [{ id: 'intro', kind: 'intro' }, { id: 's1', kind: 'section' }],
    beats: [{ id: 'b1', chapter: 'intro', spoken: { en: SENTENCES[0] } }, { id: 'b2', chapter: 's1', spoken: { en: SENTENCES[1] } }],
  };
  const b1 = { start: INTRO, end: INTRO + clips.b1.duration + GAP };
  const b2 = { start: b1.end, end: b1.end + clips.b2.duration + GAP };
  const duration = Math.ceil((b2.end + OUTRO) * FPS) / FPS;
  const timeline = { fps: FPS, duration, beats: { b1, b2 },
    chapters: [{ id: 'intro', start: 0, end: b1.end }, { id: 's1', start: b2.start, end: b2.end }],
    music: [{ start: 0, end: b1.start }, { start: b2.end, end: duration }] };
  return { board, timeline };
}

async function loadTrack(slug) {
  const bytes = await (await fetch(`../assets/music/${slug}.mp3`)).arrayBuffer();
  const audio = await new OfflineAudioContext(2, 1, SR).decodeAudioData(bytes);     // decoded straight to 48 kHz
  return { channels: [...Array(audio.numberOfChannels).keys()].map((c) => audio.getChannelData(c)), sampleRate: audio.sampleRate };
}

// A ball crossing a sheet of paper, and the frame number: enough motion to tell the frames apart.
function draw(canvas, k, frames) {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fbf8f1';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#e4572e';
  ctx.beginPath();
  ctx.arc(160 + (k / frames) * (canvas.width - 320), 540 + 300 * Math.sin(k / 9), 90, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.font = 'bold 72px system-ui';
  ctx.fillText(`frame ${k}`, 80, 120);
}

async function toBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

run().then((result) => { window.__mediaResult = result; }, (err) => {
  log(`failed: ${err.stack || err}`);
  window.__mediaResult = { error: String(err.stack || err) };
});
