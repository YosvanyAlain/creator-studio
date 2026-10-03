/* Verificación final del ARTEFACTO creator-studio.xdc:
   extraído con python zipfile → servido → ejecutado como haría un mensajero. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const ROOT = process.argv[2] || '/tmp/xdc-final';
const PORT = 8904;

(async () => {
  const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.toml': 'text/plain' };
  /* Simula el mensajero: sirve webxdc.js él mismo (como hace Delta Chat).
     El .xdc NO contiene ese archivo: la petición la resuelve el host. */
  const MESSENGER_WEBXDC = 'window.webxdc = { selfAddr: "final@xdc.test", selfName: "Final QA", sendUpdate: function () { return Promise.resolve(); }, setUpdateListener: function () { return Promise.resolve(); }, sendToChat: function () { return Promise.resolve(); } };';
  const server = http.createServer((req, res) => {
    let p = req.url.split('?')[0];
    if (p === '/') p = '/index.html';
    if (p === '/webxdc.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript' });
      res.end(MESSENGER_WEBXDC);
      return;
    }
    const f = path.join(ROOT, path.normalize(p));
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });

  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 360, height: 740 }, locale: 'es-ES' })).newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  await page.goto('http://127.0.0.1:' + PORT + '/index.html');
  await page.waitForSelector('#view-home.active', { timeout: 8000 });
  await new Promise((r) => setTimeout(r, 400));

  /* flujo express sobre el artefacto final */
  await page.evaluate(() => CS.app.createFromTemplate('tictactoe', 'Tres en raya final'));
  await page.waitForSelector('.overlay .modal input.input');
  await page.fill('.overlay .modal input.input', 'Tres en raya QA');
  await page.click('.overlay .modal-actions .btn.primary');
  await new Promise((r) => setTimeout(r, 400));

  await page.evaluate(() => CS.app.showView('preview'));
  await page.waitForSelector('.preview-frame', { timeout: 8000 });
  await new Promise((r) => setTimeout(r, 800));
  const frame = page.frameLocator('.preview-frame');
  await frame.locator('#c0').click();
  await new Promise((r) => setTimeout(r, 400));
  const cell = await frame.locator('#c0').textContent();
  const status = await frame.locator('#status').textContent();

  await page.evaluate(() => {
    window.__s = [];
    window.webxdc = { selfAddr: 'a@b', selfName: 'T', sendToChat: (m) => { window.__s.push(m); return Promise.resolve(); } };
  });
  await page.evaluate(() => CS.app.showView('export'));
  await new Promise((r) => setTimeout(r, 250));
  await page.locator('#view-export .btn', { hasText: 'Construir' }).click();
  await page.waitForSelector('.build-out .build-info', { timeout: 8000 });
  const info = await page.locator('.build-out').textContent();
  await page.locator('.build-out .btn', { hasText: 'Enviar al chat' }).click();
  await new Promise((r) => setTimeout(r, 300));
  const sent = await page.evaluate(() => ({
    n: window.__s.length,
    name: window.__s[0] && window.__s[0].file.name,
    size: window.__s[0] && window.__s[0].file.blob.size
  }));

  console.log('ARTEFACTO FINAL creator-studio.xdc:');
  console.log('  pageerrors:', JSON.stringify(pageErrors));
  console.log('  console errors:', JSON.stringify(consoleErrors));
  console.log('  tres en raya (preview real): c0="' + cell + '" status="' + status + '"');
  console.log('  build:', /integridad verificada/i.test(info) ? 'OK' : 'FALLO: ' + info);
  console.log('  sendToChat:', JSON.stringify(sent));

  await browser.close();
  server.close();
  const fail = pageErrors.length || consoleErrors.length || cell !== 'X' || sent.n !== 1 || !/integridad verificada/i.test(info);
  console.log(fail ? '  ✖ FALLO' : '  ✓ artefacto final verificado end-to-end');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
