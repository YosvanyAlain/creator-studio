/* Game engine tests: block catalog, code generation and a simulated run of the runtime. */
'use strict';

module.exports = async function (T) {
  const { test, eq, ok, CS } = T;
  const B = CS.blocks;
  const ENGINE = Object.keys(B.DEFS).filter((k) => B.DEFS[k].cat === 'engine');

  process.stdout.write('\n== 2.0: motor de juegos ==\n');

  await test('motor: catálogo completo con subgrupos y gen()', () => {
    ok(ENGINE.length >= 50, 'bloques: ' + ENGINE.length);
    ok(B.CATS.some((c) => c.id === 'engine'), 'categoría engine');
    for (const ty of ENGINE) {
      const d = B.DEFS[ty];
      ok(typeof d.gen === 'function', ty + ' sin gen');
      ok(B.SUB_LABELS[d.sub], ty + ' subgrupo sin etiqueta: ' + d.sub);
      eq(d.helper, 'wcsGame', ty);
    }
  });

  /* A model with every engine block, filled with defaults (containers get a child). */
  function fullModel() {
    const m = B.newModel();
    m.vars.push({ name: 'v', value: '0' }, { name: 'px', value: '0' }, { name: 'py', value: '0' });
    for (const ty of ENGINE) {
      const b = B.newBlock(ty);
      for (const p of B.DEFS[ty].params) {
        if (p.type === 'sprite' && !b.params[p.key]) b.params[p.key] = 'player';
        if (p.type === 'var') b.params[p.key] = p.key === 'yVar' ? 'py' : (p.key === 'xVar' ? 'px' : 'v');
        if (p.type === 'asset') b.params[p.key] = 'img/hero.png';
      }
      if (b.children) b.children.push(B.newBlock('gx_sfx'));
      m.contexts.onStart.push(b);
    }
    return m;
  }

  await test('motor: todos los bloques generan código válido sin problemas', () => {
    const res = B.generate(fullModel());
    eq(res.problems.length, 0, JSON.stringify(res.problems.slice(0, 3)));
    ok(res.code.indexOf('const G = (function wcsGameEngine') >= 0, 'motor incluido');
    ok(res.code.indexOf('G.onHit("player", "tag:coin", async () => {') >= 0, 'evento con cuerpo');
    new Function(res.code); /* throws on syntax errors */
  });

  await test('motor: sin bloques de juego no se incluye el motor', () => {
    const m = B.newModel();
    m.contexts.onStart.push(B.newBlock('show_toast') || B.newBlock('set_text'));
    ok(B.generate(m).code.indexOf('wcsGameEngine') < 0);
  });

  await test('motor: nombres y referencias inválidos se marcan como problema', () => {
    const m = B.newModel();
    const a = B.newBlock('gx_add'); a.params.sname = 'mal nombre!';
    const r = B.newBlock('gx_remove'); r.params.target = "x'); alert(1); ('";
    m.contexts.onStart.push(a, r);
    const res = B.generate(m);
    eq(res.problems.length, 2, JSON.stringify(res.problems));
    ok(res.code.indexOf('alert(1)') < 0, 'sin inyección');
  });

  /* ---------- Simulated runtime ---------- */
  function fakeDom() {
    const listeners = {};
    const ctx2d = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ width: 10 })), set: (t, k, v) => { t[k] = v; return true; } });
    const mkCanvas = () => ({
      width: 0, height: 0, style: {}, id: '',
      getContext: () => ctx2d, addEventListener: (n, f) => { (listeners[n] = listeners[n] || []).push(f); },
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 640 }), setPointerCapture() {}
    });
    const frames = [];
    const env = {
      window: { addEventListener() {}, webxdc: null },
      document: {
        body: { appendChild() {} }, getElementById: () => null, createElement: mkCanvas,
        addEventListener() {}
      },
      requestAnimationFrame: (f) => frames.push(f),
      listeners
    };
    let ts = 1000;
    env.run = (n) => {
      for (let i = 0; i < n; i++) { const f = frames.shift(); if (!f) break; ts += 1000 / 60; f(ts); }
    };
    return env;
  }
  function engine(env) {
    const src = CS.gameEngine.source() + '\nreturn G;';
    return new Function('window', 'document', 'requestAnimationFrame', 'location', 'Image', 'TextEncoder', 'TextDecoder', src)(
      env.window, env.document, env.requestAnimationFrame, { reload() {} }, function () {}, TextEncoder, TextDecoder);
  }

  await test('motor (simulado): gravedad, suelo sólido y salto', () => {
    const env = fakeDom(); const G = engine(env);
    G.stage('game', 360, 640);
    G.setWorld('gravity', 0.6);
    G.add('floor', { x: 180, y: 600, w: 360, h: 40, solid: true });
    G.add('player', { x: 180, y: 100, w: 30, h: 30, body: true });
    env.run(120);
    const p = G.get('player', 'y');
    ok(Math.abs(p - (600 - 20 - 15)) < 0.01, 'apoyado en el suelo: ' + p);
    ok(G.get('player', 'onGround'), 'onGround');
    G.jump('player', 10);
    env.run(2);
    ok(G.get('player', 'y') < 565, 'saltó');
  });

  await test('motor (simulado): mapa de bloques, recoger monedas y patrulla', () => {
    const env = fakeDom(); const G = engine(env);
    G.stage('game', 320, 240);
    G.add('player', { w: 20, h: 20 });
    G.map('.P..o.o.\n########', 32);
    eq(G.count('tag:coin'), 2);
    eq(G.count('tag:wall'), 8);
    eq(G.get('player', 'x'), 48, 'colocado en P');
    let got = 0;
    G.onHit('player', 'tag:coin', () => { got++; G.remove('@other'); });
    G.set('player', 'vx', 4);
    env.run(60);
    eq(got, 2, 'monedas recogidas');
    eq(G.count('tag:coin'), 0);
  });

  await test('motor (simulado): escenas, clones, bordes y fin', () => {
    const env = fakeDom(); const G = engine(env);
    G.stage('game', 200, 200);
    G.onScene('n2', () => { G.add('boss', { x: 50, y: 50 }); });
    G.add('global', {});
    G.scene('n1');
    G.add('local', {});
    G.scene('n2');
    ok(G.get('global', 'exists'), 'global sigue');
    ok(!G.get('local', 'exists'), 'local de n1 borrado');
    ok(G.get('boss', 'exists'), 'onScene creó boss');
    G.add('bullet', { x: 100, y: 100, vx: 0, vy: -20, edge: 'destroy' });
    const c = G.clone('bullet');
    ok(/^bullet#\d+$/.test(c), c);
    env.run(30);
    eq(G.count('bullet'), 0, 'destruido al salir');
    ok(!G.get(c, 'exists'), 'clon destruido');
    G.add('ball', { x: 10, y: 100, vx: -5, edge: 'bounce' });
    env.run(3);
    ok(G.get('ball', 'vx') > 0, 'rebotó');
  });
};
