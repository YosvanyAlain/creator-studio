/* Moving apps in and out: .xdc export, .xdc/.zip/file import, full backups (format shared with 2.x). */
'use strict';
(function () {
  const CS = globalThis.CS;
  const U = CS.util;
  const { h, ui } = CS;
  const t = (...a) => CS.t(...a);
  const C = () => CS.common;
  const enc = new TextEncoder();
  const IMPORT_LIMITS = { files: 300, fileBytes: 8 * 1048576, totalBytes: 40 * 1048576 };

  /* ---------- Manifest ---------- */
  const tomlEscape = (s) => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\u0000-\u001f]/g, '');
  function buildManifest(p) {
    const lines = ['name = "' + tomlEscape(String(p.settings.xdcName || p.name || 'app').trim()) + '"'];
    const url = String(p.settings.sourceCodeUrl || '').trim();
    if (/^https?:\/\//.test(url)) lines.push('source_code_url = "' + tomlEscape(url) + '"');
    return lines.join('\n') + '\n';
  }
  function parseManifest(text) {
    const out = {};
    String(text || '').split(/\r?\n/).forEach((line) => {
      const m = /^\s*([a-z_]+)\s*=\s*"((?:[^"\\]|\\.)*)"\s*$/.exec(line);
      if (m) out[m[1]] = m[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    });
    return out;
  }

  /* An icon drawn from the project look when the app has no icon.png of its own. */
  async function lookIcon(p) {
    try {
      const size = 256;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      const root = getComputedStyle(document.documentElement);
      const color = (root.getPropertyValue('--tint-' + (p.look && p.look.tint || 'indigo')) || '#5146e0').trim();
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, color);
      grad.addColorStop(1, shade(color, -0.28));
      ctx.fillStyle = grad;
      roundRect(ctx, 0, 0, size, size, 64);
      ctx.fill();
      const svg = CS.icon((p.look && p.look.icon) || 'cube');
      svg.setAttribute('width', '150');
      svg.setAttribute('height', '150');
      svg.setAttribute('stroke', '#ffffff');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke-width', '1.7');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
      });
      ctx.drawImage(img, 53, 53, 150, 150);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
    } catch (error) { return null; }
  }
  function roundRect(ctx, x, y, w, hgt, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + hgt, r);
    ctx.arcTo(x + w, y + hgt, x, y + hgt, r);
    ctx.arcTo(x, y + hgt, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function shade(hex, amount) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    const f = (c) => Math.round(Math.min(255, Math.max(0, c + c * amount)));
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, '0')).join('');
  }

  /* ---------- Export ---------- */
  async function build(project, opts) {
    const o = opts || {};
    const p = project;
    if (CS.blocks && CS.blocks.syncBeforeExport) CS.blocks.syncBeforeExport(p);
    const files = [];
    for (const path of Object.keys(p.files).sort()) {
      if (path.toLowerCase() === 'webxdc.js') continue;
      const f = p.files[path];
      files.push({ path, data: f.kind === 'text' ? enc.encode(f.content) : U.dataUrlToBytes(f.dataUrl || '') });
    }
    if (!p.files['manifest.toml']) files.push({ path: 'manifest.toml', data: enc.encode(buildManifest(p)) });
    if (!p.files['icon.png'] && !p.files['icon.jpg'] && o.autoIcon !== false) {
      const icon = await lookIcon(p);
      if (icon) files.push({ path: 'icon.png', data: icon });
    }
    files.sort((a, b) => a.path.localeCompare(b.path));
    const bytes = await CS.zip.build(files);
    const back = await CS.zip.read(bytes, IMPORT_LIMITS);
    if (back.length !== files.length) throw Object.assign(new Error('verify'), { code: 'export-verify' });
    let sha256 = null;
    try { sha256 = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((b) => b.toString(16).padStart(2, '0')).join(''); } catch (error) { /* no subtle */ }
    return { blob: new Blob([bytes], { type: 'application/zip' }), bytes, name: U.slug(p.settings.xdcName || p.name) + '.xdc', size: bytes.length, files: files.length, sha256 };
  }

  /* ---------- Import ---------- */
  function looksLikeText(bytes) {
    const limit = Math.min(bytes.length, 8192);
    for (let i = 0; i < limit; i++) if (bytes[i] === 0) return false;
    try { new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, limit)); return true; } catch (error) { return limit < bytes.length; }
  }

  async function fromZipBytes(bytes, fileName) {
    let entries = await CS.zip.read(bytes, IMPORT_LIMITS);
    if (!entries.length) throw Object.assign(new Error('empty'), { code: 'import-empty' });
    /* A zip with a single top folder (common when zipping a folder) is unwrapped. */
    const tops = new Set(entries.map((e) => e.path.split('/')[0]));
    if (tops.size === 1 && entries.every((e) => e.path.includes('/'))) {
      const prefix = [...tops][0] + '/';
      entries = entries.map((e) => ({ path: e.path.slice(prefix.length), data: e.data }));
    }
    const files = {};
    let manifest = {};
    let skipped = 0;
    for (const e of entries) {
      const path = U.cleanPath(e.path);
      if (!path || path.toLowerCase() === 'webxdc.js' || /(^|\/)(\.DS_Store|__MACOSX|Thumbs\.db)/.test(path)) { skipped++; continue; }
      if (path === 'manifest.toml') manifest = parseManifest(new TextDecoder().decode(e.data));
      if (U.isTextPath(path) && looksLikeText(e.data)) files[path] = { kind: 'text', content: new TextDecoder().decode(e.data) };
      else files[path] = { kind: 'data', dataUrl: U.bytesToDataUrl(e.data, U.mimeOf(path)), mime: U.mimeOf(path), size: e.data.length };
    }
    const name = manifest.name || String(fileName || '').replace(/\.(xdc|zip)$/i, '') || t('imported_app');
    const p = CS.projects.create({ name, template: 'imported' });
    p.files = files;
    p.settings.sourceCodeUrl = manifest.source_code_url || '';
    p.look = { icon: 'xdc', tint: 'slate' };
    return { project: p, skipped, count: Object.keys(files).length };
  }

  async function importFile(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const name = file.name || '';
    if (/\.json$/i.test(name) || (bytes[0] === 0x7b && !/\.(xdc|zip)$/i.test(name))) {
      const data = JSON.parse(new TextDecoder().decode(bytes));
      if (data && data.kind === 'wcs-backup') return { backup: data };
      throw Object.assign(new Error('invalid'), { code: 'invalid-project' });
    }
    if (bytes[0] === 0x50 && bytes[1] === 0x4b) return fromZipBytes(bytes, name);
    throw Object.assign(new Error('invalid'), { code: 'invalid-project' });
  }

  async function pickAndImport() {
    const files = await ui.pickFile('.xdc,.zip,.json,application/zip,application/json');
    if (!files.length) return;
    try {
      const result = await importFile(files[0]);
      if (result.backup) return restoreFlow(result.backup);
      await CS.projects.add(result.project);
      ui.toast(t('imported_ok', { name: result.project.name, n: result.count }), 'ok');
      await C().openProject(result.project.id);
    } catch (error) {
      ui.toast(error && /^zip-/.test(error.code || '') ? t('err_zip') : C().errorText(error), 'error');
    }
  }

  /* ---------- Backups ---------- */
  async function buildBackup() {
    return {
      app: 'wcs', kind: 'wcs-backup', version: 2, exportedAt: new Date().toISOString(), appVersion: CS.app.VERSION,
      settings: CS.settings.all(), projects: await CS.store.list()
    };
  }

  async function exportFlow() {
    const data = await buildBackup();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const name = 'creator-studio-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    ui.menu({ title: t('backup_export'), subtitle: t('backup_summary', { n: data.projects.length, size: U.bytes(blob.size) }), items: [
      { icon: 'send', label: t('backup_to_chat'), sub: t('backup_to_chat_sub'), onClick: async () => { await C().deliver(blob, name, { chat: true }); ui.toast(t('exp_sent'), 'ok'); } },
      { icon: 'download', label: t('exp_download_file'), onClick: async () => { await C().deliver(blob, name); ui.toast(t('exp_downloaded', { name }), 'ok'); } }
    ] });
  }

  async function restoreFlow(data) {
    if (!data || data.kind !== 'wcs-backup' || data.app !== 'wcs' || !Array.isArray(data.projects)) { ui.toast(t('backup_invalid'), 'error'); return; }
    const ok = await ui.confirm({ title: t('backup_restore_q'), message: t('backup_restore_body', { n: data.projects.length }), okLabel: t('backup_restore') });
    if (!ok) return;
    let count = 0;
    for (const raw of data.projects) {
      if (!raw || typeof raw.id !== 'string' || !raw.files) continue;
      try { await CS.store.put(CS.projects.migrate(raw)); count++; } catch (error) { /* skip broken */ }
    }
    if (data.settings && typeof data.settings === 'object') {
      const keep = {};
      Object.keys(CS.settings.DEFAULTS).forEach((k) => { if (data.settings[k] !== undefined) keep[k] = data.settings[k]; });
      CS.settings.replace(Object.assign(CS.settings.all(), keep));
    }
    await CS.projects.close();
    CS.bus.emit('projects-changed');
    ui.toast(t('backup_restored', { n: count }), 'ok');
    CS.router.refresh();
  }

  async function importFlow() {
    const files = await ui.pickFile('.json,application/json');
    if (!files.length) return;
    try { restoreFlow(JSON.parse(await files[0].text())); } catch (error) { ui.toast(t('backup_invalid'), 'error'); }
  }

  CS.exporter = { build, buildManifest, parseManifest, lookIcon };
  CS.importer = { importFile, fromZipBytes, pickAndImport, looksLikeText };
  CS.backup = { buildBackup, exportFlow, importFlow, restoreFlow };
})();
