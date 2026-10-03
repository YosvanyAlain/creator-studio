/* Prism UI components. Every component returns a DOM node; overlays return a handle with close(). */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, icon } = CS;
  const t = (...a) => CS.t(...a);

  function button(opts) {
    const o = opts || {};
    return h('button', {
      type: o.type || 'button',
      class: ['btn', 'btn-' + (o.variant || 'secondary'), o.size && 'btn-' + o.size, o.block && 'btn-block', !o.label && 'btn-icon-only', o.class],
      disabled: !!o.disabled, title: o.title || null, 'aria-label': o.aria || (!o.label ? o.title : null),
      onclick: (event) => { if (o.onClick) { CS.haptic(); o.onClick(event); } },
      dataset: o.dataset
    }, o.icon ? icon(o.icon) : null, o.label ? h('span', { class: 'btn-label' }, o.label) : null);
  }

  function iconButton(name, label, onClick, opts) {
    return button(Object.assign({ icon: name, title: label, aria: label, variant: 'ghost', onClick }, opts || {}));
  }

  function tile(name, tint, size) {
    return h('span', { class: ['tile', 'tint-' + (tint || 'indigo'), size && 'tile-' + size] }, icon(name));
  }

  function card(opts) {
    const o = opts || {};
    const clickable = !!o.onClick;
    return h(clickable ? 'button' : 'div', {
      type: clickable ? 'button' : null,
      class: ['card', clickable && 'card-click', o.class, o.compact && 'card-compact'],
      onclick: clickable ? (e) => { CS.haptic(); o.onClick(e); } : null,
      dataset: o.dataset
    },
    o.icon || o.media ? h('div', { class: 'card-lead' }, o.media || tile(o.icon, o.tint)) : null,
    h('div', { class: 'card-main' },
      o.eyebrow ? h('div', { class: 'eyebrow' }, o.eyebrow) : null,
      o.title ? h('div', { class: 'card-title' }, o.title) : null,
      o.sub ? h('div', { class: 'card-sub' }, o.sub) : null,
      o.children || null),
    o.trailing === undefined ? (clickable ? h('span', { class: 'card-chev' }, icon('chevronRight')) : null) : o.trailing);
  }

  function row(opts) {
    const o = opts || {};
    const clickable = !!o.onClick;
    return h(clickable ? 'button' : 'div', {
      type: clickable ? 'button' : null,
      class: ['row', clickable && 'row-click', o.class, o.danger && 'row-danger', o.active && 'row-active'],
      onclick: clickable ? (e) => o.onClick(e) : null,
      dataset: o.dataset, style: o.indent ? { paddingInlineStart: (14 + o.indent * 16) + 'px' } : null
    },
    o.icon ? h('span', { class: ['row-icon', o.tint && 'tint-' + o.tint] }, icon(o.icon)) : o.lead || null,
    h('span', { class: 'row-main' },
      h('span', { class: 'row-title' }, o.title),
      o.sub ? h('span', { class: 'row-sub' }, o.sub) : null),
    o.meta ? h('span', { class: 'row-meta' }, o.meta) : null,
    o.trailing || (clickable && o.chevron !== false ? h('span', { class: 'row-chev' }, icon('chevronRight')) : null));
  }

  function list(...rows) { return h('div', { class: 'list' }, rows); }

  function section(title, action, ...children) {
    return h('section', { class: 'section' },
      title || action ? h('div', { class: 'section-head' }, title ? h('h2', { class: 'section-title' }, title) : h('span'), action || null) : null,
      children);
  }

  function chip(label, opts) {
    const o = opts || {};
    return h('button', {
      type: 'button', class: ['chip', o.active && 'chip-active', o.class], 'aria-pressed': o.active ? 'true' : 'false',
      onclick: o.onClick ? (e) => { CS.haptic(); o.onClick(e); } : null
    }, o.icon ? icon(o.icon) : null, label);
  }

  function badge(text, tone) { return h('span', { class: ['badge', 'badge-' + (tone || 'neutral')] }, text); }

  function segmented(options, value, onChange, opts) {
    const root = h('div', { class: ['segmented', opts && opts.class], role: 'tablist' });
    const draw = (current) => {
      CS.mount(root, options.map((opt) => h('button', {
        type: 'button', role: 'tab', class: ['seg', opt.value === current && 'seg-on'], 'aria-selected': opt.value === current ? 'true' : 'false',
        onclick: () => { if (opt.value !== current) { CS.haptic(); draw(opt.value); onChange(opt.value); } }
      }, opt.icon ? icon(opt.icon) : null, opt.label ? h('span', {}, opt.label) : null)));
    };
    draw(value);
    root.set = draw;
    return root;
  }

  function field(label, control, hint) {
    return h('label', { class: 'field' },
      label ? h('span', { class: 'field-label' }, label) : null,
      control,
      hint ? h('span', { class: 'field-hint' }, hint) : null);
  }

  function input(opts) {
    const o = opts || {};
    const el = h(o.multiline ? 'textarea' : 'input', {
      class: ['input', o.mono && 'mono', o.class], type: o.multiline ? null : (o.type || 'text'),
      value: o.value != null ? String(o.value) : '', placeholder: o.placeholder || '', rows: o.rows || null,
      maxlength: o.max || null, min: o.min != null ? String(o.min) : null, step: o.step != null ? String(o.step) : null,
      inputmode: o.inputmode || null, spellcheck: o.mono ? 'false' : null, autocapitalize: o.mono ? 'off' : null, autocomplete: 'off',
      oninput: o.onInput ? (e) => o.onInput(e.target.value, e) : null,
      onchange: o.onChange ? (e) => o.onChange(e.target.value, e) : null,
      onkeydown: o.onEnter ? (e) => { if (e.key === 'Enter' && !e.shiftKey && !o.multiline) { e.preventDefault(); o.onEnter(e.target.value); } } : null
    });
    if (o.multiline && o.value != null) el.value = String(o.value);
    return el;
  }

  function select(options, value, onChange) {
    return h('select', { class: 'input select', onchange: (e) => onChange(e.target.value) },
      options.map((opt) => h('option', { value: opt.value, selected: opt.value === value }, opt.label)));
  }

  function toggle(checked, onChange, label) {
    const box = h('input', { type: 'checkbox', class: 'switch-input', checked: !!checked, onchange: (e) => { CS.haptic(); onChange(e.target.checked); } });
    return h('label', { class: 'switch' }, box, h('span', { class: 'switch-track' }, h('span', { class: 'switch-thumb' })), label ? h('span', { class: 'switch-label' }, label) : null);
  }

  function settingRow(opts) {
    return h('div', { class: 'row setting' },
      opts.icon ? h('span', { class: ['row-icon', opts.tint && 'tint-' + opts.tint] }, icon(opts.icon)) : null,
      h('span', { class: 'row-main' }, h('span', { class: 'row-title' }, opts.title), opts.sub ? h('span', { class: 'row-sub' }, opts.sub) : null),
      opts.control);
  }

  function empty(opts) {
    const o = opts || {};
    return h('div', { class: ['empty', o.class] },
      h('div', { class: 'empty-art' }, tile(o.icon || 'emptyBox', o.tint || 'indigo', 'xl')),
      h('h3', { class: 'empty-title' }, o.title || ''),
      o.body ? h('p', { class: 'empty-body' }, o.body) : null,
      o.action || null);
  }

  function progress(value, opts) {
    const pct = Math.round(CS.util.clamp(value || 0, 0, 1) * 100);
    return h('div', { class: ['progress', opts && opts.class], role: 'progressbar', 'aria-valuenow': String(pct), 'aria-valuemin': '0', 'aria-valuemax': '100' },
      h('div', { class: 'progress-fill', style: { width: pct + '%' } }));
  }

  function errorState(error) {
    return empty({ icon: 'alert', tint: 'pink', title: t('err_view_title'), body: String(error && error.message || error) });
  }

  /* ---------- Overlays ---------- */
  const layer = () => document.getElementById('overlays') || document.body;
  let openCount = 0;

  function trapBack(close) {
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }

  /* Bottom sheet (mobile) / centered panel (wide). Drag the handle down to dismiss. */
  function sheet(opts) {
    const o = opts || {};
    let closed = false;
    const body = h('div', { class: 'sheet-body' }, o.body || null);
    const panel = h('div', { class: ['sheet', o.size && 'sheet-' + o.size, o.class], role: 'dialog', 'aria-modal': 'true', 'aria-label': o.title || '' },
      h('div', { class: 'sheet-grab' }, h('span')),
      o.title || o.headerActions ? h('header', { class: 'sheet-head' },
        h('div', { class: 'sheet-titles' }, h('h2', { class: 'sheet-title' }, o.title || ''), o.subtitle ? h('div', { class: 'sheet-sub' }, o.subtitle) : null),
        o.headerActions || null,
        iconButton('close', t('close'), () => handle.close())) : null,
      body,
      o.actions ? h('footer', { class: 'sheet-foot' }, o.actions) : null);
    const scrim = h('div', { class: 'scrim', onclick: (e) => { if (e.target === scrim && o.dismissable !== false) handle.close(); } }, panel);
    const untrap = trapBack(() => o.dismissable !== false && handle.close());
    const handle = {
      panel, body,
      close(result) {
        if (closed) return;
        closed = true;
        untrap();
        openCount--;
        document.documentElement.classList.toggle('overlay-open', openCount > 0);
        scrim.classList.add('leaving');
        setTimeout(() => scrim.remove(), 180);
        if (o.onClose) o.onClose(result);
      },
      setBody(node) { CS.mount(body, node); }
    };
    /* Swipe down on the grab handle or header to dismiss. */
    let startY = null;
    const grab = panel.querySelector('.sheet-grab');
    const head = panel.querySelector('.sheet-head');
    [grab, head].forEach((el) => el && el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      startY = e.clientY;
      panel.style.transition = 'none';
      el.setPointerCapture(e.pointerId);
    }));
    [grab, head].forEach((el) => el && el.addEventListener('pointermove', (e) => {
      if (startY == null) return;
      panel.style.transform = 'translateY(' + Math.max(0, e.clientY - startY) + 'px)';
    }));
    [grab, head].forEach((el) => el && el.addEventListener('pointerup', (e) => {
      if (startY == null) return;
      const dy = e.clientY - startY;
      startY = null;
      panel.style.transition = '';
      panel.style.transform = '';
      if (dy > 90 && o.dismissable !== false) handle.close();
    }));
    openCount++;
    document.documentElement.classList.add('overlay-open');
    layer().appendChild(scrim);
    return handle;
  }

  function dialog(opts) {
    return new Promise((resolve) => {
      const o = opts || {};
      let value = o.value || '';
      let result = null;
      const control = o.prompt ? input({ value, placeholder: o.placeholder, mono: o.mono, inputmode: o.inputmode, onInput: (v) => { value = v; }, onEnter: (v) => { value = v; finish(true); } }) : null;
      const finish = (ok) => { result = ok ? (o.prompt ? value : true) : (o.prompt ? null : false); handle.close(); };
      const handle = sheet({
        title: o.title, size: 'dialog', class: 'dialog',
        body: [o.message ? h('p', { class: 'dialog-msg' }, o.message) : null, control ? field(o.label || null, control, o.hint) : null, o.body || null],
        actions: [
          o.cancel === false ? null : button({ label: o.cancelLabel || t('cancel'), variant: 'ghost', onClick: () => finish(false) }),
          button({ label: o.okLabel || t('ok'), variant: o.danger ? 'danger' : 'primary', onClick: () => finish(true) })
        ],
        onClose: () => resolve(result === null ? (o.prompt ? null : false) : result)
      });
      if (control) setTimeout(() => { control.focus(); control.select && control.select(); }, 60);
    });
  }
  const confirm = (opts) => dialog(opts);
  const prompt = (opts) => dialog(Object.assign({ prompt: true }, opts));
  const alert = (opts) => dialog(Object.assign({ cancel: false }, opts));

  /* Action menu: list of {label, icon, danger, onClick, sub} rendered as a sheet. */
  function menu(opts) {
    const o = Array.isArray(opts) ? { items: opts } : opts;
    const handle = sheet({
      title: o.title, subtitle: o.subtitle, size: 'menu',
      body: h('div', { class: 'menu-list' }, o.items.filter(Boolean).map((item) => item === '-' ? h('hr', { class: 'menu-sep' }) :
        item.trailing ? row({ icon: item.icon, title: item.label, sub: item.sub, tint: item.tint, trailing: item.trailing, class: 'row-static' }) :
        row({ icon: item.icon, title: item.label, sub: item.sub, danger: item.danger, chevron: false, tint: item.tint, onClick: () => { handle.close(); item.onClick && item.onClick(); } })))
    });
    return handle;
  }

  function toast(message, kind, opts) {
    const host = document.getElementById('toasts') || document.body;
    const o = opts || {};
    const node = h('div', { class: ['toast', 'toast-' + (kind || 'info')], role: kind === 'error' ? 'alert' : 'status' },
      icon(kind === 'error' ? 'alert' : kind === 'ok' ? 'check' : 'info'),
      h('span', { class: 'toast-msg' }, message),
      o.action ? h('button', { type: 'button', class: 'toast-act', onclick: () => { o.action.onClick(); node.remove(); } }, o.action.label) : null);
    host.appendChild(node);
    setTimeout(() => { node.classList.add('leaving'); setTimeout(() => node.remove(), 220); }, o.ms || (kind === 'error' ? 4800 : 2600));
    return node;
  }

  function searchBox(opts) {
    const o = opts || {};
    const field = input({ type: 'search', placeholder: o.placeholder || t('search'), value: o.value || '', onInput: o.onInput });
    return h('div', { class: 'searchbox' }, icon('search'), field);
  }

  function tabs(items, value, onChange) {
    return segmented(items, value, onChange, { class: 'tabs-seg' });
  }

  function kbd(text) { return h('kbd', { class: 'kbd' }, text); }

  function pickFile(accept, multiple) {
    return new Promise((resolve) => {
      const el = h('input', { type: 'file', accept: accept || '', multiple: !!multiple, style: { display: 'none' } });
      el.addEventListener('change', () => { resolve([...(el.files || [])]); el.remove(); });
      document.body.appendChild(el);
      el.click();
    });
  }

  CS.ui = {
    button, iconButton, tile, card, row, list, section, chip, badge, segmented, field, input, select, toggle,
    settingRow, empty, progress, errorState, sheet, dialog, confirm, prompt, alert, menu, toast, searchBox, tabs,
    kbd, pickFile, get overlayOpen() { return openCount > 0; }
  };
})();
