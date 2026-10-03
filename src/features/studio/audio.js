/* Sound lab: waveform with selection, edit tools, recorder. Effects and music panels live in audio-panels.js. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, icon, ui } = CS;
  const A = CS.audio;
  const U = CS.util;
  const t = (...a) => CS.t(...a);
  const UNDO_MAX = 30;
  const TABS = [{ id: 'effects', icon: 'sparkles' }, { id: 'music', icon: 'music' }, { id: 'record', icon: 'mic' }, { id: 'edit', icon: 'scissors' }];

  let E = null;

  function fmtTime(sec) {
    const s = Math.max(0, sec);
    return s < 10 ? s.toFixed(2) + ' s' : Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  }

  function mountEditor(root, init) {
    const S = {
      clip: init.clip || new Float32Array(0), sel: null, tab: init.tab || 'effects', undo: [], redo: [], link: init.link || null,
      name: init.name || 'sound', dirty: false, source: init.source || null, bit8: false, playhead: -1
    };
    const wave = h('canvas', { class: 'au-wave' });
    const timeLabel = h('span', { class: 'au-time' });
    const selLabel = h('span', { class: 'au-sel' });
    const playBtn = h('button', { type: 'button', class: 'au-play', 'aria-label': t('px_play'), onclick: () => togglePlay() }, icon('play'));
    const waveBox = h('div', { class: 'au-wavebox' }, wave, h('div', { class: 'au-wave-empty' }, icon('wave'), h('span', {}, t('au_empty'))));
    const head = h('div', { class: 'au-head card' }, waveBox, h('div', { class: 'au-bar' }, playBtn, h('div', { class: 'au-info' }, timeLabel, selLabel),
      ui.iconButton('close', t('au_clear_sel'), () => { S.sel = null; drawWave(); }, { class: 'au-clear-sel', size: 'sm' })));
    const tabs = h('div', { class: 'au-tabs' });
    const panel = h('div', { class: 'au-panel' });
    CS.mount(root, h('div', { class: 'au-scroll' }, head, tabs, panel));

    /* ----- waveform ----- */
    function drawWave() {
      const r = wave.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      wave.width = Math.max(1, Math.round(r.width * dpr)); wave.height = Math.max(1, Math.round(r.height * dpr));
      const g = wave.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const W = r.width, H = r.height;
      g.clearRect(0, 0, W, H);
      const n = S.clip.length;
      waveBox.classList.toggle('is-empty', !n);
      const css = getComputedStyle(wave);
      const accent = css.getPropertyValue('--accent').trim() || '#5146e0';
      const muted = css.getPropertyValue('--text-3').trim() || '#999';
      if (n) {
        if (S.sel) {
          g.fillStyle = css.getPropertyValue('--accent-soft').trim() || 'rgba(81,70,224,.15)';
          g.fillRect((S.sel[0] / n) * W, 0, ((S.sel[1] - S.sel[0]) / n) * W, H);
        }
        const buckets = Math.max(1, Math.floor(W));
        const pk = A.peaks(S.clip, buckets);
        g.fillStyle = accent;
        for (let i = 0; i < buckets; i++) {
          const lo = pk[i * 2], hi = pk[i * 2 + 1];
          const inSel = !S.sel || (i / buckets >= S.sel[0] / n && i / buckets <= S.sel[1] / n);
          g.globalAlpha = inSel ? 1 : 0.35;
          const y0 = H / 2 - hi * (H / 2 - 4), y1 = H / 2 - lo * (H / 2 - 4);
          g.fillRect(i, y0, 1, Math.max(1, y1 - y0));
        }
        g.globalAlpha = 1;
        g.fillStyle = muted;
        g.fillRect(0, H / 2, W, 0.5);
        if (S.sel) {
          g.fillStyle = accent;
          for (const s of S.sel) { const x = (s / n) * W; g.fillRect(x - 1, 0, 2, H); g.beginPath(); g.arc(x, H - 6, 6, 0, Math.PI * 2); g.fill(); }
        }
        if (S.playhead >= 0) {
          const start = S.sel ? S.sel[0] : 0;
          const x = ((start + S.playhead * A.SR) / n) * W;
          g.fillStyle = css.getPropertyValue('--text').trim() || '#000';
          g.fillRect(x, 0, 1.5, H);
        }
      }
      timeLabel.textContent = fmtTime(n / A.SR);
      selLabel.textContent = S.sel ? t('au_selection', { s: fmtTime((S.sel[1] - S.sel[0]) / A.SR) }) : '';
      head.classList.toggle('has-sel', !!S.sel);
    }
    let drag = null;
    wave.addEventListener('pointerdown', (e) => {
      if (!S.clip.length) return;
      try { wave.setPointerCapture(e.pointerId); } catch (error) { /* synthetic or released pointer */ }
      const r = wave.getBoundingClientRect();
      const pos = Math.round(((e.clientX - r.left) / r.width) * S.clip.length);
      const near = (s) => Math.abs(((s / S.clip.length) * r.width) - (e.clientX - r.left)) < 18;
      if (S.sel && near(S.sel[0])) drag = { edge: 0 };
      else if (S.sel && near(S.sel[1])) drag = { edge: 1 };
      else drag = { from: pos, moved: false };
    });
    wave.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const r = wave.getBoundingClientRect();
      const pos = Math.max(0, Math.min(S.clip.length, Math.round(((e.clientX - r.left) / r.width) * S.clip.length)));
      if (drag.edge != null) {
        S.sel[drag.edge] = pos;
        if (S.sel[0] > S.sel[1]) { S.sel.reverse(); drag.edge = 1 - drag.edge; }
      } else {
        if (Math.abs(pos - drag.from) < S.clip.length * 0.01 && !drag.moved) return;
        drag.moved = true;
        S.sel = [Math.min(drag.from, pos), Math.max(drag.from, pos)];
      }
      drawWave();
    });
    const endDrag = () => {
      if (drag && drag.edge == null && !drag.moved) S.sel = null;
      if (S.sel && S.sel[1] - S.sel[0] < A.SR * 0.01) S.sel = null;
      drag = null;
      drawWave();
      if (S.tab === 'edit') drawPanel();
    };
    wave.addEventListener('pointerup', endDrag);
    wave.addEventListener('pointercancel', endDrag);
    const ro = new ResizeObserver(() => drawWave());
    ro.observe(wave);

    /* ----- playback ----- */
    function play(samples, onTick) {
      const s = samples || (S.sel ? S.clip.subarray(S.sel[0], S.sel[1]) : S.clip);
      if (!s.length) return Promise.resolve();
      CS.mount(playBtn, icon('stop'));
      return A.play(s, (sec) => {
        S.playhead = samples ? -1 : sec;
        drawWave();
        if (onTick) onTick(sec);
        if (sec < 0) CS.mount(playBtn, icon('play'));
      });
    }
    function togglePlay() { if (A.playing) { A.stop(); S.playhead = -1; CS.mount(playBtn, icon('play')); drawWave(); } else play(); }

    /* ----- history ----- */
    /* setClip replaces the clip; record=false for live previews (sliders). */
    function setClip(clip, opts) {
      const o = opts || {};
      if (o.record !== false) {
        S.undo.push({ clip: S.clip, source: S.source });
        if (S.undo.length > UNDO_MAX) S.undo.shift();
        S.redo.length = 0;
      }
      S.clip = clip;
      if (o.source !== undefined) S.source = o.source;
      S.sel = null;
      S.dirty = true;
      drawWave();
      updateChrome();
      if (S.tab === 'edit' && o.redraw !== false) drawPanel();
      if (o.play) play();
    }
    function restore(from, to) {
      const entry = from.pop();
      if (!entry) return;
      to.push({ clip: S.clip, source: S.source });
      S.clip = entry.clip; S.source = entry.source; S.sel = null; S.dirty = true;
      drawWave(); updateChrome();
      if (S.tab !== 'record') drawPanel();
    }

    /* ----- tabs ----- */
    function drawTabs() {
      CS.mount(tabs, ui.segmented(TABS.map((x) => ({ value: x.id, label: t('au_tab_' + x.id), icon: x.icon })), S.tab, (v) => { S.tab = v; drawPanel(); }, { class: 'au-seg' }));
    }
    function drawPanel() {
      stopRecording();
      if (S.tab === 'effects') return CS.mount(panel, CS.audioPanels.effects(E));
      if (S.tab === 'music') return CS.mount(panel, CS.audioPanels.music(E));
      if (S.tab === 'record') return CS.mount(panel, recordPanel());
      return CS.mount(panel, editPanel());
    }

    /* ----- edit ----- */
    function editPanel() {
      if (!S.clip.length) return ui.empty({ icon: 'scissors', tint: 'teal', title: t('au_edit_empty'), body: t('au_edit_empty_body') });
      const range = () => (S.sel ? S.sel : [0, S.clip.length]);
      /* Applies fn to the selection (or everything) and splices the result back. */
      const onRange = (fn) => {
        const [a, b] = range();
        const part = fn(S.clip.slice(a, b));
        const out = new Float32Array(S.clip.length - (b - a) + part.length);
        out.set(S.clip.subarray(0, a)); out.set(part, a); out.set(S.clip.subarray(b), a + part.length);
        const had = !!S.sel;
        setClip(out, { play: true, redraw: false });
        if (had) S.sel = [a, a + part.length];
        drawWave();
        drawPanel();
      };
      const tool = (ic, label, fn, opts) => h('button', { type: 'button', class: ['au-tool', opts && opts.cls], disabled: !!(opts && opts.disabled), onclick: () => { CS.haptic(); fn(); } }, icon(ic), h('span', {}, label));
      const hasSel = !!S.sel;
      return [
        h('div', { class: 'au-hint' }, icon('info'), h('span', {}, hasSel ? t('au_sel_hint_on') : t('au_sel_hint'))),
        h('div', { class: 'au-group-title' }, t('au_g_cut')),
        h('div', { class: 'au-tools' },
          tool('crop', t('au_keep_sel'), () => setClip(A.crop(S.clip, S.sel[0], S.sel[1]), { play: true }), { disabled: !hasSel }),
          tool('scissors', t('au_cut_sel'), () => setClip(A.cut(S.clip, S.sel[0], S.sel[1]), { play: true }), { disabled: !hasSel }),
          tool('volume', t('au_silence'), () => onRange((s) => new Float32Array(s.length)), { disabled: !hasSel }),
          tool('expand', t('au_trim_silence'), () => setClip(A.trimSilence(S.clip, 0.02), { play: true }))),
        h('div', { class: 'au-group-title' }, t('au_g_effects')),
        h('div', { class: 'au-tools' },
          tool('arrowUp', t('au_fade_in'), () => onRange((s) => A.fade(s, 'in', Math.min(0.5, s.length / A.SR / 2)))),
          tool('arrowDown', t('au_fade_out'), () => onRange((s) => A.fade(s, 'out', Math.min(0.5, s.length / A.SR / 2)))),
          tool('refresh', t('au_reverse'), () => onRange(A.reverse)),
          tool('wave', t('au_echo'), () => onRange((s) => A.echo(s, 0.16, 0.42))),
          tool('sliders', t('au_normalize'), () => onRange((s) => A.normalize(s))),
          tool('plus', t('au_louder'), () => onRange((s) => A.gain(s, 1.4))),
          tool('minus', t('au_quieter'), () => onRange((s) => A.gain(s, 0.7)))),
        h('div', { class: 'au-group-title' }, t('au_g_speed')),
        h('div', { class: 'au-speeds' }, [0.5, 0.75, 1.25, 1.5, 2].map((k) => ui.chip(k + '×', { onClick: () => onRange((s) => A.speed(s, k)) }))),
        h('p', { class: 'px-hint' }, t('au_speed_hint'))
      ];
    }

    /* ----- record ----- */
    let rec = null;
    function stopRecording(keep) {
      if (!rec) return;
      const r = rec;
      rec = null;
      clearInterval(r.timer);
      r.keep = !!keep;
      try { if (r.mr.state !== 'inactive') r.mr.stop(); } catch (error) { /* already stopped */ }
      r.stream.getTracks().forEach((tr) => tr.stop());
    }
    function recordPanel() {
      const supported = navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder;
      const status = h('div', { class: 'au-rec-status' }, supported ? t('au_rec_ready') : t('au_rec_unsupported'));
      const timer = h('div', { class: 'au-rec-time' }, '0:00');
      const btn = h('button', { type: 'button', class: 'au-rec-btn', disabled: !supported, 'aria-label': t('au_rec_start'), onclick: async () => {
        if (rec) { stopRecording(true); return; }
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mr = new MediaRecorder(stream);
          const chunks = [];
          const started = Date.now();
          rec = { mr, stream, timer: setInterval(() => { const s = Math.floor((Date.now() - started) / 1000); timer.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); if (s >= 60) stopRecording(true); }, 250) };
          const mine = rec;
          mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
          mr.onstop = async () => {
            btn.classList.remove('on');
            if (!mine.keep) return;
            status.textContent = t('st_loading');
            try {
              const bytes = new Uint8Array(await new Blob(chunks, { type: mr.mimeType }).arrayBuffer());
              const clip = await A.decode(bytes);
              setClip(A.trimSilence(clip, 0.01), { source: null });
              S.name = 'recording';
              status.textContent = t('au_rec_done');
              ui.toast(t('au_rec_done'), 'ok', { action: { label: t('au_tab_edit'), onClick: () => { S.tab = 'edit'; drawTabs(); drawPanel(); } } });
            } catch (error) { status.textContent = t('au_rec_failed'); }
          };
          mr.start(250);
          btn.classList.add('on');
          status.textContent = t('au_rec_on');
        } catch (error) {
          status.textContent = t('au_rec_denied');
        }
      } }, h('span', { class: 'au-rec-dot' }));
      return h('div', { class: 'au-rec' }, btn, timer, status, h('p', { class: 'px-hint' }, t('au_rec_hint')));
    }

    /* ----- save ----- */
    function encodeWav() { return { bytes: A.toWav(S.clip, S.bit8), mime: 'audio/wav' }; }
    function storeSource(p, path) {
      if (!S.source) return;
      if (!p.studio || typeof p.studio !== 'object') p.studio = {};
      if (!p.studio.audio || typeof p.studio.audio !== 'object') p.studio.audio = {};
      p.studio.audio[path] = Object.assign({ size: A.toWav(S.clip, S.bit8).length }, S.source);
    }
    async function save(as) {
      if (!S.clip.length) { ui.toast(t('au_empty'), 'info'); return; }
      if (S.link && !as && /\.wav$/i.test(S.link.path)) {
        try {
          const out = encodeWav();
          await CS.studio.writeAsset(S.link.project, S.link.path, out.bytes, out.mime, storeSource);
          S.dirty = false; updateChrome();
          ui.toast(t('st_saved'), 'ok');
        } catch (error) { ui.toast(CS.common.errorText(error), 'error'); }
        return;
      }
      const res = await CS.studio.saveSheet({
        tool: 'audio', kind: 'audio', name: S.name, ext: 'wav',
        project: S.link ? S.link.project : (CS.projects.current && CS.projects.current.id), path: as || !(S.link && /\.wav$/i.test(S.link.path)) ? null : S.link.path,
        extra: h('div', { class: 'au-save-extra' }, ui.toggle(S.bit8, (v) => { S.bit8 = v; }, t('au_8bit')), h('p', { class: 'px-hint' }, t('au_8bit_hint'))),
        encode: async () => encodeWav(),
        mutate: storeSource
      });
      if (res) { S.link = res; S.name = U.basename(res.path).replace(/\.[a-z0-9]+$/i, ''); S.dirty = false; updateChrome(); }
    }
    async function openOther() {
      const asset = await CS.studio.pickAsset({ kind: 'audio' });
      if (!asset) return;
      S.dirty = false;
      if (asset.project) { CS.router.go('studio-audio', { project: asset.project.id, path: asset.path }, { replace: true }); return; }
      try {
        const clip = await A.decode(asset.bytes);
        S.link = null; S.name = asset.name.replace(/\.[a-z0-9]+$/i, '');
        setClip(clip, { source: null });
        S.tab = 'edit'; drawTabs(); drawPanel();
      } catch (error) { ui.toast(t('au_open_failed'), 'error'); }
    }
    function more() {
      ui.menu({ title: S.name, subtitle: fmtTime(S.clip.length / A.SR), items: [
        S.link ? { icon: 'filePlus', label: t('st_save_as'), onClick: () => save(true) } : null,
        { icon: 'download', label: t('st_download'), onClick: () => { if (S.clip.length) CS.common.deliver(new Blob([A.toWav(S.clip, S.bit8)], { type: 'audio/wav' }), U.slug(S.name, 'sound') + '.wav'); } },
        window.webxdc && typeof window.webxdc.sendToChat === 'function' ? { icon: 'send', label: t('st_share_chat'), onClick: () => { if (S.clip.length) CS.common.deliver(new Blob([A.toWav(S.clip, S.bit8)], { type: 'audio/wav' }), U.slug(S.name, 'sound') + '.wav', { chat: true, type: 'file' }); } } : null,
        { icon: 'folderOpen', label: t('au_open'), onClick: openOther },
        { icon: 'trash', label: t('au_clear'), danger: true, onClick: () => setClip(new Float32Array(0), { source: null }) }
      ] });
    }
    function updateChrome() {
      CS.app.setChrome({
        title: S.name + (S.dirty ? ' •' : ''),
        subtitle: S.clip.length ? fmtTime(S.clip.length / A.SR) : t('st_audio'),
        actions: [
          ui.iconButton('undo', t('undo'), () => restore(S.undo, S.redo), { disabled: !S.undo.length, class: 'au-undo' }),
          ui.iconButton('redo', t('redo'), () => restore(S.redo, S.undo), { disabled: !S.redo.length }),
          ui.iconButton('save', S.link ? t('st_save') : t('st_save_project'), () => save(false), { class: 'au-save' }),
          ui.iconButton('moreV', t('more'), more)
        ]
      });
    }

    E = {
      S, setClip, play, drawWave, updateChrome, save,
      setName(n) { if (!S.link) { S.name = n; updateChrome(); } },
      destroy() { ro.disconnect(); stopRecording(); A.stop(); },
      get dirty() { return S.dirty; }
    };
    drawTabs();
    drawPanel();
    requestAnimationFrame(() => { drawWave(); updateChrome(); });
    if (init.note) ui.toast(init.note, 'info');
    return E;
  }

  async function render(params, ctx) {
    const root = h('div', { class: 'au' }, h('div', { class: 'st-loading' }, t('st_loading')));
    const p = params || {};
    let init = { tab: p.tab || 'effects' };
    if (p.project && p.path) {
      const asset = await CS.studio.readAsset(p.project, p.path);
      if (!ctx.alive()) return root;
      if (asset) {
        try {
          const clip = await A.decode(asset.bytes);
          const src = asset.project.studio && asset.project.studio.audio && asset.project.studio.audio[p.path];
          const source = src && src.size === asset.bytes.length ? { kind: src.kind, opts: src.opts, song: src.song } : null;
          init = { clip, link: { project: p.project, path: p.path }, name: U.basename(p.path).replace(/\.[a-z0-9]+$/i, ''), source, tab: source ? (source.kind === 'song' ? 'music' : 'effects') : 'edit' };
        } catch (error) { init.note = t('au_open_failed'); }
      }
    }
    if (!ctx.alive()) return root;
    mountEditor(root, init);
    return root;
  }

  async function leave() {
    if (E && E.dirty && E.S.clip.length && !(await ui.confirm({ title: t('px_discard_q'), message: t('au_leave_body'), okLabel: t('px_discard'), danger: true }))) return false;
    if (E) { E.destroy(); E = null; }
    return true;
  }

  CS.studio.editor('audio', { title: () => t('st_audio'), render, leave });
  CS.soundLab = { get E() { return E; } };
})();
