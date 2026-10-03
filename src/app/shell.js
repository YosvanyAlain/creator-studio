/* App shell: splash, theme, app bar, tabs and boot sequence. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, icon, ui, router } = CS;
  const t = (...a) => CS.t(...a);
  const VERSION = '3.0.0';
  /* The splash animation settles at ~1.9 s, then holds briefly before the app appears. */
  const SPLASH_MIN = 2900;
  const SPLASH_MAX = 6500;
  const TABS = [
    { id: 'home', icon: 'home', label: 'tab_home' },
    { id: 'learn', icon: 'learn', label: 'tab_learn' },
    { id: 'create', icon: 'create', label: 'tab_create' },
    { id: 'projects', icon: 'projects', label: 'tab_projects' },
    { id: 'settings', icon: 'settings', label: 'tab_settings' }
  ];

  const els = {};

  function applyTheme() {
    const pref = CS.settings.get('theme');
    const dark = pref === 'dark' || (pref === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    const root = document.documentElement;
    root.dataset.theme = dark ? 'dark' : 'light';
    root.dataset.font = CS.settings.get('font') || 'm';
    root.classList.toggle('reduce-motion', !!CS.settings.get('reduceMotion'));
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0b0d17' : '#f5f6fb');
  }

  function buildShell() {
    els.back = ui.iconButton('back', t('back'), () => router.back(), { class: 'appbar-back' });
    els.title = h('div', { class: 'appbar-title' });
    els.sub = h('div', { class: 'appbar-sub' });
    els.actions = h('div', { class: 'appbar-actions' });
    els.mark = CS.icons.mark(30);
    els.appbar = h('header', { class: 'appbar' }, els.back, els.mark, h('div', { class: 'appbar-titles' }, els.title, els.sub), els.actions);
    els.content = h('main', { class: 'content', id: 'content' });
    els.tabbar = h('nav', { class: 'tabbar', 'aria-label': t('nav_label') }, TABS.map((tab) => h('button', {
      type: 'button', class: 'tab', dataset: { tab: tab.id }, onclick: () => { CS.haptic(); router.switchTab(tab.id); }
    }, h('span', { class: 'tab-pill' }, icon(tab.icon)), h('span', { class: 'tab-label' }, t(tab.label)))));
    els.shell = h('div', { class: 'shell' }, els.appbar, els.content, els.tabbar);
    document.getElementById('app').appendChild(els.shell);
    router.attach(els.content);
    els.content.addEventListener('scroll', () => {
      const y = els.content.scrollTop;
      els.appbar.classList.toggle('scrolled', y > 4);
      els.appbar.classList.toggle('show-title', y > 44);
    }, { passive: true });
  }

  function onRoute(info) {
    const view = info.view;
    const deep = info.depth > 1;
    els.back.hidden = !deep && !view.backTo;
    els.mark.style.display = deep || view.backTo ? 'none' : '';
    els.title.textContent = typeof view.title === 'function' ? view.title(info.params) : (view.title || '');
    const sub = view.subtitle ? view.subtitle(info.params) : '';
    els.sub.textContent = sub || '';
    els.sub.hidden = !sub;
    CS.mount(els.actions, view.actions ? view.actions(info.params) : null);
    els.tabbar.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === info.tab));
    document.documentElement.classList.toggle('hide-tabs', !!view.immersive);
    els.appbar.hidden = !!view.noAppbar;
    els.appbar.classList.toggle('large', !!view.largeTitle);
    els.content.classList.toggle('flush', !!view.flush);
    els.appbar.classList.remove('show-title');
  }

  /* Views can update their own title/actions after async work. */
  function setChrome(opts) {
    if (opts.title != null) els.title.textContent = opts.title;
    if (opts.subtitle != null) { els.sub.textContent = opts.subtitle; els.sub.hidden = !opts.subtitle; }
    if (opts.actions !== undefined) CS.mount(els.actions, opts.actions);
  }

  async function hideSplash(started) {
    const splash = document.getElementById('splash');
    if (!splash) return;
    const wait = Math.max(0, SPLASH_MIN - (performance.now() - started));
    await CS.util.sleep(CS.settings.get('reduceMotion') ? Math.min(wait, 500) : wait);
    splash.classList.add('done');
    setTimeout(() => splash.remove(), 600);
  }

  async function boot() {
    const started = window.__csStart || performance.now();
    const failsafe = setTimeout(() => hideSplash(started - SPLASH_MAX), SPLASH_MAX);
    CS.i18n.init();
    applyTheme();
    if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
    CS.bus.on('settings', ({ key }) => { if (['theme', 'font', 'reduceMotion', '*'].includes(key)) applyTheme(); });
    CS.bus.on('lang', () => location.reload());
    CS.viewport.init();
    buildShell();
    CS.bus.on('route', onRoute);
    CS.bus.on('save-error', (e) => ui.toast(e && e.code === 'storage-full' ? t('err_storage_full') : t('err_save'), 'error'));
    try { await CS.store.init(); } catch (error) { console.error(error); }
    CS.snapshots.init();
    if (CS.webxdcBridge) CS.webxdcBridge.init();
    await router.switchTab('home');
    clearTimeout(failsafe);
    hideSplash(started);
    window.addEventListener('beforeunload', () => { CS.projects.flush(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) CS.projects.flush(); });
  }

  CS.app = { boot, VERSION, setChrome, applyTheme, TABS, get els() { return els; } };
})();
