/* Insert-component sheet: drops library pieces at the cursor and wires their CSS/JS into the project. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, ui } = CS;
  const t = (...a) => CS.t(...a);

  /* English versions of the identifiers and texts used in the library code. */
  const PHRASES = [
    ['Escribe aquí una frase que explique tu app.', 'Write a sentence here that explains your app.'],
    ['Un texto corto dentro de la tarjeta.', 'A short text inside the card.'],
    ['¡Mira mi resultado!', 'Look at my result!'], ['Describe la imagen', 'Describe the image'],
    ['Escribe algo…', 'Type something…'], ['Elige un color', 'Pick a color'], ['Tiempo real:', 'Realtime:'],
    ['Escribiste:', 'You typed:'], ['¡Tocado!', 'Tapped!'], ['¡Tiempo!', 'Time!'], ['¡Hola!', 'Hello!'],
    ['Tócame', 'Tap me'], ['Título', 'Title'], ['Acción', 'Action'], ['Llegó', 'Received'], ['Mi app', 'My app']
  ];
  const WORDS = {
    boton: 'button', formulario: 'form', texto: 'text', campo: 'field', valor: 'value', Enviar: 'Send', lista: 'list',
    agregarALista: 'addToList', tarjeta: 'card', contador: 'counter', menos: 'minus', numero: 'number', mas: 'plus',
    mostrarNumero: 'showNumber', foto: 'photo', imagen: 'image', sonar: 'play', Sonar: 'Play', sonido: 'sound',
    opcion: 'option', rojo: 'red', verde: 'green', azul: 'blue', Rojo: 'Red', Verde: 'Green', Azul: 'Blue',
    Elegiste: 'You picked', Volumen: 'Volume', deslizador: 'slider', casilla: 'cell', hecho: 'done', Hecho: 'Done',
    tablero: 'board', aviso: 'notice', caja: 'box', Vale: 'OK', avisar: 'notify', columnas: 'columns', aparecer: 'appear',
    enviar: 'send', datos: 'data', elementos: 'items', pintar: 'render', autor: 'author', agregar: 'add', guardar: 'save',
    clave: 'key', leer: 'read', porDefecto: 'fallback', azar: 'random', elegir: 'pick', segundos: 'seconds', reloj: 'timer',
    Quedan: 'Left', miNombre: 'myName', miDireccion: 'myAddress', canal: 'channel', enviarRapido: 'sendFast', mover: 'move',
    direccion: 'direction', Mover: 'Move', mapa: 'map', arriba: 'up', abajo: 'down', izquierda: 'left', derecha: 'right',
    inicio: 'start', fila: 'row'
  };
  const WORD_RE = new RegExp('(^|[^A-Za-z0-9_\u00C0-\u017F])(' + Object.keys(WORDS).sort((a, b) => b.length - a.length).join('|') + ')(?![A-Za-z0-9_\u00C0-\u017F])', 'g');

  function localize(code) {
    if (!code || CS.i18n.lang === 'es') return code || '';
    let out = code;
    for (const [es, en] of PHRASES) out = out.split(es).join(en);
    return out.replace(WORD_RE, (m, pre, w) => pre + WORDS[w]);
  }

  const label = (obj) => (obj && (obj[CS.i18n.lang] || obj.en)) || '';
  const MARK = (id) => '/* cs:' + id + ' */';

  function findFile(p, kind) {
    const paths = Object.keys(p.files).filter((x) => p.files[x].kind === 'text');
    const generated = p.blocks && p.blocks.generatedFile;
    const prefer = kind === 'css' ? ['style.css', 'styles.css', 'css/style.css'] : ['app.js', 'script.js', 'main.js', 'js/app.js'];
    return prefer.find((x) => p.files[x]) || paths.find((x) => x.toLowerCase().endsWith('.' + kind) && x !== generated) || null;
  }

  /* Adds a <link>/<script> for a new file to the page being edited, or to index.html. */
  function linkFile(p, editor, kind, file) {
    const tag = kind === 'css' ? '  <link rel="stylesheet" href="' + file + '">\n' : '  <script src="' + file + '"></script>\n';
    const close = kind === 'css' ? '</head>' : '</body>';
    const isHtml = CS.editor.langOf(editor.path) === 'html';
    const text = isHtml ? editor.text() : (p.files['index.html'] && p.files['index.html'].content) || '';
    if (text.includes(file)) return;
    const at = text.toLowerCase().lastIndexOf(close);
    if (at < 0) return;
    if (isHtml) editor.insertAt(at, tag);
    else if (p.files['index.html']) CS.projects.write('index.html', text.slice(0, at) + tag + text.slice(at), { project: p });
  }

  function appendTo(p, editor, kind, id, code) {
    let file = findFile(p, kind);
    if (!file) {
      file = kind === 'css' ? 'style.css' : 'app.js';
      CS.projects.write(file, '', { project: p });
      linkFile(p, editor, kind, file);
    }
    const current = p.files[file].content || '';
    if (current.includes(MARK(id))) return file;
    const next = (current.replace(/\s+$/, '') + (current.trim() ? '\n\n' : '') + MARK(id) + '\n' + code).replace(/\n*$/, '\n');
    if (editor.path === file) editor.replaceText(next);
    else CS.projects.write(file, next, { project: p });
    return file;
  }

  /* Inserts multi-line code aligned with the indentation of the cursor line. */
  function insertAligned(editor, code) {
    const line = editor.lineInfo();
    const indent = (line.text.match(/^\s*/) || [''])[0];
    const atStart = line.at - line.from <= indent.length;
    const body = code.replace(/\n+$/, '').split('\n').map((x, i) => (i === 0 || !x ? x : indent + x)).join('\n');
    editor.insert(atStart || !body.includes('\n') ? body : '\n' + indent + body);
  }

  function insertDef(def, editor, p) {
    const cursor = editor.cursorInfo().lang || CS.editor.langOf(editor.path);
    const also = [];
    if (def.kind === 'html') {
      if (CS.editor.langOf(editor.path) !== 'html' || cursor !== 'html') { ui.toast(t('comp_need_html'), 'warn'); return false; }
      insertAligned(editor, localize(def.code));
      if (def.css) also.push(appendTo(p, editor, 'css', def.id, localize(def.css)));
      if (def.js) also.push(appendTo(p, editor, 'js', def.id, localize(def.js)));
    } else if (cursor === def.kind) {
      insertAligned(editor, localize(def.code));
    } else {
      also.push(appendTo(p, editor, def.kind, def.id, localize(def.code)));
    }
    const files = [...new Set(also.filter(Boolean))];
    if (def.kind !== 'html' && cursor !== def.kind) ui.toast(t('comp_added_in', { files: files.join(', ') }), 'ok');
    else ui.toast(files.length ? t('comp_added_also', { files: files.join(', ') }) : t('comp_added'), 'ok');
    CS.haptic();
    return true;
  }

  function card(def, onPick) {
    const extras = [def.css && 'CSS', def.js && 'JS'].filter(Boolean);
    const preview = localize(def.code).split('\n').filter((x) => x.trim()).slice(0, 3).join('\n');
    return h('button', { type: 'button', class: 'comp-card', onclick: () => onPick(def) },
      h('div', { class: 'comp-head' },
        h('span', { class: 'comp-icon comp-' + def.kind }, CS.icon(def.icon)),
        h('div', { class: 'comp-text' },
          h('div', { class: 'comp-name' }, label(def.name)),
          h('div', { class: 'comp-desc' }, label(def.desc))),
        extras.length ? h('span', { class: 'comp-extras' }, '+ ' + extras.join(' + ')) : null),
      h('pre', { class: 'comp-code' }, preview));
  }

  function pick(editor, project) {
    const p = project || CS.projects.current;
    if (!editor || !p) return;
    const cursor = editor.cursorInfo().lang || CS.editor.langOf(editor.path);
    let kind = ['html', 'css', 'js'].includes(cursor) ? cursor : 'html';
    let query = '';
    const list = h('div', { class: 'comp-list' });
    let sheet = null;
    const draw = () => {
      const q = query.trim().toLowerCase();
      const items = CS.componentLib.filter((d) => (q ? true : d.kind === kind) &&
        (!q || (label(d.name) + ' ' + label(d.desc) + ' ' + d.id).toLowerCase().includes(q)));
      CS.mount(list, items.length ? items.map((d) => card(d, (def) => { if (insertDef(def, editor, p)) sheet.close(); }))
        : ui.empty({ icon: 'search', title: t('comp_empty') }));
    };
    const tabs = ui.segmented([
      { value: 'html', icon: 'fileHtml', label: 'HTML' },
      { value: 'css', icon: 'fileCss', label: 'CSS' },
      { value: 'js', icon: 'fileJs', label: 'JS' }
    ], kind, (v) => { kind = v; draw(); }, { class: 'comp-tabs' });
    const search = ui.searchBox({ placeholder: t('comp_search'), onInput: (v) => { query = v; tabs.hidden = !!query.trim(); draw(); } });
    draw();
    sheet = ui.sheet({ title: t('comp_title'), subtitle: t('comp_sub'), size: 'tall', class: 'comp-sheet', body: h('div', {}, search, tabs, list) });
  }

  CS.components = { pick, localize, insert: insertDef };
})();
