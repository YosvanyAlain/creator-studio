/* =========================================================================
 * Webxdc Creator Studio — db.js
 * IndexedDB store with localStorage mirror and memory fallback.
 * ========================================================================= */
'use strict';
(function () {
  const CS = (globalThis.CS = globalThis.CS || {});
  const U = CS.util;

  const DB_NAME = 'webxdc-creator-studio';
  const DB_VERSION = 1;
  const STORE = 'projects';
  const LS_KEY = 'wcs_projects_v1';
  const LS_MIRROR = 'wcs_projects_mirror_v1';

  let mode = 'memory';
  let idb = null;
  const memory = new Map();
  let readyP = null;
  let readyResolved = false;
  const readyListeners = [];

  function whenReady() {
    return readyP || Promise.resolve();
  }

  function notifyReady() {
    readyResolved = true;
    const cbs = readyListeners.splice(0, readyListeners.length);
    for (let i = 0; i < cbs.length; i++) {
      try { cbs[i](mode); } catch (e) { /* ignore */ }
    }
  }

  /* ---------- localStorage ---------- */
  function lsAvailable() {
    try {
      const k = '__wcs_t';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  }

  function lsLoad() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return {};
      const o = JSON.parse(raw);
      return o && typeof o === 'object' ? o : {};
    } catch (e) { return {}; }
  }

  function lsSaveAll(map) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(map));
      return true;
    } catch (e) { return false; }
  }

  function mirrorSave(arr) {
    if (!lsAvailable()) return;
    try {
      const map = {};
      (arr || []).forEach(function (p) { if (p && p.id) map[p.id] = p; });
      localStorage.setItem(LS_MIRROR, JSON.stringify(map));
    } catch (e) { /* quota */ }
  }

  function mirrorLoad() {
    try {
      const raw = localStorage.getItem(LS_MIRROR);
      if (!raw) return [];
      const o = JSON.parse(raw);
      if (!o || typeof o !== 'object') return [];
      return Object.keys(o).map(function (k) { return o[k]; }).filter(function (p) { return p && p.id; });
    } catch (e) { return []; }
  }

  function sortProjects(arr) {
    arr = (arr || []).filter(function (p) { return p && typeof p === 'object' && p.id; });
    arr.sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
    return arr;
  }

  /* ---------- IndexedDB: una sola apertura con timeout ---------- */
  function idbOpen(timeoutMs) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        reject(new Error('idb-timeout'));
      }, timeoutMs || 2000);

      function finish(ok, val) {
        if (settled) {
          /* late open after timeout: close to avoid orphan connections */
          if (ok && val && typeof val.close === 'function') {
            try { val.close(); } catch (e) { /* ignore */ }
          }
          return;
        }
        settled = true;
        clearTimeout(timer);
        if (ok) resolve(val);
        else reject(val || new Error('idb-fail'));
      }

      try {
        if (typeof indexedDB === 'undefined' || !indexedDB || typeof indexedDB.open !== 'function') {
          finish(false, new Error('no-idb'));
          return;
        }
        var req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function () {
          try {
            var db = req.result;
            if (!db.objectStoreNames.contains(STORE)) {
              db.createObjectStore(STORE, { keyPath: 'id' });
            }
          } catch (e) { /* ignore */ }
        };
        req.onsuccess = function () { finish(true, req.result); };
        req.onerror = function () { finish(false, req.error || new Error('idb-error')); };
        req.onblocked = function () { finish(false, new Error('idb-blocked')); };
      } catch (e) {
        finish(false, e);
      }
    });
  }

  /* Compatible with get/getAll/put/delete (IDBRequest) and sync fns */
  function idbTx(mode_, fn) {
    return new Promise(function (resolve, reject) {
      if (!idb) {
        reject(new Error('no-idb'));
        return;
      }
      var tx, store, result;
      try {
        tx = idb.transaction(STORE, mode_);
        store = tx.objectStore(STORE);
        result = fn(store);
      } catch (e) {
        reject(e);
        return;
      }
      if (result && typeof result === 'object' && 'onsuccess' in result) {
        result.onsuccess = function () { resolve(result.result); };
        result.onerror = function () { reject(result.error || new Error('idb-req')); };
        tx.onabort = function () { reject(tx.error || new Error('idb-abort')); };
      } else {
        tx.oncomplete = function () { resolve(result); };
        tx.onerror = function () { reject(tx.error || new Error('idb-tx')); };
        tx.onabort = function () { reject(tx.error || new Error('idb-abort')); };
      }
    });
  }

  function preferLocalOrMemory() {
    if (lsAvailable()) {
      var primary = lsLoad();
      var mir = mirrorLoad();
      if (Object.keys(primary).length === 0 && mir.length) {
        var map = {};
        mir.forEach(function (p) { map[p.id] = p; });
        lsSaveAll(map);
      }
      mode = 'local';
    } else {
      mode = 'memory';
      mirrorLoad().forEach(function (p) { memory.set(p.id, p); });
    }
  }

  var store = {
    get mode() { return mode; },
    get ready() { return readyResolved; },

    onReady: function (fn) {
      if (typeof fn !== 'function') return;
      if (readyResolved) {
        try { fn(mode); } catch (e) { /* ignore */ }
      } else {
        readyListeners.push(fn);
      }
    },

    init: function () {
      if (readyP) return readyP;
      readyP = (async function () {
        try {
          idb = await idbOpen(2000);
          mode = 'idb';
          try {
            var all = await idbTx('readonly', function (s) { return s.getAll(); });
            mirrorSave(all || []);
          } catch (e) { /* ignore mirror fill */ }
        } catch (e) {
          idb = null;
          preferLocalOrMemory();
          /* Reintento suave en segundo plano (sin bloquear la UI) */
          setTimeout(function () {
            if (typeof store.recover === 'function') store.recover();
          }, 1200);
        }
        notifyReady();
        return mode;
      })();
      return readyP;
    },

    recover: async function () {
      if (mode === 'idb' && idb) return mode;
      try {
        var db = await idbOpen(2500);
        idb = db;
        var prev = mode;
        mode = 'idb';
        try {
          var all = await idbTx('readonly', function (s) { return s.getAll(); });
          mirrorSave(all || []);
        } catch (e) { /* ignore */ }
        if (prev !== 'idb') notifyReady();
        return mode;
      } catch (e) {
        return mode;
      }
    },

    list: async function () {
      await whenReady();
      var arr = [];
      if (mode === 'idb') {
        try {
          arr = await idbTx('readonly', function (s) { return s.getAll(); }) || [];
          mirrorSave(arr);
        } catch (e) {
          arr = mirrorLoad();
          if (!arr.length) arr = Object.keys(lsLoad()).map(function (k) { return lsLoad()[k]; });
        }
      } else if (mode === 'local') {
        var map = lsLoad();
        arr = Object.keys(map).map(function (k) { return map[k]; });
        if (!arr.length) arr = mirrorLoad();
      } else {
        arr = Array.from(memory.values());
        if (!arr.length) arr = mirrorLoad();
      }
      return sortProjects(arr);
    },

    get: async function (id) {
      await whenReady();
      if (mode === 'idb') {
        try { return await idbTx('readonly', function (s) { return s.get(id); }); }
        catch (e) {
          return mirrorLoad().filter(function (p) { return p.id === id; })[0] || null;
        }
      }
      if (mode === 'local') {
        var map = lsLoad();
        if (map[id]) return map[id];
        return mirrorLoad().filter(function (p) { return p.id === id; })[0] || null;
      }
      if (memory.has(id)) return memory.get(id);
      return mirrorLoad().filter(function (p) { return p.id === id; })[0] || null;
    },

    put: async function (project) {
      await whenReady();
      if (!project || !project.id) throw new Error('Proyecto inválido');

      /* espejo siempre */
      try {
        if (lsAvailable()) {
          var mir = {};
          mirrorLoad().forEach(function (p) { mir[p.id] = p; });
          mir[project.id] = project;
          localStorage.setItem(LS_MIRROR, JSON.stringify(mir));
        }
      } catch (e) { /* ignore */ }

      if (mode === 'idb') {
        await idbTx('readwrite', function (s) { return s.put(project); });
        return true;
      }
      if (mode === 'local') {
        var map = lsLoad();
        map[project.id] = project;
        if (!lsSaveAll(map)) {
          memory.set(project.id, project);
          throw new Error('localstorage-full');
        }
        return true;
      }
      memory.set(project.id, project);
      return true;
    },

    remove: async function (id) {
      await whenReady();
      if (mode === 'idb') {
        await idbTx('readwrite', function (s) { return s.delete(id); });
      } else if (mode === 'local') {
        var map = lsLoad();
        delete map[id];
        lsSaveAll(map);
      } else {
        memory.delete(id);
      }
      memory.delete(id);
      try {
        if (lsAvailable()) {
          var mir = {};
          mirrorLoad().forEach(function (p) { if (p.id !== id) mir[p.id] = p; });
          localStorage.setItem(LS_MIRROR, JSON.stringify(mir));
        }
      } catch (e) { /* ignore */ }
      return true;
    },

    count: async function () {
      return (await store.list()).length;
    },

    estimate: async function () {
      await whenReady();
      var projects = await store.list();
      var bytes = 0;
      for (var i = 0; i < projects.length; i++) {
        try { bytes += U.byteLen(JSON.stringify(projects[i])); } catch (e) { /* ignore */ }
      }
      var quota = null;
      try {
        if (navigator.storage && typeof navigator.storage.estimate === 'function') {
          var est = await navigator.storage.estimate();
          quota = est && est.quota ? est.quota : null;
        }
      } catch (e) { /* ignore */ }
      return { mode: mode, count: projects.length, bytes: bytes, quota: quota };
    },

    wipe: async function () {
      var projects = await store.list();
      for (var i = 0; i < projects.length; i++) await store.remove(projects[i].id);
      try { localStorage.removeItem(LS_KEY); } catch (e) { /* ignore */ }
      try { localStorage.removeItem(LS_MIRROR); } catch (e) { /* ignore */ }
      memory.clear();
      return true;
    }
  };

  CS.store = store;
  if (typeof module !== 'undefined' && module.exports) { module.exports = store; }
})();
