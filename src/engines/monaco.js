/* Optional Monaco editor (monaco package only). Same interface as CS.editor; falls back to CodeMirror if loading fails. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const MONACO_BUNDLED = true;
  const VS = 'vendor/monaco/vs';
  const LOAD_MS = 15000;
  let loading = null;
  let monaco = null;
  let failed = false;
  let seq = 0;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('script-failed'));
      document.head.appendChild(s);
    });
  }

  /* Webxdc forbids network access and Monaco only needs workers for extra diagnostics: give it an idle one. */
  function idleWorkers() {
    self.MonacoEnvironment = { getWorker: () => new Worker(URL.createObjectURL(new Blob(['self.onmessage=function(){};'], { type: 'text/javascript' }))) };
  }

  function load() {
    if (monaco) return Promise.resolve(monaco);
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('monaco-timeout')), LOAD_MS);
      (async () => {
        idleWorkers();
        await loadScript(VS + '/loader.js');
        const req = window.require;
        if (!req || !req.config) throw new Error('no-amd-loader');
        const cfg = { paths: { vs: VS } };
        if (CS.i18n.lang === 'es') cfg['vs/nls'] = { availableLanguages: { '*': 'es' } };
        req.config(cfg);
        /* The package ships syntax colouring only; the heavy language services stay out, so answer their requests with no-ops. */
        ['html/htmlMode', 'css/cssMode', 'json/jsonMode', 'typescript/tsMode'].forEach((name) => {
          window.define('vs/language/' + name, [], () => ({ setupMode: () => ({ dispose() {} }), setupJavaScript() {}, setupTypeScript() {}, getJavaScriptWorker: () => Promise.reject(new Error('off')), getTypeScriptWorker: () => Promise.reject(new Error('off')) }));
        });
        return new Promise((ok, ko) => req(['vs/editor/editor.main'], () => ok(window.monaco), ko));
      })().then((m) => {
        clearTimeout(timer);
        if (!m || !m.editor) throw new Error('monaco-missing');
        monaco = m;
        setup();
        resolve(m);
      }).catch((error) => { clearTimeout(timer); reject(error); });
    }).catch((error) => { failed = true; loading = null; throw error; });
    return loading;
  }

  /* ---------- Theme from the app tokens ---------- */
  function token(name, fallback) {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const hex = raw && CS.color ? CS.color.hex(raw) : null;
    return hex || fallback;
  }
  function applyTheme() {
    if (!monaco) return;
    const dark = document.documentElement.dataset.theme === 'dark';
    const accent = token('--accent', '#5146e0');
    monaco.editor.defineTheme('cs', {
      base: dark ? 'vs-dark' : 'vs', inherit: true, rules: [],
      colors: {
        'editor.background': token('--surface', dark ? '#141726' : '#ffffff'),
        'editor.foreground': token('--text', dark ? '#e8e9f3' : '#1b1d2a'),
        'editorLineNumber.foreground': token('--text-3', '#8a8fa8'),
        'editorCursor.foreground': accent,
        'editor.selectionBackground': accent + '44',
        'editor.lineHighlightBackground': accent + '12',
        'editorWidget.background': token('--surface-2', dark ? '#1b1f33' : '#f5f6fb'),
        'editorSuggestWidget.selectedBackground': accent + (dark ? '55' : '22'),
        'editorSuggestWidget.selectedForeground': token('--text', dark ? '#e8e9f3' : '#1b1d2a'),
        'list.activeSelectionBackground': accent + (dark ? '55' : '22'),
        'list.activeSelectionForeground': token('--text', dark ? '#e8e9f3' : '#1b1d2a'),
        'editorSuggestWidget.highlightForeground': accent,
        'editorSuggestWidget.focusHighlightForeground': accent
      }
    });
    monaco.editor.setTheme('cs');
  }

  /* ---------- Shared language help: the same dictionary as the CodeMirror editor ---------- */
  function toSnippet(s) {
    let n = 0;
    return String(s).replace(/\$\{\}/g, '$0').replace(/\$\{([^}:]+)\}/g, (m, name) => '${' + (++n) + ':' + name + '}');
  }
  function setup() {
    applyTheme();
    CS.bus.on('settings', ({ key }) => { if (key === 'theme' || key === '*') setTimeout(applyTheme, 30); });
    if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => setTimeout(applyTheme, 30));
    if (!CS.dict) return;
    const L = monaco.languages;
    const KIND = { tag: L.CompletionItemKind.Property, attr: L.CompletionItemKind.Field, prop: L.CompletionItemKind.Property,
      keyword: L.CompletionItemKind.Keyword, api: L.CompletionItemKind.Function, webxdc: L.CompletionItemKind.Function, snippet: L.CompletionItemKind.Snippet };
    ['javascript', 'css', 'html'].forEach((lang) => {
      const dictLang = lang === 'javascript' ? 'js' : lang;
      L.registerCompletionItemProvider(lang, {
        provideCompletionItems(model, position) {
          const word = model.getWordUntilPosition(position);
          const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };
          return { suggestions: CS.dict.forLang(dictLang).map((e) => ({
            label: e.n, kind: KIND[e.k] || L.CompletionItemKind.Text, detail: CS.dict.text(e), range,
            insertText: e.s ? toSnippet(e.s) : e.n,
            insertTextRules: e.s ? L.CompletionItemInsertTextRule.InsertAsSnippet : undefined
          })) };
        }
      });
      L.registerHoverProvider(lang, {
        provideHover(model, position) {
          const w = model.getWordAtPosition(position);
          const e = w && CS.dict.lookup(w.word, dictLang);
          return e ? { contents: [{ value: '**' + e.n + '**' }, { value: CS.dict.text(e) }] } : null;
        }
      });
    });
  }

  /* ---------- Editor with the CS.editor interface ---------- */
  const LANG = { js: 'javascript', mjs: 'javascript', json: 'json', html: 'html', htm: 'html', css: 'css', md: 'markdown', svg: 'xml', xml: 'xml', toml: 'ini', txt: 'plaintext' };
  const languageOf = (path) => LANG[String(path).split('.').pop().toLowerCase()] || 'plaintext';

  /* Language at an offset, including <style>/<script> blocks inside HTML. */
  function langAt(text, offset, path) {
    const base = CS.editor.langOf(path);
    if (base !== 'html') return base;
    const before = text.slice(0, offset).toLowerCase();
    const open = (tag) => before.lastIndexOf('<' + tag);
    const close = (tag) => before.lastIndexOf('</' + tag);
    if (open('script') > close('script')) return 'js';
    if (open('style') > close('style')) return 'css';
    return 'html';
  }

  function build(host, o, fire) {
    const models = new Map();
    let path = o.path || '';
    const id = ++seq;
    const modelFor = (p, text) => {
      let m = models.get(p);
      if (!m || m.isDisposed()) {
        m = monaco.editor.createModel(text, languageOf(p), monaco.Uri.parse('inmemory://cs' + id + '/' + encodeURI(p || 'file.txt')));
        models.set(p, m);
      }
      return m;
    };
    const touch = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    const options = () => ({
      wordWrap: o.wrap ? 'on' : 'off', lineNumbers: o.lines ? 'on' : 'off', fontSize: o.fontSize, readOnly: !!o.readOnly,
      quickSuggestions: !!o.suggest, suggestOnTriggerCharacters: !!o.suggest, folding: !!o.lines,
      lineNumbersMinChars: 3, lineDecorationsWidth: o.lines ? 8 : 2, glyphMargin: false
    });
    const ed = monaco.editor.create(host, Object.assign({
      model: modelFor(path, o.text || ''), theme: 'cs', automaticLayout: true, minimap: { enabled: false }, tabSize: 2,
      scrollBeyondLastLine: false, wrappingStrategy: 'advanced', fixedOverflowWidgets: true, contextmenu: !touch, mouseWheelZoom: false,
      fontFamily: getComputedStyle(document.documentElement).getPropertyValue('--mono').trim() || 'ui-monospace, monospace',
      padding: { top: 8, bottom: 8 }, overviewRulerLanes: 0, hideCursorInOverviewRuler: true, renderLineHighlight: 'line',
      scrollbar: { verticalScrollbarSize: touch ? 6 : 10, horizontalScrollbarSize: touch ? 6 : 10 },
      ariaLabel: CS.t('ed_code_area')
    }, options()));
    ed.onDidChangeModelContent(() => { fire('change', { path }); fire('cursor', { path }); });
    ed.onDidChangeCursorSelection(() => fire('cursor', { path }));
    ed.onDidFocusEditorText(() => fire('focus', true));
    ed.onDidBlurEditorText(() => fire('focus', false));
    const model = () => ed.getModel();
    const offset = () => model().getOffsetAt(ed.getSelection().getStartPosition());
    const run = (action) => { ed.focus(); ed.trigger('cs', action, null); };

    return {
      view: null,
      engine: 'monaco',
      get path() { return path; },
      text: () => model().getValue(),
      setFile(nextPath, text) {
        path = nextPath;
        const m = modelFor(nextPath, text);
        if (m.getValue() !== text) m.setValue(text);
        ed.setModel(m);
        fire('cursor', { path });
      },
      forget(p) { const m = models.get(p); if (m && m !== model()) m.dispose(); models.delete(p); },
      rename(from, to) { if (models.has(from)) { models.set(to, models.get(from)); models.delete(from); } if (path === from) path = to; },
      replaceText(text) { ed.executeEdits('cs', [{ range: model().getFullModelRange(), text }]); },
      setOptions(next) { Object.assign(o, next); ed.updateOptions(options()); },
      options: () => Object.assign({}, o),
      focus: () => ed.focus(),
      blur: () => { if (document.activeElement && host.contains(document.activeElement)) document.activeElement.blur(); },
      insert(text, opts) {
        if (opts && opts.snippet) { ed.focus(); ed.getContribution('snippetController2').insert(toSnippet(text)); return; }
        const start = offset();
        ed.executeEdits('cs', [{ range: ed.getSelection(), text, forceMoveMarkers: true }]);
        const caret = opts && opts.caret != null ? start + opts.caret : start + text.length;
        ed.setPosition(model().getPositionAt(caret));
        ed.revealPositionInCenterIfOutsideViewport(ed.getPosition());
        ed.focus();
      },
      insertAt(at, text) { const p = model().getPositionAt(at); ed.executeEdits('cs', [{ range: new monaco.Range(p.lineNumber, p.column, p.lineNumber, p.column), text }]); },
      lineInfo() {
        const pos = ed.getSelection().getStartPosition();
        return { text: model().getLineContent(pos.lineNumber), from: model().getOffsetAt({ lineNumber: pos.lineNumber, column: 1 }), at: offset() };
      },
      undo: () => run('undo'), redo: () => run('redo'),
      canUndo: () => !!(model().canUndo && model().canUndo()), canRedo: () => !!(model().canRedo && model().canRedo()),
      indent: () => run('editor.action.indentLines'), outdent: () => run('editor.action.outdentLines'),
      comment: () => run('editor.action.commentLine'),
      selectAll: () => { ed.setSelection(model().getFullModelRange()); ed.focus(); },
      openSearch: () => run('actions.find'), closeSearch: () => run('closeFindWidget'),
      moveCursor(delta) {
        const at = Math.max(0, Math.min(model().getValueLength(), offset() + delta));
        ed.setPosition(model().getPositionAt(at));
      },
      gotoLine(n) {
        const line = Math.max(1, Math.min(model().getLineCount(), n));
        ed.setPosition({ lineNumber: line, column: 1 });
        ed.revealLineInCenter(line);
        ed.focus();
      },
      wordAt() {
        const sel = ed.getSelection();
        if (!sel.isEmpty()) return model().getValueInRange(sel).trim().slice(0, 60);
        const pos = sel.getStartPosition();
        const line = model().getLineContent(pos.lineNumber);
        let from = pos.column - 1;
        let to = from;
        while (from > 0 && /[\w$.-]/.test(line[from - 1])) from--;
        while (to < line.length && /[\w$-]/.test(line[to])) to++;
        const word = line.slice(from, to).replace(/^[.-]+|[.-]+$/g, '');
        const parts = word.split('.');
        return CS.dict && CS.dict.lookup(word) ? word : parts[parts.length - 1];
      },
      cursorInfo() {
        const pos = ed.getPosition() || { lineNumber: 1, column: 1 };
        const lang = langAt(model().getValue(), model().getOffsetAt(pos), path);
        return { line: pos.lineNumber, col: pos.column, lines: model().getLineCount(), lang };
      },
      /* Monaco shows its own suggestion widget; the touch strip falls back to symbols. */
      completions: () => [],
      selectedCompletion: () => -1,
      applyCompletion() {},
      closeCompletion: () => ed.trigger('cs', 'hideSuggestWidget', null),
      startCompletion: () => run('editor.action.triggerSuggest'),
      destroy() { ed.dispose(); models.forEach((m) => m.dispose()); models.clear(); }
    };
  }

  /* Returns the editor at once; until Monaco is ready it keeps the text, then hands over (or falls back to CodeMirror). */
  function create(host, options) {
    const o = Object.assign({ wrap: true, lines: true, suggest: true, fontSize: 14, readOnly: false }, options);
    const listeners = { change: new Set(), cursor: new Set(), focus: new Set() };
    const fire = (name, value) => listeners[name].forEach((fn) => fn(value));
    let pending = { path: o.path || '', text: o.text || '' };
    let impl = null;
    let dead = false;
    const wait = CS.h('div', { class: 'ed-loading' }, CS.t('ed_loading_monaco'));
    host.appendChild(wait);

    function adopt(next, via) {
      wait.remove();
      if (dead) { next.destroy(); return; }
      impl = next;
      if (via === 'cm') ['change', 'cursor', 'focus'].forEach((name) => impl.on(name, (v) => fire(name, v)));
      impl.setFile(pending.path, pending.text);
      pending = null;
    }
    const fallback = () => { if (!dead && !impl) adopt(CS.editor.create(host, Object.assign({}, o, { path: '', text: '' })), 'cm'); };
    if (failed) fallback();
    else load().then(() => adopt(build(host, Object.assign({}, o, { path: pending.path, text: pending.text }), fire), 'monaco')).catch(fallback);

    const call = (name, fallbackValue) => (...args) => (impl ? impl[name](...args) : fallbackValue);
    return {
      get view() { return impl ? impl.view : null; },
      get engine() { return impl ? (impl.engine || 'codemirror') : 'loading'; },
      get path() { return impl ? impl.path : pending.path; },
      text: () => (impl ? impl.text() : pending.text),
      setFile(p, text) { if (impl) impl.setFile(p, text); else { pending = { path: p, text }; fire('cursor', { path: p }); } },
      forget: call('forget'),
      rename(from, to) { if (impl) impl.rename(from, to); else if (pending.path === from) pending.path = to; },
      replaceText(text) { if (impl) impl.replaceText(text); else pending.text = text; },
      setOptions(next) { Object.assign(o, next); if (impl) impl.setOptions(next); },
      options: () => Object.assign({}, o),
      on(name, fn) { listeners[name].add(fn); return () => listeners[name].delete(fn); },
      focus: call('focus'), blur: call('blur'), insert: call('insert'),
      insertAt(at, text) { if (impl) impl.insertAt(at, text); else pending.text = pending.text.slice(0, at) + text + pending.text.slice(at); },
      lineInfo: () => (impl ? impl.lineInfo() : { text: '', from: 0, at: 0 }),
      undo: call('undo'), redo: call('redo'), canUndo: call('canUndo', false), canRedo: call('canRedo', false),
      indent: call('indent'), outdent: call('outdent'), comment: call('comment'), selectAll: call('selectAll'),
      openSearch: call('openSearch'), closeSearch: call('closeSearch'), moveCursor: call('moveCursor'), gotoLine: call('gotoLine'),
      wordAt: call('wordAt', ''),
      cursorInfo: () => (impl ? impl.cursorInfo() : { line: 1, col: 1, lines: 1, lang: CS.editor.langOf(pending.path) }),
      completions: call('completions', []), selectedCompletion: call('selectedCompletion', -1), applyCompletion: call('applyCompletion'),
      closeCompletion: call('closeCompletion'), startCompletion: call('startCompletion'),
      destroy() { dead = true; wait.remove(); if (impl) impl.destroy(); Object.values(listeners).forEach((s) => s.clear()); }
    };
  }

  CS.monaco = {
    available: () => MONACO_BUNDLED && typeof document !== 'undefined' && !failed,
    load, create, toSnippet, get ready() { return !!monaco; }
  };
})();
