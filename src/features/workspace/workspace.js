/* Workspace: the screen where one project is edited. Tabs are plug-ins registered with CS.ws.tab(). */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, ui, router } = CS;
  const t = (...a) => CS.t(...a);
  const tabs = [];
  let active = null;

  const ws = {
    /* tab: { id, icon, label, order, available(p), mount(host, api) -> { unmount?, actions?, onShow? } } */
    tab(def) { tabs.push(def); tabs.sort((a, b) => (a.order || 50) - (b.order || 50)); },
    get current() { return active; },
    switchTo(id, extra) { if (active) active.select(id, extra); },
    tabs: () => tabs.slice()
  };
  CS.ws = ws;

  function defaultTab(p) {
    const saved = p.workspace && p.workspace.tab;
    const ok = (id) => tabs.some((x) => x.id === id && (!x.available || x.available(p)));
    if (saved && ok(saved)) return saved;
    if (p.blocks && p.blocks.model && ok('blocks')) return 'blocks';
    return 'code';
  }

  async function render(params, ctx) {
    let p = CS.projects.current;
    if (!p || p.id !== params.id) {
      try { p = await CS.projects.open(params.id); } catch (error) { return ui.errorState(CS.common.errorText(error)); }
    }
    if (!ctx.alive()) return null;
    const visible = tabs.filter((x) => !x.available || x.available(p));
    const bar = h('nav', { class: 'ws-tabs', role: 'tablist', 'aria-label': t('ws_sections') });
    const body = h('div', { class: 'ws-body' });
    const panes = new Map();
    let current = null;

    function select(id, extra) {
      const def = visible.find((x) => x.id === id) || visible[0];
      if (!def) return;
      if (current && current.def.id === def.id) { if (current.inst.onShow) current.inst.onShow(extra); return; }
      if (current) {
        current.host.hidden = true;
        if (current.inst.onHide) current.inst.onHide();
      }
      let pane = panes.get(def.id);
      if (!pane) {
        const host = h('section', { class: 'ws-pane ws-pane-' + def.id, role: 'tabpanel' });
        body.appendChild(host);
        let inst = {};
        try { inst = def.mount(host, api) || {}; } catch (error) { console.error(error); CS.mount(host, ui.errorState(CS.common.errorText(error))); }
        pane = { def, host, inst };
        panes.set(def.id, pane);
      }
      pane.host.hidden = false;
      current = pane;
      bar.querySelectorAll('.ws-tab').forEach((b) => { const on = b.dataset.tab === def.id; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
      if (pane.inst.onShow) pane.inst.onShow(extra);
      CS.app.setChrome({ actions: chromeActions(pane) });
      if (p.workspace.tab !== def.id) { p.workspace.tab = def.id; CS.projects.touch('workspace'); }
    }

    function chromeActions(pane) {
      const own = pane.inst.actions ? pane.inst.actions() : [];
      return own.concat([
        def('test') && pane.def.id !== 'test' ? ui.iconButton('play', t('ws_run'), () => select('test'), { class: 'ws-run' }) : null,
        ui.iconButton('moreV', t('more'), projectMenu)
      ]).filter(Boolean);
    }
    const def = (id) => visible.find((x) => x.id === id);

    function projectMenu() {
      ui.menu({ title: p.name, subtitle: CS.common.projectMeta(p), items: [
        { icon: 'export', label: t('ws_share'), onClick: () => select('publish') },
        { icon: 'history', label: t('history'), onClick: () => router.go('history', { id: p.id }) },
        { icon: 'palette', label: t('proj_look'), onClick: () => CS.projectsUi && CS.projectsUi.editLook(p) },
        { icon: 'type', label: t('rename'), onClick: async () => {
          const name = await CS.common.askName({ title: t('rename'), value: p.name });
          if (name && name.trim()) { await CS.projects.update(p.id, { name }); CS.app.setChrome({ title: name }); }
        } },
        { icon: 'copy', label: t('duplicate'), onClick: async () => { const copy = await CS.projects.duplicate(p.id); ui.toast(t('proj_duplicated'), 'ok'); CS.common.openProject(copy.id); } }
      ] });
    }

    const api = {
      project: p,
      select,
      setActions() { if (current) CS.app.setChrome({ actions: chromeActions(current) }); },
      openFile(path, opts) { select('code', Object.assign({ path }, opts || {})); }
    };

    visible.forEach((x) => bar.appendChild(h('button', {
      type: 'button', class: 'ws-tab', role: 'tab', dataset: { tab: x.id },
      onclick: () => { CS.haptic(); select(x.id); }
    }, CS.icon(x.icon), h('span', {}, t(x.label)))));

    active = { select, api, panes };
    ctx.on('project-close', () => { active = null; });
    const root = h('div', { class: 'ws' }, bar, body);
    requestAnimationFrame(() => select(params.tab || defaultTab(p), params.extra));
    return root;
  }

  async function leave() {
    if (active) {
      for (const pane of active.panes.values()) if (pane.inst.unmount) { try { pane.inst.unmount(); } catch (error) { console.error(error); } }
    }
    active = null;
    await CS.projects.flush();
    if (CS.projects.current) CS.snapshots.auto(CS.projects.current);
    return true;
  }

  router.register('workspace', {
    tab: 'projects', flush: true, immersive: true,
    title: () => (CS.projects.current ? CS.projects.current.name : ''),
    render, leave
  });
})();
