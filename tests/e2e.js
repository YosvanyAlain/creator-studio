/* Browser tests against the staged build: python3 build.py --stage && node tests/e2e.js
   Uses playwright-core with a local Chromium (CHROMIUM_PATH or the Playwright cache). */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright-core');

const ROOT = path.join(__dirname, '..');
const STAGE = path.join(ROOT, '.stage');
const FIXTURE = path.join(__dirname, 'fixtures', 'v2-storage.json');
const LANGS = ['es', 'en'];
let passed = 0;
const failed = [];

function check(name, value, detail) {
  if (value) { passed++; return; }
  failed.push(name + (detail !== undefined ? ' — ' + JSON.stringify(detail) : ''));
  console.log('  FAIL ' + failed[failed.length - 1]);
}

function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const cache = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (!fs.existsSync(cache)) return undefined;
  for (const dir of fs.readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()) {
    for (const sub of ['chrome-linux64/chrome', 'chrome-linux/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-win/chrome.exe']) {
      const p = path.join(cache, dir, sub);
      if (fs.existsSync(p)) return p;
    }
  }
  return undefined;
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.toml': 'text/plain', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
function serve(dir) {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    if (url === '/blank') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<!doctype html><title>blank</title>'); }
    const file = path.join(dir, path.normalize(url === '/' ? '/index.html' : url));
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

/* Visible UI text without code areas, used to spot untranslated keys like "ws_save". */
const UI_TEXT = `(() => {
  const root = document.querySelector('#app').cloneNode(true);
  root.querySelectorAll('pre, code, textarea, input, .cm-editor, iframe, [data-code], .codebox, .mono').forEach((n) => n.remove());
  return root.innerText;
})()`;
const RAW_KEY = /\b[a-z]+_[a-z0-9]+(?:_[a-z0-9]+)*\b/g;

async function newPage(browser, base, lang, errors) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: lang, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('dialog', (d) => d.accept().catch(() => {}));
  return { ctx, page };
}

async function boot(page, base, lang) {
  await page.goto(base + '/index.html');
  await page.waitForFunction(() => window.CS && CS.router && CS.router.current, null, { timeout: 15000 });
  if (lang && (await page.evaluate(() => CS.i18n.lang)) !== lang) {
    await page.evaluate((l) => { localStorage.setItem('__tl', l); CS.settings.set('lang', l); }, lang);
    await page.reload();
    await page.waitForFunction(() => window.CS && CS.router && CS.router.current, null, { timeout: 15000 });
  }
  await page.waitForFunction(() => { const s = document.getElementById('splash'); return !s || s.hidden || !s.isConnected || getComputedStyle(s).display === 'none'; }, null, { timeout: 10000 }).catch(() => {});
}

/* Preview phones are scaled iframes that Chrome may run in their own process; Playwright's locator
   click ignores the parent transform there, so tap at the transformed point like a real finger. */
