/* QR Code encoder (ISO/IEC 18004), byte mode with UTF-8, versions 1-40, levels L/M/Q/H, automatic mask.
   Returns a square boolean matrix; drawing is done by the caller. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const LEVELS = { L: 0, M: 1, Q: 2, H: 3 };
  const FORMAT_BITS = [1, 0, 3, 2];
  const ECC_PER_BLOCK = [
    [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
  ];
  const NUM_BLOCKS = [
    [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
  ];

  const bit = (x, i) => ((x >>> i) & 1) !== 0;

  function rawModules(ver) {
    let n = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      const align = Math.floor(ver / 7) + 2;
      n -= (25 * align - 10) * align - 55;
      if (ver >= 7) n -= 36;
    }
    return n;
  }
  const dataCodewords = (ver, e) => Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[e][ver] * NUM_BLOCKS[e][ver];

  function gfMul(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z & 0xff;
  }
  function rsDivisor(degree) {
    const out = new Array(degree).fill(0);
    out[degree - 1] = 1;
    let root = 1;
    for (let i = 0; i < degree; i++) {
      for (let j = 0; j < out.length; j++) {
        out[j] = gfMul(out[j], root);
        if (j + 1 < out.length) out[j] ^= out[j + 1];
      }
      root = gfMul(root, 0x02);
    }
    return out;
  }
  function rsRemainder(data, divisor) {
    const out = divisor.map(() => 0);
    for (const b of data) {
      const factor = b ^ out.shift();
      out.push(0);
      divisor.forEach((coef, i) => { out[i] ^= gfMul(coef, factor); });
    }
    return out;
  }

  function alignmentPositions(ver) {
    if (ver === 1) return [];
    const size = ver * 4 + 17;
    const count = Math.floor(ver / 7) + 2;
    const step = Math.floor((ver * 8 + count * 3 + 5) / (count * 4 - 4)) * 2;
    const out = [6];
    for (let pos = size - 7; out.length < count; pos -= step) out.splice(1, 0, pos);
    return out;
  }

  /* Smallest version that fits; 'bytes' are already UTF-8 encoded. */
  function pickVersion(bytes, e, minVersion) {
    for (let ver = Math.max(1, minVersion || 1); ver <= 40; ver++) {
      const countBits = ver <= 9 ? 8 : 16;
      if (4 + countBits + bytes.length * 8 <= dataCodewords(ver, e) * 8) return ver;
    }
    return 0;
  }

  function encode(text, opts) {
    const o = opts || {};
    let level = LEVELS[o.level] != null ? o.level : 'M';
    const bytes = Array.from(new TextEncoder().encode(String(text)));
    let e = LEVELS[level];
    const ver = pickVersion(bytes, e, o.minVersion);
    if (!ver) throw Object.assign(new Error('too-long'), { code: 'too-long' });
    /* Use a stronger level for free when the same version still fits. */
    if (o.boost !== false) {
      for (const next of ['M', 'Q', 'H']) if (LEVELS[next] > e && pickVersion(bytes, LEVELS[next], ver) === ver) { e = LEVELS[next]; level = next; }
    }

    const bits = [];
    const push = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    push(4, 4);
    push(bytes.length, ver <= 9 ? 8 : 16);
    bytes.forEach((b) => push(b, 8));
    const capacity = dataCodewords(ver, e) * 8;
    push(0, Math.min(4, capacity - bits.length));
    push(0, (8 - bits.length % 8) % 8);
    for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) push(pad, 8);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));

    const size = ver * 4 + 17;
    const mod = Array.from({ length: size }, () => new Array(size).fill(false));
    const fn = Array.from({ length: size }, () => new Array(size).fill(false));
    const set = (x, y, dark) => { mod[y][x] = dark; fn[y][x] = true; };

    /* Function patterns. */
    for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    const finder = (cx, cy) => {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
      }
    };
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    const align = alignmentPositions(ver), na = align.length;
    for (let i = 0; i < na; i++) for (let j = 0; j < na; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(align[i] + dx, align[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
    const drawFormat = (mask) => {
      const d = (FORMAT_BITS[e] << 3) | mask;
      let rem = d;
      for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      const b = ((d << 10) | rem) ^ 0x5412;
      for (let i = 0; i <= 5; i++) set(8, i, bit(b, i));
      set(8, 7, bit(b, 6)); set(8, 8, bit(b, 7)); set(7, 8, bit(b, 8));
      for (let i = 9; i < 15; i++) set(14 - i, 8, bit(b, i));
      for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(b, i));
      for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(b, i));
      set(8, size - 8, true);
    };
    drawFormat(0);
    if (ver >= 7) {
      let rem = ver;
      for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
      const b = (ver << 12) | rem;
      for (let i = 0; i < 18; i++) {
        const a = size - 11 + i % 3, c = Math.floor(i / 3);
        set(a, c, bit(b, i)); set(c, a, bit(b, i));
      }
    }

    /* Error correction and interleaving. */
    const nb = NUM_BLOCKS[e][ver], eccLen = ECC_PER_BLOCK[e][ver];
    const raw = Math.floor(rawModules(ver) / 8);
    const shortBlocks = nb - raw % nb, shortLen = Math.floor(raw / nb);
    const divisor = rsDivisor(eccLen);
    const blocks = [];
    for (let i = 0, k = 0; i < nb; i++) {
      const dat = data.slice(k, k + shortLen - eccLen + (i < shortBlocks ? 0 : 1));
      k += dat.length;
      const ecc = rsRemainder(dat, divisor);
      if (i < shortBlocks) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    const all = [];
    for (let i = 0; i < blocks[0].length; i++) blocks.forEach((blk, j) => { if (i !== shortLen - eccLen || j >= shortBlocks) all.push(blk[i]); });

    /* Zigzag placement. */
    let idx = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let v = 0; v < size; v++) for (let j = 0; j < 2; j++) {
        const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - v : v;
        if (!fn[y][x] && idx < all.length * 8) { mod[y][x] = bit(all[idx >>> 3], 7 - (idx & 7)); idx++; }
      }
    }

    const MASKS = [
      (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
      (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
      (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0, (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0
    ];
    const applyMask = (m) => {
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && MASKS[m](x, y)) mod[y][x] = !mod[y][x];
    };
    let mask = o.mask != null ? o.mask : -1;
    if (mask < 0) {
      let best = Infinity;
      for (let m = 0; m < 8; m++) {
        applyMask(m); drawFormat(m);
        const score = penalty(mod);
        if (score < best) { best = score; mask = m; }
        applyMask(m);
      }
    }
    applyMask(mask);
    drawFormat(mask);
    return { size, version: ver, level, mask, modules: mod };
  }

  /* Standard penalty rules N1-N4 used to pick the most readable mask. */
  function penalty(m) {
    const n = m.length;
    let score = 0, dark = 0;
    const line = (get) => {
      let s = 0, run = 1, str = '';
      for (let i = 0; i < n; i++) {
        const v = get(i);
        str += v ? '1' : '0';
        if (i > 0 && v === get(i - 1)) { run++; if (run === 5) s += 3; else if (run > 5) s += 1; } else run = 1;
      }
      let at = -1;
      while ((at = str.indexOf('1011101', at + 1)) !== -1) {
        if (str.slice(Math.max(0, at - 4), at) === '0000' || str.slice(at + 7, at + 11) === '0000') s += 40;
      }
      return s;
    };
    for (let y = 0; y < n; y++) score += line((x) => m[y][x]);
    for (let x = 0; x < n; x++) score += line((y) => m[y][x]);
    for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) {
      const c = m[y][x];
      if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) score += 3;
    }
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x]) dark++;
    score += Math.floor(Math.abs(dark * 20 - n * n * 10) / (n * n)) * 10;
    return score;
  }

  /* Draws the matrix on a canvas: quiet zone in modules, dot style 'square' | 'round' | 'dots'. */
  function draw(canvas, qr, opts) {
    const o = Object.assign({ scale: 8, margin: 4, dark: '#000000', light: '#ffffff', style: 'square' }, opts || {});
    const total = qr.size + o.margin * 2;
    const px = Math.max(1, Math.floor(o.scale));
    canvas.width = canvas.height = total * px;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = o.light;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = o.dark;
    const isFinder = (x, y) => (x < 7 && y < 7) || (x >= qr.size - 7 && y < 7) || (x < 7 && y >= qr.size - 7);
    for (let y = 0; y < qr.size; y++) for (let x = 0; x < qr.size; x++) {
      if (!qr.modules[y][x]) continue;
      const X = (x + o.margin) * px, Y = (y + o.margin) * px;
      if (o.style === 'square' || isFinder(x, y)) ctx.fillRect(X, Y, px, px);
      else if (o.style === 'dots') { ctx.beginPath(); ctx.arc(X + px / 2, Y + px / 2, px * 0.42, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(X + px * 0.06, Y + px * 0.06, px * 0.88, px * 0.88, px * 0.32); else ctx.rect(X, Y, px, px); ctx.fill(); }
    }
    return canvas;
  }

  /* Capacity in bytes for a version/level, used for the "how much fits" hint. */
  const capacity = (ver, level) => Math.floor((dataCodewords(ver, LEVELS[level] || 0) * 8 - 4 - (ver <= 9 ? 8 : 16)) / 8);

  CS.qr = { encode, draw, capacity, LEVELS: Object.keys(LEVELS) };
})();
