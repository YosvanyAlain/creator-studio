#!/usr/bin/env python3
"""Build Webxdc Creator Studio.

Outputs:
  creator-studio.xdc         lite package (no Monaco), the default download
  creator-studio-monaco.xdc  same app plus the optional Monaco editor
  demo/creator-studio-demo.html  single-file browser demo with a mock webxdc

Builds are reproducible: fixed timestamps and sorted entries give the same bytes.
"""
import hashlib
import io
import os
import re
import subprocess
import sys
import zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'xdc-src')
OUT_LITE = os.path.join(ROOT, 'creator-studio.xdc')
OUT_MONACO = os.path.join(ROOT, 'creator-studio-monaco.xdc')
DEMO_HTML = os.path.join(ROOT, 'demo', 'creator-studio-demo.html')

JS_ORDER = [
    'core.js', 'i18n.js', 'db.js', 'project.js', 'capabilities.js', 'snapshots.js',
    'templates.js', 'blocks.js', 'game-engine.js', 'game-blocks.js', 'components.js', 'pages.js',
    'course.js', 'audio-editor.js', 'image-editor.js',
    'zip.js', 'validator.js', 'exporter.js', 'highlight.js', 'vendor/cm6.js', 'monaco-loader.js',
    'editor.js', 'preview.js', 'inspector.js', 'collab.js',
    'blocks-ui.js', 'app.js'
]
BASE_FILES = ['index.html', 'manifest.toml', 'icon.png', 'app.css', 'vendor/LICENSE-codemirror.txt'] + JS_ORDER

FIXED_DATE = (1980, 1, 1, 0, 0, 0)
LITE_FLAG = ('const BUNDLED = true;', 'const BUNDLED = false;')


def fail(msg):
    print('✖ ' + msg)
    sys.exit(1)


def read(rel):
    with open(os.path.join(SRC, rel), 'rb') as fh:
        return fh.read()


def monaco_files():
    root = os.path.join(SRC, 'monaco')
    files = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames.sort()
        for name in sorted(filenames):
            files.append(os.path.relpath(os.path.join(dirpath, name), SRC).replace('\\', '/'))
    return sorted(files)


def lite_source(rel, data):
    if rel != 'monaco-loader.js':
        return data
    text = data.decode('utf-8')
    if LITE_FLAG[0] not in text:
        fail('monaco-loader.js: BUNDLED flag not found')
    return text.replace(LITE_FLAG[0], LITE_FLAG[1], 1).encode('utf-8')


def package(with_monaco):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for rel in BASE_FILES + (monaco_files() if with_monaco else []):
            data = read(rel) if with_monaco else lite_source(rel, read(rel))
            z.writestr(zipfile.ZipInfo(rel, date_time=FIXED_DATE), data,
                       compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    return buf.getvalue()


def write_package(path, with_monaco):
    data = package(with_monaco)
    if package(with_monaco) != data:
        fail(os.path.basename(path) + ' is not reproducible')
    with open(path, 'wb') as fh:
        fh.write(data)
    check = subprocess.run(['unzip', '-t', path], capture_output=True, text=True)
    if check.returncode != 0 or 'No errors detected' not in check.stdout:
        fail(os.path.basename(path) + ' failed unzip -t')
    with zipfile.ZipFile(path) as z:
        names = z.namelist()
        if z.testzip():
            fail('bad CRC in ' + os.path.basename(path))
    if 'index.html' not in names or 'webxdc.js' in [n.lower() for n in names]:
        fail(os.path.basename(path) + ': needs index.html at the root and no webxdc.js')
    print('%s\n  size:    %d bytes (%.1f KB)\n  sha256:  %s\n  files:   %d, reproducible, unzip -t OK'
          % (os.path.basename(path), len(data), len(data) / 1024, hashlib.sha256(data).hexdigest(), len(names)))


DEMO_MOCK = """
/* Browser demo: a local mock of webxdc. The real app is creator-studio.xdc. */
(function () {
  if (window.webxdc) return;
  window.webxdc = {
    selfAddr: 'demo@local',
    selfName: 'Demo User',
    sendUpdateInterval: 10000,
    sendUpdateMaxSize: 128000,
    sendUpdate: function () { return Promise.resolve(); },
    setUpdateListener: function () { return Promise.resolve(); },
    sendToChat: function (message) {
      var name = message && message.file && message.file.name || '(no file)';
      console.log('[demo sendToChat] ' + name);
      return Promise.resolve();
    }
  };
})();
"""
DEMO_BANNER = ('<body style="padding-top:26px"><div style="position:fixed;top:0;left:0;right:0;z-index:99;'
               'background:#7048e8;color:#fff;font:600 12px system-ui,sans-serif;text-align:center;padding:5px 8px">'
               'Browser demo · Demo de navegador — creator-studio.xdc is the real app</div>')


def write_demo():
    html = read('index.html').decode('utf-8')
    css = read('app.css').decode('utf-8')
    parts = []
    for rel in JS_ORDER:
        code = lite_source(rel, read(rel)).decode('utf-8')
        code = re.sub(r'</(script)', r'<\\/\1', code, flags=re.I)
        parts.append('/* ===== %s ===== */\n%s' % (rel, code))
    script = DEMO_MOCK + '\n'.join(parts) + '\nCS.app.init();\n'
    if html.count('<body>') != 1:
        fail('index.html must contain exactly one <body>')
    html = html.replace('<body>', DEMO_BANNER, 1)
    html = html.replace('<link rel="stylesheet" href="app.css">', '<style>\n' + css + '\n</style>')
    html = re.sub(r'<script src="[^"]+"></script>', '', html)
    html = html.replace('<script>CS.app.init();</script>', '')
    head, sep, tail = html.rpartition('</body>')
    html = head + '<script>\n' + script + '\n</script>\n' + sep + tail
    os.makedirs(os.path.dirname(DEMO_HTML), exist_ok=True)
    with open(DEMO_HTML, 'w', encoding='utf-8') as fh:
        fh.write(html)
    print('demo/creator-studio-demo.html: %.1f KB' % (os.path.getsize(DEMO_HTML) / 1024))


def main():
    for rel in BASE_FILES:
        if not os.path.isfile(os.path.join(SRC, rel)):
            fail('missing xdc-src/' + rel)
    scripts = [x for x in re.findall(r'<script src="([^"]+)"></script>', read('index.html').decode('utf-8')) if x != 'webxdc.js']
    if scripts != JS_ORDER:
        fail('index.html script order differs from JS_ORDER: %s' % scripts)
    if os.path.exists(os.path.join(SRC, 'webxdc.js')):
        fail('webxdc.js must not be packaged (the messenger provides it)')
    write_package(OUT_LITE, with_monaco=False)
    write_package(OUT_MONACO, with_monaco=True)
    write_demo()
    print('✓ build complete')


if __name__ == '__main__':
    main()
