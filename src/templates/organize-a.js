/* Templates: team tasks and sticky notes. */
'use strict';
(function () {
  const TP = globalThis.CS.templates;
  const { T, kit } = TP;
  const title = (es, en) => ({ k: 'title', label: T('Nombre', 'Name'), type: 'text', value: T(es, en) });
  const accent = (c) => ({ k: 'color', label: T('Color', 'Color'), type: 'color', value: c });

  TP.add({
    id: 'tasks', cat: 'organize', icon: 'checkCircle', tint: 'blue', peers: 2, level: 2,
    name: T('Tareas del equipo', 'Team tasks'),
    desc: T('Un tablero con tres columnas: por hacer, en curso y hecho. Cada persona se asigna tareas y las mueve; todo el chat ve el progreso.', 'A board with three columns: to do, doing and done. People take tasks and move them along; the whole chat sees progress.'),
    learn: [T('Estados de una tarea', 'Task states'), T('Asignar a una persona', 'Assigning to a person'), T('Pestañas en el móvil', 'Tabs on mobile')],
    fields: [title('Tareas del equipo', 'Team tasks'), accent('#2f6fed')],
    files(l, v) {
      const X = (es, en) => (l === 'en' ? en : es);
      const TX = X(
        { cols: ['Por hacer', 'En curso', 'Hecho'], add: 'Nueva tarea…', take: 'Me la quedo', nobody: 'Sin asignar', empty: 'Nada por aquí', done: ' terminó: ', del: 'Borrar', of: ' de ', ready: ' hechas' },
        { cols: ['To do', 'Doing', 'Done'], add: 'New task…', take: 'I’ll take it', nobody: 'Unassigned', empty: 'Nothing here', done: ' finished: ', del: 'Delete', of: ' of ', ready: ' done' });
      return {
        'index.html': kit.page({ lang: l, title: v.title, body: String.raw`
  <main class="app">
    <header class="top">
      <div class="logo">✅</div>
      <div class="grow"><h1>${kit.esc(v.title)}</h1><p id="summary"></p></div>
    </header>
    <form id="form" class="row">
      <input id="text" class="grow" placeholder="${TX.add}" maxlength="100" autocomplete="off">
      <button class="icon" aria-label="+">＋</button>
    </form>
    <nav id="tabs" class="tabs"></nav>
    <ul id="tasks" class="list"></ul>
  </main>` }),
        'style.css': kit.css(v.color, String.raw`
.tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 4px; }
.tabs button { min-height: 40px; background: transparent; color: var(--muted); padding: 0 6px; font-size: .9rem; }
.tabs button.on { background: var(--accent); color: var(--accent-ink); }
.tabs button span { opacity: .75; font-weight: 500; }
.task { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.task .text { font-weight: 600; overflow-wrap: anywhere; }
.task .meta { display: flex; align-items: center; gap: 8px; font-size: .85rem; color: var(--muted); }
.task .meta .grow { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.task .acts { display: flex; gap: 6px; }
.task .acts button { min-height: 36px; font-size: .88rem; padding: 0 12px; }
.task .acts .move { margin-left: auto; }`),
        'app.js': String.raw`${X('/* Tareas: col 0 = por hacer, 1 = en curso, 2 = hecho. */', '/* Tasks: col 0 = to do, 1 = doing, 2 = done. */')}
const TX = ${kit.js(TX)};
${kit.helpers(l, ['$', 'me', 'avatar', 'uid'])}

const tasks = new Map();
let tab = 0;

function apply(p) {
  if (p.type === 'add') tasks.set(p.id, { id: p.id, text: p.text, col: 0, who: null });
  const t = tasks.get(p.id);
  if (!t) return;
  if (p.type === 'move') t.col = p.col;
  if (p.type === 'take') t.who = { addr: p.addr, name: p.name };
  if (p.type === 'delete') tasks.delete(p.id);
}

const send = (payload, info) => window.webxdc.sendUpdate({ payload, info: info || '' }, '');

function render() {
  const all = Array.from(tasks.values());
  const count = [0, 1, 2].map((c) => all.filter((t) => t.col === c).length);
  $('summary').textContent = count[2] + TX.of + all.length + TX.ready;
  $('tabs').innerHTML = TX.cols.map((name, c) => '<button data-c="' + c + '" class="' + (c === tab ? 'on' : '') + '">' + name + ' <span>' + count[c] + '</span></button>').join('');
  $('tabs').querySelectorAll('button').forEach((b) => { b.onclick = () => { tab = Number(b.dataset.c); render(); }; });
  const list = all.filter((t) => t.col === tab);
  $('tasks').innerHTML = list.length ? '' : '<li class="empty"><b>🗂️</b>' + TX.empty + '</li>';
  list.forEach((t) => {
    const li = document.createElement('li');
    li.className = 'task';
    li.innerHTML = '<div class="text">' + esc(t.text) + '</div>' +
      '<div class="meta">' + (t.who ? avatar(t.who.name) + '<span class="grow">' + esc(t.who.name) + '</span>' : '<span class="grow">' + TX.nobody + '</span>') + '</div>' +
      '<div class="acts">' +
      (!t.who || t.who.addr !== me.addr ? '<button class="soft take">' + TX.take + '</button>' : '') +
      (t.col > 0 ? '<button class="ghost back" aria-label="←">←</button>' : '') +
      (t.col < 2 ? '<button class="move">' + TX.cols[t.col + 1] + ' →</button>' : '<button class="danger del">' + TX.del + '</button>') + '</div>';
    const on = (sel, fn) => { const b = li.querySelector(sel); if (b) b.onclick = fn; };
    on('.take', () => send({ type: 'take', id: t.id, addr: me.addr, name: me.name }));
    on('.back', () => send({ type: 'move', id: t.id, col: t.col - 1 }));
    on('.move', () => send({ type: 'move', id: t.id, col: t.col + 1 }, t.col + 1 === 2 ? me.name + TX.done + t.text : ''));
    on('.del', () => send({ type: 'delete', id: t.id }));
    $('tasks').appendChild(li);
  });
}

$('form').addEventListener('submit', (event) => {
  event.preventDefault();
  const text = $('text').value.trim();
  if (!text) return;
  send({ type: 'add', id: uid(), text });
  $('text').value = '';
  tab = 0;
});

window.webxdc.setUpdateListener((update) => { apply(update.payload); render(); });
render();
`
      };
    }
  });

  TP.add({
    id: 'notes', cat: 'organize', icon: 'note', tint: 'amber', peers: 2, level: 2,
    name: T('Notas adhesivas', 'Sticky notes'),
    desc: T('Un corcho de notas de colores para ideas, recordatorios o lluvia de ideas. Cada quien edita y borra sus propias notas.', 'A cork board of colored notes for ideas, reminders or brainstorming. Everyone edits and deletes their own notes.'),
    learn: [T('Editar algo ya enviado', 'Editing something already sent'), T('Permisos sencillos', 'Simple permissions'), T('Una cuadrícula de tarjetas', 'A grid of cards')],
    fields: [title('Ideas del grupo', 'Group ideas'), accent('#d9a400')],
    files(l, v) {
      const X = (es, en) => (l === 'en' ? en : es);
      const TX = X(
        { write: 'Escribe una idea…', add: 'Pegar nota', save: 'Guardar', cancel: 'Cancelar', del: 'Borrar', empty: 'El corcho está vacío', added: ' pegó una nota', edited: 'editada', count: ' notas' },
        { write: 'Write an idea…', add: 'Stick note', save: 'Save', cancel: 'Cancel', del: 'Delete', empty: 'The board is empty', added: ' stuck a note', edited: 'edited', count: ' notes' });
      return {
        'index.html': kit.page({ lang: l, title: v.title, body: String.raw`
  <main class="app">
    <header class="top">
      <div class="logo">🗒️</div>
      <div><h1>${kit.esc(v.title)}</h1><p id="count"></p></div>
    </header>
    <form id="form" class="card composer">
      <textarea id="text" rows="2" maxlength="280" placeholder="${TX.write}"></textarea>
      <div class="row">
        <div id="colors" class="colors grow"></div>
        <button>${TX.add}</button>
      </div>
    </form>
    <section id="notes" class="notes"></section>
  </main>` }),
        'style.css': kit.css(v.color, String.raw`
.composer { display: flex; flex-direction: column; gap: 10px; padding: 12px; }
.composer textarea { border: 0; padding: 4px; resize: none; background: transparent; }
.composer textarea:focus { outline: none; }
.colors { display: flex; gap: 8px; }
.colors button { width: 30px; min-height: 30px; padding: 0; border-radius: 50%; border: 2px solid transparent; }
.colors button.on { border-color: var(--text); }
.notes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; align-items: start; }
.note { border-radius: 4px 4px 16px 4px; padding: 12px; color: #2b2410; box-shadow: 0 6px 16px rgba(0, 0, 0, .12); display: flex; flex-direction: column; gap: 8px; min-height: 120px; animation: stick .3s; }
.note:nth-child(odd) { transform: rotate(-1deg); }
.note:nth-child(even) { transform: rotate(1deg); }
.note .text { white-space: pre-wrap; overflow-wrap: anywhere; flex: 1; font-size: .95rem; }
.note .by { display: flex; align-items: center; gap: 6px; font-size: .75rem; opacity: .75; }
.note .by .avatar { width: 20px; height: 20px; font-size: .6rem; }
.note textarea { background: rgba(255, 255, 255, .6); color: inherit; min-height: 80px; resize: vertical; }
.note .acts { display: flex; gap: 6px; }
.note .acts button { min-height: 32px; padding: 0 10px; font-size: .82rem; background: rgba(0, 0, 0, .1); color: inherit; }
@keyframes stick { from { opacity: 0; transform: scale(.9); } }`),
        'app.js': String.raw`${X('/* Notas: solo quien escribió una nota puede editarla o borrarla. */', '/* Notes: only the author of a note can edit or delete it. */')}
const TX = ${kit.js(TX)};
const COLORS = ['#fff1a8', '#ffd6e0', '#cdeffd', '#d4f7c5', '#e8dcff'];
${kit.helpers(l, ['$', 'me', 'avatar', 'uid'])}

const notes = new Map();
let paper = COLORS[0];
let editing = null;

function apply(p) {
  if (p.type === 'add') notes.set(p.id, { id: p.id, addr: p.addr, name: p.name, text: p.text, color: p.color, edited: false });
  const n = notes.get(p.id);
  if (!n || n.addr !== p.addr) return;
  if (p.type === 'edit') { n.text = p.text; n.edited = true; }
  if (p.type === 'delete') notes.delete(p.id);
}

function colors() {
  $('colors').innerHTML = '';
  COLORS.forEach((c) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.style.background = c;
    b.className = c === paper ? 'on' : '';
    b.onclick = () => { paper = c; colors(); };
    $('colors').appendChild(b);
  });
}

function render() {
  $('count').textContent = notes.size + TX.count;
  $('notes').innerHTML = notes.size ? '' : '<p class="empty" style="grid-column: 1 / -1"><b>📌</b>' + TX.empty + '</p>';
  Array.from(notes.values()).reverse().forEach((n) => {
    const el = document.createElement('div');
    el.className = 'note';
    el.style.background = n.color;
    const mine = n.addr === me.addr;
    if (editing === n.id) {
      el.innerHTML = '<textarea maxlength="280"></textarea><div class="acts"><button class="save">' + TX.save + '</button><button class="cancel">' + TX.cancel + '</button></div>';
      const area = el.querySelector('textarea');
      area.value = n.text;
      el.querySelector('.save').onclick = () => { const text = area.value.trim(); editing = null; if (text && text !== n.text) window.webxdc.sendUpdate({ payload: { type: 'edit', id: n.id, addr: me.addr, text } }, ''); else render(); };
      el.querySelector('.cancel').onclick = () => { editing = null; render(); };
      setTimeout(() => area.focus(), 0);
    } else {
      el.innerHTML = '<div class="text">' + esc(n.text) + '</div><div class="by">' + avatar(n.name) + esc(n.name) + (n.edited ? ' · ' + TX.edited : '') + '</div>' +
        (mine ? '<div class="acts"><button class="edit" aria-label="✏️">✏️</button><button class="del">' + TX.del + '</button></div>' : '');
      if (mine) {
        el.querySelector('.edit').onclick = () => { editing = n.id; render(); };
        el.querySelector('.del').onclick = () => window.webxdc.sendUpdate({ payload: { type: 'delete', id: n.id, addr: me.addr } }, '');
      }
    }
    $('notes').appendChild(el);
  });
}

$('form').addEventListener('submit', (event) => {
  event.preventDefault();
  const text = $('text').value.trim();
  if (!text) return;
  window.webxdc.sendUpdate({ payload: { type: 'add', id: uid(), addr: me.addr, name: me.name, text, color: paper }, info: me.name + TX.added, summary: text.slice(0, 60) }, '');
  $('text').value = '';
});

window.webxdc.setUpdateListener((update) => { apply(update.payload); if (!editing) render(); });
colors();
render();
`
      };
    }
  });
})();
