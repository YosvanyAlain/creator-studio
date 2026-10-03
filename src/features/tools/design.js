/* Design tools: colors (picker, harmonies, scale, contrast), gradients and shadows. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, ui } = CS;
  const TL = CS.tools, C = CS.color;
  const t = (...a) => CS.t(...a);
  const icon = (n) => CS.icon(n);
  const store = (key, fallback) => Object.assign({}, fallback, CS.settings.get('tool_' + key) || {});
  const keep = (key, value) => CS.settings.set('tool_' + key, value);
  const setVar = (el, name, value) => el.style.setProperty(name, value);

  /* ---------- Colors ---------- */
  function renderColor() {
    const S = store('color', { hex: '#5146e0', text: '#ffffff', harmony: 'analogous' });
    const hero = h('div', { class: 'tl-color-hero' });
    const heroHex = h('strong', {});
    const heroName = h('span', {});
    hero.append(h('div', { class: 'tl-color-hero-text' }, heroHex, heroName));
    const pick = TL.swatch(S.hex, (v) => setColor(v, 'picker'));
    const hsl0 = C.hsl(S.hex);
    const hue = TL.slider({ label: t('tl_hue'), min: 0, max: 359, value: hsl0.h, unit: '°', onInput: () => fromSliders() });
    const sat = TL.slider({ label: t('tl_sat'), min: 0, max: 100, value: hsl0.s, unit: '%', onInput: () => fromSliders() });
    const lig = TL.slider({ label: t('tl_light'), min: 0, max: 100, value: hsl0.l, unit: '%', onInput: () => fromSliders() });
    hue.el.classList.add('tl-hue');
    const formats = h('div', { class: 'tl-formats' });
    const harmonies = h('div', { class: 'tl-swatches' });
    const scale = h('div', { class: 'tl-scale' });
    const contrastHost = h('div', { class: 'tl-contrast' });
    const css = TL.codeBox({ title: t('tl_palette_css'), onUse: (code) => TL.useCss({ tool: 'color', css: code, raw: true }) });
    let hsl = hsl0;

    function fromSliders() {
      hsl = { h: +hue.el.querySelector('input').value, s: +sat.el.querySelector('input').value, l: +lig.el.querySelector('input').value };
      setColor(C.fromHsl(hsl.h, hsl.s, hsl.l), 'sliders');
    }
    function setColor(value, from) {
      const hex = C.hex(value);
      if (!hex) return;
      S.hex = hex;
      if (from !== 'sliders') { hsl = C.hsl(hex); hue.set(hsl.h); sat.set(hsl.s); lig.set(hsl.l); }
      if (from !== 'picker') pick.set(hex);
      keep('color', S);
      draw();
    }
    function chip(hex, label, onClick) {
      const b = h('button', { class: 'tl-chip-color', type: 'button', title: hex, onclick: onClick || (() => TL.copy(hex, t('tl_copied_value', { v: hex }))) },
        h('span', { class: 'tl-chip-fill' }), h('span', { class: 'tl-chip-label' }, label || hex));
      setVar(b, '--c', hex);
      setVar(b, '--on', C.readableOn(hex));
      return b;
    }
    function draw() {
      const hex = S.hex, on = C.readableOn(hex);
      setVar(hero, '--c', hex);
      setVar(hero, '--on', on);
      setVar(hue.el, '--s', hsl.s + '%');
      setVar(hue.el, '--l', hsl.l + '%');
      heroHex.textContent = hex.toUpperCase();
      heroName.textContent = t('tl_text_on', { c: on === '#ffffff' ? t('tl_white') : t('tl_black'), r: C.contrast(hex, on) });
      const f = C.formats(hex);
      CS.mount(formats, ['hex', 'rgb', 'hsl'].map((k) => h('button', { class: 'tl-format', type: 'button', onclick: () => TL.copy(f[k], t('tl_copied_value', { v: f[k] })) },
        h('span', { class: 'tl-format-k' }, k.toUpperCase()), h('code', {}, f[k]), icon('copy'))));
      CS.mount(harmonies, C.harmony(hex, S.harmony).map((x) => chip(x, x.toUpperCase(), () => setColor(x))));
      CS.mount(scale, C.scale(hex).map((x) => chip(x.hex, String(x.step))));
      drawContrast();
      const sc = C.scale(hex);
      css.set(':root {\n  --primary: ' + hex + ';\n  --primary-light: ' + sc[1].hex + ';\n  --primary-dark: ' + sc[7].hex + ';\n  --on-primary: ' + on + ';\n' +
        C.harmony(hex, S.harmony).filter((x) => x !== hex).map((x, i) => '  --accent-' + (i + 1) + ': ' + x + ';\n').join('') + '}');
    }
    function drawContrast() {
      const bg = S.hex, fg = S.text;
      const ratio = C.contrast(bg, fg), g = C.grade(ratio);
      const badge = (ok, label) => h('span', { class: ['tl-badge', ok ? 'ok' : 'bad'] }, icon(ok ? 'check' : 'x'), label);
      const sample = h('div', { class: 'tl-contrast-sample' }, h('strong', {}, t('tl_sample_big')), h('span', {}, t('tl_sample_small')));
      setVar(sample, '--bg', bg);
      setVar(sample, '--fg', fg);
      const textPick = TL.swatch(fg, (v) => { S.text = v; keep('color', S); drawContrast(); }, { compact: true });
      CS.mount(contrastHost,
        sample,
        h('div', { class: 'tl-contrast-row' },
          h('div', { class: 'tl-contrast-pick' }, textPick.el, h('span', {}, t('tl_text_color'))),
          ui.iconButton('sort', t('tl_swap'), () => { const x = S.text; S.text = S.hex; setColor(x); }),
          h('div', { class: 'tl-ratio' }, h('strong', {}, ratio + ':1'), h('span', {}, t(g.aaa ? 'tl_ratio_great' : g.aa ? 'tl_ratio_good' : g.aaLarge ? 'tl_ratio_large' : 'tl_ratio_bad')))),
        h('div', { class: 'tl-badges' }, badge(g.aa, 'AA'), badge(g.aaa, 'AAA'), badge(g.aaLarge, t('tl_large') + ' AA'), badge(g.aaaLarge, t('tl_large') + ' AAA')));
    }
    draw();
    return h('div', { class: 'tl-stack' },
      hero,
      TL.panel(null, h('div', { class: 'tl-row' }, pick.el, ui.button({ label: t('tl_random'), icon: 'dice', variant: 'soft', onClick: () => setColor(C.random()) })), hue.el, sat.el, lig.el),
      TL.panel(t('tl_formats'), formats),
      TL.panel(t('tl_harmony'), ui.segmented(['complementary', 'analogous', 'triad', 'tetrad'].map((k) => ({ value: k, label: t('tl_h_' + k) })), S.harmony, (v) => { S.harmony = v; keep('color', S); draw(); }), harmonies, h('p', { class: 'tl-hint' }, t('tl_harmony_hint'))),
      TL.panel(t('tl_scale'), scale, h('p', { class: 'tl-hint' }, t('tl_scale_hint'))),
      TL.panel(t('tl_contrast'), contrastHost, h('p', { class: 'tl-hint' }, t('tl_contrast_hint'))),
      css.el);
  }

  /* ---------- Gradients ---------- */
  const GRADIENTS = [
    ['#7268ff', '#3626b8'], ['#ff9a8b', '#ff6a88', '#ff99ac'], ['#43e97b', '#38f9d7'], ['#fa709a', '#fee140'],
    ['#30cfd0', '#330867'], ['#f6d365', '#fda085'], ['#a18cd1', '#fbc2eb'], ['#0f2027', '#203a43', '#2c5364'],
    ['#ff512f', '#dd2476'], ['#00c6ff', '#0072ff'], ['#f093fb', '#f5576c'], ['#c1dfc4', '#deecdd']
  ];
  function gradientCss(G) {
    const stops = G.stops.slice().sort((a, b) => a.at - b.at).map((s) => s.c + ' ' + s.at + '%').join(', ');
    if (G.type === 'radial') return 'radial-gradient(circle at center, ' + stops + ')';
    if (G.type === 'conic') return 'conic-gradient(from ' + G.angle + 'deg, ' + stops + ')';
    return 'linear-gradient(' + G.angle + 'deg, ' + stops + ')';
  }
  const presetStops = (cols) => cols.map((c, i) => ({ c, at: Math.round(i * 100 / (cols.length - 1)) }));

  function renderGradient() {
    const G = store('gradient', { type: 'linear', angle: 135, stops: presetStops(GRADIENTS[0]), text: false });
    const preview = h('div', { class: 'tl-grad-preview' }, h('span', { class: 'tl-grad-word' }, t('tl_grad_word')));
    const stopsHost = h('div', { class: 'tl-stops' });
    const angle = TL.slider({ label: t('tl_angle'), min: 0, max: 360, value: G.angle, unit: '°', onInput: (v) => { G.angle = v; update(); } });
    const out = TL.codeBox({ onUse: () => TL.useCss({ tool: 'gradient', css: cssText(), className: t('tl_class_gradient') }) });
    const cssText = () => G.text
      ? 'background: ' + gradientCss(G) + ';\n-webkit-background-clip: text;\nbackground-clip: text;\ncolor: transparent;'
      : 'background: ' + gradientCss(G) + ';';
    function update() {
      const g = gradientCss(G);
      preview.classList.toggle('text', !!G.text);
      setVar(preview, '--g', g);
      angle.el.hidden = G.type === 'radial';
      out.set(cssText());
      keep('gradient', G);
    }
    function drawStops() {
      CS.mount(stopsHost, G.stops.map((s, i) => h('div', { class: 'tl-stop' },
        TL.swatch(s.c, (v) => { s.c = v; update(); }, { compact: true }).el,
        h('input', { type: 'range', min: 0, max: 100, value: s.at, 'aria-label': t('tl_position'), oninput: (e) => { s.at = +e.target.value; e.target.nextSibling.textContent = s.at + '%'; update(); } }),
        h('span', { class: 'tl-stop-at' }, s.at + '%'),
        ui.iconButton('trash', t('delete'), () => { if (G.stops.length <= 2) return ui.toast(t('tl_min_stops'), 'info'); G.stops.splice(i, 1); drawStops(); update(); }, { size: 'sm' }))),
      G.stops.length < 5 ? ui.button({ label: t('tl_add_color'), icon: 'plus', variant: 'ghost', size: 'sm', onClick: () => {
        const last = G.stops[G.stops.length - 1];
        G.stops.push({ c: C.shift(last.c, 40), at: 100 });
        if (G.stops.length > 1) G.stops.forEach((x, k) => { x.at = Math.round(k * 100 / (G.stops.length - 1)); });
        drawStops(); update();
      } }) : null);
    }
    const presets = h('div', { class: 'tl-presets' }, GRADIENTS.map((cols) => {
      const b = h('button', { class: 'tl-preset', type: 'button', 'aria-label': cols.join(' '), onclick: () => { G.stops = presetStops(cols); drawStops(); update(); } });
      setVar(b, '--g', 'linear-gradient(135deg, ' + cols.join(', ') + ')');
      return b;
    }));
    drawStops();
    update();
    return h('div', { class: 'tl-stack' },
      preview,
      TL.panel(t('tl_presets'), presets),
      TL.panel(t('tl_style'),
        ui.segmented([{ value: 'linear', label: t('tl_linear') }, { value: 'radial', label: t('tl_radial') }, { value: 'conic', label: t('tl_conic') }], G.type, (v) => { G.type = v; update(); }),
        angle.el,
        h('div', { class: 'tl-toggle-row' }, ui.toggle(G.text, (v) => { G.text = v; update(); }, t('tl_grad_text')))),
      TL.panel(t('tl_colors'), stopsHost),
      out.el);
  }

  /* ---------- Shadows and corners ---------- */
  const SHADOWS = {
    soft: { x: 0, y: 4, blur: 14, spread: 0, alpha: 12, layered: true },
    raised: { x: 0, y: 10, blur: 24, spread: -6, alpha: 22, layered: true },
    floating: { x: 0, y: 24, blur: 48, spread: -12, alpha: 30, layered: true },
    glow: { x: 0, y: 0, blur: 28, spread: 2, alpha: 55, layered: false, tinted: true },
    inset: { x: 0, y: 2, blur: 6, spread: 0, alpha: 18, layered: false, inset: true },
    sharp: { x: 6, y: 6, blur: 0, spread: 0, alpha: 100, layered: false }
  };
  function shadowCss(S) {
    const rgb = C.parse(S.tinted ? S.tint : S.color) || { r: 0, g: 0, b: 0 };
    const rgba = (a) => 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', ' + Math.round(a) / 100 + ')';
    const one = (k, a) => (S.inset ? 'inset ' : '') + Math.round(S.x * k) + 'px ' + Math.round(S.y * k) + 'px ' + Math.round(S.blur * k) + 'px ' + Math.round(S.spread * k) + 'px ' + rgba(a);
    return S.layered ? one(0.25, S.alpha * 0.8) + ',\n    ' + one(1, S.alpha) : one(1, S.alpha);
  }

  function renderShadow() {
    const S = store('shadow', Object.assign({ preset: 'raised', color: '#0f172a', tint: '#5146e0', radius: 18, tinted: false, inset: false }, SHADOWS.raised));
    const box = h('div', { class: 'tl-shadow-box' }, icon('sparkles'));
    const stage = h('div', { class: 'tl-shadow-stage' }, box);
    const out = TL.codeBox({ onUse: () => TL.useCss({ tool: 'shadow', css: cssText(), className: t('tl_class_shadow') }) });
    const cssText = () => 'border-radius: ' + S.radius + 'px;\nbox-shadow: ' + shadowCss(S) + ';';
    const sliders = {};
    const mk = (k, min, max, unit) => { sliders[k] = TL.slider({ label: t('tl_sh_' + k), min, max, value: S[k], unit: unit || 'px', onInput: (v) => { S[k] = v; S.preset = ''; update(); drawPresets(); } }); return sliders[k].el; };
    const presetsHost = h('div', { class: 'tl-chips' });
    const colorPick = TL.swatch(S.color, (v) => { S.color = v; update(); }, { compact: true });
    const tintPick = TL.swatch(S.tint, (v) => { S.tint = v; update(); }, { compact: true });
    function drawPresets() {
      CS.mount(presetsHost, Object.keys(SHADOWS).map((k) => ui.chip(t('tl_sp_' + k), { active: S.preset === k, onClick: () => {
        Object.assign(S, { tinted: false, inset: false, layered: false }, SHADOWS[k], { preset: k });
        ['x', 'y', 'blur', 'spread', 'alpha'].forEach((key) => sliders[key].set(S[key]));
        drawPresets(); update(); toggles();
      } })));
    }
    const togglesHost = h('div', { class: 'tl-toggle-row' });
    function toggles() {
      CS.mount(togglesHost,
        ui.toggle(S.layered, (v) => { S.layered = v; update(); }, t('tl_sh_layered')),
        ui.toggle(S.inset, (v) => { S.inset = v; update(); }, t('tl_sh_inset')),
        ui.toggle(S.tinted, (v) => { S.tinted = v; update(); }, t('tl_sh_tinted')));
    }
    function update() {
      box.style.boxShadow = shadowCss(S).replace(/\n\s*/g, ' ');
      box.style.borderRadius = S.radius + 'px';
      if (S.tinted) setVar(box, '--tile', S.tint); else box.style.removeProperty('--tile');
      out.set(cssText());
      keep('shadow', S);
    }
    const radius = TL.slider({ label: t('tl_sh_radius'), min: 0, max: 60, value: S.radius, unit: 'px', onInput: (v) => { S.radius = v; update(); } });
    drawPresets(); toggles(); update();
    return h('div', { class: 'tl-stack' },
      stage,
      TL.panel(t('tl_presets'), presetsHost),
      TL.panel(t('tl_sh_shape'), radius.el),
      TL.panel(t('tl_sh_light'), mk('x', -40, 40), mk('y', -40, 60), mk('blur', 0, 100), mk('spread', -40, 40), mk('alpha', 0, 100, '%'),
        h('div', { class: 'tl-row' }, h('div', { class: 'tl-contrast-pick' }, colorPick.el, h('span', {}, t('tl_sh_color'))), h('div', { class: 'tl-contrast-pick' }, tintPick.el, h('span', {}, t('tl_sh_tint')))),
        togglesHost),
      out.el);
  }

  TL.add({ id: 'color', group: 'design', icon: 'swatch', tint: 'pink', order: 10, render: renderColor });
  TL.add({ id: 'gradient', group: 'design', icon: 'gradient', tint: 'violet', order: 11, render: renderGradient });
  TL.add({ id: 'shadow', group: 'design', icon: 'shadow', tint: 'slate', order: 12, render: renderShadow });
  CS.toolsDesign = { gradientCss, shadowCss, GRADIENTS };
})();
