/* =========================================================================
 * Webxdc Creator Studio — blocks-ui.js
 * Blocks view UI: palette, stack, generated code panel.
 * ========================================================================= */
'use strict';
(function () {
  const CS = (globalThis.CS = globalThis.CS || {});
  const U = CS.util;

  const ui = {
    ctxKind: 'onStart',   /* onStart | onUpdate | onClick | onChange | onTouch | functions */
    ctxIndex: 0,
    docType: null,        /* block type shown in the doc panel */
    paletteOpen: true,
    palQuery: '',
    palOpen: {},
    palCat: null,
    palDock: true,
    palUserSet: false,    /* on mobile the palette starts closed until the user opens it */
    selBlockId: null,
    pendingArr: null,     /* target array when pressing Add inside */
    lang: null
  };

  let els = {};

  function t(key, params) { return CS.i18n.t(key, params); }
  function L() {
    const l = CS.i18n.lang();
    return (l === 'es' || l === 'en') ? l : 'en';
  }
  function isMobileUi() {
    try { return !!(CS.app && CS.app.isMobile && CS.app.isMobile()); } catch (e) { return false; }
  }
  /* Below 701px the palette is a bottom sheet over the workspace (see app.css). */
  function palIsSheet() {
    try { return window.matchMedia('(max-width: 700px)').matches; } catch (e) { return false; }
  }
  function ensurePalDefault() {
    if (ui.palUserSet) return;
    ui.palDock = !isMobileUi() && !palIsSheet();
  }
  function hidePalOverlay() {
    const ws = document.querySelector('.blocks-workspace');
    if (ws) {
      ws.classList.remove('pal-on');
      ws.classList.add('pal-off');
    }
  }
  function project() { return CS.projects.current; }
  function B() { return CS.blocks; }

  function model(p) {
    p = p || project();
    if (!p) return null;
    if (!p.blocks.model) {
      p.blocks.model = B().newModel();
      p.blocks.generatedFile = p.blocks.generatedFile || 'app.js';
    }
    return B().normalizeModel(p.blocks.model);
  }

  function saveModel() {
    const p = project();
    if (!p) return;
    CS.projects.save(p).catch(function () {});
  }

  /* ---------- ids present in index.html (for the datalist) ---------- */
  function htmlIds() {
    const p = project();
    if (!p || !p.files['index.html'] || p.files['index.html'].kind !== 'text') return [];
    const ids = Array.from(CS.validator.elementIds(p.files['index.html'].content));
    return ids.filter(function (x) { return U.isElementId(x); }).sort();
  }

  /* ---------- helpers de contexto ---------- */
  function contextList(kind) {
    const m = model();
    if (kind === 'onClick' || kind === 'onChange' || kind === 'onTouch') return m.contexts[kind];
    return null;
  }

  function currentBlocksArr(create) {
    const m = model();
    if (ui.ctxKind === 'onStart') return m.contexts.onStart;
    if (ui.ctxKind === 'onUpdate') return m.contexts.onUpdate;
    const list = m.contexts[ui.ctxKind];
    if (!list.length) return null;
    if (ui.ctxIndex >= list.length) ui.ctxIndex = 0;
    return list[ui.ctxIndex].blocks;
  }

  /* ================================================================ *
   * RENDER
   * ================================================================ */
  function render(root) {
    ensurePalDefault();
    const p = project();
    els = {};
    root.textContent = '';
    if (!p) {
      root.appendChild(U.el('div', { class: 'empty-state card' },
        U.el('p', { text: t('blocks_no_project') }),
        U.el('button', { class: 'btn primary', onclick: function () { CS.app.showView('projects'); } }, t('open_or_create'))));
      return;
    }

    const m = model(p);

    /* Warn if the generated file was edited by hand */
    if (p.blocks.handEdited) {
      root.appendChild(U.el('div', { class: 'notice warn' },
        U.icon('warn', { size: 16 }),
        U.el('span', { text: t('blocks_hand_edited', { file: p.blocks.generatedFile }) })));
    }

    /* ---- Contextos ---- */
    const ctxBar = U.el('div', { class: 'ctx-bar' });
    ctxBar.appendChild(ctxChip('onStart', null, 'rocket', t('ctx_onstart')));
    ctxBar.appendChild(ctxChip('onUpdate', null, 'sync', t('ctx_onupdate')));
    m.contexts.onClick.forEach(function (c, i) {
      ctxBar.appendChild(ctxChip('onClick', i, 'click', '#' + c.target));
    });
    m.contexts.onTouch.forEach(function (c, i) {
      ctxBar.appendChild(ctxChip('onTouch', i, 'hand', '#' + c.target));
    });
    m.contexts.onChange.forEach(function (c, i) {
      ctxBar.appendChild(ctxChip('onChange', i, 'pencil', '#' + c.target));
    });
    m.contexts.functions.forEach(function (c, i) {
      ctxBar.appendChild(ctxChip('functions', i, 'fn', c.target));
    });
    ctxBar.appendChild(U.el('button', {
      class: 'btn ghost small chip-add',
      onclick: function () { addTargetModal(); }
    }, U.icon('plus', { size: 16 }), t('add_handler')));

    const ctxWrap = U.el('div', { class: 'ctx-wrap' }, ctxBar);
    root.appendChild(ctxWrap);

    /* ---- Variables ---- */
    root.appendChild(renderVars(m));

    const palToggle = U.el('button', {
      class: 'btn ghost small pal-toggle',
      title: ui.palDock ? t('pal_hide') : t('pal_show'),
      'aria-label': ui.palDock ? t('pal_hide') : t('pal_show'),
      onclick: function () { ui.palDock = !ui.palDock; ui.palUserSet = true; render(rootEl()); }
    }, U.icon(ui.palDock ? 'close' : 'puzzle', { size: 16 }), ui.palDock ? t('pal_hide') : t('pal_show'));
    const quick = U.el('button', {
      class: 'btn ghost small gx-quick', onclick: function () { gameStarterSheet(); }
    }, U.icon('gamepad', { size: 16 }), t('gx_quick'));
    root.appendChild(U.el('div', { class: 'row-gap wrap' }, palToggle, quick,
      U.el('p', { class: 'hint puzzle-hint' }, U.icon('hand', { size: 14 }), t('puzzle_hint'))));
    if (isModelEmpty(m)) root.appendChild(gameStarterCard());

    const workspace = U.el('div', { class: 'blocks-workspace' + (ui.palDock ? ' pal-on' : ' pal-off') });
    workspace.appendChild(U.el('div', { class: 'pal-scrim', onclick: function () { ui.palDock = false; ui.palUserSet = true; render(rootEl()); } }));
    const palCol = U.el('div', { class: 'blocks-pal-col' });
    palCol.appendChild(renderPalette());
    const stackCol = U.el('div', { class: 'blocks-stack-col' });
    stackCol.appendChild(renderStack());
    if (ui.docType) stackCol.appendChild(renderDoc());
    workspace.appendChild(palCol);
    workspace.appendChild(stackCol);
    root.appendChild(workspace);

    /* ---- Generated code ---- */
    root.appendChild(renderCode());
    lastSnap = snapshotModel();
    bindPuzzleDnD(root);
  }

  /* ---------- Game quick starters (complete block stacks from game-blocks.js) ---------- */
  function starters() { return (B().GAME && B().GAME.STARTERS) || []; }
  function isModelEmpty(m) {
    const c = m.contexts;
    return !c.onStart.length && !c.onUpdate.length && !c.onClick.length && !c.onChange.length && !c.onTouch.length && !c.functions.length;
  }
  /* If index.html / style.css are still the untouched template originals, turn them into a full-screen game page. */
  function gamePageIfPristine(p, title) {
    const id = p.origin && p.origin.template;
    let orig = null;
    try { orig = id && CS.tpl && CS.tpl.createFiles ? CS.tpl.createFiles(id) : null; } catch (e) { orig = null; }
    if (!orig) return;
    const text = function (f) { return f == null ? null : (typeof f === 'string' ? f : f.content); };
    const html = p.files['index.html'];
    if (!html || html.kind !== 'text' || html.content !== text(orig['index.html'])) return;
    const hasCss = p.files['style.css'] && p.files['style.css'].kind === 'text';
    html.content = [
      '<!doctype html>',
      '<html lang="' + L() + '">',
      '<head>',
      '  <meta charset="utf-8">',
      '  <meta name="viewport" content="width=device-width, initial-scale=1">',
      '  <title>' + U.esc(title) + '</title>',
      hasCss ? '  <link rel="stylesheet" href="style.css">' : '',
      '  <script src="webxdc.js"></script>',
      '</head>',
      '<body>',
      '  <canvas id="game"></canvas>',
      '  <script src="app.js"></script>',
      '</body>',
      '</html>',
      ''
    ].filter(function (l, i) { return l !== '' || i === 14; }).join('\n');
    if (hasCss && p.files['style.css'].content === text(orig['style.css'])) {
      p.files['style.css'].content = [
        '/* Full-screen game page */',
        'html, body { margin: 0; height: 100%; }',
        'body {',
        '  background: #020617;',
        '  display: flex;',
        '  justify-content: center;',
        '  align-items: flex-start;',
        '  overflow: hidden;',
        '  touch-action: none;',
        '}',
        ''
      ].join('\n');
    }
  }

  function useStarter(st) {
    const m = model();
    const apply = function () {
      gamePageIfPristine(project(), st[L()][0]);
      m.contexts.onStart = st.build().filter(Boolean);
      st.vars.forEach(function (v) {
        if (!m.vars.some(function (x) { return x.name === v[0]; })) m.vars.push({ name: v[0], value: v[1] });
      });
      ui.ctxKind = 'onStart'; ui.ctxIndex = 0; ui.selBlockId = null; ui.docType = null;
      afterStructureChange();
      writeGeneratedFile(function () {
        CS.app.toast(t('gx_quick_done', { name: st[L()][0] }), 'success', {
          action: { label: t('gx_quick_try'), fn: function () { CS.app.showView('preview'); } }
        });
      });
    };
    if (!m.contexts.onStart.length) { apply(); return; }
    CS.app.confirm({ title: st[L()][0], message: t('gx_quick_replace'), danger: true }).then(function (yes) { if (yes) apply(); });
  }
  function gameStarterSheet() {
    CS.app.sheet({
      title: t('gx_quick_title'),
      items: starters().map(function (st) {
        return { icon: st.icon, label: st[L()][0], desc: st[L()][1], fn: function () { useStarter(st); } };
      })
    });
  }
  function gameStarterCard() {
    const row = U.el('div', { class: 'gx-starters' });
    starters().forEach(function (st) {
      row.appendChild(U.el('button', { class: 'gx-starter', onclick: function () { useStarter(st); } },
        U.el('span', { class: 'tile-ico tint-indigo' }, U.icon(st.icon, { size: 22 })),
        U.el('span', { class: 'gx-starter-name', text: st[L()][0] }),
        U.el('span', { class: 'hint', text: st[L()][1] })));
    });
    return U.el('div', { class: 'card gx-starter-card' },
      U.el('div', { class: 'card-head' }, U.icon('sparkles', { size: 16 }), U.el('span', { text: t('gx_quick_title') })),
      U.el('p', { class: 'hint', text: t('gx_quick_hint') }), row);
  }

  function ctxChip(kind, index, iconName, label) {
    const active = ui.ctxKind === kind && (kind === 'onStart' || kind === 'onUpdate' || ui.ctxIndex === index);
    const chip = U.el('button', { class: 'ctx-chip' + (active ? ' active' : ''), onclick: function () {
      ui.ctxKind = kind; ui.ctxIndex = index || 0; ui.pendingArr = null; render(rootEl());
    } }, U.icon(iconName, { size: 14 }), label);
    if ((kind === 'onClick' || kind === 'onChange' || kind === 'onTouch' || kind === 'functions')) {
      const m = model();
      const list = m.contexts[kind];
      /* delete context button */
      const del = U.el('span', {
        class: 'chip-del', title: t('remove_handler'), 'aria-label': t('remove_handler'),
        onclick: function (ev) {
          ev.stopPropagation();
          CS.app.confirm({ title: t('remove_handler'), message: t('remove_handler_confirm', { id: list[index].target }), danger: true })
            .then(function (yes) {
              if (!yes) return;
              const mm = model();
              mm.contexts[kind].splice(index, 1);
              if (ui.ctxKind === kind) { ui.ctxKind = 'onStart'; ui.ctxIndex = 0; }
              saveModel(); render(rootEl());
            });
        }
      }, U.icon('close', { size: 12 }));
      chip.appendChild(del);
    }
    return chip;
  }

  function rootEl() { return document.getElementById('view-blocks'); }

  /* ---------------- Variables ---------------- */
  function renderVars(m) {
    const card = U.el('div', { class: 'card vars-card' });
    const head = U.el('div', { class: 'card-head' },
      U.icon('list', { size: 16 }), U.el('span', { text: t('variables') }),
      U.el('span', { class: 'spacer' }),
      U.el('button', {
        class: 'btn ghost small', onclick: function () {
          const name = suggestVarName(m);
          m.vars.push({ name: name, value: '0' });
          saveModel(); render(rootEl());
        }
      }, U.icon('plus', { size: 16 }), t('add_var')));
    card.appendChild(head);

    if (!m.vars.length) {
      card.appendChild(U.el('p', { class: 'hint', text: t('vars_hint') }));
    } else {
      const list = U.el('div', { class: 'vars-list' });
      m.vars.forEach(function (v, i) {
        const row = U.el('div', { class: 'var-row' });
        const nameIn = U.el('input', {
          class: 'input var-name', value: v.name, 'aria-label': 'name',
          oninput: function () { v.name = this.value; refreshCode(); },
          onchange: function () { saveModel(); render(rootEl()); }
        });
        const valIn = U.el('input', {
          class: 'input var-val', value: v.value, 'aria-label': 'value',
          oninput: function () { v.value = this.value; refreshCode(); },
          onchange: function () { saveModel(); render(rootEl()); }
        });
        const del = U.el('button', {
          class: 'btn ghost small danger-text', 'aria-label': t('delete'),
          onclick: function () { m.vars.splice(i, 1); saveModel(); render(rootEl()); }
        }, U.icon('trash', { size: 16 }));
        row.appendChild(nameIn);
        row.appendChild(U.el('span', { class: 'hint', text: '=' }));
        row.appendChild(valIn);
        row.appendChild(del);
        list.appendChild(row);
      });
      card.appendChild(list);
    }
    return card;
  }

  function suggestVarName(m) {
    let n = 1;
    const names = m.vars.map(function (v) { return v.name; });
    while (names.indexOf('variable' + (n === 1 ? '' : n)) >= 0) n++;
    return 'variable' + (n === 1 ? '' : n);
  }

  /* ---------------- Paleta ---------------- */
  function renderPalette() {
    const card = U.el('div', { class: 'card palette-card' });
    const head = U.el('div', {
      class: 'card-head clickable', onclick: function () { ui.paletteOpen = !ui.paletteOpen; render(rootEl()); }
    },
      U.icon('puzzle', { size: 16 }), U.el('span', { text: t('palette') + ' (' + Object.keys(B().DEFS).length + ')' }),
      U.el('span', { class: 'spacer' }),
      U.el('span', { class: 'chevron' + (ui.paletteOpen ? ' open' : ''), text: ui.paletteOpen ? '▾' : '▸' }));
    head.appendChild(U.el('button', {
      class: 'btn ghost small pal-dock-close',
      type: 'button',
      title: t('close'),
      'aria-label': t('close'),
      onclick: function (ev) {
        ev.stopPropagation();
        ui.palDock = false;
        ui.palUserSet = true;
        render(rootEl());
      }
    }, U.icon('close', { size: 16 })));
    card.appendChild(head);
    if (!ui.paletteOpen) return card;

    /* Search: essential with 60+ blocks */
    const search = U.el('input', {
      class: 'input pal-search', type: 'search', placeholder: t('palette_search'),
      value: ui.palQuery || '',
      oninput: function () { ui.palQuery = this.value; filterPalette(card, this.value); }
    });
    card.appendChild(search);

    const tabs = U.el('div', { class: 'pal-tabs', role: 'tablist' });
    B().CATS.forEach(function (cat) {
      if (cat.id === 'events') return;
      const n = Object.keys(B().DEFS).filter(function (ty) { return B().DEFS[ty].cat === cat.id; }).length;
      if (!n) return;
      tabs.appendChild(U.el('button', {
        class: 'pal-tab' + (ui.palCat === cat.id ? ' active' : ''),
        type: 'button',
        onclick: function () {
          ui.palCat = cat.id;
          ui.palOpen = {};
          ui.palOpen[cat.id] = true;
          render(rootEl());
        }
      }, U.icon(cat.icon || 'blocks', { size: 14 }), cat[L()] || cat.es));
    });
    card.appendChild(tabs);

    const ids = htmlIds();
    const datalist = U.el('datalist', { id: 'wcs-ids' });
    ids.forEach(function (id) { datalist.appendChild(new Option(id)); });

    const SUB_LABELS = {
      ops: { es: 'Operaciones', en: 'Operations' },
      trig: { es: 'Trigonometría', en: 'Trigonometry' },
      random: { es: 'Aleatorio', en: 'Random' },
      geo: { es: 'Geometría', en: 'Geometry' },
      search: { es: 'Buscar', en: 'Search' },
      transform: { es: 'Transformar', en: 'Transform' },
      query: { es: 'Consultar', en: 'Query' },
      mutate: { es: 'Modificar', en: 'Modify' },
      boolean: { es: 'Booleanos', en: 'Booleans' },
      vars: { es: 'Variables', en: 'Variables' },
      look: { es: 'Apariencia', en: 'Look' },
      layout: { es: 'Diseño', en: 'Layout' },
      create: { es: 'Crear', en: 'Create' },
      interact: { es: 'Interactuar', en: 'Interact' },
      read: { es: 'Leer', en: 'Read' },
      control: { es: 'Control', en: 'Control' },
      clock: { es: 'Reloj', en: 'Clock' },
      sfx: { es: 'Efectos', en: 'SFX' },
      mix: { es: 'Mezcla', en: 'Mix' },
      draw: { es: 'Dibujar', en: 'Draw' },
      style: { es: 'Estilo canvas', en: 'Canvas style' },
      score: { es: 'Puntos y vidas', en: 'Score & lives' },
      physics: { es: 'Física', en: 'Physics' },
      input: { es: 'Entrada', en: 'Input' },
      sprite: { es: 'Sprites', en: 'Sprites' },
      loop: { es: 'Bucle de juego', en: 'Game loop' },
      data: { es: 'Datos', en: 'Data' },
      sync: { es: 'Sincronizar', en: 'Sync' },
      identity: { es: 'Identidad', en: 'Identity' },
      debug: { es: 'Depuración', en: 'Debug' },
      general: { es: 'General', en: 'General' },
      screens: { es: 'Pantallas', en: 'Screens' },
      modals: { es: 'Modales', en: 'Modals' },
      basic: { es: 'Básicos', en: 'Basic' },
      layout: { es: 'Estructura', en: 'Layout' },
      feedback: { es: 'Feedback', en: 'Feedback' },
      fields: { es: 'Campos', en: 'Fields' },
      validation: { es: 'Validation', en: 'Validation' },
      collections: { es: 'Colecciones', en: 'Collections' },
      records: { es: 'Registros', en: 'Records' },
      query: { es: 'Consulta', en: 'Query' },
      apps: { es: 'Apps rápidas', en: 'Quick apps' },
      tabs: { es: 'Pestañas', en: 'Tabs' },
      drawers: { es: 'Paneles', en: 'Drawers' },
      attrs: { es: 'Atributos', en: 'Attributes' },
      live: { es: 'Anuncios', en: 'Live' },
      prefs: { es: 'Preferencias', en: 'Preferences' },
      fx: { es: 'Efectos', en: 'Effects' },

    };

    B().CATS.forEach(function (cat) {
      if (cat.id === 'events') return;
      const defTypes = Object.keys(B().DEFS).filter(function (ty) { return B().DEFS[ty].cat === cat.id; });
      if (!defTypes.length) return;
      const isOpen = ui.palOpen[cat.id] === true;
      const det = U.el('details', { class: 'pal-cat-details', open: isOpen });
      const sum = U.el('summary', { class: 'pal-cat-title' });
      if (cat.icon) sum.appendChild(U.icon(cat.icon, { size: 16 }));
      sum.appendChild(document.createTextNode((cat[L()] || cat.es) + ' · ' + defTypes.length));
      det.appendChild(sum);
      det.addEventListener('toggle', function () {
        ui.palOpen[cat.id] = det.open;
        /* one category at a time; search opens all matches */
        if (det.open && !ui.palQuery) {
          card.querySelectorAll('.pal-cat-details').forEach(function (other) {
            if (other !== det && other.open) other.open = false;
          });
          Object.keys(ui.palOpen).forEach(function (k) {
            if (k !== cat.id) ui.palOpen[k] = false;
          });
        }
      });

      /* Group by subcategory */
      const groups = {};
      const order = [];
      defTypes.forEach(function (ty) {
        const sub = B().DEFS[ty].sub || 'general';
        if (!groups[sub]) { groups[sub] = []; order.push(sub); }
        groups[sub].push(ty);
      });

      const box = U.el('div', { class: 'pal-cat' });
      order.forEach(function (sub) {
        if (order.length > 1) {
          const lab = SUB_LABELS[sub] || (B().SUB_LABELS && B().SUB_LABELS[sub]) || { es: sub, en: sub };
          box.appendChild(U.el('div', { class: 'pal-sub-title', text: lab[L()] || lab.es }));
        }
        groups[sub].forEach(function (ty) {
          const meta = B().DEFS[ty];
          const loc = meta[L()] || meta.es;
          const selected = ui.docType === ty;
          const btn = U.el('button', {
            class: 'pal-item' + (selected ? ' selected' : ''),
            dataset: { type: ty },
            onclick: function () {
              if (puzzleSkipClick) return;
              ui.docType = ty;
              if (ui.pendingArr) { addBlock(ty); return; }
              /* the doc card lives in the workspace: close the sheet so it can be used */
              if (palIsSheet()) ui.palDock = false;
              render(rootEl());
              scrollToDoc();
            }
          },
            U.el('span', { class: 'pal-item-name', text: loc.name }),
            U.el('span', { class: 'pal-item-desc', text: loc.desc }));
          box.appendChild(btn);
        });
      });
      det.appendChild(box);
      card.appendChild(det);
    });
    card.appendChild(datalist);
    card.appendChild(U.el('p', { class: 'hint', text: t('palette_hint') }));
    if (ui.palQuery) filterPalette(card, ui.palQuery);
    return card;
  }

  /* after picking a block: scroll docs into view */
  function scrollToDoc() {
    setTimeout(function () {
      const d = document.querySelector('.doc-card');
      if (d && typeof d.scrollIntoView === 'function') {
        try { d.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { /* jsdom */ }
      }
    }, 40);
  }

  /* ---------------- Block model undo / redo ---------------- */
  let lastSnap = null;
  const undoStack = [];
  const redoStack = [];

  function snapshotModel() {
    const p = project();
    if (!p || !p.blocks || !p.blocks.model) return null;
    try { return JSON.stringify(p.blocks.model); } catch (e) { return null; }
  }

  function afterStructureChange() {
    const now = snapshotModel();
    if (lastSnap !== null && now !== null && now !== lastSnap) {
      undoStack.push(lastSnap);
      if (undoStack.length > 60) undoStack.shift();
      redoStack.length = 0;
    }
    lastSnap = now;
    saveModel();
    render(rootEl());
  }

  function undoModel() {
    const p = project();
    if (!p || !undoStack.length) { CS.app.toast(t('undo_empty'), 'warn'); return; }
    const now = snapshotModel();
    if (now !== null) redoStack.push(now);
    p.blocks.model = B().normalizeModel(JSON.parse(undoStack.pop()));
    saveModel();
    render(rootEl());
  }

  function redoModel() {
    const p = project();
    if (!p || !redoStack.length) { CS.app.toast(t('redo_empty'), 'warn'); return; }
    const now = snapshotModel();
    if (now !== null) undoStack.push(now);
    p.blocks.model = B().normalizeModel(JSON.parse(redoStack.pop()));
    saveModel();
    render(rootEl());
  }

  function filterPalette(card, query) {
    const q = String(query || '').trim().toLowerCase();
    const cats = card.querySelectorAll('.pal-cat-details');
    cats.forEach(function (det) {
      if (q) det.open = true;
      let visible = 0;
      det.querySelectorAll('.pal-item').forEach(function (item) {
        const match = !q || item.textContent.toLowerCase().indexOf(q) >= 0;
        item.style.display = match ? '' : 'none';
        if (match) visible++;
      });
      det.style.display = visible ? '' : 'none';
    });
  }

  /* ---------------- Contextual documentation ---------------- */
  function renderDoc() {
    const meta = B().DEFS[ui.docType];
    if (!meta) { ui.docType = null; return U.el('span'); }
    const loc = meta[L()] || meta.es;
    const card = U.el('div', { class: 'card doc-card' });
    card.appendChild(U.el('div', { class: 'doc-title', text: loc.name }));
    card.appendChild(U.el('p', { text: loc.desc, class: 'doc-desc' }));

    if (meta.params.length) {
      const ul = U.el('ul', { class: 'doc-params' });
      meta.params.forEach(function (prm) {
        ul.appendChild(U.el('li', {},
          U.el('b', { text: (prm[L()] || prm.es) }),
          U.el('span', { text: ' — ' + paramTypeName(prm.type) })));
      });
      card.appendChild(ul);
    }

    const compat = compatNote(ui.docType);
    if (compat) card.appendChild(U.el('p', { class: 'doc-compat', html: compat }));

    const actions = U.el('div', { class: 'row-gap' });
    actions.appendChild(U.el('button', {
      class: 'btn primary small', onclick: function () { addBlock(ui.docType); }
    }, U.icon('plus', { size: 16 }), t('add_block')));
    actions.appendChild(U.el('button', {
      class: 'btn ghost small', onclick: function () { ui.docType = null; render(rootEl()); }
    }, t('close')));
    card.appendChild(actions);
    return card;
  }

  function paramTypeName(type) {
    const map = {
      element: t('ptype_element'), var: t('ptype_var'), value: t('ptype_value'),
      number: t('ptype_number'), text: t('ptype_text'), select: t('ptype_select'), expr: t('ptype_expr'),
      color: t('ptype_color'), func: t('ptype_func')
    };
    return map[type] || type;
  }

  function compatNote(type) {
    if (type === 'send_update' || type === 'read_update' || type === 'set_var_self_name') {
      return '<b>' + t('compat_webxdc') + '</b> — ' + t('compat_webxdc_note');
    }
    if (type === 'set_html') {
      return t('compat_html_note');
    }
    return '';
  }

  /* ---------------- Block stack ---------------- */
  function renderStack() {
    const m = model();
    const card = U.el('div', { class: 'card stack-card' });

    /* current context title */
    let titleIcon = 'blocks';
    let title;
    if (ui.ctxKind === 'onStart') { titleIcon = 'rocket'; title = t('ctx_onstart'); }
    else if (ui.ctxKind === 'onUpdate') { titleIcon = 'sync'; title = t('ctx_onupdate'); }
    else {
      const list = m.contexts[ui.ctxKind];
      if (!list.length) {
        card.appendChild(U.el('p', { class: 'hint', text: t('no_handlers_hint') }));
        return card;
      }
      const c = list[ui.ctxIndex] || list[0];
      if (ui.ctxKind === 'onClick') { titleIcon = 'click'; title = t('ctx_click', { id: c.target }); }
      else if (ui.ctxKind === 'onChange') { titleIcon = 'pencil'; title = t('ctx_change', { id: c.target }); }
      else if (ui.ctxKind === 'onTouch') { titleIcon = 'hand'; title = t('ctx_touch', { id: c.target }); }
      else { titleIcon = 'fn'; title = t('ctx_function', { name: c.target }); }
    }
    const head = U.el('div', { class: 'card-head' },
      U.icon(titleIcon, { size: 16 }), U.el('span', { text: title }),
      U.el('span', { class: 'spacer' }),
      U.el('button', {
        class: 'btn icon-tiny', title: t('undo'), 'aria-label': t('undo'),
        onclick: function () { undoModel(); }
      }, U.icon('undo', { size: 14 })),
      U.el('button', {
        class: 'btn icon-tiny', title: t('redo'), 'aria-label': t('redo'),
        onclick: function () { redoModel(); }
      }, U.icon('redo', { size: 14 })));
    card.appendChild(head);

    if (ui.pendingArr) {
      card.appendChild(U.el('p', { class: 'notice info' }, U.icon('info', { size: 16 }), t('pending_inside_hint')));
    }

    const arr = currentBlocksArr();
    if (!arr) {
      card.appendChild(U.el('p', { class: 'hint', text: t('stack_empty') }));
      return card;
    }
    card.appendChild(renderBlockList(arr, 0));

    if (ui.ctxKind === 'onUpdate') {
      card.appendChild(U.el('p', { class: 'hint', text: t('ctx_update_note') }));
    }
    return card;
  }

  function renderBlockList(blocks, depth) {
    const wrap = U.el('div', { class: 'block-list drop-list' + (depth ? ' nested' : '') });
    wrap._csArr = blocks;
    if (!blocks.length) {
      wrap.appendChild(U.el('div', { class: 'drop-zone' }, depth ? t('container_empty') : t('stack_empty')));
    }
    blocks.forEach(function (b, i) {
      wrap.appendChild(renderBlock(b, blocks, i, depth));
    });
    return wrap;
  }

  function blockOk(b) {
    const meta = B().DEFS[b.type];
    if (!meta) return false;
    for (let i = 0; i < meta.params.length; i++) {
      const p = meta.params[i];
      const val = b.params[p.key];
      if (p.type === 'element' && !U.isElementId(val)) return false;
      if (p.type === 'func' && !val) return false;
    }
    return true;
  }

  function renderBlock(b, siblings, index, depth) {
    const meta = B().DEFS[b.type];
    const loc = meta ? (meta[L()] || meta.es) : { name: b.type, desc: '?' };
    const selected = ui.selBlockId === b.id;
    const okBlock = blockOk(b);
    const card = U.el('div', { class: 'block-card' + (meta && meta.container ? ' container' : '') + (selected ? ' selected' : ' compact') });
    card._csArr = siblings;
    card._csIndex = index;
    card._csBlock = b;

    /* compact header: name only; tap to edit */
    const head = U.el('div', { class: 'block-head' });
    head.classList.add('puzzle-handle');
    head.appendChild(U.el('span', { class: 'block-status' + (okBlock ? '' : ' bad'), title: okBlock ? t('block_status_ok') : t('block_status_bad') }));
    head.appendChild(U.el('span', { class: 'block-name', text: loc.name }));
    head.appendChild(U.el('span', { class: 'spacer' }));
    head.appendChild(U.el('button', {
      class: 'btn icon-tiny', title: t('block_what'), 'aria-label': t('block_what'),
      onclick: function (ev) { ev.stopPropagation(); ui.docType = b.type; ui.selBlockId = b.id; render(rootEl()); }
    }, U.icon('info', { size: 14 })));
    head.appendChild(U.el('button', {
      class: 'btn icon-tiny', title: t('move_up'), 'aria-label': t('move_up'),
      onclick: function () { if (index > 0) { siblings.splice(index, 1); siblings.splice(index - 1, 0, b); afterStructureChange(); } }
    }, '↑'));
    head.appendChild(U.el('button', {
      class: 'btn icon-tiny', title: t('move_down'), 'aria-label': t('move_down'),
      onclick: function () { if (index < siblings.length - 1) { siblings.splice(index, 1); siblings.splice(index + 1, 0, b); afterStructureChange(); } }
    }, '↓'));
    head.appendChild(U.el('button', {
      class: 'btn icon-tiny danger-text', title: t('delete'), 'aria-label': t('delete'),
      onclick: function () { siblings.splice(index, 1); afterStructureChange(); }
    }, U.icon('close', { size: 14 })));
    head.addEventListener('click', function (ev) {
      if (puzzleSkipClick) return;
      if (ev.target.closest && ev.target.closest('button')) return;
      ui.selBlockId = selected ? null : b.id;
      ui.docType = b.type;
      render(rootEl());
    });
    card.appendChild(head);

    /* params: only on the selected block */
    if (selected && meta && meta.params.length) {
      const paramsRow = U.el('div', { class: 'block-params' });
      meta.params.forEach(function (prm) {
        paramsRow.appendChild(renderParam(b, prm));
      });
      card.appendChild(paramsRow);
    }

    /* hijos (contenedores) */
    if (meta && meta.container) {
      const childWrap = U.el('div', { class: 'block-children' });
      b.children = b.children || [];
      childWrap.appendChild(renderBlockList(b.children, depth + 1));
      childWrap.appendChild(U.el('button', {
        class: 'btn ghost tiny add-inside',
        onclick: function () {
          b.children = b.children || [];
          pickInside(b.children);
        }
      }, U.icon('plus', { size: 14 }), t('add_inside')));
      card.appendChild(childWrap);
    }

    /* else branch (if_else) */
    if (meta && meta.elseBranch) {
      b.childrenElse = b.childrenElse || [];
      const elseWrap = U.el('div', { class: 'block-children else-branch' });
      elseWrap.appendChild(U.el('div', { class: 'else-label' }, U.icon('wrap', { size: 14 }), t('else_label')));
      elseWrap.appendChild(renderBlockList(b.childrenElse, depth + 1));
      elseWrap.appendChild(U.el('button', {
        class: 'btn ghost tiny add-inside',
        onclick: function () {
          b.childrenElse = b.childrenElse || [];
          pickInside(b.childrenElse);
        }
      }, U.icon('plus', { size: 14 }), t('add_inside')));
      card.appendChild(elseWrap);
    }
    return card;
  }

  function renderParam(b, prm) {
    const box = U.el('label', { class: 'param' });
    box.appendChild(U.el('span', { class: 'param-label', text: prm[L()] || prm.es }));
    const val = b.params[prm.key];

    if (prm.type === 'value') {
      return renderValueParam(b, prm, box, val);
    }
    if (prm.type === 'color') {
      const wrap = U.el('span', { class: 'param-color' });
      const pick = U.el('input', {
        class: 'input color-well', type: 'color', value: B().isHexColor(val || prm.def || '#e74c3c') ? (val || prm.def) : '#e74c3c',
        oninput: function () { b.params[prm.key] = this.value; refreshCode(); },
        onchange: function () { saveModel(); }
      });
      const txt = U.el('input', {
        class: 'input color-hex', value: val || '', placeholder: '#rrggbb', maxlength: 7,
        oninput: function () {
          b.params[prm.key] = this.value;
          if (B().isHexColor(this.value)) pick.value = this.value;
          refreshCode();
        },
        onchange: function () { saveModel(); }
      });
      wrap.appendChild(pick);
      wrap.appendChild(txt);
      box.appendChild(wrap);
      return box;
    }
    if (prm.type === 'func') {
      const fns = model().contexts.functions;
      const sel = U.el('select', { class: 'input', onchange: function () { b.params[prm.key] = this.value; afterStructureChange(); } });
      if (!fns.length) sel.appendChild(new Option(t('no_fns_yet'), ''));
      fns.forEach(function (f) {
        const opt = new Option(f.target, f.target);
        if (val === f.target) opt.selected = true;
        sel.appendChild(opt);
      });
      box.appendChild(sel);
      return box;
    }
    if (prm.type === 'select') {
      const sel = U.el('select', { class: 'input', onchange: function () { b.params[prm.key] = this.value; afterStructureChange(); } });
      prm.options.forEach(function (o) {
        const opt = new Option(o[L()] || o.es, o.v);
        if (val === o.v) opt.selected = true;
        sel.appendChild(opt);
      });
      box.appendChild(sel);
      return box;
    }
    if (prm.type === 'element') {
      const inp = U.el('input', {
        class: 'input', value: val || '', list: 'wcs-ids', placeholder: 'id',
        oninput: function () { b.params[prm.key] = this.value; refreshCode(); },
        onchange: function () { saveModel(); }
      });
      box.appendChild(inp);
      return box;
    }
    if (prm.type === 'var') {
      const datalistId = 'wcs-vars';
      let dl = document.getElementById(datalistId);
      if (!dl) {
        dl = U.el('datalist', { id: datalistId });
        document.body.appendChild(dl);
      }
      dl.textContent = '';
      model().vars.forEach(function (v) { dl.appendChild(new Option(v.name)); });
      const inp = U.el('input', {
        class: 'input', value: val || '', list: datalistId, placeholder: 'variable',
        oninput: function () { b.params[prm.key] = this.value; refreshCode(); },
        onchange: function () { saveModel(); }
      });
      box.appendChild(inp);
      return box;
    }
    if (prm.type === 'sprite') return renderSpriteParam(b, prm, box, val);
    if (prm.type === 'asset') return renderAssetParam(b, prm, box, val);
    if (prm.type === 'pixels' || prm.type === 'map') {
      box.appendChild(gridEditor(b, prm));
      return box;
    }
    /* text | number | expr */
    const inp = U.el('input', {
      class: 'input', value: val == null ? '' : String(val), placeholder: prm.placeholder || '',
      type: prm.type === 'number' ? 'number' : 'text',
      oninput: function () { b.params[prm.key] = this.value; refreshCode(); },
      onchange: function () { saveModel(); }
    });
    box.appendChild(inp);
    return box;
  }

  /* ---------- Game engine parameters ---------- */
  function spriteNames() {
    const names = new Set();
    const m = model();
    const visit = function (list) {
      (list || []).forEach(function (blk) {
        if (!blk) return;
        if (blk.params && typeof blk.params.sname === 'string' && /^[\w-]{1,40}$/.test(blk.params.sname)) names.add(blk.params.sname);
        visit(blk.children); visit(blk.childrenElse);
      });
    };
    if (m) {
      visit(m.contexts.onStart); visit(m.contexts.onUpdate);
      ['onClick', 'onChange', 'onTouch', 'functions'].forEach(function (k) { m.contexts[k].forEach(function (c) { visit(c.blocks); }); });
    }
    return Array.from(names).sort().concat(B().SPRITE_REFS || []);
  }

  function renderSpriteParam(b, prm, box, val) {
    let dl = document.getElementById('wcs-sprites');
    if (!dl) { dl = U.el('datalist', { id: 'wcs-sprites' }); document.body.appendChild(dl); }
    dl.textContent = '';
    spriteNames().forEach(function (n) { dl.appendChild(new Option(n)); });
    box.appendChild(U.el('input', {
      class: 'input', value: val || '', list: 'wcs-sprites', placeholder: t('gx_sprite_ph'),
      autocapitalize: 'off', spellcheck: 'false',
      oninput: function () { b.params[prm.key] = this.value.trim(); refreshCode(); },
      onchange: function () { saveModel(); }
    }));
    return box;
  }

  function renderAssetParam(b, prm, box, val) {
    const p = project();
    const imgs = Object.keys((p && p.files) || {}).filter(function (path) {
      const f = p.files[path];
      return /\.(png|jpe?g|gif|webp|svg)$/i.test(path) || (f && f.mime && f.mime.indexOf('image/') === 0);
    }).sort();
    const sel = U.el('select', { class: 'input', onchange: function () { b.params[prm.key] = this.value; afterStructureChange(); } });
    sel.appendChild(new Option(imgs.length ? t('gx_pick_image') : t('gx_no_images'), ''));
    imgs.forEach(function (path) {
      const opt = new Option(path, path);
      if (val === path) opt.selected = true;
      sel.appendChild(opt);
    });
    box.appendChild(sel);
    return box;
  }

  /* Grid painter shared by pixel art (16-color palette, animation frames) and tile maps (level tiles). */
  const MAP_TILES = [
    { ch: '.', color: 'transparent', label: '·' }, { ch: '#', color: '#64748b', label: '#' },
    { ch: '=', color: '#b45309', label: '=' }, { ch: 'o', color: '#facc15', label: '●' },
    { ch: '*', color: '#fde68a', label: '⭐' }, { ch: 'x', color: '#ef4444', label: '▲' },
    { ch: 'e', color: '#a855f7', label: '👾' }, { ch: 'G', color: '#22c55e', label: '🚩' },
    { ch: 'P', color: '#38bdf8', label: '🙂' }
  ];
  function gridEditor(b, prm) {
    const isMap = prm.type === 'map';
    const engineColors = (CS.gameEngine && CS.gameEngine.PALETTE) || [];
    const palette = isMap ? MAP_TILES : [{ ch: '.', color: 'transparent', label: '' }].concat(engineColors.map(function (c, i) {
      return { ch: i.toString(16), color: c, label: '' };
    }));
    const st = { frames: parse(String(b.params[prm.key] == null ? '' : b.params[prm.key])), cur: 0, ch: isMap ? '#' : 'a', painting: false };
    if (!st.frames.length) st.frames = [blank(isMap ? 11 : 8, isMap ? 7 : 8)];

    function parse(text) {
      const chunks = isMap ? [text] : text.replace(/\r/g, '').split(/\n\s*\n|\|/);
      return chunks.map(function (c) {
        return c.replace(/\r/g, '').split(isMap ? /\n/ : /\n|\//).map(function (r) { return r.trimEnd(); }).filter(function (r) { return r.trim(); });
      }).filter(function (rows) { return rows.length; }).map(function (rows) {
        const w = Math.max.apply(null, rows.map(function (r) { return r.length; }));
        return rows.map(function (r) { return (r + '.'.repeat(w)).slice(0, w).replace(/ /g, '.').split(''); });
      });
    }
    function blank(w, h) {
      const g = [];
      for (let y = 0; y < h; y++) g.push(new Array(w).fill('.'));
      return g;
    }
    function serialize() {
      return st.frames.map(function (g) { return g.map(function (r) { return r.join(''); }).join('\n'); }).join(isMap ? '\n' : '\n\n');
    }
    function grid() { return st.frames[st.cur]; }
    function commit(save) {
      b.params[prm.key] = serialize();
      text.value = b.params[prm.key];
      if (save) { refreshCode(); saveModel(); }
    }

    const wrap = U.el('div', { class: 'gx-grid' + (isMap ? ' map' : ' pixels') });
    const canvas = U.el('canvas', { class: 'gx-canvas', 'aria-label': prm[L()] || prm.es });
    const ctx = canvas.getContext ? canvas.getContext('2d') : null;
    function draw() {
      const g = grid(), w = g[0].length, h = g.length;
      const cell = isMap ? 22 : Math.max(14, Math.floor(272 / Math.max(w, h)));
      canvas.width = w * cell; canvas.height = h * cell;
      if (!ctx) return;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          ctx.fillStyle = (x + y) % 2 ? '#e2e8f0' : '#f8fafc';
          ctx.fillRect(x * cell, y * cell, cell, cell);
          const tile = palette.find(function (pp) { return pp.ch === g[y][x]; });
          if (tile && tile.color !== 'transparent') {
            ctx.fillStyle = tile.color;
            ctx.fillRect(x * cell, y * cell, cell, cell);
          }
          if (isMap && tile && tile.label && tile.ch !== '.' && tile.ch !== '#' && tile.ch !== '=') {
            ctx.font = Math.round(cell * 0.7) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(tile.label, x * cell + cell / 2, y * cell + cell / 2 + 1);
          }
        }
      }
      ctx.strokeStyle = 'rgba(15,23,42,.08)';
      for (let x = 0; x <= w; x++) { ctx.beginPath(); ctx.moveTo(x * cell + 0.5, 0); ctx.lineTo(x * cell + 0.5, h * cell); ctx.stroke(); }
      for (let y = 0; y <= h; y++) { ctx.beginPath(); ctx.moveTo(0, y * cell + 0.5); ctx.lineTo(w * cell, y * cell + 0.5); ctx.stroke(); }
    }
    function paintAt(ev) {
      const r = canvas.getBoundingClientRect(), g = grid();
      const x = Math.floor((ev.clientX - r.left) / (r.width / g[0].length));
      const y = Math.floor((ev.clientY - r.top) / (r.height / g.length));
      if (y < 0 || y >= g.length || x < 0 || x >= g[0].length || g[y][x] === st.ch) return;
      if (isMap && st.ch === 'P') st.frames.forEach(function (fr) { fr.forEach(function (row) { for (let i = 0; i < row.length; i++) if (row[i] === 'P') row[i] = '.'; }); });
      g[y][x] = st.ch;
      draw();
      commit(false);
    }
    canvas.addEventListener('pointerdown', function (ev) {
      ev.preventDefault(); st.painting = true;
      try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* jsdom */ }
      paintAt(ev);
    });
    canvas.addEventListener('pointermove', function (ev) { if (st.painting) paintAt(ev); });
    const stop = function () { if (st.painting) { st.painting = false; commit(true); } };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);

    /* palette */
    const pal = U.el('div', { class: 'gx-palette', role: 'radiogroup' });
    palette.forEach(function (pp) {
      const sw = U.el('button', {
        type: 'button', class: 'gx-swatch' + (pp.ch === st.ch ? ' active' : '') + (pp.color === 'transparent' ? ' erase' : ''),
        role: 'radio', 'aria-checked': String(pp.ch === st.ch),
        'aria-label': pp.ch === '.' ? t('gx_erase') : (isMap ? pp.label : pp.color),
        title: pp.ch === '.' ? t('gx_erase') : (isMap ? pp.label + ' (' + pp.ch + ')' : pp.color),
        onclick: function () {
          st.ch = pp.ch;
          pal.querySelectorAll('.gx-swatch').forEach(function (x) { x.classList.remove('active'); x.setAttribute('aria-checked', 'false'); });
          sw.classList.add('active'); sw.setAttribute('aria-checked', 'true');
        }
      });
      sw.style.setProperty('--sw', pp.color);
      if (isMap && pp.ch !== '.') sw.textContent = pp.label;
      pal.appendChild(sw);
    });

    /* toolbar: frames (pixels) or size (map) */
    const bar = U.el('div', { class: 'gx-bar' });
    function frameChips() {
      bar.textContent = '';
      if (!isMap) {
        st.frames.forEach(function (fr, i) {
          bar.appendChild(U.el('button', {
            type: 'button', class: 'chip' + (i === st.cur ? ' active' : ''), text: String(i + 1),
            'aria-label': t('gx_frame') + ' ' + (i + 1),
            onclick: function () { st.cur = i; frameChips(); draw(); }
          }));
        });
        if (st.frames.length < 8) {
          bar.appendChild(U.el('button', {
            type: 'button', class: 'chip', title: t('gx_frame_add'), 'aria-label': t('gx_frame_add'),
            onclick: function () { st.frames.push(grid().map(function (r) { return r.slice(); })); st.cur = st.frames.length - 1; frameChips(); draw(); commit(true); }
          }, U.icon('plus', { size: 14 })));
        }
        if (st.frames.length > 1) {
          bar.appendChild(U.el('button', {
            type: 'button', class: 'chip', title: t('gx_frame_del'), 'aria-label': t('gx_frame_del'),
            onclick: function () { st.frames.splice(st.cur, 1); st.cur = Math.max(0, st.cur - 1); frameChips(); draw(); commit(true); }
          }, U.icon('trash', { size: 14 })));
        }
        bar.appendChild(U.el('span', { class: 'spacer' }));
        const size = U.el('select', {
          class: 'input gx-size', 'aria-label': t('gx_size'),
          onchange: function () {
            const n = Number(this.value);
            st.frames = st.frames.map(function (g) { return resize(g, n, n); });
            draw(); commit(true);
          }
        });
        [8, 12, 16, 24].forEach(function (n) { const op = new Option(n + '×' + n, String(n)); if (grid()[0].length === n) op.selected = true; size.appendChild(op); });
        bar.appendChild(size);
      } else {
        const g = grid();
        const step = function (label, aria, dw, dh) {
          return U.el('button', {
            type: 'button', class: 'chip', text: label, 'aria-label': aria,
            onclick: function () {
              const cur = grid();
              const w = Math.max(4, Math.min(60, cur[0].length + dw)), h = Math.max(3, Math.min(30, cur.length + dh));
              st.frames = [resize(cur, w, h)];
              frameChips(); draw(); commit(true);
            }
          });
        };
        bar.appendChild(U.el('span', { class: 'hint', text: t('gx_cols') + ' ' + g[0].length }));
        bar.appendChild(step('−', t('gx_cols') + ' −', -1, 0));
        bar.appendChild(step('+', t('gx_cols') + ' +', 1, 0));
        bar.appendChild(U.el('span', { class: 'hint', text: t('gx_rows') + ' ' + g.length }));
        bar.appendChild(step('−', t('gx_rows') + ' −', 0, -1));
        bar.appendChild(step('+', t('gx_rows') + ' +', 0, 1));
      }
    }
    function resize(g, w, h) {
      const out = blank(w, h);
      for (let y = 0; y < Math.min(h, g.length); y++) for (let x = 0; x < Math.min(w, g[0].length); x++) out[y][x] = g[y][x];
      return out;
    }

    const tools = U.el('div', { class: 'gx-tools' });
    if (!isMap) {
      tools.appendChild(U.el('button', {
        type: 'button', class: 'btn ghost small', onclick: function () {
          st.frames[st.cur] = grid().map(function (r) { return r.slice().reverse(); }); draw(); commit(true);
        }
      }, U.icon('flip', { size: 14 }), t('gx_mirror')));
    }
    tools.appendChild(U.el('button', {
      type: 'button', class: 'btn ghost small', onclick: function () {
        const g = grid(); st.frames[st.cur] = blank(g[0].length, g.length); draw(); commit(true);
      }
    }, U.icon('eraser', { size: 14 }), t('gx_clear')));
    const text = U.el('textarea', {
      class: 'input gx-text', rows: 6, spellcheck: 'false', autocapitalize: 'off', hidden: true,
      oninput: function () {
        const fr = parse(this.value);
        if (fr.length) { st.frames = fr; st.cur = Math.min(st.cur, fr.length - 1); frameChips(); draw(); }
        b.params[prm.key] = this.value; refreshCode();
      },
      onchange: function () { saveModel(); }
    });
    tools.appendChild(U.el('button', {
      type: 'button', class: 'btn ghost small', onclick: function () { text.hidden = !text.hidden; }
    }, U.icon('code', { size: 14 }), t('gx_as_text')));

    wrap.appendChild(bar);
    wrap.appendChild(U.el('div', { class: 'gx-stage' }, canvas));
    wrap.appendChild(pal);
    wrap.appendChild(tools);
    wrap.appendChild(text);
    if (isMap) wrap.appendChild(U.el('p', { class: 'hint gx-legend', text: t('gx_map_legend') }));
    frameChips();
    draw();
    text.value = serialize();
    if (b.params[prm.key] !== text.value) b.params[prm.key] = text.value;
    return wrap;
  }

  function renderValueParam(b, prm, box, val) {
    val = val || { kind: 'text', value: '' };
    b.params[prm.key] = val;
    const m = model();
    const kindSel = U.el('select', { class: 'input val-kind', onchange: function () {
      val.kind = this.value;
      if (val.kind === 'var' && !val.name) {
        const first = m.vars[0];
        if (first) val.name = first.name;
      }
      if (val.kind === 'input' && !val.id) val.id = htmlIds()[0] || '';
      afterStructureChange();
    } });
    [['text', t('vkind_text')], ['number', t('vkind_number')], ['var', t('vkind_var')], ['input', t('vkind_input')]].forEach(function (o) {
      const opt = new Option(o[1], o[0]);
      if (val.kind === o[0]) opt.selected = true;
      kindSel.appendChild(opt);
    });
    box.appendChild(kindSel);

    if (val.kind === 'var') {
      const sel = U.el('select', { class: 'input', onchange: function () { val.name = this.value; afterStructureChange(); } });
      if (!m.vars.length) sel.appendChild(new Option(t('no_vars_yet'), ''));
      m.vars.forEach(function (v) {
        const opt = new Option(v.name, v.name);
        if (val.name === v.name) opt.selected = true;
        sel.appendChild(opt);
      });
      box.appendChild(sel);
    } else if (val.kind === 'input') {
      const inp = U.el('input', {
        class: 'input', value: val.id || '', list: 'wcs-ids', placeholder: 'id',
        oninput: function () { val.id = this.value; refreshCode(); },
        onchange: function () { saveModel(); }
      });
      box.appendChild(inp);
    } else {
      const inp = U.el('input', {
        class: 'input', value: val.value == null ? '' : String(val.value),
        type: val.kind === 'number' ? 'number' : 'text',
        oninput: function () { val.value = this.value; refreshCode(); },
        onchange: function () { saveModel(); }
      });
      box.appendChild(inp);
    }
    return box;
  }

  /* ---------------- Generated code ---------------- */
  function genResult() {
    const p = project();
    if (!p || !p.blocks.model) return { code: '', problems: [] };
    return B().generate(p.blocks.model);
  }

  function toggleCodeFs(card, area) {
    const on = !card.classList.contains('fs');
    card.classList.toggle('fs', on);
    const old = card.querySelector('.fs-bar');
    if (old) old.remove();
    if (on) {
      const bar = U.el('div', { class: 'fs-bar' },
        U.el('span', { class: 'mono fs-file', text: p_blocks_file() }),
        U.el('span', { class: 'spacer' }),
        U.el('button', { class: 'btn small fs-exit', onclick: function () { toggleCodeFs(card, area); } }, U.icon('close', { size: 16 }), t('fs_close')));
      card.insertBefore(bar, card.firstChild);
      if (area && area.focus) setTimeout(function () { area.focus(); }, 40);
    }
    /* no background scroll while the code window covers the screen */
    try { document.body.classList.toggle('fs-open', on); } catch (e) { /* ignore */ }
  }

  function p_blocks_file() {
    const p = project();
    return p && p.blocks ? p.blocks.generatedFile : '';
  }

  function renderCode() {
    const p = project();
    const card = U.el('div', { class: 'card code-card' });
    const res = genResult();

    const head = U.el('div', { class: 'card-head' },
      U.icon('code', { size: 16 }), U.el('span', { text: t('generated_code') }),
      U.el('span', { class: 'spacer' }),
      U.el('span', { class: 'chip mono', text: p.blocks.generatedFile }),
      U.el('button', {
        class: 'btn icon-tiny', title: t('fs_open'), 'aria-label': t('fs_open'),
        onclick: function () { toggleCodeFs(card, area); }
      }, U.icon('expand', { size: 14 })));
    card.appendChild(head);

    if (res.problems.length) {
      card.appendChild(U.el('p', { class: 'notice warn' }, U.icon('warn', { size: 16 }), t('blocks_incomplete', { n: res.problems.length })));
    }

    const area = U.el('textarea', {
      class: 'code-area readonly', readonly: 'readonly', spellcheck: 'false',
      wrap: 'off',
      /* Escape leaves fullscreen, as in the editor */
      onkeydown: function (ev) {
        if (ev.key === 'Escape' && card.classList.contains('fs')) {
          ev.preventDefault();
          toggleCodeFs(card, area);
        }
      }
    });
    area.value = res.code;
    els.codeArea = area;
    card.appendChild(area);

    const actions = U.el('div', { class: 'row-gap wrap' });
    actions.appendChild(U.el('button', { class: 'btn small', onclick: copyCode }, U.icon('copy', { size: 16 }), t('copy')));
    actions.appendChild(U.el('button', { class: 'btn small', onclick: insertIntoFile }, U.icon('file', { size: 16 }), t('insert_into_file')));
    actions.appendChild(U.el('button', { class: 'btn primary small', onclick: writeGeneratedFile }, U.icon('check', { size: 16 }), t('write_generated', { file: p.blocks.generatedFile })));
    card.appendChild(actions);
    card.appendChild(U.el('p', { class: 'hint', text: t('generated_note') }));
    return card;
  }

  function refreshCode() {
    /* Only updates the code panel (no re-render: does not steal focus). */
    if (els.codeArea) {
      const res = genResult();
      els.codeArea.value = res.code;
    }
    const p = project();
    if (p) saveModelDebounced();
  }

  const saveModelDebounced = U.debounce(function () { saveModel(); }, 900);

  /* ---------------- Acciones ---------------- */
  function addBlock(type) {
    if (ui.pendingArr) {
      const arr = ui.pendingArr;
      ui.pendingArr = null;
      addBlockTo(arr, type);
      return;
    }
    const arr = currentBlocksArr(true);
    if (!arr) { CS.app.toast(t('no_handler_selected'), 'error'); return; }
    addBlockTo(arr, type);
  }

  /* Add inside: the next block picked from the palette is inserted
 * * into the chosen container (fix: the button used to do nothing).*/
  function pickInside(arr) {
    ui.pendingArr = arr;
    ui.docType = null;
    ui.paletteOpen = true;
    render(rootEl());
  }

  function addBlockTo(arr, type) {
    const b = B().newBlock(type === undefined ? ui.docType : type);
    if (!b) return;
    arr.push(b);
    ui.selBlockId = b.id;
    ui.docType = b.type;
    afterStructureChange();
    CS.app.toast(t('block_added'));
  }

  function addTargetModal() {
    CS.app.sheet({
      title: t('add_handler'),
      items: [
        { icon: 'click', label: t('handler_click'), fn: function () { promptTarget('onClick'); } },
        { icon: 'hand', label: t('handler_touch'), fn: function () { promptTarget('onTouch'); } },
        { icon: 'pencil', label: t('handler_change'), fn: function () { promptTarget('onChange'); } },
        { icon: 'fn', label: t('handler_function'), fn: function () { promptTarget('functions'); } }
      ]
    });
  }

  function promptTarget(kind) {
    if (kind === 'functions') {
      CS.app.prompt({
        title: t('handler_function'),
        label: t('fn_name_label'),
        value: 'miFuncion',
        validate: function (v) {
          if (!U.isVarName(v)) return t('err_bad_fn');
          const m = model();
          if (m.contexts.functions.some(function (f) { return f.target === v; })) return t('err_dup_function');
          return null;
        }
      }).then(function (value) {
        if (!value) return;
        const m = model();
        m.contexts.functions.push({ target: value, blocks: [] });
        ui.ctxKind = 'functions';
        ui.ctxIndex = m.contexts.functions.length - 1;
        saveModel();
        render(rootEl());
      });
      return;
    }
    const ids = htmlIds();
    CS.app.prompt({
      title: t(kind === 'onClick' ? 'handler_click' : (kind === 'onTouch' ? 'handler_touch' : 'handler_change')),
      label: t('target_label'),
      value: ids[0] || '',
      datalist: ids,
      validate: function (v) {
        if (!U.isElementId(v)) return t('err_bad_id');
        const m = model();
        if (m.contexts[kind].some(function (c) { return c.target === v; })) return t('err_dup_handler');
        return null;
      }
    }).then(function (value) {
      if (!value) return;
      const m = model();
      m.contexts[kind].push({ target: value, blocks: [] });
      ui.ctxKind = kind;
      ui.ctxIndex = m.contexts[kind].length - 1;
      saveModel();
      render(rootEl());
    });
  }

  function copyCode() {
    const res = genResult();
    const text = res.code;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        CS.app.toast(t('copied_ok'));
      }).catch(function () { copyFallback(text); });
    } else {
      copyFallback(text);
    }
  }

  function copyFallback(text) {
    CS.app.modal({
      title: t('copy'),
      body: (function () {
        const ta = U.el('textarea', { class: 'code-area', style: { minHeight: '160px' } });
        ta.value = text;
        setTimeout(function () { ta.focus(); ta.select(); }, 30);
        return U.el('div', {}, U.el('p', { class: 'hint', text: t('copy_manual') }), ta);
      })(),
      actions: [{ label: t('close') }]
    });
  }

  function insertIntoFile() {
    const p = project();
    const res = genResult();
    const textFiles = CS.projects.fileList(p).filter(function (x) { return p.files[x].kind === 'text'; });
    if (!textFiles.length) { CS.app.toast(t('err_generic'), 'error'); return; }
    CS.app.sheet({
      title: t('insert_into_file'),
      items: textFiles.slice(0, 12).map(function (f) {
        return {
          icon: 'file',
          label: f,
          fn: function () {
            const marker = '\n/* ===== Bloques (' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ') ===== */\n';
            p.files[f].content = p.files[f].content.replace(/\s*$/, '') + '\n' + marker + res.code + '/* ===== fin bloques ===== */\n';
            CS.projects.save(p).then(function () {
              CS.app.toast(t('inserted_ok', { file: f }));
              if (CS.editor) CS.editor.render(document.getElementById('view-editor'));
            });
          }
        };
      })
    });
  }

  /* Write the generated file with overwrite protection: it is written without
     asking only if the current file was generated by blocks and not edited since. */
  function writeGeneratedFile(done) {
    const p = project();
    const res = genResult();
    const target = p.blocks.generatedFile;
    const exists = !!p.files[target];
    const isOurs = !!p.blocks.lastGeneratedAt && !p.blocks.handEdited;

    function doWrite() {
      p.files[target] = { kind: 'text', content: res.code };
      p.blocks.handEdited = false;
      p.blocks.lastGeneratedAt = Date.now();
      try {
        const ids = B().referencedElements(model()).ids;
        const htmlFile = p.files['index.html'];
        if (htmlFile && htmlFile.kind === 'text' && B().ensurePlaceholders) {
          const r = B().ensurePlaceholders(htmlFile.content, ids);
          if (r.added.length) {
            htmlFile.content = r.html;
            CS.app.toast(t('placeholders_added', { ids: r.added.map(function (x) { return '#' + x; }).join(', ') }));
          }
        }
      } catch (e) { /* do not block JS typing */ }
      CS.projects.save(p).then(function () {
        /* also used directly as a click handler: done may be the event */
        if (typeof done === 'function') done();
        else CS.app.toast(t('generated_written', { file: target }));
        render(rootEl());
        if (CS.editor) CS.editor.render(document.getElementById('view-editor'));
      });
    }

    if (exists && !isOurs) {
      CS.app.confirm({
        title: t('overwrite_title'),
        message: t('overwrite_generated', { file: target }),
        danger: true,
        okLabel: t('overwrite_ok')
      }).then(function (yes) {
        if (yes) doWrite();
        else CS.app.toast(t('cancelled'));
      });
    } else {
      doWrite();
    }
  }

  /* ---------------- Export ---------------- */
  /* Puzzle-style drag with pointer events (works on iOS; HTML5 DnD does not). */
  let puzzleDrag = null;
  let puzzleSkipClick = false;

  function bindPuzzleDnD(root) {
    root.querySelectorAll('.pal-item').forEach(function (el) {
      el.addEventListener('pointerdown', function (ev) {
        if (ev.button && ev.button !== 0) return;
        startPuzzle(ev, { kind: 'palette', type: el.dataset.type, label: (el.querySelector('.pal-item-name') || el).textContent });
      });
    });
    root.querySelectorAll('.puzzle-handle').forEach(function (el) {
      el.addEventListener('pointerdown', function (ev) {
        if (ev.button && ev.button !== 0) return;
        if (ev.target && ev.target.closest && ev.target.closest('button')) return;
        const card = el.closest('.block-card');
        if (!card || !card._csArr) return;
        startPuzzle(ev, { kind: 'move', arr: card._csArr, index: card._csIndex, block: card._csBlock, label: (card.querySelector('.block-name') || card).textContent });
      });
    });
  }

  function startPuzzle(ev, info) {
    if (!info.type && info.kind === 'palette') return;
    const startX = ev.clientX, startY = ev.clientY;
    let started = false;
    /* Prevent text selection / page scroll while deciding whether to drag */
    const onSelectStart = function (e) { e.preventDefault(); };
    document.addEventListener('selectstart', onSelectStart, true);

    const onMove = function (e2) {
      const dx = e2.clientX - startX, dy = e2.clientY - startY;
      if (!started && dx * dx + dy * dy < 36) return; /* slightly more sensitive */
      if (e2.cancelable) e2.preventDefault();
      if (!started) {
        started = true;
        document.body.classList.add('puzzle-dragging');
        /* Mobile: hide palette overlay without full re-render so drop targets stay alive */
        if (isMobileUi() && ui.palDock) {
          ui.palDock = false;
          ui.palUserSet = true;
          hidePalOverlay();
        }
        puzzleDrag = info;
        const ghost = U.el('div', { class: 'puzzle-ghost', text: String(info.label || '').slice(0, 40) });
        document.body.appendChild(ghost);
        puzzleDrag.ghost = ghost;
        try { ev.target.setPointerCapture && ev.target.setPointerCapture(ev.pointerId); } catch (err) { /* ignore */ }
      }
      if (puzzleDrag && puzzleDrag.ghost) {
        puzzleDrag.ghost.style.left = (e2.clientX + 8) + 'px';
        puzzleDrag.ghost.style.top = (e2.clientY + 8) + 'px';
      }
      highlightDrop(e2.clientX, e2.clientY);
    };
    const onUp = function (e2) {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      document.removeEventListener('selectstart', onSelectStart, true);
      document.body.classList.remove('puzzle-dragging');
      if (!started) return;
      if (e2.cancelable) e2.preventDefault();
      puzzleSkipClick = true;
      setTimeout(function () { puzzleSkipClick = false; }, 400);
      const target = dropTarget(e2.clientX, e2.clientY);
      finishPuzzle(target);
    };
    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  }

  function dropTarget(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el || !el.closest) return null;
    /* Prefer an explicit drop-list (empty zone or nested list), then a block card */
    var list = el.closest('.drop-list');
    if (list) return list;
    var zone = el.closest('.drop-zone');
    if (zone && zone.parentElement) return zone.parentElement.closest ? zone.parentElement.closest('.drop-list') || zone.parentElement : zone.parentElement;
    return el.closest('.block-card');
  }

  function highlightDrop(x, y) {
    U.$$('.drop-hover').forEach(function (n) { n.classList.remove('drop-hover'); });
    const t = dropTarget(x, y);
    if (t) t.classList.add('drop-hover');
  }

  function finishPuzzle(target) {
    U.$$('.drop-hover').forEach(function (n) { n.classList.remove('drop-hover'); });
    if (puzzleDrag && puzzleDrag.ghost) puzzleDrag.ghost.remove();
    const drag = puzzleDrag;
    puzzleDrag = null;
    if (!drag || !target) return;
    let arr = target._csArr;
    if (!arr && target.classList.contains('block-card') && target.parentElement) arr = target.parentElement._csArr;
    if (!arr) return;
    if (drag.kind === 'palette' && drag.type) {
      if (target.classList.contains('block-card') && target._csBlock && arr === target._csArr) {
        const b = B().newBlock(drag.type);
        if (!b) return;
        let j = arr.indexOf(target._csBlock);
        if (j < 0) j = arr.length;
        arr.splice(j, 0, b);
        ui.selBlockId = b.id;
        ui.docType = b.type;
        afterStructureChange();
        CS.app.toast(t('block_added'));
      } else {
        addBlockTo(arr, drag.type);
      }
    } else if (drag.kind === 'move' && drag.block && drag.arr) {
      const from = drag.arr;
      const i = from.indexOf(drag.block);
      if (i < 0) return;
      from.splice(i, 1);
      if (target.classList.contains('block-card') && target._csBlock && arr === target._csArr) {
        let j = arr.indexOf(target._csBlock);
        if (j < 0) j = arr.length;
        arr.splice(j, 0, drag.block);
      } else {
        arr.push(drag.block);
      }
      afterStructureChange();
    }
  }

  CS.blocksUI = {
    render,
    get ui() { return ui; }
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = CS.blocksUI; }
})();
