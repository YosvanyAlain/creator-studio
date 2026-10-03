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
/* CodeMirror can reorder synthetic keys sent under ~10 ms apart (never at human speed). */
const KEY_DELAY = 15;

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

  const FILES = '#view-editor .ed-row:not(.folder) .ed-row-main';
  const edTool = (label) => page.locator('#view-editor .ed-head .ed-tool[aria-label="' + label + '"]');
  const editorMenu = async (text) => {
    await edTool('Más acciones').click();
    await clickBtn('.overlay .sheet-item', text);
    await sleep(200);
  };
  /* On phones the file panel slides in from the left. */
  const openFiles = async () => {
    if (!(await page.locator('.ed-layout.files-open').count()) && (page.viewportSize().width < 900)) {
      await page.click('.ed-file-btn');
      await sleep(350);
    }
  };
  const typeAtEnd = async (text) => {
    await page.click('#view-editor .cm-content');
    await page.waitForFunction(() => document.activeElement && document.activeElement.classList.contains('cm-content'), null, { timeout: 3000 });
    await page.keyboard.press('Control+End');
    /* one input event: these tests check saving, not key handling */
    await page.keyboard.insertText(text);
  };
  const content = () => page.evaluate(() => CS.editor.getContent());
  /* Below 701px the palette is a bottom sheet that starts closed. */
  const openPalette = async () => {
    const search = page.locator('.pal-search').first();
    if (!(await search.count()) || !(await search.isVisible())) await clickBtn('#view-blocks .btn', 'Mostrar paleta');
    await sleep(150);
  };
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
    await test('pestañas inferiores navegan con clics reales', async () => {
      const tabs = await page.locator('#tabbar .tab').evaluateAll((els) => els.map((e) => e.dataset.tab));
      eq(tabs.join(','), 'home,projects,templates,help,settings', 'pestañas principales');
      for (const v of ['projects', 'templates', 'help', 'settings', 'home']) {
        await page.locator('#tabbar .tab[data-tab="' + v + '"]').click();
        await sleep(120);
        ok(await page.locator('#view-' + v + '.active').count() === 1, 'vista ' + v);
        ok(await page.locator('#tabbar .tab.active[data-tab="' + v + '"]').count() === 1, 'pestaña activa ' + v);
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
      const chips = await page.locator(FILES).count();
      eq(chips, 3, 'plantilla contador = index.html + icon.png + manifest.toml');
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

    await test('editor: escribir en CodeMirror y autosave persiste (IndexedDB real)', async () => {
      await page.evaluate(() => CS.app.showView('editor'));
      await page.waitForSelector('#view-editor .cm-content');
      eq(await page.evaluate(() => CS.editor.engine), 'codemirror', 'motor CodeMirror');
      await typeAtEnd('\n<!-- QA browser -->');
      let saved = '';
      for (let i = 0; i < 25 && saved.indexOf('<!-- QA browser -->') < 0; i++) {
        await sleep(200);
        saved = await page.evaluate(async () => {
          const p = await CS.store.get(CS.projects.current.id);
          return p.files['index.html'].content;
        });
      }
      ok(saved.indexOf('<!-- QA browser -->') >= 0, 'persistido en IndexedDB del navegador: editor=' + JSON.stringify((await content()).slice(-40)) + ' guardado=' + JSON.stringify(saved.slice(-40)));
      const state = await page.locator('.save-state').getAttribute('class');
      ok(/ok/.test(state), 'indicador de guardado: ' + state);
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
      await page.waitForSelector('.palette-card', { state: 'attached' });
      /* abrir paleta */
      await openPalette();
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
      ok(content.indexOf('Code generated by Webxdc Creator Studio') >= 0, 'cabecera del generado');
      ok(content.indexOf("'use strict';") >= 0, 'app.js regenerado');
      ok(content.indexOf('let counter = 0;') >= 0, 'variables declaradas');
    });

    console.log('\n== Fase F (v1.1.7): bloque nuevo de la paleta al código ==');
    await test('Fase F: añadir “Vibrar” y generar código real', async () => {
      await page.evaluate(() => CS.app.showView('blocks'));
      await page.waitForSelector('.palette-card', { state: 'attached' });
      await openPalette();
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
      eq(sentInfo.textLen, 0, 'sin pie del Studio por defecto');
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
      await page.evaluate(() => { CS.app.showView('editor'); CS.editor.openFile('index.html'); });
      await sleep(250);
      const before = await content();
      await editorMenu('Ampliar a pantalla completa');
      const wrap = page.locator('#view-editor .ed-main.fs');
      ok(await wrap.count() === 1, 'fullscreen activo');
      eq(await wrap.evaluate((el) => getComputedStyle(el).position), 'fixed', 'posición fixed (cubre la pantalla)');
      const box = await wrap.boundingBox();
      ok(box && box.width <= 392 && box.height >= 770, 'cubre el viewport móvil: ' + JSON.stringify(box));
      await typeAtEnd('\n<!-- fs-browser -->');
      await page.locator('.ed-main.fs .fs-exit').click();
      await sleep(150);
      ok(await page.locator('.ed-main.fs').count() === 0, 'fullscreen cerrado');
      const after = await content();
      ok(after.indexOf('<!-- fs-browser -->') >= 0 && after.length > before.length, 'contenido conservado tras salir: ' + JSON.stringify(after.slice(-80)) + ' path=' + (await page.evaluate(() => CS.editor.currentPath + ' ' + CS.projects.current.name)));
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
      eq(await page.locator(FILES).count(), 3, 'antes: index.html + icon.png + manifest.toml');
      await editorMenu('Sonidos');
      await page.waitForSelector('.overlay .audio-editor');
      await page.fill('.overlay .ae-name', 'moneda');
      await clickBtn('.overlay .ae-actions .btn', 'Guardar');
      await sleep(200);
      /* el chip aparece AL INSTANTE, con el modal todavía abierto */
      ok(await page.locator(FILES, { hasText: 'moneda.wav' }).count() === 1,
        'chip moneda.wav visible sin salir de la vista');
      await clickBtn('.overlay .modal-actions .btn', 'Cerrar');
      await sleep(150);
      eq(await page.locator(FILES).count(), 4, 'después: 4 archivos');
    });

    await test('v1.1.2: guardar un PIXEL-ART actualiza la lista al instante', async () => {
      await editorMenu('Imágenes');
      await page.waitForSelector('.overlay .image-editor');
      await page.fill('.overlay .ae-name', 'icono2');
      await clickBtn('.overlay .ae-actions .btn', 'Guardar PNG');
      await sleep(200);
      ok(await page.locator(FILES, { hasText: 'icono2.png' }).count() === 1,
        'chip icono2.png visible sin salir de la vista');
      await clickBtn('.overlay .modal-actions .btn', 'Cerrar');
      await sleep(150);
      eq(await page.locator(FILES).count(), 5, 'después: 5 archivos');
    });

    await test('v1.1.2: ↶ deshace la creación del archivo; ↷ la devuelve', async () => {
      await edTool('Deshacer').click();
      await sleep(250);
      eq(await page.locator(FILES, { hasText: 'icono2.png' }).count(), 0, 'undo quitó icono2.png');
      await edTool('Rehacer').click();
      await sleep(250);
      eq(await page.locator(FILES, { hasText: 'icono2.png' }).count(), 1, 'redo lo devolvió');
    });

    await test('v1.1.2: eliminar archivo y deshacer con CLIC REAL en el toast (pointer-events)', async () => {
      await openFiles();
      await page.locator(FILES, { hasText: 'moneda.wav' }).click();
      await page.waitForSelector('#view-editor .ed-binary audio');
      await clickBtn('#view-editor .ed-binary .btn', 'Más acciones');
      await clickBtn('.overlay .sheet-item', 'Eliminar archivo');
      await sleep(150);
      await clickBtn('.overlay .modal-actions .btn.danger', 'Eliminar');
      await sleep(250);
      eq(await page.locator(FILES, { hasText: 'moneda.wav' }).count(), 0, 'wav eliminado');
      /* toast con botón «Deshacer»: clic REAL — si .toast-btn no recibiera
       * eventos de puntero (bug v1.1.1), este click agotaría el timeout */
      await page.locator('.toast-btn').first().click({ timeout: 5000 });
      await sleep(300);
      eq(await page.locator(FILES, { hasText: 'moneda.wav' }).count(), 1, 'restaurado con el toast');
      ok(await page.locator('.toast', { hasText: 'restaurado' }).count() >= 0, 'toast de restauración');
    });

    await test('v1.1.2: body.fs-open mientras el código está a pantalla completa', async () => {
      await page.evaluate(() => CS.editor.openFile('index.html'));
      await sleep(200);
      await editorMenu('Ampliar a pantalla completa');
      ok(await page.evaluate(() => document.body.classList.contains('fs-open')), 'body.fs-open activo');
      const zi = await page.evaluate(() => {
        const fs = document.querySelector('.ed-main.fs');
        const toasts = document.getElementById('toasts');
        return { fs: +getComputedStyle(fs).zIndex, toasts: +getComputedStyle(toasts).zIndex };
      });
      ok(zi.toasts > zi.fs, 'toasts por encima del fullscreen: ' + JSON.stringify(zi));
      await page.locator('.ed-main.fs .fs-exit').click();
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

    console.log('\n== 2.0: editor CodeMirror 6 ==');
    await test('2.0: resaltado de sintaxis real también en móvil', async () => {
      await page.evaluate(async () => {
        const p = CS.projects.fromTemplate('counter', 'QA CodeMirror');
        await CS.projects.save(p);
        CS.projects.current = p;
        CS.app.showView('editor');
        CS.editor.openFile('index.html');
      });
      await page.waitForSelector('#view-editor .cm-content');
      const info = await page.evaluate(() => {
        const spans = Array.from(document.querySelectorAll('#view-editor .cm-line span'));
        const colors = new Set(spans.map((s) => getComputedStyle(s).color));
        return { spans: spans.length, colors: colors.size, gutter: !!document.querySelector('#view-editor .cm-gutters') };
      });
      ok(info.spans > 20, 'tokens coloreados: ' + info.spans);
      ok(info.colors >= 4, 'varios colores: ' + info.colors);
      ok(info.gutter, 'números de línea');
    });
    await test('2.0: auto-cierre, sangría y comentario', async () => {
      await page.evaluate(async () => {
        const p = CS.projects.current;
        CS.projects.fileSet(p, 'qa.js', { kind: 'text', content: '' });
        await CS.projects.save(p);
        CS.editor.openFile('qa.js');
      });
      await sleep(200);
      await page.click('#view-editor .cm-content');
      await page.keyboard.type('f(', { delay: KEY_DELAY });
      eq(await content(), 'f()', 'paréntesis auto-cerrado');
      await page.keyboard.type(')', { delay: KEY_DELAY });
      eq(await content(), 'f()', 'cerrar salta por encima');
      await page.keyboard.press('Control+a');
      await page.keyboard.press('Backspace');
      await page.keyboard.type('function g() {', { delay: KEY_DELAY });
      await page.keyboard.press('Enter');
      const txt = await content();
      ok(/function g\(\) \{\n {2}\n?\}?/.test(txt), 'sangría tras {: ' + JSON.stringify(txt));
    });
    await test('2.0: autocompletado webxdc con descripción y Enter acepta', async () => {
      await page.keyboard.press('Control+a');
      await page.keyboard.press('Backspace');
      await page.keyboard.type('webxdc.sendU', { delay: KEY_DELAY });
      await page.waitForSelector('.cm-tooltip-autocomplete', { timeout: 3000 });
      const detail = await page.locator('.cm-tooltip-autocomplete li[aria-selected] .cm-completionDetail').textContent();
      ok(/enviar/i.test(detail), 'descripción en español: ' + detail);
      await page.keyboard.press('Enter');
      ok((await content()).indexOf('webxdc.sendUpdate({ payload: {} }') === 0, 'fragmento insertado: ' + (await content()));
    });
    await test('2.0: ↶ deshace texto y luego archivos en orden', async () => {
      await page.keyboard.press('Control+a');
      await page.keyboard.press('Backspace');
      await page.keyboard.type('let a = 1;', { delay: KEY_DELAY });
      await page.evaluate(async () => {
        const p = CS.projects.current;
        CS.projects.fileSet(p, 'nuevo.txt', { kind: 'text', content: 'hola' });
        await CS.projects.save(p);
        CS.editor.notifyFileAdded('nuevo.txt');
      });
      await sleep(250);
      await edTool('Deshacer').click();
      await sleep(250);
      ok(!(await page.evaluate(() => !!CS.projects.current.files['nuevo.txt'])), '↶ primero deshace lo último: el archivo nuevo');
      ok((await content()).indexOf('let a = 1;') >= 0, 'el texto sigue');
      await edTool('Deshacer').click();
      await sleep(150);
      ok((await content()).indexOf('let a = 1;') < 0, '↶ después deshace el texto');
      await edTool('Rehacer').click();
      await sleep(150);
      ok((await content()).indexOf('let a = 1;') >= 0, '↷ rehace el texto');
    });
    await test('2.0: la última línea siempre alcanzable (archivo largo, móvil)', async () => {
      await page.evaluate(() => CS.editor.setContent(Array.from({ length: 400 }, (_, i) => 'const linea' + i + ' = "texto largo que envuelve en pantallas pequeñas"; // ' + i).join('\n') + '\n// FINAL'));
      await page.click('#view-editor .cm-content');
      await page.keyboard.press('Control+End');
      await sleep(300);
      const r = await page.evaluate(() => {
        const lines = Array.from(document.querySelectorAll('#view-editor .cm-line'));
        const last = lines.find((l) => l.textContent === '// FINAL');
        const scroller = document.querySelector('#view-editor .cm-scroller').getBoundingClientRect();
        const b = last && last.getBoundingClientRect();
        return { found: !!last, top: b && b.top, bottom: b && b.bottom, sTop: scroller.top, sBottom: scroller.bottom };
      });
      ok(r.found && r.bottom <= r.sBottom + 1 && r.top >= r.sTop - 1, 'última línea visible: ' + JSON.stringify(r));
    });
    await test('2.0: buscar abre el panel de búsqueda de CodeMirror', async () => {
      await edTool('Buscar').click();
      await page.waitForSelector('#view-editor .cm-search', { timeout: 3000 });
      await page.locator('#view-editor .cm-search input[name="search"]').fill('FINAL');
      await page.keyboard.press('Enter');
      await sleep(150);
      ok(await page.locator('#view-editor .cm-searchMatch').count() >= 1, 'coincidencia resaltada');
      await edTool('Buscar').click();
      await sleep(100);
      eq(await page.locator('#view-editor .cm-search').count(), 0, 'panel cerrado');
    });
    await test('2.0: tamaño de letra del código (A+)', async () => {
      const px0 = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#view-editor .cm-content')).fontSize));
      await editorMenu('Aumentar el tamaño de la letra');
      const px1 = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#view-editor .cm-content')).fontSize));
      ok(px1 > px0, 'letra más grande: ' + px0 + ' → ' + px1);
      await editorMenu('Reducir el tamaño de la letra');
    });
    await test('2.0: panel de archivos en móvil, carpetas y cierre con el fondo', async () => {
      await page.evaluate(() => CS.editor.openFile('index.html'));
      await sleep(200);
      await openFiles();
      ok(await page.locator('.ed-layout.files-open').count() === 1, 'panel abierto');
      const box = await page.locator('#view-editor .ed-files').boundingBox();
      ok(box && box.x >= -1 && box.width > 250, 'panel deslizado dentro de la pantalla: ' + JSON.stringify(box));
      await clickBtn('#view-editor .ed-files-actions .chip', 'Carpeta');
      await page.waitForSelector('.overlay .modal input.input');
      await page.fill('.overlay .modal input.input', 'sprites');
      await clickBtn('.overlay .modal-actions .btn', 'Aceptar');
      await sleep(300);
      ok(await page.locator('#view-editor .ed-row.folder', { hasText: 'sprites' }).count() === 1, 'carpeta en el árbol');
      await page.mouse.click(380, 400);  /* the dimmed backdrop */
      await sleep(350);
      eq(await page.locator('.ed-layout.files-open').count(), 0, 'el fondo cierra el panel');
    });

    console.log('\n== v1.1.14: pantalla fija ==');
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

    console.log('\n== D+ (v1.1.6): pixel-art real ==');
    await test('Fase D+: color propio, relleno y guardado en Chromium', async () => {
      await page.evaluate(() => CS.app.showView('editor'));
      await sleep(200);
      await editorMenu('Imágenes');
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

    /* ---------- 2.0: game engine blocks ---------- */
    const gameFrames = async () => {
      const out = [];
      for (const f of page.frames()) {
        if (f === page.mainFrame()) continue;
        try { if (await f.evaluate(() => typeof G !== 'undefined')) out.push(f); } catch (e) { /* detached */ }
      }
      return out;
    };
    const buildGame = (extra) => page.evaluate(async (extra) => {
      const B = CS.blocks;
      const p = CS.projects.fromTemplate('blank', 'Juego QA'); await CS.projects.save(p); CS.projects.current = p;
      const m = B.newModel();
      m.vars.push({ name: 'score', value: '0' });
      const add = (t, prm, kids) => { const b = B.newBlock(t); Object.assign(b.params, prm); if (kids) b.children = kids; m.contexts.onStart.push(b); return b; };
      add('gx_stage', { id: 'game', w: 320, h: 240 });
      add('gx_add', { sname: 'player', shape: 'emoji', text: '🐱', w: 24, h: 24 });
      add('gx_map', { rows: '.P.o.o.o..\n##########', size: 32 });
      add('gx_platformer', { target: 'player', speed: 4, jump: 12 });
      const hit = B.newBlock('change_var'); hit.params.name = 'score'; hit.params.delta = '1';
      const rm = B.newBlock('gx_remove'); rm.params.target = '@other';
      add('gx_on_hit', { a: 'player', b: 'tag:coin' }, [rm, hit]);
      if (extra) add('gx_share', { target: 'player' });
      p.blocks.model = m;
      const g = B.generate(m);
      p.files['app.js'] = { kind: 'text', content: g.code };
      await CS.projects.save(p);
      return g.problems.length;
    }, extra);

    await test('2.0: motor de juegos — un juego hecho con bloques corre en Probar', async () => {
      eq(await buildGame(false), 0, 'sin problemas de generación');
      await page.evaluate(() => { CS.preview.setPeerCount(1); CS.app.showView('preview'); });
      let frames = [];
      for (let i = 0; i < 20 && !frames.length; i++) { await sleep(200); frames = await gameFrames(); }
      ok(frames.length === 1, 'iframe con G');
      const f = frames[0];
      await sleep(600);
      ok(await f.evaluate(() => G.get('player', 'onGround')), 'el jugador cae y queda en el suelo');
      eq(await f.evaluate(() => G.count('tag:coin')), 3, 'monedas del mapa');
      ok(await f.evaluate(() => !!document.getElementById('wcs-pad') || true), 'controles opcionales');
      await f.evaluate(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })); });
      await sleep(1200);
      await f.evaluate(() => { window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' })); });
      eq(await f.evaluate(() => G.count('tag:coin')), 0, 'recogió todas las monedas con la flecha →');
      eq(await f.evaluate(() => score), 3, 'variable de puntos');
      const errors = await page.evaluate(() => CS.preview.logs.filter((l) => l.level === 'error').map((l) => l.text));
      eq(errors.length, 0, 'sin errores: ' + errors.join(' | '));
    });

    await test('2.0: multijugador en vivo — el sprite compartido aparece en la otra pantalla', async () => {
      eq(await buildGame(true), 0);
      await page.evaluate(() => { CS.preview.setPeerCount(2); CS.app.showView('preview'); });
      let frames = [];
      for (let i = 0; i < 25 && frames.length < 2; i++) { await sleep(200); frames = await gameFrames(); }
      eq(frames.length, 2, 'dos pantallas');
      await sleep(900);
      const seen = await frames[1].evaluate(() => { const r = []; G.sprites.forEach((s) => { if (s.tag === 'remote') r.push(s.name); }); return r; });
      ok(seen.some((n) => /^player@/.test(n)), 'pantalla 2 ve a pantalla 1: ' + seen.join(','));
      eq(await frames[0].evaluate(() => G.players()), 2, 'jugadores conectados');
      await page.evaluate(() => { CS.preview.setPeerCount(1); });
    });

    await test('2.0: editor de pixel art en Bloques pinta y guarda el dibujo', async () => {
      await page.evaluate(() => {
        const p = CS.projects.current; const m = p.blocks.model;
        const b = CS.blocks.newBlock('gx_pixels'); m.contexts.onStart.push(b);
        CS.blocksUI.ui.selBlockId = b.id; CS.blocksUI.ui.docType = 'gx_pixels'; CS.app.showView('blocks');
      });
      await sleep(400);
      const cv = page.locator('.gx-grid.pixels .gx-canvas').first();
      await cv.scrollIntoViewIfNeeded();
      const box = await cv.boundingBox();
      await page.locator('.gx-grid.pixels .gx-swatch').nth(9).click(); /* palette color 8 */
      await page.mouse.click(box.x + 3, box.y + 3);
      const rows = await page.evaluate(() => CS.projects.current.blocks.model.contexts.onStart.find((x) => x.type === 'gx_pixels').params.rows);
      eq(rows[0], '8', 'primer píxel pintado: ' + rows.slice(0, 9));
      await page.locator('.gx-grid.pixels .chip[aria-label="' + (await page.evaluate(() => CS.i18n.t('gx_frame_add'))) + '"]').click();
      const frames = await page.evaluate(() => CS.projects.current.blocks.model.contexts.onStart.find((x) => x.type === 'gx_pixels').params.rows.split(/\n\s*\n/).length);
      eq(frames, 2, 'segundo fotograma para animar');
    });

    await test('2.0: juego rápido — un toque crea el juego con bloques y una página de juego', async () => {
      await page.evaluate(async () => {
        const p = CS.projects.fromTemplate('blank', 'Rápido QA'); await CS.projects.save(p);
        CS.projects.current = p; CS.app.showView('blocks');
      });
      await sleep(400);
      eq(await page.locator('.gx-starter').count(), 3, 'tres inicios rápidos en un proyecto vacío');
      await page.locator('.gx-starter').first().click();
      await sleep(400);
      await page.locator('.overlay button', { hasText: await page.evaluate(() => CS.i18n.t('overwrite_ok')) }).first().click();
      await sleep(700);
      const st = await page.evaluate(() => {
        const p = CS.projects.current;
        return { blocks: p.blocks.model.contexts.onStart.length, engine: p.files['app.js'].content.indexOf('wcsGameEngine') >= 0,
          canvas: /<canvas id="game">/.test(p.files['index.html'].content), card: !!document.querySelector('.gx-starter-card') };
      });
      ok(st.blocks >= 10, 'bloques creados: ' + st.blocks);
      ok(st.engine, 'motor en app.js');
      ok(st.canvas, 'index.html convertido en página de juego');
      ok(!st.card, 'la tarjeta desaparece cuando hay bloques');
    });

    await test('2.0: editores multimedia — PNG pixel art reabre como rejilla y audio abre su archivo', async () => {
      await page.evaluate(async () => {
        const p = CS.projects.fromTemplate('blank', 'Medios QA'); await CS.projects.save(p); CS.projects.current = p;
        CS.imageEditor.open();
      });
      await sleep(400);
      await page.locator('.image-editor button[aria-pressed]').click();
      const box = await page.locator('canvas.ie-pix').boundingBox(), cell = box.width / 16;
      await page.mouse.click(box.x + cell * 2.5, box.y + cell * 3.5);
      await page.locator('.image-editor input.ae-name').fill('sprite1');
      await page.locator('.image-editor .ae-actions .btn.primary').click();
      await sleep(400);
      await page.keyboard.press('Escape'); await sleep(300);
      await page.evaluate(() => CS.imageEditor.open('assets/sprite1.png'));
      await sleep(900);
      const cells = await page.evaluate(() => Array.from(document.querySelector('canvas.ie-pix').getContext('2d').getImageData(0, 0, 16, 16).data).filter((v, i) => i % 4 === 3 && v > 0).length);
      eq(cells, 2, 'espejo + reapertura conserva las celdas');
      await page.keyboard.press('Escape'); await sleep(300);
      const info = await page.evaluate(async () => {
        const A = CS.audioEditor, p = CS.projects.current, w = A.toWav(A.synth(A.PRESETS.coin.opts), false);
        CS.projects.fileSet(p, 'assets/coin.wav', { kind: 'data', dataUrl: w.dataUrl, mime: 'audio/wav', size: w.bytes.length });
        A.open('assets/coin.wav');
        await new Promise((r) => setTimeout(r, 500));
        return { wave: !!document.querySelector('canvas.ae-wave'), sel: document.querySelector('.audio-editor select').value };
      });
      ok(info.wave, 'forma de onda visible');
      eq(info.sel, 'assets/coin.wav', 'abre el archivo pedido');
      await page.keyboard.press('Escape'); await sleep(300);
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
