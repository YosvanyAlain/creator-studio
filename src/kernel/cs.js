/* Creator Studio kernel: namespace, module registry and small utilities. */
'use strict';
(function () {
  const CS = (globalThis.CS = globalThis.CS || {});
  const registry = new Map();

  /* Modules register a factory; dependencies resolve lazily on first use. */
  CS.define = function (name, factory) {
    if (registry.has(name)) throw new Error('module defined twice: ' + name);
    registry.set(name, { factory, value: undefined, ready: false });
  };
  CS.use = function (name) {
    const entry = registry.get(name);
    if (!entry) throw new Error('unknown module: ' + name);
    if (!entry.ready) {
      entry.ready = true;
      entry.value = entry.factory(CS.use);
    }
    return entry.value;
  };
  CS.has = (name) => registry.has(name);
  CS.modules = () => [...registry.keys()];

  let counter = 0;
  const JS_RESERVED = new Set(['break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do',
    'else', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'new', 'null',
    'return', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield', 'let',
    'static', 'enum', 'await', 'implements', 'package', 'protected', 'interface', 'private', 'public']);
  const util = {
    JS_RESERVED,
    isVarName: (name) => typeof name === 'string' && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) && !JS_RESERVED.has(name),
    isElementId: (id) => typeof id === 'string' && /^[A-Za-z][A-Za-z0-9_-]*$/.test(id) && id.length <= 64,
    uid(prefix) {
      const rand = Math.random().toString(36).slice(2, 8);
      return (prefix || '') + Date.now().toString(36) + rand + (counter++).toString(36);
    },
    clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
    deepClone(value) {
      if (typeof structuredClone === 'function') {
        try { return structuredClone(value); } catch (error) { /* fall through */ }
      }
      return JSON.parse(JSON.stringify(value));
    },
    debounce(fn, ms) {
      let timer = null;
      const run = function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), ms);
      };
      run.flush = () => { clearTimeout(timer); fn(); };
      run.cancel = () => clearTimeout(timer);
      return run;
    },
    bytes(n) {
      if (!Number.isFinite(n)) return '0 B';
      if (n < 1024) return n + ' B';
      if (n < 1024 * 1024) return (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB';
      return (n / 1048576).toFixed(1) + ' MB';
    },
    textBytes(text) {
      return new TextEncoder().encode(String(text || '')).length;
    },
    slug(text, fallback) {
      const base = String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
      return base || fallback || 'app';
    },
    escapeHtml(text) {
      return String(text == null ? '' : text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    },
    ext(path) {
      const name = String(path || '').split('/').pop();
      const dot = name.lastIndexOf('.');
      return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
    },
    basename: (path) => String(path || '').split('/').pop(),
    dirname(path) {
      const parts = String(path || '').split('/');
      parts.pop();
      return parts.join('/');
    },
    joinPath(...parts) {
      return parts.filter(Boolean).join('/').replace(/\/+/g, '/').replace(/^\//, '');
    },
    /* Paths inside a project: relative, no "..", no empty segments. */
    cleanPath(path) {
      const parts = String(path || '').replace(/\\/g, '/').split('/').map((s) => s.trim()).filter((s) => s && s !== '.');
      if (!parts.length || parts.some((s) => s === '..' || /[\u0000-\u001f<>:"|?*]/.test(s))) return '';
      return parts.join('/');
    },
    dataUrlToBytes(dataUrl) {
      const comma = String(dataUrl).indexOf(',');
      const meta = String(dataUrl).slice(0, comma);
      const body = String(dataUrl).slice(comma + 1);
      if (/;base64/i.test(meta)) {
        const bin = atob(body);
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out;
      }
      return new TextEncoder().encode(decodeURIComponent(body));
    },
    bytesToDataUrl(bytes, mime) {
      let bin = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
      return 'data:' + (mime || 'application/octet-stream') + ';base64,' + btoa(bin);
    },
    mimeOf(path) {
      const map = {
        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
        ico: 'image/x-icon', wav: 'audio/wav', mp3: 'audio/mpeg', ogg: 'audio/ogg', m4a: 'audio/mp4', webm: 'audio/webm',
        mp4: 'video/mp4', json: 'application/json', js: 'text/javascript', mjs: 'text/javascript', css: 'text/css',
        html: 'text/html', htm: 'text/html', txt: 'text/plain', md: 'text/markdown', toml: 'text/plain', xml: 'application/xml',
        woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf', pdf: 'application/pdf', csv: 'text/csv'
      };
      return map[util.ext(path)] || 'application/octet-stream';
    },
    isTextPath(path) {
      return /^(html?|css|m?js|json|txt|md|toml|svg|xml|csv|ini|yml|yaml|glsl|frag|vert)$/.test(util.ext(path));
    },
    relTime(ts, locale) {
      if (!ts) return '';
      const diff = (Date.now() - ts) / 1000;
      const rtf = typeof Intl !== 'undefined' && Intl.RelativeTimeFormat ? new Intl.RelativeTimeFormat(locale || 'es', { numeric: 'auto' }) : null;
      const steps = [[60, 'second', 1], [3600, 'minute', 60], [86400, 'hour', 3600], [604800, 'day', 86400], [2629800, 'week', 604800], [31557600, 'month', 2629800], [Infinity, 'year', 31557600]];
      for (const [limit, unit, size] of steps) {
        if (diff < limit) {
          const value = -Math.round(diff / size);
          return rtf ? rtf.format(value, unit) : new Date(ts).toLocaleString();
        }
      }
      return '';
    },
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    nextFrame: () => new Promise((resolve) => requestAnimationFrame(() => resolve())),
    once(fn) {
      let done = false;
      let value;
      return (...args) => {
        if (!done) { done = true; value = fn(...args); }
        return value;
      };
    }
  };
  CS.util = util;
})();
