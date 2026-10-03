/* Templates and starters: registry, customization fields, the shared app kit and project creation. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const lang = () => (CS.i18n && CS.i18n.lang === 'en' ? 'en' : 'es');

  const CATS = [
    { id: 'games', icon: 'gamepad', tint: 'pink' },
    { id: 'group', icon: 'users', tint: 'teal' },
    { id: 'organize', icon: 'checkCircle', tint: 'blue' },
    { id: 'tools', icon: 'tools', tint: 'amber' },
    { id: 'creative', icon: 'palette', tint: 'violet' }
  ];
  const templates = [];
  const starters = [];

  /* Bilingual text: T(es, en) or a plain value. */
  const T = (es, en) => ({ es, en: en == null ? es : en });
  const L = (v, l) => (v && typeof v === 'object' && !Array.isArray(v) && ('es' in v || 'en' in v) ? v[l || lang()] : v);

  function add(def) {
    if (!def || !def.id || templates.some((x) => x.id === def.id)) throw new Error('template ' + (def && def.id));
    templates.push(def);
    return def;
  }
  function addStarter(def) { starters.push(def); return def; }
  const get = (id) => templates.find((x) => x.id === id) || starters.find((x) => x.id === id) || null;
  const list = (cat) => templates.filter((x) => !cat || cat === 'all' || x.cat === cat);

  /* Default field values in a language. */
  function defaults(def, l) {
    const out = {};
    (def.fields || []).forEach((f) => { out[f.k] = L(f.value, l); });
    return out;
  }

  /* ---------- Kit: helpers every template uses to write its files ---------- */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const js = (v) => JSON.stringify(v).replace(/</g, '\\u003c');
  const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);
  const hex = (c, d) => (/^#[0-9a-f]{6}$/i.test(String(c || '')) ? c : d || '#5b4ff5');

  function page(o) {
    return [
      '<!DOCTYPE html>',
      '<html lang="' + o.lang + '">',
      '<head>',
      '  <meta charset="utf-8">',
      '  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
      '  <title>' + esc(o.title) + '</title>',
      '  <link rel="stylesheet" href="style.css">',
      '  <script src="webxdc.js"></script>',
      '</head>',
      '<body>',
      o.body.replace(/^\n+|\n+$/g, ''),
      '  <script src="app.js"></script>',
      '</body>',
      '</html>',
      ''
    ].join('\n');
  }

  /* Shared look: light and dark, one accent color, soft cards and big touch targets. */
  function css(accent, extra) {
    const a = hex(accent);
    return [
      '/* Shared look */',
      ':root {',
      '  --accent: ' + a + ';',
      '  --accent-ink: #ffffff;',
      '  --accent-soft: ' + a + '1f;',
      '  --bg: #f4f5fb;',
      '  --card: #ffffff;',
      '  --text: #171a2b;',
      '  --muted: #6b7088;',
      '  --line: #e4e6f0;',
      '  --ok: #12a46a;',
      '  --bad: #e5484d;',
      '  --radius: 16px;',
      '  --shadow: 0 1px 2px rgba(20, 24, 50, .06), 0 6px 20px rgba(20, 24, 50, .06);',
      '}',
      '@media (prefers-color-scheme: dark) {',
      '  :root { --bg: #0f1117; --card: #191c26; --text: #eceef6; --muted: #9298ae; --line: #2a2e3c; --accent-soft: ' + a + '33; }',
      '}',
      '* { box-sizing: border-box; }',
      'html { -webkit-text-size-adjust: 100%; }',
      'body {',
      '  margin: 0; min-height: 100vh; background: var(--bg); color: var(--text);',
      '  font: 16px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;',
      '  padding: 18px 16px calc(24px + env(safe-area-inset-bottom, 0px));',
      '}',
      '.app { max-width: 520px; margin: 0 auto; display: flex; flex-direction: column; gap: 14px; }',
      '.top { display: flex; align-items: center; gap: 12px; }',
      '.top .logo { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; font-size: 24px; background: var(--accent-soft); flex: none; }',
      '.top h1 { font-size: 1.3rem; line-height: 1.2; margin: 0; letter-spacing: -.01em; }',
      '.top p { margin: 2px 0 0; color: var(--muted); font-size: .9rem; }',
      '.card { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); padding: 16px; box-shadow: var(--shadow); }',
      '.row { display: flex; gap: 8px; align-items: center; }',
      '.wrap { flex-wrap: wrap; }',
      '.grow { flex: 1; min-width: 0; }',
      '.muted { color: var(--muted); }',
      '.small { font-size: .85rem; }',
      '.center { text-align: center; }',
      '.label { font-size: .78rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin: 4px 2px 0; }',
      'button, .btn {',
      '  font: inherit; font-weight: 650; border: 0; border-radius: 12px; min-height: 46px; padding: 0 18px;',
      '  background: var(--accent); color: var(--accent-ink); cursor: pointer; display: inline-flex;',
      '  align-items: center; justify-content: center; gap: 8px; transition: transform .08s, filter .15s;',
      '  -webkit-tap-highlight-color: transparent;',
      '}',
      'button:active { transform: scale(.97); }',
      'button:disabled { opacity: .45; cursor: default; transform: none; }',
      'button.soft { background: var(--accent-soft); color: var(--accent); }',
      'button.ghost { background: transparent; color: var(--muted); border: 1px solid var(--line); }',
      'button.icon { width: 46px; padding: 0; flex: none; }',
      'button.danger { background: transparent; color: var(--bad); }',
      'input, select, textarea {',
      '  font: inherit; font-size: 16px; color: inherit; background: var(--card); width: 100%;',
      '  border: 1px solid var(--line); border-radius: 12px; min-height: 46px; padding: 10px 12px; min-width: 0;',
      '}',
      'input:focus, select:focus, textarea:focus { outline: 2px solid var(--accent); outline-offset: -1px; border-color: transparent; }',
      'ul.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }',
      '.avatar { width: 30px; height: 30px; border-radius: 50%; display: inline-grid; place-items: center; color: #fff; font-size: .8rem; font-weight: 700; flex: none; }',
      '.chip { display: inline-flex; align-items: center; gap: 6px; border-radius: 99px; padding: 4px 10px; font-size: .82rem; font-weight: 600; background: var(--accent-soft); color: var(--accent); }',
      '.empty { text-align: center; color: var(--muted); padding: 22px 8px; }',
      '.empty b { display: block; font-size: 2rem; margin-bottom: 4px; }',
      '.toast { position: fixed; left: 50%; bottom: calc(18px + env(safe-area-inset-bottom, 0px)); transform: translate(-50%, 20px); opacity: 0;',
      '  background: var(--text); color: var(--bg); border-radius: 99px; padding: 10px 16px; font-size: .9rem; transition: .25s; pointer-events: none; }',
      '.toast.on { opacity: 1; transform: translate(-50%, 0); }',
      '@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }',
      '',
      '/* This app */',
      (extra || '').replace(/^\n+/, ''),
      ''
    ].join('\n');
  }

  /* Small helpers placed at the top of app.js so every template reads the same way. */
  function helpers(l, names) {
    const all = {
      $: "const $ = (id) => document.getElementById(id);",
      me: "const me = { addr: window.webxdc.selfAddr, name: window.webxdc.selfName };",
      esc: "const esc = (s) => String(s).replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[c]));",
      color: [
        '/* A stable color for each person. */',
        "const color = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return 'hsl(' + (Math.abs(h) % 360) + ' 62% 52%)'; };"
      ].join('\n'),
      avatar: "const avatar = (name) => '<span class=\"avatar\" style=\"background:' + color(name) + '\">' + esc((name || '?').trim().charAt(0).toUpperCase()) + '</span>';",
      toast: [
        'function toast(text) {',
        "  let el = document.querySelector('.toast');",
        "  if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }",
        "  el.textContent = text; el.classList.add('on');",
        "  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 1800);",
        '}'
      ].join('\n'),
      uid: "const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);",
      ago: l === 'en'
        ? "const ago = (t) => { const s = Math.round((Date.now() - t) / 1000); return s < 60 ? 'now' : s < 3600 ? Math.floor(s / 60) + ' min' : s < 86400 ? Math.floor(s / 3600) + ' h' : new Date(t).toLocaleDateString(); };"
        : "const ago = (t) => { const s = Math.round((Date.now() - t) / 1000); return s < 60 ? 'ahora' : s < 3600 ? Math.floor(s / 60) + ' min' : s < 86400 ? Math.floor(s / 3600) + ' h' : new Date(t).toLocaleDateString(); };"
    };
    const order = ['$', 'me', 'esc', 'color', 'avatar', 'toast', 'uid', 'ago'];
    const want = new Set(names);
    if (want.has('avatar')) { want.add('color'); want.add('esc'); }
    return order.filter((k) => want.has(k)).map((k) => all[k]).join('\n');
  }

  const kit = { T, L, esc, js, lines, hex, page, css, helpers };

  /* ---------- Building projects ---------- */
  /* Pure: files, blocks and look for a template or starter, ready for a project. */
  function build(def, l, values) {
    l = l === 'en' ? 'en' : 'es';
    const v = Object.assign(defaults(def, l), values || {});
    const out = def.files ? def.files(l, v, kit) : {};
    const files = {};
    Object.keys(out).forEach((path) => { files[path] = out[path]; });
    let blocks = null;
    const model = def.blocks ? def.blocks(l, v, kit) : null;
    if (model && CS.blocks) {
      const m = CS.blocks.normalizeModel(model);
      const code = CS.blocks.generate(m).code;
      files['app.js'] = code;
      blocks = { model: m, generatedFile: 'app.js', handEdited: false, lastGeneratedAt: Date.now(), lastCode: code };
    }
    const name = String(v.title || L(def.name, l) || '').trim().slice(0, 60) || L(def.name, l);
    return { name, files, blocks, look: { icon: def.icon || 'cube', tint: def.tint || 'indigo' }, tab: def.tab || (blocks ? 'blocks' : 'test') };
  }

  /* An unsaved project, used by live previews. */
  function preview(def, l, values) {
    const b = build(def, l, values);
    return CS.projects.create({ name: b.name, files: b.files, blocks: b.blocks, look: b.look, template: def.id });
  }

  /* Creates, saves and returns a project. */
  async function create(id, o) {
    const def = typeof id === 'string' ? get(id) : id;
    if (!def) throw new Error('unknown template');
    const opts = o || {};
    const b = build(def, opts.lang || lang(), opts.values);
    const isStarter = starters.includes(def);
    const p = CS.projects.create({
      name: (opts.name || b.name).trim(), files: b.files, blocks: b.blocks, look: opts.look || b.look,
      template: isStarter ? null : def.id, starter: isStarter ? def.id : null
    });
    p.workspace = Object.assign({}, p.workspace, { tab: b.tab, file: p.files['index.html'] ? 'index.html' : null });
    await CS.projects.add(p);
    return p;
  }

  CS.templates = { CATS, T, L, kit, add, addStarter, get, list, starters: () => starters.slice(), defaults, build, preview, create };
})();
