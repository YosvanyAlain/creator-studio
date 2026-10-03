/* =========================================================================
 * Webxdc Creator Studio — highlight.js
 * Lightweight syntax highlighting for the textarea editor.
 * ========================================================================= */
'use strict';
(function () {
  const CS = (globalThis.CS = globalThis.CS || {});
  const U = CS.util;

  /* Safety limit: huge files are shown without color. */
  const MAX_BYTES = 150 * 1024;

  function esc(s) { return U.esc(s); }

  /* ------------------------------------------------------------------ *
   * Emisor de tokens: array de [clase|null, texto] → HTML escapado
   * ------------------------------------------------------------------ */
  function toHtml(tokens) {
    let out = '';
    let cur = null;   /* clase abierta */
    for (const [cls, text] of tokens) {
      const e = esc(text);
      if (cls === cur) { out += e; continue; }
      if (cur !== null) out += '</span>';
      if (cls !== null) { out += '<span class="hl-' + cls + '">'; }
      cur = cls;
      out += e;
    }
    if (cur !== null) out += '</span>';
    return out;
  }

  function push(tokens, cls, text) { tokens.push([cls, text]); }

  /* ------------------------------------------------------------------ *
   * JS (also works for JSON)
   * ------------------------------------------------------------------ */
  const JS_KW = new Set(('break case catch class const continue debugger default delete do else export ' +
    'extends finally for function if import in instanceof new return super switch this throw try typeof ' +
    'var void while with yield let static async of await').split(' '));
  const JS_CONST = new Set(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity']);

  function tokJs(src) {
    const out = [];
    let i = 0, n = src.length;
    let plain = '';
    const flush = () => { if (plain) { push(out, null, plain); plain = ''; } };
    while (i < n) {
      const c = src[i];
      /* comentarios */
      if (c === '/' && src[i + 1] === '/') {
        let j = src.indexOf('\n', i); if (j < 0) j = n;
        flush(); push(out, 'com', src.slice(i, j)); i = j; continue;
      }
      if (c === '/' && src[i + 1] === '*') {
        let j = src.indexOf('*/', i + 2); j = j < 0 ? n : j + 2;
        flush(); push(out, 'com', src.slice(i, j)); i = j; continue;
      }
      /* strings */
      if (c === '"' || c === "'" || c === '`') {
        let j = i + 1;
        while (j < n && src[j] !== c) { if (src[j] === '\\') j++; j++; }
        j = Math.min(j + 1, n);
        flush(); push(out, 'str', src.slice(i, j)); i = j; continue;
      }
      /* numbers */
      if (/[0-9]/.test(c) && !/[A-Za-z0-9_$]/.test(src[i - 1] || '')) {
        let j = i;
        while (j < n && /[0-9a-fA-FxXoObBeE+-._]/.test(src[j])) {
          /* + and - only count as part of the number after e/E */
          if ((src[j] === '+' || src[j] === '-') && !/[eE]/.test(src[j - 1] || '')) break;
          j++;
        }
        flush(); push(out, 'num', src.slice(i, j)); i = j; continue;
      }
      /* identificadores */
      if (/[A-Za-z_$]/.test(c)) {
        let j = i;
        while (j < n && /[A-Za-z0-9_$]/.test(src[j])) j++;
        const word = src.slice(i, j);
        let k = j;
        while (k < n && (src[k] === ' ' || src[k] === '\t')) k++;
        flush();
        if (JS_KW.has(word)) push(out, 'kw', word);
        else if (JS_CONST.has(word)) push(out, 'cst', word);
        else if (src[k] === '(') push(out, 'fn', word);
        else plain += word, flush();
        i = j; continue;
      }
      plain += c; i++;
    }
    flush();
    return out;
  }

  /* ------------------------------------------------------------------ *
   * CSS
   * ------------------------------------------------------------------ */
  const CSS_PROP_RE = /^[-a-zA-Z]+$/;

  function tokCss(src) {
    const out = [];
    let i = 0, n = src.length;
    let mode = 'sel';   /* 'sel' fuera de llaves, 'decl' dentro */
    let plain = '';
    const flush = () => { if (plain) { push(out, null, plain); plain = ''; } };

    while (i < n) {
      const c = src[i];
      if (c === '/' && src[i + 1] === '*') {
        let j = src.indexOf('*/', i + 2); j = j < 0 ? n : j + 2;
        flush(); push(out, 'com', src.slice(i, j)); i = j; continue;
      }
      if (c === '"' || c === "'") {
        let j = i + 1;
        while (j < n && src[j] !== c) { if (src[j] === '\\') j++; j++; }
        j = Math.min(j + 1, n);
        flush(); push(out, 'str', src.slice(i, j)); i = j; continue;
      }
      if (c === '{') { flush(); push(out, null, '{'); i++; mode = 'decl'; continue; }
      if (c === '}') { flush(); push(out, null, '}'); i++; mode = 'sel'; continue; }
      if (c === ';' && mode === 'decl') { flush(); push(out, null, ';'); i++; continue; }

      if (mode === 'sel') {
        /* at-rule o selector hasta { o , */
        let j = i;
        while (j < n && src[j] !== '{' && src[j] !== ',') j++;
        const sel = src.slice(i, j);
        flush();
        if (sel.trim().startsWith('@')) push(out, 'kw', sel);
        else push(out, 'sel', sel);
        i = j;
        if (src[i] === ',') { push(out, null, ','); i++; }
        continue;
      }
      /* modo decl: propiedad : valor ; */
      if (/[ \t\n]/.test(c)) { plain += c; i++; continue; }
      /* propiedad hasta ':' */
      let j = i;
      while (j < n && src[j] !== ':' && src[j] !== ';' && src[j] !== '}' && src[j] !== '\n') j++;
      let word = src.slice(i, j);
      if (src[j] === ':' && CSS_PROP_RE.test(word.trim())) {
        flush(); push(out, 'prop', word); i = j; continue;
      }
      /* valor: leer hasta ; o } (resaltando numbers y funciones) */
      let k = i;
      while (k < n && src[k] !== ';' && src[k] !== '}') {
        if (src[k] === '#' || /[0-9]/.test(src[k])) {
          let m = k;
          while (m < n && /[0-9a-zA-Z.%#]/.test(src[m])) m++;
          flush(); push(out, 'num', src.slice(k, m));
          k = m; continue;
        }
        if (/[A-Za-z-]/.test(src[k])) {
          let m = k;
          while (m < n && /[A-Za-z0-9-]/.test(src[m])) m++;
          const w = src.slice(k, m);
          if (src[m] === '(') { flush(); push(out, 'fn', w); }
          else { plain += w; flush(); }
          k = m; continue;
        }
        plain += src[k]; k++;
      }
      flush();
      i = k;
    }
    flush();
    return out;
  }

  /* ------------------------------------------------------------------ *
   * HTML (con <style> y <script> embebidos)
   * ------------------------------------------------------------------ */
  const TAG_NAME_RE = /^[a-zA-Z][a-zA-Z0-9-]*/;

  function tokHtmlTag(src, i, out) {
    /* src[i] === '<'; returns index after the closing > */
    let j = i + 1;
    push(out, 'tag', '<');
    const m = TAG_NAME_RE.exec(src.slice(j));
    if (m) { push(out, 'tag', m[0]); j += m[0].length; }
    let buf = '';
    const flushAttr = () => { if (buf) { push(out, 'attr', buf); buf = ''; } };
    while (j < src.length && src[j] !== '>') {
      const c = src[j];
      if (c === '"' || c === "'") {
        flushAttr();
        let k = j + 1;
        while (k < src.length && src[k] !== c) k++;
        k = Math.min(k + 1, src.length);
        push(out, 'str', src.slice(j, k));
        j = k; continue;
      }
      if (c === '=') { flushAttr(); push(out, null, '='); j++; continue; }
      if (/[a-zA-Z-]/.test(c)) { buf += c; j++; continue; }
      flushAttr();
      push(out, null, c);
      j++;
    }
    flushAttr();
    if (src[j] === '>') { push(out, 'tag', '>'); j++; }
    return j;
  }

  function tokHtml(src) {
    const out = [];
    let i = 0, n = src.length;
    let plain = '';
    const flush = () => { if (plain) { push(out, null, plain); plain = ''; } };

    while (i < n) {
      if (src.startsWith('<!--', i)) {
        let j = src.indexOf('-->', i); j = j < 0 ? n : j + 3;
        flush(); push(out, 'com', src.slice(i, j)); i = j; continue;
      }
      if (src[i] === '<') {
        /* opening script/style tag with raw content? */
        const m = /^<(script|style)\b[^>]*>/i.exec(src.slice(i));
        if (m && !/\/>$/.test(m[0])) {
          const name = m[1].toLowerCase();
          const closeRe = new RegExp('</' + name + '\\s*>', 'i');
          const rest = src.slice(i + m[0].length);
          const cm = closeRe.exec(rest);
          const endInner = cm ? cm.index : rest.length;
          const inner = rest.slice(0, endInner);
          /* etiqueta de apertura */
          const sub = [];
          tokHtmlTag(src, i, sub);
          for (const t of sub) push(out, t[0], t[1]);
          /* contenido con el tokenizador correspondiente */
          const innerTok = name === 'script' ? tokJs(inner) : tokCss(inner);
          for (const t of innerTok) push(out, t[0], t[1]);
          if (cm) {
            const closeTok = [];
            tokHtmlTag(src, i + m[0].length + endInner, closeTok);
            for (const t of closeTok) push(out, t[0], t[1]);
            i = i + m[0].length + endInner + cm[0].length;
          } else {
            i = n;
          }
          continue;
        }
        flush();
        i = tokHtmlTag(src, i, out);
        continue;
      }
      plain += src[i]; i++;
    }
    flush();
    return out;
  }

  /* ------------------------------------------------------------------ *
   * API
   * ------------------------------------------------------------------ */
  function langFor(path) {
    const e = U.extname(String(path || ''));
    if (e === 'html' || e === 'htm' || e === 'xml' || e === 'svg' || e === 'webmanifest') return 'html';
    if (e === 'css') return 'css';
    if (e === 'js' || e === 'mjs' || e === 'json' || e === 'ts' || e === 'map') return 'js';
    return null;   /* md, txt, toml… sin resaltado */
  }

  function highlight(code, lang) {
    const src = String(code == null ? '' : code);
    if (U.byteLen(src) > MAX_BYTES) return null;   /* archivo grande → sin color */
    let tokens;
    if (lang === 'html') tokens = tokHtml(src);
    else if (lang === 'css') tokens = tokCss(src);
    else if (lang === 'js') tokens = tokJs(src);
    else return null;
    return toHtml(tokens);
  }

  CS.hl = {
    highlight: highlight,
    langFor: langFor,
    MAX_BYTES: MAX_BYTES,
    /* para tests */
    _tokJs: tokJs, _tokCss: tokCss, _tokHtml: tokHtml
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = CS.hl; }
})();
