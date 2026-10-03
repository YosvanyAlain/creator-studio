/* Pixel editor sheets: color, layers and frames, menu, new sprite, canvas size, export and save. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, icon, ui } = CS;
  const R = CS.raster;
  const U = CS.util;
  const t = (...a) => CS.t(...a);
  const PALETTE_IDS = ['studio', 'pico8', 'sweetie', 'gameboy', 'gray', 'custom', 'image'];
  const SIZES = [16, 24, 32, 48, 64, 96, 128];

  function thumb(px, w, hh, size) {
    const s = Math.max(1, Math.floor((size || 48) / Math.max(w, hh)));
    const c = R.toCanvas(px, w, hh, s);
    c.className = 'px-thumb checker';
    return c;
  }
  const frameThumb = (doc, i) => thumb(R.composite(doc, i), doc.w, doc.h, 52);

  /* ---------- Color ---------- */
  function color(E) {
    const S = E.S;
    let pal = S.palette;
    let editing = false;
    const big = h('span', { class: 'pxc-big checker' }, h('span'));
    const hex = ui.input({ value: R.rgbaToHex(S.color[0], S.color[1], S.color[2]), mono: true, max: 7, onChange: (v) => { if (/^#?[0-9a-f]{6}$/i.test(v.trim())) set(R.hexToRgba((v.trim()[0] === '#' ? '' : '#') + v.trim()).slice(0, 3).concat([S.color[3] || 255])); } });
    const native = h('input', { type: 'color', class: 'pxc-native', value: R.rgbaToHex(S.color[0], S.color[1], S.color[2]), oninput: (e) => set(R.hexToRgba(e.target.value).slice(0, 3).concat([S.color[3] || 255])) });
    const alpha = h('input', { type: 'range', class: 'pxc-alpha', min: '0', max: '255', value: String(S.color[3]), oninput: (e) => set(S.color.slice(0, 3).concat([+e.target.value]), true) });
    const alphaLabel = h('span', { class: 'pxc-alpha-val' });
    const grid = h('div', { class: 'pxc-grid' });
    const palSel = ui.select(PALETTE_IDS.map((id) => ({ value: id, label: t('px_pal_' + id) })), pal, (v) => { pal = v; S.palette = v; CS.settings.set('pixelPalette', v); editing = false; drawGrid(); E.drawPalette(); });

    function set(rgba, fromAlpha) {
      E.setColor(rgba);
      draw(fromAlpha);
    }
    function draw(fromAlpha) {
      const c = R.rgbaToHex(S.color[0], S.color[1], S.color[2]);
      big.firstChild.style.background = S.color[3] ? R.rgbaToHex(...S.color) : 'transparent';
      if (document.activeElement !== hex) hex.value = c;
      native.value = c;
      if (!fromAlpha) alpha.value = String(S.color[3]);
      alphaLabel.textContent = Math.round((S.color[3] / 255) * 100) + '%';
      drawGrid();
    }
    function colors() {
      if (pal === 'custom') return (CS.settings.get('imagePalette') || []).slice();
      if (pal === 'image') return R.usedColors(S.doc, 96);
      return R.PALETTES[pal].slice();
    }
    function drawGrid() {
      const cur = R.rgbaToHex(...S.color).toLowerCase();
      const list = colors();
      CS.mount(grid, [
        list.map((c) => h('button', {
          type: 'button', class: ['pxc-sw', c.toLowerCase() === cur && 'on', editing && 'editing'], style: { background: c }, title: c, 'aria-label': c,
          onclick: () => {
            if (editing) { CS.settings.set('imagePalette', list.filter((x) => x !== c)); drawGrid(); E.drawPalette(); return; }
            set(R.hexToRgba(c));
          }
        }, editing ? icon('close') : null)),
        pal === 'custom' ? h('button', { type: 'button', class: 'pxc-sw pxc-add', title: t('px_add_color'), 'aria-label': t('px_add_color'), onclick: () => {
          const c = R.rgbaToHex(...S.color);
          if (!S.color[3] || list.includes(c)) return;
          CS.settings.set('imagePalette', list.concat([c]).slice(-64));
          drawGrid(); E.drawPalette();
        } }, icon('plus')) : null,
        !list.length && pal !== 'custom' ? h('div', { class: 'px-hint' }, t('px_palette_empty')) : null
      ]);
    }
    ui.sheet({
      title: t('px_color'), size: 'tall', class: 'pxc-sheet',
      body: [
        h('div', { class: 'pxc-top' }, big, h('div', { class: 'pxc-fields' },
          h('div', { class: 'pxc-hexrow' }, hex, h('label', { class: 'pxc-native-wrap', title: t('px_more_colors') }, icon('palette'), native)),
          h('div', { class: 'pxc-alpharow' }, h('span', {}, t('px_opacity')), alpha, alphaLabel))),
        h('div', { class: 'pxc-palhead' }, palSel,
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm', hidden: false, onclick: (e) => {
            if (pal !== 'custom') return;
            editing = !editing; e.currentTarget.classList.toggle('on', editing); drawGrid();
          } }, icon('edit'))),
        grid,
        h('div', { class: 'pxc-actions' },
          ui.button({ label: t('px_replace_color'), icon: 'replace', variant: 'tonal', size: 'sm', onClick: () => replaceColor(E) }))
      ]
    });
    draw();
  }

  /* Replace one color with the current one on every frame and layer. */
  async function replaceColor(E) {
    const S = E.S;
    const used = R.usedColors(S.doc, 48);
    if (!used.length) { ui.toast(t('px_palette_empty'), 'info'); return; }
    const handle = ui.sheet({
      title: t('px_replace_color'), subtitle: t('px_replace_sub'), size: 'dialog',
      body: h('div', { class: 'pxc-grid' }, used.map((c) => h('button', {
        type: 'button', class: 'pxc-sw', style: { background: c }, title: c, 'aria-label': c,
        onclick: () => {
          handle.close();
          const from = R.hexToRgba(c), to = S.color.slice();
          E.commitDoc((doc) => { doc.frames.forEach((f) => f.cels.forEach((cel) => R.replaceColor(cel, from, to))); });
          E.drawPalette();
        }
      })))
    });
  }

  /* ---------- Layers and frames ---------- */
  function layers(E) {
    const S = E.S;
    const body = h('div', { class: 'pxl' });
    const handle = ui.sheet({ title: t('px_layers_frames'), size: 'tall', class: 'pxl-sheet', body, onClose: () => E.updateChrome() });
    const act = (ic, label, fn, disabled) => ui.iconButton(ic, label, () => { fn(); draw(); }, { disabled: !!disabled, variant: 'tonal', size: 'sm' });
    function draw() {
      const doc = S.doc;
      const frames = h('div', { class: 'pxl-frames hscroll' }, doc.frames.map((_, i) => h('button', {
        type: 'button', class: ['pxl-frame', i === S.f && 'on'], 'aria-label': t('px_frame_n', { n: i + 1 }),
        onclick: () => { E.select(i, null); draw(); }
      }, frameThumb(doc, i), h('span', {}, String(i + 1)))));
      const layerRows = doc.layers.map((layer, i) => ({ layer, i })).reverse().map(({ layer, i }) => h('div', { class: ['pxl-layer', i === S.l && 'on'] },
        h('button', { type: 'button', class: 'pxl-layer-main', onclick: () => { E.select(null, i); draw(); } },
          thumb(doc.frames[S.f].cels[i], doc.w, doc.h, 40),
          h('span', { class: 'pxl-layer-name' }, layer.name),
          layer.opacity < 1 ? h('span', { class: 'pxl-layer-op' }, Math.round(layer.opacity * 100) + '%') : null),
        ui.iconButton(layer.visible ? 'eye' : 'eyeOff', layer.visible ? t('px_hide') : t('px_show'), () => { layer.visible = !layer.visible; S.dirty = true; E.render(); E.draftSoon(); draw(); }, { class: ['pxl-eye', !layer.visible && 'off'] })));
      CS.mount(body, [
        h('div', { class: 'pxl-head' }, h('h3', {}, t('px_frames')), h('div', { class: 'pxl-acts' },
          act('plus', t('px_frame_add'), () => E.commitDoc((d) => { R.addFrame(d, S.f + 1); S.f++; })),
          act('copy', t('px_frame_dup'), () => E.commitDoc((d) => { R.addFrame(d, S.f + 1, S.f); S.f++; })),
          act('arrowLeft', t('px_move_left'), () => E.commitDoc((d) => { if (!R.moveFrame(d, S.f, S.f - 1)) return false; S.f--; }), S.f === 0),
          act('arrowRight', t('px_move_right'), () => E.commitDoc((d) => { if (!R.moveFrame(d, S.f, S.f + 1)) return false; S.f++; }), S.f >= doc.frames.length - 1),
          act('trash', t('px_frame_del'), () => E.commitDoc((d) => R.removeFrame(d, S.f)), doc.frames.length < 2))),
        frames,
        h('div', { class: 'pxl-anim' },
          ui.toggle(S.onion, (v) => { S.onion = v; E.render(); }, t('px_onion')),
          h('label', { class: 'pxl-fps' }, h('span', {}, t('px_fps')),
            h('input', { type: 'range', min: '1', max: '24', value: String(doc.fps), oninput: (e) => { doc.fps = +e.target.value; e.target.nextSibling.textContent = e.target.value; S.dirty = true; } }),
            h('b', {}, String(doc.fps))),
          doc.frames.length > 1 ? ui.button({ label: S.playing ? t('st_stop') : t('px_play'), icon: S.playing ? 'pause' : 'play', size: 'sm', variant: 'tonal', onClick: () => { E.togglePlay(); draw(); } }) : null),
        h('div', { class: 'pxl-head' }, h('h3', {}, t('px_layers')), h('div', { class: 'pxl-acts' },
          act('plus', t('px_layer_add'), () => E.commitDoc((d) => { R.addLayer(d, S.l + 1, t('px_layer_n', { n: d.layers.length + 1 })); S.l++; }), doc.layers.length >= 8),
          act('arrowUp', t('px_move_up'), () => E.commitDoc((d) => { if (!R.moveLayer(d, S.l, S.l + 1)) return false; S.l++; }), S.l >= doc.layers.length - 1),
          act('arrowDown', t('px_move_down'), () => E.commitDoc((d) => { if (!R.moveLayer(d, S.l, S.l - 1)) return false; S.l--; }), S.l === 0),
          act('collapse', t('px_merge_down'), () => E.commitDoc((d) => { if (!R.mergeDown(d, S.l)) return false; S.l--; }), S.l === 0),
          act('trash', t('px_layer_del'), () => E.commitDoc((d) => R.removeLayer(d, S.l)), doc.layers.length < 2))),
        h('div', { class: 'pxl-layers' }, layerRows),
        h('div', { class: 'pxl-layer-opts' },
          ui.button({ label: t('rename'), icon: 'type', size: 'sm', variant: 'ghost', onClick: async () => {
            const name = await ui.prompt({ title: t('rename'), value: doc.layers[S.l].name });
            if (name && name.trim()) { doc.layers[S.l].name = name.trim().slice(0, 24); S.dirty = true; draw(); }
          } }),
          h('label', { class: 'pxl-fps' }, h('span', {}, t('px_opacity')),
            h('input', { type: 'range', min: '10', max: '100', value: String(Math.round(doc.layers[S.l].opacity * 100)), oninput: (e) => { doc.layers[S.l].opacity = +e.target.value / 100; e.target.nextSibling.textContent = e.target.value + '%'; S.dirty = true; E.render(); } }),
            h('b', {}, Math.round(doc.layers[S.l].opacity * 100) + '%')))
      ]);
    }
    draw();
    return handle;
  }

  /* ---------- Menu ---------- */
  function menu(E) {
    const S = E.S;
    ui.menu({ title: S.name, subtitle: S.doc.w + '×' + S.doc.h + ' · ' + t('px_n_colors', { n: R.usedColors(S.doc, 256).length }), items: [
      { icon: 'save', label: S.link ? t('st_save') : t('st_save_project'), sub: S.link ? S.link.path : null, onClick: () => save(E, false) },
      S.link ? { icon: 'filePlus', label: t('st_save_as'), onClick: () => save(E, true) } : null,
      { icon: 'export', label: t('px_export'), sub: t('px_export_sub'), onClick: () => exportSheet(E) },
      '-',
      { icon: 'plus', label: t('px_new'), onClick: () => newDoc(E) },
      { icon: 'folderOpen', label: t('px_open'), sub: t('px_open_sub'), onClick: () => openImage(E) },
      '-',
      { icon: 'ruler', label: t('px_canvas_size'), onClick: () => canvasSize(E) },
      { icon: 'flipH', label: t('px_flip_h'), onClick: () => E.commitDoc((d) => R.flip(d, true)) },
      { icon: 'mirror', label: t('px_flip_v'), onClick: () => E.commitDoc((d) => R.flip(d, false)) },
      { icon: 'rotate', label: t('px_rotate'), onClick: () => E.commitDoc((d) => R.rotate(d, true)) },
      { icon: 'trash', label: t('px_clear_layer'), danger: true, onClick: () => E.commitDoc((d) => { d.frames[S.f].cels[S.l] = R.blank(d.w, d.h); }) }
    ] });
  }

  async function confirmDiscard(E) {
    if (!E.S.dirty) return true;
    return ui.confirm({ title: t('px_discard_q'), message: t('px_discard_body'), okLabel: t('px_discard'), danger: true });
  }

  function newDoc(E) {
    let w = 32, hh = 32;
    const wIn = ui.input({ type: 'number', value: w, min: 1, inputmode: 'numeric', onInput: (v) => { w = +v; } });
    const hIn = ui.input({ type: 'number', value: hh, min: 1, inputmode: 'numeric', onInput: (v) => { hh = +v; } });
    const create = async (cw, ch) => {
      const W = Math.max(1, Math.min(R.MAX, cw | 0)), H = Math.max(1, Math.min(R.MAX, ch | 0));
      if (!(await confirmDiscard(E))) return;
      handle.close();
      E.replaceDoc(R.create(W, H, { layerName: t('px_layer_n', { n: 1 }), fps: 8 }), { name: 'sprite' });
    };
    const handle = ui.sheet({
      title: t('px_new'), subtitle: t('px_new_sub', { n: R.MAX }), size: 'dialog',
      body: [
        h('div', { class: 'pxn-sizes' }, SIZES.map((s) => h('button', { type: 'button', class: 'pxn-size', onclick: () => create(s, s) },
          h('span', { class: 'pxn-box', style: { width: (12 + s / 4) + 'px', height: (12 + s / 4) + 'px' } }), h('b', {}, s + '×' + s)))),
        h('div', { class: 'pxn-custom' }, ui.field(t('px_width'), wIn), h('span', { class: 'pxn-x' }, '×'), ui.field(t('px_height'), hIn))
      ],
      actions: [ui.button({ label: t('px_create'), variant: 'primary', onClick: () => create(w, hh) })]
    });
  }

  async function openImage(E) {
    const asset = await CS.studio.pickAsset({ kind: 'image' });
    if (!asset) return;
    if (!(await confirmDiscard(E))) return;
    try {
      if (asset.project) {
        const params = { project: asset.project.id, path: asset.path };
        await CS.router.go('studio-pixel', params, { replace: true });
        return;
      }
      const r = await CS.pixel.docFromImage(asset.dataUrl);
      E.replaceDoc(r.doc, { name: (asset.name || 'sprite').replace(/\.[a-z0-9]+$/i, ''), dirty: true });
      if (r.reduced) ui.toast(t('px_reduced', { n: R.MAX }), 'info');
    } catch (error) { ui.toast(t('px_open_failed'), 'error'); }
  }

  function canvasSize(E) {
    const S = E.S;
    let w = S.doc.w, hh = S.doc.h, mode = 'canvas', ax = 0.5, ay = 0.5;
    const anchors = h('div', { class: 'pxs-anchor' });
    const drawAnchors = () => CS.mount(anchors, [0, 0.5, 1].map((y) => [0, 0.5, 1].map((x) => h('button', {
      type: 'button', class: ['pxs-a', x === ax && y === ay && 'on'], 'aria-label': x + ',' + y, onclick: () => { ax = x; ay = y; drawAnchors(); }
    }))));
    drawAnchors();
    const anchorField = ui.field(t('px_anchor'), anchors);
    const handle = ui.sheet({
      title: t('px_canvas_size'), size: 'dialog',
      body: [
        ui.segmented([{ value: 'canvas', label: t('px_mode_canvas') }, { value: 'scale', label: t('px_mode_scale') }], mode, (v) => { mode = v; anchorField.hidden = v === 'scale'; }),
        h('div', { class: 'pxn-custom' },
          ui.field(t('px_width'), ui.input({ type: 'number', value: w, min: 1, inputmode: 'numeric', onInput: (v) => { w = +v; } })), h('span', { class: 'pxn-x' }, '×'),
          ui.field(t('px_height'), ui.input({ type: 'number', value: hh, min: 1, inputmode: 'numeric', onInput: (v) => { hh = +v; } }))),
        anchorField,
        h('p', { class: 'px-hint' }, t('px_new_sub', { n: R.MAX }))
      ],
      actions: [ui.button({ label: t('st_apply'), variant: 'primary', onClick: () => {
        handle.close();
        E.commitDoc((d) => { if (mode === 'scale') R.scaleDoc(d, w, hh); else R.resizeCanvas(d, w, hh, ax, ay); });
      } })]
    });
  }

  /* ---------- Encoding ---------- */
  function encode(doc, type, scale) {
    const n = doc.frames.length;
    if (type === 'gif') {
      const bytes = R.encodeGif(doc.frames.map((_, i) => R.composite(doc, i)), doc.w, doc.h, { scale, delay: Math.round(100 / (doc.fps || 8)) });
      return Promise.resolve({ bytes, mime: 'image/gif', w: doc.w * scale, h: doc.h * scale });
    }
    let px = R.composite(doc, 0), W = doc.w;
    if (type === 'sheet' && n > 1) {
      W = doc.w * n;
      px = new Uint8ClampedArray(W * doc.h * 4);
      for (let i = 0; i < n; i++) {
        const f = R.composite(doc, i);
        for (let y = 0; y < doc.h; y++) px.set(f.subarray(y * doc.w * 4, (y + 1) * doc.w * 4), (y * W + i * doc.w) * 4);
      }
    }
    return R.canvasBytes(R.toCanvas(px, W, doc.h, scale), 'image/png').then((bytes) => ({ bytes, mime: 'image/png', w: W * scale, h: doc.h * scale }));
  }
  const maxScale = (doc, type) => Math.max(1, Math.floor(4096 / ((type === 'sheet' ? doc.frames.length : 1) * Math.max(doc.w, doc.h))));

  function exportSheet(E) {
    const doc = E.S.doc;
    const multi = doc.frames.length > 1;
    let type = multi ? 'gif' : 'png';
    let scale = Math.min(8, maxScale(doc, type));
    const preview = h('div', { class: 'pxe-preview checker' });
    const info = h('div', { class: 'pxe-info' });
    const scales = h('div', { class: 'pxe-scales' });
    let last = null;
    const refresh = async () => {
      scale = Math.min(scale, maxScale(doc, type));
      CS.mount(scales, [1, 2, 4, 8, 16].filter((s) => s <= maxScale(doc, type)).map((s) => ui.chip(s + '×', { active: s === scale, onClick: () => { scale = s; refresh(); } })));
      last = await encode(doc, type, scale);
      const url = U.bytesToDataUrl(last.bytes, last.mime);
      CS.mount(preview, h('img', { src: url, alt: '', class: 'px-crisp' }));
      info.textContent = last.w + '×' + last.h + ' · ' + U.bytes(last.bytes.length);
    };
    const fileName = () => U.slug(E.S.name, 'sprite') + (type === 'sheet' ? '-sheet' : '') + (scale > 1 ? '@' + scale + 'x' : '') + '.' + (type === 'gif' ? 'gif' : 'png');
    const canChat = window.webxdc && typeof window.webxdc.sendToChat === 'function';
    ui.sheet({
      title: t('px_export'), size: 'tall',
      body: [
        ui.segmented([{ value: 'png', label: t('px_exp_png') }].concat(multi ? [{ value: 'sheet', label: t('px_exp_sheet') }, { value: 'gif', label: 'GIF' }] : []), type, (v) => { type = v; refresh(); }),
        preview, info,
        ui.field(t('px_scale'), scales),
        h('p', { class: 'px-hint' }, t('px_exp_hint'))
      ],
      actions: [
        canChat ? ui.button({ label: t('st_share_chat'), icon: 'send', variant: 'ghost', onClick: async () => { if (last) await CS.common.deliver(new Blob([last.bytes], { type: last.mime }), fileName(), { chat: true, type: 'image' }); } }) : null,
        ui.button({ label: t('st_download'), icon: 'download', variant: 'primary', onClick: async () => { if (last) await CS.common.deliver(new Blob([last.bytes], { type: last.mime }), fileName()); } })
      ]
    });
    refresh();
  }

  /* ---------- Save ---------- */
  function sourceOf(p, path) { return p.studio && p.studio.pixel && p.studio.pixel[path]; }
  function storeSource(p, path, doc, bytes, scale) {
    if (!p.studio || typeof p.studio !== 'object') p.studio = {};
    if (!p.studio.pixel || typeof p.studio.pixel !== 'object') p.studio.pixel = {};
    p.studio.pixel[path] = { doc: R.serialize(doc), size: bytes.length, scale };
  }

  async function save(E, as) {
    const S = E.S;
    const multi = S.doc.frames.length > 1;
    let scale = CS.settings.get('pixelSaveScale') || 4;
    if (S.link && !as) {
      try {
        const p = await CS.studio.loadProject(S.link.project);
        if (p) {
          const prev = sourceOf(p, S.link.path);
          const isGif = /\.gif$/i.test(S.link.path);
          const sc = Math.min(prev && prev.scale ? prev.scale : scale, maxScale(S.doc, multi && !isGif ? 'sheet' : 'png'));
          const out = await encode(S.doc, isGif ? 'gif' : 'sheet', sc);
          await CS.studio.writeAsset(S.link.project, S.link.path, out.bytes, out.mime, (proj, path) => storeSource(proj, path, S.doc, out.bytes, sc));
          S.dirty = false; E.updateChrome(); E.saveDraft();
          ui.toast(t('st_saved_in', { name: p.name }), 'ok');
          return;
        }
      } catch (error) { ui.toast(CS.common.errorText(error), 'error'); return; }
    }
    const scaleBox = h('div', { class: 'pxe-scales' });
    const drawScales = () => CS.mount(scaleBox, [1, 2, 4, 8].map((s) => ui.chip(s + '×', { active: s === scale, onClick: () => { scale = s; CS.settings.set('pixelSaveScale', s); drawScales(); } })));
    drawScales();
    const res = await CS.studio.saveSheet({
      tool: 'pixel', kind: 'image', name: S.name, ext: multi ? 'png' : 'png', exts: multi ? ['png', 'gif'] : ['png'],
      project: S.link ? S.link.project : (CS.projects.current && CS.projects.current.id), path: as ? null : (S.link && S.link.path),
      extra: h('div', {}, ui.field(t('px_scale'), scaleBox), h('p', { class: 'px-hint' }, multi ? t('px_save_hint_anim') : t('px_save_hint'))),
      encode: async (ext) => { const out = await encode(S.doc, ext === 'gif' ? 'gif' : 'sheet', Math.min(scale, maxScale(S.doc, 'sheet'))); save.lastBytes = out.bytes; return out; },
      mutate: (p, path) => storeSource(p, path, S.doc, save.lastBytes, Math.min(scale, maxScale(S.doc, 'sheet')))
    });
    if (res) {
      S.link = res;
      S.name = U.basename(res.path).replace(/\.[a-z0-9]+$/i, '');
      S.dirty = false;
      E.updateChrome();
      E.saveDraft();
    }
  }

  CS.pixelSheets = { color, layers, menu, newDoc, canvasSize, exportSheet, save, encode, replaceColor };
})();
