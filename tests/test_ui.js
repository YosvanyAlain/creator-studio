/* =========================================================================
 * Webxdc Creator Studio — test de integración de UI (jsdom)
 * Carga los módulos reales en un DOM simulado y recorre los flujos:
 * boot → navegación → crear desde plantilla → editar/autosave → bloques →
 * preview (documento construido) → validar → construir .xdc → sendToChat
 * (webxdc simulado) → importar .xdc → ajustes (tema/idioma).
 *
 * Uso: npm i jsdom fake-indexeddb && node tests/test_ui.js
 * ========================================================================= */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const fakeIDB = require('fake-indexeddb');

const SRC = path.join(__dirname, '..', 'xdc-src');
const ORDER = ['core.js', 'i18n.js', 'db.js', 'project.js', 'capabilities.js', 'snapshots.js', 'templates.js', 'blocks.js', 'components.js', 'pages.js', 'course.js', 'audio-editor.js', 'image-editor.js', 'zip.js', 'validator.js', 'exporter.js', 'highlight.js', 'monaco-loader.js', 'editor.js', 'preview.js', 'inspector.js', 'collab.js', 'blocks-ui.js', 'app.js'];

let passed = 0, failed = 0;
const failures = [];
function test(name, fn) {
  return Promise.resolve().then(fn)
    .then(() => { passed++; console.log('  ✓ ' + name); })
    .catch((e) => { failed++; failures.push({ name, e }); console.log('  ✖ ' + name + ' — ' + (e && e.message || e) + '\n    ' + ((e && e.stack) || '').split('\n')[1]); });
}
function ok(c, m) { if (!c) throw new Error(m || 'assertion'); }
function eq(a, b, m) { if (a !== b) throw new Error((m || '') + ' — esperado: ' + JSON.stringify(b) + ', obtenido: ' + JSON.stringify(a)); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Conduce el modal de prompt real: rellena el input y pulsa Aceptar/OK */
async function answerPrompt(doc, win, value) {
  await sleep(40);
  const input = doc.querySelector('.overlay .modal input.input');
  if (!input) throw new Error('modal de prompt no visible');
  input.value = value;
  const btns = Array.from(doc.querySelectorAll('.overlay .modal-actions .btn'));
  const okBtn = btns.find((b) => b.textContent === 'Aceptar' || b.textContent === 'OK');
  if (!okBtn) throw new Error('botón OK no encontrado: ' + btns.map((b) => b.textContent).join(','));
  okBtn.click();
  await sleep(120);
}

async function cancelPrompt(doc) {
  await sleep(30);
  const btns = Array.from(doc.querySelectorAll('.overlay .modal-actions .btn'));
  const cancel = btns.find((b) => b.textContent === 'Cancelar' || b.textContent === 'Cancel');
  if (cancel) cancel.click();
  await sleep(60);
}

async function clickSheetItem(doc, text) {
  await sleep(40);
  const items = Array.from(doc.querySelectorAll('.overlay .sheet-item'));
  const it = items.find((b) => b.textContent.indexOf(text) >= 0);
  if (!it) throw new Error('sheet item no encontrado: ' + text + ' — tengo: ' + items.map((b) => b.textContent).join(' | '));
  it.click();
  await sleep(80);
}


function fileItems(doc) {
  return Array.from(doc.querySelectorAll('.file-tree-item')).filter((c) => !c.classList.contains('add'));
}
function fileNav(doc, name) {
  return fileItems(doc).find((c) => c.textContent.indexOf(name) >= 0);
}

async function addBlockFromPalette(doc, name) {
  /* asegura paleta abierta, elige bloque por nombre y pulsa «Añadir bloque» */
  if (!doc.querySelector('.palette-card .pal-search')) {
    doc.querySelector('.palette-card .card-head.clickable').click();
    await sleep(30);
  }
  const item = Array.from(doc.querySelectorAll('.pal-item')).find((b) => b.textContent.indexOf(name) >= 0);
  if (!item) throw new Error('bloque no hallado en paleta: ' + name);
  item.click();
  await sleep(30);
  const addBtn = doc.querySelector('.doc-card .btn.primary');
  if (!addBtn) throw new Error('botón añadir bloque no visible');
  addBtn.click();
  await sleep(50);
}

async function main() {
  const html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  const vc = new VirtualConsole();
  const jsErrors = [];
  vc.on('jsdomError', (e) => { if (!/Not implemented/.test(String(e))) jsErrors.push(String(e)); });
  vc.on('error', (m) => { jsErrors.push(String(m)); });

  const dom = new JSDOM(html, {
    url: 'http://localhost/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(window) {
      window.indexedDB = fakeIDB.indexedDB;
      window.matchMedia = window.matchMedia || function (q) {
        return { matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} };
      };
      window.scrollTo = function () {};
      window.URL.createObjectURL = function () { return 'blob:fake'; };
      window.URL.revokeObjectURL = function () {};
      if (!window.crypto) window.crypto = {};
      if (!window.crypto.randomUUID) window.crypto.randomUUID = () => 'uid-' + Math.random().toString(36).slice(2);
      window.HTMLCanvasElement.prototype.getContext = function () { return null; };
      /* jsdom no expone TextDecoder (lo usa el importador de .xdc) */
      window.TextDecoder = TextDecoder;
      window.TextEncoder = TextEncoder;
    }
  });
  const win = dom.window;
  const doc = win.document;

  /* Cargar los módulos en orden */
  for (const f of ORDER) {
    const code = fs.readFileSync(path.join(SRC, f), 'utf8');
    win.eval(code);
  }
  const CS = win.CS;
  ok(CS && CS.app, 'CS global disponible');

  console.log('\n== boot ==');
  await test('init() arranca sin errores y muestra Home', async () => {
    await win.eval('CS.app.init()');
    await sleep(80);
    /* Determinismo: jsdom usa navigator.language=en-US; fijamos es para los tests */
    CS.i18n.setLang('es');
    CS.app.showView('home', { noHistory: true });
    ok(doc.getElementById('view-home').classList.contains('active'), 'home activa');
    ok(doc.querySelector('#view-home .hero h1').textContent.indexOf('Creator Studio') >= 0, 'título hero');
    ok(doc.getElementById('ind-webxdc'), 'indicadores');
    eq(CS.app.storageMode, 'idb', 'modo de almacenamiento IDB');
  });
  await test('sin errores de JS durante el boot', () => {
    eq(jsErrors.length, 0, 'errores: ' + jsErrors.join(' | '));
  });

  console.log('\n== navegación ==');
  await test('las vistas renderizan sin errores', async () => {
    for (const v of ['projects', 'templates', 'editor', 'blocks', 'pages', 'components', 'preview', 'inspector', 'export', 'help', 'settings', 'home']) {
      CS.app.showView(v);
      await sleep(20);
      ok(doc.getElementById('view-' + v).classList.contains('active'), 'vista ' + v);
    }
    eq(jsErrors.length, 0, 'errores: ' + jsErrors.join(' | '));
  });
  await test('drawer contiene las 12 entradas', () => {
    CS.app.renderDrawer();
    const items = doc.querySelectorAll('.drawer-item');
    eq(items.length, 12);
  });
  await test('ayuda: 10 secciones con contenido bilingüe', () => {
    CS.app.showView('help');
    const secs = doc.querySelectorAll('.help-sec');
    eq(secs.length, 11);
    for (const s of secs) {
      const body = s.querySelector('.help-body');
      ok(body.innerHTML.length > 100, 'cuerpo de ayuda con contenido');
    }
  });

  console.log('\n== curso (ayuda v1.1) ==');
  await test('curso: 4 niveles y 15 lecciones con miniatura SVG', async () => {
    CS.app.showView('help');
    await sleep(40);
    const sec = Array.from(doc.querySelectorAll('.help-sec')).find((x) => x.querySelector('.course-level-title'));
    ok(sec, 'sección curso presente');
    eq(doc.querySelectorAll('.course-level-title').length, 4, 'niveles 0–3');
    const lessons = doc.querySelectorAll('.lesson');
    eq(lessons.length, 15, 'lecciones');
    ok(doc.querySelectorAll('.lesson-thumb svg').length === 15, 'miniaturas SVG');
    ok(doc.querySelectorAll('.lesson-actions .btn').length >= 9, 'botones de ejemplo/plantilla');
  });
  await test('curso: ejemplo ejecutable en iframe sandbox', async () => {
    const btn = Array.from(doc.querySelectorAll('.lesson-actions .btn.primary')).find((b) => b.textContent.indexOf('Probar') >= 0);
    ok(btn, 'botón Probar ejemplo');
    btn.click();
    await sleep(40);
    const frame = doc.querySelector('.lesson-demo .demo-frame');
    ok(frame, 'iframe del ejemplo');
    eq(frame.getAttribute('sandbox'), 'allow-scripts allow-modals', 'sandbox sin same-origin');
    ok(frame.getAttribute('srcdoc').indexOf('<!DOCTYPE html>') === 0, 'srcdoc autocontenido');
    /* cerrar */
    btn.click();
    await sleep(20);
    ok(!doc.querySelector('.lesson-demo'), 'se cierra');
  });

  console.log('\n== proyectos y plantillas ==');
  await test('crear desde plantilla «todo» vía modal real → editor', async () => {
    CS.app.createFromTemplate('todo', null);
    await answerPrompt(doc, win, 'Nombre QA');
    ok(CS.projects.current, 'proyecto abierto');
    eq(CS.projects.current.name, 'Nombre QA');
    ok(doc.getElementById('view-editor').classList.contains('active'), 'editor activo');
    const chips = fileItems(doc);
    eq(chips.length, 5, 'index.html, style.css, app.js, icon.png + manifest.toml');
    /* Por defecto abre index.html; pulsamos app.js en el árbol */
    const appChip = fileNav(doc, 'app.js');
    appChip.click();
    await sleep(50);
    const area = doc.querySelector('#view-editor .code-area');
    ok(area.value.indexOf('wcs-todo-cache') >= 0, 'contenido de app.js cargado');
  });
  await test('barra de proyecto visible con proyecto abierto', () => {
    CS.app.showView('editor');
    ok(doc.getElementById('project-bar').style.display !== 'none');
    eq(doc.querySelectorAll('.pb-tab').length, 7);
  });
  await test('autosave: editar textarea → persistido en IDB', async () => {
    /* el archivo abierto es app.js tras el test anterior */
    const area = doc.querySelector('#view-editor .code-area');
    ok(area.value.indexOf('wcs-todo-cache') >= 0, 'app.js sigue abierto');
    area.value = area.value + '\n// QA edit';
    area.dispatchEvent(new win.Event('input', { bubbles: true }));
    await sleep(1200); /* debounce 800ms */
    const stored = await CS.store.get(CS.projects.current.id);
    ok(stored.files['app.js'].content.indexOf('// QA edit') >= 0, 'guardado en almacenamiento');
    ok(doc.querySelector('.save-state').textContent.length > 0);
    /* handEdited debe marcarse si app.js fuera el generado (no lo es aquí) */
  });
  await test('renombrar archivo: validación y cambio', async () => {
    const before = Object.keys(CS.projects.current.files).length;
    await CS.projects.fileRename(CS.projects.current, 'app.js', 'scripts.js');
    await CS.projects.save(CS.projects.current);
    ok(CS.projects.current.files['scripts.js'], 'renombrado');
    ok(!CS.projects.current.files['app.js']);
    eq(Object.keys(CS.projects.current.files).length, before);
    /* volver a dejar app.js */
    await CS.projects.fileRename(CS.projects.current, 'scripts.js', 'app.js');
    await CS.projects.save(CS.projects.current);
  });

  console.log('\n== bloques ==');
  await test('vista bloques renderiza contexto y paleta', async () => {
    CS.app.showView('blocks');
    await sleep(30);
    ok(doc.querySelector('.ctx-bar'), 'barra de contextos');
    ok(doc.querySelector('.palette-card'), 'paleta');
  });
  await test('plantilla blocks-scaffold: modelo y código generado', async () => {
    CS.app.createFromTemplate('blocks-scaffold', null);
    await answerPrompt(doc, win, 'Bloques QA');
    const p = CS.projects.current;
    ok(p.blocks.model, 'modelo presente');
    ok(p.files['app.js'].content.indexOf('let counter = 0;') >= 0, 'app.js generado');
    CS.app.showView('blocks');
    await sleep(30);
    const codeArea = doc.querySelector('#view-blocks .code-card .code-area');
    ok(codeArea.value.indexOf('let counter = 0;') >= 0, 'panel de código');
    ok(codeArea.value.indexOf("wireTap('btn-a'") >= 0, 'wiring de btn-a');
  });
  await test('bloques: handEdited → aviso visible', async () => {
    const p = CS.projects.current;
    CS.projects.markHandEdited(p, 'app.js');
    await CS.projects.save(p);
    CS.app.showView('blocks');
    await sleep(30);
    ok(doc.querySelector('.notice.warn'), 'aviso de edición manual');
  });

  console.log('\n== bloques v1.1: funciones, else, color, búsqueda ==');
  await test('función: crear vía sheet real → chip y contexto', async () => {
    CS.app.createFromTemplate('blocks-scaffold', null);
    await answerPrompt(doc, win, 'Bloques 11');
    CS.app.showView('blocks');
    await sleep(30);
    doc.querySelector('.ctx-bar .chip-add').click();
    await clickSheetItem(doc, 'Función nueva');
    await answerPrompt(doc, win, 'saludar');
    const chips = Array.from(doc.querySelectorAll('.ctx-chip'));
    ok(chips.some((c) => c.textContent.indexOf('saludar') >= 0), 'chip 🧩 saludar visible');
    ok(doc.querySelector('.stack-card .card-head').textContent.indexOf('saludar') >= 0, 'stack muestra la función');
    const p = CS.projects.current;
    eq(p.blocks.model.contexts.functions.length, 1);
    eq(p.blocks.model.contexts.functions[0].target, 'saludar');
  });
  await test('añadir bloque dentro de la función → async function en código', async () => {
    await addBlockFromPalette(doc, 'Mostrar aviso');
    ok(doc.querySelector('.block-card'), 'bloque en la pila de la función');
    const area = doc.querySelector('#view-blocks .code-area');
    ok(/async function saludar\(\) \{/.test(area.value), 'async function saludar() generado');
  });
  await test('if_else: rama «si no» visible y funcional (fix añadir dentro)', async () => {
    /* ir a Al iniciar y añadir Si… si no… */
    const startChip = Array.from(doc.querySelectorAll('.ctx-chip')).find((c) => c.textContent.indexOf('Al iniciar') >= 0);
    startChip.click();
    await sleep(30);
    await addBlockFromPalette(doc, 'Si… si no…');
    const block = doc.querySelector('.block-card.container');
    ok(block, 'bloque contenedor if_else');
    ok(block.querySelector('.else-branch'), 'rama else visible');
    ok(block.querySelector('.else-label'), 'etiqueta else');
    /* pulsar «añadir dentro» de la rama else y añadir un bloque ahí */
    const elseBtn = block.querySelector('.else-branch .add-inside');
    ok(elseBtn, 'botón añadir dentro (else)');
    elseBtn.click();
    await sleep(30);
    ok(doc.querySelector('.notice.info'), 'aviso de modo añadir dentro');
    await addBlockFromPalette(doc, 'Mostrar aviso');
    ok(!doc.querySelector('.notice.info'), 'aviso desaparece tras añadir');
    const m = CS.projects.current.blocks.model;
    const ifb = m.contexts.onStart.find((b) => b.type === 'if_else');
    ok(ifb, 'if_else en el modelo');
    eq(ifb.childrenElse.length, 1, 'bloque dentro de la rama else');
    eq(ifb.childrenElse[0].type, 'toast');
  });
  await test('call_action: selector de funciones + código con await', async () => {
    await addBlockFromPalette(doc, 'Llamar función');
    const card = Array.from(doc.querySelectorAll('.block-card')).find((c) =>
      c.querySelector('.block-name') && c.querySelector('.block-name').textContent.indexOf('Llamar función') >= 0);
    ok(card, 'bloque Llamar función');
    const sel = card.querySelector('select');
    ok(sel, 'selector de función');
    ok(Array.from(sel.options).some((o) => o.value === 'saludar'), 'saludar en las opciones');
    sel.value = 'saludar';
    sel.dispatchEvent(new win.Event('change', { bubbles: true }));
    await sleep(80);
    const area = doc.querySelector('#view-blocks .code-area');
    ok(/await saludar\(\);/.test(area.value), 'await saludar() en el código');
  });
  await test('set_bg_color: editor de color con type=color', async () => {
    await addBlockFromPalette(doc, 'Color de fondo');
    const card = Array.from(doc.querySelectorAll('.block-card')).find((c) =>
      c.querySelector('.block-name') && c.querySelector('.block-name').textContent.indexOf('Color de fondo') >= 0);
    ok(card, 'bloque Color de fondo');
    const well = card.querySelector('input[type="color"]');
    ok(well, 'input color presente');
    /* completar el id para que el bloque se genere */
    const idInput = card.querySelector('input.input:not([type="color"])');
    idInput.value = 'caja';
    idInput.dispatchEvent(new win.Event('input', { bubbles: true }));
    well.value = '#00ff00';
    well.dispatchEvent(new win.Event('input', { bubbles: true }));
    await sleep(80);
    const area = doc.querySelector('#view-blocks .code-area');
    ok(area.value.indexOf('#00ff00') >= 0, 'color aplicado al código');
  });
  await test('paleta: búsqueda filtra bloques', async () => {
    /* v1.1.1: la paleta se cierra al elegir un bloque → reabrirla si hace falta */
    if (!doc.querySelector('.palette-card .pal-search')) {
      doc.querySelector('.palette-card .card-head.clickable').click();
      await sleep(30);
    }
    const search = doc.querySelector('.pal-search');
    ok(search, 'caja de búsqueda');
    ok(doc.querySelectorAll('.pal-item').length >= 60, 'todos los bloques visibles sin filtro');
    search.value = 'tono';
    search.dispatchEvent(new win.Event('input', { bubbles: true }));
    await sleep(30);
    const visible = Array.from(doc.querySelectorAll('.pal-item')).filter((i) => i.style.display !== 'none');
    ok(visible.length > 0 && visible.length < 10, 'filtro estrecho: ' + visible.length);
    ok(visible.every((i) => /tono|note|tone/i.test(i.textContent)), 'solo bloques que coinciden');
    /* limpiar */
    search.value = '';
    search.dispatchEvent(new win.Event('input', { bubbles: true }));
    await sleep(30);
    const visible2 = Array.from(doc.querySelectorAll('.pal-item')).filter((i) => i.style.display !== 'none');
    eq(visible2.length, doc.querySelectorAll('.pal-item').length, 'sin filtro todo visible');
  });
  await test('borrar función: chip ✕ y confirmación', async () => {
    const chip = Array.from(doc.querySelectorAll('.ctx-chip')).find((c) => c.textContent.indexOf('saludar') >= 0);
    chip.querySelector('.chip-del').click();
    await sleep(40);
    /* confirmar */
    const btns = Array.from(doc.querySelectorAll('.overlay .modal-actions .btn'));
    const okBtn = btns.find((b) => b.textContent === 'Aceptar' || b.textContent === 'OK' || /Eliminar|Delete|Quitar|Remove/.test(b.textContent));
    okBtn.click();
    await sleep(80);
    eq(CS.projects.current.blocks.model.contexts.functions.length, 0, 'función eliminada');
  });

  console.log('\n== editores de audio e imagen (v1.1) ==');
  await test('editor de audio: abrir desde la barra y guardar WAV', async () => {
    CS.app.showView('editor');
    await sleep(30);
    const btn = Array.from(doc.querySelectorAll('.editor-tools .btn')).find((b) => b.textContent.indexOf('Sonidos') >= 0);
    ok(btn, 'botón Sonidos en la barra');
    btn.click();
    await sleep(40);
    const modal = doc.querySelector('.overlay .modal');
    ok(modal, 'modal del editor');
    ok(modal.querySelector('select'), 'selector de preset');
    ok(modal.querySelector('canvas.ae-wave'), 'canvas de forma de onda');
    ok(modal.querySelectorAll('input[type="range"]').length >= 7, 'sliders de parámetros');
    /* guardar */
    const nameInput = modal.querySelector('.ae-name');
    nameInput.value = 'salto8';
    nameInput.dispatchEvent(new win.Event('input', { bubbles: true }));
    const saveBtn = Array.from(modal.querySelectorAll('button')).find((b) => b.textContent.indexOf('Guardar en el proyecto') >= 0);
    saveBtn.click();
    await sleep(100);
    const f = CS.projects.current.files['assets/salto8.wav'];
    ok(f, 'assets/salto8.wav en el proyecto');
    eq(f.kind, 'data');
    eq(f.mime, 'audio/wav');
    ok(f.dataUrl.indexOf('data:audio/wav;base64,UklGR') === 0, 'WAV dataURL');
    ok(f.size > 100, 'tamaño razonable');
    /* cerrar modal */
    const closeBtn = Array.from(modal.querySelectorAll('.modal-actions .btn')).find((b) => b.textContent === 'Cerrar');
    closeBtn.click();
    await sleep(30);
  });
  await test('editor de imágenes: pestañas y paleta pixel-art', async () => {
    CS.app.showView('editor');
    await sleep(30);
    const btn = Array.from(doc.querySelectorAll('.editor-tools .btn')).find((b) => b.textContent.indexOf('Imágenes') >= 0);
    btn.click();
    await sleep(40);
    const modal = doc.querySelector('.overlay .modal');
    ok(modal, 'modal del editor de imágenes');
    eq(modal.querySelectorAll('.seg-tabs .btn').length, 2, 'pestañas icono/editar');
    ok(modal.querySelector('canvas.ie-pix'), 'canvas pixel-art');
    ok(modal.querySelectorAll('.ie-sw:not(.ie-sw-add)').length === 16, 'paleta de 16 colores base (v1.1.6: + botón de color propio)');
    /* cambiar a pestaña editar: sin imágenes muestra pista */
    const editTab = Array.from(modal.querySelectorAll('.seg-tabs .btn')).find((b) => b.textContent.indexOf('Editar imagen') >= 0);
    editTab.click();
    await sleep(30);
    ok(modal.textContent.indexOf('sin imágenes') >= 0 || modal.querySelector('select'), 'estado sin imágenes o selector');
    const closeBtn = Array.from(modal.querySelectorAll('.modal-actions .btn')).find((b) => b.textContent === 'Cerrar');
    closeBtn.click();
    await sleep(30);
  });
  await test('preview: __wcsAssets inyectado para assets del proyecto', () => {
    const p = CS.projects.current;
    /* el test anterior guardó assets/salto8.wav */
    const html = CS.preview.buildPreviewDocument(p, 'index.html', 'tok-qa');
    ok(html.indexOf('__wcsAssets') >= 0, 'mapa de assets presente');
    ok(html.indexOf('assets/salto8.wav') >= 0, 'ruta del wav en el mapa');
    ok(html.indexOf('data:audio/wav;base64') >= 0, 'dataURL del wav inyectado');
  });

  console.log('\n== preview ==');
  await test('preview: banner permanente + iframe sandbox', async () => {
    CS.app.showView('preview');
    await sleep(60);
    ok(doc.querySelector('.preview-banner'), 'banner PREVIEW');
    ok(doc.querySelector('.preview-banner').textContent.indexOf('PREVIEW') >= 0);
    const frame = doc.querySelector('.preview-frame');
    ok(frame, 'iframe presente');
    eq(frame.getAttribute('sandbox'), 'allow-scripts allow-forms allow-modals allow-popups', 'sandbox sin allow-same-origin');
    /* jsdom no ejecuta scripts de iframes: verificamos el srcdoc y los controles */
    ok(frame.srcdoc.indexOf('selfAddr') >= 0, 'mock en srcdoc');
    ok(frame.srcdoc.indexOf('joinRealtimeChannel') >= 0, 'mock realtime (experimental) presente');
  });
  await test('buildPreviewDocument: mock inyectado, scripts inlineados, webxdc.js fuera', () => {
    const p = CS.projects.current;
    const html2 = CS.preview.buildPreviewDocument(p, 'index.html', 'tok-test');
    ok(html2.indexOf('mock de preview') >= 0 || html2.indexOf('SIMULACIÓN') >= 0, 'mock presente');
    /* el tag de webxdc.js se elimina (el mock lo sustituye) */
    ok(!/<script src="webxdc\.js">/.test(html2), 'sin tag webxdc.js');
    /* app.js inlineado */
    ok(html2.indexOf('wcs-snake-best') >= 0 || html2.indexOf('let counter = 0;') >= 0 || html2.indexOf('wcs-') >= 0, 'JS del proyecto inlineado');
    /* CSS inlineado */
    ok(/<style>/.test(html2), 'CSS inlineado');
    /* mock como primer script del head */
    const head = html2.slice(0, html2.indexOf('</head>'));
    const firstScript = head.slice(head.indexOf('<script>'));
    ok(firstScript.indexOf('SIMULACIÓN') >= 0, 'mock es el primer script');
  });
  await test('preview: controles ejecutar/detener funcionan', async () => {
    CS.app.showView('preview');
    await sleep(60);
    /* en ejecución automática: botón detener visible, ejecutar oculto */
    const stopBtn = Array.from(doc.querySelectorAll('.preview-controls .btn')).find((b) => b.textContent.indexOf('Detener') >= 0);
    const runBtn = Array.from(doc.querySelectorAll('.preview-controls .btn')).find((b) => b.textContent.indexOf('Ejecutar') >= 0);
    ok(stopBtn && stopBtn.style.display !== 'none', 'detener visible');
    ok(runBtn && runBtn.style.display === 'none', 'ejecutar oculto mientras corre');
    stopBtn.click();
    await sleep(40);
    ok(!doc.querySelector('.preview-frame'), 'iframe eliminado al detener');
    ok(CS.preview.isRunning === false);
    runBtn.click();
    await sleep(60);
    ok(doc.querySelector('.preview-frame'), 'iframe recreado al ejecutar');
  });

  console.log('\n== validar y exportar ==');
  await test('validación del proyecto (todo template) sin errores', async () => {
    const p = CS.projects.fromTemplate('todo', 'Lista QA');
    const res = CS.validator.validate(p);
    eq(res.filter((r) => r.severity === 'error').length, 0, JSON.stringify(res));
    CS.projects.current = p;
    await CS.projects.save(p);
  });
  await test('vista exportar: build + botones', async () => {
    CS.app.showView('export');
    await sleep(30);
    /* webxdc simulado para probar sendToChat */
    const sent = [];
    win.webxdc = {
      selfAddr: 'qa@local', selfName: 'QA',
      sendToChat: (msg) => { sent.push(msg); return Promise.resolve(); }
    };
    /* pulsar construir */
    const buildBtn = Array.from(doc.querySelectorAll('#view-export .btn')).find((b) => b.textContent.indexOf('Construir') >= 0);
    ok(buildBtn, 'botón construir');
    buildBtn.click();
    await sleep(400);
    const out = doc.querySelector('.build-out');
    ok(out.textContent.indexOf('integridad verificada') >= 0 || out.textContent.indexOf('verificad') >= 0, 'build verificado: ' + out.textContent.slice(0, 140));
    /* botón enviar al chat */
    const shareBtn = Array.from(doc.querySelectorAll('#view-export .build-out .btn')).find((b) => b.textContent.indexOf('Enviar al chat') >= 0);
    ok(shareBtn, 'botón enviar al chat');
    shareBtn.click();
    await sleep(80);
    eq(sent.length, 1, 'sendToChat llamado una vez');
    ok(sent[0].file.name.endsWith('.xdc'), 'nombre .xdc: ' + sent[0].file.name);
    ok(sent[0].file.blob instanceof win.Blob, 'blob');
    ok(!sent[0].text, 'sin crédito de Studio por defecto');
    delete win.webxdc;
  });
  await test('frescura del export: cambio de nombre → reconstrucción automática', async () => {
    /* proyecto limpio: quitar el webxdc.js del test anterior y construir */
    const p = CS.projects.current;
    delete p.files['webxdc.js'];
    CS.app.showView('export');
    await sleep(30);
    const sent2 = [];
    win.webxdc = {
      selfAddr: 'qa@local', selfName: 'QA',
      sendToChat: (msg) => { sent2.push(msg); return Promise.resolve(); }
    };
    const buildBtn = Array.from(doc.querySelectorAll('#view-export .btn')).find((b) => b.textContent.indexOf('Construir') >= 0);
    buildBtn.click();
    await sleep(400);
    let shareBtn = Array.from(doc.querySelectorAll('#view-export .build-out .btn')).find((b) => b.textContent.indexOf('Enviar al chat') >= 0);
    ok(shareBtn, 'construido');
    shareBtn.click();
    await sleep(500);
    eq(sent2.length, 1, 'primer envío');
    ok(sent2[0].file.name.toLowerCase().indexOf('lista-qa') >= 0, 'nombre original: ' + sent2[0].file.name);
    /* ahora cambiar el nombre del paquete (dispara save → updatedAt) */
    const nameIn = doc.querySelector('#view-export .card .input');
    nameIn.value = 'Otro Nombre';
    nameIn.dispatchEvent(new win.Event('input', { bubbles: true }));
    nameIn.dispatchEvent(new win.Event('change', { bubbles: true }));
    await sleep(200);
    shareBtn = Array.from(doc.querySelectorAll('#view-export .build-out .btn')).find((b) => b.textContent.indexOf('Enviar al chat') >= 0);
    ok(shareBtn, 'botón tras reconstruir');
    shareBtn.click();
    await sleep(900);
    eq(sent2.length, 2, 'dos envíos (inicial + reconstruido)');
    ok(sent2[1].file.name.toLowerCase().indexOf('otro-nombre') >= 0, 'el segundo lleva el nombre nuevo: ' + sent2[1].file.name);
    delete win.webxdc;
  });
  await test('bloqueo de export con errores (proyecto roto)', async () => {
    const p = CS.projects.current;
    p.files['webxdc.js'] = { kind: 'text', content: 'x' }; /* error garantizado */
    CS.app.showView('export');
    await sleep(30);
    const buildBtn = Array.from(doc.querySelectorAll('#view-export .btn')).find((b) => b.textContent.indexOf('Construir') >= 0);
    ok(buildBtn, 'botón construir visible');
    buildBtn.click();
    await sleep(150);
    const out = doc.querySelector('.build-out');
    ok(out.textContent.indexOf('impiden') >= 0 || out.textContent.indexOf('✖') >= 0, 'bloqueado con mensaje: ' + out.textContent.slice(0, 80));
    /* sin botón de envío */
    ok(!Array.from(doc.querySelectorAll('#view-export .build-out .btn')).find((b) => b.textContent.indexOf('Enviar al chat') >= 0), 'sin botón de envío');
    delete p.files['webxdc.js'];
  });

  console.log('\n== importar .xdc ==');
  await test('import de un .xdc construido → proyecto nuevo', async () => {
    const src = CS.projects.fromTemplate('blank', 'Origen');
    const xdc = await CS.exporter.buildXdc(src);
    /* jsdom Blob no implementa arrayBuffer: usar los bytes del build */
    const fakeFile = { name: 'origen.xdc', arrayBuffer: async () => xdc.bytes.buffer.slice(xdc.bytes.byteOffset, xdc.bytes.byteOffset + xdc.bytes.length) };
    const res = await CS.exporter.importXdcFile(fakeFile);
    eq(res.project.name, 'Origen', 'nombre desde manifest');
    ok(res.project.files['index.html'].kind === 'text');
    await CS.projects.save(res.project);
  });

  console.log('\n== v1.1.1: fix binarios, fullscreen, undo, paleta, ajustes ==');
  await test('renombrar un SONIDO (binario) funciona — antes salía index.html', async () => {
    /* proyecto limpio + wav falso */
    const p = CS.projects.fromTemplate('blank', 'QA binarios');
    CS.projects.current = p;
    await CS.projects.fileSet(p, 'assets/sonido.wav', { kind: 'data', dataUrl: 'data:audio/wav;base64,UklGRg==', mime: 'audio/wav', size: 10 });
    await CS.projects.save(p);
    CS.app.showView('editor');
    await sleep(40);
    /* pulsar el chip del wav (binario) → debe QUEDAR SELECCIONADO */
    const chip = fileNav(doc, 'sonido.wav');
    chip.click();
    await sleep(80); /* abre el visor del binario */
    eq(CS.editor.currentPath, 'assets/sonido.wav', 'el binario queda seleccionado (fix)');
    /* cerrar el visor modal si está abierto */
    const cancelBtn = Array.from(doc.querySelectorAll('.overlay .modal-actions .btn')).find((b) => /Cancelar|Cancel|Cerrar|Close/.test(b.textContent));
    if (cancelBtn) { cancelBtn.click(); await sleep(30); }
    /* menú ⋯ Archivo → renombrar: el prompt debe traer assets/sonido.wav (no index.html) */
    const fileBtn = Array.from(doc.querySelectorAll('.editor-tools .btn')).find((b) => /Archivo|Editar|File|Edit/.test(b.textContent));
    fileBtn.click();
    await sleep(40);
    const renItem = Array.from(doc.querySelectorAll('.overlay .sheet-item')).find((b) => b.textContent.indexOf('Renombrar') >= 0);
    ok(renItem, 'opción renombrar en sheet');
    renItem.click();
    await sleep(60);
    const input = doc.querySelector('.overlay .modal input.input');
    ok(input, 'prompt de renombrado');
    eq(input.value, 'assets/sonido.wav', 'prompt trae la ruta DEL BINARIO (bug fixeado)');
    input.value = 'assets/sonido2.wav';
    const okBtn = Array.from(doc.querySelectorAll('.overlay .modal-actions .btn')).find((b) => b.textContent === 'Aceptar' || b.textContent === 'OK');
    okBtn.click();
    await sleep(120);
    ok(p.files['assets/sonido2.wav'], 'renombrado a sonido2.wav');
    ok(!p.files['assets/sonido.wav'], 'la ruta antigua ya no existe');
  });
  await test('eliminar un binario y DESHACER desde el toast', async () => {
    const p = CS.projects.current;
    eq(CS.editor.currentPath, 'assets/sonido2.wav', 'binario sigue seleccionado');
    const fileBtn = Array.from(doc.querySelectorAll('.editor-tools .btn')).find((b) => /Archivo|Editar|File|Edit/.test(b.textContent));
    fileBtn.click();
    await sleep(40);
    const delItem = Array.from(doc.querySelectorAll('.overlay .sheet-item')).find((b) => b.textContent.indexOf('Eliminar') >= 0);
    delItem.click();
    await sleep(60);
    /* confirmar */
    const yesBtn = Array.from(doc.querySelectorAll('.overlay .modal-actions .btn')).find((b) => /Eliminar|Delete|Aceptar|OK/.test(b.textContent));
    yesBtn.click();
    await sleep(150);
    ok(!p.files['assets/sonido2.wav'], 'eliminado');
    /* toast con botón Deshacer */
    const undoBtn = doc.querySelector('.toast-btn');
    ok(undoBtn, 'toast con botón Deshacer');
    undoBtn.click();
    await sleep(150);
    ok(p.files['assets/sonido2.wav'], 'restaurado con Deshacer');
  });
  await test('paleta: categorías plegadas por defecto y selección visible', async () => {
    CS.app.showView('blocks');
    await sleep(40);
    if (!doc.querySelector('.palette-card .pal-search')) {
      doc.querySelector('.palette-card .card-head.clickable').click();
      await sleep(30);
    }
    const dets = Array.from(doc.querySelectorAll('.pal-cat-details'));
    ok(dets.length >= 14, 'categorías presentes: ' + dets.length);
    /* las abiertas por tests anteriores (búsqueda) se cierran y NO se
     * re-abren al re-render: el default es PLEGADO (isOpen = palOpen===true) */
    dets.forEach((d) => { if (d.open) { d.open = false; d.dispatchEvent(new win.Event('toggle')); } });
    await sleep(20);
    doc.querySelector('.ctx-chip').click();  /* re-render de la vista */
    await sleep(40);
    const dets2 = Array.from(doc.querySelectorAll('.pal-cat-details'));
    ok(dets2.every((d) => !d.open), 're-render mantiene todo plegado (default plegado)');
    /* abrir una y elegir un bloque */
    dets[0].open = true;
    dets[0].dispatchEvent(new win.Event('toggle'));
    await sleep(20);
    const item = doc.querySelector('.pal-item');
    item.click();
    await sleep(60);
    /* la paleta se pliega y el doc queda visible justo debajo */
    ok(doc.querySelector('.palette-card .pal-search'), 'paleta sigue abierta (puzle)');
    ok(doc.querySelector('.doc-card'), 'doc del bloque visible');
    const sel = doc.querySelector('.pal-item.selected');
    ok(sel, 'bloque seleccionado resaltado');
    ok(sel.classList.contains('selected'), 'marca visual en el seleccionado');
  });
  await test('editor: pantalla completa sin perder contenido', async () => {
    CS.app.showView('editor');
    await sleep(40);
    /* abrir un archivo de TEXTO (el binario quedaba seleccionado tras el test anterior) */
    const chipHtml = fileNav(doc, 'index.html');
    chipHtml.click();
    await sleep(60);
    const area = doc.querySelector('#view-editor .code-area');
    const before = area.value;
    ok(before.length > 10, 'hay contenido');
    const fsBtn = Array.from(doc.querySelectorAll('.editor-tools .btn')).find((b) => b.getAttribute('title') && b.getAttribute('title').indexOf('pantalla completa') >= 0);
    ok(fsBtn, 'botón ⛶');
    fsBtn.click();
    await sleep(40);
    const wrap = doc.querySelector('.code-wrap.fs');
    ok(wrap, 'editor fullscreen activo');
    ok(wrap.querySelector('.fs-bar'), 'barra fullscreen con salida');
    const areaFs = doc.querySelector('.code-wrap.fs .code-area');
    eq(areaFs.value, before, 'contenido intacto en fullscreen');
    /* escribir en fullscreen */
    areaFs.value = before + '\n// fs-edit';
    areaFs.dispatchEvent(new win.Event('input', { bubbles: true }));
    await sleep(50);
    /* salir con el botón ✕ */
    const closeBtn = Array.from(doc.querySelectorAll('.code-wrap.fs .fs-bar .btn')).find((b) => b.textContent.indexOf('Salir') >= 0);
    closeBtn.click();
    await sleep(60);
    ok(!doc.querySelector('.code-wrap.fs'), 'fullscreen cerrado');
    const area2 = doc.querySelector('#view-editor .code-area');
    eq(area2.value, before + '\n// fs-edit', 'lo escrito en fullscreen se conserva');
    await CS.editor.flush();
  });
  await test('editor: undo/redo de contenido', async () => {
    const p = CS.projects.current;
    const path = 'index.html';   /* texto, no el binario seleccionado */
    CS.editor.openFile(path);
    await sleep(60);
    const original = p.files[path].content;
    const area = doc.querySelector('#view-editor .code-area');
    area.value = original + '\n// undo-me';
    area.dispatchEvent(new win.Event('input', { bubbles: true }));
    await sleep(1200); /* debounce 800 */
    ok(p.files[path].content.indexOf('// undo-me') >= 0, 'guardado con el cambio');
    /* undo */
    const undoBtn = Array.from(doc.querySelectorAll('.editor-tools .btn')).find((b) => b.getAttribute('title') === 'Deshacer');
    undoBtn.click();
    await sleep(150);
    eq(p.files[path].content, original, 'undo restaura el contenido');
    /* redo */
    const redoBtn = Array.from(doc.querySelectorAll('.editor-tools .btn')).find((b) => b.getAttribute('title') === 'Rehacer');
    redoBtn.click();
    await sleep(150);
    ok(p.files[path].content.indexOf('// undo-me') >= 0, 'redo reaplica el cambio');
  });
  await test('bloques: undo/redo del modelo', async () => {
    CS.projects.current = CS.projects.fromTemplate('blocks-scaffold', 'QA undo bloques');
    await CS.projects.save(CS.projects.current);
    CS.app.showView('blocks');
    await sleep(40);
    const model = () => CS.projects.current.blocks.model;
    const n0 = model().contexts.onStart.length;
    /* añadir un bloque toast */
    await addBlockFromPalette(doc, 'Mostrar aviso');
    eq(model().contexts.onStart.length, n0 + 1, 'bloque añadido');
    /* undo desde la cabecera de la pila */
    const undoBtn = doc.querySelector('.stack-card .card-head .btn[title="Deshacer"]');
    ok(undoBtn, 'botón undo en la pila');
    undoBtn.click();
    await sleep(80);
    eq(model().contexts.onStart.length, n0, 'undo quita el bloque');
    const redoBtn = doc.querySelector('.stack-card .card-head .btn[title="Rehacer"]');
    redoBtn.click();
    await sleep(80);
    eq(model().contexts.onStart.length, n0 + 1, 'redo lo devuelve');
  });

  console.log('\n== v1.1.2: refresco de lista, undo de archivos, ajustes ==');
  await test('guardar un archivo NUEVO refresca la lista sin salir del editor', async () => {
    const p = CS.projects.fromTemplate('blank', 'QA v1.1.2');
    CS.projects.current = p;
    await CS.projects.save(p);
    CS.app.showView('editor');
    await sleep(60);
    const n0 = fileItems(doc).length;
    /* mismo camino que usan los editores de sonido/imagen al guardar */
    const wav = CS.audioEditor.toWav(CS.audioEditor.synth({ dur: 0.05 }), true);
    await CS.projects.fileSet(p, 'assets/tono.wav', { kind: 'data', dataUrl: wav.dataUrl, mime: 'audio/wav', size: wav.bytes.length });
    CS.editor.notifyFileAdded('assets/tono.wav');
    await sleep(80);
    eq(fileItems(doc).length, n0 + 1, 'un archivo más, al instante');
    const chip = fileNav(doc, 'tono.wav');
    ok(chip, 'chip tono.wav visible sin salir de la vista');
    eq(CS.app.view, 'editor', 'seguimos en la vista editor');
  });
  await test('↶ deshace la CREACIÓN de un archivo; ↷ la devuelve', async () => {
    const p = CS.projects.current;
    ok(p.files['assets/tono.wav'], 'el wav existe');
    const undoBtn = Array.from(doc.querySelectorAll('.editor-tools .btn')).find((b) => b.getAttribute('title') === 'Deshacer');
    undoBtn.click();
    await sleep(100);
    ok(!p.files['assets/tono.wav'], 'undo quitó el archivo creado');
    const chipGone = fileItems(doc).every((c) => c.textContent.indexOf('tono.wav') < 0);
    ok(chipGone, 'chip retirado de la lista');
    const redoBtn = Array.from(doc.querySelectorAll('.editor-tools .btn')).find((b) => b.getAttribute('title') === 'Rehacer');
    redoBtn.click();
    await sleep(100);
    ok(p.files['assets/tono.wav'], 'redo lo devolvió');
  });
  await test('↶ también deshace la ELIMINACIÓN de un archivo (flechas)', async () => {
    const p = CS.projects.current;
    /* seleccionar el wav (abre el visor) y cerrarlo */
    const chip = fileNav(doc, 'tono.wav');
    chip.click();
    await sleep(80);
    const cancelBtn = Array.from(doc.querySelectorAll('.overlay .modal-actions .btn')).find((b) => /Cancelar|Cancel|Cerrar|Close/.test(b.textContent));
    if (cancelBtn) { cancelBtn.click(); await sleep(40); }
    eq(CS.editor.currentPath, 'assets/tono.wav', 'wav seleccionado');
    /* ⋯ Archivo → Eliminar → confirmar */
    const fileBtn = Array.from(doc.querySelectorAll('.editor-tools .btn')).find((b) => /Archivo|Editar|File|Edit/.test(b.textContent));
    fileBtn.click();
    await sleep(40);
    const delItem = Array.from(doc.querySelectorAll('.overlay .sheet-item')).find((b) => b.textContent.indexOf('Eliminar') >= 0);
    delItem.click();
    await sleep(60);
    const yesBtn = Array.from(doc.querySelectorAll('.overlay .modal-actions .btn')).find((b) => /Eliminar|Delete|Aceptar|OK/.test(b.textContent));
    yesBtn.click();
    await sleep(150);
    ok(!p.files['assets/tono.wav'], 'eliminado');
    /* ahora la FLECHA ↶ (no el toast) debe restaurarlo */
    const undoBtn = Array.from(doc.querySelectorAll('.editor-tools .btn')).find((b) => b.getAttribute('title') === 'Deshacer');
    undoBtn.click();
    await sleep(150);
    ok(p.files['assets/tono.wav'], '↶ restauró el archivo eliminado');
  });
  await test('↶ deshace un RENOMBRADO de archivo', async () => {
    const p = CS.projects.current;
    ok(p.files['assets/tono.wav'], 'el wav sigue ahí tras el undo de la eliminación');
    /* re-seleccionar el wav (el undo de la eliminación deja index.html activo) */
    const chipWav = fileNav(doc, 'tono.wav');
    chipWav.click();
    await sleep(80);
    const cancel2 = Array.from(doc.querySelectorAll('.overlay .modal-actions .btn')).find((b) => /Cancelar|Cancel|Cerrar|Close/.test(b.textContent));
    if (cancel2) { cancel2.click(); await sleep(40); }
    eq(CS.editor.currentPath, 'assets/tono.wav', 'wav seleccionado');
    const fileBtn = Array.from(doc.querySelectorAll('.editor-tools .btn')).find((b) => /Archivo|Editar|File|Edit/.test(b.textContent));
    fileBtn.click();
    await sleep(40);
    const renItem = Array.from(doc.querySelectorAll('.overlay .sheet-item')).find((b) => b.textContent.indexOf('Renombrar') >= 0);
    renItem.click();
    await sleep(60);
    await answerPrompt(doc, win, 'assets/renombre.wav');
    ok(p.files['assets/renombre.wav'], 'renombrado');
    const undoBtn = Array.from(doc.querySelectorAll('.editor-tools .btn')).find((b) => b.getAttribute('title') === 'Deshacer');
    undoBtn.click();
    await sleep(150);
    ok(p.files['assets/tono.wav'], '↶ devolvió la ruta antigua');
    ok(!p.files['assets/renombre.wav'], 'la nueva ruta ya no existe');
  });
  await test('ajustes: borrado en lista vertical con jerarquía de colores', async () => {
    CS.app.showView('settings');
    await sleep(60);
    const list = doc.querySelector('.wipe-list');
    ok(list, 'contenedor .wipe-list');
    const btns = list.querySelectorAll('.btn');
    eq(btns.length, 3, 'tres acciones de borrado');
    ok(btns[0].className.indexOf('warn') >= 0, 'proyectos → ámbar (parcial)');
    ok(btns[1].className.indexOf('ghost') >= 0 && btns[1].className.indexOf('danger') < 0, 'ajustes → neutro');
    ok(btns[2].className.indexOf('danger') >= 0, 'borrar todo → rojo (reservado)');
    ok(list.querySelector('.wipe-sep'), 'separador antes de «Borrar todos los datos»');
  });
  await test('respaldo: buildBackup → borrar proyectos → restoreBackup', async () => {
    const before = await CS.store.count();
    ok(before >= 2, 'hay proyectos antes del respaldo: ' + before);
    const backup = await CS.app.buildBackup();
    eq(backup.kind, 'wcs-backup');
    eq(backup.version, 1);
    ok(Array.isArray(backup.projects) && backup.projects.length === before);
    ok(backup.settings && backup.settings.theme !== undefined, 'ajustes en el respaldo');
    /* borrar solo proyectos (ajustes intactos) */
    CS.settings.set('theme', 'dark');
    await CS.store.wipe();
    eq(await CS.store.count(), 0, 'proyectos borrados');
    eq(CS.settings.get('theme'), 'dark', 'ajustes intactos tras borrar proyectos');
    /* restaurar */
    const r = await CS.app.restoreBackup(backup);
    eq(r.imported, before, 'proyectos restaurados');
    eq(await CS.store.count(), before, 'store repoblado');
    /* borrar solo ajustes: proyectos intactos, ajustes por defecto */
    await new Promise((res) => res());
    doc.querySelector('#view-settings') /* noop para linters */;
    const pCount = await CS.store.count();
    try { localStorage.removeItem('wcs_settings'); } catch (e) {}
    /* simulamos el flujo real llamando a la UI: mostrar ajustes y pulsar */
    CS.app.showView('settings');
    await sleep(40);
    const wipeSet = Array.from(doc.querySelectorAll('#view-settings .btn')).find((b) => b.textContent.indexOf('Borrar solo ajustes') >= 0);
    ok(wipeSet, 'botón borrar solo ajustes');
    wipeSet.click();
    await sleep(40);
    const yes = Array.from(doc.querySelectorAll('.overlay .modal-actions .btn')).find((b) => /Eliminar|Delete/.test(b.textContent));
    yes.click();
    await sleep(150);
    eq(CS.settings.get('theme'), 'auto', 'ajustes a por defecto');
    eq(await CS.store.count(), pCount, 'proyectos intactos tras borrar ajustes');
  });

  console.log('\n== Fase A (v1.1.3): teclado y consistencia ==');
  await test('Escape cierra los modales cancelables (prompt)', async () => {
    const nProjects = await CS.store.count();
    CS.app.showView('templates');
    await sleep(60);
    const useBtn = Array.from(doc.querySelectorAll('.tpl-card .btn')).find((b) => b.textContent.indexOf('Usar plantilla') >= 0);
    ok(useBtn, 'botón Usar plantilla visible');
    useBtn.click();
    await sleep(60);
    ok(doc.querySelector('.overlay .modal input.input'), 'prompt de nombre abierto');
    /* pulsar Escape a nivel documento (como el teclado físico en escritorio) */
    doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(80);
    ok(!doc.querySelector('.overlay'), 'modal cerrado con Escape');
    eq(await CS.store.count(), nProjects, 'no se creó ningún proyecto');
  });
  await test('Escape en el fullscreen del código de Bloques', async () => {
    CS.projects.current = CS.projects.fromTemplate('blocks-scaffold', 'QA fs bloques');
    await CS.projects.save(CS.projects.current);
    CS.app.showView('blocks');
    await sleep(80);
    const fsBtn = doc.querySelector('.code-card .card-head .btn[aria-label="Ampliar a pantalla completa"]');
    ok(fsBtn, 'botón ⛶ en la tarjeta de código');
    fsBtn.click();
    await sleep(60);
    ok(doc.querySelector('.code-card.fs'), 'fullscreen activo');
    ok(doc.body.classList.contains('fs-open'), 'body.fs-open');
    const area = doc.querySelector('.code-card.fs .code-area');
    area.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(60);
    ok(!doc.querySelector('.code-card.fs'), 'Escape cerró el fullscreen');
    ok(!doc.body.classList.contains('fs-open'), 'body.fs-open retirado');
  });

  console.log('\n== Fase C (v1.1.4): resaltado y edición asistida ==');
  await test('resaltado: capa <pre> detrás del textarea + gutter', async () => {
    CS.projects.current = CS.projects.fromTemplate('blank', 'QA hl');
    await CS.projects.save(CS.projects.current);
    CS.app.showView('editor');
    await sleep(80);
    ok(doc.querySelector('.code-layers'), 'capas presentes');
    ok(doc.querySelector('.code-layers .hl-pre'), '<pre> de resaltado detrás');
    const area = doc.querySelector('.code-layers .code-area');
    ok(area, 'textarea dentro de las capas');
    const pre = doc.querySelector('.hl-pre');
    ok(pre.innerHTML.indexOf('hl-tag') >= 0, 'index.html con etiquetas coloreadas');
    const lines = area.value.split('\n').length;
    const g = doc.querySelector('.code-gutter');
    ok(g && g.textContent.trim().split('\n').length === lines, 'gutter con ' + lines + ' números');
  });
  await test('resaltado se actualiza al escribir (debounce)', async () => {
    CS.editor.openFile('app.js');   /* archivo JS → comentario JS coloreable */
    await sleep(80);
    const area = doc.querySelector('.code-layers .code-area');
    area.value = '// comentario nuevo\n';
    area.dispatchEvent(new win.Event('input', { bubbles: true }));
    await sleep(150);
    const pre = doc.querySelector('.hl-pre');
    ok(pre.innerHTML.indexOf('hl-com') >= 0, 'comentario coloreado tras escribir');
    ok(pre.innerHTML.indexOf('// comentario nuevo') >= 0, 'texto presente');
  });
  await test('toggle 🖍 apaga y enciende el resaltado', async () => {
    const btn = doc.querySelector('.editor-tools .btn[aria-label="Resaltado de sintaxis"]');
    ok(btn, 'botón 🖍');
    btn.click();
    await sleep(60);
    ok(doc.querySelector('.code-layers').classList.contains('no-hl'), 'capa oculta (no-hl)');
    const btn2 = doc.querySelector('.editor-tools .btn[aria-label="Resaltado de sintaxis"]');
    btn2.click();
    await sleep(60);
    ok(!doc.querySelector('.code-layers').classList.contains('no-hl'), 're-activado');
  });
  await test('auto-cierre de ( [ { y comillas', async () => {
    const area = doc.querySelector('.code-layers .code-area');
    area.value = '';
    area.setSelectionRange(0, 0);
    area.dispatchEvent(new win.KeyboardEvent('keydown', { key: '(', bubbles: true }));
    eq(area.value, '()', 'par insertado');
    eq(area.selectionStart, 1, 'cursor en medio');
    area.dispatchEvent(new win.KeyboardEvent('keydown', { key: ')', bubbles: true }));
    eq(area.selectionStart, 2, 'cierre: salta por encima sin duplicar');
    area.value = '';
    area.setSelectionRange(0, 0);
    area.dispatchEvent(new win.KeyboardEvent('keydown', { key: '"', bubbles: true }));
    eq(area.value, '""', 'comillas auto-cerradas');
  });
  await test('auto-cierre envuelve la selección', async () => {
    const area = doc.querySelector('.code-layers .code-area');
    area.value = 'abc';
    area.setSelectionRange(0, 3);
    area.dispatchEvent(new win.KeyboardEvent('keydown', { key: '(', bubbles: true }));
    eq(area.value, '(abc)', 'selección envuelta');
    eq(area.selectionStart, 1, 'selección interior inicio');
    eq(area.selectionEnd, 4, 'selección interior fin');
  });
  await test('Enter auto-indenta (+2 tras bloque abierto)', async () => {
    const area = doc.querySelector('.code-layers .code-area');
    area.value = '  function f() {';
    area.setSelectionRange(area.value.length, area.value.length);
    area.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    eq(area.value, '  function f() {\n    ', 'indent 2+2 tras {');
    area.value = '  let a = 1;';
    area.setSelectionRange(area.value.length, area.value.length);
    area.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    eq(area.value, '  let a = 1;\n  ', 'mismo indent sin bloque');
    await CS.editor.flush();
  });

  console.log('\n== v1.1.5: fixes de móvil ==');
  await test('wrap ON por defecto y fuente del pre = fuente del área', async () => {
    eq(CS.settings.get('editorWrap'), true, 'ajuste de línea ON por defecto');
    eq(CS.settings.get('editorFont'), null, 'fuente del editor = AUTO por defecto');
    CS.projects.current = CS.projects.fromTemplate('blank', 'QA 115');
    await CS.projects.save(CS.projects.current);
    CS.app.showView('editor');
    await sleep(80);
    const area = doc.querySelector('.code-layers .code-area');
    const pre = doc.querySelector('.hl-pre');
    eq(area.wrap, 'soft', 'textarea con wrap soft');
    ok(pre.classList.contains !== undefined, 'pre presente');
    /* jsdom = escritorio → AUTO = 13px; pre y área DEBEN coincidir (bug 3a) */
    eq(pre.style.fontSize, area.style.fontSize, 'pre y textarea con la MISMA fuente: ' + pre.style.fontSize);
  });

  console.log('\n== D+ (v1.1.6): editor de imágenes ampliado ==');
  await test('pixel-art: herramientas, colores propios, escala y preset 192', async () => {
    CS.projects.current = CS.projects.fromTemplate('blank', 'QA ie');
    await CS.projects.save(CS.projects.current);
    CS.app.showView('editor');
    await sleep(60);
    const imgBtn = Array.from(doc.querySelectorAll('.editor-tools .btn')).find((b) => b.textContent.indexOf('Imágenes') >= 0);
    imgBtn.click();
    await sleep(80);
    /* 4 herramientas + 3 grosores + rejilla + foto + escala + color propio */
    const toolBtns = doc.querySelectorAll('.overlay .ie-tools .btn');
    ok(toolBtns.length >= 8, 'herramientas presentes: ' + toolBtns.length);
    const labels = Array.from(toolBtns).map((b) => b.getAttribute('title') || b.textContent);
    ok(labels.indexOf('Lápiz') >= 0 && labels.indexOf('Goma') >= 0 && labels.indexOf('Relleno') >= 0 && labels.indexOf('Cuentagotas') >= 0, 'las 4 herramientas');
    ok(labels.indexOf('Rejilla de ayuda') >= 0, 'toggle de rejilla');
    ok(doc.querySelector('.overlay .ie-scale'), 'selector de escala de exportación');
    ok(Array.from(doc.querySelectorAll('.overlay .ie-row .btn')).some((b) => b.textContent.indexOf('Foto') >= 0), 'botón foto → pixel');
    ok(doc.querySelector('.overlay .ie-sw-add'), 'botón + color propio');
    /* pestaña editar: preset 192 */
    const editTab = Array.from(doc.querySelectorAll('.overlay .seg-tabs .btn')).find((b) => b.textContent.indexOf('Editar') >= 0);
    editTab.click();
    await sleep(60);
    ok(Array.from(doc.querySelectorAll('.overlay .btn')).some((b) => b.textContent.indexOf('192') >= 0), 'preset 192×192');
    const cancel = Array.from(doc.querySelectorAll('.overlay .modal-actions .btn')).find((b) => /Cerrar|Close/.test(b.textContent));
    if (cancel) { cancel.click(); await sleep(40); }
  });

  console.log('\n== Fase F (v1.1.7): paleta de bloques ampliada ==');
  await test('bloques nuevos aparecen en la paleta de la vista Bloques', async () => {
    CS.projects.current = CS.projects.fromTemplate('blank', 'QA bloques F');
    await CS.projects.save(CS.projects.current);
    CS.app.showView('blocks');
    await sleep(120);
    /* cabecera de la paleta: “🧩 Paleta (260)” */
    const head = doc.querySelector('.palette-card .card-head');
    ok(head && /\(260\)/.test(head.textContent), 'paleta con 260 bloques: ' + (head && head.textContent.trim()));
    /* abrir paleta + todas las categorías y leer los nombres */
    if (!doc.querySelector('.palette-card .pal-search') && head) { head.click(); await sleep(80); }
    doc.querySelectorAll('.pal-cat-details').forEach(function (d) { d.open = true; d.dispatchEvent(new win.Event('toggle')); });
    await sleep(60);
    const names = Array.from(doc.querySelectorAll('.pal-item-name')).map(function (n) { return n.textContent.toLowerCase(); }).join('\n');
    ok(names.indexOf('buscar y reemplazar') >= 0 || names.indexOf('find and replace') >= 0, 'bloque buscar y reemplazar');
    ok(names.indexOf('invertir lista') >= 0 || names.indexOf('reverse list') >= 0, 'bloque invertir lista');
    ok(names.indexOf('ordenar lista') >= 0 || names.indexOf('sort list') >= 0, 'bloque ordenar lista');
    ok(names.indexOf('¿está en la lista?') >= 0 || names.indexOf('is it in the list?') >= 0, 'bloque ¿está en la lista?');
    ok(names.indexOf('lista a texto') >= 0 || names.indexOf('list to text') >= 0, 'bloque lista a texto');
    ok(names.indexOf('vibrar') >= 0 || names.indexOf('vibrate') >= 0, 'bloque vibrar');
    ok(names.indexOf('limitar valor') >= 0 || names.indexOf('clamp value') >= 0, 'bloque limitar valor');
    ok(names.indexOf('título de la página') >= 0 || names.indexOf('page title') >= 0, 'bloque título de la página');
    ok(doc.querySelectorAll('.pal-item').length === 260, '260 botones de bloque: ' + doc.querySelectorAll('.pal-item').length);
  });

  console.log('\n== Fase B (v1.1.8): manejador “Al tocar” ==');
  await test('Fase B: se puede añadir el contexto Al tocar y aparece en el código', async () => {
    CS.projects.current = CS.projects.fromTemplate('blocks-scaffold', 'QA táctil');
    await CS.projects.save(CS.projects.current);
    CS.app.showView('blocks');
    await sleep(100);
    /* ＋ Añadir manejador → Al tocar */
    const add = doc.querySelector('.ctx-bar .chip-add');
    ok(add, 'botón añadir manejador');
    add.click();
    await sleep(80);
    const items = Array.from(doc.querySelectorAll('.sheet .btn, .overlay .btn, .action-sheet .btn, li button')).map(function (b) { return b.textContent; });
    const touchItem = Array.from(doc.querySelectorAll('.overlay .sheet-item, .sheet-item')).find(function (b) { return b.textContent.indexOf('Al tocar') >= 0; });
    ok(touchItem, 'opción “Al tocar” en el menú de manejadores');
    if (touchItem) touchItem.click();
    await sleep(80);
    /* el prompt pide el #id del elemento */
    const input = doc.querySelector('.overlay input.input, .modal input.input');
    ok(input, 'prompt del target');
    if (input) {
      input.value = 'lienzo';
      input.dispatchEvent(new win.Event('input', { bubbles: true }));
      await sleep(40);
      const okBtn = Array.from(doc.querySelectorAll('.overlay .modal-actions .btn, .modal-actions .btn')).find(function (b) { return /Aceptar|OK/.test(b.textContent); });
      if (okBtn) okBtn.click();
      await sleep(80);
    }
    const chips = Array.from(doc.querySelectorAll('.ctx-chip')).map(function (c) { return c.textContent; });
    ok(chips.some(function (c) { return c.indexOf('#lienzo') >= 0; }), 'chip “#lienzo”: ' + chips.join(' | '));
    /* el chip queda seleccionado y el área de código sigue viva */
    const area = doc.querySelector('#view-blocks .code-card .code-area');
    ok(area, 'área de código presente');
  });

  console.log('\n== Fase J (v1.1.12): preview de dos pantallas ==');
  await test('Fase J: documento dual inyecta el canal compartido', () => {
    const p = CS.projects.fromTemplate('counter', 'QA dual');
    const single = CS.preview.buildPreviewDocument(p, 'index.html', 'tok-qa');
    ok(single.indexOf('wcs-deliver') < 0, 'modo simple: sin override dual');
    const d1 = CS.preview.buildPreviewDocument(p, 'index.html', 'tok-qa', 1);
    ok(d1.indexOf('wcs-deliver') >= 0, 'pantalla 1: canal dual');
    ok(d1.indexOf('Ana') >= 0, 'pantalla 1: Ana');
    const d2 = CS.preview.buildPreviewDocument(p, 'index.html', 'tok-qa', 2);
    ok(d2.indexOf('Beto') >= 0, 'pantalla 2: Beto');
    const iMock = d1.indexOf('mock de preview');
    const iDual = d1.indexOf('modo dos pantallas');
    ok(iMock >= 0 && iDual > iMock, 'override después del mock');
  });

  console.log('\n== Fase L (v1.1.13): accesibilidad ==');
  await test('a11y: botones solo-icono con nombre accesible en todas las vistas', async () => {
    const vistas = ['home', 'projects', 'templates', 'editor', 'blocks', 'preview', 'export', 'help', 'settings'];
    const problemas = [];
    for (const v of vistas) {
      CS.app.showView(v);
      await sleep(100);
      Array.from(doc.querySelectorAll('button')).forEach(function (b) {
        const txt = (b.textContent || '').trim();
        if (txt.length > 2) return;   /* tiene texto visible */
        const nombre = b.getAttribute('aria-label') || b.getAttribute('title');
        if (!nombre) problemas.push(v + ': “' + (txt || '(vacío)') + '” sin aria-label/title');
      });
    }
    eq(problemas.length, 0, 'botones sin nombre: ' + problemas.slice(0, 8).join(' · '));
  });
  await test('a11y: idioma del documento y contraste del banner de preview', async () => {
    ok(doc.documentElement.getAttribute('lang'), 'html tiene lang');
    CS.app.showView('preview');
    await sleep(120);
    const banner = doc.querySelector('.preview-banner');
    ok(banner && banner.getAttribute('role') === 'status', 'banner de preview con role=status');
  });

  console.log('\n== v1.1.14: pantalla fija (popstate) ==');
  await test('popstate re-fija la vista y no navega a home', async () => {
    CS.app.showView('editor');
    await sleep(40);
    eq(win.location.hash, '#editor', 'hash de la vista');
    const before = doc.querySelector('.view.active').id;
    /* simular el gesto atrás del sistema */
    win.dispatchEvent(new win.Event('popstate'));
    await sleep(40);
    eq(win.location.hash, '#editor', 'hash restaurado tras el popstate');
    eq(CS.app.view, 'editor', 'la vista sigue siendo editor');
    eq(doc.querySelector('.view.active').id, before, 'la vista visible no cambió');
    ok(win.history.length >= 2, 'guardia en el historial: ' + win.history.length);
  });

  console.log('\n== v1.1.15: arranque a prueba de fallos ==');
  await test('almacenamiento LENTO → la app abre al instante y espera', async () => {
    const origInit = CS.store.init;
    const origList = CS.store.list;
    let resolver = null;
    try {
      CS.store.init = function () { return new Promise(function (res) { resolver = res; }); };
      CS.store.list = function () { return new Promise(function () {}); };   /* lista pendiente */
      const t0 = Date.now();
      await CS.app.init();          /* no espera al storage */
      const dt = Date.now() - t0;
      ok(dt < 1000, 'init pinta la UI sin esperar la base: ' + dt + ' ms');
      ok(doc.querySelector('.view.active'), 'hay vista activa (nada en blanco)');
      eq(CS.app.storageMode, 'loading', 'modo: cargando');
      /* proyectos muestra «cargando…», no una lista vacía prematura */
      CS.app.showView('projects');
      await sleep(60);
      ok(/Cargando|Loading/.test(doc.body.textContent), 'placeholder de carga visible');
      ok(doc.querySelectorAll('.proj-card').length === 0, 'sin lista prematura');
      /* la base responde (tarde) → modo actualizado */
      resolver('memory');
      await sleep(300);
      eq(CS.app.storageMode, 'memory', 'modo actualizado al responder');
      CS.app.showView('home');
      await sleep(40);
    } finally {
      CS.store.init = origInit;
      CS.store.list = origList;
    }
  });

  await test('resaltado AUTO: escritorio sí; elección explícita manda (móvil=OFF fijo, v1.1.17)', () => {
    CS.settings.set('editorHighlight', null);
    ok(CS.app.hlEnabled() === true, 'AUTO en escritorio = ON');
    CS.settings.set('editorHighlight', false);
    ok(CS.app.hlEnabled() === false, 'OFF explícito');
    CS.settings.set('editorHighlight', true);
    ok(CS.app.hlEnabled() === true, 'ON explícito');
    CS.settings.set('editorHighlight', null);
  });

  await test('almacenamiento COLGADO → aviso tranquilo, sin reintentos (v1.1.18)', async () => {
    const origStuck = CS.app.STUCK_MS;
    const origInit = CS.store.init;
    const origList = CS.store.list;
    let resolver = null;
    try {
      CS.app.STUCK_MS = 250;                             /* aviso rápido para el test */
      CS.store.init = function () { return new Promise(function (res) { resolver = res; }); };
      CS.store.list = function () { return new Promise(function () {}); };   /* lista pendiente */
      await CS.app.init();                               /* arranca en modo cargando */
      CS.app.showView('projects');
      await sleep(100);
      ok(/Cargando|Loading/.test(doc.body.textContent), 'primero: mensaje de carga normal');
      ok(!doc.querySelector('.storage-retry'), 'sin botón Reintentar (se acabó la lucha)');
      await sleep(400);                                  /* pasa STUCK_MS → aviso */
      ok(/no se han perdido|NOT lost/i.test(doc.body.textContent), 'aviso: los proyectos NO se han perdido');
      ok(/mensajero|messenger/i.test(doc.body.textContent), 'indica el botón del mensajero');
      ok(doc.querySelectorAll('.proj-card').length === 0, 'sin lista fantasma');
      eq(CS.app.storageMode, 'loading', 'el modo sigue en cargando (honesto, sin error)');
      /* la base responde más tarde → la vista se refresca sola */
      CS.store.init = origInit;
      CS.store.list = origList;
      resolver('idb');
      await sleep(300);
      eq(CS.app.storageMode, 'idb', 'modo real al responder');
      ok(!/no se han perdido|NOT lost/i.test(doc.body.textContent), 'el aviso desaparece al responder');
      CS.app.showView('home');
      await sleep(40);
    } finally {
      CS.store.init = origInit;
      CS.store.list = origList;
      CS.app.STUCK_MS = origStuck;
    }
  });

  await test('Ayuda: guía de móvil (pantallas pequeñas)', async () => {
    CS.i18n.setLang('es');   /* el re-init anterior puede dejar la UI en inglés */
    CS.app.showView('help');
    await sleep(60);
    const secs = Array.from(doc.querySelectorAll('.help-sec summary')).map(function (s) { return s.textContent; });
    ok(secs.length === 11, '11 secciones de ayuda: ' + secs.length);
    ok(secs.some(function (s) { return /pantallas pequeñas/.test(s); }), 'sección móvil presente');
    ok(!secs.some(function (s) { return /gesto del borde/.test(s); }), 'sin sección del gesto del borde');
    const body = doc.body.textContent;
    ok(!/iPhone SE/.test(body), 'sin mención de iPhone SE');
    ok(/compactas|compact screens|pequeñas/.test(body), 'habla de pantallas compactas');
    ok(/árbol/.test(body), 'explica el árbol de archivos');
    CS.app.showView('home');
    await sleep(40);
  });

  await test('motor de sugerencias (v1.1.17): prefijos, APIs cualificadas, CSS/HTML', () => {
    const sug = CS.editor.suggest;
    ok(typeof sug === 'function', 'motor exportado');
    const js = sug('con', 'js', ['contador']);
    ok(js.length > 0 && js[0].label === 'contador', 'las palabras del archivo van primero');
    ok(js.some(function (s) { return s.label === 'console'; }), 'sugiere console');
    const docApi = sug('getEl', 'js', [], 'document');
    ok(docApi.some(function (s) { return s.label === 'getElementById()' && s.cursor === s.label.length - 1; }), 'API de document con cursor entre paréntesis');
    ok(sug('send', 'js', [], 'webxdc').some(function (s) { return s.label === 'sendUpdate()'; }), 'API real de webxdc');
    ok(sug('zzzz', 'js', []).length === 0, 'sin coincidencias → lista vacía');
    ok(sug('col', 'css', []).some(function (s) { return s.label === 'color' && s.insert === 'color: '; }), 'propiedad CSS');
    ok(sug('di', 'html', []).some(function (s) { return s.label === 'div'; }), 'etiqueta HTML');
    ok(sug('console', 'js', []).length === 0, 'una palabra ya completa no se vuelve a sugerir');
    ok(sug('console', 'js', [], null, true).some(function (s) { return s.label === 'console'; }), 'con Ctrl+Espacio sí se mantiene');
  });

  await test('una vista que falla no mata la app', async () => {
    const orig = CS.preview.render;
    CS.preview.render = function () { throw new Error('boom QA'); };
    CS.app.showView('preview');
    await sleep(60);
    ok(doc.querySelector('#view-preview .notice.warn'), 'aviso de error visible');
    ok(doc.body.textContent.indexOf('boom QA') >= 0, 'muestra el motivo');
    CS.preview.render = orig;
    CS.app.showView('preview');
    await sleep(80);
    ok(doc.querySelector('#view-preview .preview-banner'), 'la vista se recupera al reintentar');
    CS.app.showView('home');
    await sleep(40);
  });

  console.log('\n== v1.4.1 árbol / monaco / puzle / componentes ==');
  await test('editor: árbol de archivos convive con chips; Monaco OFF por defecto', async () => {
    CS.projects.current = CS.projects.fromTemplate('blank', 'QA tree');
    await CS.projects.save(CS.projects.current);
    CS.app.showView('editor');
    await sleep(80);
    ok(doc.querySelector('.file-tree'), 'árbol presente');
    ok(fileItems(doc).length >= 3, 'archivos en el árbol');
    ok(doc.querySelector('.file-tree-item.add'), 'añadir archivo en el árbol');
    ok(doc.querySelector('.tree-close'), 'cerrar árbol');
    ok(!doc.querySelector('.file-chip'), 'sin chips duplicados');
    const monacoBtn = doc.querySelector('.monaco-toggle');
    ok(monacoBtn, 'botón Monaco en la barra');
    eq(CS.settings.get('preferMonaco'), false, 'preferMonaco false');
    const host = doc.querySelector('.monaco-host');
    ok(host, 'host monaco');
    ok(host.style.display === 'none', 'monaco oculto');
    ok(doc.querySelector('#view-editor .code-area'), 'textarea presente');
    const treeItem = Array.from(doc.querySelectorAll('.file-tree-item')).find((b) => b.textContent.indexOf('app.js') >= 0);
    ok(treeItem, 'item app.js en el árbol');
    treeItem.click();
    await sleep(40);
    ok(doc.querySelector('#view-editor .code-area'), 'abrir desde el árbol');
  });
  await test('bloques: zona de drop tipo puzle y pal-item con data-type', async () => {
    if (CS.blocksUI && CS.blocksUI.ui) CS.blocksUI.ui.paletteOpen = true;
    CS.app.showView('blocks');
    await sleep(100);
    const start = Array.from(doc.querySelectorAll('.ctx-chip')).find((c) => /iniciar|On start|Start/i.test(c.textContent));
    if (start) { start.click(); await sleep(50); }
    ok(doc.querySelector('.puzzle-hint'), 'pista de arrastre');
    ok(doc.querySelector('.drop-list'), 'drop-list');
    if (!doc.querySelector('.pal-item')) {
      const head = doc.querySelector('.palette-card .card-head');
      if (head) { head.click(); await sleep(60); }
    }
    doc.querySelectorAll('.pal-cat-details').forEach(function (d) { d.open = true; });
    await sleep(30);
    const item = doc.querySelector('.pal-item[data-type]');
    ok(item && item.getAttribute('data-type'), 'pal-item data-type=' + (item && item.getAttribute('data-type')));
    eq(doc.querySelectorAll('.pal-item').length, 260, 'siguen 260 pal-item');
  });
  await test('componentes: se distingue de bloques y escribe HTML', async () => {
    CS.app.showView('components');
    await sleep(40);
    const root = doc.getElementById('view-components');
    const txt = root.textContent;
    ok(/Piezas en runtime|Runtime widgets|No son lo mismo|not the same/i.test(txt), 'copy vs bloques');
    const go = Array.from(root.querySelectorAll('button')).find((b) => /Bloques|Blocks/.test(b.textContent));
    ok(go, 'atajo a Bloques');
  });
  await test('audio: pestaña melodía 16 pasos', async () => {
    CS.app.showView('editor');
    await sleep(40);
    const btn = Array.from(doc.querySelectorAll('.editor-tools .btn')).find((b) => /Sonidos|Sounds/.test(b.textContent));
    ok(btn, 'botón Sonidos');
    btn.click();
    await sleep(40);
    const modal = doc.querySelector('.overlay .modal');
    ok(modal, 'modal audio');
    const mel = Array.from(modal.querySelectorAll('.seg-tabs .btn')).find((b) => /Melodía|Melody/.test(b.textContent));
    ok(mel, 'pestaña melodía');
    mel.click();
    await sleep(40);
    eq(modal.querySelectorAll('.ae-step').length, 48, '16×3 celdas');
    const closeBtn = Array.from(modal.querySelectorAll('.modal-actions .btn')).find((b) => /Cerrar|Close/.test(b.textContent));
    if (closeBtn) closeBtn.click();
    await sleep(20);
  });

  console.log('\n== ajustes ==');
  await test('cambio de tema aplica data-theme', () => {
    CS.settings.set('theme', 'dark');
    eq(doc.documentElement.getAttribute('data-theme'), 'dark');
    CS.settings.set('theme', 'light');
    eq(doc.documentElement.getAttribute('data-theme'), 'light');
    CS.settings.set('theme', 'auto');
  });
  await test('cambio de idioma re-renderiza la vista', () => {
    /* como haría la UI de ajustes: settings + i18n.setLang */
    CS.settings.set('lang', 'en');
    CS.i18n.setLang('en');
    CS.app.showView('home');
    eq(doc.getElementById('app-title').textContent, 'Home');
    CS.settings.set('lang', 'es');
    CS.i18n.setLang('es');
    CS.app.showView('home');
    eq(doc.getElementById('app-title').textContent, 'Inicio');
  });
  await test('tamaño de letra cambia data-font', () => {
    CS.settings.set('font', 'l');
    eq(doc.documentElement.getAttribute('data-font'), 'l');
    CS.settings.set('font', 'm');
  });
  await test('borrar todos los datos (wipe)', async () => {
    await CS.store.wipe();
    const list = await CS.store.list();
    eq(list.length, 0, 'sin proyectos tras wipe');
  });

  await test('sin errores JS acumulados en todo el flujo', () => {
    eq(jsErrors.length, 0, 'errores: ' + jsErrors.join(' | '));
  });

  console.log('\n---------------------------------------------');
  console.log('PASS: ' + passed + '  FAIL: ' + failed);
  if (failures.length) {
    console.log('\nFallos:');
    failures.forEach((f) => console.log('  ✖ ' + f.name + '\n' + (f.e && f.e.stack || f.e)));
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
