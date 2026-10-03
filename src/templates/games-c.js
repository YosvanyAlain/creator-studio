/* Templates: trivia and dice. */
'use strict';
(function () {
  const TP = globalThis.CS.templates;
  const { T, kit } = TP;
  const title = (es, en) => ({ k: 'title', label: T('Nombre', 'Name'), type: 'text', value: T(es, en) });
  const accent = (c) => ({ k: 'color', label: T('Color', 'Color'), type: 'color', value: c });

  TP.add({
    id: 'trivia', cat: 'games', icon: 'help', tint: 'blue', peers: 2, level: 2,
    name: T('Trivia', 'Trivia'),
    desc: T('Escribe tus propias preguntas y reta al chat. Cada persona responde en su pantalla y todos ven la tabla de puntos.', 'Write your own questions and challenge the chat. Everyone answers on their own screen and sees the points table.'),
    learn: [T('Datos en una lista', 'Data in a list'), T('Pantallas de una app', 'App screens'), T('Una tabla de puntos compartida', 'A shared points table')],
    fields: [
      title('Trivia del grupo', 'Group trivia'),
      { k: 'questions', label: T('Preguntas (pregunta | correcta | incorrectas…)', 'Questions (question | right | wrong…)'), type: 'lines', value: T(
        '¿Cuál es el planeta más grande? | Júpiter | Saturno | Tierra | Neptuno\n¿Cuántas patas tiene una araña? | 8 | 6 | 10 | 12\n¿Qué gas respiran las plantas? | Dióxido de carbono | Oxígeno | Helio | Hidrógeno\n¿En qué continente está Egipto? | África | Asia | Europa | Oceanía\n¿Cuántos minutos tiene una hora? | 60 | 100 | 30 | 90',
        'Which is the largest planet? | Jupiter | Saturn | Earth | Neptune\nHow many legs does a spider have? | 8 | 6 | 10 | 12\nWhich gas do plants take in? | Carbon dioxide | Oxygen | Helium | Hydrogen\nWhich continent is Egypt in? | Africa | Asia | Europe | Oceania\nHow many minutes are in an hour? | 60 | 100 | 30 | 90') },
      accent('#2f6fed')
    ],
    files(l, v) {
      const X = (es, en) => (l === 'en' ? en : es);
      const qs = kit.lines(v.questions).map((line) => line.split('|').map((x) => x.trim()).filter(Boolean)).filter((p) => p.length >= 3)
        .map((p) => ({ q: p[0], a: p[1], wrong: p.slice(2) }));
      const TX = X(
        { start: 'Empezar', of: ' de ', next: 'Siguiente', see: 'Ver resultado', right: '¡Correcto!', wrong: 'La respuesta era: ', done: 'Terminaste', pts: ' puntos', again: 'Jugar otra vez', table: 'Tabla de puntos', none: 'Aún nadie ha jugado', played: ' hizo ', intro: 'preguntas para todo el chat', empty: 'Añade preguntas en la personalización' },
        { start: 'Start', of: ' of ', next: 'Next', see: 'See result', right: 'Correct!', wrong: 'The answer was: ', done: 'You finished', pts: ' points', again: 'Play again', table: 'Points table', none: 'Nobody has played yet', played: ' scored ', intro: 'questions for the whole chat', empty: 'Add questions in the customization' });
      return {
        'index.html': kit.page({ lang: l, title: v.title, body: String.raw`
  <main class="app">
    <header class="top">
      <div class="logo">🧠</div>
      <div><h1>${kit.esc(v.title)}</h1><p id="sub"></p></div>
    </header>
    <section id="intro" class="card center">
      <div class="emoji">❓</div>
      <p id="count" class="muted"></p>
      <button id="start">${TX.start}</button>
    </section>
    <section id="play" class="card" hidden>
      <div class="bar"><i id="progress"></i></div>
      <p id="step" class="label"></p>
      <h2 id="question"></h2>
      <div id="options" class="options"></div>
      <p id="feedback" class="feedback"></p>
      <button id="next" hidden></button>
    </section>
    <section id="end" class="card center" hidden>
      <div class="emoji">🏆</div>
      <h2 id="final"></h2>
      <button id="again" class="soft">${TX.again}</button>
    </section>
    <p class="label">${TX.table}</p>
    <ul id="table" class="list"></ul>
  </main>` }),
        'style.css': kit.css(v.color, String.raw`
[hidden] { display: none !important; }
.emoji { font-size: 3rem; }
.bar { height: 6px; border-radius: 9px; background: var(--accent-soft); overflow: hidden; }
.bar i { display: block; height: 100%; width: 0; background: var(--accent); transition: width .3s; }
h2 { font-size: 1.2rem; margin: 6px 0 14px; }
.options { display: grid; gap: 8px; }
.options button { justify-content: flex-start; text-align: left; background: var(--bg); color: var(--text); border: 1px solid var(--line); padding: 10px 14px; }
.options button.right { background: #13a86622; border-color: #13a866; color: inherit; }
.options button.wrong { background: #e5484d22; border-color: #e5484d; }
.feedback { min-height: 1.4em; font-weight: 650; margin: 10px 0; }
#next { width: 100%; }
#table li { display: flex; align-items: center; gap: 10px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 8px 12px; }
#table li b { margin-left: auto; }`),
        'app.js': String.raw`${X('/* Trivia: las preguntas están en QUESTIONS; cambia la lista para hacer tu propio juego. */', '/* Trivia: the questions live in QUESTIONS; change the list to make your own game. */')}
const TX = ${kit.js(TX)};
const QUESTIONS = ${kit.js(qs)};
${kit.helpers(l, ['$', 'me', 'avatar'])}

let index = 0, score = 0;
const table = {};

const shuffle = (list) => list.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
const show = (id) => ['intro', 'play', 'end'].forEach((s) => { $(s).hidden = s !== id; });

$('sub').textContent = QUESTIONS.length + ' ' + TX.intro;
$('count').textContent = QUESTIONS.length ? QUESTIONS.length + ' ' + TX.intro : TX.empty;
$('start').disabled = !QUESTIONS.length;

function ask() {
  const item = QUESTIONS[index];
  $('step').textContent = (index + 1) + TX.of + QUESTIONS.length;
  $('progress').style.width = (index / QUESTIONS.length * 100) + '%';
  $('question').textContent = item.q;
  $('feedback').textContent = '';
  $('next').hidden = true;
  $('options').innerHTML = '';
  shuffle([item.a].concat(item.wrong)).forEach((text) => {
    const b = document.createElement('button');
    b.textContent = text;
    b.onclick = () => answer(b, text === item.a);
    $('options').appendChild(b);
  });
}

function answer(button, ok) {
  const item = QUESTIONS[index];
  $('options').querySelectorAll('button').forEach((b) => {
    b.disabled = true;
    if (b.textContent === item.a) b.classList.add('right');
  });
  if (ok) score++; else button.classList.add('wrong');
  $('feedback').textContent = ok ? TX.right : TX.wrong + item.a;
  $('next').textContent = index + 1 < QUESTIONS.length ? TX.next : TX.see;
  $('next').hidden = false;
}

$('next').onclick = () => {
  index++;
  if (index < QUESTIONS.length) return ask();
  $('progress').style.width = '100%';
  $('final').textContent = TX.done + ': ' + score + ' / ' + QUESTIONS.length;
  show('end');
  window.webxdc.sendUpdate({ payload: { addr: me.addr, name: me.name, score, total: QUESTIONS.length }, info: me.name + TX.played + score + '/' + QUESTIONS.length }, '');
};

function begin() { index = 0; score = 0; show('play'); ask(); }
$('start').onclick = begin;
$('again').onclick = begin;

function render() {
  const rows = Object.values(table).sort((a, b) => b.score - a.score);
  $('table').innerHTML = rows.length ? rows.map((r) => '<li>' + avatar(r.name) + esc(r.name) + '<b>' + r.score + ' / ' + r.total + '</b></li>').join('')
    : '<li class="muted">' + TX.none + '</li>';
}

window.webxdc.setUpdateListener((update) => {
  const p = update.payload;
  if (!table[p.addr] || p.score >= table[p.addr].score) table[p.addr] = p;
  render();
});
render();
`
      };
    }
  });

  TP.add({
    id: 'dice', cat: 'games', icon: 'dice', tint: 'red', peers: 2, level: 1,
    name: T('Dados', 'Dice'),
    desc: T('Tira dados que todo el chat ve a la vez, con el historial de quién sacó qué. Perfecto para juegos de mesa a distancia.', 'Roll dice the whole chat sees at once, with a history of who rolled what. Perfect for remote board games.'),
    learn: [T('Números al azar', 'Random numbers'), T('Animar solo lo que llega en directo', 'Animating only live updates'), T('Un historial compartido', 'A shared history')],
    fields: [
      title('Dados', 'Dice'),
      { k: 'count', label: T('Cantidad de dados', 'Number of dice'), type: 'range', min: 1, max: 5, value: 2 },
      { k: 'sides', label: T('Caras', 'Sides'), type: 'choice', value: '6', options: [{ v: '6', label: '6' }, { v: '10', label: '10' }, { v: '12', label: '12' }, { v: '20', label: '20' }] },
      accent('#e5484d')
    ],
    files(l, v) {
      const X = (es, en) => (l === 'en' ? en : es);
      const TX = X(
        { roll: 'Tirar', rolled: ' sacó ', total: 'Total', history: 'Historial', none: 'Nadie ha tirado todavía', you: 'Tú' },
        { roll: 'Roll', rolled: ' rolled ', total: 'Total', history: 'History', none: 'Nobody has rolled yet', you: 'You' });
      return {
        'index.html': kit.page({ lang: l, title: v.title, body: String.raw`
  <main class="app">
    <header class="top">
      <div class="logo">🎲</div>
      <div><h1>${kit.esc(v.title)}</h1><p>${Math.max(1, Math.min(5, Number(v.count) || 2))} × d${kit.esc(v.sides)}</p></div>
    </header>
    <section class="card center table">
      <div id="dice" class="dice"></div>
      <p id="last" class="muted"></p>
      <button id="roll">🎲 ${TX.roll}</button>
    </section>
    <p class="label">${TX.history}</p>
    <ul id="history" class="list"></ul>
  </main>` }),
        'style.css': kit.css(v.color, String.raw`
.table { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 22px 16px; }
.dice { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; min-height: 72px; }
.die { width: 64px; height: 64px; border-radius: 16px; background: #fff; color: #1b1e2e; box-shadow: inset 0 -4px 0 rgba(0, 0, 0, .12), 0 6px 14px rgba(0, 0, 0, .14);
  display: grid; place-items: center; font-size: 1.7rem; font-weight: 800; }
.die.pips { grid-template: repeat(3, 1fr) / repeat(3, 1fr); padding: 9px; place-items: center; }
.die.pips span { display: grid; place-items: center; width: 100%; height: 100%; }
.die.pips i { display: block; width: 11px; height: 11px; border-radius: 50%; background: var(--accent); }
.die.spin { animation: spin .55s ease-out; }
@keyframes spin { 0% { transform: rotate(-200deg) scale(.6); } 70% { transform: rotate(12deg) scale(1.08); } 100% { transform: none; } }
#roll { width: 100%; font-size: 1.15rem; }
#history li { display: flex; align-items: center; gap: 10px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 8px 12px; }
#history li .vals { margin-left: auto; font-variant-numeric: tabular-nums; color: var(--muted); }
#history li b { min-width: 28px; text-align: right; }`),
        'app.js': String.raw`${X('/* Dados: quien tira elige los números y los envía; todos ven el mismo resultado. */', '/* Dice: whoever rolls picks the numbers and sends them; everyone sees the same result. */')}
const TX = ${kit.js(TX)};
const COUNT = ${Math.max(1, Math.min(5, Number(v.count) || 2))};
const SIDES = ${Number(v.sides) || 6};
${kit.helpers(l, ['$', 'me', 'avatar'])}

const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const history = [];
let live = false;

function die(n, spin) {
  const d = document.createElement('div');
  if (SIDES === 6) {
    d.className = 'die pips';
    for (let i = 0; i < 9; i++) { const c = document.createElement('span'); if (PIPS[n].includes(i)) c.appendChild(document.createElement('i')); d.appendChild(c); }
  } else {
    d.className = 'die';
    d.textContent = n;
  }
  if (spin) d.classList.add('spin');
  return d;
}

function showRoll(r, spin) {
  $('dice').innerHTML = '';
  r.values.forEach((n) => $('dice').appendChild(die(n, spin)));
  const total = r.values.reduce((a, b) => a + b, 0);
  $('last').textContent = (r.addr === me.addr ? TX.you : r.name) + ' · ' + TX.total + ' ' + total;
  if (spin && navigator.vibrate) navigator.vibrate(30);
}

function render() {
  $('history').innerHTML = history.length ? history.slice(-15).reverse().map((r) =>
    '<li>' + avatar(r.name) + esc(r.name) + '<span class="vals">' + r.values.join(' · ') + '</span><b>' + r.values.reduce((a, b) => a + b, 0) + '</b></li>').join('')
    : '<li class="muted">' + TX.none + '</li>';
}

$('roll').onclick = () => {
  const values = Array.from({ length: COUNT }, () => 1 + Math.floor(Math.random() * SIDES));
  window.webxdc.sendUpdate({ payload: { addr: me.addr, name: me.name, values }, info: me.name + TX.rolled + values.join(' + '), summary: me.name + ': ' + values.join(' + ') }, '');
};

window.webxdc.setUpdateListener((update) => {
  history.push(update.payload);
  showRoll(update.payload, live);
  render();
}).then(() => { live = true; });

showRoll({ values: Array(COUNT).fill(SIDES === 6 ? 6 : SIDES), name: '', addr: '' }, false);
$('last').textContent = '';
render();
`
      };
    }
  });
})();
