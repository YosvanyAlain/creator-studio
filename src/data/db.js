/* Project storage: IndexedDB first, localStorage next, memory last. Same database as 2.x so projects carry over. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const DB_NAME = 'webxdc-creator-studio';
  const DB_VERSION = 1;
  const STORE = 'projects';
  const LS_KEY = 'wcs_projects_v1';
  const LS_MIRROR = 'wcs_projects_mirror_v1';
  const MIRROR_MAX = 1500000;

  let mode = 'memory';
  let idb = null;
  let ready = null;
  const memory = new Map();

  function lsOk() {
    try { localStorage.setItem('__wcs_t', '1'); localStorage.removeItem('__wcs_t'); return true; } catch (error) { return false; }
  }
  function lsRead(key) {
    try { const raw = localStorage.getItem(key); const o = raw ? JSON.parse(raw) : {}; return o && typeof o === 'object' ? o : {}; } catch (error) { return {}; }
  }
  function lsWrite(key, map) {
    try { localStorage.setItem(key, JSON.stringify(map)); return true; } catch (error) { return false; }
  }

  /* The mirror is a safety copy for hosts where IndexedDB disappears; it is skipped when it would get too big. */
  function mirror(list) {
    if (!lsOk()) return;
    const map = {};
    list.forEach((p) => { if (p && p.id) map[p.id] = p; });
    const text = JSON.stringify(map);
    try {
      if (text.length <= MIRROR_MAX) localStorage.setItem(LS_MIRROR, text);
      else localStorage.removeItem(LS_MIRROR);
    } catch (error) { try { localStorage.removeItem(LS_MIRROR); } catch (e) { /* ignore */ } }
  }
  const mirrorList = () => Object.values(lsRead(LS_MIRROR)).filter((p) => p && p.id);

  function sorted(list) {
    return (list || []).filter((p) => p && typeof p === 'object' && p.id).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  function open(timeout) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => { if (!settled) { settled = true; reject(new Error('idb-timeout')); } }, timeout || 2000);
      const finish = (ok, value) => {
        if (settled) { if (ok && value && value.close) try { value.close(); } catch (e) { /* ignore */ } return; }
        settled = true;
        clearTimeout(timer);
        ok ? resolve(value) : reject(value || new Error('idb-fail'));
      };
      try {
        if (typeof indexedDB === 'undefined' || !indexedDB) return finish(false, new Error('no-idb'));
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => { try { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' }); } catch (e) { /* ignore */ } };
        req.onsuccess = () => finish(true, req.result);
        req.onerror = () => finish(false, req.error);
        req.onblocked = () => finish(false, new Error('idb-blocked'));
      } catch (error) { finish(false, error); }
    });
  }

  function tx(kind, fn) {
    return new Promise((resolve, reject) => {
      if (!idb) return reject(new Error('no-idb'));
      let request;
      let transaction;
      try {
        transaction = idb.transaction(STORE, kind);
        request = fn(transaction.objectStore(STORE));
      } catch (error) { return reject(error); }
      transaction.oncomplete = () => resolve(request && 'result' in request ? request.result : undefined);
      transaction.onerror = () => reject(transaction.error || new Error('idb-tx'));
      transaction.onabort = () => reject(transaction.error || new Error('idb-abort'));
    });
  }

  function fallback() {
    if (lsOk()) {
      mode = 'local';
      const primary = lsRead(LS_KEY);
      if (!Object.keys(primary).length) {
        const copy = {};
        mirrorList().forEach((p) => { copy[p.id] = p; });
        if (Object.keys(copy).length) lsWrite(LS_KEY, copy);
      }
    } else {
      mode = 'memory';
      mirrorList().forEach((p) => memory.set(p.id, p));
    }
  }

  const store = {
    get mode() { return mode; },
    init() {
      if (ready) return ready;
      ready = (async () => {
        try {
          idb = await open(2500);
          mode = 'idb';
          try { mirror(await tx('readonly', (s) => s.getAll())); } catch (error) { /* ignore */ }
        } catch (error) {
          idb = null;
          fallback();
          setTimeout(() => store.recover(), 1500);
        }
        CS.bus.emit('store-ready', mode);
        return mode;
      })();
      return ready;
    },
    async recover() {
      if (idb) return mode;
      try {
        idb = await open(2500);
        const previous = mode === 'local' ? Object.values(lsRead(LS_KEY)) : [...memory.values()];
        mode = 'idb';
        for (const p of previous) {
          const existing = await tx('readonly', (s) => s.get(p.id));
          if (!existing || (existing.updatedAt || 0) < (p.updatedAt || 0)) await tx('readwrite', (s) => s.put(p));
        }
        CS.bus.emit('store-ready', mode);
      } catch (error) { /* stay on the fallback */ }
      return mode;
    },
    async list() {
      await store.init();
      let list = [];
      if (mode === 'idb') {
        try { list = (await tx('readonly', (s) => s.getAll())) || []; } catch (error) { list = mirrorList(); }
      } else if (mode === 'local') {
        list = Object.values(lsRead(LS_KEY));
        if (!list.length) list = mirrorList();
      } else {
        list = [...memory.values()];
      }
      return sorted(list);
    },
    async get(id) {
      await store.init();
      if (mode === 'idb') {
        try { return (await tx('readonly', (s) => s.get(id))) || null; } catch (error) { return mirrorList().find((p) => p.id === id) || null; }
      }
      if (mode === 'local') return lsRead(LS_KEY)[id] || mirrorList().find((p) => p.id === id) || null;
      return memory.get(id) || null;
    },
    async put(project) {
      await store.init();
      if (!project || !project.id) throw new Error('invalid project');
      if (mode === 'idb') {
        await tx('readwrite', (s) => s.put(project));
        scheduleMirror();
        return true;
      }
      if (mode === 'local') {
        const map = lsRead(LS_KEY);
        map[project.id] = project;
        if (!lsWrite(LS_KEY, map)) { memory.set(project.id, project); throw new Error('storage-full'); }
        return true;
      }
      memory.set(project.id, project);
      return true;
    },
    async remove(id) {
      await store.init();
      if (mode === 'idb') await tx('readwrite', (s) => s.delete(id));
      else if (mode === 'local') { const map = lsRead(LS_KEY); delete map[id]; lsWrite(LS_KEY, map); }
      memory.delete(id);
      const mir = lsRead(LS_MIRROR);
      if (mir[id]) { delete mir[id]; lsWrite(LS_MIRROR, mir); }
      return true;
    },
    async estimate() {
      const list = await store.list();
      let bytes = 0;
      list.forEach((p) => { try { bytes += JSON.stringify(p).length; } catch (error) { /* ignore */ } });
      let quota = null;
      let usage = null;
      try {
        if (navigator.storage && navigator.storage.estimate) {
          const est = await navigator.storage.estimate();
          quota = est.quota || null;
          usage = est.usage || null;
        }
      } catch (error) { /* ignore */ }
      return { mode, count: list.length, bytes, quota, usage };
    },
    async wipe() {
      for (const p of await store.list()) await store.remove(p.id);
      try { localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_MIRROR); } catch (error) { /* ignore */ }
      memory.clear();
    }
  };

  const scheduleMirror = CS.util.debounce(async () => {
    try { mirror(await tx('readonly', (s) => s.getAll())); } catch (error) { /* ignore */ }
  }, 3000);

  CS.store = store;
})();
