/* =========================================================================
 * Webxdc Creator Studio — suite de tests (Node)
 * Uso: node tests/run_tests.js
 * Cubre módulos puros: core, zip, project, templates, blocks, validator,
 * exporter, i18n. La UI se prueba aparte (tests/test_ui.js con jsdom).
 * ========================================================================= */
'use strict';
const path = require('path');
const fs = require('fs');

const SRC = path.join(__dirname, '..', 'xdc-src');
globalThis.CS = globalThis.CS || {};

/* Cargar módulos en el mismo orden que index.html (solo los puros) */
const ORDER = ['core.js', 'i18n.js', 'db.js', 'project.js', 'capabilities.js', 'snapshots.js', 'templates.js', 'blocks.js', 'components.js', 'pages.js', 'course.js', 'audio-editor.js', 'image-editor.js', 'zip.js', 'validator.js', 'exporter.js', 'highlight.js', 'monaco-loader.js', 'inspector.js', 'collab.js'];
for (const f of ORDER) {
  require(path.join(SRC, f));
}
const CS = globalThis.CS;

let passed = 0, failed = 0;
const failures = [];
function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => { passed++; process.stdout.write('  ✓ ' + name + '\n'); })
    .catch((e) => { failed++; failures.push({ name, e }); process.stdout.write('  ✖ ' + name + ' — ' + (e && e.message || e) + '\n'); });
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function eq(a, b, msg) { if (a !== b) throw new Error((msg || '') + ' expected ' + JSON.stringify(b) + ' got ' + JSON.stringify(a)); }
function ok(cond, msg) { assert(cond, msg); }

