/* Version history: full project copies kept per project (same database as 2.x). */
'use strict';
(function () {
  const CS = globalThis.CS;
  const U = CS.util;
  const DB_NAME = 'wcs-snapshots-v1';
  const STORE = 'snaps';
  const MAX_PER_PROJECT = 20;
  const MAX_BYTES = 6 * 1048576;
  const AUTO_EVERY = 5 * 60 * 1000;

  let idb = null;
  let ready = null;
  const memory = [];
  const lastAuto = new Map();
  const lastHash = new Map();

  function open() {
    return new Promise((resolve, reject) => {
      try {
        if (typeof indexedDB === 'undefined' || !indexedDB) return reject(new Error('no-idb'));
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' }).createIndex('projectId', 'projectId', { unique: false });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        setTimeout(() => reject(new Error('idb-timeout')), 2500);
      } catch (error) { reject(error); }
    });
  }

  function init() {
    if (!ready) ready = open().then((db) => { idb = db; }).catch(() => { idb = null; });
    return ready;
  }

  function run(kind, fn) {
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(STORE, kind);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req ? req.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  function fingerprint(p) {
    const parts = [p.name];
    Object.keys(p.files).sort().forEach((k) => {
      const f = p.files[k];
      parts.push(k, f.kind === 'text' ? f.content.length + ':' + f.content.slice(0, 64) + f.content.slice(-64) : f.size);
    });
    parts.push(JSON.stringify(p.blocks && p.blocks.model || null).length);
    return parts.join('|');
  }

  /* Uses the projectId index when present; older or partly migrated databases may lack it. */
  function byProject(projectId) {
    return run('readonly', (s) => (s.indexNames.contains('projectId') ? s.index('projectId').getAll(projectId) : s.getAll()))
      .then((rows) => (rows || []).filter((row) => row && row.projectId === projectId));
  }

  async function list(projectId) {
    await init();
    let items;
    if (idb) items = await byProject(projectId);
    else items = memory.filter((s) => s.projectId === projectId);
    return (items || []).sort((a, b) => b.createdAt - a.createdAt);
  }

  async function take(project, reason, label) {
    await init();
    const copy = U.deepClone(project);
    const json = JSON.stringify(copy);
    if (json.length > MAX_BYTES) throw Object.assign(new Error('snapshot-too-big'), { code: 'snapshot-too-big' });
    const snap = { id: U.uid('s'), projectId: project.id, name: project.name, reason: reason || 'manual', label: label || '', createdAt: Date.now(), bytes: json.length, project: copy };
    if (idb) await run('readwrite', (s) => s.put(snap));
    else memory.push(snap);
    lastHash.set(project.id, fingerprint(project));
    await prune(project.id);
    CS.bus.emit('snapshots-changed', project.id);
    return snap;
  }

  /* Automatic copies: at most every 5 minutes and only when something changed; manual ones are never pruned first. */
  async function auto(project) {
    if (!project) return null;
    const now = Date.now();
    if (now - (lastAuto.get(project.id) || 0) < AUTO_EVERY) return null;
    const print = fingerprint(project);
    if (print === lastHash.get(project.id)) return null;
    lastAuto.set(project.id, now);
    try { return await take(project, 'auto'); } catch (error) { return null; }
  }

  async function prune(projectId) {
    const items = await list(projectId);
    if (items.length <= MAX_PER_PROJECT) return;
    const autos = items.filter((s) => s.reason === 'auto');
    const excess = items.length - MAX_PER_PROJECT;
    const victims = (autos.length >= excess ? autos : items).slice(-excess);
    for (const snap of victims) await remove(snap.id);
  }

  async function remove(id) {
    await init();
    if (idb) await run('readwrite', (s) => s.delete(id));
    else { const i = memory.findIndex((s) => s.id === id); if (i >= 0) memory.splice(i, 1); }
  }

  async function removeAll(projectId) {
    for (const snap of await list(projectId)) await remove(snap.id);
  }

  async function get(id) {
    await init();
    if (idb) return run('readonly', (s) => s.get(id));
    return memory.find((s) => s.id === id) || null;
  }

  CS.snapshots = { init, list, take, auto, remove, removeAll, get, fingerprint, MAX_PER_PROJECT };
})();
