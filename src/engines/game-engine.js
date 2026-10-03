/* Game engine embedded in apps that use the "Game engine" blocks.
 * wcsGameEngine is serialized with toString(), so it must stay self-contained
 * (no closures over Studio code) and run in any webview without libraries. */
(function () {
  'use strict';
  const CS = (globalThis.CS = globalThis.CS || {});

  function wcsGameEngine() {
    const G = {};
    const sprites = new Map();
    const world = { w: 360, h: 640, bg: '#0f172a', gravity: 0, friction: 0, scene: '', stars: null, pixel: false };
    const on = { frame: [], hit: [], tap: [], key: [], scene: {}, every: [] };
    const keys = new Set();
    const pointer = { x: 0, y: 0, sx: 0, sy: 0, down: false };
    const cam = { x: 0, y: 0, follow: null, shake: 0, power: 0 };
    const hud = new Map();
    let canvas = null, ctx = null, view = { w: 360, h: 640 };
    let running = false, paused = false, ended = false, last = 0, seq = 0;
    let particles = [];
    G.time = 0;
    G.last = { me: null, other: null, clone: null, tapped: null };
    G.spawn = null;

    const PALETTE = ['#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8',
      '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffccaa'];
    G.PALETTE = PALETTE;
    const KEYMAP = {
      left: ['ArrowLeft', 'a', 'A'], right: ['ArrowRight', 'd', 'D'], up: ['ArrowUp', 'w', 'W'],
      down: ['ArrowDown', 's', 'S'], action: [' ', 'Enter', 'z', 'Z']
    };

    function num(v, d) { const n = Number(v); return isFinite(n) ? n : (d || 0); }
    function safe(fn, a, b) {
      try { const r = fn(a, b); if (r && typeof r.catch === 'function') r.catch(report); } catch (e) { report(e); }
    }
    function report(e) { if (typeof console !== 'undefined') console.error(e); }

    /* ---------- Stage ---------- */
    G.stage = function (id, w, h, bg) {
      view.w = Math.max(64, num(w, 360)); view.h = Math.max(64, num(h, 640));
      world.w = view.w; world.h = view.h;
      if (bg) world.bg = bg;
      const found = id ? document.getElementById(id) : null;
      if (found && found.getContext) canvas = found;
      else if (canvas && id) canvas.id = id;
      if (!canvas || !canvas.getContext) {
        canvas = document.createElement('canvas');
        canvas.id = id || 'game';
        document.body.appendChild(canvas);
      }
      canvas.width = view.w; canvas.height = view.h;
      canvas.style.touchAction = 'none';
      canvas.style.width = 'auto';
      canvas.style.height = 'auto';
      canvas.style.maxWidth = '100%';
      canvas.style.maxHeight = document.getElementById('wcs-pad') ? 'calc(100vh - 170px)' : '100vh';
      canvas.style.display = 'block';
      canvas.style.margin = '0 auto';
      ctx = canvas.getContext('2d');
      wireInput();
      if (!running) { running = true; last = 0; requestAnimationFrame(loop); }
      return canvas;
    };
    G.pixelArt = function (on2) {
      world.pixel = on2 !== false;
      if (canvas) canvas.style.imageRendering = world.pixel ? 'pixelated' : '';
    };
    G.setWorld = function (prop, value) {
      if (prop === 'bg') world.bg = String(value);
      else if (prop in world) world[prop] = num(value, world[prop]);
    };
    G.stars = function (count, speed) {
      world.stars = [];
      const n = Math.min(400, Math.max(0, num(count, 80)));
      for (let i = 0; i < n; i++) world.stars.push({ x: Math.random(), y: Math.random(), z: Math.random() * 0.9 + 0.1 });
      world.starSpeed = num(speed, 1);
    };

    /* ---------- Sprites ---------- */
    function make(name, spec) {
      const s = Object.assign({
        name: name, shape: 'rect', x: world.w / 2, y: world.h / 2, w: 32, h: 32, color: '#38bdf8',
        text: '', vx: 0, vy: 0, angle: 0, spin: 0, scale: 1, alpha: 1, visible: true, flip: false,
        body: false, gravity: 1, bounce: 0, friction: -1, solid: false, edge: 'none', patrol: false,
        layer: 0, tag: '', scene: world.scene, fixed: false, frames: null, frame: 0, fps: 8,
        onGround: false, z: 0, rx: -20, ry: 30, rz: 0, srx: 0, sry: 0, srz: 0,
        say: '', sayUntil: 0, dead: false, born: G.time
      }, spec || {});
      s.name = name;
      return s;
    }
    G.add = function (name, spec) {
      if (!canvas && typeof document !== 'undefined' && document.body) G.stage('game', view.w, view.h);
      name = String(name || ('sprite' + (++seq)));
      const old = sprites.get(name);
      const s = make(name, spec);
      if (old) s.scene = old.scene;
      sprites.set(name, s);
      return s;
    };
    G.clone = function (target, x, y) {
      const src = refs(target)[0];
      if (!src) return null;
      const name = src.name.split('#')[0] + '#' + (++seq);
      const c = Object.assign({}, src, { name: name, scene: world.scene, born: G.time, dead: false, onGround: false });
      if (x !== undefined && x !== '' && x !== null) c.x = num(x, src.x);
      if (y !== undefined && y !== '' && y !== null) c.y = num(y, src.y);
      sprites.set(name, c);
      G.last.clone = c;
      return name;
    };

    /* Target references: a name, "tag:x" (all with that tag), "@me", "@other", "@clone", "@tapped". */
    function refs(target) {
      const t = String(target == null ? '' : target);
      if (t === '@me') return G.last.me ? [G.last.me] : [];
      if (t === '@other') return G.last.other ? [G.last.other] : [];
      if (t === '@clone') return G.last.clone ? [G.last.clone] : [];
      if (t === '@tapped') return G.last.tapped ? [G.last.tapped] : [];
      if (t.indexOf('tag:') === 0) {
        const tag = t.slice(4), out = [];
        sprites.forEach(function (s) { if (!s.dead && s.tag === tag) out.push(s); });
        return out;
      }
      const s = sprites.get(t);
      return s && !s.dead ? [s] : [];
    }
    G.refs = refs;
    G.get = function (target, prop) {
      const s = refs(target)[0];
      if (!s) return prop === 'exists' ? false : 0;
      if (prop === 'exists') return true;
      if (prop === 'count') return refs(target).length;
      return s[prop];
    };
    G.count = function (target) { return refs(target).length; };
    G.set = function (target, prop, value) {
      refs(target).forEach(function (s) {
        if (typeof s[prop] === 'number') s[prop] = num(value, s[prop]);
        else if (typeof s[prop] === 'boolean') s[prop] = value === true || value === 'true' || value === 1 || value === '1';
        else s[prop] = value;
      });
    };
    G.change = function (target, prop, delta) {
      refs(target).forEach(function (s) { s[prop] = num(s[prop]) + num(delta); });
    };
    G.remove = function (target) { refs(target).forEach(function (s) { s.dead = true; sprites.delete(s.name); }); };
    G.say = function (target, text, seconds) {
      refs(target).forEach(function (s) { s.say = String(text); s.sayUntil = G.time + num(seconds, 2); });
    };
    G.moveToward = function (target, x, y, speed) {
      refs(target).forEach(function (s) {
        const dx = num(x) - s.x, dy = num(y) - s.y, d = Math.hypot(dx, dy) || 1, sp = num(speed, 2);
        s.vx = dx / d * sp; s.vy = dy / d * sp;
      });
    };
    /* Without a target sprite, chase the finger / mouse. */
    G.chase = function (target, other, speed) {
      const o = other ? refs(other)[0] : null;
      if (other && !o) return;
      G.moveToward(target, o ? o.x : pointer.x, o ? o.y : pointer.y, speed);
    };
    /* Arrow keys / WASD / on-screen pad set the velocity every frame. */
    G.keyMove = function (target, speed, mode) {
      G.onFrame(function () {
        const sp = num(speed, 4);
        refs(target).forEach(function (s) {
          const dx = (isDown('right') ? 1 : 0) - (isDown('left') ? 1 : 0);
          const dy = (isDown('down') ? 1 : 0) - (isDown('up') ? 1 : 0);
          s.vx = dx * sp;
          if (mode !== 'horizontal') s.vy = dy * sp;
          if (dx) s.flip = dx < 0;
        });
      });
    };
    G.platformer = function (target, speed, jump) {
      if (!world.gravity) world.gravity = 0.6;
      refs(target).forEach(function (s) { s.body = true; if (s.edge === 'none') s.edge = 'stop'; });
      G.keyMove(target, speed, 'horizontal');
      const hop = function () {
        refs(target).forEach(function (s) { if (s.onGround) { s.vy = -Math.abs(num(jump, 12)); G.sfx('jump'); } });
      };
      G.onKey('up', hop);
      G.onKey('action', hop);
    };
    G.pointAt = function (target, other) {
      const o = refs(other)[0];
      refs(target).forEach(function (s) {
        const tx = o ? o.x : pointer.x, ty = o ? o.y : pointer.y;
        s.angle = Math.atan2(ty - s.y, tx - s.x) * 180 / Math.PI;
      });
    };
    G.forward = function (target, speed) {
      refs(target).forEach(function (s) {
        const a = s.angle * Math.PI / 180, sp = num(speed, 3);
        s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp;
      });
    };
    G.jump = function (target, power) {
      refs(target).forEach(function (s) { if (s.onGround) { s.vy = -Math.abs(num(power, 10)); s.onGround = false; } });
    };
    G.distance = function (a, b) {
      const s = refs(a)[0], o = refs(b)[0];
      return s && o ? Math.hypot(s.x - o.x, s.y - o.y) : Infinity;
    };
    function box(s) {
      const w = Math.abs(s.w * s.scale), h = Math.abs(s.h * s.scale);
      return { l: s.x - w / 2, r: s.x + w / 2, t: s.y - h / 2, b: s.y + h / 2 };
    }
    function overlap(a, b) {
      const p = box(a), q = box(b);
      return p.l < q.r && p.r > q.l && p.t < q.b && p.b > q.t;
    }
    function inScene(s) { return !s.scene || s.scene === world.scene; }
    G.touching = function (a, b) {
      const A = refs(a), B = refs(b);
      for (let i = 0; i < A.length; i++) {
        for (let j = 0; j < B.length; j++) {
          if (A[i] !== B[j] && A[i].visible && B[j].visible && overlap(A[i], B[j])) return true;
        }
      }
      return false;
    };

    /* ---------- Pixel art ---------- */
    /* Rows of characters; "0"-"9" and "a"-"f" pick the 16-color palette, "." or " " is transparent.
       Frames are separated by a blank line or "|". */
    function pixelFrames(src) {
      const text = String(src || '').replace(/\r/g, '');
      const chunks = text.split(/\n\s*\n|\|/).map(function (c) {
        return c.split(/\n|\//).map(function (r) { return r.trim(); }).filter(Boolean);
      }).filter(function (rows) { return rows.length; });
      return chunks.map(function (rows) {
        const w = Math.max.apply(null, rows.map(function (r) { return r.length; }));
        const c = document.createElement('canvas');
        c.width = w; c.height = rows.length;
        const x2 = c.getContext('2d');
        rows.forEach(function (row, y) {
          for (let x = 0; x < row.length; x++) {
            const i = parseInt(row[x], 16);
            if (isNaN(i)) continue;
            x2.fillStyle = PALETTE[i];
            x2.fillRect(x, y, 1, 1);
          }
        });
        return c;
      });
    }
    G.pixels = function (name, rows, scale) {
      const frames = pixelFrames(rows);
      if (!frames.length) return null;
      const k = Math.max(1, num(scale, 4));
      const s = sprites.get(name) || G.add(name, {});
      s.shape = 'pixels'; s.frames = frames; s.frame = 0;
      s.w = frames[0].width * k; s.h = frames[0].height * k;
      G.pixelArt(true);
      return s;
    };
    G.image = function (name, src, w, h) {
      const s = sprites.get(name) || G.add(name, {});
      const img = new Image();
      img.onload = function () {
        if (!num(w)) s.w = img.naturalWidth;
        if (!num(h)) s.h = num(w) ? img.naturalHeight * num(w) / img.naturalWidth : img.naturalHeight;
      };
      img.src = String(src);
      s.shape = 'image'; s.frames = [img]; s.frame = 0;
      if (num(w)) s.w = num(w);
      if (num(h)) s.h = num(h);
      return s;
    };

    /* ---------- Tile maps ---------- */
    const LEGEND = {
      '#': { tag: 'wall', color: '#64748b', solid: true },
      '=': { tag: 'wall', color: '#b45309', solid: true },
      'o': { tag: 'coin', shape: 'circle', color: '#facc15', scale: 0.5 },
      '*': { tag: 'star', shape: 'emoji', text: '⭐', scale: 0.8 },
      'x': { tag: 'danger', color: '#ef4444', scale: 0.8 },
      'e': { tag: 'enemy', color: '#a855f7', body: true, patrol: true, vx: 1.5, scale: 0.8 },
      'G': { tag: 'goal', shape: 'emoji', text: '🚩' }
    };
    G.map = function (rows, size) {
      const k = Math.max(4, num(size, 32));
      const lines = String(rows || '').replace(/\r/g, '').split(/\n|\//).filter(function (r) { return r.length; });
      let n = 0, cols = 0;
      lines.forEach(function (row, y) {
        cols = Math.max(cols, row.length);
        for (let x = 0; x < row.length; x++) {
          const ch = row[x], cx = x * k + k / 2, cy = y * k + k / 2;
          if (ch === 'P') {
            G.spawn = { x: cx, y: cy };
            const p = sprites.get('player') || refs('tag:player')[0];
            if (p) { p.x = cx; p.y = cy; p.vx = 0; p.vy = 0; }
            continue;
          }
          const d = LEGEND[ch];
          if (!d) continue;
          const sc = d.scale || 1;
          G.add(d.tag + '#t' + (++n), {
            shape: d.shape || 'rect', color: d.color, text: d.text || '', tag: d.tag,
            x: cx, y: cy, w: k * sc, h: k * sc, solid: !!d.solid, body: !!d.body,
            patrol: !!d.patrol, vx: d.vx || 0, edge: d.body ? 'bounce' : 'none'
          });
        }
      });
      world.w = Math.max(view.w, cols * k);
      world.h = Math.max(view.h, lines.length * k);
      return n;
    };

    /* ---------- Events ---------- */
    G.onFrame = function (fn) { on.frame.push(fn); };
    G.onKey = function (key, fn) { on.key.push({ key: String(key), fn: fn }); };
    G.onTap = function (target, fn) { on.tap.push({ target: String(target || ''), fn: fn }); };
    G.onHit = function (a, b, fn) { on.hit.push({ a: String(a), b: String(b), fn: fn, now: new Set() }); };
    G.onScene = function (name, fn) { (on.scene[name] = on.scene[name] || []).push(fn); };
    G.every = function (seconds, fn) { on.every.push({ every: Math.max(0.05, num(seconds, 1)), next: G.time + Math.max(0.05, num(seconds, 1)), fn: fn }); };
    G.scene = function (name) {
      world.scene = String(name || '');
      sprites.forEach(function (s) { if (s.scene && s.scene !== world.scene) sprites.delete(s.name); });
      on.hit.forEach(function (h) { h.now.clear(); });
      particles = [];
      cam.x = 0; cam.y = 0;
      (on.scene[world.scene] || []).forEach(function (fn) { safe(fn); });
    };
    G.currentScene = function () { return world.scene; };

    function isDown(name) {
      const list = KEYMAP[name] || [name];
      for (let i = 0; i < list.length; i++) if (keys.has(list[i])) return true;
      return false;
    }
    G.isDown = isDown;
    G.pointer = pointer;
    function press(k) {
      on.key.forEach(function (h) {
        const list = KEYMAP[h.key] || [h.key];
        if (list.indexOf(k) >= 0 || h.key === 'any') safe(h.fn);
      });
    }

    let wired = false;
    function wireInput() {
      if (wired) return;
      wired = true;
      window.addEventListener('keydown', function (e) {
        if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
        if (/^Arrow| $/.test(e.key)) e.preventDefault();
        if (!e.repeat) { keys.add(e.key); press(e.key); }
      });
      window.addEventListener('keyup', function (e) { keys.delete(e.key); });
      window.addEventListener('blur', function () { keys.clear(); });
      const toWorld = function (e) {
        const r = canvas.getBoundingClientRect();
        pointer.sx = (e.clientX - r.left) * (view.w / (r.width || view.w));
        pointer.sy = (e.clientY - r.top) * (view.h / (r.height || view.h));
        pointer.x = pointer.sx + cam.x; pointer.y = pointer.sy + cam.y;
      };
      canvas.addEventListener('pointerdown', function (e) {
        toWorld(e); pointer.down = true;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* old webviews */ }
        unlockAudio();
        const hits = [];
        sprites.forEach(function (s) {
          if (s.dead || !s.visible || !inScene(s)) return;
          const px = s.fixed ? pointer.sx : pointer.x, py = s.fixed ? pointer.sy : pointer.y, b = box(s);
          if (px >= b.l && px <= b.r && py >= b.t && py <= b.b) hits.push(s);
        });
        hits.sort(function (a, b) { return b.layer - a.layer; });
        on.tap.forEach(function (h) {
          if (!h.target) { G.last.tapped = hits[0] || null; safe(h.fn); return; }
          const want = refs(h.target);
          const s = hits.find(function (x) { return want.indexOf(x) >= 0; });
          if (s) { G.last.tapped = s; G.last.me = s; safe(h.fn); }
        });
      });
      canvas.addEventListener('pointermove', function (e) { toWorld(e); });
      const up = function () { pointer.down = false; };
      canvas.addEventListener('pointerup', up);
      canvas.addEventListener('pointercancel', up);
      document.addEventListener('visibilitychange', function () { last = 0; keys.clear(); });
    }

    /* On-screen controls for phones: "platform" (left, right, jump), "dpad" (4 arrows), "dpad_a" (4 arrows + A). */
    G.pad = function (kind) {
      const old = document.getElementById('wcs-pad');
      if (old) old.remove();
      const pad = document.createElement('div');
      pad.id = 'wcs-pad';
      pad.style.cssText = 'position:fixed;left:0;right:0;bottom:12px;display:flex;justify-content:space-between;' +
        'padding:0 14px;pointer-events:none;z-index:50;user-select:none;-webkit-user-select:none';
      const btn = function (label, key) {
        const b = document.createElement('button');
        b.textContent = label;
        b.setAttribute('aria-label', key);
        b.style.cssText = 'pointer-events:auto;width:58px;height:58px;margin:4px;border-radius:18px;border:0;' +
          'background:rgba(15,23,42,.55);color:#fff;font:700 22px system-ui;touch-action:none;backdrop-filter:blur(6px);' +
          'box-shadow:0 2px 8px rgba(0,0,0,.25),inset 0 0 0 1px rgba(255,255,255,.25)';
        const down = function (e) { e.preventDefault(); unlockAudio(); if (!keys.has(key)) { keys.add(key); press(key); } b.style.background = 'rgba(99,102,241,.85)'; };
        const upB = function (e) { e.preventDefault(); keys.delete(key); b.style.background = 'rgba(15,23,42,.55)'; };
        b.addEventListener('pointerdown', down);
        b.addEventListener('pointerup', upB);
        b.addEventListener('pointercancel', upB);
        b.addEventListener('pointerleave', upB);
        return b;
      };
      const group = function () {
        const g = document.createElement('div');
        g.style.cssText = 'display:flex;align-items:flex-end';
        for (let i = 0; i < arguments.length; i++) g.appendChild(arguments[i]);
        return g;
      };
      if (kind === 'dpad' || kind === 'dpad_a') {
        const cross = document.createElement('div');
        cross.style.cssText = 'display:grid;grid-template-columns:repeat(3,66px);grid-template-rows:repeat(2,66px)';
        const sp = function () { return document.createElement('span'); };
        [sp(), btn('▲', 'ArrowUp'), sp(), btn('◀', 'ArrowLeft'), btn('▼', 'ArrowDown'), btn('▶', 'ArrowRight')].forEach(function (x) { cross.appendChild(x); });
        pad.appendChild(cross);
        pad.appendChild(group(kind === 'dpad_a' ? btn('A', ' ') : document.createElement('span')));
      } else {
        pad.appendChild(group(btn('◀', 'ArrowLeft'), btn('▶', 'ArrowRight')));
        pad.appendChild(group(btn('▲', 'ArrowUp')));
      }
      document.body.appendChild(pad);
      /* keep the whole stage visible above the buttons (aspect ratio is preserved) */
      if (canvas) canvas.style.maxHeight = 'calc(100vh - 170px)';
    };

    /* ---------- Physics ---------- */
    function moveAxis(s, axis, d, solids) {
      if (!d) return;
      s[axis] += d;
      for (let i = 0; i < solids.length; i++) {
        const o = solids[i];
        if (o === s || !overlap(s, o)) continue;
        const half = axis === 'x' ? (Math.abs(o.w * o.scale) + Math.abs(s.w * s.scale)) / 2
                                  : (Math.abs(o.h * o.scale) + Math.abs(s.h * s.scale)) / 2;
        if (axis === 'x') {
          s.x = d > 0 ? o.x - half : o.x + half;
          s.vx = s.patrol ? -s.vx : -s.vx * s.bounce;
          if (s.patrol) s.flip = s.vx < 0;
        } else {
          s.y = d > 0 ? o.y - half : o.y + half;
          if (d > 0) s.onGround = true;
          s.vy = Math.abs(s.vy * s.bounce) < 0.6 ? 0 : -s.vy * s.bounce;
        }
      }
    }
    function edges(s) {
      if (s.edge === 'none' || s.fixed) return;
      const w = Math.abs(s.w * s.scale) / 2, h = Math.abs(s.h * s.scale) / 2;
      if (s.edge === 'wrap') {
        if (s.x < -w) s.x = world.w + w; else if (s.x > world.w + w) s.x = -w;
        if (s.y < -h) s.y = world.h + h; else if (s.y > world.h + h) s.y = -h;
      } else if (s.edge === 'destroy') {
        if (s.x < -w || s.x > world.w + w || s.y < -h || s.y > world.h + h) { s.dead = true; sprites.delete(s.name); }
      } else {
        const b = s.edge === 'bounce';
        if (s.x < w) { s.x = w; s.vx = b ? Math.abs(s.vx) : 0; if (s.patrol) s.flip = false; }
        if (s.x > world.w - w) { s.x = world.w - w; s.vx = b ? -Math.abs(s.vx) : 0; if (s.patrol) s.flip = true; }
        if (s.y < h) { s.y = h; s.vy = b ? Math.abs(s.vy) : 0; }
        if (s.y > world.h - h) {
          s.y = world.h - h;
          s.vy = b && Math.abs(s.vy) > 1 ? -Math.abs(s.vy) * (s.bounce || 1) : 0;
          s.onGround = true;
        }
      }
    }
    function step(k) {
      G.time += k / 60;
      on.frame.forEach(function (fn) { safe(fn, k); });
      on.every.forEach(function (t) { if (G.time >= t.next) { t.next = G.time + t.every; safe(t.fn); } });
      const list = [], solids = [];
      sprites.forEach(function (s) { if (!s.dead && inScene(s)) { list.push(s); if (s.solid && s.visible) solids.push(s); } });
      list.forEach(function (s) {
        if (s.dead) return;
        if (s.body) s.vy += world.gravity * s.gravity * k;
        const fr = s.friction >= 0 ? s.friction : world.friction;
        if (fr) { const f = Math.pow(1 - Math.min(0.99, fr), k); s.vx *= f; if (!s.body || !world.gravity) s.vy *= f; }
        s.angle += s.spin * k; s.rx += s.srx * k; s.ry += s.sry * k; s.rz += s.srz * k;
        s.onGround = false;
        if (s.body && solids.length) { moveAxis(s, 'x', s.vx * k, solids); moveAxis(s, 'y', s.vy * k, solids); }
        else { s.x += s.vx * k; s.y += s.vy * k; }
        edges(s);
        if (s.frames && s.frames.length > 1) s.frame = (s.frame + s.fps * k / 60) % s.frames.length;
      });
      on.hit.forEach(function (h) {
        const A = refs(h.a), B = refs(h.b), now = new Set();
        A.forEach(function (a) {
          B.forEach(function (b) {
            if (a === b || a.dead || b.dead || !a.visible || !b.visible || !overlap(a, b)) return;
            const key = a.name + '|' + b.name;
            now.add(key);
            if (!h.now.has(key)) { G.last.me = a; G.last.other = b; safe(h.fn); }
          });
        });
        h.now = now;
      });
      particles = particles.filter(function (p) {
        p.x += p.vx * k; p.y += p.vy * k; p.vy += 0.15 * k; p.life -= k / 60;
        return p.life > 0;
      });
      if (world.stars) {
        world.stars.forEach(function (st) {
          st.y += 0.002 * st.z * world.starSpeed * k;
          if (st.y > 1) { st.y = 0; st.x = Math.random(); }
        });
      }
      const f = cam.follow ? refs(cam.follow)[0] : null;
      if (f) {
        cam.x += (f.x - view.w / 2 - cam.x) * Math.min(1, 0.15 * k);
        cam.y += (f.y - view.h / 2 - cam.y) * Math.min(1, 0.15 * k);
      }
      cam.x = Math.max(0, Math.min(cam.x, world.w - view.w));
      cam.y = Math.max(0, Math.min(cam.y, world.h - view.h));
      if (cam.shake > 0) cam.shake -= k / 60;
    }

    /* ---------- Drawing ---------- */
    function shade(hex, k) {
      let c = String(hex || '#888').replace('#', '');
      if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
      const n = parseInt(c.slice(0, 6), 16) || 0;
      const f = function (v) { return Math.max(0, Math.min(255, Math.round(v * k))); };
      return 'rgb(' + f(n >> 16 & 255) + ',' + f(n >> 8 & 255) + ',' + f(n & 255) + ')';
    }
    const MESH = {
      cube: {
        v: [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]],
        f: [[0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7], [1, 5, 6, 2], [4, 5, 1, 0], [3, 2, 6, 7]]
      },
      pyramid: {
        v: [[-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1], [0, -1, 0]],
        f: [[3, 2, 1, 0], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]]
      },
      gem: {
        v: [[0, -1.3, 0], [1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 0, -1], [0, 1.3, 0]],
        f: [[0, 2, 1], [0, 3, 2], [0, 4, 3], [0, 1, 4], [5, 1, 2], [5, 2, 3], [5, 3, 4], [5, 4, 1]]
      }
    };
    const LIGHT = (function () { const l = [-0.4, -0.7, -0.6], n = Math.hypot(l[0], l[1], l[2]); return [l[0] / n, l[1] / n, l[2] / n]; })();
    function draw3d(s) {
      const m = MESH[s.shape];
      const r = Math.PI / 180, ax = s.rx * r, ay = s.ry * r, az = s.rz * r;
      const cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay), cz = Math.cos(az), sz = Math.sin(az);
      const size = s.w / 2;
      const pts = m.v.map(function (p) {
        let x = p[0], y = p[1], z = p[2], t;
        t = y * cx - z * sx; z = y * sx + z * cx; y = t;
        t = x * cy + z * sy; z = -x * sy + z * cy; x = t;
        t = x * cz - y * sz; y = x * sz + y * cz; x = t;
        const f = 6 / (6 + z);
        return [x * size * f, y * size * f, z];
      });
      const faces = m.f.map(function (f) {
        const a = pts[f[0]], b = pts[f[1]], c = pts[f[2]];
        const ux = b[0] - a[0], uy = b[1] - a[1], vx = c[0] - a[0], vy = c[1] - a[1];
        const cross = ux * vy - uy * vx;
        const raw = f.map(function (i) { return m.v[i]; });
        const n = normal(raw, ax, ay, az);
        return { f: f, z: f.reduce(function (acc, i) { return acc + pts[i][2]; }, 0) / f.length, front: cross > 0, light: n };
      }).filter(function (f) { return f.front; });
      faces.sort(function (a, b) { return b.z - a.z; });
      faces.forEach(function (face) {
        ctx.beginPath();
        face.f.forEach(function (i, j) { if (j) ctx.lineTo(pts[i][0], pts[i][1]); else ctx.moveTo(pts[i][0], pts[i][1]); });
        ctx.closePath();
        ctx.fillStyle = shade(s.color, 0.45 + 0.75 * face.light);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.18)';
        ctx.stroke();
      });
    }
    function normal(v, ax, ay, az) {
      const a = v[0], b = v[1], c = v[2];
      let nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
      let ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
      let nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      const cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay), cz = Math.cos(az), sz = Math.sin(az);
      let t = ny * cx - nz * sx; nz = ny * sx + nz * cx; ny = t;
      t = nx * cy + nz * sy; nz = -nx * sy + nz * cy; nx = t;
      t = nx * cz - ny * sz; ny = nx * sz + ny * cz; nx = t;
      const len = Math.hypot(nx, ny, nz) || 1;
      return Math.max(0, -(nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / len);
    }
    function drawSprite(s) {
      ctx.save();
      let x = s.x, y = s.y, k = 1;
      if (s.z && !MESH[s.shape]) { k = 400 / (400 + s.z); x = view.w / 2 + cam.x + (x - view.w / 2 - cam.x) * k; y = view.h / 2 + cam.y + (y - view.h / 2 - cam.y) * k; }
      if (s.fixed) ctx.translate(x, y); else ctx.translate(x - cam.x, y - cam.y);
      if (MESH[s.shape]) {
        if (s.z) { k = 400 / (400 + s.z); ctx.scale(k, k); }
        ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha));
        draw3d(s);
        ctx.restore();
        return;
      }
      ctx.rotate(s.angle * Math.PI / 180);
      ctx.scale(s.scale * k * (s.flip ? -1 : 1), s.scale * k);
      ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha));
      const w = s.w, h = s.h;
      ctx.fillStyle = s.color;
      if (s.shape === 'circle') {
        ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill();
      } else if (s.shape === 'text' || s.shape === 'emoji') {
        ctx.font = (s.shape === 'emoji' ? '' : '700 ') + Math.round(h * (s.shape === 'emoji' ? 0.9 : 0.7)) + 'px system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(s.text), 0, s.shape === 'emoji' ? h * 0.06 : 0);
      } else if ((s.shape === 'pixels' || s.shape === 'image') && s.frames) {
        const fr = s.frames[Math.floor(s.frame) % s.frames.length];
        if (fr && (fr.width || fr.naturalWidth)) {
          ctx.imageSmoothingEnabled = s.shape !== 'pixels';
          ctx.drawImage(fr, -w / 2, -h / 2, w, h);
        }
      } else {
        const r = Math.min(6, w / 4, h / 4);
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-w / 2, -h / 2, w, h, r); else ctx.rect(-w / 2, -h / 2, w, h);
        ctx.fill();
      }
      ctx.restore();
      if (s.say && G.time < s.sayUntil) bubble(s, x, y);
    }
    function bubble(s, x, y) {
      const px = s.fixed ? x : x - cam.x, py = (s.fixed ? y : y - cam.y) - Math.abs(s.h * s.scale) / 2 - 10;
      ctx.save();
      ctx.font = '600 14px system-ui, sans-serif';
      const tw = Math.min(220, ctx.measureText(s.say).width) + 16;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.25)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(px - tw / 2, py - 28, tw, 26, 10); else ctx.rect(px - tw / 2, py - 28, tw, 26);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(s.say, px, py - 15, 210);
      ctx.restore();
    }
    function render() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = world.bg;
      ctx.fillRect(0, 0, view.w, view.h);
      if (world.stars) {
        world.stars.forEach(function (st) {
          ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + st.z * 0.7) + ')';
          ctx.fillRect(st.x * view.w, st.y * view.h, st.z * 2.2, st.z * 2.2);
        });
      }
      if (cam.shake > 0) ctx.translate((Math.random() - 0.5) * cam.power, (Math.random() - 0.5) * cam.power);
      const list = [];
      sprites.forEach(function (s) { if (!s.dead && s.visible && inScene(s)) list.push(s); });
      list.sort(function (a, b) { return (a.fixed - b.fixed) || (a.layer - b.layer) || (b.z - a.z); });
      list.forEach(drawSprite);
      particles.forEach(function (p) {
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - cam.x - p.size / 2, p.y - cam.y - p.size / 2, p.size, p.size);
      });
      ctx.globalAlpha = 1;
      if (hud.size) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.font = '700 16px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        let y = 10;
        hud.forEach(function (v, k) {
          const t = k + ': ' + v;
          ctx.fillStyle = 'rgba(0,0,0,.35)';
          ctx.fillRect(8, y - 3, ctx.measureText(t).width + 14, 24);
          ctx.fillStyle = '#fff';
          ctx.fillText(t, 15, y);
          y += 28;
        });
      }
    }
    function loop(ts) {
      if (!running) return;
      requestAnimationFrame(loop);
      if (!ctx) return;
      let dt = last ? Math.min(0.05, (ts - last) / 1000) : 1 / 60;
      if (!(dt > 0)) dt = 1 / 60;
      last = ts;
      if (!paused && !ended) step(dt * 60);
      render();
    }
    G.hud = function (label, value) { hud.set(String(label), value == null ? '' : value); };
    G.follow = function (target) { cam.follow = target || null; };
    G.shake = function (seconds, power) { cam.shake = num(seconds, 0.3); cam.power = num(power, 8); };
    G.burst = function (target, color, count) {
      const s = refs(target)[0];
      const x = s ? s.x : pointer.x, y = s ? s.y : pointer.y, n = Math.min(120, num(count, 16));
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 4;
        particles.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, life: 0.4 + Math.random() * 0.5, size: 3 + Math.random() * 3, color: color || (s && s.color) || '#fde047' });
      }
    };
    G.pause = function (p) { paused = p !== false; };
    G.random = function (a, b) { a = num(a); b = num(b, 1); return Math.floor(a + Math.random() * (b - a + 1)); };

    /* ---------- Sound ---------- */
    let audio = null;
    function unlockAudio() {
      if (!audio) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try { audio = new AC(); } catch (e) { return null; }
      }
      if (audio.state === 'suspended') audio.resume();
      return audio;
    }
    function tone(freq, dur, type, vol, slide, at) {
      const a = unlockAudio();
      if (!a) return;
      const t0 = a.currentTime + (at || 0);
      const o = a.createOscillator(), g = a.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t0 + dur);
      g.gain.setValueAtTime(vol || 0.12, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(a.destination);
      o.start(t0); o.stop(t0 + dur + 0.02);
    }
    function noise(dur, vol) {
      const a = unlockAudio();
      if (!a) return;
      const n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = a.createBufferSource(), g = a.createGain();
      src.buffer = buf; g.gain.value = vol || 0.2;
      src.connect(g); g.connect(a.destination); src.start();
    }
    const SFX = {
      jump: function () { tone(300, 0.18, 'square', 0.1, 700); },
      coin: function () { tone(988, 0.08, 'square', 0.1); tone(1319, 0.25, 'square', 0.1, 0, 0.08); },
      hit: function () { tone(200, 0.2, 'sawtooth', 0.12, 60); },
      explode: function () { noise(0.5, 0.3); tone(120, 0.4, 'triangle', 0.15, 40); },
      laser: function () { tone(1200, 0.15, 'square', 0.08, 200); },
      powerup: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.1, 'square', 0.09, 0, i * 0.07); }); },
      click: function () { tone(660, 0.04, 'square', 0.08); },
      win: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, 0.18, 'triangle', 0.12, 0, i * 0.12); }); },
      lose: function () { [392, 330, 262, 196].forEach(function (f, i) { tone(f, 0.25, 'triangle', 0.12, 0, i * 0.18); }); }
    };
    G.sfx = function (kind) { (SFX[kind] || SFX.click)(); };
    const NOTES = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
    G.melody = function (notes, bpm) {
      const beat = 60 / Math.max(30, Math.min(400, num(bpm, 140)));
      let at = 0;
      String(notes || '').trim().split(/\s+/).forEach(function (n) {
        const m = /^([A-Ga-g])(#|b)?(\d)?$/.exec(n);
        if (m) {
          const semi = NOTES[m[1].toUpperCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + ((m[3] ? +m[3] : 4) - 4) * 12;
          tone(440 * Math.pow(2, semi / 12), beat * 0.9, 'triangle', 0.12, 0, at);
        }
        at += beat;
      });
    };

    /* ---------- Live multiplayer (webxdc realtime channel) ---------- */
    let rt = null;
    const peers = {};
    G.share = function (target) {
      const wx = window.webxdc;
      if (!wx || typeof wx.joinRealtimeChannel !== 'function') return false;
      if (!rt) {
        try { rt = wx.joinRealtimeChannel(); } catch (e) { return false; }
        rt.setListener(function (data) {
          let m;
          try { m = JSON.parse(new TextDecoder().decode(data)); } catch (e) { return; }
          if (!m || typeof m.n !== 'string' || typeof m.id !== 'string') return;
          const name = m.n + '@' + m.id.slice(0, 12);
          let s = sprites.get(name);
          if (!s) s = G.add(name, { tag: 'remote', scene: '' });
          ['x', 'y', 'w', 'h', 'angle', 'scale', 'alpha'].forEach(function (k) { if (typeof m[k] === 'number' && isFinite(m[k])) s[k] = m[k]; });
          if (typeof m.color === 'string' && m.color.length < 30) s.color = m.color;
          if (typeof m.shape === 'string' && /^(rect|circle|emoji|text)$/.test(m.shape)) s.shape = m.shape;
          if (typeof m.text === 'string') s.text = m.text.slice(0, 40);
          if (typeof m.who === 'string') { s.say = m.who.slice(0, 24); s.sayUntil = G.time + 0.5; }
          s.flip = !!m.flip;
          peers[name] = G.time;
        });
        G.every(1, function () {
          Object.keys(peers).forEach(function (k) { if (G.time - peers[k] > 5) { G.remove(k); delete peers[k]; } });
        });
      }
      const me = wx.selfAddr || 'me', who = wx.selfName || '';
      let lastSent = 0, lastMsg = '';
      G.onFrame(function () {
        const s = refs(target)[0];
        if (!s || G.time - lastSent < 1 / 12) return;
        const m = { n: String(target), id: String(me), who: who, x: Math.round(s.x), y: Math.round(s.y), w: s.w, h: s.h,
          angle: Math.round(s.angle), scale: s.scale, alpha: s.alpha, color: s.color, shape: s.shape, text: s.text, flip: s.flip };
        const json = JSON.stringify(m);
        if (json === lastMsg && G.time - lastSent < 1) return;
        lastSent = G.time; lastMsg = json;
        try { rt.send(new TextEncoder().encode(json)); } catch (e) { /* channel closed */ }
      });
      return true;
    };
    G.players = function () { return Object.keys(peers).length + 1; };

    /* ---------- Game over ---------- */
    G.over = function (title, mood) {
      if (ended) return;
      ended = true;
      G.sfx(mood === 'win' ? 'win' : 'lose');
      const box = document.createElement('div');
      box.id = 'wcs-over';
      box.style.cssText = 'position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;' +
        'gap:18px;background:rgba(2,6,23,.72);color:#fff;font:800 32px system-ui;z-index:60;text-align:center;padding:24px';
      const h = document.createElement('div');
      h.textContent = String(title || (mood === 'win' ? '🏆' : 'Game over'));
      const b = document.createElement('button');
      b.textContent = '↻';
      b.setAttribute('aria-label', 'restart');
      b.style.cssText = 'width:72px;height:72px;border-radius:24px;border:0;background:' + (mood === 'win' ? '#22c55e' : '#6366f1') + ';color:#fff;font:800 34px system-ui';
      b.onclick = function () { location.reload(); };
      box.appendChild(h); box.appendChild(b);
      document.body.appendChild(box);
    };
    G.restart = function () { location.reload(); };
    G.isOver = function () { return ended; };
    G.sprites = sprites;
    G.world = world;
    return G;
  }

  CS.gameEngine = {
    fn: wcsGameEngine,
    /* same 16 colors as PALETTE inside the engine (used by the pixel editor) */
    PALETTE: ['#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8',
      '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffccaa'],
    source: function () { return 'const G = (' + wcsGameEngine.toString() + ')();'; }
  };
})();
