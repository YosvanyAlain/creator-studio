/* Color math for the tools: conversions, contrast (WCAG 2), harmonies and scales. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const round = (v, d) => { const k = Math.pow(10, d || 0); return Math.round(v * k) / k; };

  function parse(input) {
    let s = String(input || '').trim().toLowerCase();
    let m = s.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/);
    if (m) {
      let x = m[1];
      if (x.length === 3) x = x.split('').map((c) => c + c).join('');
      return { r: parseInt(x.slice(0, 2), 16), g: parseInt(x.slice(2, 4), 16), b: parseInt(x.slice(4, 6), 16) };
    }
    m = s.match(/^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/);
    if (m) return { r: clamp(+m[1], 0, 255), g: clamp(+m[2], 0, 255), b: clamp(+m[3], 0, 255) };
    m = s.match(/^hsla?\(\s*(-?[\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/);
    if (m) return hslToRgb({ h: +m[1], s: +m[2], l: +m[3] });
    return null;
  }

  const hex2 = (v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  const toHex = (c) => '#' + hex2(c.r) + hex2(c.g) + hex2(c.b);

  function rgbToHsl(c) {
    const r = c.r / 255, g = c.g / 255, b = c.b / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h: round(h), s: round(s * 100), l: round(l * 100) };
  }

  function hslToRgb(c) {
    const h = ((c.h % 360) + 360) % 360 / 360, s = clamp(c.s, 0, 100) / 100, l = clamp(c.l, 0, 100) / 100;
    if (!s) { const v = l * 255; return { r: v, g: v, b: v }; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = (t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return { r: Math.round(f(h + 1 / 3) * 255), g: Math.round(f(h) * 255), b: Math.round(f(h - 1 / 3) * 255) };
  }

  const hex = (x) => { const c = parse(x); return c ? toHex(c) : null; };
  const hsl = (x) => rgbToHsl(parse(x) || { r: 0, g: 0, b: 0 });
  const fromHsl = (h, s, l) => toHex(hslToRgb({ h, s, l }));

  function luminance(x) {
    const c = parse(x) || { r: 0, g: 0, b: 0 };
    const ch = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
  }
  function contrast(a, b) {
    const la = luminance(a), lb = luminance(b);
    return round((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05), 2);
  }
  /* WCAG 2 levels: normal text needs 4.5 (AA) / 7 (AAA); large text 3 / 4.5. */
  function grade(ratio) {
    return { aa: ratio >= 4.5, aaa: ratio >= 7, aaLarge: ratio >= 3, aaaLarge: ratio >= 4.5 };
  }
  const readableOn = (bg) => (contrast(bg, '#ffffff') >= contrast(bg, '#111111') ? '#ffffff' : '#111111');

  function mix(a, b, t) {
    const x = parse(a), y = parse(b);
    if (!x || !y) return hex(a);
    return toHex({ r: x.r + (y.r - x.r) * t, g: x.g + (y.g - x.g) * t, b: x.b + (y.b - x.b) * t });
  }
  const shift = (x, dh, ds, dl) => { const c = hsl(x); return fromHsl(c.h + (dh || 0), clamp(c.s + (ds || 0), 0, 100), clamp(c.l + (dl || 0), 0, 100)); };

  function harmony(x, kind) {
    switch (kind) {
      case 'complementary': return [hex(x), shift(x, 180)];
      case 'analogous': return [shift(x, -30), hex(x), shift(x, 30)];
      case 'triad': return [hex(x), shift(x, 120), shift(x, 240)];
      case 'split': return [hex(x), shift(x, 150), shift(x, 210)];
      case 'tetrad': return [hex(x), shift(x, 90), shift(x, 180), shift(x, 270)];
      default: return [hex(x)];
    }
  }

  /* A 9-step scale from very light to very dark, keeping the hue (like design-system palettes). */
  function scale(x) {
    const c = hsl(x);
    const steps = [96, 90, 80, 68, 56, 45, 36, 27, 18];
    return steps.map((l, i) => ({ step: (i + 1) * 100, hex: fromHsl(c.h, clamp(c.s * (i < 2 ? 0.9 : 1), 0, 100), l) }));
  }

  function formats(x) {
    const c = parse(x) || { r: 0, g: 0, b: 0 };
    const hh = rgbToHsl(c);
    return { hex: toHex(c), rgb: 'rgb(' + c.r + ', ' + c.g + ', ' + c.b + ')', hsl: 'hsl(' + hh.h + ', ' + hh.s + '%, ' + hh.l + '%)' };
  }

  function random() { return fromHsl(Math.floor(Math.random() * 360), 55 + Math.random() * 35, 42 + Math.random() * 18); }

  CS.color = { parse, hex, hsl, fromHsl, toHex, rgbToHsl, hslToRgb, luminance, contrast, grade, readableOn, mix, shift, harmony, scale, formats, random };
})();
