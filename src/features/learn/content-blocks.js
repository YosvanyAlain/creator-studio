/* Track 2: logic with blocks. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const T = (es, en) => ({ es, en });
  const demo = CS.learn.demo;

  CS.learn.track({
    id: 'blocks', order: 20, icon: 'blocks', tint: 'violet',
    title: T('Lógica con bloques', 'Logic with blocks'),
    sub: T('Eventos, variables y decisiones sin escribir código', 'Events, variables and decisions without writing code'),
    desc: T('Aprende a pensar como una app: qué pasa, cuándo pasa y qué recuerda. Todo con piezas que se tocan.', 'Learn to think like an app: what happens, when it happens and what it remembers. All with pieces you tap.'),
    lessons: [
      {
        id: 'blocks-events', mins: 4,
        title: T('Eventos: cuando pasa algo', 'Events: when something happens'),
        sub: T('Las apps reaccionan', 'Apps react'),
        steps: [
          { t: 'read', art: 'touch', title: T('Todo empieza con un evento', 'It all starts with an event'),
            body: T('Una app pasa casi todo el tiempo **esperando**. Cuando ocurre algo, reacciona. A ese algo lo llamamos **evento**:\n\n- **Al iniciar**: la app se abre\n- **Al tocar**: alguien toca un botón\n- **Al cambiar**: alguien escribe en un campo\n- **Cada cierto tiempo**: por ejemplo, cada segundo',
              'An app spends most of its time **waiting**. When something happens, it reacts. We call that something an **event**:\n\n- **On start**: the app opens\n- **On tap**: someone taps a button\n- **On change**: someone types in a field\n- **Every so often**: for example, every second') },
          { t: 'match', q: T('Une cada evento con su momento', 'Match each event with its moment'),
            pairs: T([['Al iniciar', 'Cuando se abre la app'], ['Al tocar', 'Cuando alguien toca un botón'], ['Al cambiar', 'Cuando cambia el texto de un campo'], ['Cada segundo', 'Cuando pasa un segundo']],
              [['On start', 'When the app opens'], ['On tap', 'When someone taps a button'], ['On change', 'When the text of a field changes'], ['Every second', 'When a second goes by']]) },
          { t: 'read', art: 'blocks', title: T('Eventos en la pestaña Bloques', 'Events in the Blocks tab'),
            body: T('En **Bloques**, cada evento es una tarjeta. Dentro pones las acciones, que se ejecutan **de arriba abajo**:\n\n- **Al tocar** el botón «saludar»\n- mostrar «¡Hola!» en «mensaje»\n- reproducir un sonido\n\nEl botón **+** de cada tarjeta abre la paleta con todas las piezas.',
              'In **Blocks**, each event is a card. Inside you put actions, which run **from top to bottom**:\n\n- **On tap** of the \u201cgreet\u201d button\n- show \u201cHi!\u201d in \u201cmessage\u201d\n- play a sound\n\nThe **+** button on each card opens the palette with every piece.') },
          { t: 'try', q: T('Este botón tiene un evento **Al tocar**. Elige qué mensaje aparece y de qué color.', 'This button has an **On tap** event. Choose which message appears and in what colour.'),
            appName: T('Saludo', 'Greeting'),
            fields: [
              { k: 'msg', label: T('Mensaje', 'Message'), value: T('¡Hola! Me tocaste', 'Hi! You tapped me') },
              { k: 'col', label: T('Color del mensaje', 'Message colour'), type: 'color', value: '#e8365d' }
            ],
            files: { 'index.html': demo({
              title: T('Saludo', 'Greeting'),
              css: '#out{font-size:22px;font-weight:800;color:{{col}};min-height:34px;margin-top:16px;transition:transform .2s}#out.pop{transform:scale(1.15)}',
              body: T('<main><button id="saludar">Saludar</button><p id="out"></p></main>', '<main><button id="greet">Greet</button><p id="out"></p></main>'),
              js: T("document.getElementById('saludar').addEventListener('click', () => {\n  const out = document.getElementById('out');\n  out.textContent = '{{msg}}';\n  out.classList.add('pop');\n  setTimeout(() => out.classList.remove('pop'), 200);\n});",
                "document.getElementById('greet').addEventListener('click', () => {\n  const out = document.getElementById('out');\n  out.textContent = '{{msg}}';\n  out.classList.add('pop');\n  setTimeout(() => out.classList.remove('pop'), 200);\n});")
            }) } },
          { t: 'quiz', q: T('Quieres que suene música en cuanto se abre la app. ¿Qué evento usas?', 'You want music to play as soon as the app opens. Which event do you use?'),
            opts: T(['Al tocar', 'Al iniciar', 'Al cambiar'], ['On tap', 'On start', 'On change']), a: 1,
            why: T('**Al iniciar** se ejecuta una vez, nada más abrir la app.', '**On start** runs once, right when the app opens.') },
          { t: 'order', q: T('Queremos sumar un punto al tocar y luego mostrarlo. Ordena las piezas.', 'We want to add a point on tap and then show it. Put the pieces in order.'),
            items: T(['Al tocar el botón', 'sumar 1 a puntos', 'mostrar puntos en la pantalla'], ['On tap of the button', 'add 1 to points', 'show points on the screen']) }
        ]
      },
      {
        id: 'blocks-vars', mins: 4,
        title: T('Variables: la memoria', 'Variables: the memory'),
        sub: T('Guardar números y textos', 'Keep numbers and texts'),
        steps: [
          { t: 'read', art: 'data', title: T('Una caja con nombre', 'A box with a name'),
            body: T('Una **variable** es como una caja con una etiqueta. Dentro guardas algo para usarlo después: los puntos, el nombre de quien juega, si el juego terminó…\n\nPuedes **mirar** lo que hay dentro, **cambiarlo** o **sumarle** algo.',
              'A **variable** is like a box with a label. You keep something inside to use later: the points, the player\u2019s name, whether the game is over\u2026\n\nYou can **look** inside, **change** it or **add** to it.') },
          { t: 'fill', prose: true, q: T('Completa la frase', 'Complete the sentence'),
            code: T('Para contar los toques creo una [[0]] llamada toques que empieza en [[1]]. Cada vez que alguien toca, le [[2]] 1.', 'To count taps I create a [[0]] called taps that starts at [[1]]. Every time someone taps, I [[2]] 1.'),
            blanks: T(['variable', '0', 'sumo'], ['variable', '0', 'add']), extra: T(['lista', '10', 'borro'], ['list', '10', 'delete']) },
          { t: 'try', q: T('Cambia el valor inicial y cuánto suma cada toque.', 'Change the starting value and how much each tap adds.'),
            appName: T('Contador', 'Counter'),
            fields: [
              { k: 'start', label: T('Empieza en', 'Starts at'), type: 'range', min: 0, max: 100, value: '0' },
              { k: 'step', label: T('Cada toque suma', 'Each tap adds'), type: 'range', min: 1, max: 10, value: '1' }
            ],
            files: { 'index.html': demo({
              title: T('Contador', 'Counter'),
              css: '.n{font-size:72px;font-weight:800;color:#5146e0;margin:0 0 12px;font-variant-numeric:tabular-nums}',
              body: T('<main><div class="n" id="n"></div><button id="mas">Sumar</button></main>', '<main><div class="n" id="n"></div><button id="more">Add</button></main>'),
              js: T("let puntos = {{start}};\nconst n = document.getElementById('n');\nn.textContent = puntos;\ndocument.getElementById('mas').addEventListener('click', () => {\n  puntos = puntos + {{step}};\n  n.textContent = puntos;\n});",
                "let points = {{start}};\nconst n = document.getElementById('n');\nn.textContent = points;\ndocument.getElementById('more').addEventListener('click', () => {\n  points = points + {{step}};\n  n.textContent = points;\n});")
            }) } },
          { t: 'quiz', q: T('¿Qué guarda mejor el nombre de quien juega?', 'What is best for keeping the player\u2019s name?'),
            opts: T(['Una variable de texto', 'Una variable de número', 'Un evento'], ['A text variable', 'A number variable', 'An event']), a: 0 },
          { t: 'quiz', q: T('Si puntos vale 5 y se ejecuta «sumar 3 a puntos», ¿cuánto vale ahora?', 'If points is 5 and \u201cadd 3 to points\u201d runs, what is it now?'),
            opts: T(['3', '5', '8', '53'], ['3', '5', '8', '53']), a: 2,
            why: T('5 + 3 = 8. Ojo: si fueran textos, «5» y «3» se pegarían y darían «53».', '5 + 3 = 8. Careful: if they were texts, \u201c5\u201d and \u201c3\u201d would be glued into \u201c53\u201d.') },
          { t: 'read', art: 'sync', title: T('Cada teléfono tiene su memoria', 'Each phone has its own memory'),
            body: T('Una variable vive en el teléfono de cada persona. Para que todo el chat vea lo mismo hay que **enviar** el cambio a los demás.\n\nLo aprenderás en la ruta **Apps para compartir**.',
              'A variable lives on each person\u2019s phone. For the whole chat to see the same thing, you need to **send** the change to the others.\n\nYou will learn how in the **Apps to share** track.') }
        ]
      },
      {
        id: 'blocks-if', mins: 4,
        title: T('Decisiones: si… entonces', 'Decisions: if\u2026 then'),
        sub: T('Que la app piense', 'Make the app think'),
        steps: [
          { t: 'read', art: 'blocks', title: T('Si pasa esto, haz aquello', 'If this happens, do that'),
            body: T('Con el bloque **si** la app decide qué hacer según una condición:\n\n- **si** puntos ≥ 10 **entonces** mostrar «¡Ganaste!»\n- **si no**, mostrar «Sigue intentando»\n\nLa condición siempre se responde con **sí** o **no**. En código se escriben `true` y `false`.',
              'With the **if** block the app decides what to do based on a condition:\n\n- **if** points \u2265 10 **then** show \u201cYou win!\u201d\n- **else**, show \u201cKeep trying\u201d\n\nA condition is always answered with **yes** or **no**. In code they are written `true` and `false`.') },
          { t: 'quiz', q: T('puntos vale 7. ¿Qué muestra el bloque anterior?', 'points is 7. What does the block above show?'),
            opts: T(['¡Ganaste!', 'Sigue intentando', 'Nada'], ['You win!', 'Keep trying', 'Nothing']), a: 1,
            why: T('7 no es mayor ni igual que 10, así que se ejecuta la parte **si no**.', '7 is not greater than or equal to 10, so the **else** part runs.') },
          { t: 'match', q: T('Une cada comparación con su significado', 'Match each comparison with its meaning'),
            pairs: T([['=', 'es igual a'], ['≠', 'es distinto de'], ['>', 'es mayor que'], ['≤', 'es menor o igual que']], [['=', 'is equal to'], ['\u2260', 'is not equal to'], ['>', 'is greater than'], ['\u2264', 'is less than or equal to']]) },
          { t: 'try', q: T('Elige la meta y toca hasta ganar. La app comprueba la condición en cada toque.', 'Pick the goal and tap until you win. The app checks the condition on every tap.'),
            appName: T('Llega a la meta', 'Reach the goal'),
            fields: [{ k: 'goal', label: T('Meta', 'Goal'), type: 'range', min: 3, max: 20, value: '5' }],
            files: { 'index.html': demo({
              title: T('Llega a la meta', 'Reach the goal'),
              css: '.n{font-size:60px;font-weight:800;margin:0}.msg{font-weight:800;font-size:20px;min-height:30px;margin:10px 0 14px}.win{color:#16a34a}.go{color:#6b6f88}',
              body: T('<main><p class="go">Meta: {{goal}}</p><div class="n" id="n">0</div><p class="msg go" id="msg">Sigue intentando</p><button id="b">Tocar</button></main>', '<main><p class="go">Goal: {{goal}}</p><div class="n" id="n">0</div><p class="msg go" id="msg">Keep trying</p><button id="b">Tap</button></main>'),
              js: T("let puntos = 0;\ndocument.getElementById('b').addEventListener('click', () => {\n  puntos += 1;\n  document.getElementById('n').textContent = puntos;\n  const msg = document.getElementById('msg');\n  if (puntos >= {{goal}}) {\n    msg.textContent = '¡Ganaste!';\n    msg.className = 'msg win';\n  } else {\n    msg.textContent = 'Sigue intentando';\n  }\n});",
                "let points = 0;\ndocument.getElementById('b').addEventListener('click', () => {\n  points += 1;\n  document.getElementById('n').textContent = points;\n  const msg = document.getElementById('msg');\n  if (points >= {{goal}}) {\n    msg.textContent = 'You win!';\n    msg.className = 'msg win';\n  } else {\n    msg.textContent = 'Keep trying';\n  }\n});")
            }) } },
          { t: 'order', q: T('Construye la decisión en orden', 'Build the decision in order'),
            items: T(['si edad ≥ 16', 'mostrar «Puedes participar»', 'si no', 'mostrar «Todavía no»'], ['if age \u2265 16', 'show \u201cYou can take part\u201d', 'else', 'show \u201cNot yet\u201d']) },
          { t: 'quiz', q: T('Un juego debe terminar cuando el tiempo llegue a 0. ¿Qué condición usas?', 'A game must end when the time reaches 0. Which condition do you use?'),
            opts: T(['si tiempo = 0', 'si tiempo > 0', 'si puntos = 0'], ['if time = 0', 'if time > 0', 'if points = 0']), a: 0 }
        ]
      },
      {
        id: 'blocks-lists', mins: 5,
        title: T('Listas y repeticiones', 'Lists and loops'),
        sub: T('Muchas cosas a la vez', 'Many things at once'),
        steps: [
          { t: 'read', art: 'data', title: T('Una lista guarda muchas cosas', 'A list keeps many things'),
            body: T('Una **lista** es una fila de cajas: la lista de la compra, los jugadores, las preguntas de un concurso.\n\n- **añadir** algo al final\n- **contar** cuántos elementos hay\n- **recorrer** la lista: repetir una acción con cada elemento',
              'A **list** is a row of boxes: the shopping list, the players, the questions of a quiz.\n\n- **add** something at the end\n- **count** how many items there are\n- **go through** the list: repeat an action with each item') },
          { t: 'try', q: T('Escribe y añade cosas a la lista. Cambia el título y el color de las marcas.', 'Type and add things to the list. Change the title and the colour of the marks.'),
            appName: T('Mi lista', 'My list'), height: 300,
            fields: [
              { k: 'title', label: T('Título', 'Title'), value: T('Lista de la compra', 'Shopping list') },
              { k: 'col', label: T('Color', 'Colour'), type: 'color', value: '#22b8a0' }
            ],
            files: { 'index.html': demo({
              title: T('Mi lista', 'My list'),
              css: 'body{place-items:start center}main{width:100%;max-width:340px;text-align:start}.row{display:flex;flex-wrap:wrap;gap:8px}.row input{flex:1 1 140px;width:100%;min-width:0}ul{list-style:none;padding:0;margin:14px 0 0}li{display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:6px;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.08)}li::before{content:"";width:12px;height:12px;border-radius:50%;background:{{col}}}.count{color:#6b6f88;font-size:13px}',
              body: T('<main><h1>{{title}}</h1><p class="count" id="count">0 cosas</p><div class="row"><input id="item" placeholder="Pan, leche…"><button id="add">Añadir</button></div><ul id="list"></ul></main>', '<main><h1>{{title}}</h1><p class="count" id="count">0 things</p><div class="row"><input id="item" placeholder="Bread, milk\u2026"><button id="add">Add</button></div><ul id="list"></ul></main>'),
              js: T("const cosas = [];\nfunction mostrar() {\n  const ul = document.getElementById('list');\n  ul.innerHTML = '';\n  for (const cosa of cosas) {\n    const li = document.createElement('li');\n    li.textContent = cosa;\n    ul.appendChild(li);\n  }\n  document.getElementById('count').textContent = cosas.length + ' cosas';\n}\ndocument.getElementById('add').addEventListener('click', () => {\n  const input = document.getElementById('item');\n  if (input.value.trim()) cosas.push(input.value.trim());\n  input.value = '';\n  mostrar();\n});",
                "const things = [];\nfunction show() {\n  const ul = document.getElementById('list');\n  ul.innerHTML = '';\n  for (const thing of things) {\n    const li = document.createElement('li');\n    li.textContent = thing;\n    ul.appendChild(li);\n  }\n  document.getElementById('count').textContent = things.length + ' things';\n}\ndocument.getElementById('add').addEventListener('click', () => {\n  const input = document.getElementById('item');\n  if (input.value.trim()) things.push(input.value.trim());\n  input.value = '';\n  show();\n});")
            }) } },
          { t: 'quiz', q: T('La lista tiene: pan, leche, huevos. ¿Cuántos elementos tiene?', 'The list has: bread, milk, eggs. How many items does it have?'),
            opts: T(['2', '3', '4'], ['2', '3', '4']), a: 1 },
          { t: 'fill', prose: true, q: T('Completa la frase', 'Complete the sentence'),
            code: T('Para mostrar a todos los jugadores, [[0]] la lista y, por [[1]] jugador, muestro su nombre.', 'To show every player, I [[0]] the list and, for [[1]] player, I show their name.'),
            blanks: T(['recorro', 'cada'], ['go through', 'each']), extra: T(['borro', 'ningún'], ['delete', 'no']) },
          { t: 'read', art: 'game', title: T('Repetir sin cansarse', 'Repeat without getting tired'),
            body: T('El bloque **repetir** ejecuta las mismas acciones varias veces: «repetir 10 veces: dibujar una estrella».\n\nJunto con las listas, te ahorra copiar y pegar, y si luego quieres 20 estrellas solo cambias un número.',
              'The **repeat** block runs the same actions several times: \u201crepeat 10 times: draw a star\u201d.\n\nTogether with lists, it saves you copying and pasting, and if you later want 20 stars you change just one number.') },
          { t: 'quiz', q: T('¿Qué es lo más cómodo para dibujar 50 estrellas?', 'What is the easiest way to draw 50 stars?'),
            opts: T(['Un bloque repetir 50 veces', 'Cincuenta bloques iguales', 'Un evento Al iniciar sin nada dentro'], ['A repeat 50 times block', 'Fifty identical blocks', 'An empty On start event']), a: 0,
            why: T('Repetir es más corto y fácil de cambiar.', 'Repeat is shorter and easier to change.') }
        ]
      }
    ]
  });
})();
