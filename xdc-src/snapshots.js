/* =========================================================================
 * Webxdc Creator Studio — snapshots.js
 * Autosave snapshots and recovery.
 * ========================================================================= */
'use strict';
(function () {
  const CS = (globalThis.CS = globalThis.CS || {});
  const U = CS.util;

  const DB_NAME = 'wcs-snapshots-v1';
  const STORE = 'snaps';
  const LS_KEY = 'wcs_snapshots_v1';
  const MAX_PER_PROJECT = 12;
  const MAX_BYTES = 2 * 1024 * 1024;

  let mode = 'memory';
  let idb = null;
  const memory = [];
  let readyP = null;
  let timer = null;
  let lastHash = '';

  function projectIdOf(p) { return p && p.id ? p.id : null; }

  function hashOf(p) {
    try {
      const files = {};
      Object.keys(p.files || {}).sort().forEach(function (k) {
        const f = p.files[k];
        files[k] = f && f.kind === 'text' ? f.content : (f && f.size) || 0;
      });
      return JSON.stringify({ n: p.name, files: files, blocks: p.blocks, pages: p.pages, scenes: p.scenes });
    } catch (e) { return String(Date.now()); }
  }

  function idbOpen() {
    return new Promise(function (resolve, reject) {
      try {
        if (typeof indexedDB === 'undefined' || !indexedDB) {
          reject(new Error('no-idb'));
          return;
        }
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = function () {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) {
            const os = db.createObjectStore(STORE, { keyPath: 'id' });
            os.createIndex('projectId', 'projectId', { unique: false });
          }
        };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error || new Error('idb')); };
      } catch (e) { reject(e); }
    });
  }

  function lsLoad() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function lsSave(arr) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); return true; }
    catch (e) { return false; }
  }

  async function init() {
    if (readyP) return readyP;
    readyP = (async function () {
      try {
        idb = await idbOpen();
        mode = 'idb';
      } catch (e) {
        idb = null;
        try {
          if (typeof localStorage !== 'undefined') { lsLoad(); mode = 'local'; }
          else mode = 'memory';
        } catch (e2) { mode = 'memory'; }
      }
      return mode;
    })();
    return readyP;
  }

  function makeSnap(project, reason) {
    const clone = U.deepClone(project);
    const json = JSON.stringify(clone);
    const bytes = U.byteLen(json);
    if (bytes > MAX_BYTES) {
      const err = new Error('snapshot-too-big');
      err.code = 'snapshot-too-big';
      err.bytes = bytes;
      throw err;
    }
    return {
      id: U.uid(),
      projectId: project.id,
      name: project.name,
      reason: reason || 'autosave',
      createdAt: Date.now(),
      bytes: bytes,
      project: clone
    };
  }

  async function putSnap(snap) {
    await init();
    if (mode === 'idb' && idb) {
      await new Promise(function (resolve, reject) {
        const tx = idb.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(snap);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
      return;
    }
    if (mode === 'local') {
      const arr = lsLoad();
      arr.push(snap);
      if (!lsSave(arr)) {
        memory.push(snap);
        mode = 'memory';
      }
      return;
    }
    memory.push(snap);
  }

  async function list(projectId) {
    await init();
    let arr = [];
    if (mode === 'idb' && idb) {
      arr = await new Promise(function (resolve, reject) {
        const tx = idb.transaction(STORE, 'readonly');
        const idx = tx.objectStore(STORE).index('projectId');
        const req = idx.getAll(projectId);
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror = function () { reject(req.error); };
      });
    } else if (mode === 'local') {
      arr = lsLoad().filter(function (s) { return s.projectId === projectId; });
    } else {
      arr = memory.filter(function (s) { return s.projectId === projectId; });
    }
    arr.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
    return arr;
  }

  async function get(id) {
    await init();
    if (mode === 'idb' && idb) {
      return new Promise(function (resolve, reject) {
        const tx = idb.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(id);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    }
    const arr = mode === 'local' ? lsLoad() : memory;
    for (let i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
    return null;
  }

  async function remove(id) {
    await init();
    if (mode === 'idb' && idb) {
      await new Promise(function (resolve, reject) {
        const tx = idb.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
      return;
    }
    if (mode === 'local') {
      lsSave(lsLoad().filter(function (s) { return s.id !== id; }));
      return;
    }
    for (let i = memory.length - 1; i >= 0; i--) if (memory[i].id === id) memory.splice(i, 1);
  }

  async function prune(projectId) {
    const arr = await list(projectId);
    for (let i = MAX_PER_PROJECT; i < arr.length; i++) {
      await remove(arr[i].id);
    }
  }

  async function save(project, reason) {
    if (!project || !project.id) throw new Error('no-project');
    const snap = makeSnap(project, reason);
    await putSnap(snap);
    await prune(project.id);
    if (project.recovery) {
      project.recovery.lastAutosaveAt = snap.createdAt;
      project.recovery.lastSnapshotId = snap.id;
    }
    lastHash = hashOf(project);
    return snap;
  }

  async function pendingRecovery(project) {
    if (!project || !project.id) return null;
    const arr = await list(project.id);
    if (!arr.length) return null;
    const newest = arr[0];
    if ((newest.createdAt || 0) > (project.updatedAt || 0) + 400) return newest;
    return null;
  }

  async function restoreInto(snap, target) {
    if (!snap || !snap.project) throw new Error('bad-snapshot');
    const src = U.deepClone(snap.project);
    const keepId = target && target.id ? target.id : src.id;
    src.id = keepId;
    src.updatedAt = Date.now();
    return CS.projects.migrate(src);
  }

  function intervalMs() {
    try {
      const v = CS.settings && CS.settings.get && CS.settings.get('autosaveMs');
      const n = Number(v);
      if (n >= 2000 && n <= 120000) return n;
    } catch (e) { /* ignore */ }
    return 8000;
  }

  function startAutosave() {
    stopAutosave();
    try {
      if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '')) return;
    } catch (e) { /* ignore */ }
    timer = setInterval(function () {
      const p = CS.projects && CS.projects.current;
      if (!p) return;
      const h = hashOf(p);
      if (h === lastHash) return;
      save(p, 'autosave').catch(function () { /* ignore quota */ });
    }, intervalMs());
    if (timer && typeof timer.unref === 'function') timer.unref();
  }

  function stopAutosave() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  CS.snapshots = {
    init: init,
    save: save,
    list: list,
    get: get,
    remove: remove,
    prune: prune,
    pendingRecovery: pendingRecovery,
    restoreInto: restoreInto,
    startAutosave: startAutosave,
    stopAutosave: stopAutosave,
    get mode() { return mode; },
    MAX_PER_PROJECT: MAX_PER_PROJECT,
    _resetForTests: function () {
      stopAutosave();
      memory.length = 0;
      lastHash = '';
      readyP = null;
      idb = null;
      mode = 'memory';
    }
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = CS.snapshots; }
})();
