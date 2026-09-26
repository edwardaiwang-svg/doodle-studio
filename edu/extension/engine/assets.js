// The doodle library and friends, exported from the Python app by tools/export_assets.py:
// catalog.json (ids in vector order + tags), embed-en.f32 / picture-en.f32 (Float32 rows, 384 wide), banned.json,
// doodles/<id>.svg, fonts, hand, paper, music. In the extension they are fetched from the package; tests read them
// from disk with a `read(path) → ArrayBuffer` of their own.
export const DIM = 384;

export async function loadAssets(read = fetchPackaged) {
  const text = async (path) => new TextDecoder().decode(await read(path));
  const [catalog, banned, embed, picture] = await Promise.all([
    text('assets/catalog.json').then(JSON.parse), text('assets/banned.json').then(JSON.parse),
    read('assets/embed-en.f32'), read('assets/picture-en.f32')]);
  const assets = { catalog, banned, dim: DIM, embedVectors: new Float32Array(embed), pictureVectors: new Float32Array(picture) };
  assets.svg = async (id) => text(`assets/doodles/${catalog.entries[id] || id.startsWith('narrator_') ? id : 'missing'}.svg`)
    .catch(() => text('assets/doodles/missing.svg'));
  assets.read = read;
  return assets;
}

async function fetchPackaged(path) {
  const r = await fetch(chrome.runtime.getURL(path));
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.arrayBuffer();
}
