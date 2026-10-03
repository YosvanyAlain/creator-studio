/* Templates: focus timer and form. */
'use strict';
(function () {
  const TP = globalThis.CS.templates;
  const { T, kit } = TP;
  const title = (es, en) => ({ k: 'title', label: T('Nombre', 'Name'), type: 'text', value: T(es, en) });
  const accent = (c) => ({ k: 'color', label: T('Color', 'Color'), type: 'color', value: c });

  TP.add({
    id: 'timer', cat: 'organize', icon: 'clock', tint: 'red', peers: 1, level: 2,
    name: T('Temporizador de enfoque', 'Focus timer'),
    desc: T('Bloques de concentración y descansos con un anillo animado y aviso sonoro. El chat ve cuántas sesiones completó cada persona hoy.', 'Focus blocks and breaks with an animated ring and a sound alert. The chat sees how many sessions each person finished today.'),
    learn: [T('Medir tiempo sin desviarse', 'Keeping time without drift'), T('Un anillo SVG animado', 'An animated SVG ring'), T('Sonido con Web Audio', 'Sound with Web Audio')],
    fields: [
      title('Enfoque', 'Focus'),
      { k: 'focus', label: T('Minutos de enfoque', 'Focus minutes'), type: 'range', min: 5, max: 60, value: 25, unit: ' min' },
      { k: 'rest', label: T('Minutos de descanso', 'Break minutes'), type: 'range', min: 1, max: 30, value: 5, unit: ' min' },
      accent('#e5484d')
    ],
    files(l, v) {
      const X = (es, en) => (l === 'en' ? en : es);
      const focus = Math.max(1, Math.min(120, Number(v.focus) || 25));
      const rest = Math.max(1, Math.min(60, Number(v.rest) || 5));
      const TX = X(
        { focus: 'Enfoque', rest: 'Descanso', start: 'Empezar', pause: 'Pausa', resume: 'Seguir', reset: 'Reiniciar', skip: 'Saltar', today: 'Hoy en el grupo', none: 'Nadie ha terminado una sesión hoy', done: ' completó una sesión de ', unit: ' min', sessions: ' sesiones' },
        { focus: 'Focus', rest: 'Break', start: 'Start', pause: 'Pause', resume: 'Resume', reset: 'Reset', skip: 'Skip', today: 'Today in the group', none: 'Nobody has finished a session today', done: ' finished a session of ', unit: ' min', sessions: ' sessions' });
      return {
        'index.html': kit.page({ lang: l, title: v.title, body: String.raw`
  <main class="app">
    <header class="top">
      <div class="logo">🍅</div>
      <div><h1>${kit.esc(v.title)}</h1><p>${focus} + ${rest}${TX.unit}</p></div>
    </header>
    <section class="card dial">
      <svg viewBox="0 0 200 200" class="ring" aria-hidden="true">
        <circle cx="100" cy="100" r="88" class="track"></circle>
        <circle cx="100" cy="100" r="88" class="arc" id="arc"></circle>
      </svg>
      <div class="read">
        <span id="mode" class="chip"></span>
        <b id="time">00:00</b>
      </div>
    </section>
    <div class="row">
      <button id="reset" class="ghost icon" aria-label="${TX.reset}">↺</button>
      <button id="go" class="grow"></button>
      <button id="skip" class="ghost icon" aria-label="${TX.skip}">⏭</button>
    </div>
    <p class="label">${TX.today}</p>
    <ul id="team" class="list"></ul>
  </main>` }),
        'style.css': kit.css(v.color, String.raw`
.dial { position: relative; display: grid; place-items: center; padding: 20px; }
.ring { width: min(72vw, 260px); height: auto; transform: rotate(-90deg); }
.ring circle { fill: none; stroke-width: 12; }
.ring .track { stroke: var(--accent-soft); }
.ring .arc { stroke: var(--accent); stroke-linecap: round; transition: stroke-dashoffset .5s linear; }
.rest .ring .arc { stroke: var(--ok); }
.read { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; }
.read b { font-size: clamp(2.4rem, 13vw, 3.4rem); font-variant-numeric: tabular-nums; letter-spacing: -.02em; }
#go { font-size: 1.1rem; }
#team li { display: flex; align-items: center; gap: 10px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 8px 12px; }
#team li b { margin-left: auto; }`),
        'app.js': String.raw`${X('/* Temporizador: guardamos la hora de fin, no los segundos, para que nunca se desvíe. */', '/* Timer: we store the end time, not the seconds, so it never drifts. */')}
const TX = ${kit.js(TX)};
const MINUTES = { focus: ${focus}, rest: ${rest} };
${kit.helpers(l, ['$', 'me', 'avatar'])}

const arc = $('arc');
const LEN = 2 * Math.PI * 88;
arc.style.strokeDasharray = LEN;
const saved = JSON.parse(localStorage.getItem('timer') || 'null');
let mode = saved ? saved.mode : 'focus';
let endsAt = saved ? saved.endsAt : 0;
let left = saved ? saved.left : MINUTES.focus * 60000;
let tick = null;
const team = {};

const save = () => localStorage.setItem('timer', JSON.stringify({ mode, endsAt, left }));
const total = () => MINUTES[mode] * 60000;
const remaining = () => (endsAt ? Math.max(0, endsAt - Date.now()) : left);

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach((t) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; g.gain.setValueAtTime(0.25, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2);
    });
  } catch (e) { /* no audio */ }
  if (navigator.vibrate) navigator.vibrate([120, 80, 120]);
}

function draw() {
  const ms = remaining();
  const s = Math.ceil(ms / 1000);
  $('time').textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  arc.style.strokeDashoffset = LEN * (1 - ms / total());
  $('mode').textContent = mode === 'focus' ? TX.focus : TX.rest;
  document.body.classList.toggle('rest', mode === 'rest');
  $('go').textContent = endsAt ? TX.pause : left < total() ? TX.resume : TX.start;
  if (endsAt && ms <= 0) finish();
}

function switchMode(next) {
  mode = next; endsAt = 0; left = total();
  clearInterval(tick); save(); draw();
}

function finish() {
  beep();
  if (mode === 'focus') window.webxdc.sendUpdate({ payload: { addr: me.addr, name: me.name, mins: MINUTES.focus, day: new Date().toDateString() }, info: me.name + TX.done + MINUTES.focus + TX.unit }, '');
  switchMode(mode === 'focus' ? 'rest' : 'focus');
}

$('go').onclick = () => {
  if (endsAt) { left = remaining(); endsAt = 0; clearInterval(tick); }
  else { endsAt = Date.now() + left; tick = setInterval(draw, 250); }
  save(); draw();
};
$('reset').onclick = () => switchMode(mode);
$('skip').onclick = () => switchMode(mode === 'focus' ? 'rest' : 'focus');

function render() {
  const rows = Object.values(team).sort((a, b) => b.n - a.n);
  $('team').innerHTML = rows.length ? rows.map((r) => '<li>' + avatar(r.name) + esc(r.name) + '<b>' + '🍅'.repeat(Math.min(r.n, 8)) + ' ' + r.n + '</b></li>').join('')
    : '<li class="muted">' + TX.none + '</li>';
}

window.webxdc.setUpdateListener((update) => {
  const p = update.payload;
  if (p.day !== new Date().toDateString()) return;
  team[p.addr] = { name: p.name, n: (team[p.addr] ? team[p.addr].n : 0) + 1 };
  render();
});
if (endsAt) tick = setInterval(draw, 250);
draw();
render();
`
      };
    }
  });

  TP.add({
    id: 'form', cat: 'organize', icon: 'list', tint: 'indigo', peers: 2, level: 2,
    name: T('Formulario', 'Form'),
    desc: T('Haz preguntas abiertas o de opciones y recoge las respuestas del chat. Mira el resumen y envíalo al chat con un toque.', 'Ask open or multiple-choice questions and collect the chat’s answers. See the summary and send it to the chat in one tap.'),
    learn: [T('Generar campos desde una lista', 'Building fields from a list'), T('Resumir respuestas', 'Summarizing answers'), T('Enviar texto al chat', 'Sending text to the chat')],
    fields: [
      title('Encuesta de la excursión', 'Trip survey'),
      { k: 'questions', label: T('Preguntas (con | para opciones)', 'Questions (use | for options)'), type: 'lines', value: T(
        '¿Qué día te viene mejor? | Sábado | Domingo\n¿Vienes en coche? | Sí, con plazas libres | Sí, lleno | No\n¿Alguna alergia o comida que evitar?\n¿Qué te gustaría hacer?',
        'Which day suits you best? | Saturday | Sunday\nAre you coming by car? | Yes, with free seats | Yes, full | No\nAny allergies or food to avoid?\nWhat would you like to do?') },
      accent('#5b4ff5')
    ],
    files(l, v) {
      const X = (es, en) => (l === 'en' ? en : es);
      const qs = kit.lines(v.questions).slice(0, 20).map((line) => {
        const parts = line.split('|').map((x) => x.trim()).filter(Boolean);
        return parts.length > 2 ? { q: parts[0], options: parts.slice(1) } : { q: parts[0] || line };
      });
      const TX = X(
        { answer: 'Responder', results: 'Respuestas', send: 'Enviar respuestas', update: 'Actualizar respuestas', thanks: '¡Gracias! Puedes cambiar tus respuestas cuando quieras.', write: 'Tu respuesta', none: 'Aún no hay respuestas', share: 'Enviar resumen al chat', answered: ' respondió el formulario', people: ' personas', summary: 'Resumen' },
        { answer: 'Answer', results: 'Answers', send: 'Send answers', update: 'Update answers', thanks: 'Thanks! You can change your answers anytime.', write: 'Your answer', none: 'No answers yet', share: 'Send summary to chat', answered: ' answered the form', people: ' people', summary: 'Summary' });
      return {
        'index.html': kit.page({ lang: l, title: v.title, body: String.raw`
  <main class="app">
    <header class="top">
      <div class="logo">📝</div>
      <div><h1>${kit.esc(v.title)}</h1><p id="count"></p></div>
    </header>
    <nav class="tabs">
      <button id="tabAnswer" class="on">${TX.answer}</button>
      <button id="tabResults">${TX.results}</button>
    </nav>
    <form id="form" class="questions"></form>
    <section id="results" class="questions" hidden></section>
  </main>` }),
        'style.css': kit.css(v.color, String.raw`
[hidden] { display: none !important; }
.tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 4px; }
.tabs button { min-height: 40px; background: transparent; color: var(--muted); }
.tabs button.on { background: var(--accent); color: var(--accent-ink); }
.questions { display: flex; flex-direction: column; gap: 12px; }
.q { display: flex; flex-direction: column; gap: 10px; }
.q h2 { font-size: 1rem; margin: 0; }
.choice { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 12px; cursor: pointer; }
.choice input { width: 20px; min-height: 20px; accent-color: var(--accent); margin: 0; }
.choice:has(input:checked) { border-color: var(--accent); background: var(--accent-soft); }
.bar { display: flex; align-items: center; gap: 10px; font-size: .92rem; }
.bar .track { flex: 1; height: 8px; border-radius: 9px; background: var(--accent-soft); overflow: hidden; }
.bar .track i { display: block; height: 100%; background: var(--accent); }
.bar .name { width: 40%; min-width: 0; overflow-wrap: anywhere; }
.reply { display: flex; gap: 8px; align-items: flex-start; font-size: .92rem; padding: 6px 0; border-top: 1px solid var(--line); }
.reply:first-of-type { border-top: 0; }
.ok { color: var(--ok); text-align: center; font-weight: 600; }`),
        'app.js': String.raw`${X('/* Formulario: cada persona envía todas sus respuestas juntas; vale la última. */', '/* Form: everyone sends all their answers together; the latest counts. */')}
const TX = ${kit.js(TX)};
const QUESTIONS = ${kit.js(qs)};
${kit.helpers(l, ['$', 'me', 'avatar'])}

const replies = new Map();

function buildForm() {
  const mine = replies.get(me.addr);
  $('form').innerHTML = '';
  QUESTIONS.forEach((item, i) => {
    const box = document.createElement('div');
    box.className = 'card q';
    box.innerHTML = '<h2>' + esc(item.q) + '</h2>';
    const value = mine ? mine.answers[i] : '';
    if (item.options) {
      item.options.forEach((opt) => {
        const label = document.createElement('label');
        label.className = 'choice';
        label.innerHTML = '<input type="radio" name="q' + i + '">' + esc(opt);
        const input = label.querySelector('input');
        input.value = opt;
        input.checked = value === opt;
        box.appendChild(label);
      });
    } else {
      const input = document.createElement('input');
      input.name = 'q' + i; input.maxLength = 200; input.placeholder = TX.write; input.value = value || '';
      box.appendChild(input);
    }
    $('form').appendChild(box);
  });
  const send = document.createElement('button');
  send.textContent = mine ? TX.update : TX.send;
  $('form').appendChild(send);
  if (mine) { const ok = document.createElement('p'); ok.className = 'ok'; ok.textContent = TX.thanks; $('form').appendChild(ok); }
}

function readForm() {
  return QUESTIONS.map((item, i) => {
    if (item.options) { const c = $('form').querySelector('input[name="q' + i + '"]:checked'); return c ? c.value : ''; }
    return $('form').querySelector('input[name="q' + i + '"]').value.trim();
  });
}

function renderResults() {
  const all = Array.from(replies.values());
  $('count').textContent = all.length + TX.people;
  $('results').innerHTML = all.length ? '' : '<p class="empty"><b>📭</b>' + TX.none + '</p>';
  if (!all.length) return;
  QUESTIONS.forEach((item, i) => {
    const box = document.createElement('div');
    box.className = 'card q';
    let html = '<h2>' + esc(item.q) + '</h2>';
    if (item.options) {
      html += item.options.map((opt) => {
        const n = all.filter((r) => r.answers[i] === opt).length;
        return '<div class="bar"><span class="name">' + esc(opt) + '</span><span class="track"><i style="width:' + (n / all.length * 100) + '%"></i></span><b>' + n + '</b></div>';
      }).join('');
    } else {
      html += all.filter((r) => r.answers[i]).map((r) => '<div class="reply">' + avatar(r.name) + '<div><b>' + esc(r.name) + '</b><br>' + esc(r.answers[i]) + '</div></div>').join('') || '<p class="muted small">—</p>';
    }
    box.innerHTML = html;
    $('results').appendChild(box);
  });
  const share = document.createElement('button');
  share.className = 'soft';
  share.textContent = TX.share;
  share.onclick = () => window.webxdc.sendToChat({ text: summary() });
  $('results').appendChild(share);
}

function summary() {
  const all = Array.from(replies.values());
  const out = [${kit.js(v.title)} + ' — ' + TX.summary + ' (' + all.length + TX.people + ')'];
  QUESTIONS.forEach((item, i) => {
    out.push('', item.q);
    if (item.options) item.options.forEach((opt) => out.push('• ' + opt + ': ' + all.filter((r) => r.answers[i] === opt).length));
    else all.filter((r) => r.answers[i]).forEach((r) => out.push('• ' + r.name + ': ' + r.answers[i]));
  });
  return out.join('\n');
}

function tab(results) {
  $('tabAnswer').classList.toggle('on', !results);
  $('tabResults').classList.toggle('on', results);
  $('form').hidden = results;
  $('results').hidden = !results;
}

$('tabAnswer').onclick = () => tab(false);
$('tabResults').onclick = () => tab(true);
$('form').addEventListener('submit', (event) => {
  event.preventDefault();
  const first = !replies.has(me.addr);
  window.webxdc.sendUpdate({ payload: { addr: me.addr, name: me.name, answers: readForm() }, info: first ? me.name + TX.answered : '' }, '');
});

window.webxdc.setUpdateListener((update) => {
  replies.set(update.payload.addr, update.payload);
  if (update.payload.addr === me.addr || !$('form').contains(document.activeElement)) buildForm();
  renderResults();
});
buildForm();
renderResults();
`
      };
    }
  });
})();
