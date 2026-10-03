/* Text tools: regular expression tester with plain-language explanations, and a sample data generator. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, ui } = CS;
  const TL = CS.tools;
  const t = (...a) => CS.t(...a);
  const icon = (n) => CS.icon(n);
  const lang = () => (CS.i18n.lang === 'en' ? 'en' : 'es');

  /* ---------- Regular expressions ---------- */
  const RECIPES = [
    { id: 'email', src: '[\\w.+-]+@[\\w-]+\\.[\\w.]+', flags: 'g' },
    { id: 'number', src: '-?\\d+(?:[.,]\\d+)?', flags: 'g' },
    { id: 'date', src: '\\b(\\d{1,2})/(\\d{1,2})/(\\d{4})\\b', flags: 'g' },
    { id: 'time', src: '\\b([01]?\\d|2[0-3]):([0-5]\\d)\\b', flags: 'g' },
    { id: 'url', src: 'https?://[^\\s]+', flags: 'g' },
    { id: 'hashtag', src: '#[\\w\u00c0-\u017f]+', flags: 'g' },
    { id: 'mention', src: '@\\w+', flags: 'g' },
    { id: 'hex', src: '#(?:[0-9a-fA-F]{3}){1,2}\\b', flags: 'g' },
    { id: 'spaces', src: ' {2,}', flags: 'g' },
    { id: 'capital', src: '\\b[A-Z\u00c1\u00c9\u00cd\u00d3\u00da\u00d1][a-z\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1]+', flags: 'g' }
  ];

  /* Splits a pattern into tokens with a plain-language meaning. */
  function explain(src) {
    const out = [];
    let i = 0;
    const add = (text, key, vars) => out.push({ text, key, vars });
    while (i < src.length) {
      const c = src[i];
      if (c === '\\' && i + 1 < src.length) {
        const n = src[i + 1];
        const map = { d: 'digit', D: 'notdigit', w: 'word', W: 'notword', s: 'space', S: 'notspace', b: 'boundary', n: 'newline', t: 'tab' };
        add(c + n, map[n] ? 'tl_rx_t_' + map[n] : 'tl_rx_t_literal', { c: n });
        i += 2;
      } else if (c === '[') {
        let j = i + 1;
        if (src[j] === '^') j++;
        if (src[j] === ']') j++;
        while (j < src.length && src[j] !== ']') { if (src[j] === '\\') j++; j++; }
        const body = src.slice(i, j + 1);
        add(body, body[1] === '^' ? 'tl_rx_t_notset' : 'tl_rx_t_set', { set: body.slice(body[1] === '^' ? 2 : 1, -1) });
        i = j + 1;
      } else if (c === '{') {
        const m = src.slice(i).match(/^\{(\d+)(,(\d*))?\}/);
        if (m) { add(m[0], m[2] ? (m[3] ? 'tl_rx_t_range' : 'tl_rx_t_atleast') : 'tl_rx_t_exact', { a: m[1], b: m[3] }); i += m[0].length; }
        else { add(c, 'tl_rx_t_literal', { c }); i++; }
      } else if (c === '(') {
        if (src.startsWith('(?:', i)) { add('(?:', 'tl_rx_t_nocap'); i += 3; }
        else if (src.startsWith('(?=', i) || src.startsWith('(?!', i)) { add(src.slice(i, i + 3), 'tl_rx_t_ahead'); i += 3; }
        else if (src.startsWith('(?<=', i) || src.startsWith('(?<!', i)) { add(src.slice(i, i + 4), 'tl_rx_t_behind'); i += 4; }
        else { add('(', 'tl_rx_t_group'); i++; }
      } else {
        const single = { '.': 'any', '+': 'plus', '*': 'star', '?': 'opt', '^': 'start', $: 'end', '|': 'or', ')': 'close' };
        add(c, single[c] ? 'tl_rx_t_' + single[c] : 'tl_rx_t_literal', { c });
        i++;
      }
    }
    /* Merge runs of literal characters into one readable token. */
    const merged = [];
    out.forEach((tok) => {
      const last = merged[merged.length - 1];
      if (tok.key === 'tl_rx_t_literal' && tok.text.length === 1 && last && last.key === 'tl_rx_t_text') { last.text += tok.text; last.vars.c += tok.text; }
      else if (tok.key === 'tl_rx_t_literal' && tok.text.length === 1) merged.push({ text: tok.text, key: 'tl_rx_t_text', vars: { c: tok.text } });
      else merged.push(tok);
    });
    return merged;
  }

  function renderRegex() {
    const S = Object.assign({ src: RECIPES[0].src, flags: 'g', text: t('tl_rx_sample') }, CS.settings.get('tool_regex') || {});
    const status = h('div', { class: 'tl-status' });
    const marked = h('div', { class: 'tl-rx-marked' });
    const list = h('div', { class: 'tl-rx-list' });
    const tokens = h('div', { class: 'tl-rx-tokens' });
    const code = TL.codeBox({ title: t('tl_rx_code'), lang: 'js' });
    const patternInput = ui.input({ value: S.src, mono: true, onInput: (v) => { S.src = String(v); run(); } });
    const flagsHost = h('div', { class: 'tl-chips' });
    const textArea = ui.input({ value: S.text, multiline: true, rows: 5, onInput: (v) => { S.text = String(v); run(); } });
    const drawFlags = () => CS.mount(flagsHost, ['g', 'i', 'm', 's'].map((f) => ui.chip(f + ' · ' + t('tl_rx_f_' + f), { active: S.flags.includes(f), onClick: () => {
      S.flags = S.flags.includes(f) ? S.flags.replace(f, '') : S.flags + f; drawFlags(); run();
    } })));
    function run() {
      CS.settings.set('tool_regex', S);
      const esc = CS.util.escapeHtml;
      CS.mount(tokens, explain(S.src).map((tok) => h('div', { class: 'tl-rx-token' }, h('code', {}, tok.text), h('span', {}, t(tok.key, tok.vars || {})))));
      let rx;
      try { rx = new RegExp(S.src, S.flags.includes('g') ? S.flags : S.flags + 'g'); } catch (error) {
        status.className = 'tl-status bad';
        CS.mount(status, icon('alertTriangle'), h('span', {}, h('strong', {}, t('tl_rx_invalid')), ' · ' + String(error.message).replace(/^Invalid regular expression: /, '')));
        marked.textContent = S.text; CS.mount(list); code.set('');
        return;
      }
      const matches = [];
      if (S.src) {
        let m;
        while ((m = rx.exec(S.text)) && matches.length < 500) {
          matches.push(m);
          if (m[0] === '') rx.lastIndex++;
          if (!S.flags.includes('g')) break;
        }
      }
      let html = '', last = 0;
      matches.forEach((m) => { html += esc(S.text.slice(last, m.index)) + '<mark>' + esc(m[0]) + '</mark>'; last = m.index + m[0].length; });
      marked.innerHTML = html + esc(S.text.slice(last));
      status.className = 'tl-status ' + (matches.length ? 'ok' : '');
      const behind = /\(\?<[=!]/.test(S.src);
      CS.mount(status, icon(matches.length ? 'checkCircle' : 'info'), h('span', {}, t('tl_rx_count', { n: matches.length })), behind ? h('small', { class: 'tl-rx-warn' }, t('tl_rx_behind')) : null);
      CS.mount(list, matches.slice(0, 30).map((m, i) => h('div', { class: 'tl-rx-match' },
        h('span', { class: 'tl-rx-n' }, String(i + 1)), h('code', {}, m[0] || '∅'),
        m.length > 1 ? h('span', { class: 'tl-rx-groups' }, m.slice(1).map((g, k) => h('span', {}, '$' + (k + 1) + ' ' + (g == null ? '—' : g)))) : null)));
      const lit = '/' + S.src.replace(/\//g, '\\/') + '/' + S.flags;
      code.set(lang() === 'es'
        ? 'const patron = ' + lit + ';\n// ¿El texto lo contiene?\nconst hay = patron.test(texto);\n// Todos los resultados\nconst todos = texto.match(patron) || [];\n// Reemplazar\nconst limpio = texto.replace(patron, "…");'
        : 'const pattern = ' + lit + ';\n// Does the text contain it?\nconst found = pattern.test(text);\n// Every match\nconst all = text.match(pattern) || [];\n// Replace\nconst clean = text.replace(pattern, "…");');
    }
    const recipes = h('div', { class: 'tl-chips' }, RECIPES.map((r) => ui.chip(t('tl_rx_r_' + r.id), { onClick: () => { S.src = r.src; S.flags = r.flags; patternInput.value = r.src; drawFlags(); run(); } })));
    drawFlags();
    run();
    return h('div', { class: 'tl-stack' },
      TL.panel(t('tl_rx_pattern'), h('div', { class: 'tl-rx-pattern' }, h('span', {}, '/'), patternInput, h('span', {}, '/')), flagsHost),
      TL.panel(t('tl_rx_recipes'), recipes),
      TL.panel(t('tl_rx_text'), textArea, status, marked, list),
      TL.panel(t('tl_rx_explain'), tokens),
      code.el);
  }

  /* ---------- Sample data ---------- */
  const WORDS = {
    es: {
      first: ['Ana', 'Beto', 'Carla', 'Dani', 'Elena', 'Fran', 'Gabi', 'Hugo', 'Inés', 'Javi', 'Lucía', 'Mario', 'Nora', 'Óscar', 'Paula', 'Rosa', 'Sergio', 'Tania', 'Vero', 'Yeni'],
      last: ['García', 'Pérez', 'Rodríguez', 'López', 'Díaz', 'Martínez', 'Sánchez', 'Romero', 'Torres', 'Ramos', 'Cruz', 'Morales'],
      city: ['La Habana', 'Madrid', 'Bogotá', 'Lima', 'Buenos Aires', 'Ciudad de México', 'Santiago', 'Quito', 'Montevideo', 'Valencia'],
      thing: ['Pan', 'Leche', 'Café', 'Arroz', 'Huevos', 'Tomates', 'Queso', 'Jabón', 'Manzanas', 'Galletas'],
      words: 'el la de un una que en con por para sol mar casa idea grupo juego mapa nube libro luz camino tiempo amigo voz fiesta'.split(' ')
    },
    en: {
      first: ['Alice', 'Ben', 'Chloe', 'Dan', 'Emma', 'Finn', 'Grace', 'Hugo', 'Ivy', 'Jack', 'Lily', 'Max', 'Nora', 'Owen', 'Piper', 'Rose', 'Sam', 'Tess', 'Vic', 'Zoe'],
      last: ['Smith', 'Jones', 'Brown', 'Taylor', 'Wilson', 'Davies', 'Evans', 'Clark', 'Walker', 'Hall', 'Young', 'King'],
      city: ['London', 'New York', 'Toronto', 'Sydney', 'Dublin', 'Chicago', 'Austin', 'Seattle', 'Boston', 'Denver'],
      thing: ['Bread', 'Milk', 'Coffee', 'Rice', 'Eggs', 'Tomatoes', 'Cheese', 'Soap', 'Apples', 'Cookies'],
      words: 'the a of and to in with for sun sea home idea group game map cloud book light road time friend voice party'.split(' ')
    }
  };
  const FIELDS = ['name', 'email', 'phone', 'city', 'date', 'number', 'price', 'bool', 'color', 'thing', 'sentence', 'id'];

  function generator(seed) {
    let s = seed >>> 0 || 1;
    const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const plain = (x) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
    /* One person per row, so name and e-mail always match. */
    let person = null;
    const who = (W, i) => { if (!person || person.i !== i) person = { i, first: pick(W.first), last: pick(W.last) }; return person; };
    return function make(field, W, i) {
      switch (field) {
        case 'name': { const x = who(W, i); return x.first + ' ' + x.last; }
        case 'email': { const x = who(W, i); return plain(x.first) + '.' + plain(x.last) + '@example.org'; }
        case 'phone': return '+' + (1 + Math.floor(rnd() * 98)) + ' ' + String(Math.floor(rnd() * 900) + 100) + ' ' + String(Math.floor(rnd() * 9000) + 1000);
        case 'city': return pick(W.city);
        case 'date': { const d = new Date(2026, Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 28)); return d.toISOString().slice(0, 10); }
        case 'number': return Math.floor(rnd() * 100);
        case 'price': return Math.round(rnd() * 5000) / 100;
        case 'bool': return rnd() > 0.5;
        case 'color': return CS.color.fromHsl(Math.floor(rnd() * 360), 60 + Math.floor(rnd() * 25), 45 + Math.floor(rnd() * 15));
        case 'thing': return pick(W.thing);
        case 'sentence': { const n = 5 + Math.floor(rnd() * 6); const w = []; for (let k = 0; k < n; k++) w.push(pick(W.words)); const x = w.join(' '); return x[0].toUpperCase() + x.slice(1) + '.'; }
        case 'id': return (i + 1) + '-' + Math.floor(rnd() * 0xffffff).toString(36);
        default: return '';
      }
    };
  }

  function renderSample() {
    const S = Object.assign({ fields: ['name', 'email', 'city'], count: 5, format: 'json', seed: 7 }, CS.settings.get('tool_sample') || {});
    const out = TL.codeBox({ title: t('tl_sm_result'), lang: 'json' });
    const chips = h('div', { class: 'tl-chips' });
    const keyOf = (f) => t('tl_sm_key_' + f);
    function run() {
      CS.settings.set('tool_sample', S);
      const W = WORDS[lang()];
      const make = generator(S.seed);
      const rows = [];
      for (let i = 0; i < S.count; i++) { const r = {}; S.fields.forEach((f) => { r[keyOf(f)] = make(f, W, i); }); rows.push(r); }
      let text;
      if (S.format === 'json') text = JSON.stringify(rows, null, 2);
      else if (S.format === 'js') text = 'const ' + t('tl_sm_var') + ' = ' + JSON.stringify(rows, null, 2).replace(/"([A-Za-z_$][\w$]*)":/g, '$1:') + ';';
      else if (S.format === 'csv') {
        const cell = (v) => { const x = String(v); return /[",\n;]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; };
        text = [S.fields.map(keyOf).join(',')].concat(rows.map((r) => S.fields.map((f) => cell(r[keyOf(f)])).join(','))).join('\n');
      } else text = rows.map((r) => S.fields.map((f) => r[keyOf(f)]).join(' · ')).join('\n');
      out.set(text);
    }
    const drawChips = () => CS.mount(chips, FIELDS.map((f) => ui.chip(t('tl_sm_f_' + f), { active: S.fields.includes(f), onClick: () => {
      if (S.fields.includes(f)) { if (S.fields.length > 1) S.fields = S.fields.filter((x) => x !== f); } else S.fields = S.fields.concat(f);
      drawChips(); run();
    } })));
    const count = TL.slider({ label: t('tl_sm_count'), min: 1, max: 50, value: S.count, onInput: (v) => { S.count = v; run(); } });
    drawChips();
    run();
    return h('div', { class: 'tl-stack' },
      TL.panel(t('tl_sm_fields'), chips),
      TL.panel(null, count.el,
        ui.segmented([{ value: 'json', label: 'JSON' }, { value: 'js', label: 'JS' }, { value: 'csv', label: 'CSV' }, { value: 'lines', label: t('tl_sm_lines') }], S.format, (v) => { S.format = v; run(); }),
        ui.button({ label: t('tl_sm_again'), icon: 'dice', variant: 'soft', size: 'sm', onClick: () => { S.seed = Math.floor(Math.random() * 1e9); run(); } })),
      out.el,
      h('p', { class: 'tl-hint' }, t('tl_sm_hint')));
  }

  TL.add({ id: 'regex', group: 'data', icon: 'regex', tint: 'violet', order: 31, render: renderRegex });
  TL.add({ id: 'sample', group: 'data', icon: 'db', tint: 'green', order: 33, render: renderSample });
  CS.toolsText = { explain, RECIPES, generator };
})();
