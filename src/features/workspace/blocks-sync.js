/* Blocks state: model access, undo history, live code generation and hand-edit protection. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const t = (...a) => CS.t(...a);
  const B = () => CS.blocks;
  const HISTORY = 60;
  const histories = new Map();

  /* Category look: icon + tint. Unknown categories fall back to slate. */
  const CAT_STYLE = {
    basics: ['star', 'amber'], events: ['bolt', 'orange'], html: ['pages', 'blue'], css: ['palette', 'pink'],
    components: ['component', 'violet'], forms: ['checkSquare', 'teal'], navigation: ['globe', 'cyan'],
    logic: ['braces', 'indigo'], lists: ['list', 'green'], text: ['type', 'slate'], math: ['hash', 'orange'],
    data: ['box', 'teal'], timers: ['timer', 'amber'], ui: ['phone', 'blue'], audio: ['volume', 'pink'],
    canvas: ['brush', 'orange'], game: ['trophy', 'red'], engine: ['joystick', 'violet'], storage: ['save', 'green'],
    dialogs: ['chat', 'cyan'], webxdc: ['xdc', 'indigo'], recipes: ['sparkles', 'amber'],
    accessibility: ['users', 'teal'], advanced: ['tools', 'slate']
  };
  const catStyle = (id) => CAT_STYLE[id] || ['blocks', 'slate'];

  /* Event kinds shown as cards. Target kinds need an element id (or a function name). */
  const CONTEXTS = {
    onStart: { icon: 'rocket', tint: 'green' },
    onClick: { icon: 'cursor', tint: 'blue', target: 'element' },
    onChange: { icon: 'edit', tint: 'teal', target: 'element' },
    onTouch: { icon: 'hand', tint: 'violet', target: 'element' },
    onUpdate: { icon: 'xdc', tint: 'indigo' },
    functions: { icon: 'braces', tint: 'orange', target: 'name' }
  };

  const lang = () => (CS.i18n.lang === 'en' ? 'en' : 'es');
  const meta = (type) => B().meta(type, lang()) || { name: type, desc: '' };
  const label = (obj) => (obj ? obj[lang()] || obj.es || obj.en || '' : '');

  function model(p) {
    if (!p.blocks) p.blocks = { model: null, generatedFile: 'app.js', handEdited: false, lastGeneratedAt: null };
    if (!p.blocks.model) return null;
    p.blocks.model = B().normalizeModel(p.blocks.model);
    return p.blocks.model;
  }

  function history(p) {
    let hst = histories.get(p.id);
    if (!hst) { hst = { past: [], future: [] }; histories.set(p.id, hst); }
    return hst;
  }

  /* Element ids declared in the project's HTML files (for suggestions). */
  function htmlIds(p) {
    const ids = new Set();
    Object.keys(p.files).forEach((path) => {
      const f = p.files[path];
      if (!/\.html?$/i.test(path) || !f || f.kind !== 'text') return;
      const re = /\bid\s*=\s*["']([^"']+)["']/g;
      let m;
      while ((m = re.exec(f.content))) if (CS.util.isElementId(m[1])) ids.add(m[1]);
    });
    return [...ids].sort((a, b) => a.localeCompare(b));
  }

  function spriteNames(m) {
    const out = new Set();
    walkAll(m, (b) => { if (b.params && typeof b.params.sname === 'string' && b.params.sname) out.add(b.params.sname); });
    return [...out];
  }

  function contextLists(m) {
    const lists = [{ kind: 'onStart', list: m.contexts.onStart }, { kind: 'onUpdate', list: m.contexts.onUpdate }];
    ['onClick', 'onChange', 'onTouch', 'functions'].forEach((kind) => m.contexts[kind].forEach((c) => lists.push({ kind, ctx: c, list: c.blocks })));
    return lists;
  }

  function walk(list, fn, parent) {
    (list || []).forEach((b, i) => {
      if (!b || !b.type) return;
      fn(b, list, i, parent);
      walk(b.children, fn, b);
      walk(b.childrenElse, fn, b);
    });
  }
  function walkAll(m, fn) { contextLists(m).forEach((c) => walk(c.list, fn)); }

  /* Find a block by id: { block, list, index, kind } */
  function find(m, id) {
    let hit = null;
    contextLists(m).forEach((c) => walk(c.list, (b, list, index) => { if (!hit && b.id === id) hit = { block: b, list, index, kind: c.kind }; }));
    return hit;
  }

  function genCtx(m) {
    return {
      vars: m.vars.map((v) => v.name),
      functions: m.contexts.functions.map((f) => f.target),
      timers: []
    };
  }

  /* Script tag for the generated file, added before </body> when no HTML page loads it. */
  function ensureScript(p, file) {
    const pages = Object.keys(p.files).filter((x) => /\.html?$/i.test(x) && p.files[x].kind === 'text');
    const re = new RegExp('src\\s*=\\s*["\'](\\./)?' + file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\']', 'i');
    if (pages.some((x) => re.test(p.files[x].content))) return false;
    const page = p.files['index.html'] && p.files['index.html'].kind === 'text' ? 'index.html' : null;
    if (!page) return false;
    const html = p.files[page].content;
    const tag = '  <script src="' + file + '"></script>\n';
    const next = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, tag + '</body>') : html + '\n' + tag;
    CS.projects.write(page, next, { project: p });
    return true;
  }

  /* Generated output for the current model. */
  function output(p) {
    const m = model(p);
    if (!m) return { code: '', problems: [] };
    return B().generate(m);
  }

  /* Writing is allowed when the file is missing, still matches the last output, or was never hand edited. */
  function reconcile(p) {
    const bl = p.blocks;
    if (!bl || !bl.model) return;
    const cur = CS.projects.text(bl.generatedFile, p);
    if (bl.lastCode == null && bl.lastGeneratedAt && !bl.handEdited && cur != null) bl.lastCode = cur;
    if (bl.handEdited && (cur == null || cur === bl.lastCode)) bl.handEdited = false;
  }
  const paused = (p) => { reconcile(p); return !!(p.blocks && p.blocks.model && p.blocks.handEdited); };

  function writeNow(p, force) {
    const bl = p.blocks;
    if (!bl || !bl.model) return null;
    if (!force && paused(p)) return null;
    const res = output(p);
    const file = bl.generatedFile || 'app.js';
    if (CS.projects.text(file, p) !== res.code) CS.projects.write(file, res.code, { project: p, fromBlocks: true });
    bl.lastCode = res.code;
    bl.lastGeneratedAt = Date.now();
    bl.handEdited = false;
    ensureScript(p, file);
    try { addPlaceholders(p, bl.model); } catch (error) { console.error(error); }
    return res;
  }

  /* Missing elements get a real placeholder: tap targets become buttons, change targets inputs. */
  function addPlaceholders(p, m) {
    const page = p.files['index.html'];
    if (!page || page.kind !== 'text') return;
    const known = new Set(htmlIds(p));
    const role = new Map();
    m.contexts.onClick.forEach((c) => role.set(c.target, 'button'));
    m.contexts.onChange.forEach((c) => { if (!role.has(c.target)) role.set(c.target, 'input'); });
    B().referencedElements(m).ids.forEach((id) => { if (!role.has(id)) role.set(id, 'div'); });
    const added = [...role.keys()].filter((id) => CS.util.isElementId(id) && !known.has(id));
    if (!added.length) return;
    const tags = added.map((id) => {
      const r = role.get(id);
      if (r === 'button') return '  <button id="' + id + '" type="button">' + id + '</button>';
      if (r === 'input') return '  <input id="' + id + '" placeholder="' + id + '">';
      return '  <div id="' + id + '"></div>';
    }).join('\n') + '\n';
    const html = page.content;
    /* Insert at the start of the first line holding a <script src> (or </body>). */
    const m1 = /^[ \t]*<script\b[^>]*\bsrc=/im.exec(html) || /^[ \t]*<\/body>/im.exec(html);
    const next = m1 ? html.slice(0, m1.index) + tags + html.slice(m1.index) : html.replace(/\s*$/, '\n') + tags;
    CS.projects.write('index.html', next, { project: p });
    CS.ui.toast(t('blk_placeholders', { ids: added.map((x) => '#' + x).join(', ') }), 'info');
  }

  const timers = new Map();
  function scheduleWrite(p) {
    clearTimeout(timers.get(p.id));
    timers.set(p.id, setTimeout(() => { timers.delete(p.id); writeNow(p); }, 350));
  }
  function flushWrite(p) {
    if (!timers.has(p.id)) return;
    clearTimeout(timers.get(p.id));
    timers.delete(p.id);
    writeNow(p);
  }

  /* Record the current model before a change: call snapshot(), mutate, then commit(). */
  function snapshot(p) {
    const hst = history(p);
    hst.past.push(JSON.stringify(p.blocks.model));
    if (hst.past.length > HISTORY) hst.past.shift();
    hst.future = [];
  }
  function commit(p, reason) {
    CS.projects.touch('blocks');
    scheduleWrite(p);
    CS.bus.emit('blocks-changed', { project: p, reason: reason || 'edit' });
  }
  function change(p, fn, reason) {
    snapshot(p);
    const result = fn(p.blocks.model);
    commit(p, reason);
    return result;
  }
  function step(p, back) {
    const hst = history(p);
    const from = back ? hst.past : hst.future;
    const to = back ? hst.future : hst.past;
    if (!from.length) return false;
    to.push(JSON.stringify(p.blocks.model));
    p.blocks.model = B().normalizeModel(JSON.parse(from.pop()));
    commit(p, back ? 'undo' : 'redo');
    return true;
  }

  /* Start using blocks. Keeps hand-written app.js safe by targeting blocks.js instead. */
  function start(p) {
    if (p.blocks.model) return p.blocks.model;
    const existing = CS.projects.text('app.js', p);
    const trivial = existing == null || !existing.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '').replace(/['"]use strict['"];?/, '').trim();
    p.blocks.generatedFile = trivial ? 'app.js' : 'blocks.js';
    p.blocks.model = B().newModel();
    p.blocks.handEdited = false;
    p.blocks.lastCode = null;
    commit(p, 'start');
    writeNow(p, true);
    return p.blocks.model;
  }

  /* Stop using blocks: the generated file stays as normal code. */
  function detach(p) {
    flushWrite(p);
    p.blocks.model = null;
    p.blocks.handEdited = false;
    p.blocks.lastCode = null;
    histories.delete(p.id);
    CS.projects.touch('blocks');
    CS.bus.emit('blocks-changed', { project: p, reason: 'detach' });
  }

  /* Plain-language value of one parameter, for the card summary. */
  function paramText(def, param, value, m) {
    if (value == null || value === '') return null;
    switch (param.type) {
      case 'element': return '#' + value;
      case 'select': { const o = (param.options || []).find((x) => x.v === value); return o ? label(o) : String(value); }
      case 'color': return String(value);
      case 'pixels': case 'map': { const rows = String(value).split('\n').filter(Boolean); return rows.length ? (rows[0].length + '×' + rows.length) : null; }
      case 'value': {
        const v = value || {};
        if (v.kind === 'var') return v.name || null;
        if (v.kind === 'input') return v.id ? t('blk_val_of', { id: v.id }) : null;
        if (v.kind === 'number') return v.value === '' || v.value == null ? null : String(v.value);
        return v.value === '' || v.value == null ? null : '“' + String(v.value) + '”';
      }
      default: return String(value);
    }
  }

  /* The exporter calls this so a pending live write lands in the package. */
  CS.blocks.syncBeforeExport = (p) => { if (p && p.id) flushWrite(p); };

  CS.blocksSync = {
    CAT_STYLE, CONTEXTS, catStyle, meta, label, lang,
    model, htmlIds, spriteNames, contextLists, walk, walkAll, find, genCtx, output,
    paused, reconcile, writeNow, flushWrite, change, snapshot, commit, start, detach, paramText,
    undo: (p) => step(p, true),
    redo: (p) => step(p, false),
    canUndo: (p) => history(p).past.length > 0,
    canRedo: (p) => history(p).future.length > 0
  };
})();
