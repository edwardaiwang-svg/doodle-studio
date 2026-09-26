// The voice worker: HeadTTS's own worker (English G2P, Kokoro inference, word timings) with transformers.js' ONNX
// Runtime pointed at the WASM files bundled in the extension; by default it would fetch them from a CDN, which MV3
// forbids. HeadTTS imports transformers.js by the same URL, so it shares this module and its `env`.
import { CONFIG } from '../config.js';
import { env } from '../vendor/transformers/transformers.min.js';
import '../vendor/headtts/modules/worker-tts.mjs';

// A plain path, not the { mjs, wasm } form: that form makes transformers.js re-host the runtime from a blob: URL,
// which the extension CSP blocks.
env.backends.onnx.wasm.wasmPaths = new URL('../vendor/transformers/', import.meta.url).href;
// Every voice file comes from the pinned revision, not whatever the model's `main` branch holds today.
env.remotePathTemplate = `{model}/resolve/${CONFIG.voice.revision}/`;

// HeadTTS loads the model and synthesizes from message handlers without awaiting them, so its failures only surface
// as unhandled rejections: report them, so the page can fall back to WASM or show the error.
self.addEventListener('unhandledrejection', (event) => {
  self.postMessage({ type: 'failed', error: String(event.reason?.message ?? event.reason) });
});
