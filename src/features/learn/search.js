/* Global search: one box over projects, lessons, reference, blocks, glossary, problems and any registered provider. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, ui, router } = CS;
  const t = (...a) => CS.t(...a);
  const L = (v) => CS.learn.L(v);
  const fold = (s) => CS.learn.fold(s);
  const RECENT = 'wcs3_search_recent';
  const providers = [];

  /* provider: { id, order, scope: 'all'|'learn', run(q, folded) -> Promise<Item[]>|Item[] }, Item: { icon, tint, title, sub, go } */
  function provide(p) { providers.push(p); providers.sort((a, b) => (a.order || 50) - (b.order || 50)); }

  const score = (name, body, q) => { const n = fold(name); return n === q ? 0 : n.startsWith(q) ? 1 : n.includes(q) ? 2 : body && fold(body).includes(q) ? 3 : -1; };
  function ranked(list, q, nameOf, bodyOf) {
    return list.map((x) => [score(nameOf(x), bodyOf ? bodyOf(x) : '', q), x]).filter((x) => x[0] >= 0).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  }

  provide({ id: 'projects', order: 10, async run(q) {
    const list = (await CS.projects.list()).filter((p) => !p.broken);
    return ranked(list, q, (p) => p.name || '').map((p) => ({ lead: CS.common.avatar(p), title: p.name, sub: CS.common.projectMeta(p), go: () => CS.common.openProject(p.id) }));
  } });

  provide({ id: 'lessons', order: 20, scope: 'learn', run(q, raw) {
    return CS.learn.searchLessons(raw).map((l) => { const tr = CS.learn.trackOf(l); return { icon: tr.icon, tint: tr.tint, title: L(l.title), sub: L(tr.title) + (CS.learn.isDone(l.id) ? ' · ' + t('lr_done') : ''), go: () => router.go('lesson', { id: l.id }) }; });
  } });

  provide({ id: 'reference', order: 30, scope: 'learn', run(q, raw) {
    return CS.dict ? CS.dict.search(raw, 60).filter((e) => e.k !== 'snippet').map((e) => ({ icon: e.lang === 'html' ? 'fileHtml' : e.lang === 'css' ? 'fileCss' : e.k === 'webxdc' ? 'xdc' : 'fileJs', tint: e.lang === 'html' ? 'orange' : e.lang === 'css' ? 'blue' : e.k === 'webxdc' ? 'indigo' : 'amber',
      title: h('code', { class: 'ref-name' }, e.n), sub: t('kind_' + e.k) + ' · ' + CS.dict.text(e), go: () => CS.learnRef.openDict(e) })) : [];
  } });

  provide({ id: 'blocks', order: 40, scope: 'learn', run(q) {
    return ranked(CS.learnRef.blockEntries(), q, (b) => b.n, (b) => b.d).map((b) => ({ icon: 'blocks', tint: 'violet', title: b.n, sub: b.d, go: () => CS.learnRef.openBlock(b) }));
  } });

  provide({ id: 'glossary', order: 50, scope: 'learn', run(q) {
    return ranked(CS.learn.glossary(), q, (g) => L(g.term), (g) => L(g.def)).map((g) => ({ icon: 'list', tint: 'teal', title: L(g.term), sub: L(g.def), go: () => router.go('glossary', { term: g.id }) }));
  } });

  provide({ id: 'problems', order: 60, scope: 'learn', run(q) {
    return ranked(CS.learn.problems(), q, (p) => L(p.title), (p) => L(p.sub) + ' ' + L(p.why).join(' ')).map((p) => ({ icon: p.icon || 'alertTriangle', tint: 'red', title: L(p.title), sub: L(p.sub), go: () => CS.learnRef.openProblem(p) }));
  } });

  provide({ id: 'studio', order: 70, run(q) {
    const tools = [['pixel', 'grid', 'pink'], ['image', 'image', 'blue'], ['audio', 'wave', 'teal']];
    return ranked(tools, q, (x) => t('st_' + x[0]), (x) => t('st_' + x[0] + '_sub')).map((x) => ({ icon: x[1], tint: x[2], title: t('st_' + x[0]), sub: t('st_' + x[0] + '_sub'), go: () => CS.studio.open(x[0]) }));
  } });

  const SUGGEST = { es: ['sendUpdate', 'botón', 'color', 'variable', 'lista', 'sonido', 'flex', 'serial'], en: ['sendUpdate', 'button', 'color', 'variable', 'list', 'sound', 'flex', 'serial'] };

  function recent() { try { return JSON.parse(localStorage.getItem(RECENT) || '[]'); } catch (error) { return []; } }
  function remember(q) {
    const v = q.trim();
    if (v.length < 2) return;
    const list = [v].concat(recent().filter((x) => x !== v)).slice(0, 8);
    try { localStorage.setItem(RECENT, JSON.stringify(list)); } catch (error) { /* ignore */ }
  }

  function render(params) {
    let query = params.q || '';
    const scope = params.scope || 'all';
    const host = h('div', { class: 'srch-results' });
    const expanded = new Set();
    let token = 0;

    function suggestions() {
      const r = recent();
      return h('div', { class: 'srch-empty' },
        r.length ? ui.section(t('srch_recent'), ui.button({ label: t('clear'), variant: 'ghost', size: 'sm', onClick: () => { localStorage.removeItem(RECENT); draw(); } }),
          h('div', { class: 'srch-chips' }, r.map((x) => ui.chip(x, { icon: 'history', onClick: () => setQuery(x) })))) : null,
        ui.section(t('srch_try'), null, h('div', { class: 'srch-chips' }, (SUGGEST[CS.i18n.lang] || SUGGEST.en).map((x) => ui.chip(x, { onClick: () => setQuery(x) })))),
        h('p', { class: 'srch-hint' }, t(scope === 'learn' ? 'srch_hint_learn' : 'srch_hint')));
    }

    async function draw() {
      const my = ++token;
      const raw = query.trim();
      if (!raw) return CS.mount(host, suggestions());
      const q = fold(raw);
      const groups = [];
      for (const p of providers) {
        if (scope === 'learn' && p.scope !== 'learn') continue;
        let items = [];
        try { items = (await p.run(q, raw)) || []; } catch (error) { console.error(error); }
        if (items.length) groups.push([p, items]);
      }
      if (my !== token) return;
      if (!groups.length) return CS.mount(host, ui.empty({ icon: 'search', title: t('search_none', { q: raw }), body: t('search_none_body') }));
      CS.mount(host, groups.map(([p, items]) => {
        const open = expanded.has(p.id);
        const shown = open ? items.slice(0, 40) : items.slice(0, 4);
        return h('section', { class: 'srch-group', dataset: { group: p.id } },
          h('div', { class: 'srch-group-head' }, h('span', {}, t('srch_g_' + p.id)), h('span', { class: 'srch-n' }, String(items.length))),
          ui.list(...shown.map((it) => ui.row({ icon: it.icon, tint: it.tint, lead: it.lead, title: it.title, sub: it.sub, onClick: () => { remember(raw); it.go(); } }))),
          items.length > 4 ? ui.button({ label: open ? t('srch_less') : t('srch_more', { n: items.length - 4 }), variant: 'ghost', size: 'sm', class: 'srch-more', onClick: () => { if (open) expanded.delete(p.id); else expanded.add(p.id); draw(); } }) : null);
      }));
    }

    const debounced = CS.util.debounce(draw, 140);
    const box = ui.searchBox({ placeholder: t(scope === 'learn' ? 'srch_ph_learn' : 'srch_ph'), value: query, onInput: (v) => { query = v; expanded.clear(); debounced(); } });
    const input = box.querySelector('input');
    function setQuery(v) { query = v; input.value = v; draw(); }
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { remember(query); input.blur(); } });
    requestAnimationFrame(() => { draw(); if (!query) input.focus(); });
    return h('div', { class: 'srch' }, h('div', { class: 'ref-sticky' }, box), host);
  }

  router.register('search', { title: (p) => t(p && p.scope === 'learn' ? 'srch_title_learn' : 'search'), render });
  CS.search = { provide, providers: () => providers.slice() };
})();
