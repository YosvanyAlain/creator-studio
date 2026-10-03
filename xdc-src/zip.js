/* =========================================================================
 * Webxdc Creator Studio — zip.js
 * ZIP reader/writer for .xdc packages (Store/Deflate).
 * ========================================================================= */
'use strict';
(function () {
  const CS = (globalThis.CS = globalThis.CS || {});
  const U = CS.util;

  /* ---------- CRC32 (IEEE 0xEDB88320) ---------- */
  const CRC_TABLE = (function () {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes, seed) {
    let c = (seed === undefined) ? 0xFFFFFFFF : (seed ^ 0xFFFFFFFF);
    for (let i = 0; i < bytes.length; i++) {
      c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  /* ---------- Utilidades binarias ---------- */
  function concatBytes(chunks) {
    let total = 0;
    for (const c of chunks) total += c.length;
    const out = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) { out.set(c, off); off += c.length; }
    return out;
  }

  /* DOS date (2s resolution, since 1980) */
  function dosDateTime(date) {
    const d = date instanceof Date ? date : new Date();
    const time = ((d.getHours() & 0x1F) << 11) | ((d.getMinutes() & 0x3F) << 5) | ((Math.floor(d.getSeconds() / 2)) & 0x1F);
    const day = (((d.getFullYear() - 1980) & 0x7F) << 9) | (((d.getMonth() + 1) & 0x0F) << 5) | (d.getDate() & 0x1F);
    return { time: time & 0xFFFF, date: day & 0xFFFF };
  }

  function hasCompressionStream() {
    try {
      return typeof CompressionStream !== 'undefined' &&
        typeof CompressionStream === 'function';
    } catch (e) { return false; }
  }

  function hasDecompressionStream() {
    try {
      return typeof DecompressionStream !== 'undefined';
    } catch (e) { return false; }
  }

  async function deflateRaw(bytes) {
    /* CompressionStream('deflate-raw'): Chromium 103+, Safari 16.4+, Firefox 113+ */
    const cs = new CompressionStream('deflate-raw');
    const stream = new Blob([bytes]).stream().pipeThrough(cs);
    const buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  }

  async function inflateRaw(bytes, maxOut) {
    /* Lee con tope de bytes de salida: si se pasa, aborta (anti ZIP-bomb). */
    const ds = new DecompressionStream('deflate-raw');
    const stream = new Blob([bytes]).stream().pipeThrough(ds);
    const reader = stream.getReader();
    const chunks = [];
    let total = 0;
    for (;;) {
      const r = await reader.read();
      if (r.done) break;
      total += r.value.length;
      if (total > maxOut) {
        try { reader.cancel(); } catch (e) { /* ignore */ }
        throw new ZipError('bomb-ratio', 'La descompresión superó el tamaño máximo permitido');
      }
      chunks.push(r.value);
    }
    return concatBytes(chunks);
  }

  /* ---------- Errores ---------- */
  function ZipError(code, message) {
    const e = new Error(message || code);
    e.name = 'ZipError';
    e.code = code;
    return e;
  }

  /* =====================================================================
   * ESCRITOR
   * ===================================================================== */
  /* files: [{ path: 'index.html', bytes: Uint8Array }]
     Devuelve { bytes, entries: [{path, method, size, csize, crc}] } */
  async function buildZip(files, opts) {
    opts = opts || {};
    const canDeflate = hasCompressionStream() && opts.method !== 'store';
    const now = dosDateTime(new Date());
    const usedNames = new Set();
    const entries = [];
    const localChunks = [];
    let offset = 0;

    for (const f of files) {
      const path = String(f.path || '');
      if (!U.isSafePath(path)) throw ZipError('bad-path', 'Ruta no válida en el paquete: ' + path);
      if (usedNames.has(path)) throw ZipError('dup-path', 'Ruta duplicada: ' + path);
      usedNames.add(path);
      const bytes = f.bytes instanceof Uint8Array ? f.bytes : new Uint8Array(f.bytes || []);
      const crc = crc32(bytes);

      let method = 0;           /* store */
      let compressed = bytes;
      if (canDeflate && bytes.length > 64) {
        try {
          const def = await deflateRaw(bytes);
          if (def.length < bytes.length) { method = 8; compressed = def; }
        } catch (e) { /* store */ }
      }

      const nameBytes = U.utf8Bytes(path);

      /* Cabecera local (30 bytes + nombre) */
      const lh = new Uint8Array(30 + nameBytes.length);
      const dv = new DataView(lh.buffer);
      dv.setUint32(0, 0x04034b50, true);     /* firma */
      dv.setUint16(4, 20, true);             /* required version */
      dv.setUint16(6, 0x0800, true);         /* flags: nombres UTF-8 */
      dv.setUint16(8, method, true);         /* method */
      dv.setUint16(10, now.time, true);
      dv.setUint16(12, now.date, true);
      dv.setUint32(14, crc, true);
      dv.setUint32(18, compressed.length, true); /* comprimido */
      dv.setUint32(22, bytes.length, true);      /* sin comprimir */
      dv.setUint16(26, nameBytes.length, true);
      dv.setUint16(28, 0, true);             /* extra len */
      lh.set(nameBytes, 30);

      localChunks.push(lh, compressed);
      entries.push({ path, method, size: bytes.length, csize: compressed.length, crc, offset });
      offset += lh.length + compressed.length;
    }

    /* Directorio central */
    const cdChunks = [];
    let cdSize = 0;
    for (const e of entries) {
      const nameBytes = U.utf8Bytes(e.path);
      const ch = new Uint8Array(46 + nameBytes.length);
      const dv = new DataView(ch.buffer);
      dv.setUint32(0, 0x02014b50, true);   /* firma */
      dv.setUint16(4, 0x031E, true);       /* creator version (unix) */
      dv.setUint16(6, 20, true);           /* required version */
      dv.setUint16(8, 0x0800, true);       /* flags UTF-8 */
      dv.setUint16(10, e.method, true);
      dv.setUint16(12, now.time, true);
      dv.setUint16(14, now.date, true);
      dv.setUint32(16, e.crc, true);
      dv.setUint32(20, e.csize, true);
      dv.setUint32(24, e.size, true);
      dv.setUint16(28, nameBytes.length, true);
      dv.setUint16(30, 0, true);           /* extra */
      dv.setUint16(32, 0, true);           /* comment */
      dv.setUint16(34, 0, true);           /* disk */
      dv.setUint16(36, 0, true);           /* attrs internos */
      dv.setUint32(38, 0, true);           /* attrs externos */
      dv.setUint32(42, e.offset, true);    /* offset local */
      ch.set(nameBytes, 46);
      cdChunks.push(ch);
      cdSize += ch.length;
    }

    /* EOCD */
    const eocd = new Uint8Array(22);
    const edv = new DataView(eocd.buffer);
    edv.setUint32(0, 0x06054b50, true);
    edv.setUint16(4, 0, true);
    edv.setUint16(6, 0, true);
    edv.setUint16(8, entries.length, true);
    edv.setUint16(10, entries.length, true);
    edv.setUint32(12, cdSize, true);
    edv.setUint32(16, offset, true);
    edv.setUint16(20, 0, true);

    const all = concatBytes(localChunks.concat(cdChunks, [eocd]));
    return { bytes: all, entries };
  }

  /* =====================================================================
   * READER (import .xdc)
   * ===================================================================== */
  const DEFAULT_READ_LIMITS = {
    maxFiles: 200,
    maxFileBytes: 4 * 1024 * 1024,     /* 4 MB por archivo */
    maxTotalBytes: 16 * 1024 * 1024,   /* 16 MB total descomprimido */
    maxRatio: 200                       /* max compression ratio */
  };

  function u16(dv, o) { return dv.getUint16(o, true); }
  function u32(dv, o) { return dv.getUint32(o, true); }

  /* Find EOCD by scanning from the end (comment max 64KB+22) */
  function findEocd(bytes) {
    const min = Math.max(0, bytes.length - 65557);
    for (let i = bytes.length - 22; i >= min; i--) {
      if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) {
        const dv = new DataView(bytes.buffer, bytes.byteOffset + i, 22);
        const commentLen = u16(dv, 20);
        if (i + 22 + commentLen === bytes.length) return i;
      }
    }
    throw ZipError('no-zip', 'No es un archivo ZIP válido (falta EOCD)');
  }

  function readUtf8(bytes, start, len) {
    try {
      return new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(start, start + len));
    } catch (e) {
      let s = '';
      for (let i = 0; i < len; i++) s += String.fromCharCode(bytes[start + i]);
      return s;
    }
  }

  /* Devuelve { files: [{path, bytes}], warnings: [string], skipped: [path] } */
  async function readZip(bytes, limits) {
    limits = Object.assign({}, DEFAULT_READ_LIMITS, limits || {});
    if (!bytes || bytes.length < 22) throw ZipError('no-zip', 'Archivo demasiado pequeño');
    if (bytes.length > 100 * 1024 * 1024) throw ZipError('too-big', 'Archivo demasiado grande');

    const eocdOff = findEocd(bytes);
    const eocd = new DataView(bytes.buffer, bytes.byteOffset + eocdOff, 22);
    const count = u16(eocd, 10);
    const cdSize = u32(eocd, 12);
    const cdOff = u32(eocd, 16);

    if (cdOff + cdSize > bytes.length) throw ZipError('corrupt', 'Directorio central fuera de rango');
    if (count > limits.maxFiles) throw ZipError('too-many-files', 'Demasiados archivos (' + count + ')');

    const files = [];
    const warnings = [];
    const skipped = [];
    let total = 0;
    let pos = cdOff;
    const seen = new Set();

    for (let i = 0; i < count; i++) {
      if (pos + 46 > bytes.length) throw ZipError('corrupt', 'Entrada de directorio truncada');
      const dv = new DataView(bytes.buffer, bytes.byteOffset + pos, 46);
      if (u32(dv, 0) !== 0x02014b50) throw ZipError('corrupt', 'Firma de entrada inválida');
      const flags = u16(dv, 8);
      const method = u16(dv, 10);
      const crc = u32(dv, 16);
      const csize = u32(dv, 20);
      const usize = u32(dv, 24);
      const nameLen = u16(dv, 28);
      const extraLen = u16(dv, 30);
      const commentLen = u16(dv, 32);
      const lho = u32(dv, 42);
      const path = readUtf8(bytes, pos + 46, nameLen).trim();

      pos += 46 + nameLen + extraLen + commentLen;
      if (pos > bytes.length) throw ZipError('corrupt', 'Directorio truncado');

      if (flags & 0x0001) { skipped.push(path || '?'); warnings.push('Cifrado no soportado: ' + path); continue; }
      if (csize === 0xFFFFFFFF || usize === 0xFFFFFFFF) { warnings.push('ZIP64 no soportado: ' + path); skipped.push(path); continue; }
      if (method !== 0 && method !== 8) { warnings.push('Método no soportado: ' + path); skipped.push(path); continue; }

      /* Rutas seguras */
      const clean = U.normalizeRelPath(path);
      if (!clean || !U.isSafePath(clean)) { warnings.push('Ruta no segura ignorada: ' + path); skipped.push(path); continue; }
      if (seen.has(clean)) { warnings.push('Ruta duplicada ignorada: ' + clean); continue; }
      seen.add(clean);

      /* Declared limits (checked again after decompress) */
      if (usize > limits.maxFileBytes) { warnings.push('Archivo demasiado grande, ignorado: ' + clean); skipped.push(clean); continue; }
      if (total + usize > limits.maxTotalBytes) throw ZipError('bomb-total', 'Tamaño total descomprimido excede el límite');
      if (method === 8 && csize > 0 && usize / csize > limits.maxRatio) {
        warnings.push('Ratio de compresión sospechoso, ignorado: ' + clean);
        skipped.push(clean);
        continue;
      }

      /* Cabecera local */
      if (lho + 30 > bytes.length) throw ZipError('corrupt', 'Cabecera local fuera de rango');
      const ldv = new DataView(bytes.buffer, bytes.byteOffset + lho, 30);
      if (u32(ldv, 0) !== 0x04034b50) throw ZipError('corrupt', 'Cabecera local inválida');
      const lNameLen = u16(ldv, 26);
      const lExtraLen = u16(ldv, 28);
      const dataStart = lho + 30 + lNameLen + lExtraLen;
      const dataEnd = dataStart + csize;
      if (dataEnd > bytes.length) throw ZipError('corrupt', 'Datos fuera de rango: ' + clean);
      const comp = bytes.subarray(dataStart, dataEnd);

      let out;
      if (method === 0) {
        out = comp;
      } else {
        if (!hasDecompressionStream()) {
          throw ZipError('no-inflate', 'Este entorno no puede descomprimir (DecompressionStream no disponible)');
        }
        out = await inflateRaw(comp, limits.maxFileBytes);
      }

      /* Real post-decompress verification (do not trust declared sizes) */
      if (out.length > limits.maxFileBytes) throw ZipError('bomb-file', 'Archivo descomprimido demasiado grande: ' + clean);
      total += out.length;
      if (total > limits.maxTotalBytes) throw ZipError('bomb-total', 'Tamaño total descomprimido excede el límite');
      if (crc32(out) !== crc) { warnings.push('CRC inválido, ignorado: ' + clean); skipped.push(clean); continue; }

      files.push({ path: clean, bytes: out });
    }

    return { files, warnings, skipped };
  }

  /* ---------- Export ---------- */
  CS.zip = {
    crc32,
    buildZip,
    readZip,
    ZipError,
    hasCompressionStream,
    hasDecompressionStream,
    DEFAULT_READ_LIMITS
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = CS.zip; }
})();
