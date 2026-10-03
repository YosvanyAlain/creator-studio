/* Lesson building blocks: rich text, code view, and the interactive step types. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, ui } = CS;
  const t = (...a) => CS.t(...a);
  const L = (v) => CS.learn.L(v);

  /* ---------- Rich text: paragraphs, "- " bullets, **bold**, `code` ---------- */
  function inline(text) {
    const out = [];
    const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    let last = 0;
    let m;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push(text.slice(last, m.index));
      const tok = m[0];
      out.push(tok[0] === '*' ? h('b', {}, tok.slice(2, -2)) : h('code', { class: 'ic-code' }, tok.slice(1, -1)));
      last = m.index + tok.length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }

  function rich(value, cls) {
    const text = L(value);
    if (!text) return null;
    const blocks = text.split(/\n{2,}/);
    return h('div', { class: ['rich', cls] }, blocks.map((b) => {
      const lines = b.split('\n');
      if (lines.every((x) => /^- /.test(x))) return h('ul', {}, lines.map((x) => h('li', {}, inline(x.slice(2)))));
      return h('p', {}, lines.map((x, i) => [i ? h('br') : null, inline(x)]));
    }));
  }

  /* ---------- Code view with a tiny tokenizer ---------- */
  const KW = new Set('const let var function return if else for while of in new true false null undefined async await class this break continue switch case default typeof try catch'.split(' '));
  function tokens(code) {
    const out = [];
    const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(<\/?[a-zA-Z][\w-]*|\/?>)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$-]*)(?=\s*:(?!:))|([A-Za-z_$][\w$]*)/g;
    let last = 0;
    let m;
    while ((m = re.exec(code))) {
      if (m.index > last) out.push([null, code.slice(last, m.index)]);
      const kind = m[1] ? 'c' : m[2] ? 's' : m[3] ? 't' : m[4] ? 'n' : m[5] ? 'p' : KW.has(m[6]) ? 'k' : null;
      out.push([kind, m[0]]);
      last = m.index + m[0].length;
    }
    if (last < code.length) out.push([null, code.slice(last)]);
    return out;
  }
  function codeSpans(code) { return tokens(code).map(([k, s]) => (k ? h('span', { class: 'tk-' + k }, s) : s)); }

  function codeView(code, opts) {
    const o = opts || {};
    const pre = h('pre', { class: ['ls-code', o.class] }, h('code', {}, codeSpans(code)));
    if (o.copy === false) return pre;
    return h('div', { class: 'ls-code-wrap' }, pre,
      ui.iconButton('copy', t('copy'), async () => {
        try { await navigator.clipboard.writeText(code); ui.toast(t('copied'), 'success'); } catch (error) { ui.toast(t('copy_failed'), 'error'); }
      }, { class: 'ls-code-copy', size: 'sm' }));
  }

  /* ---------- Helpers ---------- */
  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function shuffledDifferent(list) {
    if (list.length < 2) return list.slice();
    let a;
    let n = 0;
    do { a = shuffle(list); n++; } while (n < 8 && a.every((x, i) => x === list[i]));
    return a;
  }
  const head = (s) => h('div', { class: 'ls-q' }, rich(s.q || s.title));

  /* Each step returns { node, scored, ready(), check() -> { ok, why }, reset() }. onState() re-evaluates the footer. */
  const STEPS = {};

  STEPS.read = (s) => ({
    node: h('div', { class: 'ls-read' },
      s.art ? CS.learnArt.scene(s.art) : null,
      s.title ? h('h2', { class: 'ls-title' }, L(s.title)) : null,
      rich(s.body, 'ls-text'),
      s.code ? codeView(L(s.code)) : null,
      s.note ? h('div', { class: 'callout tip ls-note' }, CS.icon('bulb'), rich(s.note)) : null)
  });

  STEPS.quiz = (s, onState) => {
    let pick = -1;
    const opts = L(s.opts);
    const buttons = opts.map((label, i) => h('button', {
      type: 'button', class: 'ls-opt', dataset: { i: String(i) },
      onclick: () => { if (buttons.locked) return; pick = i; CS.haptic(); paint(); onState(); }
    }, h('span', { class: 'ls-opt-key' }, String.fromCharCode(65 + i)), h('span', { class: 'ls-opt-text' }, inline(label))));
    function paint(result) {
      buttons.forEach((b, i) => {
        b.classList.toggle('sel', i === pick);
        b.classList.toggle('ok', !!result && i === s.a && result.ok);
        b.classList.toggle('bad', !!result && i === pick && !result.ok);
      });
    }
    return {
      node: h('div', { class: 'ls-quiz' }, head(s), s.code ? codeView(L(s.code), { copy: false }) : null, h('div', { class: 'ls-opts' }, buttons)),
      scored: true,
      ready: () => pick >= 0,
      check: () => { const r = { ok: pick === s.a, why: s.why }; paint(r); buttons.locked = true; return r; },
      reset: () => { pick = -1; buttons.locked = false; paint(); }
    };
  };

  STEPS.order = (s, onState) => {
    const items = L(s.items);
    const pool = shuffledDifferent(items.map((x, i) => ({ x, i })));
    let chosen = [];
    const answer = h('div', { class: ['ls-order-answer', s.mono && 'mono'] });
    const bank = h('div', { class: ['ls-bank', s.mono && 'mono'] });
    function paint(result) {
      CS.mount(answer, chosen.length ? chosen.map((it, k) => h('button', {
        type: 'button', class: ['ls-line', result && (it.i === k ? 'ok' : 'bad')],
        onclick: () => { if (result) return; chosen = chosen.filter((c) => c !== it); paint(); onState(); }
      }, h('span', { class: 'ls-line-n' }, String(k + 1)), h('span', { class: 'ls-line-text' }, it.x))) : h('div', { class: 'ls-placeholder' }, t('ls_order_hint')));
      CS.mount(bank, pool.filter((it) => !chosen.includes(it)).map((it) => h('button', {
        type: 'button', class: 'ls-chip', onclick: () => { chosen.push(it); CS.haptic(); paint(); onState(); }
      }, it.x)));
    }
    paint();
    return {
      node: h('div', { class: 'ls-order' }, head(s), answer, bank),
      scored: true,
      ready: () => chosen.length === items.length,
      check: () => { const r = { ok: chosen.every((it, k) => it.i === k), why: s.why }; paint(r); return r; },
      reset: () => { chosen = []; paint(); }
    };
  };

  STEPS.fill = (s, onState) => {
    const code = L(s.code);
    const answers = L(s.blanks);
    const chips = shuffle(answers.concat(L(s.extra || [])).map((x, i) => ({ x, i })));
    const slots = answers.map(() => null);
    let focus = 0;
    const pre = h('pre', { class: ['ls-code', 'ls-fill-code', s.prose && 'prose'] });
    const bank = h('div', { class: ['ls-bank', !s.prose && 'mono'] });
    function paint(result) {
      const parts = code.split(/\[\[(\d+)\]\]/);
      CS.mount(pre, h('code', {}, parts.map((part, k) => {
        if (k % 2 === 0) return s.prose ? part : codeSpans(part);
        const n = Number(part);
        const val = slots[n];
        return h('button', {
          type: 'button', class: ['ls-slot', val && 'full', n === focus && !val && 'focus', result && (val && val.x === answers[n] ? 'ok' : 'bad')],
          onclick: () => { if (result) return; if (val) slots[n] = null; focus = n; paint(); onState(); }
        }, val ? val.x : '\u2007\u2007\u2007');
      })));
      CS.mount(bank, chips.filter((c) => !slots.includes(c)).map((c) => h('button', {
        type: 'button', class: 'ls-chip', onclick: () => {
          if (result) return;
          let n = slots[focus] == null ? focus : slots.findIndex((x) => x == null);
          if (n < 0) return;
          slots[n] = c;
          const next = slots.findIndex((x) => x == null);
          focus = next < 0 ? n : next;
          CS.haptic(); paint(); onState();
        }
      }, c.x)));
    }
    paint();
    return {
      node: h('div', { class: 'ls-fill' }, head(s), pre, bank),
      scored: true,
      ready: () => slots.every(Boolean),
      check: () => { const r = { ok: slots.every((c, n) => c.x === answers[n]), why: s.why }; paint(r); return r; },
      reset: () => { slots.fill(null); focus = 0; paint(); }
    };
  };

  STEPS.match = (s, onState) => {
    const pairs = L(s.pairs);
    const left = pairs.map((p, i) => ({ x: p[0], i }));
    const right = shuffledDifferent(pairs.map((p, i) => ({ x: p[1], i })));
    let selL = null;
    let selR = null;
    let misses = 0;
    const matched = new Set();
    const colL = h('div', { class: 'ls-col' });
    const colR = h('div', { class: 'ls-col' });
    function cell(it, side) {
      const sel = side === 'l' ? selL === it.i : selR === it.i;
      return h('button', {
        type: 'button', class: ['ls-cell', side === 'l' && 'term', sel && 'sel', matched.has(it.i) && 'ok'], disabled: matched.has(it.i),
        onclick: (e) => {
          if (side === 'l') selL = it.i; else selR = it.i;
          if (selL != null && selR != null) {
            if (selL === selR) { matched.add(selL); CS.haptic(); }
            else { misses++; const el = e.currentTarget; el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 380); }
            selL = selR = null;
          }
          paint(); onState();
        }
      }, it.x);
    }
    function paint() { CS.mount(colL, left.map((it) => cell(it, 'l'))); CS.mount(colR, right.map((it) => cell(it, 'r'))); }
    paint();
    return {
      node: h('div', { class: 'ls-match' }, head(s), h('div', { class: 'ls-match-grid' }, colL, colR)),
      scored: true,
      ready: () => matched.size === pairs.length,
      check: () => ({ ok: misses === 0, soft: true, why: s.why }),
      reset: () => {}
    };
  };

  /* Live playground: a template with {{key}} slots, editable fields and the real simulator (1 or 2 screens). */
  STEPS.try = (s) => {
    const values = {};
    (s.fields || []).forEach((f) => { values[f.k] = L(f.value); });
    const stage = h('div', { class: ['ls-try-stage', (s.peers || 1) > 1 && 'multi'], style: { height: (s.height || 260) + 'px' } });
    const project = { id: 'lesson', name: 'Lesson', files: {}, settings: {} };
    let sim = null;
    function fill() {
      const files = typeof s.files === 'function' ? s.files() : s.files;
      for (const path of Object.keys(files)) {
        const src = L(files[path]).replace(/\{\{(\w+)\}\}/g, (m, k) => (values[k] != null ? values[k] : ''));
        project.files[path] = { kind: 'text', content: src };
      }
    }
    function layout(frames) {
      CS.mount(stage, frames.map((frame, i) => h('div', { class: 'ls-try-device' },
        frames.length > 1 ? h('div', { class: 'ls-try-who' }, h('span', { class: 'sim-dot tint-' + sim.PEOPLE[i].tint }, sim.PEOPLE[i].name[0]), sim.PEOPLE[i].name) : null,
        h('div', { class: 'ls-try-screen' }, frame))));
    }
    function start() {
      fill();
      sim = CS.sim.create({ project, peers: s.peers || 1 });
      sim.on((e) => { if (e.type === 'reload') layout(e.frames); });
      sim.attach(stage);
    }
    const refresh = CS.util.debounce(() => { fill(); if (sim) sim.reload(); }, 280);
    const fields = (s.fields || []).map((f) => {
      const set = (v) => { values[f.k] = v; refresh(); };
      let control;
      if (f.type === 'color') {
        const hex = h('span', { class: 'ls-hex' }, values[f.k]);
        control = h('label', { class: 'ls-color' }, h('input', { type: 'color', value: values[f.k], oninput: (e) => { hex.textContent = e.target.value; set(e.target.value); } }), hex);
      } else if (f.type === 'range') {
        const out = h('span', { class: 'ls-range-val' }, values[f.k] + (f.unit || ''));
        control = h('div', { class: 'ls-range' }, h('input', { type: 'range', min: f.min, max: f.max, step: f.step || 1, value: values[f.k],
          oninput: (e) => { out.textContent = e.target.value + (f.unit || ''); set(e.target.value); } }), out);
      } else if (f.type === 'choice') {
        control = ui.segmented(L(f.options).map((o) => ({ value: o, label: o })), values[f.k], (v) => set(v));
      } else {
        control = ui.input({ value: values[f.k], onInput: (v) => set(String(v).replace(/[<>]/g, '')) });
      }
      return h('div', { class: 'ls-field' }, h('div', { class: 'ls-field-label' }, L(f.label)), control);
    });
    function saveAsApp() {
      fill();
      const files = {};
      for (const path of Object.keys(project.files)) files[path] = project.files[path].content;
      const p = CS.projects.create({ name: L(s.appName) || t('ls_try_app'), files });
      CS.projects.add(p).then(() => ui.toast(t('ls_saved_app'), 'success', { action: { label: t('open'), onClick: () => CS.common.openProject(p.id) } }))
        .catch((error) => ui.toast(CS.common.errorText(error), 'error'));
    }
    requestAnimationFrame(start);
    return {
      node: h('div', { class: 'ls-try' }, head(s),
        fields.length ? h('div', { class: 'ls-fields' }, fields) : null,
        h('div', { class: 'ls-try-frame' }, h('div', { class: 'ls-try-bar' }, h('span', { class: 'ls-try-live' }, h('i'), t('ls_live')),
          h('span', { class: 'spacer' }),
          ui.iconButton('refresh', t('ls_reload'), () => { fill(); if (sim) sim.reload(); }, { size: 'sm' }),
          s.save !== false ? ui.button({ label: t('ls_save_app'), icon: 'save', variant: 'ghost', size: 'sm', onClick: saveAsApp }) : null), stage),
        s.tip ? h('div', { class: 'callout tip ls-note' }, CS.icon('bulb'), rich(s.tip)) : null),
      destroy: () => { if (sim) sim.destroy(); sim = null; }
    };
  };

  CS.learnUi = { rich, inline, codeView, codeSpans, STEPS, shuffle };
})();
