/* Raster engine: pixel documents (layers x frames), drawing primitives, transforms, palettes, RLE storage and GIF. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const MAX = 128;

  const PALETTES = {
    studio: ['#000000', '#1d1f33', '#3b3f63', '#6b7099', '#a4a9c9', '#e3e6f5', '#ffffff', '#5146e0', '#8d8bff', '#3626b8',
      '#ffd66b', '#ffa53a', '#ff6b4a', '#e8365d', '#b8237a', '#6e2c8f', '#2fb37a', '#127a5c', '#7be0a3', '#33b5e5',
      '#1a6fb8', '#0f3f73', '#8a5a3c', '#d9a066'],
    pico8: ['#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8', '#ff004d', '#ffa300',
      '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffccaa'],
    sweetie: ['#1a1c2c', '#5d275d', '#b13e53', '#ef7d57', '#ffcd75', '#a7f070', '#38b764', '#257179', '#29366f', '#3b5dc9',
      '#41a6f6', '#73eff7', '#f4f4f4', '#94b0c2', '#566c86', '#333c57'],
    gameboy: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
    gray: ['#000000', '#242424', '#494949', '#6d6d6d', '#929292', '#b6b6b6', '#dbdbdb', '#ffffff']
  };

  /* ---------- Colors ---------- */
  function hexToRgba(hex) {
    let s = String(hex || '').replace('#', '');
    if (s.length === 3 || s.length === 4) s = s.split('').map((c) => c + c).join('');
    const n = parseInt(s.slice(0, 6), 16);
    const a = s.length === 8 ? parseInt(s.slice(6, 8), 16) : 255;
    return isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255, a] : [0, 0, 0, 255];
  }
  const hex2 = (v) => v.toString(16).padStart(2, '0');
  function rgbaToHex(r, g, b, a) { return '#' + hex2(r) + hex2(g) + hex2(b) + (a != null && a < 255 ? hex2(a) : ''); }

  /* ---------- Documents ---------- */
  const blank = (w, h) => new Uint8ClampedArray(w * h * 4);
  function create(w, h, opts) {
    const o = opts || {};
    w = Math.max(1, Math.min(MAX, w | 0)); h = Math.max(1, Math.min(MAX, h | 0));
    return { w, h, fps: o.fps || 8, layers: [{ id: CS.util.uid('l'), name: o.layerName || 'Layer 1', visible: true, opacity: 1 }], frames: [{ cels: [blank(w, h)] }] };
  }
  function clone(doc) {
    return { w: doc.w, h: doc.h, fps: doc.fps, layers: doc.layers.map((l) => Object.assign({}, l)), frames: doc.frames.map((f) => ({ cels: f.cels.map((c) => new Uint8ClampedArray(c)) })) };
  }
  function addLayer(doc, at, name) {
    doc.layers.splice(at, 0, { id: CS.util.uid('l'), name, visible: true, opacity: 1 });
    doc.frames.forEach((f) => f.cels.splice(at, 0, blank(doc.w, doc.h)));
  }
  function removeLayer(doc, i) {
    if (doc.layers.length < 2) return false;
    doc.layers.splice(i, 1);
    doc.frames.forEach((f) => f.cels.splice(i, 1));
    return true;
  }
  function moveLayer(doc, i, to) {
    if (to < 0 || to >= doc.layers.length) return false;
    doc.layers.splice(to, 0, doc.layers.splice(i, 1)[0]);
    doc.frames.forEach((f) => f.cels.splice(to, 0, f.cels.splice(i, 1)[0]));
    return true;
  }
  /* Merge layer i into the one below it (i - 1). */
  function mergeDown(doc, i) {
    if (i < 1) return false;
    const top = doc.layers[i];
    doc.frames.forEach((f) => blendInto(f.cels[i - 1], f.cels[i], top.visible ? top.opacity : 0));
    return removeLayer(doc, i);
  }
  function addFrame(doc, at, copyFrom) {
    const src = copyFrom != null ? doc.frames[copyFrom] : null;
    doc.frames.splice(at, 0, { cels: doc.layers.map((_, i) => (src ? new Uint8ClampedArray(src.cels[i]) : blank(doc.w, doc.h))) });
  }
  function removeFrame(doc, i) {
    if (doc.frames.length < 2) return false;
    doc.frames.splice(i, 1);
    return true;
  }
  function moveFrame(doc, i, to) {
    if (to < 0 || to >= doc.frames.length) return false;
    doc.frames.splice(to, 0, doc.frames.splice(i, 1)[0]);
    return true;
  }

  /* ---------- Pixels ---------- */
  function get(cel, w, x, y) { const i = (y * w + x) * 4; return [cel[i], cel[i + 1], cel[i + 2], cel[i + 3]]; }
  function set(cel, w, h, x, y, c) {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4;
    cel[i] = c[0]; cel[i + 1] = c[1]; cel[i + 2] = c[2]; cel[i + 3] = c[3];
  }
  /* Square brush of the given size centred on (x, y). */
  function dab(cel, w, h, x, y, c, size) {
    const s = Math.max(1, size | 0);
    const o = Math.floor((s - 1) / 2);
    for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) set(cel, w, h, x - o + dx, y - o + dy, c);
  }
  function linePoints(x0, y0, x1, y1) {
    const pts = [];
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      pts.push([x0, y0]);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return pts;
  }
  function rectPoints(x0, y0, x1, y1, filled) {
    const pts = [];
    const [ax, bx] = x0 < x1 ? [x0, x1] : [x1, x0];
    const [ay, by] = y0 < y1 ? [y0, y1] : [y1, y0];
    for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) {
      if (filled || y === ay || y === by || x === ax || x === bx) pts.push([x, y]);
    }
    return pts;
  }
  /* Ellipse inside the box, by scanning rows (works for tiny sizes too). */
  function ellipsePoints(x0, y0, x1, y1, filled) {
    const [ax, bx] = x0 < x1 ? [x0, x1] : [x1, x0];
    const [ay, by] = y0 < y1 ? [y0, y1] : [y1, y0];
    const cx = (ax + bx) / 2, cy = (ay + by) / 2, rx = (bx - ax) / 2 + 0.5, ry = (by - ay) / 2 + 0.5;
    const inside = (x, y) => ((x - cx) * (x - cx)) / (rx * rx) + ((y - cy) * (y - cy)) / (ry * ry) <= 1;
    const pts = [];
    for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) {
      if (!inside(x, y)) continue;
      if (filled || !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) pts.push([x, y]);
    }
    return pts;
  }
  /* Contiguous flood fill on exact color (4-neighbour, scanline stack). */
  function fill(cel, w, h, x, y, c) {
    if (x < 0 || y < 0 || x >= w || y >= h) return 0;
    const t = get(cel, w, x, y);
    if (t[0] === c[0] && t[1] === c[1] && t[2] === c[2] && t[3] === c[3]) return 0;
    const same = (i) => cel[i] === t[0] && cel[i + 1] === t[1] && cel[i + 2] === t[2] && cel[i + 3] === t[3];
    const stack = [[x, y]];
    let n = 0;
    while (stack.length) {
      const [px, py] = stack.pop();
      let lx = px;
      while (lx >= 0 && same((py * w + lx) * 4)) lx--;
      lx++;
      let up = false, down = false;
      for (let cx = lx; cx < w && same((py * w + cx) * 4); cx++) {
        set(cel, w, h, cx, py, c); n++;
        if (py > 0) { const s = same(((py - 1) * w + cx) * 4); if (s && !up) stack.push([cx, py - 1]); up = s; }
        if (py < h - 1) { const s = same(((py + 1) * w + cx) * 4); if (s && !down) stack.push([cx, py + 1]); down = s; }
      }
    }
    return n;
  }
  /* Replace every pixel of one color (whole cel). */
  function replaceColor(cel, from, to) {
    for (let i = 0; i < cel.length; i += 4) {
      if (cel[i] === from[0] && cel[i + 1] === from[1] && cel[i + 2] === from[2] && cel[i + 3] === from[3]) {
        cel[i] = to[0]; cel[i + 1] = to[1]; cel[i + 2] = to[2]; cel[i + 3] = to[3];
      }
    }
  }

  /* ---------- Transforms (all cels) ---------- */
  function mapCels(doc, fn) { doc.frames.forEach((f) => { f.cels = f.cels.map((c) => fn(c)); }); }
  function remap(src, w, h, nw, nh, pick) {
    const out = blank(nw, nh);
    for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
      const p = pick(x, y);
      if (!p) continue;
      const [sx, sy] = p;
      if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
      const si = (sy * w + sx) * 4, di = (y * nw + x) * 4;
      out[di] = src[si]; out[di + 1] = src[si + 1]; out[di + 2] = src[si + 2]; out[di + 3] = src[si + 3];
    }
    return out;
  }
  function flip(doc, horizontal, onlyCel) {
    const { w, h } = doc;
    const fn = (c) => remap(c, w, h, w, h, (x, y) => (horizontal ? [w - 1 - x, y] : [x, h - 1 - y]));
    if (onlyCel) return fn(onlyCel);
    mapCels(doc, fn);
    return null;
  }
  function rotate(doc, clockwise) {
    const { w, h } = doc;
    mapCels(doc, (c) => remap(c, w, h, h, w, (x, y) => (clockwise ? [y, h - 1 - x] : [w - 1 - y, x])));
    doc.w = h; doc.h = w;
  }
  function shiftCel(cel, w, h, dx, dy, wrap) {
    return remap(cel, w, h, w, h, (x, y) => {
      let sx = x - dx, sy = y - dy;
      if (wrap) { sx = ((sx % w) + w) % w; sy = ((sy % h) + h) % h; }
      return [sx, sy];
    });
  }
  /* Change canvas size; anchor 0..1 for each axis (0.5 = centred). */
  function resizeCanvas(doc, nw, nh, ax, ay) {
    nw = Math.max(1, Math.min(MAX, nw | 0)); nh = Math.max(1, Math.min(MAX, nh | 0));
    const ox = Math.round((nw - doc.w) * (ax == null ? 0.5 : ax)), oy = Math.round((nh - doc.h) * (ay == null ? 0.5 : ay));
    const { w, h } = doc;
    mapCels(doc, (c) => remap(c, w, h, nw, nh, (x, y) => [x - ox, y - oy]));
    doc.w = nw; doc.h = nh;
  }
  function scaleDoc(doc, nw, nh) {
    nw = Math.max(1, Math.min(MAX, nw | 0)); nh = Math.max(1, Math.min(MAX, nh | 0));
    const { w, h } = doc;
    mapCels(doc, (c) => remap(c, w, h, nw, nh, (x, y) => [Math.floor((x * w) / nw), Math.floor((y * h) / nh)]));
    doc.w = nw; doc.h = nh;
  }

  /* ---------- Composite ---------- */
  function blendInto(dst, src, opacity) {
    const op = opacity == null ? 1 : opacity;
    for (let i = 0; i < dst.length; i += 4) {
      const sa = (src[i + 3] / 255) * op;
      if (!sa) continue;
      const da = dst[i + 3] / 255;
      const oa = sa + da * (1 - sa);
      for (let k = 0; k < 3; k++) dst[i + k] = Math.round((src[i + k] * sa + dst[i + k] * da * (1 - sa)) / oa);
      dst[i + 3] = Math.round(oa * 255);
    }
    return dst;
  }
  function composite(doc, fi, opts) {
    const o = opts || {};
    const out = blank(doc.w, doc.h);
    const frame = doc.frames[fi];
    if (!frame) return out;
    if (o.onion && fi > 0) {
      const prev = composite(doc, fi - 1, { all: o.all });
      blendInto(out, prev, o.onion);
    }
    doc.layers.forEach((l, i) => { if (o.all || l.visible) blendInto(out, frame.cels[i], o.all ? 1 : l.opacity); });
    return out;
  }
  function usedColors(doc, limit) {
    const seen = new Map();
    doc.frames.forEach((f) => f.cels.forEach((c) => {
      for (let i = 0; i < c.length; i += 4) {
        if (!c[i + 3]) continue;
        const key = rgbaToHex(c[i], c[i + 1], c[i + 2], c[i + 3]);
        seen.set(key, (seen.get(key) || 0) + 1);
      }
    }));
    return [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit || 64).map((x) => x[0]);
  }

  /* ---------- Import helpers ---------- */
  /* Largest block size where every block is one color (an upscaled pixel-art PNG). */
  function detectScale(px, w, h) {
    for (let s = Math.min(32, w, h); s > 1; s--) {
      if (w % s || h % s) continue;
      let ok = true;
      for (let y = 0; y < h && ok; y++) for (let x = 0; x < w && ok; x++) {
        const i = (y * w + x) * 4, j = ((y - (y % s)) * w + (x - (x % s))) * 4;
        if (px[i] !== px[j] || px[i + 1] !== px[j + 1] || px[i + 2] !== px[j + 2] || px[i + 3] !== px[j + 3]) ok = false;
      }
      if (ok) return s;
    }
    return 1;
  }
  function downsample(px, w, h, s) {
    const nw = Math.floor(w / s), nh = Math.floor(h / s);
    return { w: nw, h: nh, data: remap(px, w, h, nw, nh, (x, y) => [x * s, y * s]) };
  }
  /* Nearest palette color, alpha below 128 becomes transparent. */
  function quantize(px, palette) {
    const pal = palette.map(hexToRgba);
    const out = new Uint8ClampedArray(px.length);
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 128) continue;
      let best = 0, bd = Infinity;
      for (let k = 0; k < pal.length; k++) {
        const dr = px[i] - pal[k][0], dg = px[i + 1] - pal[k][1], db = px[i + 2] - pal[k][2];
        const d = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
        if (d < bd) { bd = d; best = k; }
      }
      out[i] = pal[best][0]; out[i + 1] = pal[best][1]; out[i + 2] = pal[best][2]; out[i + 3] = 255;
    }
    return out;
  }

  /* ---------- Storage: run-length encoded RGBA, base64 ---------- */
  function rleEncode(cel) {
    const out = [];
    const n = cel.length / 4;
    let i = 0;
    while (i < n) {
      let run = 1;
      const b = i * 4;
      while (i + run < n && run < 255) {
        const c = (i + run) * 4;
        if (cel[c] !== cel[b] || cel[c + 1] !== cel[b + 1] || cel[c + 2] !== cel[b + 2] || cel[c + 3] !== cel[b + 3]) break;
        run++;
      }
      out.push(run, cel[b], cel[b + 1], cel[b + 2], cel[b + 3]);
      i += run;
    }
    let s = '';
    const bytes = Uint8Array.from(out);
    for (let k = 0; k < bytes.length; k += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(k, k + 0x8000));
    return btoa(s);
  }
  function rleDecode(str, w, h) {
    const bin = atob(str);
    const cel = blank(w, h);
    let p = 0;
    for (let k = 0; k + 4 < bin.length; k += 5) {
      const run = bin.charCodeAt(k);
      for (let r = 0; r < run && p < cel.length; r++, p += 4) {
        cel[p] = bin.charCodeAt(k + 1); cel[p + 1] = bin.charCodeAt(k + 2); cel[p + 2] = bin.charCodeAt(k + 3); cel[p + 3] = bin.charCodeAt(k + 4);
      }
    }
    return cel;
  }
  function serialize(doc) {
    return { v: 1, w: doc.w, h: doc.h, fps: doc.fps, layers: doc.layers.map((l) => ({ name: l.name, visible: l.visible, opacity: l.opacity })), frames: doc.frames.map((f) => f.cels.map(rleEncode)) };
  }
  function deserialize(data) {
    if (!data || data.v !== 1 || !data.w || !data.h) return null;
    const w = Math.min(MAX, data.w), h = Math.min(MAX, data.h);
    return {
      w, h, fps: data.fps || 8,
      layers: data.layers.map((l) => ({ id: CS.util.uid('l'), name: l.name, visible: l.visible !== false, opacity: l.opacity == null ? 1 : l.opacity })),
      frames: data.frames.map((cels) => ({ cels: cels.map((c) => rleDecode(c, w, h)) }))
    };
  }

  /* ---------- GIF (89a, looping, 1-bit transparency) ---------- */
  function lzw(indices, minCode) {
    const out = [];
    let cur = 0, bits = 0;
    const emit = (code, size) => {
      cur |= code << bits; bits += size;
      while (bits >= 8) { out.push(cur & 255); cur >>= 8; bits -= 8; }
    };
    const clear = 1 << minCode, eoi = clear + 1;
    let size = minCode + 1, next = eoi + 1;
    let dict = new Map();
    emit(clear, size);
    let prefix = indices[0];
    for (let i = 1; i < indices.length; i++) {
      const k = indices[i];
      const key = prefix * 4096 + k;
      if (dict.has(key)) { prefix = dict.get(key); continue; }
      emit(prefix, size);
      if (next < 4096) {
        dict.set(key, next++);
        if (next > (1 << size) && size < 12) size++;
      } else {
        emit(clear, size);
        dict = new Map(); size = minCode + 1; next = eoi + 1;
      }
      prefix = k;
    }
    emit(prefix, size);
    emit(eoi, size);
    if (bits > 0) out.push(cur & 255);
    return out;
  }
  /* frames: array of RGBA arrays (w x h). scale: integer upscale. delay: centiseconds. */
  function encodeGif(frames, w, h, opts) {
    const o = opts || {};
    const s = Math.max(1, o.scale | 0 || 1);
    const W = w * s, H = h * s;
    const colors = new Map();
    let transparent = false;
    frames.forEach((f) => { for (let i = 0; i < f.length; i += 4) { if (f[i + 3] < 128) transparent = true; else colors.set((f[i] << 16) | (f[i + 1] << 8) | f[i + 2], 0); } });
    let list = [...colors.keys()];
    const room = transparent ? 255 : 256;
    let reduce = null;
    if (list.length > room) {
      /* Fall back to a 6x7x6 colour cube (252 colours). */
      reduce = (r, g, b) => (Math.round(r / 51) * 42 + Math.round(g / 42.5) * 6 + Math.round(b / 51));
      list = [];
      for (let r = 0; r < 6; r++) for (let g = 0; g < 7; g++) for (let b = 0; b < 6; b++) list.push(((r * 51) << 16) | (Math.round(g * 42.5) << 8) | (b * 51));
    }
    const offset = transparent ? 1 : 0;
    const index = new Map(list.map((c, i) => [c, i + offset]));
    let bitsPer = 1;
    while ((1 << bitsPer) < list.length + offset) bitsPer++;
    const tableSize = 1 << bitsPer;
    const bytes = [];
    const str = (t) => { for (let i = 0; i < t.length; i++) bytes.push(t.charCodeAt(i)); };
    const u16 = (v) => bytes.push(v & 255, (v >> 8) & 255);
    str('GIF89a'); u16(W); u16(H);
    bytes.push(0x80 | ((bitsPer - 1) << 4) | (bitsPer - 1), 0, 0);
    for (let i = 0; i < tableSize; i++) {
      const c = i - offset >= 0 && i - offset < list.length ? list[i - offset] : 0;
      bytes.push((c >> 16) & 255, (c >> 8) & 255, c & 255);
    }
    if (frames.length > 1) { bytes.push(0x21, 0xff, 11); str('NETSCAPE2.0'); bytes.push(3, 1); u16(0); bytes.push(0); }
    const minCode = Math.max(2, bitsPer);
    frames.forEach((f) => {
      bytes.push(0x21, 0xf9, 4, (transparent ? 1 : 0) | (2 << 2)); u16(o.delay || 12); bytes.push(0, 0);
      bytes.push(0x2c); u16(0); u16(0); u16(W); u16(H); bytes.push(0);
      const idx = new Uint8Array(W * H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = (Math.floor(y / s) * w + Math.floor(x / s)) * 4;
        if (f[i + 3] < 128) { idx[y * W + x] = 0; continue; }
        idx[y * W + x] = reduce ? reduce(f[i], f[i + 1], f[i + 2]) + offset : index.get((f[i] << 16) | (f[i + 1] << 8) | f[i + 2]);
      }
      const data = lzw(idx, minCode);
      bytes.push(minCode);
      for (let i = 0; i < data.length; i += 255) { const chunk = data.slice(i, i + 255); bytes.push(chunk.length); for (const b of chunk) bytes.push(b); }
      bytes.push(0);
    });
    bytes.push(0x3b);
    return Uint8Array.from(bytes);
  }

  /* ---------- Canvas bridges (browser only) ---------- */
  function toCanvas(px, w, h, scale) {
    const s = Math.max(1, scale | 0 || 1);
    const src = document.createElement('canvas');
    src.width = w; src.height = h;
    src.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(px), w, h), 0, 0);
    if (s === 1) return src;
    const out = document.createElement('canvas');
    out.width = w * s; out.height = h * s;
    const ctx = out.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0, w * s, h * s);
    return out;
  }
  function canvasBytes(canvas, type, quality) {
    return new Promise((resolve, reject) => canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('encode')); return; }
      blob.arrayBuffer().then((b) => resolve(new Uint8Array(b)), reject);
    }, type || 'image/png', quality));
  }
  /* Decode image bytes/dataURL to RGBA. maxSide downsizes big photos. */
  function decodeImage(src, maxSide) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth, h = img.naturalHeight;
        if (maxSide && Math.max(w, h) > maxSide) { const k = maxSide / Math.max(w, h); w = Math.max(1, Math.round(w * k)); h = Math.max(1, Math.round(h * k)); }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve({ w, h, data: ctx.getImageData(0, 0, w, h).data, image: img });
      };
      img.onerror = () => reject(new Error('decode'));
      img.src = src;
    });
  }

  CS.raster = {
    MAX, PALETTES, hexToRgba, rgbaToHex,
    create, clone, addLayer, removeLayer, moveLayer, mergeDown, addFrame, removeFrame, moveFrame,
    get, set, dab, linePoints, rectPoints, ellipsePoints, fill, replaceColor,
    flip, rotate, shiftCel, resizeCanvas, scaleDoc, blendInto, composite, usedColors,
    detectScale, downsample, quantize, rleEncode, rleDecode, serialize, deserialize, encodeGif,
    toCanvas, canvasBytes, decodeImage, blank
  };
})();
