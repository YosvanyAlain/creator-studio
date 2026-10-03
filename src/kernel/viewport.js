/* Keyboard-aware layout: exposes --vvh (visible height) and --kb (keyboard height) and the kb-open class.
 * Editors size themselves from --vvh so the on-screen keyboard never squeezes or shifts them. */
'use strict';
(function () {
  const CS = globalThis.CS;
  const root = document.documentElement;
  let baseline = window.innerHeight;
  let open = false;

  function update() {
    const vv = window.visualViewport;
    const visible = vv ? vv.height : window.innerHeight;
    const offset = vv ? vv.offsetTop : 0;
    if (!open) baseline = Math.max(baseline, window.innerHeight);
    const keyboard = Math.max(0, baseline - visible - offset);
    const editing = isEditable(document.activeElement);
    const next = editing && keyboard > 120;
    root.style.setProperty('--vvh', Math.round(visible) + 'px');
    root.style.setProperty('--vvtop', Math.round(offset) + 'px');
    root.style.setProperty('--kb', (next ? Math.round(keyboard) : 0) + 'px');
    if (next !== open) {
      open = next;
      root.classList.toggle('kb-open', open);
      CS.bus.emit('keyboard', { open, height: keyboard });
    }
  }

  function isEditable(el) {
    if (!el) return false;
    if (el.isContentEditable) return true;
    const tag = el.tagName;
    return tag === 'TEXTAREA' || (tag === 'INPUT' && !/^(checkbox|radio|range|button|submit|color|file)$/.test(el.type));
  }

  function init() {
    const coarse = window.matchMedia ? window.matchMedia('(pointer: coarse)') : null;
    const touch = () => root.classList.toggle('touch', !!(coarse && coarse.matches) || ('ontouchstart' in window && !(window.matchMedia && window.matchMedia('(pointer: fine)').matches)));
    touch();
    if (coarse && coarse.addEventListener) coarse.addEventListener('change', touch);
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
    }
    window.addEventListener('resize', () => { if (!open) baseline = window.innerHeight; update(); });
    window.addEventListener('orientationchange', () => setTimeout(() => { baseline = window.innerHeight; update(); }, 300));
    document.addEventListener('focusin', () => setTimeout(update, 60));
    document.addEventListener('focusout', () => setTimeout(update, 120));
    update();
  }

  CS.viewport = { init, update, get keyboardOpen() { return open; } };
})();
