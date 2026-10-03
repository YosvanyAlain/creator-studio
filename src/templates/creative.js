/* Templates: shared whiteboard and photo album. */
'use strict';
(function () {
  const TP = globalThis.CS.templates;
  const { T, kit } = TP;
  const title = (es, en) => ({ k: 'title', label: T('Nombre', 'Name'), type: 'text', value: T(es, en) });
  const accent = (c) => ({ k: 'color', label: T('Color', 'Color'), type: 'color', value: c });

  TP.add({
    id: 'draw', cat: 'creative', icon: 'brush', tint: 'pink', peers: 2, level: 3,
    name: T('Pizarra compartida', 'Shared whiteboard'),
    desc: T('Dibujad juntos en el mismo lienzo: cada trazo aparece en las pantallas de todo el chat. Con colores, grosores y deshacer.', 'Draw together on the same canvas: every stroke shows up on everyone’s screen. With colors, sizes and undo.'),
    learn: [T('Eventos del puntero', 'Pointer events'), T('Coordenadas relativas', 'Relative coordinates'), T('Enviar datos compactos', 'Sending compact data')],
    fields: [title('Pizarra', 'Whiteboard'), accent('#e0457b')],
    files(l, v) {
      const X = (es, en) => (l === 'en' ? en : es);
      const TX = X({ undo: 'Deshacer', clear: 'Borrar todo', ask: '¿Borrar la pizarra para todos?', strokes: ' trazos', cleared: ' borró la pizarra' }, { undo: 'Undo', clear: 'Clear all', ask: 'Clear the board for everyone?', strokes: ' strokes', cleared: ' cleared the board' });
      return {
        'index.html': kit.page({ lang: l, title: v.title, body: String.raw`
  <main class="app">
    <header class="top">
      <div class="logo">🎨</div>
      <div class="grow"><h1>${kit.esc(v.title)}</h1><p id="count"></p></div>
      <button id="undo" class="ghost icon" aria-label="${TX.undo}">↶</button>
    </header>
    <div class="paper"><canvas id="canvas"></canvas></div>
    <div class="tools card">
      <div id="colors" class="colors"></div>
      <div id="sizes" class="sizes"></div>
    </div>
    <button id="clear" class="danger">${TX.clear}</button>
  </main>` }),
        'style.css': kit.css(v.color, String.raw`
.paper { background: #fff; border-radius: 18px; border: 1px solid var(--line); box-shadow: var(--shadow); overflow: hidden; }
canvas { display: block; width: 100%; aspect-ratio: 1; touch-action: none; cursor: crosshair; }
.tools { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; }
.colors, .sizes { display: flex; gap: 8px; align-items: center; }
.colors button { width: 30px; min-height: 30px; padding: 0; border-radius: 50%; border: 3px solid var(--card); box-shadow: 0 0 0 1px var(--line); }
.colors button.on { box-shadow: 0 0 0 2px var(--text); }
.sizes button { width: 36px; min-height: 36px; padding: 0; background: var(--bg); border-radius: 10px; }
.sizes button i { display: block; border-radius: 50%; background: var(--text); }
.sizes button.on { background: var(--accent-soft); }`),
        'app.js': String.raw`${X('/* Pizarra: cada trazo se envía al soltar el dedo, con puntos entre 0 y 1 para que encaje en cualquier pantalla. */', '/* Whiteboard: each stroke is sent when the finger lifts, with points from 0 to 1 so it fits any screen. */')}
const TX = ${kit.js(TX)};
const COLORS = ['#1b1e2e', '#e5484d', '#f59e0b', '#12a46a', '#2f6fed', '#9b51e0'];
const SIZES = [3, 7, 14];
${kit.helpers(l, ['$', 'me', 'uid'])}

const canvas = $('canvas');
const ctx = canvas.getContext('2d');
const strokes = [];
let color = COLORS[0], size = SIZES[1], current = null;

function fit() {
  const r = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(r.height * dpr);
  redraw();
}

function line(s) {
  const w = canvas.width;
  ctx.strokeStyle = s.color;
  ctx.lineWidth = s.size * w / 400;
  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.beginPath();
  s.pts.forEach((p, i) => (i ? ctx.lineTo(p[0] * w, p[1] * canvas.height) : ctx.moveTo(p[0] * w, p[1] * canvas.height)));
  if (s.pts.length === 1) ctx.lineTo(s.pts[0][0] * w + 0.1, s.pts[0][1] * canvas.height);
  ctx.stroke();
}

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  strokes.forEach(line);
  if (current) line(current);
  $('count').textContent = strokes.length + TX.strokes;
}

function point(e) {
  const r = canvas.getBoundingClientRect();
  return [Math.round(((e.clientX - r.left) / r.width) * 1000) / 1000, Math.round(((e.clientY - r.top) / r.height) * 1000) / 1000];
}

canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); current = { color, size, pts: [point(e)] }; redraw(); });
canvas.addEventListener('pointermove', (e) => {
  if (!current) return;
  const p = point(e), q = current.pts[current.pts.length - 1];
  if (Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.004) { current.pts.push(p); redraw(); }
});
const end = () => {
  if (!current) return;
  const s = current;
  current = null;
  window.webxdc.sendUpdate({ payload: { type: 'stroke', id: uid(), addr: me.addr, color: s.color, size: s.size, pts: s.pts.slice(0, 1500) } }, '');
};
canvas.addEventListener('pointerup', end);
canvas.addEventListener('pointercancel', end);

$('undo').onclick = () => {
  const mine = strokes.filter((s) => s.addr === me.addr).pop();
  if (mine) window.webxdc.sendUpdate({ payload: { type: 'undo', id: mine.id, addr: me.addr } }, '');
};
$('clear').onclick = () => { if (confirm(TX.ask)) window.webxdc.sendUpdate({ payload: { type: 'clear' }, info: me.name + TX.cleared }, ''); };

function tools() {
  $('colors').innerHTML = ''; $('sizes').innerHTML = '';
  COLORS.forEach((c) => {
    const b = document.createElement('button');
    b.style.background = c; b.className = c === color ? 'on' : ''; b.setAttribute('aria-label', c);
    b.onclick = () => { color = c; tools(); };
    $('colors').appendChild(b);
  });
  SIZES.forEach((s) => {
    const b = document.createElement('button');
    b.className = s === size ? 'on' : ''; b.innerHTML = '<i style="width:' + (s + 3) + 'px;height:' + (s + 3) + 'px"></i>';
    b.onclick = () => { size = s; tools(); };
    $('sizes').appendChild(b);
  });
}

window.webxdc.setUpdateListener((update) => {
  const p = update.payload;
  if (p.type === 'stroke') strokes.push(p);
  if (p.type === 'undo') { const i = strokes.findIndex((s) => s.id === p.id && s.addr === p.addr); if (i >= 0) strokes.splice(i, 1); }
  if (p.type === 'clear') strokes.length = 0;
  redraw();
});
window.addEventListener('resize', fit);
tools();
fit();
`
      };
    }
  });

  TP.add({
    id: 'album', cat: 'creative', icon: 'image', tint: 'violet', peers: 2, level: 3,
    name: T('Álbum de fotos', 'Photo album'),
    desc: T('Un álbum que el chat llena entre todos. Las fotos se reducen en el propio móvil para viajar ligeras, con pie de foto y autor.', 'An album the chat fills together. Photos are shrunk on the phone itself to travel light, with a caption and author.'),
    learn: [T('Elegir archivos del dispositivo', 'Picking files from the device'), T('Reducir imágenes con canvas', 'Shrinking images with canvas'), T('Respetar el límite de tamaño', 'Staying under the size limit')],
    fields: [title('Nuestro álbum', 'Our album'), accent('#8b5cf6')],
    files(l, v) {
      const X = (es, en) => (l === 'en' ? en : es);
      const TX = X(
        { add: 'Añadir foto', caption: 'Pie de foto (opcional)', send: 'Compartir', cancel: 'Cancelar', empty: 'Todavía no hay fotos. ¡Sube la primera!', del: 'Borrar', added: ' añadió una foto', photos: ' fotos', working: 'Preparando…' },
        { add: 'Add photo', caption: 'Caption (optional)', send: 'Share', cancel: 'Cancel', empty: 'No photos yet. Add the first one!', del: 'Delete', added: ' added a photo', photos: ' photos', working: 'Preparing…' });
      return {
        'index.html': kit.page({ lang: l, title: v.title, body: String.raw`
  <main class="app">
    <header class="top">
      <div class="logo">📸</div>
      <div class="grow"><h1>${kit.esc(v.title)}</h1><p id="count"></p></div>
    </header>
    <button id="add">＋ ${TX.add}</button>
    <section id="grid" class="grid"></section>
  </main>
  <div id="compose" class="sheet" hidden>
    <div class="panel">
      <img id="preview" alt="">
      <input id="caption" maxlength="120" placeholder="${TX.caption}">
      <div class="row"><button id="cancel" class="ghost grow">${TX.cancel}</button><button id="send" class="grow">${TX.send}</button></div>
    </div>
  </div>
  <div id="viewer" class="viewer" hidden>
    <img id="big" alt="">
    <div class="info"><p id="bigText"></p><button id="bigDel" class="danger">${TX.del}</button></div>
  </div>` }),
        'style.css': kit.css(v.color, String.raw`
[hidden] { display: none !important; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.grid button { aspect-ratio: 1; min-height: 0; padding: 0; border-radius: 12px; overflow: hidden; background: var(--line); }
.grid img { width: 100%; height: 100%; object-fit: cover; display: block; }
.grid .empty { grid-column: 1 / -1; }
.sheet { position: fixed; inset: 0; background: rgba(0, 0, 0, .45); display: flex; align-items: flex-end; z-index: 5; }
.sheet .panel { background: var(--card); width: 100%; border-radius: 22px 22px 0 0; padding: 16px 16px calc(16px + env(safe-area-inset-bottom, 0px)); display: flex; flex-direction: column; gap: 10px; }
.sheet img { max-height: 45vh; object-fit: contain; border-radius: 12px; background: var(--bg); }
.viewer { position: fixed; inset: 0; background: rgba(5, 6, 10, .94); z-index: 6; display: flex; flex-direction: column; justify-content: center; padding: 16px; }
.viewer img { max-width: 100%; max-height: 74vh; object-fit: contain; margin: 0 auto; border-radius: 10px; }
.viewer .info { color: #fff; display: flex; align-items: center; gap: 10px; margin-top: 12px; }
.viewer .info p { flex: 1; margin: 0; }`),
        'app.js': String.raw`${X('/* Álbum: cada foto se reduce a JPEG hasta caber en una actualización (máx. 128 KB). */', '/* Album: each photo is shrunk to JPEG until it fits in one update (max 128 KB). */')}
const TX = ${kit.js(TX)};
const MAX_CHARS = 100000;
${kit.helpers(l, ['$', 'me', 'esc', 'uid', 'toast'])}

const photos = new Map();
let pending = null, open = null;

function shrink(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let side = 1280, quality = 0.8, data = '';
      const canvas = document.createElement('canvas');
      do {
        const k = Math.min(1, side / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * k);
        canvas.height = Math.round(img.height * k);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        data = canvas.toDataURL('image/jpeg', quality);
        if (quality > 0.5) quality -= 0.1; else side = Math.round(side * 0.8);
      } while (data.length > MAX_CHARS && side > 160);
      URL.revokeObjectURL(img.src);
      resolve(data);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

$('add').onclick = async () => {
  const files = await window.webxdc.importFiles({ mimeTypes: ['image/*'], extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'] });
  if (!files || !files.length) return;
  toast(TX.working);
  pending = await shrink(files[0]);
  $('preview').src = pending;
  $('caption').value = '';
  $('compose').hidden = false;
};
$('cancel').onclick = () => { pending = null; $('compose').hidden = true; };
$('send').onclick = () => {
  if (!pending) return;
  window.webxdc.sendUpdate({ payload: { type: 'add', id: uid(), addr: me.addr, name: me.name, img: pending, caption: $('caption').value.trim(), time: Date.now() }, info: me.name + TX.added }, '');
  pending = null;
  $('compose').hidden = true;
};

function view(p) {
  open = p;
  $('big').src = p.img;
  $('bigText').innerHTML = '<b>' + esc(p.name) + '</b>' + (p.caption ? ' · ' + esc(p.caption) : '');
  $('bigDel').hidden = p.addr !== me.addr;
  $('viewer').hidden = false;
}
$('viewer').onclick = (e) => { if (e.target.id !== 'bigDel') { $('viewer').hidden = true; open = null; } };
$('bigDel').onclick = () => { window.webxdc.sendUpdate({ payload: { type: 'delete', id: open.id, addr: me.addr } }, ''); $('viewer').hidden = true; };

function render() {
  const list = Array.from(photos.values()).reverse();
  $('count').textContent = list.length + TX.photos;
  $('grid').innerHTML = list.length ? '' : '<p class="empty"><b>🖼️</b>' + TX.empty + '</p>';
  list.forEach((p) => {
    const b = document.createElement('button');
    const img = document.createElement('img');
    img.src = p.img; img.alt = p.caption || p.name; img.loading = 'lazy';
    b.appendChild(img);
    b.onclick = () => view(p);
    $('grid').appendChild(b);
  });
}

window.webxdc.setUpdateListener((update) => {
  const p = update.payload;
  if (p.type === 'add') photos.set(p.id, p);
  if (p.type === 'delete' && photos.has(p.id) && photos.get(p.id).addr === p.addr) photos.delete(p.id);
  render();
});
render();
`
      };
    }
  });
})();
