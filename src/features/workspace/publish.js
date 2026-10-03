/* Publish tab: readiness review with fixes, app details, and sharing the .xdc. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, ui } = CS;
  const U = CS.util;
  const t = (...a) => CS.t(...a);
  const LEVEL = { error: { icon: 'alert', tint: 'red' }, warn: { icon: 'alertTriangle', tint: 'amber' }, tip: { icon: 'bulb', tint: 'blue' } };

  function manifestName(p) {
    const f = p.files['manifest.toml'];
    if (f && f.kind === 'text') { const m = CS.exporter.parseManifest(f.content); if (m.name) return m.name; }
    return p.settings.xdcName || p.name;
  }

  function setSourceUrl(p, url) {
    p.settings.sourceCodeUrl = url;
    const f = p.files['manifest.toml'];
    if (f && f.kind === 'text') {
      const line = url ? 'source_code_url = "' + url.replace(/["\\]/g, '') + '"' : '';
      const text = /^\s*source_code_url\s*=.*$/m.test(f.content) ? f.content.replace(/^\s*source_code_url\s*=.*$/m, line) : f.content.replace(/\s*$/, '\n') + line + '\n';
      CS.projects.write('manifest.toml', text.replace(/\n{3,}/g, '\n\n'), { project: p });
    } else CS.projects.touch('settings');
  }

  function mount(host, api) {
    const p = api.project;
    let showTips = false;

    function itemRow(item) {
      const lv = LEVEL[item.level];
      const key = 'chk_' + item.key;
      const where = item.file ? item.file + (item.line ? ':' + item.line : '') : '';
      return h('div', { class: 'check-item check-' + item.level },
        h('span', { class: 'check-icon tint-' + lv.tint }, CS.icon(lv.icon)),
        h('div', { class: 'check-main' },
          h('div', { class: 'check-title' }, t(key, item.vars)),
          CS.i18n.has(key + '_b') ? h('div', { class: 'check-body' }, t(key + '_b', item.vars)) : null,
          h('div', { class: 'check-actions' },
            where ? h('button', { type: 'button', class: 'check-where', onclick: () => (p.files[item.file] && p.files[item.file].kind === 'text' ? api.openFile(item.file, { line: item.line }) : api.select('files')) }, CS.icon('code'), where) : null,
            item.fix ? ui.button({ label: t('chk_fix'), icon: 'wand', size: 'sm', variant: 'soft', onClick: () => {
              if (CS.checker.fix(p, item)) { CS.haptic(); ui.toast(t('chk_fixed'), 'ok'); render(); }
            } }) : null)));
    }

    function render() {
      const r = CS.checker.check(p);
      const problems = r.items.filter((x) => x.level !== 'tip');
      const tips = r.items.filter((x) => x.level === 'tip');
      const verdict = r.count.error ? { icon: 'alert', tint: 'red', title: t('pub_blocked', { n: r.count.error }), sub: t('pub_blocked_sub') }
        : r.count.warn ? { icon: 'checkCircle', tint: 'amber', title: t('pub_ready_warn'), sub: t('pub_ready_warn_sub', { n: r.count.warn }) }
          : { icon: 'checkCircle', tint: 'green', title: t('pub_ready'), sub: t('pub_ready_sub') };
      const usage = CS.projects.usage(p);
      const hasIcon = !!(p.files['icon.png'] || p.files['icon.jpg']);

      CS.mount(host, h('div', { class: 'publish view-inner' },
        h('div', { class: 'pub-hero' },
          CS.common.avatar(p, 'xl'),
          h('div', { class: 'pub-hero-text' }, h('h2', {}, manifestName(p)), h('div', { class: 'muted' }, t('n_files', { n: usage.files }) + ' · ' + U.bytes(usage.size)))),
        h('div', { class: 'verdict tint-soft-' + verdict.tint }, h('span', { class: 'verdict-icon tint-' + verdict.tint }, CS.icon(verdict.icon)),
          h('div', {}, h('b', {}, verdict.title), h('div', { class: 'small' }, verdict.sub))),
        h('div', { class: 'pub-actions' },
          ui.button({ label: t('pub_share'), icon: 'send', size: 'lg', class: 'grow', disabled: !r.ready, onClick: () => share(true) }),
          ui.button({ label: t('pub_download'), icon: 'download', size: 'lg', variant: 'soft', disabled: !r.ready, onClick: () => share(false) })),
        !r.ready ? h('p', { class: 'muted small center' }, t('pub_fix_first')) : null,
        problems.length ? ui.section(t('pub_review'), null, h('div', { class: 'check-list' }, problems.map(itemRow))) : null,
        tips.length ? ui.section(t('pub_tips', { n: tips.length }), ui.button({ label: showTips ? t('pub_hide') : t('pub_show'), variant: 'ghost', size: 'sm', onClick: () => { showTips = !showTips; render(); } }),
          showTips ? h('div', { class: 'check-list' }, tips.map(itemRow)) : null) : null,
        ui.section(t('pub_details'), null, h('div', { class: 'list' },
          ui.settingRow({ icon: 'type', tint: 'indigo', title: t('pub_name'), sub: manifestName(p), control: ui.iconButton('edit', t('rename'), async () => {
            const name = await ui.prompt({ title: t('pub_name'), label: t('pub_name_hint'), value: manifestName(p), okLabel: t('save') });
            if (name && name.trim()) { CS.projects.setManifestName(p, name.trim()); CS.projects.touch('settings'); render(); }
          }) }),
          ui.settingRow({ icon: hasIcon ? 'image' : 'palette', tint: 'pink', title: t('pub_icon'), sub: hasIcon ? t('pub_icon_own') : t('pub_icon_auto'),
            control: ui.button({ label: t('tl_icon_design'), icon: 'sparkles', size: 'sm', variant: 'soft', onClick: () => CS.tools.open('icon', { project: p.id, name: manifestName(p) }) }) }),
          ui.settingRow({ icon: 'link', tint: 'teal', title: t('pub_source'), sub: p.settings.sourceCodeUrl || t('pub_source_none'), control: ui.iconButton('edit', t('pub_source'), async () => {
            const url = await ui.prompt({ title: t('pub_source'), label: t('pub_source_hint'), value: p.settings.sourceCodeUrl || '', placeholder: 'https://', okLabel: t('save'), inputmode: 'url' });
            if (url == null) return;
            if (url && !/^https?:\/\/\S+$/.test(url.trim())) { ui.toast(t('pub_source_bad'), 'error'); return; }
            setSourceUrl(p, url.trim());
            render();
          }) })))));
    }

    async function share(toChat) {
      const busy = ui.toast(t('pub_building'), 'info', { ms: 8000 });
      try {
        await CS.projects.flush();
        const out = await CS.exporter.build(p);
        busy.remove();
        const text = toChat && CS.settings.get('exportCredit') ? t('pub_credit') : '';
        await CS.common.deliver(out.blob, out.name, { chat: toChat, text });
        ui.toast(toChat ? t('exp_sent') : t('exp_downloaded', { name: out.name }), 'ok');
        CS.snapshots.take(p, 'manual', t('pub_snapshot'));
      } catch (error) {
        busy.remove();
        ui.toast(CS.common.errorText(error), 'error');
      }
    }

    const off = CS.bus.on('file-changed', (e) => { if (e && e.project === p && !host.hidden) render(); });
    return { onShow: render, unmount: off };
  }

  CS.ws.tab({ id: 'publish', icon: 'export', label: 'ws_publish', order: 60, mount });
})();
