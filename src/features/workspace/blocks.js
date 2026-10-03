/* Blocks tab: the app's logic as readable event cards with nested block lists. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, ui } = CS;
  const t = (...a) => CS.t(...a);
  const S = () => CS.blocksSync;
  const B = () => CS.blocks;
  const tintVars = (tint) => (node) => {
    node.style.setProperty('--c', 'var(--tint-' + tint + ')');
    node.style.setProperty('--c-bg', 'var(--tint-' + tint + '-bg)');
  };

  function mount(host, api) {
    const p = api.project;
    const shown = new Set();
    const collapsed = new Set();
    let moving = null;
    let problems = new Map();
    const root = h('div', { class: 'blk' });
    const moveBar = h('div', { class: 'blk-movebar', hidden: true },
      CS.icon('hand'), h('span', { class: 'blk-movebar-text' }, t('blk_move_hint')),
      ui.button({ label: t('cancel'), variant: 'ghost', size: 'sm', onClick: () => setMoving(null) }));
    CS.mount(host, h('div', { class: 'blk-scroll' }, root), moveBar);

    const ctxKey = (c) => c.kind + (c.ctx ? ':' + c.ctx.target : '');

    /* ---------- Render ---------- */
    function render() {
      const m = S().model(p);
      if (!m) { CS.mount(root, intro()); api.setActions(); return; }
      const res = S().output(p);
      problems = new Map(res.problems.map((x) => [x.id, x]));
      const cards = S().contextLists(m).filter((c) => c.kind === 'onStart' || c.list.length || c.ctx || shown.has(c.kind));
      CS.mount(root,
        statusBar(res),
        problems.size ? problemBanner() : null,
        varsCard(m),
        cards.map(eventCard),
        h('button', { type: 'button', class: 'blk-add-event', onclick: () => CS.blocksUi.addEvent(p, { onAdded: (key) => { shown.add(key); } }) },
          h('span', { class: 'blk-add-event-ico' }, CS.icon('plus')),
          h('span', { class: 'blk-add-event-text' }, h('strong', {}, t('blk_add_event')), h('span', {}, t('blk_add_event_sub')))));
      api.setActions();
    }

    function intro() {
      const point = (icon, tint, title, body) => h('div', { class: 'blk-intro-point' }, ui.tile(icon, tint, 'sm'), h('div', {}, h('strong', {}, title), h('p', {}, body)));
      return h('div', { class: 'blk-intro' },
        h('div', { class: 'blk-intro-art' }, introArt()),
        h('h2', { class: 'blk-intro-title' }, t('blk_intro_title')),
        h('p', { class: 'blk-intro-body' }, t('blk_intro_body')),
        h('div', { class: 'blk-intro-points' },
          point('bolt', 'orange', t('blk_intro_p1'), t('blk_intro_p1b')),
          point('blocks', 'indigo', t('blk_intro_p2'), t('blk_intro_p2b')),
          point('code', 'teal', t('blk_intro_p3'), t('blk_intro_p3b'))),
        ui.button({ label: t('blk_start'), icon: 'spark', variant: 'primary', size: 'lg', block: true, onClick: () => {
          S().start(p);
          ui.toast(t('blk_started', { file: p.blocks.generatedFile }), 'ok');
        } }),
        h('p', { class: 'blk-intro-note' }, t('blk_intro_note', { file: trivialApp() ? 'app.js' : 'blocks.js' })));
    }
    const trivialApp = () => !(CS.projects.text('app.js', p) || '').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '').replace(/['"]use strict['"];?/, '').trim();

    function introArt() {
      const piece = (cls, w) => h('span', { class: ['blk-art-piece', cls], style: { width: w } });
      return h('div', { class: 'blk-art', 'aria-hidden': 'true' },
        h('div', { class: 'blk-art-card' }, h('span', { class: 'blk-art-head' }), piece('a', '70%'), piece('b', '54%'), piece('c', '62%')),
        h('div', { class: 'blk-art-spark' }, CS.icon('spark')));
    }

    function statusBar(res) {
      const isPaused = S().paused(p);
      const file = p.blocks.generatedFile;
      const pill = isPaused
        ? h('button', { type: 'button', class: 'blk-pill blk-pill-warn', onclick: pausedSheet }, CS.icon('pause'), h('span', {}, t('blk_paused', { file })))
        : h('span', { class: 'blk-pill blk-pill-live' }, h('span', { class: 'blk-dot' }), h('span', {}, t('blk_live', { file })));
      return h('div', { class: 'blk-status' }, pill, h('span', { class: 'spacer' }),
        ui.button({ label: t('blk_view_js'), icon: 'code', variant: 'tonal', size: 'sm', onClick: () => CS.blocksUi.showCode(p, api, res) }));
    }

    function pausedSheet() {
      const file = p.blocks.generatedFile;
      const sheet = ui.sheet({
        title: t('blk_paused_title'), size: 'dialog', class: 'dialog',
        body: h('p', { class: 'dialog-msg' }, t('blk_paused_body', { file })),
        actions: [
          ui.button({ label: t('blk_keep_code'), variant: 'ghost', onClick: async () => {
            sheet.close();
            if (await ui.confirm({ title: t('blk_detach_title'), message: t('blk_detach_body', { file }), okLabel: t('blk_detach_ok') })) S().detach(p);
          } }),
          ui.button({ label: t('blk_overwrite'), variant: 'danger', onClick: () => { sheet.close(); S().writeNow(p, true); render(); ui.toast(t('blk_overwritten', { file }), 'ok'); } })
        ]
      });
    }

    function problemBanner() {
      const n = problems.size;
      return h('button', { type: 'button', class: 'blk-problems', onclick: () => focusBlock([...problems.keys()][0]) },
        CS.icon('alertTriangle'), h('span', {}, t('blk_problems', { n })), h('span', { class: 'spacer' }), h('span', { class: 'blk-problems-go' }, t('blk_fix')), CS.icon('chevronRight'));
    }

    function focusBlock(id) {
      const node = root.querySelector('[data-id="' + id + '"]');
      if (!node) return;
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      node.classList.remove('blk-flash');
      void node.offsetWidth;
      node.classList.add('blk-flash');
    }

    /* ---------- Variables ---------- */
    function varsCard(m) {
      const chips = m.vars.map((v) => h('button', { type: 'button', class: 'blk-var', onclick: () => CS.blocksUi.editVar(p, v.name) },
        h('span', { class: 'blk-var-name' }, v.name),
        v.value !== '' && v.value != null ? h('span', { class: 'blk-var-val' }, '= ' + String(v.value)) : null));
      return h('section', { class: 'blk-ev blk-vars' },
        h('div', { class: 'blk-ev-head' }, ui.tile('box', 'slate', 'sm'),
          h('div', { class: 'blk-ev-titles' }, h('div', { class: 'blk-ev-title' }, t('blk_vars')), h('div', { class: 'blk-ev-sub' }, m.vars.length ? t('blk_vars_sub') : t('blk_vars_empty')))),
        h('div', { class: 'blk-var-row' }, chips,
          h('button', { type: 'button', class: 'blk-var blk-var-add', onclick: () => CS.blocksUi.editVar(p, null) }, CS.icon('plus'), h('span', {}, t('blk_var_new')))));
    }

    /* ---------- Event cards ---------- */
    function eventTitle(c) {
      const pill = (text) => h('span', { class: 'blk-target' }, text);
      if (c.kind === 'onStart') return t('blk_ev_start');
      if (c.kind === 'onUpdate') return t('blk_ev_update');
      if (c.kind === 'functions') return [t('blk_ev_fn'), ' ', pill(c.ctx.target + '()')];
      return [t('blk_ev_' + c.kind.slice(2).toLowerCase()), ' ', pill('#' + c.ctx.target)];
    }

    function eventCard(c) {
      const st = S().CONTEXTS[c.kind];
      const key = ctxKey(c);
      const closed = collapsed.has(key);
      const count = countBlocks(c.list);
      const sub = count ? t('blk_n_blocks', { n: count }) : t('blk_ev_hint_' + c.kind);
      return h('section', { class: ['blk-ev', closed && 'blk-ev-closed'], dataset: { ev: key }, ref: tintVars(st.tint) },
        h('div', { class: 'blk-ev-head' },
          h('button', { type: 'button', class: 'blk-ev-toggle', 'aria-expanded': String(!closed), onclick: () => { closed ? collapsed.delete(key) : collapsed.add(key); render(); } },
            ui.tile(st.icon, st.tint, 'sm'),
            h('span', { class: 'blk-ev-titles' }, h('span', { class: 'blk-ev-title' }, eventTitle(c)), h('span', { class: 'blk-ev-sub' }, sub)),
            h('span', { class: 'blk-ev-chev' }, CS.icon(closed ? 'chevronDown' : 'chevronUp'))),
          ui.iconButton('moreH', t('more'), () => eventMenu(c))),
        closed ? null : h('div', { class: 'blk-ev-body' }, blockList(c.list, c.kind, 0, false)));
    }

    function countBlocks(list) { let n = 0; S().walk(list, () => { n++; }); return n; }

    function eventMenu(c) {
      const key = ctxKey(c);
      const items = [];
      if (c.ctx && c.kind !== 'functions') items.push({ icon: 'target', label: t('blk_ev_change_target'), onClick: () => CS.blocksUi.retarget(p, c) });
      if (c.kind === 'functions') items.push({ icon: 'type', label: t('rename'), onClick: () => CS.blocksUi.retarget(p, c) });
      if (c.list.length) items.push({ icon: 'trash', label: t('blk_ev_clear'), danger: true, onClick: async () => {
        if (await ui.confirm({ title: t('blk_ev_clear'), message: t('blk_ev_clear_body', { n: countBlocks(c.list) }), danger: true, okLabel: t('delete') })) S().change(p, () => { c.list.splice(0); });
      } });
      if (c.ctx) items.push({ icon: 'x', label: t('blk_ev_remove'), danger: true, onClick: async () => {
        if (c.list.length && !(await ui.confirm({ title: t('blk_ev_remove'), message: t('blk_ev_remove_body'), danger: true, okLabel: t('delete') }))) return;
        S().change(p, (m) => { const arr = m.contexts[c.kind]; const i = arr.indexOf(c.ctx); if (i >= 0) arr.splice(i, 1); });
      } });
      else if (c.kind !== 'onStart') items.push({ icon: 'eyeOff', label: t('blk_ev_hide'), onClick: () => { shown.delete(key); render(); } });
      if (!items.length) items.push({ icon: 'info', label: t('blk_ev_hint_' + c.kind), onClick: () => {} });
      ui.menu({ title: c.kind === 'onStart' ? t('blk_ev_start') : key.replace(':', ' · '), items });
    }

    /* ---------- Block lists ---------- */
    function blockList(list, kind, depth, frozen) {
      const wrap = h('div', { class: ['blk-list', depth && 'blk-list-nested'] });
      list.forEach((b, i) => {
        wrap.append(...[slot(list, i, kind, depth, true, frozen), blockCard(b, list, i, kind, depth, frozen)].filter(Boolean));
      });
      wrap.append(...[slot(list, list.length, kind, depth, false, frozen)].filter(Boolean));
      return wrap;
    }

    function slot(list, index, kind, depth, gap, frozen) {
      if (moving) {
        const hit = S().find(p.blocks.model, moving);
        const same = hit && hit.list === list && (index === hit.index || index === hit.index + 1);
        if (frozen || same) return gap ? null : h('div', { class: 'blk-slot-none' });
        return h('button', { type: 'button', class: 'blk-drop', onclick: () => moveTo(list, index) }, CS.icon('arrowDown'), h('span', {}, t('blk_move_here')));
      }
      if (gap) return h('button', { type: 'button', class: 'blk-gap', 'aria-label': t('blk_insert_here'), onclick: () => insertAt(list, index, kind) }, h('span', { class: 'blk-gap-dot' }, CS.icon('plus')));
      return h('button', { type: 'button', class: ['blk-add', !list.length && 'blk-add-first'], onclick: () => insertAt(list, index, kind) },
        CS.icon('plus'), h('span', {}, depth ? t('blk_add_inside') : list.length ? t('blk_add_block') : t('blk_add_first')));
    }

    function insertAt(list, index, kind) {
      CS.blocksUi.palette(p, { kind, onPick: (type) => {
        const b = B().newBlock(type);
        if (!b) return;
        S().change(p, () => { list.splice(index, 0, b); }, 'add');
        const def = B().DEFS[type];
        if (def.params.length) setTimeout(() => CS.blocksUi.editBlock(p, b.id, { fresh: true }), 120);
        else setTimeout(() => focusBlock(b.id), 60);
      } });
    }

    function blockCard(b, list, i, kind, depth, frozen) {
      const def = B().DEFS[b.type];
      const md = S().meta(b.type);
      const [icon, tint] = S().catStyle(def && def.cat);
      const bad = problems.has(b.id) || !def;
      const isMoving = moving === b.id;
      const card = h('div', { class: ['blk-card', bad && 'blk-bad', isMoving && 'blk-moving', def && def.container && 'blk-container'], dataset: { id: b.id }, ref: tintVars(tint) },
        h('div', { class: 'blk-card-row' },
          h('button', { type: 'button', class: 'blk-card-main', disabled: !!moving, onclick: () => CS.blocksUi.editBlock(p, b.id) },
            h('span', { class: 'blk-ico' }, CS.icon(def ? icon : 'alert')),
            h('span', { class: 'blk-text' }, h('span', { class: 'blk-name' }, def ? md.name : t('blk_unknown', { type: b.type })), summary(b, def)),
            bad ? h('span', { class: 'blk-warn', title: t('blk_incomplete') }, CS.icon('alertTriangle')) : null),
          moving ? null : ui.iconButton('moreV', t('more'), () => blockMenu(b, list, i), { class: 'blk-more' })));
      if (def && def.container) {
        card.appendChild(h('div', { class: 'blk-inner' }, blockList(b.children || (b.children = []), kind, depth + 1, frozen || isMoving)));
        if (def.elseBranch) {
          card.appendChild(h('div', { class: 'blk-else' }, h('span', { class: 'blk-else-label' }, t('blk_else'))));
          card.appendChild(h('div', { class: 'blk-inner' }, blockList(b.childrenElse || (b.childrenElse = []), kind, depth + 1, frozen || isMoving)));
        }
      }
      return card;
    }

    /* "Set text of #out to “Hi”" style summary using parameter pills. */
    function summary(b, def) {
      if (!def) return null;
      const parts = [];
      def.params.forEach((param) => {
        const text = S().paramText(def, param, b.params[param.key], p.blocks.model);
        if (text == null) { if (!param.optional) parts.push(h('span', { class: 'blk-chip blk-chip-empty' }, S().label(param))); return; }
        const kind = param.type === 'value' ? (b.params[param.key] || {}).kind : param.type;
        parts.push(h('span', { class: ['blk-chip', 'blk-chip-' + kind] },
          param.type === 'color' ? h('span', { class: 'blk-swatch', style: { background: text } }) : null, text));
      });
      return parts.length ? h('span', { class: 'blk-chips' }, parts.slice(0, 4), parts.length > 4 ? h('span', { class: 'blk-chip blk-chip-more' }, '+' + (parts.length - 4)) : null) : null;
    }

    function blockMenu(b, list, i) {
      const md = S().meta(b.type);
      ui.menu({ title: md.name, subtitle: md.desc, items: [
        { icon: 'edit', label: t('blk_edit'), onClick: () => CS.blocksUi.editBlock(p, b.id) },
        { icon: 'hand', label: t('blk_move'), onClick: () => setMoving(b.id) },
        i > 0 ? { icon: 'arrowUp', label: t('blk_up'), onClick: () => S().change(p, () => { list.splice(i - 1, 0, list.splice(i, 1)[0]); }) } : null,
        i < list.length - 1 ? { icon: 'arrowDown', label: t('blk_down'), onClick: () => S().change(p, () => { list.splice(i + 1, 0, list.splice(i, 1)[0]); }) } : null,
        { icon: 'copy', label: t('duplicate'), onClick: () => S().change(p, () => { list.splice(i + 1, 0, cloneBlock(b)); }) },
        { icon: 'code', label: t('blk_see_line'), onClick: () => CS.blocksUi.editBlock(p, b.id, { code: true }) },
        '-',
        { icon: 'trash', label: t('delete'), danger: true, onClick: () => removeBlock(b, list, i) }
      ] });
    }

    function cloneBlock(b) {
      const copy = JSON.parse(JSON.stringify(b));
      const fresh = (x) => { x.id = CS.util.uid('b'); (x.children || []).forEach(fresh); (x.childrenElse || []).forEach(fresh); };
      fresh(copy);
      return copy;
    }

    function removeBlock(b, list, i) {
      S().change(p, () => { list.splice(i, 1); }, 'remove');
      ui.toast(t('blk_removed'), 'info', { action: { label: t('undo'), onClick: () => S().undo(p) } });
    }

    /* ---------- Move mode: tap a highlighted slot to place the block ---------- */
    function setMoving(id) {
      moving = id;
      moveBar.hidden = !id;
      root.classList.toggle('blk-is-moving', !!id);
      render();
      if (id) CS.haptic();
    }

    function moveTo(list, index) {
      const id = moving;
      const hit = S().find(p.blocks.model, id);
      if (!hit) { setMoving(null); return; }
      S().change(p, () => {
        const block = hit.list.splice(hit.index, 1)[0];
        const at = hit.list === list && index > hit.index ? index - 1 : index;
        list.splice(at, 0, block);
      }, 'move');
      moving = null;
      moveBar.hidden = true;
      root.classList.remove('blk-is-moving');
      setTimeout(() => focusBlock(id), 60);
    }

    /* ---------- Wiring ---------- */
    const offs = [
      CS.bus.on('blocks-changed', (e) => { if (e && e.project === p) render(); }),
      CS.bus.on('file-changed', (e) => { if (e && e.project === p && p.blocks && e.path === p.blocks.generatedFile) refreshStatus(); })
    ];
    const refreshStatus = CS.util.debounce(() => { if (!host.hidden && S().model(p)) render(); }, 250);

    render();

    return {
      onShow() { S().reconcile(p); render(); },
      onHide() { S().flushWrite(p); if (moving) setMoving(null); },
      unmount() { S().flushWrite(p); offs.forEach((off) => off()); },
      actions() {
        if (!S().model(p)) return [];
        return [
          ui.iconButton('undo', t('undo'), () => S().undo(p), { disabled: !S().canUndo(p) }),
          ui.iconButton('redo', t('redo'), () => S().redo(p), { disabled: !S().canRedo(p) })
        ];
      }
    };
  }

  CS.ws.tab({ id: 'blocks', icon: 'blocks', label: 'ws_blocks', order: 10, mount });
})();
