/* Templates: shared expenses, shopping list and event. */
'use strict';
(function () {
  const TP = globalThis.CS.templates;
  const { T, kit } = TP;
  const title = (es, en) => ({ k: 'title', label: T('Nombre', 'Name'), type: 'text', value: T(es, en) });
  const accent = (c) => ({ k: 'color', label: T('Color', 'Color'), type: 'color', value: c });

  TP.add({
    id: 'split', cat: 'group', icon: 'wallet', tint: 'green', peers: 2, level: 3,
    name: T('Gastos compartidos', 'Shared expenses'),
    desc: T('Apunta quién pagó qué en un viaje o una cena. La app reparte a partes iguales y dice quién debe pagar a quién.', 'Log who paid what on a trip or a dinner. The app splits it evenly and tells who should pay whom.'),
    learn: [T('Sumar y repartir', 'Adding up and splitting'), T('Saldos de cada persona', 'Each person’s balance'), T('Formatear dinero', 'Formatting money')],
    fields: [
      title('Gastos del viaje', 'Trip expenses'),
      { k: 'currency', label: T('Moneda', 'Currency'), type: 'text', value: '$' },
      accent('#12a46a')
    ],
    files(l, v) {
      const X = (es, en) => (l === 'en' ? en : es);
      const TX = X(
        { what: '¿En qué?', amount: 'Importe', add: 'Añadir', join: 'Unirme al grupo', total: 'Total', each: 'Por persona', balances: 'Saldos', settle: 'Para quedar en paz', expenses: 'Gastos', none: 'Todavía no hay gastos', even: 'Todo está en paz 🎉', pays: ' paga a ', paid: ' pagó ', del: 'Borrar', people: ' personas', added: ' añadió un gasto: ' },
        { what: 'What for?', amount: 'Amount', add: 'Add', join: 'Join the group', total: 'Total', each: 'Per person', balances: 'Balances', settle: 'To settle up', expenses: 'Expenses', none: 'No expenses yet', even: 'All settled 🎉', pays: ' pays ', paid: ' paid ', del: 'Delete', people: ' people', added: ' added an expense: ' });
      return {
        'index.html': kit.page({ lang: l, title: v.title, body: String.raw`
  <main class="app">
    <header class="top">
      <div class="logo">💸</div>
      <div><h1>${kit.esc(v.title)}</h1><p id="people"></p></div>
    </header>
    <section class="stats">
      <div class="card"><span class="label">${TX.total}</span><b id="total">0</b></div>
      <div class="card"><span class="label">${TX.each}</span><b id="each">0</b></div>
    </section>
    <form id="form" class="card add">
      <input id="what" placeholder="${TX.what}" maxlength="60" autocomplete="off">
      <div class="row"><input id="amount" type="number" inputmode="decimal" min="0" step="0.01" placeholder="${TX.amount}"><button>${TX.add}</button></div>
    </form>
    <button id="join" class="soft" hidden>${TX.join}</button>
    <p class="label">${TX.settle}</p>
    <ul id="settle" class="list"></ul>
    <p class="label">${TX.balances}</p>
    <ul id="balances" class="list"></ul>
    <p class="label">${TX.expenses}</p>
    <ul id="expenses" class="list"></ul>
  </main>` }),
        'style.css': kit.css(v.color, String.raw`
[hidden] { display: none !important; }
.stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.stats .card { padding: 12px 14px; }
.stats b { display: block; font-size: 1.5rem; font-variant-numeric: tabular-nums; }
.add { display: flex; flex-direction: column; gap: 8px; padding: 12px; }
.list li { display: flex; align-items: center; gap: 10px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 9px 12px; }
.list li .grow { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.list li b { font-variant-numeric: tabular-nums; }
.pos { color: var(--ok); }
.neg { color: var(--bad); }
.list li button { min-height: 32px; padding: 0 8px; font-size: .85rem; }`),
        'app.js': String.raw`${X('/* Gastos: saldo = lo que pagaste − tu parte. Los saldos negativos pagan a los positivos. */', '/* Expenses: balance = what you paid − your share. Negative balances pay positive ones. */')}
const TX = ${kit.js(TX)};
const CUR = ${kit.js(String(v.currency || '$').slice(0, 4))};
${kit.helpers(l, ['$', 'me', 'avatar', 'uid'])}

const people = new Map();
const expenses = new Map();
const money = (n) => CUR + ' ' + (Math.round(n * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function apply(p) {
  people.set(p.addr, p.name);
  if (p.type === 'add') expenses.set(p.id, p);
  if (p.type === 'delete' && expenses.has(p.id) && expenses.get(p.id).addr === p.addr) expenses.delete(p.id);
}

function balances() {
  const total = Array.from(expenses.values()).reduce((s, e) => s + e.amount, 0);
  const share = people.size ? total / people.size : 0;
  const bal = new Map(Array.from(people.keys(), (a) => [a, -share]));
  expenses.forEach((e) => bal.set(e.addr, bal.get(e.addr) + e.amount));
  return { total, share, bal };
}

${X('/* Empareja a quien más debe con quien más tiene que recibir. */', '/* Match whoever owes most with whoever is owed most. */')}
function settle(bal) {
  const debt = [], cred = [], out = [];
  bal.forEach((v, a) => { if (v < -0.005) debt.push({ a, v: -v }); else if (v > 0.005) cred.push({ a, v }); });
  debt.sort((x, y) => y.v - x.v); cred.sort((x, y) => y.v - x.v);
  let i = 0, j = 0;
  while (i < debt.length && j < cred.length) {
    const pay = Math.min(debt[i].v, cred[j].v);
    out.push({ from: debt[i].a, to: cred[j].a, amount: pay });
    debt[i].v -= pay; cred[j].v -= pay;
    if (debt[i].v < 0.005) i++;
    if (cred[j].v < 0.005) j++;
  }
  return out;
}

function render() {
  const { total, share, bal } = balances();
  $('people').textContent = people.size + TX.people;
  $('total').textContent = money(total);
  $('each').textContent = money(share);
  $('join').hidden = people.has(me.addr);
  const moves = settle(bal);
  $('settle').innerHTML = moves.length ? moves.map((m) => '<li>' + avatar(people.get(m.from)) + '<span class="grow">' + esc(people.get(m.from)) + TX.pays + esc(people.get(m.to)) + '</span><b>' + money(m.amount) + '</b></li>').join('')
    : '<li class="muted">' + (expenses.size ? TX.even : TX.none) + '</li>';
  $('balances').innerHTML = Array.from(bal, ([a, v]) => '<li>' + avatar(people.get(a)) + '<span class="grow">' + esc(people.get(a)) + '</span><b class="' + (v >= 0 ? 'pos' : 'neg') + '">' + (v >= 0 ? '+' : '−') + money(Math.abs(v)) + '</b></li>').join('');
  $('expenses').innerHTML = '';
  Array.from(expenses.values()).reverse().forEach((e) => {
    const li = document.createElement('li');
    li.innerHTML = avatar(e.name) + '<span class="grow">' + esc(e.what) + '<br><span class="muted small">' + esc(e.name) + TX.paid + '</span></span><b>' + money(e.amount) + '</b>' +
      (e.addr === me.addr ? '<button class="danger">' + TX.del + '</button>' : '');
    const del = li.querySelector('button');
    if (del) del.onclick = () => window.webxdc.sendUpdate({ payload: { type: 'delete', id: e.id, addr: me.addr, name: me.name } }, '');
    $('expenses').appendChild(li);
  });
}

$('form').addEventListener('submit', (event) => {
  event.preventDefault();
  const what = $('what').value.trim();
  const amount = Math.round(parseFloat($('amount').value) * 100) / 100;
  if (!what || !(amount > 0)) return;
  window.webxdc.sendUpdate({ payload: { type: 'add', id: uid(), addr: me.addr, name: me.name, what, amount }, info: me.name + TX.added + what + ' (' + money(amount) + ')' }, '');
  $('what').value = ''; $('amount').value = '';
});
$('join').onclick = () => window.webxdc.sendUpdate({ payload: { type: 'join', addr: me.addr, name: me.name } }, '');

window.webxdc.setUpdateListener((update) => { apply(update.payload); render(); });
render();
`
      };
    }
  });

  TP.add({
    id: 'shopping', cat: 'group', icon: 'cart', tint: 'orange', peers: 2, level: 1,
    name: T('Lista de compras', 'Shopping list'),
    desc: T('Una lista que toda la familia o el grupo rellena y va marcando en la tienda. Cada cosa muestra quién la añadió.', 'A list the whole family or group fills in and ticks off at the shop. Every item shows who added it.'),
    learn: [T('Añadir, marcar y quitar', 'Add, tick and remove'), T('Contar lo que falta', 'Counting what’s left'), T('Datos de partida', 'Starting data')],
    fields: [
      title('Lista de compras', 'Shopping list'),
      { k: 'items', label: T('Para empezar (una por línea)', 'To start with (one per line)'), type: 'lines', value: T('🥛 Leche\n🍞 Pan\n🍌 Plátanos', '🥛 Milk\n🍞 Bread\n🍌 Bananas') },
      accent('#f06a14')
    ],
    files(l, v) {
      const X = (es, en) => (l === 'en' ? en : es);
      const TX = X(
        { add: 'Añadir algo…', of: ' de ', got: ' comprado', clear: 'Quitar lo comprado', empty: 'La lista está vacía', added: ' añadió ', start: 'Lista' },
        { add: 'Add something…', of: ' of ', got: ' bought', clear: 'Remove bought items', empty: 'The list is empty', added: ' added ', start: 'List' });
      return {
        'index.html': kit.page({ lang: l, title: v.title, body: String.raw`
  <main class="app">
    <header class="top">
      <div class="logo">🛒</div>
      <div class="grow"><h1>${kit.esc(v.title)}</h1><p id="count"></p></div>
    </header>
    <div class="bar"><i id="progress"></i></div>
    <form id="form" class="row">
      <input id="text" class="grow" placeholder="${TX.add}" maxlength="80" autocomplete="off">
      <button class="icon" aria-label="+">＋</button>
    </form>
    <ul id="items" class="list"></ul>
    <button id="clear" class="ghost">${TX.clear}</button>
  </main>` }),
        'style.css': kit.css(v.color, String.raw`
.bar { height: 8px; border-radius: 9px; background: var(--accent-soft); overflow: hidden; }
.bar i { display: block; height: 100%; width: 0; background: var(--accent); transition: width .35s; }
.item { display: flex; align-items: center; gap: 12px; background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 8px 8px 8px 12px; }
.item .tick { width: 28px; height: 28px; min-height: 0; padding: 0; border-radius: 50%; background: transparent; border: 2px solid var(--line); color: #fff; font-size: .9rem; }
.item.done .tick { background: var(--accent); border-color: var(--accent); }
.item .text { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.item.done .text { text-decoration: line-through; color: var(--muted); }
.item .by { font-size: .75rem; color: var(--muted); display: block; }
.item .x { width: 34px; min-height: 34px; padding: 0; background: transparent; color: var(--muted); font-size: 1.1rem; }
[hidden] { display: none !important; }`),
        'app.js': String.raw`${X('/* Lista de compras: los primeros elementos vienen de START; el resto llega por actualizaciones. */', '/* Shopping list: the first items come from START; the rest arrive as updates. */')}
const TX = ${kit.js(TX)};
const START = ${kit.js(kit.lines(v.items).slice(0, 30))};
${kit.helpers(l, ['$', 'me', 'esc', 'uid'])}

const items = new Map(START.map((text, i) => ['start-' + i, { id: 'start-' + i, text, by: '', done: false }]));

function apply(p) {
  if (p.type === 'add') items.set(p.id, { id: p.id, text: p.text, by: p.name, done: false });
  const it = items.get(p.id);
  if (p.type === 'tick' && it) it.done = p.done;
  if (p.type === 'remove') p.ids.forEach((id) => items.delete(id));
}

function render() {
  const all = Array.from(items.values());
  const done = all.filter((x) => x.done).length;
  $('count').textContent = done + TX.of + all.length + TX.got;
  $('progress').style.width = (all.length ? (done / all.length) * 100 : 0) + '%';
  $('clear').hidden = !done;
  $('items').innerHTML = all.length ? '' : '<li class="empty"><b>🧺</b>' + TX.empty + '</li>';
  all.sort((a, b) => a.done - b.done).forEach((it) => {
    const li = document.createElement('li');
    li.className = 'item' + (it.done ? ' done' : '');
    li.innerHTML = '<button class="tick" aria-label="✓">' + (it.done ? '✓' : '') + '</button><span class="text">' + esc(it.text) +
      (it.by ? '<span class="by">' + esc(it.by) + '</span>' : '') + '</span><button class="x" aria-label="×">×</button>';
    li.querySelector('.tick').onclick = () => window.webxdc.sendUpdate({ payload: { type: 'tick', id: it.id, done: !it.done } }, '');
    li.querySelector('.x').onclick = () => window.webxdc.sendUpdate({ payload: { type: 'remove', ids: [it.id] } }, '');
    $('items').appendChild(li);
  });
}

$('form').addEventListener('submit', (event) => {
  event.preventDefault();
  const text = $('text').value.trim();
  if (!text) return;
  window.webxdc.sendUpdate({ payload: { type: 'add', id: uid(), text, name: me.name }, info: me.name + TX.added + text, summary: TX.start + ': ' + (items.size + 1) }, '');
  $('text').value = '';
});
$('clear').onclick = () => {
  const ids = Array.from(items.values()).filter((x) => x.done).map((x) => x.id);
  if (ids.length) window.webxdc.sendUpdate({ payload: { type: 'remove', ids } }, '');
};

window.webxdc.setUpdateListener((update) => { apply(update.payload); render(); });
render();
`
      };
    }
  });

  TP.add({
    id: 'event', cat: 'group', icon: 'calendar', tint: 'pink', peers: 2, level: 1,
    name: T('Evento', 'Event'),
    desc: T('Organiza un cumpleaños, una reunión o un partido: cada persona responde si va, y puede dejar una nota como “llevo la tarta”.', 'Plan a birthday, a meeting or a match: everyone says if they’re coming and can add a note like “I’ll bring the cake”.'),
    learn: [T('Una respuesta por persona', 'One answer per person'), T('Agrupar por estado', 'Grouping by status'), T('Notas opcionales', 'Optional notes')],
    fields: [
      title('Cumpleaños de Laura', 'Laura’s birthday'),
      { k: 'when', label: T('Cuándo', 'When'), type: 'text', value: T('Sábado, 18:00', 'Saturday, 6 pm') },
      { k: 'where', label: T('Dónde', 'Where'), type: 'text', value: T('En casa de Laura', 'At Laura’s place') },
      accent('#e0457b')
    ],
    files(l, v) {
      const X = (es, en) => (l === 'en' ? en : es);
      const TX = X(
        { yes: 'Voy', maybe: 'Quizás', no: 'No puedo', note: 'Nota opcional (p. ej., llevo hielo)', answered: ' respondió: ', you: 'Tu respuesta', nobody: 'Nadie todavía', going: ' van', going1: ' va' },
        { yes: 'Going', maybe: 'Maybe', no: 'Can’t go', note: 'Optional note (e.g. I’ll bring ice)', answered: ' answered: ', you: 'Your answer', nobody: 'Nobody yet', going: ' going', going1: ' going' });
      return {
        'index.html': kit.page({ lang: l, title: v.title, body: String.raw`
  <main class="app">
    <section class="card hero">
      <div class="date">🎉</div>
      <h1>${kit.esc(v.title)}</h1>
      <p>🗓️ ${kit.esc(v.when)}</p>
      <p>📍 ${kit.esc(v.where)}</p>
      <p id="going" class="chip"></p>
    </section>
    <p class="label">${TX.you}</p>
    <div class="answers">
      <button data-a="yes">✅ ${TX.yes}</button>
      <button data-a="maybe">🤔 ${TX.maybe}</button>
      <button data-a="no">❌ ${TX.no}</button>
    </div>
    <input id="note" maxlength="80" placeholder="${TX.note}">
    <section id="groups" class="groups"></section>
  </main>` }),
        'style.css': kit.css(v.color, String.raw`
.hero { text-align: center; padding: 22px 16px; background: linear-gradient(160deg, var(--accent-soft), var(--card) 70%); }
.hero .date { font-size: 2.6rem; }
.hero h1 { margin: 6px 0 8px; font-size: 1.45rem; }
.hero p { margin: 4px 0; }
.answers { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.answers button { background: var(--card); color: var(--text); border: 1px solid var(--line); padding: 0 6px; font-size: .92rem; }
.answers button.on { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
.groups { display: flex; flex-direction: column; gap: 10px; }
.group h3 { font-size: .85rem; margin: 0 0 6px; color: var(--muted); }
.person { display: flex; align-items: center; gap: 10px; padding: 6px 0; }
.person small { display: block; color: var(--muted); }`),
        'app.js': String.raw`${X('/* Evento: guardamos la última respuesta de cada persona y la agrupamos. */', '/* Event: we keep each person’s latest answer and group them. */')}
const TX = ${kit.js(TX)};
const LABEL = { yes: '✅ ' + TX.yes, maybe: '🤔 ' + TX.maybe, no: '❌ ' + TX.no };
${kit.helpers(l, ['$', 'me', 'avatar'])}

const answers = new Map();

function render() {
  const mine = answers.get(me.addr);
  document.querySelectorAll('.answers button').forEach((b) => b.classList.toggle('on', !!mine && mine.answer === b.dataset.a));
  if (mine && document.activeElement !== $('note')) $('note').value = mine.note || '';
  const all = Array.from(answers.values());
  const n = all.filter((x) => x.answer === 'yes').length;
  $('going').textContent = n + (n === 1 ? TX.going1 : TX.going);
  $('groups').innerHTML = ['yes', 'maybe', 'no'].map((k) => {
    const people = all.filter((x) => x.answer === k);
    return '<div class="card group"><h3>' + LABEL[k] + ' · ' + people.length + '</h3>' + (people.length ? people.map((p) =>
      '<div class="person">' + avatar(p.name) + '<div>' + esc(p.name) + (p.note ? '<small>' + esc(p.note) + '</small>' : '') + '</div></div>').join('')
      : '<p class="muted small">' + TX.nobody + '</p>') + '</div>';
  }).join('');
}

function send(answer) {
  const note = $('note').value.trim();
  const prev = answers.get(me.addr);
  const info = !prev || prev.answer !== answer ? me.name + TX.answered + LABEL[answer] : '';
  window.webxdc.sendUpdate({ payload: { addr: me.addr, name: me.name, answer, note }, info }, '');
}

document.querySelectorAll('.answers button').forEach((b) => { b.onclick = () => send(b.dataset.a); });
$('note').addEventListener('change', () => { const mine = answers.get(me.addr); if (mine) send(mine.answer); });

window.webxdc.setUpdateListener((update) => { answers.set(update.payload.addr, update.payload); render(); });
render();
`
      };
    }
  });
})();
