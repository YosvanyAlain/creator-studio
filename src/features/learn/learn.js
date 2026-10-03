/* Learn core: content registry (tracks, lessons, glossary, problems), progress, XP, levels, streak and medals. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const KEY = 'wcs3_learn';
  const LEVELS = [0, 60, 150, 280, 450, 680, 960];
  const tracks = [];
  const lessons = new Map();
  const glossary = [];
  const problems = [];

  /* Bilingual values are either plain strings or { es, en } objects. */
  function L(value) {
    if (value == null) return '';
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (Array.isArray(value)) return value.map(L);
    return value[CS.i18n.lang] != null ? value[CS.i18n.lang] : (value.en != null ? value.en : value.es);
  }

  function track(def) {
    const tr = Object.assign({ icon: 'learn', tint: 'indigo', lessons: [] }, def);
    tr.lessons.forEach((lesson, i) => {
      lesson.track = tr.id;
      lesson.index = i;
      lessons.set(lesson.id, lesson);
    });
    const at = tracks.findIndex((x) => (x.order || 0) > (tr.order || 0));
    if (at < 0) tracks.push(tr); else tracks.splice(at, 0, tr);
    return tr;
  }

  /* ---------- Progress ---------- */
  function blank() { return { v: 1, done: {}, xp: 0, days: [], last: null, perfect: 0, tries: 0, seen: {} }; }
  let state = load();
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      return raw && raw.v === 1 ? Object.assign(blank(), raw) : blank();
    } catch (error) { return blank(); }
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (error) { /* storage full: progress stays in memory */ }
    CS.bus.emit('learn-progress', stats());
  }

  const today = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
  function streak() {
    const days = new Set(state.days);
    let d = today();
    if (!days.has(d)) d -= 1;
    let n = 0;
    while (days.has(d)) { n++; d--; }
    return n;
  }

  function level(xp) {
    let i = 0;
    while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1]) i++;
    const base = LEVELS[i];
    const next = LEVELS[i + 1];
    return { n: i + 1, base, next: next || null, frac: next ? (xp - base) / (next - base) : 1 };
  }

  function stats() {
    const total = lessons.size;
    const done = [...lessons.keys()].filter((id) => state.done[id]).length;
    return { total, done, xp: state.xp, level: level(state.xp), streak: streak(), perfect: state.perfect };
  }

  function isDone(id) { return !!state.done[id]; }
  function result(id) { return state.done[id] || null; }

  function trackStats(tr) {
    const done = tr.lessons.filter((l) => state.done[l.id]).length;
    return { done, total: tr.lessons.length, complete: done === tr.lessons.length && done > 0 };
  }

  function nextLesson() {
    const last = state.last && lessons.get(state.last);
    if (last) {
      const tr = tracks.find((x) => x.id === last.track);
      const after = tr && tr.lessons.slice(last.index + 1).find((l) => !state.done[l.id]);
      if (after) return view(after);
    }
    for (const tr of tracks) {
      const l = tr.lessons.find((x) => !state.done[x.id]);
      if (l) return view(l);
    }
    return null;
  }
  const view = (l) => ({ id: l.id, title: L(l.title), track: l.track, lesson: l });

  /* Records a finished lesson and returns what was earned. */
  function complete(id, score) {
    const lesson = lessons.get(id);
    if (!lesson) return null;
    const before = medals().filter((m) => m.got).map((m) => m.id);
    const prev = state.done[id];
    const right = score.right || 0;
    const asked = score.asked || 0;
    const perfect = asked > 0 && right === asked;
    let xp = prev ? 3 : 10 + right * 2 + (perfect ? 5 : 0);
    const oldLevel = level(state.xp).n;
    state.xp += xp;
    state.done[id] = { at: Date.now(), right: Math.max(right, prev ? prev.right : 0), asked, best: !!(perfect || (prev && prev.best)) };
    if (perfect && !(prev && prev.best)) state.perfect += 1;
    state.last = id;
    const d = today();
    if (!state.days.includes(d)) { state.days.push(d); state.days = state.days.slice(-120); }
    persist();
    const fresh = medals().filter((m) => m.got && !before.includes(m.id));
    return { xp, perfect, levelUp: level(state.xp).n > oldLevel ? level(state.xp).n : 0, medals: fresh, trackDone: trackStats(tracks.find((x) => x.id === lesson.track)).complete };
  }

  function markSeen(kind) { if (!state.seen[kind]) { state.seen[kind] = Date.now(); persist(); } }

  function reset() { state = blank(); persist(); }

  /* ---------- Medals ---------- */
  function medals() {
    const s = stats();
    const list = [
      { id: 'first', icon: 'flag', tint: 'green', got: s.done >= 1 },
      { id: 'five', icon: 'star', tint: 'amber', got: s.done >= 5 },
      { id: 'ten', icon: 'award', tint: 'violet', got: s.done >= 10 },
      { id: 'perfect', icon: 'target', tint: 'pink', got: s.perfect >= 3 },
      { id: 'streak3', icon: 'bolt', tint: 'orange', got: s.streak >= 3 },
      { id: 'streak7', icon: 'trophy', tint: 'red', got: s.streak >= 7 },
      { id: 'curious', icon: 'search', tint: 'cyan', got: !!(state.seen.reference && state.seen.glossary) },
      { id: 'all', icon: 'medal', tint: 'indigo', got: s.total > 0 && s.done === s.total }
    ];
    for (const tr of tracks) list.splice(list.length - 1, 0, { id: 'track_' + tr.id, icon: tr.icon, tint: tr.tint, track: tr, got: trackStats(tr).complete });
    return list;
  }

  /* ---------- Content helpers ---------- */
  const fold = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  function addGlossary(rows) { rows.forEach((r) => glossary.push(r)); }
  function addProblems(rows) { rows.forEach((r) => problems.push(r)); }

  function searchLessons(q) {
    const f = fold(q);
    const out = [];
    for (const l of lessons.values()) {
      const title = fold(L(l.title));
      const body = fold(l.steps.map((s) => [L(s.title), L(s.body), L(s.q)].join(' ')).join(' '));
      const score = title.includes(f) ? 1 : body.includes(f) ? 3 : -1;
      if (score >= 0) out.push([score, l]);
    }
    return out.sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  }

  /* Demo pages for lesson playgrounds: a complete miniapp document per language. Fields may be { es, en }. */
  const DEMO_CSS = 'body{margin:0;min-height:100vh;box-sizing:border-box;padding:18px;display:grid;place-items:center;text-align:center;' +
    'font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f4f5fb;color:#1d1f33}' +
    'button{font:inherit;font-weight:700;border:0;border-radius:14px;padding:12px 20px;background:#5146e0;color:#fff;cursor:pointer}' +
    'button:active{transform:scale(.96)}input{font:inherit;padding:10px 12px;border:1px solid #cfd2e3;border-radius:12px;min-width:0}' +
    'h1{margin:0 0 8px;font-size:clamp(18px,7vw,26px);line-height:1.2}p{margin:6px 0}@media (max-width:220px){body{padding:10px}button{padding:9px 12px;font-size:14px;border-radius:12px}}';
  function page(o, lang) {
    const r = (v) => (v && typeof v === 'object' ? (v[lang] != null ? v[lang] : v.en) : (v || ''));
    return '<!DOCTYPE html>\n<html lang="' + lang + '">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<title>' + (r(o.title) || 'Demo') + '</title>\n<script src="webxdc.js"></script>\n<style>\n' + DEMO_CSS + '\n' + r(o.css) + '\n</style>\n</head>\n<body>\n' +
      r(o.body) + '\n' + (o.js ? '<script>\n' + r(o.js) + '\n</script>\n' : '') + '</body>\n</html>\n';
  }
  function demo(o) { return { es: page(o, 'es'), en: page(o, 'en') }; }

  CS.learn = {
    L, fold, track, demo, tracks: () => tracks.slice(), lesson: (id) => lessons.get(id) || null, allLessons: () => [...lessons.values()],
    trackOf: (l) => tracks.find((x) => x.id === l.track) || null,
    stats, trackStats, isDone, result, nextLesson, complete, reset, medals, markSeen, level, LEVELS,
    glossary: () => glossary.slice(), addGlossary, problems: () => problems.slice(), addProblems, searchLessons
  };
})();
