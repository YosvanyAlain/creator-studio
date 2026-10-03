/* =========================================================================
 * Webxdc Creator Studio — collab.js
 * Lightweight collaboration via webxdc sendUpdate presence.
 * ========================================================================= */
'use strict';
(function () {
  const CS = (globalThis.CS = globalThis.CS || {});
  const U = CS.util;

  const KIND = {
    PRESENCE: 'presence',
    CURSOR: 'cursor',
    OFFER: 'project-offer',
    CHUNK: 'project-chunk',
    DONE: 'project-done'
  };
  const CHUNK = 80000;
  const PRESENCE_MS = 12000;

  let running = false;
  let listenerBound = false;
  const peers = new Map();
  const incoming = {}; /* transferId → { chunks, total, meta } */
  let presenceTimer = null;
  let lastCursor = null;

  function t(key, params) { return CS.i18n.t(key, params); }

  function status() {
    if (CS.capabilities) {
      const st = CS.capabilities.apiStatus('sendUpdate');
      if (st === 'AVAILABLE') return running ? 'AVAILABLE' : 'UNAVAILABLE';
      if (st === 'SIMULATED') return 'SIMULATED';
      return 'UNAVAILABLE';
    }
    if (typeof window === 'undefined' || !window.webxdc || typeof window.webxdc.sendUpdate !== 'function') {
      return 'UNAVAILABLE';
    }
    return running ? 'AVAILABLE' : 'UNAVAILABLE';
  }

  function selfInfo() {
    const w = (typeof window !== 'undefined') ? window.webxdc : null;
    return {
      addr: (w && w.selfAddr) || 'local',
      name: (w && w.selfName) || 'me'
    };
  }

  function envelope(kind, extra) {
    const me = selfInfo();
    const payload = Object.assign({
      __csCollab: true,
      v: 1,
      kind: kind,
      from: me,
      at: Date.now()
    }, extra || {});
    return payload;
  }

  function send(kind, extra, info) {
    const st = status();
    if (st === 'UNAVAILABLE') return Promise.resolve({ ok: false, status: st });
    const w = window.webxdc;
    const payload = envelope(kind, extra);
    try {
      /* empty info on presence: Delta Chat shows a chat notice.
       * Solo se adjunta info cuando el usuario comparte un proyecto. */
      const update = { payload: payload };
      if (info) update.info = info;
      const p = w.sendUpdate(update, '');
      return Promise.resolve(p).then(function () { return { ok: true, status: st }; });
    } catch (e) {
      return Promise.resolve({ ok: false, error: String(e && e.message || e) });
    }
  }

  function onUpdate(u) {
    const p = u && u.payload;
    if (!p || p.__csCollab !== true || p.v !== 1) return;
    const me = selfInfo();
    if (p.from && p.from.addr === me.addr) return;
    if (p.from && p.from.addr) {
      peers.set(p.from.addr, { addr: p.from.addr, name: p.from.name, at: Date.now(), cursor: p.kind === KIND.CURSOR ? p.cursor : (peers.get(p.from.addr) || {}).cursor });
    }
    if (p.kind === KIND.OFFER) {
      if (CS.app && CS.app.toast) {
        CS.app.toast(t('collab_offer', { name: (p.from && p.from.name) || '?' }), 'ok', {
          ttl: 8000,
          action: {
            label: t('collab_accept'),
            fn: function () { incoming[p.transferId] = { chunks: [], total: p.chunks, meta: p, accepted: true }; }
          }
        });
      }
    } else if (p.kind === KIND.CHUNK) {
      const bag = incoming[p.transferId];
      if (!bag || !bag.accepted) return;
      bag.chunks[p.index] = p.data;
    } else if (p.kind === KIND.DONE) {
      const bag = incoming[p.transferId];
      if (!bag || !bag.accepted) return;
      try {
        const json = bag.chunks.join('');
        const obj = JSON.parse(json);
        const migrated = CS.projects.migrate(obj);
        CS.projects.current = migrated;
        CS.projects.save(migrated).then(function () {
          if (CS.app && CS.app.toast) CS.app.toast(t('collab_applied'), 'ok');
          if (CS.app && CS.app.showView) CS.app.showView('editor');
        });
      } catch (e) {
        if (CS.app && CS.app.toast) CS.app.toast(t('collab_apply_fail') + ': ' + (e && e.message || e), 'error');
      }
      delete incoming[p.transferId];
    }
    if (CS.inspector && p.kind) {
      CS.inspector.record({
        method: 'collab.' + p.kind,
        args: [p.from],
        source: status() === 'SIMULATED' ? 'preview' : 'webxdc',
        status: status() === 'AVAILABLE' ? 'AVAILABLE' : 'SIMULATED'
      });
    }
  }

  async function start() {
    const st = CS.capabilities ? CS.capabilities.apiStatus('sendUpdate') : 'UNAVAILABLE';
    if (st === 'UNAVAILABLE') {
      running = false;
      return { ok: false, status: 'UNAVAILABLE' };
    }
    if (st === 'SIMULATED') {
      /* En preview se puede "arrancar" para probar el protocolo, marcado SIMULATED. */
    }
    running = true;
    if (!listenerBound && window.webxdc && typeof window.webxdc.setUpdateListener === 'function') {
      listenerBound = true;
      try {
        await window.webxdc.setUpdateListener(function (u) { onUpdate(u); }, 0);
      } catch (e) { listenerBound = false; }
    }
    sendPresence();
    if (presenceTimer) clearInterval(presenceTimer);
    presenceTimer = setInterval(sendPresence, PRESENCE_MS);
    return { ok: true, status: status() };
  }

  function stop() {
    running = false;
    if (presenceTimer) { clearInterval(presenceTimer); presenceTimer = null; }
  }

  function sendPresence() {
    if (!running) return;
    return send(KIND.PRESENCE, { view: CS.app ? CS.app.view : '' }, '');
  }

  function sendCursor(info) {
    lastCursor = info || lastCursor;
    if (!running) return Promise.resolve({ ok: false });
    return send(KIND.CURSOR, { cursor: lastCursor }, '');
  }

  async function offerProject(project) {
    project = project || (CS.projects && CS.projects.current);
    if (!project) return { ok: false, error: 'no-project' };
    const st = status();
    if (st === 'UNAVAILABLE') return { ok: false, status: st };
    let json;
    try { json = JSON.stringify(project); } catch (e) { return { ok: false, error: 'not-serializable' }; }
    const bytes = U.byteLen(json);
    const max = (window.webxdc && window.webxdc.sendUpdateMaxSize) || 128000;
    const piece = Math.min(CHUNK, Math.max(8000, max - 8000));
    const chunks = [];
    for (let i = 0; i < json.length; i += piece) chunks.push(json.slice(i, i + piece));
    if (chunks.length > 80) return { ok: false, error: 'too-many-chunks' };
    const transferId = U.uid();
    await send(KIND.OFFER, {
      transferId: transferId,
      chunks: chunks.length,
      bytes: bytes,
      name: project.name
    }, '');
    for (let i = 0; i < chunks.length; i++) {
      await send(KIND.CHUNK, { transferId: transferId, index: i, data: chunks[i] }, '');
    }
    await send(KIND.DONE, { transferId: transferId }, '');
    return { ok: true, chunks: chunks.length, bytes: bytes, status: st };
  }

  function peerList() {
    const now = Date.now();
    const out = [];
    peers.forEach(function (p) {
      if (now - p.at < 40000) out.push(p);
    });
    return out;
  }

  function render(root) {
    root.textContent = '';
    const st = CS.capabilities ? CS.capabilities.apiStatus('sendUpdate') : 'UNAVAILABLE';
    root.appendChild(U.el('div', { class: 'card' },
      U.el('div', { class: 'card-head' }, U.icon('users', { size: 16 }), U.el('span', { text: t('collab_title') })),
      U.el('p', { class: 'hint', text: t('collab_intro') }),
      U.el('p', {}, U.el('span', { class: 'api-badge ' + (st === 'AVAILABLE' ? 'ok' : (st === 'SIMULATED' ? 'client' : 'warn')), text: st }))));

    if (st === 'UNAVAILABLE') {
      root.appendChild(U.el('p', { class: 'notice warn', text: t('collab_need_webxdc') }));
      return;
    }
    const row = U.el('div', { class: 'row-gap wrap' });
    row.appendChild(U.el('button', {
      class: 'btn primary',
      onclick: function () { start().then(function (r) { if (CS.app) CS.app.toast(r.ok ? t('collab_on') : t('collab_need_webxdc'), r.ok ? 'ok' : 'warn'); render(root); }); }
    }, t('collab_start')));
    row.appendChild(U.el('button', {
      class: 'btn ghost',
      onclick: function () { stop(); if (CS.app) CS.app.toast(t('collab_off')); render(root); }
    }, t('collab_stop')));
    row.appendChild(U.el('button', {
      class: 'btn',
      onclick: function () {
        offerProject().then(function (r) {
          if (!CS.app) return;
          if (!r.ok) CS.app.toast(t('collab_send_fail') + (r.error ? ': ' + r.error : ''), 'error');
          else CS.app.toast(t('collab_sent', { n: r.chunks }), 'ok');
        });
      }
    }, t('collab_send_project')));
    root.appendChild(row);

    const list = U.el('div', { class: 'card' }, U.el('div', { class: 'card-head' }, U.el('span', { text: t('collab_peers') })));
    const pl = peerList();
    if (!pl.length) list.appendChild(U.el('p', { class: 'hint', text: t('collab_nobody') }));
    else pl.forEach(function (p) {
      list.appendChild(U.el('div', { class: 'proj-row' },
        U.el('span', { text: p.name || p.addr }),
        U.el('span', { class: 'hint', text: p.addr })));
    });
    root.appendChild(list);
  }

  CS.collab = {
    KIND: KIND,
    status: status,
    start: start,
    stop: stop,
    sendPresence: sendPresence,
    sendCursor: sendCursor,
    offerProject: offerProject,
    onUpdate: onUpdate,
    peers: peerList,
    render: render,
    get running() { return running; },
    _resetForTests: function () {
      stop();
      peers.clear();
      listenerBound = false;
      Object.keys(incoming).forEach(function (k) { delete incoming[k]; });
    }
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = CS.collab; }
})();
