#!/usr/bin/env python3
"""Genera iconos 192x192 para las 11 plantillas → dataURL base64."""
import base64, io, json
from PIL import Image, ImageDraw, ImageFont

SZ = 192
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

def font(sz, bold=True):
    try: return ImageFont.truetype(FONT_BOLD if bold else FONT, sz)
    except Exception: return ImageFont.load_default()

def new_icon(bg, fg="#ffffff"):
    img = Image.new("RGBA", (SZ, SZ), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([8, 8, SZ-8, SZ-8], radius=36, fill=bg)
    return img, d

def text(d, xy, s, sz, fill="#ffffff", bold=True, anchor="mm"):
    d.text(xy, s, font=font(sz, bold), fill=fill, anchor=anchor)

def save(img):
    buf = io.BytesIO()
    img.save(buf, "PNG", optimize=True)
    data = buf.getvalue()
    return "data:image/png;base64," + base64.b64encode(data).decode(), len(data)

icons = {}

# blank: </> sobre gris azulado
img, d = new_icon("#64748b")
text(d, (SZ//2, SZ//2), "</>", 62)
icons["blank"] = save(img)

# blocks-scaffold: 3 barras apiladas (morado)
img, d = new_icon("#8b5cf6")
for i, w in enumerate([150, 120, 96]):
    d.rounded_rectangle([(SZ-w)//2, 38 + i*42, (SZ+w)//2, 68 + i*42], radius=14, fill="#ffffff" if i != 1 else "#ddd6fe")
icons["blocks-scaffold"] = save(img)

# counter: +1 (índigo)
img, d = new_icon("#4f46e5")
text(d, (SZ//2, SZ//2), "+1", 88)
icons["counter"] = save(img)

# todo: check + líneas (verde)
img, d = new_icon("#10b981")
d.line([(44, 60), (44, 132)], fill="#ffffff", width=8)
d.line([(44, 96), (140, 96)], fill="#ffffff", width=8)
d.line([(96, 44), (96, 132)], fill="#ffffff", width=8)
text(d, (112, 52), "✓", 52, fill="#a7f3d0")
text(d, (52, 112), "O", 44, fill="#fbcfe8")
icons["todo"] = save(img)

# calculator: rejilla 3x3 (teal)
img, d = new_icon("#0d9488")
d.rounded_rectangle([36, 28, 156, 60], radius=10, fill="#ccfbf1")
for r in range(2):
    for c in range(3):
        x0 = 36 + c*42; y0 = 76 + r*42
        d.rounded_rectangle([x0, y0, x0+32, y0+32], radius=8, fill="#ccfbf1")
icons["calculator"] = save(img)

# tictactoe: X y O grandes (naranja)
img, d = new_icon("#f97316")
d.line([(64, 36), (64, 156)], fill="#ffffff", width=9)
d.line([(128, 36), (128, 156)], fill="#ffffff", width=9)
d.line([(28, 96), (164, 96)], fill="#ffffff", width=9)
for (x, y) in [(46, 66), (110, 126)]:
    d.line([(x-14, y-14), (x+14, y+14)], fill="#fff7ed", width=10)
    d.line([(x-14, y+14), (x+14, y-14)], fill="#fff7ed", width=10)
d.ellipse([96, 42, 148, 94], outline="#fff7ed", width=10)
d.ellipse([34, 108, 86, 160], outline="#fff7ed", width=10)
icons["tictactoe"] = save(img)

# snake: zigzag (lima)
img, d = new_icon("#65a30d")
pts = [(36, 150), (36, 96), (96, 96), (96, 44), (152, 44), (152, 110)]
d.line(pts, fill="#ffffff", width=16, joint="curve")
d.ellipse([138, 96, 166, 124], fill="#ffffff")
icons["snake"] = save(img)

# timer: reloj (azul)
img, d = new_icon("#2563eb")
d.ellipse([36, 36, 156, 156], outline="#ffffff", width=12)
d.line([(96, 96), (96, 58)], fill="#ffffff", width=10)
d.line([(96, 96), (128, 112)], fill="#dbeafe", width=10)
d.ellipse([90, 90, 102, 102], fill="#ffffff")
icons["timer"] = save(img)

# notes: líneas de nota (ámbar)
img, d = new_icon("#d97706")
for i, w in enumerate([110, 110, 74]):
    d.rounded_rectangle([41, 44 + i*36, 41 + w, 58 + i*36], radius=7, fill="#fef3c7")
icons["notes"] = save(img)

# poll: barras (rosa)
img, d = new_icon("#db2777")
hs = [58, 96, 130]
for i, h in enumerate(hs):
    x0 = 40 + i*40
    d.rounded_rectangle([x0, 158-h, x0+28, 150], radius=8, fill="#fce7f3" if i != 1 else "#ffffff")
icons["poll"] = save(img)

# form: portapapeles (cian)
img, d = new_icon("#0891b2")
d.rounded_rectangle([44, 40, 148, 160], radius=16, fill="#cffafe")
d.rounded_rectangle([70, 28, 122, 52], radius=10, fill="#ffffff")
for i, w in enumerate([76, 76, 48]):
    d.rounded_rectangle([58, 72 + i*26, 58 + w, 82 + i*26], radius=5, fill="#0891b2")
icons["form"] = save(img)

out = {}
for k, (url, size) in icons.items():
    out[k] = {"dataUrl": url, "size": size}

with open("tmp-icons/icons.json", "w") as fh:
    json.dump(out, fh)
for k, v in icons.items():
    print(f"{k:18s} {v[1]:5d} bytes")
