/* Settings: appearance, language, editor, data and about. Also the version history view. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, ui, router } = CS;
  const t = (...a) => CS.t(...a);
  const S = CS.settings;
  const C = () => CS.common;

  function group(title, ...rows) { return ui.section(title, null, h('div', { class: 'list' }, rows)); }

  function toggleRow(key, icon, tint, title, sub) {
    return ui.settingRow({ icon, tint, title, sub, control: ui.toggle(S.get(key), (v) => S.set(key, v)) });
  }

  async function storageRow() {
    const est = await CS.store.estimate();
    const modeText = t('storage_mode_' + est.mode);
    const sub = t('storage_usage', { n: est.count, size: CS.util.bytes(est.bytes) }) + (est.quota ? ' · ' + t('storage_quota', { size: CS.util.bytes(est.quota) }) : '');
    return ui.settingRow({ icon: 'box', tint: est.mode === 'idb' ? 'green' : 'amber', title: modeText, sub, control: null });
  }

  async function render() {
    const editorFont = S.get('editorFont');
    return h('div', { class: 'settings' },
      h('h1', { class: 'page-title' }, t('tab_settings')),
      group(t('set_appearance'),
        ui.settingRow({ icon: 'sun', tint: 'amber', title: t('set_theme'), control: ui.segmented([
          { value: 'auto', label: t('theme_auto') }, { value: 'light', label: t('theme_light') }, { value: 'dark', label: t('theme_dark') }], S.get('theme'), (v) => S.set('theme', v)) }),
        ui.settingRow({ icon: 'fontSize', tint: 'blue', title: t('set_text_size'), control: ui.segmented([
          { value: 's', label: 'A-' }, { value: 'm', label: 'A' }, { value: 'l', label: 'A+' }], S.get('font'), (v) => S.set('font', v)) }),
        toggleRow('reduceMotion', 'sparkles', 'violet', t('set_motion'), t('set_motion_sub')),
        toggleRow('haptics', 'phone', 'slate', t('set_haptics'), t('set_haptics_sub'))),
      group(t('set_language'),
        ui.settingRow({ icon: 'globe', tint: 'teal', title: t('set_language'), sub: t('set_language_sub'), control: ui.select([
          { value: 'auto', label: t('lang_auto') }, { value: 'es', label: 'Español' }, { value: 'en', label: 'English' }], S.get('lang'), (v) => CS.i18n.setLang(v)) })),
      group(t('set_editor'),
        ui.settingRow({ icon: 'type', tint: 'indigo', title: t('set_editor_font'), control: ui.select(
          [{ value: '', label: t('auto') }].concat([11, 12, 13, 14, 15, 16, 18].map((n) => ({ value: String(n), label: n + ' px' }))),
          editorFont ? String(editorFont) : '', (v) => S.set('editorFont', v ? Number(v) : null)) }),
        toggleRow('editorWrap', 'wrap', 'indigo', t('set_wrap'), t('set_wrap_sub')),
        toggleRow('editorLines', 'list', 'indigo', t('set_lines')),
        toggleRow('editorSuggest', 'sparkles', 'violet', t('set_suggest'), t('set_suggest_sub')),
        toggleRow('symbolBar', 'keyboard', 'slate', t('set_symbols'), t('set_symbols_sub')),
        CS.monaco && CS.monaco.available() ? toggleRow('preferMonaco', 'code', 'blue', t('set_monaco'), t('set_monaco_sub')) : null),
      group(t('set_sharing'),
        toggleRow('exportCredit', 'tag', 'pink', t('set_credit'), t('set_credit_sub'))),
      ui.section(t('set_data'), null, h('div', { class: 'list' },
        await storageRow(),
        ui.row({ icon: 'export', tint: 'blue', title: t('backup_export'), sub: t('backup_export_sub'), onClick: () => CS.backup.exportFlow() }),
        ui.row({ icon: 'import', tint: 'green', title: t('backup_import'), sub: t('backup_import_sub'), onClick: () => CS.backup.importFlow() }),
        ui.row({ icon: 'trash', title: t('wipe_all'), sub: t('wipe_all_sub'), danger: true, onClick: wipe }))),
      ui.section(t('set_about'), null, h('div', { class: 'list' },
        ui.row({ lead: h('span', { class: 'about-mark' }, CS.icons.mark(40)), title: t('app_name'), sub: t('version_n', { v: CS.app.VERSION }) + ' · ' + t('about_tagline'), onClick: () => router.go('about') }),
        ui.row({ icon: 'learn', tint: 'green', title: t('about_help'), onClick: () => router.switchTab('learn') }))));
  }

  async function wipe() {
    const first = await ui.confirm({ title: t('wipe_all_q'), message: t('wipe_all_body'), okLabel: t('continue'), danger: true });
    if (!first) return;
    const word = t('wipe_word');
    const typed = await ui.prompt({ title: t('wipe_confirm_title'), message: t('wipe_confirm_body', { word }), okLabel: t('delete') });
    if (!typed || typed.trim().toUpperCase() !== word.toUpperCase()) { ui.toast(t('wipe_cancelled')); return; }
    await CS.projects.close();
    await CS.store.wipe();
    ui.toast(t('wipe_done'), 'ok');
    router.refresh();
  }

  router.register('settings', { tab: 'settings', root: true, largeTitle: true, title: () => t('tab_settings'), render });

  router.register('about', {
    tab: 'settings', title: () => t('set_about'),
    render: () => h('div', { class: 'about' },
      h('div', { class: 'about-hero' }, CS.icons.mark(96), h('h1', {}, t('app_name')), h('p', { class: 'muted' }, t('version_n', { v: CS.app.VERSION }))),
      h('p', { class: 'prose center' }, t('about_body')),
      ui.section(t('about_principles'), null, h('div', { class: 'list' },
        ['offline', 'private', 'nocode', 'open'].map((k) => ui.row({ icon: { offline: 'globe', private: 'shield', nocode: 'blocks', open: 'code' }[k], tint: 'indigo', title: t('about_p_' + k), sub: t('about_p_' + k + '_sub') })))),
      ui.section(t('about_licenses'), null, h('p', { class: 'small muted' }, t('about_licenses_body'))))
  });

  /* ---------- Version history ---------- */
  router.register('history', {
    tab: 'projects', title: () => t('history'),
    async render(params, ctx) {
      const p = await CS.store.get(params.id);
      if (!p) return ui.errorState(t('err_project_missing'));
      const snaps = await CS.snapshots.list(p.id);
      const take = ui.button({ label: t('hist_take'), icon: 'save', variant: 'primary', onClick: async () => {
        const label = await ui.prompt({ title: t('hist_take'), label: t('hist_label'), placeholder: t('hist_label_ph') });
        if (label === null) return;
        try { await CS.snapshots.take(CS.projects.migrate(p), 'manual', label); ui.toast(t('hist_taken'), 'ok'); ctx.refresh(); }
        catch (error) { ui.toast(C().errorText(error), 'error'); }
      } });
      const rows = snaps.map((s) => ui.row({
        icon: s.reason === 'auto' ? 'clock' : 'save', tint: s.reason === 'auto' ? 'slate' : 'indigo',
        title: s.label || t('hist_reason_' + (['auto', 'restore', 'export'].includes(s.reason) ? s.reason : 'manual')),
        sub: new Date(s.createdAt).toLocaleString(CS.i18n.lang) + ' · ' + CS.util.bytes(s.bytes),
        onClick: () => ui.menu({ title: s.label || t('hist_version'), items: [
          { icon: 'history', label: t('hist_restore'), onClick: async () => {
            if (!(await ui.confirm({ title: t('hist_restore_q'), message: t('hist_restore_body'), okLabel: t('hist_restore') }))) return;
            const current = CS.projects.migrate(await CS.store.get(p.id));
            await CS.snapshots.take(current, 'restore', t('hist_before_restore'));
            const restored = CS.projects.migrate(CS.util.deepClone(s.project));
            restored.id = p.id;
            restored.updatedAt = Date.now();
            await CS.store.put(restored);
            if (CS.projects.current && CS.projects.current.id === p.id) { await CS.projects.close(); }
            ui.toast(t('hist_restored'), 'ok');
            ctx.refresh();
          } },
          { icon: 'copy', label: t('hist_as_copy'), onClick: async () => {
            const copy = CS.projects.migrate(CS.util.deepClone(s.project));
            copy.id = CS.util.uid('p');
            copy.name = t('project_copy_name', { name: copy.name });
            copy.createdAt = copy.updatedAt = Date.now();
            await CS.projects.add(copy);
            ui.toast(t('proj_duplicated'), 'ok');
          } },
          { icon: 'trash', label: t('delete'), danger: true, onClick: async () => { await CS.snapshots.remove(s.id); ctx.refresh(); } }
        ] })
      }));
      return h('div', {},
        h('h1', { class: 'page-title' }, p.name),
        h('p', { class: 'page-sub' }, t('hist_sub', { n: CS.snapshots.MAX_PER_PROJECT })),
        h('div', { class: 'btn-row', style: { margin: '12px 0' } }, take),
        snaps.length ? h('div', { class: 'list' }, rows) : ui.empty({ icon: 'history', title: t('hist_empty'), body: t('hist_empty_body') }));
    }
  });
})();
