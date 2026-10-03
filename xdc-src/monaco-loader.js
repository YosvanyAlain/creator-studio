/* =========================================================================
 * Webxdc Creator Studio — monaco-loader.js
 * Deferred Monaco load; textarea remains source of truth.
 * ========================================================================= */
'use strict';
(function () {
  const CS = (globalThis.CS = globalThis.CS || {});

  const BUNDLED = true; /* this tree includes monaco/vs/editor.main.js */
  const LOADER_SRC = 'monaco/vs/loader.js';
  const VS_PATH = 'monaco/vs';
  const LOAD_MS = 12000;

  let strategy = 'unknown';
  let loading = null;
  let monacoRef = null;
  let lastError = null;
  const instances = [];

  function isJsdom() {
    try { return typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || ''); }
    catch (e) { return false; }
  }

  function installDummyWorker() {
    try {
      if (typeof self === 'undefined') return;
      self.MonacoEnvironment = {
        getWorker: function () {
          const src = 'self.onmessage=function(){};';
          const blob = new Blob([src], { type: 'text/javascript' });
          return new Worker(URL.createObjectURL(blob));
        }
      };
    } catch (e) { /* workers unavailable: Monaco can still tokenize */ }
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (typeof document === 'undefined') { reject(new Error('no-document')); return; }
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('script-failed:' + src)); };
      document.head.appendChild(s);
    });
  }

  function withTimeout(p, ms) {
    return new Promise(function (resolve, reject) {
      const t = setTimeout(function () { reject(new Error('monaco-timeout')); }, ms);
      p.then(function (v) { clearTimeout(t); resolve(v); }, function (e) { clearTimeout(t); reject(e); });
    });
  }

  function load() {
    if (monacoRef) { strategy = 'monaco'; return Promise.resolve(monacoRef); }
    if (loading) return loading;
    if (isJsdom() || typeof document === 'undefined') {
      strategy = 'fallback';
      lastError = 'jsdom-or-node';
      return Promise.resolve(null);
    }
    if (CS.capabilities && CS.capabilities.chooseEditorStrategy() === 'fallback') {
      strategy = 'fallback';
      lastError = 'strategy-fallback';
      return Promise.resolve(null);
    }

    strategy = 'loading';
    loading = withTimeout((async function () {
      installDummyWorker();
      await loadScript(LOADER_SRC);
      const req = window.require;
      if (!req || typeof req.config !== 'function') throw new Error('no-amd-loader');
      req.config({ paths: { vs: VS_PATH } });
      const m = await new Promise(function (resolve, reject) {
        try {
          req(['vs/editor/editor.main'], function (mod) {
            resolve(mod || window.monaco);
          }, function (err) { reject(err || new Error('amd-failed')); });
        } catch (e) { reject(e); }
      });
      if (!m || !m.editor) throw new Error('monaco-missing-editor');
      monacoRef = m;
      strategy = 'monaco';
      registerProviders();
      try { if (CS.capabilities && CS.capabilities.detect) CS.capabilities.detect(); } catch (e) { /* ignore */ }
      return m;
    })(), LOAD_MS).catch(function (err) {
      lastError = String(err && err.message || err);
      strategy = 'fallback';
      monacoRef = null;
      loading = null;
      return null;
    });
    return loading;
  }

  function languageFor(path) {
    const ext = (CS.util && CS.util.extname) ? CS.util.extname(path) : String(path).split('.').pop();
    const map = {
      js: 'javascript', mjs: 'javascript', ts: 'javascript',
      html: 'html', htm: 'html',
      css: 'css',
      json: 'json',
      md: 'markdown',
      xml: 'xml', svg: 'xml',
      ini: 'ini', toml: 'ini',
      txt: 'plaintext'
    };
    return map[ext] || 'plaintext';
  }

  function themeName() {
    try {
      return document.documentElement.getAttribute('data-theme') === 'dark' ? 'vs-dark' : 'vs';
    } catch (e) { return 'vs'; }
  }

  /* Adjunta Monaco sobre un textarea existente. Si falla, el textarea
   * permanece visible y funcional. */
  function isMobileView() {
    try {
      if (CS.app && typeof CS.app.isMobile === 'function') return !!CS.app.isMobile();
      if (window.matchMedia) {
        if (window.matchMedia('(pointer: coarse)').matches) return true;
        if (window.matchMedia('(max-width: 700px)').matches) return true;
      }
    } catch (e) { /* ignore */ }
    return false;
  }


  let providersRegistered = false;
  function registerProviders() {
    if (providersRegistered || !monacoRef || !monacoRef.languages) return;
    providersRegistered = true;
    const monaco = monacoRef;
    const webxdcSnippets = [
      { label: 'webxdc.sendUpdate', insertText: 'window.webxdc.sendUpdate({\n  payload: { ${1:key}: ${2:value} },\n  info: \'${3:}\'\n}, \'\');', detail: 'webxdc API' },
      { label: 'webxdc.setUpdateListener', insertText: 'window.webxdc.setUpdateListener(function (update) {\n  ${1:// handle update}\n}, 0);', detail: 'webxdc API' },
      { label: 'webxdc.sendToChat', insertText: 'window.webxdc.sendToChat({\n  text: \'${1:}\'\n});', detail: 'webxdc API' },
      { label: 'webxdc.selfAddr', insertText: 'window.webxdc.selfAddr', detail: 'webxdc API' },
      { label: 'webxdc.selfName', insertText: 'window.webxdc.selfName', detail: 'webxdc API' },
      { label: 'getElementById', insertText: 'document.getElementById(\'${1:id}\')', detail: 'DOM' },
      { label: 'querySelector', insertText: 'document.querySelector(\'${1:selector}\')', detail: 'DOM' },
      { label: 'addEventListener', insertText: 'addEventListener(\'${1:click}\', function (e) {\n  ${2}\n});', detail: 'DOM' },
      { label: 'localStorage.setItem', insertText: 'localStorage.setItem(\'${1:key}\', ${2:value});', detail: 'Storage' },
      { label: 'localStorage.getItem', insertText: 'localStorage.getItem(\'${1:key}\')', detail: 'Storage' }
    ];
    try {
      monaco.languages.registerCompletionItemProvider('javascript', {
        triggerCharacters: ['.', 'w'],
        provideCompletionItems: function (model, position) {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn
          };
          const suggestions = webxdcSnippets.map(function (s) {
            return {
              label: s.label,
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: s.insertText,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              detail: s.detail,
              range: range
            };
          });
          return { suggestions: suggestions };
        }
      });
      monaco.languages.registerHoverProvider('javascript', {
        provideHover: function (model, position) {
          const word = model.getWordAtPosition(position);
          if (!word) return null;
          const tips = {
            sendUpdate: 'webxdc.sendUpdate(update, descr?) — broadcast JSON payload to the chat.',
            setUpdateListener: 'webxdc.setUpdateListener(cb, serial) — receive updates; returns a Promise.',
            sendToChat: 'webxdc.sendToChat({ text, file? }) — open messenger share sheet.',
            selfAddr: 'webxdc.selfAddr — unique address for this user (do not display).',
            selfName: 'webxdc.selfName — display name.'
          };
          const tip = tips[word.word];
          if (!tip) return null;
          return { contents: [{ value: '**' + word.word + '**\n\n' + tip }] };
        }
      });
    } catch (e) { /* ignore provider errors */ }
  }

  function attach(hostEl, textarea, opts) {
    opts = opts || {};
    if (!hostEl || !textarea || !monacoRef) return null;
    try {
      const mobile = opts.mobile != null ? !!opts.mobile : isMobileView();
      const model = monacoRef.editor.createModel(
        textarea.value || '',
        languageFor(opts.path || ''),
        monacoRef.Uri.parse('inmemory://cs/' + (opts.path || 'file.txt'))
      );
      const editor = monacoRef.editor.create(hostEl, {
        model: model,
        theme: themeName(),
        fontSize: mobile ? Math.min(opts.fontSize || 12, 12) : (opts.fontSize || 13),
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        minimap: { enabled: false },
        automaticLayout: true,
        wordWrap: mobile ? 'on' : (opts.wordWrap ? 'on' : 'off'),
        wrappingStrategy: 'advanced',
        scrollBeyondLastLine: false,
        tabSize: 2,
        renderLineHighlight: mobile ? 'none' : 'line',
        lineNumbers: mobile ? 'off' : 'on',
        glyphMargin: false,
        folding: !mobile,
        lineDecorationsWidth: mobile ? 0 : 10,
        lineNumbersMinChars: mobile ? 0 : 3,
        overviewRulerLanes: mobile ? 0 : 2,
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        contextmenu: !mobile,
        mouseWheelZoom: false,
        fixedOverflowWidgets: true,
        scrollbar: {
          verticalScrollbarSize: mobile ? 6 : 10,
          horizontalScrollbarSize: mobile ? 6 : 10
        },
        padding: { top: mobile ? 4 : 8, bottom: mobile ? 4 : 8 },
        ariaLabel: opts.ariaLabel || 'Editor'
      });
      if (mobile) {
        const relayout = function () { try { editor.layout(); } catch (e2) { /* ignore */ } };
        setTimeout(relayout, 40);
        try {
          if (window.visualViewport) window.visualViewport.addEventListener('resize', relayout);
          window.addEventListener('resize', relayout);
        } catch (e3) { /* ignore */ }
      }
      const sub = editor.onDidChangeModelContent(function () {
        const v = editor.getValue();
        if (textarea.value !== v) {
          textarea.value = v;
          const ev = document.createEvent('Event');
          ev.initEvent('input', true, true);
          textarea.dispatchEvent(ev);
        }
      });
      const rec = { editor: editor, model: model, host: hostEl, textarea: textarea, sub: sub, path: opts.path };
      instances.push(rec);
      hostEl.style.display = '';
      textarea.setAttribute('data-monaco', '1');
      return rec;
    } catch (e) {
      lastError = String(e && e.message || e);
      return null;
    }
  }

  function setValue(rec, value, path) {
    if (!rec || !rec.editor) return;
    try {
      const lang = languageFor(path || rec.path || '');
      const model = rec.editor.getModel();
      if (model) {
        monacoRef.editor.setModelLanguage(model, lang);
        if (model.getValue() !== value) model.setValue(value || '');
      }
      rec.path = path || rec.path;
    } catch (e) { /* ignore */ }
  }

  function disposeAll() {
    while (instances.length) {
      const rec = instances.pop();
      try { if (rec.sub) rec.sub.dispose(); } catch (e) { /* ignore */ }
      try { if (rec.editor) rec.editor.dispose(); } catch (e2) { /* ignore */ }
      try { if (rec.model) rec.model.dispose(); } catch (e3) { /* ignore */ }
    }
  }

  CS.monaco = {
    bundled: BUNDLED,
    load: load,
    attach: attach,
    setValue: setValue,
    disposeAll: disposeAll,
    languageFor: languageFor,
    get strategy() { return strategy; },
    get ready() { return !!monacoRef; },
    get lastError() { return lastError; },
    get instance() { return monacoRef; }
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = CS.monaco; }
})();
