/* Test tab: run the app as 1-4 people, with console, messages and stored data. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, ui } = CS;
  const t = (...a) => CS.t(...a);
  const MAX_LOG = 300;

  /* Common browser error texts mapped to a plain-language hint. */
  const HINTS = [
    [/Cannot read propert(y|ies) of (null|undefined)|null is not an object|is null/i, 'hint_null'],
    [/is not defined/i, 'hint_not_defined'],
    [/is not a function/i, 'hint_not_function'],
    [/Unexpected token|Unexpected end of input|missing \)|SyntaxError/i, 'hint_syntax'],
    [/JSON/i, 'hint_json'],
    [/Assignment to constant/i, 'hint_const'],
    [/Maximum call stack/i, 'hint_recursion']
  ];

  function mount(host, api) {
    const p = api.project;
    let sim = null;
    let dirty = true;
    let peers = 1;
    let logs = [];
    let drawerTab = 'console';
    let drawerOpen = false;
    let errors = 0;

    const stage = h('div', { class: 'sim-stage' });
    const drawer = h('div', { class: 'sim-drawer' });
    const drawerBody = h('div', { class: 'sim-drawer-body' });
    const badge = h('span', { class: 'sim-badge', hidden: true });
    const peersCtl = ui.segmented([1, 2, 3, 4].map((n) => ({ value: n, label: String(n), icon: n === 1 ? 'user' : 'users' })), peers, (v) => { peers = v; if (sim) sim.setPeers(v); });
    const pageSel = h('div', { class: 'sim-page' });

    const drawerHead = h('div', { class: 'sim-drawer-head' },
      h('button', { type: 'button', class: 'sim-drawer-toggle', onclick: () => setDrawer(!drawerOpen), 'aria-expanded': 'false' },
        CS.icon('terminal'), h('span', { class: 'sr-only' }, t('sim_console')), badge, h('span', { class: 'spacer' }), CS.icon('chevronUp')),
      h('div', { class: 'sim-drawer-tabs' }, ['console', 'messages', 'data'].map((id) => h('button', {
        type: 'button', class: 'chip', dataset: { tab: id }, onclick: () => { drawerTab = id; setDrawer(true); renderDrawer(); }
      }, t('sim_tab_' + id)))));
    drawer.append(drawerHead, drawerBody);

    CS.mount(host, h('div', { class: 'sim' },
      h('div', { class: 'sim-toolbar' },
        h('span', { class: 'sim-label' }, t('sim_people')), peersCtl, pageSel, h('span', { class: 'spacer' }),
        ui.iconButton('refresh', t('sim_reload'), () => { logs = []; errors = 0; renderDrawer(); sim && sim.reload(); }),
        ui.iconButton('moreV', t('more'), moreMenu)),
      stage, drawer));

    function setDrawer(open) {
      drawerOpen = open;
      drawer.classList.toggle('open', open);
      drawerHead.querySelector('.sim-drawer-toggle').setAttribute('aria-expanded', String(open));
      renderDrawer();
    }

    function moreMenu() {
      ui.menu({ title: t('sim_options'), items: [
        { icon: 'trash', label: t('sim_reset'), sub: t('sim_reset_sub'), onClick: () => { logs = []; errors = 0; sim && sim.resetData(); ui.toast(t('sim_reset_done'), 'ok'); } },
        { icon: 'wifi', label: t('sim_network'), sub: t('sim_network_sub'), onClick: networkSheet },
        { icon: 'export', label: t('ws_share'), onClick: () => api.select('publish') }
      ] });
    }

    let latency = 0;
    let drop = 0;
    function networkSheet() {
      const body = h('div', { class: 'stack' },
        ui.settingRow({ icon: 'timer', tint: 'blue', title: t('sim_latency'), sub: t('sim_latency_sub'),
          control: ui.select([0, 300, 1000, 3000].map((v) => ({ value: v, label: v ? (v / 1000) + ' s' : t('sim_instant') })), latency, (v) => { latency = Number(v); sim && sim.setNetwork({ latency }); }) }),
        ui.settingRow({ icon: 'wifiOff', tint: 'orange', title: t('sim_drop'), sub: t('sim_drop_sub'),
          control: ui.select([0, 0.1, 0.3].map((v) => ({ value: v, label: v ? Math.round(v * 100) + '%' : t('sim_none') })), drop, (v) => { drop = Number(v); sim && sim.setNetwork({ drop }); }) }));
      ui.sheet({ title: t('sim_network'), subtitle: t('sim_network_note'), body });
    }

    /* ---------- Session ---------- */
    function start() {
      if (sim) sim.destroy();
      logs = [];
      errors = 0;
      sim = CS.sim.create({ project: p, peers, latency, drop });
      sim.on(onEvent);
      sim.attach(stage);
      dirty = false;
      renderPages();
    }

    function renderPages() {
      const pages = Object.keys(p.files).filter((x) => /\.html?$/i.test(x) && p.files[x].kind === 'text');
      CS.mount(pageSel, pages.length > 1 ? ui.select(pages.map((x) => ({ value: x, label: x })), sim.entry, (v) => sim.setEntry(v)) : null);
    }

    function onEvent(e) {
      if (e.type === 'reload') { logs = []; errors = 0; badge.hidden = true; renderDrawer(); return layout(e.frames); }
      if (e.type === 'no-entry') return CS.mount(stage, ui.empty({ icon: 'fileHtml', title: t('sim_no_entry'), body: t('sim_no_entry_body') }));
      if (e.type === 'console') return log(e.level, e.text, e);
      if (e.type === 'missing') return e.files.forEach((f) => log('error', f, { code: 'missing-file', peer: e.peer }));
      if (e.type === 'update') {
        let preview;
        try { preview = JSON.stringify(e.update.payload); } catch (error) { preview = String(e.update.payload); }
        log('update', preview, { peer: e.peer, serial: e.update.serial, info: e.update.info, size: e.size });
        if (drawerTab === 'messages' && drawerOpen) renderDrawer();
        return;
      }
      if (e.type === 'chat') return chatPreview(e);
      if (e.type === 'dropped') return log('sys', t('sim_dropped', { serial: e.serial, name: sim.PEOPLE[e.peer - 1].name }), e);
      if (e.type === 'storage' && drawerTab === 'data' && drawerOpen) return renderDrawer();
      if (e.type === 'navigate') { renderPages(); return; }
    }

    function layout(frames) {
      const multi = frames.length > 1;
      stage.classList.toggle('multi', multi);
      CS.mount(stage, frames.map((frame, i) => {
        const person = sim.PEOPLE[i];
        return h('div', { class: 'sim-device' },
          multi ? h('div', { class: 'sim-device-head' }, h('span', { class: 'sim-dot tint-' + person.tint }, person.name[0]), h('span', {}, person.name)) : null,
          h('div', { class: 'sim-screen' }, frame));
      }));
    }

    function log(level, text, extra) {
      const entry = Object.assign({ level, text: String(text), at: null, time: Date.now() }, extra || {});
      logs.push(entry);
      if (logs.length > MAX_LOG) logs.shift();
      if (level === 'error') {
        errors++;
        badge.textContent = String(errors);
        badge.hidden = false;
        if (!drawerOpen) { drawerTab = 'console'; setDrawer(true); return; }
      }
      if (drawerOpen && drawerTab === 'console') appendLog(entry);
    }

    function explainError(entry) {
      if (entry.code && CS.i18n.has('sim_err_' + entry.code.replace(/-/g, '_'))) return t('sim_err_' + entry.code.replace(/-/g, '_'), { text: entry.text });
      for (const [re, key] of HINTS) if (re.test(entry.text)) return t(key);
      return '';
    }

    function logRow(entry) {
      const person = sim && peers > 1 && entry.peer ? sim.PEOPLE[entry.peer - 1] : null;
      if (entry.level === 'update') {
        return h('div', { class: 'log log-update' }, CS.icon('send'),
          h('div', { class: 'log-main' }, h('div', { class: 'log-text mono' }, (person ? person.name + ' · ' : '') + 'sendUpdate #' + entry.serial + ' · ' + CS.util.bytes(entry.size)),
            h('div', { class: 'log-sub mono' }, entry.text.length > 160 ? entry.text.slice(0, 160) + '…' : entry.text)));
      }
      const hint = entry.level === 'error' || entry.level === 'warn' ? explainError(entry) : '';
      const at = entry.at && entry.at.file && p.files[entry.at.file] ? entry.at : null;
      const title = entry.code && entry.code !== 'runtime' && hint ? hint : entry.text;
      return h('div', { class: ['log', 'log-' + entry.level] }, CS.icon(entry.level === 'error' ? 'alert' : entry.level === 'warn' ? 'alertTriangle' : entry.level === 'sys' ? 'info' : 'chevronRight'),
        h('div', { class: 'log-main' },
          h('div', { class: ['log-text', !(entry.code && hint) && 'mono'] }, (person ? person.name + ': ' : '') + title),
          hint && title !== hint ? h('div', { class: 'log-sub' }, hint) : null,
          at ? h('button', { type: 'button', class: 'log-link', onclick: () => api.openFile(at.file, { line: at.line }) }, CS.icon('code'), t('sim_goto', { file: at.file, line: at.line })) : null));
    }

    function appendLog(entry) {
      const list = drawerBody.querySelector('.log-list');
      if (!list) return renderDrawer();
      const empty = list.querySelector('.log-empty');
      if (empty) empty.remove();
      list.appendChild(logRow(entry));
      list.scrollTop = list.scrollHeight;
    }

    function renderDrawer() {
      drawer.querySelectorAll('.sim-drawer-tabs .chip').forEach((c) => c.classList.toggle('on', c.dataset.tab === drawerTab));
      if (!drawerOpen) return;
      if (drawerTab === 'console') {
        const items = logs.filter((x) => x.level !== 'update');
        const list = h('div', { class: 'log-list' }, items.length ? items.map(logRow) : h('div', { class: 'log-empty muted' }, t('sim_console_empty')));
        CS.mount(drawerBody, [list, h('div', { class: 'log-actions' }, ui.button({ label: t('sim_clear'), icon: 'trash', variant: 'ghost', size: 'sm', onClick: () => { logs = logs.filter((x) => x.level === 'update'); errors = 0; badge.hidden = true; renderDrawer(); } }))]);
        list.scrollTop = list.scrollHeight;
      } else if (drawerTab === 'messages') {
        const items = logs.filter((x) => x.level === 'update');
        CS.mount(drawerBody, h('div', { class: 'log-list' }, items.length ? items.map(logRow) : h('div', { class: 'log-empty muted' }, t('sim_messages_empty'))));
      } else {
        const rows = [];
        for (let i = 1; i <= peers; i++) {
          const data = (sim && sim.storage(i)) || {};
          const keys = Object.keys(data);
          rows.push(h('div', { class: 'store-block' }, h('div', { class: 'field-label' }, peers > 1 ? sim.PEOPLE[i - 1].name : t('sim_you')),
            keys.length ? keys.map((k) => h('div', { class: 'store-row mono' }, h('b', {}, k), h('span', {}, String(data[k]).slice(0, 200)))) : h('div', { class: 'muted small' }, t('sim_storage_empty'))));
        }
        CS.mount(drawerBody, h('div', { class: 'log-list' }, h('p', { class: 'muted small' }, t('sim_storage_note')), rows));
      }
    }

    function chatPreview(e) {
      const m = e.message || {};
      log('sys', t('sim_chat_log', { what: m.name || m.text || '…' }), e);
      ui.sheet({ title: t('sim_chat_title'), subtitle: t('sim_chat_sub'), body: h('div', { class: 'stack' },
        m.text ? h('p', {}, m.text) : null,
        m.name ? ui.row({ icon: 'file', tint: 'slate', title: m.name, sub: m.size != null ? CS.util.bytes(m.size) : '' }) : null),
      actions: m.base64 ? [ui.button({ label: t('exp_download_file'), icon: 'download', onClick: () => {
        const bin = atob(m.base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        CS.common.deliver(new Blob([bytes]), m.name || 'file');
      } })] : [] });
    }

    const off = CS.bus.on('file-changed', (e) => { if (e && e.project === p) dirty = true; });
    return {
      onShow() { if (dirty || !sim) start(); },
      onHide() {},
      unmount() { off(); if (sim) sim.destroy(); sim = null; }
    };
  }

  CS.ws.tab({ id: 'test', icon: 'play', label: 'ws_test', order: 30, mount });
})();
