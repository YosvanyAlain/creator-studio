/* ZIP read/write for .xdc packages. Deflate via CompressionStream when present; inflate has a pure JS fallback. */
'use strict';
(function () {
  const CS = globalThis.CS;

  const CRC = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function concat(chunks) {
    const total = chunks.reduce((s, c) => s + c.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) { out.set(c, offset); offset += c.length; }
    return out;
  }

  const hasDeflate = () => typeof CompressionStream === 'function';
  const hasInflate = () => typeof DecompressionStream === 'function';

  async function stream(bytes, Kind, format) {
    const s = new Kind(format);
    const writer = s.writable.getWriter();
    writer.write(bytes);
    writer.close();
    return new Uint8Array(await new Response(s.readable).arrayBuffer());
  }

  /* ---------- Pure JS inflate (RFC 1951), used when DecompressionStream is missing ---------- */
  function inflateJs(data, maxOut) {
    let pos = 0;
    let bit = 0;
    let out = new Uint8Array(Math.max(1024, data.length * 4));
    let len = 0;
    const need = (n) => {
      if (len + n <= out.length) return;
      let size = out.length * 2;
      while (size < len + n) size *= 2;
      if (maxOut && size > maxOut * 2 + 65536) size = Math.max(len + n, maxOut + 65536);
      const next = new Uint8Array(size);
      next.set(out.subarray(0, len));
      out = next;
    };
    const bits = (n) => {
      let v = 0;
      for (let i = 0; i < n; i++) {
        if (pos >= data.length) throw new Error('inflate: truncated');
        v |= ((data[pos] >> bit) & 1) << i;
        if (++bit === 8) { bit = 0; pos++; }
      }
      return v;
    };
    function build(lengths) {
      const counts = new Uint16Array(16);
      lengths.forEach((l) => counts[l]++);
      counts[0] = 0;
      const offs = new Uint16Array(16);
      for (let i = 1; i < 16; i++) offs[i] = offs[i - 1] + counts[i - 1];
      const symbols = new Uint16Array(lengths.length);
      lengths.forEach((l, s) => { if (l) symbols[offs[l]++] = s; });
      return { counts, symbols };
    }
    function decode(tree) {
      let code = 0;
      let first = 0;
      let index = 0;
      for (let l = 1; l < 16; l++) {
        code |= bits(1);
        const count = tree.counts[l];
        if (code - first < count) return tree.symbols[index + code - first];
        index += count;
        first = (first + count) << 1;
        code <<= 1;
      }
      throw new Error('inflate: bad code');
    }
    const LBASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
    const LEXT = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
    const DBASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
    const DEXT = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
    let fixedL = null;
    let fixedD = null;
    let final = 0;
    while (!final) {
      final = bits(1);
      const type = bits(2);
      if (type === 0) {
        if (bit) { bit = 0; pos++; }
        const n = data[pos] | (data[pos + 1] << 8);
        pos += 4;
        need(n);
        out.set(data.subarray(pos, pos + n), len);
        len += n;
        pos += n;
      } else if (type === 1 || type === 2) {
        let lt;
        let dt;
        if (type === 1) {
          if (!fixedL) {
            const l = new Array(288);
            for (let i = 0; i < 144; i++) l[i] = 8;
            for (let i = 144; i < 256; i++) l[i] = 9;
            for (let i = 256; i < 280; i++) l[i] = 7;
            for (let i = 280; i < 288; i++) l[i] = 8;
            fixedL = build(l);
            fixedD = build(new Array(30).fill(5));
          }
          lt = fixedL;
          dt = fixedD;
        } else {
          const hlit = bits(5) + 257;
          const hdist = bits(5) + 1;
          const hclen = bits(4) + 4;
          const ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
          const cl = new Array(19).fill(0);
          for (let i = 0; i < hclen; i++) cl[ORDER[i]] = bits(3);
          const ct = build(cl);
          const lengths = [];
          while (lengths.length < hlit + hdist) {
            const sym = decode(ct);
            if (sym < 16) lengths.push(sym);
            else if (sym === 16) { const prev = lengths[lengths.length - 1]; for (let r = bits(2) + 3; r > 0; r--) lengths.push(prev); }
            else if (sym === 17) { for (let r = bits(3) + 3; r > 0; r--) lengths.push(0); }
            else { for (let r = bits(7) + 11; r > 0; r--) lengths.push(0); }
          }
          lt = build(lengths.slice(0, hlit));
          dt = build(lengths.slice(hlit));
        }
        for (;;) {
          const sym = decode(lt);
          if (sym < 256) { need(1); out[len++] = sym; }
          else if (sym === 256) break;
          else {
            const li = sym - 257;
            const length = LBASE[li] + bits(LEXT[li]);
            const di = decode(dt);
            const dist = DBASE[di] + bits(DEXT[di]);
            need(length);
            for (let i = 0; i < length; i++) { out[len] = out[len - dist]; len++; }
          }
          if (maxOut && len > maxOut) throw zipError('too-big');
        }
      } else throw new Error('inflate: bad block');
      if (maxOut && len > maxOut) throw zipError('too-big');
    }
    return out.slice(0, len);
  }

  function zipError(code) { const e = new Error('zip: ' + code); e.code = 'zip-' + code; return e; }

  async function inflate(bytes, maxOut) {
    if (hasInflate()) {
      try { return await stream(bytes, DecompressionStream, 'deflate-raw'); } catch (error) { /* fall back */ }
    }
    return inflateJs(bytes, maxOut);
  }

  const enc = new TextEncoder();

  /* files: [{ path, data: Uint8Array | string }]. Reproducible: fixed 1980-01-01 timestamps. */
  async function build(files, opts) {
    const o = opts || {};
    const deflate = hasDeflate() && o.method !== 'store';
    const local = [];
    const central = [];
    let offset = 0;
    for (const file of files) {
      const name = enc.encode(file.path);
      const raw = typeof file.data === 'string' ? enc.encode(file.data) : file.data;
      const crc = crc32(raw);
      let method = 0;
      let body = raw;
      if (deflate && raw.length > 64 && !/\.(png|jpe?g|gif|webp|mp3|ogg|m4a|mp4|webm|woff2?|zip|xdc)$/i.test(file.path)) {
        const packed = await stream(raw, CompressionStream, 'deflate-raw');
        if (packed.length < raw.length) { method = 8; body = packed; }
      }
      const head = new Uint8Array(30 + name.length);
      const dv = new DataView(head.buffer);
      dv.setUint32(0, 0x04034b50, true);
      dv.setUint16(4, 20, true);
      dv.setUint16(6, 0x0800, true);
      dv.setUint16(8, method, true);
      dv.setUint16(10, 0, true);
      dv.setUint16(12, 0x21, true);
      dv.setUint32(14, crc, true);
      dv.setUint32(18, body.length, true);
      dv.setUint32(22, raw.length, true);
      dv.setUint16(26, name.length, true);
      head.set(name, 30);
      local.push(head, body);
      const cen = new Uint8Array(46 + name.length);
      const cv = new DataView(cen.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, method, true);
      cv.setUint16(12, 0, true);
      cv.setUint16(14, 0x21, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, body.length, true);
      cv.setUint32(24, raw.length, true);
      cv.setUint16(28, name.length, true);
      cv.setUint32(42, offset, true);
      cen.set(name, 46);
      central.push(cen);
      offset += head.length + body.length;
    }
    const cd = concat(central);
    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, cd.length, true);
    ev.setUint32(16, offset, true);
    return concat(local.concat([cd, end]));
  }

  async function read(bytes, limits) {
    const lim = Object.assign({ files: 400, fileBytes: 16 * 1048576, totalBytes: 64 * 1048576 }, limits || {});
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let eocd = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw zipError('not-zip');
    const count = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    if (count > lim.files) throw zipError('too-many');
    const dec = new TextDecoder();
    const out = [];
    let total = 0;
    for (let i = 0; i < count; i++) {
      if (dv.getUint32(p, true) !== 0x02014b50) throw zipError('corrupt');
      const method = dv.getUint16(p + 10, true);
      const crc = dv.getUint32(p + 16, true);
      const csize = dv.getUint32(p + 20, true);
      const usize = dv.getUint32(p + 24, true);
      const nlen = dv.getUint16(p + 28, true);
      const xlen = dv.getUint16(p + 30, true);
      const clen = dv.getUint16(p + 32, true);
      const lho = dv.getUint32(p + 42, true);
      const path = dec.decode(bytes.subarray(p + 46, p + 46 + nlen));
      p += 46 + nlen + xlen + clen;
      if (path.endsWith('/')) continue;
      if (usize > lim.fileBytes) throw zipError('too-big');
      total += usize;
      if (total > lim.totalBytes) throw zipError('too-big');
      const lnlen = dv.getUint16(lho + 26, true);
      const lxlen = dv.getUint16(lho + 28, true);
      const start = lho + 30 + lnlen + lxlen;
      const comp = bytes.subarray(start, start + csize);
      let data;
      if (method === 0) data = comp.slice();
      else if (method === 8) data = await inflate(comp, lim.fileBytes);
      else throw zipError('method');
      if (crc32(data) !== crc) throw zipError('crc');
      out.push({ path, data });
    }
    return out;
  }

  CS.zip = { build, read, crc32, inflateJs, hasDeflate, hasInflate };
})();
