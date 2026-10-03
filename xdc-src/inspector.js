/* =========================================================================
 * Webxdc Creator Studio — inspector.js
 * webxdc API inspector with honest availability states.
 * ========================================================================= */
'use strict';
(function () {
  const CS = (globalThis.CS = globalThis.CS || {});
  const U = CS.util;

  const MAX = 250;
  const calls = [];
  let els = {};

  function t(key, params) { return CS.i18n.t(key, params); }

  function record(entry) {
    const row = {
      at: entry.at || Date.now(),
      method: String(entry.method || ''),
      args: entry.args || [],
      result: entry.result,
      error: entry.error || null,
      serial: entry.serial,
      sender: entry.sender || '',
      source: entry.source || 'preview',
      status: entry.status || (entry.source === 'preview' ? 'SIMULATED' : 'AVAILABLE')
    };
    calls.push(row);
    if (calls.length > MAX) calls.splice(0, calls.length - MAX);
    renderLog();
    return row;
  }

  function clear() { calls.length = 0; renderLog(); }

  function apiRows() {
    const cap = CS.capabilities ? CS.capabilities.detect() : { apis: {}, webxdc: 'UNAVAILABLE', runtime: {} };
    const names = [
      'sendUpdate', 'setUpdateListener', 'sendToChat', 'selfAddr', 'selfName',
      'sendUpdateInterval', 'sendUpdateMaxSize', 'importFiles', 'joinRealtimeChannel'
    ];
    return names.map(function (n) {
      return { name: n, status: (cap.apis && cap.apis[n]) || 'UNAVAILABLE' };
    });
  }

  function badge(status) {
    const map = {
      AVAILABLE: { cls: 'ok', label: 'AVAILABLE' },
      UNAVAILABLE: { cls: 'warn', label: 'UNAVAILABLE' },
      SIMULATED: { cls: 'client', label: 'SIMULATED' },
      NOT_SUPPORTED: { cls: 'err', label: 'NOT_SUPPORTED' }
    };
    const m = map[status] || map.UNAVAILABLE;
    return U.el('span', { class: 'api-badge ' + m.cls, text: m.label });
  }

  function renderLog() {
    if (!els.log) return;
    els.log.textContent = '';
    const frag = document.createDocumentFragment();
    calls.slice().reverse().slice(0, 80).forEach(function (c) {
      const row = U.el('div', { class: 'insp-row' });
      row.appendChild(U.el('span', { class: 'con-time', text: U.formatTime(c.at) }));
      row.appendChild(badge(c.status));
      row.appendChild(U.el('b', { class: 'mono', text: c.method }));
      if (c.serial != null) row.appendChild(U.el('span', { class: 'hint', text: ' #' + c.serial }));
      if (c.sender) row.appendChild(U.el('span', { class: 'hint', text: ' ' + c.sender }));
      let argsText = '';
      try { argsText = JSON.stringify(c.args); } catch (e) { argsText = String(c.args); }
      row.appendChild(U.el('div', { class: 'mono hint break', text: U.truncate(argsText, 180) }));
      if (c.error) row.appendChild(U.el('div', { class: 'err-text', text: String(c.error) }));
      frag.appendChild(row);
    });
    if (!calls.length) frag.appendChild(U.el('p', { class: 'hint', text: t('insp_empty') }));
    els.log.appendChild(frag);
  }

  function render(root) {
    els = {};
    root.textContent = '';
    const cap = CS.capabilities ? CS.capabilities.detect() : { webxdc: 'UNAVAILABLE', storage: {}, runtime: {}, apis: {} };

    root.appendChild(U.el('div', { class: 'card' },
      U.el('div', { class: 'card-head' }, U.icon('inspect', { size: 16 }), U.el('span', { text: t('insp_title') })),
      U.el('p', { class: 'hint', text: t('insp_intro') })));

    const apiCard = U.el('div', { class: 'card' },
      U.el('div', { class: 'card-head' }, U.el('span', { text: t('insp_apis') })));
    const table = U.el('div', { class: 'insp-table' });
    apiRows().forEach(function (r) {
      const line = U.el('div', { class: 'insp-api' },
        U.el('code', { text: 'webxdc.' + r.name }),
        badge(r.status));
      table.appendChild(line);
    });
    apiCard.appendChild(table);
    apiCard.appendChild(U.el('p', { class: 'hint', text: t('insp_webxdc_status') + ': ' + cap.webxdc }));
    root.appendChild(apiCard);

    const rt = U.el('div', { class: 'card' },
      U.el('div', { class: 'card-head' }, U.el('span', { text: t('insp_runtime') })));
    const rtList = U.el('ul', { class: 'env-list' });
    const runtime = cap.runtime || {};
    Object.keys(runtime).forEach(function (k) {
      rtList.appendChild(U.el('li', {},
        U.el('span', { text: k }),
        badge(runtime[k])));
    });
    const storage = cap.storage || {};
    rtList.appendChild(U.el('li', {}, U.el('span', { text: 'storage' }), U.el('b', { text: storage.strategy || '?' })));
    rt.appendChild(rtList);
    root.appendChild(rt);

    const logCard = U.el('div', { class: 'card' },
      U.el('div', { class: 'card-head' },
        U.el('span', { text: t('insp_log') }),
        U.el('span', { class: 'spacer' }),
        U.el('button', { class: 'btn ghost small', onclick: clear }, t('clear'))));
    logCard.appendChild(U.el('p', { class: 'notice warn', text: t('insp_log_sim') }));
    els.log = U.el('div', { class: 'insp-log' });
    logCard.appendChild(els.log);
    root.appendChild(logCard);
    renderLog();
  }

  CS.inspector = {
    render: render,
    record: record,
    clear: clear,
    apiRows: apiRows,
    get calls() { return calls.slice(); }
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = CS.inspector; }
})();
