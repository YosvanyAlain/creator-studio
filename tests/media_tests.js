/* Unit tests for the image and audio editor pure helpers (2.0). */
'use strict';
module.exports = async function ({ test, eq, ok, CS }) {
  process.stdout.write('\n== editores multimedia 2.0 ==\n');
  const A = CS.audioEditor, I = CS.imageEditor;

  /* Build a WAV with an optional LIST chunk before "data", any channel count and bit depth. */
  function wav({ ch = 1, bits = 16, sr = 22050, frames = [], list = false, float = false }) {
    const bps = bits / 8, data = frames.length * ch * bps;
    const extra = list ? 8 + 10 : 0;
    const buf = new ArrayBuffer(44 + extra + data), dv = new DataView(buf), u8 = new Uint8Array(buf);
    const str = (o, s) => { for (let i = 0; i < s.length; i++) u8[o + i] = s.charCodeAt(i); };
    str(0, 'RIFF'); dv.setUint32(4, 36 + extra + data, true); str(8, 'WAVE');
    str(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, float ? 3 : 1, true); dv.setUint16(22, ch, true);
    dv.setUint32(24, sr, true); dv.setUint32(28, sr * ch * bps, true); dv.setUint16(32, ch * bps, true); dv.setUint16(34, bits, true);
    let o = 36;
    if (list) { str(o, 'LIST'); dv.setUint32(o + 4, 10, true); str(o + 8, 'INFOabcdef'); o += 18; }
    str(o, 'data'); dv.setUint32(o + 4, data, true); o += 8;
    frames.forEach((fr) => fr.forEach((v) => {
      if (float) dv.setFloat32(o, v, true);
      else if (bits === 16) dv.setInt16(o, Math.round(v * 32767), true);
      else if (bits === 24) { const x = Math.round(v * 8388607); u8[o] = x & 255; u8[o + 1] = (x >> 8) & 255; u8[o + 2] = (x >> 16) & 255; }
      else if (bits === 8) u8[o] = Math.round(v * 127 + 128);
      o += bps;
    }));
    return u8;
  }
  const near = (a, b, e) => Math.abs(a - b) <= (e || 0.01);

  await test('audio: parseWav salta chunks extra (LIST) antes de data', () => {
    const r = A.parseWav(wav({ frames: [[0.5], [-0.5], [0.25]], list: true }));
    ok(r, 'parsed'); eq(r.samples.length, 3);
    ok(near(r.samples[0], 0.5) && near(r.samples[1], -0.5) && near(r.samples[2], 0.25), 'muestras correctas');
  });
  await test('audio: parseWav mezcla estéreo a mono y lee 24 bits y float', () => {
    const st = A.parseWav(wav({ ch: 2, frames: [[1, 0], [0.5, -0.5]] }));
    eq(st.samples.length, 2); ok(near(st.samples[0], 0.5) && near(st.samples[1], 0), 'promedio de canales');
    const b24 = A.parseWav(wav({ bits: 24, frames: [[-0.75], [0.5]] }));
    ok(near(b24.samples[0], -0.75, 0.001) && near(b24.samples[1], 0.5, 0.001), '24 bits');
    const f = A.parseWav(wav({ bits: 32, float: true, sr: 44100, frames: [[0.125]] }));
    ok(near(f.samples[0], 0.125, 1e-6)); eq(f.sr, 44100);
    eq(A.parseWav(new Uint8Array(60)), null, 'basura → null');
  });
  await test('audio: el WAV propio vuelve idéntico (toWav → parseWav)', () => {
    const smp = A.synth(A.PRESETS.coin.opts);
    const back = A.parseWav(A.toWav(smp, false).bytes);
    eq(back.samples.length, smp.length);
    let mx = 0; for (let i = 0; i < smp.length; i++) mx = Math.max(mx, Math.abs(back.samples[i] - smp[i]));
    ok(mx < 0.001, 'error máx ' + mx);
  });
  await test('audio: fades y velocidad', () => {
    const one = new Float32Array(A.SAMPLE_RATE).fill(1);
    const fi = A.fadeSamples(one, 'in', 0.5), fo = A.fadeSamples(one, 'out', 0.5);
    eq(fi[0], 0); ok(near(fi[Math.round(A.SAMPLE_RATE * 0.25)], 0.5), 'mitad del fade'); eq(fi[one.length - 1], 1);
    eq(fo[0], 1); ok(fo[one.length - 1] < 0.001, 'termina en silencio');
    eq(one[0], 1, 'no muta la entrada');
    eq(A.speedSamples(one, 2).length, A.SAMPLE_RATE / 2);
    eq(A.speedSamples(one, 0.5).length, A.SAMPLE_RATE * 2);
    eq(A.speedSamples(one, 100).length, Math.round(A.SAMPLE_RATE / 4), 'factor acotado');
  });

  function blocky(size, k, colorAt) {
    const w = size * k, px = new Uint8ClampedArray(w * w * 4);
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
      const c = colorAt(Math.floor(x / k), Math.floor(y / k)), o = (y * w + x) * 4;
      px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = c[3];
    }
    return { px, w };
  }
  const checker = (x, y) => ((x + y) % 2 ? [255, 0, 0, 255] : [0, 0, 0, 0]);
  await test('image: detecta la rejilla de un pixel art escalado (×8, ×1)', () => {
    let b = blocky(16, 8, checker); eq(I.detectPixelGrid(b.px, b.w, b.w), 16);
    b = blocky(8, 1, checker); eq(I.detectPixelGrid(b.px, b.w, b.w), 8);
    b = blocky(24, 4, checker); eq(I.detectPixelGrid(b.px, b.w, b.w), 24);
    const g = I.sampleGrid(blocky(16, 8, checker).px, 128, 16);
    eq(g.length, 16 * 16 * 4); eq(g[3], 0, 'celda 0 transparente'); eq(g[4], 255, 'celda 1 roja');
  });
  await test('image: una foto (no uniforme) o no cuadrada no es pixel art', () => {
    const w = 64, px = new Uint8ClampedArray(w * w * 4);
    for (let i = 0; i < px.length; i += 4) { px[i] = (i * 7) % 256; px[i + 1] = (i * 13) % 256; px[i + 2] = 9; px[i + 3] = 255; }
    eq(I.detectPixelGrid(px, w, w), 0);
    eq(I.detectPixelGrid(px, 64, 32), 0);
  });

  process.stdout.write('\n== validador 2.0 ==\n');
  const V = CS.validator;
  await test('validador: sendUpdateCalls separa argumentos respetando cadenas y anidación', () => {
    const c = V.sendUpdateCalls("w.sendUpdate({ payload: { a: [1, 2] }, info: 'x, y' }, ''); // sendUpdate() en un comentario\nsendUpdate(u)");
    eq(c.length, 2);
    eq(c[0].length, 2); eq(c[0][1], "''");
    eq(c[1].length, 1, 'un solo argumento');
  });
  await test('validador: avisa del descr obsoleto solo cuando hace falta', async () => {
    const mk = (js) => {
      const p = CS.projects.fromTemplate('blank', 'V');
      p.files['app.js'] = { kind: 'text', content: js + "\nwindow.webxdc.setUpdateListener(function () {}, 0);" };
      return p;
    };
    const keys = async (p) => { const r = await V.validate(p); return (Array.isArray(r) ? r : r.issues).map((i) => i.key); };
    ok((await keys(mk("window.webxdc.sendUpdate({ payload: 1 });"))).includes('v_update_descr'), 'sin segundo argumento');
    ok((await keys(mk("window.webxdc.sendUpdate({ payload: 1 }, 'hola');"))).includes('v_update_descr'), 'descr con texto');
    ok(!(await keys(mk("window.webxdc.sendUpdate({ payload: 1, info: 'hola' }, '');"))).includes('v_update_descr'), "con '' no avisa");
  });
  await test('validador: ninguna plantilla ni bloque generado dispara el aviso', async () => {
    for (const t of CS.tpl.list()) {
      const r = await V.validate(CS.projects.fromTemplate(t.id));
      const list = Array.isArray(r) ? r : r.issues;
      ok(!list.some((i) => i.key === 'v_update_descr'), t.id);
    }
    const B = CS.blocks;
    for (const type of ['send_update', 'send_update_score', 'send_update_payload']) {
      if (!B.DEFS[type]) continue;
      const m = B.newModel();
      const blk = B.newBlock(type);
      Object.keys(blk.params).forEach((k) => {
        const v = blk.params[k];
        if (v && typeof v === 'object' && v.kind === 'text' && !v.value) v.value = '1';
        if (v === '' ) blk.params[k] = 'dato';
      });
      m.contexts.onStart.push(blk);
      const code = B.generate(m).code;
      V.sendUpdateCalls(code).forEach((args) => { eq(args.length, 2, type + ' pasa 2 argumentos'); eq(args[1], "''", type); });
    }
  });
};
