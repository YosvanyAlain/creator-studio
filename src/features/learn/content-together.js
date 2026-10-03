/* Track 4: shared apps with the webxdc API. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const T = (es, en) => ({ es, en });
  const demo = CS.learn.demo;

  const board = demo({
    title: T('Pizarra compartida', 'Shared board'),
    css: 'body{place-items:start center}main{width:100%;max-width:340px;text-align:start}.row{display:flex;flex-wrap:wrap;gap:6px}.row input{flex:1 1 110px;width:100%;min-width:0}.row button{flex:1 0 auto}ul{list-style:none;padding:0;margin:10px 0 0}li{padding:8px 10px;margin-bottom:6px;border-radius:12px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.08);font-size:14px}li b{color:#5146e0}',
    body: T('<main><div class="row"><input id="txt" placeholder="Escribe algo"><button id="send">Enviar</button></div><ul id="list"></ul></main>', '<main><div class="row"><input id="txt" placeholder="Write something"><button id="send">Send</button></div><ul id="list"></ul></main>'),
    js: "document.getElementById('send').addEventListener('click', () => {\n  const input = document.getElementById('txt');\n  const text = input.value.trim();\n  if (!text) return;\n  webxdc.sendUpdate({ payload: { who: webxdc.selfName, text } }, '');\n  input.value = '';\n});\nwebxdc.setUpdateListener((update) => {\n  const li = document.createElement('li');\n  const who = document.createElement('b');\n  who.textContent = update.payload.who + ': ';\n  li.append(who, update.payload.text);\n  document.getElementById('list').prepend(li);\n});"
  });

  const poll = demo({
    title: T('Votación', 'Vote'),
    css: 'h1{font-size:clamp(16px,8vw,24px)}.opts{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:10px 0}.bar{height:10px;border-radius:99px;background:#e6e7f2;overflow:hidden;margin:4px 0 10px}.bar i{display:block;height:100%;background:#22b8a0;transition:width .3s}.res{text-align:start;font-size:14px;width:100%;max-width:240px}.voters{color:#6b6f88;font-size:12px;min-height:16px}',
    body: T('<main><h1>¿Playa o montaña?</h1><div class="opts"><button data-v="a">Playa</button><button data-v="b">Montaña</button></div><div class="res"><div>Playa <span id="ca">0</span></div><div class="bar"><i id="ba" style="width:0"></i></div><div>Montaña <span id="cb">0</span></div><div class="bar"><i id="bb" style="width:0"></i></div><div class="voters" id="voters"></div></div></main>',
      '<main><h1>Beach or mountains?</h1><div class="opts"><button data-v="a">Beach</button><button data-v="b">Mountains</button></div><div class="res"><div>Beach <span id="ca">0</span></div><div class="bar"><i id="ba" style="width:0"></i></div><div>Mountains <span id="cb">0</span></div><div class="bar"><i id="bb" style="width:0"></i></div><div class="voters" id="voters"></div></div></main>'),
    js: "const votes = {};\ndocument.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => {\n  webxdc.sendUpdate({ payload: { addr: webxdc.selfAddr, name: webxdc.selfName, vote: b.dataset.v } }, '');\n}));\nwebxdc.setUpdateListener((update) => {\n  const p = update.payload;\n  votes[p.addr] = p;\n  const all = Object.values(votes);\n  const a = all.filter((v) => v.vote === 'a').length;\n  const b = all.length - a;\n  document.getElementById('ca').textContent = a;\n  document.getElementById('cb').textContent = b;\n  document.getElementById('ba').style.width = (all.length ? a / all.length * 100 : 0) + '%';\n  document.getElementById('bb').style.width = (all.length ? b / all.length * 100 : 0) + '%';\n  document.getElementById('voters').textContent = all.map((v) => v.name).join(', ');\n});"
  });

  CS.learn.track({
    id: 'together', order: 40, icon: 'users', tint: 'teal',
    title: T('Apps para compartir', 'Apps to share'),
    sub: T('El corazón de webxdc: enviar y recibir', 'The heart of webxdc: send and receive'),
    desc: T('Haz que todas las personas del chat vean lo mismo: mensajes, votos, puntos y turnos.', 'Make everyone in the chat see the same thing: messages, votes, points and turns.'),
    lessons: [
      {
        id: 'together-send', mins: 5,
        title: T('El corazón: sendUpdate', 'The heart: sendUpdate'),
        sub: T('Enviar un cambio a todo el chat', 'Send a change to the whole chat'),
        steps: [
          { t: 'read', art: 'sync', title: T('Un mensaje para todos', 'A message for everyone'),
            body: T('Para que todo el chat vea un cambio, la app envía una **actualización** con `webxdc.sendUpdate`.\n\nLa actualización viaja por el chat y llega a **todas** las copias de la app, también a la tuya.',
              'For the whole chat to see a change, the app sends an **update** with `webxdc.sendUpdate`.\n\nThe update travels through the chat and reaches **every** copy of the app, including yours.') },
          { t: 'read', title: T('Así se escribe', 'This is how it looks'),
            body: T('Lo que quieres compartir va dentro de `payload`. Puede ser un número, un texto o un objeto con varios datos.', 'What you want to share goes inside `payload`. It can be a number, a text or an object with several values.'),
            code: "webxdc.sendUpdate({\n  payload: { add: 1 }\n}, '');" },
          { t: 'try', peers: 2, height: 230, appName: T('Contador compartido', 'Shared counter'),
            q: T('Dos personas, una app. Toca en cualquiera de las dos pantallas.', 'Two people, one app. Tap on either screen.'),
            files: { 'index.html': demo({
              title: T('Contador compartido', 'Shared counter'),
              css: '.n{font-size:60px;font-weight:800;color:#0f766e;margin:0 0 10px}',
              body: T('<main><div class="n" id="n">0</div><button id="b">+1 para todos</button></main>', '<main><div class="n" id="n">0</div><button id="b">+1 for everyone</button></main>'),
              js: "let total = 0;\ndocument.getElementById('b').addEventListener('click', () => {\n  webxdc.sendUpdate({ payload: { add: 1 } }, '');\n});\nwebxdc.setUpdateListener((update) => {\n  total += update.payload.add;\n  document.getElementById('n').textContent = total;\n});"
            }) },
            tip: T('Fíjate: quien toca **no** suma directamente. Envía la actualización y suma cuando le llega, igual que los demás.', 'Notice: whoever taps does **not** add directly. They send the update and add when it arrives, like everyone else.') },
          { t: 'quiz', q: T('Ana envía una actualización. ¿Quién la recibe?', 'Ana sends an update. Who receives it?'),
            opts: T(['Solo las otras personas del chat', 'Todas las personas del chat, incluida Ana', 'Solo Ana'], ['Only the other people in the chat', 'Everyone in the chat, including Ana', 'Only Ana']), a: 1,
            why: T('Quien envía también recibe su propia actualización. Así todas las copias siguen el mismo camino.', 'The sender also receives their own update. That way every copy follows the same path.') },
          { t: 'fill', q: T('Completa el envío de un voto', 'Complete sending a vote'),
            code: "webxdc.[[0]]({\n  [[1]]: { vote: 'pizza' }\n}, '');", blanks: ['sendUpdate', 'payload'], extra: ['setUpdateListener', 'selfName', 'info'] }
        ]
      },
      {
        id: 'together-listen', mins: 5,
        title: T('Escuchar: setUpdateListener', 'Listening: setUpdateListener'),
        sub: T('Recibir lo que llega', 'Receive what arrives'),
        steps: [
          { t: 'read', art: 'chat', title: T('El oído de la app', 'The app\u2019s ear'),
            body: T('`webxdc.setUpdateListener` le dice a la app qué hacer **cada vez que llega una actualización**.\n\nAl abrir la app, recibe primero **todas las actualizaciones anteriores**, en orden. Así quien entra tarde ve lo mismo que los demás.',
              '`webxdc.setUpdateListener` tells the app what to do **every time an update arrives**.\n\nWhen the app opens, it first receives **all previous updates**, in order. That way whoever joins late sees the same as everyone else.'),
            code: T("webxdc.setUpdateListener((update) => {\n  // update.payload es lo que alguien envió\n  mostrar(update.payload);\n});", "webxdc.setUpdateListener((update) => {\n  // update.payload is what someone sent\n  show(update.payload);\n});") },
          { t: 'try', peers: 2, height: 280, appName: T('Pizarra compartida', 'Shared board'),
            q: T('Escribe en una pantalla y envía. El mensaje aparece en las dos con el nombre de quien lo escribió.', 'Write on one screen and send. The message appears on both with the writer\u2019s name.'),
            files: { 'index.html': board } },
          { t: 'order', mono: true, q: T('Ordena el código para escuchar y mostrar cada mensaje', 'Order the code to listen and show each message'),
            items: ['webxdc.setUpdateListener((update) => {', '  const li = document.createElement(\'li\');', '  li.textContent = update.payload.text;', '  list.append(li);', '});'] },
          { t: 'quiz', q: T('Beto abre la app una hora después de que todos votaran. ¿Qué ve?', 'Beto opens the app an hour after everyone voted. What does he see?'),
            opts: T(['Nada, se perdió los votos', 'Todos los votos, porque recibe las actualizaciones anteriores', 'Solo su propio voto'], ['Nothing, he missed the votes', 'Every vote, because he receives the previous updates', 'Only his own vote']), a: 1 },
          { t: 'quiz', q: T('Cada actualización trae un número `serial` que siempre crece. ¿Para qué sirve?', 'Each update carries a `serial` number that always grows. What is it for?'),
            opts: T(['Para saber el orden y cuál fue la última', 'Para elegir el color', 'Para contar personas'], ['To know the order and which was the latest', 'To choose the colour', 'To count people']), a: 0,
            why: T('Con `update.serial` y `update.max_serial` sabes si ya llegaron todas las actualizaciones pendientes.', 'With `update.serial` and `update.max_serial` you know whether all pending updates have arrived.') }
        ]
      },
      {
        id: 'together-who', mins: 4,
        title: T('Quién es quién', 'Who is who'),
        sub: T('selfName y selfAddr', 'selfName and selfAddr'),
        steps: [
          { t: 'read', art: 'sync', title: T('Saber quién eres', 'Knowing who you are'),
            body: T('Cada copia de la app sabe quién la está usando:\n\n- `webxdc.selfName`: el nombre que la persona eligió\n- `webxdc.selfAddr`: un identificador único de esa persona\n\nUsa el **nombre** para mostrar y el **identificador** para contar: así nadie vota dos veces.',
              'Each copy of the app knows who is using it:\n\n- `webxdc.selfName`: the name the person chose\n- `webxdc.selfAddr`: a unique identifier for that person\n\nUse the **name** to display and the **identifier** to count: that way nobody votes twice.') },
          { t: 'try', peers: 2, height: 300, appName: T('Votación', 'Vote'),
            q: T('Vota varias veces desde la misma pantalla: tu voto cambia, pero no se duplica.', 'Vote several times from the same screen: your vote changes but is not counted twice.'),
            files: { 'index.html': poll } },
          { t: 'match', q: T('Une cada dato con su uso', 'Match each value with its use'),
            pairs: T([['selfName', 'Mostrar quién votó'], ['selfAddr', 'Contar un voto por persona'], ['payload', 'Los datos que se envían'], ['serial', 'El orden de las actualizaciones']],
              [['selfName', 'Show who voted'], ['selfAddr', 'Count one vote per person'], ['payload', 'The data being sent'], ['serial', 'The order of updates']]) },
          { t: 'quiz', q: T('Dos personas se llaman «Ana». ¿Qué usas para no mezclar sus votos?', 'Two people are called \u201cAna\u201d. What do you use so their votes do not get mixed?'),
            opts: ['selfName', 'selfAddr', 'payload'], a: 1,
            why: T('Los nombres se pueden repetir; `selfAddr` es único para cada persona.', 'Names can repeat; `selfAddr` is unique to each person.') }
        ]
      },
      {
        id: 'together-good', mins: 4,
        title: T('Buenas costumbres', 'Good habits'),
        sub: T('Apps compartidas que no fallan', 'Shared apps that never break'),
        steps: [
          { t: 'read', art: 'data', title: T('La verdad está en las actualizaciones', 'The truth lives in the updates'),
            body: T('La regla de oro: **todo lo compartido se calcula a partir de las actualizaciones**. Si guardas algo solo en tu teléfono, los demás no lo verán.\n\n- Envía **lo que pasó** («Ana sumó 1»), no el resultado final\n- Usa `localStorage` solo para preferencias personales',
              'The golden rule: **everything shared is computed from the updates**. If you keep something only on your phone, the others will not see it.\n\n- Send **what happened** (\u201cAna added 1\u201d), not the final result\n- Use `localStorage` only for personal preferences') },
          { t: 'read', title: T('Avisar en el chat', 'Notifying the chat'),
            body: T('Una actualización puede dejar un aviso en el chat con `info`, y cambiar el texto bajo el icono de la app con `summary`:', 'An update can leave a notice in the chat with `info`, and change the text under the app icon with `summary`:'),
            code: T("webxdc.sendUpdate({\n  payload: { vote: 'pizza' },\n  info: 'Ana votó por pizza',\n  summary: '3 votos'\n}, '');", "webxdc.sendUpdate({\n  payload: { vote: 'pizza' },\n  info: 'Ana voted for pizza',\n  summary: '3 votes'\n}, '');"),
            note: T('No abuses de `info`: un aviso por cada toque llenaría el chat.', 'Do not overuse `info`: a notice on every tap would flood the chat.') },
          { t: 'quiz', q: T('En un juego de puntos, ¿qué es mejor enviar?', 'In a points game, what is better to send?'),
            opts: T(['«Ana sumó 2 puntos»', '«El total es 15»'], ['\u201cAna scored 2 points\u201d', '\u201cThe total is 15\u201d']), a: 0,
            why: T('Si dos personas envían un total a la vez, uno pisa al otro. Si envían lo que pasó, cada copia suma todo y nadie pierde puntos.', 'If two people send a total at once, one overwrites the other. If they send what happened, every copy adds it all up and nobody loses points.') },
          { t: 'match', q: T('Une cada límite con su motivo', 'Match each limit with its reason'),
            pairs: T([['Sin internet', 'La app solo habla por el chat'], ['Actualizaciones pequeñas', 'Viajan como mensajes'], ['Avisos con medida', 'No llenar el chat']], [['No internet', 'The app only talks through the chat'], ['Small updates', 'They travel as messages'], ['Few notices', 'Do not flood the chat']]) },
          { t: 'quiz', q: T('¿Puede una miniapp cargar una imagen desde una página web?', 'Can a mini app load an image from a website?'),
            opts: T(['Sí, como cualquier web', 'No, todo lo que use debe ir dentro de la app'], ['Yes, like any website', 'No, everything it uses must be inside the app']), a: 1,
            why: T('Las miniapps no tienen acceso a internet. Por eso las imágenes y sonidos van en **Archivos**.', 'Mini apps have no internet access. That is why images and sounds go in **Files**.') }
        ]
      }
    ]
  });
})();
