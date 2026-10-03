/* My apps: search, sort, favourites and per-project actions. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, icon, ui, router } = CS;
  const t = (...a) => CS.t(...a);
  const C = () => CS.common;
  const LOOK_ICONS = ['cube', 'gamepad', 'sprite', 'chat', 'poll', 'checkSquare', 'note', 'list', 'trophy', 'timer', 'dice', 'music', 'brush', 'calendar', 'map', 'heart', 'star', 'rocket', 'bolt', 'gift', 'users', 'globe', 'camera', 'bulb'];

  const state = { query: '', sort: 'recent', filter: 'all' };

  function sortList(list) {
    const out = list.slice();
    if (state.sort === 'name') out.sort((a, b) => a.name.localeCompare(b.name, CS.i18n.lang));
    else if (state.sort === 'size') out.sort((a, b) => CS.projects.totalSize(b) - CS.projects.totalSize(a));
    else out.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    return out;
  }

  function lookSheet(p, onDone) {
    let look = Object.assign({}, p.look);
    const preview = h('div', { class: 'look-preview' });
    const paint = () => CS.mount(preview, C().avatar(Object.assign({}, p, { look, files: {} }), 'xl'));
    const tints = h('div', { class: 'look-tints' }, CS.projects.TINTS.map((tint) => h('button', {
      type: 'button', class: ['look-tint', 'tint-' + tint], 'aria-label': tint, onclick: () => { look.tint = tint; paint(); mark(tints, tint); }
    })));
    const icons = h('div', { class: 'look-icons' }, LOOK_ICONS.map((name) => h('button', {
      type: 'button', class: 'look-icon', dataset: { v: name }, onclick: () => { look.icon = name; paint(); mark(icons, name); }
    }, icon(name))));
    function mark(group, value) { group.querySelectorAll('button').forEach((b) => b.classList.toggle('on', (b.dataset.v || b.getAttribute('aria-label')) === value)); }
    paint();
    mark(tints, look.tint);
    mark(icons, look.icon);
    const sheet = ui.sheet({
      title: t('proj_look'), subtitle: t('proj_look_sub'),
      body: [preview, h('div', { class: 'field-label' }, t('color')), tints, h('div', { class: 'field-label' }, t('icon')), icons],
      actions: [ui.button({ label: t('cancel'), variant: 'ghost', onClick: () => sheet.close() }),
        ui.button({ label: t('save'), variant: 'primary', onClick: async () => { await CS.projects.update(p.id, { look }); sheet.close(); if (onDone) onDone(look); else router.refresh(); } })]
    });
  }

  async function exportProject(p, chat) {
    try {
      const result = await CS.exporter.build(p);
      const how = await C().deliver(result.blob, result.name, { chat, type: 'file' });
      ui.toast(how === 'chat' ? t('exp_sent') : t('exp_downloaded', { name: result.name }), 'ok');
    } catch (error) { ui.toast(C().errorText(error), 'error'); }
  }

  function projectMenu(p) {
    ui.menu({
      title: p.name, subtitle: C().projectMeta(p),
      items: [
        { icon: 'edit', label: t('open'), onClick: () => C().openProject(p.id) },
        { icon: 'play', label: t('ws_test'), onClick: () => C().openProject(p.id, 'test') },
        '-',
        { icon: 'type', label: t('rename'), onClick: async () => {
          const name = await C().askName({ title: t('rename'), value: p.name });
          if (name && name.trim()) { await CS.projects.update(p.id, { name }); router.refresh(); }
        } },
        { icon: 'palette', label: t('proj_look'), onClick: () => lookSheet(p) },
        { icon: 'star', label: p.starred ? t('proj_unstar') : t('proj_star'), onClick: async () => { await CS.projects.update(p.id, { starred: !p.starred }); router.refresh(); } },
        { icon: 'copy', label: t('duplicate'), onClick: async () => { await CS.projects.duplicate(p.id); ui.toast(t('proj_duplicated'), 'ok'); router.refresh(); } },
        { icon: 'history', label: t('history'), onClick: () => router.go('history', { id: p.id }) },
        '-',
        { icon: 'xdc', label: t('exp_download'), onClick: () => exportProject(p, false) },
        { icon: 'share', label: t('exp_share'), onClick: () => exportProject(p, true) },
        '-',
        { icon: 'trash', label: t('delete'), danger: true, onClick: async () => {
          const ok = await ui.confirm({ title: t('proj_delete_q', { name: p.name }), message: t('proj_delete_body'), okLabel: t('delete'), danger: true });
          if (ok) { await CS.projects.remove(p.id); ui.toast(t('proj_deleted'), 'ok'); router.refresh(); }
        } }
      ]
    });
  }

  function projectCard(p) {
    if (p.broken) {
      return ui.card({ icon: 'alert', tint: 'red', title: p.name, sub: C().errorText({ code: p.broken }), trailing: ui.iconButton('trash', t('delete'), async (e) => {
        e.stopPropagation();
        if (await ui.confirm({ title: t('proj_delete_q', { name: p.name }), okLabel: t('delete'), danger: true })) { await CS.projects.remove(p.id); router.refresh(); }
      }) });
    }
    const more = ui.iconButton('moreV', t('more'), (e) => { e.stopPropagation(); projectMenu(p); });
    return h('div', { class: 'card card-click project-card', role: 'button', tabindex: '0', onclick: () => C().openProject(p.id),
      onkeydown: (e) => { if (e.key === 'Enter') C().openProject(p.id); } },
    C().avatar(p, 'lg'),
    h('div', { class: 'card-main' },
      h('div', { class: 'card-title' }, p.starred ? h('span', { class: 'star-mark' }, icon('star')) : null, p.name),
      h('div', { class: 'card-sub' }, C().projectMeta(p)),
      p.blocks && p.blocks.model ? h('div', { class: 'card-tags' }, ui.badge(t('badge_blocks'), 'accent')) : null),
    more);
  }

  async function render(params, ctx) {
    const all = await CS.projects.list();
    if (!all.length) {
      return ui.empty({ icon: 'projects', title: t('proj_empty_title'), body: t('proj_empty_body'),
        action: h('div', { class: 'btn-row', style: { justifyContent: 'center' } },
          ui.button({ label: t('home_new_app'), icon: 'plus', variant: 'primary', onClick: () => router.switchTab('create') }),
          ui.button({ label: t('import'), icon: 'import', onClick: () => CS.importer.pickAndImport() })) });
    }
    const results = h('div', { class: 'stack' });
    const draw = () => {
      const q = state.query.trim().toLowerCase();
      let list = all.filter((p) => !q || p.name.toLowerCase().includes(q) || (p.tags || []).some((tag) => tag.toLowerCase().includes(q)));
      if (state.filter === 'starred') list = list.filter((p) => p.starred);
      if (state.filter === 'blocks') list = list.filter((p) => p.blocks && p.blocks.model);
      list = sortList(list);
      CS.mount(results, list.length ? list.map(projectCard) : ui.empty({ icon: 'search', title: t('no_results'), body: t('no_results_body') }));
    };
    draw();
    const total = all.reduce((s, p) => s + CS.projects.totalSize(p), 0);
    return h('div', { class: 'projects' },
      h('h1', { class: 'page-title' }, t('tab_projects')),
      h('p', { class: 'page-sub' }, t('proj_summary', { n: all.length, size: CS.util.bytes(total) })),
      h('div', { class: 'toolbar-stack' },
        ui.searchBox({ placeholder: t('proj_search'), value: state.query, onInput: (v) => { state.query = v; draw(); } }),
        h('div', { class: 'chips' },
          [['all', 'filter_all'], ['starred', 'filter_starred'], ['blocks', 'filter_blocks']].map(([id, key]) =>
            ui.chip(t(key), { active: state.filter === id, onClick: () => { state.filter = id; ctx.refresh(); } })),
          h('span', { class: 'spacer' }),
          ui.chip(t('sort_' + state.sort), { icon: 'sort', onClick: () => ui.menu({ title: t('sort_by'), items: ['recent', 'name', 'size'].map((s) => ({
            icon: s === state.sort ? 'check' : null, label: t('sort_' + s), onClick: () => { state.sort = s; ctx.refresh(); } })) }) }))),
      results);
  }

  CS.projectsUi = { editLook: lookSheet };

  router.register('projects', {
    largeTitle: true, refreshOn: ['projects-changed', 'project-saved'],
    tab: 'projects', root: true, title: () => t('tab_projects'), render,
    actions: () => [ui.iconButton('import', t('import'), () => CS.importer.pickAndImport()), ui.iconButton('plus', t('home_new_app'), () => router.switchTab('create'))]
  });
})();
