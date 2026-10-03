/* Lesson illustrations: static, theme-aware SVG scenes (colors come from CSS classes). */
'use strict';
(function () {
  const CS = globalThis.CS;

  const phone = (x, y, w, hgt) => `<rect class="la-dev" x="${x}" y="${y}" width="${w}" height="${hgt}" rx="16"/><rect class="la-scr" x="${x + 6}" y="${y + 10}" width="${w - 12}" height="${hgt - 20}" rx="10"/>`;

  const SCENES = {
    start: `<circle class="la-glow" cx="160" cy="84" r="70"/>
      <g class="la-float"><path class="la-a" d="M160 30 206 56v52l-46 26-46-26V56z"/><path class="la-b" d="M160 82v52l-46-26V56z"/><path class="la-hi" d="M160 30 206 56 160 82 114 56z"/>
      <path class="la-c" d="M160 50l5 11 12 2-9 8 2 12-10-6-10 6 2-12-9-8 12-2z"/></g>
      <circle class="la-d la-twinkle" cx="76" cy="46" r="5"/><circle class="la-e la-twinkle d2" cx="248" cy="40" r="4"/><circle class="la-c la-twinkle d3" cx="252" cy="118" r="6"/><circle class="la-b la-twinkle d1" cx="70" cy="118" r="4"/>`,

    chat: `${phone(100, 8, 120, 148)}
      <rect class="la-bub" x="114" y="28" width="62" height="18" rx="9"/><rect class="la-bub me" x="148" y="52" width="58" height="18" rx="9"/>
      <g class="la-float"><rect class="la-card" x="114" y="78" width="92" height="58" rx="12"/><path class="la-a" d="M134 92l12 7v14l-12 7-12-7V99z"/>
      <rect class="la-ink" x="152" y="94" width="44" height="7" rx="3.5"/><rect class="la-ink soft" x="152" y="106" width="30" height="6" rx="3"/><rect class="la-a" x="122" y="122" width="76" height="9" rx="4.5"/></g>
      <circle class="la-c la-twinkle" cx="232" cy="72" r="6"/><circle class="la-d la-twinkle d2" cx="86" cy="104" r="5"/>`,

    sync: `${phone(32, 14, 92, 132)}${phone(196, 14, 92, 132)}
      <text class="la-num" x="78" y="94" text-anchor="middle">3</text><text class="la-num" x="242" y="94" text-anchor="middle">3</text>
      <path class="la-wire" d="M130 64 C150 50 170 50 190 64"/><path class="la-wire back" d="M190 100 C170 114 150 114 130 100"/>
      <circle class="la-a la-run" r="5"><animateMotion dur="2.2s" repeatCount="indefinite" path="M130 64 C150 50 170 50 190 64"/></circle>
      <circle class="la-e la-run" r="5"><animateMotion dur="2.2s" begin="1.1s" repeatCount="indefinite" path="M190 100 C170 114 150 114 130 100"/></circle>
      <rect class="la-a" x="56" y="110" width="44" height="12" rx="6"/><rect class="la-e" x="220" y="110" width="44" height="12" rx="6"/>`,

    blocks: `<g class="la-float"><rect class="la-blk o" x="70" y="22" width="150" height="30" rx="10"/><rect class="la-blk" x="92" y="58" width="160" height="30" rx="10"/>
      <rect class="la-blk g" x="92" y="94" width="128" height="30" rx="10"/><rect class="la-blk p" x="70" y="130" width="96" height="22" rx="10"/>
      <rect class="la-hl" x="84" y="33" width="60" height="8" rx="4"/><rect class="la-hl" x="106" y="69" width="80" height="8" rx="4"/><rect class="la-hl" x="106" y="105" width="52" height="8" rx="4"/>
      <rect class="la-slot" x="196" y="66" width="44" height="14" rx="7"/></g><circle class="la-c la-twinkle" cx="256" cy="30" r="6"/>`,

    layers: `<g class="la-float"><path class="la-lay d" d="M160 104l90 22-90 22-90-22z"/><path class="la-lay b" d="M160 72l90 22-90 22-90-22z"/><path class="la-lay a" d="M160 40l90 22-90 22-90-22z"/></g>
      <text class="la-tag" x="266" y="66">HTML</text><text class="la-tag" x="266" y="98">CSS</text><text class="la-tag" x="266" y="130">JS</text>`,

    pixel: (() => {
      const rows = ['0110110', '1221221', '1222221', '1222221', '0122210', '0012100', '0001000'];
      let out = '<circle class="la-glow" cx="160" cy="82" r="66"/><g class="la-float">';
      rows.forEach((r, y) => [...r].forEach((c, x) => { if (c !== '0') out += `<rect class="${c === '1' ? 'la-e' : 'la-px'}" x="${118 + x * 12}" y="${38 + y * 12}" width="12" height="12"/>`; }));
      return out + '<rect class="la-hi" x="130" y="50" width="12" height="12"/></g><circle class="la-c la-twinkle" cx="232" cy="44" r="5"/><circle class="la-d la-twinkle d2" cx="92" cy="124" r="5"/>';
    })(),

    publish: `<g class="la-float"><path class="la-a" d="M96 54l40-20 40 20v48l-40 20-40-20z"/><path class="la-b" d="M136 74v48l-40-20V54z"/><path class="la-hi" d="M96 54l40-20 40 20-40 20z"/>
      <text class="la-xdc" x="136" y="146" text-anchor="middle">.xdc</text></g>
      <path class="la-wire" d="M186 80h40"/><path class="la-arrow" d="M220 72l10 8-10 8"/>
      <rect class="la-card" x="236" y="54" width="62" height="52" rx="12"/><rect class="la-bub me" x="246" y="66" width="42" height="12" rx="6"/><rect class="la-ink soft" x="246" y="84" width="30" height="8" rx="4"/>`,

    bug: `<rect class="la-card" x="52" y="24" width="168" height="112" rx="14"/>
      <rect class="la-ink soft" x="68" y="42" width="90" height="8" rx="4"/><rect class="la-ink soft" x="80" y="58" width="110" height="8" rx="4"/><rect class="la-bad" x="80" y="74" width="72" height="8" rx="4"/>
      <rect class="la-ink soft" x="68" y="90" width="64" height="8" rx="4"/><rect class="la-ink soft" x="80" y="106" width="96" height="8" rx="4"/>
      <g class="la-float"><circle class="la-lens" cx="214" cy="82" r="34"/><path class="la-handle" d="M238 106l26 26"/><path class="la-ok-mark" d="M200 82l10 10 18-20"/></g>`,

    game: `<g class="la-float"><rect class="la-a" x="86" y="70" width="148" height="66" rx="33"/><circle class="la-hl" cx="124" cy="103" r="16"/>
      <path class="la-dpad" d="M118 103h12M124 97v12"/><circle class="la-c" cx="192" cy="96" r="7"/><circle class="la-e" cx="208" cy="110" r="7"/></g>
      <g class="la-bounce"><rect class="la-d" x="146" y="20" width="28" height="28" rx="6"/><rect class="la-hi" x="152" y="28" width="6" height="6"/><rect class="la-hi" x="162" y="28" width="6" height="6"/></g>
      <circle class="la-c la-twinkle" cx="236" cy="38" r="8"/><circle class="la-c la-twinkle d2" cx="84" cy="40" r="6"/>`,

    data: `<g class="la-float"><ellipse class="la-hi" cx="160" cy="40" rx="58" ry="16"/><path class="la-a" d="M102 40v80c0 9 26 16 58 16s58-7 58-16V40c0 9-26 16-58 16s-58-7-58-16z"/>
      <path class="la-line" d="M102 80c0 9 26 16 58 16s58-7 58-16"/></g>
      <rect class="la-card" x="232" y="50" width="64" height="20" rx="8"/><rect class="la-card" x="232" y="76" width="64" height="20" rx="8"/><rect class="la-card" x="24" y="64" width="64" height="20" rx="8"/>
      <rect class="la-c" x="240" y="57" width="20" height="6" rx="3"/><rect class="la-d" x="240" y="83" width="28" height="6" rx="3"/><rect class="la-e" x="32" y="71" width="24" height="6" rx="3"/>`,

    touch: `${phone(110, 8, 100, 148)}<circle class="la-ring" cx="160" cy="86" r="14"/><circle class="la-ring r2" cx="160" cy="86" r="14"/>
      <circle class="la-a" cx="160" cy="86" r="10"/><path class="la-finger" d="M168 96c0-6 10-6 10 0v8c0-5 9-5 9 0v6c0-4 8-4 8 1v14c0 14-9 24-24 24-10 0-16-6-20-14l-9-17c-3-6 5-10 9-5l6 8V96c0-6 11-6 11 0z"/>`,

    design: `<rect class="la-card" x="60" y="20" width="200" height="124" rx="16"/><rect class="la-a" x="76" y="36" width="100" height="14" rx="7"/>
      <rect class="la-ink soft" x="76" y="58" width="150" height="7" rx="3.5"/><rect class="la-ink soft" x="76" y="71" width="120" height="7" rx="3.5"/>
      <g class="la-float"><rect class="la-e" x="76" y="94" width="52" height="34" rx="10"/><rect class="la-d" x="136" y="94" width="52" height="34" rx="10"/><rect class="la-c" x="196" y="94" width="48" height="34" rx="10"/></g>
      <circle class="la-b la-twinkle" cx="276" cy="30" r="7"/>`
  };

  function scene(name) {
    const markup = SCENES[name] || SCENES.start;
    const wrap = CS.h('div', { class: 'la-scene', 'aria-hidden': 'true' });
    wrap.innerHTML = `<svg viewBox="0 0 320 160" class="la-svg">${markup}</svg>`;
    return wrap;
  }

  CS.learnArt = { scene, names: () => Object.keys(SCENES) };
})();
