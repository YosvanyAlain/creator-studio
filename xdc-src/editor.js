/* =========================================================================
 * Webxdc Creator Studio — editor.js
 * Multi-file text editor with discreet autosave, find, native undo,
 * and image support (stored as dataURL).
 * ========================================================================= */
'use strict';
(function () {
  const CS = (globalThis.CS = globalThis.CS || {});
  const U = CS.util;

  const state = {
    path: null,          /* archivo seleccionado (texto O binario) */
    openByProject: {},   /* projectId → last open file */
    dirty: false,
    findOpen: false,
    findQuery: '',
    hist: {},            /* 'projectId::path' → [contenidos previos] (undo) */
    redo: {},            /* 'projectId::path' → [contenidos posteriores] (redo) */
    fs: false            /* editor a pantalla completa */
  };

  const AUTOSAVE_MS = 800;

  let els = {};          /* referencias DOM de la vista */

  function t(key, params) { return CS.i18n.t(key, params); }

  /* AUTO highlight (desktop yes / mobile no) with explicit override */
  function hlEnabledNow() {
    try { return CS.app.hlEnabled(); }
    catch (err) { return CS.settings.get('editorHighlight') !== false; }
  }
  function project() { return CS.projects.current; }

  function isGeneratedFile(p, path) {
    return !!(p && p.blocks && p.blocks.model && p.blocks.generatedFile === path);
  }

  /* ---------------- Guardado ---------------- */
  function doSave(silent) {
    const p = project();
    if (!p || !state.path) return Promise.resolve();
    const content = els.area ? els.area.value : null;
    if (content == null) return Promise.resolve();
    const f = p.files[state.path];
    if (!f || f.kind !== 'text') return Promise.resolve();
    if (f.content === content && !state.dirty) { setSaveState('saved'); return Promise.resolve(); }
    /* snapshot previo → undo (pila unificada de operaciones) */
    if (content !== f.content) pushOp(p, { k: 'set', path: state.path, to: f.content });
    f.content = content;
    state.dirty = false;
    setSaveState('saving');
    return CS.projects.save(p).then(function () {
      setSaveState('saved');
      if (isGeneratedFile(p, state.path)) CS.projects.markHandEdited(p, state.path);
      updateStatus();
    }).catch(function (err) {
      setSaveState('error');
      if (CS.app && CS.app.toast) CS.app.toast(t('save_failed') + ' (' + (err && err.message || err) + ')', 'error');
    });
  }

  const debouncedSave = U.debounce(function () { doSave(true); }, AUTOSAVE_MS);

  /*virtual keyboard / rotation / window resize →
   * the highlight layer must reflow to the new textarea area. */
  const onWinResize = U.debounce(function () {
    if (els.area) syncGeometry();
  }, 150);
  try { window.addEventListener('resize', onWinResize); } catch (err) { /* ignore */ }

  function flush() {
    debouncedSave.cancel();
    return doSave(true);
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
    els.saveState.textContent = t(m.key);
  }

  /* ---------------- Render ---------------- */
  function render(root) {
    const p = project();
    if (!p) {
      root.textContent = '';
      root.appendChild(emptyState());
      return;
    }
    /* do not force index.html on open; only restore if something was chosen */
    const lastPath = state.openByProject[p.id];
    state.path = (lastPath && p.files[lastPath]) ? lastPath : defaultFile(p);

    root.textContent = '';
    els = {};
    acReset();   /* la vista se re-crea; popup/espejo viejos fuera */

    /* File tree: single list (no duplicate chips). */
    els.tree = U.el('nav', { class: 'file-tree', 'aria-label': t('file_tree') });
    renderFileTree(els.tree, p);

    /* --- toolbar (mobile: two compact rows) --- */
    const tools = U.el('div', { class: 'editor-tools' });
    const row1 = U.el('div', { class: 'editor-tools-row' });
    const row2 = U.el('div', { class: 'editor-tools-row' });
    const wrapOn = CS.settings.get('editorWrap');
    row1.appendChild(U.el('button', {
      class: 'btn ghost small tree-toggle',
      title: t('file_tree'), 'aria-label': t('file_tree'),
      onclick: function () {
        if (els.layout) els.layout.classList.toggle('tree-open');
      }
    }, U.icon('folder', { size: 16 })));
    row1.appendChild(U.el('button', {
      class: 'btn ghost small', title: t('undo'), 'aria-label': t('undo'),
      onclick: function () { undo(); }
    }, U.icon('undo', { size: 16 })));
    row1.appendChild(U.el('button', {
      class: 'btn ghost small', title: t('redo'), 'aria-label': t('redo'),
      onclick: function () { redo(); }
    }, U.icon('redo', { size: 16 })));
    /* Highlight toggle: desktop only (mobile uses plain textarea). */
    if (!acMobile()) {
      const hlOn = hlEnabledNow();
      row1.appendChild(U.el('button', {
        class: 'btn ghost small' + (hlOn ? ' on' : ''),
        title: t('hl_toggle'), 'aria-label': t('hl_toggle'),
        onclick: function (e2) {
          const on = !hlEnabledNow();
          CS.settings.set('editorHighlight', on);
          lastGutterLines = -1;
          renderHighlight();
          e2.currentTarget.classList.toggle('on', on);
        }
      }, U.icon('palette', { size: 16 })));
    }
    row1.appendChild(U.el('button', {
      class: 'btn ghost small', onclick: function () { toggleFind(); },
      title: t('find'), 'aria-label': t('find')
    }, U.icon('inspect', { size: 16 }), t('find')));
    row1.appendChild(U.el('button', {
      class: 'btn ghost small' + (wrapOn ? ' on' : ''),
      title: t('wrap'), 'aria-label': t('wrap'),
      onclick: function (e) {
        const on = !CS.settings.get('editorWrap');
        CS.settings.set('editorWrap', on);
        if (els.area) els.area.wrap = on ? 'soft' : 'off';
        if (els.inner) els.inner.style.overflowWrap = on ? 'break-word' : 'normal';
        if (els.layers) els.layers.classList.toggle('wrapped', on);
        syncGeometry();
        e.currentTarget.classList.toggle('on', on);
      }
    }, U.icon('wrap', { size: 16 }), t('wrap')));
    row1.appendChild(U.el('button', {
      class: 'btn ghost small btn-keep-text', 'aria-label': t('a11y_font_smaller'), title: t('a11y_font_smaller'), onclick: function () { fontStep(-1); }
    }, 'A−'));
    row1.appendChild(U.el('button', {
      class: 'btn ghost small btn-keep-text', 'aria-label': t('a11y_font_bigger'), title: t('a11y_font_bigger'), onclick: function () { fontStep(1); }
    }, 'A+'));
    const monacoOn = !!(CS.settings && CS.settings.get('preferMonaco'));
    row1.appendChild(U.el('button', {
      class: 'btn ghost small monaco-toggle' + (monacoOn ? ' on' : ''),
      title: t('monaco_toggle'), 'aria-label': t('monaco_toggle'),
      onclick: function (ev) { toggleMonaco(ev.currentTarget); }
    }, U.icon('code', { size: 16 }), t('set_monaco')));
    row2.appendChild(U.el('button', {
      class: 'btn ghost small', onclick: function () { fileMenu(); },
      title: t('edit_file'), 'aria-label': t('edit_file')
    }, U.icon('more', { size: 16 }), t('edit_file')));
    row2.appendChild(U.el('button', {
      class: 'btn small', onclick: function () { importImage(); },
      title: t('add_image'), 'aria-label': t('add_image')
    }, U.icon('image', { size: 16 }), t('add_image')));
    if (CS.audioEditor) {
      row2.appendChild(U.el('button', {
        class: 'btn ghost small', onclick: function () { CS.audioEditor.open(); },
        title: t('tools_audio'), 'aria-label': t('tools_audio')
      }, U.icon('audio', { size: 16 }), t('tools_audio')));
    }
    if (CS.imageEditor) {
      row2.appendChild(U.el('button', {
        class: 'btn ghost small', onclick: function () { CS.imageEditor.open(); },
        title: t('tools_image'), 'aria-label': t('tools_image')
      }, U.icon('palette', { size: 16 }), t('tools_image')));
    }
    row2.appendChild(U.el('button', {
      class: 'btn ghost small', title: t('fs_open'), 'aria-label': t('fs_open'),
      onclick: function () { toggleFullscreen(true); }
    }, U.icon('expand', { size: 16 })));
    tools.appendChild(row1);
    tools.appendChild(row2);

    /* --- code area --- */
    const f = p.files[state.path];
    els.area = U.el('textarea', {
      class: 'code-area',
      spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off',
      wrap: wrapOn ? 'soft' : 'off',
      placeholder: '…',
      oninput: function () {
        state.dirty = true;
        setSaveState('dirty');
        updateStatus();
        debouncedSave();
        scheduleHl();
        acUpdate(false);   /* sugerencias mientras se escribe */
      },
      onscroll: function () { syncScroll(); acClose(); },
      onblur: function () { acClose(); },
      onkeydown: function (ev) {
        if (acKey(ev)) return;   /* el autocompletado decide primero */
        if (!els.area.readOnly && editKey(ev, els.area)) return;
        if (ev.key === 'Tab') {
          ev.preventDefault();
          insertAtCursor(els.area, '  ');
        } else if ((ev.ctrlKey || ev.metaKey) && (ev.key === 's' || ev.key === 'S')) {
          ev.preventDefault();
          flush();
        } else if (ev.key === 'Escape' && state.fs) {
          ev.preventDefault();
          toggleFullscreen(false);
        }
      },
      onkeyup: updateStatus,
      onclick: function () { updateStatus(); acClose(); }
    });
    applyEditorFont();
    if (f && f.kind === 'text') {
      els.area.value = f.content;
      els.area.readOnly = false;
    } else {
      els.area.value = '';
      els.area.readOnly = true;
    }

    /* --- find bar --- */
    els.findBar = U.el('div', { class: 'find-bar', style: { display: 'none' } });
    els.findInput = U.el('input', {
      type: 'search', placeholder: t('find_placeholder'),
      oninput: function () { state.findQuery = this.value; updateFindCount(); },
      onkeydown: function (ev) {
        if (ev.key === 'Enter') { ev.preventDefault(); findNext(ev.shiftKey ? -1 : 1); }
        if (ev.key === 'Escape') { ev.preventDefault(); toggleFind(false); }
      }
    });
    els.findCount = U.el('span', { class: 'find-count', text: '' });
    els.findBar.appendChild(els.findInput);
    els.findBar.appendChild(els.findCount);
    els.findBar.appendChild(U.el('button', { class: 'btn ghost small', 'aria-label': t('a11y_find_prev'), title: t('a11y_find_prev'), onclick: function () { findNext(-1); } }, '↑'));
    els.findBar.appendChild(U.el('button', { class: 'btn ghost small', 'aria-label': t('a11y_find_next'), title: t('a11y_find_next'), onclick: function () { findNext(1); } }, '↓'));
    els.findBar.appendChild(U.el('button', { class: 'btn ghost small', 'aria-label': t('a11y_find_close'), title: t('a11y_find_close'), onclick: function () { toggleFind(false); } }, U.icon('close', { size: 14 })));

    /* --- barra de estado --- */
    const status = U.el('div', { class: 'editor-status' });
    els.statusFile = U.el('span', { class: 'status-file' });
    els.statusPos = U.el('span', { class: 'status-pos' });
    els.saveState = U.el('span', { class: 'save-state ok' });
    status.appendChild(els.statusFile);
    status.appendChild(els.statusPos);
    status.appendChild(U.el('span', { class: 'spacer' }));
    status.appendChild(els.saveState);

    /* Highlight layer behind the textarea + line numbers.
     * Inner child (.hl-inner) moves via transform on scroll (not scrollTop)
     * to avoid iOS WebView freezes with pre-wrap and emoji metrics. */
    els.pre = U.el('pre', { class: 'hl-pre', 'aria-hidden': 'true' },
      U.el('div', { class: 'hl-inner' }));
    els.gutter = U.el('div', { class: 'code-gutter', 'aria-hidden': 'true' },
      U.el('div', { class: 'gutter-inner' }));
    els.inner = els.pre.firstChild;
    els.gutterInner = els.gutter.firstChild;
    const stage = U.el('div', { class: 'code-stage' }, els.pre, els.area);
    els.layers = U.el('div', { class: 'code-layers' }, els.gutter, stage);
    applyEditorFont();   /* also on pre/gutter (must already exist) */
    els.hlState = U.el('span', { class: 'hint' });
    status.insertBefore(els.hlState, els.saveState);
    if (!acMobile()) {
      status.insertBefore(U.el('span', { class: 'hint', text: '· ' + t('ac_hint') }), els.saveState);
    }
    els.codeWrap = U.el('div', { class: 'code-wrap' },
      els.findBar, els.layers, status);
    els.monacoHost = U.el('div', { class: 'monaco-host', style: { display: 'none' } });
    els.codeWrap.appendChild(els.monacoHost);
    els.layout = U.el('div', { class: 'editor-layout' });
    els.mainCol = U.el('div', { class: 'editor-main' });
    els.mainCol.appendChild(tools);
    els.mainCol.appendChild(els.codeWrap);
    els.treeScrim = U.el('div', { class: 'tree-scrim', onclick: closeTree });
    els.layout.appendChild(els.treeScrim);
    els.layout.appendChild(els.tree);
    els.layout.appendChild(els.mainCol);
    root.appendChild(els.layout);
    maybeMonaco();

    if (!f) {
      els.area.value = '';
      els.area.readOnly = true;
      els.area.placeholder = t('editor_select_file');
    } else if (f.kind === 'data') {
      els.area.placeholder = t('editor_binary_hint');
    }

    updateStatus();
    setSaveState('saved');
    lastGutterLines = -1;
    renderHighlight();
    state.openByProject[p.id] = state.path;

    /* Stale preview: notify the preview module if it is listening */
    if (CS.preview && CS.preview.onProjectChanged) CS.preview.onProjectChanged();
  }

  /* Monaco (opcional, OFF por defecto). El textarea nunca se destruye. */
  function maybeMonaco() {
    if (!CS.monaco || !els.monacoHost || !els.area) return;
    if (!CS.settings || !CS.settings.get('preferMonaco')) return;
    enableMonaco();
  }

  function enableMonaco(fromUser) {
    if (!CS.monaco || !els.monacoHost || !els.area) return;
    if (fromUser && CS.app && CS.app.toast) CS.app.toast(t('monaco_loading'), 'info');
    CS.monaco.load().then(function (m) {
      if (!m || !els.monacoHost || !els.area) {
        CS.settings.set('preferMonaco', false);
        if (CS.app && CS.app.toast) CS.app.toast(t('monaco_fail'), 'warn');
        return;
      }
      if (CS.monaco.disposeAll) CS.monaco.disposeAll();
      const rec = CS.monaco.attach(els.monacoHost, els.area, {
        path: state.path,
        wordWrap: CS.settings.get('editorWrap'),
        fontSize: editorFontPx(),
        minimap: false,
        mobile: !!(CS.app && CS.app.isMobile && CS.app.isMobile())
      });
      if (!rec) {
        CS.settings.set('preferMonaco', false);
        if (CS.app && CS.app.toast) CS.app.toast(t('monaco_fail'), 'warn');
        return;
      }
      els.layers.style.display = 'none';
      els.monacoHost.style.display = 'block';
      els.monacoHost.style.flex = '1';
      els.monacoHost.style.minHeight = '0';
      els.monacoHost.style.width = '100%';
      els.monacoHost.style.maxWidth = '100%';
      els.monacoHost.style.overflow = 'hidden';
      try { if (rec.editor && rec.editor.layout) rec.editor.layout(); } catch (e2) { /* ignore */ }
    }).catch(function () {
      CS.settings.set('preferMonaco', false);
      if (CS.app && CS.app.toast) CS.app.toast(t('monaco_fail'), 'warn');
    });
  }

  function disableMonaco() {
    if (CS.monaco && CS.monaco.disposeAll) CS.monaco.disposeAll();
    if (els.monacoHost) els.monacoHost.style.display = 'none';
    if (els.layers) els.layers.style.display = '';
  }

  function toggleMonaco(btn) {
    const next = !(CS.settings && CS.settings.get('preferMonaco'));
    CS.settings.set('preferMonaco', next);
    if (btn) btn.classList.toggle('on', next);
    if (next) enableMonaco(true);
    else disableMonaco();
  }

  function closeTree() {
    if (els.layout) els.layout.classList.remove('tree-open');
  }

  function renderFileTree(nav, p) {
    nav.textContent = '';
    const head = U.el('div', { class: 'file-tree-head' }, U.icon('folder', { size: 14 }), t('tree_root'));
    head.appendChild(U.el('button', {
      class: 'btn icon-tiny tree-close', title: t('close'), 'aria-label': t('close'),
      onclick: function (ev) { ev.preventDefault(); closeTree(); }
    }, U.icon('close', { size: 16 })));
    nav.appendChild(head);
    const paths = CS.projects.fileList(p);
    const root = { dirs: {}, files: [] };
    paths.forEach(function (path) {
      const parts = path.split('/');
      let node = root;
      for (let i = 0; i < parts.length - 1; i++) {
        node.dirs[parts[i]] = node.dirs[parts[i]] || { dirs: {}, files: [] };
        node = node.dirs[parts[i]];
      }
      node.files.push(path);
    });
    function paint(node, host, depth) {
      Object.keys(node.dirs).sort().forEach(function (name) {
        const det = U.el('details', { class: 'file-tree-dir', open: true });
        det.appendChild(U.el('summary', { class: 'file-tree-sum' }, U.icon('folder', { size: 14 }), name));
        const box = U.el('div', { class: 'file-tree-kids' });
        paint(node.dirs[name], box, depth + 1);
        det.appendChild(box);
        host.appendChild(det);
      });
      node.files.sort().forEach(function (path) {
        const f = p.files[path];
        const btn = U.el('button', {
          class: 'file-tree-item' + (path === state.path ? ' active' : '') + (f && f.kind === 'data' ? ' bin' : ''),
          title: path,
          onclick: function () { closeTree(); openFile(path); }
        }, U.icon(iconFor(path, f), { size: 14 }), U.basename(path));
        host.appendChild(btn);
      });
    }
    paint(root, nav, 0);
    const add = U.el('button', {
      class: 'file-tree-item add',
      onclick: addFileModal
    }, U.icon('plus', { size: 14 }), t('add_file'));
    nav.appendChild(add);
  }

  function iconFor(path, f) {
    const e = U.extname(path);
    if (f && f.kind === 'data') {
      if (/wav|mp3|ogg|m4a/.test(e)) return 'audio';
      return 'image';
    }
    if (e === 'html' || e === 'htm') return 'pages';
    if (e === 'css') return 'palette';
    if (e === 'js' || e === 'mjs') return 'code';
    if (e === 'json' || e === 'toml') return 'gear';
    if (e === 'md') return 'book';
    return 'file';
  }

  function defaultFile(p) {
    if (p.files['index.html']) return 'index.html';
    const first = CS.projects.fileList(p)[0];
    return first || null;
  }

  function emptyState() {
    return U.el('div', { class: 'empty-state card' },
      U.el('p', { text: t('editor_no_project') }),
      U.el('button', {
        class: 'btn primary', onclick: function () { CS.app.showView('projects'); }
      }, t('open_or_create')));
  }

  /* ---------------- Estado / utilidades ---------------- */
  function openFile(path) {
    const p = project();
    if (!p || !p.files[path]) return;
    if (state.path && state.dirty) flush();
    const f = p.files[path];
    /* FIX: binaries (images/sounds) are also SELECTED
     * (state.path): previously stayed on index.html and the ⋯ menu renamed or
     * deleted the last text file. */
    state.path = path;
    state.openByProject[p.id] = path;
    const root = document.getElementById('view-editor');
    if (f.kind === 'data') {
      /* Archivo binario: chip activo + visor en modal (renombrar/eliminar desde ⋯ o el visor) */
      if (root) render(root);
      binaryModal(path, f);
      return;
    }
    if (root) {
      render(root);
      if (els.area) els.area.focus();
    }
  }

  function pickLastText(p) {
    const paths = CS.projects.fileList(p).filter(function (x) { return p.files[x].kind === 'text'; });
    return paths[0] || null;
  }

  function updateStatus() {
    if (!els.area || !els.statusFile) return;
    const val = els.area.value;
    const pos = els.area.selectionStart || 0;
    const before = val.slice(0, pos);
    const line = before.split('\n').length;
    const col = pos - before.lastIndexOf('\n');
    els.statusFile.textContent = (state.path || '—') + ' · ' + U.formatBytes(U.byteLen(val));
    els.statusPos.textContent = 'Ln ' + line + ', Col ' + col;
  }

  function insertAtCursor(area, text) {
    /* execCommand conserva el undo nativo del textarea */
    try {
      area.focus();
      const ok = document.execCommand('insertText', false, text);
      if (ok) { state.dirty = true; setSaveState('dirty'); debouncedSave(); return; }
    } catch (e) { /* fallback */ }
    const s = area.selectionStart, e2 = area.selectionEnd;
    area.setRangeText(text, s, e2, 'end');
    state.dirty = true;
    setSaveState('dirty');
    debouncedSave();
  }

  function fontStep(dir) {
    const cur = editorFontPx();
    const next = U.clamp(cur + dir * 1, 10, 24);
    CS.settings.set('editorFont', next);   /* explicit from the first A−/A+ */
    applyEditorFont();
  }

  /*editorFont = null means AUTO → 10px on mobile, 13px on
   * desktop (user request after testing on mobile). */
  function editorFontPx() {
    const v = CS.settings.get('editorFont');
    if (v) return v;
    if (CS.app && CS.app.editorFontPx) return CS.app.editorFontPx();
    return 13;
  }

  function applyEditorFont() {
    const px = editorFontPx() + 'px';
    if (els.area) els.area.style.fontSize = px;
    if (els.pre) els.pre.style.fontSize = px;
    if (els.gutter) els.gutter.style.fontSize = px;
    syncGeometry();
  }

  /* ---------------- Resaltado (, ) ---------------- */
  let lastGutterLines = -1;

  const scheduleHl = U.debounce(function () { renderHighlight(); }, 90);

  function hlActive() {
    if (!els.area || !els.pre) return false;
    if (!hlEnabledNow()) return false;
    if (!state.path) return false;
    const lang = CS.hl.langFor(state.path);
    if (!lang) return false;
    if (U.byteLen(els.area.value) > CS.hl.MAX_BYTES) return false;
    /* Emojis paint TWICE (textarea + layer) because iOS draws color glyphs even when
     * text is transparent, and widths can diverge. */
    if (hasEmoji(els.area.value)) return false;
    return true;
  }

  let emojiRe = null;
  try { emojiRe = new RegExp('\\p{Extended_Pictographic}', 'u'); } catch (err) { emojiRe = null; }
  function hasEmoji(s) {
    try { return !!(emojiRe && emojiRe.test(s)); } catch (err) { return false; }
  }

  function renderHighlight() {
    if (!els.pre || !els.area || !els.layers) return;
    const setting = hlEnabledNow();
    const lang = state.path ? CS.hl.langFor(state.path) : null;
    const tooBig = setting && lang && U.byteLen(els.area.value) > CS.hl.MAX_BYTES;
    const emoji = setting && lang && hasEmoji(els.area.value);
    const active = hlActive();
    els.layers.classList.toggle('no-hl', !active);
    els.layers.classList.toggle('wrapped', !!CS.settings.get('editorWrap'));
    if (els.hlState) els.hlState.textContent = tooBig ? '(' + t('hl_big_off') + ')' : (emoji ? '(' + t('hl_emoji_off') + ')' : '');
    if (!active) { els.inner.innerHTML = ''; els.gutterInner.textContent = ''; syncScroll(); return; }
    let html = CS.hl.highlight(els.area.value, lang) || '';
    /*the textarea renders an extra empty line when the text
     * acaba en \n; el <pre> no → compensar para que el alto coincida y el
     * scroll llegue al mismo final en ambos. */
    if (els.area.value.endsWith('\n')) html += '\n';
    els.inner.innerHTML = html;
    const lines = els.area.value.split('\n').length;
    if (lines !== lastGutterLines) {
      lastGutterLines = lines;
      let s = '';
      for (let i = 1; i <= lines; i++) s += i + '\n';
      els.gutterInner.textContent = s;
    }
    syncGeometry();
    /* If this device measures lines VERY differently in the textarea vs the layer
     * (mobile WebViews), turn the layer off: better no colors than broken scroll. */
    if (Math.abs(scrollRanges.iy - scrollRanges.ay) > 220 || Math.abs(scrollRanges.ix - scrollRanges.ax) > 220) {
      els.layers.classList.add('no-hl');
      if (els.hlState) els.hlState.textContent = '(' + t('hl_drift_off') + ')';
      return;
    }
    syncScroll();
  }

  /* The <pre> and gutter must mirror textarea scroll.
   * (mobile freeze fix): only copy scroll positions (cheap); geometry measured outside. */
  /*scroll ranges measured OUTSIDE scroll (on edit or
   * geometry change): zero layout work while scrolling. */
  const scrollRanges = { ax: 0, ay: 0, ix: 0, iy: 0 };
  function measureScrollRanges() {
    if (!els.area || !els.inner || !els.pre) return;
    /* Textarea and overlay must break lines EXACTLY the same.
   * Use the real textarea wrap attribute (changed by the button and settings). */
    const ws = els.area.wrap === 'off' ? 'pre' : 'pre-wrap';
    const ow = els.area.wrap === 'off' ? 'normal' : 'break-word';
    if (els.area.style.whiteSpace !== ws) els.area.style.whiteSpace = ws;
    if (els.area.style.overflowWrap !== ow) els.area.style.overflowWrap = ow;
    if (els.inner.style.whiteSpace !== ws) els.inner.style.whiteSpace = ws;
    if (els.inner.style.overflowWrap !== ow) els.inner.style.overflowWrap = ow;
    scrollRanges.ax = Math.max(0, els.area.scrollWidth - els.area.clientWidth);
    scrollRanges.ay = Math.max(0, els.area.scrollHeight - els.area.clientHeight);
    scrollRanges.ix = Math.max(0, els.inner.scrollWidth - els.pre.clientWidth);
    scrollRanges.iy = Math.max(0, els.inner.scrollHeight - els.pre.clientHeight);
  }

  function syncScroll() {
    if (!els.area || !els.inner) return;
    /* PROPORTIONAL mapping. If the layer measures differently than the textarea
   * (line rounding on mobile WebViews), the layer end could drift. */
    const map = function (v, from, to) {
      if (to <= 0) return 0;
      if (from <= 0) return to;
      return Math.round(v * to / from);
    };
    const tx = map(els.area.scrollLeft, scrollRanges.ax, scrollRanges.ix);
    const ty = map(els.area.scrollTop, scrollRanges.ay, scrollRanges.iy);
    els.inner.style.transform = 'translate(' + (-tx) + 'px, ' + (-ty) + 'px)';
    if (els.gutterInner) els.gutterInner.style.transform = 'translateY(' + (-ty) + 'px)';
  }

  let geomW = 0, geomH = 0;
  function syncGeometry() {
    if (!els.area || !els.pre) return;
    const w = els.area.clientWidth, h = els.area.clientHeight;
    /* write only if changed (less style invalidation) */
    if (w && w !== geomW) { geomW = w; els.pre.style.width = w + 'px'; }
    if (h && h !== geomH) { geomH = h; els.pre.style.height = h + 'px'; if (els.gutter) els.gutter.style.height = h + 'px'; }
    measureScrollRanges();   /* fresh ranges after every geometry change */
  }

  /* ---------- auto-close pairs and auto-indent () ---------- */
  const PAIRS = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };
  const CLOSERS = new Set([')', ']', '}', '"', "'", '`']);

  function insertText(area, text) {
    try {
      area.focus();
      if (document.execCommand('insertText', false, text)) {
        state.dirty = true; setSaveState('dirty'); debouncedSave();
        return true;
      }
    } catch (err) { /* jsdom: fallback */
    }
    const a = area.selectionStart, b = area.selectionEnd;
    area.setRangeText(text, a, b, 'end');
    state.dirty = true; setSaveState('dirty'); debouncedSave();
    return true;
  }

  /* returns true if the key was consumed */
  function editKey(ev, area) {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return false;
    const c = ev.key;
    const s = area.selectionStart, e = area.selectionEnd;
    const val = area.value;

    if (PAIRS[c]) {
      ev.preventDefault();
      const close = PAIRS[c];
      if (s !== e) {           /* wrap the selection */
        const sel = val.slice(s, e);
        insertText(area, c + sel + close);
        area.setSelectionRange(s + 1, e + 1);
      } else {
        if ((c === '"' || c === "'" || c === '`') && val[e] === c) {
          area.setSelectionRange(e + 1, e + 1);   /* saltar el cierre existente */
        } else {
          insertText(area, c + close);
          area.setSelectionRange(s + 1, s + 1);
        }
      }
      scheduleHl();
      return true;
    }
    if (CLOSERS.has(c) && s === e && val[e] === c) {
      ev.preventDefault();
      area.setSelectionRange(e + 1, e + 1);
      return true;
    }
    if (c === 'Enter' && s === e) {
      ev.preventDefault();
      const lineStart = val.lastIndexOf('\n', s - 1) + 1;
      const line = val.slice(lineStart, s);
      let ind = (line.match(/^[ \t]*/) || [''])[0];
      const trimmed = line.replace(/[ \t]+$/, '');
      if (/[{[(]$/.test(trimmed) || trimmed.endsWith('>')) ind += '  ';
      insertText(area, '\n' + ind);
      scheduleHl();
      return true;
    }
    return false;
  }

  /* ================ autocomplete (desktop only) ================
 * Code suggestions while typing: project words, DOM helpers, webxdc APIs. */
  function acMobile() {
    try { return CS.app.isMobile(); } catch (err) { return false; }
  }

  const AC_API = {
    console: ['log()', 'warn()', 'error()', 'info()'],
    document: ['getElementById()', 'querySelector()', 'querySelectorAll()', 'createElement()', 'addEventListener()', 'body', 'title'],
    window: ['addEventListener()', 'innerWidth', 'innerHeight', 'requestAnimationFrame()'],
    webxdc: ['sendUpdate()', 'setUpdateListener()', 'sendToChat()', 'selfName', 'selfAddr', 'getStatusIcon()'],
    Math: ['floor()', 'ceil()', 'round()', 'random()', 'max()', 'min()', 'abs()', 'sqrt()', 'pow()'],
    JSON: ['stringify()', 'parse()'],
    localStorage: ['getItem()', 'setItem()', 'removeItem()']
  };
  const AC_JS = [
    'function', 'return', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'do',
    'switch', 'case', 'default', 'break', 'continue', 'typeof', 'instanceof', 'new',
    'class', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'this', 'of', 'in',
    'true', 'false', 'null', 'undefined',
    'console', 'document', 'window', 'webxdc', 'Math', 'JSON', 'localStorage',
    'setTimeout()', 'setInterval()', 'clearTimeout()', 'clearInterval()', 'requestAnimationFrame()',
    'parseInt()', 'parseFloat()', 'alert()'
  ];
  const AC_CSS = [
    'display', 'position', 'flex', 'flex-direction', 'flex-wrap', 'justify-content',
    'align-items', 'align-content', 'align-self', 'order', 'flex-grow', 'flex-shrink',
    'gap', 'grid-template-columns', 'grid-area', 'margin', 'margin-top', 'margin-bottom',
    'padding', 'padding-top', 'padding-bottom', 'color', 'background', 'background-color',
    'border', 'border-radius', 'box-sizing', 'box-shadow', 'font', 'font-size',
    'font-weight', 'font-family', 'line-height', 'text-align', 'text-decoration',
    'letter-spacing', 'text-transform', 'white-space', 'width', 'min-width', 'max-width',
    'height', 'min-height', 'max-height', 'overflow', 'overflow-x', 'overflow-y',
    'opacity', 'transition', 'transform', 'z-index', 'cursor', 'pointer-events',
    'user-select', 'touch-action', 'top', 'left', 'right', 'bottom', 'inset',
    'object-fit', 'visibility', 'content', 'filter'
  ];
  const AC_HTML = [
    'div', 'span', 'p', 'a', 'img', 'button', 'input', 'label', 'form', 'canvas',
    'svg', 'script', 'style', 'link', 'meta', 'title', 'h1', 'h2', 'h3', 'ul', 'ol',
    'li', 'header', 'main', 'section', 'footer', 'nav', 'table', 'video', 'audio',
    'select', 'option', 'textarea', 'strong', 'em', 'br', 'hr'
  ];

  const ac = { pop: null, mirror: null, items: [], sel: 0, open: false, tokenStart: 0, pauseToken: null };
  function acReset() {
    ac.pop = null; ac.mirror = null; ac.items = []; ac.sel = 0;
    ac.open = false; ac.tokenStart = 0; ac.pauseToken = null;
  }

  function acLang() {
    try { return (state.path && CS.hl.langFor(state.path)) || 'js'; } catch (err) { return 'js'; }
  }

  function acToItem(word, kind) {
    const it = { label: word, insert: word, kind: kind };
    if (word.slice(-2) === '()') it.cursor = word.length - 1;   /* cursor between parentheses */
    return it;
  }

  /* Motor PURO (exportado para tests): dado un prefijo, el lenguaje, las
   * palabras del documento y (opcional) el objeto tras un punto, devuelve
   * las sugerencias ordenadas. */
  function acSuggest(prefix, lang, docWords, qualified, keepExact) {
    prefix = (prefix || '').toLowerCase();
    const out = [];
    const starts = function (w) {
      if (!prefix) return true;
      if (w.toLowerCase().indexOf(prefix) !== 0) return false;
      if (!keepExact && w.toLowerCase() === prefix) return false;   /* ya escrita */
      return true;
    };
    if (qualified) {
      const list = AC_API[qualified] || [];
      for (const w of list) if (starts(w)) out.push(acToItem(w, 'api'));
      return out.slice(0, 8);
    }
    if (docWords) for (const w of docWords) if (starts(w)) out.push(acToItem(w, 'doc'));
    if (lang === 'css') {
      for (const w of AC_CSS) if (starts(w)) out.push({ label: w, insert: w + ': ', kind: 'css' });
    } else if (lang === 'html') {
      for (const w of AC_HTML) if (starts(w)) out.push(acToItem(w, 'tag'));
    } else {
      for (const w of AC_JS) if (starts(w)) out.push(acToItem(w, w.indexOf('(') >= 0 ? 'api' : (JS_KW.has(w) ? 'kw' : 'api')));
    }
    return out.slice(0, 8);
  }
  const JS_KW = new Set(['function', 'return', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'typeof', 'instanceof', 'new', 'class', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'this', 'of', 'in', 'true', 'false', 'null', 'undefined']);

  function acDocWords() {
    const val = els.area ? els.area.value : '';
    if (!val || val.length > 150000) return [];
    const out = [], seen = Object.create(null);
    const re = /[A-Za-z_$][\w$]{2,}/g;
    let m;
    while ((m = re.exec(val)) !== null) {
      const w = m[0];
      if (!seen[w]) { seen[w] = 1; out.push(w); if (out.length >= 300) break; }
    }
    return out;
  }

  function acTokenAt() {
    const a = els.area;
    if (!a) return null;
    const pos = a.selectionStart || 0;
    if (pos !== (a.selectionEnd || 0)) return null;
    const before = a.value.slice(0, pos);
    let m = /([\w$]+)\.([\w$]*)$/.exec(before);
    if (m) return { word: m[2], start: pos - m[2].length, obj: m[1] };
    m = /[\w]+$/.exec(before);
    if (m) return { word: m[0], start: pos - m[0].length, obj: null };
    return null;
  }

  function acClose() {
    ac.open = false;
    if (ac.pop && ac.pop.parentNode) ac.pop.parentNode.removeChild(ac.pop);
  }

  function acUpdate(force) {
    if (!els.area || els.area.readOnly || acMobile() || !els.codeWrap) { acClose(); return; }
    const tk = acTokenAt();
    if (!tk) { ac.pauseToken = null; if (!force) { acClose(); return; } }
    if (!force && ac.pauseToken) {
      if (tk && tk.word && tk.word.toLowerCase() === ac.pauseToken) { acClose(); return; }
      ac.pauseToken = null;
    }
    const items = tk
      ? acSuggest(tk.word, acLang(), tk.obj ? [] : acDocWords(), tk.obj, !!force)
      : acSuggest('', acLang(), [], null, true);   /* Ctrl+Espacio sin palabra */
    if (!items.length) { acClose(); return; }
    if (!force && !tk.obj && tk.word.length < 2) { acClose(); return; }
    ac.sel = 0;
    acRender(items, tk);
  }

  function acRender(items, tk) {
    if (!ac.pop) ac.pop = U.el('div', { class: 'ac-pop', role: 'listbox' });
    if (ac.pop.parentNode !== els.codeWrap) els.codeWrap.appendChild(ac.pop);
    ac.pop.textContent = '';
    items.forEach(function (it, i) {
      ac.pop.appendChild(U.el('div', {
        class: 'ac-item' + (i === ac.sel ? ' sel' : ''),
        role: 'option',
        'aria-selected': i === ac.sel ? 'true' : 'false',
        onmousedown: function (ev) { ev.preventDefault(); acAccept(i); }
      },
        U.el('span', { class: 'ac-word', text: it.label }),
        U.el('span', { class: 'ac-kind', text: t('ac_kind_' + it.kind) })));
    });
    ac.items = items;
    ac.tokenStart = tk ? tk.start : (els.area ? els.area.selectionStart || 0 : 0);
    ac.open = true;
    acPlace();
  }

  /* Hidden mirror with the SAME font/padding/width as the textarea to
   * know the cursor pixel position (works with word-wrap too). */
  function acCaretXY() {
    const a = els.area;
    if (!a || !els.codeWrap) return null;
    try {
      if (!ac.mirror || !ac.mirror.isConnected) {
        ac.mirror = U.el('div', { class: 'ac-mirror', 'aria-hidden': 'true' });
        els.codeWrap.appendChild(ac.mirror);
      }
      const cs = getComputedStyle(a);
      const st = ac.mirror.style;
      st.fontFamily = cs.fontFamily; st.fontSize = cs.fontSize; st.fontWeight = cs.fontWeight;
      st.lineHeight = cs.lineHeight; st.letterSpacing = cs.letterSpacing; st.tabSize = cs.tabSize;
      st.paddingTop = cs.paddingTop; st.paddingRight = cs.paddingRight;
      st.paddingBottom = cs.paddingBottom; st.paddingLeft = cs.paddingLeft;
      st.borderTopWidth = cs.borderTopWidth; st.borderLeftWidth = cs.borderLeftWidth;
      st.boxSizing = 'border-box';
      st.width = a.clientWidth + 'px';
      st.whiteSpace = a.wrap === 'off' ? 'pre' : 'pre-wrap';
      st.overflowWrap = a.wrap === 'off' ? 'normal' : 'break-word';
      ac.mirror.textContent = '';
      ac.mirror.appendChild(document.createTextNode(a.value.slice(0, a.selectionStart || 0)));
      const mark = U.el('span', { text: '\u200b' });
      ac.mirror.appendChild(mark);
      const ar = a.getBoundingClientRect(), wr = els.codeWrap.getBoundingClientRect();
      const lineH = parseFloat(cs.lineHeight) || 18;
      return {
        x: (ar.left - wr.left) + mark.offsetLeft - a.scrollLeft,
        y: (ar.top - wr.top) + mark.offsetTop - a.scrollTop,
        lineH: lineH
      };
    } catch (err) { return null; }
  }

  function acPlace() {
    if (!ac.pop || !els.codeWrap) return;
    const pt = acCaretXY();
    ac.pop.style.visibility = 'hidden';
    ac.pop.style.display = '';
    const pw = ac.pop.offsetWidth || 220, ph = ac.pop.offsetHeight || 90;
    const cw = els.codeWrap.clientWidth || 300, ch = els.codeWrap.clientHeight || 300;
    let x = (pt ? pt.x : 6) + 2;
    let y = (pt ? pt.y : 6) + ((pt && pt.lineH) || 18) + 2;
    if (x + pw > cw - 4) x = Math.max(4, cw - pw - 4);
    if (y + ph > ch - 2) y = Math.max(4, (pt ? pt.y : 6) - ph - 4);   /* encima del cursor */
    ac.pop.style.left = x + 'px';
    ac.pop.style.top = y + 'px';
    ac.pop.style.visibility = '';
    acScrollSel();
  }

  function acScrollSel() {
    if (!ac.pop) return;
    const el = ac.pop.children[ac.sel];
    if (!el) return;
    const pr = ac.pop.getBoundingClientRect(), er = el.getBoundingClientRect();
    if (er.bottom > pr.bottom + 1) ac.pop.scrollTop += er.bottom - pr.bottom;
    else if (er.top < pr.top - 1) ac.pop.scrollTop -= pr.top - er.top;
  }

  function acPaint() {
    if (!ac.pop) return;
    Array.prototype.forEach.call(ac.pop.children, function (el, i) {
      const sel = i === ac.sel;
      el.className = 'ac-item' + (sel ? ' sel' : '');
      el.setAttribute('aria-selected', sel ? 'true' : 'false');
    });
    acScrollSel();
  }

  function acAccept(i) {
    const it = ac.items[i];
    if (!it || !els.area) { acClose(); return; }
    const a = els.area;
    const pos = a.selectionStart || 0;
    const tk = acTokenAt();
    const start = tk ? tk.start : pos;
    a.focus();
    try { a.setSelectionRange(start, pos); } catch (err) { acClose(); return; }
    insertAtCursor(a, it.insert);
    if (typeof it.cursor === 'number') {
      try { a.setSelectionRange(start + it.cursor, start + it.cursor); } catch (err) { /* ignore */ }
    }
    ac.pauseToken = (it.insert || '').toLowerCase();
    acClose();
  }

  function acKey(ev) {
    if (acMobile() || !els.area || els.area.readOnly) return false;
    const key = ev.key;
    if ((ev.ctrlKey || ev.metaKey) && (key === ' ' || key === 'Spacebar')) {
      ev.preventDefault();
      acUpdate(true);
      return true;
    }
    if (!ac.open || !ac.pop || !ac.items.length) return false;
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      ev.preventDefault();
      ac.sel = (ac.sel + (key === 'ArrowDown' ? 1 : -1) + ac.items.length) % ac.items.length;
      acPaint();
      return true;
    }
    if (key === 'Tab' || (key === 'Enter' && !ev.shiftKey)) {
      ev.preventDefault();
      acAccept(ac.sel);
      return true;
    }
    if (key === 'Escape') {
      ev.preventDefault();
      ac.pauseToken = null;
      acClose();
      return true;
    }
    return false;
  }

  /* ---------------- Unified undo / redo ----------------
 * One stack per project covering content EDITS and structural FILE ops. */
  const HIST_MAX = 100;

  function pushOp(p, op) {
    const st = state.hist[p.id] || (state.hist[p.id] = []);
    /* dedupe consecutive identical snapshots of the same file */
    const top = st[st.length - 1];
    if (op.k === 'set' && top && top.k === 'set' && top.path === op.path && top.to === op.to) return;
    st.push(op);
    if (st.length > HIST_MAX) st.shift();
    state.redo[p.id] = [];   /* a new action invalidates the redo branch */
  }

  /* Apply an op and return its inverse, or null if stale (discarded). */
  function applyOp(p, op) {
    if (op.k === 'set') {
      const f = p.files[op.path];
      if (!f || f.kind !== 'text') return null;
      const cur = (state.path === op.path && els.area) ? els.area.value : f.content;
      if (cur === op.to) return null;
      f.content = op.to;
      if (state.path === op.path && els.area) els.area.value = op.to;
      if (state.path === op.path) scheduleHl();
      state.dirty = false;
      debouncedSave.cancel();
      setSaveState('saving');
      CS.projects.save(p).then(function () {
        setSaveState('saved'); updateStatus();
      }).catch(function () { setSaveState('error'); });
      updateStatus();
      return { k: 'set', path: op.path, to: cur };
    }
    if (op.k === 'add') {              /* (re)crear archivo */
      if (p.files[op.path]) return null;
      if (!op.entry) return null;
      try { CS.projects.fileSet(p, op.path, op.entry); }
      catch (e) { return null; }
      CS.projects.save(p).catch(function () {});
      refresh();
      return { k: 'remove', path: op.path, entry: op.entry };
    }
    if (op.k === 'remove') {           /* eliminar archivo */
      const cur = p.files[op.path];
      if (!cur) return null;
      CS.projects.fileDelete(p, op.path);
      if (state.openByProject[p.id] === op.path) delete state.openByProject[p.id];
      if (state.path === op.path) state.path = defaultFile(p);
      CS.projects.save(p).catch(function () {});
      refresh();
      return { k: 'add', path: op.path, entry: cur };
    }
    if (op.k === 'ren') {              /* renombrar from → to */
      if (!p.files[op.from] || p.files[op.to]) return null;
      try { CS.projects.fileRename(p, op.from, op.to).catch(function () {}); }
      catch (e) { return null; }
      if (state.openByProject[p.id] === op.from) state.openByProject[p.id] = op.to;
      if (state.path === op.from) state.path = op.to;
      CS.projects.save(p).catch(function () {});
      refresh();
      return { k: 'ren', from: op.to, to: op.from };
    }
    if (op.k === 'replace') {          /* restore previous data entry (overwrite undo) */
      if (!op.entry) return null;
      const cur = p.files[op.path] || null;
      try { CS.projects.fileSet(p, op.path, op.entry); }
      catch (e) { return null; }
      CS.projects.save(p).catch(function () {});
      refresh();
      return { k: 'replace', path: op.path, entry: cur };
    }
    return null;
  }

  function toastOp(op, isRedo) {
    let msg;
    if (op.k === 'set') msg = t('undo_edit', { file: U.basename(op.path) });
    else if (op.k === 'add') msg = t('restored_ok', { file: U.basename(op.path) });
    else if (op.k === 'remove') msg = t('file_deleted', { file: U.basename(op.path) });
    else msg = t('renamed_path', { from: op.from, to: op.to });
    CS.app.toast((isRedo ? '↷ ' : '↶ ') + msg);
  }

  function undo() {
    const p = project();
    if (!p) { CS.app.toast(t('undo_empty'), 'warn'); return false; }
    const st = state.hist[p.id] || [];
    while (st.length) {
      const op = st[st.length - 1];
      const inv = applyOp(p, op);
      st.pop();
      if (inv) {
        (state.redo[p.id] || (state.redo[p.id] = [])).push(inv);
        toastOp(op, false);
        return true;
      }
      /* stale op (state already changed): discard and try the previous one */
    }
    CS.app.toast(t('undo_empty'), 'warn');
    return false;
  }

  function redo() {
    const p = project();
    if (!p) { CS.app.toast(t('redo_empty'), 'warn'); return false; }
    const rd = state.redo[p.id] || [];
    while (rd.length) {
      const op = rd[rd.length - 1];
      const inv = applyOp(p, op);
      rd.pop();
      if (inv) {
        (state.hist[p.id] || (state.hist[p.id] = [])).push(inv);
        toastOp(op, true);
        return true;
      }
    }
    CS.app.toast(t('redo_empty'), 'warn');
    return false;
  }

  /* Point restore (Undo button on the delete toast):
   * does not consume the stack — removes the matching op and restores. */
  function restoreDeleted(path, fallbackEntry) {
    const p = project();
    if (!p) return;
    const st = state.hist[p.id] || [];
    let entry = fallbackEntry || null;
    for (let i = st.length - 1; i >= 0; i--) {
      if (st[i].k === 'add' && st[i].path === path) { entry = st[i].entry; st.splice(i, 1); break; }
    }
    if (p.files[path]) { refresh(); return; }   /* ya restaurado (p. ej. con ↶) */
    if (!entry) return;
    try { CS.projects.fileSet(p, path, entry); }
    catch (e) { CS.app.toast(t('err_generic') + ': ' + e.message, 'error'); return; }
    state.redo[p.id] = [];
    CS.projects.save(p).then(function () {
      refresh();
      CS.app.toast(t('restored_ok', { file: U.basename(path) }));
    }).catch(function () {});
  }

  /* Re-render the editor view WITHOUT leaving it. Image/audio editors save assets
   * from a modal and the chip list must refresh immediately. */
  function refresh() {
    const root = document.getElementById('view-editor');
    if (!root) return;
    if (CS.app && CS.app.view && CS.app.view !== 'editor') return;
    flush();   /* no perder contenido sin guardar del textarea */
    render(root);
  }

  /*lo llaman los editores de imagen/sonido tras guardar un
   * archivo: registra el alta para el undo (↶ la quita) y refresca. */
  function notifyFileAdded(path, previousEntry) {
    const p = project();
    if (!p) { refresh(); return; }
    if (previousEntry) {
      /* overwrite: undo restores previous entry content */
      pushOp(p, { k: 'replace', path: path, entry: previousEntry, current: p.files[path] });
    } else if (p.files[path]) {
      /* brand-new file: undo removes it */
      pushOp(p, { k: 'remove', path: path, entry: p.files[path] });
    }
    refresh();
  }

  /* ---------------- Pantalla completa ---------------- */
  function toggleFullscreen(force) {
    const on = force === undefined ? !state.fs : force;
    state.fs = on;
    if (els.codeWrap) {
      els.codeWrap.classList.toggle('fs', on);
      if (on) {
        const bar = U.el('div', { class: 'fs-bar' },
          U.el('span', { class: 'mono fs-file', text: state.path || '' }),
          U.el('span', { class: 'spacer' }),
          U.el('button', { class: 'btn ghost small', 'aria-label': t('a11y_font_smaller'), title: t('a11y_font_smaller'), onclick: function () { fontStep(-1); } }, 'A−'),
          U.el('button', { class: 'btn ghost small', 'aria-label': t('a11y_font_bigger'), title: t('a11y_font_bigger'), onclick: function () { fontStep(1); } }, 'A+'),
          U.el('button', { class: 'btn ghost small', 'aria-label': t('a11y_find_open'), title: t('a11y_find_open'), onclick: function () { toggleFind(); } }, U.icon('inspect', { size: 16 })),
          U.el('button', { class: 'btn small fs-exit', onclick: function () { toggleFullscreen(false); } }, U.icon('close', { size: 16 }), t('fs_close')));
        els.codeWrap.insertBefore(bar, els.codeWrap.firstChild);
      } else {
        const bar = els.codeWrap.querySelector('.fs-bar');
        if (bar) bar.remove();
      }
    }
    /* Lock background scroll while the code window covers the full viewport (incl. mobile). */
    try { document.body.classList.toggle('fs-open', on); } catch (e) { /* ignore */ }
    /* NOTE: no re-render on exit: textarea keeps content and pending autosave
   * (re-rendering would lose unsaved text). */
    setTimeout(function () { syncGeometry(); }, 80);   /* new geometry */
    if (els.area && on) setTimeout(function () { els.area.focus(); }, 60);
  }

  /* ---------------- Search ---------------- */
  function toggleFind(force) {
    state.findOpen = force === undefined ? !state.findOpen : force;
    if (els.findBar) els.findBar.style.display = state.findOpen ? 'flex' : 'none';
    if (state.findOpen && els.findInput) {
      els.findInput.focus();
      els.findInput.select();
      updateFindCount();
    }
  }

  function updateFindCount() {
    if (!els.findCount) return;
    const q = state.findQuery;
    if (!q) { els.findCount.textContent = ''; return; }
    const n = countMatches(els.area.value, q);
    els.findCount.textContent = n ? n + '×' : t('find_none');
  }

  function countMatches(hay, needle) {
    if (!needle) return 0;
    let n = 0, i = 0;
    const h = hay, nd = needle;
    while ((i = h.indexOf(nd, i)) >= 0) { n++; i += nd.length; }
    return n;
  }

  function findNext(dir) {
    const area = els.area;
    if (!area || !state.findQuery) return;
    const q = state.findQuery;
    const val = area.value;
    let idx;
    if (dir > 0) {
      idx = val.indexOf(q, area.selectionEnd);
      if (idx < 0) idx = val.indexOf(q, 0);
    } else {
      idx = val.lastIndexOf(q, Math.max(0, area.selectionStart - 1));
      if (idx < 0) idx = val.lastIndexOf(q);
    }
    if (idx < 0) { if (els.findCount) els.findCount.textContent = t('find_none'); return; }
    area.focus();
    area.setSelectionRange(idx, idx + q.length);
    /* scroll approximately to the line */
    const line = val.slice(0, idx).split('\n').length;
    const lineH = parseFloat(getComputedStyle(area).lineHeight) || 20;
    area.scrollTop = Math.max(0, (line - 3) * lineH);
    updateStatus();
    if (els.findCount) els.findCount.textContent = countMatches(val, q) + '×';
  }

  /* ---------------- Acciones de archivo ---------------- */
  function fileMenu() {
    const p = project();
    if (!p) return;
    if (!state.path) {
      CS.app.toast(t('edit_select_first'), 'info');
      return;
    }
    const path = state.path;
    const f = p.files[path];
    const items = [];
    if (f && f.kind === 'data') {
      const mime = (f.mime || '');
      if (mime.indexOf('image') === 0 || /\.(png|jpe?g|gif|webp|svg)$/i.test(path)) {
        if (CS.imageEditor) {
          items.push({ icon: 'palette', label: t('tools_image'), fn: function () { CS.imageEditor.open(); } });
        }
      }
      if (mime.indexOf('audio') === 0 || /\.(wav|mp3|ogg)$/i.test(path)) {
        if (CS.audioEditor) {
          items.push({ icon: 'audio', label: t('tools_audio'), fn: function () { CS.audioEditor.open(); } });
        }
      }
    }
    items.push({ icon: 'pencil', label: t('rename_file'), fn: renameFileModal });
    if (f && f.kind === 'text') {
      items.push({ icon: 'copy', label: t('duplicate_file'), fn: duplicateFileModal });
    }
    items.push({ icon: 'trash', label: t('delete_file'), fn: deleteFileModal, danger: true });
    CS.app.sheet({ title: path, items: items });
  }

  function addFileModal() {
    const p = project();
    if (!p) return;
    CS.app.prompt({
      title: t('add_file'),
      label: t('file_path_label'),
      value: 'nuevo.js',
      validate: function (v) {
        const clean = U.normalizeRelPath(v);
        if (!clean || !U.isSafePath(clean)) return t('err_bad_path');
        if (clean.toLowerCase() === 'webxdc.js') return t('err_no_webxdc_js');
        if (p.files[clean]) return t('err_file_exists');
        if (!U.isTextFile(clean)) return t('err_text_only_here');
        return null;
      }
    }).then(function (value) {
      if (!value) return;
      const clean = U.normalizeRelPath(value);
      const stub = stubFor(clean);
      try {
        CS.projects.fileSet(p, clean, { kind: 'text', content: stub });
      } catch (e) {
        CS.app.toast(t('err_generic') + ': ' + e.message, 'error');
        return;
      }
      pushOp(p, { k: 'remove', path: clean, entry: p.files[clean] });   /* ↶ lo quita */
      CS.projects.save(p).then(function () {
        state.path = clean;
        render(document.getElementById('view-editor'));
      });
    });
  }

  function stubFor(path) {
    const e = U.extname(path);
    if (e === 'html' || e === 'htm') {
      return [
        '<!DOCTYPE html>',
        '<html lang="es">',
        '<head>',
        '  <meta charset="utf-8">',
        '  <meta name="viewport" content="width=device-width, initial-scale=1">',
        '  <title>Página</title>',
        '  <script src="webxdc.js"><\/script>',
        '</head>',
        '<body>',
        '  <p>Nueva página</p>',
        '</body>',
        '</html>',
        ''
      ].join('\n');
    }
    if (e === 'css') return '/* ' + path + ' */\n';
    if (e === 'json') return '{\n}\n';
    if (e === 'md') return '# ' + U.basename(path) + '\n';
    if (e === 'js' || e === 'mjs') return '// ' + path + '\n';
    return '';
  }

  function renameFileModal() {
    const p = project();
    if (!p || !state.path) return;
    const from = state.path;
    CS.app.prompt({
      title: t('rename_file'),
      label: t('file_path_label'),
      value: from,
      validate: function (v) {
        const clean = U.normalizeRelPath(v);
        if (!clean || !U.isSafePath(clean)) return t('err_bad_path');
        if (clean.toLowerCase() === 'webxdc.js') return t('err_no_webxdc_js');
        if (clean !== from && p.files[clean]) return t('err_file_exists');
        return null;
      }
    }).then(async function (value) {
      if (!value) return;
      try {
        const to = await CS.projects.fileRename(p, from, value);
        pushOp(p, { k: 'ren', from: to, to: from });   /* ↶ lo revierte */
        if (state.openByProject[p.id] === from) state.openByProject[p.id] = to;
        state.path = to;
        await CS.projects.save(p);
        render(document.getElementById('view-editor'));
        CS.app.toast(t('renamed_ok'));
      } catch (e) {
        CS.app.toast(t('err_generic') + ': ' + e.message, 'error');
      }
    });
  }

  function duplicateFileModal() {
    const p = project();
    if (!p || !state.path) return;
    const from = state.path;
    const dot = from.lastIndexOf('.');
    const copy = dot > 0 ? from.slice(0, dot) + '-copia' + from.slice(dot) : from + '-copia';
    if (p.files[copy]) { CS.app.toast(t('err_file_exists'), 'error'); return; }
    try {
      CS.projects.fileSet(p, copy, { kind: p.files[from].kind, content: p.files[from].content, dataUrl: p.files[from].dataUrl, mime: p.files[from].mime, size: p.files[from].size });
      pushOp(p, { k: 'remove', path: copy, entry: p.files[copy] });   /* ↶ lo quita */
      CS.projects.save(p).then(function () {
        state.path = copy;
        render(document.getElementById('view-editor'));
        CS.app.toast(t('duplicated_ok') + ' → ' + copy);
      });
    } catch (e) {
      CS.app.toast(t('err_generic') + ': ' + e.message, 'error');
    }
  }

  function deleteFileModal() {
    const p = project();
    if (!p || !state.path) return;
    const path = state.path;
    CS.app.confirm({
      title: t('delete_file'),
      message: t('delete_file_confirm', { file: path }),
      danger: true,
      okLabel: t('delete')
    }).then(function (yes) {
      if (!yes) return;
      const backupEntry = p.files[path];   /* para «Deshacer» () */
      CS.projects.fileDelete(p, path);
      pushOp(p, { k: 'add', path: path, entry: backupEntry });   /* ↶ lo restaura */
      if (state.openByProject[p.id] === path) delete state.openByProject[p.id];
      state.path = defaultFile(p);
      CS.projects.save(p).then(function () {
        render(document.getElementById('view-editor'));
        CS.app.toast(t('file_deleted', { file: U.basename(path) }), 'warn', {
          ttl: 7000,
          action: {
            label: t('undo'),
            fn: function () { restoreDeleted(path, backupEntry); }
          }
        });
      });
    });
  }

  /* ---------------- Images ---------------- */
  function importImage() {
    const p = project();
    if (!p) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml';
    input.onchange = function () {
      const file = input.files && input.files[0];
      if (!file) return;
      if (file.size > 1.5 * 1024 * 1024) {
        CS.app.toast(t('err_image_too_big'), 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = function () {
        const dataUrl = String(reader.result || '');
        CS.app.prompt({
          title: t('add_image'),
          label: t('file_path_label'),
          value: 'assets/' + U.sanitizeFileName(file.name || 'imagen'),
          validate: function (v) {
            const clean = U.normalizeRelPath(v);
            if (!clean || !U.isSafePath(clean)) return t('err_bad_path');
            if (clean.toLowerCase() === 'webxdc.js') return t('err_no_webxdc_js');
            if (p.files[clean]) return t('err_file_exists');
            return null;
          }
        }).then(function (value) {
          if (!value) return;
          const clean = U.normalizeRelPath(value);
          try {
            CS.projects.fileSet(p, clean, { kind: 'data', dataUrl: dataUrl, mime: file.type || 'image/png', size: file.size });
          } catch (e) {
            CS.app.toast(t('err_generic') + ': ' + e.message, 'error');
            return;
          }
          pushOp(p, { k: 'remove', path: clean, entry: p.files[clean] });   /* ↶ lo quita */
          CS.projects.save(p).then(function () {
            render(document.getElementById('view-editor'));
            CS.app.toast(t('image_added') + ' (' + U.formatBytes(file.size) + ')');
          });
        });
      };
      reader.onerror = function () { CS.app.toast(t('err_read_file'), 'error'); };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  function binaryModal(path, f) {
    const img = U.el('img', { src: f.dataUrl, alt: path, class: 'bin-preview' });
    const meta = U.el('p', { class: 'hint', text: path + ' · ' + (f.mime || '?') + ' · ' + U.formatBytes(f.size || 0) });
    CS.app.modal({
      title: U.basename(path),
      body: U.el('div', { class: 'bin-modal' }, img, meta),
      actions: [
        { label: t('rename_file'), fn: function () { return Promise.resolve(renameFileModal()); } },
        { label: t('delete_file'), class: 'danger', fn: function () { return Promise.resolve(deleteFileModal()); } }
      ]
    });
  }

  /* ---------------- Export ---------------- */
  CS.editor = {
    render, flush, openFile, doSave,
    undo, redo,
    undoContent: undo, redoContent: redo,   /* alias (tests) */
    restoreDeleted, refresh, notifyFileAdded, renderHighlight,
    toggleFullscreen,
    get currentPath() { return state.path; },
    get isDirty() { return state.dirty; },
    get isFullscreen() { return state.fs; },
    insertAtCursor,
    suggest: acSuggest   /* motor de sugerencias (tests) */
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = CS.editor; }
})();
