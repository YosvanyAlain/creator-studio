#!/usr/bin/env python3
# =========================================================================
# Webxdc Creator Studio — build.py
# Empaqueta xdc-src/ en creator-studio.xdc (ZIP Deflate, spec webxdc)
# y genera demo/creator-studio-demo.html (versión de un solo archivo para
# probar el Studio en un navegador, con webxdc simulado y aviso honesto).
#
# Comprobaciones previas (fallan el build si no se cumplen):
#   - index.html existe en la raíz
#   - NO existe webxdc.js dentro del paquete
#   - manifest.toml e icon.png presentes
# =========================================================================
import hashlib
import io
import os
import re
import sys
import zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'xdc-src')
OUT_XDC = os.path.join(ROOT, 'creator-studio.xdc')
DEMO_DIR = os.path.join(ROOT, 'demo')
DEMO_HTML = os.path.join(DEMO_DIR, 'creator-studio-demo.html')

JS_ORDER = [
    'core.js', 'i18n.js', 'db.js', 'project.js', 'capabilities.js', 'snapshots.js',
    'templates.js', 'blocks.js', 'components.js', 'pages.js',
    'course.js', 'audio-editor.js', 'image-editor.js',
    'zip.js', 'validator.js', 'exporter.js', 'highlight.js', 'monaco-loader.js',
    'editor.js', 'preview.js', 'inspector.js', 'collab.js',
    'blocks-ui.js', 'app.js'
]

# Timestamp fijo de todas las entradas del ZIP (época mínima de MS-DOS):
# mismo código fuente → mismos bytes → mismo sha256. Build reproducible.
FIXED_DATE = (1980, 1, 1, 0, 0, 0)


def extra_arcs():
    """Archivos extra (Monaco vendored, licencias). Orden lexicográfico → build reproducible."""
    extras = []
    monaco_root = os.path.join(SRC, 'monaco')
    if os.path.isdir(monaco_root):
        for dirpath, dirnames, filenames in os.walk(monaco_root):
            dirnames.sort()
            for fn in sorted(filenames):
                full = os.path.join(dirpath, fn)
                rel = os.path.relpath(full, SRC).replace('\\', '/')
                extras.append(rel)
    extras.sort()
    return extras


def xdc_bytes():
    """Empaqueta xdc-src/ y devuelve los bytes del .xdc (determinista)."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        # index.html primero por convención
        for arc in ['index.html', 'manifest.toml', 'icon.png', 'app.css'] + JS_ORDER + extra_arcs():
            with open(os.path.join(SRC, arc), 'rb') as fh:
                data = fh.read()
            zi = zipfile.ZipInfo(arc, date_time=FIXED_DATE)
            z.writestr(zi, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    return buf.getvalue()

def fail(msg):
    print('✖ ' + msg)
    sys.exit(1)

def main():
    # --- comprobaciones ---
    if not os.path.isfile(os.path.join(SRC, 'index.html')):
        fail('falta index.html en la raíz de xdc-src/')
    if os.path.exists(os.path.join(SRC, 'webxdc.js')):
        fail('webxdc.js NO debe estar en el paquete (lo sirve el mensajero)')
    for f in ['manifest.toml', 'icon.png', 'app.css'] + JS_ORDER:
        if not os.path.isfile(os.path.join(SRC, f)):
            fail('falta ' + f + ' en xdc-src/')

    # --- 1. creator-studio.xdc (build determinista + auto-verificación) ---
    data1 = xdc_bytes()
    with open(OUT_XDC, 'wb') as fh:
        fh.write(data1)
    size = len(data1)
    sha = hashlib.sha256(data1).hexdigest()
    reproducible = (xdc_bytes() == data1)   # segunda construcción independiente

    print('creator-studio.xdc')
    print('  tamaño:  %d bytes (%.1f KB)' % (size, size / 1024))
    print('  sha256:  ' + sha)
    print('  reproducible:', '✓ (dos builds = mismos bytes)' if reproducible else '✖ FALLO')
    if not reproducible:
        fail('el build NO es reproducible')

    # verificación con unzip -t
    import subprocess
    r = subprocess.run(['unzip', '-t', OUT_XDC], capture_output=True, text=True)
    ok = r.returncode == 0 and 'No errors detected' in r.stdout

    print('creator-studio.xdc')
    print('  tamaño:  %d bytes (%.1f KB)' % (size, size / 1024))
    print('  sha256:  ' + sha)
    print('  unzip -t:', 'OK' if ok else 'FALLO')
    if not ok:
        fail('el ZIP no supera la verificación')

    with zipfile.ZipFile(OUT_XDC) as z:
        names = z.namelist()
        bad = z.testzip()
        if bad:
            fail('CRC inválido en: ' + bad)
        if 'webxdc.js' in [n.lower() for n in names]:
            fail('webxdc.js dentro del .xdc!')
        if 'index.html' not in names:
            fail('index.html no está en la raíz')
        print('  archivos (%d): %s' % (len(names), ', '.join(names)))

    # --- 2. demo de un solo archivo ---
    os.makedirs(DEMO_DIR, exist_ok=True)
    with open(os.path.join(SRC, 'index.html'), encoding='utf-8') as fh:
        html = fh.read()

    css = open(os.path.join(SRC, 'app.css'), encoding='utf-8').read()

    js_parts = []
    for f in JS_ORDER:
        code = open(os.path.join(SRC, f), encoding='utf-8').read()
        # escapar </script dentro de strings para poder incrustar en <script>
        code = re.sub(r'</(script)', r'<\\/\1', code, flags=re.I)
        js_parts.append('/* ===== %s ===== */\n%s' % (f, code))

    mock = """
