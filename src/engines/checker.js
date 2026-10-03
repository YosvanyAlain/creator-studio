/* Checker: plain-language review of a project before sharing, with one-tap fixes. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const U = CS.util;
  const API = ['sendUpdate', 'setUpdateListener', 'sendToChat', 'selfAddr', 'selfName', 'importFiles',
    'joinRealtimeChannel', 'sendUpdateInterval', 'sendUpdateMaxSize', 'getAllUpdates'];
  const SHARE_WARN_BYTES = 5 * 1048576;
  const rules = [];

  const lineOf = (text, index) => (index < 0 ? 0 : text.slice(0, index).split('\n').length);
  const textFiles = (p, re) => Object.keys(p.files).filter((path) => p.files[path].kind === 'text' && re.test(path));

  function stripComments(js) {
    return js.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:\\])\/\/[^\n]*/g, (m, a) => a + ' '.repeat(m.length - a.length));
  }

  function htmlRefs(html) {
    const refs = [];
    const re = /<(script|link|img|audio|video|source|iframe)\b[^>]*?\s(src|href)\s*=\s*(["'])(.*?)\3/gi;
    let m;
    while ((m = re.exec(html))) {
      const tag = m[1].toLowerCase();
      if (tag === 'link' && !/rel\s*=\s*["']?[^"'>]*(stylesheet|icon)/i.test(m[0])) continue;
      refs.push({ tag, ref: m[4].trim(), index: m.index });
    }
    return refs;
  }

  function syntaxErrorLine(code) {
    if (!globalThis.CM6 || !CM6.javascriptLanguage) return 0;
    try {
      const tree = CM6.javascriptLanguage.parser.parse(code);
      let at = -1;
      tree.iterate({ enter(node) { if (at < 0 && node.type.isError) at = node.from; return at < 0; } });
      return at < 0 ? 0 : lineOf(code, at);
    } catch (error) { return 0; }
  }

  function addToHead(p, path, tag) {
    const html = p.files[path].content;
    const next = /<head[^>]*>/i.test(html) ? html.replace(/<head([^>]*)>/i, (m) => m + '\n  ' + tag) : tag + '\n' + html;
    CS.projects.write(path, next, { project: p });
  }

  /* ---------- Built-in rules ---------- */
  function core(p, add) {
    const paths = Object.keys(p.files);
    if (!paths.length) { add('error', 'empty'); return; }
    const entry = p.files['index.html'];
    if (!entry) add('error', 'no_index', { fix: paths.some((x) => /\.html?$/.test(x)) ? null : 'create-index' });
    else if (entry.kind !== 'text') add('error', 'index_binary', { file: 'index.html' });
    if (paths.some((x) => x.toLowerCase() === 'webxdc.js')) add('error', 'webxdc_js', { file: 'webxdc.js', fix: 'remove-webxdc-js' });

    const lower = new Map();
    for (const path of paths) {
      const key = path.toLowerCase();
      if (lower.has(key)) add('warn', 'case_dup', { file: path, vars: { a: lower.get(key), b: path } });
      lower.set(key, path);
      if (/[^\w./-]/.test(path)) add('warn', 'path_chars', { file: path });
      const f = p.files[path];
      if (f.kind === 'text' && !f.content.trim() && path !== 'manifest.toml') add('tip', 'empty_file', { file: path });
    }
    const total = CS.projects.totalSize(p);
    if (total > SHARE_WARN_BYTES) add('warn', 'heavy', { vars: { size: U.bytes(total) } });
    for (const path of paths) {
      const f = p.files[path];
      if (f.kind === 'data' && (f.size || 0) > 1048576) add('tip', 'big_asset', { file: path, vars: { size: U.bytes(f.size) } });
    }

    /* Manifest and icon */
    const manifest = p.files['manifest.toml'];
    if (manifest && manifest.kind === 'text') {
      const m = CS.exporter.parseManifest(manifest.content);
      if (!m.name) add('warn', 'manifest_no_name', { file: 'manifest.toml', fix: 'manifest-name' });
    }
    if (!p.files['icon.png'] && !p.files['icon.jpg']) add('tip', 'auto_icon');

    /* HTML */
    const usedIds = new Set();
    const definedIds = new Set();
    let usesWebxdc = false;
    let hasSend = false;
    let hasListen = false;
    for (const path of textFiles(p, /\.html?$/i)) {
      const html = p.files[path].content;
      const isEntry = path === 'index.html';
      (html.match(/\sid\s*=\s*["']([^"']+)["']/g) || []).forEach((m) => definedIds.add(/["']([^"']+)["']/.exec(m)[1]));
      if (isEntry && html.trim().length < 40) add('warn', 'index_tiny', { file: path });
      if (!/<meta[^>]+charset/i.test(html)) add('tip', 'no_charset', { file: path, fix: 'add-charset' });
      if (!/<meta[^>]+name\s*=\s*["']?viewport/i.test(html)) add('warn', 'no_viewport', { file: path, fix: 'add-viewport' });
      if (isEntry && !/<title>[^<]+<\/title>/i.test(html)) add('tip', 'no_title', { file: path, fix: 'add-title' });
      const base = U.dirname(path);
      for (const r of htmlRefs(html)) {
        if (/^(data:|blob:|#|javascript:|mailto:)/i.test(r.ref) || !r.ref) continue;
        if (/^(https?:)?\/\//i.test(r.ref)) { add('warn', 'external', { file: path, line: lineOf(html, r.index), vars: { ref: r.ref } }); continue; }
        const target = CS.sim.resolve(base, r.ref);
        if (target === 'webxdc.js') continue;
        if (!p.files[target]) add('error', 'missing_file', { file: path, line: lineOf(html, r.index), vars: { ref: r.ref } });
      }
      const inline = (html.match(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi) || []).join('\n');
      if (/\bwebxdc\./.test(inline)) usesWebxdc = true;
      if (/\bsendUpdate\s*\(/.test(inline)) hasSend = true;
      if (/\bsetUpdateListener\s*\(/.test(inline)) hasListen = true;
    }

    /* JavaScript */
    for (const path of textFiles(p, /\.(m?js|html?)$/i)) {
      const raw = p.files[path].content;
      const isHtml = /\.html?$/i.test(path);
      const code = isHtml ? raw.replace(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>|[^]/gi, (m, js) => (js != null ? ' '.repeat(m.length - js.length - 9) + js + ' '.repeat(9) : m === '\n' ? '\n' : ' ')) : raw;
      const js = stripComments(code);
      if (!isHtml) {
        if (/\bwebxdc\./.test(js)) usesWebxdc = true;
        if (/\bsendUpdate\s*\(/.test(js)) hasSend = true;
        if (/\bsetUpdateListener\s*\(/.test(js)) hasListen = true;
        const bad = syntaxErrorLine(raw);
        if (bad) add('error', 'syntax', { file: path, line: bad });
      }
      let m;
      const apiRe = /\bwebxdc\.([A-Za-z_$][\w$]*)/g;
      while ((m = apiRe.exec(js))) if (!API.includes(m[1])) add('warn', 'unknown_api', { file: path, line: lineOf(js, m.index), vars: { name: m[1] } });
      const netRe = /\b(fetch\s*\(\s*["'`]https?:|new\s+WebSocket\s*\(|new\s+XMLHttpRequest\b|navigator\.sendBeacon)/g;
      while ((m = netRe.exec(js))) add('warn', 'network', { file: path, line: lineOf(js, m.index) });
      const dw = /\bdocument\.write\s*\(/.exec(js);
      if (dw) add('warn', 'document_write', { file: path, line: lineOf(js, dw.index) });
      const ev = /\b(eval|new\s+Function)\s*\(/.exec(js);
      if (ev) add('tip', 'eval', { file: path, line: lineOf(js, ev.index) });
      const al = /(^|[^.\w])(alert|confirm|prompt)\s*\(/.exec(js);
      if (al) add('tip', 'dialogs', { file: path, line: lineOf(js, al.index), vars: { name: al[2] } });
      const idRe = /getElementById\(\s*["'`]([\w-]+)["'`]\s*\)|querySelector(?:All)?\(\s*["'`]#([\w-]+)["'`]\s*\)/g;
      while ((m = idRe.exec(js))) {
        const id = m[1] || m[2];
        if (!usedIds.has(id)) { usedIds.add(id); usedIds[id] = { file: path, line: lineOf(js, m.index) }; }
      }
    }
    for (const id of usedIds) {
      if (!definedIds.has(id) && !new RegExp('\\.id\\s*=\\s*["\'`]' + id + '["\'`]|setAttribute\\(\\s*["\'`]id["\'`]\\s*,\\s*["\'`]' + id).test(Object.values(p.files).map((f) => f.content || '').join('\n'))) {
        add('warn', 'missing_id', Object.assign({ vars: { id } }, usedIds[id]));
      }
    }

    if (usesWebxdc && entry && entry.kind === 'text' && !/<script[^>]+src\s*=\s*["'](\.\/)?webxdc\.js["']/i.test(entry.content)) {
      add('error', 'no_webxdc_script', { file: 'index.html', fix: 'add-webxdc-script' });
    }
    if (hasSend && !hasListen) add('warn', 'send_no_listen');
    if (hasListen && !hasSend) add('tip', 'listen_no_send');
    if (!usesWebxdc && paths.length) add('tip', 'not_shared');
  }
  rules.push(core);

  /* ---------- Fixes ---------- */
  const FIXES = {
    'remove-webxdc-js': (p) => { const path = Object.keys(p.files).find((x) => x.toLowerCase() === 'webxdc.js'); if (path) CS.projects.remove1(path, { project: p }); },
    'add-charset': (p, item) => addToHead(p, item.file, '<meta charset="utf-8">'),
    'add-viewport': (p, item) => addToHead(p, item.file, '<meta name="viewport" content="width=device-width, initial-scale=1">'),
    'add-title': (p, item) => addToHead(p, item.file, '<title>' + U.escapeHtml(p.name) + '</title>'),
    'add-webxdc-script': (p) => addToHead(p, 'index.html', '<script src="webxdc.js"></script>'),
    'manifest-name': (p) => {
      const text = p.files['manifest.toml'].content;
      CS.projects.write('manifest.toml', 'name = "' + String(p.name).replace(/["\\]/g, '') + '"\n' + text.replace(/^\s*name\s*=.*$/m, ''), { project: p });
    },
    'create-index': (p) => CS.projects.write('index.html', '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>' + U.escapeHtml(p.name) + '</title>\n  <script src="webxdc.js"></script>\n</head>\n<body>\n  <h1>' + U.escapeHtml(p.name) + '</h1>\n</body>\n</html>\n', { project: p })
  };

  const ORDER = { error: 0, warn: 1, tip: 2 };
  function check(project) {
    const items = [];
    const seen = new Set();
    const add = (level, key, extra) => {
      const item = Object.assign({ level, key, file: null, line: 0, vars: {}, fix: null }, extra || {});
      const id = level + key + item.file + item.line + JSON.stringify(item.vars);
      if (seen.has(id)) return;
      seen.add(id);
      items.push(item);
    };
    for (const rule of rules) {
      try { rule(project, add); } catch (error) { console.error('[checker]', error); }
    }
    items.sort((a, b) => ORDER[a.level] - ORDER[b.level] || String(a.file).localeCompare(String(b.file)) || a.line - b.line);
    const count = { error: 0, warn: 0, tip: 0 };
    items.forEach((i) => count[i.level]++);
    return { items, count, ready: count.error === 0 };
  }

  function fix(project, item) {
    const fn = item.fix && FIXES[item.fix];
    if (!fn) return false;
    fn(project, item);
    return true;
  }

  CS.checker = { check, fix, addRule: (fn) => rules.push(fn), addFix: (id, fn) => { FIXES[id] = fn; }, API, syntaxErrorLine };
})();
