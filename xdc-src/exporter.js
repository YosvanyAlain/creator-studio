/* =========================================================================
 * Webxdc Creator Studio — exporter.js
 * Build and export .xdc packages; sendToChat integration.
 * ========================================================================= */
'use strict';
(function () {
  const CS = (globalThis.CS = globalThis.CS || {});
  const U = CS.util;

  function exportCreditText() {
    try {
      if (CS.settings && CS.settings.get && CS.settings.get('exportCredit')) {
        return (CS.i18n && CS.i18n.t) ? CS.i18n.t('export_credit') : 'Made with Webxdc Creator Studio';
      }
    } catch (e) { /* ignore */ }
    return '';
  }

  function webxdcAvailable() {
    return typeof window !== 'undefined' && !!window.webxdc;
  }

  function importFilesAvailable() {
    return !!(webxdcAvailable() && window.webxdc.importFiles);
  }

  /* ---------- manifest.toml ---------- */
  function tomlEscape(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  }

  function buildManifest(project) {
    const lines = [];
    const name = String(project.settings.xdcName || project.name || 'webxdc-app').trim();
    lines.push('name = "' + tomlEscape(name) + '"');
    const url = String(project.settings.sourceCodeUrl || '').trim();
    if (url && /^https?:\/\//.test(url)) {
      lines.push('source_code_url = "' + tomlEscape(url) + '"');
    }
    return lines.join('\n') + '\n';
  }

  /* Minimal manifest.toml parsing (name / source_code_url only) */
  function parseManifest(toml) {
    const out = {};
    String(toml || '').split(/\r?\n/).forEach(function (line) {
      let m = /^\s*name\s*=\s*"(.*)"\s*$/.exec(line);
      if (m) out.name = m[1];
      m = /^\s*source_code_url\s*=\s*"(.*)"\s*$/.exec(line);
      if (m) out.sourceCodeUrl = m[1];
    });
    return out;
  }

  /* ---------- Building the .xdc ---------- */
  /* Devuelve { blob, name, bytes, size, method, entries, verify } */
  async function buildXdc(project) {
    const fileList = [];
    const paths = Object.keys(project.files);

    for (const path of paths) {
      const f = project.files[path];
      let bytes;
      if (f.kind === 'text') bytes = U.utf8Bytes(f.content);
      else bytes = U.dataUrlToBytes(f.dataUrl || '');
      fileList.push({ path: path, bytes: bytes });
    }

    /* manifest.toml generado si el proyecto no trae el suyo */
    if (!project.files['manifest.toml']) {
      fileList.push({ path: 'manifest.toml', bytes: U.utf8Bytes(buildManifest(project)) });
    }

    const built = await CS.zip.buildZip(fileList, { method: 'auto' });
    const method = built.entries.some(function (e) { return e.method === 8; }) ? 'deflate' : 'store';

    /* Integrity check: re-read the ZIP just built */
    let verify = { ok: false, files: 0, detail: 'no-verificado' };
    try {
      const back = await CS.zip.readZip(built.bytes, { maxFiles: 250, maxFileBytes: 8 * 1024 * 1024, maxTotalBytes: 64 * 1024 * 1024, maxRatio: 10000 });
      const builtPaths = fileList.map(function (f) { return f.path; }).sort().join('|');
      const readPaths = back.files.map(function (f) { return f.path; }).sort().join('|');
      verify = { ok: builtPaths === readPaths && back.files.length === fileList.length, files: back.files.length, detail: builtPaths === readPaths ? 'ok' : 'paths-mismatch' };
    } catch (e) {
      verify = { ok: false, files: 0, detail: e && e.code ? e.code : 'error' };
    }

    const blob = new Blob([built.bytes], { type: 'application/zip' });
    /* Nombre de ARCHIVO slugificado; el nombre visible va en manifest.toml */
    const name = U.sanitizeFileName(project.settings.xdcName || project.name) + '.xdc';

    /* sha-256 solo si el entorno lo permite (contexto seguro) */
    let sha256 = null;
    try {
      if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
        const digest = await crypto.subtle.digest('SHA-256', built.bytes);
        sha256 = Array.from(new Uint8Array(digest)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
      }
    } catch (e) { sha256 = null; }

    return {
      blob: blob,
      bytes: built.bytes,
      name: name,
      size: built.bytes.length,
      method: method,
      entries: built.entries,
      verify: verify,
      sha256: sha256,
      builtAt: Date.now()
    };
  }

  /* ---------- Compartir ---------- */
  async function shareToChat(xdc, text) {
    if (!webxdcAvailable() || typeof window.webxdc.sendToChat !== 'function') {
      return { via: 'unavailable' };
    }
    /* Nota: la promesa puede no llegar a resolverse (el mensajero puede
       cerrar la miniapp al abrir el selector de chat — spec sendToChat). */
    try {
      const msg = { file: { name: xdc.name, blob: xdc.blob } };
      const cap = (text != null && String(text) !== '') ? String(text) : exportCreditText();
      if (cap) msg.text = cap;
      const p = window.webxdc.sendToChat(msg);
      if (p && typeof p.catch === 'function') {
        p.catch(function (err) {
          CS.app && CS.app.toast && CS.app.toast((CS.i18n ? CS.i18n.t('export_share_error') : 'Error al compartir') + ': ' + (err && err.message ? err.message : err), 'error');
        });
      }
      return { via: 'sendToChat' };
    } catch (e) {
      return { via: 'error', error: e };
    }
  }

  function download(xdc) {
    /* Fallback/alternativa: descarga del archivo generado. */
    const url = URL.createObjectURL(xdc.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = xdc.name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
    }, 4000);
    return true;
  }

  /* ---------- Importing .xdc ---------- */
  const IMPORT_LIMITS = {
    maxFiles: 150,
    maxFileBytes: 4 * 1024 * 1024,
    maxTotalBytes: 12 * 1024 * 1024,
    maxRatio: 200
  };

  /* Determina si los bytes son texto UTF-8 razonable (sin NULs) */
  function looksLikeText(bytes) {
    if (bytes.length === 0) return true;
    let nonAscii = 0;
    const limit = Math.min(bytes.length, 4096);
    for (let i = 0; i < limit; i++) {
      const b = bytes[i];
      if (b === 0) return false;
      if (b > 127) nonAscii++;
    }
    /* Lots of non-ascii without valid UTF-8 → binary. Validation real: */
    if (nonAscii > 0) {
      try {
        const dec = new TextDecoder('utf-8', { fatal: true });
        dec.decode(bytes.subarray(0, limit));
      } catch (e) { return false; }
    }
    return true;
  }

  function mimeFor(path, bytes) {
    const ext = U.extname(path);
    const map = {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
      webp: 'image/webp', svg: 'image/svg+xml', ico: 'image/x-icon',
      mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav', woff: 'font/woff', woff2: 'font/woff2'
    };
    if (map[ext]) return map[ext];
    /* Minimal sniffing for PNG/JPEG without extension */
    if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'image/png';
    if (bytes.length > 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'image/jpeg';
    return 'application/octet-stream';
  }

  /* bytes → proyecto nuevo. Executes NOTHING from imported content:
     code only runs inside the preview sandbox iframe. */
  async function importXdcBytes(bytes, suggestedName) {
    const res = await CS.zip.readZip(bytes, IMPORT_LIMITS);
    if (!res.files.length) {
      const e = new Error('El archivo no contiene archivos legibles');
      e.code = 'empty';
      throw e;
    }
    if (res.files.some(function (f) { return f.path.toLowerCase() === 'webxdc.js'; })) {
      const e = new Error('El paquete incluye webxdc.js, que no debe empaquetarse (lo sirve el mensajero)');
      e.code = 'webxdc-js';
      throw e;
    }

    let manifestName = '';
    let sourceUrl = '';
    const files = {};
    for (const f of res.files) {
      if (f.path === 'manifest.toml') {
        const m = parseManifest(new TextDecoder().decode(f.bytes));
        manifestName = m.name || '';
        sourceUrl = m.sourceCodeUrl || '';
      }
      if (U.isTextFile(f.path) && looksLikeText(f.bytes)) {
        files[f.path] = { kind: 'text', content: new TextDecoder().decode(f.bytes) };
      } else {
        const mime = mimeFor(f.path, f.bytes);
        files[f.path] = { kind: 'data', dataUrl: 'data:' + mime + ';base64,' + U.bytesToB64(f.bytes), mime: mime, size: f.bytes.length };
      }
    }

    const name = manifestName || String(suggestedName || '').replace(/\.xdc$/i, '') || 'App importada';
    const project = CS.projects.newProject(name, null);
    project.files = files;
    project.settings.xdcName = name;
    project.settings.sourceCodeUrl = sourceUrl;
    project.origin = { template: 'imported' };
    return { project: project, warnings: res.warnings, skipped: res.skipped, count: res.files.length };
  }

  /* UI-agnostic: lee un File/Blob */
  async function importXdcFile(file) {
    const buf = await file.arrayBuffer();
    return importXdcBytes(new Uint8Array(buf), file.name);
  }

  CS.exporter = {
    buildXdc, shareToChat, download, exportCreditText,
    importXdcBytes, importXdcFile, importXdcBytesLimits: IMPORT_LIMITS,
    buildManifest, parseManifest, webxdcAvailable, importFilesAvailable,
    looksLikeText, mimeFor
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = CS.exporter; }
})();