async function tapInPeer(page, index, selector, nth) {
  const frame = peers(page)[index];
  const inner = await frame.evaluate(([sel, n]) => { const r = document.querySelectorAll(sel)[n].getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, [selector, nth]);
  const outer = await page.evaluate((i) => { const f = document.querySelectorAll('iframe.sim-frame')[i]; const r = f.getBoundingClientRect(); return { x: r.x, y: r.y, k: r.width / f.offsetWidth }; }, index);
  await page.mouse.click(outer.x + inner.x * outer.k, outer.y + inner.y * outer.k);
}

const go = (page, name, params) => page.evaluate(([n, p]) => CS.router.go(n, p || {}), [name, params]).then(() => page.waitForTimeout(450));
const routeName = (page) => page.evaluate(() => CS.router.current && CS.router.current.name);
const peers = (page) => page.frames().filter((f) => f !== page.mainFrame());

async function testRoutes(browser, base, lang) {
  const errors = [];
  const { ctx, page } = await newPage(browser, base, lang, errors);
  await boot(page, base, lang);
  check(lang + ': language applied', (await page.evaluate(() => CS.i18n.lang)) === lang);
  check(lang + ': splash gone and icon packaged', await page.evaluate(async () => (await fetch('icon.png')).ok));
  const ids = await page.evaluate(async () => {
    const p = CS.projects.create({ name: 'Demo', look: { icon: 'poll', tint: 'teal' } });
    p.files['index.html'] = { kind: 'text', content: '<!doctype html><h1>Hi</h1><script src="app.js"></script>' };
    p.files['app.js'] = { kind: 'text', content: 'console.log(1);' };
    await CS.projects.add(p);
    await CS.common.openProject(p.id);
    const lesson = CS.learn.allLessons()[0];
    return { project: p.id, lesson: lesson.id, track: CS.learn.tracks()[0].id, tools: CS.tools.list().map((t) => t.id) };
  });
  const PARAMS = { lesson: { id: ids.lesson }, track: { id: ids.track }, template: { id: 'poll' }, tool: { id: 'color' }, workspace: { id: ids.project }, history: { id: ids.project } };
  const views = await page.evaluate(() => CS.router.views());
  check(lang + ': view count', views.length >= 20, views.length);
  for (const view of views) {
    const before = errors.length;
    await go(page, view, PARAMS[view]);
    const text = await page.evaluate(UI_TEXT);
    const raw = [...new Set(text.match(RAW_KEY) || [])];
    check(lang + ': ' + view + ' renders', (await routeName(page)) === view, await routeName(page));
    check(lang + ': ' + view + ' has no raw keys', raw.length === 0, raw);
    check(lang + ': ' + view + ' has no undefined/NaN', !/\bundefined\b|\bNaN\b|\[object Object\]/.test(text));
    check(lang + ': ' + view + ' no errors', errors.length === before, errors.slice(before));
  }
  for (const id of ids.tools) {
    const before = errors.length;
    await page.evaluate((x) => CS.tools.open(x), id);
    await page.waitForTimeout(450);
    check(lang + ': tool ' + id + ' no errors', errors.length === before, errors.slice(before));
  }
  const before = errors.length;
  await go(page, 'tool', { id: 'st-pixel' });
  check(lang + ': direct link to a studio tool is safe', errors.length === before && (await page.locator('.empty .btn-primary').count()) === 1, errors.slice(before));
  await ctx.close();
}

async function testCreateAndSync(browser, base, lang) {
  const errors = [];
  const { ctx, page } = await newPage(browser, base, lang, errors);
  await boot(page, base, lang);
  await page.evaluate(() => CS.router.switchTab('create'));
  await page.waitForTimeout(600);
  check(lang + ': 20 templates in gallery', (await page.locator('.cr-card').count()) === 20);
  check(lang + ': 3 starters', (await page.locator('.cr-start').count()) === 3);
  await page.locator('.cr-card[data-tpl="poll"]').click();
  await page.waitForTimeout(1500);
  check(lang + ': template detail', (await routeName(page)) === 'template');
  let frames = peers(page);
  check(lang + ': two simulated peers', frames.length === 2, frames.length);
  await page.locator('.cr-field input.input').first().fill('Pizza?');
  await page.waitForTimeout(1300);
  await page.locator('.cr-field textarea').first().fill('A\nB\nC');
  await page.waitForTimeout(1300);
  frames = peers(page);
  check(lang + ': live customize', frames.length === 2 && (await frames[0].evaluate(() => document.querySelector('h1').textContent)) === 'Pizza?');
  await tapInPeer(page, 0, '.opt', 2);
  await page.waitForTimeout(900);
  const pct = await frames[1].locator('.opt .pct').allTextContents();
  check(lang + ': vote syncs to the other peer', pct[2] === '100%', pct);
  await page.locator('.cr-create').click();
  await page.waitForTimeout(1600);
  const proj = await page.evaluate(() => { const p = CS.projects.current; return p && { name: p.name, tpl: p.origin.template, files: Object.keys(p.files) }; });
  check(lang + ': project created from template', proj && proj.name === 'Pizza?' && proj.tpl === 'poll' && proj.files.includes('app.js'), proj);
  check(lang + ': opens the workspace', (await routeName(page)) === 'workspace');
  await page.evaluate(() => CS.router.switchTab('create'));
  await page.waitForTimeout(600);
  await page.locator('.cr-start[data-starter="game"]').click();
  await page.waitForTimeout(1400);
  await page.locator('.cr-create').click();
  await page.waitForTimeout(1800);
  const game = await page.evaluate(() => { const p = CS.projects.current; return { starter: p.origin.starter, tab: p.workspace.tab, blocks: p.blocks.model.contexts.onStart.length }; });
  check(lang + ': game starter opens blocks', game.starter === 'game' && game.tab === 'blocks' && game.blocks > 5, game);
  check(lang + ': no errors while creating', errors.length === 0, errors);
  await ctx.close();
}

/* Real 2.0 storage (captured from the published 2.0.0 build) must open in 3.0 untouched. */
async function testMigration(browser, base) {
  const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  const errors = [];
  const { ctx, page } = await newPage(browser, base, 'es', errors);
  await page.goto(base + '/blank');
  await page.evaluate(async (storage) => {
    for (const [k, v] of Object.entries(storage.ls)) localStorage.setItem(k, v);
    for (const [name, db] of Object.entries(storage.idb)) {
      await new Promise((resolve, reject) => {
        const req = indexedDB.open(name, db.version);
        req.onupgradeneeded = () => {
          for (const [store, s] of Object.entries(db.stores)) {
            const os = req.result.createObjectStore(store, s.keyPath ? { keyPath: s.keyPath, autoIncrement: s.autoIncrement } : { autoIncrement: s.autoIncrement });
            (s.indexes || []).forEach((ix) => os.createIndex(ix.name, ix.keyPath, { unique: ix.unique, multiEntry: ix.multiEntry }));
          }
        };
        req.onsuccess = () => {
          const conn = req.result;
          const names = Object.keys(db.stores);
          if (!names.length) { conn.close(); return resolve(); }
          const tx = conn.transaction(names, 'readwrite');
          for (const [store, s] of Object.entries(db.stores)) s.rows.forEach((row, i) => (s.keyPath ? tx.objectStore(store).put(row) : tx.objectStore(store).put(row, s.keys[i])));
          tx.oncomplete = () => { conn.close(); resolve(); };
          tx.onerror = () => reject(tx.error);
        };
        req.onerror = () => reject(req.error);
      });
    }
  }, fixture.storage);
  await boot(page, base, null);
  const list = await page.evaluate(async () => (await CS.projects.list()).map((p) => ({
    id: p.id, name: p.name, files: Object.keys(p.files).sort(), blocks: !!(p.blocks && p.blocks.model), src: p.settings && p.settings.sourceCodeUrl
  })));
  const byName = Object.fromEntries(list.map((p) => [p.name, p]));
  check('2.0: every project is still there', fixture.projects.every((n) => byName[n]), list.map((p) => p.name));
  check('2.0: language setting kept', (await page.evaluate(() => CS.i18n.lang)) === 'es');
  const blocks = byName['Contador con bloques'];
  check('2.0: blocks model kept', blocks && blocks.blocks);
  const photo = byName['Mi app con foto'];
  check('2.0: binary asset and settings kept', photo && photo.files.includes('assets/foto.png') && photo.src === 'https://example.org/mi-app', photo);
  const before = errors.length;
  await page.evaluate((id) => CS.common.openProject(id, 'blocks'), blocks.id);
  await page.waitForTimeout(1500);
  const state = await page.evaluate(() => { const p = CS.projects.current; return { tab: p.workspace && p.workspace.tab, gen: CS.blocks.generate(p.blocks.model).problems.length, appjs: (p.files['app.js'] || {}).content || '' }; });
  check('2.0: blocks project opens in Blocks', (await routeName(page)) === 'workspace' && state.tab === 'blocks', state.tab);
  check('2.0: blocks still generate without problems', state.gen === 0 && state.appjs.length > 50, state);
  await page.evaluate((id) => CS.common.openProject(id, 'test'), photo.id);
  await page.waitForTimeout(1600);
  const img = await Promise.all(peers(page).map((f) => f.evaluate(() => { const i = document.querySelector('img'); return i ? i.complete && i.naturalWidth > 0 : false; }).catch(() => false)));
  check('2.0: image asset loads in preview', img.some(Boolean), img);
  const poll = byName['Encuesta del grupo'];
  await go(page, 'history', { id: poll.id });
  const snaps = await page.evaluate(async (id) => (await CS.snapshots.list(id)).map((s) => ({ reason: s.reason, files: Object.keys(CS.projects.migrate(CS.util.deepClone(s.project)).files).length })), poll.id);
  check('2.0: snapshot kept and restorable', snaps.length === 1 && snaps[0].files >= 3, snaps);
  check('2.0: snapshot listed in history', (await page.locator('.list .row').count()) === 1, await page.locator('.list .row').count());
  check('2.0: opening old projects raises no errors', errors.length === before, errors.slice(before));
  await ctx.close();
}

(async () => {
  if (!fs.existsSync(path.join(STAGE, 'index.html'))) { console.log('Run "python3 build.py --stage" first.'); process.exit(2); }
  const server = await serve(STAGE);
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ executablePath: findChromium() });
  const steps = [['migration from 2.0', () => testMigration(browser, base)]];
  for (const lang of LANGS) {
    steps.push(['all views (' + lang + ')', () => testRoutes(browser, base, lang)]);
    steps.push(['create and sync (' + lang + ')', () => testCreateAndSync(browser, base, lang)]);
  }
  for (const [name, fn] of steps) {
    const before = failed.length;
    try { await fn(); } catch (error) { failed.push(name + ' crashed: ' + String(error.stack || error).split('\n').slice(0, 2).join(' | ')); }
    console.log((failed.length === before ? 'PASS ' : 'FAIL ') + name);
  }
  await browser.close();
  server.close();
  console.log('\n' + passed + ' checks passed, ' + failed.length + ' failed');
  if (failed.length) { failed.forEach((f) => console.log(' - ' + f)); process.exit(1); }
})();
