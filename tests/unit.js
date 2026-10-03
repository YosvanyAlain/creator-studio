/* Unit tests for the pure engines (no browser): node tests/unit.js */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const SRC = path.join(__dirname, '..', 'src');
let passed = 0;
const failed = [];
let suite = '';

function ok(name, value, detail) {
  if (value) passed++;
  else { failed.push(suite + ' › ' + name + (detail !== undefined ? ' (' + detail + ')' : '')); console.log('  FAIL ' + name + (detail !== undefined ? ' — ' + detail : '')); }
}
const queue = [];
function describe(name, fn) { queue.push([name, fn]); }
async function run() {
  for (const [name, fn] of queue) {
    suite = name;
    const before = failed.length;
    try { await fn(); } catch (error) { failed.push(name + ' › crashed: ' + String(error.stack || error).split('\n').slice(0, 3).join(' | ')); }
    console.log((failed.length === before ? 'PASS ' : 'FAIL ') + name);
  }
}

/* Loads source files into a fresh context with only what the engines need. */
function load(files, extra) {
  const c = Object.assign({
    console, Math, Date, Object, Number, String, Array, JSON, Map, Set, Promise, RegExp, Error, TypeError,
    Uint8Array, Uint8ClampedArray, Uint16Array, Uint32Array, Int16Array, Float32Array, ArrayBuffer, DataView,
    TextEncoder, TextDecoder, setTimeout, clearTimeout,
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'), atob: (s) => Buffer.from(s, 'base64').toString('binary')
  }, extra || {});
  c.globalThis = c;
  c.window = c;
  vm.createContext(c);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), c, { filename: f });
  return c.CS;
}

describe('color', () => {
  const C = load(['kernel/cs.js', 'engines/colorkit.js']).color;
  ok('parse hex short', C.hex('#abc') === '#aabbcc');
  ok('parse rgb', C.hex('rgb(229, 72, 77)') === '#e5484d');
  ok('hsl roundtrip', C.fromHsl(...Object.values(C.hsl('#5146e0'))).slice(0, 5) === '#5146' || C.contrast(C.fromHsl(...Object.values(C.hsl('#5146e0'))), '#5146e0') < 1.05);
  ok('contrast black/white = 21', C.contrast('#000', '#fff') === 21);
  ok('contrast same = 1', C.contrast('#777', '#777') === 1);
  const g = C.grade(4.6);
  ok('grade AA not AAA', g.aa && !g.aaa && g.aaLarge);
  ok('readable text', C.readableOn('#111111') === '#ffffff' && C.readableOn('#fefefe') === '#111111');
  ok('triad has 3', C.harmony('#ff0000', 'triad').length === 3);
  ok('complementary of red is cyan', C.harmony('#ff0000', 'complementary')[1] === '#00ffff');
  ok('scale 9 steps light to dark', (() => { const s = C.scale('#5146e0'); return s.length === 9 && C.luminance(s[0].hex) > C.luminance(s[8].hex); })());
  ok('invalid is null', C.hex('nope') === null);
});

describe('qr', () => {
  const Q = load(['kernel/cs.js', 'engines/qr.js']).qr;
  const a = Q.encode('HELLO', { level: 'M', boost: false });
  ok('version 1 for short text', a.version === 1 && a.size === 21);
  const m = a.modules;
  const finder = (x, y) => m[y][x] && m[y][x + 6] && m[y + 6][x] && m[y + 6][x + 6] && !m[y + 1][x + 1] && m[y + 3][x + 3];
  ok('three finder patterns', finder(0, 0) && finder(a.size - 7, 0) && finder(0, a.size - 7));
  ok('timing pattern', [8, 9, 10, 11, 12].every((i) => m[6][i] === (i % 2 === 0)));
  ok('dark module', m[a.size - 8][8] === true);
  ok('utf-8 picks bigger version', Q.encode('ñ'.repeat(40), { level: 'H', boost: false }).version > 1);
  ok('version 40 limit', (() => { try { Q.encode('x'.repeat(3000), { level: 'L' }); return false; } catch (e) { return e.code === 'too-long'; } })());
  ok('capacity v1-L = 17 bytes', Q.capacity(1, 'L') === 17 && Q.capacity(40, 'L') === 2953);
  ok('boost raises level when free', Q.encode('HI', { level: 'L' }).level === 'H');
  /* Matrices were decoded by real QR readers (OpenCV / ZXing) when this snapshot was taken. */
  const hash = crypto.createHash('sha1').update(Q.encode('https://webxdc.org ñ', { level: 'Q', boost: false }).modules.map((r) => r.map(Number).join('')).join('|')).digest('hex').slice(0, 12);
  ok('matrix snapshot', hash === QR_SNAPSHOT, hash);
});
var QR_SNAPSHOT = '528d8d397f45';

