/* Code editor engine on CodeMirror 6: per-file state, themed tokens, enriched completions, calm linting. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const CM = globalThis.CM6;

  function langOf(path) {
    const ext = String(path || '').split('.').pop().toLowerCase();
    if (ext === 'html' || ext === 'htm' || ext === 'svg' || ext === 'xml') return 'html';
    if (ext === 'css') return 'css';
    if (ext === 'js' || ext === 'mjs') return 'js';
    if (ext === 'json') return 'json';
    return 'text';
  }

  function languageExtension(lang) {
    if (lang === 'html') return CM.html({ autoCloseTags: true, matchClosingTags: true });
    if (lang === 'css') return CM.css();
    if (lang === 'js') return CM.javascript();
    if (lang === 'json') return CM.json();
    return [];
  }

  /* Token colours come from CSS classes so both themes stay in tokens.css. */
  function highlightStyle() {
    const T = CM.tags;
    return CM.HighlightStyle.define([
      { tag: [T.keyword, T.controlKeyword, T.moduleKeyword, T.operatorKeyword], class: 'tk-kw' },
      { tag: [T.string, T.special(T.string), T.regexp], class: 'tk-str' },
      { tag: [T.number, T.bool, T.null, T.atom], class: 'tk-num' },
      { tag: [T.comment, T.lineComment, T.blockComment], class: 'tk-com' },
      { tag: [T.tagName], class: 'tk-tag' },
      { tag: [T.attributeName], class: 'tk-attr' },
      { tag: [T.attributeValue], class: 'tk-str' },
      { tag: [T.propertyName], class: 'tk-prop' },
      { tag: [T.function(T.variableName), T.function(T.propertyName)], class: 'tk-fn' },
      { tag: [T.definition(T.variableName), T.definition(T.propertyName)], class: 'tk-def' },
      { tag: [T.className, T.typeName], class: 'tk-type' },
      { tag: [T.operator, T.punctuation, T.bracket, T.angleBracket], class: 'tk-punct' },
      { tag: [T.color, T.unit], class: 'tk-num' },
      { tag: [T.invalid], class: 'tk-bad' },
      { tag: [T.heading], class: 'tk-head' },
      { tag: [T.link, T.url], class: 'tk-link' }
    ]);
  }

  /* ---------- Completion ---------- */
  function activeLang(state, pos) {
    if (CM.javascriptLanguage.isActiveAt(state, pos, -1)) return 'js';
    if (CM.cssLanguage.isActiveAt(state, pos, -1)) return 'css';
    if (CM.htmlLanguage.isActiveAt(state, pos, -1)) return 'html';
    return null;
  }

  function info(label, lang) {
    const e = CS.dict && CS.dict.lookup(String(label).replace(/[(<>/\s]/g, ''), lang);
    return e ? CS.dict.text(e) : undefined;
  }

  /* Runs the language's own source #i and adds dictionary explanations to each option. */
  function enrichedSource(i) {
    return async function (ctx) {
      const sources = ctx.state.languageDataAt('autocomplete', ctx.pos);
      const src = sources[i];
      if (!src) return null;
      const res = typeof src === 'function' ? await src(ctx) : CM.completeFromList(src)(ctx);
      if (!res) return null;
      const lang = activeLang(ctx.state, ctx.pos);
      return Object.assign({}, res, { options: res.options.map((o) => (o.info ? o : Object.assign({}, o, { info: info(o.label, lang) }))) });
    };
  }

  function dictSource(ctx) {
    if (!CS.dict) return null;
    const lang = activeLang(ctx.state, ctx.pos);
    if (!lang) return null;
    const before = ctx.state.sliceDoc(Math.max(0, ctx.pos - 60), ctx.pos);
    if (lang === 'js') {
      const member = /\.([\w$]*)$/.exec(before);
      const word = ctx.matchBefore(/[\w$]+/);
      if (!word && !member && !ctx.explicit) return null;
      const from = word ? word.from : ctx.pos;
      const rows = CS.dict.forLang('js').filter((e) => {
        if (e.k === 'keyword') return false;
        if (member) return e.k !== 'snippet' && e.n !== 'webxdc' && !e.n.includes('.') && /^[a-z]/i.test(e.n);
        return true;
      });
      const applyOf = (e) => (e.s ? CM.snippet(member ? e.s.replace(/^(document|webxdc|console|Math|JSON|navigator)\./, '') : e.s) : undefined);
      const options = rows.map((e) => ({
        label: e.n,
        type: e.k === 'snippet' ? 'text' : e.k === 'webxdc' ? 'namespace' : /^[A-Z]/.test(e.n) ? 'class' : 'function',
        detail: e.k === 'snippet' ? CS.t('ed_snippet') : e.k === 'webxdc' ? 'webxdc' : '',
        info: CS.dict.text(e),
        boost: e.k === 'snippet' ? -1 : e.k === 'webxdc' ? 2 : 0,
        apply: applyOf(e)
      }));
      return { from, options, validFor: /^[\w$]*$/ };
    }
    const word = ctx.matchBefore(lang === 'css' ? /[@\w-]+/ : /[\w-]+/);
    if (!word || (word.from === word.to && !ctx.explicit)) return null;
    if (lang === 'html') {
      const tagOpen = /<[^>]*$/.test(before);
      if (tagOpen) return null;
    }
    const options = CS.dict.forLang(lang).filter((e) => e.k === 'snippet' || (lang === 'css' && e.n.startsWith('@'))).map((e) => ({
      label: e.n, type: 'text', detail: CS.t('ed_snippet'), info: CS.dict.text(e), apply: e.s ? CM.snippet(e.s) : undefined, boost: -1
    }));
    return { from: word.from, options, validFor: /^[@\w-]*$/ };
  }

  /* ---------- Lint: only clear syntax errors, after a pause ---------- */
  function syntaxLinter(lang) {
    if (lang === 'json') return CM.linter(CM.jsonParseLinter(), { delay: 750 });
    if (lang !== 'js') return [];
    return CM.linter((view) => {
      const out = [];
      CM.syntaxTree(view.state).iterate({
        enter(node) {
          if (out.length < 3 && node.type.isError) {
            const line = view.state.doc.lineAt(node.from);
            if (view.state.selection.main.head >= line.from && view.state.selection.main.head <= line.to + 1) return;
            out.push({ from: node.from, to: Math.max(node.to, node.from + 1), severity: 'error', message: CS.t('ed_syntax_hint') });
          }
        }
      });
      return out;
    }, { delay: 900 });
  }

  /* ---------- Instance ---------- */
  function create(host, options) {
    if (!CM) throw Object.assign(new Error('editor missing'), { code: 'no-editor' });
    const o = Object.assign({ wrap: true, lines: true, suggest: true, fontSize: 14, readOnly: false }, options);
    const comp = { lang: new CM.Compartment(), wrap: new CM.Compartment(), lines: new CM.Compartment(), lint: new CM.Compartment(),
      complete: new CM.Compartment(), readOnly: new CM.Compartment(), font: new CM.Compartment() };
    const states = new Map();
    let path = o.path || '';
    const listeners = { change: new Set(), cursor: new Set(), focus: new Set() };
    const fire = (name, value) => listeners[name].forEach((fn) => fn(value));

    const fontTheme = (size) => CM.EditorView.theme({ '&': { fontSize: size + 'px' } });
    const completion = (on) => (on ? CM.autocompletion({
      override: [enrichedSource(0), enrichedSource(1), enrichedSource(2), dictSource],
      activateOnTyping: true, icons: false, maxRenderedOptions: 40, defaultKeymap: true,
      tooltipClass: () => 'cs-complete', closeOnBlur: false
    }) : []);

    function extensions(lang) {
      return [
        comp.lines.of(o.lines ? [CM.lineNumbers(), CM.foldGutter({ markerDOM: foldMarker })] : []),
        CM.highlightActiveLine(), CM.highlightActiveLineGutter(), CM.highlightSpecialChars(), CM.drawSelection(),
        CM.history(), CM.indentOnInput(), CM.bracketMatching(), CM.closeBrackets(), CM.highlightSelectionMatches(),
        CM.indentUnit.of('  '), CM.EditorState.tabSize.of(2),
        CM.search({ top: true }),
        CM.syntaxHighlighting(highlightStyle()),
        comp.lang.of(languageExtension(lang)),
        comp.lint.of(syntaxLinter(lang)),
        comp.complete.of(completion(o.suggest)),
        comp.wrap.of(o.wrap ? CM.EditorView.lineWrapping : []),
        comp.readOnly.of(CM.EditorState.readOnly.of(!!o.readOnly)),
        comp.font.of(fontTheme(o.fontSize)),
        CM.keymap.of([].concat(CM.closeBracketsKeymap, CM.defaultKeymap, CM.searchKeymap, CM.historyKeymap, CM.foldKeymap, CM.completionKeymap, [CM.indentWithTab])),
        CM.EditorView.contentAttributes.of({ autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', 'aria-label': CS.t('ed_code_area') }),
        CM.EditorView.updateListener.of((u) => {
          if (u.docChanged) fire('change', { path, view: u.view });
          if (u.docChanged || u.selectionSet || u.transactions.some((tr) => tr.effects.length)) fire('cursor', { path, view: u.view });
          if (u.focusChanged) fire('focus', u.view.hasFocus);
        })
      ];
    }

    function foldMarker(open) {
      const span = document.createElement('span');
      span.className = 'cm-fold-mark' + (open ? '' : ' closed');
      span.textContent = open ? '▾' : '▸';
      return span;
    }

    function makeState(text, filePath) {
      return CM.EditorState.create({ doc: text, extensions: extensions(langOf(filePath)) });
    }

    const view = new CM.EditorView({ state: makeState(o.text || '', path), parent: host });

    function setFile(nextPath, text) {
      if (path) states.set(path, view.state);
      const cached = states.get(nextPath);
      path = nextPath;
      if (cached && cached.doc.toString() === text) view.setState(cached);
      else view.setState(makeState(text, nextPath));
      reconfigure();
      fire('cursor', { path, view });
    }

    function reconfigure() {
      view.dispatch({ effects: [
        comp.wrap.reconfigure(o.wrap ? CM.EditorView.lineWrapping : []),
        comp.lines.reconfigure(o.lines ? [CM.lineNumbers(), CM.foldGutter({ markerDOM: foldMarker })] : []),
        comp.complete.reconfigure(completion(o.suggest)),
        comp.font.reconfigure(fontTheme(o.fontSize)),
        comp.readOnly.reconfigure(CM.EditorState.readOnly.of(!!o.readOnly))
      ] });
    }

    function insert(text, opts) {
      const sel = view.state.selection.main;
      if (opts && opts.snippet) { CM.snippet(text)({ state: view.state, dispatch: view.dispatch.bind(view) }, null, sel.from, sel.to); }
      else {
        const caret = opts && opts.caret != null ? sel.from + opts.caret : sel.from + text.length;
        view.dispatch({ changes: { from: sel.from, to: sel.to, insert: text }, selection: { anchor: caret }, scrollIntoView: true, userEvent: 'input.type' });
      }
      view.focus();
    }

    function wordAt() {
      const sel = view.state.selection.main;
      if (!sel.empty) return view.state.sliceDoc(sel.from, sel.to).trim().slice(0, 60);
      const range = view.state.wordAt(sel.head) || view.state.wordAt(Math.max(0, sel.head - 1));
      if (!range) return '';
      let from = range.from;
      let to = range.to;
      const doc = view.state.doc;
      while (from > 0 && /[\w$.-]/.test(doc.sliceString(from - 1, from))) from--;
      while (to < doc.length && /[\w$-]/.test(doc.sliceString(to, to + 1))) to++;
      const word = doc.sliceString(from, to).replace(/^[.-]+|[.-]+$/g, '');
      const parts = word.split('.');
      return CS.dict && CS.dict.lookup(word) ? word : parts[parts.length - 1];
    }

    function cursorInfo() {
      const head = view.state.selection.main.head;
      const line = view.state.doc.lineAt(head);
      return { line: line.number, col: head - line.from + 1, lines: view.state.doc.lines, lang: activeLang(view.state, head) || langOf(path) };
    }

    function gotoLine(n) {
      const line = view.state.doc.line(Math.max(1, Math.min(view.state.doc.lines, n)));
      view.dispatch({ selection: { anchor: line.from }, effects: CM.EditorView.scrollIntoView(line.from, { y: 'center' }) });
      view.focus();
    }

    return {
      view,
      engine: 'codemirror',
      get path() { return path; },
      text: () => view.state.doc.toString(),
      setFile,
      forget(p) { states.delete(p); },
      rename(from, to) { if (states.has(from)) { states.set(to, states.get(from)); states.delete(from); } if (path === from) path = to; },
      replaceText(text) { view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } }); },
      insertAt(at, text) { view.dispatch({ changes: { from: at, insert: text } }); },
      lineInfo() { const at = view.state.selection.main.from; const line = view.state.doc.lineAt(at); return { text: line.text, from: line.from, at }; },
      setOptions(next) { Object.assign(o, next); reconfigure(); },
      options: () => Object.assign({}, o),
      on(name, fn) { listeners[name].add(fn); return () => listeners[name].delete(fn); },
      focus: () => view.focus(),
      blur: () => view.contentDOM.blur(),
      insert,
      undo: () => CM.undo(view), redo: () => CM.redo(view),
      canUndo: () => CM.undoDepth(view.state) > 0, canRedo: () => CM.redoDepth(view.state) > 0,
      indent: () => CM.indentMore(view), outdent: () => CM.indentLess(view),
      comment: () => CM.toggleComment(view),
      selectAll: () => CM.selectAll(view),
      openSearch: () => CM.openSearchPanel(view), closeSearch: () => CM.closeSearchPanel(view),
      moveCursor(delta) {
        const head = view.state.selection.main.head;
        const pos = Math.max(0, Math.min(view.state.doc.length, head + delta));
        view.dispatch({ selection: { anchor: pos }, scrollIntoView: true });
      },
      gotoLine, wordAt, cursorInfo,
      completions: () => (CM.completionStatus(view.state) === 'active' ? CM.currentCompletions(view.state) : []),
      selectedCompletion: () => CM.selectedCompletionIndex(view.state),
      applyCompletion(i) { view.dispatch({ effects: CM.setSelectedCompletion(i) }); CM.acceptCompletion(view); view.focus(); },
      closeCompletion: () => CM.closeCompletion(view),
      startCompletion: () => CM.startCompletion(view),
      destroy() { view.destroy(); states.clear(); Object.values(listeners).forEach((s) => s.clear()); }
    };
  }

  CS.editor = { create, langOf, available: () => !!CM };
})();
