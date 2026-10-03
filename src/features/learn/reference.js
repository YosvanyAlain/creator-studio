/* Look-up views: reference (webxdc, HTML, CSS, JavaScript, blocks), glossary and troubleshooting. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, ui, router } = CS;
  const t = (...a) => CS.t(...a);
  const L = (v) => CS.learn.L(v);
  const fold = (s) => CS.learn.fold(s);

  const CATS = [
    { id: 'webxdc', icon: 'xdc', tint: 'indigo' },
    { id: 'html', icon: 'fileHtml', tint: 'orange' },
    { id: 'css', icon: 'fileCss', tint: 'blue' },
    { id: 'js', icon: 'fileJs', tint: 'amber' },
    { id: 'blocks', icon: 'blocks', tint: 'violet' }
  ];
  const sample = (s) => (s ? s.replace(/\$\{([^}]*)\}/g, '$1') : '');

  function dictEntries(cat) {
    const all = CS.dict ? CS.dict.all() : [];
    if (cat === 'webxdc') return all.filter((e) => e.k === 'webxdc');
    return all.filter((e) => e.lang === cat && e.k !== 'webxdc');
  }

  function blockEntries() {
    const B = CS.blocks;
    if (!B) return [];
    return Object.keys(B.DEFS).map((type) => {
      const d = B.DEFS[type];
      const m = B.meta(type, CS.i18n.lang) || {};
      return { type, cat: d.cat, n: m.name || type, d: m.desc || '', params: d.params || [] };
    });
  }
  const blockCat = (id) => (CS.blocks ? CS.blocks.CATS.find((c) => c.id === id) : null);

  function related(name, close) {
    return CS.learn.searchLessons(name).slice(0, 2).map((l) => ui.row({ icon: 'learn', tint: 'green', title: L(l.title), sub: L(CS.learn.trackOf(l).title),
      onClick: () => { close(); router.go('lesson', { id: l.id }); } }));
  }

  function openDict(e) {
    let handle = null;
    const rel = related(e.n, () => handle && handle.close());
    handle = ui.sheet({
      title: e.n, subtitle: t('kind_' + e.k), class: 'ref-sheet',
      body: h('div', { class: 'ref-detail' },
        h('p', { class: 'ref-text' }, CS.dict.text(e)),
        e.s ? h('div', {}, h('div', { class: 'field-label' }, t('ed_example')), CS.learnUi.codeView(sample(e.s))) : null,
        rel.length ? h('div', {}, h('div', { class: 'field-label' }, t('rf_related')), ui.list(...rel)) : null)
    });
  }

  function openBlock(b) {
    const c = blockCat(b.cat);
    ui.sheet({
      title: b.n, subtitle: c ? L(c) : '', class: 'ref-sheet',
      body: h('div', { class: 'ref-detail' },
        h('p', { class: 'ref-text' }, b.d),
        b.params.length ? h('div', {}, h('div', { class: 'field-label' }, t('rf_fill')),
          h('div', { class: 'ref-params' }, b.params.map((p) => h('div', { class: 'ref-param' }, h('b', {}, L(p) || p.key), h('span', {}, t('rf_ptype_' + p.type) || p.type))))) : null,
        h('div', { class: 'callout ref-where' }, CS.icon('blocks'), h('span', {}, t('rf_where', { cat: c ? L(c) : '' }))))
    });
  }

  function renderReference(params) {
    let cat = params.cat || 'webxdc';
    let query = params.q || '';
    let bcat = null;
    CS.learn.markSeen('reference');
    const listHost = h('div', { class: 'ref-list' });
    const chipsHost = h('div', { class: 'ref-chips hscroll' });
    const count = h('div', { class: 'ref-count' });

    function draw() {
      const q = fold(query.trim());
      let rows = [];
      if (cat === 'blocks') {
        const all = blockEntries();
        CS.mount(chipsHost, [ui.chip(t('all'), { active: !bcat, onClick: () => { bcat = null; draw(); } })].concat(
          CS.blocks.CATS.filter((c) => all.some((b) => b.cat === c.id)).map((c) => ui.chip(L(c), { icon: c.icon, active: bcat === c.id, onClick: () => { bcat = c.id; draw(); } }))));
        chipsHost.hidden = false;
        let list = all.filter((b) => (!bcat || b.cat === bcat) && (!q || fold(b.n).includes(q) || fold(b.d).includes(q)));
        count.textContent = t('rf_count', { n: list.length });
        list = list.slice(0, 160);
        rows = list.map((b) => { const c = blockCat(b.cat); return ui.row({ icon: c ? c.icon : 'blocks', tint: 'violet', title: b.n, sub: b.d, onClick: () => openBlock(b) }); });
      } else {
        chipsHost.hidden = true;
        const list = dictEntries(cat).filter((e) => !q || fold(e.n).includes(q) || fold(CS.dict.text(e)).includes(q));
        count.textContent = t('rf_count', { n: list.length });
        const groups = {};
        list.forEach((e) => { (groups[e.k] = groups[e.k] || []).push(e); });
        rows = Object.keys(groups).map((k) => h('div', { class: 'ref-group' },
          Object.keys(groups).length > 1 ? h('div', { class: 'ref-group-head' }, t('kind_' + k + '_pl')) : null,
          ui.list(...groups[k].map((e) => ui.row({ title: h('code', { class: 'ref-name' }, e.n), sub: CS.dict.text(e), class: 'ref-row', onClick: () => openDict(e) })))));
      }
      CS.mount(listHost, rows.length ? rows : ui.empty({ icon: 'search', title: t('search_none', { q: query }), body: t('search_none_body') }));
    }

    const seg = h('div', { class: 'ref-cats hscroll' }, CATS.map((c) => h('button', {
      type: 'button', class: ['ref-cat', c.id === cat && 'on'], dataset: { cat: c.id },
      onclick: (ev) => { cat = c.id; bcat = null; seg.querySelectorAll('.ref-cat').forEach((b) => b.classList.toggle('on', b === ev.currentTarget)); draw(); }
    }, ui.tile(c.icon, c.tint, 'sm'), h('span', {}, t('rf_cat_' + c.id)))));
    const search = ui.searchBox({ placeholder: t('rf_search'), value: query, onInput: (v) => { query = v; draw(); } });
    requestAnimationFrame(draw);
    return h('div', { class: 'ref' }, h('div', { class: 'ref-sticky' }, search, seg, chipsHost), count, listHost);
  }

  /* ---------- Glossary ---------- */
  function renderGlossary(params) {
    CS.learn.markSeen('glossary');
    let query = params.q || '';
    let open = params.term || null;
    const host = h('div', { class: 'gl-list' });
    function draw() {
      const q = fold(query.trim());
      const terms = CS.learn.glossary().map((g) => ({ g, term: L(g.term), def: L(g.def) }))
        .filter((x) => !q || fold(x.term).includes(q) || fold(x.def).includes(q))
        .sort((a, b) => a.term.localeCompare(b.term, CS.i18n.lang));
      if (!terms.length) return CS.mount(host, ui.empty({ icon: 'search', title: t('search_none', { q: query }) }));
      const out = [];
      let letter = '';
      for (const x of terms) {
        const first = fold(x.term[0]).toUpperCase();
        if (first !== letter) { letter = first; out.push(h('div', { class: 'gl-letter' }, letter)); }
        const isOpen = open === x.g.id;
        out.push(h('div', { class: ['gl-item', isOpen && 'open'], dataset: { term: x.g.id } },
          h('button', { type: 'button', class: 'gl-head', 'aria-expanded': isOpen ? 'true' : 'false', onclick: () => { open = isOpen ? null : x.g.id; draw(); } },
            h('span', { class: 'gl-term' }, x.term), h('span', { class: 'gl-peek' }, isOpen ? '' : x.def), CS.icon(isOpen ? 'chevronUp' : 'chevronDown')),
          isOpen ? h('div', { class: 'gl-body' }, CS.learnUi.rich(x.g.def),
            x.g.code ? CS.learnUi.codeView(x.g.code, { copy: false }) : null,
            x.g.see ? h('div', { class: 'gl-see' }, h('span', {}, t('gl_see')), x.g.see.map((id) => {
              const other = CS.learn.glossary().find((g) => g.id === id);
              return other ? ui.chip(L(other.term), { onClick: () => { open = id; query = ''; search.querySelector('input').value = ''; draw(); requestAnimationFrame(() => { const n = host.querySelector('[data-term="' + id + '"]'); if (n) n.scrollIntoView({ block: 'center', behavior: 'smooth' }); }); } }) : null;
            })) : null) : null));
      }
      CS.mount(host, out);
    }
    const search = ui.searchBox({ placeholder: t('gl_search'), value: query, onInput: (v) => { query = v; draw(); } });
    requestAnimationFrame(() => { draw(); if (open) { const n = host.querySelector('[data-term="' + open + '"]'); if (n) n.scrollIntoView({ block: 'center' }); } });
    return h('div', { class: 'gl' }, h('div', { class: 'ref-sticky' }, search), host);
  }

  /* ---------- Troubleshooting ---------- */
  function openProblem(p) {
    const lesson = p.lesson ? CS.learn.lesson(p.lesson) : null;
    const handle = ui.sheet({
      title: L(p.title), size: 'tall', class: 'ts-sheet',
      body: h('div', { class: 'ts-detail' },
        h('div', { class: 'ts-block' }, h('div', { class: 'ts-label' }, CS.icon('search'), t('ts_why')), h('ul', { class: 'ts-causes' }, L(p.why).map((c) => h('li', {}, CS.learnUi.inline(c))))),
        h('div', { class: 'ts-block' }, h('div', { class: 'ts-label' }, CS.icon('wand'), t('ts_fix')),
          h('ol', { class: 'ts-steps' }, L(p.fix).map((c, i) => h('li', {}, h('span', { class: 'ts-n' }, String(i + 1)), h('span', {}, CS.learnUi.inline(c)))))),
        p.code ? CS.learnUi.codeView(L(p.code)) : null),
      actions: lesson ? [ui.button({ label: t('ts_lesson', { title: L(lesson.title) }), icon: 'learn', variant: 'soft', onClick: () => { handle.close(); router.go('lesson', { id: lesson.id }); } })] : null
    });
  }

  function renderTrouble() {
    const groups = {};
    CS.learn.problems().forEach((p) => { (groups[p.area] = groups[p.area] || []).push(p); });
    return h('div', { class: 'ts' },
      h('div', { class: 'ts-hero' }, CS.learnArt.scene('bug'), h('p', {}, t('ts_intro'))),
      Object.keys(groups).map((area) => ui.section(t('ts_area_' + area), null,
        ui.list(...groups[area].map((p) => ui.row({ icon: p.icon || 'alertTriangle', tint: p.tint || 'red', title: L(p.title), sub: L(p.sub), dataset: { problem: p.id }, onClick: () => openProblem(p) }))))));
  }

  router.register('reference', { tab: 'learn', title: () => t('lr_look_reference'), render: renderReference });
  router.register('glossary', { tab: 'learn', title: () => t('lr_look_glossary'), render: renderGlossary });
  router.register('troubleshoot', { tab: 'learn', title: () => t('lr_look_trouble'), render: renderTrouble });

  CS.learnRef = { openDict, openBlock, openProblem, blockEntries, dictEntries };
})();
