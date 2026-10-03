/* DOM helpers: h() element builder, event bus and persistent settings. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const SVG_TAGS = new Set(['svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'g', 'ellipse', 'defs', 'linearGradient', 'stop', 'text', 'use', 'clipPath', 'mask']);

  /* Children: strings, numbers, nodes, arrays; null, undefined and false are skipped (never rendered as text). */
  function append(parent, child) {
    if (child == null || child === false || child === true) return;
    if (Array.isArray(child)) { child.forEach((c) => append(parent, c)); return; }
    parent.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }

  function h(tag, attrs, ...children) {
    const svg = SVG_TAGS.has(tag);
    const node = svg ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
    if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) {
      children.unshift(attrs);
      attrs = null;
    }
    for (const key in attrs || {}) {
      const value = attrs[key];
      if (value == null || value === false) continue;
      if (key === 'class') node.setAttribute('class', Array.isArray(value) ? value.flat(4).filter(Boolean).join(' ') : value);
      else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value);
      else if (key === 'dataset') Object.assign(node.dataset, value);
      else if (key === 'ref') value(node);
      else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
      else if (key === 'text') node.textContent = value;
      else if (key === 'html') node.innerHTML = value;
      else if (!svg && key in node && typeof value !== 'string' && key !== 'list') node[key] = value;
      else node.setAttribute(key, value === true ? '' : value);
    }
    append(node, children);
    return node;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function mount(node, ...children) {
    clear(node);
    append(node, children);
    return node;
  }

  /* ---------- Event bus ---------- */
  function createBus() {
    const map = new Map();
    return {
      on(name, fn) {
        if (!map.has(name)) map.set(name, new Set());
        map.get(name).add(fn);
        return () => map.get(name) && map.get(name).delete(fn);
      },
      emit(name, payload) {
        (map.get(name) || []).forEach((fn) => {
          try { fn(payload); } catch (error) { console.error('[bus]', name, error); }
        });
      },
      clear: () => map.clear()
    };
  }
  const bus = createBus();

  /* ---------- Settings (same key as 2.x so preferences carry over) ---------- */
  const DEFAULTS = {
    theme: 'auto', lang: 'auto', font: 'm', editorFont: null, editorWrap: true, preferMonaco: false,
    exportCredit: false, collabAuto: false, autosaveMs: 4000, previewMode: 'development',
    editorLines: true, editorSuggest: true, symbolBar: true, reduceMotion: false, haptics: true,
    learnProgress: {}, lastProject: null, seenWelcome3: false, recentTools: [], pixelGrid: true
  };
  const KEY = 'wcs_settings';
  let data = Object.assign({}, DEFAULTS);
  let persistent = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) data = Object.assign({}, DEFAULTS, JSON.parse(raw));
  } catch (error) { persistent = false; }

  const settings = {
    get: (key) => data[key],
    set(key, value) {
      data[key] = value;
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (error) { persistent = false; }
      bus.emit('settings', { key, value });
    },
    all: () => Object.assign({}, data),
    replace(next) {
      data = Object.assign({}, DEFAULTS, next || {});
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (error) { persistent = false; }
      bus.emit('settings', { key: '*' });
    },
    get persistent() { return persistent; },
    DEFAULTS
  };

  function isTouch() {
    try {
      if (matchMedia('(pointer: coarse)').matches) return true;
      if (matchMedia('(pointer: fine)').matches) return false;
    } catch (error) { /* ignore */ }
    return Math.min(screen.width || 9999, screen.height || 9999) < 500;
  }

  function haptic(ms) {
    if (!settings.get('haptics')) return;
    try { if (navigator.vibrate) navigator.vibrate(ms || 8); } catch (error) { /* ignore */ }
  }

  Object.assign(CS, { h, append, clear, mount, bus, createBus, settings, isTouch, haptic });
})();
