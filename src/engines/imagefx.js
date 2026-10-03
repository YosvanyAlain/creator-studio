/* Image effects on RGBA buffers: adjustments, presets, blur, pixelate, vignette. Pure functions. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

  const SLIDERS = [
    { id: 'brightness', icon: 'sun', min: -100, max: 100 },
    { id: 'contrast', icon: 'contrast', min: -100, max: 100 },
    { id: 'saturation', icon: 'palette', min: -100, max: 100 },
    { id: 'warmth', icon: 'bolt', min: -100, max: 100 },
    { id: 'fade', icon: 'shadow', min: 0, max: 100 },
    { id: 'blur', icon: 'wave', min: 0, max: 20 },
    { id: 'vignette', icon: 'circle', min: 0, max: 100 }
  ];

  const PRESETS = {
    none: {},
    vivid: { contrast: 15, saturation: 35 },
    warm: { warmth: 35, saturation: 10, brightness: 4 },
    cool: { warmth: -35, contrast: 6 },
    mono: { saturation: -100, contrast: 10 },
    noir: { saturation: -100, contrast: 45, brightness: -8, vignette: 45 },
    sepia: { sepia: 1, contrast: 5, vignette: 20 },
    fade: { fade: 45, contrast: -10, saturation: -15 },
    dream: { fade: 20, brightness: 8, saturation: 15, blur: 1.5 },
    retro: { posterize: 5, saturation: 20, contrast: 10 },
    pixel: { pixelate: 8 },
    comic: { posterize: 4, contrast: 35, saturation: 40 }
  };

  /* Preset values plus user slider offsets. */
  function combine(preset, user) {
    const out = Object.assign({}, PRESETS[preset] || {});
    for (const [k, v] of Object.entries(user || {})) out[k] = (out[k] || 0) + v;
    return out;
  }
  const isIdentity = (a) => !Object.values(a || {}).some((v) => v);

  function pixelate(px, w, h, block) {
    const b = Math.max(1, Math.round(block));
    if (b < 2) return px;
    const out = new Uint8ClampedArray(px.length);
    for (let by = 0; by < h; by += b) for (let bx = 0; bx < w; bx += b) {
      let r = 0, g = 0, bl = 0, a = 0, n = 0;
      const ey = Math.min(h, by + b), ex = Math.min(w, bx + b);
      for (let y = by; y < ey; y++) for (let x = bx; x < ex; x++) { const i = (y * w + x) * 4; r += px[i]; g += px[i + 1]; bl += px[i + 2]; a += px[i + 3]; n++; }
      r /= n; g /= n; bl /= n; a /= n;
      for (let y = by; y < ey; y++) for (let x = bx; x < ex; x++) { const i = (y * w + x) * 4; out[i] = r; out[i + 1] = g; out[i + 2] = bl; out[i + 3] = a; }
    }
    return out;
  }

  /* Separable box blur, three passes approximate a gaussian. */
  function blur(px, w, h, radius) {
    const r = Math.max(0, Math.round(radius));
    if (!r) return px;
    let src = new Uint8ClampedArray(px), tmp = new Uint8ClampedArray(px.length);
    const pass = (from, to, horizontal) => {
      const len = horizontal ? w : h, lines = horizontal ? h : w;
      const win = r * 2 + 1;
      for (let line = 0; line < lines; line++) {
        const idx = (k) => (horizontal ? (line * w + k) * 4 : (k * w + line) * 4);
        for (let c = 0; c < 4; c++) {
          let sum = 0;
          for (let k = -r; k <= r; k++) sum += from[idx(Math.min(len - 1, Math.max(0, k))) + c];
          for (let k = 0; k < len; k++) {
            to[idx(k) + c] = sum / win;
            sum += from[idx(Math.min(len - 1, k + r + 1)) + c] - from[idx(Math.max(0, k - r)) + c];
          }
        }
      }
    };
    for (let i = 0; i < 3; i++) { pass(src, tmp, true); pass(tmp, src, false); }
    return src;
  }

  /* Applies combined adjustments; returns a new buffer. Blur and pixelate are relative to the image size. */
  function apply(px, w, h, adj) {
    const a = adj || {};
    const side = Math.max(w, h);
    let out = a.pixelate ? pixelate(px, w, h, (a.pixelate * side) / 256) : new Uint8ClampedArray(px);
    const b = (a.brightness || 0) * 1.28;
    const cv = Math.max(-99, Math.min(99, a.contrast || 0)) * 2.55;
    const cf = (259 * (cv + 255)) / (255 * (259 - cv));
    const sat = 1 + (a.saturation || 0) / 100;
    const warm = (a.warmth || 0) * 0.4;
    const fade = (a.fade || 0) / 100;
    const sepia = Math.max(0, Math.min(1, a.sepia || 0));
    const levels = a.posterize ? Math.max(2, Math.round(a.posterize)) : 0;
    const step = levels ? 255 / (levels - 1) : 0;
    const perPixel = b || cv || sat !== 1 || warm || fade || sepia || levels;
    if (perPixel) {
      for (let i = 0; i < out.length; i += 4) {
        let r = out[i], g = out[i + 1], bl = out[i + 2];
        if (b) { r += b; g += b; bl += b; }
        if (cv) { r = cf * (r - 128) + 128; g = cf * (g - 128) + 128; bl = cf * (bl - 128) + 128; }
        if (sat !== 1) { const l = 0.299 * r + 0.587 * g + 0.114 * bl; r = l + (r - l) * sat; g = l + (g - l) * sat; bl = l + (bl - l) * sat; }
        if (warm) { r += warm; bl -= warm; }
        if (sepia) {
          const sr = 0.393 * r + 0.769 * g + 0.189 * bl, sg = 0.349 * r + 0.686 * g + 0.168 * bl, sb = 0.272 * r + 0.534 * g + 0.131 * bl;
          r += (sr - r) * sepia; g += (sg - g) * sepia; bl += (sb - bl) * sepia;
        }
        if (fade) { r = r * (1 - fade * 0.35) + 255 * fade * 0.16; g = g * (1 - fade * 0.35) + 255 * fade * 0.16; bl = bl * (1 - fade * 0.35) + 255 * fade * 0.18; }
        if (levels) { r = Math.round(clamp(r) / step) * step; g = Math.round(clamp(g) / step) * step; bl = Math.round(clamp(bl) / step) * step; }
        out[i] = r; out[i + 1] = g; out[i + 2] = bl;
      }
    }
    if (a.blur) out = blur(out, w, h, (a.blur * side) / 400);
    if (a.vignette) {
      const k = a.vignette / 100, cx = w / 2, cy = h / 2, md = Math.hypot(cx, cy);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const d = Math.hypot(x - cx, y - cy) / md;
        const f = 1 - k * Math.max(0, (d - 0.45) / 0.55) ** 1.6;
        const i = (y * w + x) * 4;
        out[i] *= f; out[i + 1] *= f; out[i + 2] *= f;
      }
    }
    return out;
  }

  /* Geometric helpers on {w, h, data}. */
  function rotate90(img, clockwise) {
    const { w, h, data } = img;
    const out = new Uint8ClampedArray(data.length);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const nx = clockwise ? h - 1 - y : y, ny = clockwise ? x : w - 1 - x;
      out.set(data.subarray((y * w + x) * 4, (y * w + x) * 4 + 4), (ny * h + nx) * 4);
    }
    return { w: h, h: w, data: out };
  }
  function flip(img, horizontal) {
    const { w, h, data } = img;
    const out = new Uint8ClampedArray(data.length);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const sx = horizontal ? w - 1 - x : x, sy = horizontal ? y : h - 1 - y;
      out.set(data.subarray((sy * w + sx) * 4, (sy * w + sx) * 4 + 4), (y * w + x) * 4);
    }
    return { w, h, data: out };
  }
  function crop(img, x, y, cw, ch) {
    const out = new Uint8ClampedArray(cw * ch * 4);
    for (let r = 0; r < ch; r++) out.set(img.data.subarray(((y + r) * img.w + x) * 4, ((y + r) * img.w + x + cw) * 4), r * cw * 4);
    return { w: cw, h: ch, data: out };
  }

  CS.imagefx = { SLIDERS, PRESETS, combine, isIdentity, apply, blur, pixelate, rotate90, flip, crop };
})();
