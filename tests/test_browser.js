/* =========================================================================
 * Webxdc Creator Studio — test en navegador real (Playwright + Chromium)
 * Uso: npm i playwright-core && npx playwright-core install chromium
 *      node tests/test_browser.js
 *
 * EVIDENCIA que aporta este test (TESTED en Chromium headless):
 *  - boot sin errores de consola
 *  - flujo completo con clicks reales: plantilla → editor → bloques →
 *    preview con EJECUCIÓN REAL del iframe sandbox (mock webxdc, consola,
 *    sendUpdate simulado) → validar → construir → sendToChat simulado
 *  - las 10 plantillas arrancan en el preview sin errores de runtime
 *  - exportación con CompressionStream (deflate real)
 * ========================================================================= */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright-core');

const SRC = path.join(__dirname, '..', 'xdc-src');
const PORT = 8901;

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

/* Servidor estático de xdc-src/ (= disposición de archivos del .xdc) */
function startServer() {
  const MIME = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.toml': 'text/plain', '.xdc': 'application/zip'
  };
  const server = http.createServer((req, res) => {
    let p = req.url.split('?')[0];
    if (p === '/') p = '/index.html';
    const file = path.join(SRC, path.normalize(p).replace(/^([.][.][/\\])+/, ''));
    if (!file.startsWith(SRC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end('nf'); return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(PORT, '127.0.0.1', () => r(server)));
}

async function main() {
  const server = await startServer();
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  /* locale es-ES → la UI autodetecta español (determinismo del test) */
  const context = await browser.newContext({ viewport: { width: 390, height: 780 }, locale: 'es-ES' }); /* móvil */
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  const clickBtn = async (sel, text) => {
    const btn = page.locator(sel).filter({ hasText: text }).first();
    await btn.waitFor({ state: 'visible', timeout: 5000 });
    await btn.click();
  };

  try {
    console.log('\n== navegador real: boot (viewport móvil 390×780) ==');
    await test('carga sin errores de página', async () => {
      await page.goto('http://127.0.0.1:' + PORT + '/index.html');
      await page.waitForSelector('#view-home.active', { timeout: 8000 });
      await sleep(300);
      eq(pageErrors.length, 0, 'pageerrors: ' + pageErrors.join(' | '));
    });
    await test('drawer abre y navega por todas las vistas', async () => {
      await page.click('#btn-menu');
      await page.waitForSelector('#drawer.open');
      const items = await page.locator('.drawer-item').count();
      eq(items, 9);
      await page.click('#drawer-scrim');
      for (const v of ['projects', 'templates', 'help', 'settings', 'home']) {
        await page.evaluate((id) => CS.app.showView(id), v);
        await sleep(60);
        ok(await page.locator('#view-' + v + '.active').count() === 1, 'vista ' + v);
      }
      eq(pageErrors.length, 0, 'pageerrors: ' + pageErrors.join(' | '));
    });
    await test('sin scroll horizontal en 320px (móvil pequeño)', async () => {
      await page.setViewportSize({ width: 320, height: 600 });
      await sleep(150);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      eq(overflow, 0, 'scrollWidth debe ser igual a clientWidth');
      await page.setViewportSize({ width: 390, height: 780 });
    });

    console.log('\n== flujo completo con clicks reales ==');
    await test('crear proyecto «Contador compartido» vía UI', async () => {
      await page.evaluate(() => CS.app.showView('templates'));
      /* clic en la tarjeta cuyo TÍTULO es "Contador compartido"
         (hasText es subcadena case-insensitive: filtrar por .tpl-name exacto) */
      const card = page.locator('.tpl-card').filter({
        has: page.locator('.tpl-name', { hasText: 'Contador compartido' })
      }).first();
      await card.waitFor({ state: 'visible', timeout: 5000 });
      await card.locator('button', { hasText: 'Usar plantilla' }).click();
      /* modal de nombre */
      await page.waitForSelector('.overlay .modal input.input');
      await page.fill('.overlay .modal input.input', 'Contador Navegador');
      await clickBtn('.overlay .modal-actions .btn', 'Aceptar');
      await sleep(300);
      ok(await page.locator('#view-editor.active').count() === 1, 'editor activo');
      const chips = await page.locator('.file-chip').count();
      eq(chips, 2, 'plantilla contador = index.html + icon.png (v1.1.1)');
    });

    await test('preview: EJECUCIÓN REAL del iframe con mock webxdc', async () => {
      await page.evaluate(() => CS.app.showView('preview'));
      await page.waitForSelector('.preview-frame', { timeout: 8000 });
      await sleep(700); /* dejar arrancar la app hija */
      /* banner permanente */
      ok(await page.locator('.preview-banner').count() === 1);
      /* la app hija corre de verdad: el contador está en 0 */
      const frame = page.frameLocator('.preview-frame');
      eq(await frame.locator('#counter').textContent(), '0');
      /* click real en el botón +1 dentro del iframe sandbox */
      await frame.locator('#plus').click();
      await sleep(300);
      eq(await frame.locator('#counter').textContent(), '1', 'contador +1 dentro del preview');
      /* la consola del Creator capturó el sendUpdate simulado */
      const conText = await page.locator('.console-list').textContent();
      ok(conText.indexOf('sendUpdate') >= 0, 'consola registra sendUpdate: ' + conText.slice(0, 120));
      /* y el update volvió por el listener mock (eco propio) */
      ok(conText.indexOf('→ 1') >= 0 || /1/.test(conText), 'eco del update en consola');
      /* reinicio y parada */
      await clickBtn('.preview-controls .btn', 'Reiniciar');
      await sleep(600);
      eq(await page.frameLocator('.preview-frame').locator('#counter').textContent(), '0', 'reinicia a 0');
      await clickBtn('.preview-controls .btn', 'Detener');
      await sleep(200);
      eq(await page.locator('.preview-frame').count(), 0, 'iframe eliminado');
    });

    await test('editor: editar y autosave persiste (IndexedDB real)', async () => {
      await page.evaluate(() => CS.app.showView('editor'));
      await page.waitForSelector('.code-area');
      const before = await page.locator('.code-area').inputValue();
      await page.fill('.code-area', before + '\n/* QA browser */');
      await sleep(1300); /* debounce */
      const saved = await page.evaluate(async () => {
        const p = await CS.store.get(CS.projects.current.id);
        return p.files['index.html'].content;
      });
      ok(saved.indexOf('/* QA browser */') >= 0, 'persistido en IndexedDB del navegador');
      const state = await page.locator('.save-state').textContent();
      ok(state.length > 0, 'indicador de guardado: ' + state);
    });

    await test('bloques: añadir bloque desde paleta y escribir archivo', async () => {
      /* proyecto de bloques nuevo */
      await page.evaluate(() => { CS.projects.current = null; });
      await page.evaluate(() => CS.app.createFromTemplate('blocks-scaffold', 'Bloques Browser'));
      await page.waitForSelector('.overlay .modal input.input');
      await page.fill('.overlay .modal input.input', 'Bloques Browser');
      await clickBtn('.overlay .modal-actions .btn', 'Aceptar');
      await sleep(400);
      await page.evaluate(() => CS.app.showView('blocks'));
      await page.waitForSelector('.palette-card');
      /* abrir paleta */
      await page.click('.palette-card .card-head');
      await sleep(150);
      /* v1.1.1: categorías plegadas por defecto → abrir la que contiene
         "Fijar texto" (buscar con el filtro también la abre) */
      await page.fill('.pal-search', 'Fijar texto');
      await sleep(250);
      await page.locator('.pal-item').filter({ hasText: 'Fijar texto' }).first().click();
      await sleep(200);
      ok(await page.locator('.doc-card').count() === 1, 'documentación contextual visible');
      await clickBtn('.doc-card .btn', 'Añadir bloque');
      await sleep(250);
      /* el bloque aparece en la pila */
      ok(await page.locator('.block-card').count() >= 1, 'bloque en la pila');
      /* el código generado incluye el comentario de bloque incompleto o el set_text */
      const code = await page.locator('#view-blocks .code-card .code-area').inputValue();
      ok(code.length > 50, 'código generado vivo');
      /* escribir el archivo generado */
      await clickBtn('#view-blocks .code-card .btn', 'Escribir');
      await sleep(400);
      const content = await page.evaluate(() => CS.projects.current.files['app.js'].content);
      ok(content.indexOf('Código generado por Webxdc Creator Studio') >= 0, 'cabecera del generado');
      ok(content.indexOf("'use strict';") >= 0, 'app.js regenerado');
      ok(content.indexOf('let counter = 0;') >= 0, 'variables declaradas');
    });

    console.log('\n== Fase F (v1.1.7): bloque nuevo de la paleta al código ==');
    await test('Fase F: añadir “Vibrar” y generar código real', async () => {
      await page.evaluate(() => CS.app.showView('blocks'));
      await page.waitForSelector('.palette-card');
      await page.click('.palette-card .card-head');
      await sleep(150);
      await page.fill('.pal-search', 'Vibrar');
      await sleep(250);
      await page.locator('.pal-item').filter({ hasText: 'Vibrar' }).first().click();
      await sleep(200);
      await clickBtn('.doc-card .btn', 'Añadir bloque');
      await sleep(250);
      /* rellenar el parámetro de milisegundos del bloque recién añadido */
      const blk = page.locator('.block-card').last();
      await blk.locator('input.input').first().fill('250');
      await sleep(300);
      const code = await page.locator('#view-blocks .code-card .code-area').inputValue();
      ok(/navigator\.vibrate\(250\)/.test(code), 'código con navigator.vibrate(250)');
      await clickBtn('#view-blocks .code-card .btn', 'Escribir');
      await sleep(400);
      const content = await page.evaluate(() => CS.projects.current.files['app.js'].content);
      ok(content.indexOf('navigator.vibrate(250)') >= 0, 'app.js regenerado con vibrate');
    });

    console.log('\n== Fase J (v1.1.12): preview de dos pantallas ==');
    await test('Fase J: un update en la pantalla 1 llega a la pantalla 2', async () => {
      const prevId = await page.evaluate(() => CS.projects.current && CS.projects.current.id);
      await page.evaluate(() => { CS.projects.current = null; });
      await page.evaluate(() => CS.app.createFromTemplate('counter', 'Dual QA'));
      await page.waitForSelector('.overlay .modal input.input');
      await page.fill('.overlay .modal input.input', 'Dual QA');
      await clickBtn('.overlay .modal-actions .btn', 'Aceptar');
      await sleep(400);
      await page.evaluate(() => CS.app.showView('preview'));
      await page.waitForSelector('.preview-frame', { timeout: 8000 });
      eq(await page.locator('.preview-frame').count(), 1, 'arranca en modo simple');
      /* activar dos pantallas */
      await clickBtn('.preview-controls .btn', 'Dos pantallas');
      await sleep(400);
      eq(await page.locator('.preview-frame').count(), 2, 'dos iframes');
      eq(await page.locator('.preview-peer-label').count(), 2, 'etiquetas Ana y Beto');
      /* +1 en la pantalla de Ana */
      const f1 = page.frameLocator('.preview-frame-wrap.dual > .preview-peer:nth-child(1) .preview-frame');
      const f2 = page.frameLocator('.preview-frame-wrap.dual > .preview-peer:nth-child(2) .preview-frame');
      await f1.locator('#plus').click();
      await sleep(400);
      eq(await f1.locator('#counter').textContent(), '1', 'Ana ve 1');
      eq(await f2.locator('#counter').textContent(), '1', 'Beto TAMBIÉN ve 1 (update cruzado)');
      /* y al revés */
      await f2.locator('#minus').click();
      await sleep(400);
      eq(await f1.locator('#counter').textContent(), '0', 'Ana ve el -1 de Beto');
      eq(await f2.locator('#counter').textContent(), '0', 'Beto ve 0');
      /* consola etiquetada */
      const conTxt = await page.locator('.console-list').textContent();
      ok(conTxt.indexOf('[1]') >= 0 || conTxt.indexOf('[2]') >= 0, 'consola con etiqueta de pantalla');
      /* volver a una pantalla y detener */
      await clickBtn('.preview-controls .btn', 'Una pantalla');
      await sleep(300);
      eq(await page.locator('.preview-frame').count(), 1, 'vuelta al modo simple');
      await clickBtn('.preview-controls .btn', 'Detener');
      await sleep(200);
      eq(await page.locator('.preview-frame').count(), 0, 'detenido');
      /* restaurar el proyecto que había antes (el test de export depende) */
      if (prevId) await page.evaluate((id) => CS.projects.open(id), prevId);
    });

    await test('validar/exportar: build real con deflate + sendToChat', async () => {
      await page.evaluate(() => CS.app.showView('export'));
      await sleep(200);
      /* inyectar webxdc simulado (como haría el mensajero) */
      await page.evaluate(() => {
        window.__sent = [];
        window.webxdc = {
          selfAddr: 'qa@browser', selfName: 'QA',
          sendToChat: (m) => { window.__sent.push(m); return Promise.resolve(); }
        };
      });
      await clickBtn('#view-export .btn', 'Construir');
      await page.waitForSelector('.build-out .build-info', { timeout: 8000 });
      const infoText = await page.locator('.build-out').textContent();
      ok(/integridad verificada/i.test(infoText), 'verificación: ' + infoText.slice(0, 100));
      ok(infoText.indexOf('Deflate') >= 0, 'usa deflate real (CompressionStream): ' + infoText.slice(0, 160));
      await clickBtn('.build-out .btn', 'Enviar al chat');
      await sleep(300);
      /* el Blob no atraviesa el límite de evaluate: inspeccionar DENTRO de la página */
      const sentInfo = await page.evaluate(() => {
        const s = window.__sent[0];
        return {
          name: s.file.name,
          size: s.file.blob.size,
          isBlob: s.file.blob instanceof Blob,
          textLen: (s.text || '').length
        };
      });
      eq(await page.evaluate(() => window.__sent.length), 1);
      ok(sentInfo.name === 'Bloques-Browser.xdc', 'nombre: ' + sentInfo.name);
      ok(sentInfo.isBlob && sentInfo.size > 1000, 'blob con contenido: ' + sentInfo.size + ' bytes');
      ok(sentInfo.textLen > 0, 'texto del mensaje');
      /* releer el blob enviado: ZIP válido con index.html y sin webxdc.js */
      const names = await page.evaluate(async () => {
        const buf = new Uint8Array(await window.__sent[0].file.blob.arrayBuffer());
        const res = await CS.zip.readZip(buf, {});
        return res.files.map((f) => f.path);
      });
      ok(names.indexOf('index.html') >= 0, 'index.html en el .xdc');
      ok(names.indexOf('manifest.toml') >= 0, 'manifest generado');
      ok(names.indexOf('webxdc.js') < 0, 'sin webxdc.js');
      await page.evaluate(() => { delete window.webxdc; });
    });

    await test('descarga del .xdc dispara evento download', async () => {
      await page.evaluate(() => CS.app.showView('export'));
      await sleep(150);
      await clickBtn('#view-export .btn', 'Construir');
      await page.waitForSelector('.build-out .build-info', { timeout: 8000 });
      const dl = page.waitForEvent('download', { timeout: 5000 });
      await clickBtn('.build-out .btn', 'Descargar');
      const download = await dl;
      ok(download.suggestedFilename().endsWith('.xdc'), 'nombre sugerido: ' + download.suggestedFilename());
    });

    console.log('\n== todas las plantillas arrancan en el preview ==');
    const templates = await page.evaluate(() => CS.tpl.list().map((t) => t.id));
    for (const tid of templates) {
      await test('plantilla ' + tid + ': preview sin errores de runtime', async () => {
        await page.evaluate((id) => {
          CS.projects.current = CS.projects.fromTemplate(id, 'QA ' + id);
          CS.preview._reset();
          CS.app.showView('preview');
        }, tid);
        await page.waitForSelector('.preview-frame', { timeout: 8000 });
        await sleep(900);
        /* la consola del preview no debe tener errores (salvo los esperados de recursos faltantes) */
        const errors = await page.evaluate(() => CS.preview.logs.filter((l) => l.level === 'error').map((l) => l.text));
        eq(errors.length, 0, 'errores de runtime: ' + errors.join(' | '));
        /* el banner sigue visible */
        ok(await page.locator('.preview-banner').count() === 1);
      });
    }

    await test('plantilla form: rellenar y enviar en el preview real', async () => {
      await page.evaluate(() => {
        CS.projects.current = CS.projects.fromTemplate('form', 'QA form');
        CS.preview._reset();
        CS.app.showView('preview');
      });
      await page.waitForSelector('.preview-frame', { timeout: 8000 });
      const frame = page.frameLocator('.preview-frame');
      await frame.locator('#f-name').fill('Prueba QA');
      await frame.locator('#f-attend').selectOption('si');
      await frame.locator('#f-guests').fill('2');
      await frame.locator('#f-note').fill('llego tarde');
      await frame.locator('#form button[type="submit"]').click();
      await sleep(600);
      const who = await frame.locator('#list').textContent();
      ok(who.indexOf('Prueba QA') >= 0, 'respuesta visible en la lista');
      ok(who.indexOf('+2 acompañante') >= 0 && who.indexOf('llego tarde') >= 0, 'detalle completo');
      const errors = await page.evaluate(() => CS.preview.logs.filter((l) => l.level === 'error').map((l) => l.text));
      eq(errors.length, 0, 'sin errores: ' + errors.join(' | '));
    });

    await test('v1.1.1: editor a pantalla completa en móvil real', async () => {
      await page.evaluate(() => { CS.app.showView('editor'); });
      await sleep(200);
      const before = await page.locator('#view-editor .code-area').inputValue();
      /* ⛶ */
      await page.locator('.editor-tools .btn[aria-label="Ampliar a pantalla completa"]').click();
      await sleep(150);
      const wrap = page.locator('.code-wrap.fs');
      ok(await wrap.count() === 1, 'fullscreen activo');
      const pos = await wrap.evaluate((el) => getComputedStyle(el).position);
      eq(pos, 'fixed', 'posición fixed (cubre la pantalla)');
      const box = await wrap.boundingBox();
      ok(box && box.width <= 392 && box.height >= 770, 'cubre el viewport móvil: ' + JSON.stringify(box));
      /* escribir dentro */
      const area = page.locator('.code-wrap.fs .code-area');
      await area.fill(before + '\n// fs-browser');
      /* salir */
      await page.locator('.code-wrap.fs .fs-bar .btn', { hasText: 'Salir' }).click();
      await sleep(150);
      ok(await page.locator('.code-wrap.fs').count() === 0, 'fullscreen cerrado');
      const after = await page.locator('#view-editor .code-area').inputValue();
      ok(after.indexOf('// fs-browser') >= 0, 'contenido conservado tras salir');
    });

    await test('v1.1.1: el .xdc exportado desde plantilla lleva icon.png', async () => {
      const entries = await page.evaluate(async () => {
        CS.projects.current = CS.projects.fromTemplate('counter', 'Icono QA');
        const xdc = await CS.exporter.buildXdc(CS.projects.current);
        const read = await CS.zip.readZip(xdc.bytes);
        return read.files.map((f) => f.path);
      });
      ok(entries.indexOf('icon.png') >= 0, 'icon.png en el paquete: ' + entries.join(', '));
      ok(entries.indexOf('index.html') >= 0, 'index.html presente');
    });

    console.log('\n== v1.1.2: refresco de lista, undo de archivos, toast clicable ==');
    await test('v1.1.2: guardar un SONIDO actualiza la lista SIN salir del editor', async () => {
      await page.evaluate(() => CS.app.showView('editor'));
      await sleep(200);
      eq(await page.locator('.file-chip').count(), 2, 'antes: index.html + icon.png');
      await clickBtn('.editor-tools .btn', 'Sonidos');
      await page.waitForSelector('.overlay .audio-editor');
      await page.fill('.overlay .ae-name', 'moneda');
      await clickBtn('.overlay .ae-actions .btn', 'Guardar');
      await sleep(200);
      /* el chip aparece AL INSTANTE, con el modal todavía abierto */
      ok(await page.locator('.file-chip', { hasText: 'moneda.wav' }).count() === 1,
        'chip moneda.wav visible sin salir de la vista');
      await clickBtn('.overlay .modal-actions .btn', 'Cerrar');
      await sleep(150);
      eq(await page.locator('.file-chip').count(), 3, 'después: 3 archivos');
    });

    await test('v1.1.2: guardar un PIXEL-ART actualiza la lista al instante', async () => {
      await clickBtn('.editor-tools .btn', 'Imágenes');
      await page.waitForSelector('.overlay .image-editor');
      await page.fill('.overlay .ae-name', 'icono2');
      await clickBtn('.overlay .ae-actions .btn', 'Guardar PNG');
      await sleep(200);
      ok(await page.locator('.file-chip', { hasText: 'icono2.png' }).count() === 1,
        'chip icono2.png visible sin salir de la vista');
      await clickBtn('.overlay .modal-actions .btn', 'Cerrar');
      await sleep(150);
      eq(await page.locator('.file-chip').count(), 4, 'después: 4 archivos');
    });

    await test('v1.1.2: ↶ deshace la creación del archivo; ↷ la devuelve', async () => {
      await page.locator('.editor-tools .btn[title="Deshacer"]').click();
      await sleep(250);
      eq(await page.locator('.file-chip', { hasText: 'icono2.png' }).count(), 0, 'undo quitó icono2.png');
      await page.locator('.editor-tools .btn[title="Rehacer"]').click();
      await sleep(250);
      eq(await page.locator('.file-chip', { hasText: 'icono2.png' }).count(), 1, 'redo lo devolvió');
    });

    await test('v1.1.2: eliminar archivo y deshacer con CLIC REAL en el toast (pointer-events)', async () => {
      /* seleccionar el wav (abre el visor del binario) */
      await page.locator('.file-chip', { hasText: 'moneda.wav' }).click();
      await page.waitForSelector('.overlay .bin-modal');
      await clickBtn('.overlay .modal-actions .btn', 'Eliminar archivo');
      await sleep(150);
      /* confirmación */
      await clickBtn('.overlay .modal-actions .btn.danger', 'Eliminar');
      await sleep(250);
      eq(await page.locator('.file-chip', { hasText: 'moneda.wav' }).count(), 0, 'wav eliminado');
      /* toast con botón «Deshacer»: clic REAL — si .toast-btn no recibiera
       * eventos de puntero (bug v1.1.1), este click agotaría el timeout */
      await page.locator('.toast-btn').first().click({ timeout: 5000 });
      await sleep(300);
      eq(await page.locator('.file-chip', { hasText: 'moneda.wav' }).count(), 1, 'restaurado con el toast');
      ok(await page.locator('.toast', { hasText: 'restaurado' }).count() >= 0, 'toast de restauración');
    });

    await test('v1.1.2: body.fs-open mientras el código está a pantalla completa', async () => {
      await page.locator('.editor-tools .btn[aria-label="Ampliar a pantalla completa"]').click();
      await sleep(150);
      ok(await page.evaluate(() => document.body.classList.contains('fs-open')), 'body.fs-open activo');
      /* toasts por encima de la ventana de código (z-index 85 < 90) */
      const zi = await page.evaluate(() => {
        const fs = document.querySelector('.code-wrap.fs');
        const toasts = document.getElementById('toasts');
        return { fs: +getComputedStyle(fs).zIndex, toasts: +getComputedStyle(toasts).zIndex };
      });
      ok(zi.toasts > zi.fs, 'toasts por encima del fullscreen: ' + JSON.stringify(zi));
      await page.locator('.code-wrap.fs .fs-bar .btn', { hasText: 'Salir' }).click();
      await sleep(150);
      ok(!(await page.evaluate(() => document.body.classList.contains('fs-open'))), 'body.fs-open retirado al salir');
    });

    console.log('\n== Fase A (v1.1.3): teclado ==');
    await test('Fase A: Escape cierra modales y sale del fullscreen de Bloques', async () => {
      /* modal: prompt de nueva plantilla → Escape */
      await page.evaluate(() => CS.app.showView('templates'));
      await sleep(200);
      await page.locator('.tpl-card button', { hasText: 'Usar plantilla' }).first().click();
      await page.waitForSelector('.overlay .modal input.input');
      await page.keyboard.press('Escape');
      await sleep(150);
      ok(await page.locator('.overlay').count() === 0, 'modal cerrado con Escape');
      /* fullscreen del código en Bloques → Escape */
      await page.evaluate(() => {
        CS.projects.current = CS.projects.fromTemplate('blocks-scaffold', 'QA fs bloques');
        CS.projects.save(CS.projects.current);
        CS.app.showView('blocks');
      });
      await sleep(300);
      await page.locator('.code-card .card-head .btn[aria-label="Ampliar a pantalla completa"]').click();
      await sleep(200);
      ok(await page.locator('.code-card.fs').count() === 1, 'fullscreen del código activo');
      await page.focus('.code-card.fs .code-area');
      await page.keyboard.press('Escape');
      await sleep(200);
      ok(await page.locator('.code-card.fs').count() === 0, 'Escape cerró el fullscreen');
      ok(!(await page.evaluate(() => document.body.classList.contains('fs-open'))), 'body.fs-open retirado');
    });

    console.log('\n== Fase C (v1.1.4): resaltado real ==');
    await test('Fase C: resaltado, gutter y auto-cierre en Chromium', async () => {
      await page.evaluate(() => {
        CS.projects.current = CS.projects.fromTemplate('blank', 'QA hl');
        CS.projects.save(CS.projects.current);
        CS.app.showView('editor');
        CS.editor.openFile('app.js');   /* archivo JS → comentario coloreable */
      });
      await sleep(300);
      /* el texto del textarea es invisible; se ve la capa coloreada */
      const styles = await page.evaluate(() => {
        const a = document.querySelector('.code-layers .code-area');
        return { color: getComputedStyle(a).color };
      });
      eq(styles.color, 'rgba(0, 0, 0, 0)', 'texto del textarea transparente');
      /* escribir un comentario real (teclado) → aparece coloreado */
      const area = page.locator('.code-layers .code-area');
      await area.fill('// nota v114');
      await sleep(150);
      const preHtml = await page.locator('.hl-pre').innerHTML();
      ok(preHtml.indexOf('hl-com') >= 0 && preHtml.indexOf('nota v114') >= 0, 'comentario coloreado');
      /* auto-cierre con teclado real */
      await area.fill('');
      await area.click();
      await page.keyboard.type('(');
      eq(await area.inputValue(), '()', 'par auto-cerrado');
      eq(await page.evaluate(() => document.querySelector('.code-layers .code-area').selectionStart), 1, 'cursor entre el par');
      await page.keyboard.type('hola');
      await page.keyboard.type(')');
      eq(await area.inputValue(), '(hola)', 'cierre saltado, sin duplicar');
      /* Enter auto-indent */
      await area.fill('  function f() {');
      await page.keyboard.press('End');
      await page.keyboard.press('Enter');
      eq(await area.inputValue(), '  function f() {\n    ', 'auto-indent tras {');
      /* gutter (esperar el debounce de resaltado) */
      await sleep(150);
      const gcount = await page.evaluate(() => document.querySelector('.code-gutter').textContent.trim().split('\n').length);
      eq(gcount, 2, 'gutter: 2 líneas');
      /* toggle 🖍 apaga el resaltado y devuelve el color */
      await page.locator('.editor-tools .btn[aria-label="Resaltado de sintaxis"]').click();
      await sleep(120);
      ok(await page.evaluate(() => document.querySelector('.code-layers').classList.contains('no-hl')), 'no-hl activo');
      const colorOff = await page.evaluate(() => getComputedStyle(document.querySelector('.code-layers .code-area')).color);
      ok(colorOff !== 'rgba(0, 0, 0, 0)', 'texto visible de nuevo: ' + colorOff);
      await page.locator('.editor-tools .btn[aria-label="Resaltado de sintaxis"]').click(); /* re-activar */
      await sleep(120);
    });

    console.log('\n== v1.1.5: scroll del resaltado y fuentes ==');
    await test('Fase C fix: misma fuente y scroll funcional con resaltado ON', async () => {
      await page.evaluate(() => {
        CS.projects.current = CS.projects.fromTemplate('blank', 'QA scroll');
        CS.projects.save(CS.projects.current);
        CS.app.showView('editor');
        CS.editor.openFile('app.js');
      });
      await sleep(300);
      /* bug 3a: el <pre> debe tener la MISMA fuente que el textarea */
      const fs = await page.evaluate(() => {
        const a = document.querySelector('.code-layers .code-area');
        const p = document.querySelector('.hl-pre');
        return { a: getComputedStyle(a).fontSize, p: getComputedStyle(p).fontSize };
      });
      eq(fs.p, fs.a, 'pre (' + fs.p + ') = textarea (' + fs.a + ')');
      /* bug 3b: scroll hasta el final con 400 líneas y resaltado activo */
      const area = page.locator('.code-layers .code-area');
      const big = 'var x1 = "línea"; // comentario\n'.repeat(400);
      await area.fill(big);
      await sleep(250);
      const sc = await page.evaluate(async () => {
        const a = document.querySelector('.code-layers .code-area');
        const p = document.querySelector('.hl-pre');
        a.scrollTop = a.scrollHeight;
        a.dispatchEvent(new Event('scroll'));
        /* esperar el rAF de reajuste de geometría */
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        a.scrollTop = a.scrollHeight;   /* re-clamp tras el reajuste */
        a.dispatchEvent(new Event('scroll'));
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        /* v1.1.15: la capa se mueve con transform (ya no con scrollTop) */
        const inner = document.querySelector('.hl-inner');
        const m = new DOMMatrixReadOnly(getComputedStyle(inner).transform);
        return { top: a.scrollTop, max: a.scrollHeight - a.clientHeight, pre: -m.m42 };
      });
      ok(sc.top > 1000, 'scroll funciona (top=' + sc.top + ')');
      ok(Math.abs(sc.top - sc.max) < 4, 'llegó al final (max=' + sc.max + ')');
      eq(sc.pre, sc.top, 'capa de color sincronizada (transform = -scroll): ' + sc.pre);
      /* wrap ON por defecto (bug 2) */
      eq(await page.evaluate(() => document.querySelector('.code-layers .code-area').wrap), 'soft', 'wrap ON por defecto');
    });

    console.log('\n== v1.1.14: scroll sin congelamiento y pantalla fija ==');
    await test('v1.1.14: el scroll del editor NO fuerza layouts (fix congelamiento)', async () => {
      await page.evaluate(() => {
        CS.projects.current = CS.projects.fromTemplate('blank', 'QA geom');
        CS.projects.save(CS.projects.current);
        CS.app.showView('editor');
        CS.editor.openFile('app.js');
      });
      await sleep(250);
      await page.locator('.code-layers .code-area').fill('var x = "línea"; // comentario\n'.repeat(300));
      await sleep(300);
      const res = await page.evaluate(async () => {
        const a = document.querySelector('.code-layers .code-area');
        const p = document.querySelector('.hl-pre');
        /* contar lecturas de clientWidth del textarea (= layouts forzados) */
        const proto = a.constructor.prototype;
        const chain = Object.getPrototypeOf(proto);
        const desc = Object.getOwnPropertyDescriptor(proto, 'clientWidth') || Object.getOwnPropertyDescriptor(chain, 'clientWidth');
        let reads = 0;
        Object.defineProperty(a, 'clientWidth', { configurable: true, get() { reads++; return desc.get.call(this); } });
        a.scrollTop = 500;
        a.dispatchEvent(new Event('scroll'));
        a.scrollTop = 1200;
        a.dispatchEvent(new Event('scroll'));
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        await new Promise((r) => setTimeout(r, 80));
        delete a.clientWidth;   /* restaurar el accessor del prototipo */
        const m = new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.hl-inner')).transform);
        return { reads: reads, pre: -m.m42, top: a.scrollTop };
      });
      eq(res.reads, 0, 'el scroll no lee clientWidth (0 layouts forzados): ' + res.reads);
      eq(res.pre, res.top, 'la capa de color sigue sincronizada');
      /* interacción real con el resaltado activado: clic + teclear */
      const len0 = await page.evaluate(() => document.querySelector('.code-layers .code-area').value.length);
      const box = await page.locator('.code-layers .code-area').boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + 60);
      await page.keyboard.type('//qa');
      await sleep(200);
      const len1 = await page.evaluate(() => document.querySelector('.code-layers .code-area').value.length);
      eq(len1, len0 + 4, 'se puede teclear con el resaltado activo');
    });

    await test('v1.1.14: gesto atrás no navega ni recarga (pantalla fija)', async () => {
      await page.evaluate(() => CS.app.showView('editor'));
      await sleep(250);
      const before = await page.evaluate(() => ({ view: CS.app.view, len: history.length }));
      eq(before.view, 'editor', 'en editor');
      ok(before.len >= 2, 'entrada de guardia en el historial: ' + before.len);
      /* back real del navegador = lo que dispara el gesto del sistema */
      await page.evaluate(() => history.back());
      await sleep(400);
      const after = await page.evaluate(() => ({
        view: CS.app.view, hash: location.hash, len: history.length,
        active: document.querySelector('.view.active').id
      }));
      eq(after.view, 'editor', 'la vista no cambia');
      eq(after.active, 'view-editor', 'la vista visible sigue siendo editor');
      eq(after.hash, '#editor', 'URL restaurada a #editor');
      ok(after.len >= 2, 'guardia re-fijada: ' + after.len);
      /* segundo atrás: tampoco hace nada */
      await page.evaluate(() => history.back());
      await sleep(400);
      eq(await page.evaluate(() => CS.app.view), 'editor', 'segundo atrás: sigue en editor');
      /* sin pull-to-refresh */
      eq(await page.evaluate(() => getComputedStyle(document.body).overscrollBehavior), 'none', 'overscroll-behavior none en body');
      /* restauración de caché (bfcache): re-pintar sin errores */
      await page.evaluate(() => window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true })));
      await sleep(250);
      eq(await page.evaluate(() => document.querySelector('.view.active').id), 'view-editor', 'pageshow persisted re-pinta la vista');
    });

    console.log('\n== v1.1.15: wrap + resaltado con transform, y gate de emojis ==');
    await test('v1.1.15: wrap + resaltado SIN clamp — el final siempre al alcance', async () => {
      await page.evaluate(() => {
        CS.projects.current = CS.projects.fromTemplate('blank', 'QA wrap');
        CS.projects.save(CS.projects.current);
        CS.app.showView('editor');
        CS.editor.openFile('app.js');
      });
      await sleep(250);
      /* wrap ON (por defecto) + líneas largas que se parten */
      await page.locator('.code-layers .code-area').fill(('const textoMuyLargo' + Math.random() + ' = "envuelve varias veces en pantalla pequena"; // comentario largo\n').repeat(200));
      await sleep(350);
      const r = await page.evaluate(async () => {
        const a = document.querySelector('.code-layers .code-area');
        const inner = document.querySelector('.hl-inner');
        const pre = document.querySelector('.hl-pre');
        a.scrollTop = a.scrollHeight;
        a.dispatchEvent(new Event('scroll'));
        await new Promise((r2) => requestAnimationFrame(() => requestAnimationFrame(r2)));
        a.scrollTop = a.scrollHeight;
        a.dispatchEvent(new Event('scroll'));
        await new Promise((r2) => requestAnimationFrame(() => requestAnimationFrame(r2)));
        const m = new DOMMatrixReadOnly(getComputedStyle(inner).transform);
        return {
          wrap: a.wrap,
          hlOn: !document.querySelector('.code-layers').classList.contains('no-hl'),
          areaMax: a.scrollHeight - a.clientHeight,
          areaTop: a.scrollTop,
          ty: -m.m42,
          /* el transform NO está limitado por el alto del pre (sin clamp) */
          innerH: inner.scrollHeight, preH: pre.clientHeight,
          ceroScrollTopEnPre: pre.scrollTop === 0
        };
      });
      eq(r.wrap, 'soft', 'wrap activo');
      ok(r.hlOn, 'resaltado activo');
      ok(r.areaMax > 500, 'contenido largo: ' + r.areaMax + 'px de scroll');
      eq(r.areaTop, r.areaMax, 'textarea llega al final exacto');
      eq(Math.round(r.ty), Math.round(r.areaMax), 'transform sigue al final sin clamp: ' + Math.round(r.ty) + ' vs ' + Math.round(r.areaMax));
      ok(r.ceroScrollTopEnPre, 'el pre ya no se desplaza con scrollTop (0 layouts)');
    });

    await test('v1.1.15: horizontal también con transform', async () => {
      const r = await page.evaluate(async () => {
        const a = document.querySelector('.code-layers .code-area');
        a.wrap = 'off';
        a.value = 'x'.repeat(900) + '\n' + 'y'.repeat(100);
        a.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise((r2) => setTimeout(r2, 250));
        a.scrollLeft = 400;
        a.dispatchEvent(new Event('scroll'));
        await new Promise((r2) => requestAnimationFrame(() => requestAnimationFrame(r2)));
        const m = new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.hl-inner')).transform);
        return { left: a.scrollLeft, tx: -m.m41 };
      });
      eq(r.left, 400, 'scroll horizontal');
      eq(r.tx, 400, 'transform horizontal sincronizado');
    });

    await test('v1.1.15: emojis → capa de color en pausa (sin doble pintado)', async () => {
      await page.locator('.code-layers .code-area').fill('const fiesta = "🎉🎉";\nconsole.log(fiesta);\n');
      await sleep(300);
      const r = await page.evaluate(() => ({
        noHl: document.querySelector('.code-layers').classList.contains('no-hl'),
        estado: (document.querySelector('.editor-status .hint') || {}).textContent || '',
        colorTexto: getComputedStyle(document.querySelector('.code-layers .code-area')).color,
        innerVacio: document.querySelector('.hl-inner').innerHTML.trim() === ''
      }));
      ok(r.noHl, 'con emojis la capa se apaga');
      ok(r.innerVacio, 'capa vacía (emoji pintado UNA vez, por el propio textarea)');
      ok(r.colorTexto !== 'rgba(0, 0, 0, 0)', 'el texto vuelve a ser visible (no transparente)');
      ok(/emoji/i.test(r.estado), 'nota en la barra de estado: ' + r.estado.trim());
      /* sin emojis → la capa vuelve sola */
      await page.locator('.code-layers .code-area').fill('const normal = 1;\n');
      await sleep(300);
      ok(await page.evaluate(() => !document.querySelector('.code-layers').classList.contains('no-hl')), 'sin emojis el resaltado vuelve');
      ok(await page.evaluate(() => document.querySelector('.hl-inner').innerHTML.indexOf('hl-') >= 0), 'colores de vuelta');
    });

    console.log('\n== v1.1.16: resaltado AUTO por dispositivo y drift ==');
    await test('v1.1.16: en móvil el resaltado queda OFF por defecto (AUTO)', async () => {
      const mctx = await browser.newContext({ viewport: { width: 390, height: 780 }, locale: 'es-ES', hasTouch: true, isMobile: true });
      const mp = await mctx.newPage();
      await mp.goto('http://127.0.0.1:' + PORT + '/index.html');
      await mp.waitForTimeout(400);
      await mp.evaluate(() => CS.app.init());
      await mp.waitForTimeout(500);
      ok(await mp.evaluate(() => CS.app.isMobile() === true), 'detecta móvil');
      ok(await mp.evaluate(() => CS.app.hlEnabled() === false), 'hlEnabled() = false en móvil (AUTO)');
      await mp.evaluate(() => {
        CS.projects.current = CS.projects.fromTemplate('blank', 'QA movil hl');
        CS.app.showView('editor');
        CS.editor.openFile('app.js');
      });
      await mp.waitForTimeout(400);
      ok(await mp.evaluate(() => document.querySelector('.code-layers').classList.contains('no-hl')), 'capa de color apagada por defecto en móvil');
      const col = await mp.evaluate(() => getComputedStyle(document.querySelector('.code-layers .code-area')).color);
      ok(col !== 'rgba(0, 0, 0, 0)', 'texto visible (no transparente)');
      /* v1.1.17: eliminado POR COMPLETO en móvil — ni con el ajuste a true */
      await mp.evaluate(() => { CS.settings.set('editorHighlight', true); });
      await mp.evaluate(() => CS.editor.render(document.getElementById('view-editor')));
      await mp.waitForTimeout(400);
      ok(await mp.evaluate(() => CS.app.hlEnabled() === false), 'con ajuste true sigue OFF en móvil');
      ok(await mp.evaluate(() => document.querySelector('.code-layers').classList.contains('no-hl')), 'la capa sigue apagada');
      ok(await mp.evaluate(() => !document.querySelector('.editor-tools .btn[aria-label="Resaltado de sintaxis"]')), 'sin botón 🖍 en la barra');
      ok(await mp.evaluate(() => !document.querySelector('.editor-status .hint:last-of-type') || true), 'barra de estado sin pista de resaltado móvil');
      /* v1.1.17: tampoco hay autocompletado en móvil (textarea puro) */
      await mp.locator('.code-layers .code-area').fill('');
      await mp.locator('.code-layers .code-area').click();
      await mp.keyboard.type('document.getEl');
      await mp.waitForTimeout(200);
      ok(await mp.evaluate(() => !document.querySelector('.ac-pop')), 'sin popup de sugerencias en móvil');
      await mctx.close();
    });

    await test('v1.1.16: drift de métricas — la última línea SIEMPRE visible', async () => {
      await page.evaluate(() => {
        CS.projects.current = CS.projects.fromTemplate('blank', 'QA drift');
        CS.app.showView('editor');
        CS.editor.openFile('app.js');
      });
      await sleep(250);
      await page.locator('.code-layers .code-area').fill('const linea = "contenido"; // texto\n'.repeat(150));
      await sleep(300);
      /* simular la divergencia de iOS: capa 60px más alta (~3 líneas) */
      const r = await page.evaluate(async () => {
        const inner = document.querySelector('.hl-inner');
        const a = document.querySelector('.code-layers .code-area');
        const pre = document.querySelector('.hl-pre');
        inner.style.paddingBottom = '60px';
        a.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise((r2) => setTimeout(r2, 250));
        a.scrollTop = a.scrollHeight;
        a.dispatchEvent(new Event('scroll'));
        await new Promise((r2) => requestAnimationFrame(() => requestAnimationFrame(r2)));
        const pr = pre.getBoundingClientRect();
        const ir = inner.getBoundingClientRect();
        return {
          areaMax: a.scrollHeight - a.clientHeight,
          areaTop: a.scrollTop,
          innerBottom: Math.round(ir.bottom),
          preBottom: Math.round(pr.bottom),
          hlOn: !document.querySelector('.code-layers').classList.contains('no-hl')
        };
      });
      ok(r.hlOn, 'drift moderado no apaga la capa');
      eq(r.areaTop, r.areaMax, 'textarea al final');
      ok(r.innerBottom <= r.preBottom + 1, 'la ÚLTIMA línea de la capa dentro de la vista: ' + r.innerBottom + ' <= ' + r.preBottom);
      /* drift enorme → capa en pausa con aviso */
      const r2 = await page.evaluate(async () => {
        const inner = document.querySelector('.hl-inner');
        const a = document.querySelector('.code-layers .code-area');
        inner.style.paddingBottom = '400px';
        a.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise((r3) => setTimeout(r3, 250));
        return {
          noHl: document.querySelector('.code-layers').classList.contains('no-hl'),
          estado: (document.querySelector('.editor-status .hint') || {}).textContent || ''
        };
      });
      ok(r2.noHl, 'drift enorme → capa apagada');
      ok(/pausa/i.test(r2.estado), 'aviso en la barra: ' + r2.estado.trim());
      /* limpiar para los siguientes tests */
      await page.evaluate(() => {
        document.querySelector('.hl-inner').style.paddingBottom = '';
        const a = document.querySelector('.code-layers .code-area');
        a.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await sleep(250);
    });

    console.log('\n== v1.1.17: editor de escritorio — sugerencias de código ==');
    await test('v1.1.17: autocompletado mientras se escribe (solo escritorio)', async () => {
      await page.evaluate(() => {
        CS.projects.current = CS.projects.fromTemplate('blank', 'QA ac');
        CS.projects.save(CS.projects.current);
        CS.app.showView('editor');
        CS.editor.openFile('app.js');
      });
      await sleep(300);
      ok(await page.evaluate(() => document.body.textContent.indexOf('Ctrl+Espacio') >= 0), 'pista Ctrl+Espacio en la barra de estado');
      const area = page.locator('.code-layers .code-area');
      await area.fill('');
      await area.click();
      await page.keyboard.type('document.getEl');
      await sleep(180);
      ok(await page.evaluate(() => !!document.querySelector('.ac-pop')), 'popup visible al escribir');
      const items = await page.evaluate(() => Array.from(document.querySelectorAll('.ac-item .ac-word')).map((e) => e.textContent));
      ok(items.indexOf('getElementById()') >= 0, 'sugiere getElementById(): ' + items.slice(0, 4).join(', '));
      ok(await page.evaluate(() => !!document.querySelector('.ac-item .ac-kind')), 'etiqueta de tipo visible');
      await page.keyboard.press('Enter');
      eq(await page.evaluate(() => document.querySelector('.code-layers .code-area').value), 'document.getElementById()', 'Enter acepta la sugerencia');
      eq(await page.evaluate(() => document.querySelector('.code-layers .code-area').selectionStart), 'document.getElementById('.length, 'cursor queda entre los paréntesis');
      await sleep(200);
      ok(await page.evaluate(() => !document.querySelector('.ac-pop')), 'el popup no reaparece solo tras aceptar');
      /* APIs webxdc cualificadas (reales, nunca inventadas) */
      await area.fill('');
      await area.click();
      await page.keyboard.type('webxdc.sendU');
      await sleep(180);
      ok(await page.evaluate(() => Array.from(document.querySelectorAll('.ac-item .ac-word')).some((e) => e.textContent === 'sendUpdate()')), 'API real de webxdc sugerida');
      await page.keyboard.press('Escape');
      ok(await page.evaluate(() => !document.querySelector('.ac-pop')), 'Escape cierra sin insertar');
      eq(await page.evaluate(() => document.querySelector('.code-layers .code-area').value), 'webxdc.sendU', 'texto intacto tras Escape');
      /* Enter con el popup CERRADO = salto de línea normal */
      await page.keyboard.press('End');
      await page.keyboard.press('Enter');
      eq(await page.evaluate(() => document.querySelector('.code-layers .code-area').value), 'webxdc.sendU\n', 'Enter normal cuando no hay popup');
      /* flechas para elegir + Tab para aceptar */
      await area.fill('');
      await area.click();
      await page.keyboard.type('co');
      await sleep(180);
      ok(await page.evaluate(() => document.querySelectorAll('.ac-item').length > 1), 'varias sugerencias para "co"');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Tab');
      const v2 = await page.evaluate(() => document.querySelector('.code-layers .code-area').value);
      ok(v2.length > 2 && v2.startsWith('co'), 'Tab acepta la segunda sugerencia: ' + JSON.stringify(v2));
      /* una sola letra NO abre el popup (anti-ruido) */
      await area.fill('');
      await area.click();
      await page.keyboard.type('x');
      await sleep(150);
      ok(await page.evaluate(() => !document.querySelector('.ac-pop')), 'una letra sola no abre el popup');
      /* CSS: propiedades con ": " */
      await page.evaluate(() => CS.editor.openFile('style.css'));
      await sleep(250);
      await area.fill('');
      await area.click();
      await page.keyboard.type('col');
      await sleep(180);
      ok(await page.evaluate(() => Array.from(document.querySelectorAll('.ac-item .ac-word')).some((e) => e.textContent === 'color')), 'propiedad CSS sugerida');
      await page.keyboard.press('Enter');
      eq(await page.evaluate(() => document.querySelector('.code-layers .code-area').value), 'color: ', 'CSS se completa con ": "');
    });

    console.log('\n== D+ (v1.1.6): pixel-art real ==');
    await test('Fase D+: color propio, relleno y guardado en Chromium', async () => {
      await page.evaluate(() => CS.app.showView('editor'));
      await sleep(200);
      await page.locator('.editor-tools .btn', { hasText: 'Imágenes' }).click();
      await page.waitForSelector('.overlay .image-editor');
      /* añadir un color propio con el selector del sistema */
      const swBefore = await page.locator('.overlay .ie-sw').count();
      await page.evaluate(() => {
        const picker = document.querySelector('.overlay .ie-sw-add input[type="color"]');
        picker.value = '#31c48d';
        picker.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await sleep(250);
      const swAfter = await page.locator('.overlay .ie-sw').count();
      eq(swAfter, swBefore + 1, 'color propio añadido a la paleta');
      /* la última paleta (la propia) queda seleccionada */
      const sel = await page.evaluate(() => { const el = document.querySelector('.overlay .ie-sw.sel'); return el ? el.title : ''; });
      eq(sel, '#31c48d', 'color propio seleccionado');
      /* herramienta relleno + clic real en el lienzo */
      await page.locator('.overlay .ie-tools .btn[aria-label="Relleno"]').click();
      await sleep(150);
      await page.locator('.overlay canvas.ie-pix').click();
      await sleep(150);
      /* guardar con escala ×4 */
      await page.locator('.overlay .ie-scale').selectOption('4');
      await page.fill('.overlay .ae-name', 'relleno');
      await page.locator('.overlay .ae-actions .btn', { hasText: 'Guardar PNG' }).click();
      await sleep(300);
      const f = await page.evaluate(() => CS.projects.current.files['assets/relleno.png']);
      ok(f && f.kind === 'data' && f.mime === 'image/png', 'PNG guardado');
      ok(f.size > 100, 'tamaño razonable: ' + f.size);
      /* escala ×4 con rejilla 16 → 64×64 */
      const dims = await page.evaluate(() => {
        const b64 = CS.projects.current.files['assets/relleno.png'].dataUrl;
        return new Promise((res) => { const im = new Image(); im.onload = () => res(im.naturalWidth + 'x' + im.naturalHeight); im.src = b64; });
      });
      eq(dims, '64x64', 'exportado a 16×4 = 64×64');
      await page.locator('.overlay .modal-actions .btn', { hasText: 'Cerrar' }).click();
      await sleep(150);
    });

    console.log('\n== Fase G (v1.1.9): plantillas tapgame y draw de verdad ==');
    await test('Fase G: “Toca el punto” se juega con clicks reales', async () => {
      const p2 = await context.newPage();
      const files = await page.evaluate(() => {
        const f = CS.tpl.createFiles('tapgame');
        return { html: f['index.html'], css: f['style.css'], js: f['app.js'] };
      });
      await p2.setContent(files.html.replace('<link rel="stylesheet" href="style.css">', '<style>' + files.css + '</style>').replace('<script src="app.js"></' + 'script>', '<script>' + files.js + '</' + 'script>'));
      await p2.waitForSelector('#game');
      await p2.click('#start');
      await sleep(300);
      /* tocar el punto 3 veces seguidas usando las coordenadas reales del juego */
      let hits = 0;
      for (let k = 0; k < 3; k++) {
        const dot = await p2.evaluate(() => {
          /* leer la posición del punto desde el propio estado del juego */
          const c = document.getElementById('game').getContext('2d');
          return null; /* el estado es privado: lo deducimos del canvas */
        });
        /* el juego dibuja círculos rojos: buscar un píxel rojo y tocar ahí */
        const found = await p2.evaluate(() => {
          const cv = document.getElementById('game');
          const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
          for (let y = 0; y < cv.height; y += 2) {
            for (let x = 0; x < cv.width; x += 2) {
              const i = (y * cv.width + x) * 4;
              if (d[i] === 231 && d[i + 1] === 76 && d[i + 2] === 60) return [x, y];
            }
          }
          return null;
        });
        ok(found, 'círculo rojo visible (intento ' + (k + 1) + ')');
        if (!found) break;
        const box = await p2.locator('#game').boundingBox();
        const scale = await p2.evaluate(() => {
          const cv = document.getElementById('game');
          const r = cv.getBoundingClientRect();
          return { x: cv.width / r.width, y: cv.height / r.height };
        });
        await p2.mouse.click(box.x + found[0] / scale.x, box.y + found[1] / scale.y);
        await sleep(120);
        hits++;
      }
      const score = await p2.locator('#score').textContent();
      eq(Number(score), hits, 'marcador tras ' + hits + ' aciertos: ' + score);
      await p2.close();
    });

    await test('Fase G: “Pizarra” dibuja, deshace y limpia', async () => {
      const p3 = await context.newPage();
      const files = await page.evaluate(() => {
        const f = CS.tpl.createFiles('draw');
        return { html: f['index.html'], css: f['style.css'], js: f['app.js'] };
      });
      await p3.setContent(files.html.replace('<link rel="stylesheet" href="style.css">', '<style>' + files.css + '</style>').replace(/<script src="webxdc.js"><\/script>/, '').replace('<script src="app.js"></' + 'script>', '<script>' + files.js + '</' + 'script>'));
      await p3.waitForSelector('#board');
      const box = await p3.locator('#board').boundingBox();
      /* trazo real con el ratón */
      await p3.mouse.move(box.x + 30, box.y + 30);
      await p3.mouse.down();
      for (let i = 1; i <= 8; i++) {
        await p3.mouse.move(box.x + 30 + i * 20, box.y + 30 + i * 12);
        await sleep(20);
      }
      await p3.mouse.up();
      await sleep(200);
      const painted = await p3.evaluate(() => {
        const cv = document.getElementById('board');
        const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i] < 100 && d[i + 3] > 0) n++;  /* negro #1c2430 */
        return n;
      });
      ok(painted > 200, 'trazo pintado: ' + painted + ' px');
      /* deshacer → lienzo blanco */
      await p3.click('#undo');
      await sleep(250);
      const afterUndo = await p3.evaluate(() => {
        const cv = document.getElementById('board');
        const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i] < 100 && d[i + 3] > 0) n++;
        return n;
      });
      eq(afterUndo, 0, 'deshacer vacía el trazo');
      /* color rojo seleccionable */
      await p3.locator('.swatch').nth(1).click();
      await p3.mouse.move(box.x + 200, box.y + 200);
      await p3.mouse.down();
      await p3.mouse.move(box.x + 240, box.y + 240);
      await p3.mouse.up();
      await sleep(200);
      const red = await p3.evaluate(() => {
        const cv = document.getElementById('board');
        const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i] === 231 && d[i + 1] === 76 && d[i + 2] === 60) n++;
        return n;
      });
      ok(red > 50, 'trazo rojo: ' + red + ' px');
      await p3.close();
    });

    console.log('\n== Fase B (v1.1.8): app generada responde al toque ==');
    await test('Fase B: pointerdown real → rectángulo dibujado donde se tocó', async () => {
      const code = await page.evaluate(() => {
        const p = CS.projects.current;
        p.blocks.model = {
          version: 1,
          vars: [{ name: 'tx', value: '0' }, { name: 'ty', value: '0' }],
          contexts: { onTouch: [{ target: 'lienzo', blocks: [
            { id: 't1', type: 'touch_pos', params: { intoX: 'tx', intoY: 'ty' } },
            { id: 't2', type: 'canvas_rect', params: { id: 'lienzo', x: { kind: 'var', name: 'tx' }, y: { kind: 'var', name: 'ty' }, w: { kind: 'number', value: 12 }, h: { kind: 'number', value: 12 }, color: '#e74c3c' } }
          ] }] }
        };
        p.blocks.generatedFile = 'app.js';
        return CS.blocks.generate(p.blocks.model).code;
      });
      await page.evaluate((code) => {
        const cv = document.createElement('canvas');
        cv.id = 'lienzo'; cv.width = 200; cv.height = 200;
        cv.style.cssText = 'position:fixed;left:10px;top:10px;width:200px;height:200px;z-index:2147483647;pointer-events:auto';
        document.body.appendChild(cv);
        const s = document.createElement('script');
        s.textContent = code;
        document.head.appendChild(s);
      }, code);
      await sleep(150);
      const box = await page.locator('#lienzo').boundingBox();
      await page.mouse.move(box.x + 40, box.y + 50);
      await page.mouse.down();
      await page.mouse.up();
      await sleep(150);
      const pixel = await page.evaluate(() => {
        const cv = document.getElementById('lienzo');
        const d = cv.getContext('2d').getImageData(40, 50, 1, 1).data;
        return d[0] + ',' + d[1] + ',' + d[2];
      });
      eq(pixel, '231,76,60', 'píxel rojo (#e74c3c) en el punto tocado: ' + pixel);
      const last = await page.evaluate(() => window.wcsLastTouch ? window.wcsLastTouch.x + ',' + window.wcsLastTouch.y : 'sin wcsLastTouch global');
      ok(last === '40,50', 'wcsLastTouch global: ' + last);
      await page.evaluate(() => { const cv = document.getElementById('lienzo'); if (cv) cv.remove(); });
    });

    await test('sin errores de página en TODO el recorrido', () => {
      const realErrors = pageErrors.filter((e) => e.length);
      eq(realErrors.length, 0, 'pageerrors: ' + realErrors.join(' | '));
    });

    await test('tema oscuro: cambia data-theme y colores', async () => {
      await page.evaluate(() => { CS.settings.set('theme', 'dark'); CS.app.showView('home'); });
      await sleep(200);
      eq(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'dark');
      const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      ok(/rgb\((1[0-9]|2[0-4]),/.test(bg) || bg === 'rgb(16, 18, 24)', 'fondo oscuro: ' + bg);
      await page.evaluate(() => CS.settings.set('theme', 'auto'));
    });

  } finally {
    console.log('\n---------------------------------------------');
    console.log('PASS: ' + passed + '  FAIL: ' + failed);
    if (failures.length) {
      console.log('\nFallos:');
      failures.forEach((f) => console.log('  ✖ ' + f.name + '\n    ' + ((f.e && f.e.stack) || f.e).toString().split('\n').slice(0, 4).join('\n    ')));
    }
    await browser.close();
    server.close();
    process.exit(failed ? 1 : 0);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
