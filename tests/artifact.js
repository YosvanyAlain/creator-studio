/* Checks the release packages: python3 build.py && node tests/artifact.js */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const PACKAGES = [
  { file: 'creator-studio.xdc', monaco: false, maxBytes: 3 * 1048576 },
  { file: 'monaco-creator-studio.xdc', monaco: true, maxBytes: 8 * 1048576 }
];
/* The store downloads the first .xdc asset of a release, and releases list assets by name. */
const storePick = PACKAGES.map((p) => p.file).sort((a, b) => a.localeCompare(b))[0];
let passed = 0;
const failed = [];
function check(name, value, detail) {
  if (value) { passed++; return; }
  failed.push(name + (detail !== undefined ? ' — ' + JSON.stringify(detail) : ''));
  console.log('  FAIL ' + failed[failed.length - 1]);
}

/* Reuse the app's own zip reader. */
function zipReader() {
  const c = { console, Math, Date, Object, Array, String, Number, JSON, Map, Set, Promise, Error, Uint8Array, Uint16Array, Uint32Array, DataView, ArrayBuffer,
    TextEncoder, TextDecoder, CompressionStream, DecompressionStream, Blob, Response };
  c.globalThis = c;
  vm.createContext(c);
  for (const f of ['kernel/cs.js', 'engines/zip.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'), c);
  return c.CS.zip;
}

function pngSize(bytes) {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!sig.every((b, i) => bytes[i] === b)) return null;
  const dv = new DataView(bytes.buffer, bytes.byteOffset);
  return { w: dv.getUint32(16), h: dv.getUint32(20) };
}

