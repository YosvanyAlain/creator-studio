/* Home: greeting, continue where you left off, quick starts, learning path and recent apps. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, icon, ui, router } = CS;
  const t = (...a) => CS.t(...a);
  const C = () => CS.common;

  const QUICK = [
    { id: 'templates', icon: 'sparkles', tint: 'violet', go: () => router.go('create', { section: 'templates' }) },
    { id: 'game', icon: 'gamepad', tint: 'pink', go: () => router.go('template', { id: 'game' }) },
    { id: 'pixel', icon: 'sprite', tint: 'orange', go: () => CS.studio.open('pixel') },
    { id: 'sound', icon: 'wave', tint: 'teal', go: () => CS.studio.open('audio') },
    { id: 'tools', icon: 'tools', tint: 'blue', go: () => router.go('tools') },
    { id: 'import', icon: 'import', tint: 'slate', go: () => CS.importer && CS.importer.pickAndImport() }
  ];

  function hero() {
    return h('div', { class: 'hero' },
      h('div', { class: 'hero-art', 'aria-hidden': 'true' }, CS.icons.mark(84)),
      h('div', { class: 'hero-hello' }, C().greeting()),
      h('h1', { class: 'hero-title' }, t('home_hero_title')),
      h('p', { class: 'hero-sub' }, t('home_hero_sub')),
      h('div', { class: 'btn-row' },
        ui.button({ label: t('home_new_app'), icon: 'plus', variant: 'primary', class: 'btn-on-hero', onClick: () => router.switchTab('create') }),
        ui.button({ label: t('home_learn'), icon: 'learn', variant: 'ghost', class: 'btn-hero-ghost', onClick: () => router.switchTab('learn') })));
  }

  function continueCard(p) {
    return h('div', { class: 'continue card' },
      C().avatar(p, 'lg'),
      h('div', { class: 'card-main' },
        h('div', { class: 'eyebrow' }, t('home_continue')),
        h('div', { class: 'card-title' }, p.name),
        h('div', { class: 'card-sub' }, C().projectMeta(p))),
      h('div', { class: 'continue-actions' },
        ui.iconButton('play', t('ws_test'), () => C().openProject(p.id, 'test'), { variant: 'tonal' }),
        ui.button({ label: t('open'), variant: 'primary', size: 'sm', onClick: () => C().openProject(p.id) })));
  }

  function learnCard() {
    const L = CS.learn;
    if (!L) return null;
    const stats = L.stats();
    const next = L.nextLesson();
    return ui.card({
      icon: 'learn', tint: 'green', eyebrow: t('home_path'),
      title: next ? next.title : t('learn_all_done'),
      sub: t('home_path_sub', { done: stats.done, total: stats.total }),
      children: ui.progress(stats.total ? stats.done / stats.total : 0, { class: 'card-progress' }),
      onClick: () => (next ? router.go('lesson', { id: next.id }) : router.switchTab('learn'))
    });
  }

  function tip() {
    const tips = ['tip_1', 'tip_2', 'tip_3', 'tip_4', 'tip_5', 'tip_6', 'tip_7', 'tip_8'];
    const day = Math.floor(Date.now() / 86400000);
    return h('div', { class: 'callout tip' }, icon('bulb'), h('div', {}, h('b', {}, t('home_tip')), ' ', t(tips[day % tips.length])));
  }

  async function render() {
    const list = (await CS.projects.list()).filter((p) => !p.broken);
    const last = list.find((p) => p.id === CS.settings.get('lastProject')) || list[0];
    const recent = list.filter((p) => p !== last).slice(0, 8);
    return h('div', { class: 'home' },
      hero(),
      last ? ui.section(null, null, continueCard(last)) : null,
      ui.section(t('home_quick'), null,
        h('div', { class: 'quick-grid' }, QUICK.map((q) => h('button', { type: 'button', class: 'quick', onclick: () => { CS.haptic(); q.go(); } },
          ui.tile(q.icon, q.tint), h('span', { class: 'quick-label' }, t('quick_' + q.id)))))),
      CS.learn ? ui.section(t('home_learning'), null, learnCard()) : null,
      recent.length ? ui.section(t('home_recent'), ui.button({ label: t('see_all'), variant: 'ghost', size: 'sm', onClick: () => router.switchTab('projects') }),
        h('div', { class: 'hscroll' }, recent.map((p) => h('button', { type: 'button', class: 'mini-project', onclick: () => C().openProject(p.id) },
          C().avatar(p, 'lg'), h('span', { class: 'mini-name' }, p.name), h('span', { class: 'mini-meta' }, CS.util.relTime(p.updatedAt, CS.i18n.lang)))))) : null,
      ui.section(null, null, tip()));
  }

  router.register('home', { tab: 'home', root: true, refreshOn: ['projects-changed', 'learn-progress'], title: () => t('app_name'), render,
    actions: () => [ui.iconButton('search', t('search'), () => router.go('search'))] });
})();