/* ===== MODO DEMO (navegador) =====
   webxdc simulado: sendToChat registra el archivo en la consola.
   Este archivo demo NO es el .xdc real: usa creator-studio.xdc en Delta Chat. */
(function () {
  if (window.webxdc) return;
  var desc = [];
  window.webxdc = {
    selfAddr: 'demo@local',
    selfName: 'Demo User',
    sendUpdateInterval: 10000,
    sendUpdateMaxSize: 128000,
    sendUpdate: function () { return Promise.resolve(); },
    setUpdateListener: function () { return Promise.resolve(); },
    sendToChat: function (message) {
      var name = message && message.file && message.file.name || '(sin archivo)';
      console.log('%c[DEMO sendToChat] ' + name + ' — en Delta Chat se abriría el selector de chats', 'color:#7048e8;font-weight:bold');
      desc.push(name);
      return Promise.resolve();
    }
  };
})();
"""
    js_all = mock + '\n'.join(js_parts) + '\nCS.app.init();\n'

    demo = html
    demo = demo.replace('<link rel="stylesheet" href="app.css">', '<style>\n' + css + '\n</style>')
    demo = re.sub(r'<script src="webxdc\.js"></script>', '', demo)
    # quitar todos los <script src> y poner el inline al final
    demo = re.sub(r'<script src="[^"]+"></script>', '', demo)
    demo = demo.replace('<script>CS.app.init();</script>', '')
    demo = demo.replace('</body>', '<script>\n' + js_all + '\n</script>\n</body>')

    # banner demo
    demo = demo.replace('<body>', '<body style="padding-top:26px"><div style="position:fixed;top:0;left:0;right:0;z-index:99;background:#7048e8;color:#fff;font:600 12px system-ui,sans-serif;text-align:center;padding:5px 8px">DEMO de navegador — la entrega real es creator-studio.xdc (webxdc simulado aquí)</div>')

    with open(DEMO_HTML, 'w', encoding='utf-8') as fh:
        fh.write(demo)
    dsize = os.path.getsize(DEMO_HTML)
    print('demo/creator-studio-demo.html: %d bytes (%.1f KB)' % (dsize, dsize / 1024))
    print('✓ build completo')

if __name__ == '__main__':
    main()