/* Patterns that would make the app load something from the network (forbidden in webxdc). */
const REMOTE = [
  /<script[^>]+src=["']https?:/i,
  /<link[^>]+href=["']https?:[^>]+stylesheet|<link[^>]+stylesheet[^>]+href=["']https?:/i,
  /@import\s+(url\()?["']?https?:/i,
  /importScripts\(\s*["']https?:/i
];

async function inspect(pkg, Z) {
  const full = path.join(ROOT, pkg.file);
  if (!fs.existsSync(full)) { check(pkg.file + ' exists', false); return null; }
  const bytes = new Uint8Array(fs.readFileSync(full));
  const entries = await Z.read(bytes, { files: 2000, totalBytes: 256 * 1048576 });
  const files = new Map(entries.map((e) => [e.path, e.data]));
  const text = (p) => new TextDecoder().decode(files.get(p));
  const name = pkg.file + ': ';
  check(name + 'size ' + (bytes.length / 1048576).toFixed(2) + ' MB within budget', bytes.length <= pkg.maxBytes);
  check(name + 'index.html at root', files.has('index.html'));
  check(name + 'no webxdc.js inside', !files.has('webxdc.js'));
  const manifest = files.has('manifest.toml') ? text('manifest.toml') : '';
  check(name + 'manifest name', /^name\s*=\s*"Webxdc Creator Studio"/m.test(manifest), manifest);
  check(name + 'manifest source_code_url', /^source_code_url\s*=\s*"https:\/\/[^"]+"/m.test(manifest));
  const icon = files.has('icon.png') ? pngSize(files.get('icon.png')) : null;
  check(name + 'icon.png is 512×512', icon && icon.w === 512 && icon.h === 512, icon);
  const html = text('index.html');
  const refs = [...html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g)].map((m) => m[1]).filter((r) => r !== 'webxdc.js');
  const missing = refs.filter((r) => !files.has(r));
  check(name + 'every page reference is packaged (' + refs.length + ')', missing.length === 0, missing);
  const remote = [];
  for (const [p, data] of files) {
    if (!/\.(html|css|js)$/.test(p) || p.startsWith('vendor/')) continue;
    const src = new TextDecoder().decode(data);
    if (REMOTE.some((re) => re.test(src))) remote.push(p);
  }
  check(name + 'nothing loads from the network', remote.length === 0, remote);
  const broken = [];
  for (const [p, data] of files) {
    if (!p.endsWith('.js') || p.startsWith('vendor/monaco/')) continue;
    try { new vm.Script(new TextDecoder().decode(data), { filename: p }); } catch (error) { broken.push(p + ': ' + error.message); }
  }
  check(name + 'all scripts parse', broken.length === 0, broken);
  const flag = files.has('engines/monaco.js') ? text('engines/monaco.js') : '';
  const hasMonaco = [...files.keys()].some((p) => p.startsWith('vendor/monaco/vs/editor/'));
  check(name + (pkg.monaco ? 'ships Monaco' : 'stays light (no Monaco)'), hasMonaco === pkg.monaco && flag.includes('MONACO_BUNDLED = ' + pkg.monaco));
  return files;
}

/* Boots the Monaco package for real and types into the editor. */
async function bootMonaco(files) {
  let chromium;
  try { ({ chromium } = require('playwright-core')); } catch (error) { console.log('  (playwright-core missing: Monaco boot skipped)'); return; }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cs-monaco-'));
  for (const [p, data] of files) { fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true }); fs.writeFileSync(path.join(dir, p), data); }
  fs.copyFileSync(path.join(__dirname, 'mock-webxdc.js'), path.join(dir, 'webxdc.js'));
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf' };
  const server = http.createServer((req, res) => {
    const file = path.join(dir, decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const exe = (() => {
    if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
    const cache = path.join(os.homedir(), '.cache', 'ms-playwright');
    if (!fs.existsSync(cache)) return undefined;
    for (const d of fs.readdirSync(cache).filter((x) => /^chromium-\d+$/.test(x)).sort().reverse()) {
      for (const sub of ['chrome-linux64/chrome', 'chrome-linux/chrome']) if (fs.existsSync(path.join(cache, d, sub))) return path.join(cache, d, sub);
    }
    return undefined;
  })();
  const browser = await chromium.launch({ executablePath: exe });
  const errors = [];
  try {
    const page = await (await browser.newContext({ viewport: { width: 900, height: 800 } })).newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('response', (r) => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()); });
    await page.goto(base + '/index.html');
    await page.waitForFunction(() => window.CS && CS.router && CS.router.current, null, { timeout: 15000 });
    await page.evaluate(async () => {
      CS.settings.set('preferMonaco', true);
      const p = CS.projects.create({ name: 'Monaco' });
      p.files['index.html'] = { kind: 'text', content: '<!doctype html>\n<h1>Hi</h1>\n<script src="app.js"></script>\n' };
      p.files['app.js'] = { kind: 'text', content: 'const a = 1;\n' };
      await CS.projects.add(p);
      await CS.common.openProject(p.id, 'code');
    });
    await page.waitForSelector('.monaco-editor', { timeout: 20000 });
    check('monaco: editor boots', true);
    await page.locator('.monaco-editor .view-lines').click();
    await page.keyboard.press('Control+End');
    await page.keyboard.type('let b = 2;');
    await page.waitForTimeout(800);
    const saved = await page.evaluate(() => Object.values(CS.projects.current.files).map((f) => f.content || '').join('\n'));
    check('monaco: typing is saved', saved.includes('let b = 2;'));
    check('monaco: no errors or missing files', errors.length === 0, errors);
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

(async () => {
  check('store picks the light build first', storePick === 'creator-studio.xdc' && [...PACKAGES.map((p) => p.file)].sort()[0] === 'creator-studio.xdc', storePick);
  const Z = zipReader();
  for (const pkg of PACKAGES) {
    const before = failed.length;
    const files = await inspect(pkg, Z);
    if (files && pkg.monaco) await bootMonaco(files).catch((error) => check('monaco: boot crashed', false, String(error.message || error)));
    console.log((failed.length === before ? 'PASS ' : 'FAIL ') + pkg.file);
  }
  console.log('\n' + passed + ' checks passed, ' + failed.length + ' failed');
  if (failed.length) { failed.forEach((f) => console.log(' - ' + f)); process.exit(1); }
})();
