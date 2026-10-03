/* Code tab: file chips, the editor, and the keyboard bar (suggestions + symbols) for phones. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, ui } = CS;
  const t = (...a) => CS.t(...a);
  const S = CS.settings;

  const SYMBOLS = {
    html: ['<', '>', '/', '=', '"', "'", '!', '-', ':', ';', '#', '.', '{', '}', '(', ')', '&'],
    css: ['{', '}', ':', ';', '#', '.', '-', '%', 'px', '(', ')', ',', '"', '!', '>', '*', '@'],
    js: ['(', ')', '{', '}', '[', ']', ';', '=', '.', "'", '"', '`', '=>', '+', '-', '*', '/', '<', '>', '!', '&', '|', '?', ':', ',', '$', '_'],
    json: ['{', '}', '[', ']', '"', ':', ','],
    text: ['.', ',', '-', '_', '"', "'", '(', ')', '#']
  };
  const PAIRS = { '(': ')', '{': '}', '[': ']', '"': '"', "'": "'", '`': '`' };

  const isTouch = () => document.documentElement.classList.contains('touch');
  const keep = (fn) => ({ onpointerdown: (e) => { e.preventDefault(); }, onclick: (e) => { e.preventDefault(); CS.haptic(); fn(); } });

  function mount(host, api) {
    const p = api.project;
    const wsState = p.workspace;
    let editor = null;
    let saveTimer = null;
    let pendingPath = null;

    const chips = h('div', { class: 'file-chips', role: 'tablist' });
    const editorHost = h('div', { class: 'code-host' });
    const status = h('div', { class: 'code-status' });
    const sugRow = h('div', { class: 'kb-sug' });
    const sugInfo = h('div', { class: 'kb-info' });
    const symRow = h('div', { class: 'kb-sym' });
    const bar = h('div', { class: 'kb-bar' },
      h('div', { class: 'kb-sug-wrap' }, sugRow, sugInfo),
      h('div', { class: 'kb-keys' },
        h('button', Object.assign({ type: 'button', class: 'kb-key kb-wide', 'aria-label': t('ed_tab') }, keep(() => editor.indent())), CS.icon('indent')),
        h('button', Object.assign({ type: 'button', class: 'kb-key', 'aria-label': t('ed_left') }, keep(() => editor.moveCursor(-1))), CS.icon('chevronLeft')),
        h('button', Object.assign({ type: 'button', class: 'kb-key', 'aria-label': t('ed_right') }, keep(() => editor.moveCursor(1))), CS.icon('chevronRight')),
        symRow,
        h('button', Object.assign({ type: 'button', class: 'kb-key kb-explain', 'aria-label': t('ed_explain') }, keep(explain)), CS.icon('bulb')),
        h('button', { type: 'button', class: 'kb-key', 'aria-label': t('ed_hide_kb'), onclick: () => editor.blur() }, CS.icon('keyboardDown'))));
    const empty = h('div', { class: 'code-empty' });

    CS.mount(host, h('div', { class: 'code' },
      h('div', { class: 'code-top' }, chips,
        ui.iconButton('files', t('ed_switch_file'), switcher, { class: 'code-top-btn' }),
        ui.iconButton('plus', t('ed_new_file'), () => CS.wsFiles && CS.wsFiles.newFile(api), { class: 'code-top-btn' })),
      editorHost, empty, status, bar));

    /* ---------- Files ---------- */
    const textPaths = () => CS.projects.paths(p).filter((x) => p.files[x].kind === 'text');
    function openList() {
      const list = (wsState.openFiles || []).filter((x) => p.files[x] && p.files[x].kind === 'text');
      if (wsState.file && p.files[wsState.file] && !list.includes(wsState.file)) list.unshift(wsState.file);
      if (!list.length) {
        const first = ['index.html', 'app.js', 'style.css'].filter((x) => p.files[x]).concat(textPaths()).filter((x, i, a) => a.indexOf(x) === i);
        list.push(...first.slice(0, 3));
      }
      wsState.openFiles = list.slice(0, 12);
      return wsState.openFiles;
    }

    function renderChips() {
      const list = openList();
      CS.mount(chips, list.map((path) => h('button', {
        type: 'button', role: 'tab', class: ['file-chip', path === (editor && editor.path) && 'on'], title: path,
        onclick: () => open(path),
        oncontextmenu: (e) => { e.preventDefault(); closeFile(path); }
      }, CS.icon(fileIcon(path)), h('span', {}, CS.util.basename(path)),
      list.length > 1 ? h('span', { class: 'file-chip-x', role: 'button', 'aria-label': t('close'), onclick: (e) => { e.stopPropagation(); closeFile(path); } }, CS.icon('x')) : null)));
      const on = chips.querySelector('.on');
      if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    function fileIcon(path) {
      const lang = CS.editor.langOf(path);
      return lang === 'html' ? 'fileHtml' : lang === 'css' ? 'fileCss' : lang === 'js' ? 'fileJs' : 'file';
    }

    function open(path, opts) {
      if (!p.files[path]) return;
      if (p.files[path].kind !== 'text') { CS.wsFiles && CS.wsFiles.preview(api, path); return; }
      flushSave();
      ensureEditor();
      if (!editor) return;
      if (editor.path !== path) editor.setFile(path, p.files[path].content);
      wsState.file = path;
      if (!wsState.openFiles.includes(path)) wsState.openFiles.unshift(path);
      CS.projects.touch('workspace');
      renderChips();
      empty.hidden = true;
      editorHost.hidden = false;
      if (opts && opts.line) setTimeout(() => editor.gotoLine(opts.line), 30);
      updateStatus();
    }

    function closeFile(path) {
      wsState.openFiles = wsState.openFiles.filter((x) => x !== path);
      if (editor && editor.path === path) {
        const next = openList()[0];
        if (next) open(next); else showEmpty();
      }
      renderChips();
      CS.projects.touch('workspace');
    }

    function showEmpty() {
      editorHost.hidden = true;
      empty.hidden = false;
      CS.mount(empty, ui.empty({ icon: 'file', title: t('ed_no_file'), body: t('ed_no_file_body'),
        action: ui.button({ label: t('ed_new_file'), icon: 'plus', onClick: () => CS.wsFiles && CS.wsFiles.newFile(api) }) }));
    }

    function switcher() {
      const paths = textPaths();
      const sheet = ui.menu({ title: t('ed_switch_file'), subtitle: t('n_files', { n: paths.length }), items: paths.map((path) => ({
        icon: fileIcon(path), label: path, onClick: () => open(path)
      })).concat(['-', { icon: 'folder', label: t('ws_files'), onClick: () => api.select('files') }]) });
      return sheet;
    }

    /* ---------- Saving ---------- */
    function flushSave() {
      if (!saveTimer || !editor) return;
      clearTimeout(saveTimer);
      saveTimer = null;
      write(pendingPath);
    }
    function write(path) {
      if (!path || !p.files[path] || !editor || editor.path !== path) return;
      try { CS.projects.write(path, editor.text(), { project: p }); } catch (error) { ui.toast(CS.common.errorText(error), 'error'); }
    }

    /* ---------- Editor ---------- */
    function ensureEditor() {
      if (editor) return;
      try {
        const engine = S.get('preferMonaco') && CS.monaco && CS.monaco.available() ? CS.monaco : CS.editor;
        editor = engine.create(editorHost, {
          wrap: S.get('editorWrap'), lines: S.get('editorLines'), suggest: S.get('editorSuggest'), fontSize: fontSize()
        });
      } catch (error) {
        CS.mount(editorHost, ui.errorState(t('ed_unavailable')));
        return;
      }
      editor.on('change', ({ path }) => {
        pendingPath = path;
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => { saveTimer = null; write(path); }, 350);
      });
      editor.on('cursor', () => { updateBar(); updateStatus(); });
      editor.on('focus', () => updateBar());
    }

    function fontSize() {
      const fixed = S.get('editorFont');
      if (fixed) return fixed;
      return { s: 13, m: 14, l: 16, xl: 18 }[S.get('font')] || 14;
    }

    function updateStatus() {
      if (!editor) return;
      const c = editor.cursorInfo();
      CS.mount(status, [h('span', {}, editor.path), h('span', { class: 'spacer' }), h('span', {}, t('ed_line_col', { line: c.line, col: c.col })),
        h('span', { class: 'code-lang' }, (c.lang || '').toUpperCase())]);
    }

    let lastLang = null;
    function updateBar() {
      if (!editor) return;
      const show = isTouch() && S.get('symbolBar');
      bar.hidden = !show;
      if (!show) return;
      const lang = editor.cursorInfo().lang || 'text';
      if (lang !== lastLang) {
        lastLang = lang;
        CS.mount(symRow, (SYMBOLS[lang] || SYMBOLS.text).map((sym) => h('button', Object.assign({ type: 'button', class: 'kb-key kb-sym-key' }, keep(() => typeSymbol(sym))), sym)));
      }
      const items = editor.completions().slice(0, 30);
      const selected = editor.selectedCompletion();
      bar.classList.toggle('has-sug', items.length > 0);
      CS.mount(sugRow, items.map((c, i) => h('button', Object.assign({ type: 'button', class: ['kb-chip', i === selected && 'on'] }, keep(() => editor.applyCompletion(i))),
        h('span', { class: 'kb-chip-label' }, c.displayLabel || c.label), c.detail ? h('span', { class: 'kb-chip-detail' }, c.detail) : null)));
      const pick = items[selected] || items[0];
      const text = pick && typeof pick.info === 'string' ? pick.info : '';
      sugInfo.textContent = text;
      sugInfo.hidden = !text;
    }

    function typeSymbol(sym) {
      const close = PAIRS[sym];
      if (close && sym !== close) editor.insert(sym + close, { caret: 1 });
      else editor.insert(sym);
    }

    /* ---------- Explain ---------- */
    function explain() {
      const word = editor ? editor.wordAt() : '';
      const entry = word && CS.dict ? CS.dict.lookup(word, editor.cursorInfo().lang) : null;
      if (!entry) {
        ui.sheet({ title: t('ed_explain'), body: ui.empty({ icon: 'bulb', title: word ? t('ed_explain_unknown', { word }) : t('ed_explain_none'), body: t('ed_explain_tip') }),
          actions: [ui.button({ label: t('ed_open_reference'), icon: 'learn', variant: 'soft', onClick: () => CS.router.go('search', { q: word }) })] });
        return;
      }
      const sheet = ui.sheet({
        title: entry.n, subtitle: t('kind_' + entry.k),
        body: h('div', { class: 'explain' },
          h('p', { class: 'explain-text' }, CS.dict.text(entry)),
          entry.s ? h('div', {}, h('div', { class: 'field-label' }, t('ed_example')), h('pre', { class: 'code-sample' }, entry.s.replace(/\$\{([^}]*)\}/g, '$1'))) : null),
        actions: [
          entry.s ? ui.button({ label: t('ed_insert_example'), icon: 'plus', onClick: () => { sheet.close(); editor.insert(entry.s, { snippet: true }); } }) : null,
          ui.button({ label: t('ed_open_reference'), icon: 'learn', variant: 'soft', onClick: () => { sheet.close(); CS.router.go('search', { q: entry.n }); } })
        ].filter(Boolean)
      });
    }

    /* ---------- More tools ---------- */
    function toolsMenu() {
      ui.menu({ title: t('ed_tools'), items: [
        { icon: 'search', label: t('ed_find'), onClick: () => editor && editor.openSearch() },
        { icon: 'hash', label: t('ed_goto_line'), onClick: async () => {
          const n = await ui.prompt({ title: t('ed_goto_line'), label: t('ed_line'), value: '', okLabel: t('ok'), inputmode: 'numeric' });
          if (n && editor) editor.gotoLine(parseInt(n, 10) || 1);
        } },
        { icon: 'comment', label: t('ed_comment'), onClick: () => editor && editor.comment() },
        { icon: 'blocks', label: t('ed_insert'), onClick: () => CS.components && CS.components.pick(editor, p) },
        { icon: 'bulb', label: t('ed_explain'), onClick: explain },
        '-',
        { icon: 'wrap', label: t('set_wrap'), trailing: ui.toggle(S.get('editorWrap'), (v) => S.set('editorWrap', v)) },
        { icon: 'fontSize', label: t('set_editor_font'), onClick: () => CS.router.go('settings') }
      ] });
    }

    const offs = [
      CS.bus.on('settings', ({ key }) => {
        if (!editor) return;
        if (['editorWrap', 'editorLines', 'editorSuggest', 'editorFont', 'font', '*'].includes(key)) {
          editor.setOptions({ wrap: S.get('editorWrap'), lines: S.get('editorLines'), suggest: S.get('editorSuggest'), fontSize: fontSize() });
        }
        if (key === 'symbolBar') updateBar();
        if (key === 'preferMonaco') {
          const current = editor.path;
          flushSave();
          editor.destroy();
          editor = null;
          editorHost.textContent = '';
          if (current && p.files[current]) open(current);
        }
      }),
      CS.bus.on('file-changed', (e) => {
        if (!e || e.project !== p || !e.path || !editor) return;
        if (e.removed) { editor.forget(e.path); if (wsState.openFiles.includes(e.path)) closeFile(e.path); return; }
        if (e.from) { editor.rename(e.from, e.path); wsState.openFiles = wsState.openFiles.map((x) => (x === e.from ? e.path : x)); if (wsState.file === e.from) wsState.file = e.path; renderChips(); updateStatus(); return; }
        const f = p.files[e.path];
        if (editor.path !== e.path) { editor.forget(e.path); return; }
        if (f && f.kind === 'text' && editor.text() !== f.content) editor.replaceText(f.content);
      }),
      CS.bus.on('keyboard', () => updateBar())
    ];

    return {
      onShow(extra) {
        const target = (extra && extra.path) || wsState.file || openList()[0];
        if (target && p.files[target]) open(target, extra);
        else showEmpty();
      },
      onHide() { flushSave(); if (editor) editor.blur(); },
      actions: () => [
        ui.iconButton('undo', t('ed_undo'), () => editor && editor.undo()),
        ui.iconButton('redo', t('ed_redo'), () => editor && editor.redo()),
        ui.iconButton('tools', t('ed_tools'), toolsMenu)
      ],
      unmount() { flushSave(); offs.forEach((off) => off()); if (editor) editor.destroy(); editor = null; },
      get editor() { return editor; }
    };
  }

  CS.ws.tab({ id: 'code', icon: 'code', label: 'ws_code', order: 20, mount });
})();
