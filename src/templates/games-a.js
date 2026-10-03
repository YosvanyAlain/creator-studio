/* Templates: tic-tac-toe and snake. */
'use strict';
(function () {
  const TP = globalThis.CS.templates;
  const { T, kit } = TP;
  const title = (es, en) => ({ k: 'title', label: T('Nombre', 'Name'), type: 'text', value: T(es, en) });
  const accent = (c) => ({ k: 'color', label: T('Color', 'Color'), type: 'color', value: c });

  TP.add({
    id: 'tictactoe', cat: 'games', icon: 'grid', tint: 'pink', peers: 2, level: 2,
    name: T('Tres en raya', 'Tic-tac-toe'),
    desc: T('Dos personas del chat juegan por turnos y el resto mira la partida en directo. Lleva el marcador de cada ronda.', 'Two people in the chat play in turns while everyone else watches live. Keeps the score of every round.'),
    learn: [T('Turnos sincronizados', 'Synced turns'), T('Reconstruir el estado desde las actualizaciones', 'Rebuilding state from updates'), T('Detectar una línea ganadora', 'Detecting a winning line')],
    fields: [
      title('Tres en raya', 'Tic-tac-toe'),
      { k: 'symbols', label: T('Fichas', 'Pieces'), type: 'choice', value: 'xo', options: [
        { v: 'xo', label: T('✕ y ◯', '✕ and ◯') }, { v: 'pets', label: T('🐱 y 🐶', '🐱 and 🐶') }, { v: 'sky', label: T('☀️ y 🌙', '☀️ and 🌙') }] },
      accent('#e0457b')
    ],
    files(l, v) {
      const X = (es, en) => (l === 'en' ? en : es);
      const sym = { xo: ['✕', '◯'], pets: ['🐱', '🐶'], sky: ['☀️', '🌙'] }[v.symbols] || ['✕', '◯'];
      const TX = X(
        { join: 'Jugar', waiting: 'Esperando jugadores…', yourTurn: 'Tu turno', turnOf: 'Turno de ', won: ' gana la ronda', draw: 'Empate', again: 'Otra ronda', watching: 'Estás mirando la partida', free: 'Libre', joined: ' se unió a la partida' },
        { join: 'Play', waiting: 'Waiting for players…', yourTurn: 'Your turn', turnOf: 'Turn: ', won: ' wins the round', draw: 'Draw', again: 'New round', watching: 'You are watching', free: 'Free', joined: ' joined the game' });
      return {
        'index.html': kit.page({ lang: l, title: v.title, body: String.raw`
  <main class="app">
    <header class="top">
      <div class="logo">${sym[0]}</div>
      <div><h1>${kit.esc(v.title)}</h1><p id="status"></p></div>
    </header>
    <section class="seats" id="seats"></section>
    <section class="board card" id="board"></section>
    <div class="row">
      <button id="join" class="grow">${TX.join}</button>
      <button id="again" class="grow soft" hidden>${TX.again}</button>
    </div>
  </main>` }),
        'style.css': kit.css(v.color, String.raw`
.seats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.seat { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 10px 12px; display: flex; align-items: center; gap: 10px; transition: .2s; }
.seat.on { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.seat .sym { font-size: 1.4rem; width: 28px; text-align: center; }
.seat .who { flex: 1; min-width: 0; font-weight: 650; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.seat .pts { font-weight: 800; font-size: 1.2rem; font-variant-numeric: tabular-nums; }
.board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 10px; }
.cell { aspect-ratio: 1; min-height: 0; padding: 0; font-size: clamp(2rem, 13vw, 3.4rem); background: var(--bg); color: var(--text); border-radius: 14px; }
.cell.win { background: var(--accent); color: var(--accent-ink); animation: pop .35s; }
.cell:disabled { opacity: 1; }
@keyframes pop { 50% { transform: scale(1.08); } }
[hidden] { display: none !important; }`),
        'app.js': String.raw`${X('/* Tres en raya: las dos primeras personas que pulsan "Jugar" ocupan los asientos. */', '/* Tic-tac-toe: the first two people who tap "Play" take the seats. */')}
const TX = ${kit.js(TX)};
const SYM = ${kit.js(sym)};
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
${kit.helpers(l, ['$', 'me', 'avatar'])}

let seats = [];
let scores = [0, 0];
let round = 0, board, turn, winner, line;

function newRound() {
  board = Array(9).fill(-1);
  turn = round % 2;
  winner = null;
  line = null;
}
newRound();

function result(b) {
  for (const l of LINES) if (b[l[0]] >= 0 && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) return { winner: b[l[0]], line: l };
  return b.every((c) => c >= 0) ? { winner: -1, line: null } : null;
}

${X('/* Cada actualización es una jugada; todos la aplican en el mismo orden. */', '/* Each update is a move; everyone applies them in the same order. */')}
function apply(p) {
  if (p.type === 'join') {
    if (seats.length < 2 && !seats.some((s) => s.addr === p.addr)) seats.push({ addr: p.addr, name: p.name });
  } else if (p.type === 'move') {
    if (winner !== null || seats.length < 2 || board[p.cell] !== -1) return;
    if (seats.findIndex((s) => s.addr === p.addr) !== turn) return;
    board[p.cell] = turn;
    const r = result(board);
    if (r) { winner = r.winner; line = r.line; if (winner >= 0) scores[winner]++; }
    else turn = 1 - turn;
  } else if (p.type === 'round' && p.round === round + 1) {
    round = p.round;
    newRound();
  }
}

const mySeat = () => seats.findIndex((s) => s.addr === me.addr);

function render() {
  $('seats').innerHTML = [0, 1].map((i) => {
    const s = seats[i];
    const on = winner === null && seats.length === 2 && turn === i;
    return '<div class="seat' + (on ? ' on' : '') + '"><span class="sym">' + SYM[i] + '</span>' +
      (s ? avatar(s.name) + '<span class="who">' + esc(s.name) + '</span>' : '<span class="who muted">' + TX.free + '</span>') +
      '<span class="pts">' + scores[i] + '</span></div>';
  }).join('');
  const seat = mySeat();
  $('board').innerHTML = '';
  board.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'cell' + (line && line.includes(i) ? ' win' : '');
    b.textContent = c >= 0 ? SYM[c] : '';
    b.disabled = c >= 0 || winner !== null || seat !== turn || seats.length < 2;
    b.onclick = () => move(i);
    $('board').appendChild(b);
  });
  let status;
  if (seats.length < 2) status = TX.waiting;
  else if (winner === -1) status = TX.draw;
  else if (winner !== null) status = seats[winner].name + TX.won;
  else status = seat === turn ? TX.yourTurn : TX.turnOf + seats[turn].name;
  if (seat < 0 && seats.length === 2) status += ' · ' + TX.watching;
  $('status').textContent = status;
  $('join').hidden = seat >= 0 || seats.length >= 2;
  $('again').hidden = winner === null || seat < 0;
}

function move(cell) {
  const next = board.slice();
  next[cell] = turn;
  const r = result(next);
  const info = r ? (r.winner >= 0 ? me.name + TX.won : TX.draw) : '';
  window.webxdc.sendUpdate({ payload: { type: 'move', cell, addr: me.addr }, info, summary: scores[0] + ' – ' + scores[1] }, '');
}

$('join').onclick = () => window.webxdc.sendUpdate({ payload: { type: 'join', addr: me.addr, name: me.name }, info: me.name + TX.joined }, '');
$('again').onclick = () => window.webxdc.sendUpdate({ payload: { type: 'round', round: round + 1 } }, '');

window.webxdc.setUpdateListener((update) => { apply(update.payload); render(); });
render();
`
      };
    }
  });

  TP.add({
    id: 'snake', cat: 'games', icon: 'gamepad', tint: 'green', peers: 1, level: 2,
    name: T('Serpiente', 'Snake'),
    desc: T('El clásico: come, crece y no te muerdas. Se juega con gestos, flechas o botones, y el chat comparte una tabla de récords.', 'The classic: eat, grow and don’t bite yourself. Play with swipes, arrows or buttons, with a shared high-score table.'),
    learn: [T('Un bucle de juego con tiempo', 'A timed game loop'), T('Dibujar en un canvas', 'Drawing on a canvas'), T('Récords compartidos', 'Shared high scores')],
    fields: [
      title('Serpiente', 'Snake'),
      { k: 'speed', label: T('Velocidad', 'Speed'), type: 'range', min: 1, max: 5, value: 3 },
      { k: 'food', label: T('Comida', 'Food'), type: 'choice', value: '🍎', options: [{ v: '🍎', label: '🍎' }, { v: '🍓', label: '🍓' }, { v: '⭐', label: '⭐' }, { v: '🧀', label: '🧀' }] },
      accent('#16a34a')
    ],
    files(l, v) {
      const X = (es, en) => (l === 'en' ? en : es);
      const tick = [200, 165, 135, 110, 85][Math.max(0, Math.min(4, Number(v.speed) - 1))] || 135;
      const TX = X(
        { start: 'Toca para empezar', over: 'Fin del juego', again: 'Jugar otra vez', score: 'Puntos', best: 'Récords', none: 'Aún no hay récords', record: ' hizo un récord: ' },
        { start: 'Tap to start', over: 'Game over', again: 'Play again', score: 'Score', best: 'High scores', none: 'No high scores yet', record: ' set a record: ' });
      return {
        'index.html': kit.page({ lang: l, title: v.title, body: String.raw`
  <main class="app">
    <header class="top">
      <div class="logo">🐍</div>
      <div class="grow"><h1>${kit.esc(v.title)}</h1><p>${TX.score}: <b id="score">0</b></p></div>
    </header>
    <div class="stage card">
      <canvas id="board" width="400" height="400"></canvas>
      <button id="overlay" class="overlay">${TX.start}</button>
    </div>
    <div class="pad">
      <span></span><button data-d="up" aria-label="up">▲</button><span></span>
      <button data-d="left" aria-label="left">◀</button><span></span><button data-d="right" aria-label="right">▶</button>
      <span></span><button data-d="down" aria-label="down">▼</button><span></span>
    </div>
    <p class="label">${TX.best}</p>
    <ul id="best" class="list"></ul>
  </main>` }),
        'style.css': kit.css(v.color, String.raw`
.stage { position: relative; padding: 8px; }
canvas { display: block; width: 100%; aspect-ratio: 1; border-radius: 10px; background: var(--bg); touch-action: none; }
.overlay { position: absolute; inset: 8px; border-radius: 10px; background: rgba(10, 12, 20, .55); color: #fff; font-size: 1.15rem; backdrop-filter: blur(2px); }
.overlay[hidden] { display: none; }
.pad { display: grid; grid-template-columns: repeat(3, 64px); gap: 6px; justify-content: center; }
.pad button { min-height: 52px; padding: 0; background: var(--card); color: var(--text); border: 1px solid var(--line); font-size: 1.1rem; }
#best li { display: flex; align-items: center; gap: 10px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 8px 12px; }
#best li b { margin-left: auto; font-variant-numeric: tabular-nums; }
#best li .n { width: 18px; color: var(--muted); font-weight: 700; }`),
        'app.js': String.raw`${X('/* Serpiente: una cuadrícula de 20 × 20 que avanza cada pocos milisegundos. */', '/* Snake: a 20 × 20 grid that moves every few milliseconds. */')}
const TX = ${kit.js(TX)};
const SIZE = 20;
const TICK = ${tick};
const FOOD = ${kit.js(v.food)};
${kit.helpers(l, ['$', 'me', 'avatar'])}

const canvas = $('board');
const ctx = canvas.getContext('2d');
const cell = canvas.width / SIZE;
const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
let snake, dir, nextDir, food, score, timer = null;
const best = {};

function reset() {
  snake = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
  dir = nextDir = { x: 1, y: 0 };
  score = 0;
  placeFood();
}

function placeFood() {
  do food = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) };
  while (snake.some((s) => s.x === food.x && s.y === food.y));
}

function step() {
  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  const hit = head.x < 0 || head.y < 0 || head.x >= SIZE || head.y >= SIZE || snake.some((s) => s.x === head.x && s.y === head.y);
  if (hit) return gameOver();
  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) { score++; placeFood(); navigator.vibrate && navigator.vibrate(15); }
  else snake.pop();
  draw();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = (cell * 0.9) + 'px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(FOOD, food.x * cell + cell / 2, food.y * cell + cell / 2 + 1);
  snake.forEach((s, i) => {
    ctx.globalAlpha = 1 - (i / snake.length) * 0.45;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(s.x * cell + 1, s.y * cell + 1, cell - 2, cell - 2, 5) : ctx.rect(s.x * cell + 1, s.y * cell + 1, cell - 2, cell - 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  $('score').textContent = score;
}

function start() {
  reset();
  draw();
  $('overlay').hidden = true;
  clearInterval(timer);
  timer = setInterval(step, TICK);
}

function gameOver() {
  clearInterval(timer);
  timer = null;
  $('overlay').textContent = TX.over + ' · ' + score + ' — ' + TX.again;
  $('overlay').hidden = false;
  const mine = best[me.addr];
  if (score > 0 && (!mine || score > mine.score)) {
    window.webxdc.sendUpdate({ payload: { addr: me.addr, name: me.name, score }, info: me.name + TX.record + score }, '');
  }
}

function turn(d) {
  const v = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }[d];
  if (!v || !timer) return;
  if (v.x === -dir.x && v.y === -dir.y) return;
  nextDir = v;
}

$('overlay').onclick = start;
document.querySelectorAll('.pad button').forEach((b) => { b.onclick = () => turn(b.dataset.d); });
document.addEventListener('keydown', (e) => {
  const d = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[e.key];
  if (d) { e.preventDefault(); turn(d); }
});
let touch = null;
canvas.addEventListener('pointerdown', (e) => { touch = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', (e) => {
  if (!touch) return;
  const dx = e.clientX - touch.x, dy = e.clientY - touch.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) > 20) turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  touch = null;
});

function renderBest() {
  const top = Object.values(best).sort((a, b) => b.score - a.score).slice(0, 5);
  $('best').innerHTML = top.length ? top.map((r, i) => '<li><span class="n">' + (i + 1) + '</span>' + avatar(r.name) + esc(r.name) + '<b>' + r.score + '</b></li>').join('')
    : '<li class="muted">' + TX.none + '</li>';
}

window.webxdc.setUpdateListener((update) => {
  const p = update.payload;
  if (!best[p.addr] || p.score > best[p.addr].score) best[p.addr] = p;
  renderBest();
});

reset();
draw();
renderBest();
`
      };
    }
  });
})();
