/* Track 1: first steps. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const T = (es, en) => ({ es, en });
  const demo = CS.learn.demo;

  const sharedCounter = demo({
    title: T('Contador compartido', 'Shared counter'),
    css: '.n{font-size:64px;font-weight:800;margin:4px 0 12px;color:#5146e0}.who{font-size:13px;color:#6b6f88}',
    body: T('<main><div class="who">Toques de todo el chat</div><div class="n" id="n">0</div><button id="b">Tocar +1</button></main>',
      '<main><div class="who">Taps from the whole chat</div><div class="n" id="n">0</div><button id="b">Tap +1</button></main>'),
    js: "let total = 0;\nconst n = document.getElementById('n');\ndocument.getElementById('b').onclick = () => {\n  webxdc.sendUpdate({ payload: { add: 1 } }, '');\n};\nwebxdc.setUpdateListener((update) => {\n  total += update.payload.add;\n  n.textContent = total;\n});"
  });

  CS.learn.track({
    id: 'start', order: 10, icon: 'rocket', tint: 'indigo',
    title: T('Primeros pasos', 'First steps'),
    sub: T('Qué es una miniapp y cómo nace la tuya', 'What a mini app is and how yours is born'),
    desc: T('Descubre qué son las miniapps, crea la primera en minutos y aprende a probarla y compartirla.', 'Find out what mini apps are, build your first one in minutes and learn to test and share it.'),
    lessons: [
      {
        id: 'start-what', mins: 3,
        title: T('¿Qué es una miniapp?', 'What is a mini app?'),
        sub: T('Apps que viven dentro del chat', 'Apps that live inside the chat'),
        steps: [
          { t: 'read', art: 'chat', title: T('Apps dentro del chat', 'Apps inside the chat'),
            body: T('Una **miniapp** (también llamada **webxdc**) es una app pequeña que se envía a un chat como si fuera un archivo.\n\nCuando alguien la abre, aparece dentro de la conversación y **todas las personas del chat comparten lo que pasa**: los votos de una encuesta, los puntos de un juego, la lista de la compra.',
              'A **mini app** (also called **webxdc**) is a small app you send to a chat as if it were a file.\n\nWhen someone opens it, it appears inside the conversation and **everyone in the chat shares what happens**: the votes of a poll, the points of a game, the shopping list.') },
          { t: 'read', art: 'sync', title: T('Funciona sin internet', 'It works without internet'),
            body: T('Las miniapps no necesitan internet ni servidores. Viajan **con los mensajes del chat**: cuando alguien toca un botón, la app envía un pequeño mensaje a los demás.\n\n- Sin cuentas ni contraseñas\n- Sin anuncios ni rastreo\n- Funcionan aunque la conexión sea lenta',
              'Mini apps need no internet and no servers. They travel **with the chat messages**: when someone taps a button, the app sends a tiny message to the others.\n\n- No accounts or passwords\n- No ads or tracking\n- They work even on a slow connection') },
          { t: 'quiz', q: T('¿Dónde se ejecuta una miniapp?', 'Where does a mini app run?'),
            opts: T(['En un servidor de internet', 'Dentro del chat, en el teléfono de cada persona', 'Solo en una computadora'], ['On an internet server', 'Inside the chat, on each person\u2019s phone', 'Only on a computer']), a: 1,
            why: T('Cada persona la abre en su propio teléfono, dentro del chat. Por eso funciona sin internet.', 'Each person opens it on their own phone, inside the chat. That is why it works without internet.') },
          { t: 'read', art: 'game', title: T('¿Qué puedes crear?', 'What can you build?'),
            body: T('Casi cualquier cosa que quepa en una pantalla:\n\n- **Juegos** por turnos o en tiempo real\n- **Encuestas** y votaciones\n- **Listas** compartidas, tareas y calendarios\n- **Herramientas** como calculadoras o pizarras\n\nY con Creator Studio puedes hacerlas **sin saber programar**.',
              'Almost anything that fits on a screen:\n\n- **Games**, turn-based or real time\n- **Polls** and votes\n- Shared **lists**, tasks and calendars\n- **Tools** like calculators or whiteboards\n\nAnd with Creator Studio you can build them **without knowing how to code**.') },
          { t: 'match', q: T('Une cada palabra con su significado', 'Match each word with its meaning'),
            pairs: T([['.xdc', 'El archivo de la miniapp'], ['Chat', 'Donde vive y se comparte'], ['Actualización', 'Un mensaje que la app envía a todos'], ['Creator Studio', 'Donde la construyes']],
              [['.xdc', 'The mini app file'], ['Chat', 'Where it lives and is shared'], ['Update', 'A message the app sends to everyone'], ['Creator Studio', 'Where you build it']]) },
          { t: 'quiz', q: T('¿Qué ocurre cuando alguien vota en una encuesta webxdc?', 'What happens when someone votes in a webxdc poll?'),
            opts: T(['Solo esa persona ve su voto', 'Todas las personas del chat ven el voto', 'El voto se pierde al cerrar la app'], ['Only that person sees the vote', 'Everyone in the chat sees the vote', 'The vote is lost when the app closes']), a: 1,
            why: T('La app envía una **actualización** a todo el chat, así que cada copia de la app recibe el voto.', 'The app sends an **update** to the whole chat, so every copy of the app receives the vote.') }
        ]
      },
      {
        id: 'start-first', mins: 4,
        title: T('Tu primera app en 3 pasos', 'Your first app in 3 steps'),
        sub: T('Crear, probar y compartir', 'Create, test and share'),
        steps: [
          { t: 'read', art: 'start', title: T('El camino de toda miniapp', 'The path of every mini app'),
            body: T('Todas las apps siguen el mismo camino:\n\n- **Crear**: eliges una plantilla o empiezas en blanco\n- **Probar**: la ves funcionar como si estuvieras en un chat\n- **Compartir**: la conviertes en un archivo .xdc y la envías\n\nVamos a practicarlo ahora mismo.',
              'Every app follows the same path:\n\n- **Create**: pick a template or start blank\n- **Test**: watch it work as if you were in a chat\n- **Share**: turn it into an .xdc file and send it\n\nLet\u2019s practise it right now.') },
          { t: 'try', q: T('Personaliza tu primera app. Cambia el saludo y los colores: la vista previa se actualiza sola.', 'Customise your first app. Change the greeting and the colours: the preview updates by itself.'),
            appName: T('Mi primera app', 'My first app'), height: 280,
            fields: [
              { k: 'title', label: T('Saludo', 'Greeting'), value: T('¡Hola, mundo!', 'Hello, world!') },
              { k: 'bg', label: T('Color de la tarjeta', 'Card colour'), type: 'color', value: '#5146e0' },
              { k: 'fg', label: T('Color del texto', 'Text colour'), type: 'color', value: '#ffffff' }
            ],
            files: { 'index.html': demo({
              title: T('Mi primera app', 'My first app'),
              css: '.card{background:{{bg}};color:{{fg}};padding:26px 22px;border-radius:24px;box-shadow:0 18px 40px -20px {{bg}};max-width:320px}.card button{background:{{fg}};color:{{bg}};margin-top:10px}.n{opacity:.85;font-size:14px;min-height:20px}',
              body: T('<main class="card"><h1>{{title}}</h1><p>Mi primera miniapp</p><button id="b">Tócame</button><p class="n" id="n"></p></main>', '<main class="card"><h1>{{title}}</h1><p>My first mini app</p><button id="b">Tap me</button><p class="n" id="n"></p></main>'),
              js: T("let taps = 0;\ndocument.getElementById('b').onclick = () => {\n  taps += 1;\n  document.getElementById('n').textContent = 'Toques: ' + taps;\n};", "let taps = 0;\ndocument.getElementById('b').onclick = () => {\n  taps += 1;\n  document.getElementById('n').textContent = 'Taps: ' + taps;\n};")
            }) } },
          { t: 'order', q: T('Ordena los pasos para crear una miniapp', 'Put the steps to build a mini app in order'),
            items: T(['Crear el proyecto', 'Editar textos y colores', 'Probarla en la pestaña Probar', 'Compartir el archivo .xdc'], ['Create the project', 'Edit texts and colours', 'Try it in the Test tab', 'Share the .xdc file']) },
          { t: 'quiz', q: T('Tu app está lista. ¿Cómo llega a tus amigos?', 'Your app is ready. How does it reach your friends?'),
            opts: T(['La subes a una tienda de apps', 'Envías el archivo .xdc a un chat', 'Les mandas un enlace web'], ['You upload it to an app store', 'You send the .xdc file to a chat', 'You send them a web link']), a: 1,
            why: T('En **Publicar** puedes enviarla directamente a un chat o descargar el archivo.', 'In **Publish** you can send it straight to a chat or download the file.') },
          { t: 'read', art: 'design', title: T('Un truco', 'A trick'),
            body: T('¿Viste el botón **Guardar como app** encima de la vista previa? Cualquier ejemplo de las lecciones se puede convertir en un proyecto tuyo para seguir jugando con él en el taller.',
              'Did you notice the **Save as app** button above the preview? Any lesson example can become one of your projects so you can keep playing with it in the workshop.') }
        ]
      },
      {
        id: 'start-tour', mins: 3,
        title: T('Un paseo por el taller', 'A tour of the workshop'),
        sub: T('Las pestañas de tu proyecto', 'Your project tabs'),
        steps: [
          { t: 'read', art: 'blocks', title: T('Tu taller', 'Your workshop'),
            body: T('Al abrir un proyecto entras al **taller**. Cada pestaña tiene una tarea:\n\n- **Bloques**: lógica sin escribir código\n- **Código**: los archivos HTML, CSS y JavaScript\n- **Probar**: tu app funcionando, con una o varias personas\n- **Archivos**: imágenes, sonidos y demás recursos\n- **Publicar**: nombre, icono y envío al chat',
              'Opening a project takes you to the **workshop**. Each tab has a job:\n\n- **Blocks**: logic without writing code\n- **Code**: the HTML, CSS and JavaScript files\n- **Test**: your app running, with one or more people\n- **Files**: images, sounds and other resources\n- **Publish**: name, icon and sending to the chat') },
          { t: 'match', q: T('Une cada pestaña con lo que hace', 'Match each tab with what it does'),
            pairs: T([['Bloques', 'Crear lógica tocando piezas'], ['Código', 'Escribir HTML, CSS y JS'], ['Probar', 'Ver la app en marcha'], ['Archivos', 'Guardar imágenes y sonidos'], ['Publicar', 'Enviar la app al chat']],
              [['Blocks', 'Build logic by tapping pieces'], ['Code', 'Write HTML, CSS and JS'], ['Test', 'Watch the app running'], ['Files', 'Keep images and sounds'], ['Publish', 'Send the app to the chat']]) },
          { t: 'quiz', q: T('Quieres ver la app con dos personas a la vez. ¿Qué pestaña usas?', 'You want to see the app with two people at once. Which tab do you use?'),
            opts: T(['Archivos', 'Probar', 'Publicar'], ['Files', 'Test', 'Publish']), a: 1,
            why: T('En **Probar** eliges hasta 4 personas y ves cómo se sincronizan.', 'In **Test** you choose up to 4 people and watch them sync.') },
          { t: 'read', art: 'bug', title: T('Sin miedo a equivocarte', 'No fear of mistakes'),
            body: T('Creator Studio guarda tu trabajo solo. Además tienes:\n\n- **Deshacer y rehacer** en el editor y en los bloques\n- **Instantáneas**: fotos de tu proyecto para volver atrás\n- El **revisor**, que avisa de errores y a veces los arregla con un toque',
              'Creator Studio saves your work by itself. You also get:\n\n- **Undo and redo** in the editor and in blocks\n- **Snapshots**: photos of your project to go back to\n- The **checker**, which flags mistakes and sometimes fixes them with one tap') },
          { t: 'quiz', q: T('Borraste algo por accidente hace un rato. ¿Qué te ayuda a recuperarlo?', 'You deleted something by accident a while ago. What helps you get it back?'),
            opts: T(['Una instantánea del proyecto', 'Crear un proyecto nuevo', 'Cerrar la app'], ['A project snapshot', 'Creating a new project', 'Closing the app']), a: 0,
            why: T('Las instantáneas guardan el proyecto tal como estaba. Puedes volver a cualquiera.', 'Snapshots keep the project exactly as it was. You can go back to any of them.') }
        ]
      },
      {
        id: 'start-share', mins: 4,
        title: T('Probar y compartir', 'Test and share'),
        sub: T('De tu teléfono al chat', 'From your phone to the chat'),
        steps: [
          { t: 'read', art: 'sync', title: T('Prueba con varias personas', 'Test with several people'),
            body: T('En **Probar** la app corre en pantallas simuladas. Cada pantalla es una persona distinta: Ana, Beto, Cris y Dani.\n\nLo que una persona hace llega a las demás, igual que en un chat real.',
              'In **Test** the app runs on simulated screens. Each screen is a different person: Ana, Beto, Cris and Dani.\n\nWhat one person does reaches the others, just like in a real chat.') },
          { t: 'try', peers: 2, height: 250, save: false,
            q: T('Toca el botón en una pantalla y mira la otra. Así se siente una app compartida.', 'Tap the button on one screen and watch the other. This is what a shared app feels like.'),
            files: { 'index.html': sharedCounter } },
          { t: 'quiz', q: T('En la prueba de arriba, ¿por qué el número cambia en las dos pantallas?', 'In the test above, why does the number change on both screens?'),
            opts: T(['Porque comparten la misma pantalla', 'Porque la app envía una actualización a todos', 'Es una coincidencia'], ['Because they share the same screen', 'Because the app sends an update to everyone', 'It is a coincidence']), a: 1,
            why: T('Cada toque envía una actualización. Todas las copias de la app la reciben y suman 1.', 'Every tap sends an update. Every copy of the app receives it and adds 1.') },
          { t: 'read', art: 'publish', title: T('Publicar', 'Publishing'),
            body: T('Cuando tu app esté lista, ve a **Publicar**:\n\n- Ponle un **nombre** claro\n- Elige o dibuja un **icono**\n- Toca **Enviar al chat** o descarga el archivo **.xdc**\n\nQuien lo reciba solo tiene que tocarlo para abrirlo.',
              'When your app is ready, go to **Publish**:\n\n- Give it a clear **name**\n- Pick or draw an **icon**\n- Tap **Send to chat** or download the **.xdc** file\n\nWhoever receives it just taps it to open it.') },
          { t: 'order', q: T('Ordena lo que pasa al compartir', 'Put what happens when sharing in order'),
            items: T(['Tocas Enviar al chat', 'El archivo .xdc llega al chat', 'Tus amigos lo abren', 'Todos usan la app juntos'], ['You tap Send to chat', 'The .xdc file arrives in the chat', 'Your friends open it', 'Everyone uses the app together']) },
          { t: 'quiz', q: T('¿Tus amigos necesitan Creator Studio para usar tu app?', 'Do your friends need Creator Studio to use your app?'),
            opts: T(['Sí, siempre', 'No, basta con abrir el .xdc en el chat'], ['Yes, always', 'No, opening the .xdc in the chat is enough']), a: 1,
            why: T('Creator Studio solo hace falta para crear. Las miniapps funcionan en cualquier chat que admita webxdc.', 'Creator Studio is only needed to build. Mini apps work in any chat that supports webxdc.') }
        ]
      }
    ]
  });
})();
