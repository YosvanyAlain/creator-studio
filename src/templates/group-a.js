/* Templates: poll, message board and raffle. */
'use strict';
(function () {
  const TP = globalThis.CS.templates;
  const { T, kit } = TP;
  const title = (es, en) => ({ k: 'title', label: T('Nombre', 'Name'), type: 'text', value: T(es, en) });
  const accent = (c) => ({ k: 'color', label: T('Color', 'Color'), type: 'color', value: c });

  TP.add({
    id: 'poll', cat: 'group', icon: 'chart', tint: 'teal', peers: 2, level: 1,
    name: T('Encuesta', 'Poll'),
    desc: T('Una pregunta, varias opciones y resultados en directo. Cada persona vota una vez y puede cambiar de idea.', 'One question, several options and live results. Everyone votes once and can change their mind.'),
    learn: [T('El último voto de cada persona cuenta', 'Each person’s latest vote counts'), T('Barras de porcentaje', 'Percentage bars'), T('Quién votó qué', 'Who voted what')],
    fields: [
      { k: 'title', label: T('Pregunta', 'Question'), type: 'text', value: T('¿Qué hacemos el sábado?', 'What shall we do on Saturday?') },
      { k: 'options', label: T('Opciones (una por línea)', 'Options (one per line)'), type: 'lines', value: T('🏖️ Playa\n🎬 Cine\n🍕 Pizza en casa\n🥾 Excursión', '🏖️ Beach\n🎬 Movies\n🍕 Pizza at home\n🥾 Hiking') },
      accent('#0f9f8f')
    ],
    files(l, v) {
      const X = (es, en) => (l === 'en' ? en : es);
      const opts = kit.lines(v.options).slice(0, 12);
      const TX = X(
        { votes: ' votos', vote1: ' voto', people: 'Votaron: ', none: 'Toca una opción para votar', mine: 'Tu voto', change: 'Puedes cambiarlo cuando quieras', voted: ' votó' },
        { votes: ' votes', vote1: ' vote', people: 'Voted: ', none: 'Tap an option to vote', mine: 'Your vote', change: 'You can change it anytime', voted: ' voted' });
      return {
        'index.html': kit.page({ lang: l, title: v.title, body: String.raw`
  <main class="app">
    <header class="top">
      <div class="logo">📊</div>
      <div><h1>${kit.esc(v.title)}</h1><p id="total"></p></div>
    </header>
    <section id="options" class="options"></section>
    <p id="hint" class="muted small center"></p>
  </main>` }),
        'style.css': kit.css(v.color, String.raw`
.options { display: flex; flex-direction: column; gap: 10px; }
.opt { position: relative; overflow: hidden; display: block; width: 100%; text-align: left; padding: 14px 16px; min-height: 58px;
  background: var(--card); color: var(--text); border: 1px solid var(--line); border-radius: 16px; }
.opt .fill { position: absolute; inset: 0 auto 0 0; width: 0; background: var(--accent-soft); transition: width .45s cubic-bezier(.2, .8, .2, 1); }
.opt .line { position: relative; display: flex; align-items: center; gap: 10px; }
.opt .name { flex: 1; min-width: 0; font-weight: 650; }
.opt .pct { font-weight: 800; font-variant-numeric: tabular-nums; }
.opt .who { position: relative; display: flex; margin-top: 8px; min-height: 0; }
.opt .who .avatar { width: 22px; height: 22px; font-size: .65rem; margin-right: -6px; border: 2px solid var(--card); }
.opt.mine { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.opt.mine .name::after { content: ' ✓'; color: var(--accent); }`),
        'app.js': String.raw`${X('/* Encuesta: guardamos el último voto de cada persona, así nadie vota dos veces. */', '/* Poll: we keep each person’s latest vote, so nobody votes twice. */')}
const TX = ${kit.js(TX)};
const OPTIONS = ${kit.js(opts)};
${kit.helpers(l, ['$', 'me', 'avatar'])}

const votes = {};

function render() {
  const all = Object.values(votes);
  const n = all.length;
  $('total').textContent = n + (n === 1 ? TX.vote1 : TX.votes);
  $('hint').textContent = votes[me.addr] ? TX.change : TX.none;
  $('options').innerHTML = '';
  OPTIONS.forEach((text, i) => {
    const people = all.filter((x) => x.option === i);
    const pct = n ? Math.round((people.length / n) * 100) : 0;
    const b = document.createElement('button');
    b.className = 'opt' + (votes[me.addr] && votes[me.addr].option === i ? ' mine' : '');
    b.innerHTML = '<span class="fill" style="width:' + pct + '%"></span>' +
      '<span class="line"><span class="name">' + esc(text) + '</span><span class="pct">' + pct + '%</span></span>' +
      (people.length ? '<span class="who">' + people.slice(0, 12).map((p) => avatar(p.name)).join('') + '</span>' : '');
    b.onclick = () => vote(i);
    $('options').appendChild(b);
  });
}

function vote(option) {
  if (votes[me.addr] && votes[me.addr].option === option) return;
  const first = !votes[me.addr];
  window.webxdc.sendUpdate({ payload: { addr: me.addr, name: me.name, option }, info: first ? me.name + TX.voted : '', summary: '' }, '');
}

window.webxdc.setUpdateListener((update) => {
  const p = update.payload;
  votes[p.addr] = p;
  render();
});
render();
`
      };
    }
  });

  TP.add({
    id: 'board', cat: 'group', icon: 'chat', tint: 'blue', peers: 2, level: 2,
    name: T('Muro de mensajes', 'Message board'),
    desc: T('Un tablón para dejar avisos, ideas o recuerdos. Con “me gusta”, hora de cada mensaje y opción de borrar los tuyos.', 'A board for notices, ideas or memories. With likes, the time of every post and the option to delete your own.'),
    learn: [T('Varios tipos de actualización', 'Several update types'), T('Identificar cada mensaje', 'Identifying each message'), T('Borrar sin perder la historia', 'Deleting without losing history')],
    fields: [title('Muro del grupo', 'Group board'), accent('#3366ff')],
    files(l, v) {
      const X = (es, en) => (l === 'en' ? en : es);
      const TX = X(
        { write: 'Escribe un mensaje…', post: 'Publicar', none: 'Sé la primera persona en escribir', del: 'Borrar', posted: ' publicó en el muro', count: ' mensajes' },
        { write: 'Write a message…', post: 'Post', none: 'Be the first to write', del: 'Delete', posted: ' posted on the board', count: ' messages' });
      return {
        'index.html': kit.page({ lang: l, title: v.title, body: String.raw`
  <main class="app">
    <header class="top">
      <div class="logo">📌</div>
      <div><h1>${kit.esc(v.title)}</h1><p id="count"></p></div>
    </header>
    <form id="form" class="card composer">
      <textarea id="text" rows="2" maxlength="500" placeholder="${TX.write}"></textarea>
      <div class="row"><span id="left" class="muted small grow">500</span><button id="post">${TX.post}</button></div>
    </form>
    <ul id="posts" class="list"></ul>
  </main>` }),
        'style.css': kit.css(v.color, String.raw`
.composer { display: flex; flex-direction: column; gap: 8px; padding: 12px; }
.composer textarea { border: 0; padding: 4px; resize: none; min-height: 52px; background: transparent; }
.composer textarea:focus { outline: none; }
.post { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 12px 14px; animation: in .25s; }
.post .head { display: flex; align-items: center; gap: 8px; }
.post .head b { flex: 1; min-width: 0; }
.post .text { margin: 8px 0 4px; white-space: pre-wrap; overflow-wrap: anywhere; }
.post .foot { display: flex; align-items: center; gap: 6px; }
.post .foot button { min-height: 34px; padding: 0 10px; font-size: .88rem; }
.like { background: var(--bg); color: var(--muted); }
.like.on { background: #ff4d6d1f; color: #e8365a; }
@keyframes in { from { opacity: 0; transform: translateY(6px); } }`),
        'app.js': String.raw`${X('/* Muro: tres tipos de actualización (post, like y delete) que se aplican en orden. */', '/* Board: three update types (post, like and delete) applied in order. */')}
const TX = ${kit.js(TX)};
${kit.helpers(l, ['$', 'me', 'avatar', 'uid', 'ago'])}

const posts = new Map();

function apply(p) {
  if (p.type === 'post') posts.set(p.id, { id: p.id, addr: p.addr, name: p.name, text: p.text, time: p.time, likes: new Set() });
  const post = posts.get(p.id);
  if (!post) return;
  if (p.type === 'like') { if (p.on) post.likes.add(p.addr); else post.likes.delete(p.addr); }
  if (p.type === 'delete' && p.addr === post.addr) posts.delete(p.id);
}

function render() {
  const list = Array.from(posts.values()).sort((a, b) => b.time - a.time);
  $('count').textContent = list.length + TX.count;
  $('posts').innerHTML = list.length ? '' : '<li class="empty"><b>💬</b>' + TX.none + '</li>';
  list.forEach((post) => {
    const li = document.createElement('li');
    li.className = 'post';
    const liked = post.likes.has(me.addr);
    li.innerHTML = '<div class="head">' + avatar(post.name) + '<b>' + esc(post.name) + '</b><span class="muted small">' + ago(post.time) + '</span></div>' +
      '<p class="text">' + esc(post.text) + '</p>' +
      '<div class="foot"><button class="like' + (liked ? ' on' : '') + '">' + (liked ? '❤️' : '🤍') + ' ' + post.likes.size + '</button>' +
      (post.addr === me.addr ? '<button class="danger">' + TX.del + '</button>' : '') + '</div>';
    li.querySelector('.like').onclick = () => window.webxdc.sendUpdate({ payload: { type: 'like', id: post.id, addr: me.addr, on: !liked } }, '');
    const del = li.querySelector('.danger');
    if (del) del.onclick = () => window.webxdc.sendUpdate({ payload: { type: 'delete', id: post.id, addr: me.addr } }, '');
    $('posts').appendChild(li);
  });
}

$('text').addEventListener('input', () => { $('left').textContent = 500 - $('text').value.length; });
$('form').addEventListener('submit', (event) => {
  event.preventDefault();
  const text = $('text').value.trim();
  if (!text) return;
  window.webxdc.sendUpdate({ payload: { type: 'post', id: uid(), addr: me.addr, name: me.name, text, time: Date.now() }, info: me.name + TX.posted, summary: text.slice(0, 60) }, '');
  $('text').value = '';
  $('left').textContent = 500;
});

window.webxdc.setUpdateListener((update) => { apply(update.payload); render(); });
setInterval(render, 60000);
render();
`
      };
    }
  });

  TP.add({
    id: 'raffle', cat: 'group', icon: 'gift', tint: 'amber', peers: 2, level: 2,
    name: T('Sorteo', 'Raffle'),
    desc: T('Las personas del chat se apuntan y cualquiera lanza el sorteo. Todos ven a la vez el mismo ganador, con una animación de suspense.', 'People in the chat sign up and anyone can start the draw. Everyone sees the same winner at once, with a suspense animation.'),
    learn: [T('Un resultado justo para todos', 'One fair result for everyone'), T('Rondas de un juego', 'Rounds of a game'), T('Animación con temporizadores', 'Animation with timers')],
    fields: [
      title('Sorteo', 'Raffle'),
      { k: 'prize', label: T('Premio', 'Prize'), type: 'text', value: T('🎁 Una sorpresa', '🎁 A surprise') },
      accent('#e8a10c')
    ],
    files(l, v) {
      const X = (es, en) => (l === 'en' ? en : es);
      const TX = X(
        { join: 'Apuntarme', leave: 'Salir', draw: 'Sortear', reset: 'Nuevo sorteo', people: ' participantes', need: 'Hacen falta al menos 2 personas', winner: 'Ganó', won: ' ganó ', joined: ' se apuntó al sorteo', none: 'Nadie se ha apuntado todavía' },
        { join: 'Join', leave: 'Leave', draw: 'Draw', reset: 'New raffle', people: ' entrants', need: 'At least 2 people are needed', winner: 'Winner', won: ' won ', joined: ' joined the raffle', none: 'Nobody has joined yet' });
      return {
        'index.html': kit.page({ lang: l, title: v.title, body: String.raw`
  <main class="app">
    <header class="top">
      <div class="logo">🎟️</div>
      <div><h1>${kit.esc(v.title)}</h1><p>${kit.esc(v.prize)}</p></div>
    </header>
    <section class="card center stage">
      <p class="label" id="label"></p>
      <div id="name" class="name">🎁</div>
      <p id="note" class="muted small"></p>
    </section>
    <div class="row">
      <button id="join" class="grow soft"></button>
      <button id="draw" class="grow">${TX.draw}</button>
    </div>
    <p class="label" id="count"></p>
    <div id="people" class="people"></div>
  </main>` }),
        'style.css': kit.css(v.color, String.raw`
.stage { padding: 26px 16px; }
.name { font-size: clamp(1.6rem, 9vw, 2.6rem); font-weight: 800; min-height: 1.3em; overflow-wrap: anywhere; }
.name.win { animation: win .6s; color: var(--accent); }
@keyframes win { 0% { transform: scale(.6); } 60% { transform: scale(1.15); } 100% { transform: none; } }
.people { display: flex; flex-wrap: wrap; gap: 8px; }
.people .chip { background: var(--card); color: var(--text); border: 1px solid var(--line); padding: 4px 10px 4px 4px; }
.people .chip.won { border-color: var(--accent); background: var(--accent-soft); }`),
        'app.js': String.raw`${X('/* Sorteo: quien pulsa "Sortear" elige al ganador y lo envía, así todos ven el mismo. */', '/* Raffle: whoever taps "Draw" picks the winner and sends it, so everyone sees the same one. */')}
const TX = ${kit.js(TX)};
const PRIZE = ${kit.js(v.prize)};
${kit.helpers(l, ['$', 'me', 'avatar'])}

let round = 0, people = new Map(), winner = null, live = false, spinning = null;

function apply(p) {
  if (p.round !== round) { if (p.type === 'reset' && p.round === round + 1) { round = p.round; people = new Map(); winner = null; } return; }
  if (p.type === 'join' && !winner) people.set(p.addr, p.name);
  if (p.type === 'leave' && !winner) people.delete(p.addr);
  if (p.type === 'draw' && !winner && people.has(p.winner)) { winner = { addr: p.winner, name: people.get(p.winner) }; if (live) reveal(); }
}

function reveal() {
  const names = Array.from(people.values());
  let k = 0;
  clearInterval(spinning);
  $('name').classList.remove('win');
  spinning = setInterval(() => { $('name').textContent = names[k++ % names.length]; }, 90);
  setTimeout(() => { clearInterval(spinning); spinning = null; render(); $('name').classList.add('win'); }, 1600);
}

function render() {
  const joined = people.has(me.addr);
  $('count').textContent = people.size + TX.people;
  $('people').innerHTML = people.size ? Array.from(people, ([addr, name]) =>
    '<span class="chip' + (winner && winner.addr === addr ? ' won' : '') + '">' + avatar(name) + esc(name) + '</span>').join('') : '<span class="muted small">' + TX.none + '</span>';
  if (spinning) return;
  $('label').textContent = winner ? TX.winner : '';
  $('name').textContent = winner ? '🎉 ' + winner.name : '🎁';
  $('note').textContent = winner ? PRIZE : people.size < 2 ? TX.need : '';
  $('join').textContent = joined ? TX.leave : TX.join;
  $('join').hidden = !!winner;
  $('draw').textContent = winner ? TX.reset : TX.draw;
  $('draw').disabled = !winner && people.size < 2;
}

$('join').onclick = () => {
  const joined = people.has(me.addr);
  window.webxdc.sendUpdate({ payload: { type: joined ? 'leave' : 'join', round, addr: me.addr, name: me.name }, info: joined ? '' : me.name + TX.joined }, '');
};
$('draw').onclick = () => {
  if (winner) return window.webxdc.sendUpdate({ payload: { type: 'reset', round: round + 1 } }, '');
  const list = Array.from(people.keys());
  const pick = list[Math.floor(Math.random() * list.length)];
  window.webxdc.sendUpdate({ payload: { type: 'draw', round, winner: pick }, info: people.get(pick) + TX.won + PRIZE, summary: '🎉 ' + people.get(pick) }, '');
};

window.webxdc.setUpdateListener((update) => { apply(update.payload); render(); }).then(() => { live = true; });
render();
`
      };
    }
  });
})();
