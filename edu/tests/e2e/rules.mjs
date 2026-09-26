// The render rules (tests/test_render_rules.py) checked on the extension's JavaScript engine in headless Chromium.
//   node tests/e2e/rules.mjs
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const EDU = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(EDU, 'tests', 'out');
const [fixture = 'printing_press', times = '5,20,40'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const fps = process.argv.includes('--fps') ? process.argv[process.argv.indexOf('--fps') + 1] : '';

// A copy of the extension with only what rendering needs (the service worker and content script are not involved).
const ext = join(OUT, 'ext-render');
rmSync(ext, { recursive: true, force: true });
mkdirSync(ext, { recursive: true });
for (const part of ['engine', 'assets', 'vendor', 'dev', 'icons', 'config.js']) cpSync(join(EDU, 'extension', part), join(ext, part), { recursive: true });
const manifest = JSON.parse(readFileSync(join(EDU, 'extension', 'manifest.json'), 'utf8'));
for (const key of ['background', 'content_scripts', 'action', 'oauth2']) delete manifest[key];
writeFileSync(join(ext, 'manifest.json'), JSON.stringify(manifest, null, 1));

const profile = join(OUT, 'profile-render');
const context = await chromium.launchPersistentContext(profile, {
  headless: true, channel: 'chromium', args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
});
try {
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text()); });
  const q = new URLSearchParams({ fixture, times, ...(fps ? { fps } : {}), ...(process.argv.includes('--no-pace') ? { pace: '0' } : {}) });
  await page.goto(`chrome-extension://hoddalijnehhimlamfchabikgmjfgeoe/dev/rules-check.html`);
  await page.waitForFunction(() => window.__rulesResult, null, { timeout: 600_000 });
  const result = await page.evaluate(() => window.__rulesResult);
  if (result.error) throw new Error(result.error);
  console.log(JSON.stringify(result, null, 1));
  if (result.some((r) => r.fails.length)) process.exitCode = 1;
} finally {
  await context.close();
}
