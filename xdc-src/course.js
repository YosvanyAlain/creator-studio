/* =========================================================================
 * Webxdc Creator Studio — course.js
 * Built-in short course / tutorial content.
 * ========================================================================= */
'use strict';
(function () {
  const CS = (globalThis.CS = globalThis.CS || {});
  const U = CS.util;

  function t(key, params) { return CS.i18n.t(key, params); }
  function L() {
    const l = CS.i18n.lang();
    return (l === 'es' || l === 'en') ? l : 'en';
  }

  /* ------------------------------------------------------------------ *
   * Miniaturas SVG (viewBox 120×78, inline, sin recursos externos)
   * ------------------------------------------------------------------ */
  const SVG_CHAT = '<svg viewBox="0 0 120 78" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><rect x="4" y="6" width="112" height="62" rx="10" fill="#eef2ff"/><path d="M18 20h84a6 6 0 0 1 6 6v22a6 6 0 0 1-6 6H44l-12 10V54h-14a6 6 0 0 1-6-6V26a6 6 0 0 1 6-6z" fill="#5b6ee1"/><rect x="26" y="30" width="52" height="8" rx="4" fill="#fff" opacity=".9"/><rect x="26" y="44" width="34" height="8" rx="4" fill="#fff" opacity=".6"/><circle cx="92" cy="38" r="10" fill="#ffd166"/><text x="92" y="43" font-size="12" text-anchor="middle" fill="#7a5b00">📦</text></svg>';

  const SVG_COUNTER = '<svg viewBox="0 0 120 78" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><rect x="30" y="4" width="60" height="70" rx="10" fill="#111827"/><rect x="35" y="12" width="50" height="48" rx="4" fill="#f9fafb"/><text x="60" y="40" font-size="18" font-weight="bold" text-anchor="middle" fill="#111827" font-family="system-ui">42</text><circle cx="47" cy="68" r="6" fill="#e74c3c"/><rect x="58" y="62" width="16" height="12" rx="3" fill="#374151"/><circle cx="73" cy="68" r="6" fill="#2ecc71"/></svg>';

  const SVG_PALETTE = '<svg viewBox="0 0 120 78" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><rect x="8" y="10" width="104" height="58" rx="8" fill="#fff7ed" stroke="#f59e0b"/><circle cx="30" cy="30" r="9" fill="#e74c3c"/><circle cx="52" cy="30" r="9" fill="#3498db"/><circle cx="74" cy="30" r="9" fill="#2ecc71"/><circle cx="96" cy="30" r="9" fill="#f1c40f"/><rect x="22" y="48" width="76" height="10" rx="5" fill="#f59e0b" opacity=".8"/><rect x="12" y="60" width="60" height="5" rx="2.5" fill="#d97706" opacity=".5"/></svg>';

  const SVG_BLOCKS = '<svg viewBox="0 0 120 78" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><rect x="10" y="8" width="100" height="18" rx="9" fill="#8b5cf6"/><circle cx="24" cy="17" r="5" fill="#fff" opacity=".85"/><rect x="10" y="30" width="100" height="18" rx="9" fill="#06b6d4"/><circle cx="24" cy="39" r="5" fill="#fff" opacity=".85"/><rect x="22" y="52" width="76" height="18" rx="9" fill="#f97316"/><circle cx="36" cy="61" r="5" fill="#fff" opacity=".85"/><path d="M105 17l6 5-6 5M95 17h10" stroke="#6d28d9" stroke-width="2" fill="none"/></svg>';

  const SVG_MEDIA = '<svg viewBox="0 0 120 78" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><rect x="8" y="12" width="46" height="46" rx="8" fill="#dbeafe"/><circle cx="24" cy="28" r="5" fill="#f59e0b"/><path d="M12 52l12-14 8 9 6-7 12 12z" fill="#10b981"/><rect x="64" y="16" width="34" height="34" rx="17" fill="#7c3aed"/><path d="M74 26v14M70 29l14 8M70 37l14-8M78 23l4-6M78 43l4 6M70 25l-6-3M86 45l6 3" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M56 58c8 6 20 6 28 0" stroke="#7c3aed" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';

  const SVG_LIST = '<svg viewBox="0 0 120 78" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><rect x="16" y="6" width="88" height="66" rx="8" fill="#fff" stroke="#94a3b8"/><rect x="24" y="16" width="56" height="8" rx="4" fill="#cbd5e1"/><rect x="24" y="30" width="72" height="8" rx="4" fill="#f1f5f9"/><rect x="24" y="42" width="72" height="8" rx="4" fill="#f1f5f9"/><rect x="24" y="54" width="72" height="8" rx="4" fill="#f1f5f9"/><path d="M20 34l3 3 5-6" stroke="#10b981" stroke-width="2.5" fill="none"/><circle cx="28" cy="46" r="4" fill="#e74c3c"/><circle cx="28" cy="58" r="4" fill="#e74c3c"/></svg>';

  const SVG_SYNC = '<svg viewBox="0 0 120 78" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><rect x="4" y="8" width="40" height="62" rx="8" fill="#111827"/><rect x="76" y="8" width="40" height="62" rx="8" fill="#111827"/><rect x="8" y="16" width="32" height="38" rx="3" fill="#f9fafb"/><rect x="80" y="16" width="32" height="38" rx="3" fill="#f9fafb"/><text x="24" y="40" font-size="13" font-weight="bold" text-anchor="middle" fill="#111827" font-family="system-ui">7</text><text x="96" y="40" font-size="13" font-weight="bold" text-anchor="middle" fill="#111827" font-family="system-ui">7</text><path d="M46 32h28M74 32l-6-4v8z M74 46H46M46 46l6-4v8z" stroke="#22c55e" stroke-width="2.5" fill="none"/></svg>';

  const SVG_TPL = '<svg viewBox="0 0 120 78" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><rect x="10" y="8" width="100" height="62" rx="8" fill="#ecfdf5" stroke="#10b981"/><path d="M28 26l8-8 8 8M36 18v20" stroke="#10b981" stroke-width="2.5" fill="none" stroke-linecap="round"/><rect x="52" y="22" width="44" height="8" rx="4" fill="#a7f3d0"/><rect x="52" y="36" width="44" height="8" rx="4" fill="#d1fae5"/><text x="60" y="62" font-size="9" fill="#065f46" font-family="system-ui">✓ ✓ ✓</text><path d="M22 52l4 4 7-8" stroke="#10b981" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>';

  const SVG_SERIAL = '<svg viewBox="0 0 120 78" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><line x1="16" y1="12" x2="16" y2="66" stroke="#94a3b8" stroke-width="2"/><circle cx="16" cy="16" r="4" fill="#3b82f6"/><circle cx="16" cy="32" r="4" fill="#3b82f6"/><circle cx="16" cy="48" r="4" fill="#3b82f6"/><circle cx="16" cy="64" r="4" fill="#ef4444"/><text x="28" y="20" font-size="8" fill="#334155" font-family="system-ui">serial 1 · +1</text><text x="28" y="36" font-size="8" fill="#334155" font-family="system-ui">serial 2 · +1</text><text x="28" y="52" font-size="8" fill="#334155" font-family="system-ui">serial 3 · reset</text><text x="28" y="68" font-size="8" fill="#b91c1c" font-family="system-ui">serial 0 → todo el historial</text></svg>';

  const SVG_EDITOR = '<svg viewBox="0 0 120 78" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><rect x="8" y="8" width="104" height="62" rx="8" fill="#1e293b"/><circle cx="20" cy="18" r="3" fill="#ef4444"/><circle cx="30" cy="18" r="3" fill="#f59e0b"/><circle cx="40" cy="18" r="3" fill="#22c55e"/><text x="18" y="38" font-size="8" fill="#7dd3fc" font-family="monospace">&lt;button&gt;</text><text x="24" y="48" font-size="8" fill="#fbbf24" font-family="monospace">id="go"</text><text x="18" y="58" font-size="8" fill="#94a3b8" font-family="monospace">&lt;/button&gt;</text><rect x="76" y="30" width="26" height="26" rx="5" fill="#334155" stroke="#64748b"/><text x="89" y="47" font-size="12" text-anchor="middle" fill="#e2e8f0" font-family="system-ui">✎</text></svg>';

  const SVG_TOUCH = '<svg viewBox="0 0 120 78" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><rect x="14" y="4" width="92" height="70" rx="10" fill="#0f172a"/><rect x="20" y="12" width="80" height="54" rx="4" fill="#1e293b"/><circle cx="60" cy="39" r="16" fill="#e74c3c"/><circle cx="60" cy="39" r="7" fill="#fff"/><path d="M88 60c0-8-3-12-8-14" stroke="#22c55e" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="88" cy="60" r="4" fill="#22c55e"/><path d="M24 20l4 4 7-9" stroke="#22c55e" stroke-width="2" fill="none"/></svg>';
  const SVG_DUAL = '<svg viewBox="0 0 120 78" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><rect x="4" y="10" width="52" height="58" rx="6" fill="#fef2f2" stroke="#e74c3c"/><rect x="64" y="10" width="52" height="58" rx="6" fill="#eff6ff" stroke="#3b82f6"/><text x="30" y="34" font-size="11" font-weight="bold" text-anchor="middle" fill="#b91c1c" font-family="system-ui">Ana</text><text x="90" y="34" font-size="11" font-weight="bold" text-anchor="middle" fill="#1d4ed8" font-family="system-ui">Beto</text><rect x="14" y="42" width="32" height="12" rx="6" fill="#e74c3c"/><rect x="74" y="42" width="32" height="12" rx="6" fill="#3b82f6"/><path d="M56 39h8M64 39l-5-3v6z" stroke="#16a34a" stroke-width="2.5" fill="none"/></svg>';
  const SVG_DRAW = '<svg viewBox="0 0 120 78" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><rect x="10" y="8" width="100" height="62" rx="8" fill="#fff" stroke="#94a3b8"/><path d="M22 56c10-24 18-10 26-26s14 4 22-8 10 18 16 10" stroke="#e74c3c" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="30" cy="24" r="5" fill="#f1c40f"/><circle cx="44" cy="24" r="5" fill="#2ecc71"/><circle cx="58" cy="24" r="5" fill="#3498db"/><path d="M88 14l8 8-16 16-10 2 2-10z" fill="#f59e0b" stroke="#b45309"/></svg>';
  const SVG_FILES = '<svg viewBox="0 0 120 78" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><rect x="10" y="6" width="100" height="66" rx="8" fill="#f8fafc" stroke="#94a3b8"/><text x="20" y="22" font-size="9" fill="#0f172a" font-family="monospace">📁 mi-app/</text><text x="30" y="36" font-size="9" fill="#2563eb" font-family="monospace">📄 index.html</text><text x="30" y="48" font-size="9" fill="#7c3aed" font-family="monospace">📄 app.js</text><text x="30" y="60" font-size="9" fill="#059669" font-family="monospace">📄 style.css</text><text x="30" y="70" font-size="8" fill="#64748b" font-family="monospace">📄 webxdc.js (lo añade el mensajero)</text></svg>';

  const SVG_PUBLISH = '<svg viewBox="0 0 120 78" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><rect x="10" y="18" width="40" height="34" rx="6" fill="#fef3c7" stroke="#f59e0b"/><text x="30" y="39" font-size="13" text-anchor="middle" font-family="system-ui">📦</text><path d="M54 35h20M74 35l-6-4v8z" stroke="#f59e0b" stroke-width="2.5" fill="none"/><rect x="78" y="10" width="34" height="58" rx="8" fill="#111827"/><rect x="82" y="18" width="26" height="34" rx="3" fill="#f9fafb"/><text x="95" y="38" font-size="10" text-anchor="middle" font-family="system-ui">🎉</text><path d="M62 58c4 8 12 8 16 0" stroke="#22c55e" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';

  /* ------------------------------------------------------------------ *
   * Ejemplos ejecutables (documentos HTML autocontenidos).
   * lbl: mini-diccionario es/en para las pocas etiquetas del ejemplo.
   * ------------------------------------------------------------------ */
  function demoPage(title, style, body, script) {
    return '<!DOCTYPE html><html><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + title + '</title><style>' +
      'body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:14px;background:#f8fafb;color:#0f172a}' +
      'button{font:inherit;border:none;border-radius:10px;padding:10px 16px;cursor:pointer}' +
      style + '</style></head><body>' + body + '<script>' + script + '<\/script></body></html>';
  }

  function demoCounter() {
    return demoPage('Contador',
      '.num{font-size:56px;font-weight:800;text-align:center;margin:8px 0}' +
      '.row{display:flex;gap:8px;justify-content:center}.b1{background:#2563eb;color:#fff}.b2{background:#e2e8f0}',
      '<div class="num" id="n">0</div><div class="row"><button class="b1" id="plus">＋1</button><button class="b2" id="reset">⟳</button></div>',
      'let n=0;const el=document.getElementById("n");' +
      'document.getElementById("plus").onclick=()=>{n++;el.textContent=n;};' +
      'document.getElementById("reset").onclick=()=>{n=0;el.textContent=n;};');
  }

  function demoColors() {
    return demoPage('Colores',
      '.box{height:90px;border-radius:12px;background:#e74c3c;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:18px;margin-bottom:10px}' +
      '.row{display:flex;gap:8px;flex-wrap:wrap}.sw{width:44px;height:44px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)}',
      '<div class="box" id="box">¡Hola!</div><div class="row">' +
      '<button class="sw" style="background:#e74c3c" data-c="#e74c3c" aria-label="rojo"></button>' +
      '<button class="sw" style="background:#3498db" data-c="#3498db" aria-label="azul"></button>' +
      '<button class="sw" style="background:#2ecc71" data-c="#2ecc71" aria-label="verde"></button>' +
      '<button class="sw" style="background:#f1c40f" data-c="#f1c40f" aria-label="amarillo"></button>' +
      '<button class="sw" style="background:#111827" data-c="#111827" aria-label="oscuro"></button></div>',
      'const box=document.getElementById("box");' +
      'document.querySelectorAll(".sw").forEach(b=>b.onclick=()=>{box.style.background=b.dataset.c;});');
  }

  function demoLogic(lang) {
    const lbl = lang === 'en'
      ? { score: 'Score', a: 'Team A scores', b: 'Reset', toast: 'Point for A!' }
      : { score: 'Puntos', a: 'Punto para A', b: 'Reiniciar', toast: '¡Punto para A!' };
    return demoPage('Lógica',
      '.sc{font-size:44px;font-weight:800;text-align:center}.row{display:flex;gap:8px;justify-content:center}' +
      '.b1{background:#7c3aed;color:#fff}.b2{background:#e2e8f0}' +
      '.toast{position:fixed;bottom:14px;left:50%;transform:translateX(-50%);background:#111827;color:#fff;padding:8px 14px;border-radius:10px;opacity:0;transition:opacity .2s}',
      '<div class="sc"><span id="s">0</span> <small style="font-size:14px;color:#64748b">' + lbl.score + '</small></div>' +
      '<div class="row"><button class="b1" id="a">' + lbl.a + '</button><button class="b2" id="b">' + lbl.b + '</button></div>' +
      '<div class="toast" id="tt"></div>',
      'let s=0;const el=document.getElementById("s"),tt=document.getElementById("tt");let h=null;' +
      'document.getElementById("a").onclick=()=>{s++;el.textContent=s;tt.textContent=' + JSON.stringify(lbl.toast) + ';' +
      'tt.style.opacity=1;clearTimeout(h);h=setTimeout(()=>tt.style.opacity=0,1200);};' +
      'document.getElementById("b").onclick=()=>{s=0;el.textContent=s;};');
  }

  function demoSound() {
    return demoPage('Sonido',
      '.row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}' +
      '.note{width:64px;height:84px;border-radius:10px 10px 6px 6px;color:#fff;font-size:22px;font-weight:800;border:none;box-shadow:0 3px 0 rgba(0,0,0,.25)}' +
      '.note:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.25)}',
      '<div class="row">' +
      '<button class="note" style="background:#e74c3c" data-f="262">♪</button>' +
      '<button class="note" style="background:#e67e22" data-f="294">♪</button>' +
      '<button class="note" style="background:#f1c40f" data-f="330">♪</button>' +
      '<button class="note" style="background:#2ecc71" data-f="392">♪</button>' +
      '<button class="note" style="background:#3498db" data-f="440">♪</button>' +
      '<button class="note" style="background:#9b59b6" data-f="494">♪</button></div>',
      'let ac=null;' +
      'function tone(f){ac=ac||new (window.AudioContext||window.webkitAudioContext)();' +
      'const o=ac.createOscillator(),g=ac.createGain();o.type="triangle";o.frequency.value=f;' +
      'g.gain.setValueAtTime(0.001,ac.currentTime);g.gain.exponentialRampToValueAtTime(0.4,ac.currentTime+0.02);' +
      'g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.5);o.connect(g).connect(ac.destination);' +
      'o.start();o.stop(ac.currentTime+0.55);}' +
      'document.querySelectorAll(".note").forEach(b=>b.onclick=()=>tone(+b.dataset.f));');
  }

  function demoList(lang) {
    const lbl = lang === 'en'
      ? { ph: 'Buy bread…', add: 'Add', empty: 'Nothing yet. Add something!' }
      : { ph: 'Comprar pan…', add: 'Añadir', empty: 'Aún nada. ¡Añade algo!' };
    return demoPage('Lista',
      'form{display:flex;gap:8px}input{flex:1;font:inherit;padding:10px;border:1px solid #cbd5e1;border-radius:10px}' +
      '.add{background:#10b981;color:#fff}ul{list-style:none;padding:0;margin:12px 0 0}' +
      'li{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:8px 12px;margin-bottom:6px}' +
      'li.done span{opacity:.45;text-decoration:line-through}li span{flex:1}' +
      '.x{background:none;border:none;color:#ef4444;font-size:16px;cursor:pointer}',
      '<form id="f"><input id="i" placeholder="' + lbl.ph + '" autocomplete="off"><button class="add">' + lbl.add + '</button></form>' +
      '<ul id="list"></ul><p id="empty" style="color:#94a3b8">' + lbl.empty + '</p>',
      'const list=document.getElementById("list"),empty=document.getElementById("empty");' +
      'function refresh(){empty.style.display=list.children.length?"none":"block";}' +
      'document.getElementById("f").onsubmit=e=>{e.preventDefault();const v=document.getElementById("i").value.trim();if(!v)return;' +
      'const li=document.createElement("li");const cb=document.createElement("input");cb.type="checkbox";' +
      'cb.onchange=()=>li.classList.toggle("done",cb.checked);' +
      'const sp=document.createElement("span");sp.textContent=v;' +
      'const x=document.createElement("button");x.className="x";x.textContent="✕";x.onclick=()=>{li.remove();refresh();};' +
      'li.append(cb,sp,x);list.appendChild(li);document.getElementById("i").value="";refresh();};');
  }

  function demoSync(lang) {
    const lbl = lang === 'en'
      ? { ana: 'Ana', beto: 'Ben', log: 'updates log', joined: 'Ben joins → receives the whole history' }
      : { ana: 'Ana', beto: 'Beto', log: 'registro de updates', joined: 'Beto entra → recibe todo el historial' };
    return demoPage('Sincronización',
      '.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
      '.dev{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px;text-align:center}' +
      '.dev h4{margin:0 0 6px;font-size:13px;color:#64748b}' +
      '.n{font-size:38px;font-weight:800}.b{background:#2563eb;color:#fff;margin-top:6px}' +
      '.log{margin-top:10px;background:#0f172a;color:#a5f3fc;border-radius:10px;padding:8px 10px;font-family:monospace;font-size:11px;min-height:64px;white-space:pre-line}',
      '<div class="grid">' +
      '<div class="dev"><h4>📱 ' + lbl.ana + '</h4><div class="n" id="n1">0</div><button class="b" id="p1">＋1</button></div>' +
      '<div class="dev"><h4>📱 ' + lbl.beto + '</h4><div class="n" id="n2">0</div><button class="b" id="p2">＋1</button></div></div>' +
      '<div class="log" id="log">— ' + lbl.log + ' —</div>' +
      '<button id="late" style="margin-top:8px;background:#e2e8f0">🔁 ' + lbl.joined + '</button>',
      'let n=0,serial=0;const hist=[];' +
      'const log=document.getElementById("log");' +
      'function apply(u){n+=u.d;document.getElementById("n1").textContent=n;document.getElementById("n2").textContent=n;' +
      'log.textContent+="\\nserial "+u.serial+" · "+(u.d>0?"+1":"reset");}' +
      'function send(d){const u={serial:++serial,d};hist.push(u);apply(u);}' +
      'document.getElementById("p1").onclick=()=>send(1);' +
      'document.getElementById("p2").onclick=()=>send(1);' +
      'document.getElementById("late").onclick=()=>{n=0;log.textContent+="\\n— "+' + JSON.stringify(lbl.joined) + '+" —";hist.forEach(apply);};');
  }

  function demoSerial(lang) {
    const lbl = lang === 'en'
      ? { send: 'Send update', replay: 'New member asks for serial 0' }
      : { send: 'Enviar update', replay: 'Un miembro nuevo pide serial 0' };
    return demoPage('Serial',
      '.b1{background:#2563eb;color:#fff}.b2{background:#e2e8f0}' +
      '.log{margin-top:10px;background:#f1f5f9;border-radius:10px;padding:10px;font-family:monospace;font-size:12px;min-height:110px;white-space:pre-line}',
      '<div style="display:flex;gap:8px"><button class="b1" id="s">' + lbl.send + '</button><button class="b2" id="r">' + lbl.replay + '</button></div>' +
      '<div class="log" id="log">serial actual: 0</div>',
      'let serial=0;const log=document.getElementById("log");const hist=[];' +
      'document.getElementById("s").onclick=()=>{const u={serial:++serial,sum:(serial*serial)%10};hist.push(u);' +
      'log.textContent="serial actual: "+serial+"\\núltimo update: "+JSON.stringify(u);};' +
      'document.getElementById("r").onclick=()=>{log.textContent="→ se reenvía TODO el historial:\\n";' +
      'hist.forEach(u=>log.textContent+="  "+JSON.stringify(u)+"\\n");log.textContent+="serial actual: "+serial;};');
  }

  /* ------------------------------------------------------------------ *
   * Lecciones. level: 0–3. tpl: id de plantilla relacionada.
   * ------------------------------------------------------------------ */
  const LESSONS = [
    /* ---- NIVEL 0 ---- */
    {
      level: 0, icon: 'chat', svg: SVG_CHAT,
      es: {
        title: '¿Qué es una miniapp webxdc?',
        body: '<p>Una <b>miniapp</b> es una página web (HTML + CSS + JavaScript) que viaja dentro de un mensaje de chat. No se instala: al pulsarla se abre dentro del mensajero y funciona sin internet ni servidores.</p><ul><li>Todos los miembros del chat ven la <b>misma app</b>.</li><li>Los cambios se comparten con <i>updates</i> (mensajes pequeños).</li><li>No hay tiendas, cuentas ni permisos: solo el chat.</li></ul>'
      },
      en: {
        title: 'What is a webxdc mini app?',
        body: '<p>A <b>mini app</b> is a web page (HTML + CSS + JavaScript) that travels inside a chat message. It is not installed: tapping it opens it inside the messenger and it works without internet or servers.</p><ul><li>Every chat member sees the <b>same app</b>.</li><li>Changes are shared through <i>updates</i> (tiny messages).</li><li>No stores, accounts or permissions: just the chat.</li></ul>'
      }
    },
    {
      level: 0, icon: 'list', svg: SVG_COUNTER, demo: demoCounter, tpl: 'counter',
      es: {
        title: 'Nivel 0 en 3 pasos: tu primera miniapp',
        body: '<p>Construye un contador compartido sin escribir nada:</p><ol><li>En la vista <b>Plantillas</b> elige «Contador compartido».</li><li>Ábrelo en <b>Preview</b> y pulsa +1.</li><li>En <b>Validar/Exportar</b> pulsa Construir y <b>Enviar al chat</b>.</li></ol><p>La miniapp aparecerá en el chat; quien la reciba puede pulsarla y el contador se sincroniza.</p>'
      },
      en: {
        title: 'Level 0 in 3 steps: your first mini app',
        body: '<p>Build a shared counter without writing anything:</p><ol><li>In the <b>Templates</b> view pick “Shared counter”.</li><li>Open it in <b>Preview</b> and tap +1.</li><li>In <b>Validate/Export</b> press Build and <b>Send to chat</b>.</li></ol><p>The mini app appears in the chat; anyone who receives it can open it and the counter stays in sync.</p>'
      }
    },
    /* ---- NIVEL 1 ---- */
    {
      level: 1, icon: 'palette', svg: SVG_PALETTE, demo: demoColors,
      es: {
        title: 'Cambiar textos y colores',
        body: '<p>Abre el proyecto en el <b>Editor</b> y edita <code>index.html</code> (textos) y <code>style.css</code> (colores, tamaños). En la vista <b>Bloques</b> también existe el bloque «Color de fondo» con un selector de color visual.</p><p>Ejemplo runnable: una tarjeta que cambia de color.</p>'
      },
      en: {
        title: 'Change texts and colours',
        body: '<p>Open the project in the <b>Editor</b> and edit <code>index.html</code> (texts) and <code>style.css</code> (colours, sizes). In the <b>Blocks</b> view there is also a “Background colour” block with a visual colour picker.</p><p>Runnable example: a card that changes colour.</p>'
      }
    },
    {
      level: 1, icon: 'puzzle', svg: SVG_BLOCKS, demo: demoLogic, tpl: 'blocks-scaffold',
      es: {
        title: 'Lógica sin código: bloques',
        body: '<p>La vista <b>Bloques</b> convierte piezas en JavaScript real:</p><ol><li>Crea un evento «Al hacer clic» para tu botón.</li><li>Añade bloques: cambiar variable, mostrar aviso…</li><li>Pulsa <b>Escribir app.js</b> y mira el código generado (leíble, editable).</li></ol><p>Hay <b>260 bloques</b> en categorías (HTML, CSS, lógica, listas, texto, matemáticas, tiempo, sonido, canvas, datos, diálogos, webxdc, juego…).</p>'
      },
      en: {
        title: 'Logic without code: blocks',
        body: '<p>The <b>Blocks</b> view turns pieces into real JavaScript:</p><ol><li>Create an “On click” event for your button.</li><li>Add blocks: change variable, show toast…</li><li>Press <b>Write app.js</b> and read the generated code (readable, editable).</li></ol><p>There are <b>260 blocks</b> across categories (HTML, CSS, logic, lists, text, math, time, sound, canvas, storage, dialogs, webxdc, game…).</p>'
      }
    },
    {
      level: 1, icon: 'audio', svg: SVG_MEDIA, demo: demoSound,
      es: {
        title: 'Imágenes y sonidos',
        body: '<p>Dale vida a tus juegos:</p><ul><li><b>Sonido</b>: el bloque «Tocar nota» genera tonos con WebAudio (sin archivos). El <b>editor de audio</b> permite grabar/generar sonidos y guardarlos en el proyecto; el bloque «Tocar sonido» los reproduce.</li><li><b>Imágenes</b>: el <b>editor de imágenes</b> crea iconos y recorta/filtra imágenes; el bloque «Cambiar imagen» las muestra.</li></ul><p>Ejemplo runnable: un mini piano hecho con tonos.</p>'
      },
      en: {
        title: 'Images and sounds',
        body: '<p>Bring your games to life:</p><ul><li><b>Sound</b>: the “Play tone” block generates tones with WebAudio (no files). The <b>audio editor</b> lets you record/generate sounds and store them in the project; the “Play sound” block plays them.</li><li><b>Images</b>: the <b>image editor</b> creates icons and crops/filters images; the “Change image” block shows them.</li></ul><p>Runnable example: a mini piano made of tones.</p>'
      }
    },
    {
      level: 1, icon: 'list', svg: SVG_LIST, demo: demoList,
      es: {
        title: 'Variables y listas',
        body: '<p>Las <b>variables</b> guardan un dato (puntos, nombre). Las <b>listas</b> guardan varios (tareas, jugadores). En Bloques: «Añadir a lista», «Elemento Nº», «Longitud»… úsalas para inventarios o rankings.</p><p>Ejemplo runnable: una lista de tareas local.</p>'
      },
      en: {
        title: 'Variables and lists',
        body: '<p><b>Variables</b> store one value (score, name). <b>Lists</b> store many (tasks, players). In Blocks: “Add to list”, “Item no.”, “Length”… use them for inventories or leaderboards.</p><p>Runnable example: a local to-do list.</p>'
      }
    },
    /* ---- NIVEL 2 ---- */
    {
      level: 2, icon: 'sync', svg: SVG_SYNC, demo: demoSync,
      es: {
        title: 'El corazón: sendUpdate / setUpdateListener',
        body: '<p>Cada miembro ejecuta su copia de la app. Para compartir cambios:</p><ol><li><b>webxdc.sendUpdate(payload, info)</b> — envía un mensajito a todos.</li><li><b>webxdc.setUpdateListener(fn, serial)</b> — se ejecuta al recibir cada update (y con el historial al abrir).</li></ol><p>El patrón: al recibir un update, <b>volver a pintar</b> la pantalla con el estado compartido. Ejemplo runnable: dos «móviles» sincronizados.</p>'
      },
      en: {
        title: 'The heart: sendUpdate / setUpdateListener',
        body: '<p>Every member runs their own copy. To share changes:</p><ol><li><b>webxdc.sendUpdate(payload, info)</b> — sends a tiny message to everyone.</li><li><b>webxdc.setUpdateListener(fn, serial)</b> — runs on every received update (and with the history on open).</li></ol><p>The pattern: on every update, <b>repaint</b> the screen from the shared state. Runnable example: two synced “phones”.</p>'
      }
    },
    {
      level: 2, icon: 'check', svg: SVG_TPL, tpl: 'todo',
      es: {
        title: 'Plantillas sincronizadas para estudiar',
        body: '<p>Lee el código de estas plantillas (vista Editor) — son aplicaciones reales y completas:</p><ul><li><b>Lista de tareas</b>: el patrón repaint al recibir update.</li><li><b>Encuesta</b>: una update por voto; al abrir se recuenta todo el historial.</li><li><b>Tres en raya</b> y <b>Snake</b>: juegos por turnos con estado compartido.</li></ul><p>Modifícalas (textos, colores, reglas) y expórtalas: es la mejor forma de aprender.</p>'
      },
      en: {
        title: 'Synced templates to study',
        body: '<p>Read the code of these templates (Editor view) — they are real, complete apps:</p><ul><li><b>To-do list</b>: the repaint-on-update pattern.</li><li><b>Poll</b>: one update per vote; on open the whole history is recounted.</li><li><b>Tic-tac-toe</b> and <b>Snake</b>: turn-based games with shared state.</li></ul><p>Modify them (texts, colours, rules) and export them: the best way to learn.</p>'
      }
    },
    {
      level: 2, icon: 'file', svg: SVG_SERIAL, demo: demoSerial,
      es: {
        title: 'Serial e historial',
        body: '<p>Cada update tiene un <b>serial</b> (1, 2, 3…). Al abrir la app, el mensajero entrega los updates pendientes desde el serial indicado: con <b>serial 0</b> recibes el historial completo — así un miembro nuevo «alcanza» a los demás sin pedir nada.</p><p>Regla práctica: nunca asumas el orden de llegada; haz que tu pantalla se pueda <b>recalcular entera</b> desde el historial.</p>'
      },
      en: {
        title: 'Serial and history',
        body: '<p>Every update has a <b>serial</b> (1, 2, 3…). On opening the app, the messenger delivers pending updates from the given serial: with <b>serial 0</b> you get the whole history — that is how a new member “catches up” without asking.</p><p>Practical rule: never assume arrival order; make your screen fully <b>recomputable</b> from history.</p>'
      }
    },
    /* ---- NIVEL 3 ---- */
    {
      level: 3, icon: 'code', svg: SVG_EDITOR,
      es: {
        title: 'Proyecto en blanco y el editor',
        body: '<p>En <b>Plantillas → Proyecto en blanco</b> empiezas de cero: un <code>index.html</code> mínimo. Usa el editor con pestañas para HTML/CSS/JS. La vista <b>Validar</b> avisa de referencias rotas o APIs desconocidas antes de exportar.</p><p>Consejo: empieza por la versión más pequeña que funcione (un botón que cambia un texto) y crece desde ahí.</p>'
      },
      en: {
        title: 'Blank project and the editor',
        body: '<p>In <b>Templates → Blank project</b> you start from zero: a minimal <code>index.html</code>. Use the tabbed editor for HTML/CSS/JS. The <b>Validate</b> view warns about broken references or unknown APIs before exporting.</p><p>Tip: start with the smallest thing that works (a button that changes a text) and grow from there.</p>'
      }
    },
    {
      level: 3, icon: 'folder', svg: SVG_FILES,
      es: {
        title: 'Anatomía de una miniapp',
        body: '<p>Un .xdc es un ZIP con:</p><ul><li><code>index.html</code> — la puerta de entrada (MUST según la spec).</li><li><code>app.js</code>, <code>style.css</code>, imágenes… — tus archivos, con rutas relativas.</li><li><code>webxdc.js</code> — NO lo incluyas: el mensajero lo inyecta. (El Studio lo bloquea al importar.)</li><li><code>manifest.toml</code> — nombre e icono que ve el chat.</li></ul><p>Todo debe funcionar <b>sin internet</b>: sin CDNs ni fuentes externas.</p>'
      },
      en: {
        title: 'Anatomy of a mini app',
        body: '<p>A .xdc is a ZIP containing:</p><ul><li><code>index.html</code> — the entry point (MUST per the spec).</li><li><code>app.js</code>, <code>style.css</code>, images… — your files, with relative paths.</li><li><code>webxdc.js</code> — do NOT include it: the messenger injects it. (The Studio blocks it on import.)</li><li><code>manifest.toml</code> — the name and icon the chat shows.</li></ul><p>Everything must work <b>offline</b>: no CDNs or external fonts.</p>'
      }
    },
    {
      level: 3, icon: 'upload', svg: SVG_PUBLISH,
      es: {
        title: 'Publicar, compartir, importar',
        body: '<p>Ciclo completo:</p><ol><li><b>Validar</b> → 0 errores.</li><li><b>Construir .xdc</b> (se comprime en el propio dispositivo).</li><li><b>Enviar al chat</b> (sendToChat) o <b>Descargar</b> y adjuntar.</li><li>Quien reciba el .xdc puede <b>importarlo</b> en el Studio para seguir editándolo.</li></ol><p>Itera: edita → preview → exporta. Cada versión es un mensaje nuevo del chat.</p>'
      },
      en: {
        title: 'Publish, share, import',
        body: '<p>Full cycle:</p><ol><li><b>Validate</b> → 0 errors.</li><li><b>Build .xdc</b> (compressed on-device).</li><li><b>Send to chat</b> (sendToChat) or <b>Download</b> and attach.</li><li>Anyone who gets the .xdc can <b>import</b> it into the Studio to keep editing.</li></ol><p>Iterate: edit → preview → export. Every version is a new chat message.</p>'
      }
    },
    /* ---- Touch, dual screen, drawing ---- */
    {
      level: 2, icon: 'play', svg: SVG_TOUCH, tpl: 'tapgame',
      es: {
        title: 'Juegos táctiles: «Al tocar»',
        body: '<p>En la vista <b>Bloques</b>, el manejador <b>Al tocar</b> se dispara con el dedo o el ratón. El bloque <b>Posición del toque</b> guarda las coordenadas X e Y dentro de un <code>&lt;canvas&gt;</code>, y con <b>Dibujar rectángulo/círculo/imagen</b> pintas donde se tocó.</p><ul><li>El canvas no desplaza la página al jugar (<code>touch-action:none</code>).</li><li>La plantilla <b>Toca el punto</b> es un juego completo de reflejos para estudiar.</li></ul>'
      },
      en: {
        title: 'Touch games: “On touch”',
        body: '<p>In the <b>Blocks</b> view, the <b>On touch</b> handler fires with finger or mouse. The <b>Touch position</b> block stores the X and Y coordinates inside a <code>&lt;canvas&gt;</code>, and with <b>Draw rectangle/circle/image</b> you paint where it was touched.</p><ul><li>The canvas does not scroll the page while playing (<code>touch-action:none</code>).</li><li>The <b>Tap the dot</b> template is a complete reflex game to study.</li></ul>'
      }
    },
    {
      level: 2, icon: 'users', svg: SVG_DUAL,
      es: {
        title: 'Probar con dos pantallas',
        body: '<p>¿Tu miniapp sincroniza bien entre dos personas? En el <b>Preview</b> pulsa <b>Dos pantallas</b>: aparecen <b>Ana</b> y <b>Beto</b>, dos copias conectadas por el mismo canal de updates.</p><ul><li>Lo que Ana envía con <code>sendUpdate</code> llega a Beto al instante (y al revés).</li><li>La consola etiqueta cada línea con <b>[1]</b> o <b>[2]</b> para saber quién hizo qué.</li><li>El serial creciente es el mismo para las dos pantallas, como en un chat real.</li></ul>'
      },
      en: {
        title: 'Testing with two screens',
        body: '<p>Does your mini app sync well between two people? In the <b>Preview</b> tap <b>Two screens</b>: <b>Ana</b> and <b>Beto</b> appear, two copies connected to the same update channel.</p><ul><li>Whatever Ana sends with <code>sendUpdate</code> reaches Beto instantly (and back).</li><li>The console tags every line with <b>[1]</b> or <b>[2]</b> so you know who did what.</li><li>The increasing serial is the same for both screens, like in a real chat.</li></ul>'
      }
    },
    {
      level: 1, icon: 'pencil', svg: SVG_DRAW, tpl: 'draw',
      es: {
        title: 'Dibujar: pizarra y pixel-art',
        body: '<p>Dos formas de dibujar en el Studio:</p><ul><li><b>Editor de imágenes</b>: pinta con lápiz, goma, relleno y cuentagotas; añade tus propios colores, importa una <b>foto y conviértela en pixel-art</b>, y exporta a ×2/×4/×8/×16.</li><li><b>Plantilla Pizarra</b>: una miniapp completa para dibujar con el dedo, con colores, grosores, deshacer y <b>enviar el dibujo al chat</b>.</li></ul>'
      },
      en: {
        title: 'Drawing: board and pixel-art',
        body: '<p>Two ways to draw in the Studio:</p><ul><li><b>Image editor</b>: paint with pen, eraser, fill and picker; add your own colours, import a <b>photo and turn it into pixel-art</b>, and export at ×2/×4/×8/×16.</li><li><b>Drawing board template</b>: a complete mini app to draw with your finger, with colours, brush sizes, undo and <b>sending the drawing to the chat</b>.</li></ul>'
      }
    }
  ];

  const LEVELS = {
    0: { es: 'Nivel 0 — Tu primera miniapp', en: 'Level 0 — Your first mini app' },
    1: { es: 'Nivel 1 — Personalizar y darle vida', en: 'Level 1 — Customise and bring to life' },
    2: { es: 'Nivel 2 — Sincronizar con el chat', en: 'Level 2 — Sync with the chat' },
    3: { es: 'Nivel 3 — Crear de cero y publicar', en: 'Level 3 — Build from scratch and publish' }
  };

  /* ------------------------------------------------------------------ *
   * Render (solo navegador; en Node se usa LESSONS para tests)
   * ------------------------------------------------------------------ */
  function renderBody() {
    const frag = document.createDocumentFragment();
    frag.appendChild(U.el('p', { html: t('help_course_body') }));

    for (const lv of [0, 1, 2, 3]) {
      const lessons = LESSONS.filter(function (l) { return l.level === lv; });
      if (!lessons.length) continue;
      frag.appendChild(U.el('h4', { class: 'course-level-title', text: LEVELS[lv][L()] || LEVELS[lv].es }));

      lessons.forEach(function (lesson) {
        const loc = lesson[L()] || lesson.es;
        const card = U.el('div', { class: 'lesson card' });

        const head = U.el('div', { class: 'lesson-head' });
        head.appendChild(U.el('span', { class: 'lesson-icon' }, U.icon(lesson.icon, { size: 20 })));
        head.appendChild(U.el('span', { class: 'lesson-title', text: loc.title }));
        card.appendChild(head);

        const row = U.el('div', { class: 'lesson-row' });
        const thumb = U.el('div', { class: 'lesson-thumb', html: lesson.svg });
        row.appendChild(thumb);
        row.appendChild(U.el('div', { class: 'lesson-text', html: loc.body }));
        card.appendChild(row);

        const actions = U.el('div', { class: 'lesson-actions row-gap' });
        if (lesson.demo) {
          actions.appendChild(U.el('button', {
            class: 'btn primary small',
            onclick: function () { toggleDemo(card, lesson); }
          }, U.icon('play', { size: 16 }), t('course_run')));
        }
        if (lesson.tpl && CS.tpl) {
          const meta = CS.tpl.meta(lesson.tpl);
          const name = meta ? (meta[L()] || meta.name) : lesson.tpl;
          actions.appendChild(U.el('button', {
            class: 'btn ghost small',
            onclick: function () {
              if (CS.app && CS.app.createFromTemplate) CS.app.createFromTemplate(lesson.tpl, null);
            }
          }, U.icon('folder', { size: 16 }), t('course_open_tpl', { name: name })));
        }
        if (actions.childNodes.length) card.appendChild(actions);
        frag.appendChild(card);
      });
    }
    return frag;
  }

  function toggleDemo(card, lesson) {
    const existing = card.querySelector('.lesson-demo');
    if (existing) { existing.remove(); return; }
    const lang = L();
    const html = lesson.demo(lang);
    const wrap = U.el('div', { class: 'lesson-demo' });
    const frame = U.el('iframe', {
      class: 'demo-frame',
      sandbox: 'allow-scripts allow-modals',
      title: lesson.es.title
    });
    frame.setAttribute('srcdoc', html);
    wrap.appendChild(frame);
    card.appendChild(wrap);
  }

  CS.course = {
    LESSONS: LESSONS,
    LEVELS: LEVELS,
    renderBody: renderBody,
    demoHtml: function (lesson, lang) { return lesson.demo(lang); }
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = CS.course; }
})();
