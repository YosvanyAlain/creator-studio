/* Tools suite: registry, hub, tool route and shared building blocks (copy, CSS output, sliders, swatches). */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, ui, router } = CS;
  const t = (...a) => CS.t(...a);
  const icon = (n) => CS.icon(n);

  const GROUPS = [
    { id: 'design', icon: 'palette', tint: 'pink' },
    { id: 'share', icon: 'share', tint: 'teal' },
    { id: 'data', icon: 'braces', tint: 'indigo' },
    { id: 'studio', icon: 'sprite', tint: 'orange' }
  ];
  const TOOLS = [];

  /* def: {id, group, icon, tint, order, render(ctx) -> node, leave?()} ; title/desc come from tl_<id> / tl_<id>_sub. */
  function add(def) {
    if (TOOLS.some((x) => x.id === def.id)) throw new Error('tool exists: ' + def.id);
    TOOLS.push(def);
    TOOLS.sort((a, b) => (a.order || 50) - (b.order || 50));
  }
  const get = (id) => TOOLS.find((x) => x.id === id);
  const open = (id, params) => {
    const def = get(id);
    if (!def) return router.go('tools');
    if (def.go) return def.go(params);
    remember(id);
    return router.go('tool', Object.assign({ id }, params || {}));
  };
  const recent = () => (CS.settings.get('toolsRecent') || []).filter(get);
  function remember(id) { CS.settings.set('toolsRecent', [id].concat(recent().filter((x) => x !== id)).slice(0, 4)); }

  /* ---------- Shared building blocks ---------- */
  async function copy(text, label) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(text);
      else {
        const area = h('textarea', { style: { position: 'fixed', opacity: '0' } });
        area.value = text;
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        area.remove();
      }
      CS.haptic && CS.haptic();
      ui.toast(label || t('copied'), 'ok');
    } catch (error) { ui.toast(t('copy_failed'), 'error'); }
  }

  /* Read-only code panel with copy; returns {el, set(code)}. */
  function codeBox(opts) {
    const o = opts || {};
    const pre = h('pre', { class: 'tl-code-pre' });
    let code = '';
    const set = (value) => {
      code = String(value || '');
      pre.textContent = code;
      if ((o.lang === 'js') && CS.blocksUi && CS.blocksUi.highlight) CS.blocksUi.highlight(pre);
      else if (o.lang !== 'text') pre.innerHTML = paint(code, o.lang || 'css');
    };
    const el = h('div', { class: 'tl-code' },
      h('div', { class: 'tl-code-head' }, h('span', {}, o.title || t('tl_code')),
        h('div', { class: 'tl-code-actions' },
          o.onUse ? ui.button({ label: t('tl_use'), icon: 'plus', size: 'sm', variant: 'soft', onClick: () => o.onUse(code) }) : null,
          ui.button({ label: t('copy'), icon: 'copy', size: 'sm', variant: 'ghost', onClick: () => copy(code) }))),
      pre);
    set(o.code);
    return { el, set, get: () => code };
  }

  /* Small highlighter for CSS and JSON output (hl-* classes are shared with the blocks code view). */
  const CSS_RX = /(\/\*[\s\S]*?\*\/)|(#[0-9a-fA-F]{3,8}\b)|(-?\d*\.?\d+(?:px|%|deg|rem|em|s|ms)?)\b|([.#][\w-]+(?=[^{}]*\{))|([\w-]+)(?=\s*:)|("(?:\\.|[^"\\])*")/g;
  const JSON_RX = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b/g;
  function paint(src, lang) {
    const esc = CS.util.escapeHtml;
    const span = (cls, text) => '<span class="hl-' + cls + '">' + esc(text) + '</span>';
    let out = '', last = 0, m;
    const rx = lang === 'json' ? JSON_RX : CSS_RX;
    rx.lastIndex = 0;
    while ((m = rx.exec(src))) {
      out += esc(src.slice(last, m.index));
      if (lang === 'json') out += m[1] ? (m[2] ? span('f', m[1]) + esc(m[2]) : span('s', m[1])) : m[3] ? span('n', m[3]) : span('k', m[4]);
      else out += m[1] ? span('c', m[1]) : m[2] ? span('s', m[2]) : m[3] ? span('n', m[3]) : m[4] ? span('g', m[4]) : m[5] ? span('k', m[5]) : span('s', m[6]);
      last = rx.lastIndex;
    }
    return out + esc(src.slice(last));
  }

  function slider(opts) {
    const o = opts || {};
    const out = h('span', { class: 'tl-slider-val' });
    const show = (v) => { out.textContent = (o.format ? o.format(v) : v) + (o.unit || ''); };
    const input = h('input', { type: 'range', min: o.min, max: o.max, step: o.step || 1, value: o.value,
      oninput: (e) => { const v = Number(e.target.value); show(v); o.onInput(v); } });
    show(o.value);
    const el = h('label', { class: 'tl-slider' }, h('span', { class: 'tl-slider-label' }, o.label), input, out);
    return { el, set: (v) => { input.value = v; show(v); } };
  }

  function swatch(value, onInput, opts) {
    const o = opts || {};
    const hex = h('input', { class: 'tl-swatch-hex', value, maxlength: 7, spellcheck: 'false', autocapitalize: 'off',
      onchange: (e) => { const c = CS.color.hex(e.target.value); if (c) { picker.value = c; e.target.value = c; onInput(c); } else e.target.value = picker.value; } });
    const picker = h('input', { type: 'color', value, oninput: (e) => { hex.value = e.target.value; onInput(e.target.value); } });
    const el = h('div', { class: ['tl-swatch', o.compact && 'compact'] }, h('label', { class: 'tl-swatch-chip' }, picker), o.compact ? null : hex);
    return { el, set: (v) => { picker.value = v; hex.value = v; } };
  }

  const panel = (title, ...children) => h('section', { class: 'tl-panel' }, title ? h('h3', { class: 'tl-panel-title' }, title) : null, ...children);
  const row = (...children) => h('div', { class: 'tl-row' }, ...children);

  /* Adds a CSS rule to a project's style.css. The class name is editable; the block is marked so it can be found again. */
  async function useCss(opts) {
    const o = opts || {};
    const list = (await CS.projects.list()).filter((p) => !p.broken);
    if (!list.length) { ui.toast(t('tl_no_projects'), 'error'); return; }
    let projectId = (CS.projects.current && CS.projects.current.id) || CS.settings.get('studioProject') || list[0].id;
    if (!list.some((p) => p.id === projectId)) projectId = list[0].id;
    let name = o.className || 'mi-estilo';
    const preview = codeBox({ title: 'style.css' });
    const build = () => (o.raw ? o.css : '.' + name + ' {\n' + o.css.split('\n').map((l) => '  ' + l).join('\n') + '\n}');
    const refresh = () => preview.set(build());
    const nameField = o.raw ? null : ui.field(t('tl_class'), ui.input({ value: name, mono: true, onInput: (v) => { name = String(v).trim().replace(/^\./, '').replace(/[^a-zA-Z0-9_-]/g, '-') || 'mi-estilo'; refresh(); } }), t('tl_class_hint'));
    const rows = h('div', { class: 'st-save-projects' });
    const drawRows = () => CS.mount(rows, list.slice(0, 30).map((p) => ui.row({
      lead: CS.common.avatar(p, 'sm'), title: p.name, sub: CS.common.projectMeta(p), chevron: false, active: p.id === projectId,
      trailing: p.id === projectId ? h('span', { class: 'st-check' }, icon('checkCircle')) : null,
      onClick: () => { projectId = p.id; drawRows(); }
    })));
    drawRows();
    refresh();
    const save = async () => {
      try {
        const p = await CS.studio.loadProject(projectId);
        const path = p.files['style.css'] ? 'style.css' : (Object.keys(p.files).find((x) => /\.css$/i.test(x)) || 'style.css');
        const before = p.files[path] && p.files[path].kind === 'text' ? p.files[path].content : '';
        const block = '/* ' + t('tl_from_tools', { tool: t('tl_' + o.tool) }) + ' */\n' + build() + '\n';
        CS.projects.write(path, (before.replace(/\s+$/, '') + (before.trim() ? '\n\n' : '') + block), { project: p });
        if (p === CS.projects.current) { CS.projects.touch('tools'); await CS.projects.flush(); } else { p.updatedAt = Date.now(); await CS.projects.save(p); }
        CS.settings.set('studioProject', projectId);
        CS.bus.emit('projects-changed');
        handle.close();
        ui.toast(o.raw ? t('tl_added_raw', { file: path }) : t('tl_added', { name: '.' + name, file: path }), 'ok', { action: { label: t('open'), onClick: () => CS.common.openProject(projectId, 'code') } });
      } catch (error) { ui.toast(CS.common.errorText(error), 'error'); }
    };
    const handle = ui.sheet({
      title: t('tl_use_title'), subtitle: o.raw ? null : t('tl_use_sub'), size: 'tall',
      body: [nameField, preview.el, h('div', { class: 'st-pick-label' }, t('st_project')), rows],
      actions: [ui.button({ label: t('cancel'), variant: 'ghost', onClick: () => handle.close() }), ui.button({ label: t('tl_add'), icon: 'plus', variant: 'primary', onClick: save })]
    });
  }

  /* ---------- Hub ---------- */
  function tile(def) {
    return h('button', { class: 'tl-tile', type: 'button', 'data-tool': def.id, onclick: () => open(def.id) },
      h('span', { class: 'tl-tile-icon tint-' + def.tint }, icon(def.icon)),
      h('span', { class: 'tl-tile-text' }, h('strong', {}, t('tl_' + def.id)), h('small', {}, t('tl_' + def.id + '_sub'))));
  }

  function renderHub() {
    let query = '';
    const groupsHost = h('div', { class: 'tl-groups' });
    const draw = () => {
      const q = query.trim().toLowerCase();
      const match = (d) => !q || (t('tl_' + d.id) + ' ' + t('tl_' + d.id + '_sub') + ' ' + (t('tl_' + d.id + '_kw') || '')).toLowerCase().includes(q);
      const parts = GROUPS.map((g) => {
        const items = TOOLS.filter((d) => d.group === g.id && match(d));
        if (!items.length) return null;
        return h('section', { class: 'tl-group' },
          h('div', { class: 'tl-group-head' }, h('span', { class: 'tl-group-icon tint-' + g.tint }, icon(g.icon)), h('h2', {}, t('tl_group_' + g.id))),
          h('div', { class: 'tl-grid' }, items.map(tile)));
      }).filter(Boolean);
      CS.mount(groupsHost, parts.length ? parts : ui.empty({ icon: 'search', title: t('tl_none', { q: query }) }));
    };
    draw();
    const rec = recent();
    return h('div', { class: 'tl-hub' },
      h('header', { class: 'lr-head' }, h('div', { class: 'eyebrow' }, t('tl_kicker')), h('h1', { class: 'lr-title' }, t('tl_title')), h('p', { class: 'lr-intro' }, t('tl_lead'))),
      ui.searchBox({ placeholder: t('tl_search'), onInput: (v) => { query = v; draw(); } }),
      rec.length ? h('div', { class: 'tl-recent' }, h('span', { class: 'tl-recent-label' }, t('tl_recent')),
        rec.map((id) => ui.chip(t('tl_' + id), { icon: get(id).icon, onClick: () => open(id) }))) : null,
      groupsHost);
  }

  /* ---------- Tool view ---------- */
  let active = null;
  function renderTool(params) {
    const def = get(params && params.id);
    if (!def) return ui.empty({ icon: 'tools', title: t('tl_missing') });
    if (!def.render) {
      /* Link tools (studio editors) only navigate; a direct route lands here. */
      return ui.empty({ icon: def.icon, title: t('tl_' + def.id), body: t('tl_' + def.id + '_sub'),
        action: ui.button({ label: t('open'), icon: def.icon, variant: 'primary', onClick: () => def.go(params || {}) }) });
    }
    active = def;
    return h('div', { class: 'tl-view tl-' + def.id }, def.render({ params: params || {}, t }));
  }

  router.register('tools', { tab: 'create', backTo: 'create', largeTitle: true, title: () => t('tl_title'), render: renderHub });
  router.register('tool', { tab: 'create', backTo: 'tools', title: (p) => t('tl_' + (p && p.id)), render: renderTool,
    leave: () => { if (active && active.leave) active.leave(); active = null; } });

  /* Studio editors live in their own module; the suite links to them. */
  [['pixel', 'sprite', 'orange'], ['image', 'image', 'blue'], ['audio', 'wave', 'teal']].forEach(([id, ic, tint], i) =>
    add({ id: 'st-' + id, group: 'studio', icon: ic, tint, order: 90 + i, go: () => CS.studio.open(id) }));

  /* Global search: tools and templates. */
  if (CS.search && CS.search.provide) {
    const fold = (x) => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const rank = (items, q) => items.map((x) => { const n = fold(x.name); return [n.startsWith(q) ? 0 : n.includes(q) ? 1 : fold(x.body).includes(q) ? 2 : -1, x]; })
      .filter((x) => x[0] >= 0).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    CS.search.provide({ id: 'tools', order: 65, run(q) {
      const items = TOOLS.filter((d) => !d.go).map((d) => ({ d, name: t('tl_' + d.id), body: t('tl_' + d.id + '_sub') + ' ' + t('tl_' + d.id + '_kw') }));
      return rank(items, q).map((x) => ({ icon: x.d.icon, tint: x.d.tint, title: x.name, sub: t('tl_' + x.d.id + '_sub'), go: () => open(x.d.id) }));
    } });
    CS.search.provide({ id: 'templates', order: 15, run(q) {
      if (!CS.templates) return [];
      const L = CS.templates.L, lang = CS.i18n.lang === 'en' ? 'en' : 'es';
      const items = CS.templates.list('all').map((d) => ({ d, name: L(d.name, lang), body: L(d.desc, lang) }));
      return rank(items, q).map((x) => ({ icon: x.d.icon, tint: x.d.tint, title: x.name, sub: x.body, go: () => router.go('template', { id: x.d.id }) }));
    } });
  }

  CS.tools = { add, get, open, list: () => TOOLS.slice(), GROUPS, copy, codeBox, slider, swatch, panel, row, useCss };
})();
