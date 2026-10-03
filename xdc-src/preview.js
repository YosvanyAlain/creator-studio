/* =========================================================================
 * Webxdc Creator Studio — preview.js
 * Sandboxed preview with mock webxdc peers.
 * ========================================================================= */
'use strict';
(function () {
  const CS = (globalThis.CS = globalThis.CS || {});
  const U = CS.util;

  let token = null;
  let running = false;
  let stale = false;
  let listener = null;
  let consoleEntries = [];
  const MAX_ENTRIES = 300;
  let els = {};
  let entryPath = 'index.html';
  let startedProjectId = null;

  function t(key, params) { return CS.i18n.t(key, params); }
  function project() { return CS.projects.current; }

  /* ------------------------------------------------------------------ *
   * Mock de webxdc (se inyecta como primer script del iframe)
   * ------------------------------------------------------------------ */
  function mockSource(tok) {
    return [
      '/* Webxdc Creator Studio — preview mock (SIMULATION, not real) */',
      '(function () {',
      '  var TOKEN = ' + JSON.stringify(tok) + ';',
      '  function send(msg) {',
      '    try { msg.__csPreview = TOKEN; parent.postMessage(msg, "*"); } catch (e) {}',
      '  }',
      '  function fmt(v) {',
      '    try {',
      '      if (typeof v === "string") return v;',
      '      if (v instanceof Error) return v.name + ": " + v.message;',
      '      var s = JSON.stringify(v);',
      '      return s === undefined ? String(v) : s;',
      '    } catch (e) { return String(v); }',
      '  }',
      '  function fmtArgs(args) {',
      '    var parts = [];',
      '    for (var i = 0; i < args.length; i++) parts.push(fmt(args[i]));',
      '    var s = parts.join(" ");',
      '    return s.length > 600 ? s.slice(0, 600) + "…" : s;',
      '  }',
      '',
      '  /* localStorage puede estar bloqueado en el sandbox → shim en memoria */',
      '  function shimStorage(name) {',
      '    try {',
      '      var s = window[name];',
      '      s.setItem("__wcs", "1"); s.removeItem("__wcs");',
      '      return;',
      '    } catch (e) {}',
      '    var data = {};',
      '    var shim = {',
      '      getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },',
      '      setItem: function (k, v) { data[k] = String(v); },',
      '      removeItem: function (k) { delete data[k]; },',
      '      clear: function () { data = {}; },',
      '      key: function (i) { return Object.keys(data)[i] || null; }',
      '    };',
      '    Object.defineProperty(shim, "length", { get: function () { return Object.keys(data).length; } });',
      '    try { Object.defineProperty(window, name, { value: shim, configurable: true }); }',
      '    catch (e) { try { window[name] = shim; } catch (e2) {} }',
      '  }',
      '  shimStorage("localStorage");',
      '  shimStorage("sessionStorage");',
      '',
      '  /* Consola capturada y reenviada al Creator */',
      '  ["log", "info", "warn", "error", "debug"].forEach(function (level) {',
      '    var orig = console[level] ? console[level].bind(console) : function () {};',
      '    console[level] = function () {',
      '      send({ type: "console", level: level, text: fmtArgs(arguments) });',
      '      orig.apply(null, arguments);',
      '    };',
      '  });',
      '  window.onerror = function (msg, src, line, col) {',
      '    send({ type: "console", level: "error", text: String(msg) + " (" + line + ":" + col + ")" });',
      '  };',
      '  window.addEventListener("unhandledrejection", function (e) {',
      '    var r = e && e.reason;',
      '    send({ type: "console", level: "error", text: "Promesa rechazada: " + fmt(r) });',
      '  });',
      '',
      '  /* ---- Mock de window.webxdc ---- */',
      '  var serial = 0;',
      '  var updates = [];',
      '  var listener = null;',
      '  var MAXSIZE = 128000;  /* default limit from the spec */',
      '  window.webxdc = {',
      '    selfAddr: "preview@local",',
      '    selfName: "Preview User",',
      '    sendUpdateInterval: 10000,',
      '    sendUpdateMaxSize: MAXSIZE,',
      '    sendUpdate: function (update, descr) {',
      '      var json;',
      '      try { json = JSON.stringify(update); } catch (e) { json = undefined; }',
      '      if (!update || typeof update !== "object" || !("payload" in update)) {',
      '        send({ type: "console", level: "error", text: "sendUpdate: falta update.payload" });',
      '        return Promise.resolve();',
      '      }',
      '      if (json === undefined) {',
      '        send({ type: "console", level: "error", text: "sendUpdate: payload no serializable como JSON (¿Blob/buffer?)" });',
      '        return Promise.resolve();',
      '      }',
      '      if (json.length > MAXSIZE) {',
      '        send({ type: "console", level: "error", text: "sendUpdate: tamaño " + json.length + " > sendUpdateMaxSize (" + MAXSIZE + "); el mensajero NO lo enviaría" });',
      '        return Promise.resolve();',
      '      }',
      '      serial += 1;',
      '      var u = { payload: update.payload, serial: serial, max_serial: serial,',
      '        info: update.info, document: update.document, summary: update.summary };',
      '      updates.push(u);',
      '      if (updates.length > 500) updates.shift();',
      '      send({ type: "update", text: fmt(update.payload), info: update.info || "", serial: serial });',
      '      if (listener) {',
      '        try { listener(u); }',
      '        catch (err) { send({ type: "console", level: "error", text: "Error en el listener de setUpdateListener: " + fmt(err) }); }',
      '      }',
      '      return Promise.resolve();',
      '    },',
      '    setUpdateListener: function (cb, fromSerial) {',
      '      listener = cb;',
      '      var start = fromSerial || 0;',
      '      updates.forEach(function (u) {',
      '        if (u.serial > start) {',
      '          try { cb(u); }',
      '          catch (err) { send({ type: "console", level: "error", text: "Error en el listener: " + fmt(err) }); }',
      '        }',
      '      });',
      '      return Promise.resolve();',
      '    },',
      '    sendToChat: function (message) {',
      '      var desc = "text";',
      '      if (message && message.file && message.file.name) desc = "file: " + message.file.name;',
      '      else if (message && message.text) desc = "text: " + String(message.text).slice(0, 60);',
      '      send({ type: "sendToChat", text: desc });',
      '      return Promise.resolve();',
      '    }',
      '  };',
      '  /* joinRealtimeChannel is EXPERIMENTAL in the real spec; in preview we return a simulated channel that sends nothing. */',
      '  window.webxdc.joinRealtimeChannel = function () {',
      '    send({ type: "console", level: "warn", text: "joinRealtimeChannel: API experimental — en el preview el canal es simulado y no transmite datos" });',
      '    var closed = false;',
      '    return {',
      '      setListener: function (cb) { send({ type: "console", level: "log", text: "(preview) realtime setListener registrado" }); },',
      '      send: function (data) { send({ type: "console", level: "log", text: "(preview) realtime send: " + (data && data.length || 0) + " bytes (no entregado)" }); },',
      '      leave: function () { closed = true; }',
      '    };',
      '  };',
      '',
      '  /* Links: block external, warn on internal navigation */',
      '  document.addEventListener("click", function (ev) {',
      '    var a = ev.target && ev.target.closest ? ev.target.closest("a") : null;',
      '    if (!a) return;',
      '    var href = a.getAttribute("href") || "";',
      '    if (/^(https?:|mailto:|tel:)/i.test(href)) {',
      '      ev.preventDefault();',
      '      send({ type: "console", level: "warn", text: "Enlace externo bloqueado en el preview (webxdc no tiene internet): " + href });',
      '    } else if (href && href.charAt(0) !== "#" && /\\.html?($|[?#])/i.test(href)) {',
      '      ev.preventDefault();',
      '      send({ type: "navigate", href: href.split("#")[0].split("?")[0] });',
      '    }',
      '  }, true);',
      '',
      '  send({ type: "ready" });',
      '})();',
      ''
    ].join('\n');
  }

  /* Build the preview document (inline project files) */
  function safeInlineJs(js) {
    return String(js).replace(/<\/script/gi, '<\\/script');
  }

  function dualSource(tok, peer) {
    /* Override mock for dual-screen mode: updates go through the parent
   * channel (shared global serial) and reach both peers. */
    const names = {
      1: ['Ana', 'ana@preview'],
      2: ['Beto', 'beto@preview'],
      3: ['Carlos', 'carlos@preview'],
      4: ['Diana', 'diana@preview']
    };
    const who = names[peer] || ['Peer ' + peer, 'p' + peer + '@preview'];
    return [
      '/* Webxdc Creator Studio — modo dos pantallas (peer ' + peer + ') */',
      '(function () {',
      '  var TOK = ' + JSON.stringify(tok) + ';',
      '  var P = window.webxdc;',
      '  var listener = null;',
      '  P.selfName = ' + JSON.stringify(who[0]) + ';',
      '  P.selfAddr = ' + JSON.stringify(who[1]) + ';',
      '  function toParent(o) { o.__csPreview = TOK; parent.postMessage(o, "*"); }',
      '  P.sendUpdate = function (update, descr) {',
      '    if (!update || typeof update !== "object" || !("payload" in update)) {',
      '      toParent({ type: "console", level: "error", peer: ' + peer + ', text: "sendUpdate: falta update.payload" });',
      '      return Promise.resolve();',
      '    }',
      '    var json;',
      '    try { json = JSON.stringify(update); } catch (e) { json = undefined; }',
      '    if (json === undefined) {',
      '      toParent({ type: "console", level: "error", peer: ' + peer + ', text: "sendUpdate: payload no serializable como JSON" });',
      '      return Promise.resolve();',
      '    }',
      '    toParent({ type: "wcs-send", peer: ' + peer + ', update: { payload: update.payload, info: update.info, document: update.document, summary: update.summary } });',
      '    return Promise.resolve();',
      '  };',
      '  P.setUpdateListener = function (cb, fromSerial) {',
      '    listener = cb;',
      '    toParent({ type: "wcs-listen", peer: ' + peer + ', fromSerial: fromSerial || 0 });',
      '    return Promise.resolve();',
      '  };',
      '  window.addEventListener("message", function (ev) {',
      '    var d = ev.data;',
      '    if (!d || d.__csPreview !== TOK || d.type !== "wcs-deliver") return;',
      '    if (listener) {',
      '      try { listener(d.u); }',
      '      catch (err) { toParent({ type: "console", level: "error", peer: ' + peer + ', text: "Error en el listener: " + String(err && err.message || err) }); }',
      '    }',
      '  });',
      '  toParent({ type: "console", level: "log", peer: ' + peer + ', text: "pantalla ' + who[0] + ' lista" });',
      '})();',
      ''
    ].join('\n');
  }

  function buildPreviewDocument(p, entry, tok, peer) {
    const f = p.files[entry];
    if (!f || f.kind !== 'text') throw new Error('Entry no disponible: ' + entry);
    const doc = new DOMParser().parseFromString(f.content, 'text/html');
    const baseDir = U.dirname(entry);

    /* 1. quitar referencias a webxdc.js (el mock se inyecta aparte) */
    U.$$('script[src]', doc).forEach(function (s) {
      const src = s.getAttribute('src') || '';
      if (U.normalizeRelPath(src) === 'webxdc.js') s.remove();
    });

    /* 2. inlinear <script src> */
    U.$$('script[src]', doc).forEach(function (s) {
      const src = s.getAttribute('src') || '';
      const resolved = U.resolveRelPath(baseDir, src);
      const file = resolved ? p.files[resolved] : null;
      if (file && file.kind === 'text') {
        const inl = doc.createElement('script');
        inl.textContent = safeInlineJs(file.content);
        s.replaceWith(inl);
      } else {
        const inl = doc.createElement('script');
        inl.textContent = 'console.error("Preview: no se encuentra el archivo \\"" + ' + JSON.stringify(src) + ' + "\\" (¿falta en el proyecto?)");';
        s.replaceWith(inl);
      }
    });

    /* 3. inlinear <link rel=stylesheet href> */
    U.$$('link[rel="stylesheet"][href]', doc).forEach(function (l) {
      const href = l.getAttribute('href') || '';
      const resolved = U.resolveRelPath(baseDir, href);
      const file = resolved ? p.files[resolved] : null;
      if (file && file.kind === 'text') {
        const st = doc.createElement('style');
        st.textContent = '/* ' + resolved + ' */\n' + file.content;
        l.replaceWith(st);
      } else {
        const st = doc.createElement('style');
        st.textContent = '/* falta css: ' + U.esc(href) + ' */';
        l.replaceWith(st);
      }
    });

    /* images and media with local src → dataURL */
    U.$$('img[src], audio[src], video[src], source[src], input[type="image"][src]', doc).forEach(function (node) {
      const src = node.getAttribute('src') || '';
      if (/^(data:|https?:|blob:)/i.test(src)) return;
      const resolved = U.resolveRelPath(baseDir, src);
      const file = resolved ? p.files[resolved] : null;
      if (file && file.kind === 'data') {
        node.setAttribute('src', file.dataUrl);
      } else if (resolved && !p.files[resolved]) {
        node.setAttribute('src', 'data:image/svg+xml,' + encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#eee"/><text x="32" y="38" text-anchor="middle" font-size="9" fill="#b00">falta</text></svg>'
        ));
      }
    });

    /* 5. inyectar el mock como PRIMER script del head */
    const head = doc.head || doc.documentElement;
    const mock = doc.createElement('script');
    mock.textContent = mockSource(tok);
    head.insertBefore(mock, head.firstChild);

    /* asset map (dataURL) for set_image/play_sound blocks:
   * exported .xdc uses relative paths; preview uses dataURLs. */
    const assets = {};
    let assetBytes = 0;
    Object.keys(p.files).forEach(function (path) {
      const f = p.files[path];
      if (f.kind !== 'data') return;
      if (assetBytes + (f.size || 0) > 4 * 1024 * 1024) return; /* tope total */
      if ((f.size || 0) > 1024 * 1024) return;                  /* tope por archivo */
      assets[path] = f.dataUrl;
      assetBytes += f.size || 0;
    });
    const assetScript = doc.createElement('script');
    assetScript.textContent = 'window.__wcsAssets = ' + JSON.stringify(assets) + ';';
    head.insertBefore(assetScript, mock.nextSibling);

    /* dual-screen mode: mock override (after mock, before app scripts) */
    if (peer >= 1) {
      const dual = doc.createElement('script');
      dual.textContent = dualSource(tok, peer);
      head.insertBefore(dual, assetScript.nextSibling);
    }

    return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
  }

  /* ------------------------------------------------------------------ *
   * Consola del preview
   * ------------------------------------------------------------------ */
  let dual = false;
  let peerCount = 2;          /* 2–4 cuando dual */
  let previewMode = 'development'; /* development | faithful */
  let netLatency = 0;         /* ms — SIMULATION */
  let netDrop = 0;            /* 0–1 — SIMULATION */
  let peerFrames = [];
  let channelSerial = 0;
  let channelHistory = [];
  const storageEntries = [];

  function log(level, text, peer) {
    consoleEntries.push({ level: level, text: String(text), at: Date.now(), peer: peer });
    if (consoleEntries.length > MAX_ENTRIES) consoleEntries.splice(0, consoleEntries.length - MAX_ENTRIES);
    renderConsole();
  }

  function renderConsole() {
    if (!els.consoleList) return;
    els.consoleList.textContent = '';
    const frag = document.createDocumentFragment();
    consoleEntries.slice(-200).forEach(function (e) {
      const row = U.el('div', { class: 'con-line ' + e.level });
      const time = U.formatTime(e.at);
      row.appendChild(U.el('span', { class: 'con-time', text: time }));
      if (e.peer) row.appendChild(U.el('span', { class: 'con-peer', text: '[' + e.peer + ']' }));
      row.appendChild(U.el('span', { class: 'con-tag', text: tagFor(e.level) }));
      row.appendChild(U.el('span', { class: 'con-text', text: e.text }));
      frag.appendChild(row);
    });
    els.consoleList.appendChild(frag);
    if (els.consoleList.parentElement) els.consoleList.parentElement.scrollTop = els.consoleList.parentElement.scrollHeight;
    updateCounts();
  }

  function tagFor(level) {
    if (level === 'error') return 'ERR';
    if (level === 'warn') return 'WRN';
    if (level === 'xdc') return 'XDC';
    if (level === 'sys') return 'SYS';
    return 'LOG';
  }

  function updateCounts() {
    if (!els.errBadge) return;
    const n = consoleEntries.filter(function (e) { return e.level === 'error'; }).length;
    els.errBadge.textContent = n ? String(n) : '';
    els.errBadge.style.display = n ? '' : 'none';
  }

  /* ------------------------------------------------------------------ *
   * Ciclo de vida
   * ------------------------------------------------------------------ */
  function onMessage(ev) {
    const d = ev.data;
    if (!d || d.__csPreview !== token) return;
    if (d.type === 'ready') {
      log('sys', t('preview_started'));
    } else if (d.type === 'console') {
      log(d.level === 'debug' ? 'log' : d.level, d.text, d.peer);
    } else if (d.type === 'update') {
      log('xdc', 'sendUpdate → payload: ' + d.text + (d.info ? ' · info: "' + d.info + '"' : '') + ' (serial ' + d.serial + ')');
    } else if (d.type === 'sendToChat') {
      log('sys', 'sendToChat simulado (' + d.text + ') — en un chat real se abriría el selector para enviar');
    } else if (d.type === 'wcs-send') {
      /* multi-peer SIMULATION: el padre sella el serial y reparte */
      if (!dual) return;
      channelSerial += 1;
      const u = { payload: d.update.payload, serial: channelSerial, max_serial: channelSerial,
        info: d.update.info, document: d.update.document, summary: d.update.summary };
      channelHistory.push(u);
      if (channelHistory.length > 500) channelHistory.shift();
      let txt;
      try { txt = JSON.stringify(u.payload); } catch (e) { txt = String(u.payload); }
      log('xdc', '[' + d.peer + '] sendUpdate → payload: ' + U.truncate(txt, 120) + (u.info ? ' · info: "' + u.info + '"' : '') + ' (serial ' + u.serial + ')', d.peer);
      if (CS.inspector) CS.inspector.record({ method: 'sendUpdate', args: [u.payload], serial: u.serial, source: 'preview', status: 'SIMULATED', sender: String(d.peer) });
      peerFrames.forEach(function (f, idx) {
        const deliver = function () {
          if (netDrop > 0 && Math.random() < netDrop) {
            log('sys', 'SIMULATION: paquete descartado hacia peer ' + (idx + 1));
            return;
          }
          if (f && f.contentWindow) f.contentWindow.postMessage({ __csPreview: token, type: 'wcs-deliver', u: u }, '*');
        };
        if (netLatency > 0) setTimeout(deliver, netLatency);
        else deliver();
      });
    } else if (d.type === 'wcs-listen') {
      if (!dual) return;
      const target = ev.source;
      channelHistory.forEach(function (u) {
        if (u.serial > (d.fromSerial || 0)) {
          target.postMessage({ __csPreview: token, type: 'wcs-deliver', u: u }, '*');
        }
      });
    } else if (d.type === 'navigate') {
      log('sys', t('preview_navigate_note') + ': ' + d.href);
      const p = project();
      const resolved = U.resolveRelPath('', d.href);
      if (p && resolved && p.files[resolved] && U.extname(resolved) === 'html') {
        entryPath = resolved;
        restart();
      } else {
        log('warn', 'Página no encontrada en el proyecto: ' + d.href);
      }
    }
  }

  function start() {
    const p = project();
    if (!p) return;
    stop(true);
    const entryCandidates = CS.projects.fileList(p).filter(function (x) {
      return U.extname(x) === 'html' || U.extname(x) === 'htm';
    });
    if (!entryCandidates.length) {
      log('error', t('preview_no_html'));
      return;
    }
    if (!p.files[entryPath]) entryPath = 'index.html';
    if (!p.files[entryPath] || p.files[entryPath].kind !== 'text') {
      entryPath = entryCandidates[0];
    }

    token = U.uid();
    let html;
    try {
      html = buildPreviewDocument(p, entryPath, token);
    } catch (e) {
      log('error', t('preview_build_error') + ': ' + (e && e.message || e));
      return;
    }

    consoleEntries = [];
    listener = onMessage;
    window.addEventListener('message', listener);

    const sandbox = previewMode === 'faithful'
      ? 'allow-scripts'
      : 'allow-scripts allow-forms allow-modals allow-popups';
    const nPeers = dual ? Math.min(4, Math.max(2, peerCount || 2)) : 1;
    if (nPeers >= 2) {
      channelSerial = 0;
      channelHistory = [];
      peerFrames = [];
      els.frameWrap.classList.add('dual');
      els.frameWrap.classList.toggle('peers-3', nPeers === 3);
      els.frameWrap.classList.toggle('peers-4', nPeers === 4);
      const labels = { 1: 'Ana', 2: 'Beto', 3: 'Carlos', 4: 'Diana' };
      for (let n = 1; n <= nPeers; n++) {
        const peer = U.el('div', { class: 'preview-peer' });
        peer.appendChild(U.el('div', { class: 'preview-peer-label', text: n + ' · ' + (labels[n] || ('Peer ' + n)) + ' · SIMULATION' }));
        const frame = U.el('iframe', {
          class: 'preview-frame',
          sandbox: sandbox,
          title: 'preview ' + n,
          style: { background: '#fff' }
        });
        frame.srcdoc = buildPreviewDocument(p, entryPath, token, n);
        peer.appendChild(frame);
        els.frameWrap.appendChild(peer);
        peerFrames.push(frame);
      }
    } else {
      els.frameWrap.classList.remove('dual');
      els.frameWrap.classList.remove('peers-3');
      els.frameWrap.classList.remove('peers-4');
      const frame = U.el('iframe', {
        class: 'preview-frame',
        sandbox: sandbox,
        title: 'preview',
        style: { background: '#fff' }
      });
      els.frameWrap.textContent = '';
      els.frameWrap.appendChild(frame);
      frame.srcdoc = html;
    }

    running = true;
    stale = false;
    startedProjectId = p.id;
    renderControls();
    renderConsole();
  }

  function stop(silent) {
    if (listener) {
      window.removeEventListener('message', listener);
      listener = null;
    }
    if (els.frameWrap) els.frameWrap.textContent = '';
    peerFrames = [];
    if (running) {
      running = false;
      renderControls();
      if (!silent) log('sys', t('preview_stopped'));
    }
    token = null;
  }

  function restart() {
    if (running || stale) start();
  }

  function onProjectChanged() {
    if (running) {
      stale = true;
      renderControls();
    }
  }

  /* ------------------------------------------------------------------ *
   * Render de la vista
   * ------------------------------------------------------------------ */
  function render(root) {
    const p = project();
    els = {};
    root.textContent = '';

    if (!p) {
      root.appendChild(U.el('div', { class: 'empty-state card' },
        U.el('p', { text: t('preview_no_project') }),
        U.el('button', { class: 'btn primary', onclick: function () { CS.app.showView('projects'); } }, t('open_or_create'))));
      return;
    }

    /* Banner inconfundible y permanente */
    root.appendChild(U.el('div', { class: 'preview-banner', role: 'status' },
      U.el('span', { class: 'pv-badge', text: 'PREVIEW' }),
      U.el('span', { text: t('preview_banner') })));

    /* Controles */
    const controls = U.el('div', { class: 'preview-controls' });
    els.runBtn = U.el('button', { class: 'btn primary small', onclick: start }, U.icon('play', { size: 16 }), t('run'));
    els.stopBtn = U.el('button', { class: 'btn ghost small', onclick: function () { stop(); } }, U.icon('stop', { size: 16 }), t('stop'));
    els.restartBtn = U.el('button', { class: 'btn ghost small', onclick: start }, U.icon('refresh', { size: 16 }), t('restart'));
    els.dualBtn = U.el('button', { class: 'btn ghost small', onclick: function () { dual = !dual; if (dual && peerCount < 2) peerCount = 2; start(); } },
      U.icon(dual ? 'phone' : 'users', { size: 16 }), dual ? t('preview_single') : t('preview_dual'));
    els.modeBtn = U.el('button', {
      class: 'btn ghost small',
      title: previewMode === 'faithful' ? t('preview_faithful_hint') : t('preview_dev_hint'),
      onclick: function () {
        previewMode = previewMode === 'faithful' ? 'development' : 'faithful';
        start();
      }
    }, previewMode === 'faithful' ? t('preview_faithful') : t('preview_dev'));
    els.peersSel = U.el('select', {
      class: 'input select-small',
      'aria-label': t('preview_peers'),
      onchange: function () {
        peerCount = parseInt(this.value, 10) || 2;
        dual = peerCount >= 2;
        start();
      }
    });
    [1, 2, 3, 4].forEach(function (n) { els.peersSel.appendChild(new Option(n === 1 ? '1' : (n + ' · SIMULATION'), String(n))); });
    els.peersSel.value = dual ? String(Math.max(2, peerCount)) : '1';
    els.latIn = U.el('input', {
      class: 'input select-small', type: 'number', min: '0', max: '3000', value: String(netLatency),
      title: t('preview_latency'), 'aria-label': t('preview_latency'),
      onchange: function () { netLatency = Math.max(0, parseInt(this.value, 10) || 0); }
    });
    els.dropIn = U.el('input', {
      class: 'input select-small', type: 'number', min: '0', max: '100', value: String(Math.round(netDrop * 100)),
      title: t('preview_drop'), 'aria-label': t('preview_drop'),
      onchange: function () { netDrop = Math.max(0, Math.min(1, (parseInt(this.value, 10) || 0) / 100)); }
    });
    const htmlFiles = CS.projects.fileList(p).filter(function (x) { return U.extname(x) === 'html' || U.extname(x) === 'htm'; });
    els.entrySel = U.el('select', { class: 'input select-small', 'aria-label': 'entry' });
    htmlFiles.forEach(function (x) {
      els.entrySel.appendChild(new Option(x, x));
    });
    if (htmlFiles.indexOf(entryPath) < 0 && htmlFiles.length) entryPath = htmlFiles[0];
    els.entrySel.value = entryPath;
    els.entrySel.onchange = function () { entryPath = this.value; if (running) start(); };
    els.staleBadge = U.el('span', { class: 'stale-badge', style: { display: 'none' } }, t('preview_stale'));
    els.errBadge = U.el('span', { class: 'err-badge', style: { display: 'none' } });

    controls.appendChild(els.runBtn);
    controls.appendChild(els.stopBtn);
    controls.appendChild(els.restartBtn);
    controls.appendChild(els.dualBtn);
    controls.appendChild(els.modeBtn);
    controls.appendChild(els.peersSel);
    controls.appendChild(U.el('span', { class: 'hint', text: t('preview_latency') }));
    controls.appendChild(els.latIn);
    controls.appendChild(U.el('span', { class: 'hint', text: t('preview_drop') }));
    controls.appendChild(els.dropIn);
    controls.appendChild(els.entrySel);
    controls.appendChild(els.staleBadge);
    controls.appendChild(U.el('span', { class: 'spacer' }));
    controls.appendChild(els.errBadge);
    root.appendChild(controls);

    /* Iframe */
    els.frameWrap = U.el('div', { class: 'preview-frame-wrap' });
    root.appendChild(els.frameWrap);

    /* Consola */
    const consoleHead = U.el('div', { class: 'console-head' },
      U.icon('code', { size: 16 }), U.el('span', { text: t('console') }),
      U.el('span', { class: 'spacer' }),
      U.el('button', { class: 'btn ghost small', onclick: function () { consoleEntries = []; renderConsole(); } }, t('clear')));
    els.consoleList = U.el('div', { class: 'console-list' });
    const consoleWrap = U.el('div', { class: 'console-wrap' }, consoleHead, els.consoleList);
    root.appendChild(consoleWrap);

    renderControls();
    renderConsole();
    /* Autostart the first time the view opens; if the project changed since
   * last run, restart with the current one. */
    if (!running) {
      start();
    } else if (startedProjectId && startedProjectId !== p.id) {
      start();
    }
  }

  function renderControls() {
    if (!els.runBtn) return;
    if (els.dualBtn) {
      els.dualBtn.textContent = '';
      els.dualBtn.appendChild(U.icon(dual ? 'phone' : 'users', { size: 16 }));
      els.dualBtn.appendChild(document.createTextNode(dual ? t('preview_single') : t('preview_dual')));
    }
    if (els.modeBtn) els.modeBtn.textContent = previewMode === 'faithful' ? t('preview_faithful') : t('preview_dev');
    els.runBtn.style.display = running ? 'none' : '';
    els.stopBtn.style.display = running ? '' : 'none';
    els.restartBtn.style.display = running ? '' : 'none';
    els.staleBadge.style.display = stale ? '' : 'none';
  }

  /* ------------------------------------------------------------------ *
   * Export
   * ------------------------------------------------------------------ */
  CS.preview = {
    render, start, stop, restart, onProjectChanged,
    buildPreviewDocument, mockSource, safeInlineJs,
    get isRunning() { return running; },
    get logs() { return consoleEntries.slice(); },
    get mode() { return previewMode; },
    setMode: function (m) { previewMode = m === 'faithful' ? 'faithful' : 'development'; },
    get peerCount() { return dual ? Math.max(2, peerCount) : 1; },
    setPeerCount: function (n) { n = parseInt(n, 10) || 1; if (n <= 1) { dual = false; peerCount = 1; } else { dual = true; peerCount = Math.min(4, n); } },
    _reset: function () { stop(true); consoleEntries = []; running = false; stale = false; dual = false; peerCount = 2; previewMode = 'development'; netLatency = 0; netDrop = 0; channelSerial = 0; channelHistory = []; }
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = CS.preview; }
})();
