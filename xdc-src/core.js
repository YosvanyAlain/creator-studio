/* =========================================================================
 * Webxdc Creator Studio — core.js
 * Shared utilities (DOM helpers, paths, icons, cloning).
 * ========================================================================= */
'use strict';
(function () {
  const CS = (globalThis.CS = globalThis.CS || {});

  /* ---------- Constantes ---------- */
  const TEXT_EXTS = [
    'html', 'htm', 'js', 'mjs', 'css', 'txt', 'md', 'json', 'toml', 'svg',
    'csv', 'xml', 'yml', 'yaml', 'map', 'webmanifest', 'ts', 'ini', 'conf'
  ];
  const JS_RESERVED = new Set([
    'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
    'default', 'delete', 'do', 'else', 'export', 'extends', 'false',
    'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'new',
    'null', 'return', 'super', 'switch', 'this', 'throw', 'true', 'try',
    'typeof', 'var', 'void', 'while', 'with', 'yield', 'let', 'static',
    'enum', 'await', 'implements', 'package', 'protected', 'interface',
    'private', 'public'
  ]);

  /* ---------- DOM helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* Create an element: el('div', {class:'x', text:'hi', onclick: fn}, children...) */
  function el(tag, attrs) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const key of Object.keys(attrs)) {
        const val = attrs[key];
        if (val == null) continue;
        if (key === 'text') { node.textContent = val; }
        else if (key === 'html') { node.innerHTML = val; }
        else if (key === 'class') { node.className = val; }
        else if (key === 'dataset') { Object.assign(node.dataset, val); }
        else if (key === 'style' && typeof val === 'object') { Object.assign(node.style, val); }
        else if (key.startsWith('on') && typeof val === 'function') { node.addEventListener(key.slice(2), val); }
        else if (key === 'value') { node.value = val; }
        else if (key === 'checked' || key === 'disabled' || key === 'selected' || key === 'open') { node[key] = !!val; }
        /* 'open' as boolean: setAttribute('open','false') would OPEN details (attribute presence) */
        else { node.setAttribute(key, val); }
      }
    }
    for (let i = 2; i < arguments.length; i++) {
      const child = arguments[i];
      if (child == null || child === false) continue;
      if (Array.isArray(child)) {
        child.forEach((c) => { if (c != null && c !== false) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
      } else {
        node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
      }
    }
    return node;
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function debounce(fn, ms) {
    let timer = null;
    const wrapped = function () {
      const args = arguments, self = this;
      clearTimeout(timer);
      timer = setTimeout(() => { timer = null; fn.apply(self, args); }, ms);
    };
    wrapped.cancel = () => { clearTimeout(timer); timer = null; };
    wrapped.flush = function () {
      if (timer) { clearTimeout(timer); timer = null; fn.apply(this, arguments); }
    };
    return wrapped;
  }

  /* ---------- Formato ---------- */
  function formatBytes(n) {
    if (typeof n !== 'number' || isNaN(n)) return '?';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function formatTime(ts) {
    try {
      const d = new Date(ts);
      const pad = (x) => String(x).padStart(2, '0');
      return pad(d.getHours()) + ':' + pad(d.getMinutes());
    } catch (e) { return ''; }
  }

  function formatDate(ts) {
    try {
      const d = new Date(ts);
      const pad = (x) => String(x).padStart(2, '0');
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    } catch (e) { return ''; }
  }

  function truncate(s, n) {
    s = String(s == null ? '' : s);
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

  /* ---------- Bytes / base64 ---------- */
  const te = (typeof TextEncoder !== 'undefined') ? new TextEncoder() : null;
  const td = (typeof TextDecoder !== 'undefined') ? new TextDecoder() : null;

  function utf8Bytes(str) {
    if (te) return te.encode(String(str));
    /* Fallback (WebView muy antiguo) */
    const out = [];
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c < 128) out.push(c);
      else if (c < 2048) { out.push(192 | (c >> 6), 128 | (c & 63)); }
      else { out.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63)); }
    }
    return new Uint8Array(out);
  }

  function bytesToB64(bytes) {
    let s = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(s);
  }

  function b64ToBytes(b64) {
    const bin = atob(String(b64));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function dataUrlToBytes(dataUrl) {
    const idx = String(dataUrl).indexOf('base64,');
    if (idx < 0) return new Uint8Array(0);
    return b64ToBytes(dataUrl.slice(idx + 7));
  }

  function byteLen(str) { const b = utf8Bytes(str); return b.length; }

  /* ---------- IDs ---------- */
  function uid() {
    try {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    } catch (e) { /* ignore */ }
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  /* ---------- Cloning ---------- */
  function deepClone(obj) {
    if (typeof structuredClone === 'function') {
      try { return structuredClone(obj); } catch (e) { /* fallthrough */ }
    }
    return JSON.parse(JSON.stringify(obj));
  }

  /* ---------- Rutas de archivos ---------- */
  function extname(path) {
    const p = String(path || '');
    const base = p.split('/').pop() || '';
    const idx = base.lastIndexOf('.');
    return idx <= 0 ? '' : base.slice(idx + 1).toLowerCase();
  }

  function basename(path) {
    return String(path || '').split('/').pop() || '';
  }

  function dirname(path) {
    const p = String(path || '');
    const idx = p.lastIndexOf('/');
    return idx < 0 ? '' : p.slice(0, idx);
  }

  /* Normalize separators and '.', '..' segments in a relative path.
   * Returns null if the path escapes the root. */
  function normalizeRelPath(path) {
    let p = String(path || '').trim().replace(/\\/g, '/');
    if (!p) return null;
    while (p.startsWith('./')) p = p.slice(2);
    if (p.startsWith('/') || p.endsWith('/..') || p === '..') return null;
    const parts = p.split('/');
    const out = [];
    for (const part of parts) {
      if (part === '' || part === '.') continue;
      if (part === '..') {
        if (out.length === 0) return null;
        out.pop();
      } else {
        out.push(part);
      }
    }
    if (out.length === 0) return null;
    return out.join('/');
  }

  /* Resolve an href relative to baseDir (folder of the referencing file).
     Returns null for external URLs (scheme://), data:, etc. */
  function resolveRelPath(baseDir, href) {
    let h = String(href || '').trim();
    const hashIdx = h.search(/[?#]/);
    if (hashIdx >= 0) h = h.slice(0, hashIdx);
    if (!h) return null;
    /* URLs with a scheme (http:, https:, mailto:, data:, blob:, …) are not local paths */
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(h)) return null;
    if (h.startsWith('//')) return null;
    if (h.startsWith('/')) return normalizeRelPath(h.slice(1));
    const joined = baseDir ? baseDir + '/' + h : h;
    return normalizeRelPath(joined);
  }

  const SAFE_PATH_RE = /^[^\\/]+(\/[^\\/]+)*$/;

  /* Valid and safe path for a file inside the .xdc? */
  function isSafePath(path) {
    const p = String(path || '');
    if (p.length === 0 || p.length > 200) return false;
    if (/[\u0000-\u001f]/.test(p)) return false;
    if (/^\.?\//.test(p)) return false;
    const n = normalizeRelPath(p);
    if (!n || n !== p) return false;
    if (p.includes('..')) return false;
    return SAFE_PATH_RE.test(p);
  }

  function isTextFile(path) {
    return TEXT_EXTS.indexOf(extname(path)) >= 0;
  }

  /* Safe .xdc file name (ascii, no path). Diacritics are transliterated (a->a) so names stay ASCII. */
  function sanitizeFileName(name) {
    let s = String(name || '').trim();
    try { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) { /* ignore */ }
    s = s
      .replace(/[\u0000-\u001f]/g, '')
      .replace(/[^\w.\- ]+/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '');
    if (!s) s = 'webxdc-app';
    if (!/^[\w.-]+$/.test(s)) s = 'webxdc-app';
    if (s.length > 60) s = s.slice(0, 60).replace(/[-.]+$/, '') || 'webxdc-app';
    return s;
  }

  /* Valid JS variable name */
  function isVarName(name) {
    return typeof name === 'string' && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) && !JS_RESERVED.has(name);
  }

  /* Id de elemento HTML razonable */
  function isElementId(id) {
    return typeof id === 'string' && /^[A-Za-z][A-Za-z0-9_-]*$/.test(id) && id.length <= 64;
  }

  function slugify(name) {
    const s = String(name || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return s || 'app';
  }

  /* ---------- SVG icons (same stroke on iOS / Android / desktop) ---------- */
  const SVG_NS = 'http://www.w3.org/2000/svg';
  /* Each entry: 24×24 stroke paths. No emoji, so glyphs do not depend on the OS. */
  const ICONS = {
    menu: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
    home: ['M3 10.5L12 3l9 7.5V21h-6v-7H9v7H3V10.5z'],
    folder: ['M3 7h6l2 2h10v11H3z', 'M3 7V5h6l2 2'],
    grid: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
    code: ['M8 8l-4 4 4 4', 'M16 8l4 4-4 4', 'M13 6l-2 12'],
    blocks: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M15 15h5v5h-5z'],
    file: ['M6 3h8l6 6v12H6z', 'M14 3v6h6'],
    puzzle: ['M12 3v3a2 2 0 1 0 0 4v3h3a2 2 0 1 1 4 0h2v-5h-3V3H12z', 'M8 12H5V8H3v11h8v-2a2 2 0 1 0 0-4H8z'],
    play: ['M8 5v14l11-7z'],
    inspect: ['M11 5a6 6 0 1 1 0 12 6 6 0 0 1 0-12z', 'M16 16l5 5'],
    box: ['M3 7l9-4 9 4-9 4z', 'M3 7v10l9 4V11', 'M21 7v10l-9 4'],
    help: ['M12 3a7 7 0 1 1 0 14 7 7 0 0 1 0-14z', 'M12 17v.5', 'M9.5 9a2.5 2.5 0 1 1 3.2 2.4c-.7.3-1.2.9-1.2 1.6V14'],
    gear: ['M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z', 'M12 2v2', 'M12 20v2', 'M4.9 4.9l1.4 1.4', 'M17.7 17.7l1.4 1.4', 'M2 12h2', 'M20 12h2', 'M4.9 19.1l1.4-1.4', 'M17.7 6.3l1.4-1.4'],
    plus: ['M12 5v14', 'M5 12h14'],
    close: ['M6 6l12 12', 'M18 6L6 18'],
    undo: ['M9 14 4 9l5-5', 'M4 9h10.5a5.5 5.5 0 0 1 0 11H11'],
    redo: ['m15 14 5-5-5-5', 'M20 9H9.5a5.5 5.5 0 0 0 0 11H13'],
    wrap: ['M4 7h16', 'M4 12h11a3 3 0 0 1 0 6H9', 'M11 16l-2 2 2 2'],
    pencil: ['M4 20h4L19 9l-4-4L4 16v4z', 'M13 7l4 4'],
    image: ['M4 5h16v14H4z', 'M4 16l5-5 4 4 2-2 5 5', 'M9 9a1.5 1.5 0 1 1 0 .1'],
    audio: ['M5 10v4h3l5 4V6L8 10H5z', 'M16 9a4 4 0 0 1 0 6'],
    expand: ['M9 4H4v5', 'M15 4h5v5', 'M4 15v5h5', 'M20 15v5h-5'],
    trash: ['M5 7h14', 'M10 7V5h4v2', 'M6 7l1 13h10l1-13'],
    copy: ['M8 8h12v12H8z', 'M4 16V4h12'],
    check: ['M5 12l5 5 9-10'],
    warn: ['M12 3l10 18H2L12 3z', 'M12 10v5', 'M12 18v.5'],
    db: ['M4 6c0-2 4-3 8-3s8 1 8 3-4 3-8 3-8-1-8-3z', 'M4 6v12c0 2 4 3 8 3s8-1 8-3V6'],
    bolt: ['M13 2L4 14h7l-1 8 10-14h-7z'],
    wait: ['M6 5h12', 'M6 19h12', 'M8 5c0 4 8 4 8 14', 'M16 5C16 9 8 9 8 19'],
    dot: ['M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z'],
    radioOn: ['M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z', 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z'],
    radioOff: ['M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z'],
    users: ['M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1', 'M10 8a3 3 0 1 1 0 6 3 3 0 0 1 0-6z', 'M20 19v-1a3.5 3.5 0 0 0-2.5-3.3', 'M16 5.5a2.5 2.5 0 1 1 0 5'],
    chat: ['M5 5h14v10H8l-3 3V5z'],
    shield: ['M12 3l8 4v6c0 4-3.2 7.2-8 8-4.8-.8-8-4-8-8V7l8-4z'],
    rocket: ['M12 3c4 3 6 7 6 11-2 0-4 .5-6 2-2-1.5-4-2-6-2 0-4 2-8 6-11z', 'M12 16v5', 'M9 19h6'],
    palette: ['M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 0-4h-1', 'M8 10a1 1 0 1 1 0 .1', 'M12 7a1 1 0 1 1 0 .1', 'M16 10a1 1 0 1 1 0 .1'],
    list: ['M8 7h12', 'M8 12h12', 'M8 17h12', 'M4 7h.01', 'M4 12h.01', 'M4 17h.01'],
    hand: ['M9 11V6a1 1 0 0 1 2 0v5', 'M11 10V5a1 1 0 0 1 2 0v5', 'M13 11V7a1 1 0 0 1 2 0v6', 'M8 13c0 4 2 7 4 7s4-3 4-7V11'],
    click: ['M10 4v10l3-2 2 6 2-1-2-6h4z'],
    fn: ['M6 5h8', 'M10 5v14', 'M7 12h6', 'M16 15l5-6'],
    start: ['M5 5h14v4H5z', 'M8 13l4 4 4-4'],
    sync: ['M5 12a7 7 0 0 1 12-4l1-3', 'M19 8l1 3-3 1', 'M19 12a7 7 0 0 1-12 4l-1 3', 'M5 16l-1-3 3-1'],
    more: ['M6 12h.01', 'M12 12h.01', 'M18 12h.01'],
    download: ['M12 4v12', 'M7 11l5 5 5-5', 'M5 20h14'],
    upload: ['M12 20V8', 'M7 13l5-5 5 5', 'M5 4h14'],
    stop: ['M6 6h12v12H6z'],
    refresh: ['M20 12a8 8 0 1 1-2.2-5.5', 'M20 5v5h-5'],
    phone: ['M7 3h10v18H7z', 'M11 19h2'],
    book: ['M4 5h7a3 3 0 0 1 3 3v13H7a3 3 0 0 0-3 3V5z', 'M13 8h7v15h-4'],
    globe: ['M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z', 'M3 12h18', 'M12 3c3 3 3 15 0 18', 'M12 3c-3 3-3 15 0 18'],
    film: ['M4 6h16v12H4z', 'M8 6v12', 'M16 6v12'],
    pages: ['M7 4h8l4 4v12H7z', 'M5 8h2v12H5z'],
    star: ['M12 3l2.4 6.6H21l-5.2 4.2 2 6.7L12 16.8 6.2 20.5l2-6.7L3 9.6h6.6z'],
    info: ['M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z', 'M12 10v7', 'M12 7h.01'],
    blank: ['M5 5h14v14H5z'],
    eraser: ['M4 16l8-8 6 6-8 8H4v-6z', 'M10 10l4 4'],
    fill: ['M7 11l5-8 5 8v8H7v-8z'],
    drop: ['M12 3c4 6 6 9 6 12a6 6 0 1 1-12 0c0-3 2-6 6-12z'],
    crop: ['M6 3v15h15', 'M3 6h15v15'],
    camera: ['M4 8h4l2-2h4l2 2h4v12H4z', 'M12 11a3 3 0 1 1 0 6 3 3 0 0 1 0-6z'],
    back: ['M15 18l-6-6 6-6'],
    forward: ['M9 18l6-6-6-6'],
    sparkles: ['M12 3l1.8 4.6L18 9.5l-4.2 1.9L12 16l-1.8-4.6L6 9.5l4.2-1.9z', 'M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z', 'M5 3.5l.6 1.4 1.4.6-1.4.6L5 7.5l-.6-1.4L3 5.5l1.4-.6z'],
    gamepad: ['M7 8h10a5 5 0 0 1 4.9 6l-.6 3a2.5 2.5 0 0 1-4.3 1.2L15 16H9l-2 2.2A2.5 2.5 0 0 1 2.7 17l-.6-3A5 5 0 0 1 7 8z', 'M7 11v4', 'M5 13h4', 'M15.5 12.5h.01', 'M18 14h.01'],
    cube: ['M12 2.5l8.5 4.8v9.4L12 21.5l-8.5-4.8V7.3z', 'M3.5 7.3L12 12l8.5-4.7', 'M12 12v9.5'],
    layers: ['M12 3l9 5-9 5-9-5z', 'M3 13l9 5 9-5', 'M3 17.5l9 5 9-5'],
    search: ['M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14z', 'M20.5 20.5l-4.6-4.6'],
    folderPlus: ['M3 6h6l2 2h10v12H3z', 'M12 11v6', 'M9 14h6'],
    filePlus: ['M6 3h8l5 5v13H6z', 'M14 3v5h5', 'M12.5 11v7', 'M9 14.5h7'],
    move: ['M5 9l-3 3 3 3', 'M9 5l3-3 3 3', 'M15 19l-3 3-3-3', 'M19 9l3 3-3 3', 'M2 12h20', 'M12 2v20'],
    sun: ['M12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z', 'M12 1.5v2', 'M12 20.5v2', 'M4.2 4.2l1.4 1.4', 'M18.4 18.4l1.4 1.4', 'M1.5 12h2', 'M20.5 12h2', 'M4.2 19.8l1.4-1.4', 'M18.4 5.6l1.4-1.4'],
    moon: ['M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z'],
    school: ['M2 9l10-5 10 5-10 5z', 'M6 11v5c3.5 2.5 8.5 2.5 12 0v-5', 'M22 9v6'],
    brush: ['M18.5 3.5a2.1 2.1 0 0 1 3 3L12 16l-3-3z', 'M9 13c-2.5 0-4 1.6-4 4 0 1.3-.7 2.3-2 3 4 1 9 .3 9-4z'],
    music: ['M9 18V5l11-2v13', 'M6 15.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6z', 'M17 13.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6z'],
    lock: ['M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 8 0v4'],
    eye: ['M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z', 'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z'],
    eyeOff: ['M3 3l18 18', 'M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.1 3.9', 'M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6', 'M9.9 9.9a3 3 0 0 0 4.2 4.2'],
    zoomIn: ['M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14z', 'M20.5 20.5l-4.6-4.6', 'M11 8v6', 'M8 11h6'],
    zoomOut: ['M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14z', 'M20.5 20.5l-4.6-4.6', 'M8 11h6'],
    scissors: ['M6 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z', 'M6 15.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z', 'M8 7.5L20 18', 'M8 16.5L20 6'],
    text: ['M5 6V4h14v2', 'M12 4v16', 'M9 20h6'],
    shapes: ['M8.5 3l5 8.5h-10z', 'M14 14h7v7h-7z', 'M7 14.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z'],
    flip: ['M12 3v18', 'M8 7L3 12l5 5V7z', 'M16 7l5 5-5 5V7z'],
    target: ['M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z', 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z', 'M12 11.5v1'],
    trophy: ['M8 4h8v5a4 4 0 0 1-8 0z', 'M8 6H4.5a3.5 3.5 0 0 0 3.6 4', 'M16 6h3.5a3.5 3.5 0 0 1-3.6 4', 'M12 13v4', 'M8 21h8', 'M9.5 17h5v4h-5z'],
    lightbulb: ['M9 18h6', 'M10 21.5h4', 'M12 2.5a6.5 6.5 0 0 0-4 11.6c.7.6 1 1.4 1 2.4V17h6v-.5c0-1 .3-1.8 1-2.4a6.5 6.5 0 0 0-4-11.6z'],
    link: ['M10 14a4.5 4.5 0 0 0 6.4 0l3-3A4.5 4.5 0 0 0 13 4.6l-1 1', 'M14 10a4.5 4.5 0 0 0-6.4 0l-3 3A4.5 4.5 0 0 0 11 19.4l1-1'],
    send: ['M21.5 2.5L10.5 13.5', 'M21.5 2.5l-7 19-4-8.5-8.5-4z']
  };

  function icon(name, opts) {
    opts = opts || {};
    const size = opts.size || 20;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('class', 'cs-ico');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const paths = ICONS[name] || ICONS.dot;
    for (let i = 0; i < paths.length; i++) {
      const p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('d', paths[i]);
      svg.appendChild(p);
    }
    return svg;
  }

  function setIcon(el, name, opts) {
    if (!el) return;
    el.textContent = '';
    el.appendChild(icon(name, opts));
  }

  /* ---------- Node test export ---------- */
  CS.util = {
    esc, el, $, $$, debounce, icon, setIcon,
    formatBytes, formatTime, formatDate, truncate, clamp,
    utf8Bytes, bytesToB64, b64ToBytes, dataUrlToBytes, byteLen,
    uid, deepClone,
    extname, basename, dirname,
    normalizeRelPath, resolveRelPath, isSafePath, isTextFile,
    sanitizeFileName, isVarName, isElementId, slugify,
    TEXT_EXTS, JS_RESERVED
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = CS.util; }
})();
