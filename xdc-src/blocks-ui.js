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
    docType: null,        /* tipo de bloque mostrado en el panel de doc */
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
  function ensurePalDefault() {
    if (ui.palUserSet) return;
    ui.palDock = !isMobileUi();
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

  /* ---------- ids presentes en index.html (para datalist) ---------- */
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

    /* Aviso si el archivo generado fue editado a mano */
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
    root.appendChild(U.el('div', { class: 'row-gap wrap' }, palToggle,
      U.el('p', { class: 'hint puzzle-hint' }, U.icon('hand', { size: 14 }), t('puzzle_hint'))));

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
          const lab = SUB_LABELS[sub] || { es: sub, en: sub };
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

  /* ---------------- Undo / redo del modelo de bloques ---------------- */
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

  /* ---------------- Pila de bloques ---------------- */
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

    /* cabecera compacta: solo nombre; al tocar se edita */
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

    /* rama «si no…» (if_else) */
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
      /* (): Escape sale del fullscreen, igual que en el editor */
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

  /* Write generated file — with overwrite protection.
     Solo se escribe sin preguntar si el archivo actual fue generado por
     bloques Y no fue editado a mano desde entonces. */
  function writeGeneratedFile() {
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
      } catch (e) { /* no bloquear la escritura de JS */ }
      CS.projects.save(p).then(function () {
        CS.app.toast(t('generated_written', { file: target }));
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
  /* Arrastre tipo puzle: pointer events (funciona en iOS; HTML5 DnD no). */
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
