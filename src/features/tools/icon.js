/* App icon maker: background (solid or gradient), shape, line icon or letters, exported as a 512 px icon.png. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, ui } = CS;
  const TL = CS.tools, C = CS.color;
  const t = (...a) => CS.t(...a);
  const SIZE = 512;
  const BACKS = [
    ['#7268ff', '#3626b8'], ['#ff8a5b', '#e5484d'], ['#34d399', '#0e9f6e'], ['#38bdf8', '#2563eb'], ['#f472b6', '#be185d'],
    ['#fbbf24', '#f97316'], ['#a78bfa', '#6d28d9'], ['#2dd4bf', '#0f766e'], ['#475569', '#0f172a'], ['#fef3c7', '#fde68a']
  ];
  const FEATURED = ['cube', 'chat', 'poll', 'gamepad', 'heart', 'star', 'calendar', 'cart', 'wallet', 'note', 'checkSquare', 'trophy', 'gift', 'music', 'camera', 'brush', 'map', 'bolt', 'rocket', 'bulb', 'dice', 'timer', 'users', 'book'];

  function shapePath(ctx, shape, s) {
    ctx.beginPath();
    if (shape === 'circle') { ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2); return; }
    if (shape === 'full') { ctx.rect(0, 0, s, s); return; }
    if (shape === 'rounded') {
      const r = s * 0.22;
      ctx.moveTo(r, 0); ctx.arcTo(s, 0, s, s, r); ctx.arcTo(s, s, 0, s, r); ctx.arcTo(0, s, 0, 0, r); ctx.arcTo(0, 0, s, 0, r); ctx.closePath();
      return;
    }
    /* Squircle (superellipse, n = 5). */
    const n = 5, a = s / 2;
    for (let i = 0; i <= 360; i += 2) {
      const th = i * Math.PI / 180, c = Math.cos(th), sn = Math.sin(th);
      const x = a + a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), y = a + a * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function svgImage(name, color, stroke) {
    const svg = CS.icon(name);
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('width', '240'); svg.setAttribute('height', '240');
    svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', color); svg.setAttribute('stroke-width', String(stroke));
    svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
    svg.removeAttribute('class');
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
    });
  }

  async function paint(canvas, S) {
    canvas.width = canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.save();
    shapePath(ctx, S.shape, SIZE);
    ctx.clip();
    if (S.mode === 'solid') ctx.fillStyle = S.c1;
    else {
      const rad = (S.angle - 90) * Math.PI / 180, cx = SIZE / 2, r = SIZE / 2;
      const g = ctx.createLinearGradient(cx - Math.cos(rad) * r, cx - Math.sin(rad) * r, cx + Math.cos(rad) * r, cx + Math.sin(rad) * r);
      g.addColorStop(0, S.c1); g.addColorStop(1, S.c2);
      ctx.fillStyle = g;
    }
    ctx.fillRect(0, 0, SIZE, SIZE);
    if (S.shine) {
      const g = ctx.createLinearGradient(0, 0, 0, SIZE);
      g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(0.5, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, SIZE, SIZE);
    }
    const box = SIZE * S.scale / 100, off = (SIZE - box) / 2;
    if (S.depth) { ctx.shadowColor = 'rgba(0,0,0,0.28)'; ctx.shadowBlur = SIZE * 0.05; ctx.shadowOffsetY = SIZE * 0.02; }
    if (S.kind === 'text') {
      const text = (S.text || 'A').slice(0, 3);
      ctx.fillStyle = S.fg;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      let fs = box * (text.length === 1 ? 0.9 : text.length === 2 ? 0.7 : 0.52);
      ctx.font = '800 ' + fs + 'px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(text, SIZE / 2, SIZE / 2 + fs * 0.04);
    } else {
      const img = await svgImage(S.icon, S.fg, S.stroke);
      ctx.drawImage(img, off, off, box, box);
    }
    ctx.restore();
    if (S.spark) {
      const x = SIZE * 0.78, y = SIZE * 0.2, r = SIZE * 0.085;
      ctx.fillStyle = '#ffd66b';
      ctx.beginPath();
      ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r);
      ctx.fill();
    }
    return canvas;
  }

  const toBytes = (canvas) => new Promise((resolve) => canvas.toBlob(async (blob) => resolve(new Uint8Array(await blob.arrayBuffer())), 'image/png'));

  function render(ctx) {
    const params = ctx.params || {};
    const S = Object.assign({ shape: 'full', mode: 'gradient', c1: BACKS[0][0], c2: BACKS[0][1], angle: 135, kind: 'icon', icon: 'cube', text: 'A', fg: '#ffffff', scale: 58, stroke: 1.8, shine: true, depth: false, spark: false },
      CS.settings.get('tool_icon') || {});
    if (params.name && !CS.settings.get('tool_icon')) { S.kind = 'text'; S.text = String(params.name).trim().slice(0, 1).toUpperCase() || 'A'; }
    const canvas = h('canvas', { class: 'tl-icon-canvas', width: SIZE, height: SIZE });
    const mini = [h('img', { class: 'tl-icon-mini s64', alt: '' }), h('img', { class: 'tl-icon-mini s40', alt: '' })];
    const bubbleIcon = h('img', { class: 'tl-bubble-icon', alt: '' });
    let token = 0;
    const update = async () => {
      const mine = ++token;
      await paint(canvas, S).catch(() => {});
      if (mine !== token) return;
      const url = canvas.toDataURL('image/png');
      mini.forEach((m) => { m.src = url; });
      bubbleIcon.src = url;
      CS.settings.set('tool_icon', S);
    };
    const set = (patch) => { Object.assign(S, patch); update(); };

    const backs = h('div', { class: 'tl-presets' }, BACKS.map((pair) => {
      const b = h('button', { class: 'tl-preset', type: 'button', onclick: () => { set({ c1: pair[0], c2: pair[1], fg: C.readableOn(C.mix(pair[0], pair[1], 0.5)) }); c1.set(pair[0]); c2.set(pair[1]); fg.set(S.fg); } });
      b.style.setProperty('--g', 'linear-gradient(135deg, ' + pair[0] + ', ' + pair[1] + ')');
      return b;
    }));
    const c1 = TL.swatch(S.c1, (v) => set({ c1: v }), { compact: true });
    const c2 = TL.swatch(S.c2, (v) => set({ c2: v }), { compact: true });
    const fg = TL.swatch(S.fg, (v) => set({ fg: v }), { compact: true });
    const angle = TL.slider({ label: t('tl_angle'), min: 0, max: 360, value: S.angle, unit: '°', onInput: (v) => set({ angle: v }) });
    const scale = TL.slider({ label: t('tl_ic_size'), min: 30, max: 90, value: S.scale, unit: '%', onInput: (v) => set({ scale: v }) });
    const stroke = TL.slider({ label: t('tl_ic_stroke'), min: 1.2, max: 2.8, step: 0.1, value: S.stroke, onInput: (v) => set({ stroke: v }) });

    /* Glyph choice: featured icons first, everything else after a search. */
    let query = '';
    const grid = h('div', { class: 'tl-icon-grid' });
    const drawGrid = () => {
      const all = CS.icons.names();
      const q = query.trim().toLowerCase();
      const names = q ? all.filter((n) => n.toLowerCase().includes(q)) : FEATURED.concat(all.filter((n) => !FEATURED.includes(n)));
      CS.mount(grid, names.slice(0, q ? 80 : 60).map((n) => h('button', { class: ['tl-icon-pick', S.kind === 'icon' && S.icon === n && 'on'], type: 'button', title: n, 'data-icon': n,
        onclick: () => { set({ kind: 'icon', icon: n }); drawGrid(); glyphTabs(); } }, CS.icon(n))));
    };
    const textInput = ui.input({ value: S.text, max: 3, onInput: (v) => set({ kind: 'text', text: String(v) }) });
    const glyphHost = h('div', {});
    const glyphTabs = () => CS.mount(glyphHost,
      ui.segmented([{ value: 'icon', label: t('tl_ic_icon') }, { value: 'text', label: t('tl_ic_letters') }], S.kind, (v) => { set({ kind: v }); glyphTabs(); }),
      S.kind === 'icon' ? [ui.searchBox({ placeholder: t('tl_ic_search'), value: query, onInput: (v) => { query = v; drawGrid(); } }), grid, stroke.el]
        : [ui.field(t('tl_ic_letters_label'), textInput, t('tl_ic_letters_hint'))]);
    drawGrid(); glyphTabs();

    const save = async () => {
      await update();
      CS.studio.saveSheet({
        title: t('tl_ic_save'), tool: 'icon', kind: 'image', ext: 'png', path: 'icon', name: 'icon', project: params.project,
        encode: async () => ({ bytes: await toBytes(await paint(document.createElement('canvas'), S)), mime: 'image/png' })
      });
    };
    update();
    return h('div', { class: 'tl-stack' },
      h('div', { class: 'tl-icon-stage' },
        h('div', { class: 'tl-icon-big' }, canvas),
        h('div', { class: 'tl-icon-side' },
          h('div', { class: 'tl-icon-minis' }, mini),
          h('div', { class: 'tl-bubble' }, bubbleIcon, h('div', {}, h('strong', {}, params.name || t('tl_ic_app')), h('span', {}, t('tl_ic_bubble')))))),
      h('div', { class: 'tl-actions' },
        ui.button({ label: t('tl_ic_save'), icon: 'save', variant: 'primary', block: true, onClick: save })),
      TL.panel(t('tl_ic_glyph'), glyphHost, h('div', { class: 'tl-row' }, h('div', { class: 'tl-contrast-pick' }, fg.el, h('span', {}, t('tl_ic_fg')))), scale.el),
      TL.panel(t('tl_ic_back'), backs,
        ui.segmented([{ value: 'gradient', label: t('tl_ic_gradient') }, { value: 'solid', label: t('tl_ic_solid') }], S.mode, (v) => set({ mode: v })),
        h('div', { class: 'tl-row' }, h('div', { class: 'tl-contrast-pick' }, c1.el, h('span', {}, t('tl_ic_c1'))), h('div', { class: 'tl-contrast-pick' }, c2.el, h('span', {}, t('tl_ic_c2')))),
        angle.el),
      TL.panel(t('tl_ic_shape'),
        ui.segmented(['full', 'squircle', 'rounded', 'circle'].map((k) => ({ value: k, label: t('tl_ic_' + k) })), S.shape, (v) => set({ shape: v })),
        h('p', { class: 'tl-hint' }, t('tl_ic_shape_hint')),
        h('div', { class: 'tl-toggle-row' },
          ui.toggle(S.shine, (v) => set({ shine: v }), t('tl_ic_shine')),
          ui.toggle(S.depth, (v) => set({ depth: v }), t('tl_ic_depth')),
          ui.toggle(S.spark, (v) => set({ spark: v }), t('tl_ic_spark')))));
  }

  TL.add({ id: 'icon', group: 'design', icon: 'sparkles', tint: 'indigo', order: 13, render });
  CS.toolsIcon = { paint, toBytes };
})();
