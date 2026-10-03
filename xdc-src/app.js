/* =========================================================================
 * Webxdc Creator Studio — app.js
 * App shell: settings, theme, language, navigation (bottom tabs + project tabs),
 * modals/sheets/toasts and Home, Projects, Templates, Export, Help, Settings.
 * Editor, Blocks and Preview live in their own modules.
 * ========================================================================= */
'use strict';
(function () {
  const CS = (globalThis.CS = globalThis.CS || {});
  const U = CS.util;

  const VERSION = '2.0.0';
  const APP_TITLE = 'Webxdc Creator Studio';

  const PROJECT_VIEWS = ['editor', 'blocks', 'pages', 'components', 'preview', 'export', 'inspector'];

  /* =================================================================== *
   * Settings (localStorage with memory fallback)
   * =================================================================== */
  const settingsDefaults = {
    theme: 'auto',        /* auto | light | dark */
    lang: 'auto',         /* auto | short BCP-47 code (en, es, …) */
    font: 'm',            /* s | m | l */
    editorFont: null,     /* null = AUTO → 10 mobile / 13 desktop */
    editorWrap: true,     /* word wrap ON by default */
    preferMonaco: false,   /* off by default; enabled from the editor */
    exportCredit: false,   /* no Studio credit on shared .xdc unless asked */
    collabAuto: false,     /* presence updates off; otherwise the chat fills with notices */
    autosaveMs: 8000,
    previewMode: 'development'
  };

  /* touch/mobile device? (coarse pointer or small screen) */
  function isMobile() {
    /* Primary = pointer type (finger vs mouse). Narrow desktop windows are NOT mobile
     * (the size heuristic previously turned off highlighting on small windows). */
    try {
      if (window.matchMedia) {
        if (window.matchMedia('(pointer: coarse)').matches) return true;
        if (window.matchMedia('(pointer: fine)').matches) return false;
      }
      const w = (window.screen && window.screen.width) || 9999;
      const h = (window.screen && window.screen.height) || 9999;
      return !!(Math.min(w, h) < 500);
    } catch (e) { return false; }
  }

  function editorFontPx() {
    const v = settings.get('editorFont');
    if (v) return v;
    return isMobile() ? 13 : 14;
  }

  const settings = {
    _data: Object.assign({}, settingsDefaults),
    _mode: 'local',
    load: function () {
      try {
        const raw = localStorage.getItem('wcs_settings');
        if (raw) this._data = Object.assign({}, settingsDefaults, JSON.parse(raw));
        this._mode = 'local';
        /* one-time: wrap ON for all; on mobile font → AUTO */
        if (raw && !localStorage.getItem('wcs_mig1150')) {
          if (this._data.editorWrap === false) this._data.editorWrap = true;
          if (isMobile() && this._data.editorFont === 13) this._data.editorFont = null;
          try {
            localStorage.setItem('wcs_settings', JSON.stringify(this._data));
            localStorage.setItem('wcs_mig1150', '1');
          } catch (e2) { /* ignore */ }
        }
      } catch (e) {
        this._mode = 'memory';
      }
      return this._data;
    },
    get: function (key) { return this._data[key]; },
    set: function (key, value) {
      this._data[key] = value;
      try { localStorage.setItem('wcs_settings', JSON.stringify(this._data)); }
      catch (e) { /* memoria: no persiste */ }
      applyChrome();
    },
    get mode() { return this._mode; }
  };

  /* =================================================================== *
   * Theme / language / typography
   * =================================================================== */
  function applyChrome() {
    const doc = document.documentElement;
    const theme = settings.get('theme');
    let dark = false;
    if (theme === 'dark') dark = true;
    else if (theme === 'light') dark = false;
    else dark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    doc.setAttribute('data-theme', dark ? 'dark' : 'light');
    doc.setAttribute('data-font', settings.get('font'));
    if (window.matchMedia) {
      try {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
          if (settings.get('theme') === 'auto') applyChrome();
        });
      } catch (e) { /* Safari antiguas */ }
    }
    updateHeaderIndicators();
  }

  /* =================================================================== *
   * App state
   * =================================================================== */
  const app = {
    view: 'home',
    lastBuilt: null,      /* last .xdc built in Export view */
    storageMode: 'loading',   /* until store.init() answers */
    STUCK_MS: 6000   /* after this, the projects-safe notice appears (tests shorten it) */
  };
  let projectsStuckTimer = null;

  function t(key, params) { return CS.i18n.t(key, params); }

  /* ---------- Header indicators ---------- */
  function updateHeaderIndicators() {
    const el1 = document.getElementById('ind-storage');
    const el2 = document.getElementById('ind-webxdc');
    if (el1) {
      const mode = app.storageMode;
      const ic = mode === 'idb' ? 'db' : (mode === 'local' ? 'box' : (mode === 'loading' ? 'wait' : 'bolt'));
      U.setIcon(el1, ic, { size: 16 });
      el1.title = t('ind_storage_' + mode);
    }
    if (el2) {
      const has = CS.exporter.webxdcAvailable();
      U.setIcon(el2, has ? 'radioOn' : 'radioOff', { size: 16 });
      el2.title = has ? t('ind_webxdc_yes') : t('ind_webxdc_no');
    }
  }

  /* =================================================================== *
   * Navigation
   * =================================================================== */
  const VIEWS = [
    { id: 'home', icon: 'home', label: 'nav_home' },
    { id: 'projects', icon: 'folder', label: 'nav_projects' },
    { id: 'templates', icon: 'grid', label: 'nav_templates' },
    { id: 'editor', icon: 'code', label: 'nav_editor' },
    { id: 'blocks', icon: 'blocks', label: 'nav_blocks' },
    { id: 'pages', icon: 'pages', label: 'nav_pages' },
    { id: 'components', icon: 'puzzle', label: 'nav_components' },
    { id: 'preview', icon: 'play', label: 'nav_preview' },
    { id: 'inspector', icon: 'inspect', label: 'nav_inspector' },
    { id: 'export', icon: 'box', label: 'nav_export' },
    { id: 'help', icon: 'help', label: 'nav_help' },
    { id: 'settings', icon: 'gear', label: 'nav_settings' }
  ];

  function showView(id, opts) {
    opts = opts || {};
    if (PROJECT_VIEWS.indexOf(id) >= 0 && !CS.projects.current) {
      /* No open project: project views show their empty state */
    }
    const prev = app.view;
    if (prev === 'editor' && id !== 'editor' && CS.editor) CS.editor.flush();
    app.view = id;
    try { document.documentElement.setAttribute('data-view', id); } catch (e) { /* ignore */ }
    renderNav();

    U.$$('.view').forEach(function (v) { v.classList.remove('active'); });
    const section = document.getElementById('view-' + id);
    if (section) section.classList.add('active');

    renderTitle();
    updateHeaderIndicators();

    const container = document.getElementById('view-' + id);
    if (!container) return;
    try {
      if (id === 'home') renderHome(container);
      else if (id === 'projects') renderProjects(container);
      else if (id === 'templates') renderTemplates(container);
      else if (id === 'editor') CS.editor.render(container);
      else if (id === 'blocks') CS.blocksUI.render(container);
      else if (id === 'preview') CS.preview.render(container);
      else if (id === 'pages') renderPages(container);
      else if (id === 'components') renderComponents(container);
      else if (id === 'inspector') {
        CS.inspector.render(container);
        const collabHost = U.el('div', { class: 'collab-host' });
        container.appendChild(collabHost);
        if (CS.collab) CS.collab.render(collabHost);
      }
      else if (id === 'export') renderExport(container);
      else if (id === 'help') renderHelp(container);
      else if (id === 'settings') renderSettings(container);
    } catch (err) {
      /* the view fails but the app stays alive */
      try {
        container.textContent = '';
        container.appendChild(U.el('div', { class: 'notice warn' },
          U.icon('warn', { size: 16 }),
          U.el('span', { text: t('view_render_error') + ' (' + ((err && err.message) || err) + ')' })));
      } catch (e2) { /* ignore */ }
    }

    /* replaceState instead of pushState: the URL reflects the view but history
     * does not grow on every navigation, so the system back gesture does not
     * walk through views or unload the app. */
    if (!opts.noHistory) {
      try { history.replaceState({ view: id }, '', '#' + id); } catch (e) { /* iframe sandbox */ }
    }
    try { window.scrollTo(0, 0); } catch (e) { /* ignore */ }
  }

  /* Global tabs (no project open, or outside project views). */
  const MAIN_TABS = [
    { id: 'home', icon: 'home', label: 'tab_home' },
    { id: 'projects', icon: 'folder', label: 'tab_projects' },
    { id: 'templates', icon: 'grid', label: 'tab_templates' },
    { id: 'help', icon: 'school', label: 'tab_learn' },
    { id: 'settings', icon: 'gear', label: 'tab_settings' }
  ];
  /* Project tabs; "more" opens a sheet with the secondary project views. */
  const PROJECT_TABS = [
    { id: 'editor', icon: 'code', label: 'ptab_code' },
    { id: 'blocks', icon: 'blocks', label: 'ptab_blocks' },
    { id: 'preview', icon: 'play', label: 'ptab_test' },
    { id: 'export', icon: 'send', label: 'ptab_publish' },
    { id: 'more', icon: 'more', label: 'ptab_more' }
  ];
  const MORE_VIEWS = ['pages', 'components', 'inspector'];

  function inProject() {
    return !!CS.projects.current && PROJECT_VIEWS.indexOf(app.view) >= 0;
  }

  function renderTitle() {
    const title = document.getElementById('app-title');
    const sub = document.getElementById('app-sub');
    const back = document.getElementById('btn-back');
    const meta = VIEWS.filter(function (v) { return v.id === app.view; })[0];
    const label = meta ? t(meta.label) : APP_TITLE;
    if (inProject()) {
      title.textContent = CS.projects.current.name;
      sub.textContent = label;
      sub.hidden = false;
      back.hidden = false;
    } else {
      title.textContent = app.view === 'home' ? APP_TITLE : label;
      sub.hidden = true;
      back.hidden = true;
    }
    document.documentElement.toggleAttribute('data-in-project', inProject());
  }

  function navButton(tab, active, onclick) {
    return U.el('button', {
      class: 'tab' + (active ? ' active' : ''),
      dataset: { tab: tab.id },
      'aria-current': active ? 'page' : null,
      onclick: onclick
    }, U.el('span', { class: 'tab-ico' }, U.icon(tab.icon, { size: 22 })), U.el('span', { class: 'tab-label', text: t(tab.label) }));
  }

  function renderNav() {
    const bar = document.getElementById('tabbar');
    if (!bar) return;
    bar.textContent = '';
    const project = inProject();
    bar.classList.toggle('project', project);
    if (project) {
      PROJECT_TABS.forEach(function (tab) {
        const active = tab.id === 'more' ? MORE_VIEWS.indexOf(app.view) >= 0 : app.view === tab.id;
        bar.appendChild(navButton(tab, active, function () {
          if (tab.id === 'more') moreSheet();
          else showView(tab.id);
        }));
      });
    } else {
      MAIN_TABS.forEach(function (tab) {
        bar.appendChild(navButton(tab, app.view === tab.id, function () { showView(tab.id); }));
      });
    }
  }
  /* Old names kept for callers across modules. */
  function renderDrawer() { renderNav(); renderTitle(); }
  function renderProjectBar() { renderNav(); renderTitle(); }

  function moreSheet() {
    const p = CS.projects.current;
    const item = function (iconName, tint, title, desc, run) {
      return U.el('button', { class: 'menu-row', onclick: function () { close(); run(); } },
        U.el('span', { class: 'tile-ico tint-' + tint }, U.icon(iconName, { size: 20 })),
        U.el('span', { class: 'menu-text' }, U.el('b', { text: title }), U.el('span', { class: 'hint', text: desc })),
        U.icon('forward', { size: 18 }));
    };
    const body = U.el('div', { class: 'menu-list' },
      item('pages', 'blue', t('nav_pages'), t('more_pages_desc'), function () { showView('pages'); }),
      item('puzzle', 'violet', t('nav_components'), t('more_components_desc'), function () { showView('components'); }),
      item('inspect', 'teal', t('nav_inspector'), t('more_inspector_desc'), function () { showView('inspector'); }),
      item('pencil', 'amber', t('more_rename'), U.truncate(p.name, 40), function () { renameProjectFlow(p); }),
      item('close', 'slate', t('project_close'), t('more_close_desc'), async function () {
        await closeProject();
        showView('projects');
      }));
    const close = sheet({ title: t('ptab_more'), body: body });
  }

  async function closeProject() {
    if (CS.editor) await CS.editor.flush();
    await CS.projects.close();
    CS.preview._reset();
    app.lastBuilt = null;
    toast(t('project_closed'));
    renderNav();
    renderTitle();
  }

  /* =================================================================== *
   * Modales / sheets / toasts
   * =================================================================== */
  let modalLock = 0;
  function lockModal() {
    modalLock++;
    document.body.classList.add('modal-open');
  }
  function unlockModal() {
    modalLock = Math.max(0, modalLock - 1);
    if (!modalLock) document.body.classList.remove('modal-open');
  }

  function modal(opts) {
    return new Promise(function (resolve) {
      const overlay = U.el('div', { class: 'overlay' });
      const box = U.el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' });
      if (opts.title) {
        const tit = U.el('div', { class: 'modal-title' });
        if (opts.icon) tit.appendChild(U.icon(opts.icon, { size: 18 }));
        tit.appendChild(document.createTextNode(opts.title));
        box.appendChild(tit);
      }
      if (opts.body) box.appendChild(U.el('div', { class: 'modal-body' }, opts.body));
      const actions = U.el('div', { class: 'modal-actions' });
      (opts.actions || []).forEach(function (a) {
        actions.appendChild(U.el('button', {
          class: 'btn ' + (a.class || ''),
          onclick: function () {
            if (a.fn) {
              Promise.resolve(a.fn()).then(function (r) {
                if (r === false) return; /* validation failed: keep open (avoid stacked modals) */
                close();
                resolve(r);
              });
              return;
            }
            close();
            resolve(a.value !== undefined ? a.value : true);
          }
        }, a.label));
      });
      if (opts.cancelable !== false) {
        actions.appendChild(U.el('button', {
          class: 'btn ghost',
          onclick: function () { close(); resolve(opts.cancelValue !== undefined ? opts.cancelValue : null); }
        }, opts.cancelLabel || t('cancel')));
      }
      box.appendChild(actions);
      overlay.appendChild(box);
      overlay.addEventListener('click', function (ev) {
        if (ev.target === overlay && opts.cancelable !== false) { close(); resolve(null); }
      });
      /* Escape closes dismissible modals, matching the editor's Escape for fullscreen. */
      function onKey(ev) {
        if (ev.key === 'Escape' && opts.cancelable !== false) {
          ev.stopPropagation();
          close();
          resolve(opts.cancelValue !== undefined ? opts.cancelValue : null);
        }
      }
      function close() {
        overlay.remove();
        unlockModal();
        document.removeEventListener('keydown', onKey);
      }
      document.addEventListener('keydown', onKey);
      document.body.appendChild(overlay);
      lockModal();
      const first = box.querySelector('input, textarea, select, button');
      if (first && first.focus) setTimeout(function () { first.focus(); }, 40);
    });
  }

  function confirm(opts) {
    return modal({
      title: opts.title,
      body: U.el('p', { text: opts.message || '' }),
      actions: [{ label: opts.okLabel || t('ok'), class: opts.danger ? 'danger' : 'primary', value: true }],
      cancelValue: false
    });
  }

  function prompt(opts) {
    const input = U.el('input', {
      class: 'input', type: 'text', value: opts.value || '',
      placeholder: opts.placeholder || '', autocomplete: 'off'
    });
    if (opts.datalist && opts.datalist.length) {
      const dl = U.el('datalist', { id: 'wcs-prompt-dl' });
      opts.datalist.forEach(function (x) { dl.appendChild(new Option(x)); });
      input.setAttribute('list', 'wcs-prompt-dl');
      document.body.appendChild(dl);
    }
    const err = U.el('div', { class: 'prompt-err', role: 'alert' });
    let currentError = null;

    function validate() {
      const v = (opts.validate ? opts.validate(input.value) : null);
      currentError = v;
      err.textContent = v || '';
      input.classList.toggle('invalid', !!v);
      return !v;
    }
    input.addEventListener('input', validate);
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        const box = input.closest('.modal');
        const btn = box && box.querySelector('.modal-actions .btn.primary');
        if (btn) btn.click();
      }
    });

    let resolvePrompt = null;
    const p = new Promise(function (res) { resolvePrompt = res; });
    function cleanup() {
      const dl = document.getElementById('wcs-prompt-dl');
      if (dl) dl.remove();
    }

    modal({
      title: opts.title,
      body: U.el('div', {}, U.el('label', { class: 'field-label', text: opts.label || '' }), input, err,
        opts.hint ? U.el('p', { class: 'hint prompt-hint', text: opts.hint }) : null),
      actions: [{
        label: opts.okLabel || t('ok'), class: 'primary',
        fn: function () {
          if (!validate()) return false;
          cleanup();
          return input.value;
        }
      }],
      cancelLabel: t('cancel')
    }).then(function (res) {
      if (res === null) { cleanup(); resolvePrompt(null); }
      else resolvePrompt(res);
    });
    return p;
  }

  function sheet(opts) {
    const overlay = U.el('div', { class: 'overlay sheet-overlay' });
    const box = U.el('div', { class: 'sheet', role: 'dialog' });
    function dismiss() {
      overlay.remove();
      unlockModal();
    }
    box.appendChild(U.el('div', { class: 'sheet-grab' }));
    if (opts.title) box.appendChild(U.el('div', { class: 'sheet-title', text: opts.title }));
    if (opts.body) box.appendChild(opts.body);
    (opts.items || []).forEach(function (item) {
      const btn = U.el('button', {
        class: 'sheet-item' + (item.danger ? ' danger' : ''),
        onclick: function () {
          dismiss();
          if (item.fn) setTimeout(item.fn, 10);
        }
      });
      if (item.icon && U.icon) btn.appendChild(U.icon(item.icon, { size: 20 }));
      if (item.desc) {
        btn.classList.add('has-desc');
        btn.appendChild(U.el('span', { class: 'sheet-text' },
          U.el('span', { class: 'sheet-label', text: item.label }),
          U.el('span', { class: 'sheet-desc', text: item.desc })));
      } else {
        btn.appendChild(document.createTextNode(item.label));
      }
      box.appendChild(btn);
    });
    box.appendChild(U.el('button', {
      class: 'sheet-item cancel', onclick: dismiss
    }, t('cancel')));
    overlay.appendChild(box);
    overlay.addEventListener('click', function (ev) { if (ev.target === overlay) dismiss(); });
    lockModal();
    document.body.appendChild(overlay);  return dismiss;
  }

  /* accepts opts = { ttl, action: { label, fn } } (e.g. Undo) */
  function toast(msg, type, opts) {
    const wrap = document.getElementById('toasts');
    const el = U.el('div', { class: 'toast ' + (type || 'ok') });
    el.appendChild(document.createTextNode(String(msg)));
    if (opts && opts.action && opts.action.label) {
      el.appendChild(document.createTextNode(' '));
      el.appendChild(U.el('button', {
        class: 'toast-btn',
        onclick: function (ev) { ev.stopPropagation(); el.remove(); opts.action.fn(); }
      }, opts.action.label));
    }
    wrap.appendChild(el);
    const ttl = opts && opts.ttl ? opts.ttl : 2400;
    setTimeout(function () { el.classList.add('out'); }, ttl);
    setTimeout(function () { el.remove(); }, ttl + 400);
  }

  /* =================================================================== *
   * VIEW: Home
   * =================================================================== */
  let homeGen = 0;   /* avoid duplicate Recent cards if list() resolves late */

  function greetingKey() {
    const h = new Date().getHours();
    return h < 12 ? 'home_greet_morning' : (h < 19 ? 'home_greet_afternoon' : 'home_greet_evening');
  }

  const HERO_ART = '<svg viewBox="0 0 96 96" aria-hidden="true"><defs><linearGradient id="hg" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity=".55"/></linearGradient></defs>' +
    '<rect x="14" y="20" width="44" height="56" rx="9" fill="none" stroke="url(#hg)" stroke-width="4"/>' +
    '<path d="M26 38l-6 6 6 6M46 38l6 6-6 6M39 34l-6 20" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M70 14l3.4 8.6L82 26l-8.6 3.4L70 38l-3.4-8.6L58 26l8.6-3.4z" fill="#fff"/>' +
    '<path d="M76 52l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fff" opacity=".75"/></svg>';

  function homeTile(iconName, tint, label, run, extra) {
    return U.el('button', Object.assign({ class: 'tile', onclick: run }, extra || {}),
      U.el('span', { class: 'tile-ico tint-' + tint }, U.icon(iconName, { size: 22 })),
      U.el('span', { text: label }));
  }

  function projectRow(p, onOpen) {
    const files = Object.keys(p.files || {}).length;
    return U.el('button', { class: 'menu-row proj-row', onclick: onOpen },
      U.el('span', { class: 'tile-ico tint-indigo' }, U.icon('box', { size: 20 })),
      U.el('span', { class: 'menu-text' },
        U.el('b', { class: 'proj-name', text: U.truncate(p.name, 40) }),
        U.el('span', { class: 'hint', text: t('home_files', { n: files }) + ' · ' + U.formatDate(p.updatedAt) })),
      U.icon('forward', { size: 18 }));
  }

  function renderHome(root) {
    root.textContent = '';
    const gen = ++homeGen;
    const hasWebxdc = CS.exporter.webxdcAvailable();

    const hero = U.el('div', { class: 'hero' },
      U.el('div', { class: 'hero-text' },
        U.el('span', { class: 'hero-eyebrow', text: APP_TITLE }),
        U.el('h1', { text: t(greetingKey()) }),
        U.el('p', { text: t('home_sub') }),
        U.el('div', { class: 'hero-actions' },
          U.el('button', { class: 'btn hero-primary', onclick: newProjectFlow }, U.icon('plus', { size: 18 }), t('home_new')),
          U.el('button', { class: 'btn hero-ghost', onclick: function () { showView('help'); } }, U.icon('school', { size: 18 }), t('home_learn')))),
      U.el('div', { class: 'hero-art', html: HERO_ART }));
    root.appendChild(hero);

    const continueHost = U.el('div', { dataset: { homeContinue: '1' } });
    root.appendChild(continueHost);

    root.appendChild(U.el('div', { class: 'section-label', text: t('home_start') }));
    root.appendChild(U.el('div', { class: 'tile-grid' },
      homeTile('plus', 'indigo', t('home_tile_new'), newProjectFlow),
      homeTile('grid', 'teal', t('home_tile_templates'), function () { showView('templates'); }),
      homeTile('download', 'orange', t('home_tile_import'), importXdcFlow),
      homeTile('school', 'violet', t('home_tile_learn'), function () { showView('help'); }),
      homeTile('folder', 'blue', t('home_tile_projects'), function () { showView('projects'); }),
      homeTile('gear', 'slate', t('home_tile_settings'), function () { showView('settings'); })));

    const recentHost = U.el('div', { dataset: { homeRecent: '1' } });
    root.appendChild(recentHost);

    const editorName = settings.get('preferMonaco') && CS.monaco && CS.monaco.bundled ? 'Monaco' : t('env_editor_basic');
    root.appendChild(U.el('div', { class: 'env-strip' },
      U.el('span', { class: 'env-chip ' + (hasWebxdc ? 'ok' : 'warn') }, U.icon(hasWebxdc ? 'radioOn' : 'radioOff', { size: 14 }),
        hasWebxdc ? t('home_env_chat') : t('home_env_browser')),
      U.el('span', { class: 'env-chip' }, U.icon('db', { size: 14 }), t('storage_' + app.storageMode)),
      U.el('span', { class: 'env-chip' }, U.icon('code', { size: 14 }), editorName)));
    if (!hasWebxdc) root.appendChild(U.el('p', { class: 'hint env-note', text: t('env_browser_note') }));

    CS.store.list().then(function (projects) {
      if (gen !== homeGen) return;
      const last = CS.projects.current || projects[0];
      continueHost.textContent = '';
      if (last) {
        continueHost.appendChild(U.el('div', { class: 'card continue-card' },
          U.el('div', { class: 'continue-head' },
            U.el('span', { class: 'tile-ico tint-indigo' }, U.icon('box', { size: 22 })),
            U.el('div', { class: 'menu-text' },
              U.el('span', { class: 'hint', text: t('home_continue') }),
              U.el('b', { class: 'continue-name', text: U.truncate(last.name, 40) }))),
          U.el('div', { class: 'row-gap' },
            U.el('button', { class: 'btn primary', onclick: function () { openProject(last.id); } }, U.icon('code', { size: 16 }), t('home_open')),
            U.el('button', {
              class: 'btn', onclick: async function () { await openProject(last.id); showView('preview'); }
            }, U.icon('play', { size: 16 }), t('home_test')))));
      }
      recentHost.textContent = '';
      const others = projects.filter(function (p) { return !last || p.id !== last.id; }).slice(0, 4);
      if (!projects.length) {
        recentHost.appendChild(U.el('div', { class: 'card empty-card' },
          U.el('span', { class: 'tile-ico tint-violet' }, U.icon('sparkles', { size: 22 })),
          U.el('div', {}, U.el('b', { text: t('home_empty_title') }), U.el('p', { class: 'hint', text: t('home_empty') }))));
        return;
      }
      if (!others.length) return;
      recentHost.appendChild(U.el('div', { class: 'section-label' }, U.el('span', { text: t('home_recent') }), U.el('span', { class: 'spacer' }),
        U.el('button', { class: 'link-btn', onclick: function () { showView('projects'); } }, t('see_all'))));
      const list = U.el('div', { class: 'card list-card proj-list' });
      others.forEach(function (p) { list.appendChild(projectRow(p, function () { openProject(p.id); })); });
      recentHost.appendChild(list);
    }).catch(function () { /* storage error: the Projects view explains it */ });
  }

  function renderPages(root) {
    root.textContent = '';
    const p = CS.projects.current;
    if (!p) {
      root.appendChild(U.el('div', { class: 'empty-state card' }, U.el('p', { text: t('pages_no_project') })));
      return;
    }
    if (CS.pages) CS.pages.ensureNavRuntime(p);
    const pages = CS.pages ? CS.pages.list(p) : [];
    root.appendChild(U.el('div', { class: 'card' },
      U.el('div', { class: 'card-head' }, U.icon('pages', { size: 16 }), U.el('span', { text: t('pages_title') })),
      U.el('p', { class: 'hint', text: t('pages_intro') }),
      U.el('button', {
        class: 'btn primary',
        onclick: function () {
          prompt({ title: t('pages_new'), label: t('pages_name') }).then(function (name) {
            if (!name) return;
            try {
              CS.pages.add(p, name);
              CS.projects.save(p);
              toast(t('pages_created', { name: name }));
              renderPages(root);
            } catch (e) { toast(String(e && e.message || e), 'error'); }
          });
        }
      }, t('pages_add'))));
    const list = U.el('div', { class: 'proj-list' });
    pages.forEach(function (pg) {
      const row = U.el('div', { class: 'proj-row' },
        U.el('span', { class: 'proj-name' }, U.icon(pg.isHome ? 'home' : 'file', { size: 16 }), pg.name + ' · ' + pg.file),
        pg.isHome ? null : U.el('button', {
          class: 'btn ghost small',
          onclick: function () {
            try { CS.pages.remove(p, pg.id); CS.projects.save(p); renderPages(root); }
            catch (e) { toast(String(e && e.message || e), 'error'); }
          }
        }, t('delete')));
      list.appendChild(row);
    });
    root.appendChild(U.el('div', { class: 'card' }, list));

    const scenes = p.scenes || [];
    root.appendChild(U.el('div', { class: 'card' },
      U.el('div', { class: 'card-head' }, U.el('span', { text: t('scenes_title') })),
      U.el('p', { class: 'hint', text: t('scenes_intro') }),
      U.el('button', {
        class: 'btn',
        onclick: function () {
          prompt({ title: t('scenes_new'), label: t('pages_name') }).then(function (name) {
            if (!name) return;
            CS.pages.addScene(p, name);
            CS.projects.save(p);
            renderPages(root);
          });
        }
      }, t('scenes_add'))));
    scenes.forEach(function (sc) {
      root.appendChild(U.el('div', { class: 'proj-row' }, U.el('span', {}, U.icon('film', { size: 16 }), sc.name + ' · ' + (sc.file || ''))));
    });
  }

  function renderComponents(root) {
    root.textContent = '';
    const p = CS.projects.current;
    if (!p) {
      root.appendChild(U.el('div', { class: 'empty-state card' }, U.el('p', { text: t('cmp_no_project') })));
      return;
    }
    root.appendChild(U.el('div', { class: 'card' },
      U.el('div', { class: 'card-head' }, U.icon('puzzle', { size: 16 }), U.el('span', { text: t('cmp_title') })),
      U.el('p', { class: 'hint', text: t('cmp_intro') }),
      U.el('p', { class: 'hint', text: t('cmp_vs_blocks') }),
      U.el('button', { class: 'btn ghost small', onclick: function () { showView('blocks'); } }, U.icon('blocks', { size: 16 }), t('cmp_open_blocks'))));
    const grid = U.el('div', { class: 'cmp-grid' });
    const types = CS.components ? CS.components.list() : [];
    const lang = CS.i18n.lang();
    types.forEach(function (ty) {
      const def = CS.components.DEFS[ty];
      const loc = def[lang] || def.es;
      grid.appendChild(U.el('button', {
        class: 'cmp-card',
        onclick: function () {
          try {
            const r = CS.components.insert(p, ty, CS.components.defaults(ty));
            CS.projects.save(p);
            toast(t('cmp_inserted', { name: loc.name, id: r.id }));
            if (CS.preview) CS.preview.onProjectChanged();
          } catch (e) { toast(t('cmp_fail') + ': ' + (e && e.message || e), 'error'); }
        }
      }, U.el('b', { text: loc.name }), U.el('span', { class: 'hint', text: loc.desc })));
    });
    root.appendChild(grid);
  }

  /* =================================================================== *
   * VIEW: Projects
   * =================================================================== */
  function renderProjects(root) {
    root.textContent = '';
    const head = U.el('div', { class: 'view-actions' },
      U.el('button', { class: 'btn primary', onclick: newProjectFlow }, U.icon('plus', { size: 16 }), t('projects_new')),
      U.el('button', { class: 'btn', onclick: importXdcFlow }, U.icon('download', { size: 16 }), t('projects_import')));
    root.appendChild(head);

    const loadingCard = U.el('div', { class: 'empty-state card' },
      U.el('p', {}, U.icon('wait', { size: 16 }), t('projects_loading')));
    if (projectsStuckTimer) { clearTimeout(projectsStuckTimer); projectsStuckTimer = null; }
    if (app.storageMode === 'loading') {
      root.appendChild(loadingCard);
      projectsStuckTimer = setTimeout(function () {
        projectsStuckTimer = null;
        if (app.storageMode !== 'loading' || !loadingCard.isConnected) return;
        loadingCard.textContent = '';
        loadingCard.appendChild(U.el('p', { text: t('stuck_title') }));
        loadingCard.appendChild(U.el('p', { class: 'hint', text: t('stuck_hint') }));
      }, app.STUCK_MS || 6000);
      if (projectsStuckTimer && typeof projectsStuckTimer.unref === 'function') projectsStuckTimer.unref();
    }

    function paintProjects(projects) {
      if (projectsStuckTimer) { clearTimeout(projectsStuckTimer); projectsStuckTimer = null; }
      if (loadingCard.isConnected) loadingCard.remove();
      /* clear previous lists (onReady may repaint) */
      U.$$('.proj-list, .empty-state', root).forEach(function (n) {
        if (n !== loadingCard) n.remove();
      });
      if (!projects || !projects.length) {
        root.appendChild(U.el('div', { class: 'empty-state card' },
          U.el('p', { text: t('projects_empty') }),
          U.el('button', { class: 'btn primary', onclick: newProjectFlow }, U.icon('plus', { size: 16 }), t('projects_new'))));
        return;
      }
      const list = U.el('div', { class: 'proj-list cards' });
      projects.forEach(function (p) {
        const nFiles = Object.keys(p.files || {}).length;
        const size = U.formatBytes(CS.projects.totalSize(p));
        const tints = ['indigo', 'blue', 'teal', 'green', 'amber', 'orange', 'pink', 'violet'];
        let h = 0;
        for (let i = 0; i < String(p.id).length; i++) h = (h * 31 + String(p.id).charCodeAt(i)) >>> 0;
        const openBtn = U.el('button', { class: 'proj-open', onclick: function () { openProject(p.id); } },
          U.el('span', { class: 'proj-avatar tint-' + tints[h % tints.length], text: (String(p.name || '?').trim()[0] || '?').toUpperCase() }),
          U.el('span', { class: 'proj-titles' },
            U.el('span', { class: 'proj-name', text: U.truncate(p.name, 40) }),
            U.el('span', { class: 'hint', text: nFiles + ' ' + t('files_word') + ' · ' + size + ' · ' + U.formatDate(p.updatedAt) })));
        const menuBtn = U.el('button', {
          class: 'btn ghost small', 'aria-label': t('more'), title: t('more'),
          onclick: function () { projectSheet(p); }
        }, U.icon('more', { size: 18 }));
        const card = U.el('div', { class: 'proj-card card' },
          U.el('div', { class: 'proj-main' }, openBtn, menuBtn));
        list.appendChild(card);
      });
      root.appendChild(list);
    }

    CS.store.list().then(paintProjects).catch(function () {
      paintProjects([]);
    });
  }

  function projectSheet(p) {
    sheet({
      title: U.truncate(p.name, 40),
      items: [
        { icon: 'folder', label: t('btn_open'), fn: function () { openProject(p.id); } },
        { icon: 'pencil', label: t('rename'), fn: function () { renameProjectFlow(p); } },
        { icon: 'copy', label: t('duplicate'), fn: function () { duplicateProject(p.id); } },
        { icon: 'trash', label: t('delete'), danger: true, fn: function () { deleteProjectFlow(p); } }
      ]
    });
  }

  async function openProject(id) {
    try {
      const p = await CS.projects.open(id);
      if (!p) { toast(t('project_not_found'), 'error'); return; }
      renderDrawer();
      toast(t('project_opened', { name: U.truncate(p.name, 24) }));
      showView('editor');
      if (CS.snapshots) {
        CS.snapshots.pendingRecovery(p).then(function (snap) {
          if (!snap) return;
          confirm({
            title: t('recovery_banner'),
            message: t('recovery_ask'),
            okLabel: t('recovery_restore')
          }).then(function (yes) {
            if (!yes) return;
            CS.snapshots.restoreInto(snap, p).then(function (restored) {
              CS.projects.current = restored;
              return CS.projects.save(restored);
            }).then(function () {
              toast(t('recovery_done'));
              showView('editor');
            }).catch(function (e) { toast(t('err_generic') + ': ' + (e && e.message || e), 'error'); });
          });
        }).catch(function () {});
      }
    } catch (e) {
      if (e && e.message === 'future-version') {
        toast(t('project_future_version', { v: e.foundVersion }), 'error');
      } else {
        toast(t('err_generic') + ': ' + (e && e.message || e), 'error');
      }
    }
  }

  function renameProjectFlow(p) {
    prompt({
      title: t('rename'),
      label: t('project_name_label'),
      value: p.name
    }).then(function (value) {
      if (!value) return;
      CS.projects.rename(p.id, value).then(function (updated) {
        toast(t('renamed_ok'));
        renderDrawer();
        renderProjectBar();
        const cur = document.getElementById('view-projects');
        if (cur && app.view === 'projects') renderProjects(cur);
      }).catch(function (e) { toast(t('err_generic') + ': ' + e.message, 'error'); });
    });
  }

  function duplicateProject(id) {
    CS.projects.duplicate(id).then(function () {
      toast(t('duplicated_ok'));
      const cur = document.getElementById('view-projects');
      if (cur) renderProjects(cur);
    }).catch(function (e) { toast(t('err_generic') + ': ' + e.message, 'error'); });
  }

  function deleteProjectFlow(p) {
    confirm({
      title: t('delete'),
      message: t('delete_project_confirm', { name: p.name }),
      danger: true,
      okLabel: t('delete')
    }).then(function (yes) {
      if (!yes) return;
      CS.projects.remove(p.id).then(function () {
        toast(t('deleted_ok'));
        renderDrawer();
        renderProjectBar();
        const cur = document.getElementById('view-projects');
        if (cur && app.view === 'projects') renderProjects(cur);
      });
    });
  }

  /* ---------- New project ---------- */
  function newProjectFlow() {
    sheet({
      title: t('create_title'),
      items: [
        { icon: 'blank', label: t('pick_empty'), fn: function () { createEmptyProject(); } },
        { icon: 'file', label: t('pick_blank'), fn: function () { createFromTemplate('blank'); } },
        { icon: 'blocks', label: t('pick_blocks'), fn: function () { createFromTemplate('blocks-scaffold'); } },
        { icon: 'puzzle', label: t('pick_more'), fn: function () { showView('templates'); } }
      ]
    });
  }

  /* Fully empty project: no files; user adds what they need. */
  function createEmptyProject() {
    prompt({
      title: t('create_title'),
      label: t('project_name_label'),
      value: t('pick_empty_name')
    }).then(function (name) {
      if (!name) return;
      try {
        const p = CS.projects.newProject(name, null);
        p.settings.xdcName = p.name;
        CS.projects.save(p).then(function () {
          CS.projects.current = p;
          renderDrawer();
          toast(t('project_created', { name: U.truncate(p.name, 24) }));
          showView('editor');
        });
      } catch (err) {
        toast((err && err.message) || String(err), 'error');
      }
    });
  }

  function createFromTemplate(templateId, presetName) {
    const meta = CS.tpl.meta(templateId);
    const defName = presetName || (meta ? meta.name : (CS.i18n && CS.i18n.t('pick_empty_name')) || 'My app');
    prompt({
      title: t('create_title'),
      label: t('project_name_label'),
      value: defName
    }).then(function (name) {
      if (!name) return;
      try {
        const p = CS.projects.fromTemplate(templateId, name);
        /* Block templates: generate the initial file */
        if (p.blocks.model && templateId === 'blocks-scaffold') {
          const gen = CS.blocks.generate(p.blocks.model);
          p.files[p.blocks.generatedFile] = { kind: 'text', content: gen.code };
          p.blocks.lastGeneratedAt = Date.now();
        }
        CS.projects.save(p).then(function () {
          CS.projects.current = p;
          renderDrawer();
          toast(t('project_created', { name: U.truncate(p.name, 24) }));
          showView('editor');
        });
      } catch (e) {
        toast(t('err_generic') + ': ' + e.message, 'error');
      }
    });
  }

  /* ---------- Importar .xdc ---------- */
  function importXdcFlow() {
    function handleFile(file) {
      if (!file) return;
      if (file.size > 20 * 1024 * 1024) { toast(t('import_too_big'), 'error'); return; }
      toast(t('import_reading'));
      CS.exporter.importXdcFile(file).then(function (res) {
        return CS.projects.save(res.project).then(function () {
          CS.projects.current = res.project;
          renderDrawer();
          toast(t('import_done', { n: res.count }));
          (res.warnings || []).slice(0, 3).forEach(function (w) { toast(U.truncate(w, 80), 'warn'); });
          showView('editor');
        });
      }).catch(function (e) {
        toast(t('import_failed') + ': ' + (e && e.message || e), 'error');
      });
    }

    if (CS.exporter.importFilesAvailable()) {
      /* API webxdc importFiles (client-dependent) */
      window.webxdc.importFiles({ extensions: ['.xdc'], multiple: false })
        .then(function (files) { handleFile(files && files[0]); })
        .catch(function () { /* cancelado o no soportado → fallback */ fileInputFallback(); });
    } else {
      fileInputFallback();
    }

    function fileInputFallback() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.xdc,.zip,application/zip';
      input.onchange = function () { handleFile(input.files && input.files[0]); };
      input.click();
    }
  }

  /* =================================================================== *
   * VIEW: Templates
   * =================================================================== */
  let tplFilter = 'all';
  const TPL_LOOK = {
    blank: ['file', 'slate'], 'blocks-scaffold': ['puzzle', 'indigo'], counter: ['plus', 'blue'],
    todo: ['check', 'green'], calculator: ['fn', 'amber'], tictactoe: ['grid', 'violet'],
    snake: ['gamepad', 'green'], timer: ['wait', 'orange'], notes: ['pencil', 'amber'],
    poll: ['list', 'teal'], form: ['pages', 'blue'], tapgame: ['target', 'pink'], draw: ['brush', 'pink'],
    dice: ['cube', 'violet'], raffle: ['trophy', 'amber'], split: ['users', 'teal'], chat: ['chat', 'blue'],
    dashboard: ['layers', 'indigo'], multimedia: ['film', 'orange'], lesson: ['school', 'green']
  };

  function renderTemplates(root) {
    root.textContent = '';
    const cats = [{ id: 'all', label: t('tpl_cat_all') }].concat(
      CS.tpl.cats.map(function (c) {
        const found = catLabel(c);
        return { id: c, label: found };
      })
    );
    const chips = U.el('div', { class: 'chip-row' });
    cats.forEach(function (c) {
      chips.appendChild(U.el('button', {
        class: 'chip' + (tplFilter === c.id ? ' active' : ''),
        onclick: function () { tplFilter = c.id; renderTemplates(root); }
      }, c.label));
    });
    root.appendChild(chips);

    const list = U.el('div', { class: 'tpl-grid' });
    CS.tpl.list().forEach(function (tpl) {
      if (tplFilter !== 'all' && tpl.cat !== tplFilter) return;
      const look = TPL_LOOK[tpl.id] || ['sparkles', 'indigo'];
      const card = U.el('div', { class: 'card tpl-card' },
        U.el('div', { class: 'tpl-head' },
          U.el('span', { class: 'tile-ico tint-' + look[1] }, U.icon(look[0], { size: 22 })),
          U.el('div', { class: 'tpl-titles' },
            U.el('div', { class: 'tpl-name', text: tpl.name }),
            U.el('span', { class: 'badge cat-' + tpl.cat, text: catLabel(tpl.cat) }))),
        U.el('p', { class: 'hint tpl-desc', text: tpl.desc }),
        U.el('button', {
          class: 'btn primary small tpl-use',
          onclick: function () { createFromTemplate(tpl.id); }
        }, U.icon('plus', { size: 16 }), t('tpl_use')));
      list.appendChild(card);
    });
    root.appendChild(list);
  }

  function catLabel(cat) {
    const map = { starter: 'tpl_cat_starter', productivity: 'tpl_cat_productivity', utility: 'tpl_cat_utility', game: 'tpl_cat_game', education: 'tpl_cat_education' };
    return t(map[cat] || cat);
  }

  /* =================================================================== *
   * VIEW: Validate / Export
   * =================================================================== */
  /* Export freshness: if the project changed after the last build (e.g. package name
     * or pending autosave from the editor), mark the export as stale. */
  async function ensureFreshXdc(out) {
    const p = CS.projects.current;
    if (!p) return null;
    if (CS.editor) await CS.editor.flush();
    const stale = !app.lastBuilt ||
      app.lastBuiltProjectId !== p.id ||
      !app.lastBuiltAt ||
      (p.updatedAt || 0) >= app.lastBuiltAt;
    if (!stale) return app.lastBuilt;
    toast(t('export_rebuilt'), 'warn');
    await buildFlow(out);
    const okFresh = app.lastBuilt && app.lastBuiltProjectId === p.id &&
      (p.updatedAt || 0) < app.lastBuiltAt;
    return okFresh ? app.lastBuilt : null;
  }

  function renderExport(root) {
    root.textContent = '';
    const p = CS.projects.current;
    if (!p) {
      root.appendChild(U.el('div', { class: 'empty-state card' },
        U.el('p', { text: t('export_no_project') }),
        U.el('button', { class: 'btn primary', onclick: function () { showView('projects'); } }, t('open_or_create'))));
      return;
    }

    /* Package settings */
    const settingsCard = U.el('div', { class: 'card' },
      U.el('div', { class: 'card-head' }, U.icon('box', { size: 16 }), U.el('span', { text: t('export_settings') })));
    const nameIn = U.el('input', {
      class: 'input', value: p.settings.xdcName || U.sanitizeFileName(p.name),
      oninput: function () { p.settings.xdcName = this.value; },
      onchange: function () { CS.projects.save(p); }
    });
    const urlIn = U.el('input', {
      class: 'input', value: p.settings.sourceCodeUrl || '',
      placeholder: 'https://… (' + t('optional') + ')',
      oninput: function () { p.settings.sourceCodeUrl = this.value; },
      onchange: function () { CS.projects.save(p); }
    });
    settingsCard.appendChild(U.el('label', { class: 'field-label', text: t('export_xdcname') }));
    settingsCard.appendChild(nameIn);
    settingsCard.appendChild(U.el('p', { class: 'hint', text: t('export_xdcname_hint') }));
    settingsCard.appendChild(U.el('label', { class: 'field-label', text: t('export_sourceurl') }));
    settingsCard.appendChild(urlIn);
    root.appendChild(settingsCard);

    /* Resumen */
    const files = CS.projects.fileList(p);
    const summary = U.el('div', { class: 'card' },
      U.el('div', { class: 'card-head' }, U.icon('file', { size: 16 }), U.el('span', { text: t('export_files') })),
      U.el('p', { class: 'hint', text: files.length + ' ' + t('files_word') + ' · ' + U.formatBytes(CS.projects.totalSize(p)) }),
      U.el('p', { class: 'hint mono', text: files.slice(0, 8).join('\n') + (files.length > 8 ? '\n…' : '') }));
    root.appendChild(summary);

    /* Validation */
    const valCard = U.el('div', { class: 'card' },
      U.el('div', { class: 'card-head' },
        U.icon('check', { size: 16 }), U.el('span', { text: t('validation_title') }),
        U.el('span', { class: 'spacer' }),
        U.el('button', { class: 'btn ghost small', onclick: function () { runValidation(valResults); } }, t('export_validate'))));
    const valResults = U.el('div', { class: 'val-results' });
    valCard.appendChild(valResults);
    valCard.appendChild(U.el('p', { class: 'hint', text: t('validation_note') }));
    root.appendChild(valCard);
    runValidation(valResults);

    /* Build and send */
    const buildCard = U.el('div', { class: 'card' },
      U.el('div', { class: 'card-head' }, U.icon('rocket', { size: 16 }), U.el('span', { text: t('export_build') })));
    const buildBtn = U.el('button', { class: 'btn primary', onclick: function () { buildFlow(buildOut); } }, U.icon('box', { size: 16 }), t('export_build'));
    buildCard.appendChild(buildBtn);
    const buildOut = U.el('div', { class: 'build-out' });
    buildCard.appendChild(buildOut);
    root.appendChild(buildCard);

    /* Nota de entorno */
    if (!CS.exporter.webxdcAvailable()) {
      root.appendChild(U.el('p', { class: 'notice warn', text: t('export_no_webxdc') }));
    } else {
      root.appendChild(U.el('p', { class: 'notice info', text: t('export_sent_note') }));
    }
  }

  function runValidation(container) {
    container.textContent = '';
    const p = CS.projects.current;
    if (!p) return;
    const results = CS.validator.validate(p);
    const counts = CS.validator.counts(results);

    const badges = U.el('div', { class: 'row-gap wrap' });
    [['error', 'sev_error', counts.error], ['warning', 'sev_warning', counts.warning], ['client', 'sev_client', counts.client], ['info', 'sev_info', counts.info]].forEach(function (x) {
      const b = U.el('span', { class: 'badge sev-' + x[0] }, t(x[1]) + ': ' + x[2]);
      badges.appendChild(b);
    });
    container.appendChild(badges);

    if (!results.length) {
      container.appendChild(U.el('p', { class: 'ok-text' }, U.icon('check', { size: 16 }), t('val_clear')));
      return;
    }

    const list = U.el('ul', { class: 'val-list' });
    results.forEach(function (r) {
      const li = U.el('li', { class: 'val-item sev-' + r.severity });
      li.appendChild(U.el('span', { class: 'val-sev' }, U.icon(sevIcon(r.severity), { size: 14 })));
      li.appendChild(U.el('span', { class: 'val-layer', text: t('layer_' + r.layer) }));
      li.appendChild(U.el('span', { class: 'val-msg', text: t(r.key, r.params) }));
      list.appendChild(li);
    });
    container.appendChild(list);
  }

  function sevIcon(sev) {
    if (sev === 'error') return 'close';
    if (sev === 'warning') return 'warn';
    if (sev === 'client') return 'phone';
    return 'info';
  }

  async function buildFlow(out) {
    const p = CS.projects.current;
    if (!p) return;
    out.textContent = '';
    out.appendChild(U.el('p', { class: 'hint' }, U.icon('wait', { size: 16 }), t('export_building')));

    /* Validate before building */
    const results = CS.validator.validate(p);
    const counts = CS.validator.counts(results);
    if (counts.error > 0) {
      out.textContent = '';
      out.appendChild(U.el('p', { class: 'notice err' }, U.icon('close', { size: 16 }), t('export_blocked_errors', { n: counts.error })));
      const ul = U.el('ul', { class: 'val-list' });
      results.filter(function (r) { return r.severity === 'error'; }).forEach(function (r) {
        ul.appendChild(U.el('li', { class: 'val-item sev-error' }, t(r.key, r.params)));
      });
      out.appendChild(ul);
      return;
    }

    try {
      const xdc = await CS.exporter.buildXdc(p);
      app.lastBuilt = xdc;
      app.lastBuiltAt = Date.now() + 1; /* +1 ms: wins over any save in the same instant */
      app.lastBuiltProjectId = p.id;
      out.textContent = '';
      const info = U.el('div', { class: 'build-info' });
      info.appendChild(U.el('p', {},
        U.el('b', { text: xdc.name }),
        U.el('span', { text: ' · ' + U.formatBytes(xdc.size) })));
      info.appendChild(U.el('p', { class: 'hint', text: t('export_method') + ': ' + (xdc.method === 'deflate' ? 'Deflate (CompressionStream)' : 'Store') + ' · ' + xdc.entries.length + ' ' + t('files_word') }));
      info.appendChild(U.el('p', { class: 'hint ' + (xdc.verify.ok ? 'ok-text' : 'err-text') },
        U.icon(xdc.verify.ok ? 'check' : 'close', { size: 14 }),
        xdc.verify.ok ? t('export_verify_ok', { n: xdc.verify.files }) : (t('export_verify_fail') + ' (' + xdc.verify.detail + ')')));
      if (xdc.sha256) info.appendChild(U.el('p', { class: 'hint mono break', text: 'sha256: ' + xdc.sha256.slice(0, 32) + '…' }));
      out.appendChild(info);

      const actions = U.el('div', { class: 'row-gap wrap' });
      if (CS.exporter.webxdcAvailable()) {
        actions.appendChild(U.el('button', {
          class: 'btn primary',
          onclick: function () {
            ensureFreshXdc(out).then(function (fresh) {
              if (!fresh) return;
              CS.exporter.shareToChat(fresh).then(function (r) {
                if (r.via === 'sendToChat') toast(t('export_shared'));
                else if (r.via === 'error') toast(t('export_share_error') + ': ' + (r.error && r.error.message || ''), 'error');
              });
            });
          }
        }, U.icon('upload', { size: 16 }), t('export_share_chat')));
      }
      actions.appendChild(U.el('button', {
        class: 'btn' + (CS.exporter.webxdcAvailable() ? ' ghost' : ' primary'),
        onclick: function () {
          ensureFreshXdc(out).then(function (fresh) {
            if (!fresh) return;
            CS.exporter.download(fresh);
            toast(t('export_downloaded'));
          });
        }
      }, U.icon('download', { size: 16 }), t('export_download')));
      out.appendChild(actions);
      out.appendChild(U.el('p', { class: 'hint', text: t('export_after_share') }));
    } catch (e) {
      out.textContent = '';
      out.appendChild(U.el('p', { class: 'notice err' }, U.icon('close', { size: 16 }), t('export_failed') + ': ' + (e && e.message || e)));
    }
  }

  /* =================================================================== *
 * * Almacenamiento: borrado granular + respaldo ()
   * =================================================================== */
  function wipeSettingsOnly(silent) {
    try { localStorage.removeItem('wcs_settings'); } catch (e) { /* ignore */ }
    settings._data = Object.assign({}, settingsDefaults);
    try { localStorage.setItem('wcs_settings', JSON.stringify(settings._data)); } catch (e) { /* ignore */ }
    applyChrome();
    if (!silent) {
      toast(t('settings_wiped_ok'));
      showView('settings', { noHistory: true });
    }
  }

  /* Build the backup object (settings + projects). Testable. */
  async function buildBackup() {
    const projects = await CS.store.list();
    return {
      app: 'wcs',
      kind: 'wcs-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      appVersion: VERSION,
      settings: JSON.parse(JSON.stringify(settings._data)),
      projects: projects
    };
  }

  function backupExport() {
    buildBackup().then(function (data) {
      const json = JSON.stringify(data);
      const name = 'wcs-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      sheet({
        title: t('backup_export'),
        items: [
          {
            icon: 'chat',
            label: t('backup_send_chat'),
            fn: function () {
              if (CS.exporter.webxdcAvailable() && window.webxdc.sendToChat) {
                const msg = { file: { name: name, blob: new Blob([json], { type: 'application/json' }) } };
                if (settings.get('exportCredit')) msg.text = 'Webxdc Creator Studio — ' + t('backup_export');
                window.webxdc.sendToChat(msg);
                toast(t('export_shared'));
              } else {
                downloadBlob(name, json, 'application/json');
              }
            }
          },
          {
            icon: 'download',
            label: t('export_download'),
            fn: function () { downloadBlob(name, json, 'application/json'); }
          }
        ]
      });
    }).catch(function (e) {
      toast(t('err_generic') + ': ' + (e && e.message || e), 'error');
    });
  }

  function downloadBlob(name, content, mime) {
    try {
      const blob = new Blob([content], { type: mime || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 500);
      toast(t('export_downloaded'));
    } catch (e) {
      toast(t('err_generic') + ': ' + (e && e.message || e), 'error');
    }
  }

  /* Restaura un respaldo previamente validado. Testeable. */
  async function restoreBackup(data) {
    if (!data || data.kind !== 'wcs-backup' || data.app !== 'wcs' || !Array.isArray(data.projects)) {
      throw new Error('invalid');
    }
    /* settings */
    if (data.settings && typeof data.settings === 'object') {
      const clean = {};
      Object.keys(settingsDefaults).forEach(function (k) {
        if (data.settings[k] !== undefined) clean[k] = data.settings[k];
      });
      settings._data = Object.assign({}, settingsDefaults, clean);
      try { localStorage.setItem('wcs_settings', JSON.stringify(settings._data)); } catch (e) { /* ignore */ }
      applyChrome();
    }
    /* projects (same id → replace; new → append) */
    let imported = 0;
    for (const prj of data.projects) {
      if (!prj || typeof prj.id !== 'string' || !prj.files || typeof prj.files !== 'object') continue;
      try {
        await CS.store.put(prj);
        imported++;
      } catch (e) { /* corrupt project: skip */ }
    }
    CS.projects.current = null;
    CS.preview._reset();
    renderDrawer();
    return { imported: imported, settingsRestored: !!data.settings };
  }

  function backupImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = function () {
      const file = input.files && input.files[0];
      if (!file) return;
      if (file.size > 16 * 1024 * 1024) { toast(t('import_too_big'), 'error'); return; }
      const reader = new FileReader();
      reader.onload = function () {
        let data;
        try { data = JSON.parse(String(reader.result || '')); }
        catch (e) { toast(t('backup_invalid'), 'error'); return; }
        confirm({
          title: t('backup_restore'),
          message: t('backup_restore_confirm', {
            n: Array.isArray(data.projects) ? data.projects.length : 0,
            date: data.exportedAt ? String(data.exportedAt).slice(0, 10) : '?'
          }),
          okLabel: t('backup_restore')
        }).then(function (yes) {
          if (!yes) return;
          restoreBackup(data).then(function (r) {
            toast(t('backup_restored_ok', { n: r.imported }));
            showView('projects', { noHistory: true });
          }).catch(function () {
            toast(t('backup_invalid'), 'error');
          });
        });
      };
      reader.onerror = function () { toast(t('err_read_file'), 'error'); };
      reader.readAsText(file);
    };
    input.click();
  }

  /* =================================================================== *
   * VIEW: Help
   * =================================================================== */
  const HELP_SECTIONS = [
    { id: 'quickstart', icon: 'rocket' },
    { id: 'templates', icon: 'puzzle' },
    { id: 'preview', icon: 'play' },
    { id: 'xdc', icon: 'box' },
    { id: 'editor', icon: 'code' },
    { id: 'blocks', icon: 'blocks' },
    { id: 'export', icon: 'upload' },
    { id: 'api', icon: 'bolt' },
    { id: 'course', icon: 'book' },
    { id: 'mobile', icon: 'phone' },
    { id: 'limits', icon: 'warn' }
  ];

  function renderHelp(root) {
    root.textContent = '';
    HELP_SECTIONS.forEach(function (sec, i) {
      const body = U.el('div', { class: 'help-body', html: t('help_' + sec.id + '_body') });
      if (sec.id === 'course' && CS.course && CS.course.renderBody) {
        body.textContent = '';
        body.appendChild(CS.course.renderBody());
      }
      const card = U.el('details', { class: 'card help-sec', open: i === 0 },
        U.el('summary', {}, U.icon(sec.icon, { size: 18 }), U.el('span', { text: t('help_' + sec.id + '_title') })),
        body);
      root.appendChild(card);
    });
    root.appendChild(U.el('p', { class: 'hint', text: t('help_footer') }));
  }

  /* =================================================================== *
   * VIEW: Settings
   * =================================================================== */
  function renderSettings(root) {
    root.textContent = '';

    /* Tema */
    root.appendChild(segCard('palette', t('set_theme'), [
      ['auto', t('set_theme_auto')], ['light', t('set_theme_light')], ['dark', t('set_theme_dark')]
    ], settings.get('theme'), function (v) { settings.set('theme', v); }));

    /* Language (Auto, English, Español) */
    const langCard = U.el('div', { class: 'card' },
      U.el('div', { class: 'card-head' }, U.icon('globe', { size: 16 }), U.el('span', { text: t('set_lang') })));
    const langGrid = U.el('div', { class: 'lang-grid', role: 'group', 'aria-label': t('set_lang') });
    const langOpts = [['auto', t('set_lang_auto')]];
    (CS.i18n.langs ? CS.i18n.langs() : [{ id: 'es', native: 'Español' }, { id: 'en', native: 'English' }]).forEach(function (l) {
      langOpts.push([l.id, l.native]);
    });
    langOpts.forEach(function (o) {
      langGrid.appendChild(U.el('button', {
        class: 'seg-btn' + (settings.get('lang') === o[0] ? ' active' : ''),
        type: 'button',
        onclick: function () {
          settings.set('lang', o[0]);
          CS.i18n.setLang(o[0]);
          showView('settings', { noHistory: true });
        }
      }, o[1]));
    });
    langCard.appendChild(langGrid);
    root.appendChild(langCard);

    /* UI font size */
    root.appendChild(segCard('list', t('set_font'), [
      ['s', t('set_font_s'), t('set_font_s_full')], ['m', t('set_font_m'), t('set_font_m_full')], ['l', t('set_font_l'), t('set_font_l_full')]
    ], settings.get('font'), function (v) { settings.set('font', v); }));

    /* Editor */
    const editorCard = U.el('div', { class: 'card' },
      U.el('div', { class: 'card-head' }, U.icon('code', { size: 16 }), U.el('span', { text: t('set_editor') })));
    const fontRow = U.el('div', { class: 'row-gap wrap' });
    const fontLabel = function () {
      const v = settings.get('editorFont');
      return t('set_editor_font') + ': ' + (v ? v + 'px' : t('set_editor_font_auto') + ' (' + editorFontPx() + 'px)');
    };
    const fontSpan = U.el('span', { class: 'hint', text: fontLabel() });
    fontRow.appendChild(fontSpan);
    fontRow.appendChild(U.el('button', { class: 'btn ghost small', 'aria-label': t('a11y_font_smaller'), title: t('a11y_font_smaller'), onclick: function () { stepEditorFont(-1); fontSpan.textContent = fontLabel(); } }, 'A−'));
    fontRow.appendChild(U.el('button', { class: 'btn ghost small', 'aria-label': t('a11y_font_bigger'), title: t('a11y_font_bigger'), onclick: function () { stepEditorFont(1); fontSpan.textContent = fontLabel(); } }, 'A+'));
    fontRow.appendChild(U.el('button', { class: 'btn ghost small', title: t('set_editor_font_auto'), 'aria-label': t('set_editor_font_auto'), onclick: function () { settings.set('editorFont', null); fontSpan.textContent = fontLabel(); } }, U.icon('refresh', { size: 16 })));
    editorCard.appendChild(fontRow);
    const wrapBtn = U.el('button', {
      class: 'btn small' + (settings.get('editorWrap') ? '' : ' ghost'),
      onclick: function (e) {
        settings.set('editorWrap', !settings.get('editorWrap'));
        e.currentTarget.className = 'btn small' + (settings.get('editorWrap') ? '' : ' ghost');
        e.currentTarget.textContent = '';
        e.currentTarget.appendChild(U.icon('wrap', { size: 16 }));
        e.currentTarget.appendChild(document.createTextNode(t('set_editor_wrap') + ': ' + t(settings.get('editorWrap') ? 'on' : 'off')));
      }
    }, U.icon('wrap', { size: 16 }), t('set_editor_wrap') + ': ' + t(settings.get('editorWrap') ? 'on' : 'off'));
    editorCard.appendChild(wrapBtn);
    root.appendChild(editorCard);

    /* Chat: export credit and presence (both OFF by default). */
    const chatCard = U.el('div', { class: 'card' },
      U.el('div', { class: 'card-head' }, U.icon('chat', { size: 16 }), U.el('span', { text: t('set_chat') })));
    chatCard.appendChild(U.el('p', { class: 'hint', text: t('set_export_credit_desc') }));
    chatCard.appendChild(U.el('button', {
      class: 'btn small' + (settings.get('exportCredit') ? '' : ' ghost'),
      onclick: function (e) {
        settings.set('exportCredit', !settings.get('exportCredit'));
        e.currentTarget.className = 'btn small' + (settings.get('exportCredit') ? '' : ' ghost');
        e.currentTarget.textContent = t('set_export_credit') + ': ' + (settings.get('exportCredit') ? 'ON' : 'OFF');
        CS.app.toast(settings.get('exportCredit') ? t('set_export_credit_on') : t('set_export_credit_off'));
      }
    }, t('set_export_credit') + ': ' + (settings.get('exportCredit') ? 'ON' : 'OFF')));
    chatCard.appendChild(U.el('p', { class: 'hint', text: t('set_collab_auto_desc') }));
    chatCard.appendChild(U.el('button', {
      class: 'btn small' + (settings.get('collabAuto') ? '' : ' ghost'),
      onclick: function (e) {
        const on = !settings.get('collabAuto');
        settings.set('collabAuto', on);
        e.currentTarget.className = 'btn small' + (on ? '' : ' ghost');
        e.currentTarget.textContent = t('set_collab_auto') + ': ' + (on ? 'ON' : 'OFF');
        if (on && CS.collab && CS.capabilities && CS.capabilities.apiStatus('sendUpdate') === 'AVAILABLE') {
          CS.collab.start().catch(function () {});
        } else if (!on && CS.collab && CS.collab.stop) {
          CS.collab.stop();
        }
        CS.app.toast(on ? t('set_collab_auto_on') : t('set_collab_auto_off'));
      }
    }, t('set_collab_auto') + ': ' + (settings.get('collabAuto') ? 'ON' : 'OFF')));
    root.appendChild(chatCard);

    const ideCard = U.el('div', { class: 'card' },
      U.el('div', { class: 'card-head' }, U.icon('code', { size: 16 }), U.el('span', { text: t('set_ide') })));
    ideCard.appendChild(U.el('p', { class: 'hint', text: t('set_monaco_desc') }));
    ideCard.appendChild(U.el('button', {
      class: 'btn small' + (settings.get('preferMonaco') ? '' : ' ghost'),
      onclick: function (e) {
        settings.set('preferMonaco', !settings.get('preferMonaco'));
        e.currentTarget.className = 'btn small' + (settings.get('preferMonaco') ? '' : ' ghost');
        e.currentTarget.textContent = t('set_monaco') + ': ' + (settings.get('preferMonaco') ? 'ON' : 'OFF');
      }
    }, t('set_monaco') + ': ' + (settings.get('preferMonaco') ? 'ON' : 'OFF')));
    if (CS.monaco) {
      ideCard.appendChild(U.el('p', { class: 'hint', text: t('monaco_status') + ': ' + CS.monaco.strategy + (CS.monaco.lastError ? ' (' + CS.monaco.lastError + ')' : '') }));
    }
    if (CS.monaco && CS.monaco.bundled) root.appendChild(ideCard);

    /* Almacenamiento */
    const storeCard = U.el('div', { class: 'card' },
      U.el('div', { class: 'card-head' }, U.icon('db', { size: 16 }), U.el('span', { text: t('set_storage') })));
    const storeInfo = U.el('p', { class: 'hint', text: '…' });
    storeCard.appendChild(storeInfo);
    CS.store.estimate().then(function (est) {
      storeInfo.textContent = t('storage_' + est.mode) + ' · ' + est.count + ' ' + t('projects_word') + ' · ' + U.formatBytes(est.bytes) +
        (est.quota ? ' / ' + U.formatBytes(est.quota) : '');
    }).catch(function () { storeInfo.textContent = '…'; });   
    storeCard.appendChild(U.el('p', { class: 'hint', text: t('set_storage_hint') }));

    /* Respaldo () */
    const backupRow = U.el('div', { class: 'row-gap wrap' });
    backupRow.appendChild(U.el('button', {
      class: 'btn small',
      onclick: function () { backupExport(); }
    }, U.icon('upload', { size: 16 }), t('backup_export')));
    backupRow.appendChild(U.el('button', {
      class: 'btn ghost small',
      onclick: function () { backupImport(); }
    }, U.icon('download', { size: 16 }), t('backup_restore')));
    storeCard.appendChild(backupRow);

    /* Granular wipe — compact vertical list with visual hierarchy
     * (amber = partial, neutral = settings, red = full) and clear button separation. */
    const wipeList = U.el('div', { class: 'wipe-list' });
    wipeList.appendChild(U.el('button', {
      class: 'btn warn small',
      onclick: function () {
        confirm({
          title: t('set_wipe_projects'),
          message: t('set_wipe_projects_confirm'),
          danger: true,
          okLabel: t('delete')
        }).then(function (yes) {
          if (!yes) return;
          CS.store.wipe().then(function () {   /* projects only: settings untouched */
            CS.projects.current = null;
            CS.preview._reset();
            renderDrawer();
            toast(t('projects_wiped_ok'));
            showView('settings', { noHistory: true });
          });
        });
      }
    }, U.icon('folder', { size: 16 }), t('set_wipe_projects')));
    wipeList.appendChild(U.el('button', {
      class: 'btn ghost small',
      onclick: function () {
        confirm({
          title: t('set_wipe_settings'),
          message: t('set_wipe_settings_confirm'),
          danger: true,
          okLabel: t('delete')
        }).then(function (yes) {
          if (!yes) return;
          wipeSettingsOnly();   /* settings back to defaults; projects untouched */
        });
      }
    }, U.icon('gear', { size: 16 }), t('set_wipe_settings')));
    wipeList.appendChild(U.el('div', { class: 'wipe-sep' }));
    wipeList.appendChild(U.el('button', {
      class: 'btn danger small',
      onclick: function () {
        confirm({
          title: t('set_wipe'),
          message: t('set_wipe_confirm'),
          danger: true,
          okLabel: t('delete')
        }).then(function (yes) {
          if (!yes) return;
          CS.store.wipe().then(function () {
            wipeSettingsOnly(true);
            CS.projects.current = null;
            CS.preview._reset();
            renderDrawer();
            toast(t('wiped_ok'));
            showView('home');
          });
        });
      }
    }, U.icon('trash', { size: 16 }), t('set_wipe')));
    storeCard.appendChild(wipeList);
    root.appendChild(storeCard);

    /* Acerca de */
    root.appendChild(U.el('div', { class: 'card' },
      U.el('div', { class: 'card-head' }, U.icon('info', { size: 16 }), U.el('span', { text: t('set_about') })),
      U.el('p', { class: 'hint', text: APP_TITLE + ' v' + VERSION }),
      U.el('p', { class: 'hint', text: t('about_note') }),
      U.el('p', { class: 'hint', text: t('storage_' + app.storageMode) + ' · webxdc: ' + (CS.exporter.webxdcAvailable() ? t('env_webxdc_yes') : t('env_webxdc_no')) })));
  }

  function segCard(iconName, title, options, current, onPick) {
    const card = U.el('div', { class: 'card' },
      U.el('div', { class: 'card-head' }, U.icon(iconName, { size: 16 }), U.el('span', { text: title })));
    const seg = U.el('div', { class: 'seg', role: 'group', 'aria-label': title });
    options.forEach(function (o) {
      seg.appendChild(U.el('button', {
        class: 'seg-btn' + (current === o[0] ? ' active' : ''),
        'aria-label': o[2] || (title + ': ' + o[1]),
        onclick: function () { onPick(o[0]); }
      }, o[1]));
    });
    card.appendChild(seg);
    return card;
  }

  function stepEditorFont(dir) {
    settings.set('editorFont', U.clamp(editorFontPx() + dir, 10, 24));
    showView('settings', { noHistory: true });
  }

  /* =================================================================== *
   * Init
   * =================================================================== */
  function dismissSplash() {
    const el = document.getElementById('cs-splash');
    if (!el || el.classList.contains('out')) return;
    const sub = document.getElementById('cs-splash-sub');
    if (sub) {
      try { sub.textContent = (CS.i18n && CS.i18n.t) ? CS.i18n.t('splash_ready') : 'Listo'; } catch (e) { sub.textContent = 'Listo'; }
    }
    el.classList.add('out');
    setTimeout(function () { try { el.remove(); } catch (e2) { /* ignore */ } }, 500);
  }

  async function init() {
    settings.load();
    CS.i18n.init(settings.get('lang'));
    applyChrome();

    /* Storage: IndexedDB with timeout, retries and a localStorage mirror.
     * After a gesture that restarts the WebView, projects come back on their own. */
    app.storageMode = 'loading';
    updateHeaderIndicators();
    function onStoreReady(m) {
      app.storageMode = m || CS.store.mode;
      updateHeaderIndicators();
      try {
        if (app.view === 'projects' || app.view === 'home') {
          showView(app.view, { noHistory: true });
        }
      } catch (e) { /* ignore */ }
    }
    CS.store.onReady(onStoreReady);
    /* Re-assert loading: onReady fires synchronously if the store was ready
     * (re-init in tests / WebView). init().then sets the real mode. */
    app.storageMode = 'loading';
    updateHeaderIndicators();
    CS.store.init().then(function (m) {
      onStoreReady(m);
    }).catch(function () {
      app.storageMode = 'memory';
      updateHeaderIndicators();
    });

    if (CS.capabilities) CS.capabilities.detect();
    if (CS.snapshots) {
      CS.snapshots.init().then(function () { CS.snapshots.startAutosave(); }).catch(function () {});
    }
    if (CS.collab && settings.get('collabAuto') && CS.capabilities && CS.capabilities.apiStatus('sendUpdate') === 'AVAILABLE') {
      CS.collab.start().catch(function () {});
    }

    /* shell events */
    const btnBack = document.getElementById('btn-back');
    U.setIcon(btnBack, 'back', { size: 22 });
    btnBack.setAttribute('aria-label', t('back'));
    if (!btnBack.dataset.bound) {
      btnBack.dataset.bound = '1';
      btnBack.addEventListener('click', function () { showView('projects'); });
    }
    /* On touch screens the bottom bar hides while the keyboard is up. */
    if (!document.body.dataset.kbBound) {
      document.body.dataset.kbBound = '1';
      const typing = function (el) {
        return !!el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !/^(button|checkbox|radio|range|color|file|submit)$/.test(el.type)) || el.isContentEditable);
      };
      document.addEventListener('focusin', function (e) { if (isMobile() && typing(e.target)) document.body.classList.add('kb-open'); });
      document.addEventListener('focusout', function () {
        setTimeout(function () { if (!typing(document.activeElement)) document.body.classList.remove('kb-open'); }, 80);
      });
    }
    /* (the legacy popstate redirect to home was removed; see the fixed screen at the end of init) */

    /* save when hidden; wake IndexedDB when visible again if needed */
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') {
        if (CS.editor) CS.editor.flush();
        if (CS.projects.current) CS.projects.save(CS.projects.current).catch(function () {});
      } else {
        if (!document.querySelector('.view.active')) {
          try { showView(app.view || 'home', { noHistory: true }); } catch (err) {}
        }
        /* retry IndexedDB quietly after a gesture or system event */
        if (CS.store && typeof CS.store.recover === 'function') {
          CS.store.recover().then(function (m) {
            if (m) onStoreReady(m);
          }).catch(function () { /* ignore */ });
        }
      }
    });

    renderNav();
    const startView = (function () {
      try {
        const hash = (location.hash || '').replace('#', '');
        return VIEWS.some(function (v) { return v.id === hash; }) ? hash : 'home';
      } catch (e) { return 'home'; }
    })();
    showView(startView, { noHistory: true });
    /* Minimum splash visibility so the animation is noticeable (~0.7s) */
    setTimeout(dismissSplash, 700);

    /* Fixed screen (bug reported on mobile).
     * The system back gesture is owned by the messenger/OS; Studio does not override it. */
    try {
      history.pushState({ wcsGuard: true }, '', location.href);
      window.addEventListener('popstate', function () {
        try {
          const id = VIEWS.some(function (v) { return v.id === app.view; }) ? app.view : 'home';
          history.pushState({ wcsGuard: true, view: id }, '', '#' + id);
        } catch (e) { /* iframe sandbox */ }
      });
    } catch (e) { /* ignore */ }
    /* If the messenger restores a cached page copy (bfcache),
     * repaint the active view instead of leaving a blank shell. */
    try {
      window.addEventListener('pageshow', function (ev) {
        if (ev && ev.persisted && app.view) {
          try { showView(app.view, { noHistory: true }); } catch (e) {}
        } else if (!document.querySelector('.view.active')) {
          try { showView(app.view || 'home', { noHistory: true }); } catch (e) {}
        }
      });
    } catch (e) { /* ignore */ }
  }

  /* ---------- Module exports ---------- */
  CS.settings = settings;
  CS.app = {
    init, showView, toast, modal, confirm, prompt, sheet,
    renderDrawer, renderProjectBar, openProject, createFromTemplate,
    isMobile, editorFontPx, downloadBlob,
    buildBackup, restoreBackup,
    get version() { return VERSION; },
    get view() { return app.view; },
    get storageMode() { return app.storageMode; },
    get STUCK_MS() { return app.STUCK_MS; },
    set STUCK_MS(v) { app.STUCK_MS = v; }   /* tests shorten it */
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = CS.app; }
})();