describe('raster', () => {
  const R = load(['kernel/cs.js', 'engines/raster.js']).raster;
  const d = R.create(16, 16);
  const cel = d.frames[0].cels[0];
  const red = R.hexToRgba('#ff0000');
  R.linePoints(0, 0, 15, 15).forEach(([x, y]) => R.set(cel, 16, 16, x, y, red));
  ok('line', R.get(cel, 16, 7, 7)[0] === 255 && R.get(cel, 16, 7, 8)[3] === 0);
  ok('flood fill', R.fill(cel, 16, 16, 0, 15, R.hexToRgba('#00ff00')) === 120);
  ok('rect outline', R.rectPoints(0, 0, 3, 3, false).length === 12);
  const enc = R.rleEncode(cel);
  ok('rle roundtrip', Buffer.compare(Buffer.from(R.rleDecode(enc, 16, 16)), Buffer.from(cel)) === 0);
  const d2 = R.deserialize(JSON.parse(JSON.stringify(R.serialize(d))));
  ok('serialize', d2.w === 16 && R.get(d2.frames[0].cels[0], 16, 0, 15)[1] === 255);
  R.addLayer(d, 1, 'Top');
  R.set(d.frames[0].cels[1], 16, 16, 15, 0, R.hexToRgba('#0000ff80'));
  ok('composite alpha', R.composite(d, 0)[15 * 4 + 3] === 128);
  ok('merge down', R.mergeDown(d, 1) && d.layers.length === 1);
  const r = R.create(4, 2);
  R.set(r.frames[0].cels[0], 4, 2, 3, 0, red);
  R.rotate(r, true);
  ok('rotate', r.w === 2 && r.h === 4 && R.get(r.frames[0].cels[0], 2, 1, 3)[0] === 255);
  R.addFrame(d, 1, 0);
  const gif = R.encodeGif(d.frames.map((f, i) => R.composite(d, i)), 16, 16, { scale: 4, delay: 10 });
  ok('gif header', String.fromCharCode(...gif.slice(0, 6)) === 'GIF89a');
  const up = new Uint8ClampedArray(8 * 8 * 4);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const i = (y * 8 + x) * 4; up[i] = (x >> 2) * 200; up[i + 3] = 255; }
  ok('detect pixel scale', R.detectScale(up, 8, 8) === 4);
});

describe('audio', () => {
  const A = load(['kernel/cs.js', 'engines/audio.js']).audio;
  ok('presets are finite', Object.values(A.PRESETS).every((p) => { const s = A.synth(p.opts); return s.length && s.every((v) => isFinite(v) && Math.abs(v) <= 1); }));
  const s = A.synth(A.PRESETS.coin.opts);
  const p = A.parseWav(A.toWav(s, false));
  ok('wav roundtrip', p.sr === A.SR && p.samples.length === s.length && Math.abs(p.samples[100] - s[100]) < 1e-3);
  ok('wav 8 bit', A.toWav(s, true).length === 44 + s.length);
  ok('edits', A.reverse(Float32Array.from([1, 2, 3]))[0] === 3 && A.cut(Float32Array.from([1, 2, 3, 4]), 1, 3).join() === '1,4');
  const song = A.emptySong(16);
  song.tracks[0].steps[0] = 'C4';
  song.tracks[3].steps[4] = 'C2';
  const mix = A.renderSong(song);
  ok('song renders', mix.length === Math.round(60 / 120 / 4 * A.SR) * 16 && mix.some((v) => Math.abs(v) > 0.1));
  const old = { bpm: 100, tracks: [{ wave: 'square', volume: 0.5, steps: ['C-4', '---', 'E-4'].concat(new Array(13).fill('---')) }] };
  ok('2.0 songs still play', A.renderSong(old).some((v) => Math.abs(v) > 0.1));
  ok('A4 = 440 Hz', Math.abs(A.freqOf('A4') - 440) < 1e-9);
});

