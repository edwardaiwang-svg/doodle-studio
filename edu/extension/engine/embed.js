// Doodle search's sentence embeddings, in the browser: the exact model the desktop app uses through fastembed
// (Qdrant's quantized ONNX of BAAI/bge-small-en-v1.5), run by transformers.js on the bundled ONNX Runtime.
// The model file (66 MB) is data, downloaded once from a pinned revision and checked against its SHA-256.
// Output: the [CLS] vector of each text (the rules normalize it, as the Python director does).

export async function createEmbedder(transformers, { model, revision, file, sha256, device = 'wasm', onStatus } = {}) {
  const { AutoModel, AutoTokenizer } = transformers;
  onStatus?.({ stage: 'load' });
  if (sha256 && typeof caches !== 'undefined') await ensureVerified(transformers, { model, revision, file, sha256, onStatus });
  const options = { revision, subfolder: '', model_file_name: file, dtype: 'fp32', device };
  const [tokenizer, net] = await Promise.all([AutoTokenizer.from_pretrained(model, { revision }),
    AutoModel.from_pretrained(model, options)]);
  const cache = new Map();
  onStatus?.({ stage: 'ready' });
  return async function embed(texts) {
    const todo = [...new Set(texts.filter((t) => !cache.has(t)))];
    for (let i = 0; i < todo.length; i += 16) {             // small batches: long beats pad the whole batch
      const batch = todo.slice(i, i + 16);
      const inputs = await tokenizer(batch, { padding: true, truncation: true, max_length: 512 });
      const { last_hidden_state: h } = await net(inputs);
      const [n, seq, dim] = h.dims;
      for (let k = 0; k < n; k++) cache.set(batch[k], Float32Array.from(h.data.subarray(k * seq * dim, k * seq * dim + dim)));
    }
    return texts.map((t) => cache.get(t));
  };
}

/** Download the model file into transformers.js' browser cache ourselves, refusing it unless its SHA-256 matches. */
async function ensureVerified(transformers, { model, revision, file, sha256, onStatus }) {
  const { env } = transformers;
  const url = `${env.remoteHost.replace(/\/$/, '')}/${model}/resolve/${revision}/${file}.onnx`;
  const cache = await caches.open('transformers-cache');
  if (await cache.match(url)) return;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`the doodle search model could not be downloaded (${r.status})`);
  const total = Number(r.headers.get('content-length')) || 0;
  const reader = r.body.getReader();
  const chunks = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onStatus?.({ stage: 'download', loaded, total });
  }
  const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((b) => b.toString(16).padStart(2, '0')).join('');
  if (digest !== sha256) throw new Error('the doodle search model did not match its checksum; try again later');
  await cache.put(url, new Response(bytes, { headers: { 'content-type': 'application/octet-stream', 'content-length': String(bytes.length) } }));
}
