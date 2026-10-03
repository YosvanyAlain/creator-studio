/* Dictionary, part 2: JavaScript, DOM, webxdc, beginner snippets, and the lookup API. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const list = (CS.dictData = CS.dictData || []);
  const add = (kind, lang, rows) => rows.forEach((r) => list.push({ n: r[0], k: kind, lang, es: r[1], en: r[2], s: r[3] || null }));

  add('keyword', 'js', [
    ['let', 'Crea una variable que puede cambiar.', 'Creates a variable that can change.', 'let ${nombre} = ${0};'],
    ['const', 'Crea una constante: un valor que no se vuelve a asignar.', 'Creates a constant: a value that is not reassigned.', 'const ${nombre} = ${valor};'],
    ['var', 'La forma antigua de crear variables. Mejor usa let o const.', 'The old way to create variables. Prefer let or const.'],
    ['function', 'Define una función: un bloque de código con nombre que puedes repetir.', 'Defines a function: a named block of code you can reuse.', 'function ${nombre}(${}) {\n  ${}\n}'],
    ['return', 'Termina la función y devuelve un valor.', 'Ends the function and gives back a value.'],
    ['if', 'Ejecuta código solo si algo es verdadero.', 'Runs code only if something is true.', 'if (${condicion}) {\n  ${}\n}'],
    ['else', 'Lo que pasa si la condición del if no se cumple.', 'What happens when the if condition is false.'],
    ['for', 'Repite código un número de veces.', 'Repeats code a number of times.', 'for (let i = 0; i < ${10}; i++) {\n  ${}\n}'],
    ['while', 'Repite mientras algo sea verdadero.', 'Repeats while something is true.', 'while (${condicion}) {\n  ${}\n}'],
    ['of', 'Recorre cada elemento de una lista: for (const x of lista).', 'Goes through each item of a list: for (const x of list).'],
    ['break', 'Sale de un bucle.', 'Leaves a loop.'],
    ['continue', 'Salta a la siguiente vuelta del bucle.', 'Skips to the next loop round.'],
    ['switch', 'Elige entre varios casos según un valor.', 'Chooses between several cases by value.'],
    ['true', 'Verdadero.', 'True.'],
    ['false', 'Falso.', 'False.'],
    ['null', 'Vacío a propósito: no hay valor.', 'Empty on purpose: no value.'],
    ['undefined', 'Sin definir: la variable aún no tiene valor.', 'Not defined: the variable has no value yet.'],
    ['new', 'Crea un objeto nuevo a partir de un tipo, como new Date().', 'Creates a new object from a type, like new Date().'],
    ['class', 'Define un molde para crear objetos parecidos.', 'Defines a template to create similar objects.'],
    ['this', 'El objeto que está ejecutando el código.', 'The object running the code.'],
    ['async', 'Marca una función que puede esperar con await.', 'Marks a function that can wait with await.'],
    ['await', 'Espera a que termine una promesa.', 'Waits for a promise to finish.'],
    ['try', 'Intenta algo que podría fallar; el error se atrapa en catch.', 'Tries something that might fail; catch handles the error.', 'try {\n  ${}\n} catch (error) {\n  console.error(error);\n}'],
    ['catch', 'Recibe el error si algo dentro de try falla.', 'Receives the error if something in try fails.'],
    ['typeof', 'Dice el tipo de un valor: "number", "string"…', 'Tells the type of a value: "number", "string"…'],
    ['=>', 'Función flecha: una forma corta de escribir funciones.', 'Arrow function: a short way to write functions.'],
    ['===', 'Compara si dos valores son exactamente iguales.', 'Checks if two values are exactly equal.'],
    ['!==', 'Compara si dos valores son distintos.', 'Checks if two values are different.'],
    ['&&', 'Y: las dos condiciones deben cumplirse.', 'And: both conditions must be true.'],
    ['||', 'O: basta con que se cumpla una condición.', 'Or: one condition is enough.']
  ]);

  add('api', 'js', [
    ['document', 'La página actual. Desde aquí buscas y cambias elementos.', 'The current page. Use it to find and change elements.'],
    ['getElementById', 'Busca un elemento por su id.', 'Finds an element by its id.', "document.getElementById('${id}')"],
    ['querySelector', 'Busca el primer elemento que encaja con un selector CSS.', 'Finds the first element matching a CSS selector.', "document.querySelector('${.clase}')"],
    ['querySelectorAll', 'Busca todos los elementos que encajan con un selector.', 'Finds all elements matching a selector.'],
    ['addEventListener', 'Hace algo cuando ocurre un evento, como un toque.', 'Does something when an event happens, like a tap.', "addEventListener('${click}', () => {\n  ${}\n})"],
    ['textContent', 'El texto de un elemento, sin HTML.', 'The text of an element, without HTML.'],
    ['innerHTML', 'El HTML de dentro de un elemento. Cuidado con texto que escriben otras personas.', 'The HTML inside an element. Be careful with text written by others.'],
    ['value', 'Lo que hay escrito en un campo.', 'What is typed in a field.'],
    ['classList', 'Añade, quita o alterna clases: add, remove, toggle.', 'Adds, removes or toggles classes: add, remove, toggle.', "classList.toggle('${activo}')"],
    ['createElement', 'Crea un elemento nuevo desde el código.', 'Creates a new element from code.', "document.createElement('${div}')"],
    ['appendChild', 'Mete un elemento dentro de otro.', 'Puts an element inside another.'],
    ['append', 'Añade elementos o texto al final.', 'Adds elements or text at the end.'],
    ['remove', 'Quita el elemento de la página.', 'Removes the element from the page.'],
    ['setAttribute', 'Pone el valor de un atributo.', 'Sets an attribute value.'],
    ['style', 'Cambia estilos desde el código, como el.style.color = "red".', 'Changes styles from code, like el.style.color = "red".'],
    ['dataset', 'Lee los atributos data- de un elemento.', 'Reads the data- attributes of an element.'],
    ['focus', 'Pone el cursor en un campo.', 'Puts the cursor in a field.'],
    ['console.log', 'Escribe un mensaje en la consola para revisar tu código.', 'Writes a message to the console to check your code.', 'console.log(${mensaje});'],
    ['console.error', 'Escribe un error en la consola.', 'Writes an error to the console.'],
    ['setTimeout', 'Ejecuta algo una vez después de unos milisegundos.', 'Runs something once after some milliseconds.', 'setTimeout(() => {\n  ${}\n}, ${1000});'],
    ['setInterval', 'Ejecuta algo una y otra vez cada cierto tiempo.', 'Runs something again and again at an interval.', 'setInterval(() => {\n  ${}\n}, ${1000});'],
    ['clearInterval', 'Detiene un setInterval.', 'Stops a setInterval.'],
    ['requestAnimationFrame', 'Dibuja el siguiente fotograma de una animación o juego.', 'Draws the next frame of an animation or game.'],
    ['Math.random', 'Un número al azar entre 0 y 1.', 'A random number between 0 and 1.', 'Math.floor(Math.random() * ${6}) + 1'],
    ['Math.floor', 'Redondea hacia abajo.', 'Rounds down.'],
    ['Math.round', 'Redondea al entero más cercano.', 'Rounds to the nearest whole number.'],
    ['Math.max', 'El mayor de varios números.', 'The largest of several numbers.'],
    ['Math.min', 'El menor de varios números.', 'The smallest of several numbers.'],
    ['Number', 'Convierte un texto en número.', 'Turns text into a number.'],
    ['String', 'Convierte un valor en texto.', 'Turns a value into text.'],
    ['parseInt', 'Convierte un texto en número entero.', 'Turns text into a whole number.'],
    ['JSON.stringify', 'Convierte datos en texto para guardarlos o enviarlos.', 'Turns data into text to store or send it.'],
    ['JSON.parse', 'Convierte texto JSON de vuelta en datos.', 'Turns JSON text back into data.'],
    ['localStorage', 'Guarda datos en este dispositivo. No se comparte con el chat.', 'Saves data on this device. Not shared with the chat.', "localStorage.setItem('${clave}', ${valor})"],
    ['Date', 'Fechas y horas.', 'Dates and times.', 'new Date()'],
    ['Date.now', 'La hora actual en milisegundos.', 'The current time in milliseconds.'],
    ['push', 'Añade un elemento al final de una lista.', 'Adds an item to the end of a list.'],
    ['length', 'Cuántos elementos tiene una lista o cuántas letras un texto.', 'How many items a list has, or letters a text has.'],
    ['map', 'Crea una lista nueva transformando cada elemento.', 'Makes a new list by transforming each item.'],
    ['filter', 'Crea una lista con los elementos que cumplen una condición.', 'Makes a list with the items that pass a test.'],
    ['forEach', 'Hace algo con cada elemento de una lista.', 'Does something with each item of a list.', 'forEach((${item}) => {\n  ${}\n})'],
    ['find', 'Devuelve el primer elemento que cumple una condición.', 'Returns the first item that passes a test.'],
    ['includes', 'Dice si una lista o texto contiene algo.', 'Tells if a list or text contains something.'],
    ['sort', 'Ordena una lista.', 'Sorts a list.'],
    ['join', 'Une los elementos de una lista en un texto.', 'Joins the items of a list into a text.'],
    ['split', 'Corta un texto en una lista.', 'Cuts a text into a list.'],
    ['trim', 'Quita los espacios del principio y del final.', 'Removes spaces at the start and end.'],
    ['toUpperCase', 'Pasa un texto a mayúsculas.', 'Turns text to upper case.'],
    ['Object.keys', 'La lista de claves de un objeto.', 'The list of keys of an object.'],
    ['getContext', 'Prepara un canvas para dibujar.', 'Prepares a canvas for drawing.', "getContext('2d')"],
    ['fillRect', 'Dibuja un rectángulo relleno en un canvas.', 'Draws a filled rectangle on a canvas.'],
    ['fillText', 'Escribe texto en un canvas.', 'Writes text on a canvas.'],
    ['drawImage', 'Dibuja una imagen en un canvas.', 'Draws an image on a canvas.'],
    ['clearRect', 'Borra una zona del canvas.', 'Clears an area of the canvas.'],
    ['play', 'Reproduce un audio o vídeo.', 'Plays an audio or video.'],
    ['navigator.vibrate', 'Hace vibrar el móvil (si lo permite).', 'Vibrates the phone (if allowed).']
  ]);

  add('webxdc', 'js', [
    ['webxdc', 'El puente entre tu app y el chat. Lo pone el mensajero; solo añade <script src="webxdc.js">.', 'The bridge between your app and the chat. The messenger provides it; just add <script src="webxdc.js">.'],
    ['sendUpdate', 'Envía datos a todas las personas del chat, incluida tú.', 'Sends data to everyone in the chat, including you.', 'webxdc.sendUpdate({ payload: ${datos} }, \'\');'],
    ['setUpdateListener', 'Recibe cada dato enviado, también los antiguos al abrir la app.', 'Receives every update sent, including older ones when the app opens.', 'webxdc.setUpdateListener((update) => {\n  const datos = update.payload;\n  ${}\n});'],
    ['payload', 'Los datos que viajan en una actualización.', 'The data carried by an update.'],
    ['selfAddr', 'Un identificador único de la persona que usa la app.', 'A unique identifier of the person using the app.'],
    ['selfName', 'El nombre visible de la persona que usa la app.', 'The display name of the person using the app.'],
    ['sendToChat', 'Prepara un mensaje o archivo para enviarlo a un chat.', 'Prepares a message or file to send to a chat.', "webxdc.sendToChat({ text: '${Hola}' });"],
    ['importFiles', 'Deja elegir archivos del dispositivo.', 'Lets the person choose files from the device.', "webxdc.importFiles({ extensions: ['${.png}'] }).then((files) => {\n  ${}\n});"],
    ['joinRealtimeChannel', 'Canal en tiempo real para juegos rápidos. Los datos no se guardan.', 'Realtime channel for fast games. Data is not stored.'],
    ['info', 'Un aviso corto que aparece en el chat al enviar una actualización.', 'A short notice shown in the chat when an update is sent.'],
    ['summary', 'Un texto corto que aparece bajo el icono de la app en el chat.', 'A short text shown under the app icon in the chat.'],
    ['serial', 'El número de orden de una actualización.', 'The order number of an update.'],
    ['sendUpdateMaxSize', 'El tamaño máximo de una actualización.', 'The maximum size of an update.']
  ]);

  /* Beginner snippets: plain words that expand into working code. */
  add('snippet', 'html', [
    ['boton', 'Un botón con id.', 'A button with an id.', '<button id="${boton}">${Tocar}</button>'],
    ['campo', 'Un campo para escribir.', 'A text field.', '<input id="${campo}" placeholder="${Escribe aquí}">'],
    ['imagen', 'Una imagen del proyecto.', 'An image from the project.', '<img src="${imagen.png}" alt="${}">'],
    ['lista', 'Una lista con elementos.', 'A list with items.', '<ul id="${lista}">\n  <li>${elemento}</li>\n</ul>'],
    ['tarjeta', 'Una tarjeta con título y texto.', 'A card with a title and text.', '<div class="tarjeta">\n  <h2>${Título}</h2>\n  <p>${Texto}</p>\n</div>'],
    ['pagina', 'Una página HTML completa lista para webxdc.', 'A complete HTML page ready for webxdc.', '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>${Mi app}</title>\n  <link rel="stylesheet" href="style.css">\n  <script src="webxdc.js"></script>\n</head>\n<body>\n  ${}\n  <script src="app.js"></script>\n</body>\n</html>'],
    ['button', 'A button with an id.', 'A button with an id.', '<button id="${button}">${Tap}</button>'],
    ['page', 'Una página HTML completa lista para webxdc.', 'A complete HTML page ready for webxdc.', '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>${My app}</title>\n  <link rel="stylesheet" href="style.css">\n  <script src="webxdc.js"></script>\n</head>\n<body>\n  ${}\n  <script src="app.js"></script>\n</body>\n</html>']
  ]);
  add('snippet', 'css', [
    ['centrar', 'Centra el contenido en ambas direcciones.', 'Centers content in both directions.', 'display: flex;\njustify-content: center;\nalign-items: center;'],
    ['tarjeta', 'Estilo de tarjeta con sombra.', 'A card style with a shadow.', '.tarjeta {\n  background: #fff;\n  border-radius: 16px;\n  padding: 16px;\n  box-shadow: 0 4px 16px rgba(0, 0, 0, .08);\n}'],
    ['boton', 'Un botón bonito.', 'A nice button.', 'button {\n  background: ${#5146e0};\n  color: #fff;\n  border: 0;\n  border-radius: 12px;\n  padding: 12px 18px;\n  font-size: 16px;\n}'],
    ['center', 'Centra el contenido en ambas direcciones.', 'Centers content in both directions.', 'display: flex;\njustify-content: center;\nalign-items: center;'],
    ['oscuro', 'Colores para el modo oscuro del sistema.', 'Colors for the system dark mode.', '@media (prefers-color-scheme: dark) {\n  body { background: #111; color: #eee; }\n}']
  ]);
  add('snippet', 'js', [
    ['tocar', 'Hace algo cuando tocan un botón.', 'Does something when a button is tapped.', "document.getElementById('${boton}').addEventListener('click', () => {\n  ${}\n});"],
    ['ontap', 'Hace algo cuando tocan un botón.', 'Does something when a button is tapped.', "document.getElementById('${button}').addEventListener('click', () => {\n  ${}\n});"],
    ['si', 'Si se cumple una condición…', 'If a condition is true…', 'if (${condicion}) {\n  ${}\n}'],
    ['sino', 'Si se cumple… si no…', 'If… otherwise…', 'if (${condicion}) {\n  ${}\n} else {\n  ${}\n}'],
    ['repetir', 'Repite algo varias veces.', 'Repeats something several times.', 'for (let i = 0; i < ${10}; i++) {\n  ${}\n}'],
    ['funcion', 'Crea una función.', 'Creates a function.', 'function ${nombre}() {\n  ${}\n}'],
    ['azar', 'Un número al azar entre 1 y N.', 'A random number from 1 to N.', 'Math.floor(Math.random() * ${6}) + 1'],
    ['esperar', 'Hace algo después de un tiempo.', 'Does something after a while.', 'setTimeout(() => {\n  ${}\n}, ${1000});'],
    ['cada', 'Hace algo cada cierto tiempo.', 'Does something at an interval.', 'setInterval(() => {\n  ${}\n}, ${1000});'],
    ['enviar', 'Envía datos a todas las personas del chat.', 'Sends data to everyone in the chat.', "webxdc.sendUpdate({ payload: ${datos}, info: '${}' }, '');"],
    ['recibir', 'Recibe los datos que envía cualquiera.', 'Receives data sent by anyone.', 'webxdc.setUpdateListener((update) => {\n  const datos = update.payload;\n  ${}\n});'],
    ['send', 'Envía datos a todas las personas del chat.', 'Sends data to everyone in the chat.', "webxdc.sendUpdate({ payload: ${data}, info: '${}' }, '');"],
    ['receive', 'Recibe los datos que envía cualquiera.', 'Receives data sent by anyone.', 'webxdc.setUpdateListener((update) => {\n  const data = update.payload;\n  ${}\n});'],
    ['guardar', 'Guarda un dato en este dispositivo.', 'Saves a value on this device.', "localStorage.setItem('${clave}', JSON.stringify(${valor}));"],
    ['cargar', 'Lee un dato guardado en este dispositivo.', 'Reads a value saved on this device.', "JSON.parse(localStorage.getItem('${clave}') || '${null}')"],
    ['mostrar', 'Pone un texto dentro de un elemento.', 'Puts text inside an element.', "document.getElementById('${id}').textContent = ${texto};"],
    ['elemento', 'Busca un elemento por su id.', 'Finds an element by its id.', "const ${el} = document.getElementById('${id}');"],
    ['bucle', 'El ciclo que dibuja tu juego muchas veces por segundo.', 'The loop that draws your game many times per second.', 'function frame(time) {\n  ${}\n  requestAnimationFrame(frame);\n}\nrequestAnimationFrame(frame);'],
    ['gameloop', 'El ciclo que dibuja tu juego muchas veces por segundo.', 'The loop that draws your game many times per second.', 'function frame(time) {\n  ${}\n  requestAnimationFrame(frame);\n}\nrequestAnimationFrame(frame);']
  ]);

  /* ---------- Lookup API ---------- */
  const fold = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const byName = new Map();
  function index() {
    byName.clear();
    for (const e of list) {
      const key = fold(e.n.replace(/^(console\.|Math\.|JSON\.|Object\.|Date\.|navigator\.)/, (m) => m));
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key).push(e);
      const short = key.split('.').pop();
      if (short !== key) { if (!byName.has(short)) byName.set(short, []); byName.get(short).push(e); }
    }
  }
  index();

  const text = (e) => (CS.i18n.lang === 'es' ? e.es : e.en);

  function lookup(word, lang) {
    const hits = byName.get(fold(word)) || [];
    const real = hits.filter((e) => e.k !== 'snippet');
    const pool = real.length ? real : hits;
    return pool.find((e) => !lang || e.lang === lang) || pool[0] || null;
  }

  function search(query, limit) {
    const q = fold(query).trim();
    if (!q) return [];
    const scored = [];
    for (const e of list) {
      const n = fold(e.n);
      const body = fold(text(e));
      const score = n === q ? 0 : n.startsWith(q) ? 1 : n.includes(q) ? 2 : body.includes(q) ? 3 : -1;
      if (score >= 0) scored.push([score, e]);
    }
    scored.sort((a, b) => a[0] - b[0] || a[1].n.localeCompare(b[1].n));
    return scored.slice(0, limit || 40).map((x) => x[1]);
  }

  function forLang(lang) { return list.filter((e) => e.lang === lang); }

  CS.dict = { lookup, search, forLang, text, all: () => list.slice(), reindex: index, KINDS: ['tag', 'attr', 'prop', 'keyword', 'api', 'webxdc', 'snippet'] };
})();
