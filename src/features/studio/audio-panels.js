/* Sound lab panels: effect designer and the 4-track step sequencer. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, icon, ui } = CS;
  const A = CS.audio;
  const t = (...a) => CS.t(...a);
  const lang = () => (CS.i18n && CS.i18n.lang) || 'en';
  const SONG_DRAFT = 'wcs3_song';
  const DRUMS = [{ id: 'C2', key: 'kick' }, { id: 'D4', key: 'snare' }, { id: 'A5', key: 'hat' }];
  const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  /* ---------- Effects ---------- */
  const SLIDERS = [
    { id: 'f0', min: 40, max: 3000, step: 1, log: true },
    { id: 'f1', min: 40, max: 3000, step: 1, log: true },
    { id: 'dur', min: 0.03, max: 1.5, step: 0.01 },
    { id: 'noise', min: 0, max: 1, step: 0.01 },
    { id: 'vibrato', min: 0, max: 1, step: 0.01 },
    { id: 'duty', min: 0.1, max: 0.9, step: 0.01, only: 'square' },
    { id: 'vol', min: 0.05, max: 1, step: 0.01 }
  ];
  const toPos = (s, v) => (s.log ? Math.log(v / s.min) / Math.log(s.max / s.min) * 1000 : v);
  const fromPos = (s, p) => (s.log ? Math.round(s.min * Math.pow(s.max / s.min, p / 1000)) : p);

  function effects(E) {
    const S = E.S;
    let opts = S.source && S.source.kind === 'sfx' ? Object.assign({}, S.source.opts) : null;
    const box = h('div', { class: 'au-fx' });
    const apply = (next, name) => {
      opts = A.normalizeOpts(next);
      E.setClip(A.synth(opts), { source: { kind: 'sfx', opts: Object.assign({}, opts) }, play: true });
      if (name) E.setName(name);
      draw();
    };
    function draw() {
      const presets = h('div', { class: 'au-presets' }, Object.entries(A.PRESETS).map(([id, p]) => h('button', {
        type: 'button', class: 'au-preset', dataset: { preset: id },
        onclick: () => { CS.haptic(); apply(Object.assign({}, p.opts), id); }
      }, h('span', { class: 'au-preset-ic' }, icon(p.icon)), h('span', {}, p[lang()] || p.en))));
      if (!opts) {
        CS.mount(box, [h('div', { class: 'au-group-title' }, t('au_fx_pick')), presets]);
        return;
      }
      const o = A.normalizeOpts(opts);
      const sliders = SLIDERS.filter((s) => !s.only || s.only === o.wave).map((s) => {
        const val = h('b', {}, fmt(s, o[s.id]));
        return h('label', { class: 'au-slider' }, h('span', {}, t('au_p_' + s.id)),
          h('input', { type: 'range', min: String(s.log ? 0 : s.min), max: String(s.log ? 1000 : s.max), step: s.log ? '1' : String(s.step), value: String(toPos(s, o[s.id])),
            oninput: (e) => { val.textContent = fmt(s, fromPos(s, +e.target.value)); },
            onchange: (e) => { const next = Object.assign({}, opts); next[s.id] = fromPos(s, +e.target.value); apply(next); } }),
          val);
      });
      CS.mount(box, [
        h('div', { class: 'au-fx-actions' },
          ui.button({ label: t('au_surprise'), icon: 'dice', variant: 'tonal', size: 'sm', onClick: () => apply(A.mutate(opts, 0.35)) }),
          ui.button({ label: t('px_play'), icon: 'play', variant: 'primary', size: 'sm', onClick: () => E.play() })),
        h('div', { class: 'au-group-title' }, t('au_fx_presets')),
        presets,
        h('div', { class: 'au-group-title' }, t('au_fx_tune')),
        ui.segmented(['square', 'triangle', 'sine', 'sawtooth'].map((w) => ({ value: w, label: t('au_w_' + w) })), o.wave, (w) => apply(Object.assign({}, opts, { wave: w }))),
        ui.segmented(['lin', 'exp', 'step'].map((v) => ({ value: v, label: t('au_slide_' + v) })), o.slide, (v) => apply(Object.assign({}, opts, { slide: v }))),
        h('div', { class: 'au-sliders' }, sliders),
        ui.toggle(o.bit8, (v) => apply(Object.assign({}, opts, { bit8: v })), t('au_crunch'))
      ]);
    }
    draw();
    return box;
  }
  function fmt(s, v) {
    if (s.id === 'f0' || s.id === 'f1') return Math.round(v) + ' Hz';
    if (s.id === 'dur') return Number(v).toFixed(2) + ' s';
    return Math.round(v * 100) + '%';
  }

  /* ---------- Music ---------- */
  const DEMOS = {
    arcade: { bpm: 140, lead: 'C5 . E5 . G5 . E5 . A5 . G5 . E5 . D5 .', bass: 'C3 . . . C3 . . . A2 . . . G2 . . .', harmony: '', drums: 'K . H . S . H . K . H . S . H H' },
    chill: { bpm: 92, lead: 'E4 . G4 . A4 . . . G4 . E4 . D4 . . .', bass: 'C3 . . . . . . . A2 . . . . . . .', harmony: 'G3 . . . . . . . E3 . . . . . . .', drums: 'K . . . S . . . K . K . S . . .' },
    victory: { bpm: 150, lead: 'C5 C5 C5 C5 G#4 . A#4 . C5 . A#4 C5 . . . .', bass: 'C3 . . . G#2 . A#2 . C3 . . . . . . .', harmony: '', drums: 'K . . . K . K . S . . . . . . .' }
  };
  function demoSong(id) {
    const d = DEMOS[id];
    const song = A.emptySong(16);
    song.bpm = d.bpm;
    const fill = (track, line) => line.split(/\s+/).filter(Boolean).forEach((tok, i) => {
      if (i >= 16) return;
      track.steps[i] = tok === '.' ? '' : tok === 'K' ? 'C2' : tok === 'S' ? 'D4' : tok === 'H' ? 'A5' : tok;
    });
    fill(song.tracks[0], d.lead); fill(song.tracks[1], d.bass); fill(song.tracks[2], d.harmony); fill(song.tracks[3], d.drums);
    return song;
  }
  const clone = (song) => JSON.parse(JSON.stringify(song));
  function loadSong(E) {
    if (E.S.source && E.S.source.kind === 'song' && E.S.source.song) return clone(E.S.source.song);
    try { const s = JSON.parse(localStorage.getItem(SONG_DRAFT) || 'null'); if (s && s.tracks) return s; } catch (error) { /* ignore */ }
    return demoSong('arcade');
  }

  function music(E) {
    let song = loadSong(E);
    let brush = 'C4';
    let octave = 4;
    let looping = false;
    const box = h('div', { class: 'au-music' });
    const gridHost = h('div', { class: 'au-grid-wrap' });
    const keysHost = h('div', { class: 'au-keys-wrap' });

    function commit(play) {
      try { localStorage.setItem(SONG_DRAFT, JSON.stringify(song)); } catch (error) { /* best effort */ }
      E.setClip(A.renderSong(song), { source: { kind: 'song', song: clone(song) }, play: false });
      if (play) playLoop(false);
    }
    function preview(note, wave) {
      const n = A.freqOf(note);
      if (!n) return;
      const s = A.renderSong({ bpm: 120, steps: 1, tracks: [{ wave: wave || 'square', volume: 0.6, steps: [note] }] });
      A.play(s);
    }
    function playLoop(loop) {
      if (A.playing) { A.stop(); looping = false; highlight(-1); drawControls(); return; }
      looping = !!loop;
      const stepDur = 60 / song.bpm / 4;
      const steps = song.steps || 16;
      const samples = A.renderSong(song, loop ? 4 : 1);
      E.play(samples, (sec) => { highlight(sec < 0 ? -1 : Math.floor(sec / stepDur) % steps); if (sec < 0) { looping = false; drawControls(); } });
      drawControls();
    }
    let lit = -1;
    function highlight(col) {
      if (col === lit) return;
      gridHost.querySelectorAll('.au-cell.now').forEach((c) => c.classList.remove('now'));
      if (col >= 0) gridHost.querySelectorAll('.au-cell[data-col="' + col + '"]').forEach((c) => c.classList.add('now'));
      lit = col;
    }

    const controls = h('div', { class: 'au-mcontrols' });
    function drawControls() {
      CS.mount(controls, [
        ui.button({ label: A.playing ? t('st_stop') : t('au_play_loop'), icon: A.playing ? 'stop' : 'play', variant: 'primary', size: 'sm', onClick: () => playLoop(true) }),
        h('label', { class: 'au-slider au-bpm' }, h('span', {}, 'BPM'),
          h('input', { type: 'range', min: '60', max: '220', value: String(song.bpm), oninput: (e) => { e.target.nextSibling.textContent = e.target.value; }, onchange: (e) => { song.bpm = +e.target.value; commit(); } }),
          h('b', {}, String(song.bpm))),
        ui.iconButton('moreV', t('more'), songMenu, { size: 'sm' })
      ]);
    }
    function songMenu() {
      ui.menu({ title: t('au_tab_music'), items: [
        { icon: 'sparkles', label: t('au_demo_arcade'), onClick: () => { song = demoSong('arcade'); drawAll(); commit(true); } },
        { icon: 'moon', label: t('au_demo_chill'), onClick: () => { song = demoSong('chill'); drawAll(); commit(true); } },
        { icon: 'trophy', label: t('au_demo_victory'), onClick: () => { song = demoSong('victory'); drawAll(); commit(true); } },
        '-',
        { icon: 'grid', label: song.steps === 32 ? t('au_steps_16') : t('au_steps_32'), onClick: () => {
          const n = song.steps === 32 ? 16 : 32;
          song.tracks.forEach((tr) => { tr.steps = n === 32 ? tr.steps.concat(tr.steps.slice(0, 16)) : tr.steps.slice(0, 16); });
          song.steps = n; drawAll(); commit();
        } },
        { icon: 'trash', label: t('au_clear_song'), danger: true, onClick: () => { const bpm = song.bpm; song = A.emptySong(song.steps); song.bpm = bpm; drawAll(); commit(); } }
      ] });
    }

    function drawKeys() {
      const isDrumBrush = DRUMS.some((d) => d.id === brush);
      CS.mount(keysHost, [
        h('div', { class: 'au-keys-head' },
          h('span', { class: 'au-brush' }, t('au_brush'), h('b', {}, isDrumBrush ? t('au_d_' + DRUMS.find((d) => d.id === brush).key) : brush)),
          h('div', { class: 'au-oct' },
            ui.iconButton('chevronLeft', t('au_oct_down'), () => { octave = Math.max(2, octave - 1); drawKeys(); }, { size: 'sm', disabled: octave <= 2 }),
            h('span', {}, t('au_octave', { n: octave })),
            ui.iconButton('chevronRight', t('au_oct_up'), () => { octave = Math.min(6, octave + 1); drawKeys(); }, { size: 'sm', disabled: octave >= 6 }))),
        h('div', { class: 'au-keys' }, KEYS.map((k) => {
          const id = k + octave;
          return h('button', { type: 'button', class: ['au-key', k.includes('#') && 'black', brush === id && 'on'], 'aria-label': id,
            onclick: () => { brush = id; preview(id, 'square'); drawKeys(); } }, h('span', {}, k));
        }))
      ]);
    }

    function drawGrid() {
      const steps = song.steps || 16;
      const rows = song.tracks.map((tr, ti) => {
        const drums = tr.wave === 'noise';
        return h('div', { class: ['au-row', drums && 'drums'] },
          h('button', { type: 'button', class: 'au-row-head', onclick: () => trackMenu(ti) },
            h('span', { class: 'au-row-name' }, t('au_t_' + (tr.name || ['lead', 'bass', 'harmony', 'drums'][ti] || 'lead'))),
            h('span', { class: 'au-row-wave' }, drums ? t('au_w_noise') : t('au_w_' + tr.wave))),
          h('div', { class: 'au-cells' }, Array.from({ length: steps }, (_, si) => {
            const note = tr.steps[si] || '';
            const drum = drums && DRUMS.find((d) => d.id === note);
            return h('button', {
              type: 'button', class: ['au-cell', note && 'on', si % 4 === 0 && 'beat', drum && 'd-' + drum.key], dataset: { col: String(si), row: String(ti) },
              'aria-label': (si + 1) + ': ' + (note || '-'),
              onclick: (e) => {
                if (drums) {
                  const i = DRUMS.findIndex((d) => d.id === note);
                  tr.steps[si] = i === DRUMS.length - 1 ? '' : DRUMS[i + 1].id;
                  if (tr.steps[si]) preview(tr.steps[si], 'noise');
                } else {
                  tr.steps[si] = note === brush ? '' : brush;
                  if (tr.steps[si]) preview(brush, tr.wave);
                }
                const nn = tr.steps[si];
                const d2 = drums && DRUMS.find((d) => d.id === nn);
                e.currentTarget.className = ['au-cell', nn && 'on', si % 4 === 0 && 'beat', d2 && 'd-' + d2.key].filter(Boolean).join(' ');
                CS.mount(e.currentTarget, cellLabel(nn, drums));
                commit();
              }
            }, cellLabel(note, drums));
          })));
      });
      CS.mount(gridHost, h('div', { class: 'au-grid' }, rows));
    }
    function cellLabel(note, drums) {
      if (!note) return null;
      if (drums) { const d = DRUMS.find((x) => x.id === note); return h('span', {}, d ? t('au_d_' + d.key).slice(0, 1) : '•'); }
      return h('span', {}, note.slice(0, -1), h('sub', {}, note.slice(-1)));
    }
    function trackMenu(ti) {
      const tr = song.tracks[ti];
      if (tr.wave === 'noise') {
        ui.menu({ title: t('au_t_drums'), items: [volItem(tr)] });
        return;
      }
      ui.menu({ title: t('au_t_' + (tr.name || 'lead')), items: ['square', 'triangle', 'sine', 'sawtooth'].map((w) => ({
        icon: tr.wave === w ? 'checkCircle' : 'wave', label: t('au_w_' + w), onClick: () => { tr.wave = w; drawGrid(); commit(); preview(brush, w); }
      })).concat(['-', volItem(tr)]) });
    }
    function volItem(tr) {
      return { icon: 'volume', label: t('au_volume'), trailing: h('input', { type: 'range', min: '0', max: '100', value: String(Math.round(tr.volume * 100)), onchange: (e) => { tr.volume = +e.target.value / 100; commit(); } }) };
    }

    function drawAll() { drawControls(); drawKeys(); drawGrid(); }
    CS.mount(box, [controls, keysHost, gridHost, h('p', { class: 'px-hint' }, t('au_music_hint'))]);
    drawAll();
    if (!E.S.clip.length) commit();
    return box;
  }

  CS.audioPanels = { effects, music, demoSong, DEMOS };
})();
