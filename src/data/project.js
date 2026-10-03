/* Project model (schema 2), migrations from 2.x projects, file and folder operations, autosave. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const U = CS.util;

  const SCHEMA = 2;
  const LIMITS = { files: 300, textBytes: 3 * 1048576, dataBytes: 4 * 1048576, totalBytes: 24 * 1048576 };
  const TINTS = ['indigo', 'violet', 'teal', 'green', 'orange', 'amber', 'pink', 'blue', 'cyan'];
  const RESERVED = new Set(['webxdc.js']);

  function err(code, detail) {
    const e = new Error(code);
    e.code = code;
    if (detail) e.detail = detail;
    return e;
  }

  const blankBlocks = () => ({ model: null, generatedFile: 'app.js', handEdited: false, lastGeneratedAt: null });

  const migrations = {
    0(p) { if (!p.blocks) p.blocks = blankBlocks(); },
    /* 1 -> 2: look (avatar), workspace memory, tags, favourites. Files and blocks are unchanged. */
    1(p) {
      p.look = p.look || { icon: guessIcon(p), tint: TINTS[Math.abs(hash(p.id || p.name || '')) % TINTS.length] };
      p.workspace = p.workspace || { tab: 'code', file: null, openFiles: [] };
      p.tags = Array.isArray(p.tags) ? p.tags : [];
      p.starred = !!p.starred;
      p.notes = typeof p.notes === 'string' ? p.notes : '';
    }
  };

  function hash(text) {
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
    return h;
  }

  function guessIcon(p) {
    const origin = (p.origin && p.origin.template) || '';
    const map = { game: 'gamepad', quiz: 'help', poll: 'poll', chat: 'chat', todo: 'checkSquare', list: 'list', notes: 'note', draw: 'brush', pixel: 'sprite', timer: 'timer', dice: 'dice', score: 'trophy', music: 'music' };
    for (const key in map) if (origin.indexOf(key) >= 0) return map[key];
    if (p.blocks && p.blocks.model) return 'blocks';
    return 'cube';
  }

  function migrate(project) {
    if (!project || typeof project !== 'object') throw err('invalid-project');
    let v = typeof project.projectFormatVersion === 'number' ? project.projectFormatVersion : 0;
    if (v > SCHEMA) throw err('future-version', { found: v });
    while (v < SCHEMA) {
      if (migrations[v]) migrations[v](project);
      v += 1;
    }
    project.projectFormatVersion = SCHEMA;
    if (!project.id) project.id = U.uid('p');
    if (!project.files || typeof project.files !== 'object') project.files = {};
    for (const path of Object.keys(project.files)) {
      const entry = project.files[path];
      if (typeof entry === 'string') project.files[path] = { kind: 'text', content: entry };
      else if (!entry || (entry.kind !== 'text' && entry.kind !== 'data')) delete project.files[path];
    }
    project.name = String(project.name || '').trim() || CS.t('project_default_name');
    project.settings = Object.assign({ xdcName: project.name, sourceCodeUrl: '' }, project.settings || {});
    if (!project.blocks || typeof project.blocks !== 'object') project.blocks = blankBlocks();
    ['pages', 'scenes', 'assets', 'folders', 'tags'].forEach((key) => { if (!Array.isArray(project[key])) project[key] = []; });
    project.recovery = project.recovery || { lastAutosaveAt: null, lastSnapshotId: null };
    project.createdAt = project.createdAt || Date.now();
    project.updatedAt = project.updatedAt || project.createdAt;
    if (!project.look) migrations[1](project);
    const ws = project.workspace && typeof project.workspace === 'object' ? project.workspace : {};
    project.workspace = { tab: ws.tab || null, file: ws.file || null, openFiles: Array.isArray(ws.openFiles) ? ws.openFiles.filter((x) => typeof x === 'string') : [] };
    project.starred = !!project.starred;
    project.notes = typeof project.notes === 'string' ? project.notes : '';
    return project;
  }

  function create(opts) {
    const o = opts || {};
    const now = Date.now();
    const p = migrate({
      projectFormatVersion: SCHEMA,
      id: U.uid('p'),
      name: o.name,
      createdAt: now,
      updatedAt: now,
      origin: { template: o.template || null, starter: o.starter || null },
      settings: { xdcName: o.name || '', sourceCodeUrl: '' },
      files: {},
      blocks: blankBlocks(),
      look: o.look || null
    });
    if (o.files) for (const path of Object.keys(o.files)) writeEntry(p, path, toEntry(o.files[path]));
    if (o.blocks) p.blocks = Object.assign(blankBlocks(), U.deepClone(o.blocks));
    setManifestName(p, p.name);
    return p;
  }

  function toEntry(value) {
    if (value && typeof value === 'object' && (value.kind === 'text' || value.kind === 'data')) return value;
    return { kind: 'text', content: String(value == null ? '' : value) };
  }

  function entrySize(entry) {
    if (!entry) return 0;
    if (entry.kind === 'text') return U.textBytes(entry.content);
    return entry.size || Math.floor(String(entry.dataUrl || '').length * 0.75);
  }

  function totalSize(p) {
    return Object.keys(p.files).reduce((sum, path) => sum + path.length + entrySize(p.files[path]), 0);
  }

  function writeEntry(p, path, entry) {
    const clean = U.cleanPath(path);
    if (!clean) throw err('bad-path');
    if (RESERVED.has(clean.toLowerCase())) throw err('reserved-name', { path: clean });
    if (!p.files[clean] && Object.keys(p.files).length >= LIMITS.files) throw err('too-many-files', { max: LIMITS.files });
    const size = entrySize(entry);
    const max = entry.kind === 'text' ? LIMITS.textBytes : LIMITS.dataBytes;
    if (size > max) throw err('file-too-big', { size, max });
    const before = entrySize(p.files[clean]);
    if (totalSize(p) - before + size > LIMITS.totalBytes) throw err('project-too-big', { max: LIMITS.totalBytes });
    p.files[clean] = entry.kind === 'text' ? { kind: 'text', content: String(entry.content) } : { kind: 'data', dataUrl: entry.dataUrl, mime: entry.mime || U.mimeOf(clean), size };
    return clean;
  }

  function setManifestName(p, name) {
    const mf = p.files['manifest.toml'];
    if (!mf || mf.kind !== 'text') return;
    const clean = String(name || '').replace(/["\\\n]/g, '').trim();
    if (!clean) return;
    mf.content = /^\s*name\s*=/m.test(mf.content) ? mf.content.replace(/^\s*name\s*=\s*".*"$/m, 'name = "' + clean + '"') : 'name = "' + clean + '"\n' + mf.content;
    p.settings.xdcName = clean;
  }

  function folderOf(path) { return U.dirname(path); }

  /* Every folder that exists, explicit (p.folders) or implied by file paths, sorted. */
  function folders(p) {
    const set = new Set(p.folders.filter(Boolean));
    Object.keys(p.files).forEach((path) => {
      const parts = path.split('/');
      for (let i = 1; i < parts.length; i++) set.add(parts.slice(0, i).join('/'));
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }

  /* ---------- Session ---------- */
  let current = null;
  let dirty = false;
  let saving = null;
  let lastSavedAt = null;

  const autosave = U.debounce(() => { projects.save().catch((e) => CS.bus.emit('save-error', e)); }, 1200);

  const projects = {
    SCHEMA, LIMITS, TINTS, migrate, create, entrySize, totalSize, setManifestName, folders,
    get current() { return current; },
    get dirty() { return dirty; },
    get lastSavedAt() { return lastSavedAt; },

    async list() {
      const all = await CS.store.list();
      const out = [];
      for (const p of all) {
        try { out.push(migrate(p)); } catch (error) { out.push({ id: p.id, name: p.name || '?', broken: error.code || 'invalid', updatedAt: p.updatedAt || 0, files: {}, look: { icon: 'alert', tint: 'red' } }); }
      }
      return out;
    },
    async open(id) {
      if (current && current.id === id) return current;
      if (current && dirty) await projects.save();
      const p = await CS.store.get(id);
      if (!p) return null;
      current = migrate(p);
      dirty = false;
      CS.settings.set('lastProject', id);
      CS.bus.emit('project-open', current);
      return current;
    },
    async close() {
      if (current && dirty) await projects.save();
      current = null;
      CS.bus.emit('project-close');
    },
    async add(p) {
      await CS.store.put(p);
      CS.bus.emit('projects-changed');
      return p;
    },
    touch(reason) {
      if (!current) return;
      dirty = true;
      current.updatedAt = Date.now();
      CS.bus.emit('project-dirty', reason || 'edit');
      autosave();
    },
    async save(p) {
      const target = p || current;
      if (!target) return false;
      if (saving) await saving;
      saving = (async () => {
        try {
          await CS.store.put(target);
          if (target === current) { dirty = false; lastSavedAt = Date.now(); }
          CS.bus.emit('project-saved', target);
        } catch (error) {
          if (/full|quota/i.test(String(error && (error.name + error.message)))) throw err('storage-full');
          throw error;
        } finally { saving = null; }
      })();
      await saving;
      return true;
    },
    flush() { autosave.cancel(); return dirty ? projects.save() : Promise.resolve(true); },
    async duplicate(id) {
      const src = await CS.store.get(id);
      if (!src) throw err('not-found');
      const copy = migrate(U.deepClone(src));
      copy.id = U.uid('p');
      copy.name = CS.t('project_copy_name', { name: src.name });
      copy.createdAt = copy.updatedAt = Date.now();
      copy.starred = false;
      setManifestName(copy, copy.name);
      await projects.add(copy);
      return copy;
    },
    async update(id, changes) {
      const p = current && current.id === id ? current : migrate(await CS.store.get(id));
      if (!p) throw err('not-found');
      if (changes.name != null) { p.name = String(changes.name).trim() || p.name; setManifestName(p, p.name); }
      if (changes.look) p.look = Object.assign({}, p.look, changes.look);
      if (changes.starred != null) p.starred = !!changes.starred;
      if (changes.notes != null) p.notes = String(changes.notes);
      p.updatedAt = Date.now();
      await CS.store.put(p);
      CS.bus.emit('projects-changed');
      return p;
    },
    async remove(id) {
      if (current && current.id === id) current = null;
      await CS.store.remove(id);
      if (CS.snapshots) CS.snapshots.removeAll(id).catch(() => {});
      CS.bus.emit('projects-changed');
    },

    /* ---------- Files (operate on the open project) ---------- */
    paths(p) { return Object.keys((p || current).files).sort((a, b) => a.localeCompare(b)); },
    get(path, p) { return (p || current).files[path] || null; },
    text(path, p) { const f = (p || current).files[path]; return f && f.kind === 'text' ? f.content : null; },
    write(path, content, opts) {
      const p = (opts && opts.project) || current;
      const clean = writeEntry(p, path, toEntry(typeof content === 'string' ? { kind: 'text', content } : content));
      if (p.blocks && clean === p.blocks.generatedFile && !(opts && opts.fromBlocks) && p.blocks.model) p.blocks.handEdited = true;
      if (p === current) projects.touch('file');
      CS.bus.emit('file-changed', { path: clean, project: p });
      return clean;
    },
    writeData(path, bytes, mime) {
      return projects.write(path, { kind: 'data', dataUrl: U.bytesToDataUrl(bytes, mime || U.mimeOf(path)), mime: mime || U.mimeOf(path), size: bytes.length });
    },
    remove1(path) {
      if (!current.files[path]) return false;
      delete current.files[path];
      projects.touch('file');
      CS.bus.emit('file-changed', { path, removed: true, project: current });
      return true;
    },
    rename(from, to) {
      const p = current;
      const clean = U.cleanPath(to);
      if (!clean) throw err('bad-path');
      if (RESERVED.has(clean.toLowerCase())) throw err('reserved-name', { path: clean });
      if (clean === from) return clean;
      if (p.files[clean]) throw err('exists', { path: clean });
      p.files[clean] = p.files[from];
      delete p.files[from];
      if (p.blocks && p.blocks.generatedFile === from) p.blocks.generatedFile = clean;
      projects.touch('file');
      CS.bus.emit('file-changed', { path: clean, from, project: p });
      return clean;
    },
    addFolder(path) {
      const clean = U.cleanPath(path);
      if (!clean) throw err('bad-path');
      if (folders(current).includes(clean)) throw err('exists', { path: clean });
      current.folders.push(clean);
      projects.touch('folder');
      return clean;
    },
    renameFolder(from, to) {
      const clean = U.cleanPath(to);
      if (!clean) throw err('bad-path');
      if (clean === from) return clean;
      if (clean.startsWith(from + '/')) throw err('bad-path');
      const moves = projects.paths().filter((path) => path.startsWith(from + '/'));
      for (const path of moves) if (current.files[clean + path.slice(from.length)]) throw err('exists', { path: clean + path.slice(from.length) });
      for (const path of moves) {
        const next = clean + path.slice(from.length);
        current.files[next] = current.files[path];
        delete current.files[path];
        if (current.blocks.generatedFile === path) current.blocks.generatedFile = next;
      }
      current.folders = current.folders.map((f) => (f === from || f.startsWith(from + '/') ? clean + f.slice(from.length) : f));
      projects.touch('folder');
      CS.bus.emit('file-changed', { folder: clean, project: current });
      return clean;
    },
    removeFolder(path) {
      projects.paths().filter((p) => p.startsWith(path + '/')).forEach((p) => delete current.files[p]);
      current.folders = current.folders.filter((f) => f !== path && !f.startsWith(path + '/'));
      projects.touch('folder');
      CS.bus.emit('file-changed', { folder: path, removed: true, project: current });
    },
    folderOf,
    usage(p) {
      const target = p || current;
      const size = totalSize(target);
      return { size, files: Object.keys(target.files).length, ratio: size / LIMITS.totalBytes };
    }
  };

  CS.projects = projects;
})();
