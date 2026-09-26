// The media layer's pure parts (media/audio.js, and the text side of media/tts.js), checked in Node. Loudness is held
// to FFmpeg's loudnorm (what the Python app measures with) when an ffmpeg binary is around.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { SR, assembleNarration, envelope, loudness, mixMusic, resample, truePeak } from '../extension/media/audio.js';
import { align, chunkText } from '../extension/media/tts.js';

const { board: BOARD, timeline: TIMELINE } = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'fixtures-tiny.json'), 'utf8'));
const FFMPEG = ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/usr/bin/ffmpeg'].find(existsSync);
const db = (x) => 20 * Math.log10(x);
const slice = (a, from, to) => a.slice(Math.round(from * SR), Math.round(to * SR));

function random(seed) {                                   // mulberry32: repeatable noise
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const tone = (freq, seconds, amplitude = 1, rate = SR, phase = 0) =>
  Float32Array.from({ length: Math.round(seconds * rate) }, (_, i) => amplitude * Math.sin((2 * Math.PI * freq * i) / rate + phase));

// Speech-like: noise in bursts of different levels, with silences between them.
function bursts(seconds, rate, seed) {
  const next = random(seed);
  const out = new Float32Array(Math.round(seconds * rate));
  let i = 0;
  while (i < out.length) {
    const on = Math.round((0.2 + next() * 0.5) * rate);
    const level = 0.05 + next() * 0.3;
    for (let k = 0; k < on && i < out.length; k++, i++) out[i] = level * (next() * 2 - 1);
    i += Math.round(next() * 0.2 * rate);                         // pauses shorter than the envelope's hold
  }
  return out;
}

function ffmpegLoudness(channels, rate) {
  const dir = mkdtempSync(join(tmpdir(), 'media-test-'));
  try {
    const n = channels[0].length;
    const c = channels.length;
    const wav = Buffer.alloc(44 + n * c * 4);                // 32-bit float WAV
    wav.write('RIFF', 0);
    wav.writeUInt32LE(36 + n * c * 4, 4);
    wav.write('WAVEfmt ', 8);
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(3, 20);
    wav.writeUInt16LE(c, 22);
    wav.writeUInt32LE(rate, 24);
    wav.writeUInt32LE(rate * c * 4, 28);
    wav.writeUInt16LE(c * 4, 32);
    wav.writeUInt16LE(32, 34);
    wav.write('data', 36);
    wav.writeUInt32LE(n * c * 4, 40);
    for (let i = 0; i < n; i++) for (let k = 0; k < c; k++) wav.writeFloatLE(channels[k][i], 44 + (i * c + k) * 4);
    writeFileSync(join(dir, 'in.wav'), wav);
    const { stderr } = spawnSync(FFMPEG, ['-hide_banner', '-nostats', '-i', join(dir, 'in.wav'), '-af', 'loudnorm=print_format=json', '-f', 'null', '-'],
      { encoding: 'utf8' });
    const json = stderr.slice(stderr.lastIndexOf('{'));
    return Number(JSON.parse(json.slice(0, json.indexOf('}') + 1)).input_i);   // ffmpeg prints more after it
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('loudness: a full-scale 997 Hz sine in one channel reads -3.01 LUFS (BS.1770 calibration)', () => {
  assert.ok(Math.abs(loudness([tone(997, 5)], SR) + 3.01) < 0.05);
});

test('loudness matches ffmpeg loudnorm within 0.5 LU', { skip: !FFMPEG && 'no ffmpeg' }, () => {
  const cases = [
    ['1 kHz tone at -20 dBFS', [tone(1000, 5, 0.1)], SR],
    ['stereo speech-like bursts with pauses (gating)', [bursts(12, SR, 1), bursts(12, SR, 2)], SR],
    ['100 Hz + 8 kHz at 44.1 kHz', [tone(100, 6, 0.3, 44100).map((v, i) => v + 0.2 * Math.sin((2 * Math.PI * 8000 * i) / 44100))], 44100],
    ['quiet and loud halves (relative gate)', [Float32Array.from([...bursts(6, SR, 3).map((v) => v * 0.02), ...bursts(6, SR, 4)])], SR],
  ];
  for (const [name, channels, rate] of cases) {
    const ours = loudness(channels, rate);
    const theirs = ffmpegLoudness(channels, rate);
    assert.ok(Math.abs(ours - theirs) <= 0.5, `${name}: ${ours.toFixed(2)} vs ffmpeg ${theirs.toFixed(2)}`);
  }
});

test('loudness of silence is -Infinity', () => {
  assert.equal(loudness([new Float32Array(SR * 2)], SR), -Infinity);
});

test('resample: a 24 kHz tone doubles to 48 kHz without distortion', () => {
  const up = resample(tone(1000, 1, 0.5, 24000), 24000, SR);
  assert.equal(up.length, SR);
  const ideal = tone(1000, 1, 0.5, SR);
  let worst = 0;
  for (let i = 1000; i < SR - 1000; i++) worst = Math.max(worst, Math.abs(up[i] - ideal[i]));
  assert.ok(worst < 1e-3, `max error ${worst}`);
  assert.equal(resample(tone(440, 1, 1, 44100), 44100, SR).length, SR);
});

test('truePeak finds the crest between samples', () => {
  const quarter = tone(SR / 4, 1, 1, SR, Math.PI / 4);            // every sample at ±0.707, crests between them
  assert.ok(Math.abs(Math.max(...quarter.map(Math.abs)) - Math.SQRT1_2) < 1e-6);
  assert.ok(Math.abs(truePeak(quarter) - 1) < 0.02, `true peak ${truePeak(quarter)}`);
});

// Speech-like clips at 24 kHz (the voice's rate) for every beat of the tiny fixture, as long as the timeline says.
function fixtureClips(timeline = TIMELINE, scale = 1) {
  return Object.fromEntries(BOARD.beats.map((b, k) => {
    const info = timeline.beats[b.id];
    const pcm = bursts(info.speech_end - info.start - 0.4, 24000, 10 + k).map((v) => v * scale);
    pcm[0] = 0.1;                                                    // so the clip's first sample marks where it landed
    return [b.id, { pcm, sampleRate: 24000 }];
  }));
}

test('assembleNarration: clips at their beat starts, round(duration * SR) long, -18 LUFS, peaks under -1.5 dBFS', () => {
  const narration = assembleNarration(BOARD, TIMELINE, fixtureClips());
  assert.equal(narration.length, Math.round(TIMELINE.duration * SR));
  assert.ok(Math.abs(loudness([narration], SR) + 18) < 0.05, `loudness ${loudness([narration], SR)}`);
  assert.ok(db(truePeak(narration)) <= -1.5 + 1e-6);
  for (const beat of BOARD.beats) {
    const start = Math.round(TIMELINE.beats[beat.id].start * SR);
    assert.ok(Math.abs(narration[start]) > 0, `${beat.id} starts at its beat`);
  }
  assert.ok(slice(narration, 2.2, TIMELINE.beats.b002.start - 0.01).every((v) => v === 0), 'silence between clips');
});

test('assembleNarration: a loud click is turned down on its own; the voice stays at -18 LUFS', () => {
  const clips = fixtureClips(TIMELINE, 0.1);
  clips.b002.pcm[5000] = 1;                                          // one sample far above the rest
  const narration = assembleNarration(BOARD, TIMELINE, clips);
  assert.ok(db(truePeak(narration)) <= -1.5 + 1e-6, `true peak ${db(truePeak(narration))}`);
  assert.ok(Math.abs(loudness([narration], SR) + 18) < 0.1, `loudness ${loudness([narration], SR)}`);
  const plain = assembleNarration(BOARD, TIMELINE, fixtureClips(TIMELINE, 0.1));
  const click = TIMELINE.beats.b002.start + 5000 / 24000;
  for (const t of [click - 0.02, click + 0.3]) {                    // 20 ms before and 300 ms after: as without it
    const i = Math.round(t * SR);
    assert.ok(Math.abs(narration[i] - plain[i]) <= 0.01 * Math.abs(plain[i]) + 1e-6, `${t}: ${narration[i]} vs ${plain[i]}`);
  }
});

test('limit: nothing passes the ceiling, the gain moves smoothly, and quiet audio is untouched', async () => {
  const { limit } = await import('../extension/media/audio.js');
  const pcm = tone(200, 1, 0.3, SR);
  for (let i = 24000; i < 24048; i++) pcm[i] *= 3;                   // a 1 ms burst to 0.9
  const before = Float32Array.from(pcm);
  limit(pcm, 0.5);
  assert.ok(Math.max(...pcm.map(Math.abs)) <= 0.5 + 1e-6);
  const gains = Array.from(pcm, (v, i) => (Math.abs(before[i]) > 0.05 ? v / before[i] : null)).filter((g) => g !== null);
  assert.ok(gains.every((g) => g > 0.5 && g <= 1 + 1e-6));
  assert.ok(pcm.slice(0, 20000).every((v, i) => v === before[i]), 'untouched well before the burst');
  assert.ok(pcm.slice(40000).every((v, i) => Math.abs(v - before[40000 + i]) < 1e-3), 'recovered after it');
});

test('envelope: follows speech, holds briefly, then lets go', () => {
  const speech = new Float32Array(6 * SR);
  speech.set(bursts(1, SR, 5).map((v) => (v === 0 ? 0.2 : v)), 0);   // 0–1 s: steady speech
  const env = envelope(speech);
  assert.equal(env.length, speech.length);
  assert.ok(env[Math.round(0.9 * SR)] > 0.99);
  assert.ok(env[Math.round(1.2 * SR)] > 0.99, 'held for a moment after speech');
  assert.ok(env[Math.round(5.5 * SR)] < 0.01, 'gone in a long silence');
});

// Distinguishable fake music: a steady 440 Hz tone for the primary track, 660 Hz for the secondary, 2.5 s long so
// long windows have to loop.
async function mixed() {
  const narration = assembleNarration(BOARD, TIMELINE, fixtureClips());
  const loaded = [];
  const loadTrack = async (slug) => {
    loaded.push(slug);
    const freq = slug === 'fresh_focus' ? 440 : 660;
    return { channels: [tone(freq, 2.5, 0.5, 44100), tone(freq, 2.5, 0.5, 44100)], sampleRate: 44100 };
  };
  return { narration, loaded, ...(await mixMusic(BOARD, TIMELINE, narration, { loadTrack })) };
}

const minus = (a, b) => a.map((v, i) => v - b[i]);
function strength(pcm, freq) {                                        // amplitude of one frequency
  let re = 0;
  let im = 0;
  for (let i = 0; i < pcm.length; i++) {
    re += pcm[i] * Math.cos((2 * Math.PI * freq * i) / SR);
    im += pcm[i] * Math.sin((2 * Math.PI * freq * i) / SR);
  }
  return (2 * Math.hypot(re, im)) / pcm.length;
}

test('mixMusic: narration on both channels, music only inside its windows', async () => {
  const { narration, left, right } = await mixed();
  assert.equal(left.length, narration.length);
  assert.equal(right.length, narration.length);
  const inMusic = (t) => TIMELINE.music.some((w) => t >= w.start && t < w.end);
  for (let i = 0; i < narration.length; i += 997) {
    if (!inMusic(i / SR)) assert.equal(left[i], narration[i]);
  }
});

test('mixMusic: -25 LUFS in the open, ducked to -31 LUFS under speech', async () => {
  const { narration, left, right } = await mixed();
  const music = [minus(left, narration), minus(right, narration)];               // the music bed alone, in stereo
  const open = loudness(music.map((c) => slice(c, 63, 64.5)), SR);             // end card, well after the last word
  assert.ok(Math.abs(open + 25) < 0.3, `open ${open.toFixed(2)}`);
  const b003 = TIMELINE.beats.b003;                                            // agenda beat: music under speech
  const under = loudness(music.map((c) => slice(c, b003.start + 1.6, b003.speech_end - 0.6)), SR);   // after the fade-in
  assert.ok(Math.abs(under + 31) < 0.3, `under speech ${under.toFixed(2)}`);
});

test('mixMusic: primary track near the intro and outro, secondary in between; loops without gaps', async () => {
  const { narration, left, loaded } = await mixed();
  assert.deepEqual(loaded, ['fresh_focus', 'natural_vibes']);
  const music = minus(left, narration);
  const title = slice(music, 1, 2);                                            // [0, 3.09]: the title beat
  assert.ok(strength(title, 440) > 10 * strength(title, 660));
  const transition = slice(music, 34.2, 35);                                   // [33.2, 36.0]: a section transition
  assert.ok(strength(transition, 660) > 10 * strength(transition, 440));
  const agenda = slice(music, 9.8, 13.8);                                      // [8.22, 15.42]: 7.2 s, loops twice
  for (let t = 0; t + 0.1 <= 4; t += 0.1) {
    const piece = slice(agenda, t, t + 0.1);
    const rms = Math.sqrt(piece.reduce((s, v) => s + v * v, 0) / piece.length);
    assert.ok(rms > 0.004, `no gap at ${(9.8 + t).toFixed(1)} s`);
  }
});

test('mixMusic: every window fades in from silence and out to it', async () => {
  const { narration, left } = await mixed();
  const music = minus(left, narration);
  for (const { start, end } of TIMELINE.music) {
    const first = Math.trunc(start * SR);
    const last = first + Math.trunc((Math.min(end, left.length / SR) - start) * SR) - 1;
    assert.ok(Math.abs(music[first]) < 1e-6 && Math.abs(music[last]) < 1e-6, `window ${start}–${end}`);
    const early = slice(music, start, start + 0.1);
    const later = slice(music, start + 1.4, start + 1.5);
    assert.ok(Math.max(...early.map(Math.abs)) < 0.2 * Math.max(...later.map(Math.abs)), `fade in at ${start}`);
  }
});

test('mixMusic: music off leaves just the narration', async () => {
  const narration = assembleNarration(BOARD, TIMELINE, fixtureClips());
  const { left, right } = await mixMusic({ ...BOARD, music: false }, TIMELINE, narration, { loadTrack: () => assert.fail('no music') });
  assert.deepEqual(left, narration);
  assert.deepEqual(right, narration);
});

test('chunkText: short text stays whole; long text splits after sentences, and the pieces join back', () => {
  assert.deepEqual(chunkText('Honey never spoils.'), ['Honey never spoils.']);
  assert.deepEqual(chunkText(' ... '), []);
  const sentence = 'Bees visit about two million flowers to make one jar of honey. ';
  const long = sentence.repeat(12).trim();
  const pieces = chunkText(long);
  assert.equal(pieces.join(''), long);
  assert.ok(pieces.length > 1 && pieces.every((p) => p.length <= 300));
  assert.ok(pieces.slice(0, -1).every((p) => p.endsWith('honey. ')));
  const run = 'word '.repeat(100).trim();                             // no sentence end at all: split at spaces
  assert.equal(chunkText(run).join(''), run);
  assert.ok(chunkText(run).every((p) => p.length <= 300));
});

// HeadTTS-shaped results: words (with their trailing spaces and marks) and their start/duration in ms, and the
// sounding phonemes as visemes.
const said = (words, wtimes, wdurations, visemes, text = words.join(''), offset = 0) =>
  ({ text, words, wtimes, wdurations, vtimes: visemes.map((v) => v[0]), vdurations: visemes.map((v) => v[1]), offset });

test('align: letters spread over their word until its last sound; spaces and marks take the time before them', () => {
  const spoken = 'Honey, bees.';
  const part = said(['Honey, ', 'bees.'], [100, 700], [600, 500], [[100, 100], [200, 100], [300, 100], [400, 100], [700, 150], [850, 150]]);
  const times = align(spoken, [part]);
  assert.equal(times.length, spoken.length);
  assert.deepEqual(times, [0.1, 0.18, 0.26, 0.34, 0.42, 0.42, 0.42, 0.7, 0.775, 0.85, 0.925, 0.925]);
});

test('align: pieces follow each other at their offsets; the result never runs backwards', () => {
  const first = said(['One. '], [50], [400], [[50, 200]]);
  const second = said(['Two.'], [30], [300], [[30, 150]], 'Two.', 0.6);
  const spoken = 'One. Two.';
  const times = align(spoken, [first, second]);
  assert.equal(times.length, spoken.length);
  assert.ok(times.every((t, i) => i === 0 || t >= times[i - 1]));
  assert.equal(times[0], 0.05);
  assert.equal(times[5], 0.63);                                         // 'T': 0.6 s offset + 30 ms
});

test('align: nothing said, or words that do not match the text, still time every character', () => {
  assert.deepEqual(align('...', []), [0, 0, 0]);
  const odd = said(['Hello ', 'there'], [0, 400], [400, 400], [[0, 300], [400, 300]], 'Hello there!!');
  const times = align('Hello there!!', [odd]);
  assert.equal(times.length, 13);
  assert.ok(times.every((t, i) => i === 0 || t >= times[i - 1]) && times.at(-1) <= 0.8);
});

// A stand-in for HeadTTS's worker: WebGPU fails to load and WASM loads; every word "takes" 0.1 s of audio.
class FakeWorker {
  static made = [];
  constructor(url, options) {
    Object.assign(this, { url: String(url), options, messages: [], terminated: false });
    FakeWorker.made.push(this);
  }
  postMessage(message) {
    this.messages.push(message);
    setTimeout(() => this.reply(message));
  }
  terminate() {
    this.terminated = true;
  }
  reply({ type, id, data }) {
    if (this.terminated) return;
    const send = (message) => this.onmessage({ data: message });
    if (type === 'connect' && FakeWorker.hang) return;                               // a download that never ends
    if (type === 'connect' && data.device === 'webgpu') return send({ type: 'failed', error: 'no WebGPU here' });
    if (type === 'connect') {
      send({ type: 'progress', data: { loaded: 3500, total: 3500 } });              // tokenizer and config first
      send({ type: 'progress', data: { loaded: 50e6, total: 92e6 } });
      send({ type: 'progress', data: { loaded: 92e6, total: 92e6 } });
      return send({ type: 'ready' });
    }
    if (data.input.includes('boom')) return send({ type: 'failed', error: 'out of memory' });
    const words = data.input.split(/(?<=\s)(?=\S)/);
    const audio = new Int16Array(words.length * 2400).fill(16384).buffer;
    send({ type: 'audio', ref: id, data: { words, wtimes: words.map((_, k) => 100 * k), wdurations: words.map(() => 100),
      vtimes: words.map((_, k) => 100 * k), vdurations: words.map(() => 80), audio } });
  }
}

async function fakeVoice(statuses = [], { gpu = true, signal } = {}) {
  FakeWorker.made = [];
  globalThis.Worker = FakeWorker;
  Object.defineProperty(globalThis, 'navigator', { value: { gpu: gpu ? { requestAdapter: async () => ({}) } : undefined }, configurable: true });
  const { createVoice } = await import('../extension/media/tts.js');
  const warn = console.warn;
  console.warn = () => {};
  try {
    return await createVoice({ signal, onStatus: (s) => statuses.push(s) });
  } finally {
    console.warn = warn;
  }
}

test('createVoice: WebGPU first, then WASM with the model it already downloaded, with download progress', async () => {
  const statuses = [];
  const voice = await fakeVoice(statuses);
  const [gpu, wasm] = FakeWorker.made;
  assert.equal(FakeWorker.made.length, 2);
  assert.ok(gpu.url.endsWith('/media/tts-worker.js') && gpu.options.type === 'module' && gpu.terminated);
  assert.deepEqual([gpu, wasm].map((w) => [w.messages[0].data.device, w.messages[0].data.dtype]), [['webgpu', 'fp32'], ['wasm', 'fp32']]);
  const settings = wasm.messages[0].data;
  assert.ok(settings.transformersModule.endsWith('/vendor/transformers/transformers.min.js'));
  assert.ok(settings.dictionaryURL.endsWith('/vendor/headtts/dictionaries'));
  assert.equal(settings.voiceURL,
    'https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX-timestamped/resolve/dd4401a9add81ac692d20e240d22ec9dda82cc29/voices');
  assert.deepEqual(statuses, [{ stage: 'download', loaded: 50e6, total: 92e6, backend: 'wasm' },
    { stage: 'load', loaded: 92e6, total: 92e6, backend: 'wasm' }, { stage: 'ready', backend: 'wasm' }]);
  voice.close();
});

test('createVoice: the smaller WASM model without WebGPU; Stop cancels a download in progress', async () => {
  const voice = await fakeVoice([], { gpu: false });
  assert.deepEqual(FakeWorker.made.map((w) => [w.messages[0].data.device, w.messages[0].data.dtype]), [['wasm', 'q8']]);
  voice.close();
  FakeWorker.hang = true;
  try {
    const controller = new AbortController();
    const loading = fakeVoice([], { gpu: false, signal: controller.signal });
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.equal(FakeWorker.made.length, 1);
    controller.abort();
    await assert.rejects(loading, { name: 'AbortError' });
    assert.ok(FakeWorker.made[0].terminated);
  } finally {
    FakeWorker.hang = false;
  }
});

test('synthesize: 24 kHz audio of all the pieces, one time per character, later pieces at their offsets', async () => {
  const voice = await fakeVoice();
  const clip = await voice.synthesize('Honey never spoils.');
  assert.equal(clip.sampleRate, 24000);
  assert.equal(clip.pcm.length, 3 * 2400);
  assert.ok(Math.abs(clip.pcm[0] - 0.5) < 1e-4);
  assert.equal(clip.duration, 0.3);
  assert.deepEqual([clip.charTimes.length, clip.charTimes[0], clip.charTimes[6]], [19, 0, 0.1]);
  const long = 'Bees visit about two million flowers to make one jar of honey. '.repeat(6).trim();
  const pieces = FakeWorker.made[1].messages.length;
  const longClip = await voice.synthesize(long);
  const sent = FakeWorker.made[1].messages.slice(pieces).map((m) => m.data.input);
  assert.ok(sent.length === 2 && sent.join('') === long);
  const firstWords = sent[0].split(/(?<=\s)(?=\S)/).length;
  assert.equal(longClip.pcm.length, long.split(/(?<=\s)(?=\S)/).length * 2400);
  assert.equal(longClip.charTimes.length, long.length);
  assert.equal(longClip.charTimes[sent[0].length], firstWords / 10);     // the second piece starts where the first ends
  voice.close();
});

test('synthesize: a worker failure rejects this and every later request; close() stops the worker', async () => {
  const voice = await fakeVoice();
  await assert.rejects(voice.synthesize('boom'), /out of memory/);
  await assert.rejects(voice.synthesize('Honey never spoils.'), /out of memory/);
  const other = await fakeVoice();
  other.close();
  assert.ok(FakeWorker.made[1].terminated);
  await assert.rejects(other.synthesize('Honey never spoils.'), /closed/);
});
