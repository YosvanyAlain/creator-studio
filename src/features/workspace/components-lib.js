/* Insertable building blocks: HTML pieces (with companion CSS/JS), CSS recipes and JS recipes. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const L = [];
  const add = (def) => L.push(def);

  /* ---------- HTML pieces ---------- */
  add({ id: 'button', kind: 'html', cat: 'basic', icon: 'cursor',
    name: { es: 'Botón', en: 'Button' }, desc: { es: 'Un botón que hace algo al tocarlo.', en: 'A button that does something when tapped.' },
    code: '<button id="boton" class="btn">Tócame</button>\n',
    css: '.btn {\n  font: inherit;\n  border: 0;\n  border-radius: 14px;\n  padding: 12px 20px;\n  min-height: 46px;\n  background: #5146e0;\n  color: #fff;\n  font-weight: 700;\n}\n.btn:active { transform: scale(.97); }\n',
    js: "document.getElementById('boton').addEventListener('click', () => {\n  console.log('¡Tocado!');\n});\n" });
  add({ id: 'title', kind: 'html', cat: 'basic', icon: 'text',
    name: { es: 'Título y texto', en: 'Title and text' }, desc: { es: 'Un encabezado con un párrafo debajo.', en: 'A heading with a paragraph below.' },
    code: '<h1>Mi app</h1>\n<p>Escribe aquí una frase que explique tu app.</p>\n' });
  add({ id: 'field', kind: 'html', cat: 'form', icon: 'edit',
    name: { es: 'Campo con botón', en: 'Field with button' }, desc: { es: 'Escribe algo y envíalo.', en: 'Type something and send it.' },
    code: '<form id="formulario" class="fila">\n  <input id="texto" placeholder="Escribe algo…" autocomplete="off">\n  <button class="btn">Enviar</button>\n</form>\n',
    css: '.fila { display: flex; gap: 8px; }\n.fila input {\n  flex: 1;\n  min-width: 0;\n  font: inherit;\n  padding: 12px;\n  border: 1px solid #ccd;\n  border-radius: 12px;\n}\n',
    js: "document.getElementById('formulario').addEventListener('submit', (event) => {\n  event.preventDefault();\n  const campo = document.getElementById('texto');\n  const valor = campo.value.trim();\n  if (!valor) return;\n  console.log('Escribiste:', valor);\n  campo.value = '';\n});\n" });
  add({ id: 'list', kind: 'html', cat: 'basic', icon: 'list',
    name: { es: 'Lista', en: 'List' }, desc: { es: 'Una lista que puedes llenar desde el código.', en: 'A list you can fill from code.' },
    code: '<ul id="lista" class="lista"></ul>\n',
    css: '.lista { list-style: none; padding: 0; margin: 12px 0; }\n.lista li {\n  padding: 12px 14px;\n  margin-bottom: 8px;\n  border-radius: 12px;\n  background: #f1f0ff;\n}\n',
    js: "function agregarALista(texto) {\n  const li = document.createElement('li');\n  li.textContent = texto;\n  document.getElementById('lista').append(li);\n}\n" });
  add({ id: 'card', kind: 'html', cat: 'layout', icon: 'component',
    name: { es: 'Tarjeta', en: 'Card' }, desc: { es: 'Un recuadro con título, texto y botón.', en: 'A box with title, text and button.' },
    code: '<div class="tarjeta">\n  <h2>Título</h2>\n  <p>Un texto corto dentro de la tarjeta.</p>\n  <button class="btn">Acción</button>\n</div>\n',
    css: '.tarjeta {\n  padding: 18px;\n  border-radius: 18px;\n  background: #fff;\n  box-shadow: 0 6px 24px rgba(30, 20, 90, .12);\n  margin: 12px 0;\n}\n.tarjeta h2 { margin: 0 0 6px; }\n' });
  add({ id: 'counter', kind: 'html', cat: 'basic', icon: 'plus',
    name: { es: 'Contador', en: 'Counter' }, desc: { es: 'Un número con botones para sumar y restar.', en: 'A number with plus and minus buttons.' },
    code: '<div class="contador">\n  <button id="menos" class="btn">−</button>\n  <span id="numero">0</span>\n  <button id="mas" class="btn">+</button>\n</div>\n',
    css: '.contador { display: flex; align-items: center; justify-content: center; gap: 18px; }\n#numero { font-size: 48px; font-weight: 800; min-width: 2ch; text-align: center; }\n',
    js: "let numero = 0;\nfunction mostrarNumero() {\n  document.getElementById('numero').textContent = numero;\n}\ndocument.getElementById('mas').addEventListener('click', () => { numero += 1; mostrarNumero(); });\ndocument.getElementById('menos').addEventListener('click', () => { numero -= 1; mostrarNumero(); });\n" });
  add({ id: 'image', kind: 'html', cat: 'media', icon: 'image',
    name: { es: 'Imagen', en: 'Image' }, desc: { es: 'Muestra una imagen subida al proyecto.', en: 'Shows an image uploaded to the project.' },
    code: '<img src="img/foto.png" alt="Describe la imagen" class="imagen">\n',
    css: '.imagen { display: block; max-width: 100%; height: auto; border-radius: 14px; }\n' });
  add({ id: 'sound', kind: 'html', cat: 'media', icon: 'music',
    name: { es: 'Botón con sonido', en: 'Sound button' }, desc: { es: 'Reproduce un sonido al tocarlo.', en: 'Plays a sound when tapped.' },
    code: '<button id="sonar" class="btn">Sonar</button>\n<audio id="sonido" src="sounds/sonido.mp3" preload="auto"></audio>\n',
    js: "document.getElementById('sonar').addEventListener('click', () => {\n  const audio = document.getElementById('sonido');\n  audio.currentTime = 0;\n  audio.play();\n});\n" });
  add({ id: 'select', kind: 'html', cat: 'form', icon: 'chevronDown',
    name: { es: 'Selector', en: 'Picker' }, desc: { es: 'Elige una opción de una lista.', en: 'Choose one option from a list.' },
    code: '<label>Elige un color\n  <select id="opcion">\n    <option value="rojo">Rojo</option>\n    <option value="verde">Verde</option>\n    <option value="azul">Azul</option>\n  </select>\n</label>\n',
    js: "document.getElementById('opcion').addEventListener('change', (event) => {\n  console.log('Elegiste', event.target.value);\n});\n" });
  add({ id: 'slider', kind: 'html', cat: 'form', icon: 'sliders',
    name: { es: 'Deslizador', en: 'Slider' }, desc: { es: 'Elige un número arrastrando.', en: 'Pick a number by dragging.' },
    code: '<label>Volumen: <b id="valor">50</b>\n  <input id="deslizador" type="range" min="0" max="100" value="50">\n</label>\n',
    js: "document.getElementById('deslizador').addEventListener('input', (event) => {\n  document.getElementById('valor').textContent = event.target.value;\n});\n" });
  add({ id: 'check', kind: 'html', cat: 'form', icon: 'checkCircle',
    name: { es: 'Casilla', en: 'Checkbox' }, desc: { es: 'Marcar o desmarcar algo.', en: 'Tick or untick something.' },
    code: '<label class="casilla"><input id="hecho" type="checkbox"> Hecho</label>\n',
    css: '.casilla { display: flex; align-items: center; gap: 10px; padding: 10px 0; }\n.casilla input { width: 22px; height: 22px; }\n' });
  add({ id: 'grid', kind: 'html', cat: 'layout', icon: 'grid',
    name: { es: 'Cuadrícula', en: 'Grid' }, desc: { es: 'Casillas en filas y columnas, ideal para juegos.', en: 'Cells in rows and columns, great for games.' },
    code: '<div id="tablero" class="tablero"></div>\n',
    css: '.tablero {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 8px;\n  max-width: 320px;\n  margin: 0 auto;\n}\n.tablero button {\n  aspect-ratio: 1;\n  font-size: 32px;\n  border: 0;\n  border-radius: 14px;\n  background: #ecebff;\n}\n',
    js: "const tablero = document.getElementById('tablero');\nfor (let i = 0; i < 9; i++) {\n  const casilla = document.createElement('button');\n  casilla.addEventListener('click', () => { casilla.textContent = '⭐'; });\n  tablero.append(casilla);\n}\n" });
  add({ id: 'modal', kind: 'html', cat: 'layout', icon: 'square',
    name: { es: 'Ventana de aviso', en: 'Message box' }, desc: { es: 'Un aviso dentro de la página (mejor que alert).', en: 'A notice inside the page (better than alert).' },
    code: '<div id="aviso" class="aviso" hidden>\n  <div class="aviso-caja">\n    <p id="aviso-texto">¡Hola!</p>\n    <button id="aviso-ok" class="btn">Vale</button>\n  </div>\n</div>\n',
    css: '.aviso {\n  position: fixed;\n  inset: 0;\n  display: grid;\n  place-items: center;\n  background: rgba(10, 8, 30, .45);\n}\n.aviso[hidden] { display: none; }\n.aviso-caja { background: #fff; padding: 22px; border-radius: 20px; max-width: 300px; text-align: center; }\n',
    js: "function avisar(texto) {\n  document.getElementById('aviso-texto').textContent = texto;\n  document.getElementById('aviso').hidden = false;\n}\ndocument.getElementById('aviso-ok').addEventListener('click', () => {\n  document.getElementById('aviso').hidden = true;\n});\n" });

  /* ---------- CSS recipes ---------- */
  add({ id: 'css-center', kind: 'css', cat: 'layout', icon: 'fit',
    name: { es: 'Centrar todo', en: 'Center everything' }, desc: { es: 'Coloca el contenido en el centro de la pantalla.', en: 'Puts content in the middle of the screen.' },
    code: 'body {\n  min-height: 100vh;\n  margin: 0;\n  display: grid;\n  place-items: center;\n  text-align: center;\n}\n' });
  add({ id: 'css-base', kind: 'css', cat: 'basic', icon: 'text',
    name: { es: 'Base bonita', en: 'Nice base' }, desc: { es: 'Letra moderna, márgenes y colores suaves.', en: 'Modern font, spacing and soft colors.' },
    code: 'body {\n  font-family: system-ui, sans-serif;\n  margin: 0;\n  padding: 20px;\n  background: #f6f5ff;\n  color: #1d1a3a;\n  line-height: 1.5;\n}\n' });
  add({ id: 'css-dark', kind: 'css', cat: 'basic', icon: 'moon',
    name: { es: 'Modo oscuro', en: 'Dark mode' }, desc: { es: 'Colores oscuros si el teléfono usa tema oscuro.', en: 'Dark colors when the phone uses dark theme.' },
    code: '@media (prefers-color-scheme: dark) {\n  body {\n    background: #12111f;\n    color: #ecebff;\n  }\n}\n' });
  add({ id: 'css-grid', kind: 'css', cat: 'layout', icon: 'grid',
    name: { es: 'Columnas automáticas', en: 'Auto columns' }, desc: { es: 'Tarjetas que se acomodan solas al ancho.', en: 'Cards that adapt to the width.' },
    code: '.columnas {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));\n  gap: 12px;\n}\n' });
  add({ id: 'css-pop', kind: 'css', cat: 'media', icon: 'sparkles',
    name: { es: 'Animación de aparición', en: 'Pop-in animation' }, desc: { es: 'Un elemento que aparece con un saltito.', en: 'An element that appears with a little bounce.' },
    code: '.aparecer { animation: aparecer .35s ease-out; }\n@keyframes aparecer {\n  from { opacity: 0; transform: scale(.8); }\n  to { opacity: 1; transform: scale(1); }\n}\n' });
  add({ id: 'css-button', kind: 'css', cat: 'basic', icon: 'cursor',
    name: { es: 'Botón moderno', en: 'Modern button' }, desc: { es: 'Botones redondeados con efecto al tocar.', en: 'Rounded buttons with a press effect.' },
    code: 'button {\n  font: inherit;\n  font-weight: 700;\n  border: 0;\n  border-radius: 14px;\n  padding: 12px 20px;\n  background: #5146e0;\n  color: #fff;\n  transition: transform .1s;\n}\nbutton:active { transform: scale(.96); }\n' });

  /* ---------- JS recipes ---------- */
  add({ id: 'js-click', kind: 'js', cat: 'basic', icon: 'cursor',
    name: { es: 'Al tocar un botón', en: 'When a button is tapped' }, desc: { es: 'Ejecuta código cuando tocan un elemento.', en: 'Runs code when an element is tapped.' },
    code: "document.getElementById('boton').addEventListener('click', () => {\n  console.log('¡Tocado!');\n});\n" });
  add({ id: 'js-send', kind: 'js', cat: 'chat', icon: 'send',
    name: { es: 'Enviar a todos', en: 'Send to everyone' }, desc: { es: 'Comparte datos con todas las personas del chat.', en: 'Shares data with everyone in the chat.' },
    code: "function enviar(datos) {\n  webxdc.sendUpdate({ payload: datos }, '');\n}\n" });
  add({ id: 'js-receive', kind: 'js', cat: 'chat', icon: 'download',
    name: { es: 'Recibir de todos', en: 'Receive from everyone' }, desc: { es: 'Reacciona a lo que envía cada persona (también tú).', en: 'Reacts to what each person sends (you too).' },
    code: "webxdc.setUpdateListener((update) => {\n  const datos = update.payload;\n  console.log('Llegó', datos);\n});\n" });
  add({ id: 'js-shared-list', kind: 'js', cat: 'chat', icon: 'users',
    name: { es: 'Lista compartida', en: 'Shared list' }, desc: { es: 'Todos añaden elementos y todos ven la misma lista.', en: 'Everyone adds items and everyone sees the same list.' },
    code: "const elementos = [];\n\nfunction pintar() {\n  const lista = document.getElementById('lista');\n  lista.innerHTML = '';\n  for (const e of elementos) {\n    const li = document.createElement('li');\n    li.textContent = e.texto + ' · ' + e.autor;\n    lista.append(li);\n  }\n}\n\nfunction agregar(texto) {\n  webxdc.sendUpdate({ payload: { texto, autor: webxdc.selfName } }, '');\n}\n\nwebxdc.setUpdateListener((update) => {\n  elementos.push(update.payload);\n  pintar();\n});\n" });
  add({ id: 'js-save', kind: 'js', cat: 'basic', icon: 'save',
    name: { es: 'Guardar en el teléfono', en: 'Save on the phone' }, desc: { es: 'Recuerda un dato aunque cierres la app.', en: 'Remembers data even after closing the app.' },
    code: "function guardar(clave, valor) {\n  localStorage.setItem(clave, JSON.stringify(valor));\n}\n\nfunction leer(clave, porDefecto) {\n  const texto = localStorage.getItem(clave);\n  return texto === null ? porDefecto : JSON.parse(texto);\n}\n" });
  add({ id: 'js-random', kind: 'js', cat: 'game', icon: 'dice',
    name: { es: 'Número al azar', en: 'Random number' }, desc: { es: 'Un número o un elemento al azar.', en: 'A random number or item.' },
    code: "function azar(min, max) {\n  return Math.floor(Math.random() * (max - min + 1)) + min;\n}\n\nfunction elegir(lista) {\n  return lista[azar(0, lista.length - 1)];\n}\n" });
  add({ id: 'js-timer', kind: 'js', cat: 'game', icon: 'clock',
    name: { es: 'Cuenta atrás', en: 'Countdown' }, desc: { es: 'Cuenta segundos hacia cero.', en: 'Counts seconds down to zero.' },
    code: "let segundos = 30;\nconst reloj = setInterval(() => {\n  segundos -= 1;\n  console.log('Quedan', segundos);\n  if (segundos <= 0) {\n    clearInterval(reloj);\n    console.log('¡Tiempo!');\n  }\n}, 1000);\n" });
  add({ id: 'js-me', kind: 'js', cat: 'chat', icon: 'user',
    name: { es: '¿Quién soy?', en: 'Who am I?' }, desc: { es: 'El nombre y la dirección de quien usa la app.', en: 'Name and address of whoever uses the app.' },
    code: "const miNombre = webxdc.selfName;\nconst miDireccion = webxdc.selfAddr;\n" });
  add({ id: 'js-chat', kind: 'js', cat: 'chat', icon: 'chat',
    name: { es: 'Enviar al chat', en: 'Send to chat' }, desc: { es: 'Manda un mensaje o un archivo al chat.', en: 'Sends a message or a file to the chat.' },
    code: "webxdc.sendToChat({ text: '¡Mira mi resultado!' });\n" });
  add({ id: 'js-realtime', kind: 'js', cat: 'chat', icon: 'bolt',
    name: { es: 'Tiempo real', en: 'Realtime' }, desc: { es: 'Mensajes instantáneos que no se guardan (juegos rápidos).', en: 'Instant messages that are not stored (fast games).' },
    code: "const canal = webxdc.joinRealtimeChannel();\ncanal.setListener((bytes) => {\n  const texto = new TextDecoder().decode(bytes);\n  console.log('Tiempo real:', texto);\n});\n\nfunction enviarRapido(texto) {\n  canal.send(new TextEncoder().encode(texto));\n}\n" });
  add({ id: 'js-keys', kind: 'js', cat: 'game', icon: 'keyboard',
    name: { es: 'Teclas y deslizar', en: 'Keys and swipes' }, desc: { es: 'Detecta flechas y deslizamientos del dedo.', en: 'Detects arrow keys and finger swipes.' },
    code: "function mover(direccion) {\n  console.log('Mover', direccion);\n}\n\ndocument.addEventListener('keydown', (e) => {\n  const mapa = { ArrowUp: 'arriba', ArrowDown: 'abajo', ArrowLeft: 'izquierda', ArrowRight: 'derecha' };\n  if (mapa[e.key]) mover(mapa[e.key]);\n});\n\nlet inicio = null;\ndocument.addEventListener('touchstart', (e) => { inicio = e.touches[0]; });\ndocument.addEventListener('touchend', (e) => {\n  if (!inicio) return;\n  const dx = e.changedTouches[0].clientX - inicio.clientX;\n  const dy = e.changedTouches[0].clientY - inicio.clientY;\n  if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;\n  if (Math.abs(dx) > Math.abs(dy)) mover(dx > 0 ? 'derecha' : 'izquierda');\n  else mover(dy > 0 ? 'abajo' : 'arriba');\n});\n" });

  CS.componentLib = L;
})();
