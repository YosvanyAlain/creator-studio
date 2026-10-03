/* Blocks sheets: palette with search and the block editor with a live JavaScript preview. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, ui } = CS;
  const t = (...a) => CS.t(...a);
  const S = () => CS.blocksSync;
  const B = () => CS.blocks;
  const RECENT_KEY = 'wcs3_blocks_recent';
  const POPULAR = ['set_text', 'show', 'hide', 'toast', 'set_var', 'change_var', 'if_var', 'if_else', 'repeat', 'delay', 'play_tone', 'send_update'];

  const recent = {
    get() { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').filter((x) => B().DEFS[x]); } catch (e) { return []; } },
    add(type) { try { localStorage.setItem(RECENT_KEY, JSON.stringify([type].concat(recent.get().filter((x) => x !== type)).slice(0, 8))); } catch (e) { /* storage unavailable */ } }
  };
  const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const allowed = (def, kind) => !def.context || def.context === kind;

  /* ---------- Palette ---------- */
  function palette(p, opts) {
    const kind = opts.kind || 'onStart';
    let query = '';
    let cat = null;
    const body = h('div', { class: 'pal' });
    const list = h('div', { class: 'pal-body' });
    const search = ui.searchBox({ placeholder: t('blk_search'), onInput: (v) => { query = v; draw(); } });
    body.append(h('div', { class: 'pal-top' }, search), list);
    const sheet = ui.sheet({ title: t('blk_palette'), subtitle: t('blk_palette_sub'), size: 'tall', class: 'pal-sheet', body });

    const pick = (type) => { recent.add(type); sheet.close(); opts.onPick(type); };
    const defs = () => Object.keys(B().DEFS).filter((type) => allowed(B().DEFS[type], kind));

    function row(type, showCat) {
      const def = B().DEFS[type];
      const md = S().meta(type);
      const [icon, tint] = S().catStyle(def.cat);
      const catDef = B().CATS.find((c) => c.id === def.cat);
      return h('button', { type: 'button', class: 'pal-row', onclick: () => pick(type) },
        ui.tile(icon, tint, 'sm'),
        h('span', { class: 'pal-row-main' },
          h('span', { class: 'pal-row-name' }, md.name, def.container ? h('span', { class: 'pal-tag' }, t('blk_container')) : null),
          h('span', { class: 'pal-row-desc' }, md.desc || ''),
          showCat && catDef ? h('span', { class: 'pal-row-cat' }, S().label(catDef)) : null),
        h('span', { class: 'pal-row-add' }, CS.icon('plus')));
    }

    function draw() {
      list.scrollTop = 0;
      const q = fold(query.trim());
      if (q) {
        const words = q.split(/\s+/);
        const hits = defs().map((type) => {
          const d = B().DEFS[type];
          const hay = fold([type, d.es && d.es.name, d.en && d.en.name, d.es && d.es.desc, d.en && d.en.desc].join(' '));
          const name = fold(S().meta(type).name);
          if (!words.every((w) => hay.includes(w))) return null;
          return { type, score: (name.startsWith(words[0]) ? 0 : name.includes(words[0]) ? 1 : 2) };
        }).filter(Boolean).sort((a, b) => a.score - b.score).slice(0, 80);
        CS.mount(list, hits.length ? hits.map((x) => row(x.type, true)) : ui.empty({ icon: 'search', title: t('blk_no_results'), body: t('blk_no_results_body') }));
        return;
      }
      if (cat) {
        const catDef = B().CATS.find((c) => c.id === cat);
        const types = defs().filter((type) => B().DEFS[type].cat === cat);
        const [icon, tint] = S().catStyle(cat);
        CS.mount(list,
          h('button', { type: 'button', class: 'pal-back', onclick: () => { cat = null; draw(); } }, CS.icon('back'), h('span', {}, t('blk_all_categories'))),
          h('div', { class: 'pal-cat-head' }, ui.tile(icon, tint), h('div', {}, h('strong', {}, S().label(catDef)), h('span', {}, t('blk_n_blocks', { n: types.length })))),
          types.map((type) => row(type, false)));
        return;
      }
      const rec = recent.get().filter((type) => allowed(B().DEFS[type], kind));
      const popular = POPULAR.filter((type) => B().DEFS[type] && allowed(B().DEFS[type], kind) && !rec.includes(type)).slice(0, 8);
      const cats = B().CATS.map((c) => ({ c, n: defs().filter((type) => B().DEFS[type].cat === c.id).length })).filter((x) => x.n);
      CS.mount(list,
        rec.length ? h('div', { class: 'pal-group' }, h('div', { class: 'pal-label' }, t('blk_recent')), h('div', { class: 'pal-quick' }, rec.slice(0, 6).map(quick))) : null,
        h('div', { class: 'pal-group' }, h('div', { class: 'pal-label' }, t('blk_popular')), h('div', { class: 'pal-quick' }, popular.map(quick))),
        h('div', { class: 'pal-label' }, t('blk_categories')),
        h('div', { class: 'pal-cats' }, cats.map(({ c, n }) => {
          const [icon, tint] = S().catStyle(c.id);
          return h('button', { type: 'button', class: 'pal-cat', onclick: () => { cat = c.id; draw(); } },
            ui.tile(icon, tint, 'sm'), h('span', { class: 'pal-cat-name' }, S().label(c)), h('span', { class: 'pal-cat-n' }, String(n)));
        })));
    }

    function quick(type) {
      const [icon, tint] = S().catStyle(B().DEFS[type].cat);
      return h('button', { type: 'button', class: 'pal-chip', onclick: () => pick(type) }, h('span', { class: 'pal-chip-ico tint-' + tint }, CS.icon(icon)), h('span', {}, S().meta(type).name));
    }

    draw();
    return sheet;
  }

  /* ---------- Block editor ---------- */
  const REASONS = { id: 'blk_r_id', name: 'blk_r_name', value: 'blk_r_value', ms: 'blk_r_ms', range: 'blk_r_range', times: 'blk_r_times', fn: 'blk_r_fn', key: 'blk_r_key', unknown: 'blk_r_unknown' };

  function editBlock(p, id, opts) {
    const o = opts || {};
    const hit = S().find(p.blocks.model, id);
    if (!hit) return null;
    const b = hit.block;
    const def = B().DEFS[b.type];
    const md = S().meta(b.type);
    if (!def) { ui.toast(t('blk_unknown', { type: b.type }), 'error'); return null; }
    const catDef = B().CATS.find((c) => c.id === def.cat);
    const [icon, tint] = S().catStyle(def.cat);
    let touched = false;
    const preview = h('pre', { class: 'blk-js-code' });
    const issue = h('div', { class: 'blk-js-issue', hidden: true });
    const commitSoon = CS.util.debounce(() => S().commit(p, 'params'), 300);

    function set(key, value) {
      if (!touched) { S().snapshot(p); touched = true; }
      b.params[key] = value;
      update();
      commitSoon();
    }

    function update() {
      const m = p.blocks.model;
      const res = B().genBlock(b, S().genCtx(m), 0);
      const lines = res.lines.filter((l) => !/^\s*\/\* ⚠/.test(l));
      preview.textContent = lines.join('\n') || '/* … */';
      CS.blocksUi.highlight(preview);
      const own = res.problems.filter((x) => x.id === b.id);
      issue.hidden = !own.length;
      if (own.length) CS.mount(issue, CS.icon('alertTriangle'), h('span', {}, t(REASONS[own[0].reason] || 'blk_r_params')));
    }

    const fields = def.params.map((param) => h('div', { class: 'blk-field' },
      h('div', { class: 'blk-field-label' }, S().label(param), param.optional ? h('span', { class: 'blk-opt' }, t('blk_optional')) : null),
      control(p, b, param, (v) => set(param.key, v))));

    const jsBox = h('section', { class: 'blk-js' },
      h('div', { class: 'blk-js-head' }, CS.icon('code'), h('span', {}, t('blk_js_title')), h('span', { class: 'spacer' }), h('span', { class: 'blk-js-file' }, p.blocks.generatedFile)),
      preview, issue);

    const body = h('div', { class: 'blk-editor' },
      h('div', { class: 'blk-editor-intro' }, h('span', { class: 'blk-ico-lg', ref: (n) => { n.style.setProperty('--c', 'var(--tint-' + tint + ')'); n.style.setProperty('--c-bg', 'var(--tint-' + tint + '-bg)'); } }, CS.icon(icon)),
        h('p', {}, md.desc || ''), def.example ? h('code', { class: 'blk-example' }, def.example) : null),
      fields.length ? fields : h('p', { class: 'blk-noparams' }, t('blk_no_params')),
      jsBox);

    const sheet = ui.sheet({
      title: md.name, subtitle: catDef ? S().label(catDef) : '', size: 'tall', class: 'blk-editor-sheet', body,
      actions: [
        ui.button({ label: t('delete'), icon: 'trash', variant: 'ghost', class: 'btn-danger-text', onClick: () => {
          sheet.close();
          const again = S().find(p.blocks.model, id);
          if (again) S().change(p, () => { again.list.splice(again.index, 1); }, 'remove');
        } }),
        ui.button({ label: t('blk_done'), icon: 'check', variant: 'primary', onClick: () => sheet.close() })
      ],
      onClose: () => { if (touched) { commitSoon.cancel(); S().commit(p, 'params'); } }
    });
    update();
    if (o.code) setTimeout(() => jsBox.scrollIntoView({ block: 'center' }), 80);
    else if (o.fresh) setTimeout(() => { const first = body.querySelector('.blk-field input, .blk-field textarea'); if (first && !first.value) first.focus(); }, 260);
    return sheet;
  }

  /* ---------- Parameter controls ---------- */
  function control(p, b, param, set) {
    const value = b.params[param.key];
    const m = p.blocks.model;
    switch (param.type) {
      case 'number': return ui.input({ value, inputmode: 'decimal', mono: true, onInput: (v) => set(v) });
      case 'color': return colorField(value, set);
      case 'select': return ui.select(param.options.map((x) => ({ value: x.v, label: S().label(x) })), value, set);
      case 'expr': return ui.input({ value, mono: true, placeholder: 'a + b * 2', onInput: set });
      case 'element': return pickField(value, set, { prefix: '#', options: S().htmlIds(p), hint: t('blk_id_hint'), validate: CS.util.isElementId });
      case 'sprite': return pickField(value, set, { options: S().spriteNames(m), placeholder: 'hero' });
      case 'var': return nameField(p, value, set, 'var');
      case 'func': return nameField(p, value, set, 'func');
      case 'value': return valueField(p, value, set);
      case 'pixels': case 'map': return ui.input({ value, multiline: true, rows: 8, mono: true, class: 'blk-pixels', onInput: set });
      case 'asset': {
        const imgs = Object.keys(p.files).filter((x) => /\.(png|jpe?g|gif|webp|svg)$/i.test(x));
        if (!imgs.length) return h('p', { class: 'blk-hint' }, t('blk_no_images'));
        return ui.select([{ value: '', label: '—' }].concat(imgs.map((x) => ({ value: x, label: x }))), value || '', set);
      }
      default: {
        const long = /^(html|css|code|js|rows|content|template)$/i.test(param.key);
        return ui.input({ value, multiline: long, rows: long ? 4 : null, mono: long, onInput: set });
      }
    }
  }

  function colorField(value, set) {
    const hex = ui.input({ value, mono: true, class: 'blk-hex', onInput: (v) => { if (B().isHexColor(v)) { swatch.value = v.length === 4 ? '#' + v.slice(1).split('').map((c) => c + c).join('') : v.slice(0, 7); set(v); } } });
    const swatch = h('input', { type: 'color', class: 'blk-color', value: /^#[0-9a-f]{6}$/i.test(value) ? value : '#4f46e5', oninput: (e) => { hex.value = e.target.value; set(e.target.value); } });
    return h('div', { class: 'blk-color-row' }, swatch, hex);
  }

  /* Text field with tappable suggestions (ids, sprite names). */
  function pickField(value, set, o) {
    const chips = h('div', { class: 'blk-suggest' });
    const field = ui.input({ value, mono: true, placeholder: o.placeholder || (o.prefix ? 'id' : ''), onInput: (v) => { set(v.replace(/^#/, '').trim()); drawChips(); } });
    function drawChips() {
      const cur = field.value.replace(/^#/, '').trim();
      const opts = o.options.filter((x) => x !== cur && (!cur || x.toLowerCase().includes(cur.toLowerCase()))).slice(0, 14);
      CS.mount(chips, opts.map((x) => h('button', { type: 'button', class: 'blk-sug', onclick: () => { field.value = x; set(x); drawChips(); } }, (o.prefix || '') + x)));
      chips.hidden = !opts.length;
    }
    drawChips();
    return h('div', { class: 'blk-pick' },
      h('div', { class: 'blk-prefixed' }, o.prefix ? h('span', { class: 'blk-prefix' }, o.prefix) : null, field),
      chips, o.hint ? h('p', { class: 'blk-hint' }, o.hint) : null);
  }

  /* Variable or function chooser with an inline "new" action. */
  function nameField(p, value, set, kind) {
    const wrap = h('div', { class: 'blk-names' });
    function draw() {
      const m = p.blocks.model;
      const names = kind === 'var' ? m.vars.map((v) => v.name) : m.contexts.functions.map((f) => f.target);
      CS.mount(wrap,
        names.map((n) => h('button', { type: 'button', class: ['blk-name-chip', n === value && 'on'], onclick: () => { value = n; set(n); draw(); } }, n)),
        h('button', { type: 'button', class: 'blk-name-chip blk-name-new', onclick: async () => {
          const name = await askIdentifier(kind === 'var' ? t('blk_var_new') : t('blk_fn_new'), names);
          if (!name) return;
          if (kind === 'var') m.vars.push({ name, value: '' });
          else m.contexts.functions.push({ target: name, blocks: [] });
          value = name; set(name); draw();
        } }, CS.icon('plus'), kind === 'var' ? t('blk_var_new') : t('blk_fn_new')),
        !names.length ? h('p', { class: 'blk-hint' }, kind === 'var' ? t('blk_var_none') : t('blk_fn_none')) : null);
    }
    draw();
    return wrap;
  }

  async function askIdentifier(title, taken, current) {
    const name = await ui.prompt({ title, value: current || '', mono: true, placeholder: 'puntos', hint: t('blk_name_hint') });
    if (name == null) return null;
    const clean = name.trim();
    if (!CS.util.isVarName(clean)) { ui.toast(t('blk_bad_name'), 'error'); return null; }
    if (clean !== current && taken.includes(clean)) { ui.toast(t('blk_name_taken'), 'error'); return null; }
    return clean;
  }

  /* A value can be typed text, a number, a variable or what the user wrote in a field. */
  function valueField(p, value, set) {
    let v = Object.assign({ kind: 'text', value: '' }, value || {});
    const holder = h('div', { class: 'blk-value-body' });
    const kinds = [
      { value: 'text', label: t('blk_k_text'), icon: 'type' },
      { value: 'number', label: t('blk_k_number'), icon: 'hash' },
      { value: 'var', label: t('blk_k_var'), icon: 'box' },
      { value: 'input', label: t('blk_k_input'), icon: 'edit' }
    ];
    const seg = ui.segmented(kinds, v.kind, (k) => {
      v = k === 'var' ? { kind: 'var', name: '' } : k === 'input' ? { kind: 'input', id: '' } : { kind: k, value: k === v.kind ? v.value : (v.value != null ? v.value : '') };
      set(v); draw();
    }, { class: 'blk-kinds' });
    function draw() {
      if (v.kind === 'var') CS.mount(holder, nameField(p, v.name, (n) => { v = { kind: 'var', name: n }; set(v); }, 'var'));
      else if (v.kind === 'input') CS.mount(holder, pickField(v.id, (id) => { v = { kind: 'input', id }; set(v); }, { prefix: '#', options: S().htmlIds(p), hint: t('blk_input_hint') }));
      else if (v.kind === 'number') CS.mount(holder, ui.input({ value: v.value, inputmode: 'decimal', mono: true, onInput: (x) => { v = { kind: 'number', value: x }; set(v); } }));
      else CS.mount(holder, ui.input({ value: v.value, placeholder: t('blk_text_ph'), onInput: (x) => { v = { kind: 'text', value: x }; set(v); } }));
    }
    draw();
    return h('div', { class: 'blk-value' }, seg, holder);
  }

  CS.blocksUi = Object.assign(CS.blocksUi || {}, { palette, editBlock, askIdentifier });
})();
