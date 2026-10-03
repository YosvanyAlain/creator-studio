/* =========================================================================
 * Webxdc Creator Studio — components.js
 * Reusable HTML/CSS/JS components inserted into pages.
 * ========================================================================= */
'use strict';
(function () {
  const CS = (globalThis.CS = globalThis.CS || {});
  const U = CS.util;

  const DEFS = {
    button: {
      es: { name: 'Botón', desc: 'Botón pulsable con etiqueta.' },
      en: { name: 'Button', desc: 'Clickable button with a label.' },
      props: [
        { key: 'id', def: 'btn-main', es: 'id', en: 'id' },
        { key: 'label', def: 'Acción', es: 'Etiqueta', en: 'Label' }
      ],
      html: function (p) {
        return '<button id="' + U.esc(p.id) + '" type="button">' + U.esc(p.label) + '</button>';
      },
      css: 'button{font:inherit;border:0;border-radius:10px;padding:12px 16px;background:#3b5bdb;color:#fff;min-height:44px;cursor:pointer}',
      js: function (p) {
        return "document.getElementById('" + p.id + "') && document.getElementById('" + p.id + "').addEventListener('click', function () { console.log('click " + p.id + "'); });";
      }
    },
    input: {
      es: { name: 'Campo de texto', desc: 'Input de una línea.' },
      en: { name: 'Text input', desc: 'Single-line input.' },
      props: [
        { key: 'id', def: 'field-a', es: 'id', en: 'id' },
        { key: 'placeholder', def: '', es: 'Placeholder', en: 'Placeholder' }
      ],
      html: function (p) {
        return '<label class="cs-field"><span class="cs-field-label">' + U.esc(p.id) + '</span>' +
          '<input id="' + U.esc(p.id) + '" type="text" placeholder="' + U.esc(p.placeholder) + '"></label>';
      },
      css: '.cs-field{display:flex;flex-direction:column;gap:4px;margin:8px 0}.cs-field input{font:inherit;padding:10px;border:1px solid #d9dfe8;border-radius:8px}',
      js: null
    },
    text: {
      es: { name: 'Texto', desc: 'Párrafo de texto.' },
      en: { name: 'Text', desc: 'Paragraph of text.' },
      props: [
        { key: 'id', def: 'txt-a', es: 'id', en: 'id' },
        { key: 'content', def: 'Hola', es: 'Contenido', en: 'Content' }
      ],
      html: function (p) {
        return '<p id="' + U.esc(p.id) + '">' + U.esc(p.content) + '</p>';
      },
      css: '',
      js: null
    },
    image: {
      es: { name: 'Imagen', desc: 'Imagen del proyecto (ruta relativa).' },
      en: { name: 'Image', desc: 'Project image (relative path).' },
      props: [
        { key: 'id', def: 'img-a', es: 'id', en: 'id' },
        { key: 'src', def: 'icon.png', es: 'Ruta', en: 'Path' },
        { key: 'alt', def: '', es: 'Texto alt', en: 'Alt text' }
      ],
      html: function (p) {
        return '<img id="' + U.esc(p.id) + '" src="' + U.esc(p.src) + '" alt="' + U.esc(p.alt) + '">';
      },
      css: 'img{max-width:100%;height:auto}',
      js: null
    },
    video: {
      es: { name: 'Vídeo', desc: 'Reproductor de vídeo local.' },
      en: { name: 'Video', desc: 'Local video player.' },
      props: [
        { key: 'id', def: 'vid-a', es: 'id', en: 'id' },
        { key: 'src', def: 'assets/clip.mp4', es: 'Ruta', en: 'Path' }
      ],
      html: function (p) {
        return '<video id="' + U.esc(p.id) + '" src="' + U.esc(p.src) + '" controls playsinline></video>';
      },
      css: 'video{max-width:100%}',
      js: null
    },
    audio: {
      es: { name: 'Audio', desc: 'Reproductor de audio local.' },
      en: { name: 'Audio', desc: 'Local audio player.' },
      props: [
        { key: 'id', def: 'aud-a', es: 'id', en: 'id' },
        { key: 'src', def: 'assets/sound.wav', es: 'Ruta', en: 'Path' }
      ],
      html: function (p) {
        return '<audio id="' + U.esc(p.id) + '" src="' + U.esc(p.src) + '" controls></audio>';
      },
      css: 'audio{width:100%}',
      js: null
    },
    card: {
      es: { name: 'Tarjeta', desc: 'Contenedor con título y cuerpo.' },
      en: { name: 'Card', desc: 'Container with title and body.' },
      props: [
        { key: 'id', def: 'card-a', es: 'id', en: 'id' },
        { key: 'title', def: 'Título', es: 'Título', en: 'Title' },
        { key: 'body', def: 'Contenido', es: 'Cuerpo', en: 'Body' }
      ],
      html: function (p) {
        return '<article id="' + U.esc(p.id) + '" class="cs-card"><h2>' + U.esc(p.title) + '</h2><p>' + U.esc(p.body) + '</p></article>';
      },
      css: '.cs-card{background:#fff;border:1px solid #d9dfe8;border-radius:12px;padding:14px;margin:10px 0}',
      js: null
    },
    list: {
      es: { name: 'Lista', desc: 'Lista vacía lista para rellenar por JS.' },
      en: { name: 'List', desc: 'Empty list ready to be filled by JS.' },
      props: [{ key: 'id', def: 'list-a', es: 'id', en: 'id' }],
      html: function (p) { return '<ul id="' + U.esc(p.id) + '" class="cs-list"></ul>'; },
      css: '.cs-list{list-style:none;padding:0;margin:0}.cs-list li{padding:10px 0;border-bottom:1px solid #d9dfe8}',
      js: null
    },
    modal: {
      es: { name: 'Modal', desc: 'Diálogo oculto; se muestra con JS.' },
      en: { name: 'Modal', desc: 'Hidden dialog; shown via JS.' },
      props: [
        { key: 'id', def: 'modal-a', es: 'id', en: 'id' },
        { key: 'title', def: 'Aviso', es: 'Título', en: 'Title' }
      ],
      html: function (p) {
        return '<div id="' + U.esc(p.id) + '" class="cs-modal" hidden role="dialog" aria-modal="true">' +
          '<div class="cs-modal-box"><h2>' + U.esc(p.title) + '</h2>' +
          '<div class="cs-modal-body"></div>' +
          '<button type="button" data-cs-close="' + U.esc(p.id) + '">OK</button></div></div>';
      },
      css: '.cs-modal{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center}.cs-modal[hidden]{display:none}.cs-modal-box{background:#fff;border-radius:12px;padding:16px;min-width:240px}',
      js: function (p) {
        return "(function(){var m=document.getElementById('" + p.id + "'); if(!m) return; m.querySelector('[data-cs-close]') && m.querySelector('[data-cs-close]').addEventListener('click', function(){ m.hidden = true; });})();";
      }
    },
    navigation: {
      es: { name: 'Navegación', desc: 'Barra de enlaces entre páginas del proyecto.' },
      en: { name: 'Navigation', desc: 'Link bar between project pages.' },
      props: [{ key: 'id', def: 'nav-a', es: 'id', en: 'id' }],
      html: function (p) {
        return '<nav id="' + U.esc(p.id) + '" class="cs-nav"></nav>';
      },
      css: '.cs-nav{display:flex;gap:8px;flex-wrap:wrap;padding:8px 0}.cs-nav a{padding:8px 12px;border-radius:8px;background:#eef2ff;color:#1c2430;text-decoration:none}',
      js: function () {
        return '(function(){if (window.CS_NAV && window.CS_NAV.mount) window.CS_NAV.mount();})();';
      }
    },
    tabs: {
      es: { name: 'Pestañas', desc: 'Tabs con dos paneles.' },
      en: { name: 'Tabs', desc: 'Tabs with two panels.' },
      props: [{ key: 'id', def: 'tabs-a', es: 'id', en: 'id' }],
      html: function (p) {
        const a = p.id + '-a'; const b = p.id + '-b';
        return '<div id="' + U.esc(p.id) + '" class="cs-tabs">' +
          '<div class="cs-tablist" role="tablist">' +
          '<button type="button" role="tab" aria-selected="true" data-cs-tab="' + a + '">A</button>' +
          '<button type="button" role="tab" data-cs-tab="' + b + '">B</button></div>' +
          '<div id="' + a + '" role="tabpanel">Panel A</div>' +
          '<div id="' + b + '" role="tabpanel" hidden>Panel B</div></div>';
      },
      css: '.cs-tablist{display:flex;gap:4px}.cs-tablist button{padding:8px 12px}',
      js: function (p) {
        return "(function(){var root=document.getElementById('" + p.id + "'); if(!root) return; root.addEventListener('click', function(ev){ var t=ev.target.getAttribute && ev.target.getAttribute('data-cs-tab'); if(!t) return; root.querySelectorAll('[role=tabpanel]').forEach(function(x){ x.hidden = x.id!==t; }); root.querySelectorAll('[role=tab]').forEach(function(x){ x.setAttribute('aria-selected', x.getAttribute('data-cs-tab')===t ? 'true':'false'); }); });})();";
      }
    },
    form: {
      es: { name: 'Formulario', desc: 'Formulario con nombre y envío local.' },
      en: { name: 'Form', desc: 'Form with name and local submit.' },
      props: [{ key: 'id', def: 'form-a', es: 'id', en: 'id' }],
      html: function (p) {
        return '<form id="' + U.esc(p.id) + '" class="cs-form">' +
          '<label>Nombre <input name="name" required></label>' +
          '<button type="submit">Enviar</button></form>';
      },
      css: '.cs-form{display:flex;flex-direction:column;gap:8px}',
      js: function (p) {
        return "document.getElementById('" + p.id + "') && document.getElementById('" + p.id + "').addEventListener('submit', function(ev){ ev.preventDefault(); console.log('form', new FormData(ev.target).get('name')); });";
      }
    },
    container: {
      es: { name: 'Contenedor', desc: 'Caja genérica.' },
      en: { name: 'Container', desc: 'Generic box.' },
      props: [{ key: 'id', def: 'box-a', es: 'id', en: 'id' }],
      html: function (p) { return '<div id="' + U.esc(p.id) + '" class="cs-container"></div>'; },
      css: '.cs-container{padding:12px}',
      js: null
    },
    grid: {
      es: { name: 'Grid', desc: 'Rejilla de 2 columnas.' },
      en: { name: 'Grid', desc: 'Two-column grid.' },
      props: [{ key: 'id', def: 'grid-a', es: 'id', en: 'id' }],
      html: function (p) { return '<div id="' + U.esc(p.id) + '" class="cs-grid"><div>1</div><div>2</div></div>'; },
      css: '.cs-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
      js: null
    },
    stack: {
      es: { name: 'Stack', desc: 'Columna vertical con hueco.' },
      en: { name: 'Stack', desc: 'Vertical stack with gap.' },
      props: [{ key: 'id', def: 'stack-a', es: 'id', en: 'id' }],
      html: function (p) { return '<div id="' + U.esc(p.id) + '" class="cs-stack"></div>'; },
      css: '.cs-stack{display:flex;flex-direction:column;gap:8px}',
      js: null
    },
    canvas: {
      es: { name: 'Canvas', desc: 'Lienzo 2D.' },
      en: { name: 'Canvas', desc: '2D canvas.' },
      props: [
        { key: 'id', def: 'cv-a', es: 'id', en: 'id' },
        { key: 'w', def: '300', es: 'Ancho', en: 'Width' },
        { key: 'h', def: '200', es: 'Alto', en: 'Height' }
      ],
      html: function (p) {
        return '<canvas id="' + U.esc(p.id) + '" width="' + U.esc(p.w) + '" height="' + U.esc(p.h) + '"></canvas>';
      },
      css: 'canvas{display:block;max-width:100%;background:#fff;border:1px solid #d9dfe8}',
      js: null
    },
    webxdcStatus: {
      es: { name: 'Estado Webxdc', desc: 'Muestra selfName y si la API está disponible.' },
      en: { name: 'Webxdc status', desc: 'Shows selfName and whether the API is available.' },
      props: [{ key: 'id', def: 'xdc-status', es: 'id', en: 'id' }],
      html: function (p) { return '<p id="' + U.esc(p.id) + '" class="cs-xdc-status"></p>'; },
      css: '.cs-xdc-status{font-size:.9rem;color:#5b6675}',
      js: function (p) {
        return "(function(){var el=document.getElementById('" + p.id + "'); if(!el) return; if(window.webxdc){ el.textContent='webxdc: ' + (webxdc.selfName||'') + ' · API real'; } else { el.textContent='webxdc: no disponible (preview/navegador)'; }})();";
      }
    }
  };

  function defaults(type) {
    const d = DEFS[type];
    const o = {};
    if (!d) return o;
    (d.props || []).forEach(function (pr) { o[pr.key] = pr.def; });
    return o;
  }

  function validate(type, props) {
    const d = DEFS[type];
    const errors = [];
    if (!d) { errors.push('unknown-type'); return errors; }
    props = props || {};
    if (props.id && !U.isElementId(props.id)) errors.push('bad-id');
    if (props.src && U.normalizeRelPath(props.src) == null && !/^data:/.test(props.src)) errors.push('bad-src');
    return errors;
  }

  function previewHtml(type, props) {
    const d = DEFS[type];
    if (!d) return '';
    const p = Object.assign(defaults(type), props || {});
    return d.html(p);
  }

  function insertInto(html, snippet) {
    if (/<!--\s*cs-components\s*-->/.test(html)) {
      return html.replace(/<!--\s*cs-components\s*-->/, snippet + '\n<!-- cs-components -->');
    }
    if (/<\/main>/i.test(html)) return html.replace(/<\/main>/i, '  ' + snippet + '\n</main>');
    if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, '  ' + snippet + '\n</body>');
    return html + '\n' + snippet + '\n';
  }

  function ensureCss(cssText, chunk) {
    if (!chunk) return cssText || '';
    const marker = '/* cs-cmp:' + chunk.slice(0, 24) + ' */';
    const cur = cssText || '';
    if (cur.indexOf(marker) >= 0) return cur;
    return cur + (cur && !/\n$/.test(cur) ? '\n' : '') + marker + '\n' + chunk + '\n';
  }

  function ensureJs(jsText, chunk) {
    if (!chunk) return jsText || '';
    const cur = jsText || "'use strict';\n";
    if (cur.indexOf(chunk) >= 0) return cur;
    return cur + (cur && !/\n$/.test(cur) ? '\n' : '') + chunk + '\n';
  }

  function insert(project, type, props) {
    const d = DEFS[type];
    if (!d) throw new Error('unknown-component');
    const p = Object.assign(defaults(type), props || {});
    const errs = validate(type, p);
    if (errs.length) {
      const e = new Error('invalid-component');
      e.code = errs[0];
      throw e;
    }
    if (!project.files['index.html'] || project.files['index.html'].kind !== 'text') {
      throw new Error('no-index');
    }
    const snippet = d.html(p);
    project.files['index.html'].content = insertInto(project.files['index.html'].content, snippet);

    const cssPath = project.files['style.css'] ? 'style.css' : (project.files['styles.css'] ? 'styles.css' : 'style.css');
    if (!project.files[cssPath]) project.files[cssPath] = { kind: 'text', content: '' };
    if (d.css) project.files[cssPath].content = ensureCss(project.files[cssPath].content, d.css);

    const jsChunk = d.js ? d.js(p) : '';
    if (jsChunk) {
      if (!project.files['app.js']) project.files['app.js'] = { kind: 'text', content: "'use strict';\n" };
      if (project.files['app.js'].kind === 'text') {
        project.files['app.js'].content = ensureJs(project.files['app.js'].content, jsChunk);
      }
    }
    return { html: snippet, id: p.id, type: type };
  }

  CS.components = {
    DEFS: DEFS,
    list: function () { return Object.keys(DEFS); },
    defaults: defaults,
    validate: validate,
    previewHtml: previewHtml,
    insert: insert
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = CS.components; }
})();