describe('zip', async () => {
  const Z = load(['kernel/cs.js', 'engines/zip.js'], { CompressionStream, DecompressionStream, Blob, Response }).zip;
  const html = '<h1>hola</h1>' + ' webxdc'.repeat(40);
  const bytes = await Z.build([{ path: 'index.html', data: html }, { path: 'img/a.bin', data: new Uint8Array([0, 1, 2, 255]) }]);
  ok('zip signature', bytes[0] === 0x50 && bytes[1] === 0x4b);
  ok('deflate used for text', bytes.length < html.length);
  const back = await Z.read(bytes);
  const get = (name) => (back.find((e) => e.path === name) || {}).data;
  ok('zip roundtrip', new TextDecoder().decode(get('index.html')) === html && get('img/a.bin')[3] === 255);
  ok('crc32', Z.crc32(new TextEncoder().encode('123456789')) >>> 0 === 0xcbf43926);
});

describe('blocks', () => {
  const CS = load(['kernel/cs.js', 'engines/blocks.js', 'engines/game-engine.js', 'engines/game-blocks.js']);
  const B = CS.blocks;
  ok('catalog size', Object.keys(B.DEFS).length >= 250, Object.keys(B.DEFS).length);
  const model = B.newModel ? B.newModel() : { version: 1, vars: [], events: [] };
  const first = B.generate(model).code;
  ok('empty model generates', typeof first === 'string');
  ok('deterministic', B.generate(model).code === first);
  for (const st of (B.GAME && B.GAME.STARTERS) || []) {
    for (const lang of ['es', 'en']) {
      const res = B.generate(st.build(lang));
      ok('game starter ' + st.id + ' ' + lang, res.code && !res.problems.length, res.problems.map((x) => x.code || x).join(','));
      try { new vm.Script(res.code); } catch (error) { ok('game starter ' + st.id + ' ' + lang + ' parses', false, error.message); }
    }
  }
});

describe('templates', () => {
  const CS = load(['kernel/cs.js', 'engines/blocks.js', 'engines/game-engine.js', 'engines/game-blocks.js',
    'templates/registry.js', 'templates/starters.js', 'templates/games-a.js', 'templates/games-b.js', 'templates/games-c.js',
    'templates/group-a.js', 'templates/group-b.js', 'templates/organize-a.js', 'templates/organize-b.js', 'templates/tools.js', 'templates/creative.js'],
  { CS_LANG: 'es' });
  const TP = CS.templates;
  const all = TP.list('all');
  ok('20 templates', all.length === 20, all.length);
  ok('3 starters', TP.starters().length === 3);
  const SPANISH = /[áéíóúñ¿¡]/i;
  for (const def of all.concat(TP.starters())) {
    for (const lang of ['es', 'en']) {
      const id = def.id + ' ' + lang;
      let out;
      try { out = TP.build(def, lang, TP.defaults(def, lang)); } catch (error) { ok(id + ' builds', false, error.message); continue; }
      ok(id + ' has index.html', !!out.files['index.html']);
      const js = out.files['app.js'];
      const code = js && (js.content != null ? js.content : js);
      if (code) {
        try { new vm.Script(String(code)); } catch (error) { ok(id + ' app.js parses', false, error.message); }
      }
      if (lang === 'en') {
        const text = Object.values(out.files).map((f) => (f && f.content != null ? f.content : String(f))).join('\n')
          .replace(/<!--[\s\S]*?-->|\/\*[\s\S]*?\*\//g, '');
        ok(id + ' has no Spanish text', !SPANISH.test(text), (text.match(/.{0,30}[áéíóúñ¿¡].{0,30}/i) || [''])[0]);
      }
    }
  }
});

run().then(() => {
  console.log('\n' + passed + ' checks passed, ' + failed.length + ' failed');
  if (failed.length) { failed.forEach((f) => console.log(' - ' + f)); process.exit(1); }
});
