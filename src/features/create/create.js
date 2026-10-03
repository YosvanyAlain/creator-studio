/* Create tab: starters, the template gallery, the live customizer and the wizard. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, ui, router } = CS;
  const t = (...a) => CS.t(...a);
  const TP = CS.templates;
  const lang = () => (CS.i18n.lang === 'en' ? 'en' : 'es');
  const L = (v) => TP.L(v, lang());
  const isStarter = (def) => TP.starters().includes(def);
  let filter = 'all';

  /* ---------- Pieces ---------- */
  function meta(def) {
    const group = (def.peers || 1) > 1;
    return h('span', { class: 'cr-meta' },
      h('span', { class: 'cr-meta-item' }, CS.icon(group ? 'users' : 'user'), group ? t('cr_group') : t('cr_solo')),
      def.level ? h('span', { class: 'cr-meta-item cr-level', title: t('cr_level_' + def.level) },
        [1, 2, 3].map((n) => h('i', { class: n <= def.level ? 'on' : '' })), t('cr_level_' + def.level)) : null,
      def.blocks ? h('span', { class: 'cr-meta-item cr-blocks' }, CS.icon('blocks'), t('cr_blocks_badge')) : null);
  }

  function card(def) {
    return h('button', { type: 'button', class: ['cr-card', 'tscope-' + def.tint], dataset: { tpl: def.id }, onclick: () => { CS.haptic(); router.go('template', { id: def.id }); } },
      h('span', { class: 'cr-card-art', 'aria-hidden': 'true' }, h('i'), h('i'), CS.icon(def.icon)),
      h('span', { class: 'cr-card-body' },
        h('span', { class: 'cr-card-title' }, L(def.name)),
        h('span', { class: 'cr-card-desc' }, L(def.desc)),
        meta(def)));
  }

  function starterCard(def) {
    return h('button', { type: 'button', class: ['cr-start', 'tscope-' + def.tint], dataset: { starter: def.id }, onclick: () => { CS.haptic(); router.go('template', { id: def.id }); } },
      h('span', { class: 'cr-start-icon' }, CS.icon(def.icon)),
      h('span', { class: 'cr-start-title' }, L(def.name)),
      h('span', { class: 'cr-start-sub' }, L(def.desc)));
  }

  function moreItem(icon, tint, title, sub, go) {
    return h('button', { type: 'button', class: 'cr-more-item', onclick: () => { CS.haptic(); go(); } },
      ui.tile(icon, tint), h('span', { class: 'cr-more-text' }, h('b', {}, title), h('small', {}, sub)), CS.icon('chevronRight'));
  }

  /* ---------- Hub ---------- */
  function renderHub(params) {
    const p = params || {};
    if (p.section === 'games') filter = 'games';
    const grid = h('div', { class: 'cr-grid' });
    const chips = h('div', { class: 'cr-chips', role: 'toolbar' });
    function paint() {
      const items = TP.list(filter);
      CS.mount(chips, [{ id: 'all', icon: 'sparkles' }].concat(TP.CATS).map((c) =>
        ui.chip(c.id === 'all' ? t('cr_all') : t('cat_' + c.id), { icon: c.icon, active: filter === c.id, onClick: () => { filter = c.id; paint(); } })));
      CS.mount(grid, items.length ? items.map(card) : ui.empty({ icon: 'emptyBox', title: t('cr_none') }));
    }
    paint();
    const view = h('div', { class: 'cr-hub' },
      h('header', { class: 'lr-head' }, h('div', { class: 'eyebrow' }, t('cr_eyebrow')), h('h1', { class: 'lr-title' }, t('cr_title')), h('p', { class: 'lr-intro' }, t('cr_intro'))),
      h('button', { type: 'button', class: 'cr-wizard', onclick: () => { CS.haptic(); wizard(); } },
        h('span', { class: 'cr-wizard-art', 'aria-hidden': 'true' }, CS.icon('wand')),
        h('span', { class: 'cr-wizard-text' }, h('b', {}, t('cr_wizard_title')), h('small', {}, t('cr_wizard_sub'))),
        h('span', { class: 'cr-wizard-go' }, t('cr_wizard_go'), CS.icon('chevronRight'))),
      ui.section(t('cr_start'), null, h('div', { class: 'cr-starts' }, TP.starters().map(starterCard))),
      h('section', { class: 'section cr-templates' },
        h('div', { class: 'section-head' }, h('div', {}, h('h2', { class: 'section-title' }, t('cr_templates')), h('div', { class: 'cr-sub' }, t('cr_templates_sub', { n: TP.list().length })))),
        chips, grid),
      ui.section(t('cr_more'), null, h('div', { class: 'cr-more' },
        moreItem('import', 'slate', t('cr_import'), t('cr_import_sub'), () => CS.importer && CS.importer.pickAndImport()),
        moreItem('tools', 'blue', t('cr_tools'), t('cr_tools_sub'), () => router.go('tools')),
        moreItem('sprite', 'orange', t('cr_pixel'), t('cr_pixel_sub'), () => CS.studio && CS.studio.open('pixel')),
        moreItem('wave', 'teal', t('cr_sound'), t('cr_sound_sub'), () => CS.studio && CS.studio.open('audio')))));
    if (p.section === 'templates' || p.section === 'games') {
      requestAnimationFrame(() => { const el = view.querySelector('.cr-templates'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start' }); });
    }
    return view;
  }

  /* ---------- Customization fields ---------- */
  function fieldControl(f, value, set) {
    if (f.type === 'color') {
      const hex = h('span', { class: 'cr-hex' }, value);
      return h('label', { class: 'cr-color' }, h('input', { type: 'color', value, oninput: (e) => { hex.textContent = e.target.value; set(e.target.value); } }), hex);
    }
    if (f.type === 'range') {
      const out = h('span', { class: 'cr-range-val' }, value + (f.unit || ''));
      return h('div', { class: 'cr-range' }, h('input', { type: 'range', min: f.min, max: f.max, step: f.step || 1, value,
        oninput: (e) => { out.textContent = e.target.value + (f.unit || ''); set(Number(e.target.value)); } }), out);
    }
    if (f.type === 'choice') {
      const opts = f.options.map((o) => ({ value: String(o.v), label: L(o.label) }));
      return opts.length <= 3 ? ui.segmented(opts, String(value), (v) => set(v)) : ui.select(opts, String(value), (v) => set(v));
    }
    if (f.type === 'lines') return ui.input({ multiline: true, rows: 5, value, onInput: (v) => set(String(v)) });
    return ui.input({ value, max: 60, onInput: (v) => set(String(v)) });
  }

  /* ---------- Template detail: live preview + customizer ---------- */
  let current = null;
  const PHONE = 360;

  function renderTemplate(params) {
    const def = TP.get(params && params.id);
    if (!def) return ui.empty({ icon: 'emptyBox', title: t('cr_none') });
    const l = lang();
    const values = TP.defaults(def, l);
    const project = TP.preview(def, l, values);
    const peers = def.peers || 1;
    const stage = h('div', { class: ['cr-stage', peers > 1 && 'multi'] });
    const sim = CS.sim.create({ project, peers });
    current = { sim };
    sim.on((e) => {
      if (e.type !== 'reload') return;
      CS.mount(stage, e.frames.map((frame, i) => h('div', { class: 'cr-device' },
        peers > 1 ? h('div', { class: 'cr-who' }, h('span', { class: 'sim-dot tint-' + sim.PEOPLE[i].tint }, sim.PEOPLE[i].name[0]), sim.PEOPLE[i].name) : null,
        h('div', { class: 'cr-screen' }, frame))));
      requestAnimationFrame(() => fit());
    });
    requestAnimationFrame(() => sim.attach(stage));
    /* Phones render at a real phone width and are scaled down to fit, like a device preview. */
    const fit = () => stage.querySelectorAll('.cr-screen').forEach((screen) => {
      const frame = screen.querySelector('iframe');
      if (!frame) return;
      const w = screen.clientWidth, hgt = screen.clientHeight;
      const k = w >= PHONE ? 1 : w / PHONE;
      frame.style.width = (k === 1 ? w : PHONE) + 'px';
      frame.style.height = Math.round(hgt / k) + 'px';
      frame.style.transform = k === 1 ? '' : 'scale(' + k + ')';
    });
    if (window.ResizeObserver) new ResizeObserver(fit).observe(stage);
    const refresh = CS.util.debounce(() => {
      const next = TP.preview(def, l, values);
      project.files = next.files;
      project.blocks = next.blocks;
      sim.resetData();
    }, 350);
    const fields = (def.fields || []).map((f) => h('div', { class: 'cr-field' },
      h('div', { class: 'cr-field-label' }, f.label ? L(f.label) : f.k === 'title' ? t('cr_name') : t('cr_color')),
      fieldControl(f, values[f.k], (v) => { values[f.k] = v; refresh(); })));
    const files = Object.keys(TP.build(def, l, values).files).map((path) => {
      const kind = /\.html$/.test(path) ? ['fileHtml', 'cr_file_html'] : /\.css$/.test(path) ? ['fileCss', 'cr_file_css'] : def.blocks ? ['blocks', 'cr_file_blocks'] : ['fileJs', 'cr_file_js'];
      return h('div', { class: 'cr-file' }, CS.icon(kind[0]), h('code', {}, path), h('span', {}, t(kind[1])));
    });
    const createBtn = ui.button({ label: t('cr_create'), icon: 'sparkles', variant: 'primary', size: 'lg', block: true, class: 'cr-create', onClick: async () => {
      createBtn.disabled = true;
      createBtn.querySelector('.btn-label').textContent = t('cr_creating');
      try {
        const p = await TP.create(def, { lang: l, values });
        ui.toast(t('cr_created', { name: p.name }), 'success');
        await router.go('create', {}, { replace: true });
        await CS.common.openProject(p.id, p.workspace && p.workspace.tab);
      } catch (error) {
        ui.toast(CS.common.errorText ? CS.common.errorText(error) : String(error), 'error');
        createBtn.disabled = false;
        createBtn.querySelector('.btn-label').textContent = t('cr_create');
      }
    } });
    return h('div', { class: ['cr-detail', 'tscope-' + def.tint] },
      h('header', { class: 'cr-detail-head' },
        h('span', { class: 'cr-detail-icon' }, CS.icon(def.icon)),
        h('div', { class: 'cr-detail-titles' },
          isStarter(def) ? h('div', { class: 'eyebrow' }, t('cr_starter_tag')) : h('div', { class: 'eyebrow' }, t('cat_' + def.cat)),
          h('h1', {}, L(def.name)), meta(def))),
      h('p', { class: 'cr-desc' }, L(def.desc)),
      h('div', { class: 'cr-preview' },
        h('div', { class: 'cr-preview-bar' }, h('span', { class: 'ls-try-live' }, h('i'), t('cr_live')), h('span', { class: 'grow' }),
          ui.iconButton('refresh', t('cr_restart'), () => sim.resetData(), { size: 'sm' })),
        stage,
        peers > 1 ? h('p', { class: 'cr-hint' }, t('cr_try_both')) : null),
      fields.length ? ui.section(t('cr_customize'), null, h('p', { class: 'cr-sub' }, t('cr_customize_sub')), h('div', { class: 'cr-fields' }, fields)) : null,
      def.learn ? ui.section(t('cr_learn'), null, h('ul', { class: 'cr-learn' }, def.learn.map((x) => h('li', {}, CS.icon('checkCircle'), L(x))))) : null,
      ui.section(t('cr_files'), null, h('div', { class: 'cr-files' }, files)),
      h('div', { class: 'cr-foot' }, createBtn));
  }

  /* ---------- Wizard ---------- */
  const GOALS = [
    { id: 'play', icon: 'gamepad', tint: 'pink', cat: 'games' },
    { id: 'agree', icon: 'users', tint: 'teal', cat: 'group' },
    { id: 'organize', icon: 'checkCircle', tint: 'blue', cat: 'organize' },
    { id: 'tool', icon: 'tools', tint: 'amber', cat: 'tools' },
    { id: 'create', icon: 'palette', tint: 'violet', cat: 'creative' },
    { id: 'learn', icon: 'learn', tint: 'indigo', cat: null }
  ];
  const WHO = [{ id: 'solo', icon: 'user', tint: 'blue' }, { id: 'group', icon: 'users', tint: 'teal' }, { id: 'any', icon: 'sparkles', tint: 'violet' }];

  function option(o, key, onClick) {
    return h('button', { type: 'button', class: 'cr-opt', dataset: { opt: o.id }, onclick: () => { CS.haptic(); onClick(); } },
      ui.tile(o.icon, o.tint), h('span', { class: 'cr-opt-text' }, h('b', {}, t(key + o.id)), h('small', {}, t(key + o.id + '_sub'))), CS.icon('chevronRight'));
  }

  function suggestions(goal, who) {
    let list = TP.list(goal.cat);
    if (who === 'solo') list = list.filter((d) => (d.peers || 1) === 1).concat(list.filter((d) => (d.peers || 1) > 1));
    if (who === 'group') list = list.filter((d) => (d.peers || 1) > 1).concat(list.filter((d) => (d.peers || 1) === 1));
    if (goal.cat !== 'games' && goal.cat !== 'group' && who === 'group') list = list.concat(TP.list('group').filter((d) => !list.includes(d)));
    return list.slice(0, 4);
  }

  function wizard() {
    const state = { step: 1, goal: null, who: null };
    const sheet = ui.sheet({ title: t('wz_title'), size: 'tall', class: 'cr-wizard-sheet' });
    const go = (id) => { sheet.close(); router.go('template', { id }); };
    function paint() {
      const total = state.goal && state.goal.id === 'learn' ? 2 : 3;
      const head = h('div', { class: 'cr-wz-head' },
        state.step > 1 ? ui.button({ label: t('wz_back'), icon: 'back', variant: 'ghost', size: 'sm', onClick: () => { state.step = state.goal.id === 'learn' ? 1 : state.step - 1; paint(); } }) : h('span'),
        h('span', { class: 'cr-wz-step' }, t('wz_step', { n: state.step, total })),
        h('span', { class: 'cr-wz-dots' }, Array.from({ length: total }, (x, i) => h('i', { class: i < state.step ? 'on' : '' }))));
      let body;
      if (state.step === 1) {
        body = [h('h3', { class: 'cr-wz-q' }, t('wz_q1')), h('div', { class: 'cr-opts' }, GOALS.map((g) => option(g, 'wz_goal_', () => { state.goal = g; state.step = g.id === 'learn' ? 2 : 2; paint(); })))];
      } else if (state.step === 2 && state.goal.id !== 'learn') {
        body = [h('h3', { class: 'cr-wz-q' }, t('wz_q2')), h('div', { class: 'cr-opts' }, WHO.map((w) => option(w, 'wz_who_', () => { state.who = w.id; state.step = 3; paint(); })))];
      } else {
        const learn = state.goal.id === 'learn';
        const list = learn ? TP.starters().filter((s) => s.id !== 'game') : suggestions(state.goal, state.who);
        body = [
          h('h3', { class: 'cr-wz-q' }, t('wz_result')), h('p', { class: 'cr-sub' }, t('wz_result_sub')),
          h('div', { class: 'cr-opts' }, list.map((d) => h('button', { type: 'button', class: ['cr-opt', 'cr-pick', 'tscope-' + d.tint], dataset: { pick: d.id }, onclick: () => { CS.haptic(); go(d.id); } },
            h('span', { class: 'cr-pick-icon' }, CS.icon(d.icon)), h('span', { class: 'cr-opt-text' }, h('b', {}, L(d.name)), h('small', {}, L(d.desc))), CS.icon('chevronRight')))),
          learn ? ui.button({ label: t('wz_lessons'), icon: 'learn', variant: 'soft', block: true, onClick: () => { sheet.close(); router.switchTab('learn'); } })
            : h('div', { class: 'cr-wz-also' }, h('span', {}, t('wz_also')), TP.starters().map((s) => ui.chip(L(s.name), { icon: s.icon, onClick: () => go(s.id) })))
        ];
      }
      sheet.setBody(h('div', { class: 'cr-wz' }, head, body));
    }
    paint();
    return sheet;
  }

  router.register('create', { tab: 'create', root: true, largeTitle: true, title: () => t('tab_create'), render: renderHub,
    actions: () => [ui.iconButton('wand', t('wz_title'), () => wizard())] });
  router.register('template', { tab: 'create', backTo: 'create', title: (p) => { const d = TP.get(p && p.id); return d ? L(d.name) : ''; }, render: renderTemplate,
    leave: () => { if (current) { current.sim.destroy(); current = null; } } });

  CS.create = { wizard, fieldControl };
})();
