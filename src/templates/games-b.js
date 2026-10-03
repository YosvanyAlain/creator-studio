/* Templates: reflexes and memory. */
'use strict';
(function () {
  const TP = globalThis.CS.templates;
  const { T, kit } = TP;
  const title = (es, en) => ({ k: 'title', label: T('Nombre', 'Name'), type: 'text', value: T(es, en) });
  const accent = (c) => ({ k: 'color', label: T('Color', 'Color'), type: 'color', value: c });

  /* Shared leaderboard markup and styles used by the solo games below. */
  const boardCss = String.raw`
#best li { display: flex; align-items: center; gap: 10px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 8px 12px; }
#best li b { margin-left: auto; font-variant-numeric: tabular-nums; }
#best li .n { width: 18px; color: var(--muted); font-weight: 700; }
#best li.me { border-color: var(--accent); }`;

  TP.add({
    id: 'reflex', cat: 'games', icon: 'bolt', tint: 'orange', peers: 2, level: 1,
    name: T('Reflejos', 'Reflexes'),
    desc: T('Espera a que la pantalla se ponga verde y toca lo más rápido que puedas. El chat ve quién tiene los mejores reflejos.', 'Wait for the screen to turn green and tap as fast as you can. The chat sees who has the fastest reflexes.'),
    learn: [T('Estados de una app', 'App states'), T('Medir el tiempo', 'Measuring time'), T('Guardar solo el mejor resultado', 'Keeping only the best result')],
    fields: [title('Reflejos', 'Reflexes'), accent('#f06a14')],
    files(l, v) {
      const X = (es, en) => (l === 'en' ? en : es);
      const TX = X(
        { start: 'Toca para empezar', wait: 'Espera al verde…', go: '¡Toca!', early: 'Demasiado pronto 😅', again: 'Toca para repetir', best: 'Los más rápidos', none: 'Nadie ha jugado todavía', record: ' marcó ', avg: 'Tu media' },
        { start: 'Tap to start', wait: 'Wait for green…', go: 'Tap!', early: 'Too early 😅', again: 'Tap to try again', best: 'Fastest', none: 'Nobody has played yet', record: ' scored ', avg: 'Your average' });
      return {
        'index.html': kit.page({ lang: l, title: v.title, body: String.raw`
  <main class="app">
    <header class="top">
      <div class="logo">⚡</div>
      <div><h1>${kit.esc(v.title)}</h1><p id="avg">${TX.avg}: —</p></div>
    </header>
    <button id="pad" class="pad idle"><span id="big">⚡</span><span id="msg">${TX.start}</span></button>
    <p class="label">${TX.best}</p>
    <ul id="best" class="list"></ul>
  </main>` }),
        'style.css': kit.css(v.color, String.raw`
.pad { width: 100%; height: 46vh; min-height: 240px; border-radius: 22px; flex-direction: column; gap: 6px; font-size: 1.15rem; transition: background .15s; }
.pad #big { font-size: 3.2rem; font-weight: 800; font-variant-numeric: tabular-nums; }
.pad.idle { background: var(--accent); }
.pad.wait { background: #d63c4a; }
.pad.go { background: #13a866; }
.pad.early { background: #8a8fa8; }
.pad.done { background: var(--accent); }` + boardCss),
        'app.js': String.raw`${X('/* Reflejos: idle → wait → go → done. El tiempo se mide con performance.now(). */', '/* Reflexes: idle → wait → go → done. Time is measured with performance.now(). */')}
const TX = ${kit.js(TX)};
${kit.helpers(l, ['$', 'me', 'avatar'])}

let state = 'idle', timer = null, t0 = 0;
const mine = [];
const best = {};

function show(next, big, msg) {
  state = next;
  $('pad').className = 'pad ' + next;
  $('big').textContent = big;
  $('msg').textContent = msg;
}

$('pad').addEventListener('pointerdown', () => {
  if (state === 'idle' || state === 'done' || state === 'early') {
    show('wait', '…', TX.wait);
    timer = setTimeout(() => { t0 = performance.now(); show('go', '👆', TX.go); }, 1200 + Math.random() * 2600);
  } else if (state === 'wait') {
    clearTimeout(timer);
    show('early', '✋', TX.early + ' ' + TX.again);
  } else if (state === 'go') {
    const ms = Math.round(performance.now() - t0);
    show('done', ms + ' ms', TX.again);
    mine.push(ms);
    const last = mine.slice(-5);
    $('avg').textContent = TX.avg + ': ' + Math.round(last.reduce((a, b) => a + b, 0) / last.length) + ' ms';
    const prev = best[me.addr];
    if (!prev || ms < prev.ms) window.webxdc.sendUpdate({ payload: { addr: me.addr, name: me.name, ms }, info: me.name + TX.record + ms + ' ms' }, '');
  }
});

function render() {
  const top = Object.values(best).sort((a, b) => a.ms - b.ms).slice(0, 8);
  $('best').innerHTML = top.length ? top.map((r, i) => '<li class="' + (r.addr === me.addr ? 'me' : '') + '"><span class="n">' + (i + 1) + '</span>' + avatar(r.name) + esc(r.name) + '<b>' + r.ms + ' ms</b></li>').join('')
    : '<li class="muted">' + TX.none + '</li>';
}

window.webxdc.setUpdateListener((update) => {
  const p = update.payload;
  if (!best[p.addr] || p.ms < best[p.addr].ms) best[p.addr] = p;
  render();
});
render();
`
      };
    }
  });

  TP.add({
    id: 'memory', cat: 'games', icon: 'sparkles', tint: 'violet', peers: 1, level: 2,
    name: T('Memoria', 'Memory'),
    desc: T('Encuentra todas las parejas con el menor número de intentos. Elige el tema y la dificultad; los mejores resultados se comparten.', 'Find every pair in as few moves as possible. Pick the theme and difficulty; the best results are shared.'),
    learn: [T('Barajar una lista', 'Shuffling a list'), T('Animaciones con CSS', 'CSS animations'), T('Comparar dos elecciones', 'Comparing two picks')],
    fields: [
      title('Memoria', 'Memory'),
      { k: 'theme', label: T('Tema', 'Theme'), type: 'choice', value: 'animals', options: [
        { v: 'animals', label: T('Animales', 'Animals') }, { v: 'food', label: T('Comida', 'Food') }, { v: 'space', label: T('Espacio', 'Space') }] },
      { k: 'pairs', label: T('Parejas', 'Pairs'), type: 'range', min: 6, max: 10, value: 8 },
      accent('#7c4dff')
    ],
    files(l, v) {
      const X = (es, en) => (l === 'en' ? en : es);
      const sets = {
        animals: ['🐶', '🐱', '🦊', '🐼', '🐸', '🦁', '🐵', '🐧', '🐙', '🦄'],
        food: ['🍕', '🍔', '🍩', '🍓', '🍉', '🌮', '🍣', '🧁', '🍇', '🥑'],
        space: ['🚀', '🪐', '🌙', '⭐', '☄️', '🛸', '👽', '🌍', '🔭', '🌞']
      };
      const pairs = Math.max(6, Math.min(10, Number(v.pairs) || 8));
      const TX = X(
        { moves: 'Intentos', time: 'Tiempo', win: '¡Completado!', again: 'Jugar otra vez', best: 'Mejores partidas', none: 'Aún no hay partidas', record: ' terminó en ', unit: ' intentos' },
        { moves: 'Moves', time: 'Time', win: 'Completed!', again: 'Play again', best: 'Best games', none: 'No games yet', record: ' finished in ', unit: ' moves' });
      return {
        'index.html': kit.page({ lang: l, title: v.title, body: String.raw`
  <main class="app">
    <header class="top">
      <div class="logo">${sets[v.theme] ? sets[v.theme][0] : '🧠'}</div>
      <div class="grow"><h1>${kit.esc(v.title)}</h1><p>${TX.moves}: <b id="moves">0</b> · ${TX.time}: <b id="time">0:00</b></p></div>
      <button id="restart" class="icon ghost" aria-label="${TX.again}">↻</button>
    </header>
    <section id="grid" class="grid"></section>
    <div id="win" class="card center win" hidden>
      <b>🎉 ${TX.win}</b>
      <p id="winText" class="muted"></p>
      <button id="again">${TX.again}</button>
    </div>
    <p class="label">${TX.best}</p>
    <ul id="best" class="list"></ul>
  </main>` }),
        'style.css': kit.css(v.color, String.raw`
.grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.card-btn { aspect-ratio: 3 / 4; min-height: 0; padding: 0; background: none; perspective: 600px; }
.card-btn .in { position: relative; width: 100%; height: 100%; transition: transform .35s; transform-style: preserve-3d; }
.card-btn.open .in, .card-btn.done .in { transform: rotateY(180deg); }
.card-btn .face { position: absolute; inset: 0; border-radius: 12px; display: grid; place-items: center; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
.card-btn .back { background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 60%, #000)); background-color: var(--accent); }
.card-btn .back::after { content: '?'; color: rgba(255, 255, 255, .55); font-size: 1.4rem; font-weight: 800; }
.card-btn .front { background: var(--card); border: 1px solid var(--line); transform: rotateY(180deg); font-size: clamp(1.6rem, 8vw, 2.4rem); }
.card-btn.done .front { background: var(--accent-soft); border-color: transparent; }
.win b { font-size: 1.3rem; display: block; }
.win[hidden] { display: none; }` + boardCss),
        'app.js': String.raw`${X('/* Memoria: dos cartas abiertas se comparan; si coinciden se quedan boca arriba. */', '/* Memory: two open cards are compared; matching pairs stay face up. */')}
const TX = ${kit.js(TX)};
const ICONS = ${kit.js((sets[v.theme] || sets.animals).slice(0, pairs))};
${kit.helpers(l, ['$', 'me', 'avatar'])}

let cards, open, moves, found, started, clock;
const best = {};

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list;
}

function start() {
  cards = shuffle(ICONS.concat(ICONS)).map((icon) => ({ icon, done: false }));
  open = []; moves = 0; found = 0; started = 0;
  clearInterval(clock);
  $('win').hidden = true;
  $('grid').innerHTML = '';
  cards.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'card-btn';
    b.innerHTML = '<div class="in"><div class="face back"></div><div class="face front">' + c.icon + '</div></div>';
    b.onclick = () => flip(i);
    c.el = b;
    $('grid').appendChild(b);
  });
  stats();
}

function stats() {
  $('moves').textContent = moves;
  const s = started ? Math.floor((Date.now() - started) / 1000) : 0;
  $('time').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function flip(i) {
  const c = cards[i];
  if (c.done || open.includes(i) || open.length === 2) return;
  if (!started) { started = Date.now(); clock = setInterval(stats, 500); }
  c.el.classList.add('open');
  open.push(i);
  if (open.length < 2) return;
  moves++;
  stats();
  const [a, b] = open.map((k) => cards[k]);
  if (a.icon === b.icon) {
    setTimeout(() => { a.done = b.done = true; a.el.classList.add('done'); b.el.classList.add('done'); open = []; if (++found === ICONS.length) finish(); }, 300);
  } else {
    setTimeout(() => { a.el.classList.remove('open'); b.el.classList.remove('open'); open = []; }, 750);
  }
}

function finish() {
  clearInterval(clock);
  const secs = Math.round((Date.now() - started) / 1000);
  $('winText').textContent = moves + TX.unit + ' · ' + $('time').textContent;
  $('win').hidden = false;
  const prev = best[me.addr];
  if (!prev || moves < prev.moves || (moves === prev.moves && secs < prev.secs)) {
    window.webxdc.sendUpdate({ payload: { addr: me.addr, name: me.name, moves, secs }, info: me.name + TX.record + moves + TX.unit }, '');
  }
}

function render() {
  const top = Object.values(best).sort((a, b) => a.moves - b.moves || a.secs - b.secs).slice(0, 5);
  $('best').innerHTML = top.length ? top.map((r, i) => '<li class="' + (r.addr === me.addr ? 'me' : '') + '"><span class="n">' + (i + 1) + '</span>' + avatar(r.name) + esc(r.name) +
    '<b>' + r.moves + ' · ' + Math.floor(r.secs / 60) + ':' + String(r.secs % 60).padStart(2, '0') + '</b></li>').join('')
    : '<li class="muted">' + TX.none + '</li>';
}

$('restart').onclick = start;
$('again').onclick = start;
window.webxdc.setUpdateListener((update) => {
  const p = update.payload, prev = best[p.addr];
  if (!prev || p.moves < prev.moves || (p.moves === prev.moves && p.secs < prev.secs)) best[p.addr] = p;
  render();
});
start();
render();
`
      };
    }
  });
})();
