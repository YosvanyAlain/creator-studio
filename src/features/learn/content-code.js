/* Track 5: JavaScript code. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const T = (es, en) => ({ es, en });
  const demo = CS.learn.demo;

  CS.learn.track({
    id: 'code', order: 50, icon: 'code', tint: 'amber',
    title: T('Código JavaScript', 'JavaScript code'),
    sub: T('Del bloque al código, paso a paso', 'From blocks to code, step by step'),
    desc: T('Cuando quieras ir más allá de los bloques: entiende los archivos, cambia la pantalla con código y aprende a encontrar errores.', 'When you want to go beyond blocks: understand the files, change the screen with code and learn to find mistakes.'),
    lessons: [
      {
        id: 'code-anatomy', mins: 4,
        title: T('Anatomía de una miniapp', 'Anatomy of a mini app'),
        sub: T('Los archivos que la forman', 'The files that make it up'),
        steps: [
          { t: 'read', art: 'publish', title: T('Una caja con archivos', 'A box of files'),
            body: T('Un archivo **.xdc** es en realidad un paquete con varios archivos dentro:\n\n- `index.html`: la página que se abre primero\n- `style.css`: los estilos\n- `app.js`: el código\n- `manifest.toml`: el nombre de la app\n- `icon.png`: el icono que se ve en el chat',
              'An **.xdc** file is really a package with several files inside:\n\n- `index.html`: the page that opens first\n- `style.css`: the styles\n- `app.js`: the code\n- `manifest.toml`: the app name\n- `icon.png`: the icon shown in the chat') },
          { t: 'match', q: T('Une cada archivo con su trabajo', 'Match each file with its job'),
            pairs: T([['index.html', 'La página principal'], ['style.css', 'Colores y tamaños'], ['app.js', 'Lo que pasa al tocar'], ['manifest.toml', 'El nombre de la app'], ['icon.png', 'La imagen del chat']],
              [['index.html', 'The main page'], ['style.css', 'Colours and sizes'], ['app.js', 'What happens on tap'], ['manifest.toml', 'The app name'], ['icon.png', 'The chat picture']]) },
          { t: 'read', title: T('Cómo se conectan', 'How they connect'),
            body: T('`index.html` llama a los demás archivos. `webxdc.js` lo pone la app de chat: no tienes que crearlo.', '`index.html` calls the other files. `webxdc.js` is provided by the chat app: you do not need to create it.'),
            code: '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <link rel="stylesheet" href="style.css">\n  <script src="webxdc.js"></script>\n</head>\n<body>\n  <h1 id="title">Hola</h1>\n  <script src="app.js"></script>\n</body>\n</html>' },
          { t: 'quiz', q: T('¿Por qué el `<script src="app.js">` suele ir al final del `<body>`?', 'Why does `<script src="app.js">` usually go at the end of `<body>`?'),
            opts: T(['Para que las piezas de la página ya existan cuando el código las busque', 'Porque así pesa menos', 'Es obligatorio en todas las webs'], ['So the page pieces already exist when the code looks for them', 'Because it makes it lighter', 'It is required on every website']), a: 0 },
          { t: 'quiz', q: T('¿Qué archivo tienes que cambiar para que la app tenga otro nombre en el chat?', 'Which file do you change to give the app a different name in the chat?'),
            opts: ['app.js', 'manifest.toml', 'style.css'], a: 1,
            why: T('Creator Studio lo actualiza por ti cuando cambias el nombre en **Publicar**.', 'Creator Studio updates it for you when you change the name in **Publish**.') }
        ]
      },
      {
        id: 'code-dom', mins: 5,
        title: T('Buscar y cambiar piezas', 'Find and change pieces'),
        sub: T('getElementById y textContent', 'getElementById and textContent'),
        steps: [
          { t: 'read', art: 'design', title: T('Encontrar una pieza', 'Finding a piece'),
            body: T('Para cambiar algo de la pantalla, primero hay que **encontrarlo** por su `id`. Luego puedes cambiar su texto, su estilo o su contenido.', 'To change something on screen, you first **find** it by its `id`. Then you can change its text, its style or its content.'),
            code: T("const titulo = document.getElementById('title');\ntitulo.textContent = '¡Hola, Ana!';\ntitulo.style.color = 'tomato';", "const title = document.getElementById('title');\ntitle.textContent = 'Hello, Ana!';\ntitle.style.color = 'tomato';") },
          { t: 'fill', q: T('Completa el código para mostrar «Listo» en la pieza con id="estado"', 'Complete the code to show \u201cDone\u201d in the piece with id=\u201cstatus\u201d'),
            code: T("document.[[0]]('estado').[[1]] = 'Listo';", "document.[[0]]('status').[[1]] = 'Done';"), blanks: ['getElementById', 'textContent'], extra: ['sendUpdate', 'color', 'querySelector'] },
          { t: 'try', q: T('Escribe tu nombre en la mini app. El código lee el campo y cambia el saludo al instante.', 'Type your name in the mini app. The code reads the field and changes the greeting instantly.'),
            appName: T('Saludo', 'Greeting'),
            fields: [{ k: 'col', label: T('Color del saludo', 'Greeting colour'), type: 'color', value: '#d9631e' }],
            files: { 'index.html': demo({
              title: T('Saludo', 'Greeting'),
              css: '#hola{color:{{col}};font-size:28px;min-height:40px}',
              body: T('<main><h1 id="hola">¡Hola!</h1><input id="nombre" placeholder="Tu nombre"></main>', '<main><h1 id="hola">Hello!</h1><input id="nombre" placeholder="Your name"></main>'),
              js: T("const campo = document.getElementById('nombre');\ncampo.addEventListener('input', () => {\n  document.getElementById('hola').textContent = '¡Hola, ' + (campo.value || 'desconocido') + '!';\n});", "const field = document.getElementById('nombre');\nfield.addEventListener('input', () => {\n  document.getElementById('hola').textContent = 'Hello, ' + (field.value || 'stranger') + '!';\n});")
            }) } },
          { t: 'quiz', q: T('¿Qué hace `el.style.background = \'gold\'`?', 'What does `el.style.background = \'gold\'` do?'),
            opts: T(['Cambia el fondo de esa pieza a dorado', 'Cambia el texto a «gold»', 'Envía un mensaje al chat'], ['Changes that piece\u2019s background to gold', 'Changes the text to \u201cgold\u201d', 'Sends a message to the chat']), a: 0 },
          { t: 'quiz', q: T('El código busca `getElementById(\'boton\')` pero en el HTML pusiste `id="botón"`. ¿Qué pasa?', 'The code looks for `getElementById(\'btn\')` but the HTML says `id="button"`. What happens?'),
            opts: T(['Funciona igual', 'No encuentra la pieza y da error', 'Crea un botón nuevo'], ['It works anyway', 'It does not find the piece and fails', 'It creates a new button']), a: 1,
            why: T('Los nombres deben coincidir letra por letra. El **revisor** de Creator Studio te avisa de estos fallos.', 'Names must match letter by letter. Creator Studio\u2019s **checker** warns you about these mistakes.') }
        ]
      },
      {
        id: 'code-functions', mins: 5,
        title: T('Funciones y eventos', 'Functions and events'),
        sub: T('Agrupar pasos y reaccionar', 'Group steps and react'),
        steps: [
          { t: 'read', art: 'game', title: T('Una función es una receta', 'A function is a recipe'),
            body: T('Una **función** agrupa pasos con un nombre. La defines una vez y la usas cuando quieras. `addEventListener` conecta un evento con una función.', 'A **function** groups steps under a name. You define it once and use it whenever you like. `addEventListener` connects an event to a function.'),
            code: T("function tirarDado() {\n  const n = Math.floor(Math.random() * 6) + 1;\n  document.getElementById('dado').textContent = n;\n}\n\ndocument.getElementById('tirar').addEventListener('click', tirarDado);", "function rollDie() {\n  const n = Math.floor(Math.random() * 6) + 1;\n  document.getElementById('die').textContent = n;\n}\n\ndocument.getElementById('roll').addEventListener('click', rollDie);") },
          { t: 'try', q: T('Un dado de verdad. Cambia cuántas caras tiene y tíralo.', 'A real die. Change how many sides it has and roll it.'),
            appName: T('Dado', 'Die'),
            fields: [
              { k: 'sides', label: T('Caras', 'Sides'), type: 'range', min: 2, max: 20, value: '6' },
              { k: 'col', label: T('Color', 'Colour'), type: 'color', value: '#5146e0' }
            ],
            files: { 'index.html': demo({
              title: T('Dado', 'Die'),
              css: '.die{width:110px;height:110px;margin:0 auto 14px;border-radius:26px;background:{{col}};color:#fff;font-size:52px;font-weight:800;display:grid;place-items:center;box-shadow:0 16px 30px -16px {{col}};transition:transform .35s}.die.spin{transform:rotate(360deg) scale(.9)}',
              body: T('<main><div class="die" id="dado">?</div><button id="tirar">Tirar dado de {{sides}}</button></main>', '<main><div class="die" id="dado">?</div><button id="tirar">Roll a d{{sides}}</button></main>'),
              js: "function roll() {\n  const die = document.getElementById('dado');\n  die.classList.add('spin');\n  setTimeout(() => {\n    die.textContent = Math.floor(Math.random() * {{sides}}) + 1;\n    die.classList.remove('spin');\n  }, 300);\n}\ndocument.getElementById('tirar').addEventListener('click', roll);"
            }) } },
          { t: 'order', mono: true, q: T('Ordena la función', 'Put the function in order'),
            items: T(['function saludar() {', "  const el = document.getElementById('msg');", "  el.textContent = '¡Hola!';", '}'], ['function greet() {', "  const el = document.getElementById('msg');", "  el.textContent = 'Hi!';", '}']) },
          { t: 'fill', q: T('Conecta el botón con la función', 'Connect the button to the function'),
            code: T("boton.[[0]]('[[1]]', saludar);", "button.[[0]]('[[1]]', greet);"), blanks: ['addEventListener', 'click'], extra: ['getElementById', 'input', 'sendUpdate'] },
          { t: 'quiz', q: T('¿Qué número puede dar `Math.floor(Math.random() * 6) + 1`?', 'Which numbers can `Math.floor(Math.random() * 6) + 1` give?'),
            opts: T(['Del 0 al 5', 'Del 1 al 6', 'Del 1 al 7'], ['0 to 5', '1 to 6', '1 to 7']), a: 1,
            why: T('`Math.random()` da un número entre 0 y casi 1. Por 6, redondeado hacia abajo, da 0 a 5. Más 1: de 1 a 6.', '`Math.random()` gives a number between 0 and almost 1. Times 6, rounded down, gives 0 to 5. Plus 1: 1 to 6.') }
        ]
      },
      {
        id: 'code-debug', mins: 4,
        title: T('Encontrar errores', 'Finding mistakes'),
        sub: T('Detective de código', 'Code detective'),
        steps: [
          { t: 'read', art: 'bug', title: T('Todos nos equivocamos', 'Everyone makes mistakes'),
            body: T('Los errores son normales. Creator Studio te ayuda a encontrarlos:\n\n- La **consola** de **Probar** muestra los mensajes de error y en qué línea están\n- El **revisor** marca problemas comunes y ofrece arreglos\n- **Explicar** te dice qué hace la palabra donde está el cursor',
              'Mistakes are normal. Creator Studio helps you find them:\n\n- The **console** in **Test** shows error messages and which line they are on\n- The **checker** flags common problems and offers fixes\n- **Explain** tells you what the word under the cursor does') },
          { t: 'match', q: T('Une cada error con su causa probable', 'Match each error with its likely cause'),
            pairs: T([['Cannot set properties of null', 'No existe una pieza con ese id'], ['is not defined', 'Un nombre mal escrito'], ['Unexpected token', 'Falta o sobra un símbolo'], ['Nada ocurre al tocar', 'El evento no está conectado']],
              [['Cannot set properties of null', 'No piece has that id'], ['is not defined', 'A misspelled name'], ['Unexpected token', 'A missing or extra symbol'], ['Nothing happens on tap', 'The event is not connected']]) },
          { t: 'quiz', q: T('¿Dónde está el error?', 'Where is the mistake?'),
            code: "const total = 0;\ndocument.getElementById('b').addEventListener('click', () => {\n  total = total + 1;\n});",
            opts: T(['`const` no se puede cambiar: debería ser `let`', 'Falta un punto y coma', 'getElementById está mal escrito'], ['`const` cannot change: it should be `let`', 'A semicolon is missing', 'getElementById is misspelled']), a: 0,
            why: T('`const` guarda un valor fijo. Para un contador que cambia, usa `let`.', '`const` keeps a fixed value. For a counter that changes, use `let`.') },
          { t: 'fill', q: T('Arregla el código: falta cerrar cosas', 'Fix the code: things are left open'),
            code: "if (points > 10[[0]] {\n  show('You win'[[1]];\n[[2]]", blanks: [')', ')', '}'], extra: [']', ';'] },
          { t: 'read', title: T('El método del detective', 'The detective method'),
            body: T('Cuando algo no funciona:\n\n- **Lee** el mensaje de error: casi siempre dice la línea\n- **Revisa** que los nombres coincidan exactamente\n- **Prueba** de a poco: cambia una cosa y mira qué pasa\n- **Escribe** `console.log(valor)` para ver qué vale algo\n\nY si te atascas, mira **Algo no funciona** en Aprender.',
              'When something does not work:\n\n- **Read** the error message: it almost always says the line\n- **Check** that names match exactly\n- **Test** in small steps: change one thing and see what happens\n- **Write** `console.log(value)` to see what something holds\n\nAnd if you get stuck, check **Something is wrong** in Learn.') }
        ]
      }
    ]
  });
})();
