/* =========================================================================
 * Webxdc Creator Studio — pages.js
 * Multi-page HTML helpers and navigation links.
 * ========================================================================= */
'use strict';
(function () {
  const CS = (globalThis.CS = globalThis.CS || {});
  const U = CS.util;

  const NAV_MARKER = '/* cs-nav-runtime */';

  const NAV_RUNTIME = [
    NAV_MARKER,
    'window.CS_NAV = window.CS_NAV || (function () {',
    '  function pagesFromDom() {',
    '    var nav = document.querySelector(".cs-nav, #nav-a");',
    '    return nav;',
    '  }',
    '  function mount() {',
    '    var nav = pagesFromDom();',
    '    if (!nav) return;',
    '    if (nav.getAttribute("data-cs-mounted")) return;',
    '    nav.setAttribute("data-cs-mounted", "1");',
    '    var links = nav.querySelectorAll("a[href]");',
    '    if (links.length) return; /* ya hay enlaces reales */',
    '  }',
    '  return { mount: mount };',
    '})();',
    'if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { window.CS_NAV.mount(); });',
    'else window.CS_NAV.mount();',
    ''
  ].join('\n');

  function pageTemplate(name, file) {
    const title = String(name || file || 'Página');
    return [
      '<!DOCTYPE html>',
      '<html lang="es">',
      '<head>',
      '  <meta charset="utf-8">',
      '  <meta name="viewport" content="width=device-width, initial-scale=1">',
      '  <title>' + title.replace(/</g, '') + '</title>',
      '  <script src="webxdc.js"><\/script>',
      '  <link rel="stylesheet" href="style.css">',
      '</head>',
      '<body>',
      '  <header><p><a href="index.html">← Home</a></p><h1>' + title.replace(/</g, '') + '</h1></header>',
      '  <main>',
      '    <p id="output">Página «' + title.replace(/</g, '') + '».</p>',
      '  </main>',
      '  <script src="app.js"><\/script>',
      '</body>',
      '</html>',
      ''
    ].join('\n');
  }

  function discover(project) {
    const files = (CS.projects && CS.projects.fileList(project)) || Object.keys((project && project.files) || {});
    return files.filter(function (p) {
      const ext = U.extname(p);
      return ext === 'html' || ext === 'htm';
    }).sort();
  }

  function normalizeList(project) {
    if (!project.pages) project.pages = [];
    if (!Array.isArray(project.pages)) project.pages = [];
    const htmls = discover(project);
    const byFile = {};
    project.pages.forEach(function (pg) { if (pg && pg.file) byFile[pg.file] = pg; });
    htmls.forEach(function (f) {
      if (!byFile[f]) {
        const rec = { id: U.slugify(f.replace(/\.html?$/, '')) || U.uid(), name: f === 'index.html' ? 'Home' : f, file: f, isHome: f === 'index.html' };
        project.pages.push(rec);
        byFile[f] = rec;
      }
    });
    project.pages = project.pages.filter(function (pg) { return pg && project.files[pg.file]; });
    project.pages.forEach(function (pg) { pg.isHome = pg.file === 'index.html'; });
    return project.pages;
  }

  function list(project) {
    return normalizeList(project || (CS.projects && CS.projects.current));
  }

  function add(project, name) {
    project = project || CS.projects.current;
    if (!project) throw new Error('no-project');
    const base = U.slugify(name || 'page');
    let file = base + '.html';
    let n = 2;
    while (project.files[file]) { file = base + '-' + n + '.html'; n++; }
    if (!U.isSafePath(file)) throw new Error('bad-path');
    CS.projects.fileSet(project, file, { kind: 'text', content: pageTemplate(name || base, file) });
    if (!project.pages) project.pages = [];
    const rec = { id: U.uid(), name: String(name || base), file: file, isHome: false };
    project.pages.push(rec);
    linkFromIndex(project, rec);
    return rec;
  }

  function linkFromIndex(project, rec) {
    const idx = project.files['index.html'];
    if (!idx || idx.kind !== 'text') return;
    const href = rec.file;
    const label = rec.name;
    const a = '<a href="' + href + '">' + String(label).replace(/</g, '') + '</a>';
    if (idx.content.indexOf('href="' + href + '"') >= 0) return;
    if (/<nav[^>]*class="cs-nav"/.test(idx.content)) {
      idx.content = idx.content.replace(/(<nav[^>]*class="cs-nav"[^>]*>)/, '$1\n    ' + a);
      return;
    }
    if (/<\/header>/i.test(idx.content)) {
      idx.content = idx.content.replace(/<\/header>/i, '  <nav class="cs-nav">' + a + '</nav>\n</header>');
      return;
    }
    idx.content = idx.content.replace(/<body[^>]*>/i, function (m) {
      return m + '\n  <nav class="cs-nav">' + a + '</nav>';
    });
  }

  function remove(project, id) {
    project = project || CS.projects.current;
    const pages = list(project);
    const rec = pages.filter(function (p) { return p.id === id; })[0];
    if (!rec) return false;
    if (rec.file === 'index.html') throw new Error('cannot-delete-index');
    CS.projects.fileDelete(project, rec.file);
    project.pages = project.pages.filter(function (p) { return p.id !== id; });
    return true;
  }

  function addScene(project, name) {
    project = project || CS.projects.current;
    if (!project.scenes) project.scenes = [];
    const rec = { id: U.uid(), name: String(name || 'Escena'), file: null };
    /* Scene = section in index.html, truly navigable. */
    const sid = 'scene-' + U.slugify(rec.name) + '-' + rec.id.slice(0, 6);
    rec.file = 'index.html#' + sid;
    rec.domId = sid;
    const idx = project.files['index.html'];
    if (idx && idx.kind === 'text') {
      const block = '<section id="' + sid + '" class="cs-scene" data-cs-scene="' + U.esc(rec.name) + '"><h2>' + U.esc(rec.name) + '</h2></section>';
      if (idx.content.indexOf('id="' + sid + '"') < 0) {
        if (/<\/main>/i.test(idx.content)) idx.content = idx.content.replace(/<\/main>/i, '  ' + block + '\n</main>');
        else if (/<\/body>/i.test(idx.content)) idx.content = idx.content.replace(/<\/body>/i, '  ' + block + '\n</body>');
        else idx.content += '\n' + block;
      }
    }
    project.scenes.push(rec);
    return rec;
  }

  function ensureNavRuntime(project) {
    project = project || CS.projects.current;
    if (!project.files['app.js']) project.files['app.js'] = { kind: 'text', content: "'use strict';\n" };
    if (project.files['app.js'].kind !== 'text') return false;
    if (project.files['app.js'].content.indexOf(NAV_MARKER) >= 0) return false;
    project.files['app.js'].content += (project.files['app.js'].content.slice(-1) === '\n' ? '' : '\n') + NAV_RUNTIME;
    return true;
  }

  CS.pages = {
    list: list,
    add: add,
    remove: remove,
    discover: discover,
    addScene: addScene,
    ensureNavRuntime: ensureNavRuntime,
    pageTemplate: pageTemplate
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = CS.pages; }
})();
