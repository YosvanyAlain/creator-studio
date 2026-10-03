/* Studio hub and shared services for the pixel, image and sound editors. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, icon, ui, router } = CS;
  const U = CS.util;
  const t = (...a) => CS.t(...a);

  const TOOLS = [
    { id: 'pixel', icon: 'sprite', tint: 'orange', art: pixelArt },
    { id: 'image', icon: 'image', tint: 'blue', art: imageArt },
    { id: 'audio', icon: 'wave', tint: 'teal', art: waveArt }
  ];
  const IMAGE_RX = /^image\/(png|jpeg|gif|webp|bmp)$/;
  const AUDIO_RX = /^audio\//;

  /* ---------- Navigation ---------- */
  function open(tool, params) {
    if (!tool || !router.has('studio-' + tool)) return router.go('studio', params || {});
    remember({ tool });
    return router.go('studio-' + tool, params || {});
  }

  /* Recent studio items: tools and saved files. */
  function recent() { return (CS.settings.get('studioRecent') || []).filter((r) => r && r.tool); }
  function remember(item) {
    const key = (r) => r.tool + '|' + (r.project || '') + '|' + (r.path || '');
    const list = recent().filter((r) => key(r) !== key(item));
    list.unshift(Object.assign({ at: Date.now() }, item));
    CS.settings.set('studioRecent', list.slice(0, 12));
  }

  /* ---------- Project assets ---------- */
  async function loadProject(id) {
    const P = CS.projects;
    if (P.current && P.current.id === id) return P.current;
    const raw = await CS.store.get(id);
    return raw ? P.migrate(raw) : null;
  }

  async function readAsset(projectId, path) {
    const p = await loadProject(projectId);
    const f = p && p.files[path];
    if (!f || f.kind !== 'data') return null;
    return { project: p, path, bytes: U.dataUrlToBytes(f.dataUrl), mime: f.mime || U.mimeOf(path), dataUrl: f.dataUrl, name: U.basename(path) };
  }

  /* Writes bytes into a project (open or closed). mutate(p) may store extra data such as editable sources. */
  async function writeAsset(projectId, path, bytes, mime, mutate) {
    const P = CS.projects;
    const p = await loadProject(projectId);
    if (!p) throw Object.assign(new Error('not-found'), { code: 'not-found' });
    const clean = P.write(path, { kind: 'data', dataUrl: U.bytesToDataUrl(bytes, mime), mime, size: bytes.length }, { project: p });
    if (mutate) mutate(p, clean);
    if (p === P.current) { P.touch('studio'); await P.flush(); } else { p.updatedAt = Date.now(); await P.save(p); }
    CS.bus.emit('projects-changed');
    return clean;
  }

  async function assets(kind) {
    const rx = kind === 'audio' ? AUDIO_RX : IMAGE_RX;
    const out = [];
    for (const p of await CS.projects.list()) {
      if (p.broken) continue;
      for (const [path, f] of Object.entries(p.files)) {
        if (f.kind === 'data' && rx.test(f.mime || U.mimeOf(path))) out.push({ project: p, path, file: f });
      }
    }
    return out.sort((a, b) => (b.project.updatedAt || 0) - (a.project.updatedAt || 0));
  }

  /* ---------- Pick an asset (project or device) ---------- */
  function pickAsset(opts) {
    const o = opts || {};
    const kind = o.kind || 'image';
    return new Promise((resolve) => {
      let result = null;
      const grid = h('div', { class: 'st-pick-grid' }, h('div', { class: 'st-pick-loading' }, t('st_loading')));
      const fromDevice = async () => {
        const [file] = await ui.pickFile(kind === 'audio' ? 'audio/*' : 'image/*');
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) { ui.toast(t('st_too_big'), 'error'); return; }
        const bytes = new Uint8Array(await file.arrayBuffer());
        result = { bytes, mime: file.type || U.mimeOf(file.name), name: file.name, dataUrl: U.bytesToDataUrl(bytes, file.type || U.mimeOf(file.name)) };
        handle.close();
      };
      const handle = ui.sheet({
        title: o.title || (kind === 'audio' ? t('st_pick_sound') : t('st_pick_image')), size: 'tall',
        body: [
          ui.button({ label: t('st_from_device'), icon: 'upload', variant: 'tonal', block: true, onClick: fromDevice }),
          h('div', { class: 'st-pick-label' }, t('st_from_projects')),
          grid
        ],
        onClose: () => resolve(result)
      });
      assets(kind).then((list) => {
        if (!list.length) { CS.mount(grid, h('div', { class: 'st-pick-empty' }, t('st_no_assets'))); return; }
        CS.mount(grid, list.slice(0, 120).map((a) => h('button', {
          type: 'button', class: 'st-asset', title: a.project.name + ' · ' + a.path,
          onclick: async () => { result = await readAsset(a.project.id, a.path); handle.close(); }
        }, assetThumb(a), h('span', { class: 'st-asset-name' }, U.basename(a.path)), h('span', { class: 'st-asset-sub' }, a.project.name))));
      });
    });
  }

  function assetThumb(a) {
    const mime = a.file.mime || U.mimeOf(a.path);
    if (IMAGE_RX.test(mime)) return h('span', { class: 'st-thumb checker' }, h('img', { src: a.file.dataUrl, alt: '', loading: 'lazy', class: /(^|\/)(sprite|pixel|tile)|\.gif$/i.test(a.path) || (a.file.size || 0) < 6000 ? 'px-crisp' : null }));
    return h('span', { class: 'st-thumb st-thumb-audio' }, icon('music'));
  }

  /* ---------- Save to project / download ---------- */
  /* opts: {title, kind, name, ext, exts?, project?, path?, encode(ext) -> {bytes, mime}, mutate?(p, path, ext)} */
  function saveSheet(opts) {
    const o = opts || {};
    return new Promise(async (resolve) => {
      let done = null;
      const list = (await CS.projects.list()).filter((p) => !p.broken);
      let projectId = o.project || (CS.projects.current && CS.projects.current.id) || CS.settings.get('studioProject') || (list[0] && list[0].id);
      if (!list.some((p) => p.id === projectId)) projectId = list[0] && list[0].id;
      let ext = o.ext || 'png';
      const exts = o.exts || [ext];
      const folder = o.kind === 'audio' ? 'sounds/' : 'assets/';
      const base = o.path ? o.path.replace(/\.[a-z0-9]+$/i, '') : folder + U.slug(o.name || (o.kind === 'audio' ? 'sound' : 'image'), 'asset');
      let stem = base;
      const nameInput = ui.input({ value: stem, mono: true, onInput: (v) => { stem = v; check(); } });
      const warn = h('div', { class: 'st-save-warn', hidden: true }, icon('alertTriangle'), h('span', {}, t('st_overwrite')));
      const fullPath = () => U.cleanPath(String(stem).trim().replace(/\.[a-z0-9]+$/i, '') + '.' + ext);
      const check = () => {
        const p = list.find((x) => x.id === projectId);
        warn.hidden = !(p && p.files[fullPath()]);
      };
      const projectRows = h('div', { class: 'st-save-projects' });
      const drawProjects = () => CS.mount(projectRows, list.length ? list.slice(0, 30).map((p) => ui.row({
        lead: CS.common.avatar(p, 'sm'), title: p.name, sub: CS.common.projectMeta(p), active: p.id === projectId, chevron: false,
        trailing: p.id === projectId ? h('span', { class: 'st-check' }, icon('checkCircle')) : null,
        onClick: () => { projectId = p.id; drawProjects(); check(); }
      })) : h('div', { class: 'st-pick-empty' }, t('st_no_projects')));
      drawProjects();
      check();

      const encode = async () => o.encode(ext);
      const save = async () => {
        const path = fullPath();
        if (!path || !projectId) return;
        try {
          const { bytes, mime } = await encode();
          const clean = await writeAsset(projectId, path, bytes, mime, o.mutate ? (p, pth) => o.mutate(p, pth, ext) : null);
          CS.settings.set('studioProject', projectId);
          remember({ tool: o.tool, project: projectId, path: clean, name: U.basename(clean) });
          done = { project: projectId, path: clean };
          handle.close();
          const p = list.find((x) => x.id === projectId);
          ui.toast(t('st_saved_in', { name: p ? p.name : '' }), 'ok', o.onOpenProject ? null : { action: { label: t('open'), onClick: () => CS.common.openProject(projectId, 'files') } });
        } catch (error) { ui.toast(CS.common.errorText(error), 'error'); }
      };
      const download = async () => {
        try {
          const { bytes, mime } = await encode();
          await CS.common.deliver(new Blob([bytes], { type: mime }), U.basename(fullPath()) || 'asset.' + ext);
        } catch (error) { ui.toast(CS.common.errorText(error), 'error'); }
      };
      const handle = ui.sheet({
        title: o.title || t('st_save'), size: 'tall',
        body: [
          exts.length > 1 ? ui.field(t('st_format'), ui.segmented(exts.map((x) => ({ value: x, label: x.toUpperCase() })), ext, (v) => { ext = v; check(); })) : null,
          ui.field(t('st_file_name'), nameInput, t('st_file_hint', { ext })),
          warn,
          h('div', { class: 'st-pick-label' }, t('st_project')),
          projectRows,
          o.extra || null
        ],
        actions: [
          ui.button({ label: t('st_download'), icon: 'download', variant: 'ghost', onClick: download }),
          ui.button({ label: t('st_save'), icon: 'save', variant: 'primary', disabled: !list.length, onClick: save })
        ],
        onClose: () => resolve(done)
      });
    });
  }

  /* ---------- Hub ---------- */
  function pixelArt() {
    const rows = ['.oo.oo.', 'ooooooo', 'oOooooo', 'ooooooo', '.ooooo.', '..ooo..', '...o...'];
    const rects = [];
    rows.forEach((r, y) => [...r].forEach((c, x) => { if (c !== '.') rects.push(h('rect', { x: x * 10, y: y * 10, width: 10, height: 10, fill: c === 'O' ? '#fff3' : '#fff' })); }));
    return h('svg', { viewBox: '-5 -5 80 80', class: 'st-art-svg' }, rects);
  }
  function imageArt() {
    return h('svg', { viewBox: '0 0 80 80', class: 'st-art-svg' },
      h('rect', { x: 6, y: 12, width: 68, height: 52, rx: 8, fill: '#fff2', stroke: '#fff', 'stroke-width': 3 }),
      h('circle', { cx: 56, cy: 28, r: 6, fill: '#ffd66b' }),
      h('path', { d: 'M10 58 L30 36 L44 50 L52 42 L70 60 Z', fill: '#fff' }));
  }
  function waveArt() {
    const bars = [10, 24, 40, 28, 52, 34, 18, 44, 30, 14, 26, 8];
    return h('svg', { viewBox: '0 0 80 80', class: 'st-art-svg' }, bars.map((v, i) => h('rect', { x: 4 + i * 6.2, y: 40 - v / 2, width: 4, height: v, rx: 2, fill: '#fff' })));
  }

  function toolCard(tool) {
    return h('button', { type: 'button', class: ['st-tool', 'st-tool-' + tool.id], dataset: { tool: tool.id }, onclick: () => { CS.haptic(); open(tool.id); } },
      h('span', { class: 'st-tool-art', 'aria-hidden': 'true' }, tool.art()),
      h('span', { class: 'st-tool-text' },
        h('span', { class: 'st-tool-title' }, t('st_' + tool.id)),
        h('span', { class: 'st-tool-sub' }, t('st_' + tool.id + '_sub'))),
      h('span', { class: 'st-tool-go' }, icon('arrowRight')));
  }

  async function renderHub(params, ctx) {
    const recentBox = h('div', { class: 'st-recent' });
    const assetBox = h('div', { class: 'st-assets' });
    const root = h('div', { class: 'studio-hub' },
      h('div', { class: 'st-hub-head' },
        h('div', { class: 'eyebrow' }, t('st_eyebrow')),
        h('h1', { class: 'st-hub-title' }, t('st_title')),
        h('p', { class: 'st-hub-sub' }, t('st_sub'))),
      h('div', { class: 'st-tools' }, TOOLS.map(toolCard)),
      recentBox, assetBox,
      h('div', { class: 'callout tip' }, icon('bulb'), h('div', {}, h('b', {}, t('home_tip')), ' ', t('st_tip'))));

    const [images, sounds] = await Promise.all([assets('image'), assets('audio')]);
    if (!ctx.alive()) return root;
    const files = recent().filter((r) => r.path && r.project);
    const all = images.concat(sounds);
    const find = (r) => all.find((a) => a.project.id === r.project && a.path === r.path);
    const items = files.map(find).filter(Boolean).slice(0, 8);
    if (items.length) CS.mount(recentBox, ui.section(t('st_recent'), null, h('div', { class: 'st-asset-row hscroll' }, items.map(assetButton))));
    const rest = all.filter((a) => !items.includes(a)).slice(0, 24);
    if (rest.length) CS.mount(assetBox, ui.section(t('st_in_projects'), null, h('div', { class: 'st-asset-grid' }, rest.map(assetButton))));
    return root;
  }

  /* Opens a project file in the right editor; images ask between pixel art and photo editing. */
  function edit(projectId, path, projectName) {
    if (AUDIO_RX.test(U.mimeOf(path))) return open('audio', { project: projectId, path });
    ui.menu({ title: U.basename(path), subtitle: projectName || null, items: [
      { icon: 'sprite', label: t('st_edit_pixel'), sub: t('st_edit_pixel_sub'), onClick: () => open('pixel', { project: projectId, path }) },
      { icon: 'image', label: t('st_edit_image'), sub: t('st_edit_image_sub'), onClick: () => open('image', { project: projectId, path }) }
    ] });
  }

  function assetButton(a) {
    return h('button', { type: 'button', class: 'st-asset', onclick: () => edit(a.project.id, a.path, a.project.name) },
      assetThumb(a), h('span', { class: 'st-asset-name' }, U.basename(a.path)), h('span', { class: 'st-asset-sub' }, a.project.name));
  }

  router.register('studio', { largeTitle: true, title: () => t('st_title'), render: renderHub });

  /* Editors register themselves via CS.studio.editor(id, view). */
  function editor(id, view) {
    router.register('studio-' + id, Object.assign({ flush: true, immersive: true }, view));
  }

  CS.studio = { TOOLS, open, edit, recent, remember, loadProject, readAsset, writeAsset, assets, pickAsset, saveSheet, editor, IMAGE_RX, AUDIO_RX };
})();