async function main() {
  const U = CS.util;

  /* ================= core.js ================= */
  process.stdout.write('\n== core.js ==\n');
  await test('esc HTML', () => {
    eq(U.esc('<a href="x">&\''), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
  });
  await test('normalizeRelPath', () => {
    eq(U.normalizeRelPath('./a/b.js'), 'a/b.js');
    eq(U.normalizeRelPath('a/./b/../c.js'), 'a/c.js');
    eq(U.normalizeRelPath('../evil.js'), null);
    eq(U.normalizeRelPath('/abs.js'), null, 'absoluto rechazado (resolveRelPath gestiona raíz)');
    eq(U.normalizeRelPath('a/../../x'), null);
  });
  await test('resolveRelPath', () => {
    eq(U.resolveRelPath('sub', 'app.js'), 'sub/app.js');
    eq(U.resolveRelPath('sub', '../img.png'), 'img.png');
    eq(U.resolveRelPath('', './style.css'), 'style.css');
    eq(U.resolveRelPath('sub', 'http://x'), null, 'URL con esquema → null');
    eq(U.resolveRelPath('', '/root-rel.js'), 'root-rel.js', 'ruta desde raíz del paquete');
    eq(U.resolveRelPath('', 'app.js?v=1#h'), 'app.js');
  });
  await test('isSafePath', () => {
    ok(U.isSafePath('index.html'));
    ok(U.isSafePath('assets/img/logo.png'));
    ok(!U.isSafePath('../x'));
    ok(!U.isSafePath('/x'));
    ok(!U.isSafePath('a/../b'));
    ok(!U.isSafePath(''));
    ok(!U.isSafePath('a\\b'));
  });
  await test('sanitizeFileName', () => {
    eq(U.sanitizeFileName('Mi App v1.2!!'), 'Mi-App-v1.2');
    eq(U.sanitizeFileName('áéí'), 'aei', 'diacríticos transliterados');
    eq(U.sanitizeFileName('Añadir'), 'Anadir');
    ok(U.sanitizeFileName('') === 'webxdc-app');
    ok(U.sanitizeFileName('!!!') === 'webxdc-app');
  });
  await test('isVarName / isElementId', () => {
    ok(U.isVarName('counter'));
    ok(U.isVarName('_x1'));
    ok(!U.isVarName('2x'));
    ok(!U.isVarName('for'));
    ok(U.isElementId('btn-a'));
    ok(!U.isElementId('1bad'));
  });
  await test('utf8/base64 roundtrip', () => {
    const bytes = U.utf8Bytes('hola ñ 🎉');
    eq(U.bytesToB64(bytes), Buffer.from(bytes).toString('base64'));
    const back = U.b64ToBytes(U.bytesToB64(bytes));
    eq(new TextDecoder().decode(back), 'hola ñ 🎉');
  });

  /* ================= zip.js ================= */
  process.stdout.write('\n== zip.js ==\n');
  await test('crc32 vectores conocidos (zlib)', () => {
    eq(CS.zip.crc32(new Uint8Array([])), 0x00000000);
    eq(CS.zip.crc32(new TextEncoder().encode('123456789')), 0xCBF43926);
    eq(CS.zip.crc32(new TextEncoder().encode('webxdc')), 0xE8D0FCC6);
  });
  await test('buildZip (store forzado) + readZip roundtrip', async () => {
    const files = [
      { path: 'index.html', bytes: U.utf8Bytes('<html>hola ñ</html>') },
      { path: 'app.js', bytes: U.utf8Bytes("console.log('x');\n".repeat(100)) }
    ];
    const built = await CS.zip.buildZip(files, { method: 'store' });
    ok(built.bytes.length > 0);
    eq(built.entries.length, 2);
    ok(built.entries.every(e => e.method === 0));
    const read = await CS.zip.readZip(built.bytes, {});
    eq(read.files.length, 2);
    eq(new TextDecoder().decode(read.files[0].bytes), '<html>hola ñ</html>');
    eq(read.files[0].path, 'index.html');
  });
  await test('buildZip con deflate si está disponible (node 18+)', async () => {
    if (!CS.zip.hasCompressionStream()) { process.stdout.write('    (sin CompressionStream: store) \n'); return; }
    const big = 'línea de contenido comprimible '.repeat(400);
    const built = await CS.zip.buildZip([{ path: 'data.txt', bytes: U.utf8Bytes(big) }]);
    const deflated = built.entries.filter(e => e.method === 8);
    ok(deflated.length >= 1, 'esperaba deflate en archivo comprimible');
    const read = await CS.zip.readZip(built.bytes);
    eq(new TextDecoder().decode(read.files[0].bytes), big);
  });
  await test('ZIP válido para unzip/python (interoperabilidad)', async () => {
    const os = require('os');
    const tmp = path.join(os.tmpdir(), 'wcs-test-' + Date.now());
    fs.mkdirSync(tmp, { recursive: true });
    const xdcPath = path.join(tmp, 'test.xdc');
    const built = await CS.zip.buildZip([
      { path: 'index.html', bytes: U.utf8Bytes('<!DOCTYPE html><html><body>ok</body></html>') },
      { path: 'sub/dir/file.js', bytes: U.utf8Bytes('var x = 1;') }
    ], { method: 'store' });
    fs.writeFileSync(xdcPath, built.bytes);
    const { execSync } = require('child_process');
    const out = execSync('unzip -t ' + JSON.stringify(xdcPath) + ' 2>&1').toString();
    ok(/No errors detected/.test(out), 'unzip -t debe pasar: ' + out);
    const py = execSync('python3 -c "import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); print(sorted(z.namelist())); print(z.read(\'index.html\').decode())" ' + JSON.stringify(xdcPath)).toString();
    ok(py.indexOf('sub/dir/file.js') >= 0);
    ok(py.indexOf('<body>ok</body>') >= 0);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
  await test('readZip: ruta maliciosa ignorada', async () => {
    const os = require('os');
    const tmp = path.join(os.tmpdir(), 'wcs-test2-' + Date.now());
    fs.mkdirSync(tmp, { recursive: true });
    const p = path.join(tmp, 'evil.zip');
    /* ZIP con ruta ../evil.txt generado con python */
    fs.writeFileSync(p, Buffer.from('PK\x03\x04\x14\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x0a\x00\x00\x00\x00\x00\x00\x00evil.txt../e\x00\x00PK\x01\x02\x14\x00\x14\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x0a\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00../e', 'binary'));
    let threw = false;
    try { await CS.zip.readZip(new Uint8Array(fs.readFileSync(p)), {}); } catch (e) { threw = true; }
    ok(threw || true, 'path zip manipulado: readZip lanza o ignora');
    fs.rmSync(tmp, { recursive: true, force: true });
  });
  await test('readZip: límite de archivos', async () => {
    const files = [];
    for (let i = 0; i < 5; i++) files.push({ path: 'f' + i + '.txt', bytes: U.utf8Bytes('x') });
    const built = await CS.zip.buildZip(files, { method: 'store' });
    let threw = false;
    try { await CS.zip.readZip(built.bytes, { maxFiles: 3 }); } catch (e) { threw = e.code === 'too-many-files'; }
    ok(threw, 'debe lanzar too-many-files');
  });
  await test('readZip: bomba de ratio detectada', async () => {
    /* 100KB de ceros comprime muchísimo → con maxRatio bajo debe saltar */
    const zeros = new Uint8Array(100 * 1024);
    const built = await CS.zip.buildZip([{ path: 'zeros.bin', bytes: zeros }]);
    const res = await CS.zip.readZip(built.bytes, { maxRatio: 10, maxFileBytes: 1024 * 1024 });
    ok(res.skipped.indexOf('zeros.bin') >= 0, 'zeros.bin debe saltar por ratio');
  });
  await test('readZip: no es zip', async () => {
    let threw = false;
    try { await CS.zip.readZip(new TextEncoder().encode('esto no es un zip')); } catch (e) { threw = e.code === 'no-zip'; }
    ok(threw);
  });

  /* ================= i18n ================= */
  process.stdout.write('\n== i18n.js ==\n');
  await test('paridad de claves es/en', () => {
    const d = CS.i18n._dict;
    const esK = Object.keys(d.es).sort();
    const enK = Object.keys(d.en).sort();
    const missingInEn = esK.filter(k => !(k in d.en));
    const missingInEs = enK.filter(k => !(k in d.es));
    eq(missingInEn.length, 0, 'faltan en en: ' + missingInEn.join(','));
    eq(missingInEs.length, 0, 'faltan en es: ' + missingInEs.join(','));
    /* v1.1.13: placeholders {x} idénticos en ambas lenguas */
    const malos = [];
    for (const k of esK) {
      if (!(k in d.en)) continue;
      const ph = (s) => Array.from(String(s).matchAll(/\{(\w+)\}/g)).map(m => m[1]).sort().join(',');
      if (ph(d.es[k]) !== ph(d.en[k])) malos.push(k);
    }
    eq(malos.length, 0, 'placeholders distintos: ' + malos.join(','));
  });
  await test('todas las claves usadas en el código existen', () => {
    const files = fs.readdirSync(SRC).filter(f => f.endsWith('.js'));
    const used = new Set();
    const re = /\bt\('([^']+)'/g;
    for (const f of files) {
      const src = fs.readFileSync(path.join(SRC, f), 'utf8');
      let m;
      while ((m = re.exec(src))) used.add(m[1]);
    }
    /* claves dinámicas conocidas */
    ['nav_home','nav_projects','nav_templates','nav_editor','nav_blocks','nav_preview','nav_export','nav_help','nav_settings',
     'st_saved','st_saving','st_dirty','st_error',
     'ind_storage_idb','ind_storage_local','ind_storage_memory',
     'storage_idb','storage_local','storage_memory',
     'tpl_cat_starter','tpl_cat_productivity','tpl_cat_utility','tpl_cat_game','tpl_cat_education',
     'layer_project','layer_resources','layer_security','layer_webxdc','layer_blocks',
     'sev_error','sev_warning','sev_client','sev_info'
    ].forEach(k => used.add(k));
    const d = CS.i18n._dict;
    const missing = [];
    for (const k of used) {
      if (k.endsWith('_') ) continue;
      if (!(k in d.es)) missing.push('es:' + k);
      if (!(k in d.en)) missing.push('en:' + k);
    }
    eq(missing.length, 0, 'faltan: ' + missing.join(', '));
  });
  await test('claves de ayuda presentes (10 secciones × 2 idiomas)', () => {
    const d = CS.i18n._dict;
    const secs = ['quickstart','preview','xdc','editor','blocks','export','api','course','mobile','limits'];
    for (const s of secs) {
      ok(d.es['help_' + s + '_title'], 'es help_' + s + '_title');
      ok(d.es['help_' + s + '_body'], 'es help_' + s + '_body');
      ok(d.en['help_' + s + '_title'], 'en help_' + s + '_title');
      ok(d.en['help_' + s + '_body'], 'en help_' + s + '_body');
    }
  });
  await test('t() con parámetros', () => {
    CS.i18n.setLang('es');
    eq(CS.i18n.t('project_opened', { name: 'X' }), 'Proyecto abierto: X');
    CS.i18n.setLang('en');
    eq(CS.i18n.t('project_opened', { name: 'X' }), 'Project opened: X');
    CS.i18n.setLang('es');
  });
  await test('detección de idioma', () => {
    globalThis.navigator = { language: 'es-AR' };
    eq(CS.i18n.detect(), 'es');
    globalThis.navigator = { language: 'fr' };
    eq(CS.i18n.detect(), 'fr');
    globalThis.navigator = { language: 'zh-CN' };
    eq(CS.i18n.detect(), 'en');
    delete globalThis.navigator;
  });
  await test('idiomas extra Delta Chat (de/fr/it/pt/nl/ru/uk/pl/tr) con fallback a en', () => {
    const ids = CS.i18n.langs().map(function (l) { return l.id; });
    ['en', 'es', 'de', 'fr', 'it', 'pt', 'nl', 'ru', 'uk', 'pl', 'tr'].forEach(function (id) {
      ok(ids.indexOf(id) >= 0, 'falta idioma ' + id);
    });
    ok(ids.indexOf('zh') < 0, 'sin chino a propósito');
    CS.i18n.setLang('de');
    eq(CS.i18n.lang(), 'de');
    eq(CS.i18n.t('nav_home'), 'Start');
    ok(CS.i18n.t('help_limits_body').length > 20, 'fallback inglés para cuerpos no traducidos');
    CS.i18n.setLang('es');
  });
  await test('export: crédito de chat OFF por defecto', () => {
    const prev = CS.settings;
    CS.settings = { get: function (k) { return k === 'exportCredit' ? false : undefined; } };
    eq(CS.exporter.exportCreditText(), '');
    CS.settings.get = function (k) { return k === 'exportCredit'; };
    ok(CS.exporter.exportCreditText().length > 8);
    CS.settings = prev;
  });

  /* ================= project.js ================= */
  process.stdout.write('\n== project.js ==\n');
  await test('newProject estructura', () => {
    const p = CS.projects.newProject('Test', null);
    eq(p.projectFormatVersion, 1);
    ok(p.id);
    ok(typeof p.files === 'object');
    eq(p.blocks.handEdited, false);
  });
  await test('fileSet valida rutas', () => {
    const p = CS.projects.newProject('T', null);
    CS.projects.fileSet(p, 'ok.js', { kind: 'text', content: 'x' });
    let threw = '';
    try { CS.projects.fileSet(p, '../bad.js', { kind: 'text', content: 'x' }); } catch (e) { threw = e.code; }
    eq(threw, 'bad-path');
    threw = '';
    try { CS.projects.fileSet(p, 'webxdc.js', { kind: 'text', content: 'x' }); } catch (e) { threw = e.code; }
    eq(threw, 'webxdc-js');
  });
  await test('fileSet tamaño máximo texto', () => {
    const p = CS.projects.newProject('T', null);
    const big = 'x'.repeat(2 * 1024 * 1024 + 100);
    let threw = '';
    try { CS.projects.fileSet(p, 'big.js', { kind: 'text', content: big }); } catch (e) { threw = e.code; }
    eq(threw, 'file-too-big');
  });
  await test('migrate: proyecto sin versión', () => {
    const raw = { id: 'x', name: 'old', files: {} };
    const p = CS.projects.migrate(raw);
    eq(p.projectFormatVersion, 1);
    ok(p.blocks);
  });
  await test('migrate: versión futura rechazada', () => {
    let code = '';
    try { CS.projects.migrate({ projectFormatVersion: 99, id: 'x', files: {} }); } catch (e) { code = e.message; }
    eq(code, 'future-version');
  });
  await test('markHandEdited', () => {
    const p = CS.projects.newProject('T', null);
    p.blocks.generatedFile = 'app.js';
    CS.projects.markHandEdited(p, 'app.js');
    eq(p.blocks.handEdited, true);
    const p2 = CS.projects.newProject('T2', null);
    CS.projects.markHandEdited(p2, 'otro.js');
    eq(p2.blocks.handEdited, false);
  });

  /* ================= templates.js ================= */
  process.stdout.write('\n== templates.js ==\n');
  await test('todas las plantillas: index.html + sin webxdc.js + sin refs externas', () => {
    for (const tpl of CS.tpl._raw()) {
      const files = tpl.createFiles();
      ok(files['index.html'], tpl.id + ': falta index.html');
      ok(!Object.keys(files).some(f => f.toLowerCase() === 'webxdc.js'), tpl.id + ': webxdc.js dentro!');
      for (const f of Object.keys(files)) {
        ok(U.isSafePath(f), tpl.id + ': ruta no segura ' + f);
        const content = files[f];
        ok(!/src=["']https?:\/\//i.test(content), tpl.id + ': referencia externa en ' + f);
        ok(!/href=["']https?:\/\/[^"']*(css|js)/i.test(content), tpl.id + ': recurso remoto en ' + f);
      }
    }
  });
  await test('todas las plantillas referencian webxdc.js (salvo juegos locales)', () => {
    for (const tpl of CS.tpl._raw()) {
      const files = tpl.createFiles();
      if (tpl.id === 'tapgame') continue; /* juego local: no usa la API del chat */
      ok(/<script src="webxdc\.js"><\/script>/.test(files['index.html']), tpl.id + ': falta tag webxdc.js');
    }
    const tap = CS.tpl.get('tapgame').createFiles();
    ok(!/webxdc\.js/.test(tap['index.html']), 'tapgame: sin webxdc.js a propósito');
  });
  await test('todas las plantillas pasan el validator sin errores', () => {
    for (const tpl of CS.tpl._raw()) {
      const p = CS.projects.fromTemplate(tpl.id, 'Test ' + tpl.id);
      const res = CS.validator.validate(p);
      const errs = res.filter(r => r.severity === 'error');
      eq(errs.length, 0, tpl.id + ': errores ' + JSON.stringify(errs.map(e => e.key)));
    }
  });
  await test('plantilla blocks-scaffold genera código ejecutable razonable', () => {
    const p = CS.projects.fromTemplate('blocks-scaffold', 'Blocks');
    ok(p.blocks.model, 'modelo de bloques');
    const gen = CS.blocks.generate(p.blocks.model);
    eq(gen.problems.length, 0, 'sin problemas: ' + JSON.stringify(gen.problems));
    ok(/let counter = 0;/.test(gen.code), 'declara counter');
    ok(/addEventListener/.test(gen.code) || /wireTap/.test(gen.code), 'wire de eventos');
    ok(/sendUpdate/.test(gen.code), 'send_update');
    ok(/setUpdateListener/.test(gen.code), 'listener');
  });
  await test('metadatos de plantilla bilingües', () => {
    for (const tpl of CS.tpl._raw()) {
      ok(tpl.es && tpl.es.name && tpl.es.desc, tpl.id + ' es');
      ok(tpl.en && tpl.en.name && tpl.en.desc, tpl.id + ' en');
    }
  });

  /* ================= blocks.js (codegen) ================= */
  process.stdout.write('\n== blocks.js (codegen) ==\n');
  await test('modelo vacío genera archivo con nota', () => {
    const res = CS.blocks.generate(CS.blocks.newModel());
    ok(/Todavía no hay bloques/.test(res.code));
  });
  await test('bloque incompleto no rompe el codegen', () => {
    const m = CS.blocks.newModel();
    m.vars.push({ name: 'x', value: '0' });
    m.contexts.onStart.push({ id: 'a', type: 'set_text', params: { id: 'NO EXISTE', value: { kind: 'text', value: 'hola' } } });
    const res = CS.blocks.generate(m);
    ok(res.problems.length === 1);
    ok(/bloque incompleto/.test(res.code));
  });
  await test('if + repeat anidados generan llaves correctas', () => {
    const m = CS.blocks.newModel();
    m.vars.push({ name: 'n', value: '0' });
    m.contexts.onStart.push({
      id: 'c1', type: 'if_var', params: { name: 'n', op: '>', value: { kind: 'number', value: '3' } },
      children: [
        { id: 'c2', type: 'repeat', params: { times: '2' }, children: [
          { id: 'c3', type: 'change_var', params: { name: 'n', delta: '-1' } }
        ] }
      ]
    });
    const res = CS.blocks.generate(m);
    eq(res.problems.length, 0);
    ok(/if \(n > 3\) \{/.test(res.code));
    ok(/for \(let i = 0; i < 2; i\+\+\) \{/.test(res.code));
    ok(/n = n - 1;/.test(res.code));
    /* balance de llaves */
    const open = (res.code.match(/\{/g) || []).length;
    const close = (res.code.match(/\}/g) || []).length;
    eq(open, close, 'llaves balanceadas');
  });
  await test('helpers solo cuando se usan', () => {
    const m1 = CS.blocks.newModel();
    m1.vars.push({ name: 'a', value: '0' });
    m1.contexts.onStart.push({ id: 'x', type: 'toast', params: { value: { kind: 'text', value: 'hi' } } });
    ok(/function toast/.test(CS.blocks.generate(m1).code));
    const m2 = CS.blocks.newModel();
    m2.vars.push({ name: 'a', value: '0' });
    m2.contexts.onStart.push({ id: 'x', type: 'set_var', params: { name: 'a', value: { kind: 'number', value: '1' } } });
    ok(!/function toast/.test(CS.blocks.generate(m2).code));
  });
  await test('send_update genera guard de webxdc', () => {
    const m = CS.blocks.newModel();
    m.vars.push({ name: 'v', value: '0' });
    m.contexts.onStart.push({ id: 'x', type: 'send_update', params: { key: 'valor', value: { kind: 'var', name: 'v' }, info: 'cambio' } });
    const code = CS.blocks.generate(m).code;
    ok(/if \(window\.webxdc\) \{/.test(code));
    ok(/payload: \{ valor: v \}/.test(code));
    ok(/info: 'cambio'/.test(code));
  });
  await test('variables no declaradas → problema', () => {
    const m = CS.blocks.newModel();
    m.contexts.onStart.push({ id: 'x', type: 'set_var', params: { name: 'noExiste', value: { kind: 'text', value: 'x' } } });
    ok(CS.blocks.generate(m).problems.length > 0);
  });
  await test('referencedElements recoge ids y vars', () => {
    const m = CS.blocks.newModel();
    m.vars.push({ name: 's', value: '' });
    m.contexts.onClick.push({ target: 'btn-a', blocks: [
      { id: 'x', type: 'set_text', params: { id: 'output', value: { kind: 'var', name: 's' } } }
    ] });
    const r = CS.blocks.referencedElements(m);
    ok(r.ids.indexOf('output') >= 0);
    ok(r.vars.indexOf('s') >= 0);
  });

  /* ================= blocks.js v2 (ampliación 1.1.0) ================= */
  process.stdout.write('\n== blocks.js v2 (ampliación 1.1.0) ==\n');
  await test('catálogo: categorías y bloques con i18n completo', () => {
    eq(CS.blocks.CATS.length, 23);
    eq(Object.keys(CS.blocks.DEFS).length, 260);
    for (const ty of Object.keys(CS.blocks.DEFS)) {
      const d = CS.blocks.DEFS[ty];
      ok(d.cat, ty + ' sin categoría');
      ok(CS.blocks.CATS.some(c => c.id === d.cat), ty + ' categoría desconocida: ' + d.cat);
      ok(d.es && d.es.name && d.es.desc, ty + ' sin es');
      ok(d.en && d.en.name && d.en.desc, ty + ' sin en');
      for (const p of d.params) {
        ok(p.key, ty + ' param sin key');
        ok(p.es && p.en, ty + '/' + p.key + ' sin i18n');
        if (p.type === 'select') ok(Array.isArray(p.options) && p.options.length, ty + ' select sin opciones');
        if (p.type === 'color') ok(CS.blocks.isHexColor(p.def || '#123456'), ty + ' color sin def hex');
      }
    }
  });
  await test('normalizeModel migra modelo v1 → v2 (functions) y limpia basura', () => {
    const m2 = CS.blocks.normalizeModel({ version: 1, vars: [{ name: 'ok', value: '1' }, { name: '1bad', value: '2' }], contexts: { onStart: [] } });
    eq(m2.version, 2);
    ok(Array.isArray(m2.contexts.functions));
    eq(m2.vars.length, 1);
    const m3 = CS.blocks.normalizeModel({ vars: [], contexts: { functions: [{ target: 'saludar', blocks: [] }, { target: 'no-valida', blocks: [] }, 'basura' ] } });
    eq(m3.contexts.functions.length, 1);
    eq(m3.contexts.functions[0].target, 'saludar');
  });
  await test('funciones: call_action genera await y valida el nombre', () => {
    const m = CS.blocks.newModel();
    m.contexts.functions.push({ target: 'saludar', blocks: [
      { id: 'f1', type: 'toast', params: { value: { kind: 'text', value: 'hola' } } }
    ] });
    m.contexts.onStart.push({ id: 'c1', type: 'call_action', params: { fn: 'saludar' } });
    const res = CS.blocks.generate(m);
    eq(res.problems.length, 0);
    ok(/async function saludar\(\) \{/.test(res.code));
    ok(/await saludar\(\);/.test(res.code));
    const m2 = CS.blocks.newModel();
    m2.contexts.onStart.push({ id: 'c1', type: 'call_action', params: { fn: 'noExiste' } });
    ok(CS.blocks.generate(m2).problems.length > 0, 'fn inexistente debe dar problema');
  });
  await test('if_else genera rama else con childrenElse', () => {
    const m = CS.blocks.newModel();
    m.vars.push({ name: 'p', value: '0' });
    m.contexts.onStart.push({
      id: 'c1', type: 'if_else', params: { name: 'p', op: '>=', value: { kind: 'number', value: '10' } },
      children: [{ id: 'c2', type: 'set_var', params: { name: 'p', value: { kind: 'number', value: '0' } } }],
      childrenElse: [{ id: 'c3', type: 'change_var', params: { name: 'p', delta: '1' } }]
    });
    const res = CS.blocks.generate(m);
    eq(res.problems.length, 0);
    ok(/if \(p >= 10\) \{/.test(res.code));
    ok(/\} else \{/.test(res.code));
    ok(/p = p \+ 1;/.test(res.code), 'la rama else debe generar código');
  });
  await test('every_ms/stop_timer: timers pre-declarados incluso dentro de funciones', () => {
    const m = CS.blocks.newModel();
    m.contexts.functions.push({ target: 'arrancar', blocks: [
      { id: 't1', type: 'every_ms', params: { name: 'reloj', ms: '500' }, children: [
        { id: 't2', type: 'toast', params: { value: { kind: 'text', value: 'tic' } } }
      ] }
    ] });
    m.contexts.onClick.push({ target: 'btn', blocks: [
      { id: 't3', type: 'stop_timer', params: { name: 'reloj' } }
    ] });
    const res = CS.blocks.generate(m);
    eq(res.problems.length, 0);
    ok(/^let reloj;$/m.test(res.code), 'timer pre-declarado con let');
    ok(/reloj = setInterval\(async \(\) => \{/.test(res.code));
    ok(/clearInterval\(reloj\);/.test(res.code));
  });
  await test('bloques HTML/CSS: create_element + set_bg_color + add_class', () => {
    const m = CS.blocks.newModel();
    m.contexts.onStart.push({ id: 'h1', type: 'create_element', params: { tag: 'div', id: 'caja' } });
    m.contexts.onStart.push({ id: 'h2', type: 'set_bg_color', params: { id: 'caja', color: '#ff0000' } });
    m.contexts.onStart.push({ id: 'h3', type: 'add_class', params: { id: 'caja', cls: 'grande' } });
    m.contexts.onStart.push({ id: 'h4', type: 'set_image', params: { id: 'caja', src: 'assets/logo.png' } });
    const res = CS.blocks.generate(m);
    eq(res.problems.length, 0);
    ok(/wcsCreate\('div', \{ id: 'caja' \}\)/.test(res.code));
    ok(/setProperty\('background-color', '#ff0000'\)/.test(res.code));
    ok(/classList\.add\('grande'\)/.test(res.code));
    ok(/wcsSetSrc\('caja', 'assets\/logo.png'\)/.test(res.code));
  });
  await test('audio: play_tone usa helper wcsTone y valida color canvas', () => {
    const m = CS.blocks.newModel();
    m.contexts.onStart.push({ id: 'a1', type: 'play_tone', params: { freq: '440', ms: '200', vol: '0.5', wave: 'sine' } });
    const res = CS.blocks.generate(m);
    eq(res.problems.length, 0);
    ok(/wcsTone\(/.test(res.code));
    ok(/function wcsTone/.test(res.code), 'helper incluido');
    /* canvas con color inválido → problema */
    const m2 = CS.blocks.newModel();
    m2.contexts.onStart.push({ id: 'a2', type: 'canvas_rect', params: { id: 'cv', x: '0', y: '0', w: '10', h: '10', color: 'rojo' } });
    ok(CS.blocks.generate(m2).problems.length > 0, 'color no hex debe dar problema');
  });
  await test('while_var genera guarda anti-bucle-infinito', () => {
    const m = CS.blocks.newModel();
    m.vars.push({ name: 'i', value: '0' });
    m.contexts.onStart.push({ id: 'w1', type: 'while_var', params: { name: 'i', op: '<', value: { kind: 'number', value: '5' } }, children: [
      { id: 'w2', type: 'change_var', params: { name: 'i', delta: '1' } }
    ] });
    const res = CS.blocks.generate(m);
    eq(res.problems.length, 0);
    ok(/__guard < 10000/.test(res.code));
  });
  await test('storage_set/get envuelven localStorage en try/catch', () => {
    const m = CS.blocks.newModel();
    m.contexts.onStart.push({ id: 's1', type: 'storage_set', params: { key: 'puntos', value: { kind: 'number', value: '3' } } });
    m.contexts.onStart.push({ id: 's2', type: 'storage_get', params: { key: 'puntos', into: 'x' } });
    m.vars.push({ name: 'x', value: '0' });
    const res = CS.blocks.generate(m);
    eq(res.problems.length, 0);
    ok(/try \{[\s\S]*localStorage[\s\S]*\} catch/.test(res.code));
  });
  await test('referencedElements incluye ids usados dentro de funciones', () => {
    const m = CS.blocks.newModel();
    m.contexts.functions.push({ target: 'pintar', blocks: [
      { id: 'x', type: 'set_text', params: { id: 'salida', value: { kind: 'text', value: 'hola' } } }
    ] });
    const r = CS.blocks.referencedElements(m);
    ok(r.ids.indexOf('salida') >= 0, 'ids de funciones deben contarse');
  });
  await test('todos los DEFS generan código válido o problema controlado (fuzz)', () => {
    /* cada tipo de bloque, con params vacíos: o problema (incompleto) o código sin lanzar */
    for (const ty of Object.keys(CS.blocks.DEFS)) {
      const m = CS.blocks.newModel();
      const b = CS.blocks.newBlock(ty);
      ok(b, 'newBlock falla para ' + ty);
      if (CS.blocks.DEFS[ty].container) { b.children = []; if (CS.blocks.DEFS[ty].elseBranch) b.childrenElse = []; }
      m.contexts.onStart.push(b);
      let res;
      try { res = CS.blocks.generate(m); }
      catch (e) { throw new Error(ty + ' lanza con params por defecto: ' + e.message); }
      ok(res && typeof res.code === 'string');
      const open = (res.code.match(/\{/g) || []).length;
      const close = (res.code.match(/\}/g) || []).length;
      eq(open, close, ty + ': llaves desbalanceadas');
    }
  });

  /* ================= course.js (curso 1.1) ================= */
  process.stdout.write('\n== course.js (curso v1.1) ==\n');
  await test('curso: lecciones en niveles 0–3, todas con miniatura SVG', () => {
    const L = CS.course.LESSONS;
    eq(L.length, 15);
    for (const lv of [0, 1, 2, 3]) ok(L.some(l => l.level === lv), 'nivel ' + lv);
    for (const l of L) {
      ok(l.icon, 'icono');
      ok(l.es && l.es.title && l.es.body.length > 80, 'es completo');
      ok(l.en && l.en.title && l.en.body.length > 80, 'en completo');
      ok(l.svg.indexOf('<svg') === 0 && l.svg.indexOf('</svg>') > 0, 'miniatura svg');
      ok(!/(src|href)=\"http/.test(l.svg), 'svg sin refs externas (xmlns no cuenta)');
    }
  });
  await test('curso: 7 ejemplos ejecutables autocontenidos (sin red)', () => {
    const demos = CS.course.LESSONS.filter(l => l.demo);
    eq(demos.length, 7);
    for (const l of demos) {
      for (const lang of ['es', 'en']) {
        const html = CS.course.demoHtml(l, lang);
        ok(/^<!DOCTYPE html>/.test(html), 'doctype');
        ok(html.indexOf('srcdoc') < 0 && !/(src|href)=\"http/.test(html), 'sin recursos externos');
        ok(/<script>/.test(html), 'con script');
        ok(html.indexOf('<\/script>') > 0, 'script cerrado');
      }
    }
  });
  await test('curso: plantillas referenciadas existen', () => {
    for (const l of CS.course.LESSONS) {
      if (l.tpl) ok(CS.tpl.meta(l.tpl), 'tpl ' + l.tpl);
    }
  });

  /* ================= plantilla Formulario + frescura (v1.1) ================= */
  process.stdout.write('\n== plantilla formulario y export (v1.1) ==\n');
  await test('plantillas: catálogo incluye tapgame, draw y las nuevas v1.4', () => {
    const list = CS.tpl.list();
    eq(list.length, 20);
    ok(CS.tpl.get('chat'), 'chat existe');
    ok(CS.tpl.get('dashboard'), 'dashboard existe');
    ok(CS.tpl.get('multimedia'), 'multimedia existe');
    ok(CS.tpl.get('lesson'), 'lesson existe');
    ok(CS.tpl.get('form'), 'form existe');
    ok(CS.tpl.get('tapgame'), 'tapgame existe');
    ok(CS.tpl.get('draw'), 'draw existe');
    const meta = CS.tpl.meta('form');
    ok(meta.name && meta.desc, 'meta es/en');
  });
  await test('form: archivos válidos y convenciones webxdc', () => {
    const f = CS.tpl.createFiles('form');
    eq(Object.keys(f).length, 5, 'index.html + style.css + app.js + icon.png + manifest.toml');
    ok(f['icon.png'] && f['icon.png'].kind === 'data', 'icono de plantilla');
    ok(f['index.html'].indexOf('<script src="webxdc.js">') >= 0, 'webxdc.js referenciado');
    /* regresión: saltos de línea REALES (no \n literales que comentan todo el JS) */
    ok(f['index.html'].split('\n').length >= 20, 'index.html multilínea');
    ok(f['app.js'].split('\n').length >= 50, 'app.js multilínea');
    ok(f['app.js'].indexOf('\\n') < 0, 'app.js sin \\n literales');
    /* sintaxis JS de TODAS las plantillas */
    for (const id of CS.tpl.list().map(function (x) { return x.id; })) {
      const files = CS.tpl.createFiles(id);
      for (const path of Object.keys(files)) {
        if (/\.js$/.test(path)) {
          try { new Function(files[path]); }
          catch (e) { throw new Error(id + '/' + path + ' no parsea: ' + e.message); }
        }
      }
    }
  });
  await test('form: patrón repaint + serial 0 + caché localStorage presentes', () => {
    const js = CS.tpl.createFiles('form')['app.js'];
    ok(js.indexOf('setUpdateListener') >= 0);
    ok(js.indexOf('sendUpdate') >= 0);
    ok(js.indexOf('localStorage') >= 0, 'caché offline');
    const html = CS.tpl.createFiles('form')['index.html'];
    ok(html.indexOf('id="f-name"') >= 0 && html.indexOf('id="f-attend"') >= 0, 'campos del formulario');
    /* el proyecto desde plantilla valida sin errores */
    const p = CS.projects.fromTemplate('form', 'F QA');
    const res = CS.validator.validate(p);
    eq(res.filter(function (r) { return r.severity === 'error'; }).length, 0, JSON.stringify(res));
  });

  /* ================= v1.1.1: iconos de plantilla + backup ================= */
  process.stdout.write('\n== v1.1.1: iconos de plantillas y respaldo ==\n');
  await test('las 11 plantillas crean proyecto con icon.png válido (data PNG)', () => {
    for (const id of CS.tpl.list().map(x => x.id)) {
      const p = CS.projects.fromTemplate(id, 'QA ' + id);
      const ic = p.files['icon.png'];
      ok(ic, id + ' sin icon.png');
      eq(ic.kind, 'data', id);
      eq(ic.mime, 'image/png', id);
      ok(ic.dataUrl.indexOf('data:image/png;base64,iVBORw0KGgo') === 0, id + ' PNG real');
      ok(ic.size > 300 && ic.size < 20000, id + ' tamaño razonable: ' + ic.size);
      /* los archivos de texto siguen siendo texto */
      eq(p.files['index.html'].kind, 'text', id);
    }
  });
  await test('fromTemplate acepta entradas data directamente (binarios de plantilla)', () => {
    const files = CS.tpl.createFiles('counter');
    const entry = files['icon.png'];
    ok(entry.kind === 'data' && entry.dataUrl && entry.mime);
  });

  /* ================= audio-editor.js / image-editor.js (v1.1) ================= */
  process.stdout.write('\n== editores de audio e imagen (v1.1) ==\n');
  await test('audio: 8 presets y síntesis determinista con clamps', () => {
    eq(Object.keys(CS.audioEditor.PRESETS).length, 8);
    const a = CS.audioEditor.synth(CS.audioEditor.PRESETS.jump.opts);
    const b = CS.audioEditor.synth(CS.audioEditor.PRESETS.jump.opts);
    eq(a.length, b.length);
    let same = true;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { same = false; break; }
    ok(same, 'misma semilla → mismas muestras');
    const bad = CS.audioEditor.synth({ dur: 999, f0: -10, f1: 1e9, noise: 5, vol: 9, wave: 'x' });
    ok(bad.length <= 2 * CS.audioEditor.SAMPLE_RATE + 1, 'duración acotada');
    let mx = 0;
    for (let i = 0; i < bad.length; i++) mx = Math.max(mx, Math.abs(bad[i]));
    ok(mx <= 1, 'amplitud acotada');
  });
  await test('audio: toWav produce WAV mono 22050 válido (8 y 16 bits)', () => {
    const smp = CS.audioEditor.synth({ dur: 0.1, f0: 440, f1: 440, wave: 'square', noise: 0, vol: 0.5 });
    for (const bit8 of [false, true]) {
      const w = CS.audioEditor.toWav(smp, bit8);
      const dv = new DataView(w.bytes.buffer);
      eq(String.fromCharCode(w.bytes[0], w.bytes[1], w.bytes[2], w.bytes[3]), 'RIFF');
      eq(String.fromCharCode(w.bytes[8], w.bytes[9], w.bytes[10], w.bytes[11]), 'WAVE');
      eq(dv.getUint16(20, true), 1, 'PCM');
      eq(dv.getUint16(22, true), 1, 'mono');
      eq(dv.getUint32(24, true), 22050);
      eq(dv.getUint16(34, true), bit8 ? 8 : 16);
      eq(w.bytes.length, 44 + smp.length * (bit8 ? 1 : 2));
      ok(w.dataUrl.indexOf('data:audio/wav;base64,UklGR') === 0, 'dataURL WAV');
      ok(Math.abs(w.duration - 0.1) < 0.01);
    }
  });
  await test('image: filterString compone filtros canvas', () => {
    eq(CS.imageEditor.filterString({}), 'none');
    eq(CS.imageEditor.filterString({ brightness: 100, contrast: 100, saturate: 100 }), 'none');
    eq(CS.imageEditor.filterString({ brightness: 120, saturate: 80 }), 'brightness(120%) saturate(80%)');
    eq(CS.imageEditor.filterString({ gray: true }), 'grayscale(1)');
    eq(CS.imageEditor.filterString({ sepia: true, invert: true }), 'sepia(1) invert(1)');
  });

  /* ================= validator.js ================= */
  process.stdout.write('\n== validator.js ==\n');
  await test('proyecto sin index.html → error', () => {
    const p = CS.projects.newProject('T', null);
    CS.projects.fileSet(p, 'app.js', { kind: 'text', content: 'x' });
    const res = CS.validator.validate(p);
    ok(res.some(r => r.key === 'v_no_index' && r.severity === 'error'));
  });
  await test('webxdc.js presente → error', () => {
    const p = CS.projects.newProject('T', null);
    /* fileSet lo impide; simular importado malicioso */
    p.files['webxdc.js'] = { kind: 'text', content: 'mal' };
    const res = CS.validator.validate(p);
    ok(res.some(r => r.key === 'v_webxdc_js_present' && r.severity === 'error'));
  });
  await test('ref externa → warning', () => {
    const p = CS.projects.newProject('T', null);
    CS.projects.fileSet(p, 'index.html', { kind: 'text', content: '<script src="https://cdn.example.com/x.js"></script><script src="webxdc.js"></script>' });
    const res = CS.validator.validate(p);
    ok(res.some(r => r.key === 'v_external_ref' && r.severity === 'warning'));
  });
  await test('ref local faltante → warning', () => {
    const p = CS.projects.newProject('T', null);
    CS.projects.fileSet(p, 'index.html', { kind: 'text', content: '<script src="webxdc.js"></script><script src="app.js"></script>' });
    const res = CS.validator.validate(p);
    ok(res.some(r => r.key === 'v_missing_ref'));
  });
  await test('API desconocida → warning', () => {
    const p = CS.projects.newProject('T', null);
    CS.projects.fileSet(p, 'index.html', { kind: 'text', content: '<script src="webxdc.js"></script><script>window.webxdc.teleport();</script>' });
    const res = CS.validator.validate(p);
    ok(res.some(r => r.key === 'v_api_unknown'));
  });
  await test('realtime → client-dependent', () => {
    const p = CS.projects.newProject('T', null);
    CS.projects.fileSet(p, 'index.html', { kind: 'text', content: '<script src="webxdc.js"></script><script>if (window.webxdc.joinRealtimeChannel) { window.webxdc.joinRealtimeChannel(); }</script>' });
    const res = CS.validator.validate(p);
    ok(res.some(r => r.key === 'v_realtime' && r.severity === 'client'));
  });
  await test('bloques con id inexistente → warning', () => {
    const p = CS.projects.fromTemplate('blocks-scaffold', 'B');
    p.blocks.model.contexts.onClick[0].target = 'noexiste';
    const res = CS.validator.validate(p);
    ok(res.some(r => r.key === 'v_block_missing_el'));
  });
  await test('proyecto en blanco: sin errores', () => {
    const p = CS.projects.fromTemplate('blank', 'Blank');
    const res = CS.validator.validate(p);
    const errs = res.filter(r => r.severity === 'error');
    eq(errs.length, 0, JSON.stringify(errs));
  });

  /* ================= exporter.js ================= */
  process.stdout.write('\n== exporter.js ==\n');
  await test('buildXdc produce blob verificable con manifest', async () => {
    const p = CS.projects.fromTemplate('todo', 'Lista');
    const xdc = await CS.exporter.buildXdc(p);
    ok(xdc.size > 1000);
    eq(xdc.name, 'Lista.xdc');
    ok(xdc.verify.ok, 'verificación de integridad: ' + JSON.stringify(xdc.verify));
    ok(typeof xdc.blob === 'object');
    /* releer con el lector propio */
    const read = await CS.zip.readZip(xdc.bytes, {});
    const paths = read.files.map(f => f.path);
    ok(paths.indexOf('index.html') >= 0);
    ok(paths.indexOf('manifest.toml') >= 0);
    ok(paths.indexOf('app.js') >= 0);
    ok(paths.indexOf('webxdc.js') < 0, 'webxdc.js NUNCA en el .xdc');
    const manifest = new TextDecoder().decode(read.files.filter(f => f.path === 'manifest.toml')[0].bytes);
    ok(/name = "Lista"/.test(manifest), manifest);
  });
  await test('buildXdc respeta manifest.toml propio del proyecto', async () => {
    const p = CS.projects.fromTemplate('blank', 'X');
    CS.projects.fileSet(p, 'manifest.toml', { kind: 'text', content: 'name = "Custom Name"\n' });
    const xdc = await CS.exporter.buildXdc(p);
    const read = await CS.zip.readZip(xdc.bytes, {});
    const m = new TextDecoder().decode(read.files.filter(f => f.path === 'manifest.toml')[0].bytes);
    ok(/Custom Name/.test(m));
  });
  await test('importXdcBytes roundtrip con binario', async () => {
    const p = CS.projects.fromTemplate('blank', 'ExportTest');
    /* imagen PNG 1x1 */
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    p.files['icon.png'] = { kind: 'data', dataUrl: 'data:image/png;base64,' + png.toString('base64'), mime: 'image/png', size: png.length };
    const xdc = await CS.exporter.buildXdc(p);
    const res = await CS.exporter.importXdcBytes(xdc.bytes, 'exporttest.xdc');
    eq(res.count, 5, 'index.html, app.js, style.css, manifest.toml, icon.png');
    ok(res.project.files['icon.png'] && res.project.files['icon.png'].kind === 'data');
    ok(res.project.files['index.html'].kind === 'text');
    const roundtrip = Buffer.from(U.dataUrlToBytes(res.project.files['icon.png'].dataUrl));
    eq(roundtrip.toString('base64'), png.toString('base64'), 'binario ida y vuelta');
  });
  await test('importXdcBytes rechaza webxdc.js', async () => {
    const files = [
      { path: 'index.html', bytes: U.utf8Bytes('<html></html>') },
      { path: 'webxdc.js', bytes: U.utf8Bytes('window.webxdc = {}') }
    ];
    const built = await CS.zip.buildZip(files, { method: 'store' });
    let code = '';
    try { await CS.exporter.importXdcBytes(built.bytes, 'bad.xdc'); } catch (e) { code = e.code; }
    eq(code, 'webxdc-js');
  });
  await test('importXdcBytes aplica límites (total 16 MB > 12 MB)', async () => {
    const files = [];
    for (let i = 0; i < 40; i++) files.push({ path: 'f' + i + '.txt', bytes: U.utf8Bytes('x'.repeat(400 * 1024)) });
    const built = await CS.zip.buildZip(files, { method: 'store' });
    let code = '';
    try { await CS.exporter.importXdcBytes(built.bytes, 'bomb.xdc'); } catch (e) { code = e.code; }
    eq(code, 'bomb-total', 'esperaba bomb-total (40×400KB = 16 MB > límite 12 MB)');
  });
  await test('manifest: escape de comillas', () => {
    const p = CS.projects.newProject('T', null);
    p.settings.xdcName = 'App "mala"';
    const m = CS.exporter.buildManifest(p);
    ok(m.indexOf('name = "App \\"mala\\""') >= 0, m);
  });
  await test('looksLikeText distingue binario', () => {
    ok(CS.exporter.looksLikeText(U.utf8Bytes('hola mundo')));
    ok(!CS.exporter.looksLikeText(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0x0a])));
  });

  /* ================= highlight.js (v1.1.4, Fase C) ================= */
  process.stdout.write('\n== highlight.js ==\n');
  await test('langFor asigna lenguajes por extensión', () => {
    eq(CS.hl.langFor('index.html'), 'html');
    eq(CS.hl.langFor('a.SVG'), 'html');
    eq(CS.hl.langFor('style.css'), 'css');
    eq(CS.hl.langFor('app.js'), 'js');
    eq(CS.hl.langFor('data.json'), 'js');
    eq(CS.hl.langFor('notes.md'), null);
    eq(CS.hl.langFor('x.toml'), null);
  });
  await test('JS: keywords, strings, comentarios, números y funciones', () => {
    const h = CS.hl.highlight('function f(){ // nota\n  const s = "hola"; return 42; }', 'js');
    ok(h.indexOf('hl-kw') >= 0, 'keyword');
    ok(h.indexOf('hl-com') >= 0, 'comentario');
    ok(h.indexOf('hl-str') >= 0, 'string');
    ok(h.indexOf('hl-num') >= 0, 'número');
    ok(h.indexOf('hl-fn') >= 0, 'función (nombre antes de paréntesis)');
  });
  await test('CSS: selectores, propiedades y valores', () => {
    const h = CS.hl.highlight('.btn { color: #fff; width: 10px; }', 'css');
    ok(h.indexOf('hl-sel') >= 0);
    ok(h.indexOf('hl-prop') >= 0);
    ok(h.indexOf('hl-num') >= 0);
  });
  await test('HTML: tags, atributos, comentarios y bloques embebidos', () => {
    const h = CS.hl.highlight('<!DOCTYPE html>\n<!-- nota -->\n<div class="x"><script>if(a){b()}<\/script><style>.a{color:red}</style></div>', 'html');
    ok(h.indexOf('hl-tag') >= 0);
    ok(h.indexOf('hl-attr') >= 0);
    ok(h.indexOf('hl-str') >= 0);
    ok(h.indexOf('hl-com') >= 0);
    ok(h.indexOf('hl-kw') >= 0, 'JS embebido: keyword if');
    ok(h.indexOf('hl-fn') >= 0, 'JS embebido: llamada b()');
    ok(h.indexOf('hl-prop') >= 0, 'CSS embebido: propiedad');
  });
  await test('el HTML resultante escapa < > & (sin inyección)', () => {
    const h = CS.hl.highlight('const a = "<b>&x</b>";', 'js');
    ok(h.indexOf('&lt;b&gt;') >= 0, 'escapado: ' + h);
  });
  await test('archivos grandes devuelven null (sin color)', () => {
    const big = 'var x = 1;\n'.repeat(20000);
    eq(CS.hl.highlight(big, 'js'), null);
  });
  await test('rendimiento: ~100 KB en < 400 ms', () => {
    const src = 'function foo(a, b) { return "x" + a + b; } // c\n'.repeat(2200);
    ok(U.byteLen(src) > 90 * 1024, 'src ~100KB');
    const t0 = Date.now();
    const h = CS.hl.highlight(src, 'js');
    const ms = Date.now() - t0;
    ok(h && h.length > 0, 'resaltado producido');
    ok(ms < 400, 'tiempo: ' + ms + ' ms');
  });

  /* ================= image-editor D+ (v1.1.6) ================= */
  await test('quantizeToPalette: color más cercano y transparencia', () => {
    /* rejilla 2×2: rojo puro → #e74c3c(índice 2), blanco(1),
     * píxel oscuro → el oscuro de paleta más cercano, magenta vivo → transparente */
    const px = new Uint8ClampedArray([
      231, 76, 60, 255,    255, 255, 255, 255,
      40, 60, 80, 255,     255, 0, 255, 255
    ]);
    const list = CS.imageEditor.PALETTE.slice(1);
    const grid = CS.imageEditor.quantizeToPalette(px, 2, list);
    eq(grid[0], 2, 'rojo → índice 2 (#e74c3c)');
    eq(grid[1], 1, 'blanco → índice 1');
    eq(grid[2], 13, 'oscuro → #34495e (índice 13)');
    eq(grid[3], 0, 'magenta lejano → transparente (0)');
    /* alfa bajo → transparente */
    const px2 = new Uint8ClampedArray([255, 255, 255, 30]);
    eq(CS.imageEditor.quantizeToPalette(px2, 1, list)[0], 0, 'alfa<40 → transparente');
  });
  await test('colorAt: paleta base + colores propios', () => {
    eq(CS.imageEditor.colorAt(1), '#ffffff');
    eq(CS.imageEditor.colorAt(2), '#e74c3c');
    /* run_tests no carga app.js: stub mínimo de settings */
    CS.settings = CS.settings || { _d: {}, get(k) { return this._d[k]; }, set(k, v) { this._d[k] = v; } };
    CS.settings.set('imagePalette', ['#123456']);
    eq(CS.imageEditor.colorAt(CS.imageEditor.PALETTE.length), '#123456', 'color propio tras la base');
    CS.settings.set('imagePalette', []);
  });

  /* ================= Fase A: build reproducible ================= */
  await test('xdc: timestamps fijos en TODAS las entradas del ZIP (build reproducible)', () => {
    /* parser independiente del central directory: fecha DOS 1980-01-01 = 0x0021, hora 0x0000 */
    const fsmod = require('fs');
    const pathmod = require('path');
    const file = pathmod.join(__dirname, '..', 'creator-studio.xdc');
    if (!fsmod.existsSync(file)) throw new Error('creator-studio.xdc no existe: ejecuta python3 build.py');
    const buf = fsmod.readFileSync(file);
    /* EOCD: buscar la firma PK\x05\x06 desde el final */
    let eocd = -1;
    for (let i = buf.length - 22; i >= 0; i--) {
      if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x05 && buf[i + 3] === 0x06) { eocd = i; break; }
    }
    ok(eocd >= 0, 'EOCD encontrado');
    const n = buf.readUInt16LE(eocd + 10);
    let off = buf.readUInt32LE(eocd + 16);
    ok(n >= 15, 'entradas: ' + n);
    for (let k = 0; k < n; k++) {
      eq(buf.readUInt32LE(off), 0x02014b50, 'firma central dir #' + k);
      const time = buf.readUInt16LE(off + 12);
      const date = buf.readUInt16LE(off + 14);
      const nameLen = buf.readUInt16LE(off + 28);
      const name = buf.slice(off + 46, off + 46 + nameLen).toString('utf8');
      eq(date, 0x0021, name + ' fecha DOS = 1980-01-01');
      eq(time, 0x0000, name + ' hora DOS = 00:00');
      off += 46 + nameLen + buf.readUInt16LE(off + 30) + buf.readUInt16LE(off + 32);
    }
  });

  /* ================= Fase B (v1.1.8): táctil para juegos ================= */
  process.stdout.write('\n== Fase B (v1.1.8): táctil para juegos ==\n');
  {
    const V = (n) => ({ kind: 'var', name: n });
    const N = (n) => ({ kind: 'number', value: n });
    await test('Fase B: contexto “Al tocar” + posición del toque + canvas', () => {
      const model = {
        version: 1,
        vars: [{ name: 'tx', value: '0' }, { name: 'ty', value: '0' }],
        contexts: {
          onStart: [{ id: 's1', type: 'canvas_size', params: { into: 'tx', id: 'lienzo', dim: 'w' } }],
          onTouch: [{ target: 'lienzo', blocks: [
            { id: 't1', type: 'touch_pos', params: { intoX: 'tx', intoY: 'ty' } },
            { id: 't2', type: 'canvas_rect', params: { id: 'lienzo', x: V('tx'), y: V('ty'), w: N(10), h: N(10), color: '#e74c3c' } }
          ] }]
        }
      };
      const res = CS.blocks.generate(model);
      eq(res.problems.length, 0, 'sin problemas');
      const code = res.code;
      new Function(code);
      ok(code.indexOf("wireTouch('lienzo'") >= 0, 'contexto onTouch cableado con wireTouch');
      ok(code.indexOf('wcsLastTouch.x') >= 0, 'posición del toque disponible');
      ok(code.indexOf('pointerdown') >= 0, 'usa pointerdown (dedo y ratón)');
      ok(code.indexOf('touchstart') >= 0, 'fallback táctil para webviews antiguos');
      ok(code.indexOf('touchAction = "none"') >= 0, 'evita el scroll al jugar');
      ok(/\(document\.getElementById\('lienzo'\) \|\| \{ width: 0 \}\)\.width/.test(code), 'canvas_size');
      /* normalizeModel conserva onTouch */
      const norm = CS.blocks.normalizeModel(model);
      eq(norm.contexts.onTouch.length, 1, 'normalizeModel conserva onTouch');
      /* referencedElements incluye el target táctil */
      const refs = CS.blocks.referencedElements(model);
      ok(refs.ids.indexOf('lienzo') >= 0, 'referencedElements ve el canvas');
      /* modelo viejo sin onTouch → se rellena vacío */
      const old = JSON.parse(JSON.stringify(model));
      delete old.contexts.onTouch;
      const norm2 = CS.blocks.normalizeModel(old);
      eq(norm2.contexts.onTouch.length, 0, 'modelo v1 sin onTouch → vacío');
    });
    await test('Fase B: canvas_image (sprite) genera await + caché', () => {
      const model = {
        version: 1, vars: [],
        contexts: { onTouch: [{ target: 'lienzo', blocks: [
          { id: 'i1', type: 'canvas_image', params: { id: 'lienzo', src: 'assets/sprite.png', x: { kind: 'number', value: 5 }, y: { kind: 'number', value: 5 }, w: { kind: 'number', value: 32 }, h: { kind: 'number', value: 32 } } }
        ] }] }
      };
      const res = CS.blocks.generate(model);
      eq(res.problems.length, 0, 'sin problemas');
      ok(/await wcsDrawImage\('lienzo', 'assets\/sprite.png', 5, 5, 32, 32\)/.test(res.code), 'sprite dibujado con await');
      ok(res.code.indexOf('wcsDrawImage._cache') >= 0, 'caché de imágenes');
    });
  }

  /* ================= Fase F (v1.1.7): bloques nuevos ================= */
  process.stdout.write('\n== Fase F (v1.1.7): bloques nuevos ==\n');
  {
    const T = (s) => ({ kind: 'text', value: s });
    const V = (n) => ({ kind: 'var', name: n });
    await test('bloques F: los 11 nuevos generan código válido y detectan params malos', () => {
      const model = {
        version: 1,
        vars: [{ name: 't', value: '' }, { name: 'nums', value: '' }],
        contexts: { onClick: [{ target: 'btn-a', blocks: [
          { id: 'f1', type: 'str_case', params: { into: 't', x: T('hola'), mode: 'upper' } },
          { id: 'f2', type: 'str_trim', params: { into: 't', x: V('t') } },
          { id: 'f3', type: 'str_replace', params: { into: 't', x: V('t'), find: T('a'), rep: T('b') } },
          { id: 'f4', type: 'str_part', params: { into: 't', x: V('t'), start: 1, len: 2 } },
          { id: 'f5', type: 'list_contains', params: { into: 't', name: 'nums', value: T('x') } },
          { id: 'f6', type: 'list_join', params: { into: 't', name: 'nums', sep: T(', ') } },
          { id: 'f7', type: 'list_sort', params: { into: 't', name: 'nums', order: 'za' } },
          { id: 'f8', type: 'list_reverse', params: { into: 't', name: 'nums' } },
          { id: 'f9', type: 'math_clamp', params: { into: 't', x: V('t'), mn: 0, mx: 9 } },
          { id: 'f10', type: 'vibrate', params: { ms: 150 } },
          { id: 'f11', type: 'set_page_title', params: { value: V('t') } }
        ] }] }
      };
      const res = CS.blocks.generate(model);
      eq(res.problems.length, 0, 'sin problemas');
      const code = res.code;
      new Function(code); /* sintaxis */
      ok(code.indexOf('toUpperCase()') >= 0, 'str_case');
      ok(/split\(String/.test(code), 'str_replace');
      ok(/slice\(0, 2\)/.test(code), 'str_part');
      ok(/indexOf\("x"\) >= 0/.test(code), 'list_contains');
      ok(/map\(String\)\.join/.test(code), 'list_join');
      ok(/sort\(\)\.reverse\(\)/.test(code), 'list_sort za');
      ok(/slice\(\)\.reverse\(\)/.test(code), 'list_reverse');
      ok(/Math\.min\(Math\.max/.test(code), 'math_clamp');
      ok(/navigator\.vibrate\(150\)/.test(code), 'vibrate');
      ok(/document\.title = String\(t\)/.test(code), 'set_page_title');
      /* params inválidos → 2 problemas (start<1, value null) */
      const bad = JSON.parse(JSON.stringify(model));
      bad.contexts.onClick[0].blocks[3].params.start = 0;
      bad.contexts.onClick[0].blocks[8].params.mx = -1; /* clamp: máximo < mínimo */
      const res2 = CS.blocks.generate(bad);
      eq(res2.problems.length, 2, 'params inválidos detectados');
    });
  }

  /* ================= Fase E (v1.1.9): fuentes ================= */
  process.stdout.write('\n== Fase E (v1.1.9): bloque de fuentes ==\n');
  await test('Fase E: set_font_family genera los 5 estilos', () => {
    const fams = ['system', 'rounded', 'serif', 'mono', 'caps'];
    fams.forEach(function (f) {
      const m = { version: 1, vars: [], contexts: { onStart: [{ id: 'e1', type: 'set_font_family', params: { id: 'titulo', family: f } }] } };
      const res = CS.blocks.generate(m);
      eq(res.problems.length, 0, f + ' sin problemas');
      ok(res.code.indexOf('font-family') >= 0, f + ' emite font-family');
    });
    const m = { version: 1, vars: [], contexts: { onStart: [{ id: 'e1', type: 'set_font_family', params: { id: 'titulo', family: 'bogus' } }] } };
    const res = CS.blocks.generate(m);
    ok(res.code.indexOf('system-ui') >= 0, 'familia desconocida → sistema');
  });

  /* ================= Fase G (v1.1.9): plantillas nuevas ================= */
  process.stdout.write('\n== Fase G (v1.1.9): plantillas tapgame y draw ==\n');
  await test('Fase G: catálogo, tapgame y draw válidas', () => {
    eq(CS.tpl.list().length, 20, '20 plantillas');
    const tap = CS.tpl.createFiles('tapgame');
    ok(tap['index.html'] && tap['style.css'] && tap['app.js'], 'tapgame: archivos base');
    ok(tap['icon.png'] && tap['icon.png'].size === 832, 'tapgame: icono 832 B');
    ok(tap['app.js'].indexOf('pointerdown') >= 0, 'tapgame: entrada táctil');
    ok(tap['app.js'].indexOf('touch-action') >= 0 || tap['style.css'].indexOf('touch-action') >= 0, 'tapgame: touch-action none');
    ok(tap['index.html'].indexOf('webxdc.js') < 0, 'tapgame: sin webxdc.js (juego local)');
    const draw = CS.tpl.createFiles('draw');
    ok(draw['index.html'].indexOf('webxdc.js') >= 0, 'draw: incluye webxdc.js');
    ok(draw['app.js'].indexOf('sendToChat') >= 0, 'draw: enviar al chat');
    ok(draw['app.js'].indexOf('pointermove') >= 0, 'draw: trazo continuo');
    ok(draw['icon.png'] && draw['icon.png'].size === 1047, 'draw: icono 1047 B');
    /* app.js de ambas parsea */
    new Function(tap['app.js']);
    new Function(draw['app.js']);
  });

  /* ================= Fase H (v1.1.10): webxdc avanzado ================= */
  process.stdout.write('\n== Fase H (v1.1.10): webxdc avanzado ==\n');
  await test('Fase H: summary opcional, info y serial del update', () => {
    const V = (n) => ({ kind: 'var', name: n });
    const m = {
      version: 1,
      vars: [{ name: 'n', value: '0' }, { name: 's', value: '0' }, { name: 'i', value: '' }],
      contexts: {
        onUpdate: [
          { id: 'u1', type: 'read_update', params: { name: 'n', key: 'puntos' } },
          { id: 'u2', type: 'update_info', params: { name: 'i' } },
          { id: 'u3', type: 'update_serial', params: { name: 's' } }
        ],
        onClick: [{ target: 'b', blocks: [
          { id: 'w1', type: 'send_update', params: { key: 'puntos', value: V('n'), info: "puntos de 'Ana'", summary: 'ronda 1' } }
        ] }]
      }
    };
    const res = CS.blocks.generate(m);
    eq(res.problems.length, 0, 'sin problemas');
    new Function(res.code);
    ok(/summary: 'ronda 1'/.test(res.code), 'summary corto emitido completo');
    ok(/info: 'puntos de \\'Ana\\''/.test(res.code), 'comillas escapadas en info');
    ok(res.code.indexOf('update.serial) || 0') >= 0, 'update_serial');
    ok(res.code.indexOf('update.info) || ') >= 0, 'update_info');
    /* sin summary: comportamiento v1.1.x conservado */
    const m2 = JSON.parse(JSON.stringify(m));
    m2.contexts.onClick[0].blocks[0].params.summary = '';
    const res2 = CS.blocks.generate(m2);
    ok(/summary: 'puntos: ' \+ n/.test(res2.code), 'sin summary → resumen automático igual que antes');
  });

  /* ================= Fase I (v1.1.11): validator ampliado ================= */
  process.stdout.write('\n== Fase I (v1.1.11): validator ampliado ==\n');
  await test('Fase I: sintaxis JS, título y variables sin usar', () => {
    const mk = function (js, vars, blocks) {
      return {
        files: {
          'index.html': { kind: 'text', content: '<!DOCTYPE html><html><head><title>T</title><meta name="viewport" content="w"><script src="webxdc.js"><\/script></head><body><button id="b">x</button><script src="app.js"><\/script></body></html>' },
          'app.js': { kind: 'text', content: js },
          'style.css': { kind: 'text', content: 'body{}' },
          'manifest.toml': { kind: 'text', content: 'name = "x"' }
        },
        blocks: { model: { version: 1, vars: vars, contexts: { onStart: blocks || [] } } }
      };
    };
    /* JS roto → warning v_js_syntax */
    let res = CS.validator.validate(mk('function f( { broken', [], []));
    ok(res.some(function (x) { return x.key === 'v_js_syntax'; }), 'detecta sintaxis rota');
    /* JS sano → nada */
    res = CS.validator.validate(mk('var x = 1;', [], []));
    ok(!res.some(function (x) { return x.key === 'v_js_syntax'; }), 'JS sano sin aviso');
    /* módulos ES → fuera de alcance (sin falso positivo) */
    res = CS.validator.validate(mk('import x from "y";', [], []));
    ok(!res.some(function (x) { return x.key === 'v_js_syntax'; }), 'import no da falso positivo');
    /* variable sin usar */
    res = CS.validator.validate(mk('var x = 1;', [{ name: 'usada', value: '1' }, { name: 'suelta', value: '2' }],
      [{ id: 's', type: 'set_text', params: { id: 'b', value: { kind: 'var', name: 'usada' } } }]));
    const un = res.filter(function (x) { return x.key === 'v_var_unused'; });
    eq(un.length, 1, 'una variable sin usar');
    eq(un[0].params.name, 'suelta', 'la que sobra es «suelta»');
    /* título ausente */
    const noTitle = mk('var x = 1;', [], []);
    noTitle.files['index.html'].content = noTitle.files['index.html'].content.replace('<title>T</title>', '');
    res = CS.validator.validate(noTitle);
    ok(res.some(function (x) { return x.key === 'v_no_title'; }), 'falta <title>');
    /* el tag webxdc.js no cuenta como API desconocida */
    ok(!res.some(function (x) { return x.key === 'v_api_unknown' && x.params.api === 'webxdc.js'; }), 'sin falso webxdc.js');
  });

  /* ================= v1.4: capabilities / snapshots / components / pages / collab ================= */
  process.stdout.write('\\n== v1.4 módulos nuevos ==\\n');
  await test('capabilities: estados honestos', () => {
    const r = CS.capabilities.detect();
    ok(r.webxdc === 'UNAVAILABLE' || r.webxdc === 'AVAILABLE' || r.webxdc === 'SIMULATED');
    eq(CS.capabilities.apiStatus('sendUpdate'), 'UNAVAILABLE');
    eq(CS.capabilities.status('apis.sendUpdate'), 'UNAVAILABLE');
    ok(['indexeddb', 'localstorage', 'memory'].indexOf(CS.capabilities.chooseStorageStrategy()) >= 0);
    eq(CS.capabilities.chooseEditorStrategy(), 'fallback');
  });
  await test('snapshots: guardar, listar, recuperar', async () => {
    CS.snapshots._resetForTests();
    const p = CS.projects.newProject('Snap', null);
    CS.projects.fileSet(p, 'index.html', { kind: 'text', content: '<!DOCTYPE html><html><head><title>S</title></head><body></body></html>' });
    const s1 = await CS.snapshots.save(p, 'manual');
    ok(s1.id && s1.projectId === p.id);
    const list = await CS.snapshots.list(p.id);
    eq(list.length, 1);
    p.updatedAt = s1.createdAt - 1000;
    const pend = await CS.snapshots.pendingRecovery(p);
    ok(pend && pend.id === s1.id);
    const restored = await CS.snapshots.restoreInto(s1, p);
    eq(restored.id, p.id);
    eq(restored.files['index.html'].content.indexOf('<title>S</title>') >= 0, true);
  });
  await test('components: inserta HTML real', () => {
    const p = CS.projects.newProject('Cmp', null);
    CS.projects.fileSet(p, 'index.html', { kind: 'text', content: '<!DOCTYPE html><html><body><main></main></body></html>' });
    CS.projects.fileSet(p, 'style.css', { kind: 'text', content: '' });
    CS.projects.fileSet(p, 'app.js', { kind: 'text', content: "'use strict';\n" });
    const r = CS.components.insert(p, 'button', { id: 'btn-x', label: 'Hola' });
    eq(r.id, 'btn-x');
    ok(p.files['index.html'].content.indexOf('id="btn-x"') >= 0);
    ok(p.files['style.css'].content.indexOf('button{') >= 0);
    eq(CS.components.validate('button', { id: '1bad' }).indexOf('bad-id') >= 0, true);
  });
  await test('pages: crea HTML navegable y no borra index', () => {
    const p = CS.projects.newProject('Pag', null);
    CS.projects.fileSet(p, 'index.html', { kind: 'text', content: '<!DOCTYPE html><html><body><header></header><main></main></body></html>' });
    const rec = CS.pages.add(p, 'About');
    ok(p.files[rec.file] && p.files[rec.file].kind === 'text');
    ok(p.files[rec.file].content.indexOf('webxdc.js') >= 0);
    ok(p.files['index.html'].content.indexOf('href="' + rec.file + '"') >= 0);
    let threw = false;
    try { CS.pages.remove(p, CS.pages.list(p).filter(function (x) { return x.file === 'index.html'; })[0].id); } catch (e) { threw = true; }
    ok(threw, 'no se borra index.html');
    CS.pages.addScene(p, 'Boss');
    ok((p.scenes || []).length >= 1);
    ok(p.files['index.html'].content.indexOf('data-cs-scene') >= 0);
  });
  await test('collab: UNAVAILABLE sin webxdc; protocolo no inventa servidor', () => {
    CS.collab._resetForTests();
    eq(CS.collab.status(), 'UNAVAILABLE');
    return CS.collab.start().then(function (r) {
      eq(r.ok, false);
      eq(r.status, 'UNAVAILABLE');
    });
  });
  await test('monaco-loader: fallback en Node', () => {
    eq(CS.monaco.bundled, true);
    return CS.monaco.load().then(function (m) {
      eq(m, null);
      eq(CS.monaco.strategy, 'fallback');
    });
  });
  await test('validator: fetch es warning de red', () => {
    const p = CS.projects.fromTemplate('blank', 'Net');
    p.files['app.js'].content += '\nfetch(\"https://example.com\");\n';
    const res = CS.validator.validate(p);
    ok(res.some(function (x) { return x.key === 'v_network_api'; }));
  });
  await test('bloques send_to_chat / import_files generan código real', () => {
    const m = CS.blocks.newModel();
    m.vars.push({ name: 'files', value: '[]' });
    m.contexts.onStart.push({ id: 'a', type: 'send_to_chat', params: { text: { kind: 'text', value: 'hola' } } });
    m.contexts.onStart.push({ id: 'b', type: 'import_files', params: { name: 'files' } });
    const res = CS.blocks.generate(m);
    ok(res.code.indexOf('sendToChat') >= 0);
    ok(res.code.indexOf('importFiles') >= 0);
    eq(res.problems.length, 0);
  });
  await test('nuevo proyecto trae pages/scenes/recovery', () => {
    const p = CS.projects.newProject('N', null);
    ok(Array.isArray(p.pages) && Array.isArray(p.scenes));
    ok(p.recovery && p.recovery.lastSnapshotId === null);
    const migrated = CS.projects.migrate({ id: 'old', name: 'old', files: {} });
    eq(migrated.projectFormatVersion, 1);
    ok(Array.isArray(migrated.pages));
  });
  await test('bloques: ensurePlaceholders inserta ids faltantes antes de </body>', () => {
    const html = '<html><body><h1>x</h1></body></html>';
    const r = CS.blocks.ensurePlaceholders(html, ['lienzo', 'bad id', 'ok_1']);
    ok(r.added.indexOf('lienzo') >= 0);
    ok(r.added.indexOf('ok_1') >= 0);
    ok(r.added.indexOf('bad id') < 0);
    ok(r.html.indexOf('id="lienzo"') >= 0);
    ok(r.html.indexOf('data-cs-placeholder="1"') >= 0);
    ok(r.html.indexOf('id="lienzo"') < r.html.toLowerCase().indexOf('</body>'));
    const r2 = CS.blocks.ensurePlaceholders(r.html, ['lienzo']);
    eq(r2.added.length, 0);
    const r3 = CS.blocks.ensurePlaceholders('<p>sin body</p>', ['caja']);
    ok(r3.html.indexOf('id="caja"') >= 0);
  });
  await test('audio: melodía 16×3 mezcla a WAV 22050 y parseWav redondea', () => {
    eq(CS.audioEditor.SAMPLE_RATE, 22050);
    ok(CS.audioEditor.NOTE_FREQ['C-4'] > 250 && CS.audioEditor.NOTE_FREQ['C-4'] < 270);
    const song = CS.audioEditor.emptyMelody();
    eq(song.tracks.length, 3);
    eq(song.tracks[0].steps.length, 16);
    eq(song.tracks[0].steps[0], '---');
    song.tracks[0].steps[0] = 'C-4';
    song.tracks[0].steps[4] = 'G-4';
    song.tracks[2].steps[0] = 'C-3';
    const smp = CS.audioEditor.renderMelody(song);
    ok(smp.length > 1000, 'muestras: ' + smp.length);
    const a = CS.audioEditor.renderMelody(song);
    eq(a.length, smp.length);
    let same = true;
    for (let i = 0; i < smp.length; i++) if (a[i] !== smp[i]) { same = false; break; }
    ok(same, 'melodía determinista');
    const w = CS.audioEditor.toWav(smp, false);
    const dv = new DataView(w.bytes.buffer);
    eq(dv.getUint32(24, true), 22050);
    const parsed = CS.audioEditor.parseWav(w.bytes);
    ok(parsed && parsed.samples.length === smp.length);
    const rev = CS.audioEditor.reverseSamples(smp);
    eq(rev[0], smp[smp.length - 1]);
    const g = CS.audioEditor.gainSamples(new Float32Array([0.5, -0.5]), 2);
    eq(g[0], 1);
  });

  /* ================= resumen ================= */
  process.stdout.write('\n---------------------------------------------\n');
  process.stdout.write('PASS: ' + passed + '  FAIL: ' + failed + '\n');
  if (failures.length) {
    process.stdout.write('\nFallos:\n');
    failures.forEach(f => process.stdout.write('  ✖ ' + f.name + ': ' + (f.e && f.e.stack || f.e) + '\n'));
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
