/* =========================================================================
 * Webxdc Creator Studio — image-editor.js
 * Pixel-art / PNG image editor for project assets.
 * ========================================================================= */
'use strict';
(function () {
  const CS = (globalThis.CS = globalThis.CS || {});
  const U = CS.util;

  function t(key, params) { return CS.i18n.t(key, params); }

  const PALETTE = ['#000000', '#ffffff', '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c', '#3498db',
    '#9b59b6', '#ecf0f1', '#95a5a6', '#7f8c8d', '#34495e', '#2c3e50', '#f5cba7', '#6e2c00'];

  /* ------------------------------------------------------------------ *
   * Utilidad pura (testeable en Node): cadena de filtro CSS canvas
   * ------------------------------------------------------------------ */
  function filterString(o) {
    const parts = [];
    if (o.brightness !== undefined && Number(o.brightness) !== 100) parts.push('brightness(' + num(o.brightness, 100) + '%)');
    if (o.contrast !== undefined && Number(o.contrast) !== 100) parts.push('contrast(' + num(o.contrast, 100) + '%)');
    if (o.saturate !== undefined && Number(o.saturate) !== 100) parts.push('saturate(' + num(o.saturate, 100) + '%)');
    if (o.gray) parts.push('grayscale(1)');
    if (o.sepia) parts.push('sepia(1)');
    if (o.invert) parts.push('invert(1)');
    return parts.length ? parts.join(' ') : 'none';
  }

  function num(v, d) { const n = Number(v); return isFinite(n) ? n : d; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* (D+): persisted custom colors (max 12) */
  function customColors() {
    try {
      const v = CS.settings.get('imagePalette');
      return Array.isArray(v) ? v.slice(0, 12) : [];
    } catch (e) { return []; }
  }

  function colorAt(i) {
    if (i < PALETTE.length) return PALETTE[i];
    return customColors()[i - PALETTE.length] || '#000000';
  }

  function paletteLen() { return PALETTE.length + customColors().length; }

  /* Photo → pixel-art. Pure and testable: receives RGBA pixels from an image
   * already scaled to size×size and returns the palette index grid. */
  function quantizeToPalette(px, size, colors) {
    /* Contract: colors[k-1] is the color for grid index k (index 0 is TRANSPARENT
   * in pixel-art; PALETTE[0] black is out of play by design). */
    const pal = [''].concat(colors || PALETTE.slice(1));
    const dist = (a, r, g, b) => {
      const pr = parseInt(a.slice(1, 3), 16), pg = parseInt(a.slice(3, 5), 16), pb = parseInt(a.slice(5, 7), 16);
      return Math.abs(pr - r) + Math.abs(pg - g) + Math.abs(pb - b);
    };
    const out = new Array(size * size).fill(0);
    for (let i = 0; i < size * size; i++) {
      const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2], a = px[i * 4 + 3];
      if (a < 40) continue;                     /* transparente de origen */
      let best = 1, bd = Infinity;
      for (let k = 1; k < pal.length; k++) {
        const d = dist(pal[k], r, g, b);
        if (d < bd) { bd = d; best = k; }
      }
      out[i] = bd <= 240 ? best : 0;            /* demasiado lejos → transparente */
    }
    return out;
  }

  /* ------------------------------------------------------------------ *
   * Estado y apertura
   * ------------------------------------------------------------------ */
  let st = null;

  function open() {
    const p = CS.projects.current;
    if (!p) { CS.app.toast(t('blocks_no_project'), 'error'); return; }
    st = {
      tab: 'icon',
      size: 16,
      grid: new Array(16 * 16).fill(0),
      color: 2,               /* palette index; 1 = white, 0 = transparent/eraser */
      scale: 12,
      tool: 'pen',            /* (D+): pen | eraser | fill | pick */
      brush: 1,               /* grosor 1/2/3 */
      exportScale: 8,         /* 2/4/8/16 */
      showGrid: false,        /* rejilla de ayuda */
      undo: [],               /* historial de rejillas */
      srcPath: '',
      img: null,
      filters: { brightness: 100, contrast: 100, saturate: 100, gray: false, sepia: false, invert: false },
      crop: { x: 0, y: 0, w: 0, h: 0 }
    };
    const body = U.el('div', { class: 'image-editor' });
    buildUI(body);
    CS.app.modal({
      title: t('image_editor_title'),
      icon: 'palette',
      body: body,
      cancelLabel: t('close'),
      cancelable: true
    });
  }

  function buildUI(body) {
    body.textContent = '';

    /* tabs */
    const tabs = U.el('div', { class: 'seg-tabs' });
    [['icon', 'image', t('ie_tab_icon')], ['edit', 'crop', t('ie_tab_edit')]].forEach(function (x) {
      tabs.appendChild(U.el('button', {
        class: 'btn small' + (st.tab === x[0] ? ' primary' : ' ghost'),
        onclick: function () { st.tab = x[0]; buildUI(body); }
      }, U.icon(x[1], { size: 16 }), x[2]));
    });
    body.appendChild(tabs);

    if (st.tab === 'icon') buildIconTab(body);
    else buildEditTab(body);
  }

  function pushPixelUndo() {
    if (!st || !st.grid) return;
    st.undo = st.undo || [];
    st.undo.push(st.grid.slice());
    if (st.undo.length > 40) st.undo.shift();
  }
  function popPixelUndo(body) {
    if (!st || !st.undo || !st.undo.length) {
      CS.app.toast(t('ie_undo_empty'), 'info');
      return;
    }
    st.grid = st.undo.pop();
    if (body) buildUI(body);
    else if (st.iconCanvas) {
      /* re-render canvas without full rebuild if possible */
    }
  }

  /* ------------------------------------------------------------------ *
   * Tab: pixel-art icon generator
   * ------------------------------------------------------------------ */
  function buildIconTab(body) {
    /* (D+): pencil/eraser/bucket/eyedropper tools + size */
    const tools = U.el('div', { class: 'ie-row ie-tools' });
    [['pen', 'pencil'], ['eraser', 'eraser'], ['fill', 'fill'], ['pick', 'drop']].forEach(function (x) {
      tools.appendChild(U.el('button', {
        class: 'btn small' + (st.tool === x[0] ? ' primary' : ' ghost'),
        title: t('ie_tool_' + x[0]), 'aria-label': t('ie_tool_' + x[0]),
        onclick: function () { st.tool = x[0]; buildUI(body); }
      }, U.icon(x[1], { size: 16 })));
    });
    tools.appendChild(U.el('span', { class: 'spacer' }));
    tools.appendChild(U.el('span', { class: 'ae-label', text: t('ie_brush') }));
    [1, 2, 3].forEach(function (b) {
      tools.appendChild(U.el('button', {
        class: 'btn small' + (st.brush === b ? ' primary' : ' ghost'),
        onclick: function () { st.brush = b; }
      }, String(b)));
    });
    tools.appendChild(U.el('span', { class: 'spacer' }));
    tools.appendChild(U.el('button', {
      class: 'btn ghost small' + (st.showGrid ? ' on' : ''),
      title: t('ie_grid'), 'aria-label': t('ie_grid'),
      onclick: function (e2) { st.showGrid = !st.showGrid; e2.currentTarget.classList.toggle('on', st.showGrid); applyGridClass(); }
    }, '#'));
    body.appendChild(tools);

    const row = U.el('div', { class: 'ie-row' });
    row.appendChild(U.el('span', { class: 'ae-label', text: t('ie_size') }));
    const sel = U.el('select', {
      class: 'input', onchange: function () {
        const ns = Number(this.value);
        const old = st.grid, os = st.size;
        st.size = ns;
        st.grid = new Array(ns * ns).fill(0);
        for (let y = 0; y < Math.min(os, ns); y++)
          for (let x = 0; x < Math.min(os, ns); x++) st.grid[y * ns + x] = old[y * os + x];
        buildUI(body);
      }
    });
    [8, 16, 24, 32].forEach(function (s) {
      const o = new Option(s + '×' + s, String(s));
      if (st.size === s) o.selected = true;
      sel.appendChild(o);
    });
    row.appendChild(sel);
    row.appendChild(U.el('span', { class: 'spacer' }));
    row.appendChild(U.el('button', {
      class: 'btn ghost small',
      title: t('ie_undo'), 'aria-label': t('ie_undo'),
      onclick: function () { popPixelUndo(body); }
    }, U.icon('undo', { size: 16 }), t('ie_undo')));
    row.appendChild(U.el('button', {
      class: 'btn ghost small', onclick: function () {
        pushPixelUndo();
        st.grid = new Array(st.size * st.size).fill(0);
        buildUI(body);
      }
    }, U.icon('trash', { size: 16 }), t('ie_clear')));
    /* (D+): importar una foto y convertirla a pixel-art */
    row.appendChild(U.el('button', {
      class: 'btn ghost small', onclick: function () { importPhotoToPixels(body); }
    }, U.icon('camera', { size: 16 }), t('ie_import_photo')));
    body.appendChild(row);

    /* lienzo */
    const wrap = U.el('div', { class: 'ie-canvas-wrap' });
    const cv = U.el('canvas', { class: 'ie-pix', width: String(st.size), height: String(st.size) });
    cv.style.width = st.size * st.scale + 'px';
    cv.style.height = st.size * st.scale + 'px';
    wrap.appendChild(cv);
    body.appendChild(wrap);
    st.iconCanvas = cv;

    /* pintar con clic/arrastre (herramientas y grosor) */
    let painting = false;
    function cellFromEvent(ev) {
      const r = cv.getBoundingClientRect();
      const x = clamp(Math.floor(((ev.clientX - r.left) / r.width) * st.size), 0, st.size - 1);
      const y = clamp(Math.floor(((ev.clientY - r.top) / r.height) * st.size), 0, st.size - 1);
      return { x, y };
    }
    function paint(ev) {
      const c = cellFromEvent(ev);
      if (st.tool === 'pick') { st.color = st.grid[c.y * st.size + c.x] || 0; buildUI(body); return; }
      if (st.tool === 'fill') { floodFill(c.x, c.y); drawIcon(); return; }
      const val = st.tool === 'eraser' ? 0 : st.color;
      const b = st.brush;
      for (let dy = 0; dy < b; dy++) {
        for (let dx = 0; dx < b; dx++) {
          const x = c.x + (st.brush === 1 ? 0 : dx - ((b - 1) >> 1));
          const y = c.y + (st.brush === 1 ? 0 : dy - ((b - 1) >> 1));
          if (x >= 0 && y >= 0 && x < st.size && y < st.size) st.grid[y * st.size + x] = val;
        }
      }
      drawIcon();
    }
    function floodFill(x, y) {
      const from = st.grid[y * st.size + x];
      const to = st.color;
      if (from === to) return;
      const stack = [[x, y]];
      while (stack.length) {
        const [cx, cy] = stack.pop();
        if (cx < 0 || cy < 0 || cx >= st.size || cy >= st.size) continue;
        if (st.grid[cy * st.size + cx] !== from) continue;
        st.grid[cy * st.size + cx] = to;
        stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
      }
    }
    cv.addEventListener('pointerdown', function (ev) {
      if (st.tool !== 'pick') pushPixelUndo();
      painting = true;
      paint(ev);
      ev.preventDefault();
    });
    cv.addEventListener('pointermove', function (ev) { if (painting) paint(ev); });
    window.addEventListener('pointerup', function () { painting = false; });
    function applyGridClass() {
      cv.classList.toggle('grid-on', !!st.showGrid);
    }
    applyGridClass();

    /* paleta (base + personalizados, ) */
    const pal = U.el('div', { class: 'ie-palette' });
    const total = paletteLen();
    for (let i = 0; i < total; i++) {
      const c = colorAt(i);
      const sw = U.el('button', {
        class: 'ie-sw' + (st.color === i ? ' sel' : ''),
        style: 'background:' + (i === 0 ? 'repeating-conic-gradient(#ccc 0 25%,#fff 0 50%) 50%/8px 8px' : c),
        'aria-label': c, title: c,
        onclick: function () { st.color = i; buildUI(body); }
      });
      pal.appendChild(sw);
    }
    /* add custom color with the system picker */
    if (total < PALETTE.length + 12) {
      const add = U.el('button', { class: 'ie-sw ie-sw-add', title: t('ie_add_color'), 'aria-label': t('ie_add_color') }, '+');
      const picker = U.el('input', {
        type: 'color', value: '#7048e5', style: 'position:absolute;width:0;height:0;opacity:0',
        onchange: function () {
          const list = customColors();
          if (list.indexOf(this.value) < 0) {
            list.push(this.value);
            CS.settings.set('imagePalette', list);
          }
          st.color = PALETTE.length + list.length - 1;
          buildUI(body);
        }
      });
      add.appendChild(picker);
      add.onclick = function () { try { picker.click(); } catch (e) { /* jsdom */ } };
      pal.appendChild(add);
    }
    body.appendChild(pal);

    /* save (selectable export scale) */
    const actions = U.el('div', { class: 'row-gap ae-actions' });
    const inp = U.el('input', { class: 'input ae-name', value: 'icono', placeholder: 'icono' });
    actions.appendChild(inp);
    const scaleSel = U.el('select', {
      class: 'input ie-scale', title: t('ie_scale'),
      onchange: function () { st.exportScale = Number(this.value); }
    });
    [2, 4, 8, 16].forEach(function (k) {
      const o = new Option('×' + k, String(k));
      if (st.exportScale === k) o.selected = true;
      scaleSel.appendChild(o);
    });
    actions.appendChild(scaleSel);
    actions.appendChild(U.el('button', {
      class: 'btn primary small',
      onclick: function () {
        const name = String(inp.value || '').trim();
        if (!U.isVarName(name)) { CS.app.toast(t('err_bad_fn'), 'error'); return; }
        const big = exportIcon(st.size * st.exportScale);
        savePng('assets/' + name + '.png', big);
      }
    }, U.icon('check', { size: 16 }), t('ie_save_png')));
    body.appendChild(actions);
    body.appendChild(U.el('p', { class: 'hint', text: t('ie_icon_hint') }));

    drawIcon();
  }

  function drawIcon() {
    const cv = st.iconCanvas;
    if (!cv) return;
    const ctx = cv.getContext && cv.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, st.size, st.size);
    for (let y = 0; y < st.size; y++) {
      for (let x = 0; x < st.size; x++) {
        const c = st.grid[y * st.size + x];
        if (c === 0) continue; /* transparente */
        ctx.fillStyle = colorAt(c);
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  function exportIcon(px) {
    const cv = document.createElement('canvas');
    cv.width = px; cv.height = px;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(st.iconCanvas, 0, 0, st.size, st.size, 0, 0, px, px);
    return cv.toDataURL('image/png');
  }

  /* Tab: edit project image */
  function imageFiles() {
    const p = CS.projects.current;
    if (!p) return [];
    return Object.keys(p.files).filter(function (path) {
      const f = p.files[path];
      return f.kind === 'data' && /^image\//.test(f.mime || '') && /\.png|\.jpe?g|\.gif|\.webp|\.svg$/i.test(path);
    }).sort();
  }

  function buildEditTab(body) {
    const imgs = imageFiles();

    const row = U.el('div', { class: 'ie-row' });
    row.appendChild(U.el('span', { class: 'ae-label', text: t('ie_source') }));
    const sel = U.el('select', { class: 'input', onchange: function () { loadProjectImage(this.value, body); } });
    if (!imgs.length) sel.appendChild(new Option(t('ie_no_images'), ''));
    imgs.forEach(function (path) {
      const o = new Option(path, path);
      if (st.srcPath === path) o.selected = true;
      sel.appendChild(o);
    });
    row.appendChild(sel);
    body.appendChild(row);

    if (!imgs.length) {
      body.appendChild(U.el('p', { class: 'hint', text: t('ie_no_images_hint') }));
      return;
    }
    if (!st.srcPath || imgs.indexOf(st.srcPath) < 0) st.srcPath = imgs[0];

    /* preview */
    const wrap = U.el('div', { class: 'ie-canvas-wrap' });
    const cv = U.el('canvas', { class: 'ie-prev' });
    wrap.appendChild(cv);
    body.appendChild(wrap);
    st.editCanvas = cv;

    /* filtros */
    const f = st.filters;
    const rows = [
      ['brightness', 'ie_bright', 0, 200],
      ['contrast', 'ie_contrast', 0, 200],
      ['saturate', 'ie_satur', 0, 200]
    ];
    rows.forEach(function (r) {
      const [key, label, min, max] = r;
      const row = U.el('div', { class: 'ae-row' });
      row.appendChild(U.el('span', { class: 'ae-label', text: t(label) }));
      row.appendChild(U.el('input', {
        class: 'input ae-range', type: 'range', min: String(min), max: String(max), step: '1',
        value: String(f[key]),
        oninput: function () { f[key] = Number(this.value); drawEdit(); }
      }));
      body.appendChild(row);
    });
    const toggles = U.el('div', { class: 'ie-row ie-toggles' });
    [['gray', t('ie_gray')], ['sepia', t('ie_sepia')], ['invert', t('ie_invert')]].forEach(function (x) {
      const chk = U.el('input', { type: 'checkbox', onchange: function () { f[x[0]] = this.checked; drawEdit(); } });
      chk.checked = !!f[x[0]];
      toggles.appendChild(U.el('label', { class: 'ae-chk-label' }, chk, ' ' + x[1]));
    });
    body.appendChild(toggles);

    /* transformaciones */
    const tr = U.el('div', { class: 'row-gap ie-transforms' });
    tr.appendChild(U.el('button', { class: 'btn ghost small', onclick: function () { rotateEdit(-90); } }, '⟲ 90°'));
    tr.appendChild(U.el('button', { class: 'btn ghost small', onclick: function () { rotateEdit(90); } }, '⟳ 90°'));
    tr.appendChild(U.el('button', { class: 'btn ghost small', onclick: function () { flipEdit('h'); } }, '↔ ' + t('ie_flip')));
    tr.appendChild(U.el('button', { class: 'btn ghost small', onclick: function () { flipEdit('v'); } }, '↕ ' + t('ie_flip')));
    body.appendChild(tr);

    /* crop and resize */
    const cropRow = U.el('div', { class: 'ie-row ie-crop' });
    cropRow.appendChild(U.el('span', { class: 'ae-label', text: t('ie_crop') }));
    ['x', 'y', 'w', 'h'].forEach(function (k) {
      const inp = U.el('input', {
        class: 'input ae-num', type: 'number', min: '0', placeholder: k,
        value: st.crop[k] ? String(st.crop[k]) : '',
        oninput: function () { st.crop[k] = Number(this.value) || 0; }
      });
      cropRow.appendChild(inp);
    });
    cropRow.appendChild(U.el('button', { class: 'btn ghost small', 'aria-label': t('a11y_crop'), title: t('a11y_crop'), onclick: function () { applyCrop(); } }, U.icon('crop', { size: 16 })));
    body.appendChild(cropRow);

    const sizeRow = U.el('div', { class: 'ie-row' });
    sizeRow.appendChild(U.el('span', { class: 'ae-label', text: t('ie_resize') }));
    const wInp = U.el('input', { class: 'input ae-num', type: 'number', min: '1', placeholder: 'w' });
    const hInp = U.el('input', { class: 'input ae-num', type: 'number', min: '1', placeholder: 'h' });
    sizeRow.appendChild(wInp);
    sizeRow.appendChild(hInp);
    sizeRow.appendChild(U.el('button', {
      class: 'btn ghost small',
      onclick: function () { applyResize(Number(wInp.value), Number(hInp.value)); }
    }, U.icon('expand', { size: 16 })));
    /* preset to standard icon size */
    sizeRow.appendChild(U.el('button', {
      class: 'btn ghost small', title: '192×192', 'aria-label': 'icon 192x192',
      onclick: function () { applyResize(192, 192); }
    }, '192'));
    body.appendChild(sizeRow);

    /* guardar */
    const actions = U.el('div', { class: 'row-gap ae-actions' });
    const inp = U.el('input', { class: 'input ae-name', value: suggestName(st.srcPath), placeholder: 'imagen' });
    actions.appendChild(inp);
    actions.appendChild(U.el('button', {
      class: 'btn primary small',
      onclick: function () {
        const name = String(inp.value || '').trim();
        if (!U.isVarName(name)) { CS.app.toast(t('err_bad_fn'), 'error'); return; }
        const dataUrl = st.editCanvas.toDataURL('image/png');
        savePng('assets/' + name + '.png', dataUrl);
      }
    }, U.icon('check', { size: 16 }), t('ie_save_png')));
    body.appendChild(actions);
    body.appendChild(U.el('p', { class: 'hint', text: t('ie_edit_hint') }));

    loadProjectImage(st.srcPath, body, true);
  }

  /* (D+): foto → rejilla pixel-art */
  function importPhotoToPixels(body) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function () {
      const file = input.files && input.files[0];
      if (!file) return;
      if (file.size > 1.5 * 1024 * 1024) { CS.app.toast(t('err_image_too_big'), 'error'); return; }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = function () {
        try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
        /* reducir a size×size y muestrear */
        const cv = document.createElement('canvas');
        cv.width = st.size; cv.height = st.size;
        const ctx = cv.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(img, 0, 0, st.size, st.size);
        const px = ctx.getImageData(0, 0, st.size, st.size).data;
        st.grid = quantizeToPalette(px, st.size, PALETTE.slice(1).concat(customColors()));
        buildUI(body);
        CS.app.toast(t('ie_photo_ok', { n: st.size }));
      };
      img.onerror = function () { CS.app.toast(t('ie_load_err'), 'error'); };
      img.src = url;
    };
    input.click();
  }

  function suggestName(path) {
    const base = String(path || 'imagen').split('/').pop().replace(/\.[a-z0-9]+$/i, '');
    const clean = base.replace(/[^A-Za-z0-9_]/g, '');
    return (clean || 'imagen') + '-edit';
  }

  function loadProjectImage(path, body, skipRedraw) {
    st.srcPath = path;
    const p = CS.projects.current;
    const f = p && p.files[path];
    if (!f || f.kind !== 'data') return;
    const img = new Image();
    img.onload = function () {
      st.img = img;
      st.crop = { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight };
      if (!skipRedraw) buildUI(body); else drawEdit();
    };
    img.onerror = function () { CS.app.toast(t('ie_load_err'), 'error'); };
    img.src = f.dataUrl;
  }

  function drawEdit() {
    const cv = st.editCanvas;
    if (!cv || !st.img) return;
    const ctx = cv.getContext && cv.getContext('2d');
    if (!ctx) return;
    const f = st.filters;
    const fs = filterString(f);
    cv.width = st.img.naturalWidth;
    cv.height = st.img.naturalHeight;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.filter = fs === 'none' ? 'none' : fs;
    ctx.drawImage(st.img, 0, 0);
    ctx.filter = 'none';
  }

  function rotateEdit(deg) {
    const cv = st.editCanvas;
    if (!cv) return;
    const out = document.createElement('canvas');
    const swap = deg === 90 || deg === -90;
    out.width = swap ? cv.height : cv.width;
    out.height = swap ? cv.width : cv.height;
    const ctx = out.getContext('2d');
    ctx.translate(out.width / 2, out.height / 2);
    ctx.rotate((deg * Math.PI) / 180);
    ctx.drawImage(cv, -cv.width / 2, -cv.height / 2);
    replaceCanvasWith(out);
  }

  function flipEdit(dir) {
    const cv = st.editCanvas;
    if (!cv) return;
    const out = document.createElement('canvas');
    out.width = cv.width; out.height = cv.height;
    const ctx = out.getContext('2d');
    ctx.translate(dir === 'h' ? out.width : 0, dir === 'v' ? out.height : 0);
    ctx.scale(dir === 'h' ? -1 : 1, dir === 'v' ? -1 : 1);
    ctx.drawImage(cv, 0, 0);
    replaceCanvasWith(out);
  }

  function applyCrop() {
    const cv = st.editCanvas;
    if (!cv) return;
    const c = st.crop;
    if (!c.w || !c.h) { CS.app.toast(t('ie_crop_err'), 'error'); return; }
    const x = clamp(Math.round(c.x), 0, cv.width - 1);
    const y = clamp(Math.round(c.y), 0, cv.height - 1);
    const w = clamp(Math.round(c.w), 1, cv.width - x);
    const h = clamp(Math.round(c.h), 1, cv.height - y);
    const out = document.createElement('canvas');
    out.width = w; out.height = h;
    const ctx = out.getContext('2d');
    ctx.drawImage(cv, x, y, w, h, 0, 0, w, h);
    replaceCanvasWith(out);
  }

  function applyResize(w, h) {
    const cv = st.editCanvas;
    if (!cv || !w || !h) { CS.app.toast(t('ie_crop_err'), 'error'); return; }
    const out = document.createElement('canvas');
    out.width = clamp(Math.round(w), 1, 2048);
    out.height = clamp(Math.round(h), 1, 2048);
    const ctx = out.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(cv, 0, 0, cv.width, cv.height, 0, 0, out.width, out.height);
    replaceCanvasWith(out);
  }

  /* after a transform: turn result canvas into source image */
  function replaceCanvasWith(out) {
    const url = out.toDataURL('image/png');
    const img = new Image();
    img.onload = function () {
      st.img = img;
      st.crop = { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight };
      drawEdit();
    };
    img.src = url;
  }

  function savePng(path, dataUrl) {
    const p = CS.projects.current;
    if (!p) return;
    const bytes = U.dataUrlToBytes(dataUrl);
    try {
      const prev = p.files[path] || null;
      CS.projects.fileSet(p, path, { kind: 'data', dataUrl: dataUrl, mime: 'image/png', size: bytes.length });
      CS.projects.save(p).catch(function () {});
      CS.app.toast(t('ae_saved', { path: path }), 'ok');
      if (CS.editor && CS.editor.notifyFileAdded) CS.editor.notifyFileAdded(path, prev);
    } catch (e) {
      CS.app.toast(t('err_file_exists'), 'error');
    }
  }

  /* ------------------------------------------------------------------ *
   * Export
   * ------------------------------------------------------------------ */
  CS.imageEditor = {
    open: open,
    filterString: filterString,
    quantizeToPalette: quantizeToPalette,
    customColors: customColors,
    colorAt: colorAt,
    PALETTE: PALETTE
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = CS.imageEditor; }
})();
