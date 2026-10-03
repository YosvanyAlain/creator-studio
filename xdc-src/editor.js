/* =========================================================================
 * Webxdc Creator Studio — editor.js
 * Code view: file manager with folders + CodeMirror 6 editor (Monaco optional).
 * Each file keeps its own editor state (undo history, cursor, scroll).
 * File operations (add, delete, rename, move, folders) have their own undo stack.
 * ========================================================================= */
'use strict';
(function () {
  const CS = (globalThis.CS = globalThis.CS || {});
  const U = CS.util;
  const CM = globalThis.CM6 || null;

  const AUTOSAVE_MS = 800;
  const HIST_MAX = 100;

  const state = {
    path: null,            /* selected file (text or binary) */
    openByProject: {},     /* projectId -> last open file */
    dirty: false,
    hist: {},              /* projectId -> file operations (undo) */
    redo: {},              /* projectId -> file operations (redo) */
    docs: new Map(),       /* 'projectId::path' -> CodeMirror EditorState */
    collapsed: {},         /* 'projectId::folder' -> true when folded in the tree */
    fs: false,             /* fullscreen editor */
    filesOpen: false       /* file panel visible on narrow screens */
  };

  let els = {};
  let view = null;         /* CodeMirror EditorView */
  let monacoRec = null;    /* Monaco instance when enabled */
  let compartments = null;
  /* One timeline for text edits and file operations: ↶ undoes whichever is newer. */
  let seq = 0;
  const textSeq = {};      /* doc key → seq of its latest typed change */
  let lastUndoKind = null; /* 'text' | 'files': what ↷ should redo first */

  function t(key, params) { return CS.i18n.t(key, params); }
  function project() { return CS.projects.current; }
  function toast(msg, kind, opts) { if (CS.app && CS.app.toast) CS.app.toast(msg, kind, opts); }
  function docKey(p, path) { return p.id + '::' + path; }
  function isNarrow() { return window.innerWidth < 900; }
  function isGeneratedFile(p, path) {
    return !!(p && p.blocks && p.blocks.model && p.blocks.generatedFile === path);
  }
  function settingsGet(key, fallback) {
    try { const v = CS.settings.get(key); return v === undefined || v === null ? fallback : v; } catch (e) { return fallback; }
  }

  /* ---------------- Content access ---------------- */
  function currentText() {
    if (monacoRec && els.monacoArea) return els.monacoArea.value;
    if (view) return view.state.doc.toString();
    if (els.plain) return els.plain.value;
    return null;
  }

  function setCurrentText(text) {
    if (monacoRec && monacoRec.editor) {
      try { monacoRec.editor.setValue(text); } catch (e) { /* ignore */ }
      if (els.monacoArea) els.monacoArea.value = text;
      return;
    }
    if (view) view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
    else if (els.plain) els.plain.value = text;
  }

  /* ---------------- Saving ---------------- */
  /* The file the mounted editor belongs to. Saving always targets it, even if
   * state.path or the open project already moved on (delete, undo, switch). */
  function docTarget() {
    const p = els.docProject, path = els.docPath;
    if (!p || !path || !p.files[path] || p.files[path].kind !== 'text') return null;
    return { p: p, path: path, f: p.files[path] };
  }

  function doSave() {
    const target = docTarget();
    if (!target) return Promise.resolve();
    const content = currentText();
    if (content == null) return Promise.resolve();
    const p = target.p, f = target.f, path = target.path;
    if (f.content === content && !state.dirty) { setSaveState('saved'); return Promise.resolve(); }
    f.content = content;
    state.dirty = false;
    setSaveState('saving');
    return CS.projects.save(p).then(function () {
      setSaveState('saved');
      if (isGeneratedFile(p, path)) CS.projects.markHandEdited(p, path);
      updateStatus();
      if (CS.preview && CS.preview.onProjectChanged) CS.preview.onProjectChanged();
    }).catch(function (err) {
      setSaveState('error');
      toast(t('save_failed') + ' (' + ((err && err.message) || err) + ')', 'error');
    });
  }

  const debouncedSave = U.debounce(function () { doSave(); }, AUTOSAVE_MS);

  function flush() {
    debouncedSave.cancel();
    return doSave();
  }

  function markDirty() {
    state.dirty = true;
    setSaveState('dirty');
    debouncedSave();
  }

  function setSaveState(s) {
    if (!els.saveState) return;
    const map = {
      saved: { cls: 'ok', key: 'st_saved' },
      saving: { cls: 'busy', key: 'st_saving' },
      dirty: { cls: 'dirty', key: 'st_dirty' },
      error: { cls: 'err', key: 'st_error' }
    };
    const m = map[s] || map.saved;
    els.saveState.className = 'save-state ' + m.cls;
    els.saveState.title = t(m.key);
    els.saveStateText.textContent = t(m.key);
  }

  /* ---------------- CodeMirror setup ---------------- */
  function languageFor(path) {
    if (!CM) return [];
    const e = U.extname(path);
    if (e === 'html' || e === 'htm' || e === 'svg' || e === 'xml') return CM.html({ autoCloseTags: true });
    if (e === 'css') return CM.css();
    if (e === 'js' || e === 'mjs' || e === 'cjs') return CM.javascript();
    if (e === 'json' || e === 'webmanifest') return CM.json();
    return [];
  }

  function fontPx() {
    const v = settingsGet('editorFont', 0);
    if (v) return v;
    return CS.app && CS.app.isMobile && CS.app.isMobile() ? 13 : 14;
  }

  function fontTheme() {
    return CM.EditorView.theme({ '&': { fontSize: fontPx() + 'px' } });
  }

  /* Colors come from CSS variables, so light and dark themes follow the app. */
  let highlightStyle = null;
  function hlStyle() {
    if (highlightStyle) return highlightStyle;
    const T = CM.tags;
    highlightStyle = CM.HighlightStyle.define([
      { tag: [T.keyword, T.modifier, T.controlKeyword, T.operatorKeyword], color: 'var(--hl-keyword)', fontWeight: '600' },
      { tag: [T.string, T.special(T.string), T.regexp], color: 'var(--hl-string)' },
      { tag: [T.number, T.bool, T.null, T.atom], color: 'var(--hl-number)' },
      { tag: [T.comment, T.lineComment, T.blockComment], color: 'var(--hl-comment)', fontStyle: 'italic' },
      { tag: [T.tagName, T.angleBracket], color: 'var(--hl-tag)' },
      { tag: [T.attributeName], color: 'var(--hl-attr)' },
      { tag: [T.attributeValue], color: 'var(--hl-string)' },
      { tag: [T.propertyName, T.definition(T.propertyName)], color: 'var(--hl-prop)' },
      { tag: [T.function(T.variableName), T.function(T.propertyName)], color: 'var(--hl-func)' },
      { tag: [T.definition(T.variableName)], color: 'var(--hl-def)' },
      { tag: [T.className, T.typeName], color: 'var(--hl-type)' },
      { tag: [T.unit, T.color], color: 'var(--hl-number)' },
      { tag: [T.operator, T.punctuation, T.bracket], color: 'var(--hl-punct)' },
      { tag: [T.meta, T.documentMeta, T.processingInstruction], color: 'var(--hl-comment)' },
      { tag: T.invalid, color: 'var(--danger)' }
    ]);
    return highlightStyle;
  }

  const baseTheme = CM ? CM.EditorView.theme({
    '&': { height: '100%', backgroundColor: 'var(--code-bg)', color: 'var(--text)' },
    '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', lineHeight: '1.55' },
    '.cm-content': { caretColor: 'var(--accent)', padding: '8px 0' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--accent)', borderLeftWidth: '2px' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': { backgroundColor: 'var(--hl-selection) !important' },
    '.cm-gutters': { backgroundColor: 'var(--code-bg)', color: 'var(--text-dim)', border: 'none', borderRight: '1px solid var(--line)' },
    '.cm-activeLine': { backgroundColor: 'var(--hl-active)' },
    '.cm-activeLineGutter': { backgroundColor: 'var(--hl-active)', color: 'var(--text)' },
    '.cm-matchingBracket': { backgroundColor: 'var(--accent-soft)', outline: '1px solid var(--accent)' },
    '.cm-selectionMatch': { backgroundColor: 'var(--hl-match)' },
    '.cm-searchMatch': { backgroundColor: 'var(--hl-match)', outline: '1px solid var(--warn)' },
    '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: 'var(--accent-soft)' },
    '.cm-foldPlaceholder': { backgroundColor: 'var(--surface-3)', border: 'none', color: 'var(--text-dim)' },
    '.cm-tooltip': { backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: 'var(--shadow-lift)', overflow: 'hidden' },
    '.cm-tooltip-autocomplete > ul > li': { padding: '4px 10px !important', lineHeight: '1.5' },
    '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: 'var(--accent)', color: '#fff' },
    '.cm-completionDetail': { color: 'inherit', opacity: '.7', fontStyle: 'normal', marginLeft: '8px' },
    '.cm-panels': { backgroundColor: 'var(--card)', color: 'var(--text)', borderColor: 'var(--line)' },
    '.cm-panels.cm-panels-top': { borderBottom: '1px solid var(--line)' },
    '.cm-search': { padding: '8px 10px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', fontSize: '14px' },
    '.cm-search input, .cm-search button, .cm-search label': { fontSize: '14px' },
    '.cm-textfield': { border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 8px', background: 'var(--card-2)', color: 'var(--text)', minHeight: '36px' },
    '.cm-button': { border: '0', borderRadius: '8px', padding: '6px 10px', background: 'var(--surface-3)', backgroundImage: 'none', color: 'var(--text)', minHeight: '36px' },
    '.cm-panel.cm-search [name=close]': { fontSize: '20px', padding: '4px 8px' }
  }) : null;

  /* webxdc API suggestions inside JavaScript (also in <script> blocks). */
  const WEBXDC_COMPLETIONS = [
    ['webxdc.sendUpdate', 'webxdc.sendUpdate({ payload: {} }, "")', 'ac_sendUpdate'],
    ['webxdc.setUpdateListener', 'webxdc.setUpdateListener((update) => {\n  \n}, 0)', 'ac_setUpdateListener'],
    ['webxdc.selfAddr', 'webxdc.selfAddr', 'ac_selfAddr'],
    ['webxdc.selfName', 'webxdc.selfName', 'ac_selfName'],
    ['webxdc.sendToChat', 'webxdc.sendToChat({ text: "" })', 'ac_sendToChat'],
    ['webxdc.importFiles', 'webxdc.importFiles({ extensions: [".png"] })', 'ac_importFiles'],
    ['webxdc.joinRealtimeChannel', 'webxdc.joinRealtimeChannel()', 'ac_realtime'],
    ['webxdc.sendUpdateInterval', 'webxdc.sendUpdateInterval', 'ac_interval'],
    ['webxdc.sendUpdateMaxSize', 'webxdc.sendUpdateMaxSize', 'ac_maxsize']
  ];

  function webxdcSource(context) {
    const word = context.matchBefore(/[\w.$]+/);
    if (!word || (word.from === word.to && !context.explicit)) return null;
    if (!/^w(e(b(x(d(c)?)?)?)?)?/.test(word.text) && word.text.indexOf('webxdc') !== 0) return null;
    return {
      from: word.from,
      options: WEBXDC_COMPLETIONS.map(function (c, i) {
        return { label: c[0], apply: c[1], detail: t(c[2]), type: 'function', boost: 10 - i };
      }),
      validFor: /^[\w.$]*$/
    };
  }

  function extensions(path, readOnly) {
    compartments = compartments || {
      lang: new CM.Compartment(), wrap: new CM.Compartment(), font: new CM.Compartment(), ro: new CM.Compartment()
    };
    const saveKey = { key: 'Mod-s', preventDefault: true, run: function () { flush(); return true; } };
    return [
      CM.lineNumbers(),
      CM.highlightActiveLineGutter(),
      CM.highlightSpecialChars(),
      CM.history(),
      CM.foldGutter(),
      CM.drawSelection(),
      CM.dropCursor(),
      CM.EditorState.allowMultipleSelections.of(true),
      CM.indentOnInput(),
      CM.syntaxHighlighting(hlStyle()),
      CM.bracketMatching(),
      CM.closeBrackets(),
      CM.autocompletion({ activateOnTyping: true, icons: false }),
      CM.EditorState.languageData.of(function () { return [{ autocomplete: webxdcSource }]; }),
      CM.highlightActiveLine(),
      CM.highlightSelectionMatches(),
      CM.search({ top: true }),
      CM.indentUnit.of('  '),
      CM.EditorState.tabSize.of(2),
      CM.keymap.of([saveKey].concat(CM.closeBracketsKeymap, CM.defaultKeymap, CM.searchKeymap,
        CM.historyKeymap, CM.foldKeymap, CM.completionKeymap, [CM.indentWithTab])),
      baseTheme,
      compartments.lang.of(languageFor(path)),
      compartments.wrap.of(settingsGet('editorWrap', true) ? CM.EditorView.lineWrapping : []),
      compartments.font.of(fontTheme()),
      compartments.ro.of(CM.EditorState.readOnly.of(!!readOnly)),
      CM.EditorView.contentAttributes.of({ autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', 'aria-label': t('code_editor') }),
      CM.EditorView.updateListener.of(function (u) {
        if (u.docChanged) {
          markDirty();
          const undoing = u.transactions.some(function (tr) { return tr.isUserEvent('undo') || tr.isUserEvent('redo'); });
          if (!undoing && els.docProject) { textSeq[docKey(els.docProject, els.docPath)] = ++seq; lastUndoKind = null; }
        }
        if (u.docChanged || u.selectionSet) updateStatus();
      })
    ];
  }

  /* Editor state for a file: reused while its text matches the saved content. */
  function stateFor(p, path) {
    const f = p.files[path];
    const text = f && f.kind === 'text' ? f.content : '';
    const key = docKey(p, path);
    const cached = state.docs.get(key);
    if (cached && cached.doc.toString() === text) return cached;
    const st = CM.EditorState.create({ doc: text, extensions: extensions(path, false) });
    state.docs.set(key, st);
    return st;
  }

  function rememberDoc() {
    const target = docTarget();
    if (target && view) state.docs.set(docKey(target.p, target.path), view.state);
  }

  /* ---------------- Render ---------------- */
  /* Characters that are slow to reach on phone keyboards. */
  const SYMBOLS = ['<', '>', '/', '=', '"', "'", '{', '}', '(', ')', '[', ']', ';', ':', '.', ',', '#', '$', '+', '-', '*', '&', '|', '!', '?', '`', '_', '\\'];

  function toolButton(iconName, label, run, extraClass) {
    return U.el('button', {
      class: 'ed-tool' + (extraClass ? ' ' + extraClass : ''), title: label, 'aria-label': label,
      onclick: function (ev) { ev.preventDefault(); run(ev); }
    }, U.icon(iconName, { size: 18 }));
  }

  function render(root) {
    const p = project();
    if (state.dirty) { debouncedSave.cancel(); doSave(); }
    rememberDoc();
    if (view) { try { view.destroy(); } catch (e) { /* ignore */ } view = null; }
    disposeMonaco();
    root.textContent = '';
    els = {};
    if (!p) { root.appendChild(emptyState()); return; }
    const lastPath = state.openByProject[p.id];
    if (!(state.path && p.files[state.path])) state.path = (lastPath && p.files[lastPath]) ? lastPath : defaultFile(p);
    state.openByProject[p.id] = state.path;

    els.files = U.el('aside', { class: 'ed-files', 'aria-label': t('file_tree') });
    els.scrim = U.el('div', { class: 'ed-scrim', onclick: function () { showFiles(false); } });
    renderFiles();

    const f = state.path ? p.files[state.path] : null;
    els.fileBtn = U.el('button', { class: 'ed-file-btn', onclick: function () { showFiles(!state.filesOpen); } },
      U.el('span', { class: 'ed-file-ico tint-' + tintFor(state.path, f) }, U.icon(iconFor(state.path, f), { size: 16 })),
      U.el('span', { class: 'ed-file-name', text: state.path ? U.basename(state.path) : t('editor_select_file') }),
      U.icon('forward', { size: 14 }));
    els.saveStateText = U.el('span', { class: 'save-label' });
    els.saveState = U.el('span', { class: 'save-state ok' }, U.el('span', { class: 'save-dot' }), els.saveStateText);

    const head = U.el('div', { class: 'ed-head' }, els.fileBtn, els.saveState, U.el('span', { class: 'spacer' }));
    head.appendChild(toolButton('undo', t('undo'), function () { undo(); }));
    head.appendChild(toolButton('redo', t('redo'), function () { redo(); }));
    if (f && f.kind === 'text' && CM) head.appendChild(toolButton('search', t('find'), function () { toggleFind(); }));
    head.appendChild(toolButton('more', t('more_actions'), function () { editorMenu(); }));

    els.main = U.el('div', { class: 'ed-main' }, head);
    els.status = U.el('div', { class: 'ed-status' });

    if (!f) {
      els.main.appendChild(U.el('div', { class: 'ed-empty card' },
        U.el('span', { class: 'tile-ico tint-indigo' }, U.icon('filePlus', { size: 22 })),
        U.el('p', { text: t('editor_no_files') }),
        U.el('button', { class: 'btn primary', onclick: function () { addFileModal(''); } }, U.icon('plus', { size: 16 }), t('add_file'))));
    } else if (f.kind === 'data') {
      els.main.appendChild(binaryView(state.path, f));
    } else {
      els.codeWrap = U.el('div', { class: 'ed-code' });
      els.host = U.el('div', { class: 'ed-cm' });
      els.codeWrap.appendChild(els.host);
      els.main.appendChild(els.codeWrap);
      els.symbols = U.el('div', { class: 'ed-symbols', role: 'toolbar', 'aria-label': t('symbols_bar') },
        U.el('button', { class: 'sym sym-tab', 'aria-label': t('insert_indent'), title: t('insert_indent'), onmousedown: keepFocus, onclick: function () { insertAtCursor('  '); } }, '⇥'));
      SYMBOLS.forEach(function (ch) {
        els.symbols.appendChild(U.el('button', { class: 'sym', 'aria-label': t('insert_symbol', { ch: ch }), title: t('insert_symbol', { ch: ch }), onmousedown: keepFocus, onclick: function () { insertAtCursor(ch); } }, ch));
      });
      els.main.appendChild(els.symbols);
      els.main.appendChild(els.status);
    }

    els.layout = U.el('div', { class: 'ed-layout' + (state.filesOpen && isNarrow() ? ' files-open' : '') }, els.scrim, els.files, els.main);
    root.appendChild(els.layout);

    if (f && f.kind === 'text') mountEditor(p, f);
    setSaveState('saved');
    updateStatus();
    if (CS.preview && CS.preview.onProjectChanged) CS.preview.onProjectChanged();
  }

  function keepFocus(ev) { ev.preventDefault(); }

  function mountEditor(p, f) {
    els.docProject = p;
    els.docPath = state.path;
    if (CM) {
      view = new CM.EditorView({ state: stateFor(p, state.path), parent: els.host });
    } else {
      /* Fallback when the CodeMirror bundle is missing: a plain textarea. */
      els.plain = U.el('textarea', {
        class: 'ed-plain', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off',
        oninput: function () { markDirty(); updateStatus(); }
      });
      els.plain.value = f.content;
      els.host.appendChild(els.plain);
    }
    if (settingsGet('preferMonaco', false) && CS.monaco && CS.monaco.bundled && !(CS.app && CS.app.isMobile && CS.app.isMobile())) {
      enableMonaco(false);
    }
  }

  function binaryView(path, f) {
    const mime = f.mime || '';
    const isImage = mime.indexOf('image') === 0 || /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(path);
    const isAudio = mime.indexOf('audio') === 0 || /\.(wav|mp3|ogg|m4a|aac|flac|opus)$/i.test(path);
    const box = U.el('div', { class: 'ed-binary card' });
    if (isImage) {
      box.appendChild(U.el('div', { class: 'bin-stage checker' }, U.el('img', { src: f.dataUrl, alt: path, class: 'bin-preview' })));
    } else if (isAudio) {
      box.appendChild(U.el('div', { class: 'bin-stage' }, U.el('audio', { src: f.dataUrl, controls: true, preload: 'metadata' })));
    } else {
      box.appendChild(U.el('div', { class: 'bin-stage' }, U.el('span', { class: 'tile-ico tint-slate' }, U.icon('file', { size: 26 }))));
    }
    const img = box.querySelector('img');
    const meta = U.el('p', { class: 'hint bin-meta', text: path + ' · ' + (mime || '?') + ' · ' + U.formatBytes(f.size || 0) });
    if (img) img.addEventListener('load', function () { meta.textContent += ' · ' + img.naturalWidth + '×' + img.naturalHeight + ' px'; }, { once: true });
    box.appendChild(meta);
    const actions = U.el('div', { class: 'row-gap wrap' });
    if (isImage && CS.imageEditor) actions.appendChild(U.el('button', { class: 'btn primary', onclick: function () { CS.imageEditor.open(path); } }, U.icon('brush', { size: 16 }), t('tools_image')));
    if (isAudio && CS.audioEditor) actions.appendChild(U.el('button', { class: 'btn primary', onclick: function () { CS.audioEditor.open(path); } }, U.icon('music', { size: 16 }), t('tools_audio')));
    actions.appendChild(U.el('button', { class: 'btn', onclick: function () { copyPathSnippet(path); } }, U.icon('copy', { size: 16 }), t('copy_usage')));
    actions.appendChild(U.el('button', { class: 'btn ghost', onclick: function () { fileActions(path); } }, U.icon('more', { size: 16 }), t('more_actions')));
    box.appendChild(actions);
    return box;
  }

  /* Ready-to-paste HTML for an asset (img/audio tag or link). */
  function usageSnippet(path) {
    const e = U.extname(path);
    if (/^(png|jpe?g|gif|webp|svg|bmp|ico)$/.test(e)) return '<img src="' + path + '" alt="">';
    if (/^(wav|mp3|ogg|m4a|aac|flac|opus)$/.test(e)) return '<audio src="' + path + '" controls></audio>';
    if (e === 'css') return '<link rel="stylesheet" href="' + path + '">';
    if (e === 'js' || e === 'mjs') return '<script src="' + path + '"></script>';
    return path;
  }

  function copyPathSnippet(path) {
    const text = usageSnippet(path);
    const done = function () { toast(t('copied_usage', { code: text })); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { toast(text); });
      else toast(text);
    } catch (e) { toast(text); }
  }

  function emptyState() {
    return U.el('div', { class: 'empty-state card' },
      U.el('span', { class: 'tile-ico tint-indigo' }, U.icon('code', { size: 22 })),
      U.el('p', { text: t('editor_no_project') }),
      U.el('button', { class: 'btn primary', onclick: function () { CS.app.showView('projects'); } }, t('open_or_create')));
  }

  function defaultFile(p) {
    if (p.files['index.html']) return 'index.html';
    const first = CS.projects.fileList(p)[0];
    return first || null;
  }

  function updateStatus() {
    if (!els.status) return;
    const text = currentText();
    if (text == null) { els.status.textContent = ''; return; }
    let line = 1, col = 1;
    if (view && !monacoRec) {
      const head = view.state.selection.main.head;
      const ln = view.state.doc.lineAt(head);
      line = ln.number; col = head - ln.from + 1;
    }
    els.status.textContent = '';
    els.status.appendChild(U.el('span', { class: 'status-file', text: (state.path || '—') }));
    els.status.appendChild(U.el('span', { class: 'spacer' }));
    els.status.appendChild(U.el('span', { text: U.formatBytes(U.byteLen(text)) }));
    els.status.appendChild(U.el('span', { class: 'status-pos', text: t('ln_col', { line: line, col: col }) }));
  }

  function insertAtCursor(text) {
    if (monacoRec && monacoRec.editor) {
      try { monacoRec.editor.trigger('cs', 'type', { text: text }); monacoRec.editor.focus(); } catch (e) { /* ignore */ }
      return true;
    }
    if (view) {
      const sel = view.state.selection.main;
      view.dispatch({ changes: { from: sel.from, to: sel.to, insert: text }, selection: { anchor: sel.from + text.length }, scrollIntoView: true, userEvent: 'input.type' });
      view.focus();
      return true;
    }
    if (els.plain) {
      const a = els.plain, s = a.selectionStart, e = a.selectionEnd;
      a.value = a.value.slice(0, s) + text + a.value.slice(e);
      a.selectionStart = a.selectionEnd = s + text.length;
      markDirty();
      return true;
    }
    return false;
  }

  function toggleFind() {
    if (!view) return;
    const open = !!view.dom.querySelector('.cm-search');
    if (open) CM.closeSearchPanel(view); else CM.openSearchPanel(view);
  }

  function applyFont() {
    if (view && compartments) view.dispatch({ effects: compartments.font.reconfigure(fontTheme()) });
    if (monacoRec && monacoRec.editor) { try { monacoRec.editor.updateOptions({ fontSize: fontPx() }); } catch (e) { /* ignore */ } }
  }

  function fontStep(dir) {
    const next = Math.max(10, Math.min(24, fontPx() + dir));
    CS.settings.set('editorFont', next);
    applyFont();
    toast(t('font_size_now', { px: next }));
  }

  function setWrap(on) {
    CS.settings.set('editorWrap', on);
    if (view && compartments) view.dispatch({ effects: compartments.wrap.reconfigure(on ? CM.EditorView.lineWrapping : []) });
    if (monacoRec && monacoRec.editor) { try { monacoRec.editor.updateOptions({ wordWrap: on ? 'on' : 'off' }); } catch (e) { /* ignore */ } }
  }

  function editorMenu() {
    const p = project();
    const f = p && state.path ? p.files[state.path] : null;
    const items = [];
    if (f && f.kind === 'text') {
      if (view) items.push({ icon: 'code', label: t('toggle_comment'), fn: function () { CM.toggleComment(view); view.focus(); } });
      items.push({ icon: 'wrap', label: t('wrap') + ': ' + (settingsGet('editorWrap', true) ? t('on') : t('off')), fn: function () { setWrap(!settingsGet('editorWrap', true)); } });
      items.push({ icon: 'zoomIn', label: t('a11y_font_bigger'), fn: function () { fontStep(1); } });
      items.push({ icon: 'zoomOut', label: t('a11y_font_smaller'), fn: function () { fontStep(-1); } });
      items.push({ icon: 'expand', label: state.fs ? t('fs_close') : t('fs_open'), fn: function () { toggleFullscreen(); } });
      if (CS.monaco && CS.monaco.bundled && !(CS.app && CS.app.isMobile && CS.app.isMobile())) {
        items.push({ icon: 'code', label: t('monaco_toggle') + ': ' + (settingsGet('preferMonaco', false) ? t('on') : t('off')), fn: toggleMonaco });
      }
    }
    if (CS.imageEditor) items.push({ icon: 'brush', label: t('tools_image'), fn: function () { CS.imageEditor.open(); } });
    if (CS.audioEditor) items.push({ icon: 'music', label: t('tools_audio'), fn: function () { CS.audioEditor.open(); } });
    if (state.path) items.push({ icon: 'more', label: t('file_actions'), fn: function () { fileActions(state.path); } });
    CS.app.sheet({ title: state.path || t('nav_editor'), items: items });
  }

  /* ---------------- Fullscreen ---------------- */
  function toggleFullscreen(force) {
    const on = force === undefined ? !state.fs : !!force;
    state.fs = on;
    if (els.main) els.main.classList.toggle('fs', on);
    try { document.body.classList.toggle('fs-open', on); } catch (e) { /* ignore */ }
    let bar = els.main && els.main.querySelector('.fs-bar');
    if (on && els.main && !bar) {
      bar = U.el('div', { class: 'fs-bar' },
        U.el('span', { class: 'mono fs-file', text: state.path || '' }),
        U.el('span', { class: 'spacer' }),
        U.el('button', { class: 'btn small fs-exit', onclick: function () { toggleFullscreen(false); } }, U.icon('close', { size: 16 }), t('fs_close')));
      els.main.insertBefore(bar, els.main.firstChild);
    } else if (!on && bar) bar.remove();
    const v = view;
    if (v) setTimeout(function () { if (view === v && v.dom.isConnected) { v.requestMeasure(); v.focus(); } }, 60);
  }

  /* ---------------- Monaco (optional, desktop package) ---------------- */
  function enableMonaco(fromUser) {
    if (!CS.monaco || !els.host) return;
    if (fromUser) toast(t('monaco_loading'), 'info');
    CS.monaco.load().then(function (m) {
      if (!m || !els.host || !els.codeWrap) { CS.settings.set('preferMonaco', false); toast(t('monaco_fail'), 'warn'); return; }
      if (CS.monaco.disposeAll) CS.monaco.disposeAll();
      els.monacoArea = U.el('textarea', { class: 'monaco-mirror', hidden: true, oninput: function () { markDirty(); updateStatus(); } });
      els.monacoArea.value = currentText() || '';
      els.monacoHost = U.el('div', { class: 'monaco-host' });
      els.codeWrap.appendChild(els.monacoArea);
      els.codeWrap.appendChild(els.monacoHost);
      const rec = CS.monaco.attach(els.monacoHost, els.monacoArea, { path: state.path, wordWrap: settingsGet('editorWrap', true), fontSize: fontPx(), mobile: false });
      if (!rec) { els.monacoHost.remove(); els.monacoArea.remove(); CS.settings.set('preferMonaco', false); toast(t('monaco_fail'), 'warn'); return; }
      monacoRec = rec;
      els.host.hidden = true;
      if (els.symbols) els.symbols.hidden = true;
    }).catch(function () { CS.settings.set('preferMonaco', false); toast(t('monaco_fail'), 'warn'); });
  }

  function disposeMonaco() {
    if (!monacoRec) return;
    const text = els.monacoArea ? els.monacoArea.value : null;
    if (CS.monaco && CS.monaco.disposeAll) CS.monaco.disposeAll();
    monacoRec = null;
    if (els.monacoHost) els.monacoHost.remove();
    if (els.monacoArea) els.monacoArea.remove();
    if (els.host) els.host.hidden = false;
    if (els.symbols) els.symbols.hidden = false;
    if (text != null && view && text !== view.state.doc.toString()) setCurrentText(text);
  }

  function toggleMonaco() {
    const next = !settingsGet('preferMonaco', false);
    CS.settings.set('preferMonaco', next);
    if (next) enableMonaco(true); else disposeMonaco();
  }

  /* ---------------- File manager (folders included) ---------------- */
  function iconFor(path, f) {
    if (!path) return 'file';
    const e = U.extname(path);
    if (f && f.kind === 'data') {
      if (/^(wav|mp3|ogg|m4a|aac|flac|opus)$/.test(e)) return 'music';
      if (/^(png|jpe?g|gif|webp|svg|bmp|ico)$/.test(e)) return 'image';
      return 'file';
    }
    if (e === 'html' || e === 'htm') return 'pages';
    if (e === 'css') return 'palette';
    if (e === 'js' || e === 'mjs') return 'code';
    if (e === 'json' || e === 'toml') return 'gear';
    if (e === 'md' || e === 'txt') return 'book';
    if (e === 'svg') return 'image';
    return 'file';
  }

  function tintFor(path, f) {
    const i = iconFor(path, f);
    return { pages: 'orange', palette: 'blue', code: 'amber', gear: 'slate', book: 'teal', image: 'pink', music: 'violet' }[i] || 'slate';
  }

  /* Every folder: explicit (empty folders live in p.folders) plus the ones implied by file paths. */
  function allFolders(p) {
    const set = new Set();
    (p.folders || []).forEach(function (d) { if (d) set.add(d); });
    Object.keys(p.files).forEach(function (path) {
      const parts = path.split('/');
      for (let i = 1; i < parts.length; i++) set.add(parts.slice(0, i).join('/'));
    });
    return Array.from(set).sort(function (a, b) { return a.localeCompare(b); });
  }

  function showFiles(on) {
    state.filesOpen = !!on;
    if (els.layout) els.layout.classList.toggle('files-open', state.filesOpen && isNarrow());
    if (!isNarrow() && els.layout) els.layout.classList.remove('files-open');
  }

  function renderFiles() {
    const p = project();
    if (!p || !els.files) return;
    els.files.textContent = '';
    const head = U.el('div', { class: 'ed-files-head' },
      U.el('b', { text: t('files_title') }),
      U.el('span', { class: 'hint', text: t('files_count', { n: Object.keys(p.files).length }) }),
      U.el('span', { class: 'spacer' }),
      U.el('button', { class: 'ed-tool ed-files-close', 'aria-label': t('close'), onclick: function () { showFiles(false); } }, U.icon('close', { size: 18 })));
    const actions = U.el('div', { class: 'ed-files-actions' },
      U.el('button', { class: 'chip', onclick: function () { addFileModal(''); } }, U.icon('filePlus', { size: 16 }), t('new_file')),
      U.el('button', { class: 'chip', onclick: function () { addFolderModal(''); } }, U.icon('folderPlus', { size: 16 }), t('new_folder')),
      U.el('button', { class: 'chip', onclick: function () { uploadFiles(''); } }, U.icon('upload', { size: 16 }), t('upload_files')));
    els.files.appendChild(head);
    els.files.appendChild(actions);
    const tree = U.el('div', { class: 'ed-tree', role: 'tree' });
    paintFolder(p, '', tree, 0);
    els.files.appendChild(tree);
    const total = Object.keys(p.files).reduce(function (sum, k) {
      const f = p.files[k];
      return sum + (f.kind === 'text' ? U.byteLen(f.content) : (f.size || 0));
    }, 0);
    els.files.appendChild(U.el('p', { class: 'hint ed-files-foot', text: t('files_total', { size: U.formatBytes(total) }) }));
  }

  function paintFolder(p, dir, host, depth) {
    const prefix = dir ? dir + '/' : '';
    const folders = allFolders(p).filter(function (d) {
      return d.indexOf(prefix) === 0 && d !== dir && d.slice(prefix.length).indexOf('/') < 0;
    });
    const files = CS.projects.fileList(p).filter(function (path) {
      return path.indexOf(prefix) === 0 && path.slice(prefix.length).indexOf('/') < 0;
    });
    folders.forEach(function (d) {
      const key = docKey(p, d);
      const open = !state.collapsed[key];
      const row = U.el('div', { class: 'ed-row folder', role: 'treeitem', 'aria-expanded': String(open), style: { paddingLeft: (8 + depth * 16) + 'px' } },
        U.el('button', { class: 'ed-row-main', onclick: function () { state.collapsed[key] = open; renderFiles(); } },
          U.el('span', { class: 'ed-caret' + (open ? ' open' : '') }, U.icon('forward', { size: 14 })),
          U.el('span', { class: 'ed-row-ico tint-amber' }, U.icon('folder', { size: 16 })),
          U.el('span', { class: 'ed-row-name', text: U.basename(d) })),
        U.el('button', { class: 'ed-row-more', 'aria-label': t('more_actions'), onclick: function () { folderActions(d); } }, U.icon('more', { size: 16 })));
      host.appendChild(row);
      if (open) paintFolder(p, d, host, depth + 1);
    });
    files.forEach(function (path) {
      const f = p.files[path];
      const size = f.kind === 'text' ? U.byteLen(f.content) : (f.size || 0);
      const row = U.el('div', { class: 'ed-row' + (path === state.path ? ' active' : ''), role: 'treeitem', style: { paddingLeft: (8 + depth * 16 + 18) + 'px' } },
        U.el('button', { class: 'ed-row-main', title: path, onclick: function () { openFile(path); } },
          U.el('span', { class: 'ed-row-ico tint-' + tintFor(path, f) }, U.icon(iconFor(path, f), { size: 16 })),
          U.el('span', { class: 'ed-row-name', text: U.basename(path) }),
          U.el('span', { class: 'ed-row-size', text: U.formatBytes(size) })),
        U.el('button', { class: 'ed-row-more', 'aria-label': t('more_actions'), onclick: function () { fileActions(path); } }, U.icon('more', { size: 16 })));
      host.appendChild(row);
    });
    if (!dir && !folders.length && !files.length) host.appendChild(U.el('p', { class: 'hint', text: t('editor_no_files') }));
  }

  function openFile(path) {
    const p = project();
    if (!p || !p.files[path]) return;
    if (state.dirty) flush();
    rememberDoc();
    state.path = path;
    state.openByProject[p.id] = path;
    state.filesOpen = false;
    const root = document.getElementById('view-editor');
    if (root && CS.app && CS.app.view === 'editor') {
      render(root);
      if (view && !isNarrow()) view.focus();
    }
  }

  function validNewPath(p, value, allowSame) {
    const clean = U.normalizeRelPath(value);
    if (!clean || !U.isSafePath(clean)) return t('err_bad_path');
    if (clean.toLowerCase() === 'webxdc.js') return t('err_no_webxdc_js');
    if (clean !== allowSame && p.files[clean]) return t('err_file_exists');
    if (clean !== allowSame && allFolders(p).indexOf(clean) >= 0) return t('err_folder_exists');
    return null;
  }

  function saveAndRender(path) {
    const p = project();
    return CS.projects.save(p).then(function () {
      if (path) state.path = path;
      refresh(true);
    }).catch(function (err) { toast(t('save_failed') + ' (' + ((err && err.message) || err) + ')', 'error'); });
  }

  function fileError(e) {
    const code = e && (e.code || e.message);
    const map = { 'file-too-big': 'err_file_too_big', 'too-many-files': 'err_too_many_files', 'bad-path': 'err_bad_path', 'webxdc-js': 'err_no_webxdc_js', exists: 'err_file_exists' };
    toast(map[code] ? t(map[code]) : t('err_generic') + ': ' + ((e && e.message) || e), 'error');
  }

  function addFileModal(dir) {
    const p = project();
    if (!p) return;
    const prefix = dir ? dir + '/' : '';
    CS.app.prompt({
      title: t('new_file'), label: t('file_path_label'), value: prefix + 'nuevo.js', hint: t('new_file_hint'),
      validate: function (v) {
        const err = validNewPath(p, v);
        if (err) return err;
        if (!U.isTextFile(U.normalizeRelPath(v))) return t('err_text_only_here');
        return null;
      }
    }).then(function (value) {
      if (!value) return;
      const clean = U.normalizeRelPath(value);
      try { CS.projects.fileSet(p, clean, { kind: 'text', content: stubFor(clean) }); } catch (e) { fileError(e); return; }
      pushOp(p, { k: 'remove', path: clean, entry: p.files[clean] });
      saveAndRender(clean);
    });
  }

  function addFolderModal(dir) {
    const p = project();
    if (!p) return;
    const prefix = dir ? dir + '/' : '';
    CS.app.prompt({
      title: t('new_folder'), label: t('folder_name_label'), value: prefix + 'assets', hint: t('new_folder_hint'),
      validate: function (v) { return validNewPath(p, v); }
    }).then(function (value) {
      if (!value) return;
      const clean = U.normalizeRelPath(value);
      const before = (p.folders || []).slice();
      p.folders = before.concat([clean]);
      pushOp(p, { k: 'folders', to: before });
      state.collapsed[docKey(p, clean)] = false;
      saveAndRender(null).then(function () { toast(t('folder_created', { name: clean })); });
    });
  }

  function readFile(file, asText) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { reject(new Error('read')); };
      if (asText) reader.readAsText(file); else reader.readAsDataURL(file);
    });
  }

  function freePath(p, path) {
    if (!p.files[path]) return path;
    const dot = path.lastIndexOf('.');
    const stem = dot > 0 ? path.slice(0, dot) : path;
    const ext = dot > 0 ? path.slice(dot) : '';
    for (let i = 2; i < 100; i++) { const c = stem + '-' + i + ext; if (!p.files[c]) return c; }
    return stem + '-' + Date.now() + ext;
  }

  function uploadFiles(dir) {
    const p = project();
    if (!p) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = async function () {
      const list = Array.from(input.files || []);
      if (!list.length) return;
      const added = [];
      for (const file of list) {
        const name = U.sanitizeFileName(file.name || 'archivo');
        const path = freePath(p, (dir ? dir + '/' : '') + name);
        try {
          if (U.isTextFile(path)) {
            CS.projects.fileSet(p, path, { kind: 'text', content: await readFile(file, true) });
          } else {
            CS.projects.fileSet(p, path, { kind: 'data', dataUrl: await readFile(file, false), mime: file.type || '', size: file.size });
          }
          added.push({ k: 'remove', path: path, entry: p.files[path] });
        } catch (e) { fileError(e); }
      }
      if (!added.length) return;
      pushOp(p, added.length === 1 ? added[0] : { k: 'batch', ops: added });
      saveAndRender(added[added.length - 1].path).then(function () {
        toast(t('files_uploaded', { n: added.length }));
      });
    };
    input.click();
  }

  function stubFor(path) {
    const e = U.extname(path);
    const lang = (CS.i18n && CS.i18n.lang && CS.i18n.lang()) === 'en' ? 'en' : 'es';
    if (e === 'html' || e === 'htm') {
      return ['<!DOCTYPE html>', '<html lang="' + lang + '">', '<head>', '  <meta charset="utf-8">',
        '  <meta name="viewport" content="width=device-width, initial-scale=1">', '  <title>' + U.basename(path) + '</title>',
        '  <script src="webxdc.js"><\/script>', '</head>', '<body>', '  ', '</body>', '</html>', ''].join('\n');
    }
    if (e === 'css') return '/* ' + path + ' */\n';
    if (e === 'json') return '{\n}\n';
    if (e === 'md') return '# ' + U.basename(path) + '\n';
    if (e === 'js' || e === 'mjs') return '// ' + path + '\n';
    return '';
  }

  function fileActions(path) {
    const p = project();
    if (!p || !p.files[path]) return;
    const f = p.files[path];
    const items = [{ icon: 'forward', label: t('open_file'), fn: function () { openFile(path); } }];
    if (f.kind === 'data') {
      if (CS.imageEditor && iconFor(path, f) === 'image') items.push({ icon: 'brush', label: t('tools_image'), fn: function () { CS.imageEditor.open(path); } });
      if (CS.audioEditor && iconFor(path, f) === 'music') items.push({ icon: 'music', label: t('tools_audio'), fn: function () { CS.audioEditor.open(path); } });
    }
    items.push({ icon: 'pencil', label: t('rename_file'), fn: function () { renameFileModal(path); } });
    items.push({ icon: 'move', label: t('move_file'), fn: function () { moveFileSheet(path); } });
    items.push({ icon: 'copy', label: t('duplicate_file'), fn: function () { duplicateFile(path); } });
    items.push({ icon: 'link', label: t('copy_usage'), fn: function () { copyPathSnippet(path); } });
    items.push({ icon: 'send', label: t('share_file'), fn: function () { shareFile(path); } });
    items.push({ icon: 'trash', label: t('delete_file'), fn: function () { deleteFileModal(path); }, danger: true });
    CS.app.sheet({ title: path, items: items });
  }

  function folderActions(dir) {
    CS.app.sheet({
      title: dir + '/',
      items: [
        { icon: 'filePlus', label: t('new_file_here'), fn: function () { addFileModal(dir); } },
        { icon: 'folderPlus', label: t('new_folder_here'), fn: function () { addFolderModal(dir); } },
        { icon: 'upload', label: t('upload_here'), fn: function () { uploadFiles(dir); } },
        { icon: 'pencil', label: t('rename_folder'), fn: function () { renameFolderModal(dir); } },
        { icon: 'trash', label: t('delete_folder'), fn: function () { deleteFolderModal(dir); }, danger: true }
      ]
    });
  }

  function renameFileModal(from) {
    const p = project();
    if (!p || !p.files[from]) return;
    CS.app.prompt({
      title: t('rename_file'), label: t('file_path_label'), value: from,
      validate: function (v) { return validNewPath(p, v, from); }
    }).then(function (value) {
      if (!value) return;
      moveFile(from, U.normalizeRelPath(value));
    });
  }

  async function moveFile(from, to) {
    const p = project();
    if (!p || from === to) return;
    try {
      if (state.path === from) await flush();
      const clean = await CS.projects.fileRename(p, from, to);
      pushOp(p, { k: 'ren', from: clean, to: from });
      renameDoc(p, from, clean);
      if (state.openByProject[p.id] === from) state.openByProject[p.id] = clean;
      if (state.path === from) state.path = clean;
      await saveAndRender(null);
      toast(t('renamed_path', { from: from, to: clean }));
    } catch (e) { fileError(e); }
  }

  function renameDoc(p, from, to) {
    if (els.docProject === p && els.docPath === from) els.docPath = to;
    const st = state.docs.get(docKey(p, from));
    if (st) { state.docs.delete(docKey(p, from)); state.docs.set(docKey(p, to), st); }
  }

  function moveFileSheet(path) {
    const p = project();
    if (!p) return;
    const name = U.basename(path);
    const current = path.indexOf('/') >= 0 ? path.slice(0, path.lastIndexOf('/')) : '';
    const items = [{ icon: 'home', label: t('folder_root'), fn: function () { moveFile(path, name); } }];
    allFolders(p).forEach(function (d) {
      if (d === current) return;
      items.push({ icon: 'folder', label: d + '/', fn: function () { if (p.files[d + '/' + name]) toast(t('err_file_exists'), 'error'); else moveFile(path, d + '/' + name); } });
    });
    items.push({ icon: 'folderPlus', label: t('new_folder'), fn: function () { addFolderModal(''); } });
    CS.app.sheet({ title: t('move_to', { file: name }), items: items });
  }

  function duplicateFile(from) {
    const p = project();
    if (!p || !p.files[from]) return;
    const dot = from.lastIndexOf('.');
    const copy = freePath(p, dot > 0 ? from.slice(0, dot) + '-' + t('copy_suffix') + from.slice(dot) : from + '-' + t('copy_suffix'));
    const src = p.files[from];
    try {
      CS.projects.fileSet(p, copy, src.kind === 'text' ? { kind: 'text', content: src.content } : { kind: 'data', dataUrl: src.dataUrl, mime: src.mime, size: src.size });
    } catch (e) { fileError(e); return; }
    pushOp(p, { k: 'remove', path: copy, entry: p.files[copy] });
    saveAndRender(copy).then(function () { toast(t('duplicated_ok') + ' → ' + copy); });
  }

  function shareFile(path) {
    const p = project();
    const f = p && p.files[path];
    if (!f) return;
    const name = U.basename(path);
    const wx = globalThis.webxdc;
    if (wx && typeof wx.sendToChat === 'function') {
      const file = f.kind === 'text' ? { name: name, plainText: f.content } : { name: name, base64: String(f.dataUrl).split(',')[1] || '' };
      Promise.resolve(wx.sendToChat({ file: file })).then(function () { toast(t('shared_ok')); }, function (e) { toast(t('err_generic') + ': ' + ((e && e.message) || e), 'error'); });
      return;
    }
    if (f.kind === 'text') CS.app.downloadBlob(name, f.content, 'text/plain');
    else CS.app.downloadBlob(name, U.dataUrlToBytes(f.dataUrl), f.mime || 'application/octet-stream');
  }

  function deleteFileModal(path) {
    const p = project();
    if (!p || !p.files[path]) return;
    CS.app.confirm({ title: t('delete_file'), message: t('delete_file_confirm', { file: path }), danger: true, okLabel: t('delete') }).then(function (yes) {
      if (!yes) return;
      const entry = p.files[path];
      CS.projects.fileDelete(p, path);
      state.docs.delete(docKey(p, path));
      pushOp(p, { k: 'add', path: path, entry: entry });
      if (state.openByProject[p.id] === path) delete state.openByProject[p.id];
      if (state.path === path) state.path = defaultFile(p);
      saveAndRender(null).then(function () {
        toast(t('file_deleted', { file: U.basename(path) }), 'warn', { ttl: 7000, action: { label: t('undo'), fn: function () { restoreDeleted(path, entry); } } });
      });
    });
  }

  function filesUnder(p, dir) {
    return Object.keys(p.files).filter(function (path) { return path.indexOf(dir + '/') === 0; });
  }

  function renameFolderModal(dir) {
    const p = project();
    if (!p) return;
    CS.app.prompt({
      title: t('rename_folder'), label: t('folder_name_label'), value: dir,
      validate: function (v) {
        const clean = U.normalizeRelPath(v);
        if (clean === dir) return null;
        if (clean.indexOf(dir + '/') === 0) return t('err_folder_inside');
        return validNewPath(p, v);
      }
    }).then(async function (value) {
      if (!value) return;
      const to = U.normalizeRelPath(value);
      if (to === dir) return;
      await flush();
      const ops = [];
      for (const path of filesUnder(p, dir)) {
        const target = to + path.slice(dir.length);
        try {
          const clean = await CS.projects.fileRename(p, path, target);
          ops.push({ k: 'ren', from: clean, to: path });
          renameDoc(p, path, clean);
          if (state.path === path) state.path = clean;
        } catch (e) { fileError(e); }
      }
      const before = (p.folders || []).slice();
      p.folders = before.map(function (d) { return d === dir || d.indexOf(dir + '/') === 0 ? to + d.slice(dir.length) : d; });
      ops.push({ k: 'folders', to: before });
      pushOp(p, { k: 'batch', ops: ops });
      await saveAndRender(null);
      toast(t('renamed_path', { from: dir, to: to }));
    });
  }

  function deleteFolderModal(dir) {
    const p = project();
    if (!p) return;
    const inside = filesUnder(p, dir);
    CS.app.confirm({
      title: t('delete_folder'), danger: true, okLabel: t('delete'),
      message: inside.length ? t('delete_folder_confirm', { name: dir, n: inside.length }) : t('delete_folder_empty', { name: dir })
    }).then(function (yes) {
      if (!yes) return;
      const ops = [];
      inside.forEach(function (path) {
        ops.push({ k: 'add', path: path, entry: p.files[path] });
        CS.projects.fileDelete(p, path);
        state.docs.delete(docKey(p, path));
      });
      const before = (p.folders || []).slice();
      p.folders = before.filter(function (d) { return d !== dir && d.indexOf(dir + '/') !== 0; });
      ops.push({ k: 'folders', to: before });
      pushOp(p, { k: 'batch', ops: ops });
      if (state.path && !p.files[state.path]) state.path = defaultFile(p);
      saveAndRender(null).then(function () {
        toast(t('folder_deleted', { name: dir }), 'warn', { ttl: 7000, action: { label: t('undo'), fn: function () { undo(); } } });
      });
    });
  }

  /* ---------------- File operation history ---------------- */
  function pushOp(p, op) {
    op.seq = ++seq;
    op.doc = els.docProject ? docKey(els.docProject, els.docPath) : null;
    op.depth = view && !monacoRec ? CM.undoDepth(view.state) : 0;
    lastUndoKind = null;
    const st = state.hist[p.id] || (state.hist[p.id] = []);
    st.push(op);
    if (st.length > HIST_MAX) st.shift();
    state.redo[p.id] = [];
  }

  /* Apply an op and return its inverse, or null when it no longer fits the project. */
  function applyOp(p, op) {
    if (op.k === 'add') {
      if (p.files[op.path] || !op.entry) return null;
      try { CS.projects.fileSet(p, op.path, op.entry); } catch (e) { return null; }
      return { k: 'remove', path: op.path, entry: op.entry };
    }
    if (op.k === 'remove') {
      const cur = p.files[op.path];
      if (!cur) return null;
      CS.projects.fileDelete(p, op.path);
      state.docs.delete(docKey(p, op.path));
      if (state.path === op.path) state.path = null;
      return { k: 'add', path: op.path, entry: cur };
    }
    if (op.k === 'ren') {
      if (!p.files[op.from] || p.files[op.to]) return null;
      p.files[op.to] = p.files[op.from];
      delete p.files[op.from];
      if (p.blocks && p.blocks.generatedFile === op.from) p.blocks.generatedFile = op.to;
      renameDoc(p, op.from, op.to);
      if (state.path === op.from) state.path = op.to;
      return { k: 'ren', from: op.to, to: op.from };
    }
    if (op.k === 'replace') {
      if (!op.entry) return null;
      const cur = p.files[op.path] || null;
      try { CS.projects.fileSet(p, op.path, op.entry); } catch (e) { return null; }
      state.docs.delete(docKey(p, op.path));
      return cur ? { k: 'replace', path: op.path, entry: cur } : { k: 'remove', path: op.path, entry: op.entry };
    }
    if (op.k === 'folders') {
      const cur = (p.folders || []).slice();
      p.folders = op.to.slice();
      return { k: 'folders', to: cur };
    }
    if (op.k === 'batch') {
      const inverse = [];
      for (let i = op.ops.length - 1; i >= 0; i--) {
        const inv = applyOp(p, op.ops[i]);
        if (inv) inverse.push(inv);
      }
      return inverse.length ? { k: 'batch', ops: inverse } : null;
    }
    return null;
  }

  function opLabel(op) {
    if (op.k === 'add') return t('restored_ok', { file: U.basename(op.path) });
    if (op.k === 'remove') return t('file_deleted', { file: U.basename(op.path) });
    if (op.k === 'ren') return t('renamed_path', { from: op.from, to: op.to });
    if (op.k === 'folders' || op.k === 'batch') return t('undo_files');
    return t('undo_files');
  }

  function stepFiles(fromStack, toStack, isRedo) {
    const p = project();
    if (!p) return false;
    const st = fromStack[p.id] || [];
    while (st.length) {
      const op = st.pop();
      const inv = applyOp(p, op);
      if (inv) {
        if (isRedo) {
          inv.seq = ++seq;
          inv.doc = els.docProject ? docKey(els.docProject, els.docPath) : null;
          inv.depth = view && !monacoRec ? CM.undoDepth(view.state) : 0;
        }
        (toStack[p.id] || (toStack[p.id] = [])).push(inv);
        if (!state.path || !p.files[state.path]) state.path = defaultFile(p);
        CS.projects.save(p).catch(function () {});
        refresh(true);
        toast((isRedo ? '↷ ' : '↶ ') + opLabel(op));
        return true;
      }
    }
    return false;
  }

  /* Undo edits in the open file first; when there are none, undo file operations. */
  /* True when the open file has typed changes newer than the latest file operation. */
  function textIsNewer() {
    if (!view || monacoRec || !els.docProject) return false;
    const depth = CM.undoDepth(view.state);
    if (depth === 0) return false;
    const p = project();
    const st = p ? (state.hist[p.id] || []) : [];
    const op = st[st.length - 1];
    if (!op) return true;
    const key = docKey(els.docProject, els.docPath);
    if (op.doc === key) return depth > op.depth;
    return (textSeq[key] || 0) > op.seq;
  }

  function undo() {
    if (textIsNewer()) { CM.undo(view); lastUndoKind = 'text'; return true; }
    if (monacoRec && monacoRec.editor) { try { monacoRec.editor.trigger('cs', 'undo'); return true; } catch (e) { /* ignore */ } }
    if (stepFiles(state.hist, state.redo, false)) { lastUndoKind = 'files'; return true; }
    if (view && !monacoRec && CM.undoDepth(view.state) > 0) { CM.undo(view); lastUndoKind = 'text'; return true; }
    toast(t('undo_empty'), 'warn');
    return false;
  }

  function redo() {
    const p = project();
    const filesFirst = lastUndoKind === 'files' && p && (state.redo[p.id] || []).length;
    if (!filesFirst && view && !monacoRec && CM.redoDepth(view.state) > 0) { CM.redo(view); return true; }
    if (monacoRec && monacoRec.editor) { try { monacoRec.editor.trigger('cs', 'redo'); return true; } catch (e) { /* ignore */ } }
    if (stepFiles(state.redo, state.hist, true)) return true;
    toast(t('redo_empty'), 'warn');
    return false;
  }

  /* Undo button on the delete toast: restores that file without touching the rest of the stack. */
  function restoreDeleted(path, fallbackEntry) {
    const p = project();
    if (!p) return;
    const st = state.hist[p.id] || [];
    let entry = fallbackEntry || null;
    for (let i = st.length - 1; i >= 0; i--) {
      if (st[i].k === 'add' && st[i].path === path) { entry = st[i].entry; st.splice(i, 1); break; }
    }
    if (p.files[path]) { refresh(true); return; }
    if (!entry) return;
    try { CS.projects.fileSet(p, path, entry); } catch (e) { fileError(e); return; }
    state.redo[p.id] = [];
    CS.projects.save(p).then(function () {
      refresh(true);
      toast(t('restored_ok', { file: U.basename(path) }));
    }).catch(function () {});
  }

  /* Rebuild the view in place (other modules call this after changing files). */
  function refresh(keepPanel) {
    const root = document.getElementById('view-editor');
    if (!root) return;
    if (CS.app && CS.app.view && CS.app.view !== 'editor') { rememberDoc(); return; }
    const wasOpen = state.filesOpen;
    flush();
    render(root);
    if (keepPanel && wasOpen) showFiles(true);
  }

  /* Image and sound editors call this after saving a file (undo removes or restores it). */
  function notifyFileAdded(path, previousEntry) {
    const p = project();
    if (!p) { refresh(); return; }
    if (previousEntry) pushOp(p, { k: 'replace', path: path, entry: previousEntry });
    else if (p.files[path]) pushOp(p, { k: 'remove', path: path, entry: p.files[path] });
    state.docs.delete(docKey(p, path));
    refresh();
  }

  /* Forget cached editor states (e.g. when the project is closed or replaced). */
  function reset() {
    rememberDoc();
    state.docs.clear();
    state.path = null;
  }

  CS.editor = {
    render, flush, openFile, doSave, refresh, notifyFileAdded, restoreDeleted, reset,
    undo, redo, undoContent: undo, redoContent: redo,
    toggleFullscreen, insertAtCursor, toggleFind, fontStep,
    allFolders: function () { const p = project(); return p ? allFolders(p) : []; },
    addFolder: function (path) {
      const p = project();
      if (!p) return false;
      const clean = U.normalizeRelPath(path);
      if (validNewPath(p, clean)) return false;
      const before = (p.folders || []).slice();
      p.folders = before.concat([clean]);
      pushOp(p, { k: 'folders', to: before });
      return true;
    },
    moveFile, usageSnippet,
    getContent: currentText,
    setContent: setCurrentText,
    get view() { return view; },
    get engine() { return monacoRec ? 'monaco' : (view ? 'codemirror' : (els.plain ? 'textarea' : 'none')); },
    get currentPath() { return state.path; },
    get isDirty() { return state.dirty; },
    get isFullscreen() { return state.fs; }
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = CS.editor; }
})();
