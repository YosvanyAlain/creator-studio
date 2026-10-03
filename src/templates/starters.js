/* New-project starters: blocks, code and game. Text follows the language chosen at creation. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const TP = CS.templates;
  const { T, kit } = TP;

  /* Blocks: a shared counter wired entirely with blocks. */
  TP.addStarter({
    id: 'blocks', icon: 'blocks', tint: 'violet', tab: 'blocks',
    name: T('Con bloques', 'With blocks'),
    desc: T('Arma la lógica encajando piezas. Empieza con un contador compartido listo para cambiar.', 'Build the logic by snapping pieces. Starts with a ready-to-change shared counter.'),
    fields: [{ k: 'title', value: T('Mi app', 'My app') }],
    files(l, v) {
      const X = (es, en) => (l === 'en' ? en : es);
      return {
        'index.html': kit.page({ lang: l, title: v.title, body: [
          '  <main class="app">',
          '    <header class="top">',
          '      <div class="logo">✨</div>',
          '      <div><h1>' + kit.esc(v.title) + '</h1><p>' + X('Hecha con bloques', 'Made with blocks') + '</p></div>',
          '    </header>',
          '    <section class="card center">',
          '      <div id="count" class="big">0</div>',
          '      <p id="who" class="muted small">' + X('Toca el botón', 'Tap the button') + '</p>',
          '      <button id="tap">+1</button>',
          '    </section>',
          '  </main>'
        ].join('\n') }),
        'style.css': kit.css('#7c5cff', '.big { font-size: 4rem; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1.1; }\n#tap { width: 100%; margin-top: 8px; font-size: 1.2rem; }')
      };
    },
    blocks(l) {
      const X = (es, en) => (l === 'en' ? en : es);
      const vr = (name) => ({ kind: 'var', name });
      let n = 0;
      const b = (type, params) => ({ id: 'st' + (++n), type, params });
      return {
        version: 2,
        vars: [{ name: 'count', value: '0' }, { name: 'me', value: '' }],
        contexts: {
          onStart: [b('set_var_self_name', { name: 'me' })],
          onUpdate: [b('read_update', { name: 'count', key: 'count' }), b('set_text', { id: 'count', value: vr('count') })],
          onClick: [{ target: 'tap', blocks: [
            b('change_var', { name: 'count', delta: '1' }),
            b('set_text', { id: 'count', value: vr('count') }),
            b('play_tone', { freq: '660', ms: '80', wave: 'sine', vol: '0.3' }),
            b('send_update', { key: 'count', value: vr('count'), info: '', summary: X('Contador', 'Counter') })
          ] }],
          onChange: [], onTouch: [], functions: []
        }
      };
    }
  });

  /* Code: three clean files with short comments that explain the webxdc pieces. */
  TP.addStarter({
    id: 'code', icon: 'code', tint: 'amber', tab: 'code',
    name: T('Con código', 'With code'),
    desc: T('HTML, CSS y JavaScript limpios, con el puente webxdc ya conectado.', 'Clean HTML, CSS and JavaScript with the webxdc bridge already wired.'),
    fields: [{ k: 'title', value: T('Mi app', 'My app') }],
    files(l, v) {
      const X = (es, en) => (l === 'en' ? en : es);
      return {
        'index.html': kit.page({ lang: l, title: v.title, body: [
          '  <main class="app">',
          '    <header class="top">',
          '      <div class="logo">👋</div>',
          '      <div><h1>' + kit.esc(v.title) + '</h1><p id="hello"></p></div>',
          '    </header>',
          '    <form id="form" class="row">',
          '      <input id="text" class="grow" placeholder="' + X('Escribe algo', 'Write something') + '" maxlength="200" autocomplete="off">',
          '      <button>' + X('Enviar', 'Send') + '</button>',
          '    </form>',
          '    <ul id="list" class="list"></ul>',
          '  </main>'
        ].join('\n') }),
        'style.css': kit.css('#e8890c', '.list li { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; }\n.list b { margin-right: 6px; }'),
        'app.js': [
          X('/* Tu app empieza aquí. */', '/* Your app starts here. */'),
          kit.helpers(l, ['$', 'esc']),
          '',
          '$(\'hello\').textContent = ' + kit.js(X('Hola, ', 'Hi, ')) + ' + window.webxdc.selfName;',
          '',
          X('/* Enviar: todas las personas del chat reciben la actualización (tú también). */', '/* Send: everyone in the chat gets the update (you too). */'),
          "$('form').addEventListener('submit', (event) => {",
          '  event.preventDefault();',
          "  const text = $('text').value.trim();",
          '  if (!text) return;',
          "  window.webxdc.sendUpdate({ payload: { text, name: window.webxdc.selfName } }, '');",
          "  $('text').value = '';",
          '});',
          '',
          X('/* Recibir: llega cada actualización, también las antiguas al abrir la app. */', '/* Receive: every update arrives, old ones too when the app opens. */'),
          'window.webxdc.setUpdateListener((update) => {',
          '  const { text, name } = update.payload;',
          "  const li = document.createElement('li');",
          "  li.innerHTML = '<b>' + esc(name) + '</b>' + esc(text);",
          "  $('list').prepend(li);",
          '});',
          ''
        ].join('\n')
      };
    }
  });

  /* Game: one of the engine stacks, fully editable in Blocks. */
  TP.addStarter({
    id: 'game', icon: 'gamepad', tint: 'pink', tab: 'blocks',
    name: T('Un juego', 'A game'),
    desc: T('Un juego que ya funciona, hecho con bloques de juego: cámbialo pieza a pieza.', 'A working game made with game blocks: change it piece by piece.'),
    fields: [
      { k: 'title', value: T('Mi juego', 'My game') },
      { k: 'kind', type: 'choice', value: 'catch', options: [
        { v: 'catch', label: T('Atrapa la fruta', 'Catch the fruit') },
        { v: 'platformer', label: T('Plataformas', 'Platformer') },
        { v: 'shooter', label: T('Nave espacial', 'Space shooter') }] }
    ],
    files(l, v) {
      return {
        'index.html': kit.page({ lang: l, title: v.title, body: '  <canvas id="game"></canvas>' }),
        'style.css': [
          'html, body { margin: 0; height: 100%; background: #0b1020; }',
          'body { display: flex; flex-direction: column; justify-content: center; overflow: hidden; touch-action: none; user-select: none; -webkit-user-select: none; }',
          ''
        ].join('\n')
      };
    },
    blocks(l, v) {
      const G = CS.blocks && CS.blocks.GAME;
      const s = G && (G.STARTERS.find((x) => x.id === v.kind) || G.STARTERS[0]);
      if (!s) return null;
      const m = CS.blocks.newModel();
      m.vars = s.vars.map((x) => ({ name: x[0], value: x[1] }));
      m.contexts.onStart = s.build(l).filter(Boolean);
      return m;
    }
  });
})();
