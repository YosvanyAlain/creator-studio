/* Data tools: JSON (validate, explain errors, fix common mistakes, format, tree) and encoders (Base64, URL, HTML, file to data URL). */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, ui } = CS;
  const TL = CS.tools;
  const t = (...a) => CS.t(...a);
  const icon = (n) => CS.icon(n);
  const mono = (opts) => { const el = ui.input(Object.assign({ multiline: true, mono: true, rows: 8 }, opts)); el.classList.add('tl-mono'); return el; };

  /* ---------- JSON ---------- */
  const SAMPLES = {
    es: '{\n  "app": "Lista de compras",\n  "cosas": [\n    { "nombre": "Pan", "hecho": false },\n    { "nombre": "Leche", "hecho": true }\n  ],\n  "version": 3\n}',
    en: '{\n  "app": "Shopping list",\n  "items": [\n    { "name": "Bread", "done": false },\n    { "name": "Milk", "done": true }\n  ],\n  "version": 3\n}'
  };
  const sample = () => SAMPLES[CS.i18n.lang === 'en' ? 'en' : 'es'];

  function where(text, error) {
    const msg = String(error && error.message || '');
    let pos = null;
    let m = msg.match(/line (\d+) column (\d+)/);
    if (m) return { line: +m[1], col: +m[2] };
    m = msg.match(/position (\d+)/);
    if (m) pos = +m[1];
    if (pos == null && /end of (JSON|data)|Unexpected end/i.test(msg)) pos = text.length;
    if (pos == null) return null;
    const before = text.slice(0, pos).split('\n');
    return { line: before.length, col: before[before.length - 1].length + 1 };
  }

  /* Detects typical beginner mistakes; fix() returns corrected text. */
  const MISTAKES = [
    { id: 'comments', test: (s) => /(^|[^:"])\/\/[^\n]*|\/\*[\s\S]*?\*\//.test(s), fix: (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"\\])\/\/[^\n]*/g, '$1') },
    { id: 'single', test: (s) => /'[^'\n]*'\s*[:,}\]]/.test(s), fix: (s) => s.replace(/'((?:\\.|[^'\\\n])*)'/g, (all, inner) => '"' + inner.replace(/"/g, '\\"') + '"') },
    { id: 'keys', test: (s) => /[{,]\s*[A-Za-z_$][\w$]*\s*:/.test(s), fix: (s) => s.replace(/([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)/g, '$1"$2"$3') },
    { id: 'trailing', test: (s) => /,\s*[}\]]/.test(s), fix: (s) => s.replace(/,(\s*[}\]])/g, '$1') }
  ];

  function describe(v) {
    if (Array.isArray(v)) return t('tl_js_array', { n: v.length });
    if (v && typeof v === 'object') return t('tl_js_object', { n: Object.keys(v).length });
    return t('tl_js_value', { type: v === null ? 'null' : typeof v });
  }

  function tree(value, key, depth) {
    const label = key != null ? h('span', { class: 'tl-tree-key' }, key) : null;
    if (value && typeof value === 'object') {
      const keys = Object.keys(value);
      const kids = keys.slice(0, 200).map((k) => tree(value[k], Array.isArray(value) ? '[' + k + ']' : k, depth + 1));
      if (keys.length > 200) kids.push(h('div', { class: 'tl-tree-more' }, t('tl_js_more', { n: keys.length - 200 })));
      const node = h('details', { class: 'tl-tree-node', open: depth < 2 },
        h('summary', {}, label, h('span', { class: 'tl-tree-type' }, Array.isArray(value) ? '[ ] ' + value.length : '{ } ' + keys.length)), kids);
      return node;
    }
    const type = value === null ? 'null' : typeof value;
    return h('div', { class: 'tl-tree-leaf' }, label, h('span', { class: 'tl-tree-val v-' + type }, type === 'string' ? JSON.stringify(value) : String(value)));
  }

  function sortKeys(v) {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === 'object') return Object.keys(v).sort().reduce((o, k) => { o[k] = sortKeys(v[k]); return o; }, {});
    return v;
  }

  function renderJson() {
    let text = CS.settings.get('tool_json') || sample();
    let parsed;
    let ok = false;
    const status = h('div', { class: 'tl-status' });
    const fixes = h('div', { class: 'tl-fixes' });
    const treeHost = h('div', { class: 'tl-tree' });
    const area = mono({ value: text, rows: 10, onInput: (v) => { text = String(v); check(); } });
    function check() {
      CS.settings.set('tool_json', text.length < 60000 ? text : '');
      CS.mount(fixes);
      if (!text.trim()) { ok = false; CS.mount(status, icon('info'), h('span', {}, t('tl_js_empty'))); status.className = 'tl-status'; CS.mount(treeHost); return; }
      try {
        parsed = JSON.parse(text);
        ok = true;
        status.className = 'tl-status ok';
        CS.mount(status, icon('checkCircle'), h('span', {}, h('strong', {}, t('tl_js_valid')), ' · ' + describe(parsed) + ' · ' + CS.util.bytes(new TextEncoder().encode(text).length)));
        CS.mount(treeHost, tree(parsed, null, 0));
      } catch (error) {
        ok = false;
        const at = where(text, error);
        status.className = 'tl-status bad';
        CS.mount(status, icon('alertTriangle'), h('span', {}, h('strong', {}, t('tl_js_invalid')), at ? ' · ' + t('tl_js_at', { line: at.line, col: at.col }) : ''));
        const found = MISTAKES.filter((m) => m.test(text));
        CS.mount(fixes, found.length ? [
          h('ul', { class: 'tl-fix-list' }, found.map((m) => h('li', {}, t('tl_js_m_' + m.id)))),
          ui.button({ label: t('tl_js_fix'), icon: 'wand', variant: 'soft', size: 'sm', onClick: () => { setText(found.reduce((s, m) => m.fix(s), text)); } })
        ] : h('p', { class: 'tl-hint' }, t('tl_js_hint')));
        CS.mount(treeHost);
      }
    }
    function setText(v) { text = v; area.value = v; check(); }
    const act = (label, ic, fn) => ui.button({ label, icon: ic, variant: 'soft', size: 'sm', onClick: () => { if (!ok) return ui.toast(t('tl_js_fix_first'), 'info'); fn(); } });
    check();
    return h('div', { class: 'tl-stack' },
      TL.panel(null, area, status, fixes,
        h('div', { class: 'tl-chips' },
          act(t('tl_js_format'), 'format', () => setText(JSON.stringify(parsed, null, 2))),
          act(t('tl_js_minify'), 'collapse', () => setText(JSON.stringify(parsed))),
          act(t('tl_js_sort'), 'sort', () => setText(JSON.stringify(sortKeys(parsed), null, 2))),
          ui.button({ label: t('copy'), icon: 'copy', variant: 'ghost', size: 'sm', onClick: () => TL.copy(text) }),
          ui.button({ label: t('tl_example'), icon: 'bulb', variant: 'ghost', size: 'sm', onClick: () => setText(sample()) }),
          ui.button({ label: t('tl_clear'), icon: 'trash', variant: 'ghost', size: 'sm', onClick: () => setText('') }))),
      TL.panel(t('tl_js_tree'), treeHost),
      h('p', { class: 'tl-hint' }, t('tl_js_tip')));
  }

  /* ---------- Encoders ---------- */
  const b64encode = (str) => {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  };
  const b64decode = (str) => {
    const bin = atob(String(str).replace(/^data:[^,]*,/, '').replace(/\s+/g, ''));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  };
  const HTML_IN = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const HTML_OUT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' };
  const CODECS = {
    base64: { enc: b64encode, dec: b64decode },
    url: { enc: (s) => encodeURIComponent(s), dec: (s) => decodeURIComponent(s.replace(/\+/g, ' ')) },
    html: {
      enc: (s) => s.replace(/[&<>"']/g, (c) => HTML_IN[c]),
      dec: (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, k) => k[0] === '#' ? String.fromCodePoint(k[1].toLowerCase() === 'x' ? parseInt(k.slice(2), 16) : +k.slice(1)) : (HTML_OUT[k.toLowerCase()] != null ? HTML_OUT[k.toLowerCase()] : all))
    }
  };

  function renderEncode() {
    const S = Object.assign({ codec: 'base64', dir: 'enc', input: CS.i18n.lang === 'en' ? 'Hello, world' : 'Hola, mundo' }, CS.settings.get('tool_encode') || {});
    const out = TL.codeBox({ title: t('tl_en_result'), lang: 'text' });
    const err = h('div', { class: 'tl-status bad', hidden: true });
    const area = mono({ value: S.input, rows: 5, onInput: (v) => { S.input = String(v); run(); } });
    const dirHost = h('div', {});
    const hint = h('p', { class: 'tl-hint' });
    function run() {
      hint.textContent = t('tl_en_hint_' + S.codec);
      CS.settings.set('tool_encode', Object.assign({}, S, { input: S.input.length < 20000 ? S.input : '' }));
      err.hidden = true;
      try { out.set(CODECS[S.codec][S.dir](S.input)); } catch (error) {
        out.set('');
        err.hidden = false;
        CS.mount(err, icon('alertTriangle'), h('span', {}, t('tl_en_bad_' + S.codec)));
      }
    }
    const drawDir = () => CS.mount(dirHost, ui.segmented([{ value: 'enc', label: t('tl_en_enc') }, { value: 'dec', label: t('tl_en_dec') }], S.dir, (v) => { S.dir = v; run(); }));
    const swap = () => { S.input = out.get(); area.value = S.input; S.dir = S.dir === 'enc' ? 'dec' : 'enc'; drawDir(); run(); };
    const fromFile = async () => {
      const [file] = await ui.pickFile('*/*');
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) return ui.toast(t('tl_en_file_big'), 'error');
      const bytes = new Uint8Array(await file.arrayBuffer());
      const url = CS.util.bytesToDataUrl(bytes, file.type || CS.util.mimeOf(file.name));
      out.set(url);
      ui.toast(t('tl_en_file_done', { name: file.name, size: CS.util.bytes(url.length) }), 'ok');
    };
    drawDir();
    run();
    return h('div', { class: 'tl-stack' },
      TL.panel(null,
        ui.segmented([{ value: 'base64', label: 'Base64' }, { value: 'url', label: 'URL' }, { value: 'html', label: 'HTML' }], S.codec, (v) => { S.codec = v; run(); }),
        dirHost, area,
        h('div', { class: 'tl-chips' },
          ui.button({ label: t('tl_swap'), icon: 'sort', variant: 'soft', size: 'sm', onClick: swap }),
          ui.button({ label: t('tl_en_file'), icon: 'file', variant: 'ghost', size: 'sm', onClick: fromFile }))),
      err, out.el, hint);
  }

  TL.add({ id: 'json', group: 'data', icon: 'braces', tint: 'indigo', order: 30, render: renderJson });
  TL.add({ id: 'encode', group: 'data', icon: 'replace', tint: 'blue', order: 32, render: renderEncode });
  CS.toolsData = { where, MISTAKES, CODECS, sortKeys };
})();
