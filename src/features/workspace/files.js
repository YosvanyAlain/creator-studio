/* Files tab: folder tree, new files from typed starters, uploads, asset previews. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, ui } = CS;
  const U = CS.util;
  const t = (...a) => CS.t(...a);

  const STARTERS = [
    { id: 'html', icon: 'fileHtml', tint: 'orange', ext: 'html', content: (name) => '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>' + name + '</title>\n  <link rel="stylesheet" href="style.css">\n  <script src="webxdc.js"></script>\n</head>\n<body>\n  <h1>' + name + '</h1>\n  <a href="index.html">←</a>\n</body>\n</html>\n' },
    { id: 'css', icon: 'fileCss', tint: 'blue', ext: 'css', content: () => '/* Styles */\n' },
    { id: 'js', icon: 'fileJs', tint: 'amber', ext: 'js', content: () => '// Code\n' },
    { id: 'json', icon: 'braces', tint: 'teal', ext: 'json', content: () => '{\n  \n}\n' },
    { id: 'text', icon: 'file', tint: 'slate', ext: 'txt', content: () => '' }
  ];

  const iconFor = (path, f) => {
    if (f && f.kind === 'data') return /^image\//.test(f.mime || '') ? 'image' : /^audio\//.test(f.mime || '') ? 'wave' : 'file';
    const lang = CS.editor.langOf(path);
    return lang === 'html' ? 'fileHtml' : lang === 'css' ? 'fileCss' : lang === 'js' ? 'fileJs' : lang === 'json' ? 'braces' : 'file';
  };
  const tintFor = (path, f) => {
    const icon = iconFor(path, f);
    return { fileHtml: 'orange', fileCss: 'blue', fileJs: 'amber', braces: 'teal', image: 'pink', wave: 'green' }[icon] || 'slate';
  };

  async function newFile(api, folder) {
    const p = api.project;
    const kind = await new Promise((resolve) => {
      const sheet = ui.sheet({ title: t('files_new'), subtitle: folder ? folder + '/' : '', body: h('div', { class: 'type-grid' }, STARTERS.map((s) => h('button', {
        type: 'button', class: 'type-card', onclick: () => { sheet.close(); resolve(s); }
      }, ui.tile(s.icon, s.tint), h('b', {}, t('files_type_' + s.id)), h('span', { class: 'muted small' }, '.' + s.ext)))),
      onClose: () => resolve(null) });
    });
    if (!kind) return;
    const base = kind.id === 'html' ? 'page' : kind.id === 'css' ? 'style' : kind.id === 'js' ? 'app' : kind.id === 'json' ? 'data' : 'notes';
    let suggestion = (folder ? folder + '/' : '') + base + '.' + kind.ext;
    for (let i = 2; p.files[suggestion]; i++) suggestion = (folder ? folder + '/' : '') + base + i + '.' + kind.ext;
    const name = await ui.prompt({ title: t('files_new_' + (kind.id === 'html' ? 'page' : 'file')), label: t('files_name'), value: suggestion, okLabel: t('files_create'), message: kind.id === 'html' ? t('files_page_hint') : '' });
    if (!name) return;
    let path = U.cleanPath(name);
    if (path && !/\.[a-z0-9]+$/i.test(path)) path += '.' + kind.ext;
    if (path && p.files[path]) { ui.toast(t('err_exists', { path }), 'error'); return; }
    try {
      const clean = CS.projects.write(path, kind.content(U.escapeHtml(p.name)), { project: p });
      ui.toast(t('files_created', { path: clean }), 'ok');
      api.openFile(clean);
    } catch (error) { ui.toast(CS.common.errorText(error), 'error'); }
  }

  async function upload(api, folder) {
    const files = await ui.pickFile('image/*,audio/*,.json,.txt,.csv,.css,.js,.html,.svg,.woff,.woff2,.ttf', true);
    let ok = 0;
    for (const file of files) {
      const path = U.cleanPath((folder ? folder + '/' : (/^image\//.test(file.type) ? 'img/' : /^audio\//.test(file.type) ? 'sounds/' : '')) + file.name.replace(/\s+/g, '-'));
      try {
        if (api.project.files[path] && !(await ui.confirm({ title: t('files_replace_q', { path }), okLabel: t('files_replace') }))) continue;
        if (U.isTextPath(path) && file.size < 3 * 1048576) CS.projects.write(path, await file.text(), { project: api.project });
        else CS.projects.writeData(path, new Uint8Array(await file.arrayBuffer()), file.type || U.mimeOf(path));
        ok++;
      } catch (error) { ui.toast(CS.common.errorText(error), 'error'); }
    }
    if (ok) ui.toast(t('files_uploaded', { n: ok }), 'ok');
  }

  function insertSnippet(path, f) {
    if (/^image\//.test(f.mime || '')) return '<img src="' + path + '" alt="">';
    if (/^audio\//.test(f.mime || '')) return '<audio src="' + path + '" controls></audio>';
    return path;
  }

  function preview(api, path) {
    const p = api.project;
    const f = p.files[path];
    if (!f) return;
    let media = null;
    if (/^image\//.test(f.mime || '')) {
      const img = h('img', { src: f.dataUrl, alt: path, class: 'asset-img' });
      const dims = h('span', { class: 'muted small' });
      img.onload = () => { dims.textContent = img.naturalWidth + ' × ' + img.naturalHeight + ' px · '; };
      media = h('div', { class: 'asset-preview checker-bg' }, img);
      media.appendChild(h('div', { class: 'asset-meta' }, dims, h('span', { class: 'muted small' }, U.bytes(f.size || 0))));
    } else if (/^audio\//.test(f.mime || '')) {
      media = h('div', { class: 'asset-preview' }, h('audio', { src: f.dataUrl, controls: true, class: 'asset-audio' }), h('div', { class: 'asset-meta muted small' }, U.bytes(f.size || 0)));
    } else {
      media = ui.empty({ icon: 'file', title: path, body: U.bytes(f.size || 0) });
    }
    const isImg = /^image\/(png|gif|webp|jpeg)/.test(f.mime || '');
    const sheet = ui.sheet({ title: U.basename(path), subtitle: path, body: media, actions: [
      ui.button({ label: t('files_copy_tag'), icon: 'copy', variant: 'soft', onClick: async () => {
        const text = insertSnippet(path, f);
        try { await navigator.clipboard.writeText(text); ui.toast(t('files_copied'), 'ok'); } catch (error) { ui.toast(text); }
      } }),
      (isImg || /^audio\//.test(f.mime || '')) && CS.studio ? ui.button({ label: t('st_edit'), icon: isImg ? 'brush' : 'wave', onClick: () => { sheet.close(); CS.studio.edit(p.id, path); } }) : null,
      ui.button({ label: t('more'), icon: 'moreH', variant: 'ghost', onClick: () => { sheet.close(); fileMenu(api, path); } })
    ].filter(Boolean) });
  }

  function fileMenu(api, path) {
    const p = api.project;
    const f = p.files[path];
    ui.menu({ title: U.basename(path), subtitle: path + ' · ' + U.bytes(CS.projects.entrySize(f)), items: [
      f.kind === 'text' ? { icon: 'code', label: t('open'), onClick: () => api.openFile(path) } : { icon: 'eye', label: t('files_view'), onClick: () => preview(api, path) },
      { icon: 'type', label: t('rename'), onClick: () => renameFile(api, path) },
      { icon: 'folderMove', label: t('files_move'), onClick: () => moveFile(api, path) },
      { icon: 'copy', label: t('duplicate'), onClick: () => {
        const dot = path.lastIndexOf('.');
        let target = dot > path.lastIndexOf('/') ? path.slice(0, dot) + '-copia' + path.slice(dot) : path + '-copia';
        for (let i = 2; p.files[target]; i++) target = target.replace(/(-copia)\d*/, '$1' + i);
        try { CS.projects.write(target, U.deepClone(f), { project: p }); ui.toast(t('files_created', { path: target }), 'ok'); } catch (error) { ui.toast(CS.common.errorText(error), 'error'); }
      } },
      { icon: 'download', label: t('files_download'), onClick: () => {
        const blob = f.kind === 'text' ? new Blob([f.content], { type: U.mimeOf(path) }) : new Blob([U.dataUrlToBytes(f.dataUrl)], { type: f.mime });
        CS.common.deliver(blob, U.basename(path));
      } },
      '-',
      { icon: 'trash', label: t('delete'), danger: true, onClick: async () => {
        if (!(await ui.confirm({ title: t('files_delete_q', { path }), message: t('files_delete_body'), okLabel: t('delete'), danger: true }))) return;
        CS.projects.remove1(path);
        ui.toast(t('files_deleted'), 'ok');
      } }
    ] });
  }

  async function renameFile(api, path) {
    const next = await ui.prompt({ title: t('rename'), label: t('files_name'), value: path, okLabel: t('save') });
    if (!next || next === path) return;
    try { CS.projects.rename(path, next); } catch (error) { ui.toast(CS.common.errorText(error), 'error'); }
  }

  function moveFile(api, path) {
    const p = api.project;
    const name = U.basename(path);
    const targets = [''].concat(CS.projects.folders(p)).filter((folder) => folder !== U.dirname(path));
    ui.menu({ title: t('files_move'), subtitle: name, items: targets.map((folder) => ({
      icon: folder ? 'folder' : 'home', label: folder || t('files_root'),
      onClick: () => { try { CS.projects.rename(path, (folder ? folder + '/' : '') + name); } catch (error) { ui.toast(CS.common.errorText(error), 'error'); } }
    })) });
  }

  function mount(host, api) {
    const p = api.project;
    const collapsed = new Set();
    const usage = h('div', { class: 'files-usage' });
    const tree = h('div', { class: 'files-tree list' });

    CS.mount(host, h('div', { class: 'files' },
      h('div', { class: 'files-toolbar' },
        ui.button({ label: t('files_new'), icon: 'filePlus', size: 'sm', onClick: () => newFile(api) }),
        ui.button({ label: t('files_upload'), icon: 'upload', size: 'sm', variant: 'soft', onClick: () => upload(api) }),
        ui.iconButton('folderPlus', t('files_new_folder'), () => newFolder())),
      usage, tree));

    async function newFolder(parent) {
      const name = await ui.prompt({ title: t('files_new_folder'), label: t('files_name'), value: parent ? parent + '/' : '', placeholder: 'img', okLabel: t('files_create') });
      if (!name) return;
      try { CS.projects.addFolder(name); render(); } catch (error) { ui.toast(CS.common.errorText(error), 'error'); }
    }

    function folderMenu(folder) {
      ui.menu({ title: folder, items: [
        { icon: 'filePlus', label: t('files_new'), onClick: () => newFile(api, folder) },
        { icon: 'upload', label: t('files_upload'), onClick: () => upload(api, folder) },
        { icon: 'folderPlus', label: t('files_new_folder'), onClick: () => newFolder(folder) },
        { icon: 'type', label: t('rename'), onClick: async () => {
          const next = await ui.prompt({ title: t('rename'), label: t('files_name'), value: folder, okLabel: t('save') });
          if (!next || next === folder) return;
          try {
            CS.projects.renameFolder(folder, next);
            const ws = p.workspace;
            const map = (x) => (x && x.startsWith(folder + '/') ? U.cleanPath(next) + x.slice(folder.length) : x);
            ws.openFiles = (ws.openFiles || []).map(map);
            ws.file = map(ws.file);
            render();
          } catch (error) { ui.toast(CS.common.errorText(error), 'error'); }
        } },
        '-',
        { icon: 'trash', label: t('files_delete_folder'), danger: true, onClick: async () => {
          const count = CS.projects.paths(p).filter((x) => x.startsWith(folder + '/')).length;
          if (!(await ui.confirm({ title: t('files_delete_folder_q', { path: folder }), message: t('files_delete_folder_body', { n: count }), okLabel: t('delete'), danger: true }))) return;
          CS.projects.removeFolder(folder);
          render();
        } }
      ] });
    }

    function render() {
      const u = CS.projects.usage(p);
      CS.mount(usage, [h('div', { class: 'files-usage-text' }, h('b', {}, t('n_files', { n: u.files })), h('span', { class: 'muted' }, U.bytes(u.size) + ' / ' + U.bytes(CS.projects.LIMITS.totalBytes))),
        ui.progress(Math.min(1, u.ratio), { class: u.ratio > 0.8 ? 'warn' : '' })]);
      const folders = CS.projects.folders(p);
      const paths = CS.projects.paths(p);
      const rows = [];
      const walk = (parent, depth) => {
        folders.filter((f) => U.dirname(f) === parent).forEach((folder) => {
          const open = !collapsed.has(folder);
          const count = paths.filter((x) => x.startsWith(folder + '/')).length;
          rows.push(h('div', { class: 'tree-row tree-folder', style: { '--depth': depth } },
            h('button', { type: 'button', class: 'tree-main', 'aria-expanded': String(open), onclick: () => { open ? collapsed.add(folder) : collapsed.delete(folder); render(); } },
              CS.icon(open ? 'chevronDown' : 'chevronRight', 'tree-caret'), CS.icon(open ? 'folderOpen' : 'folder', 'tree-icon tint-text-amber'),
              h('span', { class: 'tree-name' }, U.basename(folder)), h('span', { class: 'tree-meta' }, String(count))),
            ui.iconButton('moreV', t('more'), () => folderMenu(folder), { class: 'tree-more' })));
          if (open) walk(folder, depth + 1);
        });
        paths.filter((x) => U.dirname(x) === parent).forEach((path) => {
          const f = p.files[path];
          const isGenerated = p.blocks && p.blocks.model && p.blocks.generatedFile === path;
          rows.push(h('div', { class: ['tree-row', p.workspace.file === path && 'on'], style: { '--depth': depth } },
            h('button', { type: 'button', class: 'tree-main', onclick: () => (f.kind === 'text' ? api.openFile(path) : preview(api, path)) },
              h('span', { class: 'tree-caret-space' }), CS.icon(iconFor(path, f), 'tree-icon tint-text-' + tintFor(path, f)),
              h('span', { class: 'tree-name' }, U.basename(path)),
              isGenerated ? ui.badge(t('files_from_blocks'), 'accent') : null,
              h('span', { class: 'tree-meta' }, U.bytes(CS.projects.entrySize(f)))),
            ui.iconButton('moreV', t('more'), () => fileMenu(api, path), { class: 'tree-more' })));
        });
      };
      walk('', 0);
      CS.mount(tree, rows.length ? rows : ui.empty({ icon: 'folder', title: t('files_empty'), body: t('files_empty_body') }));
    }

    const off = CS.bus.on('file-changed', (e) => { if (e && e.project === p && !host.hidden) render(); });
    return { onShow: render, unmount: off, actions: () => [] };
  }

  CS.wsFiles = { newFile, upload, preview, fileMenu };
  CS.ws.tab({ id: 'files', icon: 'folder', label: 'ws_files', order: 40, mount });
})();
