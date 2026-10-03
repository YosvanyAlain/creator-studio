/* Pixel art editor: zoomable canvas, drawing tools, layers, frames and undo. Sheets live in pixel-sheets.js. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, icon, ui } = CS;
  const R = CS.raster;
  const t = (...a) => CS.t(...a);
  const DRAFT = 'wcs3_pixel_draft';
  const UNDO_MAX = 60;
  const TOOLS = [
    { id: 'pen', icon: 'pencil', key: 'b' }, { id: 'eraser', icon: 'eraser', key: 'e' }, { id: 'fill', icon: 'fill', key: 'g' },
    { id: 'picker', icon: 'pipette', key: 'i' }, { id: 'line', icon: 'line', key: 'l' }, { id: 'rect', icon: 'square', key: 'r' },
    { id: 'ellipse', icon: 'circle', key: 'o' }, { id: 'move', icon: 'hand', key: 'm' }
  ];
  const CLEAR = [0, 0, 0, 0];

  /* Editor instance; one at a time. Sheets reach it through CS.pixel.E. */
  let E = null;

  function newState(doc) {
    return {
      doc, f: 0, l: 0, tool: 'pen', prevTool: 'pen', size: 1, filled: false, mirrorX: false, mirrorY: false, wrap: true,
      color: R.hexToRgba('#3626b8'), onion: false, grid: CS.settings.get('pixelGrid') !== false, palette: CS.settings.get('pixelPalette') || 'studio',
      zoom: 8, panX: 0, panY: 0, link: null, name: 'sprite', dirty: false, undo: [], redo: [], playing: 0
    };
  }

  /* ---------- Draft ---------- */
  function saveDraft() {
    if (!E) return;
    const S = E.S;
    try { localStorage.setItem(DRAFT, JSON.stringify({ doc: R.serialize(S.doc), link: S.link, name: S.name, dirty: S.dirty, at: Date.now() })); } catch (error) { /* storage full: the draft is best effort */ }
  }
  function loadDraft() {
    try { const d = JSON.parse(localStorage.getItem(DRAFT) || 'null'); const doc = d && R.deserialize(d.doc); return doc ? Object.assign(d, { doc }) : null; } catch (error) { return null; }
  }

  /* ---------- Loading ---------- */
  async function docFromImage(dataUrl) {
    let img = await R.decodeImage(dataUrl);
    let px = img.data, w = img.w, hh = img.h, reduced = false;
    const s = R.detectScale(px, w, hh);
    if (s > 1) { const d = R.downsample(px, w, hh, s); px = d.data; w = d.w; hh = d.h; }
    if (w > R.MAX || hh > R.MAX) { img = await R.decodeImage(dataUrl, R.MAX); px = img.data; w = img.w; hh = img.h; reduced = true; }
    const doc = R.create(w, hh, { layerName: t('px_layer_n', { n: 1 }) });
    doc.frames[0].cels[0].set(px);
    return { doc, reduced, scale: s };
  }

  async function load(params) {
    if (params.project && params.path) {
      const asset = await CS.studio.readAsset(params.project, params.path);
      if (asset) {
        const draft = loadDraft();
        const link = { project: params.project, path: params.path };
        if (draft && draft.dirty && draft.link && draft.link.project === link.project && draft.link.path === link.path) {
          return { doc: draft.doc, link, name: draft.name, dirty: true, note: t('px_draft_restored') };
        }
        const src = asset.project.studio && asset.project.studio.pixel && asset.project.studio.pixel[params.path];
        const doc = src && src.size === asset.bytes.length ? R.deserialize(src.doc) : null;
        const name = CS.util.basename(params.path).replace(/\.[a-z0-9]+$/i, '');
        if (doc) return { doc, link, name };
        try {
          const r = await docFromImage(asset.dataUrl);
          return { doc: r.doc, link: r.reduced ? null : link, name, note: r.reduced ? t('px_reduced', { n: R.MAX }) : null, exportScale: r.scale };
        } catch (error) { return { doc: R.create(32, 32), note: t('px_open_failed') }; }
      }
    }
    if (params.pixels && params.pixels.data) {
      const px = params.pixels;
      const doc = R.create(px.w, px.h, { layerName: t('px_layer_n', { n: 1 }) });
      doc.frames[0].cels[0].set(px.data.subarray(0, doc.w * doc.h * 4));
      return { doc, name: params.name || 'sprite', dirty: true };
    }
    if (params.fromImage) {
      const r = await docFromImage(params.fromImage);
      return { doc: r.doc, name: params.name || 'sprite', dirty: true };
    }
    const draft = !params.fresh && loadDraft();
    if (draft) return { doc: draft.doc, link: draft.link, name: draft.name, dirty: draft.dirty };
    const doc = R.create(32, 32, { layerName: t('px_layer_n', { n: 1 }) });
    return { doc, name: 'sprite', fresh: true };
  }

  /* ---------- History ---------- */
  function pushUndo(entry) {
    const S = E.S;
    S.undo.push(entry);
    if (S.undo.length > UNDO_MAX) S.undo.shift();
    S.redo.length = 0;
    S.dirty = true;
    E.draftSoon();
    E.updateChrome();
  }
  /* Structural edits: snapshot the whole document first. */
  function commitDoc(fn) {
    const S = E.S;
    const before = R.clone(S.doc);
    const result = fn(S.doc);
    if (result === false) return false;
    pushUndo({ kind: 'doc', doc: before, f: S.f, l: S.l });
    clampSel();
    E.fitIfNeeded(before);
    E.render();
    return true;
  }
  function swap(from, to) {
    const S = E.S;
    const entry = from.pop();
    if (!entry) return;
    if (entry.kind === 'cel') {
      const cels = S.doc.frames[entry.f] && S.doc.frames[entry.f].cels;
      if (!cels) return;
      to.push({ kind: 'cel', f: entry.f, l: entry.l, data: cels[entry.l] });
      cels[entry.l] = entry.data;
      S.f = entry.f; S.l = entry.l;
    } else {
      to.push({ kind: 'doc', doc: S.doc, f: S.f, l: S.l });
      const old = S.doc;
      S.doc = entry.doc; S.f = entry.f; S.l = entry.l;
      E.fitIfNeeded(old);
    }
    clampSel();
    S.dirty = true;
    E.draftSoon();
    E.render();
    E.updateChrome();
  }
  function clampSel() {
    const S = E.S;
    S.f = Math.max(0, Math.min(S.doc.frames.length - 1, S.f));
    S.l = Math.max(0, Math.min(S.doc.layers.length - 1, S.l));
  }

  /* ---------- Editor ---------- */
  function mountEditor(root, init, params) {
    const S = newState(init.doc);
    S.link = init.link || null;
    S.name = init.name || 'sprite';
    S.dirty = !!init.dirty;
    S.exportScale = init.exportScale || 8;

    const canvas = h('canvas', { class: 'px-canvas', width: S.doc.w, height: S.doc.h });
    const board = h('div', { class: 'px-board checker' }, canvas);
    const grid = h('canvas', { class: 'px-grid' });
    const zoomLabel = h('span', { class: 'px-zoom' });
    const playBtn = ui.iconButton('play', t('px_play'), () => togglePlay(), { class: 'px-float-btn' });
    const floats = h('div', { class: 'px-floats' },
      ui.iconButton('fit', t('px_fit'), () => { fit(); }, { class: 'px-float-btn' }),
      ui.iconButton('grid', t('px_grid'), () => { S.grid = !S.grid; CS.settings.set('pixelGrid', S.grid); drawGrid(); updateFloats(); }, { class: 'px-float-btn px-grid-btn' }),
      playBtn, zoomLabel);
    const shadow = h('canvas', { class: 'px-shadow' });
    const stage = h('div', { class: 'px-stage', tabindex: '0' }, shadow, board, grid, floats);
    const ctx = canvas.getContext('2d');
    const swatch = h('button', { type: 'button', class: 'px-current checker', title: t('px_color'), onclick: () => CS.pixelSheets.color(E) }, h('span'));
    const palRow = h('div', { class: 'px-swatches' });
    const palette = h('div', { class: 'px-palette' }, swatch, palRow);
    const opts = h('div', { class: 'px-opts' });
    const toolsRow = h('div', { class: 'px-tools', role: 'toolbar' });
    CS.mount(root, [stage, h('div', { class: 'px-dock' }, palette, opts, toolsRow)]);

    /* ----- view transform ----- */
    function applyTransform() {
      board.style.width = S.doc.w + 'px';
      board.style.height = S.doc.h + 'px';
      board.style.transform = 'translate(' + S.panX + 'px,' + S.panY + 'px) scale(' + S.zoom + ')';
      board.style.setProperty('--px-check', Math.max(1, 8 / S.zoom) + 'px');
      zoomLabel.textContent = Math.round(S.zoom * 100) / 100 + '×';
      drawGrid();
    }
    function fit() {
      const r = stage.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const pad = 24;
      S.zoom = Math.max(1, Math.floor(Math.min((r.width - pad) / S.doc.w, (r.height - pad) / S.doc.h)) || 1);
      S.panX = Math.round((r.width - S.doc.w * S.zoom) / 2);
      S.panY = Math.round((r.height - S.doc.h * S.zoom) / 2);
      applyTransform();
    }
    function fitIfNeeded(old) {
      if (old.w !== S.doc.w || old.h !== S.doc.h) { canvas.width = S.doc.w; canvas.height = S.doc.h; fit(); }
    }
    function zoomAt(z, cx, cy) {
      const nz = Math.max(1, Math.min(64, z));
      const dx = (cx - S.panX) / S.zoom, dy = (cy - S.panY) / S.zoom;
      S.zoom = nz;
      S.panX = cx - dx * nz;
      S.panY = cy - dy * nz;
      applyTransform();
    }
    function drawGrid() {
      const r = stage.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      grid.width = Math.round(r.width * dpr); grid.height = Math.round(r.height * dpr);
      grid.style.width = r.width + 'px'; grid.style.height = r.height + 'px';
      const g = grid.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, r.width, r.height);
      const W = S.doc.w * S.zoom, H = S.doc.h * S.zoom;
      const dark = document.documentElement.classList.contains('dark') || document.documentElement.dataset.theme === 'dark';
      if (S.grid && S.zoom >= 6) {
        g.beginPath();
        for (let x = 1; x < S.doc.w; x++) { const X = Math.round(S.panX + x * S.zoom) + 0.5; g.moveTo(X, S.panY); g.lineTo(X, S.panY + H); }
        for (let y = 1; y < S.doc.h; y++) { const Y = Math.round(S.panY + y * S.zoom) + 0.5; g.moveTo(S.panX, Y); g.lineTo(S.panX + W, Y); }
        g.strokeStyle = dark ? 'rgba(255,255,255,.10)' : 'rgba(20,20,60,.10)';
        g.lineWidth = 1;
        g.stroke();
        /* Stronger lines every 8 pixels help counting. */
        g.beginPath();
        for (let x = 8; x < S.doc.w; x += 8) { const X = Math.round(S.panX + x * S.zoom) + 0.5; g.moveTo(X, S.panY); g.lineTo(X, S.panY + H); }
        for (let y = 8; y < S.doc.h; y += 8) { const Y = Math.round(S.panY + y * S.zoom) + 0.5; g.moveTo(S.panX, Y); g.lineTo(S.panX + W, Y); }
        g.strokeStyle = dark ? 'rgba(255,255,255,.22)' : 'rgba(20,20,60,.22)';
        g.stroke();
      }
      /* Drop shadow lives on its own unscaled canvas below the board. */
      shadow.width = grid.width; shadow.height = grid.height;
      shadow.style.width = grid.style.width; shadow.style.height = grid.style.height;
      const sg = shadow.getContext('2d');
      sg.setTransform(dpr, 0, 0, dpr, 0, 0);
      sg.shadowColor = dark ? 'rgba(0,0,0,.6)' : 'rgba(20,20,60,.32)';
      sg.shadowBlur = 26; sg.shadowOffsetY = 10;
      sg.fillStyle = dark ? '#000' : '#fff';
      sg.fillRect(S.panX, S.panY, W, H);
      g.strokeStyle = dark ? 'rgba(255,255,255,.35)' : 'rgba(20,20,60,.3)';
      g.strokeRect(Math.round(S.panX) - 0.5, Math.round(S.panY) - 0.5, Math.round(W) + 1, Math.round(H) + 1);
    }

    /* ----- rendering ----- */
    let raf = 0;
    function render() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const px = R.composite(S.doc, S.f, { onion: S.onion && !S.playing ? 0.28 : 0 });
        ctx.putImageData(new ImageData(px, S.doc.w, S.doc.h), 0, 0);
      });
    }
    function updateFloats() {
      floats.querySelector('.px-grid-btn').classList.toggle('on', S.grid);
      playBtn.hidden = S.doc.frames.length < 2;
      CS.mount(playBtn, icon(S.playing ? 'pause' : 'play'));
    }
    function togglePlay() {
      if (S.playing) { clearInterval(S.playing); S.playing = 0; S.f = S.playFrom; render(); updateFloats(); return; }
      S.playFrom = S.f;
      S.playing = setInterval(() => {
        S.f = (S.f + 1) % S.doc.frames.length;
        ctx.putImageData(new ImageData(R.composite(S.doc, S.f), S.doc.w, S.doc.h), 0, 0);
      }, 1000 / (S.doc.fps || 8));
      updateFloats();
    }

    /* ----- tools ----- */
    function drawTools() {
      CS.mount(toolsRow, TOOLS.map((tool) => h('button', {
        type: 'button', class: ['px-tool', S.tool === tool.id && 'on'], title: t('px_tool_' + tool.id) + ' (' + tool.key.toUpperCase() + ')',
        'aria-label': t('px_tool_' + tool.id), 'aria-pressed': S.tool === tool.id ? 'true' : 'false', dataset: { tool: tool.id },
        onclick: () => setTool(tool.id)
      }, icon(tool.icon))));
      drawOpts();
    }
    function setTool(id) {
      if (id !== 'picker') S.prevTool = id;
      S.tool = id;
      CS.haptic();
      drawTools();
    }
    function drawOpts() {
      const sized = ['pen', 'eraser', 'line', 'rect', 'ellipse'].includes(S.tool);
      const shape = ['rect', 'ellipse'].includes(S.tool);
      const toggle = (on, ic, label, fn, cls) => h('button', { type: 'button', class: ['px-opt', on && 'on', cls], title: label, 'aria-label': label, 'aria-pressed': on ? 'true' : 'false', onclick: () => { CS.haptic(); fn(); drawOpts(); } }, icon(ic), h('span', {}, label));
      CS.mount(opts, [
        sized ? h('div', { class: 'px-sizes', role: 'group', 'aria-label': t('px_size') }, [1, 2, 3, 4].map((n) => h('button', {
          type: 'button', class: ['px-size', S.size === n && 'on'], title: t('px_size') + ' ' + n, 'aria-label': t('px_size') + ' ' + n,
          onclick: () => { S.size = n; drawOpts(); }
        }, h('span', { class: 'px-dot', style: { width: (3 + n * 3) + 'px', height: (3 + n * 3) + 'px' } })))) : null,
        shape ? toggle(S.filled, 'fill', t('px_filled'), () => { S.filled = !S.filled; }) : null,
        S.tool === 'move' ? toggle(S.wrap, 'refresh', t('px_wrap'), () => { S.wrap = !S.wrap; }) : null,
        S.tool === 'fill' ? h('span', { class: 'px-hint' }, t('px_fill_hint')) : null,
        S.tool === 'picker' ? h('span', { class: 'px-hint' }, t('px_picker_hint')) : null,
        h('span', { class: 'px-opts-gap' }),
        toggle(S.mirrorX, 'flipH', t('px_mirror_x'), () => { S.mirrorX = !S.mirrorX; }, 'px-mirror'),
        toggle(S.mirrorY, 'mirror', t('px_mirror_y'), () => { S.mirrorY = !S.mirrorY; }, 'px-mirror')
      ]);
    }

    /* ----- palette strip ----- */
    function paletteColors() {
      if (S.palette === 'custom') return (CS.settings.get('imagePalette') || []).slice(0, 64);
      if (S.palette === 'image') return R.usedColors(S.doc, 48);
      return R.PALETTES[S.palette] || R.PALETTES.studio;
    }
    function drawPalette() {
      const cur = R.rgbaToHex(...S.color);
      swatch.firstChild.style.background = S.color[3] ? cur : 'transparent';
      swatch.classList.toggle('is-clear', !S.color[3]);
      const colors = paletteColors();
      CS.mount(palRow, [
        h('button', { type: 'button', class: ['px-sw', 'px-sw-clear', 'checker', !S.color[3] && 'on'], title: t('px_transparent'), 'aria-label': t('px_transparent'), onclick: () => setColor(CLEAR) }),
        colors.map((c) => h('button', {
          type: 'button', class: ['px-sw', c.toLowerCase() === cur.toLowerCase() && S.color[3] && 'on'], title: c, 'aria-label': c, style: { background: c },
          onclick: () => setColor(R.hexToRgba(c))
        })),
        colors.length ? null : h('span', { class: 'px-hint' }, t('px_palette_empty'))
      ]);
    }
    function setColor(rgba) {
      S.color = rgba.slice();
      if (S.tool === 'eraser' && rgba[3]) setTool('pen');
      drawPalette();
    }

    /* ----- pointer input ----- */
    const pointers = new Map();
    let stroke = null;
    let pinch = null;
    let panDrag = null;
    const toDoc = (cx, cy) => {
      const r = stage.getBoundingClientRect();
      return [Math.floor((cx - r.left - S.panX) / S.zoom), Math.floor((cy - r.top - S.panY) / S.zoom)];
    };
    const cel = () => S.doc.frames[S.f].cels[S.l];
    function mirrored(x, y) {
      const out = [[x, y]];
      const w = S.doc.w, hh = S.doc.h;
      if (S.mirrorX) out.push([w - 1 - x, y]);
      if (S.mirrorY) out.push([x, hh - 1 - y]);
      if (S.mirrorX && S.mirrorY) out.push([w - 1 - x, hh - 1 - y]);
      return out;
    }
    function plot(points, color, size) {
      const c = cel(), w = S.doc.w, hh = S.doc.h;
      for (const [x, y] of points) for (const [mx, my] of mirrored(x, y)) {
        if (size > 1) R.dab(c, w, hh, mx, my, color, size); else R.set(c, w, hh, mx, my, color);
      }
    }
    function pick(x, y) {
      if (x < 0 || y < 0 || x >= S.doc.w || y >= S.doc.h) return;
      const px = R.composite(S.doc, S.f);
      const i = (y * S.doc.w + x) * 4;
      setColor(px[i + 3] ? [px[i], px[i + 1], px[i + 2], px[i + 3]] : CLEAR);
    }
    function layerHidden() {
      const layer = S.doc.layers[S.l];
      if (layer.visible) return false;
      ui.toast(t('px_layer_hidden'), 'info', { action: { label: t('px_show'), onClick: () => { layer.visible = true; render(); } } });
      return true;
    }
    function begin(e) {
      const [x, y] = toDoc(e.clientX, e.clientY);
      if (S.tool === 'picker') { pick(x, y); stroke = { picker: true }; return; }
      if (layerHidden()) return;
      stroke = { x0: x, y0: y, x, y, snap: new Uint8ClampedArray(cel()), f: S.f, l: S.l };
      if (S.tool === 'fill') {
        if (x >= 0 && y >= 0 && x < S.doc.w && y < S.doc.h) for (const [mx, my] of mirrored(x, y)) R.fill(cel(), S.doc.w, S.doc.h, mx, my, S.color);
      } else if (S.tool === 'pen' || S.tool === 'eraser') {
        plot([[x, y]], S.tool === 'eraser' ? CLEAR : S.color, S.size);
      } else move(e);
      render();
    }
    function move(e) {
      if (!stroke) return;
      const [x, y] = toDoc(e.clientX, e.clientY);
      if (stroke.picker) { pick(x, y); return; }
      if (S.tool === 'pen' || S.tool === 'eraser') {
        if (x === stroke.x && y === stroke.y) return;
        plot(R.linePoints(stroke.x, stroke.y, x, y), S.tool === 'eraser' ? CLEAR : S.color, S.size);
      } else if (['line', 'rect', 'ellipse'].includes(S.tool)) {
        cel().set(stroke.snap);
        const pts = S.tool === 'line' ? R.linePoints(stroke.x0, stroke.y0, x, y)
          : S.tool === 'rect' ? R.rectPoints(stroke.x0, stroke.y0, x, y, S.filled) : R.ellipsePoints(stroke.x0, stroke.y0, x, y, S.filled);
        plot(pts, S.color, S.filled && S.tool !== 'line' ? 1 : S.size);
      } else if (S.tool === 'move') {
        S.doc.frames[S.f].cels[S.l] = R.shiftCel(stroke.snap, S.doc.w, S.doc.h, x - stroke.x0, y - stroke.y0, S.wrap);
      } else return;
      stroke.x = x; stroke.y = y;
      render();
    }
    function end(cancel) {
      if (!stroke) return;
      const s = stroke;
      stroke = null;
      if (s.picker) { if (!cancel) setTool(S.prevTool === 'eraser' ? 'pen' : S.prevTool); return; }
      if (cancel) { S.doc.frames[s.f].cels[s.l] = s.snap; render(); return; }
      const now = cel();
      let changed = false;
      for (let i = 0; i < now.length; i++) if (now[i] !== s.snap[i]) { changed = true; break; }
      if (changed) pushUndo({ kind: 'cel', f: s.f, l: s.l, data: s.snap });
      if (S.palette === 'image') drawPalette();
    }
    stage.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.px-floats')) return;
      if (S.playing) togglePlay();
      stage.focus({ preventScroll: true });
      try { stage.setPointerCapture(e.pointerId); } catch (error) { /* synthetic or released pointer */ }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (e.button === 1 || e.button === 2 || (e.button === 0 && e.altKey)) { panDrag = { x: e.clientX, y: e.clientY, px: S.panX, py: S.panY }; e.preventDefault(); return; }
      if (pointers.size === 1) begin(e);
      else if (pointers.size === 2) {
        end(true);
        const [a, b] = [...pointers.values()];
        const r = stage.getBoundingClientRect();
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2 - r.left, my: (a.y + b.y) / 2 - r.top, z: S.zoom, px: S.panX, py: S.panY };
      }
    });
    stage.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (panDrag) { S.panX = panDrag.px + e.clientX - panDrag.x; S.panY = panDrag.py + e.clientY - panDrag.y; applyTransform(); return; }
      if (pinch && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const r = stage.getBoundingClientRect();
        const mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top;
        const z = Math.max(1, Math.min(64, pinch.z * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.d)));
        const dx = (pinch.mx - pinch.px) / pinch.z, dy = (pinch.my - pinch.py) / pinch.z;
        S.zoom = z; S.panX = mx - dx * z; S.panY = my - dy * z;
        applyTransform();
        return;
      }
      if (!pinch) {
        const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
        for (const ev of events.length ? events : [e]) move(ev);
      }
    });
    const up = (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (panDrag) { panDrag = null; return; }
      if (pinch) { if (pointers.size === 0) pinch = null; return; }
      end(e.type === 'pointercancel');
    };
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    stage.addEventListener('contextmenu', (e) => e.preventDefault());
    stage.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      const dy = e.deltaY * (e.deltaMode === 1 ? 33 : 1);
      if (e.ctrlKey || e.metaKey || (Math.abs(dy) > 40 && !e.deltaX && !e.shiftKey)) {
        zoomAt(S.zoom * Math.pow(1.0018, -dy * (e.ctrlKey ? 4 : 1)), e.clientX - r.left, e.clientY - r.top);
      } else { S.panX -= e.deltaX; S.panY -= e.deltaY; applyTransform(); }
    }, { passive: false });
    stage.addEventListener('keydown', (e) => {
      if (e.target !== stage) return;
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); swap(e.shiftKey ? S.redo : S.undo, e.shiftKey ? S.undo : S.redo); return; }
      if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); swap(S.redo, S.undo); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tool = TOOLS.find((x) => x.key === k);
      if (tool) { setTool(tool.id); return; }
      if (k === '[' || k === ']') { S.size = Math.max(1, Math.min(4, S.size + (k === ']' ? 1 : -1))); drawOpts(); return; }
      if (k === '+' || k === '=') { const r = stage.getBoundingClientRect(); zoomAt(S.zoom * 1.25, r.width / 2, r.height / 2); return; }
      if (k === '-') { const r = stage.getBoundingClientRect(); zoomAt(S.zoom / 1.25, r.width / 2, r.height / 2); return; }
      if (k === '0') { fit(); return; }
      if (k === ',' || k === '.') { S.f = (S.f + (k === '.' ? 1 : S.doc.frames.length - 1)) % S.doc.frames.length; render(); updateChrome(); }
    });
    const ro = new ResizeObserver(() => fit());
    ro.observe(stage);

    /* ----- chrome ----- */
    let draftTimer = 0;
    function draftSoon() { clearTimeout(draftTimer); draftTimer = setTimeout(saveDraft, 1200); }
    function updateChrome() {
      const S2 = S;
      const frames = S2.doc.frames.length, layers = S2.doc.layers.length;
      CS.app.setChrome({
        title: S2.name + (S2.dirty ? ' •' : ''),
        subtitle: S2.doc.w + '×' + S2.doc.h + (frames > 1 ? ' · ' + t('px_frame_of', { n: S2.f + 1, total: frames }) : '') + (layers > 1 ? ' · ' + t('px_layer_of', { n: S2.l + 1, total: layers }) : ''),
        actions: [
          ui.iconButton('undo', t('undo'), () => swap(S2.undo, S2.redo), { disabled: !S2.undo.length, class: 'px-undo' }),
          ui.iconButton('redo', t('redo'), () => swap(S2.redo, S2.undo), { disabled: !S2.redo.length, class: 'px-redo' }),
          ui.iconButton('layers', t('px_layers_frames'), () => CS.pixelSheets.layers(E), { class: 'px-layers-btn' }),
          ui.iconButton('moreV', t('more'), () => CS.pixelSheets.menu(E), { class: 'px-more' })
        ]
      });
      updateFloats();
    }

    function replaceDoc(doc, opts) {
      const o = opts || {};
      S.doc = doc; S.f = 0; S.l = 0; S.undo = []; S.redo = [];
      S.link = o.link || null; S.name = o.name || S.name; S.dirty = !!o.dirty;
      canvas.width = doc.w; canvas.height = doc.h;
      fit(); render(); drawPalette(); updateChrome(); saveDraft();
    }

    E = {
      S, R, render, commitDoc, pushUndo, swap, setColor, setTool, drawPalette, draftSoon, updateChrome, fit, fitIfNeeded, replaceDoc, saveDraft,
      select(f, l) { if (f != null) S.f = f; if (l != null) S.l = l; clampSel(); render(); updateChrome(); },
      togglePlay, canvas, stage,
      destroy() { ro.disconnect(); clearTimeout(draftTimer); if (S.playing) togglePlay(); saveDraft(); }
    };
    drawTools();
    drawPalette();
    requestAnimationFrame(() => { fit(); render(); updateChrome(); });
    if (init.note) ui.toast(init.note, 'info');
    return E;
  }

  async function render(params, ctx) {
    const root = h('div', { class: 'px' }, h('div', { class: 'st-loading' }, t('st_loading')));
    const init = await load(params || {});
    if (!ctx.alive()) return root;
    mountEditor(root, init, params || {});
    return root;
  }

  async function leave() {
    if (E) { E.destroy(); E = null; }
    return true;
  }

  CS.studio.editor('pixel', { title: () => t('st_pixel'), render, leave });
  CS.pixel = { get E() { return E; }, docFromImage, loadDraft, DRAFT };
})();
