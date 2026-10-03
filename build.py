#!/usr/bin/env python3
"""Build Webxdc Creator Studio.

Outputs:
  creator-studio.xdc             the default package (CodeMirror editor)
  monaco-creator-studio.xdc      the same app plus the optional Monaco editor (named to sort after
                                 the light build: the store takes the first .xdc asset)
  demo/creator-studio-demo.html  single-file browser demo with a mock webxdc
  .stage/                        unpacked package for local testing (python3 build.py --stage)

Builds are reproducible: fixed timestamps and sorted entries give the same bytes.
"""
import hashlib
import io
import os
import re
import shutil
import sys
import zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
STAGE = os.path.join(ROOT, '.stage')
FIXED_DATE = (1980, 1, 1, 0, 0, 0)
STATIC = ['manifest.toml', 'icon.png', 'vendor/LICENSE-codemirror.txt']


def fail(message):
    print('build error: ' + message)
    sys.exit(1)


def read(rel):
    with open(os.path.join(SRC, rel), 'rb') as fh:
        return fh.read()


def modules():
    css, js = [], []
    for line in read('modules.txt').decode().splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        kind, path = line.split(None, 1)
        if not os.path.isfile(os.path.join(SRC, path)):
            fail('missing module ' + path)
        (css if kind == 'css' else js).append(path)
    return css, js


def monaco_files():
    root = os.path.join(SRC, 'vendor', 'monaco')
    out = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames.sort()
        for name in sorted(filenames):
            out.append(os.path.relpath(os.path.join(dirpath, name), SRC).replace('\\', '/'))
    return out


def assemble(with_monaco):
    css, js = modules()
    files = {}
    files['app.css'] = b'\n'.join(b'/* ' + p.encode() + b' */\n' + read(p) for p in css)
    tags = '\n'.join('  <script src="%s"></script>' % p for p in js)
    html = read('index.html').decode()
    if '<!-- scripts -->' not in html:
        fail('index.html has no <!-- scripts --> marker')
    files['index.html'] = html.replace('  <!-- scripts -->', tags).encode()
    for p in js + STATIC:
        files[p] = read(p)
    flag = b'const MONACO_BUNDLED = true;'
    for p in js:
        if flag in files[p] and not with_monaco:
            files[p] = files[p].replace(flag, b'const MONACO_BUNDLED = false;', 1)
    if with_monaco:
        for p in monaco_files():
            files[p] = read(p)
    if any(name.lower() == 'webxdc.js' for name in files):
        fail('webxdc.js must not be packaged')
    return files


def package(files):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for name in sorted(files):
            z.writestr(zipfile.ZipInfo(name, date_time=FIXED_DATE), files[name], compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    return buf.getvalue()


def stage(files):
    shutil.rmtree(STAGE, ignore_errors=True)
    for name, data in files.items():
        path = os.path.join(STAGE, name)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'wb') as fh:
            fh.write(data)
    mock = os.path.join(ROOT, 'tests', 'mock-webxdc.js')
    if os.path.isfile(mock):
        shutil.copy(mock, os.path.join(STAGE, 'webxdc.js'))


def demo(files):
    html = files['index.html'].decode()
    mock = os.path.join(ROOT, 'tests', 'mock-webxdc.js')
    mock_js = open(mock, encoding='utf-8').read() if os.path.isfile(mock) else 'window.webxdc=null;'
    html = html.replace('<script src="webxdc.js"></script>', '<script>' + mock_js.replace('</script', '<\\/script') + '</script>')
    html = html.replace('<link rel="stylesheet" href="app.css">', '<style>' + files['app.css'].decode() + '</style>')

    def inline(match):
        return '<script>' + files[match.group(1)].decode().replace('</script', '<\\/script') + '</script>'
    html = re.sub(r'<script src="([^"]+)"></script>', inline, html)
    icon = 'data:image/png;base64,' + __import__('base64').b64encode(files['icon.png']).decode()
    html = html.replace('url("icon.png")', 'url("' + icon + '")')
    os.makedirs(os.path.join(ROOT, 'demo'), exist_ok=True)
    with open(os.path.join(ROOT, 'demo', 'creator-studio-demo.html'), 'w', encoding='utf-8') as fh:
        fh.write(html)


def main():
    lite = assemble(False)
    if '--stage' in sys.argv:
        stage(lite)
        print('staged %d files in .stage/' % len(lite))
        return
    outputs = [('creator-studio.xdc', lite), ('monaco-creator-studio.xdc', assemble(True) if os.path.isdir(os.path.join(SRC, 'vendor', 'monaco')) else None)]
    for name, files in outputs:
        if files is None:
            continue
        data = package(files)
        if package(files) != data:
            fail('non-reproducible build for ' + name)
        with open(os.path.join(ROOT, name), 'wb') as fh:
            fh.write(data)
        print('%-28s %8d bytes  %d files  sha256 %s' % (name, len(data), len(files), hashlib.sha256(data).hexdigest()[:16]))
    demo(lite)
    stage(lite)


if __name__ == '__main__':
    main()
