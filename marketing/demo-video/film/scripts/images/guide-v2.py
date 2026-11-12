"""Guide drawing for the v2 phone master (research-v2/10-act1-old-world.md, section 4.3).

Reads the phone's front view in millimetres from research-v2/10-act1-phone-front.svg and draws it as clean black
line art on white, centred and upright, at the master's framing (1440 x 2560, the phone 90% of the height). The
dashed LCD active area is a note for people, not for the model, so it is left out.

    python3 -I scripts/images/guide-v2.py            (from film/)

Writes scripts/images/guides/phone-v2.png and phone-v2.json (the mm -> px mapping of the drawing).
"""
import json
import re
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
FILM = HERE.parent.parent
SVG = FILM.parent / 'research-v2' / '10-act1-phone-front.svg'
OUT = HERE / 'guides'
W, H = 1440, 2560
BODY_W, BODY_H = 46.0, 106.0
SS = 2  # supersampling for smooth lines
LINE_PX = 4.0  # line width in output px


def shapes():
    svg = SVG.read_text()
    rects, circles = [], []
    for m in re.finditer(r'<rect x="([\d.-]+)" y="([\d.-]+)" width="([\d.]+)" height="([\d.]+)"(?: rx="([\d.]+)")?([^/]*)/>', svg):
        x, y, w, h = map(float, m.group(1, 2, 3, 4))
        rx = float(m.group(5) or 0)
        if w > BODY_W + 1 or 'dasharray' in m.group(6):
            continue  # the white page and the dashed active area
        rects.append((x, y, w, h, rx))
    for m in re.finditer(r'<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"', svg):
        circles.append(tuple(map(float, m.groups())))
    return rects, circles


def main():
    rects, circles = shapes()
    scale = 0.9 * H / BODY_H  # px per mm
    ox = (W - BODY_W * scale) / 2
    oy = (H - BODY_H * scale) / 2
    s = SS
    im = Image.new('L', (W * s, H * s), 255)
    d = ImageDraw.Draw(im)
    lw = max(1, round(LINE_PX * s))

    def px(x, y):
        return ((ox + x * scale) * s, (oy + y * scale) * s)

    for x, y, w, h, rx in rects:
        x0, y0 = px(x, y)
        x1, y1 = px(x + w, y + h)
        d.rounded_rectangle([x0, y0, x1, y1], radius=rx * scale * s, outline=0, width=lw)
    for cx, cy, r in circles:
        x0, y0 = px(cx - r, cy - r)
        x1, y1 = px(cx + r, cy + r)
        if r < 1:
            d.ellipse([x0, y0, x1, y1], fill=0)
        else:
            d.ellipse([x0, y0, x1, y1], outline=0, width=lw)
    im = im.resize((W, H), Image.LANCZOS).convert('RGB')
    OUT.mkdir(parents=True, exist_ok=True)
    im.save(OUT / 'phone-v2.png')
    (OUT / 'phone-v2.json').write_text(json.dumps({
        'about': 'mm -> px mapping of guides/phone-v2.png: px = origin + mm * pxPerMm (front face, origin top-left).',
        'size': [W, H], 'pxPerMm': scale, 'origin': [ox, oy], 'source': str(SVG.relative_to(FILM.parent)),
    }, indent=1) + '\n')
    print('wrote', OUT / 'phone-v2.png', f'{scale:.2f} px/mm')


if __name__ == '__main__':
    main()
