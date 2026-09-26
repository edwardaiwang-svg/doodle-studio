// Shared test helpers: the packaged assets read from disk, and the Python app's recorded embeddings.
import { readFileSync } from 'node:fs';
import { loadAssets } from '../extension/engine/assets.js';

const EXT = new URL('../extension/', import.meta.url);
export const readPackaged = async (path) => {
  const b = readFileSync(new URL(path, EXT));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
export const assets = () => loadAssets(readPackaged);

/** An embedder that answers with the vectors the Python app computed (fails on a text Python never embedded). */
export function recordedEmbedder(fixture) {
  return async (texts) => texts.map((t) => {
    const v = fixture.embeddings[t];
    if (!v) throw new Error(`not embedded by Python: ${JSON.stringify(t)}`);
    return Float32Array.from(v);
  });
}

export const fixtures = (names) => names.map((n) => JSON.parse(readFileSync(new URL(`./parity/${n}.json`, import.meta.url), 'utf8')));
