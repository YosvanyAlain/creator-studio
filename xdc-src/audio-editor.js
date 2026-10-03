/* =========================================================================
 * Webxdc Creator Studio — audio-editor.js
 * 8-bit audio / WAV editor for project assets.
 * ========================================================================= */
'use strict';
(function () {
  const CS = (globalThis.CS = globalThis.CS || {});
  const U = CS.util;

  function t(key, params) { return CS.i18n.t(key, params); }

  const SR = 22050;

  const PRESETS = {
    jump:    { es: 'Salto',        en: 'Jump',       opts: { dur: 0.18, f0: 250, f1: 720, wave: 'square', noise: 0 } },
    coin:    { es: 'Moneda',       en: 'Coin',       opts: { dur: 0.12, f0: 900, f1: 1450, wave: 'square', noise: 0 } },
    laser:   { es: 'Láser',        en: 'Laser',      opts: { dur: 0.25, f0: 1500, f1: 180, wave: 'sawtooth', noise: 0 } },
    boom:    { es: 'Explosión',    en: 'Explosion',  opts: { dur: 0.55, f0: 120, f1: 40, wave: 'triangle', noise: 0.85 } },
    powerup: { es: 'Power-up',     en: 'Power-up',   opts: { dur: 0.35, f0: 200, f1: 1100, wave: 'square', noise: 0 } },
    hurt:    { es: 'Daño',         en: 'Hurt',       opts: { dur: 0.2, f0: 420, f1: 90, wave: 'sawtooth', noise: 0.1 } },
    blip:    { es: 'Blip (click)', en: 'Blip (tap)', opts: { dur: 0.06, f0: 800, f1: 800, wave: 'sine', noise: 0 } },
    win:     { es: 'Victoria',     en: 'Win',        opts: { dur: 0.5, f0: 520, f1: 1040, wave: 'triangle', noise: 0 } }
  };

  const NOTE_FREQ = {
    '---': 0,
    'C-3': 130.81, 'D-3': 146.83, 'E-3': 164.81, 'F-3': 174.61, 'G-3': 196, 'A-3': 220, 'B-3': 246.94,
    'C-4': 261.63, 'D-4': 293.66, 'E-4': 329.63, 'F-4': 349.23, 'G-4': 392, 'A-4': 440, 'B-4': 493.88,
    'C-5': 523.25, 'D-5': 587.33, 'E-5': 659.25, 'F-5': 698.46, 'G-5': 783.99, 'A-5': 880, 'B-5': 987.77
  };
  const NOTE_KEYS = Object.keys(NOTE_FREQ);

  function osc(wave, phase, duty) {
    const x = phase % (Math.PI * 2);
    if (wave === 'sine') return Math.sin(x);
    if (wave === 'square') return x < Math.PI * 2 * (duty || 0.5) ? 1 : -1;
    if (wave === 'sawtooth' || wave === 'saw') return (x / Math.PI) - 1;
    if (wave === 'triangle') return x < Math.PI ? (x / (Math.PI / 2)) - 1 : 3 - (x / (Math.PI / 2));
    if (wave === 'noise') return 0;
    return Math.sin(x);
  }

  function synth(opts) {
    opts = opts || {};
    const o = {
      dur: clamp(num(opts.dur, 0.2), 0.03, 2),
      f0: clamp(num(opts.f0, 440), 20, 12000),
      f1: clamp(num(opts.f1, 440), 20, 12000),
      wave: ['sine', 'square', 'sawtooth', 'triangle'].indexOf(opts.wave) >= 0 ? opts.wave : 'square',
      noise: clamp(num(opts.noise, 0), 0, 1),
      vol: clamp(num(opts.vol, 0.6), 0, 1),
      fadeInMs: clamp(num(opts.fadeInMs, 0), 0, 2000),
      fadeOutMs: clamp(num(opts.fadeOutMs, 0), 0, 2000),
      attackMs: clamp(num(opts.attackMs, 0), 0, 2000),
      decayMs: clamp(num(opts.decayMs, 0), 0, 2000),
      sustain: clamp(num(opts.sustain, 1), 0, 1),
      releaseMs: clamp(num(opts.releaseMs, 0), 0, 2000),
      duty: clamp(num(opts.duty, 0.5), 0.05, 0.95),
      slide: opts.slide === 'exp' ? 'exp' : 'lin',
      bit8: !!opts.bit8
    };
    let seed = 123456789;
    function rand() {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      return ((seed >>> 0) / 4294967295) * 2 - 1;
    }

    const n = Math.max(1, Math.round(o.dur * SR));
    const out = new Float32Array(n);
    let phase = 0;
    const atk = (o.attackMs || o.fadeInMs) / 1000 * SR;
    const dec = o.decayMs / 1000 * SR;
    const rel = (o.releaseMs || o.fadeOutMs) / 1000 * SR;
    const useAdsr = atk + dec + rel > 0 && o.sustain < 1 || atk > 0 || rel > 0;
    for (let i = 0; i < n; i++) {
      const p = n === 1 ? 0 : i / (n - 1);
      let f;
      if (o.slide === 'exp' && o.f0 > 0 && o.f1 > 0) f = o.f0 * Math.pow(o.f1 / o.f0, p);
      else f = o.f0 + (o.f1 - o.f0) * p;
      phase += (Math.PI * 2 * f) / SR;
      let s = osc(o.wave, phase, o.duty) * (1 - o.noise) + rand() * o.noise;
      let env = 1;
      if (useAdsr) {
        if (i < atk && atk > 0) env = i / atk;
        else if (i < atk + dec && dec > 0) env = 1 - (1 - o.sustain) * ((i - atk) / dec);
        else if (i > n - rel && rel > 0) env = o.sustain * ((n - i) / rel);
        else env = o.sustain;
      } else {
        const fi = o.fadeInMs / 1000 * SR;
        const fo = o.fadeOutMs / 1000 * SR;
        if (i < fi) env *= i / fi;
        if (i > n - fo) env *= (n - i) / fo;
      }
      s *= env * o.vol;
      out[i] = clamp(s, -1, 1);
    }

    const t0 = Math.round(clamp(num(opts.trimStartMs, 0), 0, Math.max(0, o.dur * 1000 - 10)) / 1000 * SR);
    const t1 = Math.round(clamp(num(opts.trimEndMs, 0), 0, Math.max(0, o.dur * 1000 - 10)) / 1000 * SR);
    if (t0 || t1) {
      out.subarray(0, t0).fill(0);
      out.subarray(Math.max(0, n - t1)).fill(0);
    }
    if (o.bit8) {
      for (let i = 0; i < n; i++) out[i] = Math.round(out[i] * 127) / 127;
    }
    return out;
  }

  function emptyMelody() {
    return {
      bpm: 120,
      tracks: [0, 1, 2].map(function (i) {
        return {
          wave: i === 2 ? 'noise' : (i === 1 ? 'triangle' : 'square'),
          volume: i === 2 ? 0.18 : 0.5,
          steps: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0].map(function () { return '---'; })
        };
      })
    };
  }

  function renderMelody(song) {
    song = song || emptyMelody();
    const bpm = clamp(num(song.bpm, 120), 40, 240);
    const stepsN = 16;
    const stepDur = (60 / bpm) / 4;
    const nStep = Math.max(1, Math.round(stepDur * SR));
    const total = nStep * stepsN;
    const out = new Float32Array(total);
    let seed = 987654321;
    function rand() {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      return ((seed >>> 0) / 4294967295) * 2 - 1;
    }
    (song.tracks || []).forEach(function (track) {
      const vol = clamp(num(track.volume, 0.5), 0, 1);
      const wave = track.wave || 'square';
      (track.steps || []).forEach(function (note, si) {
        if (si >= stepsN) return;
        const f = NOTE_FREQ[note] || 0;
        const isNoise = wave === 'noise' && note !== '---';
        if (!f && !isNoise) return;
        let phase = 0;
        for (let i = 0; i < nStep; i++) {
          phase += (Math.PI * 2 * (f || 800)) / SR;
          let s = isNoise ? rand() : osc(wave, phase, 0.5);
          const att = Math.min(nStep * 0.12, SR * 0.02);
          const relN = nStep * 0.35;
          let env = 1;
          if (i < att) env = i / att;
          else if (i > nStep - relN) env = Math.max(0, (nStep - i) / relN);
          const idx = si * nStep + i;
          out[idx] = clamp(out[idx] + s * vol * env * 0.65, -1, 1);
        }
      });
    });
    return out;
  }

  function toWav(samples, bit8) {
    const bits = bit8 ? 8 : 16;
    const n = samples.length;
    const dataLen = n * (bits / 8);
    const buf = new Uint8Array(44 + dataLen);
    const dv = new DataView(buf.buffer);

    wstr(0, 'RIFF');
    dv.setUint32(4, 36 + dataLen, true);
    wstr(8, 'WAVE');
    wstr(12, 'fmt ');
    dv.setUint32(16, 16, true);
    dv.setUint16(20, 1, true);
    dv.setUint16(22, 1, true);
    dv.setUint32(24, SR, true);
    dv.setUint32(28, SR * (bits / 8), true);
    dv.setUint16(32, bits / 8, true);
    dv.setUint16(34, bits, true);
    wstr(36, 'data');
    dv.setUint32(40, dataLen, true);

    if (bit8) {
      for (let i = 0; i < n; i++) buf[44 + i] = Math.max(0, Math.min(255, Math.round(samples[i] * 127) + 128));
    } else {
      for (let i = 0; i < n; i++) dv.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), true);
    }

    function wstr(off, str) {
      for (let i = 0; i < str.length; i++) buf[off + i] = str.charCodeAt(i);
    }
    return {
      bytes: buf,
      dataUrl: 'data:audio/wav;base64,' + U.bytesToB64(buf),
      duration: n / SR
    };
  }

  function parseWav(bytes) {
    if (!bytes || bytes.length < 44) return null;
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    const tag = function (o) { return String.fromCharCode(u8[o], u8[o + 1], u8[o + 2], u8[o + 3]); };
    if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return null;
    let fmt = null, data = null, o = 12;
    while (o + 8 <= u8.length) {
      const id = tag(o), len = dv.getUint32(o + 4, true), body = o + 8;
      if (id === 'fmt ' && len >= 16) {
        fmt = { format: dv.getUint16(body, true), ch: dv.getUint16(body + 2, true), sr: dv.getUint32(body + 4, true), bits: dv.getUint16(body + 14, true) };
        if (fmt.format === 0xFFFE && len >= 26) fmt.format = dv.getUint16(body + 24, true); /* WAVE_FORMAT_EXTENSIBLE */
      } else if (id === 'data') {
        data = { start: body, len: Math.min(len, u8.length - body) };
        if (fmt) break;
      }
      o = body + len + (len & 1);
    }
    if (!fmt || !data || !fmt.ch || !fmt.sr) return null;
    const bps = fmt.bits / 8, frame = bps * fmt.ch;
    const pcm = fmt.format === 1, flt = fmt.format === 3 && fmt.bits === 32;
    if (!(pcm && [8, 16, 24, 32].indexOf(fmt.bits) >= 0) && !flt) return null;
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

  /* Linear fade over `secs` seconds at the start ('in') or the end ('out'). */
  function fadeSamples(s, dir, secs) {
    const o = new Float32Array(s);
    const n = Math.min(o.length, Math.max(1, Math.round((secs || 0.3) * SR)));
    for (let i = 0; i < n; i++) {
      const k = i / n;
      if (dir === 'in') o[i] *= k;
      else o[o.length - 1 - i] *= k;
    }
    return o;
  }

  /* Playback speed (and pitch) change by resampling: factor 2 = twice as fast. */
  function speedSamples(s, factor) {
    factor = clamp(num(factor, 1), 0.25, 4);
    const n = Math.max(1, Math.round(s.length / factor));
    const o = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = i * factor, a = Math.floor(x), b = Math.min(s.length - 1, a + 1), f = x - a;
      o[i] = (s[a] || 0) * (1 - f) + (s[b] || 0) * f;
    }
    return o;
  }

  function reverseSamples(s) {
    const o = new Float32Array(s.length);
    for (let i = 0; i < s.length; i++) o[i] = s[s.length - 1 - i];
    return o;
  }

  function gainSamples(s, g) {
    g = clamp(num(g, 1), 0, 4);
    const o = new Float32Array(s.length);
    for (let i = 0; i < s.length; i++) o[i] = clamp(s[i] * g, -1, 1);
    return o;
  }

  function trimSilence(s, thresh) {
    thresh = thresh == null ? 0.01 : thresh;
    let a = 0, b = s.length - 1;
    while (a < s.length && Math.abs(s[a]) < thresh) a++;
    while (b > a && Math.abs(s[b]) < thresh) b--;
    if (b <= a) return s;
    return s.subarray(a, b + 1);
  }

  function resampleToSR(samples, fromSr) {
    if (!fromSr || fromSr === SR) return samples;
    const n = Math.max(1, Math.round(samples.length * SR / fromSr));
    const o = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = i * fromSr / SR;
      const i0 = Math.floor(x);
      const i1 = Math.min(samples.length - 1, i0 + 1);
      const f = x - i0;
      o[i] = samples[i0] * (1 - f) + samples[i1] * f;
    }
    return o;
  }

  function num(v, dflt) { const n = Number(v); return isFinite(n) ? n : dflt; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  let state = null;

  function isAudioPath(p, path) {
    const f = p.files[path];
    return !!(f && f.kind === 'data' && (/^audio\//.test(f.mime || '') || /\.(wav|mp3|ogg|oga|m4a|webm)$/i.test(path)));
  }

  function open(path) {
    const p = CS.projects.current;
    if (!p) { CS.app.toast(t('blocks_no_project'), 'error'); return; }
    const given = typeof path === 'string' && isAudioPath(p, path);
    state = {
      tab: given ? 'file' : 'sfx',
      preset: 'jump',
      opts: Object.assign({ attackMs: 0, decayMs: 40, sustain: 0.7, releaseMs: 60, duty: 0.5, slide: 'lin' }, PRESETS.jump.opts),
      name: 'salto',
      lastDataUrl: null,
      recording: false,
      recorder: null,
      recChunks: [],
      melody: emptyMelody(),
      filePath: given ? path : '',
      fileCache: null,        /* { path, dataUrl, samples } decoded at SR */
      gain: 1
    };
    const body = U.el('div', { class: 'audio-editor' });
    buildUI(body);
    CS.app.modal({
      title: t('audio_editor_title'),
      icon: 'audio',
      body: body,
      cancelLabel: t('close'),
      cancelable: true
    });
  }

  function buildUI(body) {
    body.textContent = '';
    const tabs = U.el('div', { class: 'seg-tabs' });
    [['sfx', t('ae_tab_sfx')], ['melody', t('ae_tab_melody')], ['record', t('ae_tab_record')], ['file', t('ae_tab_file')]].forEach(function (x) {
      tabs.appendChild(U.el('button', {
        class: 'btn small' + (state.tab === x[0] ? ' primary' : ' ghost'),
        onclick: function () { state.tab = x[0]; buildUI(body); }
      }, x[1]));
    });
    body.appendChild(tabs);
    if (state.tab === 'sfx') buildSfx(body);
    else if (state.tab === 'melody') buildMelody(body);
    else if (state.tab === 'record') buildRecord(body);
    else buildFile(body);
  }

  function sliderRow(key, label, min, max, step, unit, obj, onChange) {
    const row = U.el('div', { class: 'ae-row' });
    row.appendChild(U.el('span', { class: 'ae-label', text: t(label) }));
    const range = U.el('input', {
      class: 'input ae-range', type: 'range', min: String(min), max: String(max), step: String(step),
      value: String(obj[key] == null ? min : obj[key]),
      oninput: function () {
        obj[key] = Number(this.value);
        valSpan.textContent = fmtVal(this.value, unit);
        if (onChange) onChange();
      }
    });
    const valSpan = U.el('span', { class: 'ae-val', text: fmtVal(obj[key], unit) });
    row.appendChild(range);
    row.appendChild(valSpan);
    return row;
  }

  function buildSfx(body) {
    const presetRow = U.el('div', { class: 'ae-row' });
    presetRow.appendChild(U.el('span', { class: 'ae-label', text: t('ae_preset') }));
    const sel = U.el('select', { class: 'input', onchange: function () {
      state.preset = this.value;
      state.opts = Object.assign({ attackMs: 0, decayMs: 40, sustain: 0.7, releaseMs: 60, duty: 0.5, slide: 'lin' }, PRESETS[this.value].opts);
      state.name = this.value === 'jump' ? 'salto' : this.value;
      buildUI(body);
    } });
    Object.keys(PRESETS).forEach(function (k) {
      const o = new Option(PRESETS[k][CS.i18n.lang()] || PRESETS[k].es, k);
      if (state.preset === k) o.selected = true;
      sel.appendChild(o);
    });
    presetRow.appendChild(sel);
    body.appendChild(presetRow);

    [
      ['dur', 'ae_dur', 0.03, 2, 0.01, 's'],
      ['f0', 'ae_f0', 20, 4000, 10, 'Hz'],
      ['f1', 'ae_f1', 20, 4000, 10, 'Hz'],
      ['noise', 'ae_noise', 0, 1, 0.05, ''],
      ['vol', 'ae_vol', 0, 1, 0.05, ''],
      ['attackMs', 'ae_attack', 0, 300, 5, 'ms'],
      ['decayMs', 'ae_decay', 0, 300, 5, 'ms'],
      ['sustain', 'ae_sustain', 0, 1, 0.05, ''],
      ['releaseMs', 'ae_release', 0, 600, 5, 'ms'],
      ['duty', 'ae_duty', 0.05, 0.95, 0.05, '']
    ].forEach(function (s) {
      body.appendChild(sliderRow(s[0], s[1], s[2], s[3], s[4], s[5], state.opts, drawWave));
    });

    const row2 = U.el('div', { class: 'ae-row' });
    row2.appendChild(U.el('span', { class: 'ae-label', text: t('ae_wave') }));
    const wsel = U.el('select', { class: 'input', onchange: function () { state.opts.wave = this.value; drawWave(); } });
    [['square', t('ae_square')], ['sawtooth', t('ae_saw')], ['triangle', t('ae_tri')], ['sine', t('ae_sine')]].forEach(function (w) {
      const o = new Option(w[1], w[0]);
      if (state.opts.wave === w[0]) o.selected = true;
      wsel.appendChild(o);
    });
    row2.appendChild(wsel);
    const ssel = U.el('select', { class: 'input', onchange: function () { state.opts.slide = this.value; drawWave(); } });
    [['lin', t('ae_slide_lin')], ['exp', t('ae_slide_exp')]].forEach(function (w) {
      const o = new Option(t('ae_slide') + ': ' + w[1], w[0]);
      if (state.opts.slide === w[0]) o.selected = true;
      ssel.appendChild(o);
    });
    row2.appendChild(ssel);
    const chk = U.el('input', {
      type: 'checkbox', class: 'ae-chk',
      onchange: function () { state.opts.bit8 = this.checked; drawWave(); }
    });
    chk.checked = !!state.opts.bit8;
    row2.appendChild(U.el('label', { class: 'ae-chk-label' }, chk, ' ' + t('ae_bit8')));
    body.appendChild(row2);

    const cv = U.el('canvas', { class: 'ae-wave', width: '560', height: '90' });
    body.appendChild(cv);
    state.canvas = cv;
    body.appendChild(savePlayRow(function () { return toWav(synth(state.opts), state.opts.bit8); }, t('def_jump')));
    body.appendChild(U.el('p', { class: 'hint', text: t('ae_save_hint') }));
    drawWave();
  }

  function buildMelody(body) {
    body.appendChild(U.el('p', { class: 'hint', text: t('ae_melody_hint') }));
    body.appendChild(sliderRow('bpm', 'ae_bpm', 60, 240, 1, '', state.melody, null));
    state.melody.tracks.forEach(function (track, ti) {
      const card = U.el('div', { class: 'ae-track' });
      const head = U.el('div', { class: 'ae-row' });
      head.appendChild(U.el('span', { class: 'ae-label', text: t('ae_track', { n: ti + 1 }) }));
      const wsel = U.el('select', { class: 'input', onchange: function () { track.wave = this.value; } });
      [['square', t('ae_square')], ['triangle', t('ae_tri')], ['sine', t('ae_sine')], ['sawtooth', t('ae_saw')], ['noise', t('ae_noise')]].forEach(function (w) {
        const o = new Option(w[1], w[0]);
        if (track.wave === w[0]) o.selected = true;
        wsel.appendChild(o);
      });
      head.appendChild(wsel);
      card.appendChild(head);
      card.appendChild(sliderRow('volume', 'ae_vol', 0, 1, 0.05, '', track, null));
      const grid = U.el('div', { class: 'ae-steps' });
      for (let s = 0; s < 16; s++) {
        (function (si) {
          const cell = U.el('button', {
            class: 'ae-step' + (track.steps[si] !== '---' ? ' on' : ''),
            type: 'button',
            onclick: function () { pickNote(track, si, body); }
          }, track.steps[si] === '---' ? '·' : track.steps[si]);
          grid.appendChild(cell);
        })(s);
      }
      card.appendChild(grid);
      body.appendChild(card);
    });
    body.appendChild(savePlayRow(function () { return toWav(renderMelody(state.melody), false); }, t('def_melody')));
  }

  function pickNote(track, si, body) {
    CS.app.sheet({
      title: t('ae_track', { n: 1 }),
      items: NOTE_KEYS.map(function (k) {
        return {
          label: k === '---' ? t('ae_rest') : k,
          fn: function () {
            track.steps[si] = k;
            buildUI(body);
          }
        };
      })
    });
  }

  function buildRecord(body) {
    body.appendChild(U.el('p', { class: 'hint', text: t('ae_record_hint') }));
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && typeof MediaRecorder !== 'undefined') {
      const recRow = U.el('div', { class: 'ae-record' });
      const recBtn = U.el('button', {
        class: 'btn ghost',
        onclick: function () { toggleRecord(recBtn); }
      }, U.icon('audio', { size: 16 }), t('ae_record'));
      recRow.appendChild(recBtn);
      body.appendChild(recRow);
    } else {
      body.appendChild(U.el('p', { class: 'notice warn' }, U.icon('warn', { size: 16 }), t('ae_mic_err')));
    }
  }

  /* Decode a project audio file to mono samples at SR (WAV natively, other formats via Web Audio). */
  function loadSamples(path) {
    const p = CS.projects.current;
    const f = p && p.files[path];
    if (!f || f.kind !== 'data' || !f.dataUrl) return Promise.reject(new Error('missing'));
    if (state.fileCache && state.fileCache.path === path && state.fileCache.dataUrl === f.dataUrl) return Promise.resolve(state.fileCache.samples);
    let bytes;
    try { bytes = U.dataUrlToBytes(f.dataUrl); } catch (e) { return Promise.reject(e); }
    const remember = function (smp) { state.fileCache = { path: path, dataUrl: f.dataUrl, samples: smp }; return smp; };
    const parsed = parseWav(bytes);
    if (parsed) return Promise.resolve(remember(resampleToSR(parsed.samples, parsed.sr)));
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return Promise.reject(new Error('no audio'));
    const ac = new AC();
    const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    return new Promise(function (resolve, reject) { ac.decodeAudioData(buf, resolve, reject); })
      .then(function (ab) {
        try { ac.close(); } catch (e) { /* ignore */ }
        const mono = new Float32Array(ab.length);
        for (let c = 0; c < ab.numberOfChannels; c++) {
          const d = ab.getChannelData(c);
          for (let i = 0; i < d.length; i++) mono[i] += d[i] / ab.numberOfChannels;
        }
        return remember(resampleToSR(mono, ab.sampleRate));
      });
  }

  function drawSamples(cv, samples) {
    const ctx = cv && cv.getContext && cv.getContext('2d');
    if (!ctx) return;
    const w = cv.width, h = cv.height, mid = h / 2;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#38bdf8';
    const per = Math.max(1, Math.floor(samples.length / w));
    for (let x = 0; x < w; x++) {
      let lo = 0, hi = 0;
      for (let i = x * per; i < Math.min(samples.length, (x + 1) * per); i++) { if (samples[i] < lo) lo = samples[i]; if (samples[i] > hi) hi = samples[i]; }
      ctx.fillRect(x, mid - hi * (mid - 2), 1, Math.max(1, (hi - lo) * (mid - 2)));
    }
    ctx.fillStyle = 'rgba(255,255,255,.2)';
    ctx.fillRect(0, mid, w, 1);
  }

  function buildFile(body) {
    const p = CS.projects.current;
    const files = CS.projects.fileList(p).filter(function (x) { return isAudioPath(p, x); });
    if (!files.length) {
      body.appendChild(U.el('p', { class: 'hint', text: t('ae_no_wav') }));
      return;
    }
    if (!state.filePath || files.indexOf(state.filePath) < 0) state.filePath = files[0];
    const row = U.el('div', { class: 'ae-row' });
    row.appendChild(U.el('span', { class: 'ae-label', text: t('ae_pick_wav') }));
    const sel = U.el('select', { class: 'input', onchange: function () { state.filePath = this.value; buildUI(body); } });
    files.forEach(function (w) {
      const o = new Option(w, w);
      if (w === state.filePath) o.selected = true;
      sel.appendChild(o);
    });
    row.appendChild(sel);
    body.appendChild(row);

    const cv = U.el('canvas', { class: 'ae-wave', width: '600', height: '96' });
    const info = U.el('div', { class: 'hint ae-info', text: '…' });
    body.appendChild(cv);
    body.appendChild(info);
    loadSamples(state.filePath).then(function (smp) {
      drawSamples(cv, smp);
      info.textContent = t('ae_file_info', { s: (smp.length / SR).toFixed(2) }) +
        (/\.wav$/i.test(state.filePath) ? '' : ' · ' + t('ae_saved_as_wav'));
    }).catch(function () { info.textContent = t('ae_decode_err'); });

    body.appendChild(sliderRow('gain', 'ae_gain', 0, 2, 0.05, '', state, null));
    const actions = U.el('div', { class: 'row-gap wrap ae-actions' });
    actions.appendChild(U.el('button', { class: 'btn small', onclick: function () {
      loadSamples(state.filePath).then(function (smp) { playSamples(gainSamples(smp, state.gain)); })
        .catch(function () { CS.app.toast(t('ae_play_err'), 'error'); });
    } }, U.icon('play', { size: 16 }), t('ae_play')));
    [['trim', 'ae_trim'], ['fadein', 'ae_fade_in'], ['fadeout', 'ae_fade_out'], ['reverse', 'ae_reverse'],
      ['slower', 'ae_slower'], ['faster', 'ae_faster']].forEach(function (x) {
      actions.appendChild(U.el('button', { class: 'btn small', onclick: function () { transformFile(x[0], body); } }, t(x[1])));
    });
    actions.appendChild(U.el('button', { class: 'btn primary small', onclick: function () { transformFile('gain', body); } }, U.icon('check', { size: 16 }), t('ae_apply')));
    body.appendChild(actions);
    body.appendChild(U.el('p', { class: 'hint', text: t('ae_file_hint') }));
  }

  function playSamples(smp) {
    const a = new Audio(toWav(smp, false).dataUrl);
    a.play().catch(function () { CS.app.toast(t('ae_play_err'), 'error'); });
  }

  function transformFile(op, body) {
    const src = state.filePath;
    loadSamples(src).then(function (smp) {
      if (op === 'reverse') smp = reverseSamples(smp);
      else if (op === 'trim') smp = trimSilence(smp);
      else if (op === 'fadein') smp = fadeSamples(smp, 'in', Math.min(0.5, smp.length / SR * 0.3));
      else if (op === 'fadeout') smp = fadeSamples(smp, 'out', Math.min(0.5, smp.length / SR * 0.3));
      else if (op === 'slower') smp = speedSamples(smp, 0.8);
      else if (op === 'faster') smp = speedSamples(smp, 1.25);
      else if (op === 'gain') smp = gainSamples(smp, state.gain);
      const dest = /\.wav$/i.test(src) ? src : src.replace(/\.[a-z0-9]+$/i, '') + '.wav';
      writeWav(dest, toWav(smp, false), dest === src, function () {
        state.filePath = dest;
        if (body) buildUI(body);
      });
    }).catch(function () { CS.app.toast(t('ae_decode_err'), 'error'); });
  }

  /* Store a WAV; replacing a file other than the one being edited needs confirmation. Undo lives in the editor timeline. */
  function writeWav(path, wav, sameFile, done) {
    const p = CS.projects.current;
    if (!p) return;
    if (p.files[path] && !sameFile) {
      CS.app.confirm({ title: t('ae_overwrite_title'), message: t('ae_overwrite_msg', { path: path }), okLabel: t('overwrite_ok') })
        .then(function (yes) { if (yes) writeWav(path, wav, true, done); });
      return;
    }
    try {
      const prev = p.files[path] || null;
      CS.projects.fileSet(p, path, { kind: 'data', dataUrl: wav.dataUrl, mime: 'audio/wav', size: wav.bytes.length });
      CS.projects.save(p).catch(function () {});
      CS.app.toast(t('ae_saved', { path: path }), 'ok');
      if (CS.editor && CS.editor.notifyFileAdded) CS.editor.notifyFileAdded(path, prev);
      if (done) done();
    } catch (e2) { CS.app.toast(String(e2 && e2.message || e2), 'error'); }
  }

  function savePlayRow(getWav, defaultName) {
    const actions = U.el('div', { class: 'row-gap ae-actions' });
    actions.appendChild(U.el('button', {
      class: 'btn small', onclick: function () {
        try {
          const wav = getWav();
          state.lastDataUrl = wav.dataUrl;
          const a = new Audio(wav.dataUrl);
          a.play().catch(function () { CS.app.toast(t('ae_play_err'), 'error'); });
        } catch (e) { CS.app.toast(t('ae_play_err'), 'error'); }
      }
    }, U.icon('play', { size: 16 }), t('ae_play')));
    const nameInp = U.el('input', {
      class: 'input ae-name', value: state.name || defaultName, placeholder: defaultName,
      oninput: function () { state.name = this.value; }
    });
    actions.appendChild(nameInp);
    actions.appendChild(U.el('button', {
      class: 'btn primary small', onclick: function () {
        try { saveWav(getWav(), state.name || defaultName); }
        catch (e) { CS.app.toast(t('err_generic') + ': ' + (e && e.message || e), 'error'); }
      }
    }, U.icon('check', { size: 16 }), t('ae_save')));
    return actions;
  }

  function fmtVal(v, unit) {
    const n = Number(v);
    const s = unit === 'Hz' || unit === 'ms' || unit === '' && n >= 10 ? String(Math.round(n)) : (Math.round(n * 100) / 100).toFixed(2).replace(/0$/, '').replace(/\.$/, '');
    return s + (unit ? ' ' + unit : '');
  }

  function drawWave() {
    const cv = state && state.canvas;
    if (!cv) return;
    const ctx = cv.getContext && cv.getContext('2d');
    if (!ctx) return;
    const samples = synth(state.opts);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const stepX = cv.width / samples.length;
    for (let i = 0; i < samples.length; i++) {
      const x = i * stepX;
      const y = cv.height / 2 - samples[i] * (cv.height / 2 - 4);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    ctx.beginPath();
    ctx.moveTo(0, cv.height / 2);
    ctx.lineTo(cv.width, cv.height / 2);
    ctx.stroke();
  }

  function saveWav(wav, name) {
    name = String(name || '').trim();
    if (!U.isVarName(name)) { CS.app.toast(t('err_bad_fn'), 'error'); return; }
    writeWav('assets/' + name + '.wav', wav, false);
  }

  function toggleRecord(btn) {
    if (state.recording) {
      if (state.recorder && state.recorder.state !== 'inactive') state.recorder.stop();
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      state.recChunks = [];
      const rec = new MediaRecorder(stream);
      state.recorder = rec;
      rec.ondataavailable = function (ev) { if (ev.data && ev.data.size) state.recChunks.push(ev.data); };
      rec.onstop = function () {
        state.recording = false;
        btn.textContent = '';
        btn.appendChild(U.icon('audio', { size: 16 }));
        btn.appendChild(document.createTextNode(t('ae_record')));
        stream.getTracks().forEach(function (tr) { tr.stop(); });
        finishRecording();
      };
      rec.start();
      state.recording = true;
      btn.textContent = '';
      btn.appendChild(U.icon('stop', { size: 16 }));
      btn.appendChild(document.createTextNode(t('ae_stop')));
    }).catch(function () {
      CS.app.toast(t('ae_mic_err'), 'error');
    });
  }

  function finishRecording() {
    try {
      const blob = new (state.recChunks[0] ? state.recChunks[0].constructor : Blob)(state.recChunks, { type: 'audio/webm' });
      blob.arrayBuffer().then(function (ab) {
        const AC = window.AudioContext || window.webkitAudioContext;
        const ac = new AC();
        return ac.decodeAudioData(ab).then(function (buf) {
          ac.close();
          const ch = buf.getChannelData(0);
          const out = resampleToSR(ch, buf.sampleRate);
          const wav = toWav(out, false);
          CS.app.prompt({
            title: t('ae_save_rec'),
            label: t('fn_name_label'),
            value: t('def_recording')
          }).then(function (name) {
            if (!name || !U.isVarName(name)) return;
            saveWav(wav, name);
          });
        });
      }).catch(function () { CS.app.toast(t('ae_rec_err'), 'error'); });
    } catch (e) {
      CS.app.toast(t('ae_rec_err'), 'error');
    }
  }

  CS.audioEditor = {
    PRESETS: PRESETS,
    NOTE_FREQ: NOTE_FREQ,
    synth: synth,
    toWav: toWav,
    renderMelody: renderMelody,
    emptyMelody: emptyMelody,
    parseWav: parseWav,
    reverseSamples: reverseSamples,
    gainSamples: gainSamples,
    trimSilence: trimSilence,
    fadeSamples: fadeSamples,
    speedSamples: speedSamples,
    open: open,
    SAMPLE_RATE: SR
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = CS.audioEditor; }
})();
