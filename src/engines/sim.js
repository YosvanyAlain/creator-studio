/* Simulator: runs a project in sandboxed iframes with a faithful webxdc stand-in for 1-4 people. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const U = CS.util;
  const PEOPLE = [
    { name: 'Ana', addr: 'ana@sim.local', tint: 'violet' },
    { name: 'Beto', addr: 'beto@sim.local', tint: 'teal' },
    { name: 'Carla', addr: 'carla@sim.local', tint: 'orange' },
    { name: 'Dani', addr: 'dani@sim.local', tint: 'blue' }
  ];
  const MAX_UPDATE = 128000;
  const MAX_ASSET_INLINE = 2 * 1048576;

  /* Code injected first into every simulated app. Plain ES5 so any app style works. */
  function runtime(cfg) {
    return '(' + function (CFG) {
      var TOK = CFG.tok;
      function up(msg) { msg.__sim = TOK; msg.peer = CFG.peer; try { parent.postMessage(msg, '*'); } catch (e) { /* closed */ } }
      function fmt(v) {
        try {
          if (typeof v === 'string') return v;
          if (v instanceof Error) return v.name + ': ' + v.message;
          if (typeof v === 'function') return 'function ' + (v.name || '') + '()';
          if (v && v.nodeType === 1) return '<' + v.tagName.toLowerCase() + (v.id ? '#' + v.id : '') + '>';
          var s = JSON.stringify(v);
          return s === undefined ? String(v) : s;
        } catch (e) { return String(v); }
      }
      function where(stack) {
        var m = /([\w./-]+\.(?:js|html)):(\d+):(\d+)/.exec(String(stack || ''));
        return m ? { file: m[1], line: +m[2], col: +m[3] } : null;
      }
      ['log', 'info', 'warn', 'error', 'debug'].forEach(function (level) {
        var orig = console[level] ? console[level].bind(console) : function () {};
        console[level] = function () {
          var parts = [];
          for (var i = 0; i < arguments.length; i++) parts.push(fmt(arguments[i]));
          var text = parts.join(' ');
          up({ type: 'console', level: level === 'debug' ? 'log' : level, text: text.length > 1200 ? text.slice(0, 1200) + '…' : text,
            at: level === 'error' ? where(new Error().stack.split('\n').slice(2).join('\n')) : null });
          orig.apply(null, arguments);
        };
      });
      window.addEventListener('error', function (e) {
        if (e.target && e.target !== window && e.target.tagName) {
          up({ type: 'console', level: 'error', code: 'missing-resource', text: (e.target.getAttribute('src') || e.target.getAttribute('href') || e.target.tagName) });
          return;
        }
        up({ type: 'console', level: 'error', code: 'runtime', text: String(e.message || 'Error'), at: where(e.error && e.error.stack) || (e.lineno ? { file: '', line: e.lineno, col: e.colno } : null) });
      }, true);
      window.addEventListener('unhandledrejection', function (e) {
        var r = e && e.reason;
        up({ type: 'console', level: 'error', code: 'promise', text: fmt(r), at: where(r && r.stack) });
      });

      /* Persistent localStorage per simulated person. */
      var store = CFG.storage || {};
      var ls = {
        getItem: function (k) { k = String(k); return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
        setItem: function (k, v) { store[String(k)] = String(v); up({ type: 'storage', data: store }); },
        removeItem: function (k) { delete store[String(k)]; up({ type: 'storage', data: store }); },
        clear: function () { store = {}; up({ type: 'storage', data: store }); },
        key: function (i) { return Object.keys(store)[i] || null; }
      };
      Object.defineProperty(ls, 'length', { get: function () { return Object.keys(store).length; } });
      var mem = {};
      var ss = {
        getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
        setItem: function (k, v) { mem[k] = String(v); }, removeItem: function (k) { delete mem[k]; },
        clear: function () { mem = {}; }, key: function (i) { return Object.keys(mem)[i] || null; }
      };
      try { Object.defineProperty(window, 'localStorage', { value: ls, configurable: true }); } catch (e) { /* locked */ }
      try { Object.defineProperty(window, 'sessionStorage', { value: ss, configurable: true }); } catch (e) { /* locked */ }

      /* Local files for fetch() and XHR-free loading. */
      var FILES = CFG.files;
      var realFetch = window.fetch;
      window.fetch = function (input, init) {
        var url = typeof input === 'string' ? input : (input && input.url) || '';
        if (/^(https?:|wss?:)/i.test(url)) {
          up({ type: 'console', level: 'warn', code: 'network', text: url });
          return Promise.reject(new TypeError('Network access is not available in webxdc'));
        }
        var path = url.replace(/^\.\//, '').split('#')[0].split('?')[0];
        if (Object.prototype.hasOwnProperty.call(FILES, path)) return realFetch(FILES[path]);
        return Promise.resolve(new Response('Not found', { status: 404, statusText: 'Not Found' }));
      };
      window.WebSocket = function () { up({ type: 'console', level: 'warn', code: 'network', text: 'WebSocket' }); throw new Error('Network access is not available in webxdc'); };

      var listener = null;
      var rtListener = null;
      var rtOpen = false;
      window.webxdc = {
        selfAddr: CFG.addr,
        selfName: CFG.name,
        sendUpdateInterval: 10000,
        sendUpdateMaxSize: CFG.max,
        sendUpdate: function (update, descr) {
          if (!update || typeof update !== 'object' || !('payload' in update)) {
            up({ type: 'console', level: 'error', code: 'no-payload', text: 'webxdc.sendUpdate()' });
            return;
          }
          var json;
          try { json = JSON.stringify(update); } catch (e) { json = undefined; }
          if (json === undefined) { up({ type: 'console', level: 'error', code: 'not-json', text: 'webxdc.sendUpdate()' }); return; }
          if (json.length > CFG.max) { up({ type: 'console', level: 'error', code: 'too-big', text: String(json.length) }); return; }
          up({ type: 'send', update: JSON.parse(json), descr: descr == null ? '' : String(descr), size: json.length });
        },
        setUpdateListener: function (cb, serial) {
          listener = cb;
          up({ type: 'listen', since: serial || 0 });
          return new Promise(function (resolve) { window.__simListenResolve = resolve; });
        },
        getAllUpdates: function () { return Promise.resolve([]); },
        sendToChat: function (message) {
          var info = { text: message && message.text ? String(message.text) : '' };
          var file = message && message.file;
          if (file) {
            info.name = file.name || '';
            var finish = function (b64, size) { info.base64 = b64; info.size = size; up({ type: 'chat', message: info }); };
            if (file.blob && file.blob.arrayBuffer) {
              file.blob.arrayBuffer().then(function (buf) {
                var bytes = new Uint8Array(buf), bin = '';
                for (var i = 0; i < bytes.length; i += 32768) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768));
                finish(btoa(bin), bytes.length);
              });
            } else if (file.base64 != null) finish(String(file.base64), Math.floor(String(file.base64).length * 3 / 4));
            else if (file.plainText != null) finish(btoa(unescape(encodeURIComponent(file.plainText))), file.plainText.length);
            else up({ type: 'chat', message: info });
          } else up({ type: 'chat', message: info });
          return Promise.resolve();
        },
        importFiles: function (filter) {
          return new Promise(function (resolve) {
            var input = document.createElement('input');
            input.type = 'file';
            input.multiple = !!(filter && filter.multiple);
            var ext = (filter && filter.extensions) || [];
            var mime = (filter && filter.mimeTypes) || [];
            input.accept = ext.concat(mime).join(',');
            input.style.display = 'none';
            input.onchange = function () { resolve(Array.prototype.slice.call(input.files || [])); input.remove(); };
            document.body.appendChild(input);
            input.click();
          });
        },
        joinRealtimeChannel: function () {
          rtOpen = true;
          up({ type: 'rt-join' });
          return {
            setListener: function (cb) { rtListener = cb; },
            send: function (data) {
              if (!rtOpen || !data || typeof data.length !== 'number') return;
              if (data.length > 128000) { up({ type: 'console', level: 'error', code: 'rt-too-big', text: String(data.length) }); return; }
              up({ type: 'rt', data: Array.prototype.slice.call(data) });
            },
            leave: function () { rtOpen = false; rtListener = null; up({ type: 'rt-leave' }); }
          };
        }
      };

      window.addEventListener('message', function (ev) {
        var d = ev.data;
        if (!d || d.__sim !== TOK) return;
        if (d.type === 'deliver') {
          for (var i = 0; i < d.updates.length; i++) {
            if (!listener) break;
            try { listener(d.updates[i]); } catch (err) { up({ type: 'console', level: 'error', code: 'listener', text: fmt(err), at: where(err && err.stack) }); }
          }
          if (d.initial && window.__simListenResolve) { window.__simListenResolve(); window.__simListenResolve = null; }
        } else if (d.type === 'rt-deliver' && rtOpen && rtListener) {
          try { rtListener(new Uint8Array(d.data)); } catch (err) { up({ type: 'console', level: 'error', code: 'listener', text: fmt(err) }); }
        }
      });

      document.addEventListener('click', function (ev) {
        var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
        if (!a) return;
        var href = a.getAttribute('href') || '';
        if (/^(https?:|mailto:|tel:)/i.test(href)) { ev.preventDefault(); up({ type: 'console', level: 'warn', code: 'external-link', text: href }); }
        else if (href && href.charAt(0) !== '#' && /\.html?($|[?#])/i.test(href)) { ev.preventDefault(); up({ type: 'navigate', href: href.split('#')[0].split('?')[0] }); }
      }, true);
      up({ type: 'ready' });
    }.toString() + ')(' + JSON.stringify(cfg).replace(/</g, '\\u003c') + ');';
  }

  /* ---------- Document assembly ---------- */
  function resolve(base, ref) {
    if (/^(data:|https?:|blob:|#|\/\/)/i.test(ref)) return null;
    const parts = (base ? base.split('/') : []).concat(ref.split('#')[0].split('?')[0].split('/'));
    const out = [];
    for (const part of parts) {
      if (!part || part === '.') continue;
      if (part === '..') out.pop(); else out.push(part);
    }
    return out.join('/');
  }

  function assetUrls(p) {
    const map = {};
    for (const [path, f] of Object.entries(p.files)) {
      if (f.kind === 'data') { if ((f.size || 0) <= MAX_ASSET_INLINE) map[path] = f.dataUrl; }
      else map[path] = 'data:' + U.mimeOf(path) + ';charset=utf-8,' + encodeURIComponent(f.content);
    }
    return map;
  }

  function cssWithAssets(css, base, p) {
    return String(css).replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, ref) => {
      const path = resolve(base, ref);
      const f = path && p.files[path];
      return f && f.kind === 'data' ? 'url("' + f.dataUrl + '")' : m;
    });
  }

  const inlineJs = (code, name) => String(code).replace(/<\/script/gi, '<\\/script') + '\n//# sourceURL=' + name;

  function buildDocument(p, entry, cfg) {
    const f = p.files[entry];
    if (!f || f.kind !== 'text') throw Object.assign(new Error('no entry'), { code: 'no-entry' });
    const doc = new DOMParser().parseFromString(f.content, 'text/html');
    const base = U.dirname(entry);
    const missing = [];
    doc.querySelectorAll('script[src]').forEach((s) => {
      const src = s.getAttribute('src') || '';
      const path = resolve(base, src);
      if (path === 'webxdc.js') { s.remove(); return; }
      const file = path && p.files[path];
      const inline = doc.createElement('script');
      if (s.hasAttribute('type')) inline.setAttribute('type', s.getAttribute('type'));
      if (file && file.kind === 'text') inline.textContent = inlineJs(file.content, path);
      else { missing.push(src); inline.textContent = 'console.error(' + JSON.stringify('missing:' + src) + ');'; }
      s.replaceWith(inline);
    });
    doc.querySelectorAll('script:not([src])').forEach((s, i) => {
      if (!/sourceURL=/.test(s.textContent)) s.textContent = inlineJs(s.textContent, entry.replace(/\.html?$/, '') + '.inline' + (i + 1) + '.js');
    });
    doc.querySelectorAll('link[rel~="stylesheet"][href]').forEach((l) => {
      const href = l.getAttribute('href') || '';
      const path = resolve(base, href);
      const file = path && p.files[path];
      const style = doc.createElement('style');
      if (file && file.kind === 'text') style.textContent = cssWithAssets(file.content, U.dirname(path), p);
      else if (path) missing.push(href);
      l.replaceWith(style);
    });
    doc.querySelectorAll('style').forEach((s) => { s.textContent = cssWithAssets(s.textContent, base, p); });
    doc.querySelectorAll('[style]').forEach((el) => el.setAttribute('style', cssWithAssets(el.getAttribute('style'), base, p)));
    doc.querySelectorAll('img[src], audio[src], video[src], source[src], input[type="image"][src], link[rel~="icon"][href]').forEach((el) => {
      const attr = el.hasAttribute('src') ? 'src' : 'href';
      const ref = el.getAttribute(attr) || '';
      const path = resolve(base, ref);
      if (!path) return;
      const file = p.files[path];
      if (file && file.kind === 'data') el.setAttribute(attr, file.dataUrl);
      else if (!file) missing.push(ref);
    });
    const head = doc.head || doc.documentElement;
    const boot = doc.createElement('script');
    boot.textContent = runtime(Object.assign({ files: assetUrls(p), max: MAX_UPDATE }, cfg));
    head.insertBefore(boot, head.firstChild);
    const assets = doc.createElement('script');
    const map = {};
    for (const [path, file] of Object.entries(p.files)) if (file.kind === 'data' && (file.size || 0) <= MAX_ASSET_INLINE) map[path] = file.dataUrl;
    assets.textContent = 'window.__wcsAssets=' + JSON.stringify(map) + ';';
    head.insertBefore(assets, boot.nextSibling);
    if (!doc.querySelector('meta[name="viewport"]')) {
      const meta = doc.createElement('meta');
      meta.setAttribute('name', 'viewport');
      meta.setAttribute('content', 'width=device-width, initial-scale=1');
      head.insertBefore(meta, head.firstChild);
    }
    return { html: '<!DOCTYPE html>\n' + doc.documentElement.outerHTML, missing };
  }

  function entryOf(p, preferred) {
    if (preferred && p.files[preferred]) return preferred;
    if (p.files['index.html']) return 'index.html';
    return Object.keys(p.files).find((x) => /\.html?$/i.test(x)) || null;
  }

  /* ---------- Session ---------- */
  function create(options) {
    const o = Object.assign({ peers: 1, latency: 0, drop: 0, entry: null }, options);
    const project = o.project;
    const token = 'sim' + U.uid();
    let peers = U.clamp(o.peers, 1, 4);
    let entry = entryOf(project, o.entry);
    let frames = [];
    let serial = 0;
    const updates = [];
    const storage = PEOPLE.map(() => ({}));
    const listening = new Set();
    const handlers = new Set();
    let rtMembers = new Set();
    let latency = o.latency;
    let drop = o.drop;
    let host = null;

    const emit = (event) => handlers.forEach((fn) => { try { fn(event); } catch (error) { console.error(error); } });
    const frameOf = (peer) => frames[peer - 1];
    const post = (peer, msg) => { const f = frameOf(peer); if (f && f.contentWindow) f.contentWindow.postMessage(Object.assign({ __sim: token }, msg), '*'); };
    const later = (fn) => (latency > 0 ? setTimeout(fn, latency) : fn());
    const lost = () => drop > 0 && Math.random() < drop;

    function onMessage(ev) {
      const d = ev.data;
      if (!d || d.__sim !== token) return;
      const peer = d.peer;
      if (d.type === 'send') {
        serial += 1;
        const u = Object.assign({}, d.update, { serial, max_serial: serial });
        updates.push({ u, from: peer, at: Date.now(), size: d.size, descr: d.descr });
        if (updates.length > 1000) updates.shift();
        emit({ type: 'update', peer, update: u, size: d.size, descr: d.descr });
        for (let target = 1; target <= peers; target++) {
          if (!listening.has(target)) continue;
          if (target !== peer && lost()) { emit({ type: 'dropped', peer: target, serial }); continue; }
          later(() => post(target, { type: 'deliver', updates: [u] }));
        }
      } else if (d.type === 'listen') {
        listening.add(peer);
        const backlog = updates.map((x) => x.u).filter((u) => u.serial > (d.since || 0)).map((u) => Object.assign({}, u, { max_serial: serial }));
        post(peer, { type: 'deliver', updates: backlog, initial: true });
      } else if (d.type === 'storage') {
        storage[peer - 1] = d.data || {};
        emit({ type: 'storage', peer });
      } else if (d.type === 'rt-join') { rtMembers.add(peer); emit({ type: 'rt', peer, joined: true });
      } else if (d.type === 'rt-leave') { rtMembers.delete(peer); emit({ type: 'rt', peer, joined: false });
      } else if (d.type === 'rt') {
        for (const target of rtMembers) if (target !== peer && !lost()) later(() => post(target, { type: 'rt-deliver', data: d.data }));
        emit({ type: 'rt-data', peer, size: d.data.length });
      } else if (d.type === 'navigate') {
        const path = resolve(U.dirname(entry), d.href);
        if (path && project.files[path]) { entry = path; reload(); emit({ type: 'navigate', peer, entry }); }
        else emit({ type: 'console', peer, level: 'error', code: 'missing-page', text: d.href });
      } else {
        emit(Object.assign({}, d));
      }
    }

    function frameFor(peer) {
      const person = PEOPLE[peer - 1];
      const built = buildDocument(project, entry, { tok: token, peer, name: peers > 1 ? person.name : CS.t('sim_you'), addr: person.addr, storage: storage[peer - 1] });
      if (built.missing.length) emit({ type: 'missing', peer, files: built.missing });
      const frame = CS.h('iframe', { class: 'sim-frame', title: person.name, sandbox: 'allow-scripts allow-forms allow-modals allow-pointer-lock', allow: 'autoplay; fullscreen' });
      frame.srcdoc = built.html;
      return frame;
    }

    function reload() {
      if (!host) return;
      listening.clear();
      rtMembers = new Set();
      if (!entry) { emit({ type: 'no-entry' }); frames = []; CS.mount(host, null); return; }
      try {
        frames = [];
        for (let peer = 1; peer <= peers; peer++) {
          const frame = frameFor(peer);
          frames.push(frame);
        }
        emit({ type: 'reload', frames: frames.slice(), peers, entry });
      } catch (error) {
        emit({ type: 'console', peer: 1, level: 'error', code: 'build', text: String(error && error.message || error) });
      }
    }

    window.addEventListener('message', onMessage);
    return {
      PEOPLE,
      get peers() { return peers; },
      get entry() { return entry; },
      get frames() { return frames; },
      get updates() { return updates; },
      get serial() { return serial; },
      storage: (peer) => storage[peer - 1],
      on(fn) { handlers.add(fn); return () => handlers.delete(fn); },
      attach(el) { host = el; reload(); },
      reload,
      setPeers(n) { peers = U.clamp(n, 1, 4); reload(); },
      setEntry(path) { entry = entryOf(project, path); reload(); },
      setNetwork(opts) { if (opts.latency != null) latency = opts.latency; if (opts.drop != null) drop = opts.drop; },
      resetData() { updates.length = 0; serial = 0; for (let i = 0; i < storage.length; i++) storage[i] = {}; reload(); },
      destroy() { window.removeEventListener('message', onMessage); handlers.clear(); frames = []; host = null; }
    };
  }

  CS.sim = { create, buildDocument, entryOf, PEOPLE, resolve };
})();
