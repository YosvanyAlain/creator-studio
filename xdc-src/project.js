/* =========================================================================
 * Webxdc Creator Studio — project.js
 * Project model, migrations, and file CRUD.
 * ========================================================================= */
'use strict';
(function () {
  const CS = (globalThis.CS = globalThis.CS || {});
  const U = CS.util;

  const SCHEMA_VERSION = 1;
  const MAX_FILES = 200;
  const MAX_TEXT_BYTES = 2 * 1024 * 1024;      /* 2 MB por archivo de texto */
  const MAX_DATA_BYTES = 2 * 1024 * 1024;      /* 2 MB por archivo binario */
  const MAX_TOTAL_BYTES = 12 * 1024 * 1024;    /* 12 MB total del proyecto */

  /* ---------- Migraciones ---------- */
  const migrations = {
    /* 0 → 1: formato inicial (proyectos muy tempranos sin campo) */
    0: function (p) {
      p.projectFormatVersion = 1;
      if (!p.blocks) p.blocks = { model: null, generatedFile: 'app.js', handEdited: false, lastGeneratedAt: null };
      return p;
    }
  };

  function migrate(project) {
    if (!project || typeof project !== 'object') throw new Error('Proyecto inválido');
    let v = typeof project.projectFormatVersion === 'number' ? project.projectFormatVersion : 0;
    if (v > SCHEMA_VERSION) {
      /* Project created by a future Creator version: do not open unsafely;
   * warn and do not corrupt data. */
      const err = new Error('future-version');
      err.foundVersion = v;
      throw err;
    }
    while (v < SCHEMA_VERSION) {
      if (migrations[v]) migrations[v](project);
      v++;
      project.projectFormatVersion = v;
    }
    /* Normalizaciones defensivas */
    if (!project.files || typeof project.files !== 'object') project.files = {};
    if (!project.settings || typeof project.settings !== 'object') project.settings = {};
    if (!project.settings.xdcName) project.settings.xdcName = String(project.name || 'webxdc-app');
    if (typeof project.settings.sourceCodeUrl !== 'string') project.settings.sourceCodeUrl = '';
    if (!project.blocks || typeof project.blocks !== 'object') {
      project.blocks = { model: null, generatedFile: 'app.js', handEdited: false, lastGeneratedAt: null };
    }
    /* optional fields (v1-compatible; do not bump schema version) */
    if (!Array.isArray(project.pages)) project.pages = [];
    if (!Array.isArray(project.scenes)) project.scenes = [];
    if (!Array.isArray(project.assets)) project.assets = [];
    if (!project.recovery || typeof project.recovery !== 'object') {
      project.recovery = { lastAutosaveAt: null, lastSnapshotId: null };
    }
    if (!project.id) project.id = U.uid();
    return project;
  }

  /* ---------- Creation ---------- */
  function newProject(name, originTemplateId) {
    const now = Date.now();
    return migrate({
      projectFormatVersion: SCHEMA_VERSION,
      id: U.uid(),
      name: String(name || '').trim() || t_defaultName(),
      createdAt: now,
      updatedAt: now,
      origin: { template: originTemplateId || null },
      settings: { xdcName: '', sourceCodeUrl: '' },
      files: {},
      blocks: { model: null, generatedFile: 'app.js', handEdited: false, lastGeneratedAt: null },
      pages: [],
      scenes: [],
      assets: [],
      recovery: { lastAutosaveAt: null, lastSnapshotId: null }
    });
  }

  function t_defaultName() {
    try { return (CS.i18n && CS.i18n.t('pick_empty_name')) || 'My app'; }
    catch (e) { return 'My app'; }
  }

  /* Crea un proyecto a partir de una plantilla del registro CS.tpl */
  function fromTemplate(templateId, name) {
    const tpl = CS.tpl && CS.tpl.get(templateId);
    if (!tpl) throw new Error('Plantilla no encontrada: ' + templateId);
    const files = CS.tpl.createFiles(templateId); /* wrapper: add template icon.png */
    const project = newProject(name || tpl.name(), templateId);
    project.files = {};
    for (const path of Object.keys(files)) {
      const entry = files[path];
      /*las plantillas pueden aportar binarios (p. ej. icon.png)
       * como objetos { kind:'data', dataUrl, mime, size } */
      if (entry && typeof entry === 'object' && (entry.kind === 'data' || entry.kind === 'text')) {
        project.files[path] = entry;
      } else {
        project.files[path] = { kind: 'text', content: String(entry) };
      }
    }
    if (tpl.blocksModel) {
      project.blocks = {
        model: U.deepClone(tpl.blocksModel),
        generatedFile: tpl.blocksGeneratedFile || 'app.js',
        handEdited: false,
        lastGeneratedAt: null
      };
    }
    /* xdcName = nombre visible (manifiesto); el nombre de archivo se
       slugifica solo al exportar. */
    project.settings.xdcName = project.name;
    /* Template ships a manifest.toml with a generic name. On project create,
   * the user-chosen name wins. */
    const mf = project.files['manifest.toml'];
    if (mf && mf.kind === 'text') {
      const n = String(project.settings.xdcName || project.name).replace(/"/g, '');
      if (/^\s*name\s*=/m.test(mf.content)) {
        mf.content = mf.content.replace(/^\s*name\s*=\s*".*"/m, 'name = "' + n + '"');
      }
    }
    return project;
  }

  /* ---------- Session state ---------- */
  const projects = {
    current: null,        /* proyecto abierto (referencia al objeto guardado) */
    lastSavedAt: null,

    get SCHEMA_VERSION() { return SCHEMA_VERSION; },
    get LIMITS() {
      return { maxFiles: MAX_FILES, maxTextBytes: MAX_TEXT_BYTES, maxDataBytes: MAX_DATA_BYTES, maxTotalBytes: MAX_TOTAL_BYTES };
    },

    migrate,
    newProject,
    fromTemplate,

    /* ---------- Archivos ---------- */
    fileList(p) {
      p = p || projects.current;
      if (!p) return [];
      return Object.keys(p.files).sort((a, b) => a.localeCompare(b));
    },

    fileGet(p, path) {
      p = p || projects.current;
      return p ? p.files[path] || null : null;
    },

    /* Validation al escribir un archivo. Lanza Error con .code si algo falla. */
    fileSet(p, path, entry) {
      p = p || projects.current;
      if (!p) throw new Error('no-project');
      const clean = U.normalizeRelPath(path);
      if (!clean || !U.isSafePath(clean)) { const e = new Error('bad-path'); e.code = 'bad-path'; throw e; }
      if (clean.toLowerCase() === 'webxdc.js') { const e = new Error('webxdc-js'); e.code = 'webxdc-js'; throw e; }
      if (!p.files[clean] && Object.keys(p.files).length >= MAX_FILES) { const e = new Error('too-many-files'); e.code = 'too-many-files'; throw e; }
      if (entry.kind === 'text') {
        const size = U.byteLen(entry.content);
        if (size > MAX_TEXT_BYTES) { const e = new Error('file-too-big'); e.code = 'file-too-big'; e.detail = { size, max: MAX_TEXT_BYTES }; throw e; }
        p.files[clean] = { kind: 'text', content: String(entry.content) };
      } else if (entry.kind === 'data') {
        const size = entry.size || U.dataUrlToBytes(entry.dataUrl).length;
        if (size > MAX_DATA_BYTES) { const e = new Error('file-too-big'); e.code = 'file-too-big'; e.detail = { size, max: MAX_DATA_BYTES }; throw e; }
        p.files[clean] = { kind: 'data', dataUrl: entry.dataUrl, mime: entry.mime || '', size };
      } else {
        throw new Error('kind-invalid');
      }
      return p.files[clean];
    },

    fileDelete(p, path) {
      p = p || projects.current;
      if (!p) return false;
      if (!p.files[path]) return false;
      delete p.files[path];
      return true;
    },

    async fileRename(p, from, to) {
      p = p || projects.current;
      if (!p || !p.files[from]) throw new Error('not-found');
      const clean = U.normalizeRelPath(to);
      if (!clean || !U.isSafePath(clean)) { const e = new Error('bad-path'); e.code = 'bad-path'; throw e; }
      if (clean.toLowerCase() === 'webxdc.js') { const e = new Error('webxdc-js'); e.code = 'webxdc-js'; throw e; }
      if (p.files[clean]) { const e = new Error('exists'); e.code = 'exists'; throw e; }
      p.files[clean] = p.files[from];
      delete p.files[from];
      /* Re-apuntar el archivo generado por bloques si aplica */
      if (p.blocks && p.blocks.generatedFile === from) p.blocks.generatedFile = clean;
      return clean;
    },

    /* ---------- CRUD ---------- */
    async open(id) {
      const p = await CS.store.get(id);
      if (!p) return null;
      const migrated = migrate(p);
      projects.current = migrated;
      projects.lastSavedAt = Date.now();
      return migrated;
    },

    async save(p) {
      p = p || projects.current;
      if (!p) throw new Error('no-project');
      p.updatedAt = Date.now();
      try {
        await CS.store.put(p);
        projects.lastSavedAt = Date.now();
        if (p === projects.current) { /* nada: misma referencia */ }
        return true;
      } catch (e) {
        if (String(e && e.message).indexOf('localstorage-full') >= 0) {
          const err = new Error('storage-full');
          err.code = 'storage-full';
          throw err;
        }
        throw e;
      }
    },

    async close() {
      if (projects.current) {
        try { await projects.save(projects.current); } catch (e) { /* already warned in UI */ }
      }
      projects.current = null;
      return true;
    },

    async duplicate(id) {
      const src = await CS.store.get(id);
      if (!src) throw new Error('not-found');
      const copy = U.deepClone(src);
      copy.id = U.uid();
      copy.name = src.name + ' (2)';
      copy.createdAt = Date.now();
      copy.updatedAt = Date.now();
      copy.settings.xdcName = copy.name;
      await CS.store.put(copy);
      return copy;
    },

    async rename(id, name) {
      const p = await CS.store.get(id);
      if (!p) throw new Error('not-found');
      p.name = String(name || '').trim() || p.name;
      p.updatedAt = Date.now();
      await CS.store.put(p);
      if (projects.current && projects.current.id === id) projects.current.name = p.name;
      return p;
    },

    async remove(id) {
      if (projects.current && projects.current.id === id) projects.current = null;
      await CS.store.remove(id);
      return true;
    },

    /* Marca que el archivo generado desde bloques fue editado a mano. */
    markHandEdited(p, path) {
      p = p || projects.current;
      if (!p || !p.blocks) return;
      if (path === p.blocks.generatedFile && !p.blocks.handEdited) {
        p.blocks.handEdited = true;
      }
    },

    /* Approximate total project size in bytes */
    totalSize(p) {
      p = p || projects.current;
      if (!p) return 0;
      let total = 0;
      for (const path of Object.keys(p.files)) {
        const f = p.files[path];
        total += U.byteLen(path);
        if (f.kind === 'text') total += U.byteLen(f.content);
        else total += (f.size || U.dataUrlToBytes(f.dataUrl || '').length);
      }
      return total;
    }
  };

  CS.projects = projects;
  if (typeof module !== 'undefined' && module.exports) { module.exports = projects; }
})();
