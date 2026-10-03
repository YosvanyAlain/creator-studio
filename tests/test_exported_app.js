/* =========================================================================
 * Webxdc Creator Studio — test E2E del artefacto exportado
 * Simula el ciclo de vida REAL en un mensajero:
 *   1. Construye un .xdc desde el Studio (proyecto «Contador compartido»)
 *   2. Descomprime el ZIP con herramientas EXTERNAS (python zipfile)
 *   3. Sirve los archivos extraídos por HTTP
 *   4. Intercepta la petición de webxdc.js y la sirve con un mock
 *      (exactamente como hace Delta Chat)
 *   5. Verifica que la miniapp hija arranca, sincroniza y responde
 *
 * Uso: node tests/test_exported_app.js   (requiere playwright-core + chromium)
 * ========================================================================= */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const { execSync } = require('child_process');
const { chromium } = require('playwright-core');

globalThis.CS = globalThis.CS || {};
const SRC = path.join(__dirname, '..', 'xdc-src');
for (const f of ['core.js', 'i18n.js', 'db.js', 'project.js', 'templates.js', 'blocks.js', 'zip.js', 'validator.js', 'exporter.js']) {
  require(path.join(SRC, f));
}
const CS = globalThis.CS;

/* webxdc.js simulado — lo más fiel posible a un mensajero real */
const FAKE_WEBXDC_JS = `
window.webxdc = {
  selfAddr: 'tester@delta.test',
  selfName: 'Tester',
  sendUpdateInterval: 10000,
  sendUpdateMaxSize: 128000,
  _updates: [],
  _listener: null,
  sendUpdate: function (update, descr) {
    this._updates.push(update);
    this._serial = (this._serial || 0) + 1;
    var u = { payload: update.payload, serial: this._serial, max_serial: this._serial,
              info: update.info, summary: update.summary };
    document.title = 'update:' + JSON.stringify(update.payload);
    if (this._listener) { this._listener(u); }
    return Promise.resolve();
  },
  setUpdateListener: function (cb, serial) {
    this._listener = cb;
    var self = this;
    this._updates.forEach(function (u, i) {
      if (i + 1 > (serial || 0)) cb({ payload: u.payload, serial: i + 1, max_serial: self._updates.length });
    });
    return Promise.resolve();
  },
  sendToChat: function () { return Promise.resolve(); }
};
`;

function startServer(root, port) {
  const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.toml': 'text/plain' };
  const server = http.createServer((req, res) => {
    let p = req.url.split('?')[0];
    if (p === '/') p = '/index.html';
    const file = path.join(root, path.normalize(p).replace(/^([.][.][/\\])+/, ''));
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end('nf'); return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(port, '127.0.0.1', () => r(server)));
}

let passed = 0, failed = 0;
const failures = [];
function test(name, fn) {
  return Promise.resolve().then(fn)
    .then(() => { passed++; console.log('  ✓ ' + name); })
    .catch((e) => { failed++; failures.push({ name, e }); console.log('  ✖ ' + name + ' — ' + (e && e.message || e)); });
}
function ok(c, m) { if (!c) throw new Error(m || 'assertion'); }
function eq(a, b, m) { if (a !== b) throw new Error((m || '') + ' — esperado: ' + JSON.stringify(b) + ', obtenido: ' + JSON.stringify(a)); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log('\n== E2E: .xdc exportado → descomprimido → ejecutado como lo haría un mensajero ==');

  /* 1. construir el .xdc desde el Studio (módulos reales, store) */
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wcs-e2e-'));
  const project = CS.projects.fromTemplate('counter', 'E2E Counter');
  const xdc = await CS.exporter.buildXdc(project);
  const xdcPath = path.join(tmp, 'e2e-counter.xdc');
  fs.writeFileSync(xdcPath, xdc.bytes);
  console.log('  .xdc construido: ' + xdc.size + ' bytes, método ' + xdc.method + ', verify=' + JSON.stringify(xdc.verify));

  /* 2. descomprimir con python (herramienta externa) */
  const outDir = path.join(tmp, 'extracted');
  fs.mkdirSync(outDir);
  execSync('python3 -m zipfile -e ' + JSON.stringify(xdcPath) + ' ' + JSON.stringify(outDir));
  const names = fs.readdirSync(outDir).sort();
  console.log('  extraído: ' + names.join(', '));

  await test('el ZIP exportado abre con herramientas externas', () => {
    ok(names.indexOf('index.html') >= 0, 'index.html en la raíz');
    ok(names.indexOf('manifest.toml') >= 0, 'manifest.toml generado');
    ok(names.indexOf('webxdc.js') < 0, 'sin webxdc.js (lo sirve el mensajero)');
    const manifest = fs.readFileSync(path.join(outDir, 'manifest.toml'), 'utf8');
    ok(/name = "E2E Counter"/.test(manifest), 'manifest: ' + manifest.trim());
  });

  /* 3-5. servir + interceptar webxdc.js + ejecutar */
  const PORT = 8902;
  const server = await startServer(outDir, PORT);
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext({ locale: 'es-ES' });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  /* interceptar webxdc.js → mock del mensajero (como Delta Chat) */
  await context.route('**/webxdc.js', (route) => {
    route.fulfill({ contentType: 'text/javascript', body: FAKE_WEBXDC_JS });
  });

  try {
    await test('la miniapp hija arranca con webxdc del mensajero', async () => {
      await page.goto('http://127.0.0.1:' + PORT + '/index.html');
      await page.waitForSelector('#counter', { timeout: 8000 });
      await sleep(400);
      eq(await page.textContent('#counter'), '0');
      ok(await page.evaluate(() => typeof window.webxdc === 'object'), 'window.webxdc presente');
      eq(pageErrors.length, 0, 'sin errores: ' + pageErrors.join(' | '));
    });

    await test('interacción real: +1 llama a sendUpdate y actualiza UI', async () => {
      await page.click('#plus');
      await sleep(300);
      eq(await page.textContent('#counter'), '1', 'counter actualizado');
      /* el mock recibió el update con payload correcto */
      const payload = await page.evaluate(() => {
        const u = window.webxdc._updates[0];
        return u ? u.payload : null;
      });
      ok(payload && payload.counter === 1, 'payload: ' + JSON.stringify(payload));
      ok(payload && typeof payload.who === 'string', 'who = selfName');
      /* el listener (eco propio) añadió al log de la UI */
      const logText = await page.textContent('#log');
      ok(/→\s*1/.test(logText), 'log de la app: ' + logText.trim().slice(0, 60));
      eq(pageErrors.length, 0, 'sin errores');
    });

    await test('persistencia del listener: reset viaja por sendUpdate', async () => {
      await page.click('#reset');
      await sleep(300);
      eq(await page.textContent('#counter'), '0', 'reset aplicado');
      const n = await page.evaluate(() => window.webxdc._updates.length);
      eq(n, 2, 'dos updates enviados');
      eq(pageErrors.length, 0);
    });

    await test('la petición de webxdc.js fue interceptada (no 404)', async () => {
      /* ninguna petición de red falló: la página no tendría webxdc si fallara */
      const has = await page.evaluate(() => typeof window.webxdc.sendUpdate === 'function');
      ok(has, 'sendUpdate disponible → webxdc.js servido');
    });

    console.log('\n---------------------------------------------');
    console.log('PASS: ' + passed + '  FAIL: ' + failed);
    if (failures.length) {
      console.log('\nFallos:');
      failures.forEach((f) => console.log('  ✖ ' + f.name + '\n    ' + (f.e && f.e.stack || f.e)));
    }
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(tmp, { recursive: true, force: true });
    process.exit(failed ? 1 : 0);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
