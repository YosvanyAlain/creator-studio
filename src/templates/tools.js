/* Templates: calculator and scoreboard. */
'use strict';
(function () {
  const TP = globalThis.CS.templates;
  const { T, kit } = TP;
  const title = (es, en) => ({ k: 'title', label: T('Nombre', 'Name'), type: 'text', value: T(es, en) });
  const accent = (c) => ({ k: 'color', label: T('Color', 'Color'), type: 'color', value: c });

  TP.add({
    id: 'calculator', cat: 'tools', icon: 'calc', tint: 'slate', peers: 1, level: 3,
    name: T('Calculadora', 'Calculator'),
    desc: T('Una calculadora elegante con historial y soporte de teclado. Calcula con prioridad de operaciones sin usar eval().', 'An elegant calculator with history and keyboard support. Respects operator precedence without using eval().'),
    learn: [T('Leer una expresión paso a paso', 'Reading an expression step by step'), T('Prioridad de operaciones', 'Operator precedence'), T('Guardar en el dispositivo', 'Saving on the device')],
    fields: [title('Calculadora', 'Calculator'), accent('#f59e0b')],
    files(l, v) {
      const X = (es, en) => (l === 'en' ? en : es);
      const TX = X({ history: 'Historial', none: 'Las operaciones aparecerán aquí', clear: 'Borrar', error: 'Error' }, { history: 'History', none: 'Your calculations will show up here', clear: 'Clear', error: 'Error' });
      const keys = [['C', 'fn'], ['⌫', 'fn'], ['%', 'fn'], ['÷', 'op'], ['7'], ['8'], ['9'], ['×', 'op'], ['4'], ['5'], ['6'], ['−', 'op'], ['1'], ['2'], ['3'], ['+', 'op'], ['0', 'wide'], ['.'], ['=', 'eq']];
      return {
        'index.html': kit.page({ lang: l, title: v.title, body: String.raw`
  <main class="app">
    <section class="screen card">
      <div id="expr" class="expr"></div>
      <div id="out" class="out">0</div>
    </section>
    <section class="keys">
${keys.map((k) => '      <button class="' + (k[1] || 'num') + '" data-k="' + k[0] + '">' + k[0] + '</button>').join('\n')}
    </section>
    <div class="row"><p class="label grow">${TX.history}</p><button id="wipe" class="ghost small">${TX.clear}</button></div>
    <ul id="history" class="list"></ul>
  </main>` }),
        'style.css': kit.css(v.color, String.raw`
.screen { text-align: right; padding: 18px 18px 14px; min-height: 120px; display: flex; flex-direction: column; justify-content: flex-end; }
.expr { color: var(--muted); min-height: 1.4em; overflow-wrap: anywhere; font-size: 1.05rem; }
.out { font-size: clamp(2.2rem, 12vw, 3.2rem); font-weight: 700; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; line-height: 1.15; }
.keys { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.keys button { min-height: 62px; font-size: 1.4rem; border-radius: 18px; padding: 0; }
.keys .num { background: var(--card); color: var(--text); border: 1px solid var(--line); }
.keys .fn { background: var(--accent-soft); color: var(--accent); }
.keys .op { background: var(--accent); }
.keys .eq { background: var(--text); color: var(--bg); }
.keys .wide { grid-column: span 2; background: var(--card); color: var(--text); border: 1px solid var(--line); }
#wipe { min-height: 34px; }
#history li { display: flex; justify-content: space-between; gap: 10px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 8px 12px; cursor: pointer; }
#history li b { font-variant-numeric: tabular-nums; }`),
        'app.js': String.raw`${X('/* Calculadora: separa la expresión en piezas y la resuelve respetando × y ÷ antes que + y −. */', '/* Calculator: splits the expression into tokens and solves × and ÷ before + and −. */')}
const TX = ${kit.js(TX)};
${kit.helpers(l, ['$', 'esc'])}

let expr = '';
let history = JSON.parse(localStorage.getItem('history') || '[]');
const OPS = { '+': [1, (a, b) => a + b], '−': [1, (a, b) => a - b], '×': [2, (a, b) => a * b], '÷': [2, (a, b) => a / b] };

function tokens(s) {
  const out = [];
  let num = '';
  for (const ch of s) {
    if ('0123456789.'.includes(ch)) num += ch;
    else {
      if (num) { out.push(parseFloat(num)); num = ''; }
      if (ch === '%') out.push(out.pop() / 100);
      else if (OPS[ch]) { if (ch === '−' && (!out.length || OPS[out[out.length - 1]])) num = '-'; else out.push(ch); }
    }
  }
  if (num && num !== '-') out.push(parseFloat(num));
  return out;
}

function solve(s) {
  const nums = [], ops = [];
  const run = () => { const b = nums.pop(), a = nums.pop(); nums.push(OPS[ops.pop()][1](a, b)); };
  for (const t of tokens(s)) {
    if (typeof t === 'number') nums.push(t);
    else { while (ops.length && OPS[ops[ops.length - 1]][0] >= OPS[t][0]) run(); ops.push(t); }
  }
  while (ops.length && nums.length > 1) run();
  const r = nums.length === 1 ? nums[0] : NaN;
  return Number.isFinite(r) ? Math.round(r * 1e10) / 1e10 : NaN;
}

const fmt = (n) => (Number.isNaN(n) ? TX.error : n.toLocaleString(undefined, { maximumFractionDigits: 10 }));

function show() {
  $('expr').textContent = expr;
  const r = solve(expr);
  $('out').textContent = expr ? (Number.isNaN(r) ? '…' : fmt(r)) : '0';
}

function press(k) {
  if (k === 'C') expr = '';
  else if (k === '⌫') expr = expr.slice(0, -1);
  else if (k === '=') {
    const r = solve(expr);
    if (Number.isNaN(r)) { $('out').textContent = TX.error; return; }
    history.unshift({ expr, r });
    history = history.slice(0, 12);
    localStorage.setItem('history', JSON.stringify(history));
    expr = String(r).replace('-', '−');
    renderHistory();
  } else {
    const last = expr.slice(-1);
    if (OPS[k] && OPS[last] && !(k === '−' && last !== '−')) expr = expr.slice(0, -1);
    if (k === '.' && /[\d]*\.[\d]*$/.test(expr.split(/[+−×÷]/).pop())) return;
    expr += k;
  }
  show();
}

function renderHistory() {
  $('history').innerHTML = history.length ? history.map((h, i) => '<li data-i="' + i + '"><span class="muted">' + esc(h.expr) + '</span><b>' + fmt(h.r) + '</b></li>').join('')
    : '<li class="muted">' + TX.none + '</li>';
  $('history').querySelectorAll('li[data-i]').forEach((li) => { li.onclick = () => { expr = history[li.dataset.i].expr; show(); }; });
}

document.querySelectorAll('.keys button').forEach((b) => { b.onclick = () => press(b.dataset.k); });
$('wipe').onclick = () => { history = []; localStorage.removeItem('history'); renderHistory(); };
document.addEventListener('keydown', (e) => {
  const map = { '*': '×', '/': '÷', '-': '−', Enter: '=', Backspace: '⌫', Escape: 'C', ',': '.' };
  const k = map[e.key] || e.key;
  if ('0123456789.+−×÷%=⌫C'.includes(k) && k.length === 1) { e.preventDefault(); press(k); }
});
show();
renderHistory();
`
      };
    }
  });

  TP.add({
    id: 'scoreboard', cat: 'tools', icon: 'trophy', tint: 'cyan', peers: 2, level: 1,
    name: T('Marcador', 'Scoreboard'),
    desc: T('Un marcador para partidos, juegos de mesa o concursos. Cualquiera del chat suma puntos y todos ven quién va ganando.', 'A scoreboard for matches, board games or quizzes. Anyone in the chat adds points and everyone sees who is winning.'),
    learn: [T('Sumar con actualizaciones', 'Adding up with updates'), T('Encontrar al líder', 'Finding the leader'), T('Reiniciar por rondas', 'Resetting by rounds')],
    fields: [
      title('Marcador', 'Scoreboard'),
      { k: 'teams', label: T('Equipos (uno por línea)', 'Teams (one per line)'), type: 'lines', value: T('🔴 Rojos\n🔵 Azules', '🔴 Reds\n🔵 Blues') },
      accent('#0891b2')
    ],
    files(l, v) {
      const X = (es, en) => (l === 'en' ? en : es);
      const teams = kit.lines(v.teams).slice(0, 6);
      if (teams.length < 2) teams.push(X('Equipo 2', 'Team 2'));
      const TX = X({ reset: 'Nueva partida', ask: '¿Poner todo a cero?', last: 'Último: ', leads: ' va ganando', tie: 'Empate', wins: ' gana con ' }, { reset: 'New game', ask: 'Reset every score?', last: 'Last: ', leads: ' is leading', tie: 'Tie', wins: ' wins with ' });
      return {
        'index.html': kit.page({ lang: l, title: v.title, body: String.raw`
  <main class="app">
    <header class="top">
      <div class="logo">🏆</div>
      <div class="grow"><h1>${kit.esc(v.title)}</h1><p id="status"></p></div>
    </header>
    <section id="teams" class="teams"></section>
    <p id="last" class="muted small center"></p>
    <button id="reset" class="ghost">${TX.reset}</button>
  </main>` }),
        'style.css': kit.css(v.color, String.raw`
.teams { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
.team { background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 14px; text-align: center; display: flex; flex-direction: column; gap: 8px; transition: .2s; }
.team.lead { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.team .name { font-weight: 700; overflow-wrap: anywhere; }
.team .pts { font-size: clamp(2.6rem, 14vw, 3.6rem); font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1; }
.team .pts.bump { animation: bump .3s; }
.team .row button { flex: 1; padding: 0; font-size: 1.2rem; }
@keyframes bump { 50% { transform: scale(1.18); color: var(--accent); } }`),
        'app.js': String.raw`${X('/* Marcador: cada actualización suma o resta puntos a un equipo. */', '/* Scoreboard: each update adds or removes points for a team. */')}
const TX = ${kit.js(TX)};
const TEAMS = ${kit.js(teams)};
${kit.helpers(l, ['$', 'me', 'esc'])}

let round = 0, scores = TEAMS.map(() => 0), last = null;

function apply(p) {
  if (p.type === 'reset' && p.round === round + 1) { round = p.round; scores = TEAMS.map(() => 0); last = null; }
  if (p.type === 'add' && p.round === round) { scores[p.team] = Math.max(0, scores[p.team] + p.delta); last = p; }
}

function render(bumped) {
  const top = Math.max.apply(null, scores);
  const leaders = scores.filter((s) => s === top).length;
  $('teams').innerHTML = TEAMS.map((name, i) => '<div class="team' + (top > 0 && scores[i] === top && leaders === 1 ? ' lead' : '') + '">' +
    '<div class="name">' + esc(name) + '</div><div class="pts' + (bumped === i ? ' bump' : '') + '">' + scores[i] + '</div>' +
    '<div class="row"><button class="soft" data-t="' + i + '" data-d="-1">−</button><button data-t="' + i + '" data-d="1">+</button></div></div>').join('');
  $('teams').querySelectorAll('button').forEach((b) => { b.onclick = () => add(Number(b.dataset.t), Number(b.dataset.d)); });
  $('status').textContent = top === 0 ? '' : leaders > 1 ? TX.tie : TEAMS[scores.indexOf(top)] + TX.leads;
  $('last').textContent = last ? TX.last + last.name + ' ' + (last.delta > 0 ? '+' : '−') + Math.abs(last.delta) + ' · ' + TEAMS[last.team] : '';
}

function add(team, delta) {
  if (delta < 0 && scores[team] === 0) return;
  window.webxdc.sendUpdate({ payload: { type: 'add', round, team, delta, name: me.name }, summary: TEAMS.map((n, i) => n + ' ' + (scores[i] + (i === team ? delta : 0))).join(' · ') }, '');
}

$('reset').onclick = () => {
  if (!confirm(TX.ask)) return;
  const top = Math.max.apply(null, scores);
  const info = top > 0 && scores.filter((s) => s === top).length === 1 ? TEAMS[scores.indexOf(top)] + TX.wins + top : '';
  window.webxdc.sendUpdate({ payload: { type: 'reset', round: round + 1 }, info }, '');
};

window.webxdc.setUpdateListener((update) => {
  apply(update.payload);
  render(update.payload.type === 'add' ? update.payload.team : -1);
});
render(-1);
`
      };
    }
  });
})();
