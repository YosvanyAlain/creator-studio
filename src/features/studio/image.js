/* Image editor: adjustments, filter presets, crop, rotate, flip, resize, convert to pixel art. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, icon, ui } = CS;
  const R = CS.raster;
  const FX = CS.imagefx;
  const U = CS.util;
  const t = (...a) => CS.t(...a);
  const MAX_SIDE = 2048;
  const UNDO_MAX = 20;
  const ASPECTS = [['free', 0], ['1:1', 1], ['4:3', 4 / 3], ['3:4', 3 / 4], ['16:9', 16 / 9], ['9:16', 9 / 16]];
  const MODES = [{ id: 'adjust', icon: 'sliders' }, { id: 'filters', icon: 'sparkles' }, { id: 'crop', icon: 'crop' }, { id: 'rotate', icon: 'rotate' }, { id: 'resize', icon: 'expand' }];

  let E = null;

  function toImageData(img) { return new ImageData(img.data instanceof Uint8ClampedArray ? img.data : new Uint8ClampedArray(img.data), img.w, img.h); }
  function canvasOf(img) {
    const c = document.createElement('canvas');
    c.width = img.w; c.height = img.h;
    c.getContext('2d').putImageData(toImageData(img), 0, 0);
    return c;
  }
  /* Smooth resample through a canvas. */
  function resample(img, w, hh) {
    const src = canvasOf(img);
    const c = document.createElement('canvas');
    c.width = w; c.height = hh;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, w, hh);
    return { w, h: hh, data: ctx.getImageData(0, 0, w, hh).data };
  }
  function fitSize(w, hh, max) { const k = Math.min(1, max / Math.max(w, hh)); return [Math.max(1, Math.round(w * k)), Math.max(1, Math.round(hh * k))]; }

  async function loadFrom(dataUrl) {
    const d = await R.decodeImage(dataUrl);
    if (Math.max(d.w, d.h) > MAX_SIDE) { const r = await R.decodeImage(dataUrl, MAX_SIDE); return { img: { w: r.w, h: r.h, data: r.data }, reduced: true }; }
    return { img: { w: d.w, h: d.h, data: d.data } };
  }

  function mountEditor(root, init) {
    const S = {
      img: init.img, preset: 'none', adj: {}, undo: [], redo: [], link: init.link || null, name: init.name || 'image',
      ext: init.ext || 'png', dirty: false, mode: 'adjust', slider: 'brightness', aspect: 0, crop: null, compare: false, lockRatio: true
    };
    const canvas = h('canvas', { class: 'im-canvas checker' });
    const overlay = h('div', { class: 'im-crop', hidden: true });
    const compareBtn = h('button', { type: 'button', class: 'btn btn-ghost px-float-btn im-compare', title: t('im_compare'), 'aria-label': t('im_compare') }, icon('eye'));
    const stage = h('div', { class: 'im-stage' }, h('div', { class: 'im-frame' }, canvas, overlay), h('div', { class: 'px-floats' }, compareBtn));
    const panel = h('div', { class: 'im-panel' });
    const modes = h('div', { class: 'im-modes', role: 'tablist' });
    CS.mount(root, [stage, h('div', { class: 'px-dock im-dock' }, panel, modes)]);
    const ctx = canvas.getContext('2d');
    let base = null;

    /* ----- preview ----- */
    function rebase() {
      const r = stage.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const max = Math.max(256, Math.min(1400, Math.round(Math.max(r.width, r.height) * dpr)));
      const [w, hh] = fitSize(S.img.w, S.img.h, max);
      base = w === S.img.w && hh === S.img.h ? S.img : resample(S.img, w, hh);
      canvas.width = base.w; canvas.height = base.h;
      layout();
      draw();
    }
    function layout() {
      const r = stage.getBoundingClientRect();
      if (!r.width || !base) return;
      const pad = 20;
      const k = Math.min((r.width - pad * 2) / base.w, (r.height - pad * 2) / base.h);
      canvas.style.width = Math.round(base.w * k) + 'px';
      canvas.style.height = Math.round(base.h * k) + 'px';
      if (S.crop) drawCrop();
    }
    let raf = 0;
    function draw() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!base) return;
        const adj = FX.combine(S.preset, S.adj);
        const px = S.compare || FX.isIdentity(adj) ? base.data : FX.apply(base.data, base.w, base.h, adj);
        ctx.putImageData(toImageData({ w: base.w, h: base.h, data: px }), 0, 0);
      });
    }
    const ro = new ResizeObserver(() => { if (base) layout(); });
    ro.observe(stage);
    compareBtn.addEventListener('pointerdown', () => { S.compare = true; draw(); compareBtn.classList.add('on'); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => compareBtn.addEventListener(ev, () => { if (!S.compare) return; S.compare = false; draw(); compareBtn.classList.remove('on'); }));

    /* ----- history ----- */
    const snap = () => ({ img: S.img, preset: S.preset, adj: Object.assign({}, S.adj) });
    function record() {
      S.undo.push(snap());
      if (S.undo.length > UNDO_MAX) S.undo.shift();
      S.redo.length = 0;
      S.dirty = true;
      updateChrome();
    }
    function restore(from, to) {
      const entry = from.pop();
      if (!entry) return;
      to.push(snap());
      const sizeChanged = entry.img !== S.img;
      S.img = entry.img; S.preset = entry.preset; S.adj = entry.adj;
      S.dirty = true;
      if (sizeChanged) rebase(); else draw();
      drawPanel();
      updateChrome();
    }
    function commitImage(next) {
      record();
      S.img = next;
      S.crop = null;
      rebase();
      drawPanel();
    }

    /* ----- panels ----- */
    function drawModes() {
      CS.mount(modes, MODES.map((m) => h('button', {
        type: 'button', role: 'tab', class: ['im-mode', S.mode === m.id && 'on'], dataset: { mode: m.id }, 'aria-selected': S.mode === m.id ? 'true' : 'false',
        onclick: () => { CS.haptic(); setMode(m.id); }
      }, icon(m.icon), h('span', {}, t('im_' + m.id)))));
    }
    function setMode(id) {
      S.mode = id;
      if (id === 'crop') startCrop(); else { S.crop = null; overlay.hidden = true; }
      drawModes();
      drawPanel();
    }
    function drawPanel() {
      if (S.mode === 'adjust') return CS.mount(panel, adjustPanel());
      if (S.mode === 'filters') return CS.mount(panel, filtersPanel());
      if (S.mode === 'crop') return CS.mount(panel, cropPanel());
      if (S.mode === 'rotate') return CS.mount(panel, rotatePanel());
      return CS.mount(panel, resizePanel());
    }

    function adjustPanel() {
      const def = FX.SLIDERS.find((s) => s.id === S.slider);
      const val = S.adj[def.id] || 0;
      const out = h('b', { class: 'im-val' }, String(val));
      let before = null;
      const range = h('input', {
        type: 'range', class: 'im-range', min: String(def.min), max: String(def.max), step: def.id === 'blur' ? '0.5' : '1', value: String(val),
        oninput: (e) => {
          if (!before) before = snap();
          S.adj[def.id] = +e.target.value; out.textContent = e.target.value; draw();
        },
        onchange: () => {
          if (before) { S.undo.push(before); if (S.undo.length > UNDO_MAX) S.undo.shift(); S.redo.length = 0; S.dirty = true; before = null; updateChrome(); }
          drawPanel();
        }
      });
      return [
        h('div', { class: 'im-chips hscroll' }, FX.SLIDERS.map((s) => ui.chip(t('im_' + s.id), {
          icon: s.icon, active: s.id === S.slider, class: S.adj[s.id] ? 'chip-dot' : null, onClick: () => { S.slider = s.id; drawPanel(); }
        }))),
        h('div', { class: 'im-slider' }, range, out,
          ui.iconButton('refresh', t('st_reset'), () => { if (!S.adj[def.id]) return; record(); delete S.adj[def.id]; draw(); drawPanel(); }, { size: 'sm' }))
      ];
    }

    let thumbs = null;
    function filtersPanel() {
      if (!thumbs) {
        const [w, hh] = fitSize(S.img.w, S.img.h, 72);
        const small = resample(S.img, w, hh);
        thumbs = {};
        for (const id of Object.keys(FX.PRESETS)) {
          const c = document.createElement('canvas');
          c.width = w; c.height = hh;
          c.getContext('2d').putImageData(toImageData({ w, h: hh, data: FX.apply(small.data, w, hh, FX.PRESETS[id]) }), 0, 0);
          thumbs[id] = c.toDataURL();
        }
      }
      return h('div', { class: 'im-presets hscroll' }, Object.keys(FX.PRESETS).map((id) => h('button', {
        type: 'button', class: ['im-preset', S.preset === id && 'on'], dataset: { preset: id },
        onclick: () => { if (S.preset === id) return; record(); S.preset = id; draw(); drawPanel(); }
      }, h('img', { src: thumbs[id], alt: '' }), h('span', {}, t('im_f_' + id)))));
    }

    function rotatePanel() {
      const op = (ic, label, fn) => h('button', { type: 'button', class: 'im-op', onclick: () => { CS.haptic(); commitImage(fn(S.img)); } }, icon(ic), h('span', {}, label));
      return h('div', { class: 'im-ops' },
        op('undo', t('im_rot_left'), (i) => FX.rotate90(i, false)),
        op('redo', t('im_rot_right'), (i) => FX.rotate90(i, true)),
        op('flipH', t('im_flip_h'), (i) => FX.flip(i, true)),
        op('mirror', t('im_flip_v'), (i) => FX.flip(i, false)));
    }

    function resizePanel() {
      let w = S.img.w, hh = S.img.h;
      const ratio = S.img.w / S.img.h;
      const wIn = ui.input({ type: 'number', value: w, min: 1, inputmode: 'numeric', onInput: (v) => { w = Math.max(1, +v || 1); if (S.lockRatio) { hh = Math.max(1, Math.round(w / ratio)); hIn.value = hh; } } });
      const hIn = ui.input({ type: 'number', value: hh, min: 1, inputmode: 'numeric', onInput: (v) => { hh = Math.max(1, +v || 1); if (S.lockRatio) { w = Math.max(1, Math.round(hh * ratio)); wIn.value = w; } } });
      const apply = (nw, nh) => {
        const W = Math.min(MAX_SIDE, Math.round(nw)), H = Math.min(MAX_SIDE, Math.round(nh));
        if (W === S.img.w && H === S.img.h) return;
        commitImage(resample(S.img, W, H));
        ui.toast(t('im_resized', { w: W, h: H }), 'ok');
      };
      const pct = (k) => ui.chip(Math.round(k * 100) + '%', { onClick: () => apply(S.img.w * k, S.img.h * k) });
      const side = (n) => ui.chip(n + ' px', { onClick: () => { const [a, b] = fitSize(S.img.w, S.img.h, n); apply(a, b); } });
      return [
        h('div', { class: 'im-chips hscroll' }, pct(0.5), pct(0.25), side(1024), side(512), side(256), side(128)),
        h('div', { class: 'im-resize' },
          wIn, h('button', { type: 'button', class: ['im-lock', S.lockRatio && 'on'], title: t('im_lock'), 'aria-label': t('im_lock'), onclick: (e) => { S.lockRatio = !S.lockRatio; e.currentTarget.classList.toggle('on', S.lockRatio); } }, icon('link')),
          hIn, ui.button({ label: t('st_apply'), variant: 'primary', size: 'sm', onClick: () => apply(w, hh) }))
      ];
    }

    /* ----- crop ----- */
    function startCrop() {
      S.crop = { x: 0.08, y: 0.08, w: 0.84, h: 0.84 };
      if (S.aspect) fixAspect();
      overlay.hidden = false;
      drawCrop();
    }
    function fixAspect() {
      if (!S.aspect) return;
      const c = S.crop;
      const imgRatio = S.img.w / S.img.h;
      /* Aspect in image pixels -> in normalized units. */
      const want = S.aspect / imgRatio;
      let w = c.w, hh = w / want;
      if (hh > 1) { hh = 0.9; w = hh * want; }
      if (w > 1) { w = 0.9; hh = w / want; }
      c.x = Math.min(Math.max(0, c.x + (c.w - w) / 2), 1 - w); c.y = Math.min(Math.max(0, c.y + (c.h - hh) / 2), 1 - hh);
      c.w = w; c.h = hh;
    }
    function drawCrop() {
      const c = S.crop;
      if (!c) return;
      const cw = canvas.clientWidth, ch = canvas.clientHeight;
      overlay.style.width = cw + 'px'; overlay.style.height = ch + 'px';
      const box = overlay.querySelector('.im-crop-box') || overlay.appendChild(h('div', { class: 'im-crop-box' },
        h('span', { class: 'im-crop-grid' }), ['nw', 'ne', 'sw', 'se'].map((k) => h('span', { class: 'im-handle im-' + k, dataset: { handle: k } }))));
      box.style.left = c.x * cw + 'px'; box.style.top = c.y * ch + 'px';
      box.style.width = c.w * cw + 'px'; box.style.height = c.h * ch + 'px';
    }
    let drag = null;
    overlay.addEventListener('pointerdown', (e) => {
      const boxEl = e.target.closest('.im-crop-box');
      if (!boxEl) return;
      try { overlay.setPointerCapture(e.pointerId); } catch (error) { /* synthetic or released pointer */ }
      drag = { handle: e.target.dataset.handle || 'move', x: e.clientX, y: e.clientY, c: Object.assign({}, S.crop) };
      e.preventDefault();
    });
    overlay.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = (e.clientX - drag.x) / canvas.clientWidth, dy = (e.clientY - drag.y) / canvas.clientHeight;
      const o = drag.c, c = S.crop, min = 0.05;
      if (drag.handle === 'move') {
        c.x = Math.min(1 - o.w, Math.max(0, o.x + dx)); c.y = Math.min(1 - o.h, Math.max(0, o.y + dy));
      } else {
        let x0 = o.x, y0 = o.y, x1 = o.x + o.w, y1 = o.y + o.h;
        if (drag.handle.includes('w')) x0 = Math.min(x1 - min, Math.max(0, o.x + dx));
        if (drag.handle.includes('e')) x1 = Math.max(x0 + min, Math.min(1, o.x + o.w + dx));
        if (drag.handle.includes('n')) y0 = Math.min(y1 - min, Math.max(0, o.y + dy));
        if (drag.handle.includes('s')) y1 = Math.max(y0 + min, Math.min(1, o.y + o.h + dy));
        if (S.aspect) {
          const want = S.aspect / (S.img.w / S.img.h);
          const hh = (x1 - x0) / want;
          if (drag.handle.includes('n')) y0 = Math.max(0, y1 - hh); else y1 = Math.min(1, y0 + hh);
          const realH = y1 - y0;
          if (Math.abs(realH - hh) > 1e-6) { const w = realH * want; if (drag.handle.includes('w')) x0 = x1 - w; else x1 = x0 + w; }
        }
        c.x = x0; c.y = y0; c.w = x1 - x0; c.h = y1 - y0;
      }
      drawCrop();
    });
    const endDrag = () => { drag = null; };
    overlay.addEventListener('pointerup', endDrag);
    overlay.addEventListener('pointercancel', endDrag);

    function cropPanel() {
      return [
        h('div', { class: 'im-chips hscroll' }, ASPECTS.map(([label, a]) => ui.chip(label === 'free' ? t('im_free') : label, {
          active: S.aspect === a, onClick: () => { S.aspect = a; if (S.crop) { fixAspect(); drawCrop(); } drawPanel(); }
        }))),
        h('div', { class: 'im-crop-actions' },
          ui.button({ label: t('st_reset'), variant: 'ghost', size: 'sm', onClick: () => { startCrop(); } }),
          ui.button({ label: t('im_crop_apply'), icon: 'check', variant: 'primary', size: 'sm', onClick: () => {
            const c = S.crop;
            const x = Math.round(c.x * S.img.w), y = Math.round(c.y * S.img.h);
            const w = Math.max(1, Math.min(S.img.w - x, Math.round(c.w * S.img.w))), hh = Math.max(1, Math.min(S.img.h - y, Math.round(c.h * S.img.h)));
            commitImage(FX.crop(S.img, x, y, w, hh));
            thumbs = null;
            setMode('adjust');
          } }))
      ];
    }

    /* ----- output ----- */
    async function encodeFull(ext) {
      const adj = FX.combine(S.preset, S.adj);
      const px = FX.isIdentity(adj) ? S.img.data : FX.apply(S.img.data, S.img.w, S.img.h, adj);
      const c = canvasOf({ w: S.img.w, h: S.img.h, data: px });
      const jpeg = ext === 'jpg' || ext === 'jpeg';
      if (jpeg) {
        /* JPEG has no transparency: flatten on white. */
        const flat = document.createElement('canvas');
        flat.width = c.width; flat.height = c.height;
        const g = flat.getContext('2d');
        g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(c, 0, 0);
        return { bytes: await R.canvasBytes(flat, 'image/jpeg', 0.88), mime: 'image/jpeg' };
      }
      return { bytes: await R.canvasBytes(c, 'image/png'), mime: 'image/png' };
    }
    async function save(as) {
      if (S.link && !as) {
        try {
          const ext = U.ext(S.link.path).toLowerCase();
          const out = await encodeFull(ext === 'jpg' || ext === 'jpeg' ? 'jpg' : 'png');
          await CS.studio.writeAsset(S.link.project, S.link.path, out.bytes, out.mime);
          S.dirty = false; updateChrome();
          ui.toast(t('st_saved'), 'ok');
        } catch (error) { ui.toast(CS.common.errorText(error), 'error'); }
        return;
      }
      const res = await CS.studio.saveSheet({
        tool: 'image', kind: 'image', name: S.name, ext: S.ext === 'jpg' ? 'jpg' : 'png', exts: ['png', 'jpg'],
        project: S.link ? S.link.project : (CS.projects.current && CS.projects.current.id), path: as ? null : S.link && S.link.path,
        extra: h('p', { class: 'px-hint' }, t('im_format_hint')),
        encode: encodeFull
      });
      if (res) { S.link = res; S.name = U.basename(res.path).replace(/\.[a-z0-9]+$/i, ''); S.dirty = false; updateChrome(); }
    }
    function toPixel() {
      let size = 32, pal = 'studio';
      const preview = h('div', { class: 'pxe-preview checker' });
      let result = null;
      const refresh = () => {
        const adj = FX.combine(S.preset, S.adj);
        const [w, hh] = fitSize(S.img.w, S.img.h, size);
        const small = resample({ w: S.img.w, h: S.img.h, data: FX.isIdentity(adj) ? S.img.data : FX.apply(S.img.data, S.img.w, S.img.h, adj) }, w, hh);
        let px = small.data;
        if (pal !== 'keep') px = R.quantize(px, R.PALETTES[pal]);
        else { px = new Uint8ClampedArray(px); for (let i = 3; i < px.length; i += 4) px[i] = px[i] < 128 ? 0 : 255; }
        result = { w, h: hh, data: px };
        const c = R.toCanvas(px, w, hh, Math.max(1, Math.floor(192 / Math.max(w, hh))));
        c.className = 'px-crisp';
        CS.mount(preview, c);
      };
      const handle = ui.sheet({
        title: t('im_to_pixel'), subtitle: t('im_to_pixel_sub'), size: 'tall',
        body: [
          preview,
          ui.field(t('px_canvas_size'), ui.segmented([16, 24, 32, 48, 64, 96].map((n) => ({ value: n, label: String(n) })), size, (v) => { size = v; refresh(); })),
          ui.field(t('im_palette'), ui.select(['keep', 'studio', 'pico8', 'sweetie', 'gameboy', 'gray'].map((id) => ({ value: id, label: t('px_pal_' + id) })), pal, (v) => { pal = v; refresh(); }))
        ],
        actions: [ui.button({ label: t('im_open_pixel'), icon: 'sprite', variant: 'primary', onClick: () => {
          handle.close();
          CS.studio.open('pixel', { pixels: result, name: S.name, fresh: true });
        } })]
      });
      refresh();
    }
    async function openOther() {
      const asset = await CS.studio.pickAsset({ kind: 'image' });
      if (!asset) return;
      if (S.dirty && !(await ui.confirm({ title: t('px_discard_q'), message: t('px_discard_body'), okLabel: t('px_discard'), danger: true }))) return;
      S.dirty = false;
      if (asset.project) { CS.router.go('studio-image', { project: asset.project.id, path: asset.path }, { replace: true }); return; }
      try {
        const r = await loadFrom(asset.dataUrl);
        Object.assign(S, { img: r.img, preset: 'none', adj: {}, undo: [], redo: [], link: null, name: asset.name.replace(/\.[a-z0-9]+$/i, ''), dirty: false });
        thumbs = null;
        rebase(); setMode('adjust'); updateChrome();
      } catch (error) { ui.toast(t('px_open_failed'), 'error'); }
    }
    function more() {
      ui.menu({ title: S.name, subtitle: S.img.w + '×' + S.img.h, items: [
        S.link ? { icon: 'filePlus', label: t('st_save_as'), onClick: () => save(true) } : null,
        { icon: 'download', label: t('st_download'), onClick: async () => { const out = await encodeFull(S.ext === 'jpg' ? 'jpg' : 'png'); CS.common.deliver(new Blob([out.bytes], { type: out.mime }), U.slug(S.name, 'image') + (out.mime === 'image/jpeg' ? '.jpg' : '.png')); } },
        { icon: 'sprite', label: t('im_to_pixel'), sub: t('im_to_pixel_sub'), onClick: toPixel },
        { icon: 'folderOpen', label: t('px_open'), onClick: openOther },
        { icon: 'refresh', label: t('im_reset_all'), danger: true, onClick: () => { if (FX.isIdentity(FX.combine(S.preset, S.adj))) return; record(); S.preset = 'none'; S.adj = {}; draw(); drawPanel(); } }
      ] });
    }
    function updateChrome() {
      CS.app.setChrome({
        title: S.name + (S.dirty ? ' •' : ''),
        subtitle: S.img.w + '×' + S.img.h,
        actions: [
          ui.iconButton('undo', t('undo'), () => restore(S.undo, S.redo), { disabled: !S.undo.length, class: 'im-undo' }),
          ui.iconButton('redo', t('redo'), () => restore(S.redo, S.undo), { disabled: !S.redo.length }),
          ui.iconButton('save', S.link ? t('st_save') : t('st_save_project'), () => save(false), { class: 'im-save' }),
          ui.iconButton('moreV', t('more'), more)
        ]
      });
    }

    E = { S, save, toPixel, destroy() { ro.disconnect(); }, get dirty() { return S.dirty; } };
    drawModes();
    drawPanel();
    requestAnimationFrame(() => { rebase(); updateChrome(); });
    if (init.note) ui.toast(init.note, 'info');
  }

  function emptyState(root) {
    const pick = async () => {
      const asset = await CS.studio.pickAsset({ kind: 'image' });
      if (!asset) return;
      if (asset.project) { CS.router.go('studio-image', { project: asset.project.id, path: asset.path }, { replace: true }); return; }
      try {
        const r = await loadFrom(asset.dataUrl);
        mountEditor(root, { img: r.img, name: asset.name.replace(/\.[a-z0-9]+$/i, ''), ext: /jpe?g$/i.test(asset.name) ? 'jpg' : 'png', note: r.reduced ? t('im_reduced', { n: MAX_SIDE }) : null });
      } catch (error) { ui.toast(t('px_open_failed'), 'error'); }
    };
    CS.mount(root, h('div', { class: 'im-empty' }, ui.empty({ icon: 'image', tint: 'blue', title: t('im_empty_title'), body: t('im_empty_body') }),
      ui.button({ label: t('im_choose'), icon: 'folderOpen', variant: 'primary', onClick: pick })));
    CS.app.setChrome({ actions: [] });
  }

  async function render(params, ctx) {
    const root = h('div', { class: 'im' }, h('div', { class: 'st-loading' }, t('st_loading')));
    const p = params || {};
    if (p.project && p.path) {
      const asset = await CS.studio.readAsset(p.project, p.path);
      if (!ctx.alive()) return root;
      if (asset) {
        try {
          const r = await loadFrom(asset.dataUrl);
          if (!ctx.alive()) return root;
          const ext = U.ext(p.path).toLowerCase();
          mountEditor(root, { img: r.img, link: r.reduced ? null : { project: p.project, path: p.path }, name: U.basename(p.path).replace(/\.[a-z0-9]+$/i, ''), ext: ext === 'jpeg' ? 'jpg' : ext, note: r.reduced ? t('im_reduced', { n: MAX_SIDE }) : null });
          return root;
        } catch (error) { ui.toast(t('px_open_failed'), 'error'); }
      }
    }
    emptyState(root);
    return root;
  }

  async function leave() {
    if (E && E.dirty && !(await ui.confirm({ title: t('px_discard_q'), message: t('im_leave_body'), okLabel: t('px_discard'), danger: true }))) return false;
    if (E) { E.destroy(); E = null; }
    return true;
  }

  CS.studio.editor('image', { title: () => t('st_image'), render, leave });
  CS.imageEditor = { get E() { return E; } };
})();
