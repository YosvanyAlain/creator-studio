/* Blocks sheets: events, variables, renames and the generated code view. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, ui } = CS;
  const t = (...a) => CS.t(...a);
  const S = () => CS.blocksSync;
  const B = () => CS.blocks;

  /* Ask for an element id with suggestions from the HTML. Resolves to the id or null. */
  function askElement(p, title, current) {
    return new Promise((resolve) => {
      let value = current || '';
      let result = null;
      const ids = S().htmlIds(p);
      const field = ui.input({ value, mono: true, placeholder: 'boton', onInput: (v) => { value = v.replace(/^#/, '').trim(); }, onEnter: () => finish(true) });
      const chips = h('div', { class: 'blk-suggest' }, ids.map((id) => h('button', { type: 'button', class: 'blk-sug', onclick: () => { value = id; finish(true); } }, '#' + id)));
      const finish = (ok) => {
        if (ok && !CS.util.isElementId(value)) { ui.toast(t('blk_bad_id'), 'error'); return; }
        result = ok ? value : null;
        sheet.close();
      };
      const sheet = ui.sheet({
        title, size: 'dialog', class: 'dialog',
        body: [
          h('div', { class: 'blk-prefixed' }, h('span', { class: 'blk-prefix' }, '#'), field),
          ids.length ? h('div', { class: 'blk-field-label' }, t('blk_ids_in_page')) : null,
          ids.length ? chips : null,
          h('p', { class: 'blk-hint' }, t('blk_id_hint'))
        ],
        actions: [ui.button({ label: t('cancel'), variant: 'ghost', onClick: () => finish(false) }), ui.button({ label: t('ok'), variant: 'primary', onClick: () => finish(true) })],
        onClose: () => resolve(result)
      });
      setTimeout(() => field.focus(), 60);
    });
  }

  /* ---------- Events ---------- */
  function addEvent(p, opts) {
    const m = p.blocks.model;
    const o = opts || {};
    const addTarget = async (kind, title) => {
      const id = await askElement(p, title);
      if (!id) return;
      const arr = m.contexts[kind];
      if (!arr.some((c) => c.target === id)) S().change(p, () => { arr.push({ target: id, blocks: [] }); }, 'event');
      else ui.toast(t('blk_ev_exists'), 'info');
      if (o.onAdded) o.onAdded(kind + ':' + id);
      focusEvent(kind + ':' + id);
    };
    ui.menu({ title: t('blk_add_event'), subtitle: t('blk_add_event_sub'), items: [
      { icon: 'cursor', tint: 'blue', label: t('blk_new_click'), sub: t('blk_new_click_sub'), onClick: () => addTarget('onClick', t('blk_new_click')) },
      { icon: 'edit', tint: 'teal', label: t('blk_new_change'), sub: t('blk_new_change_sub'), onClick: () => addTarget('onChange', t('blk_new_change')) },
      { icon: 'hand', tint: 'violet', label: t('blk_new_touch'), sub: t('blk_new_touch_sub'), onClick: () => addTarget('onTouch', t('blk_new_touch')) },
      { icon: 'xdc', tint: 'indigo', label: t('blk_new_update'), sub: t('blk_new_update_sub'), onClick: () => {
        if (o.onAdded) o.onAdded('onUpdate');
        CS.bus.emit('blocks-changed', { project: p, reason: 'show' });
        focusEvent('onUpdate');
      } },
      { icon: 'braces', tint: 'orange', label: t('blk_new_fn'), sub: t('blk_new_fn_sub'), onClick: async () => {
        const name = await CS.blocksUi.askIdentifier(t('blk_fn_new'), m.contexts.functions.map((f) => f.target));
        if (!name) return;
        S().change(p, () => { m.contexts.functions.push({ target: name, blocks: [] }); }, 'event');
        focusEvent('functions:' + name);
      } }
    ] });
  }

  function focusEvent(key) {
    setTimeout(() => {
      const node = document.querySelector('.blk-ev[data-ev="' + CSS.escape(key) + '"]');
      if (!node) return;
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      node.classList.add('blk-flash');
      setTimeout(() => node.classList.remove('blk-flash'), 1200);
    }, 80);
  }

  /* Change an event's element, or rename a function and its calls. */
  async function retarget(p, c) {
    const m = p.blocks.model;
    if (c.kind === 'functions') {
      const old = c.ctx.target;
      const name = await CS.blocksUi.askIdentifier(t('rename'), m.contexts.functions.map((f) => f.target), old);
      if (!name || name === old) return;
      S().change(p, () => {
        c.ctx.target = name;
        renameRefs(m, 'func', old, name);
      }, 'rename');
      return;
    }
    const id = await askElement(p, t('blk_ev_change_target'), c.ctx.target);
    if (!id || id === c.ctx.target) return;
    if (m.contexts[c.kind].some((x) => x.target === id)) { ui.toast(t('blk_ev_exists'), 'info'); return; }
    S().change(p, () => { c.ctx.target = id; }, 'rename');
  }

  /* Update parameters that point at a variable or function name. */
  function renameRefs(m, type, from, to) {
    let n = 0;
    S().walkAll(m, (b) => {
      const def = B().DEFS[b.type];
      if (!def) return;
      def.params.forEach((param) => {
        const v = b.params[param.key];
        if (param.type === type && v === from) { if (to !== undefined) b.params[param.key] = to; n++; }
        if (type === 'var' && param.type === 'value' && v && v.kind === 'var' && v.name === from) { if (to !== undefined) v.name = to; n++; }
      });
    });
    return n;
  }

  /* ---------- Variables ---------- */
  function editVar(p, name) {
    const m = p.blocks.model;
    const existing = name ? m.vars.find((v) => v.name === name) : null;
    let newName = existing ? existing.name : '';
    let value = existing && existing.value != null ? String(existing.value) : '';
    const nameField = ui.input({ value: newName, mono: true, placeholder: 'puntos', onInput: (v) => { newName = v.trim(); } });
    const valueField = ui.input({ value, placeholder: '0', onInput: (v) => { value = v; }, onEnter: () => save() });
    const uses = existing ? renameRefs(m, 'var', existing.name) : 0;
    function save() {
      if (!CS.util.isVarName(newName)) { ui.toast(t('blk_bad_name'), 'error'); return; }
      if ((!existing || newName !== existing.name) && m.vars.some((v) => v.name === newName)) { ui.toast(t('blk_name_taken'), 'error'); return; }
      sheet.close();
      S().change(p, () => {
        if (existing) {
          if (newName !== existing.name) renameRefs(m, 'var', existing.name, newName);
          existing.name = newName;
          existing.value = value;
        } else m.vars.push({ name: newName, value });
      }, 'var');
    }
    const sheet = ui.sheet({
      title: existing ? t('blk_var_edit') : t('blk_var_new'), size: 'dialog', class: 'dialog',
      body: [
        ui.field(t('blk_var_name'), nameField, t('blk_name_hint')),
        ui.field(t('blk_var_start'), valueField, t('blk_var_start_hint')),
        existing ? h('p', { class: 'blk-hint' }, uses ? t('blk_var_uses', { n: uses }) : t('blk_var_unused')) : null
      ],
      actions: [
        existing ? ui.button({ label: t('delete'), icon: 'trash', variant: 'ghost', class: 'btn-danger-text', onClick: async () => {
          if (uses && !(await ui.confirm({ title: t('blk_var_delete'), message: t('blk_var_delete_body', { n: uses }), danger: true, okLabel: t('delete') }))) return;
          sheet.close();
          S().change(p, () => { m.vars.splice(m.vars.indexOf(existing), 1); }, 'var');
        } }) : ui.button({ label: t('cancel'), variant: 'ghost', onClick: () => sheet.close() }),
        ui.button({ label: t('save'), variant: 'primary', onClick: save })
      ]
    });
    setTimeout(() => (existing ? valueField : nameField).focus(), 60);
  }

  /* ---------- Generated code ---------- */
  const KEYWORDS = /^(const|let|var|function|async|await|return|if|else|for|while|of|in|new|try|catch|finally|throw|break|continue|typeof|true|false|null|undefined)$/;
  const TOKENS = /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|\b(\d+(?:\.\d+)?)\b|([A-Za-z_$][\w$]*)/g;

  function highlight(pre) {
    const src = pre.textContent;
    const esc = CS.util.escapeHtml;
    let out = '';
    let last = 0;
    let m;
    TOKENS.lastIndex = 0;
    while ((m = TOKENS.exec(src))) {
      out += esc(src.slice(last, m.index));
      const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'n' : KEYWORDS.test(m[4]) ? 'k' : /^(document|webxdc|window|console|Math|JSON|localStorage)$/.test(m[4]) ? 'g' : src[TOKENS.lastIndex] === '(' ? 'f' : null;
      out += cls ? '<span class="hl-' + cls + '">' + esc(m[0]) + '</span>' : esc(m[0]);
      last = TOKENS.lastIndex;
    }
    pre.innerHTML = out + esc(src.slice(last));
  }

  function showCode(p, api, res) {
    const file = p.blocks.generatedFile;
    const out = res || S().output(p);
    const pre = h('pre', { class: 'blk-code-view' }, out.code);
    highlight(pre);
    const lines = out.code.split('\n').length;
    const sheet = ui.sheet({
      title: t('blk_code_title'), subtitle: t('blk_code_sub', { file, n: lines }), size: 'full', class: 'blk-code-sheet',
      headerActions: ui.iconButton('copy', t('copy'), async () => {
        try { await navigator.clipboard.writeText(out.code); ui.toast(t('copied'), 'ok'); } catch (e) { ui.toast(t('copy_failed'), 'error'); }
      }),
      body: [h('p', { class: 'blk-code-tip' }, CS.icon('bulb'), h('span', {}, t('blk_code_tip'))), pre],
      actions: [ui.button({ label: t('blk_open_in_code'), icon: 'fileJs', variant: 'tonal', onClick: () => { sheet.close(); S().flushWrite(p); api.openFile(file); } })]
    });
  }

  CS.blocksUi = Object.assign(CS.blocksUi || {}, { addEvent, retarget, editVar, showCode, highlight, askElement });
})();
