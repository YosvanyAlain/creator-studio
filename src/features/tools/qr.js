/* QR code tool: text, link, Wi-Fi or e-mail content; level, style and colors; saved into a project as PNG. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const { h, ui } = CS;
  const TL = CS.tools, C = CS.color;
  const t = (...a) => CS.t(...a);
  const icon = (n) => CS.icon(n);

  const wifiEscape = (s) => String(s || '').replace(/([\\;,:"])/g, '\\$1');

  function render(ctx) {
    const S = Object.assign({ kind: 'link', text: 'https://webxdc.org', ssid: '', pass: '', sec: 'WPA', mail: '', subject: '', level: 'M', style: 'square', dark: '#111827', light: '#ffffff', margin: 3 },
      CS.settings.get('tool_qr') || {});
    if (ctx.params && ctx.params.text) { S.kind = 'text'; S.text = String(ctx.params.text); }
    const canvas = h('canvas', { class: 'tl-qr-canvas' });
    const info = h('div', { class: 'tl-qr-info' });
    const warn = h('div', { class: 'tl-warn', hidden: true });
    const errorBox = h('div', { class: 'tl-qr-error', hidden: true }, icon('alertTriangle'), h('span', {}, t('tl_qr_too_long')));
    const fields = h('div', { class: 'tl-stack-sm' });

    const content = () => {
      if (S.kind === 'wifi') return 'WIFI:T:' + (S.sec === 'nopass' ? 'nopass' : S.sec) + ';S:' + wifiEscape(S.ssid) + ';' + (S.sec === 'nopass' ? '' : 'P:' + wifiEscape(S.pass) + ';') + ';';
      if (S.kind === 'mail') return 'mailto:' + S.mail.trim() + (S.subject ? '?subject=' + encodeURIComponent(S.subject) : '');
      return S.text;
    };
    let current = null;
    function update() {
      CS.settings.set('tool_qr', S);
      const text = content();
      errorBox.hidden = true;
      try {
        current = CS.qr.encode(text || ' ', { level: S.level });
        CS.qr.draw(canvas, current, { scale: Math.max(4, Math.floor(560 / (current.size + S.margin * 2))), margin: S.margin, dark: S.dark, light: S.light, style: S.style });
        canvas.hidden = false;
        info.textContent = t('tl_qr_info', { v: current.version, n: current.size, l: current.level, b: new TextEncoder().encode(text).length });
      } catch (error) {
        current = null;
        canvas.hidden = true;
        errorBox.hidden = false;
        info.textContent = '';
      }
      const ratio = C.contrast(S.dark, S.light);
      const inverted = C.luminance(S.dark) > C.luminance(S.light);
      warn.hidden = !(ratio < 4 || inverted || S.margin < 2);
      CS.mount(warn, icon('alertTriangle'), h('span', {}, inverted ? t('tl_qr_inverted') : ratio < 4 ? t('tl_qr_low_contrast') : t('tl_qr_margin')));
    }
    function drawFields() {
      const text = (key, label, opts) => ui.field(label, ui.input(Object.assign({ value: S[key], onInput: (v) => { S[key] = String(v); update(); } }, opts || {})));
      if (S.kind === 'wifi') CS.mount(fields, text('ssid', t('tl_qr_ssid')), text('pass', t('tl_qr_pass')),
        ui.field(t('tl_qr_sec'), ui.segmented([{ value: 'WPA', label: 'WPA/WPA2' }, { value: 'WEP', label: 'WEP' }, { value: 'nopass', label: t('tl_qr_open') }], S.sec, (v) => { S.sec = v; update(); })));
      else if (S.kind === 'mail') CS.mount(fields, text('mail', t('tl_qr_mail'), { inputmode: 'email' }), text('subject', t('tl_qr_subject')));
      else CS.mount(fields, ui.field(S.kind === 'link' ? t('tl_qr_link') : t('tl_qr_text'),
        ui.input({ value: S.text, multiline: S.kind === 'text', rows: 4, inputmode: S.kind === 'link' ? 'url' : null, onInput: (v) => { S.text = String(v); update(); } })));
    }
    const kinds = ui.segmented(['link', 'text', 'wifi', 'mail'].map((k) => ({ value: k, label: t('tl_qr_k_' + k) })), S.kind, (v) => {
      S.kind = v;
      if (v === 'link' && !/^https?:/.test(S.text)) S.text = 'https://';
      drawFields(); update();
    });
    const dark = TL.swatch(S.dark, (v) => { S.dark = v; update(); }, { compact: true });
    const light = TL.swatch(S.light, (v) => { S.light = v; update(); }, { compact: true });
    const margin = TL.slider({ label: t('tl_qr_margin_label'), min: 0, max: 8, value: S.margin, onInput: (v) => { S.margin = v; update(); } });
    const save = () => {
      if (!current) return;
      CS.studio.saveSheet({
        title: t('tl_qr_save'), tool: 'qr', kind: 'image', ext: 'png', name: 'qr',
        encode: () => new Promise((resolve) => {
          const big = CS.qr.draw(document.createElement('canvas'), current, { scale: 16, margin: S.margin, dark: S.dark, light: S.light, style: S.style });
          big.toBlob(async (blob) => resolve({ bytes: new Uint8Array(await blob.arrayBuffer()), mime: 'image/png' }), 'image/png');
        })
      });
    };
    drawFields();
    update();
    return h('div', { class: 'tl-stack' },
      h('div', { class: 'tl-qr-stage' }, canvas, errorBox, info),
      warn,
      h('div', { class: 'tl-actions two' },
        ui.button({ label: t('tl_qr_save'), icon: 'save', variant: 'primary', onClick: save }),
        ui.button({ label: t('tl_qr_copy'), icon: 'copy', variant: 'soft', onClick: () => TL.copy(content()) })),
      TL.panel(t('tl_qr_content'), kinds, fields),
      TL.panel(t('tl_qr_look'),
        ui.segmented(['square', 'round', 'dots'].map((k) => ({ value: k, label: t('tl_qr_s_' + k) })), S.style, (v) => { S.style = v; update(); }),
        h('div', { class: 'tl-row' }, h('div', { class: 'tl-contrast-pick' }, dark.el, h('span', {}, t('tl_qr_dark'))), h('div', { class: 'tl-contrast-pick' }, light.el, h('span', {}, t('tl_qr_light')))),
        margin.el),
      TL.panel(t('tl_qr_level'),
        ui.segmented(CS.qr.LEVELS.map((k) => ({ value: k, label: k })), S.level, (v) => { S.level = v; update(); }),
        h('p', { class: 'tl-hint' }, t('tl_qr_level_hint'))));
  }

  TL.add({ id: 'qr', group: 'share', icon: 'qr', tint: 'teal', order: 20, render });
})();
