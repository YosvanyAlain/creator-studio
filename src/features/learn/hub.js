/* Learn hub: progress hero, tracks, look-up tools and medals. Track view: the lesson path. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, ui, router } = CS;
  const t = (...a) => CS.t(...a);
  const L = (v) => CS.learn.L(v);

  function hero() {
    const s = CS.learn.stats();
    const lv = s.level;
    const next = CS.learn.nextLesson();
    return h('section', { class: 'lr-hero' },
      h('div', { class: 'lr-hero-top' },
        h('div', { class: 'lr-level' }, h('span', { class: 'lr-level-n' }, String(lv.n)), h('span', { class: 'lr-level-ring', ref: (n) => { n.innerHTML = '<svg viewBox="0 0 44 44"><circle class="bg" cx="22" cy="22" r="19"/><circle class="fg" cx="22" cy="22" r="19" stroke-dasharray="' + (lv.frac * 119.4).toFixed(1) + ' 200"/></svg>'; } })),
        h('div', { class: 'lr-hero-text' },
          h('div', { class: 'lr-hero-eyebrow' }, t('lr_level_n', { n: lv.n })),
          h('div', { class: 'lr-hero-title' }, t('lv_' + lv.n)),
          h('div', { class: 'lr-xp' }, h('div', { class: 'lr-xp-bar' }, h('i', { style: { width: Math.round(lv.frac * 100) + '%' } })),
            h('span', {}, lv.next ? t('lr_xp_to', { xp: s.xp, next: lv.next }) : t('lr_xp_max', { xp: s.xp }))))),
      h('div', { class: 'lr-hero-stats' },
        h('div', { class: 'lr-hs' }, CS.icon('bolt'), h('b', {}, String(s.streak)), h('span', {}, t('lr_streak', { n: s.streak }))),
        h('div', { class: 'lr-hs' }, CS.icon('checkCircle'), h('b', {}, s.done + '/' + s.total), h('span', {}, t('lr_lessons'))),
        h('div', { class: 'lr-hs' }, CS.icon('medal'), h('b', {}, String(CS.learn.medals().filter((m) => m.got).length)), h('span', {}, t('lr_medals')))),
      next ? h('button', { type: 'button', class: 'lr-continue', onclick: () => { CS.haptic(); router.go('lesson', { id: next.id }); } },
        h('span', { class: 'lr-continue-play' }, CS.icon('play')),
        h('span', { class: 'lr-continue-text' }, h('small', {}, s.done ? t('lr_continue') : t('lr_start')), h('b', {}, next.title)),
        CS.icon('chevronRight')) : h('div', { class: 'lr-alldone' }, CS.icon('trophy'), t('learn_all_done')));
  }

  function trackCard(tr) {
    const st = CS.learn.trackStats(tr);
    return h('button', { type: 'button', class: ['lr-track', 'tscope-' + tr.tint, st.complete && 'complete'], dataset: { track: tr.id }, onclick: () => { CS.haptic(); router.go('track', { id: tr.id }); } },
      h('span', { class: 'lr-track-art' }, CS.icon(tr.icon)),
      h('span', { class: 'lr-track-main' },
        h('span', { class: 'lr-track-title' }, L(tr.title)),
        h('span', { class: 'lr-track-sub' }, L(tr.sub)),
        h('span', { class: 'lr-track-meta' }, h('span', { class: 'lr-mini-bar' }, h('i', { style: { width: Math.round((st.done / st.total) * 100) + '%' } })),
          h('span', {}, st.complete ? t('lr_track_done') : t('lr_track_n', { done: st.done, total: st.total })))),
      st.complete ? h('span', { class: 'lr-track-badge' }, CS.icon('check')) : CS.icon('chevronRight'));
  }

  function lookup() {
    const items = [
      { id: 'reference', icon: 'book', tint: 'blue', go: () => router.go('reference') },
      { id: 'glossary', icon: 'list', tint: 'teal', go: () => router.go('glossary') },
      { id: 'trouble', icon: 'stethoscope', tint: 'red', go: () => router.go('troubleshoot') },
      { id: 'medals', icon: 'medal', tint: 'amber', go: () => medalsSheet() }
    ];
    return h('div', { class: 'lr-look' }, items.map((it) => h('button', { type: 'button', class: 'lr-look-item', dataset: { look: it.id }, onclick: () => { CS.haptic(); it.go(); } },
      ui.tile(it.icon, it.tint), h('span', { class: 'lr-look-title' }, t('lr_look_' + it.id)), h('span', { class: 'lr-look-sub' }, t('lr_look_' + it.id + '_sub')))));
  }

  function medalsSheet() {
    const list = CS.learn.medals();
    ui.sheet({
      title: t('lr_medals_title'), subtitle: t('lr_medals_sub', { got: list.filter((m) => m.got).length, total: list.length }), size: 'tall',
      body: h('div', { class: 'lr-medals' }, list.map((m) => h('div', { class: ['lr-medal', !m.got && 'locked'] },
        h('span', { class: 'lr-medal-art tint-' + (m.got ? m.tint : 'slate') }, CS.icon(m.got ? m.icon : 'lock')),
        h('b', {}, CS.learnUi.medalName(m)),
        h('span', {}, m.track ? t('md_track_how') : t('md_' + m.id + '_how')))))
    });
  }

  function renderHub() {
    return h('div', { class: 'learn' },
      h('header', { class: 'lr-head' }, h('div', { class: 'eyebrow' }, t('lr_eyebrow')), h('h1', { class: 'lr-title' }, t('tab_learn')), h('p', { class: 'lr-intro' }, t('lr_intro'))),
      hero(),
      ui.section(t('lr_tracks'), null, h('div', { class: 'lr-tracks' }, CS.learn.tracks().map(trackCard))),
      ui.section(t('lr_lookup'), null, lookup()));
  }

  /* ---------- Track: the lesson path ---------- */
  function renderTrack(params) {
    const tr = CS.learn.tracks().find((x) => x.id === params.id);
    if (!tr) return ui.empty({ icon: 'learn', title: t('ls_missing') });
    const st = CS.learn.trackStats(tr);
    const next = tr.lessons.find((l) => !CS.learn.isDone(l.id));
    return h('div', { class: ['lr-path-view', 'tscope-' + tr.tint] },
      h('header', { class: 'lr-path-head' },
        h('span', { class: 'lr-path-art' }, CS.icon(tr.icon)),
        h('div', { class: 'lr-path-text' }, h('h1', {}, L(tr.title)), h('p', {}, L(tr.desc || tr.sub)),
          h('div', { class: 'lr-path-meta' }, h('span', { class: 'lr-mini-bar' }, h('i', { style: { width: Math.round((st.done / st.total) * 100) + '%' } })), h('span', {}, t('lr_track_n', { done: st.done, total: st.total }))))),
      h('ol', { class: 'lr-path' }, tr.lessons.map((l, i) => {
        const done = CS.learn.result(l.id);
        const isNext = l === next;
        const scored = l.steps.filter((s) => s.t !== 'read' && s.t !== 'try').length;
        return h('li', { class: ['lr-node', done && 'done', isNext && 'next'] },
          h('button', { type: 'button', class: 'lr-node-btn', dataset: { lesson: l.id }, onclick: () => { CS.haptic(); router.go('lesson', { id: l.id }); } },
            h('span', { class: 'lr-node-dot' }, done ? CS.icon(done.best ? 'star' : 'check') : h('b', {}, String(i + 1))),
            h('span', { class: 'lr-node-main' },
              h('span', { class: 'lr-node-title' }, L(l.title)),
              h('span', { class: 'lr-node-sub' }, L(l.sub)),
              h('span', { class: 'lr-node-meta' }, t('lr_min', { n: l.mins || 3 }), ' · ', t('lr_steps', { n: l.steps.length }), scored ? ' · ' + t('lr_challenges', { n: scored }) : '')),
            isNext ? h('span', { class: 'lr-node-go' }, t('lr_go')) : done ? h('span', { class: 'lr-node-redo' }, CS.icon('refresh')) : null));
      })));
  }

  router.register('learn', { tab: 'learn', root: true, largeTitle: true, refreshOn: ['learn-progress'], title: () => t('tab_learn'), render: renderHub,
    actions: () => [ui.iconButton('search', t('search'), () => router.go('search', { scope: 'learn' }))] });
  router.register('track', { tab: 'learn', refreshOn: ['learn-progress'], title: (p) => { const tr = CS.learn.tracks().find((x) => x.id === p.id); return tr ? L(tr.title) : ''; }, render: renderTrack });
})();
