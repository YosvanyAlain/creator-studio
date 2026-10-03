/* Audio engine: 8-bit effect synth, step tracker, WAV encode/decode and sample edits. Mono, 22 050 Hz. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const SR = 22050;
  const WAVES = ['square', 'triangle', 'sine', 'sawtooth', 'noise'];
  const num = (v, d) => { const n = Number(v); return isFinite(n) ? n : d; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const PRESETS = {
    jump: { icon: 'arrowUp', es: 'Salto', en: 'Jump', opts: { dur: 0.18, f0: 250, f1: 720, wave: 'square', duty: 0.35 } },
    coin: { icon: 'star', es: 'Moneda', en: 'Coin', opts: { dur: 0.16, f0: 988, f1: 1319, wave: 'square', slide: 'step', releaseMs: 60 } },
    laser: { icon: 'bolt', es: 'Láser', en: 'Laser', opts: { dur: 0.25, f0: 1500, f1: 180, wave: 'sawtooth', slide: 'exp' } },
    shoot: { icon: 'target', es: 'Disparo', en: 'Shoot', opts: { dur: 0.14, f0: 900, f1: 120, wave: 'square', noise: 0.35, slide: 'exp' } },
    boom: { icon: 'sparkles', es: 'Explosión', en: 'Explosion', opts: { dur: 0.6, f0: 120, f1: 30, wave: 'triangle', noise: 0.85, releaseMs: 400 } },
    powerup: { icon: 'bolt', es: 'Power-up', en: 'Power-up', opts: { dur: 0.4, f0: 220, f1: 1100, wave: 'square', vibrato: 0.25, vibratoHz: 14 } },
    hurt: { icon: 'heart', es: 'Daño', en: 'Hurt', opts: { dur: 0.22, f0: 420, f1: 90, wave: 'sawtooth', noise: 0.15 } },
    blip: { icon: 'cursor', es: 'Toque', en: 'Tap', opts: { dur: 0.05, f0: 820, f1: 820, wave: 'sine', releaseMs: 20 } },
    select: { icon: 'check', es: 'Elegir', en: 'Select', opts: { dur: 0.12, f0: 660, f1: 990, wave: 'triangle', slide: 'step' } },
    win: { icon: 'trophy', es: 'Victoria', en: 'Win', opts: { dur: 0.6, f0: 523, f1: 1047, wave: 'square', slide: 'step', steps: 4, releaseMs: 150 } },
    lose: { icon: 'arrowDown', es: 'Derrota', en: 'Lose', opts: { dur: 0.7, f0: 392, f1: 98, wave: 'triangle', vibrato: 0.08, vibratoHz: 6, releaseMs: 300 } },
    teleport: { icon: 'wand', es: 'Teletransporte', en: 'Teleport', opts: { dur: 0.45, f0: 300, f1: 2400, wave: 'sine', vibrato: 0.4, vibratoHz: 28, slide: 'exp' } }
  };

  function rng(seed) {
    let s = seed || 123456789;
    return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967295) * 2 - 1; };
  }

  function osc(wave, phase, duty) {
    const x = phase % (Math.PI * 2);
    if (wave === 'sine') return Math.sin(x);
    if (wave === 'square') return x < Math.PI * 2 * (duty || 0.5) ? 1 : -1;
    if (wave === 'sawtooth') return x / Math.PI - 1;
    if (wave === 'triangle') return x < Math.PI ? x / (Math.PI / 2) - 1 : 3 - x / (Math.PI / 2);
    return Math.sin(x);
  }

  function normalizeOpts(opts) {
    const o = opts || {};
    return {
      dur: clamp(num(o.dur, 0.2), 0.02, 3), f0: clamp(num(o.f0, 440), 20, 12000), f1: clamp(num(o.f1, num(o.f0, 440)), 20, 12000),
      wave: WAVES.includes(o.wave) && o.wave !== 'noise' ? o.wave : 'square', noise: clamp(num(o.noise, o.wave === 'noise' ? 1 : 0), 0, 1),
      vol: clamp(num(o.vol, 0.6), 0, 1), attackMs: clamp(num(o.attackMs, 4), 0, 2000), releaseMs: clamp(num(o.releaseMs, 30), 0, 3000),
      duty: clamp(num(o.duty, 0.5), 0.05, 0.95), slide: ['lin', 'exp', 'step'].includes(o.slide) ? o.slide : 'lin',
      steps: clamp(num(o.steps, 2), 2, 8) | 0, vibrato: clamp(num(o.vibrato, 0), 0, 1), vibratoHz: clamp(num(o.vibratoHz, 8), 0.5, 40),
      bit8: o.bit8 !== false, seed: o.seed || 123456789
    };
  }

  /* One effect sound. Returns Float32Array samples in -1..1. */
  function synth(opts) {
    const o = normalizeOpts(opts);
    const rand = rng(o.seed);
    const n = Math.max(1, Math.round(o.dur * SR));
    const out = new Float32Array(n);
    const atk = (o.attackMs / 1000) * SR, rel = Math.min(n, (o.releaseMs / 1000) * SR);
    let phase = 0;
    let hold = 0;
    for (let i = 0; i < n; i++) {
      const p = n === 1 ? 0 : i / (n - 1);
      let f;
      if (o.slide === 'exp') f = o.f0 * Math.pow(o.f1 / o.f0, p);
      else if (o.slide === 'step') { const k = Math.min(o.steps - 1, Math.floor(p * o.steps)); f = o.f0 + ((o.f1 - o.f0) * k) / (o.steps - 1); }
      else f = o.f0 + (o.f1 - o.f0) * p;
      if (o.vibrato) f *= 1 + o.vibrato * 0.5 * Math.sin((2 * Math.PI * o.vibratoHz * i) / SR);
      phase += (Math.PI * 2 * f) / SR;
      /* Noise is sample-and-hold at the current pitch, which gives it a "tone". */
      if (o.noise && (i === 0 || Math.floor(phase / Math.PI) !== Math.floor((phase - (Math.PI * 2 * f) / SR) / Math.PI))) hold = rand();
      let s = osc(o.wave, phase, o.duty) * (1 - o.noise) + hold * o.noise;
      let env = 1;
      if (atk > 0 && i < atk) env = i / atk;
      if (rel > 0 && i > n - rel) env *= (n - i) / rel;
      s *= env * o.vol;
      out[i] = o.bit8 ? Math.round(clamp(s, -1, 1) * 31) / 31 : clamp(s, -1, 1);
    }
    return out;
  }

  /* Random variation of an effect, for the "surprise me" button. */
  function mutate(opts, amount) {
    const o = normalizeOpts(opts);
    const r = rng((Date.now() ^ (Math.random() * 1e9)) | 0);
    const k = amount == null ? 0.25 : amount;
    const vary = (v, lo, hi) => clamp(v * (1 + r() * k), lo, hi);
    return Object.assign({}, o, {
      f0: Math.round(vary(o.f0, 40, 4000)), f1: Math.round(vary(o.f1, 40, 4000)), dur: Number(vary(o.dur, 0.04, 1.5).toFixed(2)),
      duty: Number(vary(o.duty, 0.1, 0.9).toFixed(2)), noise: Number(clamp(o.noise + r() * k * 0.3, 0, 1).toFixed(2)), seed: (r() * 1e9) | 0
    });
  }

  /* ---------- Tracker ---------- */
  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const NOTES = [];
  for (let oct = 2; oct <= 6; oct++) NAMES.forEach((name, i) => NOTES.push({ id: name + oct, freq: 440 * Math.pow(2, (oct - 4) + (i - 9) / 12) }));
  const FREQ = Object.fromEntries(NOTES.map((n) => [n.id, n.freq]));
  /* 2.0 used ids like "C-4". */
  const freqOf = (note) => FREQ[String(note || '').replace('-', '')] || 0;

  function emptySong(steps) {
    const n = steps === 32 ? 32 : 16;
    const track = (wave, volume, name) => ({ name, wave, volume, steps: new Array(n).fill('') });
    return { v: 2, bpm: 120, steps: n, tracks: [track('square', 0.5, 'lead'), track('triangle', 0.55, 'bass'), track('sine', 0.4, 'harmony'), track('noise', 0.3, 'drums')] };
  }

  function renderSong(song, loops) {
    const s = song || emptySong();
    const bpm = clamp(num(s.bpm, 120), 40, 260);
    const steps = s.steps || ((s.tracks && s.tracks[0] && s.tracks[0].steps.length) || 16);
    const stepN = Math.max(1, Math.round((60 / bpm / 4) * SR));
    const reps = Math.max(1, loops | 0 || 1);
    const out = new Float32Array(stepN * steps * reps);
    const rand = rng(987654321);
    (s.tracks || []).forEach((track) => {
      const vol = clamp(num(track.volume, 0.5), 0, 1);
      const wave = track.wave || 'square';
      (track.steps || []).forEach((note, si) => {
        if (si >= steps || !note || note === '---') return;
        const f = freqOf(note);
        const isNoise = wave === 'noise';
        if (!f && !isNoise) return;
        /* Drum track: below 100 Hz a kick, below 500 Hz a snare, above that a hi-hat. */
        const drum = !isNoise ? null : (f && f < 100 ? 'kick' : f && f < 500 ? 'snare' : 'hat');
        const len = drum === 'kick' ? Math.round(SR * 0.22) : drum === 'snare' ? Math.round(SR * 0.16) : drum === 'hat' ? Math.round(SR * 0.05) : stepN;
        for (let rep = 0; rep < reps; rep++) {
          let phase = 0, hold = 0, prev = 0;
          for (let i = 0; i < len; i++) {
            const idx = rep * steps * stepN + si * stepN + i;
            if (idx >= out.length) break;
            let s, env;
            if (drum === 'kick') {
              phase += (Math.PI * 2 * (40 + 110 * Math.exp(-i / (SR * 0.03)))) / SR;
              s = Math.sin(phase) * 1.6;
              env = Math.exp(-i / (SR * 0.07));
            } else if (drum) {
              const n = rand();
              s = drum === 'hat' ? n - prev : n * 0.8 + Math.sin((i * 2 * Math.PI * 190) / SR) * 0.35;
              prev = n;
              env = Math.exp(-i / (SR * (drum === 'hat' ? 0.012 : 0.045)));
            } else {
              phase += (Math.PI * 2 * f) / SR;
              s = osc(wave, phase, 0.5);
              const att = Math.min(len * 0.1, SR * 0.008);
              const relN = len * 0.35;
              env = i < att ? i / att : 1;
              if (i > len - relN) env *= Math.max(0, (len - i) / relN);
            }
            hold = s;
            out[idx] = clamp(out[idx] + hold * vol * env * 0.6, -1, 1);
          }
        }
      });
    });
    return out;
  }

  /* ---------- WAV ---------- */
  function toWav(samples, bit8, rate) {
    const sr = rate || SR;
    const bits = bit8 ? 8 : 16;
    const n = samples.length;
    const dataLen = n * (bits / 8);
    const buf = new Uint8Array(44 + dataLen);
    const dv = new DataView(buf.buffer);
    const str = (off, s) => { for (let i = 0; i < s.length; i++) buf[off + i] = s.charCodeAt(i); };
    str(0, 'RIFF'); dv.setUint32(4, 36 + dataLen, true); str(8, 'WAVE'); str(12, 'fmt ');
    dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, sr, true);
    dv.setUint32(28, sr * (bits / 8), true); dv.setUint16(32, bits / 8, true); dv.setUint16(34, bits, true);
    str(36, 'data'); dv.setUint32(40, dataLen, true);
    if (bit8) for (let i = 0; i < n; i++) buf[44 + i] = clamp(Math.round(samples[i] * 127) + 128, 0, 255);
    else for (let i = 0; i < n; i++) dv.setInt16(44 + i * 2, clamp(Math.round(samples[i] * 32767), -32768, 32767), true);
    return buf;
  }

  function parseWav(bytes) {
    if (!bytes || bytes.length < 44) return null;
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    const tag = (o) => String.fromCharCode(u8[o], u8[o + 1], u8[o + 2], u8[o + 3]);
    if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return null;
    let fmt = null, data = null, o = 12;
    while (o + 8 <= u8.length) {
      const id = tag(o), len = dv.getUint32(o + 4, true), body = o + 8;
      if (id === 'fmt ' && len >= 16) {
        fmt = { format: dv.getUint16(body, true), ch: dv.getUint16(body + 2, true), sr: dv.getUint32(body + 4, true), bits: dv.getUint16(body + 14, true) };
        if (fmt.format === 0xfffe && len >= 26) fmt.format = dv.getUint16(body + 24, true);
      } else if (id === 'data') {
        data = { start: body, len: Math.min(len, u8.length - body) };
        if (fmt) break;
      }
      o = body + len + (len & 1);
    }
    if (!fmt || !data || !fmt.ch || !fmt.sr) return null;
    const bps = fmt.bits / 8, frame = bps * fmt.ch;
    const pcm = fmt.format === 1, flt = fmt.format === 3 && fmt.bits === 32;
    if (!(pcm && [8, 16, 24, 32].includes(fmt.bits)) && !flt) return null;
    const n = Math.floor(data.len / frame);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let c = 0; c < fmt.ch; c++) {
        const q = data.start + i * frame + c * bps;
        let v;
        if (flt) v = dv.getFloat32(q, true);
        else if (fmt.bits === 8) v = (u8[q] - 128) / 128;
        else if (fmt.bits === 16) v = dv.getInt16(q, true) / 32768;
        else if (fmt.bits === 24) v = (((u8[q + 2] << 24) | (u8[q + 1] << 16) | (u8[q] << 8)) >> 8) / 8388608;
        else v = dv.getInt32(q, true) / 2147483648;
        sum += v;
      }
      out[i] = sum / fmt.ch;
    }
    return { samples: out, sr: fmt.sr };
  }

  /* ---------- Edits (all return new arrays) ---------- */
  function resample(samples, fromSr, toSr) {
    const to = toSr || SR;
    if (!fromSr || fromSr === to) return samples;
    const n = Math.max(1, Math.round((samples.length * to) / fromSr));
    const o = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * fromSr) / to, a = Math.floor(x), b = Math.min(samples.length - 1, a + 1), f = x - a;
      o[i] = samples[a] * (1 - f) + samples[b] * f;
    }
    return o;
  }
  function fade(s, dir, secs) {
    const o = new Float32Array(s);
    const n = Math.min(o.length, Math.max(1, Math.round((secs || 0.3) * SR)));
    for (let i = 0; i < n; i++) { const k = i / n; if (dir === 'in') o[i] *= k; else o[o.length - 1 - i] *= k; }
    return o;
  }
  const speed = (s, factor) => resample(s, Math.round(SR * clamp(num(factor, 1), 0.25, 4)), SR);
  function reverse(s) { const o = new Float32Array(s.length); for (let i = 0; i < s.length; i++) o[i] = s[s.length - 1 - i]; return o; }
  function gain(s, g) { const k = clamp(num(g, 1), 0, 8); const o = new Float32Array(s.length); for (let i = 0; i < s.length; i++) o[i] = clamp(s[i] * k, -1, 1); return o; }
  function normalize(s, peak) {
    let m = 0;
    for (let i = 0; i < s.length; i++) m = Math.max(m, Math.abs(s[i]));
    return m ? gain(s, (peak || 0.95) / m) : new Float32Array(s);
  }
  function echo(s, delaySec, feedback) {
    const d = Math.max(1, Math.round(clamp(num(delaySec, 0.18), 0.02, 1) * SR));
    const fb = clamp(num(feedback, 0.4), 0, 0.85);
    const o = new Float32Array(s.length + d * 4);
    o.set(s);
    for (let i = d; i < o.length; i++) o[i] = clamp(o[i] + o[i - d] * fb, -1, 1);
    return trimSilence(o, 0.002, true);
  }
  function trimSilence(s, thresh, endOnly) {
    const t = thresh == null ? 0.01 : thresh;
    let a = 0, b = s.length - 1;
    if (!endOnly) while (a < s.length && Math.abs(s[a]) < t) a++;
    while (b > a && Math.abs(s[b]) < t) b--;
    return b <= a ? new Float32Array(s) : s.slice(a, b + 1);
  }
  /* Selection edits: a and b are sample indices. */
  const crop = (s, a, b) => s.slice(Math.max(0, a), Math.min(s.length, b));
  function cut(s, a, b) { const o = new Float32Array(s.length - (b - a)); o.set(s.subarray(0, a)); o.set(s.subarray(b), a); return o; }
  function silence(s, a, b) { const o = new Float32Array(s); o.fill(0, a, b); return o; }

  /* Min/max per bucket, for drawing a waveform. */
  function peaks(s, buckets) {
    const n = Math.max(1, buckets | 0);
    const out = new Float32Array(n * 2);
    const per = s.length / n;
    for (let i = 0; i < n; i++) {
      let lo = 0, hi = 0;
      const a = Math.floor(i * per), b = Math.min(s.length, Math.floor((i + 1) * per) + 1);
      for (let k = a; k < b; k++) { if (s[k] < lo) lo = s[k]; if (s[k] > hi) hi = s[k]; }
      out[i * 2] = lo; out[i * 2 + 1] = hi;
    }
    return out;
  }

  /* ---------- Browser playback and decoding ---------- */
  let ctx = null;
  let playing = null;
  function context() {
    if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function stop() { if (playing) { try { playing.stop(); } catch (e) { /* already stopped */ } playing = null; } }
  /* Plays samples; resolves when finished. onTick(seconds) is called while playing. */
  function play(samples, onTick) {
    stop();
    const ac = context();
    if (!ac || !samples.length) return Promise.resolve();
    const buf = ac.createBuffer(1, samples.length, SR);
    buf.copyToChannel(samples instanceof Float32Array ? samples : Float32Array.from(samples), 0);
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.connect(ac.destination);
    const started = ac.currentTime;
    playing = src;
    let raf = 0;
    const tick = () => { if (playing !== src) return; if (onTick) onTick(ac.currentTime - started); raf = requestAnimationFrame(tick); };
    src.start();
    raf = requestAnimationFrame(tick);
    return new Promise((resolve) => { src.onended = () => { cancelAnimationFrame(raf); if (playing === src) playing = null; if (onTick) onTick(-1); resolve(); }; });
  }
  /* WAV parsed directly; other formats (mp3, ogg, m4a) through the browser decoder. */
  async function decode(bytes) {
    const wav = parseWav(bytes);
    if (wav) return resample(wav.samples, wav.sr, SR);
    const ac = context();
    if (!ac) throw new Error('no-audio');
    const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const buf = await new Promise((resolve, reject) => ac.decodeAudioData(copy, resolve, reject));
    const ch = buf.numberOfChannels;
    const mono = new Float32Array(buf.length);
    for (let c = 0; c < ch; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) mono[i] += d[i] / ch; }
    return resample(mono, buf.sampleRate, SR);
  }

  CS.audio = {
    SR, WAVES, PRESETS, NOTES, freqOf, synth, mutate, normalizeOpts, emptySong, renderSong,
    toWav, parseWav, resample, fade, speed, reverse, gain, normalize, echo, trimSilence, crop, cut, silence, peaks,
    context, play, stop, decode, get playing() { return !!playing; }
  };
})();
