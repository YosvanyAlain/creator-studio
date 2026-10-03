/* Helpers shared by features: project avatars, navigation shortcuts, error messages. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, icon, ui } = CS;
  const t = (...a) => CS.t(...a);

  function avatar(project, size) {
    const look = project.look || { icon: 'cube', tint: 'indigo' };
    const iconFile = project.files && project.files['icon.png'];
    if (iconFile && iconFile.kind === 'data' && iconFile.dataUrl) {
      return h('span', { class: ['avatar', size && 'avatar-' + size] }, h('img', { src: iconFile.dataUrl, alt: '', loading: 'lazy' }));
    }
    return h('span', { class: ['avatar', 'tint-' + look.tint, size && 'avatar-' + size] }, icon(look.icon || 'cube'));
  }

  function projectMeta(p) {
    const files = Object.keys(p.files || {}).length;
    return [t('n_files', { n: files }), CS.util.bytes(CS.projects.totalSize(p)), CS.util.relTime(p.updatedAt, CS.i18n.lang)].join(' · ');
  }

  async function openProject(id, tab) {
    const p = await CS.projects.open(id);
    if (!p) { ui.toast(t('err_project_missing'), 'error'); return; }
    await CS.router.go('workspace', { id, tab: tab || (p.workspace && p.workspace.tab) || 'code' });
  }

  function errorText(error) {
    const code = error && (error.code || error.message);
    const map = {
      'bad-path': 'err_bad_path', 'reserved-name': 'err_reserved_name', 'exists': 'err_exists', 'too-many-files': 'err_too_many_files',
      'file-too-big': 'err_file_too_big', 'project-too-big': 'err_project_too_big', 'storage-full': 'err_storage_full',
      'future-version': 'err_future_version', 'not-found': 'err_project_missing', 'invalid-project': 'err_invalid_file'
    };
    if (map[code]) return t(map[code], error.detail ? { path: error.detail.path, max: error.detail.max && CS.util.bytes(error.detail.max) } : undefined);
    return t('err_generic', { msg: String(error && error.message || error) });
  }

  function greeting() {
    const hour = new Date().getHours();
    return t(hour < 6 ? 'greet_night' : hour < 13 ? 'greet_morning' : hour < 20 ? 'greet_afternoon' : 'greet_evening');
  }

  /* Ask for a name with a sensible default; resolves null when cancelled. */
  function askName(opts) {
    return ui.prompt({ title: opts.title, label: opts.label || t('name'), value: opts.value || '', okLabel: opts.ok || t('save'), placeholder: opts.placeholder });
  }

  /* Download a Blob, or hand it to the chat when running inside a messenger. */
  async function deliver(blob, name, opts) {
    const o = opts || {};
    if (o.chat && window.webxdc && typeof window.webxdc.sendToChat === 'function') {
      try {
        const file = { name, type: o.type || 'file' };
        if (/^text\//.test(blob.type) || /json/.test(blob.type)) file.plainText = await blob.text();
        else file.base64 = CS.util.bytesToDataUrl(new Uint8Array(await blob.arrayBuffer())).split(',')[1];
        await window.webxdc.sendToChat({ file, text: o.text || null });
        return 'chat';
      } catch (error) { console.warn(error); }
    }
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: name, style: { display: 'none' } });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
    return 'download';
  }

  CS.common = { avatar, projectMeta, openProject, errorText, greeting, askName, deliver };
})();
